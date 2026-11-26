// signatureFatality.js — SIGNATURE FATALITIES: every fighter's most defining trait as an in-game finisher.
// In the match-end FINISH window the winner presses SPECIAL (L, any direction): the arena darkens and the winner
// performs THEIR technique on the beaten opponent, in the arena with the real sprites (same blueprint as Screen
// Breaker — no cutaway): Gojo's HOLLOW PURPLE erases them in a purple sweep with the map gone black, Sukuna dices them,
// Itachi burns them in black Amaterasu, Light writes their name in the Death Note, Saitama punches them into orbit…
// One engine, 19 effect kinds; SIG maps every rosterKey to { kind, name, colour, variant }. Unmapped fighters fall
// back to a universe default. Purely cosmetic (the match is already decided); frame-driven; hands back to victory.
// The victim's real sprite frame is redrawn here (sprite.js _fxRecord → _lastFrameDraw) so it can be cut in half,
// shattered, burned, frozen, squashed, dissolved or sucked into a vortex; the original draw is hidden (_fxAlpha 0).
import { sound } from "./sound.js"
import { camera } from "./camera.js"
import { characters } from "./characters.js"
import { getKit } from "./kits.js"
import { goreReset, goreSetup, goreUpdate, goreDraw, goreDrawScreen, goreDismember, goreWound, goreSpray, goreSpurt, goreLens, goreMist, goreState } from "./goreFx.js"

// kind, technique, colour, variant
const SIG = {
  goku: ["beam", "KAMEHAMEHA", "#6ec8ff"], goku_black: ["slash", "DIVINE LASSO", "#ff5ab4", 3], vegeta: ["beam", "FINAL FLASH", "#ffe95a"],
  vegeta_dark: ["explode", "BIG BANG ATTACK", "#8ad0ff"], beerus: ["erase", "HAKAI", "#c07aff"],
  gojo: ["void", "HOLLOW PURPLE", "#a64dff"], gojo_shinjuku: ["void", "HOLLOW PURPLE · 200%", "#b45cff"],
  sukuna: ["dismantle", "CLEAVE · DISMANTLE", "#ff3a3a"], sukuna_shinjuku: ["fire", "FUGA · DIVINE FLAME", "#ff7a20"], alt_sukuna: ["dismantle", "WORLD-CUTTING SLASH", "#ff2a4a"],
  aoi_todo: ["punch", "BOOGIE WOOGIE · BLACK FLASH", "#e01a1a"], maki: ["slash", "SPLIT SOUL KATANA", "#d8f0d8", 2], toji: ["slash", "INVERTED SPEAR OF HEAVEN", "#c8c8d8", 4],
  yuji: ["punch", "BLACK FLASH", "#e01a1a"], miwa: ["slash", "SIMPLE DOMAIN · BATTŌ", "#a8c8ff", 1], yuta: ["beam", "RIKA · PURE LOVE", "#e8e0ff"],
  megumi_fushiguro: ["vortex", "CHIMERA SHADOW GARDEN", "#2a2a5a"], higuruma: ["slash", "EXECUTIONER'S SWORD · GUILTY", "#e8d8a8", 1],
  omololu: ["vortex", "KAMUI", "#7a3cff"], dseyl: ["blitz", "FLASH TIME", "#ffd060"], enoch: ["ice", "ICE STANCE · SHATTER", "#9fe2ff"], jesus: ["holy", "ASCENSION", "#ffe9a0"],
  baki: ["punch", "DEMON BACK", "#ff3020"], ippo: ["punch", "DEMPSEY ROLL", "#ff4a4a"], saitama: ["punch", "SERIOUS PUNCH", "#ffffff"], genos: ["beam", "INCINERATION CANNON", "#ff9a2a"],
  naruto: ["explode", "RASENSHURIKEN", "#7ad8ff"], naruto_seventh: ["erase", "BARYON MODE", "#ff8a3a"], sasuke: ["lightning", "CHIDORI", "#8ab8ff"], sasuke_adult: ["lightning", "KIRIN", "#b0c8ff"],
  sasuke_sensei: ["lightning", "INDRA'S ARROW", "#a07aff"], itachi: ["fire", "AMATERASU", "#140814", "black"], tobirama: ["slash", "FLYING THUNDER GOD SLASH", "#a8e0ff", 1],
  hashirama: ["bind", "WOOD STYLE · DEEP FOREST", "#7a5a2a", "wood"], minato: ["blitz", "FLYING THUNDER GOD", "#ffd84a"], madara: ["crush", "TENGAI SHINSEI", "#8a6a4a", "meteor"],
  obito: ["vortex", "KAMUI", "#6a3ad8"], tobi: ["vortex", "KAMUI", "#8a4ae0"], kakashi_war: ["vortex", "KAMUI", "#8a6aff"], pain: ["punch", "SHINRA TENSEI", "#c8b0ff", "ring"],
  six_paths_pain: ["crush", "CHIBAKU TENSEI", "#8a7a6a", "meteor"], jiraiya: ["crush", "SUMMONING · GAMABUNTA", "#8a5a3a", "foot"], kakashi: ["lightning", "RAIKIRI", "#9ad0ff"],
  kakashi_anbu: ["lightning", "LIGHTNING BLADE", "#9ad0ff"], sakura: ["punch", "SHANNARO!", "#ff6aa0"], hinata: ["punch", "TWIN LION FISTS", "#7ab0ff"], gaara: ["bind", "SAND BURIAL", "#d8b878", "sand"],
  isshiki: ["crush", "DAIKOKUTEN", "#2a2a30", "cube"], shisui_fallen: ["psychic", "KOTOAMATSUKAMI", "#ff3a3a"],
  zenitsu: ["slash", "THUNDERCLAP AND FLASH", "#ffe24a", 1], rengoku: ["fire", "NINTH FORM · RENGOKU", "#ff7a1a"], shinobu: ["poison", "BUTTERFLY DANCE · CAPRICE", "#c88aff"],
  inosuke: ["slash", "BEAST BREATHING · FANG", "#9ab0d0", 6], nezuko: ["fire", "EXPLODING BLOOD", "#ff3a6a"],
  rick: ["vortex", "PORTAL GUN", "#6aff4a"], rickPrime: ["explode", "OBLITERATION", "#7aff8a"],
  ben10: ["explode", "OMNITRIX OVERLOAD", "#4aff5a"], albedo: ["explode", "ULTIMATE OVERLOAD", "#ff3a3a"], kevin_levin: ["crush", "ABSORBED · TITANIUM FIST", "#9a9aa8", "fist"],
  gwen: ["psychic", "MANA SPHERE", "#ff6ad0"], vilgax: ["crush", "CONQUEROR'S FIST", "#4aa04a", "fist"],
  omega_ranger: ["blitz", "OMEGA SPEED", "#e8f0ff"], samurai_red_ranger: ["fire", "FIRE SMASHER", "#ff4a1a"], gold_samurai_ranger: ["slash", "BARRACUDA BITE", "#ffd84a", 5],
  green_samurai_ranger: ["bind", "FOREST SPEAR", "#4a8a3a", "wood"], red_ranger_mmpr: ["crush", "MEGAZORD STOMP", "#8a8a9a", "foot"], spd_red: ["barrage", "DELTA BLASTERS", "#ff3a3a"],
  ninja_storm_cgpt: ["blitz", "NINJA STREAK", "#ff3a3a"], windrangers: ["blitz", "NINJA STREAK", "#ff4a3a"], ninja_storm_rangers: ["slash", "NINJA SWORD", "#ffd84a", 3],
  krybot: ["barrage", "KRYBOT BLASTERS", "#6ad0ff"], spd_blue: ["barrage", "DELTA BLASTER", "#3a6aff"], spd_green: ["barrage", "STEALTH SNIPER", "#3aff6a"], spd_pink: ["crush", "DIAMOND FIST", "#ff8ad0", "fist"],
  spd_yellow: ["barrage", "DELTA BLASTER", "#ffd84a"], mmpr_pink: ["barrage", "POWER BOW", "#ff8ad0", "arrows"], mmpr_black: ["slash", "POWER AXE", "#5a5a6a", 1],
  green_ranger: ["crush", "DRAGONZORD STOMP", "#2aa04a", "foot"], mmpr_white: ["slash", "SABA STRIKE", "#f0f0f0", 2],
  netero: ["crush", "100-TYPE GUANYIN · ZERO HAND", "#ffd28a", "fist"], killua: ["lightning", "GODSPEED · THUNDERBOLT", "#8ae0ff"], hisoka: ["barrage", "BUNGEE GUM · CARD STORM", "#ff6ad0", "cards"],
  chrollo: ["erase", "SKILL HUNTER", "#8a6aff"], saiki: ["psychic", "PSYCHOKINESIS", "#ff7ad0"],
  flash: ["blitz", "INFINITE MASS PUNCH", "#ffd23a"], batman: ["barrage", "BATARANG STORM", "#c8c8d8", "cards"], superman: ["beam", "HEAT VISION", "#ff2a2a", "eyes"],
  green_arrow: ["barrage", "ARROWSTORM", "#4ad04a", "arrows"], homelander: ["beam", "LASER VISION", "#ff2a2a", "eyes"], soldier_boy: ["explode", "NUCLEAR BLAST", "#ffd23a"],
  cyborg: ["beam", "SONIC CANNON", "#4ad0ff"], beast_boy: ["crush", "T-REX STOMP", "#4aa04a", "foot"], raven: ["vortex", "AZARATH METRION ZINTHOS", "#3a1a5a"],
  starfire: ["beam", "STARBOLT", "#6aff6a"], robin: ["explode", "EXPLODING BIRDARANG", "#ff4a3a"],
  violet: ["psychic", "FORCE FIELD CRUSH", "#b07aff"], dash_parr: ["blitz", "SUPER SPEED", "#ff6a2a"], syndrome: ["psychic", "ZERO-POINT ENERGY", "#4ad0ff"],
  frozone: ["ice", "DEEP FREEZE", "#9fe2ff"], mr_incredible: ["punch", "INCREDI-PUNCH", "#ff3a2a"], elastigirl: ["bind", "STRETCH WRAP", "#ff3a2a", "wrap"],
  ghostface: ["slash", "WHAT'S YOUR FAVORITE SCARY MOVIE?", "#e0e0e0", 7], jason: ["slash", "MACHETE", "#b8bcc4", 1],
  ichigo: ["beam", "GETSUGA TENSHO", "#c01030"], zaraki: ["slash", "KENPACHI · ONE STROKE", "#ffd84a", 1], zaraki_shikai: ["slash", "NOZARASHI", "#ff3a3a", 1],
  mayuri: ["poison", "ASHISOGI JIZŌ", "#9a4aff"], byakuya: ["slash", "SENBONZAKURA KAGEYOSHI", "#ff9ac8", 12],
  light: ["note", "DEATH NOTE", "#f0f0f0"], l_ryuuzaki: ["note", "CASE CLOSED", "#f0f0f0", "case"], spiderman: ["bind", "WEB COCOON", "#f0f0f0", "web"],
  zoro: ["slash", "ONI GIRI", "#b8e0b8", 3], buggy: ["explode", "MUGGY BALL", "#ff8a2a"], sanji: ["fire", "DIABLE JAMBE", "#ff6a1a"], arlong: ["punch", "SHARK ON DARTS", "#4a8aff"],
  luffy: ["punch", "GUM-GUM RED HAWK", "#ff5a1a"],
}
const BY_UNIVERSE = { dragon_ball: "beam", naruto: "lightning", jujutsu_kaisen: "punch", bleach: "slash", demon_slayer: "slash", power_rangers: "barrage", dc: "beam", marvel: "punch",
  ben_10: "explode", one_piece: "punch", hunter_x_hunter: "slash", horror: "slash", the_incredibles: "punch", one_punch_man: "punch" }
export function signatureFor(f) {
  const k = (f?.rosterKey || f?.key || f?.id || "").toLowerCase(), r = SIG[k] || SIG[f?.rosterKey] || SIG[f?.key]
  if (r) return { kind: r[0], name: r[1], color: r[2], v: r[3] }
  return { kind: BY_UNIVERSE[f?.universe] || "punch", name: ((f?.name || "SIGNATURE") + " FINISH").toUpperCase(), color: "#ffd060", v: null }
}
export const SIGNATURE_TABLE = SIG

// ── SPECIAL FATALITIES: one per special in the fighter's move list, each staged as the effect kind its name / text
// describes (Rasengan → vortex, Chidori → lightning, Kamehameha → beam, Gum-Gum Pistol → punch, Sand Coffin → bind…),
// acted with that special's own strip. FINISH-window input = a button (Special / Heavy / Light / Charge) + a direction
// (neutral / forward / back / up / down): the special keeps its own input when it maps to a free slot, else it takes the
// next free one. Special with no direction stays the SIGNATURE fatality. Up to 19 per fighter.
const CLASSIFY = [
  ["dismantle", /dismantle|world.?cutting|shrine/], ["vortex", /lapse|attraction/], ["explode", /reversal|repulsion/],
  ["note", /death note|notebook/], ["erase", /hakai|erase|destruction|disintegrat|annihilat/],
  ["void", /hollow|purple|unlimited void|black hole|singularity|gravity/], ["vortex", /rasengan|kamui|vortex|spiral|portal|warp|whirl|tornado|cyclone|\bwind|gale|typhoon|sharingan|izanagi|dimension|twister/],
  ["lightning", /chidori|raikiri|lightning|thunder|electric|\bvolt|shock|spark|kirin|static|plasma/], ["ice", /\bice\b|\bicy|freez|frost|\bcold|cryo|snow|glacier|blizzard|chill/],
  ["fire", /(?<!rapid )\bfire\b|flame|\bburn|blaze|inferno|\bheat|magma|lava|amaterasu|fuga|ember|phoenix|scorch|incinerat|napalm|fireball/],
  ["beam", /beam|judg|verdict|kamehameha|cannon|laser|\bray\b|flash|galick|final|vision|\beyes?\b|energy wave|spirit gun|\bwave\b/],
  ["poison", /poison|venom|toxic|acid|\bsting|butterfly|parasit|disease|plague/], ["psychic", /psychic|telekin|\bmind|genjutsu|illusion|\bpsi|levitat|hypno|tsukuyomi|possess|\bsoul/],
  ["holy", /holy|\bheal|\bpray|bless|miracle|divine|heaven|angel|smite|sacred/], ["bind", /\bsand|coffin|burial|\bweb|vine|\bwood|chain|\bbind|lasso|tentacle|\brope|\bnet\b|\bwrap|shadow possession|\bseal|restrain|\broot/],
  ["explode", /bomb|explo|nuclear|detonat|grenade|burst|missile|rocket|self-destruct|\bblast/], ["crush", /meteor|stomp|\bslam|crush|quake|\bdrop|\bdive|ground|pound|planet|cube|\bpress|hammer|giant|titan|boulder|\brock|table|flip/],
  ["barrage", /\bshot|\bgun|blaster|rifle|arrow|shuriken|kunai|throw|needle|rapid|volley|bullet|\bcards?\b|dart|projectile|\bfire\b/], ["slash", /slash|sword|blade|\bcut\b|katana|slice|cleave|claw|scythe|\biai|giri|saber|\baxe\b|dagger|knife|spear|lance|whip|\btora|\bnigiri/],
  ["blitz", /\brush|\bdash|blitz|teleport|speed|flash ?step|phase|barrage|flurry|combo|consecutive|machine gun|hundred|clone|instant|charge/],
  ["punch", /punch|fist|kick|strike|uppercut|headbutt|knee|elbow|\bhit\b|smash|\bjab\b|hook|blow|pistol|gatling|bazooka|haki|\bhop/],
]
const KIND_COLOR = { void: "#a64dff", beam: "#6ec8ff", slash: "#e8f0ff", dismantle: "#ff3a3a", fire: "#ff6a1a", ice: "#9fe8ff", lightning: "#a8d8ff", crush: "#c8b090", punch: "#ffd060",
  vortex: "#6ad0ff", blitz: "#ffe95a", barrage: "#ffd090", bind: "#d8b878", explode: "#ffb040", erase: "#c07aff", poison: "#b070ff", psychic: "#ff70d0", note: "#e8e8e8", holy: "#fff0b0" }
const DIR_CH = { f: "→", b: "←", u: "↑", d: "↓", n: "" }, BTN_NAME = { special: "Special", heavy: "Heavy", light: "Light", charge: "Charge" }
const SLOT_ORDER = ["special", "heavy", "light", "charge"].flatMap(b => ["n", "f", "b", "u", "d"].map(d => b + ":" + d))
function wantSlot(input) {
  const s = String(input || "").replace(/\(.*?\)/g, "").toLowerCase()
  const btn = /heavy/.test(s) ? "heavy" : /light/.test(s) && !/special/.test(s) ? "light" : /charge/.test(s) && !/special/.test(s) ? "charge" : "special"
  const arrows = s.match(/[→←↑↓↘↙↗↖]/g), last = arrows ? arrows[arrows.length - 1] : null
  const dir = last ? ({ "→": "f", "↘": "f", "↗": "f", "←": "b", "↙": "b", "↖": "b", "↑": "u", "↓": "d" })[last]
    : /forward|fwd|qcf/.test(s) ? "f" : /back|qcb/.test(s) ? "b" : /\bup\b/.test(s) ? "u" : /down/.test(s) ? "d" : "n"
  return btn + ":" + dir
}
const _fatCache = new Map()
const normName = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "")
// [{ slot: "special:n", btn, dir, name, kind, color, v, input (display), sig? }] — index 0 is the signature
export function fatalityList(f) {
  const key = String(f?.rosterKey || f?.key || f?.id || ""), C = characters[key] || characters[key.toLowerCase()] || f
  if (_fatCache.has(key)) return _fatCache.get(key)
  const sig = signatureFor({ ...C, rosterKey: key }), out = [{ slot: "special:n", ...sig, sig: true }], used = new Set(["special:n"]), seen = new Set([normName(sig.name)])
  let kit = null; try { kit = getKit(key, C) } catch (_) {}
  for (const sp of kit?.specials || []) {
    if (out.length >= 20) break
    if (sp.noFatality) continue   // kit rows that are systems, not techniques (Ben / Albedo / Kevin DNA scan rows)
    const nm = String(sp.name || "").trim(); if (!/[a-z0-9]/i.test(nm) || seen.has(normName(nm))) continue   // (placeholder names like "—" skipped)
    seen.add(normName(nm))
    const text = (nm + " " + (sp.desc || sp.description || "")).toLowerCase()
    let kind = (CLASSIFY.find(([, re]) => re.test(nm.toLowerCase())) || CLASSIFY.find(([, re]) => re.test(text)) || [sig.kind])[0]
    if (kind === "void" && !/hollow|purple|void|black hole|singularity|lapse|reversal|gravity/.test(text)) kind = "vortex"
    const v = kind === "crush" ? (/meteor|planet|rock|boulder/.test(text) ? "meteor" : /stomp|foot/.test(text) ? "foot" : /cube/.test(text) ? "cube" : null)
      : kind === "bind" ? (/web/.test(text) ? "web" : /wood|vine|root/.test(text) ? "wood" : null) : kind === "barrage" ? (/arrow/.test(text) ? "arrows" : null) : null
    let slot = wantSlot(sp.input); if (used.has(slot)) slot = SLOT_ORDER.find(x => !used.has(x)); if (!slot) break
    used.add(slot); const [btn, dir] = slot.split(":")
    out.push({ slot, btn, dir, name: nm.toUpperCase(), kind, color: kind === sig.kind ? sig.color : KIND_COLOR[kind] || "#ffd060", v, input: (DIR_CH[dir] ? DIR_CH[dir] + " + " : "") + BTN_NAME[btn], key: sp.key || null })
  }
  out[0].btn = "special"; out[0].dir = "n"; out[0].input = "Special"
  _fatCache.set(key, out); return out
}
const MELEE = new Set(["slash", "dismantle", "lightning", "punch", "blitz", "poison"])
const DARK = { void: 0.94, erase: 0.8, vortex: 0.8, note: 0.7, holy: 0.35 }
const HIT = 60, END = 240

let S = null
let _in = { special: false, grab: false, grabAt: -99, t: 0, prev: {}, pick: null }
export const signatureFatalityActive = () => !!S && S.phase !== "done"
export const signatureFatalityDone = () => !!S && S.phase === "done"
export const signatureFatalityState = () => S ? { phase: S.phase, t: S.t, kind: S.sig.kind, name: S.sig.name, slot: S.sig.slot, gone: !!S.gone, plan: S.plan, acting: S.w.attacking ? S.w.currentMove : null, gore: goreState() } : { phase: null }
export function clearSignatureFatality() {
  if (S) for (const f of [S.w, S.v]) { f._fxAlpha = null; f._fxFilter = null; f._fxRecord = false; f._fxRot = 0; f._fxRenderScale = 0 }
  if (S) { S.w.attacking = false; S.w.currentMove = null; S.w.dashTimer = 0 }
  S = null; _in = { special: false, grab: false, grabAt: -99, t: 0, prev: {}, pick: null }; goreReset()
}
// FINISH-window input: SPECIAL / HEAVY / LIGHT / CHARGE + a held direction — but not SPECIAL right after GRAB (that's
// GRAB → SPECIAL = Screen Breaker). The direction is resolved to forward / back against the winner's facing at start.
export function signatureFatalityInput(raw) {
  raw = raw || {}; _in.t++
  const g = !!raw.grab
  if (g) _in.grabAt = _in.t
  let hit = null
  for (const b of ["special", "heavy", "light", "charge"]) { const on = !!raw[b]; if (on && !_in.prev[b] && !g && !(b === "special" && _in.t - _in.grabAt <= 36)) hit = hit || b; _in.prev[b] = on }
  _in.special = !!raw.special; _in.grab = g
  if (!hit) return false
  _in.pick = { btn: hit, h: raw.right ? 1 : raw.left ? -1 : 0, up: !!(raw.up || raw.upAttack), down: !!raw.down }
  return true
}
function pickFatality(winner, choice) {
  const L = fatalityList(winner)
  if (choice && Number.isInteger(choice.index)) return L[Math.max(0, Math.min(L.length - 1, choice.index))]
  const p = choice || _in.pick; if (!p) return L[0]
  const fac = (winner.facing || 1) >= 0 ? 1 : -1, dir = p.up ? "u" : p.down ? "d" : p.h === fac ? "f" : p.h === -fac ? "b" : "n"
  return L.find(e => e.slot === p.btn + ":" + dir) || L.find(e => e.slot === p.btn + ":n") || L[0]
}
// ── CHOREOGRAPHY: the winner ACTS the technique with their own strips. The fighter's animation set (skin, else the
// character's animationData — Sukuna & co. keep theirs only in characters.js) is searched for strips named after the
// technique (Gojo hollow_purple_charge → hollow_purple_cast, Itachi amaterasuCast, Light lightUltWrite, Sukuna cleave /
// dismantle, Saitama saitamaSerious…), else the generic charge / ultimate / heavy strips; a WIND-UP, a RELEASE (or a
// chain of STRIKES for melee kinds) and a FINISH pose (win / taunt).
const KW = { void: ["purple", "hollow", "void", "domain"], beam: ["beam", "kame", "flash", "blast", "laser", "eye", "galick", "cannon", "wave"], slash: ["slash", "sword", "blade", "giri", "katana", "iai", "cut", "lasso"],
  dismantle: ["dismantle", "cleave", "slash"], fire: ["fire", "flame", "amaterasu", "fuga", "burn"], ice: ["ice", "freeze", "frost", "cold"], lightning: ["chidori", "raikiri", "lightning", "thunder", "electric", "shock", "kirin"],
  crush: ["meteor", "crush", "shinsei", "stomp", "slam", "planet"], punch: ["serious", "punch", "fist", "smash", "impact", "headbutt"], vortex: ["kamui", "vortex", "spiral", "warp", "portal"],
  blitz: ["rush", "combo", "barrage", "flurry", "speed"], barrage: ["arrow", "shot", "gun", "storm", "barrage", "shoot", "volley", "missile"], bind: ["burial", "sand", "bind", "wood", "web", "coffin", "chain"],
  explode: ["nuclear", "blast", "bomb", "explo", "burst"], erase: ["hakai", "erase", "destr"], poison: ["poison", "sting", "butterfly", "venom", "needle"], psychic: ["psych", "mind", "telek", "lift"],
  note: ["write", "note", "scythe"], holy: ["holy", "judg", "pray", "miracle", "heal"] }
const NOT_ACT = /^(idle|walk|run|jump|fall|dash|hurt|guard|knockdown|getup|lose|crouch|land|fly|block|launched|stagger|takeoff|dive|slide|doublejump|grab|throw|down_air|air|intro\d|introsettle|idlelow|swake|teleport|win|taunt)/i
function animKeys(f) { const k = String(f.rosterKey || f.key || f.id || ""); return Object.keys(f._skinAnim || f.animationData || (characters[k] || characters[k.toLowerCase()])?.animationData || {}) }
function planFor(f, sig) {
  const ks = animKeys(f), set = new Set(ks), first = list => list.find(a => set.has(a)) || null
  const own = sig.name.toLowerCase().match(/[a-z]{4,}/g) || [], kw = KW[sig.kind] || []   // the technique's own words count triple
  const score = a => { const l = a.toLowerCase(); return own.reduce((n, w) => n + (l.includes(w.slice(0, 6)) ? 3 : 0), 0) + kw.reduce((n, w) => n + (l.includes(w.slice(0, 6)) ? 1 : 0), 0) }
  const sigA = ks.filter(a => !NOT_ACT.test(a) && score(a) > 0).sort((a, b) => score(b) - score(a))
  const windup = sigA.find(a => /charge|open|pose|rise|ready|stance/i.test(a)) || first(["ultOpen", "ultPose", "charge", "domain", "ultimate"])
    || ks.find(a => !NOT_ACT.test(a) && /cast|charge/i.test(a) && a !== sigA[0]) || first(["ultimate", "domain", "transform", "taunt", "intro", "heavy"])
  const castOf = a => a && /charge/i.test(a) ? a.replace(/charge/i, m => (m[0] === "C" ? "Cast" : "cast")) : null
  const release = (set.has(castOf(windup)) ? castOf(windup) : null) || sigA.find(a => a !== windup && !/charge|open|ready/i.test(a)) || first(["ultimate", "ultCast", "special", "heavy", "light"]) || ks.find(a => !NOT_ACT.test(a) && !/intro|transform/i.test(a)) || ks.find(a => !NOT_ACT.test(a))
  const strikes = [...new Set([...sigA.filter(a => !/charge|open|pose|rise|ready|cast/i.test(a)).slice(0, 2), ...["heavy", "light", "up"].filter(a => set.has(a))])]
  if (strikes.length < 2) strikes.push(...ks.filter(a => !NOT_ACT.test(a) && !/intro|transform|charge|cast/i.test(a) && a !== windup && !strikes.includes(a)).slice(0, 3 - strikes.length))
  if (!strikes.length && release) strikes.push(release)
  return { windup, release, strikes, finish: first(["win", "win2", "taunt", "intro", "ultLand"]) }
}
export const signatureFatalityPlan = (f, sig = signatureFor(f)) => planFor(f, sig)
function act(f, a) { if (!a) { f.attacking = false; f.currentMove = null; return } f.attacking = true; f.currentMove = a; f.currentAttack = null }
export function startSignatureFatality(winner, victim, choice = null) {
  if (!winner || !victim) return false
  const sig = pickFatality(winner, choice); _in.pick = null
  S = { phase: "run", t: 0, w: winner, v: victim, sig, M: null, parts: [], holes: [], seed: 0x2545f491, gone: false, plan: planFor(winner, sig) }
  winner.vx = victim.vx = 0
  victim.knockdownState = false; victim.knockdownTimer = 0; victim.hitstun = 999; victim.attacking = false   // dazed on their feet: "FINISH THEM"
  victim._fxRecord = true; victim._fxAlpha = 0                                                               // drawn here from now on
  const gy = victim.groundY ?? 520; victim.y = gy - (victim.h || 100); victim.grounded = victim.onGround = true
  goreSetup(victim, gy)
  sfx("charge", sig)
  return true
}
const rnd = () => { S.seed ^= S.seed << 13; S.seed ^= S.seed >>> 17; S.seed ^= S.seed << 5; return (S.seed >>> 0) / 4294967296 }
const ctr = f => ({ x: f.x + (f.w || 50) / 2, y: f.y + (f.h || 100) / 2 })

export function updateSignatureFatality() {
  if (!S || S.phase === "done") return
  const t = ++S.t, w = S.w, v = S.v, k = S.sig.kind, d = ctr(v).x >= ctr(w).x ? 1 : -1
  w.hitstun = 0; w.isBlocking = false
  const P = S.plan, chain = (from, to, every) => { if (t >= from && t <= to && (t - from) % every === 0) act(w, P.strikes[((t - from) / every) % P.strikes.length]) }
  if (!MELEE.has(k) || t < 26) { w.facing = d
    if (t === 1) act(w, P.windup)                                                  // wind-up: charge / open the technique
    if (!MELEE.has(k) && t === HIT - 12) act(w, P.release)                         // release it
    if (k === "barrage") chain(HIT - 12, HIT + 40, 10)                              // keep firing
  }
  if (MELEE.has(k)) {
    if (t >= 26 && t < 38) {   // close the distance
      const tx = v.x - d * ((w.w || 50) + 14), st = (tx - w.x) / Math.max(1, 38 - t); w.x += st; w.vx = st; w.dashTimer = 2; w.facing = d; act(w, null)
      if (t === 26) sfx("whoosh", S.sig)
    } else if (t === 38) { w.vx = 0; w.dashTimer = 0; act(w, P.strikes[0]) }
    if (k === "dismantle" || k === "poison") chain(38, HIT + 26, 8)                 // a flurry of cuts / stings
    if (k === "punch" && t === HIT - 6) act(w, P.release && !/charge|open/i.test(P.release) ? P.release : P.strikes[0])   // the one that lands
    if (k === "lightning" && t === HIT - 4) act(w, P.release || P.strikes[0])
    if (k === "slash" && t === HIT + 2) { w.x = v.x + d * ((v.w || 50) + 40); w.facing = -d; act(w, null) }   // through and past, back turned
    if (k === "blitz" && t > 38 && t < 96) { w._fxAlpha = (t % 6 < 3) ? 0.9 : 0.15; w.x = v.x + ((t >> 2) % 2 ? 1 : -1) * ((v.w || 50) + 10); w.facing = ((t >> 2) % 2) ? -1 : 1; if (t % 4 === 0) act(w, P.strikes[(t >> 2) % P.strikes.length]) }
    if (k === "blitz" && t === 96) { w._fxAlpha = null; w.x = v.x - d * ((w.w || 50) + 60); w.facing = d; act(w, null) }
  }
  if (t === HIT + 95) act(w, P.finish)                                               // the finishing pose
  // the beats
  if (t === HIT) { sfx(k === "slash" || k === "dismantle" ? "slash" : k === "ice" ? "freeze" : k === "lightning" ? "zap" : k === "note" ? "write" : k === "holy" ? "choir" : "boom", S.sig); camera.shake?.(k === "void" || k === "explode" || k === "crush" ? 18 : 9, 26) }
  if (k === "slash" && t === HIT + 24) { sfx("splat", S.sig); S.gone = true }
  if ((k === "dismantle" || k === "blitz") && t === HIT + 30) { S.gone = true; sfx("splat", S.sig); camera.shake?.(8, 16) }
  if (k === "ice" && t === HIT + 50) { sfx("shatter", S.sig); camera.shake?.(10, 16); S.gone = true }
  if (k === "lightning" && t === HIT + 6) sfx("zap", S.sig)
  if (k === "barrage" && t > 30 && t < 96 && t % 3 === 0) sfx("shot", S.sig)
  if (k === "psychic" && t === HIT + 44) { sfx("boom", S.sig); camera.shake?.(10, 18) }
  // GORE: the kill beat of every kind — torn apart (or, where the body stays, opened up and bleeding out)
  goreUpdate()
  if (!S.gored && (S.gone || (t === HIT + (k === "punch" ? 0 : 40) && ALIVE_GORE.has(k)) || (k === "punch" && t === HIT))) { S.gored = true; goreKill(k, !S.gone) }
  if (t >= END) S.phase = "done"
}
const ALIVE_GORE = new Set(["lightning", "barrage", "poison", "note", "holy", "punch"])
const GORE_POWER = { explode: 16, punch: 15, crush: 10, beam: 13, void: 7, erase: 6, vortex: 8, psychic: 12, slash: 8, dismantle: 9, blitz: 10, bind: 9, ice: 8, fire: 7 }
function goreKill(k, alive) {
  const L = S.v._lastFrameDraw, B0 = vBox(), d = B0.cx >= ctr(S.w).x ? 1 : -1, B = k === "psychic" ? { ...B0, y: B0.y - 120, cy: B0.cy - 120 } : B0
  sfx("splat", S.sig)
  if (alive) {   // the body stays where it is: it's opened up
    if (k === "punch") { goreSpray(B.cx, B.cy, 180, 15, d > 0 ? -0.35 : Math.PI + 0.35, 0.9); goreSpray(B.cx, B.y + B.h * 0.2, 40, 6); goreLens(4); camera.shake?.(14, 18) }   // the fist goes clean through
    else if (k === "barrage") for (let i = 0; i < 6; i++) goreWound(B.cx + (i - 2.5) * B.w * 0.12, B.y + B.h * (0.25 + 0.09 * i), d > 0 ? -0.3 - i * 0.15 : Math.PI + 0.3 + i * 0.15, B, 7)   // riddled
    else if (k === "lightning") { goreWound(B.cx, B.y + B.h * 0.4, d > 0 ? -0.2 : Math.PI + 0.2, B, 11); goreSpray(B.cx + d * B.w * 0.4, B.y + B.h * 0.4, 90, 12, d > 0 ? 0 : Math.PI, 0.7); goreLens(3) }   // through and through
    else { goreSpurt(B.cx + d * B.w * 0.12, B.y + B.h * 0.2, -Math.PI / 2 + d * 0.6, 110, 5); goreSpurt(B.cx, B.y + B.h * 0.14, -Math.PI / 2 - d * 0.3, 80, 3); goreWound(B.cx, B.y + B.h * 0.5, Math.PI / 2, B, 3) }   // from the mouth / eyes
    return
  }
  const style = k === "fire" || k === "beam" || k === "explode" ? "burnt" : k === "ice" ? "frozen" : k === "crush" || k === "bind" ? "flat" : k === "dismantle" || k === "blitz" || k === "vortex" ? "shred" : k === "void" || k === "erase" ? "feet" : ""
  goreDismember(L, B, { power: GORE_POWER[k] || 10, dir: k === "beam" ? d : 0, style, up: k === "crush" ? 0.3 : 1 })
  if (["explode", "dismantle", "crush", "bind", "psychic", "blitz", "slash", "vortex"].includes(k)) goreLens(k === "explode" || k === "crush" ? 7 : 4)
  camera.shake?.(10, 14)
}

// ── drawing ──
// world layer, UNDER the fighters: the arena darkens (Hollow Purple: the whole map goes black)
export function drawSignatureFatalityUnder(c, canvas) {
  if (!S) return
  const D = DARK[S.sig.kind] ?? 0.62, a = Math.min(1, S.t / 26) * D
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = S.sig.kind === "holy" ? `rgba(255,245,210,${a * 0.6})` : `rgba(0,0,0,${a})`; c.fillRect(0, 0, canvas.width, canvas.height); c.restore()
}
// redraw the victim's real frame: clip (local box coords), offset, rotation, scale, filter, alpha, sub-rect in source fractions
function V(c, o = {}) {
  const L = S.v._lastFrameDraw; if (!L || !L.img) return
  const fx0 = o.src?.[0] ?? 0, fy0 = o.src?.[1] ?? 0, fx1 = o.src?.[2] ?? 1, fy1 = o.src?.[3] ?? 1
  c.save(); c.globalAlpha *= o.alpha ?? 1; if (o.filter) c.filter = o.filter
  const cx = L.x + L.w / 2 + (o.dx || 0), cy = L.y + L.h / 2 + (o.dy || 0)
  c.translate(cx, cy); if (o.rot) c.rotate(o.rot); if (o.sx || o.sy) c.scale(o.sx ?? 1, o.sy ?? 1); c.translate(-L.w / 2, -L.h / 2)
  if (o.clip) { c.beginPath(); o.clip(c, L.w, L.h); c.clip() }
  c.imageSmoothingEnabled = false
  if (L.flip) { c.translate(L.w, 0); c.scale(-1, 1) }
  c.drawImage(L.img, L.sx + fx0 * L.sw, L.sy + fy0 * L.sh, (fx1 - fx0) * L.sw, (fy1 - fy0) * L.sh, fx0 * L.w, fy0 * L.h, (fx1 - fx0) * L.w, (fy1 - fy0) * L.h)
  c.restore()
}
function vBox() { const L = S.v._lastFrameDraw; return L ? { x: L.x, y: L.y, w: L.w, h: L.h, cx: L.x + L.w / 2, cy: L.y + L.h / 2, gy: L.y + L.h } : { x: S.v.x, y: S.v.y, w: S.v.w || 50, h: S.v.h || 100, cx: ctr(S.v).x, cy: ctr(S.v).y, gy: S.v.y + (S.v.h || 100) } }
function hand() { const w = S.w; return { x: w.x + (w.w || 50) / 2 + (w.facing || 1) * (w.w || 50) * 0.7, y: w.y + (w.h || 100) * 0.38 } }
function glow(c, x, y, r, col, a = 1) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.35, hexA(col, a * 0.9)); g.addColorStop(1, hexA(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill() }
function hexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${Math.max(0, Math.min(1, a))})` }
function burst(n, x, y, col, sp = 6, up = 0, life = 60, size = 4) { for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, s = sp * (0.3 + rnd()); S.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - up, life, max: life, col, size: size * (0.5 + rnd()), g: 0.25 }) } }
function tiles(nx, ny, power, col) {   // break the victim's frame into flying pieces (source sub-rects)
  const B = vBox(); for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const a = Math.atan2(j - ny / 2, i - nx / 2) + (rnd() - 0.5), s = power * (0.5 + rnd())
    S.parts.push({ tile: [i / nx, j / ny, (i + 1) / nx, (j + 1) / ny], x: B.x + (i + 0.5) * B.w / nx, y: B.y + (j + 0.5) * B.h / ny, vx: Math.cos(a) * s, vy: Math.sin(a) * s - power * 0.6, rot: 0, vr: (rnd() - 0.5) * 0.4, life: 120, max: 120, g: 0.35, col }) }
}
function drawParts(c) {
  const L = S.v._lastFrameDraw
  for (const p of S.parts) { p.life--; if (p.life <= 0) continue; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.vx *= 0.985
    const gy = vBox().gy; if (p.y > gy && p.tile) { p.y = gy; p.vy *= -0.3; p.vx *= 0.7; p.vr *= 0.6 } if (p.rot != null) p.rot += p.vr
    const a = Math.min(1, p.life / (p.max * 0.4))
    if (p.tile && L) { const [u0, v0, u1, v1] = p.tile, tw = (u1 - u0) * L.w, th = (v1 - v0) * L.h
      c.save(); c.globalAlpha = a; c.translate(p.x, p.y); c.rotate(p.rot); if (p.col) c.filter = p.col; c.imageSmoothingEnabled = false
      if (L.flip) c.scale(-1, 1)
      const su = L.flip ? 1 - u1 : u0, su1 = L.flip ? 1 - u0 : u1
      c.drawImage(L.img, L.sx + (L.flip ? (1 - u1) : u0) * L.sw, L.sy + v0 * L.sh, (u1 - u0) * L.sw, (v1 - v0) * L.sh, -tw / 2, -th / 2, tw, th); void su; void su1; c.restore() }
    else { c.fillStyle = hexA(p.col, a); c.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size) } }
  S.parts = S.parts.filter(p => p.life > 0)
}
const BLOOD = "#a00010"
// world layer, OVER the fighters: the technique itself
export function drawSignatureFatalityOver(c) {
  if (!S) return
  const t = S.t, k = S.sig.kind, col = S.sig.color, B = vBox(), H = hand(), d = B.cx >= ctr(S.w).x ? 1 : -1
  c.save()
  if (t < HIT && k !== "note" && k !== "holy") { const u = t / HIT; glow(c, H.x, H.y, 20 + 50 * u, col === "#140814" ? "#6a2a8a" : col, 0.4 + 0.5 * u)   // the charge
    for (let i = 0; i < 6; i++) { const a = t * 0.2 + i, r = 90 * (1 - ((t * 0.04 + i / 6) % 1)); c.fillStyle = hexA(col === "#140814" ? "#8a4aaa" : col, 0.8); c.fillRect(H.x + Math.cos(a) * r, H.y + Math.sin(a) * r, 3, 3) } }
  { // POWER-UP AURA around the winner while they wind up (melee kinds until the dash), and the IMPACT SHOCKWAVE on the victim
    const W = S.w, wc = ctr(W), ac = col === "#140814" ? "#8a4aaa" : col, upTo = MELEE.has(k) ? 26 : HIT - 8
    if (t < upTo + 10) { const a = Math.min(1, t / 12) * Math.min(1, (upTo + 10 - t) / 10), pul = 1 + 0.12 * Math.sin(t * 0.5), wh = (W.h || 100), ww = (W.w || 50)
      c.save(); c.globalCompositeOperation = "lighter"
      const g = c.createRadialGradient(wc.x, wc.y, 4, wc.x, wc.y, wh * 0.95 * pul); g.addColorStop(0, hexA(ac, 0.42 * a)); g.addColorStop(0.55, hexA(ac, 0.18 * a)); g.addColorStop(1, hexA(ac, 0))
      c.fillStyle = g; c.beginPath(); c.ellipse(wc.x, wc.y, ww * 1.5 * pul, wh * 0.95 * pul, 0, 0, 7); c.fill()
      for (let i = 0; i < 9; i++) { const ph = ((t * 0.035 + i / 9) % 1), fx = wc.x + Math.sin(i * 2.3 + t * 0.08) * ww * 0.9, fy = W.y + wh - ph * wh * 1.3   // flames licking upward
        c.fillStyle = hexA(ac, a * (1 - ph) * 0.9); c.beginPath(); c.ellipse(fx, fy, 3 + 5 * (1 - ph), 9 + 14 * (1 - ph), 0, 0, 7); c.fill() }
      c.strokeStyle = hexA(ac, 0.6 * a); c.lineWidth = 3; c.beginPath(); c.ellipse(wc.x, W.y + wh, ww * (1.2 + 0.4 * ((t * 0.06) % 1)), 8 + 6 * ((t * 0.06) % 1), 0, 0, 7); c.stroke()   // ground ring
      if (t % 3 === 0) S.parts.push({ x: wc.x + (rnd() - 0.5) * ww * 1.6, y: W.y + wh * (0.4 + rnd() * 0.6), vx: 0, vy: -2 - rnd() * 3, g: -0.02, life: 30, max: 30, col: ac, size: 3 })
      c.restore() }
    if (t >= HIT && t < HIT + 22 && k !== "note") { const u = (t - HIT) / 22   // the shockwave
      c.save(); c.strokeStyle = hexA("#ffffff", 0.8 * (1 - u)); c.lineWidth = 10 * (1 - u) + 1; c.beginPath(); c.ellipse(B.cx, B.cy, 30 + 260 * u, (30 + 260 * u) * 0.55, 0, 0, 7); c.stroke()
      c.strokeStyle = hexA(ac, 0.7 * (1 - u)); c.lineWidth = 5 * (1 - u) + 1; c.beginPath(); c.ellipse(B.cx, B.cy, 20 + 180 * u, (20 + 180 * u) * 0.55, 0, 0, 7); c.stroke(); c.restore() }
  }
  const alive = !S.gone
  switch (k) {
    case "void": {   // red + blue orbs converge, become purple, sweep through: erased
      if (t < HIT) { const u = Math.min(1, t / 40), sp = 70 * (1 - u); glow(c, H.x, H.y - sp, 26, "#ff3040"); glow(c, H.x, H.y + sp, 26, "#3070ff"); V(c) }
      else { const u = (t - HIT) / 40, R = 150, x = H.x + d * (u * 1600), front = x + d * R * 0.6
        glow(c, x, H.y + 10, R * 1.6, col, 0.95); glow(c, x, H.y + 10, R * 0.7, "#ffffff", 1)
        { const fa = 0.45 * Math.max(0, 1 - (t - HIT) / 110), g = c.createLinearGradient(0, H.y + 10 - R * 0.7, 0, H.y + 10 + R * 0.7)   // the trench of light, fading
          g.addColorStop(0, hexA(col, 0)); g.addColorStop(0.5, hexA(col, fa)); g.addColorStop(0.47, `rgba(255,255,255,${fa})`); g.addColorStop(1, hexA(col, 0)); c.fillStyle = g; c.fillRect(Math.min(H.x, x), H.y + 10 - R * 0.7, Math.abs(x - H.x), R * 1.4) }
        const cut = (front - B.x) / B.w
        if (alive) { if (d > 0 ? cut < 1 : cut > 0) V(c, { clip: (cc, w, h) => d > 0 ? cc.rect(Math.max(0, cut) * w, 0, w, h) : cc.rect(0, 0, Math.min(1, cut) * w, h) }); else S.gone = true
          if (cut > 0 && cut < 1 && t % 2 === 0) burst(6, B.x + cut * B.w, B.y + rnd() * B.h, col, 5, 1, 40, 5) } }
      break }
    case "beam": {
      const eyes = S.sig.v === "eyes", o = eyes ? { x: S.w.x + (S.w.w || 50) / 2 + d * 14, y: S.w.y + (S.w.h || 100) * 0.14 } : H
      if (t >= HIT && t < HIT + 70) { const u = (t - HIT) / 70, wd = eyes ? 10 : 30 + 60 * Math.sin(Math.min(1, u * 3) * Math.PI / 2) * (u > 0.8 ? (1 - u) * 5 : 1), x1 = o.x + d * 2400
        for (const dy of eyes ? [-5, 5] : [0]) { const g = c.createLinearGradient(0, o.y + dy - wd, 0, o.y + dy + wd); g.addColorStop(0, hexA(col, 0)); g.addColorStop(0.3, hexA(col, 0.9)); g.addColorStop(0.5, "#ffffff"); g.addColorStop(0.7, hexA(col, 0.9)); g.addColorStop(1, hexA(col, 0))
          c.fillStyle = g; c.fillRect(Math.min(o.x, x1), o.y + dy - wd, Math.abs(x1 - o.x), wd * 2) } glow(c, o.x, o.y, wd * 2, col) }
      if (alive) { if (t < HIT + 14) V(c, { filter: t >= HIT ? `brightness(${1 + (t - HIT) * 0.4})` : null }); else { S.gone = true; tiles(5, 8, 7, "brightness(3)"); burst(40, B.cx, B.cy, col, 8, 2, 70, 5) } }
      if (t > HIT + 14 && t < HIT + 160) { c.fillStyle = `rgba(20,10,10,${0.5 * (1 - (t - HIT) / 160)})`; c.beginPath(); c.ellipse(B.cx, B.gy, 60, 8, 0, 0, 7); c.fill() }
      break }
    case "slash": case "dismantle": {
      const n = k === "dismantle" ? 16 : (S.sig.v || 3), ang = -0.35
      if (t >= HIT - 6 && t < HIT + 20) for (let i = 0; i < n; i++) { const at = HIT - 6 + i * Math.max(1, Math.floor(16 / n)), age = t - at; if (age < 0 || age > 10) continue
        const a = k === "dismantle" ? (i % 2 ? 0 : Math.PI / 2) + (rnd() - 0.5) * 0.2 : ang + (i - n / 2) * 0.25, off = k === "dismantle" ? ((i >> 1) - 4) * B.h / 9 : 0, L = 260
        c.strokeStyle = hexA(i % 2 ? "#ffffff" : col, 1 - age / 10); c.lineWidth = 4 - age * 0.3
        c.beginPath(); c.moveTo(B.cx - Math.cos(a) * L + Math.sin(a) * off, B.cy - Math.sin(a) * L - Math.cos(a) * off); c.lineTo(B.cx + Math.cos(a) * L + Math.sin(a) * off, B.cy + Math.sin(a) * L - Math.cos(a) * off); c.stroke() }
      if (k === "slash") {
        if (t < HIT + 24) V(c)
        else { const s = t - HIT - 24, line = (cc, w, h, top) => { const m = Math.tan(ang) * w / 2; cc.moveTo(0, top ? 0 : h); cc.lineTo(w, top ? 0 : h); cc.lineTo(w, h / 2 + m); cc.lineTo(0, h / 2 - m); cc.closePath() }
          V(c, { clip: (cc, w, h) => line(cc, w, h, false), rot: Math.min(1.5, s * 0.03) * -d, dy: Math.min(B.h * 0.3, s * s * 0.03) })
          V(c, { clip: (cc, w, h) => line(cc, w, h, true), dx: Math.min(90, s * 3) * d, dy: Math.min(B.h * 0.55, s * s * 0.06), rot: Math.min(2.4, s * 0.06) * d })
          if (s < 50 && s % 2 === 0) burst(5, B.cx, B.cy - 4, BLOOD, 4, 4, 50, 5)
          if (s > 20) { c.fillStyle = "rgba(110,0,0,0.75)"; c.beginPath(); c.ellipse(B.cx, B.gy, Math.min(90, (s - 20) * 2), 8, 0, 0, 7); c.fill() } } }
      else { if (alive) V(c); else if (!S.diced) { S.diced = 1; tiles(5, 9, 6); burst(50, B.cx, B.cy, BLOOD, 7, 3, 70, 5) } }
      break }
    case "fire": {
      const black = S.sig.v === "black", fc = black ? "#120612" : col
      if (t >= HIT - 10 && t < END - 40) { const u = Math.min(1, (t - HIT + 10) / 20)
        for (let i = 0; i < 14; i++) { const fx = B.x - 20 + (i / 13) * (B.w + 40), hh = B.h * (0.5 + 0.6 * u) * (0.6 + 0.4 * Math.sin(t * 0.5 + i * 1.7))
          c.fillStyle = black ? (i % 2 ? "#0a020a" : "#2a0a3a") : hexA(i % 3 ? fc : "#ffe070", 0.85); c.beginPath(); c.moveTo(fx - 14, B.gy); c.quadraticCurveTo(fx - 10, B.gy - hh * 0.6, fx + 3 * Math.sin(t * 0.3 + i), B.gy - hh); c.quadraticCurveTo(fx + 12, B.gy - hh * 0.5, fx + 14, B.gy); c.fill() }
        if (black) { c.strokeStyle = "rgba(160,60,200,0.5)"; c.lineWidth = 2; c.strokeRect(B.x - 10, B.y - 10, B.w + 20, B.h + 10) } }
      const ch = Math.max(0, Math.min(1, (t - HIT) / 70))
      if (alive) { if (t < HIT + 90) V(c, { filter: `brightness(${1 - 0.85 * ch}) sepia(${ch})`, dx: Math.sin(t * 0.9) * 2 * (1 - ch) }); else { S.gone = true; tiles(6, 10, 1.5, "brightness(0.15)"); for (const p of S.parts) { p.g = -0.05; p.vy = -0.5 - rnd() } } }
      break }
    case "ice": {
      const u = Math.max(0, Math.min(1, (t - HIT + 20) / 30))
      if (alive) { V(c, { filter: u > 0 ? `hue-rotate(180deg) saturate(${1 - u * 0.6}) brightness(${1 + u * 0.4})` : null })
        if (u > 0) { c.fillStyle = hexA(col, 0.35); c.strokeStyle = "rgba(230,250,255,0.9)"; c.lineWidth = 2; c.beginPath(); const top = B.gy - (B.h + 20) * u
          c.moveTo(B.x - 14, B.gy); c.lineTo(B.x - 20, top + 30); c.lineTo(B.cx - 10, top); c.lineTo(B.x + B.w + 18, top + 20); c.lineTo(B.x + B.w + 12, B.gy); c.closePath(); c.fill(); c.stroke() } }
      else if (!S.shat) { S.shat = 1; tiles(6, 10, 8, "hue-rotate(180deg) brightness(1.4)"); burst(60, B.cx, B.cy, "#e0f8ff", 9, 3, 70, 6) }
      break }
    case "lightning": {
      const bolt = (x0, y0, x1, y1, w) => { c.strokeStyle = hexA(col, 0.95); c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); for (let i = 1; i <= 8; i++) c.lineTo(x0 + (x1 - x0) * i / 8 + (rnd() - 0.5) * 30, y0 + (y1 - y0) * i / 8 + (rnd() - 0.5) * 30); c.stroke() }
      if (t > 20 && t < HIT + 30) { for (let i = 0; i < 3; i++) bolt(H.x, H.y, H.x + (rnd() - 0.5) * 80, H.y + (rnd() - 0.5) * 80, 2); glow(c, H.x, H.y, 40, col) }
      if (t >= HIT && t < HIT + 40) { bolt(B.cx + (rnd() - 0.5) * 40, B.y - 600, B.cx, B.cy, 7); bolt(B.cx, B.cy, B.cx + (rnd() - 0.5) * 300, B.cy + (rnd() - 0.5) * 200, 3); glow(c, B.cx, B.cy, 120, col, 0.7) }
      const s = t - HIT - 40
      if (t < HIT) V(c); else if (s < 0) V(c, { filter: (t % 4 < 2) ? "invert(1) brightness(1.6)" : "brightness(0.3)" })
      else { V(c, { filter: "brightness(0.18)", rot: -d * Math.min(1.5, s * 0.06), dy: Math.min(B.h * 0.4, s * 1.5) }); if (s % 5 === 0 && s < 120) S.parts.push({ x: B.cx + (rnd() - 0.5) * 30, y: B.y + B.h * 0.4, vx: 0, vy: -1.2, g: -0.01, life: 60, max: 60, col: "#3a3a3a", size: 10 }) }
      break }
    case "crush": {
      const obj = S.sig.v || "fist", u = Math.max(0, Math.min(1, (t - 20) / (HIT - 20))), fallY = B.gy - 40 - (1 - u * u) * 900, s = t - HIT
      c.fillStyle = `rgba(0,0,0,${0.5 * u})`; c.beginPath(); c.ellipse(B.cx, B.gy, 60 + 120 * u, 10 + 10 * u, 0, 0, 7); c.fill()
      if (alive) { if (t < HIT) V(c); else { S.gone = true; burst(60, B.cx, B.gy - 10, BLOOD, 9, 4, 70, 6) } }
      else V(c, { sy: 0.08, dy: B.h * 0.46, filter: "brightness(0.6)" })
      if (s > 0) { c.fillStyle = "rgba(110,0,0,0.85)"; c.beginPath(); c.ellipse(B.cx, B.gy, Math.min(150, s * 8), 12, 0, 0, 7); c.fill() }
      const oy = s < 30 ? fallY : B.gy - 40 - (obj === "meteor" || obj === "cube" ? 0 : Math.max(0, s - 30) * 12)
      if (t > 20 && oy > -2000) { c.save(); c.translate(B.cx, oy)
        if (obj === "meteor") {   // a burning rock: fiery tail, lit from below by its own heat, cratered, embers peeling off
          if (s < 0) { c.save(); c.globalCompositeOperation = "lighter"; for (let i = 0; i < 6; i++) { const ty = -110 - 160 - i * 70; const tg = c.createRadialGradient(0, ty, 0, 0, ty, 150 - i * 18); tg.addColorStop(0, `rgba(255,190,90,${0.35 - i * 0.05})`); tg.addColorStop(1, "rgba(255,80,20,0)"); c.fillStyle = tg; c.beginPath(); c.arc(0, ty, 150 - i * 18, 0, 7); c.fill() } c.restore()
            if (t % 2 === 0) S.parts.push({ x: B.cx + (rnd() - 0.5) * 260, y: oy - 110 - 120 * rnd(), vx: (rnd() - 0.5) * 2, vy: -1 - rnd() * 2, g: 0.05, life: 40, max: 40, col: "#ff8a2a", size: 5 }) }
          const rg = c.createRadialGradient(-50, -170, 20, 0, -110, 170); rg.addColorStop(0, "#9a8a78"); rg.addColorStop(0.6, "#5e5044"); rg.addColorStop(1, "#2e241c"); c.fillStyle = rg
          c.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = 160 * (0.9 + 0.1 * Math.sin(i * 2.7) * Math.cos(i * 1.3)); i ? c.lineTo(Math.cos(a) * r, -110 + Math.sin(a) * r) : c.moveTo(Math.cos(a) * r, -110 + Math.sin(a) * r) } c.closePath(); c.fill()
          for (let i = 0; i < 9; i++) { const cx = -100 + (i * 53) % 200, cy = -190 + (i * 41) % 150, cr = 10 + (i * 7) % 18; c.fillStyle = "rgba(0,0,0,0.3)"; c.beginPath(); c.arc(cx, cy, cr, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,0.08)"; c.beginPath(); c.arc(cx - cr * 0.3, cy - cr * 0.3, cr * 0.5, 0, 7); c.fill() }
          if (s < 0) { const hg = c.createRadialGradient(0, 30, 10, 0, 30, 200); hg.addColorStop(0, "rgba(255,140,50,0.45)"); hg.addColorStop(1, "rgba(255,90,30,0)"); c.fillStyle = hg; c.beginPath(); c.ellipse(0, 30, 200, 70, 0, 0, 7); c.fill() }   // heat glow underneath
          if (s === 0) { for (let i = 0; i < 26; i++) S.parts.push({ x: B.cx + (rnd() - 0.5) * 120, y: B.gy - 10, vx: (rnd() - 0.5) * 18, vy: -6 - rnd() * 12, g: 0.55, life: 80, max: 80, col: i % 3 ? "#4a3e34" : "#ff7a2a", size: 6 + rnd() * 8 }); camera.shake?.(22, 26) } }
        else if (obj === "cube") { const cg = c.createLinearGradient(-150, -300, 150, 0); cg.addColorStop(0, "#b8b8c8"); cg.addColorStop(1, "#4a4a5a"); c.fillStyle = cg; c.fillRect(-150, -300, 300, 300)
          c.fillStyle = "rgba(255,255,255,0.18)"; c.fillRect(-150, -300, 300, 14); c.fillRect(-150, -300, 14, 300); c.fillStyle = "rgba(0,0,0,0.3)"; c.fillRect(136, -300, 14, 300); c.fillRect(-150, -14, 300, 14)
          c.strokeStyle = "rgba(0,0,0,0.25)"; c.lineWidth = 2; for (let i = 1; i < 4; i++) { c.beginPath(); c.moveTo(-150 + i * 75, -300); c.lineTo(-150 + i * 75, 0); c.stroke(); c.beginPath(); c.moveTo(-150, -300 + i * 75); c.lineTo(150, -300 + i * 75); c.stroke() }
          if (s === 0) { for (let i = 0; i < 20; i++) S.parts.push({ x: B.cx + (rnd() - 0.5) * 300, y: B.gy - 6, vx: (rnd() - 0.5) * 14, vy: -4 - rnd() * 8, g: 0.5, life: 60, max: 60, col: "#6a5a4a", size: 6 + rnd() * 6 }); camera.shake?.(20, 24) } }
        else if (obj === "foot") { c.fillStyle = col; c.fillRect(-120, -420, 150, 330); c.beginPath(); c.ellipse(-10, -60, 190, 70, 0, 0, 7); c.fill(); c.fillStyle = "rgba(0,0,0,0.25)"; for (let i = 0; i < 4; i++) { c.beginPath(); c.ellipse(-150 + i * 95 + 40, -30, 34, 26, 0, 0, 7); c.fill() } }
        else { c.fillStyle = col; c.beginPath(); c.roundRect ? c.roundRect(-140, -260, 280, 220, 40) : c.rect(-140, -260, 280, 220); c.fill(); c.fillStyle = "rgba(0,0,0,0.22)"; for (let i = 0; i < 4; i++) c.fillRect(-120 + i * 64, -110, 50, 70); c.fillRect(-60, -420, 120, 170) }
        c.restore() }
      break }
    case "punch": {
      const s = t - HIT
      if (s < 0) V(c)
      else if (s < 70) { const u = s / 70, far = { x: B.cx + d * 1400 * u, y: B.cy - 700 * u * (2 - u) }
        if (s < 14) { c.strokeStyle = hexA(col, 1 - s / 14); c.lineWidth = 10; c.beginPath(); c.arc(B.cx, B.cy, 40 + s * 22, 0, 7); c.stroke(); if (S.sig.v === "ring") { c.lineWidth = 4; c.beginPath(); c.arc(ctr(S.w).x, ctr(S.w).y, 60 + s * 40, 0, 7); c.stroke() } }
        V(c, { dx: far.x - B.cx, dy: far.y - B.cy, rot: d * s * 0.35, sx: 1 - u * 0.9, sy: 1 - u * 0.9 })
        if (s === 0) burst(40, B.cx, B.cy, BLOOD, 9, 2, 60, 5) }
      else if (s < 110) { S.gone = true; const x = B.cx + d * 1400, y = B.cy - 700, a = 1 - (s - 70) / 40; c.fillStyle = `rgba(255,255,255,${a})`; c.save(); c.translate(x, y); c.rotate(s * 0.1); for (let i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.beginPath(); c.moveTo(0, -30); c.lineTo(6, 0); c.lineTo(-6, 0); c.fill() } c.restore() }
      break }
    case "vortex": {
      const u = Math.max(0, Math.min(1, (t - 26) / 30)), close = Math.max(0, (t - HIT - 60) / 20), R = 140 * u * (1 - Math.min(1, close)), s = Math.max(0, (t - HIT) / 55)
      if (R > 1) for (let i = 0; i < 5; i++) { c.strokeStyle = hexA(i % 2 ? col : "#ffffff", 0.7 - i * 0.1); c.lineWidth = 6 - i; c.beginPath()
        for (let a = 0; a < Math.PI * 4; a += 0.2) { const r = R * (1 - a / (Math.PI * 4)) * (1 - i * 0.12), aa = a + t * 0.2 + i; a ? c.lineTo(B.cx + Math.cos(aa) * r, B.cy + Math.sin(aa) * r * 0.9) : c.moveTo(B.cx + Math.cos(aa) * r, B.cy + Math.sin(aa) * r * 0.9) } c.stroke() }
      if (alive) { if (s < 1) V(c, { rot: s * s * 12, sx: 1 - s, sy: 1 - s, alpha: 1 - s * 0.3 }); else S.gone = true }
      break }
    case "blitz": {
      if (t > 38 && t < 96) { for (let i = 0; i < 4; i++) { const a = rnd() * Math.PI * 2; c.strokeStyle = hexA(col, 0.8); c.lineWidth = 3; c.beginPath(); c.moveTo(B.cx + Math.cos(a) * 160, B.cy + Math.sin(a) * 100); c.lineTo(B.cx + Math.cos(a) * 20, B.cy + Math.sin(a) * 20); c.stroke() }
        if (t % 3 === 0) { burst(4, B.cx + (rnd() - 0.5) * B.w, B.y + rnd() * B.h, "#ffffff", 5, 0, 14, 6); burst(2, B.cx, B.cy, BLOOD, 4, 1, 40, 4) } }
      if (alive) V(c, { dx: t > 38 ? (rnd() - 0.5) * 10 : 0, dy: t > 38 ? (rnd() - 0.5) * 6 : 0 })
      else if (!S.blown) { S.blown = 1; tiles(5, 8, 10); burst(50, B.cx, B.cy, BLOOD, 8, 2, 70, 5) }
      break }
    case "barrage": {
      const v = S.sig.v
      if (t > 30 && t < 96) for (let i = 0; i < 3; i++) { const u = ((t * 3 + i * 7) % 12) / 12, ty = B.y + B.h * (0.2 + 0.6 * ((t * 7 + i * 13) % 10) / 10), x = H.x + (B.cx - H.x) * u, y = H.y + (ty - H.y) * u
        c.save(); c.translate(x, y); c.rotate(Math.atan2(ty - H.y, B.cx - H.x)); c.fillStyle = col
        if (v === "arrows") { c.fillRect(-18, -1.5, 30, 3); c.beginPath(); c.moveTo(12, -5); c.lineTo(20, 0); c.lineTo(12, 5); c.fill() } else if (v === "cards") { c.rotate(t * 0.5); c.fillRect(-7, -10, 14, 20) } else { c.fillRect(-14, -3, 28, 6); glow(c, 0, 0, 10, col) }
        c.restore()
        if (u > 0.9 && S.holes.length < 40) S.holes.push([rnd(), 0.15 + rnd() * 0.75]) }
      const s = t - 100
      const holes = (cc) => { for (const [hx, hy] of S.holes) { cc.fillStyle = "#5a0008"; cc.beginPath(); cc.arc(B.x + hx * B.w, B.y + hy * B.h, 3.5, 0, 7); cc.fill() } }
      if (s < 0) { V(c, { dx: t > 30 ? (rnd() - 0.5) * 6 : 0 }); holes(c) }
      else { V(c, { rot: -d * Math.min(1.5, s * 0.05), dy: Math.min(B.h * 0.42, s * 1.6), filter: "brightness(0.75)" }); if (s > 10) { c.fillStyle = "rgba(110,0,0,0.8)"; c.beginPath(); c.ellipse(B.cx - d * 40, B.gy, Math.min(100, s * 2), 9, 0, 0, 7); c.fill() } }
      break }
    case "bind": {
      const v = S.sig.v, u = Math.max(0, Math.min(1, (t - 26) / 40)), s = t - HIT - 26
      if (alive) { V(c, { sx: s > 0 ? 1 - Math.min(0.5, s * 0.02) : 1 })
        const top = B.gy - (B.h + 16) * u, wx = s > 0 ? B.w * Math.min(0.5, s * 0.02) / 2 : 0, hw = (B.w + 20 - wx * 2) / 2
        // spiralling bands (sand / wood / web) wind up around the body from the floor, then squeeze
        const base = c.createLinearGradient(B.cx - hw, 0, B.cx + hw, 0); base.addColorStop(0, hexA(col, 0.95)); base.addColorStop(0.45, hexA("#ffffff", 0.25)); base.addColorStop(0.55, hexA(col, 0.95)); base.addColorStop(1, hexA("#000000", 0.5))
        c.save(); c.beginPath(); c.moveTo(B.cx - hw - 6, B.gy); for (let y = B.gy; y >= top; y -= 6) c.lineTo(B.cx - hw + Math.sin(y * 0.09 + t * 0.3) * 4, y); for (let y = top; y <= B.gy; y += 6) c.lineTo(B.cx + hw + Math.sin(y * 0.09 - t * 0.3) * 4, y); c.lineTo(B.cx + hw + 6, B.gy); c.closePath()
        c.fillStyle = col; c.fill(); c.fillStyle = base; c.fill(); c.clip()
        c.strokeStyle = v === "web" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.35)"; c.lineWidth = v === "web" ? 1.5 : 3
        for (let i = -12; i < 30; i++) { const y0 = B.gy - i * 14 + ((t * 1.6) % 14); c.beginPath(); c.moveTo(B.cx - hw - 4, y0); c.bezierCurveTo(B.cx - hw * 0.3, y0 - 18, B.cx + hw * 0.3, y0 + 4, B.cx + hw + 4, y0 - 14); c.stroke() }
        if (v !== "web" && v !== "wood") for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,240,200,${0.25 + 0.2 * ((i * 7) % 3)})`; c.fillRect(B.cx - hw + ((i * 37 + t * 3) % (hw * 2)), top + ((i * 53 + t * 5) % Math.max(1, B.gy - top)), 2, 2) }   // grains
        c.restore()
        if (u < 1 && t % 2 === 0) S.parts.push({ x: B.cx + (rnd() - 0.5) * B.w * 1.6, y: B.gy - 4, vx: (rnd() - 0.5) * 3, vy: -3 - rnd() * 4, g: 0.25, life: 30, max: 30, col, size: 3 })   // kicked-up sand
        if (s >= 24) { S.gone = true; burst(60, B.cx, B.cy, v === "web" ? BLOOD : col, 8, 3, 70, 6); burst(30, B.cx, B.cy, BLOOD, 6, 3, 60, 5); camera.shake?.(10, 16); sfx("splat", S.sig) } }
      break }
    case "explode": {
      const s = t - HIT
      if (alive) { if (s < 0) V(c, { filter: t > 30 ? `brightness(${1 + (t - 30) * 0.08})` : null }); else { S.gone = true; burst(80, B.cx, B.cy, col, 12, 3, 80, 7); tiles(4, 6, 12, "brightness(0.2)") } }
      if (s >= 0 && s < 90) { const r = 40 + s * 9; glow(c, B.cx, B.cy, r, col, Math.max(0, 1 - s / 90)); glow(c, B.cx, B.cy, r * 0.5, "#ffffff", Math.max(0, 1 - s / 40)) }
      if (s > 30 && s < 180) { const a = 0.6 * (1 - (s - 30) / 150); for (let i = 0; i < 8; i++) { c.fillStyle = `rgba(40,30,30,${a})`; c.beginPath(); c.arc(B.cx + Math.sin(i * 2) * 50, B.gy - 60 - (s - 30) * 2 - i * 30, 60 + i * 6, 0, 7); c.fill() } }
      break }
    case "erase": {
      const s = Math.max(0, (t - HIT) / 60)
      if (alive) { if (s < 1) { V(c, { clip: (cc, w, h) => cc.rect(0, h * s, w, h), filter: `brightness(${1 + s})` }); c.strokeStyle = hexA(col, 0.6); c.lineWidth = 3; c.strokeRect(B.x - 6, B.y - 6, B.w + 12, B.h + 12)
          if (t % 2 === 0) for (let i = 0; i < 4; i++) S.parts.push({ x: B.x + rnd() * B.w, y: B.y + B.h * s, vx: (rnd() - 0.5), vy: -1.5 - rnd() * 2, g: -0.02, life: 60, max: 60, col, size: 4 }) }
        else S.gone = true }
      if (t > 20 && t < HIT + 60) glow(c, B.cx, B.cy, B.h * 0.8, col, 0.35)
      break }
    case "poison": {
      const s = Math.max(0, (t - HIT) / 60)
      if (s < 1) V(c, { filter: `hue-rotate(${Math.round(240 * s)}deg) saturate(${1 + s})`, dx: Math.sin(t * 0.7) * 3 * s })
      else V(c, { filter: "hue-rotate(240deg) saturate(2) brightness(0.6)", rot: -d * Math.min(1.5, (t - HIT - 60) * 0.06), dy: Math.min(B.h * 0.4, (t - HIT - 60) * 1.5) })
      if (t > HIT && t % 4 === 0) S.parts.push({ x: B.x + rnd() * B.w, y: B.y + rnd() * B.h, vx: 0, vy: -0.8, g: -0.01, life: 50, max: 50, col, size: 7 })
      if (t > HIT && t < HIT + 8) { c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.moveTo(H.x, H.y); c.lineTo(B.cx, B.cy); c.stroke() }
      break }
    case "psychic": {
      const u = Math.max(0, Math.min(1, (t - 26) / 34)), s = Math.max(0, (t - HIT) / 44)
      if (alive) { if (s < 1) { V(c, { dy: -120 * u, rot: s * s * 6, sx: 1 - 0.5 * s, sy: 1 - 0.9 * s * s }); glow(c, B.cx, B.cy - 120 * u, B.h * (0.7 - 0.6 * s), col, 0.5) } else { S.gone = true; burst(70, B.cx, B.cy - 120, BLOOD, 10, 0, 70, 6); burst(40, B.cx, B.cy - 120, col, 12, 0, 50, 5) } }
      break }
    case "note": {
      const s = t - HIT - 90
      if (s < 0) V(c, { dx: t > HIT + 60 ? Math.sin(t) * 2 : 0 }); else V(c, { rot: -d * Math.min(1.5, s * 0.05), dy: Math.min(B.h * 0.42, s * 1.6), filter: "brightness(0.8)" })
      break }
    case "holy": {
      const s = Math.max(0, (t - HIT) / 120)
      if (t > 20) { const g = c.createLinearGradient(B.cx - 70, 0, B.cx + 70, 0); g.addColorStop(0, "rgba(255,240,180,0)"); g.addColorStop(0.5, `rgba(255,245,200,${0.7 * Math.min(1, (t - 20) / 30)})`); g.addColorStop(1, "rgba(255,240,180,0)"); c.fillStyle = g; c.fillRect(B.cx - 70, B.y - 2000, 140, 2000 + B.h) }
      if (s < 1) V(c, { dy: -900 * s * s, alpha: 1 - s, filter: `brightness(${1 + s * 2})` }); else S.gone = true
      break }
  }
  drawParts(c)
  goreDraw(c)   // body parts, organs, bones, blood (over the technique)
  c.restore()
}
// screen layer: the Death Note page, flashes, the technique name + FATALITY
export function drawSignatureFatalityScreen(c, canvas) {
  if (!S) return
  const W = canvas.width, H = canvas.height, t = S.t, k = S.sig.kind
  c.save()
  { // CINEMA: letterbox bars slide in, a vignette closes in, speed lines rush toward the centre before the hit
    const inA = Math.min(1, t / 16) * Math.min(1, (END - t) / 14), bh = H * 0.085 * inA
    const vg = c.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.85); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, `rgba(0,0,0,${0.55 * inA})`); c.fillStyle = vg; c.fillRect(0, 0, W, H)
    if (t > HIT - 22 && t < HIT + 2 && k !== "note") { const a = Math.min(1, (t - HIT + 22) / 8); c.strokeStyle = `rgba(255,255,255,${0.35 * a})`; c.lineWidth = 2
      for (let i = 0; i < 48; i++) { const ang = i * 2.399 + t * 0.07, r0 = H * (0.32 + ((i * 37 + t * 9) % 40) / 100), r1 = H * 1.1; c.beginPath(); c.moveTo(W / 2 + Math.cos(ang) * r0, H / 2 + Math.sin(ang) * r0); c.lineTo(W / 2 + Math.cos(ang) * r1, H / 2 + Math.sin(ang) * r1); c.stroke() } }
    c.fillStyle = "#000"; c.fillRect(0, 0, W, bh); c.fillRect(0, H - bh, W, bh)
  }
  if (t >= HIT && t < HIT + 6 && k !== "note" && k !== "holy") { c.fillStyle = `rgba(255,255,255,${0.7 * (1 - (t - HIT) / 6)})`; c.fillRect(0, 0, W, H) }
  if (k === "note" && t > 20 && t < HIT + 110) {
    const a = Math.min(1, (t - 20) / 15, (HIT + 110 - t) / 15), pw = W * 0.34, ph = H * 0.5, x = W / 2 - pw / 2, y = H * 0.18
    c.globalAlpha = a; c.fillStyle = "#f4f0e6"; c.fillRect(x, y, pw, ph); c.strokeStyle = "#b8b0a0"; c.lineWidth = 1; for (let ly = y + 40; ly < y + ph; ly += 26) { c.beginPath(); c.moveTo(x + 10, ly); c.lineTo(x + pw - 10, ly); c.stroke() }
    c.fillStyle = "#111"; c.font = `700 ${Math.floor(H * 0.028)}px Georgia`; c.textAlign = "left"
    const name = (S.v.name || S.v.rosterKey || "???").toUpperCase(), lines = S.sig.v === "case" ? ["CASE FILE: " + name, "VERDICT: GUILTY", "CASE CLOSED."] : [name, "cause of death:", "heart attack. 40 seconds."]
    let n = Math.max(0, Math.floor((t - 30) * 0.7))
    lines.forEach((ln, i) => { const show = ln.slice(0, Math.max(0, n)); n -= ln.length + 4; c.fillText(show, x + 22, y + 60 + i * 52) })
    c.globalAlpha = 1 }
  goreDrawScreen(c, W, H)   // blood on the lens
  if (t > HIT + 50) { const al = Math.min(1, (t - HIT - 50) / 10) * Math.min(1, (END - t) / 12), pop = 1 + 0.5 * Math.max(0, 1 - (t - HIT - 50) / 9)   // punches in
    c.globalAlpha = al; c.textAlign = "center"; c.lineWidth = 6; c.strokeStyle = "#000"; c.translate(W / 2, H * 0.19); c.scale(pop, pop); c.translate(-W / 2, -H * 0.19)
    c.shadowColor = S.sig.color === "#140814" ? "#b070e0" : S.sig.color; c.shadowBlur = 24
    let fs = Math.floor(H * 0.085); c.font = `900 ${fs}px Arial`; while (c.measureText(S.sig.name).width > W * 0.9 && fs > 20) { fs -= 2; c.font = `900 ${fs}px Arial` }
    c.strokeText(S.sig.name, W / 2, H * 0.16); c.fillStyle = S.sig.color === "#140814" ? "#b070e0" : S.sig.color; c.fillText(S.sig.name, W / 2, H * 0.16)
    c.shadowColor = "#ff0000"; c.shadowBlur = 18; c.font = `800 ${Math.floor(H * 0.05)}px Arial`; c.strokeText("FATALITY", W / 2, H * 0.24); c.fillStyle = "#e61e22"; c.fillText("FATALITY", W / 2, H * 0.24); c.shadowBlur = 0 }
  c.restore()
}
// ── synth sound (SFX master) ──
function ac() { const c = sound._ctx; return c && sound._master ? c : null }
let _nb = null
function nz(c, dur) { if (!_nb || _nb.sampleRate !== c.sampleRate) { _nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = _nb.getChannelData(0); let s = 99; for (let i = 0; i < d.length; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; d[i] = ((s >>> 0) / 4294967296) * 2 - 1 } } const n = c.createBufferSource(); n.buffer = _nb; n.loop = true; return n }
function env(c, node, t0, a, peak, dur) { const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); node.connect(g); g.connect(sound._master); return g }
function sfx(ev) {
  const c = ac(); if (!c) return; const t0 = c.currentTime + 0.01
  const noise = (dur, type, f0, f1, peak, a = 0.01) => { const n = nz(c, dur), f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur); n.connect(f); env(c, f, t0, a, peak, dur); n.start(t0); n.stop(t0 + dur + 0.05) }
  const tone = (dur, type, f0, f1, peak, a = 0.01) => { const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(f1, t0 + dur); env(c, o, t0, a, peak, dur); o.start(t0); o.stop(t0 + dur + 0.05) }
  if (ev === "charge") { tone(1.0, "sawtooth", 80, 420, 0.12, 0.6); noise(1.0, "bandpass", 300, 2000, 0.15, 0.6) }
  else if (ev === "whoosh") noise(0.35, "bandpass", 600, 3000, 0.4, 0.1)
  else if (ev === "boom") { noise(1.6, "lowpass", 1200, 60, 1.0); tone(0.8, "sine", 110, 30, 0.9) }
  else if (ev === "slash") { noise(0.18, "highpass", 6000, 2000, 0.6); tone(0.25, "triangle", 2400, 900, 0.2) }
  else if (ev === "splat") { noise(0.35, "lowpass", 900, 200, 0.7); tone(0.3, "sine", 140, 50, 0.6) }
  else if (ev === "freeze") { noise(0.9, "highpass", 3000, 8000, 0.25, 0.2) }
  else if (ev === "shatter") { noise(1.0, "highpass", 2500, 4000, 0.8); for (let i = 0; i < 12; i++) { const o = c.createOscillator(), at = t0 + i * 0.05; o.frequency.value = 2500 + (i * 731) % 4000; const g = c.createGain(); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.1, at + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.2); o.connect(g); g.connect(sound._master); o.start(at); o.stop(at + 0.25) } }
  else if (ev === "zap") { noise(0.6, "bandpass", 4000, 1500, 0.6); tone(0.5, "square", 180, 60, 0.25) }
  else if (ev === "shot") { noise(0.08, "bandpass", 2500, 800, 0.35); tone(0.08, "square", 600, 200, 0.08) }
  else if (ev === "write") { noise(2.5, "bandpass", 3000, 3500, 0.08, 0.3) }
  else if (ev === "choir") { for (const f of [262, 330, 392, 523]) tone(3.0, "sine", f, f, 0.08, 0.8) }
}
