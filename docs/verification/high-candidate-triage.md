# Self-review candidate triage

Date: October 24, 2026 (America/Vancouver). Starting application baseline: 09d9f2b. Repair commit: 559ae60. Source review scanned 65b3b63 and produced 93 candidates, including eight marked high. Original model claims are preserved in [the full triage inventory](self-review-triage-2026-10-24.json); this document records independently reviewed impact and evidence.

## Eight high candidates

| Candidate | Decision | Demonstrated effect / evidence |
| --- | --- | --- |
| Contract script missing architect engine (`0f91962d…`) | Rejected as blocking; diagnostic polish deferred | A missing engine already causes a nonzero contract-check failure. Replacing its TypeError with an assertion message does not repair false acceptance. |
| Release Drafter categories drop PRs (`34badfa0…`) | Rejected | Upstream v6 retains unmatched/unlabeled PRs and includes them before categories. Category labels are not an inclusion filter. No release-drafter workflow is configured in this checkout; an external GitHub App installation was not inspected. |
| Invalid complete-engine fixtures (`9431302f…`) | Fixed; reviewed low impact (test infrastructure) | Invalid records now fail fixture construction rather than disappearing. Fixture findings determine synthetic covered paths; clean fixture explicitly defaults to src/a.js. `tests/helpers-results.test.js`. |
| Auto-selected model not permitted by provider (`9dfa896f…`) | Fixed; reviewed medium | Preflight now tries installed candidates through the selected provider's policy. Explicit requests do not fall back; cloud consent remains required; only the default latest alias is equivalent. `tests/doctor.test.js`, `tests/inference-policy.test.js`. |
| Missing/nonfinite recovery time bounds (`aa3165c7…`) | Fixed; reviewed medium defensive reliability | Invalid/reversed ownership windows fail closed. Production callers already supply Date.now values, so no live unintended recovery was demonstrated. `tests/ocr-session.test.js`. |
| Missing converter references (`d7e79b12…`) | Fixed; reviewed medium | All skill targets fail before touching output if manuals are missing; existing artifacts remain intact. review-md stays independent. `tests/convert.test.js`, `tests/export-links.test.js`. |
| Failed scan leaves truncated output (`db3f66fe…`) | Fixed; reviewed medium | Malformed/truncated output now enters owned-session recovery when the process failed. Explicit native failed status remains failed even when comments are recovered; coverage stays unknown. `tests/orchestrator.test.js`. |
| Malformed upload kills mock server (`e7acd56a…`) | Fixed; reviewed medium (verification infrastructure) | Before fix, a real malformed request caused child exit 1/SyntaxError. After fix, malformed/null uploads return 400 and the server remains usable after aborted uploads. `tests/mock-contract.test.js` and real isolated loopback smoke. |

The Release Drafter rejection is supported by its [v6 categorization and changelog implementation](https://github.com/release-drafter/release-drafter/blob/v6/lib/releases.js): uncategorized changes are retained and emitted. No release config change was made based on the incorrect loss claim.

## Related improvements and verification

The mock startup wait now handles process error/exit, rejects on a referenced deadline, and clears listeners/timers. A real request notification replaces the fixed 50 ms drain delay. Disconnect closes open HTTP connections. The endpoint stays fixed to match the explicitly provisioned synthetic OCR provider; dynamic ports would require changing that routing contract.

Model auto-selection was checked against the actual local Ollama daemon with `node ./bin/doublecheck.js --doctor-only --allow-remote`: it selected the configured deepseek-v4.1-flash:1017-cloud model without a model flag. This preflight does not request inference or prove model locality.

- Full offline suite: **146 tests across 19 files passed**, Node 26.12.0.
- Behavior regressions were observed failing before each repair. The real mock failure was reproduced before refactoring; handler and IPC tests now cover malformed/null/aborted/oversized bodies, valid/streamed bounded responses, readiness messages, early exit/error, and timeouts.
- Real loopback smoke: malformed and null requests returned 400; valid request returned 200 after aborted upload.
- Packaged consumer smoke without devDependencies, real OCR 1.13.3 preview, Bash syntax, and whitespace checks passed.
- Fresh read-only final review found no important defects in the changed range. No extra corrective pass was required.

## Other candidates

The full 93-entry inventory records **7 confirmed/fixed**, **6 related cases addressed**, **9 rejected as reported**, **2 partially rejected**, **42 deferred suggestions**, and **27 requiring behavioral validation**. The six high-candidate repairs plus one additional converter filename defect received full reproduction/regression verification here. Remaining records are explicitly not certified defects or fixed issues. Security-sensitive raw error exposure, fabricated inference provenance, and reversing the documented runtime/development split were not accepted as fixes.

The remaining27 need focused reproductions before implementation. Coverage tracking and diff-scoped reviews remain separately scoped capabilities, not claims added by this repair pass.

## Native affected-subtree reruns

All three production CLI runs used the authorized `deepseek-v4.1-flash:1017-cloud` model, provider `ollama`, architect mode, a 1200-second deadline, both output formats, and external output paths. Actual reported provider/model matched requested routing in every report.

| Scope | Application commit | Execution | Recorded completed files | Model failures | Final candidates |
| --- | --- | --- | --- | --- | --- |
| `src` | 559ae60 | succeeded; 752461 ms (12m32s) | 14 | 0 | 55 (3 high, 27 medium, 25 low) |
| `scripts` | 559ae60 | succeeded; 401978 ms (6m42s) | 6 | 0 | 25 (1 high, 15 medium, 9 low) |
| `scripts/convert.sh` after final filename repair | de1f1cf | succeeded; 63193 ms (1m3s) | 1 | 0 | 7 (0 high, 2 medium, 5 low) |

The scripts rerun exposed a mismatch already present as an original medium candidate: source validation accepted digit/underscore/uppercase manual names while link rewriting accepted only lowercase letters/hyphens. A new `owasp-top10_ABC.md` regression failed before the final corrective pass. All rewrite patterns now match validation. Consolidated anchors and Cursor references resolve; the full 146-test suite, packaged smoke, Bash syntax and whitespace checks passed afterward. The focused native converter rerun then completed without repeating this high candidate. This is regression evidence, not a model quality benchmark.

Runtime source did not change during its scan. The scripts report precedes the final converter correction; other reviewed scripts remained unchanged, and the final converter report covers that correction. Source checkpoint comments were 61 for runtime and 26 for scripts; native postprocessing emitted 55 and 25 respectively. These different scopes/revisions and repeated converter coverage must not be added together or compared with the earlier 93 as a defect-rate metric.

All final reports correctly return exit 2/status partial. Their only diagnostics are `LENS_NOT_REQUESTED` and `UNKNOWN_NATIVE_COVERAGE`; there are no process/output/identity failures. OCR's saved session completion entries are supplemental evidence, not a native coverage manifest or correctness certificate. All native findings remain candidates, with no confirmed P0/P1 records.

Artifacts:

- `/tmp/doublecheck-triage-rerun-2026-10-24/runtime.md` and `.json`
- `/tmp/doublecheck-triage-rerun-2026-10-24/scripts.md` and `.json`
- `/tmp/doublecheck-triage-rerun-2026-10-24/converter.md` and `.json`
- Corresponding `*-session.json` files preserve session summaries/items.

The runtime rerun produced three further high candidates about write-time input protection, subprocess stderr buffer sizing, and remote HTTP transport policy. The first overlaps the existing needs-validation queue; the other claims also require bounded reproductions and compatibility/policy review. No exploit or live failure for those claims was demonstrated, and they were not silently treated as confirmed or fixed. The seven repaired cases, original rejected claims, and explicit 27-case behavioral-validation queue remain distinct from these new model observations.

No provider configuration changes, publication, pushes, or other-runtime CI executions were performed.
