// harness/chrollo_bandits_echo_stage2.mjs — BANDIT'S ECHO Stage 2: MARK-ON-CONNECT detection.
// Chrollo (p2, defender) is hit by a REAL opponent (Batman, p1). Proves: a NORMAL connect does NOT mark;
// a projectile SPECIAL (Batarang) marks; a BLOCKED special does NOT overwrite the mark; a clean MELEE
// special (Cape Dash) OVERWRITES the mark. Plus a screenshot of the HUD mark badge appearing on Chrollo.
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
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ─────────────────────────`);

const server = await startServer();
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const be = () => page.evaluate(() => window.__harness.beState("p2"));   // Chrollo is p2 (the defender being marked)
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const shot = name => page.screenshot({ path: path.join(OUT, `chrollo_be_s2_${name}.png`) });

// position Chrollo (p2) `gap` px to the RIGHT of Batman (p1), reset the dummy + p1 attack state + energy.
async function prep(gap) {
  await waitGrounded();
  await page.evaluate(() => { window.__harness.resetFighterInput("p1"); window.__harness.clearProjectiles?.(); window.__harness.healP2(); window.__harness.setP2Invuln?.(0); window.__harness.setP2ForceBlock?.(false); window.__harness.fillEnergy?.(); });
  const a = await p1();
  await page.evaluate(x => window.__harness.setP2X(x), a.x + gap);
  // wait until Batman is fully actionable — a prior move's attack state must fully settle, else canStart
  // gates the next special (attacking/attackCooldown still live → the press is silently swallowed).
  await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && !p.attacking && (p.attackCooldown || 0) <= 0; }, null, { timeout: 6000, polling: 16 }).catch(() => {});
  await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=batman&p2=chrollo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);

  // ── 0) baseline ──
  section("baseline — no mark before anything lands");
  check("Chrollo starts with NO Echo mark", (await be()) === null, `beState=${JSON.stringify(await be())}`);

  // ── 1) NORMAL connect must NOT mark ──
  section("a NORMAL (light) connect does NOT create a mark");
  await prep(70);
  let hp0 = (await p2()).health;
  await page.keyboard.down("j"); await waitFrames(4); await page.keyboard.up("j"); await waitFrames(10);
  const afterNormal = await be();
  check("Batman light connected (Chrollo took damage)", (await p2()).health < hp0, `−${(hp0 - (await p2()).health).toFixed(0)}`);
  check("normal did NOT mark (specials/ultimates only)", afterNormal === null, `beState=${JSON.stringify(afterNormal)}`);

  // ── 2) PROJECTILE SPECIAL marks ──
  section("a projectile SPECIAL (Batarang) connecting on Chrollo MARKS it");
  await prep(96);
  hp0 = (await p2()).health;
  await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");   // neutral special = Batarang (projectile)
  await page.waitForFunction(() => window.__harness.beState("p2") !== null, null, { timeout: 3000, polling: 16 }).catch(() => {});
  const m1 = await be();
  check("Batarang connected (Chrollo took damage)", (await p2()).health < hp0, `−${(hp0 - (await p2()).health).toFixed(0)}`);
  check("mark created", !!m1, `beState=${JSON.stringify(m1)}`);
  check("mark source = batman (opponent kit)", m1?.rosterKey === "batman", `rosterKey=${m1?.rosterKey}`);
  check("mark tier = SPECIAL (not ultimate)", m1?.isUltimate === false, `isUltimate=${m1?.isUltimate}`);
  check("mark display name present", !!m1?.displayName, `displayName=${m1?.displayName}`);
  await shot("mark_special");   // HUD badge should read "◈ ECHO: Batman SP"

  // ── 3) a BLOCKED special must NOT overwrite the mark ──
  section("a BLOCKED special does NOT create/overwrite a mark");
  await prep(60);
  await page.evaluate(() => window.__harness.setP2ForceBlock(true));   // Chrollo holds guard
  await waitFrames(2);
  await page.keyboard.down("d"); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l");   // Fwd+Special = Cape Dash (melee lunge) — into the block
  await waitFrames(12); await page.keyboard.up("d");
  const m2 = await be();
  check("mark UNCHANGED after a blocked special (still the Batarang mark)", m2?.moveName === m1?.moveName && m2?.isUltimate === false, `moveName=${m2?.moveName}`);
  await page.evaluate(() => window.__harness.setP2ForceBlock(false));

  // ── 4) a clean MELEE special OVERWRITES the mark ──
  section("a clean MELEE special (Cape Dash) OVERWRITES the mark (most-recent wins)");
  await prep(64);
  hp0 = (await p2()).health;
  await page.keyboard.down("d"); await page.keyboard.down("l"); await waitFrames(3); await page.keyboard.up("l"); await waitFrames(11); await page.keyboard.up("d");
  await waitFrames(6);
  const m3 = await be();
  check("Cape Dash connected (Chrollo took damage)", (await p2()).health < hp0, `−${(hp0 - (await p2()).health).toFixed(0)}`);
  check("mark OVERWRITTEN to the new move (moveName changed)", !!m3 && m3.moveName !== m1?.moveName, `moveName ${m1?.moveName} → ${m3?.moveName}`);
  check("overwritten mark still batman, still SPECIAL tier", m3?.rosterKey === "batman" && m3?.isUltimate === false, `rosterKey=${m3?.rosterKey} isUlt=${m3?.isUltimate}`);
  check("forward-branch direction captured", m3?.dir === "F", `dir=${m3?.dir}`);
  await shot("mark_overwritten");

  // ── integrity ──
  section("integrity");
  check("no uncaught JS errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) { console.error("FATAL", e); FAIL++; }
finally {
  console.log(`\n${"═".repeat(52)}\n  CHROLLO Bandit's Echo Stage 2 (mark-on-connect): ${PASS} passed, ${FAIL} failed\n${"═".repeat(52)}`);
  await browser.close(); server.close();
  process.exit(FAIL === 0 ? 0 : 1);
}
