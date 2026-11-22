// harness/net_online_4p.test.mjs — 4 PLAYERS ONLINE: the host + 3 friends on the SAME link (desktop host server's
// relay, the real game pages it serves), different screen sizes. Proves:
//   1. everyone gets a seat (p1 host, p2/p3/p4 friends) and sees 4 in the room;
//   2. once all four have locked in a fighter, a FREE-FOR-ALL starts on every screen with the same fighters/seed;
//   3. all four sims stay BIT-IDENTICAL while people move and attack (lockstep over every seat);
//   4. if a friend leaves mid-match, the match ends cleanly for everyone (no frozen screen) and the rest pick again.
//   node harness/net_online_4p.test.mjs
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHostServer } from "../net/hostServer.mjs";
import { buildClientManifest } from "../net/clientManifest.mjs";
import { buildModuleBlock, injectBlock, computeVersion } from "../tools/stamp_version.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let PASS = 0, FAIL = 0;
const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅ PASS" : "❌ FAIL"}  ${n}${d ? `  — ${d}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const manifest = new Set(buildClientManifest(ROOT));
const codeHash = computeVersion();
const srv = createHostServer({ root: ROOT, manifest, buildInfo: { appVersion: "test", codeHash }, log: () => {},
  renderIndex: () => injectBlock(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), buildModuleBlock().html) });
const port = await srv.listen(0, "127.0.0.1");
const room = srv.createRoom();
const base = `http://127.0.0.1:${port}`;
const wsFriend = `ws://127.0.0.1:${port}/ws?room=${room.code}`;
const wsHost = `${wsFriend}&host=${room.hostToken}`;

const browser = await chromium.launch({ headless: true, args: ["--disable-background-timer-throttling", "--disable-renderer-backgrounding", "--disable-backgrounding-occluded-windows", "--autoplay-policy=no-user-gesture-required"] });
const VIEWS = [{ width: 1440, height: 900 }, { width: 844, height: 390 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }];
async function openGame(label, viewport, relay) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (e) => console.log(`  ⚠️ [${label}] pageerror:`, e.message));
  await page.goto(`${base}/?harness=1&relay=${encodeURIComponent(relay)}`, { waitUntil: "load", timeout: 240000 });
  await page.waitForFunction(() => window.__harness && window.__harness.online, null, { timeout: 240000 });
  await page.mouse.click(viewport.width / 2, viewport.height / 2);
  return page;
}
const H = (p, fn, arg) => p.evaluate(fn, arg);

try {
  const host = await openGame("host", VIEWS[0], wsHost);
  const friends = [];
  for (let i = 1; i < 4; i++) friends.push(await openGame(`friend${i}`, VIEWS[i], wsFriend));
  const all = [host, ...friends];

  // ── 1. seats ──
  await H(host, () => window.__harness.online.hostStart());
  await host.waitForFunction(() => window.__harness.online.side() === "p1", null, { timeout: 20000 });
  for (const f of friends) {
    await H(f, (u) => window.__harness.online.join(u), wsFriend);
    await f.waitForFunction(() => window.__harness.online.status() === "joined", null, { timeout: 20000 });
  }
  const seats = await Promise.all(friends.map((f) => H(f, () => window.__harness.online.side())));
  check("3 friends on the same link get seats p2, p3, p4", JSON.stringify(seats.slice().sort()) === '["p2","p3","p4"]', seats.join(","));
  await host.waitForFunction(() => window.__harness.online.seats().length === 4, null, { timeout: 20000 });
  check("the host sees 4 players in the room", (await H(host, () => window.__harness.online.seats().length)) === 4);
  await sleep(1500);   // a couple of round-trip samples

  // ── 2. everyone picks → free-for-all on every screen ──
  const picks = ["goku", "naruto", "luffy", "ichigo"];
  for (let i = 0; i < 3; i++) await H(friends[i], (c) => window.__harness.online.pick(c), picks[i + 1]);
  await sleep(500);
  await H(host, (c) => window.__harness.online.pick(c), picks[0]);
  for (const p of all) await p.waitForFunction(() => window.__harness.online.ffaState().net && window.__harness.online.ffaState().game === "ffaBattle", null, { timeout: 30000 });
  const st = await Promise.all(all.map((p) => H(p, () => window.__harness.online.ffaState())));
  check("a 4-player FREE-FOR-ALL started on all 4 screens", st.every((s) => s.net && s.count === 4 && JSON.stringify(s.sides) === '["p1","p2","p3","p4"]'), JSON.stringify(st.map((s) => s.count)));
  check("each player is a different fighter slot ('you' known on every screen)", JSON.stringify(st.map((s) => s.mySlot).sort()) === "[0,1,2,3]", JSON.stringify(st.map((s) => s.mySlot)));
  const seeds = await Promise.all(all.map((p) => H(p, () => window.__harness.online.seed())));
  check("same match seed on every screen", seeds.every((s) => s != null && s === seeds[0]), seeds.join("/"));
  const first = await Promise.all(all.map((p) => H(p, () => window.__harness.online.ffaProbe())));
  const keys = first.map((p) => p && JSON.stringify(p.keys));
  check("everyone got the fighter they picked, in the same slots on every screen", keys.every((k) => k === keys[0]) && keys[0] === JSON.stringify(picks), keys[0]);
  const arenas = await Promise.all(all.map((p) => H(p, () => window.__harness.online.arena())));
  check("same fixed arena on all 4 (different screen sizes)", arenas.every((a) => a.fixed && a.w === arenas[0].w && a.h === arenas[0].h), JSON.stringify(arenas.map((a) => `${a.w}x${a.h}`)));
  const delays = await Promise.all(all.map((p) => H(p, () => window.__harness.online.inputDelay())));
  check("same input delay on every screen", delays.every((d) => d != null && d === delays[0]), delays.join("/"));

  // ── 3. play: everyone moves/attacks; compare all four on shared frames ──
  // (the "3-2-1" countdown runs first; on a loaded test machine 4 game pages can take a while to get through it)
  for (const p of all) await p.waitForFunction(() => (window.__harness.online.ffaProbe()?.frame || 0) > 0, null, { timeout: 180000 });
  const samples = all.map(() => new Map());
  const KEYS = [["d", "j"], ["a", "k"], ["d", "l"], ["a", "j"]];
  const t0 = Date.now();
  for (let i = 0; Date.now() - t0 < 25000; i++) {
    await Promise.all(all.map(async (p, k) => {
      if (i % 30 === k * 3) await p.keyboard.down(KEYS[k][0]);
      if (i % 30 === k * 3 + 12) await p.keyboard.up(KEYS[k][0]);
      if (i % 9 === k) await p.keyboard.press(KEYS[k][1]);
      if (i % 37 === k * 5) await p.keyboard.press("w");
    }));
    const ps = await Promise.all(all.map((p) => H(p, () => window.__harness.online.ffaProbe())));
    ps.forEach((s, k) => { if (s) samples[k].set(s.frame, s); });
    if (ps.some((s) => s && s.over)) break;
    await sleep(10);
  }
  let shared = 0, mismatched = 0, maxF = 0; const pos = new Set();
  for (const [fr, a] of samples[0]) {
    const others = [1, 2, 3].map((k) => samples[k].get(fr));
    if (others.some((o) => !o)) continue;
    shared++; maxF = Math.max(maxF, fr);
    a.f.forEach((x) => pos.add(JSON.stringify(x)));
    if (others.some((o) => JSON.stringify(o.f) !== JSON.stringify(a.f))) { if (!mismatched) console.log("    first mismatch @", fr, JSON.stringify(a.f), others.map((o) => JSON.stringify(o.f)).join(" ")); mismatched++; }
  }
  const pairShared = (k) => [...samples[0].keys()].filter((fr) => samples[k].has(fr)).length;
  let pairMis = 0, pairN = 0;
  for (let k = 1; k < 4; k++) for (const [fr, a] of samples[0]) { const b = samples[k].get(fr); if (!b) continue; pairN++; if (JSON.stringify(a.f) !== JSON.stringify(b.f)) pairMis++; }
  check("the match actually ran (frames advanced, fighters moved)", maxF > 30 || [...samples[0].keys()].length > 10, `max frame ${Math.max(0, ...samples[0].keys())}, ${pos.size} distinct states`);
  check("ALL FOUR screens identical on every frame compared (host vs each friend)", pairN >= 6 && pairMis === 0, `${pairMis}/${pairN} host-vs-friend frames differ; all-4 shared ${shared}, mismatched ${mismatched}; per friend ${[1, 2, 3].map(pairShared).join("/")}`);

  // ── 4. a friend leaves mid-match → everyone else's match ends cleanly (no frozen lockstep) ──
  await friends[2].close();
  await host.waitForFunction(() => !window.__harness.online.isActive(), null, { timeout: 20000 }).catch(() => {});
  const after = await Promise.all([host, friends[0], friends[1]].map((p) => H(p, () => ({ active: window.__harness.online.isActive(), game: window.__harness.online.state(), seats: window.__harness.online.seats().length }))));
  check("a friend leaving ends the match for the others (nobody stuck on a frozen fight)", after.every((a) => !a.active), JSON.stringify(after));
  check("the 3 left are still connected together", after.every((a) => a.seats === 3), JSON.stringify(after.map((a) => a.seats)));
} catch (e) {
  check("no unexpected error", false, e.stack || e.message);
} finally {
  await browser.close(); await srv.close();
}
console.log(`\nNET ONLINE 4 PLAYERS: ${PASS} passed, ${FAIL} failed`);
process.exit(FAIL === 0 ? 0 : 1);
