/* Grok Crawler — aranha digital sobre a própria página. Só deteta, nunca clica. */
(()=>{'use strict';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.min(b,Math.max(a,v)),lerp=(a,b,t)=>a+(b-a)*t,KEY='gc_crawler_on';
const RMq=matchMedia('(prefers-reduced-motion: reduce)');let RM=RMq.matches;RMq.addEventListener&&RMq.addEventListener('change',e=>RM=e.matches);
const COR={vermelho:'#ff4d4d',azul:'#5ab8ff',verde:'#4be08a',dourado:'#ffd24a'},NOME={vermelho:'Vermelho',azul:'Azul',verde:'Verde',dourado:'Dourado'};
const TRUST=/(^|\.)(github\.io|github\.com|githubusercontent\.com|virustotal\.com|osirisai\.live|open-meteo\.com|usgs\.gov|duckduckgo\.com|google\.com|youtube\.com|wikipedia\.org)$/i;
// classificação (heurística, só pelo endereço — não abre nada)
function classify(u,fav){let x;try{x=new URL(u)}catch(e){return['vermelho','endereço inválido']}
if(x.protocol!=='https:')return['vermelho','sem HTTPS'];if(/^\d+\.\d+\.\d+\.\d+$/.test(x.hostname))return['vermelho','endereço IP'];
if(fav)return['dourado','favorito com HTTPS'];if(TRUST.test(x.hostname))return['verde','HTTPS, domínio conhecido'];return['azul','HTTPS, domínio por confirmar']}
// UI
const css=document.createElement('style');css.textContent=`
#gcv{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:5}
#gcp{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));z-index:8;width:min(320px,calc(100vw - 20px));background:rgba(13,17,23,.92);color:#e6edf3;border:1px solid #30363d;border-radius:14px;font:15px -apple-system,system-ui,sans-serif;box-shadow:0 6px 24px #0007;-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px)}
#gcp .bar{display:flex;gap:6px;padding:6px}#gcp button{min-height:44px;border-radius:10px;border:1px solid #30363d;background:#21262d;color:#e6edf3;font:600 15px system-ui;padding:0 10px;touch-action:manipulation;cursor:pointer}
#gcOn{flex:1}#gcOn.on{background:#238636;color:#fff}#gcGrok{min-width:96px;letter-spacing:.06em}#gcGrok.man{background:#ffc85a;color:#111}#gcGrok.auto{background:#5cf2c4;color:#06231b}
#gcp .cnt{display:flex;gap:10px;padding:0 10px 6px;flex-wrap:wrap}#gcp .cnt span{display:inline-flex;align-items:center;gap:4px}#gcp i{width:12px;height:12px;border-radius:50%;display:inline-block}
#gcp details{border-top:1px solid #30363d}#gcp summary{min-height:44px;display:flex;align-items:center;padding:0 10px;cursor:pointer;color:#8b949e}
#gcL{list-style:none;margin:0;padding:0 10px 8px;max-height:min(40vh,260px);overflow:auto;font-size:14px}#gcL li{padding:5px 0;border-bottom:1px solid #21262d;display:flex;gap:8px;align-items:baseline}#gcL li i{flex:0 0 12px}#gcL small{color:#8b949e}
#gcp .st{padding:0 10px 6px;color:#8b949e;font-size:13px}
.gc-hit{outline:2px solid var(--gcc)!important;outline-offset:2px;transition:outline-color .2s}
@media (prefers-reduced-motion:reduce){.gc-hit{transition:none}}`;document.head.appendChild(css);
const cv=document.createElement('canvas');cv.id='gcv';cv.setAttribute('aria-hidden','true');document.body.appendChild(cv);const ctx=cv.getContext('2d');
const pn=document.createElement('div');pn.id='gcp';pn.setAttribute('role','region');pn.setAttribute('aria-label','Grok Crawler');
pn.innerHTML=`<div class="bar"><button id="gcOn" aria-pressed="true"></button><button id="gcGrok" title="Alternar AUTOMÁTICO / MANUAL"></button></div>
<div class="cnt" id="gcC"></div><div class="st" id="gcS"></div><details id="gcD"><summary>Links detetados</summary><ul id="gcL"></ul></details>`;document.body.appendChild(pn);
const $=id=>document.getElementById(id);
let on=localStorage.getItem(KEY)!=='0',mode='auto',W=0,H=0,dp=1;
function size(){dp=Math.min(2,devicePixelRatio||1);W=innerWidth;H=innerHeight;cv.width=W*dp;cv.height=H*dp;ctx.setTransform(dp,0,0,dp,0,0)}
// alvos
let T=[];// {el,kind:'card'|'ui',cls,why,title,url,card}
function scan(){T=[];document.querySelectorAll('#list .link').forEach(card=>{const u=(card.querySelector('.u')||{}).textContent||'',t=(card.querySelector('.t')||{}).textContent||u,fav=(card.querySelector('.fav')||{}).textContent==='★';
const[c,why]=classify(u,fav);card.dataset.gcClass=c;T.push({el:card,kind:'card',cls:c,why,title:t,url:u});
card.querySelectorAll('a.btn,.cp').forEach(b=>T.push({el:b,kind:'btn',cls:c,card}))});
document.querySelectorAll('main > .row button, main > .row a, #sf input, #sf button, #flt, #onlyFav, #af input, #af button, #pad, .tools button').forEach(el=>T.push({el,kind:'ui',cls:null}));
lastHit=null;rects(true);renderPanel()}
let rectT=0;function rects(force){if(!force&&performance.now()-rectT<120)return;rectT=performance.now();for(const t of T){const r=t.el.getBoundingClientRect();t.r=r;t.vis=r.width>0&&r.bottom>0&&r.top<H&&r.right>0&&r.left<W;t.cx=r.left+r.width/2;t.cy=r.top+r.height/2}}
// aranha
const S={x:innerWidth*.5,y:innerHeight*.4,ang:0,R:120,Rb:120,t:0,tx:0,ty:0,goal:null,wait:0},seen=new Set(),detected=new Set();
const L1=19,L2=25,legs=[];for(let i=0;i<8;i++){const side=i<4?-1:1,k=i%4;legs.push({side,k,a:side*(.45+k*.42),foot:{x:S.x,y:S.y},from:{x:0,y:0},to:{x:0,y:0},lift:0,ph:(k+(side>0?.5:0))%2})}
function rest(g){const a=S.ang+g.side*(.55+g.k*.62),d=g.k===0||g.k===3?42:38;return{x:S.x+Math.cos(a)*d,y:S.y+Math.sin(a)*d}}
legs.forEach(g=>{const r=rest(g);g.foot.x=r.x;g.foot.y=r.y});
function legIK(g,hx,hy,fx,fy){const dx=fx-hx,dy=fy-hy,d=clamp(Math.hypot(dx,dy)||.001,Math.abs(L1-L2)+1,L1+L2-.5),a=Math.atan2(dy,dx),th=Math.acos(clamp((L1*L1+d*d-L2*L2)/(2*L1*d),-1,1)),s=g.side;return[hx+Math.cos(a-s*th)*L1,hy+Math.sin(a-s*th)*L1]}
// ponteiro (dedo / Apple Pencil) — só escuta, passivo, nunca impede toques nem scroll
const P={x:0,y:0,type:'',down:false,ps:0,tiltX:0,tiltY:0,last:0,penT:0,hover:false};
function onPtr(e){if(!on||mode!=='manual')return;if(e.pointerType==='pen')P.penT=performance.now();
if(e.pointerType==='touch'){if(performance.now()-P.penT<1200)return;/* rejeição da palma */if((e.width||0)>45||(e.height||0)>45)return;if(!e.isPrimary)return}
P.type=e.pointerType;P.x=e.clientX;P.y=e.clientY;P.last=performance.now();P.down=e.buttons>0||e.type==='pointerdown';P.hover=e.pointerType==='pen'&&!P.down;
P.ps=e.pointerType==='pen'&&P.down?(e.pressure||.5):0;P.tiltX=e.tiltX||0;P.tiltY=e.tiltY||0}
['pointerdown','pointermove'].forEach(t=>addEventListener(t,onPtr,{passive:true,capture:true}));addEventListener('touchmove',e=>{if(!on||mode!=='manual')return;const t=e.touches[0];if(!t||e.touches.length>1)return;if(t.touchType==='stylus'){P.penT=performance.now()}else{if(performance.now()-P.penT<1200)return;if((t.radiusX||0)>45)return}P.x=t.clientX;P.y=t.clientY;P.last=performance.now()},{passive:true,capture:true});
addEventListener('pointerup',e=>{P.down=false;P.ps=0},{passive:true,capture:true});
// automático: escolhe o alvo visível mais próximo ainda não visitado
function pick(){const v=T.filter(t=>t.vis&&t.kind!=='btn');if(!v.length){S.goal=null;S.tx=W*(.2+Math.random()*.6);S.ty=H*(.2+Math.random()*.6);return}
let c=v.filter(t=>!seen.has(t.el));if(!c.length){seen.clear();c=v}c.sort((a,b)=>Math.hypot(a.cx-S.x,a.cy-S.y)-Math.hypot(b.cx-S.x,b.cy-S.y));const g=c[Math.min(c.length-1,Math.floor(Math.random()*2))];S.goal=g;seen.add(g.el)}
let lastHit=null,hitKey='';
function step(){S.t++;rects();let tx,ty,sp;
if(mode==='manual'&&P.last){tx=P.x;ty=P.y;sp=.25;const tl=Math.hypot(P.tiltX,P.tiltY);S.R=lerp(S.R,clamp(S.Rb*(P.type==='pen'?(P.down?.7+P.ps*1.1:1.15):1)+tl*.6,50,260),.15)}
else{if(mode==='manual'){tx=S.x;ty=S.y}else{if(!S.goal||!S.goal.vis){if(S.goal&&!S.goal.vis)S.goal=null;if(--S.wait<=0||!S.goal)pick()}
if(S.goal){tx=S.goal.cx;ty=S.goal.cy;if(Math.hypot(tx-S.x,ty-S.y)<20){if(S.wait<=0)S.wait=RM?40:70;if(--S.wait<=0)pick()}}else{tx=S.tx;ty=S.ty;if(Math.hypot(tx-S.x,ty-S.y)<20)pick()}}
sp=RM?.02:.045;S.R=lerp(S.R,S.Rb,.05)}
tx=clamp(tx,10,W-10);ty=clamp(ty,10,H-10);const dx=tx-S.x,dy=ty-S.y,d=Math.hypot(dx,dy),mx=RM?2:(mode==='manual'?40:5.5);let vx=dx*sp,vy=dy*sp;const vm=Math.hypot(vx,vy);if(vm>mx){vx*=mx/vm;vy*=mx/vm}
S.x+=vx;S.y+=vy;if(d>2){const df=((Math.atan2(dy,dx)-S.ang+Math.PI)%TAU+TAU)%TAU-Math.PI;S.ang+=df*.15}
// patas
let moving=0;legs.forEach(g=>{if(g.lift>0){g.lift+=RM?.25:.18;const t=Math.min(1,g.lift);g.foot.x=lerp(g.from.x,g.to.x,t);g.foot.y=lerp(g.from.y,g.to.y,t);if(t>=1)g.lift=0;moving++}});
legs.forEach(g=>{const r=rest(g);if(Math.hypot(r.x-g.foot.x,r.y-g.foot.y)>70){g.foot.x=r.x;g.foot.y=r.y;g.lift=0;return}if(g.lift===0&&Math.hypot(r.x-g.foot.x,r.y-g.foot.y)>22&&moving<4){g.from={x:g.foot.x,y:g.foot.y};g.to={x:r.x+(r.x-g.foot.x)*.3,y:r.y+(r.y-g.foot.y)*.3};g.lift=.01;moving++}});
// deteção
const R=Math.max(0,S.R);detected.clear();for(const t of T){if(!t.vis)continue;const nx=clamp(S.x,t.r.left,t.r.right),ny=clamp(S.y,t.r.top,t.r.bottom);if(Math.hypot(nx-S.x,ny-S.y)<=R)detected.add(t)}
const k=[...detected].filter(t=>t.kind==='card').map(t=>t.url).join('|');if(k!==hitKey){hitKey=k;document.querySelectorAll('.gc-hit').forEach(e=>e.classList.remove('gc-hit'));detected.forEach(t=>{if(t.kind==='card'){t.el.style.setProperty('--gcc',COR[t.cls]);t.el.classList.add('gc-hit')}});renderPanel()}}
function arc(x,y,r,a,b){ctx.arc(x,y,Math.max(0,r),a,b)}
function draw(){ctx.clearRect(0,0,W,H);const man=mode==='manual',rc=man?'255,200,90':'92,242,196',R=Math.max(1,S.R),br=RM?0:Math.sin(S.t*.05);
const ghost=man&&P.hover&&performance.now()-P.last<500;
const g=ctx.createRadialGradient(S.x,S.y,0,S.x,S.y,R);g.addColorStop(0,`rgba(${rc},${.1+P.ps*.1})`);g.addColorStop(1,`rgba(${rc},0)`);ctx.fillStyle=g;ctx.beginPath();arc(S.x,S.y,R,0,TAU);ctx.fill();
ctx.setLineDash(ghost?[8,8]:[3,6]);ctx.strokeStyle=`rgba(${rc},${.4+br*.1})`;ctx.lineWidth=1+P.ps*2.5;ctx.beginPath();arc(S.x,S.y,R,RM?0:S.t*.01,(RM?0:S.t*.01)+TAU);ctx.stroke();ctx.setLineDash([]);
if(!RM){const k=(S.t%130)/130;ctx.strokeStyle=`rgba(${rc},${(1-k)*.3})`;ctx.lineWidth=1.2;ctx.beginPath();arc(S.x,S.y,R*k,0,TAU);ctx.stroke()}
// fios para o que foi detetado
ctx.lineCap='round';detected.forEach(t=>{const c=t.cls?COR[t.cls]:`rgb(${rc})`;ctx.strokeStyle=c;ctx.globalAlpha=t.kind==='btn'?.45:.85;ctx.lineWidth=t.kind==='card'?2:1;
const sag=8+(RM?0:Math.sin(S.t*.03+t.cx)*3);ctx.beginPath();ctx.moveTo(S.x,S.y);ctx.quadraticCurveTo((S.x+t.cx)/2,(S.y+t.cy)/2+sag,t.cx,t.cy);ctx.stroke();
ctx.fillStyle=c;ctx.beginPath();arc(t.cx,t.cy,t.kind==='card'?4:2.5,0,TAU);ctx.fill();
if(t.kind==='card'&&t.cls==='dourado'&&!RM){ctx.globalAlpha=.35+.25*Math.sin(S.t*.08);ctx.strokeStyle=c;ctx.lineWidth=3;ctx.strokeRect(t.r.left-4,t.r.top-4,t.r.width+8,t.r.height+8)}});ctx.globalAlpha=1;
if(ghost){ctx.fillStyle=`rgba(${rc},.9)`;ctx.font='12px ui-monospace,Menlo,monospace';ctx.textAlign='center';ctx.fillText('a pairar · Apple Pencil',S.x,S.y-R-8)}
// patas
legs.forEach(gl=>{const hx=S.x+Math.cos(S.ang)*(1.5-gl.k)*4,hy=S.y+Math.sin(S.ang)*(1.5-gl.k)*4,[kx,ky]=legIK(gl,hx,hy,gl.foot.x,gl.foot.y),lift=gl.lift?Math.sin(Math.min(1,gl.lift)*Math.PI)*6:0;
ctx.strokeStyle='#0b0f14';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(kx,ky-lift);ctx.lineTo(gl.foot.x,gl.foot.y-lift);ctx.stroke();
ctx.strokeStyle=`rgb(${rc})`;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(kx,ky-lift);ctx.lineTo(gl.foot.x,gl.foot.y-lift);ctx.stroke()});
// corpo
ctx.save();ctx.translate(S.x,S.y);ctx.rotate(S.ang);ctx.fillStyle='#0b0f14';ctx.strokeStyle=`rgb(${rc})`;ctx.lineWidth=2;
ctx.beginPath();ctx.ellipse(-12,0,Math.max(0,15),Math.max(0,11),0,0,TAU);ctx.fill();ctx.stroke();ctx.beginPath();ctx.ellipse(7,0,Math.max(0,9),Math.max(0,8),0,0,TAU);ctx.fill();ctx.stroke();
ctx.fillStyle='#ff4f8b';ctx.beginPath();arc(-12,0,3.5+(RM?0:br),0,TAU);ctx.fill();ctx.fillStyle=`rgb(${rc})`;[[11,-3],[11,3]].forEach(([x,y])=>{ctx.beginPath();arc(x,y,2,0,TAU);ctx.fill()});ctx.restore()}
// painel
function renderPanel(){const cards=T.filter(t=>t.kind==='card'),c={vermelho:0,azul:0,verde:0,dourado:0};cards.forEach(t=>c[t.cls]++);
$('gcC').innerHTML=Object.keys(c).map(k=>`<span title="${NOME[k]}"><i style="background:${COR[k]}"></i>${NOME[k]} <b data-c="${k}">${c[k]}</b></span>`).join('');
const det=[...detected].filter(t=>t.kind==='card');$('gcS').textContent=on?`${cards.length} links classificados · ${det.length} no raio agora · modo ${mode==='auto'?'AUTOMÁTICO':'MANUAL'}`:'Crawler desligado';
const L=$('gcL');L.innerHTML='';cards.forEach(t=>{const li=document.createElement('li');li.innerHTML='<i></i><span><b></b><br><small></small></span>';li.querySelector('i').style.cssText=`background:${COR[t.cls]};height:12px;border-radius:50%`;li.querySelector('b').textContent=(detected.has(t)?'● ':'')+t.title;li.querySelector('small').textContent=NOME[t.cls]+' — '+t.why;L.appendChild(li)})}
function ui(){$('gcOn').textContent=on?'🕷️ Crawler ligado':'🕷️ Crawler desligado';$('gcOn').classList.toggle('on',on);$('gcOn').setAttribute('aria-pressed',on);
$('gcGrok').textContent=mode==='auto'?'GROK · AUTO':'GROK · MANUAL';$('gcGrok').className=mode==='auto'?'auto':'man';$('gcGrok').disabled=!on;cv.style.display=on?'':'none';
if(!on){document.querySelectorAll('.gc-hit').forEach(e=>e.classList.remove('gc-hit'));hitKey=''}renderPanel()}
$('gcOn').onclick=()=>{on=!on;try{localStorage.setItem(KEY,on?'1':'0')}catch(e){}ui();loop()};
$('gcGrok').onclick=()=>{mode=mode==='auto'?'manual':'auto';P.last=0;S.goal=null;ui()};
addEventListener('keydown',e=>{if(e.target.closest('input,textarea,select'))return;if(e.key==='m'||e.key==='M')$('gcGrok').click();if(e.key==='+')S.Rb=Math.min(260,S.Rb+15);if(e.key==='-')S.Rb=Math.max(50,S.Rb-15)});
// re-scan quando a lista muda
let mt;new MutationObserver(()=>{clearTimeout(mt);mt=setTimeout(scan,60)}).observe($('list'),{childList:true,subtree:true,characterData:true});
addEventListener('scroll',()=>rects(true),{passive:true});addEventListener('resize',()=>{size();rects(true)});
if(innerWidth<900)$('gcD').open=false;
let raf=0;function frame(){raf=0;if(!on||document.hidden)return;step();draw();raf=requestAnimationFrame(frame)}
function loop(){if(!raf&&on&&!document.hidden)raf=requestAnimationFrame(frame)}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&raf){cancelAnimationFrame(raf);raf=0}else loop()});
size();scan();ui();loop();
window.GC={get targets(){return T},get detected(){return detected},get state(){return{on,mode,x:S.x,y:S.y,R:S.R}},scan};
})();
