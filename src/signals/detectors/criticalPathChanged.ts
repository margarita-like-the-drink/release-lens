import type { SignalDefinition } from '../types.js';
import { buildSignal } from '../build.js';
import type { Signal, SignalEvidence } from '../../domain/types.js';

export const criticalPathChanged: SignalDefinition = {
  id: 'critical-path-changed',
  title: 'Critical-path code changed',
  category: 'critical-path',
  contribution: 'inherent',
  defaultWeight: 3,
  confidence: 'high',
  whyItMatters:
    'Teams know their own highest-impact code better than any generic heuristic can. Configured critical paths let that knowledge drive the risk score directly.',
  whatItLooksFor:
    'Changed files matching a `criticalPaths` entry in .releaselens.yml. Without configuration, this signal never fires.',
  qaResponse:
    'Follow whatever review or test process your team has defined for this critical path, in addition to the recommendations below.',
  detect: (ctx) => {
    if (ctx.config.criticalPaths.length === 0) return [];

    const byName = new Map<string, { risk: number; pattern: string; files: Set<string> }>();

    for (const classification of ctx.classifications) {
      for (const match of classification.criticalPaths) {
        const entry = byName.get(match.name) ?? {
          risk: match.risk,
          pattern: match.pattern,
          files: new Set(),
        };
        entry.files.add(classification.file.path);
        byName.set(match.name, entry);
      }
    }

    if (byName.size === 0) return [];

    const signals: Signal[] = [];
    for (const [name, entry] of byName) {
      const evidence: SignalEvidence[] = Array.from(entry.files).map((file) => ({
        file,
        description: `${name} configured as a critical path`,
      }));
      signals.push(
        buildSignal(
          criticalPathChanged,
          entry.risk,
          evidence,
          Array.from(entry.files),
          `${name} is configured as a critical path in .releaselens.yml (pattern: ${entry.pattern}).`,
          `${name} critical path changed`,
        ),
      );
    }
    return signals;
  },
};
