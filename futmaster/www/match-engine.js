(function (global) {
  'use strict';

  const C = global.FMCore;

  const mentalityModifiers = {
    'Muito defensiva': {attack:-0.15, defence:0.13, tempo:-0.08},
    'Defensiva': {attack:-0.08, defence:0.08, tempo:-0.04},
    'Equilibrada': {attack:0, defence:0, tempo:0},
    'Ofensiva': {attack:0.10, defence:-0.07, tempo:0.06},
    'Muito ofensiva': {attack:0.18, defence:-0.14, tempo:0.10}
  };

  function unitStrength(lineup, group, context) {
    const entries = lineup.starters.filter(entry => C.groupOf(entry.assignedPosition) === group);
    if (!entries.length) return 35;
    return entries.reduce((sum, entry) => sum + C.calculatePlayerEffectiveRating(entry.player, entry.assignedPosition, context), 0) / entries.length;
  }

  function createMatchSide(team, isHome, context) {
    const lineup = C.selectBestLineup(team, team.tactics.formation);
    const modifier = mentalityModifiers[team.tactics.mentality] || mentalityModifiers.Equilibrada;
    const dayRoll = C.clamp(C.gaussian(1, 0.075), 0.78, 1.24);
    const rarePerformance = C.chance(0.045) ? C.random(0.82, 1.20) : 1;
    const homeFactor = isHome ? 1.035 : 1;
    const moraleFactor = 0.92 + team.morale / 1250;
    const chemistryFactor = 0.94 + team.chemistry / 1500;
    const managerFactor = 0.94 + team.managerQuality / 1600;
    const baseMultiplier = dayRoll * rarePerformance * homeFactor * moraleFactor * chemistryFactor * managerFactor;
    const attack = (unitStrength(lineup, 'ATT', context) * 0.57 + unitStrength(lineup, 'MID', context) * 0.43) * baseMultiplier * (1 + modifier.attack);
    const midfield = unitStrength(lineup, 'MID', context) * baseMultiplier;
    const defence = (unitStrength(lineup, 'DEF', context) * 0.78 + unitStrength(lineup, 'GOL', context) * 0.22) * baseMultiplier * (1 + modifier.defence);
    return {
      team, lineup, attack, midfield, defence, modifier, dayRoll, rarePerformance,
      goals:0, possession:0, shots:0, shotsOnTarget:0, xg:0, corners:0, fouls:0, yellows:0, reds:0,
      events:[], active:[...lineup.starters], bench:[...lineup.bench], substitutions:0,
      fatigue:0, tacticalMomentum:1, sentOff:[], playerStats:new Map()
    };
  }

  function statFor(side, player) {
    if (!side.playerStats.has(player.id)) {
      side.playerStats.set(player.id, {playerId:player.id,name:player.name,minutes:0,goals:0,assists:0,shots:0,keyPasses:0,tackles:0,saves:0,rating:6.4,yellow:false,red:false,injured:false});
    }
    return side.playerStats.get(player.id);
  }

  function activePlayers(side, groups) {
    return side.active.filter(entry => groups.includes(C.groupOf(entry.assignedPosition)) && !side.sentOff.includes(entry.player.id));
  }

  function choosePlayer(side, groups, attribute) {
    const candidates = activePlayers(side, groups);
    if (!candidates.length) return side.active.find(entry => !side.sentOff.includes(entry.player.id));
    return C.weightedPick(candidates, entry => (entry.player.attributes[attribute] || 50) * C.calculatePlayerEffectiveRating(entry.player, entry.assignedPosition) / 70);
  }

  function effectiveDefence(side) {
    const redPenalty = Math.pow(0.91, side.reds);
    const fatiguePenalty = 1 - side.fatigue * 0.0024;
    return side.defence * redPenalty * fatiguePenalty * side.tacticalMomentum;
  }

  function effectiveAttack(side) {
    const redPenalty = Math.pow(0.88, side.reds);
    const fatiguePenalty = 1 - side.fatigue * 0.0021;
    return side.attack * redPenalty * fatiguePenalty * side.tacticalMomentum;
  }

  function minutePossession(home, away) {
    const homeMid = home.midfield * Math.pow(0.93, home.reds) * home.tacticalMomentum;
    const awayMid = away.midfield * Math.pow(0.93, away.reds) * away.tacticalMomentum;
    const rawHome = homeMid / Math.max(1, homeMid + awayMid);
    return C.clamp(rawHome + C.gaussian(0, 0.07), 0.22, 0.78);
  }

  function addEvent(side, minute, type, text, data = {}) {
    const event = {minute,type,text,teamId:side.team.id,...data};
    side.events.push(event);
    return event;
  }

  function simulateShot(attacking, defending, minute) {
    const creator = choosePlayer(attacking, ['MID','ATT'], 'visao');
    const shooter = choosePlayer(attacking, ['ATT','MID'], 'finalizacao');
    if (!creator || !shooter) return;

    const attackPressure = effectiveAttack(attacking) / Math.max(35, effectiveDefence(defending));
    const tacticalTempo = 0.88 + attacking.team.tactics.tempo / 450;
    const pressingSpace = defending.team.tactics.pressing > 70 ? 1.04 : 1;
    const creationQuality = (creator.player.attributes.visao * 0.44 + creator.player.attributes.passe * 0.36 + creator.player.attributes.decisao * 0.20) / 100;
    const shotDifficulty = C.clamp(0.07 + attackPressure * 0.075 * creationQuality * tacticalTempo * pressingSpace, 0.035, 0.29);

    attacking.shots += 1;
    const shooterStat = statFor(attacking, shooter.player);
    shooterStat.shots += 1;
    const creatorStat = statFor(attacking, creator.player);
    creatorStat.keyPasses += C.chance(0.5) ? 1 : 0;

    const onTargetProbability = C.clamp(0.27 + shooter.player.attributes.finalizacao / 280 + shooter.player.attributes.frieza / 650 - shotDifficulty * 0.15, 0.26, 0.72);
    const onTarget = C.chance(onTargetProbability);
    const chanceXg = C.clamp(shotDifficulty * C.random(0.65, 1.45), 0.025, 0.58);
    attacking.xg += chanceXg;

    if (!onTarget) {
      if (C.chance(0.12)) {
        attacking.corners += 1;
        addEvent(attacking, minute, 'corner', `${shooter.player.name} finaliza, a bola desvia e sai para escanteio.`);
      } else if (chanceXg > 0.22 || C.chance(0.09)) {
        addEvent(attacking, minute, 'chance', `${shooter.player.name} desperdiça uma boa oportunidade.`);
      }
      return;
    }

    attacking.shotsOnTarget += 1;
    const goalkeeperEntry = activePlayers(defending, ['GOL'])[0];
    const goalkeeper = goalkeeperEntry?.player;
    const keeperQuality = goalkeeper ? (goalkeeper.attributes.reflexo * 0.42 + goalkeeper.attributes.defesaGol * 0.34 + goalkeeper.attributes.posicionamento * 0.24) / 100 : 0.32;
    const finishingQuality = (shooter.player.attributes.finalizacao * 0.48 + shooter.player.attributes.frieza * 0.28 + shooter.player.attributes.decisao * 0.14 + shooter.player.attributes.dominio * 0.10) / 100;
    const conversion = C.clamp(0.08 + chanceXg * 0.73 + (finishingQuality - keeperQuality) * 0.22, 0.035, 0.68);

    if (C.chance(conversion)) {
      attacking.goals += 1;
      shooterStat.goals += 1;
      shooterStat.rating += 0.85;
      let assist = null;
      if (creator.player.id !== shooter.player.id && C.chance(0.78)) {
        assist = creator.player;
        creatorStat.assists += 1;
        creatorStat.rating += 0.35;
      }
      addEvent(attacking, minute, 'goal', `GOL! ${shooter.player.name}${assist ? `, assistência de ${assist.name}` : ''}.`, {scorerId:shooter.player.id,assistId:assist?.id || null});
      attacking.tacticalMomentum = C.clamp(attacking.tacticalMomentum + 0.025, 0.88, 1.14);
      defending.tacticalMomentum = C.clamp(defending.tacticalMomentum - 0.02, 0.86, 1.12);
    } else {
      if (goalkeeper) {
        const keeperStat = statFor(defending, goalkeeper);
        keeperStat.saves += 1;
        keeperStat.rating += chanceXg > 0.22 ? 0.18 : 0.07;
      }
      if (chanceXg > 0.20 || C.chance(0.08)) addEvent(attacking, minute, 'save', `${goalkeeper?.name || 'O goleiro'} faz uma defesa importante após chute de ${shooter.player.name}.`);
    }
  }

  function simulateDiscipline(side, opponent, minute) {
    const tackler = choosePlayer(side, ['DEF','MID'], 'agressividade');
    if (!tackler) return;
    side.fouls += 1;
    const aggression = tackler.player.attributes.agressividade;
    const discipline = tackler.player.attributes.disciplina;
    const cardProbability = C.clamp(0.07 + aggression / 460 - discipline / 650 + side.team.tactics.pressing / 1200, 0.04, 0.31);
    if (!C.chance(cardProbability)) return;
    const stat = statFor(side, tackler.player);
    const straightRed = C.chance(C.clamp(0.008 + aggression / 5200 - discipline / 9000, 0.006, 0.038));
    if (straightRed || stat.yellow) {
      stat.red = true;
      side.reds += 1;
      side.sentOff.push(tackler.player.id);
      addEvent(side, minute, 'red', `${tackler.player.name} é expulso!`, {playerId:tackler.player.id});
    } else {
      stat.yellow = true;
      side.yellows += 1;
      addEvent(side, minute, 'yellow', `Cartão amarelo para ${tackler.player.name}.`, {playerId:tackler.player.id});
    }
  }

  function simulateInjury(side, minute) {
    const entry = C.weightedPick(side.active.filter(item => !side.sentOff.includes(item.player.id)), item => 1 + item.player.injuryRisk);
    if (!entry) return;
    const player = entry.player;
    const fatigueRisk = side.fatigue / 300;
    const probability = 0.0012 + player.injuryRisk / 22000 + fatigueRisk / 120;
    if (!C.chance(probability)) return;
    const weeks = C.chance(0.72) ? C.randomInt(1,3) : C.randomInt(4,10);
    const stat = statFor(side, player);
    stat.injured = true;
    addEvent(side, minute, 'injury', `${player.name} sente uma lesão e não consegue continuar.`, {playerId:player.id,weeks});
    substitute(side, entry, minute, 'lesão');
    player.injuredWeeks = Math.max(player.injuredWeeks, weeks);
  }

  function bestReplacement(side, outgoingEntry) {
    const available = side.bench.filter(player => !side.active.some(entry => entry.player.id === player.id));
    return [...available].sort((a,b) => C.calculatePlayerEffectiveRating(b, outgoingEntry.assignedPosition) - C.calculatePlayerEffectiveRating(a, outgoingEntry.assignedPosition))[0];
  }

  function substitute(side, outgoingEntry, minute, reason = 'opção técnica') {
    if (side.substitutions >= 5) return false;
    const replacement = bestReplacement(side, outgoingEntry);
    if (!replacement) return false;
    const index = side.active.findIndex(entry => entry.player.id === outgoingEntry.player.id);
    if (index < 0) return false;
    side.active[index] = {player:replacement, assignedPosition:outgoingEntry.assignedPosition};
    side.substitutions += 1;
    addEvent(side, minute, 'substitution', `${replacement.name} entra no lugar de ${outgoingEntry.player.name} (${reason}).`, {inId:replacement.id,outId:outgoingEntry.player.id});
    return true;
  }

  function autoSubstitutions(side, minute) {
    if (minute < 55 || side.substitutions >= 5) return;
    const candidates = side.active
      .filter(entry => !side.sentOff.includes(entry.player.id) && entry.assignedPosition !== 'GOL')
      .sort((a,b) => a.player.fitness - b.player.fitness);
    const threshold = minute > 80 ? 76 : minute > 68 ? 69 : 62;
    const outgoing = candidates.find(entry => entry.player.fitness - side.fatigue < threshold);
    if (outgoing && C.chance(0.26)) substitute(side, outgoing, minute, 'desgaste físico');
  }

  function tacticalAdjustment(side, opponent, minute) {
    if (![46, 60, 72, 82].includes(minute)) return;
    const deficit = opponent.goals - side.goals;
    if (deficit >= 1) {
      side.tacticalMomentum = C.clamp(side.tacticalMomentum + 0.04 + deficit * 0.015, 0.86, 1.15);
      side.attack *= 1.025;
      side.defence *= 0.985;
      addEvent(side, minute, 'tactic', `${side.team.name} adianta as linhas em busca do resultado.`);
    } else if (side.goals - opponent.goals >= 2 && minute >= 70) {
      side.tacticalMomentum = C.clamp(side.tacticalMomentum - 0.02, 0.88, 1.12);
      side.defence *= 1.025;
      addEvent(side, minute, 'tactic', `${side.team.name} diminui o ritmo e protege a vantagem.`);
    }
  }

  function updateMinutes(side) {
    side.active.forEach(entry => {
      if (!side.sentOff.includes(entry.player.id)) statFor(side, entry.player).minutes += 1;
    });
  }

  function finalizePlayerRatings(side) {
    return [...side.playerStats.values()].map(stat => {
      stat.rating = C.clamp(C.round(stat.rating + stat.goals * 0.35 + stat.assists * 0.18 + stat.saves * 0.025 - (stat.red ? 1.25 : 0) - (stat.yellow ? 0.08 : 0), 2), 3.5, 10);
      return stat;
    });
  }

  function simulateMatch(homeTeam, awayTeam, context = {}) {
    const home = createMatchSide(homeTeam, true, context);
    const away = createMatchSide(awayTeam, false, context);
    const allEvents = [];

    for (let minute = 1; minute <= 95; minute += 1) {
      updateMinutes(home); updateMinutes(away);
      home.fatigue += 0.72 + home.team.tactics.pressing / 145;
      away.fatigue += 0.72 + away.team.tactics.pressing / 145;
      const homePossession = minutePossession(home, away);
      home.possession += homePossession;
      away.possession += 1 - homePossession;

      const attacking = C.chance(homePossession) ? home : away;
      const defending = attacking === home ? away : home;
      const baseAttackEvent = 0.18 + attacking.team.tactics.tempo / 850 + Math.max(0, effectiveAttack(attacking) - effectiveDefence(defending)) / 750;
      if (C.chance(C.clamp(baseAttackEvent, 0.13, 0.34))) simulateShot(attacking, defending, minute);
      if (C.chance(0.105 + attacking.team.tactics.pressing / 1200)) simulateDiscipline(defending, attacking, minute);
      simulateInjury(home, minute); simulateInjury(away, minute);
      autoSubstitutions(home, minute); autoSubstitutions(away, minute);
      tacticalAdjustment(home, away, minute); tacticalAdjustment(away, home, minute);
    }

    [...home.events, ...away.events].sort((a,b) => a.minute - b.minute).forEach(event => allEvents.push(event));
    const totalPossession = home.possession + away.possession;
    const homePossessionPct = Math.round(home.possession / totalPossession * 100);
    return {
      id:C.uid('match'),
      homeId:homeTeam.id, awayId:awayTeam.id,
      homeName:homeTeam.name, awayName:awayTeam.name,
      homeShort:homeTeam.short, awayShort:awayTeam.short,
      homeGoals:home.goals, awayGoals:away.goals,
      events:allEvents,
      stats:{
        possession:[homePossessionPct,100-homePossessionPct],
        shots:[home.shots,away.shots], shotsOnTarget:[home.shotsOnTarget,away.shotsOnTarget],
        xg:[C.round(home.xg,2),C.round(away.xg,2)], corners:[home.corners,away.corners],
        fouls:[home.fouls,away.fouls], yellows:[home.yellows,away.yellows], reds:[home.reds,away.reds]
      },
      performance:{
        homeDay:C.round(home.dayRoll * home.rarePerformance,2),
        awayDay:C.round(away.dayRoll * away.rarePerformance,2),
        homeOverall:C.round((home.attack+home.midfield+home.defence)/3,1),
        awayOverall:C.round((away.attack+away.midfield+away.defence)/3,1)
      },
      playerRatings:{home:finalizePlayerRatings(home),away:finalizePlayerRatings(away)},
      injuries:allEvents.filter(event => event.type === 'injury'),
      cards:allEvents.filter(event => ['yellow','red'].includes(event.type))
    };
  }

  function applyMatchResult(result, homeTeam, awayTeam) {
    homeTeam.played += 1; awayTeam.played += 1;
    homeTeam.gf += result.homeGoals; homeTeam.ga += result.awayGoals;
    awayTeam.gf += result.awayGoals; awayTeam.ga += result.homeGoals;
    if (result.homeGoals > result.awayGoals) {
      homeTeam.wins += 1; homeTeam.points += 3; awayTeam.losses += 1;
      homeTeam.formSequence.push('V'); awayTeam.formSequence.push('D');
    } else if (result.homeGoals < result.awayGoals) {
      awayTeam.wins += 1; awayTeam.points += 3; homeTeam.losses += 1;
      awayTeam.formSequence.push('V'); homeTeam.formSequence.push('D');
    } else {
      homeTeam.draws += 1; awayTeam.draws += 1; homeTeam.points += 1; awayTeam.points += 1;
      homeTeam.formSequence.push('E'); awayTeam.formSequence.push('E');
    }
    homeTeam.formSequence = homeTeam.formSequence.slice(-5);
    awayTeam.formSequence = awayTeam.formSequence.slice(-5);
    applyPlayerRatings(homeTeam, result.playerRatings.home, result);
    applyPlayerRatings(awayTeam, result.playerRatings.away, result);
  }

  function applyPlayerRatings(team, ratings, result) {
    ratings.forEach(stat => {
      const player = team.squad.find(item => item.id === stat.playerId);
      if (!player) return;
      const previousMinutes = player.minutes;
      player.appearances += stat.minutes >= 1 ? 1 : 0;
      player.minutes += stat.minutes;
      player.goals += stat.goals;
      player.assists += stat.assists;
      player.averageRating = previousMinutes === 0 ? stat.rating : C.round((player.averageRating * Math.max(1, player.appearances - 1) + stat.rating) / player.appearances, 2);
      player.form = C.clamp(C.round(player.form * 0.72 + stat.rating * 0.28, 2), 4, 10);
      player.morale = C.clamp(player.morale + (stat.rating >= 7.4 ? 4 : stat.rating < 5.8 ? -4 : 0), 15, 100);
      player.fitness = C.clamp(player.fitness - Math.round(stat.minutes / 7.5), 20, 100);
      player.sharpness = C.clamp(player.sharpness + (stat.minutes > 45 ? 3 : 1), 20, 100);
      if (stat.yellow) player.yellowCards += 1;
      if (stat.red) { player.redCards += 1; player.suspensionMatches = Math.max(player.suspensionMatches, 1); }
      if (player.yellowCards > 0 && player.yellowCards % 3 === 0) player.suspensionMatches = Math.max(player.suspensionMatches, 1);
      player.history.unshift({season:result.season || null,rating:stat.rating,goals:stat.goals,assists:stat.assists});
      player.history = player.history.slice(0, 20);
    });
  }

  global.FMMatch = {simulateMatch, applyMatchResult};
})(window);
