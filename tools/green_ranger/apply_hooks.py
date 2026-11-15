#!/usr/bin/env python3
"""Green Ranger: idempotent, narrow registration hooks in shared files, anchored AFTER the Black Ranger (mmpr_black)
lines (those exist both at HEAD and in the dirty worktree, so the same hooks apply to either).
Each hook = (file, anchor, op, text, marker, count). The anchor must occur EXACTLY `count` times (asserted).
op 'after' inserts `text` as new line(s) after the line(s) ending the anchor; op 'replace' substitutes anchor -> text.
A hook whose marker is already present is skipped, so re-running is a no-op. Other writers' lines are never touched;
each file is re-read immediately before writing and written only if changed.
Usage: apply_hooks.py [--check] [--head --out DIR]   (--head builds each file from `git show HEAD:<file>` into DIR)"""
import sys, os, subprocess
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CREDIT = ("  green_ranger: { work: 'Green Ranger — Mighty Morphin Power Rangers (custom sprite sheet)', artists: ['Supaman2525 (sprite edit)', 'belial the hegehog (credited source rips)'],\n"
  "    source: 'Supplied sheet \"mmpr_green_ranger_custom_sprite_sheet_by_supaman2525_d65abhs.png\"; visible credit panel: \"Green Ranger From Mighty Morphin PowerRangers / Sprites Edit By Supaman2525 / Credit Goes to belial the hegehog / Please Give Credit when used.\" (transcribed as drawn; excluded from animation). Ultimate uses the shared Falconzord sheet (\"Sprites ripped by Belial the Hedgehog.\"). Exact background key only; rects + SHA-256 in docs/green_ranger/source_rects.json.',\n"
  "    files: ['assets/green_ranger/**', 'assets/power_rangers/falconzord/**'] },")
B = "MMPR_BLACK_WORLD"
HOOKS = [
  ('characters.js', "import { mmpr_black } from './mmprBlackData.js'", 'after',
   "import { green_ranger } from './greenRangerData.js'   // Green Ranger (Tommy Oliver, MMPR) — greenRanger*.js + shared rangerZordUltimate.js (Falconzord)", "from './greenRangerData.js'", 1),
  ('characters.js', "  mmpr_black,                        // Black Ranger", 'after',
   "  green_ranger,                      // Green Ranger (Tommy Oliver, MMPR) — Martial Artist / Blade Pressure (Dragon Call notes; Ranger Zord Assault); greenRanger*.js", "  green_ranger,  ", 1),
  ('spritesheets.js', "  mmpr_black: { actions: { idle: './assets/mmpr_black/idle.png' } },", 'after',
   "  green_ranger: { actions: { idle: './assets/green_ranger/idle.png' } },", "assets/green_ranger/idle.png", 1),
  ('kits.js', "import { MMPR_BLACK_KIT } from './mmprBlackKit.js'", 'after',
   "import { GREEN_RANGER_KIT } from './greenRangerKit.js'   // Green Ranger (green_ranger) Move List", "greenRangerKit.js", 1),
  ('kits.js', "  mmpr_black: MMPR_BLACK_KIT,", 'after', "  green_ranger: GREEN_RANGER_KIT,", "green_ranger: GREEN_RANGER_KIT", 1),
  ('skins.js', "import { MMPR_BLACK_SKINS } from './mmprBlackSkins.js'", 'after',
   "import { GREEN_RANGER_SKINS } from './greenRangerSkins.js'   // Green Ranger default + 10 inspired palettes (cosmetic, precomputed region masks)", "greenRangerSkins.js", 1),
  ('skins.js', "  mmpr_black: MMPR_BLACK_SKINS,", 'after', "  green_ranger: GREEN_RANGER_SKINS,", "green_ranger: GREEN_RANGER_SKINS", 1),
  ('credits.js', "    files: ['assets/mmpr_black/**', 'assets/power_rangers/falconzord/**'] },", 'after', CREDIT, "assets/green_ranger/**", 1),
  ('combat.js', "import { mmprBlackHitbox, mmprBlackBlock, mmprBlackHit, mmprBlackProjectileHit } from './mmprBlackState.js'", 'after',
   "import { greenHitbox, greenBlock, greenHit } from './greenRangerState.js'   // Green Ranger hooks (green_ranger-gated)", "from './greenRangerState.js'", 1),
  ('combat.js', "  if (a?.mb && fighter.rosterKey === 'mmpr_black') return mmprBlackHitbox(fighter)", 'after',
   "  if (a?.gm && fighter.rosterKey === 'green_ranger') return greenHitbox(fighter)   // Green Ranger: per-move box + Rising Talon contact windows; body-less calls have none", "return greenHitbox(fighter)", 1),
  ('combat.js', "    if (!flawless) mmprBlackBlock(attacker, defender, atk)", 'after',
   "    if (!flawless) greenBlock(attacker, defender, atk)   // Green Ranger: authored blockstun; green_ranger-gated", "greenBlock(attacker", 1),
  ('combat.js', "    mmprBlackHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", 'after',
   "    greenHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Green Ranger: clean flag (chains / cancels); green_ranger-gated", "greenHit(attacker", 1),
  ('input.js', "!fighter._mmprBlackRemoteInput && ", 'replace', "!fighter._mmprBlackRemoteInput && !fighter._greenRangerRemoteInput && ", "!fighter._greenRangerRemoteInput && ", 2),
  ('input.js', "fighter.rosterKey === 'mmpr_black' || ", 'replace', "fighter.rosterKey === 'mmpr_black' || fighter.rosterKey === 'green_ranger' || ", "fighter.rosterKey === 'green_ranger' || ", 1),
  # ── game.js ──
  ('game.js', "import { mmprBlackHarnessApi } from './mmprBlackHarness.js'", 'after',
   "import { updateGreenCommandCombat } from './greenRanger.js'   // Green Ranger (Tommy Oliver, MMPR) — green_ranger-gated command layer\n"
   "import { tickGreen, isGreenRanger, clearGreen, greenLocked, greenOwnsCharge } from './greenRangerState.js'\n"
   "import { isZordUltCineActive, updateZordUltCine, clearZordUltCine } from './rangerZordUltimate.js'   // shared Ranger Zord ultimate (freeze contract; any opted-in Ranger)\n"
   "import { drawGreenRangerFx, playGreenCues } from './greenRangerFx.js'\n"
   "import { greenRangerHarnessApi } from './greenRangerHarness.js'", "from './greenRanger.js'", 1),
  ('game.js', "const MMPR_PINK_WORLD = MMPR_BLACK_WORLD", 'after',
   "const GREEN_RANGER_WORLD = MMPR_BLACK_WORLD   // Green Ranger: the same self-contained world (Pulse / Edge bursts spawn through W.spawn, Zord damage through W.damage)", "const GREEN_RANGER_WORLD", 1),
  ('game.js', "isMmprBlackUltActive() || ", 'replace', "isMmprBlackUltActive() || isZordUltCineActive() || ", "isZordUltCineActive() || ", 1),
  ('game.js', "  clearMmprBlackUlt()", 'after', "  clearZordUltCine()   // shared Ranger Zord ultimate (Green Ranger; freeze contract)", "  clearZordUltCine()   // shared", 4),
  ('game.js', "  for (const _f of [p1, p2]) if (_f) clearMmprBlack(_f,MMPR_BLACK_WORLD)", 'after',
   "  for (const _f of [p1, p2]) if (_f) clearGreen(_f,GREEN_RANGER_WORLD)", "if (_f) clearGreen(_f,GREEN_RANGER_WORLD)", 4),
  ('game.js', "  tickMmprBlack(fighter,nearest,readRawControls(fighter)||{},MMPR_BLACK_WORLD)\n  playMmprBlackCues(fighter)", 'after',
   "  tickGreen(fighter,nearest,readRawControls(fighter)||{},GREEN_RANGER_WORLD)\n  playGreenCues(fighter)", "tickGreen(fighter,nearest,", 1),
  ('game.js', "  tickMmprBlack(fighter,getOpponent(fighter),readRawControls(fighter)||{},MMPR_BLACK_WORLD)\n  playMmprBlackCues(fighter)", 'after',
   "  tickGreen(fighter,getOpponent(fighter),readRawControls(fighter)||{},GREEN_RANGER_WORLD)\n  playGreenCues(fighter)", "tickGreen(fighter,getOpponent", 1),
  ('game.js', "  if (isMmprBlack(fighter)) { const mc=updateMmprBlackCommandCombat(fighter,inputState,nearest,MMPR_BLACK_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", 'after',
   "  if (isGreenRanger(fighter)) { const mc=updateGreenCommandCombat(fighter,inputState,nearest,GREEN_RANGER_WORLD);ctrlState=mc==='grab'?{grab:!!inputState.grab}:{} }", "updateGreenCommandCombat(fighter,inputState,nearest", 1),
  ('game.js', "    const mc=updateMmprBlackCommandCombat(fighter,inputState,getOpponent(fighter),MMPR_BLACK_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 'after',
   "  if (isGreenRanger(fighter)) {   // Green Ranger command layer: 'consumed' | 'grab'\n    const mc=updateGreenCommandCombat(fighter,inputState,getOpponent(fighter),GREEN_RANGER_WORLD)\n    updateCombat(fighter,getOpponent(fighter),mc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", "updateGreenCommandCombat(fighter,inputState,getOpponent", 1),
  ('game.js', "  if (isMmprBlack(f) || f._falcon) snap.push(", 'after',
   "  if (isGreenRanger(f) || f._zordUlt) snap.push(JSON.stringify(f._greenRanger ? { ...f._greenRanger, cues: undefined } : null),JSON.stringify(f._zordUlt || null),JSON.stringify(f.currentAttack || null))   // Green Ranger + shared Zord ultimate GAME_STATE (render cue queue excluded)", "JSON.stringify(f._zordUlt || null)", 1),
  ('game.js', "clearMmprBlack(p1,MMPR_BLACK_WORLD);clearMmprBlack(p2,MMPR_BLACK_WORLD)", 'replace',
   "clearMmprBlack(p1,MMPR_BLACK_WORLD);clearMmprBlack(p2,MMPR_BLACK_WORLD);clearGreen(p1,GREEN_RANGER_WORLD);clearGreen(p2,GREEN_RANGER_WORLD)", "clearGreen(p1,GREEN_RANGER_WORLD);clearGreen(p2", 2),
  ('game.js', "mmprBlackLocked(fighter, readRawControls(fighter)) ||", 'replace', "mmprBlackLocked(fighter, readRawControls(fighter)) || greenLocked(fighter) ||", "greenLocked(fighter) ||", 1),
  ('game.js', "!isTransformDevice(fighter) && ", 'replace', "!isTransformDevice(fighter) && !greenOwnsCharge(fighter) && ", "!greenOwnsCharge(fighter) && ", 1),
  ('game.js', "    if (isMmprBlack(f)) f._mmprBlackRemoteInput = replay.isPlayback() || netMatch.isActive()", 'after',
   "    if (isGreenRanger(f)) f._greenRangerRemoteInput = replay.isPlayback() || netMatch.isActive()", "f._greenRangerRemoteInput = replay", 1),
  ('game.js', "    clearMmprBlack(f,MMPR_BLACK_WORLD)", 'after', "    clearGreen(f,GREEN_RANGER_WORLD)", "    clearGreen(f,GREEN_RANGER_WORLD)", 1),
  ('game.js', "    updateMmprBlackUlt()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", 'after',
   "  // RANGER ZORD ASSAULT (shared rangerZordUltimate.js, Green Ranger opt-in): the same freeze contract.\n  if (isZordUltCineActive()) {\n    updateZordUltCine()\n    if (typeof camera.advance === \"function\") camera.advance(canvas)\n    return\n  }", "    updateZordUltCine()", 1),
  ('game.js', "    drawMmprBlackFx(c, fighter, getOpponent(fighter))", 'after',
   "    drawGreenRangerFx(c, fighter, getOpponent(fighter))   // Green Ranger — note glyphs, call circles, empower telegraph, tinted Falconzord, cut-in, CALL MISSED (render-only)", "drawGreenRangerFx(c, fighter", 1),
  ('game.js', '    && !(a.rosterKey === "mmpr_black" && a.skinId !== b.skinId)', 'after',
   '    && !(a.rosterKey === "green_ranger" && a.skinId !== b.skinId)   // Green Ranger: same rule (team-ID marker comes from the player slot)', 'a.rosterKey === "green_ranger" && a.skinId', 1),
  ('game.js', "    mmprBlackTest: mmprBlackHarnessApi(", 'after',
   "    greenRangerTest: greenRangerHarnessApi({p1:()=>p1,p2:()=>p2,world:GREEN_RANGER_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "greenRangerTest: greenRangerHarnessApi", 1),
]


def apply(text, fname, check=False):
    out = []
    for f, anchor, op, new, marker, count in HOOKS:
        if f != fname: continue
        if marker in text: continue
        n = text.count(anchor)
        if n != count: raise SystemExit(f'{fname}: anchor count {n} != {count}: {anchor[:80]!r}')
        if check: out.append(f'{fname}: would apply {marker[:50]!r}'); continue
        if op == 'replace': text = text.replace(anchor, new)
        else:
            pos = 0
            for _ in range(count):
                i = text.index(anchor, pos); e = text.index('\n', i + len(anchor) - 1) if not anchor.endswith('\n') else i + len(anchor) - 1
                text = text[:e + 1] + new + '\n' + text[e + 1:]; pos = e + 1 + len(new) + 1
        out.append(f'{fname}: applied {marker[:50]!r}')
    return text, out


def main():
    a = sys.argv[1:]
    check, head = '--check' in a, '--head' in a
    outdir = a[a.index('--out') + 1] if '--out' in a else None
    files = sorted({h[0] for h in HOOKS})
    for fname in files:
        if head:
            text = subprocess.run(['git', 'show', f'HEAD:{fname}'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
        else:
            text = open(os.path.join(ROOT, fname), encoding='utf-8').read()
        new, log = apply(text, fname, check)
        for l in log: print(l)
        if check: continue
        if head:
            os.makedirs(outdir, exist_ok=True); open(os.path.join(outdir, fname), 'w', encoding='utf-8').write(new)
        elif new != text:
            cur = open(os.path.join(ROOT, fname), encoding='utf-8').read()   # re-read right before writing
            if cur != text: raise SystemExit(f'{fname} changed during apply; re-run')
            open(os.path.join(ROOT, fname), 'w', encoding='utf-8').write(new)


if __name__ == '__main__':
    main()
