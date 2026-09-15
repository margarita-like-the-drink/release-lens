import { describe, expect, it } from 'vitest';
import { detectSignals, findSignalDefinition } from '../../src/signals/registry.js';
import { classifyFiles } from '../../src/classification/classify.js';
import { defaultConfig } from '../../src/config/schema.js';
import type { ResolvedConfig } from '../../src/config/schema.js';
import type { ChangedFile } from '../../src/domain/types.js';
import { makeFile } from '../helpers/changedFile.js';

const NONEXISTENT_ROOT = '/nonexistent/release-lens-unit-test-root';

function run(files: ChangedFile[], config: ResolvedConfig = defaultConfig()) {
  const classifications = classifyFiles(files, config);
  return detectSignals({
    repoRoot: NONEXISTENT_ROOT,
    comparison: { base: 'main', head: 'HEAD', files },
    classifications,
    config,
  });
}

function find(signals: ReturnType<typeof run>, id: string) {
  return signals.find((s) => s.id === id);
}

describe('paymentLogicChanged', () => {
  it('fires on payment-related production files', () => {
    const signals = run([
      makeFile({ path: 'src/payments/charge.ts', added: ['export function charge() {}'] }),
    ]);
    expect(find(signals, 'payment-logic-changed')?.weight).toBe(4);
  });

  it('does not fire for unrelated production files', () => {
    const signals = run([makeFile({ path: 'src/widgets/color.ts', added: ['const x = 1;'] })]);
    expect(find(signals, 'payment-logic-changed')).toBeUndefined();
  });

  it('labels retry-related payment changes distinctly', () => {
    const signals = run([
      makeFile({
        path: 'src/payments/processPayment.ts',
        added: ['function processPayment(attempt = 0) { return charge(); }'],
      }),
    ]);
    const signal = find(signals, 'payment-logic-changed');
    expect(signal?.evidence[0]?.description).toBe('Payment retry logic changed');
  });
});

describe('authenticationChanged / authorizationChanged', () => {
  it('distinguishes authentication from authorization', () => {
    const signals = run([
      makeFile({ path: 'src/auth/session.ts', added: ['function login(password) {}'] }),
      makeFile({
        path: 'src/auth/guard.ts',
        added: ['function authorize(user) { return forbidden(); }'],
      }),
    ]);
    expect(find(signals, 'authentication-changed')?.affectedFiles).toContain('src/auth/session.ts');
    expect(find(signals, 'authorization-changed')?.affectedFiles).toContain('src/auth/guard.ts');
  });
});

describe('databaseMigrationChanged', () => {
  it('fires for files under a migrations directory', () => {
    const signals = run([
      makeFile({
        path: 'db/migrations/001_init.sql',
        status: 'added',
        added: ['CREATE TABLE x();'],
      }),
    ]);
    expect(find(signals, 'database-migration-changed')).toBeDefined();
  });

  it('does not treat migrations as a coverage gap', () => {
    const signals = run([
      makeFile({
        path: 'db/migrations/001_init.sql',
        status: 'added',
        added: ['CREATE TABLE x();'],
      }),
    ]);
    expect(find(signals, 'production-without-tests')).toBeUndefined();
  });
});

describe('testsAdded / testsDeleted / assertionsRemoved / testsSkipped', () => {
  it('detects a net increase in test cases as tests-added', () => {
    const signals = run([
      makeFile({
        path: 'tests/checkout.spec.ts',
        added: ["it('a', () => { expect(1).toBe(1); })", "it('b', () => { expect(1).toBe(1); })"],
      }),
    ]);
    expect(find(signals, 'tests-added')?.weight).toBe(2);
  });

  it('detects a deleted test file as tests-deleted', () => {
    const signals = run([
      makeFile({
        path: 'tests/checkout.spec.ts',
        status: 'deleted',
        removed: ["it('a', () => {})"],
      }),
    ]);
    expect(find(signals, 'tests-deleted')?.confidence).toBe('high');
  });

  it('detects a net removal of assertions within a still-present test', () => {
    const signals = run([
      makeFile({
        path: 'tests/checkout.spec.ts',
        removed: ['expect(a).toBe(1);', 'expect(b).toBe(2);'],
        added: ['expect(a).toBe(1);'],
      }),
    ]);
    expect(find(signals, 'assertions-removed')?.evidence[0]?.description).toContain('1 assertion');
  });

  it('detects a newly skipped test', () => {
    const signals = run([
      makeFile({ path: 'tests/checkout.spec.ts', added: ["it.skip('a', () => {})"] }),
    ]);
    expect(find(signals, 'tests-skipped')).toBeDefined();
  });
});

describe('productionWithoutTests', () => {
  it('flags a production file with no related test change', () => {
    const signals = run([
      makeFile({ path: 'src/payments/retry.ts', added: ['export function retry() {}'] }),
    ]);
    const signal = find(signals, 'production-without-tests');
    expect(signal).toBeDefined();
    expect(signal?.evidence[0]?.description).toContain('Potential coverage gap');
  });

  it('does not flag a production file whose matching test file was also changed', () => {
    const signals = run([
      makeFile({ path: 'src/payments/retry.ts', added: ['export function retry() {}'] }),
      makeFile({ path: 'src/payments/retry.spec.ts', added: ["it('retries', () => {})"] }),
    ]);
    expect(find(signals, 'production-without-tests')).toBeUndefined();
  });

  it('never claims a file has no tests at all, only that no related change was detected', () => {
    const signals = run([
      makeFile({ path: 'src/payments/retry.ts', added: ['export function retry() {}'] }),
    ]);
    const signal = find(signals, 'production-without-tests');
    expect(signal?.evidence[0]?.description.toLowerCase()).not.toContain('has no tests');
  });
});

describe('apiContractChanged', () => {
  it('detects a field changed from optional to required', () => {
    const signals = run([
      makeFile({
        path: 'src/types/order.ts',
        removed: ['  discountCode?: string;'],
        added: ['  discountCode: string;'],
      }),
    ]);
    const signal = find(signals, 'api-contract-changed');
    expect(signal?.evidence[0]?.description).toContain('discountCode');
  });
});

describe('largeChangeSurface', () => {
  it('fires once the configured threshold is exceeded', () => {
    const bigFile = makeFile({
      path: 'src/big.ts',
      added: Array.from({ length: 10 }, (_, i) => `line ${i}`),
    });
    const config = defaultConfig();
    config.risk.largeChangeThreshold = 5;
    const signals = run([bigFile], config);
    expect(find(signals, 'large-change-surface')).toBeDefined();
  });

  it('does not fire below the threshold', () => {
    const smallFile = makeFile({ path: 'src/small.ts', added: ['one line'] });
    const signals = run([smallFile]);
    expect(find(signals, 'large-change-surface')).toBeUndefined();
  });
});

describe('multiAreaChange', () => {
  it('fires when three or more areas are touched', () => {
    const signals = run([
      makeFile({ path: 'src/payments/a.ts', added: ['x'] }),
      makeFile({ path: 'src/auth/b.ts', added: ['x'] }),
      makeFile({ path: 'src/checkout/c.ts', added: ['x'] }),
    ]);
    expect(find(signals, 'multi-area-change')).toBeDefined();
  });

  it('does not fire for a single-area change', () => {
    const signals = run([
      makeFile({ path: 'src/payments/a.ts', added: ['x'] }),
      makeFile({ path: 'src/payments/b.ts', added: ['x'] }),
    ]);
    expect(find(signals, 'multi-area-change')).toBeUndefined();
  });
});

describe('criticalPathChanged', () => {
  it('only fires when critical paths are configured', () => {
    const signals = run([makeFile({ path: 'src/payments/a.ts', added: ['x'] })]);
    expect(find(signals, 'critical-path-changed')).toBeUndefined();
  });

  it('uses the configured risk weight, not a default', () => {
    const config = defaultConfig();
    config.criticalPaths = [{ path: 'src/payments/**', name: 'Payments', risk: 9 }];
    const signals = run([makeFile({ path: 'src/payments/a.ts', added: ['x'] })], config);
    expect(find(signals, 'critical-path-changed')?.weight).toBe(9);
  });
});

describe('signal registry invariants', () => {
  it('every fired signal carries at least one piece of evidence', () => {
    const signals = run([
      makeFile({ path: 'src/payments/retry.ts', added: ['export function retry() {}'] }),
      makeFile({ path: 'src/auth/session.ts', added: ['function login() {}'] }),
    ]);
    for (const signal of signals) {
      expect(signal.evidence.length).toBeGreaterThan(0);
    }
  });

  it('every signal id used by a detector has registry metadata', () => {
    const signals = run([
      makeFile({ path: 'src/payments/retry.ts', added: ['export function retry() {}'] }),
    ]);
    for (const signal of signals) {
      expect(findSignalDefinition(signal.id)).toBeDefined();
    }
  });
});
