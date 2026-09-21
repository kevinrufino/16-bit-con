import json,subprocess,hashlib
from pathlib import Path
root=Path(__file__).parent
scenes=json.loads((root/'schedule-scenes.json').read_text())
cmd=['ffmpeg','-v','error','-y']
for s in scenes:cmd+=['-framerate','50/9','-i',str(root/s['id']/'frame-%02d.png')]
f=''.join(f'[{i}:v]' for i in range(6))+'xstack=inputs=6:layout=0_0|128_0|256_0|0_128|128_128|256_128,scale=768:512:flags=neighbor,split[a][b];[a]palettegen[p];[b][p]paletteuse=dither=none'
cmd+=['-filter_complex',f,'-frames:v','8','-loop','0',str(root/'schedule-overview.gif')]
subprocess.run(cmd,check=True)
for s in scenes:
 d=root/s['id'];frames=[d/f'frame-{i:02}.png' for i in range(8)]
 assert all(p.exists() for p in frames)
 assert len({hashlib.sha256(p.read_bytes()).hexdigest() for p in frames})>1
 assert frames[0].read_bytes()==(d/'frame-08.png').read_bytes()
 assert (d/'spritesheet.png').exists() and (d/'animation.gif').exists()
 print(s['id'],'verified: 8 frames, motion, matching endpoint, GIF and sprite sheet')
