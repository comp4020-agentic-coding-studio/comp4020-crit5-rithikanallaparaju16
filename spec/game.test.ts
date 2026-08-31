import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { JSDOM } from "jsdom";
import { describe, expect, it } from "vitest";
import { BODIES, MOON, bodyForRun, jumpApex } from "../src/bodies.ts";
import { makeRover, step } from "../src/physics.ts";
import { makeTerrain } from "../src/terrain.ts";
import {
  FUEL_CAPACITY,
  IDLE_BURN_PER_SECOND,
  airScore,
  maxRunSeconds,
  outcome,
} from "../src/rules.ts";

// Contracts from the published spec for crit 5 (A game), not implementation
// details -- these should survive a rewrite of the renderer or a change of
// stack. Feel, fairness and whether the opening screen really does invite the
// first move are left to the crit: four people playing it cold settle those in
// about ten seconds, and no test can.

// ---------------------------------------------------------------- "it can be lost"
// spec: "a wrong move is possible, and play ends somewhere -- a win, a loss or
// a finish". The focused rule test for the deliverable is the flip rule.
describe("a wrong move is possible", () => {
  const rolling = { tiltRad: 0, onGround: true, fuel: 50, distance: 0, target: 1000 };

  it("keeps play going while the rover is upright, fuelled and short of target", () => {
    expect(outcome(rolling)).toBeNull();
  });

  it("ends the run when the rover tips past the point of no return", () => {
    expect(outcome({ ...rolling, tiltRad: Math.PI * 0.75 })).toBe("flipped");
    expect(outcome({ ...rolling, tiltRad: -Math.PI * 0.75 })).toBe("flipped");
  });

  it("does not call a steep but recoverable lean a crash", () => {
    expect(outcome({ ...rolling, tiltRad: Math.PI * 0.25 })).toBeNull();
  });

  it("ends the run when the fuel is gone", () => {
    expect(outcome({ ...rolling, fuel: 0 })).toBe("out-of-fuel");
  });

  it("ends the run as a finish when the target distance is reached", () => {
    expect(outcome({ ...rolling, distance: 1000 })).toBe("arrived");
  });

  it("offers all three endings the spec asks for", () => {
    const endings = new Set([
      outcome({ ...rolling, tiltRad: Math.PI }),
      outcome({ ...rolling, fuel: 0 }),
      outcome({ ...rolling, distance: 2000 }),
    ]);
    expect(endings).toEqual(new Set(["flipped", "out-of-fuel", "arrived"]));
  });
});

// ------------------------------------------- "a stranger reaches an ending inside 5 min"
describe("a run is bounded", () => {
  it("cannot outlast five minutes even if the player never touches a pedal", () => {
    expect(maxRunSeconds()).toBeLessThanOrEqual(300);
  });

  it("bounds it by burning fuel even at rest, so idling is not a way to stall", () => {
    expect(IDLE_BURN_PER_SECOND).toBeGreaterThan(0);
    expect(maxRunSeconds()).toBeCloseTo(FUEL_CAPACITY / IDLE_BURN_PER_SECOND, 5);
  });
});

// -------------------------------------------------------------- air time is the reward
describe("air time is what scores", () => {
  it("pays nothing for staying on the ground", () => {
    expect(airScore(0)).toBe(0);
  });

  it("pays more for a longer hang", () => {
    expect(airScore(1.5)).toBeGreaterThan(airScore(0.5));
  });

  it("pays nothing for a hop too short to read as a jump", () => {
    expect(airScore(0.05)).toBe(0);
  });
});

// ------------------------------------------------- gravity is the mechanic that varies
describe("where you land changes how it plays", () => {
  it("is lower gravity than Earth everywhere, so every jump floats", () => {
    for (const body of BODIES) expect(body.gravity).toBeLessThan(9.81);
  });

  it("gives every destination a gravity of its own", () => {
    expect(new Set(BODIES.map((b) => b.gravity)).size).toBe(BODIES.length);
  });

  it("sends the same launch higher where gravity is weaker", () => {
    const sorted = [...BODIES].sort((a, b) => a.gravity - b.gravity);
    const apexes = sorted.map((b) => jumpApex(12, b.gravity));
    expect(apexes).toEqual([...apexes].sort((a, b) => b - a));
  });

  it("always opens on the Moon, so the first run is the one you learn on", () => {
    expect(bodyForRun(0, () => 0.99).id).toBe(MOON.id);
  });

  it("can send a later run somewhere else", () => {
    const seen = new Set(Array.from({ length: 40 }, (_, i) => bodyForRun(i + 1, Math.random).id));
    expect(seen.size).toBeGreaterThan(1);
  });

  it("names a real place with a real fact, for every destination", () => {
    for (const body of BODIES) {
      expect(body.landmarks.length).toBeGreaterThan(0);
      for (const landmark of body.landmarks) {
        expect(landmark.name.trim()).not.toBe("");
        expect(landmark.fact.trim().length).toBeGreaterThan(10);
      }
    }
  });
});

// ------------------------------------------------------------------ "it teaches itself"
// spec: "no instructions anywhere, on screen or off -- the opening screen
// invites the first move, and play teaches whatever comes next".
describe("the shipped page teaches itself", () => {
  const doc = new JSDOM(readFileSync(resolve("dist/index.html"), "utf8")).window.document;

  it("offers exactly one thing to do on the opening screen", () => {
    const opening = doc.querySelector('[data-testid="opening"]');
    expect(opening, "there has to be an opening screen").toBeTruthy();
    const controls = opening!.querySelectorAll("button, a[href], input, select, textarea");
    expect(controls.length).toBe(1);
    expect(controls[0].getAttribute("data-testid")).toBe("start");
  });

  it("says nothing anywhere that explains how to play", () => {
    // Naming a control (GAS) or a gauge (FUEL) is a mark, the way a pedal or a
    // dial in a real vehicle is labelled. Telling the player what to *do* is an
    // instruction, and the spec allows none of it.
    const text = (doc.body.textContent ?? "").toLowerCase();
    for (const phrase of [
      "how to play",
      "instructions",
      "tutorial",
      "press ",
      "tap ",
      "click ",
      "hold ",
      "use the",
      "arrow key",
      "spacebar",
      "your goal",
      "objective",
      "avoid the",
    ]) {
      expect(text, `"${phrase}" reads as an instruction`).not.toContain(phrase);
    }
  });

  it("ships no help, tutorial or how-to-play layer at all", () => {
    for (const id of ["help", "instructions", "tutorial", "howto"]) {
      expect(doc.querySelector(`[data-testid="${id}"]`), `no ${id} layer`).toBeNull();
    }
  });

  it("puts both pedals on the page, reachable by keyboard as well as thumb", () => {
    for (const pedal of ["gas", "brake"]) {
      const el = doc.querySelector(`[data-testid="pedal-${pedal}"]`);
      expect(el, `${pedal} pedal`).toBeTruthy();
      expect(el!.tagName).toBe("BUTTON");
      expect(el!.getAttribute("aria-label")?.trim()).toBeTruthy();
    }
  });

  it("shows the state a player has to read: fuel, score and where they are", () => {
    for (const id of ["fuel", "score", "destination"]) {
      expect(doc.querySelector(`[data-testid="${id}"]`), id).toBeTruthy();
    }
  });

  it("has a live region, so the ending is not purely visual", () => {
    expect(doc.querySelector('[data-testid="announcer"]')?.getAttribute("aria-live")).toBe("polite");
  });
});

// ------------------------------------------------------ sensor: it stays playable
// Not a contract from this week's spec but a standard the work has to keep
// meeting, so it lives here rather than in a notebook: the physics constants are
// tuned by feel, and a careless nudge to drag or gravity can quietly make the
// course unwinnable or unending. Both promises are checked by driving the real
// physics headlessly under a scripted player.
describe("sensor: the course stays playable", () => {
  const drive = (
    body: (typeof BODIES)[number],
    seed: number,
    brain: (r: { onGround: boolean }) => { gas: number; brake: number },
  ): { ending: string; seconds: number; metres: number } => {
    const terrain = makeTerrain(seed, body.target, body.landmarks.length);
    const rover = makeRover(terrain);
    const dt = 1 / 60;
    let t = 0;
    for (let i = 0; i < 60 * 320; i++) {
      t += dt;
      step(rover, brain(rover), body, terrain, dt);
      const o = outcome({
        tiltRad: rover.tiltRad,
        onGround: rover.onGround,
        fuel: rover.fuel,
        distance: rover.x,
        target: body.target,
      });
      if (o) return { ending: o, seconds: t, metres: rover.x };
    }
    return { ending: "never ended", seconds: t, metres: rover.x };
  };

  const flatOut = () => ({ gas: 1, brake: 0 });
  const idle = () => ({ gas: 0, brake: 0 });

  it("can be finished by a player who only holds the throttle", () => {
    const runs = [1, 2, 3, 4, 5].map((seed) => drive(MOON, seed, flatOut));
    expect(runs.filter((r) => r.ending === "arrived").length).toBeGreaterThan(0);
  });

  it("still lets that player lose, so holding the throttle is not a solution", () => {
    const runs = [1, 2, 3, 4, 5].map((seed) => drive(MOON, seed, flatOut));
    expect(runs.filter((r) => r.ending === "flipped").length).toBeGreaterThan(0);
  });

  it("always reaches an ending inside five minutes, everywhere, even doing nothing", () => {
    for (const body of BODIES) {
      for (const seed of [1, 2, 3]) {
        for (const brain of [flatOut, idle]) {
          const run = drive(body, seed, brain);
          expect(run.ending, `${body.name} seed ${seed}`).not.toBe("never ended");
          expect(run.seconds, `${body.name} seed ${seed}`).toBeLessThanOrEqual(300);
        }
      }
    }
  });
});
