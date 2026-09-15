import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';

export const largeChangeSurface: SignalDefinition = {
  id: 'large-change-surface',
  title: 'Large change surface',
  category: 'change-management',
  contribution: 'inherent',
  defaultWeight: 2,
  confidence: 'high',
  whyItMatters:
    'Larger diffs are statistically more likely to contain an interaction the author did not anticipate, independent of what the change is about.',
  whatItLooksFor:
    'Total added and deleted lines across all changed files exceeding a configurable threshold (default 500, via risk.largeChangeThreshold).',
  qaResponse:
    'Run the full regression suite for the affected area rather than a narrow, targeted subset, and budget proportionally more exploratory testing time.',
  detect: (ctx) => {
    const totalLines = ctx.comparison.files.reduce(
      (sum, file) => sum + file.additions + file.deletions,
      0,
    );
    const threshold = ctx.config.risk.largeChangeThreshold;
    if (totalLines < threshold) return [];

    return [
      buildSignal(
        largeChangeSurface,
        resolveWeight(largeChangeSurface, ctx.config),
        [
          {
            file: ctx.comparison.files[0]?.path ?? '(multiple files)',
            description: `${totalLines} lines changed across ${ctx.comparison.files.length} file(s), exceeding the ${threshold}-line threshold`,
          },
        ],
        ctx.comparison.files.map((f) => f.path),
      ),
    ];
  },
};
