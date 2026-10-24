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
- **Security First:** Never commit credentials, private tokens, or real victim target dumps.

---

## 🚀 Submitting Pull Requests

1. Fork the repo and create your branch: `git checkout -b feature/my-new-feature`.
2. Commit your changes: `git commit -am 'feat: add new attack class'`.
3. Push to the branch: `git push origin feature/my-new-feature`.
4. Open a Pull Request with a clear summary of your changes.
