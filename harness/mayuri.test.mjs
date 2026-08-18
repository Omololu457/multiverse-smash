// harness/mayuri.test.mjs — CANONICAL Mayuri Kurotsuchi (Bleach) suite (mirrors onoki.test.mjs).
// Single-entry registration + integrity + FULL-KIT gate across Stages 1–5: sprite gate / stats / portrait /
// "Reiatsu" label; movement/state (+ dash-trail & shockwave FX, seated idle, crouch); the 5 normals + the
// Fwd+Heavy 2-stage command chain; the 5 specials (Finger-Gun Blast projectile / Energy Slash projectile /
// Rising Cut launcher / Poison Cloud + DoT / Lab Coat Open buff); the Bankai construct freeze-cinematic
// ultimate (live fighter, no dup); the NEMU assist (attack + uppercut + FX); a STATIC sheet+portrait sweep
// (incl. the projectile / construct / Nemu / FX sheets referenced outside animationData); and a RUNTIME
// fallback-box sweep proving every action resolves a real mayuri_ sheet (never the 128² procedural box).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import characters from "../characters.js";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

// ── STATIC SHEET SWEEP (no browser) — every declared sheet + portrait + extra art is a real file. ──
section("STATIC — every animationData sheet + portrait + projectile/construct/Nemu/FX art exists on disk");
const mayuri = characters.mayuri;
const ad = mayuri.animationData;
const sheets = [...new Set(Object.values(ad).map(e => e.sheet).filter(Boolean))];
// Referenced in abilities.js / game.js (NOT animationData) — assert explicitly too.
const extra = [
  "./mayuri_blast_proj_uniform.png", "./mayuri_slash_proj_uniform.png", "./mayuri_poison_cloud_uniform.png",
  "./mayuri_bankai_construct_uniform.png",
  "./mayuri_nemu_attack_uniform.png", "./mayuri_nemu_attack_fx_uniform.png",
  "./mayuri_nemu_uppercut_uniform.png", "./mayuri_nemu_uppercut_fx_uniform.png",
  "./mayuri_upslash_fx_uniform.png", "./mayuri_airslash_fx_uniform.png",
  "./mayuri_dashtrail_a_uniform.png", "./mayuri_shockwave_a_uniform.png",
];
const missing = [];
for (const s of [...sheets, ...extra, mayuri.portrait]) {
  const p = path.join(ROOT, s.replace(/^\.\//, ""));
  if (!(fs.existsSync(p) && fs.statSync(p).size > 128)) missing.push(s);
}
check(`${sheets.length} anim sheets + ${extra.length} proj/construct/Nemu/FX + portrait all present & non-empty`, missing.length === 0, missing.length ? `MISSING: ${missing.join(", ")}` : "");
check("portrait wired (mayuri_portrait.png)", (mayuri.portrait || "").includes("mayuri_portrait"), `portrait=${mayuri.portrait}`);
check("stats HP1080/EN200/atk82/def78/spd84 + energyType reiatsu + scale1.15",
  mayuri.stats.maxHealth === 1080 && mayuri.stats.maxEnergy === 200 && mayuri.stats.attack === 82 && mayuri.stats.defense === 78 &&
  mayuri.stats.speed === 84 && mayuri.traits.energyType === "reiatsu" && Math.abs(mayuri.spriteScale - 1.15) < 0.01,
  JSON.stringify(mayuri.stats));

const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const fx = () => page.evaluate(() => window.__harness.mayuriFx("p1"));
const projs = () => page.evaluate(() => window.__harness.projectiles());
const summons = () => page.evaluate(() => window.__harness.summons());
async function wf(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function grounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
const specialDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function prep(gap) {
  await grounded();
  await page.evaluate(() => window.__harness.clearSummons?.());
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.40)); await wf(1);
  const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap * (a.facing || 1)); await wf(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=mayuri`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  // Preload + DECODE the overlay/projectile/Nemu sheets so their FIRST draw isn't skipped while the image
  // is still decoding (the attack-FX / dash-trail / summon sheets load lazily on first use).
  await page.evaluate(async () => {
    const files = ["mayuri_upslash_fx_uniform.png", "mayuri_airslash_fx_uniform.png", "mayuri_dashtrail_a_uniform.png",
      "mayuri_shockwave_a_uniform.png", "mayuri_nemu_attack_uniform.png", "mayuri_nemu_uppercut_uniform.png",
      "mayuri_blast_proj_uniform.png", "mayuri_slash_proj_uniform.png", "mayuri_poison_cloud_uniform.png", "mayuri_bankai_construct_uniform.png"];
    await Promise.all(files.map(f => { const i = new Image(); i.src = "./" + f; return i.decode().catch(() => {}); }));
  });
  await wf(6);

  section("registration + sprite gate + stats + portrait + label");
  const g = await p1();
  check("P1 is Mayuri", g.key === "mayuri", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, "");
  check("idle sheet = mayuri_idle_uniform", (g.spriteSheet || "").includes("mayuri_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 1.15", Math.abs((g.spriteScale || 0) - 1.15) < 0.01, `${g.spriteScale}`);
  check("HP 1080 / EN 200", g.maxHealth === 1080 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const portrait = await page.evaluate(() => window.__harness.charPortrait("mayuri"));
  check("portrait wired to ./mayuri_portrait.png", (portrait || "").includes("mayuri_portrait"), `portrait=${portrait}`);
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel("p1"));
  check("energy label = Reiatsu", energyLabel === "Reiatsu", `label=${energyLabel}`);

  section("movement / state (walk / seated idle / crouch / knockdown) + dash-trail & shockwave FX");
  await page.keyboard.down("d"); await wf(16); const rn = await p1(); await page.keyboard.up("d"); await wf(4);
  check("walk = mayuri_walk_uniform", (rn.spriteSheet || "").includes("mayuri_walk_uniform"), `sheet=${rn.spriteSheet}`);
  await force("idleSeated"); await wf(4); const seat = await p1(); await force(null);
  check("seated idle variant = mayuri_idle_seated_uniform", (seat.spriteSheet || "").includes("mayuri_idle_seated_uniform"), `sheet=${seat.spriteSheet}`);
  await grounded(); await page.keyboard.down("s"); await wf(5); const cr = await p1(); const crfx = await fx(); await page.keyboard.up("s"); await wf(2);
  check("crouch (hold Down) = mayuri_crouch_uniform + _crouching flag", (cr.spriteSheet || "").includes("mayuri_crouch_uniform") && crfx?.crouching === true, `sheet=${cr.spriteSheet} crouch=${crfx?.crouching}`);
  await grounded();
  await page.evaluate(() => window.__harness.mayuriDash(1, "p1"));
  let sawTrail = false, sawShock = false; for (let i = 0; i < 20; i++) { const s = await fx(); if (s?.trail) sawTrail = true; if (s?.shock) sawShock = true; await wf(1); }
  check("dash-trail ghost + dash-start shockwave FX overlays render", sawTrail && sawShock, `trail=${sawTrail} shock=${sawShock}`);
  await grounded();

  section("5 normals connect (+ up/air green-slash FX) + Fwd+Heavy 2-stage command chain");
  for (const [name, key] of [["light", "j"], ["heavy", "k"]]) {
    let dealt = 0;
    for (let attempt = 0; attempt < 3 && dealt <= 0; attempt++) {
      await prep(48); const h0 = (await p2()).health;
      await page.keyboard.down(key); await wf(2); await page.keyboard.up(key); await wf(12);
      dealt = h0 - (await p2()).health;
    }
    check(`${name} connects (${dealt.toFixed(0)} dmg)`, dealt > 0, `dmg=${dealt}`);
  }
  // up-attack connects (retry — the vertical launcher hits a narrow band).
  { let dealt = 0; for (let attempt = 0; attempt < 4 && dealt <= 0; attempt++) { await prep(38); const h0 = (await p2()).health; await page.keyboard.down("i"); await wf(2); await page.keyboard.up("i"); await wf(12); dealt = h0 - (await p2()).health; }
    check(`up-attack launcher connects (${dealt.toFixed(0)} dmg)`, dealt > 0, `dmg=${dealt}`);
  }
  // up-attack + air green-slash FX overlays render (forced action → deterministic, no live-hit timing).
  { await force("up"); await wf(3); const upFx = (await fx())?.atkFx; await force(null); await wf(1);
    await force("air"); await wf(3); const airFx = (await fx())?.atkFx; await force(null); await wf(1);
    check("up + air green-slash FX overlays render (row_26 / row_32)", upFx === "up" && airFx === "air", `up=${upFx} air=${airFx}`);
  }
  // Fwd+Heavy command chain: cmd1 opens + chains to cmd2 (rekkaNext), and connects.
  let cmd1 = "", cmdRekka = "", cmdDmg = 0;
  for (let attempt = 0; attempt < 4 && !(cmd1 === "mayuriCmd1" && cmdDmg > 0); attempt++) {
    await prep(46); const h0 = (await p2()).health;
    const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
    await page.keyboard.down(fwd); await wf(2);
    let mv = await p1(); for (let r = 0; r < 6 && mv.currentMove !== "mayuriCmd1"; r++) { await page.keyboard.down("k"); await wf(1); await page.keyboard.up("k"); await wf(1); mv = await p1(); }
    if (mv.currentMove === "mayuriCmd1") { cmd1 = "mayuriCmd1"; cmdRekka = mv.rekkaNext || cmdRekka; }
    await wf(14); await page.keyboard.up(fwd);
    cmdDmg += Math.max(0, h0 - (await p2()).health);
  }
  check("command chain: mayuriCmd1 opens + chains to mayuriCmd2 (rekkaNext) + connects", cmd1 === "mayuriCmd1" && cmdRekka === "mayuriCmd2" && cmdDmg > 0, `move=${cmd1} rekka=${cmdRekka} dmg=${cmdDmg}`);

  section("5 specials (Finger-Gun Blast / Energy Slash / Rising Cut / Poison Cloud+DoT / Lab Coat Open)");
  // Neutral = Finger-Gun Blast projectile connects at range.
  { await prep(74); const h0 = (await p2()).health; await specialDir(null);
    let hit = false; for (let i = 0; i < 40 && !hit; i++) { if ((await p2()).health < h0) hit = true; await wf(1); }
    check("neutral Finger-Gun Blast → real ranged projectile connects", hit, `dmg=${(h0 - (await p2()).health).toFixed(0)}`);
  }
  // Fwd = Energy Slash projectile connects.
  { await prep(80); const h0 = (await p2()).health; await specialDir("F");
    let hit = false; for (let i = 0; i < 40 && !hit; i++) { if ((await p2()).health < h0) hit = true; await wf(1); }
    check("Fwd Energy Slash → green-crescent projectile connects", hit, `dmg=${(h0 - (await p2()).health).toFixed(0)}`);
  }
  // Up = Rising Cut launcher connects + launches.
  { await prep(46); const h0 = (await p2()).health; const res = await specialDir("U");
    let hit = false, launched = false; for (let i = 0; i < 22; i++) { const b = await p2(); if (b.health < h0) hit = true; if (b.isLaunched || (b.vy || 0) < -3) launched = true; await wf(1); }
    check("Up Rising Cut → launcher connects + launches", res?.move === "mayuriRising" && hit && launched, `move=${res?.move} launched=${launched}`);
    await grounded();
  }
  // Down = Poison Cloud projectile connects + stamps a DoT that keeps ticking.
  { await prep(52); const h0 = (await p2()).health; await specialDir("D");
    let hit = false, dot = false; for (let i = 0; i < 44; i++) { if ((await p2()).health < h0) hit = true; const s = await fx(); if (s?.dot) dot = true; await wf(1); }
    const hMid = (await p2()).health; await wf(38); const hLate = (await p2()).health;
    check("Down Poison Cloud → connects + poison DoT ticks (attrition)", hit && dot && hLate < hMid, `hit=${hit} dot=${dot} tick=${hMid}→${hLate}`);
  }
  // Back = Lab Coat Open buff → damageMultiplier 1.3.
  { await prep(60); const res = await specialDir("B"); await wf(3); const c = await fx();
    check("Back Lab Coat Open → buff active (coatActive + dmgMult 1.3)", (res?.cast === "mayuriCoatOpen" || c?.castMove === "mayuriCoatOpen") && c?.coatActive === true && Math.abs((c?.dmgMult || 1) - 1.3) < 0.02, `coat=${c?.coatActive} mult=${c?.dmgMult}`);
    await wf(4);
  }

  section("Bankai construct ULTIMATE (live-fighter freeze cinematic, no dup)");
  { await prep(120); const h0 = (await p2()).health;
    const en0 = (await p1()).energy;
    const r = await page.evaluate(() => window.__harness.p1Ultimate());
    const en1 = (await p1()).energy;
    check("Bankai fires on the live fighter (cast + spends 100)", r?.cast === true && r?.castMove === "mayuriBankaiCast" && (en0 - en1) >= 95, `cast=${r?.cast} spent=${(en0 - en1).toFixed(0)}`);
    let castSheet = false, box = false, timerSeen = false;
    for (let i = 0; i < 40 && !castSheet; i++) { const a = await p1(); const c = await fx(); const sh = a.spriteSheet || ""; if (sh.includes("mayuri_bankai_cast_uniform")) castSheet = true; if (!sh.includes("mayuri_")) box = true; if ((c?.bankaiTimer || 0) > 0) timerSeen = true; await wf(1); }
    check("live fighter holds the cast pose (no box / no dup) + cinematic runs", castSheet && !box && timerSeen, `cast=${castSheet} box=${box} timer=${timerSeen}`);
    let landed = false; for (let i = 0; i < 60 && !landed; i++) { if ((await p2()).health < h0) landed = true; await wf(1); }
    check("guaranteed construct-crush payoff is ULTIMATE-tier (≥120)", landed && (h0 - (await p2()).health) >= 120, `dmg=${(h0 - (await p2()).health).toFixed(0)}`);
    await page.waitForFunction(() => (window.__harness.mayuriFx("p1")?.bankaiTimer || 0) === 0, null, { timeout: 8000, polling: 16 }).catch(() => {});
    await wf(20); await grounded(); const gEnd = await p1();
    check("caster recovers after the ult (not stuck, real sheet)", gEnd.attacking === false && (gEnd.spriteSheet || "").includes("mayuri_"), `attacking=${gEnd.attacking} sheet=${gEnd.spriteSheet}`);
  }

  section("NEMU assist (Charge+Down attack / Charge+Up uppercut launcher) + FX overlays");
  { await prep(88); const h0 = (await p2()).health;
    const r = await page.evaluate(() => window.__harness.mayuriNemu("attack"));
    await wf(2); const sm = await summons(); const pr = await projs();
    const spawned = sm.some(s => (s.sheet || "").includes("mayuri_nemu_attack_uniform"));
    const fxSpawned = pr.some(p => p.name === "nemuFx_attack" && (p.sheet || "").includes("mayuri_nemu_attack_fx"));
    let hit = false; for (let i = 0; i < 22 && !hit; i++) { if ((await p2()).health < h0) hit = true; await wf(1); }
    check("Nemu ATTACK: summon (row_64) + FX (row_65) spawn + connect", r?.last === "attack" && spawned && fxSpawned && hit, `spawn=${spawned} fx=${fxSpawned} hit=${hit}`);
    await grounded(); await wf(4);
  }
  { await prep(80); const h0 = (await p2()).health;
    const r = await page.evaluate(() => window.__harness.mayuriNemu("uppercut"));
    await wf(2); const sm = await summons(); const pr = await projs();
    const spawned = sm.some(s => (s.sheet || "").includes("mayuri_nemu_uppercut_uniform"));
    const fxSpawned = pr.some(p => p.name === "nemuFx_uppercut" && (p.sheet || "").includes("mayuri_nemu_uppercut_fx"));
    let hit = false, launched = false; for (let i = 0; i < 22; i++) { const b = await p2(); if (b.health < h0) hit = true; if (b.isLaunched || (b.vy || 0) < -3) launched = true; await wf(1); }
    check("Nemu UPPERCUT: summon (row_66) + FX (row_67) spawn + connect + launch", r?.last === "uppercut" && spawned && fxSpawned && hit && launched, `spawn=${spawned} fx=${fxSpawned} hit=${hit} launch=${launched}`);
    await grounded(); await wf(4);
  }

  section("RUNTIME fallback-box sweep — every action resolves a real mayuri_ sheet (no 128² box)");
  const ACTIONS = ["idle", "idleSeated", "walk", "run", "dash", "jump", "fall", "guard", "crouch", "hurt", "knockdown", "getup",
    "light", "heavy", "up", "air", "down_air", "mayuriCmd1", "mayuriCmd2",
    "mayuriBlast", "mayuriSlash", "mayuriRising", "mayuriPoison", "mayuriCoatOpen", "mayuriBankaiCast"];
  const boxHit = [];
  for (const act of ACTIONS) { await force(act); await wf(2); const r = await p1(); if (!(r.spriteSheet || "").includes("mayuri_")) boxHit.push(`${act}:${(r.spriteSheet || "null")}`); await force(null); await wf(1); }
  check(`all ${ACTIONS.length} actions resolve a real mayuri_ sheet (no procedural box)`, boxHit.length === 0, boxHit.join(" | "));

  check("no JS page errors across the whole suite", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} MAYURI CANONICAL: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
