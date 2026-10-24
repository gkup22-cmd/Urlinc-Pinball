import numpy as np, scipy.ndimage as nd, json, os, math
from PIL import Image
a=np.array(Image.open('sheet3.png').convert('RGB'))
mx=a.max(2).astype(float)
fg=np.load('fg3.npy')
near=nd.binary_dilation(fg,iterations=6)
soft=np.where(near,np.clip((mx-10)/45,0,1)*255,0)
alpha=np.where(fg,255,soft)
alpha=nd.gaussian_filter(alpha,0.5).astype(np.uint8)
rgba=np.dstack([a,alpha])
L,m=nd.label(nd.binary_dilation(fg,iterations=2))
boxes=[(o[1].start,o[0].start,o[1].stop,o[0].stop) for o,s in zip(nd.find_objects(L),nd.sum(fg,L,range(1,m+1))) if s>800]
def split(b,k):
  x0,y0,x1,y1=b; col=fg[y0:y1,x0:x1].sum(0); w=x1-x0; cuts=[x0]
  for i in range(1,k):
    e=int(w*i/k); lo,hi=max(0,e-30),min(w,e+30); cuts.append(x0+lo+int(np.argmin(col[lo:hi])))
  cuts.append(x1); return [(cuts[i],y0,cuts[i+1],y1) for i in range(k)]
def save(b,path):
  x0,y0,x1,y1=b; c=rgba[max(0,y0-3):y1+3,max(0,x0-3):x1+3].copy()
  m=c[...,3]>60; lab,n=nd.label(m)
  if n>1:
    s=nd.sum(m,lab,range(1,n+1)); big=np.argmax(s)+1
    keep=nd.binary_dilation(lab==big,iterations=3); c[...,3]=np.where(keep,c[...,3],0)
  if path.endswith('/rail.png'):
    dark=c[...,:3].max(2)<30; c[...,3]=np.where(dark,0,c[...,3])
  im=Image.fromarray(c,'RGBA'); im=im.crop(im.getbbox()); im.thumbnail((512,512)); im.save(path,optimize=True)
for name,(lo,hi),mat in [('classic_red',(0,530),'chrome'),('classic_blue',(530,1030),'chrome'),('classic_gold',(1030,1536),'gold')]:
  d=f'/app/backend/seed_parts/{name}'; os.makedirs(d,exist_ok=True)
  rows={}
  for b in [b for b in boxes if lo<=(b[0]+b[2])/2<hi]:
    r=min([19,191,308,456,607,779],key=lambda y:abs(y-b[1])); rows.setdefault(r,[]).append(b)
  for r in rows: rows[r].sort()
  out=dict(zip(['bumper_cap','bumper_cap_lit','bumper_base'],split(rows[19][0],3)))
  out['flipper_left']=rows[191][0]
  r3=rows[308]; out['target_drop']=r3[0]; out['target_flag'],out['target_shield']=split(r3[1],2); out['target_gem']=r3[2]
  r4=rows[456]; out['target_post']=r4[0]; out['rollover'],out['rollover_lit']=split(r4[1],2); out['arrow'],out['arrow_lit']=r4[2],r4[3]
  out['saucer'],out['rail_post'],out['rail']=rows[607]
  out['apron_left'],out['ball'],out['apron_right']=rows[779]
  for k,b in out.items(): save(b,f'{d}/{k}.png')
  f=np.array(Image.open(f'{d}/flipper_left.png'))[...,3]>128; h,w=f.shape
  ext=[np.where(f[:,x])[0] for x in range(w)]
  left=[(x,ys) for x,ys in enumerate(ext[:w//3]) if len(ys)]
  xb,yb=max(left,key=lambda e:e[1].max()-e[1].min())
  rad=(yb.max()-yb.min())/2; py=(yb.max()+yb.min())/2; px=min(xb,left[0][0]+rad)
  right=max(x for x,ys in enumerate(ext) if len(ys)); tx=int(right-rad*0.35); ty=(ext[tx].max()+ext[tx].min())/2
  meta={'px':px/w,'py':float(py/h),'len':float((tx-px)/w),'tilt':float(math.atan2(ty-py,tx-px))}
  json.dump({'material':mat,'flipper':meta},open(f'{d}/meta.json','w')); print(name,len(out),meta)
