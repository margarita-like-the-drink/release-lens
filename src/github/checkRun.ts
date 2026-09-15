import type { AnalysisResult, RiskLevel } from '../domain/types.js';
import { renderMarkdownReport } from '../reporters/markdown.js';
import { levelMeetsOrExceeds } from '../risk/model.js';

export interface CheckRunPayload {
  name: string;
  head_sha: string;
  status: 'completed';
  conclusion: 'success' | 'neutral' | 'failure';
  output: { title: string; summary: string };
}

/**
 * Builds a GitHub Check Run reflecting the risk level. Without `failOn`,
 * the check is always `neutral` - visible, but never blocks a merge on its
 * own. With `failOn`, it becomes a real pass/fail gate, matching
 * `analyze --fail-on`'s semantics so the two never disagree.
 */
export function buildCheckRun(
  result: AnalysisResult,
  headSha: string,
  failOn?: RiskLevel,
): CheckRunPayload {
  const conclusion = failOn
    ? levelMeetsOrExceeds(result.risk.level, failOn)
      ? 'failure'
      : 'success'
    : 'neutral';

  return {
    name: 'ReleaseLens',
    head_sha: headSha,
    status: 'completed',
    conclusion,
    output: {
      title: `${result.risk.level.toUpperCase()} · ${result.risk.score} points`,
      summary: renderMarkdownReport(result),
    },
  };
}
