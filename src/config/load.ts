import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import type { CriticalPathConfig, FeatureMapping, ResolvedConfig } from './schema.js';
import { defaultConfig } from './schema.js';

export interface ConfigLoadResult {
  config: ResolvedConfig;
  configPath: string | null;
  warnings: string[];
}

const CONFIG_FILENAME = '.releaselens.yml';

/**
 * Loads `.releaselens.yml` from the repository root when present.
 *
 * Invalid or malformed configuration never throws: unrecognized or badly
 * shaped entries are skipped with a warning and ReleaseLens falls back to
 * defaults for that section, since a broken config file should never block
 * an analysis a QA engineer is trying to run right now.
 */
export function loadConfig(repoRoot: string): ConfigLoadResult {
  const config = defaultConfig();
  const warnings: string[] = [];
  const configPath = join(repoRoot, CONFIG_FILENAME);

  if (!existsSync(configPath)) {
    return { config, configPath: null, warnings };
  }

  let raw: unknown;
  try {
    const text = readFileSync(configPath, 'utf8');
    raw = parseYaml(text);
  } catch (error) {
    warnings.push(
      `Could not parse ${CONFIG_FILENAME} (${(error as Error).message}). Using default configuration.`,
    );
    return { config, configPath, warnings };
  }

  if (raw === null || raw === undefined) {
    return { config, configPath, warnings };
  }

  if (typeof raw !== 'object' || Array.isArray(raw)) {
    warnings.push(`${CONFIG_FILENAME} must contain a YAML mapping. Using default configuration.`);
    return { config, configPath, warnings };
  }

  const doc = raw as Record<string, unknown>;

  applyCriticalPaths(doc, config, warnings);
  applyStringArray(doc, 'testPatterns', config.testPatterns, warnings);
  applyStringArray(doc, 'ignore', config.ignore, warnings);
  applyStringArray(doc, 'sharedPaths', config.sharedPaths, warnings);
  applyFeatureMappings(doc, config, warnings);
  applyRisk(doc, config, warnings);

  return { config, configPath, warnings };
}

function applyCriticalPaths(
  doc: Record<string, unknown>,
  config: ResolvedConfig,
  warnings: string[],
): void {
  const value = doc.criticalPaths;
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    warnings.push('criticalPaths must be a list. Ignoring critical path configuration.');
    return;
  }

  const result: CriticalPathConfig[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      warnings.push(`criticalPaths[${index}] is not a mapping. Skipping.`);
      return;
    }
    const item = entry as Record<string, unknown>;
    const path = item.path;
    const name = item.name;
    const risk = item.risk;
    if (typeof path !== 'string' || path.length === 0) {
      warnings.push(`criticalPaths[${index}].path must be a non-empty string. Skipping.`);
      return;
    }
    if (typeof name !== 'string' || name.length === 0) {
      warnings.push(`criticalPaths[${index}].name must be a non-empty string. Skipping.`);
      return;
    }
    const resolvedRisk = typeof risk === 'number' && Number.isFinite(risk) ? risk : 3;
    if (risk !== undefined && typeof risk !== 'number') {
      warnings.push(`criticalPaths[${index}].risk must be a number. Using default of 3.`);
    }
    result.push({ path, name, risk: resolvedRisk });
  });

  if (result.length > 0) {
    config.criticalPaths = result;
  }
}

function applyStringArray(
  doc: Record<string, unknown>,
  key: 'testPatterns' | 'ignore' | 'sharedPaths',
  fallback: string[],
  warnings: string[],
): void {
  const value = doc[key];
  if (value === undefined) return;
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === 'string')) {
    warnings.push(`${key} must be a list of strings. Using default ${key}.`);
    return;
  }
  fallback.length = 0;
  fallback.push(...(value as string[]));
}

function applyFeatureMappings(
  doc: Record<string, unknown>,
  config: ResolvedConfig,
  warnings: string[],
): void {
  const value = doc.featureMappings;
  if (value === undefined) return;
  if (!Array.isArray(value)) {
    warnings.push('featureMappings must be a list. Ignoring.');
    return;
  }

  const result: FeatureMapping[] = [];
  value.forEach((entry, index) => {
    if (typeof entry !== 'object' || entry === null) {
      warnings.push(`featureMappings[${index}] is not a mapping. Skipping.`);
      return;
    }
    const item = entry as Record<string, unknown>;
    const production = item.production;
    const tests = item.tests;
    if (typeof production !== 'string' || production.length === 0) {
      warnings.push(`featureMappings[${index}].production must be a non-empty string. Skipping.`);
      return;
    }
    if (!Array.isArray(tests) || !tests.every((t) => typeof t === 'string')) {
      warnings.push(`featureMappings[${index}].tests must be a list of strings. Skipping.`);
      return;
    }
    result.push({ production, tests: tests as string[] });
  });

  config.featureMappings = result;
}

function applyRisk(doc: Record<string, unknown>, config: ResolvedConfig, warnings: string[]): void {
  const value = doc.risk;
  if (value === undefined) return;
  if (typeof value !== 'object' || value === null) {
    warnings.push('risk must be a mapping. Using default risk configuration.');
    return;
  }
  const risk = value as Record<string, unknown>;

  if (risk.largeChangeThreshold !== undefined) {
    if (typeof risk.largeChangeThreshold === 'number' && risk.largeChangeThreshold > 0) {
      config.risk.largeChangeThreshold = risk.largeChangeThreshold;
    } else {
      warnings.push('risk.largeChangeThreshold must be a positive number. Using default.');
    }
  }

  if (risk.thresholds !== undefined) {
    if (typeof risk.thresholds === 'object' && risk.thresholds !== null) {
      const thresholds = risk.thresholds as Record<string, unknown>;
      for (const key of ['moderate', 'high', 'critical'] as const) {
        const entry = thresholds[key];
        if (entry !== undefined) {
          if (typeof entry === 'number') {
            config.risk.thresholds[key] = entry;
          } else {
            warnings.push(`risk.thresholds.${key} must be a number. Using default.`);
          }
        }
      }
    } else {
      warnings.push('risk.thresholds must be a mapping. Using default thresholds.');
    }
  }

  if (risk.weightOverrides !== undefined) {
    if (typeof risk.weightOverrides === 'object' && risk.weightOverrides !== null) {
      const overrides = risk.weightOverrides as Record<string, unknown>;
      for (const [signalId, weight] of Object.entries(overrides)) {
        if (typeof weight === 'number') {
          config.risk.weightOverrides[signalId] = weight;
        } else {
          warnings.push(`risk.weightOverrides.${signalId} must be a number. Skipping.`);
        }
      }
    } else {
      warnings.push('risk.weightOverrides must be a mapping. Ignoring.');
    }
  }
}
