# COMP4020 prototype

Your starter repo for a COMP4020 prototype: a static site in HTML/CSS/TypeScript
that builds to plain HTML/CSS/JS and deploys to GitHub Pages. The deployed site
is what gets marked, not this repo.

The
[course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/)
publishes this deliverable's brief and spec, and this repo's name tells you
which deliverable applies. Read both before you plan or build.

## How to work in here

- Keep the dev server running (`pnpm dev`) so you see changes as you make them.
- Run `pnpm check` before you push.
- Open the page in a browser and look at it. The rendered page is the truth;
  your mental model of it isn't.
- When a check fails, read its output before you change anything.
- Never commit a red state --- with one exception: spec tests written from a new
  week's published spec are *meant* to start red, and going red-to-green is the
  week's work.

## What gets marked, and where

The deployed site is the deliverable, assessed live in the latest stable Chrome
at **two fixed viewports, both of which are full marking environments**:

- **1920x1080** --- desktop
- **390x844** --- phone (the iPhone preset in Chrome DevTools' device toolbar)

Everything the brief asks for has to work at both. 390x844 is *portrait*, so a
landscape-shaped idea needs an answer for a tall narrow screen before it is
built, not after. Check both before calling anything done.

## Conventions carried forward

Learned in earlier weeks; still true whatever the brief is.

- **Structure lives in `index.html`, not in TypeScript.** `spec/*.test.ts`
  parses the built HTML with jsdom and never runs scripts, so anything a test
  needs to see must ship as static markup.
- **An overlay must never be able to swallow the opening gesture.** The first
  tap has to reach the thing it looks like it is hitting --- keep intro and
  overlay layers outside the interactive surface, or `pointer-events: none`.
- **The first gesture does its work in one synchronous call stack.** Resume the
  `AudioContext` and request any permissions *before* the first `await`, or iOS
  keeps the context suspended and the opening tap makes no sound.
- **Feature-detect by waiting for a reading, never by sniffing the UA.**
- **Never assign `gain.value` mid-note.** `cancelScheduledValues` →
  `setValueAtTime(param.value, now)` → a ramp. Pinning the ramp to the *current*
  value is the step that is easy to skip, and skipping it jumps from a stale
  scheduled target.

## Traps this repo has already hit

- **`[hidden]` loses to any `display` in a class rule.** `.fact { display: grid }`
  beat the UA's `[hidden] { display: none }`, so a card meant to be hidden
  rendered as an empty bordered box for a whole run. Every class that sets
  `display` needs its own `&[hidden] { display: none }`.
- **A green test on a pure function proves nothing about the wiring.**
  `outcome()` decided flips correctly, and the `tiltRad` being handed to it was
  always zero, so an upside-down rover kept driving and every test stayed green.
  Where a rule reads computed state, test the integration as well as the rule:
  drive the real physics and assert the *ending*, not the predicate.
- **Never derive a terrain slope from chassis-projected sample points.**
  `cos(angle)` changes sign past vertical, so front and rear swap, `atan2`
  returns a ground angle near PI, and `angle - groundAngle` cancels to nothing.
  Sample the ground at a fixed left-right pair: the ground's slope does not
  depend on which way the vehicle is pointing.
- **A sensor that fixes its own question is worth more than one that passes.**
  Making flips register made the game unwinnable by mashing, and the sensor
  failed --- correctly. The fix was not to loosen it but to ask the right thing:
  a player who uses the controls should win, and a masher should still reach an
  ending.
- **Check which way source art faces before mirroring it.** The rover art faces
  *left*, so `scale(facing, 1)` drove it backwards; the correct transform was
  `scale(-facing, 1)`. Assumptions about an asset are settled by looking at a
  screenshot, not by reading the code.

## Verify by driving it, not by reading it

Two tools in `scripts/`, neither wired into `check` because both need a running
browser or a judgement call:

- `scripts/balance.ts` --- runs the real physics headlessly under scripted
  players and prints where each run ends. It found that the rover did not move
  at all if you touched nothing, which no test and no screenshot would have
  shown. Reach for a probe like this for anything tuned by feel.
- `scripts/make-card.mjs` --- renders candidate `public/card.png` frames from
  the running game with Playwright, so the card cannot drift from the page.
  Picking the frame is the part a script cannot do.

Screenshot both marking viewports with Playwright and *look at the frames*.
Every layout bug this week --- pedals sitting on top of the play area, a
wordmark under a button, an empty card, a backwards rover --- was invisible in
the code and obvious in a picture.

## The link-preview card

`public/card.png` (1200x630) is the image a shared link shows; `index.html`'s
head points at it. Replace it and the `description` meta, and copy the head
block into any new page. The card URL resolves against the page that names it,
like any link --- `./card.png` is wrong one directory down, and nothing in CI
checks it, so the deployed head is the only place a broken one shows up.

## The checks

`pnpm check` runs them, and `pnpm check:evidence` is the extra gate before you
ship. CI runs the same plus links, secrets and the deploy.

`spec/README.md`, `PROCESS.md` and `reflections/README.md` are in this repo and
say what they are for.

## Keep the working log as you go

`PROCESS.md` carries an append-only `## Working log` below its curated sections,
and `reflections/crit-5.md` carries a `## Notes from the week`. Append to both as
the work happens --- do not wait to be asked, and do not reconstruct them from
`git log` at the end.

- **Every prompt goes in verbatim**, typos and all. It is a record to edit from,
  and a cleaned-up paraphrase is not evidence of anything.
- **Each entry pairs the prompt with what it produced**: what changed, what was
  done *instead of* the obvious thing and why, how it was verified, and the
  commit or `a...b` range. The middle two are the ones the repo cannot tell a
  reader on its own.
- **A pending citation is plain text, never link syntax.** `check-evidence.ts`
  matches any markdown link whose text is a 7-40 character hex sha and runs
  `git cat-file -e` on it, so a placeholder hash fails the gate. Write
  `**Commits:** _pending_`, and fill it in once the commit exists.
- **Never write the reflection answers.** Append facts to the notes area; the
  two standing prompts are answered in the student's own voice.
- **The log is scratch, and the curated part is the submission.** A crit week's
  `PROCESS.md` is 150-300 words, so trim the log (or move it to
  `docs/prompt-log.md`) before the cutoff, promoting three or four real moments
  up into `## The moments that mattered`.

## Every .html file in the repo is a deployed page

`vite.config.ts` globs the whole repo for `.html` and makes each one a build
entry, skipping only dotfiles and `node_modules`, `dist`, `spec`, `scripts`,
`reflections`. So a design mockup, a scratch page or a vendor export dropped
anywhere in the tree gets built into `dist/`, shipped to the public Pages site,
and held to `spec/invariants.test.ts` --- which walks everything the build
emitted, not just `index.html`.

- **`.gitignore` is not enough on its own.** Vite reads the filesystem, not
  git, so an ignored directory still builds, still deploys and still fails
  `check`. `SKIP` is what stops the build; ignoring only keeps the bulk out of
  the repo. This week's Stitch export needed both.
- Keep mockups and exports **outside the repo**, or add the directory name to
  `SKIP` in `vite.config.ts` if it has to live here. Screenshots (`.png`) are
  safe and are good `PROCESS.md` evidence; it is the `.html` that ships.

## This file is yours

A starting point, not a rulebook: what you add to it is the harness, and the
harness is assessed. This file and the sensors you wire into `check` carry
across the course --- both come with you into next week's repo. The prototype
doesn't: source, and the tests answering this week's published spec, stay
behind. `spec/README.md` draws the line.

<!-- Sensor note: `scripts/check-evidence.ts` greps PROCESS.md for the starter's
     boilerplate sentinel with a plain substring match, so never quote that
     literal string in PROCESS.md --- describing the gate in the working log is
     enough to fail it. Same trap as the hex-sha citation regex. -->
