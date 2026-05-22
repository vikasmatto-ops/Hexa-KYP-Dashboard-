// PAGE 2 — ASP Analytics
const PAGE2 = (() => {
  const f = {year:'',quarter:'',month:'',city:'',category:'',insurer:'',tpa:'',hospital:''};
  const th = {city:'',category:'',insurer:'',tpa:'',year:'',month:'',top:'10',mode:'volume'};
  let charts = {}, trendMode = 'monthly';

  function init() {
    renderFilters();
    renderAll();
    bindEvents();
    onDataRefresh(()=>{ renderFilters(); renderAll(); });
  }

  function getFiltered() {
    let cases = DATA.aspCases;
    if (f.year)     cases = cases.filter(c=>c.doaParsed&&c.doaParsed.getFullYear()===parseInt(f.year));
    if (f.quarter)  cases = cases.filter(c=>c.doaParsed&&Math.ceil((c.doaParsed.getMonth()+1)/3)===parseInt(f.quarter));
    if (f.month)    cases = cases.filter(c=>c.doaParsed&&String(c.doaParsed.getMonth()+1).padStart(2,'0')===f.month);
    if (f.city)     cases = cases.filter(c=>c.city===f.city);
    if (f.category) cases = cases.filter(c=>c.category.toLowerCase()===f.category.toLowerCase());
    if (f.insurer)  cases = cases.filter(c=>c.insuranceName===f.insurer);
    if (f.tpa)      cases = cases.filter(c=>c.tpaName===f.tpa);
    if (f.hospital) cases = cases.filter(c=>c.hospitalName===f.hospital);
    return cases;
  }

  function renderAll() {
    const cases = getFiltered();
    renderMetrics(cases);
    renderTopRec(cases);
    renderTrend(cases);
    renderTiers(cases);
    renderTopHospitals();
    renderCityChart(cases);
    renderInsurerChart(cases);
    populateComparators();
  }

  function renderMetrics(cases) {
    const valid = cases.filter(c=>c.approvalAmount!==null);
    const avgASP = valid.length?Math.round(valid.reduce((s,c)=>s+c.approvalAmount,0)/valid.length):null;
    setText('m-cases', cases.length.toLocaleString('en-IN'));
    setText('m-asp', avgASP?'₹'+fmtN(avgASP):'—');
    setText('m-cats', new Set(DATA.aspCases.map(c=>c.category).filter(Boolean)).size);
    setText('m-ins', new Set(DATA.aspCases.map(c=>c.insuranceName).filter(Boolean)).size);
    setText('m-cities', new Set(DATA.aspCases.map(c=>c.city).filter(Boolean)).size);
  }

  // Top recommended hospital card (big blue card from screenshot)
  function renderTopRec(cases) {
    const el = document.getElementById('p2-top-rec'); if (!el) return;
    const valid = cases.filter(c=>c.approvalAmount!==null);
    if (!valid.length) { el.innerHTML=`<div style="color:var(--text3);font-size:13px;padding:20px;">No data for current filters.</div>`; return; }
    const byHosp = {};
    valid.forEach(c=>{ if(!byHosp[c.hospitalName]) byHosp[c.hospitalName]={cases:[],city:c.city,cat:c.category,ins:c.insuranceName}; byHosp[c.hospitalName].cases.push(c.approvalAmount); });
    const best = Object.entries(byHosp).map(([name,d])=>({name,avg:Math.round(d.cases.reduce((s,v)=>s+v,0)/d.cases.length),count:d.cases.length,city:d.city,cat:d.cat,ins:d.ins})).sort((a,b)=>b.avg-a.avg)[0];
    const hNet = DATA.hospitals.find(h=>h.hospitalName.toLowerCase().trim()===best.name.toLowerCase().trim());
    el.innerHTML=`
      <div style="background:linear-gradient(135deg,#0284c7,#0ea5e9);border-radius:var(--r);padding:20px;color:#fff;min-height:200px;">
        <div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;opacity:.8;margin-bottom:6px;">⭐ TOP RECOMMENDED HOSPITAL</div>
        <div style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;opacity:.7;margin-bottom:10px;">⭐ TOP RECOMMENDED</div>
        <div style="background:rgba(255,255,255,.15);display:inline-block;padding:2px 10px;border-radius:10px;font-size:12px;font-weight:600;margin-bottom:10px;">${best.count} cases</div>
        <div style="font-size:22px;font-weight:800;margin-bottom:6px;letter-spacing:-.3px;">${esc(best.name.split(',')[0])}</div>
        <div style="font-size:12px;opacity:.8;margin-bottom:12px;">${cityLabel(best.city)} • ${esc(best.cat||'')} ${best.ins?'• '+esc(best.ins):''}</div>
        <div style="font-size:32px;font-weight:800;letter-spacing:-1px;margin-bottom:8px;">₹${fmtN(best.avg)}</div>
        ${hNet?`<div style="display:flex;align-items:center;gap:6px;font-size:13px;"><span style="width:8px;height:8px;border-radius:50%;background:${hNet.activeStatus==='Active'?'#6ee7b7':'#fca5a5'};display:inline-block;"></span>${hNet.activeStatus}</div>`:''}
      </div>`;
  }

  // ASP Trend
  function renderTrend(cases) {
    const validCases = cases.filter(c=>c.approvalAmount!==null&&c.doaParsed);
    const grouped = {};
    validCases.forEach(c=>{
      const d=c.doaParsed;
      let key;
      if (trendMode==='yearly') key=`${d.getFullYear()}`;
      else if (trendMode==='quarterly') key=`${d.getFullYear()} Q${Math.ceil((d.getMonth()+1)/3)}`;
      else key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if(!grouped[key]) grouped[key]=[];
      grouped[key].push(c.approvalAmount);
    });
    const sorted=Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b));
    const labels=sorted.map(([k])=>{
      if(trendMode==='yearly')return k;
      if(trendMode==='quarterly')return k;
      const [yr,mo]=k.split('-');
      return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mo-1]+' \''+yr.slice(2);
    });
    const data=sorted.map(([,v])=>Math.round(v.reduce((s,x)=>s+x,0)/v.length));
    const counts=sorted.map(([,v])=>v.length);

    destroyChart('trend');
    const ctx=document.getElementById('chart-trend'); if(!ctx)return;
    charts.trend=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Avg ASP',data,borderColor:'#0ea5e9',backgroundColor:'rgba(14,165,233,.1)',borderWidth:2.5,pointRadius:3,tension:.3,fill:true,pointBackgroundColor:'#0ea5e9'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`₹${fmtN(c.raw)}`,afterLabel:c=>`Cases: ${counts[c.dataIndex]}`}}},scales:{x:{ticks:{font:{size:10},maxRotation:35},grid:{display:false}},y:{ticks:{font:{size:10},callback:v=>'₹'+fmtN(v)},grid:{color:'#f0f0f0'}}}}});
  }

  function setTrendMode(mode) {
    trendMode=mode;
    ['monthly','quarterly','yearly'].forEach(m=>{
      const el=document.getElementById('trend-'+m);
      if(el){el.classList.toggle('active',m===mode);}
    });
    renderTrend(getFiltered());
  }

  // Tiers
  function renderTiers(cases) {
    const el=document.getElementById('p2-tiers'); if(!el)return;
    const cityAvg={};
    const byCity=groupBy(cases.filter(c=>c.approvalAmount!==null),c=>c.city);
    Object.entries(byCity).forEach(([city,hc])=>{ cityAvg[city]=avg(hc.map(c=>c.approvalAmount)); });
    const byHosp=groupBy(cases,c=>c.hospitalName);
    const maxVol=Math.max(...Object.values(byHosp).map(x=>x.length),1);
    const maxCov=DATA.insurerNames.length+DATA.tpaNames.length||1;
    const scored=Object.entries(byHosp).map(([name,hc])=>{
      const valid=hc.filter(c=>c.approvalAmount!==null);
      if(!valid.length)return null;
      const aspVal=avg(valid.map(c=>c.approvalAmount));
      const city=hc[0].city;
      const aspScore=Math.min(100,(aspVal/(cityAvg[city]||aspVal))*50+50);
      const hNet=DATA.hospitals.find(h=>h.hospitalName.toLowerCase().trim()===name.toLowerCase().trim());
      const empCount=hNet?(Object.values(hNet.insurer).filter(Boolean).length+Object.values(hNet.tpa).filter(Boolean).length):0;
      const covScore=(empCount/maxCov)*100;
      const volScore=(hc.length/maxVol)*100;
      const score=Math.round(aspScore*CONFIG.SCORE_WEIGHT_ASP+covScore*CONFIG.SCORE_WEIGHT_COVERAGE+volScore*CONFIG.SCORE_WEIGHT_VOLUME);
      let tier=null;
      if(hc.length>=CONFIG.TIER_MIN_CASES){if(score>=CONFIG.TIER_GOLD)tier='Gold';else if(score>=CONFIG.TIER_SILVER)tier='Silver';else if(score>=CONFIG.TIER_BRONZE)tier='Bronze';}
      else if(hc.length<=CONFIG.UNDERUTILIZED_MAX_CASES&&aspScore>=CONFIG.UNDERUTILIZED_MIN_ASP_SCORE)tier='Underutilized';
      return{name,aspVal,vol:hc.length,score,tier,city};
    }).filter(Boolean);
    const tiers=['Gold','Silver','Bronze','Underutilized'];
    const grouped={};
    tiers.forEach(t=>grouped[t]=scored.filter(h=>h.tier===t).sort((a,b)=>b.score-a.score));
    if(!scored.length){el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:8px;">No data.</div>';return;}
    el.innerHTML=tiers.map(tier=>{
      const hosps=grouped[tier];
      if(!hosps.length)return'';
      return`<div style="margin-bottom:16px;"><div style="font-size:11px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;">${tier} — ${hosps.length} hospital${hosps.length>1?'s':''}</div>
      <div class="tier-grid">${hosps.slice(0,12).map(h=>`<div class="tier-card"><div class="tier-card-header"><span class="tier-badge tier-${tier.toLowerCase()}">${tier}</span><span class="tier-card-name">${esc(h.name.split(',')[0])}</span></div><div class="tier-card-meta"><span class="tier-card-asp">₹${fmtN(h.aspVal)} ASP</span><span class="tier-card-vol">${h.vol} cases</span><span class="tier-card-score">Score: ${h.score}</span></div></div>`).join('')}</div></div>`;
    }).join('');
  }

  // Top hospitals ranking table (matching screenshot exactly)
  function renderTopHospitals() {
    const el=document.getElementById('th-results'); if(!el)return;
    let cases=DATA.aspCases;
    if(th.city)     cases=cases.filter(c=>c.city===th.city);
    if(th.category) cases=cases.filter(c=>c.category.toLowerCase()===th.category.toLowerCase());
    if(th.insurer)  cases=cases.filter(c=>c.insuranceName===th.insurer);
    if(th.tpa)      cases=cases.filter(c=>c.tpaName===th.tpa);
    if(th.year)     cases=cases.filter(c=>c.doaParsed&&c.doaParsed.getFullYear()===parseInt(th.year));
    if(th.month)    cases=cases.filter(c=>c.doaParsed&&String(c.doaParsed.getMonth()+1).padStart(2,'0')===th.month);
    const topN=parseInt(th.top)||10;

    // Build per hospital+category+insurer combinations (like screenshot)
    const combos={};
    cases.forEach(c=>{
      if(!c.approvalAmount)return;
      const key=`${c.hospitalName}||${c.category}||${c.insuranceName}`;
      if(!combos[key]) combos[key]={hosp:c.hospitalName,city:c.city,cat:c.category,ins:c.insuranceName,tpa:c.tpaName,asp:[],count:0};
      combos[key].asp.push(c.approvalAmount);
      combos[key].count++;
    });
    const rows=Object.values(combos).map(d=>({...d,avgAsp:Math.round(d.asp.reduce((s,v)=>s+v,0)/d.asp.length),total:Math.round(d.asp.reduce((s,v)=>s+v,0))}));
    rows.sort((a,b)=>th.mode==='asp'?b.avgAsp-a.avgAsp:b.count-a.count);
    const top=rows.slice(0,topN);
    const maxAsp=top.length?top.reduce((m,r)=>Math.max(m,r.avgAsp),0):1;
    const maxVol=top.length?top.reduce((m,r)=>Math.max(m,r.count),0):1;
    const hospCount=new Set(rows.map(r=>r.hosp)).size;
    const totalCases=rows.reduce((s,r)=>s+r.count,0);
    const avgASPAll=rows.length?Math.round(rows.reduce((s,r)=>s+r.avgAsp,0)/rows.length):0;
    const summary=document.getElementById('th-summary');
    if(summary) summary.textContent=`${hospCount} hospitals • ${totalCases.toLocaleString('en-IN')} total cases • Avg ASP: ₹${fmtN(avgASPAll)} across filtered data`;

    if(!top.length){el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:16px;">No data for current filters.</div>';return;}

    // Hospital rankings table matching screenshot
    el.innerHTML=`<div style="font-size:13px;font-weight:700;margin-bottom:8px;">Hospital Rankings <span style="font-weight:400;color:var(--text3);">(${rows.length} combinations • ${totalCases.toLocaleString()} cases)</span></div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:12px;">Each row = unique Hospital + Category + Insurer combination • Sorted by highest Avg ASP</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead><tr style="background:var(--surface2);">
        <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);">#</th>
        <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);">Hospital</th>
        <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);">City</th>
        <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);">Category</th>
        <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);">Insurer</th>
        <th style="padding:10px 12px;text-align:left;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);">Avg ASP</th>
        <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);">Cases</th>
        <th style="padding:10px 12px;text-align:center;font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);">Status</th>
      </tr></thead>
      <tbody>${top.map((r,i)=>{
        const hNet=DATA.hospitals.find(h=>h.hospitalName.toLowerCase().trim()===r.hosp.toLowerCase().trim());
        const pct=Math.round((r.avgAsp/maxAsp)*100);
        return`<tr style="border-bottom:1px solid var(--border);">
          <td style="padding:10px 12px;font-size:13px;font-weight:700;color:var(--text3);">${i+1}</td>
          <td style="padding:10px 12px;"><a class="rank-hosp-link" onclick="PAGE1.openPanel('${r.hosp.replace(/'/g,"\\'")}');">${esc(r.hosp.split(',')[0])}</a></td>
          <td style="padding:10px 12px;font-size:12px;color:var(--text2);">${cityLabel(r.city)}</td>
          <td style="padding:10px 12px;font-size:11px;font-weight:600;color:var(--text2);text-transform:uppercase;letter-spacing:.3px;">${esc(r.cat)}</td>
          <td style="padding:10px 12px;font-size:12px;color:var(--text2);">${esc(r.ins)}${r.tpa&&r.tpa!=='In-House / Self'?`<div style="font-size:11px;color:var(--text3);">TPA: ${esc(r.tpa)}</div>`:''}</td>
          <td style="padding:10px 12px;"><div class="rank-bar-wrap"><div class="rank-bar-bg"><div class="rank-bar-fill" style="width:${pct}%"></div></div><span class="rank-asp">₹${fmtN(r.avgAsp)}</span></div></td>
          <td style="padding:10px 12px;text-align:center;font-size:13px;font-weight:600;color:var(--teal);">${r.count}</td>
          <td style="padding:10px 12px;text-align:center;">${hNet?`<span class="status-badge ${hNet.activeStatus==='Active'?'status-active':'status-inactive'}">${hNet.activeStatus}</span>`:`<span class="status-unknown">Unknown</span>`}</td>
        </tr>`;}).join('')}</tbody>
    </table>`;
  }

  function setThMode(mode) {
    th.mode=mode;
    document.getElementById('th-by-vol')?.classList.toggle('btn-teal',mode==='volume');
    document.getElementById('th-by-vol')?.classList.toggle('btn-outline',mode!=='volume');
    document.getElementById('th-by-asp')?.classList.toggle('btn-teal',mode==='asp');
    document.getElementById('th-by-asp')?.classList.toggle('btn-outline',mode!=='asp');
    renderTopHospitals();
  }

  // Charts
  function renderCityChart(cases) {
    const byCity=groupBy(cases.filter(c=>c.approvalAmount!==null),c=>c.city);
    const entries=Object.entries(byCity).map(([city,hc])=>({city:cityLabel(city),val:Math.round(avg(hc.map(c=>c.approvalAmount)))})).sort((a,b)=>b.val-a.val);
    destroyChart('city');
    const ctx=document.getElementById('chart-city'); if(!ctx)return;
    charts.city=new Chart(ctx,{type:'bar',data:{labels:entries.map(e=>e.city),datasets:[{label:'Avg ASP',data:entries.map(e=>e.val),backgroundColor:'#0ea5e9',borderRadius:4}]},options:barOpts('₹')});
  }

  function renderInsurerChart(cases) {
    const byIns=groupBy(cases.filter(c=>c.approvalAmount!==null),c=>c.insuranceName);
    const entries=Object.entries(byIns).filter(([,v])=>v.length>=3).map(([ins,hc])=>({ins:shortIns(ins),val:Math.round(avg(hc.map(c=>c.approvalAmount)))})).sort((a,b)=>b.val-a.val).slice(0,15);
    destroyChart('insurer');
    const ctx=document.getElementById('chart-insurer'); if(!ctx)return;
    charts.insurer=new Chart(ctx,{type:'bar',data:{labels:entries.map(e=>e.ins),datasets:[{label:'Avg ASP',data:entries.map(e=>e.val),backgroundColor:'#10b981',borderRadius:4}]},options:{...barOpts('₹'),indexAxis:'y'}});
  }

  // Auto top-3 comparator
  function populateComparators() {
    const cities=[['','All Cities'],...getCities().map(c=>[c,cityLabel(c)])];
    const cats=[['','All Categories'],...CONFIG.ACTIVE_CATEGORIES.map(c=>[c,c])];
    const insurers=[['','All Insurers'],...getInsurers().map(i=>[i,i])];
    const tpas=[['','All TPAs'],...getTPAs().map(t=>[t,t])];
    fillSel('comp-city',cities,'');
    fillSel('comp-insurer',insurers,'');
    fillSel('comp-tpa',tpas,'');
    fillSel('comp-cat',cats,'');
    fillSel('comp-proc',[['','All Procedures'],...getProceduresForCategory('').map(p=>[p,p])],'');
    // Top hospitals sub-filters
    const thYrs=[['','All Years'],...[...new Set(DATA.aspCases.map(c=>c.doaParsed&&c.doaParsed.getFullYear()).filter(Boolean))].sort().map(y=>[y,String(y)])];
    const thMos=[['','All Months'],['01','Jan'],['02','Feb'],['03','Mar'],['04','Apr'],['05','May'],['06','Jun'],['07','Jul'],['08','Aug'],['09','Sep'],['10','Oct'],['11','Nov'],['12','Dec']];
    fillSel('th-year',thYrs,'');fillSel('th-month',thMos,'');
    fillSel('th-city',cities,'');fillSel('th-category',cats,'');
    fillSel('th-insurer',insurers,'');fillSel('th-tpa',tpas,'');
  }

  function runComparison() {
    const city    =document.getElementById('comp-city')?.value;
    const insurer =document.getElementById('comp-insurer')?.value;
    const tpa     =document.getElementById('comp-tpa')?.value;
    const category=document.getElementById('comp-cat')?.value;
    const procedure=document.getElementById('comp-proc')?.value;
    const el=document.getElementById('comp-result'); if(!el) return;

    const recs=getRecommendations({city,insurer,tpa,category,procedure,topN:3});
    if(!recs.length){el.innerHTML='<div style="color:var(--text3);font-size:13px;padding:12px 0;">No hospitals found for this combination. Try fewer filters.</div>';return;}

    // Get full stats for each
    const stats=recs.map(r=>{
      const result=compareHospitals(r.hospitalName,recs[0].hospitalName,{category,procedure});
      return result.a.hospitalName===r.hospitalName?result.a:result.b;
    });

    const maxASP=Math.max(...stats.map(s=>s.avgASP||0),1);
    const desc=[city?cityLabel(city):'',insurer||'',tpa||'',category||'',procedure||''].filter(Boolean).join(' · ');

    el.innerHTML=`
      <div style="font-size:12px;color:var(--text3);margin-bottom:12px;">Top 3 hospitals for: <strong style="color:var(--text);">${esc(desc)||'All combinations'}</strong></div>
      <div class="comp3-grid">
        ${stats.map((s,i)=>{
          const isBest=i===0;
          const medal=i===0?'🥇':i===1?'🥈':'🥉';
          const hNet=DATA.hospitals.find(h=>h.hospitalName.toLowerCase().trim()===s.hospitalName.toLowerCase().trim());
          return`<div class="comp3-card ${isBest?'best':''}">
            <div class="comp3-rank" style="color:${isBest?'rgba(255,255,255,.7)':'var(--text3)'};">${medal}</div>
            <div class="comp3-name" style="color:${isBest?'#fff':'var(--text)'};">${esc(s.hospitalName.split(',')[0])}</div>
            <div class="comp3-asp" style="color:${isBest?'#fff':'var(--teal)'};">₹${fmtN(s.avgASP)}</div>
            <div class="comp3-stat"><span style="color:${isBest?'rgba(255,255,255,.7)':'var(--text2)'};">Total cases</span><span style="font-weight:700;color:${isBest?'#fff':'var(--text)'};">${s.totalCases}</span></div>
            <div class="comp3-stat"><span style="color:${isBest?'rgba(255,255,255,.7)':'var(--text2)'};">Avg ASP</span><span style="font-weight:700;color:${isBest?'#fff':'var(--teal)'};">${s.avgASP?'₹'+fmtN(s.avgASP):'—'}</span></div>
            <div class="comp3-stat"><span style="color:${isBest?'rgba(255,255,255,.7)':'var(--text2)'};">Business score</span><span style="font-weight:700;color:${isBest?'#fff':'var(--text)'};">${s.businessScore?'₹'+fmtN(s.businessScore):'—'}</span></div>
            <div class="comp3-stat"><span style="color:${isBest?'rgba(255,255,255,.7)':'var(--text2)'};">Last case</span><span style="font-weight:600;font-size:11px;color:${isBest?'#fff':'var(--text)'};">${s.lastCaseDate||'—'}</span></div>
            ${hNet?`<div style="margin-top:8px;"><span class="status-badge ${hNet.activeStatus==='Active'?'status-active':'status-inactive'}">${hNet.activeStatus}</span></div>`:''}
            <div style="margin-top:8px;">
              ${s.topProcedures.slice(0,2).map(p=>`<div style="font-size:10px;color:${isBest?'rgba(255,255,255,.7)':'var(--text3)'};padding:2px 0;">${esc(p.procedure)} (${p.count})</div>`).join('')}
            </div>
          </div>`;
        }).join('')}
      </div>`;
  }

  function renderFilters() {
    const yrs=[['','All Years'],...[...new Set(DATA.aspCases.map(c=>c.doaParsed&&c.doaParsed.getFullYear()).filter(Boolean))].sort().reverse().map(y=>[y,String(y)])];
    const mos=[['','All Months'],['01','January'],['02','February'],['03','March'],['04','April'],['05','May'],['06','June'],['07','July'],['08','August'],['09','September'],['10','October'],['11','November'],['12','December']];
    fillSel('p2-year',yrs,f.year);
    fillSel('p2-month',mos,f.month);
    fillSel('p2-city',[['','All Cities'],...getCities().map(c=>[c,cityLabel(c)])],f.city);
    fillSel('p2-category',[['','All Categories'],...CONFIG.ACTIVE_CATEGORIES.map(c=>[c,c])],f.category);
    fillSel('p2-insurer',[['','All Insurers'],...getInsurers().map(i=>[i,i])],f.insurer);
    fillSel('p2-tpa',[['','All TPAs'],...getTPAs().map(t=>[t,t])],f.tpa);
    fillSel('p2-hospital',[['','All Hospitals'],...[...new Set(DATA.aspCases.map(c=>c.hospitalName))].sort().map(h=>[h,h])],f.hospital);
  }

  function fillSel(id,opts,cur){const el=document.getElementById(id);if(!el)return;el.innerHTML=opts.map(([v,l])=>`<option value="${esc(String(v))}"${String(v)===String(cur)?' selected':''}>${esc(l)}</option>`).join('');}

  function bindEvents() {
    ['year','quarter','month','city','category','insurer','tpa','hospital'].forEach(k=>{
      document.getElementById('p2-'+k)?.addEventListener('change',e=>{f[k]=e.target.value;renderAll();});
    });
    on('p2-clear',()=>{Object.keys(f).forEach(k=>f[k]='');renderFilters();renderAll();});
    on('comp-go',runComparison);
    on('comp-cat','change',()=>{
      const cat=document.getElementById('comp-cat')?.value;
      fillSel('comp-proc',[['','All Procedures'],...getProceduresForCategory(cat).map(p=>[p,p])],'');
    });
    ['th-city','th-category','th-insurer','th-tpa','th-year','th-month','th-top'].forEach(id=>{
      const key=id.replace('th-','');
      document.getElementById(id)?.addEventListener('change',e=>{th[key]=e.target.value;renderTopHospitals();});
    });
    on('th-reset',()=>{Object.keys(th).forEach(k=>{if(k!=='mode'&&k!=='top')th[k]='';});renderFilters();populateComparators();renderTopHospitals();});
  }

  function on(id,ev,fn){if(typeof ev==='function'){fn=ev;document.getElementById(id)?.addEventListener('click',fn);}else{document.getElementById(id)?.addEventListener(ev,fn);}}
  function barOpts(px){return{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>px+fmtN(c.raw)}}},scales:{x:{ticks:{font:{size:10},maxRotation:35},grid:{display:false}},y:{ticks:{font:{size:10},callback:v=>px+fmtN(v)},grid:{color:'#f0f0f0'}}}};}
  function destroyChart(k){if(charts[k]){charts[k].destroy();delete charts[k];}}
  function groupBy(arr,fn){return arr.reduce((acc,item)=>{const key=fn(item);if(!acc[key])acc[key]=[];acc[key].push(item);return acc;},{});}
  function avg(arr){return arr.length?arr.reduce((s,v)=>s+v,0)/arr.length:0;}
  function fmtN(n){if(!n&&n!==0)return'—';if(n>=100000)return(n/100000).toFixed(1)+'L';if(n>=1000)return Math.round(n).toLocaleString('en-IN');return Math.round(n).toString();}
  function esc(s){if(!s)return'';return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function setText(id,v){const el=document.getElementById(id);if(el)el.textContent=v;}
  function shortIns(n){return n.replace('Health Insurance','Hlth Ins').replace('General Insurance','Gen Ins').replace('Co. Ltd.','').replace('Company Ltd.','').replace('Insurance','Ins').trim().slice(0,22);}

  return { init, setTrendMode, setThMode };
})();
