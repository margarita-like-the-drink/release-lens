import { existsSync, readFileSync } from 'node:fs';

export class GitHubContextError extends Error {}

export interface GitHubContext {
  owner: string;
  repo: string;
  pullNumber: number;
  headSha: string;
  token: string;
}

export interface GitHubContextOverrides {
  repo?: string;
  pr?: number;
  sha?: string;
  token?: string;
}

interface PullRequestEventPayload {
  pull_request?: {
    number?: number;
    head?: { sha?: string };
  };
}

/**
 * Resolves what to post to and with what credentials, preferring explicit
 * CLI flags and falling back to the environment GitHub Actions provides:
 * `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, and the pull request's number/head
 * SHA from the `pull_request` event payload at `GITHUB_EVENT_PATH`. This is
 * what lets `release-lens report github` work with no flags at all inside a
 * standard `pull_request` workflow job.
 */
export function resolveGitHubContext(overrides: GitHubContextOverrides): GitHubContext {
  const token = overrides.token ?? process.env.GITHUB_TOKEN;
  if (!token) {
    throw new GitHubContextError('No GitHub token available. Pass --token or set GITHUB_TOKEN.');
  }

  const repoSlug = overrides.repo ?? process.env.GITHUB_REPOSITORY;
  if (!repoSlug || !repoSlug.includes('/')) {
    throw new GitHubContextError(
      'Could not determine the repository. Pass --repo owner/repo or set GITHUB_REPOSITORY.',
    );
  }
  const [owner, repo] = repoSlug.split('/') as [string, string];

  let pullNumber = overrides.pr;
  let headSha = overrides.sha;

  if (pullNumber === undefined || headSha === undefined) {
    const event = readEventPayload();
    pullNumber ??= event?.pull_request?.number;
    headSha ??= event?.pull_request?.head?.sha;
  }

  if (pullNumber === undefined) {
    throw new GitHubContextError(
      'Could not determine the pull request number. Pass --pr <number>, or run this from a pull_request workflow.',
    );
  }
  if (headSha === undefined) {
    throw new GitHubContextError(
      'Could not determine the head commit SHA. Pass --sha <sha>, or run this from a pull_request workflow.',
    );
  }

  return { owner, repo, pullNumber, headSha, token };
}

function readEventPayload(): PullRequestEventPayload | undefined {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !existsSync(eventPath)) return undefined;
  try {
    return JSON.parse(readFileSync(eventPath, 'utf8')) as PullRequestEventPayload;
  } catch {
    return undefined;
  }
}
