// ============================================================
// PAGE 4 — INSIGHTS (auto-recalculating from live data)
// ============================================================
const PAGE4 = (() => {
  const f = { city: '', category: '', compare: 'monthly' };
  let charts = {};
  const COLORS = ['#0ea5e9','#10b981','#8b5cf6','#f97316','#ec4899','#eab308','#06b6d4','#ef4444','#84cc16','#64748b','#d946ef','#14b8a6'];

  // ── Helpers ──────────────────────────────────────────────
  function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
  function fmtN(n){if(!n&&n!==0)return'—';if(n>=10000000)return(n/10000000).toFixed(2)+'Cr';if(n>=100000)return(n/100000).toFixed(1)+'L';if(n>=1000)return Math.round(n).toLocaleString('en-IN');return Math.round(n).toString();}
  function fmtPct(n){return(n>=0?'+':'')+n.toFixed(1)+'%';}
  function avg(arr){return arr.length?arr.reduce((s,v)=>s+v,0)/arr.length:0;}
  function destroyChart(k){if(charts[k]){charts[k].destroy();delete charts[k];}}
  function fillSel(id,opts,cur){const el=document.getElementById(id);if(!el)return;el.innerHTML=opts.map(([v,l])=>`<option value="${esc(String(v))}"${String(v)===String(cur)?' selected':''}>${esc(l)}</option>`).join('');}
  function cityLabel(c){return CONFIG.CITY_DISPLAY[c]||c.charAt(0).toUpperCase()+c.slice(1);}
  function caseDate(c){return c.dodParsed||c.doaParsed||null;}

  // ── Get cases with date key ─────────────────────────────
  function getAllCases(){
    return DATA.aspCases.filter(c=>{
      const dt=caseDate(c);
      if(!dt||c.approvalAmount===null)return false;
      if(f.city&&c.city!==f.city)return false;
      if(f.category&&c.category.toLowerCase()!==f.category.toLowerCase())return false;
      return true;
    }).map(c=>{
      const dt=caseDate(c);
      return{...c,dt,ym:`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`,yr:String(dt.getFullYear()),qtr:`${dt.getFullYear()} Q${Math.ceil((dt.getMonth()+1)/3)}`};
    });
  }

  function periodKey(c){
    if(f.compare==='yearly')return c.yr;
    if(f.compare==='quarterly')return c.qtr;
    return c.ym;
  }

  function periodLabel(k){
    if(f.compare!=='monthly')return k;
    const[yr,mo]=k.split('-');
    return['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mo-1]+"'"+yr.slice(2);
  }

  // ── Classify laparoscopy sub-types ──────────────────────
  function classifyLap(proc){
    const p=(proc||'').toLowerCase();
    if(p.includes('balloon')||p.includes('intragastric'))return'Balloon';
    if(p.includes('sleeve'))return'Sleeve';
    if(p.includes('cholecystectomy')||p.includes('chole'))return'Cholecystectomy';
    return'Other Hernia/Lap';
  }

  // ── Major insurers list ─────────────────────────────────
  const MAJOR_INSURERS=['Star Health & Allied Insurance Co. Ltd.','ICICI Lombard General Insurance Co. Ltd.','New India Assurance Co. Ltd.','Care Health Insurance Ltd.','Aditya Birla Health Insurance Co. Ltd.','HDFC ERGO General Insurance Co. Ltd.','Bajaj Allianz General Insurance Co. Ltd.','Tata AIG General Insurance Co. Ltd.','Oriental Insurance Co. Ltd.','United India Insurance Co. Ltd.','Reliance General Insurance Co. Ltd.','Niva Bupa Health Insurance Company Ltd.'];

  // ════════════════════════════════════════════════════════
  // RENDER: Summary Findings
  // ════════════════════════════════════════════════════════
  function renderSummary(){
    const el=document.getElementById('p4-summary');if(!el)return;
    const cases=getAllCases();
    if(!cases.length){el.innerHTML='<div style="color:var(--text3);padding:14px;">No data for current filters.</div>';return;}

    const periods=Object.keys(cases.reduce((a,c)=>{a[periodKey(c)]=1;return a;},{})).sort();
    if(periods.length<2){el.innerHTML='';return;}

    const cur=periods[periods.length-1],prev=periods[periods.length-2];
    const curCases=cases.filter(c=>periodKey(c)===cur),prevCases=cases.filter(c=>periodKey(c)===prev);
    const curASP=avg(curCases.map(c=>c.approvalAmount)),prevASP=avg(prevCases.map(c=>c.approvalAmount));
    const aspChange=prevASP?((curASP-prevASP)/prevASP*100):0;

    // Category mix analysis
    const curCats={},prevCats={};
    curCases.forEach(c=>{if(!curCats[c.category])curCats[c.category]={n:0,amt:[]};curCats[c.category].n++;curCats[c.category].amt.push(c.approvalAmount);});
    prevCases.forEach(c=>{if(!prevCats[c.category])prevCats[c.category]={n:0,amt:[]};prevCats[c.category].n++;prevCats[c.category].amt.push(c.approvalAmount);});

    // Find biggest share gainer and loser
    const allCats=[...new Set([...Object.keys(curCats),...Object.keys(prevCats)])];
    let biggestGainer=null,biggestLoser=null,maxGain=-999,maxLoss=999;
    allCats.forEach(cat=>{
      const curShare=(curCats[cat]?.n||0)/curCases.length*100;
      const prevShare=(prevCats[cat]?.n||0)/prevCases.length*100;
      const diff=curShare-prevShare;
      if(diff>maxGain){maxGain=diff;biggestGainer={cat,curShare,prevShare,diff};}
      if(diff<maxLoss){maxLoss=diff;biggestLoser={cat,curShare,prevShare,diff};}
    });

    // Lap breakdown
    const curLap=curCases.filter(c=>c.category.toUpperCase()==='LAPAROSCOPY');
    const prevLap=prevCases.filter(c=>c.category.toUpperCase()==='LAPAROSCOPY');
    const curBalloon=curLap.filter(c=>classifyLap(c.procedureRaw)==='Balloon').length;
    const prevBalloon=prevLap.filter(c=>classifyLap(c.procedureRaw)==='Balloon').length;

    const cards=[];
    cards.push({color:'#0ea5e9',icon:'📊',label:'Avg ASP Change',value:'₹'+fmtN(Math.round(curASP)),sub:fmtPct(aspChange)+' vs '+periodLabel(prev),alert:aspChange<-5});
    cards.push({color:'#10b981',icon:'📈',label:'Case Volume',value:curCases.length+' cases',sub:(curCases.length>prevCases.length?'+':'')+Math.round((curCases.length-prevCases.length)/prevCases.length*100)+'% vs '+periodLabel(prev),alert:false});
    if(biggestGainer)cards.push({color:'#f97316',icon:'🔺',label:'Fastest Growing',value:biggestGainer.cat,sub:biggestGainer.prevShare.toFixed(1)+'% → '+biggestGainer.curShare.toFixed(1)+'% share',alert:false});
    if(biggestLoser)cards.push({color:'#ef4444',icon:'🔻',label:'Biggest Decline',value:biggestLoser.cat,sub:biggestLoser.prevShare.toFixed(1)+'% → '+biggestLoser.curShare.toFixed(1)+'% share',alert:true});

    el.innerHTML=`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">${cards.map(c=>`
      <div style="background:${c.alert?'var(--red-lt)':'var(--surface2)'};border-radius:var(--r);padding:14px 16px;border-left:4px solid ${c.color};">
        <div style="font-size:11px;color:var(--text3);font-weight:600;text-transform:uppercase;letter-spacing:.3px;margin-bottom:4px;">${c.icon} ${esc(c.label)}</div>
        <div style="font-size:20px;font-weight:800;color:var(--text);margin-bottom:2px;">${esc(c.value)}</div>
        <div style="font-size:12px;color:var(--text2);">${esc(c.sub)}</div>
      </div>`).join('')}</div>

    <div style="background:var(--surface2);border-radius:var(--r);padding:14px 16px;margin-top:10px;">
      <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:6px;">📋 Key Finding</div>
      <div style="font-size:13px;color:var(--text2);line-height:1.6;">
        ASP ${aspChange<0?'declined':'grew'} <strong>${Math.abs(aspChange).toFixed(1)}%</strong> from ${periodLabel(prev)} to ${periodLabel(cur)}.
        ${biggestGainer&&biggestGainer.cat.toUpperCase()==='UROLOGY'?`<strong>Urology</strong> (avg ASP ₹${fmtN(Math.round(avg((curCats['UROLOGY']?.amt||[0]))))}) now represents <strong>${(curCats['UROLOGY']?.n||0)/curCases.length*100|0}%</strong> of all cases, up from ${((prevCats['UROLOGY']?.n||0)/prevCases.length*100).toFixed(1)}%. This low-ASP category growing faster than high-ASP categories is the primary driver of the decline.`:''}
        ${curBalloon<prevBalloon?`Balloon procedures dropped from <strong>${prevBalloon}</strong> to <strong>${curBalloon}</strong> cases (avg ASP ₹3-4L each), removing significant revenue from the top.`:''}
      </div>
    </div>`;
  }

  // ════════════════════════════════════════════════════════
  // RENDER: Category Mix Chart (stacked bar)
  // ════════════════════════════════════════════════════════
  function renderCategoryMix(){
    destroyChart('catMix');
    const ctx=document.getElementById('chart-cat-mix');if(!ctx)return;
    const cases=getAllCases();
    if(!cases.length)return;

    const byPeriod={};
    cases.forEach(c=>{const pk=periodKey(c);if(!byPeriod[pk])byPeriod[pk]={};const cat=c.category;if(!byPeriod[pk][cat])byPeriod[pk][cat]=0;byPeriod[pk][cat]++;});
    const periods=Object.keys(byPeriod).sort();
    const topCats=[...new Set(cases.map(c=>c.category))];
    const catTotals={};topCats.forEach(cat=>{catTotals[cat]=cases.filter(c=>c.category===cat).length;});
    const sortedCats=topCats.sort((a,b)=>catTotals[b]-catTotals[a]).slice(0,8);

    const datasets=sortedCats.map((cat,i)=>({
      label:cat,data:periods.map(p=>{const total=Object.values(byPeriod[p]).reduce((s,v)=>s+v,0);return total?Math.round((byPeriod[p][cat]||0)/total*1000)/10:0;}),
      backgroundColor:COLORS[i%COLORS.length],borderRadius:2,maxBarThickness:24
    }));

    charts.catMix=new Chart(ctx,{type:'bar',data:{labels:periods.map(periodLabel),datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:10,font:{size:10}}},tooltip:{callbacks:{label:c=>c.dataset.label+': '+c.raw+'%'}}},scales:{x:{stacked:true,ticks:{font:{size:9},maxRotation:45},grid:{display:false}},y:{stacked:true,max:100,ticks:{font:{size:10},callback:v=>v+'%'},grid:{color:'#f0f0f0'}}}}});
  }

  // ════════════════════════════════════════════════════════
  // RENDER: Laparoscopy Breakdown
  // ════════════════════════════════════════════════════════
  function renderLapBreakdown(){
    destroyChart('lapBreak');
    const ctx=document.getElementById('chart-lap-break');if(!ctx)return;
    const lap=getAllCases().filter(c=>c.category.toUpperCase()==='LAPAROSCOPY');
    if(!lap.length){ctx.parentElement.innerHTML='<div style="color:var(--text3);font-size:13px;padding:20px;">No laparoscopy data for filters.</div>';return;}

    const subs=['Balloon','Sleeve','Cholecystectomy','Other Hernia/Lap'];
    const subColors=['#0ea5e9','#8b5cf6','#10b981','#94a3b8'];
    const byPeriod={};
    lap.forEach(c=>{const pk=periodKey(c);const sub=classifyLap(c.procedureRaw);if(!byPeriod[pk])byPeriod[pk]={};if(!byPeriod[pk][sub])byPeriod[pk][sub]={n:0,amt:[]};byPeriod[pk][sub].n++;byPeriod[pk][sub].amt.push(c.approvalAmount);});
    const periods=Object.keys(byPeriod).sort();

    const datasets=subs.map((sub,i)=>({
      label:sub,data:periods.map(p=>byPeriod[p]?.[sub]?.n||0),
      borderColor:subColors[i],backgroundColor:subColors[i]+'20',borderWidth:2.5,pointRadius:3,pointBackgroundColor:subColors[i],tension:.3,fill:false
    }));

    charts.lapBreak=new Chart(ctx,{type:'line',data:{labels:periods.map(periodLabel),datasets},options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:10,font:{size:10}}},tooltip:{callbacks:{afterLabel:c=>{const pd=byPeriod[periods[c.dataIndex]]?.[subs[c.datasetIndex]];return pd?'Avg ASP: ₹'+fmtN(Math.round(avg(pd.amt))):''}}}},scales:{x:{ticks:{font:{size:9},maxRotation:45},grid:{display:false}},y:{ticks:{font:{size:10}},grid:{color:'#f0f0f0'},title:{display:true,text:'Cases',font:{size:11}}}}}});
  }

  // ════════════════════════════════════════════════════════
  // RENDER: ASP Change Drivers
  // ════════════════════════════════════════════════════════
  function renderDrivers(){
    const el=document.getElementById('p4-drivers');if(!el)return;
    const cases=getAllCases();
    if(!cases.length){el.innerHTML='';return;}

    const periods=Object.keys(cases.reduce((a,c)=>{a[periodKey(c)]=1;return a;},{})).sort();
    if(periods.length<2){el.innerHTML='<div style="color:var(--text3);font-size:13px;">Need at least 2 periods for comparison.</div>';return;}
    const cur=periods[periods.length-1],prev=periods[periods.length-2];
    const curC=cases.filter(c=>periodKey(c)===cur),prevC=cases.filter(c=>periodKey(c)===prev);

    // Per-category comparison
    const cats=[...new Set([...curC.map(c=>c.category),...prevC.map(c=>c.category)])];
    const rows=cats.map(cat=>{
      const cc=curC.filter(c=>c.category===cat),pc=prevC.filter(c=>c.category===cat);
      const cASP=avg(cc.map(c=>c.approvalAmount)),pASP=avg(pc.map(c=>c.approvalAmount));
      const cShare=cc.length/curC.length*100,pShare=pc.length/prevC.length*100;
      return{cat,curCases:cc.length,prevCases:pc.length,curASP:Math.round(cASP),prevASP:Math.round(pASP),aspChange:pASP?((cASP-pASP)/pASP*100):0,curShare:cShare,prevShare:pShare,shareChange:cShare-pShare};
    }).sort((a,b)=>b.curCases-a.curCases);

    const sub=document.getElementById('p4-driver-sub');
    if(sub)sub.textContent=periodLabel(cur)+' vs '+periodLabel(prev);

    el.innerHTML=`<div class="table-wrap"><table style="width:100%;font-size:12px;">
      <thead><tr style="background:var(--surface2);"><th style="text-align:left;padding:8px;">Category</th><th style="text-align:right;padding:8px;">Cases (${periodLabel(prev)})</th><th style="text-align:right;padding:8px;">Cases (${periodLabel(cur)})</th><th style="text-align:right;padding:8px;">Share Change</th><th style="text-align:right;padding:8px;">Avg ASP (${periodLabel(prev)})</th><th style="text-align:right;padding:8px;">Avg ASP (${periodLabel(cur)})</th><th style="text-align:right;padding:8px;">ASP Change</th></tr></thead>
      <tbody>${rows.map(r=>`<tr>
        <td style="padding:6px 8px;font-weight:600;">${esc(r.cat)}</td>
        <td style="text-align:right;padding:6px 8px;">${r.prevCases}</td>
        <td style="text-align:right;padding:6px 8px;font-weight:600;">${r.curCases}</td>
        <td style="text-align:right;padding:6px 8px;color:${r.shareChange>1?'var(--green)':r.shareChange<-1?'var(--red)':'var(--text2)'};">${r.shareChange>=0?'+':''}${r.shareChange.toFixed(1)}%</td>
        <td style="text-align:right;padding:6px 8px;">₹${fmtN(r.prevASP)}</td>
        <td style="text-align:right;padding:6px 8px;font-weight:600;">₹${fmtN(r.curASP)}</td>
        <td style="text-align:right;padding:6px 8px;color:${r.aspChange>2?'var(--green)':r.aspChange<-2?'var(--red)':'var(--text2)'};">${r.aspChange>=0?'+':''}${r.aspChange.toFixed(1)}%</td>
      </tr>`).join('')}</tbody></table></div>`;
  }

  // ════════════════════════════════════════════════════════
  // RENDER: Empanelment Opportunities
  // ════════════════════════════════════════════════════════
  function renderEmpanelment(){
    const sumEl=document.getElementById('p4-emp-summary');
    const tblEl=document.getElementById('p4-emp-table');
    if(!sumEl||!tblEl)return;

    const empCity=document.getElementById('emp-city')?.value||'';
    const empCat=document.getElementById('emp-category')?.value||'';
    const empMinASP=parseInt(document.getElementById('emp-min-asp')?.value||'100000');

    // Get recent cases (last 6 months)
    const allC=DATA.aspCases.filter(c=>{const dt=caseDate(c);return dt&&c.approvalAmount!==null&&dt>=new Date(Date.now()-180*86400000);});

    // Build hospital profiles
    const hospProf={};
    allC.forEach(c=>{
      const key=c.hospitalName.toLowerCase().trim();
      if(!hospProf[key])hospProf[key]={name:c.hospitalName,city:c.city,cases:0,amounts:[],insurers:new Set(),categories:new Set()};
      hospProf[key].cases++;hospProf[key].amounts.push(c.approvalAmount);hospProf[key].insurers.add(c.insuranceName);hospProf[key].categories.add(c.category);
    });

    // Build insurer city share
    const cityInsCount={};
    allC.forEach(c=>{
      if(!cityInsCount[c.city])cityInsCount[c.city]={total:0,ins:{}};
      cityInsCount[c.city].total++;
      cityInsCount[c.city].ins[c.insuranceName]=(cityInsCount[c.city].ins[c.insuranceName]||0)+1;
    });

    // Find opportunities
    const opps=[];
    Object.values(hospProf).forEach(h=>{
      if(h.cases<5)return;
      const hASP=Math.round(avg(h.amounts));
      if(hASP<empMinASP)return;
      if(empCity&&h.city!==empCity)return;
      if(empCat&&!h.categories.has(empCat))return;

      const monthlyRate=h.cases/6;
      const cityData=cityInsCount[h.city]||{total:1,ins:{}};

      MAJOR_INSURERS.forEach(ins=>{
        if(h.insurers.has(ins))return;
        const insShare=(cityData.ins[ins]||0)/cityData.total;
        if(insShare<0.03)return;
        // Also check hospital network empanelment
        const hNet=DATA.hospitals.find(x=>x.hospitalName.toLowerCase().trim()===h.name.toLowerCase().trim());
        if(hNet&&hNet.insurerRaw){
          // If explicitly empanelled, skip
          if(hNet.insurer[ins])return;
        }
        const estCases=Math.max(2,Math.round(monthlyRate*insShare));
        opps.push({hosp:h.name,city:h.city,avgASP:hASP,hospCases:h.cases,insurer:ins,insShare:insShare*100,estCases,estRevenue:estCases*hASP,categories:[...h.categories].join(', ')});
      });
    });

    opps.sort((a,b)=>b.estRevenue-a.estRevenue);

    // Summary
    const totalMonthly=opps.reduce((s,o)=>s+o.estRevenue,0);
    const byCitySummary={};
    opps.forEach(o=>{if(!byCitySummary[o.city])byCitySummary[o.city]={gaps:0,rev:0};byCitySummary[o.city].gaps++;byCitySummary[o.city].rev+=o.estRevenue;});

    sumEl.innerHTML=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-bottom:10px;">
      <div style="background:var(--surface2);border-radius:var(--r-sm);padding:10px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Total Gaps</div>
        <div style="font-size:22px;font-weight:800;color:var(--text);">${opps.length}</div>
      </div>
      <div style="background:var(--surface2);border-radius:var(--r-sm);padding:10px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Est. Monthly</div>
        <div style="font-size:22px;font-weight:800;color:var(--teal);">₹${fmtN(totalMonthly)}</div>
      </div>
      <div style="background:var(--surface2);border-radius:var(--r-sm);padding:10px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">Est. Annual</div>
        <div style="font-size:22px;font-weight:800;color:var(--green);">₹${fmtN(totalMonthly*12)}</div>
      </div>
      ${Object.entries(byCitySummary).sort((a,b)=>b[1].rev-a[1].rev).slice(0,4).map(([city,d])=>`
      <div style="background:var(--surface2);border-radius:var(--r-sm);padding:10px;text-align:center;">
        <div style="font-size:10px;font-weight:700;color:var(--text3);text-transform:uppercase;">${cityLabel(city)}</div>
        <div style="font-size:16px;font-weight:800;color:var(--text);">${d.gaps} gaps</div>
        <div style="font-size:11px;color:var(--text2);">₹${fmtN(d.rev)}/mo</div>
      </div>`).join('')}
    </div>

    <div style="background:var(--surface2);border-radius:var(--r);padding:10px 14px;margin-bottom:8px;">
      <div style="font-size:12px;color:var(--text2);line-height:1.6;">
        <strong>📋 Summary:</strong> ${opps.length} empanelment gaps identified across ${Object.keys(byCitySummary).length} cities.
        Estimated monthly revenue opportunity: <strong>₹${fmtN(totalMonthly)}</strong> (₹${fmtN(totalMonthly*12)}/year).
        ${Object.entries(byCitySummary).sort((a,b)=>b[1].rev-a[1].rev).slice(0,3).map(([city,d])=>cityLabel(city)+' has the highest potential at ₹'+fmtN(d.rev)+'/month').join('. ')}.
        Hospitals with avg ASP above ₹${fmtN(empMinASP)} are missing major insurers that have ${'>'}3% share in their city.
      </div>
    </div>`;

    // Table
    const display=opps.slice(0,50);
    tblEl.innerHTML=display.length?`<table style="width:100%;font-size:11px;border-collapse:collapse;">
      <thead><tr style="background:var(--surface2);position:sticky;top:0;">
        <th style="text-align:left;padding:6px 8px;">Hospital</th>
        <th style="text-align:left;padding:6px 8px;">City</th>
        <th style="text-align:right;padding:6px 8px;">Avg ASP</th>
        <th style="text-align:right;padding:6px 8px;">Cases (6mo)</th>
        <th style="text-align:left;padding:6px 8px;">Missing Insurer</th>
        <th style="text-align:right;padding:6px 8px;">Ins. City Share</th>
        <th style="text-align:right;padding:6px 8px;">Est. Cases/mo</th>
        <th style="text-align:right;padding:6px 8px;font-weight:700;">Est. Revenue/mo</th>
      </tr></thead>
      <tbody>${display.map((o,i)=>`<tr style="border-bottom:1px solid var(--border);${i<3?'background:var(--green-lt);':''}">
        <td style="padding:5px 8px;font-weight:600;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(o.hosp)}">${esc(o.hosp.length>35?o.hosp.slice(0,33)+'…':o.hosp)}</td>
        <td style="padding:5px 8px;">${cityLabel(o.city)}</td>
        <td style="text-align:right;padding:5px 8px;font-family:var(--mono);font-weight:600;">₹${fmtN(o.avgASP)}</td>
        <td style="text-align:right;padding:5px 8px;">${o.hospCases}</td>
        <td style="padding:5px 8px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(o.insurer)}">${esc(o.insurer.replace(/ Insurance/g,'').replace(/ Co\. Ltd\./g,'').replace(/ General/g,'').slice(0,30))}</td>
        <td style="text-align:right;padding:5px 8px;">${o.insShare.toFixed(1)}%</td>
        <td style="text-align:right;padding:5px 8px;">${o.estCases}</td>
        <td style="text-align:right;padding:5px 8px;font-weight:700;color:var(--teal);">₹${fmtN(o.estRevenue)}</td>
      </tr>`).join('')}</tbody>
    </table>${opps.length>50?`<div style="font-size:11px;color:var(--text3);padding:8px;text-align:center;">Showing top 50 of ${opps.length} opportunities</div>`:''}`:
    '<div style="color:var(--text3);font-size:13px;padding:14px;">No empanelment gaps found for current filters.</div>';
  }

  // ── Render All ──────────────────────────────────────────
  function renderAll(){renderSummary();renderCategoryMix();renderLapBreakdown();renderDrivers();renderEmpanelment();}

  // ── Filters ─────────────────────────────────────────────
  function renderFilters(){
    const cities=[['','All Cities'],...getCities().map(c=>[c,cityLabel(c)])];
    const cats=[['','All Categories'],...CONFIG.ACTIVE_CATEGORIES.map(c=>[c,c])];
    fillSel('p4-city',cities,f.city);
    fillSel('p4-category',cats,f.category);
    fillSel('emp-city',cities,'');
    fillSel('emp-category',cats,'');
  }

  function bindEvents(){
    document.getElementById('p4-city')?.addEventListener('change',e=>{f.city=e.target.value;renderAll();});
    document.getElementById('p4-category')?.addEventListener('change',e=>{f.category=e.target.value;renderAll();});
    document.getElementById('p4-compare')?.addEventListener('change',e=>{f.compare=e.target.value;renderAll();});
    document.getElementById('p4-clear')?.addEventListener('click',()=>{f.city='';f.category='';f.compare='monthly';renderFilters();document.getElementById('p4-compare').value='monthly';renderAll();});
    // Empanelment filters
    ['emp-city','emp-category','emp-min-asp'].forEach(id=>{
      document.getElementById(id)?.addEventListener('change',()=>renderEmpanelment());
    });
  }

  function init(){renderFilters();renderAll();bindEvents();onDataRefresh(()=>{renderFilters();renderAll();});}

  return{init};
})();
