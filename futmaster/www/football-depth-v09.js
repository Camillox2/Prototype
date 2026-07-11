(function(global){
'use strict';
const C=global.FMCore, Match=global.FMMatch;
const MAIN='futmaster-save-v4', KEY='futmaster-depth-v09';
const VIEWS={tacticlab:'Laboratório tático',traininglab:'Treino semanal',medicalplus:'Medicina avançada',developmentplus:'Desenvolvimento'};
const SESSIONS={
 'Recuperação':{load:8,fitness:7,morale:1,risk:0,attrs:[]},
 'Físico':{load:18,fitness:-2,morale:-1,risk:.012,attrs:['resistencia','forca','velocidade']},
 'Finalização':{load:13,fitness:-1,morale:0,risk:.005,attrs:['finalizacao','frieza','dominio']},
 'Defesa':{load:14,fitness:-1,morale:0,risk:.006,attrs:['marcacao','desarme','posicionamento']},
 'Posse':{load:12,fitness:0,morale:1,risk:.004,attrs:['passe','visao','decisao']},
 'Transições':{load:15,fitness:-2,morale:0,risk:.007,attrs:['aceleracao','antecipacao','trabalhoEquipe']},
 'Bola parada':{load:10,fitness:0,morale:1,risk:.002,attrs:['bolaParada','cabecalho','impulsao']},
 'Entrosamento':{load:9,fitness:1,morale:2,risk:.001,attrs:['trabalhoEquipe','concentracao']},
 'Descanso':{load:0,fitness:10,morale:2,risk:0,attrs:[]}
};
const ROLES={
 GOL:['Goleiro tradicional','Goleiro líbero'],LD:['Lateral defensivo','Lateral apoiador','Ala'],LE:['Lateral defensivo','Lateral apoiador','Ala'],
 ZAG:['Zagueiro marcador','Zagueiro construtor','Líbero'],VOL:['Volante fixo','Meio-campista recuperador','Regista'],
 MC:['Organizador','Mezzala','Área a área'],MEI:['Armador','Infiltrador','Camisa 10'],
 PD:['Ponta aberto','Ponta invertido','Atacante interior'],PE:['Ponta aberto','Ponta invertido','Atacante interior'],
 ATA:['Finalizador','Pivô','Atacante móvel','Falso 9']
};
const INJURIES=[
 {name:'Contusão muscular',min:1,max:2,relapse:.08,surgery:false},
 {name:'Distensão na coxa',min:2,max:5,relapse:.16,surgery:false},
 {name:'Entorse no tornozelo',min:2,max:6,relapse:.14,surgery:false},
 {name:'Lesão ligamentar',min:7,max:18,relapse:.24,surgery:true},
 {name:'Fratura',min:8,max:20,relapse:.10,surgery:true},
 {name:'Inflamação no joelho',min:3,max:8,relapse:.20,surgery:false}
];
let active=null;
function get(k,f=null){try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch{return f;}}
function set(k,v){localStorage.setItem(k,JSON.stringify(v));}
function main(){return get(MAIN);}
function write(s){localStorage.setItem(MAIN,JSON.stringify(s));}
function user(s){return s.teams.find(t=>t.id===s.userTeamId);}
function sig(s){return `${s.managerName}|${s.teams?.[0]?.squad?.[0]?.id||'new'}`;}
function defaultPlan(name){
 const map={A:{formation:'4-2-3-1',mentality:'Equilibrada',pressing:56,tempo:55,width:55,defensiveLine:52,buildUp:'Mista',transition:'Equilibrada'},
 B:{formation:'4-3-3',mentality:'Ofensiva',pressing:70,tempo:67,width:64,defensiveLine:62,buildUp:'Curta',transition:'Contra-pressão'},
 C:{formation:'5-4-1',mentality:'Defensiva',pressing:38,tempo:42,width:48,defensiveLine:36,buildUp:'Direta',transition:'Contra-ataque'}};
 return {name,...map[name],familiarity:name==='A'?72:45};
}
function createData(s){
 return {version:9,signature:sig(s),lastSeason:s.season,lastWeek:s.week,activePlan:'A',plans:{A:defaultPlan('A'),B:defaultPlan('B'),C:defaultPlan('C')},
  setPieces:{penalty:null,freeKick:null,corners:null,cornerStyle:'Mista',defending:'Zona'},
  training:{automatic:true,schedule:['Recuperação','Posse','Defesa','Finalização','Bola parada','Entrosamento','Descanso'],history:[],load:0},
  medicine:{records:[],policy:'Conservadora',secondOpinions:0},
  development:{records:{},graduates:0,breakthroughs:0},
  settings:{autoRoles:true,allowPain:false}};
}
function data(s){let d=get(KEY);if(!d||d.version!==9||d.signature!==sig(s)){d=createData(s);set(KEY,d);}return d;}
function hash(id){let h=0;for(const c of String(id))h=(h*33+c.charCodeAt(0))>>>0;return h;}
function ensurePlayers(s,d){
 user(s).squad.forEach(p=>{
  p.tacticalRole=p.tacticalRole||ROLES[p.position]?.[0]||'Equilibrado';
  p.individualInstructions=p.individualInstructions||{freedom:50,pressing:50,risk:50,shooting:'Normal'};
  p.hidden=p.hidden||{professionalism:35+hash(p.id)%61,ambition:30+(hash(p.id)>>4)%66,bigMatches:30+(hash(p.id)>>8)%66,adaptability:30+(hash(p.id)>>12)%66};
  if(!d.development.records[p.id])d.development.records[p.id]={name:p.name,startOverall:p.overall,lastOverall:p.overall,changes:[],peak:p.overall};
 });
 if(!d.setPieces.penalty){const sorted=[...user(s).squad].sort((a,b)=>(b.attributes.bolaParada+b.attributes.frieza)-(a.attributes.bolaParada+a.attributes.frieza));d.setPieces.penalty=sorted[0]?.id;d.setPieces.freeKick=sorted[1]?.id||sorted[0]?.id;d.setPieces.corners=sorted[2]?.id||sorted[0]?.id;}
}
function createMedicalRecord(s,d,p){
 if(d.medicine.records.some(r=>r.playerId===p.id&&!r.cleared))return;
 const template=C.pick(INJURIES),weeks=Math.max(p.injuredWeeks,C.randomInt(template.min,template.max));
 p.injuredWeeks=weeks;
 d.medicine.records.unshift({id:C.uid('inj'),playerId:p.id,name:p.name,diagnosis:template.name,weeksInitial:weeks,weeksLeft:weeks,relapse:template.relapse,surgeryRecommended:template.surgery,treatment:'Conservador',cleared:false,playingHurt:false,history:[]});
}
function trainingEffect(s,d){
 const t=user(s),staff=s.departments?.football?.staff?.skill||50,facility=s.facilities?.training?.level||1;
 if(d.training.automatic&&(s.automation?.mode==='full'||s.departments?.football?.delegated)){
  const injured=t.squad.filter(p=>p.injuredWeeks>0).length,avgFit=t.squad.reduce((n,p)=>n+p.fitness,0)/t.squad.length;
  d.training.schedule=injured>4||avgFit<72?['Recuperação','Recuperação','Posse','Defesa','Bola parada','Entrosamento','Descanso']:['Recuperação','Físico','Posse','Defesa','Finalização','Transições','Descanso'];
 }
 let totalLoad=0;
 d.training.schedule.forEach(sessionName=>{
  const session=SESSIONS[sessionName]||SESSIONS.Descanso;totalLoad+=session.load;
  t.squad.forEach(p=>{
   if(p.injuredWeeks>0)return;
   p.fitness=C.clamp(p.fitness+session.fitness,20,100);p.morale=C.clamp(p.morale+session.morale,10,100);
   const growth=(staff/100)*(facility/10)*(p.hidden.professionalism/100)*(p.age<=23?1.6:p.age<=28?.75:.25);
   session.attrs.forEach(attr=>{if(p.attributes[attr]<96&&p.overall<p.potential&&C.chance(.012+growth*.045))p.attributes[attr]++;});
   if(session.risk&&C.chance(session.risk*(1+p.injuryRisk/30)*(1+Math.max(0,totalLoad-70)/100))){p.injuredWeeks=Math.max(p.injuredWeeks,1);createMedicalRecord(s,d,p);}
  });
 });
 d.training.load=totalLoad;d.training.history.unshift({season:s.season,week:s.week,load:totalLoad,schedule:[...d.training.schedule]});d.training.history=d.training.history.slice(0,30);
 t.chemistry=C.clamp(t.chemistry+(d.training.schedule.includes('Entrosamento')?2:0),20,100);
}
function development(s,d){
 const level=s.facilities?.training?.level||1,academy=s.facilities?.academy?.level||1;
 [...user(s).squad,...Object.values(user(s).academy||{}).flat()].forEach(p=>{
  const record=d.development.records[p.id]||(d.development.records[p.id]={name:p.name,startOverall:p.overall,lastOverall:p.overall,changes:[],peak:p.overall});
  const minutesFactor=Math.min(1,(p.minutes||0)/900),personality=p.hidden?.professionalism||60;
  if(p.age<=24&&p.overall<p.potential){
   const chance=(.01+level*.003+academy*.002+minutesFactor*.025)*(personality/70);
   if(C.chance(chance)){const attrs=Object.keys(p.attributes).filter(a=>p.attributes[a]<96);const attr=C.pick(attrs);p.attributes[attr]++;p.overall=C.calculateOverall(p);if(p.overall>record.lastOverall){record.changes.unshift({season:s.season,week:s.week,from:record.lastOverall,to:p.overall,reason:minutesFactor>.5?'Minutos e treino':'Treinamento'});record.lastOverall=p.overall;record.peak=Math.max(record.peak,p.overall);}}
  }else if(p.age>=31&&C.chance((p.age-29)*.008)){const attr=C.pick(['velocidade','aceleracao','resistencia','agilidade']);p.attributes[attr]=Math.max(20,p.attributes[attr]-1);p.overall=C.calculateOverall(p);record.changes.unshift({season:s.season,week:s.week,from:record.lastOverall,to:p.overall,reason:'Regressão física'});record.lastOverall=p.overall;}
 });
}
function medicineWeek(s,d){
 user(s).squad.filter(p=>p.injuredWeeks>0).forEach(p=>createMedicalRecord(s,d,p));
 d.medicine.records.filter(r=>!r.cleared).forEach(r=>{
  const p=user(s).squad.find(x=>x.id===r.playerId);if(!p){r.cleared=true;return;}
  r.weeksLeft=p.injuredWeeks;
  if(r.treatment==='Intensivo'&&C.chance(.45))p.injuredWeeks=Math.max(0,p.injuredWeeks-1);
  if(r.treatment==='Cirurgia'&&C.chance(.7))p.injuredWeeks=Math.max(0,p.injuredWeeks-2);
  if(r.playingHurt&&C.chance(r.relapse+.15)){p.injuredWeeks+=C.randomInt(2,5);r.history.unshift('Recaída após atuar no sacrifício.');r.playingHurt=false;}
  if(p.injuredWeeks<=0){r.cleared=true;r.weeksLeft=0;p.playThroughPain=false;}
 });
 if(s.automation?.mode==='full'||s.departments?.medical?.delegated)d.medicine.records.filter(r=>!r.cleared).forEach(r=>{r.treatment=r.weeksLeft>=7&&r.surgeryRecommended?'Cirurgia':r.weeksLeft>=3?'Intensivo':'Conservador';});
}
function planToTeam(s,d){
 const p=d.plans[d.activePlan],t=user(s);Object.assign(t.tactics,{formation:p.formation,mentality:p.mentality,pressing:p.pressing,tempo:p.tempo,width:p.width,defensiveLine:p.defensiveLine,buildUp:p.buildUp,counterAttack:p.transition==='Contra-ataque'});p.familiarity=C.clamp(p.familiarity+.7,0,100);
}
function processWeek(s,d){ensurePlayers(s,d);trainingEffect(s,d);medicineWeek(s,d);development(s,d);planToTeam(s,d);}
function catchUp(){const s=main();if(!s)return;const d=data(s);ensurePlayers(s,d);const steps=Math.min(10,Math.max(0,s.week-d.lastWeek));for(let i=0;i<steps;i++)processWeek(s,d);d.lastWeek=s.week;d.lastSeason=s.season;write(s);set(KEY,d);}
function treatment(s,d,id,type){
 const r=d.medicine.records.find(x=>x.id===id),p=user(s).squad.find(x=>x.id===r?.playerId);if(!r||!p)return;
 const costs={Conservador:25000,Intensivo:110000,Cirurgia:450000,Sacrifício:0},cost=costs[type]||0;if(s.finance.balance<cost)return alert('Caixa insuficiente.');
 s.finance.balance-=cost;r.treatment=type;
 if(type==='Cirurgia'){r.history.unshift('Cirurgia autorizada.');p.morale=C.clamp(p.morale-2,0,100);}
 if(type==='Sacrifício'){r.playingHurt=true;p.playThroughPain=true;r.history.unshift('Liberado para atuar com risco elevado.');}
}
function roleBoost(player){
 const r=player.tacticalRole||'',boosts={};
 if(r.includes('construtor')||r==='Regista'||r==='Organizador'||r==='Armador'){boosts.passe=3;boosts.visao=3;boosts.decisao=2;}
 if(r.includes('marcador')||r.includes('recuperador')||r.includes('defensivo')){boosts.marcacao=3;boosts.desarme=3;boosts.posicionamento=2;}
 if(r.includes('apoiador')||r==='Ala'||r.includes('aberto')){boosts.velocidade=2;boosts.cruzamento=3;boosts.resistencia=2;}
 if(r.includes('invertido')||r.includes('interior')||r==='Infiltrador'){boosts.drible=2;boosts.finalizacao=3;boosts.aceleracao=2;}
 if(['Finalizador','Atacante móvel','Falso 9','Pivô'].includes(r)){boosts.finalizacao=r==='Finalizador'?4:2;boosts.posicionamento=2;boosts.frieza=2;if(r==='Pivô'){boosts.forca=3;boosts.cabecalho=3;}if(r==='Falso 9'){boosts.passe=3;boosts.visao=2;}}
 return boosts;
}
function wrapMatch(){
 if(!Match||Match.__v09Wrapped)return;const original=Match.simulateMatch;
 Match.simulateMatch=function(home,away,context={}){
  const s=main(),d=s?data(s):null,userId=s?.userTeamId,affected=[home,away].find(t=>t.id===userId),snapshots=[];
  if(affected&&d){
   planToTeam(s,d);Object.assign(affected.tactics,user(s).tactics);
   affected.squad.forEach(p=>{
    const attrs=roleBoost(p),old={};Object.entries(attrs).forEach(([a,n])=>{old[a]=p.attributes[a];p.attributes[a]=C.clamp(p.attributes[a]+n,1,99);});
    if(p.playThroughPain&&p.injuredWeeks>0){old.injuredWeeks=p.injuredWeeks;p.injuredWeeks=0;p.fitness=C.clamp(p.fitness-8,20,100);}
    snapshots.push({p,old});
   });
  }
  const result=original(home,away,context);
  if(affected&&d){
   const side=home.id===userId?0:1,plan=d.plans[d.activePlan],setPieceSkill=affected.squad.reduce((n,p)=>n+(p.attributes.bolaParada||0),0)/affected.squad.length;
   if(C.chance(Math.max(0,(setPieceSkill-55)/500)+(d.setPieces.cornerStyle==='Ofensiva'?.025:0))){
    if(side===0)result.homeGoals++;else result.awayGoals++;result.stats.xg[side]=C.round(result.stats.xg[side]+.28,2);result.events.push({minute:C.randomInt(15,88),type:'goal',teamId:affected.id,text:`${affected.name} marcou em uma jogada ensaiada de bola parada.`});
   }
   result.tacticalPlan={name:d.activePlan,formation:plan.formation,mentality:plan.mentality,familiarity:C.round(plan.familiarity,0)};
   snapshots.forEach(({p,old})=>Object.entries(old).forEach(([a,v])=>{if(a==='injuredWeeks')p.injuredWeeks=v;else p.attributes[a]=v;}));
   set(KEY,d);
  }
  return result;
 };Match.__v09Wrapped=true;
}
function stat(l,v,x){return `<div class="card stat-card"><span>${l}</span><strong>${v}</strong><small>${x}</small></div>`;}
function addNav(){const nav=document.querySelector('.nav-list');if(!nav||nav.querySelector('[data-v09-view]'))return;const before=nav.querySelector('[data-view="history"]');Object.entries(VIEWS).forEach(([id,label])=>{const b=document.createElement('button');b.className='nav-item';b.dataset.v09View=id;b.textContent=label;nav.insertBefore(b,before||null);b.onclick=e=>{e.preventDefault();document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');active=id;render(id);};});}
function render(view){
 const s=main(),root=document.querySelector('#app-view');if(!s||!root)return;catchUp();const fresh=main(),d=data(fresh),t=user(fresh);document.querySelector('#page-title').textContent=VIEWS[view];
 if(view==='tacticlab'){
  root.innerHTML=`<div class="grid grid-4">${stat('Plano ativo',d.activePlan,d.plans[d.activePlan].formation)}${stat('Familiaridade',`${C.round(d.plans[d.activePlan].familiarity,0)}%`,'Melhora com uso e treino')}${stat('Batedor de pênalti',t.squad.find(p=>p.id===d.setPieces.penalty)?.name||'—','Bolas paradas')}${stat('Entrosamento',`${t.chemistry}%`,'Impacta execução')}</div>
  <div class="grid grid-3 section-gap">${Object.values(d.plans).map(p=>`<div class="card plan-card ${d.activePlan===p.name?'selected':''}"><div class="card-header"><h2>Plano ${p.name}</h2><button class="primary-button" data-v09-action="activate-plan" data-id="${p.name}">Ativar</button></div><label>Formação<select data-v09-plan="${p.name}" data-field="formation">${['4-2-3-1','4-3-3','4-4-2','3-5-2','5-4-1'].map(x=>`<option ${p.formation===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Mentalidade<select data-v09-plan="${p.name}" data-field="mentality">${['Muito defensiva','Defensiva','Equilibrada','Ofensiva','Muito ofensiva'].map(x=>`<option ${p.mentality===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Transição<select data-v09-plan="${p.name}" data-field="transition">${['Equilibrada','Contra-ataque','Contra-pressão','Recuar'].map(x=>`<option ${p.transition===x?'selected':''}>${x}</option>`).join('')}</select></label><p>Pressão ${p.pressing} · ritmo ${p.tempo} · linha ${p.defensiveLine}</p><div class="progress"><span style="width:${p.familiarity}%"></span></div></div>`).join('')}</div>
  <div class="grid grid-2 section-gap"><div class="card"><h2>Bolas paradas</h2><label>Pênaltis${playerSelect(t,d.setPieces.penalty,'penalty')}</label><label>Faltas${playerSelect(t,d.setPieces.freeKick,'freeKick')}</label><label>Escanteios${playerSelect(t,d.setPieces.corners,'corners')}</label><label>Estratégia ofensiva<select data-v09-setting="cornerStyle">${['Defensiva','Mista','Ofensiva'].map(x=>`<option ${d.setPieces.cornerStyle===x?'selected':''}>${x}</option>`).join('')}</select></label><label>Marcação<select data-v09-setting="setDefending">${['Zona','Individual','Mista'].map(x=>`<option ${d.setPieces.defending===x?'selected':''}>${x}</option>`).join('')}</select></label></div>
  <div class="card"><h2>Funções individuais</h2>${t.squad.filter(p=>p.starter).map(p=>`<div class="role-row"><span><b>${p.name}</b><small>${p.position}</small></span><select data-v09-role="${p.id}">${(ROLES[p.position]||['Equilibrado']).map(r=>`<option ${p.tacticalRole===r?'selected':''}>${r}</option>`).join('')}</select></div>`).join('')}</div></div>`;
 }
 if(view==='traininglab'){
  root.innerHTML=`<div class="grid grid-4">${stat('Carga semanal',d.training.load,d.training.load>85?'Alta':d.training.load>55?'Moderada':'Leve')}${stat('CT',`Nível ${fresh.facilities.training.level}`,'Qualidade do desenvolvimento')}${stat('Automação',d.training.automatic?'Ativa':'Manual','Diretor ajusta por desgaste')}${stat('Média física',`${C.round(t.squad.reduce((n,p)=>n+p.fitness,0)/t.squad.length,1)}%`,'Elenco profissional')}</div>
  <div class="card section-gap"><div class="card-header"><h2>Microciclo de sete dias</h2><label class="checkbox"><input type="checkbox" data-v09-setting="trainingAuto" ${d.training.automatic?'checked':''}> Automático</label></div><div class="training-week">${d.training.schedule.map((session,i)=>`<label><span>Dia ${i+1}</span><select data-v09-session="${i}">${Object.keys(SESSIONS).map(x=>`<option ${session===x?'selected':''}>${x}</option>`).join('')}</select><small>Carga ${SESSIONS[session].load}</small></label>`).join('')}</div></div>
  <div class="card section-gap"><h2>Histórico de carga</h2>${d.training.history.slice(0,12).map(h=>`<div class="list-item"><span>${h.season}/S${h.week}</span><b>${h.load} · ${h.schedule.join(' / ')}</b></div>`).join('')||'<p class="muted">A primeira semana ainda não foi processada.</p>'}</div>`;
 }
 if(view==='medicalplus'){
  const activeRecords=d.medicine.records.filter(r=>!r.cleared);
  root.innerHTML=`<div class="grid grid-4">${stat('No departamento',activeRecords.length,'Diagnósticos ativos')}${stat('Política',d.medicine.policy,'Conduta do clube')}${stat('Centro médico',`Nível ${fresh.facilities.medical.level}`,'Recuperação')}${stat('Segundas opiniões',d.medicine.secondOpinions,'Consultas externas')}</div>
  <div class="card section-gap"><h2>Pacientes</h2>${activeRecords.map(r=>`<div class="medical-record"><div><b>${r.name}</b><small>${r.diagnosis} · ${r.weeksLeft} semana(s) · recaída ${Math.round(r.relapse*100)}%</small><small>Tratamento: ${r.treatment}${r.playingHurt?' · liberado no sacrifício':''}</small></div><div class="button-row"><button class="tiny-button" data-v09-action="treatment" data-type="Conservador" data-id="${r.id}">Conservador</button><button class="tiny-button" data-v09-action="treatment" data-type="Intensivo" data-id="${r.id}">Intensivo</button>${r.surgeryRecommended?`<button class="tiny-button" data-v09-action="treatment" data-type="Cirurgia" data-id="${r.id}">Cirurgia</button>`:''}<button class="danger-button" data-v09-action="treatment" data-type="Sacrifício" data-id="${r.id}">Usar no sacrifício</button></div></div>`).join('')||'<p>Nenhum jogador em tratamento.</p>'}</div>
  <div class="card section-gap"><label>Política médica<select data-v09-setting="medicalPolicy">${['Conservadora','Equilibrada','Agressiva'].map(x=>`<option ${d.medicine.policy===x?'selected':''}>${x}</option>`).join('')}</select></label></div>`;
 }
 if(view==='developmentplus'){
  const rows=t.squad.map(p=>({p,r:d.development.records[p.id]})).sort((a,b)=>(b.r?.lastOverall-b.r?.startOverall)-(a.r?.lastOverall-a.r?.startOverall));
  root.innerHTML=`<div class="grid grid-4">${stat('Revelações',d.development.breakthroughs,'Evoluções aceleradas')}${stat('Formados',d.development.graduates,'Promoções consolidadas')}${stat('Base',`Nível ${fresh.facilities.academy.level}`,'Captação e potencial')}${stat('Treino',`Nível ${fresh.facilities.training.level}`,'Conversão de potencial')}</div>
  <div class="card section-gap"><h2>Evolução do elenco</h2><div class="table-wrap"><table><thead><tr><th>Jogador</th><th>Idade</th><th>OVR/POT</th><th>Início</th><th>Pico</th><th>Profissionalismo</th><th>Última mudança</th></tr></thead><tbody>${rows.map(({p,r})=>`<tr><td><b>${p.name}</b><small>${p.position} · ${p.tacticalRole}</small></td><td>${p.age}</td><td>${p.overall}/${p.potential}</td><td>${r?.startOverall||p.overall}</td><td>${r?.peak||p.overall}</td><td>${p.hidden?.professionalism||'?'}</td><td>${r?.changes?.[0]?`${r.changes[0].from}→${r.changes[0].to} · ${r.changes[0].reason}`:'—'}</td></tr>`).join('')}</tbody></table></div></div>`;
 }
}
function playerSelect(t,value,field){return `<select data-v09-setting="${field}">${[...t.squad].sort((a,b)=>(b.attributes.bolaParada||0)-(a.attributes.bolaParada||0)).map(p=>`<option value="${p.id}" ${p.id===value?'selected':''}>${p.name}</option>`).join('')}</select>`;}
function bind(){
 document.addEventListener('click',e=>{const b=e.target.closest('[data-v09-action]');if(!b)return;e.preventDefault();const s=main(),d=data(s);if(b.dataset.v09Action==='activate-plan'){d.activePlan=b.dataset.id;planToTeam(s,d);}if(b.dataset.v09Action==='treatment')treatment(s,d,b.dataset.id,b.dataset.type);write(s);set(KEY,d);if(active)render(active);});
 document.addEventListener('change',e=>{const s=main();if(!s)return;const d=data(s);
  if(e.target.dataset.v09Plan){d.plans[e.target.dataset.v09Plan][e.target.dataset.field]=e.target.value;}
  if(e.target.dataset.v09Role){const p=user(s).squad.find(x=>String(x.id)===e.target.dataset.v09Role);if(p)p.tacticalRole=e.target.value;}
  if(e.target.dataset.v09Session!==undefined)d.training.schedule[Number(e.target.dataset.v09Session)]=e.target.value;
  const setting=e.target.dataset.v09Setting;if(setting==='trainingAuto')d.training.automatic=e.target.checked;if(setting==='cornerStyle')d.setPieces.cornerStyle=e.target.value;if(setting==='setDefending')d.setPieces.defending=e.target.value;if(setting==='penalty')d.setPieces.penalty=e.target.value;if(setting==='freeKick')d.setPieces.freeKick=e.target.value;if(setting==='corners')d.setPieces.corners=e.target.value;if(setting==='medicalPolicy')d.medicine.policy=e.target.value;
  write(s);set(KEY,d);
 });
 document.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(['simulate-week','simulate-month','next-season'].includes(a))setTimeout(()=>{catchUp();if(active)render(active);},180);},true);
 document.querySelector('#new-game-form')?.addEventListener('submit',()=>setTimeout(()=>{const s=main();if(s)set(KEY,createData(s));},240));
}
function init(){addNav();wrapMatch();catchUp();bind();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
