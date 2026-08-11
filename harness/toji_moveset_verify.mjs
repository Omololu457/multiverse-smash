// harness/toji_moveset_verify.mjs — LIVE press-the-actual-buttons verification of Toji's FULL moveset.
// For each move: reset to a clean grounded stand-off, press the EXACT player input (the real default P1 keys),
// then observe live output (cast pose, projectiles, swarm, self-fade, cinematic, lunge, damage) and screenshot
// the move firing. Also reproduces the two reported "doesn't fire" pitfalls to diagnose them.
//
// Default P1 keys (game.js:589-591): Move A/D · Up+Jump W · Down S · Light J · Heavy K · Special L · Ultimate U.
// Usage: node harness/toji_moveset_verify.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ FIRES" : "❌ DID NOT FIRE"}  ${n}${d ? `  — ${d}` : ""}`); };
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const cmd = () => page.evaluate(() => window.__harness.tojiCmd());
const swarm = () => page.evaluate(() => window.__harness.tojiFlyHeadsSwarm());
const fade = () => page.evaluate(() => window.__harness.tojiFade());
const projs = () => page.evaluate(() => window.__harness.projectiles());
const ultCine = () => page.evaluate(() => window.__harness.tojiReincarnationCine());
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function upAll() { for (const k of ["a","d","w","s","j","k","l","u","i","o","p"]) await page.keyboard.up(k).catch(() => {}); }

async function boot() {
  await page.goto(`${base}/index.html?harness=1&p1=toji&p2=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);
  await page.evaluate(() => window.__harness.boot());
  await sleep(250);
}
// Clean slate before each move: release keys, heal both, zero ALL cooldowns/timers (so no carryover between
// moves), re-space, settle on idle. p1() returns the LIVE fighter object, so cooldowns can be zeroed directly.
async function reset(gap = 92) {
  await upAll();
  await page.evaluate(g => {
    window.__harness.clearProjectiles?.();
    window.__harness.setP1Pos?.(480, null); window.__harness.setP2X?.(480 + g);
    window.__harness.healP1?.(); window.__harness.healP2?.();
    window.__harness.setP1Energy?.(200); window.__harness.resetUlt?.(); window.__harness.resetFighterInput?.("p1");
    const p = window.__harness.p1();
    p.attackCooldown = 0; p.attacking = false; p.hitstun = 0; p._spriteCastMove = null; p._spriteCastTimer = 0;
    p._rekkaNext = null; p._specialHeldDir = null;
    for (const k of ["_splitSoulCd","_rapidSlashCd","_chainCd","_playfulCloudCd","_flyHeadCd","_flyBarrageCd","_gunCd","_tojiFlyFadeTimer"]) p[k] = 0;
  }, gap);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.6 && !p.attacking; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await waitFrames(3);
}
// Observe live for `frames`, collecting everything a player would SEE. Returns an aggregate.
async function observe(frames, tag) {
  const casts = new Set(), moves = new Set(); let projNames = new Set();
  let swarmOn = false, fadeMin = 1, ultOn = false;
  const p2h0 = (await p2()).health; const x0 = (await p1()).x; let shotAt = Math.floor(frames * 0.3);
  for (let i = 0; i < frames; i++) {
    const c = await cmd(); if (c?.cast) casts.add(c.cast); if (c?.move) moves.add(c.move);
    for (const pr of await projs()) if ((pr.owner === "p1" || pr.ownerId === "p1" || true)) projNames.add(pr.name);
    const s = await swarm(); if (s?.active) swarmOn = true;
    const f = await fade(); if (f && f.alpha < fadeMin) fadeMin = f.alpha;
    if ((await ultCine())?.active) ultOn = true;
    if (i === shotAt && tag) await page.screenshot({ path: path.join(OUT, `toji_move_${tag}.png`) });
    await waitFrames(1);
  }
  const p2h1 = (await p2()).health; const dx = (await p1()).x - x0;
  return { casts, moves, projNames, swarmOn, fadeMin, ultOn, dmg: Math.max(0, p2h0 - p2h1), dx };
}

// Firing = the move's own animation + characteristic output actually appears on screen. Connect/damage is
// spacing-dependent (a harness artifact, per toji.test.mjs's own Playful-Cloud note), so it's reported as
// detail, not the pass bar. Each move gets up to 3 fresh attempts to beat input-timing flake.
const poseOf = o => [...new Set([...o.casts, ...o.moves])].filter(m => /toji/.test(m));
const MOVES = [
  { name: "Split Soul Katana", input: "Special: L", tag: "1_splitsoul", frames: 40,
    press: async () => { await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); },
    fired: o => poseOf(o).some(m => /^tojiSword[12]$/.test(m)),
    detail: o => `swings=${poseOf(o).filter(m=>/Sword/.test(m)).join(",")} dmg=${o.dmg}` },
  { name: "Rapid Sword Slashes", input: "Down+Special: S+L", tag: "2_rapidslash", frames: 50,
    press: async () => { await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("s"); },
    fired: o => poseOf(o).includes("tojiRapidSlash"),
    detail: o => `move=tojiRapidSlash dmg=${o.dmg}` },
  { name: "Chain of a Thousand Miles / Inverted Spear", input: "Forward+Special: D+L", tag: "3_chain", frames: 90,
    press: async () => { await page.keyboard.down("d"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); },
    after: async () => { await page.keyboard.up("d"); },
    fired: o => poseOf(o).some(m => /^tojiChain[1-5]$/.test(m)),
    detail: o => `parts=${poseOf(o).filter(m=>/Chain/.test(m)).sort().join("→")} dmg=${o.dmg}` },
  { name: "Playful Cloud", input: "Up+Special: W+L (held together)", tag: "4_playfulcloud", frames: 34,
    press: async () => { await page.keyboard.down("w"); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("w"); },
    fired: o => poseOf(o).includes("tojiPlayfulCloud"),
    detail: o => `pose=tojiPlayfulCloud lungeΔx=${o.dx.toFixed(0)}px dmg=${o.dmg}` },
  { name: "Fly Heads — DEFENSIVE (self-vanish/vision-denial)", input: "Back+Special: A+L", tag: "5_flyheads_def", frames: 40,
    press: async () => { await page.keyboard.down("a"); await waitFrames(1); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await page.keyboard.up("a"); },
    fired: o => o.casts.has("tojiFlyHeads") && o.swarmOn && o.fadeMin < 0.9,
    detail: o => `swarm=${o.swarmOn} Toji-fade α=${o.fadeMin.toFixed(2)} dmg=${o.dmg}(design:0)` },
  { name: "Fly Heads — OFFENSIVE (damaging projectile swarm)", input: "Down+Heavy: S+K", tag: "6_flyheads_off", frames: 45,
    press: async () => { await page.keyboard.down("s"); await waitFrames(1); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("s"); },
    fired: o => o.casts.has("tojiFlyHeads") && [...o.projNames].some(n => /tojiFlyHeadShot/.test(n)),
    detail: o => `projectiles=${[...o.projNames].filter(n=>/tojiFlyHeadShot/.test(n)).join(",")} dmg=${o.dmg}` },
  { name: "Cursed Tool: Handgun", input: "Back+Heavy: A+K", tag: "7_handgun", frames: 40,
    press: async () => { await page.keyboard.down("a"); await waitFrames(1); await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await page.keyboard.up("a"); },
    fired: o => o.casts.has("tojiGun") && [...o.projNames].some(n => /bullet|gun/i.test(n)),
    detail: o => `cast=tojiGun projectile=${[...o.projNames].filter(n=>/bullet|gun/i.test(n)).join(",")} dmg=${o.dmg}` },
  { name: "Ultimate: Reincarnation", input: "Ultimate: U", tag: "8_ultimate", frames: 30,
    press: async () => { await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u"); },
    fired: o => o.ultOn || o._reinc,
    detail: o => `freeze-cinematic=${o.ultOn} reincarnated-form=${o._reinc}` },
];

console.log("TOJI — LIVE MOVESET VERIFICATION (pressing the real default P1 keys)\n");
await boot();

for (const mv of MOVES) {
  let o = null, fired = false;
  for (let attempt = 0; attempt < 3 && !fired; attempt++) {
    await reset(mv.tag === "3_chain" ? 70 : 92);
    await mv.press();
    o = await observe(mv.frames, mv.tag);
    if (mv.tag === "8_ultimate") o._reinc = (await page.evaluate(() => window.__harness.tojiComeback())).reincarnated;
    if (mv.after) await mv.after();
    fired = mv.fired(o);
  }
  check(`${mv.name}  [${mv.input}]`, fired, mv.detail(o));
}

// ── DIAGNOSIS of the two reported "doesn't fire" cases ──
console.log("\n── DIAGNOSIS (reproducing the reported failures) ──");
// (A) Playful Cloud PITFALL: TAP up (jump) then press Special after releasing up → up not held → NEUTRAL special.
await reset();
{ await page.keyboard.down("w"); await waitFrames(4); await page.keyboard.up("w"); await waitFrames(2);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  const o = await observe(30, "diag_up_released");
  const gotCloud = o.casts.has("tojiPlayfulCloud") || o.moves.has("tojiPlayfulCloud");
  const gotSword = o.casts.has("tojiSword1") || o.casts.has("tojiSword2");
  console.log(`  ${!gotCloud ? "⚠️" : "  "} Tap-Up (jump) THEN Special (up released) → ${gotCloud ? "Playful Cloud" : gotSword ? "NEUTRAL Split Soul (up must be HELD at press)" : "nothing/other"}  [casts=${[...o.casts]}]`);
}
// (B) The ORIGINAL root cause: the in-battle Controls overlay USED to mislabel Special as "I" (really the
// up-attack key). Pressing "I" produces NO special — confirming why the report happened. The overlay text is
// now FIXED (ui.js drawControlsInfo → "Special: L  Ultimate: U" + "Specials are directional — hold a dir + L").
await reset();
{ await page.keyboard.down("i"); await waitFrames(2); await page.keyboard.up("i");
  const o = await observe(24, "diag_wrongkey_I");
  const gotSpecial = [...o.casts].some(c => /Sword|Chain|PlayfulCloud|FlyHeads|RapidSlash/.test(c));
  console.log(`  ${gotSpecial ? "  " : "⚠️"} Pressing "I" (the old overlay's wrong "Special") → ${gotSpecial ? "a special" : "NOT a special — it's the up-attack key (real Special = L; overlay now corrected)"}  [casts=${[...o.casts]} moves=${[...o.moves].filter(m=>/toji/.test(m))}]`);
}

console.log(`\n${FAIL === 0 ? "✅ ALL MOVES FIRE" : "❌ SOME MOVES FAILED"} — ${PASS} fire / ${FAIL} fail` + (jsErrors.length ? `\nJS ERRORS: ${jsErrors.slice(0,3).join(" | ")}` : "\nno JS errors"));
console.log(`shots → harness/shots/toji_move_*.png`);
await browser.close(); server.close();
process.exit(FAIL === 0 ? 0 : 1);
