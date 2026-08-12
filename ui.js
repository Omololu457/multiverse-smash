// ui.js
// Shared UI rendering and menu layout helpers.
// HUD LAYOUT: Health bars → TOP of screen | Energy bars → BOTTOM of screen

import { drawCharacter } from "./fighters.js"
import { characters } from "./characters.js"
import { isFullyUnlocked } from "./progression.js"
import { artistLineForCharacter, CREDITS } from "./credits.js"
import { isFileApiSupported, saveFileStatus } from "./account.js"
import { countShadowClones } from "./summons.js"
import { COMBO_BREAKER } from "./combat.js"   // universal combo-break resource — HUD pips read stocksPerRound

// Universe-specific in-UI energy resource names, keyed by characters.js traits.energyType.
// Display-only (HUD energy-bar label) — no mechanics/costs read from this. Rick keeps his explicit
// energyConfig.label; Ben/Albedo are relabeled OMNITRIX/ULTIMATRIX by the transform-device HUD block.
const ENERGY_TYPE_LABELS = {
  ki:               "Ki",                       // Dragon Ball (Goku, Vegeta, Goku Black, Piccolo, Frieza, Cell)
  chakra:           "Chakra",                   // Naruto (Naruto, Sasuke)
  cursed_energy:    "Cursed Energy",            // Jujutsu Kaisen (Gojo, Sukuna, Megumi)
  nen:              "Nen",                       // Hunter x Hunter (Gon, Killua, …) — "Nen" over "Aura": matches the energyType field + is the series' proper term
  bullshit_science: "Bullshit Science Energy",  // Rick & Morty (Rick) — mirrors his energyConfig.label; kept here as a fallback
  portal_tech:      "Portal Tech",              // Rick & Morty (Morty, Evil Morty, Rick Prime)
  spd_energy:       "SPD Energy",               // Power Rangers SPD
  symbol_power:     "Symbol Power",             // Power Rangers Samurai (Red Ranger) — Mojikara/kanji power; fuels Mega Mode + specials
  psi:              "Psi",                       // The Disastrous Life of Saiki K. (Saiki) — psychic power
  speed_force:      "Speed Force",               // DC (The Flash) — the Flash Time meter
  gadget:           "Gadgets",                    // DC (Batman) — utility-belt gadget meter (specials + Ultimate)
  smart_atoms:      "Smart Atoms",              // Invincible (Omni-Man) — Viltrumite power reserve; ONE shared pool fuels flight AND specials
  solar_energy:     "Solar Energy",             // DC (Superman) — yellow-sun charge; ONE shared pool fuels flight + specials + modes + ultimate
  stamina:          "Stamina",                  // original roster (Omololu)
  omnitrix:         "Omnitrix",                 // Ben 10 (fallback; device HUD block overrides live)
  ultimatrix:       "Ultimatrix",               // Albedo (fallback; device HUD block overrides live)
  dread:            "Dread",                    // Horror (Ghostface) — the stalker's meter; fuels specials + Ultimate
  reiatsu:          "Reiatsu",                  // Bleach (Ichigo) — spiritual pressure; fuels Getsuga specials + Ultimate
}

// UNIVERSE-level energy-label override — every character in a listed universe shows this label
// REGARDLESS of their individual energyType, present AND future. Power Rangers all draw on the Morphin
// Grid via their Morphers (spd_energy / symbol_power / morphin_grid all read as one resource to players),
// so the whole universe shows "MORPHER ENERGY". Display-only; overrides the energyType name below but
// still yields to an explicit per-character energyConfig.label.
const UNIVERSE_ENERGY_LABELS = {
  power_rangers: "MORPHER ENERGY",
}

// Single source of truth for the energy-bar resource name. Explicit energyConfig.label wins (Rick);
// else a whole-universe override (Power Rangers → "MORPHER ENERGY"); else the per-universe name derived
// from traits.energyType; else generic "ENERGY". Display-only.
export function resolveEnergyLabel(fighter) {
  return fighter?.energyConfig?.label || UNIVERSE_ENERGY_LABELS[fighter?.universe] || ENERGY_TYPE_LABELS[fighter?.traits?.energyType] || "ENERGY"
}

// NO-METER FLAVOR LABEL: a fighter with energyType "none" has no energy pool, so instead of an empty
// generic "ENERGY" panel we show a lore-appropriate resource name keyed by universe. Maki (JJK)
// canonically has no cursed energy → "HEAVENLY RESTRICTION"; Rengoku/Zenitsu (Demon Slayer) fight on
// breathing, not an energy meter → "TOTAL CONCENTRATION". A universe absent here (or a fighter that DOES
// have energy — Omni-Man's "Smart Atoms" etc.) returns null and keeps the normal meter. Display-only.
const NO_METER_FLAVOR = {
  jujutsu_kaisen: "HEAVENLY RESTRICTION",
  demon_slayer:   "TOTAL CONCENTRATION",   // universe fallback (any DS char not named in NO_METER_FLAVOR_BY_KEY)
}
// PER-CHARACTER no-meter flavor override — a Demon Slayer fights on their OWN canonical Breathing Style,
// so each shows their style name instead of the shared generic "TOTAL CONCENTRATION". Checked BEFORE the
// universe fallback. Display-only. Nezuko is a DEMON, not a Demon Slayer — she practises no Breathing
// Style, so she gets her canonical demon-blood technique "BLOOD DEMON ART" (Kekkijutsu) — confirmed with
// the maintainer, NOT a guessed breathing style (matches the game's existing Blood-Demon-Art references).
const NO_METER_FLAVOR_BY_KEY = {
  zenitsu: "THUNDER BREATHING",
  shinobu: "INSECT BREATHING",
  rengoku: "FLAME BREATHING",
  inosuke: "BEAST BREATHING",
  nezuko:  "BLOOD DEMON ART",
}
export function noMeterFlavor(fighter) {
  if (fighter?.traits?.energyType !== "none") return null
  return NO_METER_FLAVOR_BY_KEY[fighter?.rosterKey] || NO_METER_FLAVOR[fighter?.universe] || null
}
// Kept for the existing harness hook (game.js __harness.heavenlyRestriction) — the JJK-specific query.
export function isHeavenlyRestriction(fighter) {
  return fighter?.traits?.energyType === "none" && fighter?.universe === "jujutsu_kaisen"
}

const startScreenImage = new Image()
startScreenImage.src = "./start-screen.png"

const stageBackgroundImages = new Map()

function resolveStageImagePath(path) {
  if (!path) return ""
  if (
    path.startsWith("./")   ||
    path.startsWith("../")  ||
    path.startsWith("/")    ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  ) return path
  return `./${path}`
}

function getStageBackgroundImage(stage) {
  const key = stage?.backgroundImage
  if (!key) return null
  if (!stageBackgroundImages.has(key)) {
    const img = new Image()
    img.src   = resolveStageImagePath(key)
    stageBackgroundImages.set(key, img)
  }
  return stageBackgroundImages.get(key)
}

// ─────────────────────────────────────────────
// CHARACTER PORTRAITS (per-rosterKey, lazily loaded + cached)
// Files: ./<rosterKey>_portrait.png. Never blocks: callers must check
// _imageReady() and fall back to their existing rendering if not loaded/404.
// ─────────────────────────────────────────────
const portraitImages = new Map()

function getPortraitImage(rosterKey) {
  // Prefer the character's EXPLICIT `portrait` field (exact on-disk filename incl.
  // extension + case — GitHub is case-sensitive). Falls back to the legacy
  // ./<rosterKey>_portrait.png convention for any character without the field.
  const key = String(rosterKey || "").trim()
  if (!key) return null
  if (!portraitImages.has(key)) {
    const src = characters?.[key]?.portrait || `./${key}_portrait.png`
    const img = new Image()
    img.src = src
    portraitImages.set(key, img)
  }
  return portraitImages.get(key)
}

function _imageReady(img) {
  return !!(img && img.complete && img.naturalWidth > 0)
}

// Fit an image into a FIXED rect [x,y,w,h] while PRESERVING its own aspect ratio
// (never stretches/squashes — the container is fixed, the image scales to fit it).
//   fit "cover"   → scale to FILL the rect, center-crop the overflow (biased toward
//                   the TOP so a headshot's face stays in frame). Good for decorative
//                   background fills where slight cropping is fine.
//   fit "contain" → scale so the WHOLE image is visible inside the rect, letterboxing
//                   any leftover space (centered). Good for previews where nothing
//                   should be cropped (e.g. full-body skin sprites of varied aspect).
export function drawImageFit(ctx, img, x, y, w, h, { fit = "cover", topBias = 0.30 } = {}) {
  const iw = img.naturalWidth, ih = img.naturalHeight
  if (!iw || !ih) return
  const scale = fit === "contain" ? Math.min(w / iw, h / ih) : Math.max(w / iw, h / ih)
  const dw = iw * scale, dh = ih * scale
  const oy = fit === "contain" ? (h - dh) / 2 : (h - dh) * topBias   // contain: center; cover: top-biased
  ctx.drawImage(img, x + (w - dw) / 2, y + oy, dw, dh)
}
// Back-compat alias — character-select's cover-fit background fill.
function _coverDrawImage(ctx, img, x, y, w, h, topBias = 0.30) {
  drawImageFit(ctx, img, x, y, w, h, { fit: "cover", topBias })
}

// ─────────────────────────────────────────────
// BASIC HELPERS
// ─────────────────────────────────────────────
function getCanvasSize(canvas) {
  return {
    width:  canvas?.width  || canvas?.clientWidth  || window.innerWidth,
    height: canvas?.height || canvas?.clientHeight || window.innerHeight
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

// Local hit-test (input.js owns the exported pointInRect; ui.js stays
// dependency-light and just needs this for hover highlighting).
function _inRect(x, y, r) {
  return !!r && x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

function normalizeToArray(value) {
  return Array.isArray(value) ? value : []
}

function roundRect(ctx, x, y, w, h, r = 18) {
  const radius = Math.min(r, w * 0.5, h * 0.5)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

function fillRoundRect(ctx, x, y, w, h, r = 18) {
  roundRect(ctx, x, y, w, h, r)
  ctx.fill()
}

function strokeRoundRect(ctx, x, y, w, h, r = 18) {
  roundRect(ctx, x, y, w, h, r)
  ctx.stroke()
}

function drawPanel(ctx, x, y, w, h, options = {}) {
  const {
    radius    = 18,
    fill      = "rgba(10, 16, 36, 0.72)",
    stroke    = "rgba(255,255,255,0.16)",
    lineWidth = 2
  } = options
  ctx.save()
  ctx.fillStyle = fill
  fillRoundRect(ctx, x, y, w, h, radius)
  ctx.strokeStyle = stroke
  ctx.lineWidth   = lineWidth
  strokeRoundRect(ctx, x, y, w, h, radius)
  ctx.restore()
}

function drawCenteredText(ctx, text, x, y, options = {}) {
  const {
    font        = "700 24px Arial",
    fill        = "#ffffff",
    align       = "center",
    baseline    = "middle",
    shadowBlur  = 0,
    shadowColor = "transparent"
  } = options
  ctx.save()
  ctx.font         = font
  ctx.fillStyle    = fill
  ctx.textAlign    = align
  ctx.textBaseline = baseline
  ctx.shadowBlur   = shadowBlur
  ctx.shadowColor  = shadowColor
  ctx.fillText(text, x, y)
  ctx.restore()
}

function drawSubText(ctx, text, x, y, options = {}) {
  drawCenteredText(ctx, text, x, y, {
    font:     options.font     || "16px Arial",
    fill:     options.fill     || "rgba(220,230,255,0.82)",
    align:    options.align    || "center",
    baseline: options.baseline || "middle"
  })
}

function drawBackdrop(ctx, canvas, top = "#070d1b", bottom = "#17243f") {
  const { width: w, height: h } = getCanvasSize(canvas)
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, top)
  bg.addColorStop(1, bottom)
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, w, h)

  ctx.save()
  ctx.globalAlpha = 0.22
  const glow1 = ctx.createRadialGradient(w * 0.22, h * 0.18, 10, w * 0.22, h * 0.18, w * 0.34)
  glow1.addColorStop(0, "#5d89ff")
  glow1.addColorStop(1, "transparent")
  ctx.fillStyle = glow1
  ctx.fillRect(0, 0, w, h)

  const glow2 = ctx.createRadialGradient(w * 0.78, h * 0.28, 10, w * 0.78, h * 0.28, w * 0.30)
  glow2.addColorStop(0, "#ff6fb7")
  glow2.addColorStop(1, "transparent")
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, w, h)
  ctx.restore()
}

// ── SCROLLABLE CARD GRIDS ───────────────────────────────────────────────────
// Card grids (character / FFA / Edo-Tensei-vessel select) can hold more rows than fit on screen.
// We keep a per-grid vertical scroll offset (keyed, so different screens don't share a position) and
// subtract it from every card's y in getGridLayout — so the SAME rects feed BOTH drawing and hit-testing
// and can never drift out of sync. The offset is always clamped to the REAL content height (derived from
// the roster count — no hardcoded visible-row count), so it self-corrects as the roster grows/shrinks.
// Canonical layout opts for the shared character-card grid (char select, Edo vessel pick, FFA pick).
export const CHAR_GRID_OPTS = { cols: 4, cardW: 220, cardH: 110, gap: 18, startY: 148, bottomMargin: 88, scrollKey: "chars" }

// SELECT-DEPTH detail panel (Stage 23) — ONE source of truth for its rect so the draw AND the grid's
// scroll math agree on where it sits. Fixed band near the lower-middle, clamped up on short screens.
const SELECT_DETAIL_H = 216, SELECT_DETAIL_GAP = 14
export function getSelectDetailRect(canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  return { x: 40, y: Math.min(410, h - 250), w: w - 80, h: SELECT_DETAIL_H }
}
// Grid opts for the MAIN character-select. When the detail panel is showing it overlays the lower half
// of the screen, so the grid must reserve that band: without this the scroll math counts the panel's
// area as visible, wrongly concludes "everything fits" (maxOffset 0 → no scrollbar), and the bottom
// rows render behind the panel UNREACHABLE — the bug once the roster grows past 2 rows. Reserving the
// band shrinks the viewport so those rows scroll up into the clear area above the panel. Pass
// withDetail=false (Edo vessel-pick / anything without the panel) to get the full-height opts unchanged.
export function charSelectGridOpts(canvas, withDetail) {
  if (!withDetail) return CHAR_GRID_OPTS
  const { height: h } = getCanvasSize(canvas)
  const d = getSelectDetailRect(canvas)
  return { ...CHAR_GRID_OPTS, bottomMargin: h - d.y + SELECT_DETAIL_GAP }   // viewBottom = panel top − gap
}

const _gridScroll = new Map()   // scrollKey -> offset px (>= 0; scrolls content UP)

// Geometry of a grid: how tall the content is, the visible band, and the max scrollable offset.
function _gridMetrics(count, canvas, opts = {}) {
  const { height: h } = getCanvasSize(canvas)
  const cols   = opts.cols   || 3
  const cardH  = opts.cardH  || 120
  const gap    = opts.gap    || 24
  const startY = opts.startY || 150
  const rows     = Math.ceil(Math.max(0, count) / cols)
  const contentH = rows > 0 ? rows * cardH + (rows - 1) * gap : 0
  const viewTop    = startY
  const viewBottom = h - (opts.bottomMargin ?? 84)     // keep clear of the footer hint
  const viewH      = Math.max(0, viewBottom - viewTop)
  const maxOffset  = Math.max(0, contentH - viewH)
  return { rows, cols, cardH, gap, startY, contentH, viewTop, viewBottom, viewH, maxOffset }
}

// Current CLAMPED offset for a grid; also writes the clamped value back so stale offsets self-correct
// (e.g. after the roster shrank or the window was resized).
function _gridOffset(key, count, canvas, opts) {
  if (!key) return 0
  const { maxOffset } = _gridMetrics(count, canvas, opts)
  const o = clamp(_gridScroll.get(key) || 0, 0, maxOffset)
  _gridScroll.set(key, o)
  return o
}

// Scroll a grid by a delta (wheel/trackpad/drag). Returns the clamped offset.
export function scrollGridBy(key, delta, count, canvas, opts) {
  _gridScroll.set(key, (_gridScroll.get(key) || 0) + delta)
  return _gridOffset(key, count, canvas, opts)
}
// Set a grid's offset absolutely (scrollbar thumb drag / track-jump). Returns the clamped offset.
export function setGridScroll(key, offset, count, canvas, opts) {
  _gridScroll.set(key, offset)
  return _gridOffset(key, count, canvas, opts)
}
// Reset a grid to the top (call on screen entry so you always start at the first row).
export function resetGridScroll(key) { if (key) _gridScroll.set(key, 0) }

// The visible band [top, bottom] a grid's cards are clipped/hit-tested against.
export function getGridViewport(canvas, opts = {}) {
  const m = _gridMetrics(0, canvas, opts)
  return { top: m.viewTop, bottom: m.viewBottom }
}

// Scrollbar geometry (track + thumb rects) for drawing AND drag hit-testing. null when nothing to scroll.
export function getGridScrollbar(count, canvas, opts = {}) {
  const m = _gridMetrics(count, canvas, opts)
  if (m.maxOffset <= 0 || m.contentH <= 0) return null
  const { width: w } = getCanvasSize(canvas)
  const offset = _gridOffset(opts.scrollKey, count, canvas, opts)
  const barW = 8, pad = 8
  const trackX = w - barW - pad
  const track = { x: trackX, y: m.viewTop, w: barW, h: m.viewH }
  const thumbH = Math.max(40, m.viewH * (m.viewH / m.contentH))
  const thumbY = m.viewTop + (offset / m.maxOffset) * (m.viewH - thumbH)
  const thumb = { x: trackX, y: thumbY, w: barW, h: thumbH }
  return { track, thumb, offset, maxOffset: m.maxOffset }
}

// Hit-test a point against a grid's cards, but ONLY cards whose visible portion is inside the viewport
// band — so a card scrolled ABOVE the fold can't be clicked through the header. Returns index or -1.
export function pickGridCard(canvas, roster, mx, my, opts = CHAR_GRID_OPTS) {
  roster = normalizeToArray(roster)
  const { top, bottom } = getGridViewport(canvas, opts)
  if (my < top || my > bottom) return -1
  const rects = getGridLayout(roster.length, canvas, opts)
  return rects.findIndex(r => mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h)
}

function getGridLayout(count, canvas, options = {}) {
  const { width: w } = getCanvasSize(canvas)
  const cols   = options.cols  || 3
  const cardW  = options.cardW || 300
  const cardH  = options.cardH || 120
  const gap    = options.gap   || 24
  const startY = options.startY || 150
  const offset = _gridOffset(options.scrollKey, count, canvas, options)   // 0 unless this grid scrolls

  const totalW = cols * cardW + (cols - 1) * gap
  const startX = (w - totalW) / 2
  const rects  = []

  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    rects.push({
      x: startX + col * (cardW + gap),
      y: startY + row * (cardH + gap) - offset,
      w: cardW,
      h: cardH
    })
  }
  return rects
}

function getVerticalMenuLayout(canvas, labels = []) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const n = Math.max(1, labels.length)
  const menuWidth  = clamp(w * 0.34, 320, 520)
  // Fit the buttons in the band BELOW the header and ABOVE the footer at any
  // screen size / item count — shrink the row height + gap instead of overflowing.
  const topMargin    = 150
  const bottomMargin = 70
  const avail        = Math.max(140, h - topMargin - bottomMargin)
  const gap          = n > 6 ? 12 : 18
  let buttonHeight   = (avail - (n - 1) * gap) / n
  buttonHeight       = clamp(buttonHeight, 46, 92)
  const totalHeight  = n * buttonHeight + (n - 1) * gap
  const startX       = w / 2 - menuWidth / 2
  const startY       = topMargin + Math.max(0, (avail - totalHeight) / 2)

  return labels.map((label, index) => ({
    ...label,                            // pass through extra fields (e.g. slot, count)
    id:       label.id       || String(index),
    label:    label.label    || String(label),
    subLabel: label.subLabel || "",
    locked:   !!label.locked,            // carried through for greyed/disabled rendering
    lockNote: label.lockNote || "",
    x: startX,
    y: startY + index * (buttonHeight + gap),
    w: menuWidth,
    h: buttonHeight
  }))
}

function drawButton(ctx, rect, options = {}) {
  const { label = "", subLabel = "", active = false, accent = "#8fb3ff" } = options

  const fill   = active ? "rgba(82, 119, 230, 0.34)" : "rgba(255,255,255,0.08)"
  const stroke = active ? "#dbe8ff" : "rgba(255,255,255,0.18)"

  ctx.save()
  drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, { radius: 22, fill, stroke, lineWidth: active ? 3 : 2 })

  if (active) {
    ctx.shadowBlur  = 26
    ctx.shadowColor = accent
    ctx.strokeStyle = accent
    ctx.lineWidth   = 1
    strokeRoundRect(ctx, rect.x + 6, rect.y + 6, rect.w - 12, rect.h - 12, 18)
    ctx.shadowBlur  = 0
  }

  // Scale text to the row height so labels never clip on a compact menu.
  const labelSize = Math.round(clamp(rect.h * 0.34, 16, 26))
  const subSize   = Math.round(clamp(rect.h * 0.18, 11, 15))
  const showSub   = subLabel && rect.h >= 58
  const labelY    = showSub ? rect.y + rect.h * 0.40 : rect.y + rect.h * 0.52
  drawCenteredText(ctx, label, rect.x + rect.w / 2, labelY, {
    font: `700 ${labelSize}px Arial`,
    fill: "#ffffff"
  })
  if (showSub) {
    drawSubText(ctx, subLabel, rect.x + rect.w / 2, rect.y + rect.h * 0.74, {
      font: `${subSize}px Arial`,
      fill: "rgba(220,230,255,0.76)"
    })
  }
  ctx.restore()
}

function drawHeader(ctx, canvas, title, subtitle = "") {
  const { width: w } = getCanvasSize(canvas)
  drawCenteredText(ctx, title, w / 2, 72, {
    font: "800 40px Arial", fill: "#f3f7ff",
    shadowBlur: 22, shadowColor: "rgba(120,170,255,0.35)"
  })
  if (subtitle) {
    drawSubText(ctx, subtitle, w / 2, 112, { font: "18px Arial", fill: "rgba(220,230,255,0.78)" })
  }
}

function drawFooterHint(ctx, canvas, text) {
  const { width: w, height: h } = getCanvasSize(canvas)
  drawSubText(ctx, text, w / 2, h - 34, { font: "15px Arial", fill: "rgba(220,230,255,0.78)" })
}

// ─────────────────────────────────────────────
// MENU LAYOUT EXPORTS
// ─────────────────────────────────────────────
export function getStartMenuRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "play", label: "PLAY", subLabel: "Enter the multiverse" }
  ])
}

export function getGameplaySelectRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "training", label: "TRAINING",  subLabel: "1 player practice mode"      },
    { id: "vs",       label: "VS MATCH",  subLabel: "1 player vs the CPU"         },
    { id: "pvp",      label: "2 PLAYER",  subLabel: "Local versus — P1 vs P2"     },
    { id: "arcade",   label: "ARCADE",    subLabel: "7 fights, a rival, a boss & your ending" },
    { id: "tower",    label: "TOWER",     subLabel: "Climb a ladder of CPU fights" },
    { id: "bracket",  label: "TOURNAMENT", subLabel: "Local 4/8-fighter single-elim bracket" },
    { id: "ffa",      label: "FREE-FOR-ALL", subLabel: "3-4 player last-standing (local)" },
    { id: "aivsai",   label: "AI vs AI",  subLabel: "Watch/test two CPUs — logged, fast-forwardable" },
    { id: "back",     label: "BACK",      subLabel: "Return to title"             }
  ])
}

// ── AI vs AI SETUP SCREEN ────────────────────────────────────────────────────
// Eight rows: P1 fighter/difficulty, P2 fighter/difficulty, match count, speed, START, BACK.
// Each value row is click-to-cycle (and ◀/▶ on the keyboard); START commits the run.
export function getAiVsAiSetupRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "p1char", label: "P1 FIGHTER" },
    { id: "p1diff", label: "P1 AI" },
    { id: "p2char", label: "P2 FIGHTER" },
    { id: "p2diff", label: "P2 AI" },
    { id: "matches", label: "MATCHES" },
    { id: "speed",  label: "SPEED" },
    { id: "start",  label: "START",  subLabel: "Begin the AI-vs-AI run" },
    { id: "back",   label: "BACK",   subLabel: "Return to mode select" }
  ])
}

function _nameForKey(roster, key) {
  const r = (roster || []).find(c => (c.key || c.rosterKey) === key)
  return r ? (r.name || key) : (key || "?")
}

export function drawAiVsAiSetupScreen(ctx, canvas, cfg = {}, roster = [], selectedIndex = 0) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#0a0f1e", "#101f38")
  drawHeader(ctx, canvas, "AI vs AI", "Two CPUs fight automatically — every move is logged")

  const speeds = [1, 2, 4, 8]
  const valueFor = (id) => {
    switch (id) {
      case "p1char": return _nameForKey(roster, cfg.p1Key)
      case "p1diff": return (cfg.p1Diff || "").toUpperCase()
      case "p2char": return _nameForKey(roster, cfg.p2Key)
      case "p2diff": return (cfg.p2Diff || "").toUpperCase()
      case "matches": return String(cfg.matches)
      case "speed":  return `${speeds[cfg.speedIndex] || 1}×`
      default: return null
    }
  }
  const accentFor = (id) =>
    id === "start" ? "#7CFC98" :
    (id === "p1char" || id === "p1diff") ? "#7dd3fc" :
    (id === "p2char" || id === "p2diff") ? "#fca5a5" : "#8fb3ff"

  getAiVsAiSetupRects(canvas).forEach((b, i) => {
    const val = valueFor(b.id)
    const label = val != null ? `${b.label}:  ${val}` : b.label
    const sub = val != null ? "◀ ▶ or click to change" : b.subLabel
    drawButton(ctx, b, { label, subLabel: sub, active: i === selectedIndex, accent: accentFor(b.id) })
  })
  drawFooterHint(ctx, canvas, "↑↓ select · ◀▶ change · Enter start · click a row to cycle · Esc back")
}

// ── AI vs AI RUN-COMPLETE SUMMARY ────────────────────────────────────────────
export function getAiVsAiSummaryRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "json",  label: "DOWNLOAD JSON", subLabel: "Full move-by-move log" },
    { id: "csv",   label: "DOWNLOAD CSV",  subLabel: "Flat event table (training-ready)" },
    { id: "again", label: "RUN AGAIN",     subLabel: "Back to AI-vs-AI setup" },
    { id: "menu",  label: "MAIN MENU",     subLabel: "Leave spectator mode" }
  ])
}

export function drawAiVsAiSummaryScreen(ctx, canvas, exp = {}, selectedIndex = 0) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#0a0f1e", "#101f38")
  const s = exp.summary || { totalMatches: 0, wins: {}, byMethod: {} }
  drawHeader(ctx, canvas, "RUN COMPLETE", `${s.totalMatches} matches simulated`)

  const { width: w } = getCanvasSize(canvas)
  const wins = s.wins || {}
  const meth = s.byMethod || {}
  const line = `P1 wins: ${wins.p1 || 0}   ·   P2 wins: ${wins.p2 || 0}   ·   Draws: ${wins.draw || 0}`
  const line2 = Object.entries(meth).map(([k, v]) => `${k}: ${v}`).join("   ·   ") || "—"
  drawCenteredText(ctx, line, w / 2, 150, { font: "700 20px Arial", fill: "#e2e8f0" })
  drawSubText(ctx, `Endings — ${line2}`, w / 2, 178, { font: "15px Arial", fill: "rgba(220,230,255,0.72)" })

  getAiVsAiSummaryRects(canvas).forEach((b, i) => {
    drawButton(ctx, b, { label: b.label, subLabel: b.subLabel, active: i === selectedIndex,
      accent: b.id === "json" || b.id === "csv" ? "#7CFC98" : "#8fb3ff" })
  })
  drawFooterHint(ctx, canvas, "Logs also auto-downloaded when the run finished · click to re-download")
}

// FREE-FOR-ALL slot assignment — decide who drives each slot: a local human device or a CPU
// (with a difficulty). One click-to-cycle row per slot + CONTINUE / BACK. Slot rows carry
// `slot` (0-based); action buttons carry a string id. Mirrors the team-select layout.
export function getFFASlotSelectRects(canvas, playerCount = 3) {
  const items = []
  for (let i = 0; i < playerCount; i++) items.push({ id: `slot${i}`, slot: i, label: `P${i + 1}`, subLabel: "" })
  items.push({ id: "continue", label: "CONTINUE", subLabel: "On to team assignment" })
  items.push({ id: "back",     label: "BACK",     subLabel: "Return to fighter select" })
  return getVerticalMenuLayout(canvas, items)
}

// Friendly name for the human device that would drive a slot (keyboards first, then pads).
function ffaSlotDeviceName(slot) {
  return slot === 0 ? "P1 keyboard" : slot === 1 ? "P2 keyboard" : `P${slot + 1} controller`
}

export function drawFFASlotSelectScreen(ctx, canvas, playerCount = 3, aiSlots = [], charKeys = [], deviceCount = 2, selectedIndex = 0) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#0a0f1e", "#101f38")
  drawHeader(ctx, canvas, "ASSIGN PLAYERS", "Click a slot to cycle Human ↔ CPU and pick a difficulty")
  let aiCount = 0
  getFFASlotSelectRects(canvas, playerCount).forEach((b, i) => {
    if (b.slot != null) {
      const diff    = aiSlots[b.slot] || null
      const forced  = b.slot >= deviceCount                 // no device for this slot → must be CPU
      const who     = diff ? `CPU (${diff.toUpperCase()})` : `HUMAN — ${ffaSlotDeviceName(b.slot)}`
      if (diff) aiCount++
      const sub     = forced ? "No device — click to change CPU difficulty"
                             : "Click to cycle Human / CPU difficulties"
      drawButton(ctx, b, { label: `P${b.slot + 1}  ${charKeys[b.slot] || "?"}  →  ${who}`, subLabel: sub, active: i === selectedIndex, accent: diff ? "#fbbf24" : "#8fb3ff" })
    } else {
      drawButton(ctx, b, { label: b.label, subLabel: b.subLabel, active: i === selectedIndex })
    }
  })
  drawFooterHint(ctx, canvas, `${aiCount} CPU · ${playerCount - aiCount} human  ·  slots without a device default to CPU`)
}

// FREE-FOR-ALL team assignment — one toggle row per slot + START / NO-TEAMS / BACK.
// Slot rows carry `slot` (0-based); action buttons carry a string id.
export function getFFATeamSelectRects(canvas, playerCount = 3) {
  const items = []
  for (let i = 0; i < playerCount; i++) items.push({ id: `slot${i}`, slot: i, label: `P${i + 1}`, subLabel: "" })
  items.push({ id: "start",   label: "START MATCH", subLabel: "Begin the team battle" })
  items.push({ id: "noteams", label: "NO TEAMS",    subLabel: "Play a pure free-for-all instead" })
  items.push({ id: "back",    label: "BACK",        subLabel: "Return to fighter select" })
  return getVerticalMenuLayout(canvas, items)
}

export function drawFFATeamSelectScreen(ctx, canvas, playerCount = 3, teams = [], charKeys = [], selectedIndex = 0, teamColors = {}) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#0a0f1e", "#0f2740")
  drawHeader(ctx, canvas, "ASSIGN TEAMS", "Click a player to switch their team (uneven splits are fine)")
  getFFATeamSelectRects(canvas, playerCount).forEach((b, i) => {
    if (b.slot != null) {
      const team = teams[b.slot] || "A"
      const col = teamColors[team] || "#94a3b8"
      drawButton(ctx, b, { label: `P${b.slot + 1}  ${charKeys[b.slot] || "?"}  →  TEAM ${team}`, subLabel: "Click to toggle A / B", active: i === selectedIndex })
      // team swatch on the right of the row
      ctx.save(); ctx.fillStyle = col; ctx.fillRect(b.x + b.w - 34, b.y + b.h / 2 - 10, 20, 20)
      ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.strokeRect(b.x + b.w - 34, b.y + b.h / 2 - 10, 20, 20); ctx.restore()
    } else {
      drawButton(ctx, b, { label: b.label, subLabel: b.subLabel, active: i === selectedIndex })
    }
  })
  const counts = ["A", "B"].map(t => `${t}: ${teams.slice(0, playerCount).filter(x => x === t).length}`).join("   ")
  drawFooterHint(ctx, canvas, `${counts}  ·  friendly fire is OFF — teammates can't damage each other`)
}

// FREE-FOR-ALL setup — pick player count (3 or 4). Entries above the device cap are locked.
export function getFFASetupRects(canvas, maxPlayers = 4) {
  return getVerticalMenuLayout(canvas, [
    { id: "p3",   count: 3, label: "3 PLAYERS", subLabel: "Three-way free-for-all",  locked: maxPlayers < 3, lockNote: "Needs another controller" },
    { id: "p4",   count: 4, label: "4 PLAYERS", subLabel: "Four-way free-for-all",   locked: maxPlayers < 4, lockNote: "Needs another controller" },
    { id: "back", label: "BACK", subLabel: "Return to mode select" }
  ])
}

// TOWER TIER SELECT — 5 tiers by floor count (labels mirror game.js TOWER_TIERS ids).
export function getTowerSelectRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "tier1", label: "TIER 1", subLabel: "3 opponents"                       },
    { id: "tier2", label: "TIER 2", subLabel: "10 opponents"                      },
    { id: "tier3", label: "TIER 3", subLabel: "25 opponents"                      },
    { id: "tier4", label: "TIER 4", subLabel: "40 opponents"                      },
    { id: "tier5", label: "TIER 5", subLabel: "INFINITE — difficulty escalates"   },
    { id: "back",  label: "BACK",   subLabel: "Return to mode select"             }
  ])
}

export function getAIDifficultyRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "easy",       label: "EASY",       subLabel: "Low pressure, simple AI"    },
    { id: "adaptive",   label: "ADAPTIVE",   subLabel: "Learns and responds"        },
    { id: "impossible", label: "IMPOSSIBLE", subLabel: "Aggressive and relentless"  },
    { id: "back",       label: "BACK",       subLabel: "Return to mode select"      }
  ])
}

export function getUniverseCardRects(canvas, universes = []) {
  universes = normalizeToArray(universes)
  return getGridLayout(universes.length, canvas, { cols: 3, cardW: 300, cardH: 110, gap: 24, startY: 150 })
}

export function getCharacterCardRects(canvas, roster = [], opts = CHAR_GRID_OPTS) {
  roster = normalizeToArray(roster)
  return getGridLayout(roster.length, canvas, opts)   // scroll-aware (scrollKey "chars"); opts reserves the detail panel on main select
}

export function getStageCardRects(canvas, stages = []) {
  stages = normalizeToArray(stages)
  return getGridLayout(stages.length, canvas, { cols: 3, cardW: 310, cardH: 120, gap: 24, startY: 160 })
}

// ─────────────────────────────────────────────
// START SCREEN
// ─────────────────────────────────────────────
export function drawStartScreen(ctx, canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const cx   = w / 2
  const cy   = h / 2
  const time = performance.now() * 0.001

  ctx.clearRect(0, 0, w, h)

  if (startScreenImage.complete && startScreenImage.naturalWidth > 0) {
    ctx.drawImage(startScreenImage, 0, 0, w, h)
  } else {
    const bgGrad = ctx.createLinearGradient(0, 0, 0, h)
    bgGrad.addColorStop(0, "#030814")
    bgGrad.addColorStop(0.45, "#061225")
    bgGrad.addColorStop(1, "#0b1630")
    ctx.fillStyle = bgGrad
    ctx.fillRect(0, 0, w, h)
  }

  ctx.fillStyle = "rgba(0,0,0,0.34)"
  ctx.fillRect(0, 0, w, h)

  const pulse = 0.92 + Math.sin(time * 2.2) * 0.08

  ctx.save()
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"

  ctx.shadowBlur  = 28
  ctx.shadowColor = "rgba(120,180,255,0.45)"
  ctx.fillStyle   = "#eef4ff"
  ctx.font        = `900 ${Math.floor(Math.max(54, w * 0.046))}px Arial`
  ctx.fillText("MULTIVERSE SMASH", cx, cy - 96)

  ctx.shadowBlur  = 16
  ctx.shadowColor = "rgba(255,190,225,0.35)"
  ctx.strokeStyle = "rgba(255,210,235,0.22)"
  ctx.lineWidth   = 2
  ctx.strokeText("MULTIVERSE SMASH", cx, cy - 96)

  ctx.shadowBlur  = 16
  ctx.shadowColor = "rgba(110,140,255,0.35)"
  ctx.fillStyle   = "#dfe8ff"
  ctx.font        = `700 ${Math.floor(Math.max(26, w * 0.018))}px Arial`
  ctx.fillText("ULTIMATE", cx, cy - 30)
  ctx.restore()

  drawSubText(ctx, "A collision of worlds begins here", cx, cy + 28, {
    font: `${Math.floor(Math.max(14, w * 0.0105))}px Arial`,
    fill: "rgba(220,230,255,0.85)"
  })

  const [playButton] = getStartMenuRects(canvas)
  drawButton(ctx, playButton, {
    label: "PLAY", subLabel: "Enter the multiverse",
    active: true,
    accent: `rgba(255, 180, 220, ${0.18 + (pulse - 0.9) * 0.8})`
  })

  drawFooterHint(ctx, canvas, "Click PLAY to continue")
}

// ─────────────────────────────────────────────
// START INFO PANEL
// Cycling fighter spotlight + control legends shown on the title screen.
// data = { fighters: [{name,universe,type,hp,speed,hint}], p1Controls }
// ─────────────────────────────────────────────
function drawControlList(ctx, x, y, w, h, title, accent, rows) {
  drawPanel(ctx, x, y, w, h, { fill: "rgba(8,14,30,0.78)", stroke: accent, lineWidth: 2, radius: 14 })
  drawCenteredText(ctx, title, x + 16, y + 26, { font: "800 15px Arial", fill: accent, align: "left", baseline: "middle" })
  ctx.save()
  ctx.font = "13px Arial"
  ctx.textBaseline = "middle"
  let ry = y + 52
  for (const [label, value] of rows) {
    ctx.textAlign = "left"
    ctx.fillStyle = "rgba(220,230,255,0.72)"
    ctx.fillText(label, x + 16, ry)
    ctx.textAlign = "right"
    ctx.fillStyle = "#ffffff"
    ctx.fillText(value, x + w - 16, ry)
    ry += 21
  }
  ctx.restore()
}

export function drawStartInfoPanel(ctx, canvas, data = {}) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const fighters = normalizeToArray(data.fighters)
  const c = data.p1Controls || {}
  const up = (s) => String(s || "—").toUpperCase()

  // ── Fighter spotlight (left) — auto-cycles through the roster ──
  if (fighters.length) {
    const idx = Math.floor(performance.now() / 2600) % fighters.length
    const f   = fighters[idx]
    const pw  = clamp(w * 0.26, 270, 360)
    const ph  = 212
    const px  = 28
    const py  = h * 0.5 - ph * 0.5 + 30

    drawPanel(ctx, px, py, pw, ph, { fill: "rgba(8,14,30,0.78)", stroke: "rgba(130,170,255,0.5)", lineWidth: 2, radius: 16 })
    drawCenteredText(ctx, "FIGHTER SPOTLIGHT", px + 18, py + 26, { font: "800 14px Arial", fill: "#8fb3ff", align: "left", baseline: "middle" })
    drawCenteredText(ctx, f.name, px + 18, py + 58, { font: "800 24px Arial", fill: "#ffffff", align: "left", baseline: "middle" })
    drawCenteredText(ctx, `${f.universe}${f.universe && f.type ? "  •  " : ""}${f.type}`, px + 18, py + 84, { font: "13px Arial", fill: "rgba(220,230,255,0.72)", align: "left", baseline: "middle" })

    // HP + SPEED bars
    const barX = px + 18, barW = pw - 36
    const drawStat = (label, val, max, color, yy) => {
      drawCenteredText(ctx, label, barX, yy, { font: "700 12px Arial", fill: "rgba(220,230,255,0.8)", align: "left", baseline: "middle" })
      ctx.fillStyle = "rgba(255,255,255,0.12)"; fillRoundRect(ctx, barX + 64, yy - 7, barW - 64, 12, 6)
      ctx.fillStyle = color; fillRoundRect(ctx, barX + 64, yy - 7, (barW - 64) * clamp(val / max, 0, 1), 12, 6)
      drawCenteredText(ctx, String(val), barX + barW, yy - 22, { font: "700 12px Arial", fill: "#fff", align: "right", baseline: "middle" })
    }
    drawStat("HEALTH", f.hp, 1500, "#ff7a7a", py + 122)
    drawStat("SPEED", f.speed, 12, "#7fe0ff", py + 152)
    if (f.hint) drawCenteredText(ctx, `★ ${f.hint}`, px + 18, py + 184, { font: "italic 13px Arial", fill: "rgba(255,220,150,0.9)", align: "left", baseline: "middle" })
    drawCenteredText(ctx, `${idx + 1}/${fighters.length}`, px + pw - 16, py + 26, { font: "700 12px Arial", fill: "rgba(220,230,255,0.5)", align: "right", baseline: "middle" })
  }

  // ── Control legends (right) — P1 keyboard + P2 controller ──
  const cw = clamp(w * 0.24, 250, 320)
  const cx = w - cw - 28
  const kbRows = [
    ["Move",          `${up(c.left)} / ${up(c.right)}`],
    ["Jump / Up",     up(c.up)],
    ["Crouch / Block",up(c.down)],
    ["Light",         up(c.light)],
    ["Heavy",         up(c.heavy)],
    ["Special",       up(c.special)],
    ["Ultimate",      up(c.ultimate)],
    ["Dash",          up(c.dash)],
    ["Grab",          up(c.grab)]
  ]
  const padRows = [
    ["Move / Jump", "L-Stick / D-Pad"],
    ["Light",       "✕ (Cross)"],
    ["Heavy",       "□ (Square)"],
    ["Special",     "△ (Triangle)"],
    ["Dash",        "○ (Circle)"],
    ["Ultimate",    "L2 / R2"],
    ["Grab",        "L1"],
    ["Omnitrix",    "R1  (+ ← / →)"]
  ]
  const kbH = 52 + kbRows.length * 21 + 10
  const padH = 52 + padRows.length * 21 + 10
  const totalH = kbH + padH + 14
  let cy = clamp(h * 0.5 - totalH * 0.5 + 30, 90, h - totalH - 20)
  drawControlList(ctx, cx, cy, cw, kbH, "PLAYER 1 — KEYBOARD", "#7fd3ff", kbRows)
  drawControlList(ctx, cx, cy + kbH + 14, cw, padH, "PLAYER 2 — CONTROLLER", "#ff9f9f", padRows)
  drawCenteredText(ctx, "Toggle keyboard/controller in SETTINGS", cx + cw / 2, cy + totalH + 6, { font: "12px Arial", fill: "rgba(220,230,255,0.6)" })
}

// ─────────────────────────────────────────────
// BEN 10 — OMNITRIX LOADOUT SELECT (pick 5 aliens)
// ─────────────────────────────────────────────
function alienCardMetrics(canvas) {
  const { width: w } = getCanvasSize(canvas)
  const gap   = 12
  const cols  = 7
  const cardW = clamp((Math.min(w, 1280) * 0.92 - (cols - 1) * gap) / cols, 96, 168)
  const cardH = 58
  return { gap, cols, cardW, cardH, startY: 168 }
}

// Scroll-aware layout opts for the Omnitrix grid. bottomMargin clears the BACK/CONFIRM buttons
// (h-56-28) so a scrolled bottom row never hides under them. scrollKey engages the shared grid
// scroller — while the aliens fit (the norm) maxOffset is 0 and it behaves exactly as before, but it
// auto-scrolls the instant the art-backed roster overflows. Nothing here is hardcoded to a row count.
export function alienGridOpts(canvas) {
  const { gap, cols, cardW, cardH, startY } = alienCardMetrics(canvas)
  return { cols, cardW, cardH, gap, startY, bottomMargin: 100, scrollKey: "aliens" }
}
export function getAlienSelectCardRects(canvas, aliens = []) {
  aliens = normalizeToArray(aliens)
  return getGridLayout(aliens.length, canvas, alienGridOpts(canvas))
}

export function getAlienSelectButtons(canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const bw = 200, bh = 56, gap = 24
  const y = h - bh - 28
  return [
    { id: "back",    label: "BACK",    x: w / 2 - bw - gap / 2, y, w: bw, h: bh },
    { id: "confirm", label: "CONFIRM", x: w / 2 + gap / 2,      y, w: bw, h: bh }
  ]
}

export function drawAlienSelectScreen(ctx, canvas, options = {}) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const aliens = normalizeToArray(options.aliens)
  const draft  = normalizeToArray(options.draft)
  const player = options.player || 1
  // Per-slot transform combos (labels), passed in from game.js (single source of truth). slotCap =
  // how many slots the input system supports. Both data-driven — NOTHING hardcoded to 5.
  const slotCombos = normalizeToArray(options.slotCombos)
  const slotCap    = options.slotCap || slotCombos.length || 5

  // Max loadout = min(slots the system supports, forms that actually have art). Grows automatically.
  const maxPick = Math.min(slotCap, Math.max(1, aliens.length))
  // When there aren't more forms than slots, there's no real sub-choice to make — every available form
  // just gets a slot. Present it honestly as an auto-assigned slot list, not a "pick fewer" puzzle.
  const autoFill = aliens.length <= maxPick

  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#0a1810", "#16241a")
  const sub = autoFill
    ? `${aliens.length} form${aliens.length === 1 ? "" : "s"} available — auto-assigned to slots (click to reorder). Slot order = transform combo.`
    : `Pick up to ${maxPick} aliens  (${draft.length}/${maxPick}) — pick order = slot = transform combo`
  drawHeader(ctx, canvas, `PLAYER ${player} — OMNITRIX SLOTS`, sub)

  const rects = getAlienSelectCardRects(canvas, aliens)
  // Clip the cards to the scrollable band so a scrolled row never overdraws the header/buttons.
  const vp = getGridViewport(canvas, alienGridOpts(canvas))
  ctx.save()
  ctx.beginPath(); ctx.rect(0, vp.top - 2, w, (vp.bottom - vp.top) + 4); ctx.clip()
  aliens.forEach((a, i) => {
    const r = rects[i]
    if (!r) return
    const slot = draft.indexOf(a.key)
    const picked = slot >= 0
    drawPanel(ctx, r.x, r.y, r.w, r.h, {
      fill: picked ? "rgba(34,197,94,0.28)" : "rgba(255,255,255,0.06)",
      stroke: picked ? "#22c55e" : "rgba(255,255,255,0.14)",
      lineWidth: picked ? 3 : 2, radius: 10
    })
    // colour swatch
    ctx.fillStyle = a.color || "#888"
    fillRoundRect(ctx, r.x + 8, r.y + r.h / 2 - 9, 18, 18, 5)
    drawCenteredText(ctx, a.name, r.x + 34, r.y + r.h / 2 - 6, {
      font: "700 13px Arial", fill: "#fff", align: "left", baseline: "middle"
    })
    if (picked) {
      // the fixed transform combo for THIS slot (e.g. "Charge + ↓") — the deliberate per-slot input.
      const combo = slotCombos[slot]
      if (combo) drawCenteredText(ctx, `Charge + ${combo}`, r.x + 34, r.y + r.h / 2 + 11, {
        font: "600 10px Arial", fill: "#86efac", align: "left", baseline: "middle"
      })
      // slot number badge
      ctx.fillStyle = "#052e16"; ctx.beginPath(); ctx.arc(r.x + r.w - 16, r.y + 16, 11, 0, Math.PI * 2); ctx.fill()
      drawCenteredText(ctx, String(slot + 1), r.x + r.w - 16, r.y + 16, { font: "800 13px Arial", fill: "#bbf7d0" })
    }
  })
  ctx.restore()
  drawGridScrollbar(ctx, getGridScrollbar(aliens.length, canvas, alienGridOpts(canvas)))

  // buttons
  const buttons = getAlienSelectButtons(canvas)
  for (const b of buttons) {
    const enabled = b.id !== "confirm" || draft.length >= 1
    drawButton(ctx, b, { label: b.label, active: enabled, accent: enabled ? "#86efac" : "#555" })
    if (!enabled) {
      ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = "#000"
      fillRoundRect(ctx, b.x, b.y, b.w, b.h, 22); ctx.restore()
    }
  }
  drawFooterHint(ctx, canvas, "Click to add / remove / reorder slots • each alien has its own moveset • transform in-fight: hold Charge + the slot's direction")
}

// ─────────────────────────────────────────────
// MAIN MENU (after pressing PLAY on the title)
// ─────────────────────────────────────────────
export function getMainMenuRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "play",     label: "PLAY",      subLabel: "Training • VS CPU • 2 Player • Tower" },
    // ONLINE is locked until a full-unlock code (dev OR beta) is entered (Task 5/6).
    // isFullyUnlocked() flips it selectable (leads to a placeholder screen — no netcode yet).
    { id: "online",   label: "ONLINE",    subLabel: isFullyUnlocked() ? "Unlocked (placeholder)" : "Coming soon — online play", locked: !isFullyUnlocked(), lockNote: "Online play is coming soon" },
    { id: "devcode",  label: "DEV CODE",  subLabel: isFullyUnlocked() ? "✓ Everything unlocked (session only)" : "Enter unlock code" },
    { id: "moveList", label: "MOVE LIST", subLabel: "Fighters, moves, combos & controls"  },
    { id: "tutorial", label: "HOW TO PLAY", subLabel: "Controls & mechanics walkthrough"  },
    { id: "account",  label: "ACCOUNT",   subLabel: "Create / switch local profile"       },
    // SAVE FILE (File System Access API). Loads/creates a local game_player_data.json so
    // progress persists; subLabel reflects live status (or that the browser can't do it).
    { id: "savefile", label: "SAVE FILE", subLabel: isFileApiSupported() ? saveFileStatus() : "Not supported here — progress stays in-memory" },
    { id: "settings", label: "SETTINGS",  subLabel: "Keyboard / controller setup"         },
    { id: "credits",  label: "CREDITS",   subLabel: "Art, audio & attribution"            },
    { id: "back",     label: "BACK",      subLabel: "Return to title"                     }
  ])
}

export function drawMainMenuScreen(ctx, canvas, hoverIndex = 0, account = null) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#08111f", "#182845")
  drawHeader(ctx, canvas, "MAIN MENU", "Where do you want to go?")

  // Logged-in-as banner (top-right) so the current account is always visible.
  const { width: w } = getCanvasSize(canvas)
  const label = account ? `Logged in as ${account.username}` : "Not logged in"
  ctx.save(); ctx.font = "700 14px Arial"; ctx.textBaseline = "middle"
  const bw = ctx.measureText(label).width + 28
  drawPanel(ctx, w - bw - 24, 24, bw, 34, { fill: "rgba(8,14,30,0.8)", stroke: account ? "#86efac" : "rgba(255,255,255,0.18)", lineWidth: 1.5, radius: 10 })
  ctx.fillStyle = account ? "#bbf7d0" : "rgba(220,230,255,0.7)"
  ctx.textAlign = "center"; ctx.fillText(label, w - bw / 2 - 24, 41)
  ctx.restore()

  const rects = getMainMenuRects(canvas)
  rects.forEach((r, i) => {
    drawButton(ctx, r, { label: r.label, subLabel: r.subLabel, active: i === hoverIndex && !r.locked })
    if (r.locked) {
      // LOCKED placeholder (e.g. ONLINE): grey wash + a single lock pill on the
      // right, vertically centered so it never collides with the label/sub.
      ctx.save()
      ctx.fillStyle = "rgba(8,12,24,0.55)"; roundRect(ctx, r.x, r.y, r.w, r.h, 18); ctx.fill()
      const pillW = 96, pillH = 26, px = r.x + r.w - pillW - 16, py = r.y + r.h / 2 - pillH / 2
      ctx.fillStyle = "rgba(30,41,59,0.95)"; roundRect(ctx, px, py, pillW, pillH, 13); ctx.fill()
      ctx.strokeStyle = "rgba(148,163,184,0.5)"; ctx.lineWidth = 1; roundRect(ctx, px, py, pillW, pillH, 13); ctx.stroke()
      ctx.fillStyle = "#cbd5e1"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
      ctx.font = "600 13px Arial"; ctx.fillText("🔒 Locked", px + pillW / 2, py + pillH / 2 + 1)
      ctx.restore()
    }
  })
  drawFooterHint(ctx, canvas, "Tip: new here? Open HOW TO PLAY for the controls and core mechanics")
}

// ─────────────────────────────────────────────
// MOVE LIST / KIT BROWSER
// opts = { fighters:[{key,name,universe}], selectedIndex, kit, showControls, controlRef }
// ─────────────────────────────────────────────
function moveListLayout(canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const top    = 116
  const listX  = 24
  const listCols = 2
  const listGap  = 8
  const listW  = clamp(w * 0.30, 300, 430)
  const colW   = (listW - listGap * (listCols - 1)) / listCols
  const rowH   = 30
  const panelX = listX + listW + 24
  const panelW = w - panelX - 24
  return { w, h, top, listX, listW, listCols, listGap, colW, rowH, panelX, panelW }
}

export function getMoveListCardRects(canvas, count) {
  const L = moveListLayout(canvas)
  const rows = Math.ceil(count / L.listCols)
  const rects = []
  for (let i = 0; i < count; i++) {
    const col = Math.floor(i / rows)   // fill column-by-column (alphabetical-ish down each column)
    const row = i % rows
    rects.push({
      x: L.listX + col * (L.colW + L.listGap),
      y: L.top + row * (L.rowH + 4),
      w: L.colW, h: L.rowH
    })
  }
  return rects
}

export function getMoveListButtons(canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  return [
    { id: "back",     label: "BACK",     x: 24,        y: h - 64, w: 150, h: 44 },
    { id: "controls", label: "CONTROLS", x: w - 24 - 200, y: h - 64, w: 200, h: 44 }
  ]
}

function drawKitPanel(ctx, x, y, w, h, kit) {
  drawPanel(ctx, x, y, w, h, { fill: "rgba(8,14,30,0.8)", stroke: "rgba(130,170,255,0.4)", lineWidth: 2, radius: 14 })
  if (!kit) { drawCenteredText(ctx, "Select a fighter", x + w / 2, y + h / 2, { font: "18px Arial", fill: "rgba(220,230,255,0.6)" }); return }

  const pad = 18
  let cy = y + 26
  const left = x + pad
  const colR = x + w - pad

  drawCenteredText(ctx, kit.name || "", left, cy, { font: "800 22px Arial", fill: "#fff", align: "left", baseline: "middle" })
  drawCenteredText(ctx, kit.difficulty || "", colR, cy, { font: "700 13px Arial", fill: "#ffd27f", align: "right", baseline: "middle" })
  cy += 22
  drawCenteredText(ctx, `${kit.type || ""}   •   Energy: ${kit.energy || "—"}`, left, cy, { font: "13px Arial", fill: "#8fb3ff", align: "left", baseline: "middle" })
  cy += 20
  // summary (wrapped)
  cy = wrapText(ctx, kit.summary || "", left, cy, w - pad * 2, 16, { font: "13px Arial", fill: "rgba(220,230,255,0.8)" })
  cy += 4

  const section = (title) => {
    cy += 8
    drawCenteredText(ctx, title, left, cy, { font: "800 13px Arial", fill: "#7fd3ff", align: "left", baseline: "middle" })
    cy += 16
  }
  const row = (a, b, c) => {
    ctx.save(); ctx.textBaseline = "middle"; ctx.font = "12px Arial"
    ctx.textAlign = "left";  ctx.fillStyle = "#fff";                 ctx.fillText(a, left, cy)
    ctx.textAlign = "left";  ctx.fillStyle = "rgba(150,200,255,0.95)"; ctx.fillText(b, left + 150, cy)
    if (c != null) { ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,210,140,0.9)"; ctx.fillText(c, colR, cy) }
    ctx.restore(); cy += 16
  }

  if (kit.passive) { section("PASSIVE"); row(kit.passive.name, "", ""); cy -= 16
    cy = wrapText(ctx, kit.passive.effect || "", left + 150, cy, w - pad * 2 - 150, 14, { font: "italic 11px Arial", fill: "rgba(220,230,255,0.7)" }); cy += 2 }

  section("SPECIALS  (cost)")
  for (const s of kit.specials || []) row(s.name, s.input, s.cost ? `${s.cost} CE` : "free")
  if (kit.mobility) { row(kit.mobility.name, kit.mobility.input, kit.mobility.cost ? `${kit.mobility.cost} CE` : "free") }
  if (kit.ultimate) { row(kit.ultimate.name, kit.ultimate.input, kit.ultimate.cost ? `${kit.ultimate.cost} CE` : "free") }

  section("COMBOS")
  for (const c of kit.combos || []) {
    drawCenteredText(ctx, `${c.name}:`, left, cy, { font: "700 12px Arial", fill: "#ffd27f", align: "left", baseline: "middle" })
    drawCenteredText(ctx, c.sequence, left + 130, cy, { font: "12px Arial", fill: "#cfe0ff", align: "left", baseline: "middle" })
    cy += 16
  }

  section("BASIC ATTACKS  (no energy)")
  for (const b of kit.basics || []) row(b.name, b.input, "")
}

function drawControlsPanel(ctx, x, y, w, h, ref) {
  drawPanel(ctx, x, y, w, h, { fill: "rgba(8,14,30,0.8)", stroke: "rgba(130,170,255,0.4)", lineWidth: 2, radius: 14 })
  if (!ref) return
  const pad = 18
  const colW = (w - pad * 2 - 24) / 3
  const cols = [
    { title: "PLAYER 1 — KEYBOARD", rows: ref.keyboardP1, accent: "#7fd3ff" },
    { title: "PLAYER 2 — KEYBOARD", rows: ref.keyboardP2, accent: "#ffd27f" },
    { title: "CONTROLLER",          rows: ref.controller, accent: "#ff9f9f" }
  ]
  cols.forEach((col, ci) => {
    const cx = x + pad + ci * (colW + 12)
    let cy = y + 28
    drawCenteredText(ctx, col.title, cx, cy, { font: "800 13px Arial", fill: col.accent, align: "left", baseline: "middle" })
    cy += 20
    ctx.save(); ctx.font = "12px Arial"; ctx.textBaseline = "middle"
    for (const [label, key] of col.rows) {
      ctx.textAlign = "left";  ctx.fillStyle = "rgba(220,230,255,0.78)"; ctx.fillText(label, cx, cy)
      ctx.textAlign = "right"; ctx.fillStyle = "#fff";                   ctx.fillText(key, cx + colW - 8, cy)
      cy += 20
    }
    ctx.restore()
  })
  // how-to-specials footer
  let hy = y + h - 16 - (ref.howToSpecials.length * 16)
  drawCenteredText(ctx, "HOW TO PERFORM SPECIAL MOVES", x + pad, hy, { font: "800 13px Arial", fill: "#86efac", align: "left", baseline: "middle" })
  hy += 18
  for (const line of ref.howToSpecials) {
    drawCenteredText(ctx, "• " + line, x + pad, hy, { font: "12px Arial", fill: "rgba(220,230,255,0.82)", align: "left", baseline: "middle" })
    hy += 16
  }
}

export function drawMoveListScreen(ctx, canvas, opts = {}) {
  const L = moveListLayout(canvas)
  const fighters = normalizeToArray(opts.fighters)
  const selectedIndex = opts.selectedIndex ?? 0

  ctx.clearRect(0, 0, L.w, L.h)
  drawBackdrop(ctx, canvas, "#0b1021", "#1b2240")
  drawHeader(ctx, canvas, "MOVE LIST", opts.showControls ? "Controls & how to perform specials" : "Pick a fighter to see their kit")

  // left list
  const rects = getMoveListCardRects(canvas, fighters.length)
  fighters.forEach((f, i) => {
    const r = rects[i]
    const sel = i === selectedIndex
    drawPanel(ctx, r.x, r.y, r.w, r.h, {
      fill: sel ? "rgba(70,110,210,0.4)" : "rgba(255,255,255,0.05)",
      stroke: sel ? "#dbe7ff" : "rgba(255,255,255,0.12)", lineWidth: sel ? 2 : 1, radius: 8
    })
    drawCenteredText(ctx, f.name, r.x + 12, r.y + r.h / 2, { font: sel ? "700 13px Arial" : "13px Arial", fill: sel ? "#fff" : "rgba(220,230,255,0.85)", align: "left", baseline: "middle" })
  })

  // right panel
  const panelY = L.top
  const panelH = L.h - panelY - 80
  if (opts.showControls) drawControlsPanel(ctx, L.panelX, panelY, L.panelW, panelH, opts.controlRef)
  else                   drawKitPanel(ctx, L.panelX, panelY, L.panelW, panelH, opts.kit)

  // buttons
  for (const b of getMoveListButtons(canvas)) {
    const active = b.id === "controls" ? !!opts.showControls : false
    drawButton(ctx, b, { label: b.id === "controls" && opts.showControls ? "MOVES" : b.label, active })
  }
}

// Simple word-wrap helper — returns the new y after drawing.
function wrapText(ctx, text, x, y, maxW, lineH, style = {}) {
  ctx.save()
  ctx.font = style.font || "13px Arial"; ctx.fillStyle = style.fill || "#fff"
  ctx.textAlign = "left"; ctx.textBaseline = "middle"
  const words = String(text).split(/\s+/)
  let line = ""
  for (const word of words) {
    const test = line ? line + " " + word : word
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, y); y += lineH; line = word
    } else line = test
  }
  if (line) { ctx.fillText(line, x, y); y += lineH }
  ctx.restore()
  return y
}

// ─────────────────────────────────────────────
// GAMEPLAY SELECT
// ─────────────────────────────────────────────
export function drawGameplaySelectScreen(ctx, canvas, selectedIndex = 0) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#08111f", "#182845")
  drawHeader(ctx, canvas, "GAMEPLAY SELECT", "Choose how you want to play")
  getGameplaySelectRects(canvas).forEach((button, index) => {
    drawButton(ctx, button, { label: button.label, subLabel: button.subLabel, active: index === selectedIndex })
  })
  drawFooterHint(ctx, canvas, "Training = 1 player practice • VS Match = player vs CPU")
}

// ─────────────────────────────────────────────
// FREE-FOR-ALL SETUP + CHARACTER SELECT
// ─────────────────────────────────────────────
export function drawFFASetupScreen(ctx, canvas, selectedIndex = 0, maxPlayers = 4, padCount = 0) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#0a0f1e", "#3a1030")
  drawHeader(ctx, canvas, "FREE-FOR-ALL", "Last fighter standing — how many players?")
  getFFASetupRects(canvas, maxPlayers).forEach((button, index) => {
    drawButton(ctx, button, { label: button.label, subLabel: button.locked ? button.lockNote : button.subLabel, active: index === selectedIndex && !button.locked })
  })
  drawFooterHint(ctx, canvas, `Devices: keyboard P1 + keyboard P2 + ${padCount} controller(s) → up to ${maxPlayers} players. P3/P4 are controller-only.`)
}

export function drawFFACharSelectScreen(ctx, canvas, slot = 0, playerCount = 3, roster = [], selectedIndex = 0, picks = []) {
  const { width: w, height: h } = getCanvasSize(canvas)
  roster = normalizeToArray(roster)
  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#0b1021", "#171f37")
  drawHeader(ctx, canvas, `PLAYER ${slot + 1} — CHOOSE FIGHTER`, `Free-for-all · ${playerCount} players`)
  const rects = getCharacterCardRects(canvas, roster)
  const vp = getGridViewport(canvas, CHAR_GRID_OPTS)
  ctx.save()
  ctx.beginPath(); ctx.rect(0, vp.top - 2, w, (vp.bottom - vp.top) + 4); ctx.clip()
  roster.forEach((c, i) => {
    const r = rects[i]; if (!r) return
    const sel = i === selectedIndex
    drawPanel(ctx, r.x, r.y, r.w, r.h, {
      fill:   sel ? "rgba(244,114,182,0.5)" : "rgba(255,255,255,0.08)",
      stroke: sel ? "#fbcfe8" : "rgba(255,255,255,0.16)",
      lineWidth: sel ? 3 : 2
    })
    drawCenteredText(ctx, c?.name || c?.rosterKey || `#${i}`, r.x + r.w / 2, r.y + r.h / 2, { font: "700 18px Arial", fill: "#ffffff" })
  })
  ctx.restore()
  drawGridScrollbar(ctx, getGridScrollbar(roster.length, canvas, CHAR_GRID_OPTS))
  const done = picks.map((p, i) => `P${i + 1}:${p}`).join("  ")
  drawFooterHint(ctx, canvas, done ? `Locked → ${done}` : "Click a fighter to lock this slot")
}

// ─────────────────────────────────────────────
// TOWER TIER SELECT
// ─────────────────────────────────────────────
export function drawTowerSelectScreen(ctx, canvas, selectedIndex = 0) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#0a0f1e", "#2a1c3d")
  drawHeader(ctx, canvas, "TOWER", "Pick a tier — beat every floor to clear it")
  getTowerSelectRects(canvas).forEach((button, index) => {
    drawButton(ctx, button, { label: button.label, subLabel: button.subLabel, active: index === selectedIndex })
  })
  drawFooterHint(ctx, canvas, "Random opponent + stage each floor • Tier 5 never ends — how high can you climb?")
}

// ─────────────────────────────────────────────
// AI DIFFICULTY SELECT
// ─────────────────────────────────────────────
export function drawAIDifficultyScreen(ctx, canvas, selectedIndex = 0) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#0c0d1e", "#231c3d")
  drawHeader(ctx, canvas, "AI DIFFICULTY", "Pick your opponent level")
  getAIDifficultyRects(canvas).forEach((button, index) => {
    drawButton(ctx, button, { label: button.label, subLabel: button.subLabel, active: index === selectedIndex })
  })
  drawFooterHint(ctx, canvas, "Easy • Adaptive • Impossible")
}

// ─────────────────────────────────────────────
// ARCADE  (Stage 19) — setup / rival intro / ending
// ─────────────────────────────────────────────
export function getArcadeSetupRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "easy",       label: "EASY",       subLabel: "A relaxed climb"                    },
    { id: "adaptive",   label: "NORMAL",     subLabel: "The intended challenge"             },
    { id: "impossible", label: "HARD",       subLabel: "Relentless — for veterans"          },
    { id: "back",       label: "BACK",       subLabel: "Return to mode select"              }
  ])
}
export function drawArcadeSetupScreen(ctx, canvas, selectedIndex = 0) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#0a0f1e", "#3a1c2d")
  drawHeader(ctx, canvas, "ARCADE", "7 fights · a rival · a boss · your ending")
  getArcadeSetupRects(canvas).forEach((button, index) => {
    drawButton(ctx, button, { label: button.label, subLabel: button.subLabel, active: index === selectedIndex })
  })
  drawFooterHint(ctx, canvas, "Difficulty is fixed for the whole run · lose and you can spend a continue")
}

// ── RIVAL INTRO (Stage 19C) — two portraits + the pre-fight exchange ──
export function drawRivalIntroScreen(ctx, canvas, opts = {}) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const { playerKey, rivalKey, playerName = "", rivalName = "", lines = [] } = opts
  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#0a0810", "#2a0f16")
  drawHeader(ctx, canvas, "RIVAL", "")
  const cx = w / 2, py = 150, pw = 260, ph = 300
  const drawBust = (key, x, mirror, name, tint) => {
    const img = getPortraitImage(key)
    ctx.save()
    roundRect(ctx, x, py, pw, ph, 16); ctx.clip()
    if (_imageReady(img)) {
      if (mirror) { ctx.translate(x * 2 + pw, 0); ctx.scale(-1, 1) }
      _coverDrawImage(ctx, img, x, py, pw, ph)
    } else { ctx.fillStyle = "#20232e"; ctx.fillRect(x, py, pw, ph) }
    ctx.restore()
    ctx.strokeStyle = tint; ctx.lineWidth = 3; roundRect(ctx, x, py, pw, ph, 16); ctx.stroke()
    drawCenteredText(ctx, name, x + pw / 2, py + ph + 26, { font: "700 20px Arial", fill: tint })
  }
  drawBust(playerKey, cx - pw - 60, false, playerName, "#7fd3ff")
  drawBust(rivalKey,  cx + 60,      true,  rivalName,  "#ff8a8a")
  drawCenteredText(ctx, "VS", cx, py + ph / 2 + 8, { font: "800 46px Arial", fill: "#ffe9a8", shadowBlur: 8, shadowColor: "rgba(0,0,0,0.7)" })
  // Dialogue lines.
  let ly = py + ph + 76
  for (const line of lines) {
    drawCenteredText(ctx, line, cx, ly, { font: "18px Arial", fill: "#e6edf7" }); ly += 30
  }
  drawFooterHint(ctx, canvas, "Click or press any key to FIGHT")
}

// ── ENDING (Stage 19B) — Ken-Burns slow-pan slides over portrait/render art ──
const endingImages = new Map()
function getEndingImage(filename, rosterKey) {
  const key = filename || `__portrait__${rosterKey}`
  if (!endingImages.has(key)) {
    const img = new Image()
    img.src = filename ? `./${filename}` : (characters?.[rosterKey]?.portrait || `./${rosterKey}_portrait.png`)
    // On failure, fall back to the portrait (or leave broken → gradient-only slide).
    if (filename) img.onerror = () => { const p = new Image(); p.src = characters?.[rosterKey]?.portrait || `./${rosterKey}_portrait.png`; endingImages.set(key, p) }
    endingImages.set(key, img)
  }
  return endingImages.get(key)
}
// opts: { rosterKey, slides, index, elapsedMs, slideMs }
export function drawArcadeEndingScreen(ctx, canvas, opts = {}) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const { rosterKey, slides = [], index = 0, elapsedMs = 0, slideMs = 6000 } = opts
  const slide = slides[index] || { text: "" }
  ctx.clearRect(0, 0, w, h)
  // Backdrop gradient (also the fallback when the image is missing).
  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, "#0a0d1a"); bg.addColorStop(1, "#161022")
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h)

  // Cross-slide fade + slow Ken-Burns zoom/pan on the still image.
  const p = Math.max(0, Math.min(1, elapsedMs / slideMs))
  const fadeIn = Math.min(1, elapsedMs / 600), fadeOut = Math.min(1, Math.max(0, (slideMs - elapsedMs)) / 600)
  const alpha = Math.min(fadeIn, fadeOut)
  const img = getEndingImage(slide.image, rosterKey)
  if (_imageReady(img)) {
    const zoom = 1.05 + 0.12 * p                      // slow zoom-in across the slide
    const panX = (index % 2 === 0 ? -1 : 1) * 24 * p  // gentle alternating drift
    const panY = -18 * p
    // Contain the image in the upper ~68% of the screen, centered, then apply the Ken-Burns transform.
    const boxW = w, boxH = h * 0.72
    const ar = img.naturalWidth / img.naturalHeight
    let dw = boxH * ar, dh = boxH
    if (dw > boxW) { dw = boxW; dh = boxW / ar }
    dw *= zoom; dh *= zoom
    const dx = (w - dw) / 2 + panX, dy = (boxH - dh) / 2 + panY
    ctx.save(); ctx.globalAlpha = 0.85 * alpha + 0.15
    ctx.drawImage(img, dx, dy, dw, dh)
    ctx.restore()
  }
  // Bottom scrim + slide text.
  const scrim = ctx.createLinearGradient(0, h * 0.55, 0, h)
  scrim.addColorStop(0, "rgba(8,10,20,0)"); scrim.addColorStop(0.5, "rgba(8,10,20,0.82)"); scrim.addColorStop(1, "rgba(8,10,20,0.96)")
  ctx.fillStyle = scrim; ctx.fillRect(0, h * 0.55, w, h * 0.45)
  ctx.save(); ctx.globalAlpha = Math.min(1, elapsedMs / 500)
  wrapCenteredText(ctx, slide.text, w / 2, h - 150, Math.min(920, w - 120), 30, { font: "20px Arial", fill: "#f2f5ff" })
  ctx.restore()
  // Progress dots + hint.
  const dotY = h - 54, gap = 22, x0 = w / 2 - (slides.length - 1) * gap / 2
  for (let i = 0; i < slides.length; i++) {
    ctx.beginPath(); ctx.arc(x0 + i * gap, dotY, 5, 0, Math.PI * 2)
    ctx.fillStyle = i === index ? "#ffe9a8" : "rgba(255,255,255,0.3)"; ctx.fill()
  }
  drawFooterHint(ctx, canvas, index < slides.length - 1 ? "Click for the next page" : "Click to finish")
}

// Small word-wrap helper for centered multi-line body text (used by the ending screen).
function wrapCenteredText(ctx, text, cx, y, maxWidth, lineH, style = {}) {
  ctx.font = style.font || "18px Arial"; ctx.fillStyle = style.fill || "#fff"; ctx.textAlign = "center"
  const words = String(text || "").split(" "); const lines = []; let line = ""
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word } else line = test
  }
  if (line) lines.push(line)
  const startY = y - (lines.length - 1) * lineH
  lines.forEach((ln, i) => ctx.fillText(ln, cx, startY + i * lineH))
}

// ─────────────────────────────────────────────
// LOCAL TOURNAMENT BRACKET (Stage 24B)
// ─────────────────────────────────────────────
export function getBracketSetupRects(canvas) {
  return getVerticalMenuLayout(canvas, [
    { id: "size4", label: "4 FIGHTERS", subLabel: "2 rounds to the title" },
    { id: "size8", label: "8 FIGHTERS", subLabel: "3 rounds to the title" },
    { id: "back",  label: "BACK",       subLabel: "Return to mode select"  }
  ])
}
export function drawBracketSetupScreen(ctx, canvas, selectedIndex = 0) {
  ctx.clearRect(0, 0, ...Object.values(getCanvasSize(canvas)))
  drawBackdrop(ctx, canvas, "#0a0f1e", "#241d3d")
  drawHeader(ctx, canvas, "LOCAL TOURNAMENT", "Single elimination · best of 3 · you play your path, CPUs settle the rest")
  getBracketSetupRects(canvas).forEach((b, i) => drawButton(ctx, b, { label: b.label, subLabel: b.subLabel, active: i === selectedIndex }))
  drawFooterHint(ctx, canvas, "Pick a bracket size, then choose your fighter")
}

// Draws the bracket tree. `bracket` = { size, rounds:[[{a,b,winner}]], round, matchIdx, champion }.
export function drawBracketScreen(ctx, canvas, bracket) {
  const { width: w, height: h } = getCanvasSize(canvas)
  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#080b16", "#1a1330")
  drawHeader(ctx, canvas, bracket?.champion ? "CHAMPION" : "TOURNAMENT BRACKET", bracket?.champion ? "" : "Your next match is highlighted")
  if (!bracket) return
  const rounds = bracket.rounds || []
  const colW = Math.min(230, (w - 80) / Math.max(1, rounds.length))
  const top = 130, boxH = 46, gap0 = 20
  const cell = (name, x, y, bw, state) => {
    const fill = state === "win" ? "rgba(34,197,94,0.28)" : state === "cur" ? "rgba(124,58,237,0.35)" : state === "lose" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)"
    const stroke = state === "win" ? "#4ade80" : state === "cur" ? "#a78bfa" : "rgba(255,255,255,0.14)"
    drawPanel(ctx, x, y, bw, 20, { fill, stroke, lineWidth: 1, radius: 5 })
    drawCenteredText(ctx, name || "—", x + 8, y + 10, { font: state === "lose" ? "12px Arial" : "700 12px Arial", fill: state === "lose" ? "rgba(200,210,230,0.45)" : "#fff", align: "left", baseline: "middle" })
  }
  rounds.forEach((round, ri) => {
    const x = 40 + ri * colW
    const spacing = (h - top - 80) / Math.max(1, round.length)
    round.forEach((m, mi) => {
      const y = top + mi * spacing + (spacing - (boxH + gap0)) / 2
      const isCur = ri === bracket.round && mi === bracket.matchIdx && !bracket.champion
      const aState = m.winner ? (m.winner === m.a ? "win" : "lose") : (isCur ? "cur" : "pend")
      const bState = m.winner ? (m.winner === m.b ? "win" : "lose") : (isCur ? "cur" : "pend")
      cell(m.a?.name, x, y, colW - 30, aState)
      cell(m.b?.name, x, y + 24, colW - 30, bState)
    })
  })
  if (bracket.champion) {
    drawCenteredText(ctx, `🏆 ${bracket.champion.name}`, w / 2, h - 96, { font: "800 30px Arial", fill: "#ffe082" })
    drawFooterHint(ctx, canvas, "Click to finish")
  } else {
    drawFooterHint(ctx, canvas, "Click to play your next match")
  }
}

// ─────────────────────────────────────────────
// UNIVERSE SELECT
// ─────────────────────────────────────────────
export function drawUniverseSelectScreen(ctx, canvas, universes = [], selectedIndex = 0) {
  const { width: w, height: h } = getCanvasSize(canvas)
  universes = normalizeToArray(universes)
  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#0b1021", "#171f37")
  drawHeader(ctx, canvas, "UNIVERSE SELECT", "Choose a universe")

  if (!universes.length) {
    drawSubText(ctx, "No universes available", w / 2, h / 2, { font: "20px Arial" })
    return
  }

  const rects = getUniverseCardRects(canvas, universes)
  universes.forEach((universe, i) => {
    const rect       = rects[i]
    const isSelected = i === selectedIndex
    drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
      fill:      isSelected ? "rgba(58, 79, 149, 0.65)" : "rgba(255,255,255,0.08)",
      stroke:    isSelected ? "#e8efff" : "rgba(255,255,255,0.16)",
      lineWidth: isSelected ? 3 : 2
    })
    drawCenteredText(ctx, universe?.name || universe?.id || universe?.label || `Universe ${i + 1}`,
      rect.x + rect.w / 2, rect.y + 58, { font: "700 24px Arial", fill: "#ffffff" })
  })

  drawFooterHint(ctx, canvas, "Choose the universe for the current fighter")
}

// ─────────────────────────────────────────────
// CHARACTER SELECT
// ─────────────────────────────────────────────
// Draw a grid's scrollbar (track + thumb) on the right edge. No-op when the grid fits (bar === null).
function drawGridScrollbar(ctx, bar) {
  if (!bar) return
  roundRect(ctx, bar.track.x, bar.track.y, bar.track.w, bar.track.h, bar.track.w / 2)
  ctx.fillStyle = "rgba(255,255,255,0.10)"; ctx.fill()
  roundRect(ctx, bar.thumb.x, bar.thumb.y, bar.thumb.w, bar.thumb.h, bar.thumb.w / 2)
  ctx.fillStyle = "rgba(219,231,255,0.60)"; ctx.fill()
}

export function drawCharacterSelectScreen(ctx, canvas, options = {}) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const roster        = normalizeToArray(options.roster)
  const selectedIndex = options.selectedIndex ?? 0
  const p1Selected    = options.p1Selected    ?? null
  const p2Selected    = options.p2Selected    ?? null
  const currentPlayer = options.currentPlayer ?? 1
  const title         = options.title         || "CHARACTER SELECT"
  const isLocked      = typeof options.isLocked === "function" ? options.isLocked : () => false   // Stage 21
  const lockLabel     = typeof options.lockLabel === "function" ? options.lockLabel : () => "Locked"

  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#0b1021", "#1b2240")
  drawHeader(ctx, canvas, title, `Player ${currentPlayer} choose your fighter`)

  if (!roster.length) {
    drawSubText(ctx, "No fighters available", w / 2, h / 2, { font: "20px Arial" })
    return
  }

  // When the SELECT-DEPTH detail panel is showing it overlays the lower half of the screen; the grid
  // then reserves that band (smaller viewport → correct scroll math) so no card hides behind it and the
  // bottom rows stay reachable. Every consumer here (layout, clip, scrollbar) uses the SAME opts.
  const withDetail = !!(options.detailKit && options.detailChar)
  const gridOpts = charSelectGridOpts(canvas, withDetail)
  const rects = getCharacterCardRects(canvas, roster, gridOpts)
  // Clip the cards to the scrollable viewport band so scrolled rows never overdraw the header/footer.
  const vp = getGridViewport(canvas, gridOpts)
  ctx.save()
  ctx.beginPath(); ctx.rect(0, vp.top - 2, w, (vp.bottom - vp.top) + 4); ctx.clip()
  roster.forEach((fighter, i) => {
    const rect      = rects[i]
    const isCursor  = i === selectedIndex
    const fighterId = fighter?.id || fighter?.key || fighter?.name || String(i)
    const rosterKey = fighter?.rosterKey || fighter?.id || fighter?.key
    const locked    = !!isLocked(rosterKey)   // Stage 21 — show as a silhouette, not pickable
    const isP1 = p1Selected === fighterId || p1Selected === i
    const isP2 = p2Selected === fighterId || p2Selected === i

    let fill   = "rgba(255,255,255,0.07)"
    let stroke = "rgba(255,255,255,0.14)"

    if (isCursor)       { fill = "rgba(70,110,210,0.35)";  stroke = "#dbe7ff" }
    if (isP1 && isP2)   { fill = "rgba(180,120,255,0.35)"; stroke = "#d7b8ff" }
    else if (isP1)      { fill = "rgba(70,190,255,0.28)";  stroke = "#7fd3ff" }
    else if (isP2)      { fill = "rgba(255,110,110,0.28)"; stroke = "#ff9f9f" }

    // Portrait fill behind the panel (cover-fit, clipped to the card). Falls back
    // to the plain box below when the image isn't loaded/decoded or 404s.
    const portrait = getPortraitImage(fighter?.rosterKey || fighter?.id || fighter?.key)
    const hasPortrait = _imageReady(portrait)
    if (hasPortrait) {
      ctx.save()
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18)
      ctx.clip()
      _coverDrawImage(ctx, portrait, rect.x, rect.y, rect.w, rect.h)
      // Legibility scrim — darker top (name) and bottom (universe), portrait
      // stays visible through the middle.
      const scrim = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h)
      scrim.addColorStop(0,    "rgba(8,12,26,0.55)")
      scrim.addColorStop(0.45, "rgba(8,12,26,0.18)")
      scrim.addColorStop(1,    "rgba(8,12,26,0.62)")
      ctx.fillStyle = scrim
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
      ctx.restore()
    }

    // Panel: when a portrait shows, only the selection TINT + border go on top
    // (a transparent base fill so the art isn't washed out); otherwise the
    // original opaque box renders exactly as before.
    drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
      fill: hasPortrait && fill === "rgba(255,255,255,0.07)" ? "rgba(0,0,0,0)" : fill,
      stroke: locked ? "rgba(120,130,150,0.45)" : stroke, lineWidth: 2
    })

    const fighterName = fighter?.name || fighter?.id || fighter?.displayName || fighter?.label || `Fighter ${i + 1}`
    const universe    = fighter?.universe || fighter?.series || fighter?.origin || ""

    // LOCKED (Stage 21): heavy dark overlay → the portrait reads as a silhouette; show a lock glyph
    // and the unlock requirement instead of the universe/art credit. Still visible, just not pickable.
    if (locked) {
      ctx.save()
      roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 18); ctx.clip()
      ctx.fillStyle = "rgba(6,8,16,0.80)"; ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
      ctx.restore()
      drawCenteredText(ctx, "🔒", rect.x + rect.w / 2, rect.y + 40, { font: "22px Arial", fill: "rgba(220,228,245,0.9)" })
      drawCenteredText(ctx, fighterName, rect.x + rect.w / 2, rect.y + 70, { font: "700 17px Arial", fill: "rgba(210,220,240,0.85)" })
      drawSubText(ctx, lockLabel(rosterKey) || "Locked", rect.x + rect.w / 2, rect.y + 94, { font: "12px Arial", fill: "rgba(255,214,140,0.95)" })
    } else {
      drawCenteredText(ctx, fighterName, rect.x + rect.w / 2, rect.y + 38, {
        font: "700 20px Arial", fill: "#ffffff",
        shadowBlur: hasPortrait ? 4 : 0, shadowColor: "rgba(0,0,0,0.85)"
      })
      if (universe) {
        drawSubText(ctx, universe, rect.x + rect.w / 2, rect.y + 68, { font: "13px Arial", fill: "rgba(220,230,255,0.72)" })
      }
      // Per-character artist credit (only for SOURCED sheets whose terms require it — the credit
      // the artists actually asked for, shown where it matters). null → nothing drawn.
      const artLine = artistLineForCharacter(rosterKey)
      if (artLine) {
        drawSubText(ctx, artLine, rect.x + rect.w / 2, rect.y + 90, { font: "11px Arial", fill: "rgba(255,224,150,0.92)" })
      }
      if (isP1) drawCenteredText(ctx, "P1", rect.x + 18,          rect.y + 16, { font: "700 12px Arial", fill: "#7fd3ff", align: "left",  baseline: "alphabetic" })
      if (isP2) drawCenteredText(ctx, "P2", rect.x + rect.w - 18, rect.y + 16, { font: "700 12px Arial", fill: "#ff9f9f", align: "right", baseline: "alphabetic" })
    }
  })
  ctx.restore()

  const bar = getGridScrollbar(roster.length, canvas, gridOpts)
  drawGridScrollbar(ctx, bar)
  if (options.lockMsg) {   // Stage 21: transient "X — Reach Level N" after clicking a locked card
    drawCenteredText(ctx, `🔒 ${options.lockMsg}`, w / 2, h - 58, { font: "700 15px Arial", fill: "#ffd68c" })
  }
  // SELECT DEPTH (Stage 23): stat bars + archetype + move preview for the hovered fighter, in a fixed
  // band over the lower-middle. The grid above reserves this band (see gridOpts) so rows never hide
  // behind it. Drawn only when the caller supplies a kit — the Edo vessel-pick reuses this without one.
  if (withDetail) {
    const d = getSelectDetailRect(canvas)
    drawSelectDetail(ctx, d.x, d.y, d.w, d.h, options.detailChar, options.detailKit)
  }
  drawFooterHint(ctx, canvas, options.randomHint || (bar ? "Click a fighter card to lock in  ·  scroll for more" : "Click a fighter card to lock in"))
}

// Compact per-fighter detail for the select screen (Stage 23): archetype + 4 stat bars (left) and a
// move preview (right), all from the SAME getKit()/characters data the in-game Move List uses.
const _STAT_RANGES = { maxHealth: [950, 1450], attack: [78, 97], defense: [78, 92], speed: [76, 99] }
function _statBar(ctx, x, y, w, label, val, range, color) {
  const [lo, hi] = range, pct = Math.max(0.06, Math.min(1, ((val || lo) - lo) / (hi - lo)))
  ctx.font = "700 11px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillStyle = "rgba(200,215,245,0.85)"
  ctx.fillText(label, x, y)
  const bx = x + 44, bw = w - 44
  ctx.fillStyle = "rgba(255,255,255,0.10)"; fillRoundRect(ctx, bx, y - 5, bw, 10, 5)
  ctx.fillStyle = color; fillRoundRect(ctx, bx, y - 5, bw * pct, 10, 5)
  ctx.fillStyle = "rgba(230,238,255,0.75)"; ctx.textAlign = "right"; ctx.fillText(String(val ?? "—"), x + w, y)
}
export function drawSelectDetail(ctx, x, y, w, h, char, kit) {
  drawPanel(ctx, x, y, w, h, { fill: "rgba(8,14,30,0.82)", stroke: "rgba(130,170,255,0.35)", lineWidth: 1, radius: 12 })
  const s = char?.stats || {}
  const pad = 18, colW = Math.min(300, w * 0.34)
  // ── LEFT: name + archetype tag + difficulty + stat bars ──
  let ly = y + 24, lx = x + pad
  drawCenteredText(ctx, char?.name || kit?.name || "", lx, ly, { font: "800 18px Arial", fill: "#fff", align: "left", baseline: "middle" }); ly += 20
  ctx.font = "700 12px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "middle"
  ctx.fillStyle = "#8fd0ff"; ctx.fillText(kit?.type || "All-Rounder", lx, ly)
  if (kit?.difficulty) { ctx.fillStyle = "#ffd27f"; ctx.textAlign = "right"; ctx.fillText(kit.difficulty, x + colW, ly) }
  ly += 22
  _statBar(ctx, lx, ly, colW - pad, "HP",  s.maxHealth, _STAT_RANGES.maxHealth, "#22c55e"); ly += 22
  _statBar(ctx, lx, ly, colW - pad, "ATK", s.attack,    _STAT_RANGES.attack,    "#f59e0b"); ly += 22
  _statBar(ctx, lx, ly, colW - pad, "DEF", s.defense,   _STAT_RANGES.defense,   "#38bdf8"); ly += 22
  _statBar(ctx, lx, ly, colW - pad, "SPD", s.speed,     _STAT_RANGES.speed,     "#a78bfa"); ly += 24
  // ── RIGHT: move preview (specials + ultimate + a couple basics) from the kit ──
  let rx = x + colW + 12, ry = y + 24, rw = w - colW - 12 - pad
  ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.beginPath(); ctx.moveTo(x + colW, y + 12); ctx.lineTo(x + colW, y + h - 12); ctx.stroke()
  drawCenteredText(ctx, "MOVES", rx, ry, { font: "800 12px Arial", fill: "#7fd3ff", align: "left", baseline: "middle" }); ry += 18
  const moveRow = (name, input, cost) => {
    if (ry > y + h - 14) return
    ctx.font = "12px Arial"; ctx.textBaseline = "middle"
    ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.fillText(name, rx, ry)
    ctx.textAlign = "left"; ctx.fillStyle = "rgba(150,200,255,0.9)"; ctx.fillText(input, rx + rw * 0.5, ry)
    if (cost != null) { ctx.textAlign = "right"; ctx.fillStyle = "rgba(255,210,140,0.9)"; ctx.fillText(cost, rx + rw, ry) }
    ry += 16
  }
  for (const sp of (kit?.specials || []).slice(0, 3)) moveRow(sp.name, sp.input, sp.cost ? `${sp.cost}` : "free")
  if (kit?.mobility) moveRow(kit.mobility.name, kit.mobility.input, kit.mobility.cost ? `${kit.mobility.cost}` : "free")
  if (kit?.ultimate) moveRow(kit.ultimate.name, kit.ultimate.input, kit.ultimate.cost ? `${kit.ultimate.cost}` : "—")
  const basics = (kit?.basics || []).slice(0, 2).map(b => b.name).join(" · ")
  if (basics && ry <= y + h - 14) { ctx.font = "italic 11px Arial"; ctx.textAlign = "left"; ctx.fillStyle = "rgba(200,215,245,0.6)"; ctx.fillText("Basics: " + basics, rx, ry) }
}

// ─────────────────────────────────────────────
// CREDITS  (scrolling attribution screen — Stage 18)
// ─────────────────────────────────────────────
// Renders the CREDITS sections from credits.js, offset by `scrollY`. Returns the total content
// height so the caller can clamp/auto-scroll. Pure draw — no state. A BACK button rect is
// provided by the caller (game.js) and drawn on top after this returns.
export function drawCreditsScreen(ctx, canvas, scrollY = 0) {
  const { width: w, height: h } = getCanvasSize(canvas)
  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#070b16", "#141d33")

  const cx = w / 2
  const TOP = 96, LINE = 26, GAP_SECTION = 44, GAP_ENTRY = 8
  let y = TOP - scrollY

  // Clip the scrolling body so it never overdraws the fixed header/footer bands.
  ctx.save()
  ctx.beginPath(); ctx.rect(0, 70, w, h - 140); ctx.clip()

  ctx.fillStyle = "#ffe9a8"; ctx.font = "700 30px Arial"; ctx.textAlign = "center"
  ctx.fillText("CREDITS & ATTRIBUTION", cx, y); y += GAP_SECTION

  for (const sec of CREDITS) {
    ctx.fillStyle = "#8fd0ff"; ctx.font = "700 20px Arial"; ctx.textAlign = "center"
    ctx.fillText(sec.section.toUpperCase(), cx, y); y += LINE + 4

    for (const e of (sec.entries || [])) {
      ctx.fillStyle = "#ffffff"; ctx.font = "600 17px Arial"
      ctx.fillText(e.work, cx, y); y += LINE - 4
      const by = `by ${(e.artists || []).join(", ")}${e.source ? `  ·  ${e.source}` : ""}`
      ctx.fillStyle = "rgba(255,224,150,0.95)"; ctx.font = "15px Arial"
      ctx.fillText(by, cx, y); y += LINE + GAP_ENTRY
    }
    for (const ln of (sec.lines || [])) {
      if (ln === "") { y += LINE / 2; continue }
      ctx.fillStyle = "rgba(214,226,255,0.82)"; ctx.font = "14px Arial"
      ctx.fillText(ln, cx, y); y += LINE - 4
    }
    y += GAP_SECTION
  }
  ctx.restore()

  const contentHeight = (y + scrollY) - (TOP - GAP_SECTION)
  drawFooterHint(ctx, canvas, "Scroll to read  ·  click BACK to return")
  return contentHeight
}

// ─────────────────────────────────────────────
// STAGE SELECT
// ─────────────────────────────────────────────
export function drawStageSelectScreen(ctx, canvas, stages = [], selectedIndex = 0) {
  const { width: w, height: h } = getCanvasSize(canvas)
  stages = normalizeToArray(stages)
  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#0b1021", "#1b2742")
  drawHeader(ctx, canvas, "STAGE SELECT", "Choose where the battle begins")

  if (!stages.length) {
    drawSubText(ctx, "No stages available", w / 2, h / 2, { font: "20px Arial" })
    return
  }

  const rects = getStageCardRects(canvas, stages)
  stages.forEach((stage, i) => {
    const rect       = rects[i]
    const isSelected = i === selectedIndex
    const bgImage    = getStageBackgroundImage(stage)

    ctx.save()
    roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 20)
    ctx.clip()

    if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
      ctx.drawImage(bgImage, rect.x, rect.y, rect.w, rect.h)
      const overlay = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h)
      overlay.addColorStop(0, "rgba(0,0,0,0.08)")
      overlay.addColorStop(0.62, "rgba(0,0,0,0.18)")
      overlay.addColorStop(1, "rgba(0,0,0,0.34)")
      ctx.fillStyle = overlay
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    } else {
      const preview = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h)
      preview.addColorStop(0, stage?.sky   || "#6ea8ff")
      preview.addColorStop(0.62, stage?.mid || "#5d7bd8")
      preview.addColorStop(1, stage?.floor  || "#3d465c")
      ctx.fillStyle = preview
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h)
    }

    ctx.fillStyle = "rgba(0,0,0,0.16)"
    ctx.fillRect(rect.x, rect.y + rect.h * 0.64, rect.w, rect.h * 0.36)
    ctx.fillStyle = stage?.accent || "rgba(255,255,255,0.22)"
    ctx.fillRect(rect.x, rect.y + rect.h * 0.62, rect.w, 4)
    ctx.restore()

    drawPanel(ctx, rect.x, rect.y, rect.w, rect.h, {
      fill: "rgba(0,0,0,0)", stroke: isSelected ? "#e8efff" : "rgba(255,255,255,0.18)", lineWidth: isSelected ? 3 : 2
    })

    drawCenteredText(ctx, stage?.name || stage?.id || `Stage ${i + 1}`,
      rect.x + rect.w / 2, rect.y + rect.h - 28, { font: "700 18px Arial", fill: "#ffffff" })
  })

  drawFooterHint(ctx, canvas, "Click a stage card to begin the match")
}

// ─────────────────────────────────────────────
// BATTLE BACKGROUND
// ─────────────────────────────────────────────
// ─────────────────────────────────────────────
// PROCEDURAL STAGE LANDMARKS
// Distinct, series-recognizable skylines drawn behind the fighters. Keyed by
// stage.landmark. Sits above groundY (the floor covers their base). Returns
// true when it drew a custom landmark, false to use the generic mountains.
// Window/light patterns are deterministic (no per-frame flicker).
// ─────────────────────────────────────────────
function _litWindows(ctx, x, y, w, h, cols, rows, color, seed = 1) {
  const cw = w / cols, ch = h / rows
  for (let c = 0; c < cols; c++) for (let r = 0; r < rows; r++) {
    if (((c * 7 + r * 13 + seed * 5) % 5) < 2) continue
    ctx.fillStyle = color
    ctx.fillRect(x + c * cw + cw * 0.2, y + r * ch + ch * 0.2, cw * 0.55, ch * 0.5)
  }
}

function drawStageLandmarks(ctx, stage, worldWidth, groundY, h, accent) {
  const id = stage?.landmark
  if (!id) return false
  const t = performance.now() * 0.001
  ctx.save()

  switch (id) {
    case "jujutsu_high": {
      // Rolling hills + a Japanese school hall with a sloped tiled roof + sakura.
      ctx.fillStyle = "rgba(40,80,55,0.5)"
      ctx.beginPath(); ctx.moveTo(0, groundY)
      for (let x = 0; x <= worldWidth; x += worldWidth / 6) ctx.lineTo(x, groundY - 120 - Math.sin(x * 0.002) * 50)
      ctx.lineTo(worldWidth, groundY); ctx.closePath(); ctx.fill()
      const bx = worldWidth * 0.4, bw = worldWidth * 0.2, by = groundY - 200
      ctx.fillStyle = "#cbd5e1"; ctx.fillRect(bx, by, bw, 200)
      ctx.fillStyle = "#475569"; ctx.beginPath()
      ctx.moveTo(bx - 24, by); ctx.lineTo(bx + bw / 2, by - 60); ctx.lineTo(bx + bw + 24, by); ctx.closePath(); ctx.fill()
      _litWindows(ctx, bx, by + 20, bw, 160, 8, 4, "rgba(120,170,255,0.5)", 2)
      for (const sx of [worldWidth * 0.12, worldWidth * 0.7, worldWidth * 0.88]) {
        ctx.fillStyle = "#5b3a29"; ctx.fillRect(sx, groundY - 90, 10, 90)
        ctx.fillStyle = "rgba(249,168,212,0.8)"
        ctx.beginPath(); ctx.arc(sx + 5, groundY - 100, 34, 0, Math.PI * 2); ctx.fill()
      }
      break
    }
    case "shibuya": {
      // Night skyscrapers + a giant neon billboard + crossing glow.
      const cols = 9
      for (let i = 0; i < cols; i++) {
        const bw = worldWidth / cols, bx = i * bw
        const bh = 180 + ((i * 53) % 160)
        ctx.fillStyle = i % 2 ? "#0a0f1f" : "#11182b"
        ctx.fillRect(bx + 6, groundY - bh, bw - 12, bh)
        _litWindows(ctx, bx + 6, groundY - bh, bw - 12, bh, 5, Math.floor(bh / 26), "rgba(255,210,120,0.45)", i)
      }
      const sx = worldWidth * 0.55, sy = groundY - 320
      ctx.fillStyle = "#020308"; ctx.fillRect(sx, sy, 220, 130)
      const glow = ctx.createLinearGradient(sx, sy, sx + 220, sy + 130)
      glow.addColorStop(0, "#ef4444"); glow.addColorStop(0.5, "#a855f7"); glow.addColorStop(1, "#3b82f6")
      ctx.globalAlpha = 0.55 + Math.sin(t * 3) * 0.2; ctx.fillStyle = glow
      ctx.fillRect(sx + 8, sy + 8, 204, 114); ctx.globalAlpha = 1
      ctx.fillStyle = "rgba(120,180,255,0.10)"; ctx.fillRect(0, groundY - 24, worldWidth, 24)
      break
    }
    case "hidden_leaf": {
      // Hokage Rock cliff with carved faces on the left + village rooftops.
      const cw = worldWidth * 0.34
      ctx.fillStyle = "#6b4f2a"; ctx.fillRect(0, groundY - 300, cw, 300)
      ctx.fillStyle = "#7c5a30"
      ctx.beginPath(); ctx.moveTo(cw, groundY - 300); ctx.lineTo(cw + 90, groundY - 230); ctx.lineTo(cw + 60, groundY); ctx.lineTo(cw, groundY); ctx.closePath(); ctx.fill()
      for (let f = 0; f < 4; f++) {
        const fx = 30 + f * (cw - 60) / 4
        ctx.fillStyle = "rgba(40,28,14,0.55)"; ctx.fillRect(fx, groundY - 250, (cw - 60) / 4 - 16, 90)
        ctx.fillStyle = "rgba(20,14,6,0.7)"
        ctx.fillRect(fx + 10, groundY - 225, 8, 8); ctx.fillRect(fx + 34, groundY - 225, 8, 8)
      }
      for (let i = 0; i < 7; i++) {
        const rx = cw + 40 + i * (worldWidth - cw) / 7
        ctx.fillStyle = "#b45309"; ctx.fillRect(rx, groundY - 70, 90, 70)
        ctx.fillStyle = "#7c2d12"; ctx.beginPath()
        ctx.moveTo(rx - 8, groundY - 70); ctx.lineTo(rx + 45, groundY - 100); ctx.lineTo(rx + 98, groundY - 70); ctx.closePath(); ctx.fill()
      }
      break
    }
    case "valley_of_end": {
      // Two colossal facing statues over a waterfall + mist.
      const wf = worldWidth * 0.5
      ctx.fillStyle = "#cbd5e1"; ctx.globalAlpha = 0.8
      ctx.fillRect(wf - 70, groundY - 360, 140, 360); ctx.globalAlpha = 1
      const drawStatue = (sx, dir) => {
        ctx.fillStyle = "#445"
        ctx.fillRect(sx - 50 * dir, groundY - 330, 100, 330)              // body
        ctx.beginPath(); ctx.arc(sx, groundY - 350, 40, 0, Math.PI * 2); ctx.fill()  // head
        ctx.fillRect(sx, groundY - 250, 130 * dir, 28)                    // outstretched arm
      }
      drawStatue(worldWidth * 0.16, 1)
      drawStatue(worldWidth * 0.84, -1)
      ctx.fillStyle = "rgba(226,232,240,0.18)"
      ctx.fillRect(0, groundY - 60, worldWidth, 60)
      break
    }
    case "namek": {
      // Twin suns + jagged blue-green spires and a rock arch.
      ctx.fillStyle = "rgba(254,240,138,0.7)"
      ctx.beginPath(); ctx.arc(worldWidth * 0.2, 120, 60, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(worldWidth * 0.78, 90, 40, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = "#0f766e"
      for (let i = 0; i < 6; i++) {
        const sx = worldWidth * (0.08 + i * 0.16)
        ctx.beginPath(); ctx.moveTo(sx, groundY); ctx.lineTo(sx + 40, groundY - 200 - (i % 3) * 60); ctx.lineTo(sx + 80, groundY); ctx.closePath(); ctx.fill()
      }
      ctx.strokeStyle = "#115e59"; ctx.lineWidth = 26
      ctx.beginPath(); ctx.arc(worldWidth * 0.5, groundY, 120, Math.PI, 0); ctx.stroke()
      break
    }
    case "tournament": {
      // Bright stadium: tiered stands with a crowd + banner flags + ring apron.
      ctx.fillStyle = "#7c5236"; ctx.fillRect(0, groundY - 150, worldWidth, 150)
      for (let tier = 0; tier < 3; tier++) {
        const ty = groundY - 150 + tier * 46
        ctx.fillStyle = tier % 2 ? "#92400e" : "#a3540f"; ctx.fillRect(0, ty, worldWidth, 42)
        for (let x = 0; x < worldWidth; x += 22) {
          ctx.fillStyle = `hsl(${(x + tier * 40) % 360}, 60%, 60%)`
          ctx.beginPath(); ctx.arc(x + 11, ty + 14, 5, 0, Math.PI * 2); ctx.fill()
        }
      }
      for (let i = 0; i <= 8; i++) {
        const fx = i * worldWidth / 8
        ctx.fillStyle = i % 2 ? "#ef4444" : "#fde68a"
        ctx.beginPath(); ctx.moveTo(fx, groundY - 170); ctx.lineTo(fx + 26, groundY - 162); ctx.lineTo(fx, groundY - 154); ctx.closePath(); ctx.fill()
        ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(fx, groundY - 170); ctx.lineTo(fx, groundY - 150); ctx.stroke()
      }
      break
    }
    case "mugen_train": {
      // Full moon + a steam locomotive on rails with rising smoke.
      ctx.fillStyle = "#f1f5f9"; ctx.globalAlpha = 0.9
      ctx.beginPath(); ctx.arc(worldWidth * 0.78, 110, 64, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1
      const tx = worldWidth * 0.16, ty = groundY - 120
      ctx.fillStyle = "#0b0b12"; ctx.fillRect(tx, ty, worldWidth * 0.6, 90)               // carriages
      ctx.fillStyle = "#15151f"; ctx.fillRect(tx - 130, ty - 20, 150, 110)               // engine
      ctx.fillStyle = "#1f2937"; ctx.fillRect(tx - 70, ty - 60, 36, 44)                  // funnel
      ctx.fillStyle = "rgba(245,158,11,0.8)"
      for (let i = 0; i < 10; i++) ctx.fillRect(tx + 14 + i * (worldWidth * 0.6 / 10), ty + 30, 22, 26)  // windows
      ctx.fillStyle = "#334155"; ctx.fillRect(tx - 140, ty + 92, worldWidth * 0.66, 8)   // rail
      ctx.globalAlpha = 0.5; ctx.fillStyle = "#cbd5e1"
      for (let i = 0; i < 5; i++) { const sx = tx - 50 + Math.sin(t + i) * 14; ctx.beginPath(); ctx.arc(sx, ty - 70 - i * 26, 16 + i * 5, 0, Math.PI * 2); ctx.fill() }
      ctx.globalAlpha = 1
      break
    }
    case "citadel": {
      // Sci-fi spires + swirling green portals in an alien sky.
      ctx.fillStyle = "#0b1020"
      for (let i = 0; i < 7; i++) {
        const bx = i * worldWidth / 7 + 20, bh = 200 + ((i * 71) % 180)
        ctx.fillRect(bx, groundY - bh, worldWidth / 12, bh)
        ctx.fillStyle = "rgba(57,255,20,0.35)"; ctx.fillRect(bx + 4, groundY - bh, 4, bh)
        ctx.fillStyle = "#0b1020"
      }
      for (const [px, py, pr] of [[worldWidth * 0.3, 160, 70], [worldWidth * 0.72, 220, 95]]) {
        for (let k = 4; k >= 0; k--) {
          ctx.globalAlpha = 0.18 + k * 0.12
          ctx.strokeStyle = k % 2 ? "#39ff14" : "#16a34a"; ctx.lineWidth = 6
          ctx.beginPath(); ctx.arc(px, py, pr - k * 11, t * (1 + k * 0.3) % (Math.PI * 2), Math.PI * 1.6 + t); ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
      break
    }
    case "null_void": {
      // Purple void: floating rock islands, a green rift glow, flickering bolts.
      const glow = ctx.createRadialGradient(worldWidth * 0.5, groundY - 200, 20, worldWidth * 0.5, groundY - 200, 360)
      glow.addColorStop(0, "rgba(34,211,238,0.4)"); glow.addColorStop(1, "transparent")
      ctx.fillStyle = glow; ctx.fillRect(0, 0, worldWidth, groundY)
      ctx.fillStyle = "#3b1d63"
      for (const [ix, iy, iw] of [[worldWidth * 0.18, groundY - 260, 220], [worldWidth * 0.62, groundY - 320, 180], [worldWidth * 0.85, groundY - 200, 140]]) {
        ctx.beginPath(); ctx.moveTo(ix, iy); ctx.lineTo(ix + iw, iy); ctx.lineTo(ix + iw * 0.7, iy + 70); ctx.lineTo(ix + iw * 0.3, iy + 60); ctx.closePath(); ctx.fill()
        ctx.fillStyle = "#4c1d95"; ctx.fillRect(ix + iw * 0.2, iy - 16, iw * 0.6, 16); ctx.fillStyle = "#3b1d63"
      }
      if (Math.sin(t * 6) > 0.6) {
        ctx.strokeStyle = "rgba(34,211,238,0.8)"; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(worldWidth * 0.5, 40)
        ctx.lineTo(worldWidth * 0.46, groundY * 0.4); ctx.lineTo(worldWidth * 0.54, groundY * 0.55); ctx.lineTo(worldWidth * 0.48, groundY - 180); ctx.stroke()
      }
      break
    }
    case "shadow_garden": {
      // Gothic pillars in mist with drifting red rose petals.
      ctx.fillStyle = "rgba(30,20,45,0.7)"
      for (let i = 0; i < 6; i++) {
        const px = worldWidth * (0.08 + i * 0.17)
        ctx.fillRect(px, groundY - 280, 46, 280)
        ctx.fillRect(px - 12, groundY - 280, 70, 18)
        ctx.fillRect(px - 12, groundY - 30, 70, 18)
      }
      ctx.fillStyle = "rgba(124,58,237,0.12)"; ctx.fillRect(0, groundY - 120, worldWidth, 120)
      ctx.fillStyle = "rgba(239,68,68,0.7)"
      for (let i = 0; i < 14; i++) {
        const rx = (i * worldWidth / 14 + t * 30) % worldWidth
        const ry = (groundY - 260 + ((i * 80 + t * 40) % 240))
        ctx.beginPath(); ctx.arc(rx, ry, 4, 0, Math.PI * 2); ctx.fill()
      }
      break
    }
    default:
      ctx.restore()
      return false
  }

  ctx.restore()
  return true
}

// Records the world-y span the stage backdrop actually covered on the last draw (top→bottom). The
// fullscreen-centering probe reads it to confirm the drawn stage is balanced within the camera view.
export const lastBattleBgRect = { top: 0, bottom: 0 }

export function drawBattleBackground(ctx, canvas, stage = {}, groundY = 600, floorHeight = 120, coverY = null) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const parsedWorldWidth = Number(stage?.worldWidth)
  const worldWidth       = Number.isFinite(parsedWorldWidth) ? Math.max(parsedWorldWidth, w) : w

  const sky     = stage?.sky   || "#6fb5ff"
  const mid     = stage?.mid   || "#6cb27f"
  const floor   = stage?.floor || "#4d5c41"
  const accent  = stage?.accent || "#ffffff"
  const bgImage = getStageBackgroundImage(stage)

  // The scene draws INSIDE the camera transform, and the camera — centered on the grounded fighters —
  // can see BELOW world-y=h (and above 0) on tall/large viewports. Filling only [0,h] left an undrawn
  // band at the bottom of the screen (the reported "favouring the bottom" split), growing with height.
  // Cover the FULL visible world-y span the caller passes (camera view + margin); fall back to the plain
  // [0,h] canvas band. The sky→mid→floor gradient stays anchored to [0,h] so the HORIZON never moves —
  // canvas gradients CLAMP their end colours, so a taller fill paints solid sky above 0 and solid floor
  // below h automatically. Result: the drawn stage brackets the view evenly, no gap top or bottom.
  const covTop   = Math.min(0, coverY?.top ?? 0)
  const covBot   = Math.max(h, coverY?.bottom ?? h)
  const floorExt = Math.max(floorHeight, covBot - groundY)   // extend the ground down to the view bottom
  lastBattleBgRect.top    = covTop
  lastBattleBgRect.bottom = covBot

  const bg = ctx.createLinearGradient(0, 0, 0, h)
  bg.addColorStop(0, sky)
  bg.addColorStop(0.62, mid)
  bg.addColorStop(1, floor)
  ctx.fillStyle = bg
  ctx.fillRect(0, covTop, worldWidth, covBot - covTop)

  if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
    ctx.save()
    // The photo covers its natural [0,h] band; the extended gradient fill above/below already painted
    // solid sky / floor into the margins, so the image never leaves a gap.
    ctx.drawImage(bgImage, 0, 0, worldWidth, h)
    const overlay = ctx.createLinearGradient(0, 0, 0, h)
    overlay.addColorStop(0, "rgba(255,255,255,0.04)")
    overlay.addColorStop(0.55, "rgba(0,0,0,0.08)")
    overlay.addColorStop(1, "rgba(0,0,0,0.18)")
    ctx.fillStyle = overlay
    ctx.fillRect(0, 0, worldWidth, h)
    ctx.restore()
  }

  // Per-stage procedural landmarks (skyline/landmarks). Skipped when a real
  // background image is present; falls back to a generic mountain silhouette.
  const drewLandmark = (bgImage && bgImage.complete && bgImage.naturalWidth > 0)
    ? true
    : drawStageLandmarks(ctx, stage, worldWidth, groundY, h, accent)

  if (!drewLandmark) {
    ctx.save()
    ctx.globalAlpha = 0.18
    ctx.fillStyle   = "rgba(20,30,50,0.55)"
    ctx.beginPath()
    ctx.moveTo(-60, groundY - 180)
    ctx.lineTo(worldWidth * 0.18, groundY - 280)
    ctx.lineTo(worldWidth * 0.36, groundY - 190)
    ctx.lineTo(worldWidth * 0.56, groundY - 310)
    ctx.lineTo(worldWidth * 0.76, groundY - 210)
    ctx.lineTo(worldWidth + 80,   groundY - 290)
    ctx.lineTo(worldWidth + 80,   groundY)
    ctx.lineTo(-60, groundY)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }

  ctx.fillStyle = "rgba(255,255,255,0.08)"
  ctx.fillRect(0, groundY - 20, worldWidth, 10)

  // Ground slab + shade extend to the bottom of the visible view (floorExt), so the floor reads as solid
  // continuous ground under the fighters instead of ending in a hard line partway down a tall screen.
  ctx.fillStyle = floor
  ctx.fillRect(0, groundY, worldWidth, floorExt)
  ctx.fillStyle = "rgba(0,0,0,0.10)"
  ctx.fillRect(0, groundY + 30, worldWidth, Math.max(0, floorExt - 30))

  if (stage?.name) {
    drawPanel(ctx, 22, 22, 250, 44, {
      radius: 14, fill: "rgba(0,0,0,0.35)", stroke: "rgba(255,255,255,0.14)", lineWidth: 1
    })
    drawCenteredText(ctx, stage.name, 147, 44, { font: "700 16px Arial", fill: accent })
  }
}

// ─────────────────────────────────────────────
// FIGHTER / EFFECTS / PROJECTILES
// ─────────────────────────────────────────────
export function drawFighter(ctx, fighter, camera = null) {
  if (!fighter) return
  drawCharacter(ctx, fighter)
}

// Lazy image cache for OPTIONAL projectile sprite sheets (Task 3 seam).
const _projImgCache = new Map()
function _projImg(src) {
  if (!src) return null
  let img = _projImgCache.get(src)
  if (!img) { img = new Image(); img.src = src; _projImgCache.set(src, img) }
  return img
}

export function drawProjectiles(ctx, projectiles = [], camera = null) {
  if (!Array.isArray(projectiles)) return
  projectiles.forEach(p => {
    const x = p.x ?? 0
    const y = p.y ?? 0

    // OPTIONAL SPRITE HOOK (Task 3): if the projectile carries a `sheet` (a
    // horizontal strip of `spriteFrames` cells of `spriteW`×`spriteH`), draw the
    // animated sprite, flipped to its travel direction. Until art is dropped in,
    // `sheet` is null and the colored shape below renders unchanged.
    const img = p.sheet ? _projImg(p.sheet) : null
    if (img && img.complete && img.naturalWidth > 0) {
      const frames = p.spriteFrames || 1
      const fw = p.spriteW || (img.naturalWidth / frames)
      const fh = p.spriteH || img.naturalHeight
      p._animT = (p._animT || 0) + 1
      const fi = Math.floor(p._animT / (p.spriteSpeed || 4)) % frames
      const scale = p.spriteScale || 1
      const dw = fw * scale, dh = fh * scale
      const dir = (p.vx || 0) < 0 ? -1 : 1
      ctx.save()
      ctx.translate(x, y)
      ctx.scale(dir, 1)
      ctx.drawImage(img, fi * fw, 0, fw, fh, -dw / 2, -dh / 2, dw, dh)
      ctx.restore()
      return
    }

    // ── TEMPORARY PLACEHOLDER FX (Tobirama Stage 4) — pending real effect/projectile art. ──
    // Gated on p.drawKind so it has ZERO effect on any other projectile. A real sprite dropped
    // into p.sheet later takes precedence (the sprite hook above) → clean drop-in swap, no rewrite.
    // water = translucent cyan roiling blobs + trailing droplets; dark = indigo swirl; waterwall =
    // a wobbling vertical water column/barrier.
    if (p.drawKind) {
      const t = (p._fxT = (p._fxT || 0) + 1)
      ctx.save()
      if (p.drawKind === "water" || p.drawKind === "dark") {
        const water = p.drawKind === "water"
        const rgb = water ? "56,189,248" : "124,58,237"
        const R = Math.max(16, p.radius || 20)
        ctx.shadowBlur = 18; ctx.shadowColor = `rgba(${rgb},0.9)`
        for (let k = 0; k < 3; k++) {              // 3 overlapping wobbling blobs → a liquid read
          const ph = t * 0.25 + k * 2.1
          const ox = Math.cos(ph) * R * 0.28, oy = Math.sin(ph * 1.3) * R * 0.22
          const rr = R * (0.72 + 0.16 * Math.sin(ph + k))
          ctx.globalAlpha = water ? 0.45 : 0.5
          ctx.fillStyle = `rgba(${rgb},1)`
          ctx.beginPath(); ctx.arc(x + ox, y + oy, rr, 0, Math.PI * 2); ctx.fill()
        }
        ctx.globalAlpha = 0.9; ctx.shadowBlur = 0
        ctx.fillStyle = water ? "#e0f2fe" : "#ede9fe"          // bright core
        ctx.beginPath(); ctx.arc(x, y, R * 0.38, 0, Math.PI * 2); ctx.fill()
        ctx.globalAlpha = 0.7; ctx.fillStyle = `rgba(${rgb},1)`
        const dir = (p.vx || 0) < 0 ? 1 : -1                    // trailing droplets behind travel dir
        for (let k = 0; k < 4; k++) {
          const dx = dir * (R * 0.9 + k * 6), dy = Math.sin(t * 0.4 + k * 1.7) * R * 0.5
          ctx.beginPath(); ctx.arc(x + dx, y + dy, Math.max(2, R * 0.16 - k), 0, Math.PI * 2); ctx.fill()
        }
      } else if (p.drawKind === "heatvision") {
        // Superman HEAT VISION — twin horizontal eye-beams (upper + lower) with a hot core + red-orange
        // glow, flickering as they streak. Beam extends along travel (horizontal); collision uses w/h.
        const w = p.w || 46, h = p.h || 14
        const beamCol = p.color || "#ff3a1a"   // red heat vision, or gold when Solar-Flare-enhanced
        const flick = 0.82 + 0.18 * Math.sin(t * 0.9)
        ctx.shadowBlur = 14; ctx.shadowColor = beamCol
        ctx.globalAlpha = flick
        for (const off of [-h * 0.22, h * 0.22]) {
          ctx.fillStyle = beamCol;   ctx.fillRect(x - w / 2, y + off - 2, w, 4)   // beam body
          ctx.fillStyle = "#ffe4b0"; ctx.fillRect(x - w / 2, y + off - 1, w, 2)   // hot white-orange core
        }
        ctx.shadowBlur = 0
      } else if (p.drawKind === "waterwall") {
        const w = p.w || 34, h = p.h || 120
        ctx.shadowBlur = 16; ctx.shadowColor = "rgba(56,189,248,0.8)"
        ctx.globalAlpha = 0.42; ctx.fillStyle = "#38bdf8"
        ctx.beginPath(); ctx.moveTo(x - w / 2, y - h / 2)      // wobbling column edges
        for (let yy = -h / 2; yy <= h / 2; yy += 8) ctx.lineTo(x - w / 2 + Math.sin(t * 0.3 + yy * 0.08) * 4, y + yy)
        for (let yy = h / 2; yy >= -h / 2; yy -= 8) ctx.lineTo(x + w / 2 + Math.sin(t * 0.3 + yy * 0.08 + 1) * 4, y + yy)
        ctx.closePath(); ctx.fill()
        ctx.globalAlpha = 0.75; ctx.fillStyle = "#e0f2fe"
        ctx.fillRect(x - 2, y - h / 2, 4, h)                    // bright center seam
      }
      ctx.restore()
      return
    }

    // FALLBACK: procedural energy orb. Drawn as an outer glow + colored body +
    // bright white core + dark outline so it reads clearly on ANY background
    // (the plain single-arc version could wash out — Task 2 visibility). The
    // draw size has a floor so small orbs (e.g. Gojo Blue, r≈9) still register;
    // collision still uses the data radius, so hitboxes are unchanged.
    const size  = Math.max(13, p.radius || p.size || 12)
    const color = p.color || "#ffd166"
    ctx.save()
    ctx.shadowBlur  = 24
    ctx.shadowColor = color
    ctx.fillStyle   = color
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fill()
    ctx.shadowBlur = 0
    ctx.globalAlpha = 0.9
    ctx.fillStyle = "#ffffff"
    ctx.beginPath(); ctx.arc(x, y, size * 0.42, 0, Math.PI * 2); ctx.fill()
    ctx.globalAlpha = 1
    ctx.lineWidth = 2
    ctx.strokeStyle = "rgba(0,0,0,0.35)"
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.stroke()
    ctx.restore()
  })
}

export function drawHitSparks(ctx, hitSparks = [], camera = null) {
  if (!Array.isArray(hitSparks) || !hitSparks.length) return

  for (const spark of hitSparks) {
    const { x, y, category = "light", color, timer, maxTimer, lines, radius } = spark
    const mt    = maxTimer || timer || 10
    const alpha = Math.min(1, timer / Math.max(1, mt))
    const c     = color || "#fff1a8"
    const n     = lines  || _defaultLines(category)
    const r     = radius || _defaultRadius(category)

    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = c
    ctx.lineWidth   = category === "ultimate" ? 4 : category === "clash" ? 3 : category === "special" ? 3 : 2
    if (category !== "light") { ctx.shadowBlur = 10; ctx.shadowColor = c }

    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n
      const len   = r * (0.65 + (i % 3) * 0.18)
      ctx.beginPath()
      ctx.moveTo(x, y)
      ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len)
      ctx.stroke()
    }
    ctx.shadowBlur = 0

    if (category !== "light") {
      ctx.fillStyle = c + "44"
      ctx.beginPath(); ctx.arc(x, y, r * 0.32, 0, Math.PI * 2); ctx.fill()
    }

    if (category === "ultimate" || category === "clash") {
      const ringR = r * 0.4 + r * 1.6 * (1 - alpha)
      ctx.strokeStyle = c + "55"; ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2); ctx.stroke()
    }

    if (category === "parry") {
      ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(x, y, r * (0.4 + 0.6 * (1 - alpha)), 0, Math.PI * 2); ctx.stroke()
    }

    ctx.restore()
  }
}

// `getHitbox(fighter)` (optional) returns the LIVE attack hitbox {x,y,w,h} or null when
// the fighter isn't attacking — so the red box tracks the real move (combat.getAttackHitbox)
// instead of the stale static fighter.attackBox. Blue = body/hurtbox (always).
export function drawTrainingCollisionBoxes(ctx, fighters = [], getHitbox = null) {
  if (!Array.isArray(fighters)) return
  fighters.forEach(fighter => {
    if (!fighter) return
    const x = fighter.x ?? 0
    const y = fighter.y ?? 0
    const w = fighter.width  ?? fighter.w ?? 80
    const h = fighter.height ?? fighter.h ?? 120

    ctx.save()
    ctx.strokeStyle = "rgba(90, 180, 255, 0.8)"   // body / hurtbox
    ctx.lineWidth   = 2
    ctx.strokeRect(x, y, w, h)

    // Live attack hitbox (only present mid-attack). Prefer the passed-in getter.
    const hb = (typeof getHitbox === "function" ? getHitbox(fighter) : null)
      || fighter.attackHitbox || null
    if (hb) {
      ctx.strokeStyle = "rgba(255, 90, 90, 0.9)"
      ctx.strokeRect(hb.x, hb.y, hb.w ?? hb.width, hb.h ?? hb.height)
    }
    ctx.restore()
  })
}

// ─────────────────────────────────────────────
// HUD — Health TOP, Energy BOTTOM
// ─────────────────────────────────────────────
export function drawHealthAndEnergyBars(ctx, p1, p2, canvas, roundWins = { p1: 0, p2: 0 }, globalFrameCount = 0) {
  const cw = canvas?.width  || window.innerWidth
  const ch = canvas?.height || window.innerHeight

  function clamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)) }

  function rrect(ctx, x, y, w, h, r = 6) {
    r = Math.min(r, w / 2, h / 2)
    ctx.beginPath()
    ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
    ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
    ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
    ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y)
    ctx.closePath()
  }

  const barW  = clamp(cw * 0.28, 220, 420)
  const barH  = 20
  const enH   = 13
  const pad   = 14
  const hpY   = pad

  function hpColor(ratio) {
    if (ratio > 0.5) return "#22c55e"
    if (ratio > 0.25) return "#f59e0b"
    return "#ef4444"
  }

  function drawHealthPanel(x, flip, fighter) {
    if (!fighter) return
    const maxHp = Math.max(1, fighter.maxHealth || 100)
    const ratio = clamp((fighter.health ?? maxHp) / maxHp, 0, 1)

    ctx.fillStyle = "rgba(0,0,0,0.55)"
    rrect(ctx, x, hpY, barW + 20, barH + 26, 10); ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1
    rrect(ctx, x, hpY, barW + 20, barH + 26, 10); ctx.stroke()

    const nameX = flip ? x + barW + 12 : x + 8
    const nameAlign = flip ? "right" : "left"
    const nameColor = flip ? "#fca5a5" : "#7dd3fc"
    ctx.font = "bold 11px Arial"; ctx.textAlign = nameAlign; ctx.textBaseline = "alphabetic"
    ctx.fillStyle = nameColor
    ctx.fillText(fighter.name || (flip ? "P2" : "P1"), nameX, hpY + 12)

    ctx.fillStyle = "rgba(255,255,255,0.1)"
    rrect(ctx, x + 8, hpY + 14, barW, barH, 5); ctx.fill()

    const fillW = barW * ratio
    const fillX = flip ? x + 8 + barW - fillW : x + 8
    ctx.fillStyle = hpColor(ratio)
    rrect(ctx, fillX, hpY + 14, fillW, barH, 5); ctx.fill()

    // BREAK-STOCK PIPS (universal combo-break resource): a small "BREAK" label + N pips in the panel's
    // bottom strip — filled = a break available this round, hollow = spent. Drawn for EVERY fighter
    // (including the meterless ones with no energy panel), so the resource is always visible.
    const stotal = COMBO_BREAKER.stocksPerRound
    const sleft  = Math.max(0, Math.min(stotal, fighter.comboBreakStocks ?? stotal))
    const pipY   = hpY + 14 + barH + 7
    const pipGap = 9, pipR = 3
    ctx.textBaseline = "middle"; ctx.textAlign = flip ? "right" : "left"
    ctx.font = "700 8px Arial"; ctx.fillStyle = "rgba(251,191,36,0.85)"
    const edge = flip ? x + barW + 12 : x + 8
    ctx.fillText("BREAK", edge, pipY)
    for (let i = 0; i < stotal; i++) {
      const pipX = flip ? edge - 38 - i * pipGap : edge + 38 + i * pipGap
      ctx.beginPath(); ctx.arc(pipX, pipY, pipR, 0, Math.PI * 2)
      ctx.fillStyle = i < sleft ? "#fbbf24" : "rgba(255,255,255,0.14)"; ctx.fill()
      ctx.strokeStyle = "rgba(0,0,0,0.45)"; ctx.lineWidth = 1; ctx.stroke()
    }
    ctx.textBaseline = "alphabetic"
  }

  // BOSS HUD variant (Stage 20): when a fighter is an arcade boss, the human player keeps a normal
  // panel and the boss gets a single wide, red, center-draining bar across the top with its name —
  // replacing the standard two-portrait layout. A branch, NOT a fork of the HUD.
  const boss = (p2 && p2._isBoss) ? p2 : (p1 && p1._isBoss) ? p1 : null
  function drawBossBar(fighter) {
    const maxHp = Math.max(1, fighter.maxHealth || 100)
    const ratio = clamp((fighter.health ?? maxHp) / maxHp, 0, 1)
    const wBar = clamp(cw * 0.52, 360, 800), x = (cw - wBar) / 2, y = hpY + 8, h = 24
    ctx.font = "800 20px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"
    ctx.shadowBlur = 8; ctx.shadowColor = "rgba(0,0,0,0.75)"; ctx.fillStyle = "#ffd0d0"
    ctx.fillText((fighter.name || "BOSS").toUpperCase(), cw / 2, y - 8); ctx.shadowBlur = 0
    ctx.fillStyle = "rgba(0,0,0,0.62)"; rrect(ctx, x - 5, y - 5, wBar + 10, h + 10, 9); ctx.fill()
    ctx.strokeStyle = "rgba(255,80,80,0.6)"; ctx.lineWidth = 2; rrect(ctx, x - 5, y - 5, wBar + 10, h + 10, 9); ctx.stroke()
    ctx.fillStyle = "rgba(255,255,255,0.10)"; rrect(ctx, x, y, wBar, h, 6); ctx.fill()
    const fillW = wBar * ratio, grad = ctx.createLinearGradient(x, 0, x + wBar, 0)
    grad.addColorStop(0, "#7f1d1d"); grad.addColorStop(0.5, "#ef4444"); grad.addColorStop(1, "#7f1d1d")
    ctx.fillStyle = grad; rrect(ctx, x + (wBar - fillW) / 2, y, fillW, h, 6); ctx.fill()   // center-out drain
    ctx.font = "700 10px Arial"; ctx.fillStyle = "#ff6b6b"; ctx.fillText("◆ BOSS ◆", cw / 2, y + h + 14)
  }
  if (boss) {
    drawHealthPanel(pad, false, boss === p2 ? p1 : p2)   // the human player, on the left
    drawBossBar(boss)
  } else {
    drawHealthPanel(pad, false, p1)
    drawHealthPanel(cw - pad - barW - 20, true,  p2)
  }

  const pipCX = cw / 2, pipY = hpY + 22, pipR = 7, pipGap = 20, maxWins = 2
  for (let i = 0; !boss && i < maxWins; i++) {   // boss fights are a single round → no round pips
    const px1 = pipCX - pipGap - pipR - i * (pipR * 2 + 5)
    ctx.beginPath(); ctx.arc(px1, pipY, pipR, 0, Math.PI*2)
    const p1Won = i < (roundWins?.p1 || 0)
    ctx.fillStyle = p1Won ? "#7dd3fc" : "rgba(255,255,255,0.10)"; ctx.fill()
    if (p1Won) { ctx.shadowBlur=10; ctx.shadowColor="#7dd3fc"; ctx.strokeStyle="#bae6fd"; ctx.lineWidth=1.5; ctx.stroke(); ctx.shadowBlur=0 }

    const px2 = pipCX + pipGap + pipR + i * (pipR * 2 + 5)
    ctx.beginPath(); ctx.arc(px2, pipY, pipR, 0, Math.PI*2)
    const p2Won = i < (roundWins?.p2 || 0)
    ctx.fillStyle = p2Won ? "#fca5a5" : "rgba(255,255,255,0.10)"; ctx.fill()
    if (p2Won) { ctx.shadowBlur=10; ctx.shadowColor="#fca5a5"; ctx.strokeStyle="#fecaca"; ctx.lineWidth=1.5; ctx.stroke(); ctx.shadowBlur=0 }
  }
  if (!boss) {
    ctx.font="bold 12px Arial"; ctx.textAlign="center"; ctx.textBaseline="middle"; ctx.fillStyle="rgba(255,255,255,0.5)"
    ctx.fillText(`RD ${(roundWins?.p1||0)+(roundWins?.p2||0)+1}`, pipCX, pipY)
  }

  const enY = ch - enH - pad - 14

  function drawEnergyPanel(x, flip, fighter) {
    if (!fighter) return
    // Maki Zenin: the ONLY roster character with no resource meter at all — not
    // even a "no-meter flavor" label (Toji/Shinobu draw an empty flavored bar).
    // Skip the entire panel → she renders HP-only, distinct from every other UI.
    if (fighter.traits?.hideResourceMeter) return
    const ec      = fighter.energyConfig || {}
    // Universe-specific energy resource name. Precedence: an explicit energyConfig.label (Rick's
    // "Bullshit Science Energy") wins; otherwise derive the flavor name from the character's
    // traits.energyType (the existing per-character field) via ENERGY_TYPE_LABELS; else generic.
    // Ben/Albedo are relabeled to OMNITRIX/ULTIMATRIX by the transform-device block below.
    let   label   = resolveEnergyLabel(fighter)
    let   mainCol = ec.color   || "#38bdf8"
    const emptyC  = ec.emptyColor || "rgba(255,255,255,0.08)"
    let   glowC   = ec.glowColor  || mainCol
    const hasEnergy = (fighter.maxEnergy || 0) > 0 && ec.regenRate !== "none"
    const flavor    = noMeterFlavor(fighter)   // "HEAVENLY RESTRICTION" (JJK) / "TOTAL CONCENTRATION" (Demon Slayer) / null

    // Transform device (Ben/Albedo): this meter IS the drain gauge. Relabel and
    // recolor it to read as the Omnitrix/Ultimatrix, and reflect its 3 live
    // states — transformed (draining), CHARGING (refilling, vulnerable), and the
    // forced-revert RECHARGE lockout while human.
    const isDevice = fighter.rosterKey === "ben10" || fighter.rosterKey === "albedo"
    const charging = isDevice && !!fighter.isCharging
    const reverted = isDevice && fighter.transformed === false
    if (isDevice) {
      const albedo = fighter.rosterKey === "albedo"
      mainCol = albedo ? "#ef4444" : "#22c55e"
      glowC   = mainCol
      label   = charging ? "CHARGING"
              : reverted ? "RECHARGE"
              : (albedo ? "ULTIMATRIX" : "OMNITRIX")
      if (reverted) mainCol = "#f59e0b"   // amber while locked out in human form
    }

    ctx.fillStyle = "rgba(0,0,0,0.52)"
    rrect(ctx, x, enY - 14, barW + 20, enH + 22, 8); ctx.fill()
    ctx.strokeStyle = "rgba(255,255,255,0.10)"; ctx.lineWidth = 1
    rrect(ctx, x, enY - 14, barW + 20, enH + 22, 8); ctx.stroke()

    const labelX = flip ? x + barW + 12 : x + 8
    const labelAlign = flip ? "right" : "left"
    ctx.font = "bold 9px Arial"; ctx.textAlign = labelAlign; ctx.textBaseline = "alphabetic"

    if (flavor) {
      ctx.fillStyle = "rgba(107,114,128,0.6)"
      ctx.fillText(flavor, labelX, enY - 2)
      ctx.fillStyle = "#111827"
      rrect(ctx, x + 8, enY, barW, enH, 4); ctx.fill()
      return
    }

    ctx.fillStyle = (ec.color || "#38bdf8") + "bb"
    // Ultimate-cooldown hint (optional): while the universal recast lockout ticks,
    // append "· ULT Ns" to the meter label so ULT-not-ready is visible even at full meter.
    const ultCd = (fighter.ultimateCooldown || 0) > 0 ? `  · ULT ${Math.ceil(fighter.ultimateCooldown / 60)}s` : ""
    ctx.fillText(label + ultCd, labelX, enY - 2)

    if (!hasEnergy) return

    const maxEn  = Math.max(1, fighter.maxEnergy || 100)
    // Naruto's chakra is ONE shared pool (fighter.energy is the single source of
    // truth) split evenly across live bodies (him + clones). Spawning a clone
    // spends NOTHING — it only DIVIDES the displayed share, so the bar drops to
    // the per-body split (½ with 1 clone, ⅓ with 2, ¼ with 3) with NO net pool
    // loss. Chakra is permanently lost only when a clone is DESTROYED
    // (summons.loseCloneShare shrinks the pool). Mirrors spendNarutoChakra's
    // gate (usable share = energy / bodies), so the bar shows what you can spend.
    const bodies = fighter.rosterKey === "naruto" ? 1 + countShadowClones(fighter) : 1
    const ratio  = clamp((fighter.energy || 0) / (maxEn * bodies), 0, 1)
    const isCrit = ratio < 0.15
    const isHigh = ratio > 0.80

    ctx.fillStyle = emptyC
    rrect(ctx, x + 8, enY, barW, enH, 4); ctx.fill()

    let fillColor = mainCol
    if (isCrit) {
      const pulse = Math.sin(globalFrameCount * 0.2) * 0.5 + 0.5
      fillColor = _lerpHex(mainCol, emptyC, pulse * 0.5)
    }

    if (isHigh) {
      ctx.shadowBlur  = 8
      ctx.shadowColor = glowC
    }

    // CHARGING: bright pulsing fill + strong glow so the refill (and its
    // can't-defend vulnerability window) is unmistakable.
    if (charging) {
      const pulse = Math.sin(globalFrameCount * 0.4) * 0.5 + 0.5
      fillColor = _lerpHex(mainCol, "#ffffff", 0.35 + pulse * 0.45)
      ctx.shadowBlur  = 14
      ctx.shadowColor = glowC
    }

    const fillW = barW * ratio
    const fillX = flip ? x + 8 + barW - fillW : x + 8
    ctx.fillStyle = fillColor
    rrect(ctx, fillX, enY, fillW, enH, 4); ctx.fill()
    ctx.shadowBlur = 0

    // Device: notch at the minimum energy needed to (re)transform (mirrors
    // fighters.js TRANSFORM_ENERGY.MIN_TRANSFORM_ENERGY = 15 of 100), so the
    // player can see when a forced-reverted fighter may transform again.
    if (isDevice) {
      const notch = 0.15
      const nx = flip ? x + 8 + barW - barW * notch : x + 8 + barW * notch
      ctx.strokeStyle = reverted ? "#fde047" : "rgba(255,255,255,0.5)"
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(nx, enY - 1); ctx.lineTo(nx, enY + enH + 1); ctx.stroke()
    }

    // MINATO — Flying Raijin teleport-mark indicator: 3 pips on the chakra-bar label line, anchored
    // to the side OPPOSITE the resource label (which sits on the flip side). Filled yellow = a placed
    // mark; hollow = empty slot; the SELECTED mark's pip gets a white ring (cycled by a Charge-tap).
    // Always shown for Minato so the mechanic is discoverable even with 0 marks.
    if ((fighter.rosterKey || "").toLowerCase() === "minato") {
      const marks = fighter._frMarks || []
      const selm  = Math.min(Math.max(fighter._frSel || 0, 0), 2)
      const pipR = 3.5, gap = 12, py = enY - 5
      // p1 (label left) → pips near the RIGHT of the bar; p2 (label right) → pips near the LEFT.
      const startX = flip ? x + 14 : x + 8 + barW - 2 * gap
      ctx.save(); ctx.textBaseline = "middle"; ctx.textAlign = "left"
      ctx.font = "bold 8px Arial"; ctx.fillStyle = "#fde047"
      ctx.fillText("⚡", startX - 12, py)
      for (let i = 0; i < 3; i++) {
        const cx = startX + i * gap
        const placed = i < marks.length
        ctx.beginPath(); ctx.arc(cx, py, pipR, 0, Math.PI * 2)
        if (placed) { ctx.fillStyle = "#fde047"; ctx.fill() }
        else { ctx.strokeStyle = "rgba(253,224,71,0.45)"; ctx.lineWidth = 1.5; ctx.stroke() }
        if (placed && i === selm) { ctx.beginPath(); ctx.arc(cx, py, pipR + 2.5, 0, Math.PI * 2); ctx.strokeStyle = "#ffffff"; ctx.lineWidth = 1.5; ctx.stroke() }
      }
      ctx.restore()
    }

    // CHROLLO — Bandit's Echo mark badge (Stage 2). When a special/ultimate has landed on Chrollo, its
    // exact move is "marked" (copyable, single-use) — show a purple badge with the source name + tier so
    // the player knows an Echo is armed and WHICH move it will fire. Independent of Skill Hunter's HUD.
    // Sits above the resource bar, anchored toward the label side (mirrors Minato's pip placement logic).
    if ((fighter.rosterKey || "").toLowerCase() === "chrollo" && fighter._beMark) {
      const m = fighter._beMark
      const label = `◈ ECHO: ${m.displayName || m.rosterKey} ${m.isUltimate ? "ULT" : "SP"}`
      ctx.save()
      ctx.font = "bold 10px Arial"; ctx.textBaseline = "middle"
      const tw = ctx.measureText(label).width
      const bw = tw + 14, bh = 16, by = enY - bh - 6
      const bx = flip ? x + barW + 20 - bw : x
      rrect(ctx, bx, by, bw, bh, 5)
      ctx.fillStyle = "rgba(74,46,92,0.85)"; ctx.fill()                 // Chrollo Phantom-Troupe purple
      ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.2; ctx.stroke()
      ctx.shadowBlur = 8; ctx.shadowColor = "#a855f7"
      ctx.strokeStyle = "#c084fc"; ctx.lineWidth = 1.2; rrect(ctx, bx, by, bw, bh, 5); ctx.stroke()
      ctx.shadowBlur = 0
      ctx.textAlign = "left"; ctx.fillStyle = "#f5e9ff"
      ctx.fillText(label, bx + 7, by + bh / 2 + 0.5)
      ctx.restore()
    }
  }

  // Boss has infinite meter → its energy panel is meaningless; the human player keeps theirs.
  if (boss) { drawEnergyPanel(pad, false, boss === p2 ? p1 : p2) }
  else { drawEnergyPanel(pad, false, p1); drawEnergyPanel(cw - pad - barW - 20, true, p2) }
}

// Simple hex color lerp helper
function _lerpHex(a, b, t) {
  try {
    const pr = (hex) => {
      const n = hex.replace("#","")
      if (n.length < 6) return [128,128,128]
      return [parseInt(n.slice(0,2),16),parseInt(n.slice(2,4),16),parseInt(n.slice(4,6),16)]
    }
    const [ar,ag,ab] = pr(a), [br,bg,bb] = pr(b)
    const r = Math.round(ar+(br-ar)*t), g = Math.round(ag+(bg-ag)*t), bv = Math.round(ab+(bb-ab)*t)
    return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${bv.toString(16).padStart(2,"0")}`
  } catch (_) { return a }
}

function _defaultLines(cat) {
  if (cat === "ultimate" || cat === "clash") return 16
  if (cat === "special" || cat === "parry")  return 10
  if (cat === "heavy")  return 8
  return 6
}

function _defaultRadius(cat) {
  if (cat === "ultimate" || cat === "clash") return 40
  if (cat === "special" || cat === "parry")  return 28
  if (cat === "heavy")   return 22
  return 14
}

// ─────────────────────────────────────────────
// CONTROLS INFO (bottom-left)
// ─────────────────────────────────────────────
export function drawControlsInfo(ctx, canvas) {
  const { height: h } = getCanvasSize(canvas)

  const panelY = h - 170
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.45)"
  ctx.fillRect(18, panelY, 310, 110)
  ctx.strokeStyle = "rgba(255,255,255,0.18)"
  ctx.strokeRect(18, panelY, 310, 110)

  ctx.fillStyle   = "#ffffff"
  ctx.font        = "700 14px Arial"
  ctx.textAlign   = "left"
  ctx.fillText("Controls", 32, panelY + 22)

  ctx.font      = "12px Arial"
  ctx.fillStyle = "rgba(255,255,255,0.82)"
  ctx.fillText("Move: A/D   Jump/Up: W   Crouch: S   Block: ;", 32, panelY + 42)
  ctx.fillText("Light: J   Heavy: K   Special: L   Ultimate: U", 32, panelY + 58)
  ctx.fillText("Grab: O   Charge: P   Dash: double-tap A/D", 32, panelY + 74)
  ctx.fillText("Specials are directional — hold a dir + L", 32, panelY + 90)
  ctx.restore()
}

// ─────────────────────────────────────────────
// COUNTDOWN
// ─────────────────────────────────────────────
export function drawCountdown(ctx, canvas, countdown = 0) {
  if (countdown <= 0) return
  const { width: w, height: h } = getCanvasSize(canvas)
  const seconds = Math.ceil(countdown / 60)
  ctx.save()
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.font         = "900 96px Arial"
  ctx.fillStyle    = "rgba(255,255,255,0.95)"
  ctx.shadowBlur   = 24
  ctx.shadowColor  = "rgba(120,170,255,0.42)"
  ctx.fillText(String(seconds), w / 2, h / 2)
  ctx.restore()
}

// ─────────────────────────────────────────────
// TRAINING OVERLAY (top-left, below health bar)
// ─────────────────────────────────────────────
export function drawTrainingOverlay(ctx, canvas, info = {}) {
  const { width: w } = getCanvasSize(canvas)

  const fd = info.frameData
  const fdLine = fd
    ? `${fd.who} ${fd.name}: ${fd.startup}/${fd.active}/${fd.recovery}  [${fd.phase} ${fd.elapsed}/${fd.total}]`
    : "Move: —  (start/active/recovery)"

  const lines = [
    "Training Mode",
    `Combo: ${info.combo ?? 0}    Last Dmg: ${info.damage ?? 0}`,
    fdLine,
    `Infinite HP/EN: ${info.infinite ? "ON" : "OFF"} [F3]`,
    `Dummy: ${info.dummy ?? "stand"} [F4]    Reset [F2]`,
    ...(info.callInMult != null ? [`Call-In Mult: ${info.callInMult.toFixed(2)}   [ lower / ] raise`] : []),
    `Frame: ${info.frame ?? 0}`
  ]

  const p1Inputs = Array.isArray(info.p1Inputs) ? info.p1Inputs.join(" ") : ""
  const p2Inputs = Array.isArray(info.p2Inputs) ? info.p2Inputs.join(" ") : ""

  const panelY = 70
  const panelW = 320

  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.5)"
  ctx.fillRect(16, panelY, panelW, 196)
  ctx.strokeStyle = "rgba(255,255,255,0.16)"
  ctx.strokeRect(16, panelY, panelW, 196)

  ctx.fillStyle = "#fff"
  ctx.font      = "13px Arial"
  ctx.textAlign = "left"

  lines.forEach((line, i) => {
    // Highlight the live frame-data line while a move is active.
    if (i === 2) ctx.fillStyle = fd ? "#ffe08a" : "rgba(255,255,255,0.55)"
    else ctx.fillStyle = "#fff"
    ctx.fillText(line, 28, panelY + 22 + i * 18)
  })

  if (p1Inputs) {
    ctx.fillStyle = "#7fd3ff"
    ctx.fillText(`P1: ${p1Inputs}`, 28, panelY + 152)
  }
  if (p2Inputs) {
    ctx.fillStyle = "#ff9f9f"
    ctx.fillText(`P2: ${p2Inputs}`, 28, panelY + 170)
  }
  if (Array.isArray(info.history) && info.history.length && w >= 980) {
    ctx.fillStyle = "rgba(255,255,255,0.75)"
    ctx.fillText(`Last: ${info.history[0]?.display || "Neutral"}`, 28, panelY + 188)
  }

  ctx.restore()
}

// ─────────────────────────────────────────────
// ROUND BREAK / MATCH END
// ─────────────────────────────────────────────
export function drawRoundBreak(ctx, canvas, winnerText = "ROUND BREAK") {
  const { width: w, height: h } = getCanvasSize(canvas)
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.42)"
  ctx.fillRect(0, 0, w, h)
  drawPanel(ctx, w / 2 - 240, h / 2 - 90, 480, 180, {
    radius: 22, fill: "rgba(8,12,28,0.78)", stroke: "rgba(255,255,255,0.16)", lineWidth: 2
  })
  drawCenteredText(ctx, winnerText,              w / 2, h / 2 - 10, { font: "800 42px Arial", fill: "#ffffff" })
  drawSubText(ctx, "Prepare for the next round", w / 2, h / 2 + 42, { font: "18px Arial" })
  ctx.restore()
}

export function drawMatchEnd(ctx, canvas, winnerText = "MATCH OVER") {
  const { width: w, height: h } = getCanvasSize(canvas)
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.52)"
  ctx.fillRect(0, 0, w, h)
  drawPanel(ctx, w / 2 - 280, h / 2 - 110, 560, 220, {
    radius: 24, fill: "rgba(8,12,28,0.82)", stroke: "rgba(255,255,255,0.18)", lineWidth: 2
  })
  drawCenteredText(ctx, winnerText,                           w / 2, h / 2 - 18, { font: "900 46px Arial", fill: "#ffffff" })
  drawSubText(ctx, "Click or press Enter to return to title", w / 2, h / 2 + 42, { font: "18px Arial", fill: "rgba(220,230,255,0.80)" })
  ctx.restore()
}

// ─────────────────────────────────────────────────────────────────
// NEW — PAUSE MENU
// Call drawPauseMenu(ctx, canvas, selectedIndex) from game.js
// when gameState === "paused"
// ─────────────────────────────────────────────────────────────────
export function drawPauseMenu(ctx, canvas, selectedIndex = 0) {
  const cw = canvas?.width  || window.innerWidth
  const ch = canvas?.height || window.innerHeight

  ctx.fillStyle = "rgba(0,0,0,0.62)"
  ctx.fillRect(0, 0, cw, ch)

  const panelW = 380
  const panelH = 392   // fits 4 items (resume / restart / training / quit)
  const panelX = cw / 2 - panelW / 2
  const panelY = ch / 2 - panelH / 2

  ctx.fillStyle   = "rgba(8,14,30,0.94)"
  ctx.strokeStyle = "rgba(255,255,255,0.18)"
  ctx.lineWidth   = 2
  _roundRectPath(ctx, panelX, panelY, panelW, panelH, 20)
  ctx.fill()
  ctx.stroke()

  ctx.font         = "900 28px Arial"
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle    = "#f1f5f9"
  ctx.shadowBlur   = 14
  ctx.shadowColor  = "rgba(120,170,255,0.4)"
  ctx.fillText("PAUSED", cw / 2, panelY + 44)
  ctx.shadowBlur   = 0

  ctx.strokeStyle = "rgba(255,255,255,0.12)"
  ctx.lineWidth   = 1
  ctx.beginPath()
  ctx.moveTo(panelX + 32, panelY + 68)
  ctx.lineTo(panelX + panelW - 32, panelY + 68)
  ctx.stroke()

  const items = [
    { label: "Resume",        sub: "Continue the match" },
    { label: "Restart Round", sub: "Reset this round" },
    { label: "Training Mode", sub: "Practice vs a frozen dummy" },
    { label: "Quit to Menu",  sub: "Return to the title screen" }
  ]

  const itemH   = 58
  const itemGap = 10
  const startY  = panelY + 88

  items.forEach((item, i) => {
    const iy     = startY + i * (itemH + itemGap)
    const active = i === selectedIndex
    const ix     = panelX + 24
    const iw     = panelW - 48

    ctx.fillStyle = active
      ? "rgba(59,130,246,0.28)"
      : "rgba(255,255,255,0.05)"
    _roundRectPath(ctx, ix, iy, iw, itemH, 12)
    ctx.fill()

    ctx.strokeStyle = active ? "#93c5fd" : "rgba(255,255,255,0.14)"
    ctx.lineWidth   = active ? 2 : 1
    _roundRectPath(ctx, ix, iy, iw, itemH, 12)
    ctx.stroke()

    if (active) {
      ctx.save()
      ctx.shadowBlur  = 18
      ctx.shadowColor = "#3b82f6"
      _roundRectPath(ctx, ix, iy, iw, itemH, 12)
      ctx.stroke()
      ctx.restore()
    }

    ctx.font      = "700 18px Arial"
    ctx.textAlign = "center"
    ctx.fillStyle = active ? "#f0f9ff" : "#e2e8f0"
    ctx.fillText(item.label, cw / 2, iy + itemH * 0.38)

    ctx.font      = "400 12px Arial"
    ctx.fillStyle = active ? "rgba(186,230,253,0.85)" : "rgba(200,210,230,0.55)"
    ctx.fillText(item.sub, cw / 2, iy + itemH * 0.72)
  })

  ctx.font      = "13px Arial"
  ctx.textAlign = "center"
  ctx.fillStyle = "rgba(200,210,230,0.5)"
  ctx.fillText("↑↓ / W S  to navigate   •   Enter / J to select   •   Esc to resume", cw / 2, panelY + panelH - 18)
}

function _roundRectPath(ctx, x, y, w, h, r = 10) {
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}

export const PAUSE_MENU_ITEMS = ["resume", "restartRound", "trainingMode", "quitToMenu"]

// ═════════════════════════════════════════════════════════════════════════
// TUTORIAL / HOW TO PLAY
// Key LABELS are derived from the live control map passed in (controls) so the
// page stays in sync with whatever bindings the engine actually uses — nothing
// is hardcoded as a separate string. The prose explains how the engine truly
// behaves (combined inputs like up+attack, hold-down to block, parry on heavy).
// ═════════════════════════════════════════════════════════════════════════

// Pretty-print a raw key binding ("arrowup", "shift", "j") for display.
function prettyKey(k) {
  if (k == null) return "—"
  const map = {
    arrowup: "↑", arrowdown: "↓", arrowleft: "←", arrowright: "→",
    " ": "Space", shift: "Shift", control: "Ctrl", escape: "Esc", enter: "Enter"
  }
  const s = String(k).toLowerCase()
  if (map[s]) return map[s]
  return s.length === 1 ? s.toUpperCase() : s.charAt(0).toUpperCase() + s.slice(1)
}
// Combine two bindings into "A + B".
function comboKeys(a, b) { return `${prettyKey(a)} + ${prettyKey(b)}` }

// Build the page list. c = live controls map (P1_CONTROLS). Each "row" is
// [actionLabel, keyLabel, description]. keyLabel is always derived from c.
function buildTutorialPages(c = {}) {
  return [
    {
      title: "MOVEMENT", accent: "#7fd3ff",
      blurb: "Stay mobile — spacing wins fights. Dash to close gaps or bait attacks.",
      rows: [
        ["Move left / right", `${prettyKey(c.left)} / ${prettyKey(c.right)}`, "Walk and control spacing."],
        ["Jump",              prettyKey(c.jump),  "Tap to leap; some fighters can double-jump."],
        ["Crouch",            prettyKey(c.down),  "Lowers your profile — also the guard input (see Defense)."],
        ["Dash",              prettyKey(c.dash),  "Quick burst; some characters teleport on a double-tap."]
      ]
    },
    {
      title: "ATTACKS", accent: "#ffd27f",
      blurb: "Normals are direction-sensitive: the same buttons do different moves on the ground, in the air, or with up/down held.",
      rows: [
        ["Light attack", prettyKey(c.light), "Fast poke. Chains into combos."],
        ["Heavy attack", prettyKey(c.heavy), "Slower, bigger damage and knockback."],
        ["Up attack (launcher)", comboKeys(c.up, c.light), "Hold Up + an attack to pop the enemy airborne."],
        ["Air attack",   `${prettyKey(c.light)} (airborne)`, "Press Light while jumping to juggle."],
        ["Down-air spike", `${prettyKey(c.heavy)} (airborne)`, "Press Heavy in the air to slam them down."],
        ["Grab / throw", comboKeys(c.down, c.light), "Beats blocking. Hold Down + Light up close."]
      ]
    },
    {
      title: "DEFENSE", accent: "#86efac",
      blurb: "You can't act out of hitstun, so blocking and parries are how you survive pressure.",
      rows: [
        ["Block", `Hold ${prettyKey(c.down)}`, "Hold to guard. Blocking bleeds small CHIP damage but stops the combo."],
        ["Parry", `${prettyKey(c.heavy)} (timed)`, "Tap Heavy just as an attack STARTS up to deflect it and stagger the attacker."],
        ["Tech roll", `${prettyKey(c.left)} / ${prettyKey(c.right)} on knockdown`, "Hold a direction as you land to roll and recover safely."]
      ]
    },
    {
      title: "METER & SPECIALS", accent: "#c4b5fd",
      blurb: "Specials and Ultimates spend your energy meter (it also regenerates slowly). Bigger moves cost more.",
      rows: [
        ["Special", prettyKey(c.special),   "Signature move — costs energy. Some are projectiles."],
        ["Ultimate", prettyKey(c.ultimate), "Highest-cost finisher. Save meter for it."],
        ["Charge energy", `Hold ${prettyKey(c.charge)}`, "Stand and build meter (leaves you open)."],
        ["Transform", prettyKey(c.transform), "Enter a stronger form (e.g. Super Saiyan) — boosts damage."]
      ]
    },
    {
      title: "COMBOS & GIMMICKS", accent: "#ff9fc4",
      blurb: "Launch, jump, juggle: Up-attack → jump → air attacks → down-air spike is the core combo. Each fighter also has a unique system.",
      rows: [
        ["Combo scaling", "—", "Each hit in a combo does a little less — open with your heavy hitters."],
        ["Gojo: Infinity", prettyKey(c.toggle), "Toggle a field that slows anything approaching you."],
        ["Ben 10: Omnitrix", `${prettyKey(c.charge)} + ${prettyKey(c.down)}/${prettyKey(c.left)}/${prettyKey(c.right)}`, "Transform straight to a loadout slot's alien (Charge + that slot's direction) — deliberate, no cycling."],
        ["Domain Expansion", "—", "Some fighters can activate a damage-boosting domain — watch the meter bar."]
      ]
    }
  ]
}

let _tutorialPageCache = null
let _tutorialCacheKey  = null
function getTutorialPages(controls) {
  // Re-derive only if the bindings object identity changes (cheap & in-sync).
  if (controls !== _tutorialCacheKey) {
    _tutorialPageCache = buildTutorialPages(controls)
    _tutorialCacheKey  = controls
  }
  return _tutorialPageCache
}

export function getTutorialPageCount(controls) {
  return getTutorialPages(controls).length
}

export function getTutorialButtons(canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  return [
    { id: "prev", label: "‹ BACK",  x: 24,             y: h - 70, w: 150, h: 48 },
    { id: "next", label: "NEXT ›",  x: w - 24 - 150,   y: h - 70, w: 150, h: 48 },
    { id: "menu", label: "MAIN MENU", x: w / 2 - 90,   y: h - 70, w: 180, h: 48 }
  ]
}

// opts = { page, controls, mouse }
export function drawTutorialScreen(ctx, canvas, opts = {}) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const pages = getTutorialPages(opts.controls)
  const page  = clamp(opts.page || 0, 0, pages.length - 1)
  const P     = pages[page]

  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#0a1020", "#1a1530")
  drawHeader(ctx, canvas, "HOW TO PLAY", `${P.title}   —   page ${page + 1} of ${pages.length}`)

  // Page-dot indicator
  const dotY = 138, dotGap = 22, dotX0 = w / 2 - ((pages.length - 1) * dotGap) / 2
  for (let i = 0; i < pages.length; i++) {
    ctx.fillStyle = i === page ? P.accent : "rgba(255,255,255,0.25)"
    ctx.beginPath(); ctx.arc(dotX0 + i * dotGap, dotY, i === page ? 6 : 4, 0, Math.PI * 2); ctx.fill()
  }

  // Content panel
  const panelX = clamp(w * 0.5 - 430, 40, w)
  const panelW = Math.min(860, w - panelX * 2)
  const panelY = 168
  const panelH = h - panelY - 100
  drawPanel(ctx, panelX, panelY, panelW, panelH, { fill: "rgba(8,14,30,0.82)", stroke: P.accent, lineWidth: 2, radius: 16 })

  const pad = 28
  let cy = panelY + 34
  drawCenteredText(ctx, P.title, panelX + pad, cy, { font: "800 24px Arial", fill: P.accent, align: "left", baseline: "middle" })
  cy += 30
  cy = wrapText(ctx, P.blurb, panelX + pad, cy, panelW - pad * 2, 20, { font: "15px Arial", fill: "rgba(220,230,255,0.82)" })
  cy += 14

  // Rows: action | KEY chip | description
  const keyColX = panelX + pad + 230
  const descX   = keyColX + 150
  for (const [action, keyLabel, desc] of P.rows) {
    ctx.save(); ctx.textBaseline = "middle"
    ctx.textAlign = "left"; ctx.font = "700 15px Arial"; ctx.fillStyle = "#ffffff"
    ctx.fillText(action, panelX + pad, cy)
    // key chip
    ctx.font = "700 14px Arial"
    const chipW = Math.max(46, ctx.measureText(keyLabel).width + 22)
    ctx.fillStyle = "rgba(120,170,255,0.18)"
    fillRoundRect(ctx, keyColX, cy - 14, chipW, 28, 8)
    ctx.strokeStyle = P.accent; ctx.lineWidth = 1.5; strokeRoundRect(ctx, keyColX, cy - 14, chipW, 28, 8)
    ctx.fillStyle = "#eaf1ff"; ctx.textAlign = "center"
    ctx.fillText(keyLabel, keyColX + chipW / 2, cy)
    ctx.restore()
    cy = wrapText(ctx, desc, descX, cy, panelX + panelW - pad - descX, 18, { font: "14px Arial", fill: "rgba(220,230,255,0.75)" })
    cy += 12
  }

  // Nav buttons (hover highlight via mouse)
  const m = opts.mouse
  for (const b of getTutorialButtons(canvas)) {
    const active = m ? _inRect(m.x, m.y, b) : false
    drawButton(ctx, b, { label: b.label, active, accent: P.accent })
  }
  drawFooterHint(ctx, canvas, "← / → to flip pages • Esc returns to the menu")
}

// ═════════════════════════════════════════════════════════════════════════
// ACCOUNT SCREEN (front-end stub — see account.js)
// opts = { account, draftName, message, accounts, mouse, caretOn }
// ═════════════════════════════════════════════════════════════════════════
export function getAccountButtons(canvas) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const cx = w / 2
  return [
    { id: "generate", label: "GENERATE ACCOUNT", x: cx - 170, y: 360, w: 340, h: 56 },
    { id: "new",      label: "NEW / SWITCH",      x: cx - 170, y: 430, w: 160, h: 48 },
    { id: "menu",     label: "MAIN MENU",         x: cx + 10,  y: 430, w: 160, h: 48 }
  ]
}

export function drawAccountScreen(ctx, canvas, opts = {}) {
  const { width: w, height: h } = getCanvasSize(canvas)
  const cx = w / 2
  ctx.clearRect(0, 0, w, h)
  drawBackdrop(ctx, canvas, "#08111f", "#101a33")
  drawHeader(ctx, canvas, "ACCOUNT", "Local profile (no server yet — saved in memory only)")

  // Current account banner
  const acc = opts.account
  const bannerW = 520, bannerX = cx - bannerW / 2, bannerY = 150
  drawPanel(ctx, bannerX, bannerY, bannerW, 70, { fill: "rgba(8,14,30,0.8)", stroke: acc ? "#86efac" : "rgba(255,255,255,0.18)", lineWidth: 2, radius: 14 })
  if (acc) {
    drawCenteredText(ctx, `Logged in as ${acc.username}`, bannerX + 20, bannerY + 28, { font: "800 20px Arial", fill: "#bbf7d0", align: "left", baseline: "middle" })
    drawCenteredText(ctx, `id: ${acc.accountId}`, bannerX + 20, bannerY + 50, { font: "12px Arial", fill: "rgba(220,230,255,0.6)", align: "left", baseline: "middle" })
  } else {
    drawCenteredText(ctx, "No account yet — type a username and generate one.", cx, bannerY + 35, { font: "16px Arial", fill: "rgba(220,230,255,0.75)" })
  }

  // Username entry field
  const fieldW = 340, fieldX = cx - fieldW / 2, fieldY = 270, fieldH = 56
  drawCenteredText(ctx, "USERNAME", fieldX, fieldY - 14, { font: "700 13px Arial", fill: "#8fb3ff", align: "left", baseline: "middle" })
  drawPanel(ctx, fieldX, fieldY, fieldW, fieldH, { fill: "rgba(255,255,255,0.06)", stroke: "#8fb3ff", lineWidth: 2, radius: 10 })
  const draft = String(opts.draftName || "")
  const caret = opts.caretOn ? "|" : ""
  ctx.save(); ctx.textBaseline = "middle"; ctx.textAlign = "left"
  ctx.font = "700 22px Arial"
  ctx.fillStyle = draft ? "#ffffff" : "rgba(220,230,255,0.4)"
  ctx.fillText(draft ? draft + caret : "enter name…" , fieldX + 16, fieldY + fieldH / 2)
  ctx.restore()

  // Buttons
  const m = opts.mouse
  for (const b of getAccountButtons(canvas)) {
    const active = m ? _inRect(m.x, m.y, b) : false
    drawButton(ctx, b, { label: b.label, active, accent: b.id === "generate" ? "#86efac" : "#8fb3ff" })
  }

  // Message / saved-accounts count
  if (opts.message) {
    drawCenteredText(ctx, opts.message, cx, 510, { font: "15px Arial", fill: "#ffd27f" })
  }
  const count = normalizeToArray(opts.accounts).length
  if (count > 0) drawFooterHint(ctx, canvas, `${count} local account${count === 1 ? "" : "s"} this session • type to edit name • Enter to generate`)
  else           drawFooterHint(ctx, canvas, "Type a username • Enter to generate • Esc to go back")
}
