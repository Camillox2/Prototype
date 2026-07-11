(function(global){
'use strict';
const C=global.FMCore,S=global.FMSystems;
const MAIN='futmaster-save-v4';
const BUNDLE_KEYS=['futmaster-market-v07','futmaster-world-v08','futmaster-depth-v09','futmaster-release-v10','futmaster-social-v10','futmaster-management-v11','futmaster-calendar-v12','futmaster-media-v13','futmaster-match-v20'];
function read(k,f=null){try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch{return f;}}
function write(k,v){localStorage.setItem(k,JSON.stringify(v));}
function state(){return read(MAIN);}
function academy(team){
 team.academy=team.academy||{};
 team.academy['Sub-15']=team.academy['Sub-15']||team.academy.u15||[];
 team.academy['Sub-17']=team.academy['Sub-17']||team.academy.u17||[];
 team.academy['Sub-20']=team.academy['Sub-20']||team.academy.u20||[];
 delete team.academy.u15;delete team.academy.u17;delete team.academy.u20;
 for(const p of team.academy['Sub-15'])p.age=Math.min(16,Math.max(14,p.age||15));
 for(const p of team.academy['Sub-17'])p.age=Math.min(18,Math.max(15,p.age||17));
 for(const p of team.academy['Sub-20'])p.age=Math.min(21,Math.max(17,p.age||19));
 team.academy['Sub-15']=team.academy['Sub-15'].sort((a,b)=>(b.potential||0)-(a.potential||0)).slice(0,18);
 team.academy['Sub-17']=team.academy['Sub-17'].sort((a,b)=>(b.potential||0)-(a.potential||0)).slice(0,20);
 team.academy['Sub-20']=team.academy['Sub-20'].sort((a,b)=>(b.potential||0)-(a.potential||0)).slice(0,22);
 team.squad=team.squad||[];
 if(team.squad.length>30)team.squad=team.squad.sort((a,b)=>((b.starter?20:0)+(b.overall||0))-((a.starter?20:0)+(a.overall||0))).slice(0,30);
 while(team.squad.length<23&&C?.createPlayer)team.squad.push(C.createPlayer(Date.now()%99999,team.squad.length,{clubLevel:team.strength||58}));
}
function fanLimits(s){
 const fans=s.fans;if(!fans)return;
 const ceiling=Math.max(2500,Math.round((fans.fanBase||50000)*.32));
 const plans=fans.membershipPlans||fans.plans||[];
 const limits={Popular:[19,59],Silver:[49,129],Gold:[99,249]};
 let total=0;
 for(const p of plans){const [lo,hi]=limits[p.name]||[15,300];p.price=C?.clamp?C.clamp(Number(p.price)||lo,lo,hi):Math.min(hi,Math.max(lo,Number(p.price)||lo));p.members=Math.max(0,Math.round(Number(p.members)||0));total+=p.members;p.delinquency=C?.clamp?C.clamp(Number(p.delinquency)||0,0,.35):Math.min(.35,Math.max(0,Number(p.delinquency)||0));}
 if(total>ceiling&&total){const ratio=ceiling/total;for(const p of plans)p.members=Math.max(0,Math.round(p.members*ratio));}
 if(Number.isFinite(fans.members))fans.members=Math.min(ceiling,Math.max(0,Math.round(fans.members)));
}
function normalize(s){if(!s)return;s.teams?.forEach(academy);fanLimits(s);if(s.finance){if(!Number.isFinite(s.finance.seasonRevenue))s.finance.seasonRevenue=0;if(!Number.isFinite(s.finance.seasonExpenses))s.finance.seasonExpenses=0;}return s;}
function bundle(){
 const u=read('futmaster-universe-v05',{});u.__v20Bundle={};
 for(const k of BUNDLE_KEYS){const raw=localStorage.getItem(k);if(raw!==null)u.__v20Bundle[k]=raw;}
 write('futmaster-universe-v05',u);
}
function restore(){const u=read('futmaster-universe-v05');for(const [k,v] of Object.entries(u?.__v20Bundle||{}))if(localStorage.getItem(k)===null)localStorage.setItem(k,v);}
function persist(){const s=normalize(state());if(s)localStorage.setItem(MAIN,JSON.stringify(s));bundle();}
if(S){
 const advance=S.advanceSeason;if(typeof advance==='function')S.advanceSeason=function(s){const old=s.season;const r=advance.apply(this,arguments);normalize(s);if(s.season!==old&&s.finance){s.finance.seasonRevenue=0;s.finance.seasonExpenses=0;}return r;};
 for(const name of ['runAutomation','processWeeklyEconomy','processFans']){const fn=S[name];if(typeof fn==='function')S[name]=function(s){const r=fn.apply(this,arguments);normalize(s);return r;};}
}
restore();persist();
document.addEventListener('click',e=>{const a=e.target.closest('[data-action]')?.dataset.action,v=e.target.closest('[data-v06-action]')?.dataset.v06Action;if(['simulate-week','simulate-month','next-season'].includes(a)||v){bundle();setTimeout(persist,350);}},true);
document.addEventListener('submit',e=>{if(e.target.id==='new-game-form')setTimeout(persist,350);},true);
global.addEventListener('beforeunload',bundle);
global.FMReview20={normalize,bundle,restore};
})(window);