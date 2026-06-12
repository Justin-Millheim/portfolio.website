// Zero-dependency PNG icon generator for The Block PWA. Draws the burn-mode
// flame mark (flame→amber gradient) on the #0a0a0a background, no external
// tooling required (uses Node's built-in zlib). Re-run to regenerate.
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  // rows with filter byte 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const lerp = (a, b, t) => a + (b - a) * t;
const FLAME = [0xff, 0x6a, 0x32];
const AMBER = [0xff, 0xae, 0x3d];
const BG = [0x0a, 0x0a, 0x0a];

// Flame silhouette in normalized coords nx,ny ∈ [-1,1] (ny negative = up).
function inFlame(nx, ny, scale) {
  nx /= scale; ny /= scale;
  if (Math.abs(nx) > 1 || Math.abs(ny) > 1) return false;
  const cy = 0.28;     // base-circle centre (lower)
  const R = 0.62;      // base radius
  const tipY = -0.98;  // flame tip
  if (ny >= cy) {
    return nx * nx + (ny - cy) * (ny - cy) <= R * R;
  }
  const t = (ny - tipY) / (cy - tipY); // 0 at tip → 1 at circle centre
  if (t <= 0) return false;
  const w = R * Math.sqrt(t);
  // gentle asymmetric wobble so it reads as a flame, not a teardrop
  const lean = 0.06 * Math.sin((1 - t) * 3.0);
  return Math.abs(nx - lean) <= w;
}

function render(size, flameScale) {
  const rgba = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x + 0.5) / size * 2 - 1;
      const ny = (y + 0.5) / size * 2 - 1;
      let r = BG[0], g = BG[1], b = BG[2];
      // soft radial glow behind the flame
      const dist = Math.sqrt(nx * nx + (ny + 0.05) * (ny + 0.05));
      const glow = Math.max(0, 1 - dist / 1.1) * 0.10;
      r = Math.min(255, r + FLAME[0] * glow);
      g = Math.min(255, g + FLAME[1] * glow);
      b = Math.min(255, b + FLAME[2] * glow);
      if (inFlame(nx, ny, flameScale)) {
        const t = Math.min(1, Math.max(0, (ny / flameScale + 1) / 2)); // top→bottom
        r = lerp(AMBER[0], FLAME[0], t);
        g = lerp(AMBER[1], FLAME[1], t);
        b = lerp(AMBER[2], FLAME[2], t);
      }
      const i = (y * size + x) * 4;
      rgba[i] = Math.round(r); rgba[i + 1] = Math.round(g); rgba[i + 2] = Math.round(b); rgba[i + 3] = 255;
    }
  }
  return rgba;
}

function write(path, size, flameScale) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, encodePNG(size, size, render(size, flameScale)));
  console.log("wrote", path, `${size}×${size}`);
}

const DIR = "public/program";
write(`${DIR}/icon-192.png`, 192, 0.82);
write(`${DIR}/icon-512.png`, 512, 0.82);
// Maskable: extra padding so nothing important is clipped by the OS mask.
write(`${DIR}/icon-maskable-512.png`, 512, 0.60);
// Apple touch icon (iOS home screen).
write(`${DIR}/apple-touch-icon.png`, 180, 0.82);
