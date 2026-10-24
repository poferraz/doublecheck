---
name: New Attack Class / Rule Request
about: Propose a new security attack class or AST invariant rule
title: '[RULE] '
labels: 'enhancement, rule'
assignees: ''
---

**Which Lens Does This Belong To?**
- [ ] Adversary Lens (Cloudflare Threat Modeling: exploit paths, prompt injection, bypasses)
- [ ] Architect Lens (Alibaba AST Invariant: syntax traps, async rejections, memory safety)

**Vulnerability / Defect Name**
E.g., "WebGPU Buffer Underflow" or "Async Generator Memory Leak"

**Threat Description**
Explain what code pattern causes the issue and how an attacker could exploit it or how it breaks production invariants.

**Minimal Vulnerable Code Example**
```javascript
// Example vulnerable code snippet
```

**Proposed Convergence Match Pattern**
What would both lenses look for to declare high-confidence convergence?

**References**
Links to CVEs, research papers, or documentation.
