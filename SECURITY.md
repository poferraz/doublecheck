# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

---

## Reporting a Vulnerability

The `doublecheck` project takes software security seriously. If you discover a vulnerability in this toolkit, please report it privately:

1. **GitHub Security Advisory:** Submit a report via [GitHub Private Vulnerability Reporting](https://github.com/poferraz/doublecheck/security/advisories/new).
2. **Email Disclosure:** Contact `210631651+poferraz@users.noreply.github.com`.

### Scope
- Exploitable bugs in `src/cli.js`, `src/doctor.js`, `src/orchestrator.js`, or `src/reporter.js`.
- Insecure defaults or path traversal vulnerabilities in report generation or temporary file storage.

---

## 🔒 Sandboxing & Execution Guarantees

1. **Child Process Isolation:**
   - All subprocesses (such as Alibaba OCR or system discovery tools) are invoked via `child_process.execFileSync` with discrete argument arrays. Shell string interpolation is strictly disallowed to prevent command injection.
2. **Filesystem Sandboxing:**
   - Temporary file generation uses isolated directories (`fs.mkdtempSync`) with automatic cleanup in `finally` blocks.
   - All file paths reported across external tools are normalized and stripped of relative directory traversal sequences (`../`).
3. **Data Privacy Boundary:**
   - Running `doublecheck` locally communicates exclusively with your local Ollama daemon (`http://localhost:11434`). No code tokens or telemetry are ever sent to external cloud services during local audits.
   - Cloud PR reviews (via Claude Code Review) operate strictly on branches explicitly submitted to GitHub pull requests and are governed by your repository's Anthropic organization settings.

We commit to acknowledging your report within 48 hours and coordinating a responsible release.
