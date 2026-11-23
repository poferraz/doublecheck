# Security policy

## Reporting

Use the repository's private reporting form for vulnerabilities in Doublecheck. Include the affected release or source commit and the behavior you observed. Redact secrets, private source and local paths from attachments. [Report a vulnerability](https://github.com/poferraz/doublecheck/security/advisories/new)

## Reviewing code and handling evidence

The optional OCR process and its configured tools run with your operating-system permissions. The CLI imports security findings from JSON. The pinned Cloudflare schema checks the structure of each record. Assess who produced it, which revision it covers and whether its evidence supports the claim. Overlap with another finding leaves the verification state unchanged.

Doublecheck checks reported paths against the selected root. Path normalization is lexical. It does not isolate the process from the filesystem or confine symbolic links.

Reports can contain code excerpts and absolute paths. Current source writes reports to a private temporary directory by default and prints their location. The OS may clean up this directory. Supply `--output` to keep a report in a location you control. Check any explicit destination before publishing or committing it. The released npm 0.2.0 CLI instead defaults to the working directory. Both versions create report files with restrictive permissions. When writing two formats, a later write can fail after one format was saved.

## Inference and provider configuration

Library report evaluation, CLI help and review-instruction initialization work offline after installation. A native review runs OCR against the configured model and can transmit the selected source. Even a configuration check contacts the model endpoint. OCR's automatic updater is disabled for managed runs. A hosted review service, if separately enabled, uses its own account and data policies.

Use a trusted OCR 1.13.3 installation and provider configuration. The CLI checks the provider, model and endpoint before native execution. Credential commands, credentials in URLs, query strings and URL fragments are rejected. Readiness probes do not follow redirects. In current source, off-host endpoints require both HTTPS and explicit remote opt-in. Cloud-tagged models and models reported as remotely backed also require opt-in. A loopback endpoint can forward traffic. Check the daemon's cloud policy if source must stay on your machine.

Current source passes OCR a limited environment for executable lookup, home and temporary directories, operating-system paths and locale. It omits other shell variables, including credential and proxy variables. Credentials available through its configuration files, its configured tools, or the operating-system account may still be accessible. The [published 0.2.0 release](docs/RELEASE_0.2.0.md) predates the environment and off-host transport restrictions.

## Validation limits

Native OCR 1.13.3 supplies no full-file coverage manifest, so its native reviews are partial even when it reports zero findings. Synthetic tests measure the stated behavior of the report and gate. Human verification is still needed to determine whether a candidate affects the code. [Release validation and limits](docs/RELEASE_0.2.0.md#validation-and-limits)
