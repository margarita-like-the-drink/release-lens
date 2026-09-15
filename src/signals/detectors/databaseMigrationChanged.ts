import type { SignalDefinition } from '../types.js';
import { resolveWeight } from '../types.js';
import { buildSignal } from '../build.js';

export const databaseMigrationChanged: SignalDefinition = {
  id: 'database-migration-changed',
  title: 'Database schema or migration changed',
  category: 'data',
  contribution: 'inherent',
  defaultWeight: 3,
  confidence: 'high',
  whyItMatters:
    'Schema changes are hard to roll back cleanly once applied to real data, and can interact badly with deployment ordering.',
  whatItLooksFor:
    'Files under a migrations/migrate directory, or named following common migration conventions (Flyway, Alembic, Rails, timestamped SQL).',
  qaResponse:
    'Verify the migration against production-like data, confirm the rollback path, and check behavior if application code deploys before or after the migration runs.',
  detect: (ctx) => {
    const evidence: { file: string; description: string }[] = [];
    const affected: string[] = [];

    for (const classification of ctx.classifications) {
      if (!classification.isMigration) continue;
      affected.push(classification.file.path);
      evidence.push({
        file: classification.file.path,
        description: 'Database migration file changed',
      });
    }

    if (evidence.length === 0) return [];
    const weight = resolveWeight(databaseMigrationChanged, ctx.config);
    return [buildSignal(databaseMigrationChanged, weight, evidence, affected)];
  },
};
