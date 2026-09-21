import base64, json, urllib.request, urllib.error
from pathlib import Path
ROOT=Path(__file__).parent
KEY=next(l.split('=',1)[1].strip().strip('\"\'') for l in Path('/Users/kevinrufino/.config/pixellab/credentials.env').read_text().splitlines() if l.startswith('PIXELLAB_API_KEY='))
def request(path,payload=None):
    req=urllib.request.Request('https://api.pixellab.ai/v2/'+path,data=json.dumps(payload).encode() if payload is not None else None,headers={'Authorization':'Bearer '+KEY,'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=240) as r: return json.load(r)
    except urllib.error.HTTPError as e:
        raise RuntimeError('HTTP '+str(e.code)+': '+e.read().decode()[:1000])
def image(path): return {'base64':base64.b64encode(path.read_bytes()).decode()}
def save_image(data,path):
    encoded=data['base64']; path.write_bytes(base64.b64decode(encoded.split(',',1)[-1]))
if __name__=='__main__':
    import sys
    mode=sys.argv[1]
    if mode=='unzoom':
        balance=request('balance'); assert balance['credits']['usd']==0 and balance['subscription']['status']=='trial' and balance['subscription']['generations']>=10
        result=request('unzoom',{'image':image(ROOT/'concept.png'),'quantize':32})
        save_image(result['image'],ROOT/'first-frame.png')
        print(json.dumps({k:v for k,v in result.items() if k!='image'}))
    elif mode=='animate':
        balance=request('balance'); assert balance['credits']['usd']==0 and balance['subscription']['status']=='trial' and balance['subscription']['generations']>=8
        payload={'first_frame':image(ROOT/'input-128.png'),'last_frame':image(ROOT/'input-128.png'),'frame_count':8,'seed':42,'no_background':False,'action':'Seamless cozy idle loop. Fixed camera and completely stationary bakery background. Friendly brown mole cradles cream coffee mug, very subtle gentle breathing and tiny content head bob. Keep both paws gripping mug, cyan goggles, pink nose, silhouette and mug shape consistent. Only coffee steam curls drift slowly upward. Return to identical resting pose. Crisp pixel art, stable palette. No camera movement, no zoom, no new objects.'}
        result=request('animate-with-text-v3',payload)
        (ROOT/'job.json').write_text(json.dumps(result,indent=2)); print(result)
    elif mode=='poll':
        job=json.loads((ROOT/'job.json').read_text())
        result=request('background-jobs/'+job['background_job_id'])
        (ROOT/'result.json').write_text(json.dumps(result))
        print('Status:',result.get('status'))
        if result.get('status')=='completed':
            frames=result['last_response']['images']
            for i,f in enumerate(frames): save_image(f,ROOT/f'frame-{i:02}.png')
            print('Frames saved:',len(frames)); print('Balance:',request('balance'))
        elif result.get('status')=='failed': print(str(result)[:1500])
