import { createAudio } from "./audio.ts";
import type { Body } from "./bodies.ts";
import { bodyForRun } from "./bodies.ts";
import type { Input, Rover } from "./physics.ts";
import { RIDE_HEIGHT, WHEELBASE, makeRover, step } from "./physics.ts";
import type { Outcome } from "./rules.ts";
import { FUEL_CAPACITY, airScore, outcome } from "./rules.ts";
import type { Terrain } from "./terrain.ts";
import { makeTerrain, mulberry32 } from "./terrain.ts";

type Phase = "opening" | "intro" | "playing" | "over";

const FIXED_DT = 1 / 120;
const INTRO_SECONDS = 1.6;
const FACT_SECONDS = 5.5;
const PICKUP_FUEL = 18;
const PICKUP_POINTS = 25;

const VERDICT: Record<Outcome, string> = {
  flipped: "Wheels up",
  "out-of-fuel": "Dry tank",
  arrived: "Arrived",
};

interface Popup {
  x: number;
  y: number;
  life: number;
  text: string;
}

export function start(): void {
  const canvas = document.querySelector<HTMLCanvasElement>('[data-testid="stage"]')!;
  const ctx = canvas.getContext("2d")!;
  const bind = (name: string): HTMLElement =>
    document.querySelector<HTMLElement>(`[data-bind="${name}"]`)!;
  const testid = (name: string): HTMLElement =>
    document.querySelector<HTMLElement>(`[data-testid="${name}"]`)!;

  const el = {
    score: bind("score"),
    fuel: bind("fuel"),
    fuelBox: testid("fuel"),
    destination: bind("destination"),
    progress: bind("progress"),
    factBox: testid("fact"),
    factName: bind("fact-name"),
    factBody: bind("fact-body"),
    opening: testid("opening"),
    over: testid("over"),
    verdict: bind("verdict"),
    finalScore: bind("final-score"),
    finalDistance: bind("final-distance"),
    best: bind("best"),
    announcer: testid("announcer"),
    gas: testid("pedal-gas"),
    brake: testid("pedal-brake"),
  };

  const audio = createAudio();
  const sprite = new Image();
  let spriteReady = false;
  sprite.onload = () => {
    spriteReady = true;
  };
  sprite.src = "./art/rover.png";

  let phase: Phase = "opening";
  let runIndex = 0;
  let body: Body;
  let terrain: Terrain;
  let rover: Rover;
  let score = 0;
  let best = 0;
  let introT = 0;
  let factT = 0;
  let shownLandmarks = new Set<number>();
  let popups: Popup[] = [];
  let cam = { x: 0, y: 0, scale: 6 };
  let shake = 0;
  const input: Input = { gas: 0, brake: 0 };
  const stars = Array.from({ length: 150 }, () => {
    const r = mulberry32(Math.floor(Math.random() * 1e9));
    return { x: r(), y: r(), z: 0.25 + r() * 0.8, s: 0.6 + r() * 1.5 };
  });

  // ------------------------------------------------------------------ view
  let W = 0;
  let H = 0;
  function resize(): void {
    const dpr = Math.min(2.5, window.devicePixelRatio || 1);
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  /**
   * Pixels per metre, set per orientation rather than from one formula: a
   * phone in portrait wants about 60 m of ground across, a 1920x1080 desktop
   * about 150 m. Driven off the short edge in landscape so the rover reads at
   * a comparable size in both marking viewports.
   */
  const targetScale = (): number =>
    H > W ? Math.max(4.2, Math.min(9, W / 58)) : Math.max(6, Math.min(13, H / 74));
  /** Where the rover sits, as a fraction down the screen. Kept clear of the
   *  pedal row at the bottom, with sky above for the jumps. */
  const horizon = (): number => H * (H > W ? 0.68 : 0.74);
  const sx = (wx: number): number => W / 2 + (wx - cam.x) * cam.scale;
  const sy = (wy: number): number => horizon() - (wy - cam.y) * cam.scale;

  // ------------------------------------------------------------------ runs
  function newRun(): void {
    body = bodyForRun(runIndex, Math.random);
    terrain = makeTerrain(Math.floor(Math.random() * 1e9), body.target, body.landmarks.length);
    rover = makeRover(terrain);
    score = 0;
    introT = 0;
    factT = 0;
    shownLandmarks = new Set();
    popups = [];
    shake = 0;
    input.gas = 0;
    input.brake = 0;
    cam = { x: rover.x, y: rover.y + 2, scale: targetScale() * 0.2 };
    el.destination.textContent = body.name;
    el.factBox.hidden = true;
    setPhase("intro");
    say(`${body.name}. Gravity ${body.gravity} metres per second squared.`);
  }

  function setPhase(next: Phase): void {
    phase = next;
    document.body.dataset.phase = next;
    el.opening.hidden = next !== "opening";
    el.over.hidden = next !== "over";
  }

  function say(message: string): void {
    el.announcer.textContent = message;
  }

  function end(reason: Outcome): void {
    setPhase("over");
    audio.music(false);
    audio.engine(0, 0);
    audio.sting(reason);
    best = Math.max(best, score);
    el.verdict.textContent = VERDICT[reason];
    el.finalScore.textContent = String(score);
    el.finalDistance.textContent = `${Math.round(rover.x)} m`;
    el.best.textContent = String(best);
    say(`${VERDICT[reason]}. ${score} points over ${Math.round(rover.x)} metres.`);
    runIndex += 1;
  }

  // ----------------------------------------------------------------- input
  function pedal(el2: HTMLElement, which: "gas" | "brake"): void {
    const down = (on: boolean) => (event: Event) => {
      event.preventDefault();
      input[which] = on ? 1 : 0;
      el2.dataset.down = String(on);
    };
    el2.addEventListener("pointerdown", down(true));
    for (const type of ["pointerup", "pointercancel", "pointerleave"]) {
      el2.addEventListener(type, down(false));
    }
    // Keyboard activation of a button fires click, which has no press/release
    // -- give it a short pulse so tabbing to a pedal still drives.
    el2.addEventListener("keydown", (event) => {
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        input[which] = 1;
        el2.dataset.down = "true";
      }
    });
    el2.addEventListener("keyup", () => {
      input[which] = 0;
      el2.dataset.down = "false";
    });
  }
  pedal(el.gas, "gas");
  pedal(el.brake, "brake");

  const GAS_KEYS = new Set(["ArrowRight", "d", "D", " ", "w", "W", "ArrowUp"]);
  const BRAKE_KEYS = new Set(["ArrowLeft", "a", "A", "s", "S", "ArrowDown"]);
  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (GAS_KEYS.has(event.key)) {
      input.gas = 1;
      el.gas.dataset.down = "true";
    } else if (BRAKE_KEYS.has(event.key)) {
      input.brake = 1;
      el.brake.dataset.down = "true";
    }
  });
  window.addEventListener("keyup", (event) => {
    if (GAS_KEYS.has(event.key)) {
      input.gas = 0;
      el.gas.dataset.down = "false";
    } else if (BRAKE_KEYS.has(event.key)) {
      input.brake = 0;
      el.brake.dataset.down = "false";
    }
  });

  testid("start").addEventListener("click", () => {
    // Synchronous, inside the gesture: the AudioContext has to resume here or
    // iOS keeps it suspended and the first run is silent.
    audio.resume();
    audio.music(true);
    newRun();
  });
  testid("again").addEventListener("click", () => {
    audio.resume();
    audio.music(true);
    newRun();
  });

  // ---------------------------------------------------------------- update
  function update(dt: number): void {
    if (phase === "intro") {
      introT += dt;
      const t = Math.min(1, introT / INTRO_SECONDS);
      const ease = 1 - Math.pow(1 - t, 3);
      cam.scale = targetScale() * (0.2 + 0.8 * ease);
      cam.x = rover.x;
      cam.y = rover.y;
      if (t >= 1) setPhase("playing");
      return;
    }
    if (phase !== "playing") return;

    step(rover, input, body, terrain, dt);

    if (rover.landedAfter > 0) {
      const points = airScore(rover.landedAfter);
      if (points > 0) {
        score += points;
        popups.push({ x: rover.x, y: rover.y + 9, life: 1.1, text: `+${points}` });
      }
      shake = Math.min(1, rover.landedAfter * 0.8);
      audio.thump(Math.min(1, rover.landedAfter));
      rover.landedAfter = 0;
    }

    for (const p of terrain.pickups) {
      if (p.taken) continue;
      if (Math.hypot(p.x - rover.x, p.y - rover.y) < WHEELBASE * 0.72) {
        p.taken = true;
        rover.fuel = Math.min(FUEL_CAPACITY, rover.fuel + PICKUP_FUEL);
        score += PICKUP_POINTS;
        popups.push({ x: p.x, y: p.y + 6, life: 1.1, text: `+${PICKUP_POINTS}` });
        audio.chime();
      }
    }

    for (const mark of terrain.landmarks) {
      if (shownLandmarks.has(mark.index) || rover.x < mark.x) continue;
      shownLandmarks.add(mark.index);
      const landmark = body.landmarks[mark.index % body.landmarks.length];
      el.factName.textContent = landmark.name;
      el.factBody.textContent = landmark.fact;
      el.factBox.hidden = false;
      factT = FACT_SECONDS;
      say(`${landmark.name}. ${landmark.fact}`);
    }
    if (factT > 0) {
      factT -= dt;
      if (factT <= 0) el.factBox.hidden = true;
    }

    for (const p of popups) p.life -= dt;
    popups = popups.filter((p) => p.life > 0);

    shake = Math.max(0, shake - dt * 2.4);
    audio.engine(input.gas, Math.abs(rover.vx));

    // Camera: lead the rover a little so a fast run can see what is coming,
    // and follow height loosely so a big jump actually feels like altitude.
    const lead = rover.vx * 0.42;
    cam.x += (rover.x + lead - cam.x) * Math.min(1, dt * 6);
    cam.y += (rover.y + 2 - cam.y) * Math.min(1, dt * 2.6);
    cam.scale += (targetScale() - cam.scale) * Math.min(1, dt * 3);

    const reason = outcome({
      tiltRad: rover.tiltRad,
      onGround: rover.onGround,
      fuel: rover.fuel,
      distance: rover.x,
      target: body.target,
    });
    if (reason) end(reason);

    // HUD
    el.score.textContent = String(score);
    const fuelPct = (rover.fuel / FUEL_CAPACITY) * 100;
    el.fuel.style.width = `${fuelPct}%`;
    el.fuelBox.dataset.low = String(fuelPct < 20);
    el.progress.style.width = `${Math.min(100, (rover.x / body.target) * 100)}%`;
  }

  // ---------------------------------------------------------------- render
  function drawSky(): void {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, body ? body.sky[0] : "#10131a");
    g.addColorStop(1, body ? body.sky[1] : "#1d1a2e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#ffffff";
    for (const s of stars) {
      const px = (((s.x * W - cam.x * cam.scale * s.z * 0.12) % W) + W) % W;
      const py = s.y * horizon();
      ctx.globalAlpha = 0.25 + s.z * 0.55;
      ctx.fillRect(px, py, s.s, s.s);
    }
    ctx.globalAlpha = 1;
  }

  /** Distant planet and a parallax ridge: the sky was empty, and a jump reads
   *  as height only if something behind it stays put. */
  function drawBackdrop(): void {
    const span = W * 2.6;
    const cx = (((W * 0.74 - cam.x * cam.scale * 0.035) % span) + span) % span - W * 0.3;
    const cy = horizon() * 0.3;
    const r = Math.min(W, H) * 0.1;
    ctx.save();
    ctx.globalAlpha = 0.9;
    const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.15, cx, cy, r);
    g.addColorStop(0, "#3fd6d0");
    g.addColorStop(1, "#0d5f66");
    ctx.shadowColor = "rgba(63,214,208,0.55)";
    ctx.shadowBlur = r * 0.9;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Far ridge, in screen space rather than sampled from the heightfield.
    // Sampling the terrain meant the ridge inherited the course's downhill
    // grade, which at a 1.9x parallax read as one enormous hill across the
    // whole frame instead of a distant skyline.
    const drift = cam.x * 0.05;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let sxp = 0; sxp <= W + 6; sxp += 6) {
      const u = sxp / Math.max(1, W);
      const y =
        horizon() -
        Math.min(H * 0.16, 46) -
        Math.sin(u * 5.1 + drift * 0.02) * 26 -
        Math.sin(u * 11.3 + drift * 0.031) * 13;
      ctx.lineTo(sxp, y);
    }
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fillStyle = body.groundDeep;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawIntroBody(): void {
    if (phase !== "intro") return;
    const t = Math.min(1, introT / INTRO_SECONDS);
    const r = Math.min(W, H) * (0.42 - 0.3 * t);
    ctx.globalAlpha = 1 - t * t;
    const g = ctx.createRadialGradient(W * 0.5, H * 0.42, r * 0.1, W * 0.5, H * 0.42, r);
    g.addColorStop(0, body.ground);
    g.addColorStop(1, body.groundDeep);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(W * 0.5, H * 0.42, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  function drawTerrain(): void {
    const left = cam.x - W / 2 / cam.scale - 6;
    const right = cam.x + W / 2 / cam.scale + 6;
    const stepPx = 2;
    ctx.beginPath();
    ctx.moveTo(sx(left), H);
    for (let px = 0; px <= W + stepPx; px += stepPx) {
      const wx = left + (px / cam.scale);
      ctx.lineTo(sx(wx), sy(terrain.height(wx)));
    }
    ctx.lineTo(sx(right), H);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, horizon() - 40, 0, H);
    g.addColorStop(0, body.ground);
    g.addColorStop(1, body.groundDeep);
    ctx.fillStyle = g;
    ctx.fill();

    // Rim highlight, so a crater lip reads as an edge you can launch off.
    ctx.beginPath();
    for (let px = 0; px <= W + stepPx; px += stepPx) {
      const wx = left + (px / cam.scale);
      const y = sy(terrain.height(wx));
      if (px === 0) ctx.moveTo(sx(wx), y);
      else ctx.lineTo(sx(wx), y);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.42)";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function drawPickups(): void {
    for (const p of terrain.pickups) {
      if (p.taken) continue;
      const x = sx(p.x);
      const y = sy(p.y);
      if (x < -40 || x > W + 40) continue;
      const pulse = 1 + Math.sin(performance.now() / 260 + p.x) * 0.12;
      const r = cam.scale * 1.5 * pulse;
      ctx.save();
      ctx.shadowColor = "#7bf59b";
      ctx.shadowBlur = 18;
      ctx.fillStyle = "#7bf59b";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = "#0c2a16";
      ctx.lineWidth = Math.max(1.5, r * 0.22);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.45, y);
      ctx.lineTo(x + r * 0.45, y);
      ctx.moveTo(x, y - r * 0.45);
      ctx.lineTo(x, y + r * 0.45);
      ctx.stroke();
    }
  }

  function drawRover(): void {
    const x = sx(rover.x);
    const y = sy(rover.y);
    const w = WHEELBASE * 1.62 * cam.scale;
    const h = spriteReady ? w * (sprite.naturalHeight / sprite.naturalWidth) : w * 0.66;
    ctx.save();
    ctx.translate(x, y);
    // Screen y runs down, so a nose-up world angle is a negative screen
    // rotation. Facing flips the sprite about its own centre, so the rover
    // always looks the way it is travelling.
    ctx.rotate(-rover.angle);
    // The source art faces LEFT -- headlights on the left end, flag on the
    // back at the right -- so travelling right is the mirrored case, not the
    // identity one. Drawn unmirrored, the rover drove backwards.
    ctx.scale(-rover.facing, 1);
    if (spriteReady) {
      ctx.drawImage(sprite, -w / 2, RIDE_HEIGHT * cam.scale - h, w, h);
    } else {
      ctx.fillStyle = "#e8622c";
      ctx.fillRect(-w / 2, RIDE_HEIGHT * cam.scale - h, w, h);
    }
    ctx.restore();
  }

  function drawPopups(): void {
    ctx.font = `700 ${Math.round(cam.scale * 3.4)}px Rubik, system-ui, sans-serif`;
    ctx.textAlign = "center";
    for (const p of popups) {
      ctx.globalAlpha = Math.min(1, p.life);
      ctx.fillStyle = "#5de6ff";
      ctx.fillText(p.text, sx(p.x), sy(p.y) - (1.1 - p.life) * 40);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "start";
  }

  function render(): void {
    ctx.save();
    if (shake > 0) {
      ctx.translate((Math.random() - 0.5) * shake * 9, (Math.random() - 0.5) * shake * 9);
    }
    drawSky();
    if (phase === "opening") {
      ctx.restore();
      return;
    }
    drawBackdrop();
    drawIntroBody();
    drawTerrain();
    drawPickups();
    drawRover();
    drawPopups();
    ctx.restore();
  }

  // ------------------------------------------------------------------ loop
  let last = performance.now();
  let acc = 0;
  function frame(now: number): void {
    acc += Math.min(0.25, (now - last) / 1000);
    last = now;
    while (acc >= FIXED_DT) {
      update(FIXED_DT);
      acc -= FIXED_DT;
    }
    render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
