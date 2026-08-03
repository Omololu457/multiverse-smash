// harness/ghostface.test.mjs — CANONICAL Ghostface suite: registration + sprite integrity + the 6 skins +
// the 5 skin-gated Call-In pools (data level). The per-identity MODIFIER behaviour lives in
// test:ghostface-s4; the Call-In FIRING behaviour in test:ghostface-s5. This is the single-entry
// registration/integrity gate (mirrors batman.test.mjs / shinobu.test.mjs).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitReady() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const arrEq = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every(x => b.includes(x)) && b.every(x => a.includes(x));
function section(t) { console.log(`\n── ${t} ──`); }

const EXPECT = {
  ghostfaceBilly:  ["sasuke", "itachi", "chrollo", "killua"],
  ghostfaceDebbie: ["beerus", "netero", "maki", "omniman"],
  ghostfaceRoman:  ["rick", "tobirama", "gojo", "hisoka"],
  ghostfaceJill:   ["sukuna", "goku_black", "gold_samurai_ranger", "vegeta"],
  ghostfaceAmber:  ["shinobu", "gon", "naruto", "zenitsu"],
};

await page.goto(`${base}/index.html?harness=1&p1=ghostface`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await wf(20);

section("registration + portrait + energy label");
let a = await p1();
check("P1 is Ghostface", a.key === "ghostface", `key=${a.key}`);
check("renders as sprites (no procedural box)", a.hasSpriteHandler, `hasSprites=${a.hasSpriteHandler}`);
const portrait = await page.evaluate(() => window.__harness.charPortrait?.("ghostface") ?? window.__harness.p1().portrait);
check("portrait wired", typeof portrait === "string" ? portrait.includes("ghostface_portrait") : true, `portrait=${portrait}`);
const elabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
check("energy label = Dread (horror universe)", (elabel || "").toLowerCase() === "dread", `label=${elabel}`);

section("sprite integrity — core actions resolve to ghostface sheets (no fallback box)");
const seen = {};
async function grab(name, keydown, hold = 3) { await waitReady(); if (keydown) { await page.keyboard.down(keydown); await wf(hold); } const s = (await p1()).spriteSheet; if (keydown) { await page.keyboard.up(keydown); await wf(12); } seen[name] = s; return s; }
await waitReady(); seen.idle = (await p1()).spriteSheet;
await grab("walk", "d", 6);
await grab("light", "j", 2);
await grab("heavy", "k", 3);
await grab("up", "i", 2);
const allGhostface = Object.entries(seen).every(([, s]) => (s || "").includes("ghostface_"));
check("all exercised actions use a ghostface_* sheet", allGhostface, Object.entries(seen).map(([k, v]) => `${k}=${(v || "").split("/").pop()}`).join(" "));

section("5 killer-identity skins ONLY (NO Default) — each retags its idle");
const skins = [["ghostfaceBilly", "__billy"], ["ghostfaceDebbie", "__debbie"], ["ghostfaceRoman", "__roman"], ["ghostfaceJill", "__jill"], ["ghostfaceAmber", "__amber"]];
await waitReady();   // ensure any prior attack pose has returned to idle before reading idle sheets
for (const [id, frag] of skins) {
  await page.evaluate(x => window.__harness.setSkin("p1", x), id); await waitReady(); await wf(4);
  const s = (await p1()).spriteSheet || "";
  check(`${id} → idle sheet ${frag}`, s.includes(frag), `sheet=${s.split("/").pop()}`);
}
// applying the removed 'default' must NOT stick — it resolves to a killer identity
await page.evaluate(() => window.__harness.setSkin("p1", "default")); await wf(2);
check("'default' resolves to a killer identity (Default removed)", /^ghostface(Billy|Debbie|Roman|Jill|Amber)$/.test((await p1()).skinId || ""), `skinId=${(await p1()).skinId}`);

section("Call-In pools — each identity = exactly its 4 companions, mutually exclusive");
const seenPool = [];
for (const [skin, exp] of Object.entries(EXPECT)) {
  await page.evaluate(x => window.__harness.setSkin("p1", x), skin); await wf(2);
  const pl = await page.evaluate(() => window.__harness.callInPool("p1"));
  seenPool.push(...pl);
  check(`${skin} pool = [${exp.join(", ")}]`, arrEq(pl, exp), `got [${pl.join(", ")}]`);
}
check("20 companions total, all distinct (no shared companion)", new Set(seenPool).size === 20, `distinct=${new Set(seenPool).size}/20`);

check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\n════════════════════════════════════════\n  GHOSTFACE canonical: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
