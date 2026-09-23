/*
 * Venture Dashboard v3 add-on
 * Lab. Kewirausahaan II
 *
 * Loaded AFTER app.js.
 * Adds:
 * - weekly submission workflow
 * - lecturer review workflow
 * - lecturer feedback
 * - real submission status in lecturer dashboard
 *
 * Safe rollback:
 * remove <script src="toolkit-v3.js"></script> from index.html.
 */

(() => {
  'use strict';

  if (typeof runtime === 'undefined') {
    console.error('[Toolkit v3] app.js belum dimuat.');
    return;
  }

  const V3_VERSION = '3.0';
  runtime.v3Submissions = runtime.v3Submissions || [];
  runtime.v3Feedback = runtime.v3Feedback || [];

  function v3StatusClass(status) {
    if (status === 'reviewed') return 'good';
    if (status === 'submitted') return 'warn';
    return 'neutral';
  }

  function v3StatusLabel(status) {
    if (status === 'reviewed') return 'Reviewed';
    if (status === 'submitted') return 'Submitted';
    return 'Draft';
  }

  function v3Date(iso) {
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

  function v3HasSprintData(week) {
    const row = runtime.modules?.sprint?.find(x => Number(x.week) === Number(week));
    if (!row) return false;
    return Object.entries(row).some(([key, value]) => key !== 'week' && filled(value));
  }

  function v3SubmissionFor(week, source = runtime.v3Submissions) {
    return (source || []).find(x => Number(x.week) === Number(week)) || null;
  }

  function v3FeedbackFor(week, source = runtime.v3Feedback) {
    return (source || [])
      .filter(x => Number(x.week) === Number(week))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  async function v3LoadStudentData() {
    if (!REAL_READY || runtime.mode !== 'real' || !runtime.venture?.id) return;

    const [subRes, feedRes] = await Promise.all([
      sb.from('weekly_submissions')
        .select('*')
        .eq('venture_id', runtime.venture.id)
        .order('week'),
      sb.from('lecturer_feedback')
        .select('*')
        .eq('venture_id', runtime.venture.id)
        .order('created_at', { ascending: false })
    ]);

    if (subRes.error) toast(subRes.error.message);
    if (feedRes.error) toast(feedRes.error.message);

    runtime.v3Submissions = subRes.data || [];
    runtime.v3Feedback = feedRes.data || [];
  }

  async function v3LoadLecturerData() {
    if (!REAL_READY || runtime.mode !== 'real' || runtime.role !== 'lecturer') return;

    const ventureIds = (runtime.classData || [])
      .map(x => x.venture?.id)
      .filter(Boolean);

    let submissions = [];
    let feedback = [];

    if (ventureIds.length) {
      const [subRes, feedRes] = await Promise.all([
        sb.from('weekly_submissions')
          .select('*')
          .in('venture_id', ventureIds)
          .order('week'),
        sb.from('lecturer_feedback')
          .select('*')
          .in('venture_id', ventureIds)
          .order('created_at', { ascending: false })
      ]);

      if (subRes.error) toast(subRes.error.message);
      if (feedRes.error) toast(feedRes.error.message);

      submissions = subRes.data || [];
      feedback = feedRes.data || [];
    }

    const subByVenture = {};
    const feedByVenture = {};

    submissions.forEach(row => {
      (subByVenture[row.venture_id] ||= []).push(row);
    });

    feedback.forEach(row => {
      (feedByVenture[row.venture_id] ||= []).push(row);
    });

    runtime.classData = (runtime.classData || []).map(item => ({
      ...item,
      submissions: item.venture?.id ? (subByVenture[item.venture.id] || []) : [],
      feedback: item.venture?.id ? (feedByVenture[item.venture.id] || []) : []
    }));
  }

  window.v3SubmitWeek = async function(week) {
    if (runtime.mode !== 'real') return toast('Submission hanya tersedia di Cloud Mode.');
    if (!runtime.venture?.id) return toast('Venture belum tersedia.');
    if (!v3HasSprintData(week)) return toast(`Isi Weekly Sprint Week ${week} terlebih dahulu.`);

    const existing = v3SubmissionFor(week);
    if (existing?.status === 'reviewed') {
      return toast(`Week ${week} sudah direview dosen.`);
    }

    const now = nowISO();
    const payload = {
      venture_id: runtime.venture.id,
      week: Number(week),
      status: 'submitted',
      submitted_at: existing?.submitted_at || now,
      reviewed_at: null,
      updated_at: now
    };

    const { error } = await sb.from('weekly_submissions')
      .upsert(payload, { onConflict: 'venture_id,week' });

    if (error) return toast(error.message);

    await saveRealModule('sprint', true);
    await saveRealModule('portfolio', true);
    await v3LoadStudentData();
    renderApp();
    toast(`Week ${week} berhasil disubmit`);
  };

  window.v3MarkReviewed = async function(ventureId, week) {
    if (runtime.mode !== 'real' || runtime.role !== 'lecturer') return;

    const { error } = await sb.from('weekly_submissions')
      .update({
        status: 'reviewed',
        reviewed_at: nowISO(),
        updated_at: nowISO()
      })
      .eq('venture_id', ventureId)
      .eq('week', Number(week));

    if (error) return toast(error.message);

    await loadRealClass();
    if (runtime.selectedStudent) {
      runtime.selectedStudent = runtime.classData.find(x => x.id === runtime.selectedStudent.id) || runtime.selectedStudent;
    }
    renderApp();
    toast(`Week ${week} ditandai Reviewed`);
  };

  window.v3SaveFeedback = async function(ventureId, week) {
    if (runtime.mode !== 'real' || runtime.role !== 'lecturer') return;
    const input = document.getElementById(`v3-feedback-${ventureId}-${week}`);
    const message = input?.value?.trim();
    if (!message) return toast('Isi feedback terlebih dahulu.');

    const { error } = await sb.from('lecturer_feedback').insert({
      venture_id: ventureId,
      lecturer_id: runtime.profile.id,
      module_name: 'sprint',
      week: Number(week),
      message,
      created_at: nowISO(),
      updated_at: nowISO()
    });

    if (error) return toast(error.message);

    input.value = '';
    await loadRealClass();
    if (runtime.selectedStudent) {
      runtime.selectedStudent = runtime.classData.find(x => x.id === runtime.selectedStudent.id) || runtime.selectedStudent;
    }
    renderApp();
    toast(`Feedback Week ${week} tersimpan`);
  };

  function v3StudentSubmissionPanel() {
    if (runtime.mode !== 'real') {
      return `<div class="card" style="margin-bottom:15px">
        <h3>Weekly Submission</h3>
        <p class="hint">Status submit dan review dosen tersedia pada Cloud Mode.</p>
      </div>`;
    }

    const rows = Array.from({ length: 16 }, (_, i) => i + 1).map(week => {
      const sub = v3SubmissionFor(week);
      const status = sub?.status || 'draft';
      const feedback = v3FeedbackFor(week);
      const hasData = v3HasSprintData(week);
      const disabled = status === 'reviewed' || !hasData;

      return `<div class="metric" style="align-items:flex-start;gap:16px">
        <span style="min-width:0;flex:1">
          <b>Week ${week}</b>
          <div class="subtle">
            ${sub?.submitted_at ? `Submitted ${v3Date(sub.submitted_at)}` : (hasData ? 'Sprint sudah terisi, belum disubmit.' : 'Sprint belum terisi.')}
          </div>
          ${feedback.length ? `<div class="note" style="margin-top:8px"><b>Feedback dosen:</b><br>${feedback.slice(0,2).map(x => esc(x.message)).join('<br><br>')}</div>` : ''}
        </span>
        <span style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">
          <span class="status ${v3StatusClass(status)}">${v3StatusLabel(status)}</span>
          <button class="btn small" onclick="v3SubmitWeek(${week})" ${disabled ? 'disabled' : ''}>
            ${status === 'submitted' ? 'Submit ulang' : status === 'reviewed' ? 'Reviewed' : 'Submit'}
          </button>
        </span>
      </div>`;
    }).join('');

    return `<div class="card" style="margin-bottom:15px">
      <div class="section-head">
        <div>
          <h3>Weekly Submission</h3>
          <p>Isi sprint terlebih dahulu, lalu submit ke dosen untuk direview.</p>
        </div>
        <span class="score">v${V3_VERSION}</span>
      </div>
      ${rows}
    </div>`;
  }

  function v3LecturerWeeklyDashboard() {
    const classData = runtime.classData || [];
    const totals = { submitted: 0, reviewed: 0 };

    classData.forEach(student => {
      (student.submissions || []).forEach(s => {
        if (s.status === 'submitted') totals.submitted++;
        if (s.status === 'reviewed') totals.reviewed++;
      });
    });

    const rows = classData.map(student => {
      const submissions = student.submissions || [];
      const reviewed = submissions.filter(x => x.status === 'reviewed').length;
      const submitted = submissions.filter(x => x.status === 'submitted').length;
      const latest = [...submissions].sort((a, b) => Number(b.week) - Number(a.week))[0];
      const latestStatus = latest?.status || 'draft';

      return `<tr>
        <td>
          <span class="student-name">${esc(student.profile.full_name)}</span>
          <div class="subtle">${esc(student.profile.nim || '')}</div>
        </td>
        <td>${esc(student.venture?.venture_name || 'Belum onboarding')}</td>
        <td>W${currentWeek(student.modules) || 0}</td>
        <td>${submitted}</td>
        <td>${reviewed}</td>
        <td><span class="status ${v3StatusClass(latestStatus)}">${latest ? `W${latest.week} · ${v3StatusLabel(latestStatus)}` : 'Belum submit'}</span></td>
        <td><button class="btn small" onclick="openStudent('${student.id}')">Review</button></td>
      </tr>`;
    }).join('');

    return `<div class="grid kpis" style="margin-bottom:15px">
        <div class="card kpi-card">
          <div class="label">Pending Review</div>
          <div class="value">${totals.submitted}</div>
          <div class="meta">submission menunggu review</div>
        </div>
        <div class="card kpi-card">
          <div class="label">Reviewed</div>
          <div class="value good">${totals.reviewed}</div>
          <div class="meta">submission selesai direview</div>
        </div>
      </div>
      <div class="card">
        <div class="section-head">
          <div>
            <h3>Weekly Submission Status</h3>
            <p>Status berasal dari submission nyata, bukan hanya kelengkapan kolom sprint.</p>
          </div>
        </div>
        <div class="table-wrap">
          <table class="table">
            <thead>
              <tr>
                <th>Mahasiswa</th>
                <th>Venture</th>
                <th>Progress Sprint</th>
                <th>Pending</th>
                <th>Reviewed</th>
                <th>Latest Submission</th>
                <th></th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="7">Belum ada mahasiswa.</td></tr>'}</tbody>
          </table>
        </div>
      </div>`;
  }

  function v3LecturerReviewPanel(student) {
    if (!student?.venture?.id) return '';

    const submissions = student.submissions || [];
    const feedback = student.feedback || [];

    const active = submissions
      .filter(s => ['submitted', 'reviewed'].includes(s.status))
      .sort((a, b) => Number(b.week) - Number(a.week));

    if (!active.length) {
      return `<div class="card" style="margin-top:12px">
        <h3>Lecturer Review</h3>
        <div class="empty">Mahasiswa belum memiliki weekly submission.</div>
      </div>`;
    }

    return `<div class="card" style="margin-top:12px">
      <div class="section-head">
        <div>
          <h3>Lecturer Review</h3>
          <p>Berikan feedback per minggu dan tandai submission selesai direview.</p>
        </div>
      </div>
      ${active.map(sub => {
        const weekFeedback = feedback
          .filter(f => Number(f.week) === Number(sub.week))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return `<div style="border-top:1px solid var(--border,#e5e7eb);padding:14px 0">
          <div class="metric" style="border:0;padding:0 0 10px">
            <span>
              <b>Week ${sub.week}</b>
              <div class="subtle">Submitted ${v3Date(sub.submitted_at)}</div>
            </span>
            <span class="status ${v3StatusClass(sub.status)}">${v3StatusLabel(sub.status)}</span>
          </div>

          ${weekFeedback.length ? `<div class="note" style="margin-bottom:10px">
            ${weekFeedback.map(f => `<div style="margin-bottom:8px"><b>${v3Date(f.created_at)}</b><br>${esc(f.message)}</div>`).join('')}
          </div>` : ''}

          <div class="field">
            <label>Feedback Week ${sub.week}</label>
            <textarea id="v3-feedback-${student.venture.id}-${sub.week}" placeholder="Catatan dosen, pertanyaan kritis, atau arahan eksperimen berikutnya..."></textarea>
          </div>

          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
            <button class="btn small" onclick="v3SaveFeedback('${student.venture.id}',${sub.week})">Simpan Feedback</button>
            <button class="btn small primary" onclick="v3MarkReviewed('${student.venture.id}',${sub.week})" ${sub.status === 'reviewed' ? 'disabled' : ''}>
              ${sub.status === 'reviewed' ? 'Sudah Reviewed' : 'Mark Reviewed'}
            </button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  // ---- Hook app.js without rewriting the existing file ----

  const originalLoadRealUser = loadRealUser;
  loadRealUser = async function(user) {
    await originalLoadRealUser(user);
    if (runtime.mode === 'real' && runtime.role === 'student' && runtime.venture?.id) {
      await v3LoadStudentData();
      renderApp();
    }
  };

  const originalLoadRealClass = loadRealClass;
  loadRealClass = async function() {
    await originalLoadRealClass();
    await v3LoadLecturerData();
  };

  const originalCreateRealVenture = createRealVenture;
  createRealVenture = async function(event) {
    await originalCreateRealVenture(event);
    runtime.v3Submissions = [];
    runtime.v3Feedback = [];
  };

  const originalRenderSprint = renderSprint;
  renderSprint = function() {
    return v3StudentSubmissionPanel() + originalRenderSprint();
  };

  const originalRenderWeekly = renderWeekly;
  renderWeekly = function() {
    if (runtime.mode === 'real') return v3LecturerWeeklyDashboard();
    return originalRenderWeekly();
  };

  const originalRenderStudentDrawer = renderStudentDrawer;
  renderStudentDrawer = function() {
    const html = originalRenderStudentDrawer();
    if (runtime.mode !== 'real' || runtime.role !== 'lecturer' || !runtime.selectedStudent) return html;

    const review = v3LecturerReviewPanel(runtime.selectedStudent);
    return html.replace(/<\/div><\/div>$/, `${review}</div></div>`);
  };

  // If app.js already restored an existing session before this add-on loaded,
  // hydrate v3 data once and rerender.
  setTimeout(async () => {
    try {
      if (!REAL_READY || runtime.mode !== 'real') return;

      if (runtime.role === 'lecturer') {
        await v3LoadLecturerData();
      } else if (runtime.role === 'student' && runtime.venture?.id) {
        await v3LoadStudentData();
      }

      renderApp();
    } catch (err) {
      console.error('[Toolkit v3] bootstrap error', err);
    }
  }, 800);

  console.info(`[Toolkit v3] loaded v${V3_VERSION}`);
})();
