# Self-review failure repair and live rerun

Date: October 24, 2026 (America/Vancouver). Branch: `codex/review-reliability`.

## What failed

The original self-review at b49e351 was killed by Doublecheck's five-minute overall process deadline while OCR was still working. OCR 1.13.3 allows 15 minutes per concurrent task. The saved session had 17 completed files and 72 comments, but OCR had not written its final output. Doublecheck returned exit 2 with `OCR_PROCESS_FAILED` and `MISSING_OCR_OUTPUT`, losing the saved comments from its own report and omitting requested inference context.

A separate reproduction showed the pinned-schema interpreter accepting undeclared inherited property names (`constructor`, `toString`, `valueOf`, `__proto__`). Malformed canonical report records could also crash report synthesis.

## Repairs and evidence

- Configurable overall deadline: `--scan-timeout seconds`, default 1200 (20 minutes). Library `options.timeout` remains milliseconds. Zero, negative, fractional, nonnumeric, exponential notation, and overflowing CLI values are rejected before inference.
- Execution status distinguishes success, timeout, failure, and not-started. `OCR_PROCESS_TIMEOUT` identifies the deadline case; external error text remains masked. Requested routing is retained separately from actual reported identity, including early failure paths. Revision is recorded before execution.
- Missing-output recovery requires the exact session marker from the failed OCR process, an ID absent from the pre-run inventory, and matching repo/model/time metadata. Stale/conflicting/malformed/mismatching sessions fail closed. Recovered findings remain partial with unknown coverage. Native explicit failures are preserved through process/identity warnings.
- Schema validation uses own-property lookup. Shared canonical finding validation retains valid report siblings and diagnoses invalid records. Report engines validate canonical coverage and displayed metadata before rendering or certifying completion.
- Regressions were observed failing before repairs. Final offline result: **111 tests across 17 files passed** on Node 26.12.0. Packaged no-devDependencies smoke, actual OCR file-selection preview, Bash syntax, and whitespace checks passed.
- A fresh read-only final review found two additional report-engine gaps: malformed coverage could return complete/exit 0; malformed displayed metadata could crash rendering. Seven cases failed before the corrective pass and passed afterward. The full 111-test suite and packaged smoke passed after that pass.

## Live rerun

Reviewed application commit: `65b3b63d275e7e2ede0b75d78c46c28c077b8e44`.

```sh
node ./bin/doublecheck.js . --mode architect \
  --model deepseek-v4.1-flash:1017-cloud --ocr-provider ollama \
  --allow-remote --scan-timeout 1200 --format both \
  --output /tmp/doublecheck-self-review-rerun-2026-10-24/report.json
```

Cloud inference was explicitly authorized by the user; no provider configuration was changed. The process finished in **583153 ms (9 minutes 43 seconds)**, within the new 1200000 ms deadline. Execution status: **succeeded**. Reported provider/model matched the requested provider/model. The native saved session `f63af7db-b370-4a2c-ab96-1e88362ad0c3` recorded **28 completed files, zero LLM failures**, and a normal end timestamp. A fresh preview selected the same 28 files; none lacked a completed session entry.

OCR saved 100 per-file comments. Its final postprocessing emitted **93 findings**, all retained in Doublecheck's report: **8 high, 51 medium, 34 low**. All are `needs_validation`; none was automatically promoted to a confirmed vulnerability. The final report has only `LENS_NOT_REQUESTED` and `UNKNOWN_NATIVE_COVERAGE` diagnostics, without process/output/identity failures.

CLI exit **2** and report status **partial** remain expected. OCR `scan` does not supply a coverage manifest; supplemental session/preview agreement does not establish canonical complete coverage. High candidates also remain unresolved. The adversary lens was explicitly unrequested.

Local run artifacts:

- `/tmp/doublecheck-self-review-rerun-2026-10-24/report.md`
- `/tmp/doublecheck-self-review-rerun-2026-10-24/report.json`
- `/tmp/doublecheck-self-review-rerun-2026-10-24/session-metadata.json`
- `/tmp/doublecheck-self-review-rerun-2026-10-24/session-comments.json`

These temporary artifacts are not packaged or committed. The live native run establishes this actual integration path, not cross-platform/runtime conformance or model precision/recall. The new candidates still need independent triage; they are not 93 confirmed defects.

## Decisions and remaining boundaries

1. Default overall deadline is 20 minutes, configurable up to the Node timer bound. A larger repository can still exceed it; this is a bound, not a completion guarantee. This rerun demonstrates that five minutes was insufficient for this repository/model combination.
2. Recovery requires the process's own session marker as well as new-ID/metadata checks. A hard kill without that marker, an unreadable inventory, or an already-existing malformed output file can still require manual session recovery. Guessing the newest session would risk importing another run's findings. Recovery and parser rejection paths were tested with fixtures; this successful rerun did not trigger timeout recovery.
3. Existing checkout/branch were reused; commits remain local. No release, push, Node 20/22/24 execution, or actual agent-host discovery was performed in this fix pass.

The supported native source was inspected at pinned upstream revision [375f64cd6f67a48a135da83cfcf59c52669a09cb](https://github.com/alibaba/open-code-review/blob/375f64cd6f67a48a135da83cfcf59c52669a09cb/cmd/opencodereview/scan_cmd.go): native scan errors print the session marker used for recovery. The installed 1.13.3 CLI help and actual session commands were checked locally.
