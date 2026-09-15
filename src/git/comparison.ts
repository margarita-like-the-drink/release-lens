import type { ChangedFile, Comparison } from '../domain/types.js';
import { parseUnifiedDiff } from './diff.js';
import { untrackedChangedFiles } from './untracked.js';
import {
  GitError,
  currentBranch,
  hasCommits,
  hasUncommittedChanges,
  mergeBase,
  rawDiff,
  refExists,
} from './repository.js';

function withWorkingTreeAdditions(repoRoot: string, files: ChangedFile[]): ChangedFile[] {
  const known = new Set(files.map((f) => f.path));
  const untracked = untrackedChangedFiles(repoRoot).filter((f) => !known.has(f.path));
  return [...files, ...untracked];
}

export interface ResolveComparisonOptions {
  base?: string;
  head?: string;
}

export interface ResolveComparisonResult {
  comparison: Comparison;
  notes: string[];
}

/**
 * Resolves what ReleaseLens actually compares, given the CLI's --base/--head flags.
 *
 *  - Neither flag: compares the working tree against HEAD (uncommitted changes),
 *    falling back to the last commit when there is nothing uncommitted.
 *  - --base only: compares the working tree against the merge-base of base and HEAD,
 *    i.e. "everything this branch has changed since it diverged from base".
 *  - --base and --head: compares head against the merge-base of base and head, a
 *    static PR-style diff with no working tree involved.
 */
export function resolveComparison(
  repoRoot: string,
  options: ResolveComparisonOptions,
): ResolveComparisonResult {
  if (!hasCommits(repoRoot)) {
    throw new GitError(
      'This repository has no commits yet. ReleaseLens needs at least one commit to compare against.',
    );
  }

  const notes: string[] = [];

  if (!options.base && !options.head) {
    if (hasUncommittedChanges(repoRoot)) {
      const diffText = rawDiff(repoRoot, ['HEAD']);
      const files = withWorkingTreeAdditions(repoRoot, parseUnifiedDiff(diffText));
      return {
        comparison: { base: 'HEAD', head: 'working tree', files },
        notes,
      };
    }

    if (refExists(repoRoot, 'HEAD~1')) {
      notes.push('No uncommitted changes were found; showing the most recent commit instead.');
      const diffText = rawDiff(repoRoot, ['HEAD~1', 'HEAD']);
      return {
        comparison: { base: 'HEAD~1', head: 'HEAD', files: parseUnifiedDiff(diffText) },
        notes,
      };
    }

    return {
      comparison: { base: 'HEAD', head: 'working tree', files: [] },
      notes: ['No changes were found to analyze.'],
    };
  }

  if (options.base && !options.head) {
    assertRefExists(repoRoot, options.base);
    const head = currentBranch(repoRoot);
    const base = mergeBase(repoRoot, options.base, 'HEAD');
    const diffText = rawDiff(repoRoot, [base]);
    const files = withWorkingTreeAdditions(repoRoot, parseUnifiedDiff(diffText));
    return {
      comparison: {
        base: options.base,
        head: `${head} (working tree)`,
        files,
      },
      notes,
    };
  }

  const baseRef = options.base ?? 'HEAD';
  const headRef = options.head as string;
  assertRefExists(repoRoot, baseRef);
  assertRefExists(repoRoot, headRef);
  const base = mergeBase(repoRoot, baseRef, headRef);
  const diffText = rawDiff(repoRoot, [base, headRef]);
  return {
    comparison: { base: baseRef, head: headRef, files: parseUnifiedDiff(diffText) },
    notes,
  };
}

function assertRefExists(repoRoot: string, ref: string): void {
  if (!refExists(repoRoot, ref)) {
    throw new GitError(
      `Could not resolve '${ref}' to a commit, branch, or tag in this repository.`,
    );
  }
}
