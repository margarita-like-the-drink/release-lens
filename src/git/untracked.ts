import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ChangedFile } from '../domain/types.js';
import { execFileSync } from 'node:child_process';

/**
 * `git diff` never includes untracked files, so a brand-new file a QA
 * engineer hasn't `git add`ed yet would otherwise vanish from the analysis
 * entirely. This synthesizes ChangedFile entries for them directly from the
 * working tree, without touching the Git index.
 */
export function untrackedChangedFiles(repoRoot: string): ChangedFile[] {
  const status = execFileSync('git', ['status', '--porcelain', '--untracked-files=all'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  const files: ChangedFile[] = [];
  for (const line of status.split('\n')) {
    if (!line.startsWith('?? ')) continue;
    const relPath = line.slice(3).trim();
    if (relPath.length === 0) continue;

    let buffer: Buffer;
    try {
      buffer = readFileSync(join(repoRoot, relPath));
    } catch {
      continue;
    }

    if (isProbablyBinary(buffer)) {
      files.push({
        path: relPath,
        status: 'added',
        additions: 0,
        deletions: 0,
        hunks: [],
        isBinary: true,
      });
      continue;
    }

    const text = buffer.toString('utf8');
    const lines = text.length === 0 ? [] : text.split('\n');
    if (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();

    files.push({
      path: relPath,
      status: 'added',
      additions: lines.length,
      deletions: 0,
      hunks:
        lines.length > 0
          ? [
              {
                header: `@@ -0,0 +1,${lines.length} @@`,
                lines: lines.map((content) => ({ type: 'add' as const, content })),
              },
            ]
          : [],
      isBinary: false,
    });
  }

  return files;
}

function isProbablyBinary(buffer: Buffer): boolean {
  const length = Math.min(buffer.length, 8000);
  for (let i = 0; i < length; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}
