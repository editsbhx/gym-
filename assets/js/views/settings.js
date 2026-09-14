/* Settings (profile, units, cardio, rest timer, theme, notifications, backup) and first-run onboarding. */
(function () {
  const { D, L, esc } = FDS;
  const RANGE = { 'profile.age': [13, 100], 'profile.startKg': [30, 400], 'profile.goalKg': [30, 400], 'profile.stepGoal': [1000, 40000], 'profile.heightCm': [120, 230] };

  const setPath = (obj, path, v) => { const p = path.split('.'); let o = obj; p.slice(0, -1).forEach(k => { o = o[k]; }); o[p[p.length - 1]] = v; };

  FDS.onChange['d-set'] = el => {
    const kind = el.dataset.kind, path = el.dataset.path;
    let v = el.type === 'checkbox' ? el.checked : el.value;
    if (kind === 'int' || kind === 'float' || kind === 'weight') {
      v = kind === 'int' ? parseInt(v, 10) : Number(v);
      if (v === '' || isNaN(v)) { FDS.toast('Enter a number.'); return FDS.refresh(); }
      if (kind === 'weight') v = Math.round(FDS.wIn(v) * 10) / 10;
      const r = RANGE[path];
      if (r && (v < r[0] || v > r[1])) { FDS.toast(`That value looks off. Check it and try again.`); return FDS.refresh(); }
    } else if (kind === 'date') {
      if (!FDS.validDate(v)) { FDS.toast('Pick a valid date.'); return FDS.refresh(); }
    } else if (kind === 'text') v = String(v).trim().slice(0, 140);
    if (path === 'profile.targetDate' && v <= FDS.S.profile.startDate) { FDS.toast('The target date should be after the start date.'); return FDS.refresh(); }
    FDS.commit(s => setPath(s, path, v));
    FDS.toast('Saved');
  };
  FDS.onChange['d-height'] = () => {
    const ft = Number(document.getElementById('d-ft').value), inch = Number(document.getElementById('d-in').value);
    const cm = L.ftInToCm(ft || 0, inch || 0);
    if (!(cm >= 120 && cm <= 230)) { FDS.toast('That height looks off. Check it.'); return FDS.refresh(); }
    FDS.commit(s => { s.profile.heightCm = Math.round(cm * 10) / 10; });
    FDS.toast('Saved');
  };
  FDS.act['d-seg'] = el => {
    const path = el.dataset.path;
    FDS.commit(s => setPath(s, path, el.dataset.value));
    if (path === 'settings.theme') FDS.applyTheme();
    FDS.toast('Saved');
  };
  FDS.act['d-rest'] = el => {
    const type = el.dataset.type;
    FDS.commit(s => { s.settings.rest[type] = Math.max(15, Math.min(600, s.settings.rest[type] + Number(el.dataset.dir))); });
  };
  FDS.act['d-rest-default'] = () => { FDS.commit(s => { s.settings.rest = { compound: 150, isolation: 75, core: 50 }; }); FDS.toast('Rest times reset'); };
  FDS.act['d-test-timer'] = () => { FDS.timer.start(5, 'Test'); FDS.toast('Test timer: 5 seconds'); };
  FDS.act['d-notify'] = async () => {
    if (!('Notification' in window)) return FDS.toast('This browser doesn’t support notifications.');
    if (FDS.S.settings.notify) { FDS.commit(s => { s.settings.notify = false; }); return FDS.toast('Rest alerts turned off'); }
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm === 'granted') { FDS.commit(s => { s.settings.notify = true; }); FDS.toast('Rest alerts on'); }
    else { FDS.refresh(); FDS.toast('Notifications are blocked. Allow them in your browser’s site settings.'); }
  };
  FDS.act['d-export'] = () => {
    const blob = new Blob([JSON.stringify(FDS.S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `five-day-split-backup-${FDS.today()}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
    FDS.toast('Backup downloaded');
  };
  FDS.onChange['d-import'] = el => {
    const file = el.files && el.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      el.value = '';
      let data;
      try { data = JSON.parse(reader.result); } catch (e) { return FDS.toast('That file isn’t a valid backup.'); }
      if (!data || typeof data !== 'object' || !data.profile || typeof data.sessions !== 'object') return FDS.toast('That file isn’t a Five Day Split backup.');
      if (!confirm('Replace all current data with this backup? This can’t be undone.')) return;
      FDS.replaceState(data);
      FDS.toast('Backup restored');
    };
    reader.readAsText(file);
  };
  FDS.act['d-reset'] = () => {
    if (!confirm('Delete all your workouts, weights, food and settings on this device?')) return;
    if (!confirm('Are you sure? Export a backup first if you might want this data. This can’t be undone.')) return;
    FDS.resetState();
    location.hash = '#/';
    FDS.refresh();
    FDS.onboarding();
  };

  FDS.route('settings', {
    title: 'Settings', nav: 'settings',
    render() {
      const S = FDS.S, P = S.profile, st = S.settings, u = st.unit;
      const { ft, inch } = L.cmToFtIn(P.heightCm);
      const f = (label, input, hint) => `<label class="field"><span>${label}</span>${input}${hint ? `<span class="tiny muted">${hint}</span>` : ''}</label>`;
      const num = (path, val, kind, suffix, attrs = '') => `<span class="suffix"><input class="input" type="number" inputmode="decimal" data-change="d-set" data-path="${path}" data-kind="${kind}" value="${val}" ${attrs}>${suffix ? `<em>${suffix}</em>` : ''}</span>`;
      const sw = (label, path, on, hint) => `<label class="switch"><span><span class="h3" style="font-size:15px">${label}</span>${hint ? `<br><span class="tiny muted">${hint}</span>` : ''}</span><input type="checkbox" data-change="d-set" data-path="${path}" data-kind="bool" ${on ? 'checked' : ''}></label>`;
      const seg = (path, value, options) => `<div class="seg" role="group">${options.map(([v, l]) => `<button type="button" data-act="d-seg" data-path="${path}" data-value="${v}" aria-pressed="${String(v) === String(value)}">${l}</button>`).join('')}</div>`;
      const restRow = (type, label) => `<div class="row between d-rest-row"><span><b>${label}</b><br><span class="tiny muted">${D.REST[type].label} recommended</span></span>
        <span class="row"><button type="button" class="icon-btn" data-act="d-rest" data-type="${type}" data-dir="-15" aria-label="Less rest for ${label}">${FDS.icon('minus')}</button><b class="num d-rest-val">${FDS.mmss(st.rest[type])}</b><button type="button" class="icon-btn" data-act="d-rest" data-type="${type}" data-dir="15" aria-label="More rest for ${label}">${FDS.icon('plus')}</button></span></div>`;
      const notif = !('Notification' in window) ? 'unsupported' : Notification.permission;

      return `<div class="page-head"><div><p class="eyebrow">Five Day Split v2</p><h1>Settings</h1></div></div>
      ${FDS.demo ? '<div class="note small" style="margin-bottom:12px">You’re in demo mode. Changes here don’t affect your real data. <a href="./">Exit demo</a></div>' : ''}
      <div class="grid md2" style="align-items:start">
        <section class="card stack">
          <p class="eyebrow">Profile and goal</p>
          <div class="form-grid">
            ${f('Age', num('profile.age', P.age, 'int', 'yrs', 'min="13" max="100"'))}
            ${f('Sex (optional)', `<select class="input" data-change="d-set" data-path="profile.sex" data-kind="text"><option value="" ${!P.sex ? 'selected' : ''}>Prefer not to say</option><option value="male" ${P.sex === 'male' ? 'selected' : ''}>Male</option><option value="female" ${P.sex === 'female' ? 'selected' : ''}>Female</option></select>`, 'Only used for the calorie estimate')}
            ${st.heightUnit === 'ftin'
              ? `<div class="field full"><span>Height</span><div class="form-grid"><span class="suffix"><input class="input" id="d-ft" type="number" inputmode="numeric" min="4" max="7" value="${ft}" data-change="d-height" aria-label="Feet"><em>ft</em></span><span class="suffix"><input class="input" id="d-in" type="number" inputmode="numeric" min="0" max="11" value="${inch}" data-change="d-height" aria-label="Inches"><em>in</em></span></div></div>`
              : `<div class="full">${f('Height', num('profile.heightCm', Math.round(P.heightCm), 'float', 'cm'))}</div>`}
            ${f('Starting weight', num('profile.startKg', FDS.wVal(P.startKg), 'weight', u))}
            ${f('Goal weight', num('profile.goalKg', FDS.wVal(P.goalKg), 'weight', u))}
            ${f('Start date', `<input class="input" type="date" data-change="d-set" data-path="profile.startDate" data-kind="date" value="${P.startDate}">`)}
            ${f('Your target date', `<input class="input" type="date" data-change="d-set" data-path="profile.targetDate" data-kind="date" value="${P.targetDate}">`, 'A guide, not a promise')}
            <div class="full">${f('Primary goal', `<input class="input" data-change="d-set" data-path="profile.primaryGoal" data-kind="text" maxlength="140" value="${esc(P.primaryGoal)}">`)}</div>
            <div class="full">${f('Daily step goal', num('profile.stepGoal', P.stepGoal, 'int', 'steps', 'step="500"'))}</div>
          </div>
          ${sw('Build up steps gradually', 'profile.stepRamp', P.stepRamp, '7,000 → 10,000 over 9 weeks. Turn off if you already walk ~10K a day.')}
          <a class="btn btn-block" href="#/food?edit=targets">${FDS.icon('food')} Calorie and protein targets</a>
        </section>

        <div class="stack">
          <section class="card stack">
            <p class="eyebrow">Units and theme</p>
            <div><p class="label" style="margin-bottom:6px">Weight</p>${seg('settings.unit', u, [['kg', 'kg'], ['lb', 'lb']])}</div>
            <div><p class="label" style="margin-bottom:6px">Height and measurements</p>${seg('settings.heightUnit', st.heightUnit, [['ftin', 'ft / in'], ['cm', 'cm']])}</div>
            <div><p class="label" style="margin-bottom:6px">Theme</p>${seg('settings.theme', st.theme, [['system', 'System'], ['light', 'Light'], ['dark', 'Dark']])}</div>
          </section>

          <section class="card stack">
            <p class="eyebrow">Cardio</p>
            <div><p class="label" style="margin-bottom:6px">How much cardio do you prefer?</p>${seg('settings.cardioPref', st.cardioPref, [['less', 'Less'], ['normal', 'Normal'], ['more', 'More']])}
              <p class="tiny muted" style="margin-top:6px">Suggestions still respect your steps and recovery, and never exceed 40 minutes.</p></div>
            ${f('Preferred machine', `<select class="input" data-change="d-set" data-path="settings.cardioType" data-kind="text">${Object.entries(D.CARDIO_TYPES).map(([k, l]) => `<option value="${k}" ${k === st.cardioType ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`)}
          </section>

          <section class="card stack">
            <div class="row between"><p class="eyebrow">Rest timer</p><button type="button" class="link" data-act="d-rest-default">Reset to defaults</button></div>
            ${restRow('compound', 'Compound lifts')}
            ${restRow('isolation', 'Isolation')}
            ${restRow('core', 'Core')}
            ${sw('Start rest automatically', 'settings.autoRest', st.autoRest, 'Starts after you complete a set')}
            ${sw('Sound', 'settings.sound', st.sound)}
            ${sw('Vibration', 'settings.vibrate', st.vibrate, 'On supported phones')}
            <div class="row between"><span><b>Rest-over alerts</b><br><span class="tiny muted">${notif === 'unsupported' ? 'Not supported in this browser' : notif === 'denied' ? 'Blocked — allow notifications in site settings' : st.notify ? 'On — alerts when the app is in the background' : 'Get an alert when the app is in the background'}</span></span>
              <button type="button" class="btn btn-sm" data-act="d-notify" ${notif === 'unsupported' ? 'disabled' : ''}>${st.notify ? 'Turn off' : 'Turn on'}</button></div>
            <button type="button" class="btn btn-block" data-act="d-test-timer">${FDS.icon('timer')} Test timer (5 sec)</button>
          </section>

          <section class="card stack">
            <p class="eyebrow">Your data</p>
            <p class="small">Your data is saved in this browser on this device. Clearing browser data deletes it, so export a backup regularly. Progress photos stay on the device and aren’t included in backups.</p>
            <div class="grid g2">
              <button type="button" class="btn" data-act="d-export">${FDS.icon('download')} Export backup</button>
              <label class="btn" for="d-import">${FDS.icon('upload')} Import backup</label>
            </div>
            <input id="d-import" class="c-file" type="file" accept="application/json,.json" data-change="d-import">
            <button type="button" class="btn btn-danger btn-block" data-act="d-reset">${FDS.icon('trash')} Reset all data</button>
          </section>
        </div>
      </div>`;
    }
  });

  // ---------- onboarding ----------
  FDS.onboarding = () => {
    const S = FDS.S, P = S.profile, t = FDS.today();
    const { ft, inch } = L.cmToFtIn(P.heightCm);
    FDS.sheet.open({
      title: 'Welcome',
      html: `<form class="stack" data-submit="d-onboard">
        <p>Let’s set your starting point. You can change any of this later in Settings.</p>
        <div class="form-grid">
          <label class="field"><span>Weight unit</span><select class="input" name="unit"><option value="kg" selected>kg</option><option value="lb">lb</option></select></label>
          <label class="field"><span>Age</span><input class="input" name="age" type="number" inputmode="numeric" min="13" max="100" value="${P.age}" required></label>
          <label class="field"><span>Starting weight</span><input class="input" name="start" type="number" inputmode="decimal" step="0.1" value="${P.startKg}" required></label>
          <label class="field"><span>Goal weight</span><input class="input" name="goal" type="number" inputmode="decimal" step="0.1" value="${P.goalKg}" required></label>
          <label class="field"><span>Height (ft)</span><input class="input" name="ft" type="number" inputmode="numeric" min="4" max="7" value="${ft}" required></label>
          <label class="field"><span>Height (in)</span><input class="input" name="in" type="number" inputmode="numeric" min="0" max="11" value="${inch}" required></label>
          <label class="field"><span>Start date</span><input class="input" name="startDate" type="date" value="${t}" required></label>
          <label class="field"><span>Your target date</span><input class="input" name="targetDate" type="date" value="${L.addDays(t, 364)}" required></label>
          <label class="field full"><span>Sex (optional, for the calorie estimate)</span><select class="input" name="sex"><option value="">Prefer not to say</option><option value="male">Male</option><option value="female">Female</option></select></label>
        </div>
        <p class="tiny muted">The target date is a guide, not a promise. Everyone progresses at a different pace.</p>
        <fieldset class="d-fieldset"><legend class="label">Do you already walk about 10,000 steps most days?</legend>
          <label class="d-radio"><input type="radio" name="walk" value="no" checked> <span><b>Not yet</b> — build up gradually (7,000 → 10,000 over 9 weeks)</span></label>
          <label class="d-radio"><input type="radio" name="walk" value="yes"> <span><b>Yes</b> — start at 10,000</span></label>
        </fieldset>
        <label class="switch"><span>Save starting weight as today’s weigh-in</span><input type="checkbox" name="weighin" checked></label>
        <button class="btn btn-primary btn-lg btn-block" type="submit">Save and start</button>
        <button class="btn btn-ghost btn-block" type="button" data-act="d-onboard-skip">Skip for now</button>
      </form>`
    });
  };
  FDS.onSubmit['d-onboard'] = (form, v) => {
    const unit = v.unit === 'lb' ? 'lb' : 'kg';
    const start = L.toKg(v.start, unit), goal = L.toKg(v.goal, unit), age = parseInt(v.age, 10);
    const cm = L.ftInToCm(Number(v.ft) || 0, Number(v.in) || 0);
    if (!(start >= 30 && start <= 400) || !(goal >= 30 && goal <= 400)) return FDS.toast('Check your starting and goal weights.');
    if (!(age >= 13 && age <= 100)) return FDS.toast('Check your age.');
    if (!(cm >= 120 && cm <= 230)) return FDS.toast('Check your height.');
    if (!FDS.validDate(v.startDate) || !FDS.validDate(v.targetDate) || v.targetDate <= v.startDate) return FDS.toast('The target date should be after the start date.');
    FDS.sheet.close();
    FDS.commit(s => {
      Object.assign(s.profile, { age, startKg: Math.round(start * 10) / 10, goalKg: Math.round(goal * 10) / 10, heightCm: Math.round(cm * 10) / 10, startDate: v.startDate, targetDate: v.targetDate, sex: v.sex || '', stepRamp: v.walk !== 'yes' });
      s.settings.unit = unit;
      if (v.weighin === 'on') s.weights[FDS.today()] = Math.round(start * 10) / 10;
      s.onboarded = true;
    });
    FDS.go('#/');
    FDS.toast('You’re all set. Start with today’s plan.');
  };
  FDS.act['d-onboard-skip'] = () => { FDS.sheet.close(); FDS.commit(s => { s.onboarded = true; }); };
})();
