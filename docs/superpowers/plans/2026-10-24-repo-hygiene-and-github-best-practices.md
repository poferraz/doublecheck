# Repository Audit & GitHub Best Practices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform `doublecheck` into a showcase-grade open-source repository by elevating Claude Code Review across the README, introducing industry-standard `CHANGELOG.md` and release workflows, adding missing developer reference tables, and polishing user onboarding details.

**Architecture:**
1. **README.md Overhaul:** Front-load Claude Code Review and the dual-tier model into the Hero, Subtitle, Architecture Diagram, Feature Matrix, and add a Clickable Table of Contents, CLI Flag Reference, Model Compatibility Table, and a "Why doublecheck?" comparison table.
2. **Release Management & Changelog:** Create `CHANGELOG.md` following the Keep a Changelog standard, document v0.1.0 (Initial Release) and v0.1.1 (Claude Code Review & Hardening), bump `package.json` to v0.1.1, and add `.github/release-drafter.yml`.
3. **CI / CD Examples for Users:** Provide ready-to-copy GitHub Actions workflow snippets for users wishing to integrate `doublecheck` and Claude Code Review into their own CI pipelines.
4. **Governance & Documentation Details:** Update `CONTRIBUTING.md` with release instructions and add comprehensive badges to `README.md`.

**Tech Stack:** GitHub Flavored Markdown, Mermaid diagrams, Keep a Changelog standard, Semantic Versioning, GitHub Actions.

---

## Detailed Audit of Gaps

| Dimension | Current State | Missing Detail / Gap | Required Enhancement |
| :--- | :--- | :--- | :--- |
| **Claude Code Review Positioning** | Secondary section (#4) and single quickstart bullet. | Hero, Subtitle, and Core Problem omit the continuous PR review outer-loop. Users only see "Cloudflare + Alibaba". | Update hero subtitle, add Claude Code Review to the Core Problem / Architecture diagrams, and add an Outer Loop quickstart block. |
| **Changelog** | Non-existent. | Users cannot see what changed between versions or track release history. | Create `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) (v0.1.0 & v0.1.1). |
| **Releases & Versioning** | `package.json` is at `0.1.0`; no release templates. | No GitHub Release template or documentation on how releases are cut. | Bump to `0.1.1`, add `.github/release-drafter.yml`, and document release process in `CONTRIBUTING.md`. |
| **Navigation (TOC)** | Missing. | Long document requires manual scrolling to find CLI options or pilot audit findings. | Add clean, clickable Table of Contents directly after Hero. |
| **Options Reference** | Only 3 example commands in prose. | No structured reference table for CLI arguments (`--init-review`, `--findings`, `--format`, `--ollama`, etc.). | Add comprehensive CLI Arguments & Flags markdown table. |
| **Value Comparison** | "Single-lens blindness" described in prose. | Potential users asking "Why not just use SonarQube, Snyk, or native Copilot/Claude?" lack a clear comparison. | Add "Why doublecheck?" comparison matrix across 5 dimensions. |
| **Model Compatibility** | Only 3 models mentioned in passing. | Users don't know hardware requirements (RAM/VRAM), context limits, or recommended Ollama model tags. | Add Supported Ollama Models & Hardware Requirements table. |
| **CI Integration Example** | Only self-CI documented. | Users wanting to run `doublecheck` in their own repos don't have a copy-pasteable GitHub Actions workflow. | Add `.github/workflows/sample-audit.yml` and README integration snippet. |

---

### Task 1: Create `CHANGELOG.md` and Release Management
**Files:**
- Create: `CHANGELOG.md`
- Create: `.github/release-drafter.yml`
- Modify: `package.json`
- Modify: `CONTRIBUTING.md`
- Test: `tests/hygiene.test.js`

**Interfaces:**
- Produces:
  - `CHANGELOG.md`: Standard Keep a Changelog format documenting `[0.1.1]` and `[0.1.0]`.
  - `.github/release-drafter.yml`: Auto-categorized GitHub release template.
  - `package.json`: Version bumped to `0.1.1`.

- [x] **Step 1: Write failing test in `tests/hygiene.test.js`**
  - Verify `CHANGELOG.md` exists and contains `## [0.1.1]` and `## [0.1.0]`.
  - Verify `.github/release-drafter.yml` exists.
  - Verify `package.json` version matches latest changelog entry (`0.1.1`).

- [x] **Step 2: Run test to confirm failure**
  - Run: `npm test tests/hygiene.test.js`

- [x] **Step 3: Author `CHANGELOG.md` and `.github/release-drafter.yml`**
  - Detail `0.1.1`: Claude Code Review integration, `--init-review` generator, child process hardening (`execFileSync`), isolated tempdir (`fs.mkdtempSync`), canonical `src/index.js` export.
  - Detail `0.1.0`: Initial release of dual-lens audit engine (Cloudflare Adversary + Alibaba Architect) and Ollama local inference.
  - Create `.github/release-drafter.yml` with categories: Features, Security & Hardening, Bug Fixes, Documentation.
  - Bump `package.json` version to `0.1.1`.
  - Update `CONTRIBUTING.md` with a "Releasing New Versions" guide.

- [x] **Step 4: Run test to verify passes**
  - Run: `npm test tests/hygiene.test.js`

- [x] **Step 5: Git checkpoint commit**
  - Commit: `git commit -am "chore(release): add CHANGELOG.md, release drafter, and bump version to 0.1.1"`

---

### Task 2: README.md Overhaul — Front-Loading Claude Code Review & Hero Experience
**Files:**
- Modify: `README.md`
- Test: `tests/hygiene.test.js`

**Interfaces:**
- Produces:
  - Updated Hero Subtitle & Description explicitly highlighting the Dual-Tier model (Local Inner Loop + Claude Code Review Outer Loop).
  - Extended Mermaid Architecture diagram visualizing both the Local Ollama pipeline and the GitHub PR Claude Code Review gate.
  - Updated badges (Release v0.1.1, Node >=20, PRs Welcome, Claude Code Ready).
  - Clickable Table of Contents.

- [x] **Step 1: Write failing test in `tests/hygiene.test.js`**
  - Test verifying `README.md` includes:
    - Clickable Table of Contents (`## 📑 Table of Contents`).
    - Explicit mention of Claude Code Review in the Hero & System Architecture section.
    - CLI Flag reference table (`| Flag | Description | Default |`).
    - Comparison matrix (`| Capability | doublecheck | Linters | Snyk / SAST | Claude Code Review |`).

- [x] **Step 2: Run test to confirm failure**
  - Run: `npm test tests/hygiene.test.js`

- [x] **Step 3: Update `README.md`**
  - Re-structure Hero and Subtitle.
  - Add Table of Contents.
  - Expand System Architecture Mermaid diagram to show Tier 1 (Local Ollama Engine) and Tier 2 (Claude Code Review PR Gate).
  - Add "Why doublecheck?" comparison table.
  - Add Full CLI Reference options table.
  - Add Supported Local Models & Hardware Requirements table.
  - Add CI/CD GitHub Actions copy-pasteable example.

- [x] **Step 4: Run test to verify passes**
  - Run: `npm test tests/hygiene.test.js`

- [x] **Step 5: Git checkpoint commit**
  - Commit: `git commit -am "docs(readme): overhaul README with Claude Code Review prominence, TOC, and reference tables"`

---

### Task 3: CI/CD Pipeline & Distribution Verification
**Files:**
- Modify: `scripts/convert.sh` (if any doc updates)
- Test: Full Vitest suite

- [x] **Step 1: Run complete verification**
  - Run `npm test` across all test files.
  - Verify CLI executable: `./bin/doublecheck.js --help`
  - Verify pre-flight doctor: `./bin/doublecheck.js --doctor-only`
  - Verify `npm pack --dry-run` to ensure clean distribution package.

- [x] **Step 2: Git push to origin/main**
  - Push all committed hygiene and documentation updates to GitHub.
