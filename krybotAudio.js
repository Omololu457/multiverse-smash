import { sound, SFX } from './sound.js'
export function playKrybotCues(f) {
  const q=f?._krybot?.cues
  if(!q?.length)return
  for(const c of q) sound.play(c==='blast'?SFX.HIT_PROJECTILE:c==='explosion'?SFX.HIT_ULTIMATE:SFX.WHIFF)
  q.length=0
}
