# Doublecheck 0.2.0 — Published Release

Doublecheck combines adversary and architect review evidence while preserving verification state, coverage limits, and tool provenance. It produces Markdown and JSON v2 reports for developers and AI agents.

Current native OCR scans use explicit provider routing and remain partial where OCR 1.13.3 supplies no coverage manifest. The adversary adapter imports findings; it is not an autonomous security scanner. Location overlap does not establish severity, independent verification, or a mathematical confidence guarantee.

## Release links and installation

Published November 11, 2026 (America/Vancouver): [npm package](https://www.npmjs.com/package/@poferraz/doublecheck/v/0.2.0) · [GitHub release](https://github.com/poferraz/doublecheck/releases/tag/v0.2.0). Tag `v0.2.0` points to merged commit `c62e794164803ae919dd16a8955dc3f595c356ac`.

Install the CLI with Node.js `>=20.0.0`:

```bash
npm install --global @poferraz/doublecheck@0.2.0
doublecheck --help
```

For a project-local CLI or library, use `npm install @poferraz/doublecheck@0.2.0`, then `npx doublecheck --help` or import the ESM API. Native scans require the separate OCR/provider/model setup in the [README](../README.md#configure-and-run-a-native-scan).

## Announcement copy

Doublecheck 0.2.0 is available on npm. It combines adversary and architect review evidence in Markdown and JSON reports while keeping verification state, coverage and tool provenance visible. Report schema v2 keeps unresolved candidates separate from confirmed findings, and incomplete reviews return exit code 2. Install `@poferraz/doublecheck@0.2.0` and read the migration notes before upgrading library callers.

## Validation to describe accurately

All six final PR checks and five post-merge CI jobs passed. Each development runtime passed 267 tests across 26 files and the separate 6-test CLI integration suite. Fresh anonymous public-registry installations on Node 20.0.0 and 26.13.0 passed CLI help, review-instruction initialization and library API checks. All 37 installed files and executable modes matched the frozen verified tarball, with matching SRI. The published artifact was not repacked; later repository documentation updates do not change it.

Use the [README](../README.md) and [release/migration notes](RELEASE_0.2.0.md) for the supported contract, and the [release-readiness record](verification/2026-11-09-release-readiness.md) for publication evidence and dated checks.

Position this as evidence-preserving review tooling. Hosted Codex and Antigravity desktop activation were each checked on two synthetic files. Antigravity CLI also expanded the skill, but its captured answer was truncated. Other exported hosts do not have interactive acceptance evidence. These checks establish bounded activation, not measured detection accuracy or executed vulnerability confirmation.

Native OCR 1.13.3 full-file scans still lack a coverage manifest and return 2. Avoid claims of guaranteed private or zero-cost inference, calibrated confidence, or automatic hosted-review enforcement. A loopback endpoint can forward requests; model and provider policies remain part of the user's setup.
