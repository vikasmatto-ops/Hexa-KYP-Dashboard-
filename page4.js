// ============================================================
// PAGE 4 — INSIGHTS v3
// ============================================================
const PAGE4 = (() => {
  const RELEVANT_CATS = ['UROLOGY','PROCTOLOGY','LAPAROSCOPY','AESTHETICS / PLASTIC SURGERY','KIDNEY STONE','VASCULAR'];
  const CAT_COLORS = {
    'UROLOGY':'#0ea5e9','PROCTOLOGY':'#10b981','LAPAROSCOPY':'#8b5cf6',
    'AESTHETICS / PLASTIC SURGERY':'#f97316','KIDNEY STONE':'#eab308',
    'VASCULAR':'#ec4899','OTHERS':'#94a3b8'
  };
  const CAT_SHORT = {
    'UROLOGY':'Urology','PROCTOLOGY':'Proctology','LAPAROSCOPY':'Laparoscopy',
    'AESTHETICS / PLASTIC SURGERY':'Aesthetics','KIDNEY STONE':'Kidney Stone',
    'VASCULAR':'Vascular','OTHERS':'Others'
  };
  const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let charts = {};
  let lapMode = 'quarterly';
  let aspView = 'ytd';
  let selectedCats = [...RELEVANT_CATS, 'OTHERS']; // multi-select state
  let f = { city: '' };

  // ── Helpers ──────────────────────────────────────────────
  function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
  function fmtASP(n){if(!n&&n!==0)return'—';if(n>=100000)return'₹'+(n/100000).toFixed(2)+'L';if(n>=1000)return'₹'+Math.round(n).toLocaleString('en-IN');return'₹'+Math.round(n);}
  function avg(arr){return arr.length?arr.reduce((s,v)=>s+v,0)/arr.length:0;}
  function destroyChart(k){if(charts[k]){try{charts[k].destroy();}catch(e){}delete charts[k];}}
  function cityLabel(c){return CONFIG.CITY_DISPLAY[c]||c.charAt(0).toUpperCase()+c.slice(1);}
  function caseDate(c){return c.dodParsed||c.doaParsed||null;}
  function catColor(cat){return CAT_COLORS[(cat||'').toUpperCase()]||'#94a3b8';}
  function normCat(cat){
    const u=(cat||'').toUpperCase().trim();
    return RELEVANT_CATS.includes(u)?u:'OTHERS';
  }

  // ── Get cases, normalise category, apply filters ─────────
  function getAllCases(){
    return DATA.aspCases.filter(c=>{
      const dt=caseDate(c);
      if(!dt||c.approvalAmount===null)return false;
      if(f.city&&c.city!==f.city)return false;
      return true;
    }).map(c=>{
      const dt=caseDate(c);
      const cat=normCat(c.category);
      return{...c,dt,cat,ym:`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`,
        yr:String(dt.getFullYear()),mo:dt.getMonth()+1,
        qtr:`${dt.getFullYear()} Q${Math.ceil((dt.getMonth()+1)/3)}`};
    }).filter(c=>selectedCats.includes(c.cat));
  }

  function classifyLap(proc){
    const p=(proc||'').toLowerCase();
    if(p.includes('balloon')||p.includes('intragastric'))return'Balloon';
    if(p.includes('sleeve'))return'Sleeve';
    if(p.includes('cholecystectomy')||p.includes('chole'))return'Cholecystectomy';
    return'Other Hernia/Lap';
  }

  // ═══════════════════════════════════════════════════════
  // MULTI-SELECT CATEGORY FILTER
  // ═══════════════════════════════════════════════════════
  function renderCatFilter(){
    const el=document.getElementById('p4-cat-filter');if(!el)return;
    const allCats=[...RELEVANT_CATS,'OTHERS'];
    el.innerHTML=allCats.map(cat=>`
      <label style="display:flex;align-items:center;gap:5px;cursor:pointer;padding:4px 10px;border-radius:20px;border:1.5px solid ${selectedCats.includes(cat)?catColor(cat):'var(--border)'};background:${selectedCats.includes(cat)?catColor(cat)+'18':'transparent'};font-size:11px;font-weight:600;white-space:nowrap;transition:all .15s;">
        <input type="checkbox" value="${cat}" ${selectedCats.includes(cat)?'checked':''} style="display:none;" onchange="PAGE4._toggleCat('${cat}')">
        <span style="width:7px;height:7px;border-radius:50%;background:${catColor(cat)};display:inline-block;"></span>
        ${esc(CAT_SHORT[cat]||cat)}
      </label>`).join('');
  }

  function _toggleCat(cat){
    if(selectedCats.includes(cat)){
      if(selectedCats.length===1)return; // must keep at least one
      selectedCats=selectedCats.filter(c=>c!==cat);
    } else {
      selectedCats=[...selectedCats,cat];
    }
    renderCatFilter();
    renderAll();
  }

  // ═══════════════════════════════════════════════════════
  // 1. SUMMARY CARDS
  // ═══════════════════════════════════════════════════════
  function renderSummary(){
    const el=document.getElementById('p4-summary');if(!el)return;
    const cases=getAllCases();
    if(!cases.length){el.innerHTML='';return;}
    const months=[...new Set(cases.map(c=>c.ym))].sort();
    if(months.length<2){el.innerHTML='';return;}
    const cur=months[months.length-1],prev=months[months.length-2];
    const curC=cases.filter(c=>c.ym===cur),prevC=cases.filter(c=>c.ym===prev);
    const curASP=avg(curC.map(c=>c.approvalAmount)),prevASP=avg(prevC.map(c=>c.approvalAmount));
    const aspChg=prevASP?((curASP-prevASP)/prevASP*100):0;
    const volChg=prevC.length?((curC.length-prevC.length)/prevC.length*100):0;
    const [cyr,cmo]=cur.split('-'),curLabel=MN[+cmo-1]+"'"+cyr.slice(2);
    const [pyr,pmo]=prev.split('-'),prevLabel=MN[+pmo-1]+"'"+pyr.slice(2);

    const catShare=(arr)=>{const tot=arr.length||1;const m={};arr.forEach(c=>{m[c.cat]=(m[c.cat]||0)+1;});return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,v/tot*100]));};
    const cs=catShare(curC),ps=catShare(prevC);
    const allCats=[...new Set([...Object.keys(cs),...Object.keys(ps)])];
    let topGainer=null,topLoser=null,maxG=-999,maxL=999;
    allCats.forEach(cat=>{const diff=(cs[cat]||0)-(ps[cat]||0);if(diff>maxG){maxG=diff;topGainer={cat,diff,cur:cs[cat]||0,prev:ps[cat]||0};}if(diff<maxL){maxL=diff;topLoser={cat,diff,cur:cs[cat]||0,prev:ps[cat]||0};}});

    const curBal=curC.filter(c=>c.cat==='LAPAROSCOPY'&&classifyLap(c.procedureRaw)==='Balloon').length;
    const prevBal=prevC.filter(c=>c.cat==='LAPAROSCOPY'&&classifyLap(c.procedureRaw)==='Balloon').length;
    const curSlv=curC.filter(c=>c.cat==='LAPAROSCOPY'&&classifyLap(c.procedureRaw)==='Sleeve').length;
    const prevSlv=prevC.filter(c=>c.cat==='LAPAROSCOPY'&&classifyLap(c.procedureRaw)==='Sleeve').length;

    el.innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px;">
      <div style="background:var(--surface2);border-radius:var(--r);padding:14px;border-left:4px solid ${aspChg<0?'#ef4444':'#10b981'};">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;">📊 Avg ASP (${curLabel})</div>
        <div style="font-size:22px;font-weight:800;color:var(--text);margin:4px 0;">${fmtASP(Math.round(curASP))}</div>
        <div style="font-size:12px;color:${aspChg<0?'#ef4444':'#10b981'};font-weight:600;">${aspChg>=0?'▲':'▼'} ${Math.abs(aspChg).toFixed(1)}% vs ${prevLabel}</div>
      </div>
      <div style="background:var(--surface2);border-radius:var(--r);padding:14px;border-left:4px solid #0ea5e9;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;">📈 Cases (${curLabel})</div>
        <div style="font-size:22px;font-weight:800;color:var(--text);margin:4px 0;">${curC.length}</div>
        <div style="font-size:12px;color:${volChg>=0?'#10b981':'#ef4444'};font-weight:600;">${volChg>=0?'▲':'▼'} ${Math.abs(volChg).toFixed(1)}% vs ${prevLabel}</div>
      </div>
      ${topGainer?`<div style="background:var(--surface2);border-radius:var(--r);padding:14px;border-left:4px solid #f97316;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;">🔺 Fastest Growing</div>
        <div style="font-size:15px;font-weight:800;color:var(--text);margin:4px 0;">${esc(CAT_SHORT[topGainer.cat]||topGainer.cat)}</div>
        <div style="font-size:12px;color:var(--text2);">${topGainer.prev.toFixed(1)}% → <strong>${topGainer.cur.toFixed(1)}%</strong> share</div>
      </div>`:''}
      ${topLoser?`<div style="background:var(--surface2);border-radius:var(--r);padding:14px;border-left:4px solid #8b5cf6;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;">🔻 Biggest Decline</div>
        <div style="font-size:15px;font-weight:800;color:var(--text);margin:4px 0;">${esc(CAT_SHORT[topLoser.cat]||topLoser.cat)}</div>
        <div style="font-size:12px;color:var(--text2);">${topLoser.prev.toFixed(1)}% → <strong>${topLoser.cur.toFixed(1)}%</strong> share</div>
      </div>`:''}
    </div>
    <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:var(--r);padding:12px 16px;border:1px solid #bae6fd;">
      <div style="font-size:12px;font-weight:700;color:#0c4a6e;margin-bottom:4px;">📋 Key Insight — ${curLabel}</div>
      <div style="font-size:12px;color:#0c4a6e;line-height:1.7;">
        ASP <strong>${aspChg<0?'fell':'rose'} ${Math.abs(aspChg).toFixed(1)}%</strong> from ${prevLabel} (${fmtASP(Math.round(prevASP))}) to ${curLabel} (${fmtASP(Math.round(curASP))}).
        ${topGainer?.cat==='UROLOGY'?` Urology now represents <strong>${topGainer.cur.toFixed(0)}%</strong> of all cases (avg ASP ~₹38-42K), displacing higher-value categories.`:''}
        ${(curBal<prevBal||curSlv<prevSlv)?` Bariatric cases dropped — Balloon <strong>${prevBal}→${curBal}</strong>, Sleeve <strong>${prevSlv}→${curSlv}</strong> (avg ASP ₹3-4.5L each).`:''}
      </div>
    </div>`;
  }

  // ═══════════════════════════════════════════════════════
  // 2. CATEGORY MIX — Cards with sparkline (last 7 months)
  // ═══════════════════════════════════════════════════════
  function renderCategoryMix(){
    const el=document.getElementById('p4-cat-grid');if(!el)return;
    const cases=getAllCases();
    if(!cases.length){el.innerHTML='<div style="color:var(--text3);padding:14px;">No data</div>';return;}

    const allMonths=[...new Set(cases.map(c=>c.ym))].sort().slice(-7);
    const latestMo=allMonths[allMonths.length-1];
    const prevMo=allMonths[allMonths.length-2]||latestMo;

    const cats=[...new Set(cases.filter(c=>allMonths.includes(c.ym)).map(c=>c.cat))];
    const catData=cats.map(cat=>{
      const latestCases=cases.filter(c=>c.cat===cat&&c.ym===latestMo);
      const prevCases=cases.filter(c=>c.cat===cat&&c.ym===prevMo);
      const latestTotal=cases.filter(c=>c.ym===latestMo).length||1;
      const prevTotal=cases.filter(c=>c.ym===prevMo).length||1;
      const latestShare=latestCases.length/latestTotal*100;
      const prevShare=prevCases.length/prevTotal*100;
      const latestASP=avg(latestCases.map(c=>c.approvalAmount));
      const prevASP=avg(prevCases.map(c=>c.approvalAmount));

      // sparkline: monthly share
      const spark=allMonths.map(mo=>{
        const mc=cases.filter(c=>c.cat===cat&&c.ym===mo).length;
        const tc=cases.filter(c=>c.ym===mo).length||1;
        return Math.round(mc/tc*100);
      });
      const maxSp=Math.max(...spark,1);
      const pts=spark.map((v,i)=>`${i*(100/(spark.length-1||1))},${40-v/maxSp*34}`).join(' ');
      const sparkSVG=`<svg viewBox="0 0 100 42" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:40px;display:block;">
        <polyline points="${pts}" fill="none" stroke="${catColor(cat)}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${spark.map((v,i)=>`<circle cx="${i*(100/(spark.length-1||1))}" cy="${40-v/maxSp*34}" r="2.5" fill="${catColor(cat)}"/>
          <text x="${i*(100/(spark.length-1||1))}" y="${40-v/maxSp*34-5}" text-anchor="middle" font-size="7.5" fill="${catColor(cat)}" font-weight="700">${v}%</text>`).join('')}
      </svg>`;

      return{cat,latestShare,prevShare,shareChg:latestShare-prevShare,latestASP,aspChg:prevASP?((latestASP-prevASP)/prevASP*100):0,spark,sparkSVG,total:cases.filter(c=>c.cat===cat&&allMonths.includes(c.ym)).length};
    }).sort((a,b)=>b.total-a.total);

    el.innerHTML=catData.map(d=>`
      <div style="background:var(--surface2);border-radius:var(--r);padding:12px 14px;border-top:3px solid ${catColor(d.cat)};">
        <div style="font-size:11px;font-weight:800;color:var(--text);margin-bottom:8px;">${esc(CAT_SHORT[d.cat]||d.cat)}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:6px;">
          <div><div style="font-size:24px;font-weight:900;color:${catColor(d.cat)};line-height:1;">${d.latestShare.toFixed(1)}%</div><div style="font-size:9px;color:var(--text3);">of cases</div></div>
          <div style="text-align:right;"><div style="font-size:13px;font-weight:700;color:var(--text);">${fmtASP(Math.round(d.latestASP))}</div><div style="font-size:9px;color:var(--text3);">avg ASP</div></div>
        </div>
        <div style="margin-bottom:8px;">${d.sparkSVG}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;border-top:1px solid var(--border);padding-top:6px;">
          <span style="color:${d.shareChg>=0?'#10b981':'#ef4444'};font-weight:700;">${d.shareChg>=0?'▲':'▼'} ${Math.abs(d.shareChg).toFixed(1)}% share</span>
          <span style="color:${d.aspChg>=0?'#10b981':'#ef4444'};font-weight:700;">${d.aspChg>=0?'▲':'▼'} ${Math.abs(d.aspChg).toFixed(1)}% ASP</span>
        </div>
      </div>`).join('');
  }

  // ═══════════════════════════════════════════════════════
  // 3. LAPAROSCOPY BREAKDOWN — quarterly default, labels
  // ═══════════════════════════════════════════════════════
  function renderLapBreakdown(){
    destroyChart('lapBreak');
    const ctx=document.getElementById('chart-lap-break');if(!ctx)return;
    const lap=DATA.aspCases.filter(c=>{
      const dt=caseDate(c);
      return dt&&c.approvalAmount!==null&&c.category.toUpperCase()==='LAPAROSCOPY'&&(!f.city||c.city===f.city);
    }).map(c=>{
      const dt=caseDate(c);
      return{...c,dt,ym:`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`,qtr:`${dt.getFullYear()} Q${Math.ceil((dt.getMonth()+1)/3)}`,yr:String(dt.getFullYear())};
    });
    if(!lap.length){ctx.parentElement.innerHTML='<div style="color:var(--text3);font-size:13px;padding:14px;">No laparoscopy data.</div>';return;}

    const getPk=c=>lapMode==='yearly'?c.yr:lapMode==='quarterly'?c.qtr:c.ym;
    const fmtPk=k=>{if(lapMode!=='monthly')return k;const[yr,mo]=k.split('-');return MN[+mo-1]+"'"+yr.slice(2);};
    const periods=[...new Set(lap.map(getPk))].sort();
    const subs=['Balloon','Sleeve','Cholecystectomy','Other Hernia/Lap'];
    const subColors=['#0ea5e9','#8b5cf6','#10b981','#94a3b8'];
    const byP={};
    lap.forEach(c=>{const pk=getPk(c);const sub=classifyLap(c.procedureRaw);if(!byP[pk])byP[pk]={};if(!byP[pk][sub])byP[pk][sub]={n:0,amt:[]};byP[pk][sub].n++;byP[pk][sub].amt.push(c.approvalAmount);});

    // Only show labels if periods <= 12 to avoid clutter
    const showLabels=periods.length<=12;

    charts.lapBreak=new Chart(ctx,{type:'bar',
      data:{labels:periods.map(fmtPk),datasets:subs.map((sub,i)=>({
        label:sub,data:periods.map(p=>byP[p]?.[sub]?.n||0),
        backgroundColor:subColors[i]+'cc',borderColor:subColors[i],borderWidth:1,borderRadius:3,maxBarThickness:28
      }))},
      options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:showLabels?22:8}},interaction:{mode:'index',intersect:false},
        plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:10,font:{size:10}}},
          tooltip:{callbacks:{afterLabel:c=>{const pd=byP[periods[c.dataIndex]]?.[subs[c.datasetIndex]];return pd&&pd.amt.length?'Avg ASP: '+fmtASP(Math.round(avg(pd.amt))):'';}}}},
        scales:{x:{stacked:true,ticks:{font:{size:9},maxRotation:45},grid:{display:false}},
          y:{stacked:true,ticks:{font:{size:10},stepSize:5},grid:{color:'#f0f0f0'},beginAtZero:true,title:{display:true,text:'Cases',font:{size:11}}}}},
      plugins:[{id:'lapLbls',afterDatasetsDraw(chart){
        if(!showLabels)return;
        const ctx2=chart.ctx;
        // Only label the top segment of each stacked bar (total)
        const totals=periods.map(p=>subs.reduce((s,sub)=>s+(byP[p]?.[sub]?.n||0),0));
        chart.getDatasetMeta(subs.length-1).data.forEach((bar,j)=>{
          const v=totals[j];if(!v)return;
          ctx2.save();ctx2.font='bold 9px DM Sans,sans-serif';ctx2.fillStyle='#334155';
          ctx2.textAlign='center';ctx2.textBaseline='bottom';ctx2.fillText(v,bar.x,bar.y-4);ctx2.restore();
        });
      }}]
    });
  }

  // ═══════════════════════════════════════════════════════
  // 4. ASP COMPARISON — 2024 vs 2025 vs 2026
  // ═══════════════════════════════════════════════════════
  function renderASPChange(){
    destroyChart('aspChange');
    const ctx=document.getElementById('chart-asp-change');if(!ctx)return;
    const allC=getAllCases();
    const years=['2024','2025','2026'];
    const yearColors={'2024':'#94a3b8','2025':'#0ea5e9','2026':'#10b981'};

    // Detect actual data range
    const mo2024=[...new Set(allC.filter(c=>c.yr==='2024').map(c=>c.mo))].sort((a,b)=>a-b);
    const mo2025=[...new Set(allC.filter(c=>c.yr==='2025').map(c=>c.mo))].sort((a,b)=>a-b);
    const mo2026=[...new Set(allC.filter(c=>c.yr==='2026').map(c=>c.mo))].sort((a,b)=>a-b);
    const latestMo2026=mo2026[mo2026.length-1]||7;
    const firstMo2024=mo2024[0]||4; // April

    // YTD: same months across years — use Apr-latestMo2026 for 2024, same for others
    // Full: each year's actual range
    const getRange=(yr)=>{
      if(aspView==='ytd'){
        // Common window: Apr to latestMo2026 (since 2024 only has Apr+)
        return Array.from({length:latestMo2026-firstMo2024+1},(_,i)=>i+firstMo2024);
      }
      if(yr==='2024')return mo2024;
      if(yr==='2025')return mo2025;
      return mo2026;
    };

    // X-axis: month labels (Apr...Jul for YTD, Jan...Dec for full)
    const xRange=getRange('2026');
    const xLabels=xRange.map(m=>MN[m-1]);

    const datasets=years.filter(yr=>{
      // Only include 2024 if it has data
      if(yr==='2024')return mo2024.length>0;
      return true;
    }).map(yr=>{
      const range=getRange(yr);
      const data=xRange.map(xMo=>{
        // For YTD: map by position. For full: map by same month number
        const targetMo=aspView==='ytd'?xMo:xMo;
        if(!range.includes(targetMo))return null;
        const yrC=allC.filter(c=>c.yr===yr&&c.mo===targetMo);
        return yrC.length>=3?Math.round(avg(yrC.map(c=>c.approvalAmount))):null;
      });
      return{label:yr,data,borderColor:yearColors[yr],backgroundColor:yearColors[yr]+(yr==='2026'?'18':'00'),borderWidth:2.5,pointRadius:5,pointBackgroundColor:yearColors[yr],tension:.3,fill:yr==='2026',spanGaps:false};
    });

    // Compute y-axis range
    const allVals=datasets.flatMap(d=>d.data.filter(v=>v!==null));
    const minV=allVals.length?Math.min(...allVals):0;
    const maxV=allVals.length?Math.max(...allVals):100000;
    const pad=(maxV-minV)*0.15||10000;

    charts.aspChange=new Chart(ctx,{type:'line',
      data:{labels:xLabels,datasets},
      options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:28}},interaction:{mode:'index',intersect:false},
        plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:10,font:{size:11}}},
          tooltip:{callbacks:{label:c=>c.dataset.label+': '+(c.raw?fmtASP(c.raw):'No data')}}},
        scales:{
          x:{ticks:{font:{size:10}},grid:{display:false},title:{display:true,text:aspView==='ytd'?`Month (${MN[firstMo2024-1]}–${MN[latestMo2026-1]}) — same window across years`:'All months',font:{size:10}}},
          y:{min:Math.round((minV-pad)/5000)*5000,max:Math.round((maxV+pad)/5000)*5000,
            ticks:{font:{size:10},callback:v=>fmtASP(v)},grid:{color:'#f0f0f0'},
            title:{display:true,text:'Avg ASP',font:{size:11}}}}},
      plugins:[{id:'aspLbls',afterDatasetsDraw(chart){
        chart.data.datasets.forEach((ds,di)=>{
          chart.getDatasetMeta(di).data.forEach((pt,j)=>{
            const v=ds.data[j];if(!v)return;
            const ctx2=chart.ctx;ctx2.save();
            ctx2.font='bold 9px DM Sans,sans-serif';ctx2.fillStyle=ds.borderColor;
            ctx2.textAlign='center';ctx2.textBaseline='bottom';
            ctx2.fillText(fmtASP(v).replace('₹',''),pt.x,pt.y-7);ctx2.restore();
          });
        });
      }}]
    });

    // Category comparison table
    const tblEl=document.getElementById('p4-asp-table');if(!tblEl)return;
    const yrCols=years.filter(yr=>yr!=='2024'||mo2024.length>0);
    const cats=[...new Set(allC.map(c=>c.cat))].sort((a,b)=>{
      return allC.filter(c=>c.cat===b).length-allC.filter(c=>c.cat===a).length;
    });

    tblEl.innerHTML=`<div style="font-size:11px;color:var(--text3);margin:10px 0 6px;font-weight:600;">CATEGORY BREAKDOWN — ${aspView==='ytd'?`YTD ${MN[firstMo2024-1]}–${MN[latestMo2026-1]}`:' Full period'}</div>
    <table style="width:100%;font-size:11px;border-collapse:collapse;">
      <thead><tr style="background:var(--surface2);">
        <th style="text-align:left;padding:6px 8px;">Category</th>
        ${yrCols.map(yr=>`<th style="text-align:right;padding:6px 8px;">Cases '${yr.slice(2)}</th><th style="text-align:right;padding:6px 8px;">Avg ASP '${yr.slice(2)}</th>`).join('')}
        <th style="text-align:right;padding:6px 8px;color:#0ea5e9;">ASP Δ '25→'26</th>
        <th style="text-align:right;padding:6px 8px;color:#f97316;">Share Δ '25→'26</th>
      </tr></thead>
      <tbody>${cats.map(cat=>{
        const yrD=yrCols.map(yr=>{
          const range=getRange(yr);
          const yc=allC.filter(c=>c.cat===cat&&c.yr===yr&&range.includes(c.mo));
          const allYC=allC.filter(c=>c.yr===yr&&range.includes(c.mo));
          return{n:yc.length,asp:yc.length?Math.round(avg(yc.map(c=>c.approvalAmount))):0,share:allYC.length?yc.length/allYC.length*100:0};
        });
        const d25=yrD[yrCols.indexOf('2025')]||{asp:0,share:0};
        const d26=yrD[yrCols.indexOf('2026')]||{asp:0,share:0};
        const aspChg=d25.asp?((d26.asp-d25.asp)/d25.asp*100):0;
        const shChg=d26.share-d25.share;
        return`<tr style="border-bottom:1px solid var(--border);">
          <td style="padding:5px 8px;font-weight:600;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${catColor(cat)};margin-right:5px;vertical-align:middle;"></span>${esc(CAT_SHORT[cat]||cat)}</td>
          ${yrD.map(d=>`<td style="text-align:right;padding:5px 8px;">${d.n||'—'}</td><td style="text-align:right;padding:5px 8px;font-weight:600;">${d.asp?fmtASP(d.asp):'—'}</td>`).join('')}
          <td style="text-align:right;padding:5px 8px;font-weight:700;color:${aspChg>2?'#10b981':aspChg<-2?'#ef4444':'var(--text2)'};">${d25.asp&&d26.asp?(aspChg>=0?'+':'')+aspChg.toFixed(1)+'%':'—'}</td>
          <td style="text-align:right;padding:5px 8px;font-weight:700;color:${shChg>0.5?'#f97316':shChg<-0.5?'#8b5cf6':'var(--text2)'};">${d25.share&&d26.share?(shChg>=0?'+':'')+shChg.toFixed(1)+'%':'—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  // ═══════════════════════════════════════════════════════
  // RENDER ALL + EVENTS
  // ═══════════════════════════════════════════════════════
  function renderAll(){renderSummary();renderCategoryMix();renderLapBreakdown();renderASPChange();}

  function renderFilters(){
    const cities=[['','All Cities'],...getCities().map(c=>[c,cityLabel(c)])];
    const el=document.getElementById('p4-city');
    if(el)el.innerHTML=cities.map(([v,l])=>`<option value="${esc(v)}"${v===f.city?' selected':''}>${esc(l)}</option>`).join('');
  }

  function bindEvents(){
    document.getElementById('p4-city')?.addEventListener('change',e=>{f.city=e.target.value;renderAll();});
    document.getElementById('p4-clear')?.addEventListener('click',()=>{
      f.city='';selectedCats=[...RELEVANT_CATS,'OTHERS'];lapMode='quarterly';aspView='ytd';
      renderFilters();renderCatFilter();
      document.getElementById('btn-lap-q')?.classList.add('active');
      document.getElementById('btn-lap-m')?.classList.remove('active');
      document.getElementById('btn-lap-y')?.classList.remove('active');
      document.getElementById('p4-asp-ytd')?.classList.add('active');
      document.getElementById('p4-asp-full')?.classList.remove('active');
      renderAll();
    });
    document.getElementById('btn-lap-m')?.addEventListener('click',()=>{lapMode='monthly';setLapBtn('btn-lap-m');renderLapBreakdown();});
    document.getElementById('btn-lap-q')?.addEventListener('click',()=>{lapMode='quarterly';setLapBtn('btn-lap-q');renderLapBreakdown();});
    document.getElementById('btn-lap-y')?.addEventListener('click',()=>{lapMode='yearly';setLapBtn('btn-lap-y');renderLapBreakdown();});
    document.getElementById('p4-asp-ytd')?.addEventListener('click',()=>{aspView='ytd';document.getElementById('p4-asp-ytd').classList.add('active');document.getElementById('p4-asp-full').classList.remove('active');renderASPChange();});
    document.getElementById('p4-asp-full')?.addEventListener('click',()=>{aspView='full';document.getElementById('p4-asp-full').classList.add('active');document.getElementById('p4-asp-ytd').classList.remove('active');renderASPChange();});
  }

  function setLapBtn(activeId){['btn-lap-m','btn-lap-q','btn-lap-y'].forEach(id=>{document.getElementById(id)?.classList.toggle('active',id===activeId);});}

  function init(){renderFilters();renderCatFilter();renderAll();bindEvents();onDataRefresh(()=>{renderFilters();renderCatFilter();renderAll();});}
  return{init,_toggleCat};
})();
