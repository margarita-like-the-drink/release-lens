import type { Signal, SignalEvidence } from '../domain/types.js';
import type { SignalDefinition } from './types.js';

export function buildSignal(
  definition: SignalDefinition,
  weight: number,
  evidence: SignalEvidence[],
  affectedFiles: string[],
  explanation?: string,
  titleOverride?: string,
): Signal {
  return {
    id: definition.id,
    title: titleOverride ?? definition.title,
    category: definition.category,
    contribution: definition.contribution,
    weight,
    confidence: definition.confidence,
    explanation: explanation ?? definition.whyItMatters,
    evidence,
    affectedFiles,
  };
}
