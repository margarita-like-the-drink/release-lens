import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { analyzeTestChurn } from '../testCaseCounting.js';

export const assertionsRemoved: SignalDefinition = {
  id: 'assertions-removed',
  title: 'Existing assertion removed',
  category: 'coverage',
  contribution: 'coverage',
  defaultWeight: 2,
  confidence: 'medium',
  whyItMatters:
    'A test can keep passing while asserting less than before. Removing assertions without removing the test case can quietly weaken coverage.',
  whatItLooksFor:
    'A net reduction in assertion-like lines (expect/assert/should) within a test file that was not deleted outright.',
  qaResponse:
    'Check whether the removed assertion checked behavior that is still expected. If so, confirm it is verified elsewhere before treating this as safe.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'test' || classification.file.status !== 'modified') continue;
      const churn = analyzeTestChurn(classification.file);
      const net = churn.removedAssertions - churn.addedAssertions;
      if (net > 0) {
        affected.push(classification.file.path);
        evidence.push({
          file: classification.file.path,
          description: `${net} assertion(s) removed net`,
        });
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(assertionsRemoved, ctx.config);
    return [buildSignal(assertionsRemoved, weight, evidence, affected)];
  },
};
