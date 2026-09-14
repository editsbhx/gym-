/* Weekly plan: all seven days, exercises with sets, reps and rest. */
(function () {
  const { D, esc } = FDS;

  function dayCard(p, t) {
    const todayKey = FDS.planFor(t).key;
    const isToday = p.key === todayKey;
    const d = FDS.L.addDays(FDS.L.weekStart(t), p.dow);
    const s = FDS.S.sessions[d];
    const status = s && s.completed ? '<span class="pill good">Done</span>' : isToday ? '<span class="pill day">Today</span>' : '';
    const head = `<div class="row between" style="align-items:flex-start;margin-bottom:10px">
        <div><p class="eyebrow">${p.day}</p><h3>${esc(p.title)}</h3><p class="small muted">${esc(p.focus)}</p></div>${status}</div>`;
    if (!p.ex.length) {
      return `<article class="card plan-day ${isToday ? 'is-today' : ''}" data-day="rest">${head}
        <ul class="check-list">${p.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
        ${p.kind === 'walk' ? '<p class="small muted" style="margin-top:10px">The walk’s steps count toward your daily total. It isn’t an extra 10,000.</p>' : ''}
      </article>`;
    }
    return `<article class="card plan-day ${isToday ? 'is-today' : ''}" data-day="${p.color}">${head}
      <div class="list">${p.ex.map((slot, i) => {
        const ex = D.EXERCISES[slot.id];
        return `<a class="list-row" href="#/exercise/${slot.id}">
          <span class="idx">${i + 1}</span>
          <img class="thumb" src="${slot.img}" alt="" loading="lazy">
          <span class="grow"><span class="h3 p-name">${esc(FDS.exName(slot))}</span><br><span class="small muted">${FDS.setsLabel(slot)} · rest ${D.REST[ex.type].label}</span></span>
          ${FDS.icon('next')}</a>`;
      }).join('')}</div>
      <a class="btn btn-day btn-block" style="margin-top:12px" href="${isToday ? '#/workout' : '#/workout/' + p.key}">${FDS.icon('play')} ${isToday ? 'Start today’s workout' : 'Do this workout today'}</a>
    </article>`;
  }

  FDS.route('plan', {
    title: 'Weekly plan', nav: 'plan',
    render(ctx) {
      const t = ctx.today;
      return `<div class="page-head"><div><p class="eyebrow">Week ${FDS.week(t)} of your plan</p><h1>Five day split</h1></div>
        ${FDS.deloadActive(t) ? '<span class="pill warn">Deload week active</span>' : ''}</div>
      <section class="card" style="margin-bottom:14px">
        <p class="eyebrow" style="margin-bottom:8px">How this week works</p>
        <ul class="ul small">
          <li><b>5 training days</b>, then an active recovery Saturday and a rest Sunday.</li>
          <li><b>Warm up before every workout</b>: easy cardio, dynamic moves, then 2–3 light warm-up sets.</li>
          <li><b>Most sets finish with 2–3 reps left in the tank</b> (RIR 2–3), not to failure.</li>
          <li><b>Double progression:</b> hit the top of the rep range on every set, then add a little weight. <a href="#/learn?topic=overload">How it works</a></li>
          <li><b>Cardio depends on your steps.</b> It’s optional, not a punishment. <a href="#/activity?tab=cardio">Cardio guide</a></li>
        </ul>
      </section>
      <div class="grid md2 lg3">${D.PLAN.map(p => dayCard(p, t)).join('')}</div>`;
    }
  });
})();
