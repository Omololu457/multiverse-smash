import { chromium } from "playwright";
import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const b = await chromium.launch({ headless: true });
const page = await b.newPage({ viewport: { width: 1120, height: 900 } });
await page.goto("file://" + path.join(ROOT, "BETA1_GAMEPLAY.html"), { waitUntil: "networkidle" });
// PDF
await page.pdf({ path: path.join(ROOT, "BETA1_GAMEPLAY.pdf"), format: "A4", printBackground: true, margin: { top:"12mm", bottom:"12mm", left:"10mm", right:"10mm" } });
// verification screenshots
await page.screenshot({ path: path.join(ROOT, "harness", "theme_shots", "beta_cover.png") });
await page.evaluate(() => document.querySelector("#c-goku")?.scrollIntoView());
await new Promise(r=>setTimeout(r,300));
await page.screenshot({ path: path.join(ROOT, "harness", "theme_shots", "beta_goku_card.png") });
await page.evaluate(() => document.querySelector("#c-goku_black")?.scrollIntoView());
await new Promise(r=>setTimeout(r,300));
await page.screenshot({ path: path.join(ROOT, "harness", "theme_shots", "beta_gokublack_card.png") });
console.log("wrote BETA1_GAMEPLAY.pdf + shots");
await b.close();
