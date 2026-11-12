# Contributing

Use Node 22.12+ within 22.x, 24.x, or 26.x for development with Vitest 5. The packaged application retains Node >=20 support, checked separately by consumer smoke CI.

```bash
npm ci
npm test -- --no-cache
npm run test:integration
npm run smoke:consumer
```

Write a failing behavior regression before changing runtime behavior, then run the focused check and full suite. Do not replace runtime checks with assertions that documentation contains particular words. Keep test outputs in unique temporary directories and restore mocked globals. Tests must not require a paid/live model, modify user provider configuration, or leak credentials/source in diagnostics.

Keep zero runtime npm dependencies and only Vitest as a direct devDependency. Use parameterized child-process calls, bounded operations, and cleanup in finally blocks. Preserve finding identities, verification states, and unknown coverage. Review instructions are in root REVIEW.md; a file alone does not enable a hosted review service.

The ordinary CI workflow tests supported development runtimes and packages the CLI for Node 20.0.0/20.x smoke without devDependencies. The separate native OCR workflow runs on pull requests or manual dispatch, installs exact OCR 1.13.3 in a disposable runner and uses a loopback mock model server. Native output, host discovery, and live model quality are separate evidence categories; do not claim an unexecuted check passed.

The generic REVIEW.md template is src/templates/REVIEW.md. Both generators must consume it. Generate exports with `bash scripts/convert.sh all --output-dir /tmp/doublecheck-platforms` and verify links before distributing them. Avoid replacing existing host/project instructions.

Document API/result-shape changes and exit codes under Unreleased in CHANGELOG.md. Preserve historical plans with superseded notices rather than rewriting their old approvals. Publishing a new package, pushing a branch, and releasing a tag require a separate request; this remediation does not publish automatically.
