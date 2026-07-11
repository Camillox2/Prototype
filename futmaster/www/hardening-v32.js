(function(global){
'use strict';
const MAIN='futmaster-save-v4',RECOVERY='futmaster-recovery-v32',DIAG='futmaster-diagnostics-v32',UNIVERSE='futmaster-universe-v05',VIEW='Diagnóstico';
let active=false,storageEstimate={usage:0,quota:0};
function get(k,f=null){try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch(error){global.FMPreflight32?.journal('storage',`JSON inválido em ${k}`,error.message);return f;}}
function set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true;}catch(error){global.FMPreflight32?.journal('storage',`Falha ao salvar ${k}`,error.message);return false;}}
function finite(value,fallback=0,min=-1e12,max=1e12){const n=Number(value);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function uniqueId(prefix,used){let id;do{id=`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;}while(used.has(id));used.add(id);return id;}
function normalizeState(state){
  const fixes=[];
  if(!state||typeof state!=='object')return {state:null,fixes:['Save principal ausente ou inválido.'],valid:false};
  if(!Array.isArray(state.teams)||!state.teams.length)return {state,fixes:['Nenhum clube disponível.'],valid:false};
  const teamIds=new Set();
  state.teams=state.teams.filter(team=>team&&typeof team==='object').map((team,index)=>{
    if(!team.id||teamIds.has(team.id)){team.id=uniqueId('team',teamIds);fixes.push(`ID do clube ${index+1} reparado.`);}else teamIds.add(team.id);
    team.name=String(team.name||`Clube ${index+1}`).slice(0,60);
    team.squad=Array.isArray(team.squad)?team.squad:[];
    const playerIds=new Set();
    team.squad=team.squad.filter(Boolean).map((player,pindex)=>{
      if(!player.id||playerIds.has(player.id)){player.id=uniqueId(`player-${index}`,playerIds);fixes.push(`Jogador duplicado reparado em ${team.name}.`);}else playerIds.add(player.id);
      player.name=String(player.name||`Jogador ${pindex+1}`).slice(0,60);
      player.age=Math.round(finite(player.age,20,14,50));player.overall=finite(player.overall,50,1,99);player.potential=finite(player.potential,player.overall,player.overall,99);player.morale=finite(player.morale,65,0,100);player.fitness=finite(player.fitness,85,0,100);player.value=finite(player.value,0,0,1e10);player.wage=finite(player.wage,0,0,1e8);
      return player;
    });
    team.squad.sort((a,b)=>(b.overall||0)-(a.overall||0));
    if(team.squad.length>35){team.squad=team.squad.slice(0,35);fixes.push(`Elenco de ${team.name} reduzido para 35.`);}
    team.academy=team.academy&&typeof team.academy==='object'?team.academy:{u15:[],u17:[],u20:[]};
    for(const [key,limit] of [['u15',18],['u17',20],['u20',22]]){team.academy[key]=Array.isArray(team.academy[key])?team.academy[key].filter(Boolean).slice(0,limit):[];}
    for(const key of ['played','wins','draws','losses','gf','ga','points'])team[key]=finite(team[key],0,0,1e7);
    return team;
  });
  if(!state.teams.some(team=>team.id===state.userTeamId)){state.userTeamId=state.teams[0].id;fixes.push('Clube controlado restaurado.');}
  state.season=Math.round(finite(state.season,2026,1900,9999));state.week=Math.round(finite(state.week,1,1,60));
  state.matchHistory=Array.isArray(state.matchHistory)?state.matchHistory.slice(0,2500):[];
  state.finance=state.finance&&typeof state.finance==='object'?state.finance:{};
  state.finance.balance=finite(state.finance.balance,0,-1e9,1e12);state.finance.seasonRevenue=finite(state.finance.seasonRevenue,0,0,1e12);state.finance.seasonExpenses=finite(state.finance.seasonExpenses,0,0,1e12);state.finance.cashFlow=Array.isArray(state.finance.cashFlow)?state.finance.cashFlow.slice(0,1200):[];
  if(state.fans){state.fans.satisfaction=finite(state.fans.satisfaction,60,0,100);state.fans.total=finite(state.fans.total,100000,0,1e9);}
  if(state.board)state.board.confidence=finite(state.board.confidence,60,0,100);
  return {state,fixes,valid:true};
}
function removeWomen(){
  const u=get(UNIVERSE);if(u&&!u.women?.removed){u.women={enabled:false,removed:true,team:null,automation:'Desativado',investment:'Desativado',finance:{balance:0,revenue:0,expenses:0},season:{played:0,wins:0,draws:0,losses:0,points:0,gf:0,ga:0},trophies:0,youthLevel:0,sponsor:null,history:[]};set(UNIVERSE,u);}
  document.querySelectorAll('[data-v05-view="women"]').forEach(node=>node.remove());
}
function currentBundle(){if(global.FMMultiplayer31?.collectBundle)return global.FMMultiplayer31.collectBundle();const keys={};const entries=global.FMStorageNamespace?.entries?.()||{};for(const [key,value] of Object.entries(entries)){try{keys[key]=JSON.parse(value);}catch{}}return {main:keys[MAIN]||get(MAIN),modules:Object.fromEntries(Object.entries(keys).filter(([key])=>key!==MAIN))};}
function checkpoint(reason='manual'){
  const payload={format:'futmaster-recovery',version:32,reason,at:new Date().toISOString(),bundle:currentBundle()};
  const raw=JSON.stringify(payload);if(raw.length>12_000_000){global.FMPreflight32?.journal('checkpoint','Checkpoint ignorado por tamanho',raw.length);return false;}return set(RECOVERY,payload);
}
function restore(){const recovery=get(RECOVERY);if(!recovery?.bundle?.main)throw new Error('Nenhum checkpoint válido.');set(MAIN,recovery.bundle.main);for(const [key,value] of Object.entries(recovery.bundle.modules||{}))set(key,value);location.reload();}
function validate(saveChanges=true){const result=normalizeState(get(MAIN));if(result.valid&&saveChanges&&result.fixes.length)set(MAIN,result.state);set(DIAG,{version:32,at:new Date().toISOString(),valid:result.valid,fixes:result.fixes,season:result.state?.season,week:result.state?.week,teams:result.state?.teams?.length||0,matches:result.state?.matchHistory?.length||0});return result;}
function download(data,name){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function patchBackup(){if(!global.FMRelease10||global.FMRelease10.__v32Backup)return;global.FMRelease10.exportFull=function(){const entries=global.FMStorageNamespace?.entries?.()||{},keys={};for(const [key,value] of Object.entries(entries))keys[key]=value;download({format:'futmaster-full',version:32,namespace:global.FMStorageNamespace?.runtime?.()||{mode:'offline'},keys},`futmaster-backup-${Date.now()}.json`);};global.FMRelease10.__v32Backup=true;}
async function estimate(){try{if(navigator.storage?.estimate)storageEstimate=await navigator.storage.estimate();}catch{}if(active)render();}
function addNav(){const nav=document.querySelector('.nav-list');if(!nav||nav.querySelector('[data-v32-view]'))return;const b=document.createElement('button');b.className='nav-item';b.dataset.v32View='diagnostics';b.textContent=VIEW;nav.appendChild(b);b.onclick=()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');active=true;render();};}
function formatBytes(n){if(!n)return '0 MB';return `${(n/1024/1024).toFixed(1)} MB`;}
function esc(x){return String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function render(){const root=document.querySelector('#app-view');if(!root)return;const result=validate(false),diag=get(DIAG,{}),errors=global.FMPreflight32?.read?.()||[],recovery=get(RECOVERY),ratio=storageEstimate.quota?Math.round(storageEstimate.usage/storageEstimate.quota*100):0;document.querySelector('#page-title').textContent=VIEW;root.innerHTML=`<div class="grid grid-4"><div class="card stat-card"><span>Save</span><strong>${result.valid?'Íntegro':'Problema'}</strong><small>${result.fixes.length} ajuste(s)</small></div><div class="card stat-card"><span>Armazenamento</span><strong>${formatBytes(storageEstimate.usage)}</strong><small>${ratio}% de ${formatBytes(storageEstimate.quota)}</small></div><div class="card stat-card"><span>Erros registrados</span><strong>${errors.length}</strong><small>Últimos 80</small></div><div class="card stat-card"><span>Checkpoint</span><strong>${recovery?'Disponível':'Ausente'}</strong><small>${esc(recovery?.at||'—')}</small></div></div><div class="grid grid-2 section-gap"><div class="card"><h2>Integridade</h2>${result.fixes.map(text=>`<div class="list-item"><span>${esc(text)}</span></div>`).join('')||'<p class="positive">Nenhuma inconsistência detectada.</p>'}<div class="button-row section-gap"><button data-v32-action="validate">Validar e corrigir</button><button data-v32-action="checkpoint">Criar checkpoint</button><button data-v32-action="restore" ${!recovery?'disabled':''}>Restaurar</button></div></div><div class="card"><h2>Relatório</h2><div class="list-item"><span>Temporada</span><b>${diag.season||'—'} / S${diag.week||'—'}</b></div><div class="list-item"><span>Clubes</span><b>${diag.teams||0}</b></div><div class="list-item"><span>Partidas salvas</span><b>${diag.matches||0}</b></div><div class="button-row section-gap"><button data-v32-action="export">Exportar diagnóstico</button><button class="danger-button" data-v32-action="clear-errors">Limpar erros</button></div></div></div><div class="card section-gap"><h2>Log de falhas</h2>${errors.slice(0,20).map(row=>`<details class="error-row"><summary>${esc(row.type)} · ${esc(row.message)} <small>${esc(row.at)}</small></summary><pre>${esc(row.detail)}</pre></details>`).join('')||'<p class="muted">Nenhum erro capturado.</p>'}</div>`;}
function bind(){document.addEventListener('click',event=>{const nav=event.target.closest?.('.nav-item');if(nav&&!nav.matches('[data-v32-view]'))active=false;const action=event.target.closest('[data-v32-action]')?.dataset.v32Action;if(action){try{if(action==='validate'){const r=validate(true);alert(r.valid?`Save válido. ${r.fixes.length} correção(ões).`:'Save inválido.');}if(action==='checkpoint')checkpoint('manual');if(action==='restore'&&confirm('Restaurar o último checkpoint?'))restore();if(action==='clear-errors')global.FMPreflight32?.clear?.();if(action==='export')download({diagnostics:get(DIAG),errors:global.FMPreflight32?.read?.()||[],runtime:global.FMStorageNamespace?.runtime?.(),userAgent:navigator.userAgent},`futmaster-diagnostico-${Date.now()}.json`);render();}catch(error){alert(error.message);}}
 const core=event.target.closest('[data-action]')?.dataset.action;if(['simulate-week','simulate-month','next-season'].includes(core)){checkpoint(`antes-${core}`);setTimeout(()=>{validate(true);removeWomen();patchBackup();},1200);}},true);}
function init(){removeWomen();patchBackup();validate(true);addNav();bind();estimate();setInterval(()=>{removeWomen();patchBackup();},15000);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
