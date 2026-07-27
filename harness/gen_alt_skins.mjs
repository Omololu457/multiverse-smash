// harness/gen_alt_skins.mjs — data-driven alt-color skin generator.
//
// For each requested char + each of its 5+ skin slots, recolors EVERY sheet the char's
// animationData references (+ the portrait, any extension) at a fixed CSS filter, writing
// `<name>__<tag>.png`. Recolor preserves layout exactly, so the skin's animationData is the
// base with sheet paths retagged (see skins.js recolorSkinAnim). 100% cosmetic.
//
// Two filter modes per slot:
//   • hue     → `hue-rotate(Ndeg) saturate(1.15)`  (proven; works on already-colored sprites)
//   • colorize→ `grayscale(1) sepia(1) saturate(S) hue-rotate(Ndeg) brightness(B)`  (forces a
//               single-hue wash onto near-grayscale sprites — Gojo white hair, Killua silver,
//               Goku Black black gi, Sasuke/Itachi dark palettes — where plain hue-rotate is inert)
//
// Chars flagged forms:[...] ALSO recolor transform-form sheets (Vegeta SSJ/Blue, Goku Black Rose)
// by disk-prefix glob, so the "all forms recolored" requirement holds (the transform code retags
// _skinAnim by the fighter's active tag — see abilities.js retagFormAnim).
//
// Usage: node harness/gen_alt_skins.mjs --chars=goku,vegeta        (subset)
//        node harness/gen_alt_skins.mjs --chars=all --reanim       (reanimation pass, Part 2)
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";
import { ALT_SKINS, REANIM, FORM_PREFIXES } from "./alt_skin_manifest.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = k => (process.argv.find(a => a.startsWith(`--${k}=`))?.split("=")[1]) || "";
const REANIM_MODE = process.argv.includes("--reanim");
let chars = arg("chars").split(",").filter(Boolean);
if (chars.length === 1 && chars[0] === "all") chars = Object.keys(ALT_SKINS);

const filterFor = slot => slot.mode === "colorize"
  ? `grayscale(1) sepia(1) saturate(${slot.sat ?? 3.2}) hue-rotate(${slot.deg}deg) brightness(${slot.bright ?? 1})`
  : `hue-rotate(${slot.deg}deg) saturate(${slot.sat ?? 1.15})`;

const server = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200).end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const baseURL = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch(); const page = await b.newPage();
await page.goto(`${baseURL}/`, { waitUntil: "domcontentloaded" }).catch(() => {});

async function recolor(src, out, filter) {
  const du = await page.evaluate(async ({ url, filter }) => {
    const img = new Image(); img.src = url; await img.decode();
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext("2d"); x.filter = filter; x.drawImage(img, 0, 0); return c.toDataURL("image/png");
  }, { url: `${baseURL}/${src}`, filter });
  fs.writeFileSync(path.join(ROOT, out), Buffer.from(du.replace(/^data:image\/png;base64,/, ""), "base64"));
}

// every sheet a char's animationData references + optional transform-form sheets by disk prefix
function sheetsFor(charKey) {
  const ad = characters[charKey]?.animationData || {};
  const set = new Set();
  for (const d of Object.values(ad)) if (d?.sheet) set.add(d.sheet.replace(/^\.\//, ""));
  for (const pre of (FORM_PREFIXES[charKey] || [])) {
    for (const f of fs.readdirSync(ROOT)) if (f.startsWith(pre) && f.endsWith(".png") && !f.includes("__")) set.add(f);
  }
  return [...set];
}
const retag = (f, tag) => f.replace(/\.(png|jpe?g)$/i, `__${tag}.png`);   // recolor output is always PNG

let totalFiles = 0;
for (const charKey of chars) {
  const sheets = sheetsFor(charKey);
  const portrait = (characters[charKey]?.portrait || "").replace(/^\.\//, "");
  const slots = REANIM_MODE ? [REANIM] : (ALT_SKINS[charKey] || []);
  for (const slot of slots) {
    const filter = filterFor(slot); let n = 0;
    for (const sh of sheets) {
      try { await recolor(sh, retag(sh, slot.tag), filter); n++; }
      catch (e) { console.log(`   ⚠ SKIP undecodable: ${sh} (${e.message.split("\n")[0]})`); }
    }
    if (portrait && fs.existsSync(path.join(ROOT, portrait))) {
      try { await recolor(portrait, retag(portrait, slot.tag), filter); n++; }
      catch (e) { console.log(`   ⚠ SKIP undecodable portrait: ${portrait} (${e.message.split("\n")[0]})`); }
    }
    totalFiles += n;
    console.log(`${charKey.padEnd(13)} __${slot.tag.padEnd(10)} ${slot.mode.padEnd(8)} deg${String(slot.deg).padStart(3)}  ${n} files`);
  }
}
console.log(`\nDONE — ${totalFiles} files written across ${chars.length} char(s)${REANIM_MODE ? " [REANIMATION]" : ""}.`);
await b.close(); server.close();
