import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { fileMatches } from '../textScan.js';
import { DATETIME_PATTERNS } from '../keywords.js';

export const datetimeLogicChanged: SignalDefinition = {
  id: 'datetime-logic-changed',
  title: 'Date, time, or timezone-sensitive logic changed',
  category: 'reliability',
  contribution: 'inherent',
  defaultWeight: 2,
  confidence: 'medium',
  whyItMatters:
    'Date and time bugs frequently pass tests written in one timezone or on one day of the year, then fail for real users elsewhere or on a boundary date.',
  whatItLooksFor:
    'Production files whose path or diff content mentions timezone, UTC, daylight saving, or a date/time library call (moment, dayjs, cron).',
  qaResponse:
    'Test across a timezone different from the server, and across a boundary: midnight, month-end, year-end, and a daylight saving transition.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'production') continue;
      if (fileMatches(classification.file, DATETIME_PATTERNS)) {
        affected.push(classification.file.path);
        evidence.push({
          file: classification.file.path,
          description: 'Date/time-sensitive logic changed',
        });
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(datetimeLogicChanged, ctx.config);
    return [buildSignal(datetimeLogicChanged, weight, evidence, affected)];
  },
};
