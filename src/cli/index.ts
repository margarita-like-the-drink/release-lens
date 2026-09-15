import { Command } from 'commander';
import { runAnalysis } from '../analyze.js';
import { renderTerminalReport } from '../reporters/terminal.js';
import { renderJsonReport } from '../reporters/json.js';
import { renderMarkdownReport } from '../reporters/markdown.js';
import { renderExplainOverview, renderExplainSignal } from './explain.js';
import { GitError } from '../git/repository.js';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('release-lens')
    .description('Risk-based QA intelligence for every pull request.')
    .version('0.1.0');

  program
    .command('analyze')
    .description('Analyze the current change and produce a QA risk report')
    .option('--base <ref>', 'base ref to compare against')
    .option('--head <ref>', 'head ref to compare (requires --base)')
    .option('--json', 'output structured JSON instead of the terminal report')
    .option('--markdown', 'output a Markdown report (e.g. for a GitHub Actions job summary)')
    .action((opts: { base?: string; head?: string; json?: boolean; markdown?: boolean }) => {
      try {
        const result = runAnalysis({ cwd: process.cwd(), base: opts.base, head: opts.head });
        const output = opts.json
          ? renderJsonReport(result)
          : opts.markdown
            ? renderMarkdownReport(result)
            : renderTerminalReport(result);
        process.stdout.write(output + '\n');
      } catch (error) {
        handleError(error);
      }
    });

  program
    .command('explain [signal]')
    .description('Explain how risk scoring works, or describe a specific signal')
    .action((signal?: string) => {
      process.stdout.write((signal ? renderExplainSignal(signal) : renderExplainOverview()) + '\n');
    });

  return program;
}

function handleError(error: unknown): void {
  if (error instanceof GitError) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
    return;
  }
  throw error;
}
