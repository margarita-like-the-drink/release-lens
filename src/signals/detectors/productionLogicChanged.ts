import type { SignalDefinition } from '../types.js';
import { buildSignal } from '../build.js';

export const productionLogicChanged: SignalDefinition = {
  id: 'production-logic-changed',
  title: 'Production logic changed',
  category: 'change-management',
  contribution: 'informational',
  defaultWeight: 0,
  confidence: 'high',
  whyItMatters:
    'Establishes how much of this change touches code that runs in production, as distinct from tests, docs, or configuration.',
  whatItLooksFor:
    'Any changed file classified as production code: not a test, dependency manifest, documentation, or style file.',
  qaResponse:
    'Use as scoping context. A change with no production files rarely needs the same scrutiny as one that has several.',
  detect: (ctx) => {
    const files = ctx.classifications.filter((c) => c.role === 'production');
    if (files.length === 0) return [];
    return [
      buildSignal(
        productionLogicChanged,
        0,
        [{ file: files[0]!.file.path, description: `${files.length} production file(s) changed` }],
        files.map((c) => c.file.path),
      ),
    ];
  },
};
