# Doublecheck 0.2.0 release verification

Version 0.2.0 was published on November 11, 2026 from commit `c62e794164803ae919dd16a8955dc3f595c356ac`. This record describes the published artifact. [Release and checksum](https://github.com/poferraz/doublecheck/releases/tag/v0.2.0) · [npm package](https://www.npmjs.com/package/@poferraz/doublecheck/v/0.2.0) · [Pull request](https://github.com/poferraz/doublecheck/pull/1)

## What was verified

| Check | Observed result |
| --- | --- |
| Artifact integrity | npm and GitHub served the same 52,199-byte tarball, with 37 files and SHA-256 `aec750c13c80ab228ffd7b672ded85ad1043d0ebfbb7a894f329a4d819b20795`. |
| Fresh install | Anonymous installs on Node 20.0.0 and 26.13.0 ran CLI help, initialized review instructions, and loaded the library. All 37 file contents and modes matched the tarball. Lockfile integrity matched the registry. |
| Continuous integration | All six pull-request jobs and five post-merge jobs passed. Each development runtime passed 267 tests across 26 files and the separate six-test CLI integration suite. [PR checks](https://github.com/poferraz/doublecheck/actions/runs/43124161872) · [OCR mock contract](https://github.com/poferraz/doublecheck/actions/runs/43124161873) · [Post-merge checks](https://github.com/poferraz/doublecheck/actions/runs/43124533492) |
| Native inference | A cloud-backed model returned three unverified candidates on two synthetic files. One benign parser finding depended on an unsupported assumption about how the function should handle exceptions. The report stayed partial and the CLI exited 2. |
| Timeout | A one-second deadline stopped a native synthetic run after 1.008 seconds. Markdown and JSON both recorded the failure and the CLI exited 2. |
| Host activation | Codex and Antigravity desktop applied the exported skill on two synthetic files. The Antigravity CLI loaded its manuals, but its answer was truncated. Cursor, Claude Code and Windsurf exports had format and reference checks only. |

The synthetic cases do not establish detection rates or false-positive rates. The native provider checks used a loopback mock and a cloud-backed model. Local model weights and Windows process-tree termination were untested. OCR 1.13.3 did not provide a native coverage manifest. A process could finish successfully with no findings while the review still returned exit 2. See [validation and limits](../RELEASE_0.2.0.md#validation-and-limits).

## Earlier self-review

In October, a five-minute deadline stopped an active self-review before its final output was written. The saved session had 17 completed files and 72 comments. The maintainer increased the default deadline to 20 minutes and restricted recovery to saved evidence linked to the current run. A rerun finished in 9 minutes 43 seconds and produced 93 candidates. Without a coverage manifest the report remained partial. [Recovery change](https://github.com/poferraz/doublecheck/commit/52b0e5012bd930bf6e1dfa55931e6b85f98ffba3) · [Recorded rerun](https://github.com/poferraz/doublecheck/commit/09d9f2bb83a17e4e7117f6448e3d805c4adb1676)
