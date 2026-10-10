#!/usr/bin/env python3
"""Madara WAR upgrade — slice Susanoo/FX/summon art from P (pepino78).
SOURCE MATCH = NO, so we take ONLY P's Susanoo/FX/summon art, never body/locomotion.
Navy (0,64,128) background is removed by BORDER FLOOD-FILL (tight tolerance) so interior
navy-ish shading is preserved. Cells auto-detected by empty-column gaps within a band."""
import sys, collections
from PIL import Image
import numpy as np

P_PATH = "uchiha_madara_jus_2_0_by_pepino78_dao2k4z.png"
NAVY = (0, 64, 128)
TOL = 40            # tight tolerance around navy

def load_keyed():
    im = Image.open(P_PATH).convert("RGBA")
    a = np.asarray(im).copy()
    h, w = a.shape[:2]
    rgb = a[..., :3].astype(np.int32)
    navy = np.array(NAVY, dtype=np.int32)
    near = (np.abs(rgb - navy).sum(axis=2) <= TOL)   # manhattan dist to navy
    # BFS flood-fill from all border pixels that are near-navy → mark transparent
    visited = np.zeros((h, w), dtype=bool)
    dq = collections.deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not visited[y, x]:
                visited[y, x] = True; dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not visited[y, x]:
                visited[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            ny, nx = y+dy, x+dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and near[ny, nx]:
                visited[ny, nx] = True; dq.append((ny, nx))
    a[visited, 3] = 0
    return a

def cells_in_band(a, y0, y1, x0=0, x1=None, min_gap=3, min_w=4):
    """Return list of (cx0,cx1) column spans of opaque content in [y0:y1]."""
    if x1 is None: x1 = a.shape[1]
    sub = a[y0:y1, x0:x1, 3] > 8
    colmass = sub.sum(axis=0)
    spans = []
    in_run = False; start = 0; gap = 0
    for i, m in enumerate(colmass):
        if m > 0:
            if not in_run: in_run = True; start = i
            gap = 0
        else:
            if in_run:
                gap += 1
                if gap >= min_gap:
                    spans.append((x0+start, x0+i-gap+1)); in_run = False
    if in_run: spans.append((x0+start, x0+len(colmass)-gap))
    return [(s,e) for s,e in spans if e-s >= min_w]

def crop_cell(a, y0, y1, cx0, cx1, pad=2):
    """Tight-crop a single cell (trim empty rows), return RGBA Image."""
    sub = a[y0:y1, cx0:cx1]
    ys = np.where((sub[..., 3] > 8).any(axis=1))[0]
    if len(ys) == 0: return None
    ty0, ty1 = ys.min(), ys.max()+1
    cell = sub[ty0:ty1]
    out = np.zeros((cell.shape[0]+2*pad, cell.shape[1]+2*pad, 4), dtype=np.uint8)
    out[pad:pad+cell.shape[0], pad:pad+cell.shape[1]] = cell
    return Image.fromarray(out, "RGBA")

if __name__ == "__main__":
    a = load_keyed()
    Image.fromarray(a, "RGBA").save("madara_war_work/P_keyed.png")
    print("keyed P saved. shape", a.shape)
