// greenArrowBowAnchors.js
// BOW ORIGIN for Green Arrow — where an arrow leaves his bow, in world space. Same spirit as
// supermanEyeAnchors.js / homelanderEyeAnchors.js (fire from the real body part, not a fixed box
// fraction), but an arrow is a one-shot projectile that spawns on a single frame — and on that frame
// the sprite is usually still his NARROW idle pose (the draw/aim pose renders a frame later). So we
// can't just read the current drawn width. Instead we take the VERTICAL (chest/bow height) from the
// real drawn rect (reliable across poses) and project the bow's FORWARD reach from the body centre,
// scaled by the sprite — so the arrow leaves the extended bow at any sprite scale, grounded or airborne.
//
// BOW_FWD / BOW_BY are tuned against the aim/draw sheets (bow held forward at chest height).
const BOW_FWD = 52   // px the bow sits forward of body-centre at spriteScale 1.5 (scales with the sprite)
const BOW_BY  = 0.28  // bow height as a fraction down from the top of the drawn sprite

export function getGreenArrowBowWorld(fighter) {
  const face = fighter.facing || 1
  const s = (fighter.spriteScale || 1.5) / 1.5
  const cx = (fighter.x || 0) + (fighter.w || 60) / 2
  // VERTICAL — from the real drawn rect (bow/chest height); fall back to the physics box pre-first-draw.
  const T = fighter._lastDrawY, H = fighter._lastDrawH
  const y = (T != null && H) ? T + BOW_BY * H : (fighter.y || 0) + (fighter.h || 100) * 0.45
  // HORIZONTAL — forward of the body centre by a sprite-scaled reach (the aim pose extends the bow
  // forward; the current frame may be the narrow idle, so project rather than read its width).
  return { x: cx + face * BOW_FWD * s, y }
}
