# Doublecheck 0.2.0 — Prepared Release Notes

Doublecheck combines adversary and architect review evidence while preserving verification state, coverage limits, and tool provenance. It produces Markdown and JSON v2 reports for developers and AI agents.

Current native OCR scans use explicit provider routing and remain partial where OCR 1.13.3 supplies no coverage manifest. The adversary adapter imports findings; it is not an autonomous security scanner. Location overlap does not establish severity, independent verification, or a mathematical confidence guarantee.

Before announcing a release, run the complete regression suite, packaged consumer checks, native mock-inference workflow, and relevant host discovery checks. Describe any unexecuted category explicitly. Remove claims of zero-cost guaranteed private inference, 100% confidence, or automatic hosted-review enforcement.

Package and lockfile versions are aligned at 0.2.0. No publication, Git tag or push is part of this preparation. Use README.md and docs/RELEASE_0.2.0.md for the supported contract; use docs/verification/2026-11-09-release-readiness.md for executed checks and remaining validation limits.

Position this as evidence-preserving review tooling. Hosted Codex activation was checked on two synthetic files. Antigravity activation is paused by request; other exported hosts do not have interactive acceptance evidence. Do not describe those integrations as runtime-verified or claim measured detection accuracy.
