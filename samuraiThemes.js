// Render-only squad costumes. The original cells, alpha and animation data
// stay in use, including the Ranger's own Mega Mode and NeoMar654's Zord poses.
import { SAMURAI_FORMS, SAMURAI_COLORS, SAMURAI_ZORDS, samuraiZordArt } from './samuraiData.js'

export const SAMURAI_THEMES = [
  {
    id: 'samurai_kintsugi', name: 'Jade Kintsugi',
    armor: ['#092d2a', '#2a8f74', '#c8ead2'],
    cloth: ['#111924', '#375354', '#82978a'],
    metal: ['#78502a', '#dca53e', '#ffefaa'],
    seam: '#ffcf67', pattern: 'diamond',
  },
  {
    id: 'samurai_neon_shogun', name: 'Neon Shogun',
    armor: ['#221149', '#663eb3', '#beadf6'],
    cloth: ['#100e1a', '#28305a', '#595891'],
    metal: ['#12515d', '#27dcd0', '#ccfff2'],
    seam: '#53ffeb', pattern: 'circuit',
  },
  {
    id: 'samurai_sakura_dusk', name: 'Sakura Dusk',
    armor: ['#391747', '#a03970', '#ffaaba'],
    cloth: ['#170c28', '#4b3265', '#8e77a0'],
    metal: ['#9c758d', '#ebbac0', '#fff0da'],
    seam: '#ffc0cc', pattern: 'petals',
  },
  {
    id: 'samurai_glacier', name: 'Glacier Ronin',
    armor: ['#376991', '#83cadb', '#f4fffa'],
    cloth: ['#0e203c', '#264e77', '#618da2'],
    metal: ['#3d6498', '#8baac4', '#e8f9f8'],
    seam: '#a4e9f7', pattern: 'diamond',
  },
  {
    id: 'samurai_solar_forge', name: 'Solar Forge',
    armor: ['#52162a', '#be4a2a', '#ffb477'],
    cloth: ['#241525', '#593444', '#986268'],
    metal: ['#74451b', '#f5ae38', '#fff5b0'],
    seam: '#ffcf66', pattern: 'sun',
  },
  {
    id: 'samurai_abyssal', name: 'Abyssal Pearl',
    armor: ['#0b213f', '#12617e', '#78d4ca'],
    cloth: ['#0b1429', '#33405f', '#758aa8'],
    metal: ['#87678c', '#cab1cc', '#f2ebe3'],
    seam: '#9cf6e4', pattern: 'waves',
  },
]

const THEME_BY_ID = new Map(SAMURAI_THEMES.map(theme => [theme.id, theme]))
export const isSamuraiTheme = skinId => THEME_BY_ID.has(skinId)
const RANGER_HUES = [[346, 23], [209, 258], [122, 175], [27, 66], [302, 12], [25, 66]]
const ZORD_SHEETS = new Set(Object.keys(SAMURAI_ZORDS).map(id => samuraiZordArt(id).sheet))
const color = hex => hex.slice(1).match(/../g).map(channel => parseInt(channel, 16))
const mix = (a, b, amount) => a.map((channel, i) => channel + (b[i] - channel) * amount)

function gradient(stops) {
  const colors = stops.map(color)
  const lut = new Uint8ClampedArray(256 * 3)
  for (let i = 0; i < 256; i++) {
    const t = i / 255 * 2
    const segment = Math.min(1, Math.floor(t))
    lut.set(mix(colors[segment], colors[segment + 1], t - segment), i * 3)
  }
  return lut
}

const PALETTES = new Map(SAMURAI_THEMES.map(theme => [theme.id, {
  cloth: gradient(theme.cloth),
  armor: gradient(theme.armor),
  metal: gradient(theme.metal),
  seam: color(theme.seam),
}]))
const RANGER_COLORS = SAMURAI_COLORS.map(color)

// Source sheets use different paint colors for each Ranger. Hue gates target
// those original panels and warm trim, leaving white swings and black visors.
function paintRole(r, g, b, index) {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const spread = max - min
  if (max < 36 || (max > 214 && spread < 48)) return 0
  if (spread / max < 0.19) return max < 105 ? 1 : 0
  let h = max === r ? (g - b) / spread : max === g ? 2 + (b - r) / spread : 4 + (r - g) / spread
  h = (h * 60 + 360) % 360
  const gold = h >= 26 && h <= 65
  if (index === -1) {
    if (max > 221 && !gold) return 0
    return gold || h < 25 || h > 315 ? 3 : 2
  }
  const [lo, hi] = RANGER_HUES[index]
  if (lo > hi ? h >= lo || h <= hi : h >= lo && h <= hi) return 2
  if (gold) return 3
  return index === 5 && h >= 205 && h <= 260 ? 1 : 0
}

function paint(data, width, height, theme, index) {
  const palette = PALETTES.get(theme.id)
  const role = new Uint8Array(width * height)
  for (let i = 0; i < role.length; i++) {
    const p = i * 4
    if (data[p + 3] >= 24) role[i] = paintRole(data[p], data[p + 1], data[p + 2], index)
  }
  for (let i = 0; i < role.length; i++) {
    const kind = role[i]
    if (!kind) continue
    const p = i * 4
    const max = Math.max(data[p], data[p + 1], data[p + 2])
    const level = Math.min(255, Math.max(0, Math.round((max - 36) * 255 / 219)))
    const ramp = kind === 1 ? palette.cloth : kind === 2 ? palette.armor : palette.metal
    const inlay = index >= 0 && kind === 3 ? RANGER_COLORS[index] : null
    const seam = kind === 2 && level > 115 && i % width > 0 && i % width < width - 1 &&
      (role[i - 1] === 1 || role[i - width] === 1)
    for (let c = 0; c < 3; c++) {
      let v = ramp[level * 3 + c]
      if (inlay) v = v * 0.82 + inlay[c] * 0.18
      if (seam) v = v * 0.68 + palette.seam[c] * 0.32
      data[p + c] = v
    }
  }
}

// Bounded by the sheets actually drawn, including menu previews. Sprites
// remain the same dimensions and alpha, so render frame offsets never move.
const paintedSheets = new Map()
function painted(theme, index, source, image) {
  if (!theme || !image?.complete || !image.naturalWidth || typeof document === 'undefined') return image
  const key = theme.id + '|' + index + '|' + source
  const cached = paintedSheets.get(key)
  if (cached) {
    paintedSheets.delete(key)
    paintedSheets.set(key, cached)
    return cached
  }
  const canvas = document.createElement('canvas')
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return image
  try {
    ctx.drawImage(image, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height)
    paint(pixels.data, pixels.width, pixels.height, theme, index)
    ctx.putImageData(pixels, 0, 0)
  } catch (_) {
    return image
  }
  canvas.complete = true
  canvas.naturalWidth = canvas.width
  canvas.naturalHeight = canvas.height
  if (paintedSheets.size >= 100) paintedSheets.delete(paintedSheets.keys().next().value)
  paintedSheets.set(key, canvas)
  return canvas
}

export function samuraiThemeBody(fighter, source, image) {
  const theme = THEME_BY_ID.get(fighter?.skinId)
  if (!theme) return image
  const index = SAMURAI_FORMS.indexOf(fighter.rosterKey)
  return index < 0 ? image : painted(theme, index, source, image)
}

export function samuraiThemeZord(projectile, image) {
  if (!ZORD_SHEETS.has(projectile.sheet)) return image
  return painted(THEME_BY_ID.get(projectile.owner?.skinId), -1, projectile.sheet, image)
}

const cards = new Map()

function drawPattern(ctx, theme) {
  ctx.strokeStyle = theme.seam
  ctx.globalAlpha = 0.25
  for (let i = 0; i < 4; i++) {
    const r = 25 + 25 * i
    ctx.beginPath()
    if (theme.pattern === 'sun') {
      ctx.arc(120, 93, r, 0, Math.PI * 2)
    } else if (theme.pattern === 'waves') {
      ctx.moveTo(0, 37 + i * 29)
      ctx.bezierCurveTo(70, 10 + i * 29, 150, 100 + i * 29, 240, 52 + i * 29)
    } else if (theme.pattern === 'petals') {
      ctx.ellipse(120, 83, 30, 93, Math.PI / 4 * i, 0, Math.PI * 2)
    } else if (theme.pattern === 'circuit') {
      ctx.moveTo(0, 12 + i * 26)
      ctx.lineTo(90 + i * 27, 12 + i * 26)
      ctx.lineTo(130 + i * 26, 83 + i * 22)
      ctx.lineTo(240, 83 + i * 22)
    } else {
      ctx.moveTo(120, 88 - r)
      ctx.lineTo(120 + r, 88)
      ctx.lineTo(120, 88 + r)
      ctx.lineTo(120 - r, 88)
      ctx.closePath()
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

export function samuraiThemeCard(skinId, characters, getImage) {
  const theme = THEME_BY_ID.get(skinId)
  if (!theme) return null
  if (cards.has(skinId)) return cards.get(skinId)
  const poses = SAMURAI_FORMS.map(key => {
    const idle = characters[key].animationData.idle
    return { idle, image: getImage(idle.sheet), key }
  })
  if (!poses.every(({ image }) => image?.complete && image.naturalWidth > 0)) return null

  const canvas = document.createElement('canvas')
  canvas.width = 240
  canvas.height = 180
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const bg = ctx.createRadialGradient(120, 80, 12, 120, 80, 140)
  bg.addColorStop(0, theme.armor[1])
  bg.addColorStop(1, theme.cloth[0])
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  drawPattern(ctx, theme)
  ctx.imageSmoothingEnabled = false
  // Stagger the back and front rows so all six helmets read on a small card.
  for (const index of [3, 4, 5, 0, 1, 2]) {
    const { idle, image, key } = poses[index]
    const sheet = samuraiThemeBody({ skinId, rosterKey: key }, idle.sheet, image)
    const scale = 1.45
    const width = idle.width * scale
    const height = idle.height * scale
    const cx = 47 + index % 3 * 69 + (index < 3 ? -10 : 9)
    const feet = index < 3 ? 170 : 109
    ctx.drawImage(sheet, idle.sourceX || 0, idle.sourceY || 0, idle.width, idle.height,
      Math.round(cx - width / 2), Math.round(feet - height), width, height)
  }
  canvas.complete = true
  canvas.naturalWidth = canvas.width
  canvas.naturalHeight = canvas.height
  cards.set(skinId, canvas)
  return canvas
}
