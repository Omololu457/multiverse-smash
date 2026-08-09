// harness/ichigo_skins_shot.mjs — apply each Ichigo creative skin live, confirm its __tag sheet renders
// across multiple frames (idle + a swing), and capture a per-skin in-match crop, then montage all 12
// together (the "combined character-select" deliverable). Cosmetic-only live-render proof.
//   node harness/ichigo_skins_shot.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const PAIRS = [
  ["ichigoCrimsonReaper", "crimsonreaper"], ["ichigoVerdantBlade", "verdantblade"],
  ["ichigoFrostShinigami", "frostshinigami"], ["ichigoTwilightContrast", "twilightcontrast"],
  ["ichigoRoseRequiem", "roserequiem"], ["ichigoAmberRonin", "amberronin"],
  ["ichigoSilverFrost", "silverfrost"], ["ichigoEmberGuard", "emberguard"],
  ["ichigoRoyalZangetsu", "royalzangetsu"], ["ichigoVoidWalker", "voidwalker"],
  ["ichigoAutumnTide", "autumntide"], ["ichigoEmeraldGhost", "emeraldghost"],
];
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

await page.goto(`${base}/index.html?harness=1&p1=ichigo&p2=maki`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
await page.evaluate(() => window.__harness.setP2X(99999));   // clear the frame for a clean solo shot

const crops = [];
for (const [id, tag] of PAIRS) {
  await page.evaluate(s => { window.__harness.setSkin?.("p1", s); window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); }, id);
  await waitFrames(8);
  const idle = await p1();
  const idleOK = (idle.spriteSheet || "").includes(`__${tag}`);
  await page.keyboard.down("j"); await waitFrames(3); const swing = await p1(); await page.keyboard.up("j");
  const swingOK = (swing.spriteSheet || "").includes(`__${tag}`);
  check(`${id}: idle + swing render the __${tag} sheet`, idleOK && swingOK, `idle=${idle.spriteSheet} swing=${swing.spriteSheet}`);
  await waitFrames(10);
  const shot = await page.evaluate(() => window.__harness.spriteCrop?.("p1"));
  crops.push({ id, dataURL: shot?.dataURL || null });
}

// montage all 12 crops feet-aligned in a 6-per-row grid (combined "select" board)
const montage = await page.evaluate(async ({ crops }) => {
  const GAP = 26, PAD = 30, LBL = 24, COLS = 6;
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
    g.fillStyle = "#e2e8f0"; g.fillText(crops[i].id.replace("ichigo", ""), cx, floorY + 16);
  }
  return cv.toDataURL("image/png");
}, { crops });
fs.writeFileSync(path.join(OUT, "ichigo_skins_all12.png"), Buffer.from(montage.split(",")[1], "base64"));
check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
console.log(`\nmontage → harness/shots/ichigo_skins_all12.png`);
console.log(`RESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
