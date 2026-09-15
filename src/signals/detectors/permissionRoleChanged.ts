import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { detectByKeywords } from '../keywordDetector.js';
import { PERMISSION_ROLE_PATTERNS } from '../keywords.js';

export const permissionRoleChanged: SignalDefinition = {
  id: 'permission-role-changed',
  title: 'Permission or role logic changed',
  category: 'security',
  contribution: 'inherent',
  defaultWeight: 3,
  confidence: 'medium',
  whyItMatters:
    'Changes to the role or permission model itself (as opposed to a single authorization check) can shift access for many users at once.',
  whatItLooksFor:
    'Production files whose path or diff content mentions role, permission, privilege, scope, grant, RBAC, or ACL.',
  qaResponse:
    'Verify each affected role still has exactly the intended permissions, and check the boundary case of a user whose role just changed.',
  detect: (ctx) => {
    const { evidence, affected } = detectByKeywords(
      ctx,
      PERMISSION_ROLE_PATTERNS,
      'Role/permission logic changed',
    );
    if (evidence.length === 0) return [];
    const weight = resolveWeight(permissionRoleChanged, ctx.config);
    return [buildSignal(permissionRoleChanged, weight, evidence, affected)];
  },
};
