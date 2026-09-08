# The Line and the Wide

## Premise

One circuit. Twelve ships. Five phases, and the circuit is longer at the end of each one.

Everything in this game happens in relation to a single strip of light called the golden path. On it you are fast and you are charging. Off it you are slow and dark, and off it is where every credit in the game lives. That is the whole design in one sentence: **the line is speed, the wide is money, and you cannot be in both places.**

The course is the opponent. Rivals are weather on it. You build a ship to beat a track that does not exist yet, you pay to reshape the parts of it you already understand, and you watch three ships find out which of you read the ground right.

A race is 40 to 80 seconds. The decisions are in the yard.

## The ship

Six systems, each rated 1 to 5. Ratings cost 0 / 80 / 180 / 320 / 500 credits. You start with 600. Selling back returns 50%.

**Thrust** sets top speed and acceleration. Speed 100 is cruise; a rating-5 thrust reaches 145.

**Handling** is how fast you can change your offset from the line, and how much a bend throws you off it. Rated 1 to 5, giving a handling factor of 1.0 to 2.4.

**Nav** is the autopilot. Nav does not fly the ship faster — it decides the _plan_: what offset to hold in each segment, where to brake for a bend, when to swing wide to a collector and when to skip it because the lap is going badly. Nav 1 holds a naive line. Nav 5 sequences a wide excursion so it lands on the exit of a bend where you were losing speed anyway. Nav also flies the ship home if the crew dies.

**Hull** is a damage pool, 8 to 24 points.

**Shields** absorb incoming damage, 0 to 30 points, and regenerate at 2 charge per point.

**Crew** is a type and a health pool.

### Offset, dilation and the thumb

At every tick a ship has one number that matters: **offset**, 0 to 100, its distance from the golden path. Offset 0–15 is _on line_: speed × 1.25, and charge accrues at 1 per 5 ticks. From 15 to 100 the multiplier falls linearly to 0.85 and charge stops entirely. One bar on the HUD, three dots on it, and you can read a whole race from it.

Speed costs reaction. **Dilation = (speed / 100)²**, and **reaction delay = round(12 × dilation ÷ handling factor)** ticks. A thrust-5, handling-1 ship at speed 145 has a 25-tick delay — 0.8 seconds. A thrust-2, handling-5 ship at speed 92 has a 4-tick delay.

Delay is not an abstraction. It applies to two things and both are visible. Nav's avoidance order lands `delay` ticks after the hazard is seen, so a fast ship clips things a slow ship steps around. And **your taps land late by the same number**. Tap Brace on a fast ship and the shields come up two thirds of a second later. That is what "less reaction time" means for a ship that flies itself: the player is the one who feels it, in their thumb, every heat.

### Gravity

Acceleration accumulates **G-load**, 0 to 100, rising with the magnitude of acceleration and bleeding off 1 per tick when coasting. Above 60, every action gains +8 ticks of delay and a humanoid crew's actives cost double charge. Above 85, the crew takes 1 damage per 30 ticks.

So acceleration is a good and a cost. Hammering back onto the line out of a chicane is the fast play and it puts your hands in a bag for the next four seconds. Nav 4+ deliberately gives up 2 ticks of lap to shave 20 G-load before a segment where you will want to act.

### Three layers, three different losses

Three defensive systems is a lot for a phone. They earn it by protecting three different things.

**Shields protect your race.** An unabsorbed hit does not only cost hull — it knocks you 15 to 40 offset wide. Shields keep you on the line. They spend charge to come back, which is the same charge your actives want.

**Hull protects your season.** Hull 0 is a DNF: zero points for the heat, and 15 credits per point to repair before the next one.

**Crew protects your hands.** Crew health caps how many actives you can take per lap (health 12+ = 4, 6–11 = 2, 1–5 = 1). At crew 0 the nav flies you home at a fixed offset of 10: no actives, no wide excursions, no collections, no bounties.

### Humanoid or robot

Not a stat swap. Two different sessions.

**Humanoid crew** (health 12, costs 100) takes G damage and generates **Improvisation**: when a hazard resolves inside your reaction delay, a seeded 35% roll nulls the offset knock entirely. They will also fire an active at 60% charge for 2 crew damage. Humanoids give you outs when the plan fails.

**Robot crew** (health 24, costs 160) is immune to G-load entirely and gets **Routine**: before the race you pre-program up to 3 actives to fire at named segment boundaries. Routines cannot be cancelled once the race starts, and a robot's live taps cost 1.5× charge.

Humanoid is the race you play. Robot is the race you plan and then watch. The robot build is the phone-in-a-queue build; the humanoid build is the sit-down build. Both are competitive, and a player switching between them is genuinely switching games.

**Crewless on purpose** is a third thing. A one-crew skeleton (health 4, costs 20) with Nav 5 will lose its crew by lap 2 in any contested heat and fly the rest at offset 10 — about 96% of a good line, zero actives, zero economy. It is the cheapest way to win a phase-1 heat and it starves by phase 4 because it earns nothing but purse.

## The track

A course is a **ring of segments**. Each segment is 50 ticks of on-line travel at base speed. The simulation runs at 30 ticks per second.

Phase 1 is 12 segments: a 600-tick lap, 20 seconds, three laps, a 60-second heat. Every player starts on exactly this course.

Every segment has a **shape** — Run, Bend, Squeeze or Field — a charge multiplier, and a **wide band**: an annulus at offset 40–80 where collectors and placements live. Bends throw you outward by `18 ÷ handling factor` offset unless nav has set up for them. Squeezes throw you twice that. Fields have no bend but their wide band is 60 ticks deep instead of 40.

### Growth, and the hint

Six of the twelve opening segments carry a visible **stress marker**: Widening, Tightening or Splitting. At the end of each phase the seeded generator picks four marked segments and grows four new ones out of them. A Tightening marker becomes a chicane pair 60% of the time. Widening becomes a long Field with a deep wide band 65% of the time. Splitting becomes a fork — two lines through the same ground, one of them golden — 55% of the time.

Segments per phase: 12, 16, 20, 24, 28. Laps per phase: 3, 2, 2, 1, 1. Heats run 60, 54, 67, 40 and 47 seconds. The final phase is deliberately a single lap of a 28-segment monster: no recovery inside it, one read, one run.

That is what a hint is for. You see the markers on day one and you spend real money against them: a Dark Matter collector at 300 credits pays double in a fork, so you put it next to a Splitting marker in phase 1 and hope. Reading it wrong costs 60% of the purchase price to relocate, plus the phases you spent detouring to a collector that landed on a straight where going wide loses you 12 ticks.

### Modifications, and why they are not a self-buff

You may own up to 3 **track mods**, 250 credits each, permanent. They appear **only in your own races**, which means they appear in every race you fly and in every race a rival flies against you. There is no version of this where you avoid your own hazard.

- **Debris Belt** — sits on the golden path. 4 hull damage, offset +25 on contact.
- **Gravity Well** — sits on the golden path. Passing it adds 30 G-load.
- **Beacon Ring** — a line segment with double charge, wrapped in a hard bend.

A mod is asymmetric _only through your build_. A Debris Belt is a purchase that pays if your shields are rated 4 and your rival's are rated 2, and a purchase that kills you if you got that comparison wrong. A Gravity Well is free to a robot crew and a tax on every humanoid in the field. A Beacon Ring rewards handling. Mods are public — everyone can see what you own, because they are going to have to fly it.

### Placement

Before each heat, each player places up to 2 **one-shot items** anywhere on their own ring, hidden until triggered.

- **Mine**, 60 credits: 3 hull damage.
- **Slick**, 40 credits: offset +30, no damage.
- **Charge Buoy**, 80 credits: +40 charge to the _first ship that passes it_. You place it; anyone can take it. You put it where only your line goes.

## The economy

Two currencies. **Charge** lives inside a race, caps at 150, and comes only from the golden path. **Credits** persist.

A perfect phase-1 lap on the line yields 120 charge. A lap with two collector excursions yields about 70. Actives cost 25 to 40. Shield regen costs 2 per point. Every wide excursion has a price you can state out loud: forty ticks in a wide band costs 8 charge and roughly 10 ticks of lap.

There are four actives; you carry 3.

- **Brace**, 25 charge: shields to full for 90 ticks.
- **Cinch**, 40 charge: nav override, snap to offset 0 over 20 ticks, +25 G-load.
- **Lance**, 30 charge: 3 hull damage and offset +20 to the nearest ship within 2 segments of you, at range. No contact, no blocking.
- **Hold**, 0 charge: coast for 15 ticks, shed 30 G-load.

Credits arrive four ways.

**Purse**, unshared: 300 / 180 / 90 per heat.

**Collectors**, shared. Solar (220 credits) and Dark Matter (300, double yield in fork segments) are placed on a segment and pay per heat from a **pool of 240 credits per type per heat**. If all three ships in the heat run Solar, each contests a third. Your take is `pool_share × min(1, band_ticks / 40)` — forty ticks inside the band takes your full share.

**Bounties**, shared and adversarial. Hull damage you deal to a rival pays 40 credits per point out of that rival's **posted bounty**, which scales with their standing: 320 for the points leader down to 60 for last. The winner is the target. That is the rubber band, and it is a rule rather than a fudge.

**Salvage**: 50 credits, once, for passing through the segment where a ship went out.

### Knowing the contest before you commit

Between heats, each of the three ships **declares a route** — Solar, Dark Matter, Bounty or Clean — simultaneously and blind. Declarations are then revealed to all three, _before_ placement. Declaration is binding for that heat.

So the sequence each phase is: see your opponents and their builds → declare blind → declarations revealed → place your two items knowing what everyone is chasing → race. One guess, then one informed move. Declaring Solar into two other Solar declarations earns you 80 instead of 240, and you learn it in time to respond — not by changing your declaration, but by putting a Mine in the Solar band where you now know two ships will be sitting for forty ticks.

### Cops

**Wanted** runs 0 to 5. Each hull point you deal adds 1; it decays 1 per heat. At wanted 3 or above, a **patrol cutter** spawns on the golden path four segments ahead of you at the start of each lap and holds there for 120 ticks. Inside offset 20 of it you lose 10% speed and collect no charge. At wanted 5 a patrol also fines 25% of your purse.

Cops do not shoot. They **take the line away from you**, which for a ship that lives on the line is worse. Aggression is right for exactly one shape of ship: high thrust, heavy shields, robot crew, few actives, low charge dependence. That build does not want the line much anyway, so the cutter costs it little and the leader's 320-credit bounty pays it a fortune.

### Why save

Ship ratings, collectors, mods and placements come out of one wallet. A collector bought in phase 2 pays across phases 3, 4 and 5; a thrust upgrade bought in phase 2 wins you phase 2. That is the whole spend-or-save decision and it is live every phase.

## The season

Twelve ships. Four heats of three per phase, all ships racing once. Five phases.

Pairing after phase 1 (which is seeded random): sort by points, then heat _i_ takes ranks _i_, _9−i_ and _i+8_. Heat 1 is ranks 1, 8, 9. Every heat has a leader, a middle and a tail ship, so nobody farms an easy pool.

Cuts: bottom 3 after phase 2, phase 3 and phase 4. Twelve to nine to six to three, then a single final heat.

**Scoring.** The winner takes 10. Second and third take `max(1, 8 − floor(gap_ticks ÷ 25))`, where gap_ticks is your finish time behind the winner. Twenty ticks back is 8 points. A hundred back is 4. Two hundred or more is 1. A DNF is 0. Winning is always strictly better than losing, because 10 > 8, and losing by half a second is worth almost as much as winning — which is exactly what the seed asked for.

**The Steward's bonus**, +1 point, is drawn by the seeded generator from a pool of five categories at the start of each phase and announced before builds: fewest ticks off the line; most damage dealt while under wanted 3; most credits collected; fewest ticks under 60 G-load; first to complete a lap. It is one point, and one point is often the cut line.

**Recovery.** Bounty pools favour hunting the leader. And at the start of each phase, the bottom third of the field receives an **underdog grant** of 40% of the leader's earnings that phase, capped at 250 credits.

## How the systems connect

Because charge accrues only on the golden path and every shield regen, every Lance and every Cinch is paid in charge, **the player must buy their defence and their aggression with line discipline** — a heat spent farming wide is a heat with an empty gun in the third lap.

Because a track mod runs in your own races too, **the player must build a ship that survives their own hazard before they place it** — a 250-credit Debris Belt is a purchase in shields as much as in track.

Because collectors pay by ticks spent in a wide band, and the track grows out of the segments carrying stress markers, **the player must site their economy on a bet about geography two phases away**, and pay 60% to be wrong.

Because acceleration builds G-load, and G-load over 60 adds 8 ticks to every tap, **the player must choose between reclaiming the line hard out of a bend and having hands for the next four seconds.**

Because route declarations are revealed before placement, **the player must place their two items against a known contest** rather than a guess.

Because bounty pools scale with standing, **the leader must build to be shot at** and the tail must decide whether to spend charge earning bounties instead of laps.

Because the Steward's bonus is announced each phase and is worth a point at a cut line, **the player must sometimes build against their own plan for one phase.**

## Other players

Public at all times: standings, points, every ship's six system ratings, every ship's owned track mods, and every ship's wanted level. Public after simultaneous reveal: this heat's route declarations. Hidden: the two placements, until they trigger; and a rival's collector segments, until you have raced them once, after which their ring shows you where they sit.

So you know what a rival _is_ and what they _own_, and you learn what they _intend_ one step before you must commit. What you never know in advance is where the mines are.

Matching matters because you fly your opponent's ring as well as your own. Drawing a rival with three Debris Belts and shields you cannot match is a heat you should plan to lose narrowly and cheaply — take the 6 points, spend no charge, keep your hull.

## A worked run

Twelve ships. Follow three: **Kestrel** (the player), **Anvil**, **Meridian**.

Phase 1. The ring is 12 segments; segments 3, 7 and 11 carry Splitting markers, 5 and 9 Tightening, 12 Widening. Kestrel spends 600 credits on Nav 4 (320), Handling 3 (180), humanoid crew (100). Thrust stays at 1. The plan is a line-discipline ship that reads the growth right and buys thrust later out of collector income. Anvil buys Thrust 4 and Shields 3 with robot crew: a brawler. Meridian buys Nav 3, Handling 3 and a Solar collector on segment 12, next to the Widening marker.

Heat 1: Kestrel, Meridian, and a tail ship. All three declare Clean except Meridian, who declares Solar and takes the whole 240 pool uncontested. Kestrel wins on line discipline — 10 points, 300 credits. Meridian finishes 41 ticks back for 7 points, but leaves with 420. Kestrel notes that Meridian is now richer than the winner.

Between phases the ring grows to 16. Segment 12 widens as its marker suggested; segments 3 and 7 fork; 9 tightens. Meridian's Solar collector is now sitting in a 60-tick-deep Field — it pays full share in 40 ticks instead of a struggle. Kestrel, who bet on the forks, buys a Dark Matter collector at 300 for the new fork off segment 3, where it doubles.

Phase 2. Kestrel is matched with Anvil. Anvil has bought a Debris Belt with the phase-1 bounty income and placed it on the golden path in segment 9 — the segment that just tightened into a chicane pair. On Anvil's ring, the fastest line through the tightest part of the course now has 4 hull damage sitting in it. Anvil's shields are 3 and its robot crew shrugs. **Kestrel's shields are 0.**

That single 250-credit purchase by another player rewrites Kestrel's race. Nav 4 plans around the belt, which means holding offset 45 through segment 9 on all two laps — 26 ticks lost, 14 charge lost, and Kestrel's Dark Matter excursion on segment 3 is now unaffordable in the same lap. Kestrel takes the collector and loses the heat by 62 ticks: 6 points, but 300 credits of Dark Matter income and a hull still intact. Anvil wins, and moves to the top of the standings — where the posted bounty is now 320.

Phase 3. Kestrel finally buys Thrust 3 and Shields 2 out of collector money, and declares Bounty against Anvil. Two Lances land: 6 hull, 240 credits, wanted 2 — under the cutter threshold, and this phase's Steward's bonus happens to be "most damage dealt under wanted 3." Kestrel takes second by 19 ticks for 8 points plus the bonus. Anvil, hulled and shieldless by lap 2, wins anyway but pays 90 credits in repairs.

Phase 4 cuts to three. Meridian, who never bought a weapon and never took a hull point, is second on points purely on margins: four heats of 8, 7, 8 and 7, no wins. That is the margin rule doing exactly its job.

Phase 5: one lap of 28 segments. Kestrel, Anvil, Meridian. Anvil's own Debris Belt is on the ring in a race where it has one lap to make time and no room to route wide. Kestrel, now with shields 3, eats the belt on purpose and takes the line straight through it. Anvil is 30 ticks ahead at the last fork and coasting on G-load. Kestrel wins by 11 ticks, on a hazard a rival paid 250 credits to install.

## What it keeps from the seed, and what it drops

**Developed.** The golden path is the spine of everything here: it now carries the speed bonus, the ability currency and the only route to charge, which is what gives "swinging wide is dangerous and slow" a price you can quote. Handling and nav earn their keep because offset is a real number that they control. Speed-versus-handling became dilation and reaction delay, and the delay reaches the player's thumb rather than staying an autopilot statistic. Acceleration-as-gravity became G-load with a threshold you can see. The three defensive layers were kept but given three different losses: race, season, hands. Crewless became a build. Humanoid-versus-robot became two ways to play a race, not two stat lines. Shared pools got a declaration step so contest is knowable. Bounties got a standing-scaled pool so aggression is a rubber band. Wanted status got cops that steal the line instead of dealing damage. Margin scoring got a formula that never makes winning worse.

**Altered.** The seed says three laps. Three laps of a 28-segment track is a three-minute phone race, so laps shrink as the ring grows: 3, 2, 2, 1, 1. Point cutoffs became fixed cuts of the bottom three, because a floating cutoff is hard to read on a phone.

**Cut.** Gravity assists as a distinct nav behaviour — nav already has enough to do, and a gravity-assist system needs celestial bodies that this track model does not have. "Random luck outcomes" as a general property of humanoid crews became one specific 35% Improvisation roll, because diffuse luck is unmeasurable and one named roll is not. Deflection as a separate shield behaviour was folded into absorption; two shield modes is one system too many.

## What it needs from the owner

Is the wide band a place you _go to_ — a detour with a price — or a second racing line that a build could live on full time? I have written the first. The second is a bigger, slower game.

Should a track mod be permanent for the season, or resettable each phase at a cost? Permanent makes it a real commitment; resettable makes phase 5 a fresh puzzle.

Are route declarations blind-simultaneous, or should the standings leader declare last and openly? Leader-declares-last makes leading harder and reading easier.

Is a DNF worth 0 points, or should hull loss keep a floor of 1 so that a wrecked heat is not a dead season?

How much should the player see of a rival's ring before racing it? I have made mods public and placements hidden. Making collectors visible too would make phase 1 more readable and phase 3 less tense.

Is robot-crew Routine — pre-programming a race and watching it — the primary mode, or the alternative one? That answer decides whether this is a game you play or a game you set up.

## Risks

**Two economies, one thumb.** Charge and credits both flow from the same offset decision. That is the design's strength and its likeliest failure: if the wide band's credit yield is even slightly too high, every ship farms wide and the race stops being a race. The pool of 240 per type is the dial, and it wants to be tuned first, hard, with bots.

**Nav does too much.** Nav sets the plan, smooths acceleration, dodges hazards and drives home crewless. If nav is under-implemented the whole track reads as noise, and if it is over-implemented the player has nothing left to decide. The first playable should have a deliberately dumb nav — hold a target offset per segment, brake for bends — and add planning only where a player can see it happening.

**Mods might be strictly bad.** Because you fly your own mods, a cautious field buys none and the most interesting system in the design never turns on. If bot testing shows mod purchase rates under 30%, the fix is to make mods pay directly: a Debris Belt that credits you 30 per rival hull point taken.

**Five phases may be too few to feel a season and too many to sit through.** Five heats of 40–70 seconds is under six minutes of watching, spread across five yard sessions. If the yard sessions run long, the whole thing stops being twenty minutes on a phone.

**The 12-ship field is expensive.** Nine of the twelve are bots that must build, declare, place and fly credibly. A first playable can run a field of six across three phases and lose nothing structural.
