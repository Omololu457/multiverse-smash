// harness/l_ryuuzaki_stage3.mjs — STAGE 3: L "Ryuuzaki" merged capoeira COMMAND-NORMAL CHAIN.
// Fwd+Heavy → lRyuuzakiCmd1 (low sweep) → re-tap Heavy on a clean HIT → lRyuuzakiCmd2 (rising crescent)
// → re-tap again on a clean HIT → lRyuuzakiCmd3 (aerial DIVE launcher). A 3-stage cancel-on-hit rekka.
//
// The harness is PHASE-REACTIVE per the project's flaky-rekka gotcha: the advance needs a FRESH Heavy
// EDGE landing in the (clean-hit ∩ cancel-window) overlap. Blind Heavy-spam latches _cmdPrevHeavy and
// misses the window — so we hold Heavy UP, poll until the current stage enters recovery, then fire
// exactly ONE clean edge. We assert: the chain fires from Fwd+Heavy, plays the real capoeira sprite
// (l_ryuuzaki_cmd*_uniform, no 128² box), connects (dmg), advances stage-by-stage on clean edges, the
// cmd3 finisher LAUNCHES the dummy, and the string is CANCELABLE (jump-cancel during the on-hit window).
// Shots → harness/shots/l_ryuuzaki_s3_*_crop.png.
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
async function waitFrames(n) { const s = await page.evaluate(() => window.__harness.state().frame); await page.waitForFunction(([a, b]) => window.__harness.state().frame >= a + b, [s, n], { timeout: 15000, polling: 16 }); }
async function waitGrounded() { await page.waitForFunction(() => { const p = window.__harness.p1(); return p.grounded && Math.abs(p.vy) < 0.5; }, null, { timeout: 8000, polling: 16 }).catch(() => {}); }
let PASS = 0, FAIL = 0; const check = (n, c, d = "") => { (c ? PASS++ : FAIL++); console.log(`  ${c ? "✅" : "❌"} ${n}${d ? `  — ${d}` : ""}`); };
async function crop(name) {
  const r = await page.evaluate(() => window.__harness.screenRect("p1"));
  if (!r) { await page.screenshot({ path: path.join(OUT, `l_ryuuzaki_s3_${name}.png`) }); return; }
  const padX = 130, padTop = r.h * 1.2, padBot = 34;
  const clip = { x: Math.max(0, Math.round(r.x - padX)), y: Math.max(0, Math.round(r.y - padTop)), width: Math.round(r.w + padX * 2), height: Math.round(r.h + padTop + padBot) };
  if (clip.x + clip.width > 1280) clip.width = 1280 - clip.x;
  if (clip.y + clip.height > 720) clip.height = 720 - clip.y;
  await page.screenshot({ path: path.join(OUT, `l_ryuuzaki_s3_${name}_crop.png`), clip });
}
async function setupAdjacent(gap = 40) {
  await waitGrounded();
  const arena = await page.evaluate(() => window.__harness.arena());
  const midX = Math.round(arena.left + arena.width * 0.45);
  await page.evaluate(x => window.__harness.setP1X(x), midX); await waitFrames(1);
  const a = await p1();
  await page.evaluate(x => { window.__harness.setP2X(x); window.__harness.healP2?.(); }, a.x + gap); await waitFrames(2);
}

try {
  await page.goto(`${base}/index.html?harness=1&p1=l_ryuuzaki`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness, null, { timeout: 15000 });
  await page.mouse.click(640, 360);
  await page.evaluate(() => window.__harness.boot());
  await waitFrames(5);

  const g = await p1();
  check("P1 is L (rosterKey l_ryuuzaki)", g.key === "l_ryuuzaki", `key=${g.key}`);

  // ── Fwd+Heavy 3-STAGE COMMAND CHAIN: cmd1 (low sweep) → cmd2 (rising crescent) → cmd3 (aerial dive) ──
  // Phase-reactive advance: hold forward, open cmd1 with a clean edge, then for each stage poll until it
  // enters recovery and fire ONE fresh Heavy edge (react to the input edge, do NOT blind-spam).
  console.log("\n── Fwd+Heavy command chain (cmd1 → cmd2 → cmd3) ──");
  let cmd1Move = "", cmd1Sheet = "", cmd1Rekka = "";
  let cmd2Move = "", cmd2Sheet = "", cmd2Rekka = "";
  let cmd3Move = "", cmd3Sheet = "";
  let chainDmg = 0;

  // Try to ADVANCE the current rekka stage from `cur` to its `nextMove` by firing one clean Heavy edge
  // the first frame it's in recovery. Returns the observed move once it advances (or "").
  async function advanceTo(nextMove, maxPoll = 28) {
    await page.keyboard.up("k");   // ensure Heavy released so the next press is a real edge
    for (let r = 0; r < maxPoll; r++) {
      const s = await p1();
      if (s.currentMove === nextMove) return s;
      if (s.currentMove == null) return null;                 // stage ended without advancing → caller retries
      if (s.attackPhase === "recovery") {
        await page.keyboard.down("k"); await waitFrames(1);
        const s2 = await p1();
        await page.keyboard.up("k"); await waitFrames(1);
        if (s2.currentMove === nextMove) return s2;
      } else { await waitFrames(1); }
    }
    return null;
  }

  for (let attempt = 0; attempt < 14 && cmd3Move !== "lRyuuzakiCmd3"; attempt++) {
    await setupAdjacent(34);
    const hp0 = (await p2()).health;
    await page.keyboard.down("d"); await waitFrames(2);   // hold forward toward the dummy
    // OPEN cmd1 with clean Heavy edges (down/up/wait — never a held key).
    let mv = await p1();
    for (let r = 0; r < 8 && mv.currentMove !== "lRyuuzakiCmd1"; r++) {
      await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); mv = await p1();
    }
    if (mv.currentMove === "lRyuuzakiCmd1") {
      cmd1Move = "lRyuuzakiCmd1"; cmd1Rekka = mv.rekkaNext || cmd1Rekka;
      if ((mv.spriteSheet || "").includes("l_ryuuzaki_cmd1_uniform")) { cmd1Sheet = mv.spriteSheet; await crop("cmd1"); }
    } else { await page.keyboard.up("d"); await waitGrounded(); await waitFrames(3); continue; }

    // ADVANCE cmd1 → cmd2 (mid-string screenshot).
    const s2 = await advanceTo("lRyuuzakiCmd2");
    if (s2) {
      cmd2Move = "lRyuuzakiCmd2"; cmd2Rekka = s2.rekkaNext || cmd2Rekka;
      if ((s2.spriteSheet || "").includes("l_ryuuzaki_cmd2_uniform")) { cmd2Sheet = s2.spriteSheet; await crop("cmd2_midstring"); }
      // ADVANCE cmd2 → cmd3 (launcher finisher screenshot).
      const s3 = await advanceTo("lRyuuzakiCmd3");
      if (s3) {
        cmd3Move = "lRyuuzakiCmd3";
        if ((s3.spriteSheet || "").includes("l_ryuuzaki_cmd3_uniform")) { cmd3Sheet = s3.spriteSheet; await crop("cmd3_launch"); }
      }
    }
    const hp1 = (await p2()).health; chainDmg += Math.max(0, hp0 - hp1);
    await page.keyboard.up("d"); await waitGrounded(); await waitFrames(4);
  }

  check("chain opens lRyuuzakiCmd1 from Fwd+Heavy (currentMove)", cmd1Move === "lRyuuzakiCmd1", `move=${cmd1Move}`);
  check("cmd1 → l_ryuuzaki_cmd1_uniform sprite (real sheet, no box)", cmd1Sheet.includes("l_ryuuzaki_cmd1_uniform"), `sheet=${cmd1Sheet}`);
  check("cmd1 chains to cmd2 (rekkaNext wired)", cmd1Rekka === "lRyuuzakiCmd2", `rekkaNext=${cmd1Rekka}`);
  check("re-tap Heavy on hit advances to cmd2 (rising crescent)", cmd2Move === "lRyuuzakiCmd2", `move=${cmd2Move}`);
  check("cmd2 → l_ryuuzaki_cmd2_uniform sprite (real sheet, no box)", cmd2Sheet.includes("l_ryuuzaki_cmd2_uniform"), `sheet=${cmd2Sheet}`);
  check("cmd2 chains to cmd3 (rekkaNext wired)", cmd2Rekka === "lRyuuzakiCmd3", `rekkaNext=${cmd2Rekka}`);
  check("re-tap Heavy on hit advances to cmd3 (aerial dive finisher)", cmd3Move === "lRyuuzakiCmd3", `move=${cmd3Move}`);
  check("cmd3 → l_ryuuzaki_cmd3_uniform sprite (real sheet, no box)", cmd3Sheet.includes("l_ryuuzaki_cmd3_uniform"), `sheet=${cmd3Sheet}`);
  check("command chain connects (dmg over the string)", chainDmg > 0, `dmg=${chainDmg}`);

  // ── cmd3 finisher LAUNCHES the dummy (p2 vy < 0 on the finisher hit) ──
  console.log("\n── cmd3 finisher LAUNCHES (dummy vy < 0) ──");
  {
    let launched = false, minVy = 0;
    for (let attempt = 0; attempt < 10 && !launched; attempt++) {
      await setupAdjacent(34);
      await page.keyboard.down("d"); await waitFrames(2);
      let mv = await p1();
      for (let r = 0; r < 8 && mv.currentMove !== "lRyuuzakiCmd1"; r++) { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); mv = await p1(); }
      if (mv.currentMove !== "lRyuuzakiCmd1") { await page.keyboard.up("d"); await waitGrounded(); await waitFrames(3); continue; }
      const s2 = await advanceTo("lRyuuzakiCmd2");
      if (!s2) { await page.keyboard.up("d"); await waitGrounded(); await waitFrames(3); continue; }
      const s3 = await advanceTo("lRyuuzakiCmd3");
      if (!s3) { await page.keyboard.up("d"); await waitGrounded(); await waitFrames(3); continue; }
      // sample p2.vy across the finisher's active window — the launcher sets an upward (negative) vy on connect.
      for (let f = 0; f < 12 && !launched; f++) {
        await waitFrames(1);
        const v = (await p2()).vy;
        if (v < minVy) minVy = v;
        if (v < -1) launched = true;
      }
      await page.keyboard.up("d"); await waitGrounded(); await waitFrames(6);
    }
    check("cmd3 launches the dummy (p2 vy < 0)", launched, `minVy=${minVy.toFixed(1)}`);
  }

  // ── CANCELABLE: the string is cancel-into-jump on a clean hit (cancel window) ──
  // From cmd1 in recovery on a landed hit, pressing JUMP should break the attack and put L airborne
  // (the same cancel window the rekka advance uses). We assert L leaves the attack state and goes airborne.
  console.log("\n── cmd1 is CANCELABLE (jump-cancel on hit) ──");
  {
    let cancelled = false;
    for (let attempt = 0; attempt < 10 && !cancelled; attempt++) {
      await setupAdjacent(34);
      await page.keyboard.down("d"); await waitFrames(2);
      let mv = await p1();
      for (let r = 0; r < 8 && mv.currentMove !== "lRyuuzakiCmd1"; r++) { await page.keyboard.down("k"); await waitFrames(1); await page.keyboard.up("k"); await waitFrames(1); mv = await p1(); }
      if (mv.currentMove !== "lRyuuzakiCmd1") { await page.keyboard.up("d"); await waitGrounded(); await waitFrames(3); continue; }
      // wait for the on-hit cancel window (recovery, hit landed), then JUMP-cancel.
      for (let r = 0; r < 24 && !cancelled; r++) {
        const s = await p1();
        if (s.currentMove == null) break;
        if (s.attackPhase === "recovery") {
          await page.keyboard.down("w"); await waitFrames(2); await page.keyboard.up("w");
          const s2 = await p1();
          if (!s2.grounded || s2.vy < -0.5) cancelled = true;   // left the ground → cancelled into jump
          break;
        }
        await waitFrames(1);
      }
      await page.keyboard.up("d"); await waitGrounded(); await waitFrames(4);
    }
    check("cmd1 cancels into jump on hit (leaves ground)", cancelled, cancelled ? "airborne after jump-cancel" : "never left ground");
  }

  // ── DATA-LEVEL contract: all 3 command stages wired to real l_ryuuzaki sheets + rekkaNext chain ──
  console.log("\n── data contract ──");
  const ad = await page.evaluate(() => window.__harness.charDef("l_ryuuzaki")?.animationData || {});
  const keys = ["lRyuuzakiCmd1", "lRyuuzakiCmd2", "lRyuuzakiCmd3"];
  const allWired = keys.every(k => typeof ad[k]?.sheet === "string" && ad[k].sheet.includes("l_ryuuzaki_cmd"));
  check("all 3 command stages wired to real l_ryuuzaki_cmd sheets", allWired, JSON.stringify(Object.fromEntries(keys.map(k => [k, (ad[k]?.sheet || "MISSING").split("/").pop()]))));
  // Stage-2 down_air must STILL be its own separate sheet (shared row_13 art must not be broken).
  const downairSheet = ad.down_air?.sheet || "";
  check("Stage-2 down_air still wired to l_ryuuzaki_downair_uniform (shared art intact)", downairSheet.includes("l_ryuuzaki_downair_uniform"), `sheet=${downairSheet.split("/").pop()}`);

  check("no JS page errors", jsErrors.length === 0, jsErrors.slice(0, 3).join(" | "));
  console.log(`\n${FAIL === 0 ? "✅" : "❌"} L Ryuuzaki Stage 3: ${PASS} passed, ${FAIL} failed — shots in harness/shots/l_ryuuzaki_s3_*_crop.png`);
} catch (e) { console.error("HARNESS ERROR:", e); FAIL++; }
finally { await browser.close(); server.close(); process.exit(FAIL ? 1 : 0); }
