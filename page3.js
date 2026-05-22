// ============================================================
// HEXA DASHBOARD — PAGE 3: COVERAGE MAP
// ============================================================

const PAGE3 = (() => {

  const filters = { city: '', insurer: '', tpa: '' };
  let map = null;
  let markers = [];
  let mapInited = false;

  // ── Bootstrap ──────────────────────────────────────────────
  function init() {
    renderFilters();
    bindEvents();
    onDataRefresh(() => {
      renderFilters();
      if (mapInited) {
        renderMarkers();
        renderGapAnalysis();
      }
    });
  }

  // ── Init Leaflet map (called on first tab visit) ───────────
  function initMap() {
    if (mapInited) return;
    if (typeof L === 'undefined') {
      setTimeout(initMap, 300);
      return;
    }

    map = L.map('map', { zoomControl: true }).setView([20.5937, 78.9629], 5);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(map);

    mapInited = true;
    renderMarkers();
    renderGapAnalysis();
  }

  // ── Render filters ─────────────────────────────────────────
  function renderFilters() {
    fillSelect('p3-city',    [['','All Cities'],   ...getCities().map(c => [c, cityLabel(c)])],    filters.city);
    fillSelect('p3-insurer', [['','All Insurers'], ...DATA.insurerNames.map(i => [i, i])],          filters.insurer);
    fillSelect('p3-tpa',     [['','All TPAs'],     ...DATA.tpaNames.map(t => [t, t])],              filters.tpa);
  }

  function fillSelect(id, options, current) {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = options.map(([v, l]) =>
      `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(l)}</option>`
    ).join('');
  }

  // ── Render map markers ─────────────────────────────────────
  function renderMarkers() {
    if (!map) return;

    // Clear existing markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    let hospitals = DATA.hospitals;
    if (filters.city) hospitals = hospitals.filter(h => h.city === filters.city);

    let plotted = 0, skipped = 0;

    hospitals.forEach(h => {
      const coords = (window.PINCODES || {})[h.pinCode];
      if (!coords) { skipped++; return; }

      // Determine marker color based on status + empanelment
      const color = getMarkerColor(h);

      // Small jitter to avoid exact overlaps at same pincode
      const jLat = coords.lat + (Math.random() - 0.5) * 0.003;
      const jLng = coords.lng + (Math.random() - 0.5) * 0.003;

      const marker = L.circleMarker([jLat, jLng], {
        radius: 7,
        fillColor: color,
        color: '#fff',
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85,
      });

      marker.bindPopup(buildPopup(h), { maxWidth: 280 });
      marker.addTo(map);
      markers.push(marker);
      plotted++;
    });

    // Auto-zoom to city if selected
    if (filters.city && markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    // Update marker count
    const countEl = document.getElementById('p3-marker-count');
    if (countEl) countEl.textContent = `${plotted} hospitals plotted${skipped ? `, ${skipped} without pincode coords` : ''}`;
  }

  // ── Marker color logic ─────────────────────────────────────
  function getMarkerColor(h) {
    const isActive = h.activeStatus === 'Active';

    // Check empanelment for selected insurer/TPA
    const insEmpanelled = filters.insurer
      ? (h.insurer[filters.insurer] === true)
      : Object.values(h.insurer).some(Boolean);

    const tpaEmpanelled = filters.tpa
      ? (h.tpa[filters.tpa] === true)
      : Object.values(h.tpa).some(Boolean);

    const isEmpanelled = filters.insurer || filters.tpa
      ? (filters.insurer ? insEmpanelled : true) && (filters.tpa ? tpaEmpanelled : true)
      : insEmpanelled || tpaEmpanelled;

    // Green = Active + Empanelled
    if (isActive && isEmpanelled)  return '#16a34a';
    // Yellow = Active but NOT empanelled for selected filter
    if (isActive && !isEmpanelled) return '#d97706';
    // Red = Empanelled but Inactive
    if (!isActive && isEmpanelled) return '#dc2626';
    // Gray = Inactive and not empanelled
    return '#9ca3af';
  }

  // ── Popup HTML ─────────────────────────────────────────────
  function buildPopup(h) {
    const isActive = h.activeStatus === 'Active';
    const statusColor = isActive ? '#16a34a' : '#dc2626';

    // Build empanelment status for selected insurer/TPA
    let empLines = '';
    if (filters.insurer) {
      const v = h.insurer[filters.insurer];
      empLines += `<div style="font-size:12px;margin-top:4px;">
        ${filters.insurer}: <strong style="color:${v?'#16a34a':'#dc2626'}">${v?'✓ Empanelled':'✗ Not empanelled'}</strong>
      </div>`;
    }
    if (filters.tpa) {
      const v = h.tpa[filters.tpa];
      empLines += `<div style="font-size:12px;margin-top:2px;">
        ${esc(filters.tpa)}: <strong style="color:${v?'#16a34a':'#dc2626'}">${v?'✓ Empanelled':'✗ Not empanelled'}</strong>
      </div>`;
    }

    // Count total empanelled
    const totalIns = Object.values(h.insurer).filter(Boolean).length;
    const totalTpa = Object.values(h.tpa).filter(Boolean).length;

    // ASP data summary
    const aspCases = h.aspData || [];
    const validASP = aspCases.filter(c => c.approvalAmount !== null);
    const avgASP = validASP.length
      ? Math.round(validASP.reduce((s, c) => s + c.approvalAmount, 0) / validASP.length)
      : null;

    return `
      <div style="font-family:sans-serif;min-width:220px;">
        <div style="font-weight:600;font-size:13px;margin-bottom:4px;">${esc(h.hospitalName)}</div>
        <div style="font-size:11px;color:#6b7280;margin-bottom:6px;">${esc(h.area)}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;font-size:12px;margin-bottom:6px;">
          <span style="color:${statusColor};font-weight:500;">${esc(h.activeStatus)}</span>
          <span style="color:#6b7280;">MOP: ${esc(h.mopStatus)}</span>
          <span style="color:#6b7280;">PIN: ${esc(h.pinCode)}</span>
        </div>
        <div style="font-size:12px;color:#374151;margin-bottom:4px;">
          Coverage: <strong>${totalIns}</strong> insurer${totalIns!==1?'s':''} · <strong>${totalTpa}</strong> TPA${totalTpa!==1?'s':''}
        </div>
        ${avgASP ? `<div style="font-size:12px;color:#059669;">Avg ASP: <strong>₹${avgASP.toLocaleString('en-IN')}</strong> (${aspCases.length} cases)</div>` : ''}
        ${empLines}
        ${h.insComments ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;border-top:1px solid #e5e7eb;padding-top:4px;">${esc(h.insComments)}</div>` : ''}
      </div>`;
  }

  // ── Supply gap analysis ────────────────────────────────────
  function renderGapAnalysis() {
    const el = document.getElementById('p3-gaps');
    if (!el) return;

    let hospitals = DATA.hospitals;
    if (filters.city) hospitals = hospitals.filter(h => h.city === filters.city);

    const activeHospitals = hospitals.filter(h => h.activeStatus === 'Active');
    const totalActive = activeHospitals.length;

    if (totalActive === 0) {
      el.innerHTML = '<div style="color:var(--muted);font-size:13px;">No active hospitals for selected city.</div>';
      return;
    }

    // Determine which insurers to show
    const insurersToShow = filters.insurer
      ? [filters.insurer]
      : DATA.insurerNames;

    const gaps = insurersToShow.map(ins => {
      const empanelled = activeHospitals.filter(h => h.insurer[ins] === true);
      const gap = totalActive - empanelled.length;
      return {
        insurer: ins,
        empanelled: empanelled.length,
        total: totalActive,
        gap,
        pct: Math.round((empanelled.length / totalActive) * 100),
      };
    }).sort((a, b) => a.pct - b.pct); // worst coverage first

    // Summary header
    const cityName = filters.city ? cityLabel(filters.city) : 'All Cities';
    const avgCoverage = Math.round(gaps.reduce((s, g) => s + g.pct, 0) / gaps.length);

    el.innerHTML = `
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:16px;">
        <div class="metric-card" style="min-width:120px;">
          <div class="metric-label">Active Hospitals</div>
          <div class="metric-value">${totalActive}</div>
          <div class="metric-sub">${cityName}</div>
        </div>
        <div class="metric-card" style="min-width:120px;">
          <div class="metric-label">Avg Coverage</div>
          <div class="metric-value">${avgCoverage}%</div>
          <div class="metric-sub">Across insurers</div>
        </div>
        <div class="metric-card" style="min-width:120px;">
          <div class="metric-label">Insurers Checked</div>
          <div class="metric-value">${gaps.length}</div>
          <div class="metric-sub">Supply gaps below</div>
        </div>
      </div>
      <div style="font-size:12px;font-weight:600;color:var(--muted);text-transform:uppercase;
        letter-spacing:.4px;margin-bottom:10px;">
        Coverage by Insurer — ${cityName}
        ${filters.insurer ? '' : '<span style="font-weight:400;text-transform:none;"> (sorted: worst coverage first)</span>'}
      </div>
      ${gaps.map(g => `
        <div class="gap-row">
          <div class="gap-label" title="${esc(g.insurer)}">${esc(shortInsurer(g.insurer))}</div>
          <div class="gap-bar-wrap">
            <div class="gap-bar-fill ${g.pct < 30 ? 'gap-bad' : ''}"
              style="width:${g.pct}%"></div>
          </div>
          <div class="gap-numbers">
            ${g.empanelled}/${g.total}
            <span style="color:${g.gap > 0 ? '#dc2626' : '#16a34a'};">
              ${g.gap > 0 ? `(−${g.gap} gap)` : '✓'}
            </span>
          </div>
        </div>`).join('')}
      <div style="margin-top:14px;font-size:12px;color:var(--muted);">
        Red bar = &lt;30% coverage — supply gap your team needs to work on.
      </div>`;
  }

  // ── Bind events ────────────────────────────────────────────
  function bindEvents() {
    ['p3-city','p3-insurer','p3-tpa'].forEach(id => {
      const key = id.replace('p3-','');
      document.getElementById(id)?.addEventListener('change', e => {
        filters[key] = e.target.value;
        if (mapInited) {
          renderMarkers();
          renderGapAnalysis();
        }
      });
    });

    document.getElementById('p3-clear')?.addEventListener('click', () => {
      Object.keys(filters).forEach(k => filters[k] = '');
      renderFilters();
      if (mapInited) {
        renderMarkers();
        renderGapAnalysis();
        map.setView([20.5937, 78.9629], 5);
      }
    });
  }

  // ── Utilities ──────────────────────────────────────────────
  function cityLabel(v) {
    if (!v) return 'All Cities';
    return CONFIG.CITY_DISPLAY[v] ||
      v.split(' ').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
  }

  function shortInsurer(name) {
    return name
      .replace('Health Insurance', 'Hlth Ins')
      .replace('General Insurance', 'Gen Ins')
      .replace('Co. Ltd.', '').replace('Company Ltd.', '')
      .replace('Insurance', 'Ins').trim()
      .slice(0, 28);
  }

  function esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;')
      .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  return { init, initMap };
})();
