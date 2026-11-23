/* Program data: 8-week hypertrophy program. Edit this file to change the plan.
   Exercise fields: name, sets, lo, hi (rep range), rest [min,max] seconds, cue,
   optional: note, side (reps per side), noWeight (reps only), wlabel (weight label). */
(function () {
  const BIG = [120, 180], ISO = [90, 120];
  const E = (name, sets, lo, hi, rest, cue, o) => Object.assign({ name, sets, lo, hi, rest, cue }, o || {});

  window.PROGRAM = {
    name: '8-Week Hypertrophy Program',
    weeks: 8,
    days: [
      {
        key: 'lowerA', name: 'Lower A',
        blurb: 'Heavy, mechanical-tension emphasis. Compound first, quads and hamstrings.',
        exercises: [
          E('Leg Press', 4, 6, 10, BIG, 'Brace hard, controlled descent; last 2 reps hard. Stop before knee pain starts.', { note: 'pain-free depth' }),
          E('Romanian Deadlift', 3, 6, 10, BIG, 'Hips back, strong hamstring stretch; last 2 reps hard.'),
          E('Leg Extension', 2, 10, 15, ISO, 'Smooth reps, hard quad squeeze.'),
          E('Seated Leg Curl', 2, 8, 12, ISO, 'Controlled stretch, curl hard.'),
          E('Standing Calf Raise', 4, 8, 12, ISO, 'Deep comfortable stretch, strong squeeze at top.'),
          E('Pallof Press', 3, 10, 15, [90, 90], 'Stay tall and resist rotation; smooth, controlled reps. Trunk stability, not loaded ab hypertrophy.', { side: true, noWeight: true })
        ]
      },
      {
        key: 'upper', name: 'Upper',
        blurb: 'Upper chest, V-taper and shoulder development.',
        exercises: [
          E('Incline Smith Machine Press', 3, 6, 10, BIG, 'Upper-chest focus; controlled lowering; last 2-3 reps hard.'),
          E('Neutral-Grip Lat Pulldown', 3, 8, 12, BIG, 'Drive elbows toward hips; control the stretch.'),
          E('Chest-Supported Row', 3, 8, 12, BIG, 'Pull elbows back without shrugging; controlled return.'),
          E('Low-Incline Machine Press', 3, 8, 12, BIG, 'Keep chest high; controlled stretch and strong press.'),
          E('Cable Lateral Raise', 4, 12, 18, ISO, 'Lead with the elbow; controlled stretch, last reps hard.'),
          E('Reverse Pec Deck', 3, 12, 18, ISO, 'Move through the rear delts, not the traps.'),
          E('Overhead Cable Triceps Extension', 3, 10, 15, ISO, 'Let the triceps lengthen; extend smoothly.'),
          E('Incline Dumbbell Curl', 3, 8, 12, ISO, 'Lengthen the biceps under control; curl without swinging.')
        ]
      },
      {
        key: 'lowerB', name: 'Lower B',
        blurb: 'Controlled, lengthened-position emphasis. Higher reps, less reliance on heavy compounds.',
        exercises: [
          E('Leg Extension', 3, 12, 15, ISO, 'Controlled lowering; brief pause in a comfortable stretch.'),
          E('Seated Leg Curl', 4, 10, 15, ISO, 'Slow controlled stretch, hard contraction.'),
          E('Leg Press', 3, 10, 15, BIG, 'Smooth ROM; use your maximum comfortable depth.', { note: 'pain-free depth' }),
          E('Cable Pull-Through', 2, 10, 15, ISO, 'Hips back, controlled stretch; squeeze glutes.'),
          E('Seated Calf Raise', 4, 10, 15, ISO, 'Long comfortable stretch, strong squeeze.'),
          E('Tibialis Raise', 3, 15, 20, [60, 90], 'Lift toes high; control the return.', { noWeight: true }),
          E('Pallof Press', 3, 10, 15, [90, 90], 'Brace firmly and resist rotation; smooth reps.', { side: true, noWeight: true })
        ]
      },
      {
        key: 'push', name: 'Push',
        blurb: 'Upper chest, lateral delts and triceps.',
        exercises: [
          E('Incline Dumbbell Press', 3, 8, 12, BIG, '15-30 degree incline; controlled stretch, drive up; last 2-3 reps hard.'),
          E('Flat Machine Chest Press', 3, 8, 12, BIG, 'Stable setup, controlled lowering, strong press.'),
          E('Cable Lateral Raise', 5, 12, 18, ISO, 'Keep tension on the side delt; controlled stretch.'),
          E('Pec Deck', 2, 10, 15, ISO, 'Comfortable stretch, squeeze the chest together.'),
          E('Extended-Back Skull Crusher', 3, 8, 12, ISO, 'Lower behind the head under control; last 2-3 reps hard.'),
          E('Cable Triceps Pressdown', 2, 10, 15, ISO, 'Fixed elbows, hard contraction.')
        ]
      },
      {
        key: 'pull', name: 'Pull',
        blurb: 'Lat width, upper-back thickness and rear delts.',
        exercises: [
          E('Weighted Pull-Up', 3, 6, 10, BIG, 'Controlled start and stretch; drive elbows down; last 2 reps hard.', { wlabel: 'kg added' }),
          E('Chest-Supported Row', 3, 8, 12, BIG, 'Pull toward lower ribs; avoid shrugging.'),
          E('Single-Arm Cable Lat Pulldown', 3, 8, 12, BIG, 'Drive elbow toward hip; controlled stretch.', { side: true }),
          E('Seated Cable Row', 2, 10, 15, ISO, 'Controlled stretch, pull elbows back.', { note: 'neutral grip' }),
          E('Cable Lateral Raise', 3, 12, 18, ISO, 'Raise through the elbow; last reps hard.'),
          E('Reverse Pec Deck', 3, 12, 18, ISO, 'Rear-delt squeeze, minimal trap involvement.'),
          E('Preacher Curl', 3, 8, 12, ISO, 'Controlled stretch, curl without momentum.'),
          E('Cable Curl', 2, 10, 15, ISO, 'Keep tension continuous; controlled lowering.')
        ]
      }
    ]
  };

  window.INFO_HTML = `
<div class="card warn"><span class="tag">PAIN CONSTRAINTS</span>
<p><b>Knee:</b> leg press only within pain-free, controlled depth. No forced deep ROM, no deep hack squat.</p>
<p><b>Groin:</b> no adduction machine, no abduction machine, no forced wide stance. Do not test the painful movement under load.</p>
<p>Once professionally assessed and cleared: reintroduce deeper leg-press ROM first, then consider hack squat depth or adduction/abduction, one variable at a time.</p></div>

<div class="card"><h3>Progression: double progression</h3>
<ol>
<li>Start with a weight you can perform cleanly in the lower portion of the range.</li>
<li>Log every set.</li>
<li>Next time, try to beat the previous performance by adding a rep.</li>
<li>Once every set hits the top of the range with good technique, increase the weight by the smallest sensible increment.</li>
<li>Reps drop back toward the bottom of the range. Build them back up again.</li></ol>
<p class="mono">10/10/9, 11/10/10, 12/11/10, 12/12/11, 12/12/12, add weight, rebuild</p></div>

<div class="card"><h3>Rest periods</h3>
<p><b>Big movements (2-3 min):</b> leg press, RDL, Smith incline, DB incline, machine presses, rows, pull-ups.</p>
<p><b>Isolation (90-120s):</b> lateral raises, curls, triceps work, leg extensions and curls, calves, rear delts.</p>
<p>If another minute of rest gives you a noticeably better next set, take it.</p></div>

<div class="card"><h3>Weekly volume (direct sets)</h3>
<table><tr><th>Muscle</th><th>Sets</th><th>Frequency</th></tr>
<tr><td>Chest</td><td>14</td><td>2x</td></tr><tr><td>Back</td><td>17</td><td>2x</td></tr>
<tr><td>Lateral delts</td><td>12</td><td>3x</td></tr><tr><td>Rear delts</td><td>6</td><td>2x</td></tr>
<tr><td>Triceps</td><td>8</td><td>2x direct plus pressing</td></tr><tr><td>Biceps</td><td>8</td><td>2x direct plus pulling</td></tr>
<tr><td>Quads</td><td>12</td><td>2x</td></tr><tr><td>Hamstrings</td><td>11</td><td>2x</td></tr>
<tr><td>Calves</td><td>8</td><td>2x</td></tr><tr><td>Core</td><td>6</td><td>2x</td></tr></table></div>

<div class="card"><h3>Deload</h3>
<p>Back off when several of these stack up together: reps declining across sessions despite good sleep and food, performance falling repeatedly, soreness lasting several days, new joint discomfort, technique deteriorating, familiar weights feeling abnormally hard.</p>
<p>When it happens: about one week of reduced training, familiar exercises, substantially lower workload.</p></div>

<div class="card"><h3>8-week mesocycle</h3>
<p><b>Weeks 1-2:</b> standardize setup, ROM, technique, loading, logbook consistency.</p>
<p><b>Weeks 3-6:</b> push the progression system: more reps, eventually more load.</p>
<p><b>Week 7:</b> keep progressing without sacrificing movement quality.</p>
<p><b>Week 8:</b> review bodyweight trend, waist trend, photos, measurements, performance, recovery, joint comfort. Then decide whether to keep this architecture or make targeted changes.</p></div>

<div class="card"><h3>Nutrition</h3>
<p>Protein: 130g or more (about 2g/kg) is already sufficient. Track weekly average bodyweight, not daily fluctuations. Flat for weeks with stalling performance: add a little food. Rising fast or waist visibly thickening: pull back slightly. Target: slow upward trend, performance improving.</p></div>
`;
})();
