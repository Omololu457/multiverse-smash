// harness/slice_reaudit.mjs
// ─────────────────────────────────────────────────────────────────────────
// GAME-WIDE sprite-slicing re-audit (DIAGNOSTIC ONLY — re-slices nothing).
// Reads every wired animationData entry (extracted to /tmp/audit_rows.json),
// runs a fresh alpha-gutter column scan on each sheet (same ALPHA=16 gutter
// definition as tools/slice_probe.mjs), and compares the detected content
// runs against the frame boundaries actually wired in characters.js.
//
// Per entry it decides:  clean | needs-reslice | uncertain  (+ reason).
// Emits a machine JSON (/tmp/audit_result.json) and a human table to stdout.
// ─────────────────────────────────────────────────────────────────────────
import { chromium } from "playwright";
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALPHA = 16;
const rows = JSON.parse(fs.readFileSync("/tmp/audit_rows.json", "utf8"));

const MIME = { ".png": "image/png" };
const server = http.createServer((req, res) => {
  const f = path.join(REPO, decodeURIComponent(req.url.split("?")[0]));
  fs.readFile(f, (e, d) => { if (e) { res.writeHead(404).end(); return; } res.writeHead(200, { "content-type": MIME[path.extname(f)] || "application/octet-stream", "access-control-allow-origin": "*" }); res.end(d); });
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

// which files actually exist on disk?
const uniqueSheets = [...new Set(rows.map(r => r.sheet))];
const onDisk = new Map();
for (const s of uniqueSheets) {
  const p = path.join(REPO, s.replace(/^\.\//, ""));
  onDisk.set(s, fs.existsSync(p));
}

// how many distinct actions use each sheet? (>1 => shared/atlas master)
const usersOf = new Map();
for (const r of rows) usersOf.set(r.sheet, (usersOf.get(r.sheet) || 0) + 1);

const browser = await chromium.launch();
const page = await browser.newPage();

// scan one sheet: returns { W, H, bands: cache } — we compute column content per
// requested vertical band on demand inside evaluate to stay atlas-aware.
const scanCache = new Map();
async function scanSheet(sheet, band) {
  const key = `${sheet}|${band.y0}|${band.y1}`;
  if (scanCache.has(key)) return scanCache.get(key);
  const r = await page.evaluate(async ({ url, ALPHA, y0, y1 }) => {
    const img = new Image(); img.crossOrigin = "anonymous"; img.src = url;
    try { await img.decode(); } catch { return { ok: false }; }
    const W = img.naturalWidth, H = img.naturalHeight;
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const cx = cv.getContext("2d"); cx.drawImage(img, 0, 0);
    const data = cx.getImageData(0, 0, W, H).data;
    const ya = Math.max(0, y0), yb = (y1 && y1 <= H) ? y1 : H;
    const col = new Array(W).fill(0);
    for (let x = 0; x < W; x++) { let c = 0; for (let y = ya; y < yb; y++) if (data[(y * W + x) * 4 + 3] > ALPHA) c++; col[x] = c; }
    return { ok: true, W, H, col };
  }, { url: `${base}/${sheet}`, ALPHA, y0: band.y0, y1: band.y1 });
  scanCache.set(key, r);
  return r;
}

function runsFrom(col, x0, x1) {
  const runs = []; let s = -1;
  for (let x = x0; x < x1; x++) { if (col[x] > 0) { if (s < 0) s = x; } else { if (s >= 0) { runs.push([s, x - 1]); s = -1; } } }
  if (s >= 0) runs.push([s, x1 - 1]);
  return runs;
}
const median = a => { if (!a.length) return 0; const b = [...a].sort((x, y) => x - y); const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; };

const results = [];
for (const r of rows) {
  if (!onDisk.get(r.sheet)) { results.push({ ...r, status: "MISSING-FILE", reason: "wired sheet not on disk (procedural fallback)", }); continue; }
  const shared = usersOf.get(r.sheet) > 1;
  const banded = (r.sourceX && r.sourceX > 0) || (r.sourceY && r.sourceY > 0);
  const band = { y0: r.sourceY || 0, y1: (r.height ? (r.sourceY || 0) + r.height : 0) };
  const sc = await scanSheet(r.sheet, band);
  if (!sc.ok) { results.push({ ...r, status: "DECODE-FAIL", reason: "image failed to decode" }); continue; }
  const W = sc.W, H = sc.H;
  const fw = r.frames && r.width ? r.frames * r.width : null;
  const regX0 = r.sourceX || 0;
  const regX1 = fw ? Math.min(W, regX0 + fw) : W;
  const allRuns = runsFrom(sc.col, 0, W);
  const regRuns = runsFrom(sc.col, regX0, regX1);
  const widths = regRuns.map(([a, b]) => b - a + 1);
  const med = median(widths);
  const debris = regRuns.filter(([a, b]) => (b - a + 1) < Math.max(4, 0.25 * med));
  const big = regRuns.filter(([a, b]) => (b - a + 1) >= Math.max(4, 0.25 * med));
  const gutters = Math.max(0, regRuns.length - 1);
  const overflow = fw && fw > W;

  let status, reason;
  if (overflow) {
    status = "UNCERTAIN"; reason = `wired ${r.frames}×${r.width}=${fw}px exceeds sheet W=${W}`;
  } else if (gutters > 0 && big.length === r.frames) {
    status = "CLEAN"; reason = `gutter-confirmed ${big.length} islands = ${r.frames} frames${debris.length ? ` (+${debris.length} debris ignored)` : ""}`;
  } else if (gutters > 0 && big.length !== r.frames) {
    // mismatch — but distinguish likely-debris-miscount from true boundary error
    if (regRuns.length === r.frames) {
      status = "UNCERTAIN"; reason = `${regRuns.length} islands incl ${debris.length} tiny(debris?) = wired ${r.frames}; check debris`;
    } else {
      status = "NEEDS-RESLICE"; reason = `scan ${big.length} content islands (${regRuns.length} incl debris) vs wired ${r.frames} frames`;
    }
  } else {
    // no gutters in region: touching frames / uniform repack. Verify uniform coverage.
    const contentRuns = allRuns;
    const first = contentRuns.length ? contentRuns[0][0] : 0;
    const last = contentRuns.length ? contentRuns[contentRuns.length - 1][1] : W - 1;
    if (!fw) { status = "UNCERTAIN"; reason = "no frames/width wired"; }
    else if (banded) {
      // atlas band — uniform split assumed; can't gutter-verify. exact multiple within sheet?
      status = "UNCERTAIN"; reason = `atlas/banded (srcX${r.sourceX} srcY${r.sourceY}); uniform ${r.frames}×${r.width}, no gutters to verify`;
    } else if (fw === W) {
      status = "CLEAN"; reason = `uniform strip, ${r.frames}×${r.width}=${W}=sheetW exactly (no gutters, repacked)`;
    } else if (Math.abs(fw - W) <= 2) {
      status = "CLEAN"; reason = `uniform, ${r.frames}×${r.width}=${fw}≈sheetW=${W} (±${Math.abs(fw - W)})`;
    } else if (fw < W && (last - first + 1) <= fw) {
      status = "UNCERTAIN"; reason = `uniform ${r.frames}×${r.width}=${fw} < sheetW=${W} but content spans ${first}..${last}; trailing pad? verify`;
    } else {
      status = "UNCERTAIN"; reason = `no gutters; ${r.frames}×${r.width}=${fw} vs sheetW=${W}, content ${first}..${last}`;
    }
  }
  if (shared && status === "CLEAN") reason += `; NOTE shared master (${usersOf.get(r.sheet)} actions) — cross-match manually`;
  results.push({ ...r, W, H, fw, islands: regRuns.length, big: big.length, debris: debris.length, gutters, shared, banded, status, reason });
}

await browser.close(); server.close();
fs.writeFileSync("/tmp/audit_result.json", JSON.stringify(results, null, 1));

// ── console summary ──
const byChar = {};
for (const r of results) (byChar[r.char] ||= []).push(r);
const order = ["NEEDS-RESLICE", "UNCERTAIN", "MISSING-FILE", "DECODE-FAIL", "CLEAN"];
const tally = {}; for (const r of results) tally[r.status] = (tally[r.status] || 0) + 1;
console.log("\n═══ SLICE RE-AUDIT SUMMARY ═══");
console.log("entries:", results.length, "| ", order.map(s => `${s}:${tally[s] || 0}`).join("  "));
for (const [char, rs] of Object.entries(byChar)) {
  const t = {}; for (const r of rs) t[r.status] = (t[r.status] || 0) + 1;
  const flags = rs.filter(r => r.status === "NEEDS-RESLICE" || r.status === "UNCERTAIN");
  const verdict = t["NEEDS-RESLICE"] ? "NEEDS RE-SLICE" : (t["UNCERTAIN"] ? "UNCERTAIN" : "CLEAN");
  console.log(`\n■ ${char.toUpperCase()} — ${verdict}  [${Object.entries(t).map(([k, v]) => `${k}:${v}`).join(" ")}]`);
  for (const r of flags) console.log(`    ${r.status.padEnd(14)} ${r.action.padEnd(14)} ${path.basename(r.sheet).padEnd(40)} ${r.reason}`);
}
