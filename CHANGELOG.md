# Changelog

All notable changes to this project are documented in this file. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project uses [Semantic Versioning](https://semver.org/).

## [0.2.0] - Unreleased

### Added

- `release-lens report github`: posts inline PR review comments anchored to
  the specific diff line a signal's evidence points to, plus a Check Run
  ("ReleaseLens") showing the risk level and score. Reads repository, PR
  number, and head SHA from the standard GitHub Actions environment, so it
  needs no flags inside a `pull_request` workflow job. Supports `--dry-run`.
- Line-number evidence for the ten signals where a specific line is
  meaningful (payment, authentication, authorization, permissions,
  validation, datetime, API endpoints, error handling, skipped tests, and
  optional-to-required contract fields), threaded through from diff parsing.
- `--fail-on <level>` on both `analyze` and `report github`, so either can
  gate CI on a minimum risk level (low/moderate/high/critical) with
  identical semantics.

### Changed

- This repository's own CI workflow now uses `report github` instead of a
  hand-written `actions/github-script` comment step.

## [0.1.0]

### Added

- Initial release: `release-lens analyze` and `release-lens explain`.
- 23 QA risk signals covering coverage, critical paths, security-relevant
  behavior (authentication, authorization, permissions), data (migrations,
  API contracts), and change-management concerns (large diffs, multi-area
  changes, dependencies, configuration).
- Explainable risk model separating inherent risk, coverage risk, and
  mitigation, with configurable thresholds and per-signal weight overrides.
- A recommendation engine producing concrete, evidence-tied QA checklists
  grouped by testing category.
- Terminal, JSON, and Markdown report output.
- `.releaselens.yml` configuration: critical paths, test patterns, ignore
  patterns, shared/core paths, explicit feature-to-test mappings, and risk
  tuning.
- Language-neutral test-convention recognition for JavaScript/TypeScript,
  Python, Java, C#, Go, and Ruby.
- GitHub Actions workflow example publishing a Markdown report to the job
  summary.
