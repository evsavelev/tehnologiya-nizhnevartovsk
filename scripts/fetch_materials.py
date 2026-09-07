"""Read-only public Yandex Disk inventory and local, unchanged source copies."""
import concurrent.futures, json, pathlib, requests
ROOT = pathlib.Path(__file__).resolve().parents[1]
KEY = 'https://disk.yandex.ru/d/BbMGtYuzDdbgSA'
API = 'https://cloud-api.yandex.net/v1/disk/public/resources'
def listing(path='/'):
    items=[]
    offset=0
    while True:
        r=requests.get(API, params={'public_key':KEY,'path':path,'limit':100,'offset':offset},timeout=60)
        r.raise_for_status()
        batch=r.json()['_embedded']
        items += batch['items']
        offset+=len(batch['items'])
        if offset>=batch['total']: return items
def main():
    top=listing()
    files=[x for x in top if x['type']=='file']
    pending=[x['path'] for x in top if x['type']=='dir']
    while pending:
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
            groups=list(pool.map(listing,pending))
        pending=[]
        for group in groups:
            files.extend(x for x in group if x['type']=='file')
            pending.extend(x['path'] for x in group if x['type']=='dir')
    (ROOT/'source-media').mkdir(exist_ok=True)
    (ROOT/'source-media/inventory.json').write_text(json.dumps(files,ensure_ascii=False,indent=2),encoding='utf-8')
    for i,x in enumerate(files): print(i,x['path'],x.get('size'))
if __name__=='__main__': main()
