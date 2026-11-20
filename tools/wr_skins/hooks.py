# Idempotent hooks for the windrangers skin pack. Usage: python3 hooks.py <file> [<file> ...]  (applies in place; also used
# on clean HEAD blobs for the private-index commit). Each hook = (file, anchor, replacement-containing-anchor).
import sys
H = [
 ('skins.js', "import { NS_CGPT_SKINS } from './nsCgptSkins.js'",
  "import { WR_SKINS } from './windrangersSkins.js'   // Ninja Storm MS_V1 Ranger Version: the 10-skin pack (cosmetic, precomputed; both forms)\nimport { NS_CGPT_SKINS } from './nsCgptSkins.js'"),
 ('skins.js', "name: 'Start as: Yellow (Dustin)', unlockLevel: 0, portrait: characters.ns_yellow.portrait, spriteScale: characters.ns_yellow.spriteScale, animationData: null }]",
  "name: 'Start as: Yellow (Dustin)', unlockLevel: 0, portrait: characters.ns_yellow.portrait, spriteScale: characters.ns_yellow.spriteScale, animationData: null }, ...WR_SKINS]"),
 ('nsDuo.js', "import { ns_red, ns_yellow } from './nsData.js'\n",
  "import { ns_red, ns_yellow } from './nsData.js'\nimport { wrApplyForm } from './windrangersSkins.js'   // the 10-skin pack follows every form swap (cosmetic only)\n"),
 ('nsDuo.js', "  for (const k of FORM_FIELDS) if (c[k] !== undefined) f[k] = c[k]\n",
  "  for (const k of FORM_FIELDS) if (c[k] !== undefined) f[k] = c[k]\n  wrApplyForm(f, form)   // windrangers skin pack: this form's skin strips / FX folder (no-op for default / start_yellow)\n"),
 ('nsFx.js', "import { drawCgptUnder, drawCgptFx } from './nsCgptFx.js'",
  "import { drawCgptUnder, drawCgptFx } from './nsCgptFx.js'\nimport { drawWrSkinFx, wrAfterimageFx, wrWindFx } from './windrangersSkinFx.js'   // windrangers skin pack (render-only)\nimport { wrCloneAnim } from './windrangersSkins.js'"),
 ('nsFx.js', "drawPose(c, f, 'streakTail', u < 0.5 ? 0 : 1, e.x, e.y, e.dir || 1, 0.85 * (1 - u)) }",
  "drawPose(c, f, 'streakTail', u < 0.5 ? 0 : 1, e.x, e.y, e.dir || 1, 0.85 * (1 - u)); wrAfterimageFx(c, f, 'streakTail', u < 0.5 ? 0 : 1, e.x, e.y, e.dir || 1, 0.85 * (1 - u), SC(f)) }"),
 ('nsFx.js', "drawPose(c, f, k.pose, frameAt(A, k.phase === 'strike' ? 10 : k.t), k.x, k.feet, k.dir || 1, 0.9, k.phase === 'pop' ? 0 : k.tilt)",
  "drawPose(c, f, k.pose, frameAt(A, k.phase === 'strike' ? 10 : k.t), k.x, k.feet, k.dir || 1, 0.9, k.phase === 'pop' ? 0 : k.tilt, wrCloneAnim(f, k.pose))"),
 ('nsFx.js', "      case 'wind': c.save();", "      case 'wind': if (wrWindFx(c, f, e, u)) break; c.save();"),
 ('nsFx.js', "  rememberPose(f)\n", "  rememberPose(f)\n  drawWrSkinFx(c, f)   // windrangers skin pack: move-linked touches over the body (render-only)\n"),
]
def apply(name, s):
    for fn, a, b in H:
        if fn != name or b in s: continue
        assert s.count(a) == 1, (fn, a[:60], s.count(a))
        s = s.replace(a, b)
    return s
if __name__ == '__main__':
    import os
    for p in sys.argv[1:]:
        s = open(p).read(); t = apply(os.path.basename(p), s)
        if t != s: open(p, 'w').write(t); print('hooked', p)
