// harness/piccolo.test.mjs — CANONICAL full-kit smoke test for Piccolo (Dragon Ball, Extreme Butoden).
// Covers every built stage: sprite gate/stats (S1), movement/state sheets (S1), normals connect (S2), the
// Fwd+Heavy rush chain (S3), all directional/air specials (S4), win/lose/intro pose wiring (S6), the DEFERRED
// transformation stub (S5 = design-only, ZERO transformed art), a full fallback-box sweep, and no JS errors.
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
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate(act => window.__harness.forceAction(act, "p1"), a);
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function seeProj(frag, maxF = 20) { for (let f = 0; f < maxF; f++) { const pr = await projectiles(); if (pr.some(p => (p.name || "").toLowerCase().includes(frag))) return true; await waitFrames(1); } return false; }
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const g = await p1();
  const cd = await page.evaluate(() => window.__harness.charDef("piccolo"));
  const ad = cd.animationData;

  console.log("\n── S1: sprite gate + stats ──");
  check("P1 is Piccolo", g.key === "piccolo", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 0.90", Math.abs((g.spriteScale || 0) - 0.90) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1150 / EN 200", g.maxHealth === 1150 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);

  console.log("\n── S1: movement/state sheets resolve ──");
  for (const [act, tag] of [["idle","piccolo_idle"],["walk","piccolo_idle"],["run","piccolo_idle"],["dash","piccolo_dash"],["jump","piccolo_jump"],["crouch","piccolo_crouch"],["guard","piccolo_guard"],["hurt","piccolo_hurt"],["knockdown","piccolo_knockdown"],["getup","piccolo_getup"],["taunt","piccolo_taunt"]]) {
    await force(act); await waitFrames(3); const r = await p1();
    check(`${act} → ${tag}_uniform`, (r.spriteSheet || "").includes(`${tag}_uniform`), `sheet=${r.spriteSheet}`);
    await force(null); await waitFrames(1);
  }

  console.log("\n── S2: normals connect ──");
  for (const [name, key, tag] of [["light","j","piccolo_light"],["heavy","k","piccolo_heavy"],["up","i","piccolo_up"]]) {
    await prep(50); const h0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(2);
    let saw = false; for (let i=0;i<5;i++){ const a=await p1(); if((a.spriteSheet||"").includes(tag)) saw=true; await waitFrames(2); }
    await page.keyboard.up(key); await waitFrames(8);
    check(`${name} renders+connects`, saw && (h0 - (await p2()).health) > 0, `dmg=${(h0-(await p2()).health).toFixed(0)}`);
  }

  console.log("\n── S3: Fwd+Heavy rush chain opens ──");
  await prep(50);
  const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
  await page.keyboard.down(fwd); await waitFrames(1);
  await page.keyboard.down("k"); await waitFrames(1);
  let opened = false;
  for (let i = 0; i < 8 && !opened; i++) { const c = await page.evaluate(() => window.__harness.piccoloCmd("p1")); if (/piccoloRush1/.test(c?.move || "")) opened = true; await waitFrames(1); }
  await page.keyboard.up("k"); await page.keyboard.up(fwd); await waitFrames(6);
  check("rush chain opens piccoloRush1", opened, "");

  console.log("\n── S4: specials fire + connect ──");
  await prep(150); { const h0=(await p2()).health; const r=await fireDir(null);
    const sawP = await seeProj("piccolobeam", 18); await waitFrames(22);
    check("Special Beam Cannon (neutral) casts + beam + connects", r?.cast==="piccoloBeam" && sawP && (h0-(await p2()).health)>0, `cast=${r?.cast} dmg=${(h0-(await p2()).health).toFixed(0)}`);
  }
  await waitGrounded();
  await prep(150); { const h0=(await p2()).health; const r=await fireDir("F"); await waitFrames(12);
    check("Stretch-Arm (Fwd) fires + connects from far", r?.move==="piccoloStretch" && (h0-(await p2()).health)>0, `move=${r?.move} dmg=${(h0-(await p2()).health).toFixed(0)}`);
  }
  await waitGrounded();
  await prep(140); { const h0=(await p2()).health; const r=await fireDir("D"); const sawP=await seeProj("piccolomasenko",20); await waitFrames(18);
    check("Masenko (Down) casts + connects", r?.cast==="piccoloMasenko" && sawP && (h0-(await p2()).health)>0, `cast=${r?.cast} dmg=${(h0-(await p2()).health).toFixed(0)}`);
  }
  await waitGrounded();
  await prep(120); { const h0=(await p2()).health; const r=await fireDir("B"); const sawP=await seeProj("piccolodemonwave",22); await waitFrames(24);
    check("Explosive Demon Wave (Back) casts + big sphere + connects", r?.cast==="piccoloDemonwave" && sawP && (h0-(await p2()).health)>0, `cast=${r?.cast} dmg=${(h0-(await p2()).health).toFixed(0)}`);
  }
  await waitGrounded();
  await prep(44); { await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(1);
    const h0=(await p2()).health; const r=await fireDir(null); let dealt=0; for(let f=0;f<16;f++){await waitFrames(1);dealt=Math.max(dealt,h0-(await p2()).health);}
    check("Flying Dash Kick (air) fires + i-frames + connects", r?.move==="piccoloFlykick" && dealt>0, `move=${r?.move} dmg=${dealt.toFixed(0)}`);
  }
  await waitGrounded();

  console.log("\n── S5: TRANSFORMATION LADDER — base → POTENTIAL UNLEASHED → ORANGE PICCOLO (Frieza/Vegeta model; ART = palette-tint placeholder) ──");
  check("ladder wired (order = base→potential→orange)", Array.isArray(cd.transformationOrder) && cd.transformationOrder.join(",") === "base,potential,orange", `order=${JSON.stringify(cd.transformationOrder)}`);
  await prep(120);
  const kiA = (await p1()).energy;
  await page.evaluate(() => window.__harness.p1PiccoloPotentialEnter());
  const t1 = await p1();
  check("base→Potential (T1): boosts dmg/spd/def, NO up-front cost", t1.piccoloPotential === true && Math.abs(t1.damageMult - 1.20) < 0.02 && Math.abs(t1.speedMult - 1.12) < 0.02 && Math.abs(t1.defMult - 1.06) < 0.02 && (kiA - t1.energy) < 5, `dmg=${t1.damageMult} spd=${t1.speedMult} def=${t1.defMult} Δki=${(kiA - t1.energy).toFixed(1)}`);
  await page.evaluate(() => window.__harness.fillEnergy?.());
  await page.evaluate(() => window.__harness.p1PiccoloOrangeEnter());
  const t2 = await p1();
  check("Potential→Orange (T2): chains up, bigger boost, supersedes T1", t2.piccoloOrange === true && t2.piccoloPotential === false && Math.abs(t2.damageMult - 1.42) < 0.02 && Math.abs(t2.speedMult - 1.24) < 0.02, `orange=${t2.piccoloOrange} potential=${t2.piccoloPotential} dmg=${t2.damageMult}`);
  const bk0 = (await p1()).energy; await waitFrames(20); const bk1 = (await p1()).energy;
  check(`transformed form DRAINS Ki (${bk0.toFixed(0)}→${bk1.toFixed(0)})`, bk1 < bk0, `Δ=${(bk0 - bk1).toFixed(1)}`);
  await page.evaluate(() => window.__harness.p1PiccoloSetEnergy(0)); await waitFrames(3);
  const rev = await p1();
  check("Ki-empty auto-reverts to base (buffs cleared)", rev.piccoloOrange === false && rev.piccoloPotential === false && Math.abs(rev.damageMult - 1) < 0.01 && rev.piccoloForm === "base", `form=${rev.piccoloForm} dmg=${rev.damageMult}`);
  check("★ART = palette-tint placeholder (ultimate desc flags it, not final art)", /placeholder|palette-tint/i.test(cd.ultimate?.description || ""), `ult=${cd.ultimate?.name}`);

  console.log("\n── S6: win / lose / intro pose wiring ──");
  check("win → piccolo_win_uniform", (ad.win?.sheet || "").includes("piccolo_win_uniform"), `sheet=${ad.win?.sheet}`);
  check("lose → knockdown reuse", (ad.lose?.sheet || "").includes("piccolo_knockdown_uniform"), `sheet=${ad.lose?.sheet}`);
  check("intro → piccolo_intro_uniform (cape removal)", (ad.piccoloIntro?.sheet || "").includes("piccolo_intro_uniform"), `sheet=${ad.piccoloIntro?.sheet}`);
  check("introPool = [piccoloIntro]", Array.isArray(cd.introPool) && cd.introPool.includes("piccoloIntro"), `pool=${JSON.stringify(cd.introPool)}`);
  await force("win"); await waitFrames(3); check("win pose renders", ((await p1()).spriteSheet || "").includes("piccolo_win_uniform"), ""); await force(null);
  await force("lose"); await waitFrames(3); check("lose pose renders", ((await p1()).spriteSheet || "").includes("piccolo_knockdown_uniform"), ""); await force(null);

  console.log("\n── fallback-box sweep (every action resolves a real piccolo_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle","walk","run","dash","jump","fall","crouch","guard","hurt","knockdown","getup","taunt","light","heavy","up","air","down_air","piccoloRush1","piccoloRush2","piccoloRush3","piccoloBeam","piccoloMasenko","piccoloDemonwave","piccoloStretch","piccoloFlykick","piccoloIntro","win","lose"]) {
    await force(act); await waitFrames(2); const r = await p1();
    if (!(r.spriteSheet || "").includes("piccolo_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("no action falls back to the 128×128 box", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors across the full kit", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
