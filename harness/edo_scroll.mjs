// harness/edo_scroll.mjs — proves the Edo Tensei vessel-select screen now scrolls to reach EVERY char.
// Navigates the REAL flow (naruto select → click Tobirama → Edo vessel screen), confirms the last-roster
// char is off-screen at rest, wheel-scrolls to it, screenshots it visible, then CLICKS it and confirms
// the selection registered — i.e. a previously-unreachable character is now selectable.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
let ok = 0, bad = 0; const chk = (n, c, d = "") => { c ? ok++ : bad++; console.log(`  ${c ? "✅" : "❌"} ${n}${d ? " — " + d : ""}`); };
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 10000, polling: 16 }).catch(() => {}); }
const edoState = () => page.evaluate(() => window.__harness.edoBackup.state());
const edoRects = () => page.evaluate(() => window.__harness.edoBackup.cardRects());

try {
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);

  // 1) Enter the naruto roster, click Tobirama → detours to the Edo Tensei vessel-select screen.
  const cs = await page.evaluate(() => window.__harness.showCharSelect("naruto", "training"));
  await waitFrames(3);
  const tobiIdx = cs.roster.indexOf("tobirama");
  const csRects = await page.evaluate(() => window.__harness.charCardRects());
  const tr = csRects[tobiIdx];
  await page.mouse.click(tr.x + tr.w / 2, tr.y + tr.h / 2);
  await waitFrames(3);
  const st = await edoState();
  chk("reached Edo Tensei vessel-select screen", st.gameState === "selectEdoBackup", `state=${st.gameState} roster=${st.roster.length}`);

  const roster = st.roster;
  const lastKey = roster[roster.length - 1];   // bottom-of-roster char (previously unreachable)
  const lastIdx = roster.length - 1;

  // 2) At rest (top of list), the last char is BELOW the visible canvas → unreachable without scroll.
  const rectsTop = await edoRects();
  const yTop = rectsTop[lastIdx].y;
  await page.screenshot({ path: path.join(OUT, "edo_scroll_before.png") });
  chk(`'${lastKey}' (last of ${roster.length}) starts OFF-SCREEN`, yTop > 720, `y=${Math.round(yTop)} (canvas h=720)`);

  // 3) Wheel-scroll down over the canvas — the REAL wheel listener drives the grid scroll.
  await page.mouse.move(640, 360);
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 400); await waitFrames(1); }
  await waitFrames(2);
  const rectsScrolled = await edoRects();
  const yScrolled = rectsScrolled[lastIdx].y;
  chk(`'${lastKey}' scrolled INTO view`, yScrolled >= 100 && yScrolled + rectsScrolled[lastIdx].h <= 700, `y=${Math.round(yScrolled)}`);
  await page.screenshot({ path: path.join(OUT, "edo_scroll_after.png") });

  // 4) CLICK the now-visible last char → the selection must register (proves it's reachable).
  const lr = rectsScrolled[lastIdx];
  await page.mouse.click(lr.x + lr.w / 2, lr.y + lr.h / 2);
  await waitFrames(3);
  const after = await page.evaluate(() => ({ p1: window.__harness.p1()?._edoBackup, cfg: window.__harness.edoBackup.state() }));
  chk(`clicking '${lastKey}' selected it as the Edo vessel`, after.p1 === lastKey || after.cfg.p1Backup === lastKey, `p1Backup=${after.cfg.p1Backup} fighterBackup=${after.p1}`);

  chk("no page errors", jsErrors.length === 0, jsErrors.slice(0, 2).join(" | "));
} catch (e) { console.error("FATAL", e); bad++; }
finally {
  console.log(`\nRESULT ${ok} pass / ${bad} fail — shots: harness/shots/edo_scroll_{before,after}.png`);
  await browser.close(); server.close();
  process.exit(bad ? 1 : 0);
}
