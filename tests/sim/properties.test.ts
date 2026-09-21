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
  PROVING_GROUND,
  S,
  assemblePlan,
  bandAt,
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
import { labelOf } from '../../src/render/view';

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
function fly(track: Track, aim: RaceConfig['aim'], ticks = 3000) {
  let state = startRace(RACER, [], 0);
  const config: RaceConfig = { track, stats: RACER, aim, seed: 99 };
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
    const clear = fly(loop(), undefined);
    const thick = fly(loop(half, { environment: 'nebula' }), undefined);
    expect(widest(thick.state)).toBeGreaterThan(widest(clear.state));
  });

  it('costs time, because a ship thrown wider is a ship going slower', () => {
    const clear = fly(loop(), undefined);
    const thick = fly(loop(half, { environment: 'nebula' }), undefined);
    expect(thick.state.distance).toBeLessThan(clear.state.distance);
  });
});

describe('sight', () => {
  it('draws the swing from a worse place, so the same bend throws wider', () => {
    // Shadow is not a new way to lose. It is the swing, reached by being into
    // the bend before you were set — which is the same currency as everything
    // else the track can do to you.
    //
    // Both ships are held to the same entry speed on purpose. A ship left to
    // drive itself *answers* the dark by aiming lower — `safeAim` takes sight
    // off the line — so what the shadow costs a good driver is time, not width,
    // and the width only shows when the entry is held fixed.
    const clear = fly(loop(), 1.5);
    const dark = fly(loop(half, { environment: 'shadow' }), 1.5);
    const excessOf = (s: RaceState): number =>
      s.swings.reduce((most, x) => Math.max(most, x.excess), 0);
    expect(excessOf(dark.state)).toBeGreaterThan(excessOf(clear.state));
    expect(dark.state.distance).toBeLessThan(clear.state.distance);
  });

  it('reaches every ship now, because none of them gives up all its speed', () => {
    // This used to assert the opposite: Lift took no swing at anything, so
    // there was nothing for a surprise to make worse, and buying certainty
    // bought immunity to the dark along with it.
    //
    // There is no Lift to hide behind. Sight is spent as excess beside the
    // ship's own, so a shadow costs something even to a ship braking under the
    // bend's limit — it is a place that is worse for everybody, which is what a
    // property of the road ought to be.
    const clear = fly(loop(), 1.0);
    const dark = fly(loop(half, { environment: 'shadow' }), 1.0);
    expect(dark.state.distance).toBeLessThan(clear.state.distance);
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
    const clear = fly(loop(), 1.0);
    const gritty = fly(loop(half, { environment: 'debris' }), 1.0);

    expect(clear.bitTicks).toBe(0);
    expect(gritty.bitTicks).toBeGreaterThan(0);
    expect(gritty.inFirst).toBeGreaterThan(500);
    expect(gritty.bitTicks).toBeLessThan(10);
  });

  it('costs more the faster it is met', () => {
    // The only scaling the game uses for damage, and the reason a debris field
    // on a straight is worse than one in a hairpin.
    // Both stay on the path — the faster one is the one that carries the
    // bend's own limit rather than braking under it. Asking for a ship that
    // never lifts off would be slower at the bite, not faster, because being
    // thrown wide now takes the speed straight back off it.
    const slow = fly(loop(half, { environment: 'debris' }), 1.0);
    const fast = fly(loop(half, { environment: 'debris' }), 1.44);
    expect(fast.lost / fast.bitTicks).toBeGreaterThan(slow.lost / slow.bitTicks);
  });

  it('does not touch a ship on a stretch that says nothing', () => {
    expect(fly(loop(), 1.0).lost).toBe(0);
  });
});

describe('pocket', () => {
  it('pays for the ground flown through it', () => {
    expect(fly(loop(half, { pocket: 10 }), undefined).state.salvage).toBeGreaterThan(0);
  });

  it('pays nothing on a road that holds none', () => {
    expect(fly(loop(), undefined).state.salvage).toBe(0);
  });

  it('pays twice as much for twice the pocket', () => {
    const thin = fly(loop(half, { pocket: 5 }), undefined);
    const rich = fly(loop(half, { pocket: 10 }), undefined);
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
    const state = startField([entrant('one')], [{ routes: [] }], track);
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
    let state = startField([entrant('one'), entrant('two')], [{ routes: [] }, { routes: [] }], track);
    for (let i = 0; i < 3000; i += 1) {
      state = stepField(state, { track, laps: 3, seed: 4 });
    }
    expect(state.ships.every((s) => s.state.met.includes('track:trap'))).toBe(true);
  });

  it('leaves a track with nothing on it with nothing on it', () => {
    expect(startField([entrant('one')], [{ routes: [] }], loop()).fixtures).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// What a camera can find.
//
// The chase view walks canonical distance ahead of the ship and asks what the
// road there is made of, exactly as the race tick does. None of the drawing can
// be tested headlessly, but the lookup it stands on can — and that is the part
// that would silently paint the wrong stretch.
// ---------------------------------------------------------------------------

describe('reading the road ahead', () => {
  it('finds each stretch as one run, in the order they are flown', () => {
    const track = PROVING_GROUND;
    // Sample the way the camera does: a step at a time round the whole lap.
    const runs: { name: string; from: number; to: number }[] = [];
    for (let d = 0; d < track.length; d += 3) {
      const band = bandAt(track, d, 0);
      const name = band?.properties.environment ?? 'open';
      const last = runs[runs.length - 1];
      if (last !== undefined && last.name === name) last.to = d;
      else runs.push({ name, from: d, to: d });
    }
    expect(runs.map((r) => r.name)).toEqual(['open', 'nebula', 'debris', 'shadow']);
    // And each is a real stretch of road, not a sliver at a seam.
    for (const run of runs) expect(run.to - run.from).toBeGreaterThan(100);
  });

  it('hands back the same band object across a stretch, so a run can be grouped', () => {
    // The camera groups consecutive samples by band *identity*. If the lookup
    // built a new object each call, every sample would be its own run — the
    // road would be striped and every stripe would carry its own label.
    const track = PROVING_GROUND;
    const inNebula = track.checkpoints[1] ?? 0;
    const first = bandAt(track, inNebula + 10, 0);
    const second = bandAt(track, inNebula + 40, 0);
    expect(first).toBeDefined();
    expect(second).toBe(first);
  });

  it('says nothing on a road that says nothing', () => {
    expect(bandAt(loop(), 50, 0)).toBeUndefined();
  });

  it('names what it found, short enough to float over the road', () => {
    expect(labelOf({ environment: 'nebula' })).toBe('NEBULA');
    expect(labelOf({ environment: 'debris', pocket: 9 })).toBe('DEBRIS · pays 9');
    expect(labelOf({ pocket: 4, hazard: 2 })).toBe('pays 4 · bites 2');
    expect(labelOf(undefined)).toBe('');
    // An open stretch has nothing to announce, so it announces nothing.
    expect(labelOf({ environment: 'open' })).toBe('');
  });
});

describe('the track that exists to be looked at', () => {
  it('says something different on every stretch but one', () => {
    const said = PROVING_GROUND.sectors.map(
      (s) => bandAt(PROVING_GROUND, (s.start + s.end) / 2, 0)?.properties.environment,
    );
    expect(said).toEqual([undefined, 'nebula', 'debris', 'shadow']);
  });

  it('carries one of each kind of fixture, on the road', () => {
    const kinds = PROVING_GROUND.fixtures.map((f) => f.kind);
    expect(kinds).toEqual(['mine', 'black-hole']);
    for (const fixture of PROVING_GROUND.fixtures) {
      expect(PROVING_GROUND.sectors[fixture.sector]).toBeDefined();
      expect(fixture.at).toBeGreaterThan(0);
      expect(fixture.at).toBeLessThan(1);
    }
  });

  it('pays somebody who flies its scrapyard', () => {
    const paid = fly(PROVING_GROUND, undefined).state.salvage;
    expect(paid).toBeGreaterThan(0);
  });
});
