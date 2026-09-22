// The race: a pure, deterministic tick loop.
//
// Everything the player decides enters as an input made before the tick that
// consumes it — which is the seam a networked opponent will arrive through.
// Nothing here reads the clock, the DOM, or anything but its arguments.

import { fires, grantsOf, type AbilityId, type Grant } from './ability';
import { makeRng } from './rng';
import {
  bareShip,
  fullCondition,
  resolveBuild,
  type Condition,
  type Fitted,
} from './ship';
import {
  alongOf,
  bandIn,
  bendOn,
  effectOf,
  holdingSpeed,
  nextBendOn,
  rateOf,
  routeOf,
  sampleOn,
  sectorAt,
  sectorOf,
  type Route,
  type Sector,
  type Track,
} from './track';
import {
  advance,
  alongStep,
  bumperPush,
  leadOf,
  paceBelief,
  pilot,
  skillOf,
  wanderOn,
  type Control,
  type Flier,
  type Motion,
  type Sighted,
} from './flight';
import {
  ACCEL_PER_THRUST,
  BASE_HANDLING,
  BASE_THRUST,
  BRAKE_PER_TICK,
  CONDITION_PER_DAMAGE,
  DAMAGE_PER_EXTRA_PART,
  PATH_HALF_WIDTH,
  GRAVITY_PER_ACCEL,
  GRAVITY_PER_CORNER,
  GRAVITY_RECOVERY,
  HAZARD_BITE,
  HAZARD_DAMAGE,
  HAZARD_FULL_EXPOSURE,
  POCKET_PER,
  EXCURSION_CLEAR,
  FORK_PULL,
  TRACK_HALF_WIDTH,
  WALL_CLEAR,
  WALL_SCRUB,
  PILOT_SIGHT,
  REPAIR_PER_TICK,
  SHIELD_REGEN,
  BRAKE_PER_HANDLING,
  SPEED_PER_THRUST,
  STAT_MAX,
  STAT_MIN,
  HOLD_GRIP,
  MIN_ROLLING_SPEED,
  BUMPER_FROM,
  BUMPER_PUSH,
  WORN_HANDLING_LOSS,
  BLACK_HOLE_CARRY,
  BLACK_HOLE_POWER,
  BOOST_SPEED,
  BOOST_TICKS,
  CHARGE_FROM_REGEN,
  CHARGE_OFF_PATH,
  CHARGE_PER_TICK,
  DARK_MATTER_PER_HOLE,
  FIXTURE_LIFE,
  MINE_DROP_BACK,
  MINE_POWER,
  MINE_SEE_BACK,
  MISSILE_POWER,
  MISSILE_RANGE,
  PERFECT_BENDS,
  PERFECT_BONUS,
  PERFECT_WINDOW,
  PUSH_PER_POWER,
  SALVAGE_PER_POWER,
  COLLECT_SHARE,
  TRACTOR_RANGE,
  TRACTOR_SCRUB,
  TRACTOR_TOW,
  TRACTOR_TOW_PULL,
  TRACTOR_TOW_TICKS,
} from './tuning';
import {
  EMPTY_WORLD,
  fixturesHit,
  nearestAhead,
  type Emission,
  type Impulse,
  type Presence,
  type World,
} from './world';

/** What the ship does about the gap between its speed and a bend's holding speed. */

export interface ShipStats {
  /** Top speed and how hard it accelerates. */
  readonly thrust: number;
  /** The holding speed of every bend, and how fast a wide ship recovers. */
  readonly handling: number;
  /** Damage the shields soak before anything on the ship is hit. */
  readonly shields: number;
  /** How long the crew lasts under gravity. */
  readonly endurance: number;
  /** Shield regeneration on the path, as a multiple of the base rate. */
  readonly shieldRegen: number;
  /** How fast the crew patches damaged parts back up, mid-race. */
  readonly repair: number;
  /** Which grades of split the ship can plan, and whether it can re-plan at a pit stop. */
  readonly nav: number;
  /** A multiplier on what this ship's weapons carry and how far they reach. */
  readonly weaponPower: number;
  /** Keeps a weapon that hits it at full shields, to sell when the race ends. */
  readonly captures: boolean;
  /** Reads a black hole as a corner: faster through one, and unharmed by it. */
  readonly readsHoles: boolean;
  /** How deep a collector is aboard. At 3 it can cash dark matter in. */
  readonly collects: number;
}

/** One bend, as it happened. What the player is really watching. */
export interface SwingEvent {
  readonly tick: number;
  /** Which sector and which way through it, so the mark lands on the line flown. */
  readonly sector: number;
  readonly route: number;
  /** Where the bend starts, measured along the route it is on. */
  readonly bendStart: number;
  readonly radius: number;
  readonly entrySpeed: number;
  readonly holding: number;
  /** How much faster than the bend allowed, as a fraction of holding speed. */
  readonly excess: number;
  /** The lateral offset drawn, in track units. */
  readonly swing: number;
  readonly wentWide: boolean;
}

/** One position the ship held, kept so the renderer can draw a wake. */
export interface TrailPoint {
  readonly distance: number;
  readonly offset: number;
  /** Which way through the sector, so the wake is drawn on the line flown. */
  readonly route: number;
}

export interface RaceState {
  readonly tick: number;
  readonly distance: number;
  readonly speed: number;
  /** Lateral offset from the centreline: positive is left of travel. */
  readonly offset: number;
  /**
   * How far the ship points away from where the road goes, in radians.
   *
   * The state the swing had no version of, and the reason it could never be
   * flown: a ship with yaw is going sideways and keeps going sideways until
   * something turns it back, so correcting a line costs room and time.
   */
  readonly yaw: number;
  /** Where the steering and throttle actually are, which lag where they were asked to be. */
  readonly steer: number;
  readonly throttle: number;
  /** What the navigation system is currently wrong about. Slow, and seeded. */
  readonly wanderLine: number;
  readonly wanderPace: number;
  readonly wide: boolean;
  readonly lap: number;
  readonly sector: number;
  /** Which way through the current sector the ship is taking. */
  readonly route: number;
  readonly lapStartTick: number;
  readonly sectorStartTick: number;
  readonly lastLapTicks: number | undefined;
  readonly lastSectorTicks: number | undefined;
  readonly swings: readonly SwingEvent[];
  /** What is left of the shields. */
  readonly shields: number;
  /** How intact each fitted part is. Damage lands here and nowhere else. */
  readonly condition: Condition;
  /** The ship's stats as they are right now, with damage counted. */
  readonly stats: ShipStats;
  /** What the last hit broke, for the readout. */
  readonly lastBroken: string | undefined;
  /** Gravity the crew is carrying, 0 to 1. At 1 they are spent. */
  readonly worn: number;
  /** The ship is against the corridor wall, and has not yet come back inside it. */
  readonly onWall: boolean;
  /**
   * An excursion is in progress: the ship crossed the edge and has not yet
   * settled back well inside it. Without this the ship pays for the same
   * excursion over and over, because the offset hovers across the line.
   */
  readonly outside: boolean;
  /**
   * The bend currently being taken, named so that the same bend on two routes
   * is not mistaken for one. Undefined on a straight.
   */
  readonly bendKey: string | undefined;
  /**
   * The stretch of road the ship is on, named the same way, so that a hazardous
   * one bites on the way in rather than every tick it is stood in. Undefined on
   * a stretch that says nothing about itself.
   */
  readonly bandKey: string | undefined;
  /** What this bend was entered at, kept so the exit can report what it did. */
  readonly bendEntry: number;
  readonly bendHolding: number;
  readonly bendRadius: number;
  readonly bendStart: number;
  /** How far off the path this bend has taken the ship, worst so far. */
  readonly bendWorst: number;
  /** Recent positions, oldest first. Bounded, so a long race stays cheap. */
  readonly trail: readonly TrailPoint[];

  // S6. What the ship has to spend, what it is spending, and what it has taken.

  /** Charge, 0 to 1. Gathered on the golden path and nowhere else. */
  readonly charge: number;
  /** Ticks of boost still running. */
  readonly boostLeft: number;
  /** Ticks of tow still running: a tractor beam pulls its owner along too. */
  readonly towLeft: number;
  /** Bends still to be taken perfectly by the handling engine's chain. */
  readonly perfectLeft: number;
  /** When the last bend of that chain was taken, so a quick one can pay extra. */
  readonly lastPerfectTick: number | undefined;
  /** What this ship did this tick that reaches past itself. Read by the field. */
  readonly emitted: readonly Emission[];
  /** Weapons kept by a collector shield, in credits' worth. */
  readonly salvage: number;
  /** Dark matter gathered off the black holes it has flown through. */
  readonly darkMatter: number;
  /**
   * Fixtures this ship has already been bitten by. A thing on the road bites
   * once per ship per lap, not once per tick it is near — which is the lesson
   * damage learned in S3.6 and the corridor wall learned in V1.2, and which
   * doubled a lap time the first time this file forgot it.
   */
  readonly met: readonly string[];
  /** The last thing that reached it from outside, for the readout. */
  readonly lastHit: string | undefined;
  /** Who sent it. Without this a ship is bounced by nobody in particular. */
  readonly lastHitBy: string | undefined;
  /** The tick it landed on, so the screen can mark the moment rather than the state. */
  readonly lastHitTick: number | undefined;
  /** The ability it fired last, and when — what the player is watching for. */
  readonly lastFired: AbilityId | undefined;
  readonly lastFiredTick: number | undefined;
}

export interface RaceConfig {
  readonly track: Track;
  /** The undamaged ship. What it is worth right now lives in the state. */
  readonly stats: ShipStats;
  /** What it is built from, so damage knows what there is to break. */
  readonly build?: readonly Fitted[];
  /**
   * The way through each sector, decided before the lap that flies it — one
   * index per sector. A ship can still be thrown onto a different line at the
   * fork, but never choose one there.
   */
  readonly routes?: readonly number[];
  readonly seed: number;
  /** Who this ship is, so a weapon it fires can be addressed to somebody else. */
  readonly id?: string;
  /** The field and the track's furniture, as they stood **before** this tick. */
  readonly world?: World;
  /** What was fired at this ship a tick ago and lands now. */
  readonly incoming?: readonly Impulse[];
}

const clampStat = (value: number): number =>
  Math.min(STAT_MAX, Math.max(STAT_MIN, value));

/**
 * A ship at the line. The starting route matters: a route is chosen on crossing
 * into a sector, and a ship never crosses into the one it starts in — so
 * without this the plan for sector 0 was quietly ignored on the first lap.
 */
export function startRace(
  stats?: ShipStats,
  build: readonly Fitted[] = [],
  route = 0,
): RaceState {
  return {
    tick: 0,
    distance: 0,
    speed: 0,
    offset: 0,
    wide: false,
    lap: 0,
    sector: 0,
    route,
    lapStartTick: 0,
    sectorStartTick: 0,
    lastLapTicks: undefined,
    lastSectorTicks: undefined,
    swings: [],
    shields: stats?.shields ?? 0,
    condition: fullCondition(build),
    stats: stats ?? bareShip(BASE_THRUST, BASE_HANDLING),
    lastBroken: undefined,
    worn: 0,
    outside: false,
    onWall: false,
    bendKey: undefined,
    bandKey: undefined,
    bendEntry: 0,
    bendHolding: 0,
    bendRadius: 0,
    bendStart: 0,
    bendWorst: 0,
    yaw: 0,
    steer: 0,
    throttle: 0,
    wanderLine: 0,
    wanderPace: 0,
    trail: [],
    charge: 0,
    boostLeft: 0,
    towLeft: 0,
    perfectLeft: 0,
    lastPerfectTick: undefined,
    emitted: [],
    salvage: 0,
    darkMatter: 0,
    met: [],
    lastHit: undefined,
    lastHitBy: undefined,
    lastHitTick: undefined,
    lastFired: undefined,
    lastFiredTick: undefined,
  };
}

/** How many positions the wake remembers. Structural: the size of a buffer. */
const TRAIL_LENGTH = 60;


/**
 * One tick. Pure: the same state, config and tick number always produce the
 * same next state, because every draw comes from a stream keyed by the seed
 * and the bend it belongs to.
 */
export function stepRace(state: RaceState, config: RaceConfig): RaceState {
  const { track } = config;
  // What the ship is worth this tick: its build, less whatever is broken. A
  // damaged engine gives less thrust, a damaged crew repairs more slowly, and
  // a shot shield soaks less — so one bad excursion is felt for the rest of
  // the race.
  // A ship with no build to break flies on its stats alone: there is nothing
  // fitted for a hazard to take a piece out of.
  const stats =
    config.build === undefined
      ? config.stats
      : resolveBuild(config.build, state.condition);

  const thrust = clampStat(stats.thrust);
  // A worn crew flies worse: the ship is being held by whatever is left of
  // them, and by the nav system, which the framework says drifts wide.
  const handling = clampStat(stats.handling) * (1 - state.worn * WORN_HANDLING_LOSS);

  // Where the ship is: which sector, which way through it, and how far along
  // that line. Canonical distance stays on the main line so laps and standings
  // never care which way anyone went; the route decides the geometry.
  const sector = sectorOf(track, state.distance);
  const route = routeOf(sector, state.route);
  const along = alongOf(track, sector, route, state.distance);

  const here = sampleOn(route, along);
  const onBend = here.radius > 0;

  // What this stretch of road is like. A nebula takes the bite out of a bend, a
  // shadow hides it until you are nearly in it, debris scrapes, a pocket pays.
  // Every one of those is spent in currency the game already has, which is why
  // none of them needs a branch of its own further down: grip moves the holding
  // speed, sight moves the braking point, and the rest is damage and salvage.
  const band = bandIn(route.bands, along);
  const effect = effectOf(band?.properties);
  // Named like a bend, and for the same reason: a hazardous stretch bites on the
  // way in rather than every tick the ship is stood in it, and the same stretch
  // on two roads is not one stretch.
  const bandKey =
    band === undefined
      ? undefined
      : `${sector.index}:${state.route}:${Math.round(band.start)}`;
  const holding = onBend ? holdingSpeed(here.radius, handling) * effect.grip : Infinity;

  // 0. What reached the ship since its last tick. Ships still never touch: a
  // weapon fired at this ship a tick ago arrives now, and anything lying on the
  // track is met by flying past it. Nothing lands on the tick it was fired, so
  // no ship's move can depend on where another one got to this tick — which is
  // the same rule the whole sim runs on, applied to ships instead of players.
  const world = config.world ?? EMPTY_WORLD;
  const me = presenceOf(state, config.id ?? 'me');
  const arrived = arrivals(state, stats, world, track, me, config.incoming ?? []);

  // 0b. Charge, and what the ship spends it on. Charge is gathered on the
  // golden path and nowhere else, so a lap spent being thrown wide arrives at
  // the last bend with nothing to spend — the second reason to hold the line.
  const charge = Math.min(
    1,
    state.charge +
      (state.wide
        ? CHARGE_OFF_PATH
        : CHARGE_PER_TICK * (1 + (stats.shieldRegen - 1) * CHARGE_FROM_REGEN)),
  );
  const grants = grantsOf(config.build, state.condition);
  const fired =
    charge >= 1
      ? fires(grants, {
          onBend,
          route,
          sector,
          along,
          me,
          track,
          world,
          routes: config.routes,
          busy: state.boostLeft > 0 || state.perfectLeft > 0,
          ranges: {
            missile: reach(MISSILE_RANGE, grants, 'missile', stats.weaponPower),
            tractor: reach(TRACTOR_RANGE, grants, 'tractor', stats.weaponPower),
            mine: reach(MINE_SEE_BACK, grants, 'mine', stats.weaponPower),
          },
        })
      : undefined;

  const boosting = fired?.id === 'boost' || fired?.id === 'dark-boost';
  const boostLeft = boosting ? BOOST_TICKS : Math.max(0, state.boostLeft - 1);
  // A tether pulls both ways. Holding the ship ahead back is also being pulled
  // along by it, which is the whole of what a tractor beam is for and the only
  // reason to fit one over a missile.
  const towLeft =
    fired?.id === 'tractor' ? TRACTOR_TOW_TICKS : Math.max(0, state.towLeft - 1);
  // A boost is speed the engine did not have to build up to, so it lifts the
  // ceiling rather than the acceleration: what it buys is a faster straight.
  const topSpeed =
    SPEED_PER_THRUST * thrust +
    (boostLeft > 0 ? BOOST_SPEED : 0) +
    (towLeft > 0 ? TRACTOR_TOW : 0);
  const accel = ACCEL_PER_THRUST * thrust;

  // 1. Flight. The bend applies a force, the ship answers it with grip, and
  // where it ends up is whatever those two add to. Nothing is drawn: the same
  // ship at the same speed on the same bend does the same thing every time,
  // and what varies is how well the navigation system reads the road.
  //
  // `effect.grip` used to multiply the holding *speed*, so it multiplies grip
  // itself twice over — the translation is exact, not a re-tune.
  const grip = HOLD_GRIP * handling * effect.grip * effect.grip;
  // Braking is finite and Handling is most of it, so a ship cannot always
  // arrive at exactly what it aimed for. That is how the length of a straight
  // reaches the answer: a long one arrives fast and is a real braking problem.
  const brake = BRAKE_PER_TICK * (1 + (handling - 1) * BRAKE_PER_HANDLING);
  const flier: Flier = { topSpeed, accel, brake, grip };

  // A tractor beam is taken off the top: no shield answers a pull, and a black
  // hole read as a corner is speed the ship gains rather than loses.
  const entry: Motion = {
    speed:
      state.speed * (1 - arrived.scrub) +
      arrived.carry +
      (towLeft > 0 ? TRACTOR_TOW_PULL : 0),
    offset: state.offset,
    yaw: state.yaw,
    steer: state.steer,
    throttle: state.throttle,
  };

  const chaining = state.perfectLeft > 0 || fired?.id === 'three-bends';
  // What the navigation system is wrong about this tick. Two slow wanders,
  // seeded off the tick so a race still replays exactly. A chained bend is
  // flown perfectly, which is the whole of what the ability buys now.
  //
  // Seeded off the tick as an integer rather than through a string key. The
  // string form hashed a freshly built name twice a tick for every ship in the
  // field, and measured at a fifth of the whole tick's cost — worth having
  // back now that a race runs for two to three times as many ticks as it did.
  const wander = makeRng((config.seed ^ Math.imul(state.tick + 1, 0x9e3779b9)) >>> 0);
  const wanderLine = wanderOn(state.wanderLine, wander.unitInterval());
  const wanderPace = wanderOn(state.wanderPace, wander.unitInterval());
  const skill = chaining ? { reads: 1, line: 0, pace: 0 } : skillOf(stats.nav);

  const curvatureOn = (at: number): number => {
    const b = bendOn(route, at);
    return b === undefined ? 0 : b.turn / b.radius;
  };

  // The fastest the road ahead allows, given what the ship can brake. Sight is
  // spent here and nowhere else: a bend you cannot see yet is one you have not
  // started slowing for, which is what being in the dark costs.
  let ceiling = topSpeed;
  if (onBend) ceiling = Math.min(ceiling, holding);
  const ahead = lookAhead(track, sector, route, along, config.routes);
  // Sight is spent in one place: how much warning the ship gets. A bend it has
  // not seen yet is one it has not started slowing for, and the braking a bend
  // needs grows with speed while the warning does not — so the dark costs most
  // to whoever is carrying the most into it.
  const warning = Math.max(entry.speed, MIN_ROLLING_SPEED) * PILOT_SIGHT * effect.sight;
  if (ahead !== undefined && ahead.gap <= warning) {
    const limit = holdingSpeed(ahead.bend.radius, handling) * effect.grip;
    ceiling = Math.min(ceiling, Math.sqrt(limit * limit + 2 * brake * ahead.gap));
  }

  const seen: Sighted = {
    ahead: curvatureOn(along + leadOf(skill, entry.speed)),
    under: curvatureOn(along),
    ceiling: ceiling * paceBelief(wanderPace, skill.pace),
    linePlace: wanderLine * skill.line * PATH_HALF_WIDTH,
  };
  const control: Control = pilot(flier, entry, seen);
  const flown = advance(flier, entry, control, {
    curvature: seen.under,
    // The bumpers: the road leaning on a ship that is well off it, so that a
    // deep excursion is bounded without the pilot having to yank at anything.
    bumper: bumperPush(entry.offset, BUMPER_FROM, BUMPER_PUSH),
  });
  let speed = flown.speed;

  // 1b. Gravity: what the crew actually feels. A bend taken fast is lateral
  // load — speed squared over the radius, which is why a tight corner at pace
  // is the thing that empties a crew — and the engine adds its own when it is
  // pushing. Charging a bend does both at once.
  //
  // Measuring acceleration alone was the first attempt and it was backwards:
  // a Charge that holds top speed never "accelerates", so it read as the
  // gentlest plan in the game.
  const cornering = onBend ? (speed * speed) / here.radius : 0;
  // Gravity is what the crew feels: lateral load from the bend, plus whatever
  // the engine is adding. Both come out of the numbers now rather than out of
  // which plan was picked, which is one special case fewer.
  const pushing = Math.max(0, speed - state.speed);
  const load = cornering * GRAVITY_PER_CORNER + pushing * GRAVITY_PER_ACCEL;
  const endurance = Math.max(0.05, stats.endurance);
  // Coasting is what recovers a crew, so the two never cancel each other out.
  const worn = Math.min(
    1,
    Math.max(
      0,
      load > 0 ? state.worn + load / (endurance * 100) : state.worn - GRAVITY_RECOVERY,
    ),
  );

  // 2. The bend, start to finish. There is no draw any more: what a bend does
  // to a ship is what the ship's own speed and grip make it do, and the mark
  // left behind records what happened rather than what was rolled.
  const bend = onBend ? bendOn(route, along) : undefined;
  // The same bend on two routes is not the same bend, so the name carries both.
  const key = bend === undefined ? undefined : bendKeyOf(sector.index, state.route, bend);
  let bendKey = state.bendKey;
  let bendEntry = state.bendEntry;
  let bendHolding = state.bendHolding;
  let bendRadius = state.bendRadius;
  let bendStart = state.bendStart;
  let perfectLeft = fired?.id === 'three-bends' ? PERFECT_BENDS : state.perfectLeft;
  let lastPerfectTick = state.lastPerfectTick;
  const swings = [...state.swings];
  if (bend !== undefined && key !== bendKey) {
    bendKey = key;
    bendEntry = speed;
    // The stretch the bend is *entered* on sets its grip. A bend that runs out
    // of a nebula is still a nebula bend.
    bendHolding = holdingSpeed(bend.radius, handling) * effect.grip;
    bendRadius = bend.radius;
    bendStart = bend.start;
    // A bend inside the chain is flown perfectly, and one reached soon after
    // the last pays speed for the run being quick. That is what makes the
    // chain want a coil of bends rather than three stray ones.
    if (perfectLeft > 0) {
      perfectLeft -= 1;
      const quick =
        lastPerfectTick !== undefined && state.tick - lastPerfectTick <= PERFECT_WINDOW;
      if (quick) speed = Math.min(topSpeed, speed + PERFECT_BONUS * topSpeed);
      lastPerfectTick = state.tick;
    }
  }
  // How near the path this bend has been held, worst point so far. It is what
  // the mark is drawn from, so it has to be watched all the way through.
  let bendWorst = key !== undefined && key === state.bendKey ? state.bendWorst : 0;
  if (onBend) bendWorst = Math.max(bendWorst, Math.abs(state.offset));

  // Leaving a bend: record what it did. The mark is written at the exit rather
  // than the entry because until then there is nothing to say — the swing used
  // to be known the moment the bend began, and now it is flown.
  if (!onBend && state.bendKey !== undefined) {
    const held = state.bendHolding;
    swings.push({
      tick: state.tick,
      sector: sector.index,
      route: state.route,
      bendStart: state.bendStart,
      radius: state.bendRadius,
      entrySpeed: state.bendEntry,
      holding: held,
      excess: Math.max(0, state.bendEntry - held) / Math.max(0.001, held),
      swing: state.bendWorst,
      wentWide: state.bendWorst > PATH_HALF_WIDTH,
    });
    bendKey = undefined;
    bendWorst = 0;
    bendEntry = 0;
  }

  // 3. Offset, as the flight worked it out.
  let offset = flown.offset;
  // What a weapon or a fixture does is push you off your line. It lands here,
  // in the same units the swing is paid in, and the corridor holds it in the
  // same way — so being shot is being thrown wide by somebody else's choice.
  offset += arrived.push;
  // The corridor. Off the golden path is ground you can fly over; past the
  // corridor there is something solid, and the ship does not go through it.
  //
  // Capping the position without charging for it would make a huge swing safer
  // than a merely big one, which is the opposite of the bet the game rests on.
  // So the swing's own reach — how far it *wanted* to throw the ship — still
  // decides what the excursion costs, and riding the wall scrubs speed on top.
  const walled = Math.abs(offset) > TRACK_HALF_WIDTH;
  if (walled) offset = Math.sign(offset) * TRACK_HALF_WIDTH;
  const hitWall = walled && !state.onWall;
  const onWall = walled || Math.abs(offset) > TRACK_HALF_WIDTH * WALL_CLEAR;
  const over = Math.abs(offset) - PATH_HALF_WIDTH;
  const wide = over > 0;

  // 3b. The ground off the path holds things that hurt — and you hit them on
  // the way out, not by the second. Damage lands once per excursion, the tick
  // the ship crosses the edge, scaled by how hard it was thrown and how fast
  // it was going.
  //
  // Charging it per tick was the first version, and it punished a low-handling
  // build by the clock: a ship that spends most of a lap wide died every time,
  // which is a ban rather than a risk.
  const crossed = wide && !state.outside;
  // Hysteresis, and the direction matters. An excursion *starts* by being wide
  // and ends by getting back inside `EXCURSION_CLEAR` of the half width, so the
  // clear threshold may only hold an excursion open — never open one.
  //
  // It used to open one: `wide || |offset| > 5.4` made a ship "outside" at 5.4,
  // which is short of the 9 that counts as wide. A ship drifting out crossed
  // 5.4 first, so by the time it was wide it was already marked outside and
  // `crossed` never fired. It went unnoticed because the old Charge threw ships
  // past both thresholds inside one tick; a ship that drives its own line
  // arrives gradually, and stopped taking excursion damage at all.
  const outside =
    wide || (state.outside && Math.abs(offset) > PATH_HALF_WIDTH * EXCURSION_CLEAR);
  // How exposed the excursion was: how far off the line the ship actually got,
  // rather than how far a draw wanted to throw it. There is no draw now.
  const exposure = Math.min(1, Math.abs(offset) / HAZARD_FULL_EXPOSURE);
  // 3c. And the road itself. Debris is danger **on** the path rather than
  // beside it, so it does not wait for an excursion — but it bites once, on the
  // way into the stretch, for exactly the reason the excursion above does.
  // Faster in costs more, which is the only scaling the game uses for damage.
  const bite =
    bandKey !== undefined && bandKey !== state.bandKey
      ? effect.hazard * HAZARD_BITE * (speed / SPEED_PER_THRUST)
      : 0;
  const hit = (crossed ? HAZARD_DAMAGE * exposure * (speed / SPEED_PER_THRUST) : 0) + bite;
  const soaked = Math.min(Math.max(0, state.shields - arrived.spent), hit);
  // Shields answer a weapon and a hazard with the same pool, and only recharge
  // in a tick where nothing reached the ship at all.
  const quiet = !crossed && bite === 0 && arrived.spent === 0 && arrived.damage === 0;
  const shields = quiet
    ? Math.min(
        stats.shields,
        state.shields + (wide ? 0 : SHIELD_REGEN * stats.shieldRegen),
      )
    : Math.max(0, state.shields - arrived.spent - soaked);

  // What the shields did not stop breaks things. A bigger hit finds more to
  // break, and which parts it finds is a seeded draw — so the same excursion
  // always costs you the same, and two ships never share the damage.
  // A weapon displaces rather than damages; a black hole does both. So what
  // breaks a part is the hazard half, path and hole alike.
  const through = hit - soaked + arrived.damage;
  const repaired = repair(state.condition, stats.repair);
  const { condition, broken } =
    through > 0
      ? breakSomething(repaired, through, config.seed, state.tick, config.build)
      : { condition: repaired, broken: undefined };

  // 4. Move. Being off the golden path costs time, not damage — and the
  // further out the ship is thrown, the more of its speed it loses.
  // Nothing is charged for being off the path any more. It is slow on its own:
  // getting back spends the grip the bend was using, so the pilot has to be
  // slower through it. A penalty that falls out of the physics beats one that
  // is invented, and `WIDE_SPEED_*` were the invented ones.
  if (hitWall) {
    // How hard it arrived at the wall, which is what hitting it costs.
    const past = Math.min(1, Math.abs(Math.sin(flown.yaw)));
    speed = Math.max(0.1, speed * (1 - WALL_SCRUB * Math.min(1, 0.5 + past)));
  }
  // A sliding ship makes less progress along the road, which is the last of
  // the reasons an excursion costs time and the only one that is free.
  //
  // A short line buys canonical distance faster than a long one: that, and
  // the bends it hands you, is the whole of what a split is worth.
  const distance =
    state.distance + alongStep({ ...flown, speed }) * rateOf(sector, route);

  // 5. Checkpoints, laps, and the fork.
  const tick = state.tick + 1;
  const lap = Math.floor(distance / track.length);
  const crossedLap = lap > state.lap;
  const nextSector = sectorAt(track, distance);
  const crossedSector = nextSector !== state.sector;
  // At a fork the ship takes the line it planned — unless it arrives thrown far
  // enough sideways that it is already pointing at another one.
  const nextRoute = crossedSector
    ? chooseRoute(track.sectors[nextSector] as Sector, config.routes, offset)
    : state.route;

  return {
    tick,
    distance,
    speed,
    offset,
    wide,
    lap,
    sector: nextSector,
    route: nextRoute,
    lapStartTick: crossedLap ? tick : state.lapStartTick,
    sectorStartTick: crossedSector ? tick : state.sectorStartTick,
    lastLapTicks: crossedLap ? tick - state.lapStartTick : state.lastLapTicks,
    lastSectorTicks: crossedSector ? tick - state.sectorStartTick : state.lastSectorTicks,
    swings,
    shields,
    condition,
    stats,
    lastBroken: broken ?? state.lastBroken,
    worn,
    outside,
    onWall,
    bendKey,
    bendEntry,
    bendHolding,
    bendRadius,
    bendStart,
    bendWorst,
    yaw: flown.yaw,
    steer: flown.steer,
    throttle: flown.throttle,
    wanderLine,
    wanderPace,
    trail: [...state.trail, { distance, offset, route: nextRoute }].slice(-TRAIL_LENGTH),
    // A charge spent is a charge gone, whatever it bought.
    charge: fired === undefined ? charge : 0,
    boostLeft,
    towLeft,
    perfectLeft,
    lastPerfectTick,
    emitted: emissionsFor(fired, state, stats, world, track, me),
    bandKey,
    // A pocket pays for the ground actually flown through it, which is why a
    // long way round that holds one can be worth more than the short way even
    // though it costs time. That trade is the whole reason properties exist.
    salvage:
      state.salvage + arrived.salvage + (effect.pocket * speed) / POCKET_PER,
    darkMatter: state.darkMatter + arrived.darkMatter,
    met: arrived.met.length === 0 ? state.met : [...state.met, ...arrived.met],
    lastHit: arrived.hit ?? state.lastHit,
    lastHitBy: arrived.hit === undefined ? state.lastHitBy : arrived.hitBy,
    lastHitTick: arrived.hit === undefined ? state.lastHitTick : tick,
    lastFired: fired?.id ?? state.lastFired,
    lastFiredTick: fired === undefined ? state.lastFiredTick : tick,
  };
}

/** This ship as the rest of the field is allowed to see it. */
export function presenceOf(state: RaceState, id: string): Presence {
  return {
    id,
    distance: state.distance,
    offset: state.offset,
    sector: state.sector,
    route: state.route,
    speed: state.speed,
  };
}

/** How far a weapon reaches, or how hard it hits, at the level fitted. */
function reach(
  table: readonly number[],
  grants: readonly Grant[],
  id: AbilityId,
  power: number,
): number {
  const grant = grants.find((g) => g.id === id);
  if (grant === undefined) return 0;
  return (table[grant.level - 1] ?? 0) * power;
}

/** Everything that reached the ship this tick, once the shields have had a say. */
interface Arrival {
  /** Track units sideways, in the same currency the swing is paid in. */
  readonly push: number;
  /** A share of speed taken straight off. No shield answers a pull. */
  readonly scrub: number;
  /** Speed gained, which only a ship that reads black holes ever sees. */
  readonly carry: number;
  /** Shielding spent answering what arrived. */
  readonly spent: number;
  /** Damage that got through. Weapons displace; hazards damage. */
  readonly damage: number;
  readonly salvage: number;
  readonly darkMatter: number;
  /** Fixtures met this tick, so they are not met again on the next one. */
  readonly met: readonly string[];
  readonly hit: string | undefined;
  /** Whose it was, so the screen can say who did it to you. */
  readonly hitBy: string | undefined;
}

/**
 * What a tick's worth of other people's decisions does to this ship: weapons
 * fired at it a tick ago, and whatever is lying on the track where it is.
 *
 * The shields answer all of it with one pool. A collector shield at full
 * strength does something else entirely — it **keeps** the weapon, which never
 * lands at all and sells when the race ends. That is the only way a ship
 * profits from being shot at.
 */
function arrivals(
  state: RaceState,
  stats: ShipStats,
  world: World,
  track: Track,
  me: Presence,
  incoming: readonly Impulse[],
): Arrival {
  let push = 0;
  let scrub = 0;
  let carry = 0;
  let spent = 0;
  let damage = 0;
  let salvage = 0;
  let darkMatter = 0;
  const met: string[] = [];
  let hit: string | undefined;
  let hitBy: string | undefined;
  let left = state.shields;
  const full = stats.shields > 0 && state.shields >= stats.shields;

  const take = (
    power: number,
    side: number,
    what: string,
    hazard: boolean,
    from?: string,
  ): void => {
    if (power <= 0) return;
    // A collector at full strength keeps the weapon: it never lands, and it
    // sells when the race ends. Catching it still costs the shielding, though —
    // without that the shield never leaves full, captures everything for the
    // rest of the race for nothing, and earns about two first places a heat.
    //
    // A weapon bigger than the shield is still caught, and empties it. Refusing
    // those was the first version of this fix and it went too far the other way:
    // the missiles worth catching are exactly the ones that outweigh a shield,
    // so collectors earned nothing at all. What limits it is the recharge — the
    // next capture waits for full shields, however big the last one was.
    if (stats.captures && full && !hazard) {
      salvage += power * SALVAGE_PER_POWER;
      const caught = Math.min(left, power);
      left -= caught;
      spent += caught;
      hit = `captured ${what}`;
      hitBy = from;
      return;
    }
    // Below a capture, a collector still keeps a piece of what hit it. Without
    // this the part collected nothing at all until level 3 and full shields,
    // which made its first two levels strictly worse than plain shielding.
    if (stats.collects > 0 && !hazard) {
      salvage += power * SALVAGE_PER_POWER * (COLLECT_SHARE[stats.collects - 1] ?? 0);
    }
    const soaked = Math.min(left, power);
    left -= soaked;
    spent += soaked;
    const rest = power - soaked;
    if (hazard) damage += rest;
    else push += rest * PUSH_PER_POWER * side;
    if (rest > 0) {
      hit = what;
      hitBy = from;
    }
  };

  // Weapons fired at this ship a tick ago. A pull is taken straight off the
  // speed; a shove is answered by the shields and what beats them moves the
  // ship. Both were decided before this tick, by somebody else.
  for (const impulse of incoming) {
    if (impulse.scrub > 0) {
      scrub += impulse.scrub;
      hit = 'a tractor beam';
      hitBy = impulse.from;
    }
    take(impulse.power, impulse.side, 'a missile', false, impulse.from);
  }

  for (const fixture of fixturesHit(world, me, track.length)) {
    if (state.met.includes(fixture.id)) continue;
    met.push(fixture.id);
    if (fixture.kind === 'black-hole') {
      // A ship built for them reads the hole as a corner: through it faster,
      // unharmed, and gathering what it sheds if a collector is aboard.
      // A collector gathers what the hole sheds either way. Needing the engine
      // as well left the shield collecting nothing at all below level 3, which
      // made it strictly worse than plain shielding at the levels you buy first.
      if (stats.collects > 0) darkMatter += DARK_MATTER_PER_HOLE;
      if (stats.readsHoles) {
        carry += BLACK_HOLE_CARRY * SPEED_PER_THRUST;
        hit = 'through a black hole';
        continue;
      }
      // Otherwise it pulls, toward itself, and hurts.
      take(
        fixture.power,
        Math.sign(fixture.offset - me.offset) || 1,
        'a black hole',
        true,
        fixture.owner,
      );
      continue;
    }
    // A gravity mine throws the ship further off whatever line it was on,
    // which is why it costs most to a ship that meets it already out of shape.
    take(
      fixture.power,
      Math.sign(me.offset) || 1,
      'a gravity mine',
      false,
      fixture.owner,
    );
  }

  return { push, scrub, carry, spent, damage, salvage, darkMatter, met, hit, hitBy };
}

/** What this ship's fired ability sends out into the world. */
function emissionsFor(
  fired: Grant | undefined,
  state: RaceState,
  stats: ShipStats,
  world: World,
  track: Track,
  me: Presence,
): readonly Emission[] {
  if (fired === undefined) return [];
  switch (fired.id) {
    case 'missile': {
      const range = (MISSILE_RANGE[fired.level - 1] ?? 0) * stats.weaponPower;
      const target = nearestAhead(world, me, range, track.length);
      if (target === undefined) return [];
      return [
        {
          kind: 'push',
          from: me.id,
          target: target.id,
          // Shove them further off whatever line they are on.
          side: Math.sign(target.offset) || 1,
          power: (MISSILE_POWER[fired.level - 1] ?? 0) * stats.weaponPower,
        },
      ];
    }
    case 'tractor': {
      const range = (TRACTOR_RANGE[fired.level - 1] ?? 0) * stats.weaponPower;
      const target = nearestAhead(world, me, range, track.length);
      if (target === undefined) return [];
      return [
        {
          kind: 'drag',
          from: me.id,
          target: target.id,
          scrub: TRACTOR_SCRUB[fired.level - 1] ?? 0,
        },
      ];
    }
    case 'mine':
      return [
        {
          kind: 'drop',
          fixture: {
            id: `${me.id}:${state.tick}:mine`,
            kind: 'mine',
            owner: me.id,
            distance: state.distance - MINE_DROP_BACK,
            sector: state.sector,
            route: state.route,
            offset: state.offset,
            power: (MINE_POWER[fired.level - 1] ?? 0) * stats.weaponPower,
            life: FIXTURE_LIFE,
          },
        },
      ];
    // The one ability that changes the track. It is not announced, and it
    // discriminates by build: a ship with a dark matter engine reads the hole
    // it leaves as a corner, and everybody else meets a hazard.
    case 'dark-boost':
      return [
        {
          kind: 'drop',
          fixture: {
            id: `${me.id}:${state.tick}:hole`,
            kind: 'black-hole',
            owner: me.id,
            distance: state.distance,
            sector: state.sector,
            route: state.route,
            offset: state.offset,
            power: BLACK_HOLE_POWER,
            life: FIXTURE_LIFE,
          },
        },
      ];
    default:
      return [];
  }
}

/** Everything a crew can reach, patched a little further back toward whole. */
function repair(condition: Condition, rate: number): Condition {
  const step = REPAIR_PER_TICK * rate;
  if (step <= 0) return condition;
  return { parts: condition.parts.map((c) => Math.min(1, c + step)) };
}

/**
 * Spread a hit across the ship: one part for a glancing blow, more for a bad
 * one. A ship with nothing fitted has nothing to break — it is also far too
 * slow to be a build, so that costs nobody anything.
 */
function breakSomething(
  condition: Condition,
  damage: number,
  seed: number,
  tick: number,
  build: readonly Fitted[] | undefined,
): { condition: Condition; broken: string | undefined } {
  const parts = [...condition.parts];
  if (parts.length === 0) return { condition, broken: undefined };

  const targets = 1 + Math.floor(damage / DAMAGE_PER_EXTRA_PART);
  const each = (damage / targets) * CONDITION_PER_DAMAGE;
  const rng = makeRng(seed).fork(tick * 31 + 7);
  let broken: string | undefined;

  for (let i = 0; i < targets; i += 1) {
    const choice = Math.floor(rng.unitInterval() * parts.length);
    parts[choice] = Math.max(0, (parts[choice] ?? 1) - each);
    broken ??= build?.[choice]?.componentId;
  }
  return { condition: { parts }, broken };
}


/**
 * The next bend a ship will meet, looking past the end of its own line into
 * the sector after it — which is the one it planned, since it has not reached
 * the fork yet and cannot know what it will be thrown into.
 */
function lookAhead(
  track: Track,
  sector: Sector,
  route: Route,
  along: number,
  routes: readonly number[] | undefined,
): { bend: { radius: number; start: number }; gap: number; key: string } | undefined {
  const here = nextBendOn(route, along);
  if (here !== undefined) {
    return { ...here, key: bendKeyOf(sector.index, routes?.[sector.index] ?? 0, here.bend) };
  }
  const after = track.sectors[(sector.index + 1) % track.sectors.length] as Sector;
  const line = routeOf(after, routes?.[after.index] ?? 0);
  const next = nextBendOn(line, 0);
  if (next === undefined) return undefined;
  return {
    bend: next.bend,
    gap: route.length - along + next.gap,
    key: bendKeyOf(after.index, routes?.[after.index] ?? 0, next.bend),
  };
}

/** A bend's name. The same bend on two routes is not the same bend. */
function bendKeyOf(sector: number, route: number, bend: { start: number }): string {
  return `${sector}:${route}:${Math.round(bend.start)}`;
}

/**
 * Which way through a sector a ship actually goes. It planned one line; if it
 * arrives at the fork thrown far enough sideways to be pointing at another,
 * that is the one it takes. This is the swing costing a route rather than time.
 */
export function chooseRoute(
  sector: Sector,
  routes: readonly number[] | undefined,
  offset: number,
): number {
  const planned = routes?.[sector.index] ?? 0;
  // Arrive anywhere near the line and you make the fork you meant to make.
  if (Math.abs(offset) <= FORK_PULL) return planned;

  // Thrown further than that, the ship goes where it is pointing — but only if
  // another line is clearly nearer than the one it planned, or a ship would
  // lose its route to every stray wobble.
  // A split commits further off the line than a ship can physically be thrown,
  // so what is compared is the direction each line leads in, brought back
  // inside the corridor. Comparing raw commitments would put every split out
  // of reach and the fork would never fire at all.
  const reach = (line: { entryOffset: number }): number =>
    Math.max(-TRACK_HALF_WIDTH, Math.min(TRACK_HALF_WIDTH, line.entryOffset));

  let best = planned;
  let bestGap = Math.abs(reach(routeOf(sector, planned)) - offset);
  sector.routes.forEach((line, i) => {
    const gap = Math.abs(reach(line) - offset);
    if (gap < bestGap - FORK_PULL) {
      best = i;
      bestGap = gap;
    }
  });
  return best;
}

/** Run a whole race headless — for tests, and for the balance work to come. */
export function simulate(config: RaceConfig, ticks: number): RaceState {
  let state = startRace(config.stats, config.build ?? []);
  for (let i = 0; i < ticks; i += 1) state = stepRace(state, config);
  return state;
}
