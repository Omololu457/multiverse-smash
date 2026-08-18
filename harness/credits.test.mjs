// harness/credits.test.mjs — STAGE 18 attribution gate.
//
// TWO layers:
//   1. DATA GATE (pure, no browser): every characters[key].animationData sheet path must map to a
//      credits.js attribution (SOURCED_ART for named artists, or PROJECT_ART_KEYS for adapted art).
//      Fails with the LIST OF UNATTRIBUTED FILES — this is what keeps attribution from rotting: a
//      new sourced sheet added without a credits entry fails CI in the same commit.
//   2. IN-GAME PROOF (browser): the .txt-named artists actually reach the player — the CREDITS
//      screen is reachable and lists them, and Gojo shows its sheet's artist on select.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";
import { SOURCED_ART, PROJECT_ART_KEYS, allAttributedKeys, artistLineForCharacter, CREDITS } from "../credits.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
const MIME = { ".html":"text/html",".js":"text/javascript",".mjs":"text/javascript",".css":"text/css",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg",".json":"application/json" };
function srv(){const s=http.createServer((q,r)=>{const u=decodeURIComponent(q.url.split("?")[0]);const f=path.join(ROOT,u==="/"?"/index.html":u);if(!f.startsWith(ROOT)){r.writeHead(403).end();return;}fs.readFile(f,(e,d)=>{if(e){r.writeHead(404).end();return;}r.writeHead(200,{"content-type":MIME[path.extname(f)]||"application/octet-stream"});r.end(d);});});return new Promise(x=>s.listen(0,"127.0.0.1",()=>x(s)));}
let PASS=0,FAIL=0;
const check=(n,c,d="")=>{(c?PASS++:FAIL++);console.log(`  ${c?"✅ PASS":"❌ FAIL"}  ${n}${d?`  — ${d}`:""}`);};
const section=t=>console.log(`\n── ${t} ─────────────────────────────`);

try {
  // ══ 1) DATA GATE — every sheet maps to an attribution ══════════════════════════
  section("DATA GATE — every characters[key] sheet path is attributed in credits.js");
  const attributed = allAttributedKeys();
  const rosterKeys = Object.keys(characters);

  // Per-character sheet inventory.
  const sheetsOf = (key) => {
    const ad = characters[key].animationData || {};
    const set = new Set();
    for (const act of Object.values(ad)) if (act && act.sheet) set.add(act.sheet);
    return [...set];
  };

  const unattributed = rosterKeys.filter(k => !attributed.has(k));
  const unattributedFiles = unattributed.flatMap(k => sheetsOf(k).map(s => `${k}: ${s}`));
  check("EVERY roster key has a credits.js attribution entry", unattributed.length === 0,
    unattributed.length ? `UNATTRIBUTED (${unattributed.length}): ${unattributed.join(", ")}` : `all ${rosterKeys.length} attributed`);
  if (unattributedFiles.length) {
    console.log("     ▼ unattributed sheet files (add a credits.js entry for each character):");
    for (const f of unattributedFiles.slice(0, 60)) console.log(`        ${f}`);
    if (unattributedFiles.length > 60) console.log(`        …and ${unattributedFiles.length - 60} more`);
  }

  // No attribution key should be dead (points at a character that no longer exists).
  const rosterSet = new Set(rosterKeys);
  const deadKeys = [...attributed].filter(k => !rosterSet.has(k));
  check("no stale attribution keys (every attributed key is a real character)", deadKeys.length === 0, deadKeys.join(", ") || "none");

  // SOURCED and PROJECT lists are disjoint (a character is one or the other, not both).
  const overlap = Object.keys(SOURCED_ART).filter(k => PROJECT_ART_KEYS.includes(k));
  check("SOURCED_ART and PROJECT_ART_KEYS are disjoint", overlap.length === 0, overlap.join(", ") || "none");

  // ══ 2) NAMED ARTISTS from the repo's *_CREDITS.txt reach credits.js ═════════════
  section("TXT ARTISTS — every artist named in the repo's *_CREDITS.txt is in credits.js");
  // Ground truth = the names written in CREDITS.txt / gojo_CREDITS.txt.
  const REQUIRED_ARTISTS = ["FinhJ", "ZeurasBlack", "Rob4n"];
  const creditsBlob = JSON.stringify(SOURCED_ART);
  for (const name of REQUIRED_ARTISTS) check(`"${name}" appears in credits.js`, creditsBlob.includes(name));

  check("Gojo select line names all three sheet artists",
    ["FinhJ","ZeurasBlack","Rob4n"].every(n => (artistLineForCharacter("gojo") || "").includes(n)),
    artistLineForCharacter("gojo"));
  check("project-adapted characters have NO select artist line (uncluttered)", artistLineForCharacter("naruto") === null);

  // The CREDITS screen data carries the required legal notice verbatim.
  const noticeSec = CREDITS.find(s => s.section === "Notice");
  check("non-commercial fan-project notice is present in CREDITS", !!noticeSec && noticeSec.lines.join(" ").includes("non-commercial personal fan project"));

  // ══ 3) IN-GAME — the CREDITS screen is reachable and shows the artists ══════════
  section("IN-GAME — CREDITS screen reachable; artists shown to the player");
  const server = await srv(); const base = `http://127.0.0.1:${server.address().port}`;
  const b = await chromium.launch({ headless: true });
  const page = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const jsErrors = []; page.on("pageerror", e => jsErrors.push(String(e)));
  await page.goto(`${base}/index.html?harness=1`, { waitUntil: "load" });
  await page.waitForFunction(() => !!window.__harness); await page.waitForTimeout(80);

  const enter = await page.evaluate(() => window.__harness.credits.enter());
  const st = await page.evaluate(() => window.__harness.credits.state());
  check("CREDITS screen is reachable via the menu state", st.isCredits === true, `state=${enter}`);
  await page.waitForTimeout(120);   // let a few frames render (auto-scroll + draw)
  const shown = await page.evaluate(() => window.__harness.credits.artistsShown());
  check("rendered CREDITS list includes the Gojo sheet artists",
    ["FinhJ","ZeurasBlack","Rob4n"].every(n => shown.includes(n)), shown.join(", "));
  const gLine = await page.evaluate(() => window.__harness.credits.artistLine("gojo"));
  check("in-game Gojo artist line resolves for the select screen", (gLine || "").includes("FinhJ"), gLine);
  const inGameAttributed = await page.evaluate(() => window.__harness.credits.attributedKeys());
  check("in-game attributed-key set covers the full roster", rosterKeys.every(k => inGameAttributed.includes(k)));

  await page.screenshot({ path: path.join(OUT, "credits_screen.png") });
  check("no uncaught JS exceptions on the CREDITS screen", jsErrors.length === 0, jsErrors.slice(0,3).join(" | "));

  await b.close(); server.close();
} catch (e) {
  console.error("\nHARNESS ERROR:", e); FAIL++;
}
console.log(`\n════════════════════════════════════════`);
console.log(`  RESULT: ${PASS} passed, ${FAIL} failed`);
console.log(`════════════════════════════════════════`);
process.exit(FAIL === 0 ? 0 : 1);
