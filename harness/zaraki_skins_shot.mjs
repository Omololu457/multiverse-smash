// harness/zaraki_skins_shot.mjs — apply each Zaraki creative skin live, confirm its __tag sheet renders
// (idle + a swing), spot-check that the recolor PERSISTS into Shikai (form retag), and montage the group
// into one "character-select" board. Cosmetic-only live-render proof.
//   node harness/zaraki_skins_shot.mjs [group1|group2|group3|all]
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const GROUPS = {
  group1: [["zarakiCrimsonReaper","crimsonreaper"],["zarakiFrostbitten","frostbitten"],["zarakiWildfireBells","wildfirebells"],["zarakiVerdantBlade","verdantblade"]],
  group2: [["zarakiGoldenButcher","goldenbutcher"],["zarakiNightfallRonin","nightfallronin"],["zarakiVioletOnslaught","violetonslaught"],["zarakiAshenMarshal","ashenmarshal"]],
  group3: [["zarakiVoidSovereign","voidsovereign"],["zarakiUmbral","umbral"]],
};
const arg = process.argv[2] || "group1";
const PAIRS = arg === "all" ? [...GROUPS.group1, ...GROUPS.group2, ...GROUPS.group3] : (GROUPS[arg] || GROUPS.group1);
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = [], net404 = []; page.on("pageerror", e => jsErrors.push(String(e))); page.on("response", r => { if (r.status() === 404) net404.push(r.url().split("/").pop()); });
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

await page.goto(`${base}/index.html?harness=1&p1=zaraki&p2=ichigo`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
await page.evaluate(() => window.__harness.setP2X(99999));   // clear the frame for a clean solo shot

const crops = [];
for (const [id, tag] of PAIRS) {
  await page.evaluate(s => { window.__harness.setSkin?.("p1", s); window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.fillEnergy?.(); }, id);
  await waitFrames(8);
  const idle = await p1();
  const idleOK = (idle.spriteSheet || "").includes(`__${tag}`);
  await page.keyboard.down("j"); await waitFrames(3); const swing = await p1(); await page.keyboard.up("j");
  const swingOK = (swing.spriteSheet || "").includes(`__${tag}`);
  check(`${id}: idle + swing render __${tag}`, idleOK && swingOK, `idle=${(idle.spriteSheet||"").split("/").pop()}`);
  await waitFrames(12);
  const shot = await page.evaluate(() => window.__harness.spriteCrop?.("p1"));
  crops.push({ id, dataURL: shot?.dataURL || null });
}

// Shikai-persistence spot check on the group's FIRST skin (voidsovereign for group3 handled below too)
{
  const [id, tag] = PAIRS[0];
  await page.evaluate(s => { window.__harness.setSkin?.("p1", s); }, id);
  // Up+Special (W+L) is frame-timing-fragile (a stray jump can eat it); retry until Shikai engages.
  let sh = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); window.__harness.fillEnergy?.(); });
    await page.waitForFunction(() => { const p = window.__harness.p1(); return p && p.grounded && !p.attacking; }, null, { timeout: 3000, polling: 16 }).catch(() => {});
    await page.keyboard.down("l"); await page.keyboard.down("w"); await waitFrames(4); await page.keyboard.up("w"); await page.keyboard.up("l");
    await waitFrames(34);
    sh = await p1();
    if (sh.shikaiActive) break;
  }
  check(`${id}: recolor persists into Shikai (shikai sheet is __${tag})`, sh.shikaiActive && (sh.spriteSheet || "").includes(`__${tag}`), `shikai=${sh.shikaiActive} sheet=${(sh.spriteSheet||"").split("/").pop()}`);
  await page.evaluate(() => window.__harness.setSkin?.("p1", "default"));
}

const montage = await page.evaluate(async ({ crops }) => {
  const GAP = 26, PAD = 30, LBL = 24, COLS = Math.min(4, crops.length);
  const imgs = [];
  for (const c of crops) { if (!c.dataURL) { imgs.push(null); continue; } const im = new Image(); await new Promise(r => { im.onload = r; im.src = c.dataURL; }); imgs.push(im); }
  const cellW = Math.max(...imgs.map(i => i ? i.width : 40)) + GAP;
  const cellH = Math.max(...imgs.map(i => i ? i.height : 40)) + LBL + GAP;
  const rows = Math.ceil(crops.length / COLS);
  const W = cellW * COLS + PAD * 2, H = cellH * rows + PAD * 2;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  g.fillStyle = "#141821"; g.fillRect(0, 0, W, H); g.imageSmoothingEnabled = false;
  g.textAlign = "center"; g.font = "13px monospace";
  for (let i = 0; i < crops.length; i++) {
    const r = Math.floor(i / COLS), col = i % COLS;
    const cx = PAD + col * cellW + cellW / 2, floorY = PAD + r * cellH + cellH - LBL;
    g.strokeStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.moveTo(cx - cellW / 2 + 10, floorY); g.lineTo(cx + cellW / 2 - 10, floorY); g.stroke();
    const im = imgs[i]; if (im) g.drawImage(im, cx - im.width / 2, floorY - im.height);
    g.fillStyle = "#e2e8f0"; g.fillText(crops[i].id.replace("zaraki", ""), cx, floorY + 16);
  }
  return cv.toDataURL("image/png");
}, { crops });
fs.writeFileSync(path.join(OUT, `zaraki_skins_${arg}.png`), Buffer.from(montage.split(",")[1], "base64"));
const skin404 = net404.filter(f => f.includes("__") && f.startsWith("zaraki"));
check("no 404 on skin sheets", skin404.length === 0, skin404.slice(0,4).join(", "));
check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
console.log(`\nmontage → harness/shots/zaraki_skins_${arg}.png`);
console.log(`RESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
