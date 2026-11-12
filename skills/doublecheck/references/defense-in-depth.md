# Local and Hosted Review Integration

Use local review for early evidence and hosted pull-request review for additional context. Record each tool/model, selected/reviewed files, failure state, and verification evidence independently. Repeated findings are not independent merely because they have different labels.

Doublecheck's CLI imports adversary JSON and invokes OCR for architect scanning. It does not implement the full upstream Cloudflare audit workflow. OCR 1.13.3 scans currently lack coverage manifests, so native full-file scans remain partial. A host agent may perform a broader review, but must account for that coverage explicitly.

Named provider validation controls requested routing; a loopback endpoint can forward requests. Report locality as unverified, obtain explicit remote opt-in when applicable, and avoid absolute privacy or zero-cost claims.

[Claude Code Review](https://code.claude.com/docs/en/code-review) needs separate organization/GitHub App configuration. Its service reads root REVIEW.md and applicable scoped instructions; the local /code-review command has a separate loading contract. Generating a file does not activate a service or enforce a merge policy.

Initialize root instructions with the CLI's --init-review command. Preserve custom policy unless replacement is explicit; leave legacy .github/REVIEW.md files untouched and reconcile them deliberately. For conflicts between reviewers, inspect evidence and scope rather than automatically escalating overlap. Retain human judgment over merges and remediation.
