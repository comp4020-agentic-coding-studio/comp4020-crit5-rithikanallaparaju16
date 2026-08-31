// Headless balance probe: run the real physics under scripted players and see
// where each one ends up. A screenshot cannot tell you whether a run is
// winnable; this can.
import { BODIES, MOON } from "../src/bodies.ts";
import { makeRover, step } from "../src/physics.ts";
import { FUEL_CAPACITY, airScore, outcome } from "../src/rules.ts";
import { makeTerrain } from "../src/terrain.ts";

const PLAYERS: Record<string, (t: number, r: { vx: number; onGround: boolean }) => { gas: number; brake: number }> = {
  "idle (never touches a pedal)": () => ({ gas: 0, brake: 0 }),
  "holds gas flat out": () => ({ gas: 1, brake: 0 }),
  "feathers gas (60% duty)": (t) => ({ gas: t % 1 < 0.6 ? 1 : 0, brake: 0 }),
  "cautious: gas, brake before landing": (t, r) => ({
    gas: r.onGround ? 1 : 0,
    brake: !r.onGround ? 0.6 : 0,
  }),
};

for (const body of [MOON, ...BODIES.filter((b) => b.id !== MOON.id)]) {
  console.log(`\n=== ${body.name}  (g=${body.gravity}, target=${body.target} m) ===`);
  for (const [label, brain] of Object.entries(PLAYERS)) {
    const results: string[] = [];
    for (const seed of [1, 2, 3, 4, 5]) {
      const terrain = makeTerrain(seed, body.target, body.landmarks.length);
      const rover = makeRover(terrain);
      let score = 0;
      let t = 0;
      let ending = "still going";
      const dt = 1 / 120;
      for (let i = 0; i < 120 * 320; i++) {
        t += dt;
        step(rover, brain(t, rover), body, terrain, dt);
        if (rover.landedAfter > 0) {
          score += airScore(rover.landedAfter);
          rover.landedAfter = 0;
        }
        for (const p of terrain.pickups) {
          if (!p.taken && Math.hypot(p.x - rover.x, p.y - rover.y) < 13 * 0.72) {
            p.taken = true;
            rover.fuel = Math.min(FUEL_CAPACITY, rover.fuel + 18);
            score += 25;
          }
        }
        const o = outcome({
          tiltRad: rover.tiltRad, onGround: rover.onGround,
          fuel: rover.fuel, distance: rover.x, target: body.target,
        });
        if (o) { ending = o; break; }
      }
      results.push(`${ending} @${Math.round(rover.x)}m ${Math.round(t)}s ${score}pts`);
    }
    console.log(`  ${label.padEnd(32)} ${results.join(" | ")}`);
  }
}
