// tools/relayout_gojo_sheets.mjs
// ─────────────────────────────────────────────────────────────────────────
// Convert the existing Gojo GRID sheets (6 cols × 2 rows = frames laid out in a
// grid) into the SINGLE-ROW horizontal strips the engine actually requires
// (SpriteHandler draws frame N at N×cellWidth, y=0). It auto-detects frame cells
// by transparent gutters, trims each to its content, normalizes every frame to
// one uniform cell size, and BOTTOM-aligns the feet — then prints the exact
// `animationData` block to paste into characters.js.
//
// WHY THIS EXISTS: the source `gojo_sheet_source.png` and any image tooling were
// not available in the editing environment, and the current gojo_*_sheet.png are
// grids (e.g. gojo_idle = 6×2 of 1376×768), which the engine cannot read as-is.
//
// USAGE:
//   npm init -y           (if no package.json)
//   npm install sharp
//   node tools/relayout_gojo_sheets.mjs
//
// Output: ./gojo_<action>_sheet.png overwritten as proper 1-row strips, a backup
// of each original at ./_orig_gojo_<action>_sheet.png, and a printed table +
// ready-to-paste animationData. Review before committing.
// ─────────────────────────────────────────────────────────────────────────
import sharp from "sharp"
import fs from "fs"

// action -> { rows, cols } grid hint (auto-detect refines this). Frame order is
// row-major: top row left→right, then next row. Empty trailing cells are dropped.
const SHEETS = {
  idle:          { rows: 2, cols: 6, speed: 8 },
  walk:          { rows: 2, cols: 6, speed: 5 },
  jump:          { rows: 2, cols: 6, speed: 6 },
  hurt:          { rows: 2, cols: 6, speed: 10 },
  light:         { rows: 2, cols: 6, speed: 4 },
  heavy:         { rows: 2, cols: 6, speed: 5 },
  blue:          { rows: 2, cols: 6, speed: 5 },
  red:           { rows: 2, cols: 6, speed: 5 },
  hollow_purple: { rows: 2, cols: 6, speed: 6 },
  teleport:      { rows: 2, cols: 6, speed: 4 },
  infinity:      { rows: 2, cols: 6, speed: 8 }
}

const ALPHA_THRESHOLD = 16   // pixels with alpha <= this count as transparent

function contentBBox(data, W, H, x0, y0, x1, y1) {
  let minX = x1, minY = y1, maxX = x0, maxY = y0, found = false
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (data[(y * W + x) * 4 + 3] > ALPHA_THRESHOLD) {
        if (x < minX) minX = x; if (x > maxX) maxX = x
        if (y < minY) minY = y; if (y > maxY) maxY = y
        found = true
      }
    }
  }
  return found ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 } : null
}

async function relayout(action, cfg) {
  const file = `./gojo_${action}_sheet.png`
  if (!fs.existsSync(file)) { console.log(`skip ${action}: ${file} not found`); return null }

  const img = sharp(file).ensureAlpha()
  const { width: W, height: H } = await img.metadata()
  const data = await img.raw().toBuffer()

  // Slice into the grid, take each cell's content bbox (drops empty cells).
  const cellW = W / cfg.cols, cellH = H / cfg.rows
  const frames = []
  for (let r = 0; r < cfg.rows; r++) {
    for (let c = 0; c < cfg.cols; c++) {
      const bb = contentBBox(data, W, H,
        Math.round(c * cellW), Math.round(r * cellH),
        Math.round((c + 1) * cellW), Math.round((r + 1) * cellH))
      if (bb) frames.push(bb)
    }
  }
  if (!frames.length) { console.log(`skip ${action}: no content cells detected`); return null }

  // Uniform cell = max content size (+2px breathing room).
  const uW = Math.max(...frames.map(f => f.w)) + 2
  const uH = Math.max(...frames.map(f => f.h)) + 2

  // Compose a single-row strip; each frame centered-X, BOTTOM-aligned (feet line up).
  const composites = frames.map((f, i) => ({
    input: file, left: i * uW + Math.round((uW - f.w) / 2), top: uH - f.h,
    extract: { left: f.x, top: f.y, width: f.w, height: f.h }
  }))
  // sharp can't extract+composite in one input ref cleanly, so pre-extract buffers:
  const buffers = await Promise.all(frames.map(f =>
    sharp(file).ensureAlpha().extract({ left: f.x, top: f.y, width: f.w, height: f.h }).png().toBuffer()))
  const layers = buffers.map((buf, i) => ({
    input: buf, left: i * uW + Math.round((uW - frames[i].w) / 2), top: uH - frames[i].h
  }))

  fs.copyFileSync(file, `./_orig_gojo_${action}_sheet.png`)
  await sharp({ create: { width: uW * frames.length, height: uH, channels: 4,
                          background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(layers).png().toFile(file)

  return { action, frames: frames.length, width: uW, height: uH, speed: cfg.speed }
}

const results = []
for (const [action, cfg] of Object.entries(SHEETS)) {
  const r = await relayout(action, cfg)
  if (r) results.push(r)
}

console.log("\nfilename                       frames  cellW  cellH")
for (const r of results)
  console.log(`gojo_${r.action}_sheet.png`.padEnd(30), String(r.frames).padStart(5),
              String(r.width).padStart(6), String(r.height).padStart(6))

console.log("\n// paste into characters.js → gojo.animationData (height now matches the real art):")
console.log("  animationData: {")
for (const r of results) {
  const key = r.action === "hollow_purple" ? "hollow_purple" : r.action
  console.log(`    ${key.padEnd(14)}: { frames: ${r.frames}, width: ${r.width}, height: ${r.height}, speed: ${r.speed} },`)
}
console.log("  },")
