# College / university logos

Drop the logo image files here and they'll appear automatically on the
Education card in the About section. Expected filenames (referenced in
`lib/data.ts` → `education[].logo`):

- `bits-pilani.png`  — BITS Pilani
- `vssut.png`        — Veer Surendra Sai University of Technology (VSSUT)

Notes:
- PNG with transparent background or SVG works best; they're rendered inside a
  36×36 rounded badge with `object-contain`, so any aspect ratio is fine.
- Until a file is present, the card gracefully shows a monogram (BITS / VSSUT).
- Use the official logo you have rights to display.
