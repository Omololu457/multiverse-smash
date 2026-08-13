// harness/obito_corrections.mjs — verifies the 3 confirmed corrections with real evidence:
//   1. the dedicated Kamui INITIATION sprite plays AT the toggle-on moment (obito_kamui_activate).
//   2. the double-tap teleport-behind uses his DASH sprite (obito_dash_uniform), NOT the Kamui blink.
//   3. while intangible he is VISUALLY IDENTICAL to normal — a pixel-for-pixel crop match of the same
//      pose intangible vs not (only the one-time activation cue exists; no sustained ghost/swirl).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const kamui = () => page.evaluate(() => window.__harness.obitoKamui());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a,b]) => window.__harness.state().frame >= a+b, [s,n], { timeout: 15000, polling: 16 }); }
const crop = () => page.evaluate(() => window.__harness.spriteCrop?.("p1")?.dataURL || null);
let PASS = 0, FAIL = 0; const check = (n, c, d="") => { (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`); };
const has = (a, n) => (a?.spriteSheet || "").includes(n);
async function shot(name) { await page.screenshot({ path: path.join(OUT, `obito_corr_${name}.png`) }); }

await page.goto(`${base}/index.html?harness=1&p1=obito&p2=obito`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
await page.evaluate(() => { window.__harness.setP2X?.(99999); window.__harness.fillEnergy?.(); });   // solo

// ── 1. ACTIVATION SPRITE plays exactly at toggle-on ──
console.log("\n1. Kamui INITIATION sprite at the toggle-on moment");
await page.evaluate(() => { const k = window.__harness.obitoKamui(); if (k.intangible) window.__harness.obitoKamuiToggle(); });
await waitFrames(3);
await page.evaluate(() => window.__harness.obitoKamuiToggle());   // TOGGLE ON
await waitFrames(2);
let a = await p1();
check("activation frame → obito_kamui_activate sprite plays", has(a, "obito_kamui_activate"), `sheet=${(a.spriteSheet||"").split("/").pop()}`);
check("… and he IS now intangible", (await kamui()).intangible, "");
await shot("1_activation");

// ── 3a. after the initiation settles: INTANGIBLE but VISUALLY NORMAL ──
console.log("\n3. No sustained visual — intangible vs normal are identical");
await waitFrames(24);   // let the one-time activation pose + flash fully settle
a = await p1();
const kStillOn = await kamui();
check("still intangible after the cue settles", kStillOn.intangible && kStillOn.phased, `phased=${kStillOn.phased}`);
check("… but now rendering the NORMAL sheet (activation cue ended)", !has(a, "obito_kamui_activate"), `sheet=${(a.spriteSheet||"").split("/").pop()}`);
// static pose (guard) so the two crops are the same frame → any visual diff would show as a pixel diff
await page.keyboard.down("s"); await waitFrames(8);
const cropIntangible = await crop();
check("guard pose while intangible captured", !!cropIntangible, "");
await shot("3a_intangible");
await page.keyboard.up("s"); await waitFrames(4);

// toggle OFF, same static guard pose
await page.evaluate(() => window.__harness.obitoKamuiToggle());
await waitFrames(4);
check("toggled OFF (not intangible)", !(await kamui()).intangible, "");
await page.keyboard.down("s"); await waitFrames(8);
const cropNormal = await crop();
await page.keyboard.up("s"); await waitFrames(4);
await shot("3b_normal");

// PIXEL-IDENTICAL comparison (same encoded PNG ⇒ same pixels ⇒ zero visual difference)
check("INTANGIBLE and NORMAL are PIXEL-IDENTICAL (zero sustained visual tell)", !!cropIntangible && cropIntangible === cropNormal,
  cropIntangible === cropNormal ? "byte-identical crops" : `differ (${(cropIntangible||"").length} vs ${(cropNormal||"").length} bytes)`);
// side-by-side board
if (cropIntangible && cropNormal) {
  const sbs = await page.evaluate(async ({ a, b }) => {
    const load = u => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = u; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const G = 30, cv = document.createElement("canvas"); cv.width = ia.width + ib.width + G * 3; cv.height = Math.max(ia.height, ib.height) + 40;
    const g = cv.getContext("2d"); g.fillStyle = "#141821"; g.fillRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = false;
    g.fillStyle = "#e8e8f0"; g.font = "bold 13px monospace";
    g.fillText("INTANGIBLE", G, 20); g.fillText("NORMAL", ia.width + G * 2, 20);
    g.drawImage(ia, G, 34); g.drawImage(ib, ia.width + G * 2, 34);
    return cv.toDataURL("image/png");
  }, { a: cropIntangible, b: cropNormal });
  fs.writeFileSync(path.join(OUT, "obito_corr_3_sidebyside.png"), Buffer.from(sbs.split(",")[1], "base64"));
}

// ── 2. DOUBLE-TAP TELEPORT-BEHIND uses the DASH sprite ──
console.log("\n2. Double-tap teleport-behind uses the DASH sprite (not Kamui blink)");
await page.evaluate(() => { window.__harness.healP1?.(); window.__harness.resetFighterInput?.("p1"); const p = window.__harness.p1(); window.__harness.setP2X(p.x + 220); });
await page.waitForFunction(() => window.__harness.p1().grounded, null, { timeout: 4000 }).catch(()=>{});
await waitFrames(4);
await page.keyboard.down("d"); await sleep(26); await page.keyboard.up("d"); await sleep(30);
await page.keyboard.down("d"); await sleep(26); await page.keyboard.up("d");
let flash = 0, sawDash = false, sawTeleport = false;
for (let i = 0; i < 16; i++) { const p = await p1(); flash = Math.max(flash, p.teleportFlash); if (has(p, "obito_dash_uniform")) sawDash = true; if (has(p, "obito_teleport_uniform")) sawTeleport = true; if (flash > 0 && sawDash) { await shot("2_teleport_dash"); break; } await waitFrames(1); }
check("teleport-behind fires (teleportFlash > 0)", flash > 0, `teleportFlash=${flash}`);
check("… uses the DASH sprite (obito_dash_uniform)", sawDash, `sawDash=${sawDash}`);
check("… and does NOT use the Kamui blink (obito_teleport_uniform)", !sawTeleport, `sawTeleport=${sawTeleport}`);

console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — shots in harness/shots/obito_corr_*.png`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
