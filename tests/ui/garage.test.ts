/**
 * @vitest-environment jsdom
 *
 * The garage is where a run is actually decided, so what the cards say — and
 * that a tap picks the part it shows — is worth testing.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createGarage, type Garage } from '../../src/ui/garage';
import { choosePart, startRun, type Run } from '../../src/sim/run';
import { PARTS, type Part } from '../../src/sim/ship';
import { SLICE_TRACK } from '../../src/sim/track';

const cards = (): HTMLButtonElement[] =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.garage-card'));

const screen = (): HTMLElement => {
  const el = document.querySelector<HTMLElement>('.garage');
  if (el === null) throw new Error('No garage on the page');
  return el;
};

const tap = (card: HTMLButtonElement): void => {
  card.dispatchEvent(
    new window.Event('pointerdown', { bubbles: true, cancelable: true }),
  );
};

describe('the garage screen', () => {
  let garage: Garage;
  let run: Run;
  let chosen: Part[];

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    garage = createGarage(document.body);
    run = startRun(SLICE_TRACK, 3);
    chosen = [];
  });

  it('starts hidden, and shows when the garage opens', () => {
    expect(screen().hidden).toBe(true);
    garage.show(run, (part) => chosen.push(part));
    expect(screen().hidden).toBe(false);
    garage.hide();
    expect(screen().hidden).toBe(true);
  });

  it('shows one card per part on offer', () => {
    garage.show(run, (part) => chosen.push(part));
    expect(cards()).toHaveLength(run.offer.length);
    run.offer.forEach((part, i) => {
      expect(cards()[i]?.textContent).toContain(part.name);
    });
  });

  it('says what each part gives and what it costs', () => {
    garage.show(run, (part) => chosen.push(part));
    cards().forEach((card, i) => {
      const part = run.offer[i];
      expect(part).toBeDefined();
      expect(card.textContent).toContain(part!.blurb);
      // Every slice part is one upside and one cost, so both colours appear.
      expect(card.querySelectorAll('.garage-gain').length).toBeGreaterThan(0);
      expect(card.querySelectorAll('.garage-cost').length).toBeGreaterThan(0);
    });
  });

  it('writes deltas in the stat’s own units, with a sign', () => {
    // Show a known offer by driving the DOM directly with a fixed part.
    const fixed: Run = { ...run, offer: [PARTS.ablativePlating] };
    garage.show(fixed, (part) => chosen.push(part));
    const text = cards()[0]?.textContent ?? '';
    expect(text).toContain('+40 hull');
    expect(text).toContain('speed');
    expect(text).toMatch(/[−-]0\.08/);
  });

  it('reports the part whose card was tapped', () => {
    garage.show(run, (part) => chosen.push(part));
    const second = cards()[1];
    expect(second).toBeDefined();
    tap(second!);
    expect(chosen).toEqual([run.offer[1]]);
  });

  it('shows the ship as it stands, so hull is part of the decision', () => {
    garage.show(run, (part) => chosen.push(part));
    const line = document.querySelector('.garage-ship')?.textContent ?? '';
    expect(line).toContain('Hull 100/100');
    expect(line).toContain('nothing bolted on yet');
  });

  it('lists the parts already bolted on once there are some', () => {
    const racing = choosePart(run, run.offer[0]!);
    garage.show({ ...racing, phase: 'garage', offer: run.offer }, () => {});
    expect(document.querySelector('.garage-ship')?.textContent).toContain(
      run.offer[0]!.name,
    );
  });

  it('names the stage the player is about to fly', () => {
    garage.show(run, () => {});
    expect(document.querySelector('.garage-title')?.textContent).toContain(
      'before stage 1 of 3',
    );
  });

  it('replaces the cards when it opens again', () => {
    garage.show(run, () => {});
    const later: Run = { ...run, stage: 1, offer: [PARTS.ionThruster] };
    garage.show(later, (part) => chosen.push(part));
    expect(cards()).toHaveLength(1);
    expect(cards()[0]?.textContent).toContain(PARTS.ionThruster.name);
  });
});
