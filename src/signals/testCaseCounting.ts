import type { ChangedFile } from '../domain/types.js';
import { addedLines, countMatches, removedLines } from './textScan.js';

/**
 * Line-level patterns recognizing test cases, assertions, and skip markers
 * across the languages ReleaseLens supports. These operate on individual
 * diff lines, so they count declarations rather than parsing a real AST -
 * accurate enough to spot meaningful churn, not precise enough to be
 * presented as an exact test count.
 */

const TEST_CASE_PATTERNS = [
  /\b(it|test)\s*(\.\w+)?\s*\(/, // Jest/Mocha/Jasmine
  /^\s*def\s+test_\w+\s*\(/, // Python unittest/pytest
  /@Test\b/, // JUnit/TestNG
  /\[(Test|Fact|TestMethod)\]/, // xUnit/NUnit/MSTest
  /^\s*func\s+Test\w+\s*\(/, // Go
  /\bit\s+['"]/, // RSpec
];

const ASSERTION_PATTERNS = [
  /\bexpect\s*\(/,
  /\.should\./,
  /\bassert\w*\s*\(/i,
  /\bAssert\.\w+\(/,
  /\bassertThat\(/,
  /self\.assert\w+\(/,
  /\bt\.Errorf\(/,
  /\.to\.\w+/,
  /\bto\s+eq\b/,
];

const SKIP_PATTERNS = [
  /\.skip\s*\(/,
  /\bxit\s*\(/,
  /\bxdescribe\s*\(/,
  /\btest\.todo\(/,
  /@pytest\.mark\.skip/,
  /@unittest\.skip/,
  /@Disabled\b/,
  /@Ignore\b/,
  /\[Ignore\]/,
  /\bt\.Skip\(/,
  /^\s*skip\b/,
  /^\s*pending\b/,
];

export interface TestCaseChurn {
  addedCases: number;
  removedCases: number;
  addedAssertions: number;
  removedAssertions: number;
  addedSkips: number;
}

export function analyzeTestChurn(file: ChangedFile): TestCaseChurn {
  const added = addedLines(file);
  const removed = removedLines(file);

  return {
    addedCases: sumMatches(added, TEST_CASE_PATTERNS),
    removedCases: sumMatches(removed, TEST_CASE_PATTERNS),
    addedAssertions: sumMatches(added, ASSERTION_PATTERNS),
    removedAssertions: sumMatches(removed, ASSERTION_PATTERNS),
    addedSkips: sumMatches(added, SKIP_PATTERNS),
  };
}

function sumMatches(lines: string[], patterns: RegExp[]): number {
  return patterns.reduce((total, pattern) => total + countMatches(lines, pattern), 0);
}
