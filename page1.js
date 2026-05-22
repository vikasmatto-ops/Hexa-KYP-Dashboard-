// ============================================================
// HEXA DASHBOARD — PAGE 1: HOSPITAL NETWORK
// ============================================================

const PAGE1 = (() => {

  // Current filter state
  const filters = {
    city: '', insurer: '', tpa: '', category: '', procedure: '',
    search: '', pincode: '',
  };

  let pincodeData = {}; // loaded from pincodes.js
  let currentPage = 1;
  const PAGE_SIZE = 20;

  // ── Bootstrap ─────────────────────────────────────────────
  function init() {
    renderFilters();
    renderTable();
    renderRecommendations();
    bindEvents();
    onDataRefresh(() => {
      renderFilters();
      renderTable();
      renderRecommendations();
      updateLastRefreshed();
    });
  }

  // ── Render filter dropdowns ────────────────────────────────
  function renderFilters() {
    populateSelect('p1-city',      ['', ...getCities()],    filters.city,      cityLabel);
    populateSelect('p1-insurer',   ['', ...getInsurers()],  filters.insurer,   v => v || 'All Insurers');
    populateSelect('p1-tpa',       ['', ...getTPAs()],      filters.tpa,       v => v || 'All TPAs');
    populateSelect('p1-category',  ['', ...CONFIG.ACTIVE_CATEGORIES], filters.category, v => v || 'All Categories');
    const procs = getProceduresForCategory(filters.category);
    populateSelect('p1-procedure', ['', ...procs], filters.procedure, v => v || 'All Procedures');
  }

  function cityLabel(v) {
    if (!v) return 'All Cities';
    return CONFIG.CITY_DISPLAY[v] || v.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }

  function populateSelect(id, values, current, labelFn) {
    const el = document.getElementById(id);
    if (!el) return;
    const prev = el.value;
    el.innerHTML = values.map(v =>
      `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(labelFn(v))}</option>`
    ).join('');
    if (values.includes(prev)) el.value = prev;
  }

  // ── Filter logic ───────────────────────────────────────────
  function getFilteredHospitals() {
    let list = DATA.hospitals;

    if (filters.city)
      list = list.filter(h => h.city === filters.city);

    if (filters.insurer)
      list = list.filter(h => h.insurer[filters.insurer] === true);

    if (filters.tpa)
      list = list.filter(h => h.tpa[filters.tpa] === true);

    if (filters.search) {
      const q = filters.search.toLowerCase();
      list = list.filter(h =>
        h.hospitalName.toLowerCase().includes(q) ||
        h.area.toLowerCase().includes(q)
      );
    }

    if (filters.pincode) {
      list = sortByDistance(list, filters.pincode);
    }

    return list;
  }

  // ── Haversine distance ─────────────────────────────────────
  function haversine(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 +
      Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * Math.sin(dLon/2)**2;
    return R * 2 * Math.asin(Math.sqrt(a));
  }

  function sortByDistance(hospitals, pincode) {
    const origin = (window.PINCODES || {})[pincode];
    if (!origin) return hospitals;
    return hospitals.map(h => {
      const dest = (window.PINCODES || {})[h.pinCode];
      const dist = dest ? haversine(origin.lat, origin.lng, dest.lat, dest.lng) : 9999;
      return { ...h, _dist: dist };
    }).sort((a, b) => a._dist - b._dist);
  }

  // ── Render hospital table ──────────────────────────────────
  function renderTable() {
    const tbody = document.getElementById('p1-tbody');
    if (!tbody) return;

    const list = getFilteredHospitals();
    const total = list.length;
    const start = (currentPage - 1) * PAGE_SIZE;
    const page  = list.slice(start, start + PAGE_SIZE);

    document.getElementById('p1-count').textContent =
      `${total} hospital${total !== 1 ? 's' : ''} found`;

    if (page.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-row">No hospitals match the current filters.</td></tr>`;
      renderPagination(0, 0);
      return;
    }

    tbody.innerHTML = page.map(h => {
      const flags = Object.keys(h.empanelmentFlags || {});
      const flagHtml = flags.length
        ? `<span class="flag-badge" title="Cases found in ASP data for: ${esc(flags.join(', '))}">⚑ ${flags.length}</span>`
        : '';

      const tierHtml = h.tier
        ? `<span class="tier-badge tier-${h.tier.toLowerCase()}">${h.tier}</span>`
        : '';

      const statusClass = h.activeStatus === 'Active' ? 'status-active' : 'status-inactive';

      const coverage = buildCoverage(h);

      const distHtml = h._dist && h._dist < 9999
        ? `<span class="dist-tag">${h._dist.toFixed(1)} km</span>` : '';

      return `<tr class="hospital-row" data-hospital="${esc(h.hospitalName)}">
        <td>
          <div class="hosp-name">${esc(h.hospitalName)} ${tierHtml} ${flagHtml}</div>
          <div class="hosp-area">${esc(h.area)}</div>
          ${distHtml}
        </td>
        <td>${cityLabel(h.city)}</td>
        <td>${esc(h.pinCode)}</td>
        <td><span class="${statusClass}">${esc(h.activeStatus)}</span></td>
        <td>${esc(h.mopStatus)}</td>
        <td class="coverage-cell">${coverage}</td>
        <td class="comment-cell">${esc(h.insComments)}</td>
        <td class="comment-cell">${esc(h.cityComments)}</td>
        <td class="comment-cell">${esc(h.doctorComments)}</td>
      </tr>`;
    }).join('');

    renderPagination(total, currentPage);
  }

  function buildCoverage(h) {
    // Show empanelled insurers as small tags
    const ins = Object.entries(h.insurer)
      .filter(([,v]) => v)
      .map(([k]) => `<span class="cov-tag ins-tag" title="${esc(k)}">${esc(shortName(k))}</span>`)
      .join('');
    const tpa = Object.entries(h.tpa)
      .filter(([,v]) => v)
      .map(([k]) => `<span class="cov-tag tpa-tag" title="${esc(k)}">${esc(shortName(k))}</span>`)
      .join('');
    return ins + tpa || '<span class="no-coverage">None</span>';
  }

  function shortName(name) {
    // Shorten long insurer/TPA names to ~12 chars
    const cleaned = name
      .replace('Insurance', 'Ins.')
      .replace('Health', 'Hlth')
      .replace('General', 'Gen.')
      .replace('Private Limited', '')
      .replace('Co. Ltd.', '')
      .replace('Limited', '')
      .trim();
    return cleaned.length > 14 ? cleaned.slice(0, 13) + '…' : cleaned;
  }

  // ── Pagination ─────────────────────────────────────────────
  function renderPagination(total, page) {
    const el = document.getElementById('p1-pagination');
    if (!el) return;
    const pages = Math.ceil(total / PAGE_SIZE);
    if (pages <= 1) { el.innerHTML = ''; return; }

    let html = '';
    if (page > 1) html += `<button class="pg-btn" data-page="${page-1}">‹</button>`;
    for (let i = Math.max(1, page-2); i <= Math.min(pages, page+2); i++) {
      html += `<button class="pg-btn ${i===page?'pg-active':''}" data-page="${i}">${i}</button>`;
    }
    if (page < pages) html += `<button class="pg-btn" data-page="${page+1}">›</button>`;
    el.innerHTML = html;
  }

  // ── Recommendation engine ──────────────────────────────────
  function renderRecommendations() {
    const el = document.getElementById('p1-recs');
    if (!el) return;

    const hasFilter = filters.city || filters.insurer || filters.tpa ||
                      filters.category || filters.procedure;

    if (!hasFilter) {
      el.innerHTML = `<div class="rec-hint">Select filters above to see top recommended hospitals.</div>`;
      return;
    }

    const recs = getRecommendations({
      city: filters.city,
      insurer: filters.insurer,
      tpa: filters.tpa,
      category: filters.category,
      procedure: filters.procedure,
      topN: 5,
    });

    if (recs.length === 0) {
      el.innerHTML = `<div class="rec-hint">No historical cases found for this combination.</div>`;
      return;
    }

    const filterDesc = [
      filters.city      ? cityLabel(filters.city) : '',
      filters.insurer   || '',
      filters.tpa       || '',
      filters.category  || '',
      filters.procedure || '',
    ].filter(Boolean).join(' · ');

    el.innerHTML = `
      <div class="rec-header">
        <span class="rec-title">Top Recommended Hospitals</span>
        <span class="rec-desc">${esc(filterDesc)}</span>
      </div>
      <div class="rec-cards">
        ${recs.map((r, i) => `
          <div class="rec-card" data-hospital="${esc(r.hospitalName)}">
            <div class="rec-rank">#${i+1}</div>
            <div class="rec-info">
              <div class="rec-hosp">${esc(r.hospitalName)}</div>
              <div class="rec-meta">
                ${r.avgASP ? `<span class="rec-asp">Avg ASP ₹${Math.round(r.avgASP).toLocaleString('en-IN')}</span>` : ''}
                <span class="rec-cases">${r.caseCount} case${r.caseCount !== 1 ? 's' : ''}</span>
                ${r.lastCaseDate ? `<span class="rec-date">Last: ${r.lastCaseDate}</span>` : ''}
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;
  }

  // ── Bind all events ────────────────────────────────────────
  function bindEvents() {
    on('p1-city',      'change', e => { filters.city = e.target.value; currentPage = 1; renderTable(); renderRecommendations(); });
    on('p1-insurer',   'change', e => { filters.insurer = e.target.value; currentPage = 1; renderTable(); renderRecommendations(); });
    on('p1-tpa',       'change', e => { filters.tpa = e.target.value; currentPage = 1; renderTable(); renderRecommendations(); });
    on('p1-category',  'change', e => {
      filters.category = e.target.value;
      filters.procedure = '';
      currentPage = 1;
      renderFilters(); renderTable(); renderRecommendations();
    });
    on('p1-procedure', 'change', e => { filters.procedure = e.target.value; currentPage = 1; renderTable(); renderRecommendations(); });

    on('p1-search', 'input', e => {
      filters.search = e.target.value.trim();
      currentPage = 1;
      renderTable();
    });

    on('p1-pincode-btn', 'click', () => {
      filters.pincode = document.getElementById('p1-pincode').value.trim();
      currentPage = 1;
      renderTable();
    });

    on('p1-pincode', 'keydown', e => {
      if (e.key === 'Enter') {
        filters.pincode = e.target.value.trim();
        currentPage = 1;
        renderTable();
      }
    });

    on('p1-clear', 'click', () => {
      Object.keys(filters).forEach(k => filters[k] = '');
      currentPage = 1;
      document.getElementById('p1-search').value = '';
      document.getElementById('p1-pincode').value = '';
      renderFilters();
      renderTable();
      renderRecommendations();
    });

    // Pagination click
    document.getElementById('p1-pagination')?.addEventListener('click', e => {
      const btn = e.target.closest('.pg-btn');
      if (!btn) return;
      currentPage = parseInt(btn.dataset.page);
      renderTable();
      document.getElementById('p1-table-wrap')?.scrollIntoView({ behavior: 'smooth' });
    });

    // Row click — highlight hospital
    document.getElementById('p1-tbody')?.addEventListener('click', e => {
      const row = e.target.closest('.hospital-row');
      if (!row) return;
      document.querySelectorAll('.hospital-row.selected').forEach(r => r.classList.remove('selected'));
      row.classList.add('selected');
    });

    // Rec card click — scroll to hospital in table
    document.getElementById('p1-recs')?.addEventListener('click', e => {
      const card = e.target.closest('.rec-card');
      if (!card) return;
      const name = card.dataset.hospital;
      const row = document.querySelector(`.hospital-row[data-hospital="${CSS.escape(name)}"]`);
      if (row) {
        row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        row.classList.add('selected');
        setTimeout(() => row.classList.remove('selected'), 2000);
      }
    });
  }

  // ── Utility ────────────────────────────────────────────────
  function on(id, event, fn) {
    document.getElementById(id)?.addEventListener(event, fn);
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function updateLastRefreshed() {
    const el = document.getElementById('last-refreshed');
    if (el && DATA.lastUpdated) {
      el.textContent = 'Last updated: ' + DATA.lastUpdated.toLocaleTimeString('en-IN');
    }
  }

  return { init };
})();
