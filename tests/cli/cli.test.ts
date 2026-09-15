import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TempRepo } from '../helpers/tempRepo.js';

const BIN = join(process.cwd(), 'src/cli/bin.ts');

function runCli(
  cwd: string,
  args: string[],
  env: NodeJS.ProcessEnv = process.env,
): { stdout: string; status: number } {
  try {
    const stdout = execFileSync('npx', ['tsx', BIN, ...args], { cwd, encoding: 'utf8', env });
    return { stdout, status: 0 };
  } catch (error) {
    const err = error as { stdout?: string; status?: number | null };
    return { stdout: err.stdout ?? '', status: err.status ?? 1 };
  }
}

let repo: TempRepo | undefined;

afterEach(() => {
  repo?.cleanup();
  repo = undefined;
});

describe('release-lens analyze', () => {
  it('prints a terminal report for an uncommitted change', () => {
    repo = new TempRepo();
    repo.write('src/payments/retry.ts', 'export function retry() { return 1; }\n');
    repo.commit('base');
    repo.write('src/payments/retry.ts', 'export function retry() { return charge(); }\n');

    const result = runCli(repo.dir, ['analyze']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('ReleaseLens');
    expect(result.stdout).toContain('Release Risk');
    expect(result.stdout).toContain('QA Focus');
  });

  it('prints valid JSON matching the terminal report data with --json', () => {
    repo = new TempRepo();
    repo.write('src/payments/retry.ts', 'export function retry() { return 1; }\n');
    repo.commit('base');
    repo.write('src/payments/retry.ts', 'export function retry() { return charge(); }\n');

    const result = runCli(repo.dir, ['analyze', '--json']);
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.risk.level).toBeDefined();
    expect(Array.isArray(parsed.signals)).toBe(true);
    expect(parsed.signals.some((s: { id: string }) => s.id === 'payment-logic-changed')).toBe(true);
  });

  it('exits non-zero with a clear message outside a Git repository', () => {
    const nonGitDir = mkdtempSync(join(tmpdir(), 'release-lens-non-git-'));
    try {
      const result = runCli(nonGitDir, ['analyze']);
      expect(result.status).not.toBe(0);
    } finally {
      rmSync(nonGitDir, { recursive: true, force: true });
    }
  });

  it('reports no changes cleanly in a clean repository', () => {
    repo = new TempRepo();
    repo.write('a.txt', 'hello\n');
    repo.commit('base');

    const result = runCli(repo.dir, ['analyze']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('No changes were found to analyze.');
  });

  it('exits non-zero with --fail-on when risk reaches the threshold', () => {
    repo = new TempRepo();
    repo.write('src/payments/retry.ts', 'export function retry() { return 1; }\n');
    repo.commit('base');
    repo.write('src/payments/retry.ts', 'export function retry() { return charge(); }\n');

    const result = runCli(repo.dir, ['analyze', '--fail-on', 'low']);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toContain('Release Risk');
  });

  it('stays zero with --fail-on when risk is below the threshold', () => {
    repo = new TempRepo();
    repo.write('README.md', '# Project\n');
    repo.commit('base');
    repo.write('README.md', '# Project\n\nMore detail.\n');

    const result = runCli(repo.dir, ['analyze', '--fail-on', 'critical']);
    expect(result.status).toBe(0);
  });

  it('rejects an invalid --fail-on value', () => {
    repo = new TempRepo();
    repo.write('a.txt', 'hello\n');
    repo.commit('base');

    const result = runCli(repo.dir, ['analyze', '--fail-on', 'nonsense']);
    expect(result.status).not.toBe(0);
  });
});

describe('release-lens report github', () => {
  it('dry-runs without a token, printing the inline comments and check run it would post', () => {
    repo = new TempRepo();
    repo.write('src/payments/retry.ts', 'export function retry() { return 1; }\n');
    repo.commit('base');
    repo.write('src/payments/retry.ts', 'export function retry() { return charge(); }\n');

    const result = runCli(repo.dir, ['report', 'github', '--dry-run']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Would post');
    const jsonStart = result.stdout.indexOf('{');
    const parsed = JSON.parse(result.stdout.slice(jsonStart));
    expect(parsed.review.comments.length).toBeGreaterThan(0);
    expect(parsed.review.comments[0]).toMatchObject({
      path: 'src/payments/retry.ts',
      side: 'RIGHT',
    });
    expect(parsed.checkRun.name).toBe('ReleaseLens');
  });

  it('fails without --dry-run when no token is available', () => {
    repo = new TempRepo();
    repo.write('a.txt', 'hello\n');
    repo.commit('base');

    const envWithoutToken = { ...process.env };
    delete envWithoutToken.GITHUB_TOKEN;

    const result = runCli(
      repo.dir,
      ['report', 'github', '--repo', 'acme/widgets', '--pr', '1', '--sha', 'abc'],
      envWithoutToken,
    );
    expect(result.status).not.toBe(0);
  });

  it('exits non-zero in dry-run mode when risk meets --fail-on', () => {
    repo = new TempRepo();
    repo.write('src/payments/retry.ts', 'export function retry() { return 1; }\n');
    repo.commit('base');
    repo.write('src/payments/retry.ts', 'export function retry() { return charge(); }\n');

    const result = runCli(repo.dir, ['report', 'github', '--dry-run', '--fail-on', 'low']);
    expect(result.status).not.toBe(0);
  });
});

describe('release-lens explain', () => {
  it('prints the general overview with no arguments', () => {
    repo = new TempRepo();
    const result = runCli(repo.dir, ['explain']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('how risk scoring works');
    expect(result.stdout).toContain('Supported signals');
  });

  it('prints details for a specific signal', () => {
    repo = new TempRepo();
    const result = runCli(repo.dir, ['explain', 'tests-deleted']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('tests-deleted');
    expect(result.stdout).toContain('Default weight:');
  });

  it('handles an unknown signal gracefully', () => {
    repo = new TempRepo();
    const result = runCli(repo.dir, ['explain', 'not-a-real-signal']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Unknown signal');
  });
});
