// harness/superman_classic.test.mjs — CANONICAL full-kit smoke test for Superman (Custom / DC Universe Customs).
// Covers every built stage: sprite gate/stats (S1), movement/state sheets (S1), normals connect (S2), the
// Fwd+Heavy "Man of Steel" chain (S3), directional/air specials (S4), the "Heat Vision Barrage" ULT (S5), win/lose
// pose wiring (S6), a full fallback-box sweep, and no JS errors. SEPARATE entry from the built `superman`.
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
  await page.goto(`${base}/index.html?harness=1&p1=superman_classic`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const g = await p1();
  const cd = await page.evaluate(() => window.__harness.charDef("superman_classic"));
  const ad = cd.animationData;

  console.log("\n── S1: sprite gate + stats ──");
  check("P1 is superman_classic", g.key === "superman_classic", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 1.2", Math.abs((g.spriteScale || 0) - 1.2) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1350 / EN 200", g.maxHealth === 1350 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  check("canFly + energyType solar_energy", cd.traits?.canFly === true && cd.traits?.energyType === "solar_energy", `canFly=${cd.traits?.canFly} en=${cd.traits?.energyType}`);
  check("SEPARATE from built superman (own art)", (ad.idle?.sheet || "").includes("superman_classic_idle"), `idle=${ad.idle?.sheet}`);

  console.log("\n── S1: movement/state sheets resolve ──");
  for (const [act, tag] of [["idle","superman_classic_idle"],["walk","superman_classic_walk"],["run","superman_classic_walk"],["dash","superman_classic_walk"],["jump","superman_classic_jump"],["fall","superman_classic_jump"],["crouch","superman_classic_crouch"],["guard","superman_classic_idle"],["hurt","superman_classic_hurt"],["knockdown","superman_classic_knockdown"],["fly","superman_classic_fly"]]) {
    await force(act); await waitFrames(3); const r = await p1();
    check(`${act} → ${tag}_uniform`, (r.spriteSheet || "").includes(`${tag}_uniform`), `sheet=${r.spriteSheet}`);
    await force(null); await waitFrames(1);
  }

  console.log("\n── S2: normals connect ──");
  for (const [name, key, tag] of [["light","j","superman_classic_light"],["heavy","k","superman_classic_heavy"],["up","i","superman_classic_up"]]) {
    await prep(50); const h0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(2);
    let saw = false; for (let i=0;i<5;i++){ const a=await p1(); if((a.spriteSheet||"").includes(tag)) saw=true; await waitFrames(2); }
    await page.keyboard.up(key); await waitFrames(8);
    check(`${name} renders+connects`, saw && (h0 - (await p2()).health) > 0, `dmg=${(h0-(await p2()).health).toFixed(0)}`);
  }

  console.log("\n── S3: Fwd+Heavy 'Man of Steel' chain opens ──");
  await prep(50);
  const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
  await page.keyboard.down(fwd); await waitFrames(1);
  await page.keyboard.down("k"); await waitFrames(1);
  let opened = false;
  for (let i = 0; i < 8 && !opened; i++) { const c = await page.evaluate(() => window.__harness.supermanClassicCmd("p1")); if (/supClsRush1/.test(c?.move || "")) opened = true; await waitFrames(1); }
  await page.keyboard.up("k"); await page.keyboard.up(fwd); await waitFrames(6);
  check("rush chain opens supClsRush1", opened, "");

  console.log("\n── S4: specials fire + connect (★REAL Heat Vision melee + REAL Ice Breath) ──");
  await prep(120); { const h0=(await p2()).health; const r=await fireDir(null); let dealt=0, saw=false;
    for(let f=0;f<12;f++){const mv=await p1(); if((mv.spriteSheet||"").includes("superman_classic_heatvision_uniform")) saw=true; dealt=Math.max(dealt,h0-(await p2()).health); await waitFrames(1);}
    check("Heat Vision (neutral) real baked-beam disjoint + connects from far", r?.move==="supClsHeat" && saw && dealt>0, `move=${r?.move} dmg=${dealt.toFixed(0)}`);
  }
  await waitGrounded();
  await prep(70); { const h0=(await p2()).health; const r=await fireDir("F"); let dealt=0; for(let f=0;f<14;f++){await waitFrames(1);dealt=Math.max(dealt,h0-(await p2()).health);}
    check("Flying Charge (Fwd) fires + connects", r?.move==="supClsFlycharge" && dealt>0, `move=${r?.move} dmg=${dealt.toFixed(0)}`);
  }
  await waitGrounded();
  await prep(46); { const h0=(await p2()).health; const r=await fireDir("U"); let dealt=0; for(let f=0;f<14;f++){await waitFrames(1);dealt=Math.max(dealt,h0-(await p2()).health);}
    check("Soaring Uppercut (Up) launcher fires + connects", r?.move==="supClsSoar" && dealt>0, `move=${r?.move} dmg=${dealt.toFixed(0)}`);
  }
  await waitGrounded();
  await prep(200); { await fireDir("D"); const sawP=await seeProj("supclsice",20);
    check("Ice Breath (Down) spawns a REAL frost-cloud projectile", sawP, `seen=${sawP}`);
  }
  await waitGrounded();
  await prep(40); { await page.evaluate(() => window.__harness.jumpP1?.()); await waitFrames(3);
    const h0=(await p2()).health; const r=await fireDir(null); let dealt=0; for(let f=0;f<16;f++){await waitFrames(1);dealt=Math.max(dealt,h0-(await p2()).health);}
    check("Flying Dive Kick (air) fires + connects", r?.move==="supClsDive" && dealt>0, `move=${r?.move} dmg=${dealt.toFixed(0)}`);
  }
  await waitGrounded();

  console.log("\n── S5: 'Heat Vision Barrage' ULT — guaranteed 3-beat sustained-beam cinematic ──");
  await prep(130); const hp0 = (await p2()).health;
  const ult = await page.evaluate(() => window.__harness.p1Ultimate());
  check("Heat Vision Barrage casts on live fighter (supClsUlt)", ult?.cast === true && ult?.castMove === "supClsUlt", `cast=${ult?.cast} castMove=${ult?.castMove}`);
  let dealt = 0, sawBeam = false;
  for (let f = 0; f < 54; f++) { if (((await p1()).spriteSheet||"").includes("superman_classic_ult_uniform")) sawBeam = true; dealt = Math.max(dealt, hp0 - (await p2()).health); await waitFrames(1); }
  check("live fighter holds the real sustained-beam cast", sawBeam, "");
  check(`guaranteed ULT payoff ≥150 EFF (dmg ${dealt.toFixed(0)})`, dealt >= 150, `dmg=${dealt.toFixed(0)}`);
  await waitGrounded();

  console.log("\n── S6: win / lose pose wiring ──");
  check("win → superman_classic_win_uniform", (ad.win?.sheet || "").includes("superman_classic_win_uniform"), `sheet=${ad.win?.sheet}`);
  check("lose → knockdown reuse", (ad.lose?.sheet || "").includes("superman_classic_knockdown_uniform"), `sheet=${ad.lose?.sheet}`);
  await force("win"); await waitFrames(3); check("win pose renders", ((await p1()).spriteSheet || "").includes("superman_classic_win_uniform"), ""); await force(null);
  await force("lose"); await waitFrames(3); check("lose pose renders", ((await p1()).spriteSheet || "").includes("superman_classic_knockdown_uniform"), ""); await force(null);

  console.log("\n── fallback-box sweep (every action resolves a real superman_classic_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle","walk","run","dash","jump","fall","crouch","guard","hurt","knockdown","getup","charge","light","heavy","up","air","down_air","crouchLight","supClsRush1","supClsRush2","supClsRush3","supClsHeat","supClsFlycharge","supClsSoar","supClsDive","supClsUlt","fly","flyMove","win","lose"]) {
    await force(act); await waitFrames(2); const r = await p1();
    if (!(r.spriteSheet || "").includes("superman_classic_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("no action falls back to the procedural box", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors across the full kit", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
