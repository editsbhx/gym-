/* Food & calories: daily log by meal, saved foods, quick add, water, targets, 7-day chart. */
(function () {
  const { L, esc } = FDS;
  const MEALS = [['breakfast', 'Breakfast'], ['lunch', 'Lunch'], ['dinner', 'Dinner'], ['snacks', 'Snacks']];
  const MEAL_NAME = Object.fromEntries(MEALS);
  const mealByTime = () => { const h = new Date().getHours(); return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snacks'; };
  let selMeal = null;
  let quick = [];
  const num = v => (v === '' || v == null || isNaN(v) ? 0 : Math.max(0, Math.round(Number(v) * 10) / 10));
  const macro = e => [e.p ? `P ${FDS.n(e.p, 1)} g` : '', e.c ? `C ${FDS.n(e.c, 1)} g` : '', e.f ? `F ${FDS.n(e.f, 1)} g` : ''].filter(Boolean).join(' · ');
  const meal = () => selMeal || mealByTime();

  function quickItems(date) {
    const S = FDS.S, seen = new Set(), out = [];
    S.foods.forEach(f => { const k = f.name.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(f); } });
    for (let i = 0; i < 14 && out.length < 16; i++) {
      (S.food[L.addDays(date, -i)] || []).slice().reverse().forEach(e => { const k = e.name.toLowerCase(); if (!seen.has(k)) { seen.add(k); out.push(e); } });
    }
    return out.slice(0, 16);
  }
  const chips = date => {
    quick = quickItems(date);
    if (!quick.length) return '<p class="small muted">Foods you add or save show up here for one-tap logging.</p>';
    return `<div class="quick-foods">${quick.map((f, i) => `<button type="button" data-act="c-quick" data-idx="${i}" data-date="${date}"><b>${esc(f.name)}</b><span>${FDS.n(f.kcal)} kcal${f.p ? ` · ${FDS.n(f.p)} g protein` : ''}</span></button>`).join('')}</div>`;
  };

  function foodForm(date, m, entry) {
    const e = entry || {};
    const v = x => (x == null || x === 0 && !entry ? '' : x);
    return `<form class="form-grid" data-submit="c-food" autocomplete="off">
      <input type="hidden" name="date" value="${date}"><input type="hidden" name="id" value="${esc(e.id || '')}">
      <label class="field"><span>Meal</span><select class="input" name="meal">${MEALS.map(([k, l]) => `<option value="${k}" ${k === (e.meal || m) ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Calories</span><span class="suffix"><input class="input" name="kcal" type="number" inputmode="numeric" min="0" max="5000" step="1" required value="${v(e.kcal)}"><em>kcal</em></span></label>
      <label class="field full"><span>Food</span><input class="input" name="name" required maxlength="80" placeholder="e.g. Chicken rice bowl" value="${esc(e.name || '')}"></label>
      <div class="full c-macros">
        <label class="field"><span>Protein</span><span class="suffix"><input class="input" name="p" type="number" inputmode="decimal" min="0" step="any" value="${v(e.p)}"><em>g</em></span></label>
        <label class="field"><span>Carbs</span><span class="suffix"><input class="input" name="c" type="number" inputmode="decimal" min="0" step="any" value="${v(e.c)}"><em>g</em></span></label>
        <label class="field"><span>Fat</span><span class="suffix"><input class="input" name="f" type="number" inputmode="decimal" min="0" step="any" value="${v(e.f)}"><em>g</em></span></label>
      </div>
      ${entry ? '' : '<label class="switch full"><span>Save to my foods</span><input type="checkbox" name="save"></label>'}
      <button class="btn btn-primary btn-lg full" type="submit">${entry ? 'Save changes' : 'Add food'}</button>
    </form>`;
  }

  FDS.openFoodSheet = (date, m) => {
    const t = FDS.today();
    date = FDS.validDate(date) && date <= t ? date : t;
    FDS.sheet.open({
      title: 'Add food',
      html: `<div class="stack"><div><p class="label" style="margin-bottom:6px">Quick add</p>${chips(date)}</div>${foodForm(date, m || meal())}</div>`
    });
  };

  FDS.onSubmit['c-food'] = (form, v) => {
    const name = (v.name || '').trim(), kcal = Number(v.kcal);
    if (!name) return FDS.toast('Add a food name.');
    if (v.kcal === '' || isNaN(kcal) || kcal < 0 || kcal > 5000) return FDS.toast('Calories must be between 0 and 5,000.');
    const entry = { id: v.id || FDS.uid(), meal: MEAL_NAME[v.meal] ? v.meal : 'snacks', name, kcal: Math.round(kcal), p: num(v.p), c: num(v.c), f: num(v.f) };
    const inSheet = !!form.closest('.sheet');
    selMeal = entry.meal;
    FDS.commit(s => {
      const list = s.food[v.date] = s.food[v.date] || [];
      const idx = list.findIndex(x => x.id === entry.id);
      if (idx >= 0) list[idx] = entry; else list.push(entry);
      if (v.save === 'on' && !s.foods.some(f => f.name.toLowerCase() === name.toLowerCase())) s.foods.push({ id: FDS.uid(), name, kcal: entry.kcal, p: entry.p, c: entry.c, f: entry.f });
    });
    if (inSheet) FDS.sheet.close();
    FDS.toast(v.id ? 'Food updated' : `Added to ${MEAL_NAME[entry.meal].toLowerCase()}`);
  };

  FDS.act['c-quick'] = el => {
    const f = quick[+el.dataset.idx];
    if (!f) return;
    const sheet = el.closest('.sheet');
    const sel = sheet && sheet.querySelector('select[name="meal"]');
    const m = sel ? sel.value : meal();
    const date = el.dataset.date, id = FDS.uid();
    FDS.commit(s => { (s.food[date] = s.food[date] || []).push({ id, meal: m, name: f.name, kcal: f.kcal, p: f.p || 0, c: f.c || 0, f: f.f || 0 }); });
    if (sheet) FDS.sheet.close();
    FDS.undo(`Added ${f.name}`, () => FDS.commit(s => { s.food[date] = (s.food[date] || []).filter(x => x.id !== id); }));
  };
  FDS.act['c-meal'] = el => { selMeal = el.dataset.value; FDS.refresh(); };
  FDS.act['c-add'] = el => FDS.openFoodSheet(el.dataset.date, el.dataset.meal || meal());
  FDS.act['c-edit'] = el => {
    const e = (FDS.S.food[el.dataset.date] || []).find(x => x.id === el.dataset.id);
    if (e) FDS.sheet.open({ title: 'Edit food', html: foodForm(el.dataset.date, e.meal, e) });
  };
  FDS.act['c-del'] = el => {
    const date = el.dataset.date, list = FDS.S.food[date] || [];
    const idx = list.findIndex(x => x.id === el.dataset.id);
    if (idx < 0) return;
    const e = list[idx];
    FDS.commit(s => { s.food[date].splice(idx, 1); });
    FDS.undo(`Deleted ${e.name}`, () => FDS.commit(s => { (s.food[date] = s.food[date] || []).splice(idx, 0, e); }));
  };
  FDS.act['c-water'] = el => {
    const date = el.dataset.date, n = +el.dataset.n;
    FDS.commit(s => { s.water[date] = (s.water[date] || 0) === n ? n - 1 : n; });
  };
  FDS.act['c-water-step'] = el => {
    const date = el.dataset.date;
    FDS.commit(s => { s.water[date] = Math.max(0, Math.min(30, (s.water[date] || 0) + Number(el.dataset.dir))); });
  };

  // ---------- targets ----------
  function openTargets() {
    const st = FDS.S.settings, nt = FDS.nutritionTargets();
    FDS.sheet.open({
      title: 'Nutrition targets',
      html: `<form class="stack" data-submit="c-targets">
        <p class="small muted">Estimated maintenance is about <b>${FDS.n(nt.est.maintenance)} kcal</b>. The suggested starting target is <b>${FDS.n(nt.est.target)} kcal</b> (a moderate deficit) and <b>${nt.est.protein} g protein</b>. Leave a field empty to use the estimate.</p>
        <div class="form-grid">
          <label class="field"><span>Calories per day</span><span class="suffix"><input class="input" name="kcal" type="number" inputmode="numeric" min="1000" max="6000" placeholder="${nt.est.target}" value="${st.kcalTarget || ''}"><em>kcal</em></span></label>
          <label class="field"><span>Protein per day</span><span class="suffix"><input class="input" name="protein" type="number" inputmode="numeric" min="30" max="400" placeholder="${nt.est.protein}" value="${st.proteinTarget || ''}"><em>g</em></span></label>
          <label class="field full"><span>Water goal</span><span class="suffix"><input class="input" name="water" type="number" inputmode="numeric" min="1" max="16" value="${st.waterGoal}"><em>glasses</em></span></label>
        </div>
        <button class="btn btn-primary btn-lg" type="submit">Save targets</button>
        <button class="btn btn-ghost" type="button" data-act="c-targets-reset">Use the estimate</button>
      </form>`
    });
  }
  FDS.act['c-targets'] = openTargets;
  FDS.onSubmit['c-targets'] = (form, v) => {
    const kcal = v.kcal === '' ? null : Math.round(Number(v.kcal));
    const protein = v.protein === '' ? null : Math.round(Number(v.protein));
    const water = Math.round(Number(v.water) || 8);
    if (kcal != null && (isNaN(kcal) || kcal < 1000 || kcal > 6000)) return FDS.toast('Calories must be between 1,000 and 6,000.');
    if (protein != null && (isNaN(protein) || protein < 30 || protein > 400)) return FDS.toast('Protein must be between 30 and 400 g.');
    FDS.sheet.close();
    FDS.commit(s => { s.settings.kcalTarget = kcal; s.settings.proteinTarget = protein; s.settings.waterGoal = Math.max(1, Math.min(16, water)); });
    const w = FDS.nutritionTargets().warning;
    FDS.toast(w ? 'Saved — but check the warning on your target' : 'Targets saved');
  };
  FDS.act['c-targets-reset'] = () => { FDS.sheet.close(); FDS.commit(s => { s.settings.kcalTarget = null; s.settings.proteinTarget = null; }); FDS.toast('Using the estimate'); };

  // ---------- my foods ----------
  FDS.act['c-myfood-add'] = () => FDS.sheet.open({
    title: 'Add to my foods',
    html: `<form class="form-grid" data-submit="c-myfood">
      <label class="field full"><span>Food and portion</span><input class="input" name="name" required maxlength="80" placeholder="e.g. Greek yogurt (200 g)"></label>
      <label class="field full"><span>Calories</span><span class="suffix"><input class="input" name="kcal" type="number" inputmode="numeric" min="0" max="5000" required><em>kcal</em></span></label>
      <div class="full c-macros">
        <label class="field"><span>Protein</span><span class="suffix"><input class="input" name="p" type="number" inputmode="decimal" min="0" step="any"><em>g</em></span></label>
        <label class="field"><span>Carbs</span><span class="suffix"><input class="input" name="c" type="number" inputmode="decimal" min="0" step="any"><em>g</em></span></label>
        <label class="field"><span>Fat</span><span class="suffix"><input class="input" name="f" type="number" inputmode="decimal" min="0" step="any"><em>g</em></span></label>
      </div>
      <button class="btn btn-primary btn-lg full" type="submit">Save food</button></form>`
  });
  FDS.onSubmit['c-myfood'] = (form, v) => {
    const name = (v.name || '').trim(), kcal = Number(v.kcal);
    if (!name || isNaN(kcal) || kcal < 0 || kcal > 5000) return FDS.toast('Add a name and calories (0–5,000).');
    FDS.sheet.close();
    FDS.commit(s => { s.foods.push({ id: FDS.uid(), name, kcal: Math.round(kcal), p: num(v.p), c: num(v.c), f: num(v.f) }); });
    FDS.toast('Saved to my foods');
  };
  FDS.act['c-myfood-del'] = el => {
    const idx = FDS.S.foods.findIndex(f => f.id === el.dataset.id);
    if (idx < 0) return;
    const f = FDS.S.foods[idx];
    FDS.commit(s => { s.foods.splice(idx, 1); });
    FDS.undo(`Removed ${f.name}`, () => FDS.commit(s => { s.foods.splice(idx, 0, f); }));
  };

  // ---------- page ----------
  FDS.route('food', {
    title: 'Food', nav: 'food',
    render(ctx) {
      const S = FDS.S, date = FDS.queryDate(ctx);
      const entries = S.food[date] || [];
      const tot = L.dayFoodTotals(entries), nt = FDS.nutritionTargets();
      const left = nt.kcal - tot.kcal;
      const water = S.water[date] || 0, wGoal = S.settings.waterGoal;

      const days = [...Array(7)].map((_, i) => L.addDays(date, i - 6));
      const logged = days.filter(d => (S.food[d] || []).length);
      const avgK = logged.length ? logged.reduce((a, d) => a + L.dayFoodTotals(S.food[d]).kcal, 0) / logged.length : null;
      const avgP = logged.length ? logged.reduce((a, d) => a + L.dayFoodTotals(S.food[d]).p, 0) / logged.length : null;

      const meals = MEALS.map(([k, label]) => {
        const items = entries.filter(e => e.meal === k);
        const sub = items.reduce((a, e) => a + (Number(e.kcal) || 0), 0);
        return `<div class="c-meal">
          <div class="c-meal-head"><span class="h3">${label}</span><span class="row"><span class="kcal small">${FDS.n(sub)} kcal</span><button type="button" class="icon-btn" data-act="c-add" data-date="${date}" data-meal="${k}" aria-label="Add to ${label}">${FDS.icon('plus')}</button></span></div>
          ${items.length ? items.map(e => `<div class="food-row"><span class="grow"><span class="h3 c-fname">${esc(e.name)}</span><br><span class="macro">${macro(e) || 'No macros'}</span></span>
              <span class="kcal">${FDS.n(e.kcal)}</span>
              <span class="c-food-actions"><button type="button" class="icon-btn" data-act="c-edit" data-date="${date}" data-id="${e.id}" aria-label="Edit ${esc(e.name)}">${FDS.icon('edit')}</button><button type="button" class="icon-btn" data-act="c-del" data-date="${date}" data-id="${e.id}" aria-label="Delete ${esc(e.name)}">${FDS.icon('trash')}</button></span></div>`).join('')
            : '<p class="small muted c-empty">Nothing logged</p>'}
        </div>`;
      }).join('');

      return `<div data-day="food">
        ${FDS.dateBar(date, d => `#/food?date=${d}`)}
        <div class="grid md2" style="margin-bottom:12px">
          <section class="card">
            <div class="card-head"><span class="eyebrow">Calories</span><button type="button" class="link" data-act="c-targets">Targets</button></div>
            <div class="c-summary">
              ${FDS.ring({ pct: tot.kcal / nt.kcal, big: FDS.n(Math.abs(left)), sub: left >= 0 ? 'kcal left' : 'kcal over', size: 124, label: `${FDS.n(tot.kcal)} of ${FDS.n(nt.kcal)} kcal eaten` })}
              <div class="grow">
                <div><span class="big-num">${FDS.n(tot.kcal)}</span><span class="small muted"> / ${FDS.n(nt.kcal)} kcal</span></div>
                <div><div class="row between small"><b>Protein</b><span class="num">${Math.round(tot.p)} / ${nt.protein} g</span></div>${FDS.bar(tot.p / nt.protein, 'thin')}</div>
                <div class="small muted num">Carbs ${Math.round(tot.c)} g · Fat ${Math.round(tot.f)} g</div>
              </div>
            </div>
            ${nt.warning ? `<div class="note warn small" style="margin-top:12px">${esc(nt.warning)}</div>` : ''}
            <div style="margin-top:14px">
              <div class="row between"><span class="label">Water · ${water} of ${wGoal} glasses</span>
                <span class="row"><button type="button" class="icon-btn" data-act="c-water-step" data-date="${date}" data-dir="-1" aria-label="One less glass">${FDS.icon('minus')}</button><button type="button" class="icon-btn" data-act="c-water-step" data-date="${date}" data-dir="1" aria-label="One more glass">${FDS.icon('plus')}</button></span></div>
              <div class="c-cups">${[...Array(Math.max(wGoal, water))].map((_, i) => `<button type="button" class="c-cup ${i < water ? 'full' : ''}" data-act="c-water" data-date="${date}" data-n="${i + 1}" aria-label="${i + 1} glass${i ? 'es' : ''}"><i></i></button>`).join('')}</div>
            </div>
          </section>
          <section class="card stack">
            <div class="card-head" style="margin:0"><span class="eyebrow">Quick add</span></div>
            ${FDS.seg({ act: 'c-meal', value: meal(), options: MEALS.map(([value, label]) => ({ value, label })), label: 'Meal for quick add' })}
            ${chips(date)}
            <button type="button" class="btn btn-primary btn-lg btn-block c-mob" data-act="c-add" data-date="${date}" data-meal="${meal()}">${FDS.icon('plus')} Add food</button>
            <div class="c-desk">${foodForm(date, meal())}</div>
          </section>
        </div>

        <section class="card" style="margin-bottom:12px"><div class="card-head"><span class="eyebrow">Meals</span><span class="small muted">${entries.length} item${entries.length === 1 ? '' : 's'}</span></div>${meals}</section>

        <div class="grid md2" style="margin-bottom:12px">
          <section class="card">
            <div class="card-head"><span class="eyebrow">Last 7 days</span></div>
            ${FDS.chart.bars({ height: 170, target: nt.kcal, label: 'Calories per day', empty: 'No meals logged this week', points: days.map(d => { const k = L.dayFoodTotals(S.food[d]).kcal; return { label: FDS.DOW[L.dow(d)].slice(0, 2), y: k, hit: k > 0 && k <= nt.kcal }; }) })}
            <div class="stats s3" style="margin-top:10px">
              <div class="stat"><b>${avgK != null ? FDS.n(avgK) : '—'}</b><span>Avg kcal</span></div>
              <div class="stat"><b>${avgP != null ? FDS.n(avgP) + ' g' : '—'}</b><span>Avg protein</span></div>
              <div class="stat"><b>${logged.length}/7</b><span>Days logged</span></div>
            </div>
          </section>
          <section class="card">
            <div class="card-head"><span class="eyebrow">Your targets</span><button type="button" class="btn btn-sm" data-act="c-targets">Edit</button></div>
            <div class="stats"><div class="stat"><b>${FDS.n(nt.kcal)}</b><span>kcal / day${nt.custom ? ' (custom)' : ''}</span></div><div class="stat"><b>${nt.protein} g</b><span>protein / day</span></div></div>
            <ul class="ul small" style="margin-top:12px">
              <li>Estimated maintenance ≈ <b>${FDS.n(nt.est.maintenance)} kcal</b>, based on your height, weight, age and 5 training days.</li>
              <li>Suggested start ≈ maintenance − 500 kcal. That’s a moderate deficit, not a crash diet.</li>
              <li>Protein ≈ 1.8 g per kg of goal weight helps you keep muscle while losing fat.</li>
              <li>This is a starting point. After 2–3 weeks, adjust by 100–200 kcal based on your weight trend, not day-to-day changes.</li>
              ${FDS.S.profile.sex ? '' : '<li>Add your sex in <a href="#/settings">Settings</a> for a more accurate estimate.</li>'}
            </ul>
          </section>
        </div>

        <section class="card">
          <div class="card-head"><span class="eyebrow">My foods</span><button type="button" class="btn btn-sm" data-act="c-myfood-add">${FDS.icon('plus')} Add</button></div>
          ${S.foods.length ? `<div class="list">${S.foods.map(f => `<div class="list-row"><span class="grow"><span class="h3 c-fname">${esc(f.name)}</span><br><span class="macro">${FDS.n(f.kcal)} kcal${macro(f) ? ' · ' + macro(f) : ''}</span></span><button type="button" class="icon-btn" data-act="c-myfood-del" data-id="${f.id}" aria-label="Remove ${esc(f.name)}">${FDS.icon('trash')}</button></div>`).join('')}</div>`
            : '<p class="small muted">Save foods you eat often for one-tap logging.</p>'}
        </section>
      </div>`;
    },
    mount(ctx) {
      if (ctx.query.get('edit') === 'targets') {
        history.replaceState(null, '', '#/food');
        openTargets();
      }
    }
  });
})();
