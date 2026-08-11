// tojiFlyHeadsSwarm.js
// TOJI FUSHIGURO — FLY HEADS: a dense, screen-filling SWARM of shikigami fly-heads (fly_head.png) that
// heavily CLUTTERS the shared view — a pure VISION-DENIAL / DISRUPTION tool. ZERO damage by construction
// (this is a draw+drift overlay, not a projectile — nothing here can ever touch a hurtbox).
//
// WHY AN OVERLAY, NOT THE LITERAL "opponent can't see, caster can": this game renders local two-player on ONE
// shared canvas (a single #gameCanvas / one 2D context / one camera — both players watch the exact same view).
// There is no split-screen or per-player rendering, so a literal asymmetric blind cannot exist. The closest
// achievable version is this: many simultaneous fly_head instances drawn in SCREEN space at high density so
// the arena/fighters are swamped for BOTH players. It is technically symmetric, but Toji CHOSE the moment —
// he fights through the chaos he summoned ("Invisible Man" energy) while the opponent eats it cold.
//
// Live-combat overlay (does NOT freeze the match — that is the point: both fight on, half-blind). Drawn AFTER
// the fighters but UNDER the HUD (health bars/timer stay readable), so it denies fighter visibility only.
//   • abilities.fireTojiFlyHeads() → activateTojiFlyHeadsSwarm() (plus the hand-forward release gesture pose).
//   • game.updateBattle() ticks updateTojiFlyHeadsSwarm(canvas) every frame while active.
//   • game.drawBattle() calls drawTojiFlyHeadsSwarm(ctx, canvas) between drawBattleScene() and drawBattleHud().

const SHEET = "./toji_fly_head_uniform.png"
const FRAMES = 3, FW = 32, FH = 25          // 3-frame flap strip, 32×25 per frame (matches the projectile spriteW/H)
const SWARM_COUNT = 46                      // high density → real screen coverage on both players' shared view
const DURATION = 200                        // ~3.3s of chaos, then it disperses
const FADE_IN = 18, FADE_OUT = 46           // ease the clutter in/out so it doesn't hard-pop

let _img = null
function ensureImg() { if (!_img) { _img = new Image(); _img.src = SHEET } return _img }
function _ready(im) { return im && im.complete && im.naturalWidth > 0 }

// Cheap deterministic-ish jitter seeded by index — avoids leaning on Math.random for the base spread so the
// swarm reads consistently for screenshots, with a small Math.random garnish for organic motion.
function _spread(i, n, span) { return ((i + 0.5) / n) * span }

const swarm = { active: false, frame: 0, parts: null, w: 0, h: 0 }

export function activateTojiFlyHeadsSwarm() {
  ensureImg()
  swarm.active = true; swarm.frame = 0; swarm.parts = null   // parts lazy-init on first update (needs canvas dims)
  return true
}

function _init(w, h) {
  swarm.w = w; swarm.h = h
  const parts = []
  // Lay a loose grid across the whole canvas (guarantees coverage), then jitter each cell so it doesn't read
  // as a grid. Varied scale/speed/flap gives depth and a churning, chaotic feel.
  const cols = 9, rows = Math.ceil(SWARM_COUNT / cols)
  for (let i = 0; i < SWARM_COUNT; i++) {
    const cx = (i % cols), cy = Math.floor(i / cols)
    const jx = (Math.random() - 0.5) * (w / cols) * 1.2
    const jy = (Math.random() - 0.5) * (h / rows) * 1.2
    parts.push({
      x: _spread(cx, cols, w) + jx,
      y: _spread(cy, rows, h) + jy,
      vx: (Math.random() - 0.5) * 2.6,
      vy: (Math.random() - 0.5) * 2.2,
      scale: 2.0 + Math.random() * 3.2,        // big instances → heavy coverage (fly_head is small at 32×25)
      bobAmp: 5 + Math.random() * 16,
      bobFreq: 0.05 + Math.random() * 0.09,
      phase: Math.random() * Math.PI * 2,
      frame0: (i * 7) % FRAMES,
      flapSpeed: 0.16 + Math.random() * 0.12,
      rot: (Math.random() - 0.5) * 0.5,
      spin: (Math.random() - 0.5) * 0.03,
      flip: Math.random() < 0.5 ? -1 : 1,
    })
  }
  swarm.parts = parts
}

export function isTojiFlyHeadsSwarmActive() { return swarm.active }

export function getTojiFlyHeadsSwarmStatus() {
  return { active: swarm.active, frame: swarm.frame, total: DURATION, count: swarm.active ? SWARM_COUNT : 0 }
}

export function updateTojiFlyHeadsSwarm(canvas) {
  if (!swarm.active) return
  const w = canvas?.width || swarm.w || 1280, h = canvas?.height || swarm.h || 720
  if (!swarm.parts) _init(w, h)
  swarm.w = w; swarm.h = h
  const pad = 80   // wrap margin so a head slides fully off before reappearing on the far side (no pop mid-screen)
  for (const p of swarm.parts) {
    p.x += p.vx; p.y += p.vy
    p.rot += p.spin
    if (p.x < -pad) p.x = w + pad; else if (p.x > w + pad) p.x = -pad   // toroidal wrap → density never thins
    if (p.y < -pad) p.y = h + pad; else if (p.y > h + pad) p.y = -pad
  }
  swarm.frame++
  if (swarm.frame >= DURATION) clearTojiFlyHeadsSwarm()
}

export function drawTojiFlyHeadsSwarm(ctx, canvas) {
  if (!swarm.active || !swarm.parts || !ctx || !canvas) return
  const im = ensureImg(), ready = _ready(im)
  const t = swarm.frame
  let fade = 1
  if (t < FADE_IN) fade = t / FADE_IN
  else if (t > DURATION - FADE_OUT) fade = Math.max(0, (DURATION - t) / FADE_OUT)
  ctx.save()
  for (const p of swarm.parts) {
    const fr = (p.frame0 + Math.floor(t * p.flapSpeed)) % FRAMES
    const y = p.y + Math.sin(t * p.bobFreq + p.phase) * p.bobAmp
    ctx.globalAlpha = fade * 0.97
    ctx.save()
    ctx.translate(p.x, y)
    ctx.rotate(p.rot)
    ctx.scale(p.flip, 1)
    if (ready) {
      const dw = FW * p.scale, dh = FH * p.scale
      ctx.drawImage(im, fr * FW, 0, FW, FH, -dw / 2, -dh / 2, dw, dh)
    } else {
      // Sheet not decoded yet — draw a shikigami-brown blob so the swarm still reads (never a blank frame).
      const r = 11 * p.scale / 2
      ctx.fillStyle = "#8a7d6b"
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill()
    }
    ctx.restore()
  }
  ctx.restore()
}

// Idempotent cleanup for every reset path (round reset / rematch / menu / KO).
export function clearTojiFlyHeadsSwarm() {
  swarm.active = false; swarm.frame = 0; swarm.parts = null
}
