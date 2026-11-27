# MetriX Train: decisions log

Purpose: the test app is the lab. Every feature gets a verdict, so the professional rebuild is built from what was proven, not guessed.
Statuses: KEPT, CHANGED, DROPPED, PARKED (idea, not now), ON HOLD (waiting on something).

## Product principles
- KEPT: local-first web app, works offline, updates without reinstall.
- KEPT: show a sample and get approval before changing the live app.
- KEPT: status is always shown as text tags, never color alone.
- KEPT: no em dashes anywhere in the app text.
- KEPT: each user enters their own Gemini key on their own phone. Keys never go in chat, repo or database.

## Features
| Version | Feature | Status | Notes |
|---|---|---|---|
| 1.x | Workout logging, previous weights, overload suggestions, offline | KEPT | Core of the app |
| 2.2 | Rest timer v2 (popup, ready alert) | CHANGED | 2.8: hides to a draggable round button, never stops on hide |
| 2.3 | Today rework, bigger food box | KEPT | |
| 2.4 | Meals (breakfast, snacks, lunch, dinner) | KEPT | AI sorts entries by the meal word typed |
| 2.5 | Users, profile, AI recommendations, update popups | KEPT | Login is a device lock only |
| 2.6 | Recomposition goal, safety checks, AI consent | KEPT | |
| 2.7 | Muscle volume, body measurements and photos, weekly review, warm-ups, RPE, deload, barcode, units, CSV, shortcuts | KEPT | RPE default off |
| 2.8 | Exercise notes, quick tags, machine settings, skip and add exercise | KEPT | First gym test feedback |
| - | Calorie burn estimate | DROPPED | Brainstormed, not wanted for now |
| 2.9 | Cloud accounts and sync (Supabase) | KEPT | Login by username, local first, merge by record. Photos not synced yet |
| 3.0 | Code split into js-*.js files, accessibility labels | KEPT | Verified identical rendering of 23 screens before and after |
| - | Text size setting | ON HOLD | |
| - | Password hardening | CHANGED | Replaced by Supabase Auth in 2.9 |
| 2.9 | Automatic backup and sync | KEPT | Done through Supabase |
| - | Locked-phone timer alarm, automatic steps and sleep | PARKED | Needs the Android wrapper (Capacitor) and Health Connect |

## Open questions for the rebuild
- Native Android, React Native, or keep the web app inside a wrapper?
- Which features did testers actually use weekly? (fill in from feedback)
- Which AI features were worth their cost and accuracy?

## Feedback log
- 2026-11-24, first gym session: wanted notes per exercise, timer that survives closing, add and skip exercise. All built in 2.8.
| 3.1 | Daily inputs: check-in (card on Today, anytime), water, supplements, sleep bed/wake, streaks. Stored inside daily[day] and settings.supps so sync needs no change. Readiness line moved to 3.4 |
| 3.2 | Cuts after critic review: micronutrients, voice logging, session score, meal timing, water tracking, day and water streaks. Added private usage counter (mx.usage, local only) and after-workout note (feedback, synced). Order now: 3.3 Training, 3.4 Nutrition lite, then intelligence after 6 weeks of data, then 4.0 Android |
| 3.5.0 | Redesign stage 1: direction A tokens (dark and light), Inter display type, sun/moon toggle on Today, bottom bar Today/Train/+/Fuel/Insights with Quick add sheet, new Today (week tape, contextual start button, gauges with plain sentence, coach note, folded Daily). Me behind the avatar. Stage 2 = R1 set card, stage 3 = Fuel/Insights/Me. | Approved boards N_D4Home, N_D4Hero option 2 |
| 3.6.0 | Redesign stage 2 plus Today v2: R1 set card (tap weight to type, chips minus/last/try/plus, one-tap rep numerals, full-width Log set with rest time, finished sets folded, tap to undo); Today session card shows last time and TRY weight per exercise; Body strip with 4-day average line and one sentence; gauges keep their own colour when empty and show what is left | Approved boards N_D4Reps R1, N_D5Today |
| 3.7.0 | Redesign stage 3: Me regrouped (Nutrition and AI, Data and sync on own pages), Fuel status as sentence plus tick gauges plus protein week bars, Trends became Insights with 4 tabs (Week, Lifts, Body, Log). Bars: filled = goal hit, outline = missed, never color alone (owner is color blind) | Approved boards N_D6 |
| 3.8.0 | Workout feedback: set strip, flash on log, closed DONE card, NEW BEST, no auto-open, no vibration | Tester feedback: lost count of sets, no signal on completion |
| 3.8.1 | Simpler open exercise: title is name and sets x reps, extras under More, effort picker only under newest logged set, single border | Tester said too much info, still confusing |
| 3.9.0 | Done state on Today and Train, weight carried to next set, Fuel status first with compact add and tappable meals, merged Body card, supplement tick redraw, quick add icons, shorter Insights charts | Tester screenshots review of every screen |
| 3.10.0 | Round 9: saved screen with top sets and one note, review tags in words, muscle range box, Lifts cleanup, check-in nothing preselected, small fixes |
| 3.10.1 | Goal tolerance slider (80% default), calories band 10%, fat range with formula recommendation, one rule for Today, Fuel, Insights and review |
| 3.11.0 | Today: solid rings, greeting, Next up, week strip. Metric colors setting: Standard, Color-safe, One color |
| 3.12.0 | Weight per side (Dumbbell, Smith) with bar weight, effort picker on by default in the set card, AI estimate as a full-width button |
| 3.13.0 | Set card rework: pre-filled fields with plus and minus, one-tap Log, result panel with NEW BEST, effort and inline rest timer; timer popup no longer auto-opens |
| 3.13.1 | Primary buttons use white text on a deeper blue (--accf); + menu closes on every choice and on any navigation | Dark text on blue was hard to read; Resume workout left the sheet open |
| 3.14.0 | Set circles plus logged-sets line with tap-to-fix; Edit workout on summary and Today | Top set indicators were hard to read; done workouts could only be edited from History |
| 3.14.1 | Unstarted collapsed cards show no ring | Matches approved board; ring means the set you are on |
| 3.14.2 | EACH SIDE pill beside WEIGHT label on every weighted exercise; removed duplicate in More | User drew the placement |
| 3.14.3 | Floating rest timer bubble hidden; stepper and note buttons centered with flex | User request; inline rest timer remains in the set card |
| 3.14.4 | Weight and reps boxes aligned with fixed label, number and sub heights, stepper pinned to bottom | Pill made weight box taller than reps |
| 3.14.5 | EACH SIDE toggle in edit-workout mode | Edit screen had no way to mark per-side weights |
| 3.15.0 | Audit batch 1: sync reloads memory after pull (no stale overwrite, no page reload); edit screen EACH SIDE per workout and keeps rest; wk-nav routed by data-k; .btn uses --accf; 0 kg/0 reps needs a second tap; lb suggestions use lb step; import restores settings; banner text when synced; removed password hash; labels fixed | Opus audit findings, verified with a mock two-device sync test |
| 3.16.0 | Design review quick wins: scale 1.0 default (0.9/1.0/1.1, old values migrated), 11 px label floor, 44 px hit areas, --kcal amber for Energy, filled NEW BEST tag with delta, chip flash, summary values right aligned, no teal in edit mode, toast fully hidden, .btn2 defined, weight/reps fields on subgrid | Opus design review (artifact TtfM6y7qRRyNkYE1SQdTJa) |
| 3.17.0 | A2: rest timer bottom bar replaces in-card rest | Design review sample A2, approved |
| 3.18.0 | A1: Today one hero, tape removed from Today, streak card removed, nextUp below rings; standard metric palette replaced with deutan-safe tokens from review | Design review A1 and color tokens |
