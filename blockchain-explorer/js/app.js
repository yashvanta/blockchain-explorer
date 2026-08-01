'use strict';

let allData     = [];
let filtered    = [];
let currentPage = 1;
const PAGE_SIZE = 25;
let sortKey     = 'timestamp';
let sortDir     = 'desc';
let queryResults = [];
let chartsBuilt  = {};

// ── INIT ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  allData  = window.TX_DATA || [];
  filtered = allData.slice();
  populateDropdowns();
  buildKPIs();
  buildDashboardCharts();
  buildStats();
  applyFilters();
});

// ── TAB SWITCHING ─────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.querySelector('[data-tab="' + tab + '"]').classList.add('active');
  if (tab === 'analytics' && !chartsBuilt.analytics) {
    buildAnalyticsCharts();
    chartsBuilt.analytics = true;
  }
}

// ── DROPDOWNS ─────────────────────────────────────
function populateDropdowns() {
  const tokens  = [...new Set(allData.map(t => t.token))].sort();
  const methods = [...new Set(allData.map(t => t.method))].sort();
  document.getElementById('filter-token').innerHTML =
    '<option value="">All tokens</option>' + tokens.map(t => `<option>${t}</option>`).join('');
  document.getElementById('filter-method').innerHTML =
    '<option value="">All methods</option>' + methods.map(m => `<option>${m}</option>`).join('');
}

// ── FILTER ────────────────────────────────────────
function applyFilters() {
  const q   = (document.getElementById('search-input').value || '').toLowerCase();
  const net = document.getElementById('filter-network').value;
  const sts = document.getElementById('filter-status').value;
  const tok = document.getElementById('filter-token').value;
  const met = document.getElementById('filter-method').value;

  filtered = allData.filter(t => {
    if (net && t.network !== net) return false;
    if (sts && t.status  !== sts) return false;
    if (tok && t.token   !== tok) return false;
    if (met && t.method  !== met) return false;
    if (q) {
      if (!(t.hash + t.from + t.to + t.token + t.network + t.method).toLowerCase().includes(q)) return false;
    }
    return true;
  });

  sortData();
  currentPage = 1;
  renderTable();
  document.getElementById('result-count').textContent =
    `Showing ${filtered.length.toLocaleString()} of ${allData.length.toLocaleString()} transactions`;
}

function clearFilters() {
  ['search-input','filter-network','filter-status','filter-token','filter-method']
    .forEach(id => { const el = document.getElementById(id); el.value = ''; });
  applyFilters();
}

// ── SORT ─────────────────────────────────────────
function sortTable(key) {
  sortDir = (sortKey === key && sortDir === 'desc') ? 'asc' : 'desc';
  sortKey = key;
  document.querySelectorAll('#tx-table th[aria-sort]').forEach(th => th.setAttribute('aria-sort','none'));
  const th = document.querySelector(`#tx-table th[onclick="sortTable('${key}')"]`);
  if (th) th.setAttribute('aria-sort', sortDir === 'asc' ? 'ascending' : 'descending');
  sortData();
  renderTable();
}

function sortData() {
  filtered.sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey];
    if (typeof va === 'string') { va = va.toLowerCase(); vb = vb.toLowerCase(); }
    return va < vb ? (sortDir === 'asc' ? -1 : 1) : va > vb ? (sortDir === 'asc' ? 1 : -1) : 0;
  });
}

// ── RENDER TABLE ──────────────────────────────────
function renderTable() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const page  = filtered.slice(start, start + PAGE_SIZE);
  const tbody = document.getElementById('tx-body');

  tbody.innerHTML = page.length ? page.map(tx => `
    <tr>
      <td class="hash-cell" title="${tx.hash}">${tx.hash.slice(0,14)}…</td>
      <td>${tx.timestamp.replace('T',' ').replace('Z','')}</td>
      <td><span class="network-tag net-${tx.network}">${tx.network}</span></td>
      <td><strong>${tx.token}</strong></td>
      <td>${tx.value.toFixed(4)}</td>
      <td>$${tx.valueUSD.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
      <td>${tx.gasFeeETH.toFixed(5)}</td>
      <td>${tx.method}</td>
      <td><span class="status-badge s-${tx.status}">${tx.status}</span></td>
      <td><button class="btn-detail" onclick="openModal(${tx.id})">View</button></td>
    </tr>`).join('')
    : '<tr><td colspan="10" class="empty-msg">No transactions match current filters.</td></tr>';

  const total = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  document.getElementById('page-info').textContent = `Page ${currentPage} of ${total}`;
  document.getElementById('btn-prev').disabled = currentPage <= 1;
  document.getElementById('btn-next').disabled = currentPage >= total;
}

function changePage(dir) {
  currentPage = Math.max(1, Math.min(Math.ceil(filtered.length / PAGE_SIZE), currentPage + dir));
  renderTable();
}

// ── MODAL ─────────────────────────────────────────
function openModal(id) {
  const tx = allData.find(t => t.id === id);
  if (!tx) return;
  document.getElementById('modal-title').textContent = 'Transaction #' + tx.id;
  document.getElementById('modal-body').innerHTML = `
    <div class="modal-field"><div class="modal-lbl">Hash</div><div class="modal-val mono">${tx.hash}</div></div>
    <div class="modal-grid">
      <div class="modal-field"><div class="modal-lbl">Status</div><div class="modal-val"><span class="status-badge s-${tx.status}">${tx.status}</span></div></div>
      <div class="modal-field"><div class="modal-lbl">Network</div><div class="modal-val"><span class="network-tag net-${tx.network}">${tx.network}</span></div></div>
      <div class="modal-field"><div class="modal-lbl">Token</div><div class="modal-val"><strong>${tx.token}</strong></div></div>
      <div class="modal-field"><div class="modal-lbl">Method</div><div class="modal-val">${tx.method}</div></div>
      <div class="modal-field"><div class="modal-lbl">Value</div><div class="modal-val">${tx.value} ${tx.token}</div></div>
      <div class="modal-field"><div class="modal-lbl">Value USD</div><div class="modal-val">$${tx.valueUSD.toLocaleString()}</div></div>
      <div class="modal-field"><div class="modal-lbl">Gas Price</div><div class="modal-val">${tx.gasPrice} Gwei</div></div>
      <div class="modal-field"><div class="modal-lbl">Gas Used</div><div class="modal-val">${tx.gasUsed.toLocaleString()}</div></div>
      <div class="modal-field"><div class="modal-lbl">Gas Fee ETH</div><div class="modal-val">${tx.gasFeeETH}</div></div>
      <div class="modal-field"><div class="modal-lbl">Block</div><div class="modal-val">${tx.blockNumber.toLocaleString()}</div></div>
      <div class="modal-field"><div class="modal-lbl">Confirmations</div><div class="modal-val">${tx.confirmations.toLocaleString()}</div></div>
      <div class="modal-field"><div class="modal-lbl">Nonce</div><div class="modal-val">${tx.nonce}</div></div>
    </div>
    <div class="modal-field"><div class="modal-lbl">From</div><div class="modal-val mono">${tx.from}</div></div>
    <div class="modal-field"><div class="modal-lbl">To</div><div class="modal-val mono">${tx.to}</div></div>
    <div class="modal-field"><div class="modal-lbl">Timestamp</div><div class="modal-val">${tx.timestamp}</div></div>`;
  const m = document.getElementById('tx-modal');
  m.hidden = false;
  m.querySelector('.modal-close').focus();
}

function closeModal() { document.getElementById('tx-modal').hidden = true; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
document.getElementById('tx-modal').addEventListener('click', e => {
  if (e.target === document.getElementById('tx-modal')) closeModal();
});

// ── KPIs ─────────────────────────────────────────
function buildKPIs() {
  const confirmed = allData.filter(t => t.status === 'confirmed');
  const totalUSD  = allData.reduce((s,t) => s + t.valueUSD, 0);
  const avgGas    = allData.reduce((s,t) => s + t.gasFeeETH, 0) / allData.length;
  const kpis = [
    { label:'Total Transactions', val: allData.length.toLocaleString(), delta:'Full dataset', up:true },
    { label:'Confirmed', val: confirmed.length.toLocaleString(), delta: ((confirmed.length/allData.length)*100).toFixed(1)+'% success rate', up:true },
    { label:'Total Volume', val: '$'+Math.round(totalUSD/1e6)+'M+', delta:'USD across all networks', up:true },
    { label:'Avg Gas Fee', val: avgGas.toFixed(5)+' ETH', delta:'Per transaction', up:false },
    { label:'Networks', val: new Set(allData.map(t=>t.network)).size, delta:'Ethereum·BSC·Polygon…', up:true },
    { label:'Unique Methods', val: new Set(allData.map(t=>t.method)).size, delta:'Smart contract types', up:true },
  ];
  document.getElementById('kpi-grid').innerHTML = kpis.map(k =>
    `<div class="kpi-card"><div class="kpi-label">${k.label}</div><div class="kpi-val">${k.val}</div><div class="kpi-delta ${k.up?'up':'dn'}">${k.delta}</div></div>`
  ).join('');
}

// ── DASHBOARD CHARTS ──────────────────────────────
function buildDashboardCharts() {
  const COLORS = ['#1D9E75','#534AB7','#BA7517','#D85A30','#3B8BD4','#639922','#D4537E'];

  // Network bar
  const netC = {};
  allData.forEach(t => { netC[t.network] = (netC[t.network]||0)+1; });
  const nets = Object.keys(netC).sort((a,b) => netC[b]-netC[a]);
  new Chart(document.getElementById('chartNetwork'), {
    type:'bar',
    data:{ labels:nets, datasets:[{ label:'Txs', data:nets.map(n=>netC[n]), backgroundColor:COLORS, borderRadius:6 }] },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,grid:{color:'#f0f1f3'}}, x:{grid:{display:false}} }, responsive:true }
  });

  // Status donut
  const stC = {};
  allData.forEach(t => { stC[t.status] = (stC[t.status]||0)+1; });
  new Chart(document.getElementById('chartStatus'), {
    type:'doughnut',
    data:{ labels:Object.keys(stC), datasets:[{ data:Object.values(stC), backgroundColor:['#1D9E75','#BA7517','#D85A30'], borderWidth:0 }] },
    options:{ plugins:{legend:{position:'bottom'}}, cutout:'65%', responsive:true }
  });

  // Tokens horizontal bar
  const tokC = {};
  allData.forEach(t => { tokC[t.token] = (tokC[t.token]||0)+1; });
  const toks = Object.keys(tokC).sort((a,b)=>tokC[b]-tokC[a]).slice(0,8);
  new Chart(document.getElementById('chartTokens'), {
    type:'bar',
    data:{ labels:toks, datasets:[{ label:'Count', data:toks.map(t=>tokC[t]), backgroundColor:'#534AB7', borderRadius:4 }] },
    options:{ indexAxis:'y', plugins:{legend:{display:false}}, scales:{ x:{beginAtZero:true,grid:{color:'#f0f1f3'}}, y:{grid:{display:false}} }, responsive:true }
  });

  // Gas line
  const sortedG = allData.map(t=>t.gasFeeETH).sort((a,b)=>a-b);
  const step = Math.floor(sortedG.length/30);
  const gPts = sortedG.filter((_,i)=>i%step===0).slice(0,30);
  new Chart(document.getElementById('chartGas'), {
    type:'line',
    data:{ labels:gPts.map((_,i)=>i+1), datasets:[{ label:'Gas (ETH)', data:gPts, borderColor:'#BA7517', backgroundColor:'rgba(186,117,23,.08)', fill:true, tension:.3, pointRadius:2 }] },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,grid:{color:'#f0f1f3'}}, x:{grid:{display:false},ticks:{maxTicksLimit:6}} }, responsive:true }
  });
}

// ── STATS ─────────────────────────────────────────
function buildStats() {
  const vals   = allData.map(t=>t.valueUSD).sort((a,b)=>a-b);
  const median = vals[Math.floor(vals.length/2)];
  const failed = allData.filter(t=>t.status==='failed').length;
  const stats  = [
    { label:'Total Records',      val:'1,050',           note:'Full dataset' },
    { label:'Total Volume (USD)', val:'$'+Math.round(allData.reduce((s,t)=>s+t.valueUSD,0)/1e6)+'M+', note:'All networks' },
    { label:'Median Tx Value',    val:'$'+Math.round(median).toLocaleString(), note:'USD' },
    { label:'Avg Tx Value',       val:'$'+Math.round(vals.reduce((a,b)=>a+b,0)/vals.length).toLocaleString(), note:'USD' },
    { label:'Total Gas Fees',     val:allData.reduce((s,t)=>s+t.gasFeeETH,0).toFixed(2)+' ETH', note:'All records' },
    { label:'Failure Rate',       val:((failed/allData.length)*100).toFixed(1)+'%', note:failed+' failed txs' },
    { label:'Unique Tokens',      val:new Set(allData.map(t=>t.token)).size, note:'Distinct assets' },
    { label:'Unique Methods',     val:new Set(allData.map(t=>t.method)).size, note:'Smart contract calls' },
  ];
  document.getElementById('stats-grid').innerHTML = stats.map(s =>
    `<div class="stat-card"><div class="stat-label">${s.label}</div><div class="stat-val">${s.val}</div><div class="stat-note">${s.note}</div></div>`
  ).join('');
}

// ── ANALYTICS CHARTS ──────────────────────────────
function buildAnalyticsCharts() {
  // Scatter
  const sample = allData.filter((_,i)=>i%5===0);
  new Chart(document.getElementById('chartScatter'), {
    type:'scatter',
    data:{ datasets:[{ label:'Gas vs Value', data:sample.map(t=>({x:+t.gasPrice.toFixed(2),y:+t.valueUSD.toFixed(2)})), backgroundColor:'rgba(29,158,117,.4)', pointRadius:4 }] },
    options:{ scales:{ x:{title:{display:true,text:'Gas price (Gwei)'},grid:{color:'#f0f1f3'}}, y:{title:{display:true,text:'Value (USD)'},grid:{color:'#f0f1f3'}} }, plugins:{legend:{display:false}}, responsive:true }
  });

  // Methods pie
  const mC = {};
  allData.forEach(t => { mC[t.method] = (mC[t.method]||0)+1; });
  const ms = Object.keys(mC).sort((a,b)=>mC[b]-mC[a]);
  const PIE = ['#1D9E75','#534AB7','#BA7517','#D85A30','#3B8BD4','#639922','#D4537E','#5DCAA5','#AFA9EC','#F0997B'];
  new Chart(document.getElementById('chartMethods'), {
    type:'pie',
    data:{ labels:ms, datasets:[{ data:ms.map(m=>mC[m]), backgroundColor:PIE, borderWidth:1 }] },
    options:{ plugins:{legend:{position:'right',labels:{boxWidth:12,font:{size:11}}}}, responsive:true }
  });

  // Monthly
  const mon = {};
  allData.forEach(t => { const m=t.timestamp.slice(0,7); mon[m]=(mon[m]||0)+1; });
  const months = Object.keys(mon).sort();
  new Chart(document.getElementById('chartMonthly'), {
    type:'line',
    data:{ labels:months.map(m=>{const d=new Date(m+'-01');return d.toLocaleString('default',{month:'short',year:'2-digit'});}),
      datasets:[{ label:'Transactions', data:months.map(m=>mon[m]), borderColor:'#1D9E75', backgroundColor:'rgba(29,158,117,.07)', fill:true, tension:.3, pointRadius:3 }] },
    options:{ plugins:{legend:{display:false}}, scales:{ y:{beginAtZero:true,grid:{color:'#f0f1f3'}}, x:{grid:{display:false}} }, responsive:true }
  });
}

// ── QUERY PRESETS ─────────────────────────────────
const PRESETS = {
  top10:          { desc:'Top 10 highest-value transactions (USD)',          fn: d => [...d].sort((a,b)=>b.valueUSD-a.valueUSD).slice(0,10) },
  failed:         { desc:'All failed transactions',                          fn: d => d.filter(t=>t.status==='failed') },
  highgas:        { desc:'Transactions with gas fee > 0.01 ETH',            fn: d => d.filter(t=>t.gasFeeETH>0.01) },
  eth_transfers:  { desc:'ETH token transfers only',                         fn: d => d.filter(t=>t.token==='ETH') },
  polygon_pending:{ desc:'Pending transactions on Polygon',                  fn: d => d.filter(t=>t.network==='Polygon'&&t.status==='pending') },
  swaps:          { desc:'All swap method transactions',                     fn: d => d.filter(t=>t.method==='swap') },
  big_usd:        { desc:'Transactions with value > $10,000 USD',           fn: d => d.filter(t=>t.valueUSD>10000) },
  low_confirm:    { desc:'Confirmed txs with fewer than 100 confirmations',  fn: d => d.filter(t=>t.status==='confirmed'&&t.confirmations<100) },
};

function loadPreset(key, btn) {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  const def = PRESETS[key];
  queryResults = def.fn(allData);
  document.getElementById('query-description').textContent = def.desc;
  renderQueryResults();
}

function runCustomFilter() {
  const field = document.getElementById('cf-field').value;
  const op    = document.getElementById('cf-op').value;
  const val   = document.getElementById('cf-val').value.trim().toLowerCase();
  if (!val) { alert('Please enter a filter value.'); return; }
  queryResults = allData.filter(t => {
    const cell = String(t[field]).toLowerCase();
    return op === 'eq' ? cell === val : cell !== val;
  });
  document.getElementById('query-description').textContent = `Custom: ${field} ${op==='eq'?'=':'≠'} "${val}"`;
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  renderQueryResults();
}

function renderQueryResults() {
  document.getElementById('query-result-count').textContent = queryResults.length + ' results';
  document.getElementById('btn-export').disabled = !queryResults.length;
  document.getElementById('btn-export-json').disabled = !queryResults.length;
  document.getElementById('query-body').innerHTML = queryResults.length
    ? queryResults.map((tx,i) => `<tr>
        <td>${i+1}</td>
        <td class="hash-cell">${tx.hash.slice(0,12)}…</td>
        <td><span class="network-tag net-${tx.network}">${tx.network}</span></td>
        <td><strong>${tx.token}</strong></td>
        <td>${tx.value.toFixed(4)}</td>
        <td>$${tx.valueUSD.toLocaleString(undefined,{maximumFractionDigits:2})}</td>
        <td>${tx.method}</td>
        <td><span class="status-badge s-${tx.status}">${tx.status}</span></td>
      </tr>`).join('')
    : '<tr><td colspan="8" class="empty-msg">No results found.</td></tr>';
}

// ── EXPORT ────────────────────────────────────────
function exportCSV() {
  if (!queryResults.length) return;
  const keys = ['id','hash','timestamp','network','token','value','valueUSD','gasPrice','gasUsed','gasFeeETH','method','status','blockNumber','confirmations','from','to'];
  const csv  = [keys.join(','), ...queryResults.map(t => keys.map(k => JSON.stringify(t[k]??'')).join(','))].join('\n');
  dl('blockchain_results.csv', csv, 'text/csv');
}

function exportJSON() {
  if (!queryResults.length) return;
  dl('blockchain_results.json', JSON.stringify(queryResults, null, 2), 'application/json');
}

function dl(name, content, type) {
  const a  = document.createElement('a');
  a.href   = URL.createObjectURL(new Blob([content], {type}));
  a.download = name;
  a.click();
}