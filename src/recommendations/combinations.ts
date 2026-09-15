import type { Signal } from '../domain/types.js';
import type { RawRecommendation } from './catalog.js';

export interface CombinationRule {
  id: string;
  /** Signal ids that must all be present for this rule to fire. */
  requires: string[];
  generate: (signals: Signal[]) => RawRecommendation[];
}

/**
 * Recommendations that only make sense when two or more signals fire
 * together. A payment change and a database migration each carry their own
 * recommendations individually, but the combination raises a specific
 * question - data consistency across the two - that neither raises alone.
 */
export const COMBINATION_RULES: CombinationRule[] = [
  {
    id: 'payment-and-migration',
    requires: ['payment-logic-changed', 'database-migration-changed'],
    generate: () => [
      {
        category: 'data-integrity',
        text: 'Verify payment state remains consistent if the process fails after updating the database but before confirming the outcome with the payment provider.',
      },
      {
        category: 'data-integrity',
        text: 'Verify payment state remains consistent if the process fails after confirming the outcome with the payment provider but before the database update completes.',
      },
    ],
  },
  {
    id: 'payment-and-authentication',
    requires: ['payment-logic-changed', 'authentication-changed'],
    generate: () => [
      {
        category: 'exploratory',
        text: 'Verify a session expiring specifically during the payment or checkout flow does not leave a payment in an ambiguous state.',
      },
    ],
  },
];

export function applicableCombinations(signals: Signal[]): CombinationRule[] {
  const presentIds = new Set(signals.map((s) => s.id));
  return COMBINATION_RULES.filter((rule) => rule.requires.every((id) => presentIds.has(id)));
}
