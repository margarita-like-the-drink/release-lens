import type {
  Comparison,
  FileClassification,
  RiskContribution,
  Signal,
  SignalCategory,
  SignalConfidence,
} from '../domain/types.js';
import type { ResolvedConfig } from '../config/schema.js';

export interface DetectorContext {
  repoRoot: string;
  comparison: Comparison;
  classifications: FileClassification[];
  config: ResolvedConfig;
}

export type SignalDetector = (ctx: DetectorContext) => Signal[];

/**
 * A signal's full definition: metadata used by both detection and the
 * `explain` command, plus the detector function itself. Keeping metadata and
 * detection together means `release-lens explain <signal>` can never drift
 * out of sync with what the detector actually does.
 */
export interface SignalDefinition {
  id: string;
  title: string;
  category: SignalCategory;
  contribution: RiskContribution;
  defaultWeight: number;
  confidence: SignalConfidence;
  /** Shown by `explain <signal>` under "Why it matters". */
  whyItMatters: string;
  /** Shown by `explain <signal>` under "What ReleaseLens looks for". */
  whatItLooksFor: string;
  /** Shown by `explain <signal>` under "Possible QA response". */
  qaResponse: string;
  detect: SignalDetector;
}

export function resolveWeight(definition: SignalDefinition, config: ResolvedConfig): number {
  return config.risk.weightOverrides[definition.id] ?? definition.defaultWeight;
}
