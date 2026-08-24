// harness/vegeta_dark_stage5.mjs
// STAGE 5 evidence: Dark Vegeta's DARK-AURA transformation ("Villainous Mode") — the DB charge-transform
// mechanic (threshold-gated, per-frame Ki drain, auto-revert at 0, tap-revert), reused from Frieza/Vegeta/
// Goku Black/Piccolo. NOT an art re-skin: enter plays the real aura-buildup morph, stats buff, and it flips
// `_darkAuraActive` which AMPLIFIES the Ki Blast to its purple tier.
// (1) WIRING — transformationOrder base→darkAura; darkAura drains Ki + reverts on empty (data).
// (2) ENTER — charge-release enters the form (currentForm=vegetaDarkAura), NO up-front cost, stat buffs, morph pose.
// (3) ★AMPLIFIED KI BLAST — base ki blast = WHITE small (w<70); transformed = PURPLE big (w≥70) + harder.
//     THE item-2 demonstration that the amplified blast is a power-up of the normal one.
// (4) DRAIN — transforming drains Ki over time.
// (5) AUTO-REVERT at 0 Ki; charge-TAP reverts (buffs cleared).
// Shots → harness/shots/vegeta_dark_stage5_*.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const projectiles = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `vegeta_dark_stage5_${tag}.png`) }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function reset() { await waitGrounded(); await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.p1VegetaDarkRevert?.(); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); }); await waitFrames(2); }
const enterForm = () => page.evaluate(() => window.__harness.p1VegetaDarkEnter());
const revert    = () => page.evaluate(() => window.__harness.p1VegetaDarkRevert());
const setKi     = (v) => page.evaluate(x => window.__harness.p1VegetaDarkSetEnergy(x), v);
const fireDir   = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function seeProj(nameFrag, maxF = 22) { let seen = 0, maxW = 0; for (let f = 0; f < maxF; f++) { const pr = await projectiles(); const hit = pr.filter(p => (p.name || "").toLowerCase().includes(nameFrag.toLowerCase()) && !(p.name || "").includes("_impact")); if (hit.length) { seen = Math.max(seen, hit.length); maxW = Math.max(maxW, ...hit.map(p => p.w || 0)); } await waitFrames(1); } return { seen, maxW }; }
async function setP2Gap(gap) { const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1)); await waitFrames(2); }

try {
  await page.goto(`${base}/index.html?harness=1&p1=vegeta_dark&p2=goku`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  console.log("\n── (1) wiring: dark-aura form declared like the DB pack ──");
  const ad = await page.evaluate(() => { const c = window.__harness.charDef("vegeta_dark"); return { order: c.transformationOrder, f: c.transformations?.darkAura }; });
  check("transformationOrder includes base→darkAura (rose = 3rd tier)", ad.order?.[0] === "base" && ad.order?.[1] === "darkAura", JSON.stringify(ad.order));
  check("darkAura drains Ki + reverts on empty (like Vegeta)", ad.f?.energyDrainPerFrame > 0 && ad.f?.revertOnEmpty === true, `drain=${ad.f?.energyDrainPerFrame} revert=${ad.f?.revertOnEmpty}`);
  check("darkAura is an all-around buff (dmg>1)", ad.f?.damageMultiplier > 1, `dmg=${ad.f?.damageMultiplier}`);

  console.log("\n── (2) base → DARK-AURA: threshold-gated, NO up-front cost, stat buffs + morph pose ──");
  await reset();
  const ki0 = (await p1()).energy;
  const ok = await enterForm();
  const t = await p1();
  check("charge-release enters dark-aura form", t.currentForm === "vegetaDarkAura", `form=${t.currentForm} ok=${ok}`);
  check("NO up-front energy cost (only per-frame drain)", ki0 - t.energy < 5, `ki ${ki0}→${t.energy.toFixed(0)} Δ=${(ki0 - t.energy).toFixed(1)}`);
  check("boosts damage (×1.35)", Math.abs(t.damageMult - 1.35) < 0.02, `dmg=${t.damageMult}`);
  check("boosts speed (×1.15)", Math.abs(t.speedMult - 1.15) < 0.02, `spd=${t.speedMult}`);
  check("boosts defense (×1.05)", Math.abs((t.defMult ?? 1) - 1.05) < 0.02, `def=${t.defMult}`);
  let sawAura = false; for (let f = 0; f < 8; f++) { const a = await p1(); if ((a.spriteSheet || "").includes("vegeta_dark_aura_uniform")) sawAura = true; await waitFrames(1); }
  check("enter plays the real aura-buildup morph pose (vdAura)", sawAura, "");
  await shot("transformed");

  console.log("\n── (3) ★ AMPLIFIED KI BLAST — same attack, powered up in the dark-aura form ──");
  // BASE (not transformed): white, small
  await reset();
  await setP2Gap(150);
  let h0 = (await p2()).health;
  const bcast = await fireDir(null);
  check("base ki blast casts vdKiCast", bcast?.cast === "vdKiCast", `cast=${bcast?.cast}`);
  const baseP = await seeProj("vdKiBlast", 20);
  await waitFrames(20);
  const dBase = h0 - (await p2()).health;
  // TRANSFORMED: purple, big, harder
  await reset();
  await enterForm();
  await setP2Gap(150);
  h0 = (await p2()).health;
  const acast = await fireDir(null);
  check("transformed ki blast casts vdKiCast", acast?.cast === "vdKiCast", `cast=${acast?.cast}`);
  const ampP = await seeProj("vdKiBlastAmped", 20);
  await waitFrames(20);
  const dAmp = h0 - (await p2()).health;
  check(`transformed fires the AMPLIFIED (purple) tier — bigger burst (w=${ampP.maxW} vs base ${baseP.maxW})`, ampP.seen >= 1 && ampP.maxW >= 70 && ampP.maxW > baseP.maxW, `amp=${ampP.maxW} base=${baseP.maxW}`);
  check(`amplified ki blast hits HARDER than base (${dAmp.toFixed(0)} > ${dBase.toFixed(0)})`, dAmp > dBase, `amp=${dAmp} base=${dBase}`);
  await shot("amped_blast");

  console.log("\n── (4) DRAIN: transforming drains Ki over time ──");
  await reset(); await enterForm();
  const gk0 = (await p1()).energy; await waitFrames(30); const gk1 = (await p1()).energy;
  check(`dark-aura drains Ki over time (${gk0.toFixed(0)}→${gk1.toFixed(0)}, ~${((gk0 - gk1) / 30).toFixed(2)}/f)`, gk1 < gk0, `Δ=${(gk0 - gk1).toFixed(1)}`);

  console.log("\n── (5) AUTO-REVERT at 0 Ki, and charge-TAP reverts to base ──");
  await reset(); await enterForm();
  await setKi(0); await waitFrames(3);
  const drained = await p1();
  check("Ki-empty auto-reverts dark-aura → base (buffs cleared)", drained.currentForm === "base" && Math.abs(drained.damageMult - 1) < 0.01, `form=${drained.currentForm} dmg=${drained.damageMult}`);
  await reset(); await enterForm(); await waitFrames(3);
  await revert(); await waitFrames(2);
  const tr = await p1();
  check("charge-tap reverts dark-aura → base (buffs cleared)", tr.currentForm === "base" && Math.abs(tr.damageMult - 1) < 0.01 && Math.abs(tr.speedMult - 1) < 0.01, `form=${tr.currentForm} dmg=${tr.damageMult} spd=${tr.speedMult}`);

  console.log("\n── no JS errors ──");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
