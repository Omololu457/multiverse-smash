#!/usr/bin/env python3
# Batch processor for the six_paths_of_pain raw sprite dump (Naruto — Six Paths of Pain,
# the six Rinnegan bodies: Tendo/Chikushodo/Gakido/Ningendo/Jigokudo + the Animal-path summons).
#
# ONE PASS, direct on disk:
#   STEP 1  background removal — every source is a FLAT green chroma key (0,128,0). Key it out,
#           peel the thin anti-alias fringe, and suppress green spill on surviving edge pixels so
#           there is NO halo. Files already transparent would be left untouched (none are here).
#   STEP 2  ROW-ONLY slice — detect horizontal content bands separated by fully-transparent
#           gutters (measured, not assumed) and crop each band to its own file. ONE FILE PER ROW,
#           the whole multi-frame animation of a row stays together. Crop only — no recolor / no
#           resize / no drawn boxes / labels left intact. Rows with no clean gutter are NOT guessed.
#
# Mirrors the row-slice handoff convention already used for Onoki/Mayuri/etc. Source stems already
# carry legible identity+action labels, so output names PRESERVE the stem (pain_sprites_ prefix
# dropped) and only add _row_NN when a single source file splits into multiple bands.
import os, glob, sys
import numpy as np
from PIL import Image

SRC = "six_paths_of_pain"
OUT = "six_paths_of_pain_sliced"
ALPHA = 16          # alpha considered "present"
GAP_MIN = 2         # >= this many fully-transparent rows = a real gutter between animation rows
MIN_BAND_H = 5      # ignore stray sub-bands thinner than this
SPECK = 2           # a row with <= this many content px counts as empty (ignores lone specks)

def key_green(path):
    """Return (rgba_uint8, needed_removal, n_bg_px). Flat-green chroma key -> clean alpha."""
    a = np.array(Image.open(path).convert("RGBA"))
    r = a[...,0].astype(int); g = a[...,1].astype(int); b = a[...,2].astype(int)
    orig_alpha = a[...,3]
    # Detect whether this file even needs keying: real varied transparency already present?
    already_transparent = (orig_alpha.min() < 250) and ((orig_alpha < ALPHA).mean() > 0.02)
    alpha = orig_alpha.copy()
    if already_transparent:
        return a, False, int((alpha < ALPHA).sum())
    # 1) hard green background (exact key + darker/lighter green plateau)
    hard = ((g>=r+30)&(g>=b+30)&(r<=120)&(b<=120)&(g>=55)) | ((r==0)&(g==128)&(b==0))
    alpha[hard] = 0
    # 2) de-halo: peel clearly green-blend fringe pixels that touch transparency (2 passes)
    soft = (g>r+14)&(g>b+14)&(r<170)&(b<170)&(g>=50)
    for _ in range(2):
        trans = alpha==0
        neigh = np.zeros_like(trans)
        neigh[1:,:]  |= trans[:-1,:]; neigh[:-1,:] |= trans[1:,:]
        neigh[:,1:]  |= trans[:,:-1]; neigh[:,:-1] |= trans[:,1:]
        neigh[1:,1:] |= trans[:-1,:-1]; neigh[:-1,:-1]|=trans[1:,1:]
        neigh[1:,:-1]|= trans[:-1,1:]; neigh[:-1,1:] |= trans[1:,:-1]
        cut = soft & neigh & (alpha>0)
        if not cut.any(): break
        alpha[cut] = 0
    # 3) green-spill suppression on surviving edge pixels: clamp green toward max(r,b)
    keep = alpha>0
    trans = alpha==0
    edge = np.zeros_like(trans)
    edge[1:,:]|=trans[:-1,:]; edge[:-1,:]|=trans[1:,:]; edge[:,1:]|=trans[:,:-1]; edge[:,:-1]|=trans[:,1:]
    spill = keep & edge & (g>np.maximum(r,b)+18) & (r<170)&(b<170)
    ng = g.copy(); ng[spill] = (np.maximum(r,b)[spill] + 12).clip(0,255)
    out = a.copy()
    out[...,1] = ng.astype(np.uint8)
    out[...,3] = alpha.astype(np.uint8)
    return out, True, int((alpha==0).sum())

def row_bands(alpha):
    """Vertical content bands separated by transparent gutters (>=GAP_MIN empty rows)."""
    H,W = alpha.shape
    rowcount = (alpha>ALPHA).sum(axis=1)
    nonempty = rowcount > SPECK
    raw=[]; s=-1
    for y in range(H):
        if nonempty[y]:
            if s<0: s=y
        elif s>=0:
            raw.append([s,y-1]); s=-1
    if s>=0: raw.append([s,H-1])
    merged=[]
    for band in raw:
        if merged and band[0]-merged[-1][1]-1 < GAP_MIN:
            merged[-1][1]=band[1]
        else:
            merged.append(band[:])
    return [tuple(b) for b in merged if (b[1]-b[0]+1)>=MIN_BAND_H]

def content_xspan(alpha, y0, y1):
    cols = (alpha[y0:y1+1,:]>ALPHA).any(axis=0)
    xs = np.where(cols)[0]
    return (int(xs[0]), int(xs[-1])) if len(xs) else None

def main():
    os.makedirs(OUT, exist_ok=True)
    files = sorted(glob.glob(os.path.join(SRC,"*.png")))
    n_removed=0; n_already=0; n_rows=0
    manifest=[]; flagged=[]
    for f in files:
        stem = os.path.splitext(os.path.basename(f))[0]
        base = stem[len("pain_sprites_"):] if stem.startswith("pain_sprites_") else stem
        rgba, needed, _ = key_green(f)
        if needed: n_removed+=1
        else: n_already+=1
        im = Image.fromarray(rgba,"RGBA")
        alpha = rgba[...,3]
        bands = row_bands(alpha)
        if not bands:
            flagged.append((os.path.basename(f), "no content after keying"))
            continue
        multi = len(bands)>1
        for i,(y0,y1) in enumerate(bands, start=1):
            xs = content_xspan(alpha, y0, y1)
            if xs is None:
                continue
            x0,x1 = xs
            crop = im.crop((x0, y0, x1+1, y1+1))
            name = f"{base}_row_{i:02d}.png" if multi else f"{base}.png"
            crop.save(os.path.join(OUT, name))
            n_rows+=1
            manifest.append((name, os.path.basename(f), i, len(bands), crop.size[0], crop.size[1]))
    # write manifest (on disk, for reference — report goes to chat)
    with open(os.path.join(OUT,"_manifest.tsv"),"w") as m:
        m.write("output\tsource\tband_index\tbands_in_source\twidth\theight\n")
        for row in manifest:
            m.write("\t".join(str(x) for x in row)+"\n")
    print(f"SOURCE FILES PROCESSED : {len(files)}")
    print(f"  needed bg removal    : {n_removed}")
    print(f"  already transparent  : {n_already}")
    print(f"ROW FILES WRITTEN      : {n_rows}")
    multi_src=[m for m in manifest if m[3]>1]
    srcs_multi=sorted(set(m[1] for m in multi_src))
    print(f"SOURCES THAT SPLIT >1 BAND: {len(srcs_multi)}")
    for s in srcs_multi:
        print(f"    {s}  -> {max(m[2] for m in multi_src if m[1]==s)} rows")
    if flagged:
        print("FLAGGED / SKIPPED:")
        for name,why in flagged: print(f"    {name}: {why}")
    else:
        print("FLAGGED / SKIPPED: none")

if __name__=="__main__":
    main()
