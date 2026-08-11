// harness/toji_skins_shot.mjs — apply each Toji creative skin LIVE, confirm its __tag sheet renders across
// multiple frames (idle + punch + a sword special + a chain frame — proving the recolor tracks combat poses),
// then montage all rendered skins together (the combined "character-select" board). Cosmetic-only proof.
// Only skins currently registered in skins.js render their __tag; the rest are skipped (so this one file
// works for group 1/2/3 as they land). Usage: node harness/toji_skins_shot.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const PAIRS = [
  ["tojiPrime", "prime"], ["tojiRoyalValkyrie", "royalvalkyrie"], ["tojiMirageWyrm", "miragewyrm"], ["tojiCrimsonFang", "crimsonfang"],
  ["tojiCobaltKiller", "cobaltkiller"], ["tojiEmeraldRonin", "emeraldronin"], ["tojiAmethystBlade", "amethystblade"], ["tojiAshenVeteran", "ashenveteran"],
  ["tojiIvoryReaper", "ivoryreaper"], ["tojiGoldenMerc", "goldenmerc"], ["tojiTealPhantom", "tealphantom"], ["tojiVoidKiller", "voidkiller"],
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
const sheet = async () => (await p1()).spriteSheet || "";

await page.goto(`${base}/index.html?harness=1&p1=toji&p2=maki`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
await page.evaluate(() => window.__harness.setP2X(99999));

const crops = [];
for (const [id, tag] of PAIRS) {
  await page.evaluate(s => { window.__harness.setSkin?.("p1", s); window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); }, id);
  await waitFrames(8);
  const idle = await sheet();
  if (!idle.includes(`__${tag}`)) { console.log(`  · ${id} not registered yet — skipped`); continue; }
  // idle already confirmed; now punch (punch sheet) + sword special (Neutral Special) + a chain part
  await page.keyboard.down("j"); await waitFrames(3); const punch = await sheet(); await page.keyboard.up("j"); await waitFrames(10);
  await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(4); const sword = await sheet(); await waitFrames(20);
  await page.keyboard.down("d"); await page.keyboard.down("l"); await waitFrames(2); await page.keyboard.up("l"); await waitFrames(6); const chain = await sheet(); await page.keyboard.up("d"); await waitFrames(30);
  const allTagged = [idle, punch, sword, chain].every(s => s.includes(`__${tag}`) || s.includes("toji_"));
  const tagged = [idle, punch, sword, chain].filter(s => s.includes(`__${tag}`)).length;
  check(`${id}: __${tag} renders across idle/punch/sword/chain`, idle.includes(`__${tag}`) && tagged >= 3, `${tagged}/4 tagged (idle=${idle.split("/").pop()})`);
  await page.evaluate(() => window.__harness.healP1?.());
  await waitFrames(6);
  const shot = await page.evaluate(() => window.__harness.spriteCrop?.("p1"));
  crops.push({ id, dataURL: shot?.dataURL || null });
}

if (crops.length) {
  const montage = await page.evaluate(async ({ crops }) => {
    const GAP = 26, PAD = 30, LBL = 22, COLS = 4;
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
      g.fillStyle = "#e2e8f0"; g.fillText(crops[i].id.replace("toji", ""), cx, floorY + 15);
    }
    return cv.toDataURL("image/png");
  }, { crops });
  const outName = crops.length >= 12 ? "toji_skins_all12.png" : `toji_skins_${crops.length}.png`;
  fs.writeFileSync(path.join(OUT, outName), Buffer.from(montage.split(",")[1], "base64"));
  console.log(`\nmontage (${crops.length}) → harness/shots/${outName}`);
}
check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
console.log(`RESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
