# Review: the build-and-watch player

I judge these as games I would sit down with on a bus. Three questions matter
more than the rest. Does building the ship feel like a plan? Is there tension
between the races, not just inside them? Do the other two ships in my heat
matter, or are they scenery with names? I weighted criteria 1 to 4 hardest.

All four proposals are real frameworks. None of them is a feature list. That is
worth saying before I start taking them apart.

## Scoreboard

| Proposal      | Build | Tradeoffs | Interaction | Stakes | Legibility | Fit | Buildable | Measurable | Total |
| ------------- | ----- | --------- | ----------- | ------ | ---------- | --- | --------- | ---------- | ----- |
| economy-first | 4     | 5         | 5           | 4      | 3          | 4   | 4         | 5          | 34    |
| season-first  | 4     | 4         | 4           | 5      | 3          | 4   | 3         | 5          | 32    |
| track-first   | 3     | 5         | 5           | 4      | 3          | 4   | 3         | 4          | 31    |
| ship-first    | 5     | 5         | 3           | 3      | 3          | 4   | 3         | 4          | 30    |

## The Ledger and the Line (economy-first)

**Build 4.** Hardware is public and physical — a Broad Sail is a thing everyone
on the grid can see — so a build is a statement rather than a stat block, and
the Barge-plus-Broad-Sail deterrent is a plan that visibly becomes itself over
three heats. It loses a point because the parts list is short and a ship's
direction is mostly which pool it eats from, not how it flies.

**Tradeoffs 5.** Banked charge is income, speed and shields at once, so every
boost is money you chose not to bank and every shield regen is money a rival
took from you without passing you. That is the tightest single tension in the
round, and it is live every tick, not every stage.

**Interaction 5.** Public rigs, hidden lines, flares placed blind, tolls that
pay only if a rival goes there, one lap on each pilot's course, and a post-heat
screen that shows exactly whose harvest diluted yours. Sabine's flare in the
worked run changes Vex's race without either ship being near the other, which
is the whole brief for "other players" answered in one move.

**Stakes 4.** Cuts at 12 to 8 to 6 with points that are half ledger and half
purse, and a margin bonus that never lets a win score worse than a loss. The
point off is the divisor `g` being drawn per heat and announced _afterwards_ —
random noise you cannot plan against is worse than no noise, and the seed asked
for randomness that shapes decisions, not one that grades them.

**Legibility 3.** Four pools, three defensive layers, Wanted stars, tolls,
flares, seams, a throttle dial and a charge bar that means two things. The
post-heat split screen is the right answer and the proposal knows bounty is the
first cut. The lap-rotates-courses rule is the quiet cost: mid-race on a phone,
"which pilot's track am I on" is one more thing to hold.

**Fit 4.** Deterministic, tick-based, four taps for a humanoid and three
pre-programmed for a robot. Nothing here needs real time or a random draw
outside the seed.

**Buildable 4.** The last paragraph — one course, three pools, one hull, no
tolls, no seams, four heats — is the only honest first-playable spec in the
round, and it keeps the thesis. That is the mark of a designer who has shipped
something.

**Measurable 5.** Pools split by share is one line of instrumentation. Bot
strategies map straight onto routes, and "does deterrence pay" is a question a
harness can answer in an afternoon.

**Best single idea.** Banked charge is simultaneously your income, your top
speed and your shields. One bar, three meanings, and the player watching a race
sees their bank account draining to keep them alive. No other proposal makes
the in-race resource and the between-race resource the same thing, and it is
why this design has tension while you are watching and not only while you are
shopping.

**Fatal flaw.** None fatal. The nearest thing: the humanoid's free _read_ —
naming a rival's chosen line before you lock yours — is enormous in a game
where the entire bet is "which pool is empty," and it is bundled with the
default crew. Price it or cap it to once a stage. Second worry, and the
proposal names it: adjacent-standings matchmaking plus ledger-heavy points
means broke pilots race broke pilots and find every pool cheap, which is a
rubber band strong enough to make eighth place profitable.

**What it makes better in the seed.** Shared pools. The seed says routes pay
less the more ships chase them and leaves it there. This gives one sentence of
resolution — your cut is the pool times your share of the field's harvest —
four named pools with numbers, and, crucially, a way to _read the contest
before you commit_ by showing rigs on the manifest. It also turns the seed's
track mods from a private buff into a toll that only earns when somebody else
shows up, which is the only version of that idea that is a decision.

**What it drops, and was it right.** It drops the crewless ship as a chosen
build, folding it into the robot crew. Right call: the seed's crewless ship was
a consequence looking for a strategy. It drops gravity as a general impairment
and keeps only "a boost costs crew stamina." Right, and better than right —
that is the only version of the gravity idea a phone player can feel. It drops
shields deflecting objects, which the brief already forced. What it should have
dropped and did not: bounty. Four pools plus Wanted is the load that pushes
legibility to a 3, and the proposal itself says bounty is what it would cut.

## Par and Purse (season-first)

**Build 4.** Thrust, Grip, Hull, Shield plus mounts is a competent chassis, and
the Drone Hull — no crew, no taps, reliably six lengths back, a living on the
right card — is a genuine archetype. What lifts it is that the purse card tells
you what question this week's ship must answer, so a build has an argument.
What holds it at 4 is that the ship itself is less characterful than the
season around it.

**Tradeoffs 4.** Strain rising with Thrust and pinning the crew above 60 is a
clean "the bar redlines exactly when the ship looks best." The Line dial prices
speed against grip in one number. Tier-3 nav at 700 credits against a whole
season's parts is a real fork. But several tensions are once-a-phase purchases
rather than live pressure, and the in-race decision space is thin.

**Interaction 4.** The energy rate readout dropping from 3 to 1 the instant a
rival tucks in beside you is the best _felt_ shared pool in the round — you do
not read a report, you watch a number fall. Dark matter as winner-take-all
alongside it is a good pairing. It stops short of 5 because the eleven rivals
are declared bot archetypes on the ladder, which is honest but drains the mind
game: there is nothing hidden to read, no reveal, no bluff. Rivals here are
weather with labels.

**Stakes 5.** The best scoring in the round, and it is not close. `max(0, S −
gap) + W` measured against whichever crosses first, the winner or a par ghost,
kills the obvious exploit every gap-based rule has — you cannot farm closeness
in a slow heat, because the ghost sets the floor. Drop-your-worst-heat makes
phases best-two-of-three so one disaster is free. Inverted matchmaking puts
rank 12 in front of rank 1 every round so the trailing pilot always has a fast
reference to stay near. That is a stakes system that has thought about the
player who is losing.

**Legibility 3.** Lengths as one twenty-fifth of a lap, so the scoring unit
survives the track growing, is a lovely piece of design hygiene. Against it:
hull, shield, crew and strain is four bars mid-race, plus lengths-to-reference,
plus the energy rate, plus a purse curve whose shape changed this week. The
proposal admits it is at the ceiling. It is.

**Fit 4.** Fine on determinism and ticks. Instinct is a seeded roll, declared
as such. Two to four taps a heat is one thumb.

**Buildable 3.** There is an unpriced problem here. Par time must be defined
per course, and every host's course is different because hosts buy writs. Who
computes par, and does it move when a writ moves? That is a calibration loop
the proposal never opens, and it sits underneath the scoring rule that
everything else hangs from.

**Measurable 5.** A par ghost is an absolute yardstick, which is exactly what a
harness wants — every strategy gets a number that does not depend on who it
raced. The proposal even names the test it fears: does a no-input Drone Hull
survive to phase 3.

**Best single idea.** The purse card, revealed during the build minute. It
changes what a good ship _is_ from week to week, which means the between-races
decision is not "buy the next upgrade" but "answer this question." That is the
thing roguelike deckbuilders get right and most auto-battlers get wrong, and no
other proposal here has an equivalent. The par ghost is a close second and is
the more load-bearing fix.

**Fatal flaw.** Writs and par are on a collision course and the proposal has
not noticed. The trailing pilot hosts, and a Debris Drift writ slows every ship
off the golden path — including the host. If par is a property of the course
size, a slowed course means the ghost crosses first and _everyone_ scores less,
the writ-buyer included. The one recovery mechanism the design is proudest of
can lower the score of the person who bought it. Fixable — par must be
recomputed for the host's actual course — but until it is, the host rule and
the scoring rule fight each other.

**What it makes better in the seed.** The margin rule the seed flagged as its
own open problem. The seed wanted "losing but staying in it is marginally
better." This turns that into the spine: you do not score for placing at all,
you score for distance, and the reference cannot be gamed because a ghost sets
the floor. It also does the smartest thing in the round with the seed's
"randomness" — the random element is the purse card, drawn from the seed and
shown _before_ the build, so it changes what you build rather than what happens
to you. That is exactly the right place to put variance in a build-and-watch
game.

**What it drops, and was it right.** It drops gravity assists as a
player-facing system into the nav core. Right — a third thing to route around
does not fit on a phone. It narrows humanoid "random luck" to one named
Instinct roll. Right, and every proposal here made the same call, which tells
you the seed's diffuse luck stat was never going to survive. It keeps the
seed's rule that mods live in the modifier's own races but inverts who hosts,
which is a real change and the best defence of the idea any of the four
mounted. I would push back on one drop that is not framed as one: with declared
bot archetypes, the seed's "the more ships chase a route the less each earns"
loses its bluffing layer. You know what a Bruiser will do. That is less
interesting than not knowing.

## The Line and the Wide (track-first)

**Build 3.** Six systems rated 1 to 5 is a slider screen, not a garage. Buying
"Handling 3" is not a plan coming together; it is a spreadsheet with a
spaceship on it. The archetypes underneath are real — the line-discipline nav
ship, the shielded brawler who eats their own debris, the crewless skeleton
that wins phase 1 and starves by phase 4 — but the interface to them is the
weakest build fantasy of the four.

**Tradeoffs 5.** Two ideas earn this outright. Offset is one number from 0 to
100 that decides your speed, your charge, your money and your risk
simultaneously, so every decision in the game is the same decision at a
different moment. And reaction delay — `round(12 × dilation ÷ handling)` ticks
— applies to _the player's own taps_. Build fast and your thumb gets worse. In
a game where the player has four or five inputs a race, making speed degrade
those inputs is the sharpest reading of the seed's speed-versus-handling line
that anyone produced.

**Interaction 5.** The route declaration is the cleanest information structure
in the round: all three declare blind, declarations are revealed, _then_ you
place your two items. One guess, then one informed move. Declaring Solar into
two other Solars costs you 160 credits and you find out in time to put a mine
in the Solar band where you now know two ships will sit for forty ticks. Add
bounty pools that scale with standing — 320 on the leader, 60 on last — and
being matched against the points leader is a payday. That is a reason to care
who you drew.

**Stakes 4.** The margin formula is clean and monotone, and Meridian finishing
second on points across four heats of 8, 7, 8, 7 with no wins is the seed's ask
demonstrated rather than asserted. Cuts of the bottom three at three phase
boundaries are legible. Two problems hold it at 4. A DNF is worth 0 in a game
with a hull pool, which is a season-ending swing from one bad heat. And phase 5
is a single lap of a 28-segment track — a variance spike at the exact moment
stakes are highest, in a game whose economy needs laps to accumulate.

**Legibility 3.** The offset bar with three dots on it is the best single HUD
idea in the round; you can read a whole race from one bar. Everything else
fights it. Five phases, six ratings, three mods, two placements, four actives,
declarations, wanted, G-load, dilation, salvage, an underdog grant and a
Steward's bonus drawn from five categories. That is the largest system count
here, and one excellent bar cannot carry it.

**Fit 4.** Deterministic, 30 ticks a second, delay is a computed integer not a
feel. Robot Routine — pre-program three actives and watch — is the most
phone-native mode anyone proposed.

**Buildable 3.** Nav sets the plan, smooths acceleration, dodges hazards and
drives home crewless. "Nav 5 sequences a wide excursion so it lands on the exit
of a bend where you were losing speed anyway" is a route planner, and the whole
track is unspecifiable without it. The proposal flags this honestly and
prescribes a deliberately dumb first nav, which is the right instinct, but the
design as written leans on the smart one.

**Measurable 4.** Declarations are a clean strategy axis for bots, and the wide
band's yield is a single dial the proposal correctly identifies as the first
thing to tune. Slightly held back by nav quality being hard to hold constant
across strategies.

**Best single idea.** Reaction delay lands on the player's taps, not just on
the autopilot. It is the only mechanic in the round that makes the speed
decision reach the thumb, and it converts a stat tradeoff into something you
experience while watching.

**Fatal flaw.** Not fatal, but two things bleed. The build is ratings, not
objects, so nothing on the ship has a face. And the design's own risk section
is right: if the wide band pays even slightly too much, everybody farms wide
and the race stops being a race. That is a single-dial design where the dial
controls whether the game exists.

**What it makes better in the seed.** The golden path. The seed says the path
is faster and carries energy and that swinging wide is dangerous and slow. This
makes the path the spine of the whole design and gives leaving it a price you
can quote out loud: forty ticks in a wide band costs 8 charge and about 10
ticks of lap. It also solves the seed's hardest open question — how do you
learn how contested a route is before committing — with the declare-then-reveal
step, which is a better answer than any other proposal's.

**What it drops, and was it right.** It drops three laps as a constant, scaling
to 3, 2, 2, 1, 1 as the ring grows. Right: three laps of 28 segments is a
three-minute phone race. It drops gravity assists and folds shield deflection
into absorption. Both right. It narrows humanoid luck to one 35% Improvisation
roll, same as everyone. Right. What it drops without saying so: the seed's
sense that ships have _parts_. Turning the ship into six sliders is the change
that costs the most and is the least argued for.

## The Flight Card (ship-first)

**Build 5.** "You build a machine and you tell it how brave to be" is the best
framing sentence in the round, and the hardware actually behaves that way.
Acceleration is thrust over mass, G-load equals acceleration, and G sets how
often the crew can spend charge — so bolting a Dark-Matter Trawl onto your ship
either slows you or forces a bigger drive that pins the crew who work the
trawl. The collector taxes itself. That is a build where the parts argue with
each other, which is exactly the auto-battler feeling of a plan coming
together, or failing to.

**Tradeoffs 5.** Everything has mass, and mass is the currency all the other
tensions are paid in. Overdrive is the second one: pushing a dial past a
hardware notch is a coin flip for a humanoid and an automatic failure for a
robot, so the crew choice is "do I want variance" rather than "which stat
block." Both are real, both are priced, both are live every heat.

**Interaction 3.** This is where it falls behind. The shared pool rule is
100/60/30 by _crossing order_, which means the fastest ship pays nothing for
contest and the trailing ships eat all of it. That is the opposite of what the
seed asked for. A pool that costs the leader nothing is not contested, it is
just another thing the leader wins, and there is no bet to make. Visible
collector loadouts and mines help, and Kesta's Charge Siphon ending Vetch's
season three heats later is a genuinely good long-fuse interaction — but it is
one moment across a season, and the moment-to-moment race has almost nothing in
it from the other two ships.

**Stakes 3.** Twelve become six after three heats is a brutal, front-loaded
cut; half the field is gone before most players have tuned anything. The margin
formula is correct and monotone. Recovery is the weak part: "a bad heat leaves
you a bigger wallet than the leader" is not a comeback, it is a consolation,
and it does nothing for a player whose problem is that their build is wrong.

**Legibility 3.** The flight card itself is beautifully legible — three
sliders, each with a notch showing where the hardware stops, and a post-race
report naming the corner where the card outran the machine. Working against it:
`4 + 16 × (G ÷ tolerance)` ticks between charge spends is not a thing a player
will ever feel as a number, three defensive layers remain three, and grip is an
inequality with a squared term in it. Hull damage becoming handling damage is a
genuinely good legibility move and I want it grafted somewhere.

**Fit 4.** Three buttons, 60-second heats at 20 ticks a second, everything
deterministic. The most disciplined "one thumb" of the four.

**Buildable 3.** More physics than the others — thrust, mass, grip
inequalities, gravity wells with slingshot exits. Workable, but it is a
simulation with tuning surfaces rather than a set of rules, and there is no
first-playable spec.

**Measurable 4.** Excellent for a harness in one specific way: a robot ship is
variance-free by construction, so it is a perfect control against which to
measure whether the humanoid gamble pays. Overdrive probability is one knob.
Held at 4 because crossing-order pools make "is this route contested" hard to
isolate from "is this ship faster."

**Best single idea.** The chain from mass to acceleration to G-load to how
often the crew may act. It is one causal line, it makes every bolt-on part cost
something in a currency the player already understands, and it is the only
place in the round where the seed's "acceleration creates gravity which impairs
the crew" becomes a system rather than a debuff.

**Fatal flaw.** The shared pool rule inverts the seed. 100/60/30 by crossing
order means the first ship through loses nothing, so the economy rewards pace
twice and there is no public bet about where the money is. The seed's whole
economic idea — the more ships chase a route, the less each one gets — is what
makes rivals matter when they never touch you, and this proposal is the one
that lets go of it.

**What it makes better in the seed.** Two things. The speed-and-handling curve
becomes `handling ≥ T × v² / 12`, and "less reaction time for a ship that flies
itself" becomes something concrete: margin to the limit, set by the Entry dial,
overdriveable past what the nav supports. And humanoid versus robot becomes
determinism versus variance under overdrive, which is the only version of that
binary that is two different games instead of two stat lines. Every other
proposal reached for a similar answer; this one built the rest of the ship
around it.

**What it drops, and was it right.** It drops hull as traditional health — a
ship never explodes, it loses grip — and reroutes damage into lost line. That
is the best cut in the round: it removes a DNF from a phone game while making
damage _more_ felt, not less. It drops the separate crew health bar for berths
you can read as four icons going dark. Right. It keeps crewless as a designed
build, the Sealed Hull, and argues it well: no crew, no economy, so it has to
win rather than place. That is the seed's crewless idea taken seriously rather
than tidied away, and I think it is a better answer than economy-first's fold.
What it should have cut and did not: the number of hardware tiers. Three tiers
across drive, nav, hull and modules is a lot of shop for a 22-minute season.

## Recommended merge

**Build from economy-first, "The Ledger and the Line."** It is the only
proposal where the other two ships in my heat change my race every single lap
rather than once a phase, and it is the only one whose in-race resource is also
my season's income — which means watching the race is watching my bank account,
which is the tension this genre lives on. It also has the honest small first
version, which matters more than anything else on this page.

Graft, in the order I would do it:

1. **The purse card, from season-first.** Reveal next heat's payout shape
   during the build. Economy-first's between-races decision is currently "buy
   the next part"; the card makes it "answer this week's question," and it is
   the single biggest upgrade available to the base. Take the multiset too:
   four Even Split, three Winner's Purse, two Endurance, order drawn from the
   seed.
2. **The par ghost, from season-first.** Replace economy-first's `g` divisor
   drawn per heat and announced afterwards — unplannable noise — with a
   reference that is whichever crosses first, the winner or a par ghost. Slow
   heats stop being farmable, and every strategy in the harness gets an
   absolute number. If you graft this, price par against the _actual_ course
   including tolls, which is the bug I flagged in season-first.
3. **Declare, reveal, then place — from track-first.** Economy-first shows rigs
   and hides lines. Add a binding route declaration revealed before flare
   placement. It turns the shared pool from a read into a bet with a settlement
   you watch, and it makes the flare a targeted answer instead of a blind
   guess. This is the change that makes the pool economy sing.
4. **Reaction delay on the player's own taps, from track-first.** Economy-first
   already has throttle costing grip quadratically. Extend it: at throttle 4
   and 5, a tap lands 10 or 16 ticks late. Now the fast build is worse in the
   player's hands, not just in the corner, and speed is a decision the thumb
   feels.
5. **Hull damage as handling damage, from ship-first.** Drop economy-first's
   "hull zero and you are out of the heat." Below half hull, lose 30% of your
   line score. A wrecked heat should be a bad race, not a zero.
6. **Drop your worst heat per stage, from season-first.** One free disaster per
   stage. Cheap, and it is what lets a player take a risk in heat two.

Cut before building anything: **bounty, Wanted and cutters.** Economy-first
already says it would cut bounty first and it is right. Three pools, three
defensive layers and a charge bar with two meanings is already at the phone's
ceiling, and aggression is the route that pays the least design dividend per
unit of screen. Add it in stage three if the harness says the pool economy is
solved without it.

One thing I would take from ship-first that is not on the list above because it
is a whole design rather than a graft: if the base ever feels like a spreadsheet
in the garage, the flight card — hardware sets notches, a free card says how
close to run to them — is the structure to convert to. It is the best build
fantasy anyone wrote this round. It is just attached to the weakest economy.
