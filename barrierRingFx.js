// Existing Absolute Defense generic ring underlay, factored without its costume sheet.
// Render-only; optional tint for other barrier users. Defaults preserve existing appearance.
export function drawBarrierRing(c,{cx,cy,r,t,color='#c4b5fd',glow='#8b5cf6'}){
 c.save();c.strokeStyle=color;c.shadowBlur=16;c.shadowColor=glow;c.lineWidth=3
 c.globalAlpha=0.30+Math.sin(t)*0.08;c.beginPath();c.arc(cx,cy,r,0,Math.PI*2);c.stroke()
 c.globalAlpha=0.14;c.beginPath();c.arc(cx,cy,r*0.78,0,Math.PI*2);c.stroke();c.restore()
}
