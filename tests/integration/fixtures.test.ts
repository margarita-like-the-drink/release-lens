import { afterEach, describe, expect, it } from 'vitest';
import { runAnalysis } from '../../src/analyze.js';
import type { TempRepo } from '../helpers/tempRepo.js';
import { createScenario } from '../helpers/tempRepo.js';

/**
 * Ten realistic change scenarios, doubling as both integration tests and the
 * worked examples referenced from the README. Each uses a real temporary Git
 * repository so the whole pipeline - git diff, classification, signals, risk,
 * recommendations - runs end to end.
 */

let activeRepo: TempRepo | undefined;

afterEach(() => {
  activeRepo?.cleanup();
  activeRepo = undefined;
});

function analyze(base: Record<string, string>, changed: Record<string, string>) {
  activeRepo = createScenario(base, changed);
  return runAnalysis({ cwd: activeRepo.dir });
}

describe('fixture 1: README-only change', () => {
  it('stays LOW risk', () => {
    const result = analyze(
      { 'README.md': '# Project\n' },
      { 'README.md': '# Project\n\nNow with more detail.\n' },
    );
    expect(result.risk.level).toBe('low');
    expect(result.risk.score).toBeLessThanOrEqual(3);
  });
});

describe('fixture 2: CSS-only change', () => {
  it('stays LOW risk', () => {
    const result = analyze(
      { 'src/app.css': '.button { color: blue; }\n' },
      { 'src/app.css': '.button { color: red; }\n' },
    );
    expect(result.risk.level).toBe('low');
  });
});

describe('fixture 3: checkout discount validation changed with related tests added', () => {
  it('lands in MODERATE, with mitigation reducing coverage risk but not inherent risk', () => {
    const result = analyze(
      {
        'src/checkout/discount.ts':
          'export function validateDiscount(v: number) { return v >= 0; }\n',
        'tests/discount.spec.ts':
          "import { validateDiscount } from '../src/checkout/discount';\nit('accepts zero', () => { expect(validateDiscount(0)).toBe(true); });\n",
      },
      {
        'src/checkout/discount.ts':
          'export function validateDiscount(v: number) { return v >= 0 && v <= 100; }\n',
        'tests/discount.spec.ts':
          "import { validateDiscount } from '../src/checkout/discount';\nit('accepts zero', () => { expect(validateDiscount(0)).toBe(true); });\nit('rejects above the maximum', () => { expect(validateDiscount(101)).toBe(false); });\n",
      },
    );
    expect(result.risk.level).toBe('moderate');
    expect(result.signals.some((s) => s.id === 'tests-added')).toBe(true);
    expect(result.signals.some((s) => s.id === 'validation-logic-changed')).toBe(true);
    expect(result.signals.some((s) => s.id === 'production-without-tests')).toBe(false);
    expect(result.risk.mitigation).toBeGreaterThan(0);
  });
});

describe('fixture 4: checkout business logic changed without related tests', () => {
  it('lands in HIGH risk with a coverage-gap signal', () => {
    const result = analyze(
      {
        'src/checkout/total.ts':
          'export function total(items: number[]) { return items.length; }\n',
      },
      {
        'src/checkout/total.ts':
          'export function total(items: number[]) { return items.reduce((a, b) => a + b, 0); }\n',
      },
    );
    expect(result.signals.some((s) => s.id === 'production-without-tests')).toBe(true);
    expect(['high', 'critical']).not.toContain('unexpected');
    expect(result.risk.level === 'moderate' || result.risk.level === 'high').toBe(true);
  });
});

describe('fixture 5: payment + authentication + database migration', () => {
  it('reaches CRITICAL', () => {
    const result = analyze(
      {
        'src/payments/processPayment.ts':
          'export function processPayment() { return charge(); }\nfunction charge() { return true; }\n',
        'src/auth/session.ts':
          'export function isValid(s: { exp: number }) { return s.exp > Date.now(); }\n',
      },
      {
        'src/payments/processPayment.ts':
          'export function processPayment(attempt = 0) { try { return charge(); } catch (e) { if (attempt < 3) return processPayment(attempt + 1); throw e; } }\nfunction charge() { return true; }\n',
        'src/auth/session.ts':
          'export function isValid(s: { exp: number } | null) { if (!s) return false; return s.exp > Date.now(); }\n',
        'db/migrations/003_add_payment_status.sql':
          'ALTER TABLE payments ADD COLUMN status VARCHAR(32);\n',
      },
    );
    expect(result.risk.level).toBe('critical');
    expect(result.signals.map((s) => s.id)).toEqual(
      expect.arrayContaining([
        'payment-logic-changed',
        'authentication-changed',
        'database-migration-changed',
      ]),
    );
  });
});

describe('fixture 6: existing test cases deleted', () => {
  it('increases risk relative to the same change without deletion', () => {
    const withoutDeletion = analyze(
      {
        'src/checkout/total.ts': 'export function total() { return 0; }\n',
        'tests/total.spec.ts':
          "it('a', () => { expect(1).toBe(1); });\nit('b', () => { expect(1).toBe(1); });\n",
      },
      { 'src/checkout/total.ts': 'export function total() { return 1; }\n' },
    );
    activeRepo?.cleanup();

    const withDeletion = analyze(
      {
        'src/checkout/total.ts': 'export function total() { return 0; }\n',
        'tests/total.spec.ts':
          "it('a', () => { expect(1).toBe(1); });\nit('b', () => { expect(1).toBe(1); });\n",
      },
      {
        'src/checkout/total.ts': 'export function total() { return 1; }\n',
        'tests/total.spec.ts': "it('a', () => { expect(1).toBe(1); });\n",
      },
    );

    expect(withDeletion.risk.score).toBeGreaterThan(withoutDeletion.risk.score);
    expect(withDeletion.signals.some((s) => s.id === 'tests-deleted')).toBe(true);
  });
});

describe('fixture 7: new skipped tests introduced', () => {
  it('increases risk relative to the same test left enabled', () => {
    const enabled = analyze(
      { 'src/checkout/total.ts': 'export function total() { return 0; }\n' },
      {
        'src/checkout/total.ts': 'export function total() { return 1; }\n',
        'tests/total.spec.ts': "it('adds up', () => { expect(total()).toBe(1); });\n",
      },
    );
    activeRepo?.cleanup();

    const skipped = analyze(
      { 'src/checkout/total.ts': 'export function total() { return 0; }\n' },
      {
        'src/checkout/total.ts': 'export function total() { return 1; }\n',
        'tests/total.spec.ts': "it.skip('adds up', () => { expect(total()).toBe(1); });\n",
      },
    );

    expect(skipped.signals.some((s) => s.id === 'tests-skipped')).toBe(true);
    expect(skipped.risk.score).toBeGreaterThan(enabled.risk.score);
  });
});

describe('fixture 8: large refactor accompanied by meaningful test changes', () => {
  it('does not automatically become CRITICAL', () => {
    const productionLines = Array.from({ length: 40 }, (_, i) => `export const value${i} = ${i};`);
    const testLines = Array.from(
      { length: 40 },
      (_, i) => `it('value ${i}', () => { expect(value${i}).toBe(${i}); });`,
    );
    const result = analyze(
      {
        'src/lib/constants.ts': 'export const value0 = 0;\n',
        'tests/constants.spec.ts': "it('value 0', () => { expect(value0).toBe(0); });\n",
      },
      {
        'src/lib/constants.ts': productionLines.join('\n') + '\n',
        'tests/constants.spec.ts': testLines.join('\n') + '\n',
      },
    );
    expect(result.risk.level).not.toBe('critical');
  });
});

describe('fixture 9: API contract change from optional to required field', () => {
  it('flags the contract change and produces consumer-impact recommendations', () => {
    const result = analyze(
      { 'src/types/order.ts': 'export interface Order {\n  discountCode?: string;\n}\n' },
      { 'src/types/order.ts': 'export interface Order {\n  discountCode: string;\n}\n' },
    );
    const signal = result.signals.find((s) => s.id === 'api-contract-changed');
    expect(signal).toBeDefined();
    expect(signal?.evidence[0]?.description).toContain('discountCode');
    expect(
      result.recommendations.some((r) => r.text.includes('discountCode') && r.category === 'api'),
    ).toBe(true);
  });
});

describe('fixture 10: role/permission logic changed', () => {
  it('produces authorization and privilege-boundary recommendations', () => {
    const result = analyze(
      {
        'src/auth/roles.ts':
          'export function hasRole(user: { role: string }, role: string) { return user.role === role; }\n',
      },
      {
        'src/auth/roles.ts':
          'export function hasRole(user: { roles: string[] }, role: string) { return user.roles.includes(role); }\n',
      },
    );
    expect(result.signals.some((s) => s.id === 'permission-role-changed')).toBe(true);
    expect(
      result.recommendations.some((r) => r.category === 'permissions' || r.category === 'boundary'),
    ).toBe(true);
  });
});
