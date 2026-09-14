/* Weekly summary, streaks and a monthly calendar of completed workouts. */
(function () {
  const { D, L, esc } = FDS;

  function calendar(month, ws, t) {
    const S = FDS.S;
    const [y, m] = month.split('-').map(Number);
    const first = `${month}-01`, count = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < L.dow(first); i++) cells.push('<span class="cal-cell out" aria-hidden="true"></span>');
    for (let dd = 1; dd <= count; dd++) {
      const d = `${month}-${String(dd).padStart(2, '0')}`;
      const s = S.sessions[d], p = FDS.planFor(d);
      const cls = ['cal-cell'];
      let label = FDS.dateLabel(d, 'long');
      if (s && s.completed) { cls.push('done'); label += `: ${FDS.planByKey(s.day).title} done`; }
      else if (p.ex.length && d < t && d >= S.profile.startDate) { cls.push('missed'); label += ': missed'; }
      if ((S.steps[d] || 0) >= FDS.stepGoal(d) || FDS.cardioMin(d) > 0) { cls.push('walk'); label += ', active'; }
      if (d === t) cls.push('today');
      if (d > t) cls.push('future');
      const dayAttr = s ? `data-day="${FDS.planByKey(s.day).color}"` : '';
      cells.push(s && s.completed
        ? `<a class="${cls.join(' ')}" ${dayAttr} href="#/workout/${s.day}?date=${d}" aria-label="${esc(label)}">${dd}</a>`
        : `<span class="${cls.join(' ')}" aria-label="${esc(label)}">${dd}</span>`);
    }
    const prev = new Date(y, m - 2, 1), next = new Date(y, m, 1);
    const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const canNext = key(next) <= t.slice(0, 7);
    return `<div class="row between" style="margin-bottom:10px">
        <a class="icon-btn" href="#/week?w=${ws}&m=${key(prev)}" aria-label="Previous month">${FDS.icon('back')}</a>
        <b>${FDS.MON[m - 1]} ${y}</b>
        ${canNext ? `<a class="icon-btn" href="#/week?w=${ws}&m=${key(next)}" aria-label="Next month">${FDS.icon('next')}</a>` : '<span class="icon-btn" aria-hidden="true"></span>'}
      </div>
      <div class="cal">${['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(x => `<span class="dow">${x}</span>`).join('')}${cells.join('')}</div>
      <div class="legend"><span><i style="background:var(--push)"></i>Workout done</span><span><i class="faint"></i>Missed (dashed)</span><span><i style="background:var(--rest);width:6px;height:6px;border-radius:50%"></i>Steps or cardio</span></div>`;
  }

  FDS.route('week', {
    title: 'Weekly summary', nav: 'week',
    render(ctx) {
      const S = FDS.S, t = ctx.today, cur = L.weekStart(t);
      let ws = FDS.validDate(ctx.query.get('w')) ? L.weekStart(ctx.query.get('w')) : cur;
      if (ws > cur) ws = cur;
      const we = L.addDays(ws, 6);
      const month = /^\d{4}-\d{2}$/.test(ctx.query.get('m') || '') ? ctx.query.get('m') : (ws === cur ? t : we).slice(0, 7);
      const sum = L.weekSummary(S, D.PLAN, D.EXERCISES, ws, t);
      const st = L.streaks(S.sessions, S.profile.startDate, t);
      const a = L.parse(ws), b = L.parse(we);
      const rangeLabel = a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${FDS.MON[b.getMonth()]}` : `${a.getDate()} ${FDS.MON[a.getMonth()]} – ${b.getDate()} ${FDS.MON[b.getMonth()]}`;

      let msg;
      if (sum.completed >= 5) msg = 'Every session done. A full week — well done.';
      else if (ws === cur && sum.completed >= sum.plannedSoFar) msg = sum.completed ? 'On track so far this week. Keep it going.' : 'New week. Today is a good day to start.';
      else if (sum.completed >= 3) msg = `${sum.completed} of 5 done. A solid week — keep the rhythm going.`;
      else if (sum.completed > 0) msg = 'A lighter week happens. Next week is a fresh start. No need to make up for it with extra cardio.';
      else msg = ws === cur ? 'No workouts yet this week. Pick up with the next session.' : 'No workouts logged this week. Pick up where you are. Every session counts.';

      const daily = D.PLAN.slice(0, 5).map((p, i) => {
        const d = L.addDays(ws, i), s = S.sessions[d];
        const status = s && s.completed ? `<span class="pill good">${FDS.icon('check')} Done</span>` : d === t ? '<span class="pill">Today</span>' : d > t ? '<span class="small muted">Upcoming</span>' : d < S.profile.startDate ? '<span class="small muted">Before start</span>' : '<span class="small muted">Not done</span>';
        return `<div class="list-row" data-day="${p.color}"><span class="pill day">${p.day.slice(0, 3)}</span><span class="grow"><b>${esc(s ? FDS.planByKey(s.day).title : p.title)}</b>${s ? `<br><span class="small muted">${FDS.sessionProgress(s).done} sets</span>` : ''}</span>${s ? `<a class="link" href="#/workout/${s.day}?date=${d}">View</a>` : ''}${status}</div>`;
      }).join('');

      const stat = (v, l, cls) => `<div class="stat"><b class="${cls || ''}">${v}</b><span>${l}</span></div>`;
      return `<div class="stack-lg">
        <div class="datebar">
          <a class="icon-btn" href="#/week?w=${L.addDays(ws, -7)}" aria-label="Previous week">${FDS.icon('back')}</a>
          <div class="grow center"><b>${ws === cur ? 'This week' : rangeLabel}</b><span class="tiny muted">${rangeLabel} · week ${FDS.week(ws)}</span></div>
          ${ws < cur ? `<a class="icon-btn" href="#/week?w=${L.addDays(ws, 7)}" aria-label="Next week">${FDS.icon('next')}</a>` : '<span class="icon-btn" aria-hidden="true"></span>'}
        </div>
        <section class="card">
          <div class="row between" style="align-items:center;gap:14px">
            <div class="grow"><p class="eyebrow">Workouts</p><p class="big-num">${sum.completed}<small>of ${sum.planned} planned</small></p><p class="small" style="margin-top:6px">${esc(msg)}</p></div>
            ${FDS.ring({ pct: sum.completed / 5, big: `${Math.round((sum.completed / 5) * 100)}%`, sub: 'of week', size: 96 })}
          </div>
        </section>
        <section class="card"><div class="stats s4">
          ${stat(sum.consistency != null ? sum.consistency + '%' : '—', 'Consistency so far')}
          ${stat(st.current, 'Current streak')}
          ${stat(st.longest, 'Longest streak')}
          ${stat(sum.totalSets, 'Total sets')}
          ${stat(FDS.n(sum.totalSteps), 'Total steps')}
          ${stat(sum.avgSteps != null ? FDS.n(sum.avgSteps) : '—', `Avg daily steps (${sum.stepDays} days)`)}
          ${stat(sum.cardioMin + ' min', 'Cardio')}
          ${stat(sum.avgW != null ? FDS.w(sum.avgW) : '—', 'Average weight')}
          ${stat(FDS.wDeltaText(sum.weightChange), 'Weight vs last week', FDS.deltaCls(sum.weightChange))}
          ${stat(sum.kcalAvg != null ? FDS.n(sum.kcalAvg) : '—', `Avg kcal (${sum.foodDays} days)`)}
          ${stat(sum.proteinAvg != null ? FDS.n(sum.proteinAvg) + ' g' : '—', 'Avg protein')}
          ${stat(sum.prs.length, 'New bests')}
        </div></section>
        <div class="grid md2">
          <section class="card"><div class="card-head"><span class="eyebrow">Daily workouts</span></div><div class="list">${daily}</div></section>
          <section class="card"><div class="card-head"><span class="eyebrow">${FDS.icon('trophy')} Exercise bests</span></div>
            ${sum.prs.length ? `<div class="list">${sum.prs.map(e => `<div class="list-row"><span class="grow"><b>${esc(D.EXERCISES[e.id].name)}</b><br><span class="small muted">${FDS.dateLabel(e.date, 'short')} · ${e.type === 'weight' ? 'heavier weight' : 'more reps'}</span></span><b class="num">${FDS.w(e.w)} × ${e.r}</b></div>`).join('')}</div>`
              : '<p class="small muted">No new bests this week. Matching last week’s numbers still counts as progress while you’re losing weight.</p>'}
          </section>
        </div>
        <section class="card"><div class="card-head"><span class="eyebrow">Calendar</span></div>${calendar(month, ws, t)}</section>
      </div>`;
    }
  });
})();
