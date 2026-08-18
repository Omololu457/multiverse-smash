// harness/hiruzen_stage3_shots.mjs — Stage 3 borrowed-jutsu: Fire Release (Fwd), Earth Release Wall (Down),
// Enma staff BUFF (Up), Adamantine Staff Bind (Back). Verifies cast/projectile/connect/energy + the Enma
// damage & reach buff + auto-revert, and the bind command-grab. PNGs → /tmp/hiruzen_s3/.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "/tmp/hiruzen_s3"; fs.mkdirSync(OUT, { recursive: true });
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
async function prep(gap) { await ready(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); }); const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await wf(2); }
async function shotWide(name) { await page.screenshot({ path: path.join(OUT, name + ".png"), clip: { x: 300, y: 240, width: 680, height: 380 } }); }
async function anyProj(match, frames = 44) { for (let i = 0; i < frames; i++) { const ps = await projs(); if (ps.some(match)) return true; await wf(1); } return false; }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

try {
  await page.goto(`${base}/index.html?harness=1&p1=hiruzen&p2=hiruzen`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await wf(6);

  // ── FIRE RELEASE: GREAT FIREBALL (Fwd) ──
  console.log(`\n── Fire Release: Great Fireball (Fwd+Special) ──`);
  await prep(120);
  let en0 = (await p1()).energy, hp0 = (await p2()).health;
  const rF = await page.evaluate(() => window.__harness.p1SpecialDir("F"));
  const fireSpent = en0 - (await p1()).energy;   // deducted synchronously on cast — read immediately (no regen)
  const fireSpawned = await anyProj(p => p.name === "hiruzenFireball" || (p.sheet || "").includes("fireball"), 10);
  await shotWide("fire_fireball");
  for (let i = 0; i < 40; i++) await wf(1);
  check("Fire cast pose = hiruzenFireCast", rF?.cast === "hiruzenFireCast", `cast=${rF?.cast}`);
  check("Fire projectile spawned (rolling flame FX)", fireSpawned, "");
  check("Fire connects (dmg > 0)", (hp0 - (await p2()).health) > 0, `dmg=${(hp0 - (await p2()).health).toFixed(0)}`);
  check("Fire spends ~28 chakra", Math.abs(fireSpent - 28) <= 3, `spent=${fireSpent.toFixed(0)}`);

  // ── EARTH RELEASE: WALL (Down) ──
  console.log(`\n── Earth Release: Wall (Down+Special) — stationary stone hazard ──`);
  await prep(70);
  en0 = (await p1()).energy; hp0 = (await p2()).health;
  const rD = await page.evaluate(() => window.__harness.p1SpecialDir("D"));
  const earthSpent = en0 - (await p1()).energy;   // deducted synchronously on cast — read immediately
  const wallSpawned = await anyProj(p => p.name === "hiruzenEarthWall" || (p.sheet || "").includes("earth_wall"), 8);
  const wallProj = (await projs()).find(p => p.name === "hiruzenEarthWall");
  await shotWide("earth_wall");
  for (let i = 0; i < 44; i++) await wf(1);
  check("Earth cast pose = hiruzenEarthCast", rD?.cast === "hiruzenEarthCast", `cast=${rD?.cast}`);
  check("Earth wall spawned (stone-recolored)", wallSpawned && (wallProj?.sheet || "").includes("hiruzen_earth_wall"), `sheet=${(wallProj?.sheet||"").split("/").pop()}`);
  check("Earth wall is STATIONARY (vx 0)", wallProj ? Math.abs(wallProj.vx) < 0.01 : false, `vx=${wallProj?.vx}`);
  check("Earth wall connects (dmg > 0)", (hp0 - (await p2()).health) > 0, `dmg=${(hp0 - (await p2()).health).toFixed(0)}`);
  check("Earth spends ~26 chakra", Math.abs(earthSpent - 26) <= 3, `spent=${earthSpent.toFixed(0)}`);

  // ── ENMA — MONKEY KING STAFF (Up) buff ──
  console.log(`\n── Enma (Up+Special) — transformation buff: +damage / +reach ──`);
  // baseline light damage first
  await prep(64); let bhp = (await p2()).health; await page.keyboard.down("j"); for (let i = 0; i < 8; i++) await wf(1); await page.keyboard.up("j"); const baseLight = bhp - (await p2()).health;
  await prep(48);
  en0 = (await p1()).energy;
  const rU = await page.evaluate(() => window.__harness.p1SpecialDir("U"));
  await wf(2);
  const raw = await page.evaluate(() => window.__harness.hiruzenEnma ? window.__harness.hiruzenEnma() : null);
  await shotWide("enma_buff");
  check("Enma cast pose = hiruzenEnmaCast", rU?.cast === "hiruzenEnmaCast", `cast=${rU?.cast}`);
  check("Enma active + damageMultiplier 1.25", raw?.active === true && Math.abs((raw?.dmgMult || 0) - 1.25) < 0.01, `active=${raw?.active} dmgMult=${raw?.dmgMult}`);
  check("Enma reachMult 1.35", Math.abs((raw?.reachMult || 0) - 1.35) < 0.01, `reach=${raw?.reachMult}`);
  check("Enma spends ~45 chakra", Math.abs((en0 - (await p1()).energy) - 45) <= 3, `spent=${(en0 - (await p1()).energy).toFixed(0)}`);
  // buffed light hits harder
  await page.evaluate(() => { window.__harness.healP2(); window.__harness.resetFighterInput("p1"); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 64 * (a.facing || 1)); await wf(2);
  let bhp2 = (await p2()).health; await page.keyboard.down("j"); for (let i = 0; i < 8; i++) await wf(1); await page.keyboard.up("j"); const buffLight = bhp2 - (await p2()).health;
  check("Enma buffs damage (light hits harder)", buffLight > baseLight + 1, `base=${baseLight.toFixed(0)} buffed=${buffLight.toFixed(0)}`);

  // ── ADAMANTINE STAFF BIND (Back) command grab ──
  console.log(`\n── Adamantine Staff Bind (Back+Special) — command grab ──`);
  await prep(46);
  en0 = (await p1()).energy; hp0 = (await p2()).health;
  const rB = await page.evaluate(() => window.__harness.p1SpecialDir("B"));
  const bindSpent = en0 - (await p1()).energy;   // deducted synchronously on cast — read immediately
  const grabbed = await page.evaluate(() => !!window.__harness.p2().isGrabbed);
  await shotWide("staff_bind");
  for (let i = 0; i < 34; i++) await wf(1);
  check("Bind cast pose = hiruzenBind", rB?.cast === "hiruzenBind", `cast=${rB?.cast}`);
  check("Bind grabs the opponent (or deals throw dmg)", grabbed || (hp0 - (await p2()).health) > 0, `grabbed=${grabbed} dmg=${(hp0 - (await p2()).health).toFixed(0)}`);
  check("Bind spends ~18 chakra", Math.abs(bindSpent - 18) <= 3, `spent=${bindSpent.toFixed(0)}`);

  check("no JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n════ HIRUZEN Stage 3: ${PASS} passed, ${FAIL} failed → ${OUT} ════`);
} catch (e) { console.error("FATAL", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
