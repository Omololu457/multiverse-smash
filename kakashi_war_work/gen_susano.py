#!/usr/bin/env python3
# PERFECT SUSANOO (Kakashi, Phase 5) — slice + RECOLOR the mikeel8888 grayscale-on-black P sheet into the
# canon LIGHT-BLUE Susanoo. NEVER keys black: alpha is derived from LUMINANCE (black → transparent). Per the
# brief's formula:  l = lum/255 ; alpha = clamp((l-0.07)/0.75)^0.85 * 0.92 ;
#   colour = lerp((28,78,168) -> (196,236,255)) by clamp((l-0.25)/0.7) ; + soft glow.
# READABILITY on light stages: a thin DARKER-BLUE RIM around the silhouette (so it reads on a white/bright bg)
# + a small alpha floor on the body. Output feet-aligned uniform strips (shuriken icon centred).
import numpy as np
from PIL import Image
from scipy import ndimage

SRC = "perfect_susanoo_kakashi_by_mikeel8888_d8nim62.png"
A = np.asarray(Image.open(SRC).convert("RGB")).astype(np.float32)
LUM = (0.299 * A[..., 0] + 0.587 * A[..., 1] + 0.114 * A[..., 2]) / 255.0
DARK = np.array([28, 78, 168], float)      # deep Susanoo blue
LITE = np.array([196, 236, 255], float)    # pale highlight
RIM = np.array([12, 34, 92], float)        # dark rim for light-stage contrast

def recolor_region(y0, y1, x0, x1):
    l = LUM[y0:y1 + 1, x0:x1 + 1]
    alpha = np.clip((l - 0.07) / 0.75, 0, 1) ** 0.85 * 0.92
    tcol = np.clip((l - 0.25) / 0.7, 0, 1)[..., None]
    rgb = DARK[None, None, :] * (1 - tcol) + LITE[None, None, :] * tcol
    # soft glow: lift alpha slightly where bright (energy aura)
    alpha = np.clip(alpha + np.clip((l - 0.6), 0, 1) * 0.06, 0, 0.96)
    # body alpha floor (so faint-but-real pixels don't vanish on a bright stage)
    body = alpha > 0.12
    alpha = np.where(body, np.maximum(alpha, 0.34), alpha)
    out = np.dstack([rgb.astype("uint8"), (alpha * 255).astype("uint8")])
    # dark RIM: 1px ring just outside the silhouette → contrast on light stages
    mask = alpha > 0.25
    ring = ndimage.binary_dilation(mask, iterations=2) & ~mask
    out[ring, :3] = RIM.astype("uint8"); out[ring, 3] = np.maximum(out[ring, 3], 170)
    return out

def tight(rgba):
    ys, xs = np.where(rgba[..., 3] > 24)
    if len(xs) == 0: return rgba
    return rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1]

def pack(rects, out, feet=True, pad=2):
    cells = []
    for (x0, y0, x1, y1) in rects:
        cells.append(tight(recolor_region(y0, y1, x0, x1)))
    uW = max(c.shape[1] for c in cells) + 2 * pad
    uH = max(c.shape[0] for c in cells) + 2 * pad
    strip = Image.new("RGBA", (uW * len(cells), uH), (0, 0, 0, 0))
    for i, c in enumerate(cells):
        im = Image.fromarray(c, "RGBA")
        px = i * uW + (uW - c.shape[1]) // 2
        py = (uH - c.shape[0] - pad) if feet else (uH - c.shape[0]) // 2
        strip.paste(im, (px, py), im)
    strip.save(out)
    print(f"OK {out}: {len(cells)}f  {{ frames: {len(cells)}, width: {uW}, height: {uH} }}")

# ── frame rects (from psheet.py detection) ──
R1 = [(21,12,254,485),(350,19,549,491),(662,32,868,490),(950,20,1147,487),(1235,33,1424,491),(1500,32,1691,489)]  # walk 6f
R3_STANCE = [(557,1154,1031,1618)]                                    # stance 1f (winged full figure)
R2_PUNCH = [(43,591,514,1056),(590,600,1160,1065)]                    # winged punches 2f
R4_SWORD = [(59,1833,454,2272),(627,1808,1000,2258),(1078,1812,1726,2263),(1777,1712,2304,2315),(2537,1720,3007,2323)]  # sword slashes 5f
R7_THRUST = [(30,3962,501,4403),(603,3979,1074,4421),(1186,4002,1740,4420),(1828,4018,2369,4436),(2455,4034,2995,4450)]  # sword swings/thrust 5f
R6_LUNGE = [(89,3309,673,3658)]                                       # flying lunge 1f
SHURIKEN = [(2644,648,2798,812)]                                      # Kamui Shuriken icon

def main():
    pack(R1,        "kakashi_war_susano_walk.png")
    pack(R3_STANCE, "kakashi_war_susano_stance.png")
    pack(R2_PUNCH,  "kakashi_war_susano_punch.png")
    pack(R4_SWORD,  "kakashi_war_susano_sword.png")
    pack(R7_THRUST, "kakashi_war_susano_thrust.png")
    pack(R6_LUNGE,  "kakashi_war_susano_lunge.png")
    pack(SHURIKEN,  "kakashi_war_susano_shuriken.png", feet=False)

if __name__ == "__main__":
    main()
