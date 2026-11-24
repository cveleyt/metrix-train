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
