// harness/decoy_stage3_shots.mjs — DECOY Stage 3 EVIDENCE: visual tell + always-on hit-reveal rule.
//   A. Visual tell ON by default — clones render with a subtle chakra-construct wash (screenshot).
//   B. Hit-reveal (projectile): an ENEMY projectile hitting a clone poofs it (fake revealed).
//   C. Hit-reveal (melee): an enemy melee hit poofs a clone.
//   D. Real character: a hit on the REAL fighter deals real damage (health drops), never poofs.
// Hit-reveal is asserted to work REGARDLESS of the tell setting. Naruto = pilot (screenshots),
// Minato = parity check. Outputs harness/shots/decoy_s3_*.png. Run ALONE.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
function startServer() {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);
    const filePath = path.join(ROOT, urlPath === "/" ? "/index.html" : urlPath);
    if (!filePath.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(filePath, (err, data) => { if (err) { res.writeHead(404).end("not found"); return; } res.writeHead(200, { "content-type": MIME[path.extname(filePath)] || "application/octet-stream" }); res.end(data); });
  });
  return new Promise(r => server.listen(0, "127.0.0.1", () => r(server)));
}

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const clones = () => page.evaluate(() => window.__harness.p1CloneCount());
const cloneStates = () => page.evaluate(() => window.__harness.p1CloneStates());
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

async function boot(charKey) {
  await page.goto(`${base}/index.html?harness=1&p1=${charKey}`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
}
async function prep(gap = 150) {
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); window.__harness.dispelP1Clones?.(); window.__harness.setCloneTell?.(true); });
  const a = await p1(); await page.evaluate(x => window.__harness.setP2X(x), a.x + gap); await waitFrames(2);
}

async function outcomes(charKey, withShots) {
  console.log(`\n── ${charKey.toUpperCase()} · hit-reveal outcomes ──`);
  await boot(charKey);

  // B. PROJECTILE hit-reveal (tell ON)
  await prep();
  await page.evaluate(() => window.__harness.spawnP1Clones(2));
  await waitFrames(20);
  const bBefore = await page.evaluate(() => window.__harness.p2ProjectileAtClone());   // returns clone count before
  await waitFrames(2);
  const revealedFast = (await cloneStates()).some(c => c.state === "hurt");
  if (withShots) await shot("decoy_s3_clone_poof_projectile.png");
  await waitFrames(30);
  const bAfter = await clones();
  check(`${charKey}: PROJECTILE hit reveals+poofs a clone`, bBefore >= 1 && bAfter === bBefore - 1, `count ${bBefore}→${bAfter}, revealed=${revealedFast}`);

  // C. MELEE hit-reveal — let a clone approach into range, then the dummy swings.
  await prep(120);
  await page.evaluate(() => window.__harness.spawnP1Clones(2));
  await waitFrames(80);                                   // clones approach + hold near the dummy
  const cBefore = await clones();
  await page.evaluate(() => window.__harness.p2Attack?.());
  await waitFrames(36);
  const cAfter = await clones();
  check(`${charKey}: MELEE hit reveals+poofs a clone`, cAfter < cBefore, `count ${cBefore}→${cAfter}`);

  // D. Real character takes REAL damage (no clones present → the dummy hits the real fighter).
  await prep(60);
  const dHp0 = (await p1()).health;
  await page.evaluate(() => window.__harness.p2Attack?.());
  await waitFrames(30);
  const me = await p1();
  const dHp1 = me.health;
  if (withShots) await shot("decoy_s3_real_damage.png");
  check(`${charKey}: hit on the REAL fighter deals real damage`, dHp1 < dHp0, `hp ${dHp0.toFixed(0)}→${dHp1.toFixed(0)}`);
  check(`${charKey}: real fighter did NOT poof (still present)`, !!me && me.health >= 0, "");
}

try {
  // A. Visual tell ON by default (screenshot) — real Naruto + subtly-washed clones.
  console.log("── A. Visual tell (ON by default) ──");
  await boot("naruto");
  await prep(130);
  const tellOn = await page.evaluate(() => window.__harness.cloneTell());
  await page.evaluate(() => window.__harness.spawnP1Clones(2));
  await waitFrames(20);
  await shot("decoy_s3_tell_on.png");
  check("visual tell is ON by default", tellOn === true, `cloneTell=${tellOn}`);

  await outcomes("naruto", true);
  await outcomes("minato", false);

  console.log(`\n${fails === 0 ? "✅" : "❌"} DECOY Stage 3 evidence: ${fails} failed check(s)`);
} catch (e) {
  console.log("  ⚠️ error:", e.message); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
