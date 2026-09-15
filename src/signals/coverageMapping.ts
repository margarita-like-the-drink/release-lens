import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { minimatch } from 'minimatch';
import type { ChangedFile, FileClassification } from '../domain/types.js';
import type { ResolvedConfig } from '../config/schema.js';
import { addedLines, withoutExtension } from './textScan.js';

/**
 * Generates plausible test-file locations for a production file, based on
 * common conventions across the languages ReleaseLens recognizes. This is a
 * heuristic: it increases confidence when it matches, it never proves the
 * absence of coverage when it doesn't.
 */
export function candidateTestPaths(productionPath: string): string[] {
  const dir = productionPath.includes('/')
    ? productionPath.slice(0, productionPath.lastIndexOf('/'))
    : '';
  const name = withoutExtension(productionPath);
  const ext = (/\.([A-Za-z0-9]+)$/.exec(productionPath)?.[1] ?? '').toLowerCase();
  const dirPrefix = dir ? `${dir}/` : '';

  const candidates: string[] = [];

  const addUnderRoots = (relative: string): void => {
    candidates.push(relative);
    for (const root of ['tests', 'test']) {
      candidates.push(relative.replace(/^src\//, `${root}/`));
      if (!relative.startsWith('src/')) candidates.push(`${root}/${relative}`);
    }
  };

  switch (ext) {
    case 'ts':
    case 'tsx':
    case 'js':
    case 'jsx': {
      addUnderRoots(`${dirPrefix}${name}.spec.${ext}`);
      addUnderRoots(`${dirPrefix}${name}.test.${ext}`);
      addUnderRoots(`${dirPrefix}__tests__/${name}.spec.${ext}`);
      addUnderRoots(`${dirPrefix}__tests__/${name}.test.${ext}`);
      break;
    }
    case 'py': {
      addUnderRoots(`${dirPrefix}test_${name}.py`);
      addUnderRoots(`${dirPrefix}${name}_test.py`);
      break;
    }
    case 'java': {
      candidates.push(productionPath.replace('/main/', '/test/').replace(/\.java$/, 'Test.java'));
      candidates.push(`${dirPrefix}${name}Test.java`);
      break;
    }
    case 'cs': {
      candidates.push(`${dirPrefix}${name}Tests.cs`);
      candidates.push(`${dirPrefix}${name}Test.cs`);
      break;
    }
    case 'go': {
      candidates.push(`${dirPrefix}${name}_test.go`);
      break;
    }
    case 'rb': {
      addUnderRoots(`spec/${dirPrefix}${name}_spec.rb`);
      addUnderRoots(`${dirPrefix}${name}_spec.rb`);
      break;
    }
    default:
      break;
  }

  return Array.from(new Set(candidates));
}

function matchesFeatureMapping(
  productionPath: string,
  testPath: string,
  config: ResolvedConfig,
): boolean {
  return config.featureMappings.some(
    (mapping) =>
      minimatch(productionPath, mapping.production, { dot: true }) &&
      mapping.tests.some((testGlob) => minimatch(testPath, testGlob, { dot: true })),
  );
}

const IMPORT_LINE_PATTERNS = [
  /from\s+['"]([^'"]+)['"]/,
  /require\(\s*['"]([^'"]+)['"]\s*\)/,
  /import\s+['"]([^'"]+)['"]/,
];

function linesReferenceModule(lines: string[], moduleName: string): boolean {
  for (const line of lines) {
    for (const pattern of IMPORT_LINE_PATTERNS) {
      const specifier = pattern.exec(line)?.[1];
      if (specifier && specifier.split('/').pop() === moduleName) {
        return true;
      }
    }
  }
  return false;
}

/**
 * True if the test file imports the production module. Checks the diff's
 * added lines first (works even for a brand-new test file), then falls back
 * to reading the file's current contents from disk - an import statement
 * that already existed before this change (common when only a new test case
 * was added deep in an existing file) may fall outside the diff's context
 * lines entirely.
 */
function testFileReferencesModule(
  repoRoot: string,
  testFile: ChangedFile,
  productionPath: string,
): boolean {
  const moduleName = withoutExtension(productionPath);
  if (linesReferenceModule(addedLines(testFile), moduleName)) return true;

  try {
    const content = readFileSync(join(repoRoot, testFile.path), 'utf8');
    return linesReferenceModule(content.split('\n'), moduleName);
  } catch {
    return false;
  }
}

export interface CoverageMatch {
  testFile: string;
  reason: 'naming-convention' | 'feature-mapping' | 'import-reference';
}

/** Finds changed test files that plausibly relate to a changed production file. */
export function findRelatedChangedTestFiles(
  repoRoot: string,
  productionPath: string,
  testClassifications: FileClassification[],
  config: ResolvedConfig,
): CoverageMatch[] {
  const candidates = new Set(candidateTestPaths(productionPath));
  const matches: CoverageMatch[] = [];

  for (const classification of testClassifications) {
    const testPath = classification.file.path;
    if (candidates.has(testPath)) {
      matches.push({ testFile: testPath, reason: 'naming-convention' });
      continue;
    }
    if (matchesFeatureMapping(productionPath, testPath, config)) {
      matches.push({ testFile: testPath, reason: 'feature-mapping' });
      continue;
    }
    if (testFileReferencesModule(repoRoot, classification.file, productionPath)) {
      matches.push({ testFile: testPath, reason: 'import-reference' });
    }
  }

  return matches;
}

/** Looks for an existing (unmodified) test file on disk matching naming conventions. */
export function findExistingUnrelatedTestFile(
  repoRoot: string,
  productionPath: string,
  changedPaths: Set<string>,
): string | null {
  for (const candidate of candidateTestPaths(productionPath)) {
    if (changedPaths.has(candidate)) continue;
    if (existsSync(join(repoRoot, candidate))) {
      return candidate;
    }
  }
  return null;
}
