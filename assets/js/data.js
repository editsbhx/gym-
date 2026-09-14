/* Plan, exercise library and teaching content. No logic here. */
(function (root) {
  const REST = {
    compound: { label: '2–3 min', why: 'Big multi-joint lift — rest long enough to repeat your reps.' },
    isolation: { label: '60–90 sec', why: 'Smaller single-joint movement — shorter rest is enough.' },
    core: { label: '45–60 sec', why: 'Core work — short rest keeps the session moving.' }
  };

  const GENERIC_WEIGHT_CHECK = [
    'Right weight: you reach the rep range with clean form and about 2–3 reps left in the tank (RIR 2–3).',
    'Too heavy: you can’t reach the bottom of the rep range, or your form breaks down to get there.',
    'Too light: you hit the top of the range and could still do 5 or more clean reps.'
  ];

  // type: compound | isolation | core. inc = smallest sensible jump in kg (lb handled in logic).
  const EXERCISES = {
    'machine-chest-press': {
      name: 'Machine Chest Press', type: 'compound', inc: 2.5, img: 'MON/m1.jpg',
      muscles: 'Chest (pecs), front shoulders, triceps',
      equipment: 'Seated chest press machine',
      how: [
        'Set the seat so the handles line up with the middle of your chest.',
        'Sit tall with your back and head against the pad, feet flat on the floor.',
        'Grip the handles and set your shoulder blades slightly back and down.',
        'Press forward until your arms are nearly straight — don’t slam the elbows locked.',
        'Bring the handles back slowly (2–3 seconds) until you feel a light stretch in your chest.'
      ],
      form: ['Elbows about 45° from your body, not flared straight out.', 'Back stays on the pad for the whole set.', 'Control the return — the weight stack should not clang.'],
      mistakes: ['Seat too high or low, so the handles sit at your neck or belly.', 'Shoulders rolling forward at the end of each rep.', 'Bouncing the stack between reps.', 'Cutting the range short to lift heavier.'],
      breathing: 'Breathe in as the handles come toward you. Breathe out as you press.',
      alt: 'Dumbbell bench press on a flat bench, or push-ups (hands on a bench to make them easier).'
    },
    'incline-db-press': {
      name: 'Incline Dumbbell Press', type: 'compound', inc: 2, perHand: true, img: 'MON/m2.jpg',
      muscles: 'Upper chest, front shoulders, triceps',
      equipment: 'Adjustable bench set to 30–45°, pair of dumbbells',
      how: [
        'Set the bench to a low incline, around 30°.',
        'Sit with the dumbbells on your thighs, lie back, and kick them up one at a time to shoulder level.',
        'Plant your feet and squeeze your shoulder blades together.',
        'Press the dumbbells up and slightly in, over your upper chest.',
        'Lower them slowly until they sit beside your upper chest.'
      ],
      form: ['Wrists stacked over elbows.', 'Elbows angled about 45°, not flared to 90°.', 'Hips stay on the bench.'],
      mistakes: ['Bench set too steep, turning it into a shoulder press.', 'Dropping the dumbbells fast at the bottom.', 'Clanging the dumbbells together at the top.', 'Lifting the hips to push heavier.'],
      breathing: 'Breathe in as you lower. Breathe out as you press up.',
      alt: 'Incline machine press, or incline Smith machine press.',
      weightNote: 'Log the weight of one dumbbell.'
    },
    'pec-deck': {
      name: 'Pec Deck', type: 'isolation', inc: 2.5, img: 'MON/m3.jpg',
      muscles: 'Chest (pecs)',
      equipment: 'Pec deck / chest fly machine',
      how: [
        'Set the seat so the handles are at chest height.',
        'Sit tall with your back on the pad and a slight bend in your elbows.',
        'Bring the handles together in a wide hugging arc in front of your chest.',
        'Squeeze for a second, then open slowly until you feel a stretch across your chest.'
      ],
      form: ['Keep the same slight elbow bend throughout.', 'Chest up, shoulders down away from your ears.', 'Move at the shoulder — don’t press with the elbows.'],
      mistakes: ['Opening too far behind the body, which strains the shoulders.', 'Bending and straightening the elbows so it becomes a press.', 'Swinging the handles together with momentum.'],
      breathing: 'Breathe out as you squeeze the handles together. Breathe in as they open.',
      alt: 'Cable fly, or a light dumbbell fly on a flat bench.'
    },
    'machine-shoulder-press': {
      name: 'Machine Shoulder Press', type: 'compound', inc: 2.5, img: 'MON/m4.jpg',
      muscles: 'Front and side shoulders, triceps',
      equipment: 'Seated shoulder press machine',
      how: [
        'Adjust the seat so the handles start around shoulder height.',
        'Sit with your back against the pad, feet flat, stomach braced.',
        'Press the handles overhead until your arms are nearly straight.',
        'Lower slowly back to shoulder level.'
      ],
      form: ['Lower back stays against the pad.', 'Wrists straight, forearms roughly vertical.', 'Head neutral against the pad.'],
      mistakes: ['Arching the back to push heavier weight.', 'Seat so low that you start far below the shoulders.', 'Only doing the top half of each rep.'],
      breathing: 'Breathe out as you press up. Breathe in as you lower.',
      alt: 'Seated dumbbell shoulder press on a bench with back support.'
    },
    'lateral-raise': {
      name: 'Lateral Raise', type: 'isolation', inc: 1, perHand: true, img: 'MON/m5.jpg',
      muscles: 'Side shoulders (lateral delts)',
      equipment: 'Pair of light dumbbells',
      how: [
        'Stand tall with light dumbbells at your sides and a slight bend in your elbows.',
        'Lean forward a little.',
        'Raise the dumbbells out to the sides until your arms reach shoulder height.',
        'Pause briefly, then lower slowly over 2–3 seconds.'
      ],
      form: ['Lead with your elbows, not your hands.', 'Stop at shoulder height.', 'Shoulders stay down — no shrugging.'],
      mistakes: ['Swinging the body because the weight is too heavy.', 'Shrugging toward the ears.', 'Dropping the weights on the way down.'],
      breathing: 'Breathe out as you raise. Breathe in as you lower.',
      alt: 'Single-arm cable lateral raise, or a lateral raise machine.',
      weightNote: 'Log the weight of one dumbbell. This lift uses light weights — if you have to swing, go lighter.'
    },
    'triceps-pushdown': {
      name: 'Cable Triceps Pushdown', type: 'isolation', inc: 2.5, img: 'MON/m6.jpg',
      muscles: 'Triceps',
      equipment: 'Cable machine, high pulley, rope or straight bar',
      how: [
        'Set the pulley at the top and attach a rope or bar.',
        'Stand close, grip the handle, elbows tucked at your sides.',
        'Push down until your arms are straight; spread the rope ends slightly at the bottom.',
        'Let the handle rise slowly until your forearms are just above parallel to the floor.'
      ],
      form: ['Elbows stay pinned to your sides.', 'Slight forward lean, chest up.', 'Only the forearms move.'],
      mistakes: ['Elbows drifting forward so the shoulders take over.', 'Leaning your body weight onto the handle.', 'Letting the cable pull your hands up to your face.'],
      breathing: 'Breathe out as you push down. Breathe in as the handle rises.',
      alt: 'Dumbbell overhead triceps extension, or bench dips with feet on the floor.'
    },
    'lat-pulldown': {
      name: 'Lat Pulldown', type: 'compound', inc: 2.5, img: 'TUE/t1.jpg',
      muscles: 'Upper back (lats), biceps, rear shoulders',
      equipment: 'Lat pulldown machine with a wide bar',
      how: [
        'Adjust the thigh pad so your legs are held snugly.',
        'Grip the bar slightly wider than shoulder width, palms facing away.',
        'Sit down, lean back a little, chest up.',
        'Pull the bar to your upper chest by driving your elbows down and back.',
        'Let the bar rise slowly until your arms are straight and you feel a stretch.'
      ],
      form: ['Think “elbows to back pockets”.', 'Chest rises to meet the bar.', 'Full stretch at the top of every rep.'],
      mistakes: ['Pulling the bar behind the neck.', 'Leaning far back and swinging.', 'Only pulling halfway down.', 'Letting the bar snap back up.'],
      breathing: 'Breathe out as you pull down. Breathe in as the bar rises.',
      alt: 'Assisted pull-up machine, or a single-arm cable pulldown.'
    },
    'seated-cable-row': {
      name: 'Seated Cable Row', type: 'compound', inc: 2.5, img: 'TUE/t2.jpg',
      muscles: 'Middle back, lats, rear shoulders, biceps',
      equipment: 'Seated cable row station with a close-grip handle',
      how: [
        'Sit with your feet on the platform and knees slightly bent.',
        'Grab the handle and sit tall with your arms extended.',
        'Pull the handle to your lower ribs, squeezing your shoulder blades together.',
        'Return slowly until your arms are straight and your shoulders reach forward a little.'
      ],
      form: ['Torso stays mostly upright — small movement only.', 'Chest up; don’t round the lower back.', 'Elbows travel close to your body.'],
      mistakes: ['Rocking far back and forth to move the weight.', 'Shrugging the shoulders up.', 'Rounding the lower back at the stretch.'],
      breathing: 'Breathe out as you pull. Breathe in as you return.',
      alt: 'Machine row, or a single-arm dumbbell row with one hand on a bench.'
    },
    'chest-supported-row': {
      name: 'Chest-Supported Row', type: 'compound', inc: 2.5, img: 'TUE/t3.jpg',
      muscles: 'Middle back, lats, rear shoulders',
      equipment: 'Chest-supported row machine, or an incline bench with dumbbells',
      how: [
        'Set the chest pad (or an incline bench at 30–45°).',
        'Lie face-down with your chest on the pad, feet on the floor.',
        'Let the handles or dumbbells hang straight down.',
        'Row toward your hips, squeezing your shoulder blades together.',
        'Lower slowly to a full stretch.'
      ],
      form: ['Chest stays on the pad the whole set.', 'Neck neutral — look slightly down.', 'Pull elbows back, not up toward your ears.'],
      mistakes: ['Lifting the chest off the pad to heave the weight.', 'Shrugging instead of rowing.', 'Short, jerky reps.'],
      breathing: 'Breathe out as you row. Breathe in as you lower.',
      alt: 'Seated machine row, or a single-arm dumbbell row. The photo shows how to set up a supported row: hips back, chest over the weights.',
      weightNote: 'With dumbbells, log the weight of one dumbbell.'
    },
    'face-pull': {
      name: 'Face Pull', type: 'isolation', inc: 2.5, img: 'TUE/t4.jpg',
      muscles: 'Rear shoulders, upper back, rotator cuff',
      equipment: 'Cable machine with a rope, pulley at face height',
      how: [
        'Set the pulley at upper-chest to face height and attach a rope.',
        'Hold both rope ends with your thumbs pointing back toward you.',
        'Step back so the cable is tight and stand tall.',
        'Pull the rope toward your face, pulling the ends apart with elbows high.',
        'Finish with your hands beside your ears, then return slowly.'
      ],
      form: ['Elbows at or above shoulder height.', 'Squeeze the shoulder blades together at the end.', 'Keep it light and controlled.'],
      mistakes: ['Going heavy and leaning back.', 'Pulling to the chest with low elbows (that’s a row).', 'Shrugging toward the ears.'],
      breathing: 'Breathe out as you pull. Breathe in as you return.',
      alt: 'Band pull-aparts, or the reverse pec deck.'
    },
    'db-curl': {
      name: 'Dumbbell Curl', type: 'isolation', inc: 2, perHand: true, img: 'TUE/t5.jpg',
      muscles: 'Biceps',
      equipment: 'Pair of dumbbells',
      how: [
        'Stand tall with dumbbells at your sides, palms facing forward.',
        'Keep your elbows by your sides.',
        'Curl the dumbbells up toward your shoulders.',
        'Squeeze, then lower slowly until your arms are fully straight.'
      ],
      form: ['Upper arms stay still.', 'Lower over 2–3 seconds.', 'Wrists straight.'],
      mistakes: ['Swinging the torso to get the weight up.', 'Elbows drifting forward.', 'Not straightening the arms at the bottom.'],
      breathing: 'Breathe out as you curl up. Breathe in as you lower.',
      alt: 'Cable curl, or EZ-bar curl.',
      weightNote: 'Log the weight of one dumbbell.'
    },
    'hammer-curl': {
      name: 'Hammer Curl', type: 'isolation', inc: 2, perHand: true, img: 'TUE/t6.jpg',
      muscles: 'Biceps, brachialis, forearms',
      equipment: 'Pair of dumbbells',
      how: [
        'Stand tall with dumbbells at your sides, palms facing each other (thumbs up).',
        'Keep your elbows by your sides.',
        'Curl the dumbbells up, keeping thumbs pointing up the whole time.',
        'Lower slowly until your arms are straight.'
      ],
      form: ['Palms face each other throughout.', 'Upper arms stay still.', 'Controlled lowering.'],
      mistakes: ['Swinging the body.', 'Rotating the palms up mid-rep.', 'Rushing the lowering.'],
      breathing: 'Breathe out as you curl up. Breathe in as you lower.',
      alt: 'Rope cable hammer curl.',
      weightNote: 'Log the weight of one dumbbell.'
    },
    'leg-press': {
      name: 'Leg Press', type: 'compound', inc: 5, img: 'WED/w1.jpg',
      muscles: 'Quads, glutes, hamstrings',
      equipment: 'Leg press machine',
      how: [
        'Sit with your back and hips flat against the pad.',
        'Place your feet shoulder-width apart in the middle of the platform.',
        'Release the safety handles.',
        'Lower the platform by bending your knees to about 90°, or as deep as you can keep your lower back on the pad.',
        'Push through your whole foot to straighten your legs without snapping the knees locked.',
        'Put the safety handles back on when you finish.'
      ],
      form: ['Knees track in line with your toes.', 'Hips and lower back never lift off the pad.', 'Push through heels and mid-foot.'],
      mistakes: ['Going so deep the hips curl up off the pad.', 'Locking the knees out hard.', 'Knees caving inward.', 'Loading heavy and doing tiny reps.'],
      breathing: 'Breathe in as you lower. Breathe out as you push.',
      alt: 'Hack squat machine, goblet squat, or Smith machine squat.'
    },
    'leg-curl': {
      name: 'Leg Curl', type: 'isolation', inc: 2.5, img: 'WED/w2.jpg',
      muscles: 'Hamstrings',
      equipment: 'Lying or seated leg curl machine',
      how: [
        'Adjust the pad so it sits just above your heels.',
        'Line your knees up with the machine’s pivot point.',
        'Curl your heels toward your glutes.',
        'Squeeze, then lower slowly until your legs are almost straight.'
      ],
      form: ['Hips stay pressed into the pad.', 'Smooth, controlled motion.', 'Full range on every rep.'],
      mistakes: ['Hips lifting to swing the weight.', 'Letting the weight drop.', 'Pad sitting on the ankles or behind the knees.'],
      breathing: 'Breathe out as you curl. Breathe in as you lower.',
      alt: 'Seated leg curl, or light dumbbell Romanian deadlifts.'
    },
    'leg-extension': {
      name: 'Leg Extension', type: 'isolation', inc: 2.5, img: 'WED/w3.jpg',
      muscles: 'Quads',
      equipment: 'Leg extension machine',
      how: [
        'Adjust the back pad so your knees line up with the machine’s pivot.',
        'Set the shin pad just above your ankles.',
        'Hold the side handles and sit tall.',
        'Straighten your legs until almost locked and squeeze your quads.',
        'Lower slowly back to about 90°.'
      ],
      form: ['Knees lined up with the pivot.', 'Brief pause at the top.', 'Controlled lowering.'],
      mistakes: ['Kicking the weight up with momentum.', 'Hips lifting off the seat.', 'Dropping the weight.'],
      breathing: 'Breathe out as you straighten. Breathe in as you lower.',
      alt: 'Goblet squat, or split squat.'
    },
    'calf-raise': {
      name: 'Calf Raise', type: 'isolation', inc: 2.5, img: 'WED/w4.jpg',
      muscles: 'Calves',
      equipment: 'Calf raise machine, or dumbbells and a step',
      how: [
        'Stand with the balls of your feet on a step or platform, heels hanging off.',
        'Hold a dumbbell or a rail for balance.',
        'Lower your heels slowly into a deep stretch.',
        'Rise as high as you can onto your toes.',
        'Pause for a second at the top and at the bottom.'
      ],
      form: ['Knees soft but mostly straight.', 'Full stretch and full squeeze each rep.', 'Slow tempo — no bouncing.'],
      mistakes: ['Bouncing at the bottom.', 'Half reps.', 'Bending the knees to help.'],
      breathing: 'Breathe out as you rise. Breathe in as you lower.',
      alt: 'Calf raises on the leg press machine, or single-leg bodyweight calf raises.'
    },
    'cable-crunch': {
      name: 'Cable Crunch', type: 'core', inc: 2.5, img: 'WED/w5.jpg',
      muscles: 'Abs',
      equipment: 'Cable machine, high pulley, rope',
      how: [
        'Attach a rope to the high pulley and kneel facing the machine.',
        'Hold the rope ends beside your head.',
        'Keep your hips still and crunch down, bringing your ribs toward your hips.',
        'Squeeze your abs, then come back up slowly.'
      ],
      form: ['Hips stay above your knees — don’t sit back.', 'Round the spine; it’s a crunch, not a bow.', 'Hands stay fixed beside your head.'],
      mistakes: ['Pulling with the arms.', 'Sitting back onto the heels to use body weight.', 'Going heavy and jerking.'],
      breathing: 'Breathe out hard as you crunch. Breathe in on the way up.',
      alt: 'Ab crunch machine, or floor crunches.'
    },
    'dead-bug': {
      name: 'Dead Bug', type: 'core', inc: 0, bodyweight: true, img: 'WED/w6.png',
      muscles: 'Deep core — keeps your lower back stable',
      equipment: 'Floor mat',
      how: [
        'Lie on your back with your arms pointing at the ceiling.',
        'Lift your legs with knees bent at 90° over your hips.',
        'Gently press your lower back into the floor.',
        'Slowly lower one arm and the opposite leg toward the floor.',
        'Return and switch sides. Each side counts as one rep — do 10 per side.'
      ],
      form: ['Lower back stays in contact with the floor.', 'About 3 seconds out, 3 seconds back.', 'Ribs down, breathing steady.'],
      mistakes: ['Lower back arching off the floor.', 'Rushing the reps.', 'Holding your breath.'],
      breathing: 'Breathe out as the arm and leg reach away. Breathe in as they come back.',
      alt: 'Bird dog, or a forearm plank for 20–30 seconds.',
      weightNote: 'Bodyweight only. Make it harder with slower reps or a pause at full reach — not by adding load.'
    },
    'incline-machine-press': {
      name: 'Incline Machine Press', type: 'compound', inc: 2.5, img: 'THUR/th1.jpg',
      muscles: 'Upper chest, front shoulders, triceps',
      equipment: 'Incline chest press machine',
      how: [
        'Set the seat so the handles line up with your upper chest.',
        'Sit with your back against the pad, feet flat.',
        'Set your shoulder blades back and down.',
        'Press up and forward until your arms are nearly straight.',
        'Return slowly until you feel a stretch in your upper chest.'
      ],
      form: ['Elbows about 45° from your body.', 'Back and head stay on the pad.', 'Slow, controlled return.'],
      mistakes: ['Seat set so the handles are at your neck.', 'Shoulders rolling forward.', 'Short, bouncy reps.'],
      breathing: 'Breathe in as the handles return. Breathe out as you press.',
      alt: 'Incline dumbbell press, or low-incline Smith machine press.'
    },
    'cable-fly': {
      name: 'Cable Fly', type: 'isolation', inc: 2.5, img: 'THUR/th3.jpg',
      muscles: 'Chest',
      equipment: 'Cable crossover station with two handles',
      how: [
        'Set both pulleys at about shoulder height and take a handle in each hand.',
        'Step forward into a staggered stance with a slight lean.',
        'With a small bend in your elbows, bring the handles together in front of your chest.',
        'Squeeze, then open slowly until you feel a stretch across your chest.'
      ],
      form: ['Elbow bend stays fixed.', 'Chest up, shoulders back and down.', 'Body stays still — no rocking.'],
      mistakes: ['Going heavy so it turns into a press.', 'Arms travelling far behind the body.', 'Narrow stance that pulls you backward.'],
      breathing: 'Breathe out as the handles come together. Breathe in as they open.',
      alt: 'Pec deck, or a light dumbbell fly.'
    },
    'overhead-triceps-ext': {
      name: 'Overhead Triceps Extension', type: 'isolation', inc: 2, img: 'THUR/th6.jpg',
      muscles: 'Triceps (especially the long head)',
      equipment: 'One dumbbell, or a cable with a rope',
      how: [
        'Sit on a bench with back support and hold one dumbbell with both hands under the top plate.',
        'Press it overhead until your arms are straight.',
        'Keeping your upper arms near your head, lower the dumbbell slowly behind your head.',
        'Straighten your arms to lift it back up.'
      ],
      form: ['Elbows point forward, not flared wide.', 'Ribs down — don’t arch your back.', 'Slow stretch at the bottom.'],
      mistakes: ['Elbows flaring out.', 'Arching the lower back.', 'Bouncing out of the bottom.'],
      breathing: 'Breathe in as you lower. Breathe out as you straighten.',
      alt: 'Rope cable overhead extension, or a triceps pushdown.'
    },
    'rear-delt-fly': {
      name: 'Rear-Delt Fly', type: 'isolation', inc: 2.5, img: 'Fri/f5.jpg',
      muscles: 'Rear shoulders, upper back',
      equipment: 'Reverse pec deck machine (or light dumbbells)',
      how: [
        'Sit facing the pec deck pad with the handles set to the rear position.',
        'Hold the handles with arms straight in front of you at shoulder height.',
        'Sweep your arms out and back in a wide arc until they’re in line with your body.',
        'Pause, then return slowly.'
      ],
      form: ['Slight, fixed bend in the elbows.', 'Chest stays on the pad.', 'Think “push the handles out wide”.'],
      mistakes: ['Jerking a heavy weight back.', 'Shrugging.', 'Bending the elbows so it becomes a row.'],
      breathing: 'Breathe out as your arms open. Breathe in as they return.',
      alt: 'Bent-over dumbbell reverse fly with chest on an incline bench, or face pulls.'
    }
  };

  const s = (id, sets, min, max, img, extra) => Object.assign({ id, sets, min, max, img }, extra || {});

  // Keys follow the working week. dow: 0 = Monday ... 6 = Sunday.
  const PLAN = [
    { key: 'mon', dow: 0, day: 'Monday', title: 'Push A', focus: 'Chest, shoulders, triceps', kind: 'push', color: 'push', warm: 'push',
      ex: [s('machine-chest-press', 3, 8, 12, 'MON/m1.jpg'), s('incline-db-press', 3, 8, 12, 'MON/m2.jpg'), s('pec-deck', 3, 10, 15, 'MON/m3.jpg'),
           s('machine-shoulder-press', 3, 8, 12, 'MON/m4.jpg'), s('lateral-raise', 3, 12, 15, 'MON/m5.jpg'), s('triceps-pushdown', 3, 10, 15, 'MON/m6.jpg')] },
    { key: 'tue', dow: 1, day: 'Tuesday', title: 'Pull A', focus: 'Back, rear delts, biceps', kind: 'pull', color: 'pull', warm: 'pull',
      ex: [s('lat-pulldown', 3, 8, 12, 'TUE/t1.jpg'), s('seated-cable-row', 3, 8, 12, 'TUE/t2.jpg'), s('chest-supported-row', 3, 10, 12, 'TUE/t3.jpg'),
           s('face-pull', 3, 12, 15, 'TUE/t4.jpg'), s('db-curl', 3, 10, 12, 'TUE/t5.jpg'), s('hammer-curl', 3, 10, 12, 'TUE/t6.jpg')] },
    { key: 'wed', dow: 2, day: 'Wednesday', title: 'Legs + Core', focus: 'Quads, hamstrings, calves, abs', kind: 'legs', color: 'legs', warm: 'legs',
      ex: [s('leg-press', 3, 8, 12, 'WED/w1.jpg'), s('leg-curl', 3, 10, 12, 'WED/w2.jpg'), s('leg-extension', 3, 10, 15, 'WED/w3.jpg'),
           s('calf-raise', 3, 12, 15, 'WED/w4.jpg'), s('cable-crunch', 3, 12, 15, 'WED/w5.jpg'), s('dead-bug', 3, 10, 10, 'WED/w6.png', { each: true })] },
    { key: 'thu', dow: 3, day: 'Thursday', title: 'Push B', focus: 'Upper chest, shoulders, triceps', kind: 'push', color: 'push', warm: 'push',
      ex: [s('incline-machine-press', 3, 8, 12, 'THUR/th1.jpg'), s('machine-chest-press', 3, 10, 12, 'THUR/th2.jpg'), s('cable-fly', 2, 12, 15, 'THUR/th3.jpg'),
           s('lateral-raise', 3, 12, 15, 'THUR/th4.jpg'), s('triceps-pushdown', 3, 10, 15, 'THUR/th5.jpg'), s('overhead-triceps-ext', 2, 10, 15, 'THUR/th6.jpg')] },
    { key: 'fri', dow: 4, day: 'Friday', title: 'Pull B + Legs', focus: 'Back, legs, rear delts, biceps', kind: 'pulllegs', color: 'combo', warm: 'pulllegs',
      ex: [s('lat-pulldown', 3, 8, 12, 'Fri/f1.jpg'), s('seated-cable-row', 3, 8, 12, 'Fri/f2.jpg'), s('leg-press', 3, 10, 12, 'Fri/f3.jpg'),
           s('leg-curl', 3, 10, 12, 'Fri/f4.jpg'), s('rear-delt-fly', 3, 12, 15, 'Fri/f5.jpg'), s('db-curl', 3, 10, 12, 'Fri/f6.jpg', { name: 'Biceps Curl' })] },
    { key: 'sat', dow: 5, day: 'Saturday', title: 'Active Recovery', focus: 'Brisk walk', kind: 'walk', color: 'rest', ex: [],
      items: ['No weight training', '45–60 minute brisk walk', '10,000 total daily steps target — the walk’s steps count toward it'] },
    { key: 'sun', dow: 6, day: 'Sunday', title: 'Recovery', focus: 'Easy movement', kind: 'recovery', color: 'rest', ex: [],
      items: ['No weight training', '20–30 minute easy walk', 'Normal daily movement', 'Recovery focus — sleep, food, hydration'] }
  ];

  const WARMUP = {
    general: ['5–8 minutes on the treadmill (walking), bike, or elliptical', 'Easy to moderate pace — you should be able to talk comfortably'],
    dynamic: {
      push: ['Arm circles — 20 sec forward, 20 sec backward', 'Band pull-aparts or light face pulls × 15', 'Wall slides × 10', 'Incline push-ups on a bench × 10', 'Shoulder pass-throughs with a band × 10'],
      pull: ['Arm circles — 20 sec each way', 'Cat–cow × 8', 'Band pull-aparts × 15', 'Straight-arm scapular pulldowns (very light) × 10', 'Dead hang 15–20 sec (optional)'],
      legs: ['Leg swings — 10 forward/back and 10 side to side, each leg', 'Bodyweight box squats × 10', 'Glute bridges × 10', 'Walking lunges × 6 each leg', 'Ankle rocks × 10 each side'],
      pulllegs: ['Leg swings — 10 each direction, each leg', 'Bodyweight box squats × 10', 'Band pull-aparts × 15', 'Straight-arm scapular pulldowns (very light) × 10', 'Glute bridges × 10']
    },
    setsNote: 'Warm-up sets prepare your joints and groove the movement. They are light, never tiring, and don’t count toward your working sets.'
  };

  const CARDIO_TYPES = {
    incline: 'Incline treadmill walk',
    bike: 'Stationary bike',
    elliptical: 'Elliptical',
    walk: 'Brisk walk (outdoors)'
  };

  root.FDS_DATA = { REST, GENERIC_WEIGHT_CHECK, EXERCISES, PLAN, WARMUP, CARDIO_TYPES };
  if (typeof module !== 'undefined') module.exports = root.FDS_DATA;
})(typeof window !== 'undefined' ? window : globalThis);
