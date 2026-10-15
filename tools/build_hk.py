import json, math, base64, random, struct
import numpy as np
from scipy.spatial import cKDTree
from scipy import ndimage
random.seed(7); np.random.seed(7)
S=10.0; VX=1.8; TX=1.5
LON0,LAT0=114.1695,22.2930
KX=111320*math.cos(math.radians(LAT0))/S; KZ=110574/S
def P(lon,lat): return ((lon-LON0)*KX, -(lat-LAT0)*KZ)
d=json.load(open('hk-osm.json'))
s_,w_,n_,e_=d['bbox']
XMIN,ZMAX=P(w_,s_); XMAX,ZMIN=P(e_,n_)
print('bbox x',XMIN,XMAX,'z',ZMIN,ZMAX)
# ---- coast samples with direction (land on left)
pts=[];dirs=[]
for c in d['coast']:
    q=[P(*p) for p in c]
    for a,b in zip(q[:-1],q[1:]):
        L=math.hypot(b[0]-a[0],b[1]-a[1])
        if L<1e-6: continue
        n=max(1,int(L/1.5))
        for i in range(n+1):
            t=i/n; pts.append((a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)); dirs.append(((b[0]-a[0])/L,(b[1]-a[1])/L))
pts=np.array(pts);dirs=np.array(dirs)
tree=cKDTree(pts)
PAD=130
RES=3.0
gx0=XMIN-PAD; gx1=XMAX+PAD; gz0=ZMIN-PAD; gz1=ZMAX+PAD
nx=int((gx1-gx0)/RES)+1; nz=int((gz1-gz0)/RES)+1
print('grid',nx,nz)
xs=gx0+np.arange(nx)*RES; zs=gz0+np.arange(nz)*RES
X,Z=np.meshgrid(xs,zs)
# clamp query points into bbox for mask
Xc=np.clip(X,XMIN,XMAX); Zc=np.clip(Z,ZMIN,ZMAX)
Q=np.stack([Xc.ravel(),Zc.ravel()],1)
dist,idx=tree.query(Q)
v=Q-pts[idx]
# geographic: E=x, N=-z ; direction (dx,-dz) ; left normal = (-dN, dE) = (dz, dx)  [in E,N]
dE=dirs[idx,0]; dN=-dirs[idx,1]
vE=v[:,0]; vN=-v[:,1]
cross=dE*vN-dN*vE   # >0 => point on left of direction => land
sd=np.where(cross>0,dist,-dist).reshape(nz,nx)
land=sd>0
water=~land
core=ndimage.binary_opening(water,iterations=2)
lw,nw=ndimage.label(core)
if nw:
    szw=ndimage.sum(core,lw,range(1,nw+1))
    keep=np.isin(lw,[i+1 for i in range(nw) if szw[i]>400])
else: keep=core
water=ndimage.binary_dilation(keep,iterations=2)&water
# fill tiny land specks inside water
land=~water
land=ndimage.binary_opening(land,iterations=1)|(land&False)
land=ndimage.binary_closing(land,iterations=1)
sd=(ndimage.distance_transform_edt(land)-ndimage.distance_transform_edt(~land))*RES
sd=ndimage.gaussian_filter(sd,0.9)
imin=int(math.ceil((XMIN-gx0)/RES))+2; imax=int((XMAX-gx0)/RES)-2
jmin=int(math.ceil((ZMIN-gz0)/RES))+2; jmax=int((ZMAX-gz0)/RES)-2
sd=sd[np.ix_(np.clip(np.arange(nz),jmin,jmax),np.clip(np.arange(nx),imin,imax))]
land=sd>0
lab,nl=ndimage.label(land)
sizes=ndimage.sum(land,lab,range(1,nl+1))
order=np.argsort(sizes)[::-1]
print('components',[(int(i+1),int(sizes[i])) for i in order[:6]])
# island = component containing Central (114.1595,22.2830); kowloon containing TST
def comp_at(lon,lat):
    x,z=P(lon,lat);i=int(round((x-gx0)/RES));j=int(round((z-gz0)/RES));return lab[j,i]
ci=comp_at(114.1580,22.2750); ck=comp_at(114.1730,22.3050)
print('island comp',ci,'kowloon comp',ck)
# ---- terrain height (units)
def sm(t): t=np.clip(t,0,1); return t*t*(3-2*t)
dland=np.where(land,sd,0)
noise=(np.sin(X*.021+Z*.013)*.5+np.sin(X*.047-Z*.031+1.3)*.35+np.sin(X*.011+Z*.05+.4)*.4)
H=np.zeros_like(sd)
isl=(lab==ci)
# island: mid-levels slope behind the coast, Peak bump
px,pz=P(114.1496,22.2759)
Hisl=TX*VX*( 50*np.clip((dland-30)/220,0,1.25)**1.5*(0.85+0.15*noise) + 42*np.exp(-(((X-px)/55)**2+((Z-pz)/50)**2)) )
Hisl=Hisl*(1+0.06*noise)
H=np.where(isl,Hisl,H)
kow=(lab==ck)
Hk=TX*VX*(34*sm((-Z-300)/110)*(0.8+0.2*noise)+14*sm((-Z-380)/100))
H=np.where(kow,Hk,H)
# fade at padded far edges so hills do not end as a wall
fade=1-sm((np.maximum(Z-ZMAX,0)+np.maximum(ZMIN-Z,0))/PAD)*0.0
H=H*fade
Hs=ndimage.gaussian_filter(H,1.0)
# vertex y: shoreline blend + terrain
shore=np.clip(sd/2.5,-1,1)*0.9
Y=0.12+shore+np.where(sd>0,Hs*sm(sd/6),0)
Y=np.where(sd<-3,0.12-0.9,Y)
# ---- buildings
bs=[]
for b in d['buildings']:
    q=[P(*p) for p in b['p']]
    if len(q)<4: continue
    a=np.array(q)
    # area (shoelace) in m^2
    x_,z_=a[:,0],a[:,1]
    area=0.5*abs(np.dot(x_,np.roll(z_,-1))-np.dot(z_,np.roll(x_,-1)))*S*S
    if area<45: continue
    # min-area rectangle via hull edge orientations
    best=None
    for k in range(len(a)-1):
        ex,ez=a[k+1]-a[k]; L=math.hypot(ex,ez)
        if L<1e-6: continue
        c,s=ex/L,ez/L
        u=a[:,0]*c+a[:,1]*s; w=-a[:,0]*s+a[:,1]*c
        ar=(u.max()-u.min())*(w.max()-w.min())
        if best is None or ar<best[0]: best=(ar,c,s,u.min(),u.max(),w.min(),w.max())
    if best is None: continue
    _,c,s,u0,u1,w0,w1=best
    cu=(u0+u1)/2; cw=(w0+w1)/2
    cx=cu*c-cw*s; cz=cu*s+cw*c
    W=u1-u0; D=w1-w0
    phi=math.atan2(s,c)
    h=b.get('h'); lv=b.get('l')
    hm=h if h else (lv*3.3 if lv else None)
    bs.append([cx,cz,max(W,.55),max(D,.55),-phi,hm,area,b.get('n','')+' '+b.get('e','')])
print('buildings kept',len(bs))
known=np.array([[b[0],b[1]] for b in bs if b[5] is not None]);kh=np.array([b[5] for b in bs if b[5] is not None])
kt=cKDTree(known)
rng=np.random.default_rng(3)
for b in bs:
    if b[5] is None:
        dd,ii=kt.query([b[0],b[1]],k=10)
        med=float(np.median(kh[ii])); 
        if dd[0]>25: med=min(med,40)
        base=max(med,18)
        b[5]=max(9,base*rng.uniform(.55,1.2))
# terrain lookup
def terr(x,z):
    i=(x-gx0)/RES; j=(z-gz0)/RES
    i=min(max(i,0),nx-1.001); j=min(max(j,0),nz-1.001)
    i0=int(i); j0=int(j); fi=i-i0; fj=j-j0
    return (Y[j0,i0]*(1-fi)*(1-fj)+Y[j0,i0+1]*fi*(1-fj)+Y[j0+1,i0]*(1-fi)*fj+Y[j0+1,i0+1]*fi*fj)
# ---- landmark names to separate
LM={'ifc2':(114.15935,22.28499),'ifc1':(114.1572,22.2850),'boc':(114.16139,22.27956),'cp':(114.17389,22.27982),'icc':(114.16027,22.30302),
    'cc':(114.16957,22.29417)}
out=[]
for b in bs:
    cx,cz,W,D,rot,hm,area,nm=b
    y=terr(cx,cz)
    if y<0.2: continue   # in the water / shoreline
    hu=hm/S*VX
    out.append([round(cx,2),round(cz,2),round(W,2),round(D,2),round(rot,3),round(hu,2),round(float(y),2),nm.strip()])
print('buildings placed',len(out))
# coverage (urban-ness) raster
cov=np.zeros((nz,nx))
for o in out:
    i=int((o[0]-gx0)/RES); j=int((o[1]-gz0)/RES)
    if 0<=i<nx and 0<=j<nz: cov[j,i]+=o[2]*o[3]/(RES*RES)
cov=ndimage.gaussian_filter(cov,1.6)
U8=np.clip(cov*180,0,255).astype(np.uint8)
# roads -> lamp points
lamps=[]
for r in d['roads']:
    q=[P(*p) for p in r]
    acc=0
    for a,b in zip(q[:-1],q[1:]):
        L=math.hypot(b[0]-a[0],b[1]-a[1]); t=0
        while t<L:
            x=a[0]+(b[0]-a[0])*t/L; z=a[1]+(b[1]-a[1])*t/L
            if terr(x,z)>0.2 and terr(x,z)<12: lamps.append([round(x,1),round(z,1)])
            t+=11
rngl=random.sample(lamps,min(len(lamps),3200))
# coast samples (trees/lights) where land
coast=[]
for c in d['coast']:
    q=[P(*p) for p in c]
    for a,b in zip(q[:-1],q[1:]):
        L=math.hypot(b[0]-a[0],b[1]-a[1]); t=0
        while t<L:
            x=a[0]+(b[0]-a[0])*t/L; z=a[1]+(b[1]-a[1])*t/L
            dx=(b[0]-a[0])/L; dz=(b[1]-a[1])/L
            # land on left in (E,N): normal in (x,z) = (dz,dx)*? left normal E,N = (-dN,dE) = (dz, dx) -> x=dz, z=-dx
            nxl,nzl=dz,-dx
            coast.append([round(x,1),round(z,1),round(nxl,2),round(nzl,2)])
            t+=3.2
print('lamps',len(rngl),'coast',len(coast))
chan=[];cx0=-290;cstep=10
for xi in range(cx0,560,cstep):
    i=int(round((xi-gx0)/RES));col=sd[:,i]
    zsel=[(j,gz0+j*RES) for j in range(nz) if -150<=gz0+j*RES<=260]
    best=None;run=None
    for j,z in zsel:
        if col[j]<-4:
            run=[z,z] if run is None else [run[0],z]
        else:
            if run and (best is None or run[1]-run[0]>best[1]-best[0]): best=run
            run=None
    if run and (best is None or run[1]-run[0]>best[1]-best[0]): best=run
    chan.append([round((best[0]+best[1])/2,1),round((best[1]-best[0])/2,1)] if best else [40,20])
Yq=np.round(np.clip(Y,-3,200)*50).astype(np.int16)  # 0.02 precision
js={'S':S,'VX':VX,'g':{'x0':gx0,'z0':gz0,'res':RES,'nx':nx,'nz':nz},
    'y':base64.b64encode(Yq.tobytes()).decode(),'u':base64.b64encode(U8.tobytes()).decode(),
    'b':out,'lamps':rngl,'coast':coast,'chan':{'x0':cx0,'step':cstep,'v':chan},'lm':{k:list(P(*v)) for k,v in LM.items()}}
open('hkdata.json','w').write(json.dumps(js,separators=(',',':'),ensure_ascii=False))
open('/home/claude/site/cities/hkdata.js','w').write('window.HKDATA='+json.dumps(js,separators=(',',':'),ensure_ascii=False)+';')
import os;print('json MB',os.path.getsize('hkdata.json')/1e6)
# debug map
from PIL import Image,ImageDraw
sc=1.2
W_=int((gx1-gx0)*sc);H_=int((gz1-gz0)*sc)
im=Image.new('RGB',(W_,H_),(20,60,90));dr=ImageDraw.Draw(im)
arr=np.zeros((nz,nx,3),np.uint8);arr[...]=(20,60,90);arr[land]=(90,110,70);arr[land&(H>5)]=(60,130,60)
im2=Image.fromarray(arr).resize((W_,H_),Image.NEAREST);dr=ImageDraw.Draw(im2)
for o in out:
    cx,cz,W,D,rot,h,y,nm=o
    px_=(cx-gx0)*sc;pz_=(cz-gz0)*sc
    col=(min(255,120+int(h*3)),min(255,120+int(h*2)),140)
    dr.ellipse([px_-1.5,pz_-1.5,px_+1.5,pz_+1.5],fill=col)
for p in d['coast']:
    q=[P(*a) for a in p];dr.line([((a[0]-gx0)*sc,(a[1]-gz0)*sc) for a in q],fill=(255,80,80),width=1)
im2.save('map.png')
