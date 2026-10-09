"""Kakashi (ANBU) rosterKey `kakashi_anbu` — keying QA + per-band X-run detector.

Source K = anbu_kakashi_sprite_sheet_by_dantewreckmen_999_d93ce0i.png
(1054x2460, opaque green (0,128,0) + noise). Mirrors the project DS/DSi pipeline
(tools/gaara/slice.py): border-flood-fill key the green so interior art + the
white illustration survive, then detect content X-runs inside each labelled Y band.

This is ANALYSIS ONLY — prints detected boxes + writes QA composites. No engine files touched.
"""
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "anbu_kakashi_sprite_sheet_by_dantewreckmen_999_d93ce0i.png"


def border_floodfill_alpha(im, bg=(0, 128, 0), tol=45):
    rgb = im[..., :3].astype(np.int32)
    dist = np.abs(rgb - np.array(bg)).sum(2)
    bgish = dist <= tol
    lbl, _ = ndimage.label(bgish)
    border = set(lbl[0, :]) | set(lbl[-1, :]) | set(lbl[:, 0]) | set(lbl[:, -1])
    border.discard(0)
    remove = np.isin(lbl, list(border))
    out = im.copy()
    out[remove, 3] = 0
    return out


def xruns(keyed, y0, y1, min_w=6, gap=4, athresh=16, colmin=1):
    """Detect horizontal content runs in band [y0,y1). A column counts as 'content'
    if it has >= colmin non-transparent pixels. Runs separated by < gap empty cols merge."""
    band = keyed[y0:y1, :, 3] > athresh
    colcount = band.sum(0)
    cols = colcount >= colmin
    runs = []
    x = 0
    W = cols.shape[0]
    while x < W:
        if cols[x]:
            x0 = x
            while x < W and cols[x]:
                x += 1
            x1 = x
            # merge across small gaps
            while x1 < W:
                nx = x1
                g = 0
                while nx < W and not cols[nx]:
                    nx += 1
                    g += 1
                if g < gap and nx < W:
                    while nx < W and cols[nx]:
                        nx += 1
                    x1 = nx
                else:
                    break
            if x1 - x0 >= min_w:
                runs.append((x0, x1))
        else:
            x += 1
    return runs


BANDS = {
    "stance":    (70, 133),
    "walk":      (193, 260),
    "run":       (322, 382),
    "crouch":    (445, 502),
    "jump":      (562, 640),
    "walljump":  (715, 765),
    "damage":    (836, 889),
    "ycombo":    (962, 1025),
    "yup":       (1101, 1179),
    "yrun":      (1241, 1297),
    "yjump":     (1365, 1423),
    "ycrouch":   (1484, 1530),
    "nk_cast":   (1621, 1698),
    "nk_mid":    (1717, 1814),
    "nk_dogs":   (1825, 1894),
    "nk_bull":   (1910, 1988),
    "rk_charge": (2082, 2156),
    "rk_loop":   (2208, 2273),
    "rk_dash":   (2291, 2349),
    "rk_strike": (2364, 2426),
}


def main():
    im = np.asarray(Image.open(SRC).convert("RGBA")).copy()
    keyed = border_floodfill_alpha(im)
    Image.fromarray(keyed).save("tools/kakashi_anbu/K_keyed.png")

    print("== detected X-runs per band ==")
    for name, (y0, y1) in BANDS.items():
        runs = xruns(keyed, y0, y1)
        print(f"{name:10s} y{y0}-{y1}  n={len(runs):2d}  {runs}")

    # QA composites on black / white / magenta for the whole keyed sheet
    for bg, tag in [((0, 0, 0), "blk"), ((255, 255, 255), "wht"), ((255, 0, 255), "mag")]:
        comp = Image.new("RGBA", (keyed.shape[1], keyed.shape[0]), bg + (255,))
        comp.alpha_composite(Image.fromarray(keyed))
        comp.convert("RGB").save(f"tools/kakashi_anbu/K_qa_{tag}.png")
    print("\nQA composites + K_keyed.png written to tools/kakashi_anbu/.")


if __name__ == "__main__":
    main()
