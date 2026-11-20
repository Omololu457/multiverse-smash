# MSV1-CLONES: idempotent hooks that put the clonechoreo.js choreography on the Naruto-universe ghost-body engines
# (Naruto / Sasuke / Madara / Tobirama / Hashirama only — styleFor() returns null for everyone else → unchanged).
# Usage: python3 tools/msv1_clones_hooks.py <file>...   (also applied to clean HEAD blobs for the private-index commit)
import sys, os
IMP_N = 'import { ccRunStart, ccRunStep, ccRunEnd, ccCasterPose, ccFormationStart, ccFormationStep, ccFormationEnd } from "./clonechoreo.js"   // MSV1-CLONES: the anime clone choreography (Naruto)\n'
IMP_G = 'import { ccRunStart, ccRunStep, ccRunEnd, ccCasterPose, ccFormationStart, ccFormationStep, ccFormationEnd, styleFor as ccStyleFor } from "./clonechoreo.js"   // MSV1-CLONES (Sasuke / Madara / Tobirama / Hashirama only)\n'
H = [
 # ── narutoChoreography.js ──
 ('narutoChoreography.js', 'import { cloneScaling, formationOffsets, formationCloneCount, scaleHitDamage } from "./cloneFormScaling.js"', None, 'prepend', IMP_N),
 ('narutoChoreography.js', "  _run = { caster, target, seq: sequence, frame: 0, bodies, fired: new Set(), finisherFired: false, startX: caster.x, startY: caster.y, dmgMult: cloneScaling(caster).dmgMult }\n",
  "  _run = { caster, target, seq: sequence, frame: 0, bodies, fired: new Set(), finisherFired: false, startX: caster.x, startY: caster.y, dmgMult: cloneScaling(caster).dmgMult }\n  ccRunStart(_run, \"naruto\")   // MSV1-CLONES: hand sign + pop + fan-out lead-in (r.lead frames in front of the authored beats)\n"),
 ('narutoChoreography.js', "  const r = _run, seq = r.seq, t = r.target, caster = r.caster, f = r.frame\n",
  "  const r = _run, seq = r.seq, t = r.target, caster = r.caster, f = r.frame - (r.lead || 0)   // MSV1-CLONES: authored frame (negative = lead-in)\n  ccCasterPose(r, f)\n"),
 ('narutoChoreography.js', "  // Finisher: performed by the REAL Naruto. Default \"spike\"",
  "  ccRunStep(r, f, r.startY + (caster.h || 0))   // MSV1-CLONES: arrival / hold / unison strike / exit for bodies the script is not showing\n\n  // Finisher: performed by the REAL Naruto. Default \"spike\""),
 ('narutoChoreography.js', "  const caster = _run.caster\n  caster._choreoLock = false\n  caster._forceAction = null\n  _run = null\n",
  "  const caster = _run.caster\n  ccRunEnd(_run)\n  caster._choreoLock = false\n  caster._forceAction = null\n  _run = null\n"),
 ('narutoChoreography.js', "  _run.frozen = true\n  _run.frame = frame\n", "  _run.frozen = true\n  _run.frame = frame + (_run.lead || 0)   // MSV1-CLONES: `frame` stays the AUTHORED beat frame\n"),
 ('narutoChoreography.js', "  _formation = { caster, target, bodies, offsets, frame: 0, window: SELECT_WINDOW }\n",
  "  _formation = { caster, target, bodies, offsets, frame: 0, window: SELECT_WINDOW }\n  ccFormationStart(_formation, \"naruto\")   // MSV1-CLONES\n"),
 ('narutoChoreography.js', "  c.vx = 0; c._forceAction = \"idle\"   // keep the soft-hold each frame",
  "  ccFormationStep(fm)   // MSV1-CLONES: pop at Naruto → staggered fan-out to the formation spots\n  c.vx = 0; c._forceAction = \"idle\"   // keep the soft-hold each frame"),
 ('narutoChoreography.js', "export function clearNarutoFormation() {\n", "export function clearNarutoFormation() {\n  ccFormationEnd(_formation)   // MSV1-CLONES: the staged clones leave through smoke\n"),
 ('narutoChoreography.js', "  _formation = null   // release WITHOUT unlocking", "  ccFormationEnd(_formation)   // MSV1-CLONES\n  _formation = null   // release WITHOUT unlocking"),
 ('narutoChoreography.js', "  if (_run && _run.caster) { _run.caster._choreoLock = false; _run.caster._forceAction = null; _run.caster._narutoSelectWindow = 0 }\n",
  "  if (_run && _run.caster) { ccRunEnd(_run); _run.caster._choreoLock = false; _run.caster._forceAction = null; _run.caster._narutoSelectWindow = 0 }\n"),
 # ── cloneChoreography.js ──
 ('cloneChoreography.js', 'import { cloneScaling, formationOffsets, formationCloneCount, scaleHitDamage } from "./cloneFormScaling.js"', None, 'prepend', IMP_G),
 ('cloneChoreography.js', "               finisherFired: false, startX: caster.x, startY: caster.y, dmgMult: cloneScaling(caster).dmgMult })\n",
  "               finisherFired: false, startX: caster.x, startY: caster.y, dmgMult: cloneScaling(caster).dmgMult })\n  ccRunStart(_runs[_runs.length - 1], rosterKey)   // MSV1-CLONES: no-op unless the caster has a CLONE_STYLE (the five)\n"),
 ('cloneChoreography.js', "    const r = _runs[ri], seq = r.seq, t = r.target, caster = r.caster, f = r.frame\n",
  "    const r = _runs[ri], seq = r.seq, t = r.target, caster = r.caster, f = r.frame - (r.lead || 0)   // MSV1-CLONES: authored frame (lead 0 for everyone else)\n    ccCasterPose(r, f)\n"),
 ('cloneChoreography.js', "    // Finisher — performed by the REAL character.",
  "    ccRunStep(r, f, r.startY + (caster.h || 0))   // MSV1-CLONES (no-op without a style)\n\n    // Finisher — performed by the REAL character."),
 ('cloneChoreography.js', "function _endRun(r) {\n", "function _endRun(r) {\n  ccRunEnd(r)   // MSV1-CLONES\n"),
 ('cloneChoreography.js', "export function holdChoreoAt(caster, frame) { const r = _runFor(caster); if (!r) return false; r.frozen = true; r.frame = frame; return true }",
  "export function holdChoreoAt(caster, frame) { const r = _runFor(caster); if (!r) return false; r.frozen = true; r.frame = frame + (r.lead || 0); return true }   // `frame` = authored beat frame"),
 ('cloneChoreography.js', "  _forms.push({ caster, target, rosterKey, bodies, offsets, frame: 0, window: SELECT_WINDOW })\n",
  "  _forms.push({ caster, target, rosterKey, bodies, offsets, frame: 0, window: SELECT_WINDOW })\n  ccFormationStart(_forms[_forms.length - 1], rosterKey)   // MSV1-CLONES (no-op without a style)\n"),
 ('cloneChoreography.js', "    c.vx = 0; c._forceAction = \"idle\"\n    if (fm.frozen) continue   // test hold\n",
  "    ccFormationStep(fm)   // MSV1-CLONES: pop at the caster → staggered fan-out (no-op without a style)\n    c.vx = 0; c._forceAction = \"idle\"\n    if (fm.frozen) continue   // test hold\n"),
 ('cloneChoreography.js', "function _releaseFormationCaster(fm) {\n", "function _releaseFormationCaster(fm) {\n  ccFormationEnd(fm)   // MSV1-CLONES\n"),
 ('cloneChoreography.js', "  const idx = _forms.indexOf(fm); if (idx >= 0) _forms.splice(idx, 1)\n", "  const idx = _forms.indexOf(fm); if (idx >= 0) _forms.splice(idx, 1)\n  ccFormationEnd(fm)   // MSV1-CLONES\n"),
 # ── game.js (render only) ──
 ('game.js', 'import { startNarutoChoreo, updateNarutoChoreo,', None, 'prepend', 'import { drawCloneGhost, drawCloneFx } from "./clonechoreoFx.js"   // MSV1-CLONES: clone tilt + ring / poof / water / wood FX (render-only)\n'),
 ('game.js', "  for (const g of getNarutoChoreoBodies()) renderHybridFighter(g)\n", "  for (const g of getNarutoChoreoBodies()) drawCloneGhost(ctx, g, renderHybridFighter)   // MSV1-CLONES: same path, tilted about the feet\n"),
 ('game.js', "  for (const g of getCloneChoreoBodies()) renderHybridFighter(g)\n", "  for (const g of getCloneChoreoBodies()) drawCloneGhost(ctx, g, renderHybridFighter)\n  drawCloneFx(ctx)   // MSV1-CLONES: rings, smoke / water / wood arrivals + exits (render-only)\n"),
 # ── summons.js (persistent "," clones; render-only FX) ──
 ('summons.js', "  spawnClonePuff(s.x + s.w / 2, s.y + s.h / 2)   // spawn-in smoke; body reveals once it clears\n",
  "  if (!ccPersistFx('pop', owner.rosterKey, s.x + s.w / 2, s.y + s.h, facing, owner.spriteScale, 16)) spawnClonePuff(s.x + s.w / 2, s.y + s.h / 2)   // spawn-in smoke; body reveals once it clears (MSV1-CLONES: Tobirama rises out of water, Hashirama grows, Madara dark smoke)\n"),
 ('summons.js', "  if (key === \"hashirama\" || key === \"madara\") {   // both are Mokuton wood clones → revert to logs on despawn\n",
  "  if (key === \"madara\") { ccPersistFx('exit', key, cx, footY, s.facing, s.owner?.spriteScale, 16); return }   // MSV1-CLONES: Madara's are SHADOW clones → heavy dark smoke, not wood\n  if (key === \"tobirama\") ccPersistFx('exit', key, cx, footY, s.facing, s.owner?.spriteScale, 14)   // MSV1-CLONES: collapses back into water (his own cells) + the existing ripple / burst\n  if (key === \"hashirama\" || key === \"madara\") {   // both are Mokuton wood clones → revert to logs on despawn\n"),
]
def apply(name, s):
    for h in H:
        fn, a = h[0], h[1]
        if fn != name: continue
        if len(h) == 5:   # prepend an import line before anchor
            b = h[4]
            if b in s: continue
            assert s.count(a) == 1, (fn, a[:70]); s = s.replace(a, b + a); continue
        b = h[2]
        if b in s: continue
        assert s.count(a) == 1, (fn, a[:70], s.count(a)); s = s.replace(a, b)
    return s
IMP_S = 'import { ccPersistFx } from "./clonechoreo.js"   // MSV1-CLONES: element-themed spawn / despawn for the persistent clones (render-only)\n'
def apply_imports(name, s):
    if name == 'summons.js' and IMP_S not in s:
        i = s.index('\nimport '); s = s[:i + 1] + IMP_S + s[i + 1:]
    return s
if __name__ == '__main__':
    for p in sys.argv[1:]:
        s = open(p).read(); t = apply(os.path.basename(p), apply_imports(os.path.basename(p), s))
        if t != s: open(p, 'w').write(t); print('hooked', p)
