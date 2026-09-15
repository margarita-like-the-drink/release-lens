import type { RiskAssessment, Signal } from '../domain/types.js';

const COVERAGE_CLAUSES: Record<string, string> = {
  'production-without-tests': 'the new behavior has no corresponding automated test change',
  'tests-deleted': 'existing tests protecting related behavior were removed',
  'assertions-removed': 'existing assertions were weakened',
  'tests-skipped': 'newly added tests were skipped rather than run',
};

/**
 * Builds a short, deterministic explanation of why the risk score landed
 * where it did, from the two or three highest-weight signals. This is a
 * template over evidence already computed, not free-form generation - the
 * same inputs always produce the same sentence.
 */
export function buildReasoning(signals: Signal[], risk: RiskAssessment): string {
  const inherent = signals
    .filter((s) => s.contribution === 'inherent' && s.weight > 0)
    .sort((a, b) => b.weight - a.weight);

  const coverage = signals
    .filter((s) => s.contribution === 'coverage' && s.weight > 0)
    .sort((a, b) => b.weight - a.weight)[0];

  const inherentTitles = dedupeTitles(inherent).slice(0, 2);

  let clause: string;
  if (inherentTitles.length >= 2) {
    clause = `${lowerFirst(stripTrailingChanged(inherentTitles[0]!))} and ${lowerFirst(stripTrailingChanged(inherentTitles[1]!))} changed simultaneously`;
  } else if (inherentTitles.length === 1) {
    clause = `${inherentTitles[0]}`;
  } else {
    clause = 'This change did not trigger any inherent-risk signals';
  }

  const netCoverageRisk = risk.coverageRisk - risk.mitigation;
  if (coverage && netCoverageRisk > 0) {
    const coverageClause =
      COVERAGE_CLAUSES[coverage.id] ??
      'a coverage gap was detected without corresponding mitigation';
    return `${clause}, while ${coverageClause}.`;
  }

  if (inherentTitles.length === 0) {
    return `${clause}.`;
  }

  return `${clause}.`;
}

function dedupeTitles(signals: Signal[]): string[] {
  const seen = new Set<string>();
  const titles: string[] = [];
  for (const signal of signals) {
    if (seen.has(signal.title)) continue;
    seen.add(signal.title);
    titles.push(signal.title);
  }
  return titles;
}

function lowerFirst(text: string): string {
  return text.length === 0 ? text : text[0]!.toLowerCase() + text.slice(1);
}

function stripTrailingChanged(title: string): string {
  return title.replace(/\s+changed$/i, '');
}
