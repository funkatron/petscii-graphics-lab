# Vendored GIF encoder

`gifenc.esm.js` is the ES module distribution from **gifenc 1.0.3**, published by Matt DesLauriers:

- Source: https://github.com/mattdesl/gifenc
- npm package: `gifenc@1.0.3`
- npm tarball SHA-1: `3a1a97fa5ab70ebefd000350b9aac8313b30b3aa`
- License: MIT, retained in `gifenc-LICENSE.md`

The unused source-map footer was removed. No runtime CDN request is required. The editor imports the encoder only when exporting a GIF; drawing and playback do not depend on it.

`omggif` is a development-only dependency used as an independent decoder in regression tests. It is not shipped to the browser.
