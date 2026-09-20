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

**S1 — the swing**, **S2 — the heat**, **S3 — the ship and the shop**,
**S4 — the route**, **S5 — the season**, **S6 — interaction**, and the
measurement half of **S7 — the shop**.
Three ships fly one of three authored loops for two laps, with a pit stop
between them. The player fits components into slots in the garage between laps,
sets the corner plan and the route, and races; the rivals are bots that read the
track and choose for themselves. The stats are no longer sliders — they are what
a build adds up to. Each lap is resolved before it is played back, on its own
screen. Sectors offer more than one way through them, and what the player may
plan is what their navigation can read. A heat is no longer the whole game: nine
racers run a season of phases, a cut at the end of each, and what a heat pays is
what you take into the next one. And the ships can now reach each other: weapons
push a rival off their line, mines wait on the road, and an engine's boost can
leave a black hole behind it.

## How a track is built

**A track is a graph.** Checkpoints are its nodes, sectors are its edges, and a
split is a second edge between the same two nodes. `design/track-model.md` is
the spec; this is what is built of it.

**A section is a stretch of track that knows its own two ends.** It starts at
the origin facing along +x, and its exit says where it leaves you. Snapping one
onto another is composing those poses, which always works — so any section fits
any other, which is what the framework asked for.

A track used to be one flat list of pieces walked from the origin, closed by a
rule: author a half that sweeps exactly 180°, then walk it twice. That made
**closure a global constraint on the whole list**, which is the opposite of
snapping and the reason there could be no builder. Sectors were not authored at
all — checkpoints were even divisions of the total arc length, so a sector was a
slice of a continuous walk rather than a thing you could lift out, reuse, or
splice in.

Now:

- **A sector is a section.** There is one checkpoint per section and it sits at
  the join, so a sector boundary falls between two shapes rather than at an
  arbitrary distance that could land halfway through a bend.
- **Closure is a property of an assembled set.** `closureOf` says how far a run
  of sections is from coming home, in units and in degrees. `assemble` refuses a
  set that does not close.
- **The loop is closed for you.** `closingSection` builds the run home from
  wherever the last section left off: a curve, a straight, and a curve — the
  shortest of the four such paths that exists between two poses. So the answer
  to "these do not close" is to ask for a closing section, not to re-author by
  hand.

**A split is a road, not a number.** It used to be a single figure — a lateral
shove applied to the golden path, tapering to nothing at each end — so it had no
pieces, no authored bends, and no meaning independent of whatever shape it was
applied to. It is a sector of its own now, walked from its own pieces, joining
the same two checkpoints the golden path joins.

Authoring one is **peel off, then find the way back**: lay the pieces that give
the road its character, and the connector works out the curve-straight-curve
that returns it to the next checkpoint. Closing a ring and closing a split are
the same problem, so they use the same machinery.

Two things follow that a bulge could never have. A split has **authored bends at
authored radii**, so the curvature-reading that used to infer them — and that
lied about exactly the corners that mattered, turning a 42-radius hairpin into a
60 — is gone from the codebase. And a split can be **wrong**: it can fail to
meet its checkpoint, or end up in the same place as another road.

**Two roads may cross; they may not be in the same place.** The rule used to be
that a split must not come within a corridor of any other part of the circuit,
because a road running through another road is a junction with no rules. That
was right while the world was flat, and it is too strict now: where two roads
cross, one is carried over the other, so what matters is whether they are ever
in the same place rather than whether they meet in plan. Figure-eights and
crossovers become authorable.

Two roads through the **same sector** are exempt, and always were: they are
alternatives, and a ship is on exactly one of them, so they may share as much
ground as they like. That is what a fork is. Three of the four tracks that ship
have a wide line crossing its own sector's golden path — the old rule skipped a
split's own sector rather than permitting it, so this was always happening and
is now drawn as what it is.

**A ring must go somewhere, and every sector in it must be a road.** A ring
whose sectors are all empty finishes exactly where it started, so it reported
itself closed and produced a track of length zero — and canonical distance is a
fraction of the lap, so every `distance % length` in the race divides by it. A
single empty sector is the same mistake smaller: it contributes no length, so
its checkpoint compares equal to the next one, `sectorAt` never returns it, and
no ship is ever *in* it — a fixture placed there could never bite. Both are
refused at assembly. The builder makes empty sectors on purpose, because that is
what inserting one does, so this is the line between editing a ring and racing
on it. A fuzzer found both by deleting pieces until there were none left, which
is exactly what an edit made mid-season could do.

**A road that does not arrive is refused, not drawn.** Assembling a track runs
the check and throws, naming the road and how far out it is. A split that misses
its checkpoint teleports the ship at one end, and it draws and exports perfectly
happily — so warning would not be enough.

**Pieces carry properties as well as shape** — environment, a pocket that pays,
danger on the path rather than only off it. See **What a stretch of road is
like**, below, for what each of them costs. They are what "a split worth taking
because it is safer, or because it holds something" has been waiting on since
S4: until they meant something, every split could only be balanced on the clock.

The three tracks that ship are the same shape they always were, piece for
piece — what moved is where their checkpoints sit. Two things follow from that
and only one of them is luck. A bend's position *within its sector* is part of
the key its swing is drawn from, so every draw re-rolled and Carry and Charge
laps moved, a long way on a tight track and entirely inside the spread across
seeds. And braking looks ahead past the end of the current sector into the next,
so a swing-free Lift lap moved too — four ticks on the Cinder Coil. That one is
a real behavioural change from a real design change.

## What a stretch of road is like

Shape is not the only thing a piece of track can say about itself. A piece, or a
whole sector, also carries **properties**: what surrounds it, whether it pays,
and whether it is dangerous on the path rather than only off it.

A sector's properties reach every piece in it, and a piece may override any one
field without cancelling the rest — so "this whole stretch is a nebula, but the
third bend of it pays" is two sentences rather than four. Resolution happens
once, when the track is assembled; the race never asks a sector anything.

| Property      | What an author writes                   |
| ------------- | --------------------------------------- |
| `environment` | `open`, `nebula`, `debris` or `shadow`  |
| `pocket`      | how much flying it pays                 |
| `hazard`      | how hard it bites, on top of the ground |

An environment is a **named bundle** of what it does, because an author picks
"this bit is a nebula" and should not also have to decide what a nebula is —
that is a property of the game and it lives in `tuning.ts` with the other
numbers. What a stretch comes to is four numbers:

| Effect   | What it does                                                    |
| -------- | --------------------------------------------------------------- |
| `grip`   | multiplies the speed a bend there can be held at                 |
| `sight`  | how well the road can be read, which decides how set you are     |
| `hazard` | damage on entering the stretch, scaled by the speed you meet it at |
| `pocket` | salvage for the ground flown through it                          |

- **Nebula** is thick: it lowers the holding speed, so the same entry swings
  wider. That is the bet the whole game rests on, applied to a place instead of
  to a build.
- **Debris** scrapes. Cheap on the line, expensive at speed.
- **Shadow** hides the bend until you are into it. It is spent the way Charge's
  own penalty is — the swing is drawn from a worse place — rather than as a new
  kind of loss. Which means **Lift is immune to it**: the plan that gives up all
  its speed for certainty takes no swing at anything, so there is nothing for a
  surprise to make worse. That is deliberate, and it is what Lift is paying for
  everywhere else.

Nothing here is a new thing for a player to learn. Every one of the four is
spent in currency the game already had.

**All of it is drawn, from both views.** The map colours the stretch, because
the map is where a route is chosen. The chase camera colours it too and floats
the thing's name over it, because the chase camera is where a route is *flown* —
a player who cannot see the nebula coming has no way to connect being thrown
wide with the reason for it. Fixtures stand up out of the road rather than lying
flat on it, and say what they are: a ring on the ground is the thing's reach,
and at any distance in a perspective view a ring on the ground is three pixels
under the horizon. The shapes are placeholders; the labels are not.

**A hazardous stretch bites once, on the way in** — not every tick the ship is
stood in it. That is the rule the excursion hazard already follows, for the
reason this codebase has now learned three separate times (S3.6's parts, V1.2's
wall, S6's mines): per-tick damage is a ban on a build rather than a risk to it.

A stretch that says nothing costs nothing: it contributes no band at all, so a
track that uses none of this carries an empty table and pays nothing for the
feature existing.

## Verticality

A loop laid out in two dimensions can cross itself, and a road running through
another road looks like a mistake. Where the lap passes over itself, one strand
climbs and the other dips, so the two are never in the same place: a bridge.

**It is a drawing and nothing else, and that is enforced rather than promised.**
The height of the road is computed in `src/render/height.ts`, and `src/sim` is
forbidden by ESLint from importing anything in `render/`. The simulation
therefore *cannot* see elevation — not by discipline, by construction. No future
change can quietly make a hill cost speed without first moving that file, which
is a thing a reviewer would see.

Heights are **derived, never authored**, like checkpoint poses and for the same
reason: two sources of truth about where the road is can disagree, and the
disagreement is silent. Crossings are found by walking every road against every
other — a split is a road in its own right and can cross the main line, another
split, or a different sector entirely — so height is a function of *which road*
as well as how far along it. One number per lap could never tell a split from
the golden path beneath it, since they span the same canonical distances.

**A bridge only ever goes up.** The road being crossed stays exactly where it
was; what climbs is the road going over it. Raising one strand and dipping the
other by half each was symmetric and wrong, and it broke the camera three ways
at once — see below. Driving under somebody else's bridge is the common case,
and it now moves nothing at all.

Every road is **held to the ground at both of its own checkpoints**. That is
what lets roads meeting there agree without anything being solved: a ship
crossing a checkpoint may change roads, and a step in the road at that moment is
the one place a bridge would be allowed to look broken. The cost is real and is
not hidden — a crossing within a ramp of a checkpoint cannot be lifted clear, so
it is measured and refused rather than drawn badly.

The gap is set by what the approach needs, not by the crossing. The full height
is only reached *at* the crossing; a little to either side the two roads are
still within a corridor while the ramp is still climbing, and that is the
binding case. Measured on a figure-eight: 30 units at the crossing left 20.4
where the roads pass a corridor apart, against the 19.4 a corridor needs —
passing by a unit, which is not margin. It is 38 now, which leaves 25.8.

**A camera that is following something follows it.** The eye rides at a fixed
height above the ship's own road and nowhere else, and what a hill does to the
picture is a matter of where it *looks*: the pitch tilts up a climb and down the
far side, which is what gives a hill a sense of direction. The tilt is clamped,
and the clamp is set by measuring where the ship lands on screen rather than by
taste — unclamped it reached 98% of the frame height, which is on screen by the
arithmetic and off it in practice.

Three earlier versions got this wrong, each in a way that read as the projection
being broken. Taking the height from the road *behind* the camera is a different
point on a ramp, so the ship slid up and down the frame. Taking the highest road
in sight lifted the eye the moment a bridge appeared — hundreds of units early,
with the ship lost off the bottom. And a road is a filled surface with no
thickness, so an eye that dips below one sees its underside, where a bend going
right appears to go left; that one is gone because a bridge only ever goes up.

Anything that sits *on* the road — the ship, its shadow, its wake, a shot
between two ships, the scuffs a swing leaves — is measured from the road rather
than from the plane, or it carries straight on through a hill.

**The ship leans with the road too.** Drawn level while the road climbed away
beneath it, a ship reads as ignoring the hill even once it is at the right
height. So the hull is pitched by the gradient of the road under it, capped a
little over 20° because a ramp is steepest in the middle and a short sector can
stack a bump on a taper — the Cinder reaches 46° of road, and a ship standing on
its tail is not what this is for. It is a drawing and nothing else: the pitch is
read off the same relief the road is, which the simulation cannot see.

The one number this needs that is not obvious is how much of the screen a unit
of *height* is worth against a unit of *road ahead*. They are not the same and
are not close — the road in front of the ship is foreshortened almost flat while
the vertical barely is, about three to one under this camera — so the ratio is
measured by projecting both and the lean carries it. Taking them as equal was
the first version, and it tilted the ship by a third of what the road was doing.

**A world angle is never handed to the canvas.** They turn opposite ways — a
heading anticlockwise, a canvas rotation clockwise — and the map's projection
flips the vertical axis on top of that and may turn the whole panel a quarter.
Anything that needs a direction on screen projects a step along the heading and
takes the angle between the two screen points, which is right for all three and
needs no special case for any of them.

**Both views agree about which way a bend goes**, which they did not until now:
the map projected the world's y straight onto the canvas's, and canvas y grows
downward while the world's grows up, so the whole map was mirrored. True since
V1 and unnoticed, because a mirrored track still looks like a plausible track.
It only shows when you compare it against something — which is now a test, on
every bend of every track, against the simulation's own `turn`.

**Every track runs clockwise.** Which way round a loop goes is level data — the
sign of each bend — and nothing else: mirroring a track changes its picture and
not one number in it, which was measured rather than assumed. Lap length, tick,
speed, shields and every swing come back identical on all four tracks under all
three corner plans; the only thing that moves is the sign of a lateral offset,
because left and right have swapped. They were all anticlockwise before, which
nobody had chosen. A test now watches the winding on the map, because a track
that turns the wrong way is still a perfectly plausible track.

**None of this was needed to keep the race honest**, which is worth saying
because it is easy to assume otherwise. A ship's position is a canonical
distance plus a lateral offset; it is never an (x, y). Nothing in the tick does
a spatial query — a mine is found by `sector === sector && route === route`, not
by being near something — so a mine in sector 1 could never bite a ship in
sector 7 however much the two overlap on screen. Verticality buys a picture that
makes sense. It buys no rules, and needs none.

## The track

A track is a closed **loop** walked out from an ordered list of **pieces**:

| Piece      | What it is                                                        |
| ---------- | ----------------------------------------------------------------- |
| `straight` | a length, in track units                                          |
| `bend`     | a radius and a signed sweep in degrees; positive turns left       |

Walking the pieces produces the **centreline** — the golden path — as a
polyline, and fixes where every bend starts and ends. Geometry is level data,
not tuning: the shape of a track is content. Every track that ships sweeps a
full turn **negative**, so the lap runs clockwise.

Three tracks are built, and they exist to ask whether one strategy wins
everywhere. They do not:

| Track | Length | Bends | What wins on it |
| ---------------- | ------ | ------------------- | ------------------------------ |
| **Kestrel Loop** | 1408 | mixed, tightest r42 | balanced build, Charge — 28.0s |
| **Meridian Run** | 2370 | open, tightest r62 | reckless build, Carry — 39.3s |
| **Cinder Coil** | 688 | tight, tightest r26 | nimble build, Charge — 16.9s |

A fourth, **The Proving Ground** (1252 units, tightest r50), is not one of them,
and **every season opens on it**. Its four stretches are matched in pairs — the
clear run against the scrapyard, the nebula against the dark — so that each pair
is the same shape and differs only in what the road is made of, which is the one
comparison the track exists to make. It carries one of each kind of fixture too.
It exists so that properties can be seen from inside the game rather than only
in a test, and it is a separate track rather than a nebula bolted onto the
Kestrel because the three above carry every balance measurement taken so far and
no property is cosmetic. It goes when real content replaces it.

**Its golden path crosses itself**, which no other track's does, so it is also
the only place a player on the main line goes over a hill. The shape was
searched, not drawn: both straights are exactly what they were, because they are
the property stretches, and only the bends changed. The constraint that decided
it is not the obvious one — a crossing within a taper of a checkpoint cannot be
lifted clear, so it has to land in the middle of a sector. Of 180,320 shapes
that close, 80,426 cross somewhere and 127 cross with room to build the bridge.

Its long bend is written as two 115° corners rather than one 230° sweep. That is
the same curve to thirteen decimal places, but it is **not** the same race: the
corner plan fires at every bend, so two in a row is a different proposition from
one long one. Lift does not notice, because both halves share a holding speed;
Charge found 41 ticks. It is written that way because the builder's shelf has no
family wider than a hairpin's 180°, and a track that ships has to be one the
builder can describe.

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

**What is on the road is drawn where it is.** A mine is a ring you can see your
line going through or past; a black hole is a bigger one, filled. Both are drawn
under the ships in both views, because a ship must never be hidden by the thing
that is about to hit it.

**Interaction has to be legible or it may as well not exist.** The first build of
S6 was correct and invisible: ships were bounced by nobody in particular, and
there was no sign a charge was building or being spent. Four things fix that, and
they are all about naming the cause rather than showing the effect.

- **The charge meter** sits under the tracking bar, on both screens, and is up
  whenever a ship that can spend a charge is racing. It says what the charge is
  for and glows when it is full. A resource nobody can see is a resource nobody
  believes in.
- **A shot is drawn going somewhere** — a dashed line from whoever fired to
  whoever it was aimed at, under both ships so neither end is hidden.
- **A hit flashes where it landed**, a ring that opens out and fades over the
  ticks after it.
- **The state line names the cause.** Firing says who it was fired at; being hit
  says what hit you *and whose it was*. "A ship bounced" and "Thessa Kyre's
  gravity mine bounced me" are different events, and only one of them tells the
  player their slot is doing something.

A shot and a hit each last one tick in the simulation — a sixtieth of a second,
long enough to happen and far too short to see — so the screen holds each for a
few ticks after. Those are drawing numbers and live in `main.ts`; the simulation
does not read them, and nothing about the race changes if they do.

**The mine** is placed in the garage, a button per sector, and only when a rack is
fitted. Laying none is a real choice: a placed mine is on the board before the
start, so it tells the rest of the heat something about you.

**The shop says what a part would do for *your* build**, not what it does in
the abstract. Every row carries the difference fitting it would make — `+0.25
thrust · −0.08 handling`, `+22 shields`, `an ability`, `25% off upgrades` — read
by resolving the build with the part and without it, so what is shown is the
truth for the ship you actually have rather than the numbers on the part.

That matters because several parts are worth nothing to some builds and the
numbers on them cannot say so. A crew is the best one aboard, so a second crew
adds nothing at all; a second engine adds less than the first, because copies
fall off; a navigation crew is worth nothing without a system to read. A part
that would add nothing says so and is dimmed rather than hidden — knowing that a
second crew is worthless is worth knowing. Fitted parts carry the same line,
which is how a ship with three crews aboard shows two of them idle.

**The standings** sit at the top of the garage, because between heats there are
only two questions worth a glance: am I going to survive the cut, and who am I
racing next. So the panel is points, the cut line drawn across the table where
it falls, and the ships in the next group marked. The Go button says what the
season is waiting for — a pacing lap, a heat, or a new season.

You can swap between them whenever you like, and the tracking bar stays on both
so the lap can be watched while the shopping is done. What you cannot do is
reach the ship on screen: the garage says so plainly while a segment is
running, and anything bought or fitted waits for the next decision point.

## The heat

A **heat** is `LAPS_PER_HEAT` laps of one track by three ships, stepped in
lockstep. Ships never touch. Each carries its own race state and draws its swings
from its own seeded stream, keyed by which ship it is and which lap this is, so
**one ship's luck can never shift another's**.

Since S6 a ship's *choices* can. That is the whole of "Interaction" below, and it
does not weaken the rule above: what reaches you is never somebody else's dice,
it is something they bought and something they aimed.

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

Some rivals race the track and some race you. A bot that arms itself is giving up
a slot of pace for a slot of trouble — the same bet the player is offered, made
before it knows who it is drawn against, exactly as the player makes it. If it
brought a mine rack it picks a sector to lay one in, seeded, because a rival that
always mines the same sector is a sector you learn to avoid once.

Nothing about a bot is privileged. It decides from the track and its own state,
before the lap, and hands the result in as an input — which is exactly the seam
a networked player's choices will arrive through.

## The season

A heat used to be the whole game. Nothing it produced had to be worth anything
afterwards, so nothing about finishing second rather than third mattered. The
season is what makes it matter.

`ROSTER` racers — the player and eight rivals — run `PHASES` phases of
`HEATS_PER_PHASE` heats each. Every heat the field is drawn into groups of
`GROUP_SIZE` and each group races its own heat on the same track; the player's
group is drawn first, because that is the one anybody watches. The other groups
are the same simulation with nobody watching: same orders, same seed, resolved
rather than played.

**What carries between heats is the garage**: credits, slots, and the parts in
it. That is the whole of the thing — a season is a garage growing, or not.

**The pacing lap** opens the season. The player flies the first track alone
against its `par`, and is paid `PACING_BASE` for turning up plus
`PACING_PER_TICK` for every tick under par, to `PACING_CAP`. It is the first
sight of a track and the first credits of a season, and nobody can lose it.

**The first track is always The Proving Ground**, whatever the seed. Every other
heat is drawn, but the opening one is spent on the track that says what a road
can be made of — every property, one per sector, one of each kind of fixture,
and the only hill a player meets on the line they fly. Drawn at random it turned
up on a plain loop three times in four. It costs the variety one heat of nine.

This is `trackAt` rather than a special case at the pacing lap, and that matters:
the opening track is also heat one, and the rivals shop against it before the
season starts. Three callers, one answer, or the field turns up built for a track
it is not racing.

**What a heat pays** is a purse by place (`PURSE_BY_PLACE`), points by place
(`POINTS_BY_PLACE`), and a slot for finishing. On top of the points sits a
**margin bonus**: up to `MARGIN_POINTS` more, falling to nothing across
`MARGIN_WINDOW` ticks of gap to the winner. So a third that finished on the
winner's tail is worth about twice one that was beaten out of sight, which is
the reason to keep racing once the win has gone.

**Credits held earn interest** — `INTEREST_RATE` of the balance, capped at
`INTEREST_CAP` — so not spending is a move and not merely a failure to shop.
The cap is what stops it being the only move.

**The cut** comes at the end of every phase: the bottom `GROUP_SIZE` of the
table are out. The roster is a multiple of the group size and stays one, so the
last phase is a single group racing each other for the season. The standings
panel draws the cut line where it actually falls, so "one more place" is
something the player can see rather than a number they hold in their head.

Ties are broken by credits, then by name — never by anything unseeded.

**Being cut ends the run.** The season would carry on perfectly well without
the player; the rivals would go on racing each other. But there is nothing left
to decide, and a race the player is not in is not a thing to offer them.

Rivals shop between heats the way the player does, out of the same purse and
against the same shelf, holding back `BOT_THRIFT` of what they have. Nothing
about a rival is privileged: it decides from the track and its own garage, and
hands the result in as an input.

## Interaction

**What another ship bought changes your race.** Everything here reaches you
through the track — nothing is a collision, and the sim still has no way for two
ships to occupy the same place.

**The rule that makes it safe: nothing lands on the tick it was fired.** Every
ship reads a world built from the state *before* the tick, and whatever it sends
out is resolved into impulses that arrive on the tick after. So no ship's move
can depend on where another one got to this tick, and the order the ships happen
to sit in the array cannot change the race. It is the same rule the whole sim
already runs on — a decision is an input, fixed before the tick that consumes it
— applied to ships instead of to players. It is also what lets a heat be resolved
on one machine and watched on three.

### Charge

A ship gathers **charge** on the golden path and nowhere else, at a rate its crew
improves — Engineers make shields *and* abilities recharge faster, which is one
number doing both. Off the path it gathers nothing. So a lap spent being thrown
wide arrives at the last bend with nothing to spend, which is the second reason to
hold the line after speed itself.

### Abilities

**They fire themselves.** An ability reads a condition the ship can see for
itself and spends the charge when that condition holds. The player's decision was
made in the garage, when they fitted the part. Nothing asks the player anything
mid-race, which is what keeps the third rule true when the rival is one day a
person rather than a bot.

| Ability | From | Fires when |
| --- | --- | --- |
| **Boost** | speed engine L3 | a straight with `BOOST_WANTS_CLEAR` of clear road on it |
| **Boost, dark** | dark matter engine L2 | the same — and it leaves a black hole where it fired |
| **Three perfect bends** | handling engine L3 | `PERFECT_WANTS_BENDS` bends lie close together ahead |
| **Missile** | missile rack | a rival is within reach up the road |
| **Tractor beam** | tractor beam | the same — and a tether pulls both ways, so it tows you too |
| **Mine** | gravity mines | somebody is close behind — the one ability aimed backwards |

The order they are offered in is fixed, so two ships with the same build in the
same moment always do the same thing. A ship fires one ability per charge.

**Three perfect bends** takes its bends at top speed with no swing at all, and a
bend reached within `PERFECT_WINDOW` of the last pays extra speed — which is what
makes the chain want a coil of bends rather than three stray ones.

A part broken past `ABILITY_WORKS` still flies and still adds what it adds; it
just no longer has the ability in it. That is how damage costs a ship a weapon.

### Weapons displace, they do not damage

A weapon costs you **the line you were on**, which is the currency the swing is
already paid in. A missile shoves a rival further off whatever line they are on;
what the shields do not soak is what moves the ship; the corridor holds it in the
same way it holds a swing.

**The tractor beam is the exception twice over.** It takes speed straight off,
and no shield answers a pull — and because a tether pulls both ways, holding the
ship ahead back also tows the ship holding it. That is the only reason to fit
one: it is the single weapon that helps its owner directly rather than only
hurting somebody, and without that it had no answer to "why this instead of a
missile or a mine". The tow both lifts the ceiling and pulls every tick, because
lifting the ceiling alone is worth nothing to a ship still climbing toward it —
the same flaw that made a short boost worth almost nothing.

Being shot at a fork can therefore cost you a split, exactly as being thrown wide
can. Nothing else about it is new.

### What is on the track

A **fixture** is something somebody left on the road. It bites **once per ship per
lap** — not once per tick it is near, which is the mistake damage made in S3.6,
the corridor wall made in V1.2, and this layer made again on its first run, where
it doubled a lap time. It never bites the ship that laid it.

- **Gravity mines** throw a ship further off whatever line it was on, which is why
  they cost most to a ship that meets one already out of shape. A mine may be
  **laid before the heat**, in a sector chosen in the garage, and is then on the
  board for all three ships to see — the one piece of interaction nobody is
  surprised by. A mine rack also drops them mid-race, for whoever is behind.
- **Black holes** are the odd one. They are made mid-race by a dark matter
  engine's boost, they are not announced, and **they discriminate by build**: a
  ship with a dark matter engine reads the hole as a corner — through it faster,
  unharmed, and gathering what it sheds — and everybody else meets a hazard.

- **The track's own** are level data: a mine or a hole the *author* put there,
  before anybody has raced on it. They belong to nobody — an owner no entrant
  can have — which is what makes them bite the whole field rather than
  everybody-but-one, and they are there for the whole heat because they are part
  of the track and the track does not get cleared away. They are authored as a
  sector, a road through it and a fraction of the way along, never as a distance,
  so moving a checkpoint or re-cutting a sector carries them along instead of
  leaving them stranded — the same reason checkpoint poses are derived and never
  authored.

Fixtures laid before the heat survive the pit stop. Ones dropped during a lap do
not: the lap restarts and the road is clear again.

### Collection

**Salvage** is what a collector shield keeps of whatever hits it. At level 3 and
full shields it keeps the weapon **whole** — it never lands at all — and sells it
when the race ends. Below that it keeps a piece of every weapon that does land,
more of it the deeper the collector. That is the part's job at every level: it
turns being shot at into money. Needing level 3 *and* full shields to collect
anything left the first two levels doing nothing, which is a part nobody buys
twice.

**Dark matter** is gathered by flying through a black hole with a collector
aboard. At level 3 that collector cashes it in for credits; below that it is fuel
and nothing else.

Both are paid at the end of the heat, on top of the purse. So a ship can come
third and leave the heat richer than the ship that beat it — which is the first
income in the game that does not come from beating somebody, and the first reason
to spend late-season credits on something that is not a stat.

## The shop, and what a level is worth

**Levels must be worth more than copies.** This is the rule the whole shop rests
on, and until S7 it was the wrong way round.

Only two categories add up at all. A crew, a navigation system and a weapon are
each **the best one aboard** — a second crew does nothing, a second navigation
system does nothing, and a second missile rack fires no extra missile. Engines
and shields are the exception: their numbers sum. So those two are the only
places where "buy another" competes with "buy deeper", and the arithmetic said
buy another: 106 credits bought a level 3 balanced engine for +0.30, or three
level 1s for +0.45. Upgrading was strictly the worse deal.

Nothing priced that difference, because **slots arrive free** — one for every
race finished, so thirteen by the end of a season. A build with nothing to spend
credits on could bolt on another engine at no cost but the credits, and twelve
cheap engines put both thrust and handling on their caps. The whole shop
collapsed into one move, and every question about *which* part was drowned out
by *how many*.

Three things fix it, and the third is the one that worked — see "A ship carries
one engine" below. The two that came first:

- **Every level now adds more than the level below it**, at a cost that rises
  more slowly than the effect. A maxed engine beats the copies the same credits
  would buy, and does it in one slot instead of three. That is what makes "one
  maxed part is most of a ship" true rather than aspirational.
- **Each further copy of the same component is worth less than the last** —
  `STACK_FALLOFF`, 60% of the one before. Two of a thing is still a build;
  twelve is not.

The falloff is deliberately **per component, not per category**. The framework
is explicit that two shields is a build rather than a mistake, and that a
collector's storage scales with the ship's *total* shielding — so two different
shields each count in full. What is stopped is the same part twelve times over,
not variety within a category.

### The shop is a window, not a catalogue

**Four components are offered at a time**, drawn from the catalogue on a seed,
and what you are shown is the decision. A menu of everything is not a shop; it
is a list, and a build made from a list is whatever the spreadsheet says is best
that week. `SHOP_OFFERS` sets how many.

The window **refreshes free with every heat**, and within a trip a **reroll
costs `REROLL_COST`** — flat, and cheap against a component's 26 to 40. Looking
again is meant to be an ordinary thing to do rather than a decision with a
budget attached: the interesting choice is which of the four to take, not
whether you can afford to see four more.

The draw is **with replacement**, so the same part can appear twice in one
window. That is not a wasted offer, because of the next rule.

### A level is bought in copies, and only in copies

**Credits cannot buy an upgrade.** The only route to a deeper part is more of
the same component, bought and **broken down for research**: `RESEARCH_FOR_LEVEL`
is two copies for the second level and four for the third, so a maxed part is
six copies plus the one being flown.

Paying for depth in money made deep parts a question of income, and income is
the thing every build has. Paying for it in copies makes them a question of what
the shop has been offering and of whether you are willing to spend a window on
something you already own — which is a decision, and the other was a threshold.

It is also what a duplicate is *for*. Selling a spare back returns `SELL_RETURN`
of its cost; breaking it down is the only way anything gets better. A window
that offers you the same engine twice is a good window.

**Rivals climb the same ladder.** They have to: with the credit route gone, a
bot that kept paying at the counter would never see level 2 again. So a rival
that wants a deeper part buys copies of it and breaks them down, exactly as a
player does — `buyResearch` is the two clicks in one call, and nothing about it
is a special case for bots.

### A ship carries one engine

`FIT_LIMIT` caps the engine category at one. A second engine cannot be fitted at
any price, in any slot, at any level.

This is the rule four tuning passes were trying to write as a number. The
degenerate build was one maxed engine and eleven cheap ones, and every attempt
to price it out failed for the same reason: a balanced engine trades nothing —
not thrust, not handling, not a slot it could have spent better — so its only
cost is credits, and credits are what a season pays you. `STACK_FALLOFF` made
the twelfth engine nearly worthless and the build still won, because the first
few were all it needed to put both stats near their caps. **A limit is not a
price, and this wanted a limit.**

Shields stay uncapped on purpose. The framework is explicit that two shields is
a build rather than a mistake, and a collector's storage scales with the ship's
*total* shielding — so the falloff, not a limit, is what governs them.

The engine is still a real choice, and more of one now: swapping it is the
decision the cap exists to make interesting.

### A slot has a price

**Finishing a heat buys progress toward the next slot, not the slot.** Slots are
the only budget in the game that ever says no to a build, and one arriving every
race said no to nothing — which is most of why bolting on cheap engines was the
best build there was. `SLOT_PROGRESS_PER_FINISH` per finish; the next slot costs
`SLOT_COST_BASE` and each one after adds `SLOT_COST_STEP`, so the fifth slot is
two heats and the eighth is five. Credits buy progress too, at `PROGRESS_PRICE`
a unit.

Over a nine-heat season a racer that finishes everything now earns three slots
and change, against nine before.

**Rivals shop through a seam, not a special case.** `settleHeat` takes a
`Shopper`: today every rival is a bot, but nothing in the season assumes that. A
rival is whoever hands in a garage, which is the same shape a networked player's
shopping would arrive in — and it is what lets the balance harness race two ways
of spending against each other rather than against a bot.

**The window is the player's alone, for now**, and that is a known gap rather
than a design. Rivals still shop the whole catalogue through `botShop`, so the
balance harness measures policies that can buy anything against a player who
cannot. The slot economy *is* measured, because `finishRace` applies to
everyone; the draw and the reroll are not measured at all. Moving rivals onto a
window of their own is the obvious next step and is under "Later".

**Balance is measured in seasons, not in ticks.** `npm run balance` runs whole
seasons where every racer follows a **policy** — a build they are shopping
toward — and reports how often each survives the cuts and wins. A heat-clock
measurement cannot answer the question the shop asks, because the season pays by
place and the cut is on points: a part that wins races while losing time is a
good part, and ticks call it bad.

## Tuning

Every balance number lives in `src/sim/tuning.ts`, with a one-line comment
each. Never inline a tuning constant. Three kinds of number are not tuning and
stay where they are: algorithm internals (the RNG's constants), level data
(the track's pieces), and structural numbers (array indices, `/ 2` for a
midpoint).

## Later

Everything else in `design/catalogue/framework.md`: augments, declarations,
pools, the track growing between phases, and real players.
`BACKLOG.md` says the order.

Three directions are recorded rather than built, because each says something
about what would have to change first:

- **A split need not be balanced on lap time.** It may be worth taking because
  it holds resources, because it is safer, or it may be a bad route whose job is
  to make a navigation system worth its slot. The blocker is not the split: a
  safer line is worth nothing while the golden path is free of danger, so
  hazards that sit _on_ the track have to land before "safer" can be a reason to
  go anywhere.
- **Tracks that snap together**, and a tool to build them with. Today closure is
  a global constraint on one authored piece list — `loopFromHalf` refuses a half
  that does not sweep exactly 180° — which is the opposite of snapping. Each
  section would have to carry its own entry and exit pose, and closure become a
  property of the assembled set.
- **A swing extreme enough to leave the corridor**, carrying a ship onto another
  split — as something a player chooses to fit, not something that happens to
  them.
- **The window should learn what the ship can afford.** Early on a shop of four
  cheap parts is the right shop; by the last phase it is a shop of nothing worth
  buying. The draw should lean toward pricier components as a ship's slots grow,
  so the offers keep pace with the build. Deliberately not built with the window
  itself: two new economies tuned against each other at once means that when the
  balance moves, nothing says which one moved it — and this repo has the
  measurements to prove that matters.
- **Rivals should draw from a window too.** They still shop the whole catalogue,
  so the balance harness compares policies that can buy anything against a
  player who cannot. Until that closes, no shop measurement is a measurement of
  the shop the player is actually using. It is also the first change with a real
  chance of denting engine-spam, which has survived four tuning passes: a policy
  that must be *offered* a cheap engine cannot buy one every heat.
