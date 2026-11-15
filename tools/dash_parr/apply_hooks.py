#!/usr/bin/env python3
"""Dash Parr shared-file hooks. Every hook is a dash_parr-gated line inserted next to a unique S.P.D. Green /
Batman anchor (or an exact in-line substitution), so other characters' code paths are byte-identical.

  python3 tools/dash_parr/apply_hooks.py --head --out DIR   # read shared files from git HEAD (private-index commits)
  python3 tools/dash_parr/apply_hooks.py --src DIR --out DIR

Idempotent: a hook whose text is already present is skipped. Each anchor must match the expected count.
"""
import argparse, subprocess, sys
from pathlib import Path

DP_GAME_IMPORTS = """import { updateDashParrCommandCombat } from './dashParr.js'   // Dash (Dash Parr, The Incredibles) — dash_parr-gated
import { tickDashParr,isDashParr,clearDashParr,dashParrLocked } from './dashParrState.js'
import { drawDashParrFx,drawDashParrUnder,dashParrBodyAlpha,playDashParrCues,drawDashParrHud } from './dashParrFx.js'
import { dashParrHarnessApi } from './dashParrHarness.js'"""

# (file, kind, anchor, text, expected anchor count). kind: after | before | sub
HOOKS = [
 ('characters.js', 'after', "import { spd_green } from './spdGreenData.js'", "import { dash_parr } from './dashParrData.js'   // Dash (Dash Parr, The Incredibles) — dashParr*.js", 1),
 ('characters.js', 'after', "  spd_green,                         // S.P.D. Green", "  dash_parr,                         // Dash (Dash Parr, The Incredibles) — Speedster / Rushdown + Momentum; dashParr*.js", 1),
 ('combat.js', 'after', "import { spdGreenHitbox, spdGreenBlock, spdGreenHit } from './spdGreenState.js'", "import { dashParrHitbox, dashParrBlock, dashParrHit, dashParrComboScale, dashParrDamageMods, dashParrHurtbox } from './dashParrState.js'   // Dash Parr hooks (dash_parr-gated)", 1),
 ('combat.js', 'after', "  if (buggyNullifyDamage(target, opts)) return 0", "  rawDamage = dashParrDamageMods(target, rawDamage, opts)   // DASH PARR — Super Speed / Momentum on hit + Can't Catch Me (dash_parr-gated; raw untouched for everyone else)", 1),
 ('combat.js', 'after', "  if (fighter?.rosterKey === 'spd_red' && curve === COMBO_DAMAGE_CURVE) return spdRedComboScale(fighter)", "  if (fighter?.rosterKey === 'dash_parr' && curve === COMBO_DAMAGE_CURVE) return dashParrComboScale(fighter)   // Dash Parr: 85% per combo step (dash_parr-gated)", 1),
 ('combat.js', 'after', "  if (!atk) return HITSTOP.default", "  if (atk.dp && atk.dp.hitstop != null) return atk.dp.hitstop   // Dash Parr multi-hit specials: light freeze between punches (dp exists only on dash_parr attacks)", 1),
 ('combat.js', 'after', "  if (a?.green && fighter.rosterKey === 'spd_green') return spdGreenHitbox(fighter)", "  if (a?.dp && fighter.rosterKey === 'dash_parr') return dashParrHitbox(fighter)   // Dash Parr: own box (sweep / Laps target box; dash_parr-gated)", 1),
 ('combat.js', 'after', "  if (fighter.rosterKey === 'arlong') return arlongHurtbox(fighter)", "  if (fighter.rosterKey === 'dash_parr' && fighter._dashParr?.lowProfile) return dashParrHurtbox(fighter)   // Dash Parr: Hydroplane low profile (dash_parr-gated)", 1),
 ('combat.js', 'after', "    if (!flawless) spdGreenBlock(attacker, defender, atk)", "    dashParrBlock(attacker, defender, atk, flawless)   // Dash Parr: authored on-block + Momentum drain when Dash guards (dash_parr-gated)", 1),
 ('combat.js', 'after', "    spdGreenHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})", "    dashParrHit(attacker, defender, atk, {armored:!!(bossArmored || castArmored || supArmored)})   // Dash Parr: clean flag + combo step (dash_parr-gated)", 1),
 ('game.js', 'after', "import { spdGreenHarnessApi } from './spdGreenHarness.js'", DP_GAME_IMPORTS, 1),
 ('game.js', 'after', "  for (const _f of [p1, p2]) if (_f) clearSpdGreen(_f,SPD_BLUE_WORLD)", "  for (const _f of [p1, p2]) if (_f) clearDashParr(_f)", 4),
 ('game.js', 'after', "  clearSpdGreen(p1,SPD_BLUE_WORLD);clearSpdGreen(p2,SPD_BLUE_WORLD)", "  clearDashParr(p1);clearDashParr(p2)", 1),
 ('game.js', 'after', "    clearSpdGreen(f,SPD_BLUE_WORLD)", "    clearDashParr(f)", 1),
 ('game.js', 'after', "  if (_roundOver) { clearSpdGreen(p1,SPD_BLUE_WORLD);clearSpdGreen(p2,SPD_BLUE_WORLD) }", "  if (_roundOver) { clearDashParr(p1);clearDashParr(p2) }", 1),
 ('game.js', 'after', "  tickSpdGreen(fighter,nearest,readRawControls(fighter)||{},SPD_BLUE_WORLD,startMove)", "  tickDashParr(fighter,nearest,readRawControls(fighter)||{},SPD_BLUE_WORLD,startMove,matchConfig.seed);playDashParrCues(fighter)   // Dash Parr (dash_parr-gated)", 1),
 ('game.js', 'after', "  tickSpdGreen(fighter,getOpponent(fighter),readRawControls(fighter)||{},SPD_BLUE_WORLD,startMove)", "  tickDashParr(fighter,getOpponent(fighter),readRawControls(fighter)||{},SPD_BLUE_WORLD,startMove,matchConfig.seed);playDashParrCues(fighter)   // Dash Parr (dash_parr-gated)", 1),
 ('game.js', 'after', "  if (isSpdGreen(fighter)) { const gc=updateSpdGreenCommandCombat(fighter,inputState,nearest,SPD_BLUE_WORLD);ctrlState=gc==='grab'?{grab:!!inputState.grab}:{} }", "  if (isDashParr(fighter)) { const dc=updateDashParrCommandCombat(fighter,inputState,nearest,SPD_BLUE_WORLD);ctrlState=dc==='grab'?{grab:!!inputState.grab}:{} }", 1),
 ('game.js', 'before', "  if (isSpdPink(fighter)) {\n    const pc=updateSpdPinkCommandCombat(fighter,inputState,getOpponent(fighter),SPD_BLUE_WORLD)", "  if (isDashParr(fighter)) {   // Dash Parr command layer: 'consumed' | 'grab'\n    const dc=updateDashParrCommandCombat(fighter,inputState,getOpponent(fighter),SPD_BLUE_WORLD)\n    updateCombat(fighter,getOpponent(fighter),dc==='grab'?{grab:!!inputState.grab}:{},opts); return\n  }", 1),
 ('game.js', 'sub', "spdGreenLocked(fighter) || spdPinkLocked(fighter)", "spdGreenLocked(fighter) || dashParrLocked(fighter) || spdPinkLocked(fighter)", 1),
 ('game.js', 'after', "  if (isSpdGreen(f)) snap.push(JSON.stringify(f._spdGreen || null),JSON.stringify(f.currentAttack || null))", "  if (isDashParr(f)) snap.push(JSON.stringify(f._dashParr || null),JSON.stringify(f.currentAttack || null))   // Dash Parr Momentum / moves / Incredi-Rush GAME_STATE", 1),
 ('game.js', 'after', "    if (isSpdGreen(f)) f._spdGreenRemoteInput = replay.isPlayback() || netMatch.isActive()", "    if (isDashParr(f)) f._dashParrRemoteInput = replay.isPlayback() || netMatch.isActive()", 1),
 ('game.js', 'after', "    drawSpdGreenFx(c, fighter)", "    drawDashParrFx(c, fighter)              // Dash — dash / flurry speed lines, sidestep flash, Blur glint (render-only; dash_parr only)", 1),
 ('game.js', 'after', "    drawSpdRedUnder(c, fighter, globalFrameCount)", "    drawDashParrUnder(c, fighter, getOpponent(fighter))   // Dash — Blur afterimages, Laps loop, Incredi-Rush storm, BEHIND the body (render-only; dash_parr only)", 1),
 ('game.js', 'sub', "_shadowSinkBodyAlpha(fighter) * spdRedBodyAlpha(fighter)", "_shadowSinkBodyAlpha(fighter) * spdRedBodyAlpha(fighter) * dashParrBodyAlpha(fighter)", 1),
 ('game.js', 'after', "    if (_ssA < 1) { c.save(); c.globalAlpha = _ssA }", "    if (_ssA === 0 && dashParrBodyAlpha(fighter) === 0) { c.beginPath(); c.rect(0, 0, 0, 0); c.clip() }   // Dash: body fully hidden while Laps / Incredi-Rush draw him at render offsets (the sprite's tint + transition-ghost passes reset globalAlpha)", 1),
 ('game.js', 'sub', "    _drawJuiceDashTrail(c, fighter)     // JUICE (Phase 3)", "    if (dashParrBodyAlpha(fighter) === 0) fighter._juiceTrailBuf = null; else _drawJuiceDashTrail(c, fighter)     // JUICE (Phase 3) [Dash: no ghost of the hidden body during Laps / Incredi-Rush]", 1),
 ('game.js', 'after', "  drawBatmanHud(ctx, canvas, p1, p2)", "  drawDashParrHud(ctx, canvas, p1, p2, globalFrameCount)   // Dash: Momentum gauge under his energy bar (gated)", 1),
 ('game.js', 'after', "    spdGreenTest: spdGreenHarnessApi({p1:()=>p1,p2:()=>p2,world:SPD_BLUE_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", "    dashParrTest: dashParrHarnessApi({p1:()=>p1,p2:()=>p2,world:SPD_BLUE_WORLD,reset:()=>{resetTraining();clearInputBuffers([p1,p2])}}),", 1),
 ('input.js', 'sub', "!fighter._spdGreenRemoteInput &&", "!fighter._spdGreenRemoteInput && !fighter._dashParrRemoteInput &&", 2),
 ('input.js', 'sub', "fighter.rosterKey === 'spd_green' ||", "fighter.rosterKey === 'spd_green' || fighter.rosterKey === 'dash_parr' ||", 1),
 ('physics.js', 'after', "import { arlongWalkMul, arlongDashMul } from './arlongState.js'", "import { dashParrWalkMul, dashParrPhasing } from './dashParrState.js'   // Dash Parr: Momentum speed tiers + pass-through (dash_parr-gated; 1 / false for everyone else)", 1),
 ('physics.js', 'sub', "* arlongDashMul(fighter)", "* arlongDashMul(fighter) * dashParrWalkMul(fighter)", 1),
 ('physics.js', 'sub', "* rangerWalkMul(fighter, (L && !R) ? -1 : (R && !L) ? 1 : 0)", "* rangerWalkMul(fighter, (L && !R) ? -1 : (R && !L) ? 1 : 0) * dashParrWalkMul(fighter)", 1),
 ('physics.js', 'after', "    if (zoroPhasing(p1, p2)) return", "    if (dashParrPhasing(p1, p2)) return   // Dash Parr passing THROUGH (Blur Dash cross-up / Laps / Sidestep / Panic Run / Incredi-Rush)", 1),
 ('abilities.js', 'after', "import { sanjiRegen } from './sanjiState.js'", "import { dashParrRegen } from './dashParrState.js'   // Dash Parr: Super Speed 4/s replaces the shared regen (dash_parr-gated)", 1),
 ('abilities.js', 'after', "  if (sanjiRegen(fighter)) return", "  if (dashParrRegen(fighter)) return", 1),
 ('kits.js', 'after', "import { SPD_GREEN_KIT } from './spdGreenKit.js'", "import { DASH_PARR_KIT } from './dashParrKit.js'", 1),
 ('kits.js', 'after', "  spd_green: SPD_GREEN_KIT,", "  dash_parr: DASH_PARR_KIT,", 1),
 ('skins.js', 'after', "import { SPD_GREEN_SKINS } from './spdGreenSkins.js'", "import { DASH_PARR_SKINS } from './dashParrSkins.js'   // Dash: Supersuit + Incredibles 2 + Track Star palette swaps (cosmetic, precomputed)", 1),
 ('skins.js', 'after', "  spd_green: SPD_GREEN_SKINS,", "  dash_parr: DASH_PARR_SKINS,", 1),
 ('spritesheets.js', 'after', "  spd_green: { actions: { idle: './assets/spd_green/idle.png' } },", "  dash_parr: { actions: { idle: './assets/dash_parr/idle.png' } },", 1),
 ('credits.js', 'after', "    files: ['assets/spd_green/*.png', 'assets/spd_green/cells/*.png', 'assets/spd_green/skins/**'] },",
  "  dash_parr: { work: 'Dash — The Incredibles (Game Boy Advance)', artists: ['redblueyellow (ripper)'],\n    source: 'Supplied sheet; visible credit text: \"Ripped by redblueyellow. No credit needed.\" (excluded from animation). Original pixels; only the exact corner teal keyed. Source SHA-256 + rects in docs/dash/source_rects.json.',\n    files: ['assets/dash_parr/*.png', 'assets/dash_parr/cells/*.png', 'assets/dash_parr/skins/**', 'assets/dash_parr/source/dash_sheet.png'] },", 1),
 ('game.js', 'after', "import { tickDashParr,isDashParr,clearDashParr,dashParrLocked } from './dashParrState.js'", "import { dashParrOppTimeScale } from './dashParrState.js'   // Dash: Flash Time (Back + Special) feeds the shared per-opponent time-slow", 1),
 ('game.js', 'after', "  if (user._shiFlickerActive) return user._shiOppTimeScale || 0.36", "  { const _dpTs = dashParrOppTimeScale(user); if (_dpTs > 0) return _dpTs }   // DASH \"Flash Time\" — same slow-time engine (0 for everyone else)", 1),
 ('fighters.js', 'after', "    case \"omniman\": drawOmniMan(ctx, x, y, w, h, fighter); break", "    case \"dash_parr\": drawFallback(ctx, x, y, w, h, { ...fighter, color: \"#d81038\", name: \"Dash\" }); break   // ★ Dash (procedural fallback before sprites load; real render is sprite-based)", 1),
]


def apply(text, kind, anchor, add, count, fname):
    n = text.count(anchor)
    probe = add if kind != 'sub' else add
    if probe in text:
        return text, 'skip'
    assert n == count, f'{fname}: anchor count {n} != {count}: {anchor[:70]!r}'
    if kind == 'sub':
        return text.replace(anchor, add), 'sub'
    out, i = [], 0
    while True:
        j = text.find(anchor, i)
        if j < 0:
            out.append(text[i:]); break
        if kind == 'after':
            e = text.find('\n', j + len(anchor)); e = len(text) if e < 0 else e + 1
            out.append(text[i:e]); out.append(add + '\n'); i = e
        else:
            s = text.rfind('\n', 0, j) + 1
            out.append(text[i:s]); out.append(add + '\n'); out.append(text[s:j + len(anchor)]); i = j + len(anchor)
    return ''.join(out), kind


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--head', action='store_true'); ap.add_argument('--rev', default='HEAD')
    ap.add_argument('--src'); ap.add_argument('--out', required=True); a = ap.parse_args()
    root = Path(__file__).resolve().parents[2]; out = Path(a.out); out.mkdir(parents=True, exist_ok=True)
    files = sorted({h[0] for h in HOOKS})
    for f in files:
        text = subprocess.run(['git', 'show', f'{a.rev}:{f}'], cwd=root, capture_output=True, text=True, check=True).stdout if a.head else (Path(a.src) / f).read_text()
        for (ff, kind, anchor, add, count) in HOOKS:
            if ff == f:
                text, r = apply(text, kind, anchor, add, count, f)
        (out / f).write_text(text)
        print('hooked', f)


if __name__ == '__main__':
    sys.exit(main())
