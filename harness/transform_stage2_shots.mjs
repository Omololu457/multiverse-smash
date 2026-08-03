// harness/transform_stage2_shots.mjs — TRANSFORMATION JUTSU Stage 2 EVIDENCE (Tier 1 Disguise, Naruto).
// Boots Naruto vs Sasuke so Naruto can disguise as a DIFFERENT character. Activates Tier 1 (→↓← + Special)
// and proves: APPEARANCE becomes Sasuke's, but rosterKey / basic_attacks / specials / stats stay Naruto's
// AND a cast move is still Naruto's own (Rasengan connects). Outputs harness/shots/transform_s2_*.png.
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
page.on("pageerror", e => console.log("  ⚠️  pageerror:", e.message));

const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const tj = () => page.evaluate(() => window.__harness.p1TransformJutsu());
const projNames = () => page.evaluate(() => window.__harness.projectiles().map(p => p.name));
const shot = (name) => page.screenshot({ path: path.join(OUT, name) }).then(() => console.log("  📸", name));
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function tap(key, hold = 2) { await page.keyboard.down(key); await waitFrames(hold); await page.keyboard.up(key); }
async function motion(seq) { const d = seq.slice(0, -1), l = seq[seq.length - 1]; for (const k of d) await page.keyboard.press(k); await tap(l); }

let fails = 0;
const check = (label, ok, detail) => { console.log(`  ${ok ? "✅" : "❌"} ${label}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

try {
  await page.goto(`${base}/index.html?harness=1&p1=naruto&p2=sasuke`, { waitUntil: "load" });
  await page.waitForFunction(() => window.__harness && window.__harness.state, null, { timeout: 15000, polling: 16 });
  await page.evaluate(() => { window.__harness.start?.(); window.__harness.skipToBattle?.(); });
  await waitFrames(30);
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && !p.currentMove; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP1?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); window.__harness.setP2Invuln?.(0); });
  const me = await p1(); await page.evaluate(x => window.__harness.setP2X(x), me.x + 70); await waitFrames(2);

  // ── Baseline (Naruto, undisguised) ──
  const b = await tj(); const bHp = (await p1()).maxHealth;
  console.log(`\n  BASELINE: name=${b.name} rosterKey=${b.rosterKey} sheet=${b.spriteSheet} lightDmg=${b.lightDmg} maxHP=${bHp}`);
  await shot("transform_s2_before.png");

  // ── Activate Tier 1 Disguise: →↓← + Special ──
  await motion(["d", "s", "a", "l"]);
  await waitFrames(6);
  const a = await tj(); const aHp = (await p1()).maxHealth;
  await shot("transform_s2_disguise.png");
  console.log(`  DISGUISED: name=${a.name} rosterKey=${a.rosterKey} sheet=${a.spriteSheet} lightDmg=${a.lightDmg} maxHP=${aHp} tjTier=${a.tier} target=${a.target}`);

  check("Tier 1 activated (disguise on)", a.active === true && a.tier === 1, `tier=${a.tier}`);
  check("APPEARANCE changed → looks like the opponent (Sasuke)", a.name === "Sasuke" && /sasuke/i.test(a.spriteSheet || ""), `name=${a.name} sheet=${a.spriteSheet}`);
  check("rosterKey stayed NARUTO (move dispatch unchanged)", a.rosterKey === "naruto", `rosterKey=${a.rosterKey}`);
  check("basic-attack damage UNCHANGED (Naruto's 44)", a.lightDmg === b.lightDmg, `${b.lightDmg}→${a.lightDmg}`);
  check("specials list UNCHANGED (still Naruto's kit)", JSON.stringify(a.specialsKeys) === JSON.stringify(b.specialsKeys) && a.specialsKeys.includes("rasengan"), `${a.specialsKeys.join(",")}`);
  check("max HP UNCHANGED (Naruto's stats intact)", aHp === bHp, `${bHp}→${aHp}`);

  // ── Prove MOVES stayed his own: cast Naruto's Rasengan while disguised ──
  await page.evaluate(() => { window.__harness.resetFighterInput?.("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); });
  const hp0 = (await p2()).health;
  await tap("l");                 // neutral Special = Naruto's Rasengan (his own move)
  await waitFrames(6);
  const sawRasengan = (await projNames()).includes("rasenganOrb");
  await waitFrames(20);
  const dmg = hp0 - (await p2()).health;
  check("cast his OWN move while disguised (Rasengan fired)", sawRasengan, `proj=[${(await projNames()).join(",")}]`);
  check("his own move dealt his own damage", dmg > 0, `Δhp=${dmg.toFixed(0)}`);

  // ── Revert ──
  await page.evaluate(() => window.__harness.forceRevertTransformJutsu());
  await waitFrames(4);
  const r = await tj();
  await shot("transform_s2_reverted.png");
  check("reverts cleanly (appearance back to Naruto)", r.active === false && r.name === "Naruto" && /naruto/i.test(r.spriteSheet || ""), `name=${r.name} sheet=${r.spriteSheet}`);

  console.log(`\n${fails === 0 ? "✅" : "❌"} Transformation Jutsu Tier 1 (Naruto): ${fails} failed check(s)`);
} catch (e) {
  console.log("  ⚠️ error:", e.message); fails++;
} finally {
  await browser.close();
  server.close();
  process.exit(fails === 0 ? 0 : 1);
}
