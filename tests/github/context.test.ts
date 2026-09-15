import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GitHubContextError, resolveGitHubContext } from '../../src/github/context.js';

const ENV_KEYS = ['GITHUB_TOKEN', 'GITHUB_REPOSITORY', 'GITHUB_EVENT_PATH'] as const;
const savedEnv: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of ENV_KEYS) {
    savedEnv[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
});

describe('resolveGitHubContext', () => {
  it('resolves everything from explicit overrides', () => {
    const context = resolveGitHubContext({
      repo: 'acme/widgets',
      pr: 42,
      sha: 'abc123',
      token: 'ghp_test',
    });
    expect(context).toEqual({
      owner: 'acme',
      repo: 'widgets',
      pullNumber: 42,
      headSha: 'abc123',
      token: 'ghp_test',
    });
  });

  it('falls back to environment variables', () => {
    process.env.GITHUB_TOKEN = 'ghp_env';
    process.env.GITHUB_REPOSITORY = 'acme/widgets';
    const context = resolveGitHubContext({ pr: 1, sha: 'abc' });
    expect(context.token).toBe('ghp_env');
    expect(context.owner).toBe('acme');
    expect(context.repo).toBe('widgets');
  });

  it('reads the pull request number and head SHA from the event payload', () => {
    const dir = mkdtempSync(join(tmpdir(), 'release-lens-event-'));
    const eventPath = join(dir, 'event.json');
    writeFileSync(
      eventPath,
      JSON.stringify({ pull_request: { number: 7, head: { sha: 'def456' } } }),
    );
    process.env.GITHUB_EVENT_PATH = eventPath;

    try {
      const context = resolveGitHubContext({ repo: 'acme/widgets', token: 'ghp_test' });
      expect(context.pullNumber).toBe(7);
      expect(context.headSha).toBe('def456');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('throws a clear error when no token is available', () => {
    expect(() => resolveGitHubContext({ repo: 'acme/widgets', pr: 1, sha: 'abc' })).toThrow(
      GitHubContextError,
    );
  });

  it('throws a clear error when the repository cannot be determined', () => {
    expect(() => resolveGitHubContext({ token: 'ghp_test', pr: 1, sha: 'abc' })).toThrow(
      GitHubContextError,
    );
  });

  it('throws a clear error when the pull request number cannot be determined', () => {
    expect(() =>
      resolveGitHubContext({ repo: 'acme/widgets', token: 'ghp_test', sha: 'abc' }),
    ).toThrow(GitHubContextError);
  });
});
