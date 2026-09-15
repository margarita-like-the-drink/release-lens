import { describe, expect, it } from 'vitest';
import { buildRecommendations } from '../../src/recommendations/index.js';
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
    evidence: [{ file: 'src/x.ts', description: 'x' }],
    affectedFiles: ['src/x.ts'],
    ...overrides,
  };
}

describe('buildRecommendations', () => {
  it('produces no filler text for an unknown signal', () => {
    const recs = buildRecommendations([signal({ id: 'unknown-signal' })]);
    expect(recs).toHaveLength(0);
  });

  it('generates concrete, specific recommendations for a known signal', () => {
    const recs = buildRecommendations([signal({ id: 'payment-logic-changed', weight: 4 })]);
    expect(recs.length).toBeGreaterThan(0);
    for (const rec of recs) {
      expect(rec.text.toLowerCase()).not.toBe('test edge cases.');
      expect(rec.text.toLowerCase()).not.toContain('perform regression testing');
      expect(rec.signalIds).toContain('payment-logic-changed');
    }
  });

  it('every recommendation maps back to at least one signal id', () => {
    const recs = buildRecommendations([
      signal({ id: 'payment-logic-changed', weight: 4 }),
      signal({ id: 'authentication-changed', weight: 3, contribution: 'inherent' }),
    ]);
    for (const rec of recs) {
      expect(rec.signalIds.length).toBeGreaterThan(0);
    }
  });

  it('sorts items within each category by descending priority', () => {
    const recs = buildRecommendations([
      signal({ id: 'error-handling-changed', weight: 1 }),
      signal({ id: 'payment-logic-changed', weight: 4 }),
    ]);
    const byCategory = new Map<string, number[]>();
    for (const rec of recs) {
      const list = byCategory.get(rec.category) ?? [];
      list.push(rec.priority);
      byCategory.set(rec.category, list);
    }
    for (const priorities of byCategory.values()) {
      for (let i = 1; i < priorities.length; i += 1) {
        expect(priorities[i]).toBeLessThanOrEqual(priorities[i - 1]!);
      }
    }
  });

  it('places the highest-priority signal in an earlier category than a low-priority-only signal', () => {
    const recs = buildRecommendations([
      signal({ id: 'error-handling-changed', weight: 1 }),
      signal({ id: 'payment-logic-changed', weight: 4 }),
    ]);
    const firstPaymentIndex = recs.findIndex((r) => r.signalIds.includes('payment-logic-changed'));
    const firstErrorIndex = recs.findIndex((r) => r.signalIds.includes('error-handling-changed'));
    expect(firstPaymentIndex).toBeGreaterThanOrEqual(0);
    expect(firstPaymentIndex).toBeLessThan(firstErrorIndex);
  });

  it('adds a cross-signal recommendation only when both required signals are present', () => {
    const withBoth = buildRecommendations([
      signal({ id: 'payment-logic-changed', weight: 4 }),
      signal({ id: 'database-migration-changed', weight: 3 }),
    ]);
    const withOnlyPayment = buildRecommendations([
      signal({ id: 'payment-logic-changed', weight: 4 }),
    ]);

    const combinedText = withBoth.some((r) =>
      r.text.includes('confirming the outcome with the payment provider'),
    );
    const soloText = withOnlyPayment.some((r) =>
      r.text.includes('confirming the outcome with the payment provider'),
    );

    expect(combinedText).toBe(true);
    expect(soloText).toBe(false);
  });

  it('adds retry-specific recommendations when payment evidence mentions retry behavior', () => {
    const recs = buildRecommendations([
      signal({
        id: 'payment-logic-changed',
        weight: 4,
        evidence: [{ file: 'src/payments/retry.ts', description: 'Payment retry logic changed' }],
      }),
    ]);
    expect(recs.some((r) => r.text.toLowerCase().includes('idempotent'))).toBe(true);
  });

  it('parameterizes the validation subject from the affected file name', () => {
    const recs = buildRecommendations([
      signal({
        id: 'validation-logic-changed',
        weight: 2,
        affectedFiles: ['src/checkout/discount.ts'],
      }),
    ]);
    expect(recs.some((r) => r.text.includes('discount value'))).toBe(true);
  });
});
