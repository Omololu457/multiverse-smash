// harness/zenitsu_stage4_shots.mjs — STAGE 4: Double Attack special (two hardcoded partner variants).
// Fwd+Special = Tanjiro, Down+Special = Inosuke. Asserts each: spawns the correct partner summon (right
// sheet) on the opponent's FAR side, the partner rushes INWARD, the combined pincer lands damage, and
// the partner POOFS out (clonePuff) on despawn. Also asserts BOTH variants share ONE cooldown
// (doubleAtkCd). Screenshots both variants firing/connecting + the vanish.
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
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const summons = () => page.evaluate(() => window.__harness.summons());
const puffs = () => page.evaluate(() => window.__harness.clonePuffCount());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) === 0; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.clearSummons?.(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  await waitFrames(2);
}
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(name) { await page.screenshot({ path: path.join(OUT, `zenitsu_s4_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=zenitsu`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => window.__harness.boot());
await waitFrames(12);

// Run one Double Attack variant. dirKey = "d" (Fwd→Tanjiro) or "s" (Down→Inosuke).
async function runVariant(label, dirKey, summonId, sheetTag) {
  await prep(80);
  const facing = (await p1()).facing;
  const oppX0 = (await p2()).x;
  const hp0 = (await p2()).health;
  // hold direction FIRST so _specialHeldDir stamps F/D, then tap Special ("l")
  await page.keyboard.down(dirKey); await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  // capture the partner at/just after spawn
  let sawPartner = false, spawnX = null, farSide = false, partnerHit = false, sheetOK = false, poofed = false;
  let lastPartnerX = null;
  for (let i = 0; i < 60; i++) {
    const sm = (await summons()).find(s => s.id === summonId);
    if (sm) {
      sawPartner = true;
      if (spawnX === null) { spawnX = sm.x; farSide = facing > 0 ? sm.x > oppX0 : sm.x < oppX0; sheetOK = (sm.sheet || "").includes(sheetTag); }
      lastPartnerX = sm.x;
      if (sm.hasHit) partnerHit = true;
      if (i === 5) await shot(label);
    } else if (sawPartner) {
      // partner gone → the poof should have fired this frame or last
      if ((await puffs()) > 0) poofed = true;
      await shot(`${label}_vanish`);
      break;
    }
    await waitFrames(1);
  }
  await page.keyboard.up(dirKey);
  await waitFrames(4);
  const dmg = hp0 - (await p2()).health;
  const cd = (await p1()).doubleAtkCd;
  const variant = (await p1()).doubleAtkVariant;
  // Rushed inward & connected: the partner spawns 90px away and can ONLY deal damage by overlapping
  // the opponent (performSummonAttack). Zenitsu's solo lunge is ~42 eff, so a combined total >70 proves
  // the partner reached the opponent. (Poll-independent — the fast rush+hit+poof can slip between samples.)
  const rushedInward = partnerHit || dmg > 70 || (spawnX !== null && lastPartnerX !== null && Math.abs(lastPartnerX - oppX0) < Math.abs(spawnX - oppX0));
  console.log(`\n── ${label} (${dirKey === "d" ? "Fwd" : "Down"}+Special) ──`);
  check(`${label}: partner summon spawned`, sawPartner, `id=${summonId}`);
  check(`${label}: correct partner sheet`, sheetOK, `tag=${sheetTag}`);
  check(`${label}: spawns on opponent's FAR side`, farSide, `spawnX=${spawnX?.toFixed(0)} oppX=${oppX0.toFixed(0)} facing=${facing}`);
  check(`${label}: partner rushes INWARD (spawn→hit closes on opp)`, rushedInward, `spawnΔ=${spawnX!==null?Math.abs(spawnX-oppX0).toFixed(0):"?"} endΔ=${lastPartnerX!==null?Math.abs(lastPartnerX-oppX0).toFixed(0):"?"}`);
  check(`${label}: combined pincer deals damage`, dmg > 60, `−${dmg.toFixed(0)}`);
  check(`${label}: partner POOFS on despawn (vanish FX)`, poofed, "");
  check(`${label}: sets shared cooldown`, cd > 0 && variant === (dirKey === "d" ? "tanjiro" : "inosuke"), `doubleAtkCd=${cd} variant=${variant}`);
  return cd;
}

// TANJIRO (Forward)
await runVariant("tanjiro", "d", "zenitsuTanjiro", "zenitsu_tanjiro_partner_uniform");

// SHARED COOLDOWN: right after Tanjiro, the OTHER variant (Inosuke) must ALSO be locked out.
console.log("\n── shared cooldown (one gate for both variants) ──");
await waitGrounded();
const cdNow = (await p1()).doubleAtkCd;
await page.keyboard.down("s"); await waitFrames(2); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("s");
await waitFrames(4);
const inosukeBlocked = (await summons()).every(s => s.id !== "zenitsuInosuke");
check("Inosuke locked out while Tanjiro cooldown active (SHARED)", cdNow > 0 && inosukeBlocked, `doubleAtkCd=${cdNow}`);

// wait out the cooldown, then INOSUKE (Down)
await page.waitForFunction(() => (window.__harness.p1().doubleAtkCd || 0) === 0, null, { timeout: 6000, polling: 16 }).catch(() => {});
await runVariant("inosuke", "s", "zenitsuInosuke", "zenitsu_inosuke_partner_uniform");

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/zenitsu_s4_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
