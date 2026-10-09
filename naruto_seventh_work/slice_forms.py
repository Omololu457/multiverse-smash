"""naruto_seventh FORM slicer — extract the FULL locomotion/attack frame sets for the
nine-tails transformations straight from the padakun H sheet (the user ask: "use ALL the
frames from each move set for each transformation — use the entire sprite sheet").

Sources (keyed-scan y-bands, verified by eye):
  GOLDEN KCM  (Rikudou-Mode-Combo golden body):  r1 y3163-3225, r2 y3242-3304
  FOUR-TAILS  (red beast rampage):               r1 y2808-2864 .. r4 y3038-3104

Motion-line blur spans are EXCLUDED by explicit xrects (only clean body frames selected).
Outputs are naruto_seventh_* uniform strips (bbox-crop → max cell, center-X, bottom-align).
"""
import sys
sys.path.insert(0, '.')
from slice7 import slice_action   # reuse the proven bbox-pack slicer (same contract)

# ── GOLDEN KCM: full locomotion + chakra-arm attack from the Rikudou-combo golden body ──
# run cycle (r2 — 4 clean running poses)
slice_action('kcm_run',  (3240, 3306), xrects=[(252,297),(312,353),(372,411),(432,473)])
# dash / forward burst (r2 recovery runs)
slice_action('kcm_dash', (3240, 3306), xrects=[(732,784),(803,850),(873,913)])
# jump / leap (r2 — launch poses with trail)
slice_action('kcm_jump', (3240, 3306), xrects=[(13,69),(92,147)], strip_lines=True)
# chakra-arm strike (r2 — golden arm forming + full extend) → KCM heavy & up launcher
slice_action('kcm_arm',  (3240, 3306), xrects=[(492,521),(542,617),(632,712)])

# ── FOUR-TAILS beast: full locomotion + claw + chakra-arm slam ──
# idle / stance (tall biped beast + upright clawing stance)
slice_action('ft_idle2', [(2962,3024),(3038,3104)], xrects=None,
             # pick: r3(12,71) upright clawing  +  r4(502,565) tall biped stance
             )
# NOTE: ft_idle2 auto-detects — override with explicit below for clean 2f
slice_action('ft_idle2', (3038, 3104), xrects=[(502,565),(12,72)])
# quadruped RUN cycle (r4 — on-all-fours running, 3 clean frames)
slice_action('ft_run',  (3038, 3104), xrects=[(583,663),(713,788),(813,890)])
# claw swipe (r3 — forward clawing, 3f) → Four-Tails light
slice_action('ft_claw', (2962, 3024), xrects=[(92,155),(182,245),(302,365)], strip_lines=True)
# chakra-arm raise → slam (r4 — iconic 4-tails arms, 3f) → Four-Tails heavy & up
slice_action('ft_arm',  (3038, 3104), xrects=[(12,72),(92,155),(182,245)])
# transformation burst (r1 — base→red flash, 3f) → intro
slice_action('ft_morph', (2808, 2864), xrects=[(12,59),(82,130),(153,207)], strip_lines=True)

print('\n--- form sheets written ---')
