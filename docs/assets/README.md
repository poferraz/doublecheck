# Repository hero

`doublecheck-hero.png` is the original artwork created with the built-in image-generation tool. `doublecheck-hero.gif` adds a seven-second, 15 fps loop: the adversary and architect scan the same code independently, then send separate evidence markers into the report. The wordmark and report labels remain still. Motion never changes a finding into a confirmed verdict or implies complete coverage.

The README provides descriptive alternative text and a static-image link. GitHub also offers playback controls through its [animated-image accessibility setting](https://docs.github.com/en/account-and-profile/how-tos/account-settings/managing-accessibility-settings).

Rebuild the animation with Node.js 20+ and FFmpeg:

```bash
node docs/assets/render-hero.mjs
```

This media tooling is separate from the CLI and has no npm dependencies. Artwork and animation are referenced by public repository URLs so the README can display them without adding media to the npm package. This documentation update does not replace the published 0.2.0 tarball.

## Original generation prompt

> Use case: ads-marketing. Create a polished wide 3:1 landscape GitHub repository hero banner for a developer tool named doublecheck. It reviews code from two independent perspectives: ADVERSARY examines exploitable trust-boundary failures; ARCHITECT examines correctness and lifecycle defects. The essence is two independent review passes over the SAME code, with a shared evidence trail that keeps findings, verification state and coverage separate. No claim that two checks guarantee safety. A precise editorial technical illustration, refined flat linework and beautifully controlled typography, substantial negative space, warm near-white background, graphite ink, one restrained amber review path and one restrained teal review path. No cyberpunk, no gradients/glowing neon, no robot, padlock or shield clichés, no stock dashboard screenshot. Left 40%: large lowercase wordmark exactly 'doublecheck', below it a short line exactly 'Two perspectives. One evidence trail.' Right 60%: one dark code sheet with a handful of clear abstract code lines (no actual program), two distinct overlapping outlined inspection frames, one tagged exactly 'ADVERSARY' and the other exactly 'ARCHITECT', two slim independent paths that feed into a compact report card with three separate labeled rows exactly 'Findings', 'Verification', 'Coverage'. No checkmark verdicts and no fake scores. Keep the frames and connecting paths simple and geometrically clear, suitable for a subtle subsequent scanning animation. Finish with a small '0.2.0' edition mark. A premium calm engineering publication cover, not a sales landing page. Keep all content comfortably inside generous margins. Make the composition legible when the entire banner is displayed at 900 pixels wide.
