# High-candidate triage and repairs

The user authorized triage of the self-review candidates, fixes for confirmed defects, and affected-path reruns. Execute inline on codex/review-reliability. Original review: /tmp/doublecheck-self-review-rerun-2026-10-24/report.json (93 candidates, 8 high). Preserve source findings unchanged; record independently reviewed dispositions separately.

## Decisions

- Six high candidates have concrete reproduction paths: invalid complete-engine test fixtures; auto-selection choosing an unconfigured model; invalid recovery time bounds; missing converter manuals yielding success; failed scans with corrupt output skipping recovery; malformed/aborted mock requests escaping their async handler. Reproduce each before implementing. Treat impact as correctness/verification reliability, not automatically high-severity security.
- Missing-engine dereference in a contract assertion still fails the check. Reject the high severity; diagnostic polish is lower priority.
- Verify Release Drafter's actual uncategorized behavior against upstream v6 source; category selection is not an inclusion filter. No release configuration change without evidence of lost PRs.
- Keep zero runtime dependencies, cloud opt-in, candidate verdicts, unknown coverage, and exact session ownership checks.
- Closely related native mock startup/IPC failures are covered while repairing the mock boundary; retain fixed endpoint 18765 because the disposable provider configuration explicitly matches it.
- Remaining candidates get explicit deferred/needs-validation dispositions; do not present them as fixed or confirmed defects.

## Tasks

- [x] Add RED regressions for provider-compatible auto-selection, explicit model refusal, latest alias, safe cloud handling; implement configured-candidate selection.
- [x] Add RED regressions for invalid time bounds and truncated/malformed output recovery. Keep absent/conflicting/stale session fail-closed behavior and coverage partial.
- [x] Add RED regressions for malformed test fixtures and missing converter manuals, including preservation of existing exports and independent review-md generation; implement guards.
- [x] Add RED regressions for malformed JSON, null bodies, aborted streams, child startup exit/error/timeout, and IPC request observation; implement bounded mock handler and readiness helpers. Run a real isolated loopback smoke separately from offline tests.
- [x] Full tests, package smoke, fresh final review; one corrective pass if needed. Record evidence and triage for all 8 highs plus explicit dispositions for the other 85.
- [x] Run production native reviews on the changed runtime files and converter (separate reports); inspect process outcome and diagnostics. Cloud consent persists for configured DeepSeek. Keep exit2/partial when native coverage is unknown.

## Review focus

No fallback for an explicit unusable model; no automatic remote consent; no recovery of unrelated sessions; malformed output cannot erase recoverable comments; invalid fixtures and incomplete exports cannot claim success; malformed network input cannot kill the mock or strand a startup wait.

## Completion evidence

Seven regression-backed fixes: six original high candidates plus the filename-rewrite case exposed by the native scripts rerun. Two original high candidates rejected as blocking. Full suite146/146, packaged smoke, real loopback mock smoke, live auto-select doctor, native preview, Bash syntax, whitespace checks passed. Fresh review found no important defects; one additional native finding was fixed in one RED→GREEN corrective pass. Runtime/scripts/final-converter native runs all succeeded with zero model failures; partial/exit2 remains correct for unknown coverage and unresolved candidates. Detailed scope, remaining27 behavioral candidates, deferred items, and new unverified runtime observations are recorded in docs/verification/high-candidate-triage.md and its JSON inventory.
