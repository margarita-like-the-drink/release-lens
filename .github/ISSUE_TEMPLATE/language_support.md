---
name: Language / framework support
about: Improve how ReleaseLens recognizes a language, test framework, or convention
title: 'Language support: '
labels: language-support
assignees: ''
---

**Language or framework**

e.g. Kotlin, PHPUnit, Rust with `#[test]`, a specific monorepo layout.

**What ReleaseLens currently gets wrong or misses**

- File role misclassified (e.g. a test file treated as production)?
- Test convention not recognized (naming pattern, directory layout)?
- Migration convention not recognized?
- Something else?

**Convention details**

Describe the naming/directory convention precisely, with a real example path
if possible (e.g. `tests/Feature/OrderTest.php`, `src/**/*.kt` vs
`src/test/**/*.kt`).

**Are you willing to contribute the change?**

ReleaseLens's language support is intentionally pattern-based rather than
AST-based (see `docs/architecture.md`), so most additions are small,
localized changes to `src/config/schema.ts`, `src/classification/`, or
`src/signals/coverageMapping.ts`. If you can open a PR, CONTRIBUTING.md has
a walkthrough.
