(function (global) {
  'use strict';

  const C = global.FMCore;
  const Match = global.FMMatch;
  const Systems = global.FMSystems;
  const MAIN_KEY = 'futmaster-save-v4';
  const EXT_KEY = 'futmaster-local-career-v04';
  const EXT_VIEWS = {
    competitions: 'Competições',
    negotiations: 'Contratos e empréstimos',
    training: 'Treino e logística',
    governance: 'Conselho e gestão',
    editor: 'Editor local'
  };

  let activeView = null;

  function readMain() {
    try {
      const state = JSON.parse(localStorage.getItem(MAIN_KEY) || 'null');
      if (!state || state.version !== 4) return null;
      return attachUserTeam(state);
    } catch (error) {
      console.warn('Save principal inválido', error);
      return null;
    }
  }

  function writeMain(state) {
    if (!state) return;
    localStorage.setItem(MAIN_KEY, JSON.stringify(state));
  }

  function attachUserTeam(state) {
    if (!state) return state;
    if (Object.prototype.hasOwnProperty.call(state, 'userTeam')) delete state.userTeam;
    Object.defineProperty(state, 'userTeam', {
      configurable: true,
      enumerable: false,
      get() { return state.teams.find(team => team.id === state.userTeamId); }
    });
    return state;
  }

  function signatureFor(state) {
    return `${state.managerName}|${state.userTeamId}|${state.teams?.[0]?.squad?.[0]?.id || 'new'}`;
  }

  function loadExtension() {
    try { return JSON.parse(localStorage.getItem(EXT_KEY) || 'null'); }
    catch { return null; }
  }

  function saveExtension(extension) {
    localStorage.setItem(EXT_KEY, JSON.stringify(extension));
  }

  function createAgent(index) {
    const first = ['Carlos','Eduardo','Marcelo','Bruno','André','Paulo','Renato','Fábio'];
    const last = ['Moura','Ribeiro','Tavares','Oliveira','Pires','Freitas','Nogueira','Castro'];
    return {
      id: `agent-${index}`,
      name: `${first[index % first.length]} ${last[(index * 3) % last.length]}`,
      influence: 42 + (index * 11) % 49,
      feePct: 3 + (index % 8),
      relationship: 50
    };
  }

  function createDivisionB() {
    const names = [
      ['Aurora FC','AUR',68],['Vale Real','VAR',67],['Ferroviário Sul','FES',66],['Atlético do Norte','ATN',65],
      ['União Serrana','USR',64],['Estrela Azul','EAZ',63],['Operário Central','OCE',62],['Nacional do Vale','NDV',61]
    ];
    return names.map(([name, short, strength], index) => ({
      id:`b-${index}`, name, short, strength, played:0, wins:0, draws:0, losses:0, gf:0, ga:0, points:0
    }));
  }

  function buildCup(state, season) {
    const ordered = [...state.teams].sort((a,b) => b.reputation - a.reputation);
    return {
      id:'national-cup', name:'Copa Nacional', season, champion:null, runnerUp:null,
      rounds:[
        {id:'pre',name:'Preliminar',week:2,fixtures:[[ordered[2].id,ordered[5].id],[ordered[3].id,ordered[4].id]],results:[]},
        {id:'semi',name:'Semifinais',week:5,fixtures:[],results:[]},
        {id:'final',name:'Final',week:8,fixtures:[],results:[]}
      ],
      seeds:[ordered[0].id,ordered[1].id]
    };
  }

  function buildContinental(state, season, qualifiedIds) {
    if (season <= 2026 || qualifiedIds.length < 4) return null;
    return {
      id:'continental-cup',name:'Copa Continental',season,champion:null,runnerUp:null,
      rounds:[
        {id:'semi',name:'Semifinais',week:4,fixtures:[[qualifiedIds[0],qualifiedIds[3]],[qualifiedIds[1],qualifiedIds[2]]],results:[]},
        {id:'final',name:'Final',week:9,fixtures:[],results:[]}
      ]
    };
  }

  function createExtension(state) {
    const extension = {
      version:1,
      signature:signatureFor(state),
      lastProcessedSeason:state.season,
      lastProcessedWeek:state.week,
      userDivision:1,
      competitions:{
        cup:buildCup(state,state.season),
        continental:null,
        supercup:null,
        divisionB:{season:state.season,teams:createDivisionB(),round:0,fixtures:[]}
      },
      qualifiedContinental:[],
      previousChampions:{league:null,cup:null},
      training:{intensity:'Moderada',focus:'Equilibrado',restDay:'Segunda',individual:true,setPieces:true},
      logistics:{travel:'Avião comercial',hotel:'Confortável',recovery:'Padrão',security:'Normal'},
      registration:{maxPlayers:25,minHomegrown:4,registered:[]},
      contracts:{agents:Array.from({length:8},(_,i)=>createAgent(i)),loans:[],negotiations:[],agentRelations:{}},
      governance:{model:'Associativo',president:'Roberto Andrade',presidentProfile:'Equilibrado',electionYear:2030,boardApproval:68,investor:null,sharesSold:0,debtLimit:0.45},
      automation:{football:true,academy:true,scouting:true,medical:true,commercial:true,supporters:true,stadium:true,finance:true},
      editor:{lastImport:null},
      notifications:[],
      seasonArchive:[]
    };
    extension.competitions.divisionB.fixtures = C.roundRobin(extension.competitions.divisionB.teams.map(team=>team.id));
    ensurePlayerMetadata(state,extension);
    autoRegister(state,extension);
    return extension;
  }

  function ensureExtension(state, force = false) {
    if (!state) return null;
    let extension = loadExtension();
    if (force || !extension || extension.version !== 1 || extension.signature !== signatureFor(state)) {
      extension = createExtension(state);
      saveExtension(extension);
    } else {
      ensurePlayerMetadata(state,extension);
    }
    return extension;
  }

  function ensurePlayerMetadata(state, extension) {
    const players = [...state.teams.flatMap(team=>team.squad), ...(state.market || []), ...Object.values(state.userTeam.academy || {}).flat()];
    players.forEach((player,index) => {
      if (!player.agentId) player.agentId = extension.contracts.agents[index % extension.contracts.agents.length].id;
      if (!player.contractDetails) {
        player.contractDetails = {
          appearanceBonus:Math.round(player.wage * 0.08 / 100) * 100,
          goalBonus:Math.round(player.wage * 0.12 / 100) * 100,
          signingBonus:player.wage * 8,
          releaseClause:Math.round(player.value * (1.6 + (index%5)*0.2) / 10_000) * 10_000,
          sellOnPct:index % 4 === 0 ? 10 : 0,
          imageRights:Math.round(player.wage * 0.05)
        };
      }
      if (!extension.contracts.agentRelations[player.agentId]) extension.contracts.agentRelations[player.agentId] = 50;
    });
  }

  function addNotification(extension, category, text, season, week) {
    extension.notifications.unshift({id:C.uid('ext-news'),category,text,season,week});
    extension.notifications = extension.notifications.slice(0,160);
  }

  function teamById(state,id) { return state.teams.find(team=>team.id===id); }

  function snapshotLeague(team) {
    return {played:team.played,wins:team.wins,draws:team.draws,losses:team.losses,gf:team.gf,ga:team.ga,points:team.points,formSequence:[...(team.formSequence||[])]};
  }

  function restoreLeague(team,snapshot) { Object.assign(team,snapshot,{formSequence:snapshot.formSequence}); }

  function simulateNonLeagueMatch(state, extension, homeId, awayId, competition, roundName, week) {
    const home = teamById(state,homeId);
    const away = teamById(state,awayId);
    if (!home || !away) return null;
    const homeSnapshot = snapshotLeague(home);
    const awaySnapshot = snapshotLeague(away);
    const result = Match.simulateMatch(home,away,{season:state.season,week,pressure:true});
    result.season=state.season; result.week=week; result.roundName=roundName; result.competition=competition;
    Match.applyMatchResult(result,home,away);
    restoreLeague(home,homeSnapshot); restoreLeague(away,awaySnapshot);
    let winnerId;
    if (result.homeGoals === result.awayGoals) {
      const homePower=C.calculateTeamOverall(home)+C.gaussian(0,5);
      const awayPower=C.calculateTeamOverall(away)+C.gaussian(0,5);
      winnerId=homePower>=awayPower?home.id:away.id;
      result.penalties={winnerId,home:C.randomInt(3,6),away:C.randomInt(2,5)};
      if ((winnerId===home.id && result.penalties.home<=result.penalties.away)||(winnerId===away.id&&result.penalties.away<=result.penalties.home)) {
        if (winnerId===home.id) result.penalties.home=result.penalties.away+1; else result.penalties.away=result.penalties.home+1;
      }
    } else winnerId=result.homeGoals>result.awayGoals?home.id:away.id;
    result.winnerId=winnerId;
    state.matchHistory.unshift(result);
    if (home.id===state.userTeamId && Systems.processTicketing) Systems.processTicketing(state,home,1.22);
    if ([home.id,away.id].includes(state.userTeamId)) {
      const won=winnerId===state.userTeamId;
      state.userTeam.morale=C.clamp(state.userTeam.morale+(won?3:-2),20,100);
      addNotification(extension,'Competição',`${state.userTeam.name} ${won?'avançou':'foi eliminado'} na ${competition} (${home.short} ${result.homeGoals} x ${result.awayGoals} ${away.short}).`,state.season,week);
    }
    return result;
  }

  function processCup(state, extension, week) {
    const cup=extension.competitions.cup;
    if (!cup || cup.season!==state.season || cup.champion) return;
    const round=cup.rounds.find(item=>item.week===week);
    if (!round || round.results.length) return;
    round.results=round.fixtures.map(([home,away])=>simulateNonLeagueMatch(state,extension,home,away,cup.name,round.name,week)).filter(Boolean);
    const winners=round.results.map(result=>result.winnerId);
    if (round.id==='pre') cup.rounds.find(item=>item.id==='semi').fixtures=[[cup.seeds[0],winners[1]],[cup.seeds[1],winners[0]]];
    if (round.id==='semi') cup.rounds.find(item=>item.id==='final').fixtures=[[winners[0],winners[1]]];
    if (round.id==='final') {
      cup.champion=winners[0];
      cup.runnerUp=round.results[0].homeId===winners[0]?round.results[0].awayId:round.results[0].homeId;
      extension.previousChampions.cup=cup.champion;
      const champion=teamById(state,cup.champion);
      addNotification(extension,'Título',`${champion?.name||'Um clube'} conquistou a Copa Nacional.`,state.season,week);
      if (cup.champion===state.userTeamId) {
        state.records.titles=(state.records.titles||0)+1;
        Systems.addCashFlow(state,'Receita','Premiação',2_800_000,'Título da Copa Nacional');
      }
    }
  }

  function processContinental(state,extension,week) {
    const cup=extension.competitions.continental;
    if (!cup || cup.season!==state.season || cup.champion) return;
    const round=cup.rounds.find(item=>item.week===week);
    if (!round || round.results.length) return;
    round.results=round.fixtures.map(([home,away])=>simulateNonLeagueMatch(state,extension,home,away,cup.name,round.name,week)).filter(Boolean);
    const winners=round.results.map(result=>result.winnerId);
    if (round.id==='semi') cup.rounds.find(item=>item.id==='final').fixtures=[[winners[0],winners[1]]];
    if (round.id==='final') {
      cup.champion=winners[0]; cup.runnerUp=round.results[0].homeId===winners[0]?round.results[0].awayId:round.results[0].homeId;
      if (cup.champion===state.userTeamId) Systems.addCashFlow(state,'Receita','Premiação',5_500_000,'Título continental');
      addNotification(extension,'Continental',`${teamById(state,cup.champion)?.name||'Um clube'} venceu a Copa Continental.`,state.season,week);
    }
  }

  function processSupercup(state,extension,week) {
    const cup=extension.competitions.supercup;
    if (!cup || cup.season!==state.season || cup.result || cup.week!==week) return;
    cup.result=simulateNonLeagueMatch(state,extension,cup.homeId,cup.awayId,'Supercopa','Final',week);
    cup.champion=cup.result?.winnerId||null;
    if (cup.champion===state.userTeamId) Systems.addCashFlow(state,'Receita','Premiação',900_000,'Título da Supercopa');
  }

  function simulateDivisionB(extension) {
    const division=extension.competitions.divisionB;
    if (!division || division.round>=division.fixtures.length) return;
    const byId=id=>division.teams.find(team=>team.id===id);
    division.fixtures[division.round].forEach(fixture=>{
      const home=byId(fixture.home),away=byId(fixture.away);
      const homePower=home.strength+3+C.gaussian(0,8),awayPower=away.strength+C.gaussian(0,8);
      const hg=Math.max(0,Math.round(C.random(0,2.4)+(homePower-awayPower)/18));
      const ag=Math.max(0,Math.round(C.random(0,2.1)+(awayPower-homePower)/20));
      home.played++;away.played++;home.gf+=hg;home.ga+=ag;away.gf+=ag;away.ga+=hg;
      if(hg>ag){home.wins++;away.losses++;home.points+=3;}else if(ag>hg){away.wins++;home.losses++;away.points+=3;}else{home.draws++;away.draws++;home.points++;away.points++;}
    });
    division.round++;
  }

  function applyTrainingPlan(state,extension,processedWeek) {
    const plan=extension.training;
    const intensityFactor={Leve:0.55,Moderada:1,Alta:1.45,Extrema:1.8}[plan.intensity]||1;
    const focusMap={
      Equilibrado:['passe','decisao','resistencia'],Ataque:['finalizacao','drible','frieza'],Defesa:['marcacao','desarme','posicionamento'],
      Físico:['velocidade','forca','resistencia'],Posse:['passe','dominio','visao'],BolaParada:['bolaParada','cruzamento','cabecalho']
    };
    const attrs=focusMap[plan.focus]||focusMap.Equilibrado;
    state.userTeam.squad.forEach(player=>{
      const growthChance=(player.age<=23?0.12:player.age<=29?0.05:0.018)*intensityFactor*(1+state.facilities.training.level*0.06);
      if(C.chance(growthChance)) {
        const attr=C.pick(attrs); player.attributes[attr]=C.clamp((player.attributes[attr]||50)+1,20,99); player.overall=C.calculateOverall(player);
      }
      const fatigue=Math.round(2.5*intensityFactor);
      player.fitness=C.clamp(player.fitness-fatigue,25,100);
      player.sharpness=C.clamp(player.sharpness+Math.round(3*intensityFactor),20,100);
      if(C.chance((player.injuryRisk/1000)*intensityFactor) && player.injuredWeeks<=0) {
        player.injuredWeeks=C.randomInt(1,3);
        addNotification(extension,'Treino',`${player.name} sofreu uma lesão durante a semana de treinos.`,state.season,processedWeek);
      }
    });
  }

  function processLogistics(state,extension,processedWeek) {
    const match=state.matchHistory.find(item=>item.season===state.season&&item.week===processedWeek&&[item.homeId,item.awayId].includes(state.userTeamId));
    if(!match||match.homeId===state.userTeamId)return;
    const travelCosts={'Ônibus':45_000,'Avião comercial':145_000,'Voo fretado':390_000};
    const hotelCosts={'Econômico':55_000,'Confortável':130_000,'Luxo':280_000};
    const cost=(travelCosts[extension.logistics.travel]||145_000)+(hotelCosts[extension.logistics.hotel]||130_000);
    Systems.addCashFlow(state,'Despesa','Logística',-cost,`${extension.logistics.travel} e hotel ${extension.logistics.hotel.toLowerCase()}`);
    const recovery=extension.logistics.travel==='Voo fretado'?3:extension.logistics.travel==='Avião comercial'?1:-2;
    const hotel=extension.logistics.hotel==='Luxo'?2:extension.logistics.hotel==='Econômico'?-1:1;
    state.userTeam.squad.forEach(player=>player.fitness=C.clamp(player.fitness+recovery+hotel,20,100));
  }

  function processLoansWeekly(state,extension) {
    extension.contracts.loans.filter(loan=>loan.active&&loan.direction==='in').forEach(loan=>{
      const player=state.userTeam.squad.find(item=>item.id===loan.playerId);
      if(player) Systems.addCashFlow(state,'Despesa','Empréstimo',-Math.round(player.wage*loan.wageShare),`Parte salarial de ${player.name}`);
    });
    extension.contracts.loans.filter(loan=>loan.active&&loan.direction==='out').forEach(loan=>{
      Systems.addCashFlow(state,'Receita','Empréstimo',loan.weeklyIncome,`Receita de empréstimo de ${loan.playerName}`);
    });
  }

  function isDelegated(state,id) {
    const department=state.departments?.[id];
    return state.automation?.mode==='full'||Boolean(department?.delegated&&department?.staff);
  }

  function runExtendedAutomation(state,extension,processedWeek) {
    if(isDelegated(state,'football')) {
      autoRegister(state,extension);
      const expiring=state.userTeam.squad.filter(player=>player.contractYears<=1&&!player.onLoan).sort((a,b)=>b.overall-a.overall).slice(0,2);
      expiring.forEach(player=>autoRenew(state,extension,player));
      const surplus=state.userTeam.squad.filter(player=>!player.starter&&player.age<25&&player.overall<C.calculateTeamOverall(state.userTeam)-7&&!player.onLoan);
      if(surplus.length&&C.chance(0.22)) loanOut(state,extension,surplus[0].id,true);
    }
    if(isDelegated(state,'academy')) {
      Object.values(state.userTeam.academy).flat().forEach(player=>{player.developmentFocus=player.position==='ATA'?'Ataque':player.position==='GOL'?'Goleiro':'Equilibrado';});
    }
    if(isDelegated(state,'scouting')&&processedWeek%2===0) {
      const level=C.calculateTeamOverall(state.userTeam)+C.randomInt(-8,5);
      const target=C.createPlayer(state.season+processedWeek,processedWeek,{clubLevel:level,nationality:C.pick(['Brasil','Argentina','Uruguai','Portugal','Colômbia'])});
      target.askingPrice=Math.round(target.value*C.random(0.9,1.25)/10_000)*10_000;target.scoutKnowledge=C.randomInt(65,95);target.clubName='Clube observado';
      state.market=[target,...state.market].slice(0,32);ensurePlayerMetadata(state,extension);
      addNotification(extension,'Scouting',`O departamento adicionou ${target.name} à lista de observação.`,state.season,processedWeek);
    }
    if(isDelegated(state,'medical')) {
      const injured=state.userTeam.squad.filter(player=>player.injuredWeeks>0).length;
      if(injured>=4&&['Alta','Extrema'].includes(extension.training.intensity)) extension.training.intensity='Moderada';
    }
    if(isDelegated(state,'supporters')&&state.fans?.satisfaction<55) {
      state.fans.membershipPlans.forEach(plan=>plan.price=Math.max(15,Math.round(plan.price*0.98)));
    }
    if(isDelegated(state,'stadium')) {
      const occupancy=state.stadium.lastAttendance/Math.max(1,state.stadium.capacity);
      state.stadium.sectors.forEach(sector=>sector.price=C.clamp(Math.round(sector.price*(occupancy>0.9?1.03:occupancy<0.55?0.97:1)),10,1500));
    }
    if(isDelegated(state,'finance')) {
      state.finance.transferBudget=Math.max(0,Math.round(state.finance.balance*(state.governanceRisk?0.08:0.16)));
      if(state.finance.balance<0) state.userTeam.squad.filter(player=>!player.starter).sort((a,b)=>b.value-a.value).slice(0,2).forEach(player=>player.transferListed=true);
    }
    if(isDelegated(state,'commercial')&&C.chance(0.15)) {
      state.commercial.brandValue=C.clamp(state.commercial.brandValue+1,0,100);
      state.commercial.digitalReach=Math.round(state.commercial.digitalReach*1.01);
    }
  }

  function processExtensionWeek(state,extension,processedWeek) {
    applyTrainingPlan(state,extension,processedWeek);
    processLoansWeekly(state,extension);
    runExtendedAutomation(state,extension,processedWeek);
    processCup(state,extension,processedWeek);
    processContinental(state,extension,processedWeek);
    processSupercup(state,extension,processedWeek);
    simulateDivisionB(extension);
    processLogistics(state,extension,processedWeek);
    extension.lastProcessedSeason=state.season;
    extension.lastProcessedWeek=processedWeek+1;
  }

  function processSeasonTransition(before,state,extension) {
    const previousTable=[...before.teams].sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga)||b.gf-a.gf);
    extension.previousChampions.league=previousTable[0]?.id||null;
    extension.qualifiedContinental=previousTable.slice(0,4).map(team=>team.id);
    extension.seasonArchive.unshift({season:before.season,leagueChampion:extension.previousChampions.league,cupChampion:extension.competitions.cup?.champion||null,table:previousTable.map(team=>({id:team.id,name:team.name,points:team.points}))});
    extension.seasonArchive=extension.seasonArchive.slice(0,20);
    settleLoans(state,extension);
    extension.competitions.cup=buildCup(state,state.season);
    extension.competitions.continental=buildContinental(state,state.season,extension.qualifiedContinental);
    if(extension.previousChampions.league&&extension.previousChampions.cup) extension.competitions.supercup={season:state.season,week:1,homeId:extension.previousChampions.league,awayId:extension.previousChampions.cup,result:null,champion:null};
    extension.competitions.divisionB={season:state.season,teams:createDivisionB(),round:0,fixtures:[]};
    extension.competitions.divisionB.fixtures=C.roundRobin(extension.competitions.divisionB.teams.map(team=>team.id));
    extension.lastProcessedSeason=state.season;extension.lastProcessedWeek=state.week;
    ensurePlayerMetadata(state,extension);autoRegister(state,extension);
    if(state.season>=extension.governance.electionYear&&extension.governance.model==='Associativo') {
      extension.governance.president=C.pick(['Roberto Andrade','Cláudia Menezes','Paulo Azevedo','Marina Duarte']);
      extension.governance.presidentProfile=C.pick(['Conservador','Equilibrado','Ambicioso']);
      extension.governance.electionYear=state.season+4;
      addNotification(extension,'Política',`${extension.governance.president} venceu a eleição presidencial do clube.`,state.season,state.week);
    }
  }

  function settleLoans(state,extension) {
    extension.contracts.loans.forEach(loan=>{
      if(!loan.active)return;
      if(loan.direction==='in') state.userTeam.squad=state.userTeam.squad.filter(player=>player.id!==loan.playerId);
      if(loan.direction==='out'&&loan.player) {loan.player.onLoan=false;state.userTeam.squad.push(loan.player);}
      loan.active=false;
    });
  }

  function transferWindowOpen(state) {
    const total=state.fixtures?.length||10;
    return state.week<=3||state.week>=Math.max(7,total-2)&&state.week<=total+1;
  }

  function autoRegister(state,extension) {
    extension.registration.registered=[...state.userTeam.squad]
      .filter(player=>!player.onLoan)
      .sort((a,b)=>b.overall-a.overall)
      .slice(0,extension.registration.maxPlayers)
      .map(player=>player.id);
  }

  function profileOffer(player,profile) {
    const multiplier={Conservadora:1.03,Justa:1.14,Generosa:1.30}[profile]||1.14;
    return {
      years:profile==='Generosa'?4:profile==='Conservadora'?2:3,
      wage:Math.round(player.wage*multiplier/100)*100,
      signingBonus:Math.round(player.wage*(profile==='Generosa'?16:profile==='Conservadora'?6:10)/1000)*1000,
      role:profile==='Generosa'?'Titular':player.promisedRole,
      releaseClause:Math.round(player.value*(profile==='Generosa'?2.4:profile==='Conservadora'?1.4:1.8)/10_000)*10_000
    };
  }

  function negotiateContract(state,extension,playerId,profile,automatic=false) {
    const player=state.userTeam.squad.find(item=>String(item.id)===String(playerId));
    if(!player)return false;
    const offer=profileOffer(player,profile);
    const agent=extension.contracts.agents.find(item=>item.id===player.agentId)||extension.contracts.agents[0];
    const relation=extension.contracts.agentRelations[agent.id]||50;
    const salaryGain=(offer.wage/player.wage-1)*100;
    const acceptance=C.clamp(0.36+salaryGain/75+player.happiness/250+relation/400-agent.influence/600+(profile==='Generosa'?0.18:0),0.08,0.96);
    const accepted=C.chance(acceptance);
    extension.contracts.negotiations.unshift({id:C.uid('neg'),playerId:player.id,playerName:player.name,profile,offer,accepted,season:state.season,week:state.week,agent:agent.name});
    if(accepted) {
      const agentFee=Math.round(offer.signingBonus*agent.feePct/100);
      const total=offer.signingBonus+agentFee;
      if(state.finance.balance<total){if(!automatic)alert('O jogador aceitou, mas o clube não tem caixa para luvas e comissão.');return false;}
      Systems.addCashFlow(state,'Despesa','Contrato',-total,`Renovação de ${player.name} e comissão de ${agent.name}`);
      player.contractYears=offer.years;player.wage=offer.wage;player.promisedRole=offer.role;player.contractDetails.releaseClause=offer.releaseClause;player.happiness=C.clamp(player.happiness+8,0,100);
      extension.contracts.agentRelations[agent.id]=C.clamp(relation+5,0,100);
      addNotification(extension,'Contrato',`${player.name} renovou por ${offer.years} anos.`,state.season,state.week);
    } else {
      extension.contracts.agentRelations[agent.id]=C.clamp(relation-3,0,100);
      if(!automatic)addNotification(extension,'Contrato',`${player.name} recusou a proposta ${profile.toLowerCase()}.`,state.season,state.week);
    }
    return accepted;
  }

  function autoRenew(state,extension,player) {
    if(player.contractYears>1||state.finance.balance<player.wage*12)return;
    negotiateContract(state,extension,player.id,'Justa',true);
  }

  function loanIn(state,extension,playerId) {
    if(!transferWindowOpen(state))return alert('A janela de transferências está fechada.');
    const player=state.market.find(item=>String(item.id)===String(playerId));
    if(!player)return;
    const fee=Math.round(player.value*0.04/10_000)*10_000;
    if(state.finance.balance<fee)return alert('Caixa insuficiente para a taxa de empréstimo.');
    state.market=state.market.filter(item=>item.id!==player.id);player.onLoan=true;player.loanParent=player.clubName||'Clube de origem';player.contractYears=Math.max(1,player.contractYears);state.userTeam.squad.push(player);
    extension.contracts.loans.push({id:C.uid('loan'),direction:'in',playerId:player.id,playerName:player.name,parentClub:player.loanParent,wageShare:0.6,fee,active:true,endSeason:state.season});
    Systems.addCashFlow(state,'Despesa','Empréstimo',-fee,`Taxa de empréstimo de ${player.name}`);
  }

  function loanOut(state,extension,playerId,automatic=false) {
    if(!transferWindowOpen(state)&&!automatic)return alert('A janela de transferências está fechada.');
    const index=state.userTeam.squad.findIndex(item=>String(item.id)===String(playerId));
    if(index<0)return;
    const player=state.userTeam.squad[index];
    if(player.starter&&!automatic)return alert('Retire o atleta da condição de titular antes de emprestá-lo.');
    state.userTeam.squad.splice(index,1);player.onLoan=true;
    extension.contracts.loans.push({id:C.uid('loan'),direction:'out',playerId:player.id,playerName:player.name,destination:C.pick(['Aurora FC','Vale Real','Ferroviário Sul','Clube do Exterior']),weeklyIncome:Math.round(player.wage*0.55),player,active:true,endSeason:state.season});
  }

  function acceptInvestor(state,extension,profile) {
    if(extension.governance.investor)return alert('O clube já possui um investidor ativo.');
    const offers={Local:{name:'Grupo Paraná',investment:18_000_000,shares:20,demands:'Equilíbrio financeiro'},Nacional:{name:'Brasil Sports',investment:42_000_000,shares:35,demands:'Classificação continental'},Global:{name:'Atlantic Football Capital',investment:85_000_000,shares:49,demands:'Título em três temporadas'}};
    const offer=offers[profile];
    extension.governance.investor={...offer,profile,acceptedSeason:state.season};extension.governance.model='SAF';extension.governance.sharesSold=offer.shares;
    Systems.addCashFlow(state,'Receita','Investimento',offer.investment,`Aporte de ${offer.name}`);
    state.board.confidence=C.clamp(state.board.confidence+5,0,100);
  }

  function applyEditor(state,extension,form) {
    const name=String(form.get('clubName')||'').trim();const short=String(form.get('clubShort')||'').trim().toUpperCase().slice(0,4);
    const capacity=Number(form.get('capacity'));const balance=Number(form.get('balance'));
    if(name)state.userTeam.name=name;if(short)state.userTeam.short=short;
    if(Number.isFinite(capacity)&&capacity>=3000){const ratio=capacity/state.stadium.capacity;state.stadium.capacity=Math.round(capacity);state.stadium.sectors.forEach(sector=>sector.capacity=Math.max(100,Math.round(sector.capacity*ratio)));}
    if(Number.isFinite(balance))state.finance.balance=balance;
    extension.editor.lastImport=new Date().toISOString();
  }

  function syncAfterMainAction(before,action) {
    setTimeout(()=>{
      const state=readMain();if(!state)return;
      const extension=ensureExtension(before||state);
      if(action==='next-season'&&before&&state.season!==before.season) processSeasonTransition(before,state,extension);
      else {
        const start=before?.week||extension.lastProcessedWeek||state.week;
        const count=Math.max(0,state.week-start);
        for(let offset=0;offset<count;offset++)processExtensionWeek(state,extension,start+offset);
      }
      extension.signature=signatureFor(state);extension.lastProcessedSeason=state.season;extension.lastProcessedWeek=state.week;
      writeMain(state);saveExtension(extension);location.reload();
    },90);
  }

  function addNavigation() {
    const nav=document.querySelector('.nav-list');if(!nav||nav.querySelector('[data-ext-view]'))return;
    const history=nav.querySelector('[data-view="history"]');
    Object.entries(EXT_VIEWS).forEach(([id,label])=>{
      const button=document.createElement('button');button.className='nav-item';button.dataset.extView=id;button.textContent=label;
      nav.insertBefore(button,history||null);
      button.addEventListener('click',event=>{event.preventDefault();document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));button.classList.add('active');activeView=id;renderExtension(id);});
    });
  }

  function money(value){return C.money(Number(value)||0);}
  function standingsB(extension){return [...extension.competitions.divisionB.teams].sort((a,b)=>b.points-a.points||(b.gf-b.ga)-(a.gf-a.ga));}
  function teamName(state,id){return teamById(state,id)?.name||id||'—';}

  function renderExtension(view) {
    const state=readMain();const root=document.querySelector('#app-view');if(!state||!root)return;
    const extension=ensureExtension(state);document.querySelector('#page-title').textContent=EXT_VIEWS[view]||'FutMaster';
    if(view==='competitions')renderCompetitions(root,state,extension);
    if(view==='negotiations')renderNegotiations(root,state,extension);
    if(view==='training')renderTraining(root,state,extension);
    if(view==='governance')renderGovernance(root,state,extension);
    if(view==='editor')renderEditor(root,state,extension);
  }

  function cupRoundHtml(state,round){return `<div class="v04-round"><h3>${round.name} · semana ${round.week}</h3>${round.fixtures.length?round.fixtures.map((fixture,index)=>{const result=round.results[index];return `<div class="fixture"><span>${teamName(state,fixture[0])}</span><b>${result?`${result.homeGoals} x ${result.awayGoals}`:'— x —'}</b><span>${teamName(state,fixture[1])}</span></div>`;}).join(''):'<p class="muted">Aguardando classificados.</p>'}</div>`;}

  function renderCompetitions(root,state,extension){
    const cup=extension.competitions.cup,continental=extension.competitions.continental,supercup=extension.competitions.supercup;
    root.innerHTML=`<div class="grid grid-3">${stat('Divisão atual',extension.userDivision===1?'Série A':'Série B','Pirâmide nacional local')}${stat('Copa Nacional',cup.champion?teamName(state,cup.champion):'Em andamento',`Final na semana ${cup.rounds.at(-1).week}`)}${stat('Janela',transferWindowOpen(state)?'Aberta':'Fechada',`Semana ${state.week}`)}</div>
    <div class="grid grid-2 section-gap"><div class="card"><h2>Copa Nacional</h2>${cup.rounds.map(round=>cupRoundHtml(state,round)).join('')}</div><div class="card"><h2>Competições adicionais</h2>${supercup?`<p><b>Supercopa:</b> ${teamName(state,supercup.homeId)} x ${teamName(state,supercup.awayId)} · semana ${supercup.week}</p>`:'<p class="muted">Supercopa disponível a partir da segunda temporada.</p>'}${continental?`<h3>Copa Continental</h3>${continental.rounds.map(round=>cupRoundHtml(state,round)).join('')}`:'<p class="muted">Classificação continental começa na segunda temporada.</p>'}</div></div>
    <div class="card section-gap"><h2>Série B simulada</h2><div class="table-wrap"><table><thead><tr><th>#</th><th>Clube</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>PTS</th></tr></thead><tbody>${standingsB(extension).map((team,index)=>`<tr><td>${index+1}</td><td>${team.name}</td><td>${team.played}</td><td>${team.wins}</td><td>${team.draws}</td><td>${team.losses}</td><td>${team.gf-team.ga}</td><td><b>${team.points}</b></td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function stat(label,value,detail){return `<div class="card stat-card"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`;}

  function renderNegotiations(root,state,extension){
    const expiring=[...state.userTeam.squad].sort((a,b)=>a.contractYears-b.contractYears||b.overall-a.overall);
    const loanTargets=state.market.slice(0,8);
    root.innerHTML=`<div class="grid grid-3">${stat('Janela',transferWindowOpen(state)?'Aberta':'Fechada',`Semanas iniciais e finais`)}${stat('Registrados',extension.registration.registered.length,`Limite ${extension.registration.maxPlayers}`)}${stat('Empréstimos',extension.contracts.loans.filter(item=>item.active).length,'Entradas e saídas ativas')}</div>
    <div class="card section-gap"><div class="card-header"><div><h2>Contratos e agentes</h2><p class="muted">Ofertas consideram salário, papel, felicidade, agente e reputação.</p></div><button class="secondary-button" data-ext-action="auto-register">Inscrever melhores 25</button></div><div class="table-wrap"><table><thead><tr><th>Jogador</th><th>OVR</th><th>Contrato</th><th>Salário</th><th>Agente</th><th>Ações</th></tr></thead><tbody>${expiring.map(player=>{const agent=extension.contracts.agents.find(item=>item.id===player.agentId);return `<tr><td><b>${player.name}</b><small>${player.promisedRole}</small></td><td>${player.overall}</td><td>${player.contractYears} ano(s)</td><td>${money(player.wage)}/sem.</td><td>${agent?.name||'—'}<small>Influência ${agent?.influence||0}</small></td><td><div class="inline-actions"><button class="tiny-button" data-ext-action="contract" data-id="${player.id}" data-profile="Conservadora">Conservadora</button><button class="tiny-button" data-ext-action="contract" data-id="${player.id}" data-profile="Justa">Justa</button><button class="tiny-button" data-ext-action="contract" data-id="${player.id}" data-profile="Generosa">Generosa</button><button class="tiny-button" data-ext-action="loan-out" data-id="${player.id}">Emprestar</button></div></td></tr>`;}).join('')}</tbody></table></div></div>
    <div class="grid grid-2 section-gap"><div class="card"><h2>Opções de empréstimo</h2>${loanTargets.map(player=>`<div class="list-item"><div><b>${player.name}</b><small>${player.position} · ${player.overall}/${player.potential} · ${player.clubName||'Outro clube'}</small></div><button class="tiny-button" data-ext-action="loan-in" data-id="${player.id}">Pedir empréstimo</button></div>`).join('')}</div><div class="card"><h2>Negociações recentes</h2>${extension.contracts.negotiations.slice(0,10).map(item=>`<div class="list-item"><div><b>${item.playerName}</b><small>${item.agent} · proposta ${item.profile}</small></div><span class="status ${item.accepted?'good':'danger'}">${item.accepted?'Aceita':'Recusada'}</span></div>`).join('')||'<p class="muted">Nenhuma negociação.</p>'}<h3>Empréstimos ativos</h3>${extension.contracts.loans.filter(item=>item.active).map(item=>`<p>${item.playerName} · ${item.direction==='in'?'emprestado ao clube':'cedido para '+item.destination}</p>`).join('')||'<p class="muted">Nenhum.</p>'}</div></div>`;
  }

  function renderTraining(root,state,extension){
    const injured=state.userTeam.squad.filter(player=>player.injuredWeeks>0).length;
    root.innerHTML=`<div class="grid grid-3">${stat('Intensidade',extension.training.intensity,'Afeta evolução, físico e lesões')}${stat('Foco',extension.training.focus,'Plano semanal')}${stat('Lesionados',injured,'Departamento médico')}</div>
    <div class="grid grid-2 section-gap"><div class="card"><h2>Plano de treinamento</h2><label>Intensidade<select data-ext-setting="training-intensity"><option ${extension.training.intensity==='Leve'?'selected':''}>Leve</option><option ${extension.training.intensity==='Moderada'?'selected':''}>Moderada</option><option ${extension.training.intensity==='Alta'?'selected':''}>Alta</option><option ${extension.training.intensity==='Extrema'?'selected':''}>Extrema</option></select></label><label>Foco<select data-ext-setting="training-focus"><option ${extension.training.focus==='Equilibrado'?'selected':''}>Equilibrado</option><option ${extension.training.focus==='Ataque'?'selected':''}>Ataque</option><option ${extension.training.focus==='Defesa'?'selected':''}>Defesa</option><option ${extension.training.focus==='Físico'?'selected':''}>Físico</option><option ${extension.training.focus==='Posse'?'selected':''}>Posse</option><option ${extension.training.focus==='BolaParada'?'selected':''}>BolaParada</option></select></label><label>Dia de descanso<select data-ext-setting="rest-day"><option>${extension.training.restDay}</option><option>Segunda</option><option>Terça</option><option>Quarta</option><option>Quinta</option><option>Sexta</option><option>Sábado</option><option>Domingo</option></select></label></div>
    <div class="card"><h2>Viagens e concentração</h2><label>Transporte<select data-ext-setting="travel"><option ${extension.logistics.travel==='Ônibus'?'selected':''}>Ônibus</option><option ${extension.logistics.travel==='Avião comercial'?'selected':''}>Avião comercial</option><option ${extension.logistics.travel==='Voo fretado'?'selected':''}>Voo fretado</option></select></label><label>Hotel<select data-ext-setting="hotel"><option ${extension.logistics.hotel==='Econômico'?'selected':''}>Econômico</option><option ${extension.logistics.hotel==='Confortável'?'selected':''}>Confortável</option><option ${extension.logistics.hotel==='Luxo'?'selected':''}>Luxo</option></select></label><p class="muted">Melhores condições custam mais, mas reduzem desgaste em partidas fora.</p></div></div>
    <div class="card section-gap"><h2>Agenda semanal</h2><div class="week-plan">${['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'].map((day,index)=>`<div class="day-card"><b>${day}</b><span>${day===extension.training.restDay?'Descanso':index===5?'Bola parada':index===6?'Jogo/recuperação':extension.training.focus}</span></div>`).join('')}</div></div>`;
  }

  function renderGovernance(root,state,extension){
    const gov=extension.governance;
    root.innerHTML=`<div class="grid grid-4">${stat('Modelo',gov.model,gov.investor?`${gov.investor.name} · ${gov.sharesSold}%`:'Clube associativo')}${stat('Presidente',gov.president,gov.presidentProfile)}${stat('Próxima eleição',gov.model==='Associativo'?gov.electionYear:'Não aplicável','Mandato local')}${stat('Aprovação',`${gov.boardApproval}%`,'Conselho deliberativo')}</div>
    <div class="grid grid-2 section-gap"><div class="card"><h2>Conselho e governança</h2><label>Limite de endividamento <input type="range" min="20" max="80" value="${Math.round(gov.debtLimit*100)}" data-ext-setting="debt-limit"></label><p>Modelo atual: <b>${gov.model}</b></p><p>O conselho acompanha resultados, dívida, uso da base e relação com a torcida. No automático, o diretor financeiro respeita este limite.</p></div><div class="card"><h2>Ofertas de investimento</h2>${gov.investor?`<p><b>${gov.investor.name}</b></p><p>Aporte: ${money(gov.investor.investment)} · participação ${gov.investor.shares}%</p><p>Exigência: ${gov.investor.demands}</p>`:`<div class="investment-grid"><button class="secondary-button" data-ext-action="investor" data-profile="Local">Grupo local<br><small>${money(18_000_000)} · 20%</small></button><button class="secondary-button" data-ext-action="investor" data-profile="Nacional">Grupo nacional<br><small>${money(42_000_000)} · 35%</small></button><button class="primary-button" data-ext-action="investor" data-profile="Global">Fundo global<br><small>${money(85_000_000)} · 49%</small></button></div>`}</div></div>
    <div class="card section-gap"><h2>Decisões recentes da expansão local</h2>${extension.notifications.slice(0,12).map(item=>`<div class="list-item stacked"><span>${item.category} · ${item.season}/S${item.week}</span><b>${item.text}</b></div>`).join('')||'<p class="muted">Nenhuma decisão registrada.</p>'}</div>`;
  }

  function renderEditor(root,state,extension){
    root.innerHTML=`<div class="card"><h2>Editor local da carreira</h2><p class="muted">As alterações ficam somente neste aparelho e neste save.</p><form id="v04-editor-form" class="editor-grid"><label>Nome do clube<input name="clubName" value="${state.userTeam.name}"></label><label>Sigla<input name="clubShort" maxlength="4" value="${state.userTeam.short}"></label><label>Capacidade do estádio<input name="capacity" type="number" min="3000" value="${state.stadium.capacity}"></label><label>Caixa atual<input name="balance" type="number" value="${Math.round(state.finance.balance)}"></label><div class="button-row"><button type="submit" class="primary-button">Aplicar alterações</button><button type="button" class="secondary-button" data-ext-action="export-local">Exportar carreira local</button></div></form></div>
    <div class="card section-gap"><h2>Resumo do save</h2><p>Temporada ${state.season}, semana ${state.week}, ${state.userTeam.squad.length} jogadores profissionais, ${extension.contracts.loans.filter(item=>item.active).length} empréstimos e ${extension.seasonArchive.length} temporadas arquivadas.</p><p class="muted">O editor não adiciona conteúdo licenciado. Escudos e dados externos continuam dependendo de importação autorizada.</p></div>`;
  }

  function exportLocal(state,extension){
    const blob=new Blob([JSON.stringify({main:state,extension},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=`futmaster-local-${state.userTeam.short}-${state.season}.json`;anchor.click();URL.revokeObjectURL(url);
  }

  function persistAndRefresh(state,extension,keepView=true){writeMain(state);saveExtension(extension);if(keepView&&activeView)renderExtension(activeView);else location.reload();}

  function bindEvents(){
    document.addEventListener('click',event=>{
      const mainAction=event.target.closest('[data-action]')?.dataset.action;
      if(['simulate-week','simulate-month','next-season'].includes(mainAction)){
        const before=readMain();if(before)ensureExtension(before);syncAfterMainAction(before,mainAction);
      }
    },true);

    document.querySelector('#new-game-form')?.addEventListener('submit',()=>setTimeout(()=>{const state=readMain();if(state){const ext=ensureExtension(state,true);writeMain(state);saveExtension(ext);location.reload();}},100));

    document.addEventListener('click',event=>{
      const button=event.target.closest('[data-ext-action]');if(!button)return;
      event.preventDefault();const action=button.dataset.extAction;const state=readMain();if(!state)return;const extension=ensureExtension(state);
      if(action==='auto-register')autoRegister(state,extension);
      if(action==='contract')negotiateContract(state,extension,button.dataset.id,button.dataset.profile);
      if(action==='loan-in')loanIn(state,extension,button.dataset.id);
      if(action==='loan-out')loanOut(state,extension,button.dataset.id);
      if(action==='investor')acceptInvestor(state,extension,button.dataset.profile);
      if(action==='export-local')return exportLocal(state,extension);
      persistAndRefresh(state,extension);
    });

    document.addEventListener('change',event=>{
      const setting=event.target.dataset.extSetting;if(!setting)return;const state=readMain();if(!state)return;const extension=ensureExtension(state);
      if(setting==='training-intensity')extension.training.intensity=event.target.value;
      if(setting==='training-focus')extension.training.focus=event.target.value;
      if(setting==='rest-day')extension.training.restDay=event.target.value;
      if(setting==='travel')extension.logistics.travel=event.target.value;
      if(setting==='hotel')extension.logistics.hotel=event.target.value;
      if(setting==='debt-limit')extension.governance.debtLimit=Number(event.target.value)/100;
      persistAndRefresh(state,extension);
    });

    document.addEventListener('submit',event=>{
      if(event.target.id!=='v04-editor-form')return;event.preventDefault();const state=readMain();const extension=ensureExtension(state);applyEditor(state,extension,new FormData(event.target));persistAndRefresh(state,extension,false);
    });
  }

  function init(){addNavigation();const state=readMain();if(state)ensureExtension(state);bindEvents();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
