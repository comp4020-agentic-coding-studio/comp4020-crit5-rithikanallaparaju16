// The rules a machine can check, kept free of canvas, DOM and time so the
// spec tests can call them directly. Everything here is a pure function of the
// state handed to it.

/** A run holds 100 units of fuel. */
export const FUEL_CAPACITY = 100;

/**
 * Fuel burns even at a standstill. This is the rule that makes "too slow" a
 * way to lose: idling is not a way to wait out the clock, it is a way to run
 * dry a long way from the target.
 */
export const IDLE_BURN_PER_SECOND = 0.7;

/** Full throttle costs this much a second, on top of nothing at all. */
export const THROTTLE_BURN_PER_SECOND = 1.9;

/**
 * Past this much lean, resting on the ground, the rover is on its roof and the
 * run is over. Mid-air rotation is free -- you can spin as much as you like,
 * you just have to land on your wheels.
 */
export const FLIP_ANGLE = Math.PI * 0.55;

/** Shorter than this and it was a bump, not a jump. */
export const MIN_AIR_SECONDS = 0.2;

export type Outcome = "flipped" | "out-of-fuel" | "arrived";

export interface RunState {
  readonly tiltRad: number;
  readonly onGround: boolean;
  readonly fuel: number;
  readonly distance: number;
  readonly target: number;
}

/** The ending this state has reached, or null while play continues. */
export function outcome(s: RunState): Outcome | null {
  if (s.onGround && Math.abs(s.tiltRad) > FLIP_ANGLE) return "flipped";
  if (s.fuel <= 0) return "out-of-fuel";
  if (s.distance >= s.target) return "arrived";
  return null;
}

/**
 * Points for a hang. Quadratic, so a long float is worth much more than two
 * short ones -- that is what makes a player start aiming at crater lips
 * instead of just holding the throttle down.
 */
export function airScore(airborneSeconds: number): number {
  if (airborneSeconds < MIN_AIR_SECONDS) return 0;
  return Math.round(airborneSeconds * airborneSeconds * 120);
}

/** Fuel used in `dt` seconds at `throttle` (0..1). */
export function fuelBurn(throttle: number, dt: number): number {
  return (IDLE_BURN_PER_SECOND + THROTTLE_BURN_PER_SECOND * Math.max(0, throttle)) * dt;
}

/**
 * The longest a run can possibly last: a full tank, burnt at the idle rate,
 * by a player who never touches a pedal. The spec promises a stranger reaches
 * an ending inside five minutes, and this is the promise held as a number
 * rather than as a hope.
 */
export function maxRunSeconds(): number {
  return FUEL_CAPACITY / IDLE_BURN_PER_SECOND;
}
