import json,pathlib
from PIL import Image,ImageOps
ROOT=pathlib.Path(__file__).resolve().parents[1]
items=json.loads((ROOT/'source-media/inventory.json').read_text(encoding='utf-8'))
selected=[6,7,8,9,10,11,12,13,28,37,42,47,53,55,62,65,70,75,82,83,84,85,86,87,88,89,92,96,97,103,109,119,123,127,128,130,132,133,136,139,146,148,157,160,169,173,180,187,195,202,203,206,208,209,212,214,217,219,226,234,238,241,242,243,244,246,247,248,249,250,251,252,253,255]
out=ROOT/'assets/images';out.mkdir(parents=True,exist_ok=True)
manifest=[]
for i in selected:
    src=next((ROOT/'source-media').glob(f'{i:03}.*'))
    im=ImageOps.exif_transpose(Image.open(src)).convert('RGB')
    im.thumbnail((1800,1400),Image.Resampling.LANCZOS)
    dest=out/f'work-{i:03}.webp';im.save(dest,'WEBP',quality=85,method=6)
    thumb=im.copy();thumb.thumbnail((800,650),Image.Resampling.LANCZOS);thumb.save(out/f'work-{i:03}-sm.webp','WEBP',quality=82,method=6)
    manifest.append({'file':dest.relative_to(ROOT).as_posix(),'source':items[i]['path'],'sourceDisk':'https://disk.yandex.ru/d/BbMGtYuzDdbgSA','width':im.width,'height':im.height,'bytes':dest.stat().st_size})
# Original approved white-background PNG, resized only; no recoloring/redrawing.
logo=Image.open(ROOT/'source-media/005.png');logo.thumbnail((900,300),Image.Resampling.LANCZOS);logo.save(out/'logo.png',optimize=True)
manifest.append({'file':'assets/images/logo.png','source':'/UV_NewLogo_3.png','sourceDisk':'https://disk.yandex.ru/d/BbMGtYuzDdbgSA','width':logo.width,'height':logo.height})
(ROOT/'data').mkdir(exist_ok=True)
(ROOT/'data/media.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Optimized {len(selected)} photographs + original logo; {sum(p.stat().st_size for p in out.iterdir())/1024/1024:.1f} MB')
