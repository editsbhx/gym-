/* Today: today's workout first, then steps, weight, calories, cardio, recovery, the week, weight trend and goal. */
(function () {
  const { D, L, esc } = FDS;

  FDS.act['a-steps'] = () => FDS.open('openStepsSheet', '#/activity', FDS.today());
  FDS.act['a-weight'] = () => FDS.open('openWeightSheet', '#/body', FDS.today());
  FDS.act['a-cardio'] = () => FDS.open('openCardioSheet', '#/activity?tab=cardio', FDS.today());
  FDS.act['a-recovery'] = () => FDS.open('openRecoverySheet', '#/recovery', FDS.today());
  FDS.act['a-food'] = () => FDS.go('#/food');

  function banner(t) {
    const S = FDS.S, plan = FDS.planFor(t), wk = FDS.week(t);
    if (!plan.ex.length) {
      const min = FDS.cardioMin(t);
      return `<section class="day-banner" data-day="rest">
        <p class="eyebrow">${plan.day} · Week ${wk}</p>
        <h2>${esc(plan.title)}</h2>
        <p class="focus">${plan.kind === 'walk' ? 'Brisk walk day. No weight training.' : 'Rest and easy movement. No weight training.'}</p>
        <ul class="a-items">${plan.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
        <div class="a-banner-actions">
          <button type="button" class="btn btn-lg btn-on" data-act="a-cardio">${min ? `${FDS.icon('check')} Walk logged · ${min} min` : `${FDS.icon('walk')} Log your walk`}</button>
          <button type="button" class="btn btn-lg btn-line" data-act="a-steps">Log steps</button>
        </div>
        <p class="small a-dim">Missed a session this week? <a href="#/workout">See make-up options</a></p>
      </section>`;
    }
    const sess = S.sessions[t];
    const p = sess ? FDS.planByKey(sess.day) : plan;
    const prog = FDS.sessionProgress(sess);
    const total = prog.total || p.ex.reduce((a, s) => a + s.sets, 0);
    const cta = !sess ? `${FDS.icon('play')} Start today’s workout`
      : !sess.completed ? `${FDS.icon('play')} Continue workout · ${prog.done}/${total} sets`
      : `${FDS.icon('check')} Workout complete — view summary`;
    return `<section class="day-banner" data-day="${p.color}">
      <span class="big-digit" aria-hidden="true">${p.dow + 1}</span>
      <div class="row-wrap"><p class="eyebrow">${plan.day} · Week ${wk} · Day ${p.dow + 1} of 5</p>
        ${FDS.deloadActive(t) ? '<span class="pill a-pill-on">Deload week</span>' : ''}
        ${sess && sess.day !== plan.key ? '<span class="pill a-pill-on">Make-up session</span>' : ''}</div>
      <h2>${esc(p.title)}</h2>
      <p class="focus">${esc(p.focus)}</p>
      <div class="a-banner-prog">${FDS.bar(prog.pct)}<span class="small num">${prog.done}/${total} sets</span></div>
      <a class="btn btn-lg btn-on a-cta" href="#/workout">${cta}</a>
      ${!sess ? '<p class="small a-dim">Warm up first: 5–8 min easy cardio, then 3–5 min of dynamic moves.</p>' : ''}
      <div class="ex-strip">${p.ex.map((slot, i) => {
        const done = sess && sess.ex[i] && sess.ex[i].done;
        return `<a href="#/exercise/${slot.id}" class="${done ? 'done' : ''}"><b>${String(i + 1).padStart(2, '0')}${done ? ' ✓' : ''}</b>${esc(FDS.exName(slot))}<span class="a-strip-sets">${FDS.setsLabel(slot)}</span></a>`;
      }).join('')}</div>
    </section>`;
  }

  function statCards(t) {
    const S = FDS.S;
    const steps = S.steps[t], goal = FDS.stepGoal(t);
    const ramped = S.profile.stepRamp && goal < S.profile.stepGoal;
    const ws = L.weightStats(S.weights, t);
    const tot = L.dayFoodTotals(S.food[t]), nt = FDS.nutritionTargets();
    const left = nt.kcal - tot.kcal;
    const rec = FDS.cardioRec(t), cmin = FDS.cardioMin(t);
    const recLabel = { recommended: 'Suggested', optional: 'Optional', light: 'Keep it light', done: 'Done for today' }[rec.level];
    return `
    <button type="button" class="card a-stat" data-day="rest" data-act="a-steps">
      <span class="eyebrow">${FDS.icon('walk')} Steps</span>
      <span class="big-num">${steps != null ? FDS.n(steps) : '—'}</span>
      ${FDS.bar((steps || 0) / goal)}
      <span class="small">${steps == null ? 'Tap to log steps' : steps >= goal ? '<b>Target hit</b>' : `${FDS.n(goal - steps)} to go · ${Math.round((steps / goal) * 100)}%`}</span>
      <span class="tiny muted">${ramped ? `Week ${FDS.week(t)} target` : 'Target'}: ${FDS.n(goal)}</span>
    </button>
    <button type="button" class="card a-stat" data-day="legs" data-act="a-weight">
      <span class="eyebrow">${FDS.icon('body')} Weight</span>
      <span class="big-num">${ws.latest ? `${FDS.wVal(ws.latest.kg)}<small>${FDS.unit()}</small>` : '—'}</span>
      <span class="small">${ws.todayKg != null ? 'Logged today' : ws.latest ? `Last: ${FDS.dateLabel(ws.latest.date, 'short')} · <u>log today</u>` : 'Log your first weigh-in'}</span>
      <span class="tiny muted">${ws.avg7 != null ? `7-day avg ${FDS.w(ws.avg7)}` : ''}</span>
      ${ws.weeklyChange != null ? `<span class="tiny ${FDS.deltaCls(ws.weeklyChange)}">${FDS.wDeltaText(ws.weeklyChange)} vs last week</span>` : ''}
    </button>
    <button type="button" class="card a-stat" data-day="food" data-act="a-food">
      <span class="eyebrow">${FDS.icon('food')} Calories</span>
      <span class="big-num">${FDS.n(tot.kcal)}<small>/ ${FDS.n(nt.kcal)}</small></span>
      ${FDS.bar(tot.kcal / nt.kcal)}
      <span class="small">${!tot.kcal ? 'Tap to log a meal' : left >= 0 ? `${FDS.n(left)} kcal left` : `${FDS.n(-left)} kcal over`}</span>
      <span class="tiny muted">Protein ${Math.round(tot.p)} / ${nt.protein} g</span>
    </button>
    <button type="button" class="card a-stat" data-day="combo" data-act="a-cardio">
      <span class="eyebrow">${FDS.icon('activity')} Cardio</span>
      <span class="big-num">${cmin}<small>min</small></span>
      <span class="small">${esc(rec.headline)}</span>
      <span class="tiny muted">${recLabel} · depends on your steps</span>
    </button>`;
  }

  function recoveryCard(t) {
    const S = FDS.S, rc = S.recovery[t];
    if (!rc) {
      return `<section class="card" data-day="rest">
        <div class="card-head"><span class="eyebrow">Recovery check-in</span>${FDS.icon('recovery')}</div>
        <p class="h3">How did you sleep?</p>
        <p class="small muted" style="margin:4px 0 12px">A few quick taps: sleep, energy, soreness and readiness. You’ll get a simple suggestion for today.</p>
        <button type="button" class="btn btn-primary btn-block" data-act="a-recovery">Start check-in</button>
      </section>`;
    }
    const adv = FDS.recoveryFor(t);
    const cls = { good: 'good', ok: 'warn', high: 'bad' }[adv.level];
    const v = x => (x == null ? '—' : `${x}/5`);
    return `<section class="card" data-day="rest">
      <div class="card-head"><span class="eyebrow">Recovery today</span><button type="button" class="btn btn-sm" data-act="a-recovery">Update</button></div>
      <div class="note ${cls}">${esc(adv.text)}</div>
      <div class="stats" style="margin-top:10px">
        <div class="stat"><b>${rc.sleepH != null ? rc.sleepH + ' h' : '—'}</b><span>Sleep</span></div>
        <div class="stat"><b>${v(rc.energy)}</b><span>Energy</span></div>
        <div class="stat"><b>${v(rc.soreness)}</b><span>Soreness</span></div>
        <div class="stat"><b>${v(rc.readiness)}</b><span>Readiness</span></div>
      </div>
      <p style="margin-top:10px"><a class="link" href="#/recovery">Recovery and deload</a></p>
    </section>`;
  }

  function weekCard(t) {
    const S = FDS.S, ws = L.weekStart(t);
    const sum = L.weekSummary(S, D.PLAN, D.EXERCISES, ws, t);
    const st = L.streaks(S.sessions, S.profile.startDate, t);
    let missed = 0;
    const dots = D.PLAN.map((p, i) => {
      const d = L.addDays(ws, i), s = S.sessions[d];
      let cls = '', inner = '', state = 'upcoming';
      if (p.ex.length) {
        if (s && s.completed) { cls = 'done'; inner = '✓'; state = 'done'; }
        else if (d < t && d >= S.profile.startDate) { cls = 'missed'; missed++; state = 'missed'; }
      } else {
        cls = 'rest';
        state = 'rest day';
        if ((S.steps[d] || 0) >= FDS.stepGoal(d) || FDS.cardioMin(d) > 0) { cls += ' done'; inner = '✓'; state = 'active'; }
      }
      if (d === t) cls += ' today';
      const color = s ? FDS.planByKey(s.day).color : p.color;
      return `<div data-day="${color}"><i class="${cls}" title="${p.day}: ${state}">${inner}</i><span aria-hidden="true">${p.day[0]}</span><span class="sr">${p.day}: ${state}</span></div>`;
    }).join('');
    let msg;
    if (sum.completed >= 5) msg = 'All five sessions done this week. That’s what consistency looks like.';
    else if (st.current >= 3) msg = `${st.current} workouts in a row. Keep showing up.`;
    else if (missed) msg = 'Missed one — that’s normal. Today is what counts. No need to make it up with extra cardio.';
    else if (sum.completed) msg = `${sum.completed} done this week. Nice and steady.`;
    else msg = 'A fresh week. Start with today’s session.';
    return `<section class="card">
      <div class="card-head"><span class="eyebrow">This week</span><a class="link" href="#/week">Weekly summary</a></div>
      <div class="week-dots">${dots}</div>
      <div class="stats" style="margin-top:14px">
        <div class="stat"><b>${sum.completed}/5</b><span>Workouts</span></div>
        <div class="stat"><b>${sum.consistency != null ? sum.consistency + '%' : '—'}</b><span>Completion so far</span></div>
        <div class="stat"><b>${st.current}</b><span>Current streak</span></div>
        <div class="stat"><b>${st.longest}</b><span>Longest streak</span></div>
      </div>
      <p class="small" style="margin-top:10px">${esc(msg)}</p>
    </section>`;
  }

  function trendCard(t) {
    const S = FDS.S, x0 = L.addDays(t, -27);
    const series = L.weightSeries(S.weights);
    const pts = series.filter(e => e.date >= x0);
    const avg = L.rollingAverage(series, 7).filter(e => e.date >= x0);
    const body = pts.length
      ? `${FDS.chart.line({ height: 170, x0, x1: t, label: 'Weight over the last 4 weeks',
          series: [{ points: pts.map(e => ({ x: e.date, y: FDS.wVal(e.kg) })), style: 'dots' }, { points: avg.map(e => ({ x: e.date, y: FDS.wVal(e.kg) })), style: 'ln' }] })}
        <div class="legend"><span><i class="faint"></i>Daily weigh-in</span><span><i></i>7-day average</span></div>
        <p class="small muted" style="margin-top:8px">Daily weight moves with water, salt and food. The average line shows the real trend.</p>`
      : `<div class="empty-state"><p>No weigh-ins in the last 4 weeks.</p><button type="button" class="btn btn-primary" data-act="a-weight">Log a weigh-in</button></div>`;
    return `<section class="card" data-day="legs">
      <div class="card-head"><span class="eyebrow">Weight trend · 4 weeks</span><a class="link" href="#/body">Details</a></div>
      ${body}
    </section>`;
  }

  function goalCard(t) {
    const S = FDS.S, P = S.profile, cur = FDS.currentKg();
    const pct = Math.max(0, Math.min(1, (P.startKg - cur) / (P.startKg - P.goalKg || 1)));
    const ws = L.weightStats(S.weights, t);
    const lost = cur - P.startKg;
    return `<section class="card" data-day="legs">
      <div class="card-head"><span class="eyebrow">Your goal</span><a class="link" href="#/settings">Edit</a></div>
      <div class="row between" style="align-items:flex-end">
        <div><span class="big-num">${FDS.wVal(cur)}<small>${FDS.unit()} now</small></span><p class="small muted">Goal ${FDS.w(P.goalKg)}</p></div>
        <b class="num" style="font-size:22px">${Math.round(pct * 100)}%</b>
      </div>
      <div style="margin:10px 0 12px">${FDS.bar(pct)}</div>
      <div class="stats">
        <div class="stat"><b>${FDS.w(P.startKg)}</b><span>Starting weight</span></div>
        <div class="stat"><b>${FDS.w(Math.max(0, cur - P.goalKg))}</b><span>Remaining</span></div>
        <div class="stat"><b class="${FDS.deltaCls(lost)}">${FDS.wDeltaText(lost)}</b><span>Change since start</span></div>
        <div class="stat"><b class="${FDS.deltaCls(ws.weeklyAvgChange)}">${ws.weeklyAvgChange == null ? 'Needs 2+ wks' : FDS.wDeltaText(ws.weeklyAvgChange)}</b><span>Weekly average change</span></div>
      </div>
      <div class="kv" style="margin-top:10px">
        <div><span>Start date</span><b>${FDS.dateLabel(P.startDate, 'year')}</b></div>
        <div><span>Your target date</span><b>${FDS.dateLabel(P.targetDate, 'year')}</b></div>
        <div><span>Height · age</span><b>${FDS.heightText()} · ${P.age}</b></div>
        <div><span>Steps · training</span><b>${FDS.n(P.stepGoal)}/day · ${P.trainDays} days/week</b></div>
      </div>
      <p class="small" style="margin-top:10px"><b>Primary goal:</b> ${esc(P.primaryGoal)}</p>
      <p class="tiny muted" style="margin-top:4px">The target date is a guide, not a promise. Progress speed varies from person to person.</p>
    </section>`;
  }

  FDS.route('today', {
    title: 'Today', nav: 'today',
    render(ctx) {
      const t = ctx.today;
      return `<p class="eyebrow a-date">${FDS.dateLabel(t, 'long')}</p>
      <div class="stack-lg">
        ${FDS.demo ? '<div class="note small">You’re viewing demo data. Nothing here touches your real data. <a href="./">Exit demo</a></div>' : ''}
        ${banner(t)}
        <div class="grid g2 md4">${statCards(t)}</div>
        <div class="grid md2">${recoveryCard(t)}${weekCard(t)}${trendCard(t)}${goalCard(t)}</div>
      </div>
      <p class="footer-note"><strong>Train safely.</strong> Stop an exercise if you feel sharp or unusual pain. Don’t sacrifice form to lift heavier, and don’t try to make up missed workouts with lots of extra cardio. If you feel dizzy or faint, have unusual chest symptoms or severe pain, stop and get medical help. <a href="#/learn?topic=safety">More on safety</a></p>`;
    }
  });
})();
