# Doublecheck 0.2.0

Version 0.2.0 preserves the distinction between a finding, its verification state and scan completion. It prepares Markdown and JSON evidence for developers, CI consumers and coding agents. This package is prepared for release; publication and tagging are separate actions.

## What changes

- Report schema `doublecheck/report/v2` retains canonical findings, confirmed and unresolved records, rejected claims, per-engine provenance, coverage and diagnostics.
- Correlation requires exact file identity and overlapping known line ranges. Overlap is informational; it does not confirm a finding or increase its severity. Large overlap sets are bounded and truncation is disclosed without dropping individual findings.
- Native OCR comments remain candidates. Imported confirmed findings must satisfy the pinned verification contract. Malformed input retains valid siblings and prevents a complete review.
- Inference requires a matching named custom OCR provider and installed model. Built-in provider names cannot shadow approved custom routing. Remote endpoints, cloud-tagged models and explicitly reported remote backing require consent. Endpoint checks do not prove locality or prevent a forwarding daemon.
- Native scans enforce OCR 1.13.3, disable its updater and have a bounded process deadline. Owned-session recovery preserves incomplete status.
- Report writes are staged with restrictive permissions. Existing agent export destinations and team review instructions are preserved. Cursor exports use a `.mdc` entry; references are included.

## CLI migration

Use `--mode architect` for the native architect lens. Default `dual` also requires adversary evidence; `--findings` imports that JSON and does not run an independent security scanner. A failed native preflight can still save valid imported evidence in a partial report.

| Exit | Meaning |
| --- | --- |
| 0 | Required coverage is complete, without confirmed high/critical findings or unresolved high/critical/unrated candidates. |
| 1 | Required coverage is complete and confirmed high/critical findings exist. |
| 2 | Coverage is incomplete, blocking candidates remain, or invocation/preflight/output failed. |

OCR 1.13.3 does not report full-file coverage manifests. Its native scans therefore remain partial and return 2 even if the process succeeds with no findings. Do not turn that result into a passing CI gate by ignoring the exit status.

## Library migration

```js
import {
  runDualAudit,
  synthesizeReport,
  getReviewExitCode,
} from '@poferraz/doublecheck';

const audit = await runDualAudit(targetPath, options);
const report = synthesizeReport(audit);
const code = getReviewExitCode(report.json);
```

`getReviewExitCode` accepts the synthesized v2 JSON report, including a serialized round trip. A raw audit result or malformed report returns 2. Engine and aggregate findings are reconciled; contradictory copies retain blockers and lose gate eligibility. The report contains the validated target identity and a digest/count of the covered file set, so saved coverage cannot silently truncate without invalidating the gate.

Custom runners return `EngineResult` objects with `source`, `status`, canonical `findings`, `diagnostics`, `coverage` and `provenance`. The coverage fields are `selected`, `reviewed`, `failed`, `excluded` and `origin`. Complete claims must identify the correct root/revision and cover the actual selection: tracked and unignored files in a Git worktree, or regular files in a non-Git selection. Raw-array runners remain accepted with unknown coverage and partial status. Failed execution and opaque diagnostics cannot become a successful gate through custom-runner normalization.

Use `report.json.correlations.length` instead of removed `convergedCount` or `summary.convergedDefects`. Inspect `correlationSummary.truncated`; standalone `detectConvergence` rejects overflow instead of silently returning a partial array. `normalizePath` is for display only; `canonicalizeFindingPath` provides root-aware lexical identity, not filesystem confinement. Deprecated `cloudflareFindings` and `alibabaComments` fields contain normalized records.

## Validation and limits

The offline regression suite, packaged consumer smoke, real OCR cloud execution and real timeout path have been checked. Supported runtime and CI results for the prepared artifact are recorded in the repository's release-readiness record. Hosted Codex loaded and followed the export on two synthetic source files. These observations do not establish model precision or recall. A safe-control candidate made an unsupported contract assumption and remained unconfirmed.

Antigravity desktop 2.31.0 discovered and applied the project-scoped skill in a fresh, committed Git workspace. On two synthetic files it traced request input into `eval`, rejected an unsupported parser claim and disclosed coverage limits. A follow-up supplied a harmless source-derived reproduction; JavaScript was not executed. Antigravity CLI 1.4.7 also expanded the skill and read its manuals, but its captured answer was truncated. These are bounded activation checks, not accuracy measurements. Cursor, Claude Code and Windsurf exports have format/reference checks but no completed interactive activation result here. Generated integration instructions and an optional root `REVIEW.md` do not install or enforce a hosted review service.

Node.js 20+ is supported for the packaged CLI/library. Development tests use Node 22.12+ within 22.x, 24.x or 26.x. Native execution requires OCR 1.13.3 and an explicitly configured tool-capable model; no local model weights were installed for this validation.

Report pairs are staged but are not a cross-file atomic transaction. Reports may contain source excerpts or absolute paths. Read the [security policy](../SECURITY.md) and [user guide](../README.md) before sharing artifacts or configuring inference.
