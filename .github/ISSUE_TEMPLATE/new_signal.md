---
name: New risk signal proposal
about: Propose a new QA risk signal for ReleaseLens to detect
title: 'Signal: '
labels: signal-proposal
assignees: ''
---

**Signal name**

A short, descriptive title (e.g. "Feature flag changed").

**Why it matters for QA**

What can go wrong when this kind of change ships, that existing signals
don't already cover?

**What ReleaseLens should look for**

Be as concrete as possible - file paths, keywords, diff patterns, or
repository conventions this signal should key off of. See
`src/signals/keywords.ts` and existing detectors in
`src/signals/detectors/` for the level of specificity that works well.

**Risk contribution**

Should this be `inherent` (business/product risk), `coverage` (risk of
under-tested behavior), `mitigation` (reduces coverage risk), or
`informational` (context only, no score impact)? See `docs/architecture.md`.

**Example recommendations**

What should a QA engineer actually test when this fires? Give 2-3 concrete
examples in the style of "verify X at boundary Y", not "test edge cases".

**Example scenario**

A short before/after code snippet or repository change that should trigger
this signal, for use as a test fixture.
