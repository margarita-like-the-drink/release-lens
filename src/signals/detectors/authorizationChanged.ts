import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { fileMatches } from '../textScan.js';
import { AUTHORIZATION_PATTERNS } from '../keywords.js';

export const authorizationChanged: SignalDefinition = {
  id: 'authorization-changed',
  title: 'Authorization behavior changed',
  category: 'security',
  contribution: 'inherent',
  defaultWeight: 3,
  confidence: 'medium',
  whyItMatters:
    'Authorization decides what an authenticated user is allowed to do. A regression here can expose data or actions to users who should not have access.',
  whatItLooksFor:
    'Production files whose path or diff content mentions authorization checks: authorize, forbidden/403, guard, policy, or ability/can-style access checks.',
  qaResponse:
    'Test the access-control boundary directly: an authenticated user without permission, one with it, and a direct API call that bypasses the UI.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'production') continue;
      if (fileMatches(classification.file, AUTHORIZATION_PATTERNS)) {
        affected.push(classification.file.path);
        evidence.push({
          file: classification.file.path,
          description: 'Authorization-related code changed',
        });
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(authorizationChanged, ctx.config);
    return [buildSignal(authorizationChanged, weight, evidence, affected)];
  },
};
