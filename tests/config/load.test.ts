import { describe, expect, it } from 'vitest';
import { TempRepo } from '../helpers/tempRepo.js';
import { loadConfig } from '../../src/config/load.js';
import { DEFAULT_RISK_THRESHOLDS } from '../../src/config/schema.js';

describe('loadConfig', () => {
  it('returns defaults when no config file exists', () => {
    const repo = new TempRepo();
    try {
      const { config, configPath, warnings } = loadConfig(repo.dir);
      expect(configPath).toBeNull();
      expect(warnings).toHaveLength(0);
      expect(config.criticalPaths).toHaveLength(0);
      expect(config.risk.thresholds).toEqual(DEFAULT_RISK_THRESHOLDS);
    } finally {
      repo.cleanup();
    }
  });

  it('parses a valid configuration file', () => {
    const repo = new TempRepo();
    try {
      repo.write(
        '.releaselens.yml',
        [
          'criticalPaths:',
          '  - path: "src/payments/**"',
          '    name: "Payments"',
          '    risk: 5',
          'testPatterns:',
          '  - "**/*.spec.ts"',
          'risk:',
          '  largeChangeThreshold: 200',
          '  thresholds:',
          '    moderate: 3',
          '  weightOverrides:',
          '    tests-deleted: 5',
          '',
        ].join('\n'),
      );

      const { config, configPath, warnings } = loadConfig(repo.dir);
      expect(configPath).not.toBeNull();
      expect(warnings).toHaveLength(0);
      expect(config.criticalPaths).toEqual([
        { path: 'src/payments/**', name: 'Payments', risk: 5 },
      ]);
      expect(config.testPatterns).toEqual(['**/*.spec.ts']);
      expect(config.risk.largeChangeThreshold).toBe(200);
      expect(config.risk.thresholds.moderate).toBe(3);
      expect(config.risk.thresholds.high).toBe(DEFAULT_RISK_THRESHOLDS.high);
      expect(config.risk.weightOverrides['tests-deleted']).toBe(5);
    } finally {
      repo.cleanup();
    }
  });

  it('degrades gracefully on malformed YAML without throwing', () => {
    const repo = new TempRepo();
    try {
      repo.write('.releaselens.yml', 'criticalPaths: [this is not valid yaml');
      const { config, warnings } = loadConfig(repo.dir);
      expect(warnings.length).toBeGreaterThan(0);
      expect(config.criticalPaths).toHaveLength(0);
    } finally {
      repo.cleanup();
    }
  });

  it('skips invalid critical path entries with a warning instead of crashing', () => {
    const repo = new TempRepo();
    try {
      repo.write(
        '.releaselens.yml',
        ['criticalPaths:', '  - path: "src/payments/**"', '  - name: "Missing path"', ''].join(
          '\n',
        ),
      );
      const { config, warnings } = loadConfig(repo.dir);
      expect(warnings.some((w) => w.includes('criticalPaths[0]'))).toBe(true);
      expect(warnings.some((w) => w.includes('criticalPaths[1]'))).toBe(true);
      expect(config.criticalPaths).toHaveLength(0);
    } finally {
      repo.cleanup();
    }
  });

  it('rejects a non-mapping document', () => {
    const repo = new TempRepo();
    try {
      repo.write('.releaselens.yml', '- just\n- a\n- list\n');
      const { config, warnings } = loadConfig(repo.dir);
      expect(warnings.length).toBeGreaterThan(0);
      expect(config.criticalPaths).toHaveLength(0);
    } finally {
      repo.cleanup();
    }
  });
});
