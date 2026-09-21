import sys,json,shutil,subprocess,time,urllib.error
from pathlib import Path
ROOT=Path(__file__).parent
sys.path.insert(0,str(ROOT/'mole-coffee'))
from generate import request,image,save_image
scenes=json.loads((ROOT/'schedule-scenes.json').read_text())
def budget(minimum):
 b=request('balance')
 assert b['credits']['usd']==0 and b['subscription']['status']=='trial' and b['subscription']['generations']>=minimum, 'Free trial guard stopped generation'
 return b
print('Starting balance',budget(13),flush=True)
for s in scenes:
 d=ROOT/s['id'];d.mkdir(exist_ok=True)
 shutil.copy2(s['source'],d/'concept.png')
 (d/'prompts.json').write_text(json.dumps(s,indent=2))
 if not (d/'input-128.png').exists():
  budget(3)
  r=request('unzoom',{'image':image(d/'concept.png'),'quantize':32})
  save_image(r['image'],d/'first-frame.png')
  subprocess.run(['ffmpeg','-v','error','-y','-i',str(d/'first-frame.png'),'-vf','scale=128:128:flags=neighbor',str(d/'input-128.png')],check=True)
  print(s['id'],'prepared',r.get('usage'),flush=True)
# Only one live job at a time to respect trial concurrency and avoid retries charging twice.
for s in scenes:
 d=ROOT/s['id']
 if (d/'animation.json').exists():continue
 if not (d/'job.json').exists():
  budget(3)
  action='Seamless subtle 8-frame pixel-art loop. '+s['motion']+' Fixed camera, no zoom or pan. Preserve shapes and palette, no new objects. Return exactly to the initial resting pose.'
  payload={'first_frame':image(d/'input-128.png'),'last_frame':image(d/'input-128.png'),'frame_count':8,'seed':42,'no_background':False,'action':action}
  r=request('animate-with-text-v3',payload)
  (d/'job.json').write_text(json.dumps(r,indent=2))
  (d/'motion.txt').write_text(action)
  print(s['id'],'submitted',r['background_job_id'],flush=True)
 job=json.loads((d/'job.json').read_text())
 for attempt in range(100):
  r=request('background-jobs/'+job['background_job_id'])
  if r['status']=='completed':break
  if r['status']=='failed':raise RuntimeError(s['id']+' failed: '+str(r.get('last_response'))[:500])
  time.sleep(5)
 else:raise RuntimeError('Timed out waiting for '+s['id'])
 (d/'result.json').write_text(json.dumps(r))
 frames=r['last_response']['images']
 for i,f in enumerate(frames):save_image(f,d/f'frame-{i:02}.png')
 subprocess.run(['ffmpeg','-v','error','-y','-framerate','50/9','-i',str(d/'frame-%02d.png'),'-frames:v','8','-vf','scale=512:512:flags=neighbor,split[a][b];[a]palettegen[p];[b][p]paletteuse=dither=none','-loop','0',str(d/'animation.gif')],check=True)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(d/'frame-%02d.png'),'-vf','tile=8x1','-frames:v','1',str(d/'spritesheet.png')],check=True)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(d/'frame-%02d.png'),'-vf','tile=3x3','-frames:v','1',str(d/'contact-sheet.png')],check=True)
 (d/'animation.json').write_text(json.dumps({'name':s['id'],'frameWidth':128,'frameHeight':128,'frameCount':8,'frameDurationMs':180,'loop':True,'spriteSheet':'spritesheet.png','poster':'frame-00.png'},indent=2))
 print(s['id'],'COMPLETE',request('balance'),flush=True)
final=request('balance');(ROOT/'schedule-generation-balance.json').write_text(json.dumps(final,indent=2));print('ALL DONE',final,flush=True)
