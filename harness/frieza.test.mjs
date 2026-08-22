// harness/frieza.test.mjs — CANONICAL full-kit smoke test for Frieza (Dragon Ball, base/final form).
// Covers every stage: sprite gate/stats (S1), movement/state sheets (S1), normals connect (S2), the
// Fwd+Heavy rush chain (S3), all directional/air specials (S4), the Golden Frieza timed-transform + Black Frieza ult
// + exhaustion drawback (S5), win/lose pose wiring (S6), a full fallback-box sweep, and no JS errors.
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
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=frieza`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const g = await p1();
  const ad = await page.evaluate(() => window.__harness.charDef("frieza").animationData);

  console.log("\n── S1: sprite gate + stats ──");
  check("P1 is Frieza", g.key === "frieza", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 0.88", Math.abs((g.spriteScale || 0) - 0.88) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1100 / EN 200", g.maxHealth === 1100 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);

  console.log("\n── S1: movement/state sheets resolve ──");
  for (const [act, tag] of [["idle","frieza_idle"],["walk","frieza_idle"],["run","frieza_idle"],["dash","frieza_dash"],["jump","frieza_jump"],["crouch","frieza_crouch"],["hurt","frieza_hurt"],["knockdown","frieza_knockdown"],["getup","frieza_getup"],["taunt","frieza_taunt"]]) {
    await force(act); await waitFrames(3); const r = await p1();
    check(`${act} → ${tag}_uniform`, (r.spriteSheet || "").includes(`${tag}_uniform`), `sheet=${r.spriteSheet}`);
    await force(null); await waitFrames(1);
  }

  console.log("\n── S2: normals connect ──");
  for (const [name, key, tag] of [["light","j","frieza_light"],["heavy","k","frieza_heavy"]]) {
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
  for (let i = 0; i < 8 && !opened; i++) { const c = await page.evaluate(() => window.__harness.friezaCmd("p1")); if (/friezaRush1/.test(c?.move || "")) opened = true; await waitFrames(1); }
  await page.keyboard.up("k"); await page.keyboard.up(fwd); await waitFrames(6);
  check("rush chain opens friezaRush1", opened, "");

  console.log("\n── S4: specials ──");
  await prep(150); { const h0=(await p2()).health; const r=await fireDir(null);
    let sawP=false; for(let f=0;f<18&&!sawP;f++){await waitFrames(1);const pr=await projectiles();if(pr.some(p=>(p.name||"").toLowerCase().includes("friezadeathbeam")))sawP=true;}
    await waitFrames(24);
    check("Death Beam (neutral) casts + beam + connects", r?.cast==="friezaDeathbeam" && sawP && (h0-(await p2()).health)>0, `cast=${r?.cast} dmg=${(h0-(await p2()).health).toFixed(0)}`);
  }
  await waitGrounded();
  for (const [name, dir, cast, move] of [["Ki Blast","F","friezaKiblast",null],["Death Ball","D","friezaDeathball",null],["Psycho Teleport","B",null,"friezaTeleport"]]) {
    await prep(dir === "B" ? 80 : 130); const h0=(await p2()).health; const r=await fireDir(dir); await waitFrames(dir === "D" ? 26 : 18);
    const ok = (cast ? r?.cast===cast : r?.move===move) && (h0-(await p2()).health)>0;
    check(`${name} (${dir}) fires + connects`, ok, `cast=${r?.cast} move=${r?.move} dmg=${(h0-(await p2()).health).toFixed(0)}`);
    await waitGrounded();
  }

  console.log("\n── S5: TRANSFORMATION LADDER — base → GOLDEN → BLACK (Vegeta/Goku-Black model) ──");
  await prep(120);
  const kiA = (await p1()).energy;
  await page.evaluate(() => window.__harness.p1GoldenFriezaEnter());
  const gold = await p1();
  check("base→Golden: boosts dmg/spd/def, NO up-front cost", gold.goldenFrieza === true && Math.abs(gold.damageMult - 1.25) < 0.02 && Math.abs(gold.speedMult - 1.18) < 0.02 && Math.abs(gold.defMult - 1.08) < 0.02 && (kiA - gold.energy) < 5, `dmg=${gold.damageMult} spd=${gold.speedMult} def=${gold.defMult} Δki=${(kiA - gold.energy).toFixed(1)}`);
  await page.evaluate(() => window.__harness.fillEnergy?.());
  await page.evaluate(() => window.__harness.p1BlackFriezaEnter());
  const blk = await p1();
  check("Golden→Black: chains up, bigger boost, supersedes Golden", blk.blackFrieza === true && blk.goldenFrieza === false && Math.abs(blk.damageMult - 1.50) < 0.02 && Math.abs(blk.speedMult - 1.32) < 0.02, `black=${blk.blackFrieza} golden=${blk.goldenFrieza} dmg=${blk.damageMult}`);
  const bk0 = (await p1()).energy; await waitFrames(20); const bk1 = (await p1()).energy;
  check(`transformed form DRAINS Ki (${bk0.toFixed(0)}→${bk1.toFixed(0)})`, bk1 < bk0, `Δ=${(bk0 - bk1).toFixed(1)}`);
  await page.evaluate(() => window.__harness.p1FriezaSetEnergy(0)); await waitFrames(3);
  const rev = await p1();
  check("Ki-empty auto-reverts to base (buffs cleared)", rev.blackFrieza === false && rev.goldenFrieza === false && Math.abs(rev.damageMult - 1) < 0.01 && rev.friezaForm === "base", `form=${rev.friezaForm} dmg=${rev.damageMult}`);

  console.log("\n── S6: win/lose pose wiring ──");
  check("win → frieza_win_uniform", (ad.win?.sheet || "").includes("frieza_win_uniform"), `sheet=${ad.win?.sheet}`);
  check("lose → knockdown reuse", (ad.lose?.sheet || "").includes("frieza_knockdown_uniform"), `sheet=${ad.lose?.sheet}`);
  await force("win"); await waitFrames(3); check("win pose renders", ((await p1()).spriteSheet || "").includes("frieza_win_uniform"), ""); await force(null);
  await force("lose"); await waitFrames(3); check("lose pose renders", ((await p1()).spriteSheet || "").includes("frieza_knockdown_uniform"), ""); await force(null);

  console.log("\n── fallback-box sweep (every action resolves a real frieza_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle","walk","run","dash","jump","fall","crouch","hurt","knockdown","getup","taunt","light","heavy","up","air","down_air","guard","friezaRush1","friezaRush2","friezaRush3","friezaDeathbeam","friezaKiblast","friezaDeathball","friezaTeleport","friezaOverload","win","lose"]) {
    await force(act); await waitFrames(2); const r = await p1();
    if (!(r.spriteSheet || "").includes("frieza_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
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
