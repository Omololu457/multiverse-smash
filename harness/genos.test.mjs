// harness/genos.test.mjs — CANONICAL full-kit smoke test for Genos (One Punch Man).
// Covers every stage: sprite gate/stats (S1), movement/state sheets (S1), normals connect (S2), the
// Fwd+Heavy rush chain (S3), all specials incl. the 3-tier Incineration Cannon (S4), the Overdrive ultimate
// timed-mode + drawback (S5), win/lose pose wiring (S6), a full fallback-box sweep, and no JS errors.
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
const fireTier = (t) => page.evaluate(tt => window.__harness.genosIncinerate(tt), t);
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=genos`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const g = await p1();
  const ad = await page.evaluate(() => window.__harness.charDef("genos").animationData);

  console.log("\n── S1: sprite gate + stats ──");
  check("P1 is Genos", g.key === "genos", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 1.62", Math.abs((g.spriteScale || 0) - 1.62) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1080 / EN 200", g.maxHealth === 1080 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);

  console.log("\n── S1: movement/state sheets resolve ──");
  for (const [act, tag] of [["idle","genos_idle"],["walk","genos_walk"],["run","genos_run"],["dash","genos_dash"],["jump","genos_jump"],["hurt","genos_hurt"],["knockdown","genos_knockdown"],["getup","genos_getup"],["taunt","genos_taunt"]]) {
    await force(act); await waitFrames(3); const r = await p1();
    check(`${act} → ${tag}_uniform`, (r.spriteSheet || "").includes(`${tag}_uniform`), `sheet=${r.spriteSheet}`);
    await force(null); await waitFrames(1);
  }

  console.log("\n── S2: normals connect ──");
  for (const [name, key, tag] of [["light","j","genos_light"],["heavy","k","genos_heavy"]]) {
    await prep(50); const h0 = (await p2()).health;
    await page.keyboard.down(key); await waitFrames(2);
    let saw = false; for (let i=0;i<5;i++){ const a=await p1(); if((a.spriteSheet||"").includes(tag)) saw=true; await waitFrames(2); }
    await page.keyboard.up(key); await waitFrames(8);
    check(`${name} renders+connects`, saw && (h0 - (await p2()).health) > 0, `dmg=${(h0-(await p2()).health).toFixed(0)}`);
  }

  console.log("\n── S3: Fwd+Heavy rush chain opens ──");
  await prep(50);
  const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
  await page.keyboard.down(fwd); await waitFrames(1);   // let the forward hold register before Heavy
  await page.keyboard.down("k"); await waitFrames(1);
  let opened = false;
  for (let i = 0; i < 8 && !opened; i++) { const c = await page.evaluate(() => window.__harness.genosCmd("p1")); if (/genosRush1/.test(c?.move || "")) opened = true; await waitFrames(1); }
  await page.keyboard.up("k"); await page.keyboard.up(fwd); await waitFrames(6);
  check("rush chain opens genosRush1", opened, "");

  console.log("\n── S4: specials ──");
  await prep(150); { const h0=(await p2()).health; const r=await fireTier(3);
    let sawP=false; for(let f=0;f<18&&!sawP;f++){await waitFrames(1);const pr=await projectiles();if(pr.some(p=>(p.name||"").includes("genosIncineration")))sawP=true;}
    await waitFrames(30);
    check("Incineration tier-3 casts + fireball + connects", r?.cast==="genosIncinerate3" && sawP && (h0-(await p2()).health)>0, `cast=${r?.cast} dmg=${(h0-(await p2()).health).toFixed(0)}`);
  }
  await waitGrounded();
  for (const [name, dir, move] of [["Machine Gun","F","genosMachinegun"],["Jet Dash","D","genosJetdash"],["Afterimage","B","genosAfterimage"]]) {
    await prep(60); const h0=(await p2()).health; const r=await fireDir(dir); await waitFrames(14);
    check(`${name} fires ${move} + connects`, r?.move===move && (h0-(await p2()).health)>0, `move=${r?.move} dmg=${(h0-(await p2()).health).toFixed(0)}`);
    await waitGrounded();
  }

  console.log("\n── S5: Overdrive ultimate ──");
  await prep(120); await page.evaluate(() => window.__harness.fillEnergy?.());
  const cast = await page.evaluate(() => window.__harness.p1Ultimate());
  const od = await p1();
  check("Ultimate enters Overdrive (buffs on)", od.genosOverdrive === true && Math.abs(od.damageMult - 1.35) < 0.01, `active=${od.genosOverdrive} dmg=${od.damageMult}`);
  const preHp = od.health;
  await page.evaluate(() => window.__harness.p1GenosOverdriveExpire()); await waitFrames(3);
  const post = await p1();
  check("Overdrive expiry → revert + overheat drawback", post.genosOverdrive === false && post.health < preHp && post.genosOverheatVuln > 0, `active=${post.genosOverdrive} Δhp=${(preHp-post.health).toFixed(0)} vuln=${post.genosOverheatVuln}`);

  console.log("\n── S6: win/lose pose wiring ──");
  check("win → genos_win_uniform", (ad.win?.sheet || "").includes("genos_win_uniform"), `sheet=${ad.win?.sheet}`);
  check("lose → knockdown reuse", (ad.lose?.sheet || "").includes("genos_knockdown_uniform"), `sheet=${ad.lose?.sheet}`);
  await force("win"); await waitFrames(3); check("win pose renders", ((await p1()).spriteSheet || "").includes("genos_win_uniform"), ""); await force(null);
  await force("lose"); await waitFrames(3); check("lose pose renders", ((await p1()).spriteSheet || "").includes("genos_knockdown_uniform"), ""); await force(null);

  console.log("\n── fallback-box sweep (every action resolves a real genos_ sheet) ──");
  const boxHit = [];
  for (const act of ["idle","walk","run","dash","jump","fall","hurt","knockdown","getup","taunt","light","heavy","up","air","down_air","guard","genosRush1","genosRush2","genosRush3","genosIncinerate1","genosIncinerate2","genosIncinerate3","genosMachinegun","genosJetdash","genosAfterimage","genosOverdrive","win","lose"]) {
    await force(act); await waitFrames(2); const r = await p1();
    if (!(r.spriteSheet || "").includes("genos_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
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
