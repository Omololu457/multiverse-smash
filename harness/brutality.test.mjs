// harness/brutality.test.mjs — BRUTALITY ENGINE (real gore-style, per-MOVE finishers).
// Verifies: independent toggles · re-scoped eligibility (exactly the 12 prototype chars + zaraki_shikai,
// hard-exclusions removed) · the per-character/per-move finisher TABLE (static resolve, all 36 entries) ·
// KLASSIC fallback for untagged moves · LIVE finisher render per character/move (real _tryStartBrutality +
// gore particles) · and the Stage-2 killing-blow-MOVE stamp firing in REAL combat (projectile / melee / ult).
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0; const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};

// The 12 prototype characters (+ zaraki_shikai shares zaraki). Exactly these are eligible.
const ELIGIBLE = ["sukuna","toji","frieza","omniman","zaraki","zaraki_shikai","mayuri","madara","jason","naoya","hisoka","ghostface","baki"];
// Hard-exclusion list — must NEVER be eligible regardless of style.
const EXCLUDED = ["naruto","boruto","kiba","gohan","gon","killua","nezuko","ben10","albedo","saiki","l_ryuuzaki","light"];
// Previously-eligible keys that this pass intentionally REMOVED (re-scope proof).
const REMOVED  = ["alt_sukuna","isshiki","orochimaru","deathstroke","cell","ghostface_billy","hisoka_removed_check"];
// Full per-character, per-move finisher table (mirrors game.js BRUTALITY_FINISHERS). [char][move] = {name,gore}.
const TABLE = {
  sukuna:   { cleave:{n:"CLEAVE",g:"bisect"}, dismantle:{n:"DISMANTLE",g:"dice"}, domain:{n:"MALEVOLENT SHRINE",g:"shred"} },
  toji:     { tojiG4:{n:"INVERTED SPEAR",g:"dismember"}, tojiSword2:{n:"SPLIT SOUL",g:"bisect"}, tojiRapidSlash:{n:"THOUSAND CUTS",g:"dice"} },
  frieza:   { friezaDeathBeam:{n:"DEATH BEAM",g:"beam"}, friezaDeathBall:{n:"DEATH BALL",g:"crush"}, friezaRush3:{n:"TYRANT'S END",g:"dismember"} },
  omniman:  { omComboFin:{n:"VILTRUMITE FURY",g:"pulp"}, omSkewer:{n:"SKEWER",g:"dismember"}, ultimate:{n:"OBLITERATE",g:"pulp"} },
  zaraki:   { heavy:{n:"KENDO CLEAVE",g:"bisect"}, zarakiHollowStrike:{n:"HOLLOW STRIKE",g:"dismember"}, zarakiBankai:{n:"NOZARASHI",g:"shred"} },
  mayuri:   { mayuriCmd2:{n:"VIVISECTION",g:"dismember"}, mayuriPoison:{n:"NEUROTOXIN",g:"melt"}, ultimate:{n:"ASHISOGI JIZŌ",g:"crush"} },
  madara:   { madaraSusanooPunch:{n:"SUSANOO SMASH",g:"pulp"}, heavy:{n:"SUSANOO BLADE",g:"bisect"}, ultimate:{n:"TENGAI SHINSEI",g:"shred"} },
  jason:    { heavy:{n:"MACHETE CHOP",g:"decap"}, jRelentless:{n:"RELENTLESS SLASH",g:"dismember"}, ultimate:{n:"MASSACRE",g:"pulp"} },
  naoya:    { naoyaCombo:{n:"PROJECTION",g:"dismember"}, naoyaDart:{n:"CURSED DART",g:"beam"}, ultimate:{n:"FRAME TRAP",g:"dice"} },
  hisoka:   { hisokaRekka2:{n:"TEXTURE SURPRISE",g:"dice"}, bungeeGum:{n:"BUNGEE GUM",g:"dismember"}, hisoka_card:{n:"CARD THROW",g:"beam"} },
  ghostface:{ ghostfaceCombo3:{n:"FRENZY",g:"dismember"}, gfLunge:{n:"GUTTING LUNGE",g:"gut"}, ultimate:{n:"THE FINAL ACT",g:"decap"} },
  baki:     { bakiG2:{n:"GRAPPLE TEAR",g:"dismember"}, bakiRush:{n:"DEMON RUSH",g:"pulp"}, bakiRising:{n:"RISING FANG",g:"crush"} },
};

try {
  const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs=[]; page.on("pageerror",e=>errs.push(String(e)));
  const boot = async (p1="ghostface", p2="goku") => {
    await page.goto(`${base}/index.html?harness=1&p1=${p1}&p2=${p2}`, { waitUntil: "load" });
    await page.waitForFunction(() => !!(window.__harness && window.__harness.brutality));
    await page.waitForTimeout(150);
  };
  await boot();

  // ── Independent toggles ─────────────────────────────────────────────────────────────────────────
  let t = await page.evaluate(() => { window.__harness.brutality.setBlood(true); window.__harness.brutality.setBrutality(false); return window.__harness.brutality.toggles(); });
  check("blood ON + brutality OFF set independently", t.blood === true && t.brutality === false, JSON.stringify(t));
  t = await page.evaluate(() => { window.__harness.brutality.setBlood(false); window.__harness.brutality.setBrutality(true); return window.__harness.brutality.toggles(); });
  check("blood OFF + brutality ON set independently", t.blood === false && t.brutality === true, JSON.stringify(t));

  // ── Stage 5: eligibility re-scoped to EXACTLY the 12 (+zaraki_shikai) ────────────────────────────
  const elig = await page.evaluate(() => window.__harness.brutality.eligible());
  const eligSorted = [...elig].sort().join(",");
  const wantSorted = [...ELIGIBLE].sort().join(",");
  check("eligible set is EXACTLY the 12 prototype chars (+zaraki_shikai)", eligSorted === wantSorted, `got [${eligSorted}]`);
  const inCount = await page.evaluate(list => list.filter(k => window.__harness.brutality.canTrigger(k)), ELIGIBLE);
  check("all 12 prototype winners are eligible", inCount.length === ELIGIBLE.length, `eligible: ${inCount.length}/${ELIGIBLE.length}`);
  const leaked = await page.evaluate(list => list.filter(k => window.__harness.brutality.canTrigger(k)), EXCLUDED);
  check("hard-exclusion list is NEVER eligible", leaked.length === 0, leaked.length ? `LEAKED: ${leaked.join(",")}` : "none");
  const stillRemoved = await page.evaluate(list => list.filter(k => window.__harness.brutality.canTrigger(k)), REMOVED.slice(0,6));
  check("previously-eligible keys were REMOVED (alt_sukuna/isshiki/orochimaru/deathstroke/cell/ghostface_billy)", stillRemoved.length === 0, stillRemoved.length ? `STILL IN: ${stillRemoved.join(",")}` : "none");

  // ── Stage 3+4: per-CHARACTER, per-MOVE finisher TABLE (static resolve, all 36) ───────────────────
  let tableOk = 0, tableBad = [];
  for (const [ch, moves] of Object.entries(TABLE)) {
    for (const [mv, exp] of Object.entries(moves)) {
      const r = await page.evaluate(([c,m]) => window.__harness.brutality.finisherFor(c,m), [ch, mv]);
      if (r && r.name === exp.n && r.gore === exp.g && r.klassic === false) tableOk++;
      else tableBad.push(`${ch}/${mv}→${JSON.stringify(r)}(want ${exp.n}/${exp.g})`);
    }
  }
  check("all 36 per-move finishers resolve to the correct name + gore", tableBad.length === 0, tableBad.length ? tableBad.slice(0,4).join(" | ") : `${tableOk}/36 correct`);

  // Stage 4 strictness: NO fuzzy match — an untagged move / null → KLASSIC, never a wrong signature.
  const bogus = await page.evaluate(() => window.__harness.brutality.finisherFor("sukuna","__not_a_move__"));
  check("untagged move → KLASSIC fallback (not a wrong signature)", bogus.klassic === true && bogus.name === "BRUTALITY" && bogus.gore === "generic", JSON.stringify(bogus));
  const nullMove = await page.evaluate(() => window.__harness.brutality.finisherFor("baki", null));
  check("null killing-blow move → KLASSIC fallback", nullMove.klassic === true, JSON.stringify(nullMove));
  const shikai = await page.evaluate(() => window.__harness.brutality.finisherFor("zaraki_shikai","zarakiBankai"));
  check("zaraki_shikai shares zaraki's table (zarakiBankai → NOZARASHI)", shikai.name === "NOZARASHI" && shikai.gore === "shred", JSON.stringify(shikai));

  // ── Gate checks (toggle OFF / time-over / ineligible) ────────────────────────────────────────────
  await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
  await page.waitForTimeout(350);
  await page.evaluate(() => window.__harness.brutality.setBrutality(false));
  const off = await page.evaluate(() => window.__harness.brutality.trigger("p1", true, "gfLunge"));
  check("toggle OFF → finisher does NOT trigger on a KO", off === false);
  await page.evaluate(() => { window.__harness.brutality.setBrutality(true); window.__harness.brutality.setHp("p2", 500); });   // heal the dummy the OFF-trigger KO'd, so this is a genuine loser-alive case
  const timeOver = await page.evaluate(() => window.__harness.brutality.trigger("p1", false, "gfLunge"));
  check("time-over win (loser alive) → finisher does NOT trigger", timeOver === false);
  const inelig = await page.evaluate(() => window.__harness.brutality.canTrigger("naruto"));
  check("hard-excluded winner (Naruto) cannot trigger a finisher", inelig === false);

  // ── LIVE finisher render per CHARACTER + per MOVE (real _tryStartBrutality + gore particles) ──────
  async function liveChar(ch) {
    await boot(ch === "zaraki_shikai" ? "zaraki" : ch, "goku");
    await page.evaluate(() => window.__harness.brutality.setBrutality(true));
    await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
    await page.waitForTimeout(350);
    const moves = Object.entries(TABLE[ch]);
    let good = 0, bad = [];
    for (const [mv, exp] of moves) {
      const ok = await page.evaluate(m => window.__harness.brutality.trigger("p1", true, m), mv);
      await page.waitForTimeout(140);   // let the one-shot anatomical split + chunk burst spawn
      const s = await page.evaluate(() => window.__harness.brutality.state());
      if (ok && s.active && s.move === mv && s.finisher && s.finisher.name === exp.n && s.finisher.gore === exp.g && s.parts > 0) good++;
      else bad.push(`${mv}:${JSON.stringify(s)}`);
      if (mv === moves[1][0]) await page.screenshot({ path: path.join(OUT, `BRUTALITY_${ch}_${exp.n.toLowerCase().replace(/[^a-z0-9]+/g,"_")}.png`), clip: { x:0,y:0,width:1280,height:720 } });
    }
    check(`LIVE ${ch}: all ${moves.length} per-move finishers fire (correct signature + gore particles)`, bad.length === 0, bad.length ? bad.slice(0,2).join(" | ") : `${good}/${moves.length}`);
  }
  for (const ch of Object.keys(TABLE)) await liveChar(ch);

  // KLASSIC fallback LIVE: an eligible winner + an untagged move → generic gore burst still fires.
  await boot("jason", "goku");
  await page.evaluate(() => window.__harness.brutality.setBrutality(true));
  await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__harness.brutality.trigger("p1", true, "__untagged__"));
  await page.waitForTimeout(150);
  const kl = await page.evaluate(() => window.__harness.brutality.state());
  check("KLASSIC fallback fires live for an untagged killing-blow move (generic gore, not silence)", kl.active && kl.finisher && kl.finisher.name === "BRUTALITY" && kl.finisher.gore === "generic" && kl.parts > 0, JSON.stringify(kl));

  // ── Stage 2: killing-blow-MOVE stamp in REAL combat (projectile / melee / ultimate paths) ─────────
  // Make each KO the MATCH-DECIDING one (setRoundWins 1-0 → this KO wins): a match-over KO does NOT reset the
  // round, so p1's _killingBlowMove stamp persists AND the real _tryStartBrutality fires — we assert BOTH the
  // stamp (killMove) and the finisher the real pipeline selected from it (brutality.state).
  // Fire a REAL move at a near-death dummy and confirm combat.js stamps p1._killingBlowMove. Polls for the
  // stamp (the KO lands some frames after firing) and re-fires if a melee lunge whiffed. The finisher SELECTION
  // from that move is proven exhaustively by the 36 static + 36 live-trigger checks + the projectile full-
  // pipeline check below; here we isolate the Stage-2 STAMP firing across each real damage path.
  async function realKO(char, p2char, fire, expectMove, tries = 3) {
    await boot(char, p2char);
    await page.evaluate(() => window.__harness.brutality.setBrutality(true));
    await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
    await page.waitForTimeout(350);
    await page.evaluate(() => { window.__harness.setRoundWins?.(1, 0); window.__harness.setP2ForceBlock?.(false); });
    let km = null;
    for (let attempt = 0; attempt < tries && km !== expectMove; attempt++) {
      await page.evaluate(setup => {
        const px = window.__harness.p1Pos ? window.__harness.p1Pos().x : 300;
        if (setup.p2x != null) window.__harness.setP2X?.(px + setup.p2x);
        window.__harness.brutality.setHp("p2", setup.hp);
        window.__harness.hurtP2?.(60);   // freeze the dummy in hitstun so a melee lunge can't be walked out of
      }, fire.setup);
      await page.evaluate(f => (f.kind === "ult" ? window.__harness.brutality.p1Ult() : window.__harness.brutality.p1Spec(f.dir ?? null)), fire);
      for (let w = 0; w < 20 && km !== expectMove; w++) {   // poll ~3s for the KO to land + stamp
        await page.waitForTimeout(150);
        km = await page.evaluate(() => window.__harness.brutality.killMove("p1"));
      }
    }
    check(`REAL combat: ${char} ${fire.label} KO stamps killing-blow move '${expectMove}'`, km === expectMove, `killMove=${km}`);
  }
  // (a) PROJECTILE path: Frieza Death Beam flies across and KOs → stamps proj.name "friezaDeathBeam".
  await realKO("frieza", "goku", { kind: "spec", dir: null, label: "Death Beam (projectile path)", setup: { p2x: 240, hp: 25 } }, "friezaDeathBeam");
  // (b) MELEE path (resolveAttackHit): Zaraki's Bankai is a MELEE attack — lunge + wide hitbox — routed through
  // the SAME melee choke the normals/rekka/melee-specials use → stamps currentMove "zarakiBankai".
  await realKO("zaraki", "goku", { kind: "ult", label: "Bankai (melee resolveAttackHit path)", setup: { p2x: 40, hp: 12 } }, "zarakiBankai");
  // (c) CINEMATIC-ULTIMATE path (direct applyScaledDamage {move:"ultimate"}): Ghostface's Final Act sure-hit KOs.
  await realKO("ghostface", "goku", { kind: "ult", label: "The Final Act (cinematic-ult path)", setup: { hp: 40 } }, "ultimate");

  // PROJECTILE FULL PIPELINE (real move → real KO → real _tryStartBrutality → finisher picked FROM the move):
  await boot("frieza", "goku");
  await page.evaluate(() => window.__harness.brutality.setBrutality(true));
  await page.evaluate(() => { window.__harness.start({ mode:"vs", difficulty:"easy" }); window.__harness.skipToBattle(); });
  await page.waitForTimeout(350);
  await page.evaluate(() => { window.__harness.setRoundWins?.(1, 0); window.__harness.setP2ForceBlock?.(false); const px = window.__harness.p1Pos ? window.__harness.p1Pos().x : 300; window.__harness.setP2X?.(px + 240); window.__harness.brutality.setHp("p2", 25); window.__harness.brutality.p1Spec(null); });
  let fp = { active:false };
  for (let w = 0; w < 10 && !fp.active; w++) { await page.waitForTimeout(120); fp = await page.evaluate(() => window.__harness.brutality.state()); }
  check("REAL pipeline: projectile KO → _tryStartBrutality picks the finisher FROM the stamped move (DEATH BEAM/beam)", fp.active && fp.move === "friezaDeathBeam" && fp.finisher && fp.finisher.name === "DEATH BEAM" && fp.finisher.gore === "beam" && fp.parts > 0, JSON.stringify(fp));

  check("no page errors across the full brutality flow", errs.length === 0, errs.slice(0,3).join(" | ") || "none");
  await b.close(); server.close();
} catch (e) { console.error(e); FAIL++; }

console.log(`\n════════════════════════════════════════\n  RESULT: ${PASS} passed, ${FAIL} failed\n════════════════════════════════════════`);
process.exit(FAIL ? 1 : 0);
