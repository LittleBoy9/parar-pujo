// Minimal JPEG handling: read the pixel size and strip every metadata segment
// (EXIF incl. GPS location, XMP, ICC, comments). The browser already re-encodes
// photos through a canvas, which drops metadata — this is the server-side guarantee
// for anyone who uploads around the page.

export interface JpegInfo {
  width: number;
  height: number;
  bytes: Uint8Array; // the cleaned file
}

// SOF markers that carry the frame size (excludes DHT 0xC4, JPG 0xC8, DAC 0xCC)
const SOF = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);

export function cleanJpeg(input: Uint8Array): JpegInfo | null {
  if (input.length < 4 || input[0] !== 0xff || input[1] !== 0xd8) return null;

  const out: Uint8Array[] = [input.subarray(0, 2)]; // SOI
  let width = 0;
  let height = 0;
  let i = 2;

  while (i < input.length) {
    if (input[i] !== 0xff) return null;
    // skip fill bytes
    while (input[i] === 0xff && i < input.length) i++;
    const marker = input[i];
    const markerStart = i - 1;
    i++;

    if (marker === 0xd9) break; // EOI without scan — malformed for our purposes
    if (marker >= 0xd0 && marker <= 0xd7) continue; // RSTn, no length

    if (i + 2 > input.length) return null;
    const len = (input[i] << 8) | input[i + 1];
    if (len < 2 || i + len > input.length) return null;
    const segEnd = i + len;

    if (SOF.has(marker) && len >= 7) {
      height = (input[i + 3] << 8) | input[i + 4];
      width = (input[i + 5] << 8) | input[i + 6];
    }

    // APP1–APP15 (0xE1–0xEF) and COM (0xFE) are metadata: drop them.
    // APP0 (JFIF) is harmless and keeps old decoders happy.
    const isMetadata = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (!isMetadata) out.push(input.subarray(markerStart, segEnd));

    if (marker === 0xda) {
      // Start of scan: everything after is image data up to EOI — keep as-is.
      out.push(input.subarray(segEnd));
      if (!width || !height) return null;
      const total = out.reduce((n, a) => n + a.length, 0);
      const bytes = new Uint8Array(total);
      let o = 0;
      for (const part of out) {
        bytes.set(part, o);
        o += part.length;
      }
      return { width, height, bytes };
    }
    i = segEnd;
  }
  return null;
}
