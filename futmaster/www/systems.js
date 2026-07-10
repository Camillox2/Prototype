(function (global) {
  'use strict';

  const C = global.FMCore;

  const departmentDefinitions = {
    football:{name:'Futebol',role:'Diretor de futebol',focus:'elenco, contratos e resultados'},
    academy:{name:'Categorias de base',role:'Diretor da base',focus:'formação e promoção de jovens'},
    scouting:{name:'Scouting',role:'Chefe de scouting',focus:'observação e mercado'},
    medical:{name:'Departamento médico',role:'Chefe médico',focus:'lesões e prevenção'},
    commercial:{name:'Comercial',role:'Diretor comercial',focus:'patrocínio, marca e produtos'},
    supporters:{name:'Sócios e torcida',role:'Diretor de relacionamento',focus:'planos, campanhas e satisfação'},
    stadium:{name:'Estádio e operações',role:'Gerente de estádio',focus:'ingressos, setores e operação'},
    finance:{name:'Finanças',role:'Diretor financeiro',focus:'orçamento, folha e riscos'}
  };

  const staffNames = ['Marcelo Tavares','Ricardo Moura','Paulo Nogueira','Sérgio Matos','Daniel Pires','Anderson Faria','Fábio Leite','Roberto Diniz','Carlos Antunes','Márcio Neves','Luís Barreto','Fernando Maia','Renato Alves','Fabrício Torres','Augusto Reis','Hugo Ferraz'];

  function generateStaffMarket(seed = 1) {
    return Object.entries(departmentDefinitions).flatMap(([departmentId, definition], departmentIndex) =>
      Array.from({length:3}, (_, index) => {
        const skill = C.clamp(55 + ((seed * 13 + departmentIndex * 17 + index * 11) % 38), 48, 94);
        return {
          id:C.uid('staff'), departmentId, role:definition.role,
          name:staffNames[(seed + departmentIndex * 2 + index) % staffNames.length],
          skill, salary:Math.round((18_000 + skill * skill * 18) / 1000) * 1000,
          signingFee:Math.round((80_000 + skill * skill * 120) / 10_000) * 10_000,
          reputation:C.clamp(skill + C.randomInt(-7,7),45,96),
          personality:C.pick(['Conservador','Analítico','Agressivo','Formador','Negociador','Inovador'])
        };
      })
    );
  }

  function createDepartments() {
    return Object.fromEntries(Object.entries(departmentDefinitions).map(([id, definition]) => [id, {
      id,...definition, delegated:false, staff:null, policy:'Equilibrada', autonomy:70, lastDecision:'Nenhuma decisão nesta semana.'
    }]));
  }

  function createFanSystem(team) {
    return {
      fanBase:Math.round(team.reputation * team.reputation * 1650),
      satisfaction:68,
      loyalty:72,
      socialFollowers:Math.round(team.reputation * team.reputation * 2100),
      membershipPlans:[
        {id:'popular',name:'Popular',members:4200,price:29,delinquency:0.09,benefitCost:4},
        {id:'silver',name:'Prata',members:1700,price:69,delinquency:0.055,benefitCost:11},
        {id:'gold',name:'Ouro',members:520,price:149,delinquency:0.025,benefitCost:29}
      ],
      campaignBudget:0,
      supporterPressure:35,
      organizedSupporters:62,
      lastAttendance:0,
      lastTicketRevenue:0
    };
  }

  function createStadium(team) {
    const capacity = team.capacity;
    return {
      name:`Arena ${team.short}`,
      capacity,
      pitchQuality:68,
      safety:72,
      cleanliness:70,
      transport:58,
      parking:55,
      foodQuality:60,
      storeLevel:2,
      museumLevel:1,
      sectors:[
        {id:'popular',name:'Popular',capacity:Math.round(capacity*0.45),price:45,demand:1},
        {id:'seats',name:'Cadeiras',capacity:Math.round(capacity*0.33),price:85,demand:0.88},
        {id:'premium',name:'Premium',capacity:Math.round(capacity*0.17),price:165,demand:0.69},
        {id:'boxes',name:'Camarotes',capacity:capacity-Math.round(capacity*0.45)-Math.round(capacity*0.33)-Math.round(capacity*0.17),price:380,demand:0.48}
      ],
      maintenanceCost:Math.round(capacity*6.5),
      expansionInProgress:0,
      lastMatchOperations:null
    };
  }

  function createFacilities() {
    return {
      training:{name:'Centro de treinamento',level:2,max:10,baseCost:1_500_000},
      academy:{name:'Centro da base',level:2,max:10,baseCost:1_250_000},
      medical:{name:'Centro médico',level:2,max:10,baseCost:1_350_000},
      scouting:{name:'Rede de scouting',level:1,max:10,baseCost:1_100_000},
      analytics:{name:'Departamento de análise',level:1,max:10,baseCost:950_000},
      stadium:{name:'Estrutura do estádio',level:2,max:10,baseCost:2_400_000}
    };
  }

  function createCommercial(team) {
    return {
      brandValue:team.reputation * 1_250_000,
      sponsor:{name:'Grupo Horizonte',weeklyValue:Math.round(team.reputation*14_000),weeksRemaining:104},
      secondarySponsors:[],
      merchandisePrice:189,
      globalReach:Math.round(team.reputation*550),
      mediaReputation:team.reputation,
      namingRights:null
    };
  }

  function createFinance(team) {
    return {
      balance:team.budget,
      transferBudget:Math.round(team.budget*0.62),
      wageBudget:Math.round(team.budget*0.06),
      debt:0,
      cashFlow:[],
      financialFairPlay:{threeYearResult:0,status:'Regular'},
      boardRisk:25,
      seasonRevenue:0,
      seasonExpenses:0
    };
  }

  function addCashFlow(state, type, category, amount, description) {
    state.finance.balance += amount;
    if (amount >= 0) state.finance.seasonRevenue += amount;
    else state.finance.seasonExpenses += Math.abs(amount);
    state.finance.cashFlow.unshift({week:state.week,season:state.season,type,category,amount,description});
    state.finance.cashFlow = state.finance.cashFlow.slice(0, 180);
  }

  function departmentStaffCost(state) {
    return Object.values(state.departments).reduce((sum, department) => sum + (department.staff?.salary || 0), 0);
  }

  function squadWages(team) {
    return team.squad.reduce((sum, player) => sum + player.wage, 0);
  }

  function membershipWeeklyRevenue(state) {
    return state.fans.membershipPlans.reduce((sum, plan) => sum + plan.members * plan.price * (1-plan.delinquency) / 4.33, 0);
  }

  function processTicketing(state, homeTeam, matchImportance = 1) {
    const stadium = state.stadium;
    const teamForm = homeTeam.formSequence.slice(-5).reduce((sum, item) => sum + (item === 'V' ? 1 : item === 'E' ? 0.25 : -0.45), 0);
    const reputationDemand = 0.42 + homeTeam.reputation / 145;
    const satisfactionDemand = 0.58 + state.fans.satisfaction / 225;
    const formDemand = C.clamp(1 + teamForm*0.035,0.78,1.22);
    let attendance = 0;
    let ticketRevenue = 0;
    const sectorSales = stadium.sectors.map(sector => {
      const referencePrice = 35 + homeTeam.reputation * (sector.id === 'boxes' ? 4.4 : sector.id === 'premium' ? 1.9 : sector.id === 'seats' ? 0.82 : 0.34);
      const priceElasticity = C.clamp(Math.pow(referencePrice / Math.max(1,sector.price),0.72),0.34,1.42);
      const demand = C.clamp(reputationDemand*satisfactionDemand*formDemand*matchImportance*sector.demand*priceElasticity*C.random(0.91,1.09),0.12,1.15);
      const sold = Math.min(sector.capacity,Math.round(sector.capacity*demand));
      attendance += sold;
      ticketRevenue += sold*sector.price;
      return {...sector,sold,occupancy:C.round(sold/sector.capacity*100,1)};
    });
    const foodRevenue = attendance*(9+stadium.foodQuality*0.18)*C.random(0.78,1.16);
    const parkingRevenue = Math.round(attendance*0.16*(14+stadium.parking*0.14));
    const storeRevenue = attendance*(3+stadium.storeLevel*2.8)*(0.75+state.commercial.mediaReputation/180);
    const operationalCost = stadium.maintenanceCost + attendance*(5.5+Math.max(0,70-stadium.safety)*0.05);
    const gross = ticketRevenue+foodRevenue+parkingRevenue+storeRevenue;
    const net = gross-operationalCost;
    state.fans.lastAttendance = attendance;
    state.fans.lastTicketRevenue = Math.round(ticketRevenue);
    stadium.lastMatchOperations = {attendance,occupancy:C.round(attendance/stadium.capacity*100,1),ticketRevenue:Math.round(ticketRevenue),foodRevenue:Math.round(foodRevenue),parkingRevenue,storeRevenue:Math.round(storeRevenue),operationalCost:Math.round(operationalCost),net:Math.round(net),sectorSales};
    addCashFlow(state,'Receita','Dia de jogo',Math.round(net),`Operação da partida em ${stadium.name}`);
    return stadium.lastMatchOperations;
  }

  function processWeeklyEconomy(state) {
    const sponsorRevenue = state.commercial.sponsor?.weeklyValue || 0;
    const memberships = Math.round(membershipWeeklyRevenue(state));
    const playerWages = squadWages(state.userTeam);
    const staffWages = departmentStaffCost(state);
    const facilityCost = Object.values(state.facilities).reduce((sum, facility) => sum + facility.level*22_000,0);
    const academyCost = Object.values(state.userTeam.academy).flat().length*2_100;
    addCashFlow(state,'Receita','Patrocínio',sponsorRevenue,'Parcela semanal do patrocinador principal');
    addCashFlow(state,'Receita','Sócio-torcedor',memberships,'Mensalidades líquidas dos planos');
    addCashFlow(state,'Despesa','Folha de jogadores',-playerWages,'Salários semanais do elenco');
    addCashFlow(state,'Despesa','Funcionários',-staffWages,'Salários dos responsáveis pelos departamentos');
    addCashFlow(state,'Despesa','Instalações',-facilityCost,'Manutenção das instalações');
    addCashFlow(state,'Despesa','Categorias de base',-academyCost,'Operação semanal das categorias de base');
    state.finance.financialFairPlay.threeYearResult += sponsorRevenue+memberships-playerWages-staffWages-facilityCost-academyCost;
    state.finance.financialFairPlay.status = state.finance.financialFairPlay.threeYearResult < -state.userTeam.reputation*600_000 ? 'Risco' : 'Regular';
    state.finance.boardRisk = C.clamp(state.finance.boardRisk + (state.finance.balance < 0 ? 5 : -1),0,100);
  }

  function trainPlayer(player, quality, focus = player.developmentFocus) {
    if (player.injuredWeeks > 0) { player.fitness = C.clamp(player.fitness+4,0,100); return; }
    const ageFactor = player.age <= 19 ? 1.5 : player.age <= 23 ? 1.1 : player.age <= 28 ? 0.48 : player.age <= 31 ? 0.12 : -0.35;
    const potentialRoom = Math.max(0,player.potential-player.overall);
    const professionalism = ['Profissional','Determinado','Ambicioso'].includes(player.personality) ? 1.18 : ['Inconstante','Temperamental'].includes(player.personality) ? 0.88 : 1;
    const gainProbability = C.clamp(0.02 + quality/850 + potentialRoom/900,0.015,0.22)*professionalism;
    if (C.chance(gainProbability)) {
      const focusMap = {
        Finalização:['finalizacao','frieza','posicionamento'],
        Passe:['passe','visao','passeLongo'],
        Defesa:['marcacao','desarme','posicionamento','antecipacao'],
        Físico:['velocidade','forca','resistencia','agilidade'],
        Goleiro:['reflexo','defesaGol','saidaGol','umContraUm'],
        Equilibrado:C.attributeNames
      };
      const candidates = focusMap[focus] || focusMap.Equilibrado;
      const attribute = C.pick(candidates);
      player.attributes[attribute] = C.clamp(player.attributes[attribute]+(ageFactor<0?-1:1),20,99);
      player.overall = C.calculateOverall(player);
      player.value = C.valueFromPlayer(player.overall,player.potential,player.age);
    }
    player.fitness = C.clamp(player.fitness+C.randomInt(3,8)-Math.round(quality/35),35,100);
    player.sharpness = C.clamp(player.sharpness+C.randomInt(1,4),20,100);
    player.chemistry = C.clamp(player.chemistry + (C.chance(0.2) ? 1 : 0),20,100);
  }

  function processTraining(state) {
    const quality = 45+state.facilities.training.level*5+(state.departments.football.staff?.skill || 45)*0.32;
    state.userTeam.squad.forEach(player => trainPlayer(player,quality));
    Object.values(state.userTeam.academy).flat().forEach(player => trainPlayer(player,quality+state.facilities.academy.level*4));
  }

  function processRecovery(state) {
    const medicalSkill = state.departments.medical.staff?.skill || 42;
    const medicalLevel = state.facilities.medical.level;
    state.userTeam.squad.forEach(player => {
      if (player.injuredWeeks > 0 && C.chance(0.76+medicalSkill/500+medicalLevel/100)) player.injuredWeeks -= 1;
      if (player.suspensionMatches > 0) player.suspensionMatches -= 1;
      player.fitness = C.clamp(player.fitness+C.randomInt(5,11)+medicalLevel,25,100);
      player.happiness = C.clamp(player.happiness+(player.promisedRole==='Titular'&&player.starter?-1:0),10,100);
    });
  }

  function processFans(state, result) {
    if (!result) return;
    const userHome = result.homeId===state.userTeam.id;
    const userGoals = userHome?result.homeGoals:result.awayGoals;
    const opponentGoals = userHome?result.awayGoals:result.homeGoals;
    const outcome = userGoals>opponentGoals?1:userGoals===opponentGoals?0:-1;
    state.fans.satisfaction = C.clamp(state.fans.satisfaction+(outcome>0?3:outcome<0?-3:0),10,100);
    state.fans.supporterPressure = C.clamp(state.fans.supporterPressure+(outcome<0?4:-2),0,100);
    const memberGrowthRate = (state.fans.satisfaction-55)/4200 + (outcome>0?0.002:outcome<0?-0.001:0);
    state.fans.membershipPlans.forEach(plan => {
      plan.members = Math.max(0,Math.round(plan.members*(1+memberGrowthRate*C.random(0.72,1.18))));
      plan.delinquency = C.clamp(plan.delinquency+(state.finance.balance<0?0.001:0)+C.random(-0.002,0.002),0.01,0.22);
    });
    state.fans.socialFollowers = Math.max(0,Math.round(state.fans.socialFollowers*(1+(outcome>0?0.0017:outcome<0?-0.0004:0.0002))));
  }

  function autoHireDirector(state, departmentId) {
    const department = state.departments[departmentId];
    if (department.staff) return false;
    const candidates = state.staffMarket.filter(staff => staff.departmentId===departmentId && staff.signingFee<=state.finance.balance*0.25).sort((a,b)=>b.skill-a.skill);
    const candidate = candidates[0];
    if (!candidate) return false;
    department.staff = candidate;
    state.staffMarket = state.staffMarket.filter(staff => staff.id!==candidate.id);
    addCashFlow(state,'Despesa','Contratação de diretor',-candidate.signingFee,`${candidate.name} contratado como ${candidate.role}`);
    department.lastDecision = `${candidate.name} assumiu o departamento.`;
    return true;
  }

  function autoFootball(state, department) {
    const skill = department.staff?.skill || 40;
    state.userTeam.tactics = chooseTactics(state.userTeam,skill);
    const lineup = C.selectBestLineup(state.userTeam,state.userTeam.tactics.formation);
    state.userTeam.squad.forEach(player => {player.starter=lineup.starters.some(entry=>entry.player.id===player.id); player.squadRole=player.starter?'Titular':'Reserva';});
    const expiring = state.userTeam.squad.filter(player=>player.contractYears<=1 && player.overall>=C.calculateTeamOverall(state.userTeam)-4).sort((a,b)=>b.overall-a.overall)[0];
    if (expiring && state.finance.balance>expiring.wage*30 && C.chance(skill/135)) {
      const raise=Math.round(expiring.wage*(1.08+skill/700));
      expiring.wage=raise; expiring.contractYears=3;
      department.lastDecision=`Renovou com ${expiring.name} por três temporadas.`;
    } else department.lastDecision=`Definiu escalação e plano de jogo ${state.userTeam.tactics.formation}.`;
  }

  function chooseTactics(team, skill) {
    const avgFitness=team.squad.reduce((sum,p)=>sum+p.fitness,0)/team.squad.length;
    const bestAttackers=team.squad.filter(p=>C.groupOf(p.position)==='ATT').sort((a,b)=>b.overall-a.overall).slice(0,3);
    const formation=bestAttackers.length>=3&&bestAttackers[2].overall>C.calculateTeamOverall(team)-5?'4-3-3':'4-2-3-1';
    return {...team.tactics,formation,mentality:team.morale>75?'Ofensiva':team.morale<50?'Defensiva':'Equilibrada',pressing:avgFitness>82?C.clamp(58+skill/5,55,78):48,tempo:avgFitness>80?62:50};
  }

  function autoAcademy(state, department) {
    const skill=department.staff?.skill||40;
    const prospects=Object.entries(state.userTeam.academy).flatMap(([category,players])=>players.map(player=>({category,player}))).sort((a,b)=>(b.player.potential+b.player.overall)-(a.player.potential+a.player.overall));
    const candidate=prospects.find(item=>item.player.age>=18&&item.player.overall>=C.calculateTeamOverall(state.userTeam)-12);
    if(candidate&&C.chance(skill/120)){
      state.userTeam.academy[candidate.category]=state.userTeam.academy[candidate.category].filter(p=>p.id!==candidate.player.id);
      candidate.player.contractYears=4; candidate.player.wage=C.wageFromOverall(candidate.player.overall,candidate.player.age); state.userTeam.squad.push(candidate.player);
      department.lastDecision=`Promoveu ${candidate.player.name} (${candidate.player.overall}/${candidate.player.potential}) ao profissional.`;
    } else department.lastDecision='Manteve os principais talentos em desenvolvimento individual.';
  }

  function autoScouting(state, department) {
    const skill=department.staff?.skill||40;
    const count=3+Math.floor(skill/22);
    const targets=[];
    for(let i=0;i<count;i+=1){
      const player=C.createPlayer(900+state.week,i,{clubLevel:C.calculateTeamOverall(state.userTeam)+C.randomInt(-7,6),nationality:C.pick(['Brasil','Argentina','Uruguai','Colômbia','Portugal','Paraguai'])});
      player.scoutKnowledge=C.clamp(skill+C.randomInt(-12,8),35,100); player.askingPrice=Math.round(player.value*C.random(0.92,1.32)); targets.push(player);
    }
    state.market=[...targets,...state.market].slice(0,28);
    department.lastDecision=`Entregou ${count} novos relatórios de mercado.`;
  }

  function autoMedical(state, department) {
    const skill=department.staff?.skill||40;
    const injured=state.userTeam.squad.filter(player=>player.injuredWeeks>0).sort((a,b)=>b.injuredWeeks-a.injuredWeeks);
    injured.slice(0,Math.max(1,Math.floor(skill/25))).forEach(player=>{if(C.chance(skill/105))player.injuredWeeks=Math.max(0,player.injuredWeeks-1);});
    state.userTeam.squad.forEach(player=>{player.injuryRisk=C.clamp(player.injuryRisk-(C.chance(skill/250)?1:0),2,35);});
    department.lastDecision=injured.length?`Priorizou a recuperação de ${injured[0].name}.`:'Executou protocolo preventivo no elenco.';
  }

  function autoCommercial(state, department) {
    const skill=department.staff?.skill||40;
    const investment=Math.round(25_000+skill*850);
    if(state.finance.balance>investment*10){
      addCashFlow(state,'Despesa','Marketing',-investment,'Campanha comercial e de marca');
      state.commercial.brandValue+=Math.round(investment*(1+skill/100));
      state.commercial.mediaReputation=C.clamp(state.commercial.mediaReputation+(C.chance(skill/110)?1:0),20,100);
      state.fans.socialFollowers=Math.round(state.fans.socialFollowers*(1+skill/60_000));
      department.lastDecision=`Investiu ${C.money(investment)} em marca, mídia e produtos.`;
    } else department.lastDecision='Preservou caixa e renegociou entregas comerciais.';
  }

  function autoSupporters(state, department) {
    const skill=department.staff?.skill||40;
    const plan=state.fans.membershipPlans.sort((a,b)=>b.delinquency-a.delinquency)[0];
    plan.price=C.clamp(Math.round(plan.price*(state.fans.satisfaction>78?1.02:state.fans.satisfaction<48?0.97:1)),15,300);
    const campaign=Math.round(18_000+skill*620);
    if(state.finance.balance>campaign*12&&C.chance(0.45)){
      addCashFlow(state,'Despesa','Relacionamento',-campaign,'Campanha de aquisição e retenção de sócios');
      const newMembers=Math.round(campaign/24*(0.7+skill/100));
      state.fans.membershipPlans[0].members+=newMembers;
      state.fans.satisfaction=C.clamp(state.fans.satisfaction+1,0,100);
      department.lastDecision=`Campanha trouxe aproximadamente ${newMembers} novos sócios.`;
    } else department.lastDecision=`Ajustou o plano ${plan.name} para reduzir evasão e inadimplência.`;
  }

  function autoStadium(state, department) {
    const skill=department.staff?.skill||40;
    state.stadium.sectors.forEach(sector=>{
      const occupancy=state.stadium.lastMatchOperations?.sectorSales?.find(item=>item.id===sector.id)?.occupancy;
      if(occupancy>94)sector.price=Math.round(sector.price*1.04);
      if(occupancy!==undefined&&occupancy<62)sector.price=Math.max(15,Math.round(sector.price*0.96));
    });
    if(C.chance(skill/500)){state.stadium.cleanliness=C.clamp(state.stadium.cleanliness+1,0,100);state.stadium.safety=C.clamp(state.stadium.safety+1,0,100);}
    department.lastDecision='Recalculou preços por setor e o plano operacional do próximo jogo.';
  }

  function autoFinance(state, department) {
    const skill=department.staff?.skill||40;
    const wageRatio=squadWages(state.userTeam)/Math.max(1,state.finance.wageBudget);
    if(wageRatio>1.05){
      const candidate=[...state.userTeam.squad].filter(p=>!p.starter).sort((a,b)=>b.wage-a.wage)[0];
      if(candidate){candidate.transferListed=true;department.lastDecision=`Listou ${candidate.name} para reduzir a folha salarial.`;return;}
    }
    if(state.finance.balance<0&&state.commercial.brandValue>20_000_000){state.finance.debt+=1_000_000;addCashFlow(state,'Receita','Crédito',1_000_000,'Linha emergencial de capital de giro');department.lastDecision='Contratou crédito emergencial para proteger o fluxo de caixa.';return;}
    state.finance.transferBudget=Math.max(0,Math.round(state.finance.balance*(0.35+skill/450)));
    department.lastDecision='Atualizou os limites de transferências e folha com base no caixa projetado.';
  }

  function runAutomation(state) {
    if(state.automation.mode==='manual')return;
    const actions={football:autoFootball,academy:autoAcademy,scouting:autoScouting,medical:autoMedical,commercial:autoCommercial,supporters:autoSupporters,stadium:autoStadium,finance:autoFinance};
    Object.entries(state.departments).forEach(([id,department])=>{
      const shouldRun=state.automation.mode==='full'||department.delegated;
      if(!shouldRun)return;
      if(!department.staff&&state.automation.autoHire)autoHireDirector(state,id);
      if(department.staff)actions[id](state,department);
      else department.lastDecision='Sem responsável contratado; nenhuma decisão automática foi tomada.';
    });
  }

  function processWorldAI(state) {
    state.teams.filter(team=>team.id!==state.userTeam.id).forEach(team=>{
      team.tactics=chooseTactics(team,team.managerQuality);
      const lineup=C.selectBestLineup(team,team.tactics.formation);
      team.squad.forEach(player=>{player.starter=lineup.starters.some(entry=>entry.player.id===player.id);trainPlayer(player,team.trainingQuality);if(player.suspensionMatches>0)player.suspensionMatches-=1;if(player.injuredWeeks>0&&C.chance(0.78))player.injuredWeeks-=1;});
      if(C.chance(0.08)){
        const weak=[...team.squad].sort((a,b)=>a.overall-b.overall)[0];
        const recruit=C.createPlayer(C.randomInt(1000,9999),state.week,{clubLevel:team.strength+C.randomInt(-4,5)});
        if(recruit.overall>weak.overall+2){team.squad=team.squad.filter(p=>p.id!==weak.id);team.squad.push(recruit);}
      }
      team.morale=C.clamp(team.morale+C.randomInt(-2,2),25,95);team.chemistry=C.clamp(team.chemistry+(C.chance(0.3)?1:0),35,96);
    });
  }

  function advanceSeason(state) {
    state.season+=1;state.week=1;state.round=0;state.fixtures=C.roundRobin(state.teams.map(team=>team.id));state.matchHistory=[];
    state.teams.forEach(team=>{
      Object.assign(team,{played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0,formSequence:[]});
      team.squad.forEach(player=>{
        player.age+=1;player.contractYears-=1;player.yellowCards=0;player.redCards=0;player.suspensionMatches=0;player.appearances=0;player.minutes=0;player.goals=0;player.assists=0;player.averageRating=0;
        if(player.age>=31&&C.chance((player.age-29)/12)){C.attributeNames.forEach(attribute=>{if(['velocidade','aceleracao','resistencia','agilidade'].includes(attribute)&&C.chance(0.55))player.attributes[attribute]=C.clamp(player.attributes[attribute]-1,20,99);});}
        player.overall=C.calculateOverall(player);player.value=C.valueFromPlayer(player.overall,player.potential,player.age);
      });
      team.squad=team.squad.filter(player=>player.contractYears>0&&player.age<39);
      while(team.squad.length<23)team.squad.push(C.createPlayer(C.randomInt(1000,9999),team.squad.length,{clubLevel:team.strength}));
      Object.entries(team.academy).forEach(([,players])=>players.forEach(player=>player.age+=1));
      const newIntake=Array.from({length:6},(_,index)=>C.createPlayer(C.randomInt(1000,9999),index,{clubLevel:team.strength-28,youth:true,age:14}));
      team.academy['Sub-15'].push(...newIntake);
    });
    state.board.objectives=createBoardObjectives(state.userTeam);
    addCashFlow(state,'Receita','Premiação',Math.max(500_000,(11-state.lastPosition)*650_000),'Premiação e cota da nova temporada');
  }

  function createBoardObjectives(team) {
    return [
      {id:'league',name:'Liga',target:team.reputation>=80?'Terminar no G-3':team.reputation>=70?'Terminar no G-5':'Evitar as últimas posições',progress:0},
      {id:'academy',name:'Base',target:'Dar minutos a pelo menos dois atletas formados no clube',progress:0},
      {id:'finance',name:'Finanças',target:'Encerrar a temporada com fluxo operacional sustentável',progress:0},
      {id:'fans',name:'Torcida',target:'Aumentar a base de sócios e manter satisfação acima de 65',progress:0}
    ];
  }

  global.FMSystems={departmentDefinitions,generateStaffMarket,createDepartments,createFanSystem,createStadium,createFacilities,createCommercial,createFinance,createBoardObjectives,addCashFlow,departmentStaffCost,squadWages,membershipWeeklyRevenue,processTicketing,processWeeklyEconomy,processTraining,processRecovery,processFans,runAutomation,autoHireDirector,processWorldAI,advanceSeason};
})(window);
