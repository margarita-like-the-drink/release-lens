import type { AnalysisResult } from '../domain/types.js';

export function renderJsonReport(result: AnalysisResult): string {
  return JSON.stringify(result, null, 2);
}
