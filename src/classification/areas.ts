import { minimatch } from 'minimatch';
import type { CriticalPathConfig } from '../config/schema.js';

const ROOT_SEGMENTS = new Set([
  'src',
  'app',
  'apps',
  'lib',
  'libs',
  'packages',
  'services',
  'cmd',
  'pkg',
  'internal',
  'test',
  'tests',
  '__tests__',
  'spec',
  'source',
]);

const TEST_SUFFIX_RE = /\.(spec|test)$/;

export function matchCriticalPaths(
  path: string,
  criticalPaths: CriticalPathConfig[],
): CriticalPathConfig[] {
  return criticalPaths.filter((cp) => minimatch(path, cp.path, { dot: true }));
}

/**
 * Derives a human-readable "area" from a file path when no critical path
 * configuration claims it, e.g. `src/payments/retry.ts` -> `payments`.
 * This is a display heuristic, not a risk signal on its own.
 */
export function deriveGenericArea(path: string): string | null {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  let working = segments;
  while (working.length > 1 && ROOT_SEGMENTS.has(working[0]!.toLowerCase())) {
    working = working.slice(1);
  }

  if (working.length === 0) return null;

  let area: string | null;
  if (working.length === 1) {
    const withoutExt = working[0]!.replace(/\.[A-Za-z0-9]+$/, '');
    const base = withoutExt.replace(TEST_SUFFIX_RE, '');
    area = base.length > 0 ? base.toLowerCase() : null;
  } else {
    area = working[0]!.toLowerCase();
  }

  return area ? normalizePlural(area) : null;
}

/** Merges trivial singular/plural naming differences (payments/payment) into one area label. */
function normalizePlural(area: string): string {
  return area.length > 4 && area.endsWith('s') ? area.slice(0, -1) : area;
}
