# Review Reliability Verification

Date: October 24, 2026. Baseline: b5e6224. Implementation: local branch codex/review-reliability; package version unchanged at 0.1.1 (unreleased changes).

## Executed locally

- Existing baseline: 26 tests passed before implementation. Final local suite: **82 tests across 16 files passed** on Node 26.12.0.
- Behavior regressions were run failing before the corresponding contract, engine, correlation, report, inference, CLI/output, root initializer, and export changes; subsequent focused/full runs passed.
- Offline CLI integration exercises completed, confirmed-high, incomplete, failed-OCR/import, executable argument validation, and existing-policy preservation paths.
- Packaged consumer smoke extracts an npm artifact and uses its executable/library without devDependencies. Executed locally on Node 26.12.0.
- Actual OCR 1.13.3 file-selection preview was executed on synthetic source. It emits a `files` array; no inference was requested by this preview check.
- Native skill pressure test: old instructions escalated LOW overlap and encouraged unsupported privacy/completeness claims. A fresh agent reading the revised instructions kept low severity, separated rejected claims, required remote opt-in, and retained unknown coverage/locality.
- Export tests generate all targets in scratch directories and resolve local files/anchors. They do not establish discovery by actual hosts.
- The evaluation corpus uses frozen synthetic responses. It is a regression corpus, not a live model precision/recall benchmark.

## Verification still requiring another runtime/environment

- Node 20.0.0/20.x packaged smoke and Node 22.12/24 unit tests are configured in CI. Those interpreters are not installed locally; their jobs were not dispatched from this chat.
- The separate workflow_dispatch native OCR job uses a synthetic configured provider and a loopback mock inference server. The full inference/output job has not been run locally, because it requires provider provisioning in a disposable account; the implementation never modifies the developer's provider configuration.
- Actual activation/discovery in Claude, Cursor, Windsurf, Antigravity, and Codex has not been exercised.
- No live-model quality, exploit reproduction against real applications, or model-locality/no-egress certification is implied.

## Important contract limitation

Pinned OCR source at 375f64cd6f67a48a135da83cfcf59c52669a09cb defines coverage manifests for `review`; `scan` stays legacy without a manifest. Native full-file scans remain partial even when successful. Unsupported/unknown coverage never becomes a clean run. Future scan-manifest support requires explicit adapter/fixture conformance work.

Cloudflare schema definitions are pinned to c1c8a8c1471069fb0e188eeaff69b8e8db6564a8 with the upstream MIT license retained. A valid imported record preserves its source-declared verdict; schema validation is not authentication or independent verification of that claim.

## Final review and corrective pass

A fresh read-only review found that custom engines could promote explicitly unknown coverage to reported coverage. The final corrective pass preserved unknown origin and made report completion require complete coverage evidence from every requested engine. Additional regressions cover direct-library inference policy enforcement before OCR launches, rejection of report paths that replace source/import inputs, and preservation of rejection reasons and unresolved validation requirements. All five new regressions failed before their fixes and passed afterward; the full 82-test suite, packaged consumer smoke, OCR preview, Bash syntax, and whitespace checks passed on the final code.

Normalized findings now retain validated verification context in `verification`: rejection reason, blockers, validation plan, root cause, intended behavior, conditions, reproduction, severity assessment, trace context, and proposed code changes. Markdown shows rejection reasons and validation requirements; JSON retains the detailed context.

Implementation choices: the existing checkout was reused on a local branch; changes are visible in that checkout. Deprecated result-array names expose canonical v2 records, as documented in the migration notes. Native OCR comments remain candidates, and import schema validation preserves the supplied verdict without authenticating it. No release, push, real-model benchmark, or global provider configuration change was performed.
