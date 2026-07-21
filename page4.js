// ============================================================
// PAGE 4 — INSIGHTS v4: Focused "Why is ASP dropping" analysis
// ============================================================
const PAGE4 = (() => {
  const RELEVANT_CATS = ['UROLOGY','PROCTOLOGY','LAPAROSCOPY','AESTHETICS / PLASTIC SURGERY','KIDNEY STONE','VASCULAR'];
  const CAT_MAP = {
    'UROLOGY':'UROLOGY','PROCTOLOGY':'PROCTOLOGY','LAPAROSCOPY':'LAPAROSCOPY',
    'AESTHETICS / PLASTIC SURGERY':'AESTHETICS / PLASTIC SURGERY',
    'KIDNEY STONE':'KIDNEY STONE','VASCULAR':'VASCULAR'
  };
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
  let selectedCats = [...RELEVANT_CATS, 'OTHERS'];
  let selectedCities = []; // empty = all

  // ── Helpers ──────────────────────────────────────────────
  function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
  function fmtASP(n){if(!n&&n!==0)return'—';const a=Math.abs(n);if(a>=100000)return(n<0?'-':'')+'₹'+(a/100000).toFixed(2)+'L';if(a>=1000)return(n<0?'-':'')+'₹'+Math.round(a).toLocaleString('en-IN');return(n<0?'-':'')+'₹'+Math.round(a);}
  function fmtN(n){if(!n&&n!==0)return'—';if(n>=100000)return(n/100000).toFixed(1)+'L';if(n>=1000)return Math.round(n).toLocaleString('en-IN');return Math.round(n).toString();}
  function avg(arr){return arr.length?arr.reduce((s,v)=>s+v,0)/arr.length:0;}
  function sum(arr){return arr.reduce((s,v)=>s+v,0);}
  function destroyChart(k){if(charts[k]){try{charts[k].destroy();}catch(e){}delete charts[k];}}
  function cityLabel(c){return CONFIG.CITY_DISPLAY[c]||c.charAt(0).toUpperCase()+c.slice(1);}
  function caseDate(c){return c.dodParsed||c.doaParsed||null;}
  function catColor(cat){return CAT_COLORS[(cat||'').toUpperCase()]||'#94a3b8';}
  function normCat(cat){const u=(cat||'').trim().toUpperCase();return CAT_MAP[u]||'OTHERS';}
  function fmtMonth(ym){const[yr,mo]=ym.split('-');return MN[+mo-1]+"'"+yr.slice(2);}

  // ── Get all cases enriched ─────────────────────────────
  function getAllCases(){
    return DATA.aspCases.filter(c=>{
      const dt=caseDate(c);
      if(!dt||c.approvalAmount===null)return false;
      if(selectedCities.length>0&&!selectedCities.includes(c.city))return false;
      const cat=normCat(c.category);
      if(!selectedCats.includes(cat))return false;
      return true;
    }).map(c=>{
      const dt=caseDate(c);
      return{...c,dt,cat:normCat(c.category),ym:`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`,yr:dt.getFullYear(),mo:dt.getMonth()+1};
    });
  }

  // ═══════════════════════════════════════════════════════
  // 1. HEADLINE — the story in one banner
  // ═══════════════════════════════════════════════════════
  function renderHeadline(){
    const el=document.getElementById('p4-headline');if(!el)return;
    const cases=getAllCases();
    if(!cases.length){el.innerHTML='';return;}

    const months=[...new Set(cases.map(c=>c.ym))].sort();
    if(months.length<2){el.innerHTML='';return;}
    const firstYm=months[0],lastYm=months[months.length-1];
    const firstCases=cases.filter(c=>c.ym===firstYm),lastCases=cases.filter(c=>c.ym===lastYm);

    const firstASP=avg(firstCases.map(c=>c.approvalAmount));
    const lastASP=avg(lastCases.map(c=>c.approvalAmount));
    const aspChg=firstASP?((lastASP-firstASP)/firstASP*100):0;
    const volChg=firstCases.length?((lastCases.length-firstCases.length)/firstCases.length*100):0;

    // Find biggest volume driver
    const catGrowth={};
    RELEVANT_CATS.concat('OTHERS').forEach(cat=>{
      const f=firstCases.filter(c=>c.cat===cat).length;
      const l=lastCases.filter(c=>c.cat===cat).length;
      catGrowth[cat]={first:f,last:l,delta:l-f};
    });
    const topDriver=Object.entries(catGrowth).filter(([c])=>selectedCats.includes(c)).sort((a,b)=>b[1].delta-a[1].delta)[0];
    const topDriverPct=topDriver?Math.round(topDriver[1].first?((topDriver[1].last-topDriver[1].first)/topDriver[1].first*100):0):0;

    // Mix contribution: what would ASP be if mix stayed the same?
    let syntheticASP=0;
    let totalWeight=0;
    RELEVANT_CATS.concat('OTHERS').forEach(cat=>{
      if(!selectedCats.includes(cat))return;
      const firstShare=firstCases.length?firstCases.filter(c=>c.cat===cat).length/firstCases.length:0;
      const lastCatASP=avg(lastCases.filter(c=>c.cat===cat).map(c=>c.approvalAmount));
      if(firstShare&&lastCatASP){syntheticASP+=firstShare*lastCatASP;totalWeight+=firstShare;}
    });
    if(totalWeight>0)syntheticASP/=totalWeight;
    const mixImpact=syntheticASP-lastASP;

    el.innerHTML=`<div style="background:linear-gradient(135deg,#0c4a6e,#0ea5e9);border-radius:var(--r);padding:22px 26px;color:#fff;">
      <div style="font-size:11px;font-weight:700;letter-spacing:.5px;text-transform:uppercase;opacity:.85;margin-bottom:8px;">📊 Insight Summary · ${fmtMonth(firstYm)} → ${fmtMonth(lastYm)}</div>
      <div style="font-size:17px;font-weight:600;line-height:1.55;margin-bottom:14px;">
        Cases grew <strong>${volChg>=0?'+':''}${volChg.toFixed(0)}%</strong> (${firstCases.length} → ${lastCases.length}). 
        Avg ASP <strong style="color:${aspChg<0?'#fca5a5':'#86efac'};">${aspChg>=0?'rose':'fell'} ${Math.abs(aspChg).toFixed(1)}%</strong> (${fmtASP(Math.round(firstASP))} → ${fmtASP(Math.round(lastASP))}).
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
        ${topDriver?`<div style="background:rgba(255,255,255,.14);border-radius:10px;padding:12px 14px;">
          <div style="font-size:10px;opacity:.75;text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px;">Top Volume Driver</div>
          <div style="font-size:17px;font-weight:800;">${esc(CAT_SHORT[topDriver[0]])}</div>
          <div style="font-size:12px;opacity:.85;">+${topDriverPct}% cases (${topDriver[1].first} → ${topDriver[1].last})</div>
        </div>`:''}
        <div style="background:rgba(255,255,255,.14);border-radius:10px;padding:12px 14px;">
          <div style="font-size:10px;opacity:.75;text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px;">If Mix Stayed Constant</div>
          <div style="font-size:17px;font-weight:800;">${fmtASP(Math.round(syntheticASP))}</div>
          <div style="font-size:12px;opacity:.85;">Actual: ${fmtASP(Math.round(lastASP))} · Mix cost: ${fmtASP(Math.round(mixImpact))}</div>
        </div>
        <div style="background:rgba(255,255,255,.14);border-radius:10px;padding:12px 14px;">
          <div style="font-size:10px;opacity:.75;text-transform:uppercase;letter-spacing:.3px;margin-bottom:2px;">Verdict</div>
          <div style="font-size:14px;font-weight:700;line-height:1.4;">${aspChg<0?'Mix shift toward lower-ASP categories is dragging the average down.':'ASP holding up despite volume growth.'}</div>
        </div>
      </div>
    </div>`;
  }

  // ═══════════════════════════════════════════════════════
  // 2. THE KEY CHART: stacked category volume + ASP line
  // ═══════════════════════════════════════════════════════
  function renderKeyChart(){
    destroyChart('key');
    const ctx=document.getElementById('chart-key');if(!ctx)return;
    const cases=getAllCases();
    if(!cases.length)return;

    const months=[...new Set(cases.map(c=>c.ym))].sort();
    const cats=[...RELEVANT_CATS,'OTHERS'].filter(c=>selectedCats.includes(c));

    // Stacked case counts per category per month
    const datasets=cats.map(cat=>({
      type:'bar',label:CAT_SHORT[cat]||cat,
      data:months.map(m=>cases.filter(c=>c.ym===m&&c.cat===cat).length),
      backgroundColor:catColor(cat),
      borderRadius:0,
      maxBarThickness:36,
      stack:'cases',order:2,
      yAxisID:'y'
    }));

    // Overlay line: avg ASP per month
    const aspLine={
      type:'line',label:'Avg ASP',
      data:months.map(m=>{const mc=cases.filter(c=>c.ym===m);return mc.length?Math.round(avg(mc.map(c=>c.approvalAmount))):null;}),
      borderColor:'#0f172a',backgroundColor:'transparent',borderWidth:2.5,pointRadius:4,
      pointBackgroundColor:'#0f172a',tension:.3,fill:false,yAxisID:'y1',order:1
    };

    charts.key=new Chart(ctx,{data:{labels:months.map(fmtMonth),datasets:[...datasets,aspLine]},
      options:{responsive:true,maintainAspectRatio:false,layout:{padding:{top:16,right:12}},
        interaction:{mode:'index',intersect:false},
        plugins:{legend:{display:true,position:'bottom',labels:{boxWidth:10,font:{size:10}}},
          tooltip:{callbacks:{label:c=>c.dataset.label==='Avg ASP'?'Avg ASP: '+fmtASP(c.raw):c.dataset.label+': '+c.raw+' cases'}}},
        scales:{
          x:{stacked:true,ticks:{font:{size:9},maxRotation:45},grid:{display:false}},
          y:{stacked:true,position:'left',ticks:{font:{size:10}},grid:{color:'#f0f0f0'},title:{display:true,text:'Case count (stacked)',font:{size:11}}},
          y1:{position:'right',ticks:{font:{size:10},callback:v=>fmtASP(v),color:'#0f172a'},grid:{display:false},title:{display:true,text:'Avg ASP',font:{size:11}}}
        }
      }
    });
  }

  // ═══════════════════════════════════════════════════════
  // 3. GROWTH MATRIX — table with heatmap coloring
  // ═══════════════════════════════════════════════════════
  function renderGrowthMatrix(){
    const el=document.getElementById('p4-matrix');if(!el)return;
    const cases=getAllCases();
    if(!cases.length){el.innerHTML='';return;}

    const months=[...new Set(cases.map(c=>c.ym))].sort();
    const firstYm=months[0],lastYm=months[months.length-1];
    const cats=[...RELEVANT_CATS,'OTHERS'].filter(c=>selectedCats.includes(c));

    const rows=cats.map(cat=>{
      const first=cases.filter(c=>c.ym===firstYm&&c.cat===cat);
      const last=cases.filter(c=>c.ym===lastYm&&c.cat===cat);
      const firstCount=first.length,lastCount=last.length;
      const firstASP=avg(first.map(c=>c.approvalAmount));
      const lastASP=avg(last.map(c=>c.approvalAmount));
      const growth=firstCount?((lastCount-firstCount)/firstCount*100):(lastCount?100:0);
      const aspChg=firstASP?((lastASP-firstASP)/firstASP*100):0;

      let verdict='';let vColor='var(--text2)';
      if(growth>100&&aspChg>-5){verdict='Volume driver';vColor='#0ea5e9';}
      else if(growth<20&&aspChg<-5){verdict='Both declining';vColor='#ef4444';}
      else if(growth<20&&aspChg>0){verdict='Flat volume';vColor='#f97316';}
      else if(growth>50&&aspChg>0){verdict='Healthy growth';vColor='#10b981';}
      else if(growth<0||aspChg<-10){verdict='Concern';vColor='#ef4444';}
      else{verdict='Stable';vColor='var(--text2)';}

      return{cat,firstCount,lastCount,firstASP:Math.round(firstASP),lastASP:Math.round(lastASP),growth,aspChg,verdict,vColor};
    }).sort((a,b)=>b.lastCount-a.lastCount);

    el.innerHTML=`<div style="overflow-x:auto;">
      <table style="width:100%;font-size:12px;border-collapse:collapse;">
        <thead><tr style="background:var(--surface2);border-bottom:2px solid var(--border);">
          <th style="text-align:left;padding:9px 10px;font-weight:700;">Category</th>
          <th style="text-align:right;padding:9px 10px;font-weight:700;">Cases ${fmtMonth(firstYm)}</th>
          <th style="text-align:right;padding:9px 10px;font-weight:700;">Cases ${fmtMonth(lastYm)}</th>
          <th style="text-align:right;padding:9px 10px;font-weight:700;">Volume Growth</th>
          <th style="text-align:right;padding:9px 10px;font-weight:700;">ASP ${fmtMonth(firstYm)}</th>
          <th style="text-align:right;padding:9px 10px;font-weight:700;">ASP ${fmtMonth(lastYm)}</th>
          <th style="text-align:right;padding:9px 10px;font-weight:700;">ASP Change</th>
          <th style="text-align:left;padding:9px 10px;font-weight:700;">Verdict</th>
        </tr></thead>
        <tbody>${rows.map(r=>{
          const gColor=r.growth>50?'#10b981':r.growth>10?'#84cc16':r.growth>-10?'var(--text2)':'#ef4444';
          const aColor=r.aspChg>2?'#10b981':r.aspChg>-2?'var(--text2)':'#ef4444';
          return`<tr style="border-bottom:1px solid var(--border);">
            <td style="padding:8px 10px;font-weight:600;"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${catColor(r.cat)};margin-right:6px;"></span>${esc(CAT_SHORT[r.cat]||r.cat)}</td>
            <td style="text-align:right;padding:8px 10px;color:var(--text2);">${r.firstCount}</td>
            <td style="text-align:right;padding:8px 10px;font-weight:700;">${r.lastCount}</td>
            <td style="text-align:right;padding:8px 10px;font-weight:700;color:${gColor};">${r.growth>=0?'+':''}${r.growth.toFixed(0)}%</td>
            <td style="text-align:right;padding:8px 10px;color:var(--text2);">${r.firstASP?fmtASP(r.firstASP):'—'}</td>
            <td style="text-align:right;padding:8px 10px;font-weight:700;">${r.lastASP?fmtASP(r.lastASP):'—'}</td>
            <td style="text-align:right;padding:8px 10px;font-weight:700;color:${aColor};">${r.firstASP&&r.lastASP?(r.aspChg>=0?'+':'')+r.aspChg.toFixed(1)+'%':'—'}</td>
            <td style="padding:8px 10px;"><span style="background:${r.vColor}22;color:${r.vColor};padding:2px 9px;border-radius:12px;font-weight:600;font-size:11px;">${r.verdict}</span></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
  }

  // ═══════════════════════════════════════════════════════
  // 4. ASP DECOMPOSITION — the math
  // ═══════════════════════════════════════════════════════
  function renderDecomposition(){
    const el=document.getElementById('p4-decomp');if(!el)return;
    const cases=getAllCases();
    if(!cases.length){el.innerHTML='';return;}

    const months=[...new Set(cases.map(c=>c.ym))].sort();
    const firstYm=months[0],lastYm=months[months.length-1];
    const firstCases=cases.filter(c=>c.ym===firstYm),lastCases=cases.filter(c=>c.ym===lastYm);
    const firstASP=avg(firstCases.map(c=>c.approvalAmount));
    const lastASP=avg(lastCases.map(c=>c.approvalAmount));
    const totalChg=lastASP-firstASP;

    // Decompose: per category contribution
    const cats=[...RELEVANT_CATS,'OTHERS'].filter(c=>selectedCats.includes(c));
    const contribs=cats.map(cat=>{
      const fCases=firstCases.filter(c=>c.cat===cat);
      const lCases=lastCases.filter(c=>c.cat===cat);
      const fShare=firstCases.length?fCases.length/firstCases.length:0;
      const lShare=lastCases.length?lCases.length/lastCases.length:0;
      const fASP=avg(fCases.map(c=>c.approvalAmount));
      const lASP=avg(lCases.map(c=>c.approvalAmount));
      // Mix effect: (lShare - fShare) * ((fASP+lASP)/2)
      const mixEffect=(lShare-fShare)*((fASP+lASP)/2);
      // Rate effect: fShare * (lASP - fASP)  -- weighted by original share
      const rateEffect=fShare*(lASP-fASP);
      return{cat,mixEffect,rateEffect,fShare:fShare*100,lShare:lShare*100,fASP:Math.round(fASP),lASP:Math.round(lASP)};
    });

    const totalMix=sum(contribs.map(c=>c.mixEffect));
    const totalRate=sum(contribs.map(c=>c.rateEffect));

    el.innerHTML=`
      <div style="background:var(--surface2);border-radius:var(--r);padding:16px 18px;">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:10px;">Why did ASP change from ${fmtASP(Math.round(firstASP))} to ${fmtASP(Math.round(lastASP))}?</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px;">
          <div style="background:${totalMix<0?'#fef2f2':'#f0fdf4'};border-left:3px solid ${totalMix<0?'#ef4444':'#10b981'};border-radius:0 6px 6px 0;padding:10px 12px;">
            <div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase;">Mix Effect</div>
            <div style="font-size:20px;font-weight:800;color:${totalMix<0?'#ef4444':'#10b981'};">${totalMix>=0?'+':''}${fmtASP(Math.round(totalMix))}</div>
            <div style="font-size:11px;color:var(--text2);">Case composition shifted</div>
          </div>
          <div style="background:${totalRate<0?'#fef2f2':'#f0fdf4'};border-left:3px solid ${totalRate<0?'#ef4444':'#10b981'};border-radius:0 6px 6px 0;padding:10px 12px;">
            <div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase;">Rate Effect</div>
            <div style="font-size:20px;font-weight:800;color:${totalRate<0?'#ef4444':'#10b981'};">${totalRate>=0?'+':''}${fmtASP(Math.round(totalRate))}</div>
            <div style="font-size:11px;color:var(--text2);">Per-category ASP changed</div>
          </div>
          <div style="background:#f8fafc;border-left:3px solid #64748b;border-radius:0 6px 6px 0;padding:10px 12px;">
            <div style="font-size:10px;color:var(--text3);font-weight:700;text-transform:uppercase;">Total Change</div>
            <div style="font-size:20px;font-weight:800;color:${totalChg<0?'#ef4444':'#10b981'};">${totalChg>=0?'+':''}${fmtASP(Math.round(totalChg))}</div>
            <div style="font-size:11px;color:var(--text2);">${totalMix<0&&totalRate>0?'Mix shift dominating':totalMix>0&&totalRate<0?'Rate decline dominating':'Both moving together'}</div>
          </div>
        </div>
        <div style="font-size:11px;color:var(--text2);line-height:1.7;padding:10px 12px;background:#f8fafc;border-radius:6px;">
          <strong>How to read this:</strong> Mix effect = ASP change from cases shifting between categories.
          Rate effect = ASP change from each category getting paid differently.
          ${Math.abs(totalMix)>Math.abs(totalRate)?'Since <strong>mix effect is bigger</strong>, the problem is WHAT cases you\'re doing, not HOW MUCH you\'re getting paid per case.':'Since <strong>rate effect is bigger</strong>, the problem is per-case pricing/approvals, not case mix.'}
        </div>
      </div>`;
  }

  // ═══════════════════════════════════════════════════════
  // 5. CATEGORY DEEP DIVE — sparkline strip per category
  // ═══════════════════════════════════════════════════════
  function renderCategoryStrip(){
    const el=document.getElementById('p4-cat-strip');if(!el)return;
    const cases=getAllCases();
    if(!cases.length){el.innerHTML='';return;}

    const months=[...new Set(cases.map(c=>c.ym))].sort();
    const cats=[...RELEVANT_CATS,'OTHERS'].filter(c=>selectedCats.includes(c));

    const catData=cats.map(cat=>{
      const monthly=months.map(m=>{
        const mc=cases.filter(c=>c.ym===m&&c.cat===cat);
        return{ym:m,count:mc.length,asp:mc.length?Math.round(avg(mc.map(c=>c.approvalAmount))):0};
      });
      const totalCases=sum(monthly.map(m=>m.count));
      return{cat,monthly,totalCases};
    }).sort((a,b)=>b.totalCases-a.totalCases);

    function drawSpark(vals,color,fmt){
      const w=180,h=40;
      const max=Math.max(...vals,1);
      const min=Math.min(...vals,0);
      const range=max-min||1;
      const pts=vals.map((v,i)=>`${i*(w/(vals.length-1||1))},${h-(v-min)/range*(h-6)-3}`).join(' ');
      const dots=vals.map((v,i)=>{
        const x=i*(w/(vals.length-1||1)),y=h-(v-min)/range*(h-6)-3;
        return`<circle cx="${x}" cy="${y}" r="2" fill="${color}"/>`;
      }).join('');
      // Only label first, middle, last
      const iFirst=0,iLast=vals.length-1,iMid=Math.floor(vals.length/2);
      const labels=[iFirst,iMid,iLast].filter((v,i,a)=>a.indexOf(v)===i&&v<vals.length).map(i=>{
        const x=i*(w/(vals.length-1||1)),y=h-(vals[i]-min)/range*(h-6)-6;
        return`<text x="${x}" y="${y}" text-anchor="middle" font-size="8" fill="${color}" font-weight="700">${fmt(vals[i])}</text>`;
      }).join('');
      return`<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:${h}px;">
        <polyline points="${pts}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
        ${dots}${labels}
      </svg>`;
    }

    el.innerHTML=catData.map(d=>{
      const color=catColor(d.cat);
      const firstCount=d.monthly[0].count,lastCount=d.monthly[d.monthly.length-1].count;
      const firstASP=d.monthly.filter(m=>m.asp)[0]?.asp||0;
      const lastASP=d.monthly[d.monthly.length-1].asp||0;
      const growthPct=firstCount?((lastCount-firstCount)/firstCount*100):0;
      const aspPct=firstASP?((lastASP-firstASP)/firstASP*100):0;
      return`<div style="background:var(--surface2);border-radius:var(--r);padding:12px 14px;display:grid;grid-template-columns:150px 1fr 1fr;gap:16px;align-items:center;border-left:3px solid ${color};">
        <div>
          <div style="font-size:12px;font-weight:800;color:var(--text);">${esc(CAT_SHORT[d.cat]||d.cat)}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px;">${d.totalCases} total cases</div>
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:2px;">
            <span>Cases: ${firstCount} → <strong style="color:${growthPct>=0?'#10b981':'#ef4444'};">${lastCount}</strong></span>
            <span style="color:${growthPct>=0?'#10b981':'#ef4444'};font-weight:700;">${growthPct>=0?'+':''}${growthPct.toFixed(0)}%</span>
          </div>
          ${drawSpark(d.monthly.map(m=>m.count),color,v=>v)}
        </div>
        <div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-bottom:2px;">
            <span>ASP: ${fmtASP(firstASP)} → <strong style="color:${aspPct>=0?'#10b981':'#ef4444'};">${fmtASP(lastASP)}</strong></span>
            <span style="color:${aspPct>=0?'#10b981':'#ef4444'};font-weight:700;">${aspPct>=0?'+':''}${aspPct.toFixed(1)}%</span>
          </div>
          ${drawSpark(d.monthly.map(m=>m.asp).filter(v=>v>0),color,v=>fmtASP(v).replace('₹',''))}
        </div>
      </div>`;
    }).join('');
  }

  // ═══════════════════════════════════════════════════════
  // FILTERS
  // ═══════════════════════════════════════════════════════
  function renderFilters(){
    // Category pills
    const catEl=document.getElementById('p4-cat-filter');
    if(catEl){
      const allCats=[...RELEVANT_CATS,'OTHERS'];
      catEl.innerHTML=allCats.map(cat=>{
        const active=selectedCats.includes(cat);
        return`<button onclick="PAGE4._toggleCat('${cat}')" style="padding:5px 12px;border-radius:20px;border:1.5px solid ${active?catColor(cat):'var(--border)'};background:${active?catColor(cat)+'18':'transparent'};font-size:11px;font-weight:600;cursor:pointer;color:${active?catColor(cat):'var(--text2)'};white-space:nowrap;display:inline-flex;align-items:center;gap:5px;">
          <span style="width:6px;height:6px;border-radius:50%;background:${catColor(cat)};"></span>
          ${esc(CAT_SHORT[cat]||cat)}
        </button>`;
      }).join('');
    }
    // City pills
    const cityEl=document.getElementById('p4-city-filter');
    if(cityEl){
      const cities=getCities();
      cityEl.innerHTML=cities.map(city=>{
        const active=selectedCities.includes(city);
        return`<button onclick="PAGE4._toggleCity('${city}')" style="padding:5px 12px;border-radius:20px;border:1.5px solid ${active?'#0ea5e9':'var(--border)'};background:${active?'#e0f2fe':'transparent'};font-size:11px;font-weight:600;cursor:pointer;color:${active?'#0369a1':'var(--text2)'};white-space:nowrap;">
          ${esc(cityLabel(city))}
        </button>`;
      }).join('');
    }
  }

  function _toggleCat(cat){
    if(selectedCats.includes(cat)){if(selectedCats.length===1)return;selectedCats=selectedCats.filter(c=>c!==cat);}
    else{selectedCats=[...selectedCats,cat];}
    renderFilters();renderAll();
  }
  function _toggleCity(city){
    if(selectedCities.includes(city))selectedCities=selectedCities.filter(c=>c!==city);
    else selectedCities=[...selectedCities,city];
    renderFilters();renderAll();
  }
  function _resetFilters(){
    selectedCats=[...RELEVANT_CATS,'OTHERS'];
    selectedCities=[];
    renderFilters();renderAll();
  }

  // ═══════════════════════════════════════════════════════
  function renderAll(){
    renderHeadline();
    renderKeyChart();
    renderDecomposition();
    renderGrowthMatrix();
    renderCategoryStrip();
  }
  function init(){renderFilters();renderAll();onDataRefresh(()=>{renderFilters();renderAll();});}
  return{init,_toggleCat,_toggleCity,_resetFilters};
})();
