import type { RiskAssessment, RiskBreakdownEntry, RiskLevel, Signal } from '../domain/types.js';
import type { RiskThresholds } from '../config/schema.js';

/**
 * Computes the risk assessment from fired signals.
 *
 * Mitigation only offsets coverage risk, never inherent risk: additional
 * tests are evidence the change is better protected, not evidence that the
 * underlying business risk is lower. A payment change with ten new tests is
 * still a payment change.
 */
export function computeRisk(signals: Signal[], thresholds: RiskThresholds): RiskAssessment {
  const inherentRisk = sumBy(signals, 'inherent');
  const coverageRisk = sumBy(signals, 'coverage');
  const mitigation = sumBy(signals, 'mitigation');

  const netCoverageRisk = Math.max(0, coverageRisk - mitigation);
  const score = inherentRisk + netCoverageRisk;

  const breakdown = buildBreakdown(signals);

  return {
    inherentRisk,
    coverageRisk,
    mitigation,
    score,
    level: classifyLevel(score, thresholds),
    breakdown,
  };
}

function sumBy(signals: Signal[], contribution: Signal['contribution']): number {
  return signals
    .filter((signal) => signal.contribution === contribution)
    .reduce((sum, signal) => sum + signal.weight, 0);
}

function buildBreakdown(signals: Signal[]): RiskBreakdownEntry[] {
  return signals
    .filter((signal) => signal.contribution !== 'informational' && signal.weight !== 0)
    .map((signal) => ({
      signalId: signal.id,
      title: signal.title,
      contribution: signal.contribution,
      points: signal.contribution === 'mitigation' ? -signal.weight : signal.weight,
    }))
    .sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
}

export function classifyLevel(score: number, thresholds: RiskThresholds): RiskLevel {
  if (score >= thresholds.critical) return 'critical';
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.moderate) return 'moderate';
  return 'low';
}
