(function(global){
'use strict';
const ERROR_KEY='futmaster-errors-v32';
const originalSet=Storage.prototype.setItem;
Storage.prototype.setItem=function(key,value){
  const text=String(value);
  try{if(this.getItem(key)===text)return;}catch{}
  return originalSet.call(this,key,text);
};
const NativeObserver=global.MutationObserver;
if(NativeObserver&&!global.__FMBatchedObserver){
  global.MutationObserver=class extends NativeObserver{
    constructor(callback){
      let queued=false,records=[];
      super((next,observer)=>{records.push(...next);if(queued)return;queued=true;requestAnimationFrame(()=>{queued=false;const batch=records;records=[];callback(batch,observer);});});
    }
  };
  global.__FMBatchedObserver=true;
}
function read(){try{return JSON.parse(localStorage.getItem(ERROR_KEY)||'[]');}catch{return [];}}
function journal(type,message,detail=''){
  try{const rows=read();rows.unshift({id:`err-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,type,message:String(message||'Erro desconhecido').slice(0,500),detail:String(detail||'').slice(0,1500),at:new Date().toISOString(),url:location.href});localStorage.setItem(ERROR_KEY,JSON.stringify(rows.slice(0,80)));}catch{}
}
global.addEventListener('error',event=>journal('error',event.message,event.error?.stack||`${event.filename||''}:${event.lineno||0}`));
global.addEventListener('unhandledrejection',event=>journal('promise',event.reason?.message||event.reason,event.reason?.stack||''));
global.FMPreflight32={ERROR_KEY,read,journal,clear(){localStorage.removeItem(ERROR_KEY);}};
})(window);
