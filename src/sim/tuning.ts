// Every balance number in the game, in one file. Never inline one of these.
//
// Not tuning, and so not here: algorithm internals (the RNG's constants),
// level data (the track's pieces), and structural numbers (array indices).

/** Ticks per second. The sim only ever counts whole ticks. */
export const TICK_HZ = 60;

/** Top speed, in track units per tick, at Thrust 1.0. */
export const SPEED_PER_THRUST = 0.85;

/** How hard the ship accelerates toward top speed, per tick, at Thrust 1.0. */
export const ACCEL_PER_THRUST = 0.0035;

/** How hard it can slow down, per tick. Braking beats accelerating. */
export const BRAKE_PER_TICK = 0.0075;

/**
 * Grip. A bend's holding speed is sqrt(HOLD_GRIP * handling * radius): the
 * fastest the ship can take it and stay on the golden path.
 */
export const HOLD_GRIP = 0.0078;

/** Lateral offset, in track units, drawn at an excess of 1.0 — twice the holding speed. */
export const SWING_SPREAD = 40;

/**
 * How steeply the swing grows with excess speed. Above 1 means a ship slightly
 * too fast is usually fine and a ship much too fast is unpredictable — which
 * is the whole bet the game rests on.
 */
export const SWING_EXPONENT = 1.8;

/**
 * Speed a Carry scrubs off per tick while it is over the holding speed in a
 * bend. Carrying too much speed costs some of it — less than braking early
 * would, which is why Carry sits between Lift and Charge.
 */
export const CARRY_SCRUB = 0.0022;

/** Charge is still accelerating when the bend arrives, so it draws from a worse place. */
export const CHARGE_EXCESS_BONUS = 0.18;

/** Half the width of the golden path. Beyond this the ship is wide. */
export const PATH_HALF_WIDTH = 9;

// Being wide costs more the further out you are. A ship that clips the edge
// barely pays; one thrown right out crawls back. A flat penalty was the first
// version and it let Thrust dominate — any speed was worth any swing.

/** What a ship keeps of its speed the moment it crosses the edge of the path. */
export const WIDE_SPEED_AT_EDGE = 0.94;

/** How much more it loses per track unit beyond the edge. */
export const WIDE_SPEED_PER_UNIT = 0.028;

/** However far out it ends up, it keeps at least this much. */
export const WIDE_SPEED_FLOOR = 0.42;

/** How fast the swing opens up through the bend, as a fraction closed per tick. */
export const SWING_RISE = 0.09;

/**
 * How hard a wide ship hauls itself back, as a fraction of its offset per tick
 * at Handling 1.0. Proportional, so it comes back fast at first and fights the
 * last few units — which is what being out of shape looks like.
 */
export const RECOVER_PER_HANDLING = 0.013;

/** The slowest it ever closes, so the last sliver of offset does not linger. */
export const RECOVER_FLOOR = 0.02;

/** Lift brakes to a shade under the holding speed, to be sure of it. */
export const LIFT_MARGIN = 0.97;

// The ship, before anything is fitted. An empty ship still flies, slowly.

export const BASE_THRUST = 0.78;
export const BASE_HANDLING = 0.7;

/** How fast a ship with nobody aboard patches itself up. Barely at all. */
export const BASE_REPAIR = 0.25;

/** Shields with nothing fitted: none. A bare ship meets a hazard bare. */
export const BASE_SHIELDS = 0;

/**
 * Endurance with no crew aboard. Low, because nav is flying the ship alone —
 * which the framework says it does badly.
 */
export const BASE_ENDURANCE = 0.35;

// Hazards. The ground off the golden path is not just slower; the framework
// says it holds things that hurt.

/** Damage taken on being thrown off the path, at top speed and a full swing. */
export const HAZARD_DAMAGE = 18;

/**
 * Condition lost per point of damage that gets past the shields. Damage is
 * split across whatever it hits, so a big hit spread over three parts costs
 * each of them less than a small hit on one.
 */
export const CONDITION_PER_DAMAGE = 0.045;

/** Every this much damage in one hit finds another part to break. */
export const DAMAGE_PER_EXTRA_PART = 6;

/** Condition repaired per tick, per point of the crew's repair rating. */
export const REPAIR_PER_TICK = 0.00035;

/** The swing, in track units, that counts as being thrown all the way out. */
export const HAZARD_FULL_EXPOSURE = 26;

// The road itself. A stretch of track is not only a shape: the track model's
// properties say what it is *like*, and these are what "like" costs.
//
// Everything here is expressed in currency the game already has. Grip lowers
// the speed a bend can be held at, which is the bet the whole game rests on —
// the same entry speed swings wider. Sight shortens how early a bend can be
// read, so a ship brakes late and arrives hot, which is the same cost reached
// by a different road. Hazard is damage, in the units an excursion already
// uses. Nothing here invents a new thing for the player to learn.

/**
 * What each environment does to a ship in it.
 *
 * A named bundle rather than three sliders per piece, because an author picks
 * "this bit is a nebula" and should not also have to decide what a nebula is —
 * that is a property of the game, and it lives here with the other numbers.
 */
export const ENVIRONMENTS = {
  /** Clear road. The default, and the one that changes nothing. */
  open: { grip: 1, sight: 1, hazard: 0 },
  /** Thick. It takes the bite out of a bend, so the same entry throws you wider. */
  nebula: { grip: 0.82, sight: 1, hazard: 0 },
  /** It scrapes. Cheap on the line, expensive at speed. */
  debris: { grip: 1, sight: 1, hazard: 6 },
  /** You cannot see the bend coming, so you are into it before you are set. */
  shadow: { grip: 1, sight: 0.55, hazard: 0 },
} as const;

/**
 * Damage a hazardous stretch does, per point of hazard, at top speed.
 *
 * It bites **once on the way in**, not every tick — the same rule the excursion
 * hazard already follows, and for the same reason: per-tick damage is a ban on
 * a build rather than a risk to it, which this codebase has now learned three
 * separate times (S3.6's parts, V1.2's wall, S6's mines).
 */
export const HAZARD_BITE = 1;

/**
 * Excess added to a bend a ship could not see coming, at no sight at all.
 *
 * Sight is spent the same way Charge's own bonus is: the swing is drawn from a
 * worse place, rather than from a new penalty of its own. Which is also why the
 * plan that gives up all its speed for certainty is the plan shadow cannot
 * touch — Lift takes no swing at anything, so there is nothing to surprise.
 *
 * The first version of this moved the *braking point* instead, and it was
 * backwards: braking late meant carrying more speed down the straight, and Lift
 * clamps to the holding speed on the bend anyway, so a track built out of
 * shadow came out fractionally **quicker**. Measured, not guessed — 374.2
 * against 372.3 over 600 ticks.
 */
export const SIGHT_EXCESS = 0.35;

/** Track units a ship must fly through a pocket to be paid one point of it. */
export const POCKET_PER = 100;

/**
 * An excursion counts as over once the ship is back inside this share of the
 * path's half width — so drifting across the line does not bill it twice.
 */
export const EXCURSION_CLEAR = 0.6;

/** Shields regenerate this much per tick while the ship is on the path. */
export const SHIELD_REGEN = 0.035;

// Gravity, and what it does to a crew.

/** Gravity accrued per unit of acceleration the engine applies. */
export const GRAVITY_PER_ACCEL = 4;

/**
 * Gravity accrued per unit of cornering load — speed squared over the bend's
 * radius. This is the part a crew really feels, and it is why the tight track
 * empties them and the open one does not.
 */
export const GRAVITY_PER_CORNER = 0.95;

/** Charging through a bend loads the crew harder than a straight does. */
export const GRAVITY_CHARGE_MULTIPLIER = 2.4;

/** Gravity shed per tick when the ship is not accelerating. */
export const GRAVITY_RECOVERY = 0.0016;

/** How much of its handling a fully spent crew loses. */
export const WORN_HANDLING_LOSS = 0.32;

// The garage.

/** Credits a player opens a season with. There is no other income yet. */
export const STARTING_CREDITS = 100;

/** Slots a ship starts with. */
export const SLOTS_AT_START = 4;

/**
 * Progress toward the next slot, for finishing a race.
 *
 * A finish used to hand over a whole slot, so nine heats bought nine slots and
 * a ship could carry everything it was ever offered. Slots are the only budget
 * that says no to a build, and one that grows by one a heat says no to nothing
 * — which is most of why bolting on cheap engines has been the best build in
 * the game. Now a finish buys progress and a slot has a price.
 */
export const SLOT_PROGRESS_PER_FINISH = 1;

/**
 * What the next slot costs in progress, and what each one after that adds.
 *
 * Rising, so the fifth slot is two heats and the eighth is five. Over a
 * nine-heat season a racer that finishes everything earns 9 progress, which
 * buys three slots (2 + 3 + 4) and starts on the fourth. Against nine before.
 */
export const SLOT_COST_BASE = 2;
export const SLOT_COST_STEP = 1;

/** Credits for one unit of progress toward a slot. */
export const PROGRESS_PRICE = 45;

/** How many components the shop offers at a time. */
export const SHOP_OFFERS = 4;

/**
 * What a reroll costs: this much for the first of a trip, rising by the step
 * for each one after it.
 *
 * Rising, because a flat reroll a player can afford ten of is not a choice —
 * it is a wait until the shop hands over whatever was wanted, which is the
 * same open menu with extra clicking.
 */
export const REROLL_COST = 12;
export const REROLL_STEP = 8;

/** Research from breaking one component down, and what one level costs. */
export const RESEARCH_PER_COPY = 1;
export const RESEARCH_PER_LEVEL = 1;

/** What selling a component returns, as a share of everything paid for it. */
export const SELL_RETURN = 0.6;

// The rivals.

/** A heat is this many laps, with a pit stop at the end of each one. */
export const LAPS_PER_HEAT = 2;

// The season.

/** Ships in a heat. The roster stays a multiple of this so a group is never short. */
export const GROUP_SIZE = 3;

/**
 * How many race the season, and how it narrows. Nine into three groups, then
 * six into two, then three for the season — one cut per phase, each taking the
 * field down by one group.
 */
export const ROSTER = 9;
export const PHASES = 3;
export const HEATS_PER_PHASE = 3;

/** Credits paid by finish order at the end of a heat. The biggest sum in it. */
export const PURSE_BY_PLACE = [70, 44, 26] as const;

/** Points by finish order. Points are the standing and are never spent. */
export const POINTS_BY_PLACE = [10, 6, 3] as const;

/**
 * The margin bonus: what a ship gets for finishing close behind, on top of its
 * place. A third on the winner's tail is worth about twice a beaten one, which
 * is the reason to keep racing after the win has gone.
 */
export const MARGIN_POINTS = 3;
/** Ticks behind the winner at which the bonus has run out entirely. */
export const MARGIN_WINDOW = 300;

/**
 * Interest on credits held through a heat rather than spent, and its cap.
 * Small on purpose: enough that banking for a level 3 part is a real choice,
 * not so much that hoarding beats racing.
 */
export const INTEREST_RATE = 0.08;
export const INTEREST_CAP = 22;

/**
 * The pacing lap: a fee for turning up, plus credits for every tick under the
 * track's par, capped. Paid against the benchmark rather than against anyone.
 */
export const PACING_BASE = 35;
export const PACING_PER_TICK = 0.14;
export const PACING_CAP = 55;

/** A bend counts as demanding if its holding speed is under this share of top speed. */
export const BOT_TIGHT_HOLD = 0.95;

/** How far a bot leans its build toward Handling on a track full of tight bends. */
export const BOT_HANDLING_TILT = 2;

/** How far a bot's build wanders off what the track suggests. */
export const BOT_STAT_SPREAD = 0.22;

/** How often a bot banks its winnings rather than deepening a part with them. */
export const BOT_THRIFT = 0.3;

// The route.

/**
 * How far off the line a ship can be carried and still make the split it
 * planned. Past this the fork takes whichever line the ship is pointing at —
 * which is what makes a big swing at the bend before a fork cost you a route.
 *
 * Deliberately just outside PATH_HALF_WIDTH: **losing your line is something
 * that happens to a ship that went wide**, not to one wobbling inside the
 * path. At 7 it fired on almost every checkpoint of the Cinder Coil and the
 * route plan stopped meaning anything.
 */
export const FORK_PULL = 11;

/**
 * The drivable corridor: how far off the golden path a ship can physically be
 * pushed, either side. Past this there is something solid — call it a field,
 * call it a rail; the ship does not go through it.
 *
 * Before this a swing could throw a ship any distance at all, and the only
 * thing that brought it back was the recovery pulling on an offset that had no
 * ceiling. A bend taken far too fast put the ship somewhere that was not a
 * track any more.
 */
export const TRACK_HALF_WIDTH = 26;

/**
 * The share of its speed a ship loses when it hits the corridor wall.
 *
 * Charged once per contact, not per tick. Per tick was the first version and
 * it was a death spiral: a ship pinned through a long bend scrubbed every tick,
 * reached the speed floor, and then could not finish the lap at all. Damage
 * learned this lesson first — a hit lands once per excursion for the same
 * reason.
 *
 * This is what stops the wall making a huge swing *safer* than a merely big
 * one. The position is capped; the cost must not be, so the loss scales with
 * how far past the wall the swing was trying to throw the ship.
 */
export const WALL_SCRUB = 0.22;

/** How far back inside the corridor a ship must come before it can hit the wall again. */
export const WALL_CLEAR = 0.9;

/**
 * A bare ship's navigation: none. Nav is what turns a dark split dim and a dim
 * split clear, so a ship without a system plans only the splits anyone can see.
 */
export const BASE_NAV = 0;

/** Nav needed to plan a split of each grade. A grade above your nav is unplannable. */
export const NAV_FOR_DIM = 1;
export const NAV_FOR_DARK = 2;

/** Nav at which the route may be re-planned at a pit stop rather than only before the heat. */
export const NAV_FOR_REPLAN = 3;

/** How far a bot leans toward the shorter line when its handling can take one. */
export const BOT_ROUTE_NERVE = 0.55;

/** Ship stats are clamped to this range, so a slider cannot break the sim. */
export const STAT_MIN = 0.5;
export const STAT_MAX = 1.6;

// S6 — interaction. Ships still never touch: everything below reaches another
// ship through the track, and lands on the tick after it was fired, so no
// ship's move can depend on where another one got to this tick.

/**
 * Charge gained per tick on the golden path, as a share of a full charge.
 *
 * Measured at 0.0042 a ship refilled in about 100 ticks and fired nine to
 * nineteen times a lap, which no shield could answer and which made charge a
 * formality rather than a resource. At this rate it is two or three abilities a
 * lap, and choosing the moment is a real thing the ship does.
 */
export const CHARGE_PER_TICK = 0.0018;

/**
 * How much of a crew's shield-regeneration rating also speeds up abilities. The
 * catalogue gives Engineers "shields **and abilities** recharge faster", so it
 * is one rating doing both — but at the full multiplier Engineers silently
 * doubled or tripled every ability in the game (3.17 boosts a lap against 1.51
 * with Androids), which is a bigger effect than the part is sold on.
 */
export const CHARGE_FROM_REGEN = 0.5;

/**
 * Charge is only gathered on the path. Off it a ship is surviving, not
 * charging — which is the second reason to stay on the line, after speed.
 */
export const CHARGE_OFF_PATH = 0;

/**
 * How long a boost runs, and what it adds to top speed while it does.
 *
 * A boost lifts the ceiling rather than the acceleration, so the ship still has
 * to climb to it: at 70 ticks it spent about 55 of them reaching the speed it
 * had been granted and the whole ability was worth 7 ticks a heat.
 */
export const BOOST_TICKS = 180;
export const BOOST_SPEED = 0.3;

/** A boost wants a straight at least this long ahead of it to be worth firing. */
export const BOOST_WANTS_CLEAR = 150;

/**
 * How many bends the handling engine's chain takes perfectly.
 *
 * Three was an off switch, not an ability. On the Cinder Coil it covered every
 * bend of every lap: the ship went from 48% of the lap off the golden path to
 * 0%, and the finish time's standard error over 72 races was exactly zero. A
 * part that makes a track deterministic defeats the bet the whole game rests on.
 */
export const PERFECT_BENDS = 2;

/** A bend reached within this many ticks of the last pays extra speed. */
export const PERFECT_WINDOW = 180;

/** What that extra is, as a share of top speed. */
export const PERFECT_BONUS = 0.08;

/** The chain wants this many bends close together ahead before it fires. */
export const PERFECT_WANTS_BENDS = 3;

// Weapons. A weapon displaces a ship rather than hitting it: what it costs you
// is the line you were on, which is the same currency the swing is paid in.

/** How far up the road a missile reaches, in track units, per level. */
export const MISSILE_RANGE = [260, 340, 420] as const;

/**
 * What a missile carries. Shields soak it; what gets through pushes.
 *
 * Raised once the charge rate and the push were both cut, because the two cuts
 * multiplied: weapons fired a third as often and each landing hit moved a ship
 * half as far, so their output fell about sixfold and every weapon became worse
 * than leaving the slot empty. The fix is here rather than in `PUSH_PER_POWER`
 * — a bigger power beats the shields that were eating these whole, where a
 * bigger push per point would bring back the one-hit-to-the-wall problem.
 */
export const MISSILE_POWER = [26, 38, 48] as const;

/**
 * Track units of lateral push per point of weapon power that beats the shields.
 *
 * At 0.55 the biggest missile in the game carried 38.7 units against a corridor
 * 26 wide, so one hit took an unshielded ship from the centreline to the wall —
 * where it could not gather charge and so could not answer. Survivable, and
 * measured so, but it is the shape a player calls unfair. A full-power hit now
 * costs a line and a bend rather than the rest of the sector.
 */
export const PUSH_PER_POWER = 0.3;

/** How far a tractor beam reaches, and the share of speed it takes off. */
export const TRACTOR_RANGE = [200, 280, 360] as const;

/**
 * At level 2 this cost its target fourteen ticks across a whole heat and its
 * owner a hundred and forty-three, which is a slot spent on being polite.
 */
export const TRACTOR_SCRUB = [0.12, 0.18, 0.26] as const;

/** A mine sits this far back down the road from where it was dropped. */
export const MINE_DROP_BACK = 40;

/** How close a ship must pass a fixture for it to bite, along and across. */
export const FIXTURE_REACH = 30;
export const FIXTURE_ACROSS = 20;

/**
 * What a mine and a black hole carry when a ship passes one. Raised with
 * `MISSILE_POWER` and for the same reason: against a rival carrying the
 * cheapest shield in the shop, a mine was delivering 2.4 units of push against
 * a golden path 9 wide, which is not an event.
 */
export const MINE_POWER = [30, 42, 54] as const;
export const BLACK_HOLE_POWER = 30;

/** Ticks a dropped fixture lasts before it fades. A placed one lasts the heat. */
export const FIXTURE_LIFE = 3600;

/** A ship built for black holes takes this much more speed through one. */
export const BLACK_HOLE_CARRY = 0.12;

// Collection. What a heat gathers, and what it is worth in the garage.

/**
 * Credits a captured weapon sells for, per point of power it was carrying.
 *
 * At 0.9 a heat's salvage came to 127-189 credits against a 70-credit first
 * place and a 100-credit starting ship — the loot was worth about two wins, and
 * collecting quietly became a better living than racing. Cut to 0.2 it landed at
 * 9-17 credits, which is a third of a third place and below noticing. This is
 * the middle: a good heat's collecting is worth something without being worth
 * more than winning.
 */
export const SALVAGE_PER_POWER = 0.45;

/** Dark matter gathered by passing through a black hole with a collector. */
export const DARK_MATTER_PER_HOLE = 12;

/** Credits a unit of dark matter turns into, with a level 3 collector. */
export const DARK_MATTER_VALUE = 1.4;

/** How often a bot fits a weapon when it can afford one. */
export const BOT_AGGRESSION = 0.45;

/**
 * How whole a part must still be to grant its ability. A badly broken engine
 * flies on, worth less; it does not also hand you a boost.
 */
export const ABILITY_WORKS = 0.5;

/** How far ahead the three-bend chain looks for a run of bends to spend itself on. */
export const PERFECT_LOOKAHEAD = 420;

/** How far back a mine rack notices somebody chasing, per level. */
export const MINE_SEE_BACK = [180, 240, 300] as const;

/**
 * What each further copy of the **same** component is worth, as a share of the
 * one before it. The first is worth all of itself, the second 60% of that, the
 * third 36%, and so on.
 *
 * Only two categories add up at all — engines and shields — and until S7 the
 * arithmetic there said bolt on more. Twelve level-1 engines cost less than the
 * season paid out and put both thrust and handling on their caps, so the whole
 * shop collapsed into one move. This is what prices that: two of a thing is
 * still a build, twelve is not.
 *
 * Deliberately per component rather than per category. The framework is
 * explicit that "two shields is a build, not a mistake" — two *different*
 * shields each count in full, and the collector's storage is meant to scale
 * with the ship's total shielding. What is being stopped is the same part
 * twelve times over, not variety within a category.
 */
export const STACK_FALLOFF = 0.6;

/**
 * A tractor beam is a tether, so it pulls both ways: the ship ahead is held
 * back and the ship holding it is towed along. This is what the beam is *for* —
 * it is the only weapon that helps its owner directly rather than only hurting
 * somebody, and without it it had no answer to "why this instead of a missile
 * or a mine". Measured at 0 season wins in 72 before it had one.
 */
export const TRACTOR_TOW_TICKS = 90;

/**
 * A tow does two things, because doing only the first is doing nothing. Raising
 * the ceiling is worth nothing to a ship still climbing toward it — the same
 * flaw that made a 70-tick boost worth seven ticks a heat — so the tether also
 * pulls, every tick, which is what being dragged along actually feels like.
 */
export const TRACTOR_TOW = 0.1;
export const TRACTOR_TOW_PULL = 0.004;

/**
 * What a collector shield keeps from a weapon it could not capture outright, as
 * a share of what a capture would have paid. Capture needs level 3 and full
 * shields, so without this the first two levels of the part collected nothing
 * at all and were strictly worse than plain shielding — a part whose opening
 * levels do nothing is a part nobody buys twice.
 */
export const COLLECT_SHARE = [0.3, 0.5, 0.75] as const;
