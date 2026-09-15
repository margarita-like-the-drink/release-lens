import type { SignalEvidence } from '../../domain/types.js';
import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';
import { API_CONTRACT_PATH_PATTERNS } from '../keywords.js';
import { detectOptionalToRequiredFields } from '../contractAnalysis.js';
import { findFirstMatchingLine } from '../textScan.js';

export const apiContractChanged: SignalDefinition = {
  id: 'api-contract-changed',
  title: 'API contract or schema changed',
  category: 'change-management',
  contribution: 'inherent',
  defaultWeight: 3,
  confidence: 'medium',
  whyItMatters:
    'Contract changes can break consumers that were never touched by this pull request, including services or clients outside this repository.',
  whatItLooksFor:
    'Changes to OpenAPI/Swagger, Protobuf, GraphQL, or DTO/schema/contract files, and fields changed from optional to required in a TypeScript/JavaScript type.',
  qaResponse:
    'Verify existing consumers against the new contract, especially ones that relied on a field that is now required or removed.',
  detect: (ctx) => {
    const evidence: SignalEvidence[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (classification.role !== 'production') continue;
      const { file } = classification;
      const isContractPath = API_CONTRACT_PATH_PATTERNS.some((pattern) => pattern.test(file.path));
      const newlyRequiredFields = detectOptionalToRequiredFields(file);

      if (newlyRequiredFields.length > 0) {
        affected.push(file.path);
        const description = `Field(s) changed from optional to required: ${newlyRequiredFields.join(', ')}`;
        const fieldPattern = new RegExp(`\\b${newlyRequiredFields[0]}\\b\\s*:`);
        const line = findFirstMatchingLine(file, [fieldPattern]);
        evidence.push(
          line === undefined
            ? { file: file.path, description }
            : { file: file.path, description, line },
        );
      } else if (isContractPath) {
        affected.push(file.path);
        evidence.push({ file: file.path, description: 'Contract-related file changed' });
      }
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(apiContractChanged, ctx.config);
    return [buildSignal(apiContractChanged, weight, evidence, affected)];
  },
};
