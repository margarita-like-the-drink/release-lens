# Changelog

All notable changes to this project are documented in this file. The format
is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project uses [Semantic Versioning](https://semver.org/).

## [0.1.0] - Unreleased

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
