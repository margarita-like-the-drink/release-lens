import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { detectByKeywords } from '../keywordDetector.js';
import { VALIDATION_PATTERNS } from '../keywords.js';

export const validationLogicChanged: SignalDefinition = {
  id: 'validation-logic-changed',
  title: 'Validation logic changed',
  category: 'reliability',
  contribution: 'inherent',
  defaultWeight: 2,
  confidence: 'medium',
  whyItMatters:
    'Validation rules define what input the system accepts. Loosening them can let bad data through; tightening them can reject previously valid input.',
  whatItLooksFor:
    'Production files whose path or diff content mentions validate/validation, sanitize, or a schema-validation call (Joi, Zod).',
  qaResponse:
    'Test the boundaries directly: minimum, maximum, one below and above each boundary, decimals, null, empty, and malformed input.',
  detect: (ctx) => {
    const { evidence, affected } = detectByKeywords(
      ctx,
      VALIDATION_PATTERNS,
      'Validation logic changed',
    );
    if (evidence.length === 0) return [];
    const weight = resolveWeight(validationLogicChanged, ctx.config);
    return [buildSignal(validationLogicChanged, weight, evidence, affected)];
  },
};
