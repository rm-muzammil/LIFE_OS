#!/usr/bin/env node
// Run: node scripts/gen-icons.js
// Generates SVG-based placeholder icons. Replace with real PNGs before production.

const fs = require("fs");
const path = require("path");

const sizes = [192, 512];
const outDir = path.join(__dirname, "../public/icons");
fs.mkdirSync(outDir, { recursive: true });

for (const size of sizes) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.2}" fill="#09090b"/>
  <text x="50%" y="54%" font-size="${size * 0.45}" text-anchor="middle" dominant-baseline="middle" fill="#22c55e">🌙</text>
</svg>`;
  fs.writeFileSync(path.join(outDir, `icon-${size}.svg`), svg);
  console.log(`Generated icon-${size}.svg — convert to PNG for production`);
}
