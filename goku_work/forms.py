#!/usr/bin/env python3
"""Phase 2 per-form sheet generator.

Primary method = localized HAIR-REGION recolour, pose-preserving:
  * per inventory frame, build a dark mask (hair + outlines + dark gi),
  * erode 1px so thin outlines drop out and the chunky hair blob survives,
  * take the blob containing the topmost dark pixel (hair crown), dilate back,
  * remap that hair's luminance along the form's colour ramp.
Eyes are nudged to the form tint inside the face box. No head is ever faked;
frames whose hair blob can't be found are logged 'fallback' and left to a plain
ramp recolour of all upper-region dark pixels.

Writes assets/goku_forms/goku_<form>.png (same layout as base) + a contact
sheet. Source image is only READ.
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "assets/source/goku_original.png"
INV = "assets/source/goku_inventory.json"
TEAL = np.array([0, 128, 128])

im = Image.open(SRC).convert("RGBA")
A = np.array(im).astype(int)
RGB = A[:, :, :3]
ALPHA = A[:, :, 3]
H, W, _ = A.shape
inv = json.load(open(INV))

lum_full = (0.3 * RGB[:, :, 0] + 0.59 * RGB[:, :, 1] + 0.11 * RGB[:, :, 2])
sat_full = RGB.max(2) - RGB.min(2)
teal_full = np.abs(RGB - TEAL).sum(2) <= 24
R, G, B = RGB[:, :, 0], RGB[:, :, 1], RGB[:, :, 2]
skin_full = (R > 165) & (G > 110) & (G < 215) & (B > 85) & (B < 195) & (R > B + 10)
# base hair / dark mask (hair + outlines + dark gi + shoes)
dark_full = (~teal_full) & (~skin_full) & (lum_full < 72) & (sat_full < 60)

# --- form ramps: 4 stops dark->light, interpolated by normalised hair luminance ---
RAMPS = {
 "ssj":  [(90, 55, 12), (150, 97, 40), (225, 175, 70), (250, 210, 120)],
 "ssj2": [(120, 92, 42), (200, 160, 85), (245, 220, 140), (255, 246, 205)],
 "ssj3": [(90, 55, 12), (150, 97, 40), (225, 175, 70), (250, 210, 120)],  # = ssj (fallback)
 "god":  [(95, 0, 0), (170, 0, 0), (224, 22, 12), (255, 86, 58)],
 "blue": [(11, 56, 135), (28, 116, 214), (82, 199, 255), (201, 246, 255)],
 "ui":   [(95, 100, 120), (150, 160, 185), (212, 222, 240), (255, 255, 255)],
}
EYE = {"ssj": (70, 200, 150), "ssj2": (70, 210, 160), "ssj3": (70, 200, 150),
       "god": (200, 40, 30), "blue": (40, 150, 255), "ui": (210, 210, 230)}

def ramp_color(ramp, t):
    t = max(0.0, min(1.0, t))
    seg = t * 3.0
    i = min(2, int(seg)); f = seg - i
    c0, c1 = ramp[i], ramp[i + 1]
    return tuple(int(c0[k] + (c1[k] - c0[k]) * f) for k in range(3))

def hair_mask_for_frame(fx, fy, fw, fh):
    """Return a boolean mask (full-sheet sized slice coords) of the hair for one frame,
    plus a 'confident' flag. Works in the frame's local window."""
    y0, y1, x0, x1 = fy, fy + fh, fx, fx + fw
    dloc = dark_full[y0:y1, x0:x1]
    if dloc.sum() < 12:
        return None, False
    er = ndimage.binary_erosion(dloc, iterations=1)
    if er.sum() < 6:
        er = dloc  # tiny sprite: skip erosion
    lab, n = ndimage.label(er, structure=np.ones((3, 3)))
    if n == 0:
        return None, False
    # topmost dark pixel row -> its component is the hair crown
    rows = np.where(er.any(1))[0]
    top = rows[0]
    cols = np.where(er[top])[0]
    crown_lab = lab[top, cols[len(cols) // 2]]
    comp = (lab == crown_lab)
    comp = ndimage.binary_dilation(comp, iterations=2) & dloc
    # confidence: hair should sit in the upper 65% of the frame and be sizeable
    ys = np.where(comp.any(1))[0]
    conf = (len(ys) and ys.mean() < fh * 0.6 and comp.sum() >= 15)
    full = np.zeros((H, W), bool)
    full[y0:y1, x0:x1] = comp
    return full, bool(conf)

def build_form(form):
    ramp = RAMPS[form]
    out = A.copy()
    stats = dict(frames=0, confident=0, fallback=0)
    hair_lo, hair_hi = 0.0, 72.0
    for r in inv["rows"]:
        for f in r["frames"]:
            stats["frames"] += 1
            mask, conf = hair_mask_for_frame(f["x"], f["y"], f["w"], f["h"])
            if mask is None:
                stats["fallback"] += 1
                continue
            if not conf:
                # fallback: recolour all dark pixels in the upper 55% of the frame
                stats["fallback"] += 1
                yy = slice(f["y"], f["y"] + int(f["h"] * 0.55))
                xx = slice(f["x"], f["x"] + f["w"])
                m2 = np.zeros((H, W), bool)
                m2[yy, xx] = dark_full[yy, xx]
                mask = m2
            else:
                stats["confident"] += 1
            idx = np.where(mask)
            L = lum_full[idx]
            t = (L - hair_lo) / (hair_hi - hair_lo)
            for k in range(len(idx[0])):
                out[idx[0][k], idx[1][k], :3] = ramp_color(ramp, float(t[k]))
    return out, stats

def eyes_pass(out, form):
    """Tint the EYE pixels only. Eyes are dark/near-white pixels fully embedded
    in the face skin (skin on both horizontal sides within 3px) in the central
    face band — this excludes the white gi-collar / undershirt highlights that a
    naive 'whiteish in upper half' rule wrongly caught. Conservative: if a frame
    yields a suspiciously large count it is skipped (likely not a clean face)."""
    er, eg, eb = EYE[form]
    cnt = 0
    for r in inv["rows"]:
        for f in r["frames"]:
            y0 = f["y"] + int(f["h"] * 0.16); y1 = f["y"] + int(f["h"] * 0.36)
            x0 = f["x"]; x1 = f["x"] + f["w"]
            if y1 <= y0:
                continue
            sk = skin_full[y0:y1, x0:x1]
            if sk.sum() < 10:
                continue
            sub = out[y0:y1, x0:x1, :3]
            rr, gg, bb = sub[:, :, 0], sub[:, :, 1], sub[:, :, 2]
            lum = 0.3*rr + 0.59*gg + 0.11*bb
            cand = ((lum < 70) | (lum > 210)) & (~sk)
            # require skin immediately to the left AND right (embedded in face)
            skL = np.zeros_like(sk); skL[:, 1:] = sk[:, :-1]
            skR = np.zeros_like(sk); skR[:, :-1] = sk[:, 1:]
            skL2 = np.zeros_like(sk); skL2[:, 2:] = sk[:, :-2]
            skR2 = np.zeros_like(sk); skR2[:, :-2] = sk[:, 2:]
            embedded = cand & (skL | skL2) & (skR | skR2)
            k = int(embedded.sum())
            if k == 0 or k > 8:        # >8 px in the eye band = not a clean face
                continue
            sub[embedded] = [er, eg, eb]
            cnt += k
    return cnt
