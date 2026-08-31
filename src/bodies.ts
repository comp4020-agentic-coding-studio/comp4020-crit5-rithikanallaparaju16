// Where a run happens. Gravity is the one number that changes how the game
// plays, so it is the only thing here the physics reads -- everything else is
// dressing and the landmark facts.
//
// Real surface gravities in m/s^2, which is the point: the Moon's 1.62 is why
// a jump hangs, and Ceres' 0.27 is why one there is absurd.

export interface Landmark {
  readonly name: string;
  readonly fact: string;
}

export interface Body {
  readonly id: string;
  readonly name: string;
  /** Surface gravity, m/s^2. */
  readonly gravity: number;
  /** Ground fill, and the sky it sits under. */
  readonly ground: string;
  readonly groundDeep: string;
  readonly sky: [string, string];
  /** How far a run there is, in metres. */
  readonly target: number;
  readonly landmarks: readonly Landmark[];
}

export const MOON: Body = {
  id: "moon",
  name: "The Moon",
  gravity: 1.62,
  ground: "#6f6a76",
  groundDeep: "#2a2733",
  sky: ["#10131a", "#1d1a2e"],
  target: 1200,
  landmarks: [
    { name: "Tycho Crater", fact: "Tycho is about 108 million years young — a baby, for a crater." },
    { name: "Clavius Crater", fact: "Clavius is 225 km across and holds craters inside its own walls." },
    { name: "Mare Tranquillitatis", fact: "Apollo 11 set down here. The dust still holds the bootprints." },
    { name: "Copernicus Crater", fact: "Copernicus has terraced walls, slumped like a collapsed cake." },
  ],
};

const MARS: Body = {
  id: "mars",
  name: "Mars",
  gravity: 3.72,
  ground: "#a4562f",
  groundDeep: "#4a1f12",
  sky: ["#2a1410", "#61301c"],
  target: 1400,
  landmarks: [
    { name: "Olympus Mons", fact: "Olympus Mons is 22 km tall — nearly three Everests, stacked." },
    { name: "Valles Marineris", fact: "Valles Marineris would run the length of the United States." },
    { name: "Gale Crater", fact: "Gale Crater held a lake. Curiosity has been reading its floor since 2012." },
  ],
};

const TITAN: Body = {
  id: "titan",
  name: "Titan",
  gravity: 1.35,
  ground: "#9c7a3c",
  groundDeep: "#3d2c11",
  sky: ["#2b2005", "#6d5417"],
  target: 1300,
  landmarks: [
    { name: "Kraken Mare", fact: "Kraken Mare is a sea of liquid methane, larger than the Caspian." },
    { name: "Ligeia Mare", fact: "It rains methane on Titan, and the drops fall slowly in the thick air." },
  ],
};

const EUROPA: Body = {
  id: "europa",
  name: "Europa",
  gravity: 1.31,
  ground: "#c8d7e6",
  groundDeep: "#3b5773",
  sky: ["#0a1520", "#1c3550"],
  target: 1250,
  landmarks: [
    { name: "Conamara Chaos", fact: "Europa's crust is ice, cracked and re-frozen over a saltwater ocean." },
    { name: "Pwyll Crater", fact: "Pwyll's rays are bright because the impact threw up fresh, clean ice." },
  ],
};

const CERES: Body = {
  id: "ceres",
  name: "Ceres",
  gravity: 0.27,
  ground: "#8d8577",
  groundDeep: "#33302a",
  sky: ["#0d0f12", "#25262b"],
  target: 1000,
  landmarks: [
    { name: "Occator Crater", fact: "Occator's bright spots are salt, left where briny water reached the surface." },
    { name: "Ahuna Mons", fact: "Ceres is the largest thing in the asteroid belt, and still only 940 km across." },
  ],
};

export const BODIES: readonly Body[] = [CERES, EUROPA, TITAN, MOON, MARS];

/**
 * The first run is always the Moon: it is the one everybody can already
 * picture, so the gravity reads as "floaty" rather than as "broken". Once a
 * player knows what a jump feels like, somewhere else is a surprise instead of
 * a confusion.
 */
export function bodyForRun(runIndex: number, rand: () => number): Body {
  if (runIndex <= 0) return MOON;
  return BODIES[Math.min(BODIES.length - 1, Math.floor(rand() * BODIES.length))];
}

/** Height reached by a launch of `v` m/s straight up, under gravity `g`. */
export function jumpApex(v: number, g: number): number {
  return (v * v) / (2 * g);
}
