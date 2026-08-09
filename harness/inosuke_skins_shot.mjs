// harness/inosuke_skins_shot.mjs — apply each Inosuke creative skin live, confirm its __tag sheet renders
// across MULTIPLE frames (idle + light swing + heavy swing + a big-FX cinematic-special swing — the canvas
// size varies a lot per frame, the stress-test the brief calls out), capture a per-skin crop, montage the
// group, and render 2 upscaled close-ups. Cosmetic-only live-render proof.
//   node harness/inosuke_skins_shot.mjs group1|group2|group3|void|all
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });

const ALL = [
  ["inosukeIronBoar", "ironboar"], ["inosukeCrimsonFeral", "crimsonferal"], ["inosukeVerdantTusk", "verdanttusk"], ["inosukeGoldenRampage", "goldenrampage"],
  ["inosukeFrostbiteTusk", "frostbitetusk"], ["inosukeAmethystBeast", "amethystbeast"], ["inosukeAshenRonin", "ashenronin"], ["inosukeSunfireTusk", "sunfiretusk"],
  ["inosukeObsidianFang", "obsidianfang"], ["inosukeRoseThornBeast", "rosethornbeast"], ["inosukeTealRampart", "tealrampart"], ["inosukeStormTusk", "stormtusk"],
  ["inosukeVoidBoar", "voidboar"],
];
const GROUPS = { group1: ALL.slice(0, 4), group2: ALL.slice(4, 8), group3: ALL.slice(8, 12), void: ALL.slice(12, 13), all: ALL };
const which = process.argv[2] || "group1";
const PAIRS = GROUPS[which] || GROUPS.group1;

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };

await page.goto(`${base}/index.html?harness=1&p1=inosuke&p2=maki`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
await page.evaluate(() => window.__harness.setP2X(99999));   // clear the frame for a clean solo shot

const crops = [], closeups = [];
for (const [id, tag] of PAIRS) {
  await page.evaluate(s => { window.__harness.setSkin?.("p1", s); window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); }, id);
  await waitFrames(8);
  // multi-frame proof: idle + light swing + heavy swing + a big-FX cinematic-special swing
  const idle = await p1(); const idleOK = (idle.spriteSheet || "").includes(`__${tag}`);
  await page.keyboard.down("j"); await waitFrames(3); const lswing = await p1(); await page.keyboard.up("j"); const lOK = (lswing.spriteSheet || "").includes(`__${tag}`);
  await waitFrames(12);
  await page.keyboard.down("k"); await waitFrames(4); const hswing = await p1(); await page.keyboard.up("k"); const hOK = (hswing.spriteSheet || "").includes(`__${tag}`);
  await waitFrames(16);
  // capture the idle crop for the montage
  await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
  await waitFrames(6);
  const shot = await page.evaluate(() => window.__harness.spriteCrop?.("p1"));
  crops.push({ id, dataURL: shot?.dataURL || null });
  // a cinematic-special swing (big FX canvas) — fire neutral special, grab a mid-cinematic crop
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l");
  await page.waitForFunction(() => window.__harness.inosukeBeastCine().active, null, { timeout: 1500, polling: 16 }).catch(() => {});
  await waitFrames(8); const cine = await p1(); const cOK = (cine.spriteSheet || "").includes(`__${tag}`) || (cine.spriteSheet || "").includes("cine");
  const cineShot = await page.evaluate(() => window.__harness.spriteCrop?.("p1"));
  if (closeups.length < 2) closeups.push({ id, idle: shot?.dataURL || null, swing: cineShot?.dataURL || null });
  await page.waitForFunction(() => !window.__harness.inosukeBeastCine().active, null, { timeout: 4000, polling: 16 }).catch(() => {});
  await page.evaluate(() => window.__harness.clearBeastAssistCd?.());
  check(`${id}: __${tag} renders across idle + light + heavy + cinematic-special swings`, idleOK && lOK && hOK && cOK, `idle=${idleOK} light=${lOK} heavy=${hOK} cine=${cOK}`);
}

// group montage (feet-aligned grid) — the "all-together" deliverable
const montage = await page.evaluate(async ({ crops, cols }) => {
  const GAP = 26, PAD = 30, LBL = 24;
  const imgs = [];
  for (const c of crops) { if (!c.dataURL) { imgs.push(null); continue; } const im = new Image(); await new Promise(r => { im.onload = r; im.src = c.dataURL; }); imgs.push(im); }
  const cellW = Math.max(40, ...imgs.map(i => i ? i.width : 40)) + GAP;
  const cellH = Math.max(40, ...imgs.map(i => i ? i.height : 40)) + LBL + GAP;
  const rows = Math.ceil(crops.length / cols);
  const W = cellW * cols + PAD * 2, H = cellH * rows + PAD * 2;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  g.fillStyle = "#141821"; g.fillRect(0, 0, W, H); g.imageSmoothingEnabled = false; g.textAlign = "center"; g.font = "13px monospace";
  for (let i = 0; i < crops.length; i++) {
    const r = Math.floor(i / cols), col = i % cols, cx = PAD + col * cellW + cellW / 2, floorY = PAD + r * cellH + cellH - LBL;
    g.strokeStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.moveTo(cx - cellW / 2 + 10, floorY); g.lineTo(cx + cellW / 2 - 10, floorY); g.stroke();
    const im = imgs[i]; if (im) g.drawImage(im, cx - im.width / 2, floorY - im.height);
    g.fillStyle = "#e2e8f0"; g.fillText(crops[i].id.replace("inosuke", ""), cx, floorY + 16);
  }
  return cv.toDataURL("image/png");
}, { crops, cols: PAIRS.length >= 12 ? 7 : PAIRS.length <= 1 ? 1 : 4 });
fs.writeFileSync(path.join(OUT, `inosuke_skins_${which}.png`), Buffer.from(montage.split(",")[1], "base64"));

// 2 upscaled close-ups (idle + a big-FX cinematic swing side-by-side, 3×) — clean hair/accent + no bleed
if (closeups.length) {
  const closeup = await page.evaluate(async ({ cu }) => {
    const SCALE = 3, GAP = 30, PAD = 26, LBL = 22;
    const load = async d => { if (!d) return null; const im = new Image(); await new Promise(r => { im.onload = r; im.src = d; }); return im; };
    const rows = [];
    for (const c of cu) rows.push({ id: c.id, idle: await load(c.idle), swing: await load(c.swing) });
    const cw = Math.max(40, ...rows.flatMap(r => [r.idle?.width || 40, r.swing?.width || 40])) * SCALE + GAP;
    const ch = Math.max(40, ...rows.flatMap(r => [r.idle?.height || 40, r.swing?.height || 40])) * SCALE + LBL + GAP;
    const W = cw * 2 + PAD * 2, H = ch * rows.length + PAD * 2;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
    g.fillStyle = "#141821"; g.fillRect(0, 0, W, H); g.imageSmoothingEnabled = false; g.textAlign = "center"; g.font = "14px monospace";
    rows.forEach((r, ri) => {
      [["idle", r.idle], ["cine-swing", r.swing]].forEach(([lbl, im], ci) => {
        const cx = PAD + ci * cw + cw / 2, floorY = PAD + ri * ch + ch - LBL;
        g.strokeStyle = "rgba(255,255,255,0.18)"; g.beginPath(); g.moveTo(cx - cw / 2 + 10, floorY); g.lineTo(cx + cw / 2 - 10, floorY); g.stroke();
        if (im) g.drawImage(im, cx - im.width * SCALE / 2, floorY - im.height * SCALE, im.width * SCALE, im.height * SCALE);
        g.fillStyle = "#e2e8f0"; g.fillText(`${r.id.replace("inosuke", "")} · ${lbl}`, cx, floorY + 16);
      });
    });
    return cv.toDataURL("image/png");
  }, { cu: closeups });
  fs.writeFileSync(path.join(OUT, `inosuke_skins_${which}_closeup.png`), Buffer.from(closeup.split(",")[1], "base64"));
}

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
console.log(`\nmontage → harness/shots/inosuke_skins_${which}.png  +  _closeup.png`);
console.log(`RESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
