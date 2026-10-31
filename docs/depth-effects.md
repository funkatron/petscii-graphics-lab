# Racing- and space-inspired depth effects

## Goal

Add the impression of moving through a 3-D scene while keeping authentic C64 glyphs and the editor's small set of animation controls. These are proposed character-grid effects, not a game engine or a claim to reproduce a particular historical game.

Use two techniques: project occupied artwork cells through depth, or sample the drawing as a repeated surface. Keep these distinct from shaders: movement changes derived glyph/ink placement; shaders are a separate optional treatment of rendered pixels.

## Candidate order

| Order | Candidate | Visual behavior | Role of the artwork |
| --- | --- | --- | --- |
| 1 | Space warp | Stars or symbols expand outward from a vanishing point, with near objects moving faster. Reverse gives travel away from the viewer. | Each occupied cell supplies a deterministic object and its ink. Empty artwork stays empty. |
| 2 | Perspective floor | A repeated textured plane moves toward or away from a horizon, suggesting flight over terrain or a road surface. | The entire drawing is a wrapping texture; glyphs remain whole. |
| 3 | Curved road | The lower view widens toward the viewer, with periodic bends and roadside motion. | Artwork textures the road; start without generated cars, scenery or racing rules. |
| 4 | Tunnel flight | Repeated artwork surrounds a vanishing point, moving toward the viewer with optional periodic twist. | Artwork is a wrapped tunnel texture; no new glyph shapes. |
| 5 | Orbital field | Occupied symbols follow depth-sorted orbital paths, suggesting flight past objects. | Deterministic positions derived from occupied cells; defer until simpler projection is validated. |

Prototype Space warp first. The current Starfield translates three fixed depth layers along a screen axis; Space warp would add actual perspective expansion. Prototype the floor next to evaluate whether the grid resolution supports useful racing-style depth. Keep Curved road and Tunnel flight as candidates until those two prove readable.

## Space warp prototype

1. Derive a stable object list from occupied source cells, including glyph and ink. Normalize each cell center around the drawing center. Derive initial depth from its cell index, without random numbers or persistent simulation state.
2. For frame phase p, wrap each object's depth through a bounded interval: z = near + range × fract(seed − p). Keep near positive. Project x and y by focalLength / z around a fixed vanishing point, then round once to destination cells.
3. Draw far objects first, then near objects. Resolve equal-depth collisions by stable source index. Clip objects outside the canvas. Do not invent streak glyphs or scale a glyph's internal bitmap in the first version.
4. Choose the focal length and depth interval from representative sparse drawings. Objects wrap at a depth boundary; investigate visible popping and keep it outside the view where possible. Describe any remaining pop honestly. The loop boundary must match exactly.

An occupied cell at the exact vanishing point may stay stationary. Test this explicitly; do not move it with a division-by-zero workaround. A one-cell canvas should remain valid. Dense artwork will collide heavily; document that sparse compositions work best.

Initial controls: Travel toward / away, existing loop duration, movement cycles and independent color effect. Avoid exposing camera coordinates, focal length or clipping planes as user controls. Add one strength/depth control only if visual comparison demonstrates a need.

## Perspective floor prototype

Inverse-map each destination row below a fixed horizon to depth using a positive row-center distance from that horizon. For each cell, sample a wrapped source texture coordinate using depth and periodic travel phase. Rows near the horizon show compressed texture; nearer rows show larger repeated regions. Copy complete glyph/ink pairs. Leave the upper region empty with the shared background.

Define travel as an integer number of source texture repeats per motion cycle, so the source coordinates match at phase zero and one. Quantize only at source-cell lookup. Clamp the horizon singularity and cap far sampling. On very short canvases, choose a defined fallback rather than unstable projection.

First controls: Travel toward / away and existing timeline/cycles. Keep a fixed horizon initially. A later road effect may add a periodic centerline bend, such as sin(2πp + depthOffset), while preserving loop closure. Do not label a diagonal texture shift as a camera turn.

## Integration contracts

- Add derived `{cells, inks}` frames in the shared movement calculation, before the existing color pass. Do not edit source artwork, replay, history or autosave on animation ticks.
- Keep the preview read-only. Still PNG/SVG exports continue to use the original artwork; animated GIF, video, frame ZIP and C64 selected-animation exports use the same sampled derived frames.
- Snapshot all settings before asynchronous export and include new settings in cache identity, ZIP metadata and exact project validation. New controls require explicit optional defaults and invalid-input rejection.
- Preserve the existing 20 ms sampling budget and cycle warnings. Choose sample targets after measuring visible stepping and cost; do not assume that the current 24-frame intro target is sufficient.
- Native C64 output can consume quantized glyph/ink frames, subject to existing pattern, memory and timing limits. Do not promise full-screen smooth native playback. Shaders remain excluded from native output.
- Keep new options contextual and test phone/iPad reach. No new backend, WebGL requirement or dependency is needed for the first whole-cell prototypes.

## Ready for prototype review

- [ ] Build Space warp with a pure phase-to-frame calculation and deterministic collision rules.
- [ ] Compare sparse, dense, asymmetric, mixed-bank and empty artwork at 1×1, 1×N, square and rectangular dimensions.
- [ ] Inspect whole-loop previews at slow and fast rates on phone/iPad; judge direction readability, clipping, popping and stepping.
- [ ] Verify independent expected frames, source/ink pairing, depth order, exact loop closure and finite coordinates.
- [ ] Decode GIF/ZIP pixels and repeated video cycles; compare C64 frame inputs and retain exporter rejection checks.
- [ ] Verify saved settings, defaults, invalid imports, Undo, autosave and export snapshots/cache invalidation.
- [ ] Measure rendering cost on representative 40×25 artwork before selecting sampling limits.
- [ ] Prototype Perspective floor separately and decide whether it warrants a road variant.

This planning pass is based on the current `animationPlan`, `introMotionFrame`, `animationCells` and export contracts. Historical game references and licensing review for any future reference images remain a separate research task; no game assets are proposed for inclusion.

## Space warp prototype status

A first implementation is in review. Depth ranges from 0.35 to 1.75 with focal factor 0.8, stable source-index seeds and far-to-near ordering. The optional `depthTravel` setting defaults to `toward` and is serialized only for this effect, keeping unrelated project metadata unchanged. The initial target is 48 samples per motion cycle, minimum 12, under the existing budget rules. These constants are prototype choices, not measured optimal settings.

Six pure projection tests pass locally. Nine browser cases cover every GIF/ZIP frame in both directions, paused preview, source preservation, import defaults/rejection and autosave/history. Browser execution, visual inspection, direct native/video coverage, color combinations and measured frame cost remain required before calling this effect release-ready.

## Surface prototype status

Perspective floor, Curved road and Tunnel flight are implemented in a separate review pass using a pure inverse texture sampler. They share optional Depth travel, a 48-sample target and 12-sample minimum per cycle. Floor uses horizon 0 (the top edge) and capped inverse row depth. Road clips outside a widening band with a periodic centerline bend. Tunnel maps angle to texture columns and inverse normalized radius to texture rows, leaving radius below 0.12 empty. Travel changes by a whole texture repeat per cycle. These are coarse whole-cell effects, with fixed prototype constants.

Twenty local surface tests cover geometry boundaries, a fixed floor-coordinate vector, source/ink pairing, empty/degenerate grids and loop closure. Eighteen browser cases compare all GIF/ZIP frames, require actual frame variation and verify exact persistence and invalid-direction rejection. Visual motion review, independent full-frame references for road/tunnel, native/video checks, color combinations and performance measurement remain open. No visual quality or native smoothness claim is made.

## Full-height surfaces and tunnel symmetry fix

Floor and road now start at the top edge instead of leaving the upper quarter empty. Road width has a half-cell minimum so very narrow grids retain a road sample on the top row. Source texture transparency/empty cells still apply.

A 5×3 row-banded tunnel fixture reproduced mismatched mirrored depth rows at frame 12/48: the previous normalization subtracted 1 after division, producing unequal floating-point radii on opposite sides. Compute centered integer numerators before division on both axes. Mirrored rays now have identical radii without forcing asymmetric artwork to become symmetric. Pure and decoded GIF regressions cover this boundary.
