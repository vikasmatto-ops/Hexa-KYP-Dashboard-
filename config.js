// ============================================================
// HEXA DASHBOARD — CONFIG v3
// ============================================================

const CONFIG = {
  SHEET_HOSPITAL_NETWORK: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrd9wkjq0MLRYCp5k2fBRnHdjOpeTgGuL6eLwIlQuAAdK0PsANa9zGiiF9Owh-BsC_sRPkdl1S0PC8/pub?gid=0&single=true&output=csv',
  SHEET_ASP_DATA:         'https://docs.google.com/spreadsheets/d/e/2PACX-1vRrd9wkjq0MLRYCp5k2fBRnHdjOpeTgGuL6eLwIlQuAAdK0PsANa9zGiiF9Owh-BsC_sRPkdl1S0PC8/pub?gid=1167367380&single=true&output=csv',
  REFRESH_INTERVAL:  60000,
  TIER_GOLD:   70,
  TIER_SILVER: 45,
  TIER_BRONZE: 25,
  TIER_MIN_CASES: 20,
  UNDERUTILIZED_MAX_CASES: 15,
  UNDERUTILIZED_MIN_ASP_SCORE: 55,
  SCORE_WEIGHT_ASP:      0.60,
  SCORE_WEIGHT_COVERAGE: 0.20,
  SCORE_WEIGHT_VOLUME:   0.20,
  TPA_COL_START: 9,
  TPA_COL_END:   26,
  INSURER_COL_START: 27,
  INSURER_COL_END:   50,
  ACTIVE_CATEGORIES: [
    'Aesthetics / Plastic Surgery','ENT','Laparoscopy','Urology',
    'Proctology','Orthopaedics','Vascular','Kidney Stone','Gynaecology','General Surgery'
  ],
  DELHI_NCR_CITIES: ['delhi','new delhi','noida','gurugram','gurgaon','faridabad','greater noida','ghaziabad'],
  CITY_DISPLAY: {
    'delhi ncr':'Delhi NCR','bangalore':'Bangalore','mumbai':'Mumbai',
    'pune':'Pune','hyderabad':'Hyderabad','ahmedabad':'Ahmedabad','others':'Others'
  },
  // Region → city mapping for inter-city display
  CITY_REGION: {
    'delhi ncr':'North','bangalore':'South','hyderabad':'South',
    'mumbai':'West','pune':'West','ahmedabad':'West','others':'Central'
  },
  ZONE_COLORS: { North:'#3b82f6', South:'#10b981', West:'#f97316', East:'#8b5cf6', Central:'#f59e0b' },
};

// ── Pincode → intra-city zone ─────────────────────────────
const PINCODE_ZONE = {
  // Delhi
  '110005':'Central','110008':'Central','110018':'West','110019':'South',
  '110025':'South','110026':'South','110029':'South','110034':'North',
  '110035':'North','110040':'North','110042':'North','110045':'West',
  '110048':'South','110058':'West','110059':'West','110062':'West',
  '110065':'East','110075':'West','110078':'West','110085':'North',
  '110088':'North','110089':'North','110092':'East','110096':'West',
  // Gurugram/Noida/Faridabad → North
  '122001':'North','122002':'North','122003':'North','122007':'North',
  '122009':'North','122012':'North','122015':'North','122016':'North',
  '122017':'North','122018':'North',
  '121001':'North','121002':'North','121006':'North','121007':'North',
  '201002':'North','201010':'North','201013':'North','201301':'North',
  '201303':'North','201304':'North','201306':'North','201307':'North',
  '201308':'North','201309':'North','201315':'North',
  // Bangalore
  '560010':'South','560013':'North','560022':'Central','560024':'East',
  '560025':'South','560032':'East','560034':'South','560037':'North',
  '560038':'West','560042':'South','560043':'West','560048':'East',
  '560050':'South','560054':'East','560061':'Central','560062':'North',
  '560068':'East','560069':'West','560072':'West','560076':'East',
  '560085':'South','560086':'West','560091':'East','560092':'South',
  '560094':'South','560097':'East','560099':'Central','560100':'South',
  '560102':'South','560103':'South','560105':'South','560111':'South',
  '560114':'South','562125':'North',
  // Mumbai
  '400001':'South','400016':'South','400028':'South','400050':'West',
  '400053':'West','400056':'West','400058':'West','400062':'North',
  '400063':'North','400064':'West','400065':'West','400066':'West',
  '400067':'West','400068':'Central','400069':'Central','400071':'Central',
  '400072':'Central','400076':'Central','400077':'Central','400078':'Central',
  '400079':'Central','400080':'South','400083':'North','400084':'North',
  '400086':'North','400088':'North','400089':'East','400090':'East',
  '400091':'East','400092':'East','400093':'East','400097':'North',
  '400101':'South','400102':'South','400103':'South','400104':'South',
  '400601':'East','400602':'East','400603':'East','400604':'East',
  '400605':'East','400606':'East','400607':'East','400610':'East',
  '400615':'East','400701':'East','400705':'East','400706':'East',
  '400709':'East','410206':'East','410210':'East','421203':'East',
  // Pune
  '411001':'Central','411002':'Central','411004':'Central','411005':'Central',
  '411006':'Central','411007':'Central','411013':'East','411014':'East',
  '411015':'South','411016':'South','411017':'South','411019':'East',
  '411021':'East','411026':'West','411027':'West','411028':'West',
  '411033':'West','411037':'East','411038':'East','411040':'East',
  '411041':'West','411045':'East','411057':'West','411061':'South',
  '412101':'East','412201':'East',
  // Hyderabad
  '500003':'Central','500004':'Central','500008':'West','500013':'Central',
  '500016':'East','500018':'West','500027':'West','500028':'Central',
  '500029':'West','500032':'East','500033':'East','500034':'East',
  '500035':'West','500038':'East','500039':'East','500040':'East',
  '500049':'Central','500060':'East','500072':'West','500073':'West',
  '500074':'West','500079':'West','500081':'West','500084':'East',
  '500085':'East','500096':'West','500101':'West','500114':'West',
  // Ahmedabad
  '380006':'Central','380007':'Central','380009':'Central','380015':'South',
  '380054':'West','380055':'West','380058':'West','380059':'West','380060':'West',
};

function getPincodeZone(pin) {
  return PINCODE_ZONE[String(pin).trim()] || 'Central';
}

// ── City normalizer ───────────────────────────────────────
function normalizeCity(raw) {
  if (!raw) return '';
  const c = raw.trim().toLowerCase();
  if (CONFIG.DELHI_NCR_CITIES.includes(c)) return 'delhi ncr';
  if (c === 'bengaluru' || c === 'bangalore') return 'bangalore';
  if (['mumbai','navi mumbai','thane','navi mumbai'].includes(c)) return 'mumbai';
  if (c === 'pune') return 'pune';
  if (['hyderabad','rangareddy','dakshina kannada'].includes(c)) return 'hyderabad';
  if (c === 'ahmedabad') return 'ahmedabad';
  return c;
}

function normalizeCityBucket(bucket) {
  if (!bucket) return '';
  const b = bucket.trim().toLowerCase();
  if (b === 'delhi') return 'delhi ncr';
  if (b === 'bangalore' || b === 'bengaluru') return 'bangalore';
  return b;
}

function cityLabel(v) {
  if (!v) return 'All Cities';
  return CONFIG.CITY_DISPLAY[v] || v.split(' ').map(w => w[0].toUpperCase()+w.slice(1)).join(' ');
}

// ── Procedure grouping ────────────────────────────────────
const PROCEDURE_GROUPS = {
  'allurion intragastric ballooning':'Intragastric Balloon','endoscopic intragastric ballooning':'Intragastric Balloon','intragastric balloon removal':'Intragastric Balloon','sleeve gastrectomy;allurion intragastric ballooning':'Intragastric Balloon',
  'sleeve gastrectomy':'Sleeve Gastrectomy / Bariatric','bariatric surgery':'Sleeve Gastrectomy / Bariatric','gastric bypass surgery':'Sleeve Gastrectomy / Bariatric','endoscopic sleeve gastroplasty':'Sleeve Gastrectomy / Bariatric','non surgical obesity treatment':'Sleeve Gastrectomy / Bariatric','liposuction;sleeve gastrectomy':'Sleeve Gastrectomy / Bariatric',
  'inguinal hernia surgery':'Hernia Surgery','inguinal hernioplasty':'Hernia Surgery','laparoscopic inguinal hernia repair':'Hernia Surgery','incisional hernia surgery':'Hernia Surgery','laparoscopic umbilical hernia surgery':'Hernia Surgery','umbilical hernia surgery':'Hernia Surgery','laparoscopic hiatal hernia repair':'Hernia Surgery','laparoscopic ventral hernia repair':'Hernia Surgery','ventral hernia surgery':'Hernia Surgery','laparoscopic inguinal hernia repair;laparoscopic umbilical hernia surgery':'Hernia Surgery','laparoscopic cholecystectomy;laparoscopic umbilical hernia surgery':'Hernia Surgery',
  'laparoscopic cholecystectomy':'Gallstone / Cholecystectomy','gall stones surgery (open cholecystectomy)':'Gallstone / Cholecystectomy','laparoscopy;laparoscopic cholecystectomy':'Gallstone / Cholecystectomy',
  'laparoscopic appendectomy':'Appendectomy','open appendectomy':'Appendectomy',
  'gerd surgery':'GERD Surgery','laparoscopy':'Laparoscopy (General)',
  'liposuction':'Liposuction / Fat Removal','fat removal':'Liposuction / Fat Removal','body contouring':'Liposuction / Fat Removal','six-pack (liposuction abdomen)':'Liposuction / Fat Removal','fat removal;six-pack (liposuction abdomen)':'Liposuction / Fat Removal',
  'tummy tuck (abdominoplasty)':'Tummy Tuck','liposuction;tummy tuck (abdominoplasty)':'Tummy Tuck',
  'breast augmentation':'Breast Surgery','breast lift':'Breast Surgery','breast lump surgery':'Breast Surgery','breast reconstruction':'Breast Surgery','reduction mammoplasty (breast reduction surgery)':'Breast Surgery','male breast reduction (gynaecomastia surgery)':'Breast Surgery','axillary breast tissue removal':'Breast Surgery',
  'lipoma removal':'Cyst / Lump Removal','sebaceous cyst removal':'Cyst / Lump Removal','ganglion cyst treatment':'Cyst / Lump Removal','neurofibroma excision':'Cyst / Lump Removal','lipoma removal;ganglion cyst treatment':'Cyst / Lump Removal',
  'laser excision of mole':'Skin Lesion Removal','wart removal':'Skin Lesion Removal','skin tag removal':'Skin Lesion Removal','corn removal':'Skin Lesion Removal','toe nail excision':'Skin Lesion Removal',
  'rhinoplasty':'Face Surgery','eye lid surgery':'Face Surgery','double chin surgery':'Face Surgery','buccal fat removal (buccal lipectomy)':'Face Surgery','neck lift':'Face Surgery','ear correction surgery (otoplasty)':'Face Surgery','lip augmentation':'Face Surgery',
  'skin grafting':'Skin Grafting / Scar','scar revision surgery':'Skin Grafting / Scar',
  'tonsillectomy':'Tonsil Surgery','tonsillectomy;adenoidectomy':'Tonsil Surgery','tonsillectomy;mastoidectomy':'Tonsil Surgery','turbinate reduction surgery;functional endoscopic sinus surgery (fess);septoplasty;tonsillectomy':'Tonsil Surgery','turbinate reduction surgery;septoplasty;tonsillectomy':'Tonsil Surgery',
  'adenoidectomy':'Adenoidectomy','adenoidectomy;nose surgery':'Adenoidectomy','septoplasty;adenoidectomy':'Adenoidectomy',
  'functional endoscopic sinus surgery (fess)':'Sinus Surgery (FESS)','balloon sinuplasty;functional endoscopic sinus surgery (fess)':'Sinus Surgery (FESS)','functional endoscopic sinus surgery (fess);septoplasty':'Sinus Surgery (FESS)','turbinate reduction surgery;functional endoscopic sinus surgery (fess)':'Sinus Surgery (FESS)','turbinate reduction surgery;functional endoscopic sinus surgery (fess);septoplasty':'Sinus Surgery (FESS)',
  'septoplasty':'Septoplasty / Nose Surgery','nose surgery':'Septoplasty / Nose Surgery','septoplasty;nose surgery':'Septoplasty / Nose Surgery','septoplasty;mastoidectomy':'Septoplasty / Nose Surgery',
  'ear membrane surgery (tympanoplasty)':'Ear Surgery','mastoidectomy':'Ear Surgery','myringotomy':'Ear Surgery','stapedectomy':'Ear Surgery','tympanomastoidectomy':'Ear Surgery','tympanostomy':'Ear Surgery','turbinate reduction surgery;ear membrane surgery (tympanoplasty);mastoidectomy;ossiculoplasty':'Ear Surgery',
  'turbinate reduction surgery':'Turbinate Reduction','thyroidectomy':'Thyroidectomy','polyp removal surgery (polypectomy)':'Polyp Removal',
  'circumcision':'Circumcision','laser circumcision':'Circumcision','stapler circumcision':'Circumcision','open circumcision':'Circumcision','laser circumcision;meatotomy':'Circumcision','stapler circumcision;meatotomy':'Circumcision','stapler circumcision;laser circumcision':'Circumcision','cystectomy;circumcision':'Circumcision','cystectomy;stapler circumcision':'Circumcision','diagnostic cystoscopy;circumcision':'Circumcision','frenuloplasty;circumcision':'Circumcision','frenuloplasty;stapler circumcision':'Circumcision','penile frenuloplasty;circumcision':'Circumcision','urethrotomy;circumcision':'Circumcision',
  'frenuloplasty':'Frenuloplasty','penile frenuloplasty':'Frenuloplasty','balanoposthitis':'Frenuloplasty','balanoposthitis;meatotomy':'Frenuloplasty','meatotomy':'Frenuloplasty',
  'hydrocele':'Hydrocele Surgery','hydrocele surgery (hydrocelectomy)':'Hydrocele Surgery','laser surgery for hydrocele':'Hydrocele Surgery',
  'laser prostatectomy':'Prostate Surgery','cystectomy':'Cystectomy / Bladder','open cystolithotomy':'Cystectomy / Bladder','varicocelectomy':'Varicocelectomy',
  'urethral stricture repair':'Urethral / Stricture','urethrotomy':'Urethral / Stricture','genital wart removal':'Urethral / Stricture','cyst excision':'Urethral / Stricture','laparoscopic heminephrectomy':'Urethral / Stricture',
  'laser piles surgery':'Piles Surgery','laser surgery for piles':'Piles Surgery','stapler surgery for piles':'Piles Surgery','haemorrhoidectomy':'Piles Surgery','haemorrhoidal artery ligation and recto-anal repair (hal-rar)':'Piles Surgery',
  'laser fissure surgery':'Fissure Surgery','laser surgery for fissure':'Fissure Surgery','open surgery for fissure':'Fissure Surgery','lateral internal sphincterotomy (lis)':'Fissure Surgery','open lateral internal sphincterotomy (lis)':'Fissure Surgery','closed lateral internal sphincterotomy (lis)':'Fissure Surgery',
  'laser fistula surgery':'Fistula Surgery','laser surgery for fistula':'Fistula Surgery','open surgery for fistula':'Fistula Surgery','fistulotomy':'Fistula Surgery',
  'laser pilonidal sinus surgery':'Pilonidal Sinus','laser treatment for pilonidal sinus':'Pilonidal Sinus','pilonidal flap surgery':'Pilonidal Sinus','endoscopic ablation for a pilonidal sinus':'Pilonidal Sinus','pilonidal sinus':'Pilonidal Sinus',
  'anorectal surgery':'Anorectal / I&D','incision and drainage':'Anorectal / I&D','stricturoplasty':'Anorectal / I&D',
  'total knee replacement':'Joint Replacement','total hip replacement':'Joint Replacement','elbow replacement surgery':'Joint Replacement',
  'knee arthroscopy':'Arthroscopy','hip arthroscopy':'Arthroscopy','diagnostic arthroscopy':'Arthroscopy','acl reconstruction surgery':'Arthroscopy','pcl reconstruction surgery':'Arthroscopy','bankart repair':'Arthroscopy','meniscectomy':'Arthroscopy','synovectomy':'Arthroscopy',
  'fracture treatment':'Fracture / Fixation','open reduction internal fixation':'Fracture / Fixation','orif hip':'Fracture / Fixation','intramedullary nailing':'Fracture / Fixation','closed reduction':'Fracture / Fixation','ankle fracture surgery':'Fracture / Fixation','shoulder fracture surgery':'Fracture / Fixation','implant removal':'Fracture / Fixation','carpal tunnel release;implant removal':'Fracture / Fixation',
  'spine surgery':'Spine Surgery','disc prolapse treatment':'Spine Surgery','spine non surgical treatment':'Spine Surgery',
  'shoulder dislocation treatment':'Shoulder / Elbow','tennis elbow release':'Shoulder / Elbow','carpal tunnel release':'Shoulder / Elbow',
  'nerve repair':'Soft Tissue / Nerve','fasciotomy':'Soft Tissue / Nerve','ganglion cyst removal':'Soft Tissue / Nerve','osteotomy':'Soft Tissue / Nerve','amputation':'Soft Tissue / Nerve',
  'varicose veins surgery':'Varicose Veins','laser treatment for varicose veins':'Varicose Veins','sclerotherapy for varicose veins':'Varicose Veins','venaseal for varicose veins':'Varicose Veins','venaseal':'Varicose Veins','laser treatment for varicose veins;sclerotherapy for varicose veins':'Varicose Veins','laser treatment for varicose veins;venaseal for varicose veins':'Varicose Veins','varicose veins surgery;laser treatment for varicose veins':'Varicose Veins','varicose veins surgery;sclerotherapy for varicose veins':'Varicose Veins','varicose veins surgery;venaseal for varicose veins':'Varicose Veins','varicose veins surgery;laser treatment for varicose veins;sclerotherapy for varicose veins':'Varicose Veins','varicose veins surgery;sclerotherapy for varicose veins;venaseal for varicose veins':'Varicose Veins','sclerotherapy for varicose veins;venaseal for varicose veins':'Varicose Veins',
  'varicocele embolization':'Varicocele','peripheral angioplasty':'Peripheral Angioplasty','thrombectomy':'Thrombectomy',
  'pcnl':'Kidney Stone Treatment','rirs':'Kidney Stone Treatment','ursl':'Kidney Stone Treatment','eswl':'Kidney Stone Treatment','dj stent placement':'Kidney Stone Treatment','ureteral stent placement':'Kidney Stone Treatment','cystoscopic stent removal':'Kidney Stone Treatment','ureteroscopic removal of stone (urs)':'Kidney Stone Treatment','kidney stones treatment':'Kidney Stone Treatment','pcnl;rirs':'Kidney Stone Treatment','rirs;cystoscopic stent removal':'Kidney Stone Treatment','rirs;dj stent placement':'Kidney Stone Treatment','ursl;cystoscopic stent removal':'Kidney Stone Treatment','ursl;dj stent placement':'Kidney Stone Treatment','ursl;rirs':'Kidney Stone Treatment','retrogratde intrarenal surgery (rirs)':'Kidney Stone Treatment','diagnostic cystoscopy;ureteral stent placement;cystoscopic stent removal':'Kidney Stone Treatment',
  'diagnostic cystoscopy':'Bladder / Cystoscopy','turbt':'Bladder / Cystoscopy','turp':'Bladder / Cystoscopy','cystolithotripsy':'Bladder / Cystoscopy','turbt;diagnostic cystoscopy':'Bladder / Cystoscopy','cystectomy;turp':'Bladder / Cystoscopy','cystectomy;urethrotomy':'Bladder / Cystoscopy',
  'dialysis':'Dialysis / Fistula','av fistula formation':'Dialysis / Fistula','nephrectomy':'Nephrectomy',
  'hysterectomy':'Hysterectomy','laparoscopic hysterectomy':'Hysterectomy',
  'laparoscopic ovarian cystectomy':'Ovarian Cyst / Fibroid','open ovarian cystectomy (laparotomy)':'Ovarian Cyst / Fibroid','laparoscopic fibroid removal surgery':'Ovarian Cyst / Fibroid','open fibroid removal surgery':'Ovarian Cyst / Fibroid','myomectomy':'Ovarian Cyst / Fibroid',
  'hysteroscopy':'Hysteroscopy','diagnostic hysteroscopy':'Hysteroscopy',
  'laparoscopy;salpingo-oophorectomy':'Laparoscopy / Salpingo','marsupialization':'Laparoscopy / Salpingo','vaginal cyst removal surgery (marsupialization)':'Laparoscopy / Salpingo',
  'delivery - normal':'Delivery / Pregnancy','pregnancy care':'Delivery / Pregnancy','vaginal tightening (vaginoplasty)':'Vaginal Tightening',
  'debridement':'General Surgery','mole excision':'General Surgery','sebaceous cyst excision':'General Surgery',
};

function normalizeProcedure(raw) {
  if (!raw) return { group:'Other', original:raw };
  const key = raw.trim().toLowerCase();
  const group = PROCEDURE_GROUPS[key] || PROCEDURE_GROUPS[key.split(';')[0].trim()] || 'Other';
  return { group, original: raw };
}
