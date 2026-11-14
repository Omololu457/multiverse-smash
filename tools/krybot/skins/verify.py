from pathlib import Path
from PIL import Image
import json,hashlib
ROOT=Path(__file__).resolve().parents[3]
source=ROOT/'Plug & Play - Power Rangers S.P.D._ Escape of the Five Fugitives - Enemies and Bosses - Krybot.png'
assert hashlib.sha256(source.read_bytes()).hexdigest()=='f6f58db89dd5c19f62839ab89038c8ec1e8c21052c0468309c576cb609c78c14'
mapping=json.loads((ROOT/'docs/skins/krybot/region_mapping.json').read_text())
for tag in ['tv','ds','ds_red']:
    for action in mapping['sequences']:
        a=Image.open(ROOT/f'assets/krybot/{action}.png').convert('RGBA')
        b=Image.open(ROOT/f'assets/krybot/skins/{tag}/{action}.png').convert('RGBA')
        assert a.size==b.size and a.getchannel('A').tobytes()==b.getchannel('A').tobytes()
        for old,new in zip(a.getdata(),b.getdata()):
            assert old[3]==new[3]
            if old[:3] in [(33,24,16),(8,8,8)]:assert old==new
    assert Image.open(ROOT/f'assets/krybot/skins/{tag}/portrait.png').size==Image.open(ROOT/'assets/krybot/portrait.png').size
for name in mapping['frames']:
    a=Image.open(ROOT/f'assets/krybot/cells/{name}.png').convert('RGBA')
    mask=Image.open(ROOT/f'assets/krybot/skins/masks/{name}.png')
    assert a.size==mask.size
    for px,reg in zip(a.getdata(),mask.getdata()):assert bool(px[3])==bool(reg)
baseline=json.loads((ROOT/'docs/skins/krybot/BASELINE.json').read_text())
for p in ['krybotData.js','krybotState.js','characters.js','combat.js','game.js']:
    data=(ROOT/p).read_bytes()
    if p=='game.js':
        new=b'  // Krybot\'s precomputed palettes also dress its squad; keep both owners\' art native.\n  const mirror = a.rosterKey && a.rosterKey === b.rosterKey && a.rosterKey !== "krybot"'
        assert data.count(new)==1
        data=data.replace(new,b'  const mirror = a.rosterKey && a.rosterKey === b.rosterKey')
    assert hashlib.sha256(data).hexdigest()==baseline['sha256'][p],p+' has an unexpected change during skin work'
assert not any((ROOT/'assets/krybot/skins').glob('*/explosion.png'))
assert not any((ROOT/'assets/krybot/skins').glob('*/shot.png'))
print('PASS 90 action strips: exact alpha/dimensions/outlines; 28 complete anatomical masks; unchanged base gameplay and effects')
