// The ground, as a function of x. Seeded, so a run can be replayed and so the
// terrain under the rover is never a surprise to the physics: both the renderer
// and the collision code ask this same function.

export interface Crater {
  readonly x: number;
  readonly radius: number;
  readonly depth: number;
}

export interface Pickup {
  x: number;
  y: number;
  taken: boolean;
}

export interface Landmarked {
  readonly x: number;
  readonly index: number;
}

export interface Terrain {
  height(x: number): number;
  /** dy/dx at x. */
  slope(x: number): number;
  readonly craters: readonly Crater[];
  readonly pickups: Pickup[];
  readonly landmarks: readonly Landmarked[];
  readonly length: number;
}

/** Small, fast, seeded PRNG -- same seed, same course. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeTerrain(seed: number, length: number, landmarkCount: number): Terrain {
  const rand = mulberry32(seed);

  // Rolling base ground: a few sines at different scales. Deliberately gentle
  // near x=0 so the opening seconds are forgiving -- a stranger's first move
  // should not be able to end the run.
  const waves = Array.from({ length: 4 }, (_, i) => ({
    amp: (7 + rand() * 9) / (i + 1),
    len: 70 + rand() * 190 * (i + 1),
    phase: rand() * Math.PI * 2,
  }));

  const craters: Crater[] = [];
  let cx = 210;
  while (cx < length + 220) {
    craters.push({ x: cx, radius: 22 + rand() * 26, depth: 9 + rand() * 15 });
    cx += 95 + rand() * 130;
  }

  /**
   * The whole course runs downhill: a steep-ish ramp for the first 120 m, then
   * a shallow grade the rest of the way.
   *
   * This is not decoration. On flat ground the rover sits still until a pedal
   * is touched, and a player who has not worked out that there are pedals sees
   * a motionless screen -- which is the one thing a game with no instructions
   * cannot afford. Rolling from the first frame is what teaches, without words,
   * that this thing moves and that the moving is the game.
   */
  function base(x: number): number {
    const ease = Math.min(1, Math.max(0, x / 110));
    const grade = -(0.22 * Math.min(x, 100) + 0.045 * Math.max(0, x - 100));
    let y = 0;
    for (const w of waves) y += Math.sin((x / w.len) * Math.PI * 2 + w.phase) * w.amp;
    return y * ease + grade;
  }

  function height(x: number): number {
    let y = base(x);
    for (const c of craters) {
      const d = Math.abs(x - c.x);
      if (d > c.radius * 1.35) continue;
      if (d <= c.radius) {
        // Bowl, plus a raised rim. The rim is the launch ramp -- craters are
        // the reason air time is available at all.
        y -= Math.cos((d / c.radius) * (Math.PI / 2)) * c.depth;
      } else {
        const t = (d - c.radius) / (c.radius * 0.35);
        y += Math.sin((1 - t) * Math.PI) * c.depth * 0.32;
      }
    }
    return y;
  }

  const e = 0.35;
  const slope = (x: number): number => (height(x + e) - height(x - e)) / (2 * e);

  const pickups: Pickup[] = [];
  for (let x = 150; x < length - 40; x += 90 + rand() * 120) {
    pickups.push({ x, y: height(x) + 11 + rand() * 16, taken: false });
  }

  const landmarks: Landmarked[] = Array.from({ length: landmarkCount }, (_, i) => ({
    x: Math.round((length * (i + 1)) / (landmarkCount + 1)),
    index: i,
  }));

  return { height, slope, craters, pickups, landmarks, length };
}
