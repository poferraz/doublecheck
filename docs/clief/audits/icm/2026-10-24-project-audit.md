---
schema: clief-audit/1
kind: icm
auditId: 2026-10-24-project-audit
status: draft
projectIdentity: "@poferraz/doublecheck 0.1.1"
baseline:
  revision: b5e6224b0e9762ff5579ce113720f27d5565c09a
  dirtyDigest: e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855
  trackedContentDigest: b2549b1e5b3b0ffdee8288d8be3324fd4429221dec8868d7ddd0eaf4ba40103d
scope:
  inspected:
    - README.md
    - CONTRIBUTING.md
    - SECURITY.md
    - CHANGELOG.md
    - package.json
    - package-lock.json
    - .github
    - bin
    - src
    - scripts
    - skills
    - tests
    - docs
  excluded:
    - .git object database
    - node_modules implementation internals
    - developer home configuration and credentials
    - GitHub organization and application settings
  runtimes:
    - Codex for this audit
    - static review of Claude, Antigravity, Cursor, Windsurf, Codex, and REVIEW.md exports
methodologyVersion: "clief-audit/1; core lenses 1.0.0"
limitations:
  - Historical human approval cannot be authenticated from an Approved label.
  - Exported artifacts were generated in a temporary snapshot; actual agent-host discovery was not exercised.
  - Application correctness and security findings are reported separately in the accompanying chat and are excluded from this ICM report.
findings:
  - id: ICM-01
    lens: adapter drift and routing accuracy
    authority: core
    state: FINDING
    phase: 2
    risk: medium
  - id: ICM-02
    lens: one fact one location and context freshness
    authority: core
    state: FINDING
    phase: 1
    risk: medium
approval: null
---

# ICM Audit Report

## Coverage

PARTIAL — repository context and conversion outputs were inspected. Historical human approval and discovery by each actual agent host remain unverified. This report is a draft and confers no implementation approval.

The initial checkout was clean. The baseline includes 41 tracked files. `trackedContentDigest` is SHA-256 over sorted tracked paths, a NUL separator, each file's bytes, and another NUL separator. `dirtyDigest` is SHA-256 of the initial `git status --porcelain=v1` output, which was empty. This report itself is an audit output, outside that baseline.

The practical context level is a small single-package repository with a reusable skill and four selectively linked manuals. More workspace layers would add little value at this size. The absence of a root AGENTS.md or per-folder CONTEXT.md is not treated as a defect.

## Lens Results

| Lens | State | Evidence and assessment |
| --- | --- | --- |
| Minimum-first design and Layer Ladder | PASS | `package.json:9` packages a small CLI, modules, skills, and scripts; no unnecessary service architecture. |
| Map, rooms, tools | PASS | `README.md:47` routes product usage; `skills/doublecheck/SKILL.md:27` routes to task-specific manuals. A separate room layer is unnecessary for one package. |
| Workspace boundaries | PASS | Source, executable, tests, skill, scripts, and historical plans have distinct directories. |
| Routing accuracy | FINDING | ICM-01: exported Cursor references do not resolve. |
| Selective loading | PASS | The native skill links four manuals; Codex/Windsurf consolidation is an explicit adapter choice, rather than a requirement for native skill users. |
| Prompt/file division | PASS | CLI arguments express task direction, while reusable methodology lives in skill files. |
| Context quality and freshness | FINDING | ICM-02: historical runtime requirements and current policy disagree; review policy is duplicated. |
| One fact, one location | FINDING | ICM-02: review-template text exists independently in JavaScript and shell. |
| Planning and approval gates | UNKNOWN | `docs/superpowers/specs/2026-10-23-doublecheck-design.md:7` labels the design Approved; that is a repository assertion, not authenticated human approval evidence. |
| Deterministic, semantic, human, and do-not-build ownership | PASS | Convergence/report formatting is code; review methodology is agent guidance; `skills/doublecheck/references/defense-in-depth.md:24` retains human merge judgment. A numeric 60/30/10 ratio is not a code quota. |
| Stage contracts | PASS | `docs/superpowers/specs/2026-10-23-doublecheck-design.md:93` describes expected report sections; `src/index.js:1` exposes stage entrypoints. Implementation compliance belongs to the separate code review. |
| Consequence gates | PASS | Contributor PR and release instructions retain maintainer actions; no automatic publishing path is present in the inspected workflow. |
| Progress and re-entry | PASS | Dated plans, the changelog, and Git history provide re-entry anchors. Initial unchecked plans are historical artifacts rather than current progress authority. |
| Evidence and corrections | PASS | Tests and hardening history are present; a full code review separately examines the strength of those checks. |
| Provenance | UNKNOWN | Upstream links identify source projects, but the exact upstream revisions used for adapted methodology are not recorded. This is an improvement opportunity, not a compulsory new framework artifact. |
| Handoff | PASS | The public module entrypoint, CLI reference, contribution guide, and skill export describe handoff surfaces. |
| Adapter drift | FINDING | ICM-01. Other agent discovery behavior remains unverified on actual hosts. |

Evidence coverage: 17/17 lenses assessed; 11 PASS, 4 FINDING rows representing two unique findings, and 2 UNKNOWN. No framework conformance percentage is inferred from these counts.

## Findings

### ICM-01 — Exported skill routing does not preserve reference locations

- authority: core (`map → rooms → tools` and routing accuracy)
- state: FINDING
- expected: references in a distributed skill resolve to files or local sections in that distribution.
- observed: the skill body links `references/attack-classes.md`, `references/rulesets.md`, and related manuals. The Cursor converter flattens and renames those manuals without rewriting the links. Codex and Windsurf embed the manuals but retain links to missing files; embedded text reduces the impact for those two adapters.
- evidence: `skills/doublecheck/SKILL.md:28`, `:35`, `:41`, `:48`; `scripts/convert.sh:82` through `:85`, `:94`, and `:102`. Running `bash scripts/convert.sh all` in a temporary repository snapshot confirmed the Cursor output contains `doublecheck-attack-classes.md` and no `references/attack-classes.md`.
- cause: transformations preserve Markdown body text while changing the output directory layout.
- impact: agents following a reference link cannot load the promised manual. Cursor's main file does not include the full reference text.
- targetState: preserve the linked directory structure, or rewrite links to the actual exported filenames or embedded headings.
- acceptance: generate each supported export into a temporary directory; resolve every relative Markdown reference; check actual host discovery separately before claiming host compatibility.
- dependencies: none.
- risk: medium; distributed routing changes can affect existing installation instructions.
- phase: 2.

### ICM-02 — Repeated review policy and stale context lack one current authority

- authority: core (`one fact, one location` and context freshness)
- state: FINDING
- expected: a contributor can identify the current runtime and review policy without reconciling independent copies.
- observed: the generic review template is duplicated in the CLI generator and shell converter. The original design and plan specify Node 18 while the package and newer plan specify Node 20. Historical documents are dated, but do not clearly state that their runtime guidance is superseded.
- evidence: `src/cli.js:75`, `scripts/convert.sh:110`; `docs/superpowers/specs/2026-10-23-doublecheck-design.md:32`; `docs/superpowers/plans/2026-10-23-doublecheck.md:12`; `package.json:46`; `docs/superpowers/plans/2026-10-24-claude-code-review-integration.md:16`.
- cause: likely successive feature additions without consolidating the template or marking superseded operational guidance; intent is not documented.
- impact: future changes can update one generator while leaving another stale, and agents re-entering through an old plan can apply obsolete runtime assumptions.
- targetState: one shared review template, with both generators consuming it; a short current-state routing note; explicit historical/superseded labels on old operational guidance. Keep the repo small rather than adding rooms for every folder.
- acceptance: generator outputs match a single canonical template; current operational documentation points to one runtime policy; archived plans remain accessible but cannot be mistaken for the current build instructions.
- dependencies: none.
- risk: low for documentation; medium for packaging a shared template correctly.
- phase: 1.

## Proposed Phases

1. Consolidate current context and review-template authority (ICM-02). Actual code fixes require a separate development plan, outside clief-apply's structural remit.
2. Repair exported reference routing and verify distribution behavior (ICM-01). Converter implementation changes likewise belong to normal development, with this report as supporting evidence.

## Approval

No approval has been requested, inferred, or granted. An approval record requires the exact report digest, a current target baseline, explicitly approved finding IDs and phases, the human approver, and an approval timestamp. This report alone does not authorize application-code or security remediation.
