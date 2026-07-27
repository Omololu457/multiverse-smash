// harness/tobirama_edo_vesselintro.mjs — FIX 2 verification: when the Edo Tensei tomb finishes opening
// and the summoned vessel takes the field, it plays ITS OWN intro (the same pose + intro voice line a
// match-start intro fires) as a brief FROZEN reveal beat AFTER the coffin cinematic ends (no overlap with
// the tomb reveal). Vessel = FLASH (has both a dedicated intro pose and an intro voice pool).
// Unlike the other Edo tests this lets the summon cinematic play out NATURALLY (no skipCine), so the
// follow-on vessel-intro beat actually triggers, and screenshots the vessel mid-intro.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots");
fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
const introBeat = () => page.evaluate(() => window.__harness.edoBackup.introBeat("p1"));
const cine = () => page.evaluate(() => window.__harness.edoBackup.cine());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
async function installSpy() { await page.evaluate(() => { const s = window.__harness.__sound; s._sfxSpy = s._sfxSpy || []; if (!s._spied) { s._spied = true; const orig = s.playSfxFile.bind(s); s.playSfxFile = (f, fb) => { try { s._sfxSpy.push(String(f)); } catch (_) {} return orig(f, fb); }; } }); }
const sfxLog = () => page.evaluate(() => (window.__harness.__sound._sfxSpy || []).slice());
const FLASH_INTRO = ["flashinj2_002_t01m36_8s.mp3", "flashinj2_008_t03m47_4s.mp3"];

try {
  await page.goto(`${base}/index.html?harness=1&p1=tobirama`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(6);
  await installSpy();

  // ── Reanimate the FLASH vessel, letting the summon cinematic play out NATURALLY ──
  section("summon the vessel — let the coffin cinematic play in full (no skip)");
  await waitGrounded();
  await page.evaluate(() => { window.__harness.edoBackup.setBackup("flash"); window.__harness.setP1Energy(200); window.__harness.resetUlt(); window.__harness.healP1(); });
  await waitFrames(2);
  await page.evaluate(() => { window.__harness.__sound._sfxSpy = []; });
  await page.keyboard.down("u"); await waitFrames(3); await page.keyboard.up("u");
  // wait for the coffin cinematic to be running…
  await page.waitForFunction(() => window.__harness.edoBackup.cine().active, null, { timeout: 8000, polling: 16 }).catch(() => {});
  const cineOn = await cine();
  check("coffin summon cinematic is playing", cineOn.active && cineOn.mode === "in", `active=${cineOn.active} mode=${cineOn.mode}`);

  // …then wait for it to FULLY end (tomb closed, body-swap resolved).
  await page.waitForFunction(() => !window.__harness.edoBackup.cine().active, null, { timeout: 12000, polling: 16 }).catch(() => {});
  const swapped = await p1();
  check("tomb cinematic finished + vessel swapped in (Flash)", swapped.edoActive && swapped.key === "flash", `key=${swapped.key} edoActive=${swapped.edoActive}`);

  // ── the vessel-intro reveal beat fires AFTER the tomb closes (no overlap with the coffin) ──
  section("summoned vessel plays ITS OWN intro (pose + voice) after the tomb closes");
  await page.waitForFunction(() => window.__harness.edoBackup.introBeat("p1")?.playing, null, { timeout: 4000, polling: 16 }).catch(() => {});
  const beat = await introBeat();
  const noCoffinDuringIntro = !(await cine()).active;   // the tomb cinematic must already be DONE (no overlap)
  check("vessel-intro beat is playing", !!beat?.playing && !!beat?.introPlaying, `playing=${beat?.playing} introPlaying=${beat?.introPlaying}`);
  check("intro plays its OWN intro variant (Flash's intro pose, not idle)", beat?.variant === "intro", `variant=${beat?.variant}`);
  check("intro beat runs AFTER the coffin cinematic (no overlap)", noCoffinDuringIntro, `coffinActive=${(await cine()).active}`);

  // let a few frames of the pose play, then screenshot the reveal
  await waitFrames(18);
  await page.screenshot({ path: path.join(OUT, "tobirama_edo_vessel_intro.png") });

  // the intro VOICE line should have fired during the beat (same clip a match-start Flash intro uses)
  const log = await sfxLog();
  const firedIntroVoice = log.some(f => FLASH_INTRO.includes(f));
  check("vessel's own intro VOICE line fired during the reveal", firedIntroVoice, `sfx=${log.filter(f => f.startsWith("flash")).join(",") || "(none)"}`);

  // ── the beat ENDS and hands control to the vessel; the window is still live ──
  section("beat ends → control to the vessel, window intact");
  await page.waitForFunction(() => !window.__harness.edoBackup.introBeat("p1")?.playing, null, { timeout: 6000, polling: 16 }).catch(() => {});
  const after = await p1();
  const afterBeat = await introBeat();
  check("intro beat ended (control handed to the vessel)", !afterBeat?.playing && !afterBeat?.introPlaying, `playing=${afterBeat?.playing}`);
  check("still the summoned vessel with the Edo window live", after.edoActive && after.key === "flash", `key=${after.key} edoActive=${after.edoActive}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Edo Tensei vessel-intro reveal: ${PASS} passed, ${FAIL} failed — shot: tobirama_edo_vessel_intro.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
