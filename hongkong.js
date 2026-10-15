/* Hong Kong: Victoria Harbour, Kowloon and Hong Kong Island skyline. Stylised, not to scale.
   Loaded before engine.js (see ../engine.js for the hooks this file implements). */
(function(){
var RW=62;                         /* half width of the harbour */
function sm(t){t=t<0?0:t>1?1:t;return t*t*(3-2*t)}

/* ---- terrain: Hong Kong Island hills to the south (z>0), Kowloon hills to the north (z<0) ---- */
function hillH(x,z){
  var h=0;
  if(z>100){
    var t=sm((z-100)/230),ridge=.72+.28*Math.sin(x*.011+1.3)+.18*Math.sin(x*.027+.4);
    h=t*95*ridge+70*Math.exp(-Math.pow((x+70)/90,2)-Math.pow((z-300)/110,2))+Math.sin(x*.07)*Math.sin(z*.05)*4*t;
    if(z>470)h*=Math.max(.25,1-(z-470)/260);
  }else if(z<-230){
    var t2=sm((-z-230)/200),r2=.75+.25*Math.sin(x*.013+.2)+.15*Math.sin(x*.031+2.1);
    h=t2*100*r2+60*Math.exp(-Math.pow((x-30)/80,2)-Math.pow((z+390)/70,2))+Math.sin(x*.06)*Math.sin(z*.05)*4*t2;
    if(z<-470)h*=Math.max(.25,1-(-z-470)/260);
  }
  return Math.max(h,0);
}

/* ---- footprints reserved for hand-placed landmarks: [cx, cz, halfW, halfD] ---- */
var FOOT=[
  [-96,RW+26,10,10],[-110,RW+30,10,10],[-62,RW+30,12,12],[-45,RW+14,13,11],[-28,RW+44,12,12],[-4,RW+40,12,11],
  [5,RW+16,36,17],[45,RW+36,14,14],[88,RW+30,14,12],[62,RW+34,10,10],[20,RW+75,12,12],
  [-165,-(RW+36),16,16],[-6,-(RW+14),36,19],[-38,-(RW+12),14,14],[-22,-(RW+8),6,6],[14,-(RW+30),24,12],[-96,-(RW+22),54,14]
];
function blocked(x,z,hw){
  for(var i=0;i<FOOT.length;i++){var f=FOOT[i];if(Math.abs(x-f[0])<f[2]+hw&&Math.abs(z-f[1])<f[3]+hw)return true}
  return false;
}
function core(x){
  return Math.max(Math.exp(-Math.pow((x+70)/60,2)),.85*Math.exp(-Math.pow((x-50)/55,2)),.6*Math.exp(-Math.pow((x-150)/45,2)),.5*Math.exp(-Math.pow((x+150)/40,2)));
}

window.CITY={
  id:'hongkong',name:'Hong Kong',nameZh:'香港',timeZone:'Asia/Hong_Kong',latLon:[22.29,114.17],
  RW:RW,ROW0:RW+13,fogK:1.55,
  waterDeep:[.04,.17,.2],waterTint:[.78,.95,1.0],
  style:{glassH:18,glassT:.2,brickT:.05,stoneT:.22,glass:[.16,.27,.32]},
  boatZ:[8,52],boatN:7,
  fireBox:{x:[-120,120],z:[-45,45],h:[75,150]},
  start:{t:[40,22,50],az:-1.57,el:.31,R:280},
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
    wanchai:{t:[55,30,62],az:-1.57,el:.15,R:115},
    central:{t:[-72,38,70],az:-1.5,el:.15,R:118},
    kowloon:{t:[-60,18,-80],az:1.57,el:.16,R:120},
    peak:{t:[-20,6,-10],az:1.57,el:.42,R:380},
    all:{t:[-10,10,0],az:-1.57,el:.5,R:420}
  },
  blocked:blocked,

  /* ---------- procedural blocks ---------- */
  genBlocks:function(E){
    var rnd=E.rnd,inst=E.inst,cs=6.4,front=E.RW+13,signs=window.CITY.signs=[];
    for(var x=-300;x<=300;x+=cs){
      for(var side=-1;side<=1;side+=2){
        for(var row=0;row<30;row++){
          var z=side*(front+row*cs);
          if(rnd()<.05)continue;
          var w=3.8+rnd()*2.6,d=3.8+rnd()*2.6;
          var cx=x+(rnd()-.5)*.8,cz=z+(rnd()-.5)*.8;
          if(blocked(cx,cz,Math.max(w,d)/2))continue;
          var hh=hillH(cx,cz);
          if(hh>78&&rnd()<.7)continue;
          var r=rnd(),h;
          if(side>0){
            var c=core(cx),fall=Math.exp(-row/11);
            h=6+Math.pow(r,2.3)*(10+52*c*fall+8*(1-fall));
            if(row<2)h=Math.max(h,14+20*c);
            if(hh>10)h*=.78;
          }else{
            var wk=E.sstep(-110,-190,cx);
            h=7+Math.pow(r,2.2)*(10+(row<3?12:32)+34*wk);
            if(row>9&&r>.92)h+=22;
            h=E.lerp(5+r*4,h,E.sstep(55,125,Math.abs(cx-5)));
          }
          var by=Math.max(hh-3,0),top=by+h+(by>0?3:0),R=rnd();
          if(h>26&&rnd()<.55){
            var h1=h*(.55+rnd()*.15),tw=w*(.65+rnd()*.15),td=d*(.65+rnd()*.15);
            inst.push([cx,by,cz,w,h1+(by>0?3:0),d,R,0]);
            inst.push([cx+(rnd()-.5)*(w-tw)*.6,by+h1+(by>0?3:0),cz+(rnd()-.5)*(d-td)*.6,tw,h-h1,td,rnd(),0]);
            w=tw;d=td;
          }else inst.push([cx,by,cz,w,h+(by>0?3:0),d,R,0]);
          var nc=1+Math.floor(rnd()*3);
          for(var k=0;k<nc;k++){
            var cw=.8+rnd()*2,ch=.5+rnd()*1.4,cd=.8+rnd()*2;
            inst.push([cx+(rnd()-.5)*Math.max(w-cw-.8,0),top,cz+(rnd()-.5)*Math.max(d-cd-.8,0),cw,ch,cd,rnd(),1]);
          }
          if(top>40)E.beaconSpots.push([cx,top+.5,cz]);
          if(row<2&&h>16&&signs.length<80&&rnd()<.24)
            signs.push({x:cx,y:by+h*(.45+.4*rnd()),z:cz-side*(d/2+.12),w:Math.min(w*.8,5),h:1.6+rnd()*2,c:Math.floor(rnd()*6)});
        }
      }
    }
  },

  /* ---------- landmarks, hills, ferries, light show ---------- */
  build:function(E){
    var THREE=E.THREE,scene=E.scene,rnd=E.rnd,mat=E.mat,box=E.box,cyl=E.cyl,mesh=E.mesh,facade=E.facade;
    var RW=E.RW,lerp=E.lerp;
    var beams=[],ferries=[],mast={},sail=null;

    function glass(cols,rows,wall,win,p,o){
      var f=facade(cols,rows,{wall:wall,win:win,p:p,sx:9,sy:10});o=o||{};
      return mat(0xffffff,{map:f.map,emap:f.emap,k:o.k||.9,r:o.r!==undefined?o.r:.16,m:o.m!==undefined?o.m:.5,env:o.env||1.2});
    }
    function ped(g,w,d,h,m){return box(w,h,d,m,0,h/2,0,g)}
    function group(x,z,y){var g=new THREE.Group();g.position.set(x,y||0,z);scene.add(g);return g}
    function beacon(x,y,z){E.addBeacon(x,y,z)}

    /* ===== hills ===== */
    (function(){
      function hill(z0,z1,seed){
        var nx=170,nz=56,geo=new THREE.PlaneGeometry(1700,z1-z0,nx,nz);
        geo.rotateX(-Math.PI/2);
        var p=geo.attributes.position,col=new Float32Array(p.count*3),c=new THREE.Color();
        for(var i=0;i<p.count;i++){
          var x=p.getX(i),z=p.getZ(i)+(z0+z1)/2,h=hillH(x,z);
          p.setXYZ(i,x,h-.4,z);
          var t=Math.min(h/150,1),n=(Math.sin(x*.21+z*.13)*.5+Math.sin(x*.07-z*.19)*.5)*.5+.5;
          c.setRGB(.10+.08*n+.07*t,.19+.10*n+.04*t,.10+.05*n);
          col[i*3]=c.r;col[i*3+1]=c.g;col[i*3+2]=c.b;
        }
        geo.setAttribute('color',new THREE.BufferAttribute(col,3));
        geo.computeVertexNormals();
        var m=mat(0xffffff,{r:1,env:.5});m.vertexColors=true;
        var o=new THREE.Mesh(geo,m);o.position.z=0;scene.add(o);o.receiveShadow=false;
      }
      hill(96,640);hill(-640,-226);
    })();

    /* ===== Hong Kong Island (south shore) ===== */
    var silver=mat(0xbcc6cf,{r:.3,m:.6,env:1.1});
    /* IFC Two + One */
    (function(){
      var g=group(-96,RW+26),m=glass(10,46,'#9fb5c4','#40586c',.5);
      box(13,100,13,m,0,50,0,g);
      var crown=cyl(4.4,9.2,12,4,m,0,106,0,g);crown.rotation.y=Math.PI/4;
      box(4,4,4,silver,0,114,0,g);
      cyl(.2,.3,8,6,silver,0,120,0,g);beacon(-96,125,RW+26);
      var g1=group(-110,RW+30),m1=glass(8,26,'#a8bccb','#4a6278',.5);
      box(11,52,11,m1,0,26,0,g1);
      var c1=cyl(4,8,6,4,m1,0,55,0,g1);c1.rotation.y=Math.PI/4;
      mast.ifc=[-96,114,RW+26];
    })();
    /* Bank of China: four triangular prisms */
    (function(){
      var g=group(-62,RW+30),m=glass(8,40,'#b7c0c8','#46586a',.5,{m:.65}),hs=[100,86,70,54],off=[[-4,-4],[4,-4],[-4,4],[4,4]];
      for(var i=0;i<4;i++){
        var pr=cyl(6.4,6.4,hs[i],3,m,off[i][0],hs[i]/2,off[i][1],g);pr.rotation.y=Math.PI/6+i*Math.PI/2;
      }
      cyl(.22,.35,16,6,silver,-4,hs[0]+8,-4,g);cyl(.22,.35,12,6,silver,4,hs[1]+6,-4,g);
      beacon(-66,hs[0]+16,RW+26);
      mast.boc=[-66,100,RW+26];
    })();
    /* Jardine-style slab, HSBC-style mid-rise */
    (function(){
      var g=group(-45,RW+14);box(20,50,15,glass(10,24,'#d5d8dc','#64707c',.5),0,25,0,g);
      var h=group(-30,RW+22);box(24,30,16,glass(10,14,'#aeb8c2','#4d5c6a',.5),0,15,0,h);
    })();
    /* Admiralty towers */
    (function(){
      var a=group(-28,RW+44),b=group(-4,RW+40);
      box(14,72,13,glass(7,34,'#95aabb','#41566a',.5),0,36,0,a);
      box(12,84,12,glass(6,40,'#8ba2b4','#3e5366',.5),9,42,-6,a);
      box(16,62,14,glass(8,30,'#a1b2c0','#47596a',.5),0,31,0,b);
      beacon(-19,86,RW+38);beacon(-28,74,RW+44);
    })();
    /* HKCEC: glass hall under sweeping roof shells */
    (function(){
      var g=group(5,RW+16);
      var body=glass(18,5,'#8fb9bb','#2a5e66',.7,{r:.12,m:.4,env:1.3});
      box(66,10,26,body,0,5,0,g);
      var roofM=mat(0xd6dce2,{r:.28,m:.7,env:1.3});
      var dome=new THREE.SphereGeometry(1,28,12,0,Math.PI*2,0,Math.PI/2);
      var d1=mesh(dome,roofM,-12,9,0,g);d1.scale.set(32,11,16);
      var d2=mesh(dome,roofM,24,9,-1,g);d2.scale.set(19,8,13);
      var slab=box(50,1.2,12,roofM,-10,10.6,-9,g);slab.rotation.x=.18;
      box(66,2,3,mat(0x9fb0b8,{r:.4,m:.4}),0,10.2,13.2,g);
    })();
    /* Central Plaza: golden triangular tower with pyramid and colour-changing mast */
    (function(){
      var g=group(45,RW+36),gold=glass(18,44,'#d1ad58','#6f5320',.55,{r:.18,m:.55,env:1.3}),dark=mat(0x8a6a28,{r:.3,m:.5});
      box(36,9,28,mat(0xcfc3ac,{r:.7}),0,4.5,0,g);
      var s=cyl(9,9,84,3,gold,0,42+4,0,g);s.rotation.y=Math.PI/6;
      var s2=cyl(7.2,7.2,5,3,dark,0,89.5,0,g);s2.rotation.y=Math.PI/6;
      var pyr=cyl(.1,7.4,10,3,dark,0,97,0,g);pyr.rotation.y=Math.PI/6;
      cyl(.25,.45,14,6,silver,0,109,0,g);
      mast.cpMat=new THREE.MeshBasicMaterial({color:0xff4040});
      var neon=cyl(.5,.5,12,8,mast.cpMat,0,112,0,g);
      mast.cp=[45,118,RW+36];
      beacon(45,118,RW+36);
    })();
    /* Wan Chai neighbours: dark tower with LED panel, golden mid-rises, round tower behind */
    (function(){
      var g=group(88,RW+30);
      box(22,84,20,glass(10,40,'#1d2b3a','#6e8fb4',.55,{m:.6}),0,42,0,g);
      var led=mat(0x221100,{e:0xffb020,k:1.1});box(20,5,.6,led,0,86,-10.4,g);
      var a=group(62,RW+34);box(18,66,16,glass(9,32,'#c2a152','#6f5624',.5),0,33,0,a);
      var r=group(20,RW+75);cyl(11,11,58,20,glass(24,26,'#b9bdc2','#5a6671',.55),0,29,0,r);
      beacon(88,88,RW+30);beacon(20,60,RW+75);
    })();

    /* ===== Kowloon (north shore) ===== */
    (function(){
      var g=group(-165,-(RW+36)),m=glass(10,36,'#2b3f55','#7aaedc',.55,{m:.6,env:1.2});
      box(22,64,22,m,0,32,0,g);box(19,44,19,m,0,86,0,g);box(15,22,15,m,0,119,0,g);
      var crown=mat(0x102030,{e:0x5fa8ff,k:1.2});box(9,10,9,crown,0,135,0,g);
      cyl(.25,.4,12,6,silver,0,146,0,g);beacon(-165,152,-(RW+36));
      mast.icc=[-165,140,-(RW+36)];
    })();
    (function(){
      var g=group(-6,-(RW+14));
      var wall=mat(0xcbb9a2,{r:.8});box(60,12,26,wall,0,6,0,g);
      var roof=box(64,3,34,mat(0xb48f78,{r:.75}),0,15,-1,g);roof.rotation.x=-.16;
      var d=group(-38,-(RW+12));var dome=mesh(new THREE.SphereGeometry(1,24,12,0,Math.PI*2,0,Math.PI/2),mat(0xeef0f2,{r:.4,m:.2}),0,0,0,d);dome.scale.set(11,9,11);
      var t=group(-22,-(RW+8));
      box(4.4,18,4.4,mat(0xa4503a,{r:.8}),0,9,0,t);
      cyl(0,3.4,6,4,mat(0x5a4a42,{r:.7}),0,21,0,t).rotation.y=Math.PI/4;
      var f=group(-21,-(RW+3));box(16,2,7,mat(0xbfc4c8,{r:.6}),0,1,0,f);
      var pen=group(14,-(RW+30));box(42,26,16,glass(14,10,'#e8dcc0','#6b6355',.45,{m:.1,r:.5,env:.9}),0,13,0,pen);
      cyl(0,10,6,4,mat(0x6d8f7a,{r:.7}),0,29,0,pen).rotation.y=Math.PI/4;
      var hc=group(-96,-(RW+22));box(100,22,22,glass(40,9,'#d8dde2','#6b7884',.5,{m:.3,r:.3}),0,11,0,hc);
    })();

    /* ===== neon signs on the harbour-facing rows ===== */
    (function(){
      var cols=[0xff2a2a,0x2ad4ff,0xff3bd1,0xffd02a,0x39ff6a,0xffffff];
      var mats=cols.map(function(c){return mat(0x151515,{e:c,k:1.3})});
      (window.CITY.signs||[]).forEach(function(s){
        var m=mesh(new THREE.BoxGeometry(s.w,s.h,.3),mats[s.c],s.x,s.y,s.z);m.castShadow=false;
      });
    })();

    /* ===== promenade lights ===== */
    for(var x=-190;x<=190;x+=2.8){E.addXmas(x,2.9,-(RW+1.2));E.addXmas(x,2.9,RW+1.2)}
    for(var x2=-190;x2<=190;x2+=7){E.addLamp(x2,4.2,-(RW+2.4));E.addLamp(x2,4.2,RW+2.4)}
    E.lineXmas([-96-5,2,RW+20],[-96-5,112,RW+20],4);E.lineXmas([-165-6,2,-(RW+30)],[-165-6,128,-(RW+30)],4);

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
        scene.add(g);ferries.push({g:g,ph:i*Math.PI});
      }
    })();

    /* ===== light show beams ===== */
    (function(){
      var geo=new THREE.CylinderGeometry(2.6,.15,170,10,1,true);geo.translate(0,85,0);
      var vs='varying float vH;void main(){vH=uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}';
      var fs='precision highp float;varying float vH;uniform vec3 uC;uniform float uA;void main(){float a=pow(1.0-vH,1.3)*0.42*uA;gl_FragColor=vec4(uC*a*1.6,a);}';
      var src=[mast.ifc,mast.boc,mast.cp,mast.icc,[-96,24,-(RW+22)],[-6,22,-(RW+14)]];
      src.forEach(function(p,i){
        var m=new THREE.ShaderMaterial({uniforms:{uC:{value:new THREE.Color(1,1,1)},uA:{value:0}},vertexShader:vs,fragmentShader:fs,transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
        var b=new THREE.Mesh(geo,m);b.position.set(p[0],p[1],p[2]);b.frustumCulled=false;b.visible=false;scene.add(b);beams.push({o:b,m:m,i:i});
      });
    })();

    return {
      /* the engine calls these hooks */
      addBoats:function(B){
        /* red-sailed junk */
        var g=new THREE.Group(),hullM=mat(0x4a2e1e,{r:.8}),sailM=mat(0xc8231b,{e:0xff3a22,k:.25,r:.85}),wood=mat(0x2c1c12,{r:.9});
        B.box(13,2,4.4,hullM,0,1.3,0,g);B.box(4,2.6,4.2,hullM,-5.6,2.6,0,g);B.cyl(0,2.2,3,4,hullM,7,1.3,0,g).rotation.z=-Math.PI/2;
        [[-2.4,12],[2.8,10]].forEach(function(s){
          B.cyl(.18,.22,s[1]+3,6,wood,s[0],(s[1]+3)/2+1,0,g);
          var sl=B.box(.12,s[1],4.8,sailM,s[0]+.3,s[1]/2+3,0,g);sl.rotation.y=.12;
          for(var k=1;k<5;k++){var bt=B.box(.2,.2,5,wood,s[0]+.32,3+k*s[1]/5,0,g);bt.rotation.y=.12}
        });
        g.position.set(-30,.1,-26);scene.add(g);
        B.boats.push({g:g,sp:1.5,bob:1.7,cab:sailM});
      },
      onTime:function(){},
      onLamp:function(){},
      onFrame:function(t,fx,env,hour){
        /* Central Plaza mast cycles colour with the hour */
        if(mast.cpMat)mast.cpMat.color.setHSL((hour*.31)%1,1,.38+.28*env.night);
        /* Star Ferry shuttles between the piers */
        for(var i=0;i<ferries.length;i++){
          var f=ferries[i],u=Math.sin(t*.07+f.ph)*.5+.5,u2=Math.sin(t*.07+f.ph+.01)*.5+.5;
          var x0=-22,z0=-(RW-4),x1=-52,z1=RW-4;
          var px=lerp(x0,x1,u),pz=lerp(z0,z1,u);
          var dx=lerp(x0,x1,u2)-px,dz=lerp(z0,z1,u2)-pz;
          f.g.position.set(px,.1+Math.sin(t*1.2+i)*.05,pz);
          if(Math.abs(dx)+Math.abs(dz)>1e-6)f.g.rotation.y=Math.atan2(-dz,dx);
        }
        /* light-show beams, night only */
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
