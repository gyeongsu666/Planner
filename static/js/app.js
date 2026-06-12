// ── 유틸 ─────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const API = async (url, opt={}) => {
  const r = await fetch(url, { headers: {'Content-Type':'application/json'}, ...opt });
  return r.json();
};

function toast(msg, type='') {
  const w = $('toast-wrap');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  w.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function impColor(n) {
  return ['','#9ca3af','#22c55e','#eab308','#f97316','#ef4444'][n] || '#9ca3af';
}
function impStars(n) {
  return '★'.repeat(n) + '☆'.repeat(5-n);
}
function statusBadge(s) {
  const cls = s === '진행중' ? 'badge-진행중' : s === '완료' ? 'badge-완료' : s === '취소' ? 'badge-취소' : 'badge-pending';
  return `<span class="badge ${cls}">${s}</span>`;
}
function dateChip(s) {
  if (s.is_deadline)
    return `<span class="deadline-chip">📌 마감 ${s.end_date}</span>`;
  if (s.multi_day)
    return `<span class="multi-chip">📆 ${s.start_date} ~ ${s.end_date}</span>`;
  return `<span class="date-chip">${s.start_date}</span>`;
}

// ── 페이지 전환 ───────────────────────────────────────────
function showPage(name, el) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  $(`page-${name}`).classList.add('active');
  if (el) el.classList.add('active');

  if (name === 'dashboard')  { loadSummary(); loadToday(); loadTop(); }
  if (name === 'schedules')  { setScheduleView(currentScheduleView); loadAll('date'); }
  if (name === 'completed')  loadCompleted();
  if (name === 'statistics') {
    const t = new Date();
    $('stat-year').value  = t.getFullYear();
    $('stat-month').value = t.getMonth() + 1;
    loadStats();
  }
}

// ── 일정 카드 렌더 ────────────────────────────────────────
function renderCard(s, showActions=true) {
  const memo = s.memo ? `<div class="sc-memo">📝 ${s.memo}</div>` : '';
  const acts = showActions ? `
    <div class="sc-actions">
      <button class="btn-icon" onclick="openEditModal(${s.id})" title="수정">✏️</button>
      <button class="btn-icon" onclick="openStatusModal(${s.id})" title="상태 변경">🔄</button>
      <button class="btn-icon danger" onclick="deleteSchedule(${s.id})" title="삭제">🗑️</button>
    </div>` : '';
  return `
    <div class="schedule-card" data-id="${s.id}">
      <div class="sc-imp-bar" style="background:${impColor(s.importance)}"></div>
      <div class="sc-body">
        <div class="sc-title">
          ${s.title}
          ${statusBadge(s.status)}
          ${dateChip(s)}
        </div>
        <div class="sc-meta">
          <span>${s.is_deadline ? `⏰ 마감 ${s.end_time}` : `🕐 ${s.start_time} ~ ${s.end_time}`}</span>
          <span style="color:${impColor(s.importance)}">${impStars(s.importance)}</span>
          ${s.completed_at ? `<span>완료: ${s.completed_at}</span>` : ''}
        </div>
        ${memo}
      </div>
      ${acts}
    </div>`;
}

// ── 달력 뷰 렌더 ─────────────────────────────────────────
let calendarYear = new Date().getFullYear();
let calendarMonth = new Date().getMonth(); // 0-based
let calendarItems = [];
let selectedCalDate = null;

function renderCalendar(items) {
  calendarItems = items;
  const wrap = $('cal-wrap');
  if (!wrap) return;

  const today = new Date();
  const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const totalCells = firstDay + daysInMonth;
  const totalRows  = Math.ceil(totalCells / 7);

  const monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  const dayNames   = ['일','월','화','수','목','금','토'];

  const pad = n => String(n).padStart(2,'0');
  const toCell = day => `${calendarYear}-${pad(calendarMonth+1)}-${pad(day)}`;
  const monthStart = toCell(1);
  const monthEnd   = toCell(daysInMonth);

  const visible = items.filter(s => s.start_date <= monthEnd && s.end_date >= monthStart);

  function cellIdx(dateStr) {
    const day = parseInt(dateStr.slice(8));
    return firstDay + Math.max(1, Math.min(daysInMonth, day)) - 1;
  }

  // 행×레인 점유 맵
  const LANES = 3;
  const occupied = {}; // `${row}-${lane}-${col}` => id
  const evtLayout = [];

  const sorted = [...visible].sort((a,b) => a.start_date.localeCompare(b.start_date));

  for (const s of sorted) {
    const startIdx = Math.max(cellIdx(s.start_date), 0);
    const endIdx   = Math.min(cellIdx(s.end_date), totalCells - 1);
    let idx = startIdx;
    while (idx <= endIdx) {
      const row      = Math.floor(idx / 7);
      const rowEnd   = Math.min((row + 1) * 7 - 1, endIdx);
      const colStart = idx % 7;
      const colEnd   = rowEnd % 7;
      let lane = -1;
      outer: for (let l = 0; l < LANES; l++) {
        for (let c = colStart; c <= colEnd; c++) {
          if (occupied[`${row}-${l}-${c}`]) continue outer;
        }
        lane = l; break;
      }
      if (lane >= 0) {
        for (let c = colStart; c <= colEnd; c++) occupied[`${row}-${lane}-${c}`] = s.id;
        evtLayout.push({ row, lane, colStart, colEnd, s,
          isSegStart: idx === startIdx,
          isSegEnd:   rowEnd === endIdx });
      }
      idx = rowEnd + 1;
    }
  }

  let html = `
    <div class="cal-nav">
      <button class="btn btn-sm" onclick="calNav(-1)">‹ 이전</button>
      <span class="cal-title">${calendarYear}년 ${monthNames[calendarMonth]}</span>
      <button class="btn btn-sm" onclick="calNav(1)">다음 ›</button>
    </div>
    <div class="cal-outer">
      <div class="cal-head-row">
        ${dayNames.map((d,i)=>`<div class="cal-head ${i===0?'sun':i===6?'sat':''}">${d}</div>`).join('')}
      </div>
      <div class="cal-body" style="--cal-rows:${totalRows}">`;

  for (let row = 0; row < totalRows; row++) {
    html += `<div class="cal-row">`;
    for (let col = 0; col < 7; col++) {
      const ci  = row * 7 + col;
      const day = ci - firstDay + 1;
      if (day < 1 || day > daysInMonth) {
        html += `<div class="cal-cell empty"></div>`;
      } else {
        const isToday    = today.getFullYear()===calendarYear && today.getMonth()===calendarMonth && today.getDate()===day;
        const cellDate   = toCell(day);
        const isSelected = selectedCalDate === cellDate;
        html += `<div class="cal-cell ${isToday?'today':''} ${isSelected?'selected':''} ${col===0?'sun':col===6?'sat':''}" onclick="calDayClick(${calendarYear},${calendarMonth+1},${day})"><div class="cal-day">${day}</div></div>`;
      }
    }
    html += `</div>`;
  }

  html += `<div class="cal-events-layer">`;
  for (const ev of evtLayout) {
    const { row, lane, colStart, colEnd, s, isSegStart, isSegEnd } = ev;
    const color = impColor(s.importance);
    const borderRadius = isSegStart && isSegEnd ? '4px'
      : isSegStart ? '4px 0 0 4px'
      : isSegEnd   ? '0 4px 4px 0' : '0';
    html += `<div class="cal-evt-abs" style="` +
      `left:calc(${colStart}/7*100% + 2px);` +
      `width:calc(${colEnd-colStart+1}/7*100% - 4px);` +
      `top:calc(${row}*var(--cal-row-h) + 28px + ${lane}*20px);` +
      `background:${color}33;` +
      `border-left:${isSegStart?`3px solid ${color}`:'none'};` +
      `border-radius:${borderRadius}" title="${s.title}">` +
      `${isSegStart?`<span style="color:${color};font-weight:600">${s.title}</span>`:''}` +
      `</div>`;
  }
  html += `</div></div></div>`;
  wrap.innerHTML = html;
}

function calNav(dir) {
  calendarMonth += dir;
  if (calendarMonth < 0) { calendarMonth = 11; calendarYear--; }
  if (calendarMonth > 11) { calendarMonth = 0; calendarYear++; }
  selectedCalDate = null;
  $('cal-day-panel').style.display = 'none';
  renderCalendar(calendarItems);
}

function calDayClick(year, month, day) {
  const pad = n => String(n).padStart(2, '0');
  const dateStr = `${year}-${pad(month)}-${pad(day)}`;
  if (selectedCalDate === dateStr) { closeDayPanel(); return; }
  selectedCalDate = dateStr;
  _renderDayPanel(dateStr, calendarItems);
  renderCalendar(calendarItems);
}

function _renderDayPanel(dateStr, items) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dayItems  = [...items]
    .filter(s => s.start_date <= dateStr && s.end_date >= dateStr)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));
  const label = new Date(y, m - 1, d)
    .toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
  const panel = $('cal-day-panel');
  panel.innerHTML =
    `<div class="cdp-header"><span>${label} · ${dayItems.length}건</span><button class="btn-icon" onclick="closeDayPanel()">✕</button></div>` +
    (dayItems.length
      ? `<div class="cdp-list">${dayItems.map(s => renderCard(s)).join('')}</div>`
      : `<div class="cdp-empty">📭 이 날의 일정이 없습니다</div>`);
  panel.style.display = 'block';
}

function closeDayPanel() {
  selectedCalDate = null;
  $('cal-day-panel').style.display = 'none';
  renderCalendar(calendarItems);
}

// ── 전체 일정 뷰 전환 ────────────────────────────────────
let currentScheduleView = 'list';

function setScheduleView(type) {
  currentScheduleView = type;
  const listWrap = $('all-list');
  const calWrap  = $('cal-wrap');
  const btnList  = $('view-btn-list');
  const btnCal   = $('view-btn-cal');

  if (type === 'list') {
    listWrap.style.display = '';
    calWrap.style.display  = 'none';
    btnList.classList.add('active');
    btnCal.classList.remove('active');
    selectedCalDate = null;
    $('cal-day-panel').style.display = 'none';
  } else {
    listWrap.style.display = 'none';
    calWrap.style.display  = '';
    btnList.classList.remove('active');
    btnCal.classList.add('active');
    calendarYear  = new Date().getFullYear();
    calendarMonth = new Date().getMonth();
    renderCalendar(calendarItems);
  }
}

function renderList(items, containerId, showActions=true) {
  const el = $(containerId);
  if (!items || !items.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">일정이 없습니다</div></div>`;
    return;
  }
  el.innerHTML = items.map(s => renderCard(s, showActions)).join('');
}

// ── 데이터 로드 ───────────────────────────────────────────
async function loadSummary() {
  const d = await API('/api/summary');
  $('s-today').textContent   = d.today_count;
  $('s-today-sub').textContent = `진행중 ${d.in_progress_count}건`;
  $('s-week').textContent    = `${d.week_rate}%`;
  $('s-week-sub').textContent = `${d.week_done} / ${d.week_total}건`;
  $('s-pending').textContent = d.pending_count;
  $('s-done').textContent    = d.completed_count;
  $('s-done-sub').textContent = `전체 ${d.total_count}건`;
}

async function loadToday() {
  const items = await API('/api/schedules/today');
  renderList(items, 'today-list');
}

async function loadAll(sort='date', btn=null) {
  if (btn) {
    document.querySelectorAll('#page-schedules .sort-bar .btn-sm').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
  }
  const items = await API(`/api/schedules?sort=${sort}`);
  calendarItems = items;
  renderList(items, 'all-list');
  if (currentScheduleView === 'cal') {
    renderCalendar(items);
    if (selectedCalDate) _renderDayPanel(selectedCalDate, items);
  }
}

async function loadCompleted() {
  const items = await API('/api/schedules/completed');
  const el = $('completed-list');
  if (!items || !items.length) {
    el.innerHTML = `<div class="empty"><div class="empty-icon">📭</div><div class="empty-text">완료된 일정이 없습니다</div></div>`;
    return;
  }
  el.innerHTML = items.map(s => `
    <div class="schedule-card" data-id="${s.id}">
      <div class="sc-imp-bar" style="background:${impColor(s.importance)}"></div>
      <div class="sc-body">
        <div class="sc-title">
          ${s.title}
          ${statusBadge(s.status)}
          ${dateChip(s)}
        </div>
        <div class="sc-meta">
          <span>${s.is_deadline ? `⏰ 마감 ${s.end_time}` : `🕐 ${s.start_time} ~ ${s.end_time}`}</span>
          <span style="color:${impColor(s.importance)}">${impStars(s.importance)}</span>
          ${s.completed_at ? `<span>완료: ${s.completed_at}</span>` : ''}
        </div>
        ${s.memo ? `<div class="sc-memo">📝 ${s.memo}</div>` : ''}
      </div>
      <div class="sc-actions">
        <button class="btn-icon" onclick="uncompleteSchedule(${s.id})" title="완료 취소 (전체 일정으로 복원)">↩️</button>
        <button class="btn-icon danger" onclick="deleteSchedule(${s.id})" title="삭제">🗑️</button>
      </div>
    </div>`).join('');
}

async function loadTop() {
  const items = await API('/api/schedules/top?n=5');
  const el = $('top-list');
  if (!items.length) {
    el.innerHTML = '<div class="empty" style="padding:20px"><div class="empty-text">활성 일정이 없습니다</div></div>';
    return;
  }
  const rankClass = ['gold','silver','bronze'];
  el.innerHTML = items.map((s,i) => `
    <div class="top-item">
      <div class="top-rank ${rankClass[i]||''}">${i+1}</div>
      <div class="top-body">
        <div class="top-title">${s.title}</div>
        <div class="top-meta">${s.start_date}${s.multi_day ? ' ~ '+s.end_date : ''} · ${s.start_time}</div>
      </div>
      <div class="top-imp" style="color:${impColor(s.importance)}">${impStars(s.importance)}</div>
    </div>`).join('');
}

// ── 날짜 유형 토글 ───────────────────────────────────────
function setDateType(type) {
  const dl = type === 'deadline';
  $('dt-range').classList.toggle('active', !dl);
  $('dt-deadline').classList.toggle('active', dl);
  $('fg-start-date').style.display  = dl ? 'none' : '';
  $('fg-start-time').style.display  = dl ? 'none' : '';
  $('fg-quick').style.display       = dl ? 'none' : '';
  $('lbl-end-date').textContent     = dl ? '마감일 *'   : '종료 날짜 *';
  $('lbl-end-time').textContent     = dl ? '마감 시간 *' : '종료 시간 *';
}

// ── 추가/수정 모달 ────────────────────────────────────────
function openAddModal() {
  $('modal-title').textContent = '일정 추가';
  $('edit-id').value = '';
  $('f-title').value = '';
  const today = new Date().toISOString().slice(0,10);
  $('f-start-date').value = today;
  $('f-end-date').value   = today;
  $('f-start-ampm').value = 'AM';
  $('f-start-hour').value = '9';
  $('f-start-min').value  = '00';
  $('f-end-ampm').value   = 'AM';
  $('f-end-hour').value   = '10';
  $('f-end-min').value    = '00';
  $('f-importance').value = '3';
  $('f-memo').value = '';
  setDateType('range');
  $('modal').style.display = 'flex';
}

async function openEditModal(id) {
  const all = await API('/api/schedules');
  const s   = all.find(x => x.id === id);
  if (!s) return;
  $('modal-title').textContent = '일정 수정';
  $('edit-id').value          = s.id;
  $('f-title').value          = s.title;
  $('f-start-date').value     = s.start_date;
  $('f-end-date').value       = s.end_date;

  // 시작 시간 파싱
  const [sh, sm] = s.start_time.split(':').map(Number);
  $('f-start-ampm').value = sh < 12 ? 'AM' : 'PM';
  $('f-start-hour').value = String(sh === 0 ? 12 : sh > 12 ? sh - 12 : sh);
  $('f-start-min').value  = String(sm).padStart(2,'0');

  // 종료 시간 파싱
  const [eh, em] = s.end_time.split(':').map(Number);
  $('f-end-ampm').value = eh < 12 ? 'AM' : 'PM';
  $('f-end-hour').value = String(eh === 0 ? 12 : eh > 12 ? eh - 12 : eh);
  $('f-end-min').value  = String(em).padStart(2,'0');

  $('f-importance').value     = s.importance;
  $('f-memo').value           = s.memo || '';
  setDateType(s.is_deadline ? 'deadline' : 'range');
  $('modal').style.display = 'flex';
}

function closeModal() { $('modal').style.display = 'none'; }

function getTime(prefix) {
  const ampm = $(prefix+'-ampm').value;
  let h = parseInt($(prefix+'-hour').value);
  const m = $(prefix+'-min').value;
  if (ampm === 'AM') {
    if (h === 12) h = 0;
  } else {
    if (h !== 12) h += 12;
  }
  return `${String(h).padStart(2,'0')}:${m}`;
}

function setQuick(type) {
  const today = new Date().toISOString().slice(0,10);
  $('f-start-date').value = today;

  // 퀵 설정: 시작 00:00, 종료 23:59
  $('f-start-ampm').value = 'AM';
  $('f-start-hour').value = '12'; // 12 AM = 00:00
  $('f-start-min').value  = '00';
  $('f-end-ampm').value   = 'PM';
  $('f-end-hour').value   = '11';
  $('f-end-min').value    = '59';

  if (type === 'week') {
    const end = new Date(); end.setDate(end.getDate() + 6);
    $('f-end-date').value = end.toISOString().slice(0,10);
  } else if (type === 'month') {
    const end = new Date(); end.setMonth(end.getMonth() + 1); end.setDate(end.getDate() - 1);
    $('f-end-date').value = end.toISOString().slice(0,10);
  } else {
    $('f-end-date').value = today;
  }
}

async function submitSchedule() {
  const id          = $('edit-id').value;
  const is_deadline = $('dt-deadline').classList.contains('active');
  const body = {
    title       : $('f-title').value.trim(),
    is_deadline : is_deadline,
    start_date  : is_deadline ? $('f-end-date').value : $('f-start-date').value,
    end_date    : $('f-end-date').value,
    start_time  : is_deadline ? '00:00' : getTime('f-start'),
    end_time    : getTime('f-end'),
    importance  : $('f-importance').value,
    memo        : $('f-memo').value.trim(),
  };
  if (!body.title || !body.end_date || !body.end_time) {
    toast('필수 항목을 모두 입력해주세요.', 'error'); return;
  }
  if (!is_deadline && body.start_date > body.end_date) {
    toast('종료 날짜는 시작 날짜 이후여야 합니다.', 'error'); return;
  }

  const url    = id ? `/api/schedules/${id}` : '/api/schedules';
  const method = id ? 'PUT' : 'POST';
  const data   = await API(url, { method, body: JSON.stringify(body) });

  if (data.ok) {
    closeModal();
    toast(id ? '일정이 수정되었습니다.' : '일정이 추가되었습니다.', 'success');
    refreshCurrentPage();
  } else {
    toast(data.error || '오류가 발생했습니다.', 'error');
  }
}

// ── 삭제 ─────────────────────────────────────────────────
async function deleteSchedule(id) {
  if (!confirm('이 일정을 삭제하시겠습니까?')) return;
  const data = await API(`/api/schedules/${id}`, { method: 'DELETE' });
  if (data.ok) {
    document.querySelector(`[data-id="${id}"]`)?.remove();
    toast('일정이 삭제되었습니다.', 'success');
    loadSummary();
  } else {
    toast(data.error || '삭제 실패', 'error');
  }
}

// ── 완료 취소 ─────────────────────────────────────────────
async function uncompleteSchedule(id) {
  if (!confirm('이 일정을 전체 일정으로 복원하시겠습니까?')) return;
  const data = await API(`/api/schedules/${id}/uncomplete`, { method: 'PATCH' });
  if (data.ok) {
    toast('일정이 전체 일정으로 복원되었습니다.', 'success');
    loadCompleted();
    loadSummary();
  } else {
    toast(data.error || '오류', 'error');
  }
}

// ── 상태 변경 ─────────────────────────────────────────────
function openStatusModal(id) {
  $('status-target-id').value = id;
  $('status-modal').style.display = 'flex';
}
function closeStatusModal() { $('status-modal').style.display = 'none'; }

async function setStatus(val) {
  const id   = $('status-target-id').value;
  const data = await API(`/api/schedules/${id}/status`, {
    method: 'PATCH', body: JSON.stringify({ status: val })
  });
  if (data.ok) {
    closeStatusModal();
    toast(`상태가 "${val}"(으)로 변경되었습니다.`, 'success');
    refreshCurrentPage();
  } else {
    toast(data.error || '오류', 'error');
  }
}

// ── 검색 ─────────────────────────────────────────────────
function switchTab(name, btn) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('show'));
  document.querySelectorAll('#page-search .tab').forEach(b => b.classList.remove('active'));
  $(`tab-${name}`).classList.add('show');
  btn.classList.add('active');
}

async function doSearch(type) {
  let url = '/api/schedules/search?';
  let label = '';
  if (type === 'keyword') {
    const kw = $('s-keyword').value.trim();
    if (!kw) { toast('검색어를 입력하세요.', 'error'); return; }
    url += `keyword=${encodeURIComponent(kw)}`;
    label = `"${kw}" 검색 결과`;
  } else if (type === 'date') {
    const d = $('s-date').value;
    if (!d) { toast('날짜를 선택하세요.', 'error'); return; }
    url += `date=${d}`;
    label = `${d} 일정`;
  } else {
    const s = $('s-start').value, e = $('s-end').value;
    if (!s || !e) { toast('시작일과 종료일을 선택하세요.', 'error'); return; }
    url += `start=${s}&end=${e}`;
    label = `${s} ~ ${e} 일정`;
  }
  const items = await API(url);
  const lbl   = $('search-result-label');
  lbl.style.display = 'block';
  lbl.textContent   = `${label} — ${items.length}건`;
  renderList(items, 'search-list');
}

// ── 통계 ─────────────────────────────────────────────────
async function loadStats() {
  const year  = $('stat-year').value;
  const month = $('stat-month').value;
  const data  = await API(`/api/stats?year=${year}&month=${month}`);
  const m = data.monthly;

  $('stat-rate').textContent     = `${m.rate}%`;
  $('stat-rate-sub').textContent = `완료 ${m.completed}건 / 전체 ${m.total}건`;
  $('stat-rate-bar').style.width = `${m.rate}%`;

  const imp    = data.importance;
  const maxTot = Math.max(...Object.values(imp).map(v => v.total), 1);
  $('stat-importance').innerHTML = [5,4,3,2,1].map(i => {
    const v   = imp[i];
    const pct = v.total ? Math.round(v.total / maxTot * 100) : 0;
    return `
      <div class="imp-dist-row">
        <div class="imp-dist-label" style="color:${impColor(i)}">★${i}</div>
        <div class="imp-dist-bg"><div class="imp-dist-bar" style="width:${pct}%;background:${impColor(i)}"></div></div>
        <div class="imp-dist-cnt">${v.completed}/${v.total}</div>
      </div>`;
  }).join('');

}

// ── 현재 페이지 새로고침 ──────────────────────────────────
function refreshCurrentPage() {
  const active = document.querySelector('.page.active');
  if (!active) return;
  const id = active.id;
  if (id === 'page-dashboard')  { loadSummary(); loadToday(); loadTop(); }
  if (id === 'page-schedules')  loadAll();
  if (id === 'page-completed')  loadCompleted();
}

// ── 모달 오버레이 클릭 닫기 ───────────────────────────────

// ── 스탯 카드 패널 ────────────────────────────────────────
const STAT_PANEL_CONFIG = {
  today:   { title: '📅 오늘 일정',    icon: '📅' },
  week:    { title: '📈 이번 주 완료', icon: '✅' },
  pending: { title: '⏳ 대기 중 일정', icon: '⏳' },
  done:    { title: '📦 전체 완료',    icon: '📦' },
};

async function openStatPanel(type) {
  const cfg = STAT_PANEL_CONFIG[type];
  $('stat-panel-title').textContent = cfg.title;

  let items = [];
  if (type === 'today') {
    items = await API('/api/schedules/today');
  } else if (type === 'week') {
    const all = await API('/api/schedules/completed');
    const now = new Date();
    const weekStart = new Date(now); weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd   = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    const ws = weekStart.toISOString().slice(0,10);
    const we = weekEnd.toISOString().slice(0,10);
    items = all.filter(s => s.start_date >= ws && s.start_date <= we);
  } else if (type === 'pending') {
    const all = await API('/api/schedules');
    items = all.filter(s => s.status === '대기');
  } else if (type === 'done') {
    items = await API('/api/schedules/completed');
    items = items.filter(s => s.status === '완료');
  }

  const el = $('stat-panel-list');
  if (!items.length) {
    el.innerHTML = '<div class="sp-empty">해당 일정이 없습니다</div>';
  } else {
    el.innerHTML = items.map(s => `
      <div class="sp-item">
        <div class="sp-imp" style="background:${impColor(s.importance)}"></div>
        <div class="sp-info">
          <div class="sp-title">${s.title}</div>
          <div class="sp-meta">
            <span>📅 ${s.multi_day ? s.start_date+' ~ '+s.end_date : s.start_date}</span>
            <span>${s.is_deadline ? `⏰ 마감 ${s.end_time}` : `🕐 ${s.start_time} ~ ${s.end_time}`}</span>
          </div>
        </div>
        ${statusBadge(s.status)}
      </div>`).join('');
  }

  $('stat-panel').style.display = 'flex';
}

function closeStatPanel() { $('stat-panel').style.display = 'none'; }
function onOverlayClick(e, id) {
  if (e.target.id === id) {
    if (id === 'modal') closeModal();
    if (id === 'status-modal') closeStatusModal();
    if (id === 'stat-panel') closeStatPanel();
  }
}

// ── 미니 모드 (위젯) ──────────────────────────────────
async function launchWidget() {
  const data = await API('/api/widget', { method: 'POST' });
  if (data.ok) {
    toast('미니 모드를 실행했습니다.', 'success');
  } else {
    toast(data.error || '오류가 발생했습니다.', 'error');
  }
}

// ── 초기화 ───────────────────────────────────────────────
(function init() {
  const now = new Date();
  const ks  = now.toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' });
  $('sidebar-date').textContent   = ks;
  $('dash-date-sub').textContent  = ks;
  loadSummary(); loadToday(); loadTop();
})();
