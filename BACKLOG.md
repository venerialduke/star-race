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

| Track        | Length | Best build and plan | Lap   |
| ------------ | ------ | ------------------- | ----- |
| Kestrel Loop | 1408   | balanced, Charge    | 28.0s |
| Meridian Run | 2370   | reckless, Carry     | 39.3s |
| Cinder Coil  | 688    | nimble, Charge      | 16.9s |

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

| Track        | Lift | Carry | Charge |
| ------------ | ---- | ----- | ------ |
| Kestrel Loop | 0%   | 13%   | 45%    |
| Meridian Run | 0%   | 0%    | 0%     |
| Cinder Coil  | 0%   | 33%   | 33%    |

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

| Build (affordable at the start)    | Kestrel | Meridian | Cinder  |
| ---------------------------------- | ------- | -------- | ------- |
| 2× balanced — 1.08/1.00            | **77%** | 7%       | 33%     |
| 2× speed + balanced — 1.43/0.69    | 30%     | **73%**  | 27%     |
| 2× handling + balanced — 0.85/1.35 | 0%      | 0%       | **67%** |

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

| Meridian Run, a speed build | Carry   | Charge |
| --------------------------- | ------- | ------ |
| three engines, no crew      | 58%     | 50%    |
| two engines + nanites       | **75%** | 58%    |
| two engines + shields       | **75%** | 54%    |

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

|                                       | Kestrel | Meridian      | Cinder           |
| ------------------------------------- | ------- | ------------- | ---------------- |
| speed ×3, no crew — ship left         | 52%     | 96%           | **30%**          |
| speed ×2 + nanites — ship left        | 97%     | 98%           | 80%              |
| Meridian win rate, no crew → nanites  |         | 63% → **75%** |                  |
| Cinder win rate, balanced → + nanites |         |               | 25% → **42/50%** |

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

|                          | Kestrel      | Meridian      | Cinder        |
| ------------------------ | ------------ | ------------- | ------------- |
| handling 0.7 — Nav 0 → 2 | −9 → **−9**  | −17 → **−51** | −0 → **+71**  |
| handling 1.0 — Nav 0 → 2 | −4 → **−48** | −8 → **−38**  | −12 → **−12** |
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

|        | median   | 90th     | worst    |
| ------ | -------- | -------- | -------- |
| before | 1.59     | 3.75     | 11.81    |
| after  | **0.17** | **0.28** | **2.66** |

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
far the swing _wanted_ to go, and the wall scrubs speed the same way. **Once per
contact, not per tick** — per tick was a death spiral that could not finish a
lap, which is the same lesson damage learned in S3.6.

**A latent bug the new geometry exposed.** On a bend, Carry and Lift never
accelerated: they only ever scrubbed speed _down_ toward the limit. It never
showed because every route began on a straight. The moment a split's fan-out
counted as a bend at distance 0, a ship sat at a standstill forever.

**What the splits are worth now**, best readable route against the golden path,
24 fresh seeds, tuned on 8 others:

|                          | Kestrel     | Meridian       | Cinder       |
| ------------------------ | ----------- | -------------- | ------------ |
| handling 0.7 — Nav 0 → 2 | 0 → **0**   | −10 → **−151** | 0 → **−132** |
| handling 1.0 — Nav 0 → 2 | 0 → **−25** | 0 → **−115**   | 0 → **−80**  |
| handling 1.4 — Nav 0 → 2 | 0 → **−25** | −2 → **−119**  | 0 → **−51**  |

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

## S5 — the season — **done**

**S5 was done when:** a run is several heats with a cut at the end of a phase,
and the standings are worth protecting.

- **S5.1 The purse and points.** Finish order, and the margin bonus. — done
- **S5.2 Credits, interest and the shop between heats.** — done
- **S5.3 Phases, groups and the cut.** — done
- **S5.4 The pacing lap**, paid against par rather than against anyone. — done

Nine racers, three phases of three heats, a group of three cut at the end of
each — so the last phase is one group racing each other for the season. Every
heat the field is drawn into groups and every group races; the player's is drawn
first and watched, the rest are the same simulation resolved with nobody
watching. What carries is the garage. `DESIGN.md` has the rules.

**A season is a value the seed decides.** `newSeason`, `nextUp`, `settleHeat`,
`applyCut` — nothing mutates, and `nextUp` says what is due rather than doing
it, so the caller either watches a heat or resolves it. That seam is what let
the difficulty be measured at all: the same functions run the season headless.

**How hard it is.** A player who shops exactly as well as a rival and paces 6%
over par, 24 seeds:

|                    |             |
| ------------------ | ----------- |
| survived both cuts | **13 / 24** |
| won the season     | **5 / 24**  |

Winning one season in five off bot-quality shopping is about right for a floor —
it leaves the player room to be better without needing to be good.

**But the two cuts are not the same cut.** Every elimination in those 24 seeds
happened at the _second_ phase; the player survived the first in **24 of 24**,
going into it ranked between 1st and 6th of 9 and never once in the bottom
three. So the first cut is theatre and the second is the whole filter. The
likely reason is the pacing lap: it pays the player credits no rival gets, one
heat before anyone has won anything, and the table breaks ties on credits. That
is a thing to measure against a real player before touching — a floor that never
eliminates on the opening phase may be the right feel for the opening phase —
but it should not be mistaken for a cut that bites.

**Two findings worth keeping.**

- **Slots stop being the constraint, and then stats do.** A slot per finish puts
  the player on 13 by the last heat where they started on the opening budget's
  worth, and in **24 of 24 seeds handling finished pinned at `STAT_MAX`**. Late
  in a season there is nothing left to decide with the credits: the shop is
  answering a question that has already been answered. Either the cap has to
  move, the slots have to stop coming, or — better — the late-season purse needs
  something to buy that is not a stat. S6's weapons and fixtures are the obvious
  candidate; it is worth re-measuring this after them rather than tuning now.
- **The margin bonus is doing its job and is cheap to overpay.** A third on the
  winner's tail scores about twice a beaten third. At `MARGIN_POINTS` 3 against a
  10/6/3 table that is worth roughly half a place, which is enough to keep a lost
  heat live without letting a good loss beat a bad win. Raising it past 4 would
  make third-and-close outscore second-and-distant, which is a different game.

**One rule the browser found.** Being cut ends the run. The season is still a
well-formed value afterwards and the rivals could go on racing each other, but
the player was being offered heats they were not in. `nextUp` answers `over` for
a cut player now, and `playerIsOut` is what the UI reads.

## S6 — interaction — **done**

**S6 was done when:** what another ship bought changes your race.

- **S6.1 Abilities**, firing automatically on proximity, track conditions or
  the moment. — done
- **S6.2 Weapons**: missiles, gravity mines, the tractor beam. Displacement,
  not contact. — done
- **S6.3 Fixtures**: placed before a heat and shown to the heat, and the
  ability-made kind that appears mid-race. — done
- **S6.4 Collection**: dark matter as inventory, salvage from a shield that
  keeps what hits it. — done

`DESIGN.md` has the rules. The seam is `src/sim/world.ts`, and the one rule that
makes interaction safe to have is that **nothing lands on the tick it was
fired**: every ship reads a world built from the state before the tick, and what
it sends out arrives on the tick after. So no ship's move can depend on where
another got to this tick, and the order the ships sit in the array cannot change
the race. It is the rule the sim already ran on — a decision is an input, fixed
before the tick that consumes it — applied to ships instead of players.

**Two bugs the probes found and the reading did not.**

- **A thing on the road bit every tick a ship was near it**, which nearly doubled
  a lap time. This is the third time: damage learned it in S3.6, the corridor
  wall learned it in V1.2, and this layer made it again. A fixture bites once per
  ship per lap now. If a fourth thing ever lands on a ship over several ticks,
  assume it has this bug until a test says otherwise.
- **Three abilities never fired at all.** The mine reused the missile's range,
  which is zero without a rack; and the three-bend chain counted bends only on
  the current route, so on a track of short sectors the ability a whole engine is
  built around never fired once. Both were invisible until a probe counted
  firings — nothing crashed, nothing looked wrong, the parts simply did nothing.

**Two more the measurement found**, which is why the measurement is worth the
time it costs:

- **`clearAhead` read a hairpin as clear road.** The samples are 3 units apart,
  so a ship one sample into a bend still reads `radius 0`; and `nextBendOn` only
  returns bends that _start_ at or after the ship, so the bend it is standing in
  was skipped. A ship 20 units into a 94-unit hairpin was told it had 174 units
  of straight and boosted into the corner. On the Cinder Coil — longest straight
  80 units, against a `BOOST_WANTS_CLEAR` of 150 — that was **every boost it ever
  fired**. `nextBendOn` itself was left alone on purpose: `lookAhead` uses it for
  braking, and changing it would move lap times that are pinned for other
  reasons.
- **A full collector shield never depleted.** A capture cost no shielding, so a
  shield that started full stayed full and captured every weapon for the rest of
  the race — free immunity, and 127–189 credits a heat against a 70-credit first
  place and a 100-credit starting ship. Collecting was quietly a better living
  than racing. A capture now loads the shield, so the next one has to wait for
  the recharge.

**Six constants moved on the numbers**, all with the measurement in the comment:
`SALVAGE_PER_POWER` 0.9 → 0.2, `CHARGE_PER_TICK` 0.0042 → 0.0018,
`PERFECT_BENDS` 3 → 2, `PUSH_PER_POWER` 0.55 → 0.3, `TRACTOR_SCRUB` roughly
doubled, `BOOST_TICKS` 70 → 180. A new `CHARGE_FROM_REGEN` halves how much a
crew's shield-regeneration rating also speeds up abilities: the catalogue does
say Engineers do both, but at the full multiplier they silently doubled or
tripled every ability in the game.

**What the tuning fixed, measured after the fact.**

- **The chain's variance is back.** On the Cinder Coil the chain-on build ran a
  standard deviation of 0.0 over 72 races — one distinct finishing time in
  seventy-two. It now runs sd 122 against a chain-off control of sd 144, fires
  1.28 times a lap rather than 3.00, and is worth 197 ticks rather than 520. The
  loop that does it is the right one: being thrown wide costs charge, so a ship
  that needs the chain most can least afford it.
- **Boost fires honestly.** Zero firings into a bend on all three tracks, against
  63% / 32% / 100% before, and none at all on the Cinder Coil, whose longest
  straight is 80 units against a requirement of 150. Worth +18 ticks a heat on
  the Kestrel and +124 on the Meridian, against +7 and +77.
- **Charge is a resource.** A build with no ability to spend it on idles at full
  charge 81% of its ticks on the Kestrel and 9% on the Cinder Coil, against 94%
  and 92% before. On the Coil, where a ship is off the path three-quarters of the
  lap, it now barely fills at all.
- **The collector is a bonus, not an immunity.** 33 credits a heat on the Kestrel
  and the Meridian and 7 on the Coil, against a 26-credit third place and a
  70-credit win — and it is no longer faster, no longer wins more, and no longer
  takes less damage than plain shields of the same level.

**One regression the re-measurement caught in the tuning itself.** Cutting the
charge rate and the push at once multiplied: weapons fired a third as often and
each landing hit moved a ship half as far, so output fell about sixfold and every
weapon became worse than leaving the slot empty. `MISSILE_POWER` and `MINE_POWER`
were raised to pay it back on the axis that does not bring back the
one-hit-to-the-wall problem — a bigger power beats the shields that were eating
them whole, where a bigger push per point would not. Two cuts to one output is
the mistake to remember; neither looked like much on its own.

**The finding that S6 does not fix, and the next milestone has to.**

**A second engine beats every weapon, in every slot, on every track.** After the
power raise a weapon is roughly a wash against an empty slot — within 20 to 60
ticks either way over a two-lap heat — and a balanced engine in the same slot is
worth 435 to 1675 ticks of margin. The best a weapon was ever measured doing to
the rest of the field is about 20 ticks.

**Raising the numbers further will not fix it, and that is the point.** A push
big enough to compete with a permanent stat is a push that takes an unshielded
ship from the centreline to the wall in one hit — which is the thing the corridor
work in V1.2 existed to stop. A displacement weapon costs its target a line and a
few dozen ticks of recovery; an engine gives its owner eighteen per cent more top
speed for the whole race. Those are not the same size of thing and no constant in
`tuning.ts` makes them one.

So this is not really an S6 number. **Thrust has dominated since S3**, and
interaction is the first system measured against it and so the first to show it.
One thing to check before anything is repriced: weapons only ever target the ship
_ahead_, so they are a rubber band, and an earlier round of this measurement had
them raising win rate while costing clock. That did not survive the retune — they
now cost both — but the season pays by place and the cut is on points, so the
measurement that decides this is seasons won, not ticks gained, and it has still
never been run. That is S7.1, and it comes first for a reason.

**The first build was correct and invisible.** Played rather than measured, the
whole layer read as nothing: ships were bounced by nobody in particular, and
there was no sign a charge existed, let alone that it was being spent. The sim
was right and the screen said none of it. What fixed it was naming the cause — a
charge meter, a shot drawn going somewhere, a flash where it lands, and a state
line that says _whose_ mine that was. Worth remembering before the next system
lands: a mechanic the player cannot attribute to a decision they made is a
mechanic they do not have.

**Smaller things left standing**, recorded rather than fixed:

- **The tractor beam may want rewriting rather than retuning.** Doubling its
  scrub makes it roughly break even; it still has no job that the missile and the
  mine do not do better.
- **Collector shields are useless at L1–L2 and the whole part at L3.** Capture is
  the only reason to own one. A part with nothing at its first two levels is a
  shape worth avoiding next time something is added to the shop.
- **The longest pin in the game is now made by a boost, not by a weapon.** A
  180-tick boost holds a ship above its own top speed into bends, so it swings
  wider: the dark-boost field's worst spell on the corridor wall went from 97 to
  127 ticks on average and 555 at its worst, the longest anywhere in a
  3,888-race sweep. Its laps got faster too, so it is the trade the game is
  built on — but the pin problem is not closed just because the missiles were
  cut.
- **Damage is a non-event in a two-lap heat**: mean integrity loss 0.000–0.034.
  Shields' real job in S6 is stopping pushes, not soaking damage. Either heats
  get longer or `HAZARD_DAMAGE` matters more than it does.
- **Augments** — a player adding a split or a whole sector — are not in S6 and
  are still blocked on the same thing as the track tool, under "Not scheduled".

## S7 — the shop is a real choice

**S7 is done when:** two builds that spend the same credits differently both win
seasons, and neither is "buy engines".

- **S7.1 Measure in seasons, not ticks.** — **done**. `npm run balance`. Re-run
  after the flight model, 2026-09-22: `nav` wins 69 seasons in 72. See the
  bottom of this file.
- **S7.2 The engine ladder.** — **half done**: the level curve and stacking are
  fixed, the cap is not. See below.
- **S7.3 Give the tractor beam a job.** — **done, and it did not help much**.
- **S7.4 Levels 1 and 2 of the collector shield.** — **done, and it did not help
  at all**. Both below.

### S7.1 — the harness

`scripts/balance.ts` runs whole seasons where every racer follows a **policy** —
a build they are shopping toward — and reports how often each survives the cuts
and wins. `settleHeat` takes a `Shopper` so rivals are not hardcoded bots, which
is what lets policies race each other rather than race bots. A heat-clock
measurement cannot answer what the shop asks, because the season pays by place
and the cut is on points.

**It told two lies before it told the truth, and both looked like tables.**
Buying the first affordable thing each heat ended every policy with eleven
engines bolted on and washed out the differences it existed to measure. Giving
each policy three parts had them finish shopping by heat three and bank three
hundred credits while the degenerate build kept buying — it was reading "stopped
shopping" and reporting "spent differently". Both are recorded in the script's
header. A harness is a thing to be suspicious of in exactly the way a result is.

**It is slow**: a 72-season, 12-policy run is about fifteen minutes. 24 seasons
is a couple of minutes and is enough for a direction, not for a ranking — the
standard error on a win count at 24 is about 2.3, so the 9/8/7 top three in the
first run were one number.

### S7.2 — what was wrong, and what is still wrong

**Fixed: a level is now worth more than a copy.** Only engines and shields add up
at all, and in those two the arithmetic said buy another — 106 credits bought a
level 3 balanced engine for +0.30, or three level 1s for +0.45. Every level now
adds at least what its own first level did, and each further copy of the same
component is worth 60% of the last. `DESIGN.md` has the rule.

**Not fixed: bolting on cheap engines is still the best build in the game.**
Over 72 seasons with every policy racing the others:

| policy          | seasons won |     | policy          | seasons won |
| --------------- | ----------- | --- | --------------- | ----------- |
| **engine-spam** | **25 / 72** |     | speed           | 6           |
| handling        | 17          |     | collector       | 6           |
| nav             | 15          |     | shields         | 6           |
| engines         | 8           |     | dark            | 3           |
| bot             | 7           |     | mines           | 1           |
|                 |             |     | armed · tractor | 0           |

An even share of twelve policies is 6. So spam is four times its share, and two
of the top three are engine builds — the bar S7 set is not met.

**Why the falloff did not finish the job.** Two numbers explain it.

- **The headroom is tiny.** `STAT_MAX` is 1.6 against a base thrust of 0.78 and
  a base handling of 0.7, so there is 0.82 and 0.90 of room. Eleven cheap engines
  plus a maxed one clear it even at a 60% falloff: handling lands on 1.59 against
  a cap of 1.60. Steepening the falloff barely moves that — 0.40 gives 1.47, and
  0.25 gives 1.42 — because a geometric series converges and the cap is close.
- **The balanced engine has no downside.** Every other part in the shop trades
  something: the speed engine gives up grip, the handling engine gives up thrust,
  a weapon gives up thrust, a deep part gives up a slot. A balanced engine at
  +0.15/+0.15 costs only credits, and slots arrive free at one a race. So
  stacking generalists is never a trade, and a ship of twelve reaches **both**
  caps where a two-part specialist build reaches one: spam finishes on thrust
  1.60 / handling 1.59, against 1.28 / 1.60 for a maxed handling engine beside a
  maxed balanced one.

**The remaining choice is the owner's**, because every version of it changes how
the game feels rather than what a part costs:

1. **Raise `STAT_MAX`.** S5 already found handling pinned at the cap in 24 of 24
   seasons, so the top of the ladder is flat and the ships that reach it stop
   differing. Room above it is what lets a deep specialist beat a wide generalist
   at its own stat. It also makes every ship faster and every bend quicker, and
   the tracks were authored against the current range.
2. **Make fitting a part cost something.** Mass is the obvious candidate and the
   framework gestures at it — gravity "acts on the crew _and_ on the ship" — but
   it is a new rule, not a number, and it is not in `DESIGN.md`.
3. **Fall off per category rather than per component**, for engines only. Cheap
   to try and it needs no new rule, but it contradicts "a category may be fitted
   more than once" and it would also weaken the honest two-engine builds.

None of the three is a tuning pass, which is why none of them is in this one.
The owner chose to leave it and take S7.3 and S7.4 instead.

### S7.3 and S7.4 — two parts that now have a reason to exist, and still lose

Both had the same thing wrong: nothing to do. A tractor beam took speed off the
ship ahead, which is not a reason to fit one over a missile. A collector shield
needed level 3 _and_ full shields to keep anything, so its first two levels
collected nothing and were strictly worse than plain shielding.

Both are fixed as designs. **A tether pulls both ways**, so holding the ship
ahead back now tows the ship holding it — the only weapon that helps its owner
rather than only hurting somebody. **A collector keeps a piece of every weapon
that lands**, more of it the deeper the part, with the whole-weapon capture still
reserved for level 3 at full shields.

Neither made its build competitive, and the numbers say so plainly. Seventy-two
seasons, every policy racing the others, before and after:

| policy      | before | after  |     | policy        | before | after     |
| ----------- | ------ | ------ | --- | ------------- | ------ | --------- |
| engine-spam | 25     | **21** |     | shields       | 6      | 8         |
| handling    | 17     | **21** |     | speed         | 6      | 7         |
| **dark**    | 3      | **16** |     | collector     | 6      | **7**     |
| nav         | 15     | 12     |     | bot           | 7      | 7         |
| engines     | 8      | 9      |     | **tractor**   | 0      | **2**     |
|             |        |        |     | armed · mines | 0 · 1  | **0 · 0** |

- **The tether moved the tractor beam from 0 to 2 of 72.** That is about one
  standard error. It is a better part and it is still near the bottom.
- **Collecting at every level moved the collector from 6 to 7.** That is nothing.
  The income is real and it does not buy enough to change a season.
- **The thing that actually moved was neither.** `dark` went from 3 to 16, and
  that was the _level curve_ — the dark matter engine was added in S6 and never
  repriced, so it still had the old diminishing ladder. The shop test caught it;
  no one would have found it by playing. Repricing one mediocre part was worth
  five times what redesigning two parts was.

**The lesson worth keeping: "has a reason to exist" is not "is worth buying".**
Both parts are better designed than they were and neither is competitive, because
the problem was never that they had no job — it was that a slot spent on a stat
pays every tick of every lap and a slot spent on a weapon pays a few dozen ticks
a heat. That gap is the same one S6 measured on the clock, and it is untouched.

**Weapons win nothing, now measured three ways**: on the heat clock in S6, over
seasons against bots, and over seasons against other policies. `armed` and
`mines` won 0 of 72 each. Nothing in `tuning.ts` fixes this — a push big enough
to compete with a permanent stat is the one-hit-to-the-wall problem the corridor
work exists to stop — so it belongs with the three rule changes above rather than
with another tuning pass.

### The opening track moved the table, and it was the shape that did it

Measured after pinning every season's first heat to the Proving Ground and
reshaping that track so its golden path crosses itself (PR #72). Seventy-two
seasons a policy, **same seeds on both sides** — `scripts/balance.ts` seeds
seasons 0..n, so `main` and the branch raced identical seasons and the only
variable was the change. Standard error on a win count at 72 is about 2.3.

| policy       | before | after  |     | policy    | before | after |
| ------------ | ------ | ------ | --- | --------- | ------ | ----- |
| **handling** | 21     | **31** |     | collector | 12     | 10    |
| **dark**     | 23     | **14** |     | speed     | 5      | 6     |
| engine-spam  | 23     | 23     |     | tractor   | 5      | 5     |
| engines      | 14     | 18     |     | armed     | 3      | 4     |
| shields      | 9      | 12     |     | mines     | 2      | 2     |
| nav          | 11     | 8      |     | bot       | 5      | 10    |

Handling +10 and dark −9 are both about four standard errors. They are real, and
they survived being found at 24 seasons first — where BACKLOG's own note says a
24-season run is good for a direction and not a ranking, which was exactly right.

**It is the shape, not the pinning.** The obvious reading is that dark lost
because it sees fewer black holes, and that reading is backwards: the Proving
Ground carries the game's only black-hole fixture and a pinned opener means the
field races it **more**, not less. Nine heats drawn from four tracks is 2.25
Proving Ground heats a season; one pinned plus eight drawn is 3.

What moved is how much of that track is bend:

|                                                   | old   | new       |
| ------------------------------------------------- | ----- | --------- |
| lap                                               | 1081  | 1252      |
| of it bend                                        | 33%   | **43%**   |
| a thrust build's pace advantage over a grip build | 22.0% | **17.7%** |

So the one track every season is guaranteed to race got substantially kinder to
grip. `handling` is the policy that buys grip and it gained; `dark` spends two of
its four slots on dark-matter gear and buys no handling part at all, so it is on
the wrong side of the same change — and the extra dark matter it harvests does
not pay for the extra bend it is now slow through.

**What this is worth knowing for.** A track is content, and this is a measurement
of how much content moves balance: one heat in nine, reshaped, moved two policies
by 4σ while leaving `engine-spam` on exactly 23. The standing problem is immune
to level data, which is another way of saying the three rule changes above are
still the only things that touch it. It also means **the next tuning pass has to
state which tracks it was measured on**, because the answer now depends on that
more than it did.

### The engine cap beat engine-spam, and replaced it with a monoculture

One engine per ship, levels bought in copies, slots bought in progress.
Seventy-two seasons a policy, harness fixed twice along the way (see below).

| policy          | before | after  |     | policy       | before | after |
| --------------- | ------ | ------ | --- | ------------ | ------ | ----- |
| engines         | 18     | **37** |     | mines        | 7      | 5     |
| collector       | 16     | **37** |     | dark         | 24     | **2** |
| shields         | 18     | 33     |     | armed        | 2      | 1     |
| nav             | 9      | 18     |     | **speed**    | 6      | **0** |
| tractor         | 5      | 9      |     | **handling** | 37     | **0** |
| **engine-spam** | 22     | **7**  |     | bot          | 7      | 0     |

**The degenerate build is finished.** Engine-spam fell from 22 to 7 of 72,
survives 18 seasons in 72 against 63 for the leaders, and ends a season as a
bare `balanced3` holding 281 credits it cannot spend. Four tuning passes failed
at this and one rule did it, because the problem was never the price: a balanced
engine trades nothing, and no price bites on a part whose only cost is credits.
A limit is not a price.

_Superseded on 2026-09-22 — see "Navigation is the new engine-spam" below.
Re-measured after the flight model, `nav` wins 69 of 72 and the spread in this
table is gone. What survives it: `speed` and `handling` still win nothing._

**And it created a new one.** `balanced3` now leads nine of the twelve builds,
and every policy built on a specialist engine is at the bottom — `handling` and
`speed` won 0 of 72 each. Measured directly, one maxed engine plus a maxed crew
and shield, mean lap over four tracks and three corner plans:

| the one engine | thrust | handling | mean lap    |
| -------------- | ------ | -------- | ----------- |
| **balanced**   | 1.30   | 1.22     | **1624**    |
| dark matter    | 1.48   | 0.78     | 1803 (+11%) |
| speed          | 1.58   | 0.58     | 1967 (+21%) |
| handling       | 0.76   | 1.52     | 2343 (+44%) |

The specialists were never balanced to be flown alone. They were balanced as
_one half of a pair_: `handling3 + balanced3` reached thrust 1.28 and handling
1.60, which is what made a grip build viable, and that ship is illegal now. A
handling engine on its own leaves a ship at thrust 0.76 — **below the 0.78 it
would have with no engine at all**.

So this is the same root cause BACKLOG already named, wearing a new symptom. "A
balanced engine costs only credits" used to mean _stack them_; now it means
_fit the only one that does not cost you something_.

**What would fix it is a tuning pass, not another rule**, and it is the owner's
call because it changes what a specialist is for:

- A specialist should not push the other stat **below base**. Trading less
  growth is a trade; trading away the floor is a trap.
- A specialist should **beat the balanced engine on its own stat by more than it
  does**, so that a track whose demands are lopsided has an answer that a
  generalist cannot match. Today balanced is within 0.10 of handling's own stat
  while being 0.54 better on the other.

**The harness lied twice more before this table was trustworthy**, which makes
four times in total and is worth the space:

- No policy called `buyProgress`, so when slots stopped arriving free, every
  policy simply hoarded. Engine-spam ended a season on 473 credits.
- Four policies name two engines in their want list. The buy succeeded, the fit
  silently failed, the part sat on the shelf and the credits were gone — every
  heat, forever, because the want was never met. `handling` finished on two
  parts and 0 of 72, which looked exactly like a policy that had been beaten.

Both are fixed. The pattern never varies: **a policy that has stopped spending,
or is spending on nothing, reads exactly like a policy that is simply worse.**
Any rule change that touches what a garage can do needs the harness read
alongside it, not after it.

### The racing line is a constant, and that is why navigation is not a stat

The owner fitted a speed build with no navigation system, rarely left the path,
and said it felt wrong. It is, and the cause is deeper than the tuning.

**Measured: the optimum does not move.** Lap-time optimal entry speed, as a
multiple of the bend's holding speed, over 18 shapes crossed with three ships —
`npm run optimal` and the sweep behind it:

|                              | grippy 1.0/1.5 | balanced 1.3/1.2 | fast 1.6/0.9  |
| ---------------------------- | -------------- | ---------------- | ------------- |
| r30, any sweep, any straight | 1.45 (+0%)     | 1.45–1.55        | **1.45–1.50** |
| r55, any sweep, any straight | 1.10 (+0%)     | 1.45–1.50        | **1.45–1.50** |
| r90, any sweep, any straight | 0.90 (+0%)     | 1.25 (+0%)       | **1.45–1.50** |

The fast ship wants 1.45 to 1.50 in **all eighteen** cases. Radius does not move
it, sweep does not move it, and the straight in front of the bend does not move
it. The grippy and balanced rows that read lower are ties — `+0%` is the cost of
being 0.3 off, and where it is zero the aim does not matter at all, because the
ship cannot reach the bend's limit in the first place.

So the closed form was not a simplification that lost the variation. **There is
no variation.** The game has one right answer everywhere.

**Why, structurally.** Three things, and none of them is a tuning number:

- **Aim is a multiple of the holding speed**, and holding speed already contains
  the radius and the handling. Expressing the target that way normalises away
  exactly the two variables that should have moved it.
- **The straight has no path into the swing at all.** Nothing in the swing
  formula knows how far it is to the next bend, or how far it has been since the
  last one.
- **A bend forgives whatever came before it.** `swingTarget = -bend.turn * swing`
  is an _absolute_ target: a ship arriving twenty units wide has its offset
  discarded and the bend starts it fresh from the centre. Arriving badly costs
  nothing at the next bend.

That third one is the load-bearing one. It is why a sequence of bends is not
harder than one bend, and why a short straight is not harder than a long one.

**What a navigation system is worth today**: 0% where the ship cannot reach the
limit, up to 19% for a fast ship on a tight short shape. Real, but it is
precision against a fixed number rather than judgement about a situation — and a
fixed number is nothing to be good at.

**Candidate fixes, in the order I would try them.** Each is a rule change:

1. **Make the swing compound.** `swingTarget = offset - bend.turn * swing`,
   clamped to the corridor. Arriving wide then makes the next bend worse, so a
   short straight punishes over-driving and handling matters for the _optimum_
   rather than only for the recovery. A run of bends becomes a compounding risk,
   which is also the most watchable thing on this list.
2. **Reward the exit.** Speed out of a bend scales with how near the path the
   ship was through it, so carrying too much in costs the straight that follows.
   This is the tradeoff real racing is built on and the sim has no version of it.
3. **Let the approach matter.** Braking distance is already computed; a longer
   straight could allow a later, harder brake and so a higher entry. Today the
   ship simply hits its target whenever there is room.

Until one of these lands, a computed plan is a computed constant, and a
navigation system can only add noise around it.

**And the S7 bar is not met.** "Two builds that spend the same credits
differently both win seasons, and neither is buy engines": the top five are
engine-spam, handling, dark, nav and engines. Every one of them is led by an
engine. The non-engine ideas — weapons, collection, shields — are the whole
bottom half.

### The racing line is a shape now — four mechanisms, and a table

_Resolved, 2026-09-21._ All three candidate fixes above landed, plus a fourth
that turned out to be the load-bearing one. `npm run table` prints the result.

**What shipped:**

1. **The swing compounds.** `swingTarget = offset * SWING_COMPOUND - turn * swing`.
   Arriving wide makes the next bend worse. Deliberately _not_ clamped to the
   corridor: clamping caps `exposure`, which reads `swingTarget`, and would make
   a huge swing exactly as cheap as one that merely reaches the wall. The
   per-tick offset clamp already stops it running away.
2. **The exit is rewarded.** `EXIT_BONUS` — on leaving a bend, speed gains
   `(1 - worst/PATH_HALF_WIDTH) * EXIT_BONUS` of itself. Carrying too much in
   costs the straight that follows. Needs `bendWorst` on `RaceState`.
3. **The approach matters.** `BRAKE_PER_HANDLING` — braking force scales with
   handling, so a grippy ship brakes later and a long straight is worth more to
   it than to a loose one.
4. **The swing knows the geometry** (this one is beyond the three that were
   asked for). `spread` was `SWING_SPREAD * excess^EXP` with _no radius in it_ —
   a hairpin and a sweeper threw a ship the same distance for the same relative
   excess. Now `* (SWING_REFERENCE_RADIUS / radius)^SWING_TIGHTNESS`, and
   `safeAim` inverts the same formula so the closed form still means what it says.

**Measured: mechanisms 1–3 alone barely moved anything.** The optimum stayed in
1.40–1.55, which is where it already was. Putting radius into the swing is what
unlocked the variation — the table below is with all four.

**The table** (`npm run table`, 5 seeds a point, 4 radii × 3 straights ×
3 sweeps × 4 ships). Entry speed as a multiple of holding speed; `(+N%)` is the
cost of being 0.3 out on the cheaper side; `+0%` means the ship cannot reach the
bend's limit so the aim is moot.

- **Radius is the dominant axis:** 1.30–1.35 at r26 rising to 1.50–1.65 at r110.
- **The approach moves it:** r70/60°/fast reads 1.45 / 1.50 / 1.55 as the
  straight in front goes 60 / 200 / 400.
- **`safeAim` tracks it closely** — 1.33 / 1.40 / 1.48 / 1.57 against radius —
  and sits a little under, on purpose: the table is the _fastest_ line and the
  fastest line accepts leaving the path sometimes.
- **Where the aim matters at all, the optimum spans 1.25 to 1.65**, and being
  0.3 out costs 6–19%.

**Two consequences, both for the next session:**

- **The Kestrel's three splits are now strictly worse than the golden path at
  every handling.** They were tuned against a swing with no radius term and the
  term made every one of them a losing line. Re-tune them against the new
  geometry, or replace them.
- **Only Meridian sector 2 still discriminates — and it discriminates harder
  than anything before**: `[0,0,1,0]` is **+221 ticks for a low-handling ship
  and −52 for a grippy one**, a 273-tick swing. `tests/sim/route.test.ts` moved
  its split test here from the Kestrel needle for that reason.
- **Every balance number in this file is stale.** The 72-season harness has not
  run since the swing changed shape, and nav may now be over- or under-powered
  in the shop. Re-run `npm run balance` before trusting any S7 conclusion above.

## The feel lab — driving as physics instead of a dice roll

_Opened 2026-09-21, and this is where the next session should start._

The owner's verdict on the four-mechanism swing: **"the feel is off"**. In
particular: the penalty for going wide is too strong, navigation is invisible,
a high-level balanced engine looks like it would not want navigation at all,
and — the one that matters most —

> the visual of racing. It seems like we're either going max speed or way slow.
> No in between. We want a sense of acceleration, braking, etc. The same ship,
> going the same speed into a curve, but with better handling should deviate
> less.

That last sentence is a specification, and the swing model cannot meet it. A
swing is drawn once at the bend's entry from `SWING_SPREAD · excess^EXP ·
tightness`; handling reaches it only through `holdingSpeed`, which the aim is
quoted as a multiple of, so it cancels. **Nothing a ship does between turn-in
and the exit changes where it ends up.** No amount of tuning fixes that.

`lab.html` (`npm run dev`, or `/star-race/preview/<pr>/lab.html`) is the other
route: one straight, one bend, one straight, and a ship you drive yourself with
thrust, brake and steering. Nothing scores. **Going wide costs nothing at all**,
on purpose — the lab is about what the ship does, not what it costs.

### The model

`src/lab/flight.ts`, pure and with no randomness at all, not even seeded. One
relation carries it:

```
a bend of radius r throws a ship outward at  v² / r
a ship answers with at most                  grip
so flat out through the bend is              v = sqrt(grip · r)
```

which is the game's `holdingSpeed` exactly — the lab runs at the game's scale,
so what is learned here transfers. What is new is `yaw`: how far the ship points
away from where the road goes. The ship's nose turns at `lateral acceleration /
speed`, the road's heading turns at `curvature × speed`, and yaw is the
difference. A ship with yaw is going sideways and **keeps going sideways until
something turns it back**, so correcting a line costs room and time.

### What it already shows

**1. Handling now does what the owner said it should.** Held at one speed
through one bend (r55, 90°), driver steering exactly what the bend asks:

| handling | holds at | 42/s  | 48/s | 54/s | 60/s   |
| -------- | -------- | ----- | ---- | ---- | ------ |
| 0.7      | 33/s     | 97    | 264  | 278  | 285    |
| 1.0      | 39/s     | **8** | 75   | 225  | 267    |
| 1.3      | 45/s     | **8** | 10   | 79   | 209    |
| 1.6      | 50/s     | **8** | 10   | 12   | 95     |
| 2.0      | 56/s     | **8** | 10   | 11   | **14** |

Units off the line; the path is 9 either side. Read a column: same bend, same
speed, only handling changes, and it is the difference between on the road and
twenty path-widths off it. `npm run feel` prints this.

**2. Anticipation is what a navigation system buys.** The clearest finding in
the lab. Two drivers, same ship, same speed, same target line — one reads the
road one steering-lag ahead, the other reads it underfoot:

| bend | anticipating | reacting    |
| ---- | ------------ | ----------- |
| r26  | 0.4 – 1.0    | 17.4 – 22.8 |
| r45  | 0.5 – 0.8    | 14.5 – 16.9 |
| r70  | 0.6 – 0.8    | 13.7 – 18.0 |
| r110 | 0.5 – 0.7    | 14.3 – 22.0 |

The anticipating one holds the line on every ship and every bend; the reacting
one is off it on all sixteen. And the lead that does it is not fitted — it is
`1 / STEER_RATE`, the steering's own time constant, and the measurement finds
that value at every rate tried (11 ticks at rate 0.09, ~20 at 0.05, ~29 at
0.035). **At the limit there is no lock left over to correct with**, so the
moment is not recoverable afterwards. That is a reason for a component to exist
that "precision against a fixed number" never was.

**3. The bang-bang was two bugs, not one.** Speed was only ever flat out or
crawling because acceleration was a flat rate; a taper (`accel · (1 - v/top)`)
plus a throttle that eases rather than switches gives a real profile. Then the
same fault turned up in the _steering_: a key is on or off, and a ship that
goes from straight to full lock in half a second cannot be placed on a line
either. The fix is to keep the two apart — `STEER_RATE` is the ship's lag and
`KEY_STEER_ON` is the pilot's. Slowing the ship's own steering to make the
keyboard feel better costs a perfect driver the line: best achievable goes from
1.4 units off at 0.09 to 7.5 at 0.05 to 14.6 at 0.035, whatever it anticipates.

### Navigation is a rating from 0 to 100, and it is a lever in the lab

_Added 2026-09-21._ The ghost now has a **Navigation** slider. At 100 it is the
reference line exactly, with no randomness in it at all; below that the _same
driver_ is worse informed in three ways, each something a pilot would plausibly
be bad at rather than a number bolted onto the outcome:

- **how far ahead it reads the road** — `GHOST_LEAD × skill`, deterministic,
  and the measured big lever;
- **where it thinks the line is** — a slow wander, `NAV_WANDER_LINE` half-widths;
- **how fast it thinks it can go** — a slow wander, `NAV_WANDER_PACE` of its ceiling.

Both wanders are slow on purpose (`WANDER_SETTLE` = 0.02, a time constant of
fifty ticks). Fast jitter is filtered out by the ship's own steering lag and
changes almost nothing, and it reads as a twitch rather than as misjudgement.
Bad driving is being in the wrong place and late to notice.

The filter is normalised to unit variance. Without that it shrinks its own input
by about seventeen times at this settle rate, and every amplitude constant means
something other than what it says.

**Measured** (`npm run feel`, r55/90°, handling 1.2, 60 runs a row):

| nav | worst off: median | 90th | ticks | left the path |
| --- | ----------------- | ---- | ----- | ------------- |
| 0   | 13.1              | 30.5 | 896   | 87%           |
| 25  | 9.6               | 26.7 | 866   | 57%           |
| 55  | 5.5               | 17.3 | 835   | 15%           |
| 85  | 1.8               | 3.7  | 820   | 0%            |
| 100 | 0.6               | 0.6  | 817   | 0%            |

Smooth and monotone on both measures, and about 10% on the clock end to end.
**The 90th column is the interesting one**: a low rating is not reliably
mediocre, it is a _range_. Being badly navigated is mostly about the bad days,
which is a much better thing to sell a component against than an average.

Each run draws a fresh seed, so pressing `R` a few times shows the spread rather
than one lucky attempt.

### A shove you place, and a recovery worth the name

_Added 2026-09-21, after playtesting the rating._ Four things, all from the
same session's feedback: 0 and 50 felt alike, correcting back to the line was
too lazy, it was unclear whether perfect navigation could recover at all, and
there was no way to make it try.

**The shove.** `Shape.bump` is a sideways velocity applied at a point on the
course — tap the road in the lab to place it, or use the sliders. It is a
_crossing_, not a proximity, so a fast ship cannot step over it and a stopped
one cannot sit in it. Both the player and the ghost hit it. It is what turned
"can it recover?" from a guess into a measurement.

**Recovery, rebuilt around two rules.** The gains are about ten times what they
were, which is only safe because of these:

1. **The bend is served first.** The correction may only have the lock the
   feed-forward is not using, plus `RECOVER_OVERDRAW`. Without this rule a
   stiff correction fights the feed-forward and the ship simply leaves the
   corner: shoved before turn-in, the same gains give 6.8 units off with the
   rule and **60.7 without it**.
2. **When there is no lock spare, slow down.** If getting back needs `fix` of
   the lock, the bend may only have `1 - fix`, so the ship must be down to
   `sqrt(grip · (1 - fix) / curvature)`. This was the missing piece: with rule 1
   alone, a shove mid-bend went from 5.6 units off to 19.9, because at the limit
   there is nothing to allocate. Lifting fixes it (19.9 → 8.0).

Net against the old controller: **back on the line in 142 ticks instead of
245**, a tighter clean lap (0.63 units off instead of 0.90), the same width
after a shove, for 1.5% on the clock.

**And this is where the cost of an excursion comes from.** Nothing in the lab
punishes going wide. It is slow anyway, because getting back spends the grip
the corner was using. A penalty that falls out of the physics beats one that is
invented, and it means the game may not need `WIDE_SPEED_FLOOR` and its
friends at all.

**The rating, reshaped.** A straight line through all three failings made 0 and
50 feel alike; simply making the bottom worse made 0 and 25 feel alike instead.
What separates them is failing **differently**:

- anticipation comes back fast (`skill ^ 0.6`), so 50 already looks broadly
  competent;
- the wobble in where it thinks the line is fades about evenly (`^1.3`), and its
  amplitude is now _smaller_ than before;
- misjudging its own pace is concentrated at the very bottom (`^3.0`), so a ship
  with no navigation does not wobble more, it arrives at corners hopelessly
  wrong and blows them.

| nav | median off | 90th | ticks | left the path |
| --- | ---------- | ---- | ----- | ------------- |
| 0   | 22.4       | 33.5 | 1226  | 100%          |
| 25  | 16.1       | 28.2 | 1073  | 100%          |
| 55  | 8.7        | 10.6 | 1038  | 40%           |
| 85  | 1.6        | 2.1  | 861   | 0%            |
| 100 | 0.4        | 0.4  | 831   | 0%            |

0 against 50 is now 22.4 units against ~10, and 48% longer against 25%.

### Bumpers, and the overshoot that was making recovery look violent

_Added 2026-09-21._ The owner, on the recovery rebuilt an hour earlier: _"it
seems pretty aggressive when we get off course. I'm envisioning something like
invisible bumpers that kinda push us back toward the track."_

**The diagnosis was not what the word suggested.** Tracing the offset through a
recovery showed the ship was not being _forceful_, it was **oscillating**:

```
0 → 8 → 14 → 16 → 14 → 9 → 1 → -4 → -6 → -7   (and back again)
```

It swung clean past the centre and out the other side. The tuning pass that
caused it scored _"ticks until back within one unit of the line"_ — a metric
that rewards a fast first crossing and says **nothing at all** about what
happens after it. A controller can score perfectly on it while ringing like a
bell. Scored on overshoot instead, the answer is the opposite of what the
earlier pass concluded: **halve the pull and raise the damping**. The same
shove now reads

```
0 → 8 → 13 → 9 → 6 → 5 → 4 → 3 → 2
```

|                                | before    | after         |
| ------------------------------ | --------- | ------------- |
| past the centre, the other way | 9.7 units | **0.1**       |
| mean yaw through the recovery  | 0.29      | **0.13**      |
| ticks pinned at the yaw clamp  | 95        | **9**         |
| worst offset after a shove     | 22.6      | **14.0**      |
| clean lap                      | 2453t     | 2506t (+0.6%) |

**And the bumpers, which are what made the gentler gains affordable.**
`Shape.bumpers` is a soft lateral push back toward the road once a ship is
`from` units off centre, easing in over `ramp` and saturating after. It is not a
wall, not a penalty, and not the pilot's doing — the road leans on the ship. The
force is absolute rather than scaled by grip, because it belongs to the road: a
grippy ship should not be shoved back harder than a loose one. With them on, the
worst a shove does falls from 22.6 to 14.0 _despite_ the halved correction.

**They change what the navigation dial can mean, and that is worth knowing.** A
bumper bounds how far _anybody_ gets, so the separation between ratings moves
off the ruler and onto the clock. Re-fitted (`NAV_WANDER_LINE` 0.9 → 1.6,
`NAV_PACE_CURVE` 3.0 → 1.6), measured with bumpers on, which is what the lab
now runs:

| nav | median off | 90th | ticks | left the path |
| --- | ---------- | ---- | ----- | ------------- |
| 0   | 12.3       | 14.0 | 1171  | 100%          |
| 25  | 10.5       | 12.8 | 1067  | 78%           |
| 55  | 5.6        | 8.9  | 978   | 5%            |
| 85  | 1.3        | 2.0  | 843   | 0%            |
| 100 | 0.4        | 0.4  | 834   | 0%            |

The 90th-percentile tail is gone, which was previously the best argument for
owning a navigation system ("it is mostly about the bad days"). That argument
now has to be made on the clock and on the off-path rate instead — 43% longer
and off the path every run at 0, against 17% and one run in twenty at 55.
**Whether that is a better or worse thing to sell a component against is an
open design question, not a settled one.**

`scripts/feel.ts` now builds its shape from the same defaults the lab opens
with, bumpers included, so its tables are the numbers you actually feel.

### Left open, deliberately

- **No penalty of any kind.** Pricing an excursion is the next question, not
  this one, and the owner asked for it out of the way first.
- **Forward and sideways have separate budgets.** No friction circle: braking
  and cornering do not compete. Left out until it is clear the simpler thing is
  not already enough.
- **The ghost holds the centre line, which is not the fastest line.** Measured
  against an out-in-out line that stays legally inside the corridor, the ghost
  gives away 0% to 2.3% — most on a tight bend with a grippy ship, where the
  corridor is widest relative to the radius, and nothing at all on an open
  sweeper where the corner was never the limit. So "navigation 100" means
  _perfectly on the line_, not _fastest possible_. That ~2% is unclaimed
  headroom: either the ghost learns the real racing line, or the gap is
  deliberately where a higher tier of component, or player skill, lives.
- **Nothing in `src/sim` has changed.** The lab is an experiment; the game's
  rules and `DESIGN.md` are untouched by it. If the model earns its way in,
  `src/lab/knobs.ts` folds into `tuning.ts` and `DESIGN.md` changes in that PR.
- **The four-mechanism swing is still what the game runs.** It is not reverted,
  because the lab has not yet replaced it — but if the lab holds up, most of it
  becomes unnecessary rather than wrong: compounding, the exit bonus and the
  radius term all fall out of the physics for free.

## The flight model is the game's model now, and four things it changed

_Landed 2026-09-21._ `src/sim/flight.ts` holds the physics and the pilot;
`race.ts` feeds it a circuit and `src/lab` feeds it one bend. The swing,
`safeAim`/`aimFor`, `config.aim`, the `WIDE_SPEED_*` penalties, `SWING_*`,
`RECOVER_FLOOR`/`RECOVER_PER_HANDLING`, `SIGHT_EXCESS` and `EXIT_BONUS` are all
gone, and `npm run optimal` and `npm run table` with them — they measured a
thing that no longer exists.

**The owner asked for a tuning pass afterwards. These are the four places that
most want it, all measured, none of them touched:**

**1. Laps are two to three times slower for a ship with no navigation.** A
stock `bareShip(1, 1)` has `BASE_NAV` — no navigation system at all — and now
flies like it:

| track          | nav 0 | nav 1 | nav 2 | nav 3 |
| -------------- | ----- | ----- | ----- | ----- |
| Kestrel Loop   | 3535  | 3210  | 2607  | 1996  |
| Meridian Run   | 4149  | 3593  | 3061  | 2656  |
| Cinder Coil    | 2529  | 2358  | 1772  | 1358  |
| Proving Ground | 3152  | 2959  | 2355  | 1779  |

Every track's `par` was authored against the old model and is now only
reachable with a good navigation system. That is arguably correct — it makes
the component matter, which was the whole point — but it is a balance decision
nobody has taken.

_Superseded on 2026-09-22 — see "The misjudgement moved from the line to the
pace" below. The gap is about half as fast again rather than two to three
times, and the steps between the ratings are even. Still nobody's par._

**2. Excursion damage has become rare and mild.** A ship is held near the line
by the bumpers and gets back without flailing, so a shield pool of 22 soaks
every excursion of a nineteen-bend race and regenerates between them; a crew
patches what gets through faster than the next one arrives. Damage now only
reaches a ship flying blind with nothing aboard to absorb or repair. Several
tests had to drop shields and crew to observe it at all.

**3. The corridor is doing no work.** Across every track, engine and handling
the suite flies, the widest any ship gets is ~15 units against a wall at 26.
Nothing touches it. Either the bumpers move out to give the wall something to
do, or the wall is honest scenery — but it should be a decision.

**4. No split that ships is a win any more.** Every one was authored against a
swing, where a tighter line was worth taking if you could hold it. Under
flight, a tighter line is simply a lower holding speed and the ship slows for
it. The Meridian's inside line costs 159 / 74 / 32 ticks at handling 0.7 / 1.2
/ 1.8 — always a cost. The _cost_ still scales with grip, which is what
`route.test.ts` now pins, but the choice is gone until the splits are
re-authored against the road ships actually fly. This is a content job.

Also stale and unmeasured since: the 72-season balance harness, every number
under S7, and where `nav` sits in the shop now that it does two jobs.

## A race takes 30 seconds to watch, whatever it took to fly

_Landed 2026-09-22._ The flight model made laps long: a stock ship flies the
Proving Ground in 4096 ticks, which is 68 seconds of watching, and a heat is
two of them. The film's length is known before the first frame of it is drawn,
so the cursor is now moved at whatever rate fits a whole race into
`VIEW_SECONDS` — `src/ui/playback.ts`, one number. A pacing lap gets the thirty
to itself; a heat gives each lap fifteen. Measured in a browser: 30.1s, then
15.0s and 15.2s.

Nothing slows down. A race already inside its share keeps the speed it was
flown at, so thirty seconds is a ceiling rather than a stretch.

**The cost, and it is a real one: going faster no longer looks faster.** A ship
that flies a lap in 2000 ticks and one that takes 4000 are played back over the
same fifteen seconds, so the improvement the player bought reads on the clock
and in the standings but not in the window. Inside a race nothing is lost —
every ship shares one film, so gaps and overtakes are as they were.

Two things would get it back, neither taken here:

- **Anchor the rate to the track rather than the film.** A lap at par takes the
  viewing length and a slow lap overruns it, which is the honest version — but
  every par is stale (item 1 above), so it wants the tuning pass first.
- **Shorten the race rather than the watching.** 4096 ticks for one lap is the
  flight model's doing, and the pars say the tracks were authored for something
  a third of that.

## The misjudgement moved from the line to the pace

_Landed 2026-09-22._ The owner, on watching a race at the new playback speed:
"the low nav jitters too much, too much random turning. Instead it could do a
little of that, and a little random braking/acceleration. Still sub optimal,
but not as jarring."

It was measurable, and worse than it looked. A ship with no navigation system
believed the line was up to **14 units** out when the path is 9 wide, and sawed
at the steering chasing it: **0.051 of full lock put on or taken off every
tick**, against 0.008 for a maxed system and about 0.025 to take an actual
bend. Twice the steering of driving, spent on nothing.

Four numbers moved, all in `tuning.ts`, plus one new rule in `flight.ts`:

| | was | now |
| --- | --- | --- |
| `NAV_WANDER_LINE` | 1.6 | 0.35 |
| `NAV_WANDER_PACE` | 0.35 | 0.65 |
| `WANDER_SETTLE` | 0.02 | 0.008 |
| `NAV_PACE_CURVE` | 1.6 | 0.7 |
| `PACE_LEAST` | — | 0.5 |

`WANDER_SETTLE` is a consequence of the projector: a misjudgement lasting fifty
ticks was written when a race was watched at the speed it was flown, and a race
is now played into thirty seconds, so the same wander arrived two to three
times faster on screen. It is spent in race ticks, so it is fixed here.

**`PACE_LEAST` is the new rule, and it is not a refinement.** Moving the
misjudgement onto the pace with nothing under it had a ship with no navigation
spending **a sixth of the lap under a quarter of its own average speed, once
for nearly five seconds together** — the "either flat out or way slow, no in
between" the owner complained about two rounds ago, arriving by another door. A
pilot now believes at worst half of its own ceiling. Only the downside is
floored: arriving too hot is the interesting half and bounds itself.

`NAV_PACE_CURVE` is a consequence of the swap. With the pace concentrated at
the very bottom (1.6) and the line no longer carrying the failing, nav 2 flew
within 4% of nav 3 — the top of the stat bought nothing. The two curves swapped
roles because the two failings did.

What it measures out at, over a lap with no navigation system:

| | was | now |
| --- | --- | --- |
| off the line, rms / worst | 6.8 / 14 | 2.1 / 5 |
| steering moved per tick | 0.051 | 0.029 |
| ticks off the power | 23% | 29% |
| longest crawl under a quarter speed | 1.4s | 0.7s |
| lap, Kestrel | 76.5s | 58.7s |

And the ladder is even now — 58.7 / 52.8 / 47.5 / 40.4 on the Kestrel at nav
0 / 1 / 2 / 3, against 76.5 / 66.4 / 56.5 / 40.4 before, where the whole gap
sat between 2 and 3.

### What this cost, and it is the thing to look at next

**An unguided ship no longer leaves the golden path on its own.** Worst off the
line is 5 units against a path of 9, so:

- **Excursion damage is now a handling failure only.** A ship with a big engine
  and no grip is still thrown past the edge on 12 laps in 20, and hurt on 11 in
  20 — but a ship that is merely badly navigated is not. Four tests moved onto
  a fast, loose build because of it, and the damage tests moved from the Cinder
  Coil to the Kestrel: under flight a tight track is a _slow_ one, and what
  damage costs scales with how fast the ship was going when it was thrown.
- **The corridor is doing even less work** than item 3 above says. The wall is
  at 26; nothing a stock ship does reaches 6.
- **`FORK_PULL` is nearly unreachable at 11.** Being carried onto the wrong
  side of a fork was something a big wander did; it now takes a genuine
  excursion.

None of that is tuned away here. If going wide should be a more common event,
the lever is `BUMPER_FROM` — the bumpers start exactly at the path edge, so
they catch a ship the moment it is off it.

### One thing got better on its own

A split is no longer always a cost. On the Meridian's inside line, an unguided
ship pays 100 / 42 / **−7** ticks at handling 0.7 / 1.2 / 1.8 — at the top of
the handling range the tighter line stops costing anything. Flown well it is
still a cost at every grip (108 / 111 / 121), and _rises_ with grip, because
the main line is being flown faster. That is the nearest thing to a split being
worth taking that the game has, and `route.test.ts` now pins it.

## Navigation is the new engine-spam: 69 seasons in 72

_Measured 2026-09-22, on the first `npm run balance` since the flight model._

The harness had not been run since ships started flying differently, so every
number under S7 was from a different game. Re-run over 72 seasons a policy:

| policy          | won        | survived | mean place |
| --------------- | ---------- | -------- | ---------- |
| **nav**         | **69 / 72**| 72 / 72  | **1.04**   |
| tractor         | 4          | 38 / 72  | 3.50       |
| engines         | 3          | 39 / 72  | 3.71       |
| mines           | 3          | 27 / 72  | 4.35       |
| shields         | 3          | 39 / 72  | 3.63       |
| collector       | 2          | 38 / 72  | 3.65       |
| bot             | 2          | 7 / 72   | 6.19       |
| armed           | 1          | 15 / 72  | 5.15       |
| engine-spam     | 0          | 5 / 72   | 6.33       |
| speed           | 0          | **0 / 72** | 8.10     |
| handling        | 0          | **0 / 72** | 7.67     |
| dark            | 0          | 8 / 72   | 5.65       |

Against the last table — engines 37, collector 37, shields 33, nav 18 — the
spread is gone. **One monoculture was replaced by a sharper one**, and it is
the same shape as engine-spam was: not a price that is wrong, but a part whose
value does not trade against anything.

### Ruled out first: this is not the pacing lap

The pacing lap changed in the same session — the harness flies it now instead
of assuming `par * 1.06`, and a policy that buys a navigation system first
flies it best and banks up to `PACING_CAP` before heat one. That is a confound
this session introduced, and this harness has reported a funding difference as
a skill difference four times already.

Control, 24 seasons with the pacing payout flattened to `PACING_BASE` for
every policy, which is what it effectively was before: **nav still wins 21 of
24**, mean place 1.21. The flight model owns this result. The pacing lap is
worth a few points of it at most.

### Why, in one table

Kestrel Loop, mean lap over six seeds, from a bare hull:

|              | no nav | nav 1 | nav 3    |
| ------------ | ------ | ----- | -------- |
| **engine 1** | 3843   | 3360  | **2581** |
| **engine 3** | 2901   | 2670  | 2099     |

Two more levels of engine — six copies of a component — buy **942 ticks**. A
navigation system buys **1262**, and its first level costs 26 credits. The two
are not additive either: with nav 3 fitted, the engine ladder is only worth
482.

"Anticipation is what a navigation system buys" was the right model. The
trouble is that it is now worth more than what the ship is made of.

### What this is really asking, and it is S7's question

`nav` does two jobs: **what routes a ship may plan**, and **how well it is
flown**. The second is worth more than any other part in the game. S7 asks for
two builds that spend the same credits differently and both win, and today
there is one build and the rest are hobbies.

Three directions, none taken here because they are design decisions rather
than tuning:

- **Split the stat.** Route-reading and pilot skill were one number because the
  flight model wanted a rating and this was the rating the game had. They are
  not the same thing and nothing says they must be one component.
- **Cap what it can close.** A navigation system could buy anticipation without
  buying the whole gap — the pilot's three failings fade at different rates
  already, and `NAV_LEAD_CURVE` is the one that matters.
- **Reprice it.** Cheapest to try, least likely to work. Engine-spam took four
  tuning passes and one rule; a part whose only cost is credits does not
  respond to price.

Also still true from the last table, and now measured twice: **`speed` and
`handling` win 0 of 72 and survive 0 of 72.** A specialist engine flown alone
is not a build. That is the Pit Wall's open question — should a specialist beat
the generalist on its own stat, or be a track-specific answer that loses on
average? — and S7 waits on the answer.

### Two instruments were lying

- **The harness faked the pacing lap** as `par * 1.06`, which is over par
  whatever par is, so every policy took `PACING_BASE` and nothing else. Fixed:
  it flies the lap. Five times now, and the shape never varies — a policy that
  cannot earn reads exactly like a policy that is worse.
- **`npm run feel` put the bumpers 81 units out** instead of 9. `BUMPER_FROM`
  became an absolute distance when it moved into `tuning.ts` and this caller
  kept multiplying by the half-width. Every table it printed after that was
  measured on a course with no bumpers, under a comment promising "the numbers
  you feel".

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
_on_ the track have to land before "safer" is a reason to go anywhere.

_Unblocked — stage 5 of the track model landed the mechanism._ A stretch of
road can now be thick, dangerous, hard to read, or worth money, and the track
can carry the author's own mines and holes. What has **not** happened is anybody
using it: the three tracks that ship still say nothing about themselves, so
every split is still balanced on the clock alone and the Meridian's wide lines
are still 26 to 48 ticks of nothing.

That is the next job, and it is a content and balance job rather than an
engineering one. The question to answer with seeded runs, not by eye: **how much
pocket is a wide line worth?** The Meridian's outer arc costs about 30 ticks; at
`POCKET_PER` = 100 units per point, a pocket of 10 over a 400-unit stretch pays
40 salvage. Whether 40 salvage is worth 30 ticks is a season-level question and
`npm run balance` is the thing that answers it. Do not guess it into `track.ts`.

Two smaller things left behind by the same stage:

- ~~**The chase view does not draw environment.**~~ _Done._ Both views draw it
  now, and the chase camera labels each stretch and each fixture by name. The
  shapes are placeholders — a tint, a post, a word — and the art is a separate
  job whenever it is worth doing.
- **Nothing that ships is balanced around any of it.** The Proving Ground exists
  to be looked at, not played: its numbers were picked to be visible, not fair.
  The three real tracks still say nothing about themselves. This is sharper now
  that every season opens on the Proving Ground — an unbalanced track that used
  to turn up a quarter of the time is now guaranteed, and it moved two policies
  by 4σ when its shape changed. See the measurement under S7.
- **A fixture cannot be dragged on the canvas.** The builder places one with
  three sliders (sector, road, how far along), which is enough to author with
  and is not enough to author _comfortably_. Sectors themselves now drag.

**~~Splits could be allowed to cross the circuit now.~~** _Done._ The rule is
now "two roads may cross, they may not be in the same place", measured against
the relief. Figure-eights and crossovers are authorable, and **the Proving Ground
is one**: its golden path crosses itself, which is what put a hill on the line a
player actually flies. Old note, for the reasoning: `tests/sim/section.test.ts`
refuses any shipped track whose split runs within a corridor of another part of
the loop, because "a road that crosses another road is a junction the game has
no rules for". Verticality is what makes that rule narrower than it needs to
be: two roads that cross in the plan view are separated in height, and the sim
never compared positions anyway. Loosening it would open up a whole family of
track shapes — figure-eights, crossovers — that cannot be authored today. Left
alone for now because the four tracks that ship are all plain loops and nothing
is waiting on it; the change is to the _invariant_, not to any code.
