// harness/music_personality.test.mjs — TRAIT → MUSIC mapping + trait-informed selection.
// Proves: all 103 songs are catalogued + grouped by trait; the selector ranks hype tracks
// first for a high-Extraversion profile and moody tracks first for high-Neuroticism; a
// low-confidence / early-game profile falls back to the DEFAULT order (no half-formed
// personalization, doc §7); and the account-integrated path (real tracked profile) both
// reports personalization honestly AND actually swaps the live menu playlist when applied.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const P = (fn, ...a) => page.evaluate(fn, ...a);

// A/E/N affinity anchor songs (dominant tag) used to assert ranking direction.
const PARTY = ["At The Club.mp3", "DaBaby x Stunna 4 Vegas - No Dribble.mp3", "Freek-A-Leek Remix (feat. Twista and Jermaine Dupri).mp3"];
const MOODY = ["PAIN 1993 [OG]  SLOWED & REVERB.mp3", "Shiloh Dynasty - So low.mp3", "j. cole  no role modelz ﾉ slowed  reverb ﾉ.mp3"];

try {
  await page.goto(`${base}/index.html?harness=1&p1=goku&p2=piccolo`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness && !!window.__harness.music && !!window.__harness.personality, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await P(() => window.__harness.boot());

  console.log("\n── catalogue + grouping (group songs by personality type) ──");
  const size = await P(() => window.__harness.music.catalogSize());
  check("all 103 songs catalogued", size === 103, `size=${size}`);
  const groups = await P(() => window.__harness.music.groups());
  const total = ["O", "C", "E", "A", "N"].reduce((a, t) => a + groups[t].length, 0);
  check("every song grouped under exactly one dominant trait", total === 103, `sum=${total}`);
  check("all five trait groups exist", ["O", "C", "E", "A", "N"].every(t => Array.isArray(groups[t])), JSON.stringify(Object.fromEntries(["O", "C", "E", "A", "N"].map(t => [t, groups[t].length]))));
  check("Boo'd Up grouped under Agreeableness", groups.A.includes("Boo'd Up.mp3"), groups.A.slice(0, 3).join(", "));
  check("At The Club grouped under Extraversion", groups.E.includes("At The Club.mp3"), "");

  console.log("\n── trait-informed ranking: high-E → hype, high-N → moody ──");
  const hiE = { E: { mu: 6.5, confidence: 80 }, O: { mu: 4, confidence: 80 }, C: { mu: 4, confidence: 80 }, A: { mu: 4, confidence: 80 }, N: { mu: 4, confidence: 80 } };
  const hiN = { N: { mu: 6.5, confidence: 80 }, O: { mu: 4, confidence: 80 }, C: { mu: 4, confidence: 80 }, A: { mu: 4, confidence: 80 }, E: { mu: 4, confidence: 80 } };
  const rankE = await P((p) => window.__harness.music.rank(p, 5), hiE);
  const rankN = await P((p) => window.__harness.music.rank(p, 5), hiN);
  check("high-Extraversion top pick is a party track", PARTY.includes(rankE[0].file), rankE[0].file);
  check("high-Neuroticism top pick is a moody track", MOODY.includes(rankN[0].file), rankN[0].file);
  check("the two profiles produce different top songs", rankE[0].file !== rankN[0].file, `${rankE[0].file} vs ${rankN[0].file}`);

  console.log("\n── low-confidence / early-game → default order fallback (doc §7) ──");
  const order0 = await P(() => window.__harness.music.order());
  check("fresh profile does NOT personalize", order0.personalized === false, `personalized=${order0.personalized}`);
  check("fallback returns the full 103-song default order", order0.files.length === 103 && order0.files[0] === "20 Min.mp3", `n=${order0.files.length} first=${order0.files[0]}`);
  // Pressing the button with NO confident profile must NOT swap the curated menu — it keeps the
  // current playlist and shows amber guidance instead of dumping 103 default-ordered songs in.
  const curatedLen = (await P(() => window.__harness.menuAudio())).order.length;
  const gatedPress = await P(() => window.__harness.music.pressPersonalize());
  const afterGated = (await P(() => window.__harness.menuAudio())).order.length;
  check("button with no signal does NOT personalize (amber)", gatedPress.personalized === false && gatedPress.ok === false, JSON.stringify(gatedPress));
  check("button with no signal leaves the current playlist untouched", afterGated === curatedLen, `${curatedLen} → ${afterGated}`);

  console.log("\n── account-integrated: a tracked profile drives the order ──");
  // Build a confident, elevated Agreeableness read (one STRONG A+ event already clears the confidence gate).
  await P(() => { for (let i = 0; i < 3; i++) window.__harness.personality.event("sidequest_no_reward"); });
  const order1 = await P(() => window.__harness.music.order());
  check("tracked A profile now personalizes", order1.personalized === true, `personalized=${order1.personalized}`);
  check("Agreeableness confidence cleared the 50% gate", (order1.profile?.A?.confidence ?? 0) >= 50, `A.conf=${order1.profile?.A?.confidence}`);
  const A_SONGS = ["Boo'd Up.mp3", "baby you're worth it.mp3", "Wine & Dine.mp3", "It Seems Like You're Ready - R. Kelly (sped up  pitched).mp3", "Ella Mai - Trip (Audio).mp3"];
  check("top personalized pick is an Agreeableness track", A_SONGS.includes(order1.files[0]), order1.files[0]);

  console.log("\n── apply(): the LIVE menu playlist is actually swapped to the personalized order ──");
  const applied = await P(() => window.__harness.music.apply());
  const live = await P(() => window.__harness.menuAudio());
  check("apply() reports personalization", applied?.personalized === true, "");
  check("live MENU_PLAYLIST now holds all 103 personalized tracks", live.order.length === 103, `n=${live.order.length}`);
  check("live playlist starts on the personalized top pick", live.order[0] === order1.files[0], `${live.order[0]}`);

  console.log("\n── Settings 'Personalize by playstyle' BUTTON (confident profile) ──");
  const rows = await P(() => window.__harness.music.visibleRows());
  check("playlist panel caps visible rows (≤9) so a 103-track list can't overflow", rows <= 9, `visibleRows=${rows}`);
  const pressed = await P(() => window.__harness.music.pressPersonalize());
  check("button personalizes with a tracked profile (green)", pressed.personalized === true && pressed.ok === true, JSON.stringify(pressed));
  check("button label reports the track count", /Personalized · \d+ tracks/.test(pressed.msg), pressed.msg);
  const liveAfterBtn = await P(() => window.__harness.menuAudio());
  check("button swapped the live menu to the personalized order", liveAfterBtn.order[0] === order1.files[0], liveAfterBtn.order[0]);

  console.log("\n── no JS errors ──");
  check("no page errors during the run", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
} catch (e) {
  console.error(e); fail++;
} finally {
  await browser.close(); server.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
}
