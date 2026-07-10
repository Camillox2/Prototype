(function (global) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const round = (value, decimals = 0) => Number(value.toFixed(decimals));
  const random = (min, max) => min + Math.random() * (max - min);
  const randomInt = (min, max) => Math.floor(random(min, max + 1));
  const pick = list => list[Math.floor(Math.random() * list.length)];
  const chance = probability => Math.random() < probability;
  const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

  function gaussian(mean = 0, standardDeviation = 1) {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return mean + standardDeviation * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function weightedPick(items, weightSelector) {
    const weights = items.map(item => Math.max(0, weightSelector(item)));
    const total = weights.reduce((sum, value) => sum + value, 0);
    if (!total) return pick(items);
    let cursor = Math.random() * total;
    for (let index = 0; index < items.length; index += 1) {
      cursor -= weights[index];
      if (cursor <= 0) return items[index];
    }
    return items.at(-1);
  }

  const money = value => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    notation: Math.abs(value) >= 1_000_000 ? 'compact' : 'standard',
    maximumFractionDigits: Math.abs(value) >= 1_000_000 ? 1 : 0
  }).format(value);

  const firstNames = ['Lucas','Rafael','Gabriel','Matheus','João','Pedro','Bruno','Caio','Henrique','Arthur','Vitor','Luan','Diego','Felipe','Thiago','André','Eduardo','Murilo','Gustavo','Renan','Daniel','Marcos','Igor','Vinícius','Samuel','Leonardo','Davi','Nicolas','Wesley','Alex'];
  const lastNames = ['Silva','Souza','Lima','Costa','Santos','Rocha','Mendes','Ribeiro','Gomes','Martins','Almeida','Pereira','Cardoso','Barbosa','Moreira','Carvalho','Nunes','Reis','Freitas','Castro','Fernandes','Oliveira','Vieira','Teixeira','Correia','Moura','Pires','Farias','Batista','Cavalcante'];
  const personalities = ['Profissional','Ambicioso','Leal','Líder','Temperamental','Reservado','Determinado','Inconstante','Mercenário','Tranquilo'];
  const footedness = ['Destro','Canhoto','Ambidestro'];
  const positions = ['GOL','LD','ZAG','ZAG','LE','VOL','MC','MC','MEI','PD','PE','ATA','GOL','ZAG','LD','LE','VOL','MC','MEI','PD','PE','ATA','ATA','ZAG','MC'];

  const attributeNames = [
    'finalizacao','passe','passeLongo','cruzamento','drible','dominio','marcacao','desarme','cabecalho','bolaParada',
    'velocidade','aceleracao','forca','impulsao','resistencia','agilidade','equilibrio',
    'decisao','posicionamento','antecipacao','visao','concentracao','frieza','trabalhoEquipe','lideranca','determinacao','agressividade','disciplina','regularidade',
    'reflexo','defesaGol','saidaGol','jogoAereo','reposicao','umContraUm'
  ];

  const positionalWeights = {
    GOL: {reflexo:0.19,defesaGol:0.17,posicionamento:0.13,concentracao:0.11,saidaGol:0.10,jogoAereo:0.09,umContraUm:0.09,reposicao:0.06,decisao:0.04,frieza:0.02},
    LD: {velocidade:0.13,resistencia:0.12,marcacao:0.11,desarme:0.10,cruzamento:0.10,posicionamento:0.09,passe:0.08,antecipacao:0.07,aceleracao:0.07,trabalhoEquipe:0.07,decisao:0.06},
    LE: {velocidade:0.13,resistencia:0.12,marcacao:0.11,desarme:0.10,cruzamento:0.10,posicionamento:0.09,passe:0.08,antecipacao:0.07,aceleracao:0.07,trabalhoEquipe:0.07,decisao:0.06},
    ZAG: {marcacao:0.15,desarme:0.14,posicionamento:0.13,antecipacao:0.11,cabecalho:0.10,forca:0.09,concentracao:0.08,impulsao:0.07,decisao:0.06,disciplina:0.04,passe:0.03},
    VOL: {marcacao:0.12,desarme:0.12,posicionamento:0.10,antecipacao:0.09,passe:0.10,resistencia:0.09,decisao:0.09,trabalhoEquipe:0.08,concentracao:0.07,forca:0.06,visao:0.04,passeLongo:0.04},
    MC: {passe:0.13,visao:0.11,decisao:0.10,dominio:0.09,resistencia:0.09,trabalhoEquipe:0.08,posicionamento:0.07,antecipacao:0.06,passeLongo:0.07,drible:0.06,concentracao:0.06,marcacao:0.04,desarme:0.04},
    MEI: {passe:0.13,visao:0.13,drible:0.11,dominio:0.10,decisao:0.10,frieza:0.08,finalizacao:0.08,passeLongo:0.06,aceleracao:0.05,bolaParada:0.05,trabalhoEquipe:0.05,regularidade:0.06},
    PD: {velocidade:0.13,aceleracao:0.12,drible:0.12,dominio:0.10,cruzamento:0.09,finalizacao:0.09,decisao:0.08,agilidade:0.08,frieza:0.06,passe:0.06,visao:0.04,resistencia:0.03},
    PE: {velocidade:0.13,aceleracao:0.12,drible:0.12,dominio:0.10,cruzamento:0.09,finalizacao:0.09,decisao:0.08,agilidade:0.08,frieza:0.06,passe:0.06,visao:0.04,resistencia:0.03},
    ATA: {finalizacao:0.17,frieza:0.13,posicionamento:0.12,antecipacao:0.10,dominio:0.08,decisao:0.08,cabecalho:0.08,aceleracao:0.07,velocidade:0.06,forca:0.05,impulsao:0.03,regularidade:0.03}
  };

  const positionGroups = {
    GOL: ['GOL'],
    DEF: ['LD','LE','ZAG'],
    MID: ['VOL','MC','MEI'],
    ATT: ['PD','PE','ATA']
  };

  function groupOf(position) {
    return Object.entries(positionGroups).find(([, values]) => values.includes(position))?.[0] || 'MID';
  }

  function positionCompatibility(natural, assigned) {
    if (natural === assigned) return 1;
    if (groupOf(natural) === groupOf(assigned)) return 0.90;
    if ((natural === 'MEI' && ['PD','PE'].includes(assigned)) || (assigned === 'MEI' && ['PD','PE'].includes(natural))) return 0.86;
    if ((natural === 'VOL' && assigned === 'ZAG') || (natural === 'ZAG' && assigned === 'VOL')) return 0.83;
    if (natural === 'GOL' || assigned === 'GOL') return 0.35;
    return 0.72;
  }

  function calculateOverall(player, assignedPosition = player.position) {
    const weights = positionalWeights[assignedPosition] || positionalWeights.MC;
    const raw = Object.entries(weights).reduce((sum, [attribute, weight]) => sum + (player.attributes[attribute] || 50) * weight, 0);
    const compatibility = positionCompatibility(player.position, assignedPosition);
    return clamp(Math.round(raw * compatibility), 1, 99);
  }

  function attributeBaseForPosition(position, attribute) {
    const weight = positionalWeights[position]?.[attribute] || 0;
    if (weight >= 0.13) return 11;
    if (weight >= 0.09) return 7;
    if (weight >= 0.05) return 3;
    if (position === 'GOL' && !['reflexo','defesaGol','saidaGol','jogoAereo','reposicao','umContraUm','posicionamento','concentracao','decisao','frieza'].includes(attribute)) return -18;
    return 0;
  }

  function createAttributes(position, baseRating, seedOffset = 0) {
    const attributes = {};
    attributeNames.forEach((attribute, index) => {
      const positionBoost = attributeBaseForPosition(position, attribute);
      const deterministicWave = Math.sin((index + 1) * (seedOffset + 3.17)) * 4;
      attributes[attribute] = clamp(Math.round(baseRating + positionBoost + deterministicWave + gaussian(0, 5.2)), 20, 96);
    });
    return attributes;
  }

  function wageFromOverall(overall, age) {
    const ageFactor = age < 22 ? 0.78 : age > 31 ? 0.83 : 1;
    return Math.round(Math.pow(overall / 50, 4.2) * 5_000 * ageFactor / 1000) * 1000;
  }

  function valueFromPlayer(overall, potential, age) {
    const ageFactor = age <= 21 ? 1.35 : age <= 27 ? 1.1 : age <= 30 ? 0.88 : age <= 33 ? 0.58 : 0.30;
    const potentialFactor = 1 + Math.max(0, potential - overall) / 55;
    return Math.max(80_000, Math.round(Math.pow(overall / 50, 5.1) * 500_000 * ageFactor * potentialFactor / 10_000) * 10_000);
  }

  function createPlayer(seed, index, options = {}) {
    const youth = Boolean(options.youth);
    const position = options.position || positions[index % positions.length];
    const age = options.age ?? (youth ? randomInt(14, 19) : randomInt(18, 34));
    const clubLevel = options.clubLevel ?? 68;
    const ageCurve = age <= 21 ? -4 : age <= 29 ? 1 : age <= 32 ? -1 : -5;
    const baseRating = clamp(Math.round(clubLevel + ageCurve + gaussian(0, youth ? 8 : 6)), youth ? 38 : 48, 91);
    const attributes = createAttributes(position, baseRating - 7, seed * 100 + index);
    const player = {
      id: uid('player'),
      name: `${firstNames[(seed * 7 + index * 3) % firstNames.length]} ${lastNames[(seed * 11 + index * 5) % lastNames.length]}`,
      position,
      secondaryPositions: [],
      foot: index % 11 === 0 ? 'Ambidestro' : footedness[(seed + index) % 2],
      age,
      nationality: options.nationality || 'Brasil',
      attributes,
      potential: clamp(Math.round(baseRating + (youth ? random(8, 27) : random(-2, 13))), baseRating, 96),
      fitness: randomInt(82, 100),
      sharpness: randomInt(58, 92),
      morale: randomInt(62, 88),
      form: round(random(5.7, 7.3), 2),
      chemistry: randomInt(55, 86),
      happiness: randomInt(60, 88),
      personality: personalities[(seed + index * 2) % personalities.length],
      reputation: clamp(baseRating + randomInt(-8, 8), 30, 95),
      injuryRisk: clamp(randomInt(3, 18) + (age > 31 ? 5 : 0), 1, 35),
      injuredWeeks: 0,
      suspensionMatches: 0,
      yellowCards: 0,
      redCards: 0,
      goals: 0,
      assists: 0,
      appearances: 0,
      minutes: 0,
      averageRating: 0,
      contractYears: youth ? randomInt(2, 4) : randomInt(1, 5),
      promisedRole: options.promisedRole || (baseRating > clubLevel + 6 ? 'Titular' : 'Rotação'),
      squadRole: 'Reserva',
      starter: false,
      transferListed: false,
      loanListed: false,
      developmentFocus: 'Equilibrado',
      history: []
    };
    player.overall = calculateOverall(player, position);
    player.wage = options.wage ?? wageFromOverall(player.overall, age);
    player.value = options.value ?? valueFromPlayer(player.overall, player.potential, age);
    return player;
  }

  function generateSquad(seed, clubLevel, size = 25) {
    const squad = Array.from({length:size}, (_, index) => createPlayer(seed, index, {clubLevel}));
    ensurePositionCoverage(squad, seed, clubLevel);
    return squad;
  }

  function ensurePositionCoverage(squad, seed, clubLevel) {
    const required = ['GOL','GOL','LD','LE','ZAG','ZAG','ZAG','VOL','MC','MC','MEI','PD','PE','ATA','ATA'];
    required.forEach((position, index) => {
      if (squad.filter(player => player.position === position).length < required.slice(0, index + 1).filter(p => p === position).length) {
        squad[index] = createPlayer(seed + 99, index, {clubLevel, position});
      }
    });
  }

  function generateAcademy(seed, clubLevel) {
    return {
      'Sub-20': Array.from({length:16}, (_, index) => createPlayer(seed + 200, index, {clubLevel: clubLevel - 16, youth:true, age:randomInt(17,19)})),
      'Sub-17': Array.from({length:16}, (_, index) => createPlayer(seed + 300, index, {clubLevel: clubLevel - 22, youth:true, age:randomInt(15,17)})),
      'Sub-15': Array.from({length:14}, (_, index) => createPlayer(seed + 400, index, {clubLevel: clubLevel - 28, youth:true, age:randomInt(14,15)}))
    };
  }

  const clubTemplates = [
    {id:'curitiba',name:'Curitiba Athletic',short:'CTA',city:'Curitiba',strength:78,budget:18_000_000,capacity:36_000,reputation:76},
    {id:'porto',name:'Porto Azul',short:'PAZ',city:'Porto Alegre',strength:76,budget:15_000_000,capacity:31_000,reputation:73},
    {id:'serra',name:'Serra Verde',short:'SVR',city:'Caxias do Sul',strength:72,budget:12_000_000,capacity:25_000,reputation:68},
    {id:'litoral',name:'Litoral FC',short:'LFC',city:'Santos',strength:70,budget:10_000_000,capacity:24_000,reputation:66},
    {id:'capital',name:'Capital União',short:'CAP',city:'Brasília',strength:77,budget:17_000_000,capacity:34_000,reputation:74},
    {id:'interior',name:'Interior Clube',short:'INT',city:'Campinas',strength:68,budget:8_000_000,capacity:19_000,reputation:61},
    {id:'mineiro',name:'Minas Imperial',short:'MIN',city:'Belo Horizonte',strength:80,budget:22_000_000,capacity:42_000,reputation:81},
    {id:'nordeste',name:'Nordeste Real',short:'NOR',city:'Recife',strength:74,budget:14_000_000,capacity:38_000,reputation:75},
    {id:'amazonia',name:'Amazônia Esporte',short:'AMA',city:'Manaus',strength:65,budget:7_000_000,capacity:28_000,reputation:58},
    {id:'carioca',name:'Carioca Estrela',short:'CES',city:'Rio de Janeiro',strength:83,budget:27_000_000,capacity:48_000,reputation:86}
  ];

  function createTeam(template, seed) {
    const squad = generateSquad(seed, template.strength, 25);
    return {
      ...template,
      squad,
      academy: generateAcademy(seed, template.strength),
      tactics: {
        formation: '4-2-3-1', mentality: 'Equilibrada', pressing: 55, tempo: 55, width: 55,
        defensiveLine: 50, marking: 'Zona', buildUp: 'Mista', counterAttack: true
      },
      chemistry: randomInt(58, 78),
      morale: randomInt(62, 82),
      managerQuality: randomInt(58, 84),
      trainingQuality: randomInt(50, 80),
      played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0,
      formSequence: [],
      finances: {balance:template.budget, weeklyWage:0},
      transferBudget: Math.round(template.budget * 0.62),
      wageBudget: Math.round(template.budget * 0.055),
      aiStrategy: pick(['Desenvolvimento','Equilibrado','Resultados','Venda de jovens'])
    };
  }

  function calculatePlayerEffectiveRating(player, assignedPosition = player.position, context = {}) {
    const overall = calculateOverall(player, assignedPosition);
    const fitnessFactor = 0.82 + clamp(player.fitness, 0, 100) / 555;
    const sharpnessFactor = 0.90 + clamp(player.sharpness, 0, 100) / 1000;
    const moraleFactor = 0.90 + clamp(player.morale, 0, 100) / 1000;
    const chemistryFactor = 0.93 + clamp(player.chemistry, 0, 100) / 1428;
    const formFactor = 0.91 + clamp(player.form, 4, 10) / 100;
    const pressureFactor = context.pressure && ['Temperamental','Inconstante'].includes(player.personality) ? 0.96 : 1;
    const injuryFactor = player.injuredWeeks > 0 ? 0.55 : 1;
    return clamp(overall * fitnessFactor * sharpnessFactor * moraleFactor * chemistryFactor * formFactor * pressureFactor * injuryFactor, 1, 99);
  }

  function selectBestLineup(team, formation = team.tactics?.formation || '4-2-3-1') {
    const formationSlots = {
      '4-2-3-1':['GOL','LD','ZAG','ZAG','LE','VOL','MC','PD','MEI','PE','ATA'],
      '4-3-3':['GOL','LD','ZAG','ZAG','LE','VOL','MC','MC','PD','PE','ATA'],
      '4-4-2':['GOL','LD','ZAG','ZAG','LE','MC','MC','PD','PE','ATA','ATA'],
      '3-5-2':['GOL','ZAG','ZAG','ZAG','LD','LE','VOL','MC','MEI','ATA','ATA'],
      '5-4-1':['GOL','LD','ZAG','ZAG','ZAG','LE','VOL','MC','PD','PE','ATA']
    };
    const slots = formationSlots[formation] || formationSlots['4-2-3-1'];
    const available = team.squad.filter(player => player.injuredWeeks <= 0 && player.suspensionMatches <= 0);
    const selected = [];
    slots.forEach(slot => {
      const candidates = available.filter(player => !selected.some(entry => entry.player.id === player.id));
      const player = [...candidates].sort((a, b) => calculatePlayerEffectiveRating(b, slot) - calculatePlayerEffectiveRating(a, slot))[0];
      if (player) selected.push({player, assignedPosition:slot});
    });
    const bench = available
      .filter(player => !selected.some(entry => entry.player.id === player.id))
      .sort((a,b) => calculatePlayerEffectiveRating(b) - calculatePlayerEffectiveRating(a))
      .slice(0, 9);
    return {starters:selected, bench};
  }

  function calculateTeamOverall(team) {
    const lineup = selectBestLineup(team);
    if (!lineup.starters.length) return 20;
    return round(lineup.starters.reduce((sum, entry) => sum + calculatePlayerEffectiveRating(entry.player, entry.assignedPosition), 0) / lineup.starters.length, 1);
  }

  function roundRobin(teamIds) {
    const ids = [...teamIds];
    if (ids.length % 2) ids.push(null);
    const rounds = [];
    for (let roundIndex = 0; roundIndex < ids.length - 1; roundIndex += 1) {
      const roundFixtures = [];
      for (let index = 0; index < ids.length / 2; index += 1) {
        const first = ids[index];
        const second = ids[ids.length - 1 - index];
        if (first && second) {
          roundFixtures.push(roundIndex % 2 ? {home:second,away:first} : {home:first,away:second});
        }
      }
      rounds.push(roundFixtures);
      ids.splice(1, 0, ids.pop());
    }
    return rounds.concat(rounds.map(round => round.map(match => ({home:match.away,away:match.home}))));
  }

  global.FMCore = {
    clamp, round, random, randomInt, pick, chance, uid, gaussian, weightedPick, money,
    firstNames, lastNames, personalities, positions, attributeNames, positionalWeights,
    groupOf, positionCompatibility, calculateOverall, calculatePlayerEffectiveRating,
    createPlayer, generateSquad, generateAcademy, clubTemplates, createTeam,
    selectBestLineup, calculateTeamOverall, roundRobin, valueFromPlayer, wageFromOverall
  };
})(window);
