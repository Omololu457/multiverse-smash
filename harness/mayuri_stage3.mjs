// harness/mayuri_stage3.mjs — STAGE 3: Mayuri's 5 specials.
//   N = Finger-Gun Blast (row_41 muzzle-flash → a REAL ranged projectile that connects)
//   F = Energy Slash (green-crescent projectile connects)
//   U = Rising Cut (melee LAUNCHER — connects + pops the dummy up)
//   D = Poison Cloud (projectile connects + stamps a poison DoT on the dummy)
//   B = Lab Coat Open (buff — coatActive + damageMultiplier 1.3; the stat change actually applies to a hit)
// Each fires via __harness.p1SpecialDir(dir); projectiles must travel and deal damage (not just a flourish).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((req, res) => { const u = decodeURIComponent(req.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { res.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); res.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
const p1 = () => page.evaluate(() => window.__harness.p1());
const p2 = () => page.evaluate(() => window.__harness.p2());
const fx = () => page.evaluate(() => window.__harness.mayuriFx("p1"));
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `mayuri_s3_${name}.png`) }); return; }
  const padX = 220, padTop = r.h * 1.2, padBot = 40;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2.4), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `mayuri_s3_${name}_crop.png`), clip });
}
async function setup(gap = 70) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.38);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); window.__harness.fillEnergy?.(); }, a.x + gap); await waitFrames(1);
}
const fireDir = (dir) => page.evaluate(d => window.__harness.p1SpecialDir(d), dir);

try {
  await page.goto(`${base}/index.html?harness=1&p1=mayuri`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  // ── N: Finger-Gun Blast (ranged projectile) ──
  console.log("\n── Neutral: Finger-Gun Blast (row_41 muzzle-flash → real projectile) ──");
  { await setup(74); const hp0 = (await p2()).health;
    const r = await fireDir(null); await waitFrames(3); const c = await fx(); await crop("blast");
    check("blast cast pose = mayuriBlast", (r?.cast === "mayuriBlast") || (c?.castMove === "mayuriBlast"), `cast=${r?.cast} castMove=${c?.castMove}`);
    let hit = false; for (let i = 0; i < 40 && !hit; i++) { if ((await p2()).health < hp0) hit = true; await waitFrames(1); }
    check("Finger-Gun Blast projectile CONNECTS at range (real hitbox)", hit, `hp0=${hp0} hp1=${(await p2()).health}`);
    await waitGrounded(); await waitFrames(4);
  }

  // ── F: Energy Slash (green crescent projectile) ──
  console.log("\n── Fwd: Energy Slash (green-crescent projectile) ──");
  { await setup(80); const hp0 = (await p2()).health;
    const r = await fireDir("F"); await waitFrames(3); const c = await fx(); await crop("slash");
    check("slash cast pose = mayuriSlash", (r?.cast === "mayuriSlash") || (c?.castMove === "mayuriSlash"), `cast=${r?.cast} castMove=${c?.castMove}`);
    let hit = false; for (let i = 0; i < 40 && !hit; i++) { if ((await p2()).health < hp0) hit = true; await waitFrames(1); }
    check("Energy Slash projectile CONNECTS", hit, `hp0=${hp0} hp1=${(await p2()).health}`);
    await waitGrounded(); await waitFrames(4);
  }

  // ── U: Rising Cut (melee launcher) ──
  console.log("\n── Up: Rising Cut (anti-air launcher) ──");
  { await setup(46); const hp0 = (await p2()).health;
    const r = await fireDir("U"); let mv = await p1(); for (let i = 0; i < 10 && mv.currentMove !== "mayuriRising"; i++) { await waitFrames(1); mv = await p1(); }
    await crop("rising");
    check("Rising Cut fires (currentMove = mayuriRising)", mv.currentMove === "mayuriRising" || r?.move === "mayuriRising", `move=${mv.currentMove}`);
    let hit = false, launched = false; for (let i = 0; i < 24; i++) { const b = await p2(); if (b.health < hp0) hit = true; if (b.isLaunched || (b.vy || 0) < -3) launched = true; await waitFrames(1); }
    check("Rising Cut connects (dmg)", hit, `hp0=${hp0} hp1=${(await p2()).health}`);
    check("Rising Cut LAUNCHES the dummy", launched, `launched=${launched}`);
    await waitGrounded(); await waitFrames(6);
  }

  // ── D: Poison Cloud (projectile + DoT) ──
  console.log("\n── Down: Poison Cloud (spore-cloud projectile + poison DoT) ──");
  { await setup(52); const hp0 = (await p2()).health;
    const r = await fireDir("D"); await waitFrames(3); const c = await fx(); await crop("poison");
    check("poison cast pose = mayuriPoison", (r?.cast === "mayuriPoison") || (c?.castMove === "mayuriPoison"), `cast=${r?.cast} castMove=${c?.castMove}`);
    let hit = false, dotStamped = false; for (let i = 0; i < 44 && !(hit && dotStamped); i++) { if ((await p2()).health < hp0) hit = true; const s = await fx(); if (s?.dot) dotStamped = true; await waitFrames(1); }
    check("Poison Cloud projectile CONNECTS", hit, `hp0=${hp0} hp1=${(await p2()).health}`);
    check("Poison Cloud stamps a poison DoT on the dummy", dotStamped, `dotStamped=${dotStamped}`);
    // DoT keeps chipping after the direct hit.
    const hMid = (await p2()).health; await waitFrames(40); const hLate = (await p2()).health;
    check("poison DoT keeps ticking (attrition)", hLate < hMid, `mid=${hMid} → late=${hLate}`);
    await waitGrounded(); await waitFrames(4);
  }

  // ── B: Lab Coat Open (buff — stat change actually applies) ──
  console.log("\n── Back: Lab Coat Open (buff transformation) ──");
  {
    // A CLEAN light hit: wait until P1 is actionable AND the dummy is IDLE (not in startup → no ×1.25
    // counter-hit that would muddy the comparison), then jab. Retries until it lands solidly (≥15 dmg).
    const actionableP1 = () => page.waitForFunction(() => { const p = window.__harness.p1(); return !p.attacking && (p.attackPhase === "idle" || !p.currentMove) && p.grounded && (p.ultCooldown >= 0); }, null, { timeout: 6000, polling: 16 }).catch(() => {});
    const idleP2 = () => page.waitForFunction(() => !window.__harness.p2().attacking, null, { timeout: 3000, polling: 16 }).catch(() => {});
    const cleanLight = async () => {
      for (let t = 0; t < 5; t++) {
        await setup(50); await actionableP1(); await idleP2();
        const h0 = (await p2()).health;
        await page.keyboard.down("j"); await waitFrames(2); await page.keyboard.up("j"); await waitFrames(16);
        const d = h0 - (await p2()).health;
        if (d >= 15) return d; await waitGrounded(); await waitFrames(3);
      }
      return 0;
    };
    // Baseline = MIN over several solid hits → the clean non-counter light (occasional ×1.25 counters
    // land higher and are discarded by the min). Buff persists ~6s (MAYURI_COAT_DUR 360f) so it stays up
    // across all the buffed samples below.
    let baseDmg = Infinity; for (let i = 0; i < 4; i++) { const d = await cleanLight(); if (d > 0) baseDmg = Math.min(baseDmg, d); }
    if (!isFinite(baseDmg)) baseDmg = 24;
    // Fire the buff, then re-fill the meter (the cast spent 40) so buffed lights still connect from setup.
    await setup(52);
    const r = await fireDir("B"); await waitFrames(3); const c = await fx(); await crop("labcoat");
    check("Lab Coat Open cast pose = mayuriCoatOpen", (r?.cast === "mayuriCoatOpen") || (c?.castMove === "mayuriCoatOpen"), `cast=${r?.cast} castMove=${c?.castMove}`);
    check("buff ACTIVE (coatActive)", c?.coatActive === true, `coatActive=${c?.coatActive}`);
    check("damage multiplier applied (≈1.3×)", Math.abs((c?.dmgMult || 1) - 1.3) < 0.02, `dmgMult=${c?.dmgMult}`);
    // Buffed = MAX over 2 solid hits (a clean buffed light is 1.3× the clean baseline; well clear of noise).
    let buffedDmg = 0; for (let i = 0; i < 2; i++) { const s = await fx(); if (s?.coatActive) { const d = await cleanLight(); buffedDmg = Math.max(buffedDmg, d); } }
    check("buffed light hits HARDER than clean baseline (stat change applies to real damage)", buffedDmg > baseDmg * 1.15, `cleanBase=${baseDmg.toFixed(1)} buffed=${buffedDmg.toFixed(1)} (×${(buffedDmg / (baseDmg || 1)).toFixed(2)})`);
  }

  // ── DATA-LEVEL contract: all 5 special cast poses wired to real mayuri sheets ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("mayuri")?.animationData || {});
  const keys = ["mayuriBlast", "mayuriSlash", "mayuriRising", "mayuriPoison", "mayuriCoatOpen"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("mayuri"));
  check("all 5 special cast poses wired to real mayuri sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} Mayuri Stage 3: ${PASS} passed, ${FAIL} failed — shots in harness/shots/mayuri_s3_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
