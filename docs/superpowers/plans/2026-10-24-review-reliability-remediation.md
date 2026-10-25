# Review Reliability Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Sequential native execution is recommended because most tasks change shared result contracts and CLI paths.

**Goal:** Address audit findings A1–A11 and ICM-01/ICM-02 so developers and AI agents receive accurate, lossless reviews with explicit coverage and inference routing.

**Architecture:** Keep the small Node.js CLI and existing library entrypoint. Introduce validated finding and engine-result contracts between tool adapters and reporting; keep finding identity, location correlation, severity, and completion status separate. Retain the existing agent-skill distribution and repair its generated instructions.

**Tech Stack:** Node.js ESM, Node built-ins, Vitest 5.0.5, Alibaba OCR, Ollama, Bash, GitHub Actions.

**Spec:** This document's [remediation contract](#remediation-contract) is the self-contained specification for the audit findings reported in the October 24, 2026 conversation. The [ICM audit](../../clief/audits/icm/2026-10-24-project-audit.md) supplies the context/routing evidence. The [original design](../specs/2026-10-23-doublecheck-design.md) is historical context; its automatic convergence escalation, unconditional locality claims, Node 18 guidance, and promised unimplemented CLI features are superseded by the proposed contract below when this plan is approved for execution.

**Status:** Implementation authorized by the user on October 24, 2026 and carried out on local branch `codex/review-reliability`. Tasks below record local implementation progress; full native mock-inference conformance and other-runtime CI remain pending a disposable runner. No publication or push is authorized by this execution.

## Global Constraints

- Preserve the published application runtime floor: Node.js `>=20.0.0`, native ESM, Apache-2.0.
- Run Vitest on its supported development runtimes: Node `22.12.0`, `24.x`, and `26.x`. Verify the packaged CLI separately on Node `20.0.0` and `20.x` without devDependencies.
- Zero external runtime npm dependencies. Keep Vitest as the only direct devDependency.
- Use parameterized `execFile`/`execFileSync`; no shell-interpolated target paths, model names, or provider names.
- Keep scratch output in unique temporary directories with cleanup on success and failure. Unit tests may not require a live model or alter user configuration.
- Read the selected OCR configuration without executing credential commands or printing credentials. Never automatically modify a developer's global OCR/Ollama settings.
- Keep findings and source content out of diagnostic errors and CI logs; use redacted, bounded diagnostics.
- No new scanner integrations, autonomous adversary engine, hosted service, or automatic remediation in this scope. An import adapter must describe itself as an import adapter.
- Preserve the existing CLI flags and public function export names where practical. Document intentional result-shape changes under report schema `doublecheck/report/v2`; do not preserve misleading behavior for compatibility.
- Implement each task with a failing regression first, a focused passing check, then a checkpoint commit. Do not publish or tag a release automatically.

## Review Focus

1. OCR may exit successfully with partial coverage: preserve its manifest and budget/failed-file state (Tasks 3 and 10).
2. Imported findings may refer to a different checkout or carry no coverage evidence: retain findings, expose unknown scope, and never infer a complete run (Tasks 2 and 3).
3. Paths may contain Windows separators, absolute roots, traversal, or repeated basenames: canonicalize against the target boundary without merging different files (Tasks 2 and 4).
4. One tool may fail after producing usable findings: preserve usable output while keeping the run incomplete and nonzero (Tasks 3, 5, and 10).
5. Output destinations may collide or writes may fail after one artifact succeeds: detect predictable collisions before scanning and report partial output failures truthfully (Tasks 7 and 10).

## Remediation Contract

### Coverage of the audit

| Finding | Required result | Owning tasks |
| --- | --- | --- |
| A1: missing lens / incomplete audits succeed | Per-engine state, explicit import-only adversary mode, nonzero incomplete exit, no false dual-review claim | 3, 5, 7, 11 |
| A2: rejected/unvalidated findings promoted | Verdict preservation; separate unresolved/rejected records; no escalation by overlap | 2, 4, 5 |
| A3: title-based finding loss | Stable per-source identities; exact duplicate collapse only; lossless canonical output | 2, 4, 5 |
| A4: false convergence | Exact canonical file identity, genuine line-range overlap, severity independent of correlation | 4, 5, 11 |
| A5: inference routing / privacy | Validated explicit provider and endpoint; remote opt-in; accurate locality language | 6, 10, 11 |
| A6: REVIEW.md placement | Root REVIEW.md; shared generic template; service setup explained | 8, 10, 11 |
| A7: malformed tool data / severity | Boundary validation, supported native payloads, consistent lowercase severities, clear errors | 2, 3, 5 |
| A8: false-ready doctor | Installed usable model, exact requested-model check, required OCR check, visible diagnostics | 6, 7 |
| A9: unsafe CLI / output behavior | Strict arguments, distinct report files, safe configuration initialization | 7, 8 |
| A10: weak CI / unsupported test runtime | Supported test matrix, Node 20 consumer smoke, offline CLI integration, native OCR contract check | 1, 10 |
| A11 and ICM-01: broken exports | Resolvable reference files/anchors and isolated generation tests | 9, 10 |
| ICM-02: duplicate/stale authority | One generic review template, current runtime guidance, historical documents labeled | 8, 11 |

### Finding and diagnostic contracts

Create `src/contracts.js` with JSDoc types and zero-dependency validation. These are implementation decisions proposed by this plan, rather than requirements previously supplied by the user.

- `Source`: `adversary | architect`.
- `Verdict`: `confirmed | needs_validation | rejected`. A legacy finding without an explicit verdict becomes `needs_validation`; do not silently certify it. Native OCR comments also start as review candidates (`needs_validation`) unless an external verification record explicitly establishes confirmation. The UI must still show their reported severity.
- `Severity`: `critical | high | medium | low | informational | null`. Normalize case. Missing/null severity stays null and appears as **Unrated**, rather than becoming medium/low. Unknown nonempty severity strings are validation errors.
- `Finding`: `{ id, source, externalId, verdict, severity, title, description, locations, evidence, remediation, reportedConfidence }`. `locations` contains `{ file, startLine, endLine, kind }`; line values are positive integers or null, and ranges must be ordered. `reportedConfidence` is source-declared metadata or null, never invented from overlap.
- `Diagnostic`: `{ code, source, message, recordIndex? }`. Messages are bounded and redacted; never include full subprocess errors, raw records, tokens, or request bodies.
- `canonicalizeFindingPath(input, targetRoot)` returns a repository-relative POSIX path or throws `FindingValidationError`. Convert relative backslashes, resolve dot segments and host-native absolute paths, reject out-of-root/foreign absolute paths. Preserve case. This is an identity check, not an OS filesystem sandbox.
- Missing/zero line numbers become null; they never authorize line correlation. An invalid/out-of-root path invalidates that record rather than being stripped into another file's identity.
- For each source, hash a stable serialization of canonical content: source, external ID if present, title, description, sorted canonical locations, verdict, severity, evidence, and remediation. This preserves same-title/same-line distinct concerns and makes identical records repeatably deduplicable. Keep external IDs separately for future longitudinal tracking; do not conflate them with this per-record content identity.
- `normalizeFindings(source, payload, { targetRoot }) -> { findings, diagnostics, invalidRecordCount }`. Validate top-level shape; process records individually; preserve valid siblings. A record error makes the owning engine partial. Invalid top-level JSON/shape makes it failed. Valid empty arrays remain valid empty input, with coverage determined separately.
- Preserve confirmed Cloudflare verdicts and trace/evidence locations, including sinks beyond `trace[0]`. Validate the upstream verdict-specific fields supported by the pinned fixture schema. Accept simplified historical arrays only as explicitly labeled legacy candidates.

### Engine, report, and exit contracts

- `EngineResult`: `{ source, status, findings, diagnostics, coverage, provenance }`; `status` is `complete | partial | skipped | failed`.
- `coverage`: `{ selected, reviewed, failed, excluded, origin }`, with file lists or null for unknown lists; `origin` is `reported | unknown`. Never invent empty coverage lists where upstream evidence is absent.
- `provenance`: `{ tool, version, mode, targetRoot, revision, provider, endpoint, model }`; unknown values are null. `mode` distinguishes `native`, `import`, and `custom`. Imported JSON never acquires the locally selected model/provider attribution.
- `AuditResult`: `{ targetPath, reviewMode, requiredSources, timestamp, status, engines, findings, errors, cloudflareFindings, alibabaComments }`. Retain the last two arrays as deprecated raw-API compatibility fields for this release; reporting consumes `engines`/`findings`. `reviewMode` is `dual` (default, requiring both sources) or explicit `architect` (requiring only architect). An unrequested lens is reported as skipped without making an architect-only review incomplete. Reject `--mode architect --findings ...` as an incompatible invocation.
- An import without coverage metadata is `partial`, with an `UNKNOWN_IMPORT_COVERAGE` diagnostic. No findings file means adversary `skipped`; an explicitly supplied missing/unreadable file means `failed`. This remediation does not implement a standalone Cloudflare scanner.
- Only required engines with known, nonempty reviewed coverage may be `complete`. A native skipped/no-supported-files result stays `skipped`. If all required lenses complete, audit `complete`; if useful results exist but a required lens is partial/skipped/failed, audit `partial`; if none of the required lenses produces a usable review result, audit `failed`. A valid complete clean result counts as usable even when it has zero findings. The default CLI dual mode remains incomplete without adversary coverage; `--mode architect` enables an honest, useful standalone OCR review.
- Custom runners may return `EngineResult`. Legacy array-returning custom runners remain accepted, but receive `partial`/unknown coverage. Invalid custom result objects fail explicitly.
- Correlation is `{ findingIds: [adversaryId, architectId], file, startLine, endLine, relation: 'location_overlap' }`. It is a relationship between records, never a severity override or proof they share a root cause.
- `synthesizeReport(result)` keeps `{ markdown, json, p0Count, p1Count, p2Count }`. JSON v2 adds `{ schemaVersion, status, engines, findings, correlations, unresolved, rejected, diagnostics }`; keep existing `p0/p1/p2` arrays for **confirmed** records only. Critical → P0; high → P1; medium/low/informational → P2; confirmed null-severity records go in `unrated`.
- Unresolved records remain visible in a separate section with their reported severity; rejected records appear separately. Neither contributes to confirmed P0/P1/P2 counts. Remove the misleading `summary.convergedDefects`/`convergedCount` outputs in v2 and document migration to `correlations.length`.
- Exit codes: `0` = complete review with no confirmed high/critical findings and no unresolved high/critical/unrated candidates; `1` = complete review with confirmed high/critical findings; `2` = incomplete review, unresolved high/critical/unrated candidates, invalid invocation, preflight failure, or output failure. Incompleteness takes precedence over findings. These are deterministic product semantics, not a user-configurable policy framework.
- Print **Review complete**, **Review incomplete**, or **Review failed** from actual status, with unresolved counts visible. A complete review is a coverage claim, not a claim that the code is safe.

## File Responsibilities

| File | Responsibility |
| --- | --- |
| `src/contracts.js` (new) | Finding/engine validation, canonical location handling, record IDs |
| `src/correlation.js` (new) | Exact location correlation and lossless deduplication helpers |
| `src/orchestrator.js` | Adapter execution, native completion metadata, aggregate state |
| `src/inference-policy.js` (new) | Endpoint policy, safe OCR-provider configuration inspection |
| `src/doctor.js` | Runtime, model, and required-tool readiness |
| `src/reporter.js` | Lossless triage, correlations, Markdown and JSON v2 |
| `src/cli.js` | Strict CLI parsing, orchestration, exit handling |
| `src/output.js` (new) | Destination resolution and staged report writes |
| `src/review-config.js` (new) | Safe root REVIEW.md initialization |
| `src/templates/REVIEW.md` (new) | Canonical generic review template, included by existing `src` packaging rule |
| `scripts/convert.sh` | Platform adaptation and optional output root |
| `scripts/smoke-consumer.mjs` (new) | Packaged CLI/library verification without devDependencies |
| `scripts/verify-ocr-contract.mjs` (new) | Native OCR test against a loopback mock inference server in disposable CI |

Keep existing public names re-exported from `src/index.js`; preserve `generateDefaultReviewMd` as a re-export from its new module. `normalizePath` remains a display-normalization helper; root containment and correlation use `canonicalizeFindingPath` instead. Update its documentation/tests to stop describing traversal stripping as a sandbox.

Execution order is sequential. Dependencies are: Task 2 → 1; Task 3 → 2; Task 4 → 2; Task 5 → 3 and 4; Task 6 → 3; Task 7 → 5 and 6; Task 8 → 7; Task 9 → 8; Task 10 → 7–9; Task 11 → 1–10. The arrows mean “depends on.” Do not count a library-only fix as a repaired executable until Task 7 integrates it.

## Milestone 1 — Trustworthy Results

### Task 1: Make the test baseline supported and isolated

**Files:** Modify `package-lock.json`, `vitest.config.js`, `.github/workflows/ci.yml`, `scripts/convert.sh`, `tests/convert.test.js`, `tests/doctor.test.js`; add `tests/helpers/temp.js` and `tests/helpers/fixture-process.js`.

**Interfaces:** `withTempDir(fn)` cleans a unique scratch directory; `convert.sh <platform> --output-dir <directory>` retains the current default when omitted. `fixture-process.js` provides a Node executable target for a fake OCR process; its path is passed directly to Node with argument arrays, avoiding POSIX-only shims in portable tests.

- [x] **1. Add regressions:** `converter_writes_only_under_requested_output_root` asserts no files change under repository `dist/`; `mocked_fetch_is_restored_after_each_test` checks `vi.stubGlobal`/`vi.unstubAllGlobals` cleanup. Run the converter with `execFileSync('bash', args)`, replacing the test's interpolated shell command.
- [x] **2. Run:** `npm test -- tests/convert.test.js tests/doctor.test.js --no-cache`; confirm the new output-root regression fails before implementation.
- [x] **3. Implement:** additive converter output parsing and temporary fixtures; synchronize lockfile root version `0.1.1` and runtime `>=20.0.0` using npm without changing installed dependency versions. Keep Vitest 5.0.5; move the CI unit-test matrix to `22.12.0`, `24.x`, and `26.x` now so subsequent checkpoints have supported CI. Exclude standalone smoke scripts from Vitest discovery.
- [x] **4. Verify:** repeat focused tests, then `npm test -- --no-cache` on Node 22.12+ within Vitest's supported ranges; verify only planned files changed and no real network/global configuration was used.
- [x] **5. Checkpoint:** `test: isolate audit fixtures and align the test baseline`.

### Task 2: Validate findings at the boundary

**Files:** Create `src/contracts.js`, `tests/contracts.test.js`, and `tests/fixtures/findings/{cloudflare-confirmed,cloudflare-needs-validation,cloudflare-rejected,legacy,malformed}.json`; modify `src/index.js`.

**Interfaces:** Implements `Finding`, `Diagnostic`, `FindingValidationError`, `canonicalizeFindingPath`, and `normalizeFindings` exactly as specified above. Export the normalizer and validation error from the library.

- [x] **1. Add parameterized regressions:** `normalize_severity_case_preserve_verdict` checks `CRITICAL → critical`, rejected stays rejected, and missing verdict becomes needs_validation. `malformed_records_preserve_valid_siblings` checks null records, null/missing/unknown severity, invalid content types, malformed ranges, and an invalid top-level object. `paths_cannot_change_repository_identity` covers `src/notapi.js`, `api.js`, `../../outside.js`, backslashes, inside-root absolute paths, and foreign absolute paths. `same_title_records_have_distinct_ids` checks different content/locations and stable IDs for exact duplicates. `trace_sink_is_retained` verifies all valid trace locations, rather than only the first entry.
- [x] **2. Run:** `npm test -- tests/contracts.test.js --no-cache`; expect missing exports/validation failures.
- [x] **3. Implement:** explicit source validators, bounded diagnostics, canonical identity, and fixtures with source revision/license provenance. Reject malformed data; do not repair records by inventing severity, file identities, or confirmation.
- [x] **4. Verify:** all contract cases pass; assert raw fixture secrets supplied as fake test markers never appear in diagnostics.
- [x] **5. Checkpoint:** `fix: validate finding contracts and preserve verification states`.

### Task 3: Preserve native coverage and aggregate engine state

**Files:** Modify `src/orchestrator.js`, `src/index.js`, `tests/orchestrator.test.js`; add `tests/fixtures/ocr/{complete,partial,failed,skipped,legacy,malformed}.json`.

**Interfaces:** `defaultAlibabaRunner(targetPath, options) -> Promise<EngineResult>`; `defaultCloudflareRunner(targetPath, options) -> Promise<EngineResult>`; `runDualAudit(targetPath, options) -> Promise<AuditResult>`. Injected process runners retain the existing `execFileSync` option for testability. Add `resolveAuditTarget(targetPath) -> { targetRoot, selectedPath, revision }`: use the containing Git root when available, otherwise the target directory or a target file's parent. Scan subdirectories/files with explicit `--repo <root> --path <relative-selection>`; avoid changing path identity merely because the user selected a subtree.

- [x] **1. Add regressions:** `no_adversary_input_is_skipped`; `explicit_missing_findings_is_failed`; `legacy_import_has_unknown_coverage`; `successful_process_with_partial_manifest_stays_partial`; `nonzero_process_preserves_valid_partial_output`; `missing_output_is_failed`; `invalid_record_makes_engine_partial`; `both_failed_never_become_complete`; `clean_complete_engine_with_missing_lens_is_partial`; `explicit_architect_mode_can_complete`; `subtree_scan_preserves_repository_relative_identity`; `legacy_custom_array_is_partial`; `target_revision_mismatch_is_incomplete` for provenance-bearing custom results. Native fixtures must exercise status, manifest coverage, warnings, and budget truncation.
- [x] **2. Run:** `npm test -- tests/orchestrator.test.js --no-cache`; verify failures demonstrate false completion/output loss, not only fixture setup errors.
- [x] **3. Implement:** read any produced JSON even after a subprocess error, validate it, retain usable findings, and preserve failure status. Missing/unknown native completion metadata is never promoted to complete. Record OCR's actual version, declared model/provider, mode, and coverage origin; use reported metadata when present. Bound and sanitize subprocess diagnostics; preserve secure temporary cleanup.
- [x] **4. Verify:** focused tests pass, temporary directories disappear on every path, and the aggregate-status truth table matches the contract. Imported arrays cannot claim full adversary coverage.
- [x] **5. Checkpoint:** `fix: preserve scan coverage and expose incomplete reviews`.

### Task 4: Replace lossy matching with exact identity and correlation

**Files:** Create `src/correlation.js` and `tests/correlation.test.js`. Reporter integration is owned by Task 5 so this helper task can pass independently.

**Interfaces:** `correlateFindings(adversaryFindings, architectFindings) -> Correlation[]` and `deduplicateFindings(findings) -> Finding[]` consume normalized findings. Correlations are informational location-overlap relationships. Record deduplication uses `Finding.id`, independently of correlation. Task 5 wires the historical public `detectConvergence` name to the new correlation behavior and documents its normalized-input contract.

- [x] **1. Add regressions:** `suffix_paths_do_not_correlate`; `missing_lines_do_not_correlate`; `adjacent_nonoverlapping_ranges_do_not_correlate`; `trace_sink_overlap_correlates`; `unrelated_same_line_records_keep_severity`; `duplicate_titles_preserve_distinct_critical_record`; `same_line_distinct_architect_comments_survive`; `exact_duplicates_collapse_once`. Reverse source ordering and assert the same sorted ID/correlation sets.
- [x] **2. Run:** `npm test -- tests/correlation.test.js --no-cache`; confirm the new helper cases fail before implementation. Task 5 will assert the same cases through the public report path.
- [x] **3. Implement:** index exact canonical paths, intersect positive closed line ranges, deduplicate correlation pairs by their finding IDs/location, and retain every unique record. Do not use suffix matching, missing-line wildcards, ±3-line proximity, title-only IDs, or first-match suppression.
- [x] **4. Verify:** all regression cases pass; changing a record from low to critical changes its triage independently of correlation.
- [x] **5. Checkpoint:** `fix: correlate exact locations without dropping findings`.

### Task 5: Produce truthful, lossless reports and deterministic exits

**Files:** Modify `src/reporter.js`, `tests/reporter.test.js`; add `tests/report-policy.test.js`.

**Interfaces:** `synthesizeReport(result)` implements JSON v2 and the priority/verdict sections above, using Task 4's deduplication and correlation helpers. Retain public `detectConvergence(adversaryFindings, architectFindings) -> Correlation[]` as a wrapper consuming normalized records. Export `getReviewExitCode(reportJson) -> 0 | 1 | 2` from `src/reporter.js` and `src/index.js`; the CLI consumes it in Task 7.

- [x] **1. Add regressions:** `rejected_and_unresolved_never_enter_confirmed_buckets`; `uppercase_critical_is_p0_when_confirmed`; `unrated_remains_visible`; `partial_review_has_prominent_status`; `correlation_does_not_upgrade_severity`; `every_unique_finding_is_represented`; `markdown_escapes_tool_supplied_markup`. Use a table asserting: complete/clean → 0; complete/confirmed high → 1; partial/critical → 2; complete/unresolved high or unrated → 2; complete/unresolved low → 0 with the candidate count visible.
- [x] **2. Run:** `npm test -- tests/reporter.test.js tests/report-policy.test.js --no-cache`; verify the audit's rejected-to-P0 and uppercase-critical cases fail before changes.
- [x] **3. Implement:** triage by verdict and normalized severity, preserve the full canonical finding list in JSON, escape dynamic Markdown/HTML/table content, and use fences longer than any backtick run in remediation text. Put status, coverage, unresolved findings, and actual source provenance before priority counts. Remove numerical confidence claims and deprecated convergence-defect fields.
- [x] **4. Verify:** confirmed buckets plus unresolved/rejected/unrated sections account for every canonical ID exactly once; JSON is parseable; generated Markdown retains multiline evidence and does not accept injected headings/HTML as report structure.
- [x] **5. Checkpoint:** `fix: report verification state and incomplete review outcomes`.

**Milestone 1 exit:** The original false-success, false-P0, severity downgrade, and finding-loss reproductions are regression tests through the library. Missing adversary coverage is visible in the report and its exit-policy function returns 2. Task 7 integrates that policy into the executable. No new engine is claimed to exist.

## Milestone 2 — Safe Execution and Agent Interfaces

### Task 6: Verify inference routing and usable model readiness

**Files:** Create `src/inference-policy.js`, `tests/inference-policy.test.js`; modify `src/doctor.js`, `src/orchestrator.js`, `tests/doctor.test.js`.

**Interfaces:** `resolveInferencePolicy({ ollamaEndpoint, ocrProvider = 'ollama', allowRemote = false, model }, { readOcrConfig, fetch }) -> Promise<InferencePolicy>` returns `{ provider, endpoint, model, route: 'loopback' | 'remote', locality: 'unverified', warnings }`. `checkEnvironment` returns `{ ok, activeModel, ocrAvailable, inference, warnings, errors }`. `selectBestModel(models)` returns an available non-embedding model or null.

- [x] **1. Add regressions:** `empty_or_embedding_only_models_are_not_ready`; `requested_model_must_exist`; `missing_required_ocr_is_error`; `remote_route_or_cloud_tag_requires_opt_in`; `url_credentials_query_and_fragment_are_rejected`; `configured_provider_url_must_match_requested_ollama`; `saved_cloud_provider_cannot_override_explicit_provider`; `diagnostics_never_include_api_keys`. Accept only exact model names or an omitted `:latest` alias, not arbitrary prefixes.
- [x] **2. Run:** `npm test -- tests/doctor.test.js tests/inference-policy.test.js tests/orchestrator.test.js --no-cache`; confirm current empty-model success and missing endpoint propagation fail.
- [x] **3. Implement:** accept HTTP(S) base URLs with no credentials/query/fragment; recognize only `localhost`, `127.0.0.1`, and `::1` as loopback. Reject nonloopback routes and model tags containing a cloud marker without `allowRemote`. Inspect only the named custom OCR provider's URL/protocol/model metadata; require `protocol: openai`, a URL matching the normalized requested endpoint plus `/v1`, a compatible selected model, and a non-command credential configuration. An absent/mismatched provider is a preflight error with manual setup guidance, never an automatic global-config write. Invoke OCR with explicit `--provider <name>` and `--model <name>`; check reported LLM identity for mismatches. Do not assume OCR endpoint environment variables override its config.
- [x] **4. Verify:** mock subprocess capture shows the intended provider/model; refusal paths launch no scan; fetch mocks restore cleanly. Keep locality unverified because a local endpoint/proxy can forward requests: document operator-controlled daemon cloud disabling and avoid an absolute no-egress guarantee.
- [x] **5. Checkpoint:** `fix: validate OCR routing and required inference readiness`.

### Task 7: Validate CLI arguments and write distinct report artifacts

**Files:** Modify `src/cli.js`, `bin/doublecheck.js`, `src/index.js`, `tests/cli.test.js`; create `src/output.js`, `tests/output.test.js`.

**Interfaces:** `parseCliArgs(argv)` uses `node:util.parseArgs` in strict mode and returns the current configuration plus `reviewMode`, `ocrProvider`, `allowRemote`, and `force`. Add library-only dependency injection through `runCli(argv, dependencies = {})`; supported overrides are `checkEnvironment`, `runDualAudit`, and `writeReports`, with production defaults. The executable always uses the production defaults. `resolveOutputPaths({ format, output }) -> { markdown?, json? }`; `writeReports(paths, report) -> { written, diagnostics }`. Invalid invocation/target/output returns code 2 before preflight; runtime review outcomes use Task 5's exit function.

- [x] **1. Add regressions:** `unknown_or_missing_flag_values_fail_before_io`; `multiple_targets_are_rejected`; `double_dash_allows_dash_prefixed_target`; `unsupported_format_fails`; `both_formats_have_distinct_paths`; `invalid_target_fails_before_inference`; `output_failure_never_prints_success`; `same_inode_destinations_are_rejected`. Stub preflight to assert it was not invoked for invalid input.
- [x] **2. Run:** `npm test -- tests/cli.test.js tests/output.test.js --no-cache`; expect the audit's typo and JSON-overwrite reproductions to fail.
- [x] **3. Implement:** support existing flags/aliases plus `--mode dual|architect`, `--ocr-provider`, `--allow-remote`, and `--force` (force applies only to initialization). Reject incompatible options before work. For `both`, case-insensitively strip one trailing `.md`/`.json` and write `<base>.md` plus `<base>.json`; for a single format, honor the exact requested filename. Validate parent directories and reject directory/symlink destinations and detectable hardlink collisions before scan. Stage files under the destination directory, rename only after serialization succeeds, and clean scratch files; cross-file atomicity is not promised. Expose any artifact that succeeded if a later write fails, and exit 2. Print doctor warnings and actual engine/provenance status.
- [x] **4. Verify:** child-process CLI tests assert exit codes 0/1/2 and parse generated files. `--format both -o report.json` and `-o report.MD` produce two valid files. Test unsupported flags, write failures, and filenames with spaces without shell interpolation.
- [x] **5. Checkpoint:** `fix: validate CLI input and preserve report outputs`.

### Task 8: Generate root review instructions without overwriting team policy

**Files:** Create `src/review-config.js`, `src/templates/REVIEW.md`, root `REVIEW.md`, `tests/review-config.test.js`; modify `src/cli.js`, `src/index.js`, `scripts/convert.sh`, `tests/ci-review.test.js`; migrate `.github/REVIEW.md`.

**Interfaces:** `generateDefaultReviewMd() -> string` reads the packaged generic template. `initializeReviewConfig(targetDir, { force = false }) -> { path, action: 'created' | 'unchanged' | 'replaced' }`; it writes only `<targetDir>/REVIEW.md`.

- [x] **1. Add regressions:** `initialization_creates_root_review_file`; `existing_custom_rules_are_preserved`; `identical_template_is_noop`; `force_explicitly_replaces_root_file`; `legacy_github_review_file_is_preserved`; `symlink_target_is_rejected`; `cli_and_converter_use_identical_generic_template`. Existing custom files without force return a clear diagnostic/exit 2, while identical templates return 0.
- [x] **2. Run:** `npm test -- tests/review-config.test.js tests/cli.test.js tests/ci-review.test.js --no-cache`; confirm wrong-placement and overwrite regressions fail first.
- [x] **3. Implement:** one generic template consumed by both CLI and converter. Use exclusive creation for a new file; force replacement uses a staged same-directory file and rejects symlinks. Migrate this repository's specific invariants to root `REVIEW.md`; preserve any distinct `.github` content before removing its obsolete copy. Initialization must only warn about a downstream legacy `.github/REVIEW.md`, never silently move/delete/merge it. Update generic guidance to require evidence, separate reported severity from confidence, and remove automatic P0 escalation.
- [x] **4. Verify:** CLI and converter produce identical template bytes; an npm package dry run includes `src/templates/REVIEW.md`; existing custom instructions survive a second initialization attempt.
- [x] **5. Checkpoint:** `fix: generate canonical root review instructions safely`.

### Task 9: Repair all exported reference links

**Files:** Modify `scripts/convert.sh`, `tests/convert.test.js`, `tests/skill.test.js`; add `tests/export-links.test.js`.

**Interfaces:** Retain all existing platform target names and default layouts. Native Claude/Antigravity exports retain `references/`; Cursor links become `./doublecheck-<name>.md`. Consolidated Codex/Windsurf output links point to explicit unique anchors `#doublecheck-<reference-basename>`, emitted immediately before each embedded manual.

- [x] **1. Add regressions:** generate `all` beneath a unique temporary output root; `every_exported_local_link_resolves` checks each generated relative file or explicit anchor. `native_skill_references_remain_selective` checks native body/reference structure. `generated_review_matches_canonical_template` covers the shared template from Task 8.
- [x] **2. Run:** `npm test -- tests/convert.test.js tests/export-links.test.js tests/skill.test.js --no-cache`; reproduce the missing Cursor references and consolidated-file dangling links.
- [x] **3. Implement:** rewrite the known skill-reference links during export, emit stable anchors, preserve external links, and update installation paths. Keep conversion read-only outside its specified output root.
- [x] **4. Verify:** all generated link/anchor checks pass and Bash syntax is valid. Record actual-host discovery as a separate manual check; generated-text tests cannot prove host behavior.
- [x] **5. Checkpoint:** `fix: preserve reference routing across agent exports`.

**Milestone 2 exit:** The CLI rejects invalid input before work, routes OCR explicitly, preserves existing review policy, and emits valid artifacts with resolvable agent references. No claim of OS sandboxing or verified model locality is introduced.

## Milestone 3 — End-to-End Evidence and Current Documentation

### Task 10: Replace advisory CI checks with reproducible review contracts

**Files:** Modify `.github/workflows/ci.yml`, `package.json`, `tests/ci-review.test.js`, `tests/hygiene.test.js`; add `tests/cli.integration.test.js`, `scripts/smoke-consumer.mjs`, `scripts/verify-ocr-contract.mjs`, and a separately dispatched `.github/workflows/ocr-contract.yml`.

**Interfaces:** `npm run test:integration` runs offline fixture-driven CLI integration; `npm run smoke:consumer` verifies an unpacked npm artifact without devDependencies; `npm run test:ocr-contract` checks native OCR against a loopback mock model server and a tiny synthetic repo. The native conformance workflow provisions the explicitly selected provider in a disposable runner account; the local script only consumes an already configured test provider and never writes global config.

- [x] **1. Add behavioral regressions:** `cli_failed_ocr_exits_2_and_retains_partial_report`; `cli_clean_complete_custom_engines_exit_0`; `cli_confirmed_high_exits_1`; `cli_legacy_import_exits_2_with_visible_candidate`; `init_review_does_not_require_inference`; `package_contains_template_and_runs_without_devdeps`. Full-CLI clean/confirmed fixtures must carry explicit synthetic engine coverage; do not mark arbitrary raw arrays complete just to obtain exit 0. Expose runner injection through a test-only library call to `runCli(argv, dependencies)`; keep the executable's default dependency set fixed and non-configurable by target content.
- [x] **2. Run:** `npm run test:integration`; confirm each pre-remediation audit reproduction fails for the intended behavior before accepting its fix.
- [x] **3. Implement CI:** retain Task 1's supported unit-test matrix and add integration coverage there; verify the packaged artifact on Node `20.0.0` and `20.x` using Node built-in assertions and injected fixtures. Replace the swallowed live-doctor check with deterministic integration tests. Verify root `REVIEW.md`, generated links, and packaged resources. Use `permissions: contents: read`. Use a real workflow badge rather than the static passing badge when docs change in Task 11.
- [ ] **4. Verify the native boundary:** in the disposable workflow, install exact OCR `1.13.3`, record its version, configure a synthetic `doublecheck-contract` provider matching a loopback mock server, and invoke the production adapter on a synthetic repo. Use a bounded mock transcript with no real source/secrets; assert native JSON status/manifest/LLM fields survive normalization. Include success, partial/budget-limit, malformed output, and failing-process cases; where OCR cannot naturally emit a case deterministically, retain the native successful fixture plus adapter failure fixtures and label that evidence accurately. Never use a paid/cloud model or change a developer's config. Keep this job explicit/manual until stable; failure or unexecuted status blocks claims of native conformance, while ordinary offline CI remains independently usable.
- [ ] **5. Verify all checks:** `npm test -- --no-cache`, `npm run test:integration`, `npm run smoke:consumer`, `bash -n scripts/convert.sh`, and the separately dispatched native contract job. Assertions must prove statuses, retained records, provider requests, exit codes, and artifact contents; string presence alone is insufficient.
- [x] **6. Checkpoint:** `ci: verify review failure paths and packaged runtime support`.

### Task 11: Align the public contract, skills, and historical guidance

**Files:** Modify `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `docs/LAUNCH_KIT.md`, `skills/doublecheck/SKILL.md`, all four skill reference manuals, `.github/pull_request_template.md`, and the three historical implementation plans/original design with short superseded notices. Add `tests/fixtures/evaluation/cases.json`, synthetic snippets under `tests/fixtures/evaluation/source/`, and `tests/evaluation.test.js` for the regression corpus described below.

**Interfaces:** Document schema v2, exit semantics, explicit provider setup, import-only adversary mode, candidate versus confirmed findings, safe root REVIEW.md initialization, and the runtime/development split. No new user-facing feature may appear solely in documentation.

- [x] **1. Prepare a release checklist:** map A1–A11 and ICM-01/ICM-02 to passing tests or explicitly recorded verification limits. Check that every CLI example uses the scoped package name and a supported flag. Preserve historical plans as history, with a link to current guidance; do not rewrite their old approval/checklist states.
- [x] **2. Update current guidance:** remove claims of automatic complete dual scans, guaranteed local/no-egress execution, 100% convergence confidence, automatic PR enforcement from a file, and the idea that path-string normalization provides OS containment. Explain required Claude service setup separately from generated instructions. Explain that native OCR comments and legacy imports are candidates until verified; high/unrated unresolved candidates yield exit 2 and remain actionable.
- [x] **3. Add a small checked-in review evaluation fixture:** use synthetic source snippets with known defects and safe negative controls, expected file/line identities, and expected verdict/triage outcomes. Test the deterministic pipeline with frozen tool responses; label it a regression corpus, not measured model precision/recall. Live model quality measurement is a separate future capability, requiring recorded model/version and repeated runs.
- [x] **4. Verify:** cross-check help, root REVIEW.md, generic template, native skill, exports, report examples, CI, and npm package contents against actual behavior. Write an `Unreleased` changelog section; document result-shape/exit changes for the next `0.2.0` release, without bumping/publishing as part of this task.
- [x] **5. Checkpoint:** `docs: align review guarantees and agent guidance with verified behavior`.

## Final Acceptance and Handoff

- [ ] Every audit finding in the coverage table has an implemented remedy and named regression evidence; gaps remain explicitly open rather than counted as passed.
- [ ] A default dual scan with no adversary input, a missing OCR executable, partial native coverage, or unknown import coverage cannot print a complete dual-review success or exit 0. Explicit architect mode can complete with only architect coverage and labels that scope clearly.
- [ ] Rejected records never become blockers; unresolved high/unrated records remain visible and yield exit 2; duplicate titles never hide findings; overlap never raises severity.
- [ ] Actual engine/provider/model attribution is preserved, remote routing requires explicit opt-in, and no local endpoint is represented as proof of local inference.
- [ ] CLI outputs are distinct and parseable, existing team policy is preserved, and every exported local reference resolves.
- [ ] Offline tests, supported-runtime jobs, packaged Node 20 smoke, and the separately recorded native contract check have current evidence. Unverified actual-host discovery or model-locality claims remain excluded from documentation.
- [ ] Review the whole change for regression risk, inspect the package dry run, and inspect Git status for caches/generated output/secrets before preparing a release. Commits remain local unless the user requests push/publication.

Recommended execution: implement Tasks 1–11 sequentially in this chat, with a focused review at each milestone. The repaired adapter/reporting boundaries can support later capabilities such as OCR delegation, diff-scoped reviews, or deterministic source checks, each under its own specification after this remediation is verified.

## Verified Upstream References and Remaining Limits

- OCR reference implementation: [revision 375f64cd6f67a48a135da83cfcf59c52669a09cb](https://github.com/alibaba/open-code-review/tree/375f64cd6f67a48a135da83cfcf59c52669a09cb), matching locally inspected OCR `1.13.3`. Its [resolver](https://github.com/alibaba/open-code-review/blob/375f64cd6f67a48a135da83cfcf59c52669a09cb/internal/llm/resolver.go) prioritizes saved config over endpoint environment variables unless a provider is selected explicitly. Its [JSON output](https://github.com/alibaba/open-code-review/blob/375f64cd6f67a48a135da83cfcf59c52669a09cb/cmd/opencodereview/output.go) includes status, coverage manifest, and LLM identity. Other versions require their own conformance evidence before being advertised as supported.
- [Cloudflare finding schema](https://github.com/cloudflare/security-audit-skill/blob/main/skills/security-audit/report-schema.json) distinguishes confirmed, needs_validation, and rejected. Resolve and record a full commit SHA before copying any fixture/schema definitions during Task 2; preserve upstream license attribution. The current import adapter does not execute that skill's full audit/verification workflow.
- [Claude Code Review customization](https://code.claude.com/docs/en/code-review-customize) specifies root REVIEW.md and scoped subdirectory files. Recheck the service documentation when implementing Task 8 because this is an external integration.
- Baseline: `b5e6224b0e9762ff5579ce113720f27d5565c09a`, package `0.1.1`; the existing audit artifact is untracked. During planning only this plan was added. The audit's 26 passing tests and npm advisory result are historical baseline evidence, not acceptance evidence for future changes.
- This document has been self-reviewed for audit coverage, task dependencies, interface names, missing-input cases, and scope. All milestones require fresh implementation-time evidence; no task checkbox implies it has already run.

## Implementation rulings and current evidence

- Reused the existing checkout on a new local feature branch, preserving main and the audit/plan artifacts.
- Added a focused engine-result module to share coverage/custom-output validation. Native OCR comments remain candidates; confirmation is not accepted from arbitrary comment fields.
- Pinned OCR 1.13.3 source confirms manifests apply to review, not scan. Successful full-file scans therefore remain partial with unknown coverage. Native conformance must test that limitation, rather than inventing a complete result.
- Source-checkout examples use `node ./bin/doublecheck.js` so they cannot accidentally execute published npm 0.1.1 instead of this unreleased implementation.
- Export verification caught a pre-existing double-sed frontmatter bug; the converter now preserves the full body and rewrites only known reference links.
- Current local evidence: 77 passing tests on Node 26; packaged no-devDependencies smoke passed; real OCR 1.13.3 preview passed; fresh agent guidance pressure test passed. Other-runtime CI and full mock-inference workflow are recorded as unexecuted, not passed. See docs/verification/review-reliability.md for exact scope.
