/* Core: state, storage, router, event delegation, shared UI helpers, charts, rest timer.
   View modules in assets/js/views/*.js register routes and actions on window.FDS. */
(function () {
  const D = window.FDS_DATA, L = window.FDS_LOGIC;
  const params = new URLSearchParams(location.search);
  const DEMO = params.has('demo');
  const KEY = DEMO ? 'fds:demo' : 'fds:v1';
  const FDS = window.FDS = { D, L, demo: DEMO, routes: {}, act: {}, onInput: {}, onChange: {}, onSubmit: {} };

  // ================= helpers =================
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  FDS.esc = esc;
  FDS.today = () => L.todayKey();
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  FDS.MON = MON; FDS.DOW = DOW;
  // 'Mon 14 Sep' | long: 'Monday 14 September' | short: '14 Sep'
  FDS.dateLabel = (k, mode) => {
    if (!k) return '—';
    const d = L.parse(k);
    if (mode === 'short') return `${d.getDate()} ${MON[d.getMonth()]}`;
    if (mode === 'long') return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' });
    if (mode === 'year') return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
    return `${DOW[L.dow(k)]} ${d.getDate()} ${MON[d.getMonth()]}`;
  };
  FDS.n = (v, dp = 0) => (v == null || isNaN(v) ? '—' : Number(v).toLocaleString(undefined, { maximumFractionDigits: dp }));

  // ----- units -----
  FDS.unit = () => S.settings.unit;
  FDS.w = (kg, dp) => L.fmtW(kg, S.settings.unit, dp);                       // "32.5 kg"
  FDS.wVal = kg => (kg == null ? '' : Math.round(L.toDisplayWeight(kg, S.settings.unit) * 10) / 10); // number for inputs
  FDS.wIn = v => L.toKg(v, S.settings.unit);                                  // input -> kg
  FDS.wDelta = (kg, opts = {}) => {                                           // signed, coloured span
    if (kg == null || isNaN(kg)) return '<span class="muted">—</span>';
    const v = Math.round(L.toDisplayWeight(Math.abs(kg), S.settings.unit) * 10) / 10;
    const sign = kg < -0.049 ? '−' : kg > 0.049 ? '+' : '±';
    const cls = opts.neutral ? '' : kg < -0.049 ? 'delta-down' : kg > 0.049 ? 'delta-up' : '';
    return `<span class="${cls} num">${sign}${v} ${S.settings.unit}</span>`;
  };
  FDS.lenUnit = () => (S.settings.heightUnit === 'ftin' ? 'in' : 'cm');
  FDS.lenVal = cm => (cm == null || cm === '' ? '' : Math.round((FDS.lenUnit() === 'in' ? cm / 2.54 : cm) * 10) / 10);
  FDS.lenIn = v => (v === '' || v == null || isNaN(v) ? null : FDS.lenUnit() === 'in' ? Number(v) * 2.54 : Number(v));
  FDS.len = cm => (cm == null ? '—' : `${FDS.lenVal(cm)} ${FDS.lenUnit()}`);
  FDS.heightText = () => {
    const cm = S.profile.heightCm;
    if (S.settings.heightUnit === 'ftin') { const { ft, inch } = L.cmToFtIn(cm); return `${ft}′${inch}″`; }
    return `${Math.round(cm)} cm`;
  };

  // ================= state =================
  function defaults() {
    const t = FDS.today();
    return {
      version: 1,
      onboarded: false,
      profile: {
        sex: '', age: 20, heightCm: 188, startKg: 115, goalKg: 85,
        startDate: t, targetDate: L.addDays(t, 364),
        stepGoal: 10000, stepRamp: true, trainDays: 5,
        primaryGoal: 'Fat loss + muscle preservation/growth + improved body shape'
      },
      settings: {
        unit: 'kg', heightUnit: 'ftin', theme: 'system',
        cardioPref: 'normal', cardioType: 'incline',
        rest: { compound: 150, isolation: 75, core: 50 }, autoRest: true, sound: true, vibrate: true, notify: false,
        kcalTarget: null, proteinTarget: null, waterGoal: 8
      },
      weights: {},        // { 'YYYY-MM-DD': kg }
      steps: {},          // { date: number }
      cardio: {},         // { date: [{ id, type, min, intensity, note }] }
      recovery: {},       // { date: { sleepH, sleepQ, energy, soreness, readiness } } (1–5 scales; soreness 5 = very sore)
      measurements: [],   // [{ id, date, waist, chest, arms, thighs, hips }] in cm
      sessions: {},       // { date: Session } see FDS.newSession
      food: {},           // { date: [{ id, meal, name, kcal, p, c, f }] }
      foods: [],          // saved foods [{ id, name, kcal, p, c, f }]
      water: {},          // { date: glasses }
      deload: null        // { start: 'YYYY-MM-DD' } lasts 7 days
    };
  }
  const merge = (base, over) => {
    if (!over || typeof over !== 'object' || Array.isArray(over)) return over === undefined ? base : over;
    const out = Array.isArray(base) ? [] : { ...base };
    Object.keys(over).forEach(k => {
      out[k] = base && typeof base[k] === 'object' && base[k] !== null && !Array.isArray(base[k]) ? merge(base[k], over[k]) : over[k];
    });
    return out;
  };
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return merge(defaults(), JSON.parse(raw));
    } catch (e) { console.warn('Could not read saved data', e); }
    return DEMO ? null : defaults(); // demo data is built at the end, once session helpers exist
  }
  let S = load();
  Object.defineProperty(FDS, 'S', { get: () => S });
  FDS.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  let saveTimer = null;
  FDS.saveNow = () => {
    clearTimeout(saveTimer);
    S.updatedAt = new Date().toISOString();
    try { localStorage.setItem(KEY, JSON.stringify(S)); }
    catch (e) { FDS.toast('Couldn’t save — your browser storage is full. Export a backup in Settings.'); }
    if (typeof FDS.onSaved === 'function') FDS.onSaved(S); // hook for future cloud sync
  };
  FDS.save = () => { clearTimeout(saveTimer); saveTimer = setTimeout(FDS.saveNow, 250); };
  // Mutate state, save, re-render.
  FDS.commit = fn => { if (fn) fn(S); FDS.saveNow(); FDS.refresh(); };
  FDS.replaceState = next => { S = merge(defaults(), next); FDS.saveNow(); FDS.applyTheme(); FDS.refresh(); };
  FDS.resetState = () => { S = defaults(); FDS.saveNow(); FDS.applyTheme(); };
  window.addEventListener('pagehide', () => FDS.saveNow());
  document.addEventListener('visibilitychange', () => { if (document.hidden) FDS.saveNow(); });

  // ================= domain helpers =================
  FDS.planFor = k => D.PLAN[L.dow(k)];
  FDS.planByKey = key => D.PLAN.find(p => p.key === key);
  FDS.week = k => L.programWeek(S.profile.startDate, k || FDS.today());
  FDS.stepGoal = k => L.stepTarget(FDS.week(k), S.profile.stepGoal, S.profile.stepRamp);
  FDS.currentKg = () => { const s = L.weightSeries(S.weights); return s.length ? s[s.length - 1].kg : S.profile.startKg; };
  FDS.deloadActive = k => { const d = S.deload; k = k || FDS.today(); return !!(d && k >= d.start && k <= L.addDays(d.start, 6)); };
  FDS.restFor = exId => { const t = D.EXERCISES[exId].type; return S.settings.rest[t] || 90; };
  FDS.exName = slot => slot.name || D.EXERCISES[slot.id].name;
  FDS.cardioMin = k => (S.cardio[k] || []).reduce((a, c) => a + (Number(c.min) || 0), 0);
  FDS.recoveryFor = k => L.recoveryAdvice(S.recovery[k]);
  FDS.cardioRec = k => {
    k = k || FDS.today();
    const p = FDS.planFor(k);
    return L.cardioRecommendation({
      kind: p.kind, steps: S.steps[k] != null ? S.steps[k] : null, stepGoal: FDS.stepGoal(k), week: FDS.week(k),
      recovery: FDS.recoveryFor(k), pref: S.settings.cardioPref, cardioMin: FDS.cardioMin(k)
    });
  };
  FDS.nutritionTargets = () => {
    const est = L.calorieEstimate(S.profile, FDS.currentKg());
    const kcal = S.settings.kcalTarget || est.target;
    const protein = S.settings.proteinTarget || est.protein;
    return { kcal, protein, est, custom: !!S.settings.kcalTarget, warning: L.calorieWarning(kcal, est) };
  };

  // Session = { day, started, completed, warmupDone, cur (-1 = warm-up, 0..n-1 exercise, 'finish'), deload, ex: [{ sets: [{ w, r, rir, done }], notes, done }] }
  FDS.newSession = (date, dayKey) => {
    const plan = FDS.planByKey(dayKey);
    const deload = FDS.deloadActive(date);
    return {
      day: dayKey, started: new Date().toISOString(), completed: null, warmupDone: false, cur: -1, deload,
      ex: plan.ex.map(slot => ({ sets: [...Array(deload ? Math.max(2, slot.sets - 1) : slot.sets)].map(() => ({ w: null, r: null, rir: null, done: false })), notes: '', done: false }))
    };
  };
  FDS.sessionProgress = s => {
    if (!s) return { done: 0, total: 0, exDone: 0, exTotal: 0, pct: 0 };
    let done = 0, total = 0, exDone = 0;
    (s.ex || []).forEach(e => { total += e.sets.length; done += e.sets.filter(x => x.done).length; if (e.done) exDone++; });
    return { done, total, exDone, exTotal: (s.ex || []).length, pct: total ? done / total : 0 };
  };
  // Most recent logged sets for a plan slot before `date`. Prefers the same day+position, falls back to the same exercise anywhere.
  FDS.lastSlotSets = (dayKey, idx, beforeDate, opts = {}) => {
    const plan = FDS.planByKey(dayKey);
    const exId = plan.ex[idx].id;
    const dates = Object.keys(S.sessions).filter(d => d < beforeDate).sort().reverse();
    let fallback = null;
    for (const d of dates) {
      const s = S.sessions[d];
      if (s.deload && !opts.includeDeload) continue;
      const sp = FDS.planByKey(s.day);
      if (!sp) continue;
      if (s.day === dayKey) {
        const sets = L.doneSets(s.ex[idx]);
        if (sets.length) return { date: d, sets, sameSlot: true };
      }
      if (!fallback) {
        const j = sp.ex.findIndex(x => x.id === exId);
        if (j >= 0) { const sets = L.doneSets(s.ex[j]); if (sets.length) fallback = { date: d, sets, sameSlot: false }; }
      }
    }
    return fallback;
  };
  // Progression advice for a slot on a date: { kind, weightKg, text, stalled, last }
  FDS.recommend = (dayKey, idx, date) => {
    const plan = FDS.planByKey(dayKey);
    const slot = plan.ex[idx];
    const ex = D.EXERCISES[slot.id];
    const last = FDS.lastSlotSets(dayKey, idx, date);
    const rec = L.progression({ slot, ex, last: last && last.sets, unit: S.settings.unit, deload: FDS.deloadActive(date) });
    const hist = L.exerciseHistory(S.sessions, D.PLAN, slot.id).filter(h => h.date < date && h.day === dayKey && !h.deload).reverse().map(h => h.sets);
    return Object.assign(rec, { stalled: L.isStalled(hist), last });
  };

  // ================= UI helpers =================
  const ICONS = {
    today: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
    plan: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
    food: '<path d="M7 2v9M4 2v5a3 3 0 0 0 6 0V2M7 11v11M17 2c-2 1.5-3 4-3 7s1 4 3 4v9"/>',
    activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    body: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8.5 9a5 5 0 0 1 7 0L12 12.5z"/>',
    recovery: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    week: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    learn: '<path d="M2 5h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2zM22 5h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z"/>',
    settings: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
    back: '<path d="M15 18l-6-6 6-6"/>', next: '<path d="M9 6l6 6-6 6"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7"/>', x: '<path d="M6 6l12 12M18 6 6 18"/>',
    play: '<path d="M7 4.5v15l12.5-7.5z" fill="currentColor"/>', pause: '<path d="M8 5v14M16 5v14"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    dumbbell: '<path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12"/>',
    water: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
    flame: '<path d="M12 22c4 0 7-3 7-7 0-5-5-7-5-12-3 2-5 5-5 8-1-1-2-2-2-4-2 2-2 5-2 8 0 4 3 7 7 7z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
    camera: '<path d="M4 8h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13.5" r="3.5"/>',
    walk: '<circle cx="13" cy="4" r="2"/><path d="M10 21l2-6-3-3 2-5 3 3 3 1M9 12l-2 4"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>', upload: '<path d="M12 21V9M7 14l5-5 5 5M4 3h16"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 21h8M10 17h4"/>',
    alert: '<path d="M12 3 2 20h20zM12 10v4M12 17v.5"/>'
  };
  FDS.icon = (name, cls) => `<svg class="${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ''}</svg>`;

  FDS.bar = (pct, cls) => `<div class="bar ${cls || ''}" role="presentation"><i style="width:${Math.max(0, Math.min(100, pct * 100)).toFixed(1)}%"></i></div>`;
  FDS.ring = ({ pct, big, sub, size = 96, label }) => {
    const r = 40, c = 2 * Math.PI * r, p = Math.max(0, Math.min(1, pct || 0));
    return `<svg class="ring" viewBox="0 0 100 100" style="width:${size}px;height:${size}px" role="img" aria-label="${esc(label || Math.round(p * 100) + '%')}">
      <circle class="track" cx="50" cy="50" r="${r}"/>
      <circle class="val" cx="50" cy="50" r="${r}" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * (1 - p)).toFixed(2)}" transform="rotate(-90 50 50)"/>
      <text x="50" y="${sub ? 52 : 57}" text-anchor="middle">${esc(big != null ? big : Math.round(p * 100) + '%')}</text>
      ${sub ? `<text class="sub" x="50" y="67" text-anchor="middle">${esc(sub)}</text>` : ''}</svg>`;
  };
  // Segmented buttons: FDS.seg({ act: 'setThing', value: current, options: [{ value, label }], attrs: 'data-x="1"' })
  FDS.seg = ({ act, value, options, attrs = '', label }) => `<div class="seg" role="group" ${label ? `aria-label="${esc(label)}"` : ''}>${options.map(o =>
    `<button type="button" data-act="${act}" data-value="${esc(o.value)}" ${attrs} aria-pressed="${String(o.value) === String(value)}">${esc(o.label)}</button>`).join('')}</div>`;

  let toastTimer;
  FDS.toast = msg => {
    const el = document.getElementById('toast');
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  };

  // ----- bottom sheet -----
  FDS.sheet = {
    open({ title, html, onMount, onClose }) {
      const root = document.getElementById('sheet-root');
      if (!this.isOpen()) this.lastFocus = document.activeElement;
      this.onClose = onClose || null;
      root.innerHTML = `<div class="sheet-backdrop" data-act="sheet-close-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title || '')}">
        <div class="sheet-grab"></div>
        <div class="sheet-head"><h2>${esc(title || '')}</h2><button class="icon-btn" type="button" data-act="sheet-close" aria-label="Close">${FDS.icon('x')}</button></div>
        <div class="sheet-body">${html}</div></div></div>`;
      const sheet = root.querySelector('.sheet');
      if (onMount) onMount(sheet);
      FDS.drawCharts(sheet);
      FDS.timer.paint(true);
      const f = sheet.querySelector('input, select, textarea, button:not([data-act="sheet-close"])');
      if (f && window.matchMedia('(min-width: 720px)').matches) f.focus();
      document.body.style.overflow = 'hidden';
    },
    close() {
      const cb = this.onClose;
      this.onClose = null;
      document.getElementById('sheet-root').innerHTML = '';
      document.body.style.overflow = '';
      if (this.lastFocus && this.lastFocus.focus) try { this.lastFocus.focus(); } catch (e) { /* element gone */ }
      if (cb) cb();
    },
    isOpen: () => !!document.querySelector('#sheet-root .sheet')
  };
  FDS.act['sheet-close'] = () => FDS.sheet.close();
  FDS.act['sheet-close-bg'] = (el, e) => { if (e.target === el) FDS.sheet.close(); };
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && FDS.sheet.isOpen()) FDS.sheet.close(); });

  // ================= charts =================
  // Usage in a view: FDS.chart.line({...}) or FDS.chart.bars({...}) returns a placeholder; the core draws it after render at the real width.
  // line: { series: [{ points: [{ x: 'YYYY-MM-DD', y }], style: 'ln' | 'ln2' | 'dots' | 'pts' }], target, height, yFmt, empty }
  // bars: { points: [{ label, y, hit }], target, height, yFmt, empty }
  const chartSpecs = new Map();
  let chartSeq = 0;
  const chartPlaceholder = (type, spec) => { const id = 'c' + (++chartSeq); chartSpecs.set(id, { type, spec }); return `<div class="chart" data-chart="${id}" style="height:${spec.height || 180}px"></div>`; };
  FDS.chart = { line: spec => chartPlaceholder('line', spec), bars: spec => chartPlaceholder('bars', spec) };
  const niceTicks = (lo, hi, n = 4) => {
    if (lo === hi) { lo -= 1; hi += 1; }
    const raw = (hi - lo) / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) || raw;
    const start = Math.floor(lo / step) * step, ticks = [];
    for (let v = start; v <= hi + step * 0.001; v += step) ticks.push(Math.round(v * 1000) / 1000);
    if (ticks[ticks.length - 1] < hi) ticks.push(ticks[ticks.length - 1] + step);
    return ticks;
  };
  function drawLine(el, spec, W) {
    const H = spec.height || 180, pl = 40, pr = 12, pt = 10, pb = 26;
    const all = spec.series.flatMap(s => s.points.filter(p => p.y != null));
    if (!all.length) { el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}"><text class="empty" x="${W / 2}" y="${H / 2}" text-anchor="middle">${esc(spec.empty || 'No data yet')}</text></svg>`; return; }
    const xs = all.map(p => p.x).sort();
    const x0 = spec.x0 || xs[0], x1 = spec.x1 || xs[xs.length - 1];
    const span = Math.max(1, L.diffDays(x0, x1));
    const ys = all.map(p => p.y).concat(spec.target != null ? [spec.target] : []);
    const ticks = niceTicks(Math.min(...ys), Math.max(...ys));
    const y0 = ticks[0], y1 = ticks[ticks.length - 1];
    const X = d => pl + (L.diffDays(x0, d) / span) * (W - pl - pr);
    const Y = v => pt + (1 - (v - y0) / (y1 - y0 || 1)) * (H - pt - pb);
    const fmt = spec.yFmt || (v => FDS.n(v, 1));
    let g = ticks.map(t => `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${pl - 6}" y="${Y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`).join('');
    const xl = span < 2 ? [x0, x1] : [x0, L.addDays(x0, Math.round(span / 2)), x1];
    g += [...new Set(xl)].map((d, i, a) => `<text x="${X(d)}" y="${H - 6}" text-anchor="${i === 0 ? 'start' : i === a.length - 1 ? 'end' : 'middle'}">${FDS.dateLabel(d, 'short')}</text>`).join('');
    if (spec.target != null) g += `<line class="tgt" x1="${pl}" x2="${W - pr}" y1="${Y(spec.target)}" y2="${Y(spec.target)}"/>`;
    spec.series.forEach(s => {
      const pts = s.points.filter(p => p.y != null).sort((a, b) => (a.x < b.x ? -1 : 1));
      if (s.style === 'dots') g += pts.map(p => `<circle class="dot-faint" cx="${X(p.x)}" cy="${Y(p.y)}" r="2.6"/>`).join('');
      else {
        g += `<path class="${s.style === 'ln2' ? 'ln2' : 'ln'}" d="${pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)} ${Y(p.y).toFixed(1)}`).join('')}"/>`;
        if (s.style === 'pts' || pts.length === 1) g += pts.map(p => `<circle class="dot" cx="${X(p.x)}" cy="${Y(p.y)}" r="3.5"/>`).join('');
      }
    });
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(spec.label || 'Chart')}">${g}</svg>`;
  }
  function drawBars(el, spec, W) {
    const H = spec.height || 170, pl = 40, pr = 8, pt = 10, pb = 24;
    const pts = spec.points;
    if (!pts.length || pts.every(p => !p.y)) { if (spec.empty) { el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}"><text class="empty" x="${W / 2}" y="${H / 2}" text-anchor="middle">${esc(spec.empty)}</text></svg>`; return; } }
    const max = Math.max(1, ...pts.map(p => p.y || 0), spec.target || 0) * 1.08;
    const ticks = niceTicks(0, max, 3);
    const y1 = ticks[ticks.length - 1];
    const Y = v => pt + (1 - v / y1) * (H - pt - pb);
    const slot = (W - pl - pr) / pts.length, bw = Math.min(38, slot * 0.62);
    const fmt = spec.yFmt || (v => FDS.n(v));
    let g = ticks.map(t => `<line class="gl" x1="${pl}" x2="${W - pr}" y1="${Y(t)}" y2="${Y(t)}"/><text x="${pl - 6}" y="${Y(t) + 4}" text-anchor="end">${esc(fmt(t))}</text>`).join('');
    pts.forEach((p, i) => {
      const cx = pl + slot * i + slot / 2, v = p.y || 0, top = Y(v);
      g += `<rect class="bar-r ${p.hit ? 'hit' : ''}" x="${(cx - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, Y(0) - top).toFixed(1)}" rx="4"><title>${esc(p.label)}: ${esc(fmt(v))}</title></rect>`;
      g += `<text x="${cx}" y="${H - 6}" text-anchor="middle">${esc(p.label)}</text>`;
    });
    if (spec.target != null) g += `<line class="tgt" x1="${pl}" x2="${W - pr}" y1="${Y(spec.target)}" y2="${Y(spec.target)}"/>`;
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="${esc(spec.label || 'Bar chart')}">${g}</svg>`;
  }
  FDS.drawCharts = root => {
    (root || document).querySelectorAll('[data-chart]').forEach(el => {
      const c = chartSpecs.get(el.dataset.chart);
      if (!c) return;
      const W = Math.max(240, Math.floor(el.clientWidth || 320));
      (c.type === 'line' ? drawLine : drawBars)(el, c.spec, W);
    });
  };
  let resizeT;
  window.addEventListener('resize', () => { clearTimeout(resizeT); resizeT = setTimeout(() => FDS.drawCharts(), 150); });

  // ================= LED rest timer =================
  const SEGS = { a: '<rect x="2.6" y="0" width="6.8" height="2" rx="1"/>', b: '<rect x="10" y="2.4" width="2" height="7" rx="1"/>', c: '<rect x="10" y="10.6" width="2" height="7" rx="1"/>', d: '<rect x="2.6" y="18" width="6.8" height="2" rx="1"/>', e: '<rect x="0" y="10.6" width="2" height="7" rx="1"/>', f: '<rect x="0" y="2.4" width="2" height="7" rx="1"/>', g: '<rect x="2.6" y="9" width="6.8" height="2" rx="1"/>' };
  const DIGITS = { 0: 'abcdef', 1: 'bc', 2: 'abged', 3: 'abgcd', 4: 'fgbc', 5: 'afgcd', 6: 'afgedc', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g', G: 'afedc', O: 'abcdef' };
  FDS.seg7 = (text, cls) => `<span class="seg7 ${cls || ''}" aria-hidden="true">${[...String(text)].map(ch => {
    if (ch === ':') return '<svg viewBox="0 0 3 20"><rect class="on" x=".5" y="5" width="2" height="2" rx="1"/><rect class="on" x=".5" y="13" width="2" height="2" rx="1"/></svg>';
    const on = DIGITS[ch] || '';
    return `<svg viewBox="-1 0 14 20" style="transform:skewX(-6deg)">${Object.keys(SEGS).map(s => SEGS[s].replace('<rect', `<rect class="${on.includes(s) ? 'on' : 'off'}"`)).join('')}</svg>`;
  }).join('')}</span>`;
  const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const T = (() => { try { return Object.assign({ dur: 90, left: 90, end: null, running: false, finishedAt: null, label: '' }, JSON.parse(localStorage.getItem('fds:timer') || '{}')); } catch (e) { return { dur: 90, left: 90, end: null, running: false, finishedAt: null, label: '' }; } })();
  let audioCtx = null;
  const persistT = () => { try { localStorage.setItem('fds:timer', JSON.stringify(T)); } catch (e) { /* ignore */ } };
  function beep() {
    if (!S.settings.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.28, 0.56].forEach(t0 => {
        const o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.frequency.value = 880; o.type = 'square'; g.gain.value = 0.08;
        o.connect(g); g.connect(audioCtx.destination);
        o.start(audioCtx.currentTime + t0); o.stop(audioCtx.currentTime + t0 + 0.16);
      });
    } catch (e) { /* audio not available */ }
  }
  let lastPaint = '';
  FDS.timer = {
    get state() { return T; },
    remaining() { return T.running ? Math.max(0, Math.ceil((T.end - Date.now()) / 1000)) : T.left; },
    start(sec, label) {
      if (sec != null) { T.dur = sec; T.left = sec; }
      if (label != null) T.label = label;
      if (T.left <= 0) T.left = T.dur;
      T.end = Date.now() + T.left * 1000; T.running = true; T.finishedAt = null;
      try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); } catch (e) { /* no audio */ }
      persistT(); this.paint(true);
    },
    pause() { if (!T.running) return; T.left = this.remaining(); T.running = false; persistT(); this.paint(true); },
    toggle() { T.running ? this.pause() : this.start(); },
    reset() { T.running = false; T.left = T.dur; T.finishedAt = null; persistT(); this.paint(true); },
    set(sec) { T.dur = sec; T.left = sec; T.finishedAt = null; if (T.running) T.end = Date.now() + sec * 1000; persistT(); this.paint(true); },
    add(sec) {
      if (T.running) T.end = Math.max(Date.now(), T.end + sec * 1000);
      else T.left = Math.max(0, T.left + sec);
      T.finishedAt = null; persistT(); this.paint(true);
    },
    dismiss() { T.running = false; T.left = T.dur; T.finishedAt = null; T.label = ''; persistT(); this.paint(true); },
    finish() {
      T.running = false; T.left = 0; T.finishedAt = Date.now(); persistT();
      beep();
      if (S.settings.vibrate && navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 250]);
      if (S.settings.notify && 'Notification' in window && Notification.permission === 'granted' && document.hidden) {
        try { new Notification('Rest is over', { body: T.label ? `Next set: ${T.label}` : 'Time for your next set.', tag: 'fds-rest' }); } catch (e) { /* ignore */ }
      }
      this.paint(true);
    },
    active() { return T.running || T.left !== T.dur || (T.finishedAt && Date.now() - T.finishedAt < 60000); },
    paint(force) {
      const rem = this.remaining();
      const flashing = !T.running && T.finishedAt && Date.now() - T.finishedAt < 60000;
      const key = `${rem}|${T.running}|${flashing}|${T.dur}`;
      if (!force && key === lastPaint) return;
      lastPaint = key;
      const idle = !T.running && !flashing && rem === T.dur;
      const html = FDS.seg7(flashing ? 'GO' : mmss(rem), flashing ? 'flash' : idle ? 'idle' : '');
      document.querySelectorAll('[data-timer]').forEach(el => { el.innerHTML = html; });
      document.querySelectorAll('[data-timer-toggle]').forEach(el => { el.innerHTML = T.running ? `${FDS.icon('pause')} Pause` : `${FDS.icon('play')} ${rem < T.dur && rem > 0 ? 'Resume' : 'Start'}`; });
      document.querySelectorAll('[data-timer-label]').forEach(el => { el.textContent = flashing ? 'Rest over — next set' : T.running ? 'Resting' : rem < T.dur && rem > 0 ? 'Paused' : 'Rest timer'; });
      const pill = document.getElementById('timer-pill');
      if (pill) {
        const show = T.running || flashing || (rem !== T.dur && rem > 0);
        pill.hidden = !show;
        if (show) pill.innerHTML = `${html}<span class="lbl">${flashing ? 'Go' : T.running ? 'Rest' : 'Paused'}</span>`;
      }
    },
    openSheet() {
      const presets = [45, 60, 75, 90, 120, 150, 180];
      FDS.sheet.open({
        title: 'Rest timer',
        html: `<div class="stack">
          <div class="clock-face" data-timer></div>
          <p class="center small muted" data-timer-label></p>
          <div class="grid" style="grid-template-columns:1fr 2fr 1fr">
            <button class="btn btn-lg" type="button" data-act="timer-add" data-sec="-15" aria-label="Minus 15 seconds">−15s</button>
            <button class="btn btn-lg btn-primary" type="button" data-act="timer-toggle" data-timer-toggle></button>
            <button class="btn btn-lg" type="button" data-act="timer-add" data-sec="15" aria-label="Plus 15 seconds">+15s</button>
          </div>
          <div><p class="label" style="margin-bottom:6px">Set rest length</p>
            <div class="row-wrap">${presets.map(p => `<button class="btn btn-sm ${p === T.dur ? 'btn-primary' : ''}" type="button" data-act="timer-preset" data-sec="${p}">${mmss(p)}</button>`).join('')}</div></div>
          <button class="btn btn-block" type="button" data-act="timer-reset">${FDS.icon('reset')} Reset</button>
          <div class="note small">Big compound lifts: rest <strong>2–3 min</strong>. Isolation: <strong>60–90 sec</strong>. Core: <strong>45–60 sec</strong>. Change the defaults in Settings.</div>
        </div>`
      });
    }
  };
  FDS.act['timer-open'] = () => FDS.timer.openSheet();
  FDS.act['timer-toggle'] = () => FDS.timer.toggle();
  FDS.act['timer-reset'] = () => FDS.timer.reset();
  FDS.act['timer-add'] = el => FDS.timer.add(Number(el.dataset.sec));
  FDS.act['timer-preset'] = el => { FDS.timer.set(Number(el.dataset.sec)); FDS.timer.start(); if (FDS.sheet.isOpen()) FDS.timer.openSheet(); };
  setInterval(() => {
    if (T.running && Date.now() >= T.end) FDS.timer.finish();
    FDS.timer.paint();
  }, 250);

  // ================= router =================
  const NAV = [
    { name: 'today', label: 'Today', icon: 'today', href: '#/', tab: true },
    { name: 'plan', label: 'Plan', icon: 'plan', href: '#/plan', tab: true },
    { name: 'food', label: 'Food', icon: 'food', href: '#/food', tab: true },
    { name: 'activity', label: 'Activity', icon: 'activity', href: '#/activity', tab: true },
    { name: 'body', label: 'Body', icon: 'body', href: '#/body', tab: true },
    { name: 'recovery', label: 'Recovery', icon: 'recovery', href: '#/recovery' },
    { name: 'week', label: 'Weekly summary', icon: 'week', href: '#/week' },
    { name: 'learn', label: 'How to train', icon: 'learn', href: '#/learn' },
    { name: 'settings', label: 'Settings', icon: 'settings', href: '#/settings' }
  ];
  FDS.NAV = NAV;
  // def: { title: string | ctx => string, nav: NAV name to highlight, render: ctx => html, mount?: (ctx, viewEl) => void, focus?: bool (hides tab bar), back?: href }
  FDS.route = (name, def) => { FDS.routes[name] = def; };
  FDS.parseHash = () => {
    const h = location.hash.replace(/^#\/?/, '');
    const [path, qs] = h.split('?');
    const parts = path.split('/').filter(Boolean).map(decodeURIComponent);
    return { name: parts[0] || 'today', args: parts.slice(1), query: new URLSearchParams(qs || '') };
  };
  FDS.go = href => { if (location.hash === href) FDS.refresh(); else location.hash = href; };

  let current = null;
  function renderShell(route, name) {
    const navName = route.nav || name;
    document.getElementById('side').innerHTML = `<a class="brand" href="#/">Five Day Split</a>` +
      NAV.map((n, i) => `${i === 5 ? '<div class="side-sep"></div>' : ''}<a class="nav" href="${n.href}" ${n.name === navName ? 'aria-current="page"' : ''}>${FDS.icon(n.icon)}${n.label}</a>`).join('');
    document.getElementById('tabbar').innerHTML = NAV.filter(n => n.tab).map(n =>
      `<a href="${n.href}" ${n.name === navName ? 'aria-current="page"' : ''}>${FDS.icon(n.icon)}<span>${n.label}</span></a>`).join('');
    const title = typeof route.title === 'function' ? route.title(current) : route.title;
    document.getElementById('top').innerHTML = `
      ${route.back ? `<a class="icon-btn" href="${route.back}" aria-label="Back">${FDS.icon('back')}</a>` : `<button class="icon-btn menu-btn" type="button" data-act="menu" aria-label="More pages">${FDS.icon('menu')}</button>`}
      ${name === 'today' && !route.back ? '<a class="brand" href="#/">Five Day Split</a>' : `<div class="title">${esc(title || '')}</div>`}
      <div class="spacer"></div>
      <button class="top-timer" type="button" data-act="timer-open" aria-label="Rest timer"><span data-timer></span></button>`;
    document.body.classList.toggle('focus', !!route.focus);
    document.title = title && name !== 'today' ? `${title} · Five Day Split` : 'Five Day Split';
  }
  FDS.refresh = (opts = {}) => {
    const { name, args, query } = FDS.parseHash();
    const route = FDS.routes[name] || FDS.routes.today;
    current = { name, args, query, S, today: FDS.today() };
    const view = document.getElementById('view');
    const y = window.scrollY;
    try {
      renderShell(route, name);
      chartSpecs.clear();
      view.innerHTML = route ? route.render(current) : '<p>Loading…</p>';
      if (route && route.mount) route.mount(current, view);
      FDS.drawCharts(view);
    } catch (err) {
      console.error(err);
      view.innerHTML = `<div class="note bad"><strong>Something went wrong showing this page.</strong><br>${esc(err && err.message)}<br><a href="#/">Go to Today</a></div>`;
    }
    FDS.timer.paint(true);
    if (opts.scrollTop) window.scrollTo(0, 0); else window.scrollTo(0, y);
  };
  FDS.ctx = () => current;
  window.addEventListener('hashchange', () => { FDS.sheet.close(); FDS.refresh({ scrollTop: true }); });

  FDS.act.menu = () => FDS.sheet.open({
    title: 'More',
    html: `<div class="list">${NAV.filter(n => !n.tab).map(n => `<a class="list-row" href="${n.href}" data-act="sheet-close">${FDS.icon(n.icon, 'grow-0')}<span class="grow h3">${n.label}</span>${FDS.icon('next')}</a>`).join('')}</div>`
  });

  // ================= shared view helpers =================
  // Call a quick-log sheet if its module is loaded, otherwise navigate.
  FDS.open = (fn, href, ...args) => (typeof FDS[fn] === 'function' ? FDS[fn](...args) : FDS.go(href));
  FDS.repRange = slot => (slot.min === slot.max ? `${slot.min}` : `${slot.min}–${slot.max}`);
  FDS.setsLabel = (slot, sets) => `${sets || slot.sets} × ${FDS.repRange(slot)}${slot.each ? ' each side' : ''}`;
  FDS.mmss = mmss;
  FDS.wDeltaText = kg => (kg == null || isNaN(kg) ? '—'
    : `${kg < -0.049 ? '−' : kg > 0.049 ? '+' : '±'}${Math.round(L.toDisplayWeight(Math.abs(kg), S.settings.unit) * 10) / 10} ${S.settings.unit}`);
  FDS.deltaCls = kg => (kg == null || isNaN(kg) ? '' : kg < -0.049 ? 'delta-down' : kg > 0.049 ? 'delta-up' : '');
  FDS.validDate = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
  // Date from ?date=, never in the future.
  FDS.queryDate = ctx => { const t = FDS.today(); const d = FDS.validDate((ctx || current).query.get('date')); return d && d <= t ? d : t; };
  FDS.dateBar = (date, hrefFor) => {
    const t = FDS.today(), y = L.addDays(t, -1);
    const name = date === t ? 'Today' : date === y ? 'Yesterday' : FDS.dateLabel(date);
    return `<div class="datebar">
      <a class="icon-btn" href="${hrefFor(L.addDays(date, -1))}" aria-label="Previous day">${FDS.icon('back')}</a>
      <div class="grow center"><b>${name}</b><span class="tiny muted">${FDS.dateLabel(date, 'year')}${date !== t ? ` · <a href="${hrefFor(t)}">Go to today</a>` : ''}</span></div>
      ${date < t ? `<a class="icon-btn" href="${hrefFor(L.addDays(date, 1))}" aria-label="Next day">${FDS.icon('next')}</a>` : '<span class="icon-btn" aria-hidden="true"></span>'}
    </div>`;
  };
  let undoTimer;
  FDS.undo = (msg, fn) => {
    let el = document.getElementById('undo');
    if (!el) { el = document.createElement('div'); el.id = 'undo'; el.className = 'undo'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
    el.innerHTML = `<span>${esc(msg)}</span><button type="button" class="btn btn-sm">Undo</button>`;
    el.classList.add('show');
    el.querySelector('button').onclick = () => { el.classList.remove('show'); fn(); };
    clearTimeout(undoTimer);
    undoTimer = setTimeout(() => el.classList.remove('show'), 5000);
  };

  // ================= event delegation =================
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const fn = FDS.act[el.dataset.act];
    if (!fn) { console.warn('No action', el.dataset.act); return; }
    if (el.tagName === 'A' && el.dataset.act !== 'sheet-close') e.preventDefault();
    fn(el, e);
  });
  document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && FDS.onInput[el.dataset.input]) FDS.onInput[el.dataset.input](el, e); });
  document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && FDS.onChange[el.dataset.change]) FDS.onChange[el.dataset.change](el, e); });
  document.addEventListener('submit', e => {
    const f = e.target.closest('form[data-submit]');
    if (!f) return;
    e.preventDefault();
    const fn = FDS.onSubmit[f.dataset.submit];
    if (fn) fn(f, Object.fromEntries(new FormData(f).entries()), e);
  });

  // ================= theme, notifications, boot =================
  FDS.applyTheme = () => {
    const t = S.settings.theme;
    if (t === 'dark' || t === 'light') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
    const dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', dark ? '#12110f' : '#f3f1ea');
  };
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', FDS.applyTheme);

  function start() {
    FDS.applyTheme();
    FDS.refresh();
    if (!S.onboarded && !DEMO && typeof FDS.onboarding === 'function') FDS.onboarding();
    const local = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);
    if ('serviceWorker' in navigator && !local) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  if (!S) { S = defaults(); S = demoState(); }
  window.addEventListener('DOMContentLoaded', start);

  // ================= demo data (?demo) — separate storage key, never touches real data =================
  function demoState() {
    const s = defaults();
    const t = FDS.today();
    const start = L.addDays(L.weekStart(t), -21);
    s.onboarded = true; s.profile.sex = 'male'; s.profile.startDate = start; s.profile.targetDate = L.addDays(start, 364);
    let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const days = L.diffDays(start, t);
    for (let i = 0; i <= days; i++) {
      const d = L.addDays(start, i);
      if (i < days || rnd() > 0.2) s.weights[d] = Math.round((115 - i * 0.11 + (rnd() - 0.5) * 1.1) * 10) / 10;
      if (i < days) s.steps[d] = Math.round(5000 + rnd() * 7000);
      if (i < days && rnd() > 0.35) s.cardio[d] = [{ id: FDS.uid(), type: 'incline', min: [20, 25, 30][Math.floor(rnd() * 3)], intensity: 'moderate', note: '' }];
      s.recovery[d] = { sleepH: Math.round((6 + rnd() * 2.5) * 2) / 2, sleepQ: 2 + Math.floor(rnd() * 4), energy: 2 + Math.floor(rnd() * 4), soreness: 1 + Math.floor(rnd() * 4), readiness: 2 + Math.floor(rnd() * 4) };
      if (i < days) {
        s.food[d] = [
          { id: FDS.uid(), meal: 'breakfast', name: 'Oats with milk and banana', kcal: 520, p: 22, c: 85, f: 11 },
          { id: FDS.uid(), meal: 'lunch', name: 'Chicken rice bowl', kcal: 780, p: 55, c: 90, f: 18 },
          { id: FDS.uid(), meal: 'dinner', name: 'Dal, roti and paneer', kcal: 850 + Math.round(rnd() * 300), p: 40, c: 95, f: 32 },
          { id: FDS.uid(), meal: 'snacks', name: 'Greek yogurt', kcal: 180, p: 17, c: 12, f: 6 }
        ];
        s.water[d] = 5 + Math.floor(rnd() * 4);
      }
      const dw = L.dow(d);
      if (dw <= 4 && i < days && rnd() > 0.1) {
        const plan = D.PLAN[dw];
        const wk = Math.floor(i / 7);
        const sess = FDS.newSession(d, plan.key);
        sess.warmupDone = true; sess.cur = 'finish'; sess.completed = L.parse(d).toISOString(); sess.deload = false;
        sess.ex.forEach((e, j) => {
          const slot = plan.ex[j], ex = D.EXERCISES[slot.id];
          const baseW = ex.bodyweight ? null : ({ compound: 35, isolation: 15, core: 20 }[ex.type] + (slot.id === 'leg-press' ? 60 : 0)) + wk * (ex.inc || 0);
          e.sets.forEach((st, k) => { st.w = baseW; st.r = Math.max(slot.min, Math.min(slot.max, slot.max - k - 1 + wk)); st.rir = 2; st.done = true; });
          e.done = true;
        });
        s.sessions[d] = sess;
      }
    }
    s.measurements = [
      { id: FDS.uid(), date: start, waist: 118, chest: 122, arms: 40, thighs: 70, hips: 124 },
      { id: FDS.uid(), date: L.addDays(start, 21), waist: 115.5, chest: 121, arms: 40, thighs: 69, hips: 122.5 }
    ];
    s.foods = [
      { id: FDS.uid(), name: 'Greek yogurt (200 g)', kcal: 180, p: 17, c: 12, f: 6 },
      { id: FDS.uid(), name: 'Chicken breast (150 g, cooked)', kcal: 250, p: 46, c: 0, f: 5 },
      { id: FDS.uid(), name: 'Whey protein (1 scoop)', kcal: 120, p: 24, c: 3, f: 1.5 }
    ];
    return s;
  }
})();
