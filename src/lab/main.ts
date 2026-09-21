/**
 * The feel lab.
 *
 * One straight, one bend, one straight, and a ship you drive yourself. The
 * question it exists to answer is not "what is the fastest line" — the game
 * can already compute that — but "does going round a corner feel like
 * anything". Nothing here scores, penalises or spends money. Going wide is
 * free, on purpose: the lab is about what the ship does, not what it costs.
 *
 * The ghost beside you is the same ship driven by a navigation system you set
 * from 0 to 100. The gap between you and it is, to the tick, what that
 * navigation is worth.
 */

import {
  alongAtScreen,
  drawBump,
  drawRoad,
  drawShip,
  drawStrip,
  drawTrail,
  fit,
  type Reading,
  type View,
} from './draw';
import {
  atRest,
  ceilingAhead,
  makePilot,
  holdingSpeed,
  steerToHold,
  step,
  type Flight,
  type Input,
  type Pilot,
  type Ship,
} from './flight';
import { GRIP_PER_HANDLING, KEY_STEER_OFF, KEY_STEER_ON, SLIDING_YAW, TICK_HZ } from './knobs';
import { bendEnd, bendStart, shapeLength, type Bump, type Hand, type Shape } from './shape';

const YOU = '#7ee0ff';
const GHOST = 'rgba(255, 209, 102, 0.75)';

/** What a shove pushes with when you have not said. A firm but survivable shove. */
const DEFAULT_PUSH = 0.3;

/** How long the halo on a newly placed shove lasts, in frames. */
const FLASH_FRAMES = 42;

/** How much of the recent past the strip shows, in ticks. */
const STRIP_TICKS = 380;

/** A tick is 1/60s; never advance more than this many in one frame after a stall. */
const MOST_CATCHUP = 8;

/**
 * How far off the line counts as gone. Nothing stops at it — the lab does not
 * punish — but past it the frame stops opening and the readout says so, because
 * a dot half a mile off the road is no longer telling you anything.
 */
const LOST = 150;

interface Preset {
  readonly name: string;
  readonly ship: Ship;
}

// Handling is quoted the way the game quotes it; grip is that times the game's
// GRIP_PER_HANDLING, so a ship set up here means the same thing there.
function shipOf(thrust: number, handling: number, brake: number): Ship {
  return {
    topSpeed: 0.85 * thrust,
    accel: 0.0035 * thrust,
    brake,
    grip: GRIP_PER_HANDLING * handling,
  };
}

const PRESETS: readonly Preset[] = [
  { name: 'Balanced', ship: shipOf(1.4, 1.2, 0.0075) },
  { name: 'Speed', ship: shipOf(2.2, 0.8, 0.006) },
  { name: 'Grip', ship: shipOf(1.1, 2.0, 0.011) },
  { name: 'Barge', ship: shipOf(2.4, 0.6, 0.004) },
];

interface Held {
  gas: boolean;
  slow: boolean;
  left: boolean;
  right: boolean;
}

interface Lab {
  ship: Ship;
  shape: Shape;
  you: Flight;
  ghost: Flight;
  trail: Flight[];
  ghostTrail: Flight[];
  past: Flight[][];
  history: Reading[];
  held: Held;
  /** What holding the keys has built up to, which is not yet what the ship does. */
  asked: number;
  done: number | undefined;
  ghostDone: number | undefined;
  showGhost: boolean;
  /** The ghost's navigation rating, 0 to 100. 100 is the reference line. */
  nav: number;
  /** Bumped every run, so each attempt draws its own misjudgements. */
  runSeed: number;
  pilot: Pilot;
}

const lab: Lab = {
  ship: PRESETS[0]!.ship,
  shape: { entry: 320, radius: 55, sweep: Math.PI / 2, exit: 320, hand: 1, halfWidth: 9 },
  you: atRest(),
  ghost: atRest(),
  trail: [],
  ghostTrail: [],
  past: [],
  history: [],
  held: { gas: false, slow: false, left: false, right: false },
  asked: 0,
  done: undefined,
  ghostDone: undefined,
  showGhost: true,
  nav: 100,
  runSeed: 1,
  pilot: () => ({ throttle: 0, steer: 0 }),
};

function restart(keepPast = true): void {
  if (keepPast && lab.trail.length > 30) {
    lab.past = [lab.trail].concat(lab.past).slice(0, 1);
  }
  lab.you = atRest();
  lab.ghost = atRest();
  lab.asked = 0;
  // The pilot carries its own wander, so a run is started by making a new one
  // rather than by resetting the old one. A fresh seed each time, so you see
  // the spread of what a rating means and not one lucky draw of it.
  // A shorter course can leave the shove past the end of it, where it would
  // silently never fire.
  const bump = lab.shape.bump;
  const last = shapeLength(lab.shape) - 10;
  if (bump !== undefined && bump.at > last) {
    lab.shape = { ...lab.shape, bump: { ...bump, at: Math.max(10, last) } };
  }
  lab.runSeed += 1;
  lab.pilot = makePilot(lab.ship, lab.shape, lab.nav, lab.runSeed);
  lab.trail = [lab.you];
  lab.ghostTrail = [lab.ghost];
  lab.history = [];
  lab.done = undefined;
  lab.ghostDone = undefined;
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function playerInput(): Input {
  const { gas, slow, left, right } = lab.held;
  const throttle = slow ? -1 : gas ? 1 : 0;
  // A key is on or off; what it builds up to is not. Holding winds the command
  // on, letting go unwinds it faster, and the ship's own lag comes after.
  const want = (right ? 1 : 0) - (left ? 1 : 0);
  const rate = want === 0 ? KEY_STEER_OFF : KEY_STEER_ON;
  lab.asked += (want - lab.asked) * rate;
  return { throttle, steer: lab.asked };
}

const KEYS: Readonly<Record<string, keyof Held>> = {
  ArrowUp: 'gas',
  KeyW: 'gas',
  ArrowDown: 'slow',
  KeyS: 'slow',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
};

const PADS: readonly { key: keyof Held; label: string; hint: string; kind: string }[] = [
  { key: 'left', label: '◀', hint: 'A', kind: '' },
  { key: 'slow', label: 'Brake', hint: 'S / ↓', kind: 'slow' },
  { key: 'gas', label: 'Thrust', hint: 'W / ↑', kind: 'gas' },
  { key: 'right', label: '▶', hint: 'D', kind: '' },
];

function wireControls(): void {
  const pads = document.getElementById('pads') as HTMLElement;
  for (const pad of PADS) {
    const el = document.createElement('button');
    el.className = `pad ${pad.kind}`;
    el.innerHTML = `${pad.label}<small>${pad.hint}</small>`;
    const set = (on: boolean) => (event: Event): void => {
      event.preventDefault();
      lab.held[pad.key] = on;
      el.classList.toggle('on', on);
    };
    el.addEventListener('pointerdown', set(true));
    el.addEventListener('pointerup', set(false));
    el.addEventListener('pointerleave', set(false));
    el.addEventListener('pointercancel', set(false));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    pads.append(el);
  }

  // Tapping the road puts the shove where you tapped, which is a great deal
  // easier than finding a distance on a slider.
  const track = document.getElementById('track') as HTMLCanvasElement;
  track.addEventListener('pointerdown', (event) => {
    if (lastView === undefined) return;
    const box = track.getBoundingClientRect();
    const at = alongAtScreen(lab.shape, lastView, event.clientX - box.left, event.clientY - box.top);
    const push = lab.shape.bump?.push ?? DEFAULT_PUSH;
    lab.shape = { ...lab.shape, bump: { at, push } };
    shoveFlash = FLASH_FRAMES;
    restart(false);
    syncTray();
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyR') return restart();
    if (event.code === 'Space') {
      event.preventDefault();
      return restart();
    }
    const key = KEYS[event.code];
    if (key === undefined) return;
    event.preventDefault();
    lab.held[key] = true;
  });
  window.addEventListener('keyup', (event) => {
    const key = KEYS[event.code];
    if (key !== undefined) lab.held[key] = false;
  });
  window.addEventListener('blur', () => {
    lab.held = { gas: false, slow: false, left: false, right: false };
  });
}

// ---------------------------------------------------------------------------
// The tuning tray
// ---------------------------------------------------------------------------

interface Knob {
  readonly name: string;
  readonly low: number;
  readonly high: number;
  readonly step: number;
  readonly read: () => number;
  readonly write: (value: number) => void;
  readonly show: (value: number) => string;
}

function shipKnobs(): Knob[] {
  const set = (patch: Partial<Ship>): void => {
    lab.ship = { ...lab.ship, ...patch };
    restart(false);
  };
  return [
    {
      name: 'Top speed',
      low: 0.5, high: 2.6, step: 0.05,
      read: () => lab.ship.topSpeed,
      write: (v) => set({ topSpeed: v }),
      show: (v) => `${(v * TICK_HZ).toFixed(0)}/s`,
    },
    {
      name: 'Pickup',
      low: 0.0015, high: 0.014, step: 0.0005,
      read: () => lab.ship.accel,
      write: (v) => set({ accel: v }),
      show: (v) => (v * 1000).toFixed(1),
    },
    {
      name: 'Brakes',
      low: 0.003, high: 0.022, step: 0.0005,
      read: () => lab.ship.brake,
      write: (v) => set({ brake: v }),
      show: (v) => (v * 1000).toFixed(1),
    },
    {
      name: 'Handling',
      low: 0.5, high: 2.4, step: 0.05,
      read: () => lab.ship.grip / GRIP_PER_HANDLING,
      write: (v) => set({ grip: GRIP_PER_HANDLING * v }),
      show: (v) => v.toFixed(2),
    },
  ];
}

function shapeKnobs(): Knob[] {
  const set = (patch: Partial<Shape>): void => {
    lab.shape = { ...lab.shape, ...patch };
    restart(false);
  };
  return [
    {
      name: 'Radius',
      low: 20, high: 130, step: 1,
      read: () => lab.shape.radius,
      write: (v) => set({ radius: v }),
      show: (v) => v.toFixed(0),
    },
    {
      name: 'How much',
      low: 25, high: 160, step: 5,
      read: () => (lab.shape.sweep * 180) / Math.PI,
      write: (v) => set({ sweep: (v * Math.PI) / 180 }),
      show: (v) => `${v.toFixed(0)}°`,
    },
    {
      name: 'Approach',
      low: 80, high: 700, step: 20,
      read: () => lab.shape.entry,
      write: (v) => set({ entry: v }),
      show: (v) => v.toFixed(0),
    },
    {
      name: 'Path width',
      low: 4, high: 30, step: 1,
      read: () => lab.shape.halfWidth,
      write: (v) => set({ halfWidth: v }),
      show: (v) => (v * 2).toFixed(0),
    },
  ];
}

/** Re-reads every slider from the state, for changes made outside the tray. */
let syncTray: () => void = () => {};

function buildTray(): void {
  const tray = document.getElementById('tray') as HTMLElement;
  const redraws: (() => void)[] = [];
  syncTray = () => redraws.forEach((f) => f());

  const section = (title: string): void => {
    const h = document.createElement('h3');
    h.textContent = title;
    tray.append(h);
  };

  const slider = (knob: Knob): void => {
    const row = document.createElement('label');
    const name = document.createElement('span');
    name.textContent = knob.name;
    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(knob.low);
    input.max = String(knob.high);
    input.step = String(knob.step);
    const out = document.createElement('b');
    const sync = (): void => {
      input.value = String(knob.read());
      out.textContent = knob.show(knob.read());
    };
    input.addEventListener('input', () => {
      knob.write(Number(input.value));
      out.textContent = knob.show(Number(input.value));
    });
    sync();
    redraws.push(sync);
    row.append(name, input, out);
    tray.append(row);
  };

  section('The ship');
  const presets = document.createElement('div');
  presets.className = 'presets';
  for (const preset of PRESETS) {
    const button = document.createElement('button');
    button.textContent = preset.name;
    button.addEventListener('click', () => {
      lab.ship = preset.ship;
      redraws.forEach((f) => f());
      restart(false);
    });
    presets.append(button);
  }
  tray.append(presets);
  shipKnobs().forEach(slider);

  section('The corner');
  shapeKnobs().forEach(slider);
  const flip = document.createElement('div');
  flip.className = 'presets';
  const hand = document.createElement('button');
  hand.textContent = 'Turn the other way';
  hand.addEventListener('click', () => {
    lab.shape = { ...lab.shape, hand: (lab.shape.hand === 1 ? -1 : 1) as Hand };
    restart(false);
  });
  flip.append(hand);
  tray.append(flip);

  section('A shove');
  const shoveNote = document.createElement('p');
  shoveNote.className = 'note';
  shoveNote.innerHTML =
    'Something on the road that knocks the ship sideways — debris, a rival, a gust. ' +
    'Both you and the ghost hit it, so it is the way to see what a navigation system ' +
    'does about being thrown off.';
  tray.append(shoveNote);

  const shoveActs = document.createElement('div');
  shoveActs.className = 'presets';
  const put = document.createElement('button');
  const setShove = (bump: Bump | undefined): void => {
    lab.shape = { ...lab.shape, bump };
    if (bump !== undefined) shoveFlash = FLASH_FRAMES;
    restart(false);
    syncTray();
  };
  put.addEventListener('click', () => {
    setShove(
      lab.shape.bump === undefined
        ? { at: bendStart(lab.shape) - 60, push: DEFAULT_PUSH }
        : undefined,
    );
  });
  shoveActs.append(put);
  tray.append(shoveActs);
  const labelPut = (): void => {
    put.textContent = lab.shape.bump === undefined ? 'Put one on the road' : 'Take it off';
  };
  // Run it now as well as on every later sync: a control that is only labelled
  // once something else changes is a blank button when the tray first opens.
  labelPut();
  redraws.push(labelPut);

  slider({
    name: 'How hard',
    low: -0.6, high: 0.6, step: 0.05,
    read: () => lab.shape.bump?.push ?? 0,
    write: (v) => {
      lab.shape =
        Math.abs(v) < 0.001
          ? { ...lab.shape, bump: undefined }
          : { ...lab.shape, bump: { at: lab.shape.bump?.at ?? bendStart(lab.shape) - 60, push: v } };
      restart(false);
      syncTray();
    },
    show: (v) => (Math.abs(v) < 0.001 ? 'off' : `${v > 0 ? 'right' : 'left'} ${Math.abs(v).toFixed(2)}`),
  });
  slider({
    name: 'Where',
    low: 20, high: 2000, step: 10,
    read: () => lab.shape.bump?.at ?? bendStart(lab.shape) - 60,
    write: (v) => {
      // Moving it puts one there if there is not one already. Returning early
      // here instead made the slider do nothing at all until the other slider
      // had been touched, which reads exactly like a broken control.
      const at = Math.min(v, shapeLength(lab.shape) - 10);
      lab.shape = { ...lab.shape, bump: { at, push: lab.shape.bump?.push ?? DEFAULT_PUSH } };
      shoveFlash = FLASH_FRAMES;
      restart(false);
      syncTray();
    },
    show: (v) => v.toFixed(0),
  });

  section('The ghost');
  slider({
    name: 'Navigation',
    low: 0, high: 100, step: 5,
    read: () => lab.nav,
    write: (v) => {
      lab.nav = v;
      restart(false);
    },
    show: (v) => (v >= 100 ? 'perfect' : v.toFixed(0)),
  });
  const toggle = document.createElement('label');
  toggle.className = 'toggle';
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.checked = lab.showGhost;
  box.addEventListener('change', () => {
    lab.showGhost = box.checked;
  });
  const words = document.createElement('span');
  words.textContent = 'Show the ghost';
  toggle.append(box, words);
  tray.append(toggle);

  const note = document.createElement('p');
  note.className = 'note';
  note.innerHTML =
    'The ghost is <em>your ship</em>, driven by its navigation system. At ' +
    '<em>100</em> it reads the road one steering-lag ahead and knows exactly where ' +
    'the line and the limit are — nothing about it is faster than you, it only ' +
    'knows sooner. Turn it down and it reads less of the road ahead, and drifts ' +
    'slowly wrong about where the line is and how fast it may go. Every run draws ' +
    'a fresh set of misjudgements, so press <em>R</em> a few times: a low rating is ' +
    'not just worse, it is <em>inconsistent</em>.';
  tray.append(note);

  const acts = document.createElement('div');
  acts.className = 'acts';
  const again = document.createElement('button');
  again.textContent = 'Run again  (R)';
  again.addEventListener('click', () => restart());
  const shut = document.createElement('button');
  shut.textContent = 'Close';
  shut.addEventListener('click', () => tray.classList.remove('open'));
  acts.append(again, shut);
  tray.append(acts);

  const opener = document.getElementById('tune') as HTMLElement;
  opener.addEventListener('click', () => {
    // It only has to be noticed once.
    opener.classList.remove('new');
    tray.classList.toggle('open');
  });
}

// ---------------------------------------------------------------------------
// The readouts
// ---------------------------------------------------------------------------

interface Cell {
  readonly name: string;
  readonly value: string;
  readonly tone?: 'hot' | 'ok';
}

function hudCells(): Cell[] {
  const { ship, shape, you } = lab;
  const limit = holdingSpeed(ship, shape.radius);
  const need = steerToHold(ship, shape, you);
  const off = Math.abs(you.offset);
  const cells: Cell[] = [
    { name: 'Speed', value: `${(you.speed * TICK_HZ).toFixed(0)}` },
    {
      name: 'Corner takes',
      value: `${(limit * TICK_HZ).toFixed(0)}`,
      tone: you.speed > limit ? 'hot' : undefined,
    },
    {
      name: 'Off centre',
      value: off.toFixed(1),
      tone: off > shape.halfWidth ? 'hot' : off < shape.halfWidth * 0.4 ? 'ok' : undefined,
    },
    {
      name: 'Lock used',
      value: `${Math.min(999, Math.abs(need) * 100).toFixed(0)}%`,
      tone: Math.abs(need) > 1 ? 'hot' : undefined,
    },
    { name: 'Time', value: `${((lab.done ?? you.tick) / TICK_HZ).toFixed(2)}s` },
  ];
  if (lab.showGhost) {
    const gap = (lab.done ?? you.tick) - (lab.ghostDone ?? lab.ghost.tick);
    const ahead = lab.you.along - lab.ghost.along;
    cells.push(
      lab.done !== undefined && lab.ghostDone !== undefined
        ? {
            name: `vs nav ${lab.nav}`,
            value: `${gap > 0 ? '+' : ''}${(gap / TICK_HZ).toFixed(2)}s`,
            tone: gap <= 0 ? 'ok' : 'hot',
          }
        : {
            name: `vs nav ${lab.nav}`,
            value: `${ahead > 0 ? '+' : ''}${ahead.toFixed(0)}`,
            tone: ahead >= 0 ? 'ok' : undefined,
          },
    );
  }
  return cells;
}

function verdict(): string {
  const { ship, shape, you } = lab;
  if (lab.done !== undefined) {
    const gap = lab.ghostDone === undefined ? undefined : lab.done - lab.ghostDone;
    if (gap === undefined) return 'Through. <em>R</em> to run it again.';
    const them = lab.nav >= 100 ? 'a perfect line' : `navigation ${lab.nav}`;
    return gap <= 0
      ? `Through, and <em>${(-gap / TICK_HZ).toFixed(2)}s up on ${them}</em>. <em>R</em> to go again.`
      : `Through, <em>${(gap / TICK_HZ).toFixed(2)}s</em> behind ${them}. <em>R</em> to go again.`;
  }
  if (Math.abs(you.offset) > LOST) return 'Gone. <em>R</em> to run it again.';
  if (Math.abs(you.yaw) > SLIDING_YAW) {
    return Math.abs(you.offset) > shape.halfWidth
      ? 'Sliding, and off the path — <em>steer back and be patient with it</em>.'
      : 'Sliding — <em>there is no lock left to correct with</em>.';
  }
  const need = Math.abs(steerToHold(ship, shape, you));
  const onBend = you.along >= bendStart(shape) && you.along <= bendEnd(shape);
  if (onBend && need > 1) return `The corner needs <em>${(need * 100).toFixed(0)}%</em> of a lock that only goes to 100.`;
  if (onBend && need > 0.9) return 'On the limit. Nothing spare.';
  if (onBend) return `Holding it on <em>${(need * 100).toFixed(0)}%</em> lock.`;
  const gap = bendStart(shape) - you.along;
  if (gap > 0 && gap < you.speed * 90) {
    const limit = holdingSpeed(ship, shape.radius);
    return you.speed > limit
      ? `Corner in <em>${gap.toFixed(0)}</em>. You are <em>${((you.speed / limit - 1) * 100).toFixed(0)}%</em> over what it takes.`
      : `Corner in <em>${gap.toFixed(0)}</em>. You have room.`;
  }
  if (you.along > bendEnd(shape)) return 'Out. Get back on the power.';
  return (
    'Thrust to build speed — the corner is what you are building it for. ' +
    '<em>Ship &amp; corner</em>, top right, changes the ship and the bend.'
  );
}

function paintHud(): void {
  const hud = document.getElementById('hud') as HTMLElement;
  const cells = hudCells();
  hud.innerHTML =
    cells
      .map(
        (c) =>
          `<div class="card"><b>${c.name}</b><span class="${c.tone ?? ''}">${c.value}</span></div>`,
      )
      .join('') + `<div id="verdict">${verdict()}</div>`;
}

interface Bar {
  readonly name: string;
  readonly fill: number;
  readonly middled?: boolean;
  readonly need?: number;
  readonly cap?: number;
  readonly over?: boolean;
}

function gaugeBars(): Bar[] {
  const { ship, shape, you } = lab;
  const ceiling = ceilingAhead(ship, shape, you.along);
  const need = steerToHold(ship, shape, you);
  return [
    {
      name: 'Speed',
      fill: you.speed / ship.topSpeed,
      cap: Math.min(1, ceiling / ship.topSpeed),
      over: you.speed > ceiling * 1.02,
    },
    {
      name: 'Steering — the mark is what the corner needs',
      fill: you.steer,
      middled: true,
      need: Math.max(-1, Math.min(1, need)),
      over: Math.abs(need) > 1,
    },
    {
      name: 'Off centre',
      fill: Math.max(-1, Math.min(1, you.offset / (shape.halfWidth * 3))),
      middled: true,
      cap: 1 / 3,
      over: Math.abs(you.offset) > shape.halfWidth,
    },
  ];
}

function paintGauges(): void {
  const host = document.getElementById('gauges') as HTMLElement;
  host.innerHTML = gaugeBars()
    .map((bar) => {
      const pieces: string[] = [];
      if (bar.middled) {
        const width = Math.abs(bar.fill) * 50;
        const left = bar.fill >= 0 ? 50 : 50 - width;
        pieces.push(`<i class="val mid" style="left:${left}%;width:${width}%"></i>`);
      } else {
        pieces.push(`<i class="val" style="width:${Math.max(0, bar.fill) * 100}%"></i>`);
      }
      if (bar.need !== undefined) {
        pieces.push(`<i class="need" style="left:${50 + bar.need * 50}%"></i>`);
      }
      if (bar.cap !== undefined) {
        const at = bar.middled ? [50 - bar.cap * 50, 50 + bar.cap * 50] : [bar.cap * 100];
        at.forEach((x) => pieces.push(`<i class="cap" style="left:${x}%"></i>`));
      }
      return `<div class="gauge"><b>${bar.name}</b><div class="meter ${
        bar.over ? 'over' : ''
      }">${pieces.join('')}</div></div>`;
    })
    .join('');
}

// ---------------------------------------------------------------------------
// The loop
// ---------------------------------------------------------------------------

function advance(): void {
  const end = shapeLength(lab.shape);
  if (lab.done === undefined) {
    lab.you = step(lab.ship, lab.shape, lab.you, playerInput());
    lab.trail.push(lab.you);
    if (lab.you.along >= end) lab.done = lab.you.tick;
  }
  if (lab.ghostDone === undefined) {
    lab.ghost = step(lab.ship, lab.shape, lab.ghost, lab.pilot(lab.ghost));
    lab.ghostTrail.push(lab.ghost);
    if (lab.ghost.along >= end) lab.ghostDone = lab.ghost.tick;
  }
  lab.history.push({
    speed: lab.you.speed,
    ceiling: ceilingAhead(lab.ship, lab.shape, lab.you.along),
    offset: lab.you.offset,
  });
  if (lab.history.length > STRIP_TICKS) lab.history.shift();
}

function sizeFor(canvas: HTMLCanvasElement): { width: number; height: number } {
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
  }
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { width, height };
}

/** The view the road was last drawn with, so a tap can be read back into it. */
let lastView: View | undefined;

/** Frames of halo left on the shove, so placing one is visibly acknowledged. */
let shoveFlash = 0;

function paint(): void {
  const track = document.getElementById('track') as HTMLCanvasElement;
  const ctx = track.getContext('2d') as CanvasRenderingContext2D;
  const { width, height } = sizeFor(track);
  ctx.clearRect(0, 0, width, height);
  // Open the frame enough to keep whichever ship is furthest off the line in
  // sight, up to the point where a run is plainly gone.
  const strayed = Math.max(
    Math.abs(lab.you.offset),
    lab.showGhost ? Math.abs(lab.ghost.offset) : 0,
  );
  const view: View = fit(lab.shape, width, height, Math.min(strayed, LOST));

  lastView = view;
  drawRoad(ctx, view, lab.shape);
  drawBump(ctx, view, lab.shape, shoveFlash / FLASH_FRAMES);
  if (shoveFlash > 0) shoveFlash -= 1;
  for (const old of lab.past) drawTrail(ctx, view, lab.shape, old, 'rgba(126,224,255,0.22)', true);
  if (lab.showGhost) {
    drawTrail(ctx, view, lab.shape, lab.ghostTrail, GHOST, true);
    drawShip(ctx, view, lab.shape, lab.ghost, GHOST, 7);
  }
  drawTrail(ctx, view, lab.shape, lab.trail, YOU);
  drawShip(ctx, view, lab.shape, lab.you, YOU);

  const strip = document.getElementById('strip') as HTMLCanvasElement;
  const stripCtx = strip.getContext('2d') as CanvasRenderingContext2D;
  const stripSize = sizeFor(strip);
  drawStrip(stripCtx, stripSize.width, stripSize.height, lab.history, lab.ship.topSpeed);

  paintHud();
  paintGauges();
}

function start(): void {
  buildTray();
  wireControls();
  restart(false);

  // Real time in, whole ticks out. The model never sees a clock.
  let carried = 0;
  let last = performance.now();
  const frame = (now: number): void => {
    carried += Math.min(now - last, 250);
    last = now;
    const per = 1000 / TICK_HZ;
    let budget = MOST_CATCHUP;
    while (carried >= per && budget-- > 0) {
      carried -= per;
      advance();
    }
    if (budget <= 0) carried = 0;
    paint();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

start();
