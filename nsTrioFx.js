// nsTrioFx.js — NS TRIO RENDER-ONLY touches for Tori / Blake / Cam (ns_trio). Reads f._ninja bursts + f._duo; never
// writes sim state. Called from nsFx.js: drawTrioBurst for burst kinds only these moves emit (bubbles, geyser, crackle,
// bolt, star, aura, water, spark, leaf) and drawTrioAura for Super Samurai Mode. No Math.random (jitter from the burst id).
const jit = (n, i) => (((n * 73 + i * 151) % 97) / 97) - 0.5
const isTrio = f => f?._duo?.id === 'ns_trio'

export function drawTrioBurst(c, f, e, u, calm) {
  switch (e.k) {
    case 'bubbles': {   // Water Geyser tell: bubbles + a ripple ring at the foe's feet
      c.save(); c.globalAlpha = 0.8 * (1 - u * 0.5); c.strokeStyle = '#bff2ff'; c.lineWidth = 2
      c.beginPath(); c.ellipse(e.x, e.y - 2, 26 + u * 30, 6 + u * 4, 0, 0, Math.PI * 2); c.stroke()
      c.fillStyle = 'rgba(120,220,255,0.7)'
      for (let i = 0; i < 6; i++) { const bx = e.x + jit(e.n, i) * 70, by = e.y - 6 - ((u * 40 + i * 9) % 40); c.beginPath(); c.arc(bx, by, 2 + (i % 3), 0, Math.PI * 2); c.fill() }
      c.restore(); return true
    }
    case 'geyser': {   // Water Geyser: a column of water rising out of the floor
      const h = (e.h || 230) * Math.min(1, u * 3) * (1 - Math.max(0, u - 0.7) / 0.3 * 0.6), w = (e.w || 96) * (0.7 + 0.3 * Math.sin(u * 9))
      c.save(); const g = c.createLinearGradient(0, e.y - h, 0, e.y); g.addColorStop(0, 'rgba(220,250,255,0.85)'); g.addColorStop(1, 'rgba(40,140,240,0.75)')
      c.fillStyle = g; c.globalAlpha = 1 - Math.max(0, u - 0.6) / 0.4
      c.beginPath(); c.moveTo(e.x - w / 2, e.y); c.quadraticCurveTo(e.x - w * 0.3, e.y - h * 0.6, e.x - w * 0.18, e.y - h); c.lineTo(e.x + w * 0.18, e.y - h); c.quadraticCurveTo(e.x + w * 0.3, e.y - h * 0.6, e.x + w / 2, e.y); c.closePath(); c.fill()
      c.fillStyle = 'rgba(230,252,255,0.9)'; for (let i = 0; i < 8; i++) { c.beginPath(); c.arc(e.x + jit(e.n, i) * w * 1.6, e.y - h - 6 + jit(e.n, i + 9) * 30, 3 + (i % 3), 0, Math.PI * 2); c.fill() }
      c.restore(); return true
    }
    case 'crackle': {   // Thunder Strike tell: a crackling violet ring on the floor
      c.save(); c.strokeStyle = '#d6c2ff'; c.lineWidth = 2; c.globalAlpha = calm ? 0.6 : 0.5 + 0.5 * ((e.t % 4) < 2 ? 1 : 0.3)
      c.beginPath(); c.ellipse(e.x, e.y - 2, 34, 8, 0, 0, Math.PI * 2); c.stroke()
      c.beginPath(); for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + e.t * 0.4; c.moveTo(e.x + Math.cos(a) * 30, e.y - 2 + Math.sin(a) * 7); c.lineTo(e.x + Math.cos(a) * 44, e.y - 10 + Math.sin(a) * 9) } c.stroke()
      c.restore(); return true
    }
    case 'bolt': {   // Thunder Strike: a jagged lightning bolt from the top of the box to the floor + a flash ring
      const top = e.y - (e.h || 520), segs = 9
      c.save(); c.globalAlpha = 1 - u; c.lineJoin = 'round'
      for (const [col, lw] of [['rgba(185,140,255,0.55)', 14], ['#e6dcff', 5], ['#ffffff', 2]]) {
        c.strokeStyle = col; c.lineWidth = lw; c.beginPath(); c.moveTo(e.x, top)
        for (let i = 1; i <= segs; i++) c.lineTo(e.x + (i === segs ? 0 : jit(e.n + (e.t >> 2), i) * 46), top + (e.y - top) * i / segs)
        c.stroke()
      }
      c.strokeStyle = '#d6c2ff'; c.lineWidth = 3; c.beginPath(); c.ellipse(e.x, e.y - 2, 20 + u * 90, 5 + u * 12, 0, 0, Math.PI * 2); c.stroke()
      if (!calm && u < 0.25) { c.globalAlpha = 0.25 * (1 - u * 4); c.fillStyle = '#efe8ff'; c.fillRect(e.x - 60, top, 120, e.y - top) }
      c.restore(); return true
    }
    case 'star': {   // Samurai Star: a green saber arc swept around Cam
      c.save(); c.strokeStyle = '#9dffb0'; c.lineWidth = 4; c.globalAlpha = 0.85 * (1 - u)
      const r = 60 + u * 30, a0 = (e.n % 4) * Math.PI / 2 + u * Math.PI
      c.beginPath(); c.ellipse(e.x, e.y - 60, r * 1.3, r * 0.55, 0, a0, a0 + Math.PI * 1.2); c.stroke()
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(e.x, e.y - 60, r * 1.3, r * 0.55, 0, a0 + 0.2, a0 + Math.PI * 1.1); c.stroke()
      c.restore(); return true
    }
    case 'aura': {   // Super Samurai Mode power-up flash
      c.save(); c.strokeStyle = '#7dff8c'; c.lineWidth = 3; c.globalAlpha = 0.9 * (1 - u)
      c.beginPath(); c.ellipse(e.x, e.y - 50, 30 + u * 70, 60 + u * 50, 0, 0, Math.PI * 2); c.stroke(); c.restore(); return true
    }
    case 'water': {   // Tidal Surf trail: spray behind the wave
      c.save(); c.fillStyle = 'rgba(140,220,255,0.75)'; c.globalAlpha = 1 - u
      for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(e.x - (e.dir || 1) * (10 + u * 30 + i * 8), e.y - 6 - u * 24 + jit(e.n, i) * 20, 3 + (i % 2) * 2, 0, Math.PI * 2); c.fill() }
      c.strokeStyle = 'rgba(220,250,255,0.8)'; c.lineWidth = 2; c.beginPath(); c.ellipse(e.x, e.y - 4, 26 + u * 20, 5, 0, 0, Math.PI * 2); c.stroke()
      c.restore(); return true
    }
    case 'spark': {   // Thunder Dash trail: lightning sparks
      c.save(); c.strokeStyle = '#d6c2ff'; c.lineWidth = 2; c.globalAlpha = 1 - u; c.beginPath()
      for (let i = 0; i < 3; i++) { const sx = e.x - (e.dir || 1) * (12 + i * 14), sy = e.y - 30 - i * 22; c.moveTo(sx, sy); c.lineTo(sx + jit(e.n, i) * 22, sy + 10); c.lineTo(sx - jit(e.n, i + 3) * 22, sy + 20) }
      c.stroke(); c.restore(); return true
    }
    case 'leaf': {   // Samurai Saber dash: a green slash streak
      c.save(); c.strokeStyle = '#9dffb0'; c.lineWidth = 3; c.globalAlpha = 0.9 * (1 - u)
      c.beginPath(); c.moveTo(e.x - (e.dir || 1) * 60, e.y - 50); c.lineTo(e.x + (e.dir || 1) * 20, e.y - 56); c.stroke(); c.restore(); return true
    }
  }
  return false
}

// SUPER SAMURAI MODE: a green flame outline + rising embers for the whole buff (fades out over its last second)
export function drawTrioAura(c, f, calm) {
  if (!isTrio(f) || !(f._duo.samurai > 0)) return
  const k = Math.min(1, f._duo.samurai / 60), cx = f.x + (f.w || 48) / 2, feet = (f.y || 0) + (f.h || 94), t = f._duo.t || 0
  c.save(); c.globalAlpha = 0.45 * k; c.strokeStyle = '#7dff8c'; c.lineWidth = 2
  c.beginPath(); c.ellipse(cx, feet - 58, 34 + (calm ? 0 : Math.sin(t / 5) * 3), 70, 0, 0, Math.PI * 2); c.stroke()
  if (!calm) { c.fillStyle = '#b8ffc4'; for (let i = 0; i < 6; i++) { const yy = feet - ((t * 2 + i * 23) % 130), xx = cx + Math.sin(t / 7 + i * 2) * 26; c.globalAlpha = 0.6 * k * (1 - (feet - yy) / 130); c.fillRect(xx - 1.5, yy - 1.5, 3, 3) } }
  c.restore()
}
