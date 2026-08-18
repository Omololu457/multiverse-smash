// harness/aoi_todo_stage5.mjs — STAGE 5: Aoi Todo's BOOGIE WOOGIE tag-partner swap system (centerpiece).
// Clap = Charge + dir. Verifies EVERY resolved use + cameo co-op + Black Flash:
//   • Charge+Up → summon Yuji (renders yuji art); again → Boogie-swap Todo↔Yuji (+ arms Black Flash)
//   • Charge+Down → summon Gojo; both cameos can be out at once
//   • Charge+Fwd → ENEMY-SWAP Todo↔opponent (+ arms Black Flash)
//   • Charge+Back → FAKE CLAP (pose, NO swap, does NOT arm Black Flash)
//   • Charge neutral → SELF-SWAP (marker drop → teleport, arms Black Flash); with cameos out → SWAP-OUT (dismiss)
//   • cameo persists + strikes opponent (co-op) ; Black Flash upgrades the next clean strike (bonus dmg + count)
// Deterministic via __harness.todoClap(dir) + __harness.todoState().
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const clap = (dir) => page.evaluate(d => window.__harness.todoClap(d), dir);
const tstate = () => page.evaluate(() => window.__harness.todoState());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);
const shot = n => page.screenshot({ path: path.join(OUT, `aoi_todo_s5_${n}.png`) });
async function setupAdjacent(gap = 60) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.clearSummons?.(); window.__harness.fillEnergy?.(); });   // Boogie meter full (claps cost meter now)
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.setP2Invuln?.(0); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=aoi_todo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  section("cameo swap-IN (Charge+Up = Yuji, Charge+Down = Gojo) — persistent tag-partners on field");
  await setupAdjacent(90);
  await clap("U"); await waitFrames(2);
  let st = await tstate();
  check("Charge+Up summons Yuji cameo", st.yuji, `cameos=${JSON.stringify(st.cameos.map(c => c.id))}`);
  check("Yuji cameo renders Yuji's own art", (st.cameos.find(c => c.id === "aoiTodoYuji")?.sheet || "").includes("yuji_"), `sheet=${st.cameos.find(c => c.id === "aoiTodoYuji")?.sheet}`);
  check("clap plays todoClap pose", st.castMove === "todoClap", `cast=${st.castMove}`);
  await clap("D"); await waitFrames(2);
  st = await tstate();
  check("Charge+Down summons Gojo cameo", st.gojo, `cameos=${JSON.stringify(st.cameos.map(c => c.id))}`);
  check("BOTH cameos can be on field at once", st.yuji && st.gojo, `yuji=${st.yuji} gojo=${st.gojo}`);
  check("Gojo cameo renders Gojo's own art", (st.cameos.find(c => c.id === "aoiTodoGojo")?.sheet || "").includes("gojo_"), `sheet=${st.cameos.find(c => c.id === "aoiTodoGojo")?.sheet}`);
  await waitFrames(6); await shot("cameos_both");

  section("co-op: a cameo persists + strikes the opponent (extends Todo's pressure)");
  await setupAdjacent(70);
  const coHp0 = (await p2()).health;
  await clap("U"); // Yuji
  await waitFrames(150); // let Yuji rush in + strike on its interval
  const coHp1 = (await p2()).health;
  check("cameo autonomously damages the opponent (co-op)", coHp1 < coHp0, `hp ${coHp0} → ${coHp1} (−${(coHp0 - coHp1).toFixed(0)})`);
  await shot("coop_strike");

  section("Boogie-SWAP Todo↔cameo (Charge+Up while Yuji out) — exchanges positions + ARMS Black Flash");
  await setupAdjacent(120);
  await clap("U"); await waitFrames(6);  // Yuji out (rushing toward opp)
  let before = await tstate();
  const yjX = before.cameos.find(c => c.id === "aoiTodoYuji")?.x;
  const todoX0 = before.x;
  await clap("U"); await waitFrames(2);  // swap Todo↔Yuji
  let after = await tstate();
  check("Todo teleports to Yuji's location (position swap)", Math.abs(after.x - yjX) < 60 && Math.abs(after.x - todoX0) > 20, `todo ${todoX0} → ${after.x}, yuji was ${yjX}`);
  check("Boogie-swap ARMS Black Flash", after.blackFlash > 0, `blackFlash=${after.blackFlash}`);

  section("ENEMY-SWAP (Charge+Fwd) — exchanges Todo↔opponent positions + ARMS Black Flash");
  await setupAdjacent(80);
  const tX = (await p1()).x, oX = (await p2()).x;
  await clap("F"); await waitFrames(2);
  const tX2 = (await p1()).x, oX2 = (await p2()).x;
  check("Todo and opponent swap positions", Math.abs(tX2 - oX) < 40 && Math.abs(oX2 - tX) < 40, `todo ${tX}→${tX2}, opp ${oX}→${oX2}`);
  check("enemy-swap ARMS Black Flash", (await tstate()).blackFlash > 0, `blackFlash=${(await tstate()).blackFlash}`);
  await shot("enemy_swap");

  section("FAKE CLAP (Charge+Back) — plays the clap pose, NO swap, does NOT arm Black Flash (bluff)");
  await setupAdjacent(80);
  await waitFrames(30);   // let any prior swap's Black-Flash window fully expire (clean-slate isolation)
  const fX = (await p1()).x, foX = (await p2()).x;
  const r = await clap("B"); await waitFrames(2);
  const fX2 = (await p1()).x, foX2 = (await p2()).x;
  check("fake clap does NOT move anyone", Math.abs(fX2 - fX) < 2 && Math.abs(foX2 - foX) < 2, `todo ${fX}→${fX2}, opp ${foX}→${foX2}`);
  check("fake clap does NOT arm Black Flash", (await tstate()).blackFlash === 0, `blackFlash=${(await tstate()).blackFlash}`);
  check("fake clap still plays the clap pose (indistinguishable bluff)", r.castMove === "todoClap" && r.fakeClap > 0, `cast=${r.castMove} fake=${r.fakeClap}`);

  section("SELF-SWAP (Charge neutral, no cameo) — marker drop → teleport back + arms Black Flash");
  await setupAdjacent(80);
  const r1 = await clap("N"); await waitFrames(2);
  check("first neutral clap DROPS a marker (no swap yet)", r1.mark != null && r1.lastSwap == null, `mark=${r1.mark} lastSwap=${r1.lastSwap}`);
  await page.evaluate(() => window.__harness.setP1X(window.__harness.p1().x + 120)); await waitFrames(2);  // walk away
  const movedX = (await p1()).x;
  const r2 = await clap("N"); await waitFrames(2);
  const backX = (await p1()).x;
  check("second neutral clap TELEPORTS Todo to the marker", Math.abs(backX - movedX) > 60, `x ${movedX} → ${backX}`);
  check("self-swap ARMS Black Flash", (await tstate()).blackFlash > 0, `blackFlash=${(await tstate()).blackFlash}`);

  section("cameo SWAP-OUT (Charge neutral while cameos out) — dismiss all cameos → Todo alone");
  await setupAdjacent(80);
  await clap("U"); await waitFrames(2); await clap("D"); await waitFrames(2);
  check("both cameos summoned", (await tstate()).yuji && (await tstate()).gojo, "");
  await clap("N"); await waitFrames(12);   // neutral clap dismisses (lifetime clamped → despawn)
  const outSt = await tstate();
  check("neutral clap swaps OUT all cameos (Todo alone)", !outSt.yuji && !outSt.gojo, `cameos=${JSON.stringify(outSt.cameos.map(c => c.id))}`);

  section("BLACK FLASH — a strike within the post-swap window is upgraded (bonus dmg + count)");
  await setupAdjacent(48);
  // Self-swap in place (marker at current x → swap back to same x) arms the window WITHOUT moving → stays adjacent.
  await clap("N"); await waitFrames(1); await clap("N"); await waitFrames(1);
  const bfArmed = (await tstate()).blackFlash;
  const bhHp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j");  // light within the window
  await waitFrames(10);
  const bfSt = await tstate();
  const bhHp1 = (await p2()).health;
  check("Black Flash window was armed by the swap", bfArmed > 0, `window=${bfArmed}`);
  check("a strike in-window triggers Black Flash (count++)", bfSt.bfCount > 0, `bfCount=${bfSt.bfCount} bfFx=${bfSt.bfFx}`);
  // a normal light is ~27 dmg; Black Flash adds ~0.9× more (≈ +25) → total clearly > a plain light.
  check("Black Flash deals BONUS damage (> a plain light)", (bhHp0 - bhHp1) > 40, `−${(bhHp0 - bhHp1).toFixed(0)} (plain light ≈27)`);
  await shot("black_flash");

  section("no JS errors");
  check("no page errors during Stage 5", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error("HARNESS ERROR", e); FAIL++;
} finally {
  console.log(`\n${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
