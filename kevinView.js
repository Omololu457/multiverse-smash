import { KEVIN_ART, KEVIN_SKINS, KEVIN_SCALE, MATERIALS, SAMPLE_IDS, SHOT_FAMILIES } from './kevinData.js'
import { isKevin, kevinForm, kevinHand, kevinContacts } from './kevinState.js'
import { cachedSpriteSheet, GLOBAL_SPRITE_SCALE } from './sprite.js'

const art = f => KEVIN_ART[f.skinId] || KEVIN_ART.default
const accent = f => KEVIN_SKINS.find(s=>s.id===f.skinId)?.accent || KEVIN_SKINS[0].accent

export function kevinVisual(f) {
  if (!isKevin(f)) return
  const s=f._kevin, k=f.currentAttack?.kevin
  const maps=art(f)
  const visual=k?.key==='kTransform'?'human':kevinForm(f)||f._kevinDefeat?'ultimate':
    k?.sample || s?.material || (s?.dissolved>(s?.tick || 0) && !f.vx?s.dissolvedMaterial:'human')
  f._skinAnim=maps[visual] || maps.human
}
export function kevinAction(f) {
  if (!isKevin(f)) return null
  const s=f._kevin
  if (s?.cinematic) return s.cinematic.t<22?'kCashLift':'kCashArc'
  if (f.health<=0 || f.hitstun>0 || f.isGrabbed || f.knockdownState || f.isBlocking) return null
  if (s?.grabUntil>(s?.tick || 0)) return 'kGrabHold'
  if (f.attacking && f.currentAttack?.kevin) return f.currentAttack.name
  if (s?.dissolved>(s?.tick || 0) && !f.vx && f.onGround && !s.material) return 'kShed'
  return null
}

function frame(ctx,action,i,x,y,dir,scale=1) {
  const image=cachedSpriteSheet(action.sheet)
  if (!image?.complete || !image.naturalWidth) return
  const n=Math.min(action.frames-1,i)
  const w=action.width*scale,h=action.height*scale
  ctx.save()
  ctx.imageSmoothingEnabled=false
  ctx.translate(x,y)
  ctx.scale(dir,1)
  ctx.drawImage(image,action.sourceX+n*action.width,action.sourceY,action.width,action.height,-w/2,-h/2,w,h)
  ctx.restore()
}
function energy(ctx,family,x,y,r,dir) {
  const hue=SHOT_FAMILIES[family].color
  ctx.save()
  ctx.translate(x,y)
  ctx.scale(dir,1)
  ctx.strokeStyle=hue
  ctx.fillStyle=hue
  ctx.lineWidth=2
  if (family==='star' || family==='ki' || family==='cyanKi') {
    ctx.beginPath()
    ctx.moveTo(-r*1.5,0);ctx.lineTo(0,-r*.65);ctx.lineTo(r,0);ctx.lineTo(0,r*.65);ctx.closePath();ctx.fill()
  } else {
    ctx.beginPath();ctx.ellipse(0,0,r,r*.69,0,0,Math.PI*2);ctx.stroke()
    ctx.beginPath();ctx.ellipse(0,0,r*.66,r*.44,0,0,Math.PI*2);ctx.fill()
  }
  ctx.fillStyle='#fffbed';ctx.beginPath();ctx.arc(2,0,r*.3,0,Math.PI*2);ctx.fill()
  ctx.restore()
}

export function drawKevinShot(ctx,p) {
  if (!p.kevinShot) return false
  const {kind,dir}=p.kevinShot
  const a=art(p.owner).human[kind]
  if (a) frame(ctx,a,Math.floor((p.age || 0)/a.speed),p.x,p.y,dir,kind==='fxBoulder'?1.42:1.7)
  else if (SHOT_FAMILIES[kind]) energy(ctx,kind,p.x,p.y,p.radius,dir)
  return true
}

export function drawKevinContacts(ctx,fighters,width,floor) {
  if (!fighters.some(isKevin)) return
  ctx.save()
  for (const {material,x,y} of kevinContacts(width,floor)) {
    const m=MATERIALS[material]
    ctx.fillStyle='#13212c';ctx.fillRect(x-23,y-16,46,16)
    ctx.fillStyle=m.color;ctx.fillRect(x-20,y-16,40,2)
    ctx.font='bold 12px sans-serif';ctx.textAlign='center'
    ctx.fillText(m.icon,x,y-3)
  }
  ctx.restore()
}

export function drawKevinFx(ctx,fighters) {
  for (const f of fighters) {
    if (!isKevin(f) || !f._kevin) continue
    const s=f._kevin,a=f.attacking?f.currentAttack:null,k=a?.kevin
    const t=a?a.total-a.timer:0,dir=k?.dir || f.facing || 1, hand=kevinHand(f,dir)
    if (k?.key==='kCarSample') {
      const cell=art(f).human.fxCar
      frame(ctx,cell,0,f.x+f.w/2-dir*100,f.y+f.h-cell.height*1.05,dir,2.08)
    }
    if (s.intake && s.tick-s.intake.at<12) {
      const {family,x,y,at}=s.intake, q=Math.min(1,(s.tick-at+1)/5)
      energy(ctx,family,x+(hand.x-x)*q,y+(hand.y-y)*q,18-11*q,dir)
    }
    if (k?.charge && t<=a.activeEnd+3) {
      energy(ctx,k.charge.family,hand.x,hand.y,Math.min(21,7+t),dir)
    }
    if (k?.key==='kMine' && t>=a.activeStart && t<=a.activeEnd) {
      ctx.save();ctx.strokeStyle=accent(f);ctx.lineWidth=2
      ctx.beginPath();ctx.arc(hand.x,hand.y,8+(t%5),0,Math.PI*2);ctx.stroke();ctx.restore()
    }
    if (k?.key==='kArmor' && t>=a.activeStart && t<a.activeEnd+6) {
      const size=8+(t-a.activeStart)*3
      ctx.save();ctx.strokeStyle=accent(f);ctx.lineWidth=2
      ctx.globalAlpha=Math.max(.2,1-(t-a.activeStart)/11)
      ctx.beginPath();ctx.ellipse(hand.x+dir*10,hand.y,size*.45,size,0,0,Math.PI*2);ctx.stroke()
      ctx.restore()
    }
    if (k?.key==='kFurnace' && t>=a.activeStart && t<a.activeStart+19) {
      frame(ctx,art(f).human.fxFlame,Math.floor((t-a.activeStart)/3),hand.x+dir*16,hand.y+28+Math.min(67,(t-a.activeStart)*5),dir,KEVIN_SCALE*GLOBAL_SPRITE_SCALE*.85)
    }
    if (s.cinematic?.t>=41) {
      const {x,feet,t}=s.cinematic, tick=t-41
      ctx.save();ctx.strokeStyle=accent(f);ctx.lineWidth=3;ctx.globalAlpha=1-tick/10
      for (let i=0;i<2;i++) {
        const w=18+tick*9+i*13
        ctx.beginPath();ctx.ellipse(x,feet,w,3+w*.14,0,0,Math.PI*2);ctx.stroke()
      }
      ctx.restore()
    }
    if (s.debris && s.tick-s.debris.at<15) {
      frame(ctx,art(f).human.fxDebris,Math.floor((s.tick-s.debris.at)/3),s.debris.x,s.debris.y,s.debris.dir,1.5)
    }
  }
}
export function drawKevinHud(ctx,canvas,fighters,slot=null) {
  for (const f of fighters) {
    if (!isKevin(f)) continue
    const s=f._kevin, right=!slot && f.side==='p2', x=slot?.x ?? (right?canvas.width-30:30)
    const top=slot?.top ?? 126, width=Math.min(219,slot?.width ?? 219)
    const selected=MATERIALS[SAMPLE_IDS[s?.selected || 0]]
    const material=MATERIALS[s?.material]
    const ultimate=s?.formUntil>(s?.tick || 0)
    const shot=SHOT_FAMILIES[s?.stored?.family]
    const left=right?x-width:x
    ctx.save()
    ctx.fillStyle='rgba(13,24,34,.91)';ctx.fillRect(left,top,width,56)
    ctx.fillStyle=ultimate?'#ffdc78':material?.color || '#e9edf6'
    ctx.font='bold 13px sans-serif';ctx.textAlign=right?'right':'left'
    const inset=x+(right?-9:9)
    const timer=until=>Math.ceil(Math.max(0,until-(s?.tick || 0))/60)+'s'
    ctx.fillText(ultimate?'Ultimate Kevin  '+timer(s.formUntil):material?material.icon+'  '+material.name+'  '+timer(s.coatUntil):'Uncoated',inset,top+16)
    ctx.fillStyle=selected.color;ctx.font='12px sans-serif'
    ctx.fillText('Sample  '+selected.icon+'  '+selected.name,inset,top+31)
    ctx.fillStyle=shot?.color || '#a8bfce'
    ctx.fillText(shot?'SHOT STORED  '+shot.icon+' '+shot.label+'  '+timer(s.stored.until):
      s?.catchUntil>(s?.tick || 0)?'Mine Now recharging':'Shot slot empty',inset,top+47)
    ctx.restore()
  }
}
