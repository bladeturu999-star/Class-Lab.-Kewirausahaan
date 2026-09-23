const APP = document.getElementById('app');
const TOAST = document.getElementById('toast');
const CONFIG = window.APP_CONFIG || {};
const DEMO_KEY = 'venture-dashboard-v2-demo-class';
const REAL_READY = Boolean(CONFIG.supabaseUrl && CONFIG.supabaseAnonKey && window.supabase);
let sb = REAL_READY ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey) : null;
let saveTimer = null;

const MODULES = ['health','kpi','problem','experiment','evidence','sprint','financial','portfolio'];
const STUDENT_NAV = [
  ['overview','Overview','⌂'],['health','01 Health Check','01'],['kpi','02 Baseline KPI','02'],['problem','03 Problem Tree','03'],
  ['experiment','04 Experiment','04'],['evidence','05 Evidence','05'],['sprint','06 Weekly Sprint','06'],['financial','07 Financial','07'],['portfolio','08 Portfolio','08']
];
const LECTURER_NAV = [['class','Class Dashboard','⌂'],['students','Mahasiswa','25'],['weekly','Progress Mingguan','16'],['analytics','Class Analytics','↗']];

let runtime = {
  mode:'auth', role:null, profile:null, venture:null, modules:null, classData:[], activePage:'overview',
  selectedStudent:null, selectedStudentTab:'overview', authTab:'login', demoStudentId:null
};

function toast(msg){TOAST.textContent=msg;TOAST.classList.add('show');clearTimeout(window.__toast);window.__toast=setTimeout(()=>TOAST.classList.remove('show'),1500)}
function esc(v){return String(v??'').replace(/[&<>'"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[m]))}
function num(v){const n=Number(String(v??0).replace(/,/g,''));return Number.isFinite(n)?n:0}
function money(v){return 'Rp '+new Intl.NumberFormat('id-ID',{maximumFractionDigits:0}).format(num(v))}
function fmt(v,d=1){return new Intl.NumberFormat('id-ID',{maximumFractionDigits:d}).format(num(v))}
function filled(v){return !(v===null||v===undefined||String(v).trim()==='')}
function uid(){return (crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2)+Date.now())}
function nowISO(){return new Date().toISOString()}
function daysAgo(n){return new Date(Date.now()-n*86400000).toISOString()}

function defaultModules(seed=1){
  const healthAreas=[
    ['Customer','Apakah kita tahu siapa customer utama, problem mereka, dan alasan membeli?'],['Market','Apakah demand, competitor, dan alternative solution sudah dipahami?'],
    ['Value Proposition','Apakah customer mendapatkan value yang jelas dan berbeda?'],['Marketing','Apakah channel menghasilkan attention/leads yang relevan?'],
    ['Sales','Apakah funnel lead → purchase bisa diukur?'],['Operations','Apakah bisnis mampu deliver quality, speed, dan capacity?'],
    ['Finance','Apakah revenue, cost, margin, cash, dan break-even dipahami?'],['Team','Apakah role, skill, accountability, dan execution sudah mendukung?']
  ];
  const kpis=[
    ['Customer','New Customers','Unique first-time buyers'],['Customer','Repeat Customer Rate','Repeat customers / total customers'],['Marketing','Leads','Qualified leads generated'],['Marketing','Conversion Rate','Customers / leads'],
    ['Sales','Transactions','Completed purchases'],['Sales','Revenue','Total sales revenue'],['Sales','Average Order Value','Revenue / transactions'],['Finance','COGS','Direct costs'],
    ['Finance','Gross Profit','Revenue - COGS'],['Finance','Gross Margin','Gross profit / revenue'],['Finance','Operating Expenses','Fixed + operating expenses'],['Finance','Net Cash Flow','Cash inflow - cash outflow'],
    ['Operations','Average Lead Time','Order-to-delivery time'],['Operations','Capacity Utilization','Actual output / capacity'],['Customer','Customer Complaints','Recorded complaints'],['Customer','Customer Satisfaction','Average rating / score']
  ];
  return {
    health:healthAreas.map((x,i)=>({area:x[0],question:x[1],score:seed===0?3:Math.max(1,Math.min(5,3+((seed+i)%3)-1)),evidence:'',priority:false,action:''})),
    kpi:kpis.map(x=>({category:x[0],kpi:x[1],definition:x[2],period:'Last 30 days',baseline:'',unit:'',target:'',source:'',notes:''})),
    problem:{coreProblem:'',symptom:'',why1:'',why2:'',why3:'',rootCause:'',consequence:'',priorityProblem:'',hypothesis:'',kpi:'',deadline:''},
    experiment:{name:'',problem:'',hypothesis:'If we ___, then ___ because ___.',targetCustomer:'',action:'',successMetric:'',baseline:'',target:'',duration:'',sampleSize:'',expectedCost:'',evidence:'',result:'',learning:'',decision:'',nextExperiment:''},
    evidence:Array.from({length:10},(_,i)=>({no:i+1,customer:'',problem:'',alternative:'',pain:3,wtp:'',quote:'',insight:''})),
    sprint:Array.from({length:16},(_,i)=>({week:i+1,problem:'',hypothesis:'',experiment:'',kpi:'',baseline:'',target:'',result:'',learning:'',decision:'',nextMove:''})),
    financial:{months:Array.from({length:6},(_,i)=>({month:`MONTH ${i+1}`,revenue:0,cogs:0,opex:0,cashIn:0,cashOut:0}))},
    portfolio:Array.from({length:16},(_,i)=>({week:i+1,changed:'',evidence:'',decision:'',learned:'',next:''}))
  };
}

function createDemoClass(){
  const categories=['Digital Service','F&B','Fashion','Creative','Education','Agribusiness','Retail','Tourism'];
  const students=[];
  for(let i=1;i<=25;i++){
    const m=defaultModules(i);
    const completed=Math.min(16,2+(i%7));
    for(let w=0;w<completed;w++){
      m.sprint[w]={week:w+1,problem:`Prioritas masalah ${w+1}`,hypothesis:`Hipotesis minggu ${w+1}`,experiment:`Eksperimen ${w+1}`,kpi:'Conversion',baseline:String(8+i%5),target:String(12+i%8),result:String(9+i%9),learning:'Learning tercatat',decision:['KEEP','MODIFY','PIVOT'][w%3],nextMove:'Lanjut validasi berikutnya'};
      m.portfolio[w]={week:w+1,changed:`Perubahan minggu ${w+1}`,evidence:'Evidence tersedia',decision:m.sprint[w].decision,learned:'Insight dari eksperimen',next:'Next action'};
    }
    const evCount=3+(i%8);
    for(let e=0;e<evCount;e++) m.evidence[e]={no:e+1,customer:`Customer ${e+1}`,problem:'Masalah utama customer',alternative:'Alternatif saat ini',pain:2+((i+e)%4),wtp:`Rp ${50+(e*25)}.000`,quote:'Customer membutuhkan solusi yang lebih praktis.',insight:'Pain dan willingness to pay perlu divalidasi lebih lanjut.'};
    m.experiment={...m.experiment,name:`Experiment ${1+i%3}`,problem:'Validasi customer acquisition',targetCustomer:'Target customer utama',action:'Uji channel dan offer',successMetric:'Conversion rate',baseline:'8%',target:'15%',duration:'7 hari',sampleSize:'20',expectedCost:'250000',evidence:'Screenshot / interview',result:i%4===0?'Target tercapai':'Masih berjalan',learning:'Channel dan pesan perlu terus diuji',decision:i%4===0?'KEEP':(i%3===0?'MODIFY':''),nextExperiment:'Test offer berikutnya'};
    for(let mo=0;mo<6;mo++){
      const revenue=Math.max(0,(i*175000)+(mo*125000)-(i%3)*50000);
      m.financial.months[mo]={month:`MONTH ${mo+1}`,revenue,cogs:Math.round(revenue*.35),opex:150000+(i%5)*30000,cashIn:revenue,cashOut:Math.round(revenue*.35)+150000+(i%5)*30000};
    }
    const ventureNames=['NusaBite','CraftLoop','Tumbuh.id','Kopi Sudut','Loka Trip','Urban Stitch','FreshBox','SkillNest','GrowFarm','Studio Muda'];
    students.push({
      id:`demo-student-${i}`,profile:{id:`demo-student-${i}`,full_name:`Mahasiswa ${String(i).padStart(2,'0')}`,nim:`240000${String(i).padStart(2,'0')}`,role:'student',class_name:CONFIG.className||'Lab. Kewirausahaan II'},
      venture:{id:`demo-venture-${i}`,student_id:`demo-student-${i}`,venture_name:`${ventureNames[(i-1)%ventureNames.length]} ${i}`,category:categories[(i-1)%categories.length],description:'Venture mahasiswa Lab. Kewirausahaan II'},
      modules:m,updatedAt:daysAgo(i%10)
    });
  }
  return {students,lecturer:{id:'demo-lecturer',full_name:'Dosen Lab Kewirausahaan II',role:'lecturer',class_name:CONFIG.className||'Lab. Kewirausahaan II'},createdAt:nowISO()};
}
function loadDemo(){try{const raw=localStorage.getItem(DEMO_KEY);return raw?JSON.parse(raw):createDemoClass()}catch(e){return createDemoClass()}}
function saveDemo(data){localStorage.setItem(DEMO_KEY,JSON.stringify(data))}

function healthScore(mods){const a=mods?.health||[];return a.length?a.reduce((s,x)=>s+num(x.score),0)/a.length:0}
function revenueTotal(mods){return (mods?.financial?.months||[]).reduce((s,m)=>s+num(m.revenue),0)}
function netProfitTotal(mods){return (mods?.financial?.months||[]).reduce((s,m)=>s+(num(m.revenue)-num(m.cogs)-num(m.opex)),0)}
function evidenceCount(mods){return (mods?.evidence||[]).filter(x=>filled(x.customer)||filled(x.problem)||filled(x.quote)).length}
function avgPain(mods){const rows=(mods?.evidence||[]).filter(x=>filled(x.customer)||filled(x.problem));return rows.length?rows.reduce((s,x)=>s+num(x.pain),0)/rows.length:0}
function currentWeek(mods){let w=0;(mods?.sprint||[]).forEach(r=>{if(Object.entries(r).some(([k,v])=>k!=='week'&&filled(v)))w=Math.max(w,num(r.week))});return w}
function experimentStatus(mods){const e=mods?.experiment||{};if(e.decision)return e.decision;if(e.name||e.action)return 'RUNNING';return 'NOT STARTED'}
function completion(mods){
  const scores=[];
  scores.push((mods.health||[]).filter(x=>filled(x.evidence)||filled(x.action)).length/8);
  scores.push((mods.kpi||[]).filter(x=>filled(x.baseline)||filled(x.target)).length/16);
  scores.push(Object.values(mods.problem||{}).filter(filled).length/10);
  scores.push(Object.values(mods.experiment||{}).filter(filled).length/16);
  scores.push(evidenceCount(mods)/10);scores.push(currentWeek(mods)/16);
  scores.push((mods.financial?.months||[]).filter(x=>num(x.revenue)||num(x.cogs)||num(x.opex)).length/6);
  scores.push((mods.portfolio||[]).filter(x=>filled(x.changed)||filled(x.evidence)).length/16);
  return Math.round(scores.reduce((a,b)=>a+Math.min(1,b),0)/scores.length*100);
}
function lastUpdatedText(iso){if(!iso)return 'Belum ada';const d=Math.floor((Date.now()-new Date(iso).getTime())/86400000);return d<=0?'Hari ini':d===1?'Kemarin':`${d} hari lalu`}

function renderAuth(){
  runtime.mode='auth';
  APP.innerHTML=`<div class="auth-shell">
    <section class="auth-hero clear-login">
      <div class="auth-edu-block">
        <img class="usu-logo" src="assets/usu-logo.png" alt="Logo Universitas Sumatera Utara">
        <div class="edu-lines">
          <div>Prodi Kewirausahaan</div>
          <div>Fakultas Ekonomi dan Bisnis</div>
          <div>Universitas Sumatera Utara</div>
        </div>
      </div>
      <div class="auth-copy compact">
        <div class="hero-brand"><img src="assets/venture-dashboard-icon.png" alt="Venture Dashboard"><div><h1>Venture Dashboard</h1><p>${esc(CONFIG.className||'Lab. Kewirausahaan II')} · v2.2</p></div></div>
        <h2>Sistem perkembangan venture mahasiswa dalam satu dashboard.</h2>
        <p>Mahasiswa mengisi progress venture mereka, dan dosen dapat memantau perkembangan seluruh kelas secara lebih rapi, cepat, dan terstruktur.</p>
        <div class="auth-features simple"><div class="auth-feature"><span class="check">✓</span><span>Input mahasiswa per venture.</span></div><div class="auth-feature"><span class="check">✓</span><span>Class dashboard untuk dosen.</span></div><div class="auth-feature"><span class="check">✓</span><span>Data aman sesuai role pengguna.</span></div></div>
      </div>
      <div class="auth-credit"><img src="assets/konekta-logo.png" alt="Konekta"><span>Proudly made for our class by <strong>Konekta</strong></span></div>
    </section>
    <section class="auth-panel"><div class="auth-card"><h3>Masuk ke Venture Dashboard</h3><p class="sub">Gunakan Demo Mode untuk mencoba sistem sekarang, atau login dengan akun kelas jika Supabase sudah dihubungkan.</p>
      <div class="demo-box"><div class="demo-title">Demo Mode</div><p>Berisi simulasi 25 mahasiswa + 1 dosen. Semua fungsi inti dapat dipreview tanpa database.</p><div class="demo-actions"><button class="btn blue" onclick="enterDemo('student')">Demo Mahasiswa</button><button class="btn primary" onclick="enterDemo('lecturer')">Demo Dosen</button></div></div>
      <div class="divider">atau gunakan akun kelas</div>
      <div class="tabs"><button class="tab ${runtime.authTab==='login'?'active':''}" onclick="setAuthTab('login')">Masuk</button><button class="tab ${runtime.authTab==='signup'?'active':''}" onclick="setAuthTab('signup')">Daftar Mahasiswa</button></div>
      ${runtime.authTab==='login'?loginForm():signupForm()}
      ${REAL_READY?'':'<div class="note" style="margin-top:14px">Supabase belum dikonfigurasi. Demo Mode tetap berfungsi. Untuk akun kelas nyata, isi <b>config.js</b> setelah membuat project Supabase.</div>'}
    </div></section>
  </div>`;
}
function loginForm(){return `<form onsubmit="realLogin(event)"><div class="field"><label>Email</label><input name="email" type="email" required placeholder="nama@email.com"></div><div class="field"><label>Password</label><input name="password" type="password" required minlength="6" placeholder="••••••••"></div><button class="btn primary full" ${REAL_READY?'':'disabled'}>Masuk</button></form>`}
function signupForm(){return `<form onsubmit="realSignup(event)"><div class="field"><label>Nama Lengkap</label><input name="full_name" required></div><div class="field-row"><div class="field"><label>NIM</label><input name="nim" required></div><div class="field"><label>Kelas</label><input name="class_name" value="${esc(CONFIG.className||'Lab. Kewirausahaan II')}" required></div></div><div class="field"><label>Email</label><input name="email" type="email" required></div><div class="field"><label>Password</label><input name="password" type="password" minlength="6" required></div><button class="btn primary full" ${REAL_READY?'':'disabled'}>Buat Akun Mahasiswa</button></form>`}
function setAuthTab(t){runtime.authTab=t;renderAuth()}

async function realLogin(e){e.preventDefault();if(!REAL_READY)return;const f=new FormData(e.target);const {data,error}=await sb.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)return toast(error.message);await loadRealUser(data.user)}
async function realSignup(e){e.preventDefault();if(!REAL_READY)return;const f=new FormData(e.target);const {data,error}=await sb.auth.signUp({email:f.get('email'),password:f.get('password'),options:{data:{full_name:f.get('full_name'),nim:f.get('nim'),class_name:f.get('class_name')}}});if(error)return toast(error.message);toast('Akun dibuat. Silakan cek email jika konfirmasi aktif.');runtime.authTab='login';renderAuth()}
async function realLogout(){if(sb)await sb.auth.signOut();runtime={...runtime,mode:'auth',role:null,profile:null,venture:null,modules:null,classData:[]};renderAuth()}

async function loadRealUser(user){
  const {data:profile,error}=await sb.from('profiles').select('*').eq('id',user.id).single();if(error){toast('Profil belum tersedia. Jalankan schema Supabase terlebih dahulu.');return}
  runtime.mode='real';runtime.profile=profile;runtime.role=profile.role;runtime.activePage=profile.role==='lecturer'?'class':'overview';
  if(profile.role==='lecturer'){await loadRealClass();renderApp();return}
  const {data:venture}=await sb.from('ventures').select('*').eq('student_id',user.id).maybeSingle();
  if(!venture){runtime.venture=null;renderOnboarding();return}
  runtime.venture=venture;const {data:rows}=await sb.from('module_data').select('module_name,payload,updated_at').eq('venture_id',venture.id);
  const mods=defaultModules(0);(rows||[]).forEach(r=>{if(MODULES.includes(r.module_name))mods[r.module_name]=r.payload});runtime.modules=mods;renderApp();
}
async function loadRealClass(){
  const {data:profiles,error:pErr}=await sb.from('profiles').select('*').eq('role','student').order('full_name');if(pErr)return toast(pErr.message);
  const {data:ventures,error:vErr}=await sb.from('ventures').select('*');if(vErr)return toast(vErr.message);
  const vMap=new Map((ventures||[]).map(v=>[v.student_id,v]));const ids=(ventures||[]).map(v=>v.id);
  let rows=[];if(ids.length){const res=await sb.from('module_data').select('venture_id,module_name,payload,updated_at').in('venture_id',ids);rows=res.data||[]}
  const grouped={};rows.forEach(r=>{grouped[r.venture_id]??={modules:defaultModules(0),updatedAt:null};grouped[r.venture_id].modules[r.module_name]=r.payload;if(!grouped[r.venture_id].updatedAt||new Date(r.updated_at)>new Date(grouped[r.venture_id].updatedAt))grouped[r.venture_id].updatedAt=r.updated_at});
  runtime.classData=(profiles||[]).map(p=>{const v=vMap.get(p.id);const g=v?grouped[v.id]:null;return{id:p.id,profile:p,venture:v||{id:null,student_id:p.id,venture_name:'Belum onboarding',category:'-'},modules:g?.modules||defaultModules(0),updatedAt:g?.updatedAt||null}});
}
function renderOnboarding(){APP.innerHTML=`<div class="auth-shell"><section class="auth-hero"><div class="hero-brand"><img src="assets/venture-dashboard-icon.png"><div><h1>Venture Dashboard</h1><p>${esc(CONFIG.className)}</p></div></div><div class="auth-copy"><h2>Daftarkan venture kamu.</h2><p>Data ini menjadi identitas bisnis yang akan dipantau sepanjang Lab. Kewirausahaan II.</p></div><div></div></section><section class="auth-panel"><div class="auth-card"><h3>Venture Profile</h3><p class="sub">Halo, ${esc(runtime.profile?.full_name)}. Lengkapi informasi awal.</p><form onsubmit="createRealVenture(event)"><div class="field"><label>Nama Venture</label><input name="venture_name" required></div><div class="field"><label>Kategori</label><input name="category" placeholder="F&B, Digital Service, Fashion, dll" required></div><div class="field"><label>Deskripsi Singkat</label><textarea name="description"></textarea></div><button class="btn primary full">Mulai Dashboard</button></form><button class="btn full" style="margin-top:8px" onclick="realLogout()">Keluar</button></div></section></div>`}
async function createRealVenture(e){e.preventDefault();const f=new FormData(e.target);const {data,error}=await sb.from('ventures').insert({student_id:runtime.profile.id,venture_name:f.get('venture_name'),category:f.get('category'),description:f.get('description')}).select().single();if(error)return toast(error.message);runtime.venture=data;runtime.modules=defaultModules(0);for(const m of MODULES)await saveRealModule(m,true);renderApp();toast('Venture berhasil dibuat')}

function enterDemo(role){
  const demo=loadDemo();runtime.mode='demo';runtime.role=role;runtime.activePage=role==='lecturer'?'class':'overview';runtime.classData=demo.students;
  if(role==='lecturer'){runtime.profile=demo.lecturer;runtime.venture=null;runtime.modules=null}
  else{const st=demo.students[0];runtime.demoStudentId=st.id;runtime.profile=st.profile;runtime.venture=st.venture;runtime.modules=st.modules}
  renderApp();
}
function switchDemoRole(role){if(runtime.mode!=='demo')return;enterDemo(role)}
function resetDemo(){if(!confirm('Reset seluruh data Demo Mode ke kondisi awal?'))return;localStorage.removeItem(DEMO_KEY);enterDemo(runtime.role)}

function renderApp(){
  const nav=runtime.role==='lecturer'?LECTURER_NAV:STUDENT_NAV;
  APP.innerHTML=`<div class="app-shell"><aside class="sidebar">
    <div class="brand"><img src="assets/venture-dashboard-icon.png" alt="Logo"><div><h1>Venture Dashboard</h1><p>${esc(CONFIG.className||'Lab. Kewirausahaan II')} · v2.2</p></div></div>
    <div class="role-chip"><span class="label">${runtime.role==='lecturer'?'Lecturer View':'Student View'}</span><strong>${esc(runtime.profile?.full_name||'')}</strong></div>
    <div class="nav">${nav.map(x=>`<button class="${runtime.activePage===x[0]?'active':''}" onclick="go('${x[0]}')"><span class="icon">${x[2]}</span>${x[1]}</button>`).join('')}</div>
    <div class="sidebar-footer">${runtime.mode==='demo'?'Demo Mode · data disimpan lokal.':'Cloud Mode · data tersimpan di Supabase.'}<div class="k-credit"><div class="made">Proudly made for our class by</div><div class="k-row"><img src="assets/konekta-logo.png"><div><strong>Konekta</strong><span>Connecting Solutions</span></div></div></div></div>
  </aside><div class="mobile-nav">${nav.map(x=>`<button class="${runtime.activePage===x[0]?'active':''}" onclick="go('${x[0]}')">${x[1]}</button>`).join('')}</div>
  <main class="main">${topbar()}<div id="page">${renderPage()}</div>${footer()}</main></div>${runtime.selectedStudent?renderStudentDrawer():''}`;
}
function topbar(){
  const title=runtime.role==='lecturer'?({class:'Class Dashboard',students:'Daftar Mahasiswa',weekly:'Progress Mingguan',analytics:'Class Analytics'}[runtime.activePage]||'Class Dashboard'):({overview:'My Venture Dashboard',health:'Health Check',kpi:'Baseline KPI',problem:'Problem Tree',experiment:'Experiment Card',evidence:'Customer Evidence',sprint:'Weekly Sprint',financial:'Financial Snapshot',portfolio:'Venture Portfolio'}[runtime.activePage]||'Venture Dashboard');
  const sub=runtime.role==='lecturer'?'Pantau perkembangan seluruh venture dalam satu kelas.':`${runtime.venture?.venture_name||''} · ${runtime.venture?.category||''}`;
  return `<div class="topbar"><div><span class="course-badge">${esc(CONFIG.className||'Lab. Kewirausahaan II')}</span><h2>${esc(title)}</h2><p class="subtitle">${esc(sub)}</p></div><div class="top-actions">
    ${runtime.mode==='demo'?`<div class="mode-switch"><button class="${runtime.role==='student'?'active':''}" onclick="switchDemoRole('student')">Mahasiswa</button><button class="${runtime.role==='lecturer'?'active':''}" onclick="switchDemoRole('lecturer')">Dosen</button></div><button class="btn small" onclick="resetDemo()">Reset Demo</button>`:''}
    ${runtime.role==='student'?'<button class="btn small" onclick="saveAllNow()">Simpan</button>':''}
    <button class="btn small danger" onclick="${runtime.mode==='real'?'realLogout()':'renderAuth()'}">Keluar</button>
  </div></div>`
}
function footer(){return `<div class="main-credit"><span>${esc(CONFIG.className||'Lab. Kewirausahaan II')} · Venture Management System</span><span class="footer-k"><img src="assets/konekta-logo.png"><span>Proudly made for our class by <strong>Konekta</strong></span></span></div>`}
function go(page){runtime.activePage=page;runtime.selectedStudent=null;renderApp()}
function renderPage(){return runtime.role==='lecturer'?renderLecturerPage():renderStudentPage()}

function renderStudentPage(){switch(runtime.activePage){
  case 'health':return renderHealth();case 'kpi':return renderKPI();case 'problem':return renderObjectForm('problem','Problem Tree',problemFields());case 'experiment':return renderObjectForm('experiment','Experiment Card',experimentFields());case 'evidence':return renderEvidence();case 'sprint':return renderSprint();case 'financial':return renderFinancial();case 'portfolio':return renderPortfolio();default:return renderStudentOverview();}}
function renderStudentOverview(){const m=runtime.modules;const hs=healthScore(m),rev=revenueTotal(m),profit=netProfitTotal(m),ev=evidenceCount(m),week=currentWeek(m),comp=completion(m);return `
  <div class="grid kpis"><div class="card kpi-card"><div class="label">Overall Health</div><div class="value">${fmt(hs)}/5</div><div class="meta">8 area venture</div></div><div class="card kpi-card"><div class="label">Evidence</div><div class="value">${ev}</div><div class="meta">customer records</div></div><div class="card kpi-card"><div class="label">Current Sprint</div><div class="value">W${week||0}</div><div class="meta">dari 16 minggu</div></div><div class="card kpi-card"><div class="label">Revenue 6M</div><div class="value" style="font-size:20px">${money(rev)}</div><div class="meta">akumulasi</div></div><div class="card kpi-card"><div class="label">Net Profit</div><div class="value ${profit>=0?'good':'bad'}" style="font-size:20px">${money(profit)}</div><div class="meta">estimated</div></div><div class="card kpi-card"><div class="label">Completion</div><div class="value">${comp}%</div><div class="meta">kelengkapan toolkit</div></div></div>
  <div class="grid two" style="margin-top:15px"><div class="card"><div class="section-head"><div><h3>Venture Profile</h3><p>Identitas bisnis yang terlihat oleh dosen.</p></div></div><div class="form-grid"><div class="field"><label>Nama Venture</label><input value="${esc(runtime.venture?.venture_name)}" onchange="updateVenture('venture_name',this.value)"></div><div class="field"><label>Kategori</label><input value="${esc(runtime.venture?.category)}" onchange="updateVenture('category',this.value)"></div><div class="field full"><label>Deskripsi</label><textarea onchange="updateVenture('description',this.value)">${esc(runtime.venture?.description||'')}</textarea></div></div></div>
  <div class="card"><h3>Progress Toolkit</h3><p class="hint">Kelengkapan akan berubah otomatis sesuai input.</p>${progressRows(m)}</div></div>
  <div class="card" style="margin-top:15px"><h3>Fokus Minggu Ini</h3><p class="hint">Gunakan Weekly Sprint sebagai pusat dokumentasi problem → hypothesis → experiment → evidence → learning → decision.</p><div class="note">Dosen dapat melihat update yang kamu simpan, tetapi mahasiswa lain tidak memiliki akses ke venture kamu pada Cloud Mode.</div></div>`}
function progressRows(m){const items=[['Health Check',(m.health||[]).filter(x=>filled(x.evidence)||filled(x.action)).length/8],['Baseline KPI',(m.kpi||[]).filter(x=>filled(x.baseline)||filled(x.target)).length/16],['Problem Tree',Object.values(m.problem||{}).filter(filled).length/10],['Experiment',Object.values(m.experiment||{}).filter(filled).length/16],['Customer Evidence',evidenceCount(m)/10],['Weekly Sprint',currentWeek(m)/16],['Financial',(m.financial?.months||[]).filter(x=>num(x.revenue)||num(x.cogs)||num(x.opex)).length/6],['Portfolio',(m.portfolio||[]).filter(x=>filled(x.changed)||filled(x.evidence)).length/16]];return items.map(([n,p])=>`<div class="progress-row"><span>${n}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,Math.round(p*100))}%"></div></div><strong>${Math.min(100,Math.round(p*100))}%</strong></div>`).join('')}

function renderHealth(){return `<div class="section-head"><div><h3>8 Area Venture Health</h3><p>Score 1–5, tambahkan evidence dan action.</p></div><span class="score">${fmt(healthScore(runtime.modules))}/5</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Area</th><th>Question</th><th>Score</th><th>Evidence</th><th>Priority</th><th>Action / Why</th></tr></thead><tbody>${runtime.modules.health.map((r,i)=>`<tr><td><b>${esc(r.area)}</b></td><td>${esc(r.question)}</td><td><select onchange="upd('health','${i}.score',this.value,'number')">${[1,2,3,4,5].map(x=>`<option ${num(r.score)===x?'selected':''}>${x}</option>`).join('')}</select></td><td><textarea onchange="upd('health','${i}.evidence',this.value)">${esc(r.evidence)}</textarea></td><td><input type="checkbox" ${r.priority?'checked':''} onchange="upd('health','${i}.priority',this.checked,'boolean')"></td><td><textarea onchange="upd('health','${i}.action',this.value)">${esc(r.action)}</textarea></td></tr>`).join('')}</tbody></table></div>`}
function renderKPI(){return `<div class="section-head"><div><h3>Baseline KPI</h3><p>Tetapkan baseline, target, unit, period, dan source.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Category</th><th>KPI</th><th>Definition</th><th>Baseline</th><th>Target</th><th>Unit</th><th>Period</th><th>Source</th><th>Notes</th></tr></thead><tbody>${runtime.modules.kpi.map((r,i)=>`<tr><td>${esc(r.category)}</td><td><b>${esc(r.kpi)}</b></td><td>${esc(r.definition)}</td>${['baseline','target','unit','period','source','notes'].map(k=>`<td><input value="${esc(r[k])}" onchange="upd('kpi','${i}.${k}',this.value)"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`}
function problemFields(){return [['coreProblem','Core Problem'],['symptom','Symptom'],['why1','WHY #1'],['why2','WHY #2'],['why3','WHY #3'],['rootCause','Root Cause'],['consequence','Consequence'],['priorityProblem','Priority Problem'],['hypothesis','Next Sprint Hypothesis'],['kpi','KPI'],['deadline','Deadline']]}
function experimentFields(){return [['name','Experiment Name'],['problem','Problem'],['hypothesis','Hypothesis'],['targetCustomer','Target Customer'],['action','Action'],['successMetric','Success Metric'],['baseline','Baseline'],['target','Target'],['duration','Duration'],['sampleSize','Sample Size'],['expectedCost','Expected Cost'],['evidence','Evidence'],['result','Result'],['learning','Learning'],['decision','Decision'],['nextExperiment','Next Experiment']]}
function renderObjectForm(module,title,fields){const o=runtime.modules[module];return `<div class="card"><div class="section-head"><div><h3>${title}</h3><p>Setiap perubahan tersimpan otomatis.</p></div></div><div class="form-grid">${fields.map(([k,l],i)=>`<div class="field ${(i>4||['hypothesis','evidence','result','learning','nextExperiment'].includes(k))?'full':''}"><label>${l}</label>${['hypothesis','evidence','result','learning','nextExperiment','coreProblem','symptom','rootCause','consequence','priorityProblem'].includes(k)?`<textarea onchange="upd('${module}','${k}',this.value)">${esc(o[k])}</textarea>`:k==='decision'?`<select onchange="upd('${module}','${k}',this.value)"><option value="">-- Pilih --</option>${['KEEP','MODIFY','PIVOT','STOP'].map(x=>`<option ${o[k]===x?'selected':''}>${x}</option>`).join('')}</select>`:`<input value="${esc(o[k])}" onchange="upd('${module}','${k}',this.value)">`}</div>`).join('')}</div></div>`}
function renderEvidence(){return `<div class="section-head"><div><h3>Customer Evidence</h3><p>${evidenceCount(runtime.modules)} dari 10 baris memiliki evidence.</p></div><span class="score">Pain ${fmt(avgPain(runtime.modules))}/5</span></div><div class="table-wrap"><table class="table"><thead><tr><th>No</th><th>Customer</th><th>Problem</th><th>Alternative</th><th>Pain 1–5</th><th>WTP</th><th>Quote / Evidence</th><th>Insight</th></tr></thead><tbody>${runtime.modules.evidence.map((r,i)=>`<tr><td>${r.no}</td>${['customer','problem','alternative'].map(k=>`<td><input value="${esc(r[k])}" onchange="upd('evidence','${i}.${k}',this.value)"></td>`).join('')}<td><select onchange="upd('evidence','${i}.pain',this.value,'number')">${[1,2,3,4,5].map(x=>`<option ${num(r.pain)===x?'selected':''}>${x}</option>`).join('')}</select></td><td><input value="${esc(r.wtp)}" onchange="upd('evidence','${i}.wtp',this.value)"></td><td><textarea onchange="upd('evidence','${i}.quote',this.value)">${esc(r.quote)}</textarea></td><td><textarea onchange="upd('evidence','${i}.insight',this.value)">${esc(r.insight)}</textarea></td></tr>`).join('')}</tbody></table></div>`}
function renderSprint(){return `<div class="section-head"><div><h3>Weekly Sprint — 16 Weeks</h3><p>Current progress: Week ${currentWeek(runtime.modules)||0} / 16</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Week</th><th>Priority Problem</th><th>Hypothesis</th><th>Experiment</th><th>KPI</th><th>Baseline</th><th>Target</th><th>Result</th><th>Learning</th><th>Decision</th><th>Next Move</th></tr></thead><tbody>${runtime.modules.sprint.map((r,i)=>`<tr><td><b>W${r.week}</b></td>${['problem','hypothesis','experiment','kpi','baseline','target','result','learning'].map(k=>`<td>${['hypothesis','learning'].includes(k)?`<textarea onchange="upd('sprint','${i}.${k}',this.value)">${esc(r[k])}</textarea>`:`<input value="${esc(r[k])}" onchange="upd('sprint','${i}.${k}',this.value)">`}</td>`).join('')}<td><select onchange="upd('sprint','${i}.decision',this.value)"><option value=""></option>${['KEEP','MODIFY','PIVOT','STOP'].map(x=>`<option ${r.decision===x?'selected':''}>${x}</option>`).join('')}</select></td><td><textarea onchange="upd('sprint','${i}.nextMove',this.value)">${esc(r.nextMove)}</textarea></td></tr>`).join('')}</tbody></table></div>`}
function renderFinancial(){const months=runtime.modules.financial.months;return `<div class="grid kpis"><div class="card kpi-card"><div class="label">Revenue</div><div class="value" style="font-size:20px">${money(revenueTotal(runtime.modules))}</div></div><div class="card kpi-card"><div class="label">Net Profit</div><div class="value" style="font-size:20px">${money(netProfitTotal(runtime.modules))}</div></div></div><div class="section-head" style="margin-top:15px"><div><h3>Financial Snapshot</h3><p>Gross Profit, Net Profit, dan Net Cash Flow dihitung otomatis.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Month</th><th>Revenue</th><th>COGS</th><th>Gross Profit</th><th>Operating Exp.</th><th>Net Profit</th><th>Cash In</th><th>Cash Out</th><th>Net Cash Flow</th></tr></thead><tbody>${months.map((r,i)=>{const gp=num(r.revenue)-num(r.cogs),np=gp-num(r.opex),cf=num(r.cashIn)-num(r.cashOut);return `<tr><td><b>${r.month}</b></td>${['revenue','cogs'].map(k=>`<td><input type="number" value="${num(r[k])}" onchange="upd('financial','months.${i}.${k}',this.value,'number')"></td>`).join('')}<td>${money(gp)}</td><td><input type="number" value="${num(r.opex)}" onchange="upd('financial','months.${i}.opex',this.value,'number')"></td><td class="${np>=0?'good':'bad'}"><b>${money(np)}</b></td><td><input type="number" value="${num(r.cashIn)}" onchange="upd('financial','months.${i}.cashIn',this.value,'number')"></td><td><input type="number" value="${num(r.cashOut)}" onchange="upd('financial','months.${i}.cashOut',this.value,'number')"></td><td>${money(cf)}</td></tr>`}).join('')}</tbody></table></div>`}
function renderPortfolio(){return `<div class="section-head"><div><h3>Venture Portfolio</h3><p>Rekam perubahan, evidence, keputusan, learning, dan next action.</p></div></div><div class="table-wrap"><table class="table"><thead><tr><th>Week</th><th>What Changed?</th><th>Data / Evidence</th><th>Decision</th><th>Learning</th><th>Next Action</th></tr></thead><tbody>${runtime.modules.portfolio.map((r,i)=>`<tr><td><b>W${r.week}</b></td>${['changed','evidence','decision','learned','next'].map(k=>`<td><textarea onchange="upd('portfolio','${i}.${k}',this.value)">${esc(r[k])}</textarea></td>`).join('')}</tr>`).join('')}</tbody></table></div>`}

function upd(module,path,value,type='string'){let v=value;if(type==='number')v=num(value);if(type==='boolean')v=Boolean(value);setPath(runtime.modules[module],path,v);scheduleSave(module)}
function setPath(obj,path,value){const parts=path.split('.');let cur=obj;for(let i=0;i<parts.length-1;i++){const p=parts[i];cur=cur[p]}cur[parts.at(-1)]=value}
function scheduleSave(module){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveModule(module),500)}
async function saveModule(module){
  if(runtime.mode==='demo'){
    const d=loadDemo(),idx=d.students.findIndex(x=>x.id===runtime.demoStudentId);if(idx>=0){d.students[idx].modules=runtime.modules;d.students[idx].venture=runtime.venture;d.students[idx].updatedAt=nowISO();saveDemo(d);runtime.classData=d.students}toast('Tersimpan');return;
  }
  await saveRealModule(module,false);
}
async function saveRealModule(module,silent=false){const {error}=await sb.from('module_data').upsert({venture_id:runtime.venture.id,module_name:module,payload:runtime.modules[module],updated_at:nowISO()},{onConflict:'venture_id,module_name'});if(error&&!silent)toast(error.message);else if(!silent)toast('Tersimpan ke cloud')}
async function saveAllNow(){if(runtime.mode==='demo'){for(const m of MODULES)await saveModule(m)}else{for(const m of MODULES)await saveRealModule(m,true);toast('Semua modul tersimpan')}}
async function updateVenture(key,value){runtime.venture[key]=value;if(runtime.mode==='demo'){const d=loadDemo(),idx=d.students.findIndex(x=>x.id===runtime.demoStudentId);d.students[idx].venture=runtime.venture;d.students[idx].updatedAt=nowISO();saveDemo(d);toast('Profil venture tersimpan')}else{const {error}=await sb.from('ventures').update({[key]:value,updated_at:nowISO()}).eq('id',runtime.venture.id);toast(error?error.message:'Profil venture tersimpan')}}

function renderLecturerPage(){if(runtime.activePage==='students')return renderStudentsTable();if(runtime.activePage==='weekly')return renderWeekly();if(runtime.activePage==='analytics')return renderAnalytics();return renderClassDashboard()}
function classMetrics(){const s=runtime.classData||[];const withV=s.filter(x=>x.venture?.id);const avg=withV.length?withV.reduce((a,x)=>a+healthScore(x.modules),0)/withV.length:0;const rev=withV.reduce((a,x)=>a+revenueTotal(x.modules),0);const updated=s.filter(x=>x.updatedAt&&(Date.now()-new Date(x.updatedAt).getTime())<=7*86400000).length;const running=s.filter(x=>experimentStatus(x.modules)==='RUNNING').length;const validated=s.filter(x=>['KEEP','MODIFY','PIVOT','STOP'].includes(experimentStatus(x.modules))).length;return{total:s.length,withV:withV.length,avg,rev,updated,missing:s.length-updated,running,validated}}
function renderClassDashboard(){const m=classMetrics();return `<div class="grid kpis"><div class="card kpi-card"><div class="label">Mahasiswa</div><div class="value">${m.total}</div><div class="meta">${m.withV} venture onboarded</div></div><div class="card kpi-card"><div class="label">Update ≤ 7 hari</div><div class="value good">${m.updated}</div><div class="meta">${m.missing} perlu follow-up</div></div><div class="card kpi-card"><div class="label">Avg Health</div><div class="value">${fmt(m.avg)}/5</div><div class="meta">class average</div></div><div class="card kpi-card"><div class="label">Experiments</div><div class="value">${m.running}</div><div class="meta">sedang berjalan</div></div><div class="card kpi-card"><div class="label">Decisions</div><div class="value">${m.validated}</div><div class="meta">KEEP/MODIFY/PIVOT/STOP</div></div><div class="card kpi-card"><div class="label">Class Revenue</div><div class="value" style="font-size:19px">${money(m.rev)}</div><div class="meta">6-month snapshots</div></div></div>
  <div class="grid two" style="margin-top:15px"><div class="card"><div class="section-head"><div><h3>Student Progress</h3><p>10 venture dengan update atau progress terbaru.</p></div><button class="btn small" onclick="go('students')">Lihat Semua</button></div>${studentMiniTable(runtime.classData.slice(0,10))}</div><div class="card"><h3>Class Health Distribution</h3><p class="hint">Kelompok berdasarkan overall health score.</p>${healthDistribution()}</div></div>
  <div class="card" style="margin-top:15px"><h3>Needs Attention</h3><p class="hint">Venture yang belum update >7 hari atau health score di bawah 2.8.</p>${attentionList()}</div>`}
function studentMiniTable(rows){return `<div class="table-wrap"><table class="table" style="min-width:650px"><thead><tr><th>Mahasiswa</th><th>Venture</th><th>Health</th><th>Week</th><th>Evidence</th><th>Last Update</th><th></th></tr></thead><tbody>${rows.map(s=>studentRow(s,true)).join('')}</tbody></table></div>`}
function studentRow(s,mini=false){const hs=healthScore(s.modules),week=currentWeek(s.modules),ev=evidenceCount(s.modules),st=!s.updatedAt?'neutral':(Date.now()-new Date(s.updatedAt).getTime()>7*86400000?'bad':'good');return `<tr><td><span class="student-name">${esc(s.profile.full_name)}</span><div class="subtle">${esc(s.profile.nim||'')}</div></td><td>${esc(s.venture?.venture_name||'Belum onboarding')}<div class="subtle">${esc(s.venture?.category||'-')}</div></td><td><span class="score">${fmt(hs)}</span></td><td>W${week||0}</td><td>${ev}</td>${mini?'':`<td>${money(revenueTotal(s.modules))}</td><td>${experimentStatus(s.modules)}</td>`}<td><span class="status ${st}">${lastUpdatedText(s.updatedAt)}</span></td><td><button class="btn small" onclick="openStudent('${s.id}')">Detail</button></td></tr>`}
function renderStudentsTable(){return `<div class="section-head"><div><h3>25 Student Ventures</h3><p>Klik Detail untuk melihat seluruh data venture mahasiswa.</p></div><div class="search-row"><input id="studentSearch" placeholder="Cari nama / venture..." oninput="filterStudentTable(this.value)"></div></div><div id="studentTable">${fullStudentTable(runtime.classData)}</div>`}
function fullStudentTable(rows){return `<div class="table-wrap"><table class="table"><thead><tr><th>Mahasiswa</th><th>Venture</th><th>Health</th><th>Week</th><th>Evidence</th><th>Revenue</th><th>Experiment</th><th>Last Update</th><th></th></tr></thead><tbody>${rows.map(s=>studentRow(s,false)).join('')}</tbody></table></div>`}
function filterStudentTable(q){q=q.toLowerCase();const rows=runtime.classData.filter(s=>`${s.profile.full_name} ${s.profile.nim} ${s.venture?.venture_name} ${s.venture?.category}`.toLowerCase().includes(q));document.getElementById('studentTable').innerHTML=fullStudentTable(rows)}
function renderWeekly(){return `<div class="section-head"><div><h3>Weekly Progress</h3><p>Progress mahasiswa berdasarkan sprint terakhir yang terisi.</p></div></div><div class="card">${[1,2,3,4].map(block=>{const start=(block-1)*4+1,end=block*4;const counts=[];for(let w=start;w<=end;w++)counts.push([w,runtime.classData.filter(s=>currentWeek(s.modules)>=w).length]);return `<h3 style="margin-top:${block===1?0:18}px">Weeks ${start}–${end}</h3>${counts.map(([w,c])=>`<div class="progress-row"><span>Week ${w}</span><div class="bar-track"><div class="bar-fill" style="width:${runtime.classData.length?c/runtime.classData.length*100:0}%"></div></div><strong>${c}/${runtime.classData.length}</strong></div>`).join('')}`}).join('')}</div>`}
function renderAnalytics(){const sorted=[...runtime.classData].sort((a,b)=>healthScore(b.modules)-healthScore(a.modules));return `<div class="grid equal"><div class="card"><h3>Highest Health Score</h3><p class="hint">Bukan ranking nilai; digunakan untuk melihat venture yang tampak paling sehat berdasarkan self-assessment.</p>${sorted.slice(0,8).map((s,i)=>`<div class="metric"><span>${i+1}. ${esc(s.venture?.venture_name)}</span><strong>${fmt(healthScore(s.modules))}/5</strong></div>`).join('')}</div><div class="card"><h3>Customer Evidence Coverage</h3><p class="hint">Jumlah evidence yang sudah terdokumentasi.</p>${[...runtime.classData].sort((a,b)=>evidenceCount(b.modules)-evidenceCount(a.modules)).slice(0,8).map(s=>`<div class="metric"><span>${esc(s.venture?.venture_name)}</span><strong>${evidenceCount(s.modules)}/10</strong></div>`).join('')}</div></div><div class="card" style="margin-top:15px"><h3>Revenue Snapshot</h3><p class="hint">Informasi finansial bersifat sensitif dan hanya tampil pada Lecturer View.</p>${[...runtime.classData].sort((a,b)=>revenueTotal(b.modules)-revenueTotal(a.modules)).slice(0,10).map(s=>`<div class="metric"><span>${esc(s.venture?.venture_name)} <span class="subtle">· ${esc(s.profile.full_name)}</span></span><strong>${money(revenueTotal(s.modules))}</strong></div>`).join('')}</div>`}
function healthDistribution(){const bins=[['4.0–5.0',0],['3.0–3.9',0],['2.0–2.9',0],['< 2.0',0]];runtime.classData.forEach(s=>{const h=healthScore(s.modules);if(h>=4)bins[0][1]++;else if(h>=3)bins[1][1]++;else if(h>=2)bins[2][1]++;else bins[3][1]++});return bins.map(([n,c])=>`<div class="progress-row"><span>${n}</span><div class="bar-track"><div class="bar-fill" style="width:${runtime.classData.length?c/runtime.classData.length*100:0}%"></div></div><strong>${c}</strong></div>`).join('')}
function attentionList(){const rows=runtime.classData.filter(s=>healthScore(s.modules)<2.8||!s.updatedAt||(Date.now()-new Date(s.updatedAt).getTime()>7*86400000)).slice(0,8);return rows.length?rows.map(s=>`<div class="metric"><span><b>${esc(s.profile.full_name)}</b> · ${esc(s.venture?.venture_name)}</span><span>${healthScore(s.modules)<2.8?'<span class="status warn">Health rendah</span>':''} ${(!s.updatedAt||(Date.now()-new Date(s.updatedAt).getTime()>7*86400000))?'<span class="status bad">Update terlambat</span>':''}</span></div>`).join(''):'<div class="empty">Tidak ada alert saat ini.</div>'}

function openStudent(id){runtime.selectedStudent=runtime.classData.find(x=>x.id===id);runtime.selectedStudentTab='overview';renderApp()}
function closeStudent(){runtime.selectedStudent=null;renderApp()}
function studentTab(t){runtime.selectedStudentTab=t;renderApp()}
function renderStudentDrawer(){const s=runtime.selectedStudent,mods=s.modules;const tabs=[['overview','Overview'],['health','Health'],['evidence','Evidence'],['sprint','Sprint'],['financial','Financial'],['experiment','Experiment'],['portfolio','Portfolio']];return `<div class="drawer" onclick="if(event.target===this)closeStudent()"><div class="drawer-panel"><div class="drawer-head"><div><h3>${esc(s.venture?.venture_name||'Venture')}</h3><p class="subtitle">${esc(s.profile.full_name)} · ${esc(s.profile.nim||'')} · ${esc(s.venture?.category||'-')}</p></div><button class="btn small" onclick="closeStudent()">Tutup</button></div><div class="module-tabs">${tabs.map(([k,l])=>`<button class="${runtime.selectedStudentTab===k?'active':''}" onclick="studentTab('${k}')">${l}</button>`).join('')}</div>${renderStudentTab(s,mods)}</div></div>`}
function renderStudentTab(s,m){switch(runtime.selectedStudentTab){case'health':return `<div class="card"><h3>Health Check</h3>${m.health.map(x=>`<div class="metric"><span><b>${esc(x.area)}</b><div class="subtle">${esc(x.evidence||'Belum ada evidence')}</div></span><span class="score">${x.score}/5</span></div>`).join('')}</div>`;case'evidence':return `<div class="card"><h3>Customer Evidence</h3>${m.evidence.filter(x=>filled(x.customer)||filled(x.problem)).map(x=>`<div class="metric"><span><b>${esc(x.customer||'-')}</b><div class="subtle">${esc(x.problem||'')}</div></span><span class="score">Pain ${x.pain}</span></div>`).join('')||'<div class="empty">Belum ada evidence.</div>'}</div>`;case'sprint':return `<div class="card"><h3>Weekly Sprint</h3>${m.sprint.filter(x=>Object.entries(x).some(([k,v])=>k!=='week'&&filled(v))).map(x=>`<div class="metric"><span><b>Week ${x.week}</b><div class="subtle">${esc(x.experiment||x.problem||'')}</div></span><span class="status ${x.decision?'good':'neutral'}">${esc(x.decision||'Draft')}</span></div>`).join('')||'<div class="empty">Belum ada sprint.</div>'}</div>`;case'financial':return `<div class="card"><h3>Financial Snapshot</h3>${m.financial.months.map(x=>`<div class="metric"><span>${x.month}</span><span><b>${money(x.revenue)}</b><div class="subtle">Net ${money(num(x.revenue)-num(x.cogs)-num(x.opex))}</div></span></div>`).join('')}</div>`;case'experiment':return `<div class="card"><h3>${esc(m.experiment.name||'Experiment Card')}</h3>${['problem','hypothesis','targetCustomer','action','successMetric','result','learning','decision'].map(k=>`<div class="metric"><span>${k}</span><strong style="max-width:65%;text-align:right">${esc(m.experiment[k]||'-')}</strong></div>`).join('')}</div>`;case'portfolio':return `<div class="card"><h3>Venture Portfolio</h3>${m.portfolio.filter(x=>filled(x.changed)||filled(x.evidence)).map(x=>`<div class="metric"><span><b>Week ${x.week}</b><div class="subtle">${esc(x.changed)}</div></span><span>${esc(x.decision||'')}</span></div>`).join('')||'<div class="empty">Belum ada portfolio.</div>'}</div>`;default:return `<div class="grid equal"><div class="card kpi-card"><div class="label">Health</div><div class="value">${fmt(healthScore(m))}/5</div></div><div class="card kpi-card"><div class="label">Evidence</div><div class="value">${evidenceCount(m)}</div></div><div class="card kpi-card"><div class="label">Current Sprint</div><div class="value">W${currentWeek(m)||0}</div></div><div class="card kpi-card"><div class="label">Revenue 6M</div><div class="value" style="font-size:18px">${money(revenueTotal(m))}</div></div></div><div class="card" style="margin-top:12px"><h3>Venture Profile</h3><div class="metric"><span>Mahasiswa</span><strong>${esc(s.profile.full_name)}</strong></div><div class="metric"><span>NIM</span><strong>${esc(s.profile.nim||'-')}</strong></div><div class="metric"><span>Category</span><strong>${esc(s.venture?.category||'-')}</strong></div><div class="metric"><span>Last Update</span><strong>${lastUpdatedText(s.updatedAt)}</strong></div><div class="metric"><span>Toolkit Completion</span><strong>${completion(m)}%</strong></div></div>`}}

async function init(){
  if(REAL_READY){const {data}=await sb.auth.getSession();if(data.session){await loadRealUser(data.session.user);return}}
  renderAuth();
}
init();
/*
TOOLKIT v3.1 — INTEGRATED WEEKLY SUBMISSION
   Tempelkan blok ini di PALING BAWAH app.js, setelah init();
   ============================================================ */
(() => {
  'use strict';

  if (window.__TOOLKIT_V31_LOADED__) return;
  window.__TOOLKIT_V31_LOADED__ = true;

  const V3_VERSION = '3.1';

  runtime.v3Submissions = runtime.v3Submissions || [];

  function v31StatusLabel(status) {
    if (status === 'reviewed') return 'Reviewed';
    if (status === 'submitted') return 'Submitted';
    return 'Draft';
  }

  function v31StatusClass(status) {
    if (status === 'reviewed') return 'good';
    if (status === 'submitted') return 'warn';
    return 'neutral';
  }

  function v31Date(iso) {
    if (!iso) return '-';
    try {
      return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(new Date(iso));
    } catch {
      return '-';
    }
  }

  function v31HasSprintData(week) {
    const row = runtime.modules?.sprint?.find(
      x => Number(x.week) === Number(week)
    );

    if (!row) return false;

    return Object.entries(row).some(
      ([key, value]) => key !== 'week' && filled(value)
    );
  }

  function v31SubmissionFor(week) {
    return (runtime.v3Submissions || []).find(
      row => Number(row.week) === Number(week)
    ) || null;
  }

  async function v31LoadSubmissions() {
    if (
      !REAL_READY ||
      runtime.mode !== 'real' ||
      runtime.role !== 'student' ||
      !runtime.venture?.id
    ) {
      return;
    }

    const { data, error } = await sb
      .from('weekly_submissions')
      .select('*')
      .eq('venture_id', runtime.venture.id)
      .order('week');

    if (error) {
      console.error('[Toolkit v3.1] load submissions:', error);
      toast(error.message);
      return;
    }

    runtime.v3Submissions = data || [];
  }

  window.v31SubmitWeek = async function (week) {
    if (!REAL_READY || runtime.mode !== 'real') {
      return toast('Submission hanya tersedia di Cloud Mode.');
    }

    if (runtime.role !== 'student') {
      return toast('Submission ini hanya untuk mahasiswa.');
    }

    if (!runtime.venture?.id) {
      return toast('Venture belum tersedia.');
    }

    if (!v31HasSprintData(week)) {
      return toast(`Isi Weekly Sprint Week ${week} terlebih dahulu.`);
    }

    const existing = v31SubmissionFor(week);

    if (existing?.status === 'reviewed') {
      return toast(`Week ${week} sudah direview dosen.`);
    }

    // Pastikan data sprint paling baru sudah tersimpan lebih dulu.
    await saveRealModule('sprint', true);

    const now = nowISO();

    const payload = {
      venture_id: runtime.venture.id,
      week: Number(week),
      status: 'submitted',
      submitted_at: existing?.submitted_at || now,
      reviewed_at: null,
      updated_at: now
    };

    const { data, error } = await sb
      .from('weekly_submissions')
      .upsert(payload, {
        onConflict: 'venture_id,week'
      })
      .select()
      .single();

    if (error) {
      console.error('[Toolkit v3.1] submit error:', error);
      return toast(`Gagal submit: ${error.message}`);
    }

    const index = runtime.v3Submissions.findIndex(
      row => Number(row.week) === Number(week)
    );

    if (index >= 0) {
      runtime.v3Submissions[index] = data;
    } else {
      runtime.v3Submissions.push(data);
    }

    runtime.v3Submissions.sort(
      (a, b) => Number(a.week) - Number(b.week)
    );

    renderApp();

