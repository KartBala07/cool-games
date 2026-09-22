'use strict';
const $ = id => document.getElementById(id);
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const random = (a,b) => a+Math.random()*(b-a);
const W=420,H=560;
let unlocked=false,pin='',checking=false,epoch=0,game=null,selected=null,playing=false,paused=false,frame=0,lastFrame=0,webTimer=0,webStack=[],webIndex=-1;
const held=new Set();
const catalog=[
 {id:'drift',title:'Neon Drift',tag:'RACE • SURVIVE',accent:'#c8fb63',help:'Drag to steer, or use ← →. Dodge traffic and collect the glowing rings.',controls:['left','right']},
 {id:'bricks',title:'Brick Burst',tag:'AIM • DESTROY',accent:'#b5a0ff',help:'Drag the paddle, or use ← →. Clear every brick. You have three lives.',controls:['left','right']},
 {id:'snake',title:'Glow Snake',tag:'EAT • GROW',accent:'#64edc3',help:'Swipe, use the arrows, or tap the controls. Eat the light. Avoid walls and your tail.',controls:['left','up','down','right']},
 {id:'orbit',title:'Orbit Rush',tag:'DODGE • COLLECT',accent:'#6ccbff',help:'Drag your ship or use the arrows. Dodge asteroids and collect energy.',controls:['left','up','down','right']},
 {id:'stack',title:'Sky Stack',tag:'TIME • BUILD',accent:'#ffae82',help:'Tap the arena or press Space to drop a block. Line it up and build higher.',controls:[]},
 {id:'merge',title:'Merge 2048',tag:'SLIDE • COMBINE',accent:'#f0d273',help:'Swipe or use the arrows. Matching tiles merge. Reach 2048, then keep going.',controls:['left','up','down','right']}
];
function best(id){try{return Number(localStorage.getItem('cool-games-best-'+id))||0;}catch{return 0;}}
function saveBest(){if(!game||!selected)return;const n=Math.floor(game.score);if(n>best(selected.id)){try{localStorage.setItem('cool-games-best-'+selected.id,String(n));}catch{}}}
function setScore(){if(!game||!selected)return;$('score').textContent=Math.floor(game.score);$('best').textContent=Math.max(best(selected.id),Math.floor(game.score));$('extra-stat').textContent=game.extra;}
function drawDots(){[...$('pin-dots').children].forEach((dot,i)=>dot.classList.toggle('filled',i<pin.length));$('pin-dots').setAttribute('aria-label',`${pin.length} of 4 digits entered`);}
function lock(){
  epoch++;unlocked=false;pin='';checking=false;playing=false;paused=false;held.clear();pointerStart=null;cancelAnimationFrame(frame);saveBest();game=null;selected=null;
  clearTimeout(webTimer);webStack=[];webIndex=-1;const webFrame=$('web-frame');webFrame.onload=null;webFrame.src='about:blank';
  $('arcade').hidden=true;$('web-screen').hidden=true;$('lock-screen').hidden=false;
  $('play-screen').hidden=true;$('library').hidden=false;$('pin-message').textContent='Enter your four-digit passcode.';
  $('keypad').classList.remove('error');$('install-dialog').close();drawDots();
}
async function digit(d){
 if(unlocked||checking||$('lock-screen').hidden||pin.length>=4)return;
 pin+=d;drawDots();if(pin.length!==4)return;
 checking=true;const checkEpoch=epoch;const input=pin;pin='';
 try{
  const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));
  const hash=[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
  if(checkEpoch!==epoch||document.hidden)return;
  if(hash===GAME_PIN_HASH){unlocked=true;$('lock-screen').hidden=true;$('arcade').hidden=false;$('library').hidden=false;window.scrollTo(0,0);}
  else if(hash===WEB_PIN_HASH){unlocked=true;$('lock-screen').hidden=true;$('arcade').hidden=true;$('web-screen').hidden=false;openWeb('https://www.instagram.com',false);}
  else{$('pin-message').textContent="That code didn't match. Try again.";$('keypad').classList.remove('error');void $('keypad').offsetWidth;$('keypad').classList.add('error');}
 }catch{$('pin-message').textContent='Open this site using HTTPS to unlock.';}
 finally{if(checkEpoch===epoch){checking=false;drawDots();}}
}
const GAME_PIN_HASH='9589262630f775d921bef5b9b2d36fa40f91afebeab887deefc721ff3c787b2c';
const WEB_PIN_HASH='255afccc8af662895c98741bca9fb9213750b070d1c945061edf6bb6270b6a74';
const WEB_HISTORY_KEY='cool-games-web-history',WEB_BOOKMARK_KEY='cool-games-web-bookmarks';
const WEB_BLOCKERS=['instagram.com','facebook.com','google.com','youtube.com','x.com','twitter.com','tiktok.com','reddit.com','linkedin.com','discord.com','whatsapp.com','duckduckgo.com','bing.com','yahoo.com'];
function toWebUrl(value){const raw=String(value||'').trim();if(!raw)return '';if(/^https?:\/\//i.test(raw))return raw;if(/^[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/.test(raw))return 'https://'+raw;return 'https://duckduckgo.com/?q='+encodeURIComponent(raw);}
function webHost(url){try{return new URL(url).hostname.replace(/^www\./,'');}catch{return String(url||'');}}
function webRead(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch{return fallback;}}
function webWrite(key,value){try{localStorage.setItem(key,JSON.stringify(value));}catch{}}
function webClear(node){if(node.replaceChildren)node.replaceChildren();else node.textContent='';}
function webIsBlocked(url){const host=webHost(url).toLowerCase();return WEB_BLOCKERS.some(b=>host===b||host.endsWith('.'+b));}
function webAgo(ts){const s=Math.max(1,Math.floor((Date.now()-(ts||Date.now()))/1000));if(s<60)return s+'s ago';const m=Math.floor(s/60);if(m<60)return m+'m ago';const h=Math.floor(m/60);if(h<24)return h+'h ago';return Math.floor(h/24)+'d ago';}
function webRemember(url){const list=webRead(WEB_HISTORY_KEY,[]).filter(entry=>entry.url!==url);list.unshift({url,host:webHost(url),ts:Date.now()});webWrite(WEB_HISTORY_KEY,list.slice(0,300));}
function webDelete(url){webWrite(WEB_HISTORY_KEY,webRead(WEB_HISTORY_KEY,[]).filter(entry=>entry.url!==url));webRenderStart();}
function webClearHistory(){webWrite(WEB_HISTORY_KEY,[]);webRenderStart();}
function webBookmarked(url){return webRead(WEB_BOOKMARK_KEY,[]).some(entry=>entry.url===url);}
function webToggleBookmark(){const url=$('web-address').value;if(!url)return;const list=webRead(WEB_BOOKMARK_KEY,[]);const next=webBookmarked(url)?list.filter(entry=>entry.url!==url):[{url,host:webHost(url),ts:Date.now()}].concat(list);webWrite(WEB_BOOKMARK_KEY,next.slice(0,120));webUpdateStar();webRenderStart();}
function webUpdateStar(){const marked=webBookmarked($('web-address').value);$('web-star').textContent=marked?'★':'☆';$('web-star').setAttribute('aria-label',marked?'Remove bookmark':'Bookmark this page');}
function webFillList(node,entries,emptyText,onRemove){webClear(node);if(!entries.length){const p=document.createElement('p');p.className='web-empty';p.textContent=emptyText;node.append(p);return;}for(const entry of entries){const li=document.createElement('li');const go=document.createElement('button');go.type='button';go.className='web-entry';const host=document.createElement('strong');host.textContent=entry.host||webHost(entry.url);const detail=document.createElement('span');detail.textContent=entry.url;const when=document.createElement('em');when.textContent=webAgo(entry.ts);go.append(host,detail,when);go.addEventListener('click',()=>openWeb(entry.url));const del=document.createElement('button');del.type='button';del.className='web-delete';del.setAttribute('aria-label','Delete '+entry.url);del.textContent='✕';del.addEventListener('click',event=>{event.stopPropagation();onRemove(entry.url);});li.append(go,del);node.append(li);}}
function webRenderStart(){const history=webRead(WEB_HISTORY_KEY,[]);const bookmarks=webRead(WEB_BOOKMARK_KEY,[]);$('web-history-wrap').hidden=!history.length;$('web-bookmarks-wrap').hidden=!bookmarks.length;webFillList($('web-history-list'),history,'No sites visited yet.',webDelete);webFillList($('web-bookmark-list'),bookmarks,'No bookmarks yet.',url=>{webWrite(WEB_BOOKMARK_KEY,webRead(WEB_BOOKMARK_KEY,[]).filter(entry=>entry.url!==url));webUpdateStar();webRenderStart();});const suggestions=$('web-suggestions');webClear(suggestions);for(const entry of bookmarks.concat(history).slice(0,40)){const option=document.createElement('option');option.value=entry.url;suggestions.append(option);}}
function showWebNotice(url){
  if(webIsBlocked(url)){$('web-blocked-host').textContent=webHost(url)+' blocks embedding';$('web-blocked-text').textContent='This site refuses to load inside another site, so it can only open in a new tab. Your history and bookmarks stay here in Cool Games.';$('web-blocked').hidden=false;$('web-notice').hidden=true;}
  else{$('web-notice-text').textContent='Still blank? '+webHost(url)+' may block embedding. Open it in a new tab.';$('web-notice').hidden=false;}
}
function updateWebButtons(){$('web-back-page').disabled=webIndex<=0;$('web-forward-page').disabled=webIndex>=webStack.length-1;}
function openWeb(value,remember=true){
  const url=toWebUrl(value);if(!url)return;
  if(remember){webStack=webStack.slice(0,webIndex+1);webStack.push(url);webIndex=webStack.length-1;}
  webRemember(url);
  $('web-address').value=url;$('web-start-page').hidden=true;$('web-notice').hidden=true;$('web-blocked').hidden=true;$('web-loading').hidden=false;
  const f=$('web-frame');clearTimeout(webTimer);f.onload=null;
  if(webIsBlocked(url)){f.hidden=true;f.src='about:blank';$('web-loading').hidden=true;showWebNotice(url);}
  else{
    f.hidden=false;
    f.onload=()=>{clearTimeout(webTimer);$('web-loading').hidden=true;};
    webTimer=setTimeout(()=>{$('web-loading').hidden=true;if(!f.hidden)showWebNotice(url);},6000);
    try{f.src=url;}catch{showWebNotice(url);}
  }
  webUpdateStar();updateWebButtons();webRenderStart();
}
function webGo(delta){const next=webIndex+delta;if(next<0||next>=webStack.length)return;webIndex=next;openWeb(webStack[webIndex],false);}
function webStart(){clearTimeout(webTimer);const f=$('web-frame');f.onload=null;f.src='about:blank';f.hidden=true;$('web-loading').hidden=true;$('web-notice').hidden=true;$('web-blocked').hidden=true;$('web-start-page').hidden=false;$('web-address').value='';webStack=[];webIndex=-1;webUpdateStar();updateWebButtons();webRenderStart();}
function webOpenTab(){const url=$('web-address').value||'';const open=window.open||function(){};if(url)open.call(window,url,'_blank','noopener,noreferrer');}
$('web-form').addEventListener('submit',event=>{event.preventDefault();openWeb($('web-address').value);});
$('web-back-page').onclick=()=>webGo(-1);$('web-forward-page').onclick=()=>webGo(1);
$('web-start').onclick=webStart;$('web-reload').onclick=()=>{if($('web-address').value)openWeb($('web-address').value,false);else webStart();};
$('web-star').onclick=webToggleBookmark;$('web-clear-history').onclick=webClearHistory;$('web-notice-close').onclick=()=>{$('web-notice').hidden=true;};
document.querySelectorAll('[data-web-open]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();webOpenTab();}));
document.querySelectorAll('[data-web-url]').forEach(button=>button.addEventListener('click',event=>{event.preventDefault();openWeb(button.dataset.webUrl);}));
$('keypad').addEventListener('click',e=>{const b=e.target.closest('[data-digit]');if(b)digit(b.dataset.digit);});
$('clear-pin').onclick=()=>{if(!checking){pin='';drawDots();}};
$('delete-pin').onclick=()=>{if(!checking){pin=pin.slice(0,-1);drawDots();}};
$('lock-button').onclick=lock;$('web-back').onclick=lock;
document.addEventListener('visibilitychange',()=>{if(document.hidden)lock();});
window.addEventListener('blur',lock);window.addEventListener('pagehide',lock);window.addEventListener('pageshow',lock);document.addEventListener('freeze',lock);
let heartbeat=Date.now();setInterval(()=>{const now=Date.now();if(now-heartbeat>2500&&unlocked)lock();heartbeat=now;},1000);
let installPrompt=null;
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
$('install-button').onclick=async()=>{if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();}else $('install-dialog').showModal();};
$('close-install').onclick=()=>$('install-dialog').close();
if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});

function rr(c,x,y,w,h,r,color){c.fillStyle=color;c.beginPath();c.roundRect(x,y,w,h,r);c.fill();}
function line(c,pts,color,width=1){c.strokeStyle=color;c.lineWidth=width;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}
function poly(c,pts,color){c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
function glow(c,x,y,r,color){c.save();c.shadowColor=color;c.shadowBlur=18;c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();c.restore();}
function text(c,s,x,y,size=20,color='#fff',align='center'){c.fillStyle=color;c.font=`700 ${size}px system-ui`;c.textAlign=align;c.fillText(s,x,y);}
function background(c,t=0,color='#132239'){
 const g=c.createLinearGradient(0,0,0,H);g.addColorStop(0,'#0c1221');g.addColorStop(1,color);c.fillStyle=g;c.fillRect(0,0,W,H);
 c.fillStyle='#ffffff55';for(let i=0;i<34;i++){const x=(i*137.4)%W,y=(i*83.8+t*12)%H;c.fillRect(x,y,i%5===0?2:1,i%5===0?2:1);}
}
class BaseGame{
 constructor(){this.score=0;this.extra='';this.over=false;this.time=0;this.particles=[];}
 burst(x,y,color,n=20){for(let i=0;i<n;i++)this.particles.push({x,y,vx:random(-140,140),vy:random(-140,140),life:random(.25,.65),color});}
 tick(dt){this.time+=dt;for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;}this.particles=this.particles.filter(p=>p.life>0);}
 drawParticles(c){for(const p of this.particles){c.globalAlpha=clamp(p.life*2,0,1);glow(c,p.x,p.y,2,p.color);}c.globalAlpha=1;}
 end(message='Want another round?'){if(this.over)return;this.over=true;finish(message);}
 key(){} pointer(){} release(){}
}
class Drift extends BaseGame{
 constructor(){super();this.lane=1;this.x=1;this.items=[];this.spawn=.4;this.speed=1;this.extra='DODGE THE TRAFFIC';}
 key(k){if(k==='left')this.lane=Math.max(0,this.lane-1);if(k==='right')this.lane=Math.min(2,this.lane+1);}
 pointer(x){this.lane=clamp(Math.floor(x/W*3),0,2);}
 update(dt){this.tick(dt);this.score+=dt*10;this.speed=1+Math.min(this.score/600,1.2);this.x+=(this.lane-this.x)*Math.min(1,dt*13);this.spawn-=dt;
  if(this.spawn<=0){const lane=Math.floor(random(0,3));this.items.push({lane,z:0,coin:Math.random()<.35,checked:false});this.spawn=.7/this.speed;}
  for(const it of this.items){it.z+=dt*.52*this.speed;if(it.z>.83&&it.z<1.04&&!it.checked&&Math.abs(it.lane-this.x)<.52){it.checked=true;if(it.coin){this.score+=40;this.burst(210+(it.lane-1)*110,400);}else{this.end('Remember: only glowing rings. Nothing else.');return;}}};
  this.items=this.items.filter(it=>it.z<1.16);
 }
 draw(c){background(c,this.time,'#1b1234');
  const sun=c.createRadialGradient(210,125,5,210,125,95);sun.addColorStop(0,'#db64ac88');sun.addColorStop(1,'#db64ac00');c.fillStyle=sun;c.fillRect(100,10,220,220);
  for(let i=0;i<13;i++){const h=35+(i*43)%80;rr(c,i*35-5,180-h,25,h,2,i%2?'#263044':'#1b243a');}
  poly(c,[[167,168],[253,168],[450,560],[-30,560]],'#101520');
  for(let i=0;i<16;i++){let z=((i/16+this.time*.35)%1);const y=168+z*z*392;line(c,[[0,y],[W,y]],'#a64cba22');}
  for(const k of [-1.5,-.5,.5,1.5]){line(c,[[210+k*28,168],[210+k*151,560]],Math.abs(k)===1.5?'#e490ff':'#7f809077',Math.abs(k)===1.5?3:2);}
  for(const it of [...this.items].sort((a,b)=>a.z-b.z)){const z=it.z;const y=170+z*z*390;const x=210+(it.lane-1)*(28+z*122);if(it.coin){c.strokeStyle='#c8fb63';c.lineWidth=4+z*3;c.beginPath();c.ellipse(x,y,12+z*18,8+z*14,0,0,Math.PI*2);c.stroke();}else{glow(c,x,y,9+z*15,'#e490ff');}}
  this.car(c,210+(this.x-1)*136,491,1,'#c8fb63');this.drawParticles(c);
 }
 car(c,x,y,s,color){c.save();c.translate(x,y);c.scale(s,s);c.shadowColor=color;c.shadowBlur=24;rr(c,-23,-56,46,73,10,color);c.shadowBlur=0;rr(c,-17,-38,34,24,6,'#152734');rr(c,-16,2,10,6,2,'#fff');rr(c,6,2,10,6,2,'#fff');c.restore();}
}
class Bricks extends BaseGame{
 constructor(){super();this.x=210;this.target=210;this.ball={x:210,y:430,vx:135,vy:-270};this.lives=3;this.level=1;this.resetBricks();this.extra='3 LIVES · LEVEL 1';}
 resetBricks(){this.bricks=[];for(let y=0;y<5;y++)for(let x=0;x<7;x++)this.bricks.push({x:18+x*55,y:68+y*30,w:49,h:22,color:['#a798fc','#ba99ed','#d49bd5','#e7a3b6','#fac397'][y]});}
 pointer(x){this.target=clamp(x,46,374);}
 key(k){if(k==='left')this.target-=35;if(k==='right')this.target+=35;}
 update(dt){this.tick(dt);if(held.has('left'))this.target-=dt*430;if(held.has('right'))this.target+=dt*430;this.target=clamp(this.target,46,374);this.x+=(this.target-this.x)*Math.min(1,dt*20);
  const b=this.ball,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;
  if(b.x<8||b.x>412){b.x=clamp(b.x,8,412);b.vx*=-1;}if(b.y<12){b.y=12;b.vy=Math.abs(b.vy);}
  if(b.vy>0&&oldY<=494&&b.y>=492&&Math.abs(b.x-this.x)<53){b.y=491;const off=(b.x-this.x)/53;b.vx=off*290;b.vy=-Math.sqrt(Math.max(15000,(300+this.level*15)**2-b.vx*b.vx));}
  for(let i=0;i<this.bricks.length;i++){const r=this.bricks[i];if(b.x+7>r.x&&b.x-7<r.x+r.w&&b.y+7>r.y&&b.y-7<r.y+r.h){if(oldY+7<=r.y||oldY-7>=r.y+r.h)b.vy*=-1;else b.vx*=-1;this.bricks.splice(i,1);this.score+=10;this.burst(r.x+r.w/2,r.y+r.h/2,r.color);break;}}
  if(b.y>580){this.lives--;if(!this.lives){this.end('Three lives. Plenty of broken bricks.');return;}Object.assign(b,{x:this.x,y:430,vx:135,vy:-270});}
  if(!this.bricks.length){this.level++;this.score+=100;this.resetBricks();Object.assign(b,{x:210,y:430,vx:145,vy:-280-this.level*10});}
  this.extra=`${this.lives} LIVES · LEVEL ${this.level}`;
 }
 draw(c){background(c,this.time,'#241b3b');for(const r of this.bricks){c.shadowColor=r.color;c.shadowBlur=12;rr(c,r.x,r.y,r.w,r.h,5,r.color);c.shadowBlur=0;rr(c,r.x+4,r.y+3,r.w-8,3,2,'#ffffff55');}{const b=this.ball;c.shadowColor='#fffd78';c.shadowBlur=20;glow(c,b.x,b.y,7,'#fffd78');}}
}
class Snake extends BaseGame{
 constructor(){super();this.body=[{x:9,y:11},{x:8,y:11},{x:7,y:11},{x:6,y:11}];this.dir={x:1,y:0};this.next=this.dir;this.turned=false;this.clock=0;this.food={x:13,y:8};this.extra='LENGTH 4';}
 key(k){if(this.turned)return;const d={left:{x:-1,y:0},right:{x:1,y:0},up:{x:0,y:-1},down:{x:0,y:1}}[k];if(d&&!(d.x===-this.dir.x&&d.y===-this.dir.y)){this.next=d;this.turned=true;}}
 update(dt){this.tick(dt);this.clock+=dt;if(this.clock<Math.max(.075,.17-this.score/8000))return;this.clock=0;this.dir=this.next;this.turned=false;
 const head={x:this.body[0].x+this.dir.x,y:this.body[0].y+this.dir.y};const eat=head.x===this.food.x&&head.y===this.food.y;const body=eat?this.body:this.body.slice(0,-1);
 if(head.x<0||head.x>=18||head.y<0||head.y>=22||body.some(s=>s.x===head.x&&s.y===head.y)){this.end('A little too close. Try a new route.');return;}
 this.body.unshift(head);if(!eat)this.body.pop();else{this.score+=20;this.burst(30+head.x*20,60+head.y*20,'#64edc3');const free=[];for(let y=0;y<22;y++)for(let x=0;x<18;x++)if(!this.body.some(s=>s.x===x&&s.y===y))free.push([x,y]);this.food=free[Math.floor(Math.random()*free.length)];this.extra=`LENGTH ${this.body.length}`;}
 }
 draw(c){background(c,0,'#0d302b');for(let x=0;x<=18;x++)line(c,[[20+x*20,50],[20+x*20,490]],'#4be2b011');for(let y=0;y<=22;y++)line(c,[[20,50+y*20],[380,50+y*20]],'#4be2b011');rr(c,18,48,364,444,8,'#00251edd');
  glow(c,30+this.food.x*20,60+this.food.y*20,7+Math.sin(this.time*5),'#ffc980');this.body.forEach((s,i)=>{rr(c,21+s.x*20,51+s.y*20,18,18,5,i===0?'#d0ffe5':`hsl(${157-i*.5} 70% ${Math.max(30,65-i*2)}%)`);});this.drawParticles(c);
 }
}
class Orbit extends BaseGame{
 constructor(){super();this.x=210;this.y=450;this.target={x:210,y:450};this.rocks=[];this.orbs=[];this.spawn=.3;this.energy=1;this.extra='STAY IN MOTION';}
 pointer(x,y){this.target={x:clamp(x,16,404),y:clamp(y,35,535)};}
 key(k){const v={left:[-35,0],right:[35,0],up:[0,-35],down:[0,35]}[k];if(v)this.pointer(this.target.x+v[0],this.target.y+v[1]);}
 update(dt){this.tick(dt);this.score+=dt*5;
 for(const k of held){const v={left:[-1,0],right:[1,0],up:[0,-1],down:[0,1]}[k];if(v)this.pointer(this.target.x+v[0]*dt*320,this.target.y+v[1]*dt*320);}
 this.x+=(this.target.x-this.x)*Math.min(1,dt*12);this.y+=(this.target.y-this.y)*Math.min(1,dt*12);this.spawn-=dt;this.energy-=dt;
 if(this.spawn<0){this.rocks.push({x:random(15,405),y:-30,r:random(13,28),vx:random(-25,25),v:random(100,190)+Math.min(this.time*3,150),rot:random(0,7)});this.spawn=Math.max(.17,.55-this.time*.008);}
 if(this.energy<0){this.orbs.push({x:random(40,380),y:-10});this.energy=1.6;}
 for(const r of this.rocks){r.y+=dt*r.v;r.x+=dt*r.vx;r.rot+=dt;if(Math.hypot(r.x-this.x,r.y-this.y)<r.r+9){this.end('The asteroid field wins this round.');return;}}
 for(const o of this.orbs){o.y+=dt*140;if(Math.hypot(o.x-this.x,o.y-this.y)<23){o.y=700;this.score+=30;this.burst(this.x,this.y,'#6ccbff');}}
 this.rocks=this.rocks.filter(r=>r.y<610);this.orbs=this.orbs.filter(o=>o.y<600);
 }
 draw(c){background(c,this.time*4,'#102e46');for(const r of this.rocks){c.save();c.translate(r.x,r.y);c.rotate(r.rot);const pts=Array.from({length:9},(_,i)=>{const a=i/9*Math.PI*2,k=i%2?.85:1;return[Math.cos(a)*k*r.r,Math.sin(a)*k*r.r];});poly(c,pts,'#a0826d');c.restore();}
 for(const o of this.orbs){c.strokeStyle='#6ccbff';c.lineWidth=3;c.beginPath();c.arc(o.x,o.y,14,0,Math.PI*2);c.stroke();glow(c,o.x,o.y,8,'#6ccbff');}
 const x=this.x,y=this.y;poly(c,[[x-5,y+12],[x,y+28+Math.sin(this.time*40)*7],[x+5,y+12]],'#ffa365');c.save();c.shadowBlur=22;c.shadowColor='#6ccbff';poly(c,[[x,y-20],[x-16,y+16],[x,y+9],[x+16,y+16]],'#6ccbff');c.restore();this.drawParticles(c);
 }
}
class Stack extends BaseGame{
 constructor(){super();this.blocks=[{x:80,w:260}];this.x=0;this.w=260;this.sign=1;this.streak=0;this.extra='TAP TO DROP';}
 key(k){if(k==='action')this.drop();}
 pointer(x,y,phase){if(phase==='down')this.drop();}
 update(dt){this.tick(dt);this.x+=this.sign*dt*(115+Math.min(this.blocks.length*9,170));if(this.x<0||this.x+this.w>W){this.x=clamp(this.x,0,W-this.w);this.sign*=-1;}}
 drop(){const prev=this.blocks.at(-1);let left=Math.max(this.x,prev.x),right=Math.min(this.x+this.w,prev.x+prev.w);if(right<=left){this.end('So close. Build it back up.');return;}const perfect=Math.abs((left+right)/2-210)<8;this.score+=perfect?50:10;this.blocks.push({x:left,w:right-left});this.streak=perfect?this.streak+1:0;}
 draw(c){background(c,this.time*.2,'#36243f');const first=Math.max(0,this.blocks.length-12),base=475;
 for(let i=first;i<this.blocks.length;i++){const b=this.blocks[i],y=base-(i-first)*27;this.block(c,b.x,y,b.w,i);}const y=base-(this.blocks.length-first)*27;
 c.setLineDash([4,7]);line(c,[[this.blocks.at(-1).x,y-30],[this.blocks.at(-1).x,500]],'#ffffff22');line(c,[[this.blocks.at(-1).x+this.w,y-30],[this.blocks.at(-1).x+this.w,500]],'#ffffff22');c.setLineDash([]);rr(c,this.x,y-25,this.w,25,3,'#ffae8255');this.drawParticles(c);
 }
 block(c,x,y,w,n){const hue=(22+n*9)%360;rr(c,x,y,w,25,2,`hsl(${hue} 75% 65%)`);poly(c,[[x,y],[x+10,y-9],[x+w+10,y-9],[x+w,y]],`hsl(${hue} 90% 78%)`);poly(c,[[x+w,y],[x+w+10,y-9],[x+w+10,y+16],[x+w,y+25]],`hsl(${hue} 70% 45%)`);
 }
}
function mergeLine(values){const cells=values.filter(Boolean),out=[];let gained=0;for(let i=0;i<cells.length;i++){if(cells[i]===cells[i+1]){const v=cells[i]*2;out.push(v);gained+=v;i++;}else out.push(cells[i]);}return{cells:out,gained};}
class Merge extends BaseGame{
 constructor(){super();this.board=Array(16).fill(0);this.add();this.add();this.extra='MAKE 2048';this.flash=0;}
 add(){const free=this.board.map((v,i)=>v?null:i).filter(i=>i!==null);if(free.length)this.board[free[Math.floor(Math.random()*free.length)]]=Math.random()<.9?2:4;}
 key(k){if(!['up','down','left','right'].includes(k))return;const before=this.board.join();for(let a=0;a<4;a++){const indices=Array.from({length:4},(_,b)=>k==='left'?a*4+b:k==='right'?a*4+3-b:k==='up'?a+b*4:a+b*4);const values=indices.map(i=>this.board[i]);const res=mergeLine(values);const final=[...res.cells,...Array(4-res.cells.length).fill(0)];indices.forEach((i,j)=>this.board[i]=final[j]);this.score+=res.gained;}
 if(this.board.join()!==before){this.add();this.flash=.16;this.extra=Math.max(...this.board)>=2048?'2048! KEEP GOING':`TOP TILE ${Math.max(...this.board)}`;}
 if(!this.board.includes(0)&&!this.board.some((v,i)=>(i%4<3&&v===this.board[i+1])||(i<12&&v===this.board[i+4])))this.end('Every square counts. Start a fresh board.');
 }
 update(dt){this.tick(dt);this.flash=Math.max(0,this.flash-dt);}
 draw(c){background(c,0,'#32291f');text(c,'MAKE ROOM FOR SOMETHING BIGGER.',210,67,12,'#bcae94');
 for(let i=0;i<16;i++){const v=this.board[i],x=22+(i%4)*96,y=101+Math.floor(i/4)*96;const palette=['#343437','#e9dcb9','#ebd195','#e9b373','#eb9462','#e6755f','#d95d67','#ce4f7c','#b164aa','#8c78d4','#8973c9','#7e66b7','#7559a1','#6b4d8a','#5d3d72','#52285a'];const n=Math.log2(v||1);const bg=palette[Math.min(n,15)];rr(c,x,y,92,92,8,bg);if(v){text(c,String(v),x+46,y+46,v>99?v>999?26:32:36,Math.log2(v)>4?'#f0e8d8':'#695c47');}}
 text(c,'SWIPE TO MERGE',210,523,12,'#bcae94');
 }
}
const types={drift:Drift,bricks:Bricks,snake:Snake,orbit:Orbit,stack:Stack,merge:Merge};
const canvas=$('game-canvas'),ctx=canvas.getContext('2d');
function resizeCanvas(){const dpr=Math.min(window.devicePixelRatio||1,2);canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);if(game)game.draw(ctx);}
resizeCanvas();window.addEventListener('resize',resizeCanvas);
function openGame(id){if(!unlocked)return;cancelAnimationFrame(frame);selected=catalog.find(g=>g.id===id);game=new types[id]();playing=false;paused=false;held.clear();$('library').hidden=true;$('play-screen').hidden=false;$('game-overlay').hidden=false;
 $('control-row').hidden=!selected.controls.length;document.querySelectorAll('[data-control]').forEach(b=>b.hidden=!selected.controls.includes(b.dataset.control));
 $('overlay-kicker').textContent='YOUR NEXT HIGH SCORE';$('overlay-title').textContent=selected.title;$('overlay-description').textContent=selected.help;$('start-button').textContent="Let's play";
}
function start(){if(!unlocked||!selected)return;if(paused){paused=false;}else game=new types[selected.id]();playing=true;$('game-overlay').hidden=true;$('pause-button').textContent='Pause';$('pause-button').disabled=false;frame=requestAnimationFrame(loop);}
function loop(t){if(!unlocked||!playing||!game)return;const dt=Math.min((t-lastFrame)/1000,.033);lastFrame=t;game.update(dt);game.draw(ctx);setScore();if(playing)frame=requestAnimationFrame(loop);}
function finish(description){playing=false;saveBest();$('overlay-kicker').textContent=`SCORE ${Math.floor(game.score)} · BEST ${Math.max(best(selected.id),Math.floor(game.score))}`;$('overlay-title').textContent=description;$('overlay-description').textContent=selected.tag;$('start-button').textContent='Play again';$('game-overlay').hidden=false;}
function pause(){if(!unlocked||!game||game.over)return;if(paused){start();return;}if(!playing)return;playing=false;paused=true;held.clear();cancelAnimationFrame(frame);saveBest();$('overlay-kicker').textContent='PAUSED';$('overlay-title').textContent=selected.title;$('overlay-description').textContent='';$('start-button').textContent='Resume';$('pause-button').textContent='Resume';$('pause-button').disabled=true;$('game-overlay').hidden=false;}
$('start-button').onclick=start;$('pause-button').onclick=pause;
$('back-button').onclick=()=>{saveBest();playing=false;paused=false;held.clear();cancelAnimationFrame(frame);game=null;selected=null;$('play-screen').hidden=true;$('library').hidden=false;};
function control(k){if(unlocked&&playing&&game)game.key(k);}
const keyMap={ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right',ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',' ':'action'};
document.addEventListener('keydown',e=>{
 if($('install-dialog').open)return;
 if(!unlocked){if(e.repeat)return;if(/^\d$/.test(e.key)){e.preventDefault();digit(e.key);}else if(e.key==='Backspace'){$('delete-pin').click();}else if(e.key==='Escape'){$('clear-pin').click();}return;}
 if(e.key==='Escape'){e.preventDefault();lock();return;}
 if(!game)return;if(e.key.toLowerCase()==='p'){pause();return;}const k=keyMap[e.key];if(k){e.preventDefault();if(playing){held.add(k);if(!e.repeat)control(k);}}
});
document.addEventListener('keyup',e=>{if(keyMap[e.key])held.delete(keyMap[e.key]);});
document.querySelectorAll('[data-control]').forEach(b=>{b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);held.add(b.dataset.control);control(b.dataset.control);});b.addEventListener('pointerup',e=>{b.releasePointerCapture(e.pointerId);held.delete(b.dataset.control);});});
let pointerStart=null;
function point(e){const r=canvas.getBoundingClientRect();return{x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
canvas.addEventListener('pointerdown',e=>{if(!playing)return;e.preventDefault();canvas.setPointerCapture(e.pointerId);pointerStart=point(e);game.pointer(pointerStart.x,pointerStart.y,'down');});
canvas.addEventListener('pointermove',e=>{if(!playing||!pointerStart)return;e.preventDefault();const p=point(e);game.pointer(p.x,p.y,'move');if(selected.id==='snake'){const dx=p.x-pointerStart.x,dy=p.y-pointerStart.y;if(Math.abs(dy)>Math.abs(dx)&&Math.abs(dy)>12){if(dy>0){control('down');pointerStart=p;}else{control('up');pointerStart=p;}}else if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>12){if(dx>0){control('right');pointerStart=p;}else{control('left');pointerStart=p;}}}});
canvas.addEventListener('pointerup',e=>{if(playing&&pointerStart){const p=point(e),dx=p.x-pointerStart.x,dy=p.y-pointerStart.y;if(selected.id==='merge'&&Math.max(Math.abs(dx),Math.abs(dy))>18){if(Math.abs(dy)>Math.abs(dx))control(dy>0?'down':'up');else control(dx>0?'right':'left');}}pointerStart=null;});
canvas.addEventListener('pointercancel',()=>{pointerStart=null;});
for(const info of catalog){
 const b=document.createElement('button');b.className='game-card';b.dataset.game=info.id;b.setAttribute('aria-label',`Play ${info.title}`);
 const art=document.createElement('canvas');art.width=600;art.height=400;art.setAttribute('aria-hidden','true');
 const c=art.getContext('2d'),demo=new types[info.id]();if(info.id==='drift'){demo.items=[{lane:0,z:.7},{lane:2,z:.45,coin:true}];}if(info.id==='orbit'){demo.rocks=[{x:85,y:140,r:23,rot:1},{x:330,y:220,r:18,rot:.5}];demo.orbs=[{x:180,y:100}];}
 c.save();c.scale(600/W,400/H);demo.draw(c);c.restore();
 const detail=document.createElement('div');detail.className='card-info';detail.innerHTML=`<h2>${info.title}</h2><p>${info.tag}</p><span class="play-chip" aria-hidden="true">▶</span>`;
 b.append(art,detail);b.onclick=()=>openGame(info.id);$('game-grid').append(b);
}

// Agent navigation observes the same lock as the visible arcade. No unlock API.
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 try{Promise.resolve(document.modelContext.registerTool({
  name:'open_arcade_game',title:'Open an arcade game',
  description:"Open a game's start screen after the user has unlocked the arcade.",
  inputSchema:{type:'object',properties:{game:{type:'string',enum:catalog.map(g=>g.id)}},required:['game'],additionalProperties:false},
  annotations:{readOnlyHint:false,untrustedContentHint:false},
  execute(input){if(!input||typeof input!=='object'||Object.keys(input).some(k=>k!=='game')||!catalog.some(g=>g.id===input.game))throw new Error('Choose an available game.');if(!unlocked||$('arcade').hidden)throw new Error('Unlock the arcade first.');openGame(input.game);}
 },{signal:lifecycle.signal})).catch(()=>{});}catch{}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
