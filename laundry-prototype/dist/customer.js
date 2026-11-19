const STORAGE_KEY = 'shijing-customer-prototype-v02';
const SERVICE_GROUPS = [
  { id: 'daily', title: '日常衣物', subtitle: '日常清洁，也值得认真对待', description: '衬衫、裤装和针织衣物的日常洗护', icon: 'shirt', tone: 'green', items: [
    { id: 'shirt', name: '衬衫洗护', hint: '日常衣物' },
    { id: 'trousers', name: '裤装洗护', hint: '日常衣物' },
    { id: 'knit', name: '针织衫护理', hint: '针织衣物' }
  ] },
  { id: 'premium', title: '精细洗护', subtitle: '珍爱衣物，悉心照料', description: '西装、大衣和羽绒服等衣物的洗护', icon: 'hanger', tone: 'apricot', items: [
    { id: 'suit', name: '西装干洗', hint: '正式衣物' },
    { id: 'coat', name: '羊毛大衣干洗', hint: '外套衣物' },
    { id: 'down', name: '羽绒服清洗', hint: '保暖衣物' }
  ] },
  { id: 'home', title: '家居织物', subtitle: '把柔软带回日常', description: '床品和家居织物的清洁护理', icon: 'layers', tone: 'blue', items: [
    { id: 'bedding', name: '床品洗护', hint: '家居织物' },
    { id: 'curtain', name: '窗帘清洁', hint: '家居织物' }
  ] }
];
const SERVICE_BY_ID = Object.fromEntries(SERVICE_GROUPS.flatMap(group => group.items.map(item => [item.id, item])));
const STEPS = [
  { status: 'submitted', label: '已提交', description: '送洗需求已提交，等待您将衣物送到门店。' },
  { status: 'received', label: '已收衣', description: '门店已经核对并接收衣物。' },
  { status: 'washing', label: '洗护中', description: '衣物正在洗护处理中。' },
  { status: 'ready', label: '待领取', description: '衣物已备妥，可以前往领取。' },
  { status: 'done', label: '已完成', description: '衣物已交付，感谢您的信任。' }
];

const ICON_PATHS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-8h6v8"/>',
  sparkle: '<path d="m12 2 2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4L12 2Z"/>',
  receipt: '<path d="M5 3h14v18l-3-2-4 2-4-2-3 2V3Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  shirt: '<path d="m8 3 4 2 4-2 5 4-3 5-2-1v10H8V11l-2 1-3-5 5-4Z"/><path d="M8 3c.7 2 2 3 4 3s3.3-1 4-3"/>',
  hanger: '<path d="M12 8V6a2 2 0 1 1 2 2l-2 1"/><path d="m12 9 9 7a1.5 1.5 0 0 1-1 2.7H4a1.5 1.5 0 0 1-1-2.7l9-7Z"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5 9-5ZM3 12l9 5 9-5M3 16l9 5 9-5"/>',
  shield: '<path d="m12 2 8 4v6c0 5-3 8-8 10-5-2-8-5-8-10V6l8-4Z"/><path d="m9 12 2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  care: '<path d="M20 7c0 4-4 7-8 12C8 14 4 11 4 7a4 4 0 0 1 8-1 4 4 0 0 1 8 1Z"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  bag: '<path d="M4 8h16l-1 13H5L4 8ZM9 8V6a3 3 0 0 1 6 0v2"/>'
};
const icon = (name, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${ICON_PATHS[name] || ICON_PATHS.sparkle}</svg>`;
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const today = () => { const date = new Date(); date.setMinutes(date.getMinutes() - date.getTimezoneOffset()); return date.toISOString().slice(0, 10); };
const displayDate = date => date ? date.replace(/-/g, '.') : '未填写';
const createInitialState = () => ({
  profile: { name: '张女士', phone: '13800000000' },
  nextNumber: 3,
  orders: [
    { id: 'SJ20261022001', name: '张女士', phone: '13800000000', items: { coat: 1, knit: 2 }, visitDate: '2026-10-19', note: '请留意大衣袖口的污渍', status: 'ready', createdAt: '2026-10-19', updatedAt: '2026-10-22' },
    { id: 'SJ20261014002', name: '张女士', phone: '13800000000', items: { shirt: 2, trousers: 1 }, visitDate: '2026-10-12', note: '', status: 'done', createdAt: '2026-10-12', updatedAt: '2026-10-14' }
  ]
});
let state;
try { const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); state = saved && saved.profile && Array.isArray(saved.orders) ? saved : createInitialState(); }
catch { state = createInitialState(); }
let draft = { items: {}, name: state.profile.name, phone: state.profile.phone, visitDate: '', note: '' };
let ordersFilter = 'active';
let toastTimer;
const app = document.getElementById('app');
const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
StoreUI.initialize(state);
save();
const myOrders = () => state.orders.filter(order => order.accountId === 'customer-demo');
const priceOf = id => state.services[id]?.price || 0;
const amountOf = garments => Object.entries(garments).reduce((sum, [id, n]) => sum + priceOf(id) * n, 0);
const money = value => `¥${Number(value || 0).toFixed(2)}`;
const selectedItems = items => (Array.isArray(items) ? items.map(item => [item.id, item.qty]) : Object.entries(items)).filter(([id, qty]) => SERVICE_BY_ID[id] && qty > 0);
const itemCount = items => selectedItems(items).reduce((sum, [, qty]) => sum + Number(qty), 0);
const itemText = items => selectedItems(items).map(([id, qty]) => `${SERVICE_BY_ID[id].name} × ${qty}`).join('、');
const orderStatus = order => `<span class="status ${order.status}">${STEPS.find(step => step.status === order.status)?.label || '处理中'}</span>`;

function showToast(message) {
  const node = document.getElementById('toast');
  node.textContent = message;
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 2600);
}
function route() {
  const parts = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  return { page: parts[0] || 'home', id: parts[1] || '', detail: parts[2] || '' };
}
function go(page, id = '') {
  const next = `#/${page}${id ? `/${encodeURIComponent(id)}` : ''}`;
  if (location.hash === next) render(); else location.hash = next;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function footer() { return `<footer class="site-footer"><strong>拾净洗护</strong><span>让每一次穿着，都像刚刚开始。</span></footer>`; }
function pageHeading(kicker, title, intro) { return `<div class="page-head"><div><span class="eyebrow">${esc(kicker)}</span><h1 class="page-title">${esc(title)}</h1><p class="page-intro">${esc(intro)}</p></div></div>`; }

function renderHome() {
  const latest = myOrders().find(order => order.status !== 'done') || myOrders()[0];
  return `<div class="container hero-wrap"><section class="hero"><div class="hero-copy"><span class="eyebrow">A little care, every day</span><h1>衣物焕新，<br><em>生活轻盈。</em></h1><p>从日常衣物到心爱单品，给每一件衣物细致的照顾。</p><div class="hero-actions"><button class="primary-button" data-go="booking" type="button">开始送洗 ${icon('arrow','style="display:inline-block;width:17px;height:17px;vertical-align:middle;margin-left:7px"')}</button><button class="ghost-button" data-go="services" type="button">了解洗护服务 →</button></div></div><div class="hero-art"><img src="./hero-illustration.svg" alt="整洁的衣物与柔软的洗护织物插画"><div class="hero-floating"><span class="circle">${icon('care')}</span><div><strong>用心洗护</strong><small>让喜欢的衣物更长久</small></div></div></div></section>
    <div class="trust-row"><div class="trust-item"><div class="trust-icon">${icon('shield')}</div><div><strong>细心核对</strong><span>衣物信息清楚记录</span></div></div><div class="trust-item"><div class="trust-icon">${icon('clock')}</div><div><strong>进度可见</strong><span>随时查看订单状态</span></div></div><div class="trust-item"><div class="trust-icon">${icon('care')}</div><div><strong>轻松送洗</strong><span>几步提交送洗需求</span></div></div></div>
    <section class="section"><div class="section-top"><div><span class="eyebrow">Our services</span><h2>为每一种衣物，找到合适的照顾</h2></div><button class="ghost-button" data-go="services" type="button">查看全部服务 →</button></div><div class="service-grid">${SERVICE_GROUPS.map(group => `<article class="service-card" data-tone="${group.tone}"><span class="service-icon">${icon(group.icon)}</span><h3>${esc(group.title)}</h3><p>${esc(group.description)}</p><button data-go="services" type="button">探索服务 →</button></article>`).join('')}</div></section>
    <section class="section"><div class="section-top"><div><span class="eyebrow">How it works</span><h2>简单三步，安心交付</h2></div></div><div class="steps"><div class="step-card"><span class="step-number">01 / 选择</span><h3>挑选洗护项目</h3><p>选好衣物和服务，留下需要特别留意的地方。</p></div><div class="step-card"><span class="step-number">02 / 送达</span><h3>到店交付衣物</h3><p>送到门店后，由工作人员核对并接收。</p></div><div class="step-card"><span class="step-number">03 / 领取</span><h3>查看进度并取衣</h3><p>订单状态清楚可见，衣物备妥后即可领取。</p></div></div></section>
    ${latest ? `<section class="section"><div class="section-top"><div><span class="eyebrow">Your order</span><h2>最近一笔送洗</h2></div></div><div class="latest-card"><div><span class="mini-eyebrow">${esc(latest.id)}</span><h3>${esc(itemText(latest.items))}</h3><p>${esc(displayDate(latest.createdAt))} 提交</p></div><div class="latest-right">${orderStatus(latest)}<br><button class="ghost-button" data-order-id="${esc(latest.id)}" type="button">查看详情 →</button></div></div></section>` : ''}${footer()}</div>`;
}

function renderServices() {
  return `<div class="container page">${pageHeading('Service collection', '洗护服务', '选好想洗护的衣物，轻松提交送洗需求。')}<div class="service-list">${SERVICE_GROUPS.map(group => `<section class="service-group" id="service-${group.id}" style="--card-tint:${group.tone === 'apricot' ? '#fff0df' : group.tone === 'blue' ? '#e9f0f1' : '#e7f0e8'}"><div class="service-group-head"><div class="service-icon">${icon(group.icon)}</div><div><h2>${esc(group.title)}</h2><p>${esc(group.subtitle)}</p></div></div><div class="service-options">${group.items.map(item => `<div class="service-option"><div><strong>${esc(item.name)}</strong><br><span>${esc(item.hint)} · ${money(priceOf(item.id))} / 件</span></div><button type="button" data-pick-service="${esc(item.id)}">选这项 →</button></div>`).join('')}</div></section>`).join('')}</div><div class="subtle-panel" style="margin-top:18px">送洗时可填写衣物状况和特别说明。订单提交后，可以在「我的订单」查看后续进度。</div>${footer()}</div>`;
}

function renderBooking() {
  const count = itemCount(draft.items);
  const chosen = selectedItems(draft.items);
  return `<div class="container page">${pageHeading('New laundry request', '预约送洗', '选好衣物，填写联系信息，提交送洗需求。')}<form id="booking-form" class="booking-layout"><div><section class="panel"><div class="panel-head"><div><h2>01 · 选择衣物</h2><p>可以选择多种衣物，并调整件数。</p></div><span class="panel-count">已选 ${count} 件</span></div><div class="booking-items">${SERVICE_GROUPS.flatMap(group => group.items.map(item => `<div class="booking-item"><div><strong>${esc(item.name)}</strong><small>${esc(group.title)} · ${money(priceOf(item.id))} / 件</small></div><div class="qty"><button type="button" data-qty-id="${esc(item.id)}" data-delta="-1" aria-label="减少${esc(item.name)}数量">−</button><output>${draft.items[item.id] || 0}</output><button type="button" data-qty-id="${esc(item.id)}" data-delta="1" aria-label="增加${esc(item.name)}数量">＋</button></div></div>`)).join('')}</div></section><section class="panel"><div class="panel-head"><div><h2>02 · 联系信息</h2><p>方便门店核对送洗需求。</p></div></div><div class="form-grid"><div class="field"><label for="customer-name">称呼 *</label><input id="customer-name" name="name" autocomplete="name" value="${esc(draft.name)}" required></div><div class="field"><label for="customer-phone">手机号 *</label><input id="customer-phone" name="phone" inputmode="numeric" autocomplete="tel" pattern="[0-9]{11}" value="${esc(draft.phone)}" required></div><div class="field full"><label for="visit-date">预计送店日期</label><input id="visit-date" name="visitDate" type="date" min="${today()}" value="${esc(draft.visitDate)}"></div><div class="field full"><label for="customer-note">特别说明</label><textarea id="customer-note" name="note" placeholder="例如：请留意领口污渍、衣物已有破损等">${esc(draft.note)}</textarea></div></div></section></div><aside class="booking-aside"><section class="panel"><div class="panel-head"><div><h2>送洗清单</h2><p>确认后提交需求</p></div></div>${chosen.length ? `<ul class="summary-list">${chosen.map(([id, qty]) => `<li><span>${esc(SERVICE_BY_ID[id].name)}</span><strong>× ${qty}</strong></li>`).join('')}</ul>` : `<div class="mini-info">${icon('bag')}<span>还没有选择衣物。点按衣物旁的「＋」即可添加。</span></div>`}<div class="summary-line"></div><div class="summary-list"><li><span>衣物合计</span><strong class="summary-main">${count} 件</strong></li></div><div class="summary-line"></div><div class="summary-list"><li><span>预估费用</span><strong class="summary-main">${money(amountOf(draft.items))}</strong></li></div><p class="summary-note">到店后由工作人员核对衣物与费用。</p><button class="primary-button full-button" type="submit" ${count ? '' : 'disabled'}>提交送洗需求 →</button></section></aside></form>${footer()}</div>`;
}

function renderOrders() {
  const shown = myOrders().filter(order => ordersFilter === 'all' || (ordersFilter === 'done' ? order.status === 'done' : order.status !== 'done'));
  return `<div class="container page narrow">${pageHeading('My orders', '我的订单', '送洗记录和最新进度，都在这里。')}<div class="tabs"><button type="button" data-order-filter="active" class="${ordersFilter === 'active' ? 'active' : ''}">进行中</button><button type="button" data-order-filter="done" class="${ordersFilter === 'done' ? 'active' : ''}">已完成</button><button type="button" data-order-filter="all" class="${ordersFilter === 'all' ? 'active' : ''}">全部</button></div><div class="order-list">${shown.length ? shown.map(order => `<button class="order-card" type="button" data-order-id="${esc(order.id)}"><div class="order-top"><div><small>订单编号</small><strong>${esc(order.id)}</strong></div>${orderStatus(order)}</div><h3>${esc(itemText(order.items))}</h3><p>共 ${itemCount(order.items)} 件衣物 · ${esc(displayDate(order.createdAt))} 提交</p><div class="order-bottom"><span>最近更新 ${esc(displayDate(order.updatedAt))}</span><span>查看订单详情 →</span></div></button>`).join('') : `<div class="empty-state">${icon('receipt')}<h3>这里还没有订单</h3><p>挑选洗护服务，开始第一笔送洗吧。</p><button class="primary-button" type="button" data-go="booking">去送洗</button></div>`}</div>${footer()}</div>`;
}

function renderDetail(order) {
  if (!order) return `<div class="container page narrow"><button class="back-button" data-go="orders" type="button">← 返回我的订单</button><div class="empty-state"><h3>找不到这笔订单</h3><button class="secondary-button" data-go="orders" type="button">查看全部订单</button></div>${footer()}</div>`;
  const index = Math.max(0, STEPS.findIndex(step => step.status === order.status));
  return `<div class="container page"><button class="back-button" data-go="orders" type="button">← 返回我的订单</button><div class="detail-head"><div><span class="eyebrow">Order details</span><h1>订单详情</h1><p>订单编号 ${esc(order.id)}</p></div>${orderStatus(order)}</div><div class="detail-grid"><div><section class="detail-panel"><h2>洗护进度</h2><div class="progress">${STEPS.map((step, stepIndex) => `<div class="progress-step ${stepIndex <= index ? 'complete' : ''}"><i></i><strong>${esc(step.label)}</strong></div>`).join('')}</div><div class="mini-info">${icon('info')}<span>${esc(STEPS[index].description)}</span></div></section><section class="detail-panel" style="margin-top:17px"><h2>送洗衣物</h2><div class="detail-items">${selectedItems(order.items).map(([id, qty]) => `<div class="detail-item"><span>${esc(SERVICE_BY_ID[id].name)}</span><strong>× ${qty}</strong></div>`).join('')}</div></section></div><aside><section class="detail-panel"><h2>订单信息</h2><div class="detail-info"><div><span>下单人</span><strong>${esc(order.name)}</strong></div><div><span>联系电话</span><strong>${esc(order.phone)}</strong></div><div><span>提交日期</span><strong>${esc(displayDate(order.createdAt))}</strong></div><div><span>预计送店</span><strong>${esc(displayDate(order.visitDate))}</strong></div><div><span>衣物件数</span><strong>${itemCount(order.items)} 件</strong></div><div><span>订单费用</span><strong>${money(order.total)}</strong></div><div><span>收款状态</span><strong>${order.paid ? "已收款" : "待付款"}</strong></div><div><span>预计取衣</span><strong>${esc(displayDate(order.expectedDate))}</strong></div></div>${order.note ? `<div class="summary-line"></div><div class="detail-info"><div><span>特别说明</span><strong>${esc(order.note)}</strong></div></div>` : ''}</section></aside></div>${footer()}</div>`;
}

function renderProfile() {
  const initial = state.profile.name.trim().slice(0, 1) || '你';
  const masked = state.profile.phone.replace(/^(\d{3})\d{4}(\d{4})$/, '$1****$2');
  return `<div class="container page"><div class="profile-hero"><div class="avatar">${esc(initial)}</div><div><h1>${esc(state.profile.name)}</h1><p>${esc(masked)} · 欢迎来到拾净洗护</p></div></div><div class="profile-grid"><section class="panel"><div class="panel-head"><div><h2>我的信息</h2><p>下次送洗时可自动带入</p></div></div><form id="profile-form"><div class="form-grid"><div class="field"><label for="profile-name">称呼</label><input id="profile-name" name="name" autocomplete="name" value="${esc(state.profile.name)}" required></div><div class="field"><label for="profile-phone">手机号</label><input id="profile-phone" name="phone" autocomplete="tel" inputmode="numeric" pattern="[0-9]{11}" value="${esc(state.profile.phone)}" required></div></div><div class="profile-actions"><button class="primary-button" type="submit">保存信息</button></div></form></section><aside class="profile-side"><section class="panel"><div class="panel-head"><div><h2>我的送洗</h2><p>查看全部订单记录</p></div></div><button class="secondary-button" type="button" data-go="orders">查看我的订单 →</button></section></aside></div>${footer()}</div>`;
}

function renderSuccess(order) {
  if (!order) return renderOrders();
  return `<div class="container page narrow"><div class="success-box"><div class="success-icon">${icon('check')}</div><span class="eyebrow">Request received</span><h1>送洗需求已提交</h1><p>准备好衣物后即可送到门店。<br>门店实际收衣并核对后，订单进度会更新。</p><div class="success-id">订单编号 ${esc(order.id)}</div><div class="success-actions"><button class="primary-button" type="button" data-order-id="${esc(order.id)}">查看订单</button><button class="secondary-button" type="button" data-go="home">返回首页</button></div></div>${footer()}</div>`;
}

function renderPageMap() {
  const customerOrder = myOrders()[0]?.id || '';
  const storeOrder = state.orders[0]?.id || '';
  const customerPages = [
    ['home','首页','浏览服务分类、开始送洗、查看最近订单'],
    ['services','洗护服务','查看洗护项目与单价，选择要送洗的衣物'],
    ['booking','预约送洗','选择衣物和件数，填写联系方式、送店日期与备注'],
    ['orders','我的订单','按进行中、已完成分类查询送洗记录'],
    ['detail/'+encodeURIComponent(customerOrder),'订单详情','查看洗护进度、衣物明细、费用与预计取衣日期'],
    ['profile','个人信息','维护姓名和联系电话，快捷查看订单']
  ];
  const storePages = [
    ['dashboard','门店工作台','查看今日订单、实收金额和各环节待办事项'],
    ['intake','收衣开单','登记客户、衣物、已有瑕疵与费用，确认收衣'],
    ['orders','订单管理','按状态筛选，按订单号、客户或手机号搜索'],
    ['detail/'+encodeURIComponent(storeOrder),'订单详情','核对顾客送洗需求，查看费用和关键操作记录'],
    ['wash','洗护任务','按待洗护、洗护中、待取衣安排并更新任务'],
    ['pickup','取衣交付','核对衣物，登记收款并确认交付'],
    ['customers','客户管理','查看联系信息、累计消费与历史订单'],
    ['reports','经营统计','查看实收、订单量、项目分布及收款流水'],
    ['settings','基础设置','维护洗护项目单价、添加和启停员工账号']
  ];
  const cards = (pages,prefix) => `<div class="map-grid">${pages.map(([path,title,description],i)=>`<a class="map-card" href="#/${prefix}${path}"><div class="map-card-top"><span>${prefix?'M':'C'}${String(i+1).padStart(2,'0')}</span>${StoreUI.svg('arrow')}</div><h3>${title}</h3><p>${description}</p></a>`).join('')}</div>`;
  return `<div class="map-wrap"><div class="map-heading"><div><h1>一套服务，两端协同。</h1><p>顾客提交送洗，门店接收、洗护与交付。点击任一页面，直接体验对应功能。</p></div><div class="map-brand">${StoreUI.svg('wash')}</div></div><div class="map-flow"><strong>顾客提交送洗</strong><span>→</span><strong>门店确认收衣</strong><span>→</span><strong>洗护处理</strong><span>→</span><strong>收款与交付</strong><span>→</span><strong>顾客查看完成</strong></div><section class="map-section"><div class="map-section-title"><h2>顾客端</h2><span>6 个主要界面 · 送洗与查询</span></div>${cards(customerPages,'')}</section><section class="map-section"><div class="map-section-title"><h2>门店端</h2><span>9 个主要界面 · 日常作业与经营管理</span></div>${cards(storePages,'store/')}</section></div>`;
}

function render() {
  const current = route();
  const page = current.page;
  document.body.classList.toggle('store-mode', page === 'store');
  document.body.classList.toggle('map-mode', page === 'map');
  document.querySelectorAll('[data-mode]').forEach(link => {
    const active = link.dataset.mode === (page === 'store' ? 'store' : page === 'map' ? 'map' : 'customer');
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current');
  });
  if (page === 'store') {
    StoreUI.render(current.id || 'dashboard', decodeURIComponent(current.detail), { getState: () => state, save, refresh: render, toast: showToast, catalog: SERVICE_BY_ID });
    return;
  }
  if (page === 'map') { app.innerHTML = renderPageMap(); document.title = '页面总览 · 拾净洗护'; return; }
  const normalizedNav = page === 'detail' || page === 'success' ? 'orders' : page === 'booking' ? 'services' : page;
  document.querySelectorAll('[data-go]').forEach(button => {
    const active = button.dataset.go === normalizedNav && button.closest('nav');
    button.classList.toggle('active', Boolean(active));
    if (active) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
  });
  const order = myOrders().find(item => item.id === decodeURIComponent(current.id));
  app.innerHTML = ({ home: renderHome, services: renderServices, booking: renderBooking, orders: renderOrders, profile: renderProfile, detail: () => renderDetail(order), success: () => renderSuccess(order) })[page]?.() || renderHome();
  document.title = `${{ home: '首页', services: '洗护服务', booking: '预约送洗', orders: '我的订单', profile: '我的', detail: '订单详情', success: '提交成功' }[page] || '首页'} · 拾净洗护`;
  document.querySelectorAll('.nav-icon[data-icon]').forEach(node => node.innerHTML = icon(node.dataset.icon));
}

document.addEventListener('click', event => {
  const navigation = event.target.closest('[data-go]');
  if (navigation) { go(navigation.dataset.go); return; }
  const picked = event.target.closest('[data-pick-service]');
  if (picked) { const id = picked.dataset.pickService; draft.items[id] = (draft.items[id] || 0) + 1; go('booking'); return; }
  const changeQty = event.target.closest('[data-qty-id]');
  if (changeQty) { const id = changeQty.dataset.qtyId; draft.items[id] = Math.max(0, Math.min(99, (draft.items[id] || 0) + Number(changeQty.dataset.delta))); render(); return; }
  const orderLink = event.target.closest('[data-order-id]');
  if (orderLink) { go('detail', orderLink.dataset.orderId); return; }
  const filter = event.target.closest('[data-order-filter]');
  if (filter) { ordersFilter = filter.dataset.orderFilter; render(); return; }
});

document.addEventListener('input', event => {
  const form = event.target.closest('#booking-form');
  if (form && event.target.name && Object.hasOwn(draft, event.target.name)) draft[event.target.name] = event.target.value;
});
document.addEventListener('submit', event => {
  if (event.target.id === 'booking-form') {
    event.preventDefault();
    const count = itemCount(draft.items);
    if (!count) { showToast('请先选择衣物'); return; }
    if (!draft.name.trim() || !/^\d{11}$/.test(draft.phone.trim())) { showToast('请填写称呼和 11 位手机号'); return; }
    const date = today();
    const id = `SJ${date.replaceAll('-', '')}${String(state.nextNumber++).padStart(3, '0')}`;
    const order = { id, name: draft.name.trim(), phone: draft.phone.trim(), items: { ...draft.items }, visitDate: draft.visitDate, note: draft.note.trim(), status: 'submitted', createdAt: date, updatedAt: date, accountId: 'customer-demo', source: '顾客送洗', total: amountOf(draft.items), prices: Object.fromEntries(selectedItems(draft.items).map(([id]) => [id, priceOf(id)])), paid: false, history: [{at: new Date().toLocaleString('zh-CN'), text: '顾客提交送洗需求'}] };
    state.orders.unshift(order); save();
    draft = { items: {}, name: state.profile.name, phone: state.profile.phone, visitDate: '', note: '' };
    go('success', id); showToast('送洗需求提交成功'); return;
  }
  if (event.target.id === 'profile-form') {
    event.preventDefault();
    const name = event.target.elements.namedItem('name').value.trim();
    const phone = event.target.elements.namedItem('phone').value.trim();
    if (!name || !/^\d{11}$/.test(phone)) { showToast('请填写称呼和 11 位手机号'); return; }
    state.profile = { name, phone }; save(); draft.name = name; draft.phone = phone; render(); showToast('个人信息已保存');
  }
});
window.addEventListener('hashchange', render);
window.addEventListener('storage', event => {
  if (event.key === STORAGE_KEY && event.newValue) { try { state = JSON.parse(event.newValue); render(); } catch {} }
});
render();
