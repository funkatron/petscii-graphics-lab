# Real-hardware validation: PRG animation

**Observed:** November 2026  
**Status:** Successful physical-media load and visible animation; timing and byte-level fidelity not yet measured.

## Equipment

- PETSCII Graphics Lab C64 PRG export, directory filename `ANIMATION`
- Commodore 1541 floppy drive, device 8
- Physical floppy labeled `PETSCII LAB`, disk ID `2A`
- Commodore 128 wedge model, running C64 compatibility mode
- Magnavox CRT monitor using composite video
- Linux Mint host with OpenCBM/ZoomFloppy for writing and reading the disk

## Observations

1. The 1541 reported `00, ok,00,00` and a readable directory containing a 151-block `ANIMATION` PRG and 513 blocks free.
2. `cbmcopy` readback using uppercase `ANIMATION` or `A*` returned `62, FILE NOT FOUND`; a lowercase `animation` argument succeeded in this particular OpenCBM setup. This is an observation, **not** a universal filename rule.
3. A plausible-size PRG file was recovered on the Linux host. Its bytes were not independently compared with the original export.
4. The C128 booted BASIC V7.0, entered C64 mode, and displayed the standard C64 BASIC V2 startup screen.
5. The C64-mode machine loaded the disk program via `LOAD "*",8,1`. A recorded CRT demonstration showed changing PETSCII graphics.

## Limits and next checks

- Confirm original PRG versus readback with SHA-256 hashes.
- Measure animation cadence and compare expected frames with CRT output.
- Test a standalone C64 after its power supply is verified safe; the two available C64 units showed startup faults and were **not** used for this successful validation.
- Retain the original recording as evidence. A GIF is useful for README presentation, but should not replace the source video.

## README media

When the final animation is selected, place an optimized looping GIF at `docs/media/petscii-real-hardware.gif` and add a Markdown image link in the README's real-hardware section. Keep the README readable if the image cannot load. Avoid committing a large GIF without checking its file size and accessibility.
