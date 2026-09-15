import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { fileMatches } from '../textScan.js';
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
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'production') continue;
      if (fileMatches(classification.file, PERMISSION_ROLE_PATTERNS)) {
        affected.push(classification.file.path);
        evidence.push({
          file: classification.file.path,
          description: 'Role/permission logic changed',
        });
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(permissionRoleChanged, ctx.config);
    return [buildSignal(permissionRoleChanged, weight, evidence, affected)];
  },
};
