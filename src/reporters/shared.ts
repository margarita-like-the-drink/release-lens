import type { RecommendationCategory, RiskLevel } from '../domain/types.js';

export const RISK_LEVEL_LABELS: Record<RiskLevel, string> = {
  low: 'LOW',
  moderate: 'MODERATE',
  high: 'HIGH',
  critical: 'CRITICAL',
};

export const CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  smoke: 'Smoke',
  regression: 'Critical regression',
  negative: 'Negative testing',
  boundary: 'Boundary testing',
  exploratory: 'Exploratory',
  api: 'API',
  'data-integrity': 'Data integrity',
  permissions: 'Permissions',
  security: 'Security',
  accessibility: 'Accessibility',
  'cross-browser': 'Cross-browser',
  responsive: 'Responsive / mobile',
  performance: 'Performance',
};

export const DIVIDER = '─'.repeat(36);
