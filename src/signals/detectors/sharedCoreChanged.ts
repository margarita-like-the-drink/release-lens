import { minimatch } from 'minimatch';
import type { DetectorContext, SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { addedLines, withoutExtension } from '../textScan.js';

const IMPORT_LINE_PATTERNS = [
  /from\s+['"]([^'"]+)['"]/,
  /require\(\s*['"]([^'"]+)['"]\s*\)/,
  /import\s+['"]([^'"]+)['"]/,
];

export const sharedCoreChanged: SignalDefinition = {
  id: 'shared-core-changed',
  title: 'Shared or core code changed',
  category: 'change-management',
  contribution: 'inherent',
  defaultWeight: 2,
  confidence: 'medium',
  whyItMatters:
    'Shared utilities and core modules tend to have a wide blast radius: a defect there can surface in features that this pull request never touches directly.',
  whatItLooksFor:
    'Files under a conventional shared location (lib/, utils/, common/, core/, shared/), or a file imported by at least two other files changed in the same pull request.',
  qaResponse:
    'Regression test other features known to depend on this module, not only the feature this pull request is nominally about.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    const importCounts = countImportReferences(ctx);

    for (const classification of ctx.classifications) {
      if (classification.role !== 'production') continue;
      const { file } = classification;
      const isSharedPath = ctx.config.sharedPaths.some((pattern) =>
        minimatch(file.path, pattern, { dot: true }),
      );
      const importedBy = importCounts.get(file.path) ?? 0;

      if (isSharedPath) {
        affected.push(file.path);
        evidence.push({ file: file.path, description: 'Matches a configured shared/core path' });
      } else if (importedBy >= 2) {
        affected.push(file.path);
        evidence.push({
          file: file.path,
          description: `Imported by ${importedBy} other files changed in this pull request`,
        });
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(sharedCoreChanged, ctx.config);
    return [buildSignal(sharedCoreChanged, weight, evidence, affected)];
  },
};

function countImportReferences(ctx: DetectorContext): Map<string, number> {
  const moduleNameToPath = new Map<string, string>();
  for (const classification of ctx.classifications) {
    if (classification.role === 'production') {
      moduleNameToPath.set(withoutExtension(classification.file.path), classification.file.path);
    }
  }

  const counts = new Map<string, number>();
  for (const classification of ctx.classifications) {
    for (const line of addedLines(classification.file)) {
      for (const pattern of IMPORT_LINE_PATTERNS) {
        const specifier = pattern.exec(line)?.[1];
        const moduleName = specifier?.split('/').pop();
        if (!moduleName) continue;
        const targetPath = moduleNameToPath.get(moduleName);
        if (targetPath && targetPath !== classification.file.path) {
          counts.set(targetPath, (counts.get(targetPath) ?? 0) + 1);
        }
      }
    }
  }
  return counts;
}
