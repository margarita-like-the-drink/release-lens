import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';

const MIN_AREAS = 3;

export const multiAreaChange: SignalDefinition = {
  id: 'multi-area-change',
  title: 'Changes spanning several application areas',
  category: 'change-management',
  contribution: 'inherent',
  defaultWeight: 2,
  confidence: 'medium',
  whyItMatters:
    'A change that spans several areas at once increases the chance of an interaction between areas that no single-area test would catch.',
  whatItLooksFor:
    'Production or test files spread across three or more distinct top-level areas, derived from directory structure or critical path configuration.',
  qaResponse:
    'Test the areas together, not only individually. Confirm the combination this pull request introduces actually works end to end.',
  detect: (ctx) => {
    const areas = new Set<string>();
    for (const classification of ctx.classifications) {
      if (classification.role === 'documentation' || classification.role === 'asset') continue;
      if (classification.area) areas.add(classification.area);
    }

    if (areas.size < MIN_AREAS) return [];

    const areaList = Array.from(areas).sort();
    const affected = ctx.classifications
      .filter((c) => c.area && areas.has(c.area))
      .map((c) => c.file.path);

    const weight = resolveWeight(multiAreaChange, ctx.config);
    return [
      buildSignal(
        multiAreaChange,
        weight,
        [
          {
            file: affected[0] ?? '(multiple files)',
            description: `Areas touched: ${areaList.join(', ')}`,
          },
        ],
        affected,
      ),
    ];
  },
};
