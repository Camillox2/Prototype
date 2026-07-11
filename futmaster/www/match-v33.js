(function(global){
'use strict';
// Replay tático com 22 jogadores, bola e sequências de eventos.
const MAIN='futmaster-save-v4',KEY='futmaster-match-v33',VIEW='Partida 2D Pro';
let active=false,raf=0,playing=false,lastTs=0,clock=0,speed=1,selected=null,model=null;
const get=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch{return f;}};
const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
const state=()=>get(MAIN);
const config=()=>get(KEY,{speed:1,camera:'broadcast',labels:true,trails:true,sound:true});
const saveConfig=p=>set(KEY,{...config(),...p});
const esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function team(s,id){return s.teams.find(t=>t.id===id);}
function lineup(t){
 const starters=[...t.squad].filter(p=>p.starter&&!p.injuredWeeks&&!p.suspensionMatches).slice(0,11);
 const rest=[...t.squad].filter(p=>!starters.includes(p)&&!p.injuredWeeks&&!p.suspensionMatches).sort((a,b)=>b.overall-a.overall);
 while(starters.length<11&&rest.length)starters.push(rest.shift());
 return starters;
}
function slots(side){
 const xs=side==='home'?[.065,.19,.34,.52,.70]:[.935,.81,.66,.48,.30];
 const y=[.5,.13,.37,.63,.87];
 return [[xs[0],y[0]],[xs[1],y[0]],[xs[1],y[1]],[xs[1],y[2]],[xs[1],y[3]],[xs[2],y[1]],[xs[2],y[2]],[xs[2],y[3]],[xs[3],.3],[xs[3],.7],[xs[4],.5]];
}
function makePlayers(t,side){return lineup(t).map((p,i)=>({id:p.id,name:p.name,short:(p.name||'?').split(' ').at(-1),number:i+1,position:p.position,side,base:slots(side)[i],overall:p.overall||50}));}
function seeded(seed){let x=Math.abs(seed)||1;return()=>{x=(x*1664525+1013904223)>>>0;return x/4294967296;};}
function eventSeed(e,i){return (e.minute||0)*7919+i*104729+String(e.type||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0);}
function playerById(players,id,side){return players.find(p=>String(p.id)===String(id))||players.filter(p=>p.side===side).sort((a,b)=>b.overall-a.overall)[side==='home'?9:9]||players.find(p=>p.side===side);}
function nearest(players,side,x,y,exclude=[]){return players.filter(p=>p.side===side&&!exclude.includes(p.id)).sort((a,b)=>Math.hypot(a.base[0]-x,a.base[1]-y)-Math.hypot(b.base[0]-x,b.base[1]-y))[0];}
function formationAt(players,minute,possession,event){
 const pulse=Math.sin(minute*.42)*.008;
 const positions={};
 players.forEach((p,i)=>{
   const phase=p.side===possession?0.035:-0.018;
   positions[p.id]=[clamp(p.base[0]+(p.side==='home'?phase:-phase)+Math.sin(minute*.19+i)*.009,.035,.965),clamp(p.base[1]+Math.cos(minute*.16+i*1.7)*.014+pulse,.055,.945)];
 });
 if(event){
   const own=event.side;
   const target=event.type==='goal'||event.type==='save'||event.type==='chance'||event.type==='corner'?(own==='home'?[.84,.5]:[.16,.5]):[.5,.5];
   const actor=playerById(players,event.scorerId||event.playerId||event.inId,own)||nearest(players,own,target[0],target[1]);
   if(actor)positions[actor.id]=[clamp(target[0]+(own==='home'?-.06:.06),.05,.95),clamp(target[1]+((eventSeed(event,0)%21)-10)/100,.08,.92)];
 }
 return positions;
}
function pushFrame(frames,t,positions,ball,meta={}){frames.push({t:clamp(t,0,95),positions:structuredClone(positions),ball:[...ball],...meta});}
function buildModel(s,m){
 const home=team(s,m.homeId),away=team(s,m.awayId);if(!home||!away)return null;
 const players=[...makePlayers(home,'home'),...makePlayers(away,'away')],events=[...(m.events||[])].sort((a,b)=>a.minute-b.minute),frames=[];
 let possession='home',lastBall=[.5,.5];
 pushFrame(frames,0,formationAt(players,0,possession),lastBall,{text:'Apita o árbitro. A bola está rolando!',type:'start',side:'home'});
 for(let minute=1;minute<=95;minute++){
  const evs=events.filter(e=>e.minute===minute);
  if(!evs.length){
   if(minute%3===0)possession=possession==='home'?'away':'home';
   const rand=seeded(minute*3571),dir=possession==='home'?1:-1;
   lastBall=[clamp(.5+dir*(.08+rand()*.18),.12,.88),.18+rand()*.64];
   pushFrame(frames,minute,formationAt(players,minute,possession),lastBall,{text:'Circulação de bola e disputa por espaço.',type:'ambient',side:possession});
   continue;
  }
  evs.forEach((raw,j)=>{
   const side=raw.teamId===home.id?'home':'away';possession=side;const rand=seeded(eventSeed(raw,j)),dir=side==='home'?1:-1;
   const enriched={...raw,side};
   let pos=formationAt(players,minute-.7,side,enriched);
   const creator=playerById(players,raw.assistId,side)||nearest(players,side,.5,.5);
   const actor=playerById(players,raw.scorerId||raw.playerId||raw.inId,side)||nearest(players,side,.70,.5,creator?[creator.id]:[]);
   const defender=nearest(players,side==='home'?'away':'home',side==='home'?.72:.28,.5);
   const start=creator?pos[creator.id]:[.5,.5];lastBall=[...start];
   pushFrame(frames,minute-.72,pos,lastBall,{text:`${creator?.short||home.short} prepara a jogada.`,type:'build',side,event:raw});
   if(['goal','save','chance','corner'].includes(raw.type)){
    const mid=[clamp(.54+dir*(.08+rand()*.07),.16,.84),.16+rand()*.68];
    if(creator)pos[creator.id]=[mid[0]-dir*.045,mid[1]];
    if(actor)pos[actor.id]=[clamp(mid[0]+dir*.12,.12,.88),clamp(mid[1]+(rand()-.5)*.12,.08,.92)];
    pushFrame(frames,minute-.48,pos,mid,{text:`${creator?.short||'O meio-campo'} encontra espaço e faz o passe.`,type:'pass',side,event:raw,trail:[start,mid]});
    const receive=actor?pos[actor.id]:[clamp(.68+dir*.08,.1,.9),.5];
    pushFrame(frames,minute-.27,pos,receive,{text:`${actor?.short||'O atacante'} domina e parte para cima.`,type:'dribble',side,event:raw,trail:[mid,receive]});
    const goal=[side==='home'?.985:.015,clamp(.37+rand()*.26,.25,.75)];
    if(defender)pos[defender.id]=[clamp(receive[0]-dir*.035,.04,.96),clamp(receive[1]+(rand()-.5)*.08,.05,.95)];
    pushFrame(frames,minute-.08,pos,goal,{text:raw.text||raw.type,type:'shot',side,event:raw,trail:[receive,goal],flash:true});
    if(raw.type==='save'){
      const keeper=players.find(p=>p.side!==side&&p.number===1);if(keeper)pos[keeper.id]=[side==='home'?.94:.06,goal[1]];
      const rebound=[side==='home'?.88:.12,clamp(goal[1]+(rand()-.5)*.16,.1,.9)];
      pushFrame(frames,minute+.12,pos,rebound,{text:raw.text,type:'save',side,event:raw,trail:[goal,rebound]});lastBall=rebound;
    }else if(raw.type==='corner'){
      const corner=[side==='home'?.97:.03,rand()>.5?.04:.96];pushFrame(frames,minute+.12,pos,corner,{text:raw.text,type:'corner',side,event:raw});lastBall=corner;
    }else{
      pushFrame(frames,minute+.12,pos,goal,{text:raw.text,type:raw.type,side,event:raw,celebration:raw.type==='goal'});lastBall=goal;
    }
   }else{
    const point=[.5+dir*(rand()*.1),.25+rand()*.5];if(actor)pos[actor.id]=point;
    pushFrame(frames,minute-.15,pos,point,{text:raw.text||raw.type,type:raw.type,side,event:raw,flash:['yellow','red','injury'].includes(raw.type)});lastBall=point;
   }
  });
 }
 frames.sort((a,b)=>a.t-b.t);return {home,away,players,events,frames,match:m};
}
function framePair(t){const fs=model.frames;let i=0;while(i<fs.length-1&&fs[i+1].t<=t)i++;const a=fs[i],b=fs[Math.min(i+1,fs.length-1)],p=a===b?0:clamp((t-a.t)/(b.t-a.t),0,1);return {a,b,p};}
function lerp(a,b,p){return a+(b-a)*p;}
function pitch(ctx,w,h,camera,ball){
 ctx.save();let zoom=1,ox=0,oy=0;if(camera==='follow'){zoom=1.38;ox=w/2-ball[0]*w*zoom;oy=h/2-ball[1]*h*zoom;}else if(camera==='broadcast'){zoom=1.08;ox=w/2-ball[0]*w*.08-w*.04;oy=-h*.04;}
 ctx.setTransform((+ctx.canvas.dataset.ratio||1)*zoom,0,0,(+ctx.canvas.dataset.ratio||1)*zoom,ox*(+ctx.canvas.dataset.ratio||1),oy*(+ctx.canvas.dataset.ratio||1));
 ctx.fillStyle='#126b3d';ctx.fillRect(0,0,w,h);for(let i=0;i<12;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.025)':'rgba(0,0,0,.035)';ctx.fillRect(i*w/12,0,w/12,h);}ctx.strokeStyle='rgba(255,255,255,.88)';ctx.lineWidth=2;ctx.strokeRect(10,10,w-20,h-20);ctx.beginPath();ctx.moveTo(w/2,10);ctx.lineTo(w/2,h-10);ctx.stroke();ctx.beginPath();ctx.arc(w/2,h/2,h*.13,0,Math.PI*2);ctx.stroke();ctx.strokeRect(10,h*.27,w*.16,h*.46);ctx.strokeRect(w-w*.16-10,h*.27,w*.16,h*.46);ctx.strokeRect(10,h*.39,w*.055,h*.22);ctx.strokeRect(w-w*.055-10,h*.39,w*.055,h*.22);ctx.fillStyle='rgba(230,240,255,.35)';ctx.fillRect(0,h*.42,10,h*.16);ctx.fillRect(w-10,h*.42,10,h*.16);return {zoom,ox,oy};
}
function draw(){const canvas=document.querySelector('#v33-canvas');if(!canvas||!model)return;const ratio=+canvas.dataset.ratio||1,w=canvas.width/ratio,h=canvas.height/ratio,ctx=canvas.getContext('2d'),cfg=config();ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);const {a,b,p}=framePair(clock),positions={},ball=[lerp(a.ball[0],b.ball[0],p),lerp(a.ball[1],b.ball[1],p)];model.players.forEach(pl=>{const pa=a.positions[pl.id]||pl.base,pb=b.positions[pl.id]||pa;positions[pl.id]=[lerp(pa[0],pb[0],p),lerp(pa[1],pb[1],p)];});pitch(ctx,w,h,cfg.camera,ball);
 if(cfg.trails&&a.trail){ctx.strokeStyle='rgba(255,224,110,.75)';ctx.lineWidth=3;ctx.setLineDash([8,7]);ctx.beginPath();ctx.moveTo(a.trail[0][0]*w,a.trail[0][1]*h);ctx.lineTo(a.trail[1][0]*w,a.trail[1][1]*h);ctx.stroke();ctx.setLineDash([]);}
 const mobile=w<620,nearestLabels=new Set([...model.players].sort((u,v)=>Math.hypot(positions[u.id][0]-ball[0],positions[u.id][1]-ball[1])-Math.hypot(positions[v.id][0]-ball[0],positions[v.id][1]-ball[1])).slice(0,mobile?5:22).map(x=>x.id));model.players.forEach(pl=>{const [x,y]=positions[pl.id],px=x*w,py=y*h,home=pl.side==='home',radius=Math.max(9,Math.min(13,w/70));ctx.save();ctx.shadowColor='rgba(0,0,0,.5)';ctx.shadowBlur=5;ctx.fillStyle=home?'#38bdf8':'#fb7185';ctx.strokeStyle='#fff';ctx.lineWidth=1.7;ctx.beginPath();ctx.arc(px,py,radius,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#07111f';ctx.font=`800 ${Math.max(8,radius*.75)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(pl.number,px,py);if(cfg.labels&&nearestLabels.has(pl.id)){ctx.font=`700 ${mobile?8:10}px system-ui`;const tw=ctx.measureText(pl.short).width+10;ctx.fillStyle='rgba(2,6,23,.78)';ctx.roundRect(px-tw/2,py+radius+3,tw,16,7);ctx.fill();ctx.fillStyle='#fff';ctx.fillText(pl.short,px,py+radius+11);}ctx.restore();});
 const bx=ball[0]*w,by=ball[1]*h;ctx.save();ctx.shadowColor='#000';ctx.shadowBlur=8;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(bx,by,6.5,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#111';ctx.lineWidth=1;ctx.stroke();ctx.restore();ctx.restore();
 const info=p<.5?a:b;document.querySelector('#v33-minute')?.replaceChildren(document.createTextNode(`${Math.floor(clock)}'`));const box=document.querySelector('#v33-comment');if(box){box.className=`commentary-box ${info.type||''}`;box.textContent=info.text||'Partida em andamento.';}const range=document.querySelector('#v33-range');if(range)range.value=clock;document.querySelectorAll('[data-v33-event]').forEach(el=>el.classList.toggle('active',Math.abs(Number(el.dataset.v33Event)-clock)<.7));
}
function resize(){const c=document.querySelector('#v33-canvas');if(!c)return;const rect=c.parentElement.getBoundingClientRect(),ratio=Math.min(2,devicePixelRatio||1),w=Math.max(320,rect.width),h=Math.max(260,Math.min(620,w*.58));c.width=w*ratio;c.height=h*ratio;c.style.height=`${h}px`;c.dataset.ratio=ratio;draw();}
function loop(ts){if(!playing)return;if(!lastTs)lastTs=ts;clock+=((ts-lastTs)/1000)*speed*2.4;lastTs=ts;if(clock>=95){clock=95;playing=false;}draw();if(playing)raf=requestAnimationFrame(loop);}
function selectedMatch(s){const list=(s.matchHistory||[]).filter(m=>m.homeId===s.userTeamId||m.awayId===s.userTeamId);return list.find(m=>m.id===selected)||list[0]||null;}
function nav(){const n=document.querySelector('.nav-list');if(!n||n.querySelector('[data-v33-view]'))return;n.querySelectorAll('[data-v20-view],[data-v05-match2d]').forEach(x=>x.remove());const b=document.createElement('button');b.className='nav-item';b.dataset.v33View='match';b.textContent=VIEW;n.insertBefore(b,n.querySelector('[data-view="history"]'));b.onclick=()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');active=true;clock=0;render();};}
function render(){const s=state(),root=document.querySelector('#app-view');if(!s||!root)return;document.querySelector('#page-title').textContent=VIEW;const m=selectedMatch(s);if(!m){root.innerHTML='<div class="empty-state"><h2>Sem partidas</h2><p>Avance uma rodada para assistir ao replay 2D.</p></div>';return;}selected=m.id;model=buildModel(s,m);const cfg=config();speed=cfg.speed||1;root.innerHTML=`<div class="grid grid-4"><div class="card stat-card"><span>Placar</span><strong>${m.homeGoals} × ${m.awayGoals}</strong><small>${esc(m.homeShort)} — ${esc(m.awayShort)}</small></div><div class="card stat-card"><span>Minuto</span><strong id="v33-minute">${Math.floor(clock)}'</strong><small>Replay contínuo</small></div><div class="card stat-card"><span>Velocidade</span><strong>${speed}×</strong><small>0,5× a 8×</small></div><div class="card stat-card"><span>Lances</span><strong>${model.events.length}</strong><small>Passes, dribles e finalizações</small></div></div><div class="card section-gap"><div class="card-header"><div><h2>${esc(m.homeName)} ${m.homeGoals} × ${m.awayGoals} ${esc(m.awayName)}</h2><select data-v33-match>${(s.matchHistory||[]).filter(x=>x.homeId===s.userTeamId||x.awayId===s.userTeamId).slice(0,50).map(x=>`<option value="${x.id}" ${x.id===m.id?'selected':''}>${esc(x.homeShort)} ${x.homeGoals} x ${x.awayGoals} ${esc(x.awayShort)} · S${x.week}</option>`).join('')}</select></div><div class="button-row pro-controls"><button class="secondary-button" data-v33-action="restart">↺</button><button class="primary-button" data-v33-action="play">${playing?'⏸ Pausar':'▶ Reproduzir'}</button><button class="secondary-button" data-v33-action="slower">−</button><button class="secondary-button" data-v33-action="faster">+</button></div></div><div class="pro-pitch"><canvas id="v33-canvas"></canvas><div class="pro-score"><b>${esc(m.homeShort)} ${m.homeGoals}</b><span id="v33-clock">${Math.floor(clock)}'</span><b>${m.awayGoals} ${esc(m.awayShort)}</b></div></div><input id="v33-range" type="range" min="0" max="95" step="0.05" value="${clock}"><div id="v33-comment" class="commentary-box">A partida vai começar.</div><div class="match-options"><label>Câmera<select data-v33-setting="camera"><option value="broadcast" ${cfg.camera==='broadcast'?'selected':''}>Transmissão</option><option value="full" ${cfg.camera==='full'?'selected':''}>Campo inteiro</option><option value="follow" ${cfg.camera==='follow'?'selected':''}>Seguir a bola</option></select></label><label><input type="checkbox" data-v33-setting="labels" ${cfg.labels?'checked':''}> Nomes</label><label><input type="checkbox" data-v33-setting="trails" ${cfg.trails?'checked':''}> Trajetórias</label></div></div><div class="grid grid-2 section-gap"><div class="card"><h2>Melhores momentos</h2><div class="commentary-list">${model.events.map(e=>`<button class="commentary-line ${e.type}" data-v33-event="${e.minute}"><b>${e.minute}'</b> ${esc(e.text||e.type)}</button>`).join('')||'<p class="muted">Partida sem lances destacados.</p>'}</div></div><div class="card"><h2>Estatísticas</h2>${[['Posse',m.stats?.possession],['Finalizações',m.stats?.shots],['No alvo',m.stats?.shotsOnTarget],['xG',m.stats?.xg],['Escanteios',m.stats?.corners],['Faltas',m.stats?.fouls]].map(([n,v])=>`<div class="match-stat-row"><b>${v?.[0]??0}</b><span>${n}</span><b>${v?.[1]??0}</b></div>`).join('')}<p class="muted section-gap">O resultado vem do motor estatístico; o 2D representa passes, conduções, chutes, defesas e movimentação tática a partir da súmula.</p></div></div>`;requestAnimationFrame(resize);}
function action(a){if(a==='play'){playing=!playing;lastTs=0;if(playing)raf=requestAnimationFrame(loop);render();}if(a==='restart'){playing=false;cancelAnimationFrame(raf);clock=0;render();}if(a==='faster'){speed=Math.min(8,speed*2);saveConfig({speed});render();}if(a==='slower'){speed=Math.max(.5,speed/2);saveConfig({speed});render();}}
function bind(){document.addEventListener('click',e=>{const a=e.target.closest('[data-v33-action]')?.dataset.v33Action;if(a){action(a);return;}const event=e.target.closest('[data-v33-event]');if(event){clock=Number(event.dataset.v33Event);playing=false;draw();}const item=e.target.closest('.nav-item');if(item&&!item.matches('[data-v33-view]')){active=false;playing=false;cancelAnimationFrame(raf);}},true);document.addEventListener('input',e=>{if(e.target.id==='v33-range'){clock=Number(e.target.value);playing=false;draw();}});document.addEventListener('change',e=>{if(e.target.matches('[data-v33-match]')){selected=e.target.value;clock=0;playing=false;render();}const k=e.target.dataset.v33Setting;if(k){saveConfig({[k]:e.target.type==='checkbox'?e.target.checked:e.target.value});draw();}});window.addEventListener('resize',()=>{if(active)resize();});}
function init(){nav();bind();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
