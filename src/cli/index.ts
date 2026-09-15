import { Command, InvalidArgumentError } from 'commander';
import { runAnalysis } from '../analyze.js';
import { renderTerminalReport } from '../reporters/terminal.js';
import { renderJsonReport } from '../reporters/json.js';
import { renderMarkdownReport } from '../reporters/markdown.js';
import { renderExplainOverview, renderExplainSignal } from './explain.js';
import { GitError } from '../git/repository.js';
import { levelMeetsOrExceeds } from '../risk/model.js';
import type { RiskLevel } from '../domain/types.js';

const RISK_LEVELS: RiskLevel[] = ['low', 'moderate', 'high', 'critical'];

function parseFailOn(value: string): RiskLevel {
  const normalized = value.toLowerCase();
  if (!RISK_LEVELS.includes(normalized as RiskLevel)) {
    throw new InvalidArgumentError(`must be one of: ${RISK_LEVELS.join(', ')}`);
  }
  return normalized as RiskLevel;
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name('release-lens')
    .description('Risk-based QA intelligence for every pull request.')
    .version('0.1.0');

  program
    .command('analyze')
    .description('Analyze the current change and produce a QA risk report')
    .option('--base <ref>', 'base ref to compare against')
    .option('--head <ref>', 'head ref to compare (requires --base)')
    .option('--json', 'output structured JSON instead of the terminal report')
    .option('--markdown', 'output a Markdown report (e.g. for a GitHub Actions job summary)')
    .option(
      '--fail-on <level>',
      'exit with a non-zero status when risk reaches this level or higher (low, moderate, high, critical)',
      parseFailOn,
    )
    .action(
      (opts: {
        base?: string;
        head?: string;
        json?: boolean;
        markdown?: boolean;
        failOn?: RiskLevel;
      }) => {
        try {
          const result = runAnalysis({ cwd: process.cwd(), base: opts.base, head: opts.head });
          const output = opts.json
            ? renderJsonReport(result)
            : opts.markdown
              ? renderMarkdownReport(result)
              : renderTerminalReport(result);
          process.stdout.write(output + '\n');

          if (opts.failOn && levelMeetsOrExceeds(result.risk.level, opts.failOn)) {
            process.exitCode = 1;
          }
        } catch (error) {
          handleError(error);
        }
      },
    );

  program
    .command('explain [signal]')
    .description('Explain how risk scoring works, or describe a specific signal')
    .action((signal?: string) => {
      process.stdout.write((signal ? renderExplainSignal(signal) : renderExplainOverview()) + '\n');
    });

  return program;
}

function handleError(error: unknown): void {
  if (error instanceof GitError) {
    process.stderr.write(`Error: ${error.message}\n`);
    process.exitCode = 1;
    return;
  }
  throw error;
}
