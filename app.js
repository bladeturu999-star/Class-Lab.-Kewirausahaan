const APP = document.getElementById('app');
const TOAST = document.getElementById('toast');
const CONFIG = window.APP_CONFIG || {};
const DEMO_KEY = 'venture-dashboard-v3-demo-class';
const APP_VERSION = '3.2';

const REAL_READY = Boolean(
  CONFIG.supabaseUrl &&
  CONFIG.supabaseAnonKey &&
  window.supabase
);

let sb = REAL_READY
  ? window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseAnonKey)
  : null;

let saveTimer = null;

const MODULES = [
  'health',
  'kpi',
  'problem',
  'experiment',
  'evidence',
  'sprint',
  'financial',
  'portfolio'
];

const STUDENT_NAV = [
  ['overview', 'Overview', '⌂'],
  ['health', '01 Health Check', '01'],
  ['kpi', '02 Baseline KPI', '02'],
  ['problem', '03 Problem Tree', '03'],
  ['experiment', '04 Experiment', '04'],
  ['evidence', '05 Evidence', '05'],
  ['sprint', '06 Weekly Sprint', '06'],
  ['financial', '07 Financial', '07'],
  ['portfolio', '08 Portfolio', '08']
];

const LECTURER_NAV = [
  ['class', 'Class Dashboard', '⌂'],
  ['students', 'Mahasiswa', '25'],
  ['weekly', 'Progress Mingguan', '16'],
  ['analytics', 'Class Analytics', '↗']
];

let runtime = {
  mode: 'auth',
  role: null,
  profile: null,
  venture: null,
  modules: null,
  classData: [],
  activePage: 'overview',
  selectedStudent: null,
  selectedStudentTab: 'overview',
  authTab: 'login',
  demoStudentId: null,
  submissions: [],
  feedback: []
};

function toast(msg) {
  TOAST.textContent = msg;
  TOAST.classList.add('show');
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => TOAST.classList.remove('show'), 2200);
}

function esc(v) {
  return String(v ?? '').replace(/[&<>'"]/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[m]));
}

function num(v) {
  const n = Number(String(v ?? 0).replace(/,/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function money(v) {
  return 'Rp ' + new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 0
  }).format(num(v));
}

function fmt(v, d = 1) {
  return new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: d
  }).format(num(v));
}

function filled(v) {
  return !(
    v === null ||
    v === undefined ||
    String(v).trim() === ''
  );
}

function nowISO() {
  return new Date().toISOString();
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000).toISOString();
}

function defaultModules(seed = 1) {
  const healthAreas = [
    ['Customer', 'Apakah kita tahu siapa customer utama, problem mereka, dan alasan membeli?'],
    ['Market', 'Apakah demand, competitor, dan alternative solution sudah dipahami?'],
    ['Value Proposition', 'Apakah customer mendapatkan value yang jelas dan berbeda?'],
    ['Marketing', 'Apakah channel menghasilkan attention/leads yang relevan?'],
    ['Sales', 'Apakah funnel lead → purchase bisa diukur?'],
    ['Operations', 'Apakah bisnis mampu deliver quality, speed, dan capacity?'],
    ['Finance', 'Apakah revenue, cost, margin, cash, dan break-even dipahami?'],
    ['Team', 'Apakah role, skill, accountability, dan execution sudah mendukung?']
  ];

  const kpis = [
    ['Customer', 'New Customers', 'Unique first-time buyers'],
    ['Customer', 'Repeat Customer Rate', 'Repeat customers / total customers'],
    ['Marketing', 'Leads', 'Qualified leads generated'],
    ['Marketing', 'Conversion Rate', 'Customers / leads'],
    ['Sales', 'Transactions', 'Completed purchases'],
    ['Sales', 'Revenue', 'Total sales revenue'],
    ['Sales', 'Average Order Value', 'Revenue / transactions'],
    ['Finance', 'COGS', 'Direct costs'],
    ['Finance', 'Gross Profit', 'Revenue - COGS'],
    ['Finance', 'Gross Margin', 'Gross profit / revenue'],
    ['Finance', 'Operating Expenses', 'Fixed + operating expenses'],
    ['Finance', 'Net Cash Flow', 'Cash inflow - cash outflow'],
    ['Operations', 'Average Lead Time', 'Order-to-delivery time'],
    ['Operations', 'Capacity Utilization', 'Actual output / capacity'],
    ['Customer', 'Customer Complaints', 'Recorded complaints'],
    ['Customer', 'Customer Satisfaction', 'Average rating / score']
  ];

  return {
    health: healthAreas.map((x, i) => ({
      area: x[0],
      question: x[1],
      score: seed === 0 ? 3 : Math.max(1, Math.min(5, 3 + ((seed + i) % 3) - 1)),
      evidence: '',
      priority: false,
      action: ''
    })),
    kpi: kpis.map(x => ({
      category: x[0],
      kpi: x[1],
      definition: x[2],
      period: 'Last 30 days',
      baseline: '',
      unit: '',
      target: '',
      source: '',
      notes: ''
    })),
    problem: {
      coreProblem: '',
      symptom: '',
      why1: '',
      why2: '',
      why3: '',
      rootCause: '',
      consequence: '',
      priorityProblem: '',
      hypothesis: '',
      kpi: '',
      deadline: ''
    },
    experiment: {
      name: '',
      problem: '',
      hypothesis: 'If we ___, then ___ because ___.',
      targetCustomer: '',
      action: '',
      successMetric: '',
      baseline: '',
      target: '',
      duration: '',
      sampleSize: '',
      expectedCost: '',
      evidence: '',
      result: '',
      learning: '',
      decision: '',
      nextExperiment: ''
    },
    evidence: Array.from({ length: 10 }, (_, i) => ({
      no: i + 1,
      customer: '',
      problem: '',
      alternative: '',
      pain: 3,
      wtp: '',
      quote: '',
      insight: ''
    })),
    sprint: Array.from({ length: 16 }, (_, i) => ({
      week: i + 1,
      problem: '',
      hypothesis: '',
      experiment: '',
      kpi: '',
      baseline: '',
      target: '',
      result: '',
      learning: '',
      decision: '',
      nextMove: ''
    })),
    financial: {
      months: Array.from({ length: 6 }, (_, i) => ({
        month: `MONTH ${i + 1}`,
        revenue: 0,
        cogs: 0,
        opex: 0,
        cashIn: 0,
        cashOut: 0
      }))
    },
    portfolio: Array.from({ length: 16 }, (_, i) => ({
      week: i + 1,
      changed: '',
      evidence: '',
      decision: '',
      learned: '',
      next: ''
    }))
  };
}

function createDemoClass() {
  const categories = [
    'Digital Service',
    'F&B',
    'Fashion',
    'Creative',
    'Education',
    'Agribusiness',
    'Retail',
    'Tourism'
  ];

  const ventureNames = [
    'NusaBite',
    'CraftLoop',
    'Tumbuh.id',
    'Kopi Sudut',
    'Loka Trip',
    'Urban Stitch',
    'FreshBox',
    'SkillNest',
    'GrowFarm',
    'Studio Muda'
  ];

  const students = [];

  for (let i = 1; i <= 25; i++) {
    const modules = defaultModules(i);
    const completed = Math.min(16, 2 + (i % 7));

    for (let w = 0; w < completed; w++) {
      modules.sprint[w] = {
        week: w + 1,
        problem: `Prioritas masalah ${w + 1}`,
        hypothesis: `Hipotesis minggu ${w + 1}`,
        experiment: `Eksperimen ${w + 1}`,
        kpi: 'Conversion',
        baseline: String(8 + (i % 5)),
        target: String(12 + (i % 8)),
        result: String(9 + (i % 9)),
        learning: 'Learning tercatat',
        decision: ['KEEP', 'MODIFY', 'PIVOT'][w % 3],
        nextMove: 'Lanjut validasi berikutnya'
      };

      modules.portfolio[w] = {
        week: w + 1,
        changed: `Perubahan minggu ${w + 1}`,
        evidence: 'Evidence tersedia',
        decision: modules.sprint[w].decision,
        learned: 'Insight dari eksperimen',
        next: 'Next action'
      };
    }

    const evCount = 3 + (i % 8);
    for (let e = 0; e < evCount; e++) {
      modules.evidence[e] = {
        no: e + 1,
        customer: `Customer ${e + 1}`,
        problem: 'Masalah utama customer',
        alternative: 'Alternatif saat ini',
        pain: 2 + ((i + e) % 4),
        wtp: `Rp ${50 + e * 25}.000`,
        quote: 'Customer membutuhkan solusi yang lebih praktis.',
        insight: 'Pain dan willingness to pay perlu divalidasi lebih lanjut.'
      };
    }

    modules.experiment = {
      ...modules.experiment,
      name: `Experiment ${1 + (i % 3)}`,
      problem: 'Validasi customer acquisition',
      targetCustomer: 'Target customer utama',
      action: 'Uji channel dan offer',
      successMetric: 'Conversion rate',
      baseline: '8%',
      target: '15%',
      duration: '7 hari',
      sampleSize: '20',
      expectedCost: '250000',
      evidence: 'Screenshot / interview',
      result: i % 4 === 0 ? 'Target tercapai' : 'Masih berjalan',
      learning: 'Channel dan pesan perlu terus diuji',
      decision: i % 4 === 0 ? 'KEEP' : (i % 3 === 0 ? 'MODIFY' : ''),
      nextExperiment: 'Test offer berikutnya'
    };

    for (let mo = 0; mo < 6; mo++) {
      const revenue = Math.max(
        0,
        (i * 175000) + (mo * 125000) - (i % 3) * 50000
      );

      modules.financial.months[mo] = {
        month: `MONTH ${mo + 1}`,
        revenue,
        cogs: Math.round(revenue * 0.35),
        opex: 150000 + (i % 5) * 30000,
        cashIn: revenue,
        cashOut: Math.round(revenue * 0.35) + 150000 + (i % 5) * 30000
      };
    }

    students.push({
      id: `demo-student-${i}`,
      profile: {
        id: `demo-student-${i}`,
        full_name: `Mahasiswa ${String(i).padStart(2, '0')}`,
        nim: `240000${String(i).padStart(2, '0')}`,
        role: 'student',
        class_name: CONFIG.className || 'Lab. Kewirausahaan II'
      },
      venture: {
        id: `demo-venture-${i}`,
        student_id: `demo-student-${i}`,
        venture_name: `${ventureNames[(i - 1) % ventureNames.length]} ${i}`,
        category: categories[(i - 1) % categories.length],
        description: 'Venture mahasiswa Lab. Kewirausahaan II'
      },
      modules,
      submissions: Array.from({ length: completed }, (_, w) => ({
        venture_id: `demo-venture-${i}`,
        week: w + 1,
        status: w < Math.max(0, completed - 1) ? 'reviewed' : 'submitted',
        submitted_at: daysAgo(Math.max(0, completed - w))
      })),
      feedback: [],
      updatedAt: daysAgo(i % 10)
    });
  }

  return {
    students,
    lecturer: {
      id: 'demo-lecturer',
      full_name: 'Dosen Lab Kewirausahaan II',
      role: 'lecturer',
      class_name: CONFIG.className || 'Lab. Kewirausahaan II'
    },
    createdAt: nowISO()
  };
}

function loadDemo() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    return raw ? JSON.parse(raw) : createDemoClass();
  } catch {
    return createDemoClass();
  }
}

function saveDemo(data) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(data));
}

function healthScore(mods) {
  const a = mods?.health || [];
  return a.length
    ? a.reduce((s, x) => s + num(x.score), 0) / a.length
    : 0;
}

function revenueTotal(mods) {
  return (mods?.financial?.months || []).reduce(
    (s, m) => s + num(m.revenue),
    0
  );
}

function netProfitTotal(mods) {
  return (mods?.financial?.months || []).reduce(
    (s, m) => s + (num(m.revenue) - num(m.cogs) - num(m.opex)),
    0
  );
}

function evidenceCount(mods) {
  return (mods?.evidence || []).filter(
    x => filled(x.customer) || filled(x.problem) || filled(x.quote)
  ).length;
}

function avgPain(mods) {
  const rows = (mods?.evidence || []).filter(
    x => filled(x.customer) || filled(x.problem)
  );
  return rows.length
    ? rows.reduce((s, x) => s + num(x.pain), 0) / rows.length
    : 0;
}

function currentWeek(mods) {
  let w = 0;
  (mods?.sprint || []).forEach(r => {
    if (
      Object.entries(r).some(
        ([k, v]) => k !== 'week' && filled(v)
      )
    ) {
      w = Math.max(w, num(r.week));
    }
  });
  return w;
}

function experimentStatus(mods) {
  const e = mods?.experiment || {};
  if (e.decision) return e.decision;
  if (e.name || e.action) return 'RUNNING';
  return 'NOT STARTED';
}

function completion(mods) {
  const scores = [
    (mods.health || []).filter(x => filled(x.evidence) || filled(x.action)).length / 8,
    (mods.kpi || []).filter(x => filled(x.baseline) || filled(x.target)).length / 16,
    Object.values(mods.problem || {}).filter(filled).length / 10,
    Object.values(mods.experiment || {}).filter(filled).length / 16,
    evidenceCount(mods) / 10,
    currentWeek(mods) / 16,
    (mods.financial?.months || []).filter(
      x => num(x.revenue) || num(x.cogs) || num(x.opex)
    ).length / 6,
    (mods.portfolio || []).filter(
      x => filled(x.changed) || filled(x.evidence)
    ).length / 16
  ];

  return Math.round(
    scores.reduce((a, b) => a + Math.min(1, b), 0) /
    scores.length *
    100
  );
}

function lastUpdatedText(iso) {
  if (!iso) return 'Belum ada';

  const d = Math.floor(
    (Date.now() - new Date(iso).getTime()) / 86400000
  );

  return d <= 0
    ? 'Hari ini'
    : d === 1
      ? 'Kemarin'
      : `${d} hari lalu`;
}

/* ============================================================
   AUTH + CLOUD LOAD
   ============================================================ */

function renderAuth() {
  runtime.mode = 'auth';

  APP.innerHTML = `
    <div class="auth-shell">
      <section class="auth-hero clear-login">
        <div class="auth-edu-block">
          <img class="usu-logo"
               src="assets/usu-logo.png"
               alt="Logo Universitas Sumatera Utara">
          <div class="edu-lines">
            <div>Prodi Kewirausahaan</div>
            <div>Fakultas Ekonomi dan Bisnis</div>
            <div>Universitas Sumatera Utara</div>
          </div>
        </div>

        <div class="auth-copy compact">
          <div class="hero-brand">
            <img src="assets/venture-dashboard-icon.png"
                 alt="Venture Dashboard">
            <div>
              <h1>Venture Dashboard</h1>
              <p>${esc(CONFIG.className || 'Lab. Kewirausahaan II')} · v${APP_VERSION}</p>
            </div>
          </div>

          <h2>Sistem perkembangan venture mahasiswa dalam satu dashboard.</h2>
          <p>
            Mahasiswa mengisi progress venture mereka, dan dosen dapat
            memantau perkembangan seluruh kelas secara lebih rapi,
            cepat, dan terstruktur.
          </p>

          <div class="auth-features simple">
            <div class="auth-feature">
              <span class="check">✓</span>
              <span>Input mahasiswa per venture.</span>
            </div>
            <div class="auth-feature">
              <span class="check">✓</span>
              <span>Class dashboard untuk dosen.</span>
            </div>
            <div class="auth-feature">
              <span class="check">✓</span>
              <span>Weekly Submission & review workflow.</span>
            </div>
          </div>
        </div>

        <div class="auth-credit">
          <img src="assets/konekta-logo.png" alt="Konekta">
          <span>Proudly made for our class by <strong>Konekta</strong></span>
        </div>
      </section>

      <section class="auth-panel">
        <div class="auth-card">
          <h3>Masuk ke Venture Dashboard</h3>
          <p class="sub">
            Gunakan Demo Mode untuk mencoba sistem, atau login
            menggunakan akun kelas.
          </p>

          <div class="demo-box">
            <div class="demo-title">Demo Mode</div>
            <p>
              Berisi simulasi 25 mahasiswa + 1 dosen.
              Data demo tersimpan di browser.
            </p>
            <div class="demo-actions">
              <button class="btn blue"
                      onclick="enterDemo('student')">
                Demo Mahasiswa
              </button>
              <button class="btn primary"
                      onclick="enterDemo('lecturer')">
                Demo Dosen
              </button>
            </div>
          </div>

          <div class="divider">atau gunakan akun kelas</div>

          <div class="tabs">
            <button class="tab ${runtime.authTab === 'login' ? 'active' : ''}"
                    onclick="setAuthTab('login')">
              Masuk
            </button>
            <button class="tab ${runtime.authTab === 'signup' ? 'active' : ''}"
                    onclick="setAuthTab('signup')">
              Daftar Mahasiswa
            </button>
          </div>

          ${runtime.authTab === 'login' ? loginForm() : signupForm()}

          ${
            REAL_READY
              ? ''
              : `<div class="note" style="margin-top:14px">
                   Supabase belum dikonfigurasi.
                   Demo Mode tetap berfungsi.
                 </div>`
          }
        </div>
      </section>
    </div>
  `;
}

function loginForm() {
  return `
    <form onsubmit="realLogin(event)">
      <div class="field">
        <label>Email</label>
        <input name="email"
               type="email"
               required
               placeholder="nama@email.com">
      </div>

      <div class="field">
        <label>Password</label>
        <input name="password"
               type="password"
               required
               minlength="6"
               placeholder="••••••••">
      </div>

      <button class="btn primary full"
              ${REAL_READY ? '' : 'disabled'}>
        Masuk
      </button>
    </form>
  `;
}

function signupForm() {
  return `
    <form onsubmit="realSignup(event)">
      <div class="field">
        <label>Nama Lengkap</label>
        <input name="full_name" required>
      </div>

      <div class="field-row">
        <div class="field">
          <label>NIM</label>
          <input name="nim" required>
        </div>

        <div class="field">
          <label>Kelas</label>
          <input name="class_name"
                 value="${esc(CONFIG.className || 'Lab. Kewirausahaan II')}"
                 required>
        </div>
      </div>

      <div class="field">
        <label>Email</label>
        <input name="email"
               type="email"
               required>
      </div>

      <div class="field">
        <label>Password</label>
        <input name="password"
               type="password"
               minlength="6"
               required>
      </div>

      <button class="btn primary full"
              ${REAL_READY ? '' : 'disabled'}>
        Buat Akun Mahasiswa
      </button>
    </form>
  `;
}

function setAuthTab(tab) {
  runtime.authTab = tab;
  renderAuth();
}

async function realLogin(event) {
  event.preventDefault();
  if (!REAL_READY) return;

  const form = new FormData(event.target);

  const { data, error } = await sb.auth.signInWithPassword({
    email: form.get('email'),
    password: form.get('password')
  });

  if (error) {
    toast(error.message);
    return;
  }

  await loadRealUser(data.user);
}

async function realSignup(event) {
  event.preventDefault();
  if (!REAL_READY) return;

  const form = new FormData(event.target);

  const { error } = await sb.auth.signUp({
    email: form.get('email'),
    password: form.get('password'),
    options: {
      data: {
        full_name: form.get('full_name'),
        nim: form.get('nim'),
        class_name: form.get('class_name')
      }
    }
  });

  if (error) {
    toast(error.message);
    return;
  }

  toast('Akun dibuat. Silakan cek email jika konfirmasi aktif.');
  runtime.authTab = 'login';
  renderAuth();
}

async function realLogout() {
  if (sb) {
    await sb.auth.signOut();
  }

  runtime = {
    ...runtime,
    mode: 'auth',
    role: null,
    profile: null,
    venture: null,
    modules: null,
    classData: [],
    submissions: [],
    feedback: [],
    activePage: 'overview',
    selectedStudent: null
  };

  renderAuth();
}

async function loadRealUser(user) {
  const { data: profile, error: profileError } = await sb
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (profileError) {
    toast('Profil belum tersedia. Periksa schema Supabase.');
    return;
  }

  runtime.mode = 'real';
  runtime.profile = profile;
  runtime.role = profile.role;
  runtime.activePage = profile.role === 'lecturer'
    ? 'class'
    : 'overview';

  if (profile.role === 'lecturer') {
    await loadRealClass();
    renderApp();
    return;
  }

  const { data: venture, error: ventureError } = await sb
    .from('ventures')
    .select('*')
    .eq('student_id', user.id)
    .maybeSingle();

  if (ventureError) {
    toast(ventureError.message);
    return;
  }

  if (!venture) {
    runtime.venture = null;
    runtime.modules = null;
    runtime.submissions = [];
    renderOnboarding();
    return;
  }

  runtime.venture = venture;

  const { data: rows, error: moduleError } = await sb
    .from('module_data')
    .select('module_name,payload,updated_at')
    .eq('venture_id', venture.id);

  if (moduleError) {
    toast(moduleError.message);
    return;
  }

  const mods = defaultModules(0);

  (rows || []).forEach(row => {
    if (MODULES.includes(row.module_name)) {
      mods[row.module_name] = row.payload;
    }
  });

  runtime.modules = mods;

  await loadStudentSubmissions();
  await loadStudentFeedback();

  renderApp();
}

async function loadStudentSubmissions() {
  if (
    !REAL_READY ||
    runtime.mode !== 'real' ||
    runtime.role !== 'student' ||
    !runtime.venture?.id
  ) {
    runtime.submissions = [];
    return;
  }

  const { data, error } = await sb
    .from('weekly_submissions')
    .select('*')
    .eq('venture_id', runtime.venture.id)
    .order('week');

  if (error) {
    console.error('[v3.1] load submissions:', error);
    toast(error.message);
    return;
  }

  runtime.submissions = data || [];
}

async function loadStudentFeedback() {
  if (
    !REAL_READY ||
    runtime.mode !== 'real' ||
    runtime.role !== 'student' ||
    !runtime.venture?.id
  ) {
    runtime.feedback = [];
    return;
  }

  const { data, error } = await sb
    .from('lecturer_feedback')
    .select('*')
    .eq('venture_id', runtime.venture.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[v3.1] load feedback:', error);
    runtime.feedback = [];
    return;
  }

  runtime.feedback = data || [];
}

async function loadRealClass() {
  const { data: profiles, error: profileError } = await sb
    .from('profiles')
    .select('*')
    .eq('role', 'student')
    .order('full_name');

  if (profileError) {
    toast(profileError.message);
    return;
  }

  const { data: ventures, error: ventureError } = await sb
    .from('ventures')
    .select('*');

  if (ventureError) {
    toast(ventureError.message);
    return;
  }

  const ventureMap = new Map(
    (ventures || []).map(v => [v.student_id, v])
  );

  const ventureIds = (ventures || [])
    .map(v => v.id)
    .filter(Boolean);

  let moduleRows = [];
  let submissionRows = [];
  let feedbackRows = [];

  if (ventureIds.length) {
    const [
      modulesRes,
      submissionsRes,
      feedbackRes
    ] = await Promise.all([
      sb
        .from('module_data')
        .select('venture_id,module_name,payload,updated_at')
        .in('venture_id', ventureIds),

      sb
        .from('weekly_submissions')
        .select('*')
        .in('venture_id', ventureIds),

      sb
        .from('lecturer_feedback')
        .select('*')
        .in('venture_id', ventureIds)
    ]);

    moduleRows = modulesRes.data || [];
    submissionRows = submissionsRes.data || [];
    feedbackRows = feedbackRes.data || [];
  }

  const grouped = {};
  const submissionsByVenture = {};
  const feedbackByVenture = {};

  moduleRows.forEach(row => {
    grouped[row.venture_id] ??= {
      modules: defaultModules(0),
      updatedAt: null
    };

    grouped[row.venture_id].modules[row.module_name] = row.payload;

    if (
      !grouped[row.venture_id].updatedAt ||
      new Date(row.updated_at) > new Date(grouped[row.venture_id].updatedAt)
    ) {
      grouped[row.venture_id].updatedAt = row.updated_at;
    }
  });

  submissionRows.forEach(row => {
    (submissionsByVenture[row.venture_id] ??= []).push(row);
  });

  feedbackRows.forEach(row => {
    (feedbackByVenture[row.venture_id] ??= []).push(row);
  });

  runtime.classData = (profiles || []).map(profile => {
    const venture = ventureMap.get(profile.id);
    const group = venture ? grouped[venture.id] : null;

    return {
      id: profile.id,
      profile,
      venture: venture || {
        id: null,
        student_id: profile.id,
        venture_name: 'Belum onboarding',
        category: '-'
      },
      modules: group?.modules || defaultModules(0),
      submissions: venture
        ? (submissionsByVenture[venture.id] || [])
        : [],
      feedback: venture
        ? (feedbackByVenture[venture.id] || [])
        : [],
      updatedAt: group?.updatedAt || null
    };
  });
}

function renderOnboarding() {
  APP.innerHTML = `
    <div class="auth-shell">
      <section class="auth-hero">
        <div class="hero-brand">
          <img src="assets/venture-dashboard-icon.png"
               alt="Venture Dashboard">
          <div>
            <h1>Venture Dashboard</h1>
            <p>${esc(CONFIG.className || 'Lab. Kewirausahaan II')} · v${APP_VERSION}</p>
          </div>
        </div>

        <div class="auth-copy">
          <h2>Daftarkan venture kamu.</h2>
          <p>
            Data ini menjadi identitas bisnis yang akan dipantau
            sepanjang Lab. Kewirausahaan II.
          </p>
        </div>

        <div></div>
      </section>

      <section class="auth-panel">
        <div class="auth-card">
          <h3>Venture Profile</h3>
          <p class="sub">
            Halo, ${esc(runtime.profile?.full_name)}.
            Lengkapi informasi awal.
          </p>

          <form onsubmit="createRealVenture(event)">
            <div class="field">
              <label>Nama Venture</label>
              <input name="venture_name" required>
            </div>

            <div class="field">
              <label>Kategori</label>
              <input name="category"
                     placeholder="F&B, Digital Service, Fashion, dll"
                     required>
            </div>

            <div class="field">
              <label>Deskripsi Singkat</label>
              <textarea name="description"></textarea>
            </div>

            <button class="btn primary full">
              Mulai Dashboard
            </button>
          </form>

          <button class="btn full"
                  style="margin-top:8px"
                  onclick="realLogout()">
            Keluar
          </button>
        </div>
      </section>
    </div>
  `;
}

async function createRealVenture(event) {
  event.preventDefault();

  const form = new FormData(event.target);

  const { data, error } = await sb
    .from('ventures')
    .insert({
      student_id: runtime.profile.id,
      venture_name: form.get('venture_name'),
      category: form.get('category'),
      description: form.get('description')
    })
    .select()
    .single();

  if (error) {
    toast(error.message);
    return;
  }

  runtime.venture = data;
  runtime.modules = defaultModules(0);
  runtime.submissions = [];
  runtime.feedback = [];

  for (const module of MODULES) {
    await saveRealModule(module, true);
  }

  renderApp();
  toast('Venture berhasil dibuat');
}

/* ============================================================
   DEMO
   ============================================================ */

function enterDemo(role) {
  const demo = loadDemo();

  runtime.mode = 'demo';
  runtime.role = role;
  runtime.activePage = role === 'lecturer'
    ? 'class'
    : 'overview';
  runtime.classData = demo.students;

  if (role === 'lecturer') {
    runtime.profile = demo.lecturer;
    runtime.venture = null;
    runtime.modules = null;
    runtime.submissions = [];
    runtime.feedback = [];
  } else {
    const student = demo.students[0];

    runtime.demoStudentId = student.id;
    runtime.profile = student.profile;
    runtime.venture = student.venture;
    runtime.modules = student.modules;
    runtime.submissions = student.submissions || [];
    runtime.feedback = student.feedback || [];
  }

  renderApp();
}

function switchDemoRole(role) {
  if (runtime.mode !== 'demo') return;
  enterDemo(role);
}

function resetDemo() {
  if (!confirm('Reset seluruh data Demo Mode ke kondisi awal?')) {
    return;
  }

  localStorage.removeItem(DEMO_KEY);
  enterDemo(runtime.role);
}

/* ============================================================
   APP SHELL
   ============================================================ */

function renderApp() {
  const nav = runtime.role === 'lecturer'
    ? LECTURER_NAV
    : STUDENT_NAV;

  APP.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <img src="assets/venture-dashboard-icon.png"
               alt="Logo">
          <div>
            <h1>Venture Dashboard</h1>
            <p>
              ${esc(CONFIG.className || 'Lab. Kewirausahaan II')}
              · v${APP_VERSION}
            </p>
          </div>
        </div>

        <div class="role-chip">
          <span class="label">
            ${runtime.role === 'lecturer' ? 'Lecturer View' : 'Student View'}
          </span>
          <strong>${esc(runtime.profile?.full_name || '')}</strong>
        </div>

        <div class="nav">
          ${nav.map(item => `
            <button
              class="${runtime.activePage === item[0] ? 'active' : ''}"
              onclick="go('${item[0]}')">
              <span class="icon">${item[2]}</span>
              ${item[1]}
            </button>
          `).join('')}
        </div>

        <div class="sidebar-footer">
          ${
            runtime.mode === 'demo'
              ? 'Demo Mode · data disimpan lokal.'
              : 'Cloud Mode · data tersimpan di Supabase.'
          }

          <div class="k-credit">
            <div class="made">Proudly made for our class by</div>
            <div class="k-row">
              <img src="assets/konekta-logo.png"
                   alt="Konekta">
              <div>
                <strong>Konekta</strong>
                <span>Connecting Solutions</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div class="mobile-nav">
        ${nav.map(item => `
          <button
            class="${runtime.activePage === item[0] ? 'active' : ''}"
            onclick="go('${item[0]}')">
            ${item[1]}
          </button>
        `).join('')}
      </div>

      <main class="main">
        ${topbar()}
        <div id="page">${renderPage()}</div>
        ${footer()}
      </main>
    </div>

    ${runtime.selectedStudent ? renderStudentDrawer() : ''}
  `;
}

function topbar() {
  const studentTitles = {
    overview: 'My Venture Dashboard',
    health: 'Health Check',
    kpi: 'Baseline KPI',
    problem: 'Problem Tree',
    experiment: 'Experiment Card',
    evidence: 'Customer Evidence',
    sprint: 'Weekly Sprint',
    financial: 'Financial Snapshot',
    portfolio: 'Venture Portfolio'
  };

  const lecturerTitles = {
    class: 'Class Dashboard',
    students: 'Daftar Mahasiswa',
    weekly: 'Progress Mingguan',
    analytics: 'Class Analytics'
  };

  const title = runtime.role === 'lecturer'
    ? lecturerTitles[runtime.activePage] || 'Class Dashboard'
    : studentTitles[runtime.activePage] || 'Venture Dashboard';

  const sub = runtime.role === 'lecturer'
    ? 'Pantau perkembangan seluruh venture dalam satu kelas.'
    : `${runtime.venture?.venture_name || ''} · ${runtime.venture?.category || ''}`;

  return `
    <div class="topbar">
      <div>
        <span class="course-badge">
          ${esc(CONFIG.className || 'Lab. Kewirausahaan II')}
        </span>
        <h2>${esc(title)}</h2>
        <p class="subtitle">${esc(sub)}</p>
      </div>

      <div class="top-actions">
        ${
          runtime.mode === 'demo'
            ? `
              <div class="mode-switch">
                <button
                  class="${runtime.role === 'student' ? 'active' : ''}"
                  onclick="switchDemoRole('student')">
                  Mahasiswa
                </button>
                <button
                  class="${runtime.role === 'lecturer' ? 'active' : ''}"
                  onclick="switchDemoRole('lecturer')">
                  Dosen
                </button>
              </div>

              <button class="btn small"
                      onclick="resetDemo()">
                Reset Demo
              </button>
            `
            : ''
        }

        ${
          runtime.role === 'student'
            ? `<button class="btn small"
                       onclick="saveAllNow()">
                 Simpan
               </button>`
            : ''
        }

        <button class="btn small danger"
                onclick="${runtime.mode === 'real' ? 'realLogout()' : 'renderAuth()'}">
          Keluar
        </button>
      </div>
    </div>
  `;
}

function footer() {
  return `
    <div class="main-credit">
      <span>
        ${esc(CONFIG.className || 'Lab. Kewirausahaan II')}
        · Venture Management System
      </span>

      <span class="footer-k">
        <img src="assets/konekta-logo.png" alt="Konekta">
        <span>
          Proudly made for our class by <strong>Konekta</strong>
        </span>
      </span>
    </div>
  `;
}

function go(page) {
  runtime.activePage = page;
  runtime.selectedStudent = null;
  renderApp();
}

function renderPage() {
  return runtime.role === 'lecturer'
    ? renderLecturerPage()
    : renderStudentPage();
}

/* ============================================================
   STUDENT
   ============================================================ */

function renderStudentPage() {
  switch (runtime.activePage) {
    case 'health':
      return renderHealth();
    case 'kpi':
      return renderKPI();
    case 'problem':
      return renderObjectForm(
        'problem',
        'Problem Tree',
        problemFields()
      );
    case 'experiment':
      return renderObjectForm(
        'experiment',
        'Experiment Card',
        experimentFields()
      );
    case 'evidence':
      return renderEvidence();
    case 'sprint':
      return renderSprint();
    case 'financial':
      return renderFinancial();
    case 'portfolio':
      return renderPortfolio();
    default:
      return renderStudentOverview();
  }
}

function renderStudentOverview() {
  const m = runtime.modules;

  const hs = healthScore(m);
  const rev = revenueTotal(m);
  const profit = netProfitTotal(m);
  const ev = evidenceCount(m);
  const week = currentWeek(m);
  const comp = completion(m);

  return `
    <div class="grid kpis">
      <div class="card kpi-card">
        <div class="label">Overall Health</div>
        <div class="value">${fmt(hs)}/5</div>
        <div class="meta">8 area venture</div>
      </div>

      <div class="card kpi-card">
        <div class="label">Evidence</div>
        <div class="value">${ev}</div>
        <div class="meta">customer records</div>
      </div>

      <div class="card kpi-card">
        <div class="label">Current Sprint</div>
        <div class="value">W${week || 0}</div>
        <div class="meta">dari 16 minggu</div>
      </div>

      <div class="card kpi-card">
        <div class="label">Revenue 6M</div>
        <div class="value" style="font-size:20px">
          ${money(rev)}
        </div>
        <div class="meta">akumulasi</div>
      </div>

      <div class="card kpi-card">
        <div class="label">Net Profit</div>
        <div class="value ${profit >= 0 ? 'good' : 'bad'}"
             style="font-size:20px">
          ${money(profit)}
        </div>
        <div class="meta">estimated</div>
      </div>

      <div class="card kpi-card">
        <div class="label">Completion</div>
        <div class="value">${comp}%</div>
        <div class="meta">kelengkapan toolkit</div>
      </div>
    </div>

    <div class="grid two" style="margin-top:15px">
      <div class="card">
        <div class="section-head">
          <div>
            <h3>Venture Profile</h3>
            <p>Identitas bisnis yang terlihat oleh dosen.</p>
          </div>
        </div>

        <div class="form-grid">
          <div class="field">
            <label>Nama Venture</label>
            <input
              value="${esc(runtime.venture?.venture_name)}"
              onchange="updateVenture('venture_name',this.value)">
          </div>

          <div class="field">
            <label>Kategori</label>
            <input
              value="${esc(runtime.venture?.category)}"
              onchange="updateVenture('category',this.value)">
          </div>

          <div class="field full">
            <label>Deskripsi</label>
            <textarea
              onchange="updateVenture('description',this.value)">${esc(runtime.venture?.description || '')}</textarea>
          </div>
        </div>
      </div>

      <div class="card">
        <h3>Progress Toolkit</h3>
        <p class="hint">
          Kelengkapan akan berubah otomatis sesuai input.
        </p>
        ${progressRows(m)}
      </div>
    </div>

    <div class="card" style="margin-top:15px">
      <h3>Fokus Minggu Ini</h3>
      <p class="hint">
        Gunakan Weekly Sprint sebagai pusat dokumentasi
        problem → hypothesis → experiment → evidence →
        learning → decision.
      </p>

      <div class="note">
        Dosen dapat melihat update yang kamu simpan,
        tetapi mahasiswa lain tidak memiliki akses ke venture
        kamu pada Cloud Mode.
      </div>
    </div>
  `;
}

function progressRows(m) {
  const items = [
    ['Health Check', (m.health || []).filter(
      x => filled(x.evidence) || filled(x.action)
    ).length / 8],
    ['Baseline KPI', (m.kpi || []).filter(
      x => filled(x.baseline) || filled(x.target)
    ).length / 16],
    ['Problem Tree', Object.values(m.problem || {}).filter(filled).length / 10],
    ['Experiment', Object.values(m.experiment || {}).filter(filled).length / 16],
    ['Customer Evidence', evidenceCount(m) / 10],
    ['Weekly Sprint', currentWeek(m) / 16],
    ['Financial', (m.financial?.months || []).filter(
      x => num(x.revenue) || num(x.cogs) || num(x.opex)
    ).length / 6],
    ['Portfolio', (m.portfolio || []).filter(
      x => filled(x.changed) || filled(x.evidence)
    ).length / 16]
  ];

  return items.map(([name, progress]) => {
    const value = Math.min(100, Math.round(progress * 100));

    return `
      <div class="progress-row">
        <span>${name}</span>
        <div class="bar-track">
          <div class="bar-fill"
               style="width:${value}%"></div>
        </div>
        <strong>${value}%</strong>
      </div>
    `;
  }).join('');
}

function renderHealth() {
  return `
    <div class="section-head">
      <div>
        <h3>8 Area Venture Health</h3>
        <p>Score 1–5, tambahkan evidence dan action.</p>
      </div>
      <span class="score">
        ${fmt(healthScore(runtime.modules))}/5
      </span>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Area</th>
            <th>Question</th>
            <th>Score</th>
            <th>Evidence</th>
            <th>Priority</th>
            <th>Action / Why</th>
          </tr>
        </thead>
        <tbody>
          ${runtime.modules.health.map((r, i) => `
            <tr>
              <td><b>${esc(r.area)}</b></td>
              <td>${esc(r.question)}</td>
              <td>
                <select
                  onchange="upd('health','${i}.score',this.value,'number')">
                  ${[1, 2, 3, 4, 5].map(x => `
                    <option ${num(r.score) === x ? 'selected' : ''}>
                      ${x}
                    </option>
                  `).join('')}
                </select>
              </td>
              <td>
                <textarea
                  onchange="upd('health','${i}.evidence',this.value)">${esc(r.evidence)}</textarea>
              </td>
              <td>
                <input type="checkbox"
                       ${r.priority ? 'checked' : ''}
                       onchange="upd('health','${i}.priority',this.checked,'boolean')">
              </td>
              <td>
                <textarea
                  onchange="upd('health','${i}.action',this.value)">${esc(r.action)}</textarea>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderKPI() {
  return `
    <div class="section-head">
      <div>
        <h3>Baseline KPI</h3>
        <p>
          Tetapkan baseline, target, unit, period,
          dan source.
        </p>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Category</th>
            <th>KPI</th>
            <th>Definition</th>
            <th>Baseline</th>
            <th>Target</th>
            <th>Unit</th>
            <th>Period</th>
            <th>Source</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${runtime.modules.kpi.map((r, i) => `
            <tr>
              <td>${esc(r.category)}</td>
              <td><b>${esc(r.kpi)}</b></td>
              <td>${esc(r.definition)}</td>

              ${[
                'baseline',
                'target',
                'unit',
                'period',
                'source',
                'notes'
              ].map(k => `
                <td>
                  <input
                    value="${esc(r[k])}"
                    onchange="upd('kpi','${i}.${k}',this.value)">
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function problemFields() {
  return [
    ['coreProblem', 'Core Problem'],
    ['symptom', 'Symptom'],
    ['why1', 'WHY #1'],
    ['why2', 'WHY #2'],
    ['why3', 'WHY #3'],
    ['rootCause', 'Root Cause'],
    ['consequence', 'Consequence'],
    ['priorityProblem', 'Priority Problem'],
    ['hypothesis', 'Next Sprint Hypothesis'],
    ['kpi', 'KPI'],
    ['deadline', 'Deadline']
  ];
}

function experimentFields() {
  return [
    ['name', 'Experiment Name'],
    ['problem', 'Problem'],
    ['hypothesis', 'Hypothesis'],
    ['targetCustomer', 'Target Customer'],
    ['action', 'Action'],
    ['successMetric', 'Success Metric'],
    ['baseline', 'Baseline'],
    ['target', 'Target'],
    ['duration', 'Duration'],
    ['sampleSize', 'Sample Size'],
    ['expectedCost', 'Expected Cost'],
    ['evidence', 'Evidence'],
    ['result', 'Result'],
    ['learning', 'Learning'],
    ['decision', 'Decision'],
    ['nextExperiment', 'Next Experiment']
  ];
}

function renderObjectForm(module, title, fields) {
  const obj = runtime.modules[module];

  const textareaKeys = [
    'hypothesis',
    'evidence',
    'result',
    'learning',
    'nextExperiment',
    'coreProblem',
    'symptom',
    'rootCause',
    'consequence',
    'priorityProblem'
  ];

  return `
    <div class="card">
      <div class="section-head">
        <div>
          <h3>${title}</h3>
          <p>Setiap perubahan tersimpan otomatis.</p>
        </div>
      </div>

      <div class="form-grid">
        ${fields.map(([key, label], i) => `
          <div class="field ${
            i > 4 || textareaKeys.includes(key)
              ? 'full'
              : ''
          }">
            <label>${label}</label>

            ${
              textareaKeys.includes(key)
                ? `
                  <textarea
                    onchange="upd('${module}','${key}',this.value)">${esc(obj[key])}</textarea>
                `
                : key === 'decision'
                  ? `
                    <select
                      onchange="upd('${module}','${key}',this.value)">
                      <option value="">-- Pilih --</option>
                      ${['KEEP', 'MODIFY', 'PIVOT', 'STOP'].map(x => `
                        <option ${obj[key] === x ? 'selected' : ''}>
                          ${x}
                        </option>
                      `).join('')}
                    </select>
                  `
                  : `
                    <input
                      value="${esc(obj[key])}"
                      onchange="upd('${module}','${key}',this.value)">
                  `
            }
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderEvidence() {
  return `
    <div class="section-head">
      <div>
        <h3>Customer Evidence</h3>
        <p>
          ${evidenceCount(runtime.modules)}
          dari 10 baris memiliki evidence.
        </p>
      </div>

      <span class="score">
        Pain ${fmt(avgPain(runtime.modules))}/5
      </span>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>No</th>
            <th>Customer</th>
            <th>Problem</th>
            <th>Alternative</th>
            <th>Pain 1–5</th>
            <th>WTP</th>
            <th>Quote / Evidence</th>
            <th>Insight</th>
          </tr>
        </thead>
        <tbody>
          ${runtime.modules.evidence.map((r, i) => `
            <tr>
              <td>${r.no}</td>

              ${[
                'customer',
                'problem',
                'alternative'
              ].map(k => `
                <td>
                  <input
                    value="${esc(r[k])}"
                    onchange="upd('evidence','${i}.${k}',this.value)">
                </td>
              `).join('')}

              <td>
                <select
                  onchange="upd('evidence','${i}.pain',this.value,'number')">
                  ${[1, 2, 3, 4, 5].map(x => `
                    <option ${num(r.pain) === x ? 'selected' : ''}>
                      ${x}
                    </option>
                  `).join('')}
                </select>
              </td>

              <td>
                <input
                  value="${esc(r.wtp)}"
                  onchange="upd('evidence','${i}.wtp',this.value)">
              </td>

              <td>
                <textarea
                  onchange="upd('evidence','${i}.quote',this.value)">${esc(r.quote)}</textarea>
              </td>

              <td>
                <textarea
                  onchange="upd('evidence','${i}.insight',this.value)">${esc(r.insight)}</textarea>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* ============================================================
   WEEKLY SPRINT + V3.1 SUBMISSION
   ============================================================ */

function sprintHasData(week) {
  const row = runtime.modules?.sprint?.find(
    x => Number(x.week) === Number(week)
  );

  if (!row) return false;

  return Object.entries(row).some(
    ([key, value]) => key !== 'week' && filled(value)
  );
}

function submissionFor(week) {
  return (runtime.submissions || []).find(
    x => Number(x.week) === Number(week)
  ) || null;
}

function feedbackFor(week) {
  return (runtime.feedback || []).filter(
    x => Number(x.week) === Number(week)
  );
}

function submissionStatusLabel(status) {
  if (status === 'reviewed') return 'Reviewed';
  if (status === 'submitted') return 'Submitted';
  return 'Draft';
}

function submissionStatusClass(status) {
  if (status === 'reviewed') return 'good';
  if (status === 'submitted') return 'warn';
  return 'neutral';
}

function prettyDate(iso) {
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

async function submitWeek(week) {
  if (runtime.mode === 'demo') {
    const existing = submissionFor(week);
    const row = {
      venture_id: runtime.venture.id,
      week,
      status: 'submitted',
      submitted_at: existing?.submitted_at || nowISO(),
      reviewed_at: null,
      updated_at: nowISO()
    };

    const index = runtime.submissions.findIndex(
      x => Number(x.week) === Number(week)
    );

    if (index >= 0) {
      runtime.submissions[index] = row;
    } else {
      runtime.submissions.push(row);
    }

    const demo = loadDemo();
    const studentIndex = demo.students.findIndex(
      x => x.id === runtime.demoStudentId
    );

    if (studentIndex >= 0) {
      demo.students[studentIndex].submissions = runtime.submissions;
      saveDemo(demo);
    }

    renderApp();
    toast(`Week ${week} berhasil disubmit`);
    return;
  }

  if (!REAL_READY || runtime.mode !== 'real') {
    toast('Submission hanya tersedia di Cloud Mode.');
    return;
  }

  if (!runtime.venture?.id) {
    toast('Venture belum tersedia.');
    return;
  }

  if (!sprintHasData(week)) {
    toast(`Isi Weekly Sprint Week ${week} terlebih dahulu.`);
    return;
  }

  const existing = submissionFor(week);

  if (existing?.status === 'reviewed') {
    toast(`Week ${week} sudah direview dosen.`);
    return;
  }

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
    console.error('[v3.1] submit error:', error);
    toast(`Gagal submit: ${error.message}`);
    return;
  }

  const index = runtime.submissions.findIndex(
    x => Number(x.week) === Number(week)
  );

  if (index >= 0) {
    runtime.submissions[index] = data;
  } else {
    runtime.submissions.push(data);
  }

  runtime.submissions.sort(
    (a, b) => Number(a.week) - Number(b.week)
  );

  renderApp();
  toast(`Week ${week} berhasil disubmit`);
}

function renderSubmissionPanel() {
  if (runtime.role !== 'student') {
    return '';
  }

  return `
    <div class="card" style="margin-bottom:15px">
      <div class="section-head">
        <div>
          <h3>Weekly Submission</h3>
          <p>
            Isi Weekly Sprint, tunggu autosave,
            lalu submit agar dapat direview dosen.
          </p>
        </div>

        <span class="score">v${APP_VERSION}</span>
      </div>

      ${Array.from({ length: 16 }, (_, i) => {
        const week = i + 1;
        const submission = submissionFor(week);
        const status = submission?.status || 'draft';
        const hasData = sprintHasData(week);
        const feedback = feedbackFor(week);

        let description = 'Sprint belum diisi.';

        if (hasData && !submission) {
          description = 'Sprint sudah terisi dan siap disubmit.';
        }

        if (submission?.submitted_at) {
          description = `Dikirim ${prettyDate(submission.submitted_at)}`;
        }

        return `
          <div class="metric"
               style="align-items:flex-start;gap:12px">
            <span style="min-width:0;flex:1">
              <b>Week ${week}</b>
              <div class="subtle">${description}</div>

              ${
                feedback.length
                  ? `
                    <div class="note" style="margin-top:8px">
                      <b>Feedback dosen:</b><br>
                      ${feedback
                        .slice(0, 2)
                        .map(x => esc(x.message))
                        .join('<br><br>')}
                    </div>
                  `
                  : ''
              }
            </span>

            <span style="
              display:flex;
              gap:8px;
              align-items:center;
              justify-content:flex-end;
              flex-wrap:wrap;
            ">
              <span class="status ${submissionStatusClass(status)}">
                ${submissionStatusLabel(status)}
              </span>

              <button
                class="btn small"
                onclick="submitWeek(${week})"
                ${!hasData || status === 'reviewed' ? 'disabled' : ''}>
                ${
                  status === 'reviewed'
                    ? 'Reviewed'
                    : status === 'submitted'
                      ? 'Submit Ulang'
                      : 'Submit'
                }
              </button>
            </span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderSprint() {
  return `
    ${renderSubmissionPanel()}

    <div class="section-head">
      <div>
        <h3>Weekly Sprint — 16 Weeks</h3>
        <p>
          Current progress:
          Week ${currentWeek(runtime.modules) || 0} / 16
        </p>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Week</th>
            <th>Priority Problem</th>
            <th>Hypothesis</th>
            <th>Experiment</th>
            <th>KPI</th>
            <th>Baseline</th>
            <th>Target</th>
            <th>Result</th>
            <th>Learning</th>
            <th>Decision</th>
            <th>Next Move</th>
          </tr>
        </thead>

        <tbody>
          ${runtime.modules.sprint.map((r, i) => `
            <tr>
              <td><b>W${r.week}</b></td>

              ${[
                'problem',
                'hypothesis',
                'experiment',
                'kpi',
                'baseline',
                'target',
                'result',
                'learning'
              ].map(k => `
                <td>
                  ${
                    ['hypothesis', 'learning'].includes(k)
                      ? `
                        <textarea
                          onchange="upd('sprint','${i}.${k}',this.value)">${esc(r[k])}</textarea>
                      `
                      : `
                        <input
                          value="${esc(r[k])}"
                          onchange="upd('sprint','${i}.${k}',this.value)">
                      `
                  }
                </td>
              `).join('')}

              <td>
                <select
                  onchange="upd('sprint','${i}.decision',this.value)">
                  <option value=""></option>
                  ${['KEEP', 'MODIFY', 'PIVOT', 'STOP'].map(x => `
                    <option ${r.decision === x ? 'selected' : ''}>
                      ${x}
                    </option>
                  `).join('')}
                </select>
              </td>

              <td>
                <textarea
                  onchange="upd('sprint','${i}.nextMove',this.value)">${esc(r.nextMove)}</textarea>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderFinancial() {
  const months = runtime.modules.financial.months;

  return `
    <div class="grid kpis">
      <div class="card kpi-card">
        <div class="label">Revenue</div>
        <div class="value" style="font-size:20px">
          ${money(revenueTotal(runtime.modules))}
        </div>
      </div>

      <div class="card kpi-card">
        <div class="label">Net Profit</div>
        <div class="value" style="font-size:20px">
          ${money(netProfitTotal(runtime.modules))}
        </div>
      </div>
    </div>

    <div class="section-head" style="margin-top:15px">
      <div>
        <h3>Financial Snapshot</h3>
        <p>
          Gross Profit, Net Profit, dan Net Cash Flow
          dihitung otomatis.
        </p>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Month</th>
            <th>Revenue</th>
            <th>COGS</th>
            <th>Gross Profit</th>
            <th>Operating Exp.</th>
            <th>Net Profit</th>
            <th>Cash In</th>
            <th>Cash Out</th>
            <th>Net Cash Flow</th>
          </tr>
        </thead>

        <tbody>
          ${months.map((r, i) => {
            const grossProfit = num(r.revenue) - num(r.cogs);
            const netProfit = grossProfit - num(r.opex);
            const netCashFlow = num(r.cashIn) - num(r.cashOut);

            return `
              <tr>
                <td><b>${r.month}</b></td>

                ${['revenue', 'cogs'].map(k => `
                  <td>
                    <input
                      type="number"
                      value="${num(r[k])}"
                      onchange="upd('financial','months.${i}.${k}',this.value,'number')">
                  </td>
                `).join('')}

                <td>${money(grossProfit)}</td>

                <td>
                  <input
                    type="number"
                    value="${num(r.opex)}"
                    onchange="upd('financial','months.${i}.opex',this.value,'number')">
                </td>

                <td class="${netProfit >= 0 ? 'good' : 'bad'}">
                  <b>${money(netProfit)}</b>
                </td>

                <td>
                  <input
                    type="number"
                    value="${num(r.cashIn)}"
                    onchange="upd('financial','months.${i}.cashIn',this.value,'number')">
                </td>

                <td>
                  <input
                    type="number"
                    value="${num(r.cashOut)}"
                    onchange="upd('financial','months.${i}.cashOut',this.value,'number')">
                </td>

                <td>${money(netCashFlow)}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderPortfolio() {
  return `
    <div class="section-head">
      <div>
        <h3>Venture Portfolio</h3>
        <p>
          Rekam perubahan, evidence, keputusan,
          learning, dan next action.
        </p>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Week</th>
            <th>What Changed?</th>
            <th>Data / Evidence</th>
            <th>Decision</th>
            <th>Learning</th>
            <th>Next Action</th>
          </tr>
        </thead>

        <tbody>
          ${runtime.modules.portfolio.map((r, i) => `
            <tr>
              <td><b>W${r.week}</b></td>

              ${[
                'changed',
                'evidence',
                'decision',
                'learned',
                'next'
              ].map(k => `
                <td>
                  <textarea
                    onchange="upd('portfolio','${i}.${k}',this.value)">${esc(r[k])}</textarea>
                </td>
              `).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

/* ============================================================
   SAVE
   ============================================================ */

function upd(module, path, value, type = 'string') {
  let next = value;

  if (type === 'number') {
    next = num(value);
  }

  if (type === 'boolean') {
    next = Boolean(value);
  }

  setPath(runtime.modules[module], path, next);
  scheduleSave(module);
}

function setPath(obj, path, value) {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]];
  }

  current[parts.at(-1)] = value;
}

function scheduleSave(module) {
  clearTimeout(saveTimer);

  saveTimer = setTimeout(
    () => saveModule(module),
    500
  );
}

async function saveModule(module) {
  if (runtime.mode === 'demo') {
    const demo = loadDemo();
    const index = demo.students.findIndex(
      x => x.id === runtime.demoStudentId
    );

    if (index >= 0) {
      demo.students[index].modules = runtime.modules;
      demo.students[index].venture = runtime.venture;
      demo.students[index].submissions = runtime.submissions;
      demo.students[index].updatedAt = nowISO();

      saveDemo(demo);
      runtime.classData = demo.students;
    }

    toast('Tersimpan');
    return;
  }

  await saveRealModule(module, false);
}

async function saveRealModule(module, silent = false) {
  const { error } = await sb
    .from('module_data')
    .upsert({
      venture_id: runtime.venture.id,
      module_name: module,
      payload: runtime.modules[module],
      updated_at: nowISO()
    }, {
      onConflict: 'venture_id,module_name'
    });

  if (error) {
    console.error('[save module]', error);

    if (!silent) {
      toast(error.message);
    }

    return false;
  }

  if (!silent) {
    toast('Tersimpan ke cloud');
  }

  return true;
}

async function saveAllNow() {
  if (runtime.mode === 'demo') {
    for (const module of MODULES) {
      await saveModule(module);
    }
    return;
  }

  for (const module of MODULES) {
    await saveRealModule(module, true);
  }

  toast('Semua modul tersimpan');
}

async function updateVenture(key, value) {
  runtime.venture[key] = value;

  if (runtime.mode === 'demo') {
    const demo = loadDemo();
    const index = demo.students.findIndex(
      x => x.id === runtime.demoStudentId
    );

    if (index >= 0) {
      demo.students[index].venture = runtime.venture;
      demo.students[index].updatedAt = nowISO();
      saveDemo(demo);
    }

    toast('Profil venture tersimpan');
    return;
  }

  const { error } = await sb
    .from('ventures')
    .update({
      [key]: value,
      updated_at: nowISO()
    })
    .eq('id', runtime.venture.id);

  toast(
    error
      ? error.message
      : 'Profil venture tersimpan'
  );
}

/* ============================================================
   LECTURER
   ============================================================ */

function renderLecturerPage() {
  if (runtime.activePage === 'students') {
    return renderStudentsTable();
  }

  if (runtime.activePage === 'weekly') {
    return renderWeekly();
  }

  if (runtime.activePage === 'analytics') {
    return renderAnalytics();
  }

  return renderClassDashboard();
}

function classMetrics() {
  const students = runtime.classData || [];
  const withVenture = students.filter(
    x => x.venture?.id
  );

  const avg = withVenture.length
    ? withVenture.reduce(
        (sum, x) => sum + healthScore(x.modules),
        0
      ) / withVenture.length
    : 0;

  const revenue = withVenture.reduce(
    (sum, x) => sum + revenueTotal(x.modules),
    0
  );

  const updated = students.filter(
    x =>
      x.updatedAt &&
      (
        Date.now() -
        new Date(x.updatedAt).getTime()
      ) <= 7 * 86400000
  ).length;

  const running = students.filter(
    x => experimentStatus(x.modules) === 'RUNNING'
  ).length;

  const validated = students.filter(
    x => [
      'KEEP',
      'MODIFY',
      'PIVOT',
      'STOP'
    ].includes(experimentStatus(x.modules))
  ).length;

  const pending = students.reduce(
    (sum, s) =>
      sum +
      (s.submissions || []).filter(
        x => x.status === 'submitted'
      ).length,
    0
  );

  const reviewed = students.reduce(
    (sum, s) =>
      sum +
      (s.submissions || []).filter(
        x => x.status === 'reviewed'
      ).length,
    0
  );

  return {
    total: students.length,
    withVenture: withVenture.length,
    avg,
    revenue,
    updated,
    missing: students.length - updated,
    running,
    validated,
    pending,
    reviewed
  };
}

function renderClassDashboard() {
  const m = classMetrics();

  return `
    <div class="grid kpis">
      <div class="card kpi-card">
        <div class="label">Mahasiswa</div>
        <div class="value">${m.total}</div>
        <div class="meta">${m.withVenture} venture onboarded</div>
      </div>

      <div class="card kpi-card">
        <div class="label">Update ≤ 7 hari</div>
        <div class="value good">${m.updated}</div>
        <div class="meta">${m.missing} perlu follow-up</div>
      </div>

      <div class="card kpi-card">
        <div class="label">Avg Health</div>
        <div class="value">${fmt(m.avg)}/5</div>
        <div class="meta">class average</div>
      </div>

      <div class="card kpi-card">
        <div class="label">Experiments</div>
        <div class="value">${m.running}</div>
        <div class="meta">sedang berjalan</div>
      </div>

      <div class="card kpi-card">
        <div class="label">Pending Review</div>
        <div class="value">${m.pending}</div>
        <div class="meta">weekly submissions</div>
      </div>

      <div class="card kpi-card">
        <div class="label">Class Revenue</div>
        <div class="value" style="font-size:19px">
          ${money(m.revenue)}
        </div>
        <div class="meta">6-month snapshots</div>
      </div>
    </div>

    <div class="grid two" style="margin-top:15px">
      <div class="card">
        <div class="section-head">
          <div>
            <h3>Student Progress</h3>
            <p>
              10 venture dengan update atau progress terbaru.
            </p>
          </div>

          <button class="btn small"
                  onclick="go('students')">
            Lihat Semua
          </button>
        </div>

        ${studentMiniTable(runtime.classData.slice(0, 10))}
      </div>

      <div class="card">
        <h3>Class Health Distribution</h3>
        <p class="hint">
          Kelompok berdasarkan overall health score.
        </p>
        ${healthDistribution()}
      </div>
    </div>

    <div class="card" style="margin-top:15px">
      <h3>Needs Attention</h3>
      <p class="hint">
        Venture yang belum update &gt;7 hari
        atau health score di bawah 2.8.
      </p>
      ${attentionList()}
    </div>
  `;
}

function studentMiniTable(rows) {
  return `
    <div class="table-wrap">
      <table class="table"
             style="min-width:650px">
        <thead>
          <tr>
            <th>Mahasiswa</th>
            <th>Venture</th>
            <th>Health</th>
            <th>Week</th>
            <th>Evidence</th>
            <th>Last Update</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(s => studentRow(s, true)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function studentRow(student, mini = false) {
  const hs = healthScore(student.modules);
  const week = currentWeek(student.modules);
  const ev = evidenceCount(student.modules);

  const status = !student.updatedAt
    ? 'neutral'
    : (
        Date.now() -
        new Date(student.updatedAt).getTime()
      ) > 7 * 86400000
      ? 'bad'
      : 'good';

  return `
    <tr>
      <td>
        <span class="student-name">
          ${esc(student.profile.full_name)}
        </span>
        <div class="subtle">
          ${esc(student.profile.nim || '')}
        </div>
      </td>

      <td>
        ${esc(student.venture?.venture_name || 'Belum onboarding')}
        <div class="subtle">
          ${esc(student.venture?.category || '-')}
        </div>
      </td>

      <td>
        <span class="score">${fmt(hs)}</span>
      </td>

      <td>W${week || 0}</td>
      <td>${ev}</td>

      ${
        mini
          ? ''
          : `
            <td>${money(revenueTotal(student.modules))}</td>
            <td>${experimentStatus(student.modules)}</td>
          `
      }

      <td>
        <span class="status ${status}">
          ${lastUpdatedText(student.updatedAt)}
        </span>
      </td>

      <td>
        <button class="btn small"
                onclick="openStudent('${student.id}')">
          Detail
        </button>
      </td>
    </tr>
  `;
}

function renderStudentsTable() {
  return `
    <div class="section-head">
      <div>
        <h3>Student Ventures</h3>
        <p>
          Klik Detail untuk melihat data venture mahasiswa.
        </p>
      </div>

      <div class="search-row">
        <input id="studentSearch"
               placeholder="Cari nama / venture..."
               oninput="filterStudentTable(this.value)">
      </div>
    </div>

    <div id="studentTable">
      ${fullStudentTable(runtime.classData)}
    </div>
  `;
}

function fullStudentTable(rows) {
  return `
    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Mahasiswa</th>
            <th>Venture</th>
            <th>Health</th>
            <th>Week</th>
            <th>Evidence</th>
            <th>Revenue</th>
            <th>Experiment</th>
            <th>Last Update</th>
            <th></th>
          </tr>
        </thead>

        <tbody>
          ${rows.map(s => studentRow(s, false)).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function filterStudentTable(query) {
  const q = query.toLowerCase();

  const rows = runtime.classData.filter(student =>
    `
      ${student.profile.full_name}
      ${student.profile.nim}
      ${student.venture?.venture_name}
      ${student.venture?.category}
    `.toLowerCase().includes(q)
  );

  document.getElementById('studentTable').innerHTML =
    fullStudentTable(rows);
}

function renderWeekly() {
  const students = runtime.classData || [];

  const rows = students.map(student => {
    const submissions = student.submissions || [];
    const pending = submissions.filter(
      x => x.status === 'submitted'
    ).length;
    const reviewed = submissions.filter(
      x => x.status === 'reviewed'
    ).length;

    const latest = [...submissions].sort(
      (a, b) => Number(b.week) - Number(a.week)
    )[0];

    return `
      <tr>
        <td>
          <b>${esc(student.profile.full_name)}</b>
          <div class="subtle">
            ${esc(student.profile.nim || '')}
          </div>
        </td>

        <td>
          ${esc(student.venture?.venture_name || 'Belum onboarding')}
        </td>

        <td>W${currentWeek(student.modules) || 0}</td>
        <td>${pending}</td>
        <td>${reviewed}</td>

        <td>
          ${
            latest
              ? `
                <span class="status ${submissionStatusClass(latest.status)}">
                  W${latest.week} · ${submissionStatusLabel(latest.status)}
                </span>
              `
              : `<span class="status neutral">Belum submit</span>`
          }
        </td>

        <td>
          <button class="btn small"
                  onclick="openStudent('${student.id}')">
            Detail
          </button>
        </td>
      </tr>
    `;
  }).join('');

  return `
    <div class="grid kpis" style="margin-bottom:15px">
      <div class="card kpi-card">
        <div class="label">Pending Review</div>
        <div class="value">
          ${students.reduce(
            (sum, s) =>
              sum +
              (s.submissions || []).filter(
                x => x.status === 'submitted'
              ).length,
            0
          )}
        </div>
        <div class="meta">submission menunggu review</div>
      </div>

      <div class="card kpi-card">
        <div class="label">Reviewed</div>
        <div class="value good">
          ${students.reduce(
            (sum, s) =>
              sum +
              (s.submissions || []).filter(
                x => x.status === 'reviewed'
              ).length,
            0
          )}
        </div>
        <div class="meta">submission selesai direview</div>
      </div>
    </div>

    <div class="card">
      <div class="section-head">
        <div>
          <h3>Weekly Submission Status</h3>
          <p>
            Status submission Week 1–16 dari mahasiswa.
          </p>
        </div>
      </div>

      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Mahasiswa</th>
              <th>Venture</th>
              <th>Sprint</th>
              <th>Pending</th>
              <th>Reviewed</th>
              <th>Latest</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            ${rows || `
              <tr>
                <td colspan="7">
                  Belum ada mahasiswa.
                </td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderAnalytics() {
  const sorted = [...runtime.classData].sort(
    (a, b) =>
      healthScore(b.modules) -
      healthScore(a.modules)
  );

  return `
    <div class="grid equal">
      <div class="card">
        <h3>Health Score Snapshot</h3>
        <p class="hint">
          Digunakan untuk melihat kondisi venture berdasarkan
          self-assessment, bukan nilai akhir mahasiswa.
        </p>

        ${sorted.slice(0, 8).map(student => `
          <div class="metric">
            <span>${esc(student.venture?.venture_name)}</span>
            <strong>
              ${fmt(healthScore(student.modules))}/5
            </strong>
          </div>
        `).join('')}
      </div>

      <div class="card">
        <h3>Customer Evidence Coverage</h3>
        <p class="hint">
          Jumlah evidence yang sudah terdokumentasi.
        </p>

        ${[...runtime.classData]
          .sort(
            (a, b) =>
              evidenceCount(b.modules) -
              evidenceCount(a.modules)
          )
          .slice(0, 8)
          .map(student => `
            <div class="metric">
              <span>${esc(student.venture?.venture_name)}</span>
              <strong>
                ${evidenceCount(student.modules)}/10
              </strong>
            </div>
          `).join('')}
      </div>
    </div>

    <div class="card" style="margin-top:15px">
      <h3>Revenue Snapshot</h3>
      <p class="hint">
        Informasi finansial bersifat sensitif dan hanya
        tampil pada Lecturer View.
      </p>

      ${[...runtime.classData]
        .sort(
          (a, b) =>
            revenueTotal(b.modules) -
            revenueTotal(a.modules)
        )
        .slice(0, 10)
        .map(student => `
          <div class="metric">
            <span>
              ${esc(student.venture?.venture_name)}
              <span class="subtle">
                · ${esc(student.profile.full_name)}
              </span>
            </span>

            <strong>
              ${money(revenueTotal(student.modules))}
            </strong>
          </div>
        `).join('')}
    </div>
  `;
}

function healthDistribution() {
  const bins = [
    ['4.0–5.0', 0],
    ['3.0–3.9', 0],
    ['2.0–2.9', 0],
    ['< 2.0', 0]
  ];

  runtime.classData.forEach(student => {
    const health = healthScore(student.modules);

    if (health >= 4) bins[0][1]++;
    else if (health >= 3) bins[1][1]++;
    else if (health >= 2) bins[2][1]++;
    else bins[3][1]++;
  });

  return bins.map(([name, count]) => `
    <div class="progress-row">
      <span>${name}</span>
      <div class="bar-track">
        <div class="bar-fill"
             style="width:${
               runtime.classData.length
                 ? count / runtime.classData.length * 100
                 : 0
             }%">
        </div>
      </div>
      <strong>${count}</strong>
    </div>
  `).join('');
}

function attentionList() {
  const rows = runtime.classData.filter(
    student =>
      healthScore(student.modules) < 2.8 ||
      !student.updatedAt ||
      (
        Date.now() -
        new Date(student.updatedAt).getTime()
      ) > 7 * 86400000
  ).slice(0, 8);

  if (!rows.length) {
    return `
      <div class="empty">
        Tidak ada alert saat ini.
      </div>
    `;
  }

  return rows.map(student => `
    <div class="metric">
      <span>
        <b>${esc(student.profile.full_name)}</b>
        · ${esc(student.venture?.venture_name)}
      </span>

      <span>
        ${
          healthScore(student.modules) < 2.8
            ? `<span class="status warn">Health rendah</span>`
            : ''
        }

        ${
          !student.updatedAt ||
          (
            Date.now() -
            new Date(student.updatedAt).getTime()
          ) > 7 * 86400000
            ? `<span class="status bad">Update terlambat</span>`
            : ''
        }
      </span>
    </div>
  `).join('');
}


/* ============================================================
   LECTURER REVIEW ACTIONS
   ============================================================ */

function lecturerStudentById(studentId) {
  return (runtime.classData || []).find(
    student => student.id === studentId
  ) || null;
}

async function saveLecturerFeedback(studentId, week) {
  if (runtime.role !== 'lecturer') {
    toast('Hanya dosen yang dapat memberi feedback.');
    return;
  }

  const student = lecturerStudentById(studentId);

  if (!student?.venture?.id) {
    toast('Venture mahasiswa belum tersedia.');
    return;
  }

  const input = document.getElementById(
    `feedback-${studentId}-${week}`
  );

  const message = String(input?.value || '').trim();

  if (!message) {
    toast('Tulis feedback terlebih dahulu.');
    return;
  }

  if (runtime.mode === 'demo') {
    const row = {
      id: `demo-feedback-${Date.now()}`,
      venture_id: student.venture.id,
      lecturer_id: runtime.profile.id,
      module_name: 'sprint',
      week: Number(week),
      message,
      created_at: nowISO()
    };

    student.feedback ??= [];
    student.feedback.unshift(row);

    const demo = loadDemo();
    const index = demo.students.findIndex(
      item => item.id === studentId
    );

    if (index >= 0) {
      demo.students[index].feedback = student.feedback;
      saveDemo(demo);
    }

    renderApp();
    toast(`Feedback Week ${week} tersimpan`);
    return;
  }

  const { data, error } = await sb
    .from('lecturer_feedback')
    .insert({
      venture_id: student.venture.id,
      lecturer_id: runtime.profile.id,
      module_name: 'sprint',
      week: Number(week),
      message
    })
    .select()
    .single();

  if (error) {
    console.error('[lecturer feedback]', error);
    toast(`Gagal menyimpan feedback: ${error.message}`);
    return;
  }

  student.feedback ??= [];
  student.feedback.unshift(data);

  renderApp();
  toast(`Feedback Week ${week} tersimpan`);
}

async function markWeekReviewed(studentId, week) {
  if (runtime.role !== 'lecturer') {
    toast('Hanya dosen yang dapat melakukan review.');
    return;
  }

  const student = lecturerStudentById(studentId);

  if (!student?.venture?.id) {
    toast('Venture mahasiswa belum tersedia.');
    return;
  }

  const existing = (student.submissions || []).find(
    row => Number(row.week) === Number(week)
  );

  if (!existing) {
    toast(`Week ${week} belum disubmit mahasiswa.`);
    return;
  }

  if (existing.status === 'reviewed') {
    toast(`Week ${week} sudah Reviewed.`);
    return;
  }

  if (runtime.mode === 'demo') {
    existing.status = 'reviewed';
    existing.reviewed_at = nowISO();
    existing.updated_at = nowISO();

    const demo = loadDemo();
    const index = demo.students.findIndex(
      item => item.id === studentId
    );

    if (index >= 0) {
      demo.students[index].submissions = student.submissions;
      saveDemo(demo);
    }

    renderApp();
    toast(`Week ${week} ditandai Reviewed`);
    return;
  }

  const now = nowISO();

  const { data, error } = await sb
    .from('weekly_submissions')
    .update({
      status: 'reviewed',
      reviewed_at: now,
      updated_at: now
    })
    .eq('venture_id', student.venture.id)
    .eq('week', Number(week))
    .select()
    .single();

  if (error) {
    console.error('[mark reviewed]', error);
    toast(`Gagal review: ${error.message}`);
    return;
  }

  const index = student.submissions.findIndex(
    row => Number(row.week) === Number(week)
  );

  if (index >= 0) {
    student.submissions[index] = data;
  }

  renderApp();
  toast(`Week ${week} ditandai Reviewed`);
}

function lecturerWeekDetail(student, row) {
  const submission = (student.submissions || []).find(
    item => Number(item.week) === Number(row.week)
  );

  const feedback = (student.feedback || [])
    .filter(item => Number(item.week) === Number(row.week))
    .sort(
      (a, b) =>
        new Date(b.created_at || 0) -
        new Date(a.created_at || 0)
    );

  const fields = [
    ['Priority Problem', row.problem],
    ['Hypothesis', row.hypothesis],
    ['Experiment', row.experiment],
    ['KPI', row.kpi],
    ['Baseline', row.baseline],
    ['Target', row.target],
    ['Result', row.result],
    ['Learning', row.learning],
    ['Decision', row.decision],
    ['Next Move', row.nextMove]
  ];

  const status = submission?.status || 'draft';

  return `
    <div class="card" style="margin-bottom:12px">
      <div class="section-head">
        <div>
          <h3>Week ${row.week}</h3>
          <p>
            ${
              submission?.submitted_at
                ? `Submitted ${prettyDate(submission.submitted_at)}`
                : 'Belum disubmit'
            }
          </p>
        </div>

        <span class="status ${submissionStatusClass(status)}">
          ${submissionStatusLabel(status)}
        </span>
      </div>

      <div class="form-grid">
        ${fields.map(([label, value]) => `
          <div class="field ${
            ['Hypothesis', 'Learning', 'Next Move'].includes(label)
              ? 'full'
              : ''
          }">
            <label>${label}</label>
            <div class="note">
              ${esc(value || '-')}
            </div>
          </div>
        `).join('')}
      </div>

      <div style="margin-top:14px">
        <h4 style="margin:0 0 8px">Feedback Dosen</h4>

        ${
          feedback.length
            ? feedback.map(item => `
                <div class="note" style="margin-bottom:8px">
                  ${esc(item.message)}
                  <div class="subtle" style="margin-top:4px">
                    ${prettyDate(item.created_at)}
                  </div>
                </div>
              `).join('')
            : `<div class="subtle" style="margin-bottom:8px">
                 Belum ada feedback.
               </div>`
        }

        <textarea
          id="feedback-${student.id}-${row.week}"
          placeholder="Tulis feedback untuk Week ${row.week}..."></textarea>

        <div style="
          display:flex;
          gap:8px;
          flex-wrap:wrap;
          margin-top:8px;
        ">
          <button
            class="btn small"
            onclick="saveLecturerFeedback('${student.id}',${row.week})">
            Simpan Feedback
          </button>

          <button
            class="btn small primary"
            onclick="markWeekReviewed('${student.id}',${row.week})"
            ${
              !submission || submission.status === 'reviewed'
                ? 'disabled'
                : ''
            }>
            ${
              submission?.status === 'reviewed'
                ? 'Sudah Reviewed'
                : 'Mark as Reviewed'
            }
          </button>
        </div>
      </div>
    </div>
  `;
}

/* ============================================================
   STUDENT DETAIL
   ============================================================ */

function openStudent(id) {
  runtime.selectedStudent = runtime.classData.find(
    x => x.id === id
  );
  runtime.selectedStudentTab = 'overview';
  renderApp();
}

function closeStudent() {
  runtime.selectedStudent = null;
  renderApp();
}

function studentTab(tab) {
  runtime.selectedStudentTab = tab;
  renderApp();
}

function renderStudentDrawer() {
  const student = runtime.selectedStudent;

  if (!student) return '';

  const tabs = [
    ['overview', 'Overview'],
    ['health', 'Health'],
    ['kpi', 'KPI'],
    ['problem', 'Problem Tree'],
    ['evidence', 'Evidence'],
    ['sprint', 'Sprint & Review'],
    ['financial', 'Financial'],
    ['experiment', 'Experiment'],
    ['portfolio', 'Portfolio']
  ];

  return `
    <div class="drawer"
         onclick="if(event.target===this)closeStudent()">
      <div class="drawer-panel">
        <div class="drawer-head">
          <div>
            <h3>
              ${esc(student.venture?.venture_name || 'Venture')}
            </h3>
            <p class="subtitle">
              ${esc(student.profile.full_name)}
              · ${esc(student.profile.nim || '')}
              · ${esc(student.venture?.category || '-')}
            </p>
          </div>

          <button class="btn small"
                  onclick="closeStudent()">
            Tutup
          </button>
        </div>

        <div class="module-tabs">
          ${tabs.map(([key, label]) => `
            <button
              class="${runtime.selectedStudentTab === key ? 'active' : ''}"
              onclick="studentTab('${key}')">
              ${label}
            </button>
          `).join('')}
        </div>

        ${renderStudentTab(student, student.modules)}
      </div>
    </div>
  `;
}

function renderStudentTab(student, modules) {
  switch (runtime.selectedStudentTab) {
    case 'health':
      return `
        <div class="card">
          <h3>Health Check</h3>
          ${modules.health.map(x => `
            <div class="metric">
              <span>
                <b>${esc(x.area)}</b>
                <div class="subtle">${esc(x.question || '')}</div>
                <div class="subtle">
                  Evidence: ${esc(x.evidence || 'Belum ada')}
                </div>
                <div class="subtle">
                  Action: ${esc(x.action || '-')}
                </div>
              </span>
              <span class="score">${x.score}/5</span>
            </div>
          `).join('')}
        </div>
      `;

    case 'kpi':
      return `
        <div class="card">
          <h3>Baseline KPI</h3>
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>KPI</th>
                  <th>Baseline</th>
                  <th>Target</th>
                  <th>Unit</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                ${modules.kpi.map(row => `
                  <tr>
                    <td>
                      <b>${esc(row.kpi)}</b>
                      <div class="subtle">${esc(row.category)}</div>
                    </td>
                    <td>${esc(row.baseline || '-')}</td>
                    <td>${esc(row.target || '-')}</td>
                    <td>${esc(row.unit || '-')}</td>
                    <td>${esc(row.source || '-')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

    case 'problem': {
      const p = modules.problem || {};
      const items = [
        ['Core Problem', p.coreProblem],
        ['Symptom', p.symptom],
        ['WHY #1', p.why1],
        ['WHY #2', p.why2],
        ['WHY #3', p.why3],
        ['Root Cause', p.rootCause],
        ['Consequence', p.consequence],
        ['Priority Problem', p.priorityProblem],
        ['Next Sprint Hypothesis', p.hypothesis],
        ['KPI', p.kpi],
        ['Deadline', p.deadline]
      ];

      return `
        <div class="card">
          <h3>Problem Tree</h3>
          ${items.map(([label, value]) => `
            <div class="metric">
              <span>${label}</span>
              <strong style="
                max-width:68%;
                text-align:right;
                white-space:normal;
              ">
                ${esc(value || '-')}
              </strong>
            </div>
          `).join('')}
        </div>
      `;
    }

    case 'evidence':
      return `
        <div class="card">
          <h3>Customer Evidence</h3>
          ${
            modules.evidence.filter(
              x =>
                filled(x.customer) ||
                filled(x.problem) ||
                filled(x.quote)
            ).map(x => `
              <div class="metric">
                <span>
                  <b>${esc(x.customer || '-')}</b>
                  <div class="subtle">
                    Problem: ${esc(x.problem || '-')}
                  </div>
                  <div class="subtle">
                    Alternative: ${esc(x.alternative || '-')}
                  </div>
                  <div class="subtle">
                    WTP: ${esc(x.wtp || '-')}
                  </div>
                  <div class="subtle">
                    Quote: ${esc(x.quote || '-')}
                  </div>
                  <div class="subtle">
                    Insight: ${esc(x.insight || '-')}
                  </div>
                </span>
                <span class="score">
                  Pain ${x.pain}
                </span>
              </div>
            `).join('') ||
            `<div class="empty">Belum ada evidence.</div>`
          }
        </div>
      `;

    case 'sprint': {
      const filledWeeks = modules.sprint.filter(
        row =>
          Object.entries(row).some(
            ([key, value]) =>
              key !== 'week' && filled(value)
          )
      );

      return `
        <div>
          ${
            filledWeeks.length
              ? filledWeeks
                  .map(row => lecturerWeekDetail(student, row))
                  .join('')
              : `<div class="card">
                   <div class="empty">
                     Belum ada Weekly Sprint yang terisi.
                   </div>
                 </div>`
          }
        </div>
      `;
    }

    case 'financial':
      return `
        <div class="card">
          <h3>Financial Snapshot</h3>
          ${modules.financial.months.map(x => {
            const gross = num(x.revenue) - num(x.cogs);
            const net = gross - num(x.opex);

            return `
              <div class="metric">
                <span>
                  <b>${esc(x.month)}</b>
                  <div class="subtle">
                    Revenue ${money(x.revenue)}
                    · COGS ${money(x.cogs)}
                    · OPEX ${money(x.opex)}
                  </div>
                </span>
                <span>
                  <b>${money(net)}</b>
                  <div class="subtle">Net Profit</div>
                </span>
              </div>
            `;
          }).join('')}
        </div>
      `;

    case 'experiment':
      return `
        <div class="card">
          <h3>
            ${esc(modules.experiment.name || 'Experiment Card')}
          </h3>

          ${[
            ['Problem', 'problem'],
            ['Hypothesis', 'hypothesis'],
            ['Target Customer', 'targetCustomer'],
            ['Action', 'action'],
            ['Success Metric', 'successMetric'],
            ['Baseline', 'baseline'],
            ['Target', 'target'],
            ['Duration', 'duration'],
            ['Sample Size', 'sampleSize'],
            ['Expected Cost', 'expectedCost'],
            ['Evidence', 'evidence'],
            ['Result', 'result'],
            ['Learning', 'learning'],
            ['Decision', 'decision'],
            ['Next Experiment', 'nextExperiment']
          ].map(([label, key]) => `
            <div class="metric">
              <span>${label}</span>
              <strong style="
                max-width:65%;
                text-align:right;
                white-space:normal;
              ">
                ${esc(modules.experiment[key] || '-')}
              </strong>
            </div>
          `).join('')}
        </div>
      `;

    case 'portfolio':
      return `
        <div class="card">
          <h3>Venture Portfolio</h3>
          ${
            modules.portfolio.filter(
              x => filled(x.changed) || filled(x.evidence)
            ).map(x => `
              <div class="metric">
                <span>
                  <b>Week ${x.week}</b>
                  <div class="subtle">
                    Changed: ${esc(x.changed || '-')}
                  </div>
                  <div class="subtle">
                    Evidence: ${esc(x.evidence || '-')}
                  </div>
                  <div class="subtle">
                    Learning: ${esc(x.learned || '-')}
                  </div>
                  <div class="subtle">
                    Next: ${esc(x.next || '-')}
                  </div>
                </span>
                <span>${esc(x.decision || '-')}</span>
              </div>
            `).join('') ||
            `<div class="empty">Belum ada portfolio.</div>`
          }
        </div>
      `;

    default:
      return `
        <div class="grid equal">
          <div class="card kpi-card">
            <div class="label">Health</div>
            <div class="value">
              ${fmt(healthScore(modules))}/5
            </div>
          </div>

          <div class="card kpi-card">
            <div class="label">Evidence</div>
            <div class="value">
              ${evidenceCount(modules)}
            </div>
          </div>

          <div class="card kpi-card">
            <div class="label">Current Sprint</div>
            <div class="value">
              W${currentWeek(modules) || 0}
            </div>
          </div>

          <div class="card kpi-card">
            <div class="label">Pending Review</div>
            <div class="value">
              ${(student.submissions || []).filter(
                row => row.status === 'submitted'
              ).length}
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:12px">
          <h3>Venture Profile</h3>

          <div class="metric">
            <span>Mahasiswa</span>
            <strong>${esc(student.profile.full_name)}</strong>
          </div>

          <div class="metric">
            <span>NIM</span>
            <strong>${esc(student.profile.nim || '-')}</strong>
          </div>

          <div class="metric">
            <span>Venture</span>
            <strong>${esc(student.venture?.venture_name || '-')}</strong>
          </div>

          <div class="metric">
            <span>Category</span>
            <strong>${esc(student.venture?.category || '-')}</strong>
          </div>

          <div class="metric">
            <span>Last Update</span>
            <strong>${lastUpdatedText(student.updatedAt)}</strong>
          </div>

          <div class="metric">
            <span>Toolkit Completion</span>
            <strong>${completion(modules)}%</strong>
          </div>
        </div>
      `;
  }
}

/* ============================================================
   INIT
   ============================================================ */

async function init() {
  if (REAL_READY) {
    const { data, error } = await sb.auth.getSession();

    if (error) {
      console.error('[auth session]', error);
    }

    if (data?.session) {
      await loadRealUser(data.session.user);
      return;
    }
  }

  renderAuth();
}

init();

console.info(`[Venture Dashboard] v${APP_VERSION} loaded`);
