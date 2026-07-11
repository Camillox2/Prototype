(function(global){
'use strict';
const C=global.FMCore, Systems=global.FMSystems;
const MAIN='futmaster-save-v4', KEY='futmaster-world-v08';
const VIEWS={pyramid:'Pirâmide mundial',yearcalendar:'Calendário anual',regulationsplus:'Regulamentos'};
const COUNTRY_DEFS=[
 {id:'br',name:'Brasil',season:'Jul–Mai',tiers:4,foreign:7,squad:30,relegation:2,winter:false,coefficient:82,cities:['Curitiba','São Paulo','Rio de Janeiro','Recife','Salvador','Belo Horizonte','Porto Alegre','Brasília','Campinas','Fortaleza']},
 {id:'pt',name:'Portugal',season:'Ago–Mai',tiers:3,foreign:12,squad:28,relegation:2,winter:true,coefficient:71,cities:['Lisboa','Porto','Coimbra','Braga','Aveiro','Faro','Guimarães','Setúbal','Leiria','Viseu']},
 {id:'it',name:'Itália',season:'Ago–Mai',tiers:3,foreign:14,squad:25,relegation:3,winter:true,coefficient:86,cities:['Roma','Milão','Turim','Nápoles','Florença','Bolonha','Gênova','Bérgamo','Verona','Palermo']},
 {id:'es',name:'Espanha',season:'Ago–Mai',tiers:3,foreign:14,squad:25,relegation:3,winter:true,coefficient:88,cities:['Madri','Barcelona','Sevilha','Valência','Bilbao','Vigo','Málaga','Alicante','Granada','Zaragoza']},
 {id:'en',name:'Inglaterra',season:'Ago–Mai',tiers:4,foreign:17,squad:25,relegation:3,winter:false,coefficient:92,cities:['Londres','Manchester','Liverpool','Birmingham','Leeds','Bristol','Newcastle','Sheffield','Nottingham','Leicester']},
 {id:'de',name:'Alemanha',season:'Ago–Mai',tiers:3,foreign:14,squad:27,relegation:2,winter:true,coefficient:85,cities:['Berlim','Munique','Hamburgo','Colônia','Frankfurt','Dortmund','Leipzig','Bremen','Stuttgart','Hannover']}
];
const PREFIX=['Atlético','União','Real','Sporting','Estrela','Nacional','Ferroviário','Acadêmico','Racing','Olimpo'];
const SUFFIX=['FC','Clube','Athletic','City','Calcio','Sport','United','Esporte','1908','Central'];
let active=null, selectedCountry='br';
function get(k,f=null){try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch{return f;}}
function set(k,v){localStorage.setItem(k,JSON.stringify(v));}
function main(){return get(MAIN);}
function write(s){localStorage.setItem(MAIN,JSON.stringify(s));}
function user(s){return s.teams.find(t=>t.id===s.userTeamId);}
function sig(s){return `${s.managerName}|${s.teams?.[0]?.squad?.[0]?.id||'new'}`;}
function clubLite(def,tier,index,season){
 const city=def.cities[index%def.cities.length],base=def.coefficient-tier*8+C.randomInt(-5,5);
 return {id:`${def.id}-${tier}-${index}`,name:`${PREFIX[index%PREFIX.length]} ${city} ${SUFFIX[(index+tier)%SUFFIX.length]}`,short:`${def.id}${tier}${index}`.toUpperCase().slice(0,3),city,country:def.name,tier,strength:C.clamp(base,45,91),reputation:C.clamp(base-2,35,94),played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0,form:[],season};
}
function resetClub(c){Object.assign(c,{played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0,form:[]});}
function createDivision(def,tier,season,existing=[]){
 const clubs=[];
 for(let i=0;i<10;i++)clubs.push(existing[i]||clubLite(def,tier,i,season));
 return {tier,name:`${def.name} ${String.fromCharCode(64+tier)}`,round:0,clubs,history:[]};
}
function createData(s){
 const countries={};
 COUNTRY_DEFS.forEach(def=>{
  const divisions=[];
  for(let t=1;t<=def.tiers;t++){
   const existing=def.id==='br'&&t===1?s.teams.map(team=>({id:team.id,name:team.name,short:team.short,city:team.city,country:'Brasil',tier:1,strength:C.calculateTeamOverall(team),reputation:team.reputation,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0,form:[],season:s.season})): [];
   divisions.push(createDivision(def,t,s.season,existing));
  }
  countries[def.id]={...def,divisions,continentalPoints:0,coefficient:def.coefficient,champions:[]};
 });
 return {version:8,signature:sig(s),lastSeason:s.season,lastWeek:s.week,selectedCountry:'br',user:{country:'br',tier:1,history:[]},countries,calendar:createCalendar(s.season),events:[],coefficients:[],seasonArchive:[]};
}
function data(s){let d=get(KEY);if(!d||d.version!==8||d.signature!==sig(s)){d=createData(s);set(KEY,d);}return d;}
function createCalendar(season){
 const base=new Date(Date.UTC(season,6,1));
 const labels={1:'Início da pré-temporada',2:'Abertura da janela de transferências',4:'Primeira rodada nacional',7:'Sorteio da Copa Nacional',10:'Data FIFA',14:'Primeira fase continental',18:'Fechamento da janela principal',22:'Data FIFA',26:'Janela de meio de temporada',30:'Mata-mata continental',34:'Semifinais das copas',38:'Finais nacionais',42:'Final continental',46:'Fim da temporada'};
 return Array.from({length:48},(_,i)=>{const date=new Date(base);date.setUTCDate(date.getUTCDate()+i*7);return {week:i+1,date:date.toISOString().slice(0,10),label:labels[i+1]||null,window:i+1>=2&&i+1<=18||i+1>=26&&i+1<=29,fifa:[10,22].includes(i+1)};});
}
function dateForWeek(d,week){return d.calendar[Math.max(0,(week-1)%d.calendar.length)]?.date||`${d.lastSeason}-07-01`;}
function table(div){return [...div.clubs].sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf);}
function play(a,b){
 const home=a.strength+3+C.gaussian(0,8),away=b.strength+C.gaussian(0,8);
 const hg=Math.max(0,Math.round(C.clamp((home-away+20)/18+C.gaussian(.55,.75),0,6)));
 const ag=Math.max(0,Math.round(C.clamp((away-home+17)/19+C.gaussian(.45,.7),0,6)));
 a.played++;b.played++;a.gf+=hg;a.ga+=ag;b.gf+=ag;b.ga+=hg;
 if(hg>ag){a.wins++;a.points+=3;b.losses++;a.form.push('V');b.form.push('D');}
 else if(ag>hg){b.wins++;b.points+=3;a.losses++;b.form.push('V');a.form.push('D');}
 else {a.draws++;b.draws++;a.points++;b.points++;a.form.push('E');b.form.push('E');}
 a.form=a.form.slice(-5);b.form=b.form.slice(-5);
}
function simulateDivision(div){
 const clubs=[...div.clubs];const offset=div.round%clubs.length;
 for(let i=0;i<clubs.length/2;i++)play(clubs[(i+offset)%clubs.length],clubs[(clubs.length-1-i+offset)%clubs.length]);
 div.round++;
}
function simulateWorldWeek(d,s){
 Object.values(d.countries).forEach(country=>country.divisions.forEach(div=>{
  const isUserDivision=country.id===d.user.country&&div.tier===d.user.tier;
  if(!isUserDivision)simulateDivision(div);
 }));
 if(C.chance(.08))d.events.unshift({season:s.season,week:s.week,date:dateForWeek(d,s.week),text:C.pick(['Uma partida foi adiada por condições climáticas.','Uma federação alterou a data de um confronto por questões de segurança.','Um clube recebeu advertência por atraso salarial.','O sorteio continental gerou um confronto de grande rivalidade.'])});
 d.events=d.events.slice(0,100);
}
function settleCountry(country,season){
 country.divisions.forEach(div=>{if(div.round<18){while(div.round<18)simulateDivision(div);}const t=table(div);div.history.unshift({season,champion:t[0].name,table:t.map(c=>({id:c.id,name:c.name,points:c.points}))});});
 for(let tier=1;tier<country.divisions.length;tier++){
  const upper=country.divisions[tier-1],lower=country.divisions[tier],n=country.relegation;
  const upTable=table(upper),lowTable=table(lower),relegated=upTable.slice(-n),promoted=lowTable.slice(0,n);
  upper.clubs=upper.clubs.filter(c=>!relegated.includes(c)).concat(promoted.map(c=>({...c,tier})));
  lower.clubs=lower.clubs.filter(c=>!promoted.includes(c)).concat(relegated.map(c=>({...c,tier:tier+1})));
 }
 const champ=table(country.divisions[0])[0];country.champions.unshift({season,club:champ.name});country.continentalPoints=C.round(C.random(4,18)+country.coefficient/10,2);country.coefficient=C.round(country.coefficient*.92+country.continentalPoints*.8,2);
 country.divisions.forEach(div=>{div.round=0;div.clubs.forEach(c=>{resetClub(c);c.season=season+1;c.strength=C.clamp(c.strength+C.randomInt(-2,2),40,95);});});
}
function fullTeamFromLite(lite,seed){
 return C.createTeam({id:lite.id,name:lite.name,short:lite.short,city:lite.city,strength:lite.strength,budget:Math.round(Math.pow(lite.strength/55,4)*6000000),capacity:Math.round(12000+lite.reputation*350),reputation:lite.reputation},seed);
}
function rebuildUserLeague(s,d){
 const oldUser=user(s),country=d.countries[d.user.country],division=country.divisions[d.user.tier-1];
 const opponents=division.clubs.filter(c=>c.id!==oldUser.id).slice(0,9).map((lite,i)=>{
  const existing=s.teams.find(t=>t.id===lite.id);return existing||fullTeamFromLite(lite,800+d.user.tier*20+i);
 });
 s.teams=[oldUser,...opponents];s.fixtures=C.roundRobin(s.teams.map(t=>t.id));s.round=0;
 s.teams.forEach(t=>Object.assign(t,{played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0,formSequence:[]}));
 s.lastPosition=s.teams.length;s.board.objectives=Systems.createBoardObjectives(oldUser);
 division.clubs=[{id:oldUser.id,name:oldUser.name,short:oldUser.short,city:oldUser.city,country:country.name,tier:d.user.tier,strength:C.calculateTeamOverall(oldUser),reputation:oldUser.reputation,played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0,form:[],season:s.season},...division.clubs.filter(c=>c.id!==oldUser.id)].slice(0,10);
}
function seasonTransition(s,d,previousSeason){
 const previousPosition=s.lastPosition||s.teams.length,oldTier=d.user.tier,country=d.countries[d.user.country];
 Object.values(d.countries).forEach(c=>settleCountry(c,previousSeason));
 if(previousPosition<=2&&oldTier>1)d.user.tier--;
 else if(previousPosition>s.teams.length-country.relegation&&oldTier<country.tiers)d.user.tier++;
 const movement=d.user.tier<oldTier?'Promoção':d.user.tier>oldTier?'Rebaixamento':'Permanência';
 d.user.history.unshift({season:previousSeason,position:previousPosition,tier:oldTier,movement});
 d.seasonArchive.unshift({season:previousSeason,userPosition:previousPosition,userTier:oldTier,movement,champions:Object.values(d.countries).map(c=>({country:c.name,club:c.champions[0]?.club}))});
 d.calendar=createCalendar(s.season);d.coefficients=Object.values(d.countries).sort((a,b)=>b.coefficient-a.coefficient).map((c,i)=>({rank:i+1,country:c.name,coefficient:c.coefficient}));
 rebuildUserLeague(s,d);
 d.events.unshift({season:s.season,week:1,date:dateForWeek(d,1),text:`${movement}: ${user(s).name} disputará ${country.divisions[d.user.tier-1].name}.`});
}
function catchUp(){
 const s=main();if(!s)return;const d=data(s);
 if(d.lastSeason!==s.season){seasonTransition(s,d,d.lastSeason);d.lastSeason=s.season;d.lastWeek=1;write(s);}
 const steps=Math.min(30,Math.max(0,s.week-d.lastWeek));for(let i=0;i<steps;i++)simulateWorldWeek(d,s);
 d.lastWeek=s.week;set(KEY,d);
}
function stat(l,v,x){return `<div class="card stat-card"><span>${l}</span><strong>${v}</strong><small>${x}</small></div>`;}
function addNav(){const nav=document.querySelector('.nav-list');if(!nav||nav.querySelector('[data-v08-view]'))return;const before=nav.querySelector('[data-view="history"]');Object.entries(VIEWS).forEach(([id,label])=>{const b=document.createElement('button');b.className='nav-item';b.dataset.v08View=id;b.textContent=label;nav.insertBefore(b,before||null);b.onclick=e=>{e.preventDefault();document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));b.classList.add('active');active=id;render(id);};});}
function render(view){
 const s=main(),root=document.querySelector('#app-view');if(!s||!root)return;catchUp();const d=data(main()),country=d.countries[selectedCountry]||d.countries.br;document.querySelector('#page-title').textContent=VIEWS[view];
 if(view==='pyramid'){
  const current=d.countries[d.user.country].divisions[d.user.tier-1];
  root.innerHTML=`<div class="grid grid-4">${stat('Liga atual',current.name,`${d.user.tier}º nível`)}${stat('Países',Object.keys(d.countries).length,'Mundos simulados')}${stat('Divisões',Object.values(d.countries).reduce((n,c)=>n+c.divisions.length,0),'Promoção e rebaixamento')}${stat('Próxima data',new Date(dateForWeek(d,s.week)).toLocaleDateString('pt-BR'),`Semana ${s.week}`)}</div>
  <div class="card section-gap"><label>País<select data-v08-setting="country">${COUNTRY_DEFS.map(c=>`<option value="${c.id}" ${selectedCountry===c.id?'selected':''}>${c.name}</option>`).join('')}</select></label></div>
  <div class="grid grid-2 section-gap">${country.divisions.map(div=>`<div class="card"><div class="card-header"><h2>${div.name}</h2><small>Rodada simulada ${div.round}</small></div><div class="mini-table">${table(div).map((c,i)=>`<div class="${c.id===s.userTeamId?'user-row':''}"><span>${i+1}. ${c.name}</span><b>${c.points} pts</b></div>`).join('')}</div><p class="muted">${country.relegation} sobem/descem por temporada.</p></div>`).join('')}</div>
  <div class="card section-gap"><h2>Histórico do seu clube</h2>${d.user.history.map(h=>`<div class="list-item"><span>${h.season} · nível ${h.tier} · ${h.position}º</span><b>${h.movement}</b></div>`).join('')||'<p class="muted">Primeira temporada em andamento.</p>'}</div>`;
 }
 if(view==='yearcalendar'){
  const nowIndex=(s.week-1)%48;
  root.innerHTML=`<div class="grid grid-4">${stat('Data no jogo',new Date(dateForWeek(d,s.week)).toLocaleDateString('pt-BR'),`Temporada ${s.season}`)}${stat('Janela',d.calendar[nowIndex]?.window?'Aberta':'Fechada','Transferências e inscrições')}${stat('Data FIFA',d.calendar[nowIndex]?.fifa?'Sim':'Não','Convocações internacionais')}${stat('Fase',d.calendar[nowIndex]?.label||'Calendário regular','Agenda mundial')}</div>
  <div class="card section-gap"><h2>Agenda da temporada</h2><div class="timeline-calendar">${d.calendar.map((x,i)=>`<div class="calendar-day ${i===nowIndex?'current':''}"><b>S${x.week}</b><span>${new Date(x.date).toLocaleDateString('pt-BR')}</span><small>${x.label||'Rodada nacional'}${x.window?' · janela':''}${x.fifa?' · FIFA':''}</small></div>`).join('')}</div></div>
  <div class="card section-gap"><h2>Eventos do mundo</h2>${d.events.slice(0,20).map(e=>`<div class="list-item"><span>${new Date(e.date).toLocaleDateString('pt-BR')}</span><b>${e.text}</b></div>`).join('')||'<p class="muted">Sem alterações extraordinárias.</p>'}</div>`;
 }
 if(view==='regulationsplus'){
  root.innerHTML=`<div class="grid grid-3">${Object.values(d.countries).map(c=>stat(c.name,C.round(c.coefficient,1),`${c.divisions.length} divisões · temporada ${c.season}`)).join('')}</div>
  <div class="card section-gap"><h2>Regras por país</h2><div class="table-wrap"><table><thead><tr><th>País</th><th>Elenco</th><th>Estrangeiros</th><th>Rebaixamento</th><th>Pausa</th><th>Calendário</th></tr></thead><tbody>${Object.values(d.countries).map(c=>`<tr><td><b>${c.name}</b></td><td>${c.squad}</td><td>${c.foreign}</td><td>${c.relegation}</td><td>${c.winter?'Inverno':'Sem pausa'}</td><td>${c.season}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="card section-gap"><h2>Ranking de coeficientes</h2>${(d.coefficients.length?d.coefficients:Object.values(d.countries).sort((a,b)=>b.coefficient-a.coefficient).map((c,i)=>({rank:i+1,country:c.name,coefficient:c.coefficient}))).map(x=>`<div class="list-item"><span>${x.rank}º ${x.country}</span><b>${C.round(x.coefficient,2)}</b></div>`).join('')}</div>`;
 }
}
function bind(){
 document.addEventListener('change',e=>{if(e.target.dataset.v08Setting==='country'){selectedCountry=e.target.value;if(active)render(active);}});
 document.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action;if(['simulate-week','simulate-month','next-season'].includes(a))setTimeout(()=>{catchUp();if(active)render(active);},160);},true);
 document.querySelector('#new-game-form')?.addEventListener('submit',()=>setTimeout(()=>{const s=main();if(s)set(KEY,createData(s));},220));
}
function init(){addNav();catchUp();bind();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
