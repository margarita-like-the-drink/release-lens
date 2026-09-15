import { describe, expect, it } from 'vitest';
import { classifyLevel, computeRisk, levelMeetsOrExceeds } from '../../src/risk/model.js';
import { DEFAULT_RISK_THRESHOLDS } from '../../src/config/schema.js';
import type { Signal } from '../../src/domain/types.js';

function signal(overrides: Partial<Signal>): Signal {
  return {
    id: 'x',
    title: 'x',
    category: 'change-management',
    contribution: 'inherent',
    weight: 1,
    confidence: 'high',
    explanation: '',
    evidence: [],
    affectedFiles: [],
    ...overrides,
  };
}

describe('computeRisk', () => {
  it('sums inherent and coverage risk independently', () => {
    const signals = [
      signal({ id: 'a', contribution: 'inherent', weight: 4 }),
      signal({ id: 'b', contribution: 'inherent', weight: 3 }),
      signal({ id: 'c', contribution: 'coverage', weight: 3 }),
      signal({ id: 'd', contribution: 'coverage', weight: 2 }),
    ];
    const risk = computeRisk(signals, DEFAULT_RISK_THRESHOLDS);
    expect(risk.inherentRisk).toBe(7);
    expect(risk.coverageRisk).toBe(5);
    expect(risk.mitigation).toBe(0);
    expect(risk.score).toBe(12);
    expect(risk.level).toBe('high');
  });

  it('matches the documented example: 7 inherent, 4 coverage, 1 mitigation -> score 10', () => {
    const signals = [
      signal({ id: 'a', contribution: 'inherent', weight: 7 }),
      signal({ id: 'b', contribution: 'coverage', weight: 4 }),
      signal({ id: 'c', contribution: 'mitigation', weight: 1 }),
    ];
    const risk = computeRisk(signals, DEFAULT_RISK_THRESHOLDS);
    expect(risk.inherentRisk).toBe(7);
    expect(risk.coverageRisk).toBe(4);
    expect(risk.mitigation).toBe(1);
    expect(risk.score).toBe(10);
    expect(risk.level).toBe('high');
  });

  it('never lets mitigation reduce inherent risk, even when mitigation exceeds coverage risk', () => {
    const signals = [
      signal({ id: 'payment', contribution: 'inherent', weight: 4 }),
      signal({ id: 'tests', contribution: 'mitigation', weight: 10 }),
    ];
    const risk = computeRisk(signals, DEFAULT_RISK_THRESHOLDS);
    expect(risk.inherentRisk).toBe(4);
    expect(risk.coverageRisk).toBe(0);
    expect(risk.score).toBe(4);
    expect(risk.score).toBeGreaterThanOrEqual(risk.inherentRisk);
  });

  it('ignores informational signals when computing the score', () => {
    const signals = [
      signal({ id: 'info', contribution: 'informational', weight: 0 }),
      signal({ id: 'inherent', contribution: 'inherent', weight: 2 }),
    ];
    const risk = computeRisk(signals, DEFAULT_RISK_THRESHOLDS);
    expect(risk.score).toBe(2);
    expect(risk.breakdown.some((entry) => entry.signalId === 'info')).toBe(false);
  });

  it('sorts breakdown entries by magnitude, mitigation shown as negative', () => {
    const signals = [
      signal({ id: 'small', contribution: 'inherent', weight: 1 }),
      signal({ id: 'big', contribution: 'inherent', weight: 5 }),
      signal({ id: 'mit', contribution: 'mitigation', weight: 3 }),
    ];
    const risk = computeRisk(signals, DEFAULT_RISK_THRESHOLDS);
    expect(risk.breakdown.map((e) => e.signalId)).toEqual(['big', 'mit', 'small']);
    expect(risk.breakdown.find((e) => e.signalId === 'mit')?.points).toBe(-3);
  });
});

describe('classifyLevel', () => {
  it('follows the documented thresholds', () => {
    expect(classifyLevel(0, DEFAULT_RISK_THRESHOLDS)).toBe('low');
    expect(classifyLevel(3, DEFAULT_RISK_THRESHOLDS)).toBe('low');
    expect(classifyLevel(4, DEFAULT_RISK_THRESHOLDS)).toBe('moderate');
    expect(classifyLevel(7, DEFAULT_RISK_THRESHOLDS)).toBe('moderate');
    expect(classifyLevel(8, DEFAULT_RISK_THRESHOLDS)).toBe('high');
    expect(classifyLevel(12, DEFAULT_RISK_THRESHOLDS)).toBe('high');
    expect(classifyLevel(13, DEFAULT_RISK_THRESHOLDS)).toBe('critical');
  });
});

describe('levelMeetsOrExceeds', () => {
  it('treats a level as meeting itself', () => {
    expect(levelMeetsOrExceeds('high', 'high')).toBe(true);
  });

  it('treats a higher level as exceeding a lower threshold', () => {
    expect(levelMeetsOrExceeds('critical', 'moderate')).toBe(true);
  });

  it('treats a lower level as not meeting a higher threshold', () => {
    expect(levelMeetsOrExceeds('low', 'high')).toBe(false);
  });
});
