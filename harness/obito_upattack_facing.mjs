// harness/obito_upattack_facing.mjs — reproduce/verify Obito's UP-ATTACK (launcher) connecting
// TOWARD the opponent with the player facing BOTH directions (right-facing AND left-facing).
// Bug report: up-attack hitbox flipped/mirrored → pushes the opponent AWAY instead of connecting.
// We place the dummy in FRONT of Obito for each facing and assert: connects (damage), launches UP
// (vy<0), and the small horizontal nudge is AWAY from Obito (launcher push), not a whiff.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
// Ignore the benign save-server ping (/api/health) that 404s under the static harness server.
const benign = s => /api\/health/.test(s) || /Failed to load resource.*404/.test(s);
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e))); page.on("console", m => { if (m.type() === "error" && !benign(m.text())) jsErrors.push(m.text()); });
page.on("response", r => { if (r.status() === 404 && !r.url().includes("/api/health")) jsErrors.push("404 " + r.url()); });
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
const has = (mv, needle) => (mv?.spriteSheet || "").includes(needle);
async function waitPose(needle, maxF = 22) { let best = await p1(); for (let i = 0; i < maxF; i++) { const a = await p1(); if (has(a, needle)) return a; best = a; await waitFrames(1); } return best; }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

await page.goto(`${base}/index.html?harness=1&p1=obito&p2=madara`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

// Drive one up-attack with the dummy positioned relative to Obito by `dir`
// (dir=+1 → dummy to the RIGHT, Obito faces right; dir=-1 → dummy to the LEFT, Obito faces left).
async function upAttack(dir, gap = 46) {
  // Reset both fighters clean.
  await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking && !p.currentMove && (p.attackCooldown || 0) <= 0; }, null, { timeout: 5000, polling: 16 }).catch(() => {});
  // Anchor Obito near center; place dummy in FRONT per dir. Give the engine a few frames to auto-face.
  await page.evaluate((d) => { window.__harness.setP1X(560); }, dir);
  await waitFrames(1);
  const ax = (await p1()).x;
  await page.evaluate((x) => window.__harness.setP2X(x), dir === 1 ? ax + gap : ax - gap);
  await waitFrames(4);
  const pre1 = await p1(); const pre2 = await p2();
  const hp0 = pre2.health;
  // "i" is the dedicated UP-ATTACK button in this harness mapping (see obito_stage2_shots).
  await page.keyboard.down("i");
  const mv = await waitPose("obito_up_uniform", 20);
  // Screenshot on the ACTIVE frame (the up pose is showing) so the training red hitbox is rendered
  // — this is the frame that proves which side of Obito the hitbox sits on for this facing.
  await page.screenshot({ path: path.join(OUT, `obito_upattack_${dir === 1 ? "right" : "left"}.png`) });
  // Then confirm the connection (dummy launched) over the active window.
  let post2 = pre2, connected = false;
  for (let i = 0; i < 20; i++) { post2 = await p2(); if (post2.health < hp0) { connected = true; break; } await waitFrames(1); }
  const xAtLaunch = post2.x;
  await page.keyboard.up("i");
  // Watch the launched opponent RISE for ~14 frames: with the fix they pop straight up and stay in
  // front (small horizontal drift); the old facing-shove carried them steadily away. Capture mid-rise.
  let maxDrift = 0;
  for (let i = 0; i < 14; i++) { await waitFrames(1); const now = await p2(); maxDrift = Math.max(maxDrift, Math.abs((now.x ?? xAtLaunch) - xAtLaunch)); if (i === 6) await page.screenshot({ path: path.join(OUT, `obito_upattack_${dir === 1 ? "right" : "left"}_juggle.png`) }); }
  await waitFrames(6);
  const dmg = hp0 - (await p2()).health;
  return { facing: pre1.facing, ax: pre1.x, tx: pre2.x, sheet: (mv.spriteSheet||"").split("/").pop(), dmg, vy: post2.vy, vx: post2.vx, connected, maxDrift };
}

section("Obito UP-ATTACK — RIGHT-facing (dummy to the right)");
const R = await upAttack(1);
console.log(`   facing=${R.facing} obito.x=${Math.round(R.ax)} dummy.x=${Math.round(R.tx)} sheet=${R.sheet} dmg=${R.dmg} vy=${R.vy} vx=${R.vx}`);
check("right-facing: up-attack CONNECTS toward the in-front opponent", R.connected && R.dmg > 0, `dmg=${R.dmg}`);
check("right-facing: opponent LAUNCHED upward (vy<0), not knocked away/whiffed", R.vy < 0, `vy=${R.vy}`);
// The fix: launcher pops STRAIGHT UP — no horizontal shove AWAY (facing direction) out of juggle range.
check("right-facing: launcher does NOT shove the opponent away (vx≈0, pops straight up)", Math.abs(R.vx) < 1, `vx=${R.vx}`);
check("right-facing: launched opponent STAYS in front over the juggle (little horizontal drift)", R.maxDrift < 20, `maxDrift=${Math.round(R.maxDrift)}px`);

section("Obito UP-ATTACK — LEFT-facing (dummy to the left)");
const L = await upAttack(-1);
console.log(`   facing=${L.facing} obito.x=${Math.round(L.ax)} dummy.x=${Math.round(L.tx)} sheet=${L.sheet} dmg=${L.dmg} vy=${L.vy} vx=${L.vx}`);
check("left-facing: Obito actually faces LEFT (facing=-1)", L.facing === -1, `facing=${L.facing}`);
check("left-facing: up-attack CONNECTS toward the in-front opponent", L.connected && L.dmg > 0, `dmg=${L.dmg}`);
check("left-facing: opponent LAUNCHED upward (vy<0), not knocked away/whiffed", L.vy < 0, `vy=${L.vy}`);
check("left-facing: launcher does NOT shove the opponent away (vx≈0, pops straight up)", Math.abs(L.vx) < 1, `vx=${L.vx}`);
check("left-facing: launched opponent STAYS in front over the juggle (little horizontal drift)", L.maxDrift < 20, `maxDrift=${Math.round(L.maxDrift)}px`);

check("no JS/page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots: harness/shots/obito_upattack_{right,left}.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
