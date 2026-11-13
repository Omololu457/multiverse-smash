import io, sys
A='''  if (badge.complete && badge.naturalWidth > 0) {
    ctx.save(); ctx.globalAlpha = 0.95
    ctx.drawImage(badge, bx, barTopY - 1, bs, bs); ctx.restore()
  }'''
N=A+'''
  // QUIVER indicator — the selected special arrow (procedural chip, not sprite art): N/F/B/G.
  const _gq = ["N", "F", "B", "G"], _gqc = ["#6fd0ff", "#fff07a", "#39d353", "#b79bff"]
  const qi = (fighter._gaQuiver || 0) % 4, qs = barH + 4
  const qx = flip ? (barX + barW - bs - qs - 2) : (barX + bs + 2)
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(qx, barTopY, qs, qs)
  ctx.strokeStyle = _gqc[qi]; ctx.lineWidth = 1.5; ctx.strokeRect(qx + 0.5, barTopY + 0.5, qs - 1, qs - 1)
  ctx.fillStyle = _gqc[qi]; ctx.font = "bold 10px monospace"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.fillText(_gq[qi], qx + qs / 2, barTopY + qs / 2 + 0.5); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"
  ctx.restore()'''
def patch(path):
    s=io.open(path,encoding="utf-8").read()
    if "QUIVER indicator" in s: print(f"  SKIP {path}"); return
    c=s.count(A)
    if c!=1: print(f"  !! {path}: {c}"); sys.exit(1)
    io.open(path,"w",encoding="utf-8").write(s.replace(A,N)); print(f"  {path} patched")
for p in sys.argv[1:]: patch(p)
