// Pre-render the popcorn .glb models to small transparent WebP sprites.
// Dev-only: uses the system Chrome (via Playwright channel) + three.js to render
// a few angles per model, so the heavy .glb files never ship to the browser.
//
// Run from frontend/:  node scripts/render-sprites.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..'); // frontend/
const OUT_DIR = path.join(ROOT, 'src', 'assets', 'popcorn');

// Source models live in frontend/models/ (NOT public/, so they never ship to the
// production bundle). They're only read here at dev time to bake the sprites.
const MODELS = [
  { name: 'popcorn1', url: '/models/popcorn1.glb' },
  { name: 'popcorn2', url: '/models/popcorn2.glb' },
];
// Small yaw/pitch offsets (radians) — variety without turning flat models edge-on.
const ANGLES = [
  { yaw: 0, pitch: 0 },
  { yaw: -0.35, pitch: 0.12 },
  { yaw: 0.35, pitch: -0.1 },
  { yaw: -0.18, pitch: -0.2 },
  { yaw: 0.2, pitch: 0.22 },
];
const RENDER_SIZE = 320; // offscreen render px
const SPRITE_SIZE = 140; // final sprite px

const MIME = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.json': 'application/json',
  '.glb': 'model/gltf-binary',
  '.wasm': 'application/wasm',
};

function serve(rootDir) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(req.url.split('?')[0]);
      const filePath = path.join(rootDir, urlPath);
      if (!filePath.startsWith(rootDir)) {
        res.writeHead(403).end();
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404).end();
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(0, () => resolve(server));
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const server = await serve(ROOT);
  const port = server.address().port;
  const base = `http://localhost:${port}`;

  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await browser.newPage({ viewport: { width: RENDER_SIZE, height: RENDER_SIZE } });
  page.on('console', (m) => m.type() === 'error' && console.log('  [page error]', m.text()));

  let count = 0;
  for (const model of MODELS) {
    const url = `${base}/scripts/sprite-harness.html?model=${encodeURIComponent(model.url)}&size=${RENDER_SIZE}`;
    await page.goto(url);
    await page.waitForFunction(() => window.__ready === true || window.__error, null, { timeout: 60000 });
    const err = await page.evaluate(() => window.__error);
    if (err) throw new Error(`Failed to load ${model.name}: ${err}`);

    for (let i = 0; i < ANGLES.length; i++) {
      const dataUrl = await page.evaluate((a) => window.renderAngle(a.yaw, a.pitch), ANGLES[i]);
      const raw = Buffer.from(dataUrl.split(',')[1], 'base64');
      const outPath = path.join(OUT_DIR, `${model.name}-${i}.webp`);
      // Colour now comes from the uniform material in the render harness, so no
      // post-tint is needed — just crop, size, and encode.
      await sharp(raw)
        .trim() // crop away transparent margins
        .resize(SPRITE_SIZE, SPRITE_SIZE, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90, alphaQuality: 100 })
        .toFile(outPath);
      const kb = (fs.statSync(outPath).size / 1024).toFixed(1);
      console.log(`  ${path.basename(outPath)}  ${kb} KB`);
      count++;
    }
    console.log(`✓ ${model.name}`);
  }

  await browser.close();
  server.close();
  console.log(`Done: ${count} sprites → src/assets/popcorn/`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
