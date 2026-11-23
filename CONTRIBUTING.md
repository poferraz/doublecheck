# Contributing to Doublecheck

## Local checks

Use Node 22.12 or later within 22.x, 24.x, or 26.x for development. CI separately checks that consumers can install the packaged CLI and library on Node 20 without development dependencies.

```sh
npm ci
npm test -- --no-cache
npm run test:integration
npm run smoke:consumer
```

Add a regression test when changing report or exit-code behavior. Offline tests use synthetic inputs, isolated temporary directories and injected runners. They should preserve existing provider settings and avoid sending source, credentials or model requests over the network. The separate native contract workflow provisions OCR 1.13.3 and a loopback mock provider on its disposable runner. This checks the integration without measuring model accuracy.

Keep findings, verification state and file coverage separate across both CLI and library paths. Preserve zero runtime npm dependencies. Record changes to report formats, library contracts or exit codes in the [changelog](CHANGELOG.md).

## Host exports

The [source skill](skills/doublecheck/SKILL.md) and its reference files ship with Doublecheck. To generate host-specific formats from a checkout, run the converter with a fresh output directory.

```sh
bash scripts/convert.sh all --output-dir /tmp/doublecheck-platforms
```

Targets are `claude`, `antigravity`, `cursor`, `windsurf`, `codex` and `review-md`. The converter preserves existing platform exports. Follow your host's installation instructions and check that it discovers the skill. For Antigravity 2, the project skill belongs in `.agents/skills/doublecheck/`. Inspect generated host instructions before placing them in a project that has its own rules.

This repository's [review instructions](REVIEW.md) are separate from the [template](src/templates/REVIEW.md) used by both generators. Hosted review services require their own setup and account permissions.

## Release evidence

Keep user-facing contracts and reproducible checks in the repository. Leave draft prompts, implementation plans and local run transcripts out of the public tree. The [0.2.0 release record](https://github.com/poferraz/doublecheck/blob/main/docs/verification/2026-11-09-release-readiness.md) identifies the frozen artifact and the checks performed on it. Later changes on GitHub reach package consumers through a new npm release.
