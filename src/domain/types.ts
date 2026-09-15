/**
 * Core domain types shared across the analysis pipeline:
 *
 *   git diff -> classification -> signals -> risk -> recommendations -> report
 *
 * Keeping these in one place makes the data flowing between stages explicit,
 * which is what lets every conclusion in a report trace back to evidence.
 */

export type ChangeStatus = 'added' | 'modified' | 'deleted' | 'renamed';

export type DiffLineType = 'add' | 'del' | 'context';

export interface DiffLine {
  type: DiffLineType;
  content: string;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface ChangedFile {
  path: string;
  previousPath?: string;
  status: ChangeStatus;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
  isBinary: boolean;
}

export interface Comparison {
  /** The ref/description used as the comparison baseline, for display purposes. */
  base: string;
  /** The ref/description used as the comparison target, for display purposes. */
  head: string;
  files: ChangedFile[];
}

export type FileRole =
  'production' | 'test' | 'config' | 'dependency' | 'documentation' | 'style' | 'asset' | 'unknown';

export interface AffectedArea {
  name: string;
  files: string[];
}

export interface MatchedCriticalPath {
  name: string;
  pattern: string;
  risk: number;
}

export interface FileClassification {
  file: ChangedFile;
  role: FileRole;
  language: string | null;
  isMigration: boolean;
  area: string | null;
  criticalPaths: MatchedCriticalPath[];
}

export type SignalCategory =
  'coverage' | 'critical-path' | 'security' | 'data' | 'change-management' | 'reliability';

export type SignalConfidence = 'high' | 'medium' | 'low';

/**
 * How a signal's weight participates in the risk score.
 *
 * `inherent`      - business/product risk introduced by the change itself.
 * `coverage`       - risk that automated tests may not protect the change.
 * `mitigation`     - evidence that reduces coverage risk (never inherent risk).
 * `informational` - useful context, does not affect the score.
 */
export type RiskContribution = 'inherent' | 'coverage' | 'mitigation' | 'informational';

export interface SignalEvidence {
  file: string;
  description: string;
}

export interface Signal {
  id: string;
  title: string;
  category: SignalCategory;
  contribution: RiskContribution;
  weight: number;
  confidence: SignalConfidence;
  explanation: string;
  evidence: SignalEvidence[];
  affectedFiles: string[];
}

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface RiskBreakdownEntry {
  signalId: string;
  title: string;
  contribution: RiskContribution;
  points: number;
}

export interface RiskAssessment {
  inherentRisk: number;
  coverageRisk: number;
  mitigation: number;
  score: number;
  level: RiskLevel;
  breakdown: RiskBreakdownEntry[];
}

export type RecommendationCategory =
  | 'smoke'
  | 'regression'
  | 'negative'
  | 'boundary'
  | 'exploratory'
  | 'api'
  | 'data-integrity'
  | 'permissions'
  | 'accessibility'
  | 'cross-browser'
  | 'responsive'
  | 'performance'
  | 'security';

export interface Recommendation {
  id: string;
  category: RecommendationCategory;
  text: string;
  rationale: string;
  signalIds: string[];
  priority: number;
}

export interface AnalysisSummary {
  totalFiles: number;
  productionFiles: number;
  testFiles: number;
  configFiles: number;
  otherFiles: number;
}

export interface AnalysisResult {
  schemaVersion: number;
  comparison: {
    base: string;
    head: string;
  };
  summary: AnalysisSummary;
  affectedAreas: AffectedArea[];
  signals: Signal[];
  risk: RiskAssessment;
  recommendations: Recommendation[];
  reasoning: string;
  notes: string[];
}
