# Bundled dependencies

This directory holds copies of third-party code used for animation downloads. *Vendored* means the code is included in this repository instead of fetched from a CDN while the editor runs.

Drawing and preview playback do not need these encoders. Each module loads only when its download format is requested.

## Find a dependency

| Purpose | File | Package | License text |
| --- | --- | --- | --- |
| Animated GIF | `gifenc.esm.js` | gifenc 1.0.3 | [MIT](gifenc-LICENSE.md) |
| PNG frame ZIP | `fflate-zip.esm.js` | fflate 0.8.3 | [MIT](fflate-LICENSE.md) |
| Video encoding and file packaging | `mediabunny-video.esm.js` | mediabunny 1.61.6 | [MPL-2.0](mediabunny-LICENSE.md) |

The license files retain their original wording. The application’s video integration lives separately in [`video-export.js`](../video-export.js).

## GIF: gifenc

`gifenc.esm.js` comes from **gifenc 1.0.3** by Matt DesLauriers.

- Source: <https://github.com/mattdesl/gifenc>
- npm package: `gifenc@1.0.3`
- npm tarball SHA-1: `3a1a97fa5ab70ebefd000350b9aac8313b30b3aa`

The unused source-map footer was removed. The module loads when exporting a GIF and makes no runtime CDN request.

Tests use **omggif** as an independent GIF decoder. It is a development dependency and is not shipped to the browser.

## ZIP: fflate

`fflate-zip.esm.js` contains only `Zip` and `ZipPassThrough` from **fflate 0.8.3** by Arjun Barrett.

- Source: <https://github.com/101arrowz/fflate>
- npm package: `fflate@0.8.3`
- npm tarball SHA-1: `bc27d8eb30343d4d512abb03480202ce65d825fc`
- Generated module SHA-256: `d95d9330b79b84fbe1be89682c37e45d84d8d67170e09c06c2dd8bdfe6fab1e3`

The build entry exposes those two classes from `fflate/esm/browser.js`. It was bundled with **esbuild 0.25.5**, using:

```text
--bundle --format=esm --minify --target=es2020
```

No source code was modified. The resulting module is about 5 KB and loads only for a frame ZIP download. It needs no runtime CDN, background worker, or compressor.

PNG images are already compressed. ZIP entries use *store mode*, which keeps those bytes without compressing them again. The writer adds one file at a time to the final browser file object (a Blob).

Tests use **adm-zip** and **pngjs** to check ZIP integrity, names, metadata, and PNG pixels independently. ZIP integrity checks include CRCs: small fingerprints used to detect damaged entries. Neither test dependency ships to the browser.

## Video: mediabunny

`mediabunny-video.esm.js` is a browser bundle of **mediabunny 1.61.6** by Vanilagy. Unused code was removed during bundling; the retained source is unmodified.

- Source: <https://github.com/Vanilagy/mediabunny>
- npm package: `mediabunny@1.61.6`
- npm tarball SHA-1: `ec373ca2e701270204c1f25522f8c57645b313cc`
- Generated module SHA-256: `e6af2604b0e87df8b100be1d98da6e5c84c0cf33ad89b02b1a060037fe65bbc8`
- Corresponding source package, including `src/`: <https://registry.npmjs.org/mediabunny/-/mediabunny-1.61.6.tgz>

The build entry exposes `Output`, `BufferTarget`, `CanvasSource`, `Mp4OutputFormat`, `WebMOutputFormat`, `canEncodeVideo`, and `Quality` from the package’s browser ES module.

It was bundled with **esbuild 0.25.5**, using:

```text
--bundle --format=esm --minify --target=es2020 --platform=browser
```

The module loads only for video export. It uses browser-native WebCodecs, preferring AVC/H.264 MP4 and falling back to VP9/VP8 WebM. It needs no runtime CDN, WebAssembly codec, or server.

A *muxer* packages encoded frames into the video file. Explicit timestamps preserve the animation timeline without recording the preview in real time.

Tests inspect metadata with `ffprobe` and decode video with `ffmpeg`. GitHub Actions installs FFmpeg for these development checks.

## Check the recorded builds

A hash is a fingerprint of file bytes. Compare the bundled ZIP and video modules with the SHA-256 values above after changing the build:

On Linux:

```sh
sha256sum vendor/fflate-zip.esm.js vendor/mediabunny-video.esm.js
```

On macOS:

```sh
shasum -a 256 vendor/fflate-zip.esm.js vendor/mediabunny-video.esm.js
```

Keep package versions, source links, build options, hashes, and license files together when updating a dependency.
