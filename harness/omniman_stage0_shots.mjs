// harness/omniman_stage0_shots.mjs — STAGE 0 visual evidence for Omni-Man.
// Proves: (1) the "Invincible" universe exists and lists Omni-Man on the REAL character-select
// screen; (2) booting as p1=omniman renders the real omni_man_idle sprite (not a procedural box);
// (3) his HUD energy bar resolves to the "Smart Atoms" label.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `omniman_s0_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=omniman`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

// ── (1) Universe grouping: the REAL character-select screen for "invincible" lists Omni-Man ──
const sel = await page.evaluate(() => window.__harness.showCharSelect("invincible", "training"));
check("Invincible universe select screen opens", sel.universe === "invincible", `universe=${sel.universe}`);
check("roster lists omniman", sel.roster.includes("omniman"), `roster=[${sel.roster.join(", ")}]`);
await page.evaluate(() => { /* let it paint */ });
await page.waitForTimeout(200);
await shot("select_invincible");

// ── (2) Boot a match as Omni-Man (?p1=omniman) and confirm the real idle sprite renders (not a box) ──
await page.evaluate(() => window.__harness.boot());
await page.waitForFunction(() => window.__harness.p1()?.key === "omniman", null, { timeout: 8000 }).catch(() => {});
await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await page.waitForTimeout(120);
const a = await page.evaluate(() => window.__harness.p1());
check("P1 is Omni-Man", a.key === "omniman", `key=${a.key}`);
check("renders as sprites (not box)", a.hasSpriteHandler === true, `hasSpriteHandler=${a.hasSpriteHandler}`);
check("idle → omni_man_idle", (a.spriteSheet || "").includes("omni_man_idle"), `sheet=${a.spriteSheet}`);

// ── (3) Energy label resolves to "Smart Atoms" ──
const label = await page.evaluate(() => window.__harness.energyLabel("p1"));
check('energy label is "Smart Atoms"', label === "Smart Atoms", `label=${label}`);
await shot("idle_ingame");

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/omniman_s0_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
