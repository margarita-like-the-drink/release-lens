import type { AnalysisResult } from '../domain/types.js';

export interface InlineComment {
  path: string;
  line: number;
  side: 'RIGHT';
  body: string;
}

/**
 * Builds one inline PR review comment per (file, line) that at least one
 * signal's evidence points to, merging multiple signals landing on the same
 * line into a single comment rather than posting duplicates. Evidence
 * without a line number (most structural/file-level signals) is not
 * represented here - it's still visible in the review's summary body.
 */
export function buildInlineComments(result: AnalysisResult): InlineComment[] {
  const byKey = new Map<string, { path: string; line: number; entries: string[] }>();

  for (const signal of result.signals) {
    for (const evidence of signal.evidence) {
      if (evidence.line === undefined) continue;
      const key = `${evidence.file}:${evidence.line}`;
      const existing = byKey.get(key) ?? { path: evidence.file, line: evidence.line, entries: [] };
      existing.entries.push(
        `**${signal.title}** (${signal.contribution}, +${signal.weight}) — ${evidence.description}`,
      );
      byKey.set(key, existing);
    }
  }

  return Array.from(byKey.values())
    .sort((a, b) => a.path.localeCompare(b.path) || a.line - b.line)
    .map((entry) => ({
      path: entry.path,
      line: entry.line,
      side: 'RIGHT' as const,
      body: `ReleaseLens\n\n${entry.entries.map((e) => `- ${e}`).join('\n')}`,
    }));
}
