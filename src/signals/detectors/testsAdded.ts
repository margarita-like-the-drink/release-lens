import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { analyzeTestChurn } from '../testCaseCounting.js';

export const testsAdded: SignalDefinition = {
  id: 'tests-added',
  title: 'Tests added',
  category: 'coverage',
  contribution: 'mitigation',
  defaultWeight: 2,
  confidence: 'medium',
  whyItMatters:
    'New automated test cases are evidence that at least some of the change is protected against regression, though they cannot prove the change is fully covered.',
  whatItLooksFor:
    'New test files, or new test-case declarations (it/test/def test_/@Test and similar) added within modified test files.',
  qaResponse:
    'Review what the new tests actually assert. Added tests reduce coverage risk; they do not reduce the inherent risk of the underlying change.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'test') continue;
      const churn = analyzeTestChurn(classification.file);
      const netAdded = churn.addedCases - churn.removedCases;
      if (classification.file.status === 'added' || netAdded > 0) {
        const count =
          classification.file.status === 'added' ? Math.max(churn.addedCases, 1) : netAdded;
        if (count <= 0) continue;
        affected.push(classification.file.path);
        evidence.push({
          file: classification.file.path,
          description:
            classification.file.status === 'added'
              ? `New test file with ${count} test case(s)`
              : `${count} new test case(s) added`,
        });
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(testsAdded, ctx.config);
    return [buildSignal(testsAdded, weight, evidence, affected)];
  },
};
