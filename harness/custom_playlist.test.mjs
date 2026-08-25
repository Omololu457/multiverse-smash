// harness/custom_playlist.test.mjs — player-authored CUSTOM PLAYLIST (third music source).
// Verifies: the browser lists all 103 songs (windowed + scrollable, not one screen); building &
// saving a custom playlist stores real persisted data; it SURVIVES a page reload; selecting the
// "custom" source plays ONLY the chosen songs; the editable model re-opens pre-checked; an empty
// custom playlist falls back to default with a message; and the default + personalized sources are
// untouched by all of this.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const eqSet = (a, b) => a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);
const menuOrder = () => P(() => window.__harness.menuAudio().order);
const boot = async () => { await page.waitForFunction(() => !!window.__harness && !!window.__harness.library, null, { timeout: 15000 }); await page.mouse.click(640, 360); await P(() => window.__harness.boot()); };

const PICK = ["Almeda.mp3", "At The Club.mp3", "Boo'd Up.mp3", "PAIN 1993 [OG]  SLOWED & REVERB.mp3"];

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
  await boot();

  console.log("\n── GUEST (no account) — the scenario the real bug happened in ──");
  check("running as a guest (no account created)", await P(() => window.__harness.library.hasAccount()) === false, "");

  console.log("\n── library + browser windowing (all 103, scrollable) ──");
  check("library has all 103 songs", await P(() => window.__harness.library.size()) === 103, "");
  await P(() => window.__harness.showSettings());
  const opened = await P(() => window.__harness.library.open());
  check("Build opens the MUSIC_LIBRARY browser", opened.state === "musicLibrary", `state=${opened.state}`);
  check("fresh build starts with nothing pre-checked", opened.preChecked.length === 0, `pre=${opened.preChecked.length}`);
  const rows0 = await P(() => window.__harness.library.scrollBy(0));
  check("browser windows the list (not all 103 rendered at once)", rows0.rows.length > 6 && rows0.rows.length < 103, `visible=${rows0.rows.length}`);
  const rowsScrolled = await P(() => window.__harness.library.scrollBy(1200));
  check("scrolling reveals different songs (real scroll, not a single page)", rowsScrolled.rows[0] !== rows0.rows[0] && rowsScrolled.scroll > 0, `top: ${rows0.rows[0]} → ${rowsScrolled.rows[0]}`);
  await P(() => window.__harness.library.scrollBy(-99999));   // back to top

  console.log("\n── build + save a small custom playlist (a few tracks is valid) ──");
  const n = await P((files) => { let c = 0; for (const f of files) c = window.__harness.library.toggle(f); return c; }, PICK);
  check("running selected-count tracks toggles", n === PICK.length, `count=${n}`);
  const saved = await P(() => window.__harness.library.save());
  check("save returns to the previous screen", saved.state === "settings", `state=${saved.state}`);
  check("save switches active source to 'custom'", saved.source === "custom", `source=${saved.source}`);
  check("custom playlist stored = exactly the chosen songs", eqSet(saved.custom, PICK), saved.custom.join(", "));
  check("live menu now plays ONLY the chosen songs", eqSet(await menuOrder(), PICK), (await menuOrder()).join(", "));

  console.log("\n── editable model: reopening pre-checks the saved songs ──");
  await P(() => window.__harness.showSettings());
  const reopened = await P(() => window.__harness.library.open());
  check("reopen pre-checks the saved custom songs", eqSet(reopened.preChecked, PICK), reopened.preChecked.join(", "));
  await P(() => window.__harness.library.cancel());

  console.log("\n── PERSISTENCE across a full page reload ──");
  await page.reload({ waitUntil: "load" });
  await boot();
  const afterCustom = await P(() => window.__harness.library.getCustom());
  const afterSource = await P(() => window.__harness.library.source());
  check("custom playlist survived reload", eqSet(afterCustom, PICK), afterCustom.join(", "));
  check("active source ('custom') survived reload", afterSource === "custom", `source=${afterSource}`);
  const resolved = await P(() => window.__harness.library.resolve());
  check("reloaded custom resolves to the chosen songs (no fallback)", resolved.fellBack === false && eqSet(resolved.files, PICK), JSON.stringify({ fellBack: resolved.fellBack, files: resolved.files.length }));
  await P(() => window.__harness.library.setSource("custom"));
  check("after reload, playing custom yields ONLY the chosen songs", eqSet(await menuOrder(), PICK), (await menuOrder()).join(", "));

  console.log("\n── empty custom playlist → honest fallback to default (no silence/crash) ──");
  await P(() => window.__harness.library.open());
  await P((files) => { for (const f of files) window.__harness.library.toggle(f); }, PICK);   // toggle all off
  const emptied = await P(() => window.__harness.library.save());
  check("empty custom saves as empty", emptied.custom.length === 0, `n=${emptied.custom.length}`);
  const emptyResolve = await P(() => window.__harness.library.resolve());
  check("empty custom falls back to default with a message", emptyResolve.fellBack === true && /empty/i.test(emptyResolve.message), emptyResolve.message);
  check("empty custom plays the default = ALL songs (not silence)", (await menuOrder()).length === 103, `n=${(await menuOrder()).length}`);

  console.log("\n── the other two sources still work and weren't disturbed ──");
  await P(() => window.__harness.library.setSource("default"));
  check("Default source → the entire library (all 103 songs)", (await menuOrder()).length === 103, `n=${(await menuOrder()).length}`);
  await P(() => { for (let i = 0; i < 3; i++) window.__harness.personality.event("sidequest_no_reward"); });   // build a confident profile
  const pers = await P(() => window.__harness.library.setSource("personalized"));
  check("Personalized source → trait-informed order (not fallback)", pers.fellBack === false && pers.files === 103, JSON.stringify({ fellBack: pers.fellBack, files: pers.files }));
  check("Personalized live menu holds all 103 tracks", (await menuOrder()).length === 103, `n=${(await menuOrder()).length}`);
  // Custom is still intact & selectable after touching the others.
  await P(() => window.__harness.library.open());
  await P((files) => { for (const f of files) window.__harness.library.toggle(f); }, PICK);
  await P(() => window.__harness.library.save());
  check("custom remains a separate, re-selectable source", eqSet(await menuOrder(), PICK), (await menuOrder()).join(", "));

  console.log("\n── no JS errors ──");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error(e); fail++;
} finally {
  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
