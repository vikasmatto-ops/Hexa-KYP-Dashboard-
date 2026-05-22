// ============================================================
// HEXA DASHBOARD — PAGE 1: HOSPITAL NETWORK
// Features: filters, recommendations, table, slide-out detail panel
// ============================================================

const PAGE1 = (() => {

  const filters = { city:'', insurer:'', tpa:'', category:'', procedure:'', search:'', pincode:'' };
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let selectedHospital = null;

  // ── Init ──────────────────────────────────────────────────
  function init() {
    renderFilters();
    renderTable();
    renderRecommendations();
    bindEvents();
    onDataRefresh(() => { renderFilters(); renderTable(); renderRecommendations(); updateTimestamp(); });
  }

  // ── Filters ───────────────────────────────────────────────
  function renderFilters() {
    fillSelect('p1-city',     [['','All Cities'],    ...getCities().map(c=>[c,cityLabel(c)])],          filters.city);
    fillSelect('p1-insurer',  [['','All Insurers'],  ...getInsurers().map(i=>[i,i])],                   filters.insurer);
    fillSelect('p1-tpa',      [['','All TPAs'],      ...getTPAs().map(t=>[t,t])],                       filters.tpa);
    fillSelect('p1-category', [['','All Categories'],...CONFIG.ACTIVE_CATEGORIES.map(c=>[c,c])],        filters.category);
    const procs = getProceduresForCategory(filters.category);
    fillSelect('p1-procedure',[['','All Procedures'],...procs.map(p=>[p,p])],                           filters.procedure);
  }

  function fillSelect(id, options, current) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = options.map(([v,l]) =>
      `<option value="${esc(v)}" ${v===current?'selected':''}>${esc(l)}</option>`
    ).join('');
  }

  // ── Filtered list ─────────────────────────────────────────
  function getFiltered() {
    let list = DATA.hospitals;
    if (filters.city)    list = list.filter(h => h.city === filters.city);
    if (filters.insurer) list = list.filter(h => h.insurer[filters.insurer] === true);
    if (filters.tpa)     list = list.filter(h => h.tpa[filters.tpa] === true);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(h => h.hospitalName.toLowerCase().includes(q) || h.area.toLowerCase().includes(q));
    }
    if (filters.pincode) list = sortByDistance(list, filters.pincode);
    return list;
  }

  function sortByDistance(hospitals, pin) {
    const origin = (window.PINCODES||{})[pin];
    if (!origin) { showPincodeError(); return hospitals; }
    return hospitals.map(h => {
      const dest = (window.PINCODES||{})[h.pinCode];
      const dist = dest ? haversine(origin.lat, origin.lng, dest.lat, dest.lng) : 9999;
      return {...h, _dist: dist};
    }).sort((a,b) => a._dist - b._dist);
  }

  function showPincodeError() {
    const el = document.getElementById('p1-pincode');
    if (el) { el.style.borderColor='#dc2626'; setTimeout(()=>el.style.borderColor='',2000); }
  }

  // ── Table ─────────────────────────────────────────────────
  function renderTable() {
    const tbody = document.getElementById('p1-tbody');
    if (!tbody) return;
    const list  = getFiltered();
    const total = list.length;
    const page  = list.slice((currentPage-1)*PAGE_SIZE, currentPage*PAGE_SIZE);

    document.getElementById('p1-count').textContent = `${total} hospital${total!==1?'s':''} found`;

    if (!page.length) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-row">No hospitals match the current filters.</td></tr>`;
      renderPagination(0,0); return;
    }

    tbody.innerHTML = page.map(h => {
      const flags = Object.keys(h.empanelmentFlags||{});
      const flagHtml = flags.length ? `<span class="flag-badge" title="Cases in ASP data for: ${esc(flags.slice(0,3).join(', '))}${flags.length>3?' +more':''}">⚑ ${flags.length}</span>` : '';
      const tierHtml = h.tier ? `<span class="tier-badge tier-${h.tier.toLowerCase()}">${h.tier}</span>` : '';
      const distHtml = h._dist && h._dist<9999 ? `<span class="dist-tag">📍 ${h._dist.toFixed(1)} km</span>` : '';
      const caseHtml = h.totalCases ? `<span style="font-size:11px;color:var(--text3);">${h.totalCases} cases</span>` : '';
      const aspHtml  = h.avgASP ? `<span style="font-size:11px;color:var(--green);font-weight:600;">₹${fmtNum(h.avgASP)}</span>` : '';

      return `<tr class="hospital-row" data-hospital="${esc(h.hospitalName)}" style="cursor:pointer;">
        <td>
          <div class="hosp-name">${esc(h.hospitalName)} ${tierHtml} ${flagHtml}</div>
          <div class="hosp-area">${esc(h.area)}</div>
          <div style="display:flex;gap:8px;margin-top:3px;">${distHtml}${caseHtml}${aspHtml}</div>
        </td>
        <td>${cityLabel(h.city)}</td>
        <td>${esc(h.pinCode)}</td>
        <td><span class="status-badge ${h.activeStatus==='Active'?'status-active':'status-inactive'}">${esc(h.activeStatus)}</span></td>
        <td>${esc(h.mopStatus)}</td>
        <td style="font-size:12px;color:var(--text3);max-width:160px;">${esc(h.insComments||'')}</td>
      </tr>`;
    }).join('');

    renderPagination(total, currentPage);
  }

  function renderPagination(total, page) {
    const el = document.getElementById('p1-pagination');
    if (!el) return;
    const pages = Math.ceil(total/PAGE_SIZE);
    if (pages<=1) { el.innerHTML=''; return; }
    let html = '';
    if (page>1) html += `<button class="pg-btn" data-page="${page-1}">‹</button>`;
    for (let i=Math.max(1,page-2); i<=Math.min(pages,page+2); i++) {
      html += `<button class="pg-btn ${i===page?'pg-active':''}" data-page="${i}">${i}</button>`;
    }
    if (page<pages) html += `<button class="pg-btn" data-page="${page+1}">›</button>`;
    el.innerHTML = html;
  }

  // ── Recommendations ───────────────────────────────────────
  function renderRecommendations() {
    const el = document.getElementById('p1-recs');
    if (!el) return;
    const hasFilter = filters.city||filters.insurer||filters.tpa||filters.category||filters.procedure;
    if (!hasFilter) {
      el.innerHTML = `<div class="rec-hint">Select city, insurer, TPA, category or procedure to see top recommended hospitals based on historical ASP data.</div>`;
      return;
    }

    const recs = getRecommendations({ city:filters.city, insurer:filters.insurer, tpa:filters.tpa, category:filters.category, procedure:filters.procedure, topN:5 });
    if (!recs.length) {
      el.innerHTML = `<div class="rec-hint">No historical cases found for this combination.</div>`;
      return;
    }

    const desc = [filters.city?cityLabel(filters.city):'', filters.insurer||'', filters.tpa||'', filters.category||'', filters.procedure||''].filter(Boolean).join(' · ');

    el.innerHTML = `
      <div class="rec-header">
        <span class="rec-title">⭐ Top Recommended Hospitals</span>
        <span class="rec-desc">${esc(desc)}</span>
      </div>
      <div class="rec-cards">
        ${recs.map((r,i) => `
          <div class="rec-card" data-hospital="${esc(r.hospitalName)}">
            <div class="rec-rank">#${i+1}</div>
            <div class="rec-info">
              <div class="rec-hosp">${esc(r.hospitalName)}</div>
              <div class="rec-meta">
                <span class="rec-asp">₹${fmtNum(r.avgASP)} ASP</span>
                <span class="rec-cases">${r.caseCount} cases</span>
                ${r.lastCaseDate ? `<span class="rec-date">Last: ${r.lastCaseDate.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>` : ''}
              </div>
            </div>
          </div>`).join('')}
      </div>`;
  }

  // ── Hospital detail slide panel ───────────────────────────
  function openDetailPanel(hospitalName) {
    const h = DATA.hospitals.find(x => x.hospitalName === hospitalName);
    if (!h) return;
    selectedHospital = hospitalName;

    // Get ASP stats for this hospital
    const hc = h.aspData || [];
    const valid = hc.filter(c => c.approvalAmount !== null);
    const avgASP = valid.length ? Math.round(valid.reduce((s,c)=>s+c.approvalAmount,0)/valid.length) : null;
    const avgBill = hc.filter(c=>c.billAmount).length ? Math.round(hc.filter(c=>c.billAmount).reduce((s,c)=>s+c.billAmount,0)/hc.filter(c=>c.billAmount).length) : null;
    const avgSettle = hc.filter(c=>c.settlementAmount).length ? Math.round(hc.filter(c=>c.settlementAmount).reduce((s,c)=>s+c.settlementAmount,0)/hc.filter(c=>c.settlementAmount).length) : null;
    const dates = hc.map(c=>c.dodParsed).filter(Boolean);
    const lastCase = dates.length ? new Date(Math.max(...dates.map(d=>d.getTime()))) : null;

    // Top insurers by case count
    const insCounts = {};
    hc.forEach(c => { if(c.insuranceName) insCounts[c.insuranceName]=(insCounts[c.insuranceName]||0)+1; });
    const topIns = Object.entries(insCounts).sort(([,a],[,b])=>b-a).slice(0,5);

    // Top procedures
    const procCounts = {};
    hc.forEach(c => { if(c.procedureGroup&&c.procedureGroup!=='Other') procCounts[c.procedureGroup]=(procCounts[c.procedureGroup]||0)+1; });
    const topProcs = Object.entries(procCounts).sort(([,a],[,b])=>b-a).slice(0,5);

    // Empanelled insurers
    const empInsurers = Object.entries(h.insurer).filter(([,v])=>v).map(([k])=>k);
    const empTPAs     = Object.entries(h.tpa).filter(([,v])=>v).map(([k])=>k);

    const panel = document.getElementById('detail-panel');
    const content = document.getElementById('detail-content');

    content.innerHTML = `
      <div style="padding:20px 20px 0;">
        <!-- Header -->
        <div style="margin-bottom:16px;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
            <div>
              <div style="font-size:16px;font-weight:700;color:var(--text);line-height:1.3;margin-bottom:4px;">${esc(h.hospitalName)}</div>
              <div style="font-size:12px;color:var(--text3);">${esc(h.area)}</div>
            </div>
            <span class="status-badge ${h.activeStatus==='Active'?'status-active':'status-inactive'}" style="white-space:nowrap;flex-shrink:0;">${esc(h.activeStatus)}</span>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
            ${h.tier?`<span class="tier-badge tier-${h.tier.toLowerCase()}">${h.tier}</span>`:''}
            <span style="font-size:11px;background:var(--bg);padding:2px 8px;border-radius:10px;color:var(--text2);">📍 PIN: ${esc(h.pinCode)}</span>
            <span style="font-size:11px;background:var(--bg);padding:2px 8px;border-radius:10px;color:var(--text2);">MOP: ${esc(h.mopStatus)}</span>
            <span style="font-size:11px;background:var(--bg);padding:2px 8px;border-radius:10px;color:var(--text2);">City: ${cityLabel(h.city)}</span>
          </div>
        </div>

        <!-- ASP Stats -->
        ${hc.length ? `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px;">
          <div style="background:var(--green-lt);border-radius:8px;padding:10px 12px;">
            <div style="font-size:10px;font-weight:600;color:var(--green);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Avg ASP</div>
            <div style="font-size:18px;font-weight:700;color:var(--green);">${avgASP?'₹'+fmtNum(avgASP):'—'}</div>
            <div style="font-size:10px;color:var(--green);opacity:.7;">Approval Amount</div>
          </div>
          <div style="background:var(--accent-lt);border-radius:8px;padding:10px 12px;">
            <div style="font-size:10px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Avg Bill</div>
            <div style="font-size:18px;font-weight:700;color:var(--accent);">${avgBill?'₹'+fmtNum(avgBill):'—'}</div>
            <div style="font-size:10px;color:var(--accent);opacity:.7;">Bill Amount</div>
          </div>
          <div style="background:var(--amber-lt);border-radius:8px;padding:10px 12px;">
            <div style="font-size:10px;font-weight:600;color:var(--amber);text-transform:uppercase;letter-spacing:.5px;margin-bottom:3px;">Avg Settlement</div>
            <div style="font-size:18px;font-weight:700;color:var(--amber);">${avgSettle?'₹'+fmtNum(avgSettle):'—'}</div>
            <div style="font-size:10px;color:var(--amber);opacity:.7;">Settlement Amount</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;margin-bottom:16px;font-size:13px;">
          <span style="color:var(--text2);">📊 <strong style="color:var(--text)">${hc.length}</strong> total cases</span>
          ${lastCase?`<span style="color:var(--text2);">📅 Last case: <strong style="color:var(--text)">${lastCase.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</strong></span>`:''}
        </div>` : `<div style="background:var(--bg);border-radius:8px;padding:12px;margin-bottom:16px;font-size:13px;color:var(--text3);">No historical cases found in ASP data.</div>`}

        <div style="border-top:1px solid var(--border);padding-top:14px;margin-bottom:14px;">

          <!-- Comments -->
          ${h.insComments||h.cityComments||h.doctorComments ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Comments</div>
            ${h.insComments?`<div style="background:#fef3c7;border-left:3px solid var(--amber);border-radius:0 6px 6px 0;padding:8px 10px;margin-bottom:6px;font-size:12px;color:#92400e;"><strong>Insurance:</strong> ${esc(h.insComments)}</div>`:''}
            ${h.cityComments?`<div style="background:#eff4ff;border-left:3px solid var(--accent);border-radius:0 6px 6px 0;padding:8px 10px;margin-bottom:6px;font-size:12px;color:#1e40af;"><strong>City team:</strong> ${esc(h.cityComments)}</div>`:''}
            ${h.doctorComments?`<div style="background:#f0fdf4;border-left:3px solid var(--green);border-radius:0 6px 6px 0;padding:8px 10px;margin-bottom:6px;font-size:12px;color:#14532d;"><strong>Doctors:</strong> ${esc(h.doctorComments)}</div>`:''}
          </div>` : ''}

          <!-- Empanelled Insurers -->
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Empanelled Insurers (${empInsurers.length})</div>
            ${empInsurers.length ? `<div style="display:flex;flex-wrap:wrap;gap:5px;">
              ${empInsurers.map(ins=>`<span style="font-size:11px;background:var(--accent-lt);color:var(--accent);padding:2px 8px;border-radius:10px;font-weight:500;">${esc(ins)}</span>`).join('')}
            </div>` : '<div style="font-size:12px;color:var(--text3);">None empanelled</div>'}
          </div>

          <!-- Empanelled TPAs -->
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Empanelled TPAs (${empTPAs.length})</div>
            ${empTPAs.length ? `<div style="display:flex;flex-wrap:wrap;gap:5px;">
              ${empTPAs.map(tpa=>`<span style="font-size:11px;background:var(--green-lt);color:var(--green);padding:2px 8px;border-radius:10px;font-weight:500;">${esc(tpa)}</span>`).join('')}
            </div>` : '<div style="font-size:12px;color:var(--text3);">None empanelled</div>'}
          </div>

          <!-- Top Insurers from ASP data -->
          ${topIns.length ? `
          <div style="margin-bottom:14px;">
            <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Top Insurers by Cases</div>
            ${topIns.map(([ins,cnt])=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">
                <span style="color:var(--text);flex:1;padding-right:8px;">${esc(ins)}</span>
                <span style="font-weight:600;color:var(--accent);font-family:var(--mono);">${cnt} cases</span>
              </div>`).join('')}
          </div>` : ''}

          <!-- Top Procedures -->
          ${topProcs.length ? `
          <div>
            <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">Top Procedures</div>
            ${topProcs.map(([proc,cnt])=>`
              <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">
                <span style="color:var(--text);flex:1;padding-right:8px;">${esc(proc)}</span>
                <span style="font-weight:600;color:var(--purple);font-family:var(--mono);">${cnt} cases</span>
              </div>`).join('')}
          </div>` : ''}

        </div>
      </div>`;

    // Show panel
    panel.classList.add('open');
    document.getElementById('detail-overlay').classList.add('open');
  }

  function closeDetailPanel() {
    document.getElementById('detail-panel').classList.remove('open');
    document.getElementById('detail-overlay').classList.remove('open');
    selectedHospital = null;
    document.querySelectorAll('.hospital-row.selected').forEach(r => r.classList.remove('selected'));
  }

  // ── Bind events ───────────────────────────────────────────
  function bindEvents() {
    on('p1-city',      'change', e => { filters.city=e.target.value;      currentPage=1; renderTable(); renderRecommendations(); });
    on('p1-insurer',   'change', e => { filters.insurer=e.target.value;   currentPage=1; renderTable(); renderRecommendations(); });
    on('p1-tpa',       'change', e => { filters.tpa=e.target.value;       currentPage=1; renderTable(); renderRecommendations(); });
    on('p1-category',  'change', e => { filters.category=e.target.value; filters.procedure=''; currentPage=1; renderFilters(); renderTable(); renderRecommendations(); });
    on('p1-procedure', 'change', e => { filters.procedure=e.target.value; currentPage=1; renderTable(); renderRecommendations(); });
    on('p1-search',    'input',  e => { filters.search=e.target.value.trim(); currentPage=1; renderTable(); });

    on('p1-pincode-btn','click', () => {
      filters.pincode = document.getElementById('p1-pincode').value.trim();
      currentPage=1; renderTable();
    });
    on('p1-pincode','keydown', e => {
      if (e.key==='Enter') { filters.pincode=e.target.value.trim(); currentPage=1; renderTable(); }
    });
    on('p1-clear','click', () => {
      Object.keys(filters).forEach(k=>filters[k]='');
      currentPage=1;
      document.getElementById('p1-search').value='';
      document.getElementById('p1-pincode').value='';
      renderFilters(); renderTable(); renderRecommendations();
    });

    // Pagination
    document.getElementById('p1-pagination')?.addEventListener('click', e => {
      const btn = e.target.closest('.pg-btn');
      if (!btn) return;
      currentPage = parseInt(btn.dataset.page);
      renderTable();
      document.getElementById('p1-table-wrap')?.scrollIntoView({behavior:'smooth'});
    });

    // Row click → open detail panel
    document.getElementById('p1-tbody')?.addEventListener('click', e => {
      const row = e.target.closest('.hospital-row');
      if (!row) return;
      document.querySelectorAll('.hospital-row.selected').forEach(r=>r.classList.remove('selected'));
      row.classList.add('selected');
      openDetailPanel(row.dataset.hospital);
    });

    // Rec card click → open detail
    document.getElementById('p1-recs')?.addEventListener('click', e => {
      const card = e.target.closest('.rec-card');
      if (!card) return;
      openDetailPanel(card.dataset.hospital);
    });

    // Close panel
    on('detail-close','click', closeDetailPanel);
    on('detail-overlay','click', closeDetailPanel);
  }

  // ── Utilities ─────────────────────────────────────────────
  function on(id, ev, fn) { document.getElementById(id)?.addEventListener(ev, fn); }

  function cityLabel(v) {
    if (!v) return 'All Cities';
    return CONFIG.CITY_DISPLAY[v] || v.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');
  }

  function fmtNum(n) {
    if (n===null||n===undefined) return '—';
    if (n>=100000) return (n/100000).toFixed(1)+'L';
    if (n>=1000)   return Math.round(n).toLocaleString('en-IN');
    return Math.round(n).toString();
  }

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function updateTimestamp() {
    const el = document.getElementById('last-refreshed');
    if (el && DATA.lastUpdated) el.textContent = 'Last sync: ' + DATA.lastUpdated.toLocaleTimeString('en-IN');
  }

  return { init };
})();
