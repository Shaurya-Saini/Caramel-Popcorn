// Drive the running app to verify the popcorn rain: works on the landing page,
// STILL works after navigation (the reported bug), and renders sprites.
// Requires the frontend dev server on :5173. Uses system Chrome.
import { chromium } from 'playwright';

const OUT = process.env.OUT_DIR || '.';
const BASE = 'http://localhost:5173';

function nonTransparentPixels() {
  const c = document.querySelector('canvas');
  if (!c) return -1;
  const ctx = c.getContext('2d');
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  let n = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 10) n++;
  return n;
}

async function rain(page, clicks = 40) {
  const w = page.viewportSize().width;
  for (let i = 0; i < clicks; i++) {
    const x = w * (0.3 + Math.random() * 0.4);
    const y = 80 + Math.random() * 120;
    await page.mouse.click(x, y);
    await page.waitForTimeout(25);
  }
  await page.waitForTimeout(1800); // let them fall + pile
}

const browser = await chromium.launch({ channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1200, height: 820 } });

try {
  // Landing page
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas');
  await rain(page);
  const landingPx = await page.evaluate(nonTransparentPixels);
  await page.screenshot({ path: `${OUT}/popcorn-landing.png` });
  console.log('landing non-transparent px:', landingPx, landingPx > 5000 ? 'PASS' : 'FAIL');

  // Navigate to another page (the reported bug: rain stopped working here)
  await page.goto(`${BASE}/restaurants`, { waitUntil: 'networkidle' });
  await page.waitForSelector('canvas');
  await rain(page);
  const restaurantsPx = await page.evaluate(nonTransparentPixels);
  await page.screenshot({ path: `${OUT}/popcorn-restaurants.png` });
  console.log('after-nav non-transparent px:', restaurantsPx, restaurantsPx > 5000 ? 'PASS (bug fixed)' : 'FAIL');
} finally {
  await browser.close();
}
