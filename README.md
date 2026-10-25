# doublecheck

Evidence-aware code security and architecture review for developers and AI coding agents.

[![CI](https://github.com/poferraz/doublecheck/actions/workflows/ci.yml/badge.svg)](https://github.com/poferraz/doublecheck/actions/workflows/ci.yml)

This checkout contains **unreleased report schema v2 changes**. The package version remains `0.1.1`; published npm builds may not include these changes. Commands below run this checkout. The package name is `@poferraz/doublecheck`.

Doublecheck validates review findings, preserves verification state and scan coverage, correlates exact source locations, and writes Markdown/JSON reports. An adversary review looks for exploitable trust-boundary failures; an architect review looks for correctness and lifecycle defects. Their overlap is evidence to investigate, not proof of a critical vulnerability.

## Current capabilities and limits

| Input or mode | Behavior |
| --- | --- |
| Native Alibaba OCR 1.13.3 | Runs a full-file scan using an explicitly selected custom provider. Comments remain candidates. |
| `--findings file.json` | Imports Cloudflare-format records; it does not execute Cloudflare's security-audit workflow. |
| Default `--mode dual` | Requires adversary and architect coverage. An absent lens cannot be reported as a complete dual review. |
| `--mode architect` | Requires only architect coverage; the unrequested adversary lens is labeled skipped. |
| Coverage unavailable | Report is partial, even if there are no findings. OCR 1.13.3 `scan` currently has no coverage manifest, so its full-file scans remain partial. |
| Agent skill | Guides a host agent through evidence gathering and verification; actual host/model quality requires separate evaluation. |
| Root `REVIEW.md` | Supplies guidance to an already configured Claude Code Review service; it does not install the service or enforce a merge gate. |

## Run this checkout

Runtime: Node.js `>=20.0.0`. Development tests: Node `22.12+` within the supported 22.x range, 24.x, or 26.x. OCR `1.13.3` and a reachable Ollama daemon with an installed tool-capable model are required for native scans. Model quality and tool support must be checked for your chosen model.

Configure a **custom** OCR provider manually. These commands change your OCR configuration; Doublecheck does not run them for you. Use the same installed model name throughout:

```bash
ocr config set provider ollama
ocr config set custom_providers.ollama.url http://localhost:11434/v1
ocr config set custom_providers.ollama.protocol openai
ocr config set custom_providers.ollama.model qwen3:8b
ocr config set custom_providers.ollama.api_key ollama

node ./bin/doublecheck.js --doctor-only --model qwen3:8b
node ./bin/doublecheck.js . --mode architect --model qwen3:8b --format both -o review.json
node ./bin/doublecheck.js . --findings findings.json --model qwen3:8b
```

The placeholder key is required by OCR's custom-provider configuration; it is not a cloud API credential. Doublecheck checks the named provider's URL, protocol, and accepted model before invoking OCR with explicit provider/model arguments. It rejects credential commands for that provider and does not silently use an ambient cloud provider.

A loopback endpoint does not prove local inference: a daemon or proxy can forward requests. Remote endpoints and cloud-tagged models require `--allow-remote`; that flag is consent to routing, not a guarantee about provider data handling. Configure your daemon's cloud policy separately. See [SECURITY.md](SECURITY.md).

## Reports and exit codes

JSON uses `schemaVersion: "doublecheck/report/v2"` and contains `status`, `engines`, the full canonical `findings` list, `correlations`, confirmed `p0/p1/p2`, `unrated`, `unresolved`, `rejected`, and diagnostics.

- **Confirmed** records require the supported verification contract. Native OCR comments and historical records without verdicts remain **needs_validation** candidates.
- **Rejected** records remain separate and never become blockers through correlation.
- Missing severity remains **Unrated**. Malformed records produce diagnostics; valid siblings are retained.
- Exact content duplicates collapse; same-title or same-line distinct findings survive.
- Correlations require exact canonical file identity and overlapping known line ranges. Missing lines and nearby lines do not count.

| Exit | Meaning |
| --- | --- |
| `0` | Required coverage is complete, with no confirmed high/critical finding or unresolved high/critical/unrated candidate. Lower-severity candidates remain visible. |
| `1` | Required coverage is complete and confirmed high/critical findings exist. |
| `2` | Review is incomplete/failed, high/critical/unrated candidates remain unresolved, or invocation/preflight/output fails. Incompleteness takes precedence. |

Native execution metadata distinguishes process success, timeout, and failure from review coverage. Requested provider/model/endpoint are retained separately from actual reported identity, including when output is missing. Timeouts emit `OCR_PROCESS_TIMEOUT` without exposing raw external error text.

If OCR fails before writing its output, Doublecheck attempts saved-session recovery only when that process emitted an exact session marker. The ID must be absent from the pre-run inventory and its saved metadata must match this repo, model, and run time. A missing/conflicting marker, unavailable inventory, mismatching metadata, or malformed comments prevents recovery. A hard kill may therefore still require manual recovery with `ocr session` commands. Recovered comments remain candidates with unknown coverage and a partial result; recovery never converts a failed process into a clean review.

Native OCR 1.13.3 full-file scans currently return **2** because coverage is unknown. This is expected and must not be swallowed in CI. A complete clean review means coverage completed; it is not a security certification.

For `--format both`, `-o review.json`, `-o review.md`, and `-o review` produce `review.md` and `review.json`. Single-format output honors the requested filename. Writes are staged, but the pair is not a cross-file atomic transaction; a failure lists any artifact already saved. Symlink/directory destinations and detectable hardlink collisions are refused.

## CLI options

| Option | Purpose |
| --- | --- |
| `[path]` | Existing target file/directory; default `.`. Use `--` before dash-prefixed targets. |
| `--mode dual\|architect` | Required lenses; default `dual`. Architect mode cannot import adversary findings. |
| `-m, --model name` | Installed model; otherwise choose from available non-embedding models. |
| `--ollama url` | Base endpoint; default `http://localhost:11434`. |
| `--ocr-provider name` | Matching configured custom provider; default `ollama`. |
| `--allow-remote` | Opt in to remote endpoints/cloud-tagged models. |
| `--findings file` | Import adversary JSON; missing files fail rather than become empty scans. |
| `-f, --format markdown\|json\|both` | Output format; default Markdown. |
| `-o, --output file` | Output path; defaults to `doublecheck-report.md` or `.json` for JSON-only. |
| `--scan-timeout seconds` | Overall native process deadline; default `1200` (20 minutes). Positive integer, at most `2147483`. Library `options.timeout` uses milliseconds. |
| `--doctor-only` | Check required engine configuration without running a review. |
| `--init-review` | Initialize root `REVIEW.md` without inference. Alias: `--init-review-md`. |
| `--force` | Replace custom root review instructions only with `--init-review`. |
| `-h, --help` | Print usage. Unknown flags/missing values are errors. |

## Claude Code Review instructions

```bash
node ./bin/doublecheck.js ./my-repo --init-review
```

Existing custom root instructions are preserved unless `--force` is explicit. Identical generated instructions are a no-op. Legacy `.github/REVIEW.md` files are preserved; move/reconcile your policy deliberately. This repository's own rules live in [REVIEW.md](REVIEW.md); the generic generated template lives in [src/templates/REVIEW.md](src/templates/REVIEW.md).

The service needs separate organization/GitHub App configuration. See [official customization guidance](https://code.claude.com/docs/en/code-review-customize); local `/code-review` uses a different instruction contract.

## Agent skill and exports

The native skill is [skills/doublecheck/SKILL.md](skills/doublecheck/SKILL.md). Export into a dedicated directory:

```bash
bash scripts/convert.sh all --output-dir /tmp/doublecheck-platforms
```

Supported targets: `claude`, `antigravity`, `cursor`, `windsurf`, `codex`, `review-md`, `all`. Native skill exports retain selectively loaded reference manuals; Cursor references its renamed manuals; consolidated exports link embedded anchors. Conversion checks prove generated-link integrity, not actual discovery in every host. Follow each host's installation instructions and verify activation before relying on it. Avoid overwriting an existing project routing file with an exported `AGENTS.md`.

## Library and migration

Import `@poferraz/doublecheck` after installing a build that includes schema v2. Public function names remain available, including `runDualAudit`, `synthesizeReport`, `detectConvergence`, `checkEnvironment`, and `generateDefaultReviewMd`; signatures/result shapes changed and require caller migration.

Custom runners return validated `EngineResult` objects. Legacy array-returning runners are accepted with unknown coverage/partial status. `detectConvergence` now consumes normalized findings and returns informational location correlations. Use `json.correlations.length` instead of removed `convergedCount`/`summary.convergedDefects`. `normalizePath` is a display helper; root-aware identity uses `canonicalizeFindingPath`. Deprecated `cloudflareFindings`/`alibabaComments` fields contain normalized records.

Read the [remediation contract](docs/superpowers/plans/2026-10-24-review-reliability-remediation.md) for exact interfaces and the [verification record](docs/verification/review-reliability.md) for executed checks and remaining limits.

## Development and verification

```bash
npm ci
npm test -- --no-cache
npm run test:integration
npm run smoke:consumer
node scripts/verify-ocr-contract.mjs --preview-only
```

Offline tests use synthetic records, temporary directories, and injected external boundaries. Packaged smoke exercises the CLI/library without devDependencies. The manually dispatched [native OCR contract workflow](.github/workflows/ocr-contract.yml) provisions an isolated runner provider and a loopback mock inference server; `npm run test:ocr-contract` locally requires an already configured synthetic provider and never writes your OCR config. A frozen-response evaluation corpus tests deterministic handling, not live model precision/recall.

See [CONTRIBUTING.md](CONTRIBUTING.md), [CHANGELOG.md](CHANGELOG.md), and [SECURITY.md](SECURITY.md). Apache-2.0; the vendored Cloudflare schema retains its MIT license and pinned provenance.
