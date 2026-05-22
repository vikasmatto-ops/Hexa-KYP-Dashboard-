// PAGE 3 — Coverage Map
const PAGE3 = (() => {
  const f = { city:'', insurer:'', tpa:'' };
  let map=null, markers=[], gapCircles=[], mapInited=false;

  function init() {
    renderCityPills();
    renderFilters();
    bindEvents();
    onDataRefresh(()=>{ renderCityPills(); renderFilters(); if(mapInited){renderMarkers();renderGaps();} });
  }

  function initMap() {
    if (mapInited) { if(map) setTimeout(()=>map.invalidateSize(),100); return; }
    if (typeof L==='undefined') { setTimeout(initMap,300); return; }
    map = L.map('map').setView([20.5937,78.9629],5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:18}).addTo(map);
    mapInited=true;
    renderMarkers();
    renderGaps();
    updateCounts();
  }

  function renderCityPills() {
    const el=document.getElementById('p3-city-pills'); if(!el)return;
    const cities=getCities();
    el.innerHTML=cities.map(c=>`<button class="pill ${f.city===c?'active':''}" data-city="${c}">${cityLabel(c)}</button>`).join('');
    el.querySelectorAll('.pill').forEach(btn=>{
      btn.addEventListener('click',()=>{
        f.city = f.city===btn.dataset.city?'':btn.dataset.city;
        renderCityPills();
        if(mapInited){renderMarkers();renderGaps();updateCounts();}
      });
    });
  }

  function renderFilters() {
    fillSel('p3-insurer',[['','All Insurers'],...DATA.insurerNames.map(i=>[i,i])],f.insurer);
    fillSel('p3-tpa',   [['','All TPAs'],    ...DATA.tpaNames.map(t=>[t,t])],     f.tpa);
  }

  function fillSel(id,opts,cur){const el=document.getElementById(id);if(!el)return;el.innerHTML=opts.map(([v,l])=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(l)}</option>`).join('');}

  function renderMarkers() {
    if (!map) return;
    markers.forEach(m=>map.removeLayer(m));
    gapCircles.forEach(c=>map.removeLayer(c));
    markers=[]; gapCircles=[];

    let hospitals=DATA.hospitals;
    if (f.city) hospitals=hospitals.filter(h=>h.city===f.city);

    let plotted=0;
    hospitals.forEach(h=>{
      const coords=(window.PINCODES||{})[h.pinCode];
      if(!coords)return;
      const color=getColor(h);
      const jLat=coords.lat+(Math.random()-.5)*.003;
      const jLng=coords.lng+(Math.random()-.5)*.003;
      const marker=L.circleMarker([jLat,jLng],{radius:7,fillColor:color,color:'#fff',weight:1.5,opacity:1,fillOpacity:.85});
      marker.bindPopup(buildPopup(h),{maxWidth:280});
      marker.addTo(map);
      markers.push(marker);
      plotted++;

      // Pulsing coverage gap circle for active but not empanelled
      if (h.activeStatus==='Active' && (f.insurer||f.tpa)) {
        const insEmp = f.insurer ? h.insurer[f.insurer]===true : true;
        const tpaEmp = f.tpa ? h.tpa[f.tpa]===true : true;
        if (!insEmp||!tpaEmp) {
          const circle=L.circle([jLat,jLng],{radius:10000,color:'#94a3b8',weight:1.5,dashArray:'6,4',fillColor:'transparent',opacity:.6});
          circle.addTo(map);
          gapCircles.push(circle);
        }
      }
    });

    if (f.city && markers.length) {
      const grp=L.featureGroup(markers);
      map.fitBounds(grp.getBounds().pad(.25));
    }

    const el=document.getElementById('p3-marker-count');
    if(el) el.textContent=`${plotted} hospitals plotted`;
    updateCounts();
  }

  function getColor(h) {
    const isActive=h.activeStatus==='Active';
    const insEmp=f.insurer?(h.insurer[f.insurer]===true):Object.values(h.insurer).some(Boolean);
    const tpaEmp=f.tpa?(h.tpa[f.tpa]===true):Object.values(h.tpa).some(Boolean);
    const isEmp=(f.insurer||f.tpa)?((!f.insurer||insEmp)&&(!f.tpa||tpaEmp)):(insEmp||tpaEmp);
    if (isActive&&isEmp)  return '#10b981'; // green
    if (isActive&&!isEmp) return '#f97316'; // orange
    if (!isActive&&isEmp) return '#ef4444'; // red
    return '#ef4444'; // inactive = red regardless
  }

  function updateCounts() {
    let hospitals=DATA.hospitals;
    if(f.city) hospitals=hospitals.filter(h=>h.city===f.city);
    const active=hospitals.filter(h=>h.activeStatus==='Active').length;
    const inactive=hospitals.length-active;
    const el1=document.getElementById('p3-active-count');
    const el2=document.getElementById('p3-inactive-count');
    const el3=document.getElementById('p3-total-count');
    if(el1) el1.textContent=active;
    if(el2) el2.textContent=inactive;
    if(el3) el3.textContent=hospitals.length;
  }

  function buildPopup(h) {
    const isActive=h.activeStatus==='Active';
    const insEmp=f.insurer?(h.insurer[f.insurer]===true):null;
    const tpaEmp=f.tpa?(h.tpa[f.tpa]===true):null;
    const covMax=DATA.insurerNames.length+DATA.tpaNames.length||1;
    const covPct=Math.round((Object.values(h.insurer).filter(Boolean).length+Object.values(h.tpa).filter(Boolean).length)/covMax*100);
    const hcases=h.aspData||[];
    const valid=hcases.filter(c=>c.approvalAmount!==null);
    const avgASP=valid.length?Math.round(valid.reduce((s,c)=>s+c.approvalAmount,0)/valid.length):null;
    return`<div style="font-family:'DM Sans',sans-serif;min-width:220px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:4px;">${esc(h.hospitalName)}</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:6px;">${esc(h.area)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;">
        <span style="color:${isActive?'#059669':'#dc2626'};font-weight:600;font-size:12px;">${h.activeStatus}</span>
        <span style="color:#6b7280;font-size:12px;">MOP: ${h.mopStatus}</span>
        <span style="color:#6b7280;font-size:12px;">Coverage: ${covPct}%</span>
      </div>
      ${avgASP?`<div style="font-size:12px;color:#059669;">Avg ASP: <strong>₹${avgASP.toLocaleString('en-IN')}</strong> (${hcases.length} cases)</div>`:''}
      ${f.insurer?`<div style="font-size:12px;margin-top:4px;">${esc(f.insurer)}: <strong style="color:${insEmp?'#059669':'#dc2626'}">${insEmp?'✓ Empanelled':'✗ Not empanelled'}</strong></div>`:''}
      ${f.tpa?`<div style="font-size:12px;margin-top:2px;">${esc(f.tpa)}: <strong style="color:${tpaEmp?'#059669':'#dc2626'}">${tpaEmp?'✓ Empanelled':'✗ Not empanelled'}</strong></div>`:''}
    </div>`;
  }

  function renderGaps() {
    const el=document.getElementById('p3-gaps'); if(!el)return;
    let hospitals=DATA.hospitals;
    if(f.city) hospitals=hospitals.filter(h=>h.city===f.city);
    const active=hospitals.filter(h=>h.activeStatus==='Active');
    const total=active.length;
    if(!total){el.innerHTML='<div style="color:var(--text3);font-size:13px;">No active hospitals for selected city.</div>';return;}
    const ins=f.insurer?[f.insurer]:DATA.insurerNames;
    const gaps=ins.map(i=>{ const emp=active.filter(h=>h.insurer[i]===true); return{insurer:i,emp:emp.length,total,gap:total-emp.length,pct:Math.round((emp.length/total)*100)};}).sort((a,b)=>a.pct-b.pct);
    const city=f.city?cityLabel(f.city):'All Cities';
    const avgCov=Math.round(gaps.reduce((s,g)=>s+g.pct,0)/gaps.length);
    el.innerHTML=`<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
      <div class="metric-card metric-green" style="min-width:110px;padding:12px 14px;"><div class="metric-label">Active</div><div class="metric-value" style="font-size:20px;">${total}</div><div class="metric-sub">${city}</div></div>
      <div class="metric-card metric-teal" style="min-width:110px;padding:12px 14px;"><div class="metric-label">Avg Coverage</div><div class="metric-value" style="font-size:20px;">${avgCov}%</div><div class="metric-sub">Across insurers</div></div>
      <div class="metric-card" style="min-width:110px;padding:12px 14px;"><div class="metric-label">Insurers</div><div class="metric-value" style="font-size:20px;">${gaps.length}</div><div class="metric-sub">Checked</div></div>
    </div>
    <div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Coverage by Insurer — ${city}</div>
    ${gaps.map(g=>`<div class="gap-row"><div class="gap-label" title="${esc(g.insurer)}">${esc(shortIns(g.insurer))}</div><div class="gap-bar-wrap"><div class="gap-bar-fill ${g.pct<30?'gap-bad':''}" style="width:${g.pct}%"></div></div><div class="gap-numbers">${g.emp}/${g.total} <span style="color:${g.gap>0?'var(--red)':'var(--green)'}">${g.gap>0?'(−'+g.gap+' gap)':'✓'}</span></div></div>`).join('')}
    <div style="margin-top:12px;font-size:12px;color:var(--text3);">Red bar = &lt;30% coverage — supply gap your team needs to work on.</div>`;
  }

  function bindEvents() {
    on('p3-insurer','change',e=>{f.insurer=e.target.value;if(mapInited){renderMarkers();renderGaps();}});
    on('p3-tpa','change',e=>{f.tpa=e.target.value;if(mapInited){renderMarkers();renderGaps();}});
    on('p3-clear','click',()=>{f.city='';f.insurer='';f.tpa='';renderCityPills();renderFilters();if(mapInited){renderMarkers();renderGaps();map.setView([20.5937,78.9629],5);}});
  }

  function on(id,ev,fn){document.getElementById(id)?.addEventListener(ev,fn);}
  function cityLabel(v){if(!v)return'All Cities';return CONFIG.CITY_DISPLAY[v]||v.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');}
  function shortIns(n){return n.replace('Health Insurance','Hlth Ins').replace('General Insurance','Gen Ins').replace('Co. Ltd.','').replace('Company Ltd.','').replace('Insurance','Ins').trim().slice(0,28);}
  function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  return { init, initMap };
})();
