// harness/hashirama_stage5.mjs — STAGE 5: Tree Summon 4-tier ladder (Down+Special, successive-cast).
// Casts Down+Special four times in succession (within the reset window) → tiers 1→2→3→4. For each tier:
//   • the correct CASTER pose plays (treeSummonN),
//   • the correct growing TREE summon spawns (its _tree growth sheet, spriteFrames>1 + spriteOnce = real
//     frame-by-frame growth that HOLDS, not a static swap),
//   • it connects (dummy hp drops),
//   • the rendered tree is VISIBLY LARGER than the previous tier (spriteScale × spriteH strictly rising).
// Tier 4 (forest grove) also drops the landscape-branch terrain overlay. Screens saved per tier.
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
const projs = () => page.evaluate(() => window.__harness.projectiles());
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function shot(tag) { await page.screenshot({ path: path.join(OUT, `hashirama_s5_${tag}.png`) }); }
async function findProj(tok, maxF = 26) { for (let f = 0; f < maxF; f++) { const k = (await projs()).find(p => (p.sheet || "").includes(tok)); if (k) return k; await waitFrames(1); } return null; }

const TIERS = [
  { n: 1, caster: "treeSummon1", tok: "treee_summon_1_tree", sh: 40 },
  { n: 2, caster: "treeSummon2", tok: "treee_summon_2_tree", sh: 62 },
  { n: 3, caster: "treeSummon3", tok: "tree_level_2_tree",   sh: 232 },
  { n: 4, caster: "treeSummon4", tok: "tree_level_3_tree",   sh: 171 },
];

try {
  await page.goto(`${base}/index.html?harness=1&p1=hashirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // Park p1 mid-arena, dummy adjacent so the tree erupts ON it. (Kept between tiers.)
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  await page.evaluate(x => window.__harness.setP1X(x), Math.round(arena.left + arena.width * 0.4)); await waitFrames(1);

  const rendered = [];   // spriteScale × spriteH per tier, to prove escalating scale
  for (const t of TIERS) {
    console.log(`\n── tier ${t.n} ──`);
    // re-park + heal the dummy each tier (successive casts stay within the reset window → the ladder escalates)
    const a = await p1(); await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + 64); await waitFrames(2);
    const hp0 = (await p2()).health;
    // Down+Special: hold s (down) then press l (special)
    await page.keyboard.down("s"); await waitFrames(2);
    await page.keyboard.down("l"); await waitFrames(1); await page.keyboard.up("l");
    await page.keyboard.up("s");
    // caster pose
    let cast = null; for (let f = 0; f < 16; f++) { const s = await p1(); if (s.castMove === t.caster) { cast = s; break; } await waitFrames(1); }
    check(`tier ${t.n}: caster plays ${t.caster}`, !!cast, `castMove=${cast?.castMove ?? (await p1()).castMove}`);
    // the growing tree summon
    const k = await findProj(t.tok);
    check(`tier ${t.n}: tree summon spawns (${t.tok})`, !!k, `proj=${k ? k.sheet.split("/").pop() : "none"}`);
    if (k) {
      check(`tier ${t.n}: real growth strip (spriteFrames>1 + spriteOnce hold, not static)`, (k.spriteFrames || 1) > 1 && k.spriteOnce === true, `frames=${k.spriteFrames} once=${k.spriteOnce}`);
      rendered.push({ n: t.n, h: (k.spriteScale || 1) * (k.spriteH || t.sh), scale: k.spriteScale });
    } else { rendered.push({ n: t.n, h: 0 }); }
    await waitFrames(4); await shot(`tier${t.n}`);
    // connects
    await page.waitForFunction((h) => window.__harness.p2().health < h, hp0, { timeout: 2500, polling: 16 }).catch(() => {});
    check(`tier ${t.n}: tree connects (dmg)`, (await p2()).health < hp0, `−${(hp0 - (await p2()).health).toFixed(0)}`);
    // tier 4 → landscape overlay
    if (t.n === 4) {
      const land = (await projs()).find(p => (p.sheet || "").includes("landscape_overlay"));
      check(`tier 4: landscape terrain overlay drops (visualOnly)`, !!land && land.visualOnly === true, `land=${land ? land.sheet.split("/").pop() : "none"} visualOnly=${land?.visualOnly}`);
    }
    await page.waitForFunction(() => (window.__harness.p1().attacking === false) && (window.__harness.p1().currentMove == null), null, { timeout: 3000, polling: 16 }).catch(() => {});
    await waitFrames(4);
  }

  // Escalating scale: each tier's rendered tree height strictly larger than the previous.
  console.log("\n── escalating scale ──");
  const heights = rendered.map(r => r.h);
  const rising = heights.every((h, i) => i === 0 || h > heights[i - 1]);
  check("rendered tree size strictly increases tier 1→4", rising, heights.map((h, i) => `t${i + 1}=${h.toFixed(0)}px`).join(" < "));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Hashirama Stage 5: ${PASS} passed, ${FAIL} failed — shots in harness/shots/hashirama_s5_tier*.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
