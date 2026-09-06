/**
 * @vitest-environment jsdom
 *
 * The HUD is the one part of the game the player touches, so the tap path and
 * the readouts are worth testing rather than eyeballing.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createHud, type Hud } from '../../src/ui/hud';
import { ACTIVES, type ActiveId } from '../../src/sim/actives';
import { startRace, stepRace, type RaceState } from '../../src/sim/race';
import { PARTS } from '../../src/sim/ship';
import { SLICE_TRACK } from '../../src/sim/track';

const buttons = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.hud-button'));

const buttonFor = (name: string): HTMLButtonElement => {
  const found = buttons().find((b) => b.textContent?.includes(name));
  if (found === undefined) throw new Error(`No button for ${name}`);
  return found;
};

const barText = (kind: string): string =>
  document.querySelector(`.${kind} .hud-bar-label`)?.textContent ?? '';

const tap = (button: HTMLButtonElement): void => {
  button.dispatchEvent(
    new window.Event('pointerdown', { bubbles: true, cancelable: true }),
  );
};

const fresh = (): RaceState => startRace(SLICE_TRACK, [], 1, { stage: 0 });

describe('the HUD', () => {
  let taps: ActiveId[];
  let hud: Hud;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    taps = [];
    hud = createHud(document.body, (active) => taps.push(active));
  });

  it('shows a button for each active, with its name', () => {
    expect(buttons()).toHaveLength(2);
    expect(buttonFor(ACTIVES.shields.name)).toBeDefined();
    expect(buttonFor(ACTIVES.powerReroute.name)).toBeDefined();
  });

  it('reports a tap with the active that was pressed', () => {
    tap(buttonFor(ACTIVES.powerReroute.name));
    tap(buttonFor(ACTIVES.shields.name));
    expect(taps).toEqual(['powerReroute', 'shields']);
  });

  it('reports a tap on pointerdown, not on click', () => {
    // A tap should land on the tick the finger went down.
    buttonFor(ACTIVES.shields.name).dispatchEvent(
      new window.Event('click', { bubbles: true }),
    );
    expect(taps).toEqual([]);
    tap(buttonFor(ACTIVES.shields.name));
    expect(taps).toEqual(['shields']);
  });

  it('shows hull, heat and shields from the race state', () => {
    const state = fresh();
    hud.update(state);
    expect(barText('hud-hull')).toContain('HULL');
    expect(barText('hud-hull')).toContain('100');
    expect(barText('hud-heat')).toContain('0/100');
    expect(barText('hud-shield')).toContain('SHIELDS');
  });

  it('tracks the stage it is racing', () => {
    hud.update(startRace(SLICE_TRACK, [], 1, { stage: 2 }));
    expect(document.querySelector('.hud-stage')?.textContent).toContain('Stage 3 / 3');
  });

  it('marks the hull bar when the ship is badly hurt', () => {
    const state = startRace(SLICE_TRACK, [], 1, { stage: 0, startHull: 10 });
    hud.update(state);
    expect(document.querySelector('.hud-hull')?.classList.contains('is-low')).toBe(true);
  });

  it('marks the heat bar while the ship is cooking', () => {
    // Reroute on a ship that already runs hot, until it is over tolerance.
    const state = startRace(SLICE_TRACK, [PARTS.overclockedReactor], 1, { stage: 0 });
    stepRace(state, ['powerReroute']);
    for (let i = 0; i < 110; i++) stepRace(state);
    hud.update(state);
    expect(state.heat).toBeGreaterThan(state.stats.heatTolerance);
    expect(document.querySelector('.hud-heat')?.classList.contains('is-over')).toBe(true);
    expect(barText('hud-heat')).toContain('OVERHEATING');
  });

  it('lights a button while its active is on, and counts it down', () => {
    const state = fresh();
    stepRace(state, ['shields']);
    hud.update(state);
    const shields = buttonFor(ACTIVES.shields.name);
    expect(shields.classList.contains('is-on')).toBe(true);
    expect(shields.textContent).toContain('on —');
  });

  it('disables a button on cooldown and says when it is ready', () => {
    const state = fresh();
    stepRace(state, ['shields']);
    for (let i = 0; i < ACTIVES.shields.durationTicks + 5; i++) stepRace(state);
    hud.update(state);
    const shields = buttonFor(ACTIVES.shields.name);
    expect(shields.disabled).toBe(true);
    expect(shields.classList.contains('is-on')).toBe(false);
    expect(shields.textContent).toContain('ready in');
  });

  it('enables a button again once its cooldown has run', () => {
    const state = fresh();
    stepRace(state, ['shields']);
    for (let i = 0; i < ACTIVES.shields.cooldownTicks; i++) stepRace(state);
    hud.update(state);
    expect(buttonFor(ACTIVES.shields.name).disabled).toBe(false);
  });

  it('disables both buttons once the race is over', () => {
    const state = fresh();
    while (!state.over) stepRace(state);
    hud.update(state);
    buttons().forEach((button) => expect(button.disabled).toBe(true));
  });

  it('can be hidden for the garage and shown again for a race', () => {
    const panel = document.querySelector('.hud');
    expect(panel).toBeDefined();
    hud.setVisible(false);
    expect((panel as HTMLElement).hidden).toBe(true);
    hud.setVisible(true);
    expect((panel as HTMLElement).hidden).toBe(false);
  });
});
