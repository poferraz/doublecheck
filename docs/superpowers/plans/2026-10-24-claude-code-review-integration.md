# Claude Code Review & Multi-Layer Defense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate Claude Code Review as a continuous cloud security layer for `doublecheck`, harden internal execution boundaries (command injection, temp files, path traversal), provide a `REVIEW.md` generation engine for users, and establish a dual-tier defense-in-depth model across the entire repository.

**Architecture:**
1. **Internal Hardening:** Eliminate shell string concatenation in `src/orchestrator.js` and `src/doctor.js`, use secure isolated temporary directories with restricted permissions, and provide the missing `src/index.js` library entrypoint.
2. **Repository PR Review:** Author a project-specific `.github/REVIEW.md` tailored for Claude Code Review and wire verification into `.github/workflows/ci.yml`.
3. **Bridge & Generation:** Add a `--init-review` CLI command in `src/cli.js` and a `review-md` conversion target in `scripts/convert.sh` that translates `doublecheck`'s dual-lens methodology into a ready-to-use `REVIEW.md` for any codebase.
4. **Agent Skill & Documentation:** Add `defense-in-depth.md` to `skills/doublecheck/references/`, update `skills/doublecheck/SKILL.md`, and document the two-tier defense model in `README.md`, `CONTRIBUTING.md`, and `SECURITY.md`.

**Tech Stack:** Node.js (ESM, `>=20.0.0`), Vitest, GitHub Actions, Agent Skills Specification, Claude Code Review (`REVIEW.md`).

## Global Constraints
- Node.js runtime: `>= 20.0.0`
- Zero external runtime dependencies (keep `package.json` zero-dependency outside `vitest` in devDependencies)
- Permissive Apache 2.0 license preserved across all headers
- Strict TDD: Write failing tests before writing implementation code
- Zero mandatory external API keys for core audit execution (100% local Ollama inference default)
- Backward compatibility: All existing CLI flags (`-m`, `--ollama`, `-f`, `-o`, `--doctor-only`) and skill interfaces must remain intact

---

### Task 1: Core Engine Hardening & Library Entrypoint
**Files:**
- Create: `src/index.js`
- Modify: `src/orchestrator.js`
- Modify: `src/doctor.js`
- Modify: `src/reporter.js`
- Test: `tests/orchestrator.test.js`
- Test: `tests/reporter.test.js`

**Interfaces:**
- Produces:
  - `src/index.js`: Exports `{ checkEnvironment, selectBestModel, runDualAudit, defaultAlibabaRunner, defaultCloudflareRunner, detectConvergence, synthesizeReport, parseCliArgs, runCli }`
  - `src/orchestrator.js`: `defaultAlibabaRunner(targetPath, options)` with safe arguments and `fs.mkdtempSync`
  - `src/doctor.js`: Safe discovery of CLI tools without shell interpolation
  - `src/reporter.js`: `normalizePath` with directory traversal protection

- [ ] **Step 1: Write failing tests in `tests/orchestrator.test.js` and `tests/reporter.test.js`**
  - Add test in `tests/orchestrator.test.js` verifying that `defaultAlibabaRunner` uses secure isolated temporary directories and rejects paths containing command injection delimiters or escapes.
  - Add test in `tests/reporter.test.js` verifying that `normalizePath` strips relative traversal tokens (`../`) to prevent path traversal in reports.

- [ ] **Step 2: Run test suite to verify tests fail as expected**
  - Run: `npm test tests/orchestrator.test.js tests/reporter.test.js`

- [ ] **Step 3: Implement secure directory creation and safe argument handling**
  - In `src/orchestrator.js`: Replace predictable `/tmp/doublecheck_ocr_${Date.now()}.json` with `fs.mkdtempSync(path.join(os.tmpdir(), 'doublecheck-'))`. Use `execFileSync` or sanitized argument arrays rather than raw interpolated shell command strings.
  - In `src/doctor.js`: Harden `which ocr` lookup with safe error handling and path resolution.
  - In `src/reporter.js`: Prevent directory traversal escapes in `normalizePath`.
  - In `src/index.js`: Create the canonical public export hub required by `package.json` (`"main": "./src/index.js"`).

- [ ] **Step 4: Run tests to confirm all unit tests pass**
  - Run: `npm test`

- [ ] **Step 5: Git checkpoint commit**
  - Commit: `git commit -am "fix(core): harden process execution, secure tempdir, and export src/index.js"`

---

### Task 2: Claude Code Review Repository Configuration & CI Workflow
**Files:**
- Create: `.github/REVIEW.md`
- Modify: `.github/workflows/ci.yml`
- Create: `tests/ci-review.test.js`

**Interfaces:**
- Produces:
  - `.github/REVIEW.md`: Instructions for Claude Code Review specifying severity criteria (Blocker vs. Major vs. Minor), path exclusion patterns, and core security invariants.
  - `.github/workflows/ci.yml`: Added step verifying `REVIEW.md` integrity and running `doublecheck --doctor-only` verification.

- [ ] **Step 1: Write failing test in `tests/ci-review.test.js`**
  - Test verifying `.github/REVIEW.md` exists and contains the required sections: `## Focus Areas`, `## Severity Levels`, `## Invariants`, and `## Ignored Paths`.

- [ ] **Step 2: Run test to confirm failure**
  - Run: `npm test tests/ci-review.test.js`

- [ ] **Step 3: Author `.github/REVIEW.md`**
  - Define custom review heuristics tailored for `doublecheck`:
    - **Blocker (P0):** Arbitrary command execution, unescaped child process arguments, predictable file creation in shared `/tmp`, and unhandled process crashes.
    - **Major (P1):** Unhandled asynchronous rejections in audit runners, missing timeouts on external network calls (`fetch` without `AbortSignal`), or tests making live network calls without mocking.
    - **Minor (P2):** Style discrepancies, non-idiomatic ESM imports, missing docstrings.
    - **Ignored Paths:** `dist/`, `node_modules/`, `coverage/`, and pre-computed test fixtures.

- [ ] **Step 4: Update `.github/workflows/ci.yml`**
  - Add a job step checking `.github/REVIEW.md` integrity and running `node ./bin/doublecheck.js --doctor-only`.

- [ ] **Step 5: Run tests and verify CI configuration passes**
  - Run: `npm test tests/ci-review.test.js`
  - Run: `./bin/doublecheck.js --doctor-only`

- [ ] **Step 6: Git checkpoint commit**
  - Commit: `git commit -am "ci: add .github/REVIEW.md for Claude Code Review and update CI workflow"`

---

### Task 3: CLI `--init-review` Command & `scripts/convert.sh review-md` Target
**Files:**
- Modify: `src/cli.js`
- Modify: `scripts/convert.sh`
- Test: `tests/cli.test.js`
- Create: `tests/convert.test.js`

**Interfaces:**
- Produces:
  - `src/cli.js`: Parses `--init-review` or `--init-review-md` and writes a scaffolding `REVIEW.md` encoding Cloudflare and Alibaba rulesets.
  - `scripts/convert.sh`: Supports `bash scripts/convert.sh review-md` and outputs to `dist/platforms/review-md/REVIEW.md`.

- [ ] **Step 1: Write failing tests in `tests/cli.test.js` and `tests/convert.test.js`**
  - Add test in `tests/cli.test.js` verifying `parseCliArgs(['--init-review'])` sets `initReview: true`.
  - Add test in `tests/convert.test.js` verifying that executing `bash scripts/convert.sh review-md` generates `dist/platforms/review-md/REVIEW.md`.

- [ ] **Step 2: Run tests to confirm failure**
  - Run: `npm test tests/cli.test.js tests/convert.test.js`

- [ ] **Step 3: Implement `--init-review` in `src/cli.js`**
  - Add `initReview` option to `parseCliArgs`.
  - Add implementation in `runCli` that writes a standard `REVIEW.md` into the target directory if requested, providing users with instant Claude Code Review enforcement of `doublecheck` rules.
  - Update `printHelp` in `src/cli.js` to describe `--init-review`.

- [ ] **Step 4: Implement `convert_review_md` in `scripts/convert.sh`**
  - Add `convert_review_md()` function in `scripts/convert.sh` that compiles the Cloudflare attack classes and Alibaba defect rules into a clean `REVIEW.md`.
  - Add `review-md` to supported platform cases and include in `all`.

- [ ] **Step 5: Run tests to verify all pass**
  - Run: `npm test`
  - Run: `bash scripts/convert.sh review-md`

- [ ] **Step 6: Git checkpoint commit**
  - Commit: `git commit -am "feat(cli): add --init-review generator and scripts/convert.sh review-md target"`

---

### Task 4: Agent Skill & Defense-in-Depth Reference Updates
**Files:**
- Create: `skills/doublecheck/references/defense-in-depth.md`
- Modify: `skills/doublecheck/SKILL.md`
- Test: `tests/skill.test.js`

**Interfaces:**
- Produces:
  - `skills/doublecheck/references/defense-in-depth.md`: Full architectural reference explaining the Inner Loop (local Ollama) + Outer Loop (Claude Code Review PRs) model.
  - `skills/doublecheck/SKILL.md`: Updated with operating guidelines for agents when integrating with Claude Code Review and `REVIEW.md`.

- [ ] **Step 1: Write failing test in `tests/skill.test.js`**
  - Test verifying that `skills/doublecheck/references/defense-in-depth.md` exists and is referenced in `skills/doublecheck/SKILL.md`.

- [ ] **Step 2: Run test to confirm failure**
  - Run: `npm test tests/skill.test.js`

- [ ] **Step 3: Create `skills/doublecheck/references/defense-in-depth.md` and update `SKILL.md`**
  - Detail the two-tier security paradigm:
    - Tier 1: Local Ollama multi-perspective convergence before commit.
    - Tier 2: Cloud-native Claude Code Review on GitHub PRs using `REVIEW.md`.
    - Convergence Triangulation: How to reconcile local vs cloud findings.

- [ ] **Step 4: Run tests to verify pass**
  - Run: `npm test tests/skill.test.js`
  - Re-run `bash scripts/convert.sh all` to update distribution packages in `dist/platforms/`.

- [ ] **Step 5: Git checkpoint commit**
  - Commit: `git commit -am "docs(skill): add defense-in-depth reference and update universal agent skill"`

---

### Task 5: Documentation & Policy Alignment Across Repository
**Files:**
- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `SECURITY.md`

**Interfaces:**
- Produces:
  - `README.md`: Updated architecture diagram and guide explaining the two-tier security model and `--init-review` flag.
  - `CONTRIBUTING.md`: PR workflow instructions detailing Claude Code Review behavior and `REVIEW.md` compliance.
  - `SECURITY.md`: Clarified threat boundary, data privacy policy, and local vs cloud guarantees.

- [ ] **Step 1: Update `README.md`**
  - Add section "🛡️ Multi-Layer Security Architecture: Local Inner Loop + Cloud Outer Loop" explaining the synergy with Claude Code Review (`code.claude.com/docs/en/code-review`).
  - Document the `npx doublecheck --init-review` command.

- [ ] **Step 2: Update `CONTRIBUTING.md` and `SECURITY.md`**
  - In `CONTRIBUTING.md`: Add a section explaining automated reviews on PRs, what `REVIEW.md` checks, and how contributors can run pre-commit checks locally with `doublecheck`.
  - In `SECURITY.md`: Explicitly outline the sandboxing and safe-execution guarantees implemented in Task 1.

- [ ] **Step 3: Run comprehensive verification**
  - Run full test suite: `npm test`
  - Verify CLI executable: `./bin/doublecheck.js --help`
  - Verify distribution builds: `bash scripts/convert.sh all`
  - Verify git status: Ensure clean working directory.

- [ ] **Step 4: Git checkpoint commit**
  - Commit: `git commit -am "docs: update README, CONTRIBUTING, and SECURITY for multi-layer review"`
