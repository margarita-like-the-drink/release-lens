import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { detectByKeywords } from '../keywordDetector.js';
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
    const { evidence, affected } = detectByKeywords(
      ctx,
      AUTHENTICATION_PATTERNS,
      'Authentication-related code changed',
    );
    if (evidence.length === 0) return [];
    const weight = resolveWeight(authenticationChanged, ctx.config);
    return [buildSignal(authenticationChanged, weight, evidence, affected)];
  },
};
