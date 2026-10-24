# Dual-Audit Convergence & Triage Rubric

When evaluating an audit, findings are assigned to three priority tiers based on the principle of cross-perspective validation:

---

## Priority 0 (Immediate Remediation / Blocker)
A finding is classified as **Priority 0** if:
1. **Convergence:** Both the Cloudflare Adversary Lens and the Alibaba Architect Lens independently identify the same file and line/scope as defective or vulnerable.
2. **Exploitable High-Impact:** Verified exploit path with an active affected principal (e.g., SSRF open proxy, cleartext credential storage, DOM-based XSS, or prompt injection firewall bypass).
3. **Runtime Crash on Boundary Data:** Unhandled exceptions that break core execution flow (e.g., missing default threshold merging causing `TypeError` on feature indexing).

**SLA:** Must be addressed before production deployment or release tag.

---

## Priority 1 (High Quality & Security Hygiene)
A finding is classified as **Priority 1** if:
1. **Single-Lens High Severity:** Identified by one lens with High severity (e.g., API key in URL query parameter, integer truncation regex, unhandled async rejection in debounced handlers, homoglyph injection evasion).
2. **Subtle Concurrency & State Traps:** Missing abort signal handling, unhandled stream termination, or state mutations outside transactional boundaries.

**SLA:** Scheduled for remediation in immediate sprint.

---

## Priority 2 (Defensive Hardening)
A finding is classified as **Priority 2** if:
1. **Over-Permissive Configurations:** Wildcard permissions in tool settings (e.g. `chmod *`).
2. **Code Maintainability & Defensive Invariants:** Mutable exported arrays that should be frozen, dead branches in tokenizer regexes, non-portable OS calls.

**SLA:** Addressed during routine maintenance or refactoring passes.
