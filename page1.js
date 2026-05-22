// PAGE 1 — Hospital Network + Smart Finder
const PAGE1 = (() => {
  const filters = {city:'',region:'',status:'',tier:'',insurer:'',tpa:'',search:''};
  let page = 1; const PS = 20;

  function init() {
    renderRegionCards();
    renderFilters();
    renderTable();
    renderRecs();
    bindEvents();
    onDataRefresh(()=>{ renderRegionCards(); renderFilters(); renderTable(); renderRecs(); });
  }

  // ── Region cards ────────────────────────────────────────
  function renderRegionCards() {
    const zones = ['North','South','East','West','Central'];
    const active = {}, total = {};
    zones.forEach(z=>{ active[z]=0; total[z]=0; });
    DATA.hospitals.forEach(h => {
      const z = h.zone || 'Central';
      total[z] = (total[z]||0) + 1;
      if (h.activeStatus === 'Active') active[z] = (active[z]||0) + 1;
    });
    zones.forEach(z => {
      const el = document.getElementById('rn-'+z);
      const sub = document.getElementById('rs-'+z);
      if (el) el.textContent = active[z] || 0;
      if (sub) sub.textContent = (total[z]||0) + ' total hospitals';
    });
  }

  // ── Filters ─────────────────────────────────────────────
  function renderFilters() {
    fillSel('p1-city',   [['','All Cities'],   ...getCities().map(c=>[c,cityLabel(c)])],    filters.city);
    fillSel('p1-insurer',[['','All Insurers'],  ...DATA.insurerNames.map(i=>[i,i])],         filters.insurer);
    fillSel('p1-tpa',    [['','All TPAs'],      ...DATA.tpaNames.map(t=>[t,t])],             filters.tpa);
    // Smart finder selects
    fillSel('sf-insurer',[['','Any Insurer'],   ...DATA.insurerNames.map(i=>[i,i])],         '');
    fillSel('sf-tpa',    [['','Any TPA'],       ...DATA.tpaNames.map(t=>[t,t])],             '');
  }

  function fillSel(id, opts, cur) {
    const el = document.getElementById(id); if (!el) return;
    el.innerHTML = opts.map(([v,l])=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(l)}</option>`).join('');
  }

  // ── Filtered list ────────────────────────────────────────
  function getFiltered() {
    let list = DATA.hospitals;
    if (filters.region)  list = list.filter(h => h.zone === filters.region);
    if (filters.city)    list = list.filter(h => h.city === filters.city);
    if (filters.status)  list = list.filter(h => h.activeStatus === filters.status);
    if (filters.tier)    list = list.filter(h => h.tier === filters.tier);
    if (filters.insurer) list = list.filter(h => h.insurer[filters.insurer] === true);
    if (filters.tpa)     list = list.filter(h => h.tpa[filters.tpa] === true);
    if (filters.search)  { const q=filters.search.toLowerCase(); list=list.filter(h=>h.hospitalName.toLowerCase().includes(q)||h.area.toLowerCase().includes(q)); }
    return list;
  }

  // ── Table ────────────────────────────────────────────────
  function renderTable() {
    const tbody = document.getElementById('p1-tbody'); if (!tbody) return;
    const list = getFiltered();
    document.getElementById('p1-count').textContent = `(${list.length} hospitals)`;
    const slice = list.slice((page-1)*PS, page*PS);
    if (!slice.length) { tbody.innerHTML=`<tr><td colspan="8" class="empty-row">No hospitals match the current filters.</td></tr>`; renderPag(0); return; }
    tbody.innerHTML = slice.map(h => {
      const covPct = calcCoverage(h);
      const flags = Object.keys(h.empanelmentFlags||{}).length;
      const flagHtml = flags ? `<span class="flag-badge" title="${flags} empanelment discrepancies">⚑ ${flags}</span>` : '';
      const tierHtml = h.tier ? `<span class="tier-badge tier-${h.tier.toLowerCase()}">${h.tier}</span>` : '';
      const zoneColor = CONFIG.ZONE_COLORS[h.zone]||'#9ca3af';
      return `<tr class="hospital-row" data-hospital="${esc(h.hospitalName)}">
        <td><div class="hosp-name">${esc(h.hospitalName)} ${tierHtml} ${flagHtml}</div><div class="hosp-area">${esc(h.area)}</div></td>
        <td>${cityLabel(h.city)}</td>
        <td><span style="display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:500;"><span style="width:8px;height:8px;border-radius:50%;background:${zoneColor};display:inline-block;flex-shrink:0;"></span>${h.zone||'—'}</span></td>
        <td><span class="status-badge ${h.activeStatus==='Active'?'status-active':'status-inactive'}">${h.activeStatus}</span></td>
        <td>${esc(h.mopStatus)}</td>
        <td><div class="coverage-wrap"><div class="coverage-bar-bg"><div class="coverage-bar-fill" style="width:${covPct}%"></div></div><span class="coverage-pct">${covPct}%</span></div></td>
        <td style="font-size:12px;color:var(--text3);max-width:160px;">${esc(h.insComments||'—')}</td>
        <td style="font-size:12px;color:var(--text3);max-width:160px;">${esc(h.cityComments||'—')}</td>
      </tr>`;
    }).join('');
    renderPag(list.length);
  }

  function calcCoverage(h) {
    const total = DATA.insurerNames.length + DATA.tpaNames.length;
    if (!total) return 0;
    const yes = Object.values(h.insurer).filter(Boolean).length + Object.values(h.tpa).filter(Boolean).length;
    return Math.round((yes/total)*100);
  }

  function renderPag(total) {
    const el = document.getElementById('p1-pagination'); if (!el) return;
    const pages = Math.ceil(total/PS);
    if (pages<=1) { el.innerHTML=''; return; }
    let h='';
    if (page>1) h+=`<button class="pg-btn" data-page="${page-1}">‹</button>`;
    for(let i=Math.max(1,page-2);i<=Math.min(pages,page+2);i++) h+=`<button class="pg-btn ${i===page?'pg-active':''}" data-page="${i}">${i}</button>`;
    if (page<pages) h+=`<button class="pg-btn" data-page="${page+1}">›</button>`;
    el.innerHTML=h;
  }

  // ── Recommendations ──────────────────────────────────────
  function renderRecs() {
    const el = document.getElementById('p1-recs'); if (!el) return;
    const has = filters.city||filters.insurer||filters.tpa;
    if (!has) { el.innerHTML=`<div class="rec-hint">Select city, insurer or TPA to see top recommended hospitals based on historical ASP data.</div>`; return; }
    const recs = getRecommendations({city:filters.city,insurer:filters.insurer,tpa:filters.tpa,topN:5});
    if (!recs.length) { el.innerHTML=`<div class="rec-hint">No historical cases found for this combination.</div>`; return; }
    const desc = [filters.city?cityLabel(filters.city):'',filters.insurer||'',filters.tpa||''].filter(Boolean).join(' · ');
    el.innerHTML=`<div class="rec-header"><span class="rec-title">⭐ Top Recommended Hospitals</span><span class="rec-desc">${esc(desc)}</span></div>
    <div class="rec-cards">${recs.map((r,i)=>`
      <div class="rec-card" data-hospital="${esc(r.hospitalName)}">
        <div class="rec-rank">#${i+1}</div>
        <div><div class="rec-hosp">${esc(r.hospitalName)}</div>
        <div class="rec-meta">
          <span class="rec-asp">₹${fmtN(r.avgASP)} ASP</span>
          <span class="rec-cases">${r.caseCount} cases</span>
          ${r.lastCaseDate?`<span class="rec-date">Last: ${r.lastCaseDate.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>`:''}
        </div></div>
      </div>`).join('')}</div>`;
  }

  // ── Detail panel ─────────────────────────────────────────
  function openPanel(name) {
    const h = DATA.hospitals.find(x=>x.hospitalName===name); if (!h) return;
    document.querySelectorAll('.hospital-row.selected').forEach(r=>r.classList.remove('selected'));
    document.querySelector(`.hospital-row[data-hospital="${CSS.escape(name)}"]`)?.classList.add('selected');

    const hc = h.aspData||[];
    const valid = hc.filter(c=>c.approvalAmount!==null);
    const avgASP = valid.length ? Math.round(valid.reduce((s,c)=>s+c.approvalAmount,0)/valid.length) : null;
    const avgBill = hc.filter(c=>c.billAmount).length ? Math.round(hc.filter(c=>c.billAmount).reduce((s,c)=>s+c.billAmount,0)/hc.filter(c=>c.billAmount).length) : null;
    const avgSet = hc.filter(c=>c.settlementAmount).length ? Math.round(hc.filter(c=>c.settlementAmount).reduce((s,c)=>s+c.settlementAmount,0)/hc.filter(c=>c.settlementAmount).length) : null;
    const dates = hc.map(c=>c.dodParsed).filter(Boolean);
    const lastCase = dates.length ? new Date(Math.max(...dates.map(d=>d.getTime()))) : null;
    const covPct = calcCoverage(h);

    // Year-wise breakdown
    const byYear = {};
    hc.forEach(c=>{ if(!c.doaParsed) return; const y=c.doaParsed.getFullYear(); if(!byYear[y]) byYear[y]={cases:[],cats:{}}; byYear[y].cases.push(c); if(c.category&&c.approvalAmount) byYear[y].cats[c.category]=(byYear[y].cats[c.category]||[]).concat([c.approvalAmount]); });

    // Category breakdown
    const byCat = {};
    hc.forEach(c=>{ if(!c.category||c.approvalAmount===null) return; if(!byCat[c.category]) byCat[c.category]=[]; byCat[c.category].push(c); });
    const catRows = Object.entries(byCat).sort(([,a],[,b])=>b.length-a.length).slice(0,8);

    // Insurer breakdown
    const byIns = {};
    hc.forEach(c=>{ if(!c.insuranceName) return; if(!byIns[c.insuranceName]) byIns[c.insuranceName]={count:0,asp:[]}; byIns[c.insuranceName].count++; if(c.approvalAmount!==null) byIns[c.insuranceName].asp.push(c.approvalAmount); });
    const insRows = Object.entries(byIns).sort(([,a],[,b])=>b.count-a.count).slice(0,6);

    const empIns = Object.entries(h.insurer);
    const empTpa = Object.entries(h.tpa);

    document.getElementById('detail-content').innerHTML = `
    <div class="dp-section">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;">
        <div>
          <div style="font-size:17px;font-weight:800;color:var(--text);line-height:1.3;margin-bottom:3px;">${esc(h.hospitalName)}</div>
          <div style="font-size:12px;color:var(--text3);">
            <span style="display:inline-flex;align-items:center;gap:4px;"><span style="width:8px;height:8px;border-radius:50%;background:${CONFIG.ZONE_COLORS[h.zone]||'#9ca3af'};display:inline-block;"></span>${h.zone}</span> • ${cityLabel(h.city)} • ${esc(h.area)}
          </div>
        </div>
        <span class="status-badge ${h.activeStatus==='Active'?'status-active':'status-inactive'}" style="flex-shrink:0;">${h.activeStatus}</span>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
        ${h.tier?`<span class="tier-badge tier-${h.tier.toLowerCase()}">${h.tier}</span>`:''}
        <span style="font-size:11px;background:var(--surface2);padding:2px 8px;border-radius:10px;color:var(--text2);">PIN: ${h.pinCode}</span>
        <span style="font-size:11px;background:var(--surface2);padding:2px 8px;border-radius:10px;color:var(--text2);">MOP: ${h.mopStatus}</span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">
        <div style="background:var(--surface2);border-radius:var(--r-sm);padding:8px;text-align:center;">
          <div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;">Status</div>
          <div style="font-size:13px;font-weight:700;color:var(--text);">${h.activeStatus}</div>
        </div>
        <div style="background:var(--surface2);border-radius:var(--r-sm);padding:8px;text-align:center;">
          <div style="font-size:9px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;">MOP Type</div>
          <div style="font-size:13px;font-weight:700;color:var(--text);">${h.mopStatus||'—'}</div>
        </div>
        <div style="background:var(--teal-lt);border-radius:var(--r-sm);padding:8px;text-align:center;">
          <div style="font-size:9px;font-weight:700;color:var(--teal-dk);text-transform:uppercase;letter-spacing:.4px;margin-bottom:2px;">Coverage</div>
          <div style="font-size:13px;font-weight:700;color:var(--teal);">${covPct}%</div>
        </div>
      </div>
    </div>

    ${h.insComments||h.cityComments||h.doctorComments?`
    <div class="dp-section">
      <div class="dp-section-label">Comments & Remarks</div>
      ${h.insComments?`<div class="dp-comment dp-comment-ins" style="padding-left:10px;"><strong>Insurance:</strong> ${esc(h.insComments)}</div>`:'<div style="font-size:12px;color:var(--text3);padding:2px 0;">🟢 Insurance Comments — not yet added</div>'}
      ${h.cityComments?`<div class="dp-comment dp-comment-city" style="padding-left:10px;"><strong>City team:</strong> ${esc(h.cityComments)}</div>`:'<div style="font-size:12px;color:var(--text3);padding:2px 0;">🔵 City Comments — not yet added</div>'}
      ${h.doctorComments?`<div class="dp-comment dp-comment-doc" style="padding-left:10px;"><strong>Doctors:</strong> ${esc(h.doctorComments)}</div>`:'<div style="font-size:12px;color:var(--text3);padding:2px 0;">🔵 Doctors Team Comments — not yet added</div>'}
    </div>`:
    `<div class="dp-section">
      <div class="dp-section-label">Comments & Remarks</div>
      <div style="font-size:12px;color:var(--text3);">🟢 City Comments — not yet added</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px;">🔵 Doctors Team Comments — not yet added</div>
    </div>`}

    ${hc.length?`
    <div class="dp-section">
      <div class="dp-section-label">📊 ASP History <span style="font-weight:400;font-size:11px;color:var(--teal);font-style:italic;">${esc(h.hospitalName.split(',')[0].toUpperCase())}</span></div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px;">
        <div style="text-align:center;padding:10px;background:var(--surface2);border-radius:var(--r-sm);">
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;font-weight:600;margin-bottom:2px;">Total Cases</div>
          <div style="font-size:26px;font-weight:800;color:var(--text);letter-spacing:-1px;">${hc.length}</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--teal-lt);border-radius:var(--r-sm);">
          <div style="font-size:11px;color:var(--teal-dk);text-transform:uppercase;letter-spacing:.4px;font-weight:600;margin-bottom:2px;">Avg ASP</div>
          <div style="font-size:26px;font-weight:800;color:var(--teal);letter-spacing:-1px;">${avgASP?'₹'+fmtN(avgASP):'—'}</div>
        </div>
        <div style="text-align:center;padding:10px;background:var(--surface2);border-radius:var(--r-sm);">
          <div style="font-size:11px;color:var(--text3);text-transform:uppercase;letter-spacing:.4px;font-weight:600;margin-bottom:2px;">Categories</div>
          <div style="font-size:26px;font-weight:800;color:var(--text);letter-spacing:-1px;">${Object.keys(byCat).length}</div>
        </div>
      </div>
      ${Object.entries(byYear).sort(([a],[b])=>b-a).map(([yr,data])=>{
        const yValid = data.cases.filter(c=>c.approvalAmount!==null);
        const yAvg = yValid.length?Math.round(yValid.reduce((s,c)=>s+c.approvalAmount,0)/yValid.length):null;
        const catEntries = Object.entries(data.cats).sort(([,a],[,b])=>b.length-a.length).slice(0,5);
        return `<div style="margin-bottom:10px;">
          <div style="font-weight:700;font-size:13px;margin-bottom:6px;">${yr} <span style="font-weight:400;font-size:12px;color:var(--text3);">${data.cases.length} cases • Avg ${yAvg?'₹'+fmtN(yAvg):'—'}</span></div>
          ${catEntries.map(([cat,vals])=>`
            <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);font-size:12px;">
              <span style="color:var(--text2);text-transform:uppercase;letter-spacing:.3px;font-weight:500;">${esc(cat)}</span>
              <span style="display:flex;gap:10px;align-items:center;">
                <span style="color:var(--text3);">${vals.length} cases</span>
                <span style="color:var(--teal);font-weight:700;font-family:var(--mono);">₹${fmtN(Math.round(vals.reduce((s,v)=>s+v,0)/vals.length))}</span>
              </span>
            </div>`).join('')}
        </div>`;}).join('')}
    </div>

    <div class="dp-section">
      <div class="dp-section-label">Top Insurers by Cases</div>
      ${insRows.map(([ins,d])=>`
        <div class="dp-row">
          <span class="dp-row-label">${esc(ins)}</span>
          <span style="display:flex;gap:8px;align-items:center;">
            <span style="color:var(--text3);font-size:12px;">${d.count} cases</span>
            ${d.asp.length?`<span class="dp-row-val" style="color:var(--teal);">₹${fmtN(Math.round(d.asp.reduce((s,v)=>s+v,0)/d.asp.length))}</span>`:''}
          </span>
        </div>`).join('')}
    </div>`:''}

    <div class="dp-section">
      <div class="dp-section-label">TPA Empanelment</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
        ${empTpa.map(([name,val])=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">
            <span style="color:var(--text2);font-size:11px;">${esc(name)}</span>
            ${val?`<span class="dp-yes">Yes</span>`:`<span class="dp-no">—</span>`}
          </div>`).join('')}
      </div>
    </div>

    <div class="dp-section">
      <div class="dp-section-label">Insurer Empanelment</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">
        ${empIns.map(([name,val])=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid var(--border);font-size:12px;">
            <span style="color:var(--text2);font-size:11px;">${esc(name)}</span>
            ${val?`<span class="dp-yes">Yes</span>`:`<span class="dp-no">—</span>`}
          </div>`).join('')}
      </div>
    </div>`;

    document.getElementById('detail-panel').classList.add('open');
    document.getElementById('detail-overlay').classList.add('open');
  }

  function closePanel() {
    document.getElementById('detail-panel').classList.remove('open');
    document.getElementById('detail-overlay').classList.remove('open');
    document.querySelectorAll('.hospital-row.selected').forEach(r=>r.classList.remove('selected'));
  }

  // ── Smart Finder ─────────────────────────────────────────
  function runFinder() {
    const pin = document.getElementById('sf-pincode')?.value.trim();
    const ins = document.getElementById('sf-insurer')?.value;
    const tpa = document.getElementById('sf-tpa')?.value;
    const el = document.getElementById('sf-results'); if (!el) return;

    if (!pin || pin.length !== 6) { el.innerHTML=`<div style="color:var(--red);font-size:13px;">Please enter a valid 6-digit pincode.</div>`; return; }
    const origin = (window.PINCODES||{})[pin];
    if (!origin) { el.innerHTML=`<div style="color:var(--amber);font-size:13px;">Pincode ${pin} not found in our database. Try a nearby pincode.</div>`; return; }

    el.innerHTML=`<div style="font-size:13px;color:var(--text3);margin-bottom:10px;">Patient: <strong style="color:var(--text);">${pin}</strong> (${pin})</div>`;

    let hospitals = DATA.hospitals.filter(h=>h.activeStatus==='Active');
    if (ins) hospitals = hospitals.filter(h=>h.insurer[ins]===true);
    if (tpa) hospitals = hospitals.filter(h=>h.tpa[tpa]===true);

    const withDist = hospitals.map(h=>{
      const dest = (window.PINCODES||{})[h.pinCode];
      const dist = dest ? haversine(origin.lat,origin.lng,dest.lat,dest.lng) : 9999;
      return {...h, _dist:dist};
    }).sort((a,b)=>a._dist-b._dist).slice(0,20);

    if (!withDist.length) { el.innerHTML+=`<div style="color:var(--text3);font-size:13px;">No active hospitals found for the selected filters.</div>`; return; }

    const covMax = DATA.insurerNames.length + DATA.tpaNames.length;
    el.innerHTML += withDist.map((h,i)=>{
      const covPct = covMax>0?Math.round((Object.values(h.insurer).filter(Boolean).length+Object.values(h.tpa).filter(Boolean).length)/covMax*100):0;
      const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':'';
      return `<div class="finder-result" data-hospital="${esc(h.hospitalName)}">
        <div class="finder-dist">${h._dist<9999?h._dist.toFixed(1)+'km':'—'}</div>
        <div class="finder-info">
          <div class="finder-hosp">${medal} ${esc(h.hospitalName)}</div>
          <div class="finder-meta">${cityLabel(h.city)} • ${esc(h.area)}</div>
          <div class="finder-coverage">Coverage: ${covPct}%</div>
        </div>
        <span class="status-badge status-active">Active</span>
      </div>`;
    }).join('');
  }

  // ── Export CSV ────────────────────────────────────────────
  function exportCSV() {
    const list = getFiltered();
    const headers = ['Hospital Name','City','Region','Status','MOP','Coverage %','Ins Comments','City Comments','Doctor Comments'];
    const covMax = DATA.insurerNames.length + DATA.tpaNames.length;
    const rows = list.map(h=>{
      const cov = covMax>0?Math.round((Object.values(h.insurer).filter(Boolean).length+Object.values(h.tpa).filter(Boolean).length)/covMax*100):0;
      return [h.hospitalName,cityLabel(h.city),h.zone,h.activeStatus,h.mopStatus,cov+'%',h.insComments,h.cityComments,h.doctorComments].map(v=>`"${String(v||'').replace(/"/g,'""')}"`).join(',');
    });
    const csv = [headers.join(','),...rows].join('\n');
    const a = document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(csv); a.download='hospital_network.csv'; a.click();
  }

  // ── Events ────────────────────────────────────────────────
  function bindEvents() {
    on('p1-region','change',e=>{filters.region=e.target.value;page=1;renderTable();renderRecs();});
    on('p1-city','change',e=>{filters.city=e.target.value;page=1;renderTable();renderRecs();});
    on('p1-status','change',e=>{filters.status=e.target.value;page=1;renderTable();});
    on('p1-tier','change',e=>{filters.tier=e.target.value;page=1;renderTable();});
    on('p1-insurer','change',e=>{filters.insurer=e.target.value;page=1;renderTable();renderRecs();});
    on('p1-tpa','change',e=>{filters.tpa=e.target.value;page=1;renderTable();renderRecs();});
    on('p1-search','input',e=>{filters.search=e.target.value.trim();page=1;renderTable();});
    on('p1-clear','click',()=>{Object.keys(filters).forEach(k=>filters[k]='');page=1;document.getElementById('p1-search').value='';renderFilters();renderTable();renderRecs();});
    on('p1-export','click',exportCSV);
    document.getElementById('p1-pagination')?.addEventListener('click',e=>{const b=e.target.closest('.pg-btn');if(!b)return;page=parseInt(b.dataset.page);renderTable();document.getElementById('p1-table-wrap')?.scrollIntoView({behavior:'smooth'});});
    document.getElementById('p1-tbody')?.addEventListener('click',e=>{const r=e.target.closest('.hospital-row');if(!r)return;openPanel(r.dataset.hospital);});
    document.getElementById('p1-recs')?.addEventListener('click',e=>{const c=e.target.closest('.rec-card');if(!c)return;openPanel(c.dataset.hospital);});
    on('detail-close','click',closePanel);
    on('detail-overlay','click',closePanel);
    on('sf-find','click',runFinder);
    on('sf-pincode','keydown',e=>{if(e.key==='Enter')runFinder();});
    document.getElementById('sf-results')?.addEventListener('click',e=>{const r=e.target.closest('.finder-result');if(!r)return;openPanel(r.dataset.hospital);});
  }

  // ── Utils ─────────────────────────────────────────────────
  function on(id,ev,fn){document.getElementById(id)?.addEventListener(ev,fn);}
  function fmtN(n){if(!n&&n!==0)return'—';if(n>=100000)return(n/100000).toFixed(1)+'L';if(n>=1000)return Math.round(n).toLocaleString('en-IN');return Math.round(n).toString();}
  function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  return { init, openPanel, closePanel };
})();
