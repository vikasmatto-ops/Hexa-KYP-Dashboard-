const PAGE3 = (() => {
  const f={city:'',insurer:'',tpa:''};
  const gf={city:'',insurer:'',tpa:''};
  let map=null,markers=[],gapCircles=[],mapInited=false;

  function init(){
    renderCityPills();
    renderFilters();
    bindEvents();
    renderGaps();
    // Init map immediately - page3 is now always rendered (offscreen via CSS)
    setTimeout(initMap,500);
    onDataRefresh(()=>{
      renderCityPills();renderFilters();renderGaps();
      if(mapInited){renderMarkers();updateCounts();}
    });
  }

  function initMap(){
    if(mapInited){setTimeout(()=>{if(map){map.invalidateSize();renderMarkers();}},250);return;}
    if(typeof L==='undefined'){setTimeout(initMap,300);return;}
    const el=document.getElementById('map');
    if(!el){setTimeout(initMap,200);return;}
    el.style.height='500px';el.style.display='block';
    try{
      map=L.map('map',{zoomControl:true}).setView([20.5937,78.9629],5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:18}).addTo(map);
      mapInited=true;
      setTimeout(()=>{map.invalidateSize();renderMarkers();renderGaps();updateCounts();},400);
    }catch(e){console.error('Map init error:',e);}
  }

  function renderCityPills(){
    const el=document.getElementById('p3-city-pills');if(!el)return;
    const cities=getCities();
    el.innerHTML=cities.map(c=>`<button class="pill ${f.city===c?'active':''}" data-city="${c}">${cityLabel(c)}</button>`).join('');
    el.querySelectorAll('.pill').forEach(btn=>{btn.addEventListener('click',()=>{f.city=f.city===btn.dataset.city?'':btn.dataset.city;renderCityPills();if(mapInited){renderMarkers();updateCounts();}});});
  }

  function renderFilters(){
    fillSel('p3-insurer',[['','All Insurers'],...DATA.insurerNames.map(i=>[i,i])],f.insurer);
    fillSel('p3-tpa',   [['','All TPAs'],    ...DATA.tpaNames.map(t=>[t,t])],     f.tpa);
    // Supply gap filters
    fillSel('gap-city',   [['','All Cities'],   ...getCities().map(c=>[c,cityLabel(c)])], gf.city);
    fillSel('gap-insurer',[['','All Insurers'],  ...DATA.insurerNames.map(i=>[i,i])],     gf.insurer);
    fillSel('gap-tpa',    [['','All TPAs'],      ...DATA.tpaNames.map(t=>[t,t])],         gf.tpa);
  }

  function fillSel(id,opts,cur){const el=document.getElementById(id);if(!el)return;el.innerHTML=opts.map(([v,l])=>`<option value="${esc(v)}"${v===cur?' selected':''}>${esc(l)}</option>`).join('');}

  function renderMarkers(){
    if(!map)return;
    markers.forEach(m=>map.removeLayer(m));
    gapCircles.forEach(c=>map.removeLayer(c));
    markers=[];gapCircles=[];
    let hosps=DATA.hospitals;
    if(f.city)hosps=hosps.filter(h=>h.city===f.city);
    let plotted=0;
    hosps.forEach(h=>{
      const coords=(window.PINCODES||{})[h.pinCode];
      if(!coords)return;
      const color=getColor(h);
      const jLat=coords.lat+(Math.random()-.5)*.003,jLng=coords.lng+(Math.random()-.5)*.003;
      const m=L.circleMarker([jLat,jLng],{radius:7,fillColor:color,color:'#fff',weight:1.5,opacity:1,fillOpacity:.85});
      m.bindPopup(buildPopup(h),{maxWidth:280});m.addTo(map);markers.push(m);plotted++;
      if(h.activeStatus==='Active'&&(f.insurer||f.tpa)){
        const iE=f.insurer?h.insurer[f.insurer]===true:true;
        const tE=f.tpa?h.tpa[f.tpa]===true:true;
        if(!iE||!tE){const c=L.circle([jLat,jLng],{radius:10000,color:'#94a3b8',weight:1.5,dashArray:'6 4',fillColor:'transparent',opacity:.5});c.addTo(map);gapCircles.push(c);}
      }
    });
    if(f.city&&markers.length){const g=L.featureGroup(markers);map.fitBounds(g.getBounds().pad(.25));}
    const el=document.getElementById('p3-marker-count');if(el)el.textContent=`${plotted} hospitals plotted`;
    updateCounts();
  }

  function getColor(h){
    const isA=h.activeStatus==='Active';
    const iE=f.insurer?(h.insurer[f.insurer]===true):Object.values(h.insurer).some(Boolean);
    const tE=f.tpa?(h.tpa[f.tpa]===true):Object.values(h.tpa).some(Boolean);
    const isE=(f.insurer||f.tpa)?((!f.insurer||iE)&&(!f.tpa||tE)):(iE||tE);
    if(isA&&isE)return'#10b981';if(isA&&!isE)return'#f97316';return'#ef4444';
  }

  function updateCounts(){
    let hosps=DATA.hospitals;
    if(f.city)hosps=hosps.filter(h=>h.city===f.city);
    const active=hosps.filter(h=>h.activeStatus==='Active').length;
    const el1=document.getElementById('p3-active-count'),el2=document.getElementById('p3-inactive-count'),el3=document.getElementById('p3-total-count');
    if(el1)el1.textContent=active;if(el2)el2.textContent=hosps.length-active;if(el3)el3.textContent=hosps.length;
  }

  function buildPopup(h){
    const iE=f.insurer?(h.insurer[f.insurer]===true):null;
    const tE=f.tpa?(h.tpa[f.tpa]===true):null;
    const covMax=DATA.insurerNames.length+DATA.tpaNames.length||1;
    const cov=Math.round((Object.values(h.insurer).filter(Boolean).length+Object.values(h.tpa).filter(Boolean).length)/covMax*100);
    const hc=h.aspData||[],valid=hc.filter(c=>c.approvalAmount!==null);
    const avg=valid.length?Math.round(valid.reduce((s,c)=>s+c.approvalAmount,0)/valid.length):null;
    return`<div style="font-family:'DM Sans',sans-serif;min-width:210px;">
      <div style="font-weight:700;font-size:13px;margin-bottom:3px;">${esc(h.hospitalName)}</div>
      <div style="font-size:11px;color:#6b7280;margin-bottom:6px;">${esc(h.area)}</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:5px;">
        <span style="color:${h.activeStatus==='Active'?'#059669':'#dc2626'};font-weight:600;font-size:12px;">${h.activeStatus}</span>
        <span style="color:#6b7280;font-size:12px;">Coverage: ${cov}%</span>
      </div>
      ${avg?`<div style="font-size:12px;color:#059669;margin-bottom:4px;">Avg ASP: <strong>₹${avg.toLocaleString('en-IN')}</strong> (${hc.length} cases)</div>`:''}
      ${f.insurer?`<div style="font-size:12px;margin-top:3px;">${esc(f.insurer)}: <strong style="color:${iE?'#059669':'#dc2626'}">${iE?'✓ Empanelled':'✗ Not empanelled'}</strong></div>`:''}
      ${f.tpa?`<div style="font-size:12px;margin-top:2px;">${esc(f.tpa)}: <strong style="color:${tE?'#059669':'#dc2626'}">${tE?'✓ Empanelled':'✗ Not empanelled'}</strong></div>`:''}
    </div>`;
  }

  // Supply gap with its own city+insurer+tpa filters
  function renderGaps(){
    const el=document.getElementById('p3-gaps');if(!el)return;
    let hosps=DATA.hospitals;
    if(gf.city)hosps=hosps.filter(h=>h.city===gf.city);
    const active=hosps.filter(h=>h.activeStatus==='Active');
    const total=active.length;
    if(!total){el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:8px;">No active hospitals for selected city.</div>';return;}
    const ins=gf.insurer?[gf.insurer]:DATA.insurerNames;
    const gaps=ins.map(i=>{const emp=active.filter(h=>h.insurer[i]===true);return{insurer:i,emp:emp.length,total,gap:total-emp.length,pct:Math.round((emp.length/total)*100)};}).sort((a,b)=>a.pct-b.pct);
    const city=gf.city?cityLabel(gf.city):'All Cities';
    const avgCov=Math.round(gaps.reduce((s,g)=>s+g.pct,0)/gaps.length);
    el.innerHTML=`<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px;">
      <div class="metric-card metric-green" style="padding:10px 14px;min-width:100px;"><div class="metric-label">Active</div><div class="metric-value" style="font-size:20px;">${total}</div><div class="metric-sub">${city}</div></div>
      <div class="metric-card metric-teal" style="padding:10px 14px;min-width:100px;"><div class="metric-label">Avg Coverage</div><div class="metric-value" style="font-size:20px;">${avgCov}%</div></div>
      <div class="metric-card" style="padding:10px 14px;min-width:100px;"><div class="metric-label">Insurers</div><div class="metric-value" style="font-size:20px;">${gaps.length}</div></div>
    </div>
    <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;">Coverage by Insurer — ${city} (worst first)</div>
    ${gaps.map(g=>`<div class="gap-row"><div class="gap-label" title="${esc(g.insurer)}">${esc(shortIns(g.insurer))}</div><div class="gap-bar-wrap"><div class="gap-bar-fill ${g.pct<30?'gap-bad':''}" style="width:${g.pct}%"></div></div><div class="gap-numbers">${g.emp}/${g.total} <span style="color:${g.gap>0?'var(--red)':'var(--green)'}">${g.gap>0?'(−'+g.gap+')':'✓'}</span></div></div>`).join('')}
    <div style="margin-top:10px;font-size:11px;color:var(--text3);">Red = &lt;30% coverage — gap your team needs to work on.</div>`;
  }

  function bindEvents(){
    on('p3-insurer','change',e=>{f.insurer=e.target.value;if(mapInited){renderMarkers();}});
    on('p3-tpa','change',e=>{f.tpa=e.target.value;if(mapInited){renderMarkers();}});
    on('p3-clear','click',()=>{f.city='';f.insurer='';f.tpa='';renderCityPills();renderFilters();if(mapInited){renderMarkers();map.setView([20.5937,78.9629],5);}});
    on('gap-city','change',e=>{gf.city=e.target.value;renderGaps();});
    on('gap-insurer','change',e=>{gf.insurer=e.target.value;renderGaps();});
    on('gap-tpa','change',e=>{gf.tpa=e.target.value;renderGaps();});
    on('gap-reset','click',()=>{gf.city='';gf.insurer='';gf.tpa='';renderFilters();renderGaps();});
  }

  function on(id,ev,fn){document.getElementById(id)?.addEventListener(ev,fn);}
  function cityLabel(v){if(!v)return'All Cities';return CONFIG.CITY_DISPLAY[v]||v.split(' ').map(w=>w[0].toUpperCase()+w.slice(1)).join(' ');}
  function shortIns(n){return n.replace('Health Insurance','Hlth Ins').replace('General Insurance','Gen Ins').replace('Co. Ltd.','').replace('Company Ltd.','').replace('Insurance','Ins').trim().slice(0,28);}
  function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

  return{init,initMap};
})();
