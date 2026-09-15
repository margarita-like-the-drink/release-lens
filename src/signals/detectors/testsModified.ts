import type { SignalDefinition } from '../types.js';
import { buildSignal } from '../build.js';
import { analyzeTestChurn } from '../testCaseCounting.js';

export const testsModified: SignalDefinition = {
  id: 'tests-modified',
  title: 'Tests modified',
  category: 'coverage',
  contribution: 'informational',
  defaultWeight: 0,
  confidence: 'high',
  whyItMatters:
    'Existing tests being touched is neutral on its own; it only matters combined with whether cases or assertions were added or removed.',
  whatItLooksFor:
    'Test files that were modified without a detected net change in test-case or assertion count.',
  qaResponse:
    'Read the diff. A modified test with no case/assertion change is often a refactor, but confirm it was not quietly weakened.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'test' || classification.file.status !== 'modified') continue;
      const churn = analyzeTestChurn(classification.file);
      const netCases = churn.addedCases - churn.removedCases;
      const netAssertions = churn.addedAssertions - churn.removedAssertions;
      if (netCases === 0 && netAssertions === 0) {
        affected.push(classification.file.path);
        evidence.push({ file: classification.file.path, description: 'Test file modified' });
      }
    }

    if (evidence.length === 0) return [];
    return [buildSignal(testsModified, 0, evidence, affected)];
  },
};
