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

## What is built

**S1 — the swing**, **S2 — the heat**, and **S3 — the ship and the shop**.
Three ships fly one of three authored loops for two laps, with a pit stop
between them. The player fits components into slots on a board between heats,
picks the track and the corner plan, and races; the rivals are bots that read
the track and choose for themselves. The stats are no longer sliders — they are
what a build adds up to. There is a starting budget but no income yet.

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
| --- | --- | --- | --- |
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

**Wide** is where the cost lands. A ship whose offset exceeds
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

**Charge** adds `CHARGE_EXCESS_BONUS` to the excess before the draw, because it
is still accelerating when the bend arrives. **Lift** brakes to the holding
speed and draws nothing.

## What the player sees

The loop from above, the golden path as a bright ribbon with its two edges
drawn — the lines the ship is thrown across, so crossing one reads as an event.
The ship trails a wake, which is what speed looks like from above, and its
lateral offset is drawn as the thing it is: a ship pushed off the line, tethered
back to where it should be. The last few bends leave marks where they threw it,
fading as they fall behind.

Three ships fly it, each in its own colour, each nudged into its own drawing
lane so they do not sit on top of each other — a drawing trick only: the
simulation has no lanes and no ship can touch another. The player's ship is
drawn brightest and on top, and only the player's bends leave marks.

The **tracking bar** is the thing that says who is winning: a lane per ship with
its place, how far round the lap it is, and what it is giving away on total
time. At a pit stop and at the finish it shows totals instead of gaps.

Between heats the panel is **the board**: credits, slots used, what the build
adds up to, what is fitted, what is on the shelf, and the shop. Three buttons
for the track, three for the corner plan, and a seed box — because the same
seed must produce the same heat, and being able to prove that by eye is the
point.

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

**Standings** while a lap is running are projected: a ship's total so far, plus
this lap's ticks, plus what it would take to close the gap to the furthest ship
at its current pace. When everyone is in, the projection is just the total.

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
