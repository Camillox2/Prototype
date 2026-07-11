(function(global){
'use strict';
const CONTROL='futmaster-runtime-mode',SESSION='futmaster-multiplayer-session';
const native={get:Storage.prototype.getItem,set:Storage.prototype.setItem,remove:Storage.prototype.removeItem,key:Storage.prototype.key,clear:Storage.prototype.clear};
const rawGet=key=>native.get.call(localStorage,key),rawSet=(key,value)=>native.set.call(localStorage,key,value),rawRemove=key=>native.remove.call(localStorage,key);
function runtime(){try{return JSON.parse(rawGet(CONTROL)||'{"mode":"offline"}');}catch{return {mode:'offline'};}}
function prefix(){const r=runtime();return r.mode==='multiplayer'&&r.roomCode?`fmroom:${String(r.roomCode).toUpperCase()}:`:'';}
function excluded(key){return key===CONTROL||key===SESSION;}
function translate(key){key=String(key);return prefix()&&key.startsWith('futmaster-')&&!excluded(key)?prefix()+key:key;}
Storage.prototype.getItem=function(key){return native.get.call(this,translate(key));};
Storage.prototype.setItem=function(key,value){return native.set.call(this,translate(key),value);};
Storage.prototype.removeItem=function(key){return native.remove.call(this,translate(key));};
Storage.prototype.clear=function(){const p=prefix();if(!p)return native.clear.call(this);const keys=[];for(let i=0;i<this.length;i++){const k=native.key.call(this,i);if(k?.startsWith(p))keys.push(k);}keys.forEach(k=>native.remove.call(this,k));};
Storage.prototype.key=function(index){const p=prefix();if(!p)return native.key.call(this,index);const keys=[];for(let i=0;i<this.length;i++){const k=native.key.call(this,i);if(k?.startsWith(p))keys.push(k.slice(p.length));}return keys[index]??null;};
function entries(){const p=prefix(),out={};for(let i=0;i<localStorage.length;i++){const raw=native.key.call(localStorage,i);if(!raw)continue;if(p){if(raw.startsWith(p))out[raw.slice(p.length)]=native.get.call(localStorage,raw);}else if(raw.startsWith('futmaster-')&&!excluded(raw)&&!raw.startsWith('fmroom:'))out[raw]=native.get.call(localStorage,raw);}return out;}
function setRuntime(value){rawSet(CONTROL,JSON.stringify(value||{mode:'offline'}));}
function getSession(){try{return JSON.parse(rawGet(SESSION)||'null');}catch{return null;}}
function setSession(value){value?rawSet(SESSION,JSON.stringify(value)):rawRemove(SESSION);}
global.FMStorageNamespace={CONTROL,SESSION,runtime,prefix,translate,entries,setRuntime,getSession,setSession,rawGet,rawSet,rawRemove,native};
})(window);
