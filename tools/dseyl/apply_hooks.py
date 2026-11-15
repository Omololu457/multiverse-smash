#!/usr/bin/env python3
"""Dseyl — shared-file hooks. Every hook is a NEW line / call gated on Dseyl (isDseyl / rosterKey 'dseyl'); no existing
line's behaviour changes for any other character. Each op asserts its anchor count; re-running is a no-op (idempotent).

  python3 tools/dseyl/apply_hooks.py --src .              apply in place to the working tree files
  python3 tools/dseyl/apply_hooks.py --head REV --out D   build hooked copies of REV:<file> into D (private-index commits)
  --phase N   only the hooks of phases <= N (1 copy, 3 flight, 4 Flash Time, 6 metadata / credits, 7 speed + teleport)
"""
import argparse, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
R = lambda s: (s.replace('clearSyndromeUlt', 'clearDseylUlt').replace('clearSyndrome', 'clearDseyl').replace('tickSyndrome', 'tickDseyl')
               .replace('playSyndromeCues', 'playDseylCues').replace('updateSyndromeCommandCombat', 'updateDseylCommandCombat')
               .replace('isSyndromeUltActive', 'isDseylUltActive').replace('updateSyndromeUlt', 'updateDseylUlt').replace('isSyndrome', 'isDseyl')
               .replace('_syndromeRemoteInput', '_dseylRemoteInput').replace('_syndrome', '_dseyl').replace('drawSyndrome', 'drawDseyl')
               .replace('syndromeHitbox', 'dseylHitbox').replace('syndromeBlock', 'dseylBlock').replace('syndromeHit', 'dseylHit')
               .replace('syndromeProjectileHit', 'dseylProjectileHit').replace("'syndrome'", "'dseyl'").replace('Syndrome', 'Dseyl'))

# op = (phase, file, kind, anchor, payload, count)
#   dup     : every line equal to `anchor` (stripped) gets a twin R(line) right after it
#   after   : insert payload line(s) after the single line containing anchor
#   before  : insert payload before the single line containing anchor
#   replace : anchor substring → payload (must occur `count` times)
OPS = [
    # ── PHASE 1: Syndrome copy wired as Dseyl ──
    (1, 'game.js', 'after', "import { syndromeHarnessApi } from './syndromeHarness.js'",
     "import { updateDseylCommandCombat } from './dseyl.js'   // DSEYL (tribute fighter, edited copy of Syndrome) — dseyl-gated command layer\n"
     "import { tickDseyl, isDseyl, clearDseyl, dseylLocked, dseylOwnsCharge, isDseylUltActive, updateDseylUlt, clearDseylUlt } from './dseylState.js'\n"
     "import { drawDseylUnder, drawDseylOver, drawDseylHud, drawDseylIntroCard, playDseylCues } from './dseylFx.js'\n"
     "import { dseylHarnessApi } from './dseylHarness.js'", 1),
    (1, 'game.js', 'replace', 'isSyndromeUltActive() || isFrozoneUltActive()', 'isSyndromeUltActive() || isDseylUltActive() || isFrozoneUltActive()', 1),
    (1, 'game.js', 'dup', 'clearSyndromeUlt()   // Syndrome OPERATION KRONOS (freeze contract)', None, 4),
    (1, 'game.js', 'dup', 'for (const _f of [p1, p2]) if (_f) clearSyndrome(_f,SYNDROME_WORLD)', None, 4),
    (1, 'game.js', 'dup', 'tickSyndrome(fighter,nearest,readRawControls(fighter)||{},SYNDROME_WORLD)', None, 1),
    (1, 'game.js', 'dup', 'tickSyndrome(fighter,getOpponent(fighter),readRawControls(fighter)||{},SYNDROME_WORLD)', None, 1),
    (1, 'game.js', 'dup', 'playSyndromeCues(fighter)', None, 2),
    (1, 'game.js', 'dup', "if (isSyndrome(fighter)) { const mc=updateSyndromeCommandCombat(fighter,inputState,nearest,SYNDROME_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", None, 1),
    (1, 'game.js', 'dup', None, "if (isSyndrome(f)) snap.push(JSON.stringify([f._syndrome ? { ...f._syndrome, cues: undefined } : null, f.currentAttack?.sy || null]))", 1),
    (1, 'game.js', 'before', "  if (isFrozone(fighter)) {   // Frozone command layer: 'consumed' | 'grab'",
     "  if (isDseyl(fighter)) {   // Dseyl command layer (Syndrome copy + Flash Time): 'consumed' | 'grab'\n"
     "    const mc=updateDseylCommandCombat(fighter,inputState,getOpponent(fighter),SYNDROME_WORLD)\n"
     "    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 1),
    (1, 'game.js', 'dup', 'clearSyndrome(f,SYNDROME_WORLD)', None, 1),
    (1, 'game.js', 'dup', 'if (isSyndrome(f)) f._syndromeRemoteInput = replay.isPlayback() || netMatch.isActive()', None, 1),
    (1, 'game.js', 'before', '  // SYNDROME "OPERATION KRONOS: FINAL DEMONSTRATION": the same freeze contract (syndromeState.js).',
     "  // DSEYL: his copy of Operation Kronos — the same freeze contract (dseylState.js).\n"
     "  if (isDseylUltActive()) {\n    updateDseylUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", 1),
    (1, 'game.js', 'dup', None, 'drawSyndromeUnder(ctx, p1, p2, SYNDROME_WORLD)', 1),
    (1, 'game.js', 'dup', None, 'drawSyndromeOver(ctx, p1, p2, SYNDROME_WORLD)', 1),
    (1, 'game.js', 'dup', None, 'drawSyndromeHud(ctx, canvas, p1, p2)', 1),
    (1, 'game.js', 'dup', None, 'drawSyndromeIntroCard(ctx, canvas, p1, p2)', 1),
    (1, 'game.js', 'after', 'syndromeTest: syndromeHarnessApi(',
     "    dseylTest: dseylHarnessApi({p1:()=>p1,p2:()=>p2,world:SYNDROME_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", 1),
    (1, 'game.js', 'replace', 'syndromeLocked(fighter, readRawControls(fighter)) ||', 'syndromeLocked(fighter, readRawControls(fighter)) || dseylLocked(fighter, readRawControls(fighter)) ||', 1),
    (1, 'game.js', 'replace', '!syndromeOwnsCharge(fighter) &&', '!syndromeOwnsCharge(fighter) && !dseylOwnsCharge(fighter) &&', 1),
    (1, 'game.js', 'replace', 'clearSyndrome(p1,SYNDROME_WORLD);clearSyndrome(p2,SYNDROME_WORLD);', 'clearSyndrome(p1,SYNDROME_WORLD);clearSyndrome(p2,SYNDROME_WORLD);clearDseyl(p1,SYNDROME_WORLD);clearDseyl(p2,SYNDROME_WORLD);', 2),
    (1, 'combat.js', 'after', "import { syndromeHitbox, syndromeBlock, syndromeHit, syndromeProjectileHit } from './syndromeState.js'",
     "import { dseylHitbox, dseylBlock, dseylHit, dseylProjectileHit } from './dseylState.js'   // Dseyl hooks (dseyl-gated copy of Syndrome's)", 1),
    (1, 'combat.js', 'dup', None, "if (a?.sy && fighter.rosterKey === 'syndrome') return syndromeHitbox(fighter)", 1),
    (1, 'combat.js', 'dup', None, 'if (!flawless) syndromeBlock(attacker, defender, atk)', 1),
    (1, 'combat.js', 'dup', None, 'syndromeHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})', 1),
    (1, 'combat.js', 'dup', None, 'syndromeProjectileHit(proj, fighter, {armored:!!supArmoredProj})', 1),
    (1, 'sprite.js', 'dup', None, "if (fighter.rosterKey === 'syndrome') fighter._lastSpriteFrame = this.frameIndex;", 1),
    (1, 'input.js', 'replace', '!fighter._syndromeRemoteInput', '!fighter._syndromeRemoteInput && !fighter._dseylRemoteInput', 2),
    (1, 'input.js', 'replace', "fighter.rosterKey === 'syndrome'", "fighter.rosterKey === 'syndrome' || fighter.rosterKey === 'dseyl'", 1),
    (1, 'characters.js', 'after', "import { syndrome } from './syndromeData.js'",
     "import { dseyl } from './dseylData.js'   // Dseyl (tribute fighter: edited copy of Syndrome + flight + Flash Time) — dseyl*.js", 1),
    (1, 'characters.js', 'replace', ' aoi_todo: aoiTodo, omololu, jesus,', ' aoi_todo: aoiTodo, omololu, dseyl, jesus,', 1),
    (1, 'kits.js', 'after', "import { SYNDROME_KIT } from './syndromeKit.js'", "import { DSEYL_KIT } from './dseylKit.js'   // Dseyl (dseyl) Move List", 1),
    (1, 'kits.js', 'after', '  syndrome: SYNDROME_KIT,', '  dseyl: DSEYL_KIT,', 1),
    (1, 'skins.js', 'after', "import { SYNDROME_SKINS } from './syndromeSkins.js'", "import { DSEYL_SKINS } from './dseylSkins.js'   // Dseyl default only", 1),
    (1, 'skins.js', 'after', '  syndrome: SYNDROME_SKINS,', '  dseyl: DSEYL_SKINS,', 1),
    (1, 'spritesheets.js', 'after', "  syndrome: { actions: { idle: './assets/syndrome/idle.png' } },", "  dseyl: { actions: { idle: './assets/dseyl/idle.png' } },", 1),
    (1, 'rosterParity.js', 'replace', '  violet: 1.31, dash_parr: 1.36, elastigirl: 2.1, syndrome: 1.11, frozone: 1.11, mr_incredible: 1.25,\n',
     '  violet: 1.31, dash_parr: 1.36, elastigirl: 2.1, syndrome: 1.11, frozone: 1.11, mr_incredible: 1.25,\n  // Original roster — Dseyl is Syndrome\'s kit, so he carries Syndrome\'s boost\n  dseyl: 1.11,\n', 1),
    (1, 'credits.js', 'after', "    files: ['assets/syndrome/**'] },",
     "  dseyl: { work: 'Dseyl — an edited copy of the Syndrome sprite (recoloured and trimmed in-repo by tools/dseyl/build_sprites.py); machines are Syndrome\\'s', artists: ['Original GBA game art (THQ / Heavy Iron); sheet ripper not named on the supplied sheets'],\n"
     "    source: 'Derived from the Syndrome sheet in assets/syndrome/source (see the syndrome entry)', files: ['assets/dseyl/**'] },", 1),
    # ── PHASE 3: flight (profile data + deterministic tap) ──
    (3, 'game.js', 'before', '  if (fighter.traits?.flightProfile) { flightToggleInput(fighter); return }',
     '  if (isDseyl(fighter)) return   // DSEYL: his Charge-tap flight toggle is measured on the SIM clock in dseylPowers.js (deterministic), not here', 1),
    (3, 'flight.js', 'before', '\n  // SUPERMAN (feat/superman, 2026-10-23)',
     "\n  // DSEYL (tribute fighter, rocket boots) — WIRED (traits.flightProfile:\"dseyl\"). A lighter flyer than the Supermen.\n"
     "  //   accel 0.50 · cruiseH 6.0 · cruiseV 5.0 · drag 0.86 · 2 air-dashes\n"
     "  //   3.5 s flight = energyMax 210 / drainPerFrame 1 · groundedAfterHardHit 1.5 s = groundedLock 90\n"
     "  //   (dashSpeed 14 / dashFrames 12 scaled to his cruise speed; the rest = Homelander's defaults)\n"
     "  dseyl: {\n    accel: 0.50, maxH: 6.0, maxV: 5.0, drag: 0.86, reverseBrake: 0.64,\n"
     "    overspeedDrag: 0.90, ceilEaseZone: 72, dashSpeed: 14, dashFrames: 12, maxAirDash: 2,\n"
     "    dashCost: 30, energyMax: 210, drainPerFrame: 1, groundRefillPerFrame: 2, liftoff: -9,\n"
     "    takeoffFrames: 6, landRecovery: 4, landRecoveryAfterAir: 8, groundedLock: 90,\n"
     "    landThreshold: 70, minPoseFrames: 4, cruiseFastFrac: 0.70,\n  },", 1, "\n  dseyl: {\n"),
    # ── PHASE 4: Flash Time → shared time-slow engine ──
    (4, 'game.js', 'after', "import { dseylHarnessApi } from './dseylHarness.js'",
     "import { dseylOppTimeScale } from './dseylFlashTime.js'   // DSEYL Flash Time → the shared _oppTimeScaleOf time-slow engine", 1),
    (4, 'game.js', 'after', '  { const _dpTs = dashParrOppTimeScale(user); if (_dpTs > 0) return _dpTs }',
     '  { const _dsTs = dseylOppTimeScale(user); if (_dsTs > 0) return _dsTs }   // DSEYL "Flash Time" — same slow-time engine (0 for everyone else)', 1),
    # ── PHASE 6: in-game credits contributor line ──
    (6, 'credits.js', 'replace', '      { work: "Multiverse Smash — game engine, movesets, tools & harness", artists: ["Omololu Adaramola"] }\n',
     '      { work: "Multiverse Smash — game engine, movesets, tools & harness", artists: ["Omololu Adaramola"] },\n'
     '      { work: "Contributor — helped build Multiverse Smash (playable as Dseyl)", artists: ["Dseyl"] }\n', 1),
    # ── PHASE 7: twice Superman's flight, the Flash's feet, double-tap dash / teleport on the ground AND in flight ──
    (7, 'flight.js', 'replace',
     "  // DSEYL (tribute fighter, rocket boots) — WIRED (traits.flightProfile:\"dseyl\"). A lighter flyer than the Supermen.\n"
     "  //   accel 0.50 · cruiseH 6.0 · cruiseV 5.0 · drag 0.86 · 2 air-dashes\n"
     "  //   3.5 s flight = energyMax 210 / drainPerFrame 1 · groundedAfterHardHit 1.5 s = groundedLock 90\n"
     "  //   (dashSpeed 14 / dashFrames 12 scaled to his cruise speed; the rest = Homelander's defaults)\n"
     "  dseyl: {\n    accel: 0.50, maxH: 6.0, maxV: 5.0, drag: 0.86, reverseBrake: 0.64,\n"
     "    overspeedDrag: 0.90, ceilEaseZone: 72, dashSpeed: 14, dashFrames: 12, maxAirDash: 2,\n",
     "  // DSEYL (tribute fighter, rocket boots) — WIRED (traits.flightProfile:\"dseyl\"). TWICE Superman's flight speed:\n"
     "  //   accel 4.4 · cruiseH 44 · cruiseV 36 · air-dash 68 (Superman 2.2 / 22 / 18 / 34) · drag 0.84 (Superman's) · 2 air-dashes\n"
     "  //   3.5 s flight = energyMax 210 / drainPerFrame 1 · groundedAfterHardHit 1.5 s = groundedLock 90\n"
     "  //   double-tap away = air dash; double-tap TOWARD the foe = teleport right beside them (game.js detectDoubleTapDashTeleport)\n"
     "  dseyl: {\n    accel: 4.4, maxH: 44.0, maxV: 36.0, drag: 0.84, reverseBrake: 0.64,\n"
     "    overspeedDrag: 0.90, ceilEaseZone: 72, dashSpeed: 68, dashFrames: 12, maxAirDash: 2,\n", 1),
    (7, 'game.js', 'before', '    if (fighter._flightCtl && isFlightModuleFlying(fighter)) { fighter._dashTap = true; return }',
     '    // DSEYL: in flight a double-tap TOWARD the foe blinks right beside them at his own altitude (he keeps flying); away stays the air dash.\n'
     '    if (fighter.rosterKey === "dseyl" && isToward && fighter._flightCtl && isFlightModuleFlying(fighter) && (fighter.dashTeleportCooldown || 0) <= 0) {\n'
     '      const _dsY = fighter.y; teleportBehindTarget(fighter); fighter.y = _dsY\n'
     '      fighter._spriteCastMove = "dash"; fighter._spriteCastTimer = 14; fighter.dashTeleportCooldown = 48; return\n'
     '    }', 1),
]


def apply(text, ops, fname):
    for op in ops:
        ph, f, kind, anchor, payload, count = op[:6]
        if f != fname: continue
        if len(op) > 6 and op[6] in text: continue   # skip marker present (a later phase rewrote this block)
        if kind == 'replace':
            if text.count(payload) >= count: continue   # already applied
            n = text.count(anchor)
            if n != count: sys.exit(f'{f}: replace anchor x{n} (want {count}): {anchor[:80]!r}')
            text = text.replace(anchor, payload)
        elif kind == 'dup':
            key = anchor or payload
            lines = text.split('\n'); out = []; n = 0
            for i, ln in enumerate(lines):
                out.append(ln)
                hit = (ln.strip() == key) if anchor else (key in ln)
                if hit:
                    n += 1
                    twin = R(ln)
                    if i + 1 < len(lines) and lines[i + 1] == twin: continue   # already applied
                    out.append(twin)
            if n != count: sys.exit(f'{f}: dup anchor x{n} (want {count}): {key[:80]!r}')
            text = '\n'.join(out)
        else:
            if payload in text: continue
            lines = text.split('\n')
            idx = [i for i, ln in enumerate(lines) if anchor.strip('\n') in ln] if '\n' not in anchor.strip('\n') else None
            if idx is None:   # multi-line anchor
                n = text.count(anchor)
                if n != count: sys.exit(f'{f}: {kind} anchor x{n}: {anchor[:80]!r}')
                text = text.replace(anchor, (payload + anchor) if kind == 'before' else (anchor + payload))
                continue
            if len(idx) != count: sys.exit(f'{f}: {kind} anchor x{len(idx)} (want {count}): {anchor[:80]!r}')
            i = idx[0]
            if kind == 'after': lines[i + 1:i + 1] = payload.split('\n')
            else: lines[i:i] = payload.split('\n')
            text = '\n'.join(lines)
    return text


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--src'); ap.add_argument('--head'); ap.add_argument('--out'); ap.add_argument('--phase', type=int, default=99)
    a = ap.parse_args()
    ops = [o for o in OPS if o[0] <= a.phase]
    for fname in sorted({o[1] for o in ops}):
        if a.head:
            text = subprocess.run(['git', 'show', f'{a.head}:{fname}'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
            dst = Path(a.out) / fname; dst.parent.mkdir(parents=True, exist_ok=True)
        else:
            dst = Path(a.src) / fname; text = dst.read_text()
        new = apply(text, ops, fname)
        if new != text or a.head: dst.write_text(new)
        print(fname, 'changed' if new != text else 'unchanged')


if __name__ == '__main__':
    main()
