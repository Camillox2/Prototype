const clubs = [
  {id:'curitiba',name:'Curitiba Athletic',short:'CTA',strength:78,budget:18000000,capacity:36000},
  {id:'porto',name:'Porto Azul',short:'PAZ',strength:76,budget:15000000,capacity:31000},
  {id:'serra',name:'Serra Verde',short:'SV',strength:74,budget:13000000,capacity:26000},
  {id:'litoral',name:'Litoral FC',short:'LFC',strength:72,budget:12000000,capacity:24000},
  {id:'capital',name:'Capital União',short:'CAP',strength:77,budget:17000000,capacity:34000},
  {id:'interior',name:'Interior Clube',short:'INT',strength:70,budget:9000000,capacity:19000}
];

const names = ['Lucas Silva','Rafael Souza','Gabriel Lima','Matheus Costa','João Santos','Pedro Rocha','Bruno Mendes','Caio Ribeiro','Henrique Gomes','Arthur Martins','Vitor Almeida','Luan Pereira','Diego Cardoso','Felipe Barbosa','Thiago Moreira','André Carvalho','Eduardo Nunes','Murilo Reis','Gustavo Freitas','Renan Castro'];
const positions = ['GOL','LD','ZAG','ZAG','LE','VOL','MC','MEI','PD','PE','ATA','GOL','ZAG','VOL','MEI','ATA','LE','MC','PD','ATA'];
const staffNames = ['Marcelo Tavares','Ricardo Moura','Paulo Nogueira','Sérgio Matos','Daniel Pires','Anderson Faria','Fábio Leite','Roberto Diniz','Carlos Antunes','Márcio Neves'];
const key = 'futmaster-save-v3';

let state = migrate(JSON.parse(localStorage.getItem(key) || 'null'));
let view = 'dashboard';
const root = document.querySelector('#app-view');
const dialog = document.querySelector('#new-game-dialog');
const clubSelect = document.querySelector('#club-select');
clubSelect.innerHTML = clubs.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

document.querySelectorAll('.nav-item').forEach(button => {
  button.onclick = () => {
    view = button.dataset.view;
    document.querySelectorAll('.nav-item').forEach(x => x.classList.toggle('active', x === button));
    render();
  };
});
document.querySelector('#new-game-button').onclick = () => dialog.showModal();
document.querySelector('#new-game-form').onsubmit = event => {
  if (event.submitter?.value === 'cancel') return;
  event.preventDefault();
  newGame(clubSelect.value, document.querySelector('#manager-name').value);
  dialog.close();
};

root.onclick = event => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  const action = target.dataset.action;
  const id = target.closest('[data-id]')?.dataset.id;
  if (action === 'open-new-game') dialog.showModal();
  if (action === 'simulate') simulateWeek();
  if (action === 'buy') buyPlayer(Number(id));
  if (action === 'hire-staff') hireStaff(Number(id));
  if (action === 'fire-staff') fireStaff(id);
  if (action === 'toggle-delegation') toggleDelegation(id);
  if (action === 'promote-youth') promoteYouth(id);
  if (action === 'campaign') launchCampaign();
  if (action === 'upgrade') upgradeFacility(id);
  if (action === 'renew') renewContract(Number(id));
  if (action === 'heal') treatPlayer(Number(id));
};

root.onchange = event => {
  const el = event.target;
  if (!state) return;
  if (el.dataset.setting === 'automation') {
    state.automation.mode = el.value;
    if (el.value === 'full') Object.values(state.departments).forEach(d => d.delegated = true);
    if (el.value === 'manual') Object.values(state.departments).forEach(d => d.delegated = false);
    save(); render();
  }
  if (el.dataset.setting === 'ticket-price') {
    state.fans.ticketPrice = Math.max(10, Math.min(500, Number(el.value) || 50));
    save(); render();
  }
  if (el.dataset.setting === 'membership-price') {
    state.fans.membershipPrice = Math.max(10, Math.min(300, Number(el.value) || 40));
    save(); render();
  }
  if (el.dataset.setting === 'formation') {
    state.tactics.formation = el.value; save();
  }
  if (el.dataset.setting === 'style') {
    state.tactics.style = el.value; save();
  }
};

function migrate(saved) {
  if (!saved) return null;
  if (saved.version === 3) return saved;
  return null;
}

function createSquad(seed, youth = false) {
  return names.slice(0, youth ? 14 : 20).map((name, i) => ({
    id: seed * 100 + i,
    name: youth ? `${name.split(' ')[0]} ${['Jr.','Filho','Neto','Santos'][i % 4]}` : name,
    position: positions[i],
    age: youth ? 14 + ((i + seed) % 6) : 18 + ((i + seed) % 16),
    rating: youth ? 45 + ((i * 7 + seed) % 24) : 61 + ((i * 7 + seed) % 24),
    potential: youth ? 68 + ((i * 9 + seed) % 25) : 70 + ((i * 5 + seed) % 20),
    fitness: 78 + ((i * 3) % 22),
    morale: 65 + ((i * 4) % 30),
    salary: (youth ? 8000 : 45000) + ((i + seed) % 10) * (youth ? 2000 : 9000),
    contractYears: 1 + ((i + seed) % 4),
    starter: !youth && i < 11,
    injuredWeeks: 0,
    value: (youth ? 0.3 : 2 + ((i + seed) % 12)) * 1000000
  }));
}

function createSchedule(ids) {
  const rounds = [];
  let rotating = [...ids];
  for (let i = 0; i < ids.length - 1; i++) {
    const round = [];
    for (let j = 0; j < ids.length / 2; j++) {
      const a = rotating[j], b = rotating[rotating.length - 1 - j];
      round.push(i % 2 ? {home:b, away:a} : {home:a, away:b});
    }
    rounds.push(round);
    rotating = [rotating[0], rotating.at(-1), ...rotating.slice(1, -1)];
  }
  return [...rounds, ...rounds.map(r => r.map(m => ({home:m.away, away:m.home})))];
}

function createDepartments() {
  return {
    football:{name:'Direção de futebol',role:'Diretor de futebol',delegated:false,staff:null},
    academy:{name:'Categorias de base',role:'Diretor da base',delegated:false,staff:null},
    scouting:{name:'Scouting',role:'Chefe de scouting',delegated:false,staff:null},
    medical:{name:'Departamento médico',role:'Chefe médico',delegated:false,staff:null},
    commercial:{name:'Comercial e patrocínios',role:'Diretor comercial',delegated:false,staff:null},
    fan:{name:'Sócios e torcedores',role:'Diretor de relacionamento',delegated:false,staff:null},
    stadium:{name:'Estádio e operações',role:'Gerente de estádio',delegated:false,staff:null},
    finance:{name:'Finanças',role:'Diretor financeiro',delegated:false,staff:null}
  };
}

function createStaffMarket() {
  return staffNames.map((name, i) => ({
    id:i+1,
    name,
    skill:58 + ((i * 7) % 35),
    salary:45000 + ((i * 17000) % 120000),
    role:Object.values(createDepartments())[i % 8].role
  }));
}

function newGame(id, manager) {
  const teams = clubs.map((club, i) => ({
    ...club, played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0,
    squad:createSquad(i+1)
  }));
  const selected = teams.find(t => t.id === id);
  state = {
    version:3,
    manager,
    clubId:id,
    season:2026,
    week:1,
    round:0,
    teams,
    balance:selected.budget,
    morale:75,
    confidence:70,
    reputation:55,
    tactics:{formation:'4-2-3-1',style:'equilibrado'},
    fixtures:createSchedule(teams.map(t => t.id)),
    history:[],
    ledger:[],
    market:createSquad(19).slice(5,15).map((p,i)=>({...p,id:i+1,price:Math.round(p.value*1.15)})),
    academy:{
      u20:createSquad(40,true).map(p=>({...p,age:17+(p.id%3)})),
      u17:createSquad(41,true).map(p=>({...p,age:15+(p.id%3)})),
      u15:createSquad(42,true).map(p=>({...p,age:13+(p.id%3)})),
      philosophy:'formação técnica',
      intakeWeek:30
    },
    departments:createDepartments(),
    staffMarket:createStaffMarket(),
    automation:{mode:'assisted',lastReport:[]},
    fans:{
      total:180000 + selected.strength * 4000,
      members:12000,
      satisfaction:72,
      loyalty:68,
      ticketPrice:65,
      membershipPrice:45,
      stadiumCapacity:selected.capacity,
      attendance:0,
      occupancy:0,
      merchandiseRevenue:0,
      membershipRevenue:0,
      ticketRevenue:0
    },
    sponsors:[
      {name:'Banco Aurora',value:4200000,years:2},
      {name:'Energia Sul',value:1800000,years:1}
    ],
    facilities:{
      stadium:{name:'Estádio',level:2,max:5,cost:9000000},
      training:{name:'Centro de treinamento',level:2,max:5,cost:5000000},
      academy:{name:'Centro da base',level:1,max:5,cost:4200000},
      medical:{name:'Centro médico',level:1,max:5,cost:3600000},
      scouting:{name:'Rede de scouting',level:1,max:5,cost:3000000}
    },
    medical:[],
    commercial:{campaigns:0,storeLevel:1,brandValue:52},
    objectives:[
      {text:'Terminar entre os 4 primeiros',progress:0},
      {text:'Promover 2 atletas da base',progress:0},
      {text:'Aumentar sócios em 15%',progress:0}
    ]
  };
  ledger('Investimento inicial', state.balance, 'entrada');
  save(); render();
}

function team(id){ return state.teams.find(t=>t.id===id); }
function my(){ return team(state.clubId); }
function money(v){ return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',notation:'compact'}).format(v); }
function standings(){ return [...state.teams].sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf); }
function departmentByRole(role){ return Object.entries(state.departments).find(([,d])=>d.role===role); }
function averageStaffSkill(){
  const hired = Object.values(state.departments).map(d=>d.staff).filter(Boolean);
  return hired.length ? Math.round(hired.reduce((s,x)=>s+x.skill,0)/hired.length) : 35;
}
function delegated(id){
  if (state.automation.mode === 'full') return true;
  if (state.automation.mode === 'manual') return false;
  return state.departments[id]?.delegated;
}
function ledger(description, amount, type){
  state.ledger.unshift({week:state.week,description,amount,type});
  state.ledger = state.ledger.slice(0,80);
}
function save(){ localStorage.setItem(key, JSON.stringify(state)); }

function goals(strength){
  const r=Math.random()*100;
  return r<15?0:r<48?1:r<78?2:r<94?3:4+(Math.random()<.35?1:0)+(strength>78&&Math.random()<.25?1:0);
}
function updateTable(t,gf,ga){
  t.played++;t.gf+=gf;t.ga+=ga;
  if(gf>ga){t.wins++;t.points+=3}
  else if(gf===ga){t.draws++;t.points++}
  else t.losses++;
}

function simulateWeek(){
  if(state.round>=state.fixtures.length){ alert('Temporada concluída.'); return; }
  state.automation.lastReport=[];
  runAutomation();
  payWeeklyCosts();
  recoverPlayers();

  const results=state.fixtures[state.round].map(match=>{
    const home=team(match.home),away=team(match.away);
    const homeBonus = match.home===state.clubId ? tacticalBonus() : 0;
    const awayBonus = match.away===state.clubId ? tacticalBonus() : 0;
    let hg=goals(home.strength+3+homeBonus),ag=goals(away.strength+awayBonus);
    if(home.strength-away.strength>8&&hg<ag)hg++;
    if(away.strength-home.strength>8&&ag<hg)ag++;
    updateTable(home,hg,ag);updateTable(away,ag,hg);
    return{...match,hg,ag};
  });

  const userResult=results.find(x=>x.home===state.clubId||x.away===state.clubId);
  const userGoals=userResult.home===state.clubId?userResult.hg:userResult.ag;
  const oppGoals=userResult.home===state.clubId?userResult.ag:userResult.hg;
  state.morale=Math.max(30,Math.min(100,state.morale+(userGoals>oppGoals?5:userGoals===oppGoals?1:-4)));
  state.confidence=Math.max(20,Math.min(100,state.confidence+(userGoals>oppGoals?3:userGoals===oppGoals?0:-2)));
  state.fans.satisfaction=Math.max(25,Math.min(100,state.fans.satisfaction+(userGoals>oppGoals?3:userGoals===oppGoals?0:-2)));

  if(userResult.home===state.clubId) runMatchdayRevenue();
  else {
    const awayShare=180000;
    state.balance+=awayShare; ledger('Cota de visitante',awayShare,'entrada');
  }

  maybeInjury();
  developPlayers();
  state.history.unshift({round:state.round+1,week:state.week,text:`${team(userResult.home).short} ${userResult.hg} x ${userResult.ag} ${team(userResult.away).short}`});
  state.round++;state.week++;
  save();render();
}

function tacticalBonus(){
  let bonus=0;
  if(state.tactics.style==='ofensivo') bonus+=1;
  if(state.morale>80) bonus+=1;
  if(delegated('football')&&state.departments.football.staff) bonus+=Math.floor(state.departments.football.staff.skill/40);
  return bonus;
}

function runMatchdayRevenue(){
  const f=state.fans;
  const pricePenalty=Math.max(0,(f.ticketPrice-80)/120);
  const demand=Math.min(1,0.35+state.reputation/140+f.satisfaction/180-pricePenalty);
  f.attendance=Math.min(f.stadiumCapacity,Math.round(f.stadiumCapacity*demand));
  f.occupancy=Math.round((f.attendance/f.stadiumCapacity)*100);
  const gross=Math.round(f.attendance*f.ticketPrice);
  const operating=Math.round(gross*0.18);
  f.ticketRevenue+=gross;
  state.balance+=gross-operating;
  ledger('Bilheteria da partida',gross,'entrada');
  ledger('Operação do estádio',operating,'saída');
  const store=Math.round(f.attendance*(7+state.commercial.storeLevel*2));
  f.merchandiseRevenue+=store;
  state.balance+=store;ledger('Loja e alimentação',store,'entrada');
}

function payWeeklyCosts(){
  const playerPayroll=my().squad.reduce((s,p)=>s+p.salary,0)/4;
  const staffPayroll=Object.values(state.departments).reduce((s,d)=>s+(d.staff?.salary||0),0)/4;
  const academyCost=(180000+state.facilities.academy.level*45000);
  const maintenance=120000+state.facilities.stadium.level*50000;
  const total=Math.round(playerPayroll+staffPayroll+academyCost+maintenance);
  state.balance-=total;ledger('Folha e custos semanais',total,'saída');
  const memberIncome=Math.round(state.fans.members*state.fans.membershipPrice/4);
  state.balance+=memberIncome;state.fans.membershipRevenue+=memberIncome;ledger('Mensalidades de sócios',memberIncome,'entrada');
}

function recoverPlayers(){
  my().squad.forEach(p=>{
    if(p.injuredWeeks>0)p.injuredWeeks--;
    p.fitness=Math.min(100,p.fitness+6+state.facilities.medical.level);
  });
}

function maybeInjury(){
  const chance=Math.max(.04,.12-state.facilities.medical.level*.012);
  if(Math.random()<chance){
    const available=my().squad.filter(p=>p.injuredWeeks===0);
    const player=available[Math.floor(Math.random()*available.length)];
    if(player){
      player.injuredWeeks=1+Math.floor(Math.random()*5);
      state.medical.unshift({playerId:player.id,diagnosis:'lesão muscular',weeks:player.injuredWeeks});
      state.automation.lastReport.push(`${player.name} sofreu lesão e ficará fora por ${player.injuredWeeks} semana(s).`);
    }
  }
}

function developPlayers(){
  const training=state.facilities.training.level;
  my().squad.forEach(p=>{
    p.fitness=Math.max(45,p.fitness-(p.starter?8:3));
    if(p.age<24&&Math.random()<.08+training*.02&&p.rating<p.potential)p.rating++;
  });
  ['u20','u17','u15'].forEach(cat=>state.academy[cat].forEach(p=>{
    if(Math.random()<.12+state.facilities.academy.level*.025&&p.rating<p.potential)p.rating++;
  }));
}

function runAutomation(){
  const report=state.automation.lastReport;
  if(delegated('fan')&&state.departments.fan.staff){
    const director=state.departments.fan.staff;
    if(state.fans.satisfaction<65&&state.balance>300000){
      const cost=220000;state.balance-=cost;state.fans.satisfaction+=4;state.fans.members+=Math.round(200+director.skill*8);
      ledger('Campanha automática para torcedores',cost,'saída');
      report.push(`${director.name} lançou campanha de relacionamento e ganhou novos sócios.`);
    }
  }
  if(delegated('commercial')&&state.departments.commercial.staff){
    const director=state.departments.commercial.staff;
    if(Math.random()<.22){
      const revenue=150000+director.skill*6000;
      state.balance+=revenue;state.commercial.brandValue=Math.min(100,state.commercial.brandValue+1);
      ledger('Ação comercial automática',revenue,'entrada');
      report.push(`${director.name} fechou uma ação comercial de ${money(revenue)}.`);
    }
  }
  if(delegated('academy')&&state.departments.academy.staff){
    const best=state.academy.u20.filter(p=>p.age>=18).sort((a,b)=>b.potential-a.potential)[0];
    if(best&&best.rating>=68&&my().squad.length<28){
      promoteYouth(best.id,true);
      report.push(`${state.departments.academy.staff.name} promoveu ${best.name} ao elenco principal.`);
    }
  }
  if(delegated('medical')&&state.departments.medical.staff){
    const injured=my().squad.filter(p=>p.injuredWeeks>0);
    injured.forEach(p=>{ if(Math.random()<state.departments.medical.staff.skill/180)p.injuredWeeks=Math.max(0,p.injuredWeeks-1); });
    if(injured.length)report.push('O departamento médico aplicou protocolos de recuperação.');
  }
  if(delegated('scouting')&&state.departments.scouting.staff&&state.market.length<8){
    const seed=state.week+55;
    const prospect=createSquad(seed).slice(0,1)[0];
    prospect.id=Date.now();prospect.price=Math.round(prospect.value*(1.05+Math.random()*.2));
    state.market.push(prospect);
    report.push(`${state.departments.scouting.staff.name} adicionou ${prospect.name} à lista de observação.`);
  }
  if(delegated('finance')&&state.departments.finance.staff&&state.balance<2000000){
    state.fans.ticketPrice=Math.min(160,state.fans.ticketPrice+5);
    report.push(`${state.departments.finance.staff.name} reajustou o ingresso para proteger o caixa.`);
  }
  if(delegated('stadium')&&state.departments.stadium.staff){
    state.fans.occupancy=Math.min(100,state.fans.occupancy+1);
  }
  if(delegated('football')&&state.departments.football.staff){
    autoLineup();
    report.push(`${state.departments.football.staff.name} definiu a escalação por força e condição física.`);
  }
}

function autoLineup(){
  const sorted=[...my().squad].sort((a,b)=>(b.injuredWeeks===0)-(a.injuredWeeks===0)||b.fitness-a.fitness||b.rating-a.rating);
  my().squad.forEach(p=>p.starter=false);
  sorted.filter(p=>p.injuredWeeks===0).slice(0,11).forEach(p=>p.starter=true);
}

function buyPlayer(id){
  const p=state.market.find(x=>x.id===id);
  if(!p)return;
  if(state.balance<p.price)return alert('Saldo insuficiente.');
  state.balance-=p.price;ledger(`Contratação de ${p.name}`,p.price,'saída');
  my().squad.push({...p,id:Date.now(),starter:false,contractYears:3});
  state.market=state.market.filter(x=>x.id!==id);
  save();render();
}

function renewContract(id){
  const p=my().squad.find(x=>x.id===id);if(!p)return;
  const bonus=Math.round(p.salary*6);
  if(state.balance<bonus)return alert('Saldo insuficiente para luvas.');
  state.balance-=bonus;p.contractYears=3;p.salary=Math.round(p.salary*1.12);
  ledger(`Renovação de ${p.name}`,bonus,'saída');save();render();
}

function hireStaff(id){
  const candidate=state.staffMarket.find(s=>s.id===id);if(!candidate)return;
  const deptEntry=departmentByRole(candidate.role);if(!deptEntry)return;
  const [deptId,dept]=deptEntry;
  if(dept.staff)return alert(`${dept.name} já possui responsável.`);
  const signing=Math.round(candidate.salary*2);
  if(state.balance<signing)return alert('Saldo insuficiente para contratação.');
  state.balance-=signing;dept.staff={...candidate};dept.delegated=true;
  state.staffMarket=state.staffMarket.filter(s=>s.id!==id);
  ledger(`Contratação de ${candidate.name}`,signing,'saída');
  state.automation.lastReport.unshift(`${candidate.name} assumiu ${dept.name}.`);
  save();render();
}

function fireStaff(deptId){
  const dept=state.departments[deptId];if(!dept?.staff)return;
  const severance=Math.round(dept.staff.salary*3);
  if(state.balance<severance)return alert('Saldo insuficiente para a rescisão.');
  state.balance-=severance;ledger(`Rescisão de ${dept.staff.name}`,severance,'saída');
  state.staffMarket.push({...dept.staff,id:Date.now()});dept.staff=null;dept.delegated=false;
  save();render();
}

function toggleDelegation(deptId){
  const dept=state.departments[deptId];
  if(!dept.staff)return alert('Contrate um responsável antes de delegar.');
  dept.delegated=!dept.delegated;
  if(state.automation.mode==='manual'||state.automation.mode==='full')state.automation.mode='assisted';
  save();render();
}

function promoteYouth(id, silent=false){
  let found,category;
  for(const cat of ['u20','u17','u15']){
    found=state.academy[cat].find(p=>String(p.id)===String(id));
    if(found){category=cat;break;}
  }
  if(!found)return;
  if(found.age<16&&!silent)return alert('Atleta ainda muito jovem para promoção.');
  state.academy[category]=state.academy[category].filter(p=>p.id!==found.id);
  my().squad.push({...found,id:Date.now(),salary:Math.max(18000,found.salary),contractYears:3,starter:false});
  state.objectives[1].progress++;
  save();render();
}

function launchCampaign(){
  const cost=300000;if(state.balance<cost)return alert('Saldo insuficiente.');
  state.balance-=cost;state.commercial.campaigns++;state.fans.members+=900+Math.round(state.reputation*8);
  state.fans.satisfaction=Math.min(100,state.fans.satisfaction+4);
  ledger('Campanha de sócio-torcedor',cost,'saída');save();render();
}

function upgradeFacility(id){
  const facility=state.facilities[id];if(!facility||facility.level>=facility.max)return;
  const cost=Math.round(facility.cost*(1+(facility.level-1)*.65));
  if(state.balance<cost)return alert('Saldo insuficiente.');
  state.balance-=cost;facility.level++;ledger(`Melhoria: ${facility.name}`,cost,'saída');save();render();
}

function treatPlayer(id){
  const p=my().squad.find(x=>x.id===id);if(!p||p.injuredWeeks===0)return;
  const cost=120000*p.injuredWeeks;if(state.balance<cost)return alert('Saldo insuficiente.');
  state.balance-=cost;p.injuredWeeks=Math.max(0,p.injuredWeeks-2);
  ledger(`Tratamento intensivo de ${p.name}`,cost,'saída');save();render();
}

function pageTitle(){
  return {
    dashboard:'Visão geral',squad:'Elenco',academy:'Base',staff:'Departamentos',
    fans:'Sócios e torcida',stadium:'Ingressos e estádio',commercial:'Comercial',
    tactics:'Táticas',league:'Classificação',transfers:'Mercado',
    medical:'Departamento médico',facilities:'Instalações',finance:'Finanças',history:'Histórico'
  }[view] || 'FutMaster';
}

function render(){
  document.querySelector('#season-label').textContent=state?.season||2026;
  document.querySelector('#club-badge').textContent=state?my().short:'FM';
  document.querySelector('#page-title').textContent=pageTitle();
  if(!state){
    root.innerHTML='<div class="empty-state"><h2>Nenhuma carreira encontrada</h2><p>Crie um novo jogo para começar.</p><button class="primary-button" data-action="open-new-game">Criar carreira</button></div>';
    return;
  }
  const views={dashboard:dash,squad:squadView,academy:academyView,staff:staffView,fans:fansView,stadium:stadiumView,commercial:commercialView,tactics:tacticsView,league:leagueView,transfers:transfersView,medical:medicalView,facilities:facilitiesView,finance:financeView,history:historyView};
  (views[view]||dash)();
}

function card(label,value,detail){return`<div class="card stat-card"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`}
function progress(value){return`<div class="progress"><span style="width:${Math.max(0,Math.min(100,value))}%"></span></div>`}

function dash(){
  const next=state.round<state.fixtures.length?'Preparar a próxima semana':'Temporada encerrada';
  root.innerHTML=`
    <div class="grid grid-4">
      ${card('Clube',my().name,state.manager)}
      ${card('Semana',state.week,`Rodada ${state.round}/${state.fixtures.length}`)}
      ${card('Saldo',money(state.balance),'Caixa disponível')}
      ${card('Gestão',state.automation.mode==='full'?'Automática':state.automation.mode==='manual'?'Manual':'Assistida',`${Object.values(state.departments).filter(d=>d.delegated).length} áreas delegadas`)}
    </div>
    <div class="card control-center">
      <div><span class="eyebrow">Modelo de gestão</span><h2>Quem decide no clube?</h2><p>Contrate profissionais para cada departamento e escolha entre controle manual, assistido ou totalmente automático.</p></div>
      <label class="compact-label">Modo
        <select data-setting="automation">
          <option value="manual" ${state.automation.mode==='manual'?'selected':''}>Manual — você decide tudo</option>
          <option value="assisted" ${state.automation.mode==='assisted'?'selected':''}>Assistido — delegação por área</option>
          <option value="full" ${state.automation.mode==='full'?'selected':''}>Automático — diretoria administra</option>
        </select>
      </label>
    </div>
    <div class="card hero"><div><span class="eyebrow">Próximo passo</span><h2>${next}</h2><p>Ao avançar, salários, mensalidades, recuperação, base, torcida e decisões delegadas são processados.</p></div><button class="primary-button" data-action="simulate">Avançar semana</button></div>
    <div class="grid grid-3 section-gap">
      ${card('Sócios',state.fans.members.toLocaleString('pt-BR'),`${state.fans.satisfaction}% de satisfação`)}
      ${card('Público último jogo',state.fans.attendance.toLocaleString('pt-BR'),`${state.fans.occupancy}% de ocupação`)}
      ${card('Equipe gestora',Object.values(state.departments).filter(d=>d.staff).length+'/8',`Qualidade média ${averageStaffSkill()}`)}
    </div>
    <div class="card section-gap"><h2>Relatório da diretoria</h2>${state.automation.lastReport.length?state.automation.lastReport.map(x=>`<div class="list-item"><span>Semana ${state.week}</span><b>${x}</b></div>`).join(''):'<p>Nenhuma decisão automática registrada nesta semana.</p>'}</div>
  `;
}

function squadView(){
  root.innerHTML=`<div class="card"><div class="card-header"><div><h2>Elenco principal</h2><p>${my().squad.length} atletas · folha mensal ${money(my().squad.reduce((s,p)=>s+p.salary,0))}</p></div></div><div class="table-wrap"><table><thead><tr><th>Jogador</th><th>Pos.</th><th>Idade</th><th>Força</th><th>Pot.</th><th>Físico</th><th>Contrato</th><th>Salário</th><th></th></tr></thead><tbody>${my().squad.map(p=>`<tr><td>${p.name}${p.injuredWeeks?` <span class="status danger">Lesão ${p.injuredWeeks}s</span>`:''}</td><td>${p.position}</td><td>${p.age}</td><td><b>${p.rating}</b></td><td>${p.potential}</td><td>${p.fitness}%</td><td>${p.contractYears} ano(s)</td><td>${money(p.salary)}/mês</td><td><button class="small-button" data-action="renew" data-id="${p.id}">Renovar</button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function academyView(){
  const blocks=['u20','u17','u15'].map(cat=>`<div class="card"><div class="card-header"><div><h2>${cat.toUpperCase()}</h2><p>${state.academy[cat].length} atletas</p></div></div><div class="table-wrap"><table><thead><tr><th>Jogador</th><th>Pos.</th><th>Idade</th><th>Força</th><th>Potencial</th><th></th></tr></thead><tbody>${state.academy[cat].map(p=>`<tr><td>${p.name}</td><td>${p.position}</td><td>${p.age}</td><td>${p.rating}</td><td><b>${p.potential}</b></td><td><button class="small-button" data-action="promote-youth" data-id="${p.id}">Promover</button></td></tr>`).join('')}</tbody></table></div></div>`).join('');
  root.innerHTML=`<div class="grid grid-3">${card('Centro da base','Nível '+state.facilities.academy.level,'Afeta evolução')}${card('Filosofia',state.academy.philosophy,'Modelo de formação')}${card('Promovidos',state.objectives[1].progress,'Meta: 2')}</div><div class="section-gap">${blocks}</div>`;
}

function staffView(){
  root.innerHTML=`
    <div class="card"><div class="card-header"><div><h2>Estrutura executiva</h2><p>O profissional recebe salário e administra a área quando a delegação está ativa.</p></div></div>
    <div class="department-grid">${Object.entries(state.departments).map(([id,d])=>`<article class="department-card"><span class="eyebrow">${d.role}</span><h3>${d.name}</h3>${d.staff?`<p><b>${d.staff.name}</b><br>Competência ${d.staff.skill} · ${money(d.staff.salary)}/mês</p><div class="button-row"><button class="${d.delegated?'primary-button':'secondary-button'}" data-action="toggle-delegation" data-id="${id}">${d.delegated?'Delegado':'Assumir manualmente'}</button><button class="danger-button" data-action="fire-staff" data-id="${id}">Demitir</button></div>`:'<p class="muted">Cargo vago. Você precisa administrar esta área.</p>'}</article>`).join('')}</div></div>
    <div class="card section-gap"><h2>Profissionais disponíveis</h2><div class="grid grid-2">${state.staffMarket.map(s=>`<div class="market-card" data-id="${s.id}"><div><h3>${s.name}</h3><p>${s.role} · competência ${s.skill}</p></div><div><b>${money(s.salary)}/mês</b><button class="primary-button" data-action="hire-staff">Contratar</button></div></div>`).join('')||'<p>Não há candidatos disponíveis.</p>'}</div></div>`;
}

function fansView(){
  root.innerHTML=`
    <div class="grid grid-4">${card('Torcedores',state.fans.total.toLocaleString('pt-BR'),'Base estimada')}${card('Sócios ativos',state.fans.members.toLocaleString('pt-BR'),money(state.fans.membershipRevenue)+' acumulado')}${card('Satisfação',state.fans.satisfaction+'%',progress(state.fans.satisfaction))}${card('Fidelidade',state.fans.loyalty+'%',progress(state.fans.loyalty))}</div>
    <div class="grid grid-2 section-gap">
      <div class="card"><h2>Programa de sócios</h2><label>Mensalidade média<input type="number" min="10" max="300" value="${state.fans.membershipPrice}" data-setting="membership-price"></label><p>Receita semanal projetada: <b>${money(state.fans.members*state.fans.membershipPrice/4)}</b></p><button class="primary-button" data-action="campaign">Lançar campanha (${money(300000)})</button></div>
      <div class="card"><h2>Relacionamento</h2><p>Campanhas realizadas: <b>${state.commercial.campaigns}</b></p><p>Valor da marca: <b>${state.commercial.brandValue}/100</b></p><p>Responsável: <b>${state.departments.fan.staff?.name||'Você'}</b></p></div>
    </div>`;
}

function stadiumView(){
  root.innerHTML=`
    <div class="grid grid-4">${card('Capacidade',state.fans.stadiumCapacity.toLocaleString('pt-BR'),'lugares')}${card('Último público',state.fans.attendance.toLocaleString('pt-BR'),state.fans.occupancy+'% ocupado')}${card('Bilheteria acumulada',money(state.fans.ticketRevenue),'temporada')}${card('Consumo e loja',money(state.fans.merchandiseRevenue),'temporada')}</div>
    <div class="grid grid-2 section-gap"><div class="card"><h2>Política de ingressos</h2><label>Preço médio<input type="number" min="10" max="500" value="${state.fans.ticketPrice}" data-setting="ticket-price"></label><p>Preços maiores elevam receita por ingresso, mas podem reduzir a ocupação.</p></div><div class="card"><h2>Operação do estádio</h2><p>Nível da instalação: <b>${state.facilities.stadium.level}/5</b></p><p>Responsável: <b>${state.departments.stadium.staff?.name||'Você'}</b></p><p>Custos operacionais são descontados em cada partida em casa.</p></div></div>`;
}

function commercialView(){
  root.innerHTML=`<div class="grid grid-3">${card('Valor da marca',state.commercial.brandValue+'/100','impacta contratos')}${card('Patrocinadores',state.sponsors.length,'contratos ativos')}${card('Loja oficial','Nível '+state.commercial.storeLevel,money(state.fans.merchandiseRevenue)+' em vendas')}</div><div class="card section-gap"><h2>Patrocínios</h2>${state.sponsors.map(s=>`<div class="list-item"><span>${s.name} · ${s.years} ano(s)</span><b>${money(s.value)}/temporada</b></div>`).join('')}</div>`;
}

function tacticsView(){
  root.innerHTML=`<div class="grid grid-2"><div class="card"><h2>Plano de jogo</h2><label>Formação<select data-setting="formation"><option ${state.tactics.formation==='4-2-3-1'?'selected':''}>4-2-3-1</option><option ${state.tactics.formation==='4-3-3'?'selected':''}>4-3-3</option><option ${state.tactics.formation==='3-5-2'?'selected':''}>3-5-2</option></select></label><label>Estilo<select data-setting="style"><option ${state.tactics.style==='equilibrado'?'selected':''}>equilibrado</option><option ${state.tactics.style==='ofensivo'?'selected':''}>ofensivo</option><option ${state.tactics.style==='defensivo'?'selected':''}>defensivo</option></select></label><p>Diretor responsável: <b>${state.departments.football.staff?.name||'Você'}</b></p></div><div class="pitch"><div class="pitch-title">${state.tactics.formation}</div>${my().squad.filter(p=>p.starter).map((p,i)=>`<span style="left:${12+(i%4)*25}%;top:${82-Math.floor(i/4)*28}%">${p.position}<small>${p.name.split(' ')[0]}</small></span>`).join('')}</div></div>`;
}

function leagueView(){
  root.innerHTML=`<div class="card"><div class="card-header"><h2>Liga Nacional</h2><button class="primary-button" data-action="simulate">Avançar semana</button></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Clube</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>PTS</th></tr></thead><tbody>${standings().map((t,i)=>`<tr class="${t.id===state.clubId?'user-row':''}"><td>${i+1}</td><td>${t.name}</td><td>${t.played}</td><td>${t.wins}</td><td>${t.draws}</td><td>${t.losses}</td><td>${t.gf-t.ga}</td><td><b>${t.points}</b></td></tr>`).join('')}</tbody></table></div></div>`;
}

function transfersView(){
  root.innerHTML=`<div class="grid grid-2">${state.market.map(p=>`<div class="card market-card" data-id="${p.id}"><div><h3>${p.name}</h3><p>${p.position} · ${p.age} anos · força ${p.rating} · potencial ${p.potential}</p></div><div><b>${money(p.price)}</b><button class="primary-button" data-action="buy">Contratar</button></div></div>`).join('')||'<div class="card">Mercado vazio.</div>'}</div>`;
}

function medicalView(){
  const injured=my().squad.filter(p=>p.injuredWeeks>0);
  root.innerHTML=`<div class="grid grid-3">${card('Lesionados',injured.length,'elenco principal')}${card('Centro médico','Nível '+state.facilities.medical.level,'reduz tempo de recuperação')}${card('Responsável',state.departments.medical.staff?.name||'Você',delegated('medical')?'gestão delegada':'gestão manual')}</div><div class="card section-gap"><h2>Atletas em tratamento</h2>${injured.map(p=>`<div class="list-item"><span>${p.name} · ${p.injuredWeeks} semana(s)</span><button class="small-button" data-action="heal" data-id="${p.id}">Tratamento intensivo</button></div>`).join('')||'<p>Não há atletas lesionados.</p>'}</div>`;
}

function facilitiesView(){
  root.innerHTML=`<div class="facility-grid">${Object.entries(state.facilities).map(([id,f])=>{const cost=Math.round(f.cost*(1+(f.level-1)*.65));return`<div class="card"><span class="eyebrow">Infraestrutura</span><h2>${f.name}</h2><p>Nível <b>${f.level}/${f.max}</b></p>${progress(f.level/f.max*100)}<button class="primary-button" data-action="upgrade" data-id="${id}" ${f.level>=f.max?'disabled':''}>${f.level>=f.max?'Nível máximo':'Melhorar por '+money(cost)}</button></div>`}).join('')}</div>`;
}

function financeView(){
  const monthlyPayroll=my().squad.reduce((s,p)=>s+p.salary,0)+Object.values(state.departments).reduce((s,d)=>s+(d.staff?.salary||0),0);
  root.innerHTML=`<div class="grid grid-4">${card('Saldo',money(state.balance),'caixa')}${card('Folha mensal',money(monthlyPayroll),'jogadores + funcionários')}${card('Receita de sócios',money(state.fans.membershipRevenue),'acumulada')}${card('Receita de jogos',money(state.fans.ticketRevenue+state.fans.merchandiseRevenue),'acumulada')}</div><div class="card section-gap"><h2>Livro-caixa</h2><div class="table-wrap"><table><thead><tr><th>Semana</th><th>Descrição</th><th>Tipo</th><th>Valor</th></tr></thead><tbody>${state.ledger.map(x=>`<tr><td>${x.week}</td><td>${x.description}</td><td><span class="status ${x.type==='entrada'?'good':'danger'}">${x.type}</span></td><td>${money(x.amount)}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function historyView(){
  root.innerHTML=`<div class="card"><h2>Resultados</h2>${state.history.map(h=>`<div class="list-item"><span>Rodada ${h.round} · semana ${h.week}</span><b>${h.text}</b></div>`).join('')||'<p>Nenhuma partida disputada.</p>'}</div>`;
}

render();
