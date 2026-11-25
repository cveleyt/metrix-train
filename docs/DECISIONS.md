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
