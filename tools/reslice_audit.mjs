// tools/reslice_audit.mjs
// ─────────────────────────────────────────────────────────────────────────
// SPRITE RE-SLICE AUDIT — Stage 1 (measurement / verification only).
//
// Re-runs the project-standard alpha-gutter frame-boundary measurement (the SAME
// column-scan used by tools/slice_probe.mjs and the detect_islands() in every
// reslice_*.py) against a character's ALREADY-BUILT sheets, and cross-checks the
// detected real frame boundaries against what characters.js has CURRENTLY WIRED
// (animationData → { frames, width, height, sourceX, sourceY, sheet }).
//
// It reads existing pixel content only. It does NOT create, edit, composite, or
// generate any sprite art — it measures what is already on disk and reports where
// the wired uniform split disagrees with the real content islands.
//
// USAGE:
//   node tools/reslice_audit.mjs <rosterKey> [rosterKey...]   audit named chars
//   node tools/reslice_audit.mjs --all                        audit every sprite char
//   node tools/reslice_audit.mjs <rosterKey> --overlay        also write SLICE_*.png
//                                                              overlays for FLAGGED actions
// Overlays → harness/shots/SLICE_<char>_<action>.png (red = detected island edges,
// yellow-dashed = the currently-wired uniform split).
//
// EXIT CODE: 0 if no hard mismatches, 1 if any action is FLAGGED (CI-friendly).
// ─────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";
import { characters } from "../characters.js";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(REPO, "harness", "shots");
const ALPHA = 16;   // alpha <= this = transparent (matches slice_probe.mjs / relayout_gojo_sheets.mjs / every reslice_*.py)
const GAP = 4;      // columns of empty space that still count as INSIDE one frame (matches detect_islands() GAP)

// ── CLI ──
const rawArgs = process.argv.slice(2);
const wantOverlay = rawArgs.includes("--overlay");
let targets = rawArgs.filter(a => !a.startsWith("--"));
if (rawArgs.includes("--all")) targets = Object.keys(characters).filter(k => characters[k]?.hasSprites && characters[k]?.animationData);
if (!targets.length) { console.log("usage: node tools/reslice_audit.mjs <rosterKey ...> | --all   [--overlay]"); process.exit(2); }

// ── the project-standard scan (identical algorithm to slice_probe.mjs col-count
//    + detect_islands() run/gutter detection), restricted to a wired window ──────
function scanWindow(occ, W, sx, sy, w, h) {
  // occ = flat Uint8 (1 = non-transparent) over the full W×H sheet.
  const x0 = Math.max(0, sx), x1 = Math.min(W, sx + w);
  const cols = [];
  for (let x = x0; x < x1; x++) {
    let c = 0;
    for (let y = sy; y < sy + h; y++) c += occ[y * W + x];
    cols.push(c);
  }
  // content runs = maximal spans where col>0 (relative to window start x0)
  const runs = []; let s = -1;
  for (let i = 0; i < cols.length; i++) {
    if (cols[i] > 0) { if (s < 0) s = i; }
    else { if (s >= 0) { runs.push([s, i - 1]); s = -1; } }
  }
  if (s >= 0) runs.push([s, cols.length - 1]);
  // merge runs separated by <= GAP transparent cols → one island (detect_islands rule)
  const islands = [];
  for (const r of runs) {
    if (islands.length && r[0] - islands[islands.length - 1][1] - 1 <= GAP) islands[islands.length - 1][1] = r[1];
    else islands.push([r[0], r[1]]);
  }
  return { cols, islands, peak: Math.max(0, ...cols) };
}

function auditAction(action, d, occ, W, H, opts = {}) {
  const frames = d.frames || 1, w = d.width || 0, h = d.height || H;
  const sx = d.sourceX || 0, sy = d.sourceY || 0;
  const winW = frames * w;
  const notes = [];
  let status = "OK";
  // multiWin = this sheet is shared by sibling actions via different sourceX (e.g.
  // jump sx0 / fall sx196 on one PNG) → per-window coverage checks don't apply.
  const multiWin = !!opts.multiWin;
  // evenExact = the wired grid is the EXACT even N-division of the sheet (frames×width
  // == sheet width, sx0). The frame boundaries are then arithmetically the intended
  // even split, so any seam landing in content is a wide/stretched pose crossing the
  // line, NOT a mis-slice — downgrade those to informational.
  const evenExact = sx === 0 && Math.abs(winW - W) <= 1;

  // window sanity vs sheet bounds. Sub-px rounding accumulates across frames, so a
  // few px of overrun (<= 1px/frame) is benign WARN; a large overrun is a real FLAG.
  const overRight = sx + winW - W, overBot = sy + h - H;
  if (overRight > 1) { const big = overRight > frames + 1; status = big ? "FLAG" : (status === "OK" ? "WARN" : status); notes.push(`wired window overruns sheet width by ${overRight}px (sx${sx}+${frames}×${w}=${sx + winW} > W${W})${big ? "" : " — sub-px rounding, benign"}`); }
  if (overBot > 1)   { status = "FLAG"; notes.push(`wired window overruns sheet height by ${overBot}px (sy${sy}+${h}=${sy + h} > H${H})`); }

  // Row band: restrict to [sy, sy+h) ONLY when sourceY marks a real atlas band.
  // With sy==0 the wired `height` is usually a tight feet-crop shorter than the
  // sheet — scanning it would miss lower content and falsely split frames, so
  // scan the full sheet height in that case.
  const rowTop = sy > 0 ? sy : 0, rowH = sy > 0 ? h : H;
  const { cols, islands, peak } = scanWindow(occ, W, sx, rowTop, winW, rowH);
  const detected = islands.length;   // informational (gutter-island count)

  if (peak === 0) { return { action, frames, w, h, sx, sy, W, detected, status: "EMPTY", notes: ["no content in wired window (blank / wrong crop)"], islands }; }

  // trailing-coverage check on a DEDICATED full-width sheet (sx==0, not a shared
  // multi-window sheet where the "trailing" pixels are another action's frames)
  if (sx === 0 && !multiWin && winW < W - 2) { status = status === "OK" ? "WARN" : status; notes.push(`uniform split covers ${winW}/${W}px → ${W - winW}px trailing content uncovered`); }

  // ── HYPOTHESIS TEST: treat the wired frames×width grid as the claim and verify
  //    each wired cell/seam against the real pixels. This is robust to the GAP-merge
  //    problem that makes raw island-counting under/over-count tightly-spaced or
  //    internally-gapped frames. `cols` is window-relative (0..winW-1). ──────────
  const EMPTY_T = Math.max(1, Math.floor(peak * 0.02));   // col treated as gutter if content <= this
  const isGut = i => i < 0 || i >= cols.length || cols[i] <= EMPTY_T;
  const band = Math.max(2, Math.round(w * 0.45));         // how far a seam may drift and still be "the same seam"
  const driftTol = Math.max(2, Math.round(w * 0.12));     // beyond this from the nearest gutter = misaligned

  // (a) empty-cell check — a wired frame with no pixels means the count/width is wrong
  const emptyCells = [];
  for (let k = 0; k < frames; k++) {
    let sum = 0; for (let i = k * w; i < (k + 1) * w && i < cols.length; i++) sum += cols[i];
    if (sum <= EMPTY_T) emptyCells.push(k);
  }
  if (emptyCells.length) { status = "FLAG"; notes.push(`${emptyCells.length} wired cell(s) EMPTY (frame ${emptyCells.join(",")}) → frame count too high / width wrong`); }

  // (b) seam check — for each internal boundary, is it in a gutter, and how far from one?
  const drifted = [], touching = []; let cleanSeams = 0;
  for (let k = 1; k < frames; k++) {
    const bx = k * w;
    if (isGut(bx) || isGut(bx - 1)) { cleanSeams++; continue; }   // boundary lands in transparent gutter → aligned
    // boundary sits in content: find nearest gutter column within the search band
    let nearest = Infinity;
    for (let dd = 1; dd <= band; dd++) { if (isGut(bx - dd) || isGut(bx + dd)) { nearest = dd; break; } }
    if (nearest === Infinity) touching.push(k);                   // no gutter nearby → frames genuinely touch here
    else if (nearest > driftTol) drifted.push(`${k}(${nearest}px)`);
    else cleanSeams++;                                            // sprite bleeds a px or two past the seam — benign
  }
  if (drifted.length) {
    if (evenExact) { status = status === "OK" ? "TOUCH" : status; notes.push(`${drifted.length} seam(s) cross content (edge ${drifted.join(", ")}) but grid is the EXACT even split (${frames}×${w}=${winW}=W) — stretched pose crossing the line, not a mis-slice`); }
    else { status = "FLAG"; notes.push(`${drifted.length} wired seam(s) MISALIGNED — boundary sits inside a sprite, nearest gutter is frame ${drifted.join(", ")} away → width/offset mis-sliced`); }
  }
  if (touching.length) { status = status === "OK" ? "TOUCH" : status; notes.push(`${touching.length} seam(s) have no gutter (frames touch at edge ${touching.join(",")}) — even-split assumed, not gutter-verifiable`); }

  // clean summary + informational island count when it disagrees with wired frames
  if (status === "OK") notes.push(`${frames}×${w}px grid verified — ${cleanSeams}/${frames - 1} internal seam(s) sit in gutters`);
  if (detected !== frames) notes.push(`(fyi: free gutter-scan finds ${detected} island(s) vs ${frames} wired — expected when frames touch or a pose has internal gaps)`);

  return { action, frames, w, h, sx, sy, W, detected, status, notes, islands, cols, peak };
}

// ── decode + scan via playwright (same decode path as slice_probe.mjs) ──────────
const MIME = { ".png": "image/png" };
const server = http.createServer((req, res) => {
  const f = path.join(REPO, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(f, (e, data) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "access-control-allow-origin": "*" }); res.end(data); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
const page = await browser.newPage();

// decode one PNG → { W, H, occ (base64 of W*H bytes, 1=opaque) }, cached per file
const occCache = new Map();
async function loadOcc(file) {
  if (occCache.has(file)) return occCache.get(file);
  const abs = path.join(REPO, file.replace(/^\.\//, ""));
  if (!fs.existsSync(abs)) { const miss = { missing: true }; occCache.set(file, miss); return miss; }
  const r = await page.evaluate(async ({ url, ALPHA }) => {
    const img = new Image(); img.crossOrigin = "anonymous"; img.src = url;
    await img.decode();
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0);
    const data = cx.getImageData(0, 0, W, H).data;
    const occ = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) occ[i] = data[i * 4 + 3] > ALPHA ? 1 : 0;
    let bin = ""; for (let i = 0; i < occ.length; i++) bin += String.fromCharCode(occ[i]);
    return { W, H, b64: btoa(bin) };
  }, { url: `${base}/${file.replace(/^\.\//, "")}`, ALPHA });
  const buf = Buffer.from(r.b64, "base64");
  const out = { W: r.W, H: r.H, occ: new Uint8Array(buf) };
  occCache.set(file, out);
  return out;
}

async function writeOverlay(char, res, file, occInfo) {
  const { W, H, occ } = occInfo;
  const { islands, sx, sy, w, h, frames } = res;
  const r = await page.evaluate(async ({ url, W, H, sx, sy, w, h, frames, islands }) => {
    const img = new Image(); img.crossOrigin = "anonymous"; img.src = url; await img.decode();
    const SCALE = Math.max(2, Math.min(8, Math.floor(1880 / W)));
    const o = document.createElement("canvas"); o.width = W * SCALE; o.height = H * SCALE + 12 * SCALE;
    const ox = o.getContext("2d"); ox.imageSmoothingEnabled = false;
    ox.fillStyle = "#202433"; ox.fillRect(0, 0, o.width, o.height);
    ox.drawImage(img, 0, 0, W * SCALE, H * SCALE);
    // wired window band (grey)
    ox.strokeStyle = "rgba(180,190,210,0.5)"; ox.lineWidth = 1;
    ox.strokeRect(sx * SCALE, sy * SCALE, w * frames * SCALE, h * SCALE);
    // detected island edges (red solid) — islands are window-relative
    ox.strokeStyle = "rgba(255,40,40,0.95)"; ox.fillStyle = "#ff4040"; ox.font = `${8 * SCALE / 2}px monospace`;
    islands.forEach(([a, b], i) => {
      for (const xx of [sx + a, sx + b + 1]) { ox.beginPath(); ox.moveTo(xx * SCALE, sy * SCALE); ox.lineTo(xx * SCALE, (sy + h) * SCALE); ox.stroke(); }
      ox.fillText(String(i), (sx + a) * SCALE + 2, (sy + h) * SCALE + 9 * SCALE / 2);
    });
    // currently-wired uniform split (yellow dashed)
    ox.strokeStyle = "rgba(255,220,0,0.9)"; ox.setLineDash([4 * SCALE / 2, 3 * SCALE / 2]);
    for (let i = 0; i <= frames; i++) { const xx = sx + i * w; ox.beginPath(); ox.moveTo(xx * SCALE, sy * SCALE); ox.lineTo(xx * SCALE, (sy + h) * SCALE); ox.stroke(); }
    ox.setLineDash([]);
    return o.toDataURL("image/png");
  }, { url: `${base}/${file.replace(/^\.\//, "")}`, W, H, sx, sy, w, h, frames, islands });
  fs.mkdirSync(OUT, { recursive: true });
  const name = `SLICE_${char}_${res.action}.png`;
  fs.writeFileSync(path.join(OUT, name), Buffer.from(r.split(",")[1], "base64"));
  return `harness/shots/${name}`;
}

// ── run ──
const ICON = { OK: "  ok ", WARN: "WARN ", FLAG: "FLAG!", TOUCH: "touch", EMPTY: "EMPTY", MISS: "MISS!" };
let flagged = 0, audited = 0;
for (const key of targets) {
  const c = characters[key];
  if (!c) { console.log(`\n?? unknown roster key: ${key}`); continue; }
  const ad = c.animationData || {};
  const acts = Object.entries(ad).filter(([, d]) => d && d.sheet);
  console.log(`\n══════ ${key}  (${c.name || key}) — ${acts.length} sheet-backed action(s) ══════`);
  if (!acts.length) { console.log("  (no sheet-backed actions — atlas-only or procedural)"); continue; }
  // per-sheet distinct windows (by sourceX AND covered width) → a sheet read at >1
  // distinct window is a shared strip (jump/fall via sourceX, or hurt=1f / knockdown=7f
  // of one hit sheet) → its "trailing" pixels are another action's frames, not a gap.
  const sheetWins = new Map();
  for (const [, d] of acts) { const set = sheetWins.get(d.sheet) || new Set(); set.add(`${d.sourceX || 0}|${(d.frames || 1) * (d.width || 0)}`); sheetWins.set(d.sheet, set); }
  // de-dupe identical (sheet,sourceX,sourceY,width,frames) so shared strips report once
  const seen = new Set();
  for (const [action, d] of acts) {
    const occInfo = await loadOcc(d.sheet);
    if (occInfo.missing) { console.log(` MISS!  ${action.padEnd(18)} sheet not on disk: ${d.sheet}`); flagged++; audited++; continue; }
    const sig = `${d.sheet}|${d.sourceX || 0}|${d.sourceY || 0}|${d.width}|${d.frames}`;
    const dup = seen.has(sig); seen.add(sig);
    const multiWin = (sheetWins.get(d.sheet)?.size || 1) > 1;
    const res = auditAction(action, d, occInfo.occ, occInfo.W, occInfo.H, { multiWin });
    audited++;
    const isFlag = res.status === "FLAG" || res.status === "EMPTY";
    if (isFlag) flagged++;
    const tag = ICON[res.status] || res.status;
    const dupTag = dup ? " (shared)" : "";
    console.log(` ${tag}  ${action.padEnd(18)} wired ${res.frames}f×${res.w}px${res.sx ? " @sx" + res.sx : ""}${res.sy ? " sy" + res.sy : ""}  detected ${res.detected} island(s)${dupTag}  [${d.sheet.replace(/^\.\//, "")}]`);
    for (const n of (res.notes || [])) console.log(`         • ${n}`);
    if (wantOverlay && isFlag && !dup) { const p = await writeOverlay(key, res, d.sheet, occInfo); console.log(`         → overlay ${p}`); }
  }
}

console.log(`\n────── audited ${audited} action(s) across ${targets.length} char(s): ${flagged} FLAGGED ──────`);
await browser.close(); server.close();
process.exit(flagged ? 1 : 0);
