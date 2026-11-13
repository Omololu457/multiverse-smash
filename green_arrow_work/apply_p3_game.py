import io, sys
IMP_A=', drawDrones, resetDrones, activeDrones'
IMP_N=', drawDrones, drawGreenArrowFx, resetDrones, activeDrones'
CALL_A='  drawDrones(ctx, globalFrameCount, camera)   // GREEN ARROW drones — world space, over fighters\n'
CALL_N=CALL_A+'  drawGreenArrowFx(ctx, [p1, p2], globalFrameCount)   // GREEN ARROW status FX (net/flash/rings) — render-only\n'
def patch(path):
    s=io.open(path,encoding="utf-8").read()
    if "drawGreenArrowFx(ctx" in s: print(f"  SKIP {path}"); return
    for a,n,l in [(IMP_A,IMP_N,"import"),(CALL_A,CALL_N,"call")]:
        c=s.count(a)
        if c!=1: print(f"  !! {path}: {l} {c}"); sys.exit(1)
        s=s.replace(a,n)
    io.open(path,"w",encoding="utf-8").write(s); print(f"  {path} patched")
for p in sys.argv[1:]: patch(p)
