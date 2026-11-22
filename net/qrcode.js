// net/qrcode.js — a small, dependency-free QR Code encoder (ISO/IEC 18004, byte mode) for the PLAY WITH A FRIEND
// invite link, so a friend can scan it with a phone camera instead of typing it. Browser AND node safe (pure).
// Follows the standard construction (as in Project Nayuki's reference encoder, MIT): data bits → Reed–Solomon
// blocks → interleave → place in the matrix around the function patterns → choose the mask with the lowest penalty.
// harness/qrcode.test.mjs decodes its output with an independent decoder (OpenCV) for many link shapes.
//   qrMatrix(text, ecl = "M") → { size, version, modules: boolean[][] }   (modules[y][x], true = dark)
//   drawQr(canvas, text, { scale, margin, dark, light }) → draws it (4-module quiet zone by default)

const ECL = { L: 0, M: 1, Q: 2, H: 3 }
const FORMAT_BITS = [1, 0, 3, 2]   // L, M, Q, H
// [ecl][version] — error-correction codewords per block, and number of blocks
const ECC_PER_BLOCK = [
  [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
  [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
  [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
]
const NUM_BLOCKS = [
  [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
  [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
  [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
  [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81],
]

function numRawDataModules(ver) {
  let r = (16 * ver + 128) * ver + 64
  if (ver >= 2) { const n = Math.floor(ver / 7) + 2; r -= (25 * n - 10) * n - 55; if (ver >= 7) r -= 36 }
  return r
}
const numDataCodewords = (ver, e) => Math.floor(numRawDataModules(ver) / 8) - ECC_PER_BLOCK[e][ver] * NUM_BLOCKS[e][ver]

// GF(256) with the QR polynomial 0x11D
function gfMul(x, y) { let z = 0; for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x } return z & 0xff }
function rsDivisor(degree) {
  const r = new Array(degree).fill(0); r[degree - 1] = 1
  let root = 1
  for (let i = 0; i < degree; i++) {
    for (let j = 0; j < degree; j++) { r[j] = gfMul(r[j], root); if (j + 1 < degree) r[j] ^= r[j + 1] }
    root = gfMul(root, 0x02)
  }
  return r
}
function rsRemainder(data, div) {
  const r = new Array(div.length).fill(0)
  for (const b of data) { const f = b ^ r.shift(); r.push(0); for (let i = 0; i < div.length; i++) r[i] ^= gfMul(div[i], f) }
  return r
}

function utf8(text) { return typeof TextEncoder !== "undefined" ? [...new TextEncoder().encode(text)] : [...Buffer.from(text, "utf8")] }

export function qrMatrix(text, ecl = "M") {
  const e = ECL[ecl] ?? 1
  const bytes = utf8(String(text))
  let ver = 1
  for (; ver <= 40; ver++) if (4 + (ver <= 9 ? 8 : 16) + bytes.length * 8 <= numDataCodewords(ver, e) * 8) break
  if (ver > 40) throw new Error("text too long for a QR code")
  // ── data bits ──
  const bits = []
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1) }
  put(4, 4); put(bytes.length, ver <= 9 ? 8 : 16); for (const b of bytes) put(b, 8)
  const cap = numDataCodewords(ver, e) * 8
  put(0, Math.min(4, cap - bits.length))
  put(0, (8 - (bits.length % 8)) % 8)
  for (let pad = 0xec; bits.length < cap; pad ^= 0xec ^ 0x11) put(pad, 8)
  const data = []
  for (let i = 0; i < bits.length; i += 8) { let v = 0; for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j]; data.push(v) }
  // ── error correction + interleave ──
  const nb = NUM_BLOCKS[e][ver], eccLen = ECC_PER_BLOCK[e][ver], raw = Math.floor(numRawDataModules(ver) / 8)
  const nShort = nb - (raw % nb), shortLen = Math.floor(raw / nb), div = rsDivisor(eccLen)
  const blocks = []
  for (let i = 0, k = 0; i < nb; i++) {
    const dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1)); k += dat.length
    const ecc = rsRemainder(dat, div)
    if (i < nShort) dat.push(0)
    blocks.push(dat.concat(ecc))
  }
  const codewords = []
  for (let i = 0; i < blocks[0].length; i++) for (let j = 0; j < nb; j++) if (i !== shortLen - eccLen || j >= nShort) codewords.push(blocks[j][i])

  // ── matrix ──
  const size = ver * 4 + 17
  const mod = Array.from({ length: size }, () => new Array(size).fill(false))
  const fn = Array.from({ length: size }, () => new Array(size).fill(false))
  const set = (x, y, d) => { mod[y][x] = d; fn[y][x] = true }
  for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0) }
  const finder = (cx, cy) => { for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= size || y >= size) continue; const d = Math.max(Math.abs(dx), Math.abs(dy)); set(x, y, d !== 2 && d !== 4) } }
  finder(3, 3); finder(size - 4, 3); finder(3, size - 4)
  if (ver > 1) {
    const n = Math.floor(ver / 7) + 2, step = ver === 32 ? 26 : Math.ceil((ver * 4 + 4) / (n * 2 - 2)) * 2
    const pos = [6]; for (let p = size - 7; pos.length < n; p -= step) pos.splice(1, 0, p)
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === n - 1) || (i === n - 1 && j === 0)) continue
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(pos[i] + dx, pos[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1)
    }
  }
  const formatBits = (mask) => {
    const d = (FORMAT_BITS[e] << 3) | mask; let r = d
    for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537)
    const b = ((d << 10) | r) ^ 0x5412, bit = (i) => ((b >>> i) & 1) === 1
    for (let i = 0; i <= 5; i++) set(8, i, bit(i))
    set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8))
    for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i))
    for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i))
    for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i))
    set(8, size - 8, true)
  }
  formatBits(0)   // reserve the format areas (real bits drawn per mask below)
  if (ver >= 7) {
    let r = ver; for (let i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1f25)
    const b = (ver << 12) | r
    for (let i = 0; i < 18; i++) { const d = ((b >>> i) & 1) === 1, a = size - 11 + (i % 3), c = Math.floor(i / 3); set(a, c, d); set(c, a, d) }
  }
  // codewords, zig-zag from the bottom-right
  let i = 0
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5
    for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
      const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v
      if (!fn[y][x] && i < codewords.length * 8) { mod[y][x] = ((codewords[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++ }
    }
  }
  // ── mask: try all 8, keep the lowest penalty ──
  const MASKS = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
    (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
    (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0, (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0]
  const applyMask = (m) => { for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASKS[m](x, y)) mod[y][x] = !mod[y][x] }
  let best = 0, bestPen = Infinity
  for (let m = 0; m < 8; m++) {
    applyMask(m); formatBits(m)
    const p = penalty(mod, size)
    if (p < bestPen) { bestPen = p; best = m }
    applyMask(m)   // undo (XOR)
  }
  applyMask(best); formatBits(best)
  return { size, version: ver, modules: mod }
}

// Standard penalty rules 1–4 (runs, 2×2 blocks, finder-like patterns, dark balance)
function penalty(m, n) {
  let p = 0
  const line = (get) => {
    let run = 1
    for (let i = 1; i <= n; i++) {
      if (i < n && get(i) === get(i - 1)) run++
      else { if (run >= 5) p += 3 + (run - 5); run = 1 }
    }
    for (let i = 0; i + 6 < n; i++) {   // 1:1:3:1:1 with 4 light on either side
      if (get(i) && !get(i + 1) && get(i + 2) && get(i + 3) && get(i + 4) && !get(i + 5) && get(i + 6)) {
        const lightBefore = [1, 2, 3, 4].every(k => i - k < 0 || !get(i - k)), lightAfter = [1, 2, 3, 4].every(k => i + 6 + k >= n || !get(i + 6 + k))
        if (lightBefore || lightAfter) p += 40
      }
    }
  }
  for (let y = 0; y < n; y++) line((x) => m[y][x])
  for (let x = 0; x < n; x++) line((y) => m[y][x])
  for (let y = 0; y + 1 < n; y++) for (let x = 0; x + 1 < n; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3 }
  let dark = 0; for (const row of m) for (const c of row) if (c) dark++
  p += Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10
  return p
}

export function drawQr(canvas, text, { scale = 6, margin = 4, dark = "#000", light = "#fff", ecl = "M" } = {}) {
  const q = qrMatrix(text, ecl), px = (q.size + margin * 2) * scale
  canvas.width = px; canvas.height = px
  const c = canvas.getContext("2d")
  c.fillStyle = light; c.fillRect(0, 0, px, px)
  c.fillStyle = dark
  for (let y = 0; y < q.size; y++) for (let x = 0; x < q.size; x++) if (q.modules[y][x]) c.fillRect((x + margin) * scale, (y + margin) * scale, scale, scale)
  return q
}
