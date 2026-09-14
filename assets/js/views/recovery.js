/* Recovery: daily check-in with simple advice, 14-day history, deload education and optional deload week. */
(function () {
  const { D, L, esc } = FDS;
  const SCALES = [
    ['sleepQ', 'Sleep quality', ['Very poor', 'Poor', 'OK', 'Good', 'Great']],
    ['energy', 'Energy', ['Very low', 'Low', 'OK', 'Good', 'High']],
    ['soreness', 'Muscle soreness', ['None', 'Mild', 'Moderate', 'Sore', 'Very sore']],
    ['readiness', 'Workout readiness', ['Not ready', 'Low', 'OK', 'Ready', 'Very ready']]
  ];

  function adviceHtml(date) {
    const rc = FDS.S.recovery[date];
    if (!rc || !Object.keys(rc).length) return '<p class="small muted">Answer a few questions to get a suggestion for today.</p>';
    const adv = L.recoveryAdvice(rc);
    return `<div class="note ${{ good: 'good', ok: 'warn', high: 'bad' }[adv.level]}">${esc(adv.text)}</div>
      <p class="tiny muted" style="margin-top:6px">If you have sharp pain, dizziness or chest symptoms, stop exercising and seek medical advice.</p>`;
  }

  function formHtml(date) {
    const rc = FDS.S.recovery[date] || {};
    return `<div class="stack d-rec" data-date="${date}">
      <div><div class="stepper-cap"><span>Sleep last night</span><span>hours</span></div>
        <div class="stepper"><button type="button" data-act="d-sleep" data-dir="-0.5" aria-label="Less sleep">−</button>
          <input type="number" inputmode="decimal" min="0" max="14" step="0.5" value="${rc.sleepH != null ? rc.sleepH : ''}" placeholder="7.5" data-input="d-sleep-in" aria-label="Sleep hours">
          <button type="button" data-act="d-sleep" data-dir="0.5" aria-label="More sleep">+</button></div></div>
      ${SCALES.map(([k, label, names]) => `<div class="d-scale"><div class="stepper-cap"><span>${label}</span><span data-d-scale="${k}">${rc[k] ? names[rc[k] - 1] : ''}</span></div>
        <div class="seg" role="group" aria-label="${label}">${names.map((n, i) => `<button type="button" data-act="d-rate" data-field="${k}" data-value="${i + 1}" aria-pressed="${rc[k] === i + 1}" aria-label="${label}: ${n}">${i + 1}</button>`).join('')}</div>
        <div class="row between tiny muted"><span>${names[0]}</span><span>${names[4]}</span></div></div>`).join('')}
      <div data-d-advice>${adviceHtml(date)}</div>
    </div>`;
  }
  FDS.recoveryFormHtml = formHtml;

  const rec = (el) => {
    const box = el.closest('.d-rec'), date = box.dataset.date;
    const r = FDS.S.recovery[date] = FDS.S.recovery[date] || {};
    return { box, date, r };
  };
  const afterChange = (box, date) => { box.querySelector('[data-d-advice]').innerHTML = adviceHtml(date); FDS.save(); };
  FDS.act['d-rate'] = el => {
    const { box, date, r } = rec(el), k = el.dataset.field, v = +el.dataset.value;
    r[k] = r[k] === v ? null : v;
    el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.value === r[k])));
    const names = SCALES.find(s => s[0] === k)[2];
    box.querySelector(`[data-d-scale="${k}"]`).textContent = r[k] ? names[r[k] - 1] : '';
    afterChange(box, date);
  };
  FDS.act['d-sleep'] = el => {
    const input = el.parentElement.querySelector('input');
    const base = input.value === '' ? 7 : Number(input.value);
    input.value = Math.max(0, Math.min(14, base + Number(el.dataset.dir)));
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  FDS.onInput['d-sleep-in'] = el => {
    const { box, date, r } = rec(el);
    const v = Number(el.value);
    r.sleepH = el.value === '' || isNaN(v) ? null : Math.max(0, Math.min(14, v));
    afterChange(box, date);
  };

  FDS.openRecoverySheet = date => {
    const t = FDS.today();
    date = FDS.validDate(date) && date <= t ? date : t;
    FDS.sheet.open({
      title: 'Recovery check-in',
      html: `${formHtml(date)}<button type="button" class="btn btn-primary btn-lg btn-block" style="margin-top:14px" data-act="sheet-close">Done</button>`,
      onClose: () => { FDS.saveNow(); FDS.refresh(); }
    });
  };

  FDS.act['d-deload-start'] = () => {
    FDS.commit(s => { s.deload = { start: FDS.today() }; });
    FDS.toast('Deload week started');
  };
  FDS.act['d-deload-end'] = () => {
    if (!confirm('End the deload week now?')) return;
    FDS.commit(s => { s.deload = null; });
    FDS.toast('Deload ended — back to normal training');
  };

  FDS.route('recovery', {
    title: 'Recovery', nav: 'recovery',
    render(ctx) {
      const S = FDS.S, t = ctx.today;
      const days = [...Array(14)].map((_, i) => L.addDays(t, -i));
      const logged = days.filter(d => S.recovery[d] && Object.values(S.recovery[d]).some(v => v != null));
      const avg = k => { const v = logged.map(d => S.recovery[d][k]).filter(x => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
      const badDays = days.slice(0, 7).filter(d => S.recovery[d] && L.recoveryAdvice(S.recovery[d]).flags.length >= 2).length;
      const stalled = [];
      D.PLAN.forEach(p => p.ex.forEach((slot, i) => { if (FDS.recommend(p.key, i, t).stalled) stalled.push(`${FDS.exName(slot)} (${p.title})`); }));
      const suggest = badDays >= 3 || stalled.length >= 3;
      const active = FDS.deloadActive(t);
      const daysLeft = active ? 6 - L.diffDays(S.deload.start, t) : 0;
      const pts = logged.slice().reverse().filter(d => S.recovery[d].sleepH != null).map(d => ({ x: d, y: S.recovery[d].sleepH }));

      return `<div class="stack-lg" data-day="rest">
        <div class="grid md2">
          <section class="card"><div class="card-head"><span class="eyebrow">Today’s check-in</span><span class="small muted">Saves as you tap</span></div>${formHtml(t)}</section>
          <div class="stack">
            <section class="card">
              <div class="card-head"><span class="eyebrow">Last 14 days</span><span class="small muted">${logged.length} check-ins</span></div>
              <div class="stats">
                <div class="stat"><b>${avg('sleepH') != null ? FDS.n(avg('sleepH'), 1) + ' h' : '—'}</b><span>Avg sleep</span></div>
                <div class="stat"><b>${avg('energy') != null ? FDS.n(avg('energy'), 1) + '/5' : '—'}</b><span>Avg energy</span></div>
                <div class="stat"><b>${avg('soreness') != null ? FDS.n(avg('soreness'), 1) + '/5' : '—'}</b><span>Avg soreness</span></div>
                <div class="stat"><b>${avg('readiness') != null ? FDS.n(avg('readiness'), 1) + '/5' : '—'}</b><span>Avg readiness</span></div>
              </div>
              <p class="label" style="margin:12px 0 4px">Sleep hours</p>
              ${FDS.chart.line({ height: 150, target: 7, label: 'Sleep hours', empty: 'No sleep logged yet', x0: days[13], x1: t, series: [{ points: pts, style: 'pts' }] })}
              <div class="legend"><span><i></i>Sleep</span><span><i class="tgt"></i>7 hours</span></div>
            </section>
          </div>
        </div>
        ${logged.length ? `<section class="card"><div class="card-head"><span class="eyebrow">Check-in history</span></div>
          <div class="table-wrap"><table class="table"><thead><tr><th>Date</th><th>Sleep</th><th>Quality</th><th>Energy</th><th>Soreness</th><th>Readiness</th><th>Status</th></tr></thead><tbody>
          ${logged.map(d => { const r = S.recovery[d], a = L.recoveryAdvice(r); const f = x => (x != null ? x : '—');
            return `<tr><td>${FDS.dateLabel(d, 'short')}</td><td>${r.sleepH != null ? r.sleepH + ' h' : '—'}</td><td>${f(r.sleepQ)}</td><td>${f(r.energy)}</td><td>${f(r.soreness)}</td><td>${f(r.readiness)}</td><td><span class="pill ${a.level === 'good' ? 'good' : 'warn'}">${a.level === 'good' ? 'Good' : a.level === 'ok' ? 'OK' : 'Tired'}</span></td></tr>`; }).join('')}
          </tbody></table></div></section>` : ''}

        <div class="grid md2">
          <section class="card">
            <div class="card-head"><span class="eyebrow">Deload</span>${active ? `<span class="pill warn">Active · ${daysLeft + 1} day${daysLeft ? 's' : ''} left</span>` : ''}</div>
            <p class="small">A deload is an easier week that lets fatigue drop so you can keep progressing. It can help when you notice:</p>
            <ul class="check-list small" style="margin:8px 0">
              <li>Persistent fatigue</li><li>Declining performance</li><li>Poor recovery</li><li>Excessive soreness</li><li>Poor sleep</li><li>Several workouts without improvement</li>
            </ul>
            <p class="small"><b>Suggested deload:</b> reduce training volume and/or intensity by about 20–30% for around one week. You don’t need one every fixed number of weeks. Use it when your body asks.</p>
            <p class="small muted" style="margin-top:6px">During a deload, the workout logger uses one fewer set per exercise, suggests about 80% of your usual weights, and pauses progression.</p>
            <div style="margin-top:12px">${active
              ? '<button type="button" class="btn btn-block" data-act="d-deload-end">End deload</button>'
              : '<button type="button" class="btn btn-primary btn-block" data-act="d-deload-start">Start a deload week</button>'}</div>
          </section>
          <section class="card">
            <div class="card-head"><span class="eyebrow">Signals from your logs</span></div>
            <div class="stats">
              <div class="stat"><b>${badDays}/7</b><span>High-fatigue days this week</span></div>
              <div class="stat"><b>${stalled.length}</b><span>Lifts with no progress in 3 sessions</span></div>
            </div>
            ${suggest && !active ? '<div class="note warn small" style="margin-top:10px"><strong>A deload might help.</strong> This is a suggestion, not a rule. If you feel fine and are still progressing, keep training normally.</div>'
              : `<p class="small muted" style="margin-top:10px">${active ? 'Deload in progress. Keep sessions easy and focus on sleep and food.' : 'No strong signs you need a deload right now.'}</p>`}
            ${stalled.length ? `<ul class="ul small" style="margin-top:8px">${stalled.slice(0, 6).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
          </section>
        </div>
      </div>`;
    }
  });
})();
