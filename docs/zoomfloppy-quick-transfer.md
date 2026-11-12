# Quick hardware testing with ZoomFloppy

Use an existing 1541 floppy to test successive PETSCII Graphics Lab **C64 PRG** exports on a real Commodore 128 in C64 mode. This avoids rewriting an entire D64 image for every test. It **does not** eliminate the floppy or turn ZoomFloppy into a virtual drive.

## Safety first

- **Power down the C128 and 1541, and unplug ZoomFloppy's USB**, before moving IEC serial cables. Do not hot-plug the six-pin DIN connections.
- Use **one controller at a time**: Linux → USB → ZoomFloppy → IEC → 1541 for transfer; **or** C128 → IEC → 1541 for playback. Do not use both controllers together unless a supported shared-bus configuration has been independently verified.
- Confirm the disk is writable and that you have a backup. **Never scratch or format the only copy** of a program or artwork.
- Do not connect the ZoomFloppy parallel, IEEE-488, or other headers to the C128's cartridge or user ports.

## Transfer a new PRG

These examples assume OpenCBM is already installed on Linux, the 1541 is device **8**, and the current disk has been backed up.

1. Connect the **powered-off** 1541 to ZoomFloppy with an IEC cable, then connect ZoomFloppy to Linux over USB. Power on the 1541.
2. Verify that Linux can communicate with the drive:

   ```sh
   sudo cbmctrl status 8; sudo cbmctrl dir 8
   ```

3. Export a **C64 PRG** from Graphics Lab and copy it to the Linux machine. To add a new program to the disk, consult your installed `cbmcopy --help` and use its **write** operation with device 8 and the exported PRG path. A commonly supported OpenCBM invocation is:

   ```sh
   sudo cbmcopy -w 8 /path/to/animation.prg
   ```

   **Verify the syntax against your installed version first.** The command writes a file to the existing disk, not a whole disk image. It may fail if the destination filename already exists. Do not assume it replaces an existing program automatically.

4. Verify the directory again:

   ```sh
   sudo cbmctrl status 8; sudo cbmctrl dir 8
   ```

   Confirm the expected filename and a successful drive status. If you need to replace a same-named program, use a new filename or back up and deliberately remove the old file using the documented OpenCBM disk-command procedure. Do **not** format the disk just to update one PRG.

5. Power off the drive and disconnect ZoomFloppy from USB before changing IEC cables. Connect the C128 to the 1541, power on, and enter C64 mode with `GO64` if necessary. Load the program using its disk filename or `LOAD "*",8,1` if the intended program is the first entry. Run it as required by the exported PRG.

## What has been verified

In November 2026, a PETSCII Graphics Lab `ANIMATION` PRG was loaded from a physical 1541 floppy and visibly animated on a Commodore 128 in C64 mode with a Magnavox CRT. See [real-hardware validation](real-hardware-validation.md).

The commands above are a **proposed faster iteration workflow**, not an end-to-end test of repeated replacement. In one earlier OpenCBM readback, lowercase `animation` worked where uppercase `ANIMATION` did not; that is an observed quirk of that setup, not a general rule.

## References

- [OpenCBM documentation](https://opencbm.trikaliotis.net/)
- [ZoomFloppy manual (PDF)](https://retroport.de/wp-content/uploads/2018/10/zoomfloppy-manual-1-0b.pdf)
