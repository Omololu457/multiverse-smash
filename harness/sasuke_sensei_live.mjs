// harness/sasuke_sensei_live.mjs — REAL-INPUT live verification for Sasuke (Sensei), RAITON set (Phase 1).
// Boots a real match (?p1=sasuke_sensei&p2=naruto), drives every move through real page.keyboard presses
// (j/k light/heavy, l special, u ultimate, a/d/w/s dirs), screenshots each. Energy deltas prove a move
// FIRED through input; opponent HP delta proves the Kirin ult connects. Also captures the real select screen.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.dirname(fileURLToPath(import.meta.url)).replace(/\/harness$/, "");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".json":"application/json",".m4a":"audio/mp4",".mp3":"audio/mpeg",".jpg":"image/jpeg",".jpeg":"image/jpeg",".heic":"image/heic",".svg":"image/svg+xml",".woff":"font/woff",".woff2":"font/woff2",".ttf":"font/ttf" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required", "--disable-background-timer-throttling"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on("pageerror", e => console.log("  PAGEERROR:", e.message));
const shot = n => page.screenshot({ path: path.join(OUT, `ss_${n}.png`) });
const state = () => page.evaluate(() => window.__harness.state());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
const p1 = () => page.evaluate(() => { const f = window.__harness.p1() || {}; return { key: f.key, energy: Math.round(f.energy ?? -1), health: Math.round(f.health ?? -1), x: Math.round(f.x ?? 0), grounded: f.grounded, move: f.currentMove || null, cast: f._spriteCastMove || null, sheet: (f.spriteSheet || f._lastSpriteSheet || null) }; });
const p2hp = () => page.evaluate(() => Math.round((window.__harness.p2() || {}).health ?? -1));
let FAILS = 0; const ok = (c, m) => { console.log(`  ${c ? "✅" : "❌"} ${m}`); if (!c) FAILS++; };

// ── 1) REAL SELECT SCREEN (naruto roster incl. Sasuke (Sensei)) ──
await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness && window.__harness.state, null, { timeout: 15000 });
const sel = await page.evaluate(() => window.__harness.showCharSelect("naruto", "training"));
await new Promise(r => setTimeout(r, 400));
await shot("01_select");
const selStr = JSON.stringify(sel) || "";
ok(selStr.includes("sasuke_sensei"), `select roster includes sasuke_sensei`);

// ── 2) BOOT REAL MATCH: p1=sasuke_sensei vs p2=naruto ──
await page.goto(`${base}/index.html?harness=1&p1=sasuke_sensei&p2=naruto`, { waitUntil: "load" });
await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000 });
await page.evaluate(() => window.__harness.start?.());
await shot("02_intro");
await page.evaluate(() => window.__harness.skipToBattle?.());
await page.waitForFunction(() => { const s = window.__harness.state(); return s.gameState === "battle" || s.gameState === "playing" || s.countdown <= 0; }, null, { timeout: 8000, polling: 16 }).catch(() => {});
await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
await waitFrames(4);
const boot = await p1();
console.log("after boot p1:", JSON.stringify(boot));
ok(boot.key === "sasuke_sensei", `p1 is sasuke_sensei (got ${boot.key})`);
ok(!!boot.sheet && /sasuke_sensei_idle/.test(boot.sheet), `idle renders a sprite sheet (${boot.sheet})`);
await shot("03_idle");

async function refill() { await page.evaluate(() => { window.__harness.fillEnergy?.(); window.__harness.healP2?.(); }); await waitFrames(2); }
// playwright press() is too fast for the attack buffer — use key HOLDS. Screenshot WHILE held (mid-cast).
async function special(label, dir, expectMove, shotAtFrame = 7, hold = 12) {
  await refill();
  const before = await p1();
  if (dir) { await page.keyboard.down(dir); await waitFrames(3); }
  await page.keyboard.down("l");
  await waitFrames(shotAtFrame);
  await shot(label);
  const mid = await p1();
  await waitFrames(Math.max(1, hold - shotAtFrame));
  await page.keyboard.up("l");
  if (dir) await page.keyboard.up(dir);
  await waitFrames(2);
  const after = await p1();
  const dE = after.energy - before.energy;
  console.log(`${label}: energy ${before.energy}→${after.energy} (Δ${dE}) move=${mid.move} cast=${mid.cast}`);
  ok(dE < 0, `${label} spent chakra (Δ${dE})`);
  if (expectMove) ok(mid.move === expectMove || mid.cast === expectMove, `${label} plays ${expectMove} (move=${mid.move} cast=${mid.cast})`);
  await waitFrames(40);
  return dE;
}

// ── 3) RUN ──
await refill();
await page.keyboard.down("d"); await waitFrames(14); await shot("04_run"); await page.keyboard.up("d"); await waitFrames(10);

// ── 4) LIGHT string (Attack Combo fist/kick) ──
await refill();
await page.keyboard.down("j"); await waitFrames(5); await shot("05_light"); await page.keyboard.up("j"); await waitFrames(22);

// ── 5) HEAVY (sword combo) ──
await refill(); await page.keyboard.down("k"); await waitFrames(6); await shot("06_heavy"); await page.keyboard.up("k"); await waitFrames(24);

// ── 6-10) RAITON SET ──
await special("07_chidori_N",      null, "ssChidori");        // neutral = Chidori
await special("08_chidori_eisou_F", "d", "ssChidoriEisou");   // Fwd = Chidori Eisou
await special("09_raiton_sword1_B", "a", "ssRaitonSword1");   // Back = Raiton Sword *1
// Up/Down GROUNDED directional specials: real up+special pressed together is reachable in play, but a
// sequential key-hold jumps first (up=jump) → the air branch. Verify the grounded dispatch deterministically
// via the direction hook (sets _specialHeldDir while grounded), then screenshot the cast pose.
async function specialDirect(label, dir, expectMove) {
  await refill();
  const before = await p1();
  const r = await page.evaluate(d => window.__harness.p1SpecialDir(d), dir);
  await waitFrames(6); await shot(label);
  const after = await p1();
  console.log(`${label}: energy ${before.energy}→${after.energy} (Δ${after.energy - before.energy}) move=${r?.move} cast=${r?.cast}`);
  ok(after.energy - before.energy < 0, `${label} spent chakra`);
  ok(r?.move === expectMove || r?.cast === expectMove, `${label} plays ${expectMove} (move=${r?.move} cast=${r?.cast})`);
  await waitFrames(40);
}
await specialDirect("10_raiton_sword2_U", "U", "ssRaitonSword2");   // Up = Raiton Sword *2 (launcher)
await specialDirect("11_raiton_sword3_D", "D", "ssRaitonSword3");   // Down = Raiton Sword *3 (committed)

// ── 11) ULTIMATE — Kirin (guaranteed; opponent HP must drop) ──
await waitFrames(40); await refill();
const ub = await p1(); const hb = await p2hp();
await page.keyboard.down("u"); await waitFrames(14); await shot("12_kirin_ult"); await page.keyboard.up("u"); await waitFrames(2);
await waitFrames(60);   // let the guaranteed beats land
const ua = await p1(); const ha = await p2hp();
console.log(`12_kirin_ult: p1 energy ${ub.energy}→${ua.energy} (Δ${ua.energy - ub.energy}) · p2 hp ${hb}→${ha} (Δ${ha - hb})`);
ok(ua.energy - ub.energy < 0, `Kirin spent full meter (Δ${ua.energy - ub.energy})`);
ok(ha < hb, `Kirin damaged the opponent (${hb}→${ha})`);
await shot("13_after_ult");

// ════════════ PHASE 2 — MANGEKYOU SET + SUMMONS ════════════
const summons = () => page.evaluate(() => (window.__harness.summons?.() || []).map(s => s.id));
async function refillFull() { await page.evaluate(() => { window.__harness.refill?.("p1"); window.__harness.healP2?.(); }); await waitFrames(2); }
async function waitGrounded() { for (let i = 0; i < 50; i++) { if ((await p1()).grounded) return; await waitFrames(2); } }
// the Up+Ult cycle uses Up (=jump), so always LAND before sampling a grounded special. Katon uses _spriteCastMove → read cast||move.
async function cycleSet() { await refillFull(); await page.keyboard.down("w"); await page.keyboard.down("u"); await waitFrames(4); await page.keyboard.up("u"); await page.keyboard.up("w"); await waitFrames(10); await waitGrounded(); }
const neutralSpecialMove = async () => { await refillFull(); await waitGrounded(); await waitFrames(8); await page.keyboard.down("l"); await waitFrames(8); const s = await p1(); const m = s.move || s.cast; await page.keyboard.up("l"); await waitFrames(40); return m; };

// 14) CYCLE to Mangekyou via REAL Up+Ultimate — the w+u keypress IS the cycle input under test; the
// set-change is confirmed via the reliable grounded neutral dispatch (which branches on _eyeSet).
await waitFrames(30);
await refillFull(); await waitGrounded();
const beforeCyc = await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(40);
await cycleSet();   // ← REAL Up+Ultimate (w+u) cycle
await refillFull(); await waitGrounded();
const afterCyc = await page.evaluate(() => window.__harness.p1SpecialDir(null)); await waitFrames(6); await shot("14_katon_N"); await waitFrames(34);
const bMove = beforeCyc?.move || beforeCyc?.cast, aMove = afterCyc?.move || afterCyc?.cast;
console.log(`14_cycle: neutral ${bMove} → ${aMove} (expect ssChidori → ssKatonCast)`);
ok(bMove === "ssChidori", `pre-cycle neutral = Raiton Chidori (${bMove})`);
ok(aMove === "ssKatonCast", `Up+Ult cycled to Mangekyou — neutral = Katon (${aMove})`);

// 15-17) Mangekyou directional specials via the grounded dir hook (respects _eyeSet = mangekyou)
await refillFull(); await waitGrounded();
await specialDirect("15_amaterasu_F",    "F", "ssAmaterasuCast");
await specialDirect("16_amaterasu_sword_B","B", "ssAmaterasuSword");
await specialDirect("17_genjutsu_U",     "U", "ssGenjutsuCast");

// 18) Kuchiyose: Taka (D) — a hawk summon must appear
await refillFull(); await waitGrounded();
await page.evaluate(() => { window.__harness.p1SpecialDir("D"); window.__harness.damageP2?.(1); });
await waitFrames(22); await shot("18_taka_summon");   // let the hawk sheet decode before the shot
const takaList = await summons();
console.log(`18_taka: summons = [${takaList.join(", ")}]`);
ok(takaList.includes("ssTaka"), `Kuchiyose Taka spawned a hawk summon`);
await waitFrames(70);

// 19) Mangekyou ULTIMATE — Kuchiyose: Hebi (neutral Ultimate while in Mangekyou) — serpent must appear
await page.evaluate(() => { window.__harness.resetUlt?.(); window.__harness.healP2?.(); }); await waitGrounded(); await waitFrames(2);
await page.keyboard.down("u"); await waitFrames(22); await shot("19_hebi_ult"); await page.keyboard.up("u"); await waitFrames(8);
const hebiList = await summons();
console.log(`19_hebi_ult: summons = [${hebiList.join(", ")}]`);
ok(hebiList.includes("ssHebi"), `Kuchiyose Hebi (Mangekyou ult) spawned the serpent`);
await waitFrames(60); await shot("20_hebi_active");

// 20) CYCLE back to Raiton — neutral special returns to Chidori
await cycleSet();
const backMove = await neutralSpecialMove();
console.log(`21_cycle_back: neutral special → ${backMove} (expect ssChidori)`);
ok(backMove === "ssChidori", `Up+Ult cycled back to Raiton (${backMove})`);

await browser.close(); server.close();
console.log(`\nDONE — ${FAILS} FAIL(s). shots in harness/shots/ss_*.png`);
process.exit(FAILS ? 1 : 0);
