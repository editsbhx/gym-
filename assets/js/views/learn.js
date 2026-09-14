/* How to train: short beginner guides with an "in the gym" takeaway, plus the safety disclaimer. */
(function () {
  const TOPICS = [
    { key: 'overload', title: 'Progressive overload', body: `
      <p>Muscles grow and stay strong when you slowly ask a little more of them over time. This plan uses <b>double progression</b>:</p>
      <ol class="ol"><li>Every exercise has a rep range, like 3 × 8–12.</li><li>Keep the same weight and add reps each session until you hit the top of the range on <b>every</b> set, with good form and RIR 2–3.</li><li>Then add the smallest weight step (usually 1–2.5 kg). Your reps drop, and you build back up.</li></ol>
      <p><b>Example:</b> 12 / 12 / 12 → add a little weight next time. 10 / 9 / 8 → keep the weight and try to beat those reps.</p>
      <p>Never make big jumps. While losing fat, holding your strength is already a win.</p>`, take: 'Beat last time by one rep or a small amount of weight — the app tells you which.' },
    { key: 'rir', title: 'RIR · reps in reserve', body: `
      <p>RIR is how many more clean reps you could have done when you stopped the set.</p>
      <p><b>RIR 3 = you could do about 3 more clean reps.</b> RIR 0 means you couldn’t do another.</p>
      <p>Finish most working sets with about <b>2–3 reps left</b>. Don’t train every set to failure. It adds fatigue and injury risk without much extra benefit.</p>
      <p>Signs you’re close: reps slow down, you have to push hard, and your form wants to change.</p>`, take: 'Stop when you have 2–3 good reps left, and log your RIR.' },
    { key: 'form', title: 'Proper form', body: `
      <ul class="ul"><li>Set machines up properly: seat height, pads and handles. Each exercise page explains how.</li><li>Control the weight on the way down (2–3 seconds). Don’t let it drop.</li><li>Use the full range of motion you can control.</li><li>If you have to swing, bounce or arch to move the weight, it’s too heavy.</li></ul>`, take: 'Form first, weight second. Every rep should look the same.' },
    { key: 'rest', title: 'Rest periods', body: `
      <ul class="ul"><li><b>Big compound and machine lifts</b> (presses, rows, pulldowns, leg press): 2–3 minutes.</li><li><b>Isolation</b> (raises, curls, pushdowns, flys): 60–90 seconds.</li><li><b>Core</b>: 45–60 seconds.</li></ul>
      <p>Resting long enough lets you repeat good reps, which matters more than keeping your heart rate up. The rest timer starts automatically after each set.</p>`, take: 'Use the rest timer. Resting too little usually means fewer reps.' },
    { key: 'warmup', title: 'Warm-up', body: `
      <ol class="ol"><li><b>General:</b> 5–8 minutes of easy walking, cycling or elliptical.</li><li><b>Dynamic:</b> 3–5 minutes of controlled movements for the muscles you’re training.</li><li><b>Warm-up sets:</b> before the first big exercise, 2–3 lighter sets building up to your working weight (about 50%, 70% and 85%).</li></ol>
      <p>Warm-up sets don’t count as working sets. They should never feel tiring.</p>`, take: 'About 10–15 minutes before every workout. The workout screen walks you through it.' },
    { key: 'recovery', title: 'Recovery', body: `
      <p>You get fitter between workouts, not during them. Recovery comes from sleep, enough food and protein, managing stress, and not doing too much.</p>
      <p>Use the daily check-in. If you’re very tired or sore, keep cardio easy and stop sets with an extra rep or two left.</p>`, take: 'Some soreness is normal. Sharp pain is not — stop and get it checked.' },
    { key: 'sleep', title: 'Sleep', body: `
      <p>Aim for about <b>7–9 hours</b>. Poor sleep makes workouts feel harder, increases hunger and slows recovery.</p>
      <ul class="ul"><li>Keep a regular bedtime and wake time, even on weekends.</li><li>Dim screens for the last 30–60 minutes before bed.</li><li>Avoid caffeine in the late afternoon and evening.</li></ul>`, take: 'Protect your sleep like a workout.' },
    { key: 'hydration', title: 'Hydration', body: `
      <p>Drink water regularly through the day, and more when you train, sweat or it’s hot. A simple check: urine that’s pale yellow usually means you’re drinking enough.</p>
      <p>Bring a water bottle to the gym and sip between sets. There’s no need to force huge amounts.</p>`, take: 'Carry a bottle and sip between sets.' },
    { key: 'consistency', title: 'Consistency', body: `
      <p>Showing up most weeks for months beats a perfect week followed by burnout. Missed a session? Just carry on with the next one. Don’t try to cram it in or punish yourself with cardio.</p>
      <p>Progress isn’t a straight line. Weight moves up and down day to day, and strength has good and bad days. Look at trends over weeks.</p>`, take: 'The best plan is the one you keep doing.' },
    { key: 'cardio', title: 'Steps vs cardio', body: `
      <p><b>Steps</b> are all your movement in a day. Your target is 10,000 in total, built up gradually. <b>Cardio</b> is a focused session at moderate effort.</p>
      <p>Treadmill and walking steps count toward the same 10,000. If you already hit your steps, extra cardio isn’t needed — a 10–15 minute easy cooldown is enough. If steps are low, 20–40 minutes of moderate cardio after weights can help. Keep it lighter on leg day.</p>`, take: 'Cardio is optional and depends on your steps. It’s never a punishment.', link: '#/activity?tab=cardio' },
    { key: 'deload', title: 'Deload', body: `
      <p>A deload is an easier week. It can help if you notice persistent fatigue, declining performance, poor recovery, excessive soreness, poor sleep, or several workouts without improvement.</p>
      <p>Reduce volume and/or intensity by about <b>20–30%</b> for around one week. You don’t need one on a fixed schedule.</p>`, take: 'Feeling run down and stuck? Try an easier week, then build back up.', link: '#/recovery' },
    { key: 'nutrition', title: 'Nutrition basics', body: `
      <ul class="ul"><li>Fat loss needs a calorie deficit. A <b>moderate</b> one (around 500 kcal below maintenance) is easier to stick to and helps you keep muscle.</li><li>Eat enough protein every day, spread across meals.</li><li>Base meals on minimally processed foods, vegetables and fruit, but no food is forbidden.</li><li>Avoid crash diets and very low calorie targets. They hurt training, recovery and mood, and are hard to keep up.</li><li>Change your intake based on your 2–3 week weight trend, not a single weigh-in.</li></ul>
      <p class="small muted">Results vary between people, and this app can’t promise a specific amount of weight loss. How your skin adapts depends on factors like genetics and age, so no plan can guarantee to prevent loose skin. Gradual loss while keeping muscle is a sensible approach.</p>`, take: 'Moderate deficit, plenty of protein, patience.', link: '#/food' },
    { key: 'safety', title: 'Safety', body: `
      <ul class="ul"><li>Stop an exercise if there is sharp or unusual pain.</li><li>Do not sacrifice form to lift heavier weight.</li><li>Do not try to compensate for missed workouts by excessively increasing cardio.</li><li>If you experience dizziness, fainting, unusual chest symptoms, severe pain or other concerning symptoms, stop exercising and seek appropriate medical attention.</li><li>If you have a medical condition or injury, check with a doctor or physiotherapist before starting.</li></ul>`, take: 'When in doubt, stop and ask a professional.' }
  ];

  FDS.route('learn', {
    title: 'How to train', nav: 'learn',
    render(ctx) {
      const open = ctx.query.get('topic');
      return `<div class="page-head"><div><p class="eyebrow">Beginner guide</p><h1>How to train</h1></div></div>
      <section class="card d-safety" style="margin-bottom:14px">
        <div class="row" style="margin-bottom:8px">${FDS.icon('alert', 'd-alert')}<b>Safety first</b></div>
        <ul class="ul small">
          <li>Stop an exercise if there is <b>sharp or unusual pain</b>.</li>
          <li>Do not sacrifice form to lift heavier weight.</li>
          <li>Do not try to make up for missed workouts with lots of extra cardio.</li>
          <li>If you feel <b>dizzy, faint, have unusual chest symptoms or severe pain</b>, stop exercising and seek medical attention.</li>
        </ul>
        <p class="tiny muted" style="margin-top:8px">This app gives general guidance, not medical advice.</p>
      </section>
      <section class="card">
        ${TOPICS.map(tp => `<details class="acc" id="topic-${tp.key}" ${open === tp.key ? 'open' : ''}><summary>${tp.title}</summary><div class="acc-body">${tp.body}
          <div class="note small"><strong>In the gym:</strong> ${tp.take}${tp.link ? ` <a href="${tp.link}">Open</a>` : ''}</div></div></details>`).join('')}
      </section>`;
    },
    mount(ctx, view) {
      const tp = ctx.query.get('topic');
      const el = tp && view.querySelector(`#topic-${CSS.escape(tp)}`);
      if (el) setTimeout(() => el.scrollIntoView({ block: 'start', behavior: 'smooth' }), 50);
    }
  });
})();
