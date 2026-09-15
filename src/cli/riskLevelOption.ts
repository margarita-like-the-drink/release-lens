import { InvalidArgumentError } from 'commander';
import type { RiskLevel } from '../domain/types.js';

export const RISK_LEVELS: RiskLevel[] = ['low', 'moderate', 'high', 'critical'];

export function parseFailOn(value: string): RiskLevel {
  const normalized = value.toLowerCase();
  if (!RISK_LEVELS.includes(normalized as RiskLevel)) {
    throw new InvalidArgumentError(`must be one of: ${RISK_LEVELS.join(', ')}`);
  }
  return normalized as RiskLevel;
}
