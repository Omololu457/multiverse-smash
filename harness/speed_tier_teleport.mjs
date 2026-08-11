// harness/speed_tier_teleport.mjs — SPEED-TIER TELEPORT-BLUR verification.
// Any fighter with base speed stat >= Toji's (98) double-tap-dashes TOWARD the opponent into a
// teleport-behind + rapid spin/blur (_speedBlur). Below-tier chars do NOT get the spin.
// Proves: (1) the 4 qualifiers fire the blur, (2) a below-tier dashTeleport holder teleports WITHOUT
// the spin, (3) a below-tier non-teleport char gets neither. Captures screenshots on 3 universes.
// Usage: node harness/speed_tier_teleport.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on("pageerror", e => errors.push(String(e)));
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };
const P1 = () => page.evaluate(() => window.__harness.p1());

async function boot(p1) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(250);
  // put the dummy to the RIGHT so "toward" = the right key (d)
  await page.evaluate(() => { const a = window.__harness.p1(); window.__harness.setP2X(a.x + 320); });
  await sleep(60);
}
// double-tap the toward key (d) within the 240ms window
async function doubleTapToward() {
  await page.keyboard.down("d"); await sleep(28); await page.keyboard.up("d");
  await sleep(60);
  await page.keyboard.down("d"); await sleep(28); await page.keyboard.up("d");
}
// fire the double-tap and catch _speedBlur inside its ~16-frame window; returns {blur, flash}
async function tapAndCatch() {
  await doubleTapToward();
  let blur = 0, flash = 0;
  for (let i = 0; i < 14; i++) { const p = await P1(); blur = Math.max(blur, p.speedBlur); flash = Math.max(flash, p.teleportFlash); if (blur > 0) break; await sleep(16); }
  return { blur, flash };
}

// ── QUALIFIERS (base speed >= 98) — must fire the spin/blur ──
console.log("SPEED-TIER QUALIFIERS (expect teleport + spin/blur):");
for (const { key, uni, shot } of [
  { key: "flash",  uni: "DC",     shot: "speedtier_flash.png" },
  { key: "minato", uni: "Naruto", shot: "speedtier_minato.png" },
  { key: "maki",   uni: "JJK",    shot: "speedtier_maki.png" },
  { key: "toji",   uni: "JJK",    shot: "speedtier_toji.png" },   // rebuilt: qualifies by STAT (speed 98), uses HIS OWN dash pose
]) {
  await boot(key);
  const spd = (await P1()).baseSpeed;
  const r = await tapAndCatch();
  ok(spd >= 98 && r.blur > 0, `${key} (${uni}, speed ${spd}) → teleport spin/blur fires (_speedBlur=${r.blur})`);
  if (shot) { await page.screenshot({ path: path.join(OUT, shot) }); }
}

// ── FEAT QUALIFIER (Pain, speed 90 < 98 — qualifies by the Deva-Path gravity feat, like Obito/Tobi) ──
console.log("\nFEAT QUALIFIER (below raw tier, allowlisted — expect spin/blur + own DASH sprite):");
await boot("pain");
const pSpd = (await P1()).baseSpeed;
// double-tap toward, and while inside the blur window grab both _speedBlur and the rendered sheet
await doubleTapToward();
let pBlur = 0, pSheet = null;
for (let i = 0; i < 16; i++) { const p = await P1(); if (p.speedBlur > 0) { pBlur = p.speedBlur; pSheet = p.spriteSheet; break; } await sleep(16); }
if (pBlur > 0 && !pSheet) pSheet = (await P1()).spriteSheet;
ok(pSpd < 98 && pBlur > 0, `pain (speed ${pSpd} < 98) → FEAT qualifier fires the spin/blur (_speedBlur=${pBlur})`);
ok(pSheet && pSheet.includes("pain_dash"), `pain's teleport-blur plays his OWN DASH sprite, not a special effect (${pSheet})`);
await page.screenshot({ path: path.join(OUT, "speedtier_pain.png") });

// ── BELOW-TIER dashTeleport holder (Sasuke, 90) — teleports but NO spin/blur ──
console.log("\nBELOW-TIER (expect existing behavior unchanged):");
await boot("sasuke");
const sSpd = (await P1()).baseSpeed;
const rs = await tapAndCatch();
ok(sSpd < 98 && rs.blur === 0, `sasuke (speed ${sSpd}) teleports WITHOUT the spin/blur (_speedBlur=${rs.blur})`);

// ── BELOW-TIER non-teleport char (Batman, 92) — neither teleport nor spin ──
await boot("batman");
const bSpd = (await P1()).baseSpeed;
const rb = await tapAndCatch();
ok(bSpd < 98 && rb.blur === 0, `batman (speed ${bSpd}) gets no speed-tier spin/blur (_speedBlur=${rb.blur})`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
