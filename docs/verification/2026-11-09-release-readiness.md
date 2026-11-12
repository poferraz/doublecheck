# Release validation — 0.2.0 published November 11, 2026

## Current publication status

**Doublecheck 0.2.0 is published.** [PR #1](https://github.com/poferraz/doublecheck/pull/1) was merged; tag `v0.2.0` points to commit `c62e794164803ae919dd16a8955dc3f595c356ac`. The [GitHub release](https://github.com/poferraz/doublecheck/releases/tag/v0.2.0) and public [npm package](https://www.npmjs.com/package/@poferraz/doublecheck/v/0.2.0) were published on November 11, 2026 (America/Vancouver). npm's `latest` tag resolved to 0.2.0 during post-publication verification.

The exact frozen tarball was published without repacking: 52,199 bytes, 37 files, SHA-256 `aec750c13c80ab228ffd7b672ded85ad1043d0ebfbb7a894f329a4d819b20795`. Anonymous downloads from npm and GitHub matched that hash. Later repository documentation changes do not alter the published 0.2.0 tarball or its tag.

Fresh anonymous installations used empty npm configuration, a token-free environment and new caches against the public registry. Exact `@poferraz/doublecheck@0.2.0` on Node 20.0.0 and default `@poferraz/doublecheck` on Node 26.13.0 each passed CLI help, `--init-review` and library API checks. All 37 installed file contents and executable modes matched the verified tarball, and each lockfile integrity value matched registry SRI. Both installations had zero runtime dependencies. These checks did not run model inference.

All six final PR jobs passed: [CI](https://github.com/poferraz/doublecheck/actions/runs/43124161872) and [native OCR mock contract](https://github.com/poferraz/doublecheck/actions/runs/43124161873). All five [post-merge CI jobs](https://github.com/poferraz/doublecheck/actions/runs/43124533492) passed on the tagged main commit. Each development runtime passed 267 tests across 26 files and the separate 6-test CLI integration suite. The mock contract used OCR 1.13.3 and correctly retained unknown native coverage with scan exit 2.

Local publication receipts are retained under the ignored `dist/release/0.2.0/` directory in `publication-verification.json`, `post-publish-consumer-verification.json`, `github-ci-final.json` and `github-ci-main.json`. Public release assets include the frozen tarball and `SHA256SUMS`.

Native unknown coverage, model-quality limits and bounded host-activation evidence still apply. The earlier snapshot below is preserved as dated history; its pending merge, tag and publication statements are superseded by this section.

## Historical pre-merge snapshot — updated November 11, 2026

This is a pre-merge validation snapshot. The additional PR review and regression requirements are recorded in `2026-11-11-pr-review.md`; [PR #1](https://github.com/poferraz/doublecheck/pull/1) carries the latest checks and merge state. Artifact changes after this snapshot supersede the historical package identity below.

**Disposition: Doublecheck 0.2.0 is ready for release review, subject to green checks on the final PR head and explicit merge/tag/publication authorization.** The release branch is pushed and [PR #1](https://github.com/poferraz/doublecheck/pull/1) is open. Nothing has been merged, tagged or published. GitHub-hosted Ubuntu x64 passed all five Node matrix jobs and the native OCR mock contract on `b722126d193a5f9e29fef3aa694b1388093877c9`. Hosted Codex and Antigravity desktop activation passed bounded checks on two synthetic files. Other host exports retain their stated validation limits.

## Prepared 0.2.0 artifact and CI

The package and both lockfile roots are aligned at **0.2.0**. The changelog, security support line, launch notes and package migration guide are aligned. The npm allowlist now ships a focused migration note instead of stale implementation plans and verification records; all 17 local links across the 12 packaged Markdown documents resolve.

The candidate tarball, exact hash, frozen source revision, per-file manifest, consumer results and `SHA256SUMS` are retained under `dist/release/0.2.0/`. The package is rebuilt after shipped documentation changes and verified against its frozen source. Consult `release-manifest.json` for the current artifact; the November 9 tarball and its local Ubuntu results are historical evidence, not the replacement artifact's identity.

The pre-review November 11 `poferraz-doublecheck-0.2.0.tgz` was 50,655 bytes and 36 files, SHA-256 `401982a4a4f67cd31a4483d89f0054a1547fe1a110a87bef3512264fdba302d8`, corresponding to head `44c9408`. It passed exact offline installation, installed CLI and library checks on Node 20.0.0 and 26.12.0. All packaged files matched the staged source; 17 local Markdown links and the unique fragment check resolved. The PR review fixes require a new package and manifest before later publication.

GitHub-hosted x64 checks passed: [CI](https://github.com/poferraz/doublecheck/actions/runs/43118968164) and [Native OCR contract](https://github.com/poferraz/doublecheck/actions/runs/43118968231). The five matrix cells used Node 20.0.0, 20.20.2, 22.12.0, 24.22.2 and 26.13.0. All three development runtimes passed 222 full tests and 6 integration tests. The native workflow passed with OCR 1.13.3; its inner scan correctly returned 2 with unknown coverage. Machine-readable evidence is in `2026-11-11-github-ci.json`. Final-head checks are linked from the PR and recorded beside the final artifact.

The following earlier local Ubuntu checks remain supporting evidence:

| Earlier CI-equivalent job | Local Ubuntu result on November 9 frozen sources |
| --- | --- |
| Node 20.0.0 and 20.20.2 | Each packaged consumer smoke passed without development dependencies. |
| Node 22.12.0, 24.22.2 and 26.13.0 | Each clean install, 222/222 full tests (25 files), 6/6 integration tests, shell syntax and root policy check passed. |
| Native OCR contract, Node 24.22.2 | OCR 1.13.3 linux/arm64 reached the provisioned loopback mock; workflow command exited 0, inner scan remained partial with unknown coverage and exit 2. |

The guest used Ubuntu 24.04.5 LTS ARM64 and official checksum-verified Node distributions. Its standard `libatomic1` dependency was installed before the official Node 26 binary could run. No host installation or provider configuration was changed, and the guest was deleted after collecting logs. The workflow equivalent did not require sending source to a model or publishing it.

The native CI check exposed a mock-protocol bug: plain text did not complete OCR's required `task_done` tool call. The mock now returns the advertised tool contract in both response formats, with regressions. The workflow disables OCR self-updates during provider setup as well as during execution. It now runs on PRs so its first check can execute before the new workflow reaches main. Ubuntu's 0002 umask also exposed test fixtures whose output directories were accidentally group-writable; those fixtures now explicitly create private output roots, preserving the export guard. The final local macOS full suite and packaged smoke pass as well.

## Earlier live and host checks

| Check | Observed result | Limits |
| --- | --- | --- |
| Real native inference through OCR 1.13.3 and configured custom Ollama provider | Process succeeded in 11.651 seconds; DeepSeek V4.1 Flash `1017-cloud`; 3 unverified candidates saved to Markdown/JSON; exit 2 and `UNKNOWN_NATIVE_COVERAGE`. | Only synthetic fixture code sent with explicit `--allow-remote`. All 12 installed Ollama entries are cloud-backed; this was not a local-model test. |
| Known synthetic vulnerability | Model identified request query → `eval` as a critical candidate at the correct lines. A harmless `?code=1%2B1` invocation reproduced query-controlled evaluation with observed output `2`. | One positive example is not a recall estimate. No attack against a real service was performed. |
| Safe parser control | One low documentation concern and one high exception-handling candidate were returned. The high concern assumed an exception-free wrapper contract that was not supplied. | This is an unsupported candidate/false positive, preserved for validation. No candidate became confirmed or produced a passing gate. No precision estimate is established. |
| Real OCR timeout | One-second deadline returned after 1.008 seconds; both report formats saved; execution `timed_out`, status `failed`, `OCR_PROCESS_TIMEOUT`, exit 2. | Synthetic handler only; no saved-session recovery was possible because no file had completed. |
| Codex CLI 0.163.0 discovery and hosted activation | Offline context discovery passed with a negative control. After explicit user authorization, the hosted read-only turn completed (CLI exit 0), read exactly the three approved files, traced query input into `eval`, rejected the unsupported parser claims, distinguished candidates and scope, and stated the CLI coverage limits correctly. | Two synthetic files only; JavaScript was not executed. A bounded reproduction was described as source-derived, not observed. No CLI certification or accuracy estimate was claimed. Ephemeral host startup reported unrelated MCP authentication warnings; the review used only one read-only file-inspection command. |
| Node 20.0.0 and 20.20.2 | Packaged CLI/library consumer smoke passed without development dependencies. | macOS arm64; official Node binaries verified against official SHA256 manifests. |
| Node 22.12.0 and 24.22.2 | 218/218 tests, 25 files, and separate clean offline lockfile installation passed on each. | Local macOS runs, not Ubuntu GitHub Actions results. |
| Node 26.12.0 | Fresh 218/218 tests, packaged smoke and diff checks passed after the instruction correction below. | No additional model-quality claim. |
| Antigravity desktop 2.31.0 activation | Fresh committed Git workspace exposed `/doublecheck` in the picker. Selected skill was applied; `rulesets.md` was visibly loaded. Complete answer traced query input to `eval`, rejected malformed JSON throwing alone as a confirmed bug, and disclosed runtime/other-file limits. | Model label `Gemini 4 Argon High`; backend ID not reported. Initial answer labeled the handler confirmed critical before supplying its bounded reproduction; a follow-up supplied expected output `2` and missing deployment assumptions. No JavaScript was executed. Production severity/exposure is unverified. |
| Antigravity CLI 1.4.7 activation | Explicit skill expansion and read-only reads of both fixtures plus `attack-classes.md` and `rulesets.md`; exit 0 in 20.502 seconds. Handler was labeled `needs_validation`. | Captured final answer stopped mid-link at 658 characters. Final safe-control and coverage judgments were not demonstrated by the CLI; complete conclusions above belong to the desktop run. |

## Fix from these checks

The converter advertised the obsolete Antigravity installation directory `~/.gemini/antigravity/skills/`. The actual installed Antigravity 2 guide specifies `.agents/skills/<name>/SKILL.md` for a project or `~/.gemini/config/skills/<name>/SKILL.md` globally. Corrected generated guidance, help and README. Exported skill content was unchanged. Antigravity testing was resumed only after the user's November 11 request. The project-scoped export was discovered and applied on the recorded host version.

The successful fresh desktop project is `/private/tmp/doublecheck-antigravity-6TD8ls`. The earlier saved-project lookup issue was not isolated: the successful run changed the host project ID, path and Git state together. Only public pushed instructions and synthetic fixtures were used. No global provider settings or global skills were changed. Exact input digests, prompts, answers and limits are in `2026-11-11-antigravity-activation.json`.

## Publication handoff and remaining validation limits

- Antigravity project-skill activation is demonstrated on the recorded versions and two synthetic files. The desktop reproduction was source-derived and supplied only after follow-up. CLI truncation remains a host limitation. Cursor, Claude Code and Windsurf applications were not installed here; their exports have contract/link checks but no interactive activation result.
- Local Ubuntu CI-equivalent and GitHub-hosted x64 jobs passed. Require green checks on the final PR head before merging; current results are linked from the PR and retained with the artifact.
- The versioned 0.2.0 candidate and metadata are prepared and pushed for review. Merge, tag and npm publication remain separately authorized actions. Publish only the verified artifact identified by its manifest and `SHA256SUMS`; repeat artifact checks if any shipped file changes.
- Treat live model output as candidates. The safe-control false positive requires human validation and precludes accuracy guarantees.

Hosted Codex input digests, observed tool use and complete answer are retained in `2026-11-09-codex-activation.json`. The previous transmission approval block is resolved; no further hosted calls are pending. Native scan evidence and exact synthetic fixtures are retained in `2026-11-09-live-inference.json` and `2026-11-09-live-timeout.json`. Existing safety regressions and remediation mapping are in `2026-11-09-audit-remediation.md`.
