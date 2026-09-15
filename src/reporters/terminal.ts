import type { AnalysisResult, Recommendation, RecommendationCategory } from '../domain/types.js';
import { CATEGORY_LABELS, DIVIDER, RISK_LEVEL_LABELS } from './shared.js';

export function renderTerminalReport(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push('ReleaseLens');
  lines.push(DIVIDER);
  lines.push('');
  lines.push('Comparing:');
  lines.push(`${result.comparison.head} → ${result.comparison.base}`);
  lines.push('');

  if (result.summary.totalFiles === 0) {
    if (!result.notes.includes('No changes were found to analyze.')) {
      lines.push('No changes were found to analyze.');
    }
    appendNotes(lines, result.notes);
    return lines.join('\n');
  }

  lines.push(`${result.summary.totalFiles} files changed`);
  lines.push(`${result.summary.productionFiles} production files`);
  lines.push(`${result.summary.testFiles} test files`);
  lines.push(`${result.summary.configFiles} configuration files`);
  lines.push('');

  if (result.affectedAreas.length > 0) {
    lines.push('Affected areas');
    for (const area of result.affectedAreas) {
      lines.push(area.name);
    }
    lines.push('');
  }

  lines.push('Release Risk');
  lines.push(`${RISK_LEVEL_LABELS[result.risk.level]} · ${result.risk.score} points`);
  lines.push('');

  if (result.risk.breakdown.length > 0) {
    lines.push('Why');
    lines.push('');
    for (const entry of result.risk.breakdown) {
      const sign = entry.points >= 0 ? '+' : '';
      lines.push(`${sign}${entry.points} ${entry.title}`);
      const signal = result.signals.find((s) => s.id === entry.signalId);
      const file = signal?.evidence[0]?.file;
      if (file) lines.push(file);
      lines.push('');
    }
  }

  if (result.recommendations.length > 0) {
    lines.push('QA Focus');
    lines.push('');
    for (const [category, items] of groupByCategory(result.recommendations)) {
      lines.push(CATEGORY_LABELS[category]);
      for (const item of items) {
        lines.push(`□ ${item.text}`);
      }
      lines.push('');
    }
  }

  lines.push('Reasoning');
  lines.push('');
  lines.push(result.reasoning);

  appendNotes(lines, result.notes);

  lines.push('');
  lines.push(DIVIDER);

  return lines.join('\n');
}

function appendNotes(lines: string[], notes: string[]): void {
  if (notes.length === 0) return;
  lines.push('');
  lines.push('Notes');
  lines.push('');
  for (const note of notes) {
    lines.push(`- ${note}`);
  }
}

function groupByCategory(
  recommendations: Recommendation[],
): [RecommendationCategory, Recommendation[]][] {
  const seen = new Map<RecommendationCategory, Recommendation[]>();
  for (const rec of recommendations) {
    const list = seen.get(rec.category) ?? [];
    list.push(rec);
    seen.set(rec.category, list);
  }
  return Array.from(seen.entries());
}
