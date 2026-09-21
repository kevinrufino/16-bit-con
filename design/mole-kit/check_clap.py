"""Run with Blender -b 16-bit-con-moles.blend --python check_clap.py."""
import bpy,json
from mathutils import Vector
from pathlib import Path
reports=[]
for r in [o for o in bpy.data.objects if o.type=='ARMATURE']:
 for t in r.animation_data.nla_tracks:t.mute=t.name!='Clap'
 poses=[]
 for frame in range(1,38):
  bpy.context.scene.frame_set(frame);bpy.context.view_layer.update();paws=[]
  for side,sign in [('L',1),('R',-1)]:
   name='arm.'+side
   rest=Vector((sign*.75,-.10,1.10))
   paw=r.pose.bones[name].matrix@r.data.bones[name].matrix_local.inverted()@rest
   assert paw.y<-.85, (r.name,frame,side,'paw behind front of chest',tuple(paw))
   assert 1.3<paw.z<1.7,(r.name,frame,'paw height',tuple(paw))
   paws.append(paw)
  poses.append({'frame':frame,'left':list(paws[0]),'right':list(paws[1]),'gap':(paws[0]-paws[1]).length})
 gap=[p['gap'] for p in poses]
 assert min(gap)<.40 and max(gap)>.85,(r.name,min(gap),max(gap))
 reports.append({'character':r.name,'framesTested':len(poses),'minPawCenterDistance':min(gap),'maxPawCenterDistance':max(gap),'maximumPawY':max(max(p['left'][1],p['right'][1]) for p in poses),'result':'PASS'})
Path(__file__).with_name('clap-validation.json').write_text(json.dumps(reports,indent=2))
print('CLAP_CHECK_PASS',json.dumps(reports))
