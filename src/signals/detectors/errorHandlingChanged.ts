import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { changedLines, countMatches } from '../textScan.js';
import { ERROR_HANDLING_PATTERNS } from '../keywords.js';

const MIN_MATCHES = 2;

export const errorHandlingChanged: SignalDefinition = {
  id: 'error-handling-changed',
  title: 'Error handling changed',
  category: 'reliability',
  contribution: 'inherent',
  defaultWeight: 1,
  confidence: 'low',
  whyItMatters:
    'Error handling is exercised only when something goes wrong, so it is disproportionately likely to be undertested relative to the happy path.',
  whatItLooksFor:
    'Two or more changed lines matching try/catch, throw, except, rescue, or raise. This is a broad heuristic and the weakest-confidence signal ReleaseLens reports.',
  qaResponse:
    'Trigger the actual failure condition rather than only reviewing the catch block, to confirm the handler is reached and behaves as intended.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'production') continue;
      const matches = countMatches(changedLines(classification.file), combined());
      if (matches >= MIN_MATCHES) {
        affected.push(classification.file.path);
        evidence.push({
          file: classification.file.path,
          description: `${matches} error-handling line(s) changed`,
        });
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(errorHandlingChanged, ctx.config);
    return [buildSignal(errorHandlingChanged, weight, evidence, affected)];
  },
};

function combined(): RegExp {
  return new RegExp(ERROR_HANDLING_PATTERNS.map((p) => p.source).join('|'));
}
