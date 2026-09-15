import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';

export const dependenciesChanged: SignalDefinition = {
  id: 'dependencies-changed',
  title: 'Dependencies changed',
  category: 'change-management',
  contribution: 'inherent',
  defaultWeight: 1,
  confidence: 'high',
  whyItMatters:
    'A dependency upgrade can change behavior anywhere it is used, including in ways unrelated to why it was upgraded.',
  whatItLooksFor:
    'Changes to a dependency manifest or lockfile (package.json, go.mod, Gemfile, requirements.txt, and similar).',
  qaResponse:
    'Confirm the application builds and starts cleanly, and check the dependency changelog for breaking changes relevant to how it is used here.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'dependency') continue;
      affected.push(classification.file.path);
      evidence.push({ file: classification.file.path, description: 'Dependency manifest changed' });
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(dependenciesChanged, ctx.config);
    return [buildSignal(dependenciesChanged, weight, evidence, affected)];
  },
};
