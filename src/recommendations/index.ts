import type { Recommendation, RecommendationCategory, Signal } from '../domain/types.js';
import { RECOMMENDATION_GENERATORS } from './catalog.js';
import { applicableCombinations } from './combinations.js';

interface PendingRecommendation {
  category: RecommendationCategory;
  text: string;
  signalIds: Set<string>;
  priority: number;
}

const CATEGORY_ORDER: RecommendationCategory[] = [
  'smoke',
  'regression',
  'negative',
  'boundary',
  'exploratory',
  'api',
  'data-integrity',
  'permissions',
  'security',
  'accessibility',
  'cross-browser',
  'responsive',
  'performance',
];

export function buildRecommendations(signals: Signal[]): Recommendation[] {
  const pending = new Map<string, PendingRecommendation>();

  const addRaw = (
    category: RecommendationCategory,
    text: string,
    signalIds: string[],
    priority: number,
  ): void => {
    const existing = pending.get(text);
    if (existing) {
      signalIds.forEach((id) => existing.signalIds.add(id));
      existing.priority = Math.max(existing.priority, priority);
      return;
    }
    pending.set(text, { category, text, signalIds: new Set(signalIds), priority });
  };

  for (const signal of signals) {
    const generator = RECOMMENDATION_GENERATORS[signal.id];
    if (!generator) continue;
    for (const raw of generator(signal)) {
      addRaw(raw.category, raw.text, [signal.id], signal.weight);
    }
  }

  for (const rule of applicableCombinations(signals)) {
    const involved = signals.filter((s) => rule.requires.includes(s.id));
    const priority = Math.max(...involved.map((s) => s.weight));
    for (const raw of rule.generate(signals)) {
      addRaw(
        raw.category,
        raw.text,
        involved.map((s) => s.id),
        priority,
      );
    }
  }

  const grouped = new Map<RecommendationCategory, PendingRecommendation[]>();
  for (const rec of pending.values()) {
    const list = grouped.get(rec.category) ?? [];
    list.push(rec);
    grouped.set(rec.category, list);
  }

  const categoryPriority = (category: RecommendationCategory): number =>
    Math.max(0, ...(grouped.get(category)?.map((r) => r.priority) ?? [0]));

  const orderedCategories = CATEGORY_ORDER.filter((category) => grouped.has(category)).sort(
    (a, b) => categoryPriority(b) - categoryPriority(a),
  );

  const recommendations: Recommendation[] = [];
  for (const category of orderedCategories) {
    const items = (grouped.get(category) ?? []).sort((a, b) => b.priority - a.priority);
    items.forEach((item, index) => {
      recommendations.push({
        id: `${category}-${index + 1}`,
        category: item.category,
        text: item.text,
        rationale: buildRationale(item.signalIds, signals),
        signalIds: Array.from(item.signalIds),
        priority: item.priority,
      });
    });
  }

  return recommendations;
}

function buildRationale(signalIds: Set<string>, signals: Signal[]): string {
  const relevant = signals.filter((s) => signalIds.has(s.id));
  const parts = relevant.map((signal) => {
    const evidence = signal.evidence[0];
    return evidence ? `${signal.title} (${evidence.file})` : signal.title;
  });
  return parts.join('; ');
}
