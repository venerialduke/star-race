// Properties mean something.
//
// Until now a stretch of track could say nothing about itself but how long it
// was and how hard it turned, which is why every split had to be balanced on
// the clock. The vocabulary landed in stage 1 and did nothing; this is the
// suite for it doing something.
//
// The claims worth pinning are not "a nebula is 0.82". That is a tuning number
// and it will move. They are the shape of the thing: that a stretch which says
// nothing costs nothing at all, that a sector's word reaches its pieces and a
// piece can answer back, that low grip shows up as swing rather than as a new
// kind of loss, and that a hazard bites on the way in rather than by the tick —
// which this codebase has now got wrong three separate times.

import { describe, expect, it } from 'vitest';
import { startField, stepField, TRACK_OWNER, type Entrant } from '../../src/sim/field';
import {
  startRace,
  stepRace,
  type RaceConfig,
  type RaceState,
  type ShipStats,
} from '../../src/sim/race';
import { bareShip } from '../../src/sim/ship';
import {
  B,
  P,
  S,
  assemblePlan,
  effectOf,
  mergeProperties,
  resolvePieces,
  sector,
  sectorAt,
  walkPieces,
  type Piece,
  type Properties,
  type Track,
} from '../../src/sim/track';
import { ENVIRONMENTS } from '../../src/sim/tuning';

/** A ring that closes: two halves of 180°, the second the first turned round. */
const half: readonly Piece[] = [S(200), B(60, 90), S(120), B(60, 90)];

function loop(
  first: readonly Piece[] = half,
  properties?: Properties,
): ReturnType<typeof assemblePlan> {
  return assemblePlan({
    name: 'Test Loop',
    shape: 'test',
    par: 1000,
    ring: [
      sector('a', 'A', first, properties),
      sector('b', 'B', half),
      sector('c', 'C', half),
      sector('d', 'D', half),
    ],
  });
}

describe('what a set of properties comes to', () => {
  it('says nothing when nothing is said', () => {
    expect(effectOf(undefined)).toEqual({ grip: 1, sight: 1, hazard: 0, pocket: 0 });
    expect(effectOf({})).toEqual({ grip: 1, sight: 1, hazard: 0, pocket: 0 });
    expect(effectOf({ environment: 'open' })).toEqual(effectOf(undefined));
  });

  it('reads an environment as the bundle it names', () => {
    expect(effectOf({ environment: 'nebula' }).grip).toBe(ENVIRONMENTS.nebula.grip);
    expect(effectOf({ environment: 'shadow' }).sight).toBe(ENVIRONMENTS.shadow.sight);
    expect(effectOf({ environment: 'debris' }).hazard).toBe(ENVIRONMENTS.debris.hazard);
  });

  it('adds an explicit hazard on top of the environment rather than replacing it', () => {
    // "A debris field that is worse than most" is a thing an author wants to
    // say, and it is only sayable if the two stack.
    expect(effectOf({ environment: 'debris', hazard: 4 }).hazard).toBe(
      ENVIRONMENTS.debris.hazard + 4,
    );
  });
});

describe('a sector speaking for its pieces', () => {
  it('reaches every piece in it', () => {
    const only = resolvePieces(sector('a', 'A', half, { environment: 'nebula' }));
    expect(only.every((p) => p.properties?.environment === 'nebula')).toBe(true);
  });

  it('lets a piece override one field without cancelling the others', () => {
    const merged = mergeProperties({ environment: 'nebula', hazard: 3 }, { pocket: 5 });
    expect(merged).toEqual({ environment: 'nebula', hazard: 3, pocket: 5 });
  });

  it('lets a piece override the field it actually names', () => {
    const merged = mergeProperties({ environment: 'nebula' }, { environment: 'shadow' });
    expect(merged?.environment).toBe('shadow');
  });

  it('leaves a sector that says nothing exactly as it was', () => {
    const plain = sector('a', 'A', half);
    expect(resolvePieces(plain)).toBe(plain.pieces);
  });
});

describe('bands', () => {
  it('are empty for a track that says nothing', () => {
    // The whole feature has to cost nothing when unused, or every existing
    // track pays for it.
    const track = loop();
    expect(track.bands).toEqual([]);
    expect(track.sectors.every((s) => s.routes.every((r) => r.bands.length === 0))).toBe(
      true,
    );
  });

  it('mark exactly the stretch the piece covers', () => {
    const walk = walkPieces([S(100), P(S(60), { environment: 'nebula' }), S(40)]);
    expect(walk.bands).toHaveLength(1);
    expect(walk.bands[0]?.start).toBeCloseTo(100, 6);
    expect(walk.bands[0]?.end).toBeCloseTo(160, 6);
  });

  it('join neighbouring pieces that say the same thing', () => {
    // Three straights of one nebula are one nebula. A drawer handed three would
    // seam it twice, and a ship entering it would be bitten three times.
    const nebula = { environment: 'nebula' } as const;
    const walk = walkPieces([
      P(S(50), nebula),
      P(B(40, 30), nebula),
      P(S(50), nebula),
      S(20),
    ]);
    expect(walk.bands).toHaveLength(1);
    expect(walk.bands[0]?.end).toBeCloseTo(walk.length - 20, 6);
  });

  it('do not join stretches that say different things', () => {
    const walk = walkPieces([
      P(S(50), { environment: 'nebula' }),
      P(S(50), { environment: 'debris' }),
    ]);
    expect(walk.bands).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// What it does to a ship.
// ---------------------------------------------------------------------------

/**
 * Fast enough to be thrown about, and carrying shields so that a hazard has
 * something to land on. A bare ship has no shields and no parts, so nothing a
 * hazard does to it can be observed at all.
 */
const RACER: ShipStats = { ...bareShip(2.4, 0.8), shields: 60, shieldRegen: 1 };

/** Fly a track and watch it: what it ended as, and what happened on the way. */
function fly(track: Track, plan: RaceConfig['plan'], ticks = 3000) {
  let state = startRace(RACER, [], 0);
  const config: RaceConfig = { track, stats: RACER, plan, seed: 99 };
  let bitTicks = 0;
  let lost = 0;
  let inFirst = 0;
  for (let i = 0; i < ticks; i += 1) {
    const next = stepRace(state, config);
    if (next.shields < state.shields - 1e-9) {
      bitTicks += 1;
      lost += state.shields - next.shields;
    }
    if (sectorAt(track, next.distance) === 0) inFirst += 1;
    state = next;
  }
  return { state, bitTicks, lost, inFirst };
}

/** The widest this ship was thrown. */
const widest = (state: RaceState): number =>
  state.swings.reduce((most, s) => Math.max(most, s.swing), 0);

describe('grip', () => {
  it('throws the same ship wider through the same bend', () => {
    // The bet the whole game rests on, applied to a stretch instead of to a
    // build: same shape, same entry, less grip, more swing.
    const clear = fly(loop(), 'carry');
    const thick = fly(loop(half, { environment: 'nebula' }), 'carry');
    expect(widest(thick.state)).toBeGreaterThan(widest(clear.state));
  });

  it('costs time, because a ship thrown wider is a ship going slower', () => {
    const clear = fly(loop(), 'carry');
    const thick = fly(loop(half, { environment: 'nebula' }), 'carry');
    expect(thick.state.distance).toBeLessThan(clear.state.distance);
  });
});

describe('sight', () => {
  it('draws the swing from a worse place, so the same bend throws wider', () => {
    // Shadow is not a new way to lose. It is the swing, reached by being into
    // the bend before you were set — which is the same currency as everything
    // else the track can do to you.
    const clear = fly(loop(), 'carry');
    const dark = fly(loop(half, { environment: 'shadow' }), 'carry');
    const excessOf = (s: RaceState): number =>
      s.swings.reduce((most, x) => Math.max(most, x.excess), 0);
    expect(excessOf(dark.state)).toBeGreaterThan(excessOf(clear.state));
    expect(dark.state.distance).toBeLessThan(clear.state.distance);
  });

  it('cannot touch the plan that gives up its speed for certainty', () => {
    // Lift takes no swing at anything, so there is nothing for a surprise to
    // make worse. That is a deliberate property rather than a gap: the safe
    // plan is safe from this too, and it pays for that in time everywhere else.
    const clear = fly(loop(), 'lift');
    const dark = fly(loop(half, { environment: 'shadow' }), 'lift');
    expect(dark.state.distance).toBeCloseTo(clear.state.distance, 6);
  });
});

describe('hazard', () => {
  it('bites on the way in, not by the tick', () => {
    // The lesson S3.6 learned about parts, V1.2 about the wall, and S6 about
    // mines: per-tick damage bans a build rather than risking it.
    //
    // Lift is flown because it never goes wide, so the excursion hazard cannot
    // fire and every point of damage here is the road itself. Over this run the
    // ship spends the better part of a thousand ticks inside the debris field
    // and is bitten on two of them — once per crossing. Per tick would be the
    // whole thousand.
    const clear = fly(loop(), 'lift');
    const gritty = fly(loop(half, { environment: 'debris' }), 'lift');

    expect(clear.bitTicks).toBe(0);
    expect(gritty.bitTicks).toBeGreaterThan(0);
    expect(gritty.inFirst).toBeGreaterThan(500);
    expect(gritty.bitTicks).toBeLessThan(10);
  });

  it('costs more the faster it is met', () => {
    // The only scaling the game uses for damage, and the reason a debris field
    // on a straight is worse than one in a hairpin.
    const slow = fly(loop(half, { environment: 'debris' }), 'lift');
    const fast = fly(loop(half, { environment: 'debris' }), 'charge');
    expect(fast.lost / fast.bitTicks).toBeGreaterThan(slow.lost / slow.bitTicks);
  });

  it('does not touch a ship on a stretch that says nothing', () => {
    expect(fly(loop(), 'lift').lost).toBe(0);
  });
});

describe('pocket', () => {
  it('pays for the ground flown through it', () => {
    expect(fly(loop(half, { pocket: 10 }), 'carry').state.salvage).toBeGreaterThan(0);
  });

  it('pays nothing on a road that holds none', () => {
    expect(fly(loop(), 'carry').state.salvage).toBe(0);
  });

  it('pays twice as much for twice the pocket', () => {
    const thin = fly(loop(half, { pocket: 5 }), 'carry');
    const rich = fly(loop(half, { pocket: 10 }), 'carry');
    expect(rich.state.salvage).toBeCloseTo(thin.state.salvage * 2, 6);
  });
});

// ---------------------------------------------------------------------------
// Fixtures the author put there.
// ---------------------------------------------------------------------------

const entrant = (id: string): Entrant => ({
  id,
  name: id,
  stats: RACER,
  isPlayer: false,
});

function withMine(): Track {
  return assemblePlan({
    name: 'Mined Loop',
    shape: 'test',
    par: 1000,
    ring: [
      sector('a', 'A', half),
      sector('b', 'B', half),
      sector('c', 'C', half),
      sector('d', 'D', half),
    ],
    fixtures: [
      { id: 'trap', kind: 'mine', sector: 1, route: 0, at: 0.5, offset: 0, power: 40 },
    ],
  });
}

describe('what the author left on the road', () => {
  it('is on the track before anybody has raced on it', () => {
    const track = withMine();
    expect(track.fixtures).toHaveLength(1);
    const state = startField([entrant('one')], ['carry'], track);
    const laid = state.fixtures.filter((f) => f.owner === TRACK_OWNER);
    expect(laid).toHaveLength(1);
    // Half way through sector 1, on the golden path, in canonical distance —
    // authored as a fraction so that re-cutting the sector carries it along.
    const one = track.sectors[1];
    expect(laid[0]?.distance).toBeCloseTo(((one?.start ?? 0) + (one?.end ?? 0)) / 2, 6);
  });

  it('belongs to nobody, so it bites the whole field', () => {
    // A fixture never bites its owner. The track's own furniture has to have an
    // owner no entrant can be, or one ship would fly the track for free.
    const track = withMine();
    let state = startField([entrant('one'), entrant('two')], ['carry', 'carry'], track);
    for (let i = 0; i < 3000; i += 1) {
      state = stepField(state, { track, laps: 3, seed: 4 });
    }
    expect(state.ships.every((s) => s.state.met.includes('track:trap'))).toBe(true);
  });

  it('leaves a track with nothing on it with nothing on it', () => {
    expect(startField([entrant('one')], ['carry'], loop()).fixtures).toEqual([]);
  });
});
