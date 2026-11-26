import { makeSquad } from './squadCore.js'
import {
  SAMURAI_ID, SAMURAI_FORMS, SAMURAI_NAMES, SAMURAI_BUTTONS, SAMURAI_COLORS,
  SAMURAI_PORTRAIT, SAMURAI_ZORD_COST, SAMURAI_START_PREFIX,
} from './samuraiData.js'

const byForm = values => Object.fromEntries(SAMURAI_FORMS.map((form, i) => [form, values[i]]))
export const SAMURAI_SQUAD = makeSquad({
  id: SAMURAI_ID,
  forms: SAMURAI_FORMS,
  buttons: SAMURAI_BUTTONS,
  chars: {},
  colors: byForm(SAMURAI_COLORS),
  short: byForm(SAMURAI_NAMES.map(name => name.toUpperCase())),
  roles: byForm(['any', 'far', 'mid', 'mid', 'far', 'close']),
  tuning: { health: 1320, cooldown: 40, invuln: 6, flash: 14, dbl: 16, arm: 18 },
  startPrefix: SAMURAI_START_PREFIX,
  startNames: Object.fromEntries(SAMURAI_NAMES.map((name, i) => [name.toLowerCase(), SAMURAI_FORMS[i]])),
  teamUlt: false,
  consumeRefusedDial: true,
  busy: fighter => fighter._megaMorphTimer > 0,
  clear: fighter => {
    fighter._samUpActive = false
    fighter._samUpHold = 0
    fighter._samUpRelease = 0
  },
  onSwap: (fighter, _form, _from, world) => world?.restoreSamuraiMega?.(fighter),
  onTick: tickSamuraiInput,
  cpu: chooseSamuraiZord,
})

export function samuraiSquadEntry(forms) {
  const identities = ['Jayden Shiba', 'Kevin', 'Mike', 'Emily', 'Mia Watanabe', 'Antonio Garcia']
  for (const [index, key] of SAMURAI_FORMS.entries()) {
    const ranger = forms[key]
    ranger.displayName = ranger.name
    ranger.hudIcon = ranger.portrait
    ranger.color = SAMURAI_COLORS[index]
    ranger.civilianIdentity = identities[index]
    SAMURAI_SQUAD.registerForm(key, ranger)
  }
  const red = forms.samurai_red_ranger
  return {
    ...red,
    rosterKey: SAMURAI_ID, hidden: false, name: 'Samurai Rangers',
    displayName: 'Samurai Rangers', hudName: 'Samurai Rangers', subtitle: 'Power Rangers Samurai',
    series: 'Power Rangers Samurai', portrait: SAMURAI_PORTRAIT, hudIcon: SAMURAI_PORTRAIT,
    archetype: 'Squad / Form Swapper', difficulty: 5,
    bio: 'Jayden, Kevin, Mike, Emily, Mia and Antonio share one fight. Double-tap Down, then call Red, Blue, Green, Yellow, Pink or Gold. Hold Charge to reach Mega Mode. A direction plus Ultimate calls one of four Megazords.',
    stats: { ...red.stats, maxHealth: SAMURAI_SQUAD.tuning.health },
    isSquad: true, squadForms: SAMURAI_FORMS,
  }
}

// The armed dial has priority, including its Ultimate button for Gold. A
// direction held with an unarmed Ultimate selects a Megazord over the solo super.
function tickSamuraiInput(fighter, raw, world) {
  const squad = fighter._squad
  // Use simulation frames for Charge so controller, replay and network inputs
  // follow the same release rules. A Charge used by the dial never toggles Mega.
  if (!raw.charge && squad.samuraiChargeAt != null) {
    world?.releaseSamuraiCharge?.(fighter, squad.t - squad.samuraiChargeAt < 12)
    squad.samuraiChargeAt = null
  } else if (raw.charge && squad.armT <= 0 && !fighter._squadEat?.charge && squad.samuraiChargeAt == null) {
    squad.samuraiChargeAt = squad.t
  }
  if (!raw.ultimate) squad.samuraiZordPress = false
  if (squad.armT > 0 || !raw.ultimate) return
  const up = raw.up || raw.jump
  const forward = fighter.facing === -1 ? raw.left : raw.right
  const backward = fighter.facing === -1 ? raw.right : raw.left
  const zord = up ? 'battlewing' : raw.down ? 'octo' : forward ? 'tiger' : backward ? 'swordfish' : null
  if (!squad.samuraiZordPress && (squad.uAt !== squad.t || !zord)) return
  if (!squad.samuraiZordPress) {
    squad.samuraiZordPress = true
    world?.castSamuraiZord?.(fighter, zord)
  }
  fighter._squadEat = { ...fighter._squadEat, ultimate: true, ...(up ? { up: true, jump: true } : {}) }
}

function chooseSamuraiZord(fighter, opponent, _difficulty, world) {
  if ((fighter.energy ?? 0) < SAMURAI_ZORD_COST) return false
  const distance = Math.abs(opponent.x - fighter.x)
  if (distance > 490) return false
  const facing = opponent.x >= fighter.x ? 1 : -1
  if (fighter.facing !== facing) return false
  const zord = opponent.y + opponent.h < fighter.y + fighter.h - 95 ? 'battlewing'
    : distance > 200 ? 'tiger' : distance > 95 ? 'octo' : 'swordfish'
  return world?.castSamuraiZord?.(fighter, zord) === true
}
