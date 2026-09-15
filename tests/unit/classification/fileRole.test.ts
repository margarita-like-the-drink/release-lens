import { describe, expect, it } from 'vitest';
import { classifyFileRole, isMigrationFile } from '../../../src/classification/fileRole.js';
import { defaultConfig } from '../../../src/config/schema.js';
import { makeFile } from '../../helpers/changedFile.js';

const config = defaultConfig();

describe('classifyFileRole', () => {
  it('classifies conventional test files as test', () => {
    expect(classifyFileRole(makeFile({ path: 'tests/checkout.spec.ts' }), config)).toBe('test');
    expect(classifyFileRole(makeFile({ path: 'src/foo.test.js' }), config)).toBe('test');
    expect(classifyFileRole(makeFile({ path: 'tests/test_checkout.py' }), config)).toBe('test');
    expect(classifyFileRole(makeFile({ path: 'src/main/java/Foo.java' }), config)).toBe(
      'production',
    );
    expect(classifyFileRole(makeFile({ path: 'src/test/java/FooTest.java' }), config)).toBe('test');
  });

  it('classifies dependency manifests separately from production code', () => {
    expect(classifyFileRole(makeFile({ path: 'package.json' }), config)).toBe('dependency');
    expect(classifyFileRole(makeFile({ path: 'go.sum' }), config)).toBe('dependency');
  });

  it('classifies documentation, style, and asset files', () => {
    expect(classifyFileRole(makeFile({ path: 'README.md' }), config)).toBe('documentation');
    expect(classifyFileRole(makeFile({ path: 'src/app.css' }), config)).toBe('style');
    expect(classifyFileRole(makeFile({ path: 'src/logo.png' }), config)).toBe('asset');
  });

  it('classifies configuration files', () => {
    expect(classifyFileRole(makeFile({ path: 'config/app.yml' }), config)).toBe('config');
    expect(classifyFileRole(makeFile({ path: '.github/workflows/ci.yml' }), config)).toBe('config');
  });

  it('defaults unrecognized source files to production', () => {
    expect(classifyFileRole(makeFile({ path: 'src/payments/retry.ts' }), config)).toBe(
      'production',
    );
  });
});

describe('isMigrationFile', () => {
  it('recognizes common migration path conventions', () => {
    expect(isMigrationFile('db/migrations/002_add_column.sql')).toBe(true);
    expect(isMigrationFile('src/migrations/0001_init.py')).toBe(true);
    expect(isMigrationFile('alembic/versions/abc123_add_table.py')).toBe(true);
  });

  it('does not flag ordinary production files', () => {
    expect(isMigrationFile('src/payments/retry.ts')).toBe(false);
  });
});
