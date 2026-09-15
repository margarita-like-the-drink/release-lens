import type { AnalysisResult, AnalysisSummary } from './domain/types.js';
import { loadConfig } from './config/load.js';
import { findRepositoryRoot } from './git/repository.js';
import { resolveComparison } from './git/comparison.js';
import { classifyFiles, summarizeAffectedAreas } from './classification/classify.js';
import { isIgnored } from './classification/fileRole.js';
import { detectSignals } from './signals/registry.js';
import { computeRisk } from './risk/model.js';
import { buildReasoning } from './risk/reasoning.js';
import { buildRecommendations } from './recommendations/index.js';

export const SCHEMA_VERSION = 1;

export interface AnalyzeOptions {
  cwd: string;
  base?: string;
  head?: string;
}

export function runAnalysis(options: AnalyzeOptions): AnalysisResult {
  const repoRoot = findRepositoryRoot(options.cwd);
  const { config, configPath, warnings: configWarnings } = loadConfig(repoRoot);
  const { comparison, notes: gitNotes } = resolveComparison(repoRoot, {
    base: options.base,
    head: options.head,
  });

  const files = comparison.files.filter((file) => !isIgnored(file.path, config));
  const classifications = classifyFiles(files, config);
  const orderedFiles = classifications.map((c) => c.file);

  const signals = detectSignals({
    repoRoot,
    comparison: { ...comparison, files: orderedFiles },
    classifications,
    config,
  });

  const risk = computeRisk(signals, config.risk.thresholds);
  const recommendations = buildRecommendations(signals);
  const affectedAreas = summarizeAffectedAreas(classifications);
  const summary = computeSummary(classifications);
  const reasoning = buildReasoning(signals, risk);

  const notes = [...gitNotes, ...configWarnings];
  if (!configPath) {
    notes.push('No .releaselens.yml found; using default critical paths and thresholds.');
  }
  const lowConfidenceSignals = signals.filter((s) => s.confidence === 'low');
  for (const signal of lowConfidenceSignals) {
    notes.push(
      `"${signal.title}" was detected with low confidence; verify manually before relying on it.`,
    );
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    comparison: { base: comparison.base, head: comparison.head },
    summary,
    affectedAreas,
    signals,
    risk,
    recommendations,
    reasoning,
    notes,
  };
}

function computeSummary(classifications: ReturnType<typeof classifyFiles>): AnalysisSummary {
  let productionFiles = 0;
  let testFiles = 0;
  let configFiles = 0;
  let otherFiles = 0;

  for (const classification of classifications) {
    switch (classification.role) {
      case 'production':
        productionFiles += 1;
        break;
      case 'test':
        testFiles += 1;
        break;
      case 'config':
      case 'dependency':
        configFiles += 1;
        break;
      default:
        otherFiles += 1;
    }
  }

  return {
    totalFiles: classifications.length,
    productionFiles,
    testFiles,
    configFiles,
    otherFiles,
  };
}
