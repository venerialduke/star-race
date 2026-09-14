# Backlog

One item per agent session, written as an acceptance test. Pick the top
unblocked item, work in a branch, open a PR.

The design is `design/catalogue/framework.md`; `DESIGN.md` is what is built so
far and grows one stage at a time. The 2026 vertical slice is finished — its
last commit is `543ac1e`, and its code sits in `legacy/` until someone deletes
it — and this backlog builds the framework from a clean slate.

**The order is deliberate.** S1 is the bet the game rests on and it is cheap to
test. If a ship swinging wide is not interesting to watch and plan against,
nothing further down the list saves it.

## S1 — the swing

**S1 is done when:** a ship flies an authored loop on a phone, you can see it
swing wide when it carries too much speed into a bend, and switching between
Lift, Carry and Charge visibly changes the race.

### S1.1 Scaffold and the loop — **done**

Vite, TypeScript, ESLint with the `src/sim` purity rule, Vitest, CI, Pages.
`src/sim/rng.ts` (seeded), `src/sim/tuning.ts`, `src/sim/track.ts` walking
pieces into a centreline, `src/sim/race.ts` with the tick loop and the swing,
canvas rendering, and the controls.
Done when: the Pages URL shows the ship flying the loop, and the same seed
replays identically.

### S1.2 Make the swing feel like something — **done**

The pass where the arithmetic became a moment, and where the two findings from
S1.1 were answered.

**The wide penalty now scales with how far out the ship is thrown.** Clipping
the edge costs almost nothing; being thrown right out is expensive. That is
what fixed Thrust dominance: under the old flat penalty the worst swing cost
the same as the mildest, so speed was always worth it. On the Kestrel Loop a
reckless build now laps 30.4s against a balanced build's 28.0s, where before it
lapped 23.95s against 28.63s.

**Three tracks, and no strategy wins on all of them** — which was the second
finding's real answer. A ship slow enough for every bend has no corner
decision, so the fix was a track whose bends are tight enough to ask one:

| Track | Length | Best build and plan | Lap |
| --- | --- | --- | --- |
| Kestrel Loop | 1408 | balanced, Charge | 28.0s |
| Meridian Run | 2370 | reckless, Carry | 39.3s |
| Cinder Coil | 688 | nimble, Charge | 16.9s |

30 seeded laps per cell. Balance is close enough for now, not settled: the
nimble build is still inert on the Kestrel Loop, where nothing it meets is
tight enough to swing it.

**Feel.** A wake behind the ship, the golden path's two edges drawn so crossing
one is an event, marks where the last few bends threw it, and recovery that is
proportional rather than linear — quick at first, fighting the last few units
back to the line.

### S1.3 Sector times and a par

A sector is timed and the loop has a par time per sector, so a run can be read
as faster or slower rather than only watched.
Done when: crossing a checkpoint shows the sector's time against par, and the
lap ends with a total.

## S2 — the heat — **done**

**S2 was done when:** three ships fly the same loop for two laps with a pit
stop between, the tracking bar says who leads on total time, and you can tell
at a glance whether you are winning. All four items are merged.

- **S2.1 Three ships.** `src/sim/field.ts` steps three entrants in lockstep,
  each with its own state and its own seeded draws. A test holds the line that
  matters: changing the player's plan does not move a rival's time by a tick.
- **S2.2 Bots.** `src/sim/bot.ts` reads the track's **tightness** and tilts its
  build toward Handling or Thrust, then wanders off that on a seeded draw, and
  picks a plan to suit its own build. It re-picks every lap. On the Meridian
  Run bots build for Thrust; on the Cinder Coil they build for Handling.
- **S2.3 Two laps and the pit stop.** The clock never resets; the pit stop
  halts everyone, restarts them level from a standstill, and is where the plan
  may change.
- **S2.4 The tracking bar.** A lane per ship: place, progress round the lap,
  and the gap on total time — totals instead of gaps once everyone is in.

**What the numbers say.** 40 seeded heats per cell, player at Thrust 1 /
Handling 1 against two bots:

| Track | Lift | Carry | Charge |
| --- | --- | --- | --- |
| Kestrel Loop | 0% | 13% | 45% |
| Meridian Run | 0% | 0% | 0% |
| Cinder Coil | 0% | 33% | 33% |

The Meridian column is the interesting one, and it is not a dead track: the
bots build for Thrust there because that is what the track rewards, and a
balanced ship simply cannot go with them. Move the player's Thrust to 1.3 and
the win rate goes to 63%; to 1.55 and Carry wins 75%. Reading the track and
building for it is the game, and the bots do it too.

Lift never wins a heat on any track. That is honest — it is the safe plan, and
safety is currently worth nothing because there is no damage and nothing to
protect. It should become a real choice when run health arrives.

## S3 — the ship, and the shop — **done**

**S3 was done when:** the player starts with a budget and a stocked shop, fits
components into four slots, and a fitted build visibly changes how the ship
takes bends. All four items are merged.

- **S3.1 Stats and components.** `src/sim/ship.ts` holds the components and
  `resolveBuild(fitted) → stats`. The catalogue's arrows become numbers here,
  which is what the build stage is for.
- **S3.2 Slots and the shop as an inventory.** `src/sim/garage.ts`: buy, hold
  unfitted, fit, remove, sell, upgrade. Four slots to start, +1 for finishing.
- **S3.3 Upgrades.** Three levels per component, and a level 3 that takes a
  second slot — refused unless the slot is free.
- **S3.4 The board.** The panel between heats: credits, slots, what the build
  adds up to, and the shop.

**Only three of the catalogue's eighteen components are stocked**, and the
board says why the rest are not: shields need damage, navigation needs splits,
weapons need something to hit, collection needs an economy. The catalogue is
ahead of the simulation, which is the right way round — but it means S3 is a
shop with three engines in it, and it will not feel like a build until S4 and
S6 give the other categories something to do.

**What the numbers say.** 30 seeded heats per build, best corner plan, against
two bots that build for the track:

| Build (affordable at the start) | Kestrel | Meridian | Cinder |
| --- | --- | --- | --- |
| 2× balanced — 1.08/1.00 | **77%** | 7% | 33% |
| 2× speed + balanced — 1.43/0.69 | 30% | **73%** | 27% |
| 2× handling + balanced — 0.85/1.35 | 0% | 0% | **67%** |

Three tracks, three different right answers, none of them dominant. The first
pass had handling builds losing everywhere, because the base ship was slow
enough that spending on Handling left nothing to go with; `BASE_THRUST` went
from 0.70 to 0.78 and the handling engine's thrust penalty halved.

## S3.5 — shields and crew, and the systems that make them real — **done**

Asked for directly: the shop needed more than engines. Both categories needed a
system first, and both systems are in the framework already.

- **Damage.** The ground off the path hurts, once per excursion. Shields soak
  it, hull is underneath, and a ship with no hull is out of the heat.
- **Gravity.** Cornering load and engine effort wear the crew; endurance
  resists; a spent crew loses a third of the ship's handling.

Eight new components: general shields at three levels, and four crews —
engineers, androids, scientists, nanites. Bots now **shop in the same garage**,
with the same budget and slots, so a rival is a build rather than a pair of
numbers.

**What the numbers say.** Over 24 seeded heats per cell:

- **Crew pay on the Cinder Coil and nowhere else.** There a crew is worth about
  four seconds a lap — no crew at all leaves you spent by mid-race, and Charge
  demands a better crew than Carry does. On the Meridian Run the bends are too
  open to tire anyone.
- **A low-handling build on the tight track is now genuinely dangerous**: five
  or six heats in twenty-four end with the hull gone. On the open tracks it is
  nearly free.

**Two things that did not work, left honest rather than tuned away:**

- **Shields never win a heat.** They cost a slot, and a slot is worth more as
  an engine, because being lost is rare and the hull resets every heat. Shields
  should start paying when hull becomes **run health** across a whole run —
  which is what S5 is for, and what the framework always said hull was.
- **Lift still wins nothing.** Damage was the obvious candidate to rescue it
  and did not: Lift survives, but it is so slow it loses on time anyway.

## S3.6 — damage breaks things, and the crew fixes them — **done**

Dictated: damage should cost the ship its effectiveness for the rest of the
race, break one or more components depending on how big the hit was, be
repaired by the crew as you fly at a rate that differs by crew, and be put
right entirely between races.

That replaces the hull pool. There is no hull: a hit past the shields breaks
the **frame** or a **component**, each carries its own **condition**, and a
part in poor condition gives proportionally less of whatever it gives. The
frame gives way more slowly than a component, so a ship with parts fitted
spreads its damage instead of taking it all in one place.

**It does the balancing job it was asked to do.** 24 seeded heats a cell:

| Meridian Run, a speed build | Carry | Charge |
| --- | --- | --- |
| three engines, no crew | 58% | 50% |
| two engines + nanites | **75%** | 58% |
| two engines + shields | **75%** | 54% |

Giving up an engine for a crew or a shield is now worth about seventeen points
of win rate on the track a speed build belongs on. On the Cinder Coil a crew is
worth a similar amount to a balanced build — 42/50% against 25/25% without one.
Before this, shields and crew never paid for their slot at all.

**Lift still wins nothing**, on any track, with any build. Damage was the
second thing tried on it and it did not work either: over two laps the
degradation never compounds enough to beat what Lift gives away in speed. The
plan probably needs either longer races or something of its own.

## S3.7 — one idea instead of three — **done**

Dictated: now that damage is about what a component is still worth, hull and
frame are not carrying anything, and every ship should finish regardless.

Removed: the hull pool, the frame's own condition, and the **lost** state. A
hit past the shields breaks fitted parts and nothing else, and a heat always
ends with three ships across the line. Three concepts became one.

**It did not cost the balance anything — damage bites harder, if anything**,
because every hit now lands on a part rather than sometimes on a frame that
shrugged most of it off. 24 seeded heats a cell:

| | Kestrel | Meridian | Cinder |
| --- | --- | --- | --- |
| speed ×3, no crew — ship left | 52% | 96% | **30%** |
| speed ×2 + nanites — ship left | 97% | 98% | 80% |
| Meridian win rate, no crew → nanites | | 63% → **75%** | |
| Cinder win rate, balanced → + nanites | | | 25% → **42/50%** |

**A ship with nothing fitted cannot be damaged**, since there is nothing to
break. That is a degenerate case rather than a strategy: an empty ship is far
too slow to win anything.

## S4 — the route

**S4 is done when:** a sector offers more than one way through it, the player's
navigation decides how much of that they can see and choose, and a big enough
swing throws the ship into a split it did not plan.

- **S4.1 Splits.** A sector with several paths that all end at the next
  checkpoint.
- **S4.2 Navigation.** The three levels in the framework: choose at more
  splits, see the unseen and plan the whole heat, re-plan at a pit stop.
- **S4.3 Swung into the wrong split.** The bend at a fork, and the swing that
  decides it.

## S5 — the season

**S5 is done when:** a run is several heats with a cut at the end of a phase,
and the standings are worth protecting.

- **S5.1 The purse and points.** Finish order, and the margin bonus.
- **S5.2 Credits, interest and the shop between heats.**
- **S5.3 Phases, groups and the cut.**
- **S5.4 The pacing lap**, paid against par rather than against anyone.

## S6 — interaction

**S6 is done when:** what another ship bought changes your race.

- **S6.1 Abilities**, firing automatically on proximity, track conditions or
  the moment — and the placed kind, for abilities that are specifically placed.
- **S6.2 Weapons**: missiles, gravity mines, the tractor beam. Displacement,
  not contact.
- **S6.3 Fixtures**: bought and placed before a heat, shown to the heat — and
  the ability-made kind that appears mid-race.
- **S6.4 Collection**: dark matter as inventory, salvage from a shield that
  keeps what hits it.

## Not scheduled

**Real players.** The destination, and the reason for the third rule in
`DESIGN.md`. Nothing above blocks it; it is a project of its own.

**A closer view of the terrain.** Parked in the brief: the top-down view is
functional, and the systems matter more until they are proven.
