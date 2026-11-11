# Release validation — November 9, 2026

**Disposition: Doublecheck 0.2.0 is prepared as a locally validated CLI/library release candidate. Nothing has been published, tagged or pushed.** The five CI matrix cells and native mock-inference contract pass against the frozen source snapshot in an isolated Ubuntu 24.04.5 ARM64 VM. The exact npm artifact also passes offline consumer checks. This is local Ubuntu validation, not a GitHub-hosted x64 status check. Hosted Codex activation has passed on two synthetic files; Antigravity remains paused and the other exported hosts retain their documented validation limits.

## Prepared 0.2.0 artifact and CI

The package and both lockfile roots are aligned at **0.2.0**. The changelog, security support line, launch notes and package migration guide are aligned. The npm allowlist now ships a focused migration note instead of stale implementation plans and verification records; all 17 local links across the 12 packaged Markdown documents resolve.

Artifact: `dist/release/0.2.0/poferraz-doublecheck-0.2.0.tgz` (50,459 bytes, 36 files). SHA-256: `431b3c82ac8ded97bcd10417a6e792d8ef78f7da2ad6314309e2d298e87f0d33`.

Frozen source: `54d37587ab9d5119a26a168f8de7f103adb49c33ad69b668e5138764aaa96112` (104 files, based on f308938). Every packed file matches that snapshot byte for byte. Checksums, source manifest, machine-readable results, raw job logs and the release handoff are retained beside the tarball. The exact artifact was installed offline in clean consumers under Node 20.0.0/npm 9.6.4 and Node 26.12.0/npm 11.20.0; the installed CLI and library both passed with no runtime npm dependencies.

| Final CI job | Ubuntu result on frozen 0.2.0 sources |
| --- | --- |
| Node 20.0.0 and 20.20.2 | Each packaged consumer smoke passed without development dependencies. |
| Node 22.12.0, 24.22.2 and 26.13.0 | Each clean install, 222/222 full tests (25 files), 6/6 integration tests, shell syntax and root policy check passed. |
| Native OCR contract, Node 24.22.2 | OCR 1.13.3 linux/arm64 reached the provisioned loopback mock; workflow command exited 0, inner scan remained partial with unknown coverage and exit 2. |

The guest used Ubuntu 24.04.5 LTS ARM64 and official checksum-verified Node distributions. Its standard `libatomic1` dependency was installed before the official Node 26 binary could run. No host installation or provider configuration was changed, and the guest was deleted after collecting logs. The workflow equivalent did not require sending source to a model or publishing it.

The native CI check exposed a mock-protocol bug: plain text did not complete OCR's required `task_done` tool call. The mock now returns the advertised tool contract in both response formats, with regressions. The workflow disables OCR self-updates during provider setup as well as during execution. Ubuntu's 0002 umask also exposed test fixtures whose output directories were accidentally group-writable; those fixtures now explicitly create private output roots, preserving the export guard. The final local macOS full suite and packaged smoke pass as well.

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
| Antigravity 2 built-in customization guide | Actual desktop guide identifies project `.agents/skills/` and global `~/.gemini/config/skills/` discovery. | Interactive activation did not complete; user requested testing stop. No further Antigravity interaction was performed after that request. |

## Fix from these checks

The converter advertised the obsolete Antigravity installation directory `~/.gemini/antigravity/skills/`. The actual installed Antigravity 2 guide specifies `.agents/skills/<name>/SKILL.md` for a project or `~/.gemini/config/skills/<name>/SKILL.md` globally. Corrected generated guidance, help and README. Exported skill content was unchanged. Further interactive Antigravity verification is paused at the user's request.

The disposable Antigravity project created before the stop request remains at `/private/tmp/doublecheck-live-ckTA1p/project` (display name `project`). Its workspace contains only synthetic files and exported instructions. No global provider settings or global skills were changed.

## Publication handoff and remaining validation limits

- Resume Antigravity activation only when requested. Cursor, Claude Code and Windsurf applications were not installed here, so their generated files have contract/link checks but no interactive activation result.
- Local Ubuntu CI-equivalent and native mock-inference jobs are complete. GitHub-hosted x64 check statuses require an explicitly authorized push of the final source revision; no remote result is claimed for the unpushed working tree.
- The versioned 0.2.0 candidate and metadata are prepared. Source review, remote CI after an authorized push, and explicit tag/publication authorization remain publication steps. No tag, push or publication was performed.
- Treat live model output as candidates. The safe-control false positive requires human validation and precludes accuracy guarantees.

Hosted Codex input digests, observed tool use and complete answer are retained in `2026-11-09-codex-activation.json`. The previous transmission approval block is resolved; no further hosted calls are pending. Native scan evidence and exact synthetic fixtures are retained in `2026-11-09-live-inference.json` and `2026-11-09-live-timeout.json`. Existing safety regressions and remediation mapping are in `2026-11-09-audit-remediation.md`.
