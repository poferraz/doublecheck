---
name: doublecheck
description: Use when auditing codebases for security vulnerabilities, involuntary data exposures, prompt injection, and code defects before deployment. Combines Cloudflare's attack-class penetration lens with Alibaba Open Code Review's principal architect lens.
---

# `doublecheck`: Multi-Perspective Code Security & Architecture Review

`doublecheck` is an agentic dual-perspective audit protocol that synthesizes two complementary paradigms:
1. **The Attacker (Cloudflare Security Audit):** Threat modeling, trust-boundary exploitation, prompt injection, SSRF, DOM XSS, and credential leaks.
2. **The Architect (Alibaba Open Code Review):** AST correctness, null safety, unhandled promise rejections, type coercion traps, and production invariants.

---

## 1. Operating Instructions for Coding Agents

When invoked by a user or automated agent pipeline, execute the following 4-step workflow:

### Step 1: Reconnaissance & Environment Doctor
1. Check local inference readiness:
   - Check if Ollama is running at `http://localhost:11434/v1` with a model like `deepseek-v4.1-flash`, `qwen2.5-coder`, or `mistral`.
   - If `@alibaba-group/open-code-review` (`ocr`) is available, invoke it for automated AST scanning.
2. Identify target files and runtime boundaries:
   - Client-side code (DOM manipulation, storage, cookies).
   - Network edge & serverless endpoints (proxies, CORS, routing).
   - AI agent integrations (prompts, tool execution, firewall gates).

### Step 2: Adversarial Threat Modeling (Cloudflare Lens)
Inspect the codebase against the attack classes defined in [references/attack-classes.md](references/attack-classes.md):
- **`AI-AND-LLM`:** Look for raw user input concatenated into prompts, unvalidated tool call casts, and incomplete homoglyph normalization.
- **`CLIENT-SIDE`:** Search for `innerHTML`, `outerHTML`, `eval()`, and cleartext credentials in `document.cookie` or `localStorage`.
- **`CLOUD-AND-DEPLOYMENT`:** Inspect serverless endpoints and reverse proxies for unrestricted `fetch(targetUrl)` (SSRF).
- **`PROTOCOLS-RPC-AND-MESSAGING`:** Verify cryptographic digests bind all decision parameters into the hash preimage.

### Step 3: Principal Architect Defect Review (Alibaba Lens)
Evaluate code against the rulesets in [references/rulesets.md](references/rulesets.md):
- **Null Safety:** Verify all nested property accesses have null guards or optional chaining. Check that partial configuration objects merge with defaults (`{ ...DEFAULTS, ...config }`).
- **Async Robustness:** Ensure all promises and debounce callbacks have `.catch()` handlers. Check for `signal.aborted` checks on abortable fetches.
- **Type Coercion:** Verify regexes strictly enforce kebab-case or numeric boundaries without truncation on comma separators.

### Step 4: Convergence Synthesis & Remediation
Compare the findings from both lenses against the rubric in [references/convergence.md](references/convergence.md):
1. **Identify Converged Defects (P0):** When both lenses independently flag the same file and line, mark as Priority 0 Immediate Blocker.
2. **Generate Drop-in Fixes:** Provide concrete, diff-ready code snippets with tests.
3. **Output Report:** Render the unified markdown scorecard and matrix.

---

## 2. CLI Quick Reference
For standalone terminal execution outside an agent session:
```bash
# Full local dual audit using Ollama
npx @poferraz/doublecheck .

# Specific model
npx @poferraz/doublecheck . --model deepseek-v4.1-flash:1017-cloud

# JSON output
npx @poferraz/doublecheck . --format json -o doublecheck-report.json
```
