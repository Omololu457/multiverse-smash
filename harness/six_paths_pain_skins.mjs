// harness/six_paths_pain_skins.mjs — verifies the ONE shared 13-skin set for Six Paths of Pain and,
// critically, that a recolor PROPAGATES ACROSS ALL 6 PATHS (the whole point: one skin, every Path).
//   1. Each recolor skin sets _recolorTag + renders the __<tag> body sheet on the base (Deva) Path.
//   2. CROSS-PATH: with one skin equipped, swapping through all 6 Paths renders THAT Path's __<tag> art.
//   3. No 404s on any recolored sheet during the sweep (every referenced recolor file exists).
// Usage: node harness/six_paths_pain_skins.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; const s404 = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("response", r => { if (r.status() === 404 && r.url().includes("sixpaths_") && r.url().includes("__")) s404.push(r.url().replace(base, "")); });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  ✅ ${m}`); } else { fail++; console.log(`  ❌ ${m}`); } };
const idleSheet = () => page.evaluate(() => { window.__harness.benPose(null); const p = window.__harness.p1(); return p?.spriteSheet; });

const TAGS = ["amberpath","goldenrikudou","verdantsage","emeralddeva","tealrebirth","cobaltpath",
              "azuretendo","violetrinnegan","amethystshurado","magentagakido","crimsonnagato","ashenvoid"];
const PATHS = [ [0,"sixpaths_deva"],[1,"sixpaths_chiku"],[2,"sixpaths_gakido"],[3,"sixpaths_ningen"],[4,"sixpaths_asura"],[5,"sixpaths_naraka"] ];

await page.goto(`${base}/index.html?harness=1&p1=six_paths_pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

// ── 1. Each recolor skin retags the base (Deva) body ──
console.log("\n── 1. All 13 skins on the base Path ──");
// default (base)
await page.evaluate(() => { window.__harness.setPath(0); window.__harness.setSkin("p1", "default"); });
await sleep(120);
let sh = await idleSheet();
ok(sh && sh.includes("sixpaths_deva_stance_uniform.png") && !sh.includes("__"), `default → base art (${sh})`);
for (const tag of TAGS) {
  await page.evaluate(t => { window.__harness.setPath(0); window.__harness.setSkin("p1", "sixpaths_" + t); }, tag);
  await sleep(120);
  const s = await page.evaluate(() => window.__harness.sixPaths());
  sh = await idleSheet();
  ok(sh && sh.includes(`__${tag}.png`), `${tag} → recolored base body (${sh?.split("/").pop()})`);
}

// ── 2. CROSS-PATH propagation: one skin, all 6 Paths render their own __<tag> art ──
console.log("\n── 2. Cross-Path propagation (skin = cobaltpath) ──");
await page.evaluate(() => { window.__harness.setPath(0); window.__harness.fillEnergy(); window.__harness.setSkin("p1", "sixpaths_cobaltpath"); });
await sleep(120);
for (const [i, prefix] of PATHS) {
  await page.evaluate(idx => { window.__harness.fillEnergy(); window.__harness.setPath(idx); }, i);
  await sleep(120);
  const s = await page.evaluate(() => window.__harness.sixPaths());
  sh = await idleSheet();
  ok(sh && sh.includes(`${prefix}_stance_uniform__cobaltpath.png`), `${s.name} renders its ${prefix} body in cobaltpath (${sh?.split("/").pop()})`);
}

// ── 3. A second skin across the same 6 Paths (violetrinnegan) ──
console.log("\n── 3. Cross-Path propagation (skin = violetrinnegan) ──");
await page.evaluate(() => { window.__harness.setPath(0); window.__harness.fillEnergy(); window.__harness.setSkin("p1", "sixpaths_violetrinnegan"); });
await sleep(120);
for (const [i, prefix] of PATHS) {
  await page.evaluate(idx => { window.__harness.fillEnergy(); window.__harness.setPath(idx); }, i);
  await sleep(120);
  sh = await idleSheet();
  ok(sh && sh.includes(`${prefix}_stance_uniform__violetrinnegan.png`), `${prefix} in violetrinnegan (${sh?.split("/").pop()})`);
}

// ── 4. No missing recolor files ──
console.log("\n── 4. No 404s on recolored sheets ──");
ok(s404.length === 0, `every referenced recolor sheet exists${s404.length ? " (MISSING: " + [...new Set(s404)].slice(0,6).join(", ") + ")" : ""}`);

console.log(`\n════════════════════════════════════════`);
console.log(`  SIX PATHS SKINS: ${pass} passed, ${fail} failed`);
console.log(`════════════════════════════════════════`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,8).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
