(function () {
  const originalRender = render;
  const originalOnChange = root.onchange;
  const originalFansView = fansView;
  const originalStadiumView = stadiumView;

  function ensureExtendedState() {
    if (!state) return;
    if (!state.fans.plans) {
      state.fans.plans = [
        {id:'popular',name:'Sócio Popular',members:6000,price:25,delinquency:8},
        {id:'prata',name:'Sócio Prata',members:4000,price:55,delinquency:5},
        {id:'ouro',name:'Sócio Ouro',members:2000,price:120,delinquency:2}
      ];
    }
    if (!state.fans.sectors) {
      const capacity = state.fans.stadiumCapacity;
      state.fans.sectors = [
        {id:'popular',name:'Popular',capacity:Math.round(capacity*.45),price:40,sold:0},
        {id:'cadeira',name:'Cadeiras',capacity:Math.round(capacity*.35),price:75,sold:0},
        {id:'premium',name:'Premium',capacity:Math.round(capacity*.15),price:140,sold:0},
        {id:'camarote',name:'Camarotes',capacity:capacity-Math.round(capacity*.95),price:300,sold:0}
      ];
    }
    state.fans.members = state.fans.plans.reduce((sum, plan) => sum + plan.members, 0);
  }

  payWeeklyCosts = function () {
    ensureExtendedState();
    const playerPayroll=my().squad.reduce((sum,p)=>sum+p.salary,0)/4;
    const staffPayroll=Object.values(state.departments).reduce((sum,d)=>sum+(d.staff?.salary||0),0)/4;
    const academyCost=180000+state.facilities.academy.level*45000;
    const maintenance=120000+state.facilities.stadium.level*50000;
    const total=Math.round(playerPayroll+staffPayroll+academyCost+maintenance);
    state.balance-=total;
    ledger('Folha e custos semanais',total,'saída');

    const memberIncome=Math.round(state.fans.plans.reduce((sum,plan)=>{
      const paying=plan.members*(1-plan.delinquency/100);
      return sum+paying*plan.price/4;
    },0));
    state.balance+=memberIncome;
    state.fans.membershipRevenue+=memberIncome;
    ledger('Mensalidades de sócios',memberIncome,'entrada');
  };

  runMatchdayRevenue = function () {
    ensureExtendedState();
    const f=state.fans;
    let attendance=0;
    let gross=0;
    f.sectors.forEach(sector=>{
      const pricePenalty=Math.max(0,(sector.price-80)/180);
      const demand=Math.max(.1,Math.min(1,.32+state.reputation/145+f.satisfaction/190-pricePenalty));
      sector.sold=Math.min(sector.capacity,Math.round(sector.capacity*demand));
      attendance+=sector.sold;
      gross+=sector.sold*sector.price;
    });
    f.attendance=attendance;
    f.occupancy=Math.round(attendance/f.stadiumCapacity*100);
    const operating=Math.round(gross*.18);
    f.ticketRevenue+=gross;
    state.balance+=gross-operating;
    ledger('Bilheteria por setores',gross,'entrada');
    ledger('Operação do estádio',operating,'saída');

    const store=Math.round(attendance*(7+state.commercial.storeLevel*2));
    f.merchandiseRevenue+=store;
    state.balance+=store;
    ledger('Loja, estacionamento e alimentação',store,'entrada');
  };

  fansView = function () {
    ensureExtendedState();
    originalFansView();
    const host = root.querySelector('.grid.grid-2.section-gap');
    if (!host) return;
    host.insertAdjacentHTML('afterend',`
      <div class="card section-gap">
        <div class="card-header"><div><h2>Planos de associação</h2><p>Controle preço, base de assinantes e inadimplência de cada plano.</p></div></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Plano</th><th>Assinantes</th><th>Mensalidade</th><th>Inadimplência</th><th>Receita líquida/mês</th></tr></thead>
          <tbody>${state.fans.plans.map(plan=>`<tr>
            <td><b>${plan.name}</b></td>
            <td>${plan.members.toLocaleString('pt-BR')}</td>
            <td><input class="table-input" type="number" min="10" max="500" value="${plan.price}" data-plan-price="${plan.id}"></td>
            <td>${plan.delinquency}%</td>
            <td>${money(plan.members*plan.price*(1-plan.delinquency/100))}</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`);
  };

  stadiumView = function () {
    ensureExtendedState();
    originalStadiumView();
    root.insertAdjacentHTML('beforeend',`
      <div class="card section-gap">
        <div class="card-header"><div><h2>Setores e preços</h2><p>O preço de cada área afeta diretamente a demanda e a receita.</p></div></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Setor</th><th>Capacidade</th><th>Preço</th><th>Vendidos no último jogo</th><th>Ocupação</th></tr></thead>
          <tbody>${state.fans.sectors.map(sector=>`<tr>
            <td><b>${sector.name}</b></td>
            <td>${sector.capacity.toLocaleString('pt-BR')}</td>
            <td><input class="table-input" type="number" min="10" max="1000" value="${sector.price}" data-sector-price="${sector.id}"></td>
            <td>${sector.sold.toLocaleString('pt-BR')}</td>
            <td>${Math.round(sector.sold/sector.capacity*100)}%</td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`);
  };

  root.onchange = function (event) {
    if (originalOnChange) originalOnChange.call(root,event);
    if (!state) return;
    const planId=event.target.dataset.planPrice;
    const sectorId=event.target.dataset.sectorPrice;
    if (planId) {
      ensureExtendedState();
      const plan=state.fans.plans.find(x=>x.id===planId);
      if (plan) plan.price=Math.max(10,Math.min(500,Number(event.target.value)||plan.price));
      save();render();
    }
    if (sectorId) {
      ensureExtendedState();
      const sector=state.fans.sectors.find(x=>x.id===sectorId);
      if (sector) sector.price=Math.max(10,Math.min(1000,Number(event.target.value)||sector.price));
      state.fans.ticketPrice=Math.round(state.fans.sectors.reduce((sum,x)=>sum+x.price,0)/state.fans.sectors.length);
      save();render();
    }
  };

  function hireDirectors() {
    const vacancies=Object.entries(state.departments).filter(([,d])=>!d.staff);
    let hired=0;
    for (const [,dept] of vacancies) {
      const candidate=state.staffMarket.filter(s=>s.role===dept.role).sort((a,b)=>b.skill-a.skill)[0];
      if (!candidate) continue;
      const signing=Math.round(candidate.salary*2);
      if (state.balance<signing) break;
      state.balance-=signing;
      dept.staff={...candidate};
      dept.delegated=true;
      state.staffMarket=state.staffMarket.filter(s=>s.id!==candidate.id);
      ledger(`Contratação de ${candidate.name}`,signing,'saída');
      hired++;
    }
    if (!hired) alert('Não foi possível contratar novos diretores. Verifique candidatos e orçamento.');
    else state.automation.lastReport.unshift(`${hired} profissional(is) contratado(s) para a diretoria.`);
    save();render();
  }

  function startNextSeason() {
    if (state.round<state.fixtures.length) return alert('A temporada atual ainda não terminou.');
    state.season++;
    state.week=1;
    state.round=0;
    state.teams.forEach(teamItem=>{
      Object.assign(teamItem,{played:0,wins:0,draws:0,losses:0,gf:0,ga:0,points:0});
      teamItem.squad.forEach(player=>{player.age++;player.contractYears=Math.max(0,player.contractYears-1);});
    });
    my().squad=my().squad.filter(player=>player.contractYears>0&&player.age<39);
    ['u20','u17','u15'].forEach(category=>state.academy[category].forEach(player=>player.age++));
    const graduates=state.academy.u20.filter(player=>player.age>20&&player.potential>=75);
    graduates.forEach(player=>my().squad.push({...player,id:Date.now()+player.id,contractYears:2,salary:22000,starter:false}));
    state.academy.u20=state.academy.u20.filter(player=>player.age<=20);
    state.academy.u20.push(...state.academy.u17.filter(player=>player.age>=17));
    state.academy.u17=state.academy.u17.filter(player=>player.age<17);
    state.academy.u17.push(...state.academy.u15.filter(player=>player.age>=15));
    state.academy.u15=state.academy.u15.filter(player=>player.age<15);
    state.academy.u15.push(...createSquad(state.season,true).slice(0,8).map((player,index)=>({...player,id:state.season*1000+index,age:13+(index%2)})));
    state.fixtures=createSchedule(state.teams.map(teamItem=>teamItem.id));
    state.sponsors=state.sponsors.map(sponsor=>({...sponsor,years:sponsor.years-1})).filter(sponsor=>sponsor.years>0);
    const sponsorIncome=state.sponsors.reduce((sum,sponsor)=>sum+sponsor.value,0);
    state.balance+=sponsorIncome;
    ledger('Patrocínios da nova temporada',sponsorIncome,'entrada');
    state.fans.satisfaction=Math.max(45,Math.round((state.fans.satisfaction+70)/2));
    state.history.unshift({round:0,week:0,text:`Início da temporada ${state.season}`});
    save();render();
  }

  root.addEventListener('click',event=>{
    const action=event.target.closest('[data-action]')?.dataset.action;
    if (action==='hire-directors') hireDirectors();
    if (action==='new-season') startNextSeason();
  });

  render = function () {
    ensureExtendedState();
    originalRender();
    if (!state) return;
    if (view==='staff') {
      const header=root.querySelector('.card-header');
      if (header&&!header.querySelector('[data-action="hire-directors"]')) {
        header.insertAdjacentHTML('beforeend','<button class="primary-button" data-action="hire-directors">Montar diretoria</button>');
      }
    }
    if (view==='dashboard'&&state.round>=state.fixtures.length) {
      const button=root.querySelector('[data-action="simulate"]');
      if (button) {
        button.dataset.action='new-season';
        button.textContent='Começar próxima temporada';
      }
    }
  };

  ensureExtendedState();
  save();
  render();
})();
