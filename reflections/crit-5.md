# Crit 5 reflection

<!-- 150-300 words, your voice, answering the two standing prompts. The notes
     at the bottom are mine, appended as the week goes --- raw material to write
     from, and they come out before the cutoff. This file's name is checked:
     `pnpm check:evidence` reads reflections/crit-5.md and nothing else. -->

**What was the breakthrough that moved the work forward?**

<!-- Written by you. -->

**What did this work change about who I want to be as a software developer?**

<!-- Written by you. -->

---

## Notes from the week

<!-- Appended as things happen, so the two answers above get written from a
     record rather than from memory at 1am. Not part of the reflection. -->

- **Carried in from crit 4.** Your crit-4 answer already landed on something
  this brief tests directly: that a site had to be self-explanatory, so "the
  layout and the sound had to do all the teaching". Crit 5's no-tutorial rule is
  the same instinct made into a spec line — worth saying whether a week of it
  under a harder constraint confirmed that or complicated it.
- **The constraint to watch.** No instructions anywhere, on screen or off, and a
  stranger has to reach an ending inside five minutes. The pod plays it cold and
  you stay quiet until someone finishes or gives up — so the thing you can't
  test is also the thing that gets settled in about ten seconds.
- **The spec line that names process directly.** One change has to come from
  *playing* the finished game rather than reading its code. That change is
  almost certainly a reflection answer as well as a commit, so note what it felt
  like when you find it.
- **The change, when it came, was the rover driving backwards.** The art faces
  left, so the code that mirrored it "correctly" pointed it away from where it
  was going. Unreadable from the source; obvious in one screenshot. Worth saying
  whether that changed how much you trust code you have only read.
- **The one that no picture would have caught either.** A headless probe of the
  physics found that the rover did not move at all if the player touched
  nothing --- forty green tests and a perfectly good-looking screenshot, and the
  game still failed its own central promise. The fix was to the world (the
  course runs downhill now), and the finding became a permanent sensor.
- **Where judgement was actually exercised.** Two calls worth naming: always
  opening on the Moon instead of randomising the destination as asked, because a
  jump arc that changes before you have felt one reads as broken rather than
  different; and making `outcome()` the single authority on endings so the spec
  test pins the rule the game runs on, not a copy of it.
