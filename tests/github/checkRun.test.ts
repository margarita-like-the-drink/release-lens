import { describe, expect, it } from 'vitest';
import { buildCheckRun } from '../../src/github/checkRun.js';
import type { AnalysisResult } from '../../src/domain/types.js';

function result(level: AnalysisResult['risk']['level'], score: number): AnalysisResult {
  return {
    schemaVersion: 1,
    comparison: { base: 'main', head: 'HEAD' },
    summary: { totalFiles: 1, productionFiles: 1, testFiles: 0, configFiles: 0, otherFiles: 0 },
    affectedAreas: [],
    signals: [],
    risk: { inherentRisk: score, coverageRisk: 0, mitigation: 0, score, level, breakdown: [] },
    recommendations: [],
    reasoning: '',
    notes: [],
  };
}

describe('buildCheckRun', () => {
  it('is neutral (non-blocking) without a fail-on threshold', () => {
    const checkRun = buildCheckRun(result('critical', 20), 'abc123');
    expect(checkRun.conclusion).toBe('neutral');
  });

  it('fails when risk meets the fail-on threshold', () => {
    const checkRun = buildCheckRun(result('high', 9), 'abc123', 'high');
    expect(checkRun.conclusion).toBe('failure');
  });

  it('succeeds when risk is below the fail-on threshold', () => {
    const checkRun = buildCheckRun(result('low', 2), 'abc123', 'high');
    expect(checkRun.conclusion).toBe('success');
  });

  it('includes the level and score in the title', () => {
    const checkRun = buildCheckRun(result('moderate', 5), 'abc123');
    expect(checkRun.output.title).toBe('MODERATE · 5 points');
  });

  it('carries the head SHA through unchanged', () => {
    const checkRun = buildCheckRun(result('low', 0), 'deadbeef');
    expect(checkRun.head_sha).toBe('deadbeef');
  });
});
