// controls_lab/engine.js — bridge to the REAL game, embedded in a same-origin <iframe src="index.html?harness=1…">.
//
// Nothing here simulates anything. The iframe runs the unmodified game (training match vs a dummy, menus skipped by
// the existing ?harness seam). The Lab:
//   • reads the game's OWN module instances (characters / kits / academy / padLayout / input / theme / sound) by
//     importing them INSIDE the iframe realm — the page's import map resolves them to the live instances;
//   • steps with the game's 60 Hz LOGIC clock: it wraps the iframe's requestAnimationFrame (the game loop runs at
//     most one logic tick per callback) and watches __harness.state().frame;
//   • feeds scripted input exactly like a player: real KeyboardEvents on press/release edges, dispatched into the
//     iframe document between two logic ticks (the same path the game's touch controls use), so double-taps,
//     motions and buffers behave exactly as in a match. Frame N's input is read by logic tick N+1.
// Deterministic: no Math.random, no timers — everything is keyed to the logic frame counter.

export const FIELDS = ["left", "right", "down", "up", "jump", "light", "heavy", "upAttack", "special", "ultimate", "dash", "grab", "charge", "block"]

const sleep = ms => new Promise(r => setTimeout(r, ms))
async function waitFor(fn, timeout = 30000, step = 25) {
  const t0 = performance.now()
  for (;;) {
    let v; try { v = fn() } catch (_) { v = null }
    if (v) return v
    if (performance.now() - t0 > timeout) throw new Error("timeout waiting for game")
    await sleep(step)
  }
}

export class LabEngine {
  constructor(iframe) {
    this.iframe = iframe
    this.w = null; this.h = null; this.mods = null
    this.p1Key = null; this.p2Key = null
    this.controls = null          // { p1: {left:"a",…}, p2: {…} } — the game's live keyboard binds
    this.frame = 0
    this.speed = 1                // 1 or 0.5 (real slow motion: the game itself ticks at 30 Hz)
    this.turbo = 1                // >1 only for combo DISCOVERY (logic ticks per real frame); never for play or final verification
    this.dummy = "stand"          // stand | crouch | jump | block
    this.listeners = new Set()    // fn({ frame, p1, p2, raw }) once per logic tick
    this._script = null           // { frames:[raw…], i, resolve, onStep }
    this._held = {}               // key → true for keys the Lab is currently holding down in the iframe
    this._userRaw = null          // last raw input the user produced (set by lab.js), for history/judging
    this._loadSeq = 0
  }

  // ── lifecycle ────────────────────────────────────────────────────────────────────────────────────────────
  async load(p1Key, { dummyKey } = {}) {
    const seq = ++this._loadSeq
    this.ready = false
    this._abortScript()
    this.p1Key = p1Key; this.p2Key = dummyKey || p1Key
    const src = `index.html?harness=1&p1=${encodeURIComponent(this.p1Key)}&p2=${encodeURIComponent(this.p2Key)}`
    await new Promise(res => { this.iframe.addEventListener("load", res, { once: true }); this.iframe.src = src })
    if (seq !== this._loadSeq) return false
    const w = this.w = this.iframe.contentWindow
    await waitFor(() => w.__harness && w.__harness.boot)
    // Import the game's modules FROM INSIDE the game page: an inline module script in the iframe document resolves
    // through that page's import map + module map, so these are the very instances the running game uses.
    const MODS = ["input", "kits", "characters", "academy", "padLayout", "theme", "sound", "padStick"]
    const doc = w.document, sc = doc.createElement("script")
    sc.type = "module"
    sc.textContent = MODS.map((m, i) => `import * as m${i} from "./${m}.js"`).join("\n") +
      `\nwindow.__labMods = { ${MODS.map((m, i) => `${m}: m${i}`).join(", ")} }`
    doc.head.appendChild(sc)
    const M = await waitFor(() => w.__labMods, 20000)
    this.mods = { input: M.input, kits: M.kits, characters: M.characters.characters, academy: M.academy, padLayout: M.padLayout,
      theme: M.theme, sound: M.sound.sound || M.sound.default, SFX: M.sound.SFX, padStick: M.padStick }
    this.h = w.__harness
    this.h.boot()
    this.controls = this.h.controls ? this.h.controls() : null
    this.h.setInputType(1, "keyboard")
    this.h.setInputType(2, "keyboard")
    this._installClock()
    await waitFor(() => this.h.state().gameState === "battle" && this.h.p1() && this.h.p2(), 15000)
    await this.frames(2)
    this.setDummy(this.dummy)
    this.ready = true
    return true
  }

  // roster (same list the Academy grid shows): [{ key, name, universe, universeLabel, portrait, accent }]
  roster() {
    const C = this.mods.characters
    const keys = this.h.academy?.roster ? this.h.academy.roster() : Object.keys(C).filter(k => !C[k].hidden)
    return keys.filter(k => C[k]).map(k => ({ key: k, name: C[k].name || k, universe: C[k].universe || "other",
      universeLabel: universeLabel(C[k].universe), portrait: C[k].portrait || null, accent: this.accent(k) }))
  }
  accent(key) {
    const c = this.mods.characters[key]
    try { return c?.color || c?.energyConfig?.color || this.mods.theme.universeAccent?.(c?.universe) || "#38bdf8" } catch (_) { return "#38bdf8" }
  }

  // ── clock ────────────────────────────────────────────────────────────────────────────────────────────────
  _installClock() {
    const w = this.w, orig = w.requestAnimationFrame.bind(w)
    let skip = false, pending = null, capture = false, fakeT = null
    const DT = 1000 / 60 + 0.002
    const runOne = (cb, t) => {
      const before = this._frameNow()
      cb(t)
      const f = this._frameNow()
      if (f !== before) this._onLogicFrame(f)
    }
    const tick = (cb, t) => {
      if (this.turbo > 1) {
        // TURBO (combo discovery only): run N logic ticks per real frame by handing the game loop synthetic 60 Hz
        // timestamps (the loop is driven by the rAF timestamp). The game re-registers its loop on each call; we
        // capture that instead of scheduling it, so exactly one chain stays alive.
        let c = cb
        if (fakeT == null || fakeT < t - 1000) fakeT = t
        for (let i = 0; i < this.turbo && c; i++) {
          pending = null; capture = true
          fakeT += DT
          try { runOne(c, fakeT) } finally { capture = false }
          c = pending
        }
        if (c) orig(t2 => tick(c, t2))
        return
      }
      if (fakeT != null) { fakeT = null }
      if (this.speed < 1) { skip = !skip; if (skip) { orig(t2 => tick(cb, t2)); return } }
      runOne(cb, t)
    }
    w.requestAnimationFrame = cb => { if (capture) { pending = cb; return 0 } return orig(t => tick(cb, t)) }
    this.frame = this._frameNow()
  }
  _frameNow() { try { return this.h.state().frame } catch (_) { return this.frame } }
  // Resolves after n logic frames — or, if the game stops ticking (left battle), after a wall-clock stall guard.
  frames(n) {
    const target = this.frame + n
    return new Promise(res => {
      let last = performance.now(), t = null
      const done = () => { this.listeners.delete(fn); clearInterval(t); res() }
      const fn = () => { last = performance.now(); if (this.frame >= target) done() }
      t = setInterval(() => { if (performance.now() - last > 2500) { this.stalled = true; done() } }, 500)
      this.listeners.add(fn)
    })
  }

  _onLogicFrame(f) {
    this.frame = f
    let p1 = null, p2 = null
    try { p1 = this.h.p1(); p2 = this.h.p2() } catch (_) {}
    let raw
    if (this._script) {
      const s = this._script
      raw = s.frames[s.i] || {}
      this._applyRaw(raw)
      if (s.onStep) try { s.onStep(s.i, raw) } catch (_) {}
      s.i++
      if (s.i > s.frames.length) { const r = s.resolve; this._script = null; this._applyRaw({}); r(true) }
    } else raw = this._userRaw || {}
    if (this.dummy === "crouch") this._key(this.controls?.p2?.down, true)
    const ev = { frame: f, p1, p2, raw, scripted: !!this._script }
    for (const fn of [...this.listeners]) { try { fn(ev) } catch (e) { console.error(e) } }
  }

  // ── input ────────────────────────────────────────────────────────────────────────────────────────────────
  _key(key, down) {
    if (!key) return
    if (!!this._held[key] === !!down) return
    this._held[key] = !!down
    const KE = this.w.KeyboardEvent
    this.w.document.dispatchEvent(new KE(down ? "keydown" : "keyup", { key, bubbles: true, cancelable: true }))
  }
  // Raw input frame (REPLAY_INPUT_FIELDS booleans) → P1's bound keys. Dash has no key: it is a double-tap.
  _applyRaw(raw) {
    const c = this.controls?.p1; if (!c) return
    const want = {}
    for (const f of FIELDS) { const k = c[f]; if (!k || f === "dash") continue; want[k] = want[k] || !!raw[f] }
    for (const k of Object.keys(want)) this._key(k, want[k])
  }
  releaseAll() { for (const k of Object.keys(this._held)) this._key(k, false) }
  // Forward a REAL user key event into the game (the Lab page owns focus; the iframe never takes it).
  forwardKey(type, key) { if (!this.w) return; this._held[key] = type === "keydown"; const KE = this.w.KeyboardEvent; this.w.document.dispatchEvent(new KE(type, { key, bubbles: true, cancelable: true })) }
  pressHotkey(key) { this._key(key, true); return this.frames(2).then(() => this._key(key, false)) }

  // Play a raw-input script through the real pipeline. Resolves when the last frame has been fed.
  play(frames, { onStep } = {}) {
    this._abortScript()
    this.setInputType("keyboard")
    return new Promise(resolve => {
      this._script = { frames, i: 0, resolve, onStep }
      // stall guard: no logic tick for 2.5 s (the match left battle) → give up instead of waiting forever
      let seen = this.frame, at = performance.now()
      const t = setInterval(() => {
        if (!this._script || this._script.resolve !== resolve) return clearInterval(t)
        if (this.frame !== seen) { seen = this.frame; at = performance.now() }
        else if (performance.now() - at > 2500) { clearInterval(t); this.stalled = true; this._abortScript() }
      }, 500)
    })
  }
  gameState() { try { return this.h.state().gameState } catch (_) { return null } }
  _abortScript() { if (this._script) { const r = this._script.resolve; this._script = null; this.releaseAll(); r(false) } }
  get playing() { return !!this._script }
  stop() { this._abortScript() }

  setInputType(t) { try { this.h.setInputType(1, t) } catch (_) {} }

  // ── training ─────────────────────────────────────────────────────────────────────────────────────────────
  // The game's own F2 training reset (full HP / meter, spawn positions), then — by default — step P1 up to just
  // outside the dummy so normals reach (the harness's setP1X; nothing else about the fighters is touched).
  async reset({ close = true, gap = 34 } = {}) {
    this._abortScript(); this.releaseAll()
    await this.pressHotkey("f2"); await this.frames(2)
    // F2 restores HP / meter / positions but NOT the attacker's running combo (comboCounter + its 90-frame comboTimer):
    // wait it out, and for the dummy to be free, so every demo / verification starts from the same clean state.
    for (let i = 0; i < 150; i++) {
      const b = this.h.p2()
      const free = b && !(b.hitstun > 0 || b.stun > 0 || b.knockdownState || b.isLaunched || b.hitstop > 0 || b.isGrabbed) && b.grounded
      if (this.combo() === 0 && free) break
      await this.frames(1)
    }
    if (close) {
      const a = this.h.p1(), b = this.h.p2()
      if (a && b) { this.h.setP1X(b.x - (a.w || 48) - gap); await this.frames(3) }
    }
  }
  setDummy(b) {
    this.dummy = b
    const c = this.controls?.p2 || {}
    for (const f of ["down", "up", "block", "left", "right"]) this._key(c[f], false)
    try { this.h.setDummyBehavior(b === "crouch" ? "stand" : b) } catch (_) {}
  }

  // ── reads ────────────────────────────────────────────────────────────────────────────────────────────────
  p1() { return this.h.p1() }
  p2() { return this.h.p2() }
  combo() { try { return this.h.beastAssistState("p1")?.combo || 0 } catch (_) { return 0 } }
  academySnap() { try { return this.h.academy.snap() } catch (_) { return null } }
  facing() { try { return this.h.p1().facing >= 0 ? 1 : -1 } catch (_) { return 1 } }
  canvasRect() { const c = this.w?.document.querySelector("canvas"); return c ? c.getBoundingClientRect() : null }
}

export function universeLabel(u) { return u ? String(u).replace(/_/g, " ").replace(/\b\w/g, m => m.toUpperCase()) : "Other" }

// Mirror a raw frame horizontally (scripts are authored facing right; Forward = right).
export function mirrorRaw(raw) { const o = { ...raw }; o.left = !!raw.right; o.right = !!raw.left; return o }
