// harness/six_paths_pain_stage3_shots.mjs — STAGE 3 evidence for Six Paths of Pain: the PRETA /
// GAKIDO Path (lean kit — the ONE Chakra-Absorption Shield). Covers, with real screenshots:
//   1. SWAP into the Preta Path — art-swaps to the bald Gakido body.
//   2. Gakido movement/state + 5 normals — each renders its own sixpaths_gakido_* sheet.
//   3. The CHAKRA-ABSORPTION SHIELD: casts (spShield pose) → i-frames + absorption window + barrier FX,
//      and a hostile projectile that reaches Pain is ABSORBED (deleted) and REFUNDS chakra.
// Usage: node harness/six_paths_pain_stage3_shots.mjs
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
const errors = [];
page.on("pageerror", e => errors.push(String(e)));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; console.log(`  PASS ${m}`); } else { fail++; console.log(`  FAIL ${m}`); } };
const p1 = () => page.evaluate(() => { const p = window.__harness.p1(); return { sheet: p?.spriteSheet, frame: p?.spriteFrameIndex ?? null, invuln: p?.invulnTimer ?? 0 }; });
const sp = () => page.evaluate(() => window.__harness.sixPaths());
const boltCount = () => page.evaluate(() => (window.__harness.projectiles?.() || []).filter(p => p.name === "sixPathsTestBolt").length);

await page.goto(`${base}/index.html?harness=1&p1=six_paths_pain&p2=tobirama`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(20, 20);
await page.evaluate(() => window.__harness.boot());
await sleep(400);

// ── 1. Swap into the Preta Path ──
console.log("\n── 1. Swap → Preta Path ──");
await page.evaluate(() => window.__harness.fillEnergy());
const swap = await page.evaluate(() => window.__harness.setPath(2));
await sleep(200);
const afterSwap = await sp();
await page.screenshot({ path: path.join(OUT, "sixpaths_s3_swap_preta.png") });
ok(swap.ok && swap.path === 2 && swap.name === "Preta Path", `swap → Preta Path (${swap.name})`);
ok(afterSwap.skinAnim === true, `_skinAnim override active (Gakido art set)`);
await page.evaluate(() => window.__harness.benPose(null)); await sleep(150);
const idle = await p1();
ok(idle.sheet && idle.sheet.includes("sixpaths_gakido"), `idle renders the Gakido body → ${idle.sheet}`);

// ── 2. Gakido poses ──
console.log("\n── 2. Gakido poses (benPose) ──");
const EXP = {
  idle: "sixpaths_gakido_stance", run: "sixpaths_gakido_run", jump: "sixpaths_gakido_jfct",
  guard: "sixpaths_gakido_stance", hurt: "sixpaths_gakido_hurt", knockdown: "sixpaths_gakido_hurt",
  light: "sixpaths_gakido_combo", heavy: "sixpaths_gakido_combo", up: "sixpaths_gakido_runatk",
  air: "sixpaths_gakido_jfct", down_air: "sixpaths_gakido_downatk",
};
for (const [pose, sheet] of Object.entries(EXP)) {
  await page.evaluate(a => window.__harness.benPose(a === "idle" ? null : a), pose);
  await sleep(120);
  const r = await p1();
  await page.screenshot({ path: path.join(OUT, `sixpaths_s3_pose_${pose}.png`) });
  ok(r.sheet && r.sheet.includes(sheet), `${pose} → ${r.sheet} (frame ${r.frame})`);
}
await page.evaluate(() => window.__harness.benPose(null));

// ── 3. Chakra-Absorption Shield ──
console.log("\n── 3. Chakra-Absorption Shield ──");
await page.evaluate(() => { window.__harness.setPath(2); window.__harness.fillEnergy(); window.__harness.resetFighterInput?.("p1"); });
await sleep(80);
await page.evaluate(() => window.__harness.p1SpecialDir(null));   // the ONE special (direction-agnostic)
await sleep(80);
const cast = await sp();
const castP1 = await p1();
await page.screenshot({ path: path.join(OUT, "sixpaths_s3_shield_cast.png") });
ok(cast.castMove === "spShield", `Shield cast pose spShield (got ${cast.castMove})`);
ok(cast.gakidoShield > 0, `absorption window open (${cast.gakidoShield}f)`);
ok(castP1.invuln > 0, `shield grants i-frames (invulnTimer ${castP1.invuln})`);
const eCast = cast.energy;   // energy after paying the shield cost

// Absorption: spawn a hostile projectile on Pain while the shield is up → it must be eaten + refund chakra.
const boltsPre = await page.evaluate(() => window.__harness.sixPathsTestBolt());
ok(boltsPre >= 1, `hostile test projectile spawned on Pain (${boltsPre})`);
let absorbed = false, eAfter = eCast, absorbCount = 0;
for (let t = 0; t < 20; t++) {
  await sleep(16);
  const n = await boltCount();
  const s = await sp();
  if (n === 0) { absorbed = true; eAfter = s.energy; absorbCount = s.gakidoAbsorbed; break; }
}
await page.screenshot({ path: path.join(OUT, "sixpaths_s3_shield_absorb.png") });
ok(absorbed, `shield ABSORBS the incoming projectile (deleted)`);
ok(absorbCount > 0, `absorb counted (${absorbCount})`);
ok(eAfter > eCast, `absorb REFUNDS chakra (${eCast} → ${eAfter})`);

// Swapping away closes the window (isolation of the Preta state).
await page.evaluate(() => { window.__harness.fillEnergy(); window.__harness.setPath(0); });
const cleared = await sp();
ok((cleared.gakidoShield || 0) === 0, `swapping Paths closes the absorption window (${cleared.gakidoShield})`);

console.log(`\n${pass} pass / ${fail} fail`);
console.log(errors.length ? `\nERRORS:\n${errors.slice(0,12).join("\n")}` : "no page errors");
await browser.close(); server.close();
process.exit(fail > 0 ? 1 : 0);
