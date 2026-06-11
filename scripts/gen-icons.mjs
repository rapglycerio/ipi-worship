// Generates the PWA PNG icons referenced by public/manifest.json.
// Renders a maskable icon (full-bleed brand background + centered music note,
// glyph kept inside the 80% safe zone) at every required size.
//
// Run with: node scripts/gen-icons.mjs
// `sharp` is resolved from the main repo's node_modules (worktrees share it).
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Resolve sharp from the repo root that actually has node_modules installed.
const require = createRequire('C:/Users/rapha/Documents/Antigravity/Projetos/ipi-worship/package.json');
const sharp = require('sharp');

const BRAND = '#00B0EF';
const OUT = resolve(__dirname, '..', 'public', 'icons');

// 512x512 master. Background is full-bleed (maskable). The note glyph sits well
// inside the central safe zone so the OS mask never clips it.
const svg = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" fill="${BRAND}"/>
  <g fill="#ffffff">
    <!-- stems -->
    <rect x="214" y="150" width="20" height="180" rx="6"/>
    <rect x="316" y="124" width="20" height="180" rx="6"/>
    <!-- beam joining the two stems -->
    <path d="M214 150 L336 124 L336 162 L214 188 Z"/>
    <!-- note heads -->
    <ellipse cx="196" cy="334" rx="46" ry="34"/>
    <ellipse cx="298" cy="308" rx="46" ry="34"/>
  </g>
</svg>`;

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const buf = Buffer.from(svg);

for (const size of sizes) {
  const file = resolve(OUT, `icon-${size}x${size}.png`);
  await sharp(buf, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(file);
  console.log('wrote', file);
}
console.log('Done:', sizes.length, 'icons');
