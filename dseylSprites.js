// DSEYL (dseyl) — animation table. The SAME frames, sizes, anchors and timing as Syndrome's (syndromeSprites.js, read
// by reference) pointed at Dseyl's edited copies in assets/dseyl/ (tools/dseyl/build_sprites.py: recolour + trim of
// copies of Syndrome's strips). Flight poses reuse existing airborne strips — no new art.
import { SYNDROME_ANIM } from './syndromeSprites.js'

const retarget = d => d?.sheet ? { ...d, sheet: d.sheet.replace('./assets/syndrome/', './assets/dseyl/') } : d
export const DSEYL_ANIM = Object.fromEntries(Object.entries(SYNDROME_ANIM).map(([k, d]) => [k, retarget(d)]))
const loop = d => ({ ...d, loop: true, lockLastFrame: false })
// flight.js poseKey → sprite.js action (flyHover / flyCruise / flyRise / flyDive / flyTurn / flyDash / takeoff; 'land' exists)
export const DSEYL_FLIGHT_ANIM = {
  flyHover: loop(DSEYL_ANIM.doubleJump),   // rocket-boot thrust pose
  flyTurn: loop(DSEYL_ANIM.doubleJump),
  flyRise: loop(DSEYL_ANIM.jump),
  flyDive: loop(DSEYL_ANIM.fall),
  flyCruise: loop(DSEYL_ANIM.dash),
  flyDash: loop(DSEYL_ANIM.dash),
  takeoff: { ...DSEYL_ANIM.jump },
}
