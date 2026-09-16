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
    { id: "borutoAlbedo", tag: "albedo" }, { id: "borutoValkyrie", tag: "valkyrie" }, { id: "borutoAlienX", tag: "alienx" },
  ] },
  // ── Naruto part 2 ──
  madara:    { p1: "madara",    skins: [{ id: "madaraAlbedo", tag: "albedo" }, { id: "madaraValkyrie", tag: "valkyrie" }, { id: "madaraAlienX", tag: "alienx" }] },
  hashirama: { p1: "hashirama", skins: [{ id: "hashiramaAlbedo", tag: "albedo" }, { id: "hashiramaValkyrie", tag: "valkyrie" }, { id: "hashiramaAlienX", tag: "alienx" }] },
  tobirama:  { p1: "tobirama",  skins: [{ id: "tobiramaAlbedo", tag: "albedo" }, { id: "tobiramaValkyrie", tag: "valkyrie" }, { id: "tobiramaAlienX", tag: "alienx" }] },
  hiruzen:   { p1: "hiruzen",   skins: [{ id: "hiruzenAlbedo", tag: "albedo" }, { id: "hiruzenValkyrie", tag: "valkyrie" }, { id: "hiruzenAlienX", tag: "alienx" }] },
  itachi:    { p1: "itachi",    skins: [{ id: "itachiValkyrie", tag: "valkyrie" }, { id: "itachiAlienX", tag: "alienx" }] },
  six_paths_pain: { p1: "six_paths_pain", skins: [{ id: "six_paths_painValkyrie", tag: "valkyrie" }, { id: "six_paths_painAlienX", tag: "alienx" }] },
  obito:     { p1: "obito",     skins: [{ id: "obitoValkyrie", tag: "valkyrie" }, { id: "obitoAlienX", tag: "alienx" }] },
  tobi:      { p1: "tobi",      skins: [{ id: "tobiValkyrie", tag: "valkyrie" }, { id: "tobiAlienX", tag: "alienx" }] },
  pain:      { p1: "pain",      skins: [{ id: "painAlienX", tag: "alienx" }] },
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
  // ── Dragon Ball wave 2 (form-aware: Rose / SSJ2 forms recoloured via recolorTag) ──
  gohan:      { p1: "gohan",      skins: [{ id: "gohanAlbedo", tag: "albedo" }, { id: "gohanValkyrie", tag: "valkyrie" }, { id: "gohanAlienX", tag: "alienx" }] },
  goku_black: { p1: "goku_black", skins: [{ id: "goku_blackAlbedo", tag: "albedo" }, { id: "goku_blackValkyrie", tag: "valkyrie" }, { id: "goku_blackAlienX", tag: "alienx" }] },
  vegeta_dark: { p1: "vegeta_dark", skins: [{ id: "vegeta_darkValkyrie", tag: "valkyrie" }, { id: "vegeta_darkAlienX", tag: "alienx" }] },
  // ── Demon Slayer wave (base-recolour) — rengoku/shinobu already have an "Albedo Protocol", so Valk+AlienX only ──
  zenitsu: { p1: "zenitsu", skins: [{ id: "zenitsuAlbedo", tag: "albedo" }, { id: "zenitsuValkyrie", tag: "valkyrie" }, { id: "zenitsuAlienX", tag: "alienx" }] },
  rengoku: { p1: "rengoku", skins: [{ id: "rengokuValkyrie", tag: "valkyrie" }, { id: "rengokuAlienX", tag: "alienx" }] },
  shinobu: { p1: "shinobu", skins: [{ id: "shinobuValkyrie", tag: "valkyrie" }, { id: "shinobuAlienX", tag: "alienx" }] },
  inosuke: { p1: "inosuke", skins: [{ id: "inosukeAlbedo", tag: "albedo" }, { id: "inosukeValkyrie", tag: "valkyrie" }, { id: "inosukeAlienX", tag: "alienx" }] },
  nezuko:  { p1: "nezuko",  skins: [{ id: "nezukoAlbedo", tag: "albedo" }, { id: "nezukoValkyrie", tag: "valkyrie" }, { id: "nezukoAlienX", tag: "alienx" }] },
  // ── JJK part 1 (base-recolour; alt_sukuna mostly-black → Valk+AlienX) ──
  sukuna:     { p1: "sukuna",     skins: [{ id: "sukunaAlbedo", tag: "albedo" }, { id: "sukunaValkyrie", tag: "valkyrie" }, { id: "sukunaAlienX", tag: "alienx" }] },
  alt_sukuna: { p1: "alt_sukuna", skins: [{ id: "alt_sukunaValkyrie", tag: "valkyrie" }, { id: "alt_sukunaAlienX", tag: "alienx" }] },
  aoi_todo:   { p1: "aoi_todo",   skins: [{ id: "aoi_todoAlbedo", tag: "albedo" }, { id: "aoi_todoValkyrie", tag: "valkyrie" }, { id: "aoi_todoAlienX", tag: "alienx" }] },
  yuji:       { p1: "yuji",       skins: [{ id: "yujiAlbedo", tag: "albedo" }, { id: "yujiValkyrie", tag: "valkyrie" }, { id: "yujiAlienX", tag: "alienx" }] },
  handler:    { p1: "handler",    skins: [{ id: "handlerAlbedo", tag: "albedo" }, { id: "handlerValkyrie", tag: "valkyrie" }, { id: "handlerAlienX", tag: "alienx" }] },
  // ── JJK part 2 ──
  gojo:  { p1: "gojo",  skins: [{ id: "gojoValkyrie", tag: "valkyrie" }, { id: "gojoAlienX", tag: "alienx" }] },
  toji:  { p1: "toji",  skins: [{ id: "tojiAlbedo", tag: "albedo" }, { id: "tojiAlienX", tag: "alienx" }] },
  naoya: { p1: "naoya", skins: [{ id: "naoyaAlbedo", tag: "albedo" }, { id: "naoyaValkyrie", tag: "valkyrie" }, { id: "naoyaAlienX", tag: "alienx" }] },
  maki:  { p1: "maki",  skins: [{ id: "makiAlbedo", tag: "albedo" }, { id: "makiValkyrie", tag: "valkyrie" }, { id: "makiAlienX", tag: "alienx" }] },
  yuta:  { p1: "yuta",  skins: [{ id: "yutaAlienX", tag: "alienx" }] },
  // ── Naruto part 1 (base-recolour) ──
  minato:     { p1: "minato",     skins: [{ id: "minatoAlbedo", tag: "albedo" }, { id: "minatoValkyrie", tag: "valkyrie" }, { id: "minatoAlienX", tag: "alienx" }] },
  isshiki:    { p1: "isshiki",    skins: [{ id: "isshikiAlbedo", tag: "albedo" }, { id: "isshikiValkyrie", tag: "valkyrie" }, { id: "isshikiAlienX", tag: "alienx" }] },
  orochimaru: { p1: "orochimaru", skins: [{ id: "orochimaruAlbedo", tag: "albedo" }, { id: "orochimaruValkyrie", tag: "valkyrie" }, { id: "orochimaruAlienX", tag: "alienx" }] },
  onoki:      { p1: "onoki",      skins: [{ id: "onokiAlbedo", tag: "albedo" }, { id: "onokiValkyrie", tag: "valkyrie" }, { id: "onokiAlienX", tag: "alienx" }] },
  kiba:       { p1: "kiba",       skins: [{ id: "kibaAlbedo", tag: "albedo" }, { id: "kibaValkyrie", tag: "valkyrie" }, { id: "kibaAlienX", tag: "alienx" }] },
  // ── DC ──
  superman:         { p1: "superman",         skins: [{ id: "supermanAlbedo", tag: "albedo" }, { id: "supermanValkyrie", tag: "valkyrie" }, { id: "supermanAlienX", tag: "alienx" }] },
  superman_dcuc:    { p1: "superman_dcuc",    skins: [{ id: "superman_dcucAlbedo", tag: "albedo" }, { id: "superman_dcucValkyrie", tag: "valkyrie" }, { id: "superman_dcucAlienX", tag: "alienx" }] },
  superman_new52:   { p1: "superman_new52",   skins: [{ id: "superman_new52Albedo", tag: "albedo" }, { id: "superman_new52Valkyrie", tag: "valkyrie" }, { id: "superman_new52AlienX", tag: "alienx" }] },
  superman_classic: { p1: "superman_classic", skins: [{ id: "superman_classicAlbedo", tag: "albedo" }, { id: "superman_classicValkyrie", tag: "valkyrie" }, { id: "superman_classicAlienX", tag: "alienx" }] },
  superman_fighter: { p1: "superman_fighter", skins: [{ id: "superman_fighterAlbedo", tag: "albedo" }, { id: "superman_fighterValkyrie", tag: "valkyrie" }, { id: "superman_fighterAlienX", tag: "alienx" }] },
  flash:         { p1: "flash",         skins: [{ id: "flashAlbedo", tag: "albedo" }, { id: "flashValkyrie", tag: "valkyrie" }, { id: "flashAlienX", tag: "alienx" }] },
  deathstroke:   { p1: "deathstroke",   skins: [{ id: "deathstrokeAlbedo", tag: "albedo" }, { id: "deathstrokeValkyrie", tag: "valkyrie" }, { id: "deathstrokeAlienX", tag: "alienx" }] },
  brainiac:      { p1: "brainiac",      skins: [{ id: "brainiacAlbedo", tag: "albedo" }, { id: "brainiacValkyrie", tag: "valkyrie" }, { id: "brainiacAlienX", tag: "alienx" }] },
  green_lantern: { p1: "green_lantern", skins: [{ id: "green_lanternAlbedo", tag: "albedo" }, { id: "green_lanternValkyrie", tag: "valkyrie" }, { id: "green_lanternAlienX", tag: "alienx" }] },
  batman:        { p1: "batman",        skins: [{ id: "batmanValkyrie", tag: "valkyrie" }, { id: "batmanAlienX", tag: "alienx" }] },
  dark_knight:   { p1: "dark_knight",   skins: [{ id: "dark_knightValkyrie", tag: "valkyrie" }, { id: "dark_knightAlienX", tag: "alienx" }] },
  // ── Bleach ──
  ichigo:        { p1: "ichigo",        skins: [{ id: "ichigoAlbedo", tag: "albedo" }, { id: "ichigoValkyrie", tag: "valkyrie" }, { id: "ichigoAlienX", tag: "alienx" }] },
  zaraki:        { p1: "zaraki",        skins: [{ id: "zarakiAlbedo", tag: "albedo" }, { id: "zarakiValkyrie", tag: "valkyrie" }, { id: "zarakiAlienX", tag: "alienx" }] },
  zaraki_shikai: { p1: "zaraki_shikai", skins: [{ id: "zaraki_shikaiAlbedo", tag: "albedo" }, { id: "zaraki_shikaiValkyrie", tag: "valkyrie" }, { id: "zaraki_shikaiAlienX", tag: "alienx" }] },
  mayuri:        { p1: "mayuri",        skins: [{ id: "mayuriAlbedo", tag: "albedo" }, { id: "mayuriValkyrie", tag: "valkyrie" }, { id: "mayuriAlienX", tag: "alienx" }] },
  byakuya:       { p1: "byakuya",       skins: [{ id: "byakuyaAlbedo", tag: "albedo" }, { id: "byakuyaValkyrie", tag: "valkyrie" }, { id: "byakuyaAlienX", tag: "alienx" }] },
  yamamoto:      { p1: "yamamoto",      skins: [{ id: "yamamotoAlbedo", tag: "albedo" }, { id: "yamamotoValkyrie", tag: "valkyrie" }, { id: "yamamotoAlienX", tag: "alienx" }] },
  // ── Marvel ──
  spiderman:  { p1: "spiderman",  skins: [{ id: "spidermanAlbedo", tag: "albedo" }, { id: "spidermanValkyrie", tag: "valkyrie" }, { id: "spidermanAlienX", tag: "alienx" }] },
  iron_man:   { p1: "iron_man",   skins: [{ id: "ironManAlbedo", tag: "albedo" }, { id: "ironManValkyrie", tag: "valkyrie" }, { id: "ironManAlienX", tag: "alienx" }] },
  iron_man_2: { p1: "iron_man_2", skins: [{ id: "ironMan2Albedo", tag: "albedo" }, { id: "ironMan2Valkyrie", tag: "valkyrie" }, { id: "ironMan2AlienX", tag: "alienx" }] },
  iron_man_3: { p1: "iron_man_3", skins: [{ id: "ironMan3Albedo", tag: "albedo" }, { id: "ironMan3Valkyrie", tag: "valkyrie" }, { id: "ironMan3AlienX", tag: "alienx" }] },
  miles:      { p1: "miles",      skins: [{ id: "milesValkyrie", tag: "valkyrie" }, { id: "milesAlienX", tag: "alienx" }] },
  // ── Hunter x Hunter ──
  netero:  { p1: "netero",  skins: [{ id: "neteroAlbedo", tag: "albedo" }, { id: "neteroValkyrie", tag: "valkyrie" }, { id: "neteroAlienX", tag: "alienx" }] },
  killua:  { p1: "killua",  skins: [{ id: "killuaAlbedo", tag: "albedo" }, { id: "killuaValkyrie", tag: "valkyrie" }, { id: "killuaAlienX", tag: "alienx" }] },
  gon:     { p1: "gon",     skins: [{ id: "gonAlbedo", tag: "albedo" }, { id: "gonValkyrie", tag: "valkyrie" }, { id: "gonAlienX", tag: "alienx" }] },
  hisoka:  { p1: "hisoka",  skins: [{ id: "hisokaAlbedo", tag: "albedo" }, { id: "hisokaValkyrie", tag: "valkyrie" }, { id: "hisokaAlienX", tag: "alienx" }] },
  chrollo: { p1: "chrollo", skins: [{ id: "chrolloValkyrie", tag: "valkyrie" }, { id: "chrolloAlienX", tag: "alienx" }] },
  // ── Horror (ghostface parent + ghostface_billy EXCLUDED — see skins.js / memory) ──
  jason:           { p1: "jason",           skins: [{ id: "jasonAlbedo", tag: "albedo" }, { id: "jasonValkyrie", tag: "valkyrie" }, { id: "jasonAlienX", tag: "alienx" }] },
  ghostface_exe:   { p1: "ghostface_exe",   skins: [{ id: "ghostface_exeAlbedo", tag: "albedo" }, { id: "ghostface_exeValkyrie", tag: "valkyrie" }, { id: "ghostface_exeAlienX", tag: "alienx" }] },
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
                           : char === "goku_black" ? `goku_black_mug_shot__${tag}.png`
                           : char === "itachi"     ? `Itatchi_mugshot__${tag}.png`
                           : char === "six_paths_pain" ? `sixpaths_deva_portrait__${tag}.png`
                           : char === "green_lantern" ? `gl_portrait__${tag}.png`
                           : char === "zaraki"     ? `zaraki_transparent_copy__${tag}.png`
                           : char === "netero"     ? `issac_netero_mugshot__${tag}.png`
                           : char === "ghostface_exe"   ? `ghostface_exe_idle_uniform__${tag}.png`
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
