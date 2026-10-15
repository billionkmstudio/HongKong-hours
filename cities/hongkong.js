/* Hong Kong: real map. Coastline, building footprints and heights come from OpenStreetMap
   (c) OpenStreetMap contributors, ODbL (see hkdata.js, produced by tools/build_hk.py). 1 unit = 10 m, heights x1.25.
   Loaded after hkdata.js and before engine.js (see ../engine.js for the hooks this file implements). */
(function(){
var D=window.HKDATA,G=D.g,VX=D.VX;
function dec(b64,Arr){var s=atob(b64),u=new Uint8Array(s.length);for(var i=0;i<s.length;i++)u[i]=s.charCodeAt(i);return new Arr(u.buffer)}
var YY=dec(D.y,Int16Array),UU=dec(D.u,Uint8Array);
function yAt(i,j){return YY[j*G.nx+i]/50}
function terr(x,z){
  var i=(x-G.x0)/G.res,j=(z-G.z0)/G.res;
  i=Math.min(Math.max(i,0),G.nx-1.001);j=Math.min(Math.max(j,0),G.nz-1.001);
  var i0=i|0,j0=j|0,fi=i-i0,fj=j-j0;
  return yAt(i0,j0)*(1-fi)*(1-fj)+yAt(i0+1,j0)*fi*(1-fj)+yAt(i0,j0+1)*(1-fi)*fj+yAt(i0+1,j0+1)*fi*fj;
}
function chan(x){
  var c=D.chan,k=(x-c.x0)/c.step;k=Math.min(Math.max(k,0),c.v.length-1.001);
  var i=k|0,f=k-i,a=c.v[i],b=c.v[i+1];return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];
}
var SKIP=/Bank of China Tower|Central Plaza$|Hong Kong Cultural Centre|New Wing|Old Wing|Atrium/;
var named={};

window.CITY={
  id:'hongkong',name:'Hong Kong',nameZh:'香港',timeZone:'Asia/Hong_Kong',latLon:[22.29,114.17],
  real:true,RW:60,ROW0:70,fogK:1.55,
  waterDeep:[.04,.17,.2],waterTint:[.78,.95,1.0],
  style:{glassH:18,glassT:.2,brickT:.05,stoneT:.22,glass:[.16,.27,.32]},
  boatX:[-200,330],boatN:9,boatZ:[0,1],
  boatZAt:function(x,lane){var c=chan(x);return c[0]+lane*c[1]*.5},
  fireBox:{x:[-70,90],z:[30,75],h:[60,130]},
  start:{t:[20,24,122],az:-1.57,el:.14,R:165},
  paintings:[
    {file:'paintings/p0.jpg',n:'The Starry Night',a:'Vincent van Gogh',y:'1889'},
    {file:'paintings/p1.jpg',n:'Starry Night Over the Rhône',a:'Vincent van Gogh',y:'1888'},
    {file:'paintings/p2.jpg',n:'Houses of Parliament, Sunset',a:'Claude Monet',y:'1903'},
    {file:'paintings/p3.jpg',n:'The Starry Night (drawing)',a:'Vincent van Gogh',y:'1889'}
  ],
  presets:{
    sunrise:{h:6.35,fx:{}},
    golden:{h:17.9,fx:{}},
    show:{h:20.4,fx:{ls:1}},
    typhoon:{h:16.4,fx:{ty:1}},
    mist:{h:7.1,fx:{fog:1}},
    nye:{h:23.6,fx:{xmas:1,fire:1}},
    vango:{h:22.6,fx:{vg:1}}
  },
  views:{
    wanchai:{t:[45,20,115],az:-1.57,el:.1,R:95},
    central:{t:[-100,26,95],az:-1.45,el:.12,R:100},
    kowloon:{t:[-50,18,-40],az:1.57,el:.13,R:100},
    peak:{t:[-130,15,20],az:1.57,el:.42,R:230},
    all:{t:[-10,10,40],az:-1.57,el:.5,R:520}
  },
  blocked:function(){return false},
  treePos:function(rnd){
    var out=[],c=D.coast;
    for(var i=0;i<c.length;i+=2){
      var p=c[i];if(rnd()<.35)continue;
      var off=2+rnd()*4,x=p[0]+p[2]*off,z=p[1]+p[3]*off,y=terr(x,z);
      if(y>7||y<.3)continue;
      if(x>10&&x<70&&z>92&&z<130)continue;   /* HKCEC roof */
      out.push([x,z,.8+rnd()*.7,y]);
    }
    return out;
  },

  /* ---------- real buildings ---------- */
  genBlocks:function(E){
    var rnd=E.rnd,inst=E.inst,signs=window.CITY.signs=[];
    D.b.forEach(function(b){
      var x=b[0],z=b[1],W=b[2],Dp=b[3],rot=b[4],hu=b[5],y=b[6],nm=b[7];
      named[nm]=b;
      if(SKIP.test(nm))return;
      var by=Math.max(y-2.4,0.05),h=hu+(y-by);
      var R=rnd(),top=by+h;
      inst.push([x,by,z,W,h,Dp,R,0,rot]);
      var cr=Math.cos(rot),sr=Math.sin(rot);
      if(h>6){
        var nc=1+Math.floor(rnd()*2);
        for(var k=0;k<nc;k++){
          var cw=Math.min(.7+rnd()*1.4,W*.5),ch=.4+rnd()*1.0,cd=Math.min(.7+rnd()*1.4,Dp*.5);
          var lx=(rnd()-.5)*Math.max(W-cw-.4,0),lz=(rnd()-.5)*Math.max(Dp-cd-.4,0);
          inst.push([x+lx*cr+lz*sr,top,z-lx*sr+lz*cr,cw,ch,cd,rnd(),1,rot]);
        }
      }
      if(top>24)E.beaconSpots.push([x,top+.5,z]);
      if(hu>3.5&&hu<14&&W>2&&signs.length<150&&rnd()<.018)signs.push({x:x,z:z,W:W,D:Dp,rot:rot,y:by+h*(.35+.4*rnd()),h:1.4+rnd()*1.8,c:Math.floor(rnd()*6),s:rnd()<.5?1:-1});
    });
  },

  /* ---------- terrain, landmarks, ferries, light show ---------- */
  build:function(E){
    var THREE=E.THREE,scene=E.scene,rnd=E.rnd,mat=E.mat,box=E.box,cyl=E.cyl,mesh=E.mesh,facade=E.facade,lerp=E.lerp;
    var beams=[],ferries=[],mast={};

    function glass(cols,rows,wall,win,p,o){
      var f=facade(cols,rows,{wall:wall,win:win,p:p,sx:9,sy:10});o=o||{};
      return mat(0xffffff,{map:f.map,emap:f.emap,k:o.k||.9,r:o.r!==undefined?o.r:.16,m:o.m!==undefined?o.m:.5,env:o.env||1.2});
    }
    function group(x,z,y,r){var g=new THREE.Group();g.position.set(x,y===undefined?terr(x,z):y,z);g.rotation.y=r||0;scene.add(g);return g}
    function beacon(x,y,z){E.addBeacon(x,y,z)}
    var silver=mat(0xbcc6cf,{r:.3,m:.6,env:1.1});

    /* ===== terrain ===== */
    (function(){
      var nx=G.nx,nz=G.nz,geo=new THREE.PlaneGeometry(1,1,nx-1,nz-1);geo.rotateX(-Math.PI/2);
      var p=geo.attributes.position,col=new Float32Array(p.count*3),c=new THREE.Color();
      for(var j=0;j<nz;j++)for(var i=0;i<nx;i++){
        var k=j*nx+i,y=yAt(i,j),u=UU[k]/255,x=G.x0+i*G.res,z=G.z0+j*G.res;
        p.setXYZ(k,x,y,z);
        var n=(Math.sin(x*.21+z*.13)*.5+Math.sin(x*.07-z*.19)*.5)*.5+.5;
        var hill=Math.min(Math.max((y-3)/10,0),1)*(1-u*.7);
        var park=Math.max(0,1-u*2.2)*Math.min(1,Math.max(0,(y-.4)/1.5));
        var gr=Math.max(hill,park*.7);
        var r=.38+.05*n,g=.36+.05*n,b=.34+.05*n;           /* paved */
        r=r*(1-gr)+(.10+.08*n+.05*hill)*gr;g=g*(1-gr)+(.20+.10*n+.03*hill)*gr;b=b*(1-gr)+(.10+.05*n)*gr;
        if(y<.5){r=.30;g=.29;b=.28}                         /* seawall / waterfront */
        col[k*3]=r;col[k*3+1]=g;col[k*3+2]=b;
      }
      geo.setAttribute('color',new THREE.BufferAttribute(col,3));geo.computeVertexNormals();
      var m=mat(0xffffff,{r:.95,env:.55});m.vertexColors=true;
      var o=new THREE.Mesh(geo,m);o.receiveShadow=true;o.frustumCulled=false;scene.add(o);
    })();

    function top(name){var b=named[name];if(!b)return null;return {x:b[0],z:b[1],W:b[2],D:b[3],rot:b[4],h:b[5],y:b[6],top:b[6]+b[5]}}
    function find(re){for(var k in named){if(re.test(k))return top(k)}return null}

    /* ===== IFC Two / One ===== */
    (function(){
      var t=find(/Two International Finance Centre$/);if(t){
        var g=group(t.x,t.z,t.top,t.rot),m=glass(8,10,'#9fb5c4','#40586c',.5);
        var c=cyl(t.W*.34,t.W*.5,1.6,4,m,0,.8,0,g);c.rotation.y=Math.PI/4;
        box(.9,.9,.9,silver,0,1.9,0,g);cyl(.06,.1,2.4,6,silver,0,3.3,0,g);
        mast.ifc=[t.x,t.top+4.6,t.z];beacon(t.x,t.top+4.8,t.z);
        E.lineXmas([t.x-3,2,t.z+3],[t.x-3,t.top,t.z+3],4);
      }
      var t1=find(/One International Finance Centre$/);if(t1){var g1=group(t1.x,t1.z,t1.top,t1.rot);var c1=cyl(t1.W*.3,t1.W*.5,1,4,glass(8,6,'#a8bccb','#4a6278',.5),0,.5,0,g1);c1.rotation.y=Math.PI/4}
    })();
    /* ===== ICC ===== */
    (function(){
      var t=find(/International Commerce Centre$/);if(!t)return;
      var g=group(t.x,t.z,t.top,t.rot),crown=mat(0x102030,{e:0x5fa8ff,k:1.2});
      box(t.W*.7,1.6,t.D*.7,crown,0,.8,0,g);cyl(.1,.18,3.2,6,silver,0,3.2,0,g);
      mast.icc=[t.x,t.top+5,t.z];beacon(t.x,t.top+5,t.z);
      E.lineXmas([t.x-4,2,t.z-4],[t.x-4,t.top,t.z-4],4);
    })();
    /* ===== Bank of China Tower: four triangular prisms ===== */
    (function(){
      var b=named['中銀大廈 Bank of China Tower Bank of China Tower'];if(!b)return;
      var g=group(b[0],b[1],Math.max(b[6]-2,.1),b[4]),m=glass(8,40,'#b7c0c8','#46586a',.5,{m:.65});
      var H=36.7*VX,hs=[H,H*.86,H*.7,H*.54],r=b[2]*.62,o=r*.55,off=[[-o,-o],[o,-o],[-o,o],[o,o]];
      for(var i=0;i<4;i++){var pr=cyl(r,r,hs[i],3,m,off[i][0],hs[i]/2,off[i][1],g);pr.rotation.y=Math.PI/6+i*Math.PI/2}
      cyl(.06,.1,2.4,6,silver,-o,hs[0]+1.2,-o,g);
      mast.boc=[b[0],Math.max(b[6]-2,.1)+H+3,b[1]];beacon(b[0],mast.boc[1],b[1]);
    })();
    /* ===== Central Plaza: golden triangular tower, pyramid top, colour-changing mast ===== */
    (function(){
      var b=named['中環廣場 Central Plaza Central Plaza'];if(!b)return;
      var y0=Math.max(b[6]-2,.1),H=b[5]+2,g=group(b[0],b[1],y0,b[4]);
      var gold=glass(10,44,'#d1ad58','#6f5320',.55,{r:.18,m:.55,env:1.3}),dark=mat(0x8a6a28,{r:.3,m:.5}),r=b[2]*.58;
      var s=cyl(r,r,H*.9,3,gold,0,H*.45,0,g);s.rotation.y=Math.PI/6;
      var s2=cyl(r*.85,r*.85,H*.08,3,dark,0,H*.94,0,g);s2.rotation.y=Math.PI/6;
      var pyr=cyl(.05,r*.85,H*.12,3,dark,0,H*1.04,0,g);pyr.rotation.y=Math.PI/6;
      cyl(.07,.12,2.4,6,silver,0,H*1.1+1.2,0,g);
      mast.cpMat=new THREE.MeshBasicMaterial({color:0xff4040});
      cyl(.14,.14,2.6,8,mast.cpMat,0,H*1.1+3.4,0,g);
      mast.cp=[b[0],y0+H*1.1+4.8,b[1]];beacon(b[0],mast.cp[1],b[1]);
    })();
    /* ===== HKCEC: low glass hall under sweeping roof shells ===== */
    (function(){
      var b=named['新翼 New Wing New Wing'];if(!b)return;
      var y0=Math.max(b[6],.12),g=group(b[0],b[1],y0,b[4]),W=b[2],Dp=b[3];
      box(W,2.6,Dp,glass(14,4,'#8fb9bb','#2a5e66',.7,{r:.12,m:.4,env:1.3}),0,1.3,0,g);
      var roofM=mat(0xeef2f6,{r:.22,m:.8,env:1.5});
      var dome=new THREE.SphereGeometry(1,32,14,0,Math.PI*2,0,Math.PI/2);
      var d1=mesh(dome,roofM,-W*.17,2.4,0,g);d1.scale.set(W*.46,3.4,Dp*.55);
      var d2=mesh(dome,roofM,W*.27,2.4,0,g);d2.scale.set(W*.28,2.6,Dp*.45);
      var lw=mat(0x9fb0b8,{r:.4,m:.4});box(W*1.02,.5,1,lw,0,2.4,Dp*.5,g);
    })();
    /* ===== Tsim Sha Tsui: Cultural Centre, clock tower ===== */
    (function(){
      var b=named['香港文化中心 Hong Kong Cultural Centre Hong Kong Cultural Centre'];if(!b)return;
      var y0=Math.max(b[6],.12),g=group(b[0],b[1],y0,b[4]);
      box(b[2]*1.5,1.4,b[3]*1.5,mat(0xcbb9a2,{r:.8}),0,.7,0,g);
      var roof=box(b[2]*1.6,.5,b[3]*1.7,mat(0xb48f78,{r:.75}),0,2,0,g);roof.rotation.x=-.16;
      mast.cc=[b[0],y0+3,b[1]];
      var t=named['尖沙咀鐘樓 Tsim Sha Tsui Clock Tower Tsim Sha Tsui Clock Tower'];
      if(t){var tg=group(t[0],t[1],Math.max(t[6],.12),t[4]);box(.75,4.4,.75,mat(0xa4503a,{r:.8}),0,2.2,0,tg);cyl(0,.7,1.1,4,mat(0x5a4a42,{r:.7}),0,4.9,0,tg).rotation.y=Math.PI/4}
    })();

    /* ===== neon signs ===== */
    (function(){
      var cols=[0xff2a2a,0x2ad4ff,0xff3bd1,0xffd02a,0x39ff6a,0xffffff];
      var mats=cols.map(function(c){return mat(0x151515,{e:c,k:1.3})});
      (window.CITY.signs||[]).forEach(function(s){
        var g=new THREE.Group();g.position.set(s.x,s.y,s.z);g.rotation.y=s.rot;scene.add(g);
        var m=mesh(new THREE.BoxGeometry(1.3,s.h,.22),mats[s.c],s.s*(s.W/2+.7),0,(Math.random()-.5)*s.D*.5,g);m.castShadow=false;
      });
    })();

    /* ===== waterfront and road lights ===== */
    (function(){
      var c=D.coast;
      for(var i=0;i<c.length;i+=1){var p=c[i];if(p[0]<-260||p[0]>380||p[1]<-200||p[1]>200)continue;
        var x=p[0]+p[2]*1.3,z=p[1]+p[3]*1.3,y=terr(x,z);if(y<.3||y>6)continue;
        E.addXmas(x,y+2.2,z);if(i%3===0)E.addLamp(p[0]+p[2]*2.2,y+3.6,p[1]+p[3]*2.2)}
      D.lamps.forEach(function(p){var y=terr(p[0],p[1]);if(y<.3||y>20)return;E.addLamp(p[0],y+3.4,p[1])});
    })();

    /* ===== Star Ferry ===== */
    (function(){
      var hull=mat(0xf2f4f2,{r:.5}),green=mat(0x1f7a52,{r:.6}),cab=mat(0xf6f8f6,{e:0xffe0a8,k:.9,r:.4});
      for(var i=0;i<2;i++){
        var g=new THREE.Group();
        box(10,1.2,3.4,hull,0,.7,0,g);
        cyl(0,1.7,2.4,4,hull,6.2,.7,0,g).rotation.z=-Math.PI/2;
        box(8,1.5,2.8,cab,-.3,2,0,g);box(8.4,.3,3,green,-.3,2.9,0,g);
        box(6,1.3,2.4,cab,-.3,3.6,0,g);box(6.4,.3,2.6,green,-.3,4.4,0,g);
        cyl(.35,.35,1.4,8,mat(0x20262e,{}),-2.8,5.2,0,g);
        g.scale.setScalar(.8);scene.add(g);ferries.push({g:g,ph:i*Math.PI});
      }
    })();

    /* ===== light show beams ===== */
    (function(){
      var geo=new THREE.CylinderGeometry(2.2,.12,150,10,1,true);geo.translate(0,75,0);
      var vs='varying float vH;void main(){vH=uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
      var fs='precision highp float;varying float vH;uniform vec3 uC;uniform float uA;void main(){float a=pow(1.0-vH,1.3)*0.42*uA;gl_FragColor=vec4(uC*a*1.6,a);}';
      var src=[mast.ifc,mast.boc,mast.cp,mast.icc,mast.cc].filter(Boolean);
      src.forEach(function(p,i){
        var m=new THREE.ShaderMaterial({uniforms:{uC:{value:new THREE.Color(1,1,1)},uA:{value:0}},vertexShader:vs,fragmentShader:fs,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
        var b=new THREE.Mesh(geo,m);b.position.set(p[0],p[1],p[2]);b.frustumCulled=false;b.visible=false;scene.add(b);beams.push({o:b,m:m,i:i});
      });
    })();

    return {
      addBoats:function(B){
        /* red-sailed junk */
        var g=new THREE.Group(),hullM=mat(0x4a2e1e,{r:.8}),sailM=mat(0xc8231b,{e:0xff3a22,k:.25,r:.85}),wood=mat(0x2c1c12,{r:.9});
        B.box(13,2,4.4,hullM,0,1.3,0,g);B.box(4,2.6,4.2,hullM,-5.6,2.6,0,g);B.cyl(0,2.2,3,4,hullM,7,1.3,0,g).rotation.z=-Math.PI/2;
        [[-2.4,12],[2.8,10]].forEach(function(s){
          B.cyl(.18,.22,s[1]+3,6,wood,s[0],(s[1]+3)/2+1,0,g);
          var sl=B.box(.12,s[1],4.8,sailM,s[0]+.3,s[1]/2+3,0,g);sl.rotation.y=.12;
          for(var k=1;k<5;k++){var bt=B.box(.2,.2,5,wood,s[0]+.32,3+k*s[1]/5,0,g);bt.rotation.y=.12}
        });
        g.scale.setScalar(.75);g.position.set(10,.1,48);scene.add(g);
        B.boats.push({g:g,sp:1.2,bob:1.7,cab:sailM,lane:-.1});
      },
      onTime:function(){},
      onLamp:function(){},
      onFrame:function(t,fx,env,hour){
        if(mast.cpMat)mast.cpMat.color.setHSL((hour*.31)%1,1,.38+.28*env.night);
        /* Star Ferry shuttles TST <-> Central */
        for(var i=0;i<ferries.length;i++){
          var f=ferries[i],u=Math.sin(t*.07+f.ph)*.5+.5,u2=Math.sin(t*.07+f.ph+.01)*.5+.5;
          var x0=-9,z0=1,x1=-86,z1=62;
          var px=lerp(x0,x1,u),pz=lerp(z0,z1,u);
          var dx=lerp(x0,x1,u2)-px,dz=lerp(z0,z1,u2)-pz;
          f.g.position.set(px,.1+Math.sin(t*1.2+i)*.05,pz);
          if(Math.abs(dx)+Math.abs(dz)>1e-6)f.g.rotation.y=Math.atan2(-dz,dx);
        }
        var a=fx.ls*Math.min(1,env.night*1.4);
        for(var k=0;k<beams.length;k++){
          var b=beams[k],on=a>.02;b.o.visible=on;if(!on)continue;
          b.m.uniforms.uA.value=a;
          b.m.uniforms.uC.value.setHSL((t*.05+k*.17)%1,1,.55);
          b.o.rotation.z=Math.sin(t*.7+k*1.3)*.62;b.o.rotation.x=Math.cos(t*.53+k*.9)*.5;
        }
      }
    };
  }
};
})();
