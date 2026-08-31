# Process overview

<!-- Shape of this file: the two sections below the fold are the submission and
     run 150-300 words for a crit week; `## Working log` at the bottom is
     scratch I append to as the week goes, and is raw material to curate FROM.
     Trim it (or move it to docs/prompt-log.md) before the cutoff.
     Word counts: https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/topics/assessment/#word-counts -->

## What I built

<!-- One paragraph in your own voice: the game, and the idea behind it. -->

## The moments that mattered

<!-- Three or four, promoted up out of the working log once the week has shown
     which ones actually mattered. Each one does four jobs:
       1. what happened --- the problem, or the thing that went wrong
       2. what you did instead of the obvious thing, and why it beat it
       3. how you knew it was right --- the check, the viewport, what you read
          before accepting the diff
       4. the citation --- [`sha`](.../commit/sha) or a [`a...b`](.../compare/a...b) range
     Jobs 2 and 3 are where the marks are; the repo can't tell a reader those
     on its own. Moments where a correction landed in CLAUDE.md or in a check
     score higher than moments where I retried until it passed. -->

---

## Working log

Scratch, append-only, oldest first. Every prompt verbatim next to the commits it
produced, so the curated moments above are chosen with the week in front of me
instead of reconstructed from `git log` afterwards. **Not the submission** ---
this section comes out before the cutoff.

Commit links resolve against
`https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-rithikanallaparaju16`.
The build happened in one sitting, so commits group by concern rather than by
the hour --- the order things actually happened in is the order of the entries
below, and a citation points at the commit holding that entry's changes.

### 0 — set up the week

> /comp4020:start

**Did:** worked out the target from the course API rather than the calendar ---
crit 5, *A game*, week 6, cutoff Wed 2 Sep 13:30 for group `liuru`. Walked the
deliverable rows back to the previous different `repoPrefix` to find the harness
source (`comp4020-crit4-rithikanallaparaju16`, 15 commits, 114-line
`CLAUDE.md`), and diffed that whole tree against this one to separate template
evolution from what crit 4 actually grew. Pulled the published spec and brief.

**Found:** everything differing in `PROCESS.md`, `spec/README.md`, `README.md`,
`reflections/README.md` and the deploy job is the template moving on between
weeks, not my work. What is mine to carry: a `## How to work in here` section, a
block of conventions, `scripts/make-card.mjs`, `DESIGN.md`, and a `tsconfig.json`
that typechecks `src/`. What stays behind: the instrument itself, its three spec
tests, last week's `PROCESS.md` and reflection.

**Open:** stack for the week, and how much of crit 4's convention block
generalises. Harness merge not done yet.

**Commits:** [`7dce521`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-rithikanallaparaju16/commit/7dce521)

### 1 — a running record of prompts and commits

> i need you to keep adding my prompts and git commits ranges so i can edit them
> later aftre the wholeproject is done. you keeo adding stuff in process.md and
> make me a file in reflections as well

**Did:** replaced the starter `PROCESS.md` with this shape --- curated sections
above the fold, this append-only log below it --- and added
`reflections/crit-5.md` with the two standing prompts and a notes area to draft
from. Added a rule to `CLAUDE.md` so the logging is a standing instruction the
harness carries, not something that depends on me remembering.

**Instead of:** appending raw prompts straight into `PROCESS.md` as asked. A crit
week's `PROCESS.md` is 150-300 words, so an unbounded log there would overshoot
the count that the response criterion reads. Fencing the log below the curated
part keeps both: the record to edit from, and a submission at length.

**How I knew:** read `scripts/check-evidence.ts` before writing rather than
after. Its citation regex matches any markdown link whose text is a 7-40
character hex sha and runs `git cat-file -e` on each, so a placeholder hash
fails the gate --- which is why the pending citations above are plain text, not
link syntax. It also hard-fails while the starter's leftover boilerplate
marker is still in the file, and on a missing `reflections/crit-5.md` --- and
the first draft of this very entry tripped the first of those by quoting the
sentinel it greps for, which is now a rule in `CLAUDE.md`.

**Commits:** [`514bcd8`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-rithikanallaparaju16/commit/514bcd8)

### 2 — the checks went red before any code was written

*(No prompt --- surfaced by running `pnpm check` on the untouched starter, per
step 7 of the setup: get the inherited state green so a red check later is mine
rather than handed to me.)*

**What happened:** 20 of 57 tests failed on a repo with one commit in it. Not
inherited breakage: `vite.config.ts` globs the entire repo for `.html` and makes
every hit a build entry, so the five `code.html` mockups in my Stitch export
(`stitch_lunar_gravity_racer/`) were built as real pages, shipped into `dist/`,
and then held to `spec/invariants.test.ts`, which walks everything the build
emitted rather than just `index.html`. Design mockups have no meta description,
no `og:image`, no nav landmark and no image alt text, so each one failed four
invariants.

**Instead of:** silencing the suite, or reaching for `.gitignore` --- which would
have looked right and fixed nothing, because Vite reads the filesystem and not
git. An ignored mockup still builds, still deploys to the public site at the
cutoff, and still fails `check`.

**How I knew:** read `vite.config.ts` and `spec/invariants.test.ts` rather than
the failure summary, then confirmed it by listing `dist`: `find dist -name
'*.html'` returns `index.html` plus exactly those five. 5 pages x 4 invariants =
the 20 failures.

**Landed in the harness:** a `CLAUDE.md` rule that every `.html` in the tree is a
deployed page, that `.gitignore` is not the fix, and that `.png` mockups are safe
where `.html` is not.

**Commits:** [`7dce521`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-rithikanallaparaju16/commit/7dce521)

### 3 — the game brief

*(Pasted twice in the same message; recorded once.)*

> you can see the folder stitch_lunar_gravity_racer to get images for the game.
> The idea is I want to make a game so this is like it should be very easy. The
> users should understand what is happening as as soon as they open the game.
> That's how easy it has to be. There should be a start button and then you just
> start right that's all like nothing else. Just start button and start the game.
> The game is something like it's actually the inspiration is taken from Hill
> climb racing so it has a nice music that keeps the user engaged like a nice
> background music that is going on and then the car jumps and then the amount of
> time it's an error adds like plus points and then you have creators and like
> like I but I want the same thing to be on the moon so even the gravity makes
> sense and I want like the creates to be there like how the moon is and then you
> can also say like random locations of the moon you know like this create that
> great stuff like that so you can maybe educate the user little bit but like it
> should be like very subtle it's not an education game. It's supposed to hook the
> user and then every time the user is too fast or too slow or whatever and the
> fuel runs off like these things they should be things like the user should be
> able to collect a few announced stuff like that so if the users is too fast the
> car falls down. These are too slow in this happens stuff like that so instead of
> like a car, you can make like a cute little spaceship going but making a car
> maybe something like that and then the user should be like an astronaut [...]
> Let me know if I should add more planets like as soon as you click on start the
> machine can randomly regenerate where you should start like maybe moon Venus you
> know anything [...] so yeah build something and let me know how these ideas will
> be. Use PlayWright and take screen shots and see if thats how the game should be
> seen. The car should be facing the way the user is moving.

**Did:** wrote the crit-5 spec into `spec/game.test.ts` *before* building, then
built to green. `src/rules.ts` holds the endings, the air-time score and the
fuel burn as pure functions so the tests call the same code the game runs on;
`src/bodies.ts` carries real surface gravities; `src/terrain.ts` is a seeded
heightfield with crater bowls and raised rims; `src/physics.ts` is two wheel
contacts against that field; `src/audio.ts` synthesises the bed and the engine
so there is no audio file to load or 404.

**Instead of:** randomising the destination on every run, as asked. The first
run is always the Moon and only later runs travel
(`bodyForRun`). Different gravity is the second mechanic, and the brief's own
constraint is that a stranger learns without words --- if the jump arc changed
before they had felt one, the variation would read as the game being broken
rather than as a place being different. Learn on the Moon, then be surprised.

**Instead of, again:** a crash test on the chassis angle *after* the physics
snapped it onto the slope. Landings are judged on the angle the rover arrived
at, so `outcome()` is the only thing that ends a run and the spec test pins the
rule the game actually uses --- not a parallel copy of it.

**Open:** the no-instruction reading. `GAS` and `BRAKE` are labels *on controls*,
the way a pedal or a dial is labelled, and the test enforces that nothing tells
the player what to *do*. That is a defensible line, not a settled one, and the
pod is what settles it.

**Commits:** [`198491b...a2787c3`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-rithikanallaparaju16/compare/198491b...a2787c3)

### 4 — the rover did not move if you did nothing

**What happened:** `scripts/balance.ts` runs the real physics headlessly under
scripted players. The first probe said, for every seed:
`idle (never touches a pedal) -> out-of-fuel @0m 250s`. A player who touched
nothing sat motionless for four minutes. For a game whose whole constraint is
that it must teach itself without words, a frozen opening screen is the worst
possible failure, and it is invisible to every test in the suite --- all 40 were
green while this was true.

**What I did:** fixed the world rather than the numbers on screen. The course now
runs downhill, steeply for the first 100 m and gently after, so the rover rolls
from the first frame; rolling *is* the thing that teaches. `ROLL_DRAG` came down
from 0.55 to 0.16 --- at 0.55 a 10% grade under lunar gravity capped a free roll
at 0.34 m/s, which still looks frozen --- and the idle fuel burn went up so
finding out that idling loses takes 143 s, not 250.

**How I knew it was right:** re-probed. Idle now rolls, then stalls against a
hill, which is itself the prompt to act; naive full-throttle finishes 2 runs in
5 and flips the other 3, so the stakes are real without being unfair.

**Landed in the harness:** the finding became a sensor, not just a fix ---
`spec/game.test.ts` now drives the physics headlessly and fails if the course
stops being winnable, stops being losable, or stops ending inside five minutes.

**Commits:** [`a2787c3...f112bd1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-rithikanallaparaju16/compare/a2787c3...f112bd1)

### 5 — what the screenshots caught that the code did not

**What happened:** Playwright at both marking viewports, 1920x1080 and 390x844,
driving the game to a real ending each time. Zero console errors, both endings
reached --- and five layout and asset bugs that nothing in the suite could see:

1. the fact card rendered as an **empty bordered box** for the whole run.
   `.fact { display: grid }` beats the UA's `[hidden] { display: none }`. I had
   remembered this for `.screen` and not for `.fact`.
2. the **rover drove backwards.** The source art faces *left* --- headlights on
   the left end, flag on the back at the right --- so `scale(facing, 1)` pointed
   it away from its direction of travel. This is the change that came from
   looking at the finished game rather than reading its code, and it is the one
   the brief asked for by name.
3. both **pedals sat on top of the play area** at 1920 wide: a centred row with
   a fixed 420px gap put them in the middle of the screen.
4. the **wordmark sat underneath the brake pedal** at the bottom left.
5. the far ridge inherited the course's downhill grade and read as **one
   enormous hill** across the whole frame, so it is drawn in screen space now.

**How I knew:** re-shot after each pass and looked again. The card image is
rendered from the running game by `scripts/make-card.mjs` for the same reason.

**Landed in the harness:** the `[hidden]`/`display` trap and the check-the-art
-orientation rule are both in `CLAUDE.md`, along with the two marking viewports
written down as numbers.

**Commits:** [`a2787c3...f112bd1`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-rithikanallaparaju16/compare/a2787c3...f112bd1)

### 6 — the flip that never ended the run

> game should end when the car falls upside down. now the game still continues.
> in the air the user can set the car in the right angle using accelerator and
> break because it is the space. also show where the person is

**What happened:** the report was right and the cause was not where the tests were
looking. `outcome()` had a passing test for the flip rule, and `spec/game.test.ts`
had 43 green assertions, and an upside-down rover still drove on. The tilt handed
to `outcome()` was computed from wheel positions projected through
`cos(angle)` --- which changes sign past vertical, so front and rear swapped,
`atan2` returned a ground angle near PI, and `angle - groundAngle` cancelled to
**zero**. A rover on its roof reported no lean at all.

**The bug, precisely.** One line, in `src/physics.ts`. The wheel sample points
were projected through the chassis angle:

```ts
const xFront = r.x + Math.cos(r.angle) * (WHEELBASE / 2);
const xRear  = r.x - Math.cos(r.angle) * (WHEELBASE / 2);
const groundAngle = Math.atan2(yFront - yRear, xFront - xRear);   // <-- the bug
```

Past vertical `Math.cos(r.angle)` goes negative, so `xFront` lands to the *left*
of `xRear`. `atan2` is then handed a negative run, returns a ground angle near
PI, and `normalise(angle - groundAngle)` subtracts the rover's own inversion
from itself. Measured on flat ground, where the true ground angle is 0:

| chassis angle | old `groundAngle` | old tilt | flagged? | fixed tilt | flagged? |
| --- | --- | --- | --- | --- | --- |
| 0 deg | 0 deg | 0 deg | no | 0 deg | no |
| 144 deg | 180 deg | -36 deg | **no** | 144 deg | yes |
| 180 deg, on its roof | 180 deg | **0 deg** | **no** | 180 deg | yes |

So `outcome()` was asked whether a rover leaning 0 degrees had crashed, and
correctly answered no.

The second half is worse than "the run does not end". The snap that keeps the
chassis hugging the slope is gated on that same tilt being small --- so it ran,
lerping the rover's angle *towards* the phantom 180-degree ground. The code was
actively holding the rover upside down and treating it as correctly seated,
while thrust kept being applied along the real terrain tangent. It did not
merely fail to notice the flip; it drove on, inverted and stable, indefinitely.

The fix samples the ground at a fixed left-right pair, `r.x - WHEELBASE / 2` to
`r.x + WHEELBASE / 2`, so the run handed to `atan2` is always `+WHEELBASE` and
the ground angle can never depend on which way the chassis points.

**Instead of:** patching the number, I wrote the failing test first --- one that
drops the rover from 40 m at various angles and asserts the *ending* rather than
the predicate. It went red on the two inverted cases and green on the wheels-down
one, which named the bug before a line of physics changed. The fix is to sample
the ground at a fixed left-right pair, because the ground's slope does not depend
on which way the chassis points.

**How I knew it was right, and what it cost:** the moment flips began registering,
the playability sensor failed --- holding the throttle could no longer finish a
run, because before this you simply kept driving on your roof. That failure was
correct, and it is the same thing this prompt asked for next: real attitude
control in the air. Air torque went up and its damping down, so gas lifts the
nose and brake drops it with enough authority to save a bad launch. Then the
sensor's *question* was wrong, not its threshold: it demanded that a masher win.
It now asks what the brief actually asks --- a player who uses the air controls
arrives 3 runs in 5, a masher 1 in 5, and a masher still reaches an ending. Easy
to learn, hard to master, as a measurement.

**Also:** "show where the person is" is now a route bar in the destination
readout --- filled behind you, a tick per named crater, a lit dot for the rover,
and `104/1200 m` under it. At 390x844 three readouts across 350 px had squeezed
the fuel bar to nothing, so in portrait the route takes a full-width second row;
sky is the one thing portrait has spare.

**Verified:** 47 green, and Playwright drove both marking viewports to a real
`Wheels up` ending with no console errors --- the flip ends the run in the actual
browser, not just in the suite.

**Commits:** [`356f383`](https://github.com/comp4020-agentic-coding-studio/comp4020-crit5-rithikanallaparaju16/commit/356f383)
