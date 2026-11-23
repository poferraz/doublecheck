# README artwork

The PNG is the original AI-generated illustration. The animation adds two independent review paths while the report labels stay still. The README includes a [static version](doublecheck-hero.png) for readers who prefer it.

To rebuild the [GIF](doublecheck-hero.gif) from the PNG, install FFmpeg and use Node.js 20 or newer from the repository root.

```sh
node docs/assets/render-hero.mjs
```

The README loads both images from the repository so the npm package can omit the artwork and renderer.
