(function () {
  'use strict';

  const C = window.FMCore;
  const Match = window.FMMatch;
  const Systems = window.FMSystems;
  const SAVE_KEY = 'futmaster-save-v4';
  const viewTitles = {
    dashboard:'Visão geral', calendar:'Jogos e calendário', squad:'Elenco', academy:'Categorias de base',
    staff:'Departamentos e automação', board:'Diretoria e objetivos', fans:'Sócios e torcida', stadium:'Ingressos e estádio',
    commercial:'Comercial e marca', tactics:'Táticas', league:'Classificação', transfers:'Mercado e contratos',
    medical:'Departamento médico', facilities:'Instalações', finance:'Finanças', world:'Mundo do futebol', history:'Histórico e súmulas'
  };

  let state = loadState();
  let currentView = 'dashboard';
  let selectedMatchId = null;

  const root = document.querySelector('#app-view');
  const dialog = document.querySelector('#new-game-dialog');
  const clubSelect = document.querySelector('#club-select');
  clubSelect.innerHTML = C.clubTemplates.map(club => `<option value="${club.id}">${club.name}</option>`).join('');

  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
      currentView = button.dataset.view;
      selectedMatchId = null;
      document.querySelectorAll('.nav-item').forEach(item => item.classList.toggle('active', item === button));
      render();
    });
  });

  document.querySelector('#new-game-button').addEventListener('click', () => dialog.showModal());
  document.querySelector('#new-game-form').addEventListener('submit', event => {
    if (event.submitter?.value === 'cancel') return;
    event.preventDefault();
    newGame(clubSelect.value, document.querySelector('#manager-name').value.trim() || 'Treinador');
    dialog.close();
  });

  root.addEventListener('click', event => {
    const actionElement = event.target.closest('[data-action]');
    if (!actionElement) return;
    const action = actionElement.dataset.action;
    const id = actionElement.closest('[data-id]')?.dataset.id || actionElement.dataset.id;
    try {
      if (action === 'open-new-game') dialog.showModal();
      if (action === 'simulate-week') simulateWeek();
      if (action === 'simulate-month') simulateMultipleWeeks(4);
      if (action === 'next-season') nextSeason();
      if (action === 'hire-staff') hireStaff(id);
      if (action === 'fire-staff') fireStaff(id);
      if (action === 'toggle-delegation') toggleDelegation(id);
      if (action === 'hire-board') hireFullBoard();
      if (action === 'promote-youth') promoteYouth(id);
      if (action === 'launch-campaign') launchCampaign();
      if (action === 'upgrade-facility') upgradeFacility(id);
      if (action === 'buy-player') buyPlayer(id);
      if (action === 'renew-contract') renewContract(id);
      if (action === 'list-player') listPlayer(id);
      if (action === 'treat-player') treatPlayer(id);
      if (action === 'auto-lineup') autoLineup();
      if (action === 'match-report') { selectedMatchId = id; currentView = 'history'; render(); }
      if (action === 'back-history') { selectedMatchId = null; render(); }
      if (action === 'save-backup') exportSave();
      if (action === 'reset-season-stats') resetSeasonStatsPreview();
    } catch (error) {
      console.error(error);
      alert(`Não foi possível concluir a ação: ${error.message}`);
    }
  });

  root.addEventListener('change', event => {
    if (!state) return;
    const element = event.target;
    const setting = element.dataset.setting;
    if (!setting) return;

    if (setting === 'automation-mode') {
      state.automation.mode = element.value;
      if (element.value === 'manual') Object.values(state.departments).forEach(department => department.delegated = false);
      if (element.value === 'full') Object.values(state.departments).forEach(department => department.delegated = true);
    }
    if (setting === 'auto-hire') state.automation.autoHire = element.checked;
    if (setting === 'department-policy') state.departments[element.dataset.department].policy = element.value;
    if (setting === 'department-autonomy') state.departments[element.dataset.department].autonomy = Number(element.value);
    if (setting === 'formation') state.userTeam.tactics.formation = element.value;
    if (setting === 'mentality') state.userTeam.tactics.mentality = element.value;
    if (['pressing','tempo','width','defensiveLine'].includes(setting)) state.userTeam.tactics[setting] = Number(element.value);
    if (setting === 'marking') state.userTeam.tactics.marking = element.value;
    if (setting === 'buildUp') state.userTeam.tactics.buildUp = element.value;
    if (setting === 'counterAttack') state.userTeam.tactics.counterAttack = element.checked;
    if (setting === 'ticket-price') {
      const sector = state.stadium.sectors.find(item => item.id === element.dataset.sector);
      if (sector) sector.price = C.clamp(Number(element.value), 10, 1500);
    }
    if (setting === 'membership-price') {
      const plan = state.fans.membershipPlans.find(item => item.id === element.dataset.plan);
      if (plan) plan.price = C.clamp(Number(element.value), 10, 600);
    }
    if (setting === 'development-focus') {
      const player = findPlayer(element.dataset.player);
      if (player) player.developmentFocus = element.value;
    }
    saveState();
    render();
  });

  function attachUserTeam(targetState) {
    if (!targetState) return targetState;
    if (Object.prototype.hasOwnProperty.call(targetState, 'userTeam')) delete targetState.userTeam;
    Object.defineProperty(targetState, 'userTeam', {
      configurable:true,
      enumerable:false,
      get() { return targetState.teams.find(team => team.id === targetState.userTeamId); }
    });
    return targetState;
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      if (!saved || saved.version !== 4) return null;
      return attachUserTeam(saved);
    } catch (error) {
      console.warn('Save inválido', error);
      return null;
    }
  }

  function saveState() {
    if (!state) return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  function newGame(clubId, managerName) {
    const teams = C.clubTemplates.map((template, index) => C.createTeam(template, index + 1));
    const userTeam = teams.find(team => team.id === clubId);
    state = attachUserTeam({
      version:4,
      managerName,
      userTeamId:clubId,
      season:2026,
      week:1,
      round:0,
      teams,
      fixtures:C.roundRobin(teams.map(team => team.id)),
      matchHistory:[],
      careerHistory:[],
      news:[],
      departments:Systems.createDepartments(),
      staffMarket:Systems.generateStaffMarket(7),
      automation:{mode:'manual',autoHire:true},
      fans:Systems.createFanSystem(userTeam),
      stadium:Systems.createStadium(userTeam),
      commercial:Systems.createCommercial(userTeam),
      facilities:Systems.createFacilities(),
      finance:Systems.createFinance(userTeam),
      board:{confidence:72,objectives:Systems.createBoardObjectives(userTeam),messages:[]},
      market:generateMarket(18, userTeam.strength),
      lastPosition:teams.length,
      records:{titles:0,bestPosition:null,biggestWin:null,biggestLoss:null},
      settings:{difficulty:'Normal',matchDetail:'Completo'}
    });
    autoLineup(false);
    addNews('Clube', `${managerName} foi apresentado como novo responsável pelo ${userTeam.name}.`);
    saveState();
    render();
  }

  function generateMarket(size, level) {
    return Array.from({length:size}, (_, index) => {
      const player = C.createPlayer(500 + index, index, {clubLevel:level + C.randomInt(-9,7), nationality:C.pick(['Brasil','Argentina','Uruguai','Colômbia','Portugal','Paraguai','Chile'])});
      player.askingPrice = Math.round(player.value * C.random(0.88, 1.38) / 10_000) * 10_000;
      player.scoutKnowledge = C.randomInt(28, 82);
      player.clubName = C.pick(C.clubTemplates.filter(club => club.id !== state?.userTeamId).map(club => club.name));
      return player;
    });
  }

  function addNews(category, text) {
    state.news.unshift({id:C.uid('news'),season:state.season,week:state.week,category,text});
    state.news = state.news.slice(0, 120);
  }

  function teamById(id) { return state.teams.find(team => team.id === id); }
  function findPlayer(id) {
    const stringId = String(id);
    return state.userTeam.squad.find(player => String(player.id) === stringId)
      || Object.values(state.userTeam.academy).flat().find(player => String(player.id) === stringId)
      || state.market.find(player => String(player.id) === stringId);
  }

  function simulateMultipleWeeks(amount) {
    for (let count = 0; count < amount && state.round < state.fixtures.length; count += 1) simulateWeek(false);
    saveState(); render();
  }

  function simulateWeek(renderAfter = true) {
    if (!state) return;
    if (state.round >= state.fixtures.length) {
      alert('A temporada terminou. Inicie a próxima temporada.');
      return;
    }

    Systems.processRecovery(state);
    Systems.runAutomation(state);
    Systems.processTraining(state);
    Systems.processWorldAI(state);

    const fixtures = state.fixtures[state.round];
    let userResult = null;
    fixtures.forEach(fixture => {
      const home = teamById(fixture.home);
      const away = teamById(fixture.away);
      const result = Match.simulateMatch(home, away, {season:state.season,week:state.week,pressure:isHighPressureMatch(home,away)});
      result.season = state.season;
      result.week = state.week;
      result.round = state.round + 1;
      Match.applyMatchResult(result, home, away);
      state.matchHistory.unshift(result);
      if ([home.id, away.id].includes(state.userTeamId)) userResult = result;
      if (home.id === state.userTeamId) Systems.processTicketing(state, home, matchImportance(home, away));
    });

    if (userResult) {
      processUserResult(userResult);
      Systems.processFans(state, userResult);
      updateRecords(userResult);
    }
    Systems.processWeeklyEconomy(state);
    updateBoard();
    state.round += 1;
    state.week += 1;
    refreshMarketIfNeeded();
    saveState();
    if (renderAfter) render();
  }

  function isHighPressureMatch(home, away) {
    const difference = Math.abs(home.reputation - away.reputation);
    return difference < 8 || state.round >= state.fixtures.length - 3;
  }

  function matchImportance(home, away) {
    const reputation = (home.reputation + away.reputation) / 160;
    const lateSeason = state.round > state.fixtures.length * 0.7 ? 1.08 : 1;
    return C.clamp(0.78 + reputation * 0.42, 0.8, 1.35) * lateSeason;
  }

  function processUserResult(result) {
    const home = result.homeId === state.userTeamId;
    const goalsFor = home ? result.homeGoals : result.awayGoals;
    const goalsAgainst = home ? result.awayGoals : result.homeGoals;
    const performanceDay = home ? result.performance.homeDay : result.performance.awayDay;
    const opponent = teamById(home ? result.awayId : result.homeId);
    const outcome = goalsFor > goalsAgainst ? 'vitória' : goalsFor === goalsAgainst ? 'empate' : 'derrota';
    const moraleChange = outcome === 'vitória' ? 4 : outcome === 'derrota' ? -4 : 1;
    state.userTeam.morale = C.clamp(state.userTeam.morale + moraleChange, 20, 98);
    state.userTeam.chemistry = C.clamp(state.userTeam.chemistry + (outcome === 'vitória' ? 1 : outcome === 'derrota' && C.chance(0.35) ? -1 : 0), 30, 98);
    state.board.confidence = C.clamp(state.board.confidence + (outcome === 'vitória' ? 2 : outcome === 'derrota' ? -2 : 0), 0, 100);
    addNews('Partida', `${state.userTeam.name} teve ${outcome} por ${goalsFor} a ${goalsAgainst} contra ${opponent.name}. Desempenho do dia: ${performanceDay}.`);
    result.injuries.filter(event => event.teamId === state.userTeamId).forEach(event => addNews('Médico', `${findPlayer(event.playerId)?.name || 'Um atleta'} ficará fora por aproximadamente ${event.weeks} semana(s).`));
    const upset = result.performance.homeOverall - result.performance.awayOverall;
    if ((home && goalsFor > goalsAgainst && upset < -12) || (!home && goalsFor > goalsAgainst && upset > 12)) addNews('Destaque', 'Uma grande zebra aconteceu: organização, desempenho individual e acontecimentos da partida superaram a diferença de qualidade nominal.');
  }

  function updateRecords(result) {
    const home = result.homeId === state.userTeamId;
    const gf = home ? result.homeGoals : result.awayGoals;
    const ga = home ? result.awayGoals : result.homeGoals;
    const difference = gf - ga;
    if (difference > 0 && (!state.records.biggestWin || difference > state.records.biggestWin.difference)) state.records.biggestWin = {difference,text:`${result.homeShort} ${result.homeGoals} x ${result.awayGoals} ${result.awayShort}`};
    if (difference < 0 && (!state.records.biggestLoss || difference < state.records.biggestLoss.difference)) state.records.biggestLoss = {difference,text:`${result.homeShort} ${result.homeGoals} x ${result.awayGoals} ${result.awayShort}`};
  }

  function standings() {
    return [...state.teams].sort((a,b) => b.points-a.points || (b.gf-b.ga)-(a.gf-a.ga) || b.gf-a.gf || b.wins-a.wins);
  }

  function updateBoard() {
    const position = standings().findIndex(team => team.id === state.userTeamId) + 1;
    state.lastPosition = position;
    const operationalResult = state.finance.seasonRevenue - state.finance.seasonExpenses;
    state.board.objectives.find(item => item.id === 'league').progress = Math.round((state.teams.length-position+1)/state.teams.length*100);
    state.board.objectives.find(item => item.id === 'finance').progress = operationalResult >= 0 ? 100 : C.clamp(100 + Math.round(operationalResult/100_000),0,100);
    state.board.objectives.find(item => item.id === 'fans').progress = C.clamp(Math.round((state.fans.satisfaction + state.fans.membershipPlans.reduce((sum,plan)=>sum+plan.members,0)/200)/2),0,100);
    const academyPlayers = state.userTeam.squad.filter(player => player.age <= 21 && player.appearances >= 2).length;
    state.board.objectives.find(item => item.id === 'academy').progress = C.clamp(academyPlayers * 50,0,100);
    const averageProgress = state.board.objectives.reduce((sum,item)=>sum+item.progress,0)/state.board.objectives.length;
    state.board.confidence = C.clamp(Math.round(state.board.confidence*0.93 + averageProgress*0.07),0,100);
  }

  function refreshMarketIfNeeded() {
    if (state.week % 3 !== 0) return;
    state.market = [...generateMarket(5, C.calculateTeamOverall(state.userTeam)), ...state.market]
      .sort((a,b) => b.scoutKnowledge-a.scoutKnowledge)
      .slice(0, 28);
  }

  function nextSeason() {
    if (state.round < state.fixtures.length) return alert('A temporada atual ainda não terminou.');
    const position = standings().findIndex(team => team.id === state.userTeamId) + 1;
    if (position === 1) { state.records.titles += 1; addNews('Título', `${state.userTeam.name} conquistou o campeonato da temporada ${state.season}.`); }
    state.careerHistory=[...state.matchHistory,...(state.careerHistory||[])].slice(0,1000);
    Systems.advanceSeason(state);
    state.staffMarket = [...state.staffMarket, ...Systems.generateStaffMarket(state.season)].slice(-30);
    state.market = generateMarket(20, C.calculateTeamOverall(state.userTeam));
    saveState(); render();
  }

  function hireStaff(staffId) {
    const staff = state.staffMarket.find(item => String(item.id) === String(staffId));
    if (!staff) return;
    if (state.finance.balance < staff.signingFee) return alert('Caixa insuficiente para as luvas desse profissional.');
    const department = state.departments[staff.departmentId];
    if (department.staff) {
      const severance = department.staff.salary * 8;
      if (state.finance.balance < staff.signingFee + severance) return alert('Caixa insuficiente considerando a rescisão do atual responsável.');
      Systems.addCashFlow(state,'Despesa','Rescisão',-severance,`Rescisão de ${department.staff.name}`);
    }
    department.staff = staff;
    department.delegated = true;
    department.lastDecision = `${staff.name} assumiu o departamento.`;
    state.staffMarket = state.staffMarket.filter(item => item.id !== staff.id);
    Systems.addCashFlow(state,'Despesa','Contratação',-staff.signingFee,`${staff.name} contratado como ${staff.role}`);
    saveState(); render();
  }

  function fireStaff(departmentId) {
    const department = state.departments[departmentId];
    if (!department?.staff) return;
    const severance = department.staff.salary * 8;
    if (state.finance.balance < severance) return alert('Caixa insuficiente para pagar a rescisão.');
    Systems.addCashFlow(state,'Despesa','Rescisão',-severance,`Rescisão de ${department.staff.name}`);
    department.staff = null;
    department.delegated = false;
    department.lastDecision = 'Departamento sem responsável.';
    saveState(); render();
  }

  function toggleDelegation(departmentId) {
    const department = state.departments[departmentId];
    if (!department) return;
    department.delegated = !department.delegated;
    if (department.delegated && !department.staff) alert('A área foi marcada para delegação, mas precisa de um responsável contratado.');
    if (state.automation.mode === 'manual' && department.delegated) state.automation.mode = 'assisted';
    saveState(); render();
  }

  function hireFullBoard() {
    let hired = 0;
    Object.keys(state.departments).forEach(id => { if (Systems.autoHireDirector(state,id)) hired += 1; state.departments[id].delegated = true; });
    state.automation.mode = 'full';
    addNews('Administração', `${hired} responsável(is) foram contratados e todas as áreas passaram ao modo automático.`);
    saveState(); render();
  }

  function promoteYouth(playerId) {
    for (const [category, players] of Object.entries(state.userTeam.academy)) {
      const player = players.find(item => String(item.id) === String(playerId));
      if (!player) continue;
      if (player.age < 16) return alert('O atleta ainda é muito jovem para o elenco profissional.');
      state.userTeam.academy[category] = players.filter(item => item.id !== player.id);
      player.contractYears = 4;
      player.wage = C.wageFromOverall(player.overall,player.age);
      player.promisedRole = 'Jovem promessa';
      state.userTeam.squad.push(player);
      addNews('Base', `${player.name} foi promovido do ${category} ao elenco profissional.`);
      saveState(); render(); return;
    }
  }

  function launchCampaign() {
    const cost = 180_000;
    if (state.finance.balance < cost) return alert('Caixa insuficiente para a campanha.');
    Systems.addCashFlow(state,'Despesa','Relacionamento',-cost,'Campanha ampla de sócio-torcedor');
    const relationshipSkill = state.departments.supporters.staff?.skill || 45;
    const newMembers = Math.round(1200 * (0.7 + relationshipSkill/100) * (0.75+state.fans.satisfaction/150));
    state.fans.membershipPlans[0].members += newMembers;
    state.fans.satisfaction = C.clamp(state.fans.satisfaction + 2,0,100);
    addNews('Torcida', `A campanha conquistou aproximadamente ${newMembers} novos sócios.`);
    saveState(); render();
  }

  function upgradeFacility(facilityId) {
    const facility = state.facilities[facilityId];
    if (!facility || facility.level >= facility.max) return;
    const cost = Math.round(facility.baseCost * Math.pow(1.48,facility.level-1));
    if (state.finance.balance < cost) return alert('Caixa insuficiente para essa melhoria.');
    Systems.addCashFlow(state,'Despesa','Infraestrutura',-cost,`Melhoria de ${facility.name} para o nível ${facility.level+1}`);
    facility.level += 1;
    if (facilityId === 'stadium') { state.stadium.capacity += 1500; state.stadium.sectors[0].capacity += 700; state.stadium.sectors[1].capacity += 500; state.stadium.sectors[2].capacity += 250; state.stadium.sectors[3].capacity += 50; }
    addNews('Infraestrutura', `${facility.name} alcançou o nível ${facility.level}.`);
    saveState(); render();
  }

  function buyPlayer(playerId) {
    const player = state.market.find(item => String(item.id) === String(playerId));
    if (!player) return;
    const totalCost = player.askingPrice + player.wage * 8;
    if (state.finance.balance < totalCost || state.finance.transferBudget < player.askingPrice) return alert('Orçamento insuficiente para valor e luvas do contrato.');
    Systems.addCashFlow(state,'Despesa','Transferência',-totalCost,`Contratação de ${player.name}`);
    state.finance.transferBudget -= player.askingPrice;
    player.contractYears = 4;
    player.happiness = 82;
    state.userTeam.squad.push(player);
    state.market = state.market.filter(item => item.id !== player.id);
    addNews('Mercado', `${player.name} foi contratado por ${C.money(player.askingPrice)}.`);
    saveState(); render();
  }

  function renewContract(playerId) {
    const player = state.userTeam.squad.find(item => String(item.id) === String(playerId));
    if (!player) return;
    const signingFee = player.wage * 10;
    if (state.finance.balance < signingFee) return alert('Caixa insuficiente para as luvas da renovação.');
    Systems.addCashFlow(state,'Despesa','Contrato',-signingFee,`Luvas da renovação de ${player.name}`);
    player.contractYears = 3;
    player.wage = Math.round(player.wage * (1.08 + Math.max(0,player.overall-C.calculateTeamOverall(state.userTeam))/100));
    player.happiness = C.clamp(player.happiness+8,0,100);
    saveState(); render();
  }

  function listPlayer(playerId) {
    const player = state.userTeam.squad.find(item => String(item.id) === String(playerId));
    if (!player) return;
    player.transferListed = !player.transferListed;
    addNews('Mercado', `${player.name} ${player.transferListed?'foi colocado':'foi retirado'} da lista de transferências.`);
    saveState(); render();
  }

  function treatPlayer(playerId) {
    const player = state.userTeam.squad.find(item => String(item.id) === String(playerId));
    if (!player || player.injuredWeeks <= 0) return;
    const cost = 75_000 + player.injuredWeeks*18_000;
    if (state.finance.balance < cost) return alert('Caixa insuficiente para o tratamento intensivo.');
    Systems.addCashFlow(state,'Despesa','Tratamento médico',-cost,`Tratamento intensivo de ${player.name}`);
    if (C.chance(0.68 + state.facilities.medical.level/25)) player.injuredWeeks = Math.max(0,player.injuredWeeks-1);
    saveState(); render();
  }

  function autoLineup(shouldRender = true) {
    if (!state) return;
    const lineup = C.selectBestLineup(state.userTeam,state.userTeam.tactics.formation);
    state.userTeam.squad.forEach(player => { player.starter = lineup.starters.some(entry => entry.player.id === player.id); player.squadRole = player.starter?'Titular':'Reserva'; });
    if (shouldRender) { saveState(); render(); }
  }

  function exportSave() {
    const blob = new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `futmaster-${state.userTeam.short}-${state.season}-semana-${state.week}.json`; anchor.click();
    URL.revokeObjectURL(url);
  }

  function resetSeasonStatsPreview() {
    alert('As estatísticas são reiniciadas automaticamente ao avançar para a próxima temporada. O histórico de carreira permanece salvo.');
  }

  function card(label,value,detail,status='') {
    return `<div class="card stat-card ${status}"><span>${label}</span><strong>${value}</strong><small>${detail}</small></div>`;
  }

  function progress(value) { return `<div class="progress"><span style="width:${C.clamp(value,0,100)}%"></span></div>`; }
  function statusPill(text,tone='good') { return `<span class="status ${tone}">${text}</span>`; }
  function formatForm(team) { return team.formSequence.length ? team.formSequence.map(item=>`<span class="form-dot ${item.toLowerCase()}">${item}</span>`).join('') : '<span class="muted">—</span>'; }

  function render() {
    document.querySelector('#season-label').textContent = state?.season || 2026;
    document.querySelector('#club-badge').textContent = state?.userTeam?.short || 'FM';
    document.querySelector('#page-title').textContent = viewTitles[currentView] || 'FutMaster';
    if (!state) {
      root.innerHTML = `<div class="empty-state"><div class="brand-mark large">FM</div><h2>Comece sua carreira</h2><p>Administre futebol, base, torcida, estádio, finanças e todos os departamentos.</p><button class="primary-button" data-action="open-new-game">Criar carreira</button></div>`;
      return;
    }
    const views = {dashboard:renderDashboard,calendar:renderCalendar,squad:renderSquad,academy:renderAcademy,staff:renderStaff,board:renderBoard,fans:renderFans,stadium:renderStadium,commercial:renderCommercial,tactics:renderTactics,league:renderLeague,transfers:renderTransfers,medical:renderMedical,facilities:renderFacilities,finance:renderFinance,world:renderWorld,history:renderHistory};
    (views[currentView] || renderDashboard)();
  }

  function renderDashboard() {
    const table = standings();
    const position = table.findIndex(team => team.id === state.userTeamId)+1;
    const nextFixture = state.fixtures[state.round]?.find(match => [match.home,match.away].includes(state.userTeamId));
    const nextOpponent = nextFixture ? teamById(nextFixture.home===state.userTeamId?nextFixture.away:nextFixture.home) : null;
    const members = state.fans.membershipPlans.reduce((sum,plan)=>sum+plan.members,0);
    const delegated = Object.values(state.departments).filter(department=>department.delegated&&department.staff).length;
    root.innerHTML = `
      <div class="grid grid-4">
        ${card('Posição',`${position}º de ${state.teams.length}`,`Overall efetivo ${C.calculateTeamOverall(state.userTeam)}`)}
        ${card('Caixa',C.money(state.finance.balance),`Transferências: ${C.money(state.finance.transferBudget)}`,state.finance.balance<0?'danger-card':'')}
        ${card('Sócios',members.toLocaleString('pt-BR'),`Satisfação ${state.fans.satisfaction}%`)}
        ${card('Automação',state.automation.mode==='full'?'Total':state.automation.mode==='assisted'?'Assistida':'Manual',`${delegated}/8 áreas delegadas`)}
      </div>
      <div class="card hero section-gap">
        <div><span class="eyebrow">Semana ${state.week} · Rodada ${Math.min(state.round+1,state.fixtures.length)}/${state.fixtures.length}</span><h2>${nextOpponent?`${nextFixture.home===state.userTeamId?'Casa':'Fora'} contra ${nextOpponent.name}`:'Temporada concluída'}</h2><p>${nextOpponent?'A partida será calculada jogador por jogador, com tática, moral, físico, forma, entrosamento, eventos e variação de desempenho.':'Finalize a temporada e avance para o próximo ano.'}</p></div>
        <div class="button-row">${state.round<state.fixtures.length?'<button class="secondary-button" data-action="simulate-month">Simular 4 semanas</button><button class="primary-button" data-action="simulate-week">Avançar uma semana</button>':'<button class="primary-button" data-action="next-season">Iniciar próxima temporada</button>'}</div>
      </div>
      <div class="grid grid-2 section-gap">
        <div class="card"><div class="card-header"><h2>Resumo esportivo</h2><button class="small-button" data-action="auto-lineup">Escalação ideal</button></div>
          <div class="metric-list">
            <div><span>Moral do elenco</span><b>${state.userTeam.morale}%</b>${progress(state.userTeam.morale)}</div>
            <div><span>Entrosamento</span><b>${state.userTeam.chemistry}%</b>${progress(state.userTeam.chemistry)}</div>
            <div><span>Confiança da diretoria</span><b>${state.board.confidence}%</b>${progress(state.board.confidence)}</div>
            <div><span>Pressão da torcida</span><b>${state.fans.supporterPressure}%</b>${progress(state.fans.supporterPressure)}</div>
          </div>
        </div>
        <div class="card"><h2>Últimas notícias</h2>${state.news.slice(0,6).map(item=>`<div class="list-item stacked"><span>${item.category} · S${item.week}</span><b>${item.text}</b></div>`).join('')||'<p class="muted">Nenhuma notícia.</p>'}</div>
      </div>
      ${state.matchHistory[0]?renderCompactMatch(state.matchHistory[0]):''}
    `;
  }

  function renderCompactMatch(match) {
    return `<div class="card section-gap"><div class="card-header"><div><span class="eyebrow">Última partida</span><h2>${match.homeName} ${match.homeGoals} x ${match.awayGoals} ${match.awayName}</h2><p>xG ${match.stats.xg[0]}–${match.stats.xg[1]} · Finalizações ${match.stats.shots[0]}–${match.stats.shots[1]} · Posse ${match.stats.possession[0]}%–${match.stats.possession[1]}%</p></div><button class="secondary-button" data-id="${match.id}" data-action="match-report">Ver súmula</button></div></div>`;
  }

  function renderCalendar() {
    root.innerHTML = `<div class="card"><div class="card-header"><div><h2>Calendário da liga</h2><p class="muted">Cada rodada simula todas as partidas e mantém os demais clubes ativos.</p></div><button class="primary-button" data-action="simulate-week" ${state.round>=state.fixtures.length?'disabled':''}>Avançar rodada</button></div>
      <div class="calendar-list">${state.fixtures.map((round,index)=>`<div class="calendar-round ${index===state.round?'current':''}"><h3>Rodada ${index+1} ${index===state.round?statusPill('Próxima'):index<state.round?statusPill('Concluída'):''}</h3>${round.map(fixture=>{
        const played=state.matchHistory.find(match=>match.round===index+1&&match.homeId===fixture.home&&match.awayId===fixture.away);
        const home=teamById(fixture.home),away=teamById(fixture.away);
        return `<div class="fixture ${[fixture.home,fixture.away].includes(state.userTeamId)?'user-fixture':''}"><span>${home.short}</span><b>${played?`${played.homeGoals} x ${played.awayGoals}`:'— x —'}</b><span>${away.short}</span>${played?`<button class="tiny-button" data-id="${played.id}" data-action="match-report">Súmula</button>`:''}</div>`;
      }).join('')}</div>`).join('')}</div></div>`;
  }

  function renderSquad() {
    const sorted=[...state.userTeam.squad].sort((a,b)=>Number(b.starter)-Number(a.starter)||b.overall-a.overall);
    root.innerHTML = `<div class="card"><div class="card-header"><div><h2>Elenco profissional</h2><p class="muted">O overall é calculado a partir dos atributos relevantes para cada posição.</p></div><button class="primary-button" data-action="auto-lineup">Selecionar melhores</button></div>
      <div class="table-wrap"><table><thead><tr><th>Status</th><th>Jogador</th><th>Pos.</th><th>OVR/POT</th><th>Forma</th><th>Moral</th><th>Físico</th><th>Contrato</th><th>Salário</th><th>Ações</th></tr></thead><tbody>${sorted.map(player=>`<tr class="${player.starter?'user-row':''}"><td>${player.injuredWeeks?statusPill(`${player.injuredWeeks} sem.`,'danger'):player.suspensionMatches?statusPill('Suspenso','warning'):player.starter?statusPill('Titular'):statusPill('Reserva','neutral')}</td><td><b>${player.name}</b><small>${player.personality} · ${player.foot}</small></td><td>${player.position}</td><td><b>${player.overall}</b> / ${player.potential}</td><td>${player.form}</td><td>${player.morale}%</td><td>${player.fitness}%</td><td>${player.contractYears} ano(s)</td><td>${C.money(player.wage)}/sem.</td><td><div class="inline-actions"><button class="tiny-button" data-id="${player.id}" data-action="renew-contract">Renovar</button><button class="tiny-button" data-id="${player.id}" data-action="list-player">${player.transferListed?'Retirar':'Listar'}</button></div></td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function renderAcademy() {
    root.innerHTML = `<div class="grid grid-3">${Object.entries(state.userTeam.academy).map(([category,players])=>`<div class="card"><h2>${category}</h2><p>${players.length} atletas · média ${C.round(players.reduce((sum,p)=>sum+p.overall,0)/Math.max(1,players.length),1)}</p>${[...players].sort((a,b)=>b.potential-a.potential).slice(0,8).map(player=>`<div class="prospect" data-id="${player.id}"><div><b>${player.name}</b><small>${player.position} · ${player.age} anos · ${player.overall}/${player.potential}</small></div><div class="inline-actions"><select data-setting="development-focus" data-player="${player.id}"><option ${player.developmentFocus==='Equilibrado'?'selected':''}>Equilibrado</option><option ${player.developmentFocus==='Finalização'?'selected':''}>Finalização</option><option ${player.developmentFocus==='Passe'?'selected':''}>Passe</option><option ${player.developmentFocus==='Defesa'?'selected':''}>Defesa</option><option ${player.developmentFocus==='Físico'?'selected':''}>Físico</option><option ${player.developmentFocus==='Goleiro'?'selected':''}>Goleiro</option></select><button class="tiny-button" data-action="promote-youth">Promover</button></div></div>`).join('')}</div>`).join('')}</div>`;
  }

  function renderStaff() {
    root.innerHTML = `<div class="card control-center"><div><span class="eyebrow">Controle do clube</span><h2>Automação geral e por setor</h2><p>Contrate um responsável, defina autonomia e delegue somente o que desejar.</p></div><div class="automation-controls"><label>Modo<select data-setting="automation-mode"><option value="manual" ${state.automation.mode==='manual'?'selected':''}>Manual</option><option value="assisted" ${state.automation.mode==='assisted'?'selected':''}>Assistido</option><option value="full" ${state.automation.mode==='full'?'selected':''}>Automático geral</option></select></label><label class="checkbox"><input type="checkbox" data-setting="auto-hire" ${state.automation.autoHire?'checked':''}> Contratar automaticamente quando faltar responsável</label><button class="primary-button" data-action="hire-board">Montar diretoria completa</button></div></div>
      <div class="department-grid section-gap">${Object.entries(state.departments).map(([id,department])=>`<div class="card department-card" data-id="${id}"><div class="card-header"><div><h3>${department.name}</h3><small>${department.focus}</small></div>${statusPill(department.delegated?'Delegado':'Manual',department.delegated?'good':'neutral')}</div>${department.staff?`<div class="staff-profile"><b>${department.staff.name}</b><span>${department.staff.role}</span><small>Competência ${department.staff.skill} · ${department.staff.personality} · ${C.money(department.staff.salary)}/sem.</small></div><p class="decision">${department.lastDecision}</p><label>Política<select data-setting="department-policy" data-department="${id}"><option ${department.policy==='Conservadora'?'selected':''}>Conservadora</option><option ${department.policy==='Equilibrada'?'selected':''}>Equilibrada</option><option ${department.policy==='Agressiva'?'selected':''}>Agressiva</option></select></label><label>Autonomia ${department.autonomy}%<input type="range" min="20" max="100" value="${department.autonomy}" data-setting="department-autonomy" data-department="${id}"></label><div class="button-row"><button class="secondary-button" data-action="toggle-delegation">${department.delegated?'Assumir controle':'Delegar área'}</button><button class="danger-button" data-action="fire-staff">Demitir</button></div>`:`<p class="muted">Nenhum ${department.role.toLowerCase()} contratado.</p><button class="secondary-button" data-action="toggle-delegation">Marcar para delegação</button>`}</div>`).join('')}</div>
      <div class="card section-gap"><h2>Profissionais disponíveis</h2><div class="grid grid-3">${state.staffMarket.slice().sort((a,b)=>b.skill-a.skill).map(staff=>`<div class="market-card" data-id="${staff.id}"><div><b>${staff.name}</b><small>${staff.role} · Competência ${staff.skill} · ${staff.personality}</small></div><div><b>${C.money(staff.signingFee)}</b><small>${C.money(staff.salary)}/sem.</small><button class="primary-button" data-action="hire-staff">Contratar</button></div></div>`).join('')}</div></div>`;
  }

  function renderBoard() {
    root.innerHTML = `<div class="grid grid-4">${card('Confiança',`${state.board.confidence}%`,'Risco de demissão e apoio ao projeto')}${card('Meta esportiva',state.board.objectives[0].target,`Progresso ${state.board.objectives[0].progress}%`)}${card('Risco financeiro',`${state.finance.boardRisk}%`,state.finance.financialFairPlay.status)}${card('Títulos',state.records.titles,'Histórico da carreira')}</div><div class="card section-gap"><h2>Objetivos da direção</h2>${state.board.objectives.map(objective=>`<div class="objective"><div><b>${objective.name}</b><span>${objective.target}</span></div><strong>${objective.progress}%</strong>${progress(objective.progress)}</div>`).join('')}</div>`;
  }

  function renderFans() {
    const totalMembers=state.fans.membershipPlans.reduce((sum,plan)=>sum+plan.members,0);
    root.innerHTML = `<div class="grid grid-4">${card('Base de torcedores',state.fans.fanBase.toLocaleString('pt-BR'),`${state.fans.socialFollowers.toLocaleString('pt-BR')} seguidores`)}${card('Sócios ativos',totalMembers.toLocaleString('pt-BR'),`${C.money(Systems.membershipWeeklyRevenue(state))}/semana`)}${card('Satisfação',`${state.fans.satisfaction}%`,`Fidelidade ${state.fans.loyalty}%`)}${card('Pressão',`${state.fans.supporterPressure}%`,`Organizadas ${state.fans.organizedSupporters}%`)}</div><div class="grid grid-3 section-gap">${state.fans.membershipPlans.map(plan=>`<div class="card"><h2>${plan.name}</h2><strong class="big-number">${plan.members.toLocaleString('pt-BR')}</strong><small>assinantes · inadimplência ${(plan.delinquency*100).toFixed(1)}%</small><label>Mensalidade<input type="number" min="10" max="600" value="${plan.price}" data-setting="membership-price" data-plan="${plan.id}"></label><p>Receita líquida: <b>${C.money(plan.members*plan.price*(1-plan.delinquency))}/mês</b></p></div>`).join('')}</div><div class="card section-gap"><button class="primary-button" data-action="launch-campaign">Lançar campanha de sócios</button></div>`;
  }

  function renderStadium() {
    const operation=state.stadium.lastMatchOperations;
    root.innerHTML = `<div class="grid grid-4">${card('Capacidade',state.stadium.capacity.toLocaleString('pt-BR'),state.stadium.name)}${card('Último público',(operation?.attendance||0).toLocaleString('pt-BR'),operation?`${operation.occupancy}% de ocupação`:'Sem jogo em casa')}${card('Bilheteria',C.money(operation?.ticketRevenue||0),'Última partida em casa')}${card('Resultado do jogo',C.money(operation?.net||0),'Receitas menos operação')}</div><div class="grid grid-2 section-gap"><div class="card"><h2>Setores e preços</h2>${state.stadium.sectors.map(sector=>{const sale=operation?.sectorSales?.find(item=>item.id===sector.id);return `<div class="sector"><div><b>${sector.name}</b><small>${sector.capacity.toLocaleString('pt-BR')} lugares ${sale?`· ${sale.occupancy}% ocupados`:''}</small></div><label>R$ <input type="number" min="10" max="1500" value="${sector.price}" data-setting="ticket-price" data-sector="${sector.id}"></label></div>`;}).join('')}</div><div class="card"><h2>Operação</h2>${['pitchQuality','safety','cleanliness','transport','parking','foodQuality'].map(key=>`<div class="metric-line"><span>${{pitchQuality:'Gramado',safety:'Segurança',cleanliness:'Limpeza',transport:'Transporte',parking:'Estacionamento',foodQuality:'Alimentação'}[key]}</span><b>${state.stadium[key]}%</b>${progress(state.stadium[key])}</div>`).join('')}</div></div>`;
  }

  function renderCommercial() {
    root.innerHTML = `<div class="grid grid-4">${card('Valor da marca',C.money(state.commercial.brandValue),`Mídia ${state.commercial.mediaReputation}`)}${card('Patrocinador',state.commercial.sponsor.name,C.money(state.commercial.sponsor.weeklyValue)+'/semana')}${card('Alcance global',state.commercial.globalReach.toLocaleString('pt-BR'),'Índice internacional')}${card('Seguidores',state.fans.socialFollowers.toLocaleString('pt-BR'),'Base digital')}</div>`;
  }

  function renderTactics() {
    const lineup=C.selectBestLineup(state.userTeam,state.userTeam.tactics.formation);
    root.innerHTML = `<div class="grid grid-2"><div class="card"><h2>Plano de jogo</h2><label>Formação<select data-setting="formation">${['4-2-3-1','4-3-3','4-4-2','3-5-2','5-4-1'].map(value=>`<option ${state.userTeam.tactics.formation===value?'selected':''}>${value}</option>`).join('')}</select></label><label>Mentalidade<select data-setting="mentality">${['Muito defensiva','Defensiva','Equilibrada','Ofensiva','Muito ofensiva'].map(value=>`<option ${state.userTeam.tactics.mentality===value?'selected':''}>${value}</option>`).join('')}</select></label>${rangeControl('Pressão','pressing',state.userTeam.tactics.pressing)}${rangeControl('Ritmo','tempo',state.userTeam.tactics.tempo)}${rangeControl('Amplitude','width',state.userTeam.tactics.width)}${rangeControl('Linha defensiva','defensiveLine',state.userTeam.tactics.defensiveLine)}</div><div class="pitch"><div class="pitch-title">${state.userTeam.tactics.formation} · OVR ${C.calculateTeamOverall(state.userTeam)}</div>${lineup.starters.map((entry,index)=>`<span style="left:${pitchCoordinates(index).x}%;top:${pitchCoordinates(index).y}%">${entry.assignedPosition}<small>${entry.player.name.split(' ')[0]} · ${C.round(C.calculatePlayerEffectiveRating(entry.player,entry.assignedPosition),0)}</small></span>`).join('')}</div></div>`;
  }

  function rangeControl(label,setting,value){return `<label>${label}: <b>${value}</b><input type="range" min="20" max="90" value="${value}" data-setting="${setting}"></label>`;}
  function pitchCoordinates(index){const coords=[[50,90],[16,72],[39,72],[61,72],[84,72],[32,52],[68,52],[16,31],[50,33],[84,31],[50,12]];return {x:coords[index]?.[0]||50,y:coords[index]?.[1]||50};}

  function renderLeague() {
    root.innerHTML = `<div class="card"><div class="card-header"><h2>Liga Nacional</h2><button class="primary-button" data-action="simulate-week" ${state.round>=state.fixtures.length?'disabled':''}>Jogar próxima rodada</button></div><div class="table-wrap"><table><thead><tr><th>#</th><th>Clube</th><th>OVR</th><th>J</th><th>V</th><th>E</th><th>D</th><th>SG</th><th>PTS</th><th>Forma</th></tr></thead><tbody>${standings().map((team,index)=>`<tr class="${team.id===state.userTeamId?'user-row':''}"><td>${index+1}</td><td><b>${team.name}</b></td><td>${C.calculateTeamOverall(team)}</td><td>${team.played}</td><td>${team.wins}</td><td>${team.draws}</td><td>${team.losses}</td><td>${team.gf-team.ga}</td><td><b>${team.points}</b></td><td>${formatForm(team)}</td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function renderTransfers() {
    root.innerHTML = `<div class="grid grid-4">${card('Orçamento',C.money(state.finance.transferBudget),'Disponível para taxas')}${card('Folha atual',C.money(Systems.squadWages(state.userTeam)),`Limite ${C.money(state.finance.wageBudget)}`)}${card('Listados',state.userTeam.squad.filter(p=>p.transferListed).length,'Atletas disponíveis')}${card('Relatórios',state.market.length,'Precisão pelo scouting')}</div><div class="card section-gap"><h2>Mercado</h2><div class="table-wrap"><table><thead><tr><th>Jogador</th><th>Clube</th><th>Pos.</th><th>OVR/POT</th><th>Conhecimento</th><th>Valor</th><th></th></tr></thead><tbody>${state.market.sort((a,b)=>b.overall-a.overall).map(player=>`<tr data-id="${player.id}"><td><b>${player.name}</b><small>${player.nationality} · ${player.age} anos</small></td><td>${player.clubName||'Livre'}</td><td>${player.position}</td><td>${player.scoutKnowledge>55?`${player.overall}/${player.potential}`:`${player.overall-3}–${player.overall+3} / ?`}</td><td>${player.scoutKnowledge}%</td><td>${C.money(player.askingPrice)}</td><td><button class="primary-button" data-action="buy-player">Contratar</button></td></tr>`).join('')}</tbody></table></div></div>`;
  }

  function renderMedical() {
    const injured=state.userTeam.squad.filter(player=>player.injuredWeeks>0);
    root.innerHTML = `<div class="grid grid-4">${card('Lesionados',injured.length,'Elenco profissional')}${card('Centro médico',`Nível ${state.facilities.medical.level}`,'Recuperação e prevenção')}${card('Chefe médico',state.departments.medical.staff?.name||'Não contratado',state.departments.medical.staff?`Competência ${state.departments.medical.staff.skill}`:'Gestão manual')}${card('Risco médio',`${C.round(state.userTeam.squad.reduce((sum,p)=>sum+p.injuryRisk,0)/state.userTeam.squad.length,1)}%`,'Propensão individual')}</div><div class="card section-gap"><h2>Boletim médico</h2>${injured.length?injured.map(player=>`<div class="list-item" data-id="${player.id}"><div><b>${player.name}</b><small>${player.position} · ${player.injuredWeeks} semana(s)</small></div><button class="secondary-button" data-action="treat-player">Tratamento intensivo</button></div>`).join(''):'<p>Nenhum atleta lesionado.</p>'}</div>`;
  }

  function renderFacilities() {
    root.innerHTML = `<div class="facility-grid">${Object.entries(state.facilities).map(([id,facility])=>{const cost=Math.round(facility.baseCost*Math.pow(1.48,facility.level-1));return `<div class="card"><h2>${facility.name}</h2><p>Nível ${facility.level}/${facility.max}</p>${progress(facility.level/facility.max*100)}<button class="primary-button" data-id="${id}" data-action="upgrade-facility" ${facility.level>=facility.max?'disabled':''}>Melhorar por ${C.money(cost)}</button></div>`;}).join('')}</div>`;
  }

  function renderFinance() {
    const operational=state.finance.seasonRevenue-state.finance.seasonExpenses;
    root.innerHTML = `<div class="grid grid-4">${card('Caixa',C.money(state.finance.balance),'Disponibilidade imediata')}${card('Receitas',C.money(state.finance.seasonRevenue),'Temporada')}${card('Despesas',C.money(state.finance.seasonExpenses),'Temporada')}${card('Resultado',C.money(operational),state.finance.financialFairPlay.status)}</div><div class="card section-gap"><h2>Livro-caixa</h2><div class="table-wrap"><table><tbody>${state.finance.cashFlow.slice(0,40).map(entry=>`<tr><td>S${entry.week}</td><td>${entry.category}</td><td>${entry.description}</td><td class="${entry.amount>=0?'positive':'negative'}">${C.money(entry.amount)}</td></tr>`).join('')}</tbody></table></div><button class="secondary-button" data-action="save-backup">Exportar backup</button></div>`;
  }

  function renderWorld() {
    root.innerHTML = `<div class="grid grid-3">${state.teams.filter(team=>team.id!==state.userTeamId).map(team=>`<div class="card"><div class="card-header"><div><h2>${team.name}</h2><small>${team.city} · reputação ${team.reputation}</small></div><div class="club-badge mini">${team.short}</div></div><p>Overall ${C.calculateTeamOverall(team)} · Estratégia ${team.aiStrategy}</p><p>Moral ${team.morale}% · Entrosamento ${team.chemistry}%</p></div>`).join('')}</div>`;
  }

  function renderHistory() {
    const allHistory=[...state.matchHistory,...(state.careerHistory||[])];
    if (selectedMatchId) return renderMatchReport(allHistory.find(match=>String(match.id)===String(selectedMatchId)));
    root.innerHTML = `<div class="card"><h2>Partidas da carreira</h2>${allHistory.length?allHistory.filter(match=>[match.homeId,match.awayId].includes(state.userTeamId)).map(match=>`<div class="list-item" data-id="${match.id}"><div><span>${match.season} · Rodada ${match.round}</span><b>${match.homeName} ${match.homeGoals} x ${match.awayGoals} ${match.awayName}</b><small>xG ${match.stats.xg[0]}–${match.stats.xg[1]}</small></div><button class="secondary-button" data-action="match-report">Súmula</button></div>`).join(''):'<p>Nenhuma partida disputada.</p>'}</div>`;
  }

  function renderMatchReport(match) {
    if (!match) { selectedMatchId=null; return renderHistory(); }
    root.innerHTML = `<div class="card match-report"><button class="small-button" data-action="back-history">← Voltar</button><div class="scoreboard"><div><span>${match.homeName}</span><strong>${match.homeGoals}</strong><small>Dia ${match.performance.homeDay}</small></div><b>x</b><div><span>${match.awayName}</span><strong>${match.awayGoals}</strong><small>Dia ${match.performance.awayDay}</small></div></div><div class="match-stats"><div><b>${match.stats.possession[0]}%</b><span>Posse</span><b>${match.stats.possession[1]}%</b></div><div><b>${match.stats.shots[0]}</b><span>Finalizações</span><b>${match.stats.shots[1]}</b></div><div><b>${match.stats.xg[0]}</b><span>xG</span><b>${match.stats.xg[1]}</b></div></div></div><div class="grid grid-2 section-gap"><div class="card"><h2>Lances</h2>${match.events.map(event=>`<div class="timeline-event ${event.type}"><b>${event.minute}'</b><span>${event.text}</span></div>`).join('')}</div><div class="card"><h2>Notas</h2>${renderRatingList(match.playerRatings.home,match.homeName)}${renderRatingList(match.playerRatings.away,match.awayName)}</div></div>`;
  }

  function renderRatingList(ratings,teamName){return `<h3>${teamName}</h3>${ratings.sort((a,b)=>b.rating-a.rating).slice(0,12).map(stat=>`<div class="rating-line"><span>${stat.name}${stat.goals?` ⚽${stat.goals}`:''}</span><b class="rating ${stat.rating>=7.5?'high':stat.rating<6?'low':''}">${stat.rating}</b></div>`).join('')}`;}

  render();
})();
