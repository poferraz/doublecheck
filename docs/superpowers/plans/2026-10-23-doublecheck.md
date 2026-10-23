# `doublecheck` Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish `doublecheck`, a professional open-source toolkit and Agent Skill that orchestrates Cloudflare Security Audit and Alibaba Open Code Review into a unified, zero-cost, multi-perspective code audit with convergence detection.

**Architecture:** A hybrid Node.js CLI runner (`bin/doublecheck.js`) combined with a universal Agent Skill (`skills/doublecheck/SKILL.md`). The CLI verifies local Ollama inference, runs both security and AST defect reviews, identifies converged defects, and outputs formatted Markdown and JSON reports.

**Tech Stack:** Node.js (ESM), Vitest, Ollama HTTP API, `@alibaba-group/open-code-review`, Agent Skills Spec, GitHub Actions.

## Global Constraints
- Node.js runtime: `>= 18.0.0`
- Zero mandatory external API keys (default to local Ollama at `http://localhost:11434/v1`)
- Strict TDD: Write failing tests before writing implementation code
- ESM native modules (`"type": "module"`)
- Permissive Open Source License: Apache License 2.0

---

### Task 1: Project Scaffolding & Manifest
**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `LICENSE`
- Create: `vitest.config.js`
- Test: Run `npm test` baseline

- [ ] **Step 1: Create package.json with dependencies and scripts**
- [ ] **Step 2: Create .gitignore and Apache 2.0 LICENSE**
- [ ] **Step 3: Create vitest.config.js**
- [ ] **Step 4: Install dependencies and verify test runner passes**
- [ ] **Step 5: Commit scaffolding**

---

### Task 2: Pre-flight Doctor Engine
**Files:**
- Create: `src/doctor.js`
- Test: `tests/doctor.test.js`

**Interfaces:**
- Produces: `checkEnvironment(options): Promise<DoctorResult>`
- `DoctorResult`: `{ ok: boolean, ollamaReady: boolean, activeModel: string, ocrAvailable: boolean, errors: string[] }`

- [ ] **Step 1: Write failing test for Ollama detection, model selection, and tool discovery**
- [ ] **Step 2: Run test to confirm failure**
- [ ] **Step 3: Implement `src/doctor.js` with Ollama ping and model auto-discovery**
- [ ] **Step 4: Run test to verify passes**
- [ ] **Step 5: Commit doctor module**

---

### Task 3: Dual-Perspective Orchestrator & Rule Catalog
**Files:**
- Create: `src/orchestrator.js`
- Create: `skills/doublecheck/references/attack-classes.md`
- Create: `skills/doublecheck/references/rulesets.md`
- Test: `tests/orchestrator.test.js`

**Interfaces:**
- Produces: `runDualAudit(targetPath, config): Promise<AuditRawResults>`
- `AuditRawResults`: `{ cloudflareFindings: Finding[], alibabaComments: Comment[], metadata: object }`

- [ ] **Step 1: Stage curated Cloudflare attack classes in `skills/doublecheck/references/attack-classes.md`**
- [ ] **Step 2: Write failing test in `tests/orchestrator.test.js` for dual pass coordination and error handling**
- [ ] **Step 3: Implement `src/orchestrator.js` with batching and local model throttling**
- [ ] **Step 4: Run test to verify passes**
- [ ] **Step 5: Commit orchestrator and rule catalogs**

---

### Task 4: Convergence Synthesizer & Reporter
**Files:**
- Create: `src/reporter.js`
- Create: `src/templates.js`
- Test: `tests/reporter.test.js`

**Interfaces:**
- Consumes: `AuditRawResults` from `orchestrator.js`
- Produces: `synthesizeReport(results): ReportOutput`
- `ReportOutput`: `{ markdown: string, json: object, convergedCount: number, p0Count: number, p1Count: number, p2Count: number }`

- [ ] **Step 1: Write failing test for line-range overlap matching and convergence detection**
- [ ] **Step 2: Run test to confirm failure**
- [ ] **Step 3: Implement convergence math and markdown scorecard in `src/reporter.js`**
- [ ] **Step 4: Run test to verify passes**
- [ ] **Step 5: Commit reporter module**

---

### Task 5: CLI Executable Entrypoint
**Files:**
- Create: `bin/doublecheck.js`
- Create: `src/cli.js`
- Test: `tests/cli.test.js`

- [ ] **Step 1: Write failing test for CLI flag parsing (`--path`, `--model`, `--format`, `--output`, `--json`)**
- [ ] **Step 2: Implement CLI argument parser and binary wrapper with terminal feedback**
- [ ] **Step 3: Run test to verify passes**
- [ ] **Step 4: Make `bin/doublecheck.js` executable (`chmod +x`)**
- [ ] **Step 5: Commit CLI entrypoint**

---

### Task 6: Universal Agent Skill & Multi-Platform Exporter
**Files:**
- Create: `skills/doublecheck/SKILL.md`
- Create: `skills/doublecheck/references/convergence.md`
- Create: `scripts/convert.sh`
- Test: `tests/skill.test.js`

- [ ] **Step 1: Author `SKILL.md` conforming to the open Agent Skills specification**
- [ ] **Step 2: Write `scripts/convert.sh` for Antigravity, Claude Code, Cursor, Windsurf, and Codex**
- [ ] **Step 3: Test `convert.sh` across all platform targets**
- [ ] **Step 4: Commit agent skill and converters**

---

### Task 7: Viral Documentation & GitHub Actions CI
**Files:**
- Create: `README.md`
- Create: `CONTRIBUTING.md`
- Create: `SECURITY.md`
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Draft viral README with Mermaid diagram, quickstart pill, scorecard badges, and real-world case studies**
- [ ] **Step 2: Create open-source community standards (CONTRIBUTING, SECURITY)**
- [ ] **Step 3: Configure GitHub Actions CI workflow (Node 18, 20, 22 test matrix)**
- [ ] **Step 4: Commit documentation and CI**

---

### Task 8: GitHub Repository Creation & Public Push
**Files:**
- Remote: `poferraz/doublecheck` on GitHub

- [ ] **Step 1: Create public GitHub repository via `gh repo create poferraz/doublecheck --public --source=. --remote=origin`**
- [ ] **Step 2: Push `main` branch to origin**
- [ ] **Step 3: Verify GitHub Actions run and live repository visibility**
