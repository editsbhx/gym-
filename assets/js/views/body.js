/* Body: weight log (change since any date, trend), goal, measurements, progress photos (IndexedDB). */
(function () {
  const { L, esc } = FDS;
  let since = '30', range = '12w', showAll = false, site = 'waist', pose = 'front';
  let photos = [];
  const SITES = [['waist', 'Waist'], ['chest', 'Chest'], ['arms', 'Arms'], ['thighs', 'Thighs'], ['hips', 'Hips']];
  const POSES = [['front', 'Front'], ['side', 'Side'], ['back', 'Back']];

  // ---------- weight sheet / form ----------
  function weightForm(date) {
    const S = FDS.S, t = FDS.today(), unit = FDS.unit();
    const series = L.weightSeries(S.weights);
    const existing = S.weights[date];
    const prev = [...series].reverse().find(e => e.date < date) || null;
    const val = existing != null ? FDS.wVal(existing) : prev ? FDS.wVal(prev.kg) : FDS.wVal(S.profile.startKg);
    const [mn, mx] = unit === 'lb' ? [44, 880] : [20, 400];
    return `<form class="stack" data-submit="c-weight" data-prev="${prev ? prev.kg : ''}">
      <div class="stepper c-wstep">
        <button type="button" data-act="c-wstep" data-dir="-1" aria-label="Minus 0.1">−</button>
        <input name="w" type="number" inputmode="decimal" step="0.1" min="${mn}" max="${mx}" required value="${val}" data-input="c-wval" aria-label="Weight in ${unit}">
        <button type="button" data-act="c-wstep" data-dir="1" aria-label="Plus 0.1">+</button>
      </div>
      <p class="center small muted">${unit}${existing != null ? ' · updating the entry for this date' : ''}</p>
      <label class="field"><span>Date</span><input class="input" type="date" name="date" max="${t}" value="${date}" required></label>
      ${prev ? `<p class="small">Previous: <b>${FDS.w(prev.kg)}</b> on ${FDS.dateLabel(prev.date, 'short')} · <span data-c-wdiff></span></p>` : ''}
      <p class="tiny muted">Tip: weigh in the morning, after the bathroom and before eating, in similar clothing.</p>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Save weight</button>
    </form>`;
  }
  const updateDiff = form => {
    const out = form.querySelector('[data-c-wdiff]');
    if (!out || !form.dataset.prev) return;
    const kg = FDS.wIn(form.querySelector('input[name="w"]').value);
    const d = kg == null ? null : kg - Number(form.dataset.prev);
    out.className = FDS.deltaCls(d);
    out.textContent = d == null ? '' : `change ${FDS.wDeltaText(d)}`;
  };
  FDS.openWeightSheet = date => {
    const t = FDS.today();
    date = FDS.validDate(date) && date <= t ? date : t;
    FDS.sheet.open({ title: FDS.S.weights[date] != null ? 'Edit weigh-in' : 'Log weight', html: weightForm(date), onMount: sh => updateDiff(sh.querySelector('form')) });
  };
  FDS.onInput['c-wval'] = el => updateDiff(el.form);
  FDS.act['c-wstep'] = el => {
    const input = el.parentElement.querySelector('input');
    input.value = Math.max(0, Math.round(((Number(input.value) || 0) + 0.1 * Number(el.dataset.dir)) * 10) / 10);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  FDS.onSubmit['c-weight'] = (form, v) => {
    const kg = FDS.wIn(v.w), t = FDS.today();
    if (kg == null || kg < 20 || kg > 400) return FDS.toast('Enter a realistic weight.');
    if (!FDS.validDate(v.date) || v.date > t) return FDS.toast('Pick a date that isn’t in the future.');
    if (form.closest('.sheet')) FDS.sheet.close();
    FDS.commit(s => { s.weights[v.date] = Math.round(kg * 100) / 100; });
    FDS.toast('Weight saved');
  };
  FDS.act['c-wedit'] = el => FDS.openWeightSheet(el.dataset.date);
  FDS.act['c-wdel'] = el => {
    const d = el.dataset.date, kg = FDS.S.weights[d];
    FDS.commit(s => { delete s.weights[d]; });
    FDS.undo(`Deleted weigh-in for ${FDS.dateLabel(d, 'short')}`, () => FDS.commit(s => { s.weights[d] = kg; }));
  };
  FDS.act['c-since'] = el => { since = el.dataset.value; FDS.refresh(); };
  FDS.onChange['c-since-date'] = el => { if (FDS.validDate(el.value)) { since = el.value; FDS.refresh(); } };
  FDS.act['c-range'] = el => { range = el.dataset.value; FDS.refresh(); };
  FDS.act['c-showall'] = () => { showAll = !showAll; FDS.refresh(); };

  function goalCard() {
    const S = FDS.S, P = S.profile, cur = FDS.currentKg(), t = FDS.today();
    const pct = Math.max(0, Math.min(1, (P.startKg - cur) / (P.startKg - P.goalKg || 1)));
    const ws = L.weightStats(S.weights, t);
    return `<section class="card" data-day="legs">
      <div class="card-head"><span class="eyebrow">Goal and profile</span><a class="link" href="#/settings">Edit in Settings</a></div>
      <div class="row between"><span class="h3">${Math.round(pct * 100)}% of the way to ${FDS.w(P.goalKg)}</span></div>
      <div style="margin:8px 0 12px">${FDS.bar(pct)}</div>
      <div class="stats s3">
        <div class="stat"><b>${FDS.w(P.startKg)}</b><span>Starting weight</span></div>
        <div class="stat"><b>${FDS.w(cur)}</b><span>Current weight</span></div>
        <div class="stat"><b>${FDS.w(P.goalKg)}</b><span>Target weight</span></div>
        <div class="stat"><b>${FDS.w(Math.max(0, cur - P.goalKg))}</b><span>Weight remaining</span></div>
        <div class="stat"><b class="${FDS.deltaCls(cur - P.startKg)}">${FDS.wDeltaText(cur - P.startKg)}</b><span>Total change</span></div>
        <div class="stat"><b class="${FDS.deltaCls(ws.weeklyAvgChange)}">${ws.weeklyAvgChange == null ? 'Needs 2+ wks' : FDS.wDeltaText(ws.weeklyAvgChange)}</b><span>Weekly avg change</span></div>
      </div>
      <div class="kv" style="margin-top:10px">
        <div><span>Starting date</span><b>${FDS.dateLabel(P.startDate, 'year')}</b></div>
        <div><span>Your target date</span><b>${FDS.dateLabel(P.targetDate, 'year')}</b></div>
        <div><span>Height · age</span><b>${FDS.heightText()} · ${P.age}</b></div>
        <div><span>Daily steps · training</span><b>${FDS.n(P.stepGoal)} · ${P.trainDays} days/week</b></div>
        <div><span>Primary goal</span><b>${esc(P.primaryGoal)}</b></div>
      </div>
      <p class="tiny muted" style="margin-top:8px">The target date is a guide, not a promise. How fast weight changes differs between people and weeks.</p>
    </section>`;
  }

  function sinceCard(series) {
    const S = FDS.S, t = FDS.today();
    const presets = [{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }, { value: 'start', label: 'Start' }];
    const controls = `${FDS.seg({ act: 'c-since', value: since, options: presets, label: 'Compare from' })}
      <label class="field" style="margin-top:8px"><span>Or pick a date</span><input class="input" type="date" max="${t}" data-change="c-since-date" value="${FDS.validDate(since) || ''}"></label>`;
    if (series.length < 2) return `<section class="card"><div class="card-head"><span class="eyebrow">Change since…</span></div>${controls}<p class="small muted" style="margin-top:10px">Log at least two weigh-ins to see how your weight has changed.</p></section>`;
    const latest = series[series.length - 1];
    const from = since === 'start' ? S.profile.startDate : /^\d+$/.test(since) ? L.addDays(t, -Number(since)) : since;
    const fromE = L.weightOnOrNear(S.weights, from);
    let body;
    if (!fromE || fromE.date >= latest.date) body = '<p class="small muted">No earlier weigh-in to compare with. Try a later date.</p>';
    else {
      const diff = latest.kg - fromE.kg, days = L.diffDays(fromE.date, latest.date);
      const avgFrom = L.avgWindow(series, L.addDays(fromE.date, 6), 7), avgNow = L.avgWindow(series, latest.date, 7);
      body = `<div class="row" style="align-items:baseline;gap:12px;flex-wrap:wrap;margin:12px 0 6px">
          <span class="big-num ${FDS.deltaCls(diff)}">${FDS.wDeltaText(diff)}</span>
          <span class="small muted">in ${days} day${days === 1 ? '' : 's'}${days >= 7 ? ` · ${FDS.wDeltaText(diff / (days / 7))}/week` : ''}</span></div>
        <div class="kv">
          <div><span>From ${fromE.date !== from ? '(closest weigh-in)' : ''}</span><b>${FDS.w(fromE.kg)} · ${FDS.dateLabel(fromE.date, 'short')}</b></div>
          <div><span>Latest</span><b>${FDS.w(latest.kg)} · ${FDS.dateLabel(latest.date, 'short')}</b></div>
          ${days >= 14 && avgFrom != null && avgNow != null ? `<div><span>7-day averages</span><b>${FDS.w(avgFrom)} → ${FDS.w(avgNow)}</b></div>` : ''}
          ${since === 'start' ? `<div><span>vs starting weight (${FDS.w(S.profile.startKg)})</span><b class="${FDS.deltaCls(latest.kg - S.profile.startKg)}">${FDS.wDeltaText(latest.kg - S.profile.startKg)}</b></div>` : ''}
        </div>`;
    }
    return `<section class="card"><div class="card-head"><span class="eyebrow">Change since…</span></div>${controls}${body}</section>`;
  }

  function weightTab() {
    const S = FDS.S, t = FDS.today();
    const series = L.weightSeries(S.weights);
    const ws = L.weightStats(S.weights, t);
    const x0 = { '4w': L.addDays(t, -27), '12w': L.addDays(t, -83), '6m': L.addDays(t, -182), all: series.length ? series[0].date : t }[range];
    const inRange = series.filter(e => e.date >= x0);
    const avg = L.rollingAverage(series, 7).filter(e => e.date >= x0);
    const fast = ws.weeklyAvgChange != null && ws.latest && -ws.weeklyAvgChange > ws.latest.kg * 0.01;
    const hist = series.slice().reverse();
    const shown = showAll ? hist : hist.slice(0, 30);
    return `<div class="stack-lg">
      <div class="grid md2">
        <section class="card"><div class="card-head"><span class="eyebrow">Log weigh-in</span></div>${weightForm(t)}</section>
        <div class="stack">
          <div class="stats s4 c-wstats">
            <div class="stat"><b>${ws.todayKg != null ? FDS.w(ws.todayKg) : '—'}</b><span>Today</span></div>
            <div class="stat"><b>${ws.avg7 != null ? FDS.w(ws.avg7) : '—'}</b><span>7-day average</span></div>
            <div class="stat"><b class="${FDS.deltaCls(ws.weeklyChange)}">${FDS.wDeltaText(ws.weeklyChange)}</b><span>Weekly change</span></div>
            <div class="stat"><b class="${FDS.deltaCls(ws.latest ? ws.latest.kg - S.profile.startKg : null)}">${ws.latest ? FDS.wDeltaText(ws.latest.kg - S.profile.startKg) : '—'}</b><span>Since start</span></div>
          </div>
          ${fast ? '<div class="note warn small"><strong>You’re losing weight quickly.</strong> Over the last few weeks your average is dropping by more than 1% of your body weight per week. Make sure you’re eating enough protein and energy to train well. Faster isn’t better if it costs muscle, energy or consistency.</div>' : ''}
          ${sinceCard(series)}
        </div>
      </div>
      <section class="card" data-day="legs">
        <div class="card-head"><span class="eyebrow">Weight trend</span></div>
        ${FDS.seg({ act: 'c-range', value: range, options: [{ value: '4w', label: '4 wks' }, { value: '12w', label: '12 wks' }, { value: '6m', label: '6 mo' }, { value: 'all', label: 'All' }], label: 'Chart range' })}
        <div style="margin-top:12px">${FDS.chart.line({ height: 220, x0, x1: t, target: range === 'all' ? FDS.wVal(S.profile.goalKg) : null, label: 'Body weight trend', empty: 'No weigh-ins in this range',
          series: [{ points: inRange.map(e => ({ x: e.date, y: FDS.wVal(e.kg) })), style: 'dots' }, { points: avg.map(e => ({ x: e.date, y: FDS.wVal(e.kg) })), style: 'ln' }] })}</div>
        <div class="legend"><span><i class="faint"></i>Daily weigh-in</span><span><i></i>7-day average</span>${range === 'all' ? '<span><i class="tgt"></i>Goal</span>' : ''}</div>
        <p class="small muted" style="margin-top:10px">Daily weight can move 0.5–2 kg from water, food volume, sodium, carbs, digestion, sleep and stress. Judge progress by the 7-day average over several weeks, not by one morning.</p>
      </section>
      ${goalCard()}
      <section class="card">
        <div class="card-head"><span class="eyebrow">History</span><span class="small muted">${series.length} weigh-ins</span></div>
        ${hist.length ? `<div class="list">${shown.map((e, i) => {
          const prev = hist[hist.indexOf(e) + 1];
          const d = prev ? e.kg - prev.kg : null;
          return `<div class="list-row"><span class="grow"><b>${FDS.w(e.kg)}</b><br><span class="small muted">${FDS.dateLabel(e.date, 'year')}</span></span>
            <span class="small ${FDS.deltaCls(d)}">${d == null ? '' : FDS.wDeltaText(d)}</span>
            <button type="button" class="icon-btn" data-act="c-wedit" data-date="${e.date}" aria-label="Edit weigh-in ${FDS.dateLabel(e.date, 'short')}">${FDS.icon('edit')}</button>
            <button type="button" class="icon-btn" data-act="c-wdel" data-date="${e.date}" aria-label="Delete weigh-in ${FDS.dateLabel(e.date, 'short')}">${FDS.icon('trash')}</button></div>`;
        }).join('')}</div>${hist.length > 30 ? `<button type="button" class="btn btn-ghost btn-block" data-act="c-showall">${showAll ? 'Show fewer' : `Show all ${hist.length}`}</button>` : ''}`
          : '<p class="small muted">No weigh-ins yet. Log your first one above.</p>'}
      </section>
    </div>`;
  }

  // ---------- measurements ----------
  FDS.onSubmit['c-measure'] = (form, v) => {
    const t = FDS.today();
    if (!FDS.validDate(v.date) || v.date > t) return FDS.toast('Pick a date that isn’t in the future.');
    const rec = { date: v.date };
    let any = false;
    for (const [k] of SITES) {
      const cm = FDS.lenIn(v[k]);
      if (cm != null && cm > 0) { if (cm > 300) return FDS.toast('One measurement looks too large. Check it.'); rec[k] = Math.round(cm * 10) / 10; any = true; }
    }
    if (!any) return FDS.toast('Enter at least one measurement.');
    FDS.commit(s => {
      const ex = s.measurements.find(m => m.date === v.date);
      if (ex) Object.assign(ex, rec); else s.measurements.push(Object.assign({ id: FDS.uid() }, rec));
      s.measurements.sort((a, b) => (a.date < b.date ? -1 : 1));
    });
    FDS.toast('Measurements saved');
  };
  FDS.act['c-site'] = el => { site = el.dataset.value; FDS.refresh(); };
  FDS.act['c-mdel'] = el => {
    const idx = FDS.S.measurements.findIndex(m => m.id === el.dataset.id);
    if (idx < 0) return;
    const m = FDS.S.measurements[idx];
    FDS.commit(s => { s.measurements.splice(idx, 1); });
    FDS.undo(`Deleted measurements for ${FDS.dateLabel(m.date, 'short')}`, () => FDS.commit(s => { s.measurements.splice(idx, 0, m); }));
  };

  function measureTab() {
    const S = FDS.S, t = FDS.today(), ms = S.measurements.slice().sort((a, b) => (a.date < b.date ? -1 : 1)), u = FDS.lenUnit();
    const rows = SITES.map(([k, label]) => {
      const withK = ms.filter(m => m[k] != null);
      if (!withK.length) return `<tr><td>${label}</td><td>—</td><td>—</td><td>—</td></tr>`;
      const f = withK[0][k], l = withK[withK.length - 1][k], d = l - f;
      const dv = Math.round((u === 'in' ? d / 2.54 : d) * 10) / 10;
      return `<tr><td>${label}</td><td>${FDS.len(f)}</td><td>${FDS.len(l)}</td><td class="${d < -0.05 ? 'delta-down' : d > 0.05 ? 'delta-up' : ''}">${withK.length > 1 ? `${dv > 0 ? '+' : dv < 0 ? '−' : '±'}${Math.abs(dv)} ${u}` : '—'}</td></tr>`;
    }).join('');
    const pts = ms.filter(m => m[site] != null).map(m => ({ x: m.date, y: FDS.lenVal(m[site]) }));
    return `<div class="stack-lg">
      <div class="grid md2">
        <section class="card">
          <div class="card-head"><span class="eyebrow">Add measurements</span></div>
          <form class="form-grid" data-submit="c-measure">
            <label class="field full"><span>Date</span><input class="input" type="date" name="date" max="${t}" value="${t}" required></label>
            ${SITES.map(([k, label]) => `<label class="field"><span>${label}</span><span class="suffix"><input class="input" name="${k}" type="number" inputmode="decimal" step="0.1" min="0"><em>${u}</em></span></label>`).join('')}
            <button class="btn btn-primary btn-lg full" type="submit">Save measurements</button>
          </form>
        </section>
        <section class="card">
          <div class="card-head"><span class="eyebrow">How to measure</span></div>
          <ul class="ul small">
            <li>Measure every 2–4 weeks, at the same time of day. Mornings are best.</li>
            <li>Stand relaxed. Don’t suck in or flex.</li>
            <li>Keep the tape snug but not tight, and level all the way around.</li>
            <li>Waist: at navel level. Hips: the widest point. Chest: across the nipples. Arms and thighs: the widest point of the same side each time.</li>
          </ul>
          <p class="small muted" style="margin-top:10px">Measurements often show progress when the scale is slow. A shrinking waist is a good sign.</p>
        </section>
      </div>
      <section class="card">
        <div class="card-head"><span class="eyebrow">First vs latest</span></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Site</th><th>First</th><th>Latest</th><th>Change</th></tr></thead><tbody>${rows}</tbody></table></div>
      </section>
      <section class="card" data-day="legs">
        <div class="card-head"><span class="eyebrow">Over time</span></div>
        ${FDS.seg({ act: 'c-site', value: site, options: SITES.map(([value, label]) => ({ value, label })), label: 'Measurement' })}
        <div style="margin-top:12px">${FDS.chart.line({ height: 190, label: 'Measurement trend', empty: 'No measurements for this site yet', series: [{ points: pts, style: 'pts' }] })}</div>
      </section>
      <section class="card">
        <div class="card-head"><span class="eyebrow">History</span></div>
        ${ms.length ? `<div class="list">${ms.slice().reverse().map(m => `<div class="list-row"><span class="grow"><b>${FDS.dateLabel(m.date, 'year')}</b><br><span class="small muted">${SITES.filter(([k]) => m[k] != null).map(([k, l]) => `${l} ${FDS.len(m[k])}`).join(' · ')}</span></span>
          <button type="button" class="icon-btn" data-act="c-mdel" data-id="${m.id}" aria-label="Delete measurements ${FDS.dateLabel(m.date, 'short')}">${FDS.icon('trash')}</button></div>`).join('')}</div>` : '<p class="small muted">No measurements yet.</p>'}
      </section>
    </div>`;
  }

  // ---------- photos (IndexedDB) ----------
  const DB = {
    db: null,
    open() {
      return new Promise((res, rej) => {
        if (this.db) return res(this.db);
        if (!window.indexedDB) return rej(new Error('unavailable'));
        const rq = indexedDB.open('fds-photos', 1);
        rq.onupgradeneeded = () => rq.result.createObjectStore('photos', { keyPath: 'id' });
        rq.onsuccess = () => { this.db = rq.result; res(this.db); };
        rq.onerror = () => rej(rq.error);
      });
    },
    async run(mode, fn) {
      const db = await this.open();
      return new Promise((res, rej) => {
        const tx = db.transaction('photos', mode);
        const req = fn(tx.objectStore('photos'));
        tx.oncomplete = () => res(req.result);
        tx.onerror = () => rej(tx.error);
      });
    },
    all() { return this.run('readonly', s => s.getAll()); },
    put(r) { return this.run('readwrite', s => s.put(r)); },
    del(id) { return this.run('readwrite', s => s.delete(id)); }
  };
  function compress(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const k = Math.min(1, 1000 / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        res(c.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
      img.src = url;
    });
  }
  function paintPhotos() {
    const box = document.getElementById('c-photos');
    if (!box) return;
    if (!photos.length) { box.innerHTML = '<p class="small muted">No progress photos yet. Monthly photos in the same spot and lighting make changes easy to see.</p>'; return; }
    const sorted = photos.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    const months = {};
    sorted.forEach(p => { (months[p.date.slice(0, 7)] = months[p.date.slice(0, 7)] || []).push(p); });
    const opt = sel => sorted.map(p => `<option value="${p.id}" ${p.id === sel ? 'selected' : ''}>${FDS.dateLabel(p.date, 'year')} · ${p.pose}</option>`).join('');
    const same = sorted.filter(p => p.pose === sorted[0].pose);
    const a = box.dataset.a && photos.find(p => p.id === box.dataset.a) ? box.dataset.a : (same[same.length - 1] || sorted[sorted.length - 1]).id;
    const b = box.dataset.b && photos.find(p => p.id === box.dataset.b) ? box.dataset.b : sorted[0].id;
    const pa = photos.find(p => p.id === a), pb = photos.find(p => p.id === b);
    box.innerHTML = `${Object.keys(months).map(m => {
      const [y, mo] = m.split('-');
      return `<p class="label" style="margin:12px 0 6px">${FDS.MON[+mo - 1]} ${y}</p><div class="photo-grid">${months[m].map(p => `<figure><button type="button" data-act="c-photo-view" data-id="${p.id}" aria-label="View ${p.pose} photo from ${FDS.dateLabel(p.date, 'short')}"><img src="${p.dataUrl}" alt=""></button><figcaption><span>${FDS.dateLabel(p.date, 'short')}</span><span class="muted">${p.pose}</span></figcaption></figure>`).join('')}</div>`;
    }).join('')}
    ${photos.length > 1 ? `<div class="card card-tight" style="margin-top:16px"><p class="eyebrow" style="margin-bottom:8px">Compare</p>
      <div class="form-grid"><label class="field"><span>Before</span><select class="input" data-change="c-cmp" data-side="a">${opt(a)}</select></label><label class="field"><span>After</span><select class="input" data-change="c-cmp" data-side="b">${opt(b)}</select></label></div>
      <div class="c-compare" style="margin-top:10px"><figure><img src="${pa.dataUrl}" alt="Before photo"><figcaption class="small center">${FDS.dateLabel(pa.date, 'year')}</figcaption></figure><figure><img src="${pb.dataUrl}" alt="After photo"><figcaption class="small center">${FDS.dateLabel(pb.date, 'year')}</figcaption></figure></div></div>` : ''}`;
  }
  function loadPhotos() {
    DB.all().then(list => { photos = list || []; paintPhotos(); })
      .catch(() => { const box = document.getElementById('c-photos'); if (box) box.innerHTML = '<div class="note warn small">Photos can’t be stored in this browser (private mode or storage blocked). Try a normal browser window.</div>'; });
  }
  FDS.onChange['c-cmp'] = el => { const box = document.getElementById('c-photos'); box.dataset[el.dataset.side] = el.value; paintPhotos(); };
  FDS.act['c-pose'] = el => { pose = el.dataset.value; el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === el))); };
  FDS.onChange['c-photo-file'] = async el => {
    const file = el.files && el.files[0];
    if (!file) return;
    const dateEl = document.getElementById('c-pdate');
    const date = FDS.validDate(dateEl && dateEl.value) && dateEl.value <= FDS.today() ? dateEl.value : FDS.today();
    try {
      FDS.toast('Saving photo…');
      const dataUrl = await compress(file);
      await DB.put({ id: FDS.uid(), date, pose, dataUrl });
      FDS.toast('Photo saved on this device');
      loadPhotos();
    } catch (e) { FDS.toast('Couldn’t save that photo. Try a different image.'); }
    el.value = '';
  };
  FDS.act['c-photo-view'] = el => {
    const p = photos.find(x => x.id === el.dataset.id);
    if (!p) return;
    FDS.sheet.open({ title: `${FDS.dateLabel(p.date, 'year')} · ${p.pose}`, html: `<div class="stack"><img src="${p.dataUrl}" alt="Progress photo" style="border-radius:12px;width:100%"><button type="button" class="btn btn-danger btn-block" data-act="c-photo-del" data-id="${p.id}">${FDS.icon('trash')} Delete photo</button></div>` });
  };
  FDS.act['c-photo-del'] = async el => {
    if (!confirm('Delete this photo? This can’t be undone.')) return;
    try { await DB.del(el.dataset.id); FDS.sheet.close(); FDS.toast('Photo deleted'); loadPhotos(); } catch (e) { FDS.toast('Couldn’t delete the photo.'); }
  };

  function photosTab() {
    const t = FDS.today();
    return `<div class="stack-lg">
      <section class="card">
        <div class="card-head"><span class="eyebrow">Add a progress photo</span></div>
        <div class="stack">
          <label class="field"><span>Date</span><input class="input" type="date" id="c-pdate" max="${t}" value="${t}"></label>
          <div><p class="label" style="margin-bottom:6px">Pose</p>${FDS.seg({ act: 'c-pose', value: pose, options: POSES.map(([value, label]) => ({ value, label })), label: 'Pose' })}</div>
          <label class="btn btn-primary btn-lg btn-block" for="c-file">${FDS.icon('camera')} Choose or take photo</label>
          <input class="c-file" id="c-file" type="file" accept="image/*" data-change="c-photo-file">
          <p class="small muted">${FDS.icon('info', 'c-inline-ico')} Photos stay on this device only. They aren’t uploaded anywhere, and they aren’t included in data backups.</p>
          <p class="tiny muted">For fair comparisons: same spot, same lighting, same time of day, once a month.</p>
        </div>
      </section>
      <section class="card"><div class="card-head"><span class="eyebrow">Your photos</span></div><div id="c-photos"><p class="small muted">Loading photos…</p></div></section>
    </div>`;
  }

  FDS.route('body', {
    title: 'Body', nav: 'body',
    render(ctx) {
      const tab = ['weight', 'measure', 'photos'].includes(ctx.query.get('tab')) ? ctx.query.get('tab') : 'weight';
      const tabs = [['weight', 'Weight'], ['measure', 'Measurements'], ['photos', 'Photos']];
      return `<div data-day="legs">
        <nav class="subtabs" aria-label="Body sections">${tabs.map(([k, l]) => `<a href="#/body?tab=${k}" ${k === tab ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>
        ${tab === 'weight' ? weightTab() : tab === 'measure' ? measureTab() : photosTab()}
      </div>`;
    },
    mount(ctx, view) {
      if (ctx.query.get('tab') === 'photos') loadPhotos();
      view.querySelectorAll('form[data-submit="c-weight"]').forEach(updateDiff);
    }
  });
})();
