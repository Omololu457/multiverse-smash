// rangerUltCinematics.js — Demon Slayer-style cinematic PRE-ROLLS for the Rangers' personal ultimates (2026-11-24, owner: "look at
// the Demon Slayer ultimate … so that they're all cinematic — do this for the Samurai Rangers and the Mighty Morphin Power Rangers").
// Same engine and contract as the Zenitsu / Nezuko / Naruto pre-rolls (demonSlayerCinematics.js registerUltPreroll): combat freezes,
// the camera closes in on the Ranger, the shot list plays, then the Ranger's OWN ultimate cinematic starts exactly as before
// (deferred: rangerUltPreroll(kind, caster, opp, start) runs `start` the frame the pre-roll ends, or at once if it can't play).
//
//   MIGHTY MORPHIN (Red / Black / Pink / Green / White — the mmpr_rangers forms; started when their opener CONNECTS, Red's on press)
//     MORPH [0,40)  call pose, the Morphin Grid lights up: Ranger-colour lightning crawls over the body, grid lines sweep the floor
//     COIN  [40,80) the Power Coin cut-in: a gold coin spins in across a letterboxed band, the Ranger's portrait struck on its face
//     CALL  [80,124) the zord / weapon names slam in (brush calligraphy), the aura peaks, white flash
//     WHIP  [124,150) a fast pan to the opponent, speed lines — then the live ultimate
//   SAMURAI (Red / Gold / Green; started on press)
//     the same beats, but the cut-in is the SYMBOL POWER: the Ranger's kanji (火 / 光 / 木) is brushed stroke by stroke across the
//     screen in their colour, then burns in.
// Render-only + camera; deterministic (frame-indexed, hsh); no Math.random. Imports dsCineKit.js + demonSlayerCinematics.js only.

import { ease, cx, hsh, toScreen, flameTongue, bolt, pose } from "./dsCineKit.js"
import { registerUltPreroll, startDemonSlayerPreroll } from "./demonSlayerCinematics.js"

const T = 150, T_CUT = 40, T_CALL = 80, T_WHIP = 124

const DEFS = {
  red_ranger_mmpr: { kind: 'coin', col: '#e0201c', pale: '#ffd0c8', particle: 'grid', portrait: './assets/mmpr_rangers/portrait.png', pose: 'introMorpher',
    words: [[44, '変身', "IT'S MORPHIN' TIME!"], [84, 'ティラノサウルス', 'TYRANNOSAURUS!'], [106, 'パワーソード', 'POWER SWORD']], tint: '30,4,4' },
  mmpr_black: { kind: 'coin', col: '#5a5a70', pale: '#e6e6f2', particle: 'grid', pose: 'bCall',
    words: [[44, '変身', "IT'S MORPHIN' TIME!"], [84, 'マストドン', 'MASTODON!'], [106, '黒い降下', 'BLACKOUT DESCENT']], tint: '10,10,18' },
  mmpr_pink: { kind: 'coin', col: '#ff6fb4', pale: '#ffe0ef', particle: 'feathers', pose: 'pCall',
    words: [[44, '変身', "IT'S MORPHIN' TIME!"], [84, 'プテラノドン', 'PTERODACTYL!'], [106, '天の矢', "HEAVEN'S FINAL ARROW"]], tint: '36,6,24' },
  green_ranger: { kind: 'coin', col: '#2fbf3a', pale: '#d8ffd8', particle: 'notes', pose: 'gCall',
    words: [[44, '変身', "IT'S MORPHIN' TIME!"], [84, 'ドラゴンゾード', 'DRAGONZORD!'], [106, 'ゾード強襲', 'ZORD ASSAULT']], tint: '4,24,8' },
  mmpr_white: { kind: 'coin', col: '#f2f2f6', pale: '#ffffff', particle: 'light', pose: 'wCall', edge: '#c8a030',
    words: [[44, '白虎', 'WHITE RANGER POWER!'], [84, 'サバ', 'TIGERZORD — SABA!'], [106, '忍者大陣', 'NINJA GRAND FORMATION']], tint: '18,16,26' },
  samurai_red_ranger: { kind: 'kanji', glyph: '火', col: '#ff3a12', pale: '#ffd27a', particle: 'fire', pose: 'ultimate',
    words: [[44, 'シンケンレッド', 'GO GO SAMURAI!'], [84, '烈火大斬刀', 'FIRE SMASHER'], [106, '炎の一撃', 'BLAZING STRIKE']], tint: '34,6,0' },
  gold_samurai_ranger: { kind: 'kanji', glyph: '光', col: '#ffc81a', pale: '#fff4c0', particle: 'rays', pose: 'ultimate',
    words: [[44, 'シンケンゴールド', 'GOLD POWER!'], [84, 'サカナマル', 'BARRACUDA BLADE'], [106, '光の終幕', 'LIGHT FINALE']], tint: '28,20,0' },
  green_samurai_ranger: { kind: 'kanji', glyph: '木', col: '#3ccf4a', pale: '#d8ffc8', particle: 'leaves', pose: 'ultimate',
    words: [[44, 'シンケングリーン', 'GO GO SAMURAI!'], [84, '森の槍', 'FOREST SPEAR'], [106, '緑の嵐', 'VERDANT STORM']], tint: '4,24,4' },
}
export const RANGER_ULT_PREROLLS = Object.keys(DEFS)

// ── image cache (render-only) ──
const IMG = {}
function image(src) {
  if (!src || typeof Image === 'undefined') return null
  if (!IMG[src]) { try { IMG[src] = new Image(); IMG[src].src = src } catch (_) { return null } }
  return IMG[src]
}
const ready = im => !!(im && im.complete && im.naturalWidth > 0)
const portraitOf = (c, D) => D.portrait || c?.portrait || c?.hudIcon || null

// ── the Power Coin cut-in: a letterboxed band, a gold coin spinning in (its width = |cos| of the spin), the portrait on its face ──
function drawCoin(ctx, cw, ch, k, f, c, D) {
  const bandH = ch * 0.3 * ease(Math.min(1, k * 4)), y0 = ch * 0.35
  ctx.save()
  ctx.globalAlpha = 0.86; ctx.fillStyle = '#05050a'; ctx.fillRect(0, y0 + ch * 0.15 - bandH / 2, cw, bandH)
  ctx.globalAlpha = 1; ctx.fillStyle = D.col; ctx.fillRect(0, y0 + ch * 0.15 - bandH / 2, cw, 3); ctx.fillRect(0, y0 + ch * 0.15 + bandH / 2 - 3, cw, 3)
  const r = ch * 0.13, x = cw * 0.5 + (1 - ease(Math.min(1, k * 4))) * cw * 0.6, y = y0 + ch * 0.15   // flies in by k ≈ 0.25
  const spin = Math.cos((1 - Math.min(1, k * 4.5)) * Math.PI * 4), sx = Math.max(0.06, Math.abs(spin))   // spins in, settles face-on by k ≈ 0.22
  ctx.translate(x, y); ctx.scale(sx, 1)
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r)
  g.addColorStop(0, '#fff3b0'); g.addColorStop(0.55, '#e8b830'); g.addColorStop(1, '#8a5a10')
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#5a3a08'; ctx.lineWidth = 4; ctx.stroke()
  ctx.strokeStyle = '#fff0a0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 0.84, 0, Math.PI * 2); ctx.stroke()
  if (Math.abs(spin) > 0.2) {   // the face (both sides of the coin): the Ranger's portrait in a Ranger-colour ring
    ctx.fillStyle = D.col; ctx.beginPath(); ctx.arc(0, 0, r * 0.72, 0, Math.PI * 2); ctx.fill()
    const im = image(portraitOf(c, D))
    if (ready(im)) { ctx.save(); ctx.beginPath(); ctx.arc(0, 0, r * 0.66, 0, Math.PI * 2); ctx.clip(); const s = (r * 1.32) / Math.min(im.naturalWidth, im.naturalHeight); ctx.imageSmoothingEnabled = false; ctx.drawImage(im, -im.naturalWidth * s / 2, -im.naturalHeight * s / 2, im.naturalWidth * s, im.naturalHeight * s); ctx.restore() }
  }
  ctx.restore()
  // the coin's glint sweeping across the band
  const gx = ((f - T_CUT) * 34) % (cw + 400) - 200
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35
  const lg = ctx.createLinearGradient(gx - 80, 0, gx + 80, 0); lg.addColorStop(0, 'rgba(255,255,255,0)'); lg.addColorStop(0.5, D.pale); lg.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = lg; ctx.fillRect(gx - 80, y0 + ch * 0.15 - bandH / 2, 160, bandH); ctx.restore()
}

// ── the Symbol Power: the kanji brushed in (a sweeping reveal), then it burns in the Ranger's colour ──
function drawKanji(ctx, cw, ch, k, f, D) {
  const size = Math.round(ch * 0.62), x = cw * 0.5, y = ch * 0.56
  ctx.save()
  ctx.globalAlpha = 0.72 * Math.min(1, k * 5); ctx.fillStyle = '#060402'; ctx.fillRect(0, 0, cw, ch)
  ctx.font = `900 ${size}px "Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  const reveal = ease(Math.min(1, k * 2.6))   // the brush sweeps top-left → bottom-right (done by k ≈ 0.4, then it burns)
  ctx.save(); ctx.beginPath(); ctx.moveTo(x - size, y - size); ctx.lineTo(x - size + reveal * size * 3, y - size); ctx.lineTo(x - size + reveal * size * 3 - size * 1.2, y + size); ctx.lineTo(x - size, y + size); ctx.closePath(); ctx.clip()
  ctx.globalAlpha = 1; ctx.lineWidth = size * 0.05; ctx.strokeStyle = '#120804'; ctx.strokeText(D.glyph, x, y)
  ctx.fillStyle = D.col; ctx.fillText(D.glyph, x, y)
  if (k > 0.4) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, (k - 0.4) / 0.3) * (0.55 + 0.35 * Math.sin(f * 0.7)); ctx.fillStyle = D.pale; ctx.fillText(D.glyph, x, y) }
  ctx.restore()
  // ink splatter at the brush tip
  const tipX = x - size + reveal * size * 3 - size * 0.6, tipY = y - size * 0.1
  if (reveal < 1) for (let i = 0; i < 10; i++) { ctx.globalAlpha = 0.7; ctx.fillStyle = i % 2 ? D.col : '#1a0a04'; ctx.beginPath(); ctx.arc(tipX + (hsh(i, f) - 0.5) * 80, tipY + (hsh(i, f + 3) - 0.5) * size, 3 + 6 * hsh(i, 7), 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}

// ── per-Ranger particles around the body ──
function drawParticles(ctx, D, body, feet, z, f, pow) {
  const n = 24
  for (let i = 0; i < n; i++) {
    const a0 = hsh(i, 3) * Math.PI * 2 + f * (0.02 + hsh(i, 4) * 0.03), r = (230 - 150 * pow) * z * 0.5 + 18 * z * 0.5
    const x = body.x + Math.cos(a0) * r, y = body.y + Math.sin(a0) * r * 0.7
    ctx.globalAlpha = 0.85 * Math.min(1, f / 15)
    if (D.particle === 'grid') { if (i % 3 === 0) { ctx.globalCompositeOperation = 'lighter'; bolt(ctx, body.x, body.y, x, y, i * 7 + (f >> 2), 2, i % 2 ? D.pale : D.col, 6, 16); ctx.globalCompositeOperation = 'source-over' } }
    else if (D.particle === 'feathers') { ctx.fillStyle = i % 2 ? '#ffd0e6' : D.col; ctx.beginPath(); ctx.ellipse(x, y + (f * 1.5 + i * 13) % 40, 7 * Math.max(1, z * 0.5), 2.5 * Math.max(1, z * 0.5), a0 + f * 0.05, 0, Math.PI * 2); ctx.fill() }
    else if (D.particle === 'notes') { ctx.fillStyle = i % 2 ? '#b8ffb0' : D.col; ctx.font = `${Math.round(14 * Math.max(1, z * 0.5))}px serif`; ctx.fillText(i % 3 ? '♪' : '♫', x, y - (f * 0.8 + i * 9) % 50) }
    else if (D.particle === 'light') { ctx.fillStyle = i % 2 ? '#ffffff' : '#ffe8a0'; const s = 2 + 3 * hsh(i, 9); ctx.fillRect(x - s / 2, y - s * 2, s, s * 4); ctx.fillRect(x - s * 2, y - s / 2, s * 4, s) }
    else if (D.particle === 'fire') { ctx.fillStyle = i % 2 ? '#ffd27a' : '#ff4a12'; ctx.beginPath(); ctx.arc(x, y - (f * 2 + i * 11) % 60, 3 * Math.max(1, z * 0.5), 0, Math.PI * 2); ctx.fill() }
    else if (D.particle === 'rays') { if (i % 4 === 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 * pow; ctx.strokeStyle = D.pale; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(body.x, body.y); ctx.lineTo(body.x + Math.cos(a0) * 900, body.y + Math.sin(a0) * 900); ctx.stroke(); ctx.globalCompositeOperation = 'source-over' } }
    else if (D.particle === 'leaves') { ctx.fillStyle = i % 2 ? '#9cf07a' : '#2a8a2a'; ctx.beginPath(); ctx.ellipse(x, y, 8 * Math.max(1, z * 0.5), 3.5 * Math.max(1, z * 0.5), a0 + f * 0.12, 0, Math.PI * 2); ctx.fill() }
  }
  if (D.particle === 'grid') {   // the Morphin Grid: perspective lines sweep the floor under the Ranger
    ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = D.col; ctx.lineWidth = 2
    for (let i = -6; i <= 6; i++) { ctx.globalAlpha = 0.35 * pow; ctx.beginPath(); ctx.moveTo(feet.x + i * 26 * z, feet.y); ctx.lineTo(feet.x + i * 120 * z, feet.y + 160); ctx.stroke() }
    for (let j = 0; j < 4; j++) { const t = ((f * 2 + j * 40) % 160) / 160; ctx.globalAlpha = 0.4 * (1 - t) * pow; ctx.beginPath(); ctx.moveTo(0, feet.y + t * 160); ctx.lineTo(99999, feet.y + t * 160); ctx.stroke() }
    ctx.globalCompositeOperation = 'source-over'
  }
}

function makeScript(key, D) {
  return {
    total: T, accent: D.col, ink: D.pale, tint: D.tint, words: D.words, restoreCast: true,
    pose(c, f, cine) {   // the Ranger's own call pose (their frames, stepping slowly), else the pose the ult was cast in
      const key = D.pose && c.animationData?.[D.pose] ? D.pose : (cine.saved0?.cast || 'idle')
      pose(c, key, f >> 3)
    },
    onEnd(c, cine) {
      const then = cine.frame >= T ? cine.payload?.rangerThen : null   // natural end only (a round reset clears without starting)
      if (cine.payload) cine.payload.rangerThen = null
      if (typeof then === 'function') { try { then() } catch (e) { console.error(e) } }
    },
    camera(cam, c, opp, f) {
      if (f < T_CUT) { cam.focusOnFighter(c, 1.8 + 0.9 * ease(f / 36)); cam.targetY = (c.y || 0) + (c.h || 100) * 0.3 }
      else if (f < T_WHIP) cam.focusOnFighter(c, 2.4)
      else { if (opp) { cam.focusOnFighter(opp, 1.5); cam.maxPanStep = 200 } else cam.focusOnFighter(c, 1.3) }
      if (cam.shake && f === T_CALL) cam.shake(12, 12)
      if (cam.shake && f >= T_CALL && f < T_WHIP && f % 12 === 0) cam.shake(3, 5)
    },
    update(f, { snd }) {
      try {
        if (f === 2) snd?.play?.('mz_call')
        if (f === T_CUT) snd?.play?.(D.kind === 'coin' ? 'mz_zords' : 'mz_charge')
        if (f === T_CALL) snd?.play?.('mz_thunder')
        if (f === T_WHIP) snd?.play?.('mz_swing')
      } catch (_) {}
    },
    draw(ctx, cw, ch, f, c, cam) {
      const body = toScreen(cam, cw, ch, cx(c), (c.y || 0) + (c.h || 100) * 0.5), feet = toScreen(cam, cw, ch, cx(c), (c.y || 0) + (c.h || 100)), z = body.z
      const pow = f < T_CALL ? ease(f / T_CALL) : 1
      // aura: Ranger-colour flame tongues rising from the feet
      ctx.globalCompositeOperation = 'lighter'
      for (let L = 0; L < 2; L++) for (let i = 0; i < 9; i++) {
        const x = feet.x + (i - 4) * 9 * z, fl = 0.7 + 0.3 * Math.sin(f * 0.35 + i * 1.3 + L)
        ctx.globalAlpha = (L ? 0.3 : 0.22) * pow; flameTongue(ctx, x, feet.y, (64 + 40 * hsh(i, L)) * z * fl * (0.6 + 0.4 * pow), (10 - L * 3) * z, Math.sin((f + i * 9) / 8) * 6 * z, f / 5 + i, L ? D.pale : D.col)
      }
      ctx.globalCompositeOperation = 'source-over'
      drawParticles(ctx, D, body, feet, z, f, pow)
      if (f < 8) { ctx.globalAlpha = 0.5 * (1 - f / 8); ctx.fillStyle = D.pale; ctx.fillRect(0, 0, cw, ch) }   // the morph flash
      if (f >= T_CUT && f < T_CALL) {
        const k = (f - T_CUT) / (T_CALL - T_CUT), out = k > 0.86 ? (1 - k) / 0.14 : 1
        ctx.save(); ctx.globalAlpha = out
        if (D.kind === 'coin') drawCoin(ctx, cw, ch, k, f, c, D); else drawKanji(ctx, cw, ch, k, f, D)
        ctx.restore()
      }
      if (f === T_CALL || f === T_CALL + 1) { ctx.globalAlpha = 0.6; ctx.fillStyle = D.pale; ctx.fillRect(0, 0, cw, ch) }
      if (f >= T_WHIP && f < T_WHIP + 16) { ctx.globalAlpha = 0.5 * (1 - (f - T_WHIP) / 16); ctx.fillStyle = '#ffffff'; for (let i = 0; i < 26; i++) ctx.fillRect(0, hsh(i, f >> 1) * ch, cw, 1 + (i % 3)) }
      ctx.globalAlpha = 1
    },
  }
}
for (const [k, D] of Object.entries(DEFS)) registerUltPreroll(k, makeScript(k, D))

// Start a Ranger's pre-roll; their own ultimate (`start`) runs the frame it ends. If the pre-roll can't play (another one is up,
// no script), the ultimate starts at once — the ultimate itself never changes. Returns what `start` returns when run at once,
// else true (the ultimate is committed: the world is frozen until it starts).
export function rangerUltPreroll(kind, caster, opponent, start) {
  if (DEFS[kind] && startDemonSlayerPreroll(kind, caster, opponent, { rangerThen: start })) return true
  return start()
}
