# The Ledger and the Line

## Premise

Three ships fly a loop. One wins. All three get paid.

The purse is the smallest part of what a heat pays out and the only part
guaranteed to be contested. Everything else — the energy on the racing line, the
dark matter outside a corner, the bounty on a rival's hull — sits in a **shared
pool** that pays each ship less the more ships chase it. A pool nobody else wants
is worth three times as much to you as a pool everyone wants. So the question is
never "how do I go fastest." It is "what are the other two doing, and where is
the money they are not standing on."

That must be answerable before you commit, or it is a coin flip. So the ship is
built out of visible hardware: a sail is a sail, a scoop is a scoop, a lance is a
gun. On the pre-race manifest you see what your rivals carry, and _then_ you pick
your line. Hardware is a slow, expensive, public statement of what you can do.
Your line is a free tap saying what you will do this time.

Speed, shields and aggression are all priced in income. The build is a bet about
your opponents; the race is the bet settling.

## The ship

Three slots and a rig: **Hull**, **Nav**, **Crew**, plus two mounts in Stage 1,
three in Stage 2, four in Stage 3. Hulls: Skiff (hull 60, handling 4, 90 cr),
Runner (90 / 3, 130 cr), Barge (140 / 1, one extra mount, 200 cr). Nav is rated
1–6 at 40 credits a level. Crew is Humanoid (free) or Robot (120 cr).

**Speed and handling are one dial.** Before each heat you set **throttle**, 1 to 5. A lap takes `1200 − 105·t` ticks — 1095 at throttle 1, 675 at throttle 5 — so
at 50 ticks a second a three-lap heat runs 40 to 66 seconds. The cost is grip.
Your **line score** is `Nav + Handling − floor(t²/3)`, so the penalty runs 0, 1,
3, 5, 8: the seed's non-linear scaling in five numbers. Every corner has a
difficulty D from 2 to 9. Meet D and you hold the golden path. Fall short by n
and you **swing wide**: 8n ticks lost, 3n hull taken, and — the part that matters
— that corner's charge node missed. For a ship that flies itself, "less reaction
time" means the nav has fewer ticks to resolve the turn, and the visible cost is
money left on the track.

**Charge is the in-race resource and the in-race income.** Golden nodes pay
**light charge**, dark wells pay **dark charge**. Both spend identically, both
are counted separately at the line, and _whatever is still in the tank when you
cross is what you sell_. Cap is 120. Shields regenerate at 1 per 2 charge,
automatic when you are below full and under fire; a **boost** costs 25 charge and
takes 40 ticks off the next 120; a **lance shot** costs 20. So a ship under
attack bleeds income holding its shields up even if it never loses a place.
Damage is theft, not delay.

**Each defensive layer guards something different.** Hull is structural, never
regenerates, and at zero you are out of the heat with no purse and no ledger.
Shields are the regenerating buffer against fire and hazard, and they are why
charge is scarce. Crew is capacity to act: 100 stamina, and a boost costs a
humanoid 12 of it. At zero the crew blacks out and taps do nothing for 200 ticks.
That is the seed's gravity narrowed to one thing so it can be felt —
**acceleration is paid for in taps you can still make**. Crew-targeting fire
drains stamina directly. If crew HP hits zero the nav takes over: the ship
finishes, holds the line at throttle 3, harvests nothing off-line.

**Robot or humanoid is a fork between two games.** A humanoid gets four live taps
and one **read** on the manifest, naming a rival's chosen line before you lock
yours. A robot is immune to gravity, has 50% more crew HP, and cannot react — you
**pre-program** three taps at fixed track positions and watch. The humanoid buys
information; the robot buys consistency. Both are one thumb.

Taps are **Boost**, **Fire**, **Vent** (30 charge into shields at once) and **Cut
Wide** (leave the golden path for the next well). Cut Wide makes leaving the line
a decision rather than a failure.

## The track

A course is a closed loop; Stage 1 is twelve segments. A segment is a
**straight** (one golden node, +3 light), a **corner** (difficulty 2–9, a golden
node on the line, a dark well outside, +4 dark), or a **field** (no golden path,
two dark wells, 4 hull a tick without a scoop). A heat is three laps.

The golden path is faster and carries light charge, so leaving it is never free.
What makes leaving it right is that **the dark matter is only off it**. The wells
sit outside corners and inside fields, and the dark pool pays 150 against solar's
120 precisely because reaching them costs line. The golden path is not strictly
better; it is best at one of the four ways to get paid.

**The track grows on a schedule and hints without promising.** Every course
carries **seams** — four in Stage 1. A seam declares the _type_ of segment that
will unfold there and a _range_: "corner, D 3–8" tells you a corner is coming and
not whether it is trivial or brutal, and the value is drawn from the seed at
stage open. Stage 2 grows the loop to sixteen segments, Stage 3 to twenty.
Reading a seam wrong costs about 60 credits of misbought nav and 24 ticks a lap
for the rest of the run — enough to hurt, not to end you.

**Track modification is a toll booth, not a buff.** A **Toll Claim** costs 80
credits and sits on one segment of your own course, one per stage. It raises that
segment's yield 60% for you and taxes every rival who harvests there 25% of what
they take. It never makes you faster, and it only earns if opponents go there —
so placing one is a prediction about other people's lines, and a toll on a well
nobody visits is 80 credits set on fire.

Courses meet by lap. **Lap 1 runs on seat A's course, lap 2 on B's, lap 3 on
C's**, seats assigned by standing, highest first. Every pilot's mods appear
exactly once, the order is known in advance, and the seed's "if I match against
you, your mods are present" is literally true.

On the manifest each pilot may also place **flares** they hold — 25 credits, one
segment, halving that segment's yield for the heat. All three place and reveal at
once, so a flare is a blind guess about a line.

## The economy

Four routes, each a fixed pool split by share, and the rule is one sentence:
**your cut is the pool times your share of what the field harvested from it.**
Alone in a pool you take all of it; three ships in evenly take a third each.

**Purse**, 180 credits, split by finish 100 / 55 / 25 — not proportional, always
contested, the reason never to stop racing. **Solar**, 120, yield is banked light
charge. **Dark matter**, 150, banked dark charge. **Bounty**, 140, damage dealt
to rivals.

A heat pays a pilot 120 to 320 credits. Each stage break pays a 150-credit
stipend, plus a 100-credit **salvage grant** to anyone below the cut line.

Bounty is doubly self-limiting: it splits like everything else, and two ships
running it shoot each other while the third runs clean and takes the purse.
Firing raises **Wanted**, 0 to 5 stars, persisting across a stage and dropping by
one in any heat you fire nothing. At Wanted 2 or more, one **patrol cutter** per
star above 1 enters every heat you are in, sitting on the golden path. Cutters
never block or collide. They **scan**: inside range your light harvest is halved
and 30% of your bounty per star is confiscated, so at Wanted 3 you keep 10% of
what you shoot. Aggression is a spike, never a career, and it is right twice —
when two rivals are stacked in a pool you'd have placed third in, and when you
need one pilot to score low before a cut.

**Rigs change only between stages. Consumables and trim change between heats.**
That is the information structure: hardware bought with poor information and
shown to everybody, lines and throttle and tap plans set with good information
and shown to nobody.

Mounts: Solar Sail 90 (+3 light a node), Broad Sail 160 (+6, −1 handling, blocks
scoops), Dark Scoop 110 (+4 dark a well, field damage to 1/tick), Rail Lance 130
(18 damage at 3 segments, 20 charge, +1 Wanted per 3 shots), Toll Claim 80,
Capacitor 70 (+40 cap), Ablative Plate 60 (+30 hull, −1 handling). Consumables:
Flare 25, Hull Patch 30, Charge Cell 20.

Saving is real: Stage 2 opens a third mount and Stage 3 a fourth, and a Barge
with a Broad Sail and Nav 5 is a 550-credit ship you never reach by spending
every stipend on patches.

## The season

Twelve pilots, three stages: four heats, then three, then two. Nine heats,
roughly 22 minutes with garage time. Four heats run in parallel each round, and
matching is by adjacent standings — you race whoever is nearest you on points,
which is what makes margins bite. Cuts: bottom four after Stage 1 (12 to 8),
bottom two after Stage 2 (8 to 6), highest total after Stage 3 is champion.

Points per heat are **ledger plus purse**. Ledger is credits that heat divided by
20, floored — 6 to 16 in practice. Purse is 12 / 6 / 2 by position, plus a
**margin bonus** of `max(0, 8 − floor(gap / g))`, where gap is your finish gap to
the winner in ticks and g is drawn per heat from 25, 30 or 35 and announced
afterwards.

The winner's gap is zero, so a win is always 20 and winning is never worse than
losing. But second 20 ticks back scores 14, second 250 ticks back scores 6, and a
_close third_ scores 10 — beating a distant second. Staying in it is worth more
than nominal position. Eight points a heat across four heats is 32, about the gap
between fourth and eighth on the Stage 1 table. The unknown divisor is the seed's randomness, drawn from the generator so
the sim stays pure and too small to decide a cut alone — it only makes racing to
the line worth doing.

Recovery works because ledger is half the table and matching drags you toward
similar rigs: a pilot in eleventh takes the salvage grant, meets two other broke
pilots, and finds every pool cheap to enter.

## How the systems connect

Because banked charge is your income and spent charge is your speed and your
shields, the player must decide mid-race, watching one bar, whether this heat
buys a place or a payday.

Because your rig is public and your line is chosen after you have seen everyone
else's, the player must decide at the shop whether to build a ship that deters
rivals off a pool or one that takes whichever pool they leave empty.

Because dark wells exist only off the golden path and throttle eats grip
quadratically, a player who wants dark income must buy nav or run slow — the
route is paid for in lap time, and lap time is purse points.

Because a Toll Claim earns only when rivals harvest the segment it sits on,
placing one is a bet on opponents' behaviour rather than a buff, and a wrong bet
is a dead 80 credits.

Because Wanted stars put cutters on the golden path in every heat you enter, an
aggressive pilot taxes the line they were harvesting and pushes themselves toward
a dark route they may not have rigged for.

Because points are mostly ledger and matching is by adjacent standings, a pilot
one place above the cut must choose between earning and denying — contesting a
rival's pool costs you money and costs them more.

Because each lap runs on a different pilot's course in a published seat order,
the player must plan three laps across three tracks and know which lap is the one
their own claim pays on.

## Other players

Visible before the heat: every rival's hull class, nav rating, crew type and
mounts. At reveal: flare placements and seat order. Hidden until the race:
throttle, chosen line, tap plans, and Toll Claims on courses you have not yet
raced. Wanted stars are public and permanent within a stage, so an aggressor
cannot hide and the field prices them in.

Visible after: the full pool split, every route, every pilot. You learn you took
40 of the 120 solar credits because two others were in it with you. That one
screen teaches the shared-pool rule without a tutorial and is the input to the
next shop.

## A worked run

Heat 2 of Stage 2 matches **Vex Oro** (2nd), **Sabine Kell** (4th) and **Iggy
Ndour** (5th).

Vex built a deterrent in Stage 1: Barge, Nav 4, Robot crew, Broad Sail,
Capacitor, Toll Claim — 540 credits. The sail is enormous and everyone can see
it. The plan is that nobody contests solar with a Broad Sail on the grid, so 120
credits come home whole. It worked three times. Sabine built the opposite —
Runner, Nav 5, humanoid, Solar Sail, Dark Scoop, flares — a generalist who takes
whatever is empty. Iggy runs a Skiff, Nav 3, Rail Lance, Dark Scoop, two patches,
Wanted 1.

**The manifest.** Vex is seat A, so lap 1 runs on Vex's course, where the Toll
Claim sits on segment 7 — a long straight thick with golden nodes, exactly where
a solar ship wants to be. Sabine's read returns Iggy's line: dark. So solar is
Vex alone, dark is Iggy alone, and contesting solar means losing to a Broad Sail
_and_ paying a toll for it. Sabine instead sets her line to dark and puts a
25-credit flare on segment 7 of Vex's own course.

**The race.** Throttle: Vex 2, Sabine 3, Iggy 4. Lap 1 on Vex's course: the flare
guts segment 7, Vex banks 21 light charge instead of 44, and the toll pays
nothing because nobody came. Iggy cuts wide twice, taking 9 hull in a field. Lap
2 on Sabine's course: her Toll Claim sits on the corner well at segment 11, Iggy
harvests it, and 14 credits move from his dark yield to hers. Lap 3 on Iggy's:
two lance shots at Vex, 36 damage — nothing to a Barge's shields, but it forces
72 charge of regeneration out of Vex's tank, and Vex's taps are pre-programmed
and cannot answer. Iggy goes to Wanted 2.

**The line.** Iggy first, Sabine second 41 ticks back, Vex third 190 back after
running throttle 2 all race to hold the line.

**The ledger.** Solar: Vex alone, banked 58, takes all 120. Dark: Sabine 82 units
to Iggy's 71, so 150 splits 81 / 69, minus Iggy's 14 in toll — Sabine 95, Iggy 55. Bounty: Iggy alone, 140. Purse: 100 / 55 / 25. Totals: Iggy 295, Sabine 150,
Vex 145. Points at g = 30: Iggy 14 + 20 = 34, Sabine 7 + 6 + 8 = 21, Vex 7 + 2 +
2 = 11.

Vex's deterrent held — nobody contested solar — and Vex still finished last on
points, because a 25-credit flare took a third of the harvest and two lance shots
another sixth. Sabine's single tap on the manifest changed Vex's race without
going near Vex on the track. That is the game. Iggy leaves at Wanted 2 and races
the next heat with a cutter on the line, which is why 295 does not repeat. Vex
buys a Capacitor, drops to throttle 1, and survives the cut 5th of 8 by 6 points.

## What it keeps from the seed, and what it drops

Kept and developed: shared pools, made the centre and given one resolution rule
and four named routes. Solar and dark collectors, made two physically opposed
lines rather than idle income. Bounties, wanted status and cops, with cops taxing
harvest rather than chasing, preserving determinism and no collisions. The golden
path, given a reason to leave it. Speed against handling, turned into one
throttle dial. Gravity, narrowed to boosts costing stamina. Hull, shields and
crew, repriced so each guards a different thing. Nav as route quality and as what
carries a dead-crew ship home. Humanoid versus robot, made a live-tap game and a
pre-programmed one. A growing track with hints, made typed seams with wide
ranges. Track mods, made toll booths resolved lap by lap. Pre-race placement,
made flares. Three ships, three laps. Margin scoring, as a formula that never
makes winning worse.

Altered: mods do not buff the modifier's speed, because a private self-buff is
not a decision. Shields do not deflect objects, because there are no collisions.

Dropped: the crewless ship as a chosen build, folded into the robot crew, which
is the version of "the nav flies it" a player would actually pick; a dead
humanoid crew is a bad outcome, not a strategy. Dropped: gravity impairing all
actions, because a global penalty reads on a phone as fog rather than cost.
Dropped: elimination by point cutoff alone.

## What it needs from the owner

Should the manifest show full rigs or only mounts? Full rigs sharpen the mind
game and crowd the screen.

Is the humanoid's read — naming a rival's line before you lock yours — too strong
in a game where information is the currency?

Is nine heats right for a phone, or should Stage 1 be three and the run sixteen
minutes?

Does the flare read as a decision or a tax? It costs 25 and can cost a rival 60.

Is one Toll Claim per stage enough for track modification to be a strategy rather
than a garnish?

## Risks

**The manifest becomes the game.** If reading rigs reliably names the empty pool,
every heat resolves before the start. The counters are ambiguous rigs, hidden
throttle and taps, and an always-contested purse. Test this first, not last.

**Deterrence could dominate.** A visible Broad Sail that scares everyone off
solar is 120 uncontested credits a heat for one 160-credit part. Flares, tolls
and lances are the answers; whether 25 is the right flare price is a measurement.

**Four pools plus three defensive layers plus Wanted may be too much for one
head.** The post-heat screen shows one thing, the split, and hull, shields and
crew each map to one bar. If a player cannot say why they earned 145 and not 295,
the count is not earned, and bounty is the route I would cut first.

**Ledger-dominant scoring may make racing optional.** If finishing third and
collecting wins seasons, the purse base must rise above 12 / 6 / 2.

**A first playable is far smaller than this reads.** One twelve-segment course,
three pools (no bounty, no Wanted), one hull, nav 1–6, humanoid crew, the
throttle dial, two mounts, four heats, no tolls, no seams. That is a complete
loop with the thesis intact; everything else here is a stage added to it.
