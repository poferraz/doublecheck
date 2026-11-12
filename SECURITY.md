# Security Policy

## Reporting

Report toolkit vulnerabilities privately through [GitHub Private Vulnerability Reporting](https://github.com/poferraz/doublecheck/security/advisories/new). Avoid including credentials or private target source in public issues. Security fixes target the 0.2.x package line. Published version [0.2.0](https://www.npmjs.com/package/@poferraz/doublecheck/v/0.2.0) uses report schema v2; older callers need the [documented migration](docs/RELEASE_0.2.0.md).

## Trust and execution boundaries

Doublecheck invokes OCR through parameterized subprocess arguments, uses unique temporary directories, validates tool data, and retains incomplete states. These measures do not establish an OS sandbox. OCR and its configured tools run with the invoking user's privileges; review only targets and tool configurations you are authorized to inspect.

The adversary CLI adapter imports JSON. It does not execute Cloudflare's security-audit workflow or independently reproduce imported claims. Native OCR comments remain candidates. Confirmed, unresolved, and rejected states are distinct; correlation never establishes confirmation or raises severity. Review completeness and vulnerability absence are different claims.

Findings paths are canonicalized against the target root for identity. Out-of-root records are rejected instead of rewritten into plausible in-root paths. This is lexical validation, not symlink-safe filesystem confinement. Display-only `normalizePath` is not a security boundary.

## Inference and privacy

Native scans reject reserved built-in provider names for custom routing, require remote consent for models that Ollama explicitly reports as remote-backed, and require a matching custom OCR provider and pass its name/model explicitly. Provider credential commands are refused; Doublecheck does not modify global provider settings. Arbitrary remote routing and cloud-tagged models require `--allow-remote`. Endpoint URLs with credentials, query strings, or fragments are rejected. Ollama readiness probes do not follow redirects.

A loopback URL can still reach a forwarding daemon/proxy. Model locality is reported as unverified; there is no unconditional local-only/no-egress guarantee. Configure Ollama's cloud features separately, assess OCR's configured tools, and apply OS/network isolation when your environment requires it. The optional Claude Code Review service runs under its own cloud/account policies.

Reports intentionally contain review evidence and may contain sensitive source excerpts or absolute target paths. Treat them as sensitive artifacts. Diagnostics avoid raw records, subprocess error messages, and credentials, but redaction is not a substitute for reviewing artifacts before sharing them. Staged report files are created with restrictive permissions; Markdown escapes external structure. Output pairs are not transactionally atomic.

## Validation limits

Managed OCR invocations disable its automatic updater; the doctor and native runner each enforce the supported version. The supported OCR version is 1.13.3; future versions require contract evidence. Its full-file scan lacks a coverage manifest and remains partial. The pinned upstream Cloudflare schema validates verdict-specific fields, but cannot authenticate the author, reproduce an exploit, or prove the supplied code matches your checkout. Unknown import coverage remains explicit. See [validation and limits](docs/RELEASE_0.2.0.md#validation-and-limits).
