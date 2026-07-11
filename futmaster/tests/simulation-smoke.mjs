import fs from 'node:fs';
import vm from 'node:vm';
global.window=global;
for(const file of ['www/core.js','www/match-engine.js']){
  vm.runInThisContext(fs.readFileSync(new URL(`../${file}`,import.meta.url),'utf8'),{filename:file});
}
const teams=FMCore.clubTemplates.slice(0,6).map((t,i)=>FMCore.createTeam(t,i+1));
let goals=0,upsets=0,upsetGames=0;
for(let i=0;i<500;i++){
 const a=JSON.parse(JSON.stringify(teams[i%teams.length]));
 const b=JSON.parse(JSON.stringify(teams[(i*5+1)%teams.length]));
 const r=FMMatch.simulateMatch(a,b,{season:2026,week:1});
 if(!Number.isInteger(r.homeGoals)||!Number.isInteger(r.awayGoals))throw new Error('Placar inválido');
 if(!r.stats||!Array.isArray(r.events))throw new Error('Súmula inválida');
 goals+=r.homeGoals+r.awayGoals;
 const oa=FMCore.calculateTeamOverall(a),ob=FMCore.calculateTeamOverall(b);
 if(Math.abs(oa-ob)>=8){upsetGames++;const weakHome=oa<ob;if(weakHome?r.homeGoals>r.awayGoals:r.awayGoals>r.homeGoals)upsets++;}
}
const avg=goals/500;
if(avg<0.8||avg>6.5)throw new Error(`Média de gols fora da faixa: ${avg}`);
console.log(JSON.stringify({matches:500,averageGoals:Number(avg.toFixed(2)),upsetRate:Number((upsets/Math.max(1,upsetGames)*100).toFixed(1))}));
