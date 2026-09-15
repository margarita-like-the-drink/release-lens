import parseDiff from 'parse-diff';
import type {
  ChangedFile,
  ChangeStatus,
  DiffHunk,
  DiffLine,
  DiffLineType,
} from '../domain/types.js';

/** Converts raw unified diff text into the structured ChangedFile[] the rest of ReleaseLens works with. */
export function parseUnifiedDiff(diffText: string): ChangedFile[] {
  const files = parseDiff(diffText);

  return files.map((file): ChangedFile => {
    const from = file.from && file.from !== '/dev/null' ? file.from : undefined;
    const to = file.to && file.to !== '/dev/null' ? file.to : undefined;
    const path = to ?? from ?? '(unknown)';

    let status: ChangeStatus = 'modified';
    if (file.deleted) status = 'deleted';
    else if (file.new) status = 'added';
    else if (from && to && from !== to) status = 'renamed';

    const hunks: DiffHunk[] = file.chunks.map((chunk) => ({
      header: chunk.content,
      lines: chunk.changes.map((change): DiffLine => {
        const type: DiffLineType =
          change.type === 'add' ? 'add' : change.type === 'del' ? 'del' : 'context';
        const content = change.content.length > 0 ? change.content.slice(1) : change.content;
        const line: DiffLine = { type, content };
        if (change.type === 'add') line.newLine = change.ln;
        else if (change.type === 'del') line.oldLine = change.ln;
        else {
          line.oldLine = change.ln1;
          line.newLine = change.ln2;
        }
        return line;
      }),
    }));

    const isBinary = file.chunks.length === 0 && file.additions === 0 && file.deletions === 0;

    const changedFile: ChangedFile = {
      path,
      status,
      additions: file.additions,
      deletions: file.deletions,
      hunks,
      isBinary,
    };
    if (status === 'renamed' && from) {
      changedFile.previousPath = from;
    }
    return changedFile;
  });
}
