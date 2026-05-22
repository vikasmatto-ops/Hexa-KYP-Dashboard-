// ============================================================
// HEXA DASHBOARD — PAGE 2: ASP ANALYTICS
// ============================================================

const PAGE2 = (() => {

  const filters = {
    year: '', month: '', city: '', category: '',
    insurer: '', tpa: '', hospital: '',
  };

  let charts = {};

  // ── Bootstrap ─────────────────────────────────────────────
  function init() {
    renderFilters();
    renderAll();
    bindEvents();
    onDataRefresh(() => {
      renderFilters();
      renderAll();
    });
  }

  // ── Get filtered ASP cases ─────────────────────────────────
  function getFiltered() {
    let cases = DATA.aspCases;
    if (filters.year)     cases = cases.filter(c => c.doa && c.doa.includes(filters.year));
    if (filters.month)    cases = cases.filter(c => c.doa && getMonth(c.doa) === filters.month);
    if (filters.city)     cases = cases.filter(c => c.city === filters.city);
    if (filters.category) cases = cases.filter(c => c.category.toLowerCase() === filters.category.toLowerCase());
    if (filters.insurer)  cases = cases.filter(c => c.insuranceName.toLowerCase() === filters.insurer.toLowerCase());
    if (filters.tpa)      cases = cases.filter(c => c.tpaName.toLowerCase() === filters.tpa.toLowerCase());
    if (filters.hospital) cases = cases.filter(c => c.hospitalName === filters.hospital);
    return cases;
  }

  function getMonth(doa) {
    const d = new Date(doa);
    return isNaN(d) ? '' : String(d.getMonth() + 1).padStart(2, '0');
  }

  // ── Render all sections ────────────────────────────────────
  function renderAll() {
    const cases = getFiltered();
    renderMetrics(cases);
    renderTiers(cases);
    renderTrendChart(cases);
    renderCityChart(cases);
    renderInsurerChart(cases);
    renderVolumeChart(cases);
    populateComparators();
  }

  // ── Metrics row ────────────────────────────────────────────
  function renderMetrics(cases) {
    const valid = cases.filter(c => c.approvalAmount !== null);
    const avgASP = valid.length ? avg(valid.map(c => c.approvalAmount)) : null;
    const avgBill = cases.filter(c => c.billAmount).length
      ? avg(cases.filter(c => c.billAmount).map(c => c.billAmount)) : null;
    const avgSettle = cases.filter(c => c.settlementAmount).length
      ? avg(cases.filter(c => c.settlementAmount).map(c => c.settlementAmount)) : null;
    const hospCount = new Set(cases.map(c => c.hospitalName)).size;

    setText('m-cases',  cases.length.toLocaleString('en-IN'));
    setText('m-asp',    avgASP    ? '₹' + fmtNum(avgASP)    : '—');
    setText('m-bill',   avgBill   ? '₹' + fmtNum(avgBill)   : '—');
    setText('m-settle', avgSettle ? '₹' + fmtNum(avgSettle) : '—');
    setText('m-hosps',  hospCount.toLocaleString('en-IN'));
  }

  // ── Tier cards ─────────────────────────────────────────────
  function renderTiers(cases) {
    const el = document.getElementById('p2-tiers');
    if (!el) return;

    // Group cases by hospital
    const byHosp = groupBy(cases, c => c.hospitalName);
    const cityAvg = computeCityAvg(cases);

    const scored = Object.entries(byHosp).map(([name, hc]) => {
      const valid = hc.filter(c => c.approvalAmount !== null);
      if (!valid.length) return null;
      const aspVal = avg(valid.map(c => c.approvalAmount));
      const city   = hc[0].city;
      const mean   = cityAvg[city] || aspVal;
      const aspScore = Math.min(100, (aspVal / mean) * 50 + 50);
      const vol    = hc.length;
      const maxVol = Math.max(...Object.values(byHosp).map(x => x.length));
      const volScore = maxVol > 0 ? (vol / maxVol) * 100 : 0;

      // Coverage: check against hospital network
      const hNet = DATA.hospitals.find(
        h => h.hospitalName.toLowerCase().trim() === name.toLowerCase().trim()
      );
      const maxCov = (DATA.insurerNames.length + DATA.tpaNames.length) || 1;
      const covCount = hNet
        ? Object.values(hNet.insurer).filter(Boolean).length +
          Object.values(hNet.tpa).filter(Boolean).length
        : 0;
      const covScore = (covCount / maxCov) * 100;

      const score = Math.round(
        aspScore * CONFIG.SCORE_WEIGHT_ASP +
        covScore * CONFIG.SCORE_WEIGHT_COVERAGE +
        volScore * CONFIG.SCORE_WEIGHT_VOLUME
      );

      let tier = null;
      if (vol >= CONFIG.TIER_MIN_CASES) {
        if (score >= CONFIG.TIER_GOLD)        tier = 'Gold';
        else if (score >= CONFIG.TIER_SILVER) tier = 'Silver';
        else if (score >= CONFIG.TIER_BRONZE) tier = 'Bronze';
      } else if (vol <= CONFIG.UNDERUTILIZED_MAX_CASES && aspScore >= CONFIG.UNDERUTILIZED_MIN_ASP_SCORE) {
        tier = 'Underutilized';
      }

      return { name, aspVal, vol, score, tier, city };
    }).filter(Boolean);

    // Separate by tier
    const tiers = ['Gold', 'Silver', 'Bronze', 'Underutilized'];
    const grouped = {};
    tiers.forEach(t => grouped[t] = scored.filter(h => h.tier === t)
      .sort((a, b) => b.score - a.score));

    if (!scored.length) {
      el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:8px;">No data for current filters.</div>';
      return;
    }

    el.innerHTML = tiers.map(tier => {
      const hosps = grouped[tier];
      if (!hosps.length) return '';
      return `
        <div style="margin-bottom:16px;">
          <div style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;
            letter-spacing:.4px;margin-bottom:8px;">${tier} — ${hosps.length} hospital${hosps.length>1?'s':''}</div>
          <div class="tier-grid">
            ${hosps.slice(0, 12).map(h => `
              <div class="tier-card">
                <div class="tier-card-header">
                  <span class="tier-badge tier-${tier.toLowerCase()}">${tier}</span>
                  <span class="tier-card-name">${esc(h.name)}</span>
                </div>
                <div class="tier-card-meta">
                  <span class="tier-card-asp">₹${fmtNum(h.aspVal)} ASP</span>
                  <span class="tier-card-vol">${h.vol} cases</span>
                  <span class="tier-card-score">Score: ${h.score}</span>
                </div>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');
  }

  // ── ASP Trend chart ────────────────────────────────────────
  function renderTrendChart(cases) {
    const monthly = {};
    cases.forEach(c => {
      if (!c.doa || c.approvalAmount === null) return;
      const d = new Date(c.doa);
      if (isNaN(d)) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!monthly[key]) monthly[key] = [];
      monthly[key].push(c.approvalAmount);
    });

    const sorted = Object.entries(monthly).sort(([a],[b]) => a.localeCompare(b));
    const labels = sorted.map(([k]) => {
      const [y, m] = k.split('-');
      return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1] + ' ' + y.slice(2);
    });
    const data   = sorted.map(([,v]) => Math.round(avg(v)));
    const counts = sorted.map(([,v]) => v.length);

    destroyChart('trend');
    const ctx = document.getElementById('chart-trend');
    if (!ctx) return;

    charts.trend = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Avg ASP (₹)',
          data,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37,99,235,.08)',
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.3,
          fill: true,
        }]
      },
      options: chartOpts('₹', counts),
    });
  }

  // ── City-wise ASP chart ────────────────────────────────────
  function renderCityChart(cases) {
    const byCity = groupBy(cases.filter(c => c.approvalAmount !== null), c => c.city);
    const entries = Object.entries(byCity)
      .map(([city, hc]) => ({ city: cityLabel(city), val: Math.round(avg(hc.map(c => c.approvalAmount))) }))
      .sort((a,b) => b.val - a.val);

    destroyChart('city');
    const ctx = document.getElementById('chart-city');
    if (!ctx) return;

    charts.city = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: entries.map(e => e.city),
        datasets: [{ label: 'Avg ASP (₹)', data: entries.map(e => e.val),
          backgroundColor: '#3b82f6', borderRadius: 4 }]
      },
      options: barOpts('₹'),
    });
  }

  // ── Insurer-wise ASP chart ─────────────────────────────────
  function renderInsurerChart(cases) {
    const byIns = groupBy(cases.filter(c => c.approvalAmount !== null), c => c.insuranceName);
    const entries = Object.entries(byIns)
      .filter(([,v]) => v.length >= 5)
      .map(([ins, hc]) => ({ ins: shortInsurer(ins), val: Math.round(avg(hc.map(c => c.approvalAmount))) }))
      .sort((a,b) => b.val - a.val)
      .slice(0, 15);

    destroyChart('insurer');
    const ctx = document.getElementById('chart-insurer');
    if (!ctx) return;

    charts.insurer = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: entries.map(e => e.ins),
        datasets: [{ label: 'Avg ASP (₹)', data: entries.map(e => e.val),
          backgroundColor: '#10b981', borderRadius: 4 }]
      },
      options: { ...barOpts('₹'), indexAxis: 'y' },
    });
  }

  // ── Top hospitals volume + ASP chart ──────────────────────
  function renderVolumeChart(cases) {
    const byHosp = groupBy(cases.filter(c => c.approvalAmount !== null), c => c.hospitalName);
    const entries = Object.entries(byHosp)
      .map(([name, hc]) => ({
        name: shortHospital(name),
        vol: hc.length,
        asp: Math.round(avg(hc.map(c => c.approvalAmount)))
      }))
      .filter(e => e.vol >= 10)
      .sort((a,b) => b.vol - a.vol)
      .slice(0, 12);

    destroyChart('volume');
    const ctx = document.getElementById('chart-volume');
    if (!ctx) return;

    charts.volume = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: entries.map(e => e.name),
        datasets: [
          { label: 'Cases', data: entries.map(e => e.vol),
            backgroundColor: '#8b5cf6', borderRadius: 4, yAxisID: 'y' },
          { label: 'Avg ASP (₹)', data: entries.map(e => e.asp),
            type: 'line', borderColor: '#f59e0b', borderWidth: 2,
            pointRadius: 3, tension: 0.3, yAxisID: 'y1' },
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top', labels: { font: { size: 11 } } },
          tooltip: { callbacks: { label: ctx => {
            const v = ctx.raw;
            return ctx.dataset.label + ': ' + (ctx.datasetIndex === 1 ? '₹' + fmtNum(v) : v);
          }}}},
        scales: {
          x: { ticks: { font: { size: 10 }, maxRotation: 35 }, grid: { display: false } },
          y:  { position: 'left',  ticks: { font: { size: 10 } }, grid: { color: '#f0f0f0' } },
          y1: { position: 'right', ticks: { font: { size: 10 }, callback: v => '₹'+fmtNum(v) },
            grid: { display: false } },
        }
      }
    });
  }

  // ── Hospital comparator ────────────────────────────────────
  function populateComparators() {
    const hosps = [...new Set(DATA.aspCases.map(c => c.hospitalName))].sort();
    ['comp-a', 'comp-b'].forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const cur = el.value;
      el.innerHTML = '<option value="">Select hospital…</option>' +
        hosps.map(h => `<option value="${esc(h)}" ${h===cur?'selected':''}>${esc(h)}</option>`).join('');
    });
  }

  function runComparison() {
    const a = document.getElementById('comp-a')?.value;
    const b = document.getElementById('comp-b')?.value;
    const el = document.getElementById('comp-result');
    if (!el) return;

    if (!a || !b || a === b) {
      el.innerHTML = '<div style="color:var(--muted);font-size:13px;">Select two different hospitals to compare.</div>';
      return;
    }

    const result = compareHospitals(a, b, {
      category: filters.category,
      procedure: '',
    });

    const { a: ha, b: hb, recommended } = result;

    el.innerHTML = `
      <div class="compare-grid">
        <div class="compare-col">
          <div class="compare-label">Hospital A</div>
          <div class="compare-hosp-name">${esc(ha.hospitalName)}</div>
          ${compareStats(ha)}
        </div>
        <div class="compare-vs">VS</div>
        <div class="compare-col">
          <div class="compare-label">Hospital B</div>
          <div class="compare-hosp-name">${esc(hb.hospitalName)}</div>
          ${compareStats(hb)}
        </div>
      </div>
      <div class="compare-winner">
        ★ Recommended: ${esc(recommended)}
        ${ha.avgASP && hb.avgASP ? ` — Higher ASP (₹${fmtNum(Math.max(ha.avgASP, hb.avgASP))} vs ₹${fmtNum(Math.min(ha.avgASP, hb.avgASP))})` : ''}
      </div>`;
  }

  function compareStats(h) {
    return `
      <div class="compare-stat"><span class="compare-stat-label">Total cases</span>
        <span class="compare-stat-value">${h.totalCases}</span></div>
      <div class="compare-stat"><span class="compare-stat-label">Avg ASP</span>
        <span class="compare-stat-value">${h.avgASP ? '₹'+fmtNum(h.avgASP) : '—'}</span></div>
      <div class="compare-stat"><span class="compare-stat-label">Business score</span>
        <span class="compare-stat-value">${h.businessScore ? '₹'+fmtNum(h.businessScore) : '—'}</span></div>
      <div class="compare-stat"><span class="compare-stat-label">Last case</span>
        <span class="compare-stat-value">${h.lastCaseDate || '—'}</span></div>
      <div class="compare-stat"><span class="compare-stat-label">Top procedures</span>
        <span class="compare-stat-value" style="font-size:12px;text-align:right;max-width:180px;">
          ${h.topProcedures.map(p => `${esc(p.procedure)} (${p.count})`).join('<br>')}
        </span></div>`;
  }

  // ── Render filters ─────────────────────────────────────────
  function renderFilters() {
    const years = [...new Set(DATA.aspCases.map(c => c.doa && new Date(c.doa).getFullYear()).filter(Boolean))].sort();
    const months = [
      {v:'01',l:'January'},{v:'02',l:'February'},{v:'03',l:'March'},
      {v:'04',l:'April'},{v:'05',l:'May'},{v:'06',l:'June'},
      {v:'07',l:'July'},{v:'08',l:'August'},{v:'09',l:'September'},
      {v:'10',l:'October'},{v:'11',l:'November'},{v:'12',l:'December'},
    ];

    fillSelect('p2-year',     [['','All Years'],    ...years.map(y=>[y,y])],               filters.year);
    fillSelect('p2-month',    [['','All Months'],   ...months.map(m=>[m.v,m.l])],          filters.month);
    fillSelect('p2-city',     [['','All Cities'],   ...getCities().map(c=>[c,cityLabel(c)])], filters.city);
    fillSelect('p2-category', [['','All Categories'],...CONFIG.ACTIVE_CATEGORIES.map(c=>[c,c])], filters.category);
    fillSelect('p2-insurer',  [['','All Insurers'], ...getInsurers().map(i=>[i,i])],        filters.insurer);
    fillSelect('p2-tpa',      [['','All TPAs'],     ...getTPAs().map(t=>[t,t])],            filters.tpa);
    const hosps = [...new Set(DATA.aspCases.map(c => c.hospitalName))].sort();
    fillSelect('p2-hospital', [['','All Hospitals'],...hosps.map(h=>[h,h])],               filters.hospital);
  }

  function fillSelect(id, options, current) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = options.map(([v, l]) =>
      `<option value="${esc(String(v))}" ${String(v)===String(current)?'selected':''}>${esc(l)}</option>`
    ).join('');
  }

  // ── Bind events ────────────────────────────────────────────
  function bindEvents() {
    ['p2-year','p2-month','p2-city','p2-category','p2-insurer','p2-tpa','p2-hospital'].forEach(id => {
      const key = id.replace('p2-','');
      document.getElementById(id)?.addEventListener('change', e => {
        filters[key] = e.target.value;
        renderAll();
      });
    });

    document.getElementById('p2-clear')?.addEventListener('click', () => {
      Object.keys(filters).forEach(k => filters[k] = '');
      renderFilters();
      renderAll();
    });

    document.getElementById('comp-go')?.addEventListener('click', runComparison);
  }

  // ── Chart helpers ──────────────────────────────────────────
  function chartOpts(prefix, counts) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: {
          label: ctx => prefix + fmtNum(ctx.raw),
          afterLabel: ctx => counts ? `Cases: ${counts[ctx.dataIndex]}` : '',
        }}
      },
      scales: {
        x: { ticks: { font: { size: 10 }, maxRotation: 35 }, grid: { display: false } },
        y: { ticks: { font: { size: 10 }, callback: v => prefix + fmtNum(v) }, grid: { color: '#f0f0f0' } },
      }
    };
  }

  function barOpts(prefix) {
    return {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => prefix + fmtNum(ctx.raw) }}
      },
      scales: {
        x: { ticks: { font: { size: 10 }, maxRotation: 35 }, grid: { display: false } },
        y: { ticks: { font: { size: 10 }, callback: v => prefix + fmtNum(v) }, grid: { color: '#f0f0f0' } },
      }
    };
  }

  function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
  }

  // ── Utility ────────────────────────────────────────────────
  function avg(arr) {
    return arr.length ? arr.reduce((s,v) => s+v, 0) / arr.length : 0;
  }

  function groupBy(arr, fn) {
    return arr.reduce((acc, item) => {
      const key = fn(item);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
  }

  function computeCityAvg(cases) {
    const byCity = groupBy(cases.filter(c => c.approvalAmount !== null), c => c.city);
    const result = {};
    Object.entries(byCity).forEach(([city, hc]) => {
      result[city] = avg(hc.map(c => c.approvalAmount));
    });
    return result;
  }

  function cityLabel(v) {
    if (!v) return 'All Cities';
    return CONFIG.CITY_DISPLAY[v] || v.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }

  function fmtNum(n) {
    if (n === null || n === undefined) return '—';
    if (n >= 100000) return (n/100000).toFixed(1) + 'L';
    if (n >= 1000)   return Math.round(n).toLocaleString('en-IN');
    return Math.round(n).toString();
  }

  function shortInsurer(name) {
    return name
      .replace('Health Insurance', 'Hlth Ins')
      .replace('General Insurance', 'Gen Ins')
      .replace('Co. Ltd.', '').replace('Company Ltd.', '')
      .replace('Insurance', 'Ins').trim()
      .slice(0, 22);
  }

  function shortHospital(name) {
    const parts = name.split(',');
    return parts[0].trim().slice(0, 28);
  }

  function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  }

  function esc(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init };
})();
