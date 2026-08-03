// harness/ghostface_identity_mandatory.mjs — Ghostface has NO "Default" identity: exactly the 5 killer
// identities exist, and every code path that puts a Ghostface into a match resolves to one of them (never a
// 6th fallback). Verified across the character-select screen + 1v1 (local), Tower/AI, and Team/FFA modes.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const state = () => page.evaluate(() => window.__harness.state());
const p1 = () => page.evaluate(() => window.__harness.p1());
async function waitFrames(n) { const s = (await state()).frame; await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
const IDS = ["ghostfaceBilly", "ghostfaceDebbie", "ghostfaceRoman", "ghostfaceJill", "ghostfaceAmber"];
const isId = k => IDS.includes(k);

await page.goto(`${base}/index.html?harness=1&p1=ghostface&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);

// ── 1. CHARACTER-SELECT: the skin screen shows ONLY the 5 killer identities (no Default) ──
console.log("\n── 1. Character-select: Default removed, only 5 identities ──");
const sel = await page.evaluate(() => window.__harness.showSkinSelect("ghostface", "p1", 0));
const ids = sel.skins.map(s => s.id), names = sel.skins.map(s => s.name);
check("exactly 5 selectable skins", sel.skins.length === 5, `count=${sel.skins.length} → [${ids.join(", ")}]`);
check("no 'default' skin id present", !ids.includes("default"), `ids=[${ids.join(", ")}]`);
check("no 'Default' name present", !names.some(n => /default/i.test(n)), `names=[${names.join(", ")}]`);
check("the 5 are exactly the killer identities", IDS.every(k => ids.includes(k)), `ids=[${ids.join(", ")}]`);
await page.screenshot({ path: path.join(OUT, "ghostface_identity_select.png") });

// ── 2. LOCAL 1v1: proceeding as Ghostface can never resolve to a base/default identity ──
console.log("\n── 2. Local match — mandatory identity resolution ──");
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
// explicit pick is preserved
await page.evaluate(() => window.__harness.setSkin("p1", "ghostfaceJill"));
check("explicit pick (Jill) is preserved", (await p1()).skinId === "ghostfaceJill", `skinId=${(await p1()).skinId}`);
// the removed 'default' resolves to a real killer identity + valid pool + gameplay modifier
const resolved = [];
for (let i = 0; i < 10; i++) {
  await page.evaluate(() => window.__harness.setSkin("p1", "default"));
  const g = await page.evaluate(() => window.__harness.gfSwap());
  resolved.push({ skin: g.skinId, pool: g.pool.length });
}
check("'default' NEVER sticks — always a killer identity", resolved.every(r => isId(r.skin)), `got=[${[...new Set(resolved.map(r => r.skin))].join(", ")}]`);
check("resolved identity always has a valid 4-companion pool", resolved.every(r => r.pool === 4), `pools=${[...new Set(resolved.map(r => r.pool))].join(",")}`);
check("resolution is RANDOM (touches ≥2 identities over 10 tries)", new Set(resolved.map(r => r.skin)).size >= 2, `distinct=${new Set(resolved.map(r => r.skin)).size}`);
// an invalid id likewise resolves
await page.evaluate(() => window.__harness.setSkin("p1", "totally-bogus-id"));
check("an INVALID skin id also resolves to a killer identity", isId((await p1()).skinId), `skinId=${(await p1()).skinId}`);

// ── 3. NON-Ghostface is UNAFFECTED (safety net is Ghostface-only) ──
console.log("\n── 3. Other characters keep their Default skin ──");
await page.goto(`${base}/index.html?harness=1&p1=beerus&p2=rengoku`, { waitUntil: "load" });
await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
await page.mouse.click(640, 360);
await page.evaluate(() => { window.__harness.start(); window.__harness.skipToBattle(); });
await waitFrames(20);
await page.evaluate(() => window.__harness.setSkin("p1", "default"));
check("Beerus keeps 'default' (not forced to an identity)", (await p1()).skinId === "default", `skinId=${(await p1()).skinId}`);

// ── 4. AI / TEAM / FFA: a Ghostface fighter is auto-assigned a killer identity, never 'default' ──
console.log("\n── 4. Team/FFA modes — Ghostface auto-gets an identity ──");
// Team mode: 4 fighters, 2 teams, Ghostface among them (created via setupFFAFighters → applySkin('default'))
await page.evaluate(() => window.__harness.ffaStart(4, ["ghostface", "gojo", "ghostface", "sukuna"], ["A", "A", "B", "B"]));
await waitFrames(3);
const fi = await page.evaluate(() => window.__harness.ffaInfo());
const gf = fi.fighters.filter(f => f && f.key === "ghostface");
check("Team mode created ≥2 Ghostface fighters", gf.length >= 2, `count=${gf.length}`);
check("every Team-mode Ghostface has a killer identity (never default/null)", gf.length > 0 && gf.every(f => isId(f.skinId)), `skins=[${gf.map(f => f.skinId).join(", ")}]`);
check("teamMode is active", fi.teamMode === true, `teamMode=${fi.teamMode}`);
await page.screenshot({ path: path.join(OUT, "ghostface_identity_teammode.png") });
// pure FFA: 3 Ghostface + 1 other, no teams
await page.evaluate(() => window.__harness.ffaStart(4, ["ghostface", "ghostface", "ghostface", "rick"], []));
await waitFrames(3);
const fi2 = await page.evaluate(() => window.__harness.ffaInfo());
const gf2 = fi2.fighters.filter(f => f && f.key === "ghostface");
check("every FFA Ghostface has a killer identity", gf2.length >= 3 && gf2.every(f => isId(f.skinId)), `skins=[${gf2.map(f => f.skinId).join(", ")}]`);

check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
console.log(`\nRESULT ${PASS} pass / ${FAIL} fail`);
await browser.close(); server.close();
process.exit(FAIL ? 1 : 0);
