import { minimatch } from 'minimatch';
import type { ChangedFile, FileRole } from '../domain/types.js';
import type { ResolvedConfig } from '../config/schema.js';
import { extensionOf } from './language.js';

const DEPENDENCY_MANIFESTS = [
  'package.json',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'requirements.txt',
  'Pipfile',
  'Pipfile.lock',
  'poetry.lock',
  'pyproject.toml',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'go.mod',
  'go.sum',
  'Gemfile',
  'Gemfile.lock',
];

const DOC_EXTENSIONS = new Set(['md', 'mdx']);
const STYLE_EXTENSIONS = new Set(['css', 'scss', 'less', 'sass']);
const ASSET_EXTENSIONS = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'svg',
  'ico',
  'webp',
  'woff',
  'woff2',
  'ttf',
  'eot',
]);
const CONFIG_EXTENSIONS = new Set(['yml', 'yaml', 'toml', 'ini', 'cfg', 'env']);
const CONFIG_PATH_HINTS = [
  '.github/workflows/',
  '.circleci/',
  'k8s/',
  'terraform/',
  '.env',
  'Dockerfile',
  'docker-compose',
];

const MIGRATION_PATH_HINTS = [
  /(^|\/)migrations\//i,
  /(^|\/)migrate\//i,
  /(^|\/)db\/migrate\//i,
  /(^|\/)alembic\/versions\//i,
];
const MIGRATION_FILENAME_HINTS = [/^V\d+__/, /^\d{10,}_/, /^\d{3,}_/];

export function isTestFile(path: string, config: ResolvedConfig): boolean {
  return config.testPatterns.some((pattern) => minimatch(path, pattern, { dot: true }));
}

export function isIgnored(path: string, config: ResolvedConfig): boolean {
  return config.ignore.some((pattern) => minimatch(path, pattern, { dot: true }));
}

export function isMigrationFile(path: string): boolean {
  if (MIGRATION_PATH_HINTS.some((re) => re.test(path))) return true;
  const filename = path.split('/').pop() ?? '';
  return MIGRATION_FILENAME_HINTS.some((re) => re.test(filename));
}

export function classifyFileRole(file: ChangedFile, config: ResolvedConfig): FileRole {
  const path = file.path;
  const filename = path.split('/').pop() ?? path;
  const ext = extensionOf(path);

  if (isTestFile(path, config)) return 'test';

  if (DEPENDENCY_MANIFESTS.includes(filename)) return 'dependency';

  if (ext && DOC_EXTENSIONS.has(ext)) return 'documentation';
  if (/^(readme|license|changelog|contributing|code_of_conduct|security)(\.|$)/i.test(filename)) {
    return 'documentation';
  }

  if (ext && STYLE_EXTENSIONS.has(ext)) return 'style';
  if (ext && ASSET_EXTENSIONS.has(ext)) return 'asset';

  if (ext && CONFIG_EXTENSIONS.has(ext)) return 'config';
  if (CONFIG_PATH_HINTS.some((hint) => path.includes(hint))) return 'config';
  if (filename === 'Dockerfile' || filename.startsWith('Dockerfile.')) return 'config';

  if (ext === 'json') {
    // Standalone data/config JSON outside dependency manifests and source trees.
    if (path.includes('config') || path.startsWith('.')) return 'config';
  }

  if (!ext) return 'unknown';

  return 'production';
}
