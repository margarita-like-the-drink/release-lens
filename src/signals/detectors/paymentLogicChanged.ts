import type { SignalEvidence } from '../../domain/types.js';
import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { changedLines, fileMatches, anyMatch, findFirstMatchingLine } from '../textScan.js';
import { PAYMENT_PATTERNS, RETRY_PATTERNS } from '../keywords.js';

export const paymentLogicChanged: SignalDefinition = {
  id: 'payment-logic-changed',
  title: 'Payment processing changed',
  category: 'critical-path',
  contribution: 'inherent',
  defaultWeight: 4,
  confidence: 'medium',
  whyItMatters:
    'Payment defects have direct financial and trust consequences: failed charges, duplicate charges, or incorrect amounts.',
  whatItLooksFor:
    'Production files whose path or diff content mentions payment, charge, refund, billing, invoice, transaction, or a known provider (Stripe, PayPal).',
  qaResponse:
    'Exercise success, decline, timeout, and retry paths against a sandboxed provider, and confirm idempotency for anything that can be resubmitted.',
  detect: (ctx) => {
    const evidence: SignalEvidence[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'production') continue;
      if (fileMatches(classification.file, PAYMENT_PATTERNS)) {
        affected.push(classification.file.path);
        const isRetryRelated = anyMatch(changedLines(classification.file), RETRY_PATTERNS);
        const description = isRetryRelated
          ? 'Payment retry logic changed'
          : 'Payment processing changed';
        const line = findFirstMatchingLine(classification.file, PAYMENT_PATTERNS);
        evidence.push(
          line === undefined
            ? { file: classification.file.path, description }
            : { file: classification.file.path, description, line },
        );
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(paymentLogicChanged, ctx.config);
    return [buildSignal(paymentLogicChanged, weight, evidence, affected)];
  },
};
