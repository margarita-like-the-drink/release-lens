# Contributing to ReleaseLens

Thanks for considering a contribution. This document covers setup, the
project's engineering conventions, and a full walkthrough for the most
common kind of contribution: adding a new QA risk signal.

## Setup

```bash
git clone https://github.com/<you>/release-lens.git
cd release-lens
npm install
npm run build
node dist/cli/bin.js explain
```

Useful scripts during development:

```bash
npm run dev -- analyze          # run the CLI from source via tsx, no build step
npm run lint                    # ESLint
npm run format                  # Prettier check
npm run typecheck               # tsc --noEmit
npm test                        # unit + config + risk + recommendations + signals tests
npm run test:integration        # fixture-based integration tests (real temp Git repos)
npm run test:cli                # CLI-level tests (spawns the CLI via tsx)
npm run test:all                # everything
```

CI runs install, lint, typecheck, unit tests, integration tests, CLI tests,
and build on every pull request.

## Design principles to preserve

These aren't arbitrary style preferences - they're the reasons this tool is
trustworthy. Please keep them in mind:

- **No language model, anywhere in the analysis pipeline.** Every signal must
  be a deterministic function of the diff, file paths, and configuration.
- **Every signal carries evidence.** A `Signal` with an empty `evidence`
  array should be treated as a bug.
- **Every recommendation traces back to a signal.** No recommendation should
  exist that isn't justified by something ReleaseLens actually observed.
- **Be conservative in wording.** "Potential coverage gap: no related test
  changes detected" is correct. "This function has no tests" is a claim
  ReleaseLens usually cannot prove and should not make.
- **Mitigation never reduces inherent risk.** See `docs/architecture.md` for
  why, before changing anything in `src/risk/`.
- **No filler recommendations.** "Test edge cases" or "perform regression
  testing" are not acceptable additions to the recommendation catalog. Every
  recommendation should say what to test, tied to what changed.

## Adding a new signal

A signal is defined once, as a `SignalDefinition` in
`src/signals/detectors/`, and used by both the analyzer and the `explain`
command. There is no second place to update - the same object is the
authority for both.

1. **Add a detector file** under `src/signals/detectors/yourSignal.ts`,
   modeled on an existing one close to what you're building
   (`src/signals/detectors/validationLogicChanged.ts` is a good, simple
   template for a content-keyword signal; `src/signals/detectors/testsSkipped.ts`
   for a test-file signal).

2. **Define the signal's metadata** in the same file: `id` (stable,
   kebab-case, never reused for a different meaning), `title`, `category`,
   `contribution` (`inherent`, `coverage`, `mitigation`, or `informational` -
   see `docs/architecture.md`), `defaultWeight`, and `confidence`.

3. **Write `whyItMatters`, `whatItLooksFor`, and `qaResponse`.** These are
   not documentation-only strings - they are exactly what
   `release-lens explain <your-signal-id>` prints. Write them for the QA
   engineer reading the report, not for another contributor reading the code.

4. **Implement `detect(ctx)`.** You get the full `DetectorContext`:
   `comparison` (all changed files), `classifications` (role, language, area,
   critical-path matches per file), `config` (resolved `.releaselens.yml`),
   and `repoRoot`. Return `[]` when the signal doesn't apply - never return a
   signal with empty evidence. Reuse helpers in `src/signals/textScan.ts`
   (line scanning) and `src/signals/keywords.ts` (curated regex patterns)
   rather than writing new one-off pattern matching.

5. **Register it** in `src/signals/registry.ts` by importing your definition
   and adding it to the `SIGNAL_DEFINITIONS` array.

6. **Add recommendations**, if the signal should produce any, in
   `src/recommendations/catalog.ts`: add an entry to
   `RECOMMENDATION_GENERATORS` keyed by your signal's id. Write concrete
   checks ("verify X at boundary Y because Z"), not generic advice. If a
   recommendation only makes sense in combination with another signal, add a
   rule to `src/recommendations/combinations.ts` instead.

7. **Add a fixture.** If your signal represents a realistic scenario not
   already covered, add a case to `tests/integration/fixtures.test.ts` using
   a real temporary Git repository (`tests/helpers/tempRepo.ts`).

8. **Add unit tests** in `tests/signals/detectors.test.ts` (or a new file if
   the area warrants it) covering: the signal firing, the signal _not_
   firing on an unrelated change, and that its evidence is meaningful.

9. **Update the supported-signals list** in `README.md` if your signal
   changes the count or introduces a new category.

That's it - no other file needs to know your signal exists. If you find
yourself needing to touch the reporters, the risk model, or the CLI to add a
signal, that's a sign the change is doing more than adding a signal, and it's
worth opening an issue to discuss the design first.

## Adding language/framework support

ReleaseLens recognizes test conventions and file roles by path and extension,
not by AST. To improve support for a language or framework:

- Test file conventions live in `src/config/schema.ts`
  (`DEFAULT_TEST_PATTERNS`) and are also used by the coverage-mapping
  heuristic in `src/signals/coverageMapping.ts` (`candidateTestPaths`).
- File role and language detection live in `src/classification/fileRole.ts`
  and `src/classification/language.ts`.
- Migration file conventions live in `src/classification/fileRole.ts`
  (`MIGRATION_PATH_HINTS`, `MIGRATION_FILENAME_HINTS`).

Add a fixture exercising the new convention, and a unit test confirming the
classification.

## Commit and PR expectations

- Keep pull requests focused - one signal, one bug fix, or one documented
  improvement per PR is easier to review than a bundle.
- Include tests for behavior changes. A PR that changes scoring, evidence
  text, or recommendation text without a test change will likely be asked
  to add one.
- Run `npm run test:all`, `npm run lint`, and `npm run typecheck` locally
  before opening a PR - CI runs the same checks.

## Reporting issues

Use the issue templates: bug report, feature request, new risk signal
proposal, or language/framework support request. If none fit, open a blank
issue and describe what you're trying to do.
