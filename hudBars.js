// hudBars.js — every character's OWN life + energy bar (PRESENTATION ONLY: reads health / energy, writes nothing).
// Each roster key gets a health gradient, an energy gradient and an animated MOTIF drawn inside the fill (flames for
// fire users, lightning for Killua / Zenitsu / Megawhatt-types, a starfield for Alien X-likes, cursed wisps for JJK,
// web lines for Spider-Men, a glitch for Ghostface.EXE …). Low health still reads: under 25 % the life bar blends to
// a pulsing red whatever the character's colours. Characters missing from BAR_THEMES derive a theme from their
// palette / meter colour + energy type, so a new fighter never breaks the HUD. Animation = the global frame clock
// (deterministic, no Math.random). Used by ui.js's THEMED HUD (Classic HUD style keeps the old bars exactly).
import { characters } from './characters.js'

// key: [hp light, hp dark, energy light, energy dark, motif]
export const BAR_THEMES = {
  // Dragon Ball
  goku: ['#ffb347', '#e0601a', '#7fd4ff', '#2f7bd8', 'ki'], goku_black: ['#c7c7d4', '#4a4a5a', '#ff7ad1', '#a3207a', 'ki'],
  goku_rose: ['#ff9ccc', '#c2306f', '#ff6fb3', '#8c1d55', 'ki'], gogeta: ['#8ac4ff', '#2b5fc0', '#ffe066', '#e0a020', 'ki'],
  vegeta: ['#6f8cff', '#24339a', '#ffe680', '#d8a820', 'ki'], vegeta_dark: ['#c46ed4', '#5e1a6a', '#ff5c7a', '#9a1430', 'ki'],
  piccolo: ['#8be07a', '#2f7a2a', '#c69cf0', '#6a3aa8', 'ki'], frieza: ['#e8d0ff', '#8a52c8', '#ff6ad5', '#8a1e78', 'ki'],
  cell: ['#9de07a', '#3d7a2a', '#7ad8ff', '#2a74b8', 'ki'], gohan: ['#b48cf0', '#5a2f9a', '#fff27a', '#e0b020', 'bolt'],
  gotenks: ['#ffe066', '#d89a10', '#8ad0ff', '#3a7ad0', 'ki'], bardock: ['#e86a5a', '#8a1e1e', '#a8f070', '#3a8a24', 'ki'],
  beerus: ['#c79cf0', '#5a2a9a', '#e8b8ff', '#7a2ad0', 'holy'], vegito: ['#7ab8ff', '#1e4ab0', '#9af0ff', '#2ab0d8', 'ki'],
  // Jujutsu Kaisen
  gojo: ['#9ad8ff', '#3a6ad8', '#d8b8ff', '#7a3ad8', 'void'], gojo_shinjuku: ['#bfeaff', '#4a8ae0', '#e0c8ff', '#8a50e0', 'void'],
  sukuna: ['#ff8a8a', '#8a1420', '#3a1420', '#e03040', 'cursed'], sukuna_shinjuku: ['#f0f0f0', '#7a7a84', '#ff5a5a', '#7a1018', 'cursed'],
  alt_sukuna: ['#ff6a6a', '#6a1018', '#ff9a4a', '#a83010', 'cursed'], aoi_todo: ['#e8c890', '#8a5a2a', '#5ad8ff', '#2a7ab8', 'beat'],
  maki: ['#a8d88a', '#3a6a2a', '#5a6a5a', '#2a302a', 'slash'], toji: ['#9aa8a0', '#3a4a42', '#5c6b63', '#2a322e', 'slash'],
  yuji: ['#ff9aa0', '#b8283a', '#4a6aff', '#1e2a8a', 'cursed'], naoya: ['#e8e08a', '#8a8020', '#ffe680', '#a88a10', 'speed'],
  miwa: ['#8ad0f0', '#2a74a8', '#c8e8ff', '#5a9ad0', 'slash'], yuta: ['#e8e8f4', '#6a6a8a', '#ff7ab0', '#5a1a5a', 'cursed'],
  handler: ['#a8a0c8', '#4a3a7a', '#8a6aff', '#3a1a8a', 'cursed'], megumi_fushiguro: ['#7a8ad8', '#1e2a6a', '#8a9aff', '#2a2a8a', 'shadow'],
  higuruma: ['#f0d88a', '#8a6a20', '#e8c87a', '#7a5a10', 'cursed'],
  // Originals / misc
  omololu: ['#ffd27a', '#c8801a', '#8af0a8', '#2a9a5a', 'beat'], dseyl: ['#c8c8d0', '#4a4a54', '#8ae8ff', '#1e8ac0', 'tech'],
  enoch: ['#ffc07a', '#d0501a', '#bfeaff', '#4ab0e8', 'flame'], jesus: ['#fff4c0', '#d8b84a', '#ffffff', '#e8d48a', 'holy'],
  baki: ['#e86a5a', '#6a1414', '#ffb08a', '#a84a2a', 'beat'],
  // Naruto
  naruto: ['#ffb24a', '#e0601a', '#7ac8ff', '#2a6ad8', 'chakra'], sasuke: ['#a08ae8', '#2a1e6a', '#8ad0ff', '#2a5ad8', 'bolt'],
  sasuke_adult: ['#b89af0', '#3a1a7a', '#c87aff', '#5a1aa8', 'bolt'], itachi: ['#ff7a7a', '#7a1020', '#3a2a3a', '#a01828', 'crow'],
  shisui_itachi_kids: ['#7a8ad0', '#1e2a5a', '#ff6a6a', '#8a1420', 'crow'], tobirama: ['#8ad8ff', '#2a6aa8', '#bff0ff', '#3a9ad8', 'water'],
  hashirama: ['#a8d88a', '#3a6a1e', '#e8c08a', '#8a5a2a', 'leaf'], minato: ['#ffe680', '#d8a010', '#ffffff', '#f0d040', 'speed'],
  madara: ['#ff7a7a', '#5a0a14', '#6a8aff', '#1e2a8a', 'flame'], obito: ['#c09ad8', '#4a2a6a', '#ff6a6a', '#7a1020', 'void'],
  tobi: ['#ffb06a', '#a84a10', '#9a7ad8', '#3a1e6a', 'void'], pain: ['#c8a8e8', '#5a3a8a', '#ff9a4a', '#8a3a10', 'ripple'],
  jiraiya: ['#e87a6a', '#8a1e1e', '#ffcf6a', '#c08010', 'chakra'], hiruzen: ['#c8a07a', '#5a3a1e', '#ff9a4a', '#a8401a', 'flame'],
  isshiki: ['#ff8a8a', '#7a0a14', '#d8d8e8', '#6a6a8a', 'void'], orochimaru: ['#c0b0e0', '#4a3a6a', '#9ae08a', '#2a6a2a', 'scale'],
  onoki: ['#e8d8b0', '#8a7a4a', '#bff8ff', '#5ab8d8', 'ripple'], kiba: ['#e8c08a', '#8a5a2a', '#ff9a6a', '#a83a1a', 'slash'],
  sakura: ['#ffb0cc', '#c8406a', '#a8f0a8', '#3a9a5a', 'leaf'], sasuke_sensei: ['#8a9ad0', '#1e2a5a', '#c87aff', '#4a1aa8', 'bolt'],
  hinata: ['#d8c8f0', '#6a50a8', '#9ad8ff', '#3a7ad8', 'chakra'], gaara: ['#e8c88a', '#8a6a2a', '#ff8a6a', '#8a2a1a', 'sand'],
  boruto: ['#ffe08a', '#c89a2a', '#8ad8ff', '#2a7ad8', 'bolt'], six_paths_pain: ['#a87a9a', '#3a1a30', '#ff8a6a', '#7a2a1a', 'ripple'],
  kakashi: ['#c8d0e0', '#4a5a7a', '#bfe8ff', '#4a9ad8', 'bolt'], kakashi_anbu: ['#d8d8e0', '#5a5a6a', '#ff6a6a', '#7a1420', 'bolt'],
  kakashi_war: ['#a8b8a0', '#3a4a32', '#8ad8ff', '#2a6ad8', 'bolt'], naruto_hokage: ['#ffc46a', '#d8701a', '#fff0a0', '#e0a020', 'chakra'],
  naruto_seventh: ['#ffb84a', '#c85a10', '#ff8a3a', '#a8300a', 'flame'], shisui_trinity: ['#7ac8a0', '#1e5a3a', '#ff6a6a', '#7a1020', 'crow'],
  shisui_blade: ['#a8acb8', '#3a3e48', '#7ae0ff', '#2a8ab0', 'slash'], shisui_puppeteer: ['#d87a8a', '#5a1420', '#c8a0ff', '#5a2a8a', 'web'],
  shisui_fallen: ['#e86a6a', '#5a0a14', '#3a1a20', '#a01420', 'crow'],
  // Demon Slayer
  zenitsu: ['#ffe680', '#d8a010', '#fff8c0', '#f0c020', 'bolt'], rengoku: ['#ffb04a', '#d8401a', '#ffe07a', '#e0601a', 'flame'],
  shinobu: ['#e0c0ff', '#7a50c8', '#9af0d8', '#2aa88a', 'wing'], inosuke: ['#8ab8e8', '#2a4a7a', '#d8c8a0', '#7a6a4a', 'slash'],
  nezuko: ['#ffa0c0', '#c03a6a', '#ff8a5a', '#c0301a', 'flame'],
  // Rick and Morty
  rick: ['#bff0ff', '#4ab0d8', '#9af04e', '#3a9a1a', 'portal'], morty: ['#ffe08a', '#c8a02a', '#9af04e', '#3a9a1a', 'portal'],
  evilMorty: ['#d8d8e0', '#4a4a5a', '#9af04e', '#2a7a1a', 'portal'], rickPrime: ['#c8d8e8', '#3a4a5a', '#7aff5a', '#1a8a1a', 'portal'],
  // Ben 10
  ben10: ['#8af08a', '#1e8a2a', '#5aff6a', '#1aa82a', 'omni'], albedo: ['#ff8a8a', '#8a1420', '#ff4a4a', '#8a0a0a', 'omni'],
  kevin_levin: ['#9ad8b0', '#2a6a4a', '#9ae8c0', '#3a9a6a', 'scale'], gwen: ['#ffa0c8', '#c03a7a', '#e88aff', '#8a2ad0', 'rune'],
  vilgax: ['#8ad87a', '#2a6a1e', '#ff6a5a', '#8a1a14', 'tech'],
  // Invincible (now DC)
  omniman: ['#ff7a7a', '#a01420', '#e8e8f0', '#8a8a9a', 'speed'], invincible: ['#ffe066', '#d8a010', '#5a8aff', '#1e3a9a', 'speed'],
  omniman_viltrum: ['#f0f0f4', '#8a8a96', '#ff4a4a', '#9a0a14', 'speed'],
  // Power Rangers
  omega_ranger: ['#e8e8f0', '#6a6a7a', '#8ad8ff', '#2a8ad8', 'tech'], samurai_red_ranger: ['#ff6a5a', '#a01414', '#ffd06a', '#d08010', 'kanji'],
  gold_samurai_ranger: ['#ffe07a', '#b8901a', '#ffffff', '#e0c040', 'kanji'], green_samurai_ranger: ['#8af07a', '#1e8a2a', '#c8ffb0', '#4ac04a', 'kanji'],
  red_ranger_mmpr: ['#ff6a5a', '#a81414', '#ffffff', '#c8c8d8', 'grid'], spd_red: ['#ff5a5a', '#a01414', '#7af0ff', '#1aa8c0', 'grid'],
  ns_red: ['#ff6a5a', '#a01414', '#ffb08a', '#c84a1a', 'flame'], ns_yellow: ['#ffe066', '#c89a10', '#e8c890', '#8a6a2a', 'sand'],
  ninja_storm_cgpt: ['#ff7a6a', '#a81a1a', '#ffd070', '#c88010', 'wind'], ns_trio: ['#7ab0ff', '#1e48b0', '#9ae8ff', '#2a8ad8', 'wind'],
  ns_blue: ['#7ab0ff', '#1e48b0', '#bff0ff', '#4ab8e8', 'water'], ns_navy: ['#7a8ad8', '#1e2a6a', '#fff27a', '#d8c010', 'bolt'],
  ns_green: ['#8af07a', '#1e8a2a', '#c0d8a0', '#5a7a3a', 'slash'], windrangers: ['#ff6a5a', '#a01414', '#9ae8ff', '#2a8ad8', 'wind'],
  ninja_storm_rangers: ['#ff6a5a', '#a01818', '#7af0d8', '#1aa88a', 'wind'], krybot: ['#c8c8d0', '#4a4a5a', '#ffc46a', '#c07a1a', 'tech'],
  spd_blue: ['#7ab0ff', '#1e48b0', '#8ac8ff', '#2a6ad8', 'grid'], spd_green: ['#8af08a', '#1e8a3a', '#7aff9a', '#1ab04a', 'grid'],
  spd_pink: ['#ffa0d0', '#c83a8a', '#ff7ac0', '#b02a7a', 'grid'], spd_yellow: ['#ffe680', '#c8a010', '#fff27a', '#d8c010', 'grid'],
  mmpr_pink: ['#ffb0d8', '#c84a8a', '#ffd0e8', '#e07ab0', 'grid'], mmpr_black: ['#a8acb8', '#2a2e38', '#e0e8f0', '#8a9aa8', 'grid'],
  green_ranger: ['#8af07a', '#1e8a2a', '#ffd76a', '#c89a10', 'grid'], mmpr_white: ['#ffffff', '#a8a8b8', '#ffe07a', '#c8a020', 'grid'],
  // Hunter x Hunter
  netero: ['#ffc46a', '#c87a10', '#fff0c0', '#e0b04a', 'holy'], killua: ['#bfeaff', '#4a9ad8', '#e0f8ff', '#7ad0ff', 'bolt'],
  gon: ['#9ae08a', '#2a8a2a', '#ffe07a', '#d8a010', 'nen'], hisoka: ['#ffa0d0', '#b02a7a', '#e88aff', '#8a1ab0', 'nen'],
  chrollo: ['#b89af0', '#4a1aa8', '#d8c8ff', '#6a4ab0', 'rune'], meruem: ['#c87af0', '#5a1a8a', '#9af0b0', '#2a8a4a', 'nen'],
  kurapika: ['#ff7a7a', '#8a1418', '#ffd07a', '#c89020', 'chain'], shizuku: ['#b8c0d0', '#4a5262', '#8ad8ff', '#3a8ab8', 'nen'],
  zoldyck: ['#a8e0ff', '#3a8ad8', '#e0f8ff', '#7ad0ff', 'bolt'],
  // Others
  saiki: ['#ffa0c8', '#c03a7a', '#9af0e8', '#2aa8a0', 'ripple'], flash: ['#ff6a5a', '#a01414', '#ffe66a', '#e0a010', 'bolt'],
  violet: ['#e85a7a', '#8a1430', '#c8a0ff', '#6a3ad8', 'hex'], batman: ['#8a9ab8', '#2a3248', '#ffd06a', '#c88a10', 'bat'],
  superman: ['#6a9aff', '#1a3ab8', '#ff6a5a', '#c01414', 'sun'], superman_dcuc: ['#6a9aff', '#1a40b8', '#ffd84a', '#d89a10', 'sun'],
  superman_new52: ['#7aa8ff', '#1e48c0', '#ff5a5a', '#a81414', 'sun'], superman_classic: ['#7aa0ff', '#2048b0', '#ffe06a', '#e0a020', 'sun'],
  superman_fighter: ['#7aa0ff', '#1e44b8', '#ff7a5a', '#c02a14', 'sun'], green_arrow: ['#8ae07a', '#1e7a2a', '#7aff8a', '#1ab040', 'tech'],
  ghostface: ['#e8eef4', '#8a96a4', '#3a4050', '#c8d0dc', 'smoke'], ghostface_billy: ['#e86a7a', '#5a0a14', '#e8eef4', '#8a96a4', 'blood'],
  jason: ['#c8d0a8', '#4a5232', '#ff5a5a', '#7a0a0a', 'blood'], ghostface_exe: ['#7af0ff', '#1a6a8a', '#ff4aa8', '#7a1a5a', 'glitch'],
  ichigo: ['#ff9a5a', '#a84010', '#5a5a7a', '#e0e0f0', 'slash'], zaraki: ['#ffe07a', '#c08a10', '#ff6a5a', '#8a1414', 'slash'],
  zaraki_shikai: ['#ff8a5a', '#8a1a0a', '#ffd07a', '#a85a10', 'slash'], mayuri: ['#e0e0f0', '#5a3a6a', '#9af07a', '#3a8a2a', 'scale'],
  byakuya: ['#f0d8f0', '#8a5a9a', '#ffc0d8', '#c05a8a', 'petal'], yamamoto: ['#ffb06a', '#c8401a', '#ffe07a', '#e0701a', 'flame'],
  saitama: ['#ffe066', '#d8a010', '#ff6a5a', '#c01414', 'beat'], genos: ['#ffe08a', '#c8901a', '#ffb06a', '#e0601a', 'flame'],
  light: ['#e87a7a', '#7a1420', '#3a3a44', '#c8c8d8', 'ink'], l_ryuuzaki: ['#d8d8e0', '#5a5a6a', '#8ab0ff', '#3a5ab0', 'ink'],
  spiderman: ['#ff6a6a', '#b01418', '#7aa0ff', '#1e3ab0', 'web'], spiderman_raimi: ['#e85a6a', '#7a0a14', '#6a8ae8', '#1e2a8a', 'web'],
  spiderman_ssf2: ['#ff6a5a', '#a01414', '#7a9aff', '#1e3aa8', 'web'], spiderman_mci: ['#ff6a6a', '#a81420', '#7aa8ff', '#1e40b8', 'web'],
  miles: ['#ff5a5a', '#8a0a14', '#7ad8ff', '#1a8ad8', 'bolt'], iron_man: ['#ff6a5a', '#a01414', '#ffe07a', '#e0a020', 'tech'],
  iron_man_2: ['#ff7a5a', '#a81a14', '#bff0ff', '#4ab8e8', 'tech'], iron_man_3: ['#ff6a5a', '#9a1414', '#ffd84a', '#d89010', 'tech'],
  deathstroke: ['#ffa05a', '#a8401a', '#8a9ab8', '#2a3248', 'slash'], brainiac: ['#8af07a', '#1e8a2a', '#c87aff', '#5a1aa8', 'tech'],
  green_lantern: ['#8aff8a', '#1aa83a', '#d0ffd0', '#4ae04a', 'holy'], homelander: ['#7aa0ff', '#1e3ab0', '#ff5a5a', '#c01414', 'sun'],
  dark_knight: ['#8a8ea0', '#24283a', '#ffd06a', '#b07a10', 'bat'], ippo: ['#ff7a6a', '#a01818', '#ffe07a', '#c89a10', 'beat'],
  soldier_boy: ['#e8c87a', '#8a6a1a', '#c8ff7a', '#5aa81a', 'nuke'], zoro: ['#8ae07a', '#1e7a2a', '#e0e8f0', '#7a8aa0', 'slash'],
  buggy: ['#ff9a6a', '#c0401a', '#8ac8ff', '#2a6ad8', 'chop'], sanji: ['#ffe07a', '#c89a1a', '#7aa8ff', '#1e48c0', 'flame'],
  arlong: ['#8a9ae0', '#2a3a8a', '#7ac8ff', '#1e6ab0', 'water'], dash_parr: ['#ff6a7a', '#a01430', '#ffe66a', '#e0a010', 'speed'],
  cyborg: ['#d0d8e4', '#5a6a80', '#ff5a5a', '#b01414', 'tech'], beast_boy: ['#8af07a', '#2a8a2a', '#c89aff', '#6a3aa8', 'paw'],
  raven: ['#a88aff', '#3a1a8a', '#c8b0ff', '#5a2ad0', 'void'], starfire: ['#ffa07a', '#d0401a', '#9aff7a', '#2ab02a', 'stars'],
  robin: ['#ff6a6a', '#b01418', '#ffe07a', '#d8a010', 'chevron'], syndrome: ['#7a7a8a', '#24242e', '#8ae8ff', '#1a8ac0', 'tech'],
  frozone: ['#bff0ff', '#3aa0c8', '#e0f8ff', '#7ad0f0', 'ice'], mr_incredible: ['#ff7a7a', '#a81a2a', '#ffd07a', '#c88a10', 'beat'],
  elastigirl: ['#ff7a7a', '#b01a2a', '#ffb07a', '#d8501a', 'wave'], luffy: ['#ff7a6a', '#b01a1a', '#ffd06a', '#d8901a', 'wave'],
  // Ben 10 / Ghost aliens that are their own roster keys
  alienx: ['#ffffff', '#9aa0b4', '#4dff6a', '#1a8a2a', 'stars'],
}

const MOTIF_BY_ENERGY = {
  ki: 'ki', god_ki: 'holy', cursed_energy: 'cursed', cursed: 'cursed', chakra: 'chakra', nen: 'nen', reiatsu: 'slash',
  tech: 'tech', repulsor: 'tech', gadget: 'chevron', speed_force: 'bolt', web_fluid: 'web', dread: 'smoke', bloodlust: 'blood',
  solar_energy: 'sun', ice: 'ice', thermal: 'flame', heat: 'flame', tide: 'water', ninja: 'wind', energy: 'grid', magic: 'void',
  stellar: 'stars', morph: 'paw', omnitrix: 'omni', ultimatrix: 'omni', mana: 'rune', plasma: 'tech', psi: 'ripple',
}

const HEX = /^#[0-9a-f]{6}$/i
const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))
const hex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => hex(rgb(a).map((v, i) => v + (rgb(b)[i] - v) * t))
const shade = (h, k) => k >= 0 ? mix(h, '#ffffff', k) : mix(h, '#000000', -k)

const _cache = new Map()
export function barTheme(f) {
  const key = String(f?.rosterKey || '')
  if (_cache.has(key)) return _cache.get(key)
  let T = BAR_THEMES[key]
  if (!T) {
    const c = characters[key] || {}
    const a = HEX.test(c.color || '') ? c.color : HEX.test(c.energyConfig?.color || '') ? c.energyConfig.color : '#5bbd7e'
    const e = HEX.test(c.energyConfig?.color || '') ? c.energyConfig.color : shade(a, 0.25)
    T = [shade(a, 0.35), shade(a, -0.35), shade(e, 0.25), shade(e, -0.3), MOTIF_BY_ENERGY[c.traits?.energyType] || 'chevron']
  }
  const th = { hp: [T[0], T[1]], en: [T[2], T[3]], motif: T[4] }
  _cache.set(key, th); return th
}

const h1 = (i, s) => { let v = Math.imul(i + 1, 2654435761) ^ Math.imul(s + 7, 40503); v = Math.imul(v ^ (v >>> 15), 2246822519); return ((v ^ (v >>> 13)) >>> 0) / 4294967296 }

// the motif, drawn inside the clipped fill rect (x, y, w, h); t = frame clock; c0 = light colour
function motif(c, m, x, y, w, h, t, c0) {
  c.save()
  const W = (a) => `rgba(255,255,255,${a})`, K = (a) => `rgba(0,0,0,${a})`
  switch (m) {
    case 'ki': case 'holy': case 'nen': {          // rising aura flecks
      c.fillStyle = m === 'holy' ? W(0.55) : W(0.4)
      for (let i = 0; i < w / 9; i++) { const px = x + ((i * 9 + h1(i, 1) * 9) % w), ph = (t * (0.6 + h1(i, 2)) + h1(i, 3) * h) % (h + 6)
        c.fillRect(px, y + h - ph, 1.5, m === 'nen' ? 3 : 4) }
      break
    }
    case 'flame': case 'sun': case 'nuke': {       // licking flame tongues along the top
      c.fillStyle = m === 'nuke' ? 'rgba(200,255,120,0.35)' : W(0.32)
      c.beginPath(); c.moveTo(x, y + h)
      for (let px = 0; px <= w; px += 4) c.lineTo(x + px, y + h * (0.45 + 0.3 * Math.sin(px * 0.35 + t * 0.25) * Math.sin(px * 0.13 - t * 0.11)))
      c.lineTo(x + w, y + h); c.fill(); break
    }
    case 'bolt': {                                 // a crackling lightning line
      c.strokeStyle = W(0.75); c.lineWidth = 1.3; c.beginPath()
      const ph = Math.floor(t / 4)
      for (let px = 0; px <= w; px += 6) c.lineTo(x + px, y + h * (0.2 + 0.6 * h1(px, ph)))
      c.stroke(); break
    }
    case 'cursed': case 'shadow': case 'smoke': case 'void': case 'crow': {   // drifting wisps
      c.fillStyle = m === 'smoke' ? K(0.18) : m === 'void' ? W(0.16) : K(0.28)
      for (let i = 0; i < w / 14; i++) { const px = x + ((i * 14 + t * (0.5 + h1(i, 4) * 0.6)) % (w + 20)) - 10
        c.beginPath(); c.ellipse(px, y + h * (0.3 + 0.5 * h1(i, 5)), 6 + 4 * h1(i, 6), h * 0.32, 0, 0, Math.PI * 2); c.fill() }
      if (m === 'void' || m === 'crow') { c.fillStyle = W(0.7); for (let i = 0; i < w / 16; i++) c.fillRect(x + h1(i, 9) * w, y + h1(i, 10) * h, 1, 1) }
      break
    }
    case 'stars': case 'omni': {                   // a twinkling starfield / Omnitrix hourglass dots
      for (let i = 0; i < w / 6; i++) { const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.07 + i)); c.fillStyle = W(0.85 * tw)
        const px = x + h1(i, 11) * w, py = y + h1(i, 12) * h; c.fillRect(px, py, h1(i, 13) > 0.85 ? 2 : 1, h1(i, 13) > 0.85 ? 2 : 1) }
      break
    }
    case 'tech': case 'grid': case 'hex': {        // scrolling scanlines / panel grid
      c.strokeStyle = W(m === 'hex' ? 0.22 : 0.16); c.lineWidth = 1
      const off = (t * 0.8) % 10
      for (let px = -10; px < w + 10; px += 10) { c.beginPath(); c.moveTo(x + px + off, y); c.lineTo(x + px + off, y + h); c.stroke() }
      if (m === 'tech') { c.fillStyle = W(0.35); c.fillRect(x + ((t * 2.2) % (w + 30)) - 30, y, 30, h) }
      break
    }
    case 'chakra': case 'water': case 'wave': case 'wind': case 'ripple': case 'portal': {   // flowing waves
      c.strokeStyle = W(0.35); c.lineWidth = 1.3
      for (const k of [0.35, 0.7]) { c.beginPath()
        for (let px = 0; px <= w; px += 3) c.lineTo(x + px, y + h * k + Math.sin(px * 0.16 + t * (m === 'wind' ? 0.3 : 0.15) + k * 5) * h * 0.14)
        c.stroke() }
      break
    }
    case 'ice': {                                  // frost facets
      c.strokeStyle = W(0.45); c.lineWidth = 1
      for (let i = 0; i < w / 12; i++) { const px = x + i * 12 + 4; c.beginPath(); c.moveTo(px, y + h); c.lineTo(px + 4, y + h * 0.25); c.lineTo(px + 8, y + h); c.stroke() }
      c.fillStyle = W(0.6 * (0.5 + 0.5 * Math.sin(t * 0.1))); c.fillRect(x + ((t * 1.5) % w), y + 2, 2, 2); break
    }
    case 'blood': {                                // drips from the top edge
      c.fillStyle = 'rgba(90,0,0,0.45)'
      for (let i = 0; i < w / 11; i++) { const px = x + i * 11 + h1(i, 14) * 6, d = h * (0.25 + 0.55 * ((t * 0.01 + h1(i, 15)) % 1))
        c.fillRect(px, y, 2, d); c.beginPath(); c.arc(px + 1, y + d, 1.6, 0, Math.PI * 2); c.fill() }
      break
    }
    case 'web': {                                  // web strands
      c.strokeStyle = W(0.3); c.lineWidth = 0.8
      for (let px = 0; px < w; px += 14) { c.beginPath(); c.moveTo(x + px, y); c.lineTo(x + px + 7, y + h); c.lineTo(x + px + 14, y); c.stroke() }
      c.beginPath(); c.moveTo(x, y + h / 2); c.lineTo(x + w, y + h / 2); c.stroke(); break
    }
    case 'glitch': {                               // Ghostface.EXE: RGB-split slices that jump
      const ph = Math.floor(t / 5)
      for (let i = 0; i < 4; i++) { c.fillStyle = i % 2 ? 'rgba(255,60,170,0.4)' : 'rgba(80,240,255,0.4)'
        c.fillRect(x + h1(i, ph) * w, y + h1(i + 9, ph) * h, 6 + 20 * h1(i + 3, ph), 2) }
      break
    }
    default: {                                     // chevrons / slashes / everything else: sliding diagonal stripes
      c.fillStyle = W(m === 'slash' ? 0.22 : 0.14)
      const off = (t * 0.6) % 12
      for (let px = -12; px < w + 12; px += 12) { c.beginPath(); c.moveTo(x + px + off, y + h); c.lineTo(x + px + off + 5, y + h); c.lineTo(x + px + off + 5 + h * 0.6, y); c.lineTo(x + px + off + h * 0.6, y); c.fill() }
    }
  }
  c.restore()
}

// Fill the CURRENT PATH (the caller's bevelled / rounded bar rect) with this fighter's bar. kind 'hp' | 'en'.
// ratio = fill fraction (for the low-health warning); o.colour overrides the energy colour (Omnitrix states etc.).
export function fillThemedBar(c, f, kind, x, y, w, h, ratio, t, o = {}) {
  if (w <= 0.5) return
  const th = barTheme(f)
  let [a, b] = kind === 'hp' ? th.hp : th.en
  if (o.colour && HEX.test(o.colour)) { a = shade(o.colour, 0.25); b = shade(o.colour, -0.3) }
  if (kind === 'hp' && ratio <= 0.25) {                       // danger: blend to a pulsing red so low life always reads
    const p = 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(t * 0.22))
    a = mix(a, '#ff5a5a', p); b = mix(b, '#8f1a1a', p)
  }
  c.save(); c.clip()
  const g = c.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(0, a); g.addColorStop(0.55, mix(a, b, 0.35)); g.addColorStop(1, b)
  c.fillStyle = g; c.fillRect(x - 1, y - 1, w + 2, h + 2)
  motif(c, th.motif, x, y, w, h, t, a)
  c.restore()
}
