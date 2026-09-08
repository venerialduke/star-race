# The Ledger and the Card

## In one paragraph

Three ships fly one course. One wins the purse. All three get paid, and every
credit outside the purse comes from a shared pool that pays you less the more
rivals chase it. Before each heat all three pilots declare a route — Line, Wide
or Clean — blind and simultaneously, and the declarations are revealed before
anyone places a marker, so you learn how crowded your money is one move before
you commit. Then you set a **flight card**: three free dials telling your ship
how close to its hardware ceilings to run. Hardware is slow, expensive and
public. The card is free, private and changes every heat. The race is that bet
settling, and you watch one bar — charge — which is at once your speed, your
shields, your ammunition and your income, so every tap is money you decided not
to bank. Nine heats, twelve pilots cut to nine to six to three, scored not on
placing alone but on how many ticks back you finished against the winner or a
published par ghost, whichever crossed first.

## The loop

A stage break, then three heats, three times. Twelve pilots, nine heats each,
about twenty minutes.

At a **stage break** you see the standings, next stage's course, and the purse
cards for the heats ahead. You buy hardware and install one track modification.
Slow decision, poor information, and everyone sees what you bought.

Before each **heat**, thirty seconds. You see the two rivals you drew and their
full rigs. You declare a route, blind. All three declarations are revealed. You
place one marker, knowing what everyone is chasing. You set your card.

The **race** is 55 to 70 seconds. Four taps, no steering. Afterward one screen:
finish gaps, the pool split showing whose harvest diluted yours, and one line
naming the corner where your card outran your hardware.

## The ship

Four hardware numbers, a crew, and mounts. All of it public.

**Hulls.** Skiff (hull 60, Grip 4, 2 berths, 90 cr). Runner (90, Grip 3, 3
berths, 130 cr). Barge (140, Grip 1, 4 berths, one extra mount, 200 cr). Sealed
Hull (100, Grip 2, **no berths**, immune to gravity and radiation, 170 cr).

**Nav** is 1 to 5 at 60 credits a level and does exactly three jobs: it raises
cornering capacity, it raises how far the card may be pushed before the ship is
lying, and it flies you home when the berths are empty. There is no graded
autopilot intelligence anywhere here — a planner is a system nobody can see.

**Crew is berths**, not a bar — two to four icons. You start with four taps and
lose one per berth that goes dark. Radiation fields and crew-targeted fire kill
berths. At zero the nav clamps every dial to its own rating and flies the ship
in: it finishes, holds the line, harvests nothing wide, and you have no taps.
That is the seed's dead-crew ship, and the Sealed Hull is the version you choose
on purpose — no berths ever, no economy, so it has to win rather than place.

**Humanoid** berths (free) tolerate a Push of 6 and improvise: when the card is
overdriven they pass a seeded roll and hold anyway. **Robot** berths (120 cr)
tolerate a Push of 10, have double berth health, and never improvise — an
overdriven robot fails identically every time. Two games: the humanoid is a ship
you push past its ceiling and gamble on, the robot is one you tune to its exact
ceiling and it delivers that number nine heats running.

### The flight card

Three dials, 0 to 10, set free in ten seconds. The garage draws each dial's
**hardware ceiling as a notch on the slider**, so overdriving is something you
watch yourself choose.

**Push** — thrust on straights. A straight takes `50 / (1 + 0.03p)` ticks: 50 at
Push 0, 38 at Push 10. Notch: crew gravity tolerance, 6 humanoid, 10 robot.

**Entry** — how late the nav brakes. A corner takes `50 × (1.6 − 0.06e)` ticks:
80 at Entry 0, 50 at Entry 10. Notch: Nav + 3.

**Reach** — how far off the line the nav may go for money, 0 to 90 offset.
Notch: Grip × 2.

Two ships with identical parts and different cards are two different ships.

### Speed against handling, and gravity

Every corner has a difficulty D from 2 to 9. It demands `D × (0.6 + 0.04e)²` and
your ship supplies `Grip + Nav`. Fall short by n and you **swing wide**: offset
jumps to `20 + 10n` for 60 ticks, you lose `6n` ticks, take `2n` hull, and scoop
nothing for that stretch. Entry 10 saves 120 ticks a lap on a four-corner course
and gives most of it back if you miss two corners, plus the charge. Time is close
to a wash; money is not. That is the seed's quadratic priced in income rather
than in a death check.

Gravity is one thing only: **a tax on your hands**. Taps land
`round(p² / (Grip + Nav))` ticks late — 2 ticks at Push 4 on a nimble ship, 25 at
Push 10 on a heavy one. Push past the crew's tolerance and every tap costs 8 more
ticks and the charge button visibly greys between spends.

**Hull damage is handling damage.** Below half hull, Grip drops 1. At zero, Grip
halves and Reach clamps to 0 — there is no DNF anywhere in this design. A wrecked
heat is a bad race, not a lost season.

**Shields** (0–40) absorb fire and hazard and regenerate one point per two
charge, automatically, under fire. That is what makes damage theft rather than
delay: a ship being shot bleeds income holding its shields up even if it never
loses a place.

**Mounts** — two in Stage 1, three in Stage 2, four in Stage 3. Solar Sail 90
(+25% light on the line), Dark Scoop 110 (+4 dark a well, field damage 4/tick to
1), Rail Lance 130 (18 damage and +20 offset to a rival within three segments, 20
charge), Capacitor 70 (+40 tank), Ablative Plate 60 (+30 hull, −1 Grip), Gyro Rig
120 (+2 Grip, −1 Thrust).

## The track

One course per heat, shared by all three ships. A ring of segments, each 50 ticks
of on-line travel: **straight** (one light node), **corner** (difficulty 2–9, a
light node on the line and a dark well outside), **field** (no line, two dark
wells, 4 hull a tick without a Dark Scoop).

Stage 1 is 12 segments, par lap 620 ticks, three laps — 62 seconds at 30 ticks a
second. Stage 2 is 16 segments, par lap 825, two laps, 55 seconds. Stage 3 is 20
segments, par lap 1030, two laps, 69 seconds. Three laps in Stage 1 is where a
player learns to read a race mid-flight and change their mind on lap two.

**Offset** is the number the race runs on: 0 to 100, one bar with three dots.
Offset 0–15 is on the line — 1.25× speed and 1 charge per 5 ticks. From 15 to 100
the speed multiplier falls linearly to 0.85 and charge stops entirely.

The line is faster and pays light. Leaving it is right because **dark matter
exists nowhere else**: wells sit outside every corner and inside every field, pay
12 dark each (16 with a Scoop), and cost about 40 ticks at offset 60 — roughly 10
ticks of lap and 8 light. The line is speed, the wide is money, and you cannot be
in both places.

**Growth.** Four **seams** are visible from the first heat. A seam states its
type with certainty and its severity as a range: "corner, D 3–8". At each stage
break the generator draws the values and the ring grows, and one stage ahead you
are told which two seams are warming. Reading a seam wrong costs about 120
credits of misbought Grip and 20 ticks a lap for the rest of the run.

**Modifications are things you have to fly.** At a stage break you install one
permanent modification; pilots in the bottom third of the standings install two.
Mods are public, and every mod every pilot owns is on the course in every heat.
Debris Belt 140 (6 hull and +25 offset on the line at one segment), Charge Siphon
200 (halves one segment's light rate for everybody), Beacon Ring 160 (doubles a
segment's light, +2 to its difficulty), Dark Bloom 180 (adds a well outside one
corner). A mod is asymmetric only through your build: a Debris Belt is a purchase
in shields, a Charge Siphon a purchase you make because your card barely spends.

**Placement** is one **marker** per pilot per heat, 25 credits, placed after the
declarations are revealed and hidden until the lights. It halves one segment's
yield for that heat: the informed answer to your own blind guess.

## The economy

Credits persist. Charge lives inside a heat and is four things at once.

**What you sell is what you did not spend.** Solar yield is light scooped minus
charge spent. Boost 25, Vent 30, Brace 15, Lance 20. A clean Stage 1 heat scoops
about 255 light; four taps cost about 90. Dark is scooped, never spendable, sold
whole.

Three pools, one rule: **your cut is the pool times your share of what the field
harvested from it.** Alone you take all of it; three ships in evenly take a third
each. No ordering, no tie-break, no cap — one line in the sim, and one screen
after the heat teaches it without a tutorial.

- **Purse** — set by the heat's card, split by finish, never shared.
- **Solar** — 120 credits, yield is net light.
- **Dark** — 150 credits, yield is dark scooped.

**Declarations.** All three pilots declare **Line**, **Wide** or **Clean**, blind
and simultaneously, then all three are revealed. Line caps your Reach at 2. Wide
requires Reach 6 or more. **Clean** takes you out of both pools for a flat 60
credits — you race the purse alone, and your absence raises the cut of everyone
still in a pool. Clean is what you declare when both pools are about to be
crowded, and it is the fastest ship on the course.

A heat pays 120 to 320 credits. Each stage break pays a 150-credit stipend plus a
100-credit salvage grant to anyone below the cut line. A season is roughly 1,300
credits and a Barge with Nav 4, a Solar Sail and a Capacitor is 550 — a ship you
never reach by spending every stipend on plate.

**Aggression is one tap and no economy.** The Rail Lance costs 20 charge, which
is 20 credits of solar yield, and it costs a rival ticks and forces shield
regeneration out of their tank. There is no bounty pool, no wanted status and no
patrol cutter in the core game — the deliberate cut, argued below.

## The season

Twelve pilots, nine heats each. Twelve become nine become six become three.

Stage 1: three rounds of four heats, then cut the bottom three. Stage 2: three
rounds of three heats, cut the bottom three. Stage 3: two rounds of two heats
among six. Then the **Last Heat** — top three, one race, one Winner's Purse.

**Matching is by inverted thirds**: every heat takes one pilot from the top third
of the standings, one from the middle, one from the bottom. Rank 12 races rank 1
every round, so the pilot who is losing always has a fast reference to stay near.

**Your worst heat in each of Stages 1 and 2 is dropped** before the cut is
ranked. One free disaster a stage is what makes a risky card worth setting in
heat two.

**Scoring** is place plus margin:

```
place    12 / 6 / 2
margin   max(0, S − floor(gap / 30))
```

`gap` is your finish gap in ticks behind the **reference**, and the reference is
whichever crosses first: the heat winner, or the **par ghost** running the
course's published par time. Par is a property of the base course, computed once
at stage open, printed in the garage and drawn as a ghost dot on the track. Mods
do not change par — that rule is what keeps the ghost buildable and knowable.

`S` and the purse split come from the heat's **purse card**, drawn from the
season seed and shown one heat ahead, during the build:

| Card           | Count | S   | Purse     |
| -------------- | ----- | --- | --------- |
| Even Split     | 4     | 8   | 100/55/25 |
| Winner's Purse | 3     | 4   | 130/35/15 |
| Endurance      | 2     | 12  | 80/60/40  |

The formula never changes shape; the card changes two published numbers in it. On
Even Split a win is 20, a second twenty ticks back is 14, a second 250 back is 6,
and a **close third is 10 — beating a distant second**. Winning is strictly best
on every card: the most any loser scores is 14 against 20, 10 against 16, 18
against 24. Eight points a heat across three heats is 24, roughly the gap between
fourth and ninth on the Stage 1 table.

## How the systems connect

Because what you sell is light scooped **minus** what you spent, every tap is
money, and a player watching one bar is watching a bank balance decide whether
this heat buys a place or a payday.

Because declarations are revealed before markers are placed, the shared pool
stops being a thing you read about afterwards and becomes a bet whose settlement
you watch.

Because dark exists only off the line and Reach past `Grip × 2` is an overdrive,
a pilot who wants dark income must buy Grip or Nav, or fly a humanoid and gamble.
The route is paid for in hardware or in variance.

Because Push sets both straight-line pace and how late taps land, the fast build
is worse in the player's own hands.

Because every mod every pilot owns is on the shared course, installing a Debris
Belt is first a purchase in shields for yourself — and the bottom third installs
two, so the track is where a losing pilot turns a bad season into ground the
leaders have to learn.

Because shields regenerate out of charge and charge is solar income, a Lance shot
takes money out of a rival's ledger without taking a place from them.

Because the purse card is shown during the build, the same hardware is priced
differently every week, and the between-heats question is "what does this card
ask" rather than "what is the next upgrade".

## Other players

Public always: standings, points, and every pilot's hull, Nav, Grip, crew type,
mounts and installed mods. Hardware is a slow, expensive, public statement of
what you can do.

Public at reveal, thirty seconds before the lights: all three declarations.

Hidden until they resolve: the flight card, the marker, the tap plan. Your line is
a free, private statement of what you will do this time.

Public after: the full pool split, every route, every pilot, and one line naming
the corner where the card outran the hardware. "You asked Entry 8 of a Nav 3 ship
at the D7 on lap two and lost 24 ticks and a node."

## A worked run

Stage 2, round 2. The card is **Winner's Purse** — S 4, purse 130/35/15. Inverted
thirds draws **Vex Oro** (2nd), **Sabine Kell** (5th) and **Iggy Ndour** (8th).

The 16-segment course carries two mods. Vex installed a **Charge Siphon** on
segment 7, a long straight — Vex flies a Barge with a robot crew, a Solar Sail
and a card that barely spends, so choking the field's light costs Vex less than
anyone. Iggy, in the bottom third, installed a **Debris Belt** on 11 and a **Dark
Bloom** outside 14.

**Declarations.** Vex declares Line, expecting to own solar against a Siphon that
hurts the others more. Sabine declares Line too: she has a Solar Sail and Nav 4,
and a Winner's Purse offers only four margin points, so she has decided this heat
is for money. Iggy declares **Wide**. The reveal shows two on the line and one
alone in the dark.

**Markers.** Iggy, now knowing solar is split two ways and dark is his alone,
halves segment 3 — the biggest light node either rival will reach. Vex, seeing
Sabine on his route, marks segment 3 as well. Two markers stack: the node pays a
quarter. Vex has spent 25 credits doing Iggy's work. Sabine marks the Dark Bloom.

**Cards.** Vex: Push 9, Entry 6, Reach 0 — a robot at Push 9 is inside its notch,
taps land 13 ticks late, three taps pre-set. Sabine: Push 5, Entry 8 against Nav
4 + 3, one point of overdrive, humanoid, gambling. Iggy: Push 6, Entry 5, Reach 7
against Grip 3 × 2 — overdriven on Reach, a roll each time he goes wide.

**The race.** Lap 1: Sabine's overdriven Entry holds at the D5 and fails at the
D8 on segment 9 — wide by 3, 18 ticks, 6 hull, 60 ticks of scooping gone. Iggy
eats his own Debris Belt, as everyone does; he built shields for it and Vex did
not. Lap 2: Vex takes the Siphoned straight at Push 9 and scoops half of very
little, exactly as planned, while Sabine — who needed that straight — nets 31
light where she wanted 60. Iggy takes seven wells.

**The line.** Vex first. Sabine second, 44 ticks back. Iggy third, 190 back.

**The ledger.** Solar 120: Vex banked 148 net against Sabine's 96, so Vex 74,
Sabine 46. Dark 150: Iggy alone, all of it. Purse 130 / 35 / 15. Totals: Vex 204,
Sabine 81, Iggy 165. **Points.** Vex 16, Sabine 9, Iggy 2.

Iggy finished last, took the biggest ledger outside the winner, and scored two on
a card that pays nothing for closeness — so he drops the heat. Vex's Stage 1
Siphon, on the segment Vex least needed, cost Sabine 29 light and about 30
credits without the two ships being near each other; Vex's own marker, laid on a
node Iggy had already chosen, was 25 credits burned. Sabine reads the split
screen, sees she declared into a Siphon that was on the manifest all along, and
switches to a Gyro Rig and Wide declarations. She makes the Last Heat. Vex does
not: Stage 3 deals two Endurance cards, and a Barge winning by 8 ticks scores
what a Runner losing by 30 does.

## What the seed gave us, and what we changed

**Speed and handling trade off non-linearly, as time dilation.** Kept, split in
two because the idea does two jobs: the corner check is the quadratic, and tap
delay is the dilation, landing on the player.

**Acceleration generates gravity, impairing the crew.** Kept, narrowed hard to
late taps and greyed buttons. A global impairment reads on a phone as fog.

**Hull strength.** Kept, altered: hull damage is handling damage, never a DNF.
Losing to a bar emptying is the worst thing that can happen on a phone.

**Shields absorb damage and deflect objects.** Absorption kept and coupled to
income. Deflection dropped: with no collisions there is nothing to deflect.

**Crew has its own health.** Kept as berths, dropped as a bar. Crew is your
hands, which is the only thing it can be that hull and shields are not.

**If the crew dies the nav carries the ship home.** Kept exactly, and made
choosable as the Sealed Hull.

**Humanoid versus robot.** Kept as the fork, expressed as one mechanic:
overdrive. Determinism against variance is two games, not two stat lines.

**Humanoid random luck outcomes.** Narrowed to that single roll. A diffuse luck
stat cannot be read in a race or measured in a harness.

**Robots unaffected by gravity, more health.** Kept: tolerance 10, double berth
health.

**Nav plans better routes, uses gravity assists, improves handling, flies home.**
Cut to three jobs. Nav as a graded route planner is deleted — five levels of
optimiser is not authorable, and a race lost to an invisible plan teaches
nothing. Gravity assists went with it; they need geometry this track lacks.

**The golden path is faster and carries energy.** Kept as the spine, expressed as
offset with a stated speed curve and a charge cutoff at 15.

**Swinging wide is dangerous and slow.** Kept, and given the reason it is
sometimes right: dark exists nowhere else.

**The track grows each phase and hints without certainty.** Kept as seams whose
type is certain and severity drawn, plus one stage of forecast. A hint you cannot
act on is decoration.

**Players modify the track, and mods appear only in the modifier's races.** Kept
in spirit, altered in mechanism: one shared course, everyone's mods on it. You
always fly your own hazard, which is the interesting half. The bottom third
installs two, so the losing pilot brings more ground.

**Pre-race placement.** Kept as one marker, moved after the reveal so it is an
informed answer rather than a blind guess.

**Three players per heat.** Kept unchanged.

**A heat is three laps.** Kept in Stage 1, two after — three laps of a
20-segment ring is a 103-second phone race.

**Winning grants credits.** Kept, and made the smallest reliable part of a heat's
income, which is what forces the rest of the design.

**Collectors, solar and dark matter.** Kept, and made two opposed lines rather
than idle income.

**Many economy routes are shared pools.** Kept as the centre, with one resolution
rule and a declaration step so contest is readable before you commit.

**Aggression, bounties, wanted status, NPC cops.** Kept only as the Rail Lance.
The bounty pool, wanted stars and cutters are parked, not deleted.

**Eliminations by point cutoff.** Dropped for fixed rank cuts, so nobody is
eliminated by arithmetic they cannot see.

**Margin-sensitive scoring with some randomness.** Kept and made the spine. The
randomness is the purse card, shown during the build, so it changes what you
build rather than what happens to you.

## Where it came from

**economy-first, "The Ledger and the Line"** is the base; two of three reviewers
named it. From it: the one-line pool rule; charge as income, speed, shields and
ammunition at once; public rigs against private lines; solar and dark as opposed
routes; typed seams; the marker; the salvage grant; and the discipline of naming
a first playable.

**ship-first, "The Flight Card"** gave the garage — hardware sets ceilings, a
free card says how close to run to them, the ceilings are notches, and passing
one is an overdrive a humanoid rolls and a robot fails. Also hull damage as
handling damage, berths, no DNF, the Sealed Hull, the seam forecast, the Charge
Siphon, and the post-race line naming the corner.

**track-first, "The Line and the Wide"** gave offset as the single number the
race runs on, declare-reveal-place, reaction delay landing on the player's own
taps, and mods you have to fly yourself.

**season-first, "Par and Purse"** gave the season whole: twelve into nine into
six into three, drop your worst heat, inverted-thirds matching, the par ghost,
and the purse card shown during the build.

## What was rejected, and why

**Bounty as a third pool, wanted status, patrol cutters.** Two of three reviewers
said cut it and economy-first said it would cut it first. Three pools, three
defensive concepts and a card is already the phone's ceiling. Parked with a
condition: add it if the harness shows one declaration dominating across seeds.

**Lap-by-lap rotation across three pilots' courses.** Elegant accounting,
unreadable race. One shared course carrying everyone's mods gets the same
interaction for a third of the bookkeeping.

**The Toll Claim.** On a shared course a toll is double accounting on top of a
mod. Mods you have to fly are the better version of the same idea.

**A margin divisor drawn per heat and announced afterwards.** A target you learn
after the fact is not a target. Fixed at 30 and published.

**The throttle dial with lap time `1200 − 105t`.** The systems review showed
maximum throttle always wins on time and the trade is really a death check. The
Entry dial replaces it and prices the trade in income.

**Lengths as the scoring unit.** One twenty-fifth of a lap drifts 67% across a
season. Ticks are ticks.

**The trailing pilot hosts.** Good recovery, but a leader never flies their own
purchases. Replaced by mod slots that scale with standing.

**The Steward's bonus.** A fifth scoring category, often the cut line, and
invented rather than seeded.

**Ships as six sliders rated 1 to 5.** Nothing on the ship has a face.

**Shared pools by crossing order, 100/60/30.** It costs the leader nothing, which
inverts the seed's whole economic idea.

## Decisions for the owner

1. **Is cutting the bounty economy right, or does aggression need to be a route
   somebody builds for?** If it does, the design regains a pool, a wanted counter
   and a cutter, and legibility pays for all three.
2. **Should the purse card change `S` and the split, or only the split?** Two
   numbers sharpen each week's question; one keeps the arithmetic identical.
3. **Is a par ghost worth explaining?** It stops slow heats being farmable and
   gives the harness an absolute yardstick, for one more number on the screen.
4. **Three laps in Stage 1, or two everywhere?** Three is where a mid-race read is
   possible; two everywhere makes every heat the same shape.
5. **Should the flight card be visible to rivals?** Hidden cards make the
   declaration a real bluff; visible cards may make the grid solvable.
6. **Is the Sealed Hull a real archetype or a fourth thing to explain?** It is the
   seed's crewless ship taken seriously, and a build most players will never pick.
7. **Does the bottom third getting two mod slots feel like help or charity?** It
   is the whole recovery lever besides the dropped heat.
8. **Nine heats and twenty minutes, or six and thirteen?** The margin rule needs
   heats to compound across; a phone session may not have them.

## Next round

Two jobs.

**Develop the garage.** This framework has a clean race and a clean season and
the thinnest treatment of the thing you do between them. Six mounts and four
hulls is not a build space with directions in it. The next round should propose
the parts list, the price curve, and three or four archetypes a harness can play
against each other — and say what a player buys in Stage 1 that only pays in
Stage 3.

**Challenge the declaration.** Every reviewer loved declare-reveal-place, and it
is the one mechanic here nobody has stress-tested. Is Clean a real third option or
a trap? Is the heat solved at the reveal? A round that tries to break the
declaration step — and one that proposes a version with no declaration at all,
where contest is read only from public hardware — would tell us whether the bet
is the game or the scaffolding.

The number to measure first: the dark pool at 150 against solar at 120. If Wide
pays better than winning, the race stops being a race. Every proposal in this
round independently pointed at that dial.
