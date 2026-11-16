// harness/controls_lab.test.mjs — CONTROLS LAB end-to-end (controls.html driving the REAL game in its iframe).
//   1  zero console errors + zero failed requests (Lab page AND embedded game)
//   5  combo trial: the correct sequence clears every stage → Mastered; a wrong button / wrong direction is rejected
//      with that message; a late press reports "Late by Nf"
//   6  controller view: a pad press lights the right button, the stick moves, an analog trigger fills, a keyboard key lights
//   7  pad-only navigation reaches every mode and picks a fighter
//   9  screenshots of every mode, the controller lit mid-combo, a trial in progress → docs/controls_lab/screenshots/
//  10  "play for real": three fighters from different universes, a demo each, take control and fight with the keyboard;
//      clear one trial with the KEYBOARD (Lab key handler) and one with a (simulated) PAD
import fs from "node:fs"; import path from "node:path"
import { ROOT, startServer, launch, openLab, checker, PAD, gameBaselineErrors, newErrors } from "./controls_lab_common.mjs"

const SHOTS = path.join(ROOT, "docs", "controls_lab", "screenshots")
fs.mkdirSync(SHOTS, { recursive: true })
const { server, base } = await startServer()
const browser = await launch()
const C = checker(), check = C.check
const baseline = await gameBaselineErrors(browser, base)
if (baseline.size) console.log(`  ℹ️  the MAIN GAME itself logs ${baseline.size} error line(s) on a plain boot (pre-existing, not the Lab):\n     ${[...baseline].join("\n     ")}`)
const shot = (page, name) => page.screenshot({ path: path.join(SHOTS, `${name}.png`) })

// in-page helpers (installed after load)
const HELPERS = () => {
  const L = window.__lab, E = L.eng
  window.__T = () => L.S.task
  // wait for the trial to be (re-)armed after `seq`
  window.__waitArm = async (seq, ms = 8000) => { const t0 = performance.now(); while (performance.now() - t0 < ms) { const T = L.S.task; if (T && (T.done || (T.armSeq > seq && !T.failed))) return true; await new Promise(r => setTimeout(r, 30)) } return false }
  // the script for one stage of the running trial (optionally edited)
  window.__stageScript = (idx, edit) => {
    const T = L.S.task, st = T.stages[idx], c = T.combo
    let steps = c.steps.slice(st.from, st.to + 1), gaps = [0, ...c.gaps.slice(st.from + 1, st.to + 1)]
    if (edit) ({ steps, gaps } = edit({ steps: [...steps], gaps: [...gaps] }))
    return L.api.comboScript({ steps, gaps, tail: 40 }).script
  }
  // drive raw frames through a REAL device path: "kbd" = KeyboardEvents into the Lab's own key handler,
  // "pad" = the fake gamepad the Lab + game poll, "feed" = the Lab's frame-exact test feeder.
  const FIELDS = ["left", "right", "down", "up", "jump", "light", "heavy", "upAttack", "special", "ultimate", "grab", "charge", "block"]
  window.__drive = async (script, how) => {
    if (how === "feed") return L.feedUser(script)
    const c = E.controls.p1, held = {}
    const PL = E.mods.padLayout.PAD_LAYOUT
    for (const raw of script) {
      if (how === "kbd") {
        for (const f of FIELDS) { const k = c[f]; if (!k) continue; const d = !!raw[f]; if (d !== !!held[k]) { held[k] = d; document.dispatchEvent(new KeyboardEvent(d ? "keydown" : "keyup", { key: k, bubbles: true })) } }
      } else {
        const p = window.__pad; for (const b of p.buttons) { b.pressed = false; b.value = 0 }
        for (const row of PL) if (raw[row.action]) { p.buttons[row.button].pressed = true; p.buttons[row.button].value = 1 }
        const dmap = { up: 12, down: 13, left: 14, right: 15 }
        for (const [f, i] of Object.entries(dmap)) if (raw[f] || (f === "up" && raw.upAttack)) { p.buttons[i].pressed = true; p.buttons[i].value = 1 }
        if (raw.upAttack) { const li = PL.find(r => r.action === "light").button; p.buttons[li].pressed = true; p.buttons[li].value = 1 }
        p.timestamp++
      }
      await E.frames(1)
    }
    if (how === "kbd") for (const k of Object.keys(held)) if (held[k]) document.dispatchEvent(new KeyboardEvent("keyup", { key: k, bubbles: true }))
    else { for (const b of window.__pad.buttons) { b.pressed = false; b.value = 0 } }
    await E.frames(2)
  }
  // run every stage of the running trial with the correct inputs
  window.__clearTrial = async (how, maxTries = 3) => {
    const T = L.S.task
    while (!T.done) {
      const idx = T.stageIdx; let cleared = false
      for (let k = 0; k < maxTries && !cleared; k++) {
        const seq = T.armSeq
        await window.__drive(window.__stageScript(idx), how)
        await window.__waitArm(seq)
        cleared = T.done || T.stageIdx > idx
      }
      if (!cleared) return { ok: false, stage: idx, label: T.stages[idx]?.label, fb: (T.fbLog || []).slice(-4) }
    }
    return { ok: true, attempts: T.attempts }
  }
}

try {
  // ── 1 + 9 + 10: three fighters, three universes ─────────────────────────────────────────────────────────────
  const { page, errs } = await openLab(browser, base, "goku", { pad: true })
  await page.evaluate(HELPERS)
  const roster = await page.evaluate(() => window.__lab.S.roster.map(r => ({ key: r.key, uni: r.universeLabel })))
  check("roster loaded in the picker", roster.length > 20, `${roster.length} fighters`)
  const combosAll = await page.evaluate(() => window.__lab.S.allCombos.map(c => c.char))
  // three fighters from different universes, preferring ones with verified combos
  const pick = []
  for (const want of ["goku", "zoro", "spiderman", "superman", "naruto", "gojo", "arlong", "homelander"]) {
    const r = roster.find(x => x.key === want); if (!r || pick.some(p => p.uni === r.uni)) continue
    pick.push(r); if (pick.length === 3) break
  }
  check("three fighters from three universes", pick.length === 3, pick.map(p => `${p.key} (${p.uni})`).join(", "))

  for (const [n, f] of pick.entries()) {
    await page.evaluate(k => window.__lab.api.selectChar(k), f.key)
    const ok = await page.evaluate(k => window.__lab.S.key === k && window.__lab.eng.ready, f.key)
    check(`${f.key}: loads in the Lab`, ok)
    // demo a basic move (Move List → click a card) and watch it fire
    await page.evaluate(() => window.__lab.api.setMode("moves"))
    const r = await page.evaluate(async () => { const L = window.__lab; const m = L.S.moves.find(m => /light|jab|basic/i.test(m.section + m.name + m.input) && !m.parsed.conditional && m.parsed.steps.length) || L.S.moves[0]; const res = await L.api.demoMove(m); return { name: m.name, ...res } })
    check(`${f.key}: move demo plays on the dummy`, r && (r.fired || r.damage > 0), `${r?.name}: fired=${r?.fired} dmg=${r?.damage}`)
    if (n === 0) await shot(page, "mode_moves")
    // take control with the KEYBOARD: walk right, then attack
    await page.evaluate(() => window.__lab.api.takeControl(true))
    const c = await page.evaluate(() => window.__lab.eng.controls.p1)
    await page.evaluate(() => window.__lab.eng.reset({ close: false }))
    const x0 = await page.evaluate(() => window.__lab.eng.p1().x)
    await page.keyboard.down(c.right); await page.evaluate(() => window.__lab.eng.frames(20)); await page.keyboard.up(c.right)
    const x1 = await page.evaluate(() => window.__lab.eng.p1().x)
    check(`${f.key}: keyboard control walks the fighter`, x1 > x0 + 5, `Δx=${(x1 - x0).toFixed(1)}`)
    await page.keyboard.down(c.light); await page.evaluate(() => window.__lab.eng.frames(4)); await page.keyboard.up(c.light)
    const att = await page.evaluate(async () => { for (let i = 0; i < 20; i++) { const p = window.__lab.eng.p1(); if (p.currentMove || p.attacking) return true; await window.__lab.eng.frames(1) } return false })
    check(`${f.key}: keyboard Light starts an attack`, att)
    await page.keyboard.press("Escape")
  }

  // ── 6: controller view (fake pad + keyboard) ───────────────────────────────────────────────────────────────
  await page.evaluate(() => { window.__padOn = true })
  await page.evaluate(() => { const p = window.__pad; p.buttons[2].pressed = true; p.buttons[2].value = 1 })
  await page.waitForTimeout(120)
  const lit = await page.evaluate(() => ({ dev: window.__lab.S.device, on: [...document.querySelectorAll("#controller .pad-btn.on")].map(e => +e.dataset.btn) }))
  check("pad press switches the view to the controller", lit.dev === "pad", lit.dev)
  check("pad Square (Light) lights button 2 and only it", lit.on.includes(2) && lit.on.length === 1, JSON.stringify(lit.on))
  await page.evaluate(() => { const p = window.__pad; p.buttons[2].pressed = false; p.buttons[2].value = 0; p.axes[0] = 0.9; p.axes[1] = -0.3 })
  await page.waitForTimeout(120)
  const stick = await page.evaluate(() => { const caps = document.querySelectorAll("#controller .stick circle.cap"); return [...caps].map(c => +c.getAttribute("cx")) })
  await page.evaluate(() => { const p = window.__pad; p.axes[0] = 0; p.axes[1] = 0 })
  await page.waitForTimeout(120)
  const stick0 = await page.evaluate(() => { const caps = document.querySelectorAll("#controller .stick circle.cap"); return [...caps].map(c => +c.getAttribute("cx")) })
  check("left stick cap moves with the stick", stick.some((v, i) => Math.abs(v - stick0[i]) > 8), `${JSON.stringify(stick0)} → ${JSON.stringify(stick)}`)
  await page.evaluate(() => { const p = window.__pad; p.buttons[6].value = 0.5; p.buttons[6].pressed = true })
  await page.waitForTimeout(120)
  const trig = await page.evaluate(() => +document.querySelector('#controller [data-btn="6"] .fill').getAttribute("width"))
  await page.evaluate(() => { const p = window.__pad; p.buttons[6].value = 1 })
  await page.waitForTimeout(120)
  const trigFull = await page.evaluate(() => +document.querySelector('#controller [data-btn="6"] .fill').getAttribute("width"))
  check("L2 fills to its analog depth (50% < 100%)", trig > 0 && trigFull > trig * 1.6, `${trig} → ${trigFull}`)
  await page.evaluate(() => { const p = window.__pad; p.buttons[6].value = 0; p.buttons[6].pressed = false })
  await page.evaluate(() => { window.__padOn = false })
  const kb = await page.evaluate(() => window.__lab.eng.controls.p1)
  await page.keyboard.down(kb.heavy); await page.waitForTimeout(120)
  const keyLit = await page.evaluate(k => ({ dev: window.__lab.S.device, on: [...document.querySelectorAll("#controller .kb-key.on")].length, mine: !!document.querySelector("#controller .kb-key.on") && [...document.querySelectorAll("#controller .kb-key.on")].some(e => e.textContent.toLowerCase().includes(k.length === 1 ? k : k.replace("arrow", ""))) }), kb.heavy)
  await page.keyboard.up(kb.heavy)
  check("keyboard press switches to the keyboard view and lights that key", keyLit.dev === "keyboard" && keyLit.on === 1 && keyLit.mine, JSON.stringify(keyLit))

  // ── 9: controller lit mid-combo + the combo library ────────────────────────────────────────────────────────
  const comboChar = ["zoro", "arlong", "goku"].find(k => combosAll.includes(k)) || combosAll[0]
  check("a fighter with verified combos exists", !!comboChar, comboChar)
  await page.evaluate(k => window.__lab.api.selectChar(k), comboChar)
  await page.evaluate(() => window.__lab.api.setMode("combos"))
  await page.click("#modePanel [data-combo='0']")
  await page.waitForTimeout(450)
  await shot(page, "controller_lit_mid_combo")
  const midLit = await page.evaluate(() => document.querySelectorAll("#controller .on, #controller .guide").length)
  check("controller shows presses + guide while a combo demo plays", midLit > 0, `${midLit} lit/guide elements`)
  await page.waitForFunction(() => !window.__lab.S.task, null, { timeout: 20000 })
  await shot(page, "mode_combos")

  // ── 5: trial judge ─────────────────────────────────────────────────────────────────────────────────────────
  const combos = await page.evaluate(() => window.__lab.S.combos.map(c => ({ id: c.id, steps: c.steps, gaps: c.gaps })))
  const multi = combos.findIndex(c => c.steps.filter(s => s !== "Jump").length >= 2)
  const dirIdx = combos.findIndex(c => c.steps.some(s => /down|forward|back|↓|→|←/i.test(s) && /light|heavy/i.test(s)))
  await page.evaluate(i => { const L = window.__lab; L.S.selCombo = L.S.combos[i]; L.api.setMode("trial") }, multi)
  await page.evaluate(() => window.__lab.api.startTrial(window.__lab.S.selCombo, { showDemo: false }))
  // wrong button: the first press swapped
  let seq = await page.evaluate(() => window.__T().armSeq)
  await page.evaluate(() => window.__drive(window.__stageScript(0, o => { o.steps[0] = /heavy/i.test(o.steps[0]) ? "Light" : "Heavy"; return o }), "feed"))
  let fb = await page.evaluate(() => window.__T().fbLog || [])
  check("trial: wrong button is rejected with 'Wrong button'", fb.includes("Wrong button"), fb.slice(-3).join(" | "))
  await page.evaluate(s => window.__waitArm(s), seq)
  await shot(page, "trial_feedback_wrong_button")
  // late: on the first two-step stage, press the second step 6 frames late
  const pairIdx = await page.evaluate(() => window.__T().stages.findIndex(s => s.to > s.from && window.__T().steps.slice(s.from, s.to + 1).filter(x => x.kind !== "jump").length >= 2))
  await page.evaluate(i => { const T = window.__T(); T.stageIdx = i; return window.__lab.api.armStage(T) }, pairIdx)
  await page.evaluate(() => { window.__T().fbLog = [] })
  seq = await page.evaluate(() => window.__T().armSeq)
  await page.evaluate(i => window.__drive(window.__stageScript(i, o => { o.gaps[1] += 6; return o }), "feed"), pairIdx)
  fb = await page.evaluate(() => window.__T().fbLog || [])
  check("trial: a 6f-late press reports 'Late by 6f'", fb.some(t => /^Late by 6f$/.test(t)), fb.slice(-3).join(" | "))
  await page.evaluate(s => window.__waitArm(s), seq)
  // early: same stage again, 3 frames early
  await page.evaluate(i => { const T = window.__T(); T.done = false; T.onFrame = null; T.stageIdx = i; return window.__lab.api.armStage(T) }, pairIdx)
  await page.evaluate(() => { window.__T().fbLog = [] })
  seq = await page.evaluate(() => window.__T().armSeq)
  await page.evaluate(i => window.__drive(window.__stageScript(i, o => { o.gaps[1] = Math.max(2, o.gaps[1] - 3); return o }), "feed"), pairIdx)
  fb = await page.evaluate(() => window.__T().fbLog || [])
  check("trial: a 3f-early press reports 'Early by 3f'", fb.some(t => /^Early by 3f$/.test(t)), fb.slice(-3).join(" | "))
  await page.evaluate(s => window.__waitArm(s), seq)
  // wrong direction (needs a combo with a directional normal)
  if (dirIdx >= 0) {
    await page.evaluate(i => { const L = window.__lab; L.S.selCombo = L.S.combos[i]; return L.api.startTrial(L.S.selCombo, { showDemo: false }) }, dirIdx)
    const si = await page.evaluate(() => { const T = window.__T(); return T.stages.findIndex(s => (T.steps[s.from].dirs || []).length && T.steps[s.from].kind !== "jump") })
    await page.evaluate(i => { const T = window.__T(); T.stageIdx = i; return window.__lab.api.armStage(T) }, si)
    seq = await page.evaluate(() => window.__T().armSeq)
    await page.evaluate(i => window.__drive(window.__stageScript(i, o => { o.steps[0] = o.steps[0].replace(/^(down|forward|back|up)\s*\+\s*/i, "").replace(/^[↓↘→↙←↗↑↖·]+\s*\+\s*/, ""); return o }), "feed"), si)
    fb = await page.evaluate(() => window.__T().fbLog || [])
    check("trial: missing direction is rejected with 'Wrong direction'", fb.includes("Wrong direction"), fb.slice(-3).join(" | "))
    await page.evaluate(s => window.__waitArm(s), seq)
  } else check("trial: a combo with a directional step exists for the wrong-direction check", false)
  // correct sequence, stage by stage, with the KEYBOARD through the Lab's key handler → Mastered
  await page.evaluate(i => { const L = window.__lab; L.S.selCombo = L.S.combos[i]; return L.api.startTrial(L.S.selCombo, { showDemo: false }) }, multi)
  await page.evaluate(() => window.__drive(window.__stageScript(0), "kbd"))
  await page.waitForTimeout(200)
  await shot(page, "trial_in_progress")
  const kbdRes = await page.evaluate(() => window.__clearTrial("kbd"))
  const mastered = await page.evaluate(() => { const L = window.__lab; return { done: !!window.__T()?.done, saved: !!JSON.parse(localStorage.getItem("ms_controls_lab_mastered") || "{}").combos?.[L.S.selCombo.id], fb: window.__T()?.fb } })
  check("trial (keyboard): correct inputs clear every stage → MASTERED + saved", kbdRes.ok && mastered.done && mastered.saved && mastered.fb === "MASTERED!", JSON.stringify({ ...kbdRes, ...mastered }))
  await shot(page, "trial_mastered")
  // and once with the PAD
  await page.evaluate(() => { window.__padOn = true; const p = window.__pad; for (const b of p.buttons) { b.pressed = false; b.value = 0 } p.buttons[13].pressed = true })
  await page.waitForTimeout(80)
  await page.evaluate(() => { window.__pad.buttons[13].pressed = false })
  const padTrialCombo = await page.evaluate(i => { const L = window.__lab; const j = L.S.combos.length > 1 ? (i + 1) % L.S.combos.length : i; L.S.selCombo = L.S.combos[j]; return j }, multi)
  await page.evaluate(() => window.__lab.api.startTrial(window.__lab.S.selCombo, { showDemo: false }))
  const dev = await page.evaluate(() => ({ d: window.__lab.S.device, f: window.__lab.S.focus }))
  // the DualSense view lit by the pad, mid-input (stage 1 driven on the pad), then clear the whole trial on the pad
  await Promise.all([page.evaluate(() => window.__drive(window.__stageScript(0), "pad")), (async () => { await page.waitForTimeout(260); await shot(page, "controller_pad_view_mid_trial") })()])
  await page.waitForFunction(() => { const T = window.__T(); return T && (T.done || (T.ptr !== 999 && !T.failed && T.onFrame)) }, null, { timeout: 8000 }).catch(() => {})
  const padRes = await page.evaluate(() => window.__clearTrial("pad"))
  check("trial (pad): correct inputs on the simulated pad clear every stage → MASTERED", dev.d === "pad" && padRes.ok && await page.evaluate(() => !!window.__T()?.done), JSON.stringify({ combo: padTrialCombo, ...dev, ...padRes }))
  await page.evaluate(() => { window.__padOn = false })

  // ── free practice + boxes ──────────────────────────────────────────────────────────────────────────────────
  await page.keyboard.press("Escape")
  await page.evaluate(() => window.__lab.api.setMode("free"))
  await page.click("#hitboxBtn")
  await page.evaluate(() => window.__lab.eng.frames(10))
  await shot(page, "mode_free_practice")
  const boxPx = await page.evaluate(() => { const c = document.querySelector("#overlay"), d = c.getContext("2d").getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i]) n++; return n })
  check("free practice: hurtbox overlay draws", boxPx > 200, `${boxPx} px`)
  await page.click("#hitboxBtn")
  await page.keyboard.press("Escape")

  // ── 7: pad-only navigation ─────────────────────────────────────────────────────────────────────────────────
  await page.evaluate(() => window.__lab.api.setMode("moves"))
  await page.evaluate(() => { window.__padOn = true })
  const tap = async (i, ms = 70) => { await page.evaluate(i => { const p = window.__pad; p.buttons[i].pressed = true; p.buttons[i].value = 1 }, i); await page.waitForTimeout(ms); await page.evaluate(i => { const p = window.__pad; p.buttons[i].pressed = false; p.buttons[i].value = 0 }, i); await page.waitForTimeout(ms) }
  const seen = [await page.evaluate(() => window.__lab.S.mode)]
  for (let i = 0; i < 4; i++) {
    if (await page.evaluate(() => window.__lab.S.focus === "arena")) await tap(PAD.OPTIONS)   // Free Practice takes control; Options hands it back
    await tap(PAD.R1); seen.push(await page.evaluate(() => window.__lab.S.mode))
  }
  check("pad R1 cycles through all four modes", ["moves", "combos", "trial", "free"].every(m => seen.includes(m)), seen.join(" → "))
  if (await page.evaluate(() => window.__lab.S.focus === "arena")) await tap(PAD.OPTIONS)
  // D-pad onto a mode tab + ✕
  await page.evaluate(() => window.__lab.api.setMode("moves"))
  for (let i = 0; i < 6; i++) await tap(PAD.UP)
  for (let i = 0; i < 4; i++) { const f = await page.evaluate(() => document.querySelector(".focus")?.dataset.mode); if (f === "combos") break; await tap(PAD.RIGHT) }
  await tap(PAD.CROSS)
  check("pad D-pad + ✕ selects a mode tab", await page.evaluate(() => window.__lab.S.mode) === "combos", await page.evaluate(() => window.__lab.S.mode))
  // Create → picker, D-pad → another fighter, ✕ picks
  const before = await page.evaluate(() => window.__lab.S.key)
  await tap(PAD.CREATE)
  check("pad Create opens the fighter picker", await page.evaluate(() => !document.querySelector("#picker").classList.contains("hidden")))
  await shot(page, "picker")
  await tap(PAD.RIGHT); await tap(PAD.DOWN)
  const target = await page.evaluate(() => document.querySelector("#picker .pc.focus")?.dataset.key)
  await tap(PAD.CROSS)
  await page.waitForFunction(t => window.__lab.S.key === t && window.__lab.eng.ready, target, { timeout: 30000 }).catch(() => {})
  const after = await page.evaluate(() => window.__lab.S.key)
  check("pad D-pad + ✕ picks a different fighter", after === target && after !== before, `${before} → ${after}`)
  await page.evaluate(() => { window.__padOn = false })

  // ── 1: errors across the whole session ─────────────────────────────────────────────────────────────────────
  const added = newErrors(errs, baseline)
  check("zero console errors and zero failed requests added by the Lab (Lab + game iframe)", added.length === 0, added.slice(0, 8).join(" || "))

  // ── 720p fit + persistence ─────────────────────────────────────────────────────────────────────────────────
  const fit = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, sh: document.documentElement.scrollHeight }))
  check("fits 1280×720 with no page scroll", fit.sw <= 1280 && fit.sh <= 720, JSON.stringify(fit))
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem("ms_controls_lab") || "{}"))
  check("last fighter + mode remembered in localStorage", saved.key === after && !!saved.mode, JSON.stringify(saved))
  const ctx = page.context()
  await page.close()
  const { page: p2, errs: e2 } = await openLab(ctx, base, "", {})
  check("reopening restores the last fighter", await p2.evaluate(k => window.__lab.S.key === k, after), await p2.evaluate(() => window.__lab.S.key))
  await p2.evaluate(() => window.__lab.api.setMode("trial")); await shot(p2, "mode_trial")
  check("reopen: zero errors added by the Lab", newErrors(e2, baseline).length === 0, newErrors(e2, baseline).slice(0, 4).join(" || "))
  await p2.close()
} catch (e) {
  check("harness ran without throwing", false, e.stack || String(e))
}
await browser.close(); server.close()
console.log(`\ncontrols_lab: ${C.pass} passed, ${C.fail} failed`)
process.exit(C.fail ? 1 : 0)
