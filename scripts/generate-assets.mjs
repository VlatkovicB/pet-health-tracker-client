/**
 * Generate PNG assets from SVG sources.
 * Run: node scripts/generate-assets.mjs
 * Requires: pnpm add -D sharp
 */

import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const publicDir = join(root, 'public');
mkdirSync(publicDir, { recursive: true });

async function render(svgString, outPath, width, height) {
  await sharp(Buffer.from(svgString))
    .resize(width, height)
    .png()
    .toFile(outPath);
  console.log(`✓  ${outPath.replace(root + '/', '')}`);
}

// ---------------------------------------------------------------------------
// Paw print SVG (100x100 viewBox, scaled via sharp resize)
// ---------------------------------------------------------------------------
function pawSvg({ bgColor, pawFill, maskable = false }) {
  const padding = maskable ? 10 : 4; // safe zone for maskable icons
  const p = padding;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6c63ff"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>
  ${bgColor ? `<rect width="100" height="100" fill="${bgColor}"/>` : ''}
  <g transform="translate(${p},${p}) scale(${(100 - p * 2) / 100})">
    <ellipse cx="50" cy="68" rx="23" ry="18" fill="${pawFill}"/>
    <ellipse cx="22" cy="43" rx="11" ry="13" fill="${pawFill}"/>
    <ellipse cx="40" cy="34" rx="11" ry="13" fill="${pawFill}"/>
    <ellipse cx="60" cy="34" rx="11" ry="13" fill="${pawFill}"/>
    <ellipse cx="78" cy="43" rx="11" ry="13" fill="${pawFill}"/>
  </g>
</svg>`;
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

// app-icon-1024.png — gradient paw, white background
await render(
  pawSvg({ bgColor: '#ffffff', pawFill: 'url(#g)' }),
  join(publicDir, 'app-icon-1024.png'),
  1024, 1024,
);

// favicon-32.png / favicon-16.png
await render(
  pawSvg({ pawFill: '#6c63ff' }),
  join(publicDir, 'favicon-32.png'),
  32, 32,
);
await render(
  pawSvg({ pawFill: '#6c63ff' }),
  join(publicDir, 'favicon-16.png'),
  16, 16,
);

// pwa-icon-192.png — white paw on #6c63ff
await render(
  pawSvg({ bgColor: '#6c63ff', pawFill: '#ffffff' }),
  join(publicDir, 'pwa-icon-192.png'),
  192, 192,
);

// pwa-icon-512.png
await render(
  pawSvg({ bgColor: '#6c63ff', pawFill: '#ffffff' }),
  join(publicDir, 'pwa-icon-512.png'),
  512, 512,
);

// pwa-icon-512-maskable.png — paw inside 80% safe zone
await render(
  pawSvg({ bgColor: '#6c63ff', pawFill: '#ffffff', maskable: true }),
  join(publicDir, 'pwa-icon-512-maskable.png'),
  512, 512,
);

// apple-touch-icon.png — 180x180, white paw on #6c63ff
await render(
  pawSvg({ bgColor: '#6c63ff', pawFill: '#ffffff' }),
  join(publicDir, 'apple-touch-icon.png'),
  180, 180,
);

// ---------------------------------------------------------------------------
// og-image.png — 1200x630 marketing banner
// ---------------------------------------------------------------------------
const ogSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="55%" stop-color="#f0f4ff" stop-opacity="0"/>
      <stop offset="100%" stop-color="#a78bfa" stop-opacity="0.18"/>
    </radialGradient>
    <linearGradient id="pawGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6c63ff"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="#f0f4ff"/>
  <rect width="1200" height="630" fill="url(#vignette)"/>
  <text x="96" y="268" font-family="Nunito, system-ui, sans-serif" font-weight="900" font-size="124" fill="#1a1340">Pawlog</text>
  <text x="100" y="336" font-family="Nunito, system-ui, sans-serif" font-weight="600" font-size="38" fill="#6b7280">Track every moment of your pet's life.</text>
  <!-- Paw ~200px, right side centered -->
  <g transform="translate(862, 215) scale(2)">
    <ellipse cx="50" cy="68" rx="23" ry="18" fill="url(#pawGrad)"/>
    <ellipse cx="22" cy="43" rx="11" ry="13" fill="url(#pawGrad)"/>
    <ellipse cx="40" cy="34" rx="11" ry="13" fill="url(#pawGrad)"/>
    <ellipse cx="60" cy="34" rx="11" ry="13" fill="url(#pawGrad)"/>
    <ellipse cx="78" cy="43" rx="11" ry="13" fill="url(#pawGrad)"/>
  </g>
</svg>`;

await render(ogSvg, join(publicDir, 'og-image.png'), 1200, 630);

// ---------------------------------------------------------------------------
// splash-screen.png — 1080x1920 mobile splash
// ---------------------------------------------------------------------------
const splashSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1080 1920" width="1080" height="1920">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#6c63ff"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>
  <rect width="1080" height="1920" fill="url(#bg)"/>
  <!-- Paw ~160px, centered at 540,880 -->
  <g transform="translate(460, 800) scale(1.6)">
    <ellipse cx="50" cy="68" rx="23" ry="18" fill="white"/>
    <ellipse cx="22" cy="43" rx="11" ry="13" fill="white"/>
    <ellipse cx="40" cy="34" rx="11" ry="13" fill="white"/>
    <ellipse cx="60" cy="34" rx="11" ry="13" fill="white"/>
    <ellipse cx="78" cy="43" rx="11" ry="13" fill="white"/>
  </g>
  <text x="540" y="1016" text-anchor="middle" font-family="Nunito, system-ui, sans-serif" font-weight="900" font-size="88" fill="white">Pawlog</text>
  <text x="540" y="1076" text-anchor="middle" font-family="Nunito, system-ui, sans-serif" font-weight="400" font-size="40" fill="white" opacity="0.65">Track every moment of your pet's life.</text>
</svg>`;

await render(splashSvg, join(publicDir, 'splash-screen.png'), 1080, 1920);

console.log('\nAll PNG assets generated → public/');
