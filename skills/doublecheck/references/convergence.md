# Location Correlation and Triage

Location overlap is an informational link between findings. It does not prove a shared root cause, independent verification, exploitability, or higher severity.

Use exact canonical target-relative paths and overlapping known positive line ranges. Missing lines, suffix matches, adjacent locations, or identical titles are insufficient. Preserve every distinct concern; collapse only exact content duplicates. Inspect all trace locations, including downstream sinks.

Keep verdict and severity separate:

| Verdict | Treatment |
| --- | --- |
| confirmed | Rank by impact-based severity: critical → P0; high → P1; medium/low/informational → P2. Missing severity stays Unrated. |
| needs_validation | Keep as a candidate with its reported severity and exact unresolved fact. Do not count it as a confirmed defect. |
| rejected | Retain separately with the rejection evidence; never resurrect it because another reviewer flags that line. |

Two LOW findings remain LOW after overlap. Even two CRITICAL reports require evidence that each is valid; agreement supplies no calibrated percentage confidence. Native OCR output alone is not an independent exploit reproduction.

Unknown or failed coverage remains explicit. A candidate's urgency may justify blocking a merge while validation is pending, but urgency does not change its verdict. Exit 2 preserves that distinction for high/critical/unrated candidates; it must not be described as a clean review.
