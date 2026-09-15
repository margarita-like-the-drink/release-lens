import type { ChangedFile, ChangeStatus, DiffHunk } from '../../src/domain/types.js';

interface MakeFileOptions {
  path: string;
  status?: ChangeStatus;
  added?: string[];
  removed?: string[];
  isBinary?: boolean;
}

/** Builds a ChangedFile with a single hunk from added/removed line lists, for unit tests. */
export function makeFile(options: MakeFileOptions): ChangedFile {
  const added = options.added ?? [];
  const removed = options.removed ?? [];

  const hunks: DiffHunk[] = [];
  if (added.length > 0 || removed.length > 0) {
    hunks.push({
      header: '@@ -1 +1 @@',
      lines: [
        ...removed.map((content) => ({ type: 'del' as const, content })),
        ...added.map((content) => ({ type: 'add' as const, content })),
      ],
    });
  }

  return {
    path: options.path,
    status: options.status ?? 'modified',
    additions: added.length,
    deletions: removed.length,
    hunks,
    isBinary: options.isBinary ?? false,
  };
}
