// ============================================================
// HEXA DASHBOARD — DATA LAYER
// Fetches, parses and normalizes both Google Sheet CSVs
// ============================================================

const DATA = {
  hospitals: [],      // normalized Sheet 1 rows
  aspCases: [],       // normalized Sheet 2 rows
  tpaNames: [],       // TPA column headers from Sheet 1
  insurerNames: [],   // Insurer column headers from Sheet 1
  lastUpdated: null,
  isLoading: false,
  callbacks: [],      // functions to call after refresh
};

// ── CSV parser (handles quoted fields with commas) ──────────
function parseCSV(text) {
  const rows = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = [];
    let cur = '', inQ = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQ && line[j+1] === '"') { cur += '"'; j++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        cols.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

// ── Parse amount string like "₹ 69,670.00" → number ────────
function parseAmount(str) {
  if (!str || str.trim() === '' || str.trim() === 'NaN') return null;
  const cleaned = str.replace(/[₹,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

// ── Normalize active status ──────────────────────────────────
function normalizeStatus(str) {
  if (!str) return 'Unknown';
  const s = str.trim().toLowerCase();
  if (s === 'active') return 'Active';
  if (s === 'inactive') return 'Inactive';
  return str.trim();
}

// ── Parse Sheet 1 — Hospital Network ────────────────────────
function parseHospitalNetwork(rows) {
  if (rows.length < 2) return [];

  const header = rows[0];

  // Extract TPA and Insurer column names from header
  DATA.tpaNames = header.slice(CONFIG.TPA_COL_START, CONFIG.TPA_COL_END + 1)
    .map(h => h.trim()).filter(Boolean);
  DATA.insurerNames = header.slice(CONFIG.INSURER_COL_START, CONFIG.INSURER_COL_END + 1)
    .map(h => h.trim()).filter(Boolean);

  const hospitals = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[3] || r[3].trim() === '') continue; // skip if no hospital name

    // Build TPA empanelment map
    const tpaMap = {};
    DATA.tpaNames.forEach((name, idx) => {
      const val = (r[CONFIG.TPA_COL_START + idx] || '').trim().toLowerCase();
      tpaMap[name] = val === 'yes';
    });

    // Build Insurer empanelment map
    const insurerMap = {};
    DATA.insurerNames.forEach((name, idx) => {
      const val = (r[CONFIG.INSURER_COL_START + idx] || '').trim().toLowerCase();
      insurerMap[name] = val === 'yes';
    });

    hospitals.push({
      city:           normalizeCity(r[0]),
      cityRaw:        (r[0] || '').trim(),
      area:           (r[1] || '').trim(),
      pinCode:        (r[2] || '').trim(),
      hospitalName:   (r[3] || '').trim(),
      activeStatus:   normalizeStatus(r[4]),
      mopStatus:      (r[5] || '').trim(),
      insComments:    (r[6] || '').trim(),
      cityComments:   (r[7] || '').trim(),
      doctorComments: (r[8] || '').trim(),
      tpa:            tpaMap,
      insurer:        insurerMap,
      // computed later
      aspData:        null,
      tier:           null,
      score:          null,
    });
  }

  return hospitals;
}

// ── Parse Sheet 2 — ASP Data ─────────────────────────────────
function parseASPData(rows) {
  if (rows.length < 2) return [];

  const header = rows[0].map(h => h.trim());
  const idx = {};
  header.forEach((h, i) => idx[h] = i);

  const cases = [];

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r[idx['Hospital Name']] || r[idx['Hospital Name']].trim() === '') continue;

    const proc = normalizeProcedure(r[idx['Procedure']] || '');
    const cat  = (r[idx['Category']] || '').trim();

    // Skip excluded categories
    if (!CONFIG.ACTIVE_CATEGORIES.includes(cat) &&
        !CONFIG.ACTIVE_CATEGORIES.some(ac => ac.toLowerCase() === cat.toLowerCase())) {
      // still include — filter happens at UI layer
    }

    const approvalAmount = parseAmount(r[idx['Approval Amount']]);

    cases.push({
      ipdId:           (r[idx['IPD ID']] || '').trim(),
      patientName:     (r[idx['Patient Name']] || '').trim(),
      category:        cat,
      mop:             (r[idx['Mode of Payment (MoP)']] || '').trim(),
      procedureRaw:    (r[idx['Procedure']] || '').trim(),
      procedureGroup:  proc.group,
      doa:             (r[idx['DOA']] || '').trim(),
      dod:             (r[idx['DOD']] || '').trim(),
      hospitalName:    (r[idx['Hospital Name']] || '').trim(),
      city:            normalizeCity(r[idx['City']] || ''),
      cityRaw:         (r[idx['City']] || '').trim(),
      cityBucket:      (r[idx['City Bucket']] || '').trim(),
      insuranceName:   (r[idx['Insurance Name']] || '').trim(),
      tpaName:         (r[idx['TPA Name']] || '').trim(),
      corporateType:   (r[idx['Corporate/Individual']] || '').trim(),
      gipsa:           (r[idx['GIPSA/Non GIPSA']] || '').trim(),
      dischargeStatus: (r[idx['Discharge Status']] || '').trim(),
      billAmount:      parseAmount(r[idx['Bill Amount']]),
      approvalAmount:  approvalAmount,   // ← ASP field
      settlementAmount:parseAmount(r[idx['Settlement Amount']]),
      ipdOwner:        (r[idx['IPD Owner Name']] || '').trim(),
    });
  }

  return cases;
}

// ── Fetch a CSV URL and return parsed rows ───────────────────
async function fetchCSV(url) {
  // Cache-bust to always get latest data
  const bustUrl = url + '&_cb=' + Date.now();
  const res = await fetch(bustUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching CSV`);
  const text = await res.text();
  return parseCSV(text);
}

// ── Enrich hospitals with ASP summary data ───────────────────
function enrichHospitals() {
  const cases = DATA.aspCases;
  const hospitals = DATA.hospitals;

  // Group ASP cases by normalized hospital name
  const casesByHospital = {};
  cases.forEach(c => {
    const key = c.hospitalName.toLowerCase().trim();
    if (!casesByHospital[key]) casesByHospital[key] = [];
    casesByHospital[key].push(c);
  });

  hospitals.forEach(h => {
    const key = h.hospitalName.toLowerCase().trim();
    const hCases = casesByHospital[key] || [];
    h.aspData = hCases;
    h.totalCases = hCases.length;

    const validASP = hCases.filter(c => c.approvalAmount !== null);
    h.avgASP = validASP.length
      ? validASP.reduce((s, c) => s + c.approvalAmount, 0) / validASP.length
      : null;
  });
}

// ── Compute city-level ASP averages for scoring ──────────────
function computeCityASPAverages() {
  const cityAvg = {};
  const cityGroups = {};

  DATA.aspCases.forEach(c => {
    if (c.approvalAmount === null) return;
    if (!cityGroups[c.city]) cityGroups[c.city] = [];
    cityGroups[c.city].push(c.approvalAmount);
  });

  Object.keys(cityGroups).forEach(city => {
    const vals = cityGroups[city];
    cityAvg[city] = vals.reduce((s, v) => s + v, 0) / vals.length;
  });

  return cityAvg;
}

// ── Score and tier hospitals ──────────────────────────────────
function scorehospitals() {
  const cityAvg = computeCityASPAverages();

  // For coverage score: max possible = total insurers + TPAs
  const maxCoverage = DATA.insurerNames.length + DATA.tpaNames.length;

  DATA.hospitals.forEach(h => {
    const cases = h.totalCases || 0;
    const asp   = h.avgASP;
    const city  = h.city;

    if (cases === 0 || asp === null) {
      h.score = null; h.tier = null; return;
    }

    // ASP score: ratio vs city average (capped 0–100)
    const cityMean = cityAvg[city] || asp;
    const aspScore = Math.min(100, (asp / cityMean) * 50 + 50);

    // Coverage score: % of insurers+TPAs empanelled
    const empanelledCount =
      Object.values(h.insurer).filter(Boolean).length +
      Object.values(h.tpa).filter(Boolean).length;
    const coverageScore = maxCoverage > 0
      ? (empanelledCount / maxCoverage) * 100 : 0;

    // Volume score: relative to max cases across all hospitals (capped 100)
    const maxCases = Math.max(...DATA.hospitals.map(x => x.totalCases || 0));
    const volumeScore = maxCases > 0 ? (cases / maxCases) * 100 : 0;

    // Composite score
    const score =
      aspScore      * CONFIG.SCORE_WEIGHT_ASP +
      coverageScore * CONFIG.SCORE_WEIGHT_COVERAGE +
      volumeScore   * CONFIG.SCORE_WEIGHT_VOLUME;

    h.score = Math.round(score);

    // Tier assignment
    if (cases >= CONFIG.TIER_MIN_CASES) {
      if (score >= CONFIG.TIER_GOLD)        h.tier = 'Gold';
      else if (score >= CONFIG.TIER_SILVER) h.tier = 'Silver';
      else if (score >= CONFIG.TIER_BRONZE) h.tier = 'Bronze';
      else                                   h.tier = null;
    } else if (
      cases <= CONFIG.UNDERUTILIZED_MAX_CASES &&
      aspScore >= CONFIG.UNDERUTILIZED_MIN_ASP_SCORE
    ) {
      h.tier = 'Underutilized';
    } else {
      h.tier = null;
    }
  });
}

// ── Cross-check empanelment: Sheet1 says No but cases exist ──
function crossCheckEmpanelment() {
  const casesByHospital = {};
  DATA.aspCases.forEach(c => {
    const key = c.hospitalName.toLowerCase().trim();
    if (!casesByHospital[key]) casesByHospital[key] = [];
    casesByHospital[key].push(c);
  });

  DATA.hospitals.forEach(h => {
    const key = h.hospitalName.toLowerCase().trim();
    const hCases = casesByHospital[key] || [];
    h.empanelmentFlags = {};

    // Check insurers
    DATA.insurerNames.forEach(ins => {
      if (!h.insurer[ins]) {
        const hasCases = hCases.some(c =>
          c.insuranceName.toLowerCase().trim() === ins.toLowerCase().trim()
        );
        if (hasCases) h.empanelmentFlags[ins] = 'insurer';
      }
    });

    // Check TPAs
    DATA.tpaNames.forEach(tpa => {
      if (!h.tpa[tpa]) {
        const hasCases = hCases.some(c =>
          c.tpaName.toLowerCase().trim() === tpa.toLowerCase().trim()
        );
        if (hasCases) h.empanelmentFlags[tpa] = 'tpa';
      }
    });
  });
}

// ── Main refresh function ────────────────────────────────────
async function refreshData() {
  if (DATA.isLoading) return;
  DATA.isLoading = true;

  try {
    const [sheet1Rows, sheet2Rows] = await Promise.all([
      fetchCSV(CONFIG.SHEET_HOSPITAL_NETWORK),
      fetchCSV(CONFIG.SHEET_ASP_DATA),
    ]);

    DATA.hospitals = parseHospitalNetwork(sheet1Rows);
    DATA.aspCases  = parseASPData(sheet2Rows);

    enrichHospitals();
    scorehospitals();
    crossCheckEmpanelment();

    DATA.lastUpdated = new Date();
    DATA.isLoading   = false;

    // Notify all registered callbacks
    DATA.callbacks.forEach(fn => fn());

    console.log(`[Hexa] Data refreshed: ${DATA.hospitals.length} hospitals, ${DATA.aspCases.length} ASP cases`);

  } catch (err) {
    DATA.isLoading = false;
    console.error('[Hexa] Data refresh failed:', err);
    throw err;
  }
}

// ── Register a callback for when data refreshes ──────────────
function onDataRefresh(fn) {
  DATA.callbacks.push(fn);
}

// ── Start auto-refresh ───────────────────────────────────────
function startAutoRefresh() {
  setInterval(() => {
    refreshData().catch(err => console.warn('[Hexa] Auto-refresh error:', err));
  }, CONFIG.REFRESH_INTERVAL);
}

// ── Query helpers ────────────────────────────────────────────

// Get all unique cities from ASP data
function getCities() {
  const set = new Set(DATA.aspCases.map(c => c.city).filter(Boolean));
  return [...set].sort();
}

// Get all unique insurers from ASP data
function getInsurers() {
  const set = new Set(DATA.aspCases.map(c => c.insuranceName).filter(Boolean));
  return [...set].sort();
}

// Get all unique TPAs from ASP data
function getTPAs() {
  const set = new Set(DATA.aspCases.map(c => c.tpaName).filter(Boolean));
  return [...set].sort();
}

// Get procedures for a given category
function getProceduresForCategory(category) {
  if (!category) {
    const all = new Set(DATA.aspCases.map(c => c.procedureGroup).filter(Boolean));
    return [...all].sort();
  }
  const set = new Set(
    DATA.aspCases
      .filter(c => c.category.toLowerCase() === category.toLowerCase())
      .map(c => c.procedureGroup)
      .filter(Boolean)
  );
  return [...set].sort();
}

// Get top recommended hospitals for a given filter combination
function getRecommendations({ city, insurer, tpa, category, procedure, topN = 5 }) {
  let cases = DATA.aspCases;

  if (city)      cases = cases.filter(c => c.city === city);
  if (insurer)   cases = cases.filter(c => c.insuranceName.toLowerCase() === insurer.toLowerCase());
  if (tpa)       cases = cases.filter(c => c.tpaName.toLowerCase() === tpa.toLowerCase());
  if (category)  cases = cases.filter(c => c.category.toLowerCase() === category.toLowerCase());
  if (procedure) cases = cases.filter(c => c.procedureGroup === procedure);

  // Group by hospital
  const byHospital = {};
  cases.forEach(c => {
    const key = c.hospitalName;
    if (!byHospital[key]) byHospital[key] = [];
    byHospital[key].push(c);
  });

  // Compute stats per hospital
  const results = Object.entries(byHospital).map(([name, hCases]) => {
    const validASP = hCases.filter(c => c.approvalAmount !== null);
    const avgASP = validASP.length
      ? validASP.reduce((s, c) => s + c.approvalAmount, 0) / validASP.length
      : null;

    // Last case date
    const dates = hCases.map(c => c.dod || c.doa).filter(Boolean);
    const lastCase = dates.length ? dates.sort().pop() : null;

    return {
      hospitalName: name,
      caseCount:    hCases.length,
      avgASP,
      lastCaseDate: lastCase,
    };
  });

  // Sort by avgASP descending
  results.sort((a, b) => (b.avgASP || 0) - (a.avgASP || 0));

  return results.slice(0, topN);
}

// Get ASP trend data grouped by month
function getASPTrend({ city, insurer, tpa, category, procedure, year } = {}) {
  let cases = DATA.aspCases.filter(c => c.approvalAmount !== null);

  if (city)      cases = cases.filter(c => c.city === city);
  if (insurer)   cases = cases.filter(c => c.insuranceName.toLowerCase() === insurer.toLowerCase());
  if (tpa)       cases = cases.filter(c => c.tpaName.toLowerCase() === tpa.toLowerCase());
  if (category)  cases = cases.filter(c => c.category.toLowerCase() === category.toLowerCase());
  if (procedure) cases = cases.filter(c => c.procedureGroup === procedure);
  if (year)      cases = cases.filter(c => c.doa && c.doa.includes(year));

  // Group by month
  const monthly = {};
  cases.forEach(c => {
    if (!c.doa) return;
    const d = new Date(c.doa);
    if (isNaN(d)) return;
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    if (!monthly[key]) monthly[key] = [];
    monthly[key].push(c.approvalAmount);
  });

  return Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({
      month,
      avgASP: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
      count: vals.length,
    }));
}

// Compare two hospitals head to head
function compareHospitals(hospitalA, hospitalB, filters = {}) {
  function getStats(name) {
    let cases = DATA.aspCases.filter(
      c => c.hospitalName.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (filters.category) cases = cases.filter(c => c.category.toLowerCase() === filters.category.toLowerCase());
    if (filters.procedure) cases = cases.filter(c => c.procedureGroup === filters.procedure);

    const validASP = cases.filter(c => c.approvalAmount !== null);
    const avgASP = validASP.length
      ? validASP.reduce((s, c) => s + c.approvalAmount, 0) / validASP.length
      : null;

    const dates = cases.map(c => c.dod || c.doa).filter(Boolean).sort();
    const lastCase = dates.length ? dates[dates.length - 1] : null;

    // Top procedures
    const procCount = {};
    cases.forEach(c => {
      procCount[c.procedureGroup] = (procCount[c.procedureGroup] || 0) + 1;
    });
    const topProcs = Object.entries(procCount)
      .sort(([,a],[,b]) => b - a)
      .slice(0, 3)
      .map(([p, n]) => ({ procedure: p, count: n }));

    // Business score: ASP × cases (higher = more valuable)
    const businessScore = avgASP ? Math.round(avgASP * cases.length) : 0;

    return {
      hospitalName: name,
      totalCases: cases.length,
      avgASP: avgASP ? Math.round(avgASP) : null,
      lastCaseDate: lastCase,
      topProcedures: topProcs,
      businessScore,
    };
  }

  const a = getStats(hospitalA);
  const b = getStats(hospitalB);
  const recommended = a.businessScore >= b.businessScore ? hospitalA : hospitalB;

  return { a, b, recommended };
}

// Get supply gap analysis for a city + insurer combination
function getSupplyGaps({ city, insurer, tpa } = {}) {
  let hospitals = DATA.hospitals;
  if (city) hospitals = hospitals.filter(h => h.city === city);

  const activeHospitals = hospitals.filter(h => h.activeStatus === 'Active');
  const totalActive = activeHospitals.length;

  const gaps = [];

  const insurersToCheck = insurer ? [insurer] : DATA.insurerNames.slice(0, 10);

  insurersToCheck.forEach(ins => {
    const empanelled = activeHospitals.filter(h => h.insurer[ins]);
    const gap = totalActive - empanelled.length;
    gaps.push({
      insurer: ins,
      totalActive,
      empanelled: empanelled.length,
      gap,
      gapPct: totalActive > 0 ? Math.round((gap / totalActive) * 100) : 0,
    });
  });

  return gaps.sort((a, b) => b.gap - a.gap);
}
