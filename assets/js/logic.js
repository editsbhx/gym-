/* Pure functions: dates, units, progression, cardio, recovery, streaks, nutrition.
   No DOM access so this file can be tested in Node. */
(function (root) {
  // ---------- dates (local YYYY-MM-DD keys) ----------
  const pad = n => String(n).padStart(2, '0');
  const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  const todayKey = () => keyOf(new Date());
  const addDays = (k, n) => { const d = parse(k); d.setDate(d.getDate() + n); return keyOf(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 86400000); // b - a
  const dow = k => (parse(k).getDay() + 6) % 7; // Monday = 0
  const weekStart = k => addDays(k, -dow(k));
  const programWeek = (start, k) => Math.max(1, Math.floor(diffDays(start, k) / 7) + 1);

  // ---------- units ----------
  const LB = 2.20462;
  const round = (v, step) => Math.round(v / step) * step;
  const trim = v => (Math.round(v * 10) / 10).toString();
  const toDisplayWeight = (kg, unit) => (kg == null || kg === '' ? null : unit === 'lb' ? kg * LB : kg);
  const toKg = (v, unit) => (v == null || v === '' || isNaN(v) ? null : unit === 'lb' ? Number(v) / LB : Number(v));
  const fmtW = (kg, unit, dp) => {
    if (kg == null) return '—';
    const v = toDisplayWeight(kg, unit);
    const r = dp === 0 ? Math.round(v) : Math.round(v * 10) / 10;
    return `${r} ${unit}`;
  };
  // Smallest sensible jump shown to the user, in their unit.
  const incFor = (ex, unit) => {
    if (!ex.inc) return 0;
    if (unit !== 'lb') return ex.inc;
    return ex.inc >= 5 ? 10 : ex.inc >= 2 ? 5 : 2.5;
  };
  const cmToFtIn = cm => { const t = cm / 2.54; let ft = Math.floor(t / 12); let inch = Math.round(t - ft * 12); if (inch === 12) { ft++; inch = 0; } return { ft, inch }; };
  const ftInToCm = (ft, inch) => (Number(ft) * 12 + Number(inch)) * 2.54;

  // ---------- steps & cardio ----------
  function stepTarget(week, goal, ramp) {
    if (!ramp) return goal;
    const f = week <= 2 ? 0.7 : week <= 4 ? 0.8 : week <= 8 ? 0.9 : 1;
    return Math.round((goal * f) / 500) * 500;
  }
  function cardioBase(week) {
    if (week <= 2) return [20, 20];
    if (week <= 4) return [25, 25];
    if (week <= 8) return [30, 30];
    return [30, 40];
  }
  const STEPS_PER_MIN = 110; // brisk / incline walking, rough average

  function recoveryAdvice(c) {
    if (!c) return null;
    const flags = [];
    if (c.sleepH != null && c.sleepH < 6) flags.push('short sleep');
    if (c.sleepQ != null && c.sleepQ <= 2) flags.push('poor sleep quality');
    if (c.energy != null && c.energy <= 2) flags.push('low energy');
    if (c.soreness != null && c.soreness >= 4) flags.push('high soreness');
    if (c.readiness != null && c.readiness <= 2) flags.push('low readiness');
    let level, text;
    if (!flags.length) { level = 'good'; text = 'Recovery looks good — continue normally.'; }
    else if (flags.length === 1 && flags[0] === 'high soreness') { level = 'ok'; text = 'You’re quite sore. Warm up a little longer, keep your normal weights, and stop sets with about 3 reps left. Keep cardio easy.'; }
    else if (flags.length === 1) { level = 'ok'; text = `Mostly fine (${flags[0]}). Train as planned with RIR 2–3 and don’t chase records if a set feels off.`; }
    else { level = 'high'; text = 'You’re reporting high fatigue. Consider reducing cardio today, stopping sets with 3–4 reps left, and dropping one set per exercise if needed.'; }
    return { level, text, flags };
  }

  function cardioRecommendation({ kind, steps, stepGoal, week, recovery, pref, cardioMin }) {
    const intensity = 'Moderate: breathing harder, but you can still talk in full sentences (about 5–6 out of 10 effort).';
    if (kind === 'walk') return { level: 'recommended', headline: 'Saturday walk: 45–60 min brisk', minutes: [45, 60], intensity, reasons: ['Steps from this walk count toward your daily step target — it isn’t an extra 10,000.'] };
    if (kind === 'recovery') return { level: 'light', headline: 'Easy 20–30 min walk', minutes: [20, 30], intensity: 'Easy: relaxed pace, nose-breathing comfortable.', reasons: ['Sunday is for recovery. Normal daily movement is plenty.'] };

    const reasons = [];
    let [lo, hi] = cardioBase(week);
    let level = 'recommended';
    let headline;
    const fatigue = recovery ? recovery.flags.length : 0;
    const sore = recovery && recovery.flags.includes('high soreness');
    const legDay = kind === 'legs' || kind === 'pulllegs';

    if (cardioMin >= lo && lo > 0) {
      return { level: 'done', headline: `Cardio done — ${cardioMin} min logged`, minutes: null, intensity, reasons: ['Nothing more needed today. Extra cardio doesn’t make up for anything — recovery matters too.'] };
    }

    if (steps != null && steps >= stepGoal) {
      return { level: 'optional', headline: 'Step target hit — no extra cardio needed', minutes: [10, 15], intensity: 'Optional easy cooldown: 10–15 min at a relaxed pace.', reasons: [`You already have ${steps.toLocaleString()} steps. A 10–15 minute easy cooldown is enough if you want one.`] };
    }

    if (steps == null) {
      reasons.push('Log today’s steps for a more precise suggestion. If you’re already active today, you may need less.');
    } else {
      const remaining = stepGoal - steps;
      const close = Math.max(10, Math.ceil(remaining / STEPS_PER_MIN / 5) * 5);
      if (steps >= stepGoal * 0.75) {
        level = 'optional';
        lo = Math.min(10, close); hi = Math.min(hi, close);
        if (hi < lo) hi = lo;
        reasons.push(`You’re ${remaining.toLocaleString()} steps short. About ${close} min of walking would close the gap — treadmill steps count.`);
      } else {
        if (close < lo) { lo = Math.max(10, close); hi = Math.max(lo, close); }
        reasons.push(`Steps are low so far (${steps.toLocaleString()} of ${stepGoal.toLocaleString()}). Moderate cardio after weights will help — the steps count toward your total.`);
      }
    }

    if (kind === 'legs') { lo = Math.min(lo, 10); hi = Math.min(hi, 30); reasons.push('Leg day — keep cardio lighter (10–30 min) depending on how your legs feel. A bike or flat walk is easier on tired legs.'); }
    else if (kind === 'pulllegs') { hi = Math.min(hi, 30); reasons.push('You trained legs today, so don’t push cardio hard.'); }

    if (fatigue >= 2 || (sore && legDay)) {
      level = 'light'; lo = 10; hi = Math.min(hi, 20);
      reasons.push('You reported high fatigue — keep it short and easy, or skip it today.');
    }

    if (pref === 'less') hi = lo;
    else if (pref === 'more' && level === 'recommended' && fatigue < 2) hi = Math.min(40, hi + 5);

    headline = level === 'optional' ? `Optional: ${lo === hi ? lo : lo + '–' + hi} min to top up steps`
      : level === 'light' ? `Light cardio only: ${lo}–${hi} min, easy`
      : `${lo === hi ? lo : lo + '–' + hi} min moderate cardio after weights`;
    return { level, headline, minutes: [lo, hi], intensity, reasons };
  }

  // ---------- double progression ----------
  function progression({ slot, ex, last, unit, deload }) {
    const range = slot.min === slot.max ? `${slot.min}` : `${slot.min}–${slot.max}`;
    const inc = incFor(ex, unit);
    const f = kg => fmtW(kg, unit);
    if (ex.bodyweight) {
      if (!last || !last.length) return { kind: 'first', weightKg: null, text: `Bodyweight exercise. Do ${range} slow, controlled reps${slot.each ? ' per side' : ''}.` };
      const top = last.length >= slot.sets && last.every(s => s.r >= slot.max);
      return top
        ? { kind: 'increase', weightKg: null, text: `You hit all ${slot.max} reps last time. Make it harder with slower reps (3 seconds out, 3 back) and a 2-second pause at full reach.` }
        : { kind: 'keep', weightKg: null, text: `Aim to beat last time: ${last.map(s => s.r).join(' / ')}${slot.each ? ' per side' : ''}.` };
    }
    if (!last || !last.length) {
      return { kind: 'first', weightKg: null, text: `First time: pick a weight you can lift for ${range} clean reps with about 2–3 reps left. Start on the light side — you can add weight next session.` };
    }
    const base = last[0].w;
    const incKg = toKg(inc, unit);
    if (deload) {
      const dl = toKg(round(toDisplayWeight(base, unit) * 0.8, inc || 1), unit);
      return { kind: 'deload', weightKg: dl, text: `Deload week: use about ${f(dl)} (≈80% of ${f(base)}) and stop each set with 3–4 reps left.` };
    }
    const work = last.slice(0, slot.sets);
    const full = work.length >= slot.sets;
    const allTop = full && work.every(s => s.r >= slot.max && s.w >= base - 0.01);
    const anyFail = work.some(s => s.rir === 0);
    const below = work.filter(s => s.r < slot.min).length;
    const reps = work.map(s => s.r).join(' / ');
    if (allTop && !anyFail) {
      return { kind: 'increase', weightKg: base + incKg, text: `You hit ${slot.max} reps on every set last time. Add a little weight: try ${f(base + incKg)} (+${inc} ${unit}). Your reps will drop — build back up to ${slot.max}.` };
    }
    if (allTop && anyFail) {
      return { kind: 'repeat', weightKg: base, text: `You reached ${slot.max} on every set, but at least one set went to failure. Repeat ${f(base)} and aim for ${slot.max} with 1–2 reps left before adding weight.` };
    }
    if (below >= 2) {
      return { kind: 'hold', weightKg: base, text: `Last time ${below} sets fell below ${slot.min} reps (${reps}). Stay at ${f(base)} — or drop one step to ${f(Math.max(0, base - incKg))} — and aim for at least ${slot.min} clean reps per set.` };
    }
    return { kind: 'keep', weightKg: base, text: `Keep the same weight (${f(base)}) and try to beat your previous reps: ${reps}.` };
  }

  // perf = [top weight, reps done at top weight]; used for stall detection
  const perf = sets => {
    if (!sets.length) return [0, 0];
    const top = Math.max(...sets.map(s => s.w || 0));
    return [top, sets.filter(s => (s.w || 0) === top).reduce((a, s) => a + s.r, 0)];
  };
  const better = (a, b) => a[0] > b[0] + 0.01 || (Math.abs(a[0] - b[0]) <= 0.01 && a[1] > b[1]);
  // history: latest first
  function isStalled(history) {
    if (history.length < 3) return false;
    const [p0, p1, p2] = history.slice(0, 3).map(perf);
    return !better(p0, p2) && !better(p1, p2) && !better(p0, p1);
  }

  // ---------- sessions, streaks, PRs ----------
  const doneSets = exLog => (exLog && exLog.sets ? exLog.sets.filter(s => s.done && s.r > 0) : []);

  function streaks(sessions, start, today) {
    let run = 0, longest = 0;
    if (!start || start > today) return { current: 0, longest: 0 };
    for (let d = start; d <= today; d = addDays(d, 1)) {
      if (dow(d) > 4) continue;
      const done = sessions[d] && sessions[d].completed;
      if (done) { run++; longest = Math.max(longest, run); }
      else if (d !== today) run = 0;
    }
    return { current: run, longest };
  }

  // Walk every session chronologically; a PR is a heavier top set, or more reps at the best weight.
  function prEvents(sessions, plan, exercises) {
    const best = {};
    const events = [];
    Object.keys(sessions).sort().forEach(date => {
      const s = sessions[date];
      const day = plan.find(p => p.key === s.day);
      if (!day) return;
      (s.ex || []).forEach((log, i) => {
        const slot = day.ex[i];
        if (!slot) return;
        const sets = doneSets(log);
        if (!sets.length || exercises[slot.id].bodyweight) return;
        const w = Math.max(...sets.map(x => x.w || 0));
        const topReps = Math.max(...sets.filter(x => (x.w || 0) === w).map(x => x.r));
        const b = best[slot.id];
        if (b) {
          if (w > b.w + 0.01) events.push({ date, id: slot.id, w, r: topReps, type: 'weight' });
          else if (Math.abs(w - b.w) <= 0.01 && topReps > b.r) events.push({ date, id: slot.id, w, r: topReps, type: 'reps' });
        }
        if (!b || w > b.w + 0.01) best[slot.id] = { w, r: topReps };
        else if (Math.abs(w - b.w) <= 0.01 && topReps > b.r) b.r = topReps;
      });
    });
    return events;
  }

  function exerciseHistory(sessions, plan, id) {
    const rows = [];
    Object.keys(sessions).sort().forEach(date => {
      const s = sessions[date];
      const day = plan.find(p => p.key === s.day);
      if (!day) return;
      day.ex.forEach((slot, i) => {
        if (slot.id !== id) return;
        const sets = doneSets(s.ex && s.ex[i]);
        if (!sets.length) return;
        const top = Math.max(...sets.map(x => x.w || 0));
        rows.push({ date, day: day.key, slotIndex: i, sets, top, topReps: Math.max(...sets.filter(x => (x.w || 0) === top).map(x => x.r)), deload: !!s.deload, notes: s.ex[i].notes || '' });
      });
    });
    return rows;
  }

  // ---------- body weight ----------
  function weightSeries(weights) {
    return Object.keys(weights).sort().map(d => ({ date: d, kg: weights[d] }));
  }
  function avgWindow(series, endKey, days) {
    const startKey = addDays(endKey, -(days - 1));
    const inWin = series.filter(e => e.date >= startKey && e.date <= endKey);
    return inWin.length ? inWin.reduce((a, e) => a + e.kg, 0) / inWin.length : null;
  }
  function weightStats(weights, today) {
    const series = weightSeries(weights);
    if (!series.length) return { series, latest: null, avg7: null, weeklyChange: null, weeklyAvgChange: null };
    const latest = series[series.length - 1];
    const avg7 = avgWindow(series, latest.date, 7);
    const prev7 = avgWindow(series, addDays(latest.date, -7), 7);
    const first = series[0];
    const span = diffDays(first.date, latest.date);
    let weeklyAvgChange = null;
    if (span >= 14) {
      const startAvg = avgWindow(series, addDays(first.date, 6), 7);
      weeklyAvgChange = (avg7 - startAvg) / ((span - 6) / 7 || 1);
    }
    return { series, latest, avg7, weeklyChange: prev7 == null ? null : avg7 - prev7, weeklyAvgChange, todayKg: weights[today] != null ? weights[today] : null };
  }
  // Entry on the date, else the closest one before it, else the first after it.
  function weightOnOrNear(weights, date) {
    const series = weightSeries(weights);
    if (!series.length) return null;
    let before = null;
    for (const e of series) { if (e.date <= date) before = e; else break; }
    return before || series[0];
  }
  function rollingAverage(series, days) {
    return series.map(e => ({ date: e.date, kg: avgWindow(series, e.date, days) }));
  }

  // ---------- nutrition ----------
  // Mifflin–St Jeor. Sex unset uses the midpoint of the two constants.
  function bmr({ sex, kg, cm, age }) {
    const k = sex === 'male' ? 5 : sex === 'female' ? -161 : -78;
    return 10 * kg + 6.25 * cm - 5 * age + k;
  }
  function calorieEstimate(profile, currentKg) {
    const b = bmr({ sex: profile.sex, kg: currentKg, cm: profile.heightCm, age: profile.age });
    const maintenance = b * 1.55; // 5 training days + daily steps
    const target = Math.round((maintenance - 500) / 50) * 50;
    const protein = Math.round((profile.goalKg * 1.8) / 5) * 5;
    return { bmr: Math.round(b), maintenance: Math.round(maintenance / 10) * 10, target, protein };
  }
  function calorieWarning(target, est) {
    if (!target) return null;
    if (target < 1500) return 'This target is very low. Eating this little makes it hard to train, recover, and keep muscle. Please don’t go this low without guidance from a doctor or dietitian.';
    if (target < est.bmr) return 'This target is below your estimated resting needs — an aggressive deficit. A moderate target usually makes training, recovery, and consistency easier.';
    return null;
  }
  const dayFoodTotals = (entries) => (entries || []).reduce((t, e) => {
    t.kcal += Number(e.kcal) || 0; t.p += Number(e.p) || 0; t.c += Number(e.c) || 0; t.f += Number(e.f) || 0; return t;
  }, { kcal: 0, p: 0, c: 0, f: 0 });

  // ---------- weekly summary ----------
  function weekSummary(S, plan, exercises, ws, today) {
    const days = [...Array(7)].map((_, i) => addDays(ws, i));
    const past = days.filter(d => d <= today);
    const sessions = days.map(d => S.sessions[d]).filter(Boolean);
    const completed = sessions.filter(s => s.completed).length;
    const stepDays = days.filter(d => S.steps[d] != null);
    const totalSteps = stepDays.reduce((a, d) => a + S.steps[d], 0);
    const cardioMin = days.reduce((a, d) => a + (S.cardio[d] || []).reduce((x, c) => x + (Number(c.min) || 0), 0), 0);
    const wIn = days.filter(d => S.weights[d] != null).map(d => S.weights[d]);
    const avgW = wIn.length ? wIn.reduce((a, b) => a + b, 0) / wIn.length : null;
    const prevDays = [...Array(7)].map((_, i) => addDays(ws, i - 7)).filter(d => S.weights[d] != null).map(d => S.weights[d]);
    const prevAvg = prevDays.length ? prevDays.reduce((a, b) => a + b, 0) / prevDays.length : null;
    let totalSets = 0;
    sessions.forEach(s => (s.ex || []).forEach(l => { totalSets += doneSets(l).length; }));
    const prs = prEvents(S.sessions, plan, exercises).filter(e => e.date >= ws && e.date <= days[6]);
    const foodDays = days.filter(d => (S.food[d] || []).length);
    const kcalAvg = foodDays.length ? foodDays.reduce((a, d) => a + dayFoodTotals(S.food[d]).kcal, 0) / foodDays.length : null;
    const proteinAvg = foodDays.length ? foodDays.reduce((a, d) => a + dayFoodTotals(S.food[d]).p, 0) / foodDays.length : null;
    const plannedSoFar = past.filter(d => dow(d) <= 4 && d >= (S.profile.startDate || d)).length;
    return {
      days, completed, planned: 5, plannedSoFar, totalSteps, avgSteps: stepDays.length ? Math.round(totalSteps / stepDays.length) : null, stepDays: stepDays.length,
      cardioMin, avgW, weightChange: avgW != null && prevAvg != null ? avgW - prevAvg : null, totalSets, prs,
      consistency: plannedSoFar ? Math.round((Math.min(completed, plannedSoFar) / plannedSoFar) * 100) : null,
      kcalAvg, proteinAvg, foodDays: foodDays.length
    };
  }

  const api = {
    keyOf, parse, todayKey, addDays, diffDays, dow, weekStart, programWeek,
    LB, round, trim, toDisplayWeight, toKg, fmtW, incFor, cmToFtIn, ftInToCm,
    stepTarget, cardioBase, cardioRecommendation, recoveryAdvice,
    progression, isStalled, doneSets, streaks, prEvents, exerciseHistory,
    weightSeries, weightStats, weightOnOrNear, rollingAverage, avgWindow,
    bmr, calorieEstimate, calorieWarning, dayFoodTotals, weekSummary
  };
  root.FDS_LOGIC = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
