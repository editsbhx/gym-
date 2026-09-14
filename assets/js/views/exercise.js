/* Exercise detail: how to do it, form, mistakes, breathing, weight check, alternative, history and next-session advice. */
(function () {
  const { D, L, esc } = FDS;
  const TYPE = { compound: 'Compound lift', isolation: 'Isolation exercise', core: 'Core exercise' };
  const HEAD = { first: 'First time', increase: 'Add a little weight', repeat: 'Repeat this weight', hold: 'Stay at this weight', keep: 'Same weight — beat your reps', deload: 'Deload week' };

  const setsText = (sets, ex) => {
    if (ex.bodyweight) return sets.map(s => s.r).join(' / ') + ' reps';
    const same = sets.every(s => s.w === sets[0].w);
    return same ? `${FDS.w(sets[0].w)} × ${sets.map(s => s.r).join(' / ')}` : sets.map(s => `${FDS.wVal(s.w)}×${s.r}`).join(', ');
  };
  FDS.setsText = setsText;

  const list = (items, ordered) => `<${ordered ? 'ol class="ol"' : 'ul class="ul"'}>${items.map(i => `<li>${esc(i)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`;
  const acc = (title, body, open) => `<details class="acc" ${open ? 'open' : ''}><summary>${title}</summary><div class="acc-body">${body}</div></details>`;

  function history(id, ex) {
    const rows = L.exerciseHistory(FDS.S.sessions, D.PLAN, id);
    if (!rows.length) {
      return `<div class="empty-state"><p>No sets logged yet. Your history appears after your first workout.</p></div>`;
    }
    const prev = rows[rows.length - 1];
    const allSets = rows.flatMap(r => r.sets);
    let best;
    if (ex.bodyweight) best = { w: null, r: Math.max(...allSets.map(s => s.r)) };
    else {
      const bw = Math.max(...allSets.map(s => s.w || 0));
      best = { w: bw, r: Math.max(...allSets.filter(s => (s.w || 0) === bw).map(s => s.r)) };
    }
    const pts = rows.map(r => ({ x: r.date, y: ex.bodyweight ? Math.max(...r.sets.map(s => s.r)) : FDS.wVal(r.top) }));
    return `<div class="stats">
        <div class="stat"><b>${ex.bodyweight ? '—' : FDS.w(prev.top)}</b><span>Previous weight · ${FDS.dateLabel(prev.date, 'short')}</span></div>
        <div class="stat"><b>${prev.sets.map(s => s.r).join(' / ')}</b><span>Previous reps</span></div>
        <div class="stat"><b>${ex.bodyweight ? 'Bodyweight' : FDS.w(best.w)}</b><span>Best weight</span></div>
        <div class="stat"><b>${best.r}</b><span>Best reps${ex.bodyweight ? '' : ' at best weight'}</span></div>
        <div class="stat"><b>${allSets.length}</b><span>Total sets logged</span></div>
        <div class="stat"><b>${rows.length}</b><span>Sessions</span></div>
      </div>
      <p class="label" style="margin:14px 0 4px">${ex.bodyweight ? 'Best reps per session' : 'Top working weight per session'}</p>
      ${FDS.chart.line({ height: 170, label: 'Strength progression', yFmt: v => FDS.n(v, 1), series: [{ points: pts, style: 'pts' }] })}
      <div class="table-wrap" style="margin-top:12px"><table class="table">
        <thead><tr><th>Date</th><th>Day</th><th>Sets</th></tr></thead>
        <tbody>${rows.slice(-10).reverse().map(r => `<tr>
          <td><a href="#/workout/${r.day}?date=${r.date}">${FDS.dateLabel(r.date, 'short')}</a></td>
          <td>${esc(FDS.planByKey(r.day).title)}${r.deload ? ' <span class="pill">Deload</span>' : ''}</td>
          <td>${esc(setsText(r.sets, ex))}</td></tr>`).join('')}</tbody>
      </table></div>`;
  }

  FDS.route('exercise', {
    title: ctx => (D.EXERCISES[ctx.args[0]] ? D.EXERCISES[ctx.args[0]].name : 'Exercise'),
    nav: 'plan', back: '#/plan',
    render(ctx) {
      const id = ctx.args[0], ex = D.EXERCISES[id], t = ctx.today;
      if (!ex) return `<div class="card empty-state"><p class="h3">Exercise not found</p><a class="btn btn-primary" href="#/plan">Back to the plan</a></div>`;
      const slots = [];
      D.PLAN.forEach(p => p.ex.forEach((s, i) => { if (s.id === id) slots.push({ p, s, i }); }));
      const color = slots.length ? slots[0].p.color : 'push';
      const rest = D.REST[ex.type];

      let next = null;
      const from = FDS.S.sessions[t] && FDS.S.sessions[t].completed ? 1 : 0;
      for (let o = from; o < 8 && !next; o++) {
        const d = L.addDays(t, o), p = FDS.planFor(d), i = p.ex.findIndex(s => s.id === id);
        if (i >= 0) next = { d, p, i };
      }
      const rec = next ? FDS.recommend(next.p.key, next.i, next.d) : null;

      return `<div class="stack-lg" data-day="${color}">
        <div class="grid md2">
          <figure class="ex-hero" style="margin:0"><img src="${ex.img}" alt="${esc(ex.name)} demonstration"></figure>
          <div class="stack">
            <div><p class="eyebrow">${TYPE[ex.type]}</p><h1 class="x-title">${esc(ex.name)}</h1></div>
            <div class="card card-tight"><div class="kv">
              <div><span>Target muscles</span><b>${esc(ex.muscles)}</b></div>
              <div><span>Equipment</span><b>${esc(ex.equipment)}</b></div>
              <div><span>Rest between sets</span><b>${rest.label}</b></div>
              <div><span>Effort</span><b>Stop with 2–3 reps left</b></div>
            </div></div>
            <div class="card card-tight"><p class="eyebrow" style="margin-bottom:4px">In your plan</p>
              <div class="list">${slots.map(({ p, s, i }) => `<div class="list-row" data-day="${p.color}"><span class="pill day">${p.day.slice(0, 3)}</span><span class="grow small"><b>${esc(p.title)}</b> · exercise ${i + 1}</span><b class="small num">${FDS.setsLabel(s)}</b></div>`).join('')}</div>
              ${slots.length > 1 && slots.some(x => x.s.min !== slots[0].s.min || x.s.max !== slots[0].s.max || x.s.sets !== slots[0].s.sets) ? '<p class="tiny muted" style="margin-top:6px">The sets and rep range differ between days. Follow the one for the day you’re training.</p>' : ''}
            </div>
          </div>
        </div>

        ${rec ? `<section class="coach"><p class="eyebrow">Next session · ${next.p.day} ${esc(next.p.title)} — ${HEAD[rec.kind]}</p><p>${esc(rec.text)}</p>${rec.stalled ? '<p class="small" style="margin-top:6px">No progress in 3 sessions. Check sleep, food and recovery. <a href="#/learn?topic=deload">A deload may help.</a></p>' : ''}</section>` : ''}

        <div class="grid md2" style="align-items:start">
          <section class="card">
            ${acc('How to do it', list(ex.how, true), true)}
            ${acc('Proper form', list(ex.form))}
            ${acc('Common mistakes', list(ex.mistakes))}
            ${acc('Breathing', `<p>${esc(ex.breathing)}</p>`)}
            ${acc('Is the weight right?', `${list(D.GENERIC_WEIGHT_CHECK)}${ex.weightNote ? `<p class="small"><b>Note:</b> ${esc(ex.weightNote)}</p>` : ''}
              <div class="note small">RIR 3 = you could do about 3 more clean reps. <button type="button" class="link" data-act="x-rir">What is RIR?</button></div>`)}
            ${acc('No equipment? Try this instead', `<p>${esc(ex.alt)}</p>`)}
            <p class="tiny muted" style="margin-top:10px">Stop if you feel sharp or unusual pain. Never trade form for heavier weight.</p>
          </section>
          <section class="card">
            <div class="card-head"><span class="eyebrow">Your history</span></div>
            ${history(id, ex)}
          </section>
        </div>
      </div>`;
    }
  });
  FDS.act['x-rir'] = () => FDS.open('openRirHelp', '#/learn?topic=rir');
})();
