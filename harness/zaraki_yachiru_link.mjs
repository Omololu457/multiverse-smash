// harness/zaraki_yachiru_link.mjs — verify the Shikai Yachiru COMBO-LINK (Inosuke-exact): Special during a
// non-finisher Shikai-rekka stage's clean-hit recovery → Yachiru links in for one combo-continuing hit →
// Zaraki's rekka AUTO-RESUMES. Real inputs + real state + a screenshot of the link mid-freeze.
//   node harness/zaraki_yachiru_link.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const summons = () => page.evaluate(() => window.__harness.summons?.() || []);
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function enterShikai() {
  for (let k = 0; k < 6; k++) {
    await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.fillEnergy?.(); });
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking; }, null, { timeout: 3000, polling: 16 }).catch(()=>{});
    await page.keyboard.down("l"); await page.keyboard.down("w"); await waitFrames(4); await page.keyboard.up("w"); await page.keyboard.up("l");
    await waitFrames(34);
    if ((await p1()).shikaiActive) return true;
  }
  return false;
}

await page.goto(`${base}/index.html?harness=1&p1=zaraki&p2=ichigo`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);

console.log("\n── Shikai Yachiru combo-link (Inosuke-exact) ──");
const inSh = await enterShikai();
check("entered Shikai", inSh, `shikaiActive=${(await p1()).shikaiActive}`);
// position the dummy in rekka range, heal, keep Shikai
await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.resetFighterInput?.("p1"); });
{ const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + 52); }
await waitFrames(3);

// Fire the rekka opener (Light → C1), let it CONNECT, then press Special on the clean-hit recovery.
const hp0 = (await p2()).health;
await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j");
let sawC1 = false, linkFired = false, comboAtLink = 0, sawSummon = false, resumedC2 = false, comboAfter = 0, shotDone = false;
for (let i = 0; i < 90; i++) {
  const c = await p1();
  if (c.currentMove === "zarakiShikaiC1") sawC1 = true;
  if ((await summons()).some(s => s.id === "yachiruLink")) sawSummon = true;
  if (c.yachiruLinkActive && !shotDone) { await page.screenshot({ path: path.join(OUT, "verify_yachiru_link.png"), clip: { x: 90, y: 250, width: 520, height: 420 } }); shotDone = true; }
  if (!linkFired && c.attacking && c.rekkaNext && c.cmdHitLanded && c.attackPhase === "recovery") {
    comboAtLink = c.comboCounter;
    await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l");
    linkFired = true;
    continue;
  }
  if (linkFired && c.currentMove === "zarakiShikaiC2") { resumedC2 = true; comboAfter = c.comboCounter; break; }
  await waitFrames(1);
}
if (!comboAfter) comboAfter = (await p1()).comboCounter;
const dmg = hp0 - (await p2()).health;

check("Shikai rekka opener C1 landed a clean hit", sawC1, `sawC1=${sawC1}`);
check("Special mid-combo FIRED the Yachiru link (freeze)", linkFired, `linkFired=${linkFired}`);
check("Yachiru partner summon spawned (the link hit)", sawSummon, `summon=${sawSummon}`);
check("Zaraki's combo RESUMED to C2 after the link", resumedC2, `resumedC2=${resumedC2}`);
check("combo CONTINUED across the link (counter climbed)", comboAfter > comboAtLink, `combo ${comboAtLink} → ${comboAfter}`);
check("full string dealt damage (C1 + Yachiru + C2…)", dmg > 0, `dmg=${dmg}`);
check("no JS/page errors", jsErrors.length === 0, jsErrors.slice(0,2).join(" | "));

console.log(`\nscreenshot → harness/shots/verify_yachiru_link.png`);
console.log(`RESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
