export interface CriticalPathConfig {
  path: string;
  name: string;
  risk: number;
}

export interface FeatureMapping {
  /** Glob matched against production file paths. */
  production: string;
  /** Globs matched against test file paths related to that production glob. */
  tests: string[];
}

export interface RiskThresholds {
  moderate: number;
  high: number;
  critical: number;
}

export interface RiskConfig {
  largeChangeThreshold: number;
  thresholds: RiskThresholds;
  weightOverrides: Record<string, number>;
}

export interface ResolvedConfig {
  criticalPaths: CriticalPathConfig[];
  testPatterns: string[];
  ignore: string[];
  sharedPaths: string[];
  featureMappings: FeatureMapping[];
  risk: RiskConfig;
}

export const DEFAULT_TEST_PATTERNS = [
  '**/*.spec.ts',
  '**/*.spec.tsx',
  '**/*.spec.js',
  '**/*.spec.jsx',
  '**/*.test.ts',
  '**/*.test.tsx',
  '**/*.test.js',
  '**/*.test.jsx',
  '**/__tests__/**',
  '**/test_*.py',
  '**/*_test.py',
  '**/tests/**/*.py',
  '**/src/test/**/*.java',
  '**/*Test.java',
  '**/*Tests.java',
  '**/*Test.cs',
  '**/*Tests.cs',
  '**/*_test.go',
  '**/spec/**/*_spec.rb',
  '**/test/**/*_test.rb',
];

export const DEFAULT_IGNORE = ['**/*.md', '**/*.mdx', 'docs/**', 'LICENSE', 'CHANGELOG*'];

export const DEFAULT_SHARED_PATHS = [
  'src/lib/**',
  'src/utils/**',
  'src/util/**',
  'src/common/**',
  'src/core/**',
  'src/shared/**',
  'shared/**',
  'common/**',
  'lib/**',
];

export const DEFAULT_RISK_THRESHOLDS: RiskThresholds = {
  moderate: 4,
  high: 8,
  critical: 13,
};

export const DEFAULT_LARGE_CHANGE_THRESHOLD = 500;

export function defaultConfig(): ResolvedConfig {
  return {
    criticalPaths: [],
    testPatterns: [...DEFAULT_TEST_PATTERNS],
    ignore: [...DEFAULT_IGNORE],
    sharedPaths: [...DEFAULT_SHARED_PATHS],
    featureMappings: [],
    risk: {
      largeChangeThreshold: DEFAULT_LARGE_CHANGE_THRESHOLD,
      thresholds: { ...DEFAULT_RISK_THRESHOLDS },
      weightOverrides: {},
    },
  };
}
