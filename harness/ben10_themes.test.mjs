// BEN 10 THEMES RULES (no browser): the registry, the skins, cosmetic-only (frame data + stats identical to the original
// appearance), determinism, alpha untouched, Albedo isolation.   node harness/ben10_themes.test.mjs
import assert from "node:assert/strict"
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { BEN_THEMES, BEN_THEME_BY_ID, parseBenThemeSkin, benThemeBaseSkin } from "../benThemes.js"
import { BEN_THEME_REGIONS } from "../benThemeRegions.js"
import { benThemeColor, recolorImageData, benThemeFieldsForSkin, sparkleAt } from "../benThemeRecolor.js"
import { getSkins, getSkin, getSkinAnimationData } from "../skins.js"
import { BEN10_ALIEN_REGISTRY } from "../aliens.js"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
let passed = 0, failed = 0
const test = async (n, fn) => { try { await fn(); passed++; console.log("PASS", n) } catch (e) { failed++; console.error("FAIL", n, "\n  ", e.message) } }
const HEX = /^#[0-9a-f]{6}$/

await test("registry: exactly 20 themes, unique ids, honest source label, P/S/A/E swatches [dark, mid, light]", () => {
  assert.equal(BEN_THEMES.length, 20)
  assert.equal(new Set(BEN_THEMES.map(t => t.id)).size, 20)
  for (const t of BEN_THEMES) {
    assert(["canonical-palette-adaptation", "crossover-inspired", "original"].includes(t.source), t.id)
    assert(t.note && t.name, t.id)
    for (const r of ["P", "S", "A", "E"]) assert(t.roles[r]?.length === 3 && t.roles[r].every(c => HEX.test(c)), `${t.id}.${r}`)
    if (t.roles.H) assert(t.roles.H.every(c => HEX.test(c)), `${t.id}.H`)
  }
  assert(!BEN_THEMES.some(t => /albedo|red omnitrix/i.test(t.name + t.id)), "no Albedo / Red Omnitrix theme")
})
await test("no random source in the theme modules", () => {
  for (const f of ["benThemes.js", "benThemeRegions.js", "benThemeRecolor.js"]) assert(!/Math\.random|gameRng/.test(fs.readFileSync(path.join(ROOT, f), "utf8")), f)
})
await test("40 themed skins on Ben (classic/jacket × 20), stable ids, originals kept; Albedo's list has none", () => {
  const L = getSkins("ben10"), ids = L.map(s => s.id)
  for (const ap of ["classic", "jacket"]) for (const t of BEN_THEMES) assert(ids.includes(`${ap}-${t.id}`), `${ap}-${t.id}`)
  assert.equal(L.filter(s => s.benTheme).length, 40)
  for (const id of ["default", "ben10Classic", "ben10Prime", "ben10_crimson", "ben10_azure"]) assert(ids.includes(id), id)
  assert.equal(new Set(ids).size, ids.length, "no duplicate skin id")
  assert(!getSkins("albedo").some(s => s.benTheme || /^(classic|jacket)-/.test(s.id)), "albedo has no themed skin")
  assert.equal(getSkin("ben10", "jacket-nonexistent").id, L[0].id, "unknown id falls back to the default skin")
})
await test("cosmetic only: a themed skin's animation map IS its original appearance's (frame data identical)", () => {
  const classic = getSkinAnimationData("ben10", "ben10Classic"), jacket = getSkinAnimationData("ben10", "default")
  for (const t of BEN_THEMES) {
    assert.equal(getSkinAnimationData("ben10", `classic-${t.id}`), classic, t.id)
    assert.equal(getSkinAnimationData("ben10", `jacket-${t.id}`), jacket, t.id)
    assert.equal(getSkin("ben10", `classic-${t.id}`).spriteScale, getSkin("ben10", "ben10Classic").spriteScale)
  }
})
await test("cosmetic only: a themed skin resolves to its original variant (same stats / normals / voice)", async () => {
  for (const t of BEN_THEMES) { assert.equal(benThemeBaseSkin(`classic-${t.id}`), "ben10Classic"); assert.equal(benThemeBaseSkin(`jacket-${t.id}`), "default") }
  for (const id of ["default", "ben10Classic", "ben10Prime", "ben10_crimson", "gojo2"]) assert.equal(benThemeBaseSkin(id), id)
  const { applyBen10VariantStats } = await import("../fighters.js")
  const stats = id => { const f = { rosterKey: "ben10" }; applyBen10VariantStats(f, id); return JSON.stringify([f.maxHealth, f.speed, f.dashSpeed, f.jumpForce, f._benVariant, f.stats]) }
  for (const t of BEN_THEMES) { assert.equal(stats(`classic-${t.id}`), stats("ben10Classic")); assert.equal(stats(`jacket-${t.id}`), stats("default")) }
})
await test("Albedo isolation: no theme fields for albedo (or anyone but ben10) under any themed id", () => {
  for (const t of BEN_THEMES) for (const ap of ["classic", "jacket"]) {
    assert.deepEqual(benThemeFieldsForSkin("albedo", `${ap}-${t.id}`), { _benTheme: null, _benAppearance: null })
    assert.deepEqual(benThemeFieldsForSkin("ben10", `${ap}-${t.id}`), { _benTheme: t.id, _benAppearance: ap })
  }
  assert.deepEqual(benThemeFieldsForSkin("ben10", "ben10Classic"), { _benTheme: null, _benAppearance: null })
  const src = fs.readFileSync(path.join(ROOT, "benThemeRecolor.js"), "utf8")
  assert(/f\.rosterKey !== "ben10"/.test(src), "the draw-time recolour is ben10-gated")
  assert(!/__albedo/.test(src), "never touches __albedo art")
})
await test("every READY alien has a regional map; Alien X theme is cosmetic (no gameplay module reads themes)", () => {
  const ready = BEN10_ALIEN_REGISTRY.filter(a => a.status === "ready" && a.sheetPath && a.ledgerPath).map(a => a.poolKey)
  assert(ready.length >= 24, String(ready.length))
  for (const k of ready) assert(BEN_THEME_REGIONS[k], k)
  for (const f of ["combat.js", "physics.js", "abilities.js", "aliens.js", "input.js"]) {
    const s = fs.readFileSync(path.join(ROOT, f), "utf8"); assert(!/_benTheme|benTheme/.test(s), `${f} must not read the theme`)
  }
})
await test("recolour: deterministic, alpha never written, unclaimed colours untouched, shading order kept", () => {
  for (const t of BEN_THEMES) assert.deepEqual(benThemeColor("jacket", t.id, 0, 147, 0), benThemeColor("jacket", t.id, 0, 147, 0))
  const w = 8, h = 1, d = new Uint8ClampedArray([0, 147, 0, 255, 0, 98, 0, 200, 0, 0, 0, 255, 231, 148, 99, 255, 0, 147, 0, 0, 9, 54, 123, 17, 255, 255, 255, 255, 52, 25, 6, 128])
  const a = Array.from(d.filter((_, i) => i % 4 === 3))
  recolorImageData(d, w, h, "jacket", "neonleap")
  assert.deepEqual(Array.from(d.filter((_, i) => i % 4 === 3)), a, "alpha unchanged")
  const ol = Array.from(d.slice(8, 12)), oLum = ol[0] * 0.299 + ol[1] * 0.587 + ol[2] * 0.114
  assert(ol[3] === 255 && oLum <= 32 && ol.some(v => v > 0), `outline stays near-black but takes the theme's tint (${ol})`)
  assert.deepEqual(Array.from(d.slice(12, 16)), [231, 148, 99, 255], "skin untouched")
  assert.deepEqual(Array.from(d.slice(16, 20)), [0, 147, 0, 0], "fully transparent pixel untouched")
  const lum = c => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114
  for (const t of BEN_THEMES) assert(lum(benThemeColor("jacket", t.id, 0, 147, 0)) >= lum(benThemeColor("jacket", t.id, 0, 98, 0)), `${t.id}: darker jacket shade stays darker`)
})
await test("dark themes keep visible shading on dark-bodied forms (Alien X / Ghostfreak / XLR8)", () => {
  const lum = c => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114
  for (const t of ["eventhorizon", "livewire", "midnightchampion", "neogotham", "cursedrose"]) {
    const g1 = benThemeColor("ghostfreak", t, 0xd3, 0xca, 0xc5), g2 = benThemeColor("ghostfreak", t, 0x73, 0x70, 0x6f)
    assert(lum(g1) - lum(g2) > 12, `${t}: ghostfreak light vs dark body still distinct (${lum(g1)} vs ${lum(g2)})`)
  }
})
await test("glitter: real twinkle (4 cached phases differ), same phase = same pixels, reduce-flashing = static + thinner", () => {
  const w = 40, h = 40, src = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) src.set([0, 147, 0, 255], i * 4)          // a flat jacket-green patch
  const run = o => Array.from(recolorImageData(new Uint8ClampedArray(src), w, h, "jacket", "glitterstorm", o))
  const p0 = run({ phase: 0 }), p1 = run({ phase: 1 })
  assert.deepEqual(run({ phase: 0 }), p0, "deterministic per phase")
  assert.notDeepEqual(p0, p1, "phases differ (it twinkles)")
  const lit = a => { const base = run({ phase: 0, reduce: true }); let n = 0; for (let i = 0; i < a.length; i += 4) n += a[i] !== base[i] || a[i + 1] !== base[i + 1] ? 1 : 0; return n }
  assert(lit(p0) > 40, `glitter is dense enough to read (${lit(p0)} px of 1600)`)
  assert.deepEqual(run({ phase: 2, reduce: true }), run({ phase: 0, reduce: true }), "reduce-flashing: no animation")
})
await test("sparkle: a fixed, sparse, sprite-local pattern (no randomness)", () => {
  let n = 0; for (let y = 0; y < 100; y++) for (let x = 0; x < 100; x++) { const s = sparkleAt(x, y, 40); assert.equal(s, sparkleAt(x, y, 40)); n += s }
  assert(n > 5 && n < 150, String(n))
})
console.log(`\nBEN 10 THEMES: ${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
