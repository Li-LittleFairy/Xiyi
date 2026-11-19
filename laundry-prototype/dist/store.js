window.StoreUI = (() => {
  const BASE_PRICES = { shirt: 18, trousers: 22, knit: 32, suit: 58, coat: 68, down: 68, bedding: 48, curtain: 88 };
  const LABELS = { submitted: '待收衣', received: '待洗护', washing: '洗护中', ready: '待取衣', done: '已完成' };
  const NAV = [
    ['dashboard', '工作台', 'grid'], ['intake', '收衣开单', 'plus'], ['orders', '订单管理', 'list'],
    ['wash', '洗护任务', 'wash'], ['pickup', '取衣交付', 'bag'], ['customers', '客户管理', 'users'],
    ['reports', '经营统计', 'chart'], ['settings', '基础设置', 'settings']
  ];
  const TITLES = {
    dashboard: ['门店工作台', '让每一件衣物都有清楚的去向。'], intake: ['收衣开单', '登记客户与衣物，核对后开始洗护。'],
    orders: ['订单管理', '从收到需求到交付，每笔订单清楚可查。'], wash: ['洗护任务', '按处理阶段安排工作，完成后移入待取衣。'],
    pickup: ['取衣交付', '核对衣物与费用，完成最后一步交付。'], customers: ['客户管理', '查看客户联系信息与历次送洗记录。'],
    reports: ['经营统计', '查看订单、收款与服务项目的经营情况。'], settings: ['基础设置', '维护洗护项目价格与门店人员。'],
    detail: ['订单详情', '查看衣物、费用与处理记录。']
  };
  const paths = {
    grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    plus:'<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
    list:'<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
    wash:'<rect x="4" y="2" width="16" height="20" rx="3"/><circle cx="12" cy="14" r="5"/><path d="M8 6h1m3 0h4M8 14q4-4 8 0"/>',
    bag:'<path d="M4 7h16l-1 14H5L4 7Z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/>',
    users:'<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v2"/>',
    chart:'<path d="M4 3v18h17M8 16v-4M13 16V7M18 16v-7"/>',
    settings:'<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3"/><circle cx="16" cy="17" r="3"/>',
    arrow:'<path d="M5 12h14m-5-5 5 5-5 5"/>', search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    check:'<path d="m5 12 4 4L19 6"/>', clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    money:'<rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>'
  };
  const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.list}</svg>`;
  const E = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = amount => `¥${Number(amount || 0).toFixed(2)}`;
  const day = offset => { const d = new Date(); d.setDate(d.getDate() + (offset || 0)); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0,10); };
  const time = () => new Date().toLocaleString('zh-CN', {hour12:false});
  let api, currentPage = 'dashboard', currentId = '', listFilter = 'all', search = '', settingsTab = 'services';
  const S = () => api.getState();
  const items = order => Object.entries(order.items).filter(([,n]) => n > 0);
  const qty = order => items(order).reduce((sum,[,n]) => sum + Number(n),0);
  const totalOf = (order, state) => Number.isFinite(order.total) ? order.total : Object.entries(order.items).reduce((sum,[id,n]) => sum + n * (state?.services?.[id]?.price ?? BASE_PRICES[id] ?? 0),0);
  const summary = order => items(order).map(([id,n]) => `${api.catalog[id]?.name || id} × ${n}`).join('、');
  const badge = order => `<span class="m-status ${order.status}">${LABELS[order.status]}</span>`;
  const payment = order => `<span class="m-payment ${order.paid ? 'paid' : ''}">${order.paid ? '已收款' : '未收款'}</span>`;
  const button = (label, attr, type = '') => `<button type="button" class="m-btn ${type}" ${attr}>${label}</button>`;
  const empty = text => `<div class="m-empty">${svg('list')}<p>${text}</p></div>`;
  const action = (order, text = '查看详情') => `<button type="button" class="m-link" data-m-detail="${E(order.id)}">${text} ${svg('arrow')}</button>`;
  function nav(page, id = '') { location.hash = `#/store/${page}${id ? '/' + encodeURIComponent(id) : ''}`; }
  function event(order, text) { order.updatedAt = day(); (order.history ||= []).push({at:time(), text}); }
  function persist(message) { api.save(); api.refresh(); if (message) api.toast(message); }

  function initialize(state) {
    state.services ||= Object.fromEntries(Object.entries(BASE_PRICES).map(([id,price]) => [id,{price}]));
    state.staff ||= [{id:'staff-1',name:'林晓',role:'店长',enabled:true},{id:'staff-2',name:'小陈',role:'店员',enabled:true},{id:'staff-3',name:'小周',role:'店员',enabled:true}];
    if (!state.storeInitialized) {
      state.orders.forEach(order => {
        order.accountId = 'customer-demo'; order.source = '顾客送洗';
        order.total = totalOf(order,state); order.paid = order.status === 'done';
        if (order.paid) {order.paidAt = order.updatedAt; order.paymentMethod = '线下电子支付';}
        order.expectedDate ||= order.status === 'ready' ? day() : '';
      });
      const seeds = [
        ['SJ1086','刘先生','13900001236',{suit:1,shirt:2},'submitted',0],
        ['SJ1085','王女士','13800002857',{down:1,knit:2},'received',0],
        ['SJ1084','陈先生','13700005618',{coat:1,trousers:2},'washing',-1],
        ['SJ1083','李女士','13600008329',{bedding:2},'ready',-2],
        ['SJ1082','周先生','13500006540',{shirt:3,trousers:2},'done',-3],
        ['SJ1081','李女士','13600008329',{coat:1},'done',-5]
      ];
      seeds.forEach(([id,name,phone,garments,status,offset]) => {
        const order = {id,name,phone,items:garments,status,createdAt:day(offset),updatedAt:day(),expectedDate:day(1),visitDate:day(offset),note:'',source:status==='submitted'?'顾客送洗':'门店开单',accountId:'walk-in',paid:status==='done',history:[]};
        order.total = totalOf(order,state);
        if(order.paid){ order.paidAt=day(offset+1);order.paymentMethod='线下电子支付'; }
        order.history.push({at:day(offset)+' 10:30',text: status==='submitted'?'顾客提交送洗需求':'小陈登记衣物并确认收衣'});
        state.orders.push(order);
      });
      state.storeInitialized = true;
    }
    state.orders.forEach(order => { order.total = totalOf(order,state); order.prices ||= Object.fromEntries(Object.keys(order.items).map(id=>[id,state.services[id]?.price||0])); order.history ||= [{at:order.createdAt,text:'建立送洗订单'}]; });
  }

  function table(orders, selectable = false) {
    if (!orders.length) return empty('暂无订单');
    return `<div class="m-table-wrap"><table class="m-table"><thead><tr><th>订单 / 客户</th><th>送洗衣物</th><th>洗护状态</th><th>费用</th><th>预计取衣</th><th></th></tr></thead><tbody>${orders.map(order => `<tr data-m-row data-status="${order.status}" data-search="${E([order.id,order.name,order.phone].join(' ').toLowerCase())}"><td><button class="m-order-id" data-m-detail="${E(order.id)}" type="button">${E(order.id)}</button><div class="m-sub">${E(order.name)} <span>·</span> ${E(order.phone)}</div></td><td><span class="m-item-text">${E(summary(order))}</span><div class="m-sub">共 ${qty(order)} 件 · ${E(order.source || '顾客送洗')}</div></td><td>${badge(order)}</td><td><strong class="m-money">${money(order.total)}</strong><div class="m-sub">${payment(order)}</div></td><td class="m-nowrap">${E(order.expectedDate || '—')}</td><td>${selectable ? button('办理取衣',`data-m-pick="${E(order.id)}"`,'secondary') : action(order)}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function panel(title, subtitle, body, extra = '') { return `<section class="m-panel"><div class="m-panel-head"><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ''}</div>${extra}</div>${body}</section>`; }
  function metrics(list) { return `<div class="m-metrics">${list.map(([name,value,caption,ico])=>`<div class="m-metric"><div class="m-metric-top">${name}<span>${svg(ico)}</span></div><strong>${value}</strong><small>${caption}</small></div>`).join('')}</div>`; }

  function dashboard() {
    const orders = [...S().orders].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)), c = key => orders.filter(o=>o.status===key).length;
    const revenue = orders.filter(o=>o.paid && o.paidAt?.startsWith(day())).reduce((sum,o)=>sum+o.total,0);
    return `<section class="m-welcome"><div><span class="m-kicker">日常经营 · 服务有序</span><h2>你好，林店长 <span>☀</span></h2><p>今天有 <strong>${c('submitted')}</strong> 笔需求等待收衣，<strong>${c('ready')}</strong> 笔订单可以交付。</p><div class="m-welcome-actions">${button('＋ 收衣开单','data-mgo="intake"')}${button('查看全部订单 '+svg('arrow'),'data-mgo="orders"','plain')}</div></div><div class="m-welcome-art"><img src="./hero-illustration.svg" alt="整理好的洗护衣物"></div></section>
    ${metrics([['今日新增',orders.filter(o=>o.createdAt===day()).length,'按下单日期统计','list'],['洗护处理中',c('received')+c('washing'),'待洗护 '+c('received')+' · 洗护中 '+c('washing'),'wash'],['待取衣',c('ready'),'衣物已备妥，等待交付','bag'],['今日实收',money(revenue),'按收款日期统计','money']])}
    <div class="m-dashboard-grid"><div>${panel('最新订单','查看送洗与处理情况',table(orders.slice(0,5)),button('全部订单 →','data-mgo="orders"','plain'))}</div><div class="m-side-stack">${panel('待办事项','按顺序安排门店工作',`<div class="m-task-list">${[['submitted','待接收衣物','核对衣物，确认实际收衣','orders'],['received','待开始洗护','安排洗护处理','wash'],['ready','待客户领取','核对费用并交付','pickup']].map(([key,name,hint,target])=>`<button type="button" data-mgo="${target}" class="m-task"><span class="m-task-icon ${key}">${svg(key==='ready'?'bag':key==='received'?'wash':'list')}</span><span><strong>${name}</strong><small>${hint}</small></span><b>${c(key)}</b></button>`).join('')}</div>`)}<div class="m-quick"><span>常用功能</span><button data-mgo="customers" type="button">${svg('users')}客户记录 ${svg('arrow')}</button><button data-mgo="settings" type="button">${svg('settings')}洗护项目与价格 ${svg('arrow')}</button></div></div></div>`;
  }
  function ordersPage() {
    return panel('全部订单',`共 ${S().orders.length} 笔订单`,`<div class="m-filter-row"><div class="m-tabs">${[['all','全部'],...Object.entries(LABELS)].map(([key,name])=>`<button type="button" data-m-filter="${key}" class="${listFilter===key?'active':''}">${name}<span>${S().orders.filter(o=>key==='all'||o.status===key).length}</span></button>`).join('')}</div><label class="m-search">${svg('search')}<input id="m-order-search" placeholder="订单号 / 姓名 / 手机号" value="${E(search)}" aria-label="搜索订单"></label></div>${table(S().orders)}<div id="m-no-match" class="m-empty" hidden>没有找到匹配的订单</div>`);
  }
  function itemRow() {
    return `<div class="m-intake-row"><label>洗护项目<select name="service" required>${Object.entries(api.catalog).map(([id,item])=>`<option value="${id}">${E(item.name)} · ${money(S().services[id].price)}</option>`).join('')}</select></label><label>件数<input name="qty" type="number" value="1" min="1" max="99" required></label><label>颜色 / 已有瑕疵<input name="condition" placeholder="例如：米色，袖口有污渍"></label><button class="m-remove" type="button" data-m-remove aria-label="删除衣物">×</button></div>`;
  }
  function intake() {
    return `<form id="m-intake" class="m-form-layout"><div class="m-stack">${panel('<span class="m-step">01</span> 客户信息','填写客户联系方式，方便查询和取衣',`<div class="m-fields"><label>客户姓名<input name="name" placeholder="请输入客户姓名" required maxlength="30"></label><label>联系电话<input name="phone" placeholder="请输入 11 位手机号" inputmode="tel" pattern="[0-9]{11}" required></label><label>预计取衣日期<input name="expectedDate" type="date" min="${day()}" value="${day(3)}" required></label></div>`)}${panel('<span class="m-step">02</span> 衣物明细','按实际接收的衣物填写',`<div id="m-intake-items">${itemRow()}</div><button class="m-add-row" type="button" data-m-add>＋ 添加一项衣物</button>`)}${panel('<span class="m-step">03</span> 收衣备注','记录需要特别留意的洗护要求',`<label class="m-label">备注<textarea name="note" rows="3" placeholder="例如：请留意领口污渍、衣物附件等"></textarea></label>`)}</div><aside>${panel('开单汇总','核对客户与衣物后确认收衣',`<div class="m-summary-line"><span>衣物件数</span><strong id="m-intake-qty">1 件</strong></div><div class="m-summary-line"><span>费用合计</span><strong class="m-price" id="m-intake-total">${money(18)}</strong></div><div class="m-receive-tip">${svg('check')}确认后进入待洗护列表</div><button class="m-btn full" type="submit">确认收衣并开单 ${svg('arrow')}</button>`)}</aside></form>`;
  }
  function detail() {
    const order = S().orders.find(o=>o.id===currentId);
    if(!order) return empty('没有找到这笔订单');
    const steps = Object.keys(LABELS), at = steps.indexOf(order.status);
    const receiveForm = `<form id="m-receive" data-id="${E(order.id)}"><div class="m-table-wrap"><table class="m-table"><thead><tr><th>洗护项目</th><th>实际件数</th><th>衣物状况</th><th>单价</th></tr></thead><tbody>${items(order).map(([id,n])=>`<tr><td>${E(api.catalog[id]?.name)}</td><td><input class="m-small-input" name="qty-${id}" type="number" min="1" max="99" required value="${n}" aria-label="${E(api.catalog[id]?.name)}实际件数"></td><td><input name="condition-${id}" class="m-inline-input" value="${E(order.conditions?.[id]||'')}" placeholder="颜色、污渍或破损" aria-label="${E(api.catalog[id]?.name)}衣物状况"></td><td>${money(S().services[id].price)}</td></tr>`).join('')}</tbody></table></div><div class="m-receive-bottom"><label>预计取衣日期<input name="expectedDate" type="date" required min="${day()}" value="${day(3)}"></label><button class="m-btn" type="submit">确认实际收衣</button></div></form>`;
    const garmentTable = `<div class="m-table-wrap"><table class="m-table"><thead><tr><th>洗护项目</th><th>件数</th><th>衣物状况</th><th>金额</th></tr></thead><tbody>${items(order).map(([id,n])=>`<tr><td>${E(api.catalog[id]?.name)}</td><td>${n}</td><td>${E(order.conditions?.[id]||'已核对')}</td><td>${money((order.prices?.[id]??S().services[id].price)*n)}</td></tr>`).join('')}</tbody></table></div>`;
    return `<button class="m-back" data-mgo="orders" type="button">← 返回订单列表</button><div class="m-order-heading"><div><span>订单编号</span><h2>${E(order.id)}</h2><p>${E(order.name)} · ${E(order.phone)} · ${E(order.source || '顾客送洗')}</p></div><div class="m-order-actions">${badge(order)}${order.status==='received'?button('开始洗护',`data-m-advance="${E(order.id)}"`):order.status==='washing'?button('洗护完成',`data-m-advance="${E(order.id)}"`):order.status==='ready'?button('办理取衣',`data-m-pick="${E(order.id)}"`):''}</div></div><section class="m-panel m-progress">${steps.map((key,i)=>`<div class="${i<=at?'complete':''}"><i>${i<at?'✓':i+1}</i><strong>${LABELS[key]}</strong></div>`).join('')}</section><div class="m-detail-layout"><div class="m-stack">${panel('衣物明细',`共 ${qty(order)} 件衣物`,order.status==='submitted'?receiveForm:garmentTable)}${panel('处理记录','',`<ol class="m-history">${[...(order.history||[])].reverse().map(h=>`<li><strong>${E(h.text)}</strong><time>${E(h.at)}</time></li>`).join('')}</ol>`)}</div><div class="m-stack">${panel('费用信息','',`<div class="m-summary-line"><span>订单金额</span><strong class="m-price">${money(order.total)}</strong></div><div class="m-summary-line"><span>收款状态</span>${payment(order)}</div>${order.paid?`<div class="m-summary-line"><span>收款方式</span><strong>${E(order.paymentMethod)}</strong></div>`:''}`)}${panel('服务信息','',`<dl class="m-info"><dt>下单日期</dt><dd>${E(order.createdAt)}</dd><dt>预计送店</dt><dd>${E(order.visitDate||'—')}</dd><dt>预计取衣</dt><dd>${E(order.expectedDate||'—')}</dd><dt>衣物备注</dt><dd>${E(order.note||'无特别说明')}</dd></dl>`)}</div></div>`;
  }
  function wash() {
    return `<div class="m-board">${['received','washing','ready'].map(key=>{const orders=S().orders.filter(o=>o.status===key);return `<section class="m-column"><div class="m-column-title"><span class="m-dot ${key}"></span><h2>${LABELS[key]}</h2><b>${orders.length}</b></div><div class="m-board-cards">${orders.map(o=>`<article class="m-work-card"><div class="m-work-top"><span>${E(o.id)}</span>${badge(o)}</div><h3>${E(o.name)}<small>${qty(o)} 件衣物</small></h3><p>${E(summary(o))}</p><div class="m-work-date">${svg('clock')}预计取衣 ${E(o.expectedDate||'—')}</div><div class="m-work-actions">${action(o)}${key==='ready'?button('办理取衣',`data-m-pick="${E(o.id)}"`,'secondary'):button(key==='received'?'开始洗护':'洗护完成',`data-m-advance="${E(o.id)}"`,'secondary')}</div></article>`).join('')||empty('当前没有任务')}</div></section>`;}).join('')}</div>`;
  }
  function pickup() {
    const orders=S().orders.filter(o=>o.status==='ready');
    const order=orders.find(o=>o.id===currentId)||orders[0];
    return `<div class="m-pick-layout"><section class="m-panel"><div class="m-panel-head"><div><h2>待取衣订单 <span class="m-count">${orders.length}</span></h2><p>选择订单，核对后办理交付</p></div></div><div class="m-pick-list">${orders.map(o=>`<button type="button" data-m-pick="${E(o.id)}" class="m-pick-item ${o.id===order?.id?'selected':''}"><div class="m-pick-person"><span class="m-avatar">${E(o.name[0])}</span><span><strong>${E(o.name)}</strong><small>${E(o.phone)}</small></span><b>${money(o.total)}</b></div><p>${E(summary(o))}</p><div><span>${E(o.id)}</span>${payment(o)}</div></button>`).join('')||empty('暂无待取衣订单')}</div></section><div>${order?panel('核对并交付',order.id,`<div class="m-pick-heading"><span class="m-avatar large">${E(order.name[0])}</span><div><h3>${E(order.name)}</h3><p>${E(order.phone)}</p></div>${badge(order)}</div><div class="m-pick-garments">${items(order).map(([id,n])=>`<div>${E(api.catalog[id]?.name)}<strong>× ${n}</strong></div>`).join('')}</div><div class="m-summary-line"><span>应收金额</span><strong class="m-price">${money(order.total)}</strong></div><div class="m-summary-line"><span>已收金额</span><strong>${money(order.paid?order.total:0)}</strong></div>${order.paid?`<div class="m-paid-notice">${svg('check')}已完成收款 · ${E(order.paymentMethod)}</div><label class="m-check-label"><input id="m-pick-check" type="checkbox">已核对客户信息与全部衣物</label><button type="button" class="m-btn full" data-m-deliver="${E(order.id)}">确认衣物交付</button>`:`<form id="m-pay" data-id="${E(order.id)}"><div class="m-fields two"><label>收款金额<input name="amount" type="number" min="0.01" step="0.01" required value="${order.total.toFixed(2)}"></label><label>收款方式<select name="method"><option>线下电子支付</option><option>现金</option></select></label></div><button class="m-btn full" type="submit">确认收款 ${money(order.total)}</button></form>`}`):panel('交付完成','所有待取衣订单均已处理',`<div class="m-finish">${svg('check')}<h3>衣物已经交到客户手中</h3><p>已完成订单可以在订单管理中查询。</p>${button('查看全部订单','data-mgo="orders"','secondary')}</div>`)}</div></div>`;
  }
  function customers() {
    const grouped=new Map();S().orders.forEach(o=>{const c=grouped.get(o.phone)||{name:o.name,phone:o.phone,count:0,paid:0,date:o.createdAt};c.count++;c.paid+=o.paid?o.total:0;c.date=c.date>o.createdAt?c.date:o.createdAt;grouped.set(o.phone,c);});
    return panel('客户档案',`共 ${grouped.size} 位客户`,`<div class="m-table-wrap"><table class="m-table"><thead><tr><th>客户</th><th>联系电话</th><th>送洗订单</th><th>累计实收</th><th>最近送洗</th><th></th></tr></thead><tbody>${[...grouped.values()].map(c=>`<tr><td><div class="m-customer-cell"><span class="m-avatar">${E(c.name[0])}</span><strong>${E(c.name)}</strong></div></td><td>${E(c.phone)}</td><td>${c.count} 笔</td><td class="m-money">${money(c.paid)}</td><td>${E(c.date)}</td><td><button class="m-link" type="button" data-m-customer="${E(c.phone)}">订单记录 ${svg('arrow')}</button></td></tr>`).join('')}</tbody></table></div>`);
  }
  function reports() {
    const all=S().orders,paid=all.filter(o=>o.paid),sum=paid.reduce((s,o)=>s+o.total,0), days=Array.from({length:7},(_,i)=>day(i-6));
    const values=days.map(d=>paid.filter(o=>o.paidAt?.startsWith(d)).reduce((s,o)=>s+o.total,0));const max=Math.max(...values,1);
    const mix=Object.keys(api.catalog).map(id=>({name:api.catalog[id].name,n:all.reduce((s,o)=>s+(o.items[id]||0),0)})).filter(i=>i.n).sort((a,b)=>b.n-a.n);
    return `${metrics([['累计实收',money(sum),'已登记收款的订单','money'],['订单总数',all.length,'顾客提交 + 门店开单','list'],['已完成订单',all.filter(o=>o.status==='done').length,'衣物已完成交付','check'],['未收金额',money(all.filter(o=>!o.paid).reduce((s,o)=>s+o.total,0)),'尚未登记收款的订单','clock']])}<div class="m-report-grid">${panel('近七日实收','按收款日期汇总',`<div class="m-chart">${days.map((d,i)=>`<div class="m-chart-col"><span>${money(values[i])}</span><div class="m-bar-track"><i style="height:${values[i]?Math.max(4,values[i]/max*100):0}%"></i></div><small>${d.slice(5).replace('-','/')}</small></div>`).join('')}</div>`)}${panel('洗护项目分布','按衣物件数统计',`<div class="m-service-mix">${mix.slice(0,5).map(item=>`<div><span>${E(item.name)}</span><b>${item.n} 件</b><i style="--fill:${item.n/Math.max(...mix.map(x=>x.n))*100}%"></i></div>`).join('')}</div>`)}</div>${panel('收款流水','记录每笔收款及对应订单',`<div class="m-table-wrap"><table class="m-table"><thead><tr><th>订单</th><th>客户</th><th>收款方式</th><th>收款日期</th><th>收款金额</th></tr></thead><tbody>${paid.map(o=>`<tr><td>${action(o,o.id)}</td><td>${E(o.name)}</td><td>${E(o.paymentMethod||'线下电子支付')}</td><td>${E(o.paidAt||o.updatedAt)}</td><td class="m-money">${money(o.total)}</td></tr>`).join('')}</tbody></table></div>`)}`;
  }
  function settings() {
    const serviceForm=`<form id="m-prices"><div class="m-table-wrap"><table class="m-table"><thead><tr><th>洗护项目</th><th>计价单位</th><th>单价（元）</th></tr></thead><tbody>${Object.entries(api.catalog).map(([id,item])=>`<tr><td><strong>${E(item.name)}</strong></td><td>每件</td><td><input class="m-price-input" name="${id}" aria-label="${E(item.name)}单价" type="number" min="0.01" max="9999" step="0.01" required value="${S().services[id].price}"></td></tr>`).join('')}</tbody></table></div><div class="m-form-footer"><span>调整后的价格用于新订单。</span><button class="m-btn" type="submit">保存价格</button></div></form>`;
    const staff=`<div class="m-table-wrap"><table class="m-table"><thead><tr><th>员工姓名</th><th>角色</th><th>账号状态</th><th></th></tr></thead><tbody>${S().staff.map(p=>`<tr><td><div class="m-customer-cell"><span class="m-avatar">${E(p.name[0])}</span>${E(p.name)}</div></td><td>${E(p.role)}</td><td><span class="m-status ${p.enabled?'ready':'done'}">${p.enabled?'已启用':'已停用'}</span></td><td>${p.role!=='店长'?button(p.enabled?'停用':'启用',`data-m-staff="${E(p.id)}"`,'plain'):''}</td></tr>`).join('')}</tbody></table></div><form id="m-staff-add" class="m-staff-form"><label>员工姓名<input name="name" required maxlength="20" placeholder="请输入姓名"></label><label>角色<select name="role"><option>店员</option></select></label><button class="m-btn secondary" type="submit">添加员工</button></form>`;
    return panel('门店设置','',`<div class="m-tabs m-settings-tabs"><button type="button" data-m-settings="services" class="${settingsTab==='services'?'active':''}">洗护项目与价格</button><button type="button" data-m-settings="staff" class="${settingsTab==='staff'?'active':''}">员工账号</button></div>${settingsTab==='services'?serviceForm:staff}`);
  }

  function render(page,id,providedApi) {
    api=providedApi;currentPage=TITLES[page]?page:'dashboard';currentId=id||'';
    const [title,desc]=TITLES[currentPage];
    const selected=currentPage==='detail'?'orders':currentPage;
    document.title=`${title} · 拾净门店`;
    const body=({dashboard,intake,orders:ordersPage,detail,wash,pickup,customers,reports,settings})[currentPage]();
    document.getElementById('app').innerHTML=`<div class="m-shell"><aside class="m-sidebar"><a class="m-brand" href="#/store/dashboard"><span>${svg('wash')}</span><strong>拾净 <small>门店管理</small></strong></a><div class="m-store-label">拾净洗护 · 中心店 <span>营业中</span></div><div class="m-nav-label">门店运营</div><nav>${NAV.map(([key,name,ico],i)=>`${i===5?'<div class="m-nav-label">经营管理</div>':''}<button type="button" data-mgo="${key}" class="${selected===key?'active':''}" ${selected===key?'aria-current="page"':''}>${svg(ico)}${name}${key==='orders'?`<small>${S().orders.filter(o=>o.status==='submitted').length}</small>`:''}</button>`).join('')}</nav><div class="m-sidebar-user"><span class="m-avatar">林</span><div><strong>林晓</strong><small>店长 · 管理员</small></div></div></aside><div class="m-main"><header class="m-topbar"><div><span>中心店</span><i>/</i>${title}</div><div class="m-top-right"><time>${day().replaceAll('-','.')} ${['周日','周一','周二','周三','周四','周五','周六'][new Date().getDay()]}</time><span class="m-avatar small">林</span></div></header><main class="m-content"><div class="m-page-heading"><div><h1>${title}</h1><p>${desc}</p></div>${currentPage!=='intake'?button('＋ 收衣开单','data-mgo="intake"'):''}</div><div class="m-page-body">${body}</div></main></div></div>`;
    if(currentPage==='orders') filterTable();
    if(currentPage==='intake') updateIntakeTotal();
  }
  function filterTable(){const q=search.toLowerCase();let count=0;document.querySelectorAll('[data-m-row]').forEach(row=>{row.hidden=!(row.dataset.search.includes(q)&&(listFilter==='all'||row.dataset.status===listFilter));if(!row.hidden)count++;});const emptyNode=document.getElementById('m-no-match');if(emptyNode)emptyNode.hidden=count>0;}
  function updateIntakeTotal(){const form=document.getElementById('m-intake');if(!form)return;let count=0,total=0;form.querySelectorAll('.m-intake-row').forEach(row=>{const n=Number(row.querySelector('[name=qty]').value)||0;count+=n;total+=n*S().services[row.querySelector('[name=service]').value].price;});document.getElementById('m-intake-qty').textContent=count+' 件';document.getElementById('m-intake-total').textContent=money(total);}
  function newId(){return `SJ${day().replaceAll('-','')}${String(S().nextNumber++).padStart(3,'0')}`;}

  document.addEventListener('click', e=>{
    if(!document.body.classList.contains('store-mode'))return;
    const node=e.target.closest('button');if(!node)return;
    if(node.hasAttribute('data-mgo')){nav(node.dataset.mgo);return;}
    if(node.hasAttribute('data-m-detail')){nav('detail',node.dataset.mDetail);return;}
    if(node.hasAttribute('data-m-pick')){nav('pickup',node.dataset.mPick);return;}
    if(node.hasAttribute('data-m-filter')){listFilter=node.dataset.mFilter;api.refresh();return;}
    if(node.hasAttribute('data-m-customer')){search=node.dataset.mCustomer;listFilter='all';nav('orders');return;}
    if(node.hasAttribute('data-m-settings')){settingsTab=node.dataset.mSettings;api.refresh();return;}
    if(node.hasAttribute('data-m-add')){document.getElementById('m-intake-items').insertAdjacentHTML('beforeend',itemRow());updateIntakeTotal();return;}
    if(node.hasAttribute('data-m-remove')){if(document.querySelectorAll('.m-intake-row').length===1){api.toast('请至少保留一项衣物');return;}node.closest('.m-intake-row').remove();updateIntakeTotal();return;}
    if(node.hasAttribute('data-m-advance')){const o=S().orders.find(x=>x.id===node.dataset.mAdvance);if(!o)return;const next={received:'washing',washing:'ready'}[o.status];if(next){o.status=next;event(o,next==='washing'?'林晓开始洗护处理':'林晓确认洗护完成，衣物待领取');persist(next==='washing'?'已开始洗护':'衣物已移入待取衣');}return;}
    if(node.hasAttribute('data-m-deliver')){if(!document.getElementById('m-pick-check')?.checked){api.toast('请先勾选确认已核对客户和衣物');return;}const o=S().orders.find(x=>x.id===node.dataset.mDeliver);if(o?.status==='ready'&&o.paid){o.status='done';event(o,'林晓核对全部衣物并确认交付');persist('交付完成，顾客端已同步更新');}return;}
    if(node.hasAttribute('data-m-staff')){const p=S().staff.find(x=>x.id===node.dataset.mStaff);if(p&&p.role!=='店长'){p.enabled=!p.enabled;persist('员工状态已更新');}}
  });
  document.addEventListener('input',e=>{if(!api)return;if(e.target.id==='m-order-search'){search=e.target.value;filterTable();}if(e.target.closest('#m-intake'))updateIntakeTotal();});
  document.addEventListener('change',e=>{if(api&&e.target.closest('#m-intake'))updateIntakeTotal();});
  document.addEventListener('submit', e=>{
    const form=e.target;if(!form.id.startsWith('m-'))return;e.preventDefault();
    const f=name=>form.elements.namedItem(name)?.value;
    if(form.id==='m-intake'){
      const order={id:newId(),name:f('name').trim(),phone:f('phone').trim(),expectedDate:f('expectedDate'),visitDate:day(),items:{},prices:{},conditions:{},note:f('note').trim(),status:'received',source:'门店开单',createdAt:day(),updatedAt:day(),paid:false,history:[],accountId:f('phone').trim()===S().profile.phone?'customer-demo':'walk-in'};
      if(!order.name||!/^\d{11}$/.test(order.phone)){api.toast('请填写姓名与11位手机号');return;}
      form.querySelectorAll('.m-intake-row').forEach(row=>{const id=row.querySelector('[name=service]').value,n=Number(row.querySelector('[name=qty]').value),condition=row.querySelector('[name=condition]').value.trim();order.items[id]=(order.items[id]||0)+n;order.prices[id]=S().services[id].price;order.conditions[id]=[order.conditions[id],condition].filter(Boolean).join('；');});
      order.total=totalOf(order,S());event(order,'林晓登记衣物并确认收衣');S().orders.unshift(order);api.save();nav('detail',order.id);api.toast('收衣完成，已生成订单');return;
    }
    if(form.id==='m-receive'){
      const o=S().orders.find(x=>x.id===form.dataset.id);if(!o||o.status!=='submitted')return;
      o.conditions={};o.prices={};items(o).forEach(([id])=>{o.items[id]=Number(f('qty-'+id));o.conditions[id]=f('condition-'+id).trim();o.prices[id]=S().services[id].price;});
      o.total=Object.entries(o.items).reduce((sum,[id,n])=>sum+n*o.prices[id],0);o.expectedDate=f('expectedDate');o.status='received';event(o,'林晓核对衣物件数、状况及费用，确认收衣');persist('已确认实际收衣');return;
    }
    if(form.id==='m-pay'){
      const o=S().orders.find(x=>x.id===form.dataset.id);if(!o||o.paid||o.status!=='ready')return;
      if(Math.abs(Number(f('amount'))-o.total)>0.001){api.toast('请核对金额，应收 '+money(o.total));return;}
      o.paid=true;o.paidAt=day();o.paymentMethod=f('method');event(o,`林晓登记${o.paymentMethod}收款 ${money(o.total)}`);persist('收款已登记');return;
    }
    if(form.id==='m-prices'){Object.keys(api.catalog).forEach(id=>S().services[id].price=Number(f(id)));persist('项目价格已保存');return;}
    if(form.id==='m-staff-add'){const name=f('name').trim();if(!name){api.toast('请填写员工姓名');return;}S().staff.push({id:'staff-'+Date.now(),name,role:'店员',enabled:true});persist('员工已添加');}
  });
  return {initialize,render,totalOf,prices:BASE_PRICES,svg};
})();
