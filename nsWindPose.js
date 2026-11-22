// MSV1 — Ninja Storm Shane / Dustin sprite POSE resolver (render-only read of f._ninja; zero imports so sprite.js can
// import it without a cycle). Returns the strip name for framework states the normal attack path doesn't cover, or null.
export function nsWindPose(f) {
  if (!f || (f.rosterKey !== 'ns_red' && f.rosterKey !== 'ns_yellow')) return null
  const s = f._ninja; if (!s) return null
  if ((f.hitstun || 0) > 0 || f.knockdownState || f.isGrabbed || f.health <= 0) return null
  if (s.seq) return f.currentMove && f.animationData?.[f.currentMove] ? f.currentMove : 'guard'
  if (s.streak) return s.streak.t < 2 ? 'streak' : (s.streak.strike ? 'flipKick' : 'streakTail')
  if (s.vanish) return 'smoke'
  if (s.swap) return 'smokeFade'
  if (s.counter) return 'stance'
  if (s.barrier) return s.barrier.kind === 'armor' ? 'guard' : 'dome'
  if (s.burrow) return 'crouch'
  if (f.attacking && f.currentAttack?.nj) { const k = f.currentAttack.nj.key; return f.animationData?.[k] ? k : null }
  if ((f._ninjaFloat || 0) > 0) return 'airRecover'
  if (s.chainRec > 6) return 'skid'
  return null
}
