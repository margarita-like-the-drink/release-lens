import { execFileSync } from 'node:child_process';

export class GitError extends Error {}

function git(args: string[], cwd: string): string {
  try {
    return execFileSync('git', args, {
      cwd,
      encoding: 'utf8',
      maxBuffer: 1024 * 1024 * 64,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const stderr = (error as { stderr?: Buffer | string }).stderr;
    const message = stderr ? stderr.toString().trim() : (error as Error).message;
    throw new GitError(message);
  }
}

export function findRepositoryRoot(cwd: string): string {
  try {
    return git(['rev-parse', '--show-toplevel'], cwd).trim();
  } catch {
    throw new GitError(
      `${cwd} is not inside a Git repository. ReleaseLens analyzes Git history and needs a repository to compare.`,
    );
  }
}

export function currentBranch(repoRoot: string): string {
  try {
    const branch = git(['rev-parse', '--abbrev-ref', 'HEAD'], repoRoot).trim();
    return branch;
  } catch {
    return 'HEAD';
  }
}

export function hasCommits(repoRoot: string): boolean {
  try {
    git(['rev-parse', '--verify', 'HEAD'], repoRoot);
    return true;
  } catch {
    return false;
  }
}

export function mergeBase(repoRoot: string, base: string, head: string): string {
  try {
    return git(['merge-base', base, head], repoRoot).trim();
  } catch (error) {
    throw new GitError(
      `Could not find a common ancestor between '${base}' and '${head}': ${(error as Error).message}`,
    );
  }
}

export function refExists(repoRoot: string, ref: string): boolean {
  try {
    git(['rev-parse', '--verify', '--quiet', ref], repoRoot);
    return true;
  } catch {
    return false;
  }
}

export function rawDiff(repoRoot: string, args: string[]): string {
  return git(['diff', '--no-color', '-U3', '-M', ...args], repoRoot);
}

export function hasUncommittedChanges(repoRoot: string): boolean {
  const status = git(['status', '--porcelain'], repoRoot);
  return status.trim().length > 0;
}
