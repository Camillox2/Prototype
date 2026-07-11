(function(global){
  'use strict';
  const MAIN_KEY='futmaster-save-v4';
  let active=false;
  let timer=null;
  let cursor=0;
  let speed=1;

  function readMain(){try{return JSON.parse(localStorage.getItem(MAIN_KEY)||'null');}catch{return null;}}
  function addNavigation(){
    const nav=document.querySelector('.nav-list');
    if(!nav||nav.querySelector('[data-v05-match2d]'))return;
    const history=nav.querySelector('[data-view="history"]');
    const button=document.createElement('button');
    button.className='nav-item';
    button.dataset.v05Match2d='true';
    button.textContent='Partida 2D';
    nav.insertBefore(button,history||null);
    button.addEventListener('click',event=>{
      event.preventDefault();
      document.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));
      button.classList.add('active');
      active=true;
      cursor=0;
      clearPlayback();
      render();
    });
  }

  function escapeHtml(value){return String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function eventPosition(event,index,isHome){const seed=(event.minute||0)*17+index*31+(isHome?7:19);const x=10+(seed%80);const y=12+((seed*7)%76);if(event.type==='goal')return {x:isHome?82:18,y:45+seed%12};if(event.type==='shot')return {x:isHome?72:28,y};if(event.type==='corner')return {x:isHome?92:8,y:seed%2?8:92};if(event.type==='red'||event.type==='yellow')return {x:48+seed%8,y};return {x,y};}
  function buildFrames(match){const events=(match.events||[]).filter(event=>event.minute>=0);if(!events.length)return [{minute:0,text:'Início da partida',type:'start',home:{x:30,y:50},away:{x:70,y:50},ball:{x:50,y:50}}];return events.map((event,index)=>{const homeEvent=event.teamId===match.homeId||(!event.teamId&&index%2===0);const point=eventPosition(event,index,homeEvent);return {minute:event.minute,text:event.text||event.type,type:event.type,home:homeEvent?{x:point.x-8,y:point.y}:{x:28+((index*13)%18),y:18+((index*19)%64)},away:homeEvent?{x:68+((index*11)%18),y:18+((index*23)%64)}:{x:point.x+8,y:point.y},ball:point};});}
  function fieldMarkup(match){return `<svg class="match2d-field" viewBox="0 0 100 100" role="img" aria-label="Reconstrução 2D da partida"><rect x="1" y="1" width="98" height="98" rx="2" class="field-bg"/><line x1="50" y1="1" x2="50" y2="99" class="field-line"/><circle cx="50" cy="50" r="10" class="field-line field-circle"/><rect x="1" y="28" width="16" height="44" class="field-line"/><rect x="83" y="28" width="16" height="44" class="field-line"/><rect x="1" y="39" width="6" height="22" class="field-line"/><rect x="93" y="39" width="6" height="22" class="field-line"/><circle id="v05-home-marker" cx="30" cy="50" r="3.2" class="team-marker home-marker"/><circle id="v05-away-marker" cx="70" cy="50" r="3.2" class="team-marker away-marker"/><circle id="v05-ball-marker" cx="50" cy="50" r="1.6" class="ball-marker"/><text x="5" y="7" class="field-label">${escapeHtml(match.homeShort)}</text><text x="95" y="7" text-anchor="end" class="field-label">${escapeHtml(match.awayShort)}</text></svg>`;}
  function render(){const state=readMain();const root=document.querySelector('#app-view');if(!root||!state)return;document.querySelector('#page-title').textContent='Partida 2D';const match=state.matchHistory?.[0];if(!match){root.innerHTML='<div class="empty-state"><h2>Nenhuma partida simulada</h2><p>Avance uma rodada para gerar a reconstrução 2D.</p></div>';return;}const frames=buildFrames(match);cursor=Math.min(cursor,frames.length-1);root.innerHTML=`<div class="grid grid-4"><div class="card stat-card"><span>Placar</span><strong>${match.homeGoals} × ${match.awayGoals}</strong><small>${escapeHtml(match.homeShort)} — ${escapeHtml(match.awayShort)}</small></div><div class="card stat-card"><span>xG</span><strong>${match.stats?.xg?.[0]??0}–${match.stats?.xg?.[1]??0}</strong><small>Qualidade das chances</small></div><div class="card stat-card"><span>Clima</span><strong>${escapeHtml(match.environment?.weather||'Normal')}</strong><small>${escapeHtml(match.environment?.referee||'Arbitragem padrão')}</small></div><div class="card stat-card"><span>Eventos</span><strong>${frames.length}</strong><small>Reconstrução narrativa</small></div></div><div class="grid grid-2 section-gap"><div class="card match2d-card"><div class="card-header"><div><h2>${escapeHtml(match.homeName)} ${match.homeGoals} x ${match.awayGoals} ${escapeHtml(match.awayName)}</h2><p class="muted">Representação 2D reconstruída a partir dos eventos do motor.</p></div></div>${fieldMarkup(match)}<div class="playback-panel"><button class="primary-button" data-match2d-action="play">${timer?'Pausar':'Reproduzir'}</button><button class="secondary-button" data-match2d-action="previous">Anterior</button><button class="secondary-button" data-match2d-action="next">Próximo</button><label>Velocidade<select data-match2d-setting="speed"><option value="0.5" ${speed===0.5?'selected':''}>0,5×</option><option value="1" ${speed===1?'selected':''}>1×</option><option value="2" ${speed===2?'selected':''}>2×</option><option value="4" ${speed===4?'selected':''}>4×</option></select></label></div><div class="event-focus" id="v05-event-focus"></div></div><div class="card"><h2>Linha do tempo</h2><div class="match2d-timeline">${frames.map((frame,index)=>`<button class="timeline-event ${index===cursor?'active':''}" data-match2d-action="jump" data-index="${index}"><b>${frame.minute}'</b><span>${escapeHtml(frame.text)}</span><small>${escapeHtml(frame.type)}</small></button>`).join('')}</div></div></div>`;applyFrame(frames[cursor],cursor);}
  function applyFrame(frame,index){if(!frame)return;const home=document.querySelector('#v05-home-marker');const away=document.querySelector('#v05-away-marker');const ball=document.querySelector('#v05-ball-marker');const focus=document.querySelector('#v05-event-focus');[home,away,ball].forEach(marker=>{if(marker)marker.style.transition=`all ${Math.max(120,520/speed)}ms ease`;});if(home){home.setAttribute('cx',frame.home.x);home.setAttribute('cy',frame.home.y);}if(away){away.setAttribute('cx',frame.away.x);away.setAttribute('cy',frame.away.y);}if(ball){ball.setAttribute('cx',frame.ball.x);ball.setAttribute('cy',frame.ball.y);}if(focus)focus.innerHTML=`<b>${frame.minute}'</b><span>${escapeHtml(frame.text)}</span>`;document.querySelectorAll('.timeline-event').forEach((button,buttonIndex)=>button.classList.toggle('active',buttonIndex===index));}
  function clearPlayback(){if(timer){clearInterval(timer);timer=null;}}
  function play(){const state=readMain();const match=state?.matchHistory?.[0];if(!match)return;const frames=buildFrames(match);if(timer){clearPlayback();render();return;}if(cursor>=frames.length-1)cursor=0;timer=setInterval(()=>{cursor+=1;if(cursor>=frames.length){cursor=frames.length-1;clearPlayback();render();return;}applyFrame(frames[cursor],cursor);},Math.max(180,1100/speed));render();}
  function bind(){document.addEventListener('click',event=>{const button=event.target.closest('[data-match2d-action]');if(!button)return;event.preventDefault();const state=readMain();const frames=state?.matchHistory?.[0]?buildFrames(state.matchHistory[0]):[];const action=button.dataset.match2dAction;if(action==='play'){play();return;}clearPlayback();if(action==='previous')cursor=Math.max(0,cursor-1);if(action==='next')cursor=Math.min(frames.length-1,cursor+1);if(action==='jump')cursor=Number(button.dataset.index)||0;render();});document.addEventListener('change',event=>{if(event.target.dataset.match2dSetting!=='speed')return;speed=Number(event.target.value)||1;clearPlayback();if(active)render();});document.addEventListener('click',event=>{if(event.target.closest('.nav-item')&&!event.target.closest('[data-v05-match2d]')){active=false;clearPlayback();}});}
  function init(){addNavigation();bind();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})(window);
