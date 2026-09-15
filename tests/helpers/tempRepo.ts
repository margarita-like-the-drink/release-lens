import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export class TempRepo {
  readonly dir: string;

  constructor() {
    this.dir = mkdtempSync(join(tmpdir(), 'release-lens-'));
    this.git(['init', '-q']);
    this.git(['config', 'user.email', 'test@example.com']);
    this.git(['config', 'user.name', 'ReleaseLens Test']);
  }

  git(args: string[]): string {
    return execFileSync('git', args, { cwd: this.dir, encoding: 'utf8' });
  }

  write(relativePath: string, content: string): void {
    const fullPath = join(this.dir, relativePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
  }

  writeAll(files: Record<string, string>): void {
    for (const [path, content] of Object.entries(files)) {
      this.write(path, content);
    }
  }

  commit(message: string): void {
    this.git(['add', '-A']);
    this.git(['commit', '-q', '-m', message]);
  }

  cleanup(): void {
    rmSync(this.dir, { recursive: true, force: true });
  }
}

/** Creates a repo with a base commit, then applies changes and stages them (uncommitted) for analysis. */
export function createScenario(
  base: Record<string, string>,
  changed: Record<string, string>,
): TempRepo {
  const repo = new TempRepo();
  repo.writeAll(base);
  repo.commit('base');
  repo.writeAll(changed);
  return repo;
}
