# Contributing to `doublecheck`

Thank you for your interest in contributing to `doublecheck`! We are building a multi-perspective code security and architecture review toolkit designed for both human developers and autonomous AI agents.

---

## 🛠️ Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/poferraz/doublecheck.git
   cd doublecheck
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify the test suite:**
   ```bash
   npm test
   ```

4. **Run the local doctor check:**
   ```bash
   ./bin/doublecheck.js --doctor-only
   ```

---

## 📐 Architecture Principles

- **Test-Driven Development (TDD):** Every bugfix, attack class, and CLI feature must carry unit tests in `tests/`.
- **Zero Cloud Invariant:** The core runner must always function 100% locally via Ollama with zero mandatory cloud API keys.
- **Agent Skills Compliance:** Any enhancements to `skills/doublecheck/SKILL.md` must adhere to the [Agent Skills specification](https://agentskills.io/specification).
- **Process & Filesystem Security:** Never use shell string interpolation in process execution (always use `execFileSync` with argument arrays); isolate all temp files via `fs.mkdtempSync`.
- **Security First:** Never commit credentials, private tokens, or real victim target dumps.

---

## 🚀 Submitting Pull Requests

1. Fork the repo and create your branch: `git checkout -b feature/my-new-feature`.
2. Commit your changes: `git commit -am 'feat: add new attack class'`.
3. Push to the branch: `git push origin feature/my-new-feature`.
4. Open a Pull Request with a clear summary of your changes.

### Automated Pull Request Review
Pull requests in this repository are analyzed automatically by [Claude Code Review](https://code.claude.com/docs/en/code-review) guided by [`.github/REVIEW.md`](.github/REVIEW.md).
- Reviews flag command execution risks, async promise rejections, and test mocking invariants as inline PR comments.
- Review checks are advisory and non-blocking, but maintainers require resolving all P0 (Blocker) findings prior to merge approval.

---

## 📦 Releasing New Versions

`doublecheck` strictly follows [Semantic Versioning](https://semver.org/):
1. **Document Changes:** Update [CHANGELOG.md](CHANGELOG.md) under a new version heading adhering to [Keep a Changelog](https://keepachangelog.com/).
2. **Bump Version:** Update `"version"` in `package.json`.
3. **Verify Builds:** Run `npm test` and `bash scripts/convert.sh all`.
4. **Tag & Release:** Commit changes, create a git tag (`git tag vX.Y.Z`), push to GitHub (`git push origin main --tags`), and draft the release notes using GitHub Releases.
