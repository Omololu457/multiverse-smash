// harness/pain_stage6_shots.mjs — Stage 6 evidence for Pain's "Six Paths Summon" 5-assist selector.
// Fires each assist via its Charge(P)+slot combo and asserts the selector spawns the CORRECT companion
// every time (Charge+↑=Itachi, Charge+←=Konan, Charge+→=Sasori, Charge+↓=Sasuke, Charge+Light=Tobi).
// Each summon is brief (rush-in striker), so it samples tightly right after the input; shared cooldown
// (~2.5s) means we wait between calls. Screenshots the first few for visual evidence.
// Usage: node harness/pain_stage6_shots.mjs
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
const server = await new Promise(r => { const s = http.createServer((req,res)=>{ const u=decodeURIComponent(req.url.split("?")[0]); const f=path.join(ROOT,u==="/"?"/index.html":u); if(!f.startsWith(ROOT)){res.writeHead(403).end();return;} fs.readFile(f,(e,d)=>{ if(e){res.writeHead(404).end();return;} res.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"}); res.end(d); }); }); s.listen(0,"127.0.0.1",()=>r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = []; page.on("pageerror", e => errors.push(String(e))); page.on("console", m => { if (m.type()==="error") errors.push(m.text()); });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };

await page.goto(`${base}/index.html?harness=1&p1=pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

const summonIds = () => page.evaluate(() => (window.__harness.summons?.() || []).map(s => s.summonId || s.id));
// slot key: itachi=↑(w), konan=←(a), sasori=→(d), sasuke=↓(s), tobi=Light(j). Charge=p.
const ASSISTS = [
  { key: "itachi", label: "Charge+↑",     slot: "w", shot: true },
  { key: "konan",  label: "Charge+←",     slot: "a", shot: true },
  { key: "sasori", label: "Charge+→",     slot: "d", shot: true },
  { key: "sasuke", label: "Charge+↓",     slot: "s", shot: false },
  { key: "tobi",   label: "Charge+Light", slot: "j", shot: false },
];

console.log("SIX PATHS SUMMON — selector picks the right assist each time:");
for (let i = 0; i < ASSISTS.length; i++) {
  const a = ASSISTS[i];
  // wait out the shared cooldown from the previous summon (~2.5s), and reset input state
  if (i > 0) await sleep(2800);
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.p1ClearCooldowns?.(); });
  await sleep(80);
  // Charge held + slot press (edge)
  await page.keyboard.down("p"); await sleep(60);
  await page.keyboard.down(a.slot); await sleep(50); await page.keyboard.up(a.slot);
  // sample the (brief) summon
  let spawned = null, shot = false;
  for (let t = 0; t < 24; t++) {
    await sleep(14);
    const ids = await summonIds();
    const hit = ids.find(x => x && x.startsWith("painAssist_"));
    if (hit) { spawned = hit; if (a.shot && !shot) { await page.screenshot({ path: path.join(OUT, `pain_s6_${a.key}.png`) }); shot = true; } }
  }
  await page.keyboard.up("p");
  const expected = "painAssist_" + a.key;
  ok(spawned === expected, `${a.label} → ${spawned || "(none)"} (expected ${expected})`);
}

console.log(`\n${pass} pass / ${fail} fail`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,10).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
