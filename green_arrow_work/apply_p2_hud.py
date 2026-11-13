#!/usr/bin/env python3
"""Phase 2 ui.js: Tech energy label + Green Arrow Tech-bar badge (GA logo) + up to 3 drone
status pips. Mirrors _drawGokuLadderHud (gated on rosterKey, early-return otherwise).
Pips read fighter._gaDronePips (populated by drones.js)."""
import io, sys

def patch(path, anchor, insert, where="before", must_absent=None, count=1):
    s = io.open(path, encoding="utf-8").read()
    if must_absent and must_absent in s:
        print(f"  SKIP {path}: {must_absent!r} present"); return
    n = s.count(anchor)
    if n != count:
        print(f"  !! {path}: anchor count {n} != {count}: {anchor!r}"); sys.exit(1)
    rep = (insert + anchor) if where == "before" else (anchor + insert)
    s = s.replace(anchor, rep)          # in-place; keeps the rest of the file
    io.open(path, "w", encoding="utf-8").write(s)
    print(f"  patched {path} ({where})")

# 0) Tech energy label (re-applied; was lost in the earlier restore)
patch("ui.js", '  solar_energy:     "Solar Energy",',
      '  tech:             "Tech",                     // DC (Green Arrow) — the drone/trick-arrow meter\n',
      where="before", must_absent='  tech:             "Tech"')

GA_HUD = r'''// Green Arrow — Tech-meter badge (GA logo) + up to 3 drone status pips. Render-only.
// Mirrors _drawGokuLadderHud: gated on rosterKey, early-return for everyone else.
const _gaHudImgs = {}
function _gaImg(src) {
  let im = _gaHudImgs[src]
  if (!im) { im = new Image(); im.src = src; _gaHudImgs[src] = im }
  return im
}
const _GA_PIP_ICON = {
  overwatch: "./ga_overwatch_idle_sheet.png", bulwark: "./ga_bulwark_walk_sheet.png",
  aegis: "./ga_aegis_idle_sheet.png", kestrel: "./ga_kestrel_idle_sheet.png",
  skyhook: "./ga_skyhook_idle_sheet.png",
}
const _GA_PIP_COL = { overwatch: "#ff9a3c", bulwark: "#c05a4a", aegis: "#e0a93c", kestrel: "#4ad0e0", skyhook: "#ff6a2a" }
function _drawGreenArrowHud(ctx, fighter, barX, barW, barTopY, barH, flip) {
  if ((fighter?.rosterKey || "").toLowerCase() !== "green_arrow") return
  const badge = _gaImg("./green_arrow_logo.png")
  const bs = barH + 6
  const bx = flip ? (barX + barW - bs) : barX
  if (badge.complete && badge.naturalWidth > 0) {
    ctx.save(); ctx.globalAlpha = 0.95
    ctx.drawImage(badge, bx, barTopY - 1, bs, bs); ctx.restore()
  }
  const pips = Array.isArray(fighter._gaDronePips) ? fighter._gaDronePips.slice(0, 3) : []
  const pw = 16, gap = 4, py = barTopY + barH + 3
  for (let i = 0; i < 3; i++) {
    const px = flip ? (barX + barW - pw - i * (pw + gap)) : (barX + i * (pw + gap))
    ctx.save()
    ctx.fillStyle = "rgba(0,0,0,0.45)"; ctx.fillRect(px, py, pw, pw)
    const pip = pips[i]
    if (pip) {
      const col = _GA_PIP_COL[pip.type] || "#39d353"
      const alive = pip.alive !== false
      const icon = _GA_PIP_ICON[pip.type] ? _gaImg(_GA_PIP_ICON[pip.type]) : null
      if (icon && icon.complete && icon.naturalWidth > 0) {
        const fw = icon.naturalWidth / (pip.iconFrames || 4)
        ctx.globalAlpha = alive ? 1 : 0.3
        ctx.drawImage(icon, 0, 0, fw, icon.naturalHeight, px + 1, py + 2, pw - 2, pw - 4)
      } else {
        ctx.globalAlpha = alive ? 1 : 0.3
        ctx.fillStyle = col; ctx.fillRect(px + 2, py + 2, pw - 4, pw - 4)
      }
      ctx.globalAlpha = 1
      if (!alive && (pip.cdFrac || 0) > 0) {
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.beginPath()
        ctx.arc(px + pw / 2, py + pw / 2, pw / 2 - 1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - pip.cdFrac))
        ctx.stroke()
      }
      ctx.strokeStyle = alive ? col : "rgba(255,255,255,0.25)"; ctx.lineWidth = 1
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, pw - 1)
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.15)"; ctx.lineWidth = 1
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, pw - 1)
    }
    ctx.restore()
  }
}

'''

patch("ui.js", "function _drawGokuLadderHud(ctx, fighter, barX, barW, barTopY, barH, flip) {",
      GA_HUD, where="before", must_absent="function _drawGreenArrowHud")
patch("ui.js",
      "    _drawGokuLadderHud(ctx, fighter, x + 8, barW, hpY + 14, barH, flip)   // GOKU form pips + UI/exhaust bar\n",
      "    _drawGreenArrowHud(ctx, fighter, x + 8, barW, hpY + 14, barH, flip)   // GREEN ARROW Tech badge + drone pips\n",
      where="after", must_absent="_drawGreenArrowHud(ctx, fighter, x + 8")
patch("ui.js",
      "    _drawGokuLadderHud(ctx, fighter, trackX, tBarW, trackY, barH, flip)   // GOKU form pips + UI/exhaust bar\n",
      "    _drawGreenArrowHud(ctx, fighter, trackX, tBarW, trackY, barH, flip)   // GREEN ARROW Tech badge + drone pips\n",
      where="after", must_absent="_drawGreenArrowHud(ctx, fighter, trackX")
print("Phase 2 HUD applied.")
