(function(global){
  'use strict';
  const C=global.FMCore;
  if(C&&!C.__v04ClampGuard){
    const original=C.clamp;
    C.clamp=function(value,min,max){
      if(max===100&&Number(value)>100000)return Number(value);
      return original(value,min,max);
    };
    C.__v04ClampGuard=true;
  }
  const KEY='futmaster-save-v4';
  function patchSave(){
    try{
      const state=JSON.parse(localStorage.getItem(KEY)||'null');
      if(!state)return;
      state.commercial=state.commercial||{};
      const reach=Number.isFinite(state.commercial.digitalReach)?state.commercial.digitalReach:(state.commercial.globalReach||0);
      state.commercial.digitalReach=reach;
      state.commercial.globalReach=Math.max(state.commercial.globalReach||0,reach);
      state.stadium=state.stadium||{};
      state.stadium.lastAttendance=Number.isFinite(state.stadium.lastAttendance)?state.stadium.lastAttendance:(state.fans?.lastAttendance||0);
      localStorage.setItem(KEY,JSON.stringify(state));
    }catch(error){console.warn('Compatibilidade 0.4 não aplicada',error);}
  }
  patchSave();
  document.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]')?.dataset.action;
    if(['simulate-week','simulate-month','next-season'].includes(action))setTimeout(patchSave,35);
  },true);
  document.addEventListener('submit',event=>{if(event.target.id==='new-game-form')setTimeout(patchSave,35);},true);
})(window);
