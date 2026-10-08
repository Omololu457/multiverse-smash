#!/usr/bin/env python3
"""Border flood-fill keyer for the RBM-Kyuubi "Sasuke (Sensei)" sheet (navy bg 0,64,128 + noise).
Only navy components TOUCHING the sheet edge go transparent → the Hebi's blue-gray scales + dark
cloak edges (interior, near-navy) survive with NO holes/halos."""
import numpy as np, sys
from PIL import Image
from scipy import ndimage
SRC="sasuke_sensei_nzc_v2_end_by_rbm_kyuubi_ddce19j.png"
BG=np.array([0,64,128]); TOL=40
def key():
    rgb=np.asarray(Image.open(SRC).convert("RGB")).astype(int)
    navy=np.sqrt(((rgb-BG)**2).sum(2))<=TOL
    lbl,_=ndimage.label(navy)
    border=set(np.unique(np.concatenate([lbl[0,:],lbl[-1,:],lbl[:,0],lbl[:,-1]]))); border.discard(0)
    alpha=np.where(np.isin(lbl,list(border)),0,255).astype(np.uint8)
    rgba=np.dstack([rgb.astype(np.uint8),alpha])
    return rgba
if __name__=="__main__":
    rgba=key(); Image.fromarray(rgba,"RGBA").save("tools/sasuke_sensei/S_keyed.png")
    a=rgba[:,:,3]
    print(f"keyed {rgba.shape[1]}x{rgba.shape[0]}  opaque {(a>0).mean()*100:.1f}%")
    # residual near-navy kept (halo risk)
    rgb=rgba[:,:,:3].astype(int); near=(np.sqrt(((rgb-BG)**2).sum(2))<=25)&(a>0)
    print(f"residual near-navy kept: {int(near.sum())}")
