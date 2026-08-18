// harness/orochimaru_skins_shot.mjs — Orochimaru 13-skin batch (+Default), BASE FORM ONLY. Each skin
// applies, renders as a SPRITE (never the 128² box), and resolves its recolored __<tag> sheet across
// several actions (idle/light/heavy/guard/a special cast/intro) so a missing recolored sheet is caught.
// Also asserts the 3 alternate FORMS were NOT recolored. Screenshots → harness/shots/orochimaru_skin_<id>.png.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "harness", "shots"); fs.mkdirSync(OUT, { recursive: true });
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };

const IDS = [
  ["default", ""], ["orochimaru_sound_serpent", "sound_serpent"], ["orochimaru_pale_recluse", "pale_recluse"],
  ["orochimaru_crimson_sannin", "crimson_sannin"], ["orochimaru_venom", "venom"], ["orochimaru_cursed_seal", "cursed_seal"],
  ["orochimaru_manda_scales", "manda_scales"], ["orochimaru_akatsuki_defector", "akatsuki_defector"],
  ["orochimaru_white_snake_sage", "white_snake_sage"], ["orochimaru_edo_reanimation", "edo_reanimation"],
  ["orochimaru_amethyst_coil", "amethyst_coil"], ["orochimaru_jade_serpent", "jade_serpent"],
  ["orochimaru_forbidden_gold", "forbidden_gold"], ["orochimaruUmbralVoid", "umbral_serpent"],
];

// ── NODE-side: on-disk integrity + forms untouched ──
const TAGS = IDS.filter(([, t]) => t).map(([, t]) => t);
const baseSheets = fs.readdirSync(ROOT).filter(f => /^orochimaru_.*_uniform\.png$/.test(f) && !f.includes("__") && !f.includes("form_") && !f.includes("_proj_") && !f.includes("ult_snake") && !f.includes("snakeswarm") && !f.includes("_grab_"));
// only the animationData sheets are required — read them from characters.js
const chars = fs.readFileSync(path.join(ROOT, "characters.js"), "utf8");
const oroBlk = chars.slice(chars.indexOf("const orochimaru = {"));
const animSheets = [...new Set([...oroBlk.slice(0, oroBlk.indexOf("\n}\n")).matchAll(/sheet:\s*"\.\/(orochimaru_[a-z0-9_]+\.png)"/g)].map(m => m[1]))];
let missing = [];
for (const t of TAGS) {
  for (const s of animSheets) if (!fs.existsSync(path.join(ROOT, s.replace(".png", `__${t}.png`)))) missing.push(s.replace(".png", `__${t}.png`));
  if (!fs.existsSync(path.join(ROOT, `orochimaru_portrait__${t}.png`))) missing.push(`orochimaru_portrait__${t}.png`);
}
check(`every animationData sheet + portrait recolored for all ${TAGS.length} tags`, missing.length === 0, missing.slice(0, 3).join(","));
const formRecolors = fs.readdirSync(ROOT).filter(f => /^orochimaru_form_.*__.*\.png$/.test(f));
check("3 alternate FORMS NOT recolored (base-form only)", formRecolors.length === 0, `form recolors=${formRecolors.length}`);
const sk = fs.readFileSync(path.join(ROOT, "skins.js"), "utf8");
const oroSkins = sk.slice(sk.indexOf("orochimaru: ["), sk.indexOf("],", sk.indexOf("orochimaru: [")));
check("skins.js has Default + 13 orochimaru entries", IDS.every(([id]) => oroSkins.includes(`"${id}"`)), IDS.filter(([id]) => !oroSkins.includes(`"${id}"`)).map(x => x[0]).join(","));
check("game.js registers drawOrochimaruVoidAuraOverlay (gated on orochimaruUmbralVoid)", fs.readFileSync(path.join(ROOT, "game.js"), "utf8").includes('fighter?.skinId !== "orochimaruUmbralVoid"'), "");

// ── BROWSER-side: each skin renders its recolored sheet, no box ──
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".mp3": "audio/mpeg", ".css": "text/css", ".json": "application/json" };
const server = await new Promise(r => { const s = http.createServer((rq, rs) => { const u = decodeURIComponent(rq.url.split("?")[0]); const f = path.join(ROOT, u === "/" ? "/index.html" : u); if (!f.startsWith(ROOT)) { rs.writeHead(403).end(); return; } fs.readFile(f, (e, d) => { if (e) { rs.writeHead(404).end(); return; } rs.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream" }); rs.end(d); }); }); s.listen(0, "127.0.0.1", () => r(s)); });
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch({ headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
const pg = await b.newPage({ viewport: { width: 1280, height: 720 } });
const errs = []; pg.on("pageerror", e => errs.push(String(e)));
await pg.goto(`${base}/index.html?harness=1&p1=orochimaru`, { waitUntil: "load" });
await pg.waitForFunction(() => !!window.__harness); await pg.mouse.click(640, 360);
await pg.evaluate(() => window.__harness.boot());
const wf = async n => { const s = (await pg.evaluate(() => window.__harness.state())).frame; await pg.waitForFunction(([a, c]) => window.__harness.state().frame >= a + c, [s, n], { polling: 16 }); };
const force = a => pg.evaluate(act => window.__harness.forceAction(act, "p1"), a);
await wf(6);
let boxes = 0;
for (const [id, tag] of IDS) {
  await pg.evaluate(sid => window.__harness.setSkin("p1", sid), id);
  await wf(6);
  const sheets = [];
  for (const act of ["idle", "light", "heavy", "guard", "orochimaruSwordLunge", "intro1"]) {
    await force(act); await wf(3); const p = await pg.evaluate(() => window.__harness.p1());
    sheets.push(p.spriteSheet || "null");
    if (!p.hasSpriteHandler || !p.spriteSheet) boxes++;
    if (tag && p.spriteSheet && !p.spriteSheet.includes(`__${tag}.png`)) boxes++;
    if (!tag && p.spriteSheet && p.spriteSheet.includes("__")) boxes++;   // default must be the un-tagged sheet
    await force(null); await wf(1);
  }
  await force("idle"); await wf(3);
  await pg.screenshot({ path: path.join(OUT, `orochimaru_skin_${id}.png`), clip: { x: 460, y: 170, width: 360, height: 420 } });
  const ok = sheets.every(s => s.includes("orochimaru_") && (tag ? s.includes(`__${tag}`) : !s.includes("__")));
  check(`${id}: renders recolored sprite (no box)`, ok, tag ? `tag=${tag}` : sheets[0].split("/").pop());
}
check("no procedural boxes across all 14 skins × 6 actions", boxes === 0, `boxes=${boxes}`);
check("spriteScale stays 2.6 across skins", (await pg.evaluate(() => window.__harness.p1())).spriteScale === 2.6, "");
check("no page errors", errs.length === 0, errs.slice(0, 3).join(" | "));
console.log(`\n${pass} passed, ${fail} failed`);
await b.close(); server.close();
process.exit(fail ? 1 : 0);
