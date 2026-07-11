(function(global){
'use strict';
const MAIN='futmaster-save-v4';
const OLD='futmaster-career-v04';
const CURRENT='futmaster-local-career-v04';
function parse(key){try{return JSON.parse(localStorage.getItem(key)||'null');}catch{return null;}}
function migrate(){
 const old=localStorage.getItem(OLD), current=localStorage.getItem(CURRENT);
 if(!current&&old)localStorage.setItem(CURRENT,old);
 if(!old&&current)localStorage.setItem(OLD,current);
 const s=parse(MAIN);if(!s)return;
 s.commercial=s.commercial||{};
 if(!Number.isFinite(s.commercial.digitalReach))s.commercial.digitalReach=Number(s.commercial.globalReach)||0;
 if(!Number.isFinite(s.commercial.globalReach))s.commercial.globalReach=s.commercial.digitalReach;
 if(!Number.isFinite(s.commercial.brandValue)||s.commercial.brandValue<1000)s.commercial.brandValue=Math.max(1_000_000,(s.userTeamId?60:45)*250_000);
 s.stadium=s.stadium||{};
 if(!Number.isFinite(s.stadium.lastAttendance))s.stadium.lastAttendance=Number(s.fans?.lastAttendance)||0;
 localStorage.setItem(MAIN,JSON.stringify(s));
}
migrate();
document.addEventListener('click',e=>{if(['simulate-week','simulate-month','next-season'].includes(e.target.closest('[data-action]')?.dataset.action))setTimeout(migrate,80);},true);
document.addEventListener('submit',e=>{if(e.target.id==='new-game-form')setTimeout(migrate,120);},true);
})(window);