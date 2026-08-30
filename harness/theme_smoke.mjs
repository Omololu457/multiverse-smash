// harness/theme_smoke.mjs — live smoke: enter APPEARANCE, apply each theme, screenshot;
// also screenshot the themed PROFILE ("Choir's Reading") screen. Fails on any page error.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "theme_shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); if(u.startsWith("/api/")){res.writeHead(200).end("{}");return;} const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let PASS=0, FAIL=0; const ok=(c,m)=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${m}`); };

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await sleep(300);

// Enter APPEARANCE
const info = await page.evaluate(() => window.__harness.screens.themes());
ok(info.state === "themes", `entered APPEARANCE (state=${info.state})`);
ok(Array.isArray(info.all) && info.all.length >= 6, `theme registry has ${info.all?.length} themes: ${info.all?.join(", ")}`);

// Apply + screenshot each theme (hover the card too, for the lift/glow)
for (const key of info.all) {
  const r = await page.evaluate(k => window.__harness.screens.setTheme(k), key);
  const idx = info.all.indexOf(key);
  await page.evaluate(i => window.__harness.screens.themeHover(i), idx);
  await sleep(220);   // let the animation clock advance a few frames
  await page.screenshot({ path: path.join(OUT, `themes_${key}.png`) });
  ok(r.active === key, `applied "${key}" → active=${r.active}`);
}

// Persistence: active theme should read back after re-entering
const active = await page.evaluate(() => window.__harness.screens.activeTheme());
ok(!!active, `active theme persists in-session: ${active}`);

// Screenshot the themed PROFILE screen under a pink theme (sakura) + a pink+blue (synthwave)
for (const key of ["sakura", "synthwave", "aurora"]) {
  await page.evaluate(k => window.__harness.screens.setTheme(k), key);
  await page.evaluate(() => window.__harness.screens.profile());
  await sleep(220);
  await page.screenshot({ path: path.join(OUT, `profile_${key}.png`) });
}
ok(true, `profile screen rendered under sakura/synthwave/aurora`);

// Screenshot the MAIN MENU (should show the new APPEARANCE row + themed backdrop)
await page.evaluate(() => { window.__harness.screens.setTheme("synthwave"); });
await page.evaluate(() => { const h = window.__harness; if (h.gotoMainMenu) h.gotoMainMenu(); });
await sleep(150);

ok(errors.length === 0, `no page errors${errors.length?": "+errors.slice(0,2).join(" | "):""}`);
console.log(`\n${FAIL===0?"✅":"❌"} theme smoke: ${PASS} passed, ${FAIL} failed  (shots → harness/theme_shots/)`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
