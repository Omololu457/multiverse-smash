"""ENOCH — per-frame body-region masks over Frozone's supplied GBA sheet (READ-ONLY; nothing of Frozone is written).

Every source pixel already has an exact-colour ROLE (tools/frozone/build_skins.roles: suit main / shade / outline, white
costume panel vs ice, panel shades, disc greys, skin, black). Regions refine those roles SPATIALLY, per frame:
  axis    H = skin centroid (face); F = mean of the 6 % of body pixels farthest from H (feet). T(p) = projection of p on
          H→F (0 = face, 1 = feet) — works for upright, crouched, surfing and lying frames alike.
  suit    4-connected main∪shade pieces (the sprite's 1-px outlines split it into limbs): wholly above WAIST → SHIRT,
          wholly below → JEANS, spanning → split per pixel at the waist plane.
  white   4-connected panel pieces (white + panel shades). "Touch" = within 2 px (through the 1-px outline).
          above the face (T < skin T) and not touching the suit → HEAD white: pieces within 1 px of the lens = STRAP
          (visor frame), the rest = CAP (crown → hair). The largest piece touching the shirt = YOKE (chest panel).
          Other pieces touching the shirt but not the jeans = GLOVE (elbow-length): the far 4 px (geodesic from the
          sleeve contact) = HAND, the rest = CUFF (becomes sleeve). Pieces touching the jeans: the far 4 px from the
          jeans contact = SNEAKER, the rest = BOOT TOP (becomes jeans). Remaining white = TRIM (→ shirt or jeans by T).
  black   pieces touching skin: mean T above the face's → LENS, below → BEARD. Other black = outline-black (kept).
  hit-flash silhouettes (react 0, down 0: all white, no skin) carry no regions — they stay a flash.
Pure numpy; deterministic; no resampling."""
import sys
from pathlib import Path
import numpy as np
from scipy import ndimage
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/frozone'))
import extract as X          # read-only: bands, frame grouping, cut / anchors
import build_skins as BS     # read-only: exact-colour roles

N4 = np.array([[0, 1, 0], [1, 1, 1], [0, 1, 0]], bool)
N8 = np.ones((3, 3), bool)
SKIN = [(64, 56, 40), (96, 80, 56), (128, 104, 80)]
WAIST, TIP, FEET, HEAD_R = 0.50, 4, 0.78, 11
REGIONS = ['hair', 'strap', 'lens', 'beard', 'skin', 'hand', 'shirt', 'cuff', 'yoke', 'trimShirt', 'jeans', 'bootTop', 'trimJeans', 'sneaker']

def near(a, it=2): return ndimage.binary_dilation(a, structure=N8, iterations=it) if a.any() else a

def geodesic(region, seed):
  """BFS distance (8-conn) inside `region` from the `seed` pixels; -1 = unreachable."""
  dist = np.full(region.shape, -1, int); cur = seed & region; k = 0
  while cur.any():
    dist[cur] = k; k += 1
    nxt = ndimage.binary_dilation(cur, structure=N8) & region & (dist < 0); cur = nxt
  return dist

def tip_split(c, contact):
  """pixels of piece c farther than (max − TIP) from where it meets `contact` → tip; returns (tip, rest)."""
  seed = c & near(contact, 2)
  if not seed.any(): seed = c & near(contact, 3)
  if not seed.any(): return np.zeros_like(c), c
  d = geodesic(c, seed); m = d.max()
  if m < 0: return np.zeros_like(c), c
  tip = c & (d > m - TIP); rest = c & ~tip
  unreached = c & (d < 0); tip |= unreached; rest &= ~unreached
  return tip, rest

def is_extremity(tip, shirt, YY, XX):
  """True when (almost) no shirt pixel near the tip lies farther from the torso centre than the tip does."""
  if not shirt.any(): return True
  cy, cx = YY[shirt].mean(), XX[shirt].mean()
  ty, tx = YY[tip].mean(), XX[tip].mean(); dt = np.hypot(ty - cy, tx - cx)
  if dt < 6: return False
  ds = np.hypot(YY - cy, XX - cx); dn = np.hypot(YY - ty, XX - tx)
  return int((shirt & (dn <= 6) & (ds > dt + 1)).sum()) <= 3

def frame_regions(im, role, lab, f):
  y0, y1, x0, x1 = f['y0'], f['y1'], f['x0'], f['x1']
  sub = im[y0:y1, x0:x1]; r = role[y0:y1, x0:x1]
  m = np.isin(lab[y0:y1, x0:x1], f['ids'])
  eq = lambda c: np.all(sub == c, axis=2) & m
  out = np.full(r.shape, '', dtype=object)
  skin = np.zeros(r.shape, bool)
  for c in SKIN: skin |= eq(c)
  black = eq((0, 0, 0))
  suit = m & ((r == 'main') | (r == 'shade'))
  white = m & ((r == 'panel') | (r == 'pshade') | (r == 'pshade2'))
  if not skin.any(): return out, None          # hit-flash silhouette
  ids = lab[y0:y1, x0:x1]; big = max(f['ids'], key=lambda i: int((ids == i).sum()))
  burst = np.zeros(r.shape, bool)
  for (bx0, by0, bx1, by1) in BS.ICE_RECTS:
    ix0, iy0, ix1, iy1 = max(bx0, x0), max(by0, y0), min(bx1, x1), min(by1, y1)
    if ix0 < ix1 and iy0 < iy1: burst[iy0 - y0:iy1 - y0, ix0 - x0:ix1 - x0] = True
  icew = m & (r == "ice") & (ids == big) & ~burst & near(suit, 4)
  white = white | icew
  ys, xs = np.nonzero(skin); H = np.array([ys.mean(), xs.mean()])
  by, bx = np.nonzero(suit | white)
  d = (by - H[0]) ** 2 + (bx - H[1]) ** 2
  k = max(1, int(len(d) * 0.06)); idx = np.argsort(d)[-k:]
  F = np.array([by[idx].mean(), bx[idx].mean()])
  v = F - H; L2 = float(v @ v) or 1.0
  YY, XX = np.mgrid[0:r.shape[0], 0:r.shape[1]]
  T = ((YY - H[0]) * v[0] + (XX - H[1]) * v[1]) / L2
  # ── suit: shirt / jeans
  lab4, n = ndimage.label(suit, structure=N4)
  shirt = np.zeros(r.shape, bool); jeans = np.zeros(r.shape, bool)
  for i in range(1, n + 1):
    c = lab4 == i; t = T[c]
    if t.max() <= WAIST: shirt |= c
    elif t.min() >= WAIST: jeans |= c
    else: shirt |= c & (T < WAIST); jeans |= c & (T >= WAIST)
  # ── head white (per PIXEL: the crown can be one connected piece with the chest panel in turned frames):
  #    white above the face line (T < skin T), within HEAD_R px of the face centre, not within 2 px of the suit
  tskin = T[skin].mean()
  D2 = (YY - H[0]) ** 2 + (XX - H[1]) ** 2
  headw = white & (T < tskin) & (D2 <= HEAD_R ** 2) & ~near(suit, 2)
  lens = np.zeros(r.shape, bool); beard = np.zeros(r.shape, bool)
  lb, nb = ndimage.label(black, structure=N8)
  for i in range(1, nb + 1):
    c = lb == i
    if (c & near(skin, 2)).any(): (lens if T[c].mean() < tskin else beard)[...] |= c
    elif (c & near(headw, 1)).any() and T[c].mean() < tskin: lens |= c   # lying frames: the lens sits 3+ px from skin
  lens1 = near(lens, 1)
  strap = headw & lens1; hair = headw & ~lens1
  # ── other white pieces
  lw, nw = ndimage.label(white & ~headw, structure=N4)
  pieces = [lw == i for i in range(1, nw + 1)]
  ns, nj = near(shirt), near(jeans)
  touching_shirt = [c for c in pieces if (c & ns).any() and T[c].mean() < WAIST]
  yoke = max(touching_shirt, key=lambda c: c.sum()) if touching_shirt else np.zeros(r.shape, bool)
  hand = np.zeros(r.shape, bool); cuff = np.zeros(r.shape, bool); sneaker = np.zeros(r.shape, bool); boot = np.zeros(r.shape, bool)
  trimS = np.zeros(r.shape, bool); trimJ = np.zeros(r.shape, bool)
  for c in pieces:
    if c is yoke: continue
    ts, tj, tm = (c & ns).any(), (c & nj).any(), T[c].mean()
    if tm > FEET and tj:                 # lower-leg boot: the far 4 px = sneaker, the rest = jeans over the boot top
      tip, body = tip_split(c, jeans); sneaker |= tip; boot |= body
    elif ts:                             # elbow glove: the far 4 px = bare hand, the rest = sleeve (cuff)
      tip, body = tip_split(c, shirt)
      if tip.any() and is_extremity(tip, shirt, YY, XX): hand |= tip; cuff |= body
      else: cuff |= c                    # a highlight stripe along the sleeve, not a hand

    elif tj:
      tip, body = tip_split(c, jeans); sneaker |= tip; boot |= body
    elif tm < WAIST: trimS |= c
    else: trimJ |= c
  for name, a in [('hair', hair), ('strap', strap), ('lens', lens), ('beard', beard), ('skin', skin), ('hand', hand),
                  ('shirt', shirt), ('cuff', cuff), ('yoke', yoke), ('trimShirt', trimS), ('jeans', jeans),
                  ('bootTop', boot), ('trimJeans', trimJ), ('sneaker', sneaker)]:
    out[a & (out == '')] = name
  return out, (H, F)
