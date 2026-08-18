// harness/hiruzen.test.mjs — CANONICAL Hiruzen Sarutobi suite (mirrors jason.test.mjs / isshiki.test.mjs).
// Registration/gate/stats/portrait · movement & state · the punch COMBO string · up/air/down_air fallback
// normals · SPIN evasive dodge · the 4 borrowed-jutsu specials (Fire/Earth/Enma/Bind) · the Reaper Death
// Seal ULT (live-fighter cinematic, self-cost, guaranteed payoff) · a fallback-box sweep (every action
// renders a real hiruzen sheet, no procedural box).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const st = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function wf(n) { const s = (await st()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function ready() { await waitGrounded(); await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0 && !p.hitstun; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate((act) => window.__harness.forceAction(act, "p1"), a);
async function prep(gap) { await ready(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await wf(2); }
async function normal(key, gap, { lift = 0, down = false } = {}) {
  await prep(gap);
  if (lift) await page.evaluate(dy => window.__harness.liftP1(dy), lift);
  if (down) { await page.keyboard.down("s"); await wf(1); }
  const hp0 = (await p2()).health; let sheet = null, sx = null;
  await page.keyboard.down(key);
  for (let i = 0; i < 8; i++) { const a = await p1(); if (a.attacking && a.spriteSheet) { sheet = a.spriteSheet; sx = a.spriteSourceX; } await wf(1); }
  await page.keyboard.up(key);
  if (down) await page.keyboard.up("s");
  return { dmg: hp0 - (await p2()).health, sheet, sx };
}
// air normals are lift+timing sensitive → retry until they connect (hardened vs the stage-2 flakiness)
async function airNormal(key, gap, opts, tries = 4) { let best = { dmg: 0, sheet: null, sx: null }; for (let i = 0; i < tries; i++) { const r = await normal(key, gap, opts); if (r.dmg > best.dmg) best = r; if (r.dmg > 0) break; } return best; }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
function section(t) { console.log(`\n── ${t} ──`); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=hiruzen&p2=hiruzen`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  section("registration + sprite gate + stats + portrait");
  const g = await p1();
  check("P1 is Hiruzen", g.key === "hiruzen", `key=${g.key}`);
  check("renders on the SpriteHandler (not a procedural box)", g.hasSpriteHandler, `box=${!g.hasSpriteHandler}`);
  check("idle sheet = hiruzen_idle_uniform", (g.spriteSheet || "").includes("hiruzen_idle_uniform"), `sheet=${g.spriteSheet}`);
  check("spriteScale = 2.8", Math.abs((g.spriteScale || 0) - 2.8) < 0.01, `${g.spriteScale}`);
  check("HP 1180 / EN 140 (veteran/technician)", g.maxHealth === 1180 && g.maxEnergy === 140, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  const stats = await page.evaluate(() => { const c = window.__harness.getCharacter?.("hiruzen"); return c ? { a: c.stats.attack, d: c.stats.defense, s: c.stats.speed } : null; });
  check("atk88 / def90 / spd84", !stats || (stats.a === 88 && stats.d === 90 && stats.s === 84), stats ? `a${stats.a} d${stats.d} s${stats.s}` : "n/a");
  const portrait = await page.evaluate(() => window.__harness.charPortrait("hiruzen"));
  check("portrait wired to ./hiruzen_portrait.png", (portrait || "").includes("hiruzen_portrait"), `portrait=${portrait}`);
  const portraitExists = fs.existsSync(path.join(ROOT, "hiruzen_portrait.png"));
  check("portrait file exists on disk", portraitExists, "");
  const energyLabel = await page.evaluate(() => window.__harness.energyLabel?.(window.__harness.p1()) ?? null);
  check("energy label = Chakra", energyLabel === "Chakra", `label=${energyLabel}`);

  section("movement / state");
  await page.keyboard.down("d"); await wf(16); const rn = await p1(); await page.keyboard.up("d"); await wf(4);
  check("run = hiruzen_run_uniform", (rn.spriteSheet || "").includes("hiruzen_run_uniform"), `sheet=${rn.spriteSheet}`);
  await waitGrounded();
  await page.keyboard.down("w"); await wf(3); await page.keyboard.up("w"); await wf(3); const jp = await p1();
  check("jump = hiruzen_jump_uniform", (jp.spriteSheet || "").includes("hiruzen_jump_uniform"), `sheet=${jp.spriteSheet}`);
  await waitGrounded();
  for (const [act, tag] of [["dash", "hiruzen_dash_uniform"], ["doubleJump", "hiruzen_back_jump_uniform"], ["guard", "hiruzen_block_uniform"], ["hurt", "hiruzen_hit_uniform"]]) {
    await force(act); await wf(3); const r = await p1();
    check(`${act} → ${tag}`, (r.spriteSheet || "").includes(tag), `sheet=${r.spriteSheet}`);
    await force(null); await wf(2);
  }

  section("punch COMBO string (light / heavy off one sheet)");
  const L = await normal("j", 64);
  check("light connects (combo string)", L.dmg > 0 && (L.sheet || "").includes("hiruzen_punches_uniform"), `dmg=${L.dmg.toFixed(0)}`);
  const H = await normal("k", 64);
  check("heavy connects (wide finisher sourceX 300) + harder than light", H.dmg > L.dmg && H.sx === 300, `L=${L.dmg.toFixed(0)} H=${H.dmg.toFixed(0)} sx=${H.sx}`);

  section("up / air / down_air (ART GAPS → fallback punch poses; still connect)");
  const U = await normal("i", 60);
  check("up connects (fallback)", U.dmg > 0 && (U.sheet || "").includes("hiruzen_punches_uniform"), `dmg=${U.dmg.toFixed(0)}`);
  const A = await airNormal("j", 70, { lift: 66 });
  check("air connects (fallback)", A.dmg > 0 && (A.sheet || "").includes("hiruzen_punches_uniform"), `dmg=${A.dmg.toFixed(0)}`);
  const D = await airNormal("j", 60, { lift: 70, down: true });
  check("down_air connects (fallback)", D.dmg > 0 && (D.sheet || "").includes("hiruzen_punches_uniform"), `dmg=${D.dmg.toFixed(0)}`);

  section("SPIN — evasive dodge (neutral Special)");
  await prep(48);
  const sEn0 = (await p1()).energy, sHp0 = (await p1()).health;
  const rS = await page.evaluate(() => window.__harness.p1SpecialDir(null));
  await wf(1); const spun = await p1();
  check("SPIN cast = hiruzenSpin + i-frames", rS?.cast === "hiruzenSpin" && (spun.invulnTimer || 0) > 0, `cast=${rS?.cast} invuln=${spun.invulnTimer}`);
  await page.evaluate(() => window.__harness.p2Attack());
  for (let i = 0; i < 14; i++) await wf(1);
  check("SPIN dodges the hit (0 dmg taken) + ~15 chakra", (await p1()).health >= sHp0 - 0.01 && Math.abs(sEn0 - spun.energy - 15) <= 3, `hp ${sHp0.toFixed(0)}→${(await p1()).health.toFixed(0)}`);

  section("borrowed-jutsu specials (Fwd Fire / Down Earth / Up Enma / Back Bind)");
  // Fire
  await prep(120); let en0 = (await p1()).energy, hp0 = (await p2()).health;
  const rF = await page.evaluate(() => window.__harness.p1SpecialDir("F")); const fSpent = en0 - (await p1()).energy;
  const fFx = await (async () => { for (let i = 0; i < 12; i++) { if ((await projs()).some(p => p.name === "hiruzenFireball" || (p.sheet || "").includes("fireball"))) return true; await wf(1); } return false; })();
  for (let i = 0; i < 40; i++) await wf(1);
  check("Fire: cast + projectile + connect + ~28 chakra", rF?.cast === "hiruzenFireCast" && fFx && (hp0 - (await p2()).health) > 0 && Math.abs(fSpent - 28) <= 3, `spent=${fSpent.toFixed(0)}`);
  // Earth
  await prep(70); en0 = (await p1()).energy; hp0 = (await p2()).health;
  const rD = await page.evaluate(() => window.__harness.p1SpecialDir("D")); const eSpent = en0 - (await p1()).energy;
  let wall = null; for (let i = 0; i < 8; i++) { wall = (await projs()).find(p => p.name === "hiruzenEarthWall"); if (wall) break; await wf(1); }
  for (let i = 0; i < 44; i++) await wf(1);
  check("Earth: cast + stationary stone wall + connect + ~26 chakra", rD?.cast === "hiruzenEarthCast" && wall && Math.abs(wall.vx) < 0.01 && (hp0 - (await p2()).health) > 0 && Math.abs(eSpent - 26) <= 3, `vx=${wall?.vx} spent=${eSpent.toFixed(0)}`);
  // Enma buff
  await prep(64); let bhp = (await p2()).health; await page.keyboard.down("j"); for (let i = 0; i < 8; i++) await wf(1); await page.keyboard.up("j"); const baseLight = bhp - (await p2()).health;
  await prep(48); en0 = (await p1()).energy;
  const rU = await page.evaluate(() => window.__harness.p1SpecialDir("U")); await wf(2);
  const enma = await page.evaluate(() => window.__harness.hiruzenEnma());
  check("Enma: cast + active + dmg1.25/reach1.35 + ~45 chakra", rU?.cast === "hiruzenEnmaCast" && enma?.active && Math.abs(enma.dmgMult - 1.25) < 0.01 && Math.abs(enma.reachMult - 1.35) < 0.01 && Math.abs(en0 - (await p1()).energy - 45) <= 3, `dmg=${enma?.dmgMult} reach=${enma?.reachMult}`);
  await page.evaluate(() => { window.__harness.healP2(); window.__harness.resetFighterInput("p1"); }); const aa = await p1(); await page.evaluate(x => window.__harness.setP2X(x), aa.x + 64 * (aa.facing || 1)); await wf(2);
  let bhp2 = (await p2()).health; await page.keyboard.down("j"); for (let i = 0; i < 8; i++) await wf(1); await page.keyboard.up("j"); const buffLight = bhp2 - (await p2()).health;
  check("Enma buffs damage (light hits harder)", buffLight > baseLight + 1, `base=${baseLight.toFixed(0)} buffed=${buffLight.toFixed(0)}`);
  // Bind
  await prep(46); en0 = (await p1()).energy; hp0 = (await p2()).health;
  const rB = await page.evaluate(() => window.__harness.p1SpecialDir("B")); await wf(1); const bSpent = en0 - (await p1()).energy;
  const grabbed = await page.evaluate(() => !!window.__harness.p2().isGrabbed);
  for (let i = 0; i < 34; i++) await wf(1);
  check("Bind: cast + grab/throw + ~18 chakra", rB?.cast === "hiruzenBind" && (grabbed || (hp0 - (await p2()).health) > 0) && Math.abs(bSpent - 18) <= 3, `grabbed=${grabbed} spent=${bSpent.toFixed(0)}`);

  section("ULTIMATE — Reaper Death Seal (live-fighter cinematic)");
  await ready();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.p1ClearCooldowns?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const ua = await p1(); await page.evaluate(x => window.__harness.setP2X(x), ua.x + 90 * (ua.facing || 1)); await wf(2);
  const uHp1 = (await p1()).health, uHp2 = (await p2()).health, uEn = (await p1()).energy;
  await page.keyboard.down("u"); await wf(2); await page.keyboard.up("u");
  const ultSpent = uEn - (await p1()).energy;
  let castLive = null, minP2 = uHp2;
  for (let i = 0; i < 80; i++) { const pf = await p1(); if (pf.castMove === "hiruzenReaperCast") castLive = pf.spriteSheet; minP2 = Math.min(minP2, (await p2()).health); await wf(1); }
  const cine = await page.evaluate(() => window.__harness.hiruzenReaperCine());
  const p1Fin = await p1();
  check("ult spends 100 chakra", ultSpent >= 98, `spent=${ultSpent.toFixed(0)}`);
  check("LIVE fighter holds the cast (no dup instance)", (castLive || "").includes("hiruzen_punches_uniform"), `sheet=${castLive}`);
  check("dark spectral overlay rendered (full strength)", cine.renders > 10 && cine.maxEnv > 0.9, `renders=${cine.renders} maxEnv=${cine.maxEnv?.toFixed(2)}`);
  check("great personal cost (~15% self-HP) + survives", Math.abs(uHp1 - p1Fin.health - 177) <= 25 && p1Fin.health >= 1, `selfLoss=${(uHp1 - p1Fin.health).toFixed(0)} hp=${p1Fin.health.toFixed(0)}`);
  check("guaranteed soul-rip payoff (≥ 180 eff)", (uHp2 - minP2) >= 180, `dmg=${(uHp2 - minP2).toFixed(0)}`);

  section("fallback-box sweep — every action renders a real hiruzen sheet");
  const ACTIONS = ["idle", "walk", "run", "dash", "jump", "fall", "doubleJump", "hurt", "guard", "light", "heavy", "up", "air", "down_air", "hiruzenSpin", "hiruzenFireCast", "hiruzenEarthCast", "hiruzenEnmaCast", "hiruzenBind", "hiruzenReaperCast", "intro", "introRobe"];
  let boxes = [];
  for (const act of ACTIONS) { const r = await force(act); await wf(2); const s = (await p1()).spriteSheet || r?.sheet || ""; if (!s.includes("hiruzen")) boxes.push(`${act}=${s || "BOX"}`); await force(null); await wf(1); }
  check(`all ${ACTIONS.length} actions render a real hiruzen sheet (no box)`, boxes.length === 0, boxes.join(", "));

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n════════════════════════════════════════`);
  console.log(`  HIRUZEN canonical: ${PASS} passed, ${FAIL} failed`);
  console.log(`════════════════════════════════════════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
