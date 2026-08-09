// harness/obito_skins_shot.mjs — Obito creative-skin verification + montage.
// For each registered skin: applies it, asserts idle + a swing + a special-cast pose all render the
// recolored __<tag> sheet (never the default / a fallback box), asserts NO 404 on the recolored sheets,
// and captures a feet-aligned crop. Builds a labeled montage (the "select board").
// Usage: node harness/obito_skins_shot.mjs [g1|g2|g3|all]   (default all)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;

const ALL = [
  ["obitoOmnitrix","omnitrix","Omnitrix Protocol","g1"], ["obitoAlbedo","albedo","Albedo Protocol","g1"],
  ["obitoCrimsonEye","crimsoneye","Crimson Eye","g1"],   ["obitoCobalt","cobalt","Cobalt Mask","g1"],
  ["obitoGoldenEye","goldeneye","Golden Eye","g2"],      ["obitoAmethyst","amethyst","Amethyst Void","g2"],
  ["obitoAshen","ashen","Ashen Mask","g2"],              ["obitoIvory","ivory","Ivory Eye","g2"],
  ["obitoTeal","teal","Teal Mask","g3"],                 ["obitoSunfire","sunfire","Sunfire Eye","g3"],
  ["obitoVoid","void","Void Mask","g3"],                 ["obitoStorm","storm","Storm Eye","g3"],
];
const group = process.argv[2] || "all";
const PAIRS = ALL.filter(p => group === "all" || p[3] === group);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const net404 = []; page.on("response", r => { if (r.status() === 404 && r.url().includes("obito")) net404.push(r.url().split("/").pop()); });
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a,b]) => window.__harness.state().frame >= a+b, [s,n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d="") => { (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${n}${d?`  — ${d}`:""}`); };

await page.goto(`${base}/index.html?harness=1&p1=obito`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
await page.evaluate(() => window.__harness.setP2X?.(99999));   // clear frame for solo crops

const crops = [];
for (const [id, tag, name] of PAIRS) {
  await page.evaluate(s => { window.__harness.setSkin?.("p1", s); window.__harness.resetFighterInput?.("p1"); window.__harness.healP1?.(); }, id);
  await waitFrames(8);
  const idle = await p1();
  const idleOK = (idle.spriteSheet || "").includes(`__${tag}`);
  await page.keyboard.down("j"); await waitFrames(3); const swing = await p1(); await page.keyboard.up("j");
  const swingOK = (swing.spriteSheet || "").includes(`__${tag}`);
  await waitFrames(6);
  const castInfo = await page.evaluate(() => window.__harness.p1SpecialDir("F"));   // rod cast pose
  await waitFrames(2); const cast = await p1();
  const castOK = (cast.spriteSheet || "").includes(`__${tag}`);
  check(`${name}: idle+swing+cast render __${tag}`, idleOK && swingOK && castOK, `idle=${(idle.spriteSheet||"").split("/").pop()} swing=${(swing.spriteSheet||"").split("/").pop()} cast=${(cast.spriteSheet||"").split("/").pop()}`);
  await waitFrames(8);
  const shot = await page.evaluate(() => window.__harness.spriteCrop?.("p1"));
  crops.push({ id, name, dataURL: shot?.dataURL || null });
}

// labeled montage (select board)
const montage = await page.evaluate(async ({ crops, cols }) => {
  const GAP = 22, PAD = 26, LBL = 22;
  const imgs = [];
  for (const c of crops) { if (!c.dataURL) { imgs.push(null); continue; } const im = new Image(); await new Promise(r => { im.onload = r; im.src = c.dataURL; }); imgs.push(im); }
  const cellW = Math.max(40, ...imgs.map(i => i ? i.width : 40)) + GAP;
  const cellH = Math.max(40, ...imgs.map(i => i ? i.height : 40)) + LBL + GAP;
  const rows = Math.ceil(crops.length / cols);
  const W = cellW * cols + PAD * 2, H = cellH * rows + PAD * 2;
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H; const g = cv.getContext("2d");
  g.fillStyle = "#141821"; g.fillRect(0, 0, W, H); g.imageSmoothingEnabled = false;
  g.font = "bold 14px monospace"; g.textAlign = "center";
  crops.forEach((c, i) => {
    const cx = PAD + (i % cols) * cellW + cellW / 2, cy = PAD + Math.floor(i / cols) * cellH;
    const im = imgs[i];
    if (im) g.drawImage(im, cx - im.width / 2, cy + LBL, im.width, im.height);
    g.fillStyle = "#e8e8f0"; g.fillText(c.name, cx, cy + 14);
  });
  return cv.toDataURL("image/png");
}, { crops, cols: PAIRS.length <= 4 ? 4 : 6 });
const outName = `obito_skins_${group}.png`;
fs.writeFileSync(path.join(OUT, outName), Buffer.from(montage.split(",")[1], "base64"));

check("no 404 on recolored sheets", net404.length === 0, net404.slice(0,4).join(", "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail — montage: harness/shots/${outName}`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
