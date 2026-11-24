// squadCore.js — the shared "Ranger squad" engine: several fighters as ONE fighter, swapped with Ben 10's Omnitrix dial.
// Used by spdSquad.js (S.P.D. Rangers, 2026-11-23), mmprSquad.js (Mighty Morphin Rangers, 2026-11-23) and nsSquad.js (Ninja
// Storm Rangers, 2026-11-23 — five ninja.js forms; uses the optional kit hooks below: clear / busy / onSwap / onTick / onSelf / extra).
//
// Each FORM is an existing roster fighter, unchanged. Like the Wind Rangers (nsDuo.js) the fighter's live rosterKey is the
// ACTIVE form's id, so every form-specific path — kit, sprites, sounds, FX, HUD portrait, CPU perception — runs as-is.
// Health and meter are SHARED.
// SWITCH = Ben's dial (game.js OMX_DOUBLE_TAP_WINDOW 16 / OMX_ARM_WINDOW 18): ↓ ↓ then the form's button. The pick press
// is SWALLOWED (input.js squad mask) until released. Allowed in neutral, in the air and in the RECOVERY of a normal (Ben's
// mid-combo swap); never in hitstun / blockstun / knockdown / a special / a super / a teleport / a kit lock (W.busy).
// Tag-in: a teleport flash (render: squadFx) + a few invulnerable frames. State on f._squad (plain JSON, carries its
// squad id; the replay / LAN snapshot carries it). No Math.random — the CPU's variety is a hash of the frame counter.
export const SQUADS = {}
export const squadOf = f => (f?._squad && SQUADS[f._squad.id]) || SQUADS[f?.rosterKey] || null
export const isSquadKey = k => !!SQUADS[k]
// TEAM ULTIMATE (squadUlt.js registers itself here — no import cycle): W + U together on a full meter
let TEAM_ULT = null
export const setTeamUlt = api => { TEAM_ULT = api }
export const TEAM_ULT_INPUT = { window: 5 }   // Jump and Ultimate within 5 frames of each other (either order, same frame ideal)

const FORM_FIELDS = ['name', 'displayName', 'hudName', 'color', 'portrait', 'hudIcon', 'spriteSheet', 'spriteScale', 'animationData', 'basic_attacks',
  'specials', 'ultimate', 'traits', 'energyConfig', 'grabCastPose', 'primary', 'secondary', 'archetypes', 'movement', 'civilianIdentity']
const PACE = { easy: 140, adaptive: 70, normal: 70, hard: 45, impossible: 30, master: 26 }
const ctr = o => (o.x || 0) + (o.w || 60) / 2

// cfg: { id, forms[], buttons[], chars{form: char}, colors{}, short{}, roles{form: any|close|mid|far},
//        tuning{health, cooldown, invuln, flash, dbl, arm}, startPrefix, startNames{suffix: form}, statsFor?(form, char),
//        optional kit hooks: clear?(f, from) busy?(f) onSwap?(f, form, from) onTick?(f, raw, W) — the forms' own engine;
//        onSelf?(f, W) — ↓↓ + the ACTIVE form's own button; extra?{button: fn(f, W)} — ↓↓ + a non-dial button;
//        teamUlt: false — this squad has no W + U team ultimate (the CPU never saves meter for one) }
export function makeSquad(cfg) {
  const ID = cfg.id, FORMS = cfg.forms, BUTTONS = cfg.buttons, CHAR = cfg.chars, T = cfg.tuning, ROLE = cfg.roles
  const EXTRA = cfg.extra || {}, EXTRA_KEYS = Object.keys(EXTRA), ULT = () => (cfg.teamUlt === false ? null : TEAM_ULT)
  let SKIN_HOOK = null
  const SKIN_CACHE = new Map()
  const startForm = skinId => {
    const p = cfg.startPrefix
    if (skinId && skinId.startsWith(p)) { const f = cfg.startNames[skinId.slice(p.length)]; if (f) return f }
    return FORMS[0]
  }
  const mine = f => !!f && (f._squad ? f._squad.id === ID : f.rosterKey === ID)
  function applyForm(f, form) {
    const c = CHAR[form]; if (!c) return
    f.rosterKey = form
    for (const k of FORM_FIELDS) if (c[k] !== undefined) f[k] = c[k]
    if (!c.hudName) f.hudName = c.name
    const st = cfg.statsFor ? cfg.statsFor(form, c) : c.stats
    f.stats = { ...st, maxHealth: f.maxHealth }
    f.baseSpeed = f.speed = st.speed; f.dashSpeed = st.dashSpeed; f.dashDuration = st.dashDuration
    if (st.dashCooldownMax != null) f.dashCooldownMax = st.dashCooldownMax
    f.maxJumps = st.maxJumps; f.jumpForce = -(st.jumpPower || 31); f.weight = st.weight
    f._skinAnim = null; f._baseSkinAnim = null; f._recolorTag = null
    if (SKIN_HOOK) SKIN_HOOK(f, form)
    if (f.spriteHandler) { f.spriteHandler.currentAction = null; f.spriteHandler.frameIndex = 0; f.spriteHandler.frameTimer = 0; f.spriteHandler.locked = false }
  }
  function roundReset(f) {
    if (!mine(f)) return
    const start = startForm(f.skinId)
    try { TEAM_ULT?.clear?.() } catch (_) {}
    f._squad = { id: ID, form: start, start, t: 0, cd: 0, swaps: 0, flash: 0, from: null, prevDown: false, downAt: null, armT: 0, prev: {}, cpu: null, pu: false, pj: false, uAt: -99, jAt: -99, teamUlts: 0 }
    applyForm(f, start)
  }
  const ensure = f => { if (f && f.rosterKey === ID && !f._squad) roundReset(f) }
  function refuse(f, form, W) {
    const q = f?._squad
    if (!q || q.id !== ID) return 'not-squad'
    if (!FORMS.includes(form)) return 'bad-form'
    if (form === q.form) return 'same'
    if (!(f.health > 0)) return 'ko'
    if ((f.hitstun || 0) > 0) return 'hitstun'
    if ((f.blockstun || 0) > 0) return 'blockstun'
    if (f.knockdownState || f.isGrabbed) return 'down'
    if (q.cd > 0) return 'cooldown'
    if (f._ranger?.blink || f._groundTeleport?.action) return 'teleporting'
    const a = f.attacking ? f.currentAttack : null
    if (a) {
      if (a.isUltimate || a.category === 'ultimate' || a.isSpecial || a.category === 'special') return 'attacking'
      const elapsed = (a.total ?? 0) - (a.timer ?? 0), activeEnd = a.activeEnd ?? ((a.startup || 0) + (a.active || 0))
      if (!(elapsed > activeEnd)) return 'attacking'   // normals: recovery frames only (Ben's mid-combo swap)
    }
    try { if (W?.busy?.(f) || cfg.busy?.(f)) return 'busy' } catch (_) {}
    return null
  }
  function swap(f, form, W) {
    ensure(f)
    if (refuse(f, form, W)) return false
    const q = f._squad, from = q.form
    try { W?.clear?.(f, from) } catch (_) {}
    try { cfg.clear?.(f, from) } catch (_) {}
    f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0; f._rekkaNext = null
    applyForm(f, form)
    q.form = form; q.from = from; q.cd = T.cooldown; q.flash = T.flash; q.swaps++; f._squadTotal = (f._squadTotal || 0) + 1   // whole-match count
    f.invulnTimer = Math.max(f.invulnTimer || 0, T.invuln)
    try { W?.cue?.(f, form) } catch (_) {}
    try { cfg.onSwap?.(f, form, from) } catch (_) {}
    return true
  }
  function tick(f, raw, W) {
    ensure(f); const q = f?._squad; if (!q || q.id !== ID) return
    q.t++; if (q.cd > 0) q.cd--; if (q.flash > 0) q.flash--
    const B = W?.benSwap?.() || T
    const down = !!raw.down
    if (down && !q.prevDown) {
      if (q.downAt != null && q.t - q.downAt <= (B.dbl ?? T.dbl)) { q.armT = B.arm ?? T.arm; q.downAt = null } else q.downAt = q.t
    }
    q.prevDown = down
    const edge = {}
    for (const b of [...BUTTONS, ...EXTRA_KEYS]) { const v = !!raw[b]; edge[b] = v && !q.prev[b]; q.prev[b] = v }
    try { cfg.onTick?.(f, raw, W) } catch (_) {}
    // TEAM ULTIMATE: W (Jump) + U (Ultimate) together — never while the dial is armed (↓↓ then U is still Omega)
    const uv = !!raw.ultimate, jv = !!(raw.jump || raw.up)
    if (uv && !q.pu) q.uAt = q.t
    if (jv && !q.pj) q.jAt = q.t
    q.pu = uv; q.pj = jv
    const TU = ULT()
    if (TU && q.armT <= 0 && uv && jv && Math.abs(q.uAt - q.jAt) <= TEAM_ULT_INPUT.window && (q.uAt === q.t || q.jAt === q.t)) {
      if (TU.start(f, W)) { f._squadEat = { ...(f._squadEat || {}), ultimate: true, jump: true, up: true }; q.uAt = q.jAt = -99; return }
    }
    if (q.armT > 0) {
      q.armT--
      const i = BUTTONS.findIndex(b => edge[b])
      if (i >= 0) {
        q.armT = 0
        const form = FORMS[i]
        if (form !== q.form && swap(f, form, W)) f._squadEat = { ...(f._squadEat || {}), [BUTTONS[i]]: true }
        else if (form === q.form) {   // re-calling the active form: still eat the press (+ the squad's own ↓↓ technique, if any)
          f._squadEat = { ...(f._squadEat || {}), [BUTTONS[i]]: true }
          try { cfg.onSelf?.(f, W) } catch (_) {}
        }
      } else {
        const x = EXTRA_KEYS.find(b => edge[b])
        if (x) { q.armT = 0; f._squadEat = { ...(f._squadEat || {}), [x]: true }; try { EXTRA[x](f, W) } catch (_) {} }
      }
    }
  }
  // CPU: the form for the range, mid-combo tag-ins, out of the wrong tool, and a rotation through the squad
  function cpu(f, opp, difficulty, W) {
    const q = f?._squad; if (!q || q.id !== ID || !opp || !(f.health > 0)) return
    const c = q.cpu || (q.cpu = { next: 0, mismatch: 0, last: -999 })
    const pace = PACE[difficulty] ?? 70, t = q.t
    // the TEAM ULTIMATE takes priority on a full meter — this runs before the CPU's own AI each frame, so the squad calls
    // everyone in instead of spending the meter on the active Ranger's ultimate (squadUlt.js refuses while it can't start)
    const TEAM_ULT = ULT()
    if (TEAM_ULT && (f.energy || 0) >= (TEAM_ULT.cost || 100) && t - (c.ult ?? -999) > 240 && TEAM_ULT.start(f, W, opp)) { c.ult = t; c.next = t + 30; return }
    // saving up: from 50 % the CPU stops spending meter on specials (S.P.D.'s blasters would otherwise never let it fill)
    if (TEAM_ULT && (f.energy || 0) >= (TEAM_ULT.cost || 100) * 0.5 && (f.energy || 0) < (TEAM_ULT.cost || 100)) f._squadEat = { ...(f._squadEat || {}), special: true }
    if (t < c.next) return
    const dist = Math.abs(ctr(opp) - ctr(f))
    const want = dist > 380 ? 'far' : dist > 200 ? 'mid' : 'close'
    const rot = (h => FORMS[(h >>> 0) % FORMS.length])(Math.imul((t >> 5) + 7, 2654435761))   // deterministic variety
    if ((opp.hitstun || 0) > 6 && (f.comboCounter || 0) >= 2 && t - c.last > 60 + pace) {
      const pool = FORMS.filter(k => k !== q.form && (ROLE[k] === 'close' || ROLE[k] === 'any'))
      const pick = pool.includes(rot) ? rot : pool[(t >> 3) % pool.length]
      if (pick && swap(f, pick, W)) { c.last = t; c.next = t + 12; return }
    }
    const fits = ROLE[q.form] === 'any' || ROLE[q.form] === want || (want === 'mid' && ROLE[q.form] !== 'close')
    c.mismatch = fits ? 0 : c.mismatch + 8
    if (c.mismatch > 90 && t - c.last > 120 + pace) {
      const pool = FORMS.filter(k => k !== q.form && (ROLE[k] === want || (want === 'mid' && ROLE[k] === 'far')))
      const pick = pool.length ? (pool.includes(rot) ? rot : pool[0]) : FORMS[0]
      if (swap(f, pick, W)) { c.last = t; c.mismatch = 0 }
    }
    if (t - c.last > 200 + pace * 2) {
      const pool = FORMS.filter(k => k !== q.form && k !== q.from)
      const pick = pool.includes(rot) ? rot : pool[(t >> 4) % pool.length]
      if (swap(f, pick, W)) { c.last = t; c.next = t + 12; return }
    }
    c.next = t + 8
  }
  for (const c of Object.values(CHAR)) c.hidden = true   // the forms leave the select grid (still valid ids for replays / tests / ?p1=)
  const api = {
    id: ID, forms: FORMS, buttons: BUTTONS, colors: cfg.colors, short: cfg.short, tuning: T, roles: ROLE,
    startForm, applyForm, roundReset, refuse, swap, tick, cpu,
    registerForm: (key, char) => { CHAR[key] = char; char.hidden = true },
    formChar: form => CHAR[form] || null,
    // a form's animations under a skin id (the squad themes) — for art drawn outside the fighter (the team ultimate)
    skinAnim: (skinId, form) => {
      const key = (skinId || '') + '|' + form
      if (SKIN_CACHE.has(key)) return SKIN_CACHE.get(key)
      const tmp = { skinId, rosterKey: form }
      try { SKIN_HOOK?.(tmp, form) } catch (_) {}
      if (tmp._skinAnim) SKIN_CACHE.set(key, tmp._skinAnim)   // cache hits only (skin packs register later)
      return tmp._skinAnim || CHAR[form]?.animationData || null
    },
    setSkinHook: fn => { SKIN_HOOK = fn },
    preloadKeys: mc => [mc?.p1CharKey, mc?.p2CharKey, ...(mc?.extraCharKeys || [])].includes(ID) ? [...FORMS] : [],
    state: f => f?._squad && f._squad.id === ID ? { id: ID, form: f._squad.form, cd: f._squad.cd, swaps: f._squad.swaps, total: f._squadTotal || 0, start: f._squad.start, armT: f._squad.armT, flash: f._squad.flash, from: f._squad.from, key: f.rosterKey, eat: f._squadEat || null, teamUlts: f._teamUltTotal || 0 } : null,
  }
  SQUADS[ID] = api
  return api
}

// ── dispatchers over every registered squad (game.js calls these; each squad ignores fighters that aren't its own) ──
export const tickSquads = (f, raw, W) => { const s = squadOf(f); if (s) s.tick(f, raw, W) }
export const squadsRoundReset = f => { const s = squadOf(f); if (s) s.roundReset(f) }
export const squadsCpu = (f, opp, d, W) => { const s = squadOf(f); if (s) s.cpu(f, opp, d, W) }
export const squadsSwap = (f, form, W) => { const s = squadOf(f); return s ? s.swap(f, form, W) : false }
export const squadsState = f => { const s = squadOf(f); return s ? s.state(f) : null }
export const squadsPreloadKeys = mc => Object.values(SQUADS).flatMap(s => s.preloadKeys(mc))
