// ============================================================
// HEXA DASHBOARD — CONFIG
// ============================================================

const CONFIG = {

  // Google Sheet CSV URLs
  SHEET_HOSPITAL_NETWORK: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrd9wkjq0MLRYCp5k2fBRnHdjOpeTgGuL6eLwIlQuAAdK0PsANa9zGiiF9Owh-BsC_sRPkdl1S0PC8/pub?gid=0&single=true&output=csv',
  SHEET_ASP_DATA:         'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrd9wkjq0MLRYCp5k2fBRnHdjOpeTgGuL6eLwIlQuAAdK0PsANa9zGiiF9Owh-BsC_sRPkdl1S0PC8/pub?gid=1167367380&single=true&output=csv',

  // Auto-refresh interval (ms) — 1 minute
  REFRESH_INTERVAL: 60000,

  // Gold / Silver / Bronze thresholds (composite score 0-100)
  TIER_GOLD:   70,
  TIER_SILVER: 45,
  TIER_BRONZE: 25,

  // Minimum cases for tier eligibility
  TIER_MIN_CASES: 20,

  // Underutilized: good ASP score but low volume
  UNDERUTILIZED_MAX_CASES: 15,
  UNDERUTILIZED_MIN_ASP_SCORE: 55,

  // Scoring weights
  SCORE_WEIGHT_ASP:      0.60,
  SCORE_WEIGHT_COVERAGE: 0.20,
  SCORE_WEIGHT_VOLUME:   0.20,

  // Delhi NCR city bucket — all these map to "Delhi NCR"
  DELHI_NCR_CITIES: [
    'delhi', 'new delhi', 'noida', 'gurugram', 'gurgaon',
    'faridabad', 'greater noida', 'ghaziabad'
  ],

  // City display name map (normalized city bucket key → display label)
  CITY_DISPLAY: {
    'delhi ncr':  'Delhi NCR',
    'delhi':      'Delhi NCR',
    'bangalore':  'Bangalore',
    'mumbai':     'Mumbai',
    'pune':       'Pune',
    'hyderabad':  'Hyderabad',
    'ahmedabad':  'Ahmedabad',
    'others':     'Others',
  },

  // TPA columns in Sheet 1 (0-indexed col numbers, J=9 to AA=26)
  TPA_COL_START: 9,
  TPA_COL_END:   26,

  // Insurer columns in Sheet 1 (AB=27 to AY=50)
  INSURER_COL_START: 27,
  INSURER_COL_END:   50,

  // Categories to show in filters (low-data ones excluded)
  ACTIVE_CATEGORIES: [
    'Aesthetics / Plastic Surgery',
    'ENT',
    'Laparoscopy',
    'Urology',
    'Proctology',
    'Orthopaedics',
    'Vascular',
    'Kidney Stone',
    'Gynaecology',
    'General Surgery',
  ],

};

// ============================================================
// PROCEDURE GROUPING MAP
// Raw procedure string (lowercase) → standardized group name
// ============================================================

const PROCEDURE_GROUPS = {

  // ── Aesthetics / Plastic Surgery ──────────────────────────
  'liposuction': 'Liposuction / Fat Removal',
  'fat removal': 'Liposuction / Fat Removal',
  'fat removal;six-pack (liposuction abdomen)': 'Liposuction / Fat Removal',
  'six-pack (liposuction abdomen)': 'Liposuction / Fat Removal',
  'body contouring': 'Liposuction / Fat Removal',

  'breast augmentation': 'Breast Surgery',
  'breast lift': 'Breast Surgery',
  'breast lump surgery': 'Breast Surgery',
  'breast reconstruction': 'Breast Surgery',
  'reduction mammoplasty (breast reduction surgery)': 'Breast Surgery',
  'male breast reduction (gynaecomastia surgery)': 'Breast Surgery',
  'axillary breast tissue removal': 'Breast Surgery',

  'tummy tuck (abdominoplasty)': 'Tummy Tuck',
  'liposuction;tummy tuck (abdominoplasty)': 'Tummy Tuck',

  'lipoma removal': 'Cyst / Lump Removal',
  'sebaceous cyst removal': 'Cyst / Lump Removal',
  'ganglion cyst treatment': 'Cyst / Lump Removal',
  'neurofibroma excision': 'Cyst / Lump Removal',
  'lipoma removal;ganglion cyst treatment': 'Cyst / Lump Removal',

  'laser excision of mole': 'Skin Lesion Removal',
  'wart removal': 'Skin Lesion Removal',
  'skin tag removal': 'Skin Lesion Removal',
  'corn removal': 'Skin Lesion Removal',
  'toe nail excision': 'Skin Lesion Removal',

  'rhinoplasty': 'Face Surgery',
  'eye lid surgery': 'Face Surgery',
  'double chin surgery': 'Face Surgery',
  'buccal fat removal (buccal lipectomy)': 'Face Surgery',
  'neck lift': 'Face Surgery',
  'ear correction surgery (otoplasty)': 'Face Surgery',
  'lip augmentation': 'Face Surgery',

  'skin grafting': 'Skin Grafting / Scar',
  'scar revision surgery': 'Skin Grafting / Scar',

  'parotidectomy': 'Parotidectomy',
  'butt lift': 'Butt Lift',
  'trauma surgery': 'Trauma Surgery',

  // ── ENT ───────────────────────────────────────────────────
  'tonsillectomy': 'Tonsil Surgery',
  'tonsillectomy;adenoidectomy': 'Tonsil Surgery',
  'tonsillectomy;mastoidectomy': 'Tonsil Surgery',
  'turbinate reduction surgery;functional endoscopic sinus surgery (fess);septoplasty;tonsillectomy': 'Tonsil Surgery',
  'turbinate reduction surgery;septoplasty;tonsillectomy': 'Tonsil Surgery',

  'adenoidectomy': 'Adenoidectomy',
  'adenoidectomy;nose surgery': 'Adenoidectomy',
  'septoplasty;adenoidectomy': 'Adenoidectomy',

  'functional endoscopic sinus surgery (fess)': 'Sinus Surgery (FESS)',
  'balloon sinuplasty;functional endoscopic sinus surgery (fess)': 'Sinus Surgery (FESS)',
  'functional endoscopic sinus surgery (fess);septoplasty': 'Sinus Surgery (FESS)',
  'turbinate reduction surgery;functional endoscopic sinus surgery (fess)': 'Sinus Surgery (FESS)',
  'turbinate reduction surgery;functional endoscopic sinus surgery (fess);septoplasty': 'Sinus Surgery (FESS)',

  'septoplasty': 'Septoplasty / Nose Surgery',
  'nose surgery': 'Septoplasty / Nose Surgery',
  'septoplasty;nose surgery': 'Septoplasty / Nose Surgery',
  'septoplasty;mastoidectomy': 'Septoplasty / Nose Surgery',

  'ear membrane surgery (tympanoplasty)': 'Ear Surgery',
  'mastoidectomy': 'Ear Surgery',
  'myringotomy': 'Ear Surgery',
  'stapedectomy': 'Ear Surgery',
  'tympanomastoidectomy': 'Ear Surgery',
  'tympanostomy': 'Ear Surgery',
  'turbinate reduction surgery;ear membrane surgery (tympanoplasty);mastoidectomy;ossiculoplasty': 'Ear Surgery',

  'turbinate reduction surgery': 'Turbinate Reduction',
  'thyroidectomy': 'Thyroidectomy',
  'polyp removal surgery (polypectomy)': 'Polyp Removal',

  // ── Laparoscopy ───────────────────────────────────────────
  'allurion intragastric ballooning': 'Intragastric Balloon',
  'endoscopic intragastric ballooning': 'Intragastric Balloon',
  'intragastric balloon removal': 'Intragastric Balloon',
  'sleeve gastrectomy;allurion intragastric ballooning': 'Intragastric Balloon',

  'sleeve gastrectomy': 'Sleeve Gastrectomy / Bariatric',
  'bariatric surgery': 'Sleeve Gastrectomy / Bariatric',
  'gastric bypass surgery': 'Sleeve Gastrectomy / Bariatric',
  'endoscopic sleeve gastroplasty': 'Sleeve Gastrectomy / Bariatric',
  'non surgical obesity treatment': 'Sleeve Gastrectomy / Bariatric',
  'liposuction;sleeve gastrectomy': 'Sleeve Gastrectomy / Bariatric',

  'inguinal hernia surgery': 'Hernia Surgery',
  'inguinal hernioplasty': 'Hernia Surgery',
  'laparoscopic inguinal hernia repair': 'Hernia Surgery',
  'incisional hernia surgery': 'Hernia Surgery',
  'laparoscopic umbilical hernia surgery': 'Hernia Surgery',
  'umbilical hernia surgery': 'Hernia Surgery',
  'laparoscopic hiatal hernia repair': 'Hernia Surgery',
  'laparoscopic ventral hernia repair': 'Hernia Surgery',
  'ventral hernia surgery': 'Hernia Surgery',
  'laparoscopic inguinal hernia repair;laparoscopic umbilical hernia surgery': 'Hernia Surgery',
  'laparoscopic cholecystectomy;laparoscopic umbilical hernia surgery': 'Hernia Surgery',

  'laparoscopic cholecystectomy': 'Gallstone / Cholecystectomy',
  'gall stones surgery (open cholecystectomy)': 'Gallstone / Cholecystectomy',
  'laparoscopy;laparoscopic cholecystectomy': 'Gallstone / Cholecystectomy',

  'laparoscopic appendectomy': 'Appendectomy',
  'open appendectomy': 'Appendectomy',

  'gerd surgery': 'GERD Surgery',
  'laparoscopy': 'Laparoscopy (General)',

  // Tummy Tuck / Liposuction also in Laparoscopy (billed under lap)
  // Already defined above — JS lookup will match same group name

  // ── Urology ───────────────────────────────────────────────
  'circumcision': 'Circumcision',
  'laser circumcision': 'Circumcision',
  'stapler circumcision': 'Circumcision',
  'open circumcision': 'Circumcision',
  'laser circumcision;meatotomy': 'Circumcision',
  'stapler circumcision;meatotomy': 'Circumcision',
  'stapler circumcision;laser circumcision': 'Circumcision',
  'cystectomy;circumcision': 'Circumcision',
  'cystectomy;stapler circumcision': 'Circumcision',
  'diagnostic cystoscopy;circumcision': 'Circumcision',
  'frenuloplasty;circumcision': 'Circumcision',
  'frenuloplasty;stapler circumcision': 'Circumcision',
  'penile frenuloplasty;circumcision': 'Circumcision',
  'urethrotomy;circumcision': 'Circumcision',

  'frenuloplasty': 'Frenuloplasty',
  'penile frenuloplasty': 'Frenuloplasty',
  'balanoposthitis': 'Frenuloplasty',
  'balanoposthitis;meatotomy': 'Frenuloplasty',
  'meatotomy': 'Frenuloplasty',

  'hydrocele': 'Hydrocele Surgery',
  'hydrocele surgery (hydrocelectomy)': 'Hydrocele Surgery',
  'laser surgery for hydrocele': 'Hydrocele Surgery',

  'laser prostatectomy': 'Prostate Surgery',

  'cystectomy': 'Cystectomy / Bladder',
  'open cystolithotomy': 'Cystectomy / Bladder',

  'varicocelectomy': 'Varicocelectomy',

  'urethral stricture repair': 'Urethral / Stricture',
  'urethrotomy': 'Urethral / Stricture',
  'genital wart removal': 'Urethral / Stricture',
  'cyst excision': 'Urethral / Stricture',
  'laparoscopic heminephrectomy': 'Urethral / Stricture',

  // ── Proctology ────────────────────────────────────────────
  // Primary = first procedure listed; all combos mapped to first procedure's group
  'laser piles surgery': 'Piles Surgery',
  'laser surgery for piles': 'Piles Surgery',
  'stapler surgery for piles': 'Piles Surgery',
  'haemorrhoidectomy': 'Piles Surgery',
  'haemorrhoidal artery ligation and recto-anal repair (hal-rar)': 'Piles Surgery',

  'laser fissure surgery': 'Fissure Surgery',
  'laser surgery for fissure': 'Fissure Surgery',
  'open surgery for fissure': 'Fissure Surgery',
  'lateral internal sphincterotomy (lis)': 'Fissure Surgery',
  'open lateral internal sphincterotomy (lis)': 'Fissure Surgery',
  'closed lateral internal sphincterotomy (lis)': 'Fissure Surgery',

  'laser fistula surgery': 'Fistula Surgery',
  'laser surgery for fistula': 'Fistula Surgery',
  'open surgery for fistula': 'Fistula Surgery',
  'fistulotomy': 'Fistula Surgery',

  'laser pilonidal sinus surgery': 'Pilonidal Sinus',
  'laser treatment for pilonidal sinus': 'Pilonidal Sinus',
  'pilonidal flap surgery': 'Pilonidal Sinus',
  'endoscopic ablation for a pilonidal sinus': 'Pilonidal Sinus',
  'pilonidal sinus': 'Pilonidal Sinus',

  'anorectal surgery': 'Anorectal / Incision & Drainage',
  'incision and drainage': 'Anorectal / Incision & Drainage',
  'incision and drainage ': 'Anorectal / Incision & Drainage',
  'stricturoplasty': 'Anorectal / Incision & Drainage',

  // ── Orthopaedics ──────────────────────────────────────────
  'total knee replacement': 'Joint Replacement',
  'total hip replacement': 'Joint Replacement',
  'elbow replacement surgery': 'Joint Replacement',

  'knee arthroscopy': 'Arthroscopy',
  'hip arthroscopy': 'Arthroscopy',
  'diagnostic arthroscopy': 'Arthroscopy',
  'acl reconstruction surgery': 'Arthroscopy',
  'pcl reconstruction surgery': 'Arthroscopy',
  'bankart repair': 'Arthroscopy',
  'meniscectomy': 'Arthroscopy',
  'synovectomy': 'Arthroscopy',

  'fracture treatment': 'Fracture / Fixation',
  'open reduction internal fixation': 'Fracture / Fixation',
  'orif hip': 'Fracture / Fixation',
  'intramedullary nailing': 'Fracture / Fixation',
  'closed reduction': 'Fracture / Fixation',
  'ankle fracture surgery': 'Fracture / Fixation',
  'shoulder fracture surgery': 'Fracture / Fixation',
  'implant removal': 'Fracture / Fixation',
  'carpal tunnel release;implant removal': 'Fracture / Fixation',

  'spine surgery': 'Spine Surgery',
  'disc prolapse treatment': 'Spine Surgery',
  'spine non surgical treatment': 'Spine Surgery',

  'shoulder dislocation treatment': 'Shoulder / Elbow',
  'tennis elbow release': 'Shoulder / Elbow',
  'carpal tunnel release': 'Shoulder / Elbow',

  'nerve repair': 'Soft Tissue / Nerve',
  'fasciotomy': 'Soft Tissue / Nerve',
  'ganglion cyst removal': 'Soft Tissue / Nerve',
  'osteotomy': 'Soft Tissue / Nerve',
  'amputation': 'Soft Tissue / Nerve',

  'knee pain treatment': 'Knee Pain / Non Surgical',

  // ── Vascular ──────────────────────────────────────────────
  'varicose veins surgery': 'Varicose Veins',
  'laser treatment for varicose veins': 'Varicose Veins',
  'sclerotherapy for varicose veins': 'Varicose Veins',
  'venaseal for varicose veins': 'Varicose Veins',
  'venaseal': 'Varicose Veins',
  'laser treatment for varicose veins;sclerotherapy for varicose veins': 'Varicose Veins',
  'laser treatment for varicose veins;venaseal for varicose veins': 'Varicose Veins',
  'varicose veins surgery;laser treatment for varicose veins': 'Varicose Veins',
  'varicose veins surgery;sclerotherapy for varicose veins': 'Varicose Veins',
  'varicose veins surgery;venaseal for varicose veins': 'Varicose Veins',
  'varicose veins surgery;laser treatment for varicose veins;sclerotherapy for varicose veins': 'Varicose Veins',
  'varicose veins surgery;sclerotherapy for varicose veins;venaseal for varicose veins': 'Varicose Veins',
  'sclerotherapy for varicose veins;venaseal for varicose veins': 'Varicose Veins',

  'varicocele embolization': 'Varicocele',
  'peripheral angioplasty': 'Peripheral Angioplasty',
  'thrombectomy': 'Thrombectomy',

  // ── Kidney Stone ──────────────────────────────────────────
  'pcnl': 'Kidney Stone Treatment',
  'rirs': 'Kidney Stone Treatment',
  'ursl': 'Kidney Stone Treatment',
  'eswl': 'Kidney Stone Treatment',
  'dj stent placement': 'Kidney Stone Treatment',
  'ureteral stent placement': 'Kidney Stone Treatment',
  'cystoscopic stent removal': 'Kidney Stone Treatment',
  'ureteroscopic removal of stone (urs)': 'Kidney Stone Treatment',
  'kidney stones treatment': 'Kidney Stone Treatment',
  'pcnl;rirs': 'Kidney Stone Treatment',
  'rirs;circumcision': 'Kidney Stone Treatment',
  'rirs;cystoscopic stent removal': 'Kidney Stone Treatment',
  'rirs;dj stent placement': 'Kidney Stone Treatment',
  'ursl;cystoscopic stent removal': 'Kidney Stone Treatment',
  'ursl;dj stent placement': 'Kidney Stone Treatment',
  'ursl;rirs': 'Kidney Stone Treatment',
  'retrogratde intrarenal surgery (rirs)': 'Kidney Stone Treatment',
  'diagnostic cystoscopy;ureteral stent placement;cystoscopic stent removal': 'Kidney Stone Treatment',

  'diagnostic cystoscopy': 'Bladder / Cystoscopy',
  'turbt': 'Bladder / Cystoscopy',
  'turp': 'Bladder / Cystoscopy',
  'cystolithotripsy': 'Bladder / Cystoscopy',
  'urethrotomy': 'Bladder / Cystoscopy',
  'urethral stricture repair': 'Bladder / Cystoscopy',
  'turbt;diagnostic cystoscopy': 'Bladder / Cystoscopy',
  'cystectomy;turp': 'Bladder / Cystoscopy',
  'cystectomy;urethrotomy': 'Bladder / Cystoscopy',

  'dialysis': 'Dialysis / Fistula',
  'av fistula formation': 'Dialysis / Fistula',
  'nephrectomy': 'Nephrectomy',

  // ── Gynaecology ───────────────────────────────────────────
  'hysterectomy': 'Hysterectomy',
  'laparoscopic hysterectomy': 'Hysterectomy',

  'laparoscopic ovarian cystectomy': 'Ovarian Cyst / Fibroid',
  'open ovarian cystectomy (laparotomy)': 'Ovarian Cyst / Fibroid',
  'laparoscopic fibroid removal surgery': 'Ovarian Cyst / Fibroid',
  'open fibroid removal surgery': 'Ovarian Cyst / Fibroid',
  'myomectomy': 'Ovarian Cyst / Fibroid',

  'hysteroscopy': 'Hysteroscopy',
  'diagnostic hysteroscopy': 'Hysteroscopy',

  'laparoscopy;salpingo-oophorectomy': 'Laparoscopy / Salpingo',
  'marsupialization': 'Laparoscopy / Salpingo',
  'vaginal cyst removal surgery (marsupialization)': 'Laparoscopy / Salpingo',

  'delivery - normal': 'Delivery / Pregnancy',
  'pregnancy care': 'Delivery / Pregnancy',

  'vaginal tightening (vaginoplasty)': 'Vaginal Tightening',

  // ── General Surgery ───────────────────────────────────────
  'debridement': 'General Surgery',
  'mole excision': 'General Surgery',
  'sebaceous cyst excision': 'General Surgery',

};

// ============================================================
// CITY NORMALIZATION HELPER
// ============================================================

function normalizeCity(raw) {
  if (!raw) return '';
  const c = raw.trim().toLowerCase();
  if (CONFIG.DELHI_NCR_CITIES.includes(c)) return 'delhi ncr';
  if (c === 'bengaluru' || c === 'bangalore') return 'bangalore';
  if (c === 'mumbai' || c === 'navi mumbai' || c === 'thane') return 'mumbai';
  if (c === 'pune') return 'pune';
  if (c === 'hyderabad' || c === 'rangareddy' || c === 'dakshina kannada') return 'hyderabad';
  if (c === 'ahmedabad') return 'ahmedabad';
  return c;
}

// ============================================================
// PROCEDURE NORMALIZATION HELPER
// ============================================================

function normalizeProcedure(raw) {
  if (!raw) return { group: 'Other', original: raw };
  const key = raw.trim().toLowerCase();
  const group = PROCEDURE_GROUPS[key] || null;
  // If no exact match, try matching by first procedure in combined string
  if (!group) {
    const first = key.split(';')[0].trim();
    return { group: PROCEDURE_GROUPS[first] || 'Other', original: raw };
  }
  return { group, original: raw };
}
