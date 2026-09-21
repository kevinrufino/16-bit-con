"""Rebuild: Blender --background --python design/mole-kit/build_moles.py"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'public/mole-kit'; OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
M={}
def mat(name,color):
 m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*color,1); p.inputs['Roughness'].default_value=.86
 M[name]=m; return m
for n,c in {'fur':(.48,.19,.055),'paw':(.95,.49,.12),'muzzle':(1,.57,.16),'nose':(.96,.055,.15),'cyan':(.015,.72,.88),'lens':(.009,.027,.045),'glint':(.19,.43,.57),'cream':(.96,.89,.65),'green':(.015,.36,.23),'white':(.92,.95,.96),'denim':(.21,.40,.58),'purple':(.39,.14,.60),'red':(.77,.07,.12),'dark':(.075,.038,.023),'gold':(1,.68,.045)}.items():mat(n,c)
# Sprite palette is specified in sRGB; Blender/glTF material factors are linear.
def linear_hex(value):
 rgb=[int(value[i:i+2],16)/255 for i in (0,2,4)]
 return tuple(c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4 for c in rgb)
for name,value in {'fur':'B56522','paw':'FFA437','muzzle':'FFA437','nose':'FF364D','cyan':'00CAE9','lens':'030C10','glint':'146481','dark':'231208','green':'0D8564','denim':'709AB7','cream':'F5E5BC','gold':'FFBC0C'}.items():
 color=(*linear_hex(value),1);M[name].diffuse_color=color;M[name].node_tree.nodes.get('Principled BSDF').inputs['Base Color'].default_value=color
eyewear_styles=['goggles','square','round','visor','bare']
variants=['classic','propeller','superfan','crew','gamer','artist']
rig=None; objects=[]
def finish(o,name,material,bone):
 o.name=name; o.data.materials.append(M[material]); bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bone:
  vg=o.vertex_groups.new(name=bone); vg.add(list(range(len(o.data.vertices))),1,'REPLACE')
  mod=o.modifiers.new('Shared skeleton','ARMATURE'); mod.object=rig; o.parent=rig
 objects.append(o);return o
def ell(name,loc,scale,material,bone='body'):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,location=loc);o=bpy.context.object;o.scale=scale
 for polygon in o.data.polygons:polygon.use_smooth=True
 return finish(o,name,material,bone)
def box(name,loc,scale,material,bone='head',bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale
 if bevel:
  bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);m=o.modifiers.new('Soft corners','BEVEL');m.width=bevel;m.segments=1;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=m.name)
 return finish(o,name,material,bone)
def bar(name,a,b,width,material,bone='body'):
 o=box(name,(Vector(a)+Vector(b))/2,(width,width,(Vector(b)-Vector(a)).length),material,bone)
 o.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return o
# A single continuous profile replaces the stacked head/body spheres.
BODY_PROFILE=[(.16,.12,.16,-.16),(.25,.30,.32,-.22),(.42,.47,.52,-.22),(.67,.60,.64,-.23),(.95,.63,.69,-.25),(1.22,.61,.64,-.22),(1.48,.55,.58,-.17),(1.72,.49,.51,-.09),(1.98,.47,.445,-.015),(2.23,.48,.40,.035),(2.43,.45,.37,.055),(2.59,.35,.28,.065),(2.70,.19,.16,.065),(2.745,.025,.025,.065)]
def profile_at(z):
 for a,b in zip(BODY_PROFILE,BODY_PROFILE[1:]):
  if a[0]<=z<=b[0]:
   t=(z-a[0])/(b[0]-a[0]);return tuple(a[i]+(b[i]-a[i])*t for i in range(1,4))
 return BODY_PROFILE[-1][1:]
def loft(name,rings,material,blend_head=False):
 n=32;verts=[];faces=[]
 for z,rx,ry,cy in rings:
  for j in range(n):
   angle=math.tau*j/n;verts.append((rx*math.cos(angle),cy+ry*math.sin(angle),z))
 for k in range(len(rings)-1):
  for j in range(n):faces.append((k*n+j,k*n+(j+1)%n,(k+1)*n+(j+1)%n,(k+1)*n+j))
 faces += [tuple(reversed(range(n))),tuple((len(rings)-1)*n+j for j in range(n))]
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update()
 for polygon in mesh.polygons:polygon.use_smooth=True
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 finish(o,name,material,'body')
 if blend_head:
  head=o.vertex_groups.new(name='head');body=o.vertex_groups['body']
  for i,vertex in enumerate(mesh.vertices):
   t=max(0,min(1,(vertex.co.z-1.70)/.49));t=t*t*(3-2*t)
   if t:head.add([i],t,'REPLACE');body.add([i],1-t,'REPLACE')
 return o
def garment(name,low,high,material,padding=.024):
 zs=[low]+[r[0] for r in BODY_PROFILE if low<r[0]<high]+[high]
 rings=[]
 for z in zs:
  rx,ry,cy=profile_at(z);rings.append((z,rx+padding,ry+padding,cy))
 return loft(name,rings,material)
def snout():
 # Broad rear cheek tapering into a flat-ended projecting snout, rather than a ball.
 verts=[];faces=[]
 for y,width,bottom,top in [(-.43,.28,1.80,2.13),(-.65,.29,1.78,2.13),(-.83,.25,1.81,2.12),(-.91,.19,1.85,2.105)]:
  for x,z in [(-width+.055,bottom),(width-.055,bottom),(width,bottom+.045),(width,top-.035),(width-.035,top),(-width+.035,top),(-width,top-.035),(-width,bottom+.045)]:verts.append((x,y,z))
 for k in range(3):
  for j in range(8):faces.append((k*8+j,k*8+(j+1)%8,(k+1)*8+(j+1)%8,(k+1)*8+j))
 faces += [tuple(reversed(range(8))),tuple(24+j for j in range(8))]
 mesh=bpy.data.meshes.new('Sprite snout');mesh.from_pydata(verts,[],faces);mesh.update()
 import bmesh
 bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
 o=bpy.data.objects.new('Continuous tapered muzzle',mesh);bpy.context.collection.objects.link(o);bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
 return finish(o,'Continuous tapered muzzle','muzzle','head')
bones={'root':((0,0,0),(0,0,.35),None),'body':((0,0,.95),(0,0,1.7),'root'),'head':((0,0,1.9),(0,0,2.6),'body'),'arm.L':((.55,0,1.65),(.82,0,1.12),'body'),'arm.R':((-.55,0,1.65),(-.82,0,1.12),'body'),'leg.L':((.30,0,.55),(.30,0,.17),'root'),'leg.R':((-.30,0,.55),(-.30,0,.17),'root'),'prop':((0,0,2.98),(0,0,3.2),'head')}
def make_rig(name):
 global rig,objects
 objects=[];data=bpy.data.armatures.new(name+' skeleton');rig=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True)
 bpy.ops.object.mode_set(mode='EDIT')
 for n,(h,t,p) in bones.items():
  b=data.edit_bones.new(n);b.head=h;b.tail=t
  if p:b.parent=data.edit_bones[p]
 bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True;rig.animation_data_create()
 for b in rig.pose.bones:b.rotation_mode='XYZ'
 rig['forward']='-Y';rig['units']='meters';rig['style']='16 Bit Con / continuous sprite-profile mole'
 return rig
def build(v):
 col=bpy.data.collections.new('Character / '+v);scene.collection.children.link(col);bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection.children[col.name]
 make_rig('Mole_'+v)
 loft('Continuous sprite body',BODY_PROFILE,'fur',True)
 snout()
 box('Pixel nose',(0,-.935,2.115),(.245,.14,.16),'nose','head',.008)
 box('Smile',(0,-.923,1.885),(.21,.012,.025),'fur','head')
 for side in [-1,1]:
  letter='L' if side==1 else 'R'
  ell('Short arm.'+letter,(side*.59,.015,1.36),(.17,.185,.365),'fur','arm.'+letter)
  ell('Mitten.'+letter,(side*.75,-.10,1.10),(.19,.16,.20),'paw','arm.'+letter)
  box('Thumb.'+letter,(side*.60,-.13,1.17),(.115,.18,.13),'paw','arm.'+letter,.025)
  ell('Tucked leg.'+letter,(side*.23,.04,.22),(.15,.17,.16),'fur','leg.'+letter)
  ell('Small foot.'+letter,(side*.23,-.045,.10),(.15,.205,.095),'paw','leg.'+letter)
  for j in [-1,1]:box('Tiny toe.'+letter,(side*.23+j*.045,-.215,.085),(.068,.055,.033),'cream','leg.'+letter,.006)
 # Real eyes sit behind interchangeable eyewear.
 for side in [-1,1]:ell('Eye', (side*.24,-.415,2.255),(.085,.05,.11),'lens','head')
 if v=='propeller':
  ell('Cap',(0,0,2.65),(.53,.46,.19),'red','head');box('Cap brim',(0,-.44,2.61),(.85,.38,.06),'white')
  for s in [-1,1]:bar('White cap panel',(s*.25,-.37,2.67),(s*.16,-.14,2.80),.11,'white','head')
  bar('Propeller spindle',(0,0,2.77),(0,0,3.04),.07,'gold','head');box('Propeller',(0,0,3.04),(1.20,.14,.045),'gold','prop');ell('Hub',(0,0,3.05),(.085,.085,.07),'dark','prop')
 if v=='superfan':
  garment('White shirt',.84,1.87,'white')
  garment('Jeans',.27,.89,'denim',.035)
  for s in [-1,1]:ell('Denim cuff',(s*.29,0,.24),(.20,.22,.11),'denim','leg.'+('L' if s==1 else 'R'))
  ell('Flower beanie',(0,.035,2.61),(.55,.46,.27),'green','head')
  for x,z in [(-.29,2.7),(.2,2.76),(.42,2.60)]:
   box('Flower petals',(x,-.356,z),(.18,.025,.06),'cream');box('Flower petals',(x,-.36,z),(.06,.025,.18),'cream');box('Flower center',(x,-.38,z),(.066,.025,.066),'gold')
  for a,b in zip([(.39,-.48,1.86),(.20,-.80,1.50),(-.05,-.91,1.14)],[ (.20,-.80,1.50),(-.05,-.91,1.14),(-.40,-.82,.82)]):bar('Tote strap',a,b,.10,'cream')
  box('Tote',(-.55,-.72,.65),(.51,.24,.53),'cream','body',.045)
  # Pixel heart on tote and tee
  for x,z in [(-.07,.05),(.07,.05),(0,-.035)]:box('Heart pixel',(-.55+x,-.855,.69+z),(.12,.026,.12),'red','body')
  for x,z in [(-.1,.1),(0,.1),(.1,.1),(0,0),(0,-.1)]:box('Shirt pixel',(x,-.79,1.48+z),(.09,.026,.09),'red','body')
 if v in ['crew','gamer','artist']:
  color={'crew':'purple','gamer':'dark','artist':'green'}[v]
  garment('Convention top',.55,1.85,color)
  bar('Lanyard left',(-.24,-.46,1.92),(0,-.85,1.42),.036,'cyan')
  bar('Lanyard right',(.24,-.46,1.92),(0,-.85,1.42),.036,'cyan')
  box('Pass',(0,-.90,1.31),(.22,.045,.27),'cream','body',.01)
  box('Pass stripe',(0,-.928,1.35),(.17,.015,.055),'purple','body')
 if v=='crew':
  bar('Headset band',(-.55,.035,2.43),(.55,.035,2.43),.085,'dark','head')
  for s in [-1,1]:ell('Headset cup',(s*.54,0,2.32),(.11,.17,.20),'purple','head')
  bar('Microphone',(.55,-.10,2.22),(.41,-.61,1.99),.035,'dark','head');ell('Mic foam',(.41,-.61,1.99),(.06,.06,.06),'dark','head')
 if v=='gamer':
  for s in [-1,1]:ell('Headphone',(s*.54,0,2.37),(.13,.22,.23),'purple','head')
  ell('Backpack',(0,.48,1.44),(.46,.22,.53),'purple')
  for s in [-1,1]:
   bar('Backpack strap',(s*.38,-.41,1.81),(s*.42,-.70,1.35),.09,'purple')
   bar('Backpack strap',(s*.42,-.70,1.35),(s*.43,-.77,1.09),.09,'purple')
 if v=='artist':
  ell('Beret',(0,.04,2.69),(.57,.46,.19),'purple','head');bar('Beret tip',(0,.04,2.83),(.025,.04,2.94),.055,'dark','head')
  box('Sketchbook',(-.82,-.29,1.03),(.30,.10,.38),'cream','arm.R',.015)
  bar('Pencil',(.77,-.27,.95),(.80,-.27,1.40),.035,'gold','arm.L')
 return rig
def eyewear(style):
 start=len(objects)
 def ring(name,center,radius,tube,material):
  bpy.ops.mesh.primitive_torus_add(major_segments=12,minor_segments=4,location=center,major_radius=radius,minor_radius=tube,rotation=(math.pi/2,0,0))
  return finish(bpy.context.object,name,material,'head')
 def rect_ring(name,x,y,z,width,height,border,depth,material):
  import bmesh
  vertices=[]
  def loop(w,h,c,yy):
   return [(x+xx,yy,z+zz) for xx,zz in [(-w/2+c,-h/2),(w/2-c,-h/2),(w/2,-h/2+c),(w/2,h/2-c),(w/2-c,h/2),(-w/2+c,h/2),(-w/2,h/2-c),(-w/2,-h/2+c)]]
  for yy in [y-depth/2,y+depth/2]:
   vertices+=loop(width,height,.065,yy)
   vertices+=loop(width-border*2,height-border*2,.035,yy)
  faces=[]
  for i in range(8):
   j=(i+1)%8
   faces += [(i,j,8+j,8+i),(16+i,24+i,24+j,16+j),(i,16+i,16+j,j),(8+i,8+j,24+j,24+i)]
  mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
  bm=bmesh.new();bm.from_mesh(mesh);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(mesh);bm.free()
  o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o
  return finish(o,name,material,'head')
 if style=='goggles':
  # Deep twin eyecups, a broad fabric band around the skull, and side buckles.
  for side in [-1,1]:
   x=side*.265
   rect_ring('Goggle rubber seal',x,-.43,2.32,.51,.47,.075,.10,'dark')
   rect_ring('Goggle deep rim',x,-.515,2.32,.50,.47,.090,.10,'cyan')
   box('Goggle lens',(x,-.548,2.32),(.36,.045,.32),'lens','head',.025)
   box('Goggle reflection',(x-.05,-.588,2.38),(.055,.014,.13),'glint')
   box('Goggle buckle',(side*.515,-.13,2.33),(.095,.18,.17),'gold')
  box('Goggle nose bridge',(0,-.655,2.33),(.18,.10,.085),'cyan')
  points=[(.525*math.cos(a),.43*math.sin(a)+.01,2.33) for a in [i*math.pi/12 for i in range(13)]]
  for a,b in zip(points,points[1:]):bar('Goggle rear strap',a,b,.12,'dark','head')
  for side in [-1,1]:bar('Goggle side strap',(side*.525,.01,2.33),(side*.515,-.28,2.33),.12,'dark','head')
 elif style=='square':
  for side in [-1,1]:
   x=side*.268
   box('Square lens',(x,-.456,2.31),(.405,.075,.38),'lens','head',.015)
   for z in [2.10,2.52]:box('Square rim',(x,-.512,z),(.47,.095,.073),'cyan')
   for xx in [x-.2,x+.2]:box('Square rim',(xx,-.512,2.31),(.073,.095,.43),'cyan')
   box('Lens reflection',(x-.09,-.499,2.39),(.048,.015,.18),'glint')
   box('Square temple',(side*.50,-.12,2.36),(.073,.71,.08),'cyan')
  box('Square bridge',(0,-.514,2.35),(.13,.09,.065),'cyan')
 elif style=='round':
  for side in [-1,1]:
   x=side*.25
   ring('Round spectacles',(x,-.475,2.32),.205,.027,'gold')
   # Open frames reveal eyes; no opaque dark disc.
   bar('Spectacle temple',(side*.46,-.42,2.35),(side*.50,.21,2.35),.032,'gold','head')
  bar('Spectacle bridge',(-.04,-.48,2.34),(.04,-.48,2.34),.035,'gold','head')
 elif style=='visor':
  box('Visor gasket',(0,-.439,2.32),(1.03,.12,.39),'dark','head',.06)
  box('Visor screen',(0,-.519,2.32),(.94,.095,.28),'purple','head',.045)
  box('Visor top',(0,-.58,2.49),(1.01,.085,.065),'cyan')
  box('Visor lower',(0,-.58,2.15),(1.01,.085,.065),'cyan')
  for side in [-1,1]:
   box('Visor temple',(side*.5,-.05,2.35),(.095,.72,.095),'dark')
   box('Visor edge',(side*.49,-.56,2.32),(.065,.085,.35),'cyan')
  box('Visor glint',(-.23,-.572,2.33),(.08,.016,.19),'glint')
 result=objects[start:]
 for o in result:
  o.name='Eyewear '+style+' / '+o.name
  # Taller frames and reduced depth reproduce the sprite's dominant cyan rectangles.
  for vertex in o.data.vertices:
   world=o.matrix_world@vertex.co
   if style=='goggles' and any(part in o.name for part in ['rubber seal','deep rim','Goggle lens','Goggle reflection']):
    from mathutils import Matrix
    sign=1 if o.location.x>0 or (o.location.x==0 and sum(v.co.x for v in o.data.vertices)>0) else -1
    pivot=Vector((sign*.265,-.435,2.32))
    world=pivot+Matrix.Rotation(sign*math.radians(35),3,'Z')@(world-pivot)
   world.z=2.235+(world.z-2.32)*1.30
   vertex.co=o.matrix_world.inverted()@world
 return result

def aim_paw(r,side,target):
 """Solve in armature space, then convert to the bone's actual local basis.
 Arm X rotations are not world-space rotations: assuming they are caused v1's back-clap.
 """
 name='arm.'+side;b=r.pose.bones[name];rest=r.data.bones[name].matrix_local
 sign=1 if side=='L' else -1
 # Bring the shoulders forward slightly; overlapping upper-arm geometry keeps the joint covered.
 shoulder_shift=Vector((-sign*.08,-.43,0))
 origin=Vector(bones[name][0]);paw=Vector((sign*.75,-.10,1.10))
 basis=rest.to_3x3();local_from=basis.inverted()@(paw-origin)
 direction=Vector(target)-origin-shoulder_shift
 local_to=basis.inverted()@direction
 b.rotation_euler=local_from.rotation_difference(local_to).to_euler('XYZ')
 b.location=basis.inverted()@shoulder_shift

clips={'ReferencePose':(24,True),'Idle':(72,True),'Walk':(24,True),'SitDown':(30,False),'Sitting':(72,True),'Sleep':(96,True),'Chat':(72,True),'Wave':(48,True),'Cheer':(48,True),'Dance':(48,True),'Point':(60,True),'InspectBadge':(72,True),'Clap':(36,True)}
def animate(r):
 for name,(end,loop) in clips.items():
  a=bpy.data.actions.new(name);a.use_fake_user=True;r.animation_data.action=a
  for f in range(1,end+2,3):
   t=(f-1)/end;w=math.sin(t*math.tau);c=math.cos(t*math.tau)
   for b in r.pose.bones:b.location=(0,0,0);b.rotation_euler=(0,0,0)
   p=r.pose.bones;p['body'].location.z=.018*w;p['head'].rotation_euler[2]=.025*w
   if name=='ReferencePose':
    p['body'].location.z=0;p['head'].rotation_euler[2]=0
    aim_paw(r,'R',(-.08,-1.55,1.35));p['arm.R'].scale.y=1.6
   if name=='Walk':
    p['leg.L'].rotation_euler[0]=.62*w;p['leg.R'].rotation_euler[0]=-.62*w
    p['arm.L'].rotation_euler[0]=-.40*w;p['arm.R'].rotation_euler[0]=.40*w;p['root'].location.z=.055*(1-c*c)
   if name in ['SitDown','Sitting','Sleep']:
    s=t*t*(3-2*t) if name=='SitDown' else 1
    p['root'].location.z=-.34*s
    for n in ['leg.L','leg.R']:p[n].rotation_euler[0]=-1.25*s
    p['body'].rotation_euler[0]=.10*s
    if name=='Sleep':p['head'].rotation_euler[0]=.32+.035*w;p['body'].scale=(1+.015*w,1+.015*w,1)
   if name=='Chat':
    p['head'].rotation_euler[0]=.09*math.sin(t*math.tau*2);p['head'].rotation_euler[2]=.13*w
    p['arm.L'].rotation_euler=(.25+.25*w,0,-.38-.18*w);p['arm.R'].rotation_euler=(.15-.20*w,0,.18+.12*w)
   if name=='Wave':p['arm.L'].rotation_euler=(.05,.18*w,-2.5+.22*math.sin(t*math.tau*3))
   if name=='Cheer':
    p['arm.L'].rotation_euler[2]=-2.45+.16*w;p['arm.R'].rotation_euler[2]=2.45-.16*w;p['root'].location.z=.16*(1-c)/2
   if name=='Dance':
    p['body'].rotation_euler[2]=.2*w;p['root'].location.x=.13*w;p['root'].location.z=.065*(1-c*c)
    p['arm.L'].rotation_euler[2]=-.85-.50*w;p['arm.R'].rotation_euler[2]=.85-.50*w;p['head'].rotation_euler[2]=-.20*w
   if name=='Point':p['arm.L'].rotation_euler=(.15,0,-1.4);p['head'].rotation_euler[2]=-.32
   if name=='InspectBadge':p['head'].rotation_euler[0]=.35+.045*w;p['arm.L'].rotation_euler=(.8,0,.35)
   if name=='Clap':
    # Two applause beats per 1.5-second loop. Paws stay in front of the shirt.
    gap=.12+.37*(.5+.5*math.cos(t*math.tau*2))
    for side,sign in [('L',1),('R',-1)]:aim_paw(r,side,(sign*gap,-1.04,1.46))
    p['head'].rotation_euler[0]=.045*math.sin(t*math.tau*2)
   p['prop'].rotation_euler[1]=t*math.tau*2
   for b in p:
    for path in ['location','rotation_euler','scale']:b.keyframe_insert(data_path=path,frame=f,group=b.name)
    b.scale=(1,1,1)
  track=r.animation_data.nla_tracks.new();track.name=name;strip=track.strips.new(name,1,a);strip.action_frame_start=1;strip.action_frame_end=end+1
  track.mute=True
 r.animation_data.action=None
 for b in r.pose.bones:b.location=(0,0,0);b.rotation_euler=(0,0,0);b.scale=(1,1,1)
scene=bpy.context.scene;scene.render.fps=24
allrigs=[];stats=[]
(OUT/'eyewear').mkdir(exist_ok=True)
for v in variants:
 bpy.ops.object.select_all(action='DESELECT');r=build(v);base=list(objects)
 eyes={style:eyewear(style) for style in eyewear_styles}
 animate(r);allrigs.append(r)
 options=[]
 for style in eyewear_styles:
  selected=base+eyes[style]
  bpy.ops.object.select_all(action='DESELECT');copies=[]
  for source in selected:
   copy=source.copy();copy.data=source.data.copy();bpy.context.collection.objects.link(copy);copy.select_set(True);copies.append(copy)
  bpy.context.view_layer.objects.active=copies[0];bpy.ops.object.join();joined=bpy.context.object;joined.name=v+'_'+style+'_web_mesh';joined.parent=None
  r.select_set(True);bpy.context.view_layer.objects.active=r
  relative=v+'.glb' if style=='goggles' else 'eyewear/'+v+'-'+style+'.glb'
  bpy.ops.export_scene.gltf(filepath=str(OUT/relative),use_selection=True,export_format='GLB',export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_texcoords=False,export_yup=True,export_apply=False)
  bpy.data.objects.remove(joined,do_unlink=True)
  for bone in r.pose.bones:bone.location=(0,0,0);bone.rotation_euler=(0,0,0);bone.scale=(1,1,1)
  bpy.context.view_layer.update()
  options.append({'id':style,'file':relative,'vertices':sum(len(o.data.vertices) for o in selected),'triangles':sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in selected)})
 for style,parts in eyes.items():
  col=bpy.data.collections.new(v+' / eyewear / '+style);r.users_collection[0].children.link(col)
  for o in parts:
   for old in list(o.users_collection):old.objects.unlink(o)
   col.objects.link(o)
  col.hide_viewport=style!='goggles';col.hide_render=style!='goggles'
 stats.append({**options[0],'id':v,'eyewear':options})
 r.location.x=(len(allrigs)-1)*2.1-5.25
 r.animation_data.nla_tracks['Idle'].mute=False
# Display collection: source retains each editable object and all named actions.
col=bpy.data.collections.new('Preview stage');scene.collection.children.link(col);bpy.context.view_layer.active_layer_collection=bpy.context.view_layer.layer_collection.children[col.name]
mat('stage',(.075,.105,.15));bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Preview floor';floor.data.materials.append(M['stage'])
bpy.ops.object.camera_add(location=(8,-17,10));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1.25))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=15;scene.camera=camera
for loc,power,size in [((0,-7,10),2300,9),((4,4,8),1900,8),((-8,-2,5),900,7)]:
 bpy.ops.object.light_add(type='AREA',location=loc);l=bpy.context.object;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(-l.location).to_track_quat('-Z','Y').to_euler()
scene.world.color=(.25,.25,.25);scene.render.engine='CYCLES';scene.cycles.samples=32
scene.view_settings.view_transform='AgX';scene.render.resolution_x=1800;scene.render.resolution_y=760;scene.render.resolution_percentage=100
scene.frame_end=97;scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT');allrigs[2].select_set(True);bpy.context.view_layer.objects.active=allrigs[2]
for area in bpy.context.screen.areas:
 if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(Path(__file__).parent/'16-bit-con-moles.blend'))
scene.render.filepath=str(OUT/'lineup.png');bpy.ops.render.render(write_still=True)
(OUT/'manifest.json').write_text(json.dumps({'characters':stats,'animations':[{'name':n,'duration':f/24,'loop':l} for n,(f,l) in clips.items()],'eyewear':eyewear_styles,'defaultEyewear':'goggles','fps':24,'forward':'+Z (glTF), -Y (Blender)','rig':'8 bones; blended body/head weights, rigid limbs; in-place locomotion'},indent=2))
print('MOLE_KIT_COMPLETE',json.dumps(stats))
