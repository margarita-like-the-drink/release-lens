#!/usr/bin/env node
import { createProgram } from './index.js';

createProgram()
  .parseAsync(process.argv)
  .catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
