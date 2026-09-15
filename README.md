# ReleaseLens

Your test suite can be green and your release can still be risky.

A pull request with a dozen changed files gives you a diff, not an answer to
the question a QA engineer actually has to answer: **what here actually needs
testing?** Code coverage tells you what ran. A static analyzer tells you what
looks wrong. Neither tells you that this particular change touches payment
processing and authentication at the same time, or that the new retry logic
shipped without a single test for the failure path.

ReleaseLens reads a Git diff, identifies QA-relevant risk signals, and turns
them into an explainable release-risk assessment and a concrete testing
checklist - without a test framework, a linter, or a language model anywhere
in the pipeline.

```
Git diff → evidence extraction → risk signals → risk calculation → recommendations → report
```

Every number in a ReleaseLens report traces back to a specific file and a
specific observation. If you can't explain why a score is what it is, it
shouldn't be the score.

## What ReleaseLens is not

- Not a Playwright/Selenium/test framework, and not a test generator
- Not a general-purpose code reviewer or a linter with QA branding
- Not a code coverage dashboard or a vulnerability scanner
- Not a fake "quality score", and not a replacement for QA judgment

Its job is narrower and, we think, more useful: turn code-change evidence
into QA and release-risk intelligence a human still has to act on.

## Sample output

Real output from `release-lens analyze`, run against an actual change that
adds payment retry logic, touches session validation, and trims a test in
the process:

```
ReleaseLens
────────────────────────────────────

Comparing:
working tree → HEAD

3 files changed
2 production files
1 test files
0 configuration files

Affected areas
auth
checkout
payment

Release Risk
CRITICAL · 18 points

Why

+4 Payment processing changed
src/payments/retry.ts

+3 Tests were deleted
tests/checkout.spec.ts

+3 Production logic changed without corresponding tests
src/auth/session.ts

+3 Authentication behavior changed
src/auth/session.ts

+2 Existing assertion removed
tests/checkout.spec.ts

+2 Changes spanning several application areas
src/auth/session.ts

+1 Error handling changed
src/payments/retry.ts

QA Focus

Critical regression
□ Verify a successful payment completes and the resulting status is correct for at least one real provider flow.
□ Confirm the deleted test(s) in tests/checkout.spec.ts reflect intentionally removed behavior rather than a workaround for a failing test.
□ Add manual verification for src/auth/session.ts in this release, since no related automated test change was detected.
□ Verify login succeeds with valid credentials and the resulting session behaves as it did before the change.
□ Confirm the removed assertion(s) in tests/checkout.spec.ts were intentional and the behavior they checked is still correct or tested elsewhere.
□ Verify the areas changed together in this pull request (auth, checkout, payment) integrate correctly, not only individually.
□ Verify errors are still logged or reported through the existing error-reporting path after this change.

Negative testing
□ Verify a declined payment is handled and surfaced correctly to the user, without charging them.
□ Verify a payment provider timeout does not leave the order or payment record in an inconsistent state.
□ Verify a declined retry attempt is surfaced correctly and does not silently succeed.
□ Verify a retry that times out waiting on the provider does not duplicate the original charge.
□ Verify an expired session is rejected and the user is redirected to re-authenticate.
□ Verify an invalid or tampered session token is rejected.
□ Verify the changed error path surfaces an actionable message rather than a generic failure.

Boundary testing
□ Verify a duplicate submission of the same payment request does not create a duplicate charge.
□ Verify a duplicate retry request (double-click or network resend) is deduplicated via an idempotency key.

Exploratory
□ Refresh the page during payment processing and confirm the payment is neither duplicated nor lost.
□ Navigate back in the browser after a failed payment and confirm no stale payment state is resubmitted.
□ Verify retrying after reconnecting to the network resumes correctly rather than starting a new payment attempt.
□ Verify a session expiring specifically during the payment or checkout flow does not leave a payment in an ambiguous state.
□ Trigger the actual failure condition directly, not just the catch block, to confirm the handler is reached in practice.

API
□ Verify provider error responses (4xx/5xx) are mapped to the correct application-level failure state.
□ Verify retry requests are idempotent: the same idempotency key must not create a second charge.

Data integrity
□ Confirm the payment status stored in the database matches the actual provider outcome after any retry.

Security
□ Verify session tokens are invalidated on logout and cannot be reused afterward.

Reasoning

payment processing and authentication behavior changed simultaneously,
while existing tests protecting related behavior were removed.

Notes

- No .releaselens.yml found; using default critical paths and thresholds.
- "Error handling changed" was detected with low confidence; verify manually
  before relying on it.
────────────────────────────────────
```

Everything under "Why" is a line item you can click into with
`release-lens explain <signal-id>` (see [Explainability](#explainability)).
Nothing here is a black-box score.

## Installation

Requires Node.js 20+.

```bash
npm install --global release-lens
```

Or run it without installing:

```bash
npx release-lens analyze
```

Not yet published to npm? Run it from source:

```bash
git clone https://github.com/<you>/release-lens.git
cd release-lens && npm install && npm run build
node dist/cli/bin.js analyze
```

## Quick start

Run it inside any Git repository:

```bash
release-lens analyze                          # uncommitted changes vs HEAD
release-lens analyze --base main              # everything since this branch diverged from main
release-lens analyze --base main --head feature/foo   # a specific branch-to-branch diff
release-lens analyze --json                   # structured output for tooling
release-lens analyze --markdown               # Markdown, e.g. for a CI job summary
release-lens analyze --fail-on high           # non-zero exit at HIGH or CRITICAL, for CI gating
release-lens explain                          # how the risk model works, and every signal
release-lens explain tests-deleted            # detail on one specific signal
release-lens report github --dry-run          # preview inline PR comments + check run (see GitHub Actions)
```

No configuration is required. Add a `.releaselens.yml` when you want to teach
ReleaseLens about your project's critical paths - see
[Configuration](#configuration).

## How risk scoring works

ReleaseLens tracks three separate numbers instead of one opaque score:

| Component     | What it means                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Inherent risk | Business/product risk from the change itself (payment logic, auth, a migration, a configured critical path)                       |
| Coverage risk | Risk that automated tests may not protect the change (no related test changes, tests deleted, assertions weakened, tests skipped) |
| Mitigation    | Evidence that reduces coverage risk specifically (new or meaningfully modified related tests)                                     |

```
score = inherentRisk + max(0, coverageRisk - mitigation)
```

**Mitigation can drive coverage risk to zero. It cannot touch inherent risk.**
Ten new tests do not make a payment-processing change inherently harmless -
they can fully address the _coverage_ question, but the _product_ risk of
touching payment logic doesn't disappear because a test file changed.
Removing tests or introducing a skipped test can only ever raise the score,
never lower it, because they're never treated as mitigation.

| Score | Level    |
| ----- | -------- |
| 0-3   | LOW      |
| 4-7   | MODERATE |
| 8-12  | HIGH     |
| 13+   | CRITICAL |

These thresholds (and every signal's weight) are defaults, validated against
the fixtures in `tests/integration/fixtures.test.ts`, and can be overridden
per project - see [Configuration](#configuration).

## Supported signals

23 signals, each a stable id you can pass to `release-lens explain <id>`.
"Contribution" is which risk component a signal affects; `informational`
signals appear as context but never change the score.

| id                           | Category          | Contribution  | Default weight      |
| ---------------------------- | ----------------- | ------------- | ------------------- |
| `production-logic-changed`   | change-management | informational | 0                   |
| `tests-added`                | coverage          | mitigation    | 2                   |
| `tests-modified`             | coverage          | informational | 0                   |
| `tests-deleted`              | coverage          | coverage      | 3                   |
| `production-without-tests`   | coverage          | coverage      | 3                   |
| `assertions-removed`         | coverage          | coverage      | 2                   |
| `tests-skipped`              | coverage          | coverage      | 2                   |
| `critical-path-changed`      | critical-path     | inherent      | configured per path |
| `authentication-changed`     | security          | inherent      | 3                   |
| `authorization-changed`      | security          | inherent      | 3                   |
| `payment-logic-changed`      | critical-path     | inherent      | 4                   |
| `api-endpoint-changed`       | change-management | inherent      | 2                   |
| `api-contract-changed`       | change-management | inherent      | 3                   |
| `database-migration-changed` | data              | inherent      | 3                   |
| `validation-logic-changed`   | reliability       | inherent      | 2                   |
| `error-handling-changed`     | reliability       | inherent      | 1                   |
| `configuration-changed`      | change-management | inherent      | 1                   |
| `dependencies-changed`       | change-management | inherent      | 1                   |
| `shared-core-changed`        | change-management | inherent      | 2                   |
| `permission-role-changed`    | security          | inherent      | 3                   |
| `datetime-logic-changed`     | reliability       | inherent      | 2                   |
| `large-change-surface`       | change-management | inherent      | 2                   |
| `multi-area-change`          | change-management | inherent      | 2                   |

Full detail on every signal - what it looks for, why it matters, what to do
about it - is available from the tool itself:

```bash
release-lens explain payment-logic-changed
```

None of these are filename matching alone. Detectors combine file paths,
changed-line content, diff structure (added vs. removed vs. context lines),
file role classification, and repository configuration. See
`docs/architecture.md` for how the code-to-test relationship heuristic works
in detail.

## Recommendations

Recommendations are generated from evidence, not templated filler. Compare:

> **Bad:** Test edge cases.
>
> **What ReleaseLens produces instead**, when validation logic changes:
> "Verify discount value at the minimum allowed value, the maximum allowed
> value, one below the minimum, and one above the maximum."

> **Bad:** Perform regression testing.
>
> **What ReleaseLens produces instead**, when authorization logic changes:
> "Verify a direct API request bypassing the UI is still enforced by the
> same authorization check." / "Verify a role removed while a user has an
> active session is enforced on the next request, not only at login."

Recommendations are grouped by testing category (smoke, regression,
negative, boundary, exploratory, API, data integrity, permissions, security,
and others where relevant) and ordered by the risk weight of the evidence
behind them - the highest-risk category comes first. A category with nothing
to say about it is simply absent; ReleaseLens does not pad the checklist.

When two signals fire together and raise a question neither raises alone -
payment logic changing alongside a database migration, for example -
ReleaseLens adds recommendations specific to that combination (data
consistency between the database write and the provider confirmation, in
that case). See `src/recommendations/combinations.ts`.

## Configuration

Optional. Create `.releaselens.yml` at your repository root:

```yaml
criticalPaths:
  - path: 'src/payments/**'
    name: 'Payments'
    risk: 4
  - path: 'src/auth/**'
    name: 'Authentication'
    risk: 4

testPatterns:
  - '**/*.spec.ts'
  - '**/*.test.ts'
  - '**/tests/**'

ignore:
  - 'docs/**'
  - '**/*.md'

featureMappings:
  - production: 'src/checkout/**'
    tests:
      - 'tests/e2e/checkout.*'

risk:
  largeChangeThreshold: 500
  thresholds:
    moderate: 4
    high: 8
    critical: 13
  weightOverrides:
    dependencies-changed: 2
```

A full annotated example lives at [`examples/.releaselens.yml`](examples/.releaselens.yml).
Every key is optional; omit a section to use its default. Invalid entries in
your config are skipped with a warning (shown in the report's Notes section)
rather than failing the analysis.

## GitHub Actions

Two complementary integration points: a job summary (always useful, needs
nothing but the CLI) and `report github` (richer, needs a token and PR
context, which a `pull_request` workflow already has).

```yaml
name: ReleaseLens

on:
  pull_request:

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: write
      checks: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          node-version: '20'

      - run: npm install --global release-lens
      - run: git fetch origin "${{ github.base_ref }}"

      - name: Publish to the job summary
        run: |
          release-lens analyze --base "origin/${{ github.base_ref }}" --markdown \
            >> "$GITHUB_STEP_SUMMARY"

      - name: Post inline review comments and a check run
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: release-lens report github --base "origin/${{ github.base_ref }}"
```

`report github` needs no flags inside a standard `pull_request` job: it
reads the repository, pull request number, and head commit SHA from the
environment GitHub Actions already provides (`GITHUB_REPOSITORY` and the
`pull_request` event payload at `GITHUB_EVENT_PATH`), and the token from
`GITHUB_TOKEN`. It then:

- **Posts one PR review** containing an inline comment on every diff line a
  signal's evidence points to (payment/auth/validation/datetime/permission
  keyword matches, newly skipped tests, a field narrowed from optional to
  required, and similar - see `docs/architecture.md` for exactly which
  signals carry line-level evidence), plus the full report as the review's
  summary body for everything that isn't line-specific.
- **Creates a Check Run** named "ReleaseLens" showing the risk level and
  score. Without `--fail-on`, it's informational only (`neutral`, never
  blocks a merge). With `--fail-on high` (for example), it becomes a real
  gate: `failure` at HIGH or CRITICAL, `success` otherwise - matching
  `analyze --fail-on`'s semantics exactly.
- Supports `--dry-run` to print exactly what it would post, without a token
  or network access - useful for testing a workflow change locally.

This repository's own [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
does the equivalent against its own pull requests (see
[Dogfooding](#dogfooding)) - it builds ReleaseLens from source rather than
installing it, since it can't yet depend on its own published package.

## Explainability

Transparency isn't a footnote here - it's the point. Two commands:

```bash
release-lens explain                 # the risk model, every signal, how config changes behavior
release-lens explain tests-deleted   # one signal, in depth
```

`explain <signal>` output:

```
tests-deleted

Title:
Tests were deleted

Why it matters:
Removing tests can remove evidence that previously protected existing
behavior, whether or not the removal was intentional.

Default weight:
3

Category:
coverage

Risk contribution:
coverage

Confidence:
high

What ReleaseLens looks for:
Deleted test files, or a net reduction in test-case declarations within a
modified test file.

Possible QA response:
Confirm the removed tests were removed intentionally because the behavior
they covered was intentionally removed or changed, not because they were
inconvenient to keep passing.
```

This text isn't documentation written separately from the code - it's read
directly from the same `SignalDefinition` object the detector uses, so it
can't drift out of sync with what actually fires.

## JSON output

`--json` produces a stable, documented schema:

```jsonc
{
  "schemaVersion": 1,
  "comparison": { "base": "main", "head": "HEAD" },
  "summary": {
    "totalFiles": 4,
    "productionFiles": 3,
    "testFiles": 1,
    "configFiles": 0,
    "otherFiles": 0,
  },
  "affectedAreas": [{ "name": "payment", "files": ["src/payments/retry.ts"] }],
  "signals": [
    {
      "id": "payment-logic-changed",
      "title": "Payment processing changed",
      "category": "critical-path",
      "contribution": "inherent",
      "weight": 4,
      "confidence": "medium",
      "explanation": "...",
      // "line" is present when evidence points at a specific diff line (used for
      // inline PR review comments); omitted for file-level evidence.
      "evidence": [
        {
          "file": "src/payments/retry.ts",
          "description": "Payment processing changed",
          "line": 12,
        },
      ],
      "affectedFiles": ["src/payments/retry.ts"],
    },
  ],
  "risk": {
    "inherentRisk": 7,
    "coverageRisk": 4,
    "mitigation": 1,
    "score": 10,
    "level": "high",
    "breakdown": [
      {
        "signalId": "payment-logic-changed",
        "title": "Payment processing changed",
        "contribution": "inherent",
        "points": 4,
      },
    ],
  },
  "recommendations": [
    {
      "id": "regression-1",
      "category": "regression",
      "text": "...",
      "rationale": "...",
      "signalIds": ["payment-logic-changed"],
      "priority": 4,
    },
  ],
  "reasoning": "...",
  "notes": [],
}
```

The terminal, Markdown, and JSON reporters all render the same
`AnalysisResult` - nothing is computed in one output format that's absent
from another.

## Examples

`tests/integration/fixtures.test.ts` contains ten realistic scenarios used
as both integration tests and worked examples, covering: a docs-only change,
a CSS-only change, validation logic with tests added, checkout logic without
tests, a combined payment/auth/migration change, test deletion, newly
skipped tests, a large but well-tested refactor, an API contract narrowed
from optional to required, and a permission/role model change. Reading that
file is the fastest way to see exactly what triggers what.

## Architecture

See [`docs/architecture.md`](docs/architecture.md) for the full design
rationale, including why risk separates inherent/coverage/mitigation, why
signals carry their own explanation text, and how the code-to-test mapping
heuristic works. In short:

```
src/git/             raw `git diff` → normalized ChangedFile[]
src/classification/  file role, language, and affected-area detection
src/signals/         one detector per signal, each producing evidence
src/risk/            signals → inherent/coverage/mitigation → score/level
src/recommendations/ signals → concrete, evidence-tied QA checklist
src/reporters/       terminal / JSON / Markdown views of the same result
src/config/          .releaselens.yml parsing, validated with graceful fallback
src/cli/             command parsing, thin wrapper around src/analyze.ts
```

## What ReleaseLens does not know

This matters enough to say directly. Source-code changes alone cannot reveal:

- **Actual production usage.** A one-line change to a function called on
  every request is not treated differently from the same change to dead code.
- **Business or revenue impact.** ReleaseLens can tell you payment code
  changed; it cannot tell you how much revenue depends on the path you
  changed.
- **Undocumented business rules.** If a rule isn't visible in the diff or a
  test, ReleaseLens cannot know it exists, let alone that it was violated.
- **Incident history.** A file that has caused three production incidents
  gets no special treatment unless you mark it as a critical path.
- **Hidden dependencies.** Cross-service or cross-repository callers of an
  API you changed are invisible to a single-repository diff.
- **The quality of unchanged tests.** A related test file that wasn't
  touched might be excellent, stale, or flaky - ReleaseLens only knows it
  exists (or doesn't).

Confidence levels (`high`/`medium`/`low`) on each signal are ReleaseLens
telling you how much to trust its own pattern match, not how risky the
underlying change is. A `low`-confidence signal is flagged in the report's
Notes section specifically so it doesn't get read with the same weight as a
structural, high-confidence one.

ReleaseLens is built to prioritize where a QA engineer looks first. It is
not built to replace the judgment they apply once they're looking.

## Limitations

- Detection is pattern-based (paths, line content, diff structure), not
  AST-based. It can miss a real relationship (e.g. an unusual import style)
  and, less often, match something coincidentally.
- The code-to-test heuristic can tell you a related test file wasn't
  touched; it can't tell you that a file has zero test coverage anywhere in
  the codebase.
- Content-keyword detectors (payment, authentication, validation, etc.)
  match substrings deliberately, to catch camelCase identifiers like
  `processPayment`. This trades a small amount of precision for recall
  across five languages' naming conventions - see `src/signals/keywords.ts`.
- Weights and thresholds are calibrated against the fixtures in this
  repository, not against a large corpus of real-world pull requests. Tune
  them for your project via `.releaselens.yml`.
- Language support is deliberately shallow but broad: JavaScript/TypeScript,
  Python, Java, C#, Go, and Ruby test conventions are recognized by
  convention, not by parsing each language properly.

## Dogfooding

This repository runs ReleaseLens against its own pull requests in CI
(`.github/workflows/ci.yml`), posting the Markdown report to the job summary
and as a pull request comment. If a QA tool isn't useful on its own commits,
it isn't useful.

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md), which includes a full walkthrough
for adding a new signal. Also see
[`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md) and
[`SECURITY.md`](SECURITY.md).

## Roadmap

**v0.1** - local Git diff analysis, 23 explainable signals, risk
classification, QA recommendations, terminal/JSON/Markdown output,
`.releaselens.yml` configuration, a GitHub Actions example.

**v0.2 (this release)** - richer GitHub PR integration: `release-lens report
github` posts line-anchored inline review comments and a Check Run
reflecting risk level, with `--fail-on` for CI gating; `analyze --fail-on`
for the same gating without GitHub specifically; line-number evidence for
the ten signals where a specific line is meaningful.

**v0.3 (planned)** - additional language/framework detection, custom
feature-to-test mappings beyond the current `featureMappings` config,
test-history integration, flaky-test context, coverage-diff context,
CODEOWNERS-aware evidence.

**v0.4 (planned)** - OpenAPI-specific contract analysis, historical risk
trends across releases, escaped-defect/incident context.

Items beyond v0.2 are intentions, not commitments, and are not implemented.

## Project philosophy

- More tests do not automatically mean less risk.
- Code coverage is not product coverage.
- A passing test suite is evidence, not proof.
- Risk should influence QA effort, not replace it.
- Changes to high-impact behavior deserve different scrutiny than cosmetic
  changes.
- Automated analysis should explain itself, and uncertainty should be
  visible rather than hidden.

## License

[MIT](LICENSE)
