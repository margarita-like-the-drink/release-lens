import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';

export const configurationChanged: SignalDefinition = {
  id: 'configuration-changed',
  title: 'Environment or configuration changed',
  category: 'change-management',
  contribution: 'inherent',
  defaultWeight: 1,
  confidence: 'medium',
  whyItMatters:
    'Configuration changes often are not covered by automated tests at all, and a bad value can affect an entire environment rather than one code path.',
  whatItLooksFor:
    'Changed files classified as configuration: YAML/TOML/INI files, Dockerfiles, CI workflow files, and similar, excluding test and dependency files.',
  qaResponse:
    'Verify the application starts and behaves correctly in a staging-like environment with the new value, and check behavior if the value is missing.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'config') continue;
      affected.push(classification.file.path);
      evidence.push({ file: classification.file.path, description: 'Configuration file changed' });
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(configurationChanged, ctx.config);
    return [buildSignal(configurationChanged, weight, evidence, affected)];
  },
};
