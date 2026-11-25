#!/usr/bin/env python3
"""Demon Slayer ultimate-cinematic hooks — idempotent, anchor-based insertions into SHARED files (abilities.js), same tool
shape as tools/dino/hooks.py. Every line is tagged `// DS-ULT-CINE` and only runs inside that fighter's own ultimate.

  python3 tools/ds/hooks.py worktree | blobs <rev> | check
"""
import subprocess, sys, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
M = '   // DS-ULT-CINE'
INOSUKE_ULT = """// ── INOSUKE ULTIMATE — BEAST BREATHING, EIGHTH FORM: EXPLOSIVE RUSH (INOSUKE-ULT) ─────────────────────────────────
// A reckless criss-cross charge: he bursts in and tears through the foe from alternating sides — five fang strikes — then
// a final piercing lunge. 30×5 + 150 = 300 raw (Zenitsu's band); blocked → 25 % chip per beat. Cooldown-gated (no meter:
// Inosuke has maxEnergy 0), 9 s. Out of reach (> 520 px or a different level) it's a whiff: one charge forward, cooldown spent.
// A storyboard opener (narutoStoryboard.js "inosuke") plays first; every beat below waits on it (pending spawns freeze).
const INOSUKE_ULT_CD = 540
function executeInosukeUltimate(fighter, context) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const target = context?.getOpponent?.(fighter)
  const mid = f => (f.x || 0) + (f.w || 60) / 2
  const inReach = !!target && !target.eliminated && Math.abs(mid(target) - mid(fighter)) <= 520 && Math.abs((target.y || 0) - (fighter.y || 0)) <= 140
  try { sound.playSfxFile?.(pickInosukeVoice("specialCast"), null); fighter._atkVoiceCd = 150 } catch (_) {}
  fighter.vx = 0
  fighter.attackCooldown = getAttackDuration(70, fighter)
  fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, 66)
  fighter._spriteCastMove = "inosukeCine2"; fighter._spriteCastTimer = 14
  const ww = context?.worldWidth || 3200, dir0 = fighter.facing || 1
  const BEATS = [[8, "inosukeCine1", 30], [16, "inosukeB3", 30], [24, "inosukeCine1", 30], [32, "inosukeB4", 30], [40, "inosukeCine2", 30], [54, "inosukeCine4", 150]]
  BEATS.forEach(([t, pose, dmg], i) => schedulePendingSpawn(t, () => {
    if (fighter.eliminated || (fighter.health ?? 1) <= 0) return
    const last = i === BEATS.length - 1
    fighter._spriteCastMove = pose; fighter._spriteCastTimer = last ? 18 : 8
    if (!inReach) { if (i === 0) { fighter.x = Math.max(0, Math.min(ww - (fighter.w || 60), fighter.x + dir0 * 300)) } return }
    if (!target || target.eliminated) return
    const side = last ? -dir0 : (i % 2 === 0 ? dir0 : -dir0)   // tear through from alternating sides; the lunge lands from the far side
    fighter.x = Math.max(0, Math.min(ww - (fighter.w || 60), mid(target) + side * ((target.w || 60) / 2 + 34) - (fighter.w || 60) / 2))
    fighter.facing = mid(target) >= mid(fighter) ? 1 : -1
    if ((target.invulnTimer || 0) > 0) return
    if (target.isBlocking) { target.blockstun = Math.max(target.blockstun || 0, 16); applyScaledDamage(target, Math.floor(dmg * 0.25), { source: "ability" }); return }
    target.hitstun = Math.max(target.hitstun || 0, last ? 52 : 26); target.colorFlash = 10
    target.vx = last ? fighter.facing * 15 : 0; target.vy = last ? -9 : (target.vy || 0)
    applyScaledDamage(target, dmg, { source: "ability" })   // the ult band (300 raw ≈ 180), like Kirin / Zenitsu
  }))
  fighter._suppressUltCooldown = true
  fighter.ultimateCooldown = INOSUKE_ULT_CD
  try { shakeCamera(context, 9, 16) } catch (_) {}
  startDemonSlayerPreroll("inosuke", fighter, target)   // INOSUKE-ULT: the storyboard opener
  return true
}
"""

HOOKS = [
  ('abilities.js', 'import { activateInosukeBeastCinematic, isInosukeBeastCinematicActive } from "./inosukeBeastCinematic.js"',
   'import { startDemonSlayerPreroll } from "./demonSlayerCinematics.js"' + M + ' (Zenitsu / Nezuko ultimate pre-rolls; no cycle)', 'after'),
  ('abilities.js', '  focusCameraOnAction(context, fighter, target, 1.0, 10)\n  return true\n}\n// FIRST FORM: THUNDERCLAP AND FLASH',
   '  focusCameraOnAction(context, fighter, target, 1.0, 10)\n  startDemonSlayerPreroll("zenitsu", fighter, target)' + M + '\n  return true\n}\n// FIRST FORM: THUNDERCLAP AND FLASH', 'inline'),
  ('abilities.js', '  fighter._nzUltP2Pending = true                             // phase 2 auto-chains when phase 1 ends (updateNezukoUltChain)',
   '  startDemonSlayerPreroll("nezuko", fighter, context?.getOpponent?.(fighter))' + M, 'after'),
  ('abilities.js', '  fighter._spriteCastMove  = "nezukoTransform"   // transform-in flourish',
   '  startDemonSlayerPreroll("nezukoDemon", fighter, context?.getOpponent?.(fighter))' + M, 'after'),
  ('abilities.js', '      case "sakura":  cast = executeSakuraUltimate(fighter, context);  break',
   '      case "sakura":  cast = executeSakuraUltimate(fighter, context);  if (cast) startDemonSlayerPreroll("sakura", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', '      case "hinata":  cast = executeHinataUltimate(fighter, context);  break',
   '      case "hinata":  cast = executeHinataUltimate(fighter, context);  if (cast) startDemonSlayerPreroll("hinata", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', '      case "sasuke_sensei": cast = executeSasukeSenseiUltimate(fighter, context); break',
   '      case "sasuke_sensei": cast = executeSasukeSenseiUltimate(fighter, context); if (cast) startDemonSlayerPreroll("sasuke_sensei", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', '      case "six_paths_pain": cast = executeSixPathsUltimate(fighter, context); break',
   '      case "six_paths_pain": cast = executeSixPathsUltimate(fighter, context); if (cast) startDemonSlayerPreroll("six_paths_pain", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', '      case "naruto_hokage": cast = executeNarutoHokageUltimate(fighter, context); break',
   '      case "naruto_hokage": cast = executeNarutoHokageUltimate(fighter, context); if (cast) startDemonSlayerPreroll("naruto_hokage", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', '      case "naruto_seventh": cast = executeNarutoSeventhUltimate(fighter, context); break',
   '      case "naruto_seventh": cast = executeNarutoSeventhUltimate(fighter, context); if (cast) startDemonSlayerPreroll("naruto_seventh", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', '      case "sasuke_adult": cast = executeSasukeAdultUltimate(fighter, context); break',
   '      case "sasuke_adult": cast = executeSasukeAdultUltimate(fighter, context); if (cast) startDemonSlayerPreroll("sasuke_adult", fighter, context?.getOpponent?.(fighter)); /* DS-ULT-CINE */ break', 'inline'),
  ('abilities.js', 'import { startDemonSlayerPreroll } from "./demonSlayerCinematics.js"', 'import "./narutoUltCinematics.js"' + M + ' (registers the Naruto ult pre-roll scripts)', 'after'),
  # FIX (pre-existing since 1482d5e9f): Hinata's ultimate was pasted INSIDE applyHinataGuutenToProjectiles' loop, so it was
  # block-scoped and triggerUltimate threw "executeHinataUltimate is not defined". Move the loop's tail back above it.
  ('abilities.js', "    _hhDrain(fighter, opp, 20)\n  })\n  try { shakeCamera(context, 6, 16) } catch (_) {}\n  return true\n}\n    if (p.radius != null) p.radius *= 0.85\n    activeProjectiles.splice(i, 1)   // spun away\n  }\n}\n",
   "    _hhDrain(fighter, opp, 20)\n  })\n  try { shakeCamera(context, 6, 16) } catch (_) {}\n  return true\n}\n// (Guuten loop tail moved above — DS-ULT-CINE fix)\n", 'inline'),
  ('abilities.js', "    p.vx = (p.vx || 0) * 0.6; p.vy = (p.vy || 0) * 0.6\n// ULTIMATE (Phase 3)",
   "    p.vx = (p.vx || 0) * 0.6; p.vy = (p.vy || 0) * 0.6\n    if (p.radius != null) p.radius *= 0.85\n    activeProjectiles.splice(i, 1)   // spun away\n  }\n}\n// ULTIMATE (Phase 3)", 'inline'),
  # BEN 10 / ALBEDO human-form ultimate → the all-aliens sequence (ben10AlienSequence.js); same cost / 250 total / recovery
  ('abilities.js', 'import "./narutoUltCinematics.js"', 'import "./ben10AlienSequence.js"' + M + ' (registers the Ben 10 / Albedo all-aliens ultimate)', 'after'),
  ('abilities.js', "    hitAt(18, 70); hitAt(40, 70); hitAt(66, 110)\n",
   "    if (!startDemonSlayerPreroll(\"benAlienSequence\", fighter, getTargetResolver(context)(fighter), { hit: (dmg, last) => {" +
   " const opp = getTargetResolver(context)(fighter); if (!opp || opp.eliminated) return; applyScaledDamage(opp, dmg, { source: \"ben-overload\", attacker: fighter });" +
   " opp.hitstun = Math.max(opp.hitstun || 0, last ? 40 : 16); if (last) { opp.vx = (opp.x >= fighter.x ? 1 : -1) * 12; opp.vy = -8 } } }))" +
   " { hitAt(18, 70); hitAt(40, 70); hitAt(66, 110) }   // DS-ULT-CINE: the all-aliens sequence (the 3 radial hits stay as the fallback)\n", 'inline'),
  # NARUTO STORYBOARDS (narutoStoryboard.js): own-cinematic ults are deferred behind the storyboard; the rest start it after the cast
  ('abilities.js', 'import "./ben10AlienSequence.js"', 'import { deferNarutoUlt } from "./narutoStoryboard.js"' + M + ' (Naruto-universe storyboard ult openers)', 'after'),
  ('abilities.js', '  activateKuramaUltimate(fighter, opponent)   // game.js freezes combat + drives the beats' + '\n', '  deferNarutoUlt("naruto", fighter, opponent, () => activateKuramaUltimate(fighter, opponent))   // NARUTO-STORYBOARD: storyboard first, then the cinematic (unchanged)' + '\n', 'inline'),
  ('abilities.js', '  activateObitoJuubi(fighter, opponent)   // game.js freezes combat + drives the beats' + '\n', '  deferNarutoUlt("obito", fighter, opponent, () => activateObitoJuubi(fighter, opponent))   // NARUTO-STORYBOARD: storyboard first, then the cinematic (unchanged)' + '\n', 'inline'),
  ('abilities.js', '  activateTobiNineTails(fighter, opponent)   // game.js freezes combat + drives the beats' + '\n', '  deferNarutoUlt("tobi", fighter, opponent, () => activateTobiNineTails(fighter, opponent))   // NARUTO-STORYBOARD: storyboard first, then the cinematic (unchanged)' + '\n', 'inline'),
  ('abilities.js', '  activateMinatoKurama(fighter, opponent)   // game.js freezes combat + drives the beats' + '\n', '  deferNarutoUlt("minato", fighter, opponent, () => activateMinatoKurama(fighter, opponent))   // NARUTO-STORYBOARD: storyboard first, then the cinematic (unchanged)' + '\n', 'inline'),
  ('abilities.js', '  activateMadaraTengaiShinseiCinematic(fighter, opp, (cineCtx) => applyMadaraTengaiDamage(fighter, opp, cineCtx))' + '\n', '  deferNarutoUlt("madara_tengai", fighter, opp, () => activateMadaraTengaiShinseiCinematic(fighter, opp, (cineCtx) => applyMadaraTengaiDamage(fighter, opp, cineCtx)))   // NARUTO-STORYBOARD: storyboard first, then the cinematic (unchanged)' + '\n', 'inline'),
  ('abilities.js', '  activatePainChibakuTenseiCinematic(fighter, opp, (cineCtx) => applyPainChibakuDamage(fighter, opp, cineCtx))' + '\n', '  deferNarutoUlt("pain", fighter, opp, () => activatePainChibakuTenseiCinematic(fighter, opp, (cineCtx) => applyPainChibakuDamage(fighter, opp, cineCtx)))   // NARUTO-STORYBOARD: storyboard first, then the cinematic (unchanged)' + '\n', 'inline'),
  ('abilities.js', '  activateEdoTenseiCinematic(fighter, context?.getOpponent?.(fighter), "in", vesselKey,\n    () => applyEdoTensei(fighter, vesselKey, worldWidth), worldWidth)\n  return true\n', '  deferNarutoUlt("tobirama", fighter, context?.getOpponent?.(fighter), () => activateEdoTenseiCinematic(fighter, context?.getOpponent?.(fighter), "in", vesselKey,\n    () => applyEdoTensei(fighter, vesselKey, worldWidth), worldWidth))   // NARUTO-STORYBOARD: storyboard first\n  return true\n', 'inline'),
  ('abilities.js', '  activateDomain(fighter, { name: "Sealing Jutsu", cost: 0, duration: HASHIRAMA_DOMAIN_SECONDS, range: 1e5, damageBoost: 1.15 }, context)\n', '  deferNarutoUlt("hashirama", fighter, opp, () => {   // NARUTO-STORYBOARD: storyboard first, then the domain + gates (unchanged)\n  activateDomain(fighter, { name: "Sealing Jutsu", cost: 0, duration: HASHIRAMA_DOMAIN_SECONDS, range: 1e5, damageBoost: 1.15 }, context)\n', 'inline'),
  ('abilities.js', '    (cameo, cineCtx) => dealHashiramaCameoHit(fighter, opp, cameo, cineCtx),\n    HASHIRAMA_DOMAIN_SECONDS * 60)\n  return true\n', '    (cameo, cineCtx) => dealHashiramaCameoHit(fighter, opp, cameo, cineCtx),\n    HASHIRAMA_DOMAIN_SECONDS * 60)\n  })   // NARUTO-STORYBOARD (end of the deferred block)\n  return true\n', 'inline'),
  ('abilities.js', '      case "kakashi": cast = executeKakashiUltimate(fighter, context); break', '      case "kakashi": cast = executeKakashiUltimate(fighter, context); if (cast) startDemonSlayerPreroll("kakashi", fighter, context?.getOpponent?.(fighter)); /* NARUTO-STORYBOARD */ break', 'inline'),
  ('abilities.js', '      case "kakashi_anbu": cast = executeKakashiAnbuUltimate(fighter, context); break', '      case "kakashi_anbu": cast = executeKakashiAnbuUltimate(fighter, context); if (cast) startDemonSlayerPreroll("kakashi_anbu", fighter, context?.getOpponent?.(fighter)); /* NARUTO-STORYBOARD */ break', 'inline'),
  ('abilities.js', '      case "kakashi_war": cast = executeKakashiWarUltimate(fighter, context); break', '      case "kakashi_war": cast = executeKakashiWarUltimate(fighter, context); if (cast) startDemonSlayerPreroll("kakashi_war", fighter, context?.getOpponent?.(fighter)); /* NARUTO-STORYBOARD */ break', 'inline'),
  ('abilities.js', '      case "shisui_fallen": cast = executeShisuiFallenUltimate(fighter, context); break', '      case "shisui_fallen": cast = executeShisuiFallenUltimate(fighter, context); if (cast) startDemonSlayerPreroll("shisui_fallen", fighter, context?.getOpponent?.(fighter)); /* NARUTO-STORYBOARD */ break', 'inline'),
  ('abilities.js', '      case "sasuke":  cast = executeSasukeUltimate(fighter, context);  break', '      case "sasuke":  cast = executeSasukeUltimate(fighter, context);  if (cast) startDemonSlayerPreroll("sasuke", fighter, context?.getOpponent?.(fighter)); /* NARUTO-STORYBOARD */ break', 'inline'),
  ('abilities.js', '      case "itachi":  cast = executeItachiUltimate(fighter, context);  break', '      case "itachi":  cast = executeItachiUltimate(fighter, context);  if (cast) startDemonSlayerPreroll("itachi", fighter, context?.getOpponent?.(fighter)); /* NARUTO-STORYBOARD */ break', 'inline'),
  ('abilities.js', '      case "madara":  cast = executeMadaraUltimate(fighter, context, !!opts.hold); break', '      case "madara":  cast = executeMadaraUltimate(fighter, context, !!opts.hold); if (cast) startDemonSlayerPreroll("madara_susanoo", fighter, context?.getOpponent?.(fighter)); /* NARUTO-STORYBOARD */ break', 'inline'),
  ('abilities.js', '      case "isshiki": cast = executeIsshikiUltimate(fighter, context); break', '      case "isshiki": cast = executeIsshikiUltimate(fighter, context); if (cast) startDemonSlayerPreroll("isshiki", fighter, context?.getOpponent?.(fighter)); /* NARUTO-STORYBOARD */ break', 'inline'),
  ('abilities.js', '      case "jiraiya": cast = executeJiraiyaUltimate(fighter, context);   break', '      case "jiraiya": cast = executeJiraiyaUltimate(fighter, context);   if (cast) startDemonSlayerPreroll("jiraiya", fighter, context?.getOpponent?.(fighter)); /* NARUTO-STORYBOARD */ break', 'inline'),
  ('abilities.js', '      case "gaara":   cast = executeGaaraUltimate(fighter, context);  break', '      case "gaara":   cast = executeGaaraUltimate(fighter, context);  if (cast) startDemonSlayerPreroll("gaara", fighter, context?.getOpponent?.(fighter)); /* NARUTO-STORYBOARD */ break', 'inline'),
  # INOSUKE ULTIMATE (new): Beast Breathing, Eighth Form: Explosive Rush — cooldown-gated (no meter), storyboard opener
  ('abilities.js', '      case "zenitsu": cast = executeZenitsuUltimate(fighter, context); break', '      case "inosuke": cast = executeInosukeUltimate(fighter, context); break   // INOSUKE-ULT: Explosive Rush (8s cooldown, no meter)', 'after'),
  ('abilities.js', '// ── ZENITSU ULTIMATE (Stage 5) — Thunderclap & Flash: Godspeed (dash-through slice)', INOSUKE_ULT, 'before'),
  ('characters.js', '  ultimate: { name: "Beast Breathing: Assist", cost: 0, description: "Signature is the mid-combo Beast Breathing Assist (Stage 4). No separate ultimate." },',
   '  ultimate: { name: "Beast Breathing: Explosive Rush", cost: 0, description: "Eighth Form — a reckless criss-cross charge through the foe: five fang strikes and a final piercing lunge (300). 9s cooldown, no meter. The Beast Breathing Assist stays his mid-combo signature." },   // INOSUKE-ULT', 'inline'),
  # HUNTER x HUNTER + DRAGON BALL STORYBOARDS (hxhStoryboard.js / dbStoryboard.js — the narutoStoryboard toolkit)
  ('abilities.js', 'import { deferNarutoUlt } from "./narutoStoryboard.js"', 'import "./hxhStoryboard.js"; import "./dbStoryboard.js"' + M + ' (registers the HxH / Dragon Ball storyboard openers)', 'after'),
  ('abilities.js', '  activateVegetaFinalFlashCinematic(fighter, opp, (cineCtx) => applyVegetaFinalFlashDamage(fighter, opp, cineCtx))\n', '  deferNarutoUlt("vegeta", fighter, opp, () => activateVegetaFinalFlashCinematic(fighter, opp, (cineCtx) => applyVegetaFinalFlashDamage(fighter, opp, cineCtx)))   // STORYBOARD: the opener first, then the cinematic (unchanged)\n', 'inline'),
  ('abilities.js', '  activateBeerusKiBallCinematic(fighter, opp, (cineCtx) => applyBeerusKiBallDamage(fighter, opp, cineCtx))\n', '  deferNarutoUlt("beerus", fighter, opp, () => activateBeerusKiBallCinematic(fighter, opp, (cineCtx) => applyBeerusKiBallDamage(fighter, opp, cineCtx)))   // STORYBOARD: the opener first, then the cinematic (unchanged)\n', 'inline'),
  ('abilities.js', '  activateGokuBlackSwordCinematic(fighter, opp, (cineCtx) => applySwordSlashDamage(fighter, opp, cineCtx))\n', '  deferNarutoUlt("goku_black", fighter, opp, () => activateGokuBlackSwordCinematic(fighter, opp, (cineCtx) => applySwordSlashDamage(fighter, opp, cineCtx)))   // STORYBOARD: the opener first, then the cinematic (unchanged)\n', 'inline'),
  ('abilities.js', '  activateHisokaOverdriveCinematic(fighter, opp)\n', '  deferNarutoUlt("hisoka", fighter, opp, () => activateHisokaOverdriveCinematic(fighter, opp))   // STORYBOARD: the opener first, then the cinematic (unchanged)\n', 'inline'),
  ('abilities.js', '  activateKilluaGodspeedCinematic(fighter, opp)\n', '  deferNarutoUlt("killua", fighter, opp, () => activateKilluaGodspeedCinematic(fighter, opp))   // STORYBOARD: the opener first, then the cinematic (unchanged)\n', 'inline'),
  ('abilities.js', '  activateChrolloSkillHunterCinematic(fighter, context?.getOpponent?.(fighter),\n    () => applySkillHunter(fighter, targetKey))\n  return true\n', '  deferNarutoUlt("chrollo", fighter, context?.getOpponent?.(fighter), () => activateChrolloSkillHunterCinematic(fighter, context?.getOpponent?.(fighter),\n    () => applySkillHunter(fighter, targetKey)))   // STORYBOARD: the opener first\n  return true\n', 'inline'),
  ('abilities.js', '      case "goku":    cast = executeGokuUltimate(fighter, context); break', '      case "goku":    cast = executeGokuUltimate(fighter, context); if (cast) startDemonSlayerPreroll("goku", fighter, context?.getOpponent?.(fighter)); /* STORYBOARD */ break', 'inline'),
  ('abilities.js', '      case "netero":  cast = executeNeteroUltimate(fighter, context);  break', '      case "netero":  cast = executeNeteroUltimate(fighter, context);  if (cast) startDemonSlayerPreroll("netero", fighter, context?.getOpponent?.(fighter)); /* STORYBOARD */ break', 'inline'),
  ('abilities.js', '      case "vegeta_dark": cast = executeVegetaDarkUltimate(fighter, context); break', '      case "vegeta_dark": cast = executeVegetaDarkUltimate(fighter, context); if (cast) startDemonSlayerPreroll("vegeta_dark", fighter, context?.getOpponent?.(fighter)); /* STORYBOARD */ break', 'inline'),
]
SUPERSEDED = []

def apply(path, text):
    out, notes = text, []
    for f, prefix in SUPERSEDED:
        if f == path: out = ''.join(l for l in out.splitlines(True) if not l.startswith(prefix))
    for h in HOOKS:
        f, anchor, ins, mode = h[0], h[1], h[2], h[3]
        allocc = len(h) > 4 and h[4] == 'all'
        if f != path: continue
        if mode == 'inline':
            if ins in out: continue
            n = out.count(anchor)
            if n == 0: notes.append(f'MISSING anchor in {f}: {anchor[:70]!r}'); continue
            if n > 1 and not allocc: notes.append(f'AMBIGUOUS ({n}) anchor in {f}: {anchor[:70]!r}'); continue
            out = out.replace(anchor, ins)
            continue
        first_line = ins.split('\n')[0]
        n = out.count(anchor)
        if n == 0: notes.append(f'MISSING anchor in {f}: {anchor[:70]!r}'); continue
        if n > 1 and not allocc: notes.append(f'AMBIGUOUS ({n}) anchor in {f}: {anchor[:70]!r}'); continue
        if out.count(first_line) >= (n if allocc else 1): continue
        pos, res = 0, []
        while True:
            i = out.find(anchor, pos)
            if i < 0: res.append(out[pos:]); break
            if mode == 'after':
                if anchor.endswith('\n'): end = i + len(anchor); res.append(out[pos:end] + ins); pos = end
                else:
                    end = out.find('\n', i + len(anchor)); end = len(out) if end < 0 else end + 1
                    res.append(out[pos:end] + ins + '\n'); pos = end
            else:   # before: insert on its own line(s) before the anchor's line
                ls = out.rfind('\n', 0, i) + 1
                res.append(out[pos:ls] + ins + '\n' + out[ls:i + len(anchor)]); pos = i + len(anchor)
            if not allocc: res.append(out[pos:]); break
        out = ''.join(res)
    return out, notes

FILES = sorted({h[0] for h in HOOKS})
if os.environ.get('DINO_FILES') is not None: FILES = [f for f in FILES if f in os.environ['DINO_FILES'].split(',')]   # one phase's files
if __name__ == '__main__':
    cmd = sys.argv[1] if len(sys.argv) > 1 else 'check'
    bad = []
    for f in FILES:
        if cmd == 'blobs':
            rev = sys.argv[2]
            src = subprocess.run(['git', 'show', f'{rev}:{f}'], cwd=ROOT, capture_output=True, check=True).stdout.decode()
            new, notes = apply(f, src); bad += notes
            blob = subprocess.run(['git', 'hash-object', '-w', '--stdin'], cwd=ROOT, input=new.encode(), capture_output=True, check=True).stdout.decode().strip()
            print(f, blob)
        else:
            p = os.path.join(ROOT, f); src = open(p).read()
            new, notes = apply(f, src); bad += notes
            if cmd == 'worktree' and new != src: open(p, 'w').write(new); print('hooked', f)
            elif cmd == 'check': print(f, 'changes pending' if new != src else 'ok')
    for b in bad: print(b, file=sys.stderr)
    sys.exit(1 if bad else 0)
