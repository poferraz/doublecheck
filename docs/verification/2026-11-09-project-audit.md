# Doublecheck project audit — November 9, 2026

**Decision: hold the schema-v2 release and do not recommend the library as a CI merge gate until T1–T4 pass regression tests.** Two boundaries can differ from what the operator selected: the inference provider and the files sent to OCR. Separately, a library consumer can receive a successful gate for an unreviewed file or a report containing a confirmed high finding. Normal native scans in the tested OCR version have unknown coverage; the false passes below were not observed on that ordinary CLI path.

## Scope and evidence

- **P1 — Artifact.** Initially clean working tree, branch `codex/review-reliability`, commit `f308938f2a919a3f3ae8936a9767aaef554dbf98`. Read the CLI, library, adapters, renderer, skill, exports, package manifest, CI, tests, README, security policy and launch material. Packed and exercised the local `@poferraz/doublecheck@0.1.1` tarball. The checkout calls v2 unreleased. No published tarball was inspected; the anonymous [public npm registry](https://registry.npmjs.org/@poferraz%2fdoublecheck) returned HTTP 404 for this name.
- **P2 — Test conditions.** macOS arm64, Node 26.12.0, npm 11.20.0, Vitest 5.0.5, installed OCR 1.13.3 (`375f64c`). Used synthetic findings, temporary repositories and disposable output. Tests labeled *mock* exercised the real Doublecheck code with a replacement provider, subprocess or engine. An OCR preview used the real binary to select files without inference.
- **P3 — Criteria.** A successful gate must reflect the selected target, the required engines and their findings. Provider consent must match the actual destination. Installation and marketing claims must hold on the surface that makes them. Priority below reflects the effect on an operator or consumer and the prerequisites for triggering it, not the severity scale Doublecheck uses for imported findings.

## Findings, in priority order

### T1 · High — Preflight can approve a local provider while OCR selects a different one

`src/inference-policy.js:23` checks only `custom_providers[name]`. `src/orchestrator.js:46` passes the name to OCR. For a reserved name such as `openai`, [the pinned OCR resolver](https://github.com/alibaba/open-code-review/blob/375f64cd6f67a48a135da83cfcf59c52669a09cb/internal/llm/resolver.go) selects the built-in provider entry instead. In a fixture with local/static `custom_providers.openai` and a different `providers.openai` configuration, Doublecheck's doctor approved loopback without `--allow-remote`. The remote destination or credential helper in the built-in entry can therefore be used without passing Doublecheck's checks. No source was transmitted to a remote endpoint. The default `ollama` name is not the colliding `openai` preset.

There is also a detectable case on the default provider: `src/doctor.js:20` keeps only model names. A synthetic Ollama `/api/tags` result explicitly naming a `remote_host` and `remote_model` for `fixture-local:latest` was accepted without opt-in. These are fields in [Ollama's model-list response](https://github.com/ollama/ollama/blob/main/api/types.go). This is distinguishable from an opaque forwarding daemon, whose locality Doublecheck correctly says it cannot establish.

**Fix and prove:** Refuse reserved names for custom-only routing, or validate the exact effective configuration OCR will use. Require remote consent when the daemon explicitly identifies a remote model. The fixtures must be rejected before the scan, make zero requests to the unapproved destination and never run its credential helper. Keep a non-colliding custom-provider control.

### T2 · High — Selecting one file can send other files to OCR

`src/orchestrator.js:43-45` puts a literal filesystem name into OCR's comma-separated `--path` syntax. In a temporary Git repository, selecting the existing file named `,` made the real OCR preview include `private.js` and `public.js` as well. Selecting `first.js,second.js` selected the two siblings and omitted the literal target. Whitespace-only names can also expand the scope; `b.js ` selected `b.js`. This is an argument-semantics bug: discrete subprocess arguments prevent shell expansion but do not make OCR's selector literal. A configured remote review could disclose files the operator did not select; the preview established file selection only.

**Fix and prove:** Use a literal path interface or reject names the pinned OCR cannot represent exactly before starting a scan. Exercise commas, leading/trailing spaces, a whitespace-only filename, an ordinary file and a directory with the real preview. Never substitute a whole-repository scan for an invalid selector.

### T3 · High — A custom engine can certify coverage of the wrong file

`src/engine-result.js:16-23` checks that the engine's *own* selected and reviewed sets agree, without binding either to the requested file. Asking `runDualAudit` to review the existing `src/cli.js`, and supplying a custom architect that reported only `src/a.js`, yielded `complete` and exit **0**. The latter file does not exist in this checkout. The package smoke at `scripts/smoke-consumer.mjs:20` likewise claims coverage for `fixture.js` without creating that file. The import adapter retained a confirmed record located entirely outside a single-file selection without labeling it out of scope; the imported result was still partial.

**Reproduction from repository root:**

```js
// node --input-type=module
import { runDualAudit, synthesizeReport, getReviewExitCode } from './src/index.js';
import { completeEngine } from './tests/helpers/results.js';
const r = await runDualAudit('src/cli.js', {
  reviewMode: 'architect', alibabaRunner: () => completeEngine(),
});
console.log(r.engines[1].coverage.reviewed, getReviewExitCode(synthesizeReport(r).json));
// ['src/a.js'], 0
```

**Fix and prove:** Carry the resolved target root and selected path through validation and reporting. A sibling-only or nonexistent-file manifest must not certify a selected file. Allow explicitly labeled supporting evidence outside the selected file where a multi-file finding requires it. Create an actual covered file in the smoke test.

### T4 · High — Public report and exit-code helpers can drop a known blocker

The engine findings and top-level findings are separate copies. `src/reporter.js:49-64` trusts the top-level list, while `src/reporter.js:73-82` trusts the engines for completeness. Starting from a complete two-engine fixture with one confirmed high: the unmodified synthesized report exited **1**; setting only `findings: []` produced an engine still containing that high, zero report P1s and exit **0**. A related integration trap: passing the raw `runDualAudit` result directly to exported `getReviewExitCode` also returned **0**. At `src/reporter.js:37-40`, absent priority arrays behave like empty arrays. The CLI calls the helper with a synthesized report, so the latter mistake is specific to library consumers.

**Fix and prove:** Make one validated collection authoritative, or reject disagreement. Give the exit helper an explicit checked input type and fail closed on malformed or wrong-stage data. With the confirmed-high fixture, a well-formed report must exit 1; inconsistent or incomplete input must never exit 0.

### T5 · Medium — Agent exports can overwrite files outside the output directory

`scripts/convert.sh:125-128` opens `AGENTS.md` with shell redirection. In a disposable export directory, a pre-existing `codex/AGENTS.md` symlink to an unrelated sentinel caused `convert.sh codex` to overwrite the sentinel and report success. This requires a prepopulated or attacker-writable destination and write access to the linked file; the README suggests a predictable `/tmp` destination at `README.md:103`. Separately, the installer text at `scripts/convert.sh:137` instructs users to `cp` directly over `REVIEW.md`; following it replaced an existing team policy. The CLI initializer normally preserves that policy.

**Fix and prove:** Generate into a fresh private directory, refuse unsafe existing destinations and linked ancestors, and print the non-clobbering `--init-review` installation path. A prelinked external sentinel and an existing custom policy must remain byte-identical.

### T6 · Medium — Accepted inputs can suppress the report or stall the process

These are three separately reproduced failure modes for a user importing findings or operating an integration:

| Input | Observed behavior | Fix and acceptance check |
| --- | --- | --- |
| A valid confirmed-high JSON fixture, 280,858 bytes after replacing only its remediation strategy with 140,000 backtick/text pairs | `src/reporter.js:31-32` spreads the matches into `Math.max` and throws `RangeError`. The CLI with a synthetic ready engine exited 2 and wrote **no JSON** even with `--format json`, because it always builds Markdown first (`src/cli.js:62`). | Compute maximum fence length iteratively and render only requested formats. The same input must produce parseable JSON and valid Markdown. |
| 200 distinct findings on the same line from each lens | `src/correlation.js:14-22` materialized **40,000** pairs; the rendered report contained **6.8 million characters**. The input limit is 10,000 records per lens (`src/contracts.js:120`). A larger exhaustion event is an inference; the test stopped at 200. | Group intersections or enforce a documented output budget; disclose omitted pairs, preserve individual findings, and test a heavily shared location. |
| A FIFO passed as `--findings`, with no writer | `src/orchestrator.js:25-27` accepted a size of zero and blocked in the synchronous read. An external deadline had to kill the test child. The OCR scan deadline cannot help before the scan starts. | Open without blocking, require a regular file, and enforce the actual byte limit while reading. A FIFO must fail promptly with a diagnostic. |

### T7 · Medium — The supported OCR version is not enforced at the execution boundary

The CLI doctor checks 1.13.3 (`src/doctor.js:42-45`); the public native runner merely records a version before scanning (`src/orchestrator.js:41-43`). A synthetic subprocess reporting **9.9.9** was called to scan and could return a complete result. There is an additional reproducibility issue with the supported npm launcher: in a cold-start simulation of the installed 1.13.3 launcher, intercepted child creation showed that **`ocr version` starts a detached updater**. Its installed `bin/ocr.js:89-108` branches on `OCR_NO_UPDATE`; `scripts/update.js:152-159` can run a global npm install if a newer release is found. No upgrade was performed in the simulation.

**Fix and prove:** Suppress the updater on all managed OCR invocations (including doctor, session calls and contract tests), and check the supported native version immediately before execution in the library as well as in the CLI. With an unsupported binary or updater fixture, there should be zero scan or upgrade calls.

### T8 · Medium — A custom runner can label an unverified candidate as confirmed

`src/engine-result.js:46-57` validates field types and a reproducible content hash but does not enforce source-specific verdict requirements. Changing an architect candidate to `confirmed`, recomputing its ID, and returning it through a custom runner produced a P1 blocker with `evidence: []` and `verification: null`. This can make a buggy integration report proof it does not have. Normal native OCR normalization keeps comments as candidates (`src/contracts.js:75-76`); this is not a bypass of the raw Cloudflare JSON import schema.

**Fix and prove:** Define the confirmation contract for custom engines and validate it at ingestion. An unsupported confirmed architect record must be rejected or remain a candidate; a supported record with valid confirmation evidence must retain its verdict.

### T9 · Medium — The advertised public install command has no public package to resolve

`doublecheck --help` says `Usage: npx @poferraz/doublecheck [path] [options]` (`src/cli.js:28`); the bug template repeats it. An anonymous GET to the [registry metadata endpoint](https://registry.npmjs.org/@poferraz%2fdoublecheck) returned HTTP 404 and `{"error":"Not found"}`. That establishes the public first-run failure, not whether a private package or internal registry exists. The local tarball works. It also includes a README linking to six distinct missing local targets, including `SECURITY.md` and the verification record (`package.json:10-16`, `README.md:43,114,126-128`).

**Fix and prove:** For this unreleased checkout, say **“From the repository root: `node ./bin/doublecheck.js [path] [options]`.”** Include essential package documents or link to versioned repository copies. Have a new reader follow the exact public instructions and check every local link in the unpacked tarball. No publication is needed to correct the instructions.

### T10 · Medium — Cursor ignores the exported project rule

`bash scripts/convert.sh cursor --output-dir <fresh-directory>` produced five `.md` files and zero `.mdc` files, then instructed the user to copy them into `.cursor/rules/` (`scripts/convert.sh:103-112`). [Cursor's project-rule contract](https://cursor.com/docs/rules) requires `.mdc` for a rule in that directory. The link-integrity test at `tests/export-links.test.js:21` expects the current filename. Export contents and host contract were checked; a live Cursor session was not used.

**Fix and prove:** Generate a `.mdc` entry with the intended activation metadata, retain reference manuals as Markdown, and check both entry discovery and references. Verify activation in a real host before advertising support.

### T11 · Medium — Losing the native prerequisite also discards independent imported evidence

With the supplied confirmed-high fixture, a deliberately unreachable local Ollama endpoint and `--format json`, the actual CLI exited 2 and wrote no report. `src/cli.js:56-58` returns on preflight failure before the independent findings importer runs. The test named “failed OCR preserves imported candidate” injects a successful preflight (`tests/cli.integration.test.js:18-24`); it verifies a later failure. Exit 2 is appropriate. The issue is losing the evidence a user already has when the other engine is unavailable.

**Fix and prove:** For a scan with supplied findings, preserve the valid import in a partial report with the native preflight failure and exit 2. Keep `--doctor-only` side-effect free. Test with an unreachable daemon, not just a throwing runner.

### T12 · Lower priority — The CLI and default Markdown report do not explain the user's next decision

- A mock successful native execution with zero comments and unknown coverage produced `Review incomplete` and `Confirmed P0: 0; P1: 0; unresolved: 0`, exit 2. JSON correctly retained `UNKNOWN_NATIVE_COVERAGE`; the terminal did not explain it (`src/cli.js:66-68`). Suggested output: **“No findings reported. OCR did not provide file coverage, so this scan cannot pass a CI gate (exit 2).”** Use reason-specific messages for other causes of exit 2.
- The confirmed fixture's reproduction instructions and observed result survive in JSON but not in default Markdown. A generated correlation referred to IDs that did not appear on the individual findings (`src/reporter.js:20-33,105`). Print bounded evidence and label findings with resolvable IDs. The default report should let a reader follow the overlap and see why the imported finding was confirmed.
- A typo and an existing custom `REVIEW.md` both got the same generic error (`src/cli.js:69`). `--doctor-only --init-review --force` actually replaced an existing scratch policy and returned 0 without doing a health check (`src/cli.js:22,49-52`). Reject incompatible operations before writes, and give safe, specific hints for known input errors. A combined doctor/init invocation must leave the policy untouched.

## Coverage, strengths, and remaining gaps

| Area | What was inspected or exercised | Result |
| --- | --- | --- |
| Code, architecture, performance and CI gate | Target resolution → runners → validation → correlation → rendering → exit helper; valid, failed and mismatched fixtures | T2–T4, T6–T8. Preserve the distinction between process success, coverage and verdict. |
| Security and privacy | Provider resolution, subprocess arguments, output and export paths, untrusted imports, OCR update behavior, recovery guards | T1, T2, T5–T8. Staged report files use restrictive permissions (`src/output.js:40-45`); recovery checks a new, process-identified session against target and time (`src/ocr-session.js:20-32`). |
| User flow, design and accessibility | Checkout discovery, public install path, help, doctor, report generation, plain-text terminal, Markdown, JSON, CI and host exports | T9–T12. Status uses text rather than color alone. No visual UI or screen-reader session was tested. |
| File structure, naming and API | Package layout, exported files, generic vs. project `REVIEW.md`, intermediate results vs. final report, user-facing “dual” vs. import-only implementation | T4, T5, T9, T10. Keep the separate source template and fixtures. Document or type `AuditResult` vs. `Report` at the helper boundary; do not rename directories without a concrete consumer benefit. |
| Marketing and adoption | README, launch notes, package description/keywords, CLI help, issue template, actual package inventory | T9–T12. Preserve the README's clear disclosure that the adversary adapter imports findings and unknown coverage stays partial. **Hypothesis:** a sample report before provider setup would help first-time users; test whether a new reader can identify the next action after exit 2. No conversion data was available. |
| Release and maintenance | Lockfile install, package smoke, CI matrix definitions, manual native workflow, test fixtures, exporter and pinned schema provenance | T3, T7, T9, T10. Offline tests and packaged smoke are useful; they cannot establish live model accuracy, target coverage or host discovery. |

**Checks actually run:** `npm ci --offline --no-audit --fund=false` in a temporary directory with the manifests (passed); `npm test -- --no-cache` (146/146); `npm run test:integration` (5/5, included in the 146); `npm run smoke:consumer` (passed on Node 26.12.0); `node scripts/verify-ocr-contract.mjs --preview-only` (passed on installed OCR); local `npm pack` (31 entries); disposable export, importer, boundary and CLI reproductions described above. The smoke's passing scope is package loading and output generation on a synthetic engine, not a real completed scan.

**Not verified:** live model quality or recall, the full provisioned native mock-inference workflow, other Node/OS matrix jobs in this run, hosted Claude integration and interactive host discovery, authenticated/private package access, or adoption metrics. The dedicated synthetic native provider was not already provisioned. No provider configuration was changed, no repository contents were sent to a model, and no package or change was published.

**Fix order:** First enforce the effective provider and exact target before inference (T1–T2). Then bind coverage and findings to one validated report and gate (T3–T4). Protect user files and bound untrusted input work (T5–T6), then harden adapter version and verdict checks (T7–T8). Before inviting new users, verify the checkout command and host entry point, preserve useful evidence on failures, and test what users conclude from the default output (T9–T12).
