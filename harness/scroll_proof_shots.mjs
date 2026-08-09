// harness/scroll_proof_shots.mjs — capture a labelled screenshot of EVERY selection-style screen so the
// scroll fix can be eyeballed: the overflowing grids (Edo vessel, FFA pick) at rest AND scrolled to the
// last row; the fitting grids (main char-select, Omnitrix loadout, Ghostface identity/skin) shown whole.
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
async function frames(n){ const s=await page.evaluate(()=>window.__harness.state().frame); await page.waitForFunction(([a,b])=>window.__harness.state().frame>=a+b,[s,n],{timeout:10000,polling:16}).catch(()=>{}); }
async function shot(name){ await frames(2); await page.screenshot({ path: path.join(OUT, name) }); console.log("  📸", name); }
async function wheelBottom(){ await page.mouse.move(640,360); for(let i=0;i<12;i++){ await page.mouse.wheel(0,400); await frames(1);} await frames(2); }
const bar = () => page.evaluate(() => window.__harness.activeGridScrollbar());

try {
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(20, 20);

  // 1) Main character-select — largest single-universe roster (fits one page).
  let big = { u: null, n: 0 };
  for (const u of ["dragon_ball","jujutsu_kaisen","naruto","hunter_x_hunter","demon_slayer","power_rangers","dc","invincible","rick_and_morty"]) {
    const info = await page.evaluate(u => window.__harness.showCharSelect(u, "training"), u);
    if (info.roster.length > big.n) big = { u, n: info.roster.length };
  }
  await page.evaluate(u => window.__harness.showCharSelect(u, "training"), big.u);
  console.log(`\n[1] main character-select — ${big.u} (${big.n} chars, fits)`);
  await shot("proof_1_charselect.png");

  // 2) FFA / team pick — every fighter → overflows → at rest + scrolled to last row.
  const ffa = await page.evaluate(() => window.__harness.showFfaCharSelect(4));
  console.log(`\n[2] FFA character pick — ${ffa.roster.length} chars, overflows=${(await bar()).hasScroll}`);
  await shot("proof_2_ffa_top.png");
  await wheelBottom();
  await shot("proof_2_ffa_bottom.png");

  // 3) Edo Tensei vessel-select — every built char → overflows. Enter via the REAL Tobirama click.
  const cs = await page.evaluate(() => window.__harness.showCharSelect("naruto", "training"));
  await frames(2);
  const tobiIdx = cs.roster.indexOf("tobirama");
  const csr = await page.evaluate(() => window.__harness.charCardRects());
  await page.mouse.click(csr[tobiIdx].x + csr[tobiIdx].w/2, csr[tobiIdx].y + csr[tobiIdx].h/2);
  await frames(3);
  console.log(`\n[3] Edo Tensei vessel-select — overflows=${(await bar()).hasScroll}`);
  await shot("proof_3_edo_top.png");
  await wheelBottom();
  await shot("proof_3_edo_bottom.png");

  // 4) Ben 10 Omnitrix loadout — art-backed aliens (fits; scroll-aware if it grows).
  const bi = await page.evaluate(() => window.__harness.showCharSelect("ben_10", "training"));
  await frames(2);
  const benIdx = bi.roster.indexOf("ben10");
  const bcr = await page.evaluate(() => window.__harness.charCardRects());
  await page.mouse.click(bcr[benIdx].x + bcr[benIdx].w/2, bcr[benIdx].y + bcr[benIdx].h/2);
  await frames(3);
  console.log(`\n[4] Ben 10 Omnitrix loadout — overflows=${(await bar()).hasScroll}`);
  await shot("proof_4_omnitrix.png");

  // 5) Ghostface identity/skin pick — skins shrink-to-fit (never overflow → immune to the bug).
  const gf = await page.evaluate(() => window.__harness.showSkinSelect("ghostface", "p1", 0));
  console.log(`\n[5] Ghostface identity/skin select — ${gf.skins.length} identities (shrink-to-fit)`);
  await shot("proof_5_ghostface_identity.png");

  console.log(`\nDONE — page errors: ${jsErrors.length}`, jsErrors.slice(0,2).join(" | "));
} catch (e) { console.error("FATAL", e); }
finally { await browser.close(); server.close(); process.exit(0); }
