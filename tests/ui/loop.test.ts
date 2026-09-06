/**
 * @vitest-environment jsdom
 *
 * The game loop end to end, without a browser: a fake clock, a render that
 * counts calls, and taps dispatched at real DOM buttons. This is the glue that
 * moves between garage, race and results — the piece a player walks through
 * every run, and the one no other test covers.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { createGame, type Game } from '../../src/ui/game';
import { stages } from '../../src/sim/track';
import {
  COUNTDOWN_TICKS,
  HOLD_AFTER_STAGE_TICKS,
  SLOW_MOTION_SCALE,
  TICK_RATE,
} from '../../src/sim/tuning';

const TICK_MS = 1000 / TICK_RATE;

/** A clock the test winds forward itself. */
class Clock {
  now = 0;

  /**
   * The first frame only establishes the baseline — no time has passed yet —
   * so hand the game one before winding anything forward.
   */
  prime(game: Game): void {
    game.frame(this.now);
  }

  advance(game: Game, ticks: number): void {
    // A second of ticks at a time, so the loop's backlog cap never bites.
    let left = ticks;
    while (left > 0) {
      const chunk = Math.min(left, TICK_RATE);
      this.now += chunk * TICK_MS;
      game.frame(this.now);
      left -= chunk;
    }
  }
}

const pointerdown = (el: Element): void => {
  el.dispatchEvent(new window.Event('pointerdown', { bubbles: true, cancelable: true }));
};

const firstCard = (): Element => {
  const card = document.querySelector('.garage-card');
  if (card === null) throw new Error('No garage card on screen');
  return card;
};

const visible = (selector: string): boolean => {
  const el = document.querySelector<HTMLElement>(selector);
  return el !== null && !el.hidden;
};

const message = (): string => document.querySelector('.hud-message')?.textContent ?? '';

describe('the game loop', () => {
  let clock: Clock;
  let game: Game;
  let rendered: number;

  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
    clock = new Clock();
    rendered = 0;
    game = createGame({
      root: document.body,
      render: () => {
        rendered += 1;
      },
      seed: 7,
    });
    clock.prime(game);
  });

  it('opens in the garage with an offer, and nothing racing', () => {
    expect(game.screen()).toBe('garage');
    expect(visible('.garage')).toBe(true);
    expect(visible('.hud')).toBe(false);
    expect(game.race()).toBeUndefined();
  });

  it('counts down before the ship launches, rather than jumping into the race', () => {
    pointerdown(firstCard());
    expect(game.screen()).toBe('countdown');
    expect(visible('.garage')).toBe(false);
    expect(visible('.hud')).toBe(true);
    expect(message()).toBe('3');

    // The ship does not move while the count is running.
    const before = game.race()?.tick;
    clock.advance(game, COUNTDOWN_TICKS - 1);
    expect(game.race()?.tick).toBe(before);
    expect(game.screen()).toBe('countdown');

    clock.advance(game, 1);
    expect(game.screen()).toBe('racing');
    expect(message()).toBe('');
  });

  it('shows the count going down', () => {
    pointerdown(firstCard());
    expect(message()).toBe('3');
    clock.advance(game, TICK_RATE);
    expect(message()).toBe('2');
    clock.advance(game, TICK_RATE);
    expect(message()).toBe('1');
  });

  it('ignores taps made before the flag', () => {
    pointerdown(firstCard());
    const shields = document.querySelectorAll('.hud-button')[0];
    expect(shields).toBeDefined();
    pointerdown(shields!);
    clock.advance(game, COUNTDOWN_TICKS + 30);
    const race = game.race();
    expect(race?.log.some((e) => e.kind === 'activeFired')).toBe(false);
  });

  it('takes taps during the race and feeds them to the sim', () => {
    pointerdown(firstCard());
    clock.advance(game, COUNTDOWN_TICKS + 10);
    const shields = document.querySelectorAll('.hud-button')[0];
    pointerdown(shields!);
    clock.advance(game, 5);
    expect(game.race()?.log.some((e) => e.kind === 'activeFired')).toBe(true);
  });

  it('draws every frame there is a race to draw', () => {
    pointerdown(firstCard());
    const before = rendered;
    clock.advance(game, TICK_RATE);
    expect(rendered).toBeGreaterThan(before);
  });

  it('holds the finished stage on screen, then opens the next garage', () => {
    pointerdown(firstCard());
    clock.advance(game, COUNTDOWN_TICKS);
    // Fly until the stage ends.
    for (let i = 0; i < 100 && game.screen() === 'racing'; i++)
      clock.advance(game, TICK_RATE);
    expect(game.screen()).toBe('held');
    expect(visible('.garage')).toBe(false);

    clock.advance(game, HOLD_AFTER_STAGE_TICKS);
    expect(game.screen()).toBe('garage');
    expect(visible('.garage')).toBe(true);
    expect(game.run().results).toHaveLength(1);
  });

  /** Play the whole run: pick the first card, fly, repeat. */
  const playToResults = (): void => {
    for (let guard = 0; guard < 10 && game.screen() !== 'results'; guard++) {
      if (game.screen() === 'garage') pointerdown(firstCard());
      for (
        let i = 0;
        i < 120 && game.screen() !== 'garage' && game.screen() !== 'results';
        i++
      ) {
        clock.advance(game, TICK_RATE);
      }
    }
  };

  it('plays three stages and lands on the results screen', () => {
    playToResults();
    expect(game.screen()).toBe('results');
    expect(visible('.results')).toBe(true);
    expect(visible('.hud')).toBe(false);
    expect(visible('.garage')).toBe(false);
    const run = game.run();
    expect(run.phase).toBe('done');
    expect(run.results.length).toBeLessThanOrEqual(stages(run.track).length);
  });

  it('records the taps the player actually made into the run', () => {
    pointerdown(firstCard());
    clock.advance(game, COUNTDOWN_TICKS + 20);
    pointerdown(document.querySelectorAll('.hud-button')[1]!); // reroute
    for (let i = 0; i < 100 && game.screen() !== 'garage'; i++)
      clock.advance(game, TICK_RATE);
    const first = game.run().results[0];
    expect(first).toBeDefined();
    expect(first!.outcome.log.some((e) => e.kind === 'activeFired')).toBe(true);
  });

  it('starts a fresh run from the results screen', () => {
    playToResults();
    const finishedSeed = game.run().seed;
    const again = document.querySelector('.results-again');
    expect(again).toBeDefined();
    pointerdown(again!);
    expect(game.screen()).toBe('garage');
    expect(game.run().seed).toBe(finishedSeed + 1);
    expect(game.run().results).toEqual([]);
    expect(game.run().build).toEqual([]);
  });

  it('survives a frame that arrives after a long pause', () => {
    pointerdown(firstCard());
    clock.advance(game, COUNTDOWN_TICKS);
    const tickBefore = game.race()?.tick ?? 0;
    // Ten minutes between frames: the loop catches up at most a second of it.
    clock.now += 600_000;
    game.frame(clock.now);
    const jumped = (game.race()?.tick ?? 0) - tickBefore;
    expect(jumped).toBeGreaterThan(0);
    expect(jumped).toBeLessThanOrEqual(TICK_RATE);
  });

  it('is deterministic: the same seed and the same taps give the same run', () => {
    const play = (): unknown => {
      document.body.innerHTML = '';
      document.head.innerHTML = '';
      const c = new Clock();
      const g = createGame({ root: document.body, render: () => {}, seed: 99 });
      c.prime(g);
      for (let guard = 0; guard < 10 && g.screen() !== 'results'; guard++) {
        if (g.screen() === 'garage') pointerdown(firstCard());
        for (
          let i = 0;
          i < 120 && g.screen() !== 'garage' && g.screen() !== 'results';
          i++
        ) {
          c.advance(g, TICK_RATE);
        }
      }
      return g
        .run()
        .results.map((r) => [r.stage, r.outcome.finishTicks, r.outcome.damageTaken]);
    };
    expect(play()).toEqual(play());
  });
});

describe('the slow-motion beat', () => {
  // Its own reset: without one these tests tap the previous test's garage,
  // which is still in the document, and drive nothing at all.
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  /** Play into stage 2, where the slice track's gamma burst is. */
  const flyTowardsTheBurst = (game: Game, clock: Clock): void => {
    // Stage 1, then the garage, then stage 2.
    pointerdown(firstCard());
    for (let i = 0; i < 120 && game.screen() !== 'garage'; i++) clock.advance(game, TICK_RATE);
    pointerdown(firstCard());
    clock.advance(game, COUNTDOWN_TICKS);
  };

  it('runs at full speed on open track', () => {
    const clock = new Clock();
    const game = createGame({ root: document.body, render: () => {}, seed: 7 });
    clock.prime(game);
    pointerdown(firstCard());
    clock.advance(game, COUNTDOWN_TICKS + 10);
    expect(game.timeScale()).toBe(1);
  });

  it('slows as the ship closes on the burst', () => {
    const clock = new Clock();
    const game = createGame({ root: document.body, render: () => {}, seed: 7 });
    clock.prime(game);
    flyTowardsTheBurst(game, clock);

    let slowest = 1;
    for (let i = 0; i < 400 && game.screen() === 'racing'; i++) {
      clock.advance(game, 1);
      slowest = Math.min(slowest, game.timeScale());
    }
    expect(slowest).toBeLessThan(1);
    expect(slowest).toBeGreaterThanOrEqual(SLOW_MOTION_SCALE);
  });

  it('buys fewer ticks per second while it is slow', () => {
    const clock = new Clock();
    const game = createGame({ root: document.body, render: () => {}, seed: 7 });
    clock.prime(game);
    flyTowardsTheBurst(game, clock);

    // Find the slow stretch, then measure a second of wall clock inside it.
    for (let i = 0; i < 400 && game.timeScale() === 1 && game.screen() === 'racing'; i++) {
      clock.advance(game, 1);
    }
    expect(game.timeScale()).toBeLessThan(1);
    const before = game.race()?.tick ?? 0;
    clock.now += 1000;
    game.frame(clock.now);
    const ticks = (game.race()?.tick ?? 0) - before;
    expect(ticks).toBeGreaterThan(0);
    expect(ticks).toBeLessThan(TICK_RATE);
  });

  it('never touches the race itself: the same taps give the same run', () => {
    // Slow motion changes when frames arrive, not what the simulation does. A
    // run driven with taps at fixed ticks lands identically either way.
    const play = (frameMs: number): unknown => {
      document.body.innerHTML = '';
      document.head.innerHTML = '';
      const clock = new Clock();
      const game = createGame({ root: document.body, render: () => {}, seed: 21 });
      clock.prime(game);
      for (let guard = 0; guard < 10 && game.screen() !== 'results'; guard++) {
        if (game.screen() === 'garage') pointerdown(firstCard());
        for (let i = 0; i < 4000 && game.screen() !== 'garage' && game.screen() !== 'results'; i++) {
          clock.now += frameMs;
          game.frame(clock.now);
        }
      }
      return game.run().results.map((r) => [r.stage, r.outcome.finishTicks, r.position]);
    };
    // Same game, frames arriving at different rates: identical outcomes.
    expect(play(16)).toEqual(play(33));
  });

  it('is back to full speed once the burst is behind the ship', () => {
    const clock = new Clock();
    const game = createGame({ root: document.body, render: () => {}, seed: 7 });
    clock.prime(game);
    flyTowardsTheBurst(game, clock);
    for (let i = 0; i < 600 && game.screen() === 'racing'; i++) clock.advance(game, 2);
    // By the end of the stage the burst is long past.
    expect(game.timeScale()).toBe(1);
  });
});
