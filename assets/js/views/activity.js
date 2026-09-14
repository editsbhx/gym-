/* Activity: daily steps (with 7K→10K ramp) and optional cardio, driven by steps, workout type, recovery and preference. */
(function () {
  const { D, L, esc } = FDS;
  const LEVEL = { recommended: 'Suggested', optional: 'Optional', light: 'Keep it light', done: 'Done for today' };

  // ---------- steps sheet ----------
  function stepsForm(date) {
    const S = FDS.S, goal = FDS.stepGoal(date), cur = S.steps[date];
    return `<form class="stack" data-submit="d-steps">
      <input type="hidden" name="date" value="${date}">
      <label class="field"><span>Total steps for ${date === FDS.today() ? 'today' : FDS.dateLabel(date)}</span>
        <input class="input d-bignum" name="steps" type="number" inputmode="numeric" min="0" max="100000" step="1" value="${cur != null ? cur : ''}" placeholder="0" required></label>
      <div class="d-quick">
        <button type="button" class="btn" data-act="d-steps-add" data-n="1000">+1,000</button>
        <button type="button" class="btn" data-act="d-steps-add" data-n="2500">+2,500</button>
        <button type="button" class="btn" data-act="d-steps-add" data-n="5000">+5,000</button>
      </div>
      <p class="small">Target: <b>${FDS.n(goal)}</b>${cur != null ? ` · ${cur >= goal ? 'target hit' : FDS.n(goal - cur) + ' to go'}` : ''}</p>
      <p class="tiny muted">Enter your total from your phone or watch. Treadmill and walking steps count toward this same total. You never need 10,000 plus a separate walk.</p>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Save steps</button>
    </form>`;
  }
  FDS.openStepsSheet = date => {
    const t = FDS.today();
    date = FDS.validDate(date) && date <= t ? date : t;
    FDS.sheet.open({ title: 'Steps', html: stepsForm(date) });
  };
  FDS.act['d-steps-add'] = el => {
    const input = el.closest('form').querySelector('input[name="steps"]');
    input.value = Math.min(100000, (Number(input.value) || 0) + Number(el.dataset.n));
  };
  FDS.onSubmit['d-steps'] = (form, v) => {
    const n = Math.round(Number(v.steps));
    if (v.steps === '' || isNaN(n) || n < 0 || n > 100000) return FDS.toast('Enter a step count between 0 and 100,000.');
    if (form.closest('.sheet')) FDS.sheet.close();
    FDS.commit(s => { s.steps[v.date] = n; });
    FDS.toast(n >= FDS.stepGoal(v.date) ? 'Steps saved — target hit' : 'Steps saved');
  };

  // ---------- cardio sheet ----------
  function cardioForm(date) {
    const st = FDS.S.settings;
    return `<form class="stack" data-submit="d-cardio">
      <input type="hidden" name="date" value="${date}">
      <input type="hidden" name="type" value="${st.cardioType}">
      <input type="hidden" name="intensity" value="moderate">
      <div><p class="label" style="margin-bottom:6px">Type</p>
        <div class="seg d-seg-wrap" role="group" aria-label="Cardio type">${Object.entries({ incline: 'Incline walk', bike: 'Bike', elliptical: 'Elliptical', walk: 'Brisk walk' }).map(([k, l]) => `<button type="button" data-act="d-pick" data-name="type" data-value="${k}" aria-pressed="${k === st.cardioType}">${l}</button>`).join('')}</div></div>
      <div><div class="stepper-cap"><span>Minutes</span></div>
        <div class="stepper"><button type="button" data-act="d-min-step" data-dir="-5" aria-label="Minus 5 minutes">−</button><input name="min" type="number" inputmode="numeric" min="1" max="240" value="20" required aria-label="Minutes"><button type="button" data-act="d-min-step" data-dir="5" aria-label="Plus 5 minutes">+</button></div>
        <div class="row-wrap" style="margin-top:8px">${[10, 15, 20, 30, 45].map(m => `<button type="button" class="btn btn-sm" data-act="d-min-set" data-n="${m}">${m} min</button>`).join('')}</div></div>
      <div><p class="label" style="margin-bottom:6px">Intensity</p>
        <div class="seg" role="group" aria-label="Intensity"><button type="button" data-act="d-pick" data-name="intensity" data-value="easy" aria-pressed="false">Easy</button><button type="button" data-act="d-pick" data-name="intensity" data-value="moderate" aria-pressed="true">Moderate</button></div>
        <p class="tiny muted" style="margin-top:6px">Moderate: breathing harder, but you can still talk in full sentences.</p></div>
      <label class="field"><span>Note (optional)</span><input class="input" name="note" maxlength="80" placeholder="e.g. 10% incline, 5 km/h"></label>
      <button class="btn btn-primary btn-lg btn-block" type="submit">Save cardio</button>
    </form>`;
  }
  FDS.openCardioSheet = date => {
    const t = FDS.today();
    date = FDS.validDate(date) && date <= t ? date : t;
    const rec = FDS.cardioRec(date);
    FDS.sheet.open({ title: 'Log cardio', html: `<div class="note day small" data-day="rest" style="margin-bottom:12px"><strong>${esc(rec.headline)}</strong><br>${esc(rec.reasons[0] || '')}</div>${cardioForm(date)}` });
  };
  FDS.act['d-pick'] = el => {
    const form = el.closest('form');
    form.querySelector(`input[name="${el.dataset.name}"]`).value = el.dataset.value;
    el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === el)));
  };
  FDS.act['d-min-step'] = el => { const i = el.parentElement.querySelector('input'); i.value = Math.max(1, Math.min(240, (Number(i.value) || 0) + Number(el.dataset.dir))); };
  FDS.act['d-min-set'] = el => { el.closest('form').querySelector('input[name="min"]').value = el.dataset.n; };
  FDS.onSubmit['d-cardio'] = (form, v) => {
    const min = Math.round(Number(v.min));
    if (isNaN(min) || min < 1 || min > 240) return FDS.toast('Minutes must be between 1 and 240.');
    if (form.closest('.sheet')) FDS.sheet.close();
    FDS.commit(s => { (s.cardio[v.date] = s.cardio[v.date] || []).push({ id: FDS.uid(), type: D.CARDIO_TYPES[v.type] ? v.type : 'incline', min, intensity: v.intensity === 'easy' ? 'easy' : 'moderate', note: (v.note || '').trim() }); });
    FDS.toast(`${min} min cardio saved`);
  };
  FDS.act['d-cdel'] = el => {
    const date = el.dataset.date, list = FDS.S.cardio[date] || [];
    const idx = list.findIndex(c => c.id === el.dataset.id);
    if (idx < 0) return;
    const c = list[idx];
    FDS.commit(s => { s.cardio[date].splice(idx, 1); });
    FDS.undo(`Deleted ${c.min} min cardio`, () => FDS.commit(s => { (s.cardio[date] = s.cardio[date] || []).splice(idx, 0, c); }));
  };
  FDS.act['d-cpref'] = el => { FDS.commit(s => { s.settings.cardioPref = el.dataset.value; }); FDS.toast('Preference saved'); };
  FDS.onChange['d-ramp'] = el => { FDS.commit(s => { s.profile.stepRamp = el.checked; }); FDS.toast(el.checked ? 'Building up gradually' : 'Starting at your full step goal'); };

  // ---------- page ----------
  function stepsTab(date) {
    const S = FDS.S, goal = FDS.stepGoal(date), steps = S.steps[date], wk = FDS.week(date), full = S.profile.stepGoal;
    const days = [...Array(7)].map((_, i) => L.addDays(date, i - 6));
    const withData = days.filter(d => S.steps[d] != null);
    const avg = withData.length ? Math.round(withData.reduce((a, d) => a + S.steps[d], 0) / withData.length) : null;
    const ramp = [[1, 2, 'Weeks 1–2'], [3, 4, 'Weeks 3–4'], [5, 8, 'Weeks 5–8'], [9, 999, 'Week 9 onward']];
    return `<div class="grid md2">
      <section class="card" data-day="rest">
        <div class="card-head"><span class="eyebrow">Steps</span><span class="small muted">Target ${FDS.n(goal)}</span></div>
        <div class="d-stepring">
          ${FDS.ring({ pct: (steps || 0) / goal, big: steps != null ? FDS.n(steps) : '0', sub: `of ${FDS.n(goal)}`, size: 160, label: `${steps || 0} of ${goal} steps` })}
          <div class="stats" style="flex:1">
            <div class="stat"><b>${steps != null ? FDS.n(Math.max(0, goal - steps)) : FDS.n(goal)}</b><span>Remaining</span></div>
            <div class="stat"><b>${steps != null ? Math.round((steps / goal) * 100) + '%' : '—'}</b><span>Complete</span></div>
            <div class="stat"><b>${avg != null ? FDS.n(avg) : '—'}</b><span>7-day average</span></div>
            <div class="stat"><b>${withData.length}/7</b><span>Days logged</span></div>
          </div>
        </div>
        <div style="margin-top:14px">${stepsForm(date)}</div>
      </section>
      <div class="stack">
        <section class="card" data-day="rest">
          <div class="card-head"><span class="eyebrow">Last 7 days</span></div>
          ${FDS.chart.bars({ height: 180, target: goal, label: 'Steps per day', empty: 'No steps logged this week', yFmt: v => (v >= 1000 ? Math.round(v / 1000) + 'k' : v), points: days.map(d => ({ label: FDS.DOW[L.dow(d)].slice(0, 2), y: S.steps[d] || 0, hit: (S.steps[d] || 0) >= FDS.stepGoal(d) })) })}
        </section>
        <section class="card" data-day="rest">
          <div class="card-head"><span class="eyebrow">Step progression</span><span class="small muted">You’re in week ${wk}</span></div>
          ${S.profile.stepRamp ? `<div class="stack" style="gap:4px">${ramp.map(([a, b, label]) => `<div class="d-prog-row ${wk >= a && wk <= b ? 'on' : ''}"><span>${label}</span><b class="num">${FDS.n(L.stepTarget(a, full, true))}/day</b></div>`).join('')}</div>
            <p class="small muted" style="margin-top:8px">Building up slowly is easier on your feet, knees and recovery while your body adjusts.</p>`
            : `<p class="small">You chose to start at <b>${FDS.n(full)}</b> steps a day.</p>`}
          <label class="switch" style="margin-top:8px"><span class="small">Build up gradually (turn off if you already walk ~10K most days)</span><input type="checkbox" data-change="d-ramp" ${S.profile.stepRamp ? 'checked' : ''}></label>
        </section>
      </div>
    </div>`;
  }

  function cardioTab(date) {
    const S = FDS.S, rec = FDS.cardioRec(date), wk = FDS.week(date), plan = FDS.planFor(date);
    const entries = S.cardio[date] || [];
    const days = [...Array(7)].map((_, i) => L.addDays(date, i - 6));
    const weekMin = days.reduce((a, d) => a + FDS.cardioMin(d), 0);
    const prog = [[1, 2, 'Weeks 1–2', '20 min'], [3, 4, 'Weeks 3–4', '25 min'], [5, 8, 'Weeks 5–8', '30 min'], [9, 999, 'Week 9+', '30–40 min']];
    return `<div class="stack-lg">
      <div class="grid md2">
        <section class="card" data-day="rest">
          <div class="card-head"><span class="eyebrow">${date === FDS.today() ? 'Today' : FDS.dateLabel(date)} · ${esc(plan.title)}</span><span class="pill">${LEVEL[rec.level]}</span></div>
          <p class="h3" style="font-size:20px">${esc(rec.headline)}</p>
          <p class="small muted" style="margin:4px 0 10px">${esc(rec.intensity)}</p>
          <ul class="check-list small">${rec.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>
          <p class="tiny muted" style="margin-top:10px">Cardio is optional. It depends on your steps and recovery. Skip it if you feel run down.</p>
        </section>
        <section class="card">
          <div class="card-head"><span class="eyebrow">Log cardio</span></div>
          ${cardioForm(date)}
        </section>
      </div>
      <div class="grid md2">
        <section class="card">
          <div class="card-head"><span class="eyebrow">Logged ${date === FDS.today() ? 'today' : 'this day'}</span><span class="small muted">${FDS.cardioMin(date)} min</span></div>
          ${entries.length ? `<div class="list">${entries.map(c => `<div class="list-row"><span class="grow"><b>${c.min} min · ${esc(D.CARDIO_TYPES[c.type] || c.type)}</b><br><span class="small muted">${c.intensity}${c.note ? ' · ' + esc(c.note) : ''}</span></span><button type="button" class="icon-btn" data-act="d-cdel" data-date="${date}" data-id="${c.id}" aria-label="Delete">${FDS.icon('trash')}</button></div>`).join('')}</div>` : '<p class="small muted">No cardio logged.</p>'}
          <p class="label" style="margin:14px 0 4px">Last 7 days · ${weekMin} min total</p>
          ${FDS.chart.bars({ height: 150, label: 'Cardio minutes per day', empty: 'No cardio this week', points: days.map(d => ({ label: FDS.DOW[L.dow(d)].slice(0, 2), y: FDS.cardioMin(d), hit: FDS.cardioMin(d) > 0 })) })}
        </section>
        <section class="card" data-day="rest">
          <div class="card-head"><span class="eyebrow">Cardio progression</span><span class="small muted">Week ${wk}</span></div>
          <div class="stack" style="gap:4px">${prog.map(([a, b, l, m]) => `<div class="d-prog-row ${wk >= a && wk <= b ? 'on' : ''}"><span>${l}</span><b>${m} when needed</b></div>`).join('')}</div>
          <p class="small" style="margin-top:12px"><b>What the suggestion considers:</b> your step count, today’s workout, leg fatigue, your recovery check-in, and your preference.</p>
          <p class="label" style="margin:12px 0 6px">Your preference</p>
          ${FDS.seg({ act: 'd-cpref', value: S.settings.cardioPref, options: [{ value: 'less', label: 'Less' }, { value: 'normal', label: 'Normal' }, { value: 'more', label: 'More' }], label: 'Cardio preference' })}
          <p class="tiny muted" style="margin-top:6px">“More” adds a little on good days, but never goes past 40 minutes.</p>
        </section>
      </div>
      <section class="card">
        <div class="card-head"><span class="eyebrow">How cardio fits in</span></div>
        <div class="grid md2">
          <ul class="ul small">
            <li><b>Already hit 10,000 steps?</b> (for example, a morning walk) Don’t force another 30–40 minutes after the gym. An optional 10–15 minute easy cooldown is enough.</li>
            <li><b>Low steps today?</b> 20–40 minutes of moderate cardio after weights can help, if you feel up to it.</li>
            <li><b>Wednesday leg day:</b> keep it lighter, around 10–30 minutes, depending on how your legs feel.</li>
            <li><b>Never punishment.</b> Don’t use cardio to “make up” for food or missed workouts.</li>
          </ul>
          <div><p class="label" style="margin-bottom:6px">Good options</p>
            <ul class="check-list small">${Object.values(D.CARDIO_TYPES).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
            <p class="small muted" style="margin-top:8px">Aim for moderate intensity: about 5–6 out of 10 effort, where you can still talk.</p></div>
        </div>
      </section>
      <div class="grid md2">
        <section class="card" data-day="rest"><p class="eyebrow">Saturday · Active recovery</p><p class="h3" style="margin:4px 0 8px">45–60 minute brisk walk</p>
          <p class="small">A dedicated walk, separate from your daily target. Its steps still count toward your 10,000 total. No weight training.</p></section>
        <section class="card" data-day="rest"><p class="eyebrow">Sunday · Recovery</p><p class="h3" style="margin:4px 0 8px">20–30 minute easy walk</p>
          <ul class="check-list small"><li>Normal daily movement</li><li>No weight training</li><li>Recovery focus: sleep, food, hydration</li></ul></section>
      </div>
    </div>`;
  }

  FDS.route('activity', {
    title: 'Activity', nav: 'activity',
    render(ctx) {
      const tab = ctx.query.get('tab') === 'cardio' ? 'cardio' : 'steps';
      const date = FDS.queryDate(ctx);
      return `<div data-day="rest">
        <section class="note day small" style="margin-bottom:14px"><strong>Steps and cardio are related but not the same.</strong> Steps are all your movement across the day (target: 10,000 in total). Cardio is a focused session at moderate effort. Treadmill and walking steps count toward the same 10,000, so you never need 10,000 steps plus a separate 10,000-step walk.</section>
        <nav class="subtabs" aria-label="Activity sections"><a href="#/activity?tab=steps&date=${date}" ${tab === 'steps' ? 'aria-current="page"' : ''}>Steps</a><a href="#/activity?tab=cardio&date=${date}" ${tab === 'cardio' ? 'aria-current="page"' : ''}>Cardio</a></nav>
        ${FDS.dateBar(date, d => `#/activity?tab=${tab}&date=${d}`)}
        ${tab === 'steps' ? stepsTab(date) : cardioTab(date)}
      </div>`;
    }
  });
})();
