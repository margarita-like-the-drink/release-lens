# Architecture

This document explains how ReleaseLens is put together and why, for anyone
extending it or reviewing the design.

## Pipeline

```
Git diff → classification → signals → risk → recommendations → report
```

Each stage consumes the previous stage's output and nothing else. A signal
detector never runs a second `git diff`; a reporter never re-derives risk. This
keeps every stage independently testable and keeps the data that reaches a
report traceable back to a specific diff.

```
src/git/            Resolves what to compare and turns raw `git diff` output
                     into ChangedFile[] - normalized, language-agnostic diff data.

src/classification/  Classifies each changed file (production, test, config,
                     dependency, style, documentation, asset) and derives the
                     "affected area" used in the summary and multi-area signal.

src/signals/         One detector per QA-relevant signal. A detector reads
                     ChangedFile + classification + config and returns zero or
                     more Signal objects, each carrying its own evidence.

src/risk/            Turns a list of signals into inherent/coverage/mitigation
                     totals, a 0-N score, and a LOW/MODERATE/HIGH/CRITICAL level.

src/recommendations/ Turns signals into concrete testing recommendations,
                     grouped by category and ordered by risk contribution.

src/reporters/       Terminal, JSON, and Markdown renderings of the same
                     AnalysisResult - no reporter computes anything itself.

src/config/          Parses and validates `.releaselens.yml`, with defaults
                     that make the tool useful without any configuration.

src/cli/             Command parsing (`analyze`, `explain`) and process I/O.
                     Everything else in the CLI layer is a thin wrapper around
                     `runAnalysis()` in src/analyze.ts.
```

There is no separate "service" or "manager" layer between these: `analyze.ts`
calls each stage's exported function directly, in order. A CLI this size does
not need dependency injection or an abstract base class per signal - it needs
a stable `SignalDefinition` shape and a registry array.

## Why signals are data, not just code

Every signal is defined once, as a `SignalDefinition` (`src/signals/types.ts`):
an id, title, category, risk contribution, default weight, confidence, three
strings used by `explain`, and a `detect()` function. `release-lens explain
<id>` reads directly from this object - there is no separate copy of "what
this signal means" living in documentation that can drift out of sync with
the code that actually implements it.

Adding a signal means adding one file under `src/signals/detectors/` and one
line in `src/signals/registry.ts`. See CONTRIBUTING.md for the full checklist.

## Why risk separates inherent, coverage, and mitigation

A single "risk score" that mixes "this touches payment code" with "there's no
test for it" hides the more useful question a QA engineer actually has: is
this risky because of _what changed_, or because of _what wasn't verified_?
Those call for different responses - the first needs manual test design, the
second might just need someone to write a test.

Concretely:

- **Inherent risk** is business/product risk from the change itself
  (payment logic, auth, a migration, a critical path). It is never reduced
  by anything, including new tests.
- **Coverage risk** is risk that automated tests may not protect the change
  (no related test changes, tests deleted, assertions weakened).
- **Mitigation** is evidence that reduces coverage risk specifically - new
  or meaningfully modified tests related to the change.

The score is `inherentRisk + max(0, coverageRisk - mitigation)`. Mitigation
can drive coverage risk to zero; it cannot touch inherent risk. This is a
deliberate modeling choice, not an oversight - see the "Project philosophy"
section of the README for the reasoning, and `release-lens explain` for the
same explanation surfaced to end users.

## Why evidence is mandatory

Every `Signal` carries an `evidence: SignalEvidence[]` array, and every
`Recommendation` carries `signalIds` pointing back to the signal(s) that
produced it. Nothing in a report is allowed to exist without a path back to
a specific file and diff observation. This is enforced by tests
(`tests/signals/detectors.test.ts`), not just convention.

## Why there is no language model anywhere in this pipeline

Every detector is a deterministic function over structured diff data: path
patterns, line counts, curated keyword regexes, and repository configuration.
The same input always produces the same output, which is what lets
`release-lens explain <signal>` give a real, mechanical answer to "why did
this fire" instead of a plausible-sounding guess. See the README's "What
ReleaseLens does not know" section for the limits this implies.

## Code-to-test relationship heuristic

`src/signals/coverageMapping.ts` is the one place complex enough to warrant
its own explanation. Given a changed production file, it looks for a related
_changed_ test file via, in order:

1. **Naming convention** - language-specific candidate paths (`foo.ts` →
   `foo.spec.ts`, `foo_test.py`, `FooTest.java`, `foo_test.go`, ...), including
   common `tests/` mirroring.
2. **Explicit feature mapping** - `.releaselens.yml`'s `featureMappings`, for
   codebases whose conventions don't fit the built-in patterns.
3. **Import reference** - a changed test file that imports the production
   module, checked against both the diff's added lines and (as a fallback)
   the file's current contents on disk, since an import statement that
   predates this change may fall outside the diff's context lines entirely.

If none match, ReleaseLens also checks whether a test file matching naming
conventions _exists on disk but wasn't changed_ in this diff, and reports
that distinction explicitly rather than claiming no test exists at all.

This heuristic is deliberately conservative: it is designed to under-claim
(miss a real relationship) rather than over-claim (assert a gap that
doesn't exist). See "Limitations" in the README.

## Language support

ReleaseLens does not parse source code into an AST for any language. Signal
detectors work from file paths, line-level regex patterns, and diff
structure, which is what makes the same detector logic apply across
JavaScript/TypeScript, Python, Java, C#, Go, and Ruby without per-language
implementations. The tradeoff is explicit: recall over languages, not
precision within one. Deeper, language-specific analysis is a natural
extension point (see CONTRIBUTING.md) but is out of scope for v0.1.

## Signals are allowed to overlap

`critical-path-changed` (configured) and a built-in domain signal like
`payment-logic-changed` can both fire for the same file - a configured
critical path glob and a keyword match are independent pieces of evidence,
not two views of the same fact, and ReleaseLens does not attempt to
deduplicate them into a single number. This is a deliberate choice: it keeps
every signal's detector free of any knowledge of the others (see "Adding a
new signal" in CONTRIBUTING.md - a contributor should never need to check
whether their signal might collide with an existing one), and it means a
file matching two independent risk indicators is, honestly, more
scrutinized than one matching only a single indicator. The breakdown always
shows both lines with their own evidence, so this is visible, not hidden.

## Ordering evidence for readability

`classifyFiles` sorts classified files (non-migration production first, then
migrations, tests, dependencies, config, style, assets, docs) before signals
are detected. This is purely a presentation concern: when a signal's evidence
spans several files, the first one shown in a report should be the most
representative file, not whichever one `git diff` happened to list first.
