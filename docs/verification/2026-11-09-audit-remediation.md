# Audit remediation — November 9, 2026

The four release blockers from `2026-11-09-project-audit.md` were addressed first. The remaining findings were then fixed with focused regressions. This record describes the current working-tree changes; it does not announce or publish a release.

| Audit ID | Change | Regression evidence |
| --- | --- | --- |
| T1 | Reject OCR built-in names for custom routing; inspect installed model remote metadata and repeat routing checks in the native adapter. | `tests/inference-policy.test.js`, `tests/doctor.test.js`: name collisions, remote host/model, automatic model selection, allowed remote control. |
| T2 | Reject literal paths OCR's trimmed comma selector cannot represent before provider checks or scan execution. | `tests/native-selection.test.js`: comma, compound names, whitespace, backslash and ordinary embedded-space control. |
| T3 | Bind manifests to actual selected regular files, Git working-tree inventory and engine target provenance; distinguish supporting files and out-of-scope findings. Synthetic complete fixtures now refer to real files. | `tests/scope.test.js`, `tests/helpers-results.test.js`, `tests/report-integrity.test.js`: wrong/deleted file, incomplete subtree, ignored/tracked/untracked entries, symlink escape, missing/wrong provenance and truncated persisted inventory. |
| T4 | Reconcile engine and aggregate findings, preserve blockers on inconsistent input and refuse wrong-stage/malformed exit-helper inputs. Keep target identity and a digest/count of the validated file set in the report-time snapshot, and retain custom-runner failure metadata. | `tests/report-integrity.test.js`, `tests/report-policy.test.js`: missing aggregate, contradictory copies, serialized payload mutations, custom-runner failed/timed-out execution and blocking/unknown diagnostics, valid complete/blocked controls. |
| T5 | Stage platform exports privately; refuse unsafe ancestors and occupied platform destinations. Installation guidance uses the preserving initializer. | `tests/convert.test.js`: external sentinel through linked output, symlink/writable ancestors, occupied output and existing team policy preservation. |
| T6 | Bound correlations with explicit truncation status; render remediation fences without argument spreading; reject special or oversized imports using an opened descriptor and bounded reads; JSON-only generation skips Markdown. | `tests/correlation.test.js`, `tests/reporter.test.js`, `tests/native-boundaries.test.js`, `tests/cli.integration.test.js`: heavily shared locations, 280 KB valid remediation, FIFO, size limit and real JSON output. |
| T7 | Disable OCR updater for doctor/native/session/contract checks and enforce supported version in both doctor and native adapter. | `tests/doctor.test.js`, `tests/native-boundaries.test.js`: exact supported version, unsupported variants, zero scans after refusal and suppressed updater environment. |
| T8 | Enforce the source-specific canonical verdict contract and retain valid siblings when custom findings are malformed. | `tests/contracts.test.js`: recomputed architect confirmation, absent adversary verification, inconsistent severity and valid sibling retention. |
| T9 | Replace the public `npx` assumption with checkout/installed CLI guidance; ship essential README-linked documents and use a versioned upstream workflow link. | `tests/package-links.test.js`: unpack the real npm tarball and resolve all local README links; packaged smoke executes help, initialization and the library. Human prose is reviewed directly. |
| T10 | Emit a Cursor `.mdc` rule with activation metadata and retain linked reference manuals. | `tests/export-links.test.js`, `tests/convert.test.js`: generated entry metadata and actual file/anchor links. |
| T11 | Import and save independent findings with a failed native engine when preflight is unavailable; exit 2 without starting native inference. | `tests/cli-recovery.test.js`: preflight failure retains a confirmed high and native-preflight diagnostic with zero scan calls. |
| T12 | Explain unknown coverage in CLI output, show bounded reported reproduction evidence and resolvable finding anchors, preserve policy with a specific hint, reject doctor/init combinations and identify unknown flags safely. | `tests/cli-recovery.test.js`, `tests/report-integrity.test.js`, `tests/reporter.test.js`: output, actual policy bytes, error redaction and linked evidence. |

Compatibility details: `getReviewExitCode` consumes the synthesized v2 JSON report, including after JSON serialization; raw `AuditResult` input returns 2. Complete directory manifests cover all tracked and unignored files under a Git selection, or regular files under a non-Git selection. Existing export platform directories must be preserved and regenerated into a fresh destination. Correlation truncation preserves every individual finding; standalone `detectConvergence` rejects overflow rather than silently returning an incomplete list.

Final verification on Node 26.12.0 / npm 11.20.0, all exit code 0:

- `npm test -- --no-cache --maxWorkers=2`: 25 files, **218 tests passed** (baseline: 146).
- `npm run test:integration`: **6 tests passed**, also included in the full suite.
- `npm run smoke:consumer`: packed CLI and library passed without devDependencies.
- `node scripts/verify-ocr-contract.mjs --preview-only`: real OCR 1.13.3 selection preview passed; inference/output conformance was not exercised.
- `bash -n scripts/convert.sh` and `git diff --check`: passed.

 Checks use synthetic fixtures and temporary files. Native preview verifies real OCR file selection without inference. Live model quality, hosted-review behavior and interactive Cursor activation remain separate validation categories; no user provider configuration is changed by these tests.
