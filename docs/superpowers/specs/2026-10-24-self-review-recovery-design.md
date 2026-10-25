# Self-review failure repair

The CLI self-review at b49e351 launched OCR 1.13.3 with its default 15-minute per-task allowance, but Doublecheck killed the whole process after five minutes. OCR persisted 17 completed files and 72 comments before termination; its final JSON had not been written. Early returns also omitted known requested routing and revision. Independently reproduced defects: inherited schema properties bypass additionalProperties:false, and malformed canonical report input throws rather than retaining valid siblings.

The user explicitly requested investigation, a plan, implementation, and another live run. Execute inline on the existing codex/review-reliability branch; cloud authorization for the configured DeepSeek model persists.

## Approach and constraints

Make the overall deadline configurable with --scan-timeout seconds (positive safe integer, default 1200 seconds). Keep library timeout in milliseconds. A larger default alone avoids the observed premature termination but still loses results on genuine failures; therefore recover saved session comments conservatively after missing output. Snapshot OCR session IDs before scanning; recover only a newly created full_scan session explicitly identified by OCR’s own stderr session marker, matching the canonical repo, model, and run time. Reject absent or conflicting markers, stale IDs, and mismatching show metadata. If discovery is unavailable or ambiguous, do not recover. Never select stale sessions or conflate concurrent runs. Keep recovered coverage unknown and status partial, even for zero comments. Bound session commands and output size. No automatic cloud opt-in, config writes, dependencies, or fabricated completion.

Retain actual reported provider/model separately from requested routing. Add native execution metadata for timeout, elapsed time, outcome, and recovered session identity/completed files. Mask external error content. Preserve explicit native failure status when processing partial output or identity mismatch.

Use own-property schema lookup; preserve the pinned schema. Validate canonical findings at the report boundary with the same contract as custom runners, retain valid siblings, add diagnostics, and downgrade purported complete reports when input is invalid. Do not implement the 72 unverified review suggestions wholesale.

## Verification

Regressions must fail first: deadline forwarding/rejection, timeout classification and requested context, unique session recovery, stale/ambiguous/malformed session rejection, native hard-failure preservation, inherited additional fields, invalid finding/engine inputs with valid siblings. Run full offline suite, packaged smoke, then production CLI self-review through the authorized provider. A successful OCR scan still yields partial/exit 2 because native scan coverage is unknown; distinguish process success from coverage completion. Record live evidence and any remaining limits.
