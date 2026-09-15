import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { analyzeTestChurn } from '../testCaseCounting.js';

export const testsDeleted: SignalDefinition = {
  id: 'tests-deleted',
  title: 'Tests were deleted',
  category: 'coverage',
  contribution: 'coverage',
  defaultWeight: 3,
  confidence: 'high',
  whyItMatters:
    'Removing tests can remove evidence that previously protected existing behavior, whether or not the removal was intentional.',
  whatItLooksFor:
    'Deleted test files, or a net reduction in test-case declarations within a modified test file.',
  qaResponse:
    'Confirm the removed tests were removed intentionally because the behavior they covered was intentionally removed or changed, not because they were inconvenient to keep passing.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'test') continue;
      const { file } = classification;

      if (file.status === 'deleted') {
        affected.push(file.path);
        evidence.push({ file: file.path, description: 'Test file deleted' });
        continue;
      }

      if (file.status === 'modified') {
        const churn = analyzeTestChurn(file);
        const net = churn.removedCases - churn.addedCases;
        if (net > 0) {
          affected.push(file.path);
          evidence.push({ file: file.path, description: `${net} test case(s) removed` });
        }
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(testsDeleted, ctx.config);
    return [buildSignal(testsDeleted, weight, evidence, affected)];
  },
};
