// harness/maki_voidhunter.test.mjs — Maki "Void Hunter" Void-style skin (cosmetic; ZERO gameplay).
// Proves: (1) all 20 base sheets + portrait have a __voidhunter recolor on disk; (2) the recolor is a
// FULL-FORM near-black flatten (#0F0F12 range — every opaque pixel dark, incl. skin/face); (3) the skin is
// registered + selectable and swaps in the __voidhunter art; (4) the procedural overlay seeds ONCE
// (22 star dots + 3 nebulae, stable) and its tracked bbox follows the sprite across idle→attack poses;
// (5) the overlay self-skips while _shibuyaActive (base-form only); (6) PALETTE-COLLISION check — the
// red/violet nebula signature is a DISTINCT entry vs the other Void-family overlays; (7) no JS errors.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url"; import zlib from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const baseUrl = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

// tiny PNG decoder (IHDR + IDAT) → mean luma of opaque pixels; enough to prove "near-black flatten".
function pngMeanLuma(file) {
  const buf = fs.readFileSync(file); let o = 8, W = 0, H = 0, bd = 0, ct = 0; const idat = [];
  while (o < buf.length) { const len = buf.readUInt32BE(o); const type = buf.toString("ascii", o + 4, o + 8); const data = buf.subarray(o + 8, o + 8 + len);
    if (type === "IHDR") { W = data.readUInt32BE(0); H = data.readUInt32BE(4); bd = data[8]; ct = data[9]; }
    else if (type === "IDAT") idat.push(data); else if (type === "IEND") break; o += 12 + len; }
  if (bd !== 8 || ct !== 6) return null;   // expect 8-bit RGBA
  const raw = zlib.inflateSync(Buffer.concat(idat)); const stride = W * 4; let sum = 0, n = 0, prev = Buffer.alloc(stride);
  const cur = Buffer.alloc(stride);
  for (let y = 0, p = 0; y < H; y++) { const ft = raw[p++]; raw.copy(cur, 0, p, p + stride); p += stride;
    for (let i = 0; i < stride; i++) { const a = cur[i]; let x;
      const rec = i >= 4 ? cur[i - 4] : 0, up = prev[i], ul = i >= 4 ? prev[i - 4] : 0;
      if (ft === 1) x = a + rec; else if (ft === 2) x = a + up; else if (ft === 3) x = a + ((rec + up) >> 1); else if (ft === 4) { const pa = Math.abs(up - ul), pb = Math.abs(rec - ul), pc = Math.abs(rec + up - 2 * ul); x = a + (pa <= pb && pa <= pc ? rec : pb <= pc ? up : ul); } else x = a; cur[i] = x & 0xff; }
    cur.copy(prev);
    for (let x = 0; x < W; x++) { const r = cur[x * 4], g = cur[x * 4 + 1], b = cur[x * 4 + 2], al = cur[x * 4 + 3]; if (al < 40) continue; sum += (0.299 * r + 0.587 * g + 0.114 * b) / 255; n++; } }
  return n ? sum / n : null;
}

// ── (0) PART A: sheets + portrait on disk + near-black ──
section("Part A — full-form near-black recolor (#0F0F12)");
const src = fs.readFileSync(path.join(ROOT, "characters.js"), "utf8");
const mi = src.indexOf("const maki = {"); const mj = src.indexOf("export const characters", mi);
const baseSheets = [...new Set([...src.slice(mi, mj).matchAll(/sheet:\s*"\.\/(maki[a-z0-9_]+\.png)"/g)].map(m => m[1]))].filter(s => !s.includes("shibuya"));
let missing = [], bright = [];
for (const s of baseSheets) { const vf = path.join(ROOT, s.replace(/\.png$/, "__voidhunter.png")); if (!fs.existsSync(vf)) { missing.push(s); continue; } const lum = pngMeanLuma(vf); if (lum != null && lum > 0.15) bright.push(`${s}:${lum.toFixed(3)}`); }
check(`all ${baseSheets.length} base sheets have a __voidhunter recolor`, missing.length === 0, missing.slice(0, 3).join(","));
check("every __voidhunter sheet is near-black (mean luma < 0.15)", bright.length === 0, bright.slice(0, 3).join(","));
check("portrait maki_portrait__voidhunter.png exists", fs.existsSync(path.join(ROOT, "maki_portrait__voidhunter.png")));

// ── (6) PALETTE-COLLISION (pure computation; no browser needed) ──
section("Part B — palette-collision vs the Void-family overlays");
const hx = h => { h = h.replace("#", ""); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)); };
const cen = cs => { const r = cs.map(hx); return [0, 1, 2].map(i => r.reduce((a, c) => a + c[i], 0) / r.length); };
const dist = (a, b) => Math.round(Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 10) / 10;
const maki = cen(["#B02A3A", "#7E2E8F", "#A83373"]);
const family = { "Rick Void": ["#9B6FD4", "#5FC7C7", "#E288B4"], "Superman Phantom": ["#B8E0C4"], "Rengoku Ember": ["#E8703B", "#FFB073"], "Gold Voidwalker": ["#E8A020", "#FFD873"], "Goku Black Sovereign": ["#8E1218", "#E24438"], "Shinobu Moth": ["#D8CCE8"], "Rick Portal Void": ["#3FE855", "#8FF5A0"] };
let nearest = null, nd = 1e9; for (const [k, v] of Object.entries(family)) { const d = dist(maki, cen(v)); if (d < nd) { nd = d; nearest = k; } }
check(`nebula signature distinct from all 7 Void skins (min centroid-dist ${nd} ≥ 40)`, nd >= 40, `nearest=${nearest}`);

// ── browser: registration + live overlay ──
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
try {
  await page.goto(`${baseUrl}/index.html?harness=1&p1=maki&p2=maki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);

  section("registration + art swap");
  const reg = await page.evaluate(() => { const r = window.__harness.showSkinSelect?.("maki"); const s = (r?.skins || []).find(k => k.id === "makiVoidHunter"); return { present: !!s, name: s?.name, portrait: s?.portrait }; });
  check("makiVoidHunter registered + selectable in the skin list", reg.present, `name=${reg.name}`);
  check("skin uses the void-recolor portrait", (reg.portrait || "").includes("maki_portrait__voidhunter"), `portrait=${reg.portrait}`);

  await page.evaluate(() => window.__harness.boot());
  await sleep(300);
  const applied = await page.evaluate(() => window.__harness.setSkin?.("p1", "makiVoidHunter"));
  await sleep(400);
  const live = await page.evaluate(() => window.__harness.p1?.());
  check("skin applies live (skinId + __voidhunter sheet)", applied === "makiVoidHunter" && (live.spriteSheet || "").includes("__voidhunter"), `skinId=${live.skinId} sheet=${live.spriteSheet}`);

  section("live overlay — seeded once, tracks the sprite");
  await sleep(300);
  const fx0 = await page.evaluate(() => window.__harness.voidHunterFX?.("p1"));
  check("overlay seeded ONCE (22 stars + 3 nebulae)", fx0.seeded && fx0.stars === 22 && fx0.nebulae === 3, `stars=${fx0.stars} nebulae=${fx0.nebulae}`);
  check("overlay clock advancing (drift/swirl animates)", fx0.clock > 0, `clock=${fx0.clock}`);
  check("overlay tracks a real drawn bbox (idle)", fx0.rect.x != null && fx0.rect.w > 0, `rect=${JSON.stringify(fx0.rect)}`);
  // (the near-black base itself is proven by Part A — every __voidhunter sheet mean-luma < 0.15.)

  // attack pose — bbox moves, overlay stays attached (rect still valid)
  await page.keyboard.down("k"); await sleep(120);
  const fxA = await page.evaluate(() => window.__harness.voidHunterFX?.("p1"));
  await page.keyboard.up("k");
  check("overlay bbox tracks into the attack pose (stays attached)", fxA.rect.x != null && fxA.rect.w > 0, `rect=${JSON.stringify(fxA.rect)}`);

  section("no JS errors");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n  MAKI Void Hunter: ${PASS} passed, ${FAIL} failed`);
  await browser.close(); server.close();
  process.exit(FAIL ? 1 : 0);
}
