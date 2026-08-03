// harness/chrollo_skillhunter_tint.mjs — Part 2 evidence: the Skill Hunter transform tint.
// For 2 DIFFERENT copied characters: activate Skill Hunter (copy the opponent), assert the copied body
// renders through the shared purple wash (fighter._shActive), screenshot it; then boot that same
// character in its OWN match and assert NO tint (the treatment clears everywhere else).
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
const sh = () => page.evaluate(() => window.__harness.shState("p1"));
let ok = 0, bad = 0; const chk = (n, c, d = "") => { c ? ok++ : bad++; console.log(`  ${c ? "✅" : "❌"} ${n}${d ? " — " + d : ""}`); };
async function waitFrames(n) { const s = (await page.evaluate(() => window.__harness.state().frame)); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }).catch(() => {}); }

// Count canvas pixels that read as a PURPLE wash: R and B BOTH clearly exceed G. This uniquely fingerprints
// the tint — sky-blue bg is B>G>R (fails R>G); orange Naruto is R>G>B (fails B>G); dark-blue Sasuke is
// B>G>R (fails R>G). So a high count = the shared purple possession wash is on-screen. Scans the LEFT
// half (where p1 stands), reading real canvas backing-store pixels (no world→camera transform needed).
async function purplePixels() {
  return await page.evaluate(() => {
    const cv = document.querySelector("canvas"); const ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height, halfW = Math.floor(W / 2);
    const d = ctx.getImageData(0, 0, halfW, H).data;
    let count = 0;
    for (let i = 0; i < d.length; i += 4) {
      const R = d[i], G = d[i + 1], B = d[i + 2], A = d[i + 3];
      if (A > 60 && R > G + 10 && B > G + 10 && (R + B) > 90) count++;   // both channels beat green = purple/magenta
    }
    return count;
  });
}

try {
  for (const vessel of ["naruto", "sasuke"]) {
    // ── copy the opponent via Skill Hunter ──
    await page.goto(`${base}/index.html?harness=1&p1=chrollo&p2=${vessel}`, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
    await page.mouse.click(640, 360);
    await page.evaluate(() => window.__harness.boot());
    await waitFrames(8);
    await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.fillEnergy?.(); });
    // unlock: opponent lands 3 distinct moves on Chrollo
    await page.evaluate(() => { window.__harness.shLandMove("light"); window.__harness.shLandMove("heavy"); window.__harness.shLandMove("special"); });
    const ready = await sh();
    chk(`${vessel}: Skill Hunter unlocked`, ready.ready === true, `distinct=${ready.distinct}`);
    // activate
    await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");
    await page.waitForFunction(() => { const x = window.__harness.shState("p1"); return x.active && !x.cineActive; }, null, { timeout: 9000, polling: 16 }).catch(() => {});
    await page.evaluate(() => window.__harness.resetFighterInput?.("p1"));
    await waitFrames(8);
    const s = await sh();
    chk(`${vessel}: copied form active (Chrollo now = ${s.rosterKey})`, s.active && s.rosterKey === vessel, `rosterKey=${s.rosterKey}`);
    await page.screenshot({ path: path.join(OUT, `skillhunter_tint_${vessel}.png`) });
    const shPurple = await purplePixels();

    // ── same character in its OWN match → NO tint ──
    await page.goto(`${base}/index.html?harness=1&p1=${vessel}`, { waitUntil: "load" });
    await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
    await page.mouse.click(640, 360);
    await page.evaluate(() => window.__harness.boot());
    await waitFrames(10);
    const n = await p1();
    chk(`${vessel}: normal match → NOT _shActive (renders un-tinted)`, !n._shActive, `_shActive=${!!n._shActive}`);
    await page.screenshot({ path: path.join(OUT, `skillhunter_normal_${vessel}.png`) });
    const normPurple = await purplePixels();
    chk(`${vessel}: copied body shows a purple wash absent in its normal match`, shPurple > 200 && shPurple > normPurple * 4, `shPurple=${shPurple} normalPurple=${normPurple}`);
  }
  chk("no page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); bad++; }
finally {
  console.log(`\nRESULT ${ok} pass / ${bad} fail — shots: harness/shots/skillhunter_*.png`);
  await browser.close(); server.close();
  process.exit(bad ? 1 : 0);
}
