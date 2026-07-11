(function(global){
'use strict';
const MAIN='futmaster-save-v4',UNIVERSE='futmaster-universe-v05',CAREER='futmaster-career-universe-v30';
const get=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k)||'null')??f;}catch{return f;}};
const set=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
function removeWomen(){
 document.querySelectorAll('[data-v05-view="women"],[data-v30-view="women30"]').forEach(x=>x.remove());
 document.querySelectorAll('.nav-item').forEach(x=>{if(/futebol feminino/i.test(x.textContent))x.remove();});
 const u=get(UNIVERSE);if(u&&(!u.women?.removed||u.women?.enabled)){u.women={removed:true,enabled:false,team:null,history:[],finance:{balance:0,revenue:0,expenses:0},season:{played:0,wins:0,draws:0,losses:0,points:0,gf:0,ga:0}};set(UNIVERSE,u);}
 const c=get(CAREER);if(c&&(c.women||c.settings?.autoWomen)){c.women=null;c.settings={...(c.settings||{}),autoWomen:false};set(CAREER,c);}
}
function modeBadge(){const top=document.querySelector('.topbar');if(!top||top.querySelector('.mode-badge'))return;const runtime=global.FMStorageNamespace?.runtime?.()||{mode:'offline'};const b=document.createElement('span');b.className='mode-badge';b.textContent=runtime.mode==='multiplayer'?'ONLINE · SALA':'OFFLINE · LOCAL';b.title=runtime.mode==='multiplayer'?'A carreira desta sala usa sincronização WebSocket.':'O singleplayer não usa backend nem internet.';top.appendChild(b);}
function patchManifestText(){document.title='FutMaster 3.3';const meta=document.querySelector('meta[name="description"]');if(meta)meta.content='FutMaster 3.3, manager masculino com singleplayer offline, multiplayer opcional, 2D Pro, premiações ilustradas e automação avançada.';}
function blockLegacyWomen(e){if(e.target.closest('[data-v30-woman],[data-v30-action="women-create"],[data-v30-action="women-play"]')){e.preventDefault();e.stopImmediatePropagation();}}
function init(){removeWomen();modeBadge();patchManifestText();document.addEventListener('click',blockLegacyWomen,true);const obs=new MutationObserver(()=>{removeWomen();modeBadge();});obs.observe(document.body,{childList:true,subtree:true});setTimeout(removeWomen,700);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
