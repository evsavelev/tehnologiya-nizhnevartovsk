import concurrent.futures, json, pathlib, requests
from PIL import Image, ImageOps, ImageDraw
ROOT=pathlib.Path(__file__).resolve().parents[1]
items=json.loads((ROOT/'source-media/inventory.json').read_text(encoding='utf-8'))
selected=list(range(3,14))+[14,20,24,28,37,42,47,53,55,62,65,70,75]+list(range(82,90))+[92,96,97,103,109,119,123,127,128,130,132,133,136,139,144,146,148,151,157,160,169,173,180,187,195,202,203,206,208,209,212,214,217,219,226,234,238,241,242,243,244,246,247,248,249,250,251,252,253,255]
def download(i):
    x=items[i]; ext=pathlib.Path(x['name']).suffix.lower()
    p=ROOT/'source-media'/f'{i:03}{ext}'
    if not p.exists():
        r=requests.get(x['file'],timeout=120);r.raise_for_status();p.write_bytes(r.content)
    im=ImageOps.exif_transpose(Image.open(p)).convert('RGB');im.thumbnail((300,200))
    tile=Image.new('RGB',(320,236),'#ededed');tile.paste(im,((320-im.width)//2,0))
    ImageDraw.Draw(tile).text((10,207),f'{i:03} | {p.name}',fill='black')
    return i,tile
def main():
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        tiles=list(pool.map(download,selected))
    for offset in range(0,len(tiles),24):
        subset=tiles[offset:offset+24]
        sheet=Image.new('RGB',(1280,236*((len(subset)+3)//4)),'white')
        for j,(_,tile) in enumerate(subset): sheet.paste(tile,((j%4)*320,(j//4)*236))
        p=ROOT/'source-media'/f'sheet-{offset//24}.jpg';sheet.save(p,quality=85);print(p)
if __name__=='__main__':main()
