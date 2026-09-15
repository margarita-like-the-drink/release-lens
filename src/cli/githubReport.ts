import type { Command } from 'commander';
import { runAnalysis } from '../analyze.js';
import type { RiskLevel } from '../domain/types.js';
import { renderMarkdownReport } from '../reporters/markdown.js';
import { levelMeetsOrExceeds } from '../risk/model.js';
import { GitHubClient, GitHubApiError } from '../github/api.js';
import { GitHubContextError, resolveGitHubContext } from '../github/context.js';
import { buildCheckRun } from '../github/checkRun.js';
import { buildInlineComments } from '../github/reviewComments.js';
import { GitError } from '../git/repository.js';
import { parseFailOn } from './riskLevelOption.js';

interface GithubReportOptions {
  base?: string;
  head?: string;
  repo?: string;
  pr?: number;
  sha?: string;
  token?: string;
  failOn?: RiskLevel;
  dryRun?: boolean;
}

export function registerReportCommand(program: Command): void {
  const report = program
    .command('report')
    .description('Publish an analysis report to an external system');

  report
    .command('github')
    .description(
      'Post inline PR review comments and a check run to GitHub. Designed to run with no flags inside a pull_request GitHub Actions job.',
    )
    .option('--base <ref>', 'base ref to compare against')
    .option('--head <ref>', 'head ref to compare (requires --base)')
    .option('--repo <owner/repo>', 'target repository (default: $GITHUB_REPOSITORY)')
    .option('--pr <number>', 'pull request number (default: parsed from $GITHUB_EVENT_PATH)', (v) =>
      parseInt(v, 10),
    )
    .option(
      '--sha <sha>',
      'head commit SHA for the check run (default: parsed from $GITHUB_EVENT_PATH)',
    )
    .option('--token <token>', 'GitHub token (default: $GITHUB_TOKEN)')
    .option(
      '--fail-on <level>',
      'check run conclusion is "failure" at this level or higher, and the process exits non-zero (low, moderate, high, critical)',
      parseFailOn,
    )
    .option('--dry-run', 'print what would be posted instead of calling the GitHub API')
    .action(async (opts: GithubReportOptions) => {
      try {
        const result = runAnalysis({ cwd: process.cwd(), base: opts.base, head: opts.head });
        const inlineComments = buildInlineComments(result);
        const reviewBody = renderMarkdownReport(result);

        if (opts.dryRun) {
          const checkRun = buildCheckRun(
            result,
            opts.sha ?? '0000000000000000000000000000000000000000',
            opts.failOn,
          );
          process.stdout.write(
            `Would post ${inlineComments.length} inline comment(s) and a check run (conclusion: ${checkRun.conclusion}):\n\n`,
          );
          process.stdout.write(
            `${JSON.stringify({ review: { body: reviewBody, comments: inlineComments }, checkRun }, null, 2)}\n`,
          );
        } else {
          const context = resolveGitHubContext({
            repo: opts.repo,
            pr: opts.pr,
            sha: opts.sha,
            token: opts.token,
          });
          const checkRun = buildCheckRun(result, context.headSha, opts.failOn);
          const client = new GitHubClient({ token: context.token });

          await client.createReview(context.owner, context.repo, context.pullNumber, {
            body: reviewBody,
            event: 'COMMENT',
            comments: inlineComments,
          });
          await client.createCheckRun(context.owner, context.repo, checkRun);

          process.stdout.write(
            `Posted ${inlineComments.length} inline comment(s) and a check run to ${context.owner}/${context.repo}#${context.pullNumber}.\n`,
          );
        }

        if (opts.failOn && levelMeetsOrExceeds(result.risk.level, opts.failOn)) {
          process.exitCode = 1;
        }
      } catch (error) {
        if (
          error instanceof GitError ||
          error instanceof GitHubContextError ||
          error instanceof GitHubApiError
        ) {
          process.stderr.write(`Error: ${error.message}\n`);
          process.exitCode = 1;
          return;
        }
        throw error;
      }
    });
}
