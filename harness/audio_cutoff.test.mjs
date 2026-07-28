// harness/audio_cutoff.test.mjs — GLOBAL voice-audio policy (shared system), REVISED rule.
// Proves: (A) a voice line plays to NATURAL COMPLETION — it is NOT cut when its source animation ends;
// (B) SINGLE VOICE CHANNEL per character — a new line from the SAME character stops that character's
// current line (no self-overlap); (C) CROSS-CHARACTER overlap is allowed (A's line + B's line coexist);
// (D) a match end still STOPS combat audio while a persistent win-line survives. Runs for 2 characters.
import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const section = t => console.log(`\n── ${t} ──`);

const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const stateF = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await stateF()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 20000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
const active = () => page.evaluate(() => window.__harness.sfxActive());
const hasFile = (list, f) => list.some(e => e.file === f);

const LONG  = "flashinj2_005_t01m47_5s.mp3";   // long clip → outlasts a short action (natural-completion test)
const LONG2 = "flashinj2_021_t10m04_6s.mp3";   // a 2nd distinct long clip (single-channel + cross-char tests)

async function boot(p1char, vs = false) {
  await page.goto(`${base}/index.html?harness=1&p1=${p1char}`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  // training boot (no AI) for the animation-end test (needs a still opponent); vs boot for match-end
  // (checkRoundEnd's KO/round-end handling is intentionally SKIPPED in training).
  await page.evaluate(v => (v ? window.__harness.bootVs() : window.__harness.boot()), vs);
  await waitFrames(6);
}

try {
  await boot("flash");

  // ── UNIT: the stop mechanism (owner-scoped, all, persistent) ──
  section("stop mechanism (registry)");
  await page.evaluate(() => window.__harness.sfxStopAll(true));   // clean slate
  await page.evaluate((f) => { window.__harness.playSfxOwned(f, "p1"); }, LONG);
  await page.evaluate(() => window.__harness.playSfxOwned("beerus_win.mp3", "none", true));   // UNOWNED persistent (real win-lines are owner=null, fired outside combat)
  let a = await active();
  check("cues register as active", hasFile(a, LONG) && hasFile(a, "beerus_win.mp3"), `active=${a.length}`);
  await page.evaluate(() => window.__harness.sfxStopAll(false));   // match-end hammer (preserve persistent)
  a = await active();
  check("stopAllSfx() stops non-persistent, KEEPS persistent (win-line)", !hasFile(a, LONG) && hasFile(a, "beerus_win.mp3"), `active=[${a.map(e => e.file).join(",")}]`);
  await page.evaluate(() => window.__harness.sfxStopAll(true));   // menu-return hammer
  a = await active();
  check("stopAllSfx({includePersistent}) stops EVERYTHING", a.length === 0, `active=${a.length}`);

  // ── per-character integration ──
  for (const ch of ["flash", "killua"]) {
    section(`${ch} — natural completion + single channel + cross-char + match-end`);
    if (ch !== "flash") await boot(ch);
    await page.evaluate(() => window.__harness.sfxStopAll(true));
    await waitGrounded();
    // put the opponent far so a swing whiffs (no real connect voice) — isolates the injected clips
    await page.evaluate(() => { const p = window.__harness.p1(); window.__harness.setP2X(p.x + 400); window.__harness.healP1?.(); window.__harness.healP2?.(); });

    // (A) NATURAL COMPLETION: a long clip owned by p1 survives while idle, survives DURING an action, and
    //     — the REVISED behaviour — is STILL PLAYING well after the action ends (no animation-end cut).
    await page.evaluate((f) => window.__harness.playSfxOwned(f, "p1"), LONG);
    await waitFrames(6);
    check(`${ch}: clip plays while idle`, hasFile(await active(), LONG), "");
    await page.keyboard.down("k"); await waitFrames(3);   // heavy swing → p1 is "acting"
    check(`${ch}: clip still playing DURING the animation`, hasFile(await active(), LONG), "");
    await page.keyboard.up("k");
    await page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && !p.currentMove; }, null, { timeout: 4000, polling: 16 }).catch(() => {});
    await waitFrames(40);   // ~0.7s of idle AFTER the action ended — the old rule would have cut it here
    await page.screenshot({ path: path.join(OUT, `audio_cutoff_${ch}_natural.png`) });
    check(`${ch}: clip STILL PLAYING after the animation ended (natural completion, NOT cut)`, hasFile(await active(), LONG), `active=[${(await active()).map(e => e.file).join(",")}]`);

    // (B) SINGLE VOICE CHANNEL (same character): a NEW owned line stops that owner's current line.
    await page.evaluate(() => window.__harness.sfxStopAll(true));
    await page.evaluate((f) => window.__harness.playSfxOwned(f, "p1"), LONG);
    await waitFrames(2);
    check(`${ch}: first line active`, hasFile(await active(), LONG), "");
    await page.evaluate((f) => window.__harness.playSfxOwned(f, "p1"), LONG2);   // 2nd line, SAME character
    await waitFrames(2);
    { const a2 = await active(); check(`${ch}: 2nd same-character line STOPS the 1st (no self-overlap)`, hasFile(a2, LONG2) && !hasFile(a2, LONG), `active=[${a2.map(e => e.file).join(",")}]`); }

    // (C) CROSS-CHARACTER overlap is ALLOWED: p1's line and p2's line play at the same time.
    await page.evaluate(() => window.__harness.sfxStopAll(true));
    await page.evaluate((f) => window.__harness.playSfxOwned(f, "p1"), LONG);
    await page.evaluate((f) => window.__harness.playSfxOwned(f, "p2"), LONG2);
    await waitFrames(2);
    { const a3 = await active(); check(`${ch}: A's line + B's line play SIMULTANEOUSLY (cross-char overlap kept)`, hasFile(a3, LONG) && hasFile(a3, LONG2), `active=[${a3.map(e => e.file).join(",")}]`); }

    // (D) MATCH-END: a combat clip + a persistent win-line, then a real KO → combat clip stops, win-line
    //     survives. Uses a real vs-CPU match (checkRoundEnd's KO handling is skipped in training).
    await boot(ch, true);
    await waitGrounded();
    await page.evaluate(() => window.__harness.sfxStopAll(true));
    await page.evaluate((f) => { window.__harness.playSfxOwned(f, "p1"); window.__harness.playSfxOwned("beerus_win.mp3", "none", true); }, LONG);   // combat cue (owned p1) + UNOWNED persistent win-line
    check(`${ch}: pre-KO both cues active`, hasFile(await active(), LONG) && hasFile(await active(), "beerus_win.mp3"), "");
    await page.evaluate(() => window.__harness.forceP1Win?.());   // p2.health=0 → checkRoundEnd fires the round-end stopAllSfx
    await waitFrames(8);
    await page.screenshot({ path: path.join(OUT, `audio_cutoff_${ch}_matchend.png`) });
    const post = await active();
    check(`${ch}: match-end STOPS the combat cue`, !hasFile(post, LONG), `active=[${post.map(e => e.file).join(",")}]`);
    check(`${ch}: match-end PRESERVES the persistent win-line`, hasFile(post, "beerus_win.mp3"), `active=[${post.map(e => e.file).join(",")}]`);
  }

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Audio cutoff: ${PASS} passed, ${FAIL} failed`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL === 0 ? 0 : 1); }
