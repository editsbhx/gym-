/* Gym workout logger: warm-up → exercises (weight / reps / RIR per set, rest timer, double progression) → finish summary. */
(function () {
  const { D, L, esc } = FDS;
  const HEAD = { first: 'First time', increase: 'Add a little weight', repeat: 'Repeat this weight', hold: 'Stay at this weight', keep: 'Same weight — beat your reps', deload: 'Deload week' };

  function resolve(ctx) {
    ctx = ctx || FDS.ctx();
    const today = FDS.today();
    const date = FDS.queryDate(ctx);
    const saved = FDS.S.sessions[date];
    let dayKey = ctx.args[0] || (saved && saved.day) || null;
    if (!dayKey && L.dow(date) <= 4) dayKey = FDS.planFor(date).key;
    const plan = dayKey ? FDS.planByKey(dayKey) : null;
    const sess = saved && plan && saved.day === dayKey ? saved : null;
    return { date, today, isPast: date !== today, dayKey, plan: plan && plan.ex.length ? plan : null, sess, other: saved && !sess ? saved : null };
  }

  function ensure(r) {
    if (r.sess) return r.sess;
    if (r.other && FDS.sessionProgress(r.other).done > 0) {
      const op = FDS.planByKey(r.other.day);
      if (!confirm(`You already logged sets for ${op.title} on this day. Replace them with ${r.plan.title}?`)) return null;
    }
    const s = FDS.newSession(r.date, r.dayKey);
    FDS.S.sessions[r.date] = s;
    r.sess = s;
    return s;
  }

  const nextStage = (s, i) => {
    for (let k = i + 1; k < s.ex.length; k++) if (!s.ex[k].done) return k;
    for (let k = 0; k < s.ex.length; k++) if (!s.ex[k].done) return k;
    return 'finish';
  };
  const setsText = (sets, ex) => FDS.setsText(sets, ex);
  const fmt1 = v => Math.round(v * 10) / 10;

  // What to do next time, based on the sets just logged.
  function nextTimeText(slot, ex, sets) {
    const unit = FDS.unit();
    const p = L.progression({ slot, ex, last: sets, unit });
    const reps = sets.map(s => s.r).join(' / ');
    if (ex.bodyweight) return p.kind === 'increase' ? 'You hit every rep. Next time: slow each rep down and pause at full reach.' : `Next time: try to beat ${reps}.`;
    switch (p.kind) {
      case 'increase': return `You hit ${slot.max} on every set. Next time: try ${FDS.w(p.weightKg)} (+${L.incFor(ex, unit)} ${unit}). Your reps will drop a little — that’s expected.`;
      case 'repeat': return `You reached ${slot.max} on every set, but went to failure. Next time: repeat ${FDS.w(p.weightKg)} and aim for ${slot.max} with 1–2 reps left.`;
      case 'hold': return `Some sets fell below ${slot.min} reps. Next time: stay at ${FDS.w(p.weightKg)} (or drop one step) and aim for ${slot.min}+ clean reps.`;
      default: return `Next time: same weight (${FDS.w(p.weightKg)}) and try to beat ${reps}.`;
    }
  }

  // ---------- pieces ----------
  function navChips(r, stage) {
    const s = r.sess;
    const chip = (to, label, done, aria) => `<button type="button" data-act="b-go" data-to="${to}" class="${done ? 'done' : ''}" ${String(stage) === String(to) ? 'aria-current="step"' : ''} aria-label="${esc(aria)}">${label}</button>`;
    return `<nav class="wk-nav" aria-label="Workout steps">${chip(-1, 'Warm-up', s && s.warmupDone, 'Warm-up')}${r.plan.ex.map((slot, i) => chip(i, i + 1, s && s.ex[i].done, FDS.exName(slot))).join('')}${chip('finish', 'Finish', s && s.completed, 'Finish')}</nav>`;
  }

  function sideList(r, stage) {
    const s = r.sess;
    const item = (to, img, title, sub, done) => `<button type="button" data-act="b-go" data-to="${to}" class="${done ? 'done' : ''}" ${String(stage) === String(to) ? 'aria-current="step"' : ''}>
      ${img ? `<img class="thumb" src="${img}" alt="">` : `<span class="thumb b-thumb-ico">${FDS.icon(to === -1 ? 'flame' : 'trophy')}</span>`}
      <span class="grow"><span class="h3">${esc(title)}</span><br><span class="tiny muted">${esc(sub)}</span></span></button>`;
    return `<aside class="wk-list" aria-label="Exercises">
      ${item(-1, null, 'Warm-up', s && s.warmupDone ? 'Done' : '10–15 min', s && s.warmupDone)}
      ${r.plan.ex.map((slot, i) => {
        const log = s && s.ex[i];
        const n = log ? log.sets.filter(x => x.done).length : 0;
        return item(i, slot.img, FDS.exName(slot), `${n}/${log ? log.sets.length : slot.sets} sets · ${FDS.repRange(slot)} reps`, log && log.done);
      }).join('')}
      ${item('finish', null, 'Finish', s && s.completed ? 'Completed' : 'Summary', s && s.completed)}
    </aside>`;
  }

  const block = (warm, key, time, title, body) => `<section class="b-warm ${warm[key] ? 'is-done' : ''}">
    <button type="button" class="b-warm-head" data-act="b-warm" data-key="${key}" aria-pressed="${!!warm[key]}">
      <span class="b-check">${warm[key] ? FDS.icon('check') : ''}</span>
      <span class="grow"><span class="eyebrow">${time}</span><span class="h3">${title}</span></span>
    </button><div class="b-warm-body">${body}</div></section>`;

  function warmStage(r) {
    const s = r.sess, warm = (s && s.warm) || {}, plan = r.plan;
    const fi = Math.max(0, plan.ex.findIndex(x => D.EXERCISES[x.id].type === 'compound'));
    const fSlot = plan.ex[fi], fEx = D.EXERCISES[fSlot.id];
    const rec = FDS.recommend(plan.key, fi, r.date);
    const workKg = rec.weightKg || (rec.last && rec.last.sets[0].w) || null;
    const unit = FDS.unit(), inc = L.incFor(fEx, unit) || 1;
    const ramp = [[0.5, 10], [0.7, 6], [0.85, 3]].map(([p, reps], i) => {
      const w = workKg ? `${fmt1(L.round(L.toDisplayWeight(workKg, unit) * p, inc))} ${unit}` : `~${p * 100}% of working weight`;
      return `<div><span>Warm-up set ${i + 1}</span><span>${w} × ${reps}</span></div>`;
    }).join('');
    const cl = items => `<ul class="check-list">${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`;
    return `<div class="card stack">
      <div><h2 class="section-title">Warm up first</h2><p class="small muted">About 10–15 minutes. It makes your working sets safer and stronger.</p></div>
      ${block(warm, 'general', '5–8 minutes', 'General warm-up', `${cl(D.WARMUP.general)}`)}
      ${block(warm, 'dynamic', '3–5 minutes', 'Dynamic warm-up', `${cl(D.WARMUP.dynamic[plan.warm])}`)}
      ${block(warm, 'sets', '2–3 sets', 'Warm-up sets', `<p>Before <b>${esc(FDS.exName(fSlot))}</b>${workKg ? ` (working weight ≈ ${FDS.w(workKg)})` : ''}:</p>
        <div class="warm-sets">${ramp}</div>
        ${workKg ? '' : '<p class="small">Don’t know your working weight yet? Start very light and add a little each warm-up set.</p>'}
        <p class="small muted">${esc(D.WARMUP.setsNote)}</p>`)}
      <p class="tiny muted">Stop any exercise that causes sharp or unusual pain.</p>
      <button type="button" class="btn btn-lg btn-day btn-block" data-act="b-warm-done">${FDS.icon('play')} Warm-up done — start exercise 1</button>
      <button type="button" class="btn btn-ghost btn-block" data-act="b-warm-done" data-skip="1">Skip warm-up</button>
    </div>`;
  }

  const stepper = (field, cap, capR, value, placeholder, i, j, mode, step) => `<div>
    <div class="stepper-cap"><span>${cap}</span><span>${esc(capR)}</span></div>
    <div class="stepper">
      <button type="button" data-act="b-step" data-dir="-1" data-stepv="${step}" aria-label="Less ${cap.toLowerCase()}">−</button>
      <input type="number" inputmode="${mode}" step="any" min="0" data-input="b-set" data-field="${field}" data-i="${i}" data-s="${j}" value="${value == null ? '' : value}" placeholder="${placeholder}" aria-label="${cap}">
      <button type="button" data-act="b-step" data-dir="1" data-stepv="${step}" aria-label="More ${cap.toLowerCase()}">+</button>
    </div></div>`;

  function exStage(r, i) {
    const s = r.sess, slot = r.plan.ex[i], ex = D.EXERCISES[slot.id], log = s.ex[i];
    const unit = FDS.unit(), inc = L.incFor(ex, unit), name = FDS.exName(slot), range = FDS.repRange(slot), each = slot.each ? ' each side' : '';
    const rec = FDS.recommend(r.plan.key, i, r.date);
    const lastSets = rec.last ? rec.last.sets : [];
    const active = log.sets.findIndex(x => !x.done);
    const rest = FDS.restFor(slot.id);

    const setsHtml = log.sets.map((st, j) => {
      if (st.done) {
        return `<div class="set done"><div class="set-sum"><span class="set-no">${j + 1}</span>
          <span class="grow"><b>${ex.bodyweight ? '' : FDS.w(st.w) + ' × '}${st.r} reps${each}</b>${st.rir != null ? `<span class="muted small"> · RIR ${st.rir >= 4 ? '4+' : st.rir}</span>` : ''}</span>
          <button type="button" class="btn btn-sm btn-ghost" data-act="b-edit" data-i="${i}" data-s="${j}">Edit</button></div></div>`;
      }
      if (j !== active) return `<div class="set"><div class="set-sum"><span class="set-no">${j + 1}</span><span class="grow muted">Set ${j + 1} · target ${range} reps${each}</span></div></div>`;
      const prevW = j > 0 && log.sets[j - 1].w != null ? log.sets[j - 1].w : null;
      const wKg = st.w != null ? st.w : prevW != null ? prevW : rec.weightKg;
      const ls = lastSets[j];
      return `<div class="set active"><div class="set-sum"><span class="set-no">${j + 1}</span>
          <span class="grow"><b>Set ${j + 1} of ${log.sets.length}</b><span class="muted small"> · ${range} reps${each}</span></span>
          ${ls ? `<span class="tiny muted">Last: ${ex.bodyweight || ls.w == null ? '' : FDS.wVal(ls.w) + '×'}${ls.r}</span>` : ''}</div>
        <div class="set-body">
          <div class="pair ${ex.bodyweight ? 'b-single' : ''}">
            ${ex.bodyweight ? '' : stepper('w', 'Weight', `${unit}${ex.perHand ? ' · each hand' : ''}`, FDS.wVal(wKg), '', i, j, 'decimal', inc)}
            ${stepper('r', slot.each ? 'Reps per side' : 'Reps', `target ${range}`, st.r, ls ? ls.r : slot.min, i, j, 'numeric', 1)}
          </div>
          <div>
            <div class="stepper-cap"><span>RIR · reps left in the tank</span><button type="button" class="link" data-act="b-rir-help">What’s this?</button></div>
            <div class="seg b-rir" role="group" aria-label="Reps in reserve">${[0, 1, 2, 3, 4].map(v => `<button type="button" data-act="b-rir" data-i="${i}" data-s="${j}" data-value="${v}" aria-pressed="${st.rir === v}">${v === 4 ? '4+' : v}</button>`).join('')}</div>
            <p class="tiny muted" style="margin-top:6px">RIR 3 = you could do about 3 more clean reps. Aim for 2–3.</p>
          </div>
          <p class="b-err" role="alert" hidden></p>
          <button type="button" class="btn btn-lg btn-day btn-block" data-act="b-complete-set" data-i="${i}" data-s="${j}">${FDS.icon('check')} Complete set ${j + 1}</button>
        </div></div>`;
    }).join('');

    const lastTxt = rec.last ? `Last time (${FDS.dateLabel(rec.last.date, 'short')}${rec.last.sameSlot ? '' : ', another day'}): ${setsText(rec.last.sets, ex)}` : '';
    const coach = log.done
      ? `<div class="coach"><p class="eyebrow">Next time</p><p>${esc(L.doneSets(log).length ? nextTimeText(slot, ex, L.doneSets(log)) : 'No sets logged for this exercise today.')}</p></div>`
      : `<div class="coach"><p class="eyebrow">${HEAD[rec.kind]}</p><p>${esc(rec.text)}</p>${lastTxt ? `<p class="small muted" style="margin-top:4px">${esc(lastTxt)}</p>` : ''}</div>`;
    const failed = log.sets.some(x => x.done && x.rir === 0);
    const allDone = active === -1;

    return `<article class="ex-card">
      <div class="ex-card-head">
        <a href="#/exercise/${slot.id}" aria-label="How to do ${esc(name)}"><img src="${slot.img}" alt=""></a>
        <div><p class="eyebrow">Exercise ${i + 1} of ${r.plan.ex.length}</p><h2>${esc(name)}</h2>
          <p class="meta">${FDS.setsLabel(slot, log.sets.length)} · rest ${D.REST[ex.type].label} · RIR 2–3</p>
          <div class="row-wrap" style="margin-top:6px"><a class="link" href="#/exercise/${slot.id}">How to do it</a><button type="button" class="link" data-act="b-rir-help">What’s RIR?</button></div>
        </div>
      </div>
      <div class="ex-card-body">
        ${coach}
        ${rec.stalled && !log.done ? '<div class="note warn small">No progress in the last 3 sessions. Check your sleep, food and recovery. <a href="#/learn?topic=deload">A deload may help.</a></div>' : ''}
        ${failed ? '<div class="note small">That set went to failure. Fine now and then, but most sets should stop with 2–3 reps left.</div>' : ''}
        ${ex.weightNote ? `<p class="tiny muted">${esc(ex.weightNote)}</p>` : ''}
        <div class="stack b-sets">${setsHtml}</div>
        ${r.isPast ? '' : `<button type="button" class="btn btn-sm" data-act="b-rest" data-sec="${rest}" data-label="${esc(name)}">${FDS.icon('timer')} Start rest · ${FDS.mmss(rest)}</button>`}
        ${log.done
          ? `<div class="pair"><button type="button" class="btn" data-act="b-reopen-ex" data-i="${i}">Reopen</button><button type="button" class="btn btn-primary" data-act="b-go" data-to="${nextStage(s, i)}">${nextStage(s, i) === 'finish' ? 'Finish workout' : 'Next exercise'} ${FDS.icon('next')}</button></div>`
          : `<button type="button" class="btn ${allDone ? 'btn-lg btn-primary' : ''} btn-block" data-act="b-complete-ex" data-i="${i}">${allDone ? FDS.icon('check') + ' ' : ''}Complete exercise</button>`}
        <details class="acc" ${log.notes ? 'open' : ''}><summary>Notes</summary><div class="acc-body">
          <label class="sr" for="b-notes-${i}">Notes for ${esc(name)}</label>
          <textarea class="input" id="b-notes-${i}" data-input="b-notes" data-i="${i}" placeholder="Seat height, grip, how it felt…">${esc(log.notes)}</textarea></div></details>
      </div>
    </article>`;
  }

  function finishStage(r) {
    const s = r.sess, prog = FDS.sessionProgress(s);
    const rows = r.plan.ex.map((slot, i) => {
      const log = s.ex[i], ds = L.doneSets(log), ex = D.EXERCISES[slot.id];
      return `<div class="list-row"><span class="idx">${i + 1}</span><span class="grow"><span class="h3">${esc(FDS.exName(slot))}</span><br><span class="small ${ds.length ? 'muted' : ''}">${ds.length ? esc(setsText(ds, ex)) : 'No sets logged'}</span></span>
        ${log.done ? '<span class="pill good">Done</span>' : `<button type="button" class="btn btn-sm" data-act="b-go" data-to="${i}">Go</button>`}</div>`;
    }).join('');
    if (!s.completed) {
      return `<div class="card stack">
        <div><h2 class="section-title">Finish workout</h2><p class="small muted">${prog.exDone} of ${prog.exTotal} exercises done · ${prog.done} working sets</p></div>
        <div class="list">${rows}</div>
        ${prog.exDone < prog.exTotal ? '<div class="note warn small">Some exercises aren’t finished. Go back, or complete the workout as it is. A shorter session still counts.</div>' : ''}
        <button type="button" class="btn btn-lg btn-day btn-block" data-act="b-complete-workout" ${prog.done ? '' : 'disabled'}>${FDS.icon('check')} Complete workout</button>
        ${prog.done ? '' : '<p class="small muted center">Log at least one set to complete the workout.</p>'}
      </div>`;
    }
    const volKg = s.ex.reduce((a, e) => a + L.doneSets(e).reduce((x, st) => x + (st.w || 0) * st.r, 0), 0);
    const mins = s.started ? Math.round((new Date(s.completed) - new Date(s.started)) / 60000) : null;
    const prs = L.prEvents(FDS.S.sessions, D.PLAN, D.EXERCISES).filter(e => e.date === r.date);
    const st = L.streaks(FDS.S.sessions, FDS.S.profile.startDate, FDS.today());
    const rec = FDS.cardioRec(r.date);
    const lvl = { recommended: 'Suggested', optional: 'Optional', light: 'Keep it light', done: 'Done' }[rec.level];
    return `<div class="stack-lg b-results">
      <section class="card stack">
        <div class="row between"><h2 class="section-title">Workout complete</h2><span class="pill good">${FDS.icon('check')} Saved</span></div>
        <div class="stats s4">
          <div class="stat"><b>${prog.done}</b><span>Working sets</span></div>
          <div class="stat"><b>${FDS.n(L.toDisplayWeight(volKg, FDS.unit()))}</b><span>Total ${FDS.unit()} lifted</span></div>
          <div class="stat"><b>${mins != null && mins > 0 && mins < 300 ? mins + ' min' : '—'}</b><span>Duration</span></div>
          <div class="stat"><b>${st.current}</b><span>Workout streak</span></div>
        </div>
        ${prs.length ? `<div class="note good"><strong>New bests today</strong><ul>${prs.map(e => `<li>${esc(D.EXERCISES[e.id].name)}: ${FDS.w(e.w)} × ${e.r}${e.type === 'reps' ? ' (more reps)' : ''}</li>`).join('')}</ul></div>` : ''}
        <p>${prs.length ? 'Progress like this adds up week after week.' : 'Session done. Showing up consistently is what counts most.'}</p>
        <div class="list">${rows}</div>
        <button type="button" class="btn btn-ghost btn-sm" data-act="b-reopen">Reopen workout to edit</button>
      </section>
      <section class="card stack" data-day="rest">
        <div class="row between"><h2 class="section-title">What’s next</h2><span class="pill">${lvl}</span></div>
        <div class="note day"><strong>${esc(rec.headline)}</strong><br><span class="small">${esc(rec.intensity)}</span>
          ${rec.reasons.length ? `<ul class="small">${rec.reasons.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>
        <p class="tiny muted">Cardio after weights is optional. It depends on your steps and how you feel, not a punishment.</p>
        <div class="grid g2">
          <button type="button" class="btn" data-act="b-log" data-fn="openStepsSheet" data-href="#/activity">${FDS.icon('walk')} Log steps</button>
          <button type="button" class="btn" data-act="b-log" data-fn="openCardioSheet" data-href="#/activity?tab=cardio">${FDS.icon('activity')} Log cardio</button>
          <button type="button" class="btn" data-act="b-log" data-fn="openWeightSheet" data-href="#/body">${FDS.icon('body')} Log weight</button>
          <button type="button" class="btn" data-act="b-log" data-fn="openFoodSheet" data-href="#/food">${FDS.icon('food')} Log a meal</button>
        </div>
        <a class="btn btn-primary btn-block" href="#/">Back to Today</a>
      </section>
    </div>`;
  }

  function bottomBar(r, stage) {
    const n = r.plan.ex.length;
    const prev = stage === 'finish' ? n - 1 : stage === -1 ? null : stage - 1;
    const next = stage === 'finish' ? null : stage === n - 1 ? 'finish' : stage + 1;
    return `<div class="wk-bar">
      <button type="button" class="btn" data-act="b-go" data-to="${prev}" ${prev === null ? 'disabled' : ''} aria-label="Previous step">${FDS.icon('back')}</button>
      <button type="button" class="timer-btn" data-act="timer-open" aria-label="Open rest timer"><span data-timer></span><span class="lbl" data-timer-label></span></button>
      ${next === null ? '<a class="btn btn-primary" href="#/">Today</a>' : `<button type="button" class="btn btn-day" data-act="b-go" data-to="${next}">${next === 'finish' ? 'Finish' : 'Next'} ${FDS.icon('next')}</button>`}
    </div>`;
  }

  function chooser(r) {
    const p = FDS.planFor(r.date);
    const weekend = !p.ex.length;
    return `<div class="stack-lg">
      ${weekend ? `<section class="day-banner" data-day="rest">
        <p class="eyebrow">${p.day}</p><h2>${esc(p.title)}</h2><p class="focus">No weight training today.</p>
        <ul class="a-items">${p.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>
        <div class="a-banner-actions">
          <button type="button" class="btn btn-lg btn-on" data-act="b-log" data-fn="openCardioSheet" data-href="#/activity?tab=cardio">Log walk</button>
          <button type="button" class="btn btn-lg btn-line" data-act="b-log" data-fn="openStepsSheet" data-href="#/activity">Log steps</button>
        </div></section>` : ''}
      <section class="card">
        <h2 class="section-title">Train anyway?</h2>
        <p class="small muted" style="margin:6px 0 12px">Missed a session this week? You can do one as a make-up. Don’t cram several into one day, and don’t add extra cardio to “make up” for it. Just pick up where you are.</p>
        <div class="list">${D.PLAN.filter(x => x.ex.length).map(x => `<a class="list-row" href="#/workout/${x.key}" data-day="${x.color}"><span class="pill day">${x.day.slice(0, 3)}</span><span class="grow"><span class="h3">${esc(x.title)}</span><br><span class="small muted">${esc(x.focus)}</span></span>${FDS.icon('next')}</a>`).join('')}</div>
      </section>
    </div>`;
  }

  FDS.route('workout', {
    title: ctx => { const r = resolve(ctx); return r.plan ? r.plan.title : 'Workout'; },
    nav: 'plan', focus: true, back: '#/',
    render(ctx) {
      const r = resolve(ctx);
      if (!r.plan) return chooser(r);
      const s = r.sess;
      if (r.isPast && !s) {
        return `<div class="card empty-state"><p class="h3">No ${esc(r.plan.title)} logged on ${FDS.dateLabel(r.date, 'long')}</p>
          <p class="small">You can add it now if you trained and forgot to log.</p>
          <button type="button" class="btn btn-primary" data-act="b-go" data-to="0">Log this workout</button></div>`;
      }
      const stage = s ? s.cur : -1;
      const total = s ? FDS.sessionProgress(s).total : r.plan.ex.reduce((a, x) => a + x.sets, 0);
      const done = s ? FDS.sessionProgress(s).done : 0;
      const deload = s ? s.deload : FDS.deloadActive(r.date);
      let content;
      if (stage === -1) content = warmStage(r);
      else if (stage === 'finish') content = finishStage(r);
      else content = exStage(r, stage);
      return `<div data-day="${r.plan.color}">
        <div class="wk-top">
          <div class="wk-title"><h1>${esc(r.plan.title)}</h1>
            <span class="small muted">${r.isPast ? FDS.dateLabel(r.date, 'long') : `${FDS.planFor(r.date).day} · Week ${FDS.week(r.date)}`}</span>
            ${s && s.completed ? '<span class="pill good">Completed</span>' : ''}</div>
          <div class="row"><div class="grow">${FDS.bar(total ? done / total : 0)}</div><span class="small num">${done} / ${total} sets</span></div>
          ${r.other && !s ? `<div class="note warn small">A ${esc(FDS.planByKey(r.other.day).title)} session is already logged for this day. Starting this workout will replace it.</div>` : ''}
          ${deload ? '<div class="note warn small"><strong>Deload week:</strong> fewer sets, about 80% of your usual weights, and stop with 3–4 reps left. Progression is paused.</div>' : ''}
          ${navChips(r, stage)}
        </div>
        <div class="wk-layout">${sideList(r, stage)}<section>${content}</section></div>
        ${bottomBar(r, stage)}
      </div>`;
    }
  });

  // ---------- actions ----------
  FDS.act['b-go'] = el => {
    const to = el.dataset.to;
    if (to === 'null') return;
    const r = resolve();
    if (!r.plan || (!r.sess && to === '-1')) return;
    const s = ensure(r);
    if (!s) return;
    s.cur = to === 'finish' ? 'finish' : Number(to);
    FDS.saveNow();
    FDS.refresh({ scrollTop: true });
  };
  FDS.act['b-warm'] = el => {
    const s = ensure(resolve());
    if (!s) return;
    s.warm = s.warm || {};
    s.warm[el.dataset.key] = !s.warm[el.dataset.key];
    s.warmupDone = !!(s.warm.general && s.warm.dynamic && s.warm.sets);
    FDS.commit();
  };
  FDS.act['b-warm-done'] = el => {
    const s = ensure(resolve());
    if (!s) return;
    if (el.dataset.skip !== '1') { s.warmupDone = true; s.warm = { general: true, dynamic: true, sets: true }; }
    s.cur = nextStage(s, -1);
    FDS.saveNow();
    FDS.refresh({ scrollTop: true });
  };
  FDS.act['b-step'] = el => {
    const input = el.parentElement.querySelector('input');
    const step = Number(el.dataset.stepv) || 1, dir = Number(el.dataset.dir);
    let next;
    if (input.value === '') {
      const ph = Number(input.placeholder);
      next = ph > 0 ? ph : dir > 0 ? step : 0;
    } else next = Number(input.value) + dir * step;
    input.value = Math.max(0, Math.round(next * 100) / 100);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  };
  FDS.onInput['b-set'] = el => {
    const s = resolve().sess;
    if (!s) return;
    const st = s.ex[+el.dataset.i].sets[+el.dataset.s];
    const v = el.value;
    if (el.dataset.field === 'w') st.w = v === '' ? null : FDS.wIn(v);
    else st.r = v === '' ? null : parseInt(v, 10);
    const err = el.closest('.set').querySelector('.b-err');
    if (err) err.hidden = true;
    FDS.save();
  };
  FDS.act['b-rir'] = el => {
    const s = resolve().sess;
    if (!s) return;
    const st = s.ex[+el.dataset.i].sets[+el.dataset.s], v = +el.dataset.value;
    st.rir = st.rir === v ? null : v;
    el.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(+b.dataset.value === st.rir)));
    FDS.save();
  };
  FDS.act['b-complete-set'] = el => {
    const r = resolve(), s = r.sess;
    if (!s) return;
    const i = +el.dataset.i, j = +el.dataset.s, slot = r.plan.ex[i], ex = D.EXERCISES[slot.id];
    const box = el.closest('.set');
    const wIn = box.querySelector('input[data-field="w"]'), rIn = box.querySelector('input[data-field="r"]');
    const err = box.querySelector('.b-err');
    const reps = parseInt(rIn.value, 10), w = wIn ? parseFloat(wIn.value) : null;
    let msg = '';
    if (!ex.bodyweight && (wIn.value === '' || isNaN(w) || w < 0)) msg = `Enter the weight you used (${FDS.unit()}).`;
    else if (!(reps > 0)) msg = 'Enter how many reps you did.';
    else if (reps > 100) msg = 'That rep count looks too high. Check it and try again.';
    if (msg) { err.textContent = msg; err.hidden = false; (wIn && wIn.value === '' ? wIn : rIn).focus(); return; }
    const log = s.ex[i], st = log.sets[j];
    st.w = ex.bodyweight ? null : FDS.wIn(w);
    st.r = reps;
    st.done = true;
    FDS.saveNow();
    const moreSets = log.sets.some(x => !x.done);
    const workoutDone = s.ex.every(e => e.sets.every(x => x.done));
    if (!r.isPast && FDS.S.settings.autoRest && !workoutDone) {
      const sec = FDS.restFor(slot.id);
      FDS.timer.start(sec, moreSets ? `${FDS.exName(slot)} · set ${j + 2}` : 'next exercise');
      FDS.toast(moreSets ? `Set ${j + 1} saved — rest ${FDS.mmss(sec)}` : `All sets done — rest ${FDS.mmss(sec)}, then tap Complete exercise`);
    } else FDS.toast(moreSets ? `Set ${j + 1} saved` : 'All sets done — tap Complete exercise');
    FDS.refresh();
  };
  FDS.act['b-edit'] = el => {
    const s = resolve().sess;
    if (!s) return;
    const log = s.ex[+el.dataset.i];
    log.sets[+el.dataset.s].done = false;
    log.done = false;
    FDS.commit();
  };
  FDS.act['b-rest'] = el => FDS.timer.start(Number(el.dataset.sec), el.dataset.label || '');
  FDS.act['b-complete-ex'] = el => {
    const r = resolve(), s = r.sess;
    if (!s) return;
    const i = +el.dataset.i, log = s.ex[i];
    const left = log.sets.filter(x => !x.done).length;
    if (left && !confirm(`${left} set${left > 1 ? 's' : ''} not logged. Skip and finish this exercise?`)) return;
    log.done = true;
    const nx = nextStage(s, i);
    FDS.saveNow();
    FDS.refresh();
    FDS.toast(nx === 'finish' ? 'Exercise done. That was the last one.' : `Exercise done. Next: ${FDS.exName(r.plan.ex[nx])}`);
  };
  FDS.act['b-reopen-ex'] = el => { const s = resolve().sess; if (!s) return; s.ex[+el.dataset.i].done = false; FDS.commit(); };
  FDS.act['b-complete-workout'] = () => {
    const s = resolve().sess;
    if (!s) return;
    s.completed = new Date().toISOString();
    s.cur = 'finish';
    FDS.saveNow();
    FDS.refresh({ scrollTop: true });
    FDS.toast('Workout complete');
  };
  FDS.act['b-reopen'] = () => { const s = resolve().sess; if (!s) return; s.completed = null; FDS.commit(); };
  FDS.act['b-log'] = el => FDS.open(el.dataset.fn, el.dataset.href, resolve().date);
  FDS.act['b-rir-help'] = () => FDS.openRirHelp();

  FDS.openRirHelp = () => FDS.sheet.open({
    title: 'RIR · reps in reserve',
    html: `<div class="stack">
      <p><b>RIR is how many more clean reps you could have done</b> when you stopped the set.</p>
      <div class="note day" data-day="push"><strong>RIR 3 = you could do about 3 more clean reps.</strong></div>
      <div class="kv">
        <div><span>0</span><b>Couldn’t do another rep (failure)</b></div>
        <div><span>1</span><b>Maybe one more</b></div>
        <div><span>2</span><b>Two more — hard set ✓</b></div>
        <div><span>3</span><b>Three more — good working set ✓</b></div>
        <div><span>4+</span><b>Too easy — add reps or weight</b></div>
      </div>
      <p><b>Your target:</b> finish most working sets with about 2–3 good reps left. Don’t train every set to absolute failure. It adds fatigue without much extra benefit.</p>
      <p><b>How to judge it:</b> reps start slowing down, you have to push harder, and your form wants to change. Stop before form breaks.</p>
      <p class="small muted">Beginners often underestimate how much they have left. That’s normal — you get better at judging it with practice.</p>
    </div>`
  });
})();
