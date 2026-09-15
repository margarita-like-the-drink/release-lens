import type { ChangedFile } from '../domain/types.js';

export function addedLines(file: ChangedFile): string[] {
  return file.hunks.flatMap((hunk) =>
    hunk.lines.filter((line) => line.type === 'add').map((line) => line.content),
  );
}

export interface LineMatch {
  content: string;
  line: number;
}

/** Added lines paired with their line number in the new file - for evidence a PR review comment can anchor to. */
export function addedLinesWithNumbers(file: ChangedFile): LineMatch[] {
  const matches: LineMatch[] = [];
  for (const hunk of file.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add' && line.newLine !== undefined) {
        matches.push({ content: line.content, line: line.newLine });
      }
    }
  }
  return matches;
}

/** The new-file line number of the first added line matching any pattern, if any. */
export function findFirstMatchingLine(file: ChangedFile, patterns: RegExp[]): number | undefined {
  for (const { content, line } of addedLinesWithNumbers(file)) {
    if (patterns.some((pattern) => pattern.test(content))) return line;
  }
  return undefined;
}

export function removedLines(file: ChangedFile): string[] {
  return file.hunks.flatMap((hunk) =>
    hunk.lines.filter((line) => line.type === 'del').map((line) => line.content),
  );
}

export function changedLines(file: ChangedFile): string[] {
  return [...addedLines(file), ...removedLines(file)];
}

export function countMatches(lines: string[], pattern: RegExp): number {
  return lines.reduce((count, line) => count + (pattern.test(line) ? 1 : 0), 0);
}

export function anyMatch(lines: string[], patterns: RegExp[]): boolean {
  return lines.some((line) => patterns.some((pattern) => pattern.test(line)));
}

export function pathContainsAny(path: string, keywords: string[]): boolean {
  const lower = path.toLowerCase();
  return keywords.some((keyword) => lower.includes(keyword.toLowerCase()));
}

/** True if the file's path or any changed line matches at least one pattern. */
export function fileMatches(file: ChangedFile, patterns: RegExp[]): boolean {
  if (patterns.some((pattern) => pattern.test(file.path))) return true;
  return anyMatch(changedLines(file), patterns);
}

export function humanizeIdentifier(identifier: string): string {
  const withSpaces = identifier
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .trim();
  return withSpaces.length > 0 ? withSpaces : identifier;
}

export function baseName(path: string): string {
  return path.split('/').pop() ?? path;
}

export function withoutExtension(path: string): string {
  return baseName(path).replace(/\.[A-Za-z0-9]+$/, '');
}
