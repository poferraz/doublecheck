## Description
Briefly describe your changes and why they are needed.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (new attack class, AST rule, or CLI capability)
- [ ] 📖 Documentation update
- [ ] 🛡️ Security / hardening improvement

## Checklist
- [ ] My code adheres to the zero-external-runtime-dependencies rule.
- [ ] All child process calls use `execFileSync` with discrete argument arrays (no shell string interpolation).
- [ ] Temporary files use `fs.mkdtempSync` with cleanup in `finally` blocks.
- [ ] Unit tests covering the changes have been added in `tests/`.
- [ ] All tests pass cleanly (`npm test`).
- [ ] Pre-flight doctor check passes (`./bin/doublecheck.js --doctor-only`).
