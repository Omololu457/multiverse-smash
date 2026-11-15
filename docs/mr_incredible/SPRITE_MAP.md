# Mr. Incredible sprite map

The supplied originals are unchanged. Red Suit is 897 × 1666, keyed only at
RGB(173,214,214). Young is 1590 × 838, independently keyed at RGB(255,0,255).
Red annotation pixels RGB(255,0,0) are excluded; that exact color is not a suit ramp.
White attack arcs, pale suit highlights, skin ramps, emblem and black ink survive.
The Red Suit sheet credits Perseus. In-game attribution is in credits.js.

`source_rects.json` is the exact frame ledger: original filename, SHA-256,
source rectangle [left,top,right,bottom) for every frame, source root and output
placement. `segments.json` indexes row/group pairs in the two annotated inspect PNGs.
No assumption of equal source positions or frame counts is made.

Run `python tools/mr_incredible/segment.py`, then
`python tools/mr_incredible/build.py`. Use the project's Anaconda Python with
Pillow and NumPy; `/usr/bin/python3` does not have Pillow installed here.

Cells are 128 × 112. The root is (64,100); source feet are aligned there without
resampling. The engine uses uniform 1.8 scale for both forms. Horizontal roots
use the lower-body median with a full-rectangle constraint for horizontal hurt
poses. Below-root effect clearance is 12 source pixels. Source rectangles are
never clipped to fit: the builder asserts all four bounds. Young retains its
own silhouette, head, hair and proportions. Gameplay body stays 60 × 100 in
both forms, with the same move collision definitions.

Idle retains the authored red-sheet expression/loop section. Running is a visual
loop only. Every melee attack has one shared-engine hit latch, irrespective of
sprite loops, outlines, duplicate strikes or attached arcs. Detached white
bursts are separate `miBurst` / `miArc` strips; they never have damage boxes.
Shadows and silhouettes are retained as cosmetic strips. The Young shadow is
masked from the original foot-shadow pixels, not a second body image.

Interpretation notes: these sheets contain no move names. Guard is interpreted
from bracing poses; low is a low-targeted punch, not a kick. Upward arm sweeps
serve the launcher; tumbling strips serve Wrecking Ball alternatives. The white
outline versions appear to be powered impact variants; they are cosmetic and
never imply armor. `miDefeatAir` includes horizontal knockback imagery whose
original game-specific intent is uncertain. No claim is made that these are
canonical Incredibles move names or animation semantics.

See FORM_MAPPING.md for the action correspondence and all frame counts.


Source hashes:

- veteran: `b9237b53b1b4a1cf5f63d0fa4d93f3a34dabfc1bab130db9087f0765832f246c`
- prime: `44633c6f05ccab13ce45a82a813fb6c0d467b74e57f32d0465018e12c8e330dd`
