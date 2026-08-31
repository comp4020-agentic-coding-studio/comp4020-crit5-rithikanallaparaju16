// Rover motion. Not a rigid-body solver: two wheel contact points against a
// heightfield, which is enough for the one thing the game is about -- whether
// you land on your wheels.
import type { Body } from "./bodies.ts";
import { FLIP_ANGLE, FUEL_CAPACITY, fuelBurn } from "./rules.ts";
import type { Terrain } from "./terrain.ts";

export const WHEELBASE = 13;
export const RIDE_HEIGHT = 5.4;

export interface Rover {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Radians. 0 is level; positive is nose-up. */
  angle: number;
  angVel: number;
  onGround: boolean;
  /** Seconds in the current hang; 0 while grounded. */
  airTime: number;
  /** Set on the frame a landing is judged; the caller scores and clears it. */
  landedAfter: number;
  /**
   * Chassis lean relative to the ground beneath it. On the frame the rover
   * touches down this holds the angle it ARRIVED at, before any snap to the
   * slope -- `rules.outcome()` is the only thing that decides whether that
   * counts as a crash, so the rule the spec test pins is the rule the game
   * runs on.
   */
  tiltRad: number;
  fuel: number;
  facing: 1 | -1;
}

export interface Input {
  /** 0..1 */
  gas: number;
  /** 0..1 */
  brake: number;
}

export function makeRover(terrain: Terrain): Rover {
  return {
    x: 0,
    y: terrain.height(0) + RIDE_HEIGHT,
    vx: 0,
    vy: 0,
    angle: 0,
    angVel: 0,
    onGround: true,
    airTime: 0,
    landedAfter: 0,
    tiltRad: 0,
    fuel: FUEL_CAPACITY,
    facing: 1,
  };
}

const MAX_SPEED = 46;
const DRIVE = 30;
const BRAKE_FORCE = 34;
const ROLL_DRAG = 0.16;
const AIR_TORQUE = 4.2;

/** One fixed step. Mutates and returns `r`. */
export function step(r: Rover, input: Input, body: Body, terrain: Terrain, dt: number): Rover {
  const g = body.gravity;
  r.fuel = Math.max(0, r.fuel - fuelBurn(input.gas, dt));
  const powered = r.fuel > 0 ? input.gas : 0;

  // Sample the ground at a FIXED left-right pair, never at the chassis-projected
  // wheel positions. Projecting through cos(angle) swaps left and right once the
  // rover passes vertical, so atan2 returned a ground angle near PI and
  // `angle - groundAngle` cancelled to zero: an upside-down rover reported no
  // lean at all and the run never ended. The ground's slope does not depend on
  // which way the chassis is pointing.
  const xLeft = r.x - WHEELBASE / 2;
  const xRight = r.x + WHEELBASE / 2;
  const yLeft = terrain.height(xLeft);
  const yRight = terrain.height(xRight);
  const support = Math.max(yLeft, yRight) + RIDE_HEIGHT;
  const groundAngle = Math.atan2(yRight - yLeft, WHEELBASE);

  const wasAirborne = !r.onGround;
  const touching = r.y <= support + 0.6;

  if (touching) {
    const landingTilt = normalise(r.angle - groundAngle);
    if (wasAirborne) {
      // A landing is judged on the angle it arrived at. Mid-air rotation is
      // free; arriving upside down is not.
      r.landedAfter = r.airTime;
      r.airTime = 0;
    }
    r.onGround = true;
    r.tiltRad = landingTilt;
    r.y = support;
    if (r.vy < 0) r.vy = 0;

    // Hug the slope -- unless it came down on its roof, in which case leave it
    // there so the player can see why the run ended.
    if (Math.abs(landingTilt) <= FLIP_ANGLE) {
      r.angle = normalise(r.angle + normalise(groundAngle - r.angle) * Math.min(1, dt * 12));
      r.tiltRad = normalise(r.angle - groundAngle);
    }
    r.angVel *= 0.82;

    const tangent = Math.atan(terrain.slope(r.x));
    // Gravity along the slope: this is why a hill costs fuel and why letting
    // go on a downslope still rolls.
    r.vx += -Math.sin(tangent) * g * dt * 1.15;
    r.vx += Math.cos(tangent) * powered * DRIVE * dt;
    if (input.brake > 0) {
      const bite = Math.min(Math.abs(r.vx), BRAKE_FORCE * input.brake * dt);
      r.vx -= Math.sign(r.vx) * bite;
      r.angVel -= AIR_TORQUE * 0.25 * input.brake * dt;
    }
    r.vx -= r.vx * ROLL_DRAG * dt;
  } else {
    r.onGround = false;
    r.tiltRad = normalise(r.angle - Math.atan(terrain.slope(r.x)));
    r.airTime += dt;
    r.vy -= g * dt;
    // Airborne, the pedals become attitude control -- there is no air out here
    // to argue with, so gas pitches the nose up and brake brings it down, and
    // that is the whole of flight. Discovered, never explained: hold gas off a
    // crater rim and the nose lifts. Authority has to be real enough to save a
    // bad launch, because landing on the wheels is the entire skill.
    r.angVel += (powered - input.brake) * AIR_TORQUE * dt;
    r.angVel *= 1 - 0.22 * dt;
    r.angle = normalise(r.angle + r.angVel * dt);
  }

  r.vx = Math.max(-MAX_SPEED * 0.45, Math.min(MAX_SPEED, r.vx));
  r.x += r.vx * dt;
  r.y += r.vy * dt;

  const floor = terrain.height(r.x) + RIDE_HEIGHT;
  if (r.y < floor) {
    r.y = floor;
    if (r.vy < 0) r.vy = 0;
  }
  if (r.x < 0) {
    r.x = 0;
    if (r.vx < 0) r.vx = 0;
  }
  if (Math.abs(r.vx) > 0.6) r.facing = r.vx > 0 ? 1 : -1;
  return r;
}

/** Wrap to (-PI, PI]. */
export function normalise(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a <= -Math.PI) a += Math.PI * 2;
  return a;
}
