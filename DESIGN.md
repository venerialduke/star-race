# Star Race — design

This document is the source of truth for **the game as built**. If the code and
this document disagree, the document wins and the code is a bug. Any PR that
changes a rule updates this file in the same change.

The wider design — every system the game is heading toward, and the option
tables behind it — lives in `design/catalogue/framework.md` and the catalogue
beside it. This file is narrower on purpose: it says what is built, with the
exact rules, and grows one stage at a time.

**This is a clean-slate build.** The 2026 vertical slice (one track, three
stages, six parts, four hazards) is finished; its last commit is `543ac1e` and
its code sits in `legacy/`. None of it carries over. Its _engineering_ conventions do: a pure
deterministic simulation, a fixed integer tick, one tuning file, a seeded RNG.
They were the part that worked.

## The game

Ships race a loop. The player does not drive: they build the ship between
heats, plan how it takes bends, and watch it fly. The bet the whole game rests
on is one sentence — **the faster a ship goes into a bend, the wider and less
predictably it swings off the golden path** — and everything else exists to
make that trade interesting.

## The two rules

1. **The simulation is pure and deterministic.**
   `simulate(track, entrants, seed) → outcome`. No rendering, no timers, no
   `Date`, no `Math.random` outside the seeded RNG. Thousands of races can run
   in a script.
2. **The race advances on a fixed integer tick.** Speed, position, swing and
   everything else update per tick. Real time never enters the sim; `main.ts`
   converts wall-clock time into whole ticks.

A third rule follows from where this is going: **opponents are data.** Bots
supply their decisions today and real players will supply them later, so
nothing in `src/sim` may reach for an opponent's state at a moment of its
choosing. Every decision enters the race as an input, made before the tick that
consumes it.

A fourth follows from the third: **a segment is computed before it is watched.**
The unit of compute is the stretch of track between two decision points. Since
no input enters the race inside one, running it to its end up front is the same
race, tick for tick, as stepping it live.

## The segment

A **segment** is the run between two decision points — today, one lap between
pit stops. `recordSegment` steps the field to the end of it and keeps the film:
one small frame per ship per tick, holding only what the screen needs. Wall
clock time then moves a cursor through that film. Nothing is simulated while
the player watches.

This changes no outcome. What it changes is what the rest of the program can
do. The result exists before the playback does, so the playback can be skipped,
paused or replayed. And a heat could as easily be resolved somewhere else and
watched here, which is the shape a networked race has to have.

The cost is the thing the player feels: **you cannot affect a segment once it
is running.** Every decision lands at a decision point, and the next segment is
built from the garage as it stands at that moment. That is the honest version
of the third rule rather than a new restriction — a mid-lap purchase was never
going to be legal in a race resolved elsewhere.

What carries across a decision point: total time, and the damage on every part
the ship still has. A part is followed by the id it was bought under, so damage
stays with the part, a new part arrives undamaged, and taking a part off and
refitting it does not launder the damage off it.

## Decisions taken at the build call (2026-09-13)

- **Bots now, real players later.** The initial build is the player against
  bots. The architecture must not preclude the network, which the rule above
  covers.
- **Abilities fire automatically** — on proximity to a rival, on track
  conditions, on the moment being right — unless an ability is specifically a
  _placed_ one, where the player sets before the run where its charge is spent.
- **No frames.** A season opens with an initial budget and a stocked shop; the
  player deploys what they choose.
- **The visual stages are judged by eye.** S1 and S2 answer questions about
  feel, not correctness, so they carry determinism tests and little else. The
  test suite grows when the economy does, where the answers are numbers.

## Decisions taken on the architecture (2026-09-14)

- **The unit of compute is the segment**, the stretch of track between two
  decision points. A segment is resolved in full before any of it is shown.
- **The playback and the decisions are separate screens.** You may swap between
  them mid-segment, but nothing bought or fitted is slotted in until the next
  decision point.
- **A split is a lateral bulge on the sector's own line**, and everything about
  it — its length, its bends, where it is drawn — comes out of that one number.
- **A route plan is an input like any other**, fixed before the lap that flies
  it. The fork can take a route away from you; it can never give you a choice.

## What is built

**S1 — the swing**, **S2 — the heat**, **S3 — the ship and the shop**, and
**S4 — the route**.
Three ships fly one of three authored loops for two laps, with a pit stop
between them. The player fits components into slots in the garage between laps,
picks the track and the corner plan, and races; the rivals are bots that read
the track and choose for themselves. The stats are no longer sliders — they are
what a build adds up to. There is a starting budget but no income yet. Each lap
is resolved before it is played back, on its own screen. Sectors offer more than
one way through them, and what the player may plan is what their navigation can
read.

## The track

A track is a closed **loop** walked out from an ordered list of **pieces**:

| Piece      | What it is                                                        |
| ---------- | ----------------------------------------------------------------- |
| `straight` | a length, in track units                                          |
| `bend`     | a radius and a signed sweep in degrees; the sign is the direction |

Walking the pieces produces the **centreline** — the golden path — as a
polyline, and fixes where every bend starts and ends. Geometry is level data,
not tuning: the shape of a track is content.

Three tracks are built, and they exist to ask whether one strategy wins
everywhere. They do not:

| Track | Length | Bends | What wins on it |
| ---------------- | ------ | ------------------- | ------------------------------ |
| **Kestrel Loop** | 1408 | mixed, tightest r42 | balanced build, Charge — 28.0s |
| **Meridian Run** | 2370 | open, tightest r62 | reckless build, Carry — 39.3s |
| **Cinder Coil** | 688 | tight, tightest r26 | nimble build, Charge — 16.9s |

A loop is authored as a **half** that turns through 180°, walked twice: the
second copy is the first rotated half a turn, so the circuit closes exactly and
a track is half as much to write. `loopFromHalf` refuses a half that does not
sweep 180°.

**Checkpoints** divide the loop into **sectors**. A sector is the stretch from
one checkpoint to the next. In S1 they exist to be timed and shown; splits
(several paths through one sector) arrive in S3.

Every bend has a **holding speed** — the fastest a ship can take it and stay on
the path:

```
holdingSpeed = sqrt(HOLD_GRIP * handling * radius)
```

Bigger radius, faster bend. More Handling, faster bend. Nothing else.

## The ship

In S1 a ship has two stats, set directly rather than by components:

| Stat         | What it does                                                                     |
| ------------ | -------------------------------------------------------------------------------- |
| **Thrust**   | sets top speed on a straight, and how hard the ship accelerates toward it        |
| **Handling** | sets the holding speed of every bend, and how fast a wide ship recovers the path |

## The corner plan

Chosen before the run, applied at every bend. It decides what the ship does
about the gap between its speed and the bend's holding speed.

| Plan       | At the bend                                                              |
| ---------- | ------------------------------------------------------------------------ |
| **Lift**   | brake to the holding speed before entry: no excess, and no swing         |
| **Carry**  | enter at whatever speed it has, and take the swing that comes            |
| **Charge** | keep accelerating through the bend: the most speed out, the widest swing |

## The swing

The rule the game is built on. At the moment a ship enters a bend:

```
excess  = max(0, entrySpeed - holdingSpeed) / holdingSpeed
spread  = SWING_SPREAD * excess ^ SWING_EXPONENT
swing   = spread * rng.unitInterval()        // one seeded draw per bend
```

`excess` is how much faster the ship is than the bend allows, as a fraction.
`spread` grows **steeply** with it — that is the exponent's whole job — so a
ship a little too fast is usually fine and a ship much too fast is unpredictable
rather than merely slow. The draw is seeded, so a race replays exactly.

The swing pushes the ship **outward** from the centreline, measured in track
units of lateral offset. Through the bend the offset grows toward the drawn
swing; on the straight after it, the ship pulls back toward the path at a rate
set by Handling.

**Wide** is where the cost lands, in time and now in damage. A ship whose offset exceeds
`PATH_HALF_WIDTH` has left the golden path, and what it keeps of its speed
falls the further out it is:

```
over = |offset| - PATH_HALF_WIDTH
keep = max(WIDE_SPEED_FLOOR, WIDE_SPEED_AT_EDGE - over * WIDE_SPEED_PER_UNIT)
```

Clipping the edge barely costs anything; being thrown right out is expensive.
A flat penalty was the first version, and it made Thrust strictly dominant —
any speed was worth any swing, because the worst case cost the same as the
mildest. Scaling it is what prices the gamble.

The ship hauls itself back proportionally — fast at first, fighting the last
few units — at a rate set by Handling.

## The route

A sector may offer more than one way through it. Each is a **route**; the ones
that are not the golden path are **splits**. Every route of a sector leaves its
checkpoint and arrives at the next one, so a ship on any of them is in the same
place at both ends — what differs in between is how long the line is and how
tight its bends are.

A split is authored as **one number: a lateral bulge** — how far the line
leaves the golden path, and which side, held for the whole sector. Everything
else falls out of that geometry rather than being chosen to agree with it: its
length, its bends, and where it is drawn.

**A split is a fork, not a racing line.** A bulge of 40 or more against a path
18 across puts the two roads far enough apart that neither is inside the
other's corridor: two ways through, meeting at the checkpoints and nowhere in
between. Deviating by six or twenty units was the first version, and on screen
it was one road with a wobble in it.

That size is what decides the rest of the construction. A split that leaves by
50 is not "the same bend moved sideways" — offset a 42-radius bend that far and
the arithmetic hands back a negative radius, because at that distance the
offset curve is a different curve. So **the golden path keeps the bends the
track authored, and a split reads its own off the curve it actually is.** That
is safe here and was not when it was tried on the main line: a split is a
smooth generated curve with no sharp arcs to smear, and no authored truth to
disagree with.

**Canonical distance stays on the main line.** Laps, checkpoints and standings
are all measured there, so none of them has to care which way anyone went. What
a route changes is the exchange rate: a short line buys canonical distance
faster than a long one. That, and the bends it hands you, is the whole of what
a split is worth.

## Navigation, and what it lets you plan

Every split carries a **grade** — clear, dim or dark — and navigation is what
sees through it. The ladder is the framework's:

| Nav | What it buys                                           |
| --- | ------------------------------------------------------ |
| 0   | Plan the clear splits. Every ship can do this.         |
| 1   | Plan the dim ones too.                                 |
| 2   | Plan the dark ones: every split on the track is yours. |
| 3   | Re-plan the route at a pit stop. Takes a second slot.  |

A split one grade beyond your navigation is drawn as a hint — you can see
something turns off there and no more than that. Anything further out you
cannot see at all, which is the reason to buy a better system. Androids read a
system one grade deeper, and are worth nothing on this count without one.

**The rule lives in the simulation, not in the screen that drew the buttons.**
A route plan is cut down to what the ship's navigation can actually read before
the lap runs, and without Nav 3 the plan set before the heat is the plan flown
all heat.

The grades are not sprinkled at random: a split you need a system to read is a
better split than one anybody can see, or the system would not be worth its
slot.

## The corridor

Off the golden path is ground a ship can be thrown across. Past the **corridor**
there is something solid — call it a field, call it a rail — and the ship does
not go through it.

Before it, a swing could throw a ship any distance at all: on the Cinder Coil a
low-handling ship charging its hairpins wanted to go 128 units off the line,
which is seven times the width of the path and nowhere that could reasonably be
called a track. The corridor is about three times the path's half-width, so a
ship still has room to go properly wide — that is the whole bet — and only the
extremes ever find the wall. A capable ship never touches it at all.

**The position is capped; the cost is not.** Damage is charged on how far the
swing _wanted_ to throw the ship rather than on how far it got, and hitting the
wall scrubs speed on top, scaled the same way. Without that, the worst swing in
the game would be cheaper than a merely bad one, which is the opposite of what
the swing is for.

The wall charges **once per contact, not per tick**. Per tick was a death
spiral: a ship pinned through a long bend scrubbed every tick, reached the speed
floor and could not finish the lap at all. Damage learned the same lesson first,
and for the same reason.

**Later:** a swing extreme enough to carry a ship out of its corridor and onto
another split — as something a player chooses to fit, not something that happens
to them.

## Being swung into the wrong split

The route is a plan, not a guarantee. At a fork the ship takes the line it
planned — unless it arrives thrown far enough sideways that it is already
pointing at another one, in which case it takes that instead.

The threshold sits **just outside the golden path**, deliberately: losing your
line is something that happens to a ship that went wide, never to one wobbling
inside the path. What is compared is the direction each line leads in, brought
back inside the corridor — a split commits further off the path than a ship can
physically be thrown, so comparing raw commitments would put every one of them
out of reach and the fork would never fire at all.

That makes a big swing at the bend before a fork cost a route rather than only
cost time, which is the swing reaching into the part of the game the player
plans.

## Damage, shields and what it breaks

The ground off the golden path holds things that hurt, and **you hit them on
the way out**. Damage lands once per **excursion** — the tick the ship crosses
the edge — scaled by how hard the bend threw it and how fast it was going. An
excursion is over only once the ship is back well inside the path, so drifting
across the line is not billed twice.

Charging by the tick was the first version and it was wrong: a low-handling
build spends most of a lap outside, so it died every time. That is a ban on a
build, not a risk.

**Shields** take the hit first and regrow while the ship is on the path. They
are refilled at every pit stop.

**What the shields do not stop breaks a component.** A hit that gets through is
split across one or more fitted parts — a bigger hit finds more to break —
chosen by a seeded draw. Each loses **condition**, and a part in poor condition
is worth proportionally less of whatever it gives: a broken engine gives less
thrust, a shot shield soaks less, a hurt crew repairs more slowly. So one bad
excursion is felt for the rest of the race.

**There is no hull, and no frame.** Damage is only ever about what a part is
still worth. A second pool of integrity was bookkeeping the player could not
see, and it duplicated the job the components already do. A ship with nothing
fitted therefore has nothing to break — it is also far too slow to be a build,
so that costs nobody anything.

**Every ship finishes.** Damage costs a ship its pace, never its race. There is
no way to be knocked out of a heat, which is one fewer outcome to think about
on the board and one fewer rule to explain.

**The crew repairs as you fly.** Every tick, condition is patched back toward
whole at a rate set by the crew's `repair` — nanites are rebuilders and fix
almost anything, androids are strong but no mechanics, and a ship with nobody
aboard barely mends at all.

**Everything is repaired between races.** Damage is a within-race system: it
prices speed against shields and gives the crew a second job, and the garage
puts it right before the next heat.

## Gravity and the crew

Gravity is what the crew feels: **cornering load**, which is speed squared over
the bend's radius, plus what the engine adds when it is pushing. Charging a
bend does both at once. Coasting sheds it.

**Endurance** decides how fast that bites. A spent crew loses
`WORN_HANDLING_LOSS` of the ship's handling, which is the framework's "nav
flies it alone, and drifts wide at every bend". With no crew fitted, endurance
is `BASE_ENDURANCE` — low, because nobody is flying it but the nav.

Measuring acceleration alone was the first attempt and it read backwards: a
Charge that holds top speed never accelerates, so it came out the gentlest plan
in the game. Cornering load is what the crew actually feels, and it is why the
tight track empties them and the open one does not.

**Charge** adds `CHARGE_EXCESS_BONUS` to the excess before the draw, because it
is still accelerating when the bend arrives. **Lift** brakes to the holding
speed and draws nothing.

## What the player sees

**Two views of one race, and the player says which is big.**

The **chase camera** is the race as it is flown: the eye sits above and behind
the ship, looking along the track. The golden path runs away ahead and
dissolves into the void — there is no ground under it and no sky over it, only
a ribbon of track hung in space. Rivals are where they actually are, so one
alongside is alongside and one ahead is a shape up the road. Tapping the small
view swaps the two.

The **map** is the race as a standings sheet: the whole loop at once, every
ship's place on it, every split. It was the game's only view and is now the
small one, because the two answer different questions — the camera answers
"what is happening to me", the map answers "where am I in the race", and
neither is any use for the other.

Both draw the same world from the same numbers. The chase camera is a pinhole
over a flat plane, so a position is projected rather than modelled, and nothing
in the sim knows either view exists.

**A view interpolates where the simulation snaps.** The track is sampled every 3
units and a ship covers 0.85 of one in a tick, so the position the tick loop
reads holds still for three ticks and then jumps — which is correct for the
simulation, where a bend's radius is a fact about the bend, and unwatchable for
a camera. The views read an interpolated position and heading instead, and blend
between the film's own ticks so the leftover wall-clock time is spent rather
than dropped. Neither ever reaches back: the same nine lap times come out.

**Space is three layers deep, and that is the whole point of it.** Stars are
infinitely far and turn with the camera without ever sliding; bodies sit
thousands of units out and drift over a lap; dust sits a few hundred out and
slides fast enough to read as speed. A background that all moved together would
say nothing about moving. Each track's sky is seeded from its own name, so a
track keeps its sky and no two share one.

In both views the golden path is drawn with its two edges — the lines the ship
is thrown across, so crossing one reads as an event. Each ship trails a wake,
which is what speed looks like, and the last few bends leave marks where they
threw it, fading as they fall behind.

Three ships fly it, each in its own colour, each nudged into its own drawing
lane so they do not sit on top of each other — a drawing trick only, in both
views: the simulation has no lanes and no ship can touch another.

The **splits** are drawn as the roads they are, not as lines beside one: the
fork peels away, runs its own way through the sector and comes back. A road your
navigation can plan is drawn plainly; one a grade beyond it is drawn faintly —
you can see a road turns off there and no more than that — and anything further
out is not drawn at all.

The **corridor walls** are drawn where they are: a field either side of every
road, fading upward rather than stopping at a rail, so it reads as something
holding the ship in and not as scenery.

The **tracking bar** is the thing that says who is winning: a lane per ship with
its place, how far round the lap it is, and what it is giving away on total
time. At a pit stop and at the finish it shows totals instead of gaps.

Because the segment is computed before it is shown, its end already knows who
won — so the bar must not read it. While a lap is playing the bar is read off
the film at the cursor and nothing else, and the test for that is that cutting
the film off at the cursor changes no answer. It matters: on the Kestrel Loop a
Charge can run third the whole lap, twenty-eight ticks down at half distance,
and win at the line.

**Two screens.** The **race** is playback: the views above, and the tracking bar
over them. The **garage** is every decision: the track, the corner plan, the shop, the
shelf and the build — credits, slots used, and what the build adds up to. A seed
box sits under both, because the same seed must produce the same heat and being
able to prove that by eye is the point.

**The route** is planned in the garage, a row per sector and a button per way
through it. A line your navigation cannot read is shown locked rather than
hidden, because knowing that a better system would buy you something is the
reason to buy one. Once the heat starts the route is sealed, and the panel says
so — unless you fitted the system that can re-plan at a pit stop.

You can swap between them whenever you like, and the tracking bar stays on both
so the lap can be watched while the shopping is done. What you cannot do is
reach the ship on screen: the garage says so plainly while a segment is
running, and anything bought or fitted waits for the next decision point.

## The heat

A **heat** is `LAPS_PER_HEAT` laps of one track by three ships, stepped in
lockstep. Ships never touch, and none of them can see another: each carries its
own race state and draws its swings from its own seeded stream, keyed by which
ship it is and which lap this is. One ship's luck can never shift another's.

A lap ends for a ship when it crosses the line; it then waits. When the last
ship is in, the heat goes to the **pit stop** — or to the finish, if that was
the final lap.

**The pit stop resets the line, not the clock.** Everyone restarts level, from
a standstill, at the start of a fresh lap. What each ship keeps is its total
time, which is the sum of its laps, and that is what decides the heat. So being
ahead on the track is not the same as leading, which is the whole reason the
tracking bar exists.

The player may change the corner plan at the pit stop, and the bots choose
again too. Every decision is an input, fixed before the lap that consumes it —
never during it.

**Standings** are read two ways, for two different questions. Once everyone is
in, a ship's total time is the answer and the bar shows it. While a lap is
playing, `orderAt` reads the film at the cursor: a ship is placed by the time it
has banked plus the ticks it has run, and its gap to the leader is how long ago
the leader was where it is now — the interval a racing bar shows. Past the line
the road stops comparing, since each ship sits frozen wherever its last tick
left it, so finished ships are separated by their times instead.

## The rivals

A **bot** reads the track and picks a build and a plan, seeded, before the lap.

Its build follows the track's **tightness** — how far its bends sit below what
a stock ship could take flat out, averaged over the bends. A coil of hairpins
tilts the bot toward Handling; a run of open sweepers tilts it toward Thrust.
The draw then pushes it off that, so a bot that reads the track well still has
to commit before it knows how the bends fall.

Its plan follows its own build: a ship with Handling to spare can afford to
Charge, and one without it usually Carries. It re-picks each lap.

Nothing about a bot is privileged. It decides from the track and its own state,
before the lap, and hands the result in as an input — which is exactly the seam
a networked player's choices will arrive through.

## Tuning

Every balance number lives in `src/sim/tuning.ts`, with a one-line comment
each. Never inline a tuning constant. Three kinds of number are not tuning and
stay where they are: algorithm internals (the RNG's constants), level data
(the track's pieces), and structural numbers (array indices, `/ 2` for a
midpoint).

## Later

Everything else in `design/catalogue/framework.md`: three ships in a heat over
two laps, pit stops, splits and navigation, components and slots, the shop as
an inventory, weapons and fixtures, pools and the purse, points and the cut.
`BACKLOG.md` says the order.
