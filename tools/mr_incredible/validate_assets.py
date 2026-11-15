from pathlib import Path
from PIL import Image
import numpy as np,json,hashlib
R=Path(__file__).resolve().parents[2];D=R/'docs/mr_incredible';ledger=json.loads((D/'source_rects.json').read_text());out={'sourceHashes':{},'pairedSheets':0,'alphaChecks':0,'frameBounds':0,'groups':{}}
for form,source in ledger.items():
 actual=hashlib.sha256((R/source['source']).read_bytes()).hexdigest();assert actual==source['sha256'];out['sourceHashes'][form]=actual
 seg=json.loads((D/'segments.json').read_text())[form];used={tuple(r['group']) for v in source['actions'].values() for r in v};allgroups={(row,i) for row,x in enumerate(seg) for i in range(len(x))};assert allgroups<=used;(out['groups'])[form]=len(allgroups)
 for action,rs in source['actions'].items():
  base=Image.open(R/f'assets/mr_incredible/default/{form}/{action}.png').convert('RGBA');ba=np.array(base)
  assert base.size==(128*len(rs),112)
  for r in rs:
   l,t,rr,b=r['rect'];x,y=r['destination'];assert x>=0 and y>=0 and x+rr-l<=128 and y+b-t<=112;out['frameBounds']+=1
  for skin in (R/'assets/mr_incredible').iterdir():
   if not skin.is_dir():continue
   im=np.array(Image.open(skin/form/f'{action}.png').convert('RGBA'));assert im.shape==ba.shape;assert np.array_equal(im[:,:,3],ba[:,:,3]);out['alphaChecks']+=1;out['pairedSheets']+=1
assert len(list((R/'assets/mr_incredible').iterdir()))==11
(D/'assets_results.json').write_text(json.dumps(out,indent=2));print('PASS',json.dumps(out))
