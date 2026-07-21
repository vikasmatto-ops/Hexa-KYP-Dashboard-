// ============================================================
// PAGE 4 — INSIGHTS v5: Clean category comparison cards
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
  const CAT_ICONS = {
    'UROLOGY':'💧','PROCTOLOGY':'🩺','LAPAROSCOPY':'⚕️',
    'AESTHETICS / PLASTIC SURGERY':'✨','KIDNEY STONE':'🪨',
    'VASCULAR':'❤️','OTHERS':'🏥'
  };
  const CAT_SHORT = {
    'UROLOGY':'Urology','PROCTOLOGY':'Proctology','LAPAROSCOPY':'Laparoscopy',
    'AESTHETICS / PLASTIC SURGERY':'Aesthetics','KIDNEY STONE':'Kidney Stone',
    'VASCULAR':'Vascular','OTHERS':'Others'
  };
  const MN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  let mode = 'yearly';
  let selectedCities = [];

  function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):''}
  function fmtASP(n){if(!n&&n!==0)return'—';const a=Math.abs(n);if(a>=100000)return(n<0?'-':'')+'₹'+(a/100000).toFixed(2)+'L';if(a>=1000)return(n<0?'-':'')+'₹'+Math.round(a).toLocaleString('en-IN');return(n<0?'-':'')+'₹'+Math.round(a);}
  function fmtCases(n){return n.toLocaleString('en-IN');}
  function avg(arr){return arr.length?arr.reduce((s,v)=>s+v,0)/arr.length:0;}
  function cityLabel(c){return CONFIG.CITY_DISPLAY[c]||c.charAt(0).toUpperCase()+c.slice(1);}
  function caseDate(c){return c.dodParsed||c.doaParsed||null;}
  function catColor(cat){return CAT_COLORS[(cat||'').toUpperCase()]||'#94a3b8';}
  function normCat(cat){const u=(cat||'').trim().toUpperCase();return CAT_MAP[u]||'OTHERS';}

  function getAllCases(){
    return DATA.aspCases.filter(c=>{
      const dt=caseDate(c);
      if(!dt||c.approvalAmount===null)return false;
      if(selectedCities.length>0&&!selectedCities.includes(c.city))return false;
      return true;
    }).map(c=>{
      const dt=caseDate(c);
      return{...c,dt,cat:normCat(c.category),yr:dt.getFullYear(),mo:dt.getMonth()+1,day:dt.getDate(),qtr:Math.ceil((dt.getMonth()+1)/3),ym:`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}`};
    });
  }

  // Compute cur + prev periods based on mode (fair like-for-like)
  function getPeriods(cases){
    if(!cases.length)return{cur:[],prev:[],curLabel:'—',prevLabel:'—'};
    const now=new Date();
    const nowYr=now.getFullYear(),nowMo=now.getMonth()+1,nowDay=now.getDate();

    // Find latest data month
    const latestYm=[...new Set(cases.map(c=>c.ym))].sort().slice(-1)[0];
    const [lyr,lmo]=[parseInt(latestYm.split('-')[0]),parseInt(latestYm.split('-')[1])];

    let curF,prevF,curLabel,prevLabel;

    if(mode==='monthly'){
      curF=c=>c.yr===lyr&&c.mo===lmo;
      const pm=lmo===1?12:lmo-1,py=lmo===1?lyr-1:lyr;
      prevF=c=>c.yr===py&&c.mo===pm;
      curLabel=MN[lmo-1]+" '"+String(lyr).slice(2);
      prevLabel=MN[pm-1]+" '"+String(py).slice(2);
    } else if(mode==='quarterly'){
      const cq=Math.ceil(lmo/3);
      curF=c=>c.yr===lyr&&c.qtr===cq;
      const pq=cq===1?4:cq-1,py=cq===1?lyr-1:lyr;
      prevF=c=>c.yr===py&&c.qtr===pq;
      curLabel=`Q${cq} '${String(lyr).slice(2)}`;
      prevLabel=`Q${pq} '${String(py).slice(2)}`;
    } else if(mode==='yearly'||mode==='ytd'){
      // Fair YTD compare: Jan-latest month, current year vs prev year
      curF=c=>c.yr===lyr&&c.mo<=lmo;
      prevF=c=>c.yr===lyr-1&&c.mo<=lmo;
      const fromLbl='Jan',toLbl=MN[lmo-1];
      curLabel=`${fromLbl}–${toLbl} '${String(lyr).slice(2)}`;
      prevLabel=`${fromLbl}–${toLbl} '${String(lyr-1).slice(2)}`;
    } else if(mode==='mtd'){
      // Current month partial vs prev month same day
      curF=c=>c.yr===lyr&&c.mo===lmo&&c.day<=nowDay;
      const pm=lmo===1?12:lmo-1,py=lmo===1?lyr-1:lyr;
      prevF=c=>c.yr===py&&c.mo===pm&&c.day<=nowDay;
      curLabel=`MTD ${MN[lmo-1]} (day 1–${nowDay})`;
      prevLabel=`MTD ${MN[pm-1]} (day 1–${nowDay})`;
    }

    return{cur:cases.filter(curF),prev:cases.filter(prevF),curLabel,prevLabel};
  }

  // ══════════════════════════════════════════════════════════
  // HEADLINE
  // ══════════════════════════════════════════════════════════
  function renderHeadline(){
    const el=document.getElementById('p4-headline');if(!el)return;
    const cases=getAllCases();
    const{cur,prev,curLabel,prevLabel}=getPeriods(cases);
    if(!cur.length||!prev.length){el.innerHTML='<div style="padding:14px;color:var(--text3);">Not enough data for comparison.</div>';return;}

    // Overall metrics
    const curTot=cur.length,prevTot=prev.length;
    const caseGrowth=prevTot?((curTot-prevTot)/prevTot*100):0;
    const curASP=avg(cur.map(c=>c.approvalAmount)),prevASP=avg(prev.map(c=>c.approvalAmount));
    const aspGrowth=prevASP?((curASP-prevASP)/prevASP*100):0;

    // Urology drill
    const uCur=cur.filter(c=>c.cat==='UROLOGY').length;
    const uPrev=prev.filter(c=>c.cat==='UROLOGY').length;
    const uGrowth=uPrev?((uCur-uPrev)/uPrev*100):0;

    // Non-Urology growth
    const nCur=cur.filter(c=>c.cat!=='UROLOGY').length;
    const nPrev=prev.filter(c=>c.cat!=='UROLOGY').length;
    const nGrowth=nPrev?((nCur-nPrev)/nPrev*100):0;

    el.innerHTML=`<div style="background:linear-gradient(135deg,#0f172a 0%,#1e40af 50%,#0ea5e9 100%);border-radius:16px;padding:24px 28px;color:#fff;box-shadow:0 4px 20px rgba(15,23,42,.15);">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <div style="font-size:11px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;opacity:.75;margin-bottom:6px;">Comparison window</div>
          <div style="font-size:16px;font-weight:600;">${esc(prevLabel)} <span style="opacity:.5;">→</span> ${esc(curLabel)}</div>
        </div>
        <div style="background:rgba(255,255,255,.14);border-radius:20px;padding:5px 12px;font-size:11px;font-weight:600;letter-spacing:.3px;">
          ${selectedCities.length===0?'All cities':selectedCities.length+' cit'+(selectedCities.length===1?'y':'ies')+' selected'}
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:16px;">
        <div style="background:rgba(255,255,255,.12);backdrop-filter:blur(10px);border-radius:12px;padding:14px 16px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;opacity:.75;margin-bottom:4px;">Total Cases</div>
          <div style="font-size:24px;font-weight:800;letter-spacing:-.5px;">${fmtCases(curTot)}</div>
          <div style="font-size:12px;font-weight:600;color:${caseGrowth>=0?'#86efac':'#fca5a5'};margin-top:2px;">${caseGrowth>=0?'↑':'↓'} ${Math.abs(caseGrowth).toFixed(1)}% <span style="opacity:.7;font-weight:400;">vs ${fmtCases(prevTot)}</span></div>
        </div>
        <div style="background:rgba(255,255,255,.12);backdrop-filter:blur(10px);border-radius:12px;padding:14px 16px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;opacity:.75;margin-bottom:4px;">Average ASP</div>
          <div style="font-size:24px;font-weight:800;letter-spacing:-.5px;">${fmtASP(Math.round(curASP))}</div>
          <div style="font-size:12px;font-weight:600;color:${aspGrowth>=0?'#86efac':'#fca5a5'};margin-top:2px;">${aspGrowth>=0?'↑':'↓'} ${Math.abs(aspGrowth).toFixed(1)}% <span style="opacity:.7;font-weight:400;">vs ${fmtASP(Math.round(prevASP))}</span></div>
        </div>
        <div style="background:rgba(255,255,255,.12);backdrop-filter:blur(10px);border-radius:12px;padding:14px 16px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;opacity:.75;margin-bottom:4px;">Urology Growth</div>
          <div style="font-size:24px;font-weight:800;letter-spacing:-.5px;color:#86efac;">${uGrowth>=0?'+':''}${uGrowth.toFixed(0)}%</div>
          <div style="font-size:12px;font-weight:500;margin-top:2px;opacity:.85;">${fmtCases(uPrev)} → ${fmtCases(uCur)} cases</div>
        </div>
        <div style="background:rgba(255,255,255,.12);backdrop-filter:blur(10px);border-radius:12px;padding:14px 16px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;opacity:.75;margin-bottom:4px;">Everyone Else</div>
          <div style="font-size:24px;font-weight:800;letter-spacing:-.5px;color:${nGrowth>=0?'#86efac':'#fca5a5'};">${nGrowth>=0?'+':''}${nGrowth.toFixed(0)}%</div>
          <div style="font-size:12px;font-weight:500;margin-top:2px;opacity:.85;">${fmtCases(nPrev)} → ${fmtCases(nCur)} cases</div>
        </div>
      </div>

      <div style="background:rgba(0,0,0,.15);border-radius:10px;padding:12px 16px;font-size:13px;line-height:1.6;font-weight:500;">
        <span style="opacity:.75;font-size:11px;text-transform:uppercase;letter-spacing:.5px;font-weight:700;margin-right:4px;">Insight</span>
        Urology grew <strong style="color:#86efac;">${uGrowth>=0?'+':''}${uGrowth.toFixed(0)}%</strong> while all other categories combined grew <strong style="color:${nGrowth>=0?'#86efac':'#fca5a5'};">${nGrowth>=0?'+':''}${nGrowth.toFixed(0)}%</strong>. At ₹40K avg ASP, Urology's disproportionate growth is dragging total ASP <strong style="color:#fca5a5;">down ${Math.abs(aspGrowth).toFixed(1)}%</strong>.
      </div>
    </div>`;
  }

  // ══════════════════════════════════════════════════════════
  // CATEGORY CARDS
  // ══════════════════════════════════════════════════════════
  function renderCategoryCards(){
    const el=document.getElementById('p4-cat-cards');if(!el)return;
    const cases=getAllCases();
    const{cur,prev,curLabel,prevLabel}=getPeriods(cases);
    if(!cur.length||!prev.length){el.innerHTML='';return;}

    const cats=[...RELEVANT_CATS,'OTHERS'];
    const data=cats.map(cat=>{
      const cc=cur.filter(c=>c.cat===cat),pc=prev.filter(c=>c.cat===cat);
      const curCount=cc.length,prevCount=pc.length;
      const curASP=avg(cc.map(c=>c.approvalAmount)),prevASP=avg(pc.map(c=>c.approvalAmount));
      const caseGrowth=prevCount?((curCount-prevCount)/prevCount*100):(curCount?100:0);
      const aspGrowth=prevASP?((curASP-prevASP)/prevASP*100):0;
      return{cat,curCount,prevCount,curASP:Math.round(curASP),prevASP:Math.round(prevASP),caseGrowth,aspGrowth};
    }).sort((a,b)=>b.curCount-a.curCount);

    el.innerHTML=data.map(d=>{
      const color=catColor(d.cat);
      const isBig=d.cat==='UROLOGY';
      const caseColor=d.caseGrowth>0?'#059669':d.caseGrowth<0?'#dc2626':'#64748b';
      const aspColor=d.aspGrowth>0?'#059669':d.aspGrowth<0?'#dc2626':'#64748b';
      return`<div style="background:#fff;border-radius:16px;border:0.5px solid #e2e8f0;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.04);transition:transform .15s,box-shadow .15s;" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,.08)';" onmouseout="this.style.transform='none';this.style.boxShadow='0 1px 3px rgba(0,0,0,.04)';">
        <div style="background:linear-gradient(135deg,${color}12,${color}03);padding:14px 16px 12px;border-bottom:0.5px solid #f1f5f9;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-size:16px;">${CAT_ICONS[d.cat]||''}</span>
            <div style="font-size:13px;font-weight:700;color:#0f172a;">${esc(CAT_SHORT[d.cat]||d.cat)}</div>
          </div>
        </div>

        <div style="padding:14px 16px;">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;padding-bottom:12px;border-bottom:1px dashed #e2e8f0;">
            <div>
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#94a3b8;margin-bottom:4px;">${esc(prevLabel)}</div>
              <div style="font-size:16px;font-weight:700;color:#64748b;line-height:1.1;">${fmtCases(d.prevCount)}</div>
              <div style="font-size:11px;color:#64748b;margin-top:2px;">${d.prevASP?fmtASP(d.prevASP):'—'}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:${color};margin-bottom:4px;">${esc(curLabel)}</div>
              <div style="font-size:20px;font-weight:800;color:${color};line-height:1.1;letter-spacing:-.5px;">${fmtCases(d.curCount)}</div>
              <div style="font-size:12px;font-weight:600;color:#0f172a;margin-top:2px;">${d.curASP?fmtASP(d.curASP):'—'}</div>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
            <div style="background:${d.caseGrowth>0?'#f0fdf4':d.caseGrowth<0?'#fef2f2':'#f8fafc'};border-radius:8px;padding:8px 10px;text-align:center;">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:${caseColor};opacity:.85;">Cases</div>
              <div style="font-size:18px;font-weight:800;color:${caseColor};letter-spacing:-.3px;line-height:1.1;margin-top:2px;">${d.caseGrowth>=0?'+':''}${d.caseGrowth.toFixed(d.caseGrowth>=100?0:1)}%</div>
            </div>
            <div style="background:${d.aspGrowth>0?'#f0fdf4':d.aspGrowth<0?'#fef2f2':'#f8fafc'};border-radius:8px;padding:8px 10px;text-align:center;">
              <div style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;color:${aspColor};opacity:.85;">ASP</div>
              <div style="font-size:18px;font-weight:800;color:${aspColor};letter-spacing:-.3px;line-height:1.1;margin-top:2px;">${d.aspGrowth>=0?'+':''}${d.aspGrowth.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  // ══════════════════════════════════════════════════════════
  // FILTERS
  // ══════════════════════════════════════════════════════════
  function renderFilters(){
    const modeEl=document.getElementById('p4-mode');
    if(modeEl){
      const modes=[['monthly','Monthly'],['quarterly','Quarterly'],['yearly','Yearly'],['mtd','MTD'],['ytd','YTD']];
      modeEl.innerHTML=modes.map(([m,l])=>`<button onclick="PAGE4._setMode('${m}')" style="padding:6px 14px;border-radius:22px;border:1.5px solid ${mode===m?'#0ea5e9':'#e2e8f0'};background:${mode===m?'linear-gradient(135deg,#0ea5e9,#0284c7)':'#fff'};font-size:12px;font-weight:600;cursor:pointer;color:${mode===m?'#fff':'#64748b'};transition:all .15s;box-shadow:${mode===m?'0 2px 8px rgba(14,165,233,.3)':'none'};">${l}</button>`).join('');
    }
    const cityEl=document.getElementById('p4-cities');
    if(cityEl){
      const cities=getCities();
      cityEl.innerHTML=`<button onclick="PAGE4._clearCities()" style="padding:6px 14px;border-radius:22px;border:1.5px solid ${selectedCities.length===0?'#0f172a':'#e2e8f0'};background:${selectedCities.length===0?'#0f172a':'#fff'};font-size:12px;font-weight:600;cursor:pointer;color:${selectedCities.length===0?'#fff':'#64748b'};">All Cities</button>`+
        cities.map(city=>{
          const active=selectedCities.includes(city);
          return`<button onclick="PAGE4._toggleCity('${city}')" style="padding:6px 14px;border-radius:22px;border:1.5px solid ${active?'#0ea5e9':'#e2e8f0'};background:${active?'#e0f2fe':'#fff'};font-size:12px;font-weight:${active?'700':'600'};cursor:pointer;color:${active?'#0369a1':'#64748b'};">${esc(cityLabel(city))}</button>`;
        }).join('');
    }
  }

  function _setMode(m){mode=m;renderFilters();renderAll();}
  function _toggleCity(c){if(selectedCities.includes(c))selectedCities=selectedCities.filter(x=>x!==c);else selectedCities=[...selectedCities,c];renderFilters();renderAll();}
  function _clearCities(){selectedCities=[];renderFilters();renderAll();}

  function renderAll(){renderHeadline();renderCategoryCards();}

  function init(){renderFilters();renderAll();onDataRefresh(()=>{renderFilters();renderAll();});}
  return{init,_setMode,_toggleCity,_clearCities};
})();
