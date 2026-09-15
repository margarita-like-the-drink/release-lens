import { describe, expect, it } from 'vitest';
import { deriveGenericArea, matchCriticalPaths } from '../../../src/classification/areas.js';

describe('deriveGenericArea', () => {
  it('derives an area from a source directory', () => {
    expect(deriveGenericArea('src/payments/retry.ts')).toBe('payment');
    expect(deriveGenericArea('src/auth/session.ts')).toBe('auth');
  });

  it('derives an area from a single-segment test file name', () => {
    expect(deriveGenericArea('tests/checkout.spec.ts')).toBe('checkout');
  });

  it('merges trivial singular/plural naming differences', () => {
    expect(deriveGenericArea('src/payments/retry.ts')).toBe(deriveGenericArea('payment.spec.ts'));
  });

  it('returns null for a bare root-level file', () => {
    expect(deriveGenericArea('README.md')).toBe('readme');
  });
});

describe('matchCriticalPaths', () => {
  it('matches configured glob patterns', () => {
    const matches = matchCriticalPaths('src/payments/retry.ts', [
      { path: 'src/payments/**', name: 'Payments', risk: 4 },
      { path: 'src/auth/**', name: 'Authentication', risk: 4 },
    ]);
    expect(matches).toHaveLength(1);
    expect(matches[0]?.name).toBe('Payments');
  });

  it('returns no matches when nothing configured', () => {
    expect(matchCriticalPaths('src/payments/retry.ts', [])).toHaveLength(0);
  });
});
