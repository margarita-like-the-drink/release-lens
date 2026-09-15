import type { AnalysisResult, Recommendation, RecommendationCategory } from '../domain/types.js';
import { CATEGORY_LABELS, RISK_LEVEL_LABELS } from './shared.js';

export function renderMarkdownReport(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push('# ReleaseLens');
  lines.push('');
  lines.push(`**Comparing:** \`${result.comparison.head}\` → \`${result.comparison.base}\``);
  lines.push('');

  if (result.summary.totalFiles === 0) {
    lines.push('No changes were found to analyze.');
    return lines.join('\n');
  }

  lines.push(
    `${result.summary.totalFiles} files changed · ${result.summary.productionFiles} production · ${result.summary.testFiles} test · ${result.summary.configFiles} configuration`,
  );
  lines.push('');

  if (result.affectedAreas.length > 0) {
    lines.push(`**Affected areas:** ${result.affectedAreas.map((a) => a.name).join(', ')}`);
    lines.push('');
  }

  lines.push(
    `## Release Risk: ${RISK_LEVEL_LABELS[result.risk.level]} · ${result.risk.score} points`,
  );
  lines.push('');
  lines.push(
    `Inherent: ${result.risk.inherentRisk} · Coverage: ${result.risk.coverageRisk} · Mitigation: ${result.risk.mitigation}`,
  );
  lines.push('');

  if (result.risk.breakdown.length > 0) {
    lines.push('### Why');
    lines.push('');
    for (const entry of result.risk.breakdown) {
      const sign = entry.points >= 0 ? '+' : '';
      const signal = result.signals.find((s) => s.id === entry.signalId);
      const file = signal?.evidence[0]?.file;
      lines.push(`- **${sign}${entry.points}** ${entry.title}${file ? ` — \`${file}\`` : ''}`);
    }
    lines.push('');
  }

  if (result.recommendations.length > 0) {
    lines.push('### QA Focus');
    lines.push('');
    for (const [category, items] of groupByCategory(result.recommendations)) {
      lines.push(`**${CATEGORY_LABELS[category]}**`);
      lines.push('');
      for (const item of items) {
        lines.push(`- [ ] ${item.text}`);
      }
      lines.push('');
    }
  }

  lines.push('### Reasoning');
  lines.push('');
  lines.push(result.reasoning);

  if (result.notes.length > 0) {
    lines.push('');
    lines.push('### Notes');
    lines.push('');
    for (const note of result.notes) {
      lines.push(`- ${note}`);
    }
  }

  return lines.join('\n');
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
