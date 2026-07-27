// harness/palette_audit.mjs — palette signature + cross-character collision audit for alt-skins.
//
// Two modes:
//   node harness/palette_audit.mjs --bases
//       → measures the dominant hue/sat/light of every hasSprites char's IDLE sheet (the base
//         palette). Use these to compute exact hue rotations that land a variant on a target color.
//   node harness/palette_audit.mjs --audit [tag1,tag2,...]
//       → measures every base AND every generated `<idle>__<tag>.png` variant present on disk,
//         then flags any CROSS-CHARACTER pair whose dominant hue is within COLLIDE_HUE° and both
//         are saturated (the systematic Saiki/Beerus-collision guard). Prints a per-char spread
//         table + a color-name for each variant.
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COLLIDE_HUE = 16;      // degrees — pairs closer than this (both saturated) are flagged
const MIN_SAT = 0.18;        // below this a sprite reads as grayscale → hue comparison meaningless

const mode = process.argv.includes("--bases") ? "bases" : "audit";
const wantTags = (process.argv.find(a => a.startsWith("--tags="))?.slice(7) || "").split(",").filter(Boolean);

// idle sheet path for a char (first choice: animationData.idle.sheet)
function idleSheet(key) {
  const ad = characters[key]?.animationData || {};
  return ad.idle?.sheet?.replace(/^\.\//, "") || null;
}
const SPRITE_CHARS = Object.entries(characters).filter(([, v]) => v.hasSprites).map(([k]) => k);

const server = http.createServer((q, res) => { const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200).end(d); }); });
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const b = await chromium.launch(); const page = await b.newPage();
await page.goto(`${base}/`, { waitUntil: "domcontentloaded" }).catch(() => {});

// Measure the dominant hue (circular mean, saturation-weighted) + mean sat/light of an image's
// opaque, sufficiently-saturated pixels. Returns null if the file is missing.
async function measure(rel) {
  if (!fs.existsSync(path.join(ROOT, rel))) return null;
  return page.evaluate(async ({ url }) => {
    const img = new Image(); img.src = url; try { await img.decode(); } catch { return null; }
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext("2d"); x.drawImage(img, 0, 0);
    const px = x.getImageData(0, 0, c.width, c.height).data;
    let sx = 0, sy = 0, sSat = 0, sLit = 0, n = 0;
    for (let i = 0; i < px.length; i += 4) {
      const a = px[i + 3]; if (a < 128) continue;
      const r = px[i] / 255, g = px[i + 1] / 255, bl = px[i + 2] / 255;
      const mx = Math.max(r, g, bl), mn = Math.min(r, g, bl), d = mx - mn, l = (mx + mn) / 2;
      const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
      let h = 0;
      if (d !== 0) {
        if (mx === r) h = ((g - bl) / d) % 6; else if (mx === g) h = (bl - r) / d + 2; else h = (r - g) / d + 4;
        h *= 60; if (h < 0) h += 360;
      }
      sLit += l; n++;
      if (s < 0.12) continue;              // skip near-gray pixels from the hue vote
      const w = s;                          // saturation-weight the circular mean
      sx += Math.cos(h * Math.PI / 180) * w; sy += Math.sin(h * Math.PI / 180) * w; sSat += s;
    }
    if (n === 0) return null;
    let hue = Math.atan2(sy, sx) * 180 / Math.PI; if (hue < 0) hue += 360;
    const mag = Math.hypot(sx, sy) / Math.max(1, n);      // how concentrated the hue is
    return { hue: Math.round(hue), sat: +(sSat / n).toFixed(3), lit: +(sLit / n).toFixed(3), conc: +mag.toFixed(3), n };
  }, { url: `${base}/${rel}` });
}

function colorName(hue, sat) {
  if (sat < MIN_SAT) return "grayscale";
  const names = [[0, "red"], [18, "vermilion"], [35, "amber"], [50, "gold"], [70, "chartreuse"], [95, "green"], [150, "teal"], [185, "cyan"], [205, "azure"], [230, "blue"], [255, "indigo"], [275, "violet"], [300, "magenta"], [325, "rose"], [345, "crimson"], [360, "red"]];
  let best = names[0]; for (const nm of names) if (Math.abs(nm[0] - hue) <= Math.abs(best[0] - hue)) best = nm;
  return best[1];
}

if (mode === "bases") {
  console.log("=== BASE PALETTE per character (idle sheet) ===");
  console.log("char           idle-sheet                              hue  sat   lit   name");
  for (const key of SPRITE_CHARS) {
    const sh = idleSheet(key); if (!sh) { console.log(key.padEnd(14), "(no idle sheet)"); continue; }
    const m = await measure(sh);
    if (!m) { console.log(key.padEnd(14), sh.padEnd(40), "MISSING"); continue; }
    console.log(key.padEnd(14), sh.padEnd(40), String(m.hue).padStart(3), String(m.sat).padStart(5), String(m.lit).padStart(5), " " + colorName(m.hue, m.sat));
  }
} else {
  // audit: gather base + every __tag variant that exists
  const entries = [];  // {char, tag, sheet, m}
  for (const key of SPRITE_CHARS) {
    const sh = idleSheet(key); if (!sh) continue;
    const bm = await measure(sh); if (bm) entries.push({ char: key, tag: "base", m: bm });
    // discover tags: any file matching <idlebase>__*.png in ROOT
    const dir = path.dirname(path.join(ROOT, sh)); const stem = path.basename(sh).replace(/\.png$/i, "");
    for (const f of fs.readdirSync(dir)) {
      const mt = f.match(new RegExp(`^${stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}__([a-z0-9]+)\\.png$`, "i"));
      if (!mt) continue; const tag = mt[1]; if (wantTags.length && !wantTags.includes(tag)) continue;
      const rel = path.relative(ROOT, path.join(dir, f)); const m = await measure(rel);
      if (m) entries.push({ char: key, tag, m });
    }
  }
  console.log("=== VARIANT PALETTES ===");
  console.log("char           tag          hue  sat   name");
  for (const e of entries) console.log(e.char.padEnd(14), e.tag.padEnd(12), String(e.m.hue).padStart(3), String(e.m.sat).padStart(5), " " + colorName(e.m.hue, e.m.sat));
  // per-char spread check
  console.log("\n=== PER-CHAR HUE SPREAD (variants only, want wide) ===");
  for (const key of SPRITE_CHARS) {
    const hs = entries.filter(e => e.char === key && e.tag !== "base" && e.m.sat >= MIN_SAT).map(e => e.m.hue).sort((a, b) => a - b);
    if (hs.length) console.log(key.padEnd(14), "hues:", hs.join(", "), hs.length < 5 ? "  ⚠ <5 saturated" : "");
  }
  // cross-character collisions — universe-aware, base-prioritized.
  // With 90 variants over 360° some hue-sharing is unavoidable (avg spacing ~15°), so a flat
  // threshold is noise. The confusion risk that matters: a VARIANT mimicking another character's
  // DEFAULT look (esp. same universe), or two SAME-UNIVERSE variants landing on top of each other.
  // Cross-universe variant↔variant overlaps (distinct rosters/silhouettes) are reported as INFO only.
  const uni = k => characters[k]?.universe || "?";
  const dhue = (a, c) => { let d = Math.abs(a - c); return d > 180 ? 360 - d : d; };
  const sat = entries.filter(e => e.m.sat >= MIN_SAT);
  const crit = [], warn = [], info = [];
  for (let i = 0; i < sat.length; i++) for (let j = i + 1; j < sat.length; j++) {
    const a = sat[i], c = sat[j]; if (a.char === c.char) continue;
    const dh = dhue(a.m.hue, c.m.hue); if (dh >= COLLIDE_HUE || Math.abs(a.m.lit - c.m.lit) >= 0.2) continue;
    const sameUni = uni(a.char) === uni(c.char);
    const bothBase = a.tag === "base" && c.tag === "base";   // two canonical designs — out of scope
    const touchesBase = a.tag === "base" || c.tag === "base";
    const line = `${a.char}/${a.tag} (h${a.m.hue}) ~ ${c.char}/${c.tag} (h${c.m.hue})  Δ${dh}°`;
    // CRITICAL: a VARIANT sits on another char's DEFAULT (same universe, or extreme Δ≤4 any universe).
    // base↔base pairs are shipped canonical designs (not generated) → reported as INFO, never fixed here.
    if (bothBase) info.push(line + "  [canonical]");
    else if (touchesBase && (sameUni || dh <= 4)) crit.push(line);
    else if (sameUni) warn.push(line);            // same-universe variant↔variant
    else info.push(line);                          // cross-universe overlap — acceptable
  }
  console.log("\n=== CRITICAL — variant mimics another character's DEFAULT (fix these) ===");
  crit.length ? crit.forEach(l => console.log("  ✗ " + l)) : console.log("  ✅ none");
  console.log("\n=== WARN — same-universe variant↔variant overlap (review) ===");
  warn.length ? warn.forEach(l => console.log("  ⚠ " + l)) : console.log("  ✅ none");
  console.log(`\n=== INFO — cross-universe overlaps (acceptable, distinct silhouettes): ${info.length} ===`);
  console.log(crit.length ? `\n→ ${crit.length} CRITICAL to regenerate.` : "\n✅ no critical palette collisions.");
}
await b.close(); server.close();
