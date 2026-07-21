// ============================================================
// PAGE 4 — INSIGHTS v2
// ============================================================
const PAGE4 = (() => {
  const f = { city: '', category: '', compare: 'monthly' };
  let charts = {};
  const CAT_COLORS = {
    'UROLOGY':'#0ea5e9','PROCTOLOGY':'#10b981','LAPAROSCOPY':'#8b5cf6',
    'AESTHETICS / PLASTIC SURGERY':'#f97316','VASCULAR':'#ec4899',
    'KIDNEY STONE':'#eab308','ENT':'#06b6d4','GENERAL SURGERY':'#ef4444',
    'GYNAECOLOGY':'#84cc16','ORTHOPAEDICS':'#64748b','OTHERS':'#94a3b8'
  };
  const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
  function fmtN(n){if(!n&&n!==0)return'—';if(n>=10000000)return'₹'+(n/10000000).toFixed(2)+'Cr';if(n>=100000)return'₹'+(n/100000).toFixed(1)+'L';if(n>=1000)return'₹'+Math.round(n).toLocaleString('en-IN');return'₹'+Math.round(n);}
  function fmtNum(n){if(!n&&n!==0)return'—';if(n>=10000000)return(n/10000000).toFixed(2)+'Cr';if(n>=100000)return(n/100000).toFixed(1)+'L';if(n>=1000)return Math.round(n).toLocaleString('en-IN');return Math.round(n).toString();}
  function avg(arr){return arr.length?arr.reduce((s,v)=>s+v,0)/arr.length:0;}
  function destroyChart(k){if(charts[k]){try{charts[k].destroy();}catch(e){}delete charts[k];}}
  function fillSel(id,opts,cur){const el=document.getElementById(id);if(!el)return;el.innerHTML=opts.map(([v,l])=>`<option value="${esc(String(v))}"${String(v)===String(cur)?' selected':''}>${esc(l)}</option>`).join('');}
  function cityLabel(c){return CONFIG.CITY_DISPLAY[c]||c.charAt(0).toUpperCase()+c.slice(1);}
  function caseDate(c){return c.dodParsed||c.doaParsed||null;}
  function catColor(cat){return CAT_COLORS[(cat||'').toUpperCase()]||'#94a3b8';}

  function getAllCases(cityOverride, catOverride){
    const uc = cityOverride!==undefined ? cityOverride : f.city;
    const ucat = catOverride!==undefined ? catOverride : f.category;
    return DATA.aspCases.filter(c=>{
      const dt=caseDate(c);
      if(!dt||c.approvalAmount===null)return false;
      if(uc&&c.city!==uc)return false;
      if(ucat&&c.category.toLowerCase()!==ucat.toLowerCase())return false;
      return true;
    }).map(c=>{
      const dt=caseDate(c);
      return{...c,dt,ym:`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`,yr:String(dt.getFullYear()),mo:dt.getMonth()+1,qtr:`${dt.getFullYear()} Q${Math.ceil((dt.getMonth()+1)/3)}`};
    });
  }

  function classifyLap(proc){
    const p=(proc||'').toLowerCase();
    if(p.includes('balloon')||p.includes('intragastric'))return'Balloon';
    if(p.includes('sleeve'))return'Sleeve';
    if(p.includes('cholecystectomy')||p.includes('chole'))return'Cholecystectomy';
    return'Other Hernia/Lap';
  }

  // ═══════════════════════════════════════════════════════
  // 1. SUMMARY CARDS
  // ═══════════════════════════════════════════════════════
  function renderSummary(){
    const el=document.getElementById('p4-summary');if(!el)return;
    const cases=getAllCases();
    if(!cases.length){el.innerHTML='';return;}
    const periods=[...new Set(cases.map(c=>c.ym))].sort();
    if(periods.length<2){el.innerHTML='';return;}
    const cur=periods[periods.length-1],prev=periods[periods.length-2];
    const curC=cases.filter(c=>c.ym===cur),prevC=cases.filter(c=>c.ym===prev);
    const curASP=avg(curC.map(c=>c.approvalAmount)),prevASP=avg(prevC.map(c=>c.approvalAmount));
    const aspChg=prevASP?((curASP-prevASP)/prevASP*100):0;
    const volChg=prevC.length?((curC.length-prevC.length)/prevC.length*100):0;
    const [cyr,cmo]=cur.split('-');const curLabel=MN[+cmo-1]+"'"+cyr.slice(2);
    const [pyr,pmo]=prev.split('-');const prevLabel=MN[+pmo-1]+"'"+pyr.slice(2);

    // Category share shifts
    const catShare=(arr)=>{const tot=arr.length;const m={};arr.forEach(c=>{m[c.category]=(m[c.category]||0)+1;});return Object.fromEntries(Object.entries(m).map(([k,v])=>[k,v/tot*100]));};
    const cs=catShare(curC),ps=catShare(prevC);
    const allCats=[...new Set([...Object.keys(cs),...Object.keys(ps)])];
    let topGainer=null,topLoser=null,maxG=-999,maxL=999;
    allCats.forEach(cat=>{const diff=(cs[cat]||0)-(ps[cat]||0);if(diff>maxG){maxG=diff;topGainer={cat,diff,cur:cs[cat]||0,prev:ps[cat]||0};}if(diff<maxL){maxL=diff;topLoser={cat,diff,cur:cs[cat]||0,prev:ps[cat]||0};}});

    // Lap bariatric check
    const curBal=curC.filter(c=>c.category.toUpperCase()==='LAPAROSCOPY'&&classifyLap(c.procedureRaw)==='Balloon').length;
    const prevBal=prevC.filter(c=>c.category.toUpperCase()==='LAPAROSCOPY'&&classifyLap(c.procedureRaw)==='Balloon').length;
    const curSlv=curC.filter(c=>c.category.toUpperCase()==='LAPAROSCOPY'&&classifyLap(c.procedureRaw)==='Sleeve').length;
    const prevSlv=prevC.filter(c=>c.category.toUpperCase()==='LAPAROSCOPY'&&classifyLap(c.procedureRaw)==='Sleeve').length;

    el.innerHTML=`
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:10px;">
      <div style="background:var(--surface2);border-radius:var(--r);padding:14px;border-left:4px solid ${aspChg<0?'#ef4444':'#10b981'};">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;">📊 Avg ASP (${curLabel})</div>
        <div style="font-size:22px;font-weight:800;color:var(--text);margin:4px 0;">${fmtN(Math.round(curASP))}</div>
        <div style="font-size:12px;color:${aspChg<0?'#ef4444':'#10b981'};font-weight:600;">${aspChg>=0?'▲':'▼'} ${Math.abs(aspChg).toFixed(1)}% vs ${prevLabel}</div>
      </div>
      <div style="background:var(--surface2);border-radius:var(--r);padding:14px;border-left:4px solid #0ea5e9;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;">📈 Cases (${curLabel})</div>
        <div style="font-size:22px;font-weight:800;color:var(--text);margin:4px 0;">${curC.length}</div>
        <div style="font-size:12px;color:${volChg>=0?'#10b981':'#ef4444'};font-weight:600;">${volChg>=0?'▲':'▼'} ${Math.abs(volChg).toFixed(1)}% vs ${prevLabel}</div>
      </div>
      ${topGainer?`<div style="background:var(--surface2);border-radius:var(--r);padding:14px;border-left:4px solid #f97316;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;">🔺 Fastest Growing</div>
        <div style="font-size:15px;font-weight:800;color:var(--text);margin:4px 0;">${esc(topGainer.cat)}</div>
        <div style="font-size:12px;color:var(--text2);">${topGainer.prev.toFixed(1)}% → <strong>${topGainer.cur.toFixed(1)}%</strong> share</div>
      </div>`:''}
      ${topLoser?`<div style="background:var(--surface2);border-radius:var(--r);padding:14px;border-left:4px solid #8b5cf6;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;letter-spacing:.3px;">🔻 Biggest Decline</div>
        <div style="font-size:15px;font-weight:800;color:var(--text);margin:4px 0;">${esc(topLoser.cat)}</div>
        <div style="font-size:12px;color:var(--text2);">${topLoser.prev.toFixed(1)}% → <strong>${topLoser.cur.toFixed(1)}%</strong> share</div>
      </div>`:''}
    </div>
    <div style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:var(--r);padding:12px 16px;border:1px solid #bae6fd;">
      <div style="font-size:12px;font-weight:700;color:#0c4a6e;margin-bottom:4px;">📋 Key Insight — ${curLabel}</div>
      <div style="font-size:12px;color:#0c4a6e;line-height:1.7;">
        ASP <strong>${aspChg<0?'fell':'rose'} ${Math.abs(aspChg).toFixed(1)}%</strong> from ${prevLabel} to ${curLabel}.
        ${topGainer&&topGainer.cat.toUpperCase()==='UROLOGY'?`<strong>Urology</strong> now represents <strong>${topGainer.cur.toFixed(0)}%</strong> of all cases (₹38-42K avg ASP), displacing higher-value categories.`:''}
        ${(curBal<prevBal||curSlv<prevSlv)?` Bariatric cases dropped: Balloon <strong>${prevBal}→${curBal}</strong>, Sleeve <strong>${prevSlv}→${curSlv}</strong> — each at ₹3-4.5L avg ASP, this is a significant revenue drain.`:''}
      </div>
    </div>`;
  }

  // ═══════════════════════════════════════════════════════
  // 2. CATEGORY MIX — Cards with sparkline
  // ═══════════════════════════════════════════════════════
  function renderCategoryMix(){
    const el=document.getElementById('p4-cat-grid');if(!el)return;
    const cases=getAllCases();
    if(!cases.length){el.innerHTML='<div style="color:var(--text3);padding:14px;">No data</div>';return;}

    // Get last 6 months
    const allMonths=[...new Set(cases.map(c=>c.ym))].sort().slice(-7);
    const total=cases.filter(c=>allMonths.includes(c.ym)).length||1;
    const latestMo=allMonths[allMonths.length-1];
    const prevMo=allMonths[allMonths.length-2]||latestMo;

    // Per category stats
    const cats=[...new Set(cases.map(c=>c.category))];
    const catData=cats.map(cat=>{
      const catCases=cases.filter(c=>c.category===cat&&allMonths.includes(c.ym));
      const latestCases=cases.filter(c=>c.category===cat&&c.ym===latestMo);
      const prevCases=cases.filter(c=>c.category===cat&&c.ym===prevMo);
      const latestShare=latestCases.length/(cases.filter(c=>c.ym===latestMo).length||1)*100;
      const prevShare=prevCases.length/(cases.filter(c=>c.ym===prevMo).length||1)*100;
      const latestASP=avg(latestCases.map(c=>c.approvalAmount));
      const prevASP=avg(prevCases.map(c=>c.approvalAmount));
      const shareChg=latestShare-prevShare;
      const aspChg=prevASP?((latestASP-prevASP)/prevASP*100):0;
      // Sparkline: share per month
      const spark=allMonths.map(mo=>{const mc=cases.filter(c=>c.category===cat&&c.ym===mo).length;const tc=cases.filter(c=>c.ym===mo).length||1;return Math.round(mc/tc*1000)/10;});
      return{cat,total:catCases.length,latestShare,prevShare,shareChg,latestASP,prevASP,aspChg,spark,latestCount:latestCases.length};
    }).sort((a,b)=>b.total-a.total);

    el.innerHTML=catData.map(d=>{
      const color=catColor(d.cat);
      const maxSpark=Math.max(...d.spark,1);
      const sparkSVG=`<svg viewBox="0 0 120 32" xmlns="http://www.w3.org/2000/svg" style="width:120px;height:32px;display:block;">
        <polyline points="${d.spark.map((v,i)=>`${i*(120/(d.spark.length-1||1))},${32-v/maxSpark*28}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        ${d.spark.map((v,i)=>`<circle cx="${i*(120/(d.spark.length-1||1))}" cy="${32-v/maxSpark*28}" r="2.5" fill="${color}"/>`).join('')}
        ${d.spark.map((v,i)=>`<text x="${i*(120/(d.spark.length-1||1))}" y="${32-v/maxSpark*28-5}" text-anchor="middle" font-size="7" fill="${color}" font-weight="600">${v>0?v.toFixed(0)+'%':''}</text>`).join('')}
      </svg>`;
      return`<div style="background:var(--surface2);border-radius:var(--r);padding:12px 14px;border-top:3px solid ${color};">
        <div style="font-size:11px;font-weight:700;color:var(--text);margin-bottom:8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${esc(d.cat)}">${esc(d.cat)}</div>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px;">
          <div>
            <div style="font-size:22px;font-weight:800;color:${color};line-height:1;">${d.latestShare.toFixed(1)}%</div>
            <div style="font-size:10px;color:var(--text3);">of cases</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:13px;font-weight:700;color:var(--text);">${fmtN(Math.round(d.latestASP))}</div>
            <div style="font-size:10px;color:var(--text3);">avg ASP</div>
          </div>
        </div>
        <div style="margin-bottom:6px;">${sparkSVG}</div>
        <div style="display:flex;justify-content:space-between;font-size:10px;">
          <span style="color:${d.shareChg>=0?'#10b981':'#ef4444'};font-weight:600;">${d.shareChg>=0?'▲':'▼'} ${Math.abs(d.shareChg).toFixed(1)}% share</span>
          <span style="color:${d.aspChg>=0?'#10b981':'#ef4444'};font-weight:600;">${d.aspChg>=0?'▲':'▼'} ${Math.abs(d.aspChg).toFixed(1)}% ASP</span>
        </div>
      </div>`;
    }).join('');
  }

  // ═══════════════════════════════════════════════════════
  // 3. LAPAROSCOPY BREAKDOWN — line chart with data labels
  // ═══════════════════════════════════════════════════════
  function renderLapBreakdown(){
    destroyChart('lapBreak');
    const ctx=document.getElementById('chart-lap-break');if(!ctx)return;
    const lap=getAllCases('','').filter(c=>c.category.toUpperCase()==='LAPAROSCOPY');
    if(!lap.length){ctx.parentElement.innerHTML='<div style="color:var(--text3);font-size:13px;padding:14px;">No laparoscopy data.</div>';return;}

    let periods=[...new Set(lap.map(c=>c.ym))].sort();
    if(f.compare==='quarterly')periods=[...new Set(lap.map(c=>c.qtr))].sort();
    if(f.compare==='yearly')periods=[...new Set(lap.map(c=>c.yr))].sort();
    const getPk=(c)=>f.compare==='yearly'?c.yr:f.compare==='quarterly'?c.qtr:c.ym;

    const subs=['Balloon','Sleeve','Cholecystectomy','Other Hernia/Lap'];
    const subColors=['#0ea5e9','#8b5cf6','#10b981','#94a3b8'];
    const byPeriod={};
    lap.forEach(c=>{const pk=getPk(c);const sub=classifyLap(c.procedureRaw);if(!byPeriod[pk])byPeriod[pk]={};if(!byPeriod[pk][sub])byPeriod[pk][sub]={n:0,amt:[]};byPeriod[pk][sub].n++;byPeriod[pk][sub].amt.push(c.approvalAmount);});

    const fmtPeriod=(k)=>{if(f.compare!=='monthly')return k;const[yr,mo]=k.split('-');return MN[+mo-1]+"'"+yr.slice(2);};

    const datasets=subs.map((sub,i)=>({
      label:sub,data:periods.map(p=>byPeriod[p]?.[sub]?.n||0),
      borderColor:subColors[i],backgroundColor:subColors[i]+'18',borderWidth:2.5,pointRadius:5,pointBackgroundColor:subColors[i],tension:.3,fill:false
    }));

    charts.lapBreak=new Chart(ctx,{type:'line',data:{labels:periods.map(fmtPeriod),datasets},options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:28}},interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:10,font:{size:10}}},tooltip:{callbacks:{afterLabel:c=>{const pd=byPeriod[periods[c.dataIndex]]?.[subs[c.datasetIndex]];return pd&&pd.amt.length?'Avg ASP: '+fmtN(Math.round(avg(pd.amt))):''}}}},scales:{x:{ticks:{font:{size:9},maxRotation:45},grid:{display:false}},y:{ticks:{font:{size:10}},grid:{color:'#f0f0f0'},beginAtZero:true,title:{display:true,text:'Cases',font:{size:11}}}}},
      plugins:[{id:'lapLabels',afterDatasetsDraw(chart){const ctx2=chart.ctx;chart.data.datasets.forEach((ds,di)=>{const meta=chart.getDatasetMeta(di);meta.data.forEach((pt,j)=>{const v=ds.data[j];if(!v)return;ctx2.save();ctx2.font='bold 9px DM Sans,sans-serif';ctx2.fillStyle=ds.borderColor;ctx2.textAlign='center';ctx2.textBaseline='bottom';ctx2.fillText(v,pt.x,pt.y-6);ctx2.restore();});});}}]
    });
  }

  // ═══════════════════════════════════════════════════════
  // 4. ASP CHANGE — YTD comparison + full year, with toggle
  // ═══════════════════════════════════════════════════════
  let aspView='ytd'; // 'ytd' or 'full'

  function renderASPChange(){
    destroyChart('aspChange');
    const el=document.getElementById('p4-asp-change');
    const ctx=document.getElementById('chart-asp-change');
    if(!el||!ctx)return;

    const allCases=getAllCases();
    const years=['2024','2025','2026'];
    const yearColors={'2024':'#94a3b8','2025':'#0ea5e9','2026':'#10b981'};

    // Find latest month in 2026
    const months2026=[...new Set(allCases.filter(c=>c.yr==='2026').map(c=>c.mo))].sort((a,b)=>a-b);
    const latestMo2026=months2026[months2026.length-1]||7;

    // YTD: for each year, only Jan-latestMo2026 (2024 starts Apr)
    // Full: all months for each year
    const getMonthRange=(yr)=>{
      if(aspView==='ytd'){
        const start=yr==='2024'?4:1; // 2024 data starts April
        return Array.from({length:latestMo2026-start+1},(_,i)=>i+start);
      } else {
        if(yr==='2024')return Array.from({length:9},(_,i)=>i+4); // Apr-Dec 2024
        if(yr==='2025')return Array.from({length:12},(_,i)=>i+1);
        return months2026; // 2026 YTD always
      }
    };

    // Build per-category per-year data
    const cats=[...new Set(allCases.map(c=>c.category))];
    const catTotals={};cats.forEach(cat=>{catTotals[cat]=allCases.filter(c=>c.category===cat).length;});
    const topCats=cats.sort((a,b)=>catTotals[b]-catTotals[a]).slice(0,8);

    // For chart: show overall ASP per month grouped by year (YTD months as x-axis)
    const xMonths=getMonthRange('2026'); // use 2026 months as x-axis labels
    const datasets=years.map(yr=>{
      const moRange=getMonthRange(yr);
      const data=xMonths.map((mo,i)=>{
        const mappedMo=moRange[i];
        if(!mappedMo)return null;
        const yrCases=allCases.filter(c=>c.yr===yr&&c.mo===mappedMo);
        return yrCases.length?Math.round(avg(yrCases.map(c=>c.approvalAmount))):null;
      });
      return{label:yr,data,borderColor:yearColors[yr],backgroundColor:yearColors[yr]+'15',borderWidth:2.5,pointRadius:5,pointBackgroundColor:yearColors[yr],tension:.3,fill:yr==='2026',spanGaps:false};
    });

    charts.aspChange=new Chart(ctx,{type:'line',data:{labels:xMonths.map(m=>MN[m-1]),datasets},options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:28}},interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:10,font:{size:11}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+(c.raw?fmtN(c.raw):'No data')}}},scales:{x:{ticks:{font:{size:10}},grid:{display:false},title:{display:true,text:aspView==='ytd'?'Month (Jan-'+MN[latestMo2026-1]+')':'Month'}},y:{ticks:{font:{size:10},callback:v=>fmtN(v)},grid:{color:'#f0f0f0'},title:{display:true,text:'Avg ASP',font:{size:11}}}}},
      plugins:[{id:'aspLabels',afterDatasetsDraw(chart){const ctx2=chart.ctx;chart.data.datasets.forEach((ds,di)=>{const meta=chart.getDatasetMeta(di);meta.data.forEach((pt,j)=>{const v=ds.data[j];if(!v)return;ctx2.save();ctx2.font='bold 9px DM Sans,sans-serif';ctx2.fillStyle=ds.borderColor;ctx2.textAlign='center';ctx2.textBaseline='bottom';ctx2.fillText(fmtN(v).replace('₹',''),pt.x,pt.y-6);ctx2.restore();});});}}]
    });

    // Category table below chart
    const tblEl=document.getElementById('p4-asp-table');
    if(!tblEl)return;

    tblEl.innerHTML=`<table style="width:100%;font-size:11px;border-collapse:collapse;margin-top:12px;">
      <thead><tr style="background:var(--surface2);">
        <th style="text-align:left;padding:7px 8px;">Category</th>
        ${years.map(yr=>`<th style="text-align:right;padding:7px 8px;">Cases ${aspView==='ytd'?'YTD ':''}'${yr.slice(2)}</th><th style="text-align:right;padding:7px 8px;">Avg ASP ${aspView==='ytd'?'YTD ':''}'${yr.slice(2)}</th>`).join('')}
        <th style="text-align:right;padding:7px 8px;">ASP Δ '25→'26</th>
        <th style="text-align:right;padding:7px 8px;">Share Δ '25→'26</th>
      </tr></thead>
      <tbody>${topCats.map(cat=>{
        const yrData=years.map(yr=>{
          const mos=getMonthRange(yr);
          const yc=allCases.filter(c=>c.category===cat&&c.yr===yr&&mos.includes(c.mo));
          const allYrCases=allCases.filter(c=>c.yr===yr&&mos.includes(c.mo));
          return{n:yc.length,asp:Math.round(avg(yc.map(c=>c.approvalAmount))),share:allYrCases.length?yc.length/allYrCases.length*100:0};
        });
        const asp25=yrData[1].asp,asp26=yrData[2].asp;
        const aspChg=asp25?((asp26-asp25)/asp25*100):0;
        const shareChg=yrData[2].share-yrData[1].share;
        return`<tr style="border-bottom:1px solid var(--border);">
          <td style="padding:6px 8px;font-weight:600;"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${catColor(cat)};margin-right:5px;"></span>${esc(cat)}</td>
          ${yrData.map(d=>`<td style="text-align:right;padding:6px 8px;">${d.n||'—'}</td><td style="text-align:right;padding:6px 8px;font-weight:600;">${d.asp?fmtN(d.asp):'—'}</td>`).join('')}
          <td style="text-align:right;padding:6px 8px;font-weight:700;color:${aspChg>2?'#10b981':aspChg<-2?'#ef4444':'var(--text2)'};">${aspChg?aspChg.toFixed(1)+'%':'—'}</td>
          <td style="text-align:right;padding:6px 8px;font-weight:700;color:${shareChg>0.5?'#f97316':shareChg<-0.5?'#8b5cf6':'var(--text2)'};">${shareChg?(shareChg>=0?'+':'')+shareChg.toFixed(1)+'%':'—'}</td>
        </tr>`;
      }).join('')}</tbody>
    </table>`;
  }

  // ═══════════════════════════════════════════════════════
  // RENDER ALL
  // ═══════════════════════════════════════════════════════
  function renderAll(){
    renderSummary();
    renderCategoryMix();
    renderLapBreakdown();
    renderASPChange();
  }

  // ═══════════════════════════════════════════════════════
  // FILTERS + EVENTS
  // ═══════════════════════════════════════════════════════
  function renderFilters(){
    const cities=[['','All Cities'],...getCities().map(c=>[c,cityLabel(c)])];
    const cats=[['','All Categories'],...CONFIG.ACTIVE_CATEGORIES.map(c=>[c,c])];
    fillSel('p4-city',cities,f.city);
    fillSel('p4-category',cats,f.category);
  }

  function bindEvents(){
    document.getElementById('p4-city')?.addEventListener('change',e=>{f.city=e.target.value;renderAll();});
    document.getElementById('p4-category')?.addEventListener('change',e=>{f.category=e.target.value;renderAll();});
    document.getElementById('p4-compare')?.addEventListener('change',e=>{f.compare=e.target.value;renderLapBreakdown();});
    document.getElementById('p4-clear')?.addEventListener('click',()=>{f.city='';f.category='';f.compare='monthly';renderFilters();document.getElementById('p4-compare').value='monthly';renderAll();});
    document.getElementById('p4-asp-ytd')?.addEventListener('click',()=>{aspView='ytd';document.getElementById('p4-asp-ytd').classList.add('active');document.getElementById('p4-asp-full').classList.remove('active');renderASPChange();});
    document.getElementById('p4-asp-full')?.addEventListener('click',()=>{aspView='full';document.getElementById('p4-asp-full').classList.add('active');document.getElementById('p4-asp-ytd').classList.remove('active');renderASPChange();});
  }

  function init(){renderFilters();renderAll();bindEvents();onDataRefresh(()=>{renderFilters();renderAll();});}
  return{init};
})();
