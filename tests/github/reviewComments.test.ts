import { describe, expect, it } from 'vitest';
import { buildInlineComments } from '../../src/github/reviewComments.js';
import type { AnalysisResult, Signal } from '../../src/domain/types.js';

function signal(overrides: Partial<Signal>): Signal {
  return {
    id: 'x',
    title: 'Signal X',
    category: 'change-management',
    contribution: 'inherent',
    weight: 3,
    confidence: 'medium',
    explanation: '',
    evidence: [],
    affectedFiles: [],
    ...overrides,
  };
}

function result(signals: Signal[]): AnalysisResult {
  return {
    schemaVersion: 1,
    comparison: { base: 'main', head: 'HEAD' },
    summary: { totalFiles: 1, productionFiles: 1, testFiles: 0, configFiles: 0, otherFiles: 0 },
    affectedAreas: [],
    signals,
    risk: {
      inherentRisk: 0,
      coverageRisk: 0,
      mitigation: 0,
      score: 0,
      level: 'low',
      breakdown: [],
    },
    recommendations: [],
    reasoning: '',
    notes: [],
  };
}

describe('buildInlineComments', () => {
  it('produces no comments when no evidence carries a line number', () => {
    const comments = buildInlineComments(
      result([signal({ evidence: [{ file: 'a.ts', description: 'x' }] })]),
    );
    expect(comments).toHaveLength(0);
  });

  it('produces one comment per (file, line) with a line number', () => {
    const comments = buildInlineComments(
      result([
        signal({ id: 'a', evidence: [{ file: 'src/a.ts', description: 'A changed', line: 5 }] }),
      ]),
    );
    expect(comments).toHaveLength(1);
    expect(comments[0]).toMatchObject({ path: 'src/a.ts', line: 5, side: 'RIGHT' });
    expect(comments[0]!.body).toContain('A changed');
  });

  it('merges multiple signals landing on the same file and line into one comment', () => {
    const comments = buildInlineComments(
      result([
        signal({
          id: 'a',
          title: 'Signal A',
          evidence: [{ file: 'src/a.ts', description: 'first', line: 5 }],
        }),
        signal({
          id: 'b',
          title: 'Signal B',
          evidence: [{ file: 'src/a.ts', description: 'second', line: 5 }],
        }),
      ]),
    );
    expect(comments).toHaveLength(1);
    expect(comments[0]!.body).toContain('Signal A');
    expect(comments[0]!.body).toContain('Signal B');
  });

  it('keeps separate lines in the same file as separate comments', () => {
    const comments = buildInlineComments(
      result([
        signal({ id: 'a', evidence: [{ file: 'src/a.ts', description: 'first', line: 5 }] }),
        signal({ id: 'b', evidence: [{ file: 'src/a.ts', description: 'second', line: 9 }] }),
      ]),
    );
    expect(comments).toHaveLength(2);
  });
});
