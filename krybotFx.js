// Presentation only: supplied pixels, nearest neighbour, no gameplay writes.
import { KRYBOT_CROSSFIRE_SPACING } from './krybotState.js'
const images=new Map()
function img(path) { if(!images.has(path)) { const im=new Image(); im.src=path; images.set(path,im) } return images.get(path) }
const bodySheet=(f,action)=>f._skinAnim?.[action]?.sheet || f.animationData?.[action]?.sheet || './assets/krybot/'+action+'.png'
function body(c,f,action,x,feet,dir,frame=0) {
  const im=img(bodySheet(f,action)); if(!im.complete || !im.naturalWidth)return
  const sc=2.2
  c.save();c.imageSmoothingEnabled=false;c.translate(x,feet);c.scale(dir,1)
  c.drawImage(im,frame*112,0,112,88,-56*sc,-80*sc,112*sc,88*sc);c.restore()
}
export function drawKrybotFx(c,f,stageWidth=3200) {
  if(f?.rosterKey!=='krybot' || !f._krybot || f.health<=0)return
  // Warm helper art during ordinary idle, before the helper's telegraphed entry.
  img(bodySheet(f,'walk'));img(bodySheet(f,'kBlaster'));img('./assets/krybot/explosion.png')
  const s=f._krybot,h=s.helper,ult=s.super
  if(h) {
    body(c,f,h.age<8||h.age>45?'walk':'kBlaster',h.x,h.feet,h.age>45?-h.dir:h.dir,h.age<8||h.age>45?Math.floor(h.age/5)%8:1)
    c.save();c.font='10px monospace';c.textAlign='center';c.fillStyle=f.side==='p2'?'#ff8a80':'#80d8ff';c.fillText(String(f.side||'').toUpperCase()+' UNIT',h.x,h.feet-128);c.restore()
  }
  if(ult)for(const dir of [ult.dir,-ult.dir])body(c,f,'kBlaster',Math.max(30,Math.min(stageWidth-30,ult.impactX-dir*KRYBOT_CROSSFIRE_SPACING)),ult.feet,dir,1)
  // The damage projectile is consumed on contact by the shared pipeline. Keep
  // the supplied explosion's entire five-cell visual playing independently.
  if(ult && ult.age>=30) {
    const im=img('./assets/krybot/explosion.png'),fi=Math.min(4,Math.floor((ult.age-30)/2)),size=64*1.6
    if(im.complete&&im.naturalWidth){c.save();c.imageSmoothingEnabled=false;c.drawImage(im,fi*64,0,64,64,ult.impactX-size/2,ult.impactY-size/2,size,size);c.restore()}
  }
  // Existing HUD-style text indicator; authoritative mark is only in sim state.
  if(s.mark?.left>0) { c.save();c.font='bold 11px monospace';c.fillStyle='#ffb34b';c.textAlign='center';c.fillText('COORDINATED FIRE',f.x+f.w/2,f.y-18);c.restore() }
}
