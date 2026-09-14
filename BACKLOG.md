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

## S3.8 — the segment, and two screens — **done**

Dictated: the unit of compute is whatever section of the track falls between
decision points; playback and decisions become separate screens; anything
bought during playback waits for the next decision point.

**`src/sim/segment.ts`.** `recordSegment` steps the field to the next decision
point up front and keeps the film — one small frame per ship per tick, holding
only what the screen needs. `main.ts` then moves a cursor through it. Nothing is
simulated while the player watches. The claim that makes this safe is that it
changes nothing, and the test says so: a recorded segment has the same phase,
the same lap ticks and the same standings as one stepped live.

**Two screens**, swappable mid-lap, with the tracking bar on both. The player's
entrant is rebuilt from the garage in exactly one place — `nextSegment` — which
is what makes a mid-playback purchase land on the next lap and not this one.
Damage follows a part by the id it was bought under (`Fitted.uid`), so
refitting a part does not launder its damage off.

**The one thing this broke, and the fix.** A bar reading `standings(segment.end)`
announces the result over the race being shown — during lap 1 it read _+9.78_
when the ships were still nose to tail. `orderAt` now reads the film at the
cursor: placed by banked time plus ticks run, gap to the leader measured as how
long ago the leader was where you are. Past the line each ship sits frozen at
whatever overshoot its last tick left, so the road stops comparing there and
finished ships are separated by their times instead. The test is that cutting
the film off at the cursor changes no answer.

**Worth knowing for S4 and S5:** on the Kestrel Loop with seed `segment`, a
Charge runs **third the whole lap — 28 ticks down at half distance — and wins by
one tick at the line**. That is the bet paying off, and it is invisible unless
the bar tracks the road rather than the result. It is also an argument for the
sector times in S1.3: the lap total hides where it was won.

## S4 — the route — **done**

All three items are in. A sector offers more than one way through it, navigation
decides how much of that you may plan, and a swing big enough to put you off the
path takes the fork away from you.

**A split is one number.** A lateral bulge on the sector's own line, measured
toward the inside of whatever its bends are doing — positive hugs the inside of
every bend (shorter, tighter), negative runs the outside of every one (longer,
opens up). Its length, its bends and where it is drawn all come out of that.
Canonical distance stays on the main line, so laps and standings never have to
know which way anyone went; a short line simply buys canonical distance faster.

**What the route is worth**, best readable line against the golden path, 24
seeds, tuned on 8 others so the check is honest:

| | Kestrel | Meridian | Cinder |
| --- | --- | --- | --- |
| handling 0.7 — Nav 0 → 2 | −9 → **−9** | −17 → **−51** | −0 → **+71** |
| handling 1.0 — Nav 0 → 2 | −4 → **−48** | −8 → **−38** | −12 → **−12** |
| handling 1.4 — Nav 0 → 2 | −3 → **−47** | −16 → **−52** | −18 → **−30** |

Ticks a lap; minus is faster. **Navigation is worth 0.6–0.9s a lap, and only to
a ship with handling to spare.** On the Kestrel it is worth nothing at all below
handling 1.0 — the lines it unlocks are the tight ones, and a ship that cannot
hold them is better off on the golden path. That is the gate working.

**Three things worth the next session's attention.**

- **Nav 2 does not reliably beat Nav 1.** On the Meridian the dark split is the
  outer arc, which is never faster — its worth is that it opens the bends, and a
  one-lap clock cannot see safety. On the Cinder the dark split came out +71 at
  handling 0.7 on the check seeds having looked good on the tuning seeds. The
  dark grade is meant to be the best grade and on one track of three it is not.
- **Measuring a split carries seed noise.** Changing route changes which seeded
  stream the bends draw from, so the same split is lucky on one seed and unlucky
  on another — around ±30 ticks at 10 seeds. Anything measured about routes
  needs 24 seeds or it is measuring the draw.
- **A navigation system does not fit a full build at the starting budget.** Two
  engines, a shield and a crew is already 94–120c against 100. Nav competes
  directly with the shield or the crew rather than joining them, which is the
  right tension, but it means nav is untested alongside a competitive build.

**The Cinder Coil barely wants splits.** Half the track is bends, so any line off
the golden path pays more in length than it wins in speed; three rounds of
tuning could not make its inside lines better than neutral. Its splits are now
a handling gamble (inside) plus one dark wide line that is worth 60 ticks to a
ship with **no** handling and costs 49 to one with plenty — an inversion, and
the most interesting thing on that track.

## S4.4 — the route in a season

Not scheduled. What S4 leaves for later: junctions that open as the loop grows,
sectors spliced in from a season seed holding the darkest splits, and augments
that add a split or a whole sector. All of it is in the framework; none of it
means anything until S5 gives the season somewhere to keep it.

## V1 — the chase camera — **done**

Dictated: follow the ship in third person, from behind and above; see the track
and nearby rivals the way a racing game does; parallax space behind it; the old
track view demoted to a mini-map. Art quality explicitly left for later — the
question was whether the view feels right.

**It is a pinhole camera over a flat plane**, in `src/render/camera.ts`. The
world the simulation knows is already flat, so the only new dimension is the
one the camera adds by sitting above it. No 3D library, no dependency, and the
simulation neither knows nor cares: the same `ShipView` feeds both views, and
three tracks raced end to end gave lap times identical to the frame before the
camera existed.

**There is no ground and no sky** — the track is a ribbon in the void, and the
starfield wraps all the way round. That fell out of a mistake: the first version
painted a sky gradient above a ground plane, and the pale wedges either side of
the road looked like a desert. Space is better and simpler.

**Parallax is three layers**: stars at no distance at all (they turn, never
slide), bodies at 2,600–9,000 units, dust at 260–900. A background whose layers
all move together says nothing about moving.

**Four things that were wrong and are worth remembering.**

- Quads made seams. Painting the road as a strip of quads put a visible
  diagonal scar at every join, because neighbours were filled at slightly
  different distances. Each surface is now one polygon with a gradient down the
  screen; the fade is anchored to the ship's own patch of track, not to the
  canvas, or the road only reaches full colour off the bottom of the screen.
- Ships were drawn four times too big and hid the rivals right behind them. A
  ship is 2 units of half-size against an 18-unit road, which is about as big as
  one can honestly be with three of them abreast.
- Splits and wakes were both cyan, so an alternate line and a line a ship left
  behind were the same thing on screen. Splits are green now, in both views.
- The chase view drew the track's name at its own top-left, which landed inside
  the mini-map when it was the small one. Named once, at canvas level.

**Left for the art pass:** ships are darts, checkpoints are two thin posts, and
there is no sense of the ship banking into a bend. Frame cost is 16.7ms median
at 420×900 with 520 stars, so there is room.

## V1.1 — the camera stops shaking — **done**

Reported: a little shake in the chase camera. Two causes, neither of them the
camera.

**The track is sampled every 3 units and a ship covers 0.85 in a tick.** So a
snapped lookup held the ship still for three ticks and then moved it the whole
3 units at once, and a snapped heading turned 0 radians twice and then 0.043 in
one go. A camera following that staircase shakes. `placeSmooth` interpolates
between samples and lives **alongside** `sampleOn` rather than replacing it: a
bend's radius is a fact about the bend and must not be averaged across its edge,
so the tick loop still reads the snapped one.

**The film is one frame per tick and the screen refreshes on its own schedule.**
Some display frames advanced the ship a whole tick, some none. The leftover time
is now spent rather than dropped — `frameBetween` blends the two neighbouring
frames. Position blends; whether a ship is wide and which way it went at a fork
do not, because half of either is not a thing.

Two smaller fixes fell out of it. Route headings came from a forward difference,
so every heading lagged its own sample by half a step; they are central
differences now. And a route's endpoint headings are taken from the main line
exactly, rather than estimated one-sidedly from the route's own points — every
route of a sector leaves and arrives on the checkpoint with the lateral profile
flat there, so it genuinely is tangent, and saying so exactly is what stops a
ship flicking as it crosses into the next sector's route. Without that the
Cinder Coil still turned 0.119 rad in a tick where its tightest bend allows
0.033.

**Measured, before and after**, as the per-frame change in one scanline of the
canvas — how much the drawn scene jumps between frames:

| | median | 90th | worst |
| --- | --- | --- | --- |
| before | 1.59 | 3.75 | 11.81 |
| after | **0.17** | **0.28** | **2.66** |

The camera's easing is also a time now rather than a share per frame, which it
should have been from the start: a share per frame gives a 120Hz screen a
camera twice as tight as a 60Hz one.

**Nine lap times across three tracks and three corner plans are identical before
and after**, which is the check that says a drawing fix stayed a drawing fix.
`tests/sim/smooth.test.ts` pins all of it.

## V1.2 — splits become forks, and the track gets edges — **done**

Two asks. Splits were, visually, small deviations from one road; they should be
a fork with two genuinely separate paths. And a swing could be too wide, so
there should be a drivable width with something at the edge of it.

**A split is a fork now.** The bulges went from 6–20 units to 35–70 against a
path 18 across, which puts the two roads out of each other's corridors: they
meet at the checkpoints and nowhere in between. Three things had to change to
let them grow that far.

- **The bulge no longer follows the turn.** Following it was right for a racing
  line and nonsense for a fork: a big one weaving in and out of an S-bend came
  out 93% longer than the road beside it. A split leaves the path, runs one way,
  and comes back.
- **A split reads its own bends off its own curve.** "The same bend moved
  sideways" stops being true at this distance — offset a 42-radius bend by 60
  and the arithmetic returns a negative radius. The golden path still keeps the
  bends the track authored; deriving those from curvature was tried in S4 and it
  turned an r42 hairpin into r60.
- **The fan-out is gentle** — 40% of the sector at each end, up from 22%. Moving
  50 units sideways in a short run is a tighter corner than anything the track
  authors, and at 22% the fork itself was the hardest bend on the Kestrel.

**The corridor.** A ship can now be thrown about three path-widths either side
and no further. It was needed: on the Cinder Coil a low-handling ship charging
its hairpins wanted to go **128 units** off the line, seven times the width of
the path. A capable ship never touches the wall at all — measured across three
tracks, three plans and twelve seeds, handling 1.5 finds it 0.0–0.3 times a lap
while handling 0.6 finds it up to 4.5.

The position is capped and the cost is not: damage was already charged on how
far the swing *wanted* to go, and the wall scrubs speed the same way. **Once per
contact, not per tick** — per tick was a death spiral that could not finish a
lap, which is the same lesson damage learned in S3.6.

**A latent bug the new geometry exposed.** On a bend, Carry and Lift never
accelerated: they only ever scrubbed speed *down* toward the limit. It never
showed because every route began on a straight. The moment a split's fan-out
counted as a bend at distance 0, a ship sat at a standstill forever.

**What the splits are worth now**, best readable route against the golden path,
24 fresh seeds, tuned on 8 others:

| | Kestrel | Meridian | Cinder |
| --- | --- | --- | --- |
| handling 0.7 — Nav 0 → 2 | 0 → **0** | −10 → **−151** | 0 → **−132** |
| handling 1.0 — Nav 0 → 2 | 0 → **−25** | 0 → **−115** | 0 → **−80** |
| handling 1.4 — Nav 0 → 2 | 0 → **−25** | −2 → **−119** | 0 → **−51** |

Each track now has its own answer to what the route is for. **The Kestrel gates
on handling**: its splits are shorter, tighter lines that cost a weak ship a
second a lap and pay a strong one, so navigation buys nothing at handling 0.7
and 25 ticks above it. **The Meridian is the navigation track** — its bends
barely bind, so cutting inside one is nearly free and the good lines are simply
behind a system, worth 1 to 2.5 seconds a lap. **The Coil is hostile to
leaving the line at all**: its wide lines are an inversion, cheap to a slow ship
and dear to a quick one, and its one real prize needs the best system to see.

**Two findings worth keeping.**

- **A sector that is three-quarters straight has no fork worth taking.** Kestrel
  sector 2 was measured at five bulges and three handlings and not one was ever
  better than going straight. It has no split now, and that is the honest answer
  rather than a decoy.
- **An outside line only pays where the bend actually binds.** On the Meridian a
  stock ship takes its r85 sweepers at almost top speed, so opening them up buys
  nothing and costs 7–11% in length. Every wide line on that track is a safety
  option, and a one-lap clock cannot see safety.

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
functional, and the systems matter more until they are proven. _Done — the
chase camera landed in V1, and the loop from above is the mini-map._

**Tracks that snap together.** A tool the owner uses to design and build
tracks, and — later — sections players add themselves. What that needs is a
catalogue of sector shapes where **any sector snaps onto any other and the
circuit still closes**.

It is worth writing down now what stands in the way, because it is not the
tool. A track today is one authored piece list walked into a loop, and
`loopFromHalf` refuses a half that does not sweep exactly 180°: **closure is a
global constraint on the whole list.** That is the opposite of snapping. For
sections to click together each has to carry its own entry and exit pose, and
closure has to become a property of an assembled set — something the tool
checks, or something the catalogue guarantees by construction — rather than a
rule the author obeys by hand.

The route work already pushes the same way: a sector owns its routes, and every
route of a sector leaves and arrives on its checkpoint. That is most of a snap
joint already. What is missing is that the sectors themselves are still cut out
of one continuous walk rather than being things with ends.

**More reasons for a split than the clock.** S4 balanced every split on lap
time because lap time was the only thing measurable, which made every wide
line a trap — the Meridian's are 26 to 48 ticks slower with no upside a one-lap
measurement can see. A split should also be worth taking because it holds
resources, or because it is safer, or be a genuinely bad route whose whole job
is to make a navigation system worth its slot.

**The blocker is not the split, it is the golden path.** A safer line is worth
nothing while the golden path is free: damage today comes only from being
thrown off it, so there is no danger on it to buy safety from. Hazards that sit
*on* the track have to land before "safer" is a reason to go anywhere.
