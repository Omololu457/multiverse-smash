// harness/ghostface_stage2_shots.mjs — STAGE 2 visual evidence for Ghostface's 5 killer-identity skins.
// For each identity: applies the skin in a live match, asserts every idle sheet resolves to the
// recolored __<tag> sheet (not the default), confirms the recolored files exist, and screenshots.
// Also verifies the skin-select screen lists all 6 entries (Default + 5) with recolored portraits.
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
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `ghostface_s2_${name}.png`) }); }

const IDS = [
  ["ghostfaceBilly",  "billy"],
  ["ghostfaceDebbie", "debbie"],
  ["ghostfaceRoman",  "roman"],
  ["ghostfaceJill",   "jill"],
  ["ghostfaceAmber",  "amber"],
];

// ── 1. Skin-select screen lists all 6 entries with recolored portraits ──
await page.goto(`${base}/index.html?harness=1&p1=ghostface`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
console.log("\n── 1. Skin-select screen ──");
const sel = await page.evaluate(() => window.__harness.showSkinSelect("ghostface", "p1", 0));
await waitFrames(2); await shot("select");
check("skin-select lists Default + 5 identities", sel.skins.length === 6, `count=${sel.skins.length} [${sel.skins.map(s => s.name).join(", ")}]`);
for (const [id, tag] of IDS) {
  const e = sel.skins.find(s => s.id === id);
  check(`select has ${id} → recolored portrait`, !!e && (e.portrait || "").includes(`__${tag}.png`), `portrait=${e?.portrait}`);
}

// ── 2. Each identity renders its recolored robe sheets in a live match ──
console.log("\n── 2. In-match render per identity ──");
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
for (const [id, tag] of IDS) {
  const applied = await page.evaluate(i => window.__harness.setSkin("p1", i), id);
  await waitFrames(4);
  const a = await p1();
  const okId = applied === id;
  const okSheet = (a.spriteSheet || "").includes(`ghostface_idle_uniform__${tag}.png`);
  const fileExists = fs.existsSync(path.join(ROOT, `ghostface_idle_uniform__${tag}.png`));
  check(`${id}: applied + idle → __${tag} sheet + file on disk`, okId && okSheet && fileExists, `skinId=${applied} sheet=${a.spriteSheet} file=${fileExists}`);
  await shot(tag);
}

// ── 3. Revert to default cleanly ──
console.log("\n── 3. Revert to default ──");
const rev = await page.evaluate(() => window.__harness.setSkin("p1", "default"));
await waitFrames(4);
const a = await p1();
check("default: idle → base (untagged) sheet", rev === "default" && (a.spriteSheet || "").includes("ghostface_idle_uniform.png") && !a.spriteSheet.includes("__"), `sheet=${a.spriteSheet}`);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/ghostface_s2_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
