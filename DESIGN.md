# Star Race — design

This document is the source of truth for **the game as built**. If the code and
this document disagree, the document wins and the code is a bug. Any PR that
changes a rule updates this file in the same change.

The wider design — every system the game is heading toward, and the option
tables behind it — lives in `design/catalogue/framework.md` and the catalogue
beside it. This file is narrower on purpose: it says what is built, with the
exact rules, and grows one stage at a time.

**This is a clean-slate build.** The 2026 vertical slice (one track, three
stages, six parts, four hazards) is finished and is tagged `slice-v1` in git.
None of its code carries over. Its _engineering_ conventions do: a pure
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

**S1 — the swing.** One ship, one authored loop, no opponents and no economy.
The ship flies; the player picks the corner plan and moves two sliders; the
swing is visible. Everything below describes S1 exactly.

## The track

A track is a closed **loop** walked out from an ordered list of **pieces**:

| Piece      | What it is                                                        |
| ---------- | ----------------------------------------------------------------- |
| `straight` | a length, in track units                                          |
| `bend`     | a radius and a signed sweep in degrees; the sign is the direction |

Walking the pieces produces the **centreline** — the golden path — as a
polyline, and fixes where every bend starts and ends. Geometry is level data,
not tuning: the shape of a track is content.

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

**Wide** is a state, not a number. A ship whose offset exceeds `PATH_HALF_WIDTH`
has left the golden path, and while it is off the path it moves at
`WIDE_SPEED_PENALTY` of its speed. That is the cost: not damage, time.

**Charge** adds `CHARGE_EXCESS_BONUS` to the excess before the draw, because it
is still accelerating when the bend arrives. **Lift** brakes to the holding
speed and draws nothing.

## What the player sees

The loop from above, the golden path as a bright ribbon, the ship on it, and
the ship's lateral offset drawn as the thing it is — a ship pushed off the
line. Speed, the current sector, lap time, and the last bend's swing. Three
buttons for the corner plan; two sliders for Thrust and Handling; a seed box,
because the same seed must produce the same race and being able to prove it by
eye is the point.

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
