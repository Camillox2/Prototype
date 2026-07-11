(function(global){
'use strict';
const C=global.FMCore;
const MAIN='futmaster-save-v4';
const MODULE_KEYS=['futmaster-international-v04','futmaster-career-v04','futmaster-universe-v05'];
const META='futmaster-v06-meta';
const VIEWS={recovery:'Central de saves',diagnostics:'Diagnóstico'};
let active=null;

function jget(k,f=null){try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch{return f;}}
function jset(k,v){localStorage.setItem(k,JSON.stringify(v));}
function now(){return new Date().toISOString();}
function state(){return jget(MAIN);}
function signature(s){return s?`${s.managerName}|${s.userTeamId}|${s.season}|${s.week}`:'sem-carreira';}
function collect(){
 const data={format:6,createdAt:now(),keys:{}};
 [MAIN,...MODULE_KEYS,'futmaster-universe-v05'].forEach(k=>{const raw=localStorage.getItem(k);if(raw!==null)data.keys[k]=raw;});
 return data;
}
function checksum(snapshot){
 const text=Object.keys(snapshot.keys).sort().map(k=>k+snapshot.keys[k]).join('|');
 let hash=2166136261;
 for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
 return (hash>>>0).toString(16).padStart(8,'0');
}
function validateSnapshot(snap){
 if(!snap||snap.format!==6||!snap.keys?.[MAIN])return {ok:false,errors:['Snapshot sem carreira principal.']};
 const errors=[];
 try{
   const s=JSON.parse(snap.keys[MAIN]);
   if(!Array.isArray(s.teams)||!s.userTeamId)errors.push('Estrutura principal incompleta.');
   if(!Number.isFinite(s.season)||!Number.isFinite(s.week))errors.push('Data da carreira inválida.');
   if(!s.teams?.some(t=>t.id===s.userTeamId))errors.push('Clube controlado ausente.');
 }catch{errors.push('JSON principal corrompido.');}
 return {ok:errors.length===0,errors};
}
function meta(){
 const current=jget(META);
 if(current)return current;
 const initial={version:6,activeSlot:1,slots:[null,null,null],checkpoints:[],lastGood:null,autosave:true,keep:8,health:[],settings:{lowPower:false,confirmAdvance:false}};
 jset(META,initial);return initial;
}
function saveMeta(m){jset(META,m);}
function createCheckpoint(reason='Automático'){
 const s=state();if(!s)return;
 const m=meta(),snap=collect();snap.reason=reason;snap.signature=signature(s);snap.checksum=checksum(snap);
 const valid=validateSnapshot(snap);if(!valid.ok)return;
 m.checkpoints.unshift(snap);m.checkpoints=m.checkpoints.slice(0,m.keep);m.lastGood=snap;
 saveMeta(m);
}
function saveSlot(index){
 const s=state();if(!s)return alert('Crie uma carreira antes de salvar.');
 const m=meta(),snap=collect();snap.reason=`Slot ${index+1}`;snap.signature=signature(s);snap.checksum=checksum(snap);
 const valid=validateSnapshot(snap);if(!valid.ok)return alert(valid.errors.join('\n'));
 m.slots[index]=snap;m.activeSlot=index+1;m.lastGood=snap;saveMeta(m);render(active);
}
function restoreSnapshot(snap){
 const valid=validateSnapshot(snap);if(!valid.ok)return alert(`Backup inválido:\n${valid.errors.join('\n')}`);
 Object.entries(snap.keys).forEach(([k,v])=>localStorage.setItem(k,v));
 location.reload();
}
function deleteSlot(index){const m=meta();m.slots[index]=null;saveMeta(m);render(active);}
function exportAll(){
 const snap=collect();snap.checksum=checksum(snap);
 const blob=new Blob([JSON.stringify(snap,null,2)],{type:'application/json'});
 const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`futmaster-backup-${Date.now()}.json`;a.click();URL.revokeObjectURL(a.href);
}
function importAll(file){
 const reader=new FileReader();
 reader.onload=()=>{try{const snap=JSON.parse(reader.result);const v=validateSnapshot(snap);if(!v.ok)throw new Error(v.errors.join(', '));restoreSnapshot(snap);}catch(e){alert(`Falha ao importar: ${e.message}`);}};
 reader.readAsText(file);
}
function healthCheck(){
 const s=state(),issues=[],warnings=[];
 if(!s)return {score:0,issues:['Nenhuma carreira carregada.'],warnings,metrics:{}};
 const team=s.teams?.find(t=>t.id===s.userTeamId);
 if(!team)issues.push('Clube controlado não encontrado.');
 if(!Array.isArray(s.fixtures))issues.push('Calendário principal ausente.');
 if(!Array.isArray(team?.squad)||team.squad.length<11)issues.push('Elenco insuficiente.');
 const dup=new Set(),duplicates=[];
 (team?.squad||[]).forEach(p=>{if(dup.has(p.id))duplicates.push(p.id);dup.add(p.id);});
 if(duplicates.length)issues.push(`${duplicates.length} identificador(es) duplicado(s) no elenco.`);
 const badPlayers=(team?.squad||[]).filter(p=>!Number.isFinite(p.overall)||p.overall<1||p.overall>99);
 if(badPlayers.length)issues.push(`${badPlayers.length} atleta(s) com overall inválido.`);
 if(Math.abs(s.finance?.balance||0)>1e12)warnings.push('Caixa fora da escala esperada.');
 if((s.matchHistory||[]).length>2500)warnings.push('Histórico muito grande; exportar e compactar pode melhorar o desempenho.');
 const metrics={
  teams:s.teams?.length||0,players:(s.teams||[]).reduce((n,t)=>n+(t.squad?.length||0),0),
  matches:(s.matchHistory||[]).length,balance:s.finance?.balance||0,
  storage:Object.keys(localStorage).reduce((n,k)=>n+(localStorage.getItem(k)?.length||0),0)
 };
 const score=Math.max(0,100-issues.length*25-warnings.length*7);
 const result={at:now(),score,issues,warnings,metrics};const m=meta();m.health.unshift(result);m.health=m.health.slice(0,20);if(score>=75){const snap=collect();snap.checksum=checksum(snap);m.lastGood=snap;}saveMeta(m);return result;
}
function runBalanceLab(samples=250){
 const s=state();if(!s||!global.FMMatch)return null;
 const teams=s.teams,goals=[],upsets=[],cards=[],injuries=[];
 for(let i=0;i<samples;i++){
  const a=teams[i%teams.length],b=teams[(i*3+1)%teams.length];
  const cloneA=JSON.parse(JSON.stringify(a)),cloneB=JSON.parse(JSON.stringify(b));
  const r=global.FMMatch.simulateMatch(cloneA,cloneB,{season:s.season,week:s.week});
  goals.push(r.homeGoals+r.awayGoals);
  cards.push((r.stats?.yellows?.[0]||0)+(r.stats?.yellows?.[1]||0)+(r.stats?.reds?.[0]||0)+(r.stats?.reds?.[1]||0));
  injuries.push(r.injuries?.length||0);
  const oa=C.calculateTeamOverall(cloneA),ob=C.calculateTeamOverall(cloneB);
  if(Math.abs(oa-ob)>=15){const weakerHome=oa<ob;const weakerWon=weakerHome?r.homeGoals>r.awayGoals:r.awayGoals>r.homeGoals;upsets.push(weakerWon?1:0);}
 }
 const avg=a=>a.reduce((x,y)=>x+y,0)/Math.max(1,a.length);
 return {samples,goals:C.round(avg(goals),2),cards:C.round(avg(cards),2),injuries:C.round(avg(injuries),3),upsets:C.round(avg(upsets)*100,1)};
}
function compact(){
 const s=state();if(!s)return;
 createCheckpoint('Antes da compactação');
 s.matchHistory=(s.matchHistory||[]).slice(0,600);s.careerHistory=(s.careerHistory||[]).slice(0,1200);s.news=(s.news||[]).slice(0,150);
 if(s.finance?.cashFlow)s.finance.cashFlow=s.finance.cashFlow.slice(0,300);
 localStorage.setItem(MAIN,JSON.stringify(s));alert('Históricos compactados com backup automático.');render(active);
}
function stat(l,v,d){return `<div class="card stat-card"><span>${l}</span><strong>${v}</strong><small>${d}</small></div>`;}
function addNav(){
 const nav=document.querySelector('.nav-list');if(!nav||nav.querySelector('[data-v06-view]'))return;
 const before=nav.querySelector('[data-view="history"]');
 Object.entries(VIEWS).forEach(([id,label])=>{const b=document.createElement('button');b.className='nav-item';b.dataset.v06View=id;b.textContent=label;nav.insertBefore(b,before||null);b.onclick=e=>{e.preventDefault();document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');active=id;render(id);};});
}
function render(view){
 const root=document.querySelector('#app-view'),m=meta();if(!root)return;
 document.querySelector('#page-title').textContent=VIEWS[view]||'FutMaster';
 if(view==='recovery'){
  root.innerHTML=`<div class="grid grid-4">${stat('Autosave',m.autosave?'Ativo':'Desativado','Checkpoint antes de avançar')}${stat('Checkpoints',m.checkpoints.length,`Mantém os últimos ${m.keep}`)}${stat('Slot ativo',m.activeSlot,'Três slots locais')}${stat('Uso local',`${Math.round(Object.keys(localStorage).reduce((n,k)=>n+(localStorage.getItem(k)?.length||0),0)/1024)} KB`,'Todos os módulos')}</div>
  <div class="card section-gap"><div class="card-header"><div><h2>Slots de carreira</h2><p class="muted">Cada slot inclui o jogo principal e todas as expansões locais.</p></div><div class="button-row"><button class="secondary-button" data-v06-action="export">Exportar tudo</button><label class="secondary-button file-button">Importar<input type="file" accept=".json,application/json" data-v06-import hidden></label></div></div>
  <div class="grid grid-3">${m.slots.map((slot,i)=>`<div class="save-slot"><h3>Slot ${i+1}</h3>${slot?`<b>${slot.signature}</b><small>${new Date(slot.createdAt).toLocaleString('pt-BR')} · ${slot.checksum}</small><div class="button-row"><button class="primary-button" data-v06-action="restore-slot" data-id="${i}">Carregar</button><button class="danger-button" data-v06-action="delete-slot" data-id="${i}">Apagar</button></div>`:`<p class="muted">Vazio</p>`}<button class="secondary-button" data-v06-action="save-slot" data-id="${i}">Salvar aqui</button></div>`).join('')}</div></div>
  <div class="card section-gap"><div class="card-header"><h2>Recuperação</h2><button class="primary-button" data-v06-action="checkpoint">Criar checkpoint</button></div>${m.checkpoints.slice(0,8).map((cp,i)=>`<div class="list-item"><div><b>${cp.reason}</b><small>${cp.signature} · ${new Date(cp.createdAt).toLocaleString('pt-BR')}</small></div><button class="secondary-button" data-v06-action="restore-checkpoint" data-id="${i}">Restaurar</button></div>`).join('')||'<p class="muted">Nenhum checkpoint.</p>'}</div>`;
 }else{
  const h=healthCheck(),lab=runBalanceLab(120);
  root.innerHTML=`<div class="grid grid-4">${stat('Saúde do save',`${h.score}/100`,h.issues.length?'Requer atenção':'Estrutura válida')}${stat('Clubes',h.metrics.teams||0,`${h.metrics.players||0} atletas`)}${stat('Jogos salvos',h.metrics.matches||0,'Histórico principal')}${stat('Simulação',lab?`${lab.goals} gols/jogo`:'—',lab?`${lab.upsets}% zebras grandes`:'Motor indisponível')}</div>
  <div class="grid grid-2 section-gap"><div class="card"><h2>Problemas</h2>${h.issues.map(x=>`<div class="alert danger">${x}</div>`).join('')||'<p>Nenhum problema estrutural detectado.</p>'}<h3>Avisos</h3>${h.warnings.map(x=>`<div class="alert warning">${x}</div>`).join('')||'<p class="muted">Sem avisos.</p>'}</div>
  <div class="card"><h2>Laboratório de balanceamento</h2>${lab?`<p>120 partidas descartáveis, sem alterar a carreira.</p><div class="metric-line"><span>Gols por jogo</span><b>${lab.goals}</b></div><div class="metric-line"><span>Cartões por jogo</span><b>${lab.cards}</b></div><div class="metric-line"><span>Lesões por jogo</span><b>${lab.injuries}</b></div><div class="metric-line"><span>Zebras com diferença ≥15</span><b>${lab.upsets}%</b></div>`:'<p>Motor indisponível.</p>'}</div></div>
  <div class="card section-gap"><div class="card-header"><div><h2>Manutenção</h2><p class="muted">Ferramentas seguras com checkpoint automático.</p></div><button class="secondary-button" data-v06-action="compact">Compactar históricos</button></div><label class="checkbox"><input type="checkbox" data-v06-setting="autosave" ${m.autosave?'checked':''}> Criar checkpoint antes de cada avanço</label><label class="checkbox"><input type="checkbox" data-v06-setting="lowPower" ${m.settings.lowPower?'checked':''}> Modo econômico para celulares</label></div>`;
 }
}
function bind(){
 document.addEventListener('click',e=>{
  const a=e.target.closest('[data-v06-action]');if(a){e.preventDefault();const m=meta(),id=Number(a.dataset.id);
   if(a.dataset.v06Action==='save-slot')saveSlot(id);
   if(a.dataset.v06Action==='restore-slot')restoreSnapshot(m.slots[id]);
   if(a.dataset.v06Action==='delete-slot')deleteSlot(id);
   if(a.dataset.v06Action==='restore-checkpoint')restoreSnapshot(m.checkpoints[id]);
   if(a.dataset.v06Action==='checkpoint'){createCheckpoint('Manual');render(active);}
   if(a.dataset.v06Action==='export')exportAll();
   if(a.dataset.v06Action==='compact')compact();
  }
  const action=e.target.closest('[data-action]')?.dataset.action;
  if(['simulate-week','simulate-month','next-season'].includes(action)&&meta().autosave)createCheckpoint(`Antes de ${action}`);
 },true);
 document.addEventListener('change',e=>{
  if(e.target.matches('[data-v06-import]')&&e.target.files?.[0])importAll(e.target.files[0]);
  const s=e.target.dataset.v06Setting;if(!s)return;const m=meta();
  if(s==='autosave')m.autosave=e.target.checked;if(s==='lowPower')m.settings.lowPower=e.target.checked;saveMeta(m);
 });
 global.addEventListener('error',()=>{const m=meta();if(m.lastGood)localStorage.setItem('futmaster-v06-crash-marker',JSON.stringify({at:now(),available:true}));});
}
function init(){addNav();meta();if(state()&&!meta().lastGood)createCheckpoint('Primeiro backup 0.6');bind();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
