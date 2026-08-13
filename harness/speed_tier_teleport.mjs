// harness/speed_tier_teleport.mjs — SPEED-TIER TELEPORT-DASH verification.
// Any fighter with base speed stat >= Toji's (98), OR on the FEAT allowlist, double-tap-dashes TOWARD
// the opponent into a teleport-behind that plays the character's OWN dash sprite (the old rotating
// spin/blur "_speedBlur" overlay was removed — it obscured the sprite into a swirl).
// Proves: (1) the 4 stat qualifiers teleport + render their own dash sheet, (2) the FEAT qualifier
// (Pain) does too, (3) a below-tier dashTeleport holder (Sasuke) also teleports + shows dash art,
// (4) a below-tier non-teleport char (Batman) does NOT teleport. Captures screenshots.
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
// fire the double-tap and catch the teleport window; returns {flash, sheet, action}
async function tapAndCatch() {
  await doubleTapToward();
  let flash = 0, sheet = null, action = null;
  for (let i = 0; i < 16; i++) {
    const p = await P1();
    flash = Math.max(flash, p.teleportFlash);
    if (p.castMove === "dash" || p.action === "dash") { sheet = p.spriteSheet; action = p.action; }
    if (flash > 0 && sheet) break;
    await sleep(16);
  }
  return { flash, sheet, action };
}

// ── STAT QUALIFIERS (base speed >= 98) — teleport + render OWN dash sprite ──
console.log("SPEED-TIER QUALIFIERS (expect teleport + own dash sprite, NO swirl):");
for (const { key, uni, sheet, shot } of [
  { key: "flash",  uni: "DC",     sheet: "flash_atlas",  shot: "speedtier_flash.png" },
  { key: "minato", uni: "Naruto", sheet: "minato_dash",  shot: "speedtier_minato.png" },
  { key: "maki",   uni: "JJK",    sheet: "maki_dash",    shot: "speedtier_maki.png" },
  { key: "toji",   uni: "JJK",    sheet: "toji_walk",    shot: "speedtier_toji.png" },   // his dash action = toji_walk_uniform
]) {
  await boot(key);
  const spd = (await P1()).baseSpeed;
  const r = await tapAndCatch();
  ok(spd >= 98 && r.flash > 0, `${key} (${uni}, speed ${spd}) → teleport fires (teleportFlash=${r.flash})`);
  ok(r.sheet && r.sheet.includes(sheet), `${key} renders his OWN dash sprite on the blink (${r.sheet})`);
  if (shot) { await page.screenshot({ path: path.join(OUT, shot) }); }
}

// ── FEAT QUALIFIER (Pain, speed 90 < 98 — qualifies by the Deva-Path gravity feat, like Obito/Tobi) ──
console.log("\nFEAT QUALIFIER (below raw tier, allowlisted — expect teleport + own DASH sprite):");
await boot("pain");
const pSpd = (await P1()).baseSpeed;
const rp = await tapAndCatch();
ok(pSpd < 98 && rp.flash > 0, `pain (speed ${pSpd} < 98) → FEAT qualifier teleports (teleportFlash=${rp.flash})`);
ok(rp.sheet && rp.sheet.includes("pain_dash"), `pain's teleport plays his OWN DASH sprite, not a special effect (${rp.sheet})`);
await page.screenshot({ path: path.join(OUT, "speedtier_pain.png") });

// ── BELOW-TIER dashTeleport holder (Sasuke, 90) — teleports + shows his dash sprite ──
console.log("\nBELOW-TIER dashTeleport holder (expect teleport + own dash sprite):");
await boot("sasuke");
const sSpd = (await P1()).baseSpeed;
const rs = await tapAndCatch();
ok(sSpd < 98 && rs.flash > 0, `sasuke (speed ${sSpd}) teleports (teleportFlash=${rs.flash})`);
ok(rs.sheet && rs.sheet.includes("sasuke_dash"), `sasuke renders his OWN dash sprite on the blink (${rs.sheet})`);

// ── BELOW-TIER non-teleport char (Batman, 92) — does NOT teleport ──
await boot("batman");
const bSpd = (await P1()).baseSpeed;
const rb = await tapAndCatch();
ok(bSpd < 98 && rb.flash === 0, `batman (speed ${bSpd}, no dashTeleport) does NOT teleport (teleportFlash=${rb.flash})`);

console.log(`\n${pass} PASS / ${fail} FAIL` + (errors.length ? `\nERRORS:\n${errors.slice(0,6).join("\n")}` : "\nno page errors"));
await browser.close(); server.close();
process.exit(fail ? 1 : 0);
