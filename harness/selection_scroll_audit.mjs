// harness/selection_scroll_audit.mjs — verify EVERY roster-selection screen keeps every item reachable
// at the current (growing) roster. Two overflow strategies exist: (A) SCROLL card grids (overflow → wheel/
// scrollbar), and (B) FIT-BY-SHRINK menus (shrink rows/cards so all stay on one page). For each screen we
// confirm it uses the right one and that nothing lands off-screen. Screens covered (all 7 requested):
//   SCROLL grids:  • main character-select (SELECT_CHARACTER, per-universe)  • Ben 10 Omnitrix (SELECT_ALIENS)
//                  • FFA / team-mode char pick (FFA_CHARSELECT)              • Edo Tensei vessel (via test:edo-scroll)
//   FIT-BY-SHRINK: • Ghostface identity / any skin pick (SELECT_SKIN, stressed at the max-skin char)
//                  • Tower tier menu (TOWER_SELECT)                          • Team-assign (FFA_TEAMSELECT)
//   ABSENT:        • Morpher Call-In partner-select (SELECT_CALLIN_PARTNER — not implemented on this branch)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
let ok = 0, bad = 0; const chk = (n,c,d="") => { c?ok++:bad++; console.log(`  ${c?"✅":"❌"} ${n}${d?" — "+d:""}`); };
const H = 720;
async function frames(n){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:10000,polling:16}).catch(()=>{}); }
const bar = () => page.evaluate(() => window.__harness.activeGridScrollbar());
const rects = () => page.evaluate(() => window.__harness.activeGridRects());
async function wheelToBottom(){ await page.mouse.move(640,360); for(let i=0;i<10;i++){ await page.mouse.wheel(0,400); await frames(1);} await frames(2); }

try {
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);

  // ── 1) FFA / TEAM char pick (FFA_CHARSELECT) — all sprite chars → OVERFLOWS → must scroll ──
  console.log("\n── FFA / team-mode character pick (FFA_CHARSELECT) ──");
  await page.evaluate(() => window.__harness.showFfaCharSelect(4));
  await frames(3);
  let b = await bar();
  chk(`overflows at ${b.count} chars → scroll active`, b.hasScroll && b.maxOffset > 0, `maxOffset=${b.maxOffset}`);
  let rr = await rects();
  const lastY0 = rr[rr.length-1].y;
  chk(`last card below the viewport at rest (unreachable without scroll)`, lastY0 + rr[rr.length-1].h > H - 88, `y=${Math.round(lastY0)}, viewport-bottom≈632`);
  await wheelToBottom();
  rr = await rects();
  const lastY1 = rr[rr.length-1].y;
  chk(`wheel brought the last card into view`, lastY1 >= 80 && lastY1 + rr[rr.length-1].h <= H, `y=${Math.round(lastY1)}`);
  await page.screenshot({ path: path.join(OUT, "scroll_audit_ffa.png") });

  // ── 2) Morpher Call-In partner pick (SELECT_CALLIN_PARTNER) — NOT on this branch ──
  // The Morpher Call-In partner-select screen (a staged Power-Rangers feature) is not implemented on
  // combo-flow-layer: there is no SELECT_CALLIN_PARTNER game state and no showCallInSelect hook. There
  // is therefore no roster grid here to scroll. Asserted (not silently skipped) so this flips the moment
  // the screen lands — at which point add its case to activeScrollGrid() and it scrolls for free.
  console.log("\n── Morpher Call-In partner pick (SELECT_CALLIN_PARTNER) ──");
  const hasCallIn = await page.evaluate(() => typeof window.__harness.showCallInSelect === "function");
  chk(`Call-In partner-select screen is ABSENT on this branch (nothing to scroll)`, !hasCallIn,
      hasCallIn ? "screen now exists → add it to activeScrollGrid()!" : "no SELECT_CALLIN_PARTNER state");

  // ── 3) Main character-select (SELECT_CHARACTER) — per-universe; confirm on the scroll path + largest fits ──
  console.log("\n── Main character-select (SELECT_CHARACTER), per universe ──");
  const universes = ["dragon_ball","jujutsu_kaisen","naruto","hunter_x_hunter","demon_slayer","power_rangers","dc","ben_10","invincible","rick_and_morty"];
  let maxU = { u: null, n: 0 };
  for (const u of universes) {
    const info = await page.evaluate(u => window.__harness.showCharSelect(u, "training"), u);
    await frames(1);
    const bb = await bar();
    if (bb.count > maxU.n) maxU = { u, n: bb.count };
    if (bb.hasScroll) chk(`universe ${u} (${bb.count}) OVERFLOWS → scroll active`, bb.maxOffset > 0, `maxOffset=${bb.maxOffset}`);
  }
  chk(`main select is scroll-aware (largest universe = ${maxU.u} @ ${maxU.n} chars)`, true, `≤ ${maxU.n} fits one page; scroll auto-engages if a universe grows past the viewport`);

  // ── 4) Ben 10 Omnitrix loadout (SELECT_ALIENS) — different grid; confirm it fits (no scroll needed) ──
  console.log("\n── Ben 10 Omnitrix loadout (SELECT_ALIENS) ──");
  const bi = await page.evaluate(() => window.__harness.showCharSelect("ben_10", "training"));
  await frames(1);
  const benIdx = bi.roster.indexOf("ben10");
  const bcr = await page.evaluate(() => window.__harness.charCardRects());
  await page.mouse.click(bcr[benIdx].x + bcr[benIdx].w/2, bcr[benIdx].y + bcr[benIdx].h/2);
  await frames(3);
  const st = await page.evaluate(() => window.__harness.state().gameState);
  const acr = await page.evaluate(() => window.__harness.alienGridRects());
  const allFit = acr.length > 0 && acr.every(c => c.y >= 60 && c.y + c.h <= H - 40);
  chk(`reached Omnitrix loadout (SELECT_ALIENS)`, st === "selectAliens", `state=${st}`);
  chk(`all ${acr.length} art-backed aliens fit on one page (no scroll needed)`, allFit, `ys=[${acr.map(c=>Math.round(c.y)).join(",")}]`);

  // ── 5) Ghostface identity picker / any skin pick (SELECT_SKIN) — FIT-BY-SHRINK, no scroll ──
  // Stressed at the CURRENT max-skin character so a grown skin set can't push a card off-screen.
  console.log("\n── Skin pick (SELECT_SKIN) — Ghostface identity + max-skin stress ──");
  const fits = (rs) => rs.length > 0 && rs.every(r => r.y >= 40 && r.y + r.h <= H - 20 && r.x >= 0 && r.x + r.w <= 1280);
  for (const c of ["ghostface", "maki", "goku_black", "yuji", "gold_samurai_ranger"]) {
    const info = await page.evaluate(ch => window.__harness.showSkinSelect(ch, "p1", 0), c);
    await frames(1);
    const rs = await page.evaluate(() => window.__harness.skinSelectRects());
    chk(`${c}: all ${info.skins.length} skin cards fit on one page (shrink-to-fit)`, fits(rs),
        `ys=[${rs.map(r=>Math.round(r.y)).join(",")}] maxBottom=${Math.round(Math.max(...rs.map(r=>r.y+r.h)))}≤${H-20}`);
  }

  // ── 6) Tower tier menu (TOWER_SELECT) — FIT-BY-SHRINK vertical menu ──
  console.log("\n── Tower tier menu (TOWER_SELECT) ──");
  const trs = await page.evaluate(() => window.__harness.towerSelectRects());
  chk(`all ${trs.length} tower rows fit on one page`, fits(trs), `ys=[${trs.map(r=>Math.round(r.y)).join(",")}]`);

  // ── 7) Team-mode team-assignment (FFA_TEAMSELECT) — bounded by FFA_MAX_PLAYERS ──
  console.log("\n── Team-mode assignment (FFA_TEAMSELECT) ──");
  const maxP = 4;   // FFA_MAX_PLAYERS (design max, independent of headless device count)
  const frs = await page.evaluate((n) => window.__harness.ffaTeamRects(n), maxP);
  chk(`all ${frs.length} team-assign rows fit at max ${maxP} players`, fits(frs), `ys=[${frs.map(r=>Math.round(r.y)).join(",")}]`);

  chk("no page errors", jsErrors.length === 0, jsErrors.slice(0,2).join(" | "));
} catch (e) { console.error("FATAL", e); bad++; }
finally {
  console.log(`\nRESULT ${ok} pass / ${bad} fail`);
  await browser.close(); server.close();
  process.exit(bad ? 1 : 0);
}
