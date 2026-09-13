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

## S2 — the heat

**S2 is done when:** three ships fly the same loop for two laps with a pit stop
between, the tracking bar says who leads on total time, and you can tell at a
glance whether you are winning.

### S2.1 Three ships

`src/sim/field.ts`: three entrants stepped in lockstep through one race, each
with its own state and its own seeded draws, no contact. Produces a finishing
order on total time.

### S2.2 Bots

`src/sim/bot.ts`: a rule that picks a corner plan and a build, with seeded
variation, so the two rivals are opponents rather than metronomes. Every
decision enters the race as an input made before the tick that consumes it —
the seam a real player will arrive through.

### S2.3 Two laps and the pit stop

The clock never resets; the pit stop halts all three ships, restarts them
level, and is where the corner plan may change. A run between pit stops is
about thirty seconds.

### S2.4 The tracking bar

Total time across every sector, drawn as the bar the framework describes, on a
phone.

## S3 — the ship, and the shop

**S3 is done when:** the player starts with a budget and a stocked shop, fits
components into four slots, and a fitted build visibly changes how the ship
takes bends.

- **S3.1 Stats and components.** `ship.ts`: the stats in `DESIGN.md`, and
  `resolveBuild(components) → stats`. Start with the plain end of
  `design/catalogue/ship-parts.md`: one engine of each kind, one shield, one
  nav, one crew.
- **S3.2 Slots and the shop as an inventory.** Buy, hold unfitted, fit, remove,
  sell. Four slots to start, +1 for finishing a race.
- **S3.3 Upgrades.** Levels on a fitted component, and a level 3 that takes a
  second slot.
- **S3.4 The board.** The pre-heat screen: fit, set the corner plan, start.

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
