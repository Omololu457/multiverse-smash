#!/usr/bin/env python3
"""MSV1-SUKUNA — Ten Shadows: the Chimera Shadow Garden floor WITHOUT Megumi's body.

Every shikigami strip Sukuna summons is drawn straight from Megumi's existing art (assets/megumi_fushiguro/summons/*,
megumiSprites.js MEGUMI_SUMMON_ANIM) — nothing copied. The ONE strip that needs work is the domain floor
(assets/megumi_fushiguro/ultDomain.png, 15 cells × 328×53): Megumi crouches in the centre of every cell. This removes
his pixels — nothing is drawn or invented:
  * his column (x 146..186 of each cell) above the floor band (y < 38): every pixel removed (body + outline)
  * his column inside the floor band (y >= 38): only the near-black shadow pixels kept (his feet / shoes removed),
    and any leftover small speck (< 120 px) lying wholly inside his column ± 14 px (shoe outlines) removed
Output: assets/sukuna_shinjuku/ten_shadows/domainFloor.png (same 15 × 328×53 layout). Deterministic, re-runnable.
  python3 tools/sukunashinjuku/shadows_import.py
"""
import os
import numpy as np
from scipy import ndimage as nd
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'assets/megumi_fushiguro/ultDomain.png')
OUT = os.path.join(ROOT, 'assets/sukuna_shinjuku/ten_shadows/domainFloor.png')
N, X0, X1, BAND, DARK = 15, 146, 187, 38, 14


def main():
    a = np.array(Image.open(SRC).convert('RGBA'))
    w = a.shape[1] // N
    for i in range(N):
        c = a[:, i * w:(i + 1) * w]
        col = c[:, X0:X1]
        col[:BAND] = 0
        bright = col[BAND:, :, :3].max(-1) > DARK
        col[BAND:][bright] = 0
        lab, n = nd.label(c[..., 3] > 0, np.ones((3, 3)))   # leftover shoe outlines: specks wholly inside his column
        for j, sl in enumerate(nd.find_objects(lab)):
            if sl is not None and sl[1].start >= X0 - 14 and sl[1].stop <= X1 + 14 and (lab[sl] == j + 1).sum() < 120: c[lab == j + 1] = 0
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    Image.fromarray(a).save(OUT, optimize=True)
    print('  domainFloor', N, 'cells', w, 'x', a.shape[0])


if __name__ == '__main__':
    main()
