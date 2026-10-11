// academyTags.js — CHARACTER ACADEMY scenario TAGS (additive, isolated — NO kit edits). Each tag names a
// scenario the move needs; a tag maps to a dummy behaviour + a state setup that game.js applies to the Academy's
// OWN match instance only. Tags are INFERRED from the kit's textual data where possible, with a small curated
// OVERRIDE map for the moves inference can't read from prose. This file is pure data/logic; it never touches
// combat.js, kits, or balance.
//
// TAG VOCABULARY (brief Phase 2):
//   incoming_melee            dummy attacks on a loop (Kawarimi, counters, Read, parries)
//   incoming_projectile       dummy fires its projectile (Copy Ninja, reflects, Portal Redirect, Ult Defense)
//   target_airborne           dummy jumps (anti-airs, air grabs)
//   player_corner             the player starts in the corner (corner-rule moves)
//   target_corner             the dummy starts in the corner
//   full_chakra               the player starts at full meter (Susanoo ladders, big ults)
//   set_meter:<name>=<value>  a named meter/gauge/charge preset (bond, gauge, flicker charges, susano stage)
//   low_hp                    the player starts at low HP (awakenings, comebacks)
//   mode_active:<mode>        the move only exists inside a form → enter that form first
//   opponent:<rosterKey>      the dummy is a specific fighter (matchup moves)
//   opponent_mode:<mode>      the dummy is in a specific form (e.g. an Uchiha in Susanoo)
//   summon_active             a summon must be out first
//   combo_followup            the move must follow another move

// Normalize a move name for keying the override map.
function _mk(name) { return String(name || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") }

// ── OVERRIDE map: `rosterKey|normalized_move_name` → explicit tags. Only for moves whose scenario isn't clear
// from the prose (the showcase + complex cases the brief calls out). Everything else is inferred below. ──
export const ACADEMY_TAG_OVERRIDES = {
  // Kakashi (Kamui) — the brief's showcase defensive reads
  "kakashi_war|kawarimi":            ["incoming_melee"],
  "kakashi_war|copy_ninja":          ["incoming_projectile"],
  "kakashi_war|sharingan_read":      ["incoming_melee"],
  "kakashi_war|obito_s_gift":        ["set_meter:bond=100"],
  "kakashi_war|perfect_susanoo":     ["mode_active:gift"],
  "kakashi_anbu|sharingan_read":     ["incoming_melee"],
  "kakashi_anbu|copy_ninja":         ["incoming_projectile"],
  // Shisui (Fallen) — the brief's matchup showcase
  "shisui_fallen|kotoamatsukami":    ["opponent:itachi", "opponent_mode:susanoo"],
  "shisui_fallen|afterimage_feint":  ["incoming_melee"],
  "shisui_fallen|complete_susanoo_tier_2": ["mode_active:susanoo"],
  "shisui_fallen|totsuka_seal":      ["mode_active:susanoo"],
  "shisui_fallen|yasaka_magatama":   ["mode_active:susanoo"],
  // Shisui (Trinity) — corner rule
  "shisui_trinity|mangekyou_signal": ["target_corner"],
  // Sasuke (Sensei) — eye-set / Susanoo
  "sasuke_sensei|susanoo_arm_grab":  ["mode_active:susanoo"],
  // Gaara — Shukaku channel risk + sand
  "gaara|tailed_beast_ball":         ["mode_active:shukaku"],
  // Madara — ladder / avatar
  "madara|tengai_shinsei":           ["full_chakra"],
}

// Infer tags from the kit's own prose (name + input + desc). Returns a de-duped tag array.
export function academyTagsFor(lesson, rosterKey) {
  const over = ACADEMY_TAG_OVERRIDES[`${rosterKey}|${_mk(lesson.name)}`]
  if (over) return over.slice()
  const t = `${lesson.name} ${lesson.input} ${lesson.desc}`.toLowerCase()
  const tags = []
  const push = (x) => { if (!tags.includes(x)) tags.push(x) }
  // defensive reads vs an attacking dummy
  if (/kawarimi|substitut|counter|\bread\b|punish|guard.?escape|reversal|parry|reflect(s)? (a|an|the)? ?(attack|strike|melee|hit)|when (hit|struck|attacked)|block(stun)?\+/.test(t)) push("incoming_melee")
  // vs a projectile the dummy fires
  if (/copy ninja|portal redirect|\bredirect\b|\breflect\b|absorb|deflect|ultimate defense|negat(e|es)|counter.*(projectile|ranged|bullet)/.test(t)) push("incoming_projectile")
  // vs an airborne dummy
  if (/anti-?air|air ?grab|juggle|launch(er)?|rising|while.*(airborne|in the air)|airborne foe/.test(t)) push("target_airborne")
  // corner rules
  if (/corner/.test(t)) push(/player|you(r)?/.test(t) ? "player_corner" : "target_corner")
  // meters / ladders / big ults
  if (/full (chakra|meter|energy)|at full|requires? .*full/.test(t)) push("full_chakra")
  if (/\b(bond)\b/.test(t)) push("set_meter:bond=100")
  else if (/one-?tail|shukaku gauge|sand gauge/.test(t)) push("set_meter:gauge=100")
  else if (/flicker charge|charges? (regenerate|remaining)/.test(t)) push("set_meter:flicker=3")
  else if (/susano|ladder|\btier\b|climb/.test(t)) push("full_chakra")
  // low-hp gated
  if (/low (hp|health)|comeback|awaken|≤ ?25%|below .*(hp|%)|rage|near death|on the brink/.test(t)) push("low_hp")
  // form-gated
  const mode = t.match(/(?:while|inside|during|only in|requires?|in)\s+(?:the\s+)?(susano'?o|susanoo|sharingan|mangeky[oō]u?|kcm|cloak|flicker time|bankai|rose|karma|stance|avatar|kurama|four-?tails|rikudou|shukaku|hermit|gift)/)
  if (mode) push(`mode_active:${mode[1].replace(/[^a-z]/g, "")}`)
  // summon-gated
  if (/needs the summon|while .*summon (is )?(out|active)|command(s)? (the )?(summon|clone|dog|ninken|toad|gamabunta|shukaku|kurama)|with .* (out|summoned)|fires? (a )?bijuudama/.test(t)) push("summon_active")
  // follow-up
  if (/follow-?up|after (a|an|the)|on hit|cancel(s)? (from|into)?|links? (from|into)|continues|re-?tap|then (a|the)/.test(t)) push("combo_followup")
  return tags
}

// Turn a tag array into a plain SCENARIO DESCRIPTOR that game.js applies to its own match instance.
export function scenarioFromTags(tags = []) {
  const sc = { dummy: "stand", p2Fire: false, p1Corner: false, p2Corner: false, fullChakra: false,
               setMeters: [], lowHp: false, p1Mode: null, opponent: null, p2Mode: null, summon: false, followup: false, notes: [] }
  for (const tag of tags) {
    if (tag === "incoming_melee") { sc.dummy = "combo"; sc.notes.push("the dummy attacks — react to it") }
    else if (tag === "incoming_projectile") { sc.p2Fire = true; sc.notes.push("the dummy fires a projectile") }
    else if (tag === "target_airborne") { sc.dummy = "jump"; sc.notes.push("the dummy is jumping") }
    else if (tag === "player_corner") { sc.p1Corner = true; sc.notes.push("you're in the corner") }
    else if (tag === "target_corner") { sc.p2Corner = true; sc.notes.push("the foe is in the corner") }
    else if (tag === "full_chakra") { sc.fullChakra = true }
    else if (tag.startsWith("set_meter:")) { const m = tag.slice(10).match(/^([\w]+)=([\d]+)$/); if (m) sc.setMeters.push({ name: m[1], value: +m[2] }) }
    else if (tag === "low_hp") { sc.lowHp = true; sc.notes.push("you're at low HP") }
    else if (tag.startsWith("mode_active:")) { sc.p1Mode = tag.slice(12); sc.fullChakra = true }
    else if (tag.startsWith("opponent:")) { sc.opponent = tag.slice(9) }
    else if (tag.startsWith("opponent_mode:")) { sc.p2Mode = tag.slice(14) }
    else if (tag === "summon_active") { sc.summon = true; sc.fullChakra = true }
    else if (tag === "combo_followup") { sc.followup = true }
  }
  return sc
}
