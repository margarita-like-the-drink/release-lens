import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { findExistingUnrelatedTestFile, findRelatedChangedTestFiles } from '../coverageMapping.js';

export const productionWithoutTests: SignalDefinition = {
  id: 'production-without-tests',
  title: 'Production logic changed without corresponding tests',
  category: 'coverage',
  contribution: 'coverage',
  defaultWeight: 3,
  confidence: 'medium',
  whyItMatters:
    'When production behavior changes but no related test file changes, ReleaseLens cannot find evidence that the change is protected by automated tests.',
  whatItLooksFor:
    'A changed production file (excluding database migrations, which have no meaningful unit-test naming convention) with no changed test file matching it by naming convention, explicit feature mapping, or an import reference from a changed test file.',
  qaResponse:
    'Treat this as a prompt to look closer, not a verdict. Confirm manually whether coverage exists elsewhere, and consider adding a test or scoping manual verification.',
  detect: (ctx) => {
    const testClassifications = ctx.classifications.filter((c) => c.role === 'test');
    const changedPaths = new Set(ctx.classifications.map((c) => c.file.path));
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'production') continue;
      if (classification.file.status === 'deleted') continue;
      if (classification.isMigration) continue;

      const related = findRelatedChangedTestFiles(
        ctx.repoRoot,
        classification.file.path,
        testClassifications,
        ctx.config,
      );
      if (related.length > 0) continue;

      const existing = findExistingUnrelatedTestFile(
        ctx.repoRoot,
        classification.file.path,
        changedPaths,
      );

      affected.push(classification.file.path);
      evidence.push({
        file: classification.file.path,
        description: existing
          ? `Related test file ${existing} exists but was not modified in this change`
          : 'Potential coverage gap: no related test changes detected',
      });
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(productionWithoutTests, ctx.config);
    return [buildSignal(productionWithoutTests, weight, evidence, affected)];
  },
};
