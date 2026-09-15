import type { SignalEvidence } from '../../domain/types.js';
import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { anyMatch, changedLines, findFirstMatchingLine } from '../textScan.js';
import { API_ENDPOINT_CONTENT_PATTERNS, API_ENDPOINT_PATH_PATTERNS } from '../keywords.js';

export const apiEndpointChanged: SignalDefinition = {
  id: 'api-endpoint-changed',
  title: 'API endpoint or controller changed',
  category: 'change-management',
  contribution: 'inherent',
  defaultWeight: 2,
  confidence: 'medium',
  whyItMatters:
    'Endpoint and controller changes affect every client that calls them, including clients not exercised by this pull request.',
  whatItLooksFor:
    'Files under a controllers/routes/handlers/api directory, or diff content declaring a route (router.get, @GetMapping, [HttpPost], @app.route).',
  qaResponse:
    'Verify the success response is unchanged for existing callers, and that unauthenticated or malformed requests are still rejected correctly.',
  detect: (ctx) => {
    const evidence: SignalEvidence[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'production') continue;
      const { file } = classification;
      const pathMatch = API_ENDPOINT_PATH_PATTERNS.some((pattern) => pattern.test(file.path));
      const contentMatch = anyMatch(changedLines(file), API_ENDPOINT_CONTENT_PATTERNS);
      if (pathMatch || contentMatch) {
        affected.push(file.path);
        const description = 'API endpoint or controller changed';
        const line = findFirstMatchingLine(file, API_ENDPOINT_CONTENT_PATTERNS);
        evidence.push(
          line === undefined
            ? { file: file.path, description }
            : { file: file.path, description, line },
        );
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(apiEndpointChanged, ctx.config);
    return [buildSignal(apiEndpointChanged, weight, evidence, affected)];
  },
};
