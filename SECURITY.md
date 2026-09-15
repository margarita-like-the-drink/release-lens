# Security Policy

## Scope

ReleaseLens is a local, offline analysis CLI. It reads Git history and
repository files on disk and never sends repository content to a remote
service. The main security-relevant surfaces are:

- Parsing of `.releaselens.yml` (user-controlled YAML)
- Parsing of `git diff` output
- Shelling out to the `git` binary

## Reporting a vulnerability

If you find a security issue - for example, a way for a crafted repository
or configuration file to cause unintended command execution, path traversal
outside the repository, or a crash that could be used for denial of service
in CI - please report it privately rather than opening a public issue.

Use GitHub's "Report a vulnerability" feature under the Security tab of this
repository. Please include:

- A description of the issue and its impact
- Steps to reproduce, or a minimal repository/configuration that triggers it
- The ReleaseLens version and Node.js version used

We aim to acknowledge reports within a few business days. Please give us a
reasonable amount of time to address an issue before any public disclosure.

## Out of scope

- Vulnerabilities in `git` itself
- Issues that require the attacker to already control the machine running
  ReleaseLens
