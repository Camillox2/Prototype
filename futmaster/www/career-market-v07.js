(function(global){
'use strict';
const C=global.FMCore, Systems=global.FMSystems;
const MAIN='futmaster-save-v4', KEY='futmaster-market-v07';
const VIEWS={marketlive:'Mercado vivo',scoutingplus:'Scouting mundial',managercareer:'Carreira do treinador'};
const REGIONS=[
 {id:'br',name:'Brasil',cost:45000,countries:['Brasil']},
 {id:'sa',name:'América do Sul',cost:80000,countries:['Argentina','Uruguai','Colômbia','Paraguai','Chile']},
 {id:'eu',name:'Europa',cost:140000,countries:['Portugal','Itália','Espanha','França','Alemanha','Inglaterra','Croácia']},
 {id:'af',name:'África',cost:100000,countries:['Nigéria','Senegal','Marrocos','Gana','Camarões']},
 {id:'as',name:'Ásia',cost:90000,countries:['Japão','Coreia do Sul','Austrália']},
 {id:'na',name:'América do Norte',cost:85000,countries:['Estados Unidos','México','Canadá']}
];
const LICENSES=[
 {id:'c',name:'Licença C',cost:150000,weeks:4,rep:4},
 {id:'b',name:'Licença B',cost:350000,weeks:6,rep:6},
 {id:'a',name:'Licença A',cost:700000,weeks:8,rep:8},
 {id:'pro',name:'Licença Pro',cost:1400000,weeks:12,rep:12}
];
const TRAITS=['Decisivo','Profissional','Leal','Ambicioso','Inconstante','Líder','Versátil','Especialista em pênaltis','Chuta de longe','Cresce em clássicos','Frágil fisicamente','Adaptação rápida','Mercenário','Bom em jogos grandes'];
let active=null;
function get(k,f=null){try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch{return f;}}
function set(k,v){localStorage.setItem(k,JSON.stringify(v));}
function main(){return get(MAIN);}
function write(s){localStorage.setItem(MAIN,JSON.stringify(s));}
function team(s,id){return s.teams.find(t=>t.id===id);}
function user(s){return team(s,s.userTeamId);}
function sig(s){return `${s.managerName}|${s.teams?.[0]?.squad?.[0]?.id||'new'}`;}
function hash(text){let h=0;for(const ch of String(text))h=(h*31+ch.charCodeAt(0))>>>0;return h;}
function traits(player){const h=hash(player.id);return [TRAITS[h%TRAITS.length],TRAITS[(h>>4)%TRAITS.length]].filter((v,i,a)=>a.indexOf(v)===i);}
function createData(s){
 return {version:7,signature:sig(s),lastSeason:s.season,lastWeek:s.week,
  manager:{reputation:52,license:null,course:null,style:'Equilibrado',salary:120000,jobHistory:[{season:s.season,teamId:s.userTeamId,teamName:user(s).name}],applications:[],offers:[],clubProfiles:{}},
  scouting:{regions:Object.fromEntries(REGIONS.map(r=>[r.id,{knowledge:r.id==='br'?65:15,assigned:false,weeks:0}])),assignments:[],reports:[],shortlist:[],budget:600000},
  market:{transactions:[],news:[],pendingOffers:[],negotiations:[],preContracts:[],inflation:1,lastProcessedWeek:s.week},
  settings:{autoScouting:true,autoNegotiation:true,jobAlerts:true}
 };
}
function data(s){let d=get(KEY);if(!d||d.version!==7||d.signature!==sig(s)){d=createData(s);set(KEY,d);}return d;}
function cash(s,amount,category,description){
 s.finance.balance+=amount;if(amount>=0)s.finance.seasonRevenue=(s.finance.seasonRevenue||0)+amount;else s.finance.seasonExpenses=(s.finance.seasonExpenses||0)+Math.abs(amount);
 s.finance.cashFlow=s.finance.cashFlow||[];s.finance.cashFlow.unshift({week:s.week,season:s.season,type:amount>=0?'Receita':'Despesa',category,amount,description});
}
function addNews(d,s,text){d.market.news.unshift({season:s.season,week:s.week,text});d.market.news=d.market.news.slice(0,100);}
function ensurePlayerMeta(s,d){
 [...s.teams.flatMap(t=>t.squad),...(s.market||[])].forEach(p=>{
  p.agent=p.agent||{name:`${C.pick(C.firstNames)} ${C.pick(C.lastNames)}`,influence:C.randomInt(35,94),commission:C.randomInt(3,12),relationship:C.randomInt(35,75)};
  p.preferences=p.preferences||{country:C.pick(['Brasil','Portugal','Itália','Espanha','Inglaterra']),ambition:C.randomInt(35,95),loyalty:C.randomInt(30,95),adaptability:C.randomInt(30,95)};
  if(!p.contractDetails)p.contractDetails={installments:1,sellOn:0,appearanceBonus:Math.round(p.wage*.08),goalBonus:Math.round(p.wage*.12),releaseClause:Math.round(p.value*2)};
 });
}
function generateJobs(s,d){
 const occupied=new Set(d.manager.offers.map(o=>o.teamId));
 const candidates=s.teams.filter(t=>t.id!==s.userTeamId&&!occupied.has(t.id));
 if(!candidates.length)return;
 const count=Math.min(3,candidates.length);
 d.manager.offers=candidates.sort(()=>Math.random()-.5).slice(0,count).map(t=>({
  id:C.uid('job'),teamId:t.id,teamName:t.name,reputation:t.reputation,required:Math.max(35,t.reputation-20),salary:Math.round((t.reputation*2600+C.random(20000,90000))/1000)*1000,
  objective:t.reputation>78?'Disputar o título':t.reputation>68?'Classificar para competição continental':'Desenvolver o elenco',expires:s.week+5
 }));
}
function profileCurrent(s,d){
 d.manager.clubProfiles[s.userTeamId]={finance:s.finance,fans:s.fans,stadium:s.stadium,commercial:s.commercial,facilities:s.facilities,board:s.board,departments:s.departments,automation:s.automation};
}
function newProfile(t){
 return {finance:Systems.createFinance(t),fans:Systems.createFanSystem(t),stadium:Systems.createStadium(t),commercial:Systems.createCommercial(t),facilities:Systems.createFacilities(),board:{confidence:70,objectives:Systems.createBoardObjectives(t),messages:[]},departments:Systems.createDepartments(),automation:{mode:'manual',autoHire:true}};
}
function acceptJob(s,d,id){
 const offer=d.manager.offers.find(o=>o.id===id);if(!offer)return;
 if(d.manager.reputation<offer.required)return alert(`Sua reputação precisa chegar a ${offer.required}.`);
 profileCurrent(s,d);const old=user(s);const target=team(s,offer.teamId);const profile=d.manager.clubProfiles[target.id]||newProfile(target);
 Object.assign(s,profile);s.userTeamId=target.id;s.lastPosition=s.teams.length;s.market=s.market||[];
 d.manager.salary=offer.salary;d.manager.reputation=C.clamp(d.manager.reputation+2,1,99);d.manager.jobHistory.push({season:s.season,week:s.week,teamId:target.id,teamName:target.name,from:old.name});
 d.manager.offers=[];write(s);set(KEY,d);location.reload();
}
function startCourse(s,d,id){
 const license=LICENSES.find(l=>l.id===id);if(!license||d.manager.course)return;
 const currentIndex=LICENSES.findIndex(l=>l.id===d.manager.license),target=LICENSES.findIndex(l=>l.id===id);
 if(target!==currentIndex+1)return alert('As licenças precisam ser concluídas em sequência.');
 if(s.finance.balance<license.cost)return alert('Caixa insuficiente para financiar o curso.');
 cash(s,-license.cost,'Formação','Curso do treinador');d.manager.course={...license,weeksLeft:license.weeks};
}
function regionAssignment(s,d,id){
 const r=REGIONS.find(x=>x.id===id),status=d.scouting.regions[id];if(!r||status.assigned)return;
 if(d.scouting.budget<r.cost)return alert('Orçamento de scouting insuficiente.');
 d.scouting.budget-=r.cost;status.assigned=true;status.weeks=0;d.scouting.assignments.push({regionId:id,started:s.week});
}
function createReport(s,d,regionId){
 const r=REGIONS.find(x=>x.id===regionId),knowledge=d.scouting.regions[regionId].knowledge;
 const candidates=[...(s.market||[]),...s.teams.filter(t=>t.id!==s.userTeamId).flatMap(t=>t.squad.map(p=>({...p,clubName:t.name,sourceTeamId:t.id})))].filter(p=>r.countries.includes(p.nationality)||regionId==='br'&&p.nationality==='Brasil');
 const player=C.pick(candidates.length?candidates:[...(s.market||[])]);
 if(!player)return;
 const precision=Math.max(1,Math.round((100-knowledge)/18));
 d.scouting.reports.unshift({id:C.uid('report'),playerId:player.id,name:player.name,position:player.position,age:player.age,clubName:player.clubName||'Livre',sourceTeamId:player.sourceTeamId||null,
 overall:player.overall,potential:player.potential,value:player.askingPrice||player.value,knowledge,range:[Math.max(1,player.overall-precision),Math.min(99,player.overall+precision)],traits:knowledge>=70?traits(player):[],regionId});
 d.scouting.reports=d.scouting.reports.slice(0,80);
}
function transferAI(s,d){
 const clubs=s.teams.filter(t=>t.id!==s.userTeamId&&t.squad.length>20);if(clubs.length<2)return;
 const seller=C.pick(clubs),buyers=clubs.filter(t=>t.id!==seller.id),buyer=C.pick(buyers);
 const pool=seller.squad.filter(p=>!p.starter&&p.age<33);const player=C.pick(pool.length?pool:seller.squad);
 if(!player)return;
 const fee=Math.round(player.value*C.random(.82,1.28)/10000)*10000;
 if((buyer.finances?.balance||buyer.budget||0)<fee)return;
 seller.squad=seller.squad.filter(p=>p.id!==player.id);buyer.squad.push(player);player.clubName=buyer.name;
 seller.finances=seller.finances||{balance:0};buyer.finances=buyer.finances||{balance:0};seller.finances.balance+=fee;buyer.finances.balance-=fee;
 d.market.transactions.unshift({season:s.season,week:s.week,player:player.name,from:seller.name,to:buyer.name,fee,type:'Transferência'});
 addNews(d,s,`${buyer.name} contratou ${player.name} do ${seller.name} por ${C.money(fee)}.`);
}
function generateOfferForUser(s,d){
 const listed=user(s).squad.filter(p=>p.transferListed);if(!listed.length)return;
 const p=C.pick(listed);if(d.market.pendingOffers.some(o=>o.playerId===p.id))return;
 const buyer=C.pick(s.teams.filter(t=>t.id!==s.userTeamId));const fee=Math.round(p.value*C.random(.75,1.3)/10000)*10000;
 d.market.pendingOffers.push({id:C.uid('offer'),playerId:p.id,playerName:p.name,buyerId:buyer.id,buyerName:buyer.name,fee,installments:C.pick([1,2,3,4]),sellOn:C.pick([0,5,10,15]),expires:s.week+2});
}
function acceptPlayerOffer(s,d,id){
 const offer=d.market.pendingOffers.find(o=>o.id===id),p=user(s).squad.find(x=>x.id===offer?.playerId);if(!offer||!p)return;
 const fromName=user(s).name;user(s).squad=user(s).squad.filter(x=>x.id!==p.id);team(s,offer.buyerId).squad.push(p);p.clubName=offer.buyerName;p.transferListed=false;
 cash(s,offer.fee,'Transferência',`Venda de ${p.name} ao ${offer.buyerName}`);s.finance.transferBudget+=Math.round(offer.fee*.75);
 d.market.transactions.unshift({season:s.season,week:s.week,player:p.name,from:fromName,to:offer.buyerName,fee:offer.fee,type:'Venda'});d.market.pendingOffers=d.market.pendingOffers.filter(o=>o.id!==id);
}
function rejectPlayerOffer(d,id){d.market.pendingOffers=d.market.pendingOffers.filter(o=>o.id!==id);}
function negotiateMarket(s,d,playerId,type){
 const p=(s.market||[]).find(x=>String(x.id)===String(playerId));if(!p)return;
 if(type==='loan'){
  const fee=Math.round((p.askingPrice||p.value)*.08);if(s.finance.balance<fee)return alert('Caixa insuficiente.');
  const origin=p.clubName||'Clube vendedor';cash(s,-fee,'Empréstimo',`Taxa de empréstimo por ${p.name}`);p.loan={from:origin,untilSeason:s.season+1,wageShare:70};p.contractYears=Math.max(1,p.contractYears);user(s).squad.push(p);s.market=s.market.filter(x=>x.id!==p.id);
  d.market.transactions.unshift({season:s.season,week:s.week,player:p.name,from:origin,to:user(s).name,fee,type:'Empréstimo'});
 }else if(type==='pre'){
  if(p.contractYears>1)return alert('Pré-contrato só é permitido no último ano.');
  const signing=p.wage*12;if(s.finance.balance<signing)return alert('Caixa insuficiente para as luvas.');
  cash(s,-signing,'Pré-contrato',`Luvas de ${p.name}`);d.market.preContracts.push({player:p,arrivalSeason:s.season+1});s.market=s.market.filter(x=>x.id!==p.id);
 }else{
  const base=p.askingPrice||p.value,agent=p.agent||{commission:8};const total=Math.round(base*(1+agent.commission/100));
  if(s.finance.balance<total||s.finance.transferBudget<base)return alert('Orçamento insuficiente.');
  cash(s,-total,'Transferência',`Compra de ${p.name}`);s.finance.transferBudget-=base;p.contractYears=4;p.happiness=82;user(s).squad.push(p);s.market=s.market.filter(x=>x.id!==p.id);
  d.market.transactions.unshift({season:s.season,week:s.week,player:p.name,from:p.clubName||'Mercado',to:user(s).name,fee:base,type:'Compra'});
 }
}
function processWeek(s,d){
 ensurePlayerMeta(s,d);
 d.manager.reputation=C.clamp(d.manager.reputation+(s.board?.confidence>78?.15:s.board?.confidence<35?-.2:0),1,99);
 if(d.manager.course){d.manager.course.weeksLeft--;if(d.manager.course.weeksLeft<=0){d.manager.license=d.manager.course.id;d.manager.reputation=C.clamp(d.manager.reputation+d.manager.course.rep,1,99);addNews(d,s,`O treinador concluiu ${d.manager.course.name}.`);d.manager.course=null;}}
 Object.entries(d.scouting.regions).forEach(([id,r])=>{if(!r.assigned)return;r.weeks++;const skill=s.departments?.scouting?.staff?.skill||45;r.knowledge=C.clamp(r.knowledge+1+skill/70,0,100);if(r.weeks%2===0)createReport(s,d,id);});
 if(d.settings.autoScouting&&s.automation?.mode==='full'&&!d.scouting.assignments.length){const target=REGIONS.find(r=>!d.scouting.regions[r.id].assigned&&d.scouting.budget>=r.cost);if(target)regionAssignment(s,d,target.id);}
 if(C.chance(.42))transferAI(s,d);if(C.chance(.28))generateOfferForUser(s,d);
 d.market.pendingOffers=d.market.pendingOffers.filter(o=>o.expires>=s.week);
 if(s.week%5===0)generateJobs(s,d);
 const due=d.market.preContracts.filter(x=>x.arrivalSeason<=s.season);due.forEach(x=>user(s).squad.push(x.player));d.market.preContracts=d.market.preContracts.filter(x=>x.arrivalSeason>s.season);
 d.manager.offers=d.manager.offers.filter(o=>o.expires>=s.week);
}
function catchUp(){const s=main();if(!s)return;const d=data(s);if(d.lastSeason!==s.season){d.market.inflation*=1.035;d.lastSeason=s.season;}const steps=Math.min(20,Math.max(0,s.week-d.lastWeek));for(let i=0;i<steps;i++)processWeek(s,d);d.lastWeek=s.week;write(s);set(KEY,d);}
function stat(l,v,x){return `<div class="card stat-card"><span>${l}</span><strong>${v}</strong><small>${x}</small></div>`;}
function addNav(){const nav=document.querySelector('.nav-list');if(!nav||nav.querySelector('[data-v07-view]'))return;const before=nav.querySelector('[data-view="history"]');Object.entries(VIEWS).forEach(([id,label])=>{const b=document.createElement('button');b.className='nav-item';b.dataset.v07View=id;b.textContent=label;nav.insertBefore(b,before||null);b.onclick=e=>{e.preventDefault();document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');active=id;render(id);};});}
function render(view){
 const s=main(),root=document.querySelector('#app-view');if(!s||!root)return;catchUp();const fresh=main(),d=data(fresh);document.querySelector('#page-title').textContent=VIEWS[view];
 if(view==='marketlive'){
  const reports=new Map(d.scouting.reports.map(r=>[String(r.playerId),r]));
  root.innerHTML=`<div class="grid grid-4">${stat('Transações',d.market.transactions.length,'Mercado mundial')}${stat('Ofertas recebidas',d.market.pendingOffers.length,'Atletas listados')}${stat('Pré-contratos',d.market.preContracts.length,'Chegam na próxima temporada')}${stat('Inflação',`${C.round((d.market.inflation-1)*100,1)}%`,'Evolução dos valores')}</div>
  <div class="card section-gap"><h2>Propostas pelo seu elenco</h2>${d.market.pendingOffers.map(o=>`<div class="list-item"><div><b>${o.buyerName}: ${C.money(o.fee)} por ${o.playerName}</b><small>${o.installments} parcela(s) · ${o.sellOn}% de venda futura</small></div><div class="button-row"><button class="primary-button" data-v07-action="accept-offer" data-id="${o.id}">Aceitar</button><button class="danger-button" data-v07-action="reject-offer" data-id="${o.id}">Recusar</button></div></div>`).join('')||'<p class="muted">Nenhuma proposta.</p>'}</div>
  <div class="card section-gap"><h2>Alvos disponíveis</h2><div class="table-wrap"><table><thead><tr><th>Jogador</th><th>Clube</th><th>OVR/POT</th><th>Agente</th><th>Valor</th><th>Ações</th></tr></thead><tbody>${(fresh.market||[]).slice().sort((a,b)=>b.overall-a.overall).map(p=>{const r=reports.get(String(p.id)),known=r?.knowledge||p.scoutKnowledge||25;return `<tr><td><b>${p.name}</b><small>${p.position} · ${p.age} anos ${known>=70?`· ${traits(p).join(', ')}`:''}</small></td><td>${p.clubName||'Livre'}</td><td>${known>=60?`${p.overall}/${p.potential}`:`${p.overall-3}–${p.overall+3}/?`}</td><td>${p.agent?.name||'Não identificado'} · ${p.agent?.commission||'?'}%</td><td>${C.money(p.askingPrice||p.value)}</td><td><div class="inline-actions"><button class="tiny-button" data-v07-action="negotiate" data-type="buy" data-id="${p.id}">Comprar</button><button class="tiny-button" data-v07-action="negotiate" data-type="loan" data-id="${p.id}">Empréstimo</button><button class="tiny-button" data-v07-action="negotiate" data-type="pre" data-id="${p.id}">Pré-contrato</button></div></td></tr>`}).join('')}</tbody></table></div></div>
  <div class="card section-gap"><h2>Notícias e negócios da IA</h2>${d.market.news.slice(0,20).map(n=>`<div class="list-item"><span>${n.season}/S${n.week}</span><b>${n.text}</b></div>`).join('')||'<p class="muted">O mercado ainda está silencioso.</p>'}</div>`;
 }
 if(view==='scoutingplus'){
  root.innerHTML=`<div class="grid grid-4">${stat('Orçamento',C.money(d.scouting.budget),'Missões internacionais')}${stat('Regiões ativas',Object.values(d.scouting.regions).filter(r=>r.assigned).length,'Conhecimento cresce semanalmente')}${stat('Relatórios',d.scouting.reports.length,'Precisão variável')}${stat('Lista curta',d.scouting.shortlist.length,'Alvos acompanhados')}</div>
  <div class="grid grid-3 section-gap">${REGIONS.map(r=>{const x=d.scouting.regions[r.id];return `<div class="card"><div class="card-header"><h2>${r.name}</h2><span>${C.round(x.knowledge,0)}%</span></div><div class="progress"><span style="width:${x.knowledge}%"></span></div><p>${x.assigned?`Missão ativa há ${x.weeks} semana(s)`:`Custo ${C.money(r.cost)}`}</p><button class="primary-button" data-v07-action="assign-region" data-id="${r.id}" ${x.assigned?'disabled':''}>${x.assigned?'Em observação':'Enviar olheiro'}</button></div>`}).join('')}</div>
  <div class="card section-gap"><h2>Relatórios recentes</h2>${d.scouting.reports.slice(0,30).map(r=>`<div class="report-card"><div><b>${r.name}</b><small>${r.position} · ${r.age} anos · ${r.clubName}</small></div><div><b>OVR ${r.knowledge>=75?r.overall:`${r.range[0]}–${r.range[1]}`}</b><small>POT ${r.knowledge>=85?r.potential:'?'} · conhecimento ${C.round(r.knowledge,0)}%</small>${r.traits.length?`<small>${r.traits.join(' · ')}</small>`:''}</div></div>`).join('')||'<p class="muted">Envie olheiros para produzir relatórios.</p>'}</div>`;
 }
 if(view==='managercareer'){
  const current=user(fresh),license=LICENSES.find(l=>l.id===d.manager.license)?.name||'Sem licença';
  root.innerHTML=`<div class="grid grid-4">${stat('Clube atual',current.name,`Desde ${d.manager.jobHistory.at(-1)?.season}`)}${stat('Reputação',C.round(d.manager.reputation,1),'Define vagas acessíveis')}${stat('Licença',license,d.manager.course?`${d.manager.course.weeksLeft} semanas restantes`:'Sem curso ativo')}${stat('Salário',C.money(d.manager.salary)+'/semana',`Estilo ${d.manager.style}`)}</div>
  <div class="grid grid-2 section-gap"><div class="card"><h2>Vagas e propostas</h2>${d.manager.offers.map(o=>`<div class="list-item"><div><b>${o.teamName}</b><small>Reputação ${o.reputation} · exige ${o.required} · ${o.objective}</small></div><div><b>${C.money(o.salary)}/sem.</b><button class="primary-button" data-v07-action="accept-job" data-id="${o.id}">Aceitar</button></div></div>`).join('')||'<p class="muted">Novas vagas aparecem a cada cinco semanas.</p>'}</div>
  <div class="card"><h2>Formação profissional</h2>${LICENSES.map(l=>`<div class="list-item"><div><b>${l.name}</b><small>${l.weeks} semanas · +${l.rep} reputação</small></div><button class="secondary-button" data-v07-action="course" data-id="${l.id}" ${d.manager.course||d.manager.license===l.id?'disabled':''}>${d.manager.license===l.id?'Concluída':C.money(l.cost)}</button></div>`).join('')}<label>Estilo do treinador<select data-v07-setting="style">${['Equilibrado','Ofensivo','Defensivo','Formador','Gestor de estrelas'].map(x=>`<option ${d.manager.style===x?'selected':''}>${x}</option>`).join('')}</select></label></div></div>
  <div class="card section-gap"><h2>Histórico profissional</h2>${d.manager.jobHistory.slice().reverse().map(j=>`<div class="list-item"><span>${j.season}${j.week?`/S${j.week}`:''}</span><b>${j.teamName}</b></div>`).join('')}</div>`;
 }
}
function bind(){
 document.addEventListener('click',e=>{const b=e.target.closest('[data-v07-action]');if(!b)return;e.preventDefault();const s=main();if(!s)return;const d=data(s),a=b.dataset.v07Action;
  if(a==='assign-region')regionAssignment(s,d,b.dataset.id);if(a==='accept-offer')acceptPlayerOffer(s,d,b.dataset.id);if(a==='reject-offer')rejectPlayerOffer(d,b.dataset.id);
  if(a==='negotiate')negotiateMarket(s,d,b.dataset.id,b.dataset.type);if(a==='accept-job')return acceptJob(s,d,b.dataset.id);if(a==='course')startCourse(s,d,b.dataset.id);
  write(s);set(KEY,d);if(active)render(active);
 });
 document.addEventListener('change',e=>{const setting=e.target.dataset.v07Setting;if(!setting)return;const s=main(),d=data(s);if(setting==='style')d.manager.style=e.target.value;set(KEY,d);});
 document.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(['simulate-week','simulate-month','next-season'].includes(a))setTimeout(()=>{catchUp();if(active)render(active);},130);},true);
 document.querySelector('#new-game-form')?.addEventListener('submit',()=>setTimeout(()=>{const s=main();if(s)set(KEY,createData(s));},200));
}
function init(){addNav();catchUp();bind();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
