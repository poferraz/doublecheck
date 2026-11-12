# Changelog

All notable changes to `doublecheck` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Documentation
- Document the published 0.2.0 release, npm installation and post-publication verification. The published package remains unchanged.
- Add an animated repository hero showing the two review perspectives and their shared evidence report, with a static alternative and reproducible motion source.

## [0.2.0] - 2026-11-11

Published on [npm](https://www.npmjs.com/package/@poferraz/doublecheck/v/0.2.0) and as [GitHub release v0.2.0](https://github.com/poferraz/doublecheck/releases/tag/v0.2.0).

### Audit remediation
- Reject failure diagnostics and nonempty error lists in complete report gates, including after JSON serialization.
- Preserve confirmed findings through canonical path-alias deduplication and malformed custom-engine coverage/provenance.
- Enforce native process deadlines across the OCR launcher and descendants instead of waiting for cooperative termination.
- Correct Antigravity 2 skill installation guidance to the current project discovery path, observed in the host's built-in customization guide.
- Block reserved OCR provider-name collisions and explicitly reported remote models without consent; recheck installed model routing before native execution.
- Reject OCR selectors that reinterpret literal filenames, bind complete manifests to the real selected files, and preserve in-scope findings with labeled supporting files.
- Reconcile report and engine findings, retain blockers on inconsistent input, and fail closed when the library exit helper receives an invalid report or raw audit result.
- Preserve imported findings when native preflight is unavailable; reject conflicting doctor/init operations and provide safe actionable CLI messages.
- Bound correlation work/output, avoid argument-stack overflow in remediation rendering, reject special findings files, and skip Markdown rendering for JSON-only output.
- Enforce OCR 1.13.3 in direct library scans and suppress its automatic updater for managed invocations.
- Validate canonical verdict evidence; malformed custom findings retain valid siblings and prevent a complete review.
- Preserve existing agent exports, refuse unsafe destinations, emit a discoverable Cursor `.mdc` rule, and print non-clobbering review-policy installation guidance.
- Repair checkout invocation guidance and packaged documentation links; render finding IDs, bounded reproduction evidence and unknown-coverage guidance.

- Auto-select an installed model compatible with the selected provider; accept the default `:latest` alias while retaining explicit model and cloud-consent boundaries.
- Recover owned saved sessions after failed scans leave truncated/malformed output; reject invalid recovery time windows.
- Refuse invalid complete-engine fixtures and incomplete agent exports; harden mock inference requests and IPC startup waits.


- Added a configurable 20-minute overall native scan deadline, timeout diagnostics, and separately labeled requested inference/execution context.
- Added conservative recovery of newly created OCR sessions identified by the failed process, retaining partial/unknown coverage.
- Fixed inherited-property bypasses in pinned-schema validation and diagnosed malformed canonical report inputs while preserving valid siblings.


### Changed
- Report schema v2 preserves verification states, canonical findings, exact location correlations, and per-engine coverage/provenance.
- Incomplete reviews and blocking unresolved candidates exit 2; complete confirmed high/critical reviews exit 1. Correlation no longer escalates severity or implies calibrated confidence.
- Native OCR 1.13.3 full-file scan coverage remains unknown/partial; the adversary adapter is explicitly import-only.
- Inference requires matching named custom-provider configuration and explicit remote opt-in. Empty models/missing OCR fail preflight.
- Strict CLI arguments, distinct staged report outputs, root REVIEW.md initialization with overwrite protection, shared generic template, and repaired export links.
- Supported Vitest CI runtimes, packaged Node 20 consumer checks, offline CLI integration, and separate manual native OCR conformance workflow.

### Migration for 0.2.0
- Consume `schemaVersion: doublecheck/report/v2`; use `correlations.length` instead of removed convergence-defect counters.
- Custom runners return EngineResult objects; raw-array runners remain partial. Native OCR comments remain candidates until verified.
- `normalizePath` is display-only; use root-aware canonicalization for identity. Deprecated source arrays contain normalized records.
- Package and lockfile metadata are aligned at 0.2.0. Native unknown coverage remains partial; do not suppress exit 2 in CI.

## [0.1.1] - 2026-10-24

### Added
- **Claude Code Review Integration:** Added native integration with Anthropic's [Claude Code Review](https://code.claude.com/docs/en/code-review).
- **`--init-review` CLI Flag:** Command to scaffold `.github/REVIEW.md` directly into any repository, encoding `doublecheck`'s dual-lens methodology into GitHub PR checks.
- **`convert.sh review-md` Target:** Added export capability to generate standalone `REVIEW.md` for team-wide PR governance.
- **Defense-in-Depth Reference Manual:** Added `skills/doublecheck/references/defense-in-depth.md` defining the two-tier security model (local Ollama inner loop + cloud PR review outer loop).
- **Canonical Library Export:** Added `src/index.js` exporting the full programmatic API for external Node.js consumers.
- **Community Templates:** Added GitHub issue templates for bug reports and attack class requests, plus a pull request checklist template.

### Security & Hardening
- **Process Execution:** Replaced shell string interpolation in `src/orchestrator.js` and `src/doctor.js` with parameterized `execFileSync` argument arrays, eliminating command injection risks.
- **Filesystem Isolation:** Replaced predictable `/tmp` filenames with secure, isolated directories via `fs.mkdtempSync(path.join(os.tmpdir(), 'doublecheck-'))` with guaranteed `finally` cleanup.
- **Path Traversal Protection:** Hardened `normalizePath` in `src/reporter.js` against relative directory traversal attacks (`../`).

---

## [0.1.0] - 2026-10-23

### Added
- **Dual-Perspective Audit Engine:** Multi-perspective code security and architecture review synthesizing Cloudflare's Adversary lens and Alibaba's Architect lens.
- **Convergence Engine:** Automatic detection and elevation of overlapping defects to Priority 0 Immediate Blockers.
- **Local Ollama Inference:** 100% private, zero-token-cost local LLM execution supporting DeepSeek V4, Qwen 2.5 Coder, and Mistral.
- **Universal Agent Skill:** Formatted to the Agent Skills specification for Claude Code, Cursor, Windsurf, and Google Antigravity.
- **Reporting Engine:** Formatted Markdown and structured JSON report outputs.
