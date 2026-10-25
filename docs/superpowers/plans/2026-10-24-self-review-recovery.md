# Self-review Recovery Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline. The user requested plan, fix, and rerun together; proceed through verification without an additional approval gate.

**Goal:** Finish real repository scans without the observed premature cutoff and preserve useful evidence on failure.
**Architecture:** Configurable bounded execution, conservative OCR saved-session recovery, shared canonical finding validation.
**Tech Stack:** Node >=20, ESM, zero runtime dependencies, Vitest.
**Spec:** docs/superpowers/specs/2026-10-24-self-review-recovery-design.md

## Global Constraints

- Reuse codex/review-reliability; no publication or provider configuration changes.
- Default overall deadline 1200 seconds; library timeout remains milliseconds.
- Native/recovered comments remain candidates; unknown coverage remains partial.
- Recovery requires one exact native stderr session marker, a new session ID, and canonical repo/model/time; ambiguous discovery fails closed.
- No raw external errors/credentials in reports.

## Review Focus

- Invalid/overflow deadline values fail before inference.
- Concurrent or stale sessions must not be imported.
- Malformed metadata/comments must not become successful recovery.
- Explicit hard engine failures must survive identity/process warnings.
- Malformed public report input must retain valid siblings without clean completion.

### Task 1: Deadline, execution diagnostics, and conservative recovery

**Files:** src/cli.js, src/orchestrator.js; create src/ocr-session.js; tests/cli.test.js, tests/orchestrator.test.js, new tests/ocr-session.test.js.
**Interfaces:** --scan-timeout seconds -> options.timeout milliseconds. Native engines add requestedInference and execution metadata. Session helper snapshots IDs and recovers one new matching session via bounded OCR session commands, returning validated normalized comments and completed-file context. Canonical coverage remains unknown.

- [x] Add regressions for deadline defaults/validation/forwarding, timeout vs process failure, retained requested routing/revision, new-session recovery, absent/stale/ambiguous/wrong model/malformed metadata rejection, and native explicit-failure preservation.
- [x] Run focused tests; observe expected failures.
- [x] Implement timeout parser, execution metadata and safe diagnostics, bounded recovery helper, and integration in native adapter. Display execution/session context in Markdown.
- [x] Run focused and full tests; checkpoint locally.

### Task 2: Validated finding/report boundaries

**Files:** src/contracts.js, src/engine-result.js, src/reporter.js; tests/contracts.test.js, tests/reporter.test.js.
**Interfaces:** validateCanonicalFinding(source, finding, target) shared between custom engine and report boundary. Invalid report records become diagnostics, retaining valid siblings and preventing complete status.

- [x] Add failing inherited-property and malformed canonical findings/engine regressions.
- [x] Observe RED, implement own-property lookup and shared validation, run GREEN plus full suite.
- [x] Document CLI deadline/recovery semantics in README and changelog, checkpoint locally.

### Task 3: Verification and live rerun

**Files:** docs/verification/self-review-recovery.md.
- [ ] Run full suite, packaged consumer smoke, native preview, syntax/whitespace checks.
- [ ] Fresh final review of this fix range; handle important findings with one regression-backed corrective pass.
- [ ] Rerun production CLI on the entire repo with authorized DeepSeek cloud model and both output formats, outside the source tree. Inspect actual process outcome, provenance, diagnostics, and retained candidates.
- [ ] Record results and limits, commit local changes, leave clean checkout.
