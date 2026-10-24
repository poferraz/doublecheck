# Changelog

All notable changes to `doublecheck` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.1] - 2026-10-24

### Added
- **Claude Code Review Integration:** Added native integration with Anthropic's [Claude Code Review](https://code.claude.com/docs/en/code-review).
- **`--init-review` CLI Flag:** Command to scaffold `.github/REVIEW.md` directly into any repository, encoding `doublecheck`'s dual-lens methodology into GitHub PR checks.
- **`convert.sh review-md` Target:** Added export capability to generate standalone `REVIEW.md` for team-wide PR governance.
- **Defense-in-Depth Reference Manual:** Added `skills/doublecheck/references/defense-in-depth.md` defining the two-tier security model (local Ollama inner loop + cloud PR review outer loop).
- **Canonical Library Export:** Added `src/index.js` exporting the full programmatic API for external Node.js consumers.
- **Community Templates:** Added GitHub issue templates for bug reports and attack class requests, plus a pull request checklist template.

### Security & Hardening
- **Process Execution:** Replaced shell string interpolation in `src/orchestrator.js` and `src/doctor.js` with parameterized `execFileSync` argument arrays, eliminating command injection risks.
- **Filesystem Isolation:** Replaced predictable `/tmp` filenames with secure, isolated directories via `fs.mkdtempSync(path.join(os.tmpdir(), 'doublecheck-'))` with guaranteed `finally` cleanup.
- **Path Traversal Protection:** Hardened `normalizePath` in `src/reporter.js` against relative directory traversal attacks (`../`).

---

## [0.1.0] - 2026-10-23

### Added
- **Dual-Perspective Audit Engine:** Multi-perspective code security and architecture review synthesizing Cloudflare's Adversary lens and Alibaba's Architect lens.
- **Convergence Engine:** Automatic detection and elevation of overlapping defects to Priority 0 Immediate Blockers.
- **Local Ollama Inference:** 100% private, zero-token-cost local LLM execution supporting DeepSeek V4, Qwen 2.5 Coder, and Mistral.
- **Universal Agent Skill:** Formatted to the Agent Skills specification for Claude Code, Cursor, Windsurf, and Google Antigravity.
- **Reporting Engine:** Formatted Markdown and structured JSON report outputs.
