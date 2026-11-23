#!/usr/bin/env python3
"""MSV1-DINO engine hooks — idempotent, anchor-based insertions into SHARED files (gated on the Dino Thunder fighter:
no-op for everyone else). Same tool shape as tools/msv1/hooks.py.

  python3 tools/dino/hooks.py worktree        apply to the working tree (keeps every other session's dirty edits)
  python3 tools/dino/hooks.py blobs <rev>     apply to <rev>'s clean blobs → `git hash-object -w`, print "path blob" lines
  python3 tools/dino/hooks.py check           report which hooks are present in the worktree

Every hook is (file, anchor, text, mode). 'after' = insert text on new line(s) after the anchor's line; 'inline' = replace
the anchor substring with text (skipped when text is already present).
"""
import subprocess, sys, os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
M = '   // MSV1-DINO'
FORMS = "dt_red, dt_blue, dt_yellow, dt_white"
HOOKS = [
  # roster
  ('characters.js', "import { ns_trio, ns_blue, ns_navy, ns_green } from './nsTrio.js'",
   "import { dinothunder, dt_red, dt_blue, dt_yellow, dt_white } from './dinothunder.js'" + M + " Dino Thunder Rangers: ONE character, four forms (hidden form profiles)", 'after'),
  ('characters.js', "  ns_trio, ns_blue, ns_navy, ns_green,", "  dinothunder, dt_red, dt_blue, dt_yellow, dt_white," + M + " — Conner / Ethan / Kira / Trent; hold P + J/K/L/O swaps", 'after'),
  ('spritesheets.js', "  ns_trio: { actions: { idle: './assets/ns_blue/idle.png' } },",
   "  dinothunder: { actions: { idle: './assets/dt_red/idle.png' } }, dt_red: { actions: { idle: './assets/dt_red/idle.png' } }, dt_blue: { actions: { idle: './assets/dt_blue/idle.png' } }, dt_yellow: { actions: { idle: './assets/dt_yellow/idle.png' } }, dt_white: { actions: { idle: './assets/dt_white/idle.png' } }," + M + " (starts on the form's own sheets)", 'after'),
  ('skins.js', "  ns_trio: [{ id: 'default', name: 'Start as: Blue (Tori)'",
   "  dinothunder: [{ id: 'default', name: 'Start as: Red (Conner)', unlockLevel: 0, portrait: characters.dt_red.portrait, spriteScale: characters.dt_red.spriteScale, animationData: null }, "
   "{ id: 'start_blue', name: 'Start as: Blue (Ethan)', unlockLevel: 0, portrait: characters.dt_blue.portrait, spriteScale: characters.dt_blue.spriteScale, animationData: null }, "
   "{ id: 'start_yellow', name: 'Start as: Yellow (Kira)', unlockLevel: 0, portrait: characters.dt_yellow.portrait, spriteScale: characters.dt_yellow.spriteScale, animationData: null }, "
   "{ id: 'start_white', name: 'Start as: White (Trent)', unlockLevel: 0, portrait: characters.dt_white.portrait, spriteScale: characters.dt_white.spriteScale, animationData: null }, ...DINO_SKINS]," + M + " start forms + the 16 team skins", 'after'),
  ('skins.js', "import { TRIO_SKINS } from './nsTrioSkins.js'", "import { DINO_SKINS } from './dinoSkins.js'" + M + " Dino Thunder: the 16 team skins (premade, all four forms)", 'after'),
  ('credits.js', "    files: ['assets/ns_trio/*.png', 'assets/ns_blue/*.png', 'assets/ns_navy/*.png', 'assets/ns_green/*.png'] },   // NS TRIO",
   "  dinothunder: { work: 'Dino Thunder Rangers — Conner (Red), Ethan (Blue), Kira (Yellow), Trent (White / Drago)', artists: ['falmeatwad (Red Ranger sheet)', 'YONDY-HOKAGE / DK-YONDY (Blue, Yellow, White Ranger sheets)', 'Raikage (Drago Ranger sheet)'],\n"
   "    source: 'Five supplied sheets (assets/incoming/dinothunder): cut frame-by-frame by exact background key (tools/dino/extract.py, ledgers in docs/msv1/dino/ledgers), packed into MSV1 cells (tools/dino/pack.py); Trent\\'s White + Drago sheets unified to one 15-colour palette; the Drago Clone strips are a fixed per-colour darkening (tools/dino/portraits.py). No art invented.',\n"
   "    files: ['assets/dinothunder/*.png', 'assets/dt_red/*.png', 'assets/dt_blue/*.png', 'assets/dt_yellow/*.png', 'assets/dt_white/*.png', 'assets/dt_white/clone/*.png', 'assets/incoming/dinothunder/*'] }," + M, 'after'),
  ('rosterParity.js', "  ns_trio: 1.6, ns_blue: 1.6, ns_navy: 1.6, ns_green: 1.6,",
   "  dinothunder: 1.6, dt_red: 1.6, dt_blue: 1.6, dt_yellow: 1.6, dt_white: 1.6," + M + ": the MS_V1 Ranger tier (live rosterKey = the active form)", 'after'),
  ('battleBlood.js', "ns_trio: 'ranger', ", "ns_trio: 'ranger', dinothunder: 'ranger', dt_red: 'ranger', dt_blue: 'ranger', dt_yellow: 'ranger', dt_white: 'ranger', ", 'inline'),
  ('battleBlood.js', "ns_green: ['ns_trio'] }", "ns_green: ['ns_trio'], dt_red: ['dinothunder'], dt_blue: ['dinothunder'], dt_yellow: ['dinothunder'], dt_white: ['dinothunder'] }", 'inline'),
  ('hudBars.js', "ns_trio: ['#7ab0ff', '#1e48b0', '#9ae8ff', '#2a8ad8', 'wind'],",
   "ns_trio: ['#7ab0ff', '#1e48b0', '#9ae8ff', '#2a8ad8', 'wind'], dinothunder: ['#ff6a5a', '#a01414', '#ffe066', '#c89a10', 'grid'], dt_red: ['#ff6a5a', '#a01414', '#ffe066', '#c89a10', 'grid'], "
   "dt_blue: ['#7ab0ff', '#1e48b0', '#ffe066', '#c89a10', 'grid'], dt_yellow: ['#ffe066', '#c89a10', '#ffffff', '#c8c8d8', 'grid'], dt_white: ['#ffffff', '#a8a8b8', '#ffe07a', '#c8a020', 'grid'],", 'inline'),
  ('entranceIntro.js', '"sanji", "superman"])', '"sanji", "superman", "dinothunder", "dt_red", "dt_blue", "dt_yellow", "dt_white"])', 'inline'),
  ('kits.js', "import { TRIO_KIT } from './nsTrioKit.js'", "import { DINO_KIT } from './dinoKit.js'" + M + " Dino Thunder Rangers move list", 'after'),
  ('kits.js', "  ns_trio: TRIO_KIT,   // NS TRIO", "  dinothunder: DINO_KIT," + M, 'after'),
  ('sound.js', "import { NS_SOUNDS } from './nsSound.js'", "import { DINO_SOUNDS } from './dinoSound.js'" + M + " Dino Thunder synth SFX (SFX bus)", 'after'),
  ('sound.js', "  ...NS_SOUNDS,   // MSV1 nsr_* (Shane) / nsy_* (Dustin)", "  ...DINO_SOUNDS," + M + " dt_*", 'after'),
  # input / command / CPU
  ('input.js', "fighter.rosterKey === 'ns_green' || ", "fighter.rosterKey === 'ns_green' || fighter.rosterKey === 'dt_red' || fighter.rosterKey === 'dt_blue' || fighter.rosterKey === 'dt_yellow' || fighter.rosterKey === 'dt_white' || fighter.rosterKey === 'dinothunder' || ", 'inline'),
  ('ninjaCommand.js', "import './nsTrio.js'", "import './dinothunder.js'" + M + ": registers the Dino Thunder Rangers (dinothunder) hooks", 'after'),
  ('ai.js', "import { trioAiInput } from './nsTrio.js'", "import { dinoAiInput } from './dinothunder.js'" + M + " CPU swap (real hold P + J/K/L/O input)", 'after'),
  ('ai.js', "  return cgptAiInput(controller, fighter, opponent, trioAiInput(controller, fighter, opponent, duoAiInput(controller, fighter, opponent, aiHuntDrones(controller, fighter, updateAIController(controller, fighter, opponent, world)))))",
   "  return dinoAiInput(controller, fighter, opponent, cgptAiInput(controller, fighter, opponent, trioAiInput(controller, fighter, opponent, duoAiInput(controller, fighter, opponent, aiHuntDrones(controller, fighter, updateAIController(controller, fighter, opponent, world))))))", 'inline'),
  # damage choke-point
  ('combat.js', "import { invHitbox, invBlock, invHit, invKnockback, invDamageMods, invKoFloor }", "import { dinoDamageMods } from './dinoState.js'" + M + " (leaf module; no-op unless a Dino Thunder fighter is involved)", 'after'),
  ('combat.js', "  rawDamage = gsDamageMods(target, rawDamage, opts)", "  rawDamage = dinoDamageMods(target, rawDamage, opts)" + M + ": Super Dino Mode / Evil / Camouflage / High Score / Tricera Skin", 'after'),
  # ninja.js (gated: duo hooks only exist on the Dino entry; fixedReal only on Trent's profile)
  ('ninja.js', "  if (n > p.streak.chain) return false", "  if (f._duo && duoOf(f)?.streakGate && !duoOf(f).streakGate(f, s, n)) return false" + M + ": Red chains only in Super Speed", 'after'),
  ('ninja.js', "  const realMoves = hash(f, 31) < 0.5", "  const realMoves = M.fixedReal ? false : hash(f, 31) < 0.5", 'inline'),
  ('ninja.js', "  const p = getNinjaProfile(def)\n  if (ctx.proj) {", "  const p = getNinjaProfile(def)\n  if (def._duo) { const r = duoOf(def)?.evades?.(def, ctx, p, s); if (r != null) return r }" + M + ": shield absorb / dash + Super Dino armor\n  if (ctx.proj) {", 'inline'),
  ('ninja.js', "  if (!m || !isNinja(opp) || !ai) return opp", "  if (getNinjaProfile(opp).mirror?.fixedReal) return opp" + M + ": the Drago Clone never trades places (no hidden identity)", 'after'),
  # result screen: an art-provider list, empty by default (dinoFx.js registers BOSS KILLED for the Dino Thunder winner)
  ('matchflow.js', "export function drawVictoryScreen(ctx, canvas, state) {", "export const VICTORY_ART = []" + M + ": per-character result-screen art providers (render-only; empty = unchanged)", 'before'),
  ('matchflow.js', "  // ── WINNER DECLARATION", "  for (const fn of VICTORY_ART) { try { fn(ctx, canvas, state) } catch (_) {} }" + M, 'before'),
  # nsFx.js (render-only)
  ('nsFx.js', "import { trioFormAnim } from './nsTrioSkins.js'", "import { isDino, drawDinoBurst, drawDinoUnder, drawDinoFx, drawDinoIntro, drawDinoHud, dinoHudTag, dinoCloneAnim } from './dinoFx.js'" + M + " (render-only; dinothunder only)", 'after'),
  ('nsFx.js', "      default: drawTrioBurst(c, f, e, u, calm())", "      default: if (!drawDinoBurst(c, f, e, u, calm())) drawTrioBurst(c, f, e, u, calm())", 'inline'),
  ('nsFx.js', "    drawPose(c, f, ip.key, ip.frame, ix, m.ifeet, m.dir || f.facing || 1, 1)\n", "    drawPose(c, f, ip.key, ip.frame, ix, m.ifeet, m.dir || f.facing || 1, 1, 0, dinoCloneAnim(f, ip.key))\n", 'inline'),
  ('nsFx.js', "  drawTrioSuper(c, f, drawPose, duoFormAnim,", "  drawDinoFx(c, f, drawPose, duoFormAnim, calm())" + M, 'before'),
  ('nsFx.js', "  drawIntroStreak(c, f)\n  drawCgptUnder(c, f)", "  if (!drawDinoIntro(c, f, drawPose)) drawIntroStreak(c, f)\n  drawCgptUnder(c, f)\n  drawDinoUnder(c, f, drawPose, calm())" + M, 'inline'),
  ('nsFx.js', "  ctx.fillText(tag, o.flip ? x : x + w, y + h + 9)", "  ctx.fillText(dinoHudTag(f) || tag, o.flip ? x : x + w, y + h + 9)", 'inline'),
  ('nsFx.js', "  if (f._duo) drawDuoHud(ctx, f, x, y, w, o)", "  if (f._duo) { if (isDino(f)) drawDinoHud(ctx, f, x, y, w, o); else drawDuoHud(ctx, f, x, y, w, o) }" + M, 'inline'),
  ('nsFx.js', "  const key = f.rosterKey === 'ns_yellow' || f.rosterKey === 'ns_green' ? 'nsy_' : 'nsr_'", "  const key = isDino(f) ? 'dt_' : f.rosterKey === 'ns_yellow' || f.rosterKey === 'ns_green' ? 'nsy_' : 'nsr_'", 'inline'),
]

SUPERSEDED = [('skins.js', "  dinothunder: [{ id: 'default', name: 'Start as: Red (Conner)'")]   # older versions of a hook line, dropped first

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
