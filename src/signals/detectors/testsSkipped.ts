import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { analyzeTestChurn } from '../testCaseCounting.js';

export const testsSkipped: SignalDefinition = {
  id: 'tests-skipped',
  title: 'Tests skipped or disabled',
  category: 'coverage',
  contribution: 'coverage',
  defaultWeight: 2,
  confidence: 'high',
  whyItMatters:
    'A skipped test still exists but no longer protects anything. It is easy to forget about once merged.',
  whatItLooksFor:
    'Added skip/disable markers such as .skip(, xit(, @pytest.mark.skip, @Disabled, [Ignore], or t.Skip(.',
  qaResponse:
    'Confirm there is a tracked reason and owner for the skip. A skipped test in a change touching related production code is a specific risk, not a formality.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'test') continue;
      const churn = analyzeTestChurn(classification.file);
      if (churn.addedSkips > 0) {
        affected.push(classification.file.path);
        evidence.push({
          file: classification.file.path,
          description: `${churn.addedSkips} test(s) newly skipped or disabled`,
        });
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(testsSkipped, ctx.config);
    return [buildSignal(testsSkipped, weight, evidence, affected)];
  },
};
