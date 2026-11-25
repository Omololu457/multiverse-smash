// aiMaster.js — the MASTER CPU brain (step 2 of the smarter-CPU plan).
//
// A layer ON TOP of the Impossible AI (ai.js). The Impossible AI still runs every frame and keeps everything that makes
// each fighter play like themselves — movement, spacing, guarding, parry reads, and every per-character CPU system
// (Gojo's Infinity, Sukuna's signatures, Ninja Storm clones, Ben's transforms, …). This layer only steps in when the
// fighter is FREE and it sees a real opportunity, using the fighter's own measured moves from aiScoutData.js
// (tools/ai_scout/scout.mjs: startup, reach, damage, safety, anti-air, combos — all measured in the real engine):
//   PUNISH    foe stuck in recovery (whiffed / blocked attack) → the most damaging move or verified combo that lands
//             in time from this distance
//   ANTI-AIR  foe falling toward us → the fighter's fastest measured anti-air
//   NEUTRAL   close: a verified combo (or a GRAB once the foe has blocked us twice) · mid: a safe poke · far: a
//             full-screen tool
// It performs a choice by playing that move's REAL input script (the same frames a player would press — motions,
// holds, double-taps), returned as raw input; game.js feeds it through the same press/release handlers the keyboard
// uses. Nothing here changes any move: the CPU can only press buttons. Deterministic: every roll is the seeded game RNG.
import { AI_SCOUT } from "./aiScoutData.js"
import { gameRng } from "./rng.js"
import { AI_MASTER_TUNING } from "./aiMasterTuning.js"

// Defaults. Per-fighter overrides + learned starting payoffs come from aiMasterTuning.js (step 3, AI-vs-AI self-play).
export const MASTER = Object.freeze({
  punishChance: 0.95,   // foe in recovery + a move that lands in time → take it
  antiAirChance: 0.8,   // foe falling toward us + an anti-air that's fast enough
  comboChance: 0.45,    // per neutral decision when in a verified combo's range
  pokeChance: 0.3,      // per neutral decision when a safe poke reaches
  zoneChance: 0.14,     // per neutral decision at long range with a full-screen tool
  neutralEvery: 8,      // frames between neutral decisions
  grabAfterBlocks: 2,   // the foe blocked this many of our openers in a row → open with a grab
  safeOnBlock: -4,      // a poke must be at least this safe on block
  judgeFrames: 40,      // after a move ends, keep counting damage both ways this long → that move's PAYOFF
  deferFrames: 60,      // how long a "let the Impossible AI play" choice is judged for
})

const DECODE = Object.fromEntries(Object.entries(AI_SCOUT.codes).map(([field, code]) => [code, field]))
const rand = () => gameRng.next()

// RLE script → [{field:true,…}] (authored facing right: right = toward the foe), trimmed of leading/trailing idle frames.
function decode(rle, at) {
  const frames = []
  for (const [codes, n] of rle || []) { const raw = {}; for (const c of codes) if (DECODE[c]) raw[DECODE[c]] = true; for (let i = 0; i < n; i++) frames.push(raw) }
  let first = frames.findIndex(f => Object.keys(f).length), last = frames.length - 1
  while (last >= 0 && !Object.keys(frames[last]).length) last--
  if (first < 0) return null
  // one released frame first: the AI may have been holding a button last frame, and an attack needs a FRESH press
  return { frames: [{}, ...frames.slice(first, last + 1)], lead: 1 + Math.max(0, (at?.[0] ?? first) - first) }
}

const _kits = new Map()
// The fighter's usable tools, built once per roster key from the scout data.
export function masterKit(key) {
  if (_kits.has(key)) return _kits.get(key)
  const F = AI_SCOUT.fighters[key]
  let kit = null
  if (F) {
    const tool = (m, kind) => {
      const d = decode(m.script, m.at); if (!d || !(m.damage > 0) || m.startup == null || !Array.isArray(m.reach)) return null
      return { kind, name: m.name, frames: d.frames, eff: d.lead + m.startup, reach: m.reach, damage: m.damage, cost: m.cost || 0,
        onBlock: m.onBlock ?? null, antiAir: !!m.antiAir, grab: !!(m.grab || m.unblockable), ult: m.cat === "ultimate", full: m.reach[1] >= 320 }
    }
    const moves = F.moves.filter(m => m.fired && !m.dupOf).map(m => tool(m, "move")).filter(Boolean)
    const combos = (F.combos || []).map(c => tool(c, "combo")).filter(Boolean)
    kit = { moves, combos, all: [...moves, ...combos],
      antiAir: moves.filter(t => t.antiAir && t.eff <= 20).sort((a, b) => a.eff - b.eff),
      grabs: moves.filter(t => t.grab && t.eff <= 12),
      pokes: moves.filter(t => !t.ult && t.onBlock != null && t.onBlock >= MASTER.safeOnBlock && t.eff <= 16),
      zone: moves.filter(t => t.full && !t.ult && t.eff <= 26) }
  }
  _kits.set(key, kit)
  return kit
}

const W = f => f?.w || f?.width || 48
// learning context: the same tool can be legal from neutral but refused mid-combo (combo-order rules)
const ctxKey = (t, f) => `${t.kind}:${t.name}|${(f.comboCounter | 0) > 0 || (f.comboTimer | 0) > 0 ? "combo" : "neutral"}`
function allowed(m, t, f) {
  const L = m.learn.get(ctxKey(t, f)); if (!L) return true
  if (L.fail >= 2 && L.fail > 2 * L.ok) return false   // refused far more often than accepted here → drop it for the match
  return m.clock >= L.until                      // refused recently → back off a little
}
// PAYOFF learning, per match: (damage dealt − damage taken) PER FRAME, from the decision until judgeFrames after the
// move ends. "Defer" (let the Impossible AI play its own game) is scored the same way in the same situation, so a move
// is only used where it has out-earned what the fighter would have done anyway — each fighter's own systems (and the
// Impossible AI's per-character play) are never replaced by something worse.
const valKey = (why, t) => `${why}:${t.kind}:${t.name}`
const deferKey = ctx => `defer:${ctx}`
function rate(m, key, prior) { const V = m.value.get(key); return V ? (V.sum + prior) / (V.n + 1) : prior }
// prior: optimistic at first so tools get tried — but once a few of a KIND (combo / poke / punish …) have been judged,
// an untried one starts from that kind's average instead (a fighter with ten combos into a guarding mirror shouldn't
// have to lose with all ten to learn it)
function worth(m, why, t) {
  const C = m.kind.get(why)
  const prior = C && C.n >= 3 ? C.sum / C.n : (why === "punish" || why === "antiAir" ? 0.6 : 0.35) * t.damage / (t.frames.length + m.P.judgeFrames)
  return rate(m, valKey(why, t), prior)
}
const deferWorth = (m, ctx) => rate(m, deferKey(ctx), 0)
function judge(m, f, o) {
  const p = m.post; if (!p) return
  const dealt = Math.max(0, p.foeHp0 - (o.health ?? 0)), taken = Math.max(0, p.selfHp0 - (f.health ?? 0))
  const v = (dealt - taken) / Math.max(1, m.clock - p.at)
  const V = m.value.get(p.key) || { n: 0, sum: 0 }; V.n++; V.sum += v; m.value.set(p.key, V)
  const why = p.key.split(":")[0], C = m.kind.get(why) || { n: 0, sum: 0 }; C.n++; C.sum += v; m.kind.set(why, C)
  const L = m.live[p.key] || (m.live[p.key] = [0, 0]); L[0]++; L[1] += v   // this session's own samples (training export)
  m.post = null
}
function defer(m, f, o, ctx) {   // start judging "the Impossible AI's own play" here (one window at a time)
  if (m.post) return null
  m.post = { key: deferKey(ctx), foeHp0: o.health ?? 0, selfHp0: f.health ?? 0, at: m.clock, t: m.P.deferFrames }
  return null
}
// Gap between the two bodies along the facing line (what the scout's reach is measured in).
function bodyGap(f, o) { const fc = (f.x || 0) + W(f) / 2, oc = (o.x || 0) + W(o) / 2; return Math.round(Math.abs(oc - fc) - (W(f) + W(o)) / 2) }
const fits = (t, gap) => gap >= t.reach[0] - 8 && gap <= t.reach[1] + 2
const canPay = (t, f) => (t.cost || 0) <= (f.energy ?? 0) + 0.01 && (!t.ult || (f.energy ?? 0) >= (f.maxEnergy ?? 100) - 0.01)
function isFree(f) {
  return f && f.grounded !== false && !(f.hitstun > 0 || f.blockstun > 0 || f.stun > 0 || f.knockdownState || f.isLaunched || f.isGrabbed || f.isGrabbing || f.hitstop > 0
    || f.attacking || f.currentAttack || f.attackCooldown > 0 || f.locked || f.isFrozen)
}
// Frames until the foe can act again if it is stuck in an attack's RECOVERY (past its active frames), else 0.
function recoveryWindow(o) {
  const a = o?.currentAttack
  if (!a || a.total == null || a.timer == null) return 0
  const elapsed = a.total - a.timer
  return elapsed > (a.activeEnd ?? a.total) ? a.timer : 0
}
const threatening = (o, gap) => { const a = o?.currentAttack; return !!a && recoveryWindow(o) === 0 && gap < 150 }

let _tuning = AI_MASTER_TUNING
// tools / tests: swap the tuning table (null → none: pure in-match learning, as the self-play trainer needs)
export function setMasterTuning(t) { _tuning = t || { priorWeight: 0, fighters: {} } }
function mem(ctl) {
  return ctl._master || (ctl._master = { key: null, P: MASTER, run: null, post: null, tick: 0, log: [], clock: 0, learn: new Map(), value: new Map(), kind: new Map(), live: {}, blockedStreak: 0, aaJump: false,
    stats: { punish: 0, antiAir: 0, combo: 0, poke: 0, zone: 0, grab: 0, landed: 0, blocked: 0, whiffed: 0, noFire: 0, aborted: 0 } })
}
// First frame as a (new) fighter: its tuned style + what self-play learned, as a few pseudo-samples
function seed(m, key) {
  m.key = key; m.value.clear(); m.kind.clear(); m.learn.clear()
  const T = _tuning?.fighters?.[key], w = _tuning?.priorWeight ?? 0
  const params = T?.params || _tuning?.params   // per-fighter style, else a table-wide one (tools)
  m.P = params ? Object.freeze({ ...MASTER, ...params }) : MASTER
  if (!T || !(w > 0)) return
  for (const [table, src] of [[m.value, T.prior], [m.kind, T.kind]]) for (const [k, [n, mean]] of Object.entries(src || {})) { const c = Math.min(n, w); if (c > 0) table.set(k, { n: c, sum: mean * c }) }
}

function start(m, t, why, f, o) {
  judge(m, f, o)   // a new decision closes the previous one's judging window early
  m.run = { foeHp0: o.health ?? 0, selfHp0: f.health ?? 0, at: m.clock, vkey: valKey(why, t), tool: t, i: 0, why, hp0: o.health, en0: f.energy ?? 0, hit: false, blocked: false, gap: bodyGap(f, o), ctxKey: ctxKey(t, f) }
  m.stats[why]++
}

// One frame of the Master layer. Returns a RAW input frame (absolute left/right) while it is performing a move, or
// null to let the Impossible AI's own decision through. `ctl.master` must be set (ai.js setAIDifficulty "master").
export function masterRawInput(ctl, f, o) {
  if (!ctl?.master || !f || !o) return null
  const m = mem(ctl)
  if (m.key !== f.rosterKey) seed(m, f.rosterKey)
  m.clock++
  if (m.post && --m.post.t <= 0) judge(m, f, o)
  // ── performing ──
  if (m.run) {
    const r = m.run
    if (o.health < r.hp0 - 0.01) r.hit = true
    if (f.attacking || f.currentAttack || f.isGrabbing || (f.energy ?? 0) < r.en0 - 0.5) r.fired = true   // projectile specials: no attack state, but meter is spent
    if (!r.hit && o.blockstun > 0) r.blocked = true
    const hurt = f.hitstun > 0 || f.knockdownState || f.isGrabbed || f.isLaunched
    const inputsDone = r.i >= r.tool.frames.length
    // stop pressing when hit, or when the opener was blocked (don't finish an unsafe string into a guard)
    const stop = hurt || (r.blocked && r.tool.kind === "combo" && !inputsDone)
    if (stop || inputsDone) {
      // the hit lands AFTER the last press (startup): keep watching (no input) until it hits / is blocked / is over
      const watchFor = Math.max(r.tool.eff - r.tool.frames.length + 14, r.tool.full && r.gap > 150 ? 70 : 0)   // a projectile crossing the screen takes longer than its point-blank startup
      if (!stop && !r.hit && !r.blocked && (r.watch = (r.watch || 0) + 1) <= watchFor) return null
      if (r.hit) { m.stats.landed++; m.blockedStreak = 0 } else if (r.blocked) { m.stats.blocked++; m.blockedStreak++ } else if (!r.fired) m.stats.noFire++; else m.stats.whiffed++
      // LEARN what the engine refuses in this situation (combo-order rules, per-move limits, form gates the scout
      // couldn't see from neutral): a press that never started the move backs that tool off in that context
      if (!stop) { const L = m.learn.get(r.ctxKey) || { fail: 0, ok: 0, until: 0 }; if (r.fired) L.ok++; else { L.fail++; L.until = m.clock + 150 } m.learn.set(r.ctxKey, L) }
      if (stop) m.stats.aborted++
      if (r.fired) m.post = { key: r.vkey, foeHp0: r.foeHp0, selfHp0: r.selfHp0, at: r.at, t: m.P.judgeFrames }   // (a refused press costs nothing)
      m.log.push(`${r.why}:${r.tool.name}@${r.gap}→${r.hit ? "hit" : r.blocked ? "blocked" : !r.fired ? "nofire" : stop ? "stuffed" : "whiff"}`); if (m.log.length > 40) m.log.shift()
      m.run = null
      return null
    }
    const rel = r.tool.frames[r.i++]
    const fwd = (f.facing ?? 1) >= 0
    const raw = { ...rel }
    raw.right = fwd ? !!rel.right : !!rel.left
    raw.left = fwd ? !!rel.left : !!rel.right
    if (r.i === 1) raw._start = true   // game.js: fresh motion / double-tap buffers for this move
    return raw
  }
  // ── choosing ──
  if (f.transformed || !isFree(f)) { m.wasFree = false; return null }   // (a Ben alien form plays different moves than the scouted base kit)
  const kit = masterKit(f.rosterKey)
  if (!kit || !kit.all.length) return null
  // neutral decision points: the FIRST free frame after being busy (the Impossible AI re-attacks the moment it can,
  // so waiting for a fixed tick would never see a free frame), then every neutralEvery frames while still free
  const fresh = !m.wasFree; m.wasFree = true
  m.tick = fresh ? 0 : m.tick + 1
  const gap = bodyGap(f, o)
  // PUNISH: deterministic read of the foe's recovery; the best damage that connects before it can guard
  const win = recoveryWindow(o)
  if (win >= 3) {
    let best = null
    for (const t of kit.all) if (t.eff <= win - 1 && fits(t, gap) && canPay(t, f) && allowed(m, t, f) && (!best || worth(m, "punish", t) > worth(m, "punish", best))) best = t
    if (best && worth(m, "punish", best) > deferWorth(m, "punish") && rand() < m.P.punishChance) { start(m, best, "punish", f, o); return masterRawInput(ctl, f, o) }
    return defer(m, f, o, "punish")
  }
  // ANTI-AIR: once per foe jump, as it falls toward us
  if (o.grounded === false) {
    if (!m.aaJump && (o.vy ?? 0) > 0 && gap < 130) {
      m.aaJump = true
      const t = kit.antiAir.find(x => canPay(x, f) && allowed(m, x, f) && gap <= x.reach[1] + 40)
      if (t && worth(m, "antiAir", t) > deferWorth(m, "antiAir") && rand() < m.P.antiAirChance) { start(m, t, "antiAir", f, o); return masterRawInput(ctl, f, o) }
      return defer(m, f, o, "antiAir")
    }
  } else m.aaJump = false
  // NEUTRAL: let the Impossible AI guard/parry while the foe is mid-attack near us
  if (threatening(o, gap) || o.grounded === false || o.knockdownState || o.isLaunched) return null
  if (m.tick % m.P.neutralEvery) return null   // tick 0 = the fresh free frame
  // each candidate is scored by its learned payoff vs letting the Impossible AI play here; none better → defer
  const ctx = gap < 60 ? "close" : gap < 150 ? "mid" : "far", bar = deferWorth(m, ctx)
  const pick = (list, why) => { let b = null, bw = bar; for (const t of list) if (fits(t, gap) && canPay(t, f) && allowed(m, t, f)) { const w = worth(m, why, t); if (w > bw) { b = t; bw = w } } return b }
  if (m.blockedStreak >= m.P.grabAfterBlocks && kit.grabs.length) {
    const g = pick(kit.grabs, "grab")
    if (g) { m.blockedStreak = 0; start(m, g, "grab", f, o); return masterRawInput(ctl, f, o) }
  }
  const combo = pick(kit.combos, "combo")
  if (combo && rand() < m.P.comboChance) { start(m, combo, "combo", f, o); return masterRawInput(ctl, f, o) }
  const poke = pick(kit.pokes, "poke")
  if (poke && rand() < m.P.pokeChance) { start(m, poke, "poke", f, o); return masterRawInput(ctl, f, o) }
  if (gap >= 150) {
    const z = pick(kit.zone, "zone")
    if (z && rand() < m.P.zoneChance) { start(m, z, "zone", f, o); return masterRawInput(ctl, f, o) }
  }
  return defer(m, f, o, ctx)
}

// A new round / match: drop any half-played move (keeps the per-match stats).
export function resetMaster(ctl) { if (ctl?._master) { ctl._master.run = null; ctl._master.blockedStreak = 0; ctl._master.aaJump = false; ctl._master.post = null } }   // learned payoffs carry across rounds of a match
export function masterStats(ctl) {
  if (!ctl?._master) return null
  const net = {}; for (const [k, [, sum]] of Object.entries(ctl._master.live)) { const why = k.split(":")[0]; net[why] = Math.round(((net[why] || 0) + sum) * 100) / 100 }   // Σ payoff/frame (live samples only)
  // samples: this session's raw per-key {key: [n, Σ payoff/frame]} — what the self-play trainer aggregates
  return { ...ctl._master.stats, net, running: ctl._master.run?.tool?.name || null, fighter: ctl._master.key, samples: JSON.parse(JSON.stringify(ctl._master.live)) }
}
export function masterLog(ctl) { return ctl?._master ? ctl._master.log.slice() : [] }   // last 40 attempts (debug / tests)
