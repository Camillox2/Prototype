(function(global){
'use strict';
const C=global.FMCore;
const MAIN='futmaster-save-v4',KEY='futmaster-awards-v21',VIEW='Central de Premiações';
const SOUTH_AMERICA=['Brasil','Argentina','Uruguai','Uruguay','Colômbia','Colombia','Chile','Paraguai','Paraguay','Peru','Equador','Ecuador','Bolívia','Bolivia','Venezuela'];
const EUROPE=['Portugal','Itália','Italy','Espanha','Spain','França','France','Alemanha','Germany','Inglaterra','England','Holanda','Netherlands','Bélgica','Belgium','Croácia','Croatia','Suíça','Switzerland','Noruega','Norway','Suécia','Sweden','Áustria','Austria','Polônia','Poland'];
const AWARDS=[
 ['ballon','Bola de Ouro','Mundo'],['the-best','The Best FIFA – Melhor Jogador','Mundo'],['laureus','Laureus – Esportista Mundial','Mundo'],['iffhs-player','IFFHS – Melhor Jogador do Mundo','Mundo'],['iffhs-playmaker','IFFHS – Melhor Armador do Mundo','Mundo'],['iffhs-goalscorer','IFFHS – Maior Goleador Mundial','Mundo'],['onze-dor','Onze d’Or','Mundo'],['globe-soccer','Globe Soccer – Melhor Jogador','Mundo'],
 ['golden-shoe','Chuteira de Ouro Europeia','Europa'],['europe-player','Melhor Jogador da Europa','Europa'],['golden-boy','Golden Boy','Europa'],['ucl-player','Melhor Jogador da Champions','Europa'],['ucl-young','Melhor Jovem da Champions','Europa'],['ucl-scorer','Artilheiro da Champions','Europa'],['uel-player','Melhor Jogador da Europa League','Europa'],
 ['rey-america','Rei da América','América do Sul'],['libertadores-player','Melhor Jogador da Libertadores','América do Sul'],['libertadores-scorer','Artilheiro da Libertadores','América do Sul'],['sudamericana-player','Melhor Jogador da Sul-Americana','América do Sul'],
 ['kopa','Troféu Kopa','Mundo'],['yashin','Troféu Yashin','Mundo'],['gerd-muller','Troféu Gerd Müller','Mundo'],['puskas','Prêmio Puskás','Mundo'],['socrates','Prêmio Sócrates','Mundo'],['fifa-gk','The Best FIFA – Melhor Goleiro','Mundo'],['fifa-coach','The Best FIFA – Melhor Técnico','Mundo'],['cruyff-coach','Troféu Johan Cruyff – Técnico','Mundo'],['club-year','Clube do Ano','Mundo'],
 ['league-player','Craque do Campeonato','Nacional'],['league-young','Revelação do Campeonato','Nacional'],['league-gk','Melhor Goleiro do Campeonato','Nacional'],['league-scorer','Artilheiro do Campeonato','Nacional'],['league-assists','Líder de Assistências do Campeonato','Nacional'],['league-coach','Melhor Técnico do Campeonato','Nacional'],['best-defender','Melhor Defensor da Temporada','Nacional'],['best-midfielder','Melhor Meio-campista da Temporada','Nacional'],['best-forward','Melhor Atacante da Temporada','Nacional'],
 ['worldcup-ball','Bola de Ouro da Copa do Mundo','Seleções'],['worldcup-boot','Chuteira de Ouro da Copa do Mundo','Seleções'],['worldcup-glove','Luva de Ouro da Copa do Mundo','Seleções'],['worldcup-young','Melhor Jovem da Copa do Mundo','Seleções'],['fair-play','Prêmio FIFA Fair Play','Especial'],['fan-award','Prêmio FIFA da Torcida','Especial']
];
let active=false,selectedSeason=0;
function get(k,f=null){try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch{return f;}}
function set(k,v){localStorage.setItem(k,JSON.stringify(v));}
function state(){return get(MAIN);}
function countryOf(t,p){return String(t?.country||t?.nation||t?.city||p?.nationality||'').trim();}
function region(t,p){const x=countryOf(t,p);if(SOUTH_AMERICA.some(c=>x.includes(c)))return 'south-america';if(EUROPE.some(c=>x.includes(c)))return 'europe';return 'other';}
function stats(p){return {apps:Number(p.appearances||p.matches||0),goals:Number(p.goals||0),assists:Number(p.assists||0),rating:Number(p.averageRating||p.form||6.2),clean:Number(p.cleanSheets||0),saves:Number(p.saves||0)};}
function playerScore(s,p,t){const x=stats(p),club=C.clamp((t?.points||0)*.12+(t?.reputation||50)*.08,0,20),discipline=C.clamp(10-(p.yellowCards||0)*.25-(p.redCards||0)*1.5,0,10);return (p.overall||50)*.42+(p.potential||p.overall||50)*.05+x.rating*6.5+x.goals*.9+x.assists*.68+x.apps*.08+club+discipline+(p.morale||60)*.025;}
function goalScore(p){const a=p.attributes||{};return Number(p.goals||0)*3+(a.finalizacao||p.overall||50)*.35+(a.chuteLonge||a.longShots||50)*.3+(a.tecnica||50)*.2+C.random(0,18);}
function allPlayers(s){return s.teams.flatMap(t=>(t.squad||[]).map(p=>({p,t,score:playerScore(s,p,t),region:region(t,p),stats:stats(p)})));}
function finalists(list,metric,n=3){return [...list].sort((a,b)=>metric(b)-metric(a)).slice(0,n);}
function result(id,defs,candidates,metric,reason){const top=finalists(candidates,metric);if(!top.length)return null;return {id,label:defs[id].label,category:defs[id].category,winner:{id:top[0].p.id,name:top[0].p.name,club:top[0].t.name,position:top[0].p.position,age:top[0].p.age,score:Number(metric(top[0]).toFixed(2))},finalists:top.map(x=>({id:x.p.id,name:x.p.name,club:x.t.name,score:Number(metric(x).toFixed(2))})),reason};}
function coachCandidates(s){const management=get('futmaster-management-v11'),rows=(management?.managers||[]).map(m=>{const t=s.teams.find(x=>x.id===m.teamId);return {name:m.name,club:t?.name||'Clube',teamId:m.teamId,score:(m.quality||60)*.35+(m.reputation||50)*.2+(t?.points||0)*.8+(m.jobSecurity||50)*.12};});const user=s.teams.find(t=>t.id===s.userTeamId);rows.push({name:s.managerName||'Treinador',club:user?.name||'Clube',teamId:s.userTeamId,score:(user?.points||0)*.9+(s.board?.confidence||60)*.2+(s.records?.titles||0)*7});return rows.sort((a,b)=>b.score-a.score);}
function clubCandidates(s){return [...s.teams].map(t=>({id:t.id,name:t.name,score:(t.points||0)*1.15+(t.wins||0)*1.4+(t.reputation||50)*.25-(t.losses||0)*.45})).sort((a,b)=>b.score-a.score);}
function specialResult(id,defs,row,reason){return row?{id,label:defs[id].label,category:defs[id].category,winner:row,finalists:[row],reason}:null;}
function generate(s,season){
 const list=allPlayers(s),europe=list.filter(x=>x.region==='europe'),south=list.filter(x=>x.region==='south-america'),gks=list.filter(x=>x.p.position==='GOL'),young=list.filter(x=>(x.p.age||99)<=21),defenders=list.filter(x=>['LD','LE','ZAG'].includes(x.p.position)),mids=list.filter(x=>['VOL','MC','MEI'].includes(x.p.position)),attackers=list.filter(x=>['ATA','PD','PE'].includes(x.p.position));
 const byScore=x=>x.score,byGoals=x=>x.stats.goals*10+x.stats.assists*2+x.score*.15,byAssists=x=>x.stats.assists*10+x.stats.goals*1.5+x.score*.12,byGK=x=>x.score+x.stats.clean*2+x.stats.saves*.08,byGoal=x=>goalScore(x.p),byPlaymaker=x=>x.score+x.stats.assists*4+(x.p.attributes?.visao||50)*.25+(x.p.attributes?.passe||50)*.2;
 const defs={};AWARDS.forEach(([id,label,category])=>defs[id]={label,category});const out=[],push=x=>{if(x)out.push(x);};
 push(result('ballon',defs,list,byScore,'Impacto geral, desempenho e títulos'));
 push(result('the-best',defs,list,x=>x.score+(x.p.reputation||50)*.08+C.random(0,5),'Desempenho e votação global simulada'));
 push(result('laureus',defs,list,x=>x.score+x.stats.goals*.35+(x.p.reputation||50)*.18,'Excelência esportiva e projeção global'));
 push(result('iffhs-player',defs,list,x=>x.score+x.stats.apps*.15,'Índice estatístico anual'));
 push(result('iffhs-playmaker',defs,mids.length?mids:list,byPlaymaker,'Criação, passe, visão e assistências'));
 push(result('iffhs-goalscorer',defs,attackers.length?attackers:list,byGoals,'Produção goleadora mundial'));
 push(result('onze-dor',defs,list,x=>x.score+x.stats.rating*1.8,'Desempenho e votação da imprensa'));
 push(result('globe-soccer',defs,list,x=>x.score+(x.p.reputation||50)*.12+x.stats.goals*.25,'Desempenho e impacto global'));
 const euro=europe.length?europe:list,sa=south.length?south:list;
 push(result('golden-shoe',defs,euro,byGoals,'Gols ponderados por desempenho'));
 push(result('europe-player',defs,euro,byScore,'Desempenho em clube europeu'));
 push(result('golden-boy',defs,euro.filter(x=>x.p.age<=21),byScore,'Melhor jovem atuando na Europa'));
 push(result('ucl-player',defs,euro,x=>x.score+x.stats.rating*2,'Peso continental europeu'));
 push(result('ucl-young',defs,euro.filter(x=>x.p.age<=21),byScore,'Destaque jovem continental'));
 push(result('ucl-scorer',defs,euro,byGoals,'Gols continentais estimados'));
 push(result('uel-player',defs,euro,x=>x.score+x.stats.apps*.12,'Destaque na competição continental secundária'));
 push(result('rey-america',defs,sa,byScore,'Melhor atuação na América do Sul'));
 push(result('libertadores-player',defs,sa,x=>x.score+x.stats.rating*1.5,'Peso continental sul-americano'));
 push(result('libertadores-scorer',defs,sa,byGoals,'Gols continentais estimados'));
 push(result('sudamericana-player',defs,sa,x=>x.score+x.stats.apps*.1,'Destaque continental sul-americano'));
 push(result('kopa',defs,young,byScore,'Melhor jogador sub-21'));
 push(result('yashin',defs,gks,byGK,'Defesas, jogos sem sofrer gols e média'));
 push(result('gerd-muller',defs,attackers.length?attackers:list,byGoals,'Maior produção ofensiva'));
 push(result('puskas',defs,list,byGoal,'Qualidade técnica e importância do gol'));
 push(result('socrates',defs,list,x=>x.score+(x.p.attributes?.lideranca||50)*.3-(x.p.redCards||0)*6,'Liderança, disciplina e impacto positivo'));
 push(result('fifa-gk',defs,gks,byGK,'Melhor goleiro no ano'));
 const coaches=coachCandidates(s),clubs=clubCandidates(s),coachTop=coaches[0],clubTop=clubs[0];
 push(specialResult('fifa-coach',defs,coachTop&&{name:coachTop.name,club:coachTop.club,score:Number(coachTop.score.toFixed(2))},'Resultados, reputação e trabalho anual'));
 push(specialResult('cruyff-coach',defs,coaches[1]&&{name:coaches[1].name,club:coaches[1].club,score:Number(coaches[1].score.toFixed(2))},'Qualidade tática e desenvolvimento'));
 push(specialResult('club-year',defs,clubTop&&{id:clubTop.id,name:clubTop.name,club:clubTop.name,score:Number(clubTop.score.toFixed(2))},'Resultados e reputação do clube'));
 push(result('league-player',defs,list,byScore,'Desempenho na liga'));
 push(result('league-young',defs,young,byScore,'Desempenho jovem na liga'));
 push(result('league-gk',defs,gks,byGK,'Desempenho de goleiro na liga'));
 push(result('league-scorer',defs,list,byGoals,'Artilharia nacional'));
 push(result('league-assists',defs,list,byAssists,'Maior produção de assistências'));
 push(specialResult('league-coach',defs,coachTop&&{name:coachTop.name,club:coachTop.club,score:Number(coachTop.score.toFixed(2))},'Melhor campanha nacional'));
 push(result('best-defender',defs,defenders.length?defenders:list,byScore,'Desempenho defensivo anual'));
 push(result('best-midfielder',defs,mids.length?mids:list,byPlaymaker,'Criação e domínio do meio-campo'));
 push(result('best-forward',defs,attackers.length?attackers:list,byGoals,'Gols, assistências e desempenho'));
 const wc=get('futmaster-universe-v05')?.worldCup;if(wc?.season===season){push(result('worldcup-ball',defs,list,x=>x.score+C.random(0,8),'Desempenho no Mundial'));push(result('worldcup-boot',defs,list,byGoals,'Artilharia do Mundial'));push(result('worldcup-glove',defs,gks,byGK,'Desempenho no Mundial'));push(result('worldcup-young',defs,young,byScore,'Destaque jovem do Mundial'));}
 push(result('fair-play',defs,list,x=>x.score-(x.p.yellowCards||0)*3-(x.p.redCards||0)*12,'Disciplina e espírito esportivo'));
 const fans=[...s.teams].sort((a,b)=>(b.reputation||0)-(a.reputation||0))[0];push(specialResult('fan-award',defs,fans&&{id:fans.id,name:`Torcida do ${fans.name}`,club:fans.name,score:Number((fans.reputation||50).toFixed(2))},'Mobilização e impacto da torcida'));
 const xi=[...list].sort((a,b)=>b.score-a.score),pick=(pos,n)=>xi.filter(x=>pos.includes(x.p.position)).slice(0,n).map(x=>({id:x.p.id,name:x.p.name,club:x.t.name,position:x.p.position}));const worldXI=[...pick(['GOL'],1),...pick(['LD','LE','ZAG'],4),...pick(['VOL','MC','MEI'],3),...pick(['PD','PE','ATA'],3)];
 return {season,generatedAt:new Date().toISOString(),awards:out,worldXI};
}
function create(s){return {version:21,signature:`${s.managerName}|${s.userTeamId}`,lastAwardedSeason:null,seasons:[],records:{players:{},coaches:{},clubs:{}}};}
function data(s){let d=get(KEY);if(!d||d.signature!==`${s.managerName}|${s.userTeamId}`){d=create(s);set(KEY,d);}return d;}
function record(d,seasonData){seasonData.awards.forEach(a=>{const key=a.winner.id||a.winner.name,box=a.id.includes('coach')?d.records.coaches:a.id==='club-year'||a.id==='fan-award'?d.records.clubs:d.records.players;box[key]=box[key]||{name:a.winner.name,club:a.winner.club,total:0,awards:{}};box[key].total++;box[key].awards[a.label]=(box[key].awards[a.label]||0)+1;});}
function ensure(s,d){const target=s.season-1;if(target>=2026&&d.lastAwardedSeason!==target){const seasonData=generate(s,target),old=d.seasons.findIndex(x=>x.season===target);if(old>=0)d.seasons.splice(old,1);d.seasons.unshift(seasonData);d.seasons=d.seasons.slice(0,60);d.lastAwardedSeason=target;record(d,seasonData);selectedSeason=0;set(KEY,d);}}
function addNav(){const nav=document.querySelector('.nav-list');if(!nav||nav.querySelector('[data-v21-view]'))return;const before=nav.querySelector('[data-view="history"]');const b=document.createElement('button');b.className='nav-item';b.dataset.v21View='awards';b.textContent=VIEW;nav.insertBefore(b,before||null);b.onclick=()=>{document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');active=true;selectedSeason=0;render();};}
function bindScope(){document.addEventListener('click',e=>{const item=e.target.closest?.('.nav-item');if(item&&!item.matches('[data-v21-view]'))active=false;},true);}
const esc=x=>String(x??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
function render(){const s=state(),root=document.querySelector('#app-view');if(!s||!root)return;const d=data(s);ensure(s,d);const preview=generate(s,s.season),available=[preview,...d.seasons.filter(x=>x.season!==preview.season)];selectedSeason=C.clamp(selectedSeason,0,Math.max(0,available.length-1));const current=available[selectedSeason],leaders=Object.values(d.records.players).sort((a,b)=>b.total-a.total).slice(0,12);document.querySelector('#page-title').textContent=VIEW;root.innerHTML=`<div class="grid grid-4"><div class="card stat-card"><span>Temporada</span><strong>${current.season}</strong><small>${selectedSeason===0?'Prévia em andamento':'Resultado definitivo'}</small></div><div class="card stat-card"><span>Prêmios</span><strong>${current.awards.length}</strong><small>Globais, continentais e nacionais</small></div><div class="card stat-card"><span>Seleção do ano</span><strong>${current.worldXI.length}</strong><small>FIFA Best XI simulado</small></div><div class="card stat-card"><span>Histórico</span><strong>${d.seasons.length}</strong><small>Temporadas concluídas</small></div></div><div class="card section-gap"><div class="card-header"><div><h2>Premiações ${current.season}</h2><p class="muted">Simulação masculina não oficial baseada no desempenho da carreira.</p></div><select data-awards-season>${available.map((x,i)=>`<option value="${i}" ${i===selectedSeason?'selected':''}>${x.season}${i===0?' · prévia':''}</option>`).join('')}</select></div><div class="awards-grid">${current.awards.map(a=>`<article class="award-card"><span>${esc(a.category)}</span><h3>${esc(a.label)}</h3><strong>${esc(a.winner.name)}</strong><small>${esc(a.winner.club||'')} · ${Number(a.winner.score||0).toFixed(1)} pts</small><p>${esc(a.reason)}</p><details><summary>Finalistas</summary>${a.finalists.map((f,i)=>`<div>${i+1}. ${esc(f.name)} — ${esc(f.club||'')} (${Number(f.score||0).toFixed(1)})</div>`).join('')}</details></article>`).join('')}</div></div><div class="grid grid-2 section-gap"><div class="card"><h2>Seleção do Ano</h2>${current.worldXI.map((p,i)=>`<div class="list-item"><span>${i+1}</span><b>${esc(p.name)}</b><small>${esc(p.position)} · ${esc(p.club)}</small></div>`).join('')}</div><div class="card"><h2>Maiores vencedores</h2>${leaders.map((p,i)=>`<div class="list-item"><span>${i+1}</span><b>${esc(p.name)}</b><small>${p.total} prêmio(s) · ${esc(p.club||'')}</small></div>`).join('')||'<p class="muted">O histórico crescerá com as temporadas.</p>'}</div></div>`;const select=root.querySelector('[data-awards-season]');if(select)select.onchange=()=>{selectedSeason=Number(select.value)||0;render();};}
function init(){addNav();bindScope();const s=state();if(s){const d=data(s);ensure(s,d);}document.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(['simulate-week','simulate-month','next-season'].includes(a))setTimeout(()=>{const s=state();if(!s)return;const d=data(s);ensure(s,d);if(active)render();},300);},true);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
