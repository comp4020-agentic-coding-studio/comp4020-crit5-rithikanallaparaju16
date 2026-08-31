// Renders public/card.png -- the 1200x630 image a shared link shows -- from the
// running game, so the card can never drift from what the page actually looks
// like. Posed in play (HUD live, rover airborne off a crater rim) because a
// card of the opening screen is just the title again.
//
// Playwright is not a dependency of this repo -- the card only needs
// regenerating when the visual design changes -- so it is used ad hoc. Node
// resolves imports from the script's own directory, so run the copy that sits
// next to a playwright install:
//
//   pnpm build && npx vite preview --port 5187
//   cp scripts/make-card.mjs <dir-with-node_modules-playwright>/ && cd there
//   node make-card.mjs http://localhost:5187/ <repo>/public/card.png
//
// Frames are written alongside the target as card-1.png .. card-N.png; pick the
// best pose by eye and copy it over card.png. Choosing the frame is the part a
// script cannot do.
import { chromium } from "playwright";
import { dirname, join } from "node:path";

const [url = "http://localhost:5187/", out = "public/card.png"] = process.argv.slice(2);
const FRAMES = 8;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 2, // 2400x1260 -- crisp on retina and when feeds downscale
});
await page.goto(url, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.click('[data-testid="start"]');
await page.waitForTimeout(2100); // past the intro zoom
await page.keyboard.down("ArrowRight");
for (let i = 1; i <= FRAMES; i++) {
  await page.waitForTimeout(650);
  await page.screenshot({ path: join(dirname(out), `card-${i}.png`) });
}
await page.keyboard.up("ArrowRight");
await browser.close();
console.log(`wrote ${FRAMES} candidate frames next to ${out}`);
