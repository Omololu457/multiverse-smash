// harness/underskin_shots.mjs — live verification for the ADD-ONLY under-skinned-character skins
// (tools/gen_underskin_recolor.py: albedo / valkyrie / alienx). For each new skin on each character:
//   - STATIC: every recolored sheet + portrait exists on disk (size > 128 bytes).
//   - LIVE: setSkin in a REAL match, force idle / walk / light / heavy, assert it renders a SPRITE
//     (never a procedural box) and that the ACTIVE sheet is the recolored __<tag> sheet.
//   - Alien X: also render several frames so the drawAlienXStarfield overlay runs WITHOUT error.
//   - Screenshot each skin at idle + one attack pose → harness/shots/underskin_<char>_<id>_<pose>.png
// Usage: node harness/underskin_shots.mjs [char ...]   (default: every configured char)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

// CONFIG — per character: which new skins (id + recolor tag) were added. Extended per stage.
const CONFIG = {
  baki: { p1: "baki", skins: [
    { id: "bakiAlbedo", tag: "albedo" }, { id: "bakiValkyrie", tag: "valkyrie" }, { id: "bakiAlienX", tag: "alienx" },
  ] },
  boruto: { p1: "boruto", skins: [
    { id: "borutoValkyrie", tag: "valkyrie" }, { id: "borutoAlienX", tag: "alienx" },
  ] },
  kakashi: { p1: "kakashi", skins: [
    { id: "kakashiAlbedo", tag: "albedo" }, { id: "kakashiValkyrie", tag: "valkyrie" }, { id: "kakashiAlienX", tag: "alienx" },
  ] },
  kurapika: { p1: "kurapika", skins: [
    { id: "kurapikaAlbedo", tag: "albedo" }, { id: "kurapikaValkyrie", tag: "valkyrie" }, { id: "kurapikaAlienX", tag: "alienx" },
  ] },
  rickPrime: { p1: "rickPrime", skins: [
    { id: "rickPrimeAlbedo", tag: "albedo" }, { id: "rickPrimeValkyrie", tag: "valkyrie" }, { id: "rickPrimeAlienX", tag: "alienx" },
  ] },
  // Vegeta is FORM-AWARE: also verify the SSJ + Blue transforms render the recoloured __tag form sheets.
  vegeta: { p1: "vegeta", forms: true, skins: [
    { id: "vegetaAlbedo", tag: "albedo" }, { id: "vegetaValkyrie", tag: "valkyrie" }, { id: "vegetaAlienX", tag: "alienx" },
  ] },
  // Goku is FORM-AWARE via a 3-tier ladder (SSJ→SSG→SS-Blue): verify each form's locomotion sheet recolours.
  goku: { p1: "goku", gokuForms: true, skins: [
    { id: "gokuAlbedo", tag: "albedo" }, { id: "gokuValkyrie", tag: "valkyrie" }, { id: "gokuAlienX", tag: "alienx" },
  ] },
  // Naruto (Kurama Chakra Mode) — unified warm-cloak recolour, NOT form-aware (ult is a move/summon).
  naruto: { p1: "naruto", skins: [
    { id: "narutoAlbedo", tag: "albedo" }, { id: "narutoValkyrie", tag: "valkyrie" }, { id: "narutoAlienX", tag: "alienx" },
  ] },
  // Sasuke — dark-outfit recolour, NOT form-aware (Susanoo is a summon/overlay).
  sasuke: { p1: "sasuke", skins: [
    { id: "sasukeAlbedo", tag: "albedo" }, { id: "sasukeValkyrie", tag: "valkyrie" }, { id: "sasukeAlienX", tag: "alienx" },
  ] },
  // ── Dragon Ball wave 1 (base-recolour, not form-aware) ──
  piccolo: { p1: "piccolo", skins: [{ id: "piccoloAlbedo", tag: "albedo" }, { id: "piccoloValkyrie", tag: "valkyrie" }, { id: "piccoloAlienX", tag: "alienx" }] },
  frieza:  { p1: "frieza",  skins: [{ id: "friezaAlbedo", tag: "albedo" }, { id: "friezaValkyrie", tag: "valkyrie" }, { id: "friezaAlienX", tag: "alienx" }] },
  beerus:  { p1: "beerus",  skins: [{ id: "beerusAlbedo", tag: "albedo" }, { id: "beerusValkyrie", tag: "valkyrie" }, { id: "beerusAlienX", tag: "alienx" }] },
  vegito:  { p1: "vegito",  skins: [{ id: "vegitoAlbedo", tag: "albedo" }, { id: "vegitoValkyrie", tag: "valkyrie" }, { id: "vegitoAlienX", tag: "alienx" }] },
  gotenks: { p1: "gotenks", skins: [{ id: "gotenksAlbedo", tag: "albedo" }, { id: "gotenksValkyrie", tag: "valkyrie" }, { id: "gotenksAlienX", tag: "alienx" }] },
  bardock: { p1: "bardock", skins: [{ id: "bardockAlbedo", tag: "albedo" }, { id: "bardockValkyrie", tag: "valkyrie" }, { id: "bardockAlienX", tag: "alienx" }] },
};
const WANT = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(CONFIG);
const ACTIONS = ["idle", "walk", "light", "heavy"];

const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".jpg": "image/jpeg", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });

for (const char of WANT) {
  const cfg = CONFIG[char]; if (!cfg) { check(`config for ${char}`, false, "not configured"); continue; }
  const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = []; pg.on("pageerror", e => errs.push(String(e)));
  await pg.goto(`${base}/index.html?harness=1&p1=${cfg.p1}`, { waitUntil: "load" });
  await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
  await pg.evaluate(() => window.__harness.start());
  await pg.evaluate(() => window.__harness.skipToBattle());
  const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { polling: 16 }); };
  const force = a => pg.evaluate(act => window.__harness.forceAction(act, "p1"), a);
  await wf(6);

  // STATIC: the recolored sheets exist. Base sheet set = the char's actual default sprites + portrait.
  // rickPrime's sprites are the Rick recolour rick_*__rickprime.png (+ rick_portrait__rickprime.png).
  // STATIC: recoloured PORTRAIT exists per tag (naming is char-specific; rickPrime = rick_portrait__rickprime).
  const portraitFor = tag => char === "rickPrime" ? `rick_portrait__rickprime__${tag}.png`
                           : char === "vegeta"    ? `vegeta_mugshot__${tag}.png`
                           : char === "naruto"    ? `naruto_kcm_portrait__${tag}.png`
                           : char === "sasuke"    ? `sasuke_pfp__${tag}.png`
                           : char === "beerus"    ? `beerus_mugshot__${tag}.png`
                           : `${char}_portrait__${tag}.png`;
  for (const { tag } of cfg.skins) {
    const pp = path.join(ROOT, portraitFor(tag));
    check(`${char}/${tag} STATIC: recoloured portrait exists`, fs.existsSync(pp) && fs.statSync(pp).size > 128, portraitFor(tag));
  }

  let boxes = 0;
  for (const { id, tag } of cfg.skins) {
    await pg.evaluate(sid => window.__harness.setSkin("p1", sid), id);
    await wf(6);
    const rendered = {};
    for (const act of ACTIONS) {
      // force() returns { action, sheet } where sheet is the handler's ACTIVE _actionDef sheet — reliable
      // across all chars incl. the rick-family (whose p1().spriteSheet reads null as a known quirk).
      const fa = await force(act); await wf(4);
      const sheet = fa?.sheet || "null";
      rendered[act] = sheet;
      const p = await pg.evaluate(() => window.__harness.p1());
      if (!p.hasSpriteHandler || sheet === "null") boxes++;                 // null sheet => procedural-box fallback
      if (sheet !== "null" && !sheet.includes(`__${tag}.png`)) boxes++;     // must be the recoloured sheet
      // the recoloured sheet file must exist on disk (strip leading ./)
      const onDisk = path.join(ROOT, sheet.replace(/^\.\//, ""));
      if (sheet !== "null" && !fs.existsSync(onDisk)) boxes++;
      if (act === "idle" || act === "heavy") {
        await pg.screenshot({ path: path.join(OUT, `underskin_${char}_${id}_${act}.png`), clip: { x: 300, y: 250, width: 320, height: 360 } });
      }
      await force(null); await wf(1);
    }
    const ok = ACTIONS.every(a => rendered[a] !== "null" && rendered[a].includes(`__${tag}`));
    check(`${char}/${id}: renders recoloured sprite across ${ACTIONS.join("/")}`, ok, `idle=${rendered.idle.split("/").pop()}`);
    // Alien X: run extra frames so the starfield overlay executes; confirm skinId + void sheet + no error.
    if (tag === "alienx") {
      const fa = await force("idle"); await wf(16);
      const vf = await pg.evaluate(() => window.__harness.p1());
      check(`${char}/${id}: Alien X void sheet + starfield overlay runs`, vf.skinId === id && (fa?.sheet || "").includes("__alienx"), `skin=${vf.skinId} sheet=${(fa?.sheet||"").split("/").pop()}`);
      await force(null);
    }
    // FORM-AWARE chars (Vegeta): the recolour must persist through SSJ + Blue transforms. Transforms play
    // a locked transformation animation (~27f) before the form's idle resolves — wait it out, then read.
    if (cfg.forms) {
      // FORM transforms are gated on energy + being actionable, and driving several in one session leaks
      // state (drain/locks). So boot a FRESH match before each transform check → clean gates every time.
      // vegetaForm() (no arg) returns live state without transforming; force("idle") reads the active sheet.
      const formState = () => pg.evaluate(() => window.__harness.vegetaForm());
      const readIdle = async (needle) => { let s = null; for (let k = 0; k < 45; k++) { s = await force("idle"); if ((s?.sheet || "").includes(needle) && !s.sheet.includes("transformation")) return s; await wf(3); } return s; };
      const pollUntil = async (pred, tries = 90) => { for (let k = 0; k < tries; k++) { if (pred(await formState())) return true; await wf(3); } return false; };
      const freshVegeta = async () => { await pg.evaluate(() => window.__harness.boot()); await pg.evaluate(s => window.__harness.setSkin("p1", s), id); await wf(5); await pg.evaluate(() => window.__harness.fillEnergy()); };
      // SSJ (fresh boot)
      await freshVegeta();
      await pg.evaluate(() => window.__harness.vegetaForm("enter"));
      const gotSSJ = await pollUntil(st => st.ssjActive);
      const ssj = await readIdle("vegeta_ssj");
      check(`${char}/${id}: SSJ form recoloured (${tag})`, gotSSJ && (ssj?.sheet || "").includes("vegeta_ssj") && (ssj?.sheet || "").includes(`__${tag}.png`), `ssj=${gotSSJ} sheet=${(ssj?.sheet||"null").split("/").pop()}`);
      await pg.screenshot({ path: path.join(OUT, `underskin_${char}_${id}_ssj.png`), clip: { x: 300, y: 250, width: 320, height: 360 } });
      // BLUE (fresh boot → full-chain base→Blue)
      await freshVegeta();
      await pg.evaluate(() => window.__harness.vegetaForm("enterBlueChain"));
      const gotBlue = await pollUntil(st => st.blueActive);
      const blue = await readIdle("vegeta_blue");
      check(`${char}/${id}: Blue form recoloured (${tag})`, gotBlue && (blue?.sheet || "").includes("vegeta_blue") && (blue?.sheet || "").includes(`__${tag}.png`), `blue=${gotBlue} sheet=${(blue?.sheet||"null").split("/").pop()}`);
      await pg.screenshot({ path: path.join(OUT, `underskin_${char}_${id}_blue.png`), clip: { x: 300, y: 250, width: 320, height: 360 } });
      await pg.evaluate(() => window.__harness.boot()); await wf(3);   // reset to clean base for the next skin's base checks
    }
    // GOKU form ladder (SSJ→SSG→SS-Blue): step up, confirm each form's locomotion sheet is the recoloured __tag.
    if (cfg.gokuForms) {
      await pg.evaluate(() => window.__harness.boot());
      await pg.evaluate(s => window.__harness.setSkin("p1", s), id); await wf(5);
      const readForm = async needle => { let s = null; for (let k = 0; k < 40; k++) { s = await force("idle"); if ((s?.sheet || "").includes(needle) && !s.sheet.includes("transform")) return s; await wf(3); } return s; };
      for (const [needle, label] of [["goku_ssj", "SSJ"], ["goku_ssg", "SSG"], ["goku_ssb", "SS-Blue"]]) {
        await force(null); await pg.evaluate(() => window.__harness.fillEnergy());
        const stepped = await pg.evaluate(() => window.__harness.p1GokuStepForm());
        const fs2 = await readForm(needle);
        check(`${char}/${id}: ${label} form recoloured (${tag})`, stepped && (fs2?.sheet || "").includes(needle) && (fs2?.sheet || "").includes(`__${tag}.png`), `stepped=${stepped} sheet=${(fs2?.sheet||"null").split("/").pop()}`);
        if (needle === "goku_ssb") await pg.screenshot({ path: path.join(OUT, `underskin_${char}_${id}_ssblue.png`), clip: { x: 300, y: 250, width: 320, height: 360 } });
      }
      await force(null); await pg.evaluate(() => window.__harness.boot()); await wf(3);
    }
  }
  check(`${char}: no procedural boxes across ${cfg.skins.length} skins × ${ACTIONS.length} actions`, boxes === 0, `boxes=${boxes}`);
  check(`${char}: no page errors (incl. Alien X overlay)`, errs.length === 0, errs.slice(0, 3).join(" | "));
  await pg.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
