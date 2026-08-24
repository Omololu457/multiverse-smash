// harness/kakashi.test.mjs — CANONICAL full-kit suite for Kakashi Hatake (Naruto, Ninja Council 4 rip).
// Consolidates S1 movement, S2 normals+crouchLight, S3 Y-Combo rekka, S4 Weapon Throw, S5 Kuchiyose summons
// (Pakkun companion / Nin-Dogs burst), S6 Raikiri ULT (~198 EFF), S7 Mangekyou Sharingan MODE, S9 win/lose —
// plus a full action→sheet wiring sweep and a runtime fallback-box sweep. See KAKASHI_ASSET_MAP.md.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
const projectiles = () => page.evaluate(() => window.__harness.projectiles?.() || []);
const summons = () => page.evaluate(() => window.__harness.summons?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const force = (a) => page.evaluate(act => window.__harness.forceAction(act, "p1"), a);
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
async function prep(gap) {
  await waitGrounded();
  await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.clearSummons?.(); window.__harness.mangekyouRevert?.(); window.__harness.healP2(); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap * (a.facing || 1));
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=kakashi&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  const cd = await page.evaluate(() => window.__harness.charDef("kakashi"));
  const ad = cd.animationData;

  console.log("\n── gate + stats + portrait ──");
  const g = await p1();
  check("P1 is Kakashi", g.key === "kakashi", `key=${g.key}`);
  check("renders as sprites", g.hasSpriteHandler, "");
  check("spriteScale 1.75", Math.abs((g.spriteScale || 0) - 1.75) < 0.01, `scale=${g.spriteScale}`);
  check("HP 1150 / EN 200", g.maxHealth === 1150 && g.maxEnergy === 200, `HP=${g.maxHealth} EN=${g.maxEnergy}`);
  check("universe naruto / energyType chakra", cd.traits?.energyType === "chakra" && cd.universe === "naruto", `u=${cd.universe} e=${cd.traits?.energyType}`);
  check("portrait wired → kakashi_portrait.png", (cd.portrait || "").includes("kakashi_portrait"), `portrait=${cd.portrait}`);
  check("ultimate = Raikiri (100)", cd.ultimate?.name === "Raikiri" && cd.ultimate?.cost === 100, `ult=${cd.ultimate?.name}`);
  check("specials = weaponThrow + ninDogs + pakkun", !!cd.specials?.weaponThrow && !!cd.specials?.ninDogs && !!cd.specials?.pakkun, `specials=${Object.keys(cd.specials || {}).join(",")}`);

  console.log("\n── every action sheet resolves (data wiring, no box) ──");
  const wants = {
    idle: "kakashi_idle_uniform", walk: "kakashi_walk_uniform", run: "kakashi_run_uniform", dash: "kakashi_run_uniform",
    jump: "kakashi_jump_uniform", fall: "kakashi_jump_uniform", crouch: "kakashi_crouch_uniform",
    hurt: "kakashi_hurt_uniform", knockdown: "kakashi_knockdown_uniform",
    light: "kakashi_light_uniform", heavy: "kakashi_heavy_uniform", up: "kakashi_up_uniform",
    air: "kakashi_air_uniform", down_air: "kakashi_air_uniform", crouchLight: "kakashi_crouchlight_uniform",
    kakashiCombo1: "kakashi_combo1_uniform", kakashiCombo2: "kakashi_combo2_uniform", kakashiCombo3: "kakashi_combo3_uniform",
    kakashiThrow: "kakashi_throw_uniform", kakashiThrowCrouch: "kakashi_throwcrouch_uniform", kakashiThrowAir: "kakashi_throwair_uniform",
    kakashiPakkunCast: "kakashi_pakkun_cast", kakashiNinDogsCast: "kakashi_nindogs_cast",
    kakashiRaikiriCharge: "kakashi_raikiri_charge", kakashiRaikiriDash: "kakashi_raikiri_dash", kakashiRaikiriSupport: "kakashi_raikiri_support",
    win: "kakashi_win_uniform", lose: "kakashi_lose_uniform",
  };
  for (const [k, tag] of Object.entries(wants)) check(`${k} → ${tag}`, (ad[k]?.sheet || "").includes(tag), `sheet=${ad[k]?.sheet}`);
  check("dash REUSES run / fall REUSES jump / down_air REUSES air (honest reuses)", ad.dash?.sheet === ad.run?.sheet && ad.fall?.sheet === ad.jump?.sheet && ad.down_air?.sheet === ad.air?.sheet, "");

  console.log("\n── S2: a normal connects (light ×0.60) ──");
  await prep(46); let h0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(8); await page.keyboard.up("j"); await waitFrames(12);
  check(`light connects (dmg ${(h0 - (await p2()).health).toFixed(0)})`, h0 - (await p2()).health > 0, "");

  console.log("\n── S3: Y-Combo Fwd+Heavy rekka reaches the launcher ──");
  await prep(50);
  const facing = (await p1()).facing || 1; const fwd = facing === 1 ? "d" : "a";
  const seen = new Set();
  const rec = async () => { const m = (await page.evaluate(() => window.__harness.kakashiCmd("p1")))?.move || ""; if (/^kakashiCombo[123]$/.test(m)) seen.add(m); };
  const tapK = async () => { await page.keyboard.down("k"); await waitFrames(2); await page.keyboard.up("k"); await waitFrames(1); };
  const waitCancel = async () => { await page.waitForFunction(() => { const c = window.__harness.kakashiCmd("p1"); return c && c.attacking && c.phase === "recovery" && c.connected && c.rekkaNext; }, null, { timeout: 4000, polling: 16 }).catch(() => {}); };
  await page.keyboard.down(fwd); await tapK(); await rec();
  await waitCancel(); await tapK(); for (let i = 0; i < 3; i++) { await rec(); await waitFrames(1); }
  await waitCancel(); await tapK(); for (let i = 0; i < 10; i++) { await rec(); await waitFrames(1); }
  await page.keyboard.up(fwd); await waitFrames(4);
  check("Y-Combo reached kakashiCombo3 launcher", seen.has("kakashiCombo1") && seen.has("kakashiCombo3"), [...seen].join(","));

  console.log("\n── S4: Weapon Throw spawns a kunai ──");
  await prep(150); h0 = (await p2()).health;
  const wt = await fireDir(null);
  check("standing special → kakashiThrow", (wt?.cast || "") === "kakashiThrow", `cast=${wt?.cast}`);
  let sawKunai = false; for (let i = 0; i < 20 && !sawKunai; i++) { if ((await projectiles()).some(p => (p.name || "").includes("kakashiKunai"))) sawKunai = true; await waitFrames(1); }
  check("Weapon Throw spawns a kunai projectile", sawKunai, "");
  await waitFrames(8); check(`Weapon Throw connects (dmg ${(h0 - (await p2()).health).toFixed(0)})`, h0 - (await p2()).health > 0, "");
  await waitGrounded();

  console.log("\n── S5: Kuchiyose summons — Nin-Dogs burst (F) + Pakkun companion (B) ──");
  await prep(120);
  const nd = await fireDir("F");
  check("Fwd special → Nin-Dogs cast", (nd?.cast || "") === "kakashiNinDogsCast", `cast=${nd?.cast}`);
  let sawND = false; for (let i = 0; i < 20 && !sawND; i++) { if ((await summons()).some(s => s.id === "kakashiNinDogs")) sawND = true; await waitFrames(1); }
  check("Nin-Dogs spawns the pack summon", sawND, "");
  await waitFrames(70); await waitGrounded();
  await prep(70);
  const pk = await fireDir("B");
  check("Back special → Pakkun cast", (pk?.cast || "") === "kakashiPakkunCast", `cast=${pk?.cast}`);
  let pkS = null; for (let i = 0; i < 20 && !pkS; i++) { pkS = (await summons()).find(s => s.id === "kakashiPakkun"); await waitFrames(1); }
  check("Pakkun spawns a LINGERING companion (lifetime ≥ 200)", !!pkS && pkS.lifetime >= 200, `lifetime=${pkS?.lifetime}`);
  await page.evaluate(() => window.__harness.clearSummons?.()); await waitGrounded();

  console.log("\n── S6: Raikiri ULT — guaranteed ~198 EFF from out of range ──");
  await prep(220); const hu0 = (await p2()).health;
  const ult = await page.evaluate(() => window.__harness.p1Ultimate());
  check("ULT casts Raikiri (kakashiRaikiriCharge)", ult?.cast === true && ult?.castMove === "kakashiRaikiriCharge", `cast=${ult?.cast} castMove=${ult?.castMove}`);
  let dealt = 0; for (let i = 0; i < 60; i++) { dealt = Math.max(dealt, hu0 - (await p2()).health); await waitFrames(1); }
  check(`Raikiri payoff in top-ult band (~198 EFF; 150–240): ${dealt.toFixed(0)}`, dealt >= 150 && dealt <= 240, `dealt=${dealt}`);
  await waitGrounded();

  console.log("\n── S7: Mangekyou Sharingan MODE — activates, buffs, arms the dodge ──");
  await prep(60);
  const mk = await page.evaluate(() => { const ok = window.__harness.mangekyouEnter(); const f = window.__harness.p1(); return { ok, active: f.mangekyouActive, dm: f.damageMultiplier, form: f.currentForm }; });
  check("Mangekyou activates (mangekyouActive + currentForm)", mk.active && mk.form === "mangekyou", `active=${mk.active} form=${mk.form}`);
  check("Mangekyou applies the offensive buff (dmgMult ≥ 1.1)", mk.dm >= 1.1, `dm=${mk.dm}`);
  await waitFrames(2);
  check("Mangekyou idle swaps to the ready stance", ((await p1()).spriteSheet || "").includes("kakashi_mangekyou_stance"), `sheet=${(await p1()).spriteSheet}`);
  await page.evaluate(() => window.__harness.mangekyouRevert?.());

  console.log("\n── S9: win / lose poses render ──");
  await prep(60);
  await force("win"); await waitFrames(4); const win = await p1(); await force(null);
  check("win renders kakashi_win_uniform (10f victory sequence)", (win.spriteSheet || "").includes("kakashi_win_uniform"), `sheet=${win.spriteSheet}`);
  await force("lose"); await waitFrames(4); const lose = await p1(); await force(null);
  check("lose renders kakashi_lose_uniform (DAMAGE downed frame)", (lose.spriteSheet || "").includes("kakashi_lose_uniform"), `sheet=${lose.spriteSheet}`);

  console.log("\n── runtime fallback-box sweep (no MOVEMENT/normal action renders the 128² box) ──");
  const boxHit = [];
  for (const act of ["idle", "walk", "run", "dash", "crouch", "jump", "fall", "hurt", "knockdown", "light", "heavy", "up", "air", "crouchLight", "win", "lose"]) {
    await force(act); await waitFrames(3); const r = await p1();
    if (!(r.spriteSheet || "").includes("kakashi_")) boxHit.push(`${act}:${r.spriteSheet || "null"}`);
    await force(null); await waitFrames(1);
  }
  check("every forced action resolves a real kakashi_ sheet (no procedural box)", boxHit.length === 0, boxHit.join(" | "));

  console.log("\n── no JS errors ──");
  check("no page errors during canonical run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); fail++;
} finally {
  console.log(`\n${fail === 0 ? "✅" : "❌"} Kakashi canonical: ${pass} passed, ${fail} failed`);
  await browser.close(); server.close();
  process.exit(fail ? 1 : 0);
}
