// harness/character_theme.test.mjs — per-character UI themes: each fighter's signature colour derives a
// full palette (Goku Black → pink, Ben 10 → green), a "Character" mode follows your pick, and the
// character-select screen live-previews the fighter you browse. Screenshots the select screen per fighter.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "theme_shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); if(u.startsWith("/api/")){res.writeHead(200).end("{}");return;} const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let PASS=0, FAIL=0; const ok=(c,m)=>{ (c?PASS++:FAIL++); console.log(`  ${c?"✅":"❌"} ${m}`); };
// hue of a hex, to assert "pinkish"/"greenish"
const hue = hex => { let h=hex.replace("#",""); const r=parseInt(h.slice(0,2),16)/255,g=parseInt(h.slice(2,4),16)/255,b=parseInt(h.slice(4,6),16)/255; const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn; let H=0; if(d){ H = mx===r?((g-b)/d+(g<b?6:0)):mx===g?(b-r)/d+2:(r-g)/d+4; H*=60;} return H; };

await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20); await sleep(250);

// 1. Goku Black → pink, Ben 10 → green (derived/override)
const gb = await page.evaluate(() => window.__harness.screens.charTheme("goku_black"));
ok(gb.active === "character", `Character mode active for Goku Black`);
const gbH = hue(gb.accent); ok(gbH >= 300 || gbH <= 350 && gbH >= 300, `Goku Black accent is PINK (${gb.accent}, hue ${Math.round(gbH)})`);
ok(gbH > 290 && gbH < 360, `Goku Black hue in pink band (${Math.round(gbH)}°)`);
const b10 = await page.evaluate(() => window.__harness.screens.charTheme("ben10"));
const b10H = hue(b10.accent); ok(b10H > 70 && b10H < 160, `Ben 10 accent is GREEN (${b10.accent}, hue ${Math.round(b10H)}°)`);

// 2. A derived (non-override) fighter keeps its own hue family — Vilgax (#3ba33b green)
const vg = await page.evaluate(() => window.__harness.screens.charTheme("vilgax"));
ok(hue(vg.accent) > 70 && hue(vg.accent) < 170, `Vilgax derives a green palette from his own colour (${vg.accent})`);

// 3. Two different fighters give two different accents (each has their OWN UI)
ok(gb.accent !== b10.accent && b10.accent !== vg.accent, `distinct fighters → distinct UI accents`);

// 4. The THEMES screen shows a 7th "Character" card
const themeInfo = await page.evaluate(() => window.__harness.screens.themes());
ok(themeInfo.cards.some(c => c.key === "character"), `THEMES screen includes the "Character" auto-card`);

// 5. On the REAL select-character screen, preview a couple fighters → screenshot each. Set the preview
//    AND enter the screen in ONE tick (so the render guard, which clears the preview off this screen,
//    doesn't wipe it between two separate evaluates). The backdrop should visibly recolour per fighter.
for (const key of ["goku_black", "ben10", "vilgax"]) {
  const pv = await page.evaluate(k => { window.__harness.ui.goto("SELECT_CHARACTER"); return window.__harness.screens.previewChar(k); }, key);
  await sleep(200);
  await page.screenshot({ path: path.join(OUT, `select_preview_${key}.png`) });
  ok(!!pv.accent, `select-screen preview for ${key} → ${pv.name} (${pv.accent})`);
}
await page.evaluate(() => window.__harness.screens.clearPreview());

ok(errors.length === 0, `no page errors${errors.length?": "+errors.slice(0,2).join(" | "):""}`);
console.log(`\n${FAIL===0?"✅":"❌"} character themes: ${PASS} passed, ${FAIL} failed  (shots → harness/theme_shots/)`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
