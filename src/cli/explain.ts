import { SIGNAL_DEFINITIONS, findSignalDefinition } from '../signals/registry.js';
import { DEFAULT_RISK_THRESHOLDS, DEFAULT_LARGE_CHANGE_THRESHOLD } from '../config/schema.js';
import { DIVIDER } from '../reporters/shared.js';

export function renderExplainOverview(): string {
  const lines: string[] = [];

  lines.push('ReleaseLens: how risk scoring works');
  lines.push(DIVIDER);
  lines.push('');
  lines.push(
    'ReleaseLens never uses a language model. Every signal below is produced by a deterministic',
  );
  lines.push('detector that inspects the Git diff, file paths, and repository configuration.');
  lines.push('');
  lines.push('Risk has three parts, tracked separately:');
  lines.push('');
  lines.push('  Inherent risk   Business/product risk introduced by the change itself');
  lines.push('                  (e.g. payment logic, authentication, a database migration).');
  lines.push('  Coverage risk   Risk that automated tests may not protect the change');
  lines.push(
    '                  (e.g. no related test changes, tests deleted, assertions removed).',
  );
  lines.push('  Mitigation      Evidence that reduces coverage risk (new or modified tests).');
  lines.push('');
  lines.push('Mitigation can only offset coverage risk, never inherent risk:');
  lines.push('');
  lines.push('  score = inherentRisk + max(0, coverageRisk - mitigation)');
  lines.push('');
  lines.push(
    'Ten new tests do not make a payment-processing change inherently harmless - they can bring',
  );
  lines.push('coverage risk to zero, but the inherent risk of touching payment logic remains.');
  lines.push('');
  lines.push('Risk levels (defaults, configurable via risk.thresholds):');
  lines.push('');
  lines.push(`  LOW        0 - ${DEFAULT_RISK_THRESHOLDS.moderate - 1}`);
  lines.push(
    `  MODERATE   ${DEFAULT_RISK_THRESHOLDS.moderate} - ${DEFAULT_RISK_THRESHOLDS.high - 1}`,
  );
  lines.push(
    `  HIGH       ${DEFAULT_RISK_THRESHOLDS.high} - ${DEFAULT_RISK_THRESHOLDS.critical - 1}`,
  );
  lines.push(`  CRITICAL   ${DEFAULT_RISK_THRESHOLDS.critical}+`);
  lines.push('');
  lines.push(
    `A change is also flagged as a large change surface once total added/deleted lines exceed`,
  );
  lines.push(
    `${DEFAULT_LARGE_CHANGE_THRESHOLD} (risk.largeChangeThreshold), and .releaselens.yml can define`,
  );
  lines.push('project-specific critical paths that add their own configured risk weight.');
  lines.push('');
  lines.push('Supported signals:');
  lines.push('');
  for (const definition of SIGNAL_DEFINITIONS) {
    const weight =
      definition.contribution === 'mitigation'
        ? `-${definition.defaultWeight}`
        : `+${definition.defaultWeight}`;
    const weightLabel =
      definition.contribution === 'informational' ? '  0' : weight.padStart(3, ' ');
    lines.push(`  ${weightLabel}  ${definition.id.padEnd(28)} ${definition.title}`);
  }
  lines.push('');
  lines.push("Run 'release-lens explain <signal-id>' for details on any signal above.");

  return lines.join('\n');
}

export function renderExplainSignal(id: string): string {
  const definition = findSignalDefinition(id);
  if (!definition) {
    const known = SIGNAL_DEFINITIONS.map((d) => d.id).join(', ');
    return `Unknown signal '${id}'.\n\nKnown signals:\n${known}`;
  }

  const lines: string[] = [];
  lines.push(definition.id);
  lines.push('');
  lines.push('Title:');
  lines.push(definition.title);
  lines.push('');
  lines.push('Why it matters:');
  lines.push(definition.whyItMatters);
  lines.push('');
  lines.push('Default weight:');
  lines.push(String(definition.defaultWeight));
  lines.push('');
  lines.push('Category:');
  lines.push(definition.category);
  lines.push('');
  lines.push('Risk contribution:');
  lines.push(definition.contribution);
  lines.push('');
  lines.push('Confidence:');
  lines.push(definition.confidence);
  lines.push('');
  lines.push('What ReleaseLens looks for:');
  lines.push(definition.whatItLooksFor);
  lines.push('');
  lines.push('Possible QA response:');
  lines.push(definition.qaResponse);

  return lines.join('\n');
}
