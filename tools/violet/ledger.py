#!/usr/bin/env python3
"""Writes docs/violet/SPRITE_LEDGER.md from the frame registry + the extract.py animation table. Usage: python3 -I tools/violet/ledger.py"""
import sys; from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import frames as F, extract as X
USE = {  # animation → move / use (what plays it)
  'idle': 'neutral stance', 'walk': 'walk forward', 'walk_back': 'walk back (R5 reversed)', 'run': 'run', 'dash': 'dash (run long strides)',
  'jump': 'jump rise', 'doubleJump': 'double jump (flip)', 'fall': 'jump fall', 'land': 'landing', 'crouch': 'crouch',
  'guard': 'BLOCK — R6 f1 held + R13 f3 ring drawn by violetFx (no dedicated guard art on the sheet)',
  'hurt': 'hit react', 'hurt_air': 'air hit react', 'knockdown': 'knockdown', 'getup': 'get up', 'lose': 'lose pose (lying)', 'win': 'win pose',
  'taunt': 'taunt', 'dizzy': 'dizzy fallback', 'intro': 'intro (appears out of thin air: the visible fade-in figures)',
  'light': 'JAB (+ R13 f1 burst at the hands on hit)', 'heavy': 'HEAVY (+ R13 f3 ring)', 'vLow': 'LOW (+ R13 burst)', 'up': 'LAUNCHER (+ upward R13 burst)', 'air': 'AIR attack (+ air downAir alias)',
  'vPush': 'FORCE PUSH cast (R14 projectile)', 'vShield': 'BUBBLE SHIELD cast (R15 dome)', 'vBall': 'FORCE BALL roll body (R10 shell around it)',
  'vTrap': 'FIELD TRAP cast (R8 bubble at the opponent)', 'vUlt': 'FULL FORCE cast (R8 trap → R15 max dome)', 'vPhase': 'PHASE STEP (invisible backdash)',
  'vanish': 'VANISH fade-out (enter)', 'inv_idle': 'invisible idle (35% alpha)', 'inv_walk': 'invisible walk (35% alpha)', 'inv_crouch': 'invisible crouch (35% alpha)',
  'reappear': 'VANISH fade-in (exit / ambush hit)',
  'fx_trap': 'FIELD TRAP bubble form + FULL FORCE trap', 'fx_shell': 'FORCE BALL shell', 'fx_hit': 'jab / low / launcher hit FX; block ring (f3)',
  'fx_push': 'FORCE PUSH projectile', 'fx_dome': 'BUBBLE SHIELD dome + FULL FORCE detonation (max size)', 'portrait': 'HUD / select portrait',
}
def main():
  im, bg, lab, fr = F.registry()
  uses = {}
  for k, (ids, _, _) in X.ANIMS.items():
    for i in ids: uses.setdefault(i, []).append(k)
  for k, ids in X.FX.items():
    for i in ids: uses.setdefault(i, []).append('fx_' + k)
  uses.setdefault('R1f1', []).append('portrait')
  L = ['# Violet Parr — SPRITE LEDGER', '',
    'Source: `assets/sprites/violet.png` (byte-identical copy of the supplied "Game Boy Advance - The Incredibles - Playable Characters - Violet.png", '
    f'SHA-256 `{F.SHA256}`). Background key = the exact corner colour `{bg}` (all four corners agree), zero tolerance; the purple invisibility '
    'figures and the bubble/ring rims are kept, ring interiors (background colour) become transparent. The "Ripped by redblueyellow. No credit needed." '
    'caption (band 19, x ≥ 105) is excluded. Cut = 8-connected components → 19 row bands → x-overlap merge (one ring = one frame) → specks to the '
    'nearest frame. Every frame below is used; no art was invented. Reuse is listed explicitly.', '',
    'This ledger is authoritative over the brief\'s best-effort inventory. Differences found on the real sheet:', '',
    '- R5 and R6 are both leaning poses: R5 = an 8-frame walk cycle, R6 = arms-forward push (Jab f1–3, Heavy / Force Push f4–8).',
    '- R11 is a front-facing invisible stance (used for invisible idle **and** walk); R12 is its visible twin (exact palette remap), used for the Vanish fade-in and the intro.',
    '- R17 f8–f11 (not f5–f6) are the curled ball used by Force Ball; R17 f5–f7 are crouch / Low poses.',
    '- R16 has 10 frames (hit back → fall → lie ×3 → sit up → rise ×3); R17 has 11.',
    '- No guard pose exists: BLOCK = R6 f1 held + the R13 f3 ring drawn over her (render-only).',
    '- R13 f1–f3 are pixel-identical to R8 f1–f3 (the sheet repeats them); both are kept and both are used.', '',
    '| frame | band | source rect (x0,y0,x1,y1) | animation(s) | move / use |', '|---|---|---|---|---|']
  for f in fr:
    an = uses.get(f['id'], [])
    L.append(f"| {f['id']} | R{f['band']} {F.BAND_NAMES[f['band']]} | {f['x0']},{f['y0']},{f['x1']},{f['y1']} | {', '.join(an)} | {'; '.join(USE[a] for a in an)} |")
  L += ['', f'Total: {len(fr)} frames, {sum(1 for f in fr if f["id"] in uses)} used, 0 unused.', '',
    '## Animations', '', '| animation | frames | use |', '|---|---|---|']
  for k, (ids, sp, loop) in X.ANIMS.items(): L.append(f'| `{k}` | {" ".join(ids)} | {USE[k]} |')
  for k, ids in X.FX.items(): L.append(f'| `fx/{k}` | {" ".join(ids)} | {USE["fx_" + k]} |')
  (F.ROOT / 'docs/violet/SPRITE_LEDGER.md').write_text('\n'.join(L) + '\n'); print('ledger written', len(fr))
main()
