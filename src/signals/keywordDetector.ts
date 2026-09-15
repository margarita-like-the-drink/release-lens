import type { SignalEvidence } from '../domain/types.js';
import type { DetectorContext } from './types.js';
import { fileMatches, findFirstMatchingLine } from './textScan.js';

export interface KeywordMatch {
  evidence: SignalEvidence[];
  affected: string[];
}

/**
 * Shared shape for signals that fire when a production file's path or diff
 * content matches a curated keyword pattern list (authentication,
 * authorization, permissions, validation, datetime, ...). Attaches a line
 * number to the evidence when the match came from a specific added line,
 * so downstream consumers (the GitHub inline-comment integration) can
 * anchor to it; falls back to file-level evidence otherwise.
 */
export function detectByKeywords(
  ctx: DetectorContext,
  patterns: RegExp[],
  description: string,
): KeywordMatch {
  const evidence: SignalEvidence[] = [];
  const affected: string[] = [];

  for (const classification of ctx.classifications) {
    if (classification.role !== 'production') continue;
    const { file } = classification;
    if (!fileMatches(file, patterns)) continue;

    affected.push(file.path);
    const line = findFirstMatchingLine(file, patterns);
    evidence.push(
      line === undefined
        ? { file: file.path, description }
        : { file: file.path, description, line },
    );
  }

  return { evidence, affected };
}
