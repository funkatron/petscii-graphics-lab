# Vendored GIF encoder

`gifenc.esm.js` is the ES module distribution from **gifenc 1.0.3**, published by Matt DesLauriers:

- Source: https://github.com/mattdesl/gifenc
- npm package: `gifenc@1.0.3`
- npm tarball SHA-1: `3a1a97fa5ab70ebefd000350b9aac8313b30b3aa`
- License: MIT, retained in `gifenc-LICENSE.md`

The unused source-map footer was removed. No runtime CDN request is required. The editor imports the encoder only when exporting a GIF; drawing and playback do not depend on it.

`omggif` is a development-only dependency used as an independent decoder in regression tests. It is not shipped to the browser.

## ZIP writer

`fflate-zip.esm.js` contains only `Zip` and `ZipPassThrough` from **fflate 0.8.3** by Arjun Barrett:

- Source: https://github.com/101arrowz/fflate
- npm package: `fflate@0.8.3`
- npm tarball SHA-1: `bc27d8eb30343d4d512abb03480202ce65d825fc`
- License: MIT, retained in `fflate-LICENSE.md`
- Generated module SHA-256: `d95d9330b79b84fbe1be89682c37e45d84d8d67170e09c06c2dd8bdfe6fab1e3`

An entry module re-exports those classes from `fflate/esm/browser.js`. It was bundled with `esbuild@0.25.5 --bundle --format=esm --minify --target=es2020`. No source modifications were made. The roughly 5 KB module loads only when exporting a frame ZIP; it requires no runtime CDN, worker or compressor. PNGs are already compressed, so entries use ZIP's store method and stream into Blob chunks one file at a time.

Tests use development-only `adm-zip` and `pngjs` to independently validate archive CRCs, filenames, metadata and decoded PNG pixels. Neither is shipped to the browser.

## Video encoder integration and muxer

`mediabunny-video.esm.js` is a tree-shaken browser bundle of **mediabunny 1.61.6** by Vanilagy:

- Source: https://github.com/Vanilagy/mediabunny
- npm tarball SHA-1: `ec373ca2e701270204c1f25522f8c57645b313cc`
- License: Mozilla Public License 2.0, retained in `mediabunny-LICENSE.md`
- Generated module SHA-256: `e6af2604b0e87df8b100be1d98da6e5c84c0cf33ad89b02b1a060037fe65bbc8`

The entry re-exports `Output`, `BufferTarget`, `CanvasSource`, `Mp4OutputFormat`, `WebMOutputFormat`, `canEncodeVideo`, and `Quality` from the package's browser ES module entry. It was bundled unmodified with `esbuild@0.25.5 --bundle --format=esm --minify --target=es2020 --platform=browser`. The module loads only on video export. No runtime CDN, WASM codec or server is used. The corresponding source is published at https://registry.npmjs.org/mediabunny/-/mediabunny-1.61.6.tgz (the package includes its original `src/` tree).

`video-export.js` is the application integration, separate from the unmodified vendored source. It uses native WebCodecs, preferring AVC/MP4 and falling back to VP9/VP8 WebM. Explicit timestamps preserve the shared frame timeline without real-time recording. Tests independently inspect/decode output with `ffprobe` and `ffmpeg`; CI installs FFmpeg for these development checks.
