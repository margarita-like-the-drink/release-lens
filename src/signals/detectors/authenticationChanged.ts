import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { fileMatches } from '../textScan.js';
import { AUTHENTICATION_PATTERNS } from '../keywords.js';

export const authenticationChanged: SignalDefinition = {
  id: 'authentication-changed',
  title: 'Authentication behavior changed',
  category: 'security',
  contribution: 'inherent',
  defaultWeight: 3,
  confidence: 'medium',
  whyItMatters:
    'Authentication changes affect every logged-in user. A regression here can lock users out or, worse, let them in when it should not.',
  whatItLooksFor:
    'Production files whose path or diff content mentions login, session, credentials, tokens, or related keywords (login, session, password, jwt, oauth, mfa, sso).',
  qaResponse:
    'Verify login, logout, session expiration, and token handling explicitly rather than assuming they were exercised incidentally by other tests.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'production') continue;
      if (fileMatches(classification.file, AUTHENTICATION_PATTERNS)) {
        affected.push(classification.file.path);
        evidence.push({
          file: classification.file.path,
          description: 'Authentication-related code changed',
        });
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(authenticationChanged, ctx.config);
    return [buildSignal(authenticationChanged, weight, evidence, affected)];
  },
};
