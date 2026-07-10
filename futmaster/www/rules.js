(function(global){
  'use strict';
  const originalApply=global.FMMatch.applyMatchResult;
  global.FMMatch.applyMatchResult=function(result,homeTeam,awayTeam){
    originalApply(result,homeTeam,awayTeam);
    [homeTeam,awayTeam].forEach(team=>team.squad.forEach(player=>{
      if(player.suspensionMatches===1)player.suspensionMatches=2;
    }));
    result.injuries.forEach(event=>{
      const team=event.teamId===homeTeam.id?homeTeam:awayTeam;
      const player=team.squad.find(item=>item.id===event.playerId);
      if(player)player.injuredWeeks=Math.max(player.injuredWeeks,event.weeks+1);
    });
  };
})(window);
