# Pinball Forge — PRD

## Original problem statement
Create a pinball machine web app that you can play a realistic pinball machine similar to the Zen Studios pinball tables. Make the game fun, Simple and expandable. Create a new unique play field each time the user inputs a theme to base the game on. The theme could be a single word or a short description. Save tables you like to play again and allow editing to enhance the game play, scoring methods and even back glass features. Allow deletion of tables also from your saved list. Present the option to create a photo realistic playfield, back-glass and machine cabinet as well.

User choices: Claude Sonnet 5.5 (table design), GPT Image (photo-realistic art — running gpt-image-1.5 because the proxy rejects gpt-image-1), no login inside the app (it will be embedded in URLinc.us, which has its own email login), keyboard + touch controls, URLinc brand assets (buttons/logos) used only when picked during theme creation.

## Architecture
- Backend: FastAPI + MongoDB (tables, assets, files) + Emergent Object Storage (art and brand images), emergentintegrations for Claude and image generation. Art is generated as a background task, and the UI checks for it every 5 seconds.
- Frontend: React + custom Canvas 2D physics engine (`src/game/engine.js`, `geometry.js`, `render.js`, `sound.js`, all WebAudio synth).

## Implemented (2026-06)
- AI table forging from a theme: layout of bumpers, targets, top lanes, ramp shots and saucers, plus palette, missions, scoring rules, physics and back-glass text. The server checks and cleans up the layout so the ball always has room to flow.
- Play: flippers, slingshots, plunger, multiball, combos, bonus multiplier, extra ball, ball save, nudge/tilt, DMD score display and high score tracking.
- Library: save, play, edit and delete (with confirmation).
- Editor: drag-and-drop layout with an inspector, physics and scoring settings, missions, back-glass text and colors, art generation (playfield, back-glass, cabinet) with show/hide toggles, and brand placement.
- Brand Kit: 5 URLinc assets added from the user's uploads. Upload and delete work. Brand assets go on bumper caps, the back-glass logo and the apron logos.

## Iteration 2 (2026-06)
- Back-glass score overlay (score/ball/high score), pop-out back-glass on a 2nd screen (/backglass/:id, Window Management API placement + BroadcastChannel sync, F = fullscreen)
- AI story per table (title, episode, crawl) shown as Star Wars-style perspective crawl in the theme font on table open; replay button; editable + AI rewrite in Editor Story & Style tab
- Theme style: 20 Google display fonts, hardware finish (chrome/gold/copper/crystal/neon), ambient animations (fog, bubbles, embers, stars, rain, snow, lightning, leaves, sparks, matrix, petals, bats, fireflies)
- Layout variety: AI places guide rails, habitrail wire ramps that carry the ball to an inlane, target styles (drop, flag, shield, gem, post) with knock-down animation
- Photo-real renderer: metallic bumpers with LED rings + gloss, metal rails/slings/saucers, flash light shows, ball search; new art kind: photo-real bumper caps

## Iteration 3 (2026-06)
- Parts Kits: photo-real hardware sets (20 slots: bumper cap/lit/base, ball, saucer, flipper, slingshot insert, 5 target styles, lane lights, shot arrows, guide rail, rail post, aprons). Seeded URLinc Gold kit sliced from the user ChatGPT sprite sheet (checkerboard removed). Kit chosen when forging (Hardware) or in Editor Brand tab; per-slot uploads on Brand Kit page; empty slots fall back to drawn parts

## Backlog
- P1: Leaderboard with player initials per table; true 3D ramps/wire habitrails; spinners
- P1: Integration with URLinc.us login (per-user libraries)
- P2: Table sharing links, sound packs per theme, thumbnails for faster brand image loading

## Iteration 4 (2026-06)
- Story crawl: pause/resume via Space or click (synced to 2nd screen), auto-close on animation end; story.speed (0.5–2.5x) slider in Story & Style tab
- 3 generic logo-free parts kits seeded from user's ChatGPT sheet: Classic Red / Classic Blue / Classic Gold (19 parts each, per-kit flipper pivot meta). Frostbeard's Revenge set to Classic Blue as showcase
