(function(global){
  'use strict';
  const C=global.FMCore;
  const Match=global.FMMatch;
  const Systems=global.FMSystems;
  const MAIN_KEY='futmaster-save-v4';
  const KEY='futmaster-international-v04';
  const views={national:'Seleções',multiclub:'Grupo de clubes'};
  let activeView=null;

  function readMain(){try{const state=JSON.parse(localStorage.getItem(MAIN_KEY)||'null');if(!state)return null;if(Object.prototype.hasOwnProperty.call(state,'userTeam'))delete state.userTeam;Object.defineProperty(state,'userTeam',{enumerable:false,configurable:true,get(){return state.teams.find(team=>team.id===state.userTeamId);}});return state;}catch{return null;}}
  function writeMain(state){localStorage.setItem(MAIN_KEY,JSON.stringify(state));}
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null');}catch{return null;}}
  function save(data){localStorage.setItem(KEY,JSON.stringify(data));}
  function signature(state){return `${state.managerName}|${state.userTeamId}|${state.teams?.[0]?.squad?.[0]?.id||'new'}`;}

  const countries=[
    {id:'bra',name:'Brasil',short:'BRA',strength:88,reputation:96},{id:'arg',name:'Argentina',short:'ARG',strength:89,reputation:96},
    {id:'por',name:'Portugal',short:'POR',strength:86,reputation:91},{id:'ita',name:'Itália',short:'ITA',strength:85,reputation:94},
    {id:'esp',name:'Espanha',short:'ESP',strength:88,reputation:95},{id:'fra',name:'França',short:'FRA',strength:90,reputation:97},
    {id:'ale',name:'Alemanha',short:'ALE',strength:86,reputation:96},{id:'ing',name:'Inglaterra',short:'ING',strength:88,reputation:95},
    {id:'uru',name:'Uruguai',short:'URU',strength:82,reputation:87},{id:'col',name:'Colômbia',short:'COL',strength:80,reputation:82},
    {id:'cro',name:'Croácia',short:'CRO',strength:82,reputation:85},{id:'jap',name:'Japão',short:'JAP',strength:76,reputation:76}
  ];

  const acquisitionTemplates=[
    {id:'lisboa-atlas',name:'Lisboa Atlas',short:'LAT',city:'Lisboa',country:'Portugal',strength:72,reputation:67,price:24_000_000,budget:8_000_000,capacity:22000},
    {id:'coimbra-academico',name:'Coimbra Acadêmico',short:'COA',city:'Coimbra',country:'Portugal',strength:67,reputation:59,price:13_500_000,budget:5_000_000,capacity:15000},
    {id:'torino-nuovo',name:'Torino Nuovo',short:'TNV',city:'Turim',country:'Itália',strength:74,reputation:70,price:31_000_000,budget:10_000_000,capacity:26000},
    {id:'sevilla-union',name:'Sevilla Unión',short:'SEU',city:'Sevilha',country:'Espanha',strength:76,reputation:72,price:38_000_000,budget:12_000_000,capacity:29000},
    {id:'miami-athletic',name:'Miami Athletic',short:'MIA',city:'Miami',country:'Estados Unidos',strength:69,reputation:64,price:22_000_000,budget:9_000_000,capacity:21000},
    {id:'montevideo-central',name:'Montevideo Central',short:'MTC',city:'Montevidéu',country:'Uruguai',strength:71,reputation:68,price:17_000_000,budget:6_000_000,capacity:18000}
  ];

  function createNationalTeam(template,index){
    const team=C.createTeam({id:`nt-${template.id}`,name:template.name,short:template.short,city:template.name,strength:template.strength,budget:0,capacity:60000,reputation:template.reputation},700+index);
    team.squad.forEach(player=>{player.nationality=template.name;player.clubName='Clube internacional';player.wage=0;player.contractYears=99;});
    team.academy={};team.finances={balance:0,weeklyWage:0};return team;
  }

  function createData(state){
    const nationalTeams=countries.map(createNationalTeam);
    const availableJobs=nationalTeams.filter((_,index)=>index>=8).map(team=>({teamId:team.id,status:'Disponível',salary:Math.round((team.reputation||70)*1800),expectation:'Classificar para o torneio continental'}));
    return {
      version:1,signature:signature(state),lastSeason:state.season,lastWeek:state.week,
      national:{teams:nationalTeams,job:null,availableJobs,history:[],calendar:buildNationalCalendar(state.season,nationalTeams),tournament:null,managerReputation:52,selectionMode:'Automático'},
      group:{name:`${state.userTeam.name} Football Group`,owned:[],market:acquisitionTemplates,centralScouting:true,sharedAcademy:true,policy:'Sustentável',cashReserve:0,history:[]},
      notifications:[]
    };
  }

  function ensure(state){let data=load();if(!data||data.signature!==signature(state)||data.version!==1){data=createData(state);save(data);}return data;}
  function notify(data,category,text,state){data.notifications.unshift({id:C.uid('intl'),category,text,season:state.season,week:state.week});data.notifications=data.notifications.slice(0,120);}
  function buildNationalCalendar(season,teams){
    const fixtures=[];const shuffled=[...teams];
    [[3,'Amistoso'],[6,'Liga das Nações'],[9,'Eliminatórias']].forEach(([week,competition],round)=>{
      for(let i=0;i<shuffled.length;i+=2){const home=shuffled[(i+round)%shuffled.length],away=shuffled[(i+1+round)%shuffled.length];fixtures.push({id:`${season}-${week}-${i}`,season,week,competition,homeId:home.id,awayId:away.id,played:false,result:null});}
    });
    return fixtures;
  }
  function nationalById(data,id){return data.national.teams.find(team=>team.id===id);}

  function simulateNationalFixture(state,data,fixture){
    const home=nationalById(data,fixture.homeId),away=nationalById(data,fixture.awayId);if(!home||!away)return;
    const result=Match.simulateMatch(home,away,{season:state.season,week:fixture.week,pressure:fixture.competition!=='Amistoso'});
    result.competition=fixture.competition;result.season=state.season;result.week=fixture.week;result.international=true;
    fixture.played=true;fixture.result=result;data.national.history.unshift(result);
    const managed=data.national.job?.teamId;
    if(managed&&[home.id,away.id].includes(managed)){
      const userHome=home.id===managed;const gf=userHome?result.homeGoals:result.awayGoals,ga=userHome?result.awayGoals:result.homeGoals;
      data.national.managerReputation=C.clamp(data.national.managerReputation+(gf>ga?2:gf<ga?-1:0),20,99);
      notify(data,'Seleção',`${nationalById(data,managed).name} ${gf>ga?'venceu':gf===ga?'empatou':'perdeu'} por ${gf} a ${ga} em ${fixture.competition}.`,state);
    }
  }

  function processNationalWeeks(state,data,fromWeek,toWeek){
    for(let week=fromWeek;week<toWeek;week++)data.national.calendar.filter(item=>item.season===state.season&&item.week===week&&!item.played).forEach(fixture=>simulateNationalFixture(state,data,fixture));
  }

  function resetNationalSeason(state,data){
    data.national.calendar=buildNationalCalendar(state.season,data.national.teams);data.lastSeason=state.season;data.lastWeek=state.week;
    if(data.national.job&&C.chance(0.18)){const team=nationalById(data,data.national.job.teamId);notify(data,'Seleção',`${team.name} renovou a confiança no trabalho da comissão técnica.`,state);}
  }

  function createOwnedClub(template,index){
    const team=C.createTeam({...template,budget:template.budget},900+index);
    return {id:template.id,team,country:template.country,acquisitionPrice:template.price,manager:{name:C.pick(['João Ferreira','Marco Bellini','Luis Navarro','Pedro Almeida','Diego Costa']),quality:C.randomInt(58,82),salary:C.randomInt(18,65)*1000},autonomy:80,strategy:'Desenvolvimento',season:{played:0,wins:0,draws:0,losses:0,points:0},finance:{balance:template.budget,revenue:0,expenses:0},acquiredSeason:null};
  }

  function processOwnedClubs(state,data,weeks){
    for(let w=0;w<weeks;w++)data.group.owned.forEach(club=>{
      const strength=C.calculateTeamOverall(club.team)+club.manager.quality/18;
      const opponent=C.random(62,84);const roll=strength-opponent+C.gaussian(0,9);
      club.season.played++;if(roll>5){club.season.wins++;club.season.points+=3;}else if(roll>-4){club.season.draws++;club.season.points+=1;}else club.season.losses++;
      const weeklyRevenue=Math.round((club.team.reputation*18_000+C.random(120_000,380_000)));const wages=club.team.squad.reduce((sum,p)=>sum+p.wage,0)+club.manager.salary;
      club.finance.balance+=weeklyRevenue-wages;club.finance.revenue+=weeklyRevenue;club.finance.expenses+=wages;
      if(club.finance.balance<0&&club.autonomy>50){club.strategy='Venda de jogadores';const sale=[...club.team.squad].sort((a,b)=>b.value-a.value)[0];if(sale){club.finance.balance+=sale.value;club.team.squad=club.team.squad.filter(p=>p.id!==sale.id);}}
    });
  }

  function catchUp(){
    const state=readMain();if(!state)return;const data=ensure(state);
    if(data.lastSeason!==state.season){resetNationalSeason(state,data);data.group.owned.forEach(club=>club.season={played:0,wins:0,draws:0,losses:0,points:0});}
    const weeks=Math.max(0,state.week-data.lastWeek);if(weeks){processNationalWeeks(state,data,data.lastWeek,state.week);processOwnedClubs(state,data,weeks);data.lastWeek=state.week;data.lastSeason=state.season;save(data);}
  }

  function acceptNationalJob(state,data,teamId){
    const job=data.national.availableJobs.find(item=>item.teamId===teamId);if(!job)return;
    data.national.job={...job,acceptedSeason:state.season};data.national.availableJobs=data.national.availableJobs.filter(item=>item.teamId!==teamId);
    notify(data,'Carreira',`Você assumiu a seleção de ${nationalById(data,teamId).name} sem deixar o clube.`,state);
  }

  function resignNational(state,data){if(!data.national.job)return;const team=nationalById(data,data.national.job.teamId);data.national.availableJobs.push({...data.national.job,status:'Disponível'});data.national.job=null;notify(data,'Carreira',`Você deixou o comando da seleção de ${team.name}.`,state);}

  function acquireClub(state,data,id){
    const template=data.group.market.find(item=>item.id===id);if(!template)return;
    if(state.finance.balance<template.price)return alert('O clube principal não tem caixa suficiente para essa aquisição.');
    Systems.addCashFlow(state,'Despesa','Aquisição de clube',-template.price,`Compra de ${template.name}`);
    const owned=createOwnedClub(template,data.group.owned.length);owned.acquiredSeason=state.season;data.group.owned.push(owned);data.group.market=data.group.market.filter(item=>item.id!==id);
    notify(data,'Grupo',`${template.name} passou a integrar o ${data.group.name}.`,state);writeMain(state);
  }

  function sendLoanToOwned(state,data,clubId,playerId){
    const club=data.group.owned.find(item=>item.id===clubId);const index=state.userTeam.squad.findIndex(player=>String(player.id)===String(playerId));if(!club||index<0)return;
    const player=state.userTeam.squad[index];if(player.starter)return alert('Um titular não pode ser enviado automaticamente.');
    state.userTeam.squad.splice(index,1);player.multiClubLoan={from:state.userTeamId,to:club.id,season:state.season};club.team.squad.push(player);notify(data,'Grupo',`${player.name} foi emprestado ao ${club.team.name}.`,state);writeMain(state);
  }

  function recallLoans(state,data,clubId){
    const club=data.group.owned.find(item=>item.id===clubId);if(!club)return;
    const returning=club.team.squad.filter(player=>player.multiClubLoan?.from===state.userTeamId);club.team.squad=club.team.squad.filter(player=>!player.multiClubLoan);returning.forEach(player=>{delete player.multiClubLoan;state.userTeam.squad.push(player);});writeMain(state);notify(data,'Grupo',`${returning.length} jogador(es) retornaram do ${club.team.name}.`,state);
  }

  function addNavigation(){const nav=document.querySelector('.nav-list');if(!nav||nav.querySelector('[data-intl-view]'))return;const history=nav.querySelector('[data-view="history"]');Object.entries(views).forEach(([id,label])=>{const button=document.createElement('button');button.className='nav-item';button.dataset.intlView=id;button.textContent=label;nav.insertBefore(button,history||null);button.addEventListener('click',event=>{event.preventDefault();document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));button.classList.add('active');activeView=id;render(id);});});}
  function stat(label,value,detail){return `<div class="card stat-card"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`;}

  function render(view){const state=readMain();const root=document.querySelector('#app-view');if(!state||!root)return;const data=ensure(state);document.querySelector('#page-title').textContent=views[view];if(view==='national')renderNational(root,state,data);if(view==='multiclub')renderGroup(root,state,data);}

  function renderNational(root,state,data){
    const managed=data.national.job?nationalById(data,data.national.job.teamId):null;const upcoming=data.national.calendar.filter(item=>!item.played).sort((a,b)=>a.week-b.week).slice(0,8);
    root.innerHTML=`<div class="grid grid-4">${stat('Cargo atual',managed?managed.name:'Somente clube',managed?'Clube e seleção simultaneamente':'Aceite uma proposta')}${stat('Reputação internacional',data.national.managerReputation,'Afeta futuras propostas')}${stat('Jogos pela seleção',data.national.history.filter(match=>managed&&[match.homeId,match.awayId].includes(managed.id)).length,'Histórico local')}${stat('Modo da seleção',data.national.selectionMode,'Convocação e escalação')}</div>
    <div class="grid grid-2 section-gap"><div class="card"><div class="card-header"><div><h2>${managed?`Seleção de ${managed.name}`:'Vagas disponíveis'}</h2><p class="muted">Você pode controlar clube e seleção ao mesmo tempo.</p></div>${managed?'<button class="danger-button" data-intl-action="resign-national">Deixar seleção</button>':''}</div>${managed?`<p>Overall ${C.calculateTeamOverall(managed)} · moral ${managed.morale}% · treinador ${data.national.managerReputation}</p><button class="secondary-button" data-intl-action="auto-callup">Convocar melhores 23</button>`:data.national.availableJobs.map(job=>{const team=nationalById(data,job.teamId);return `<div class="list-item"><div><b>${team.name}</b><small>OVR ${C.calculateTeamOverall(team)} · expectativa: ${job.expectation}</small></div><button class="primary-button" data-intl-action="accept-national" data-id="${team.id}">Assumir</button></div>`;}).join('')}</div>
    <div class="card"><h2>Próximos jogos internacionais</h2>${upcoming.map(item=>`<div class="fixture"><span>${nationalById(data,item.homeId).short}</span><b>Semana ${item.week}</b><span>${nationalById(data,item.awayId).short}</span><small>${item.competition}</small></div>`).join('')||'<p class="muted">Calendário concluído.</p>'}</div></div>
    <div class="card section-gap"><h2>Resultados recentes</h2>${data.national.history.slice(0,12).map(match=>`<div class="list-item"><span>${match.competition} · S${match.week}</span><b>${match.homeShort} ${match.homeGoals} x ${match.awayGoals} ${match.awayShort}</b></div>`).join('')||'<p class="muted">Nenhum jogo ainda.</p>'}</div>`;
  }

  function renderGroup(root,state,data){
    const totalValue=data.group.owned.reduce((sum,club)=>sum+club.acquisitionPrice,0);const totalBalance=data.group.owned.reduce((sum,club)=>sum+club.finance.balance,0);
    root.innerHTML=`<div class="grid grid-4">${stat('Grupo',data.group.name,`${data.group.owned.length} clube(s) adquirido(s)`)}${stat('Investimento',C.money(totalValue),'Aquisições acumuladas')}${stat('Caixa das subsidiárias',C.money(totalBalance),'Não mistura automaticamente com o clube principal')}${stat('Política',data.group.policy,'Gestão estratégica automatizada')}</div>
    <div class="card section-gap"><h2>Clubes do grupo</h2>${data.group.owned.length?`<div class="grid grid-2">${data.group.owned.map(club=>`<div class="department-card"><div class="card-header"><div><h3>${club.team.name}</h3><small>${club.country} · ${club.team.city}</small></div><div class="club-badge mini">${club.team.short}</div></div><p>Manager: <b>${club.manager.name}</b> (${club.manager.quality})</p><p>Temporada: ${club.season.wins}V ${club.season.draws}E ${club.season.losses}D · ${club.season.points} pts</p><p>Caixa: <b>${C.money(club.finance.balance)}</b> · OVR ${C.calculateTeamOverall(club.team)}</p><label>Estratégia<select data-intl-setting="club-strategy" data-id="${club.id}"><option ${club.strategy==='Desenvolvimento'?'selected':''}>Desenvolvimento</option><option ${club.strategy==='Resultados'?'selected':''}>Resultados</option><option ${club.strategy==='Venda de jogadores'?'selected':''}>Venda de jogadores</option><option ${club.strategy==='Equilibrado'?'selected':''}>Equilibrado</option></select></label><div class="button-row"><button class="secondary-button" data-intl-action="loan-player" data-id="${club.id}">Enviar jovem</button><button class="secondary-button" data-intl-action="recall-loans" data-id="${club.id}">Recolher emprestados</button></div></div>`).join('')}</div>`:'<p class="muted">Nenhum clube adquirido.</p>'}</div>
    <div class="card section-gap"><h2>Oportunidades de aquisição</h2><div class="grid grid-3">${data.group.market.map(club=>`<div class="market-card"><div><b>${club.name}</b><small>${club.city}, ${club.country} · força ${club.strength}</small></div><div><b>${C.money(club.price)}</b><button class="primary-button" data-intl-action="acquire-club" data-id="${club.id}">Comprar clube</button></div></div>`).join('')||'<p class="muted">Todas as oportunidades foram adquiridas.</p>'}</div></div>
    <div class="card section-gap"><h2>Como funciona</h2><p>Os clubes adquiridos possuem técnico, elenco, caixa e resultados próprios. O grupo pode compartilhar scouting e emprestar atletas, enquanto cada equipe continua com gestão automática e identidade independente.</p></div>`;
  }

  function autoCallup(data){if(!data.national.job)return;const team=nationalById(data,data.national.job.teamId);team.squad=[...team.squad].sort((a,b)=>b.overall-a.overall).slice(0,23);}
  function sendYoungest(state,data,clubId){const candidates=state.userTeam.squad.filter(player=>!player.starter&&player.age<=23&&!player.injuredWeeks).sort((a,b)=>b.potential-a.potential);if(!candidates.length)return alert('Não há jovem elegível fora do time titular.');sendLoanToOwned(state,data,clubId,candidates[0].id);}

  function bind(){
    document.addEventListener('click',event=>{const button=event.target.closest('[data-intl-action]');if(!button)return;event.preventDefault();const state=readMain();if(!state)return;const data=ensure(state);const action=button.dataset.intlAction;
      if(action==='accept-national')acceptNationalJob(state,data,button.dataset.id);
      if(action==='resign-national')resignNational(state,data);
      if(action==='auto-callup')autoCallup(data);
      if(action==='acquire-club')acquireClub(state,data,button.dataset.id);
      if(action==='loan-player')sendYoungest(state,data,button.dataset.id);
      if(action==='recall-loans')recallLoans(state,data,button.dataset.id);
      save(data);if(activeView)render(activeView);
    });
    document.addEventListener('change',event=>{const setting=event.target.dataset.intlSetting;if(!setting)return;const state=readMain();const data=ensure(state);if(setting==='club-strategy'){const club=data.group.owned.find(item=>item.id===event.target.dataset.id);if(club)club.strategy=event.target.value;}save(data);});
    document.querySelector('#new-game-form')?.addEventListener('submit',()=>setTimeout(()=>{const state=readMain();if(state)save(createData(state));},130));
  }

  function init(){addNavigation();catchUp();bind();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
