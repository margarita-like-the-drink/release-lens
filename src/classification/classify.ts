import type { AffectedArea, ChangedFile, FileClassification } from '../domain/types.js';
import type { ResolvedConfig } from '../config/schema.js';
import { classifyFileRole, isMigrationFile } from './fileRole.js';
import { detectLanguage } from './language.js';
import { deriveGenericArea, matchCriticalPaths } from './areas.js';

export function classifyFile(file: ChangedFile, config: ResolvedConfig): FileClassification {
  const role = classifyFileRole(file, config);
  const language = detectLanguage(file.path);
  const criticalPaths = matchCriticalPaths(file.path, config.criticalPaths).map((cp) => ({
    name: cp.name,
    pattern: cp.path,
    risk: cp.risk,
  }));
  const area =
    criticalPaths.length > 0 ? criticalPaths[0]!.name.toLowerCase() : deriveGenericArea(file.path);

  return {
    file,
    role,
    language,
    isMigration: isMigrationFile(file.path),
    area,
    criticalPaths,
  };
}

const ROLE_PRIORITY: Record<FileClassification['role'], number> = {
  production: 0,
  test: 2,
  dependency: 3,
  config: 4,
  style: 5,
  asset: 6,
  documentation: 7,
  unknown: 8,
};

/**
 * Classifies and orders changed files so that, when a signal touches several
 * files, the most representative one (a non-migration production file, say)
 * sorts first and is what evidence and reports show by default.
 */
export function classifyFiles(files: ChangedFile[], config: ResolvedConfig): FileClassification[] {
  return files
    .map((file) => classifyFile(file, config))
    .sort((a, b) => {
      const priorityA =
        ROLE_PRIORITY[a.role] + (a.role === 'production' && a.isMigration ? 0.5 : 0);
      const priorityB =
        ROLE_PRIORITY[b.role] + (b.role === 'production' && b.isMigration ? 0.5 : 0);
      return priorityA - priorityB || a.file.path.localeCompare(b.file.path);
    });
}

export function summarizeAffectedAreas(classifications: FileClassification[]): AffectedArea[] {
  const byArea = new Map<string, string[]>();

  for (const classification of classifications) {
    if (!classification.area) continue;
    if (classification.role === 'documentation' || classification.role === 'asset') continue;
    const files = byArea.get(classification.area) ?? [];
    files.push(classification.file.path);
    byArea.set(classification.area, files);
  }

  return Array.from(byArea.entries())
    .map(([name, files]) => ({ name, files }))
    .sort((a, b) => b.files.length - a.files.length || a.name.localeCompare(b.name));
}
