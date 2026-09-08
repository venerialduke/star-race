# The Flight Card

## Premise

You do not fly the ship. You build a machine and you tell it how brave to be.

Everything here hangs off one idea: a ship is hardware that sets ceilings, and a
**flight card** that says how close to those ceilings the ship will run. Hardware
is expensive and slow to change. The card is free and changes every heat. That
split gives the player a plan three heats in the making and a dial they can move
in ten seconds before the lights.

The seed's tensions live in that split. Speed against handling is the card asking
the nav for a corner it cannot make. Acceleration against the crew is the drive
shaking the crew so hard they cannot work the systems you bought them. Aggression
against attention is charge spent on a rival instead of on your own lap.

## The ship

A ship is a **hull**, a **drive**, a **nav**, **shields**, **crew berths**, and
up to two **modules**. Everything has mass. Base hull is 400 mass; a bare
competitive ship runs 600–900.

Two numbers come out of the build and everything else follows from them.

**Acceleration** = thrust ÷ mass, in u/tick². Drives: tier-1 400 thrust (80 mass,
120 cr), tier-2 700 (110 mass, 420 cr), tier-3 1,150 (140 mass, 1,050 cr). At 800
mass a tier-2 drive gives 0.875.

**G-load** equals acceleration while the drive is lit. G is not damage; G
**throttles the crew**. The ship may spend charge once every `4 + 16 × (G ÷
G-tolerance)` ticks, capped at 24. A humanoid berth tolerates 1.0. At 0.4 G a
crew acts every 10 ticks; at 0.9 G, every 21. A ship that accelerates hard is a
ship whose crew is pinned to the couch.

**Handling** is grip, 1–18, bought on the hull and raised 1 per 2 points of nav.
A segment has tightness T. The ship holds the golden path only if

    handling ≥ T × v² / 12          (v in u/tick)

At 3 u/tick a sweep (T=3) needs 2.25 grip. At 5 u/tick the same sweep needs
6.25, and a hairpin (T=8) needs 16.7. That is the seed's non-linear curve, and
it is why the last half-unit of speed costs more than all the rest.

**Nav**, 1–10, does three jobs. It adds handling. It sets how far the card may
be overdriven before the machine is lying. And if the crew dies it flies the
ship home. Tier-1 nav is 3 (25 mass, 100 cr), tier-3 is 9 (50 mass, 980 cr).

**Charge** is the single race resource. The golden path pays it out; the crew
spends it. Three buttons, and they are the only taps a race asks for:

- **Burn** — 8 charge, 60 ticks of +25% thrust. Faster, and the G spike gags the
  crew for the duration.
- **Strike** — 10 charge, 12 kinetic damage to a rival within 200 u, +1 wanted.
- **Brace** — 5 charge, 40 ticks of doubled shield regen and full G immunity.

**Three defensive layers, each against a different thing.** Shields (0–40, regen
1 per 8 ticks) stop kinetic: debris, mines, Strikes. A shielded hit is deflected
and the object is gone. Hull (0–100) takes what shields miss, and hull damage is
**handling damage**: below 50% hull, grip drops 30%. A ship never explodes; it
loses the ability to hold a corner. Crew is **berths**, 2 to 4, 15 mass each,
killed by radiation fields and sustained G above 1.4. Each berth is 25 charge
capacity, and only crew can spend charge. Objects hit shields, attrition hits
your line, radiation hits your options.

**Crew type is the fork, not a stat swap.** Humanoid berths take G and can
improvise. Robot berths ignore G entirely, have double the health, and cannot
improvise. Improvisation is the whole difference. When the card asks for more
than the nav supports — **overdrive** — a robot fails, every time, identically. A
humanoid passes with probability `0.5 − 0.1 × overdrive` from the seeded
generator. A robot ship is a machine you tune to its exact ceiling and it
delivers that number nine heats running. A humanoid ship is one you push past its
ceiling and gamble on. Two different games, both legitimate.

**Crewless is a build.** If every berth dies, the nav clamps all three dials to
its own rating and flies on: no Burn, no Strike, no Brace, no harvesting. That is
a degraded state — and also the **Sealed Hull**, built with no berths at all. It
sheds 60 mass and life support, gains +25 hull, is immune to G and radiation, and
earns nothing but finishing position. It has to win, not place.

**The flight card** is three dials, 0–10, set in the garage in ten seconds.

- **Entry** — how late the nav brakes. Entry 0 corners at 60% of the grip limit.
  Entry 10 corners at exactly the limit with no margin.
- **Push** — thrust on straights, 40% to 100%. Push is the G dial.
- **Line** — how far the nav may drift off the golden path to carry speed
  through a corner, 0 to 90 u.

A dial is overdriven when it exceeds a hardware number: Entry above nav+2, Push
above the crew's G-tolerance ceiling, Line above handling ÷ 2. The garage draws
each ceiling as a notch on the slider. Two players with the same parts and
different cards are two different ships.

## The track

A course is a closed loop of **segments**. Segment types: straight (T=0), sweep
(T=3), hairpin (T=8), **gravity well** (a body a nav ≥ 5 can slingshot for +18%
exit speed), and **field** (debris that costs shields, or radiation that costs
berths). The opening loop is 8 segments, 1,200 u. A heat is 3 laps, 3,600 u, and
at a typical 3 u/tick that is 1,200 ticks — **60 seconds at 20 ticks per second.**

**The golden path** is a ribbon down the middle of the racing line. On it, a ship
runs 12% faster and scoops 1 charge per 4 ticks. Off it, no charge and −12%
speed, and the nav takes 20 ticks to reacquire. Three things make leaving it
right:

1. **Collector nodes sit off it.** Solar blooms sit 40 u wide; dark-matter wells
   sit 90 u wide. Passing through one banks season credits.
2. **The path is a shared pool.** Each segment's charge holds three shares. The
   first ship through scoops at full rate, the second at 60%, the third at 30%.
   A segment regrows over 120 ticks. Running third into a corner, the ribbon is
   already stripped and the wide node is worth more than the line.
3. **Mines and debris are placed on it**, because that is where everyone is.

**Growth.** The track gains 150 u and two segments each phase: 1,200 → 1,350 →
1,500. Ships get faster across the season, so the lap grows to keep a heat at
about a minute. Growth happens at two **seams** in the belt, both visible from
the first heat. A **cold seam** grows sweeps and gravity wells; a **hot seam**
grows hairpins and radiation fields. After each phase you are told which seam is
warming — one phase of forecast, character but not shape. Reading it wrong costs
roughly 15% of pace for a phase: you bought grip for hairpins and got a long
sweep where your top speed is short. Painful, not fatal.

**Mods** are permanent track changes bought in the garage, two slots, applying to
every ship in your heats. A mod is not a self-buff; it is a course you are
already shaped for.

- **Slingshot Buoy**, 180 cr — adds a gravity assist to a sweep. Nav ≥ 5 gets
  +18% exit; below that, the mass shadow costs 4% speed.
- **Debris Seeding**, 140 cr — kinetic junk on one segment's path, 6 damage a
  hit. You eat it too. You brought shields.
- **Charge Siphon**, 200 cr — halves a segment's charge rate. Chokes the field.
  You built a robot crew that barely spends.
- **Cop Post**, 120 cr — a patrol parks on a segment and scans anyone at wanted
  ≥ 2 for a 25-tick penalty. You run clean.

**Placement** is per-heat and consumable: up to 2 **mines** (60 cr each, 18
kinetic damage) placed on segments before the lights, blind to what the others
placed, resolved simultaneously.

## The economy

Credits, banked between heats.

- **Finish:** 1st 300, 2nd 200, 3rd 120. Last place still earns; the season is
  not a death spiral.
- **Collectors** are modules: Solar Scoop (40 mass, 90 cr) banks 8 cr per solar
  node crossed; Dark-Matter Trawl (70 mass, 160 cr) banks 25 cr per dark well,
  which sit twice as far off the line. Nodes are shared pools on the same
  3-share rule as the path: 100%, 60%, 30%, in crossing order.
- **Bounties:** a Strike that costs a rival 20+ ticks of pace pays 60 cr and +1
  wanted.
- **Salvage:** finishing 3rd banks an extra 60 cr.

**How you learn a pool is contested, before rather than after:** the pre-heat
grid shows your opponents' hulls, mass class and **collector loadout**, because
collectors bolt to the outside. It does not show their card, crew type or mines.
Two trawls on the grid means the dark wells will be stripped and the blooms are
yours alone.

**Wanted** runs 0–5, decaying 1 per clean heat. At wanted ≥ 2 an NPC patrol joins
your heat as a non-racing fourth ship shadowing the field's highest-wanted
player. Every 100 ticks it scans: `10 × wanted` ticks of pace lost unless the
crew spends 3 charge to spoof. At wanted 5 it also takes half your bounty income.
Aggression is right when you are light and charge-rich so spoofing is cheap, when
rivals carry collectors so a pace loss costs them nodes as well as points, and
when you need a rival to miss the cut more than you need 300 credits.

**Why save.** Parts come in tiers: 80–200 cr, 350–600 cr, 900–1,400 cr. Tier-3
is unlocked only in phase 3. Skipping tier-2 entirely means a slow phase 2 and a
drive in phase 3 that nobody can answer — if you survive the cut to spend it.

## The season

**12 players, 3 phases, 3 heats a phase, 9 heats per player.** Each heat is 3
ships, redrawn every round. Nine minutes of racing plus nine garage stops of a
minute or so: a **22-minute run**.

Cuts are by total points: after phase 1, 12 become 6; after phase 2, 6 become 3.
Phase 3's three survivors race each other three times, and the season ends as a
rivalry. Points carry across phases.

**The margin rule.**

    3rd place:  3 points
    2nd place:  6 points
    1st place: 10 points

    Any non-winner within d ticks of the winner adds  max(0, 4 − floor(d / 25))
    The winner adds                                   2 + min(4, floor(gap to 2nd / 25))

So a heat is worth 3 to 10 if you lose and 12 to 16 if you win. Losing by 10
ticks is worth 10 — the value of a bare win, never more. Dominating is worth 16.
Winning is always strictly better than not, and staying close is worth three
times being dominated. Over nine heats, a player who is always 2nd by 15 ticks
scores 90; one who is always 2nd by 120 scores 54. That 36-point gap is three
wins wide, and it is exactly what decides the cuts. The seed's "those margins
could add up and give you an extra stage" is that number.

**Recovery** is economic. A bad heat costs 9 points and leaves you a bigger
wallet than the leader — salvage plus money you did not spend on mods. The
comeback lever is a part, not a dice roll.

## How the systems connect

- Because acceleration is thrust ÷ mass and G is acceleration, **a player who
  bolts on a Dark-Matter Trawl must either accept slower acceleration or fit a
  bigger drive, and the bigger drive raises G until the crew is throttled too
  hard to work the trawl they bought.** The collector taxes itself.
- Because collectors are visible on the pre-heat grid and flight cards are not,
  **a player who sees two trawls must decide, before the lights, whether to take
  the solar blooms alone or fight for a 30% dark share.**
- Because a track mod applies to every ship in the modifier's heat, **a player
  who seeds debris must buy shields for their own ship first, spending the mass
  and credits that would otherwise have bought pace.**
- Because the seam forecast names the character of the next phase one phase
  early, **a player must spend phase-2 credits on hardware that only pays in
  phase 3, while rivals spend the same credits on pace now.**
- Because points are margin-sensitive, **a player who is losing a heat must
  choose between a Strike worth 60 credits and a Burn worth 30 ticks and 2
  points** — and 2 points, nine times, is a cut.
- Because a crewless Sealed Hull clamps its card to its nav and cannot harvest,
  **that player must win rather than place, and must therefore buy nav and drive
  first and live without an economy.**

## Other players

Public before a heat: hull silhouette, mass class, collector loadout, wanted
level, current points. Private: the flight card, crew type, mines, credit
balance. Public after: everyone's finish gap, everyone's off-path count.

A rival changes your race four ways. They strip a shared pool ahead of you. They
Strike you, costing pace and forcing shields you did not want. They bring a mod
that reshapes your heat's course. And their points total tells you whether to
beat them or merely stay within 25 ticks.

## A worked run

**Phase 1, heat 2. Vetch, Orrin-9 and Kesta.**

Vetch runs 4 humanoid berths, tier-1 drive, 12 shields, nav 3, and a card of
Entry 6 / Push 8 / Line 2. Overdriven Entry by 1, gambling. Orrin-9 is 3 robot
berths, tier-1 drive, nav 5, handling 9, a card of Entry 7 / Push 10 / Line 0 —
every dial exactly at its notch. Kesta carries two Solar Scoops, nav 4, handling
6, and a card of Entry 4 / Push 5 / Line 7.

The grid shows Kesta's scoops. Vetch and Orrin-9 both leave the blooms alone;
there is no share worth taking from a player who will be there first. Kesta banks
96 cr unopposed.

Lap 1, the hairpin. Orrin-9 takes it at the exact grip limit, every lap,
identically. Vetch, one point of overdrive, passes the roll on lap 1 and fails on
lap 2 — runs wide 60 u, loses 14 ticks and the segment's charge. Kesta, cornering
at 40% margin, is slow and never off the path once.

Lap 3, Vetch has 11 charge and is 40 ticks down. Strike or Burn. He Strikes
Orrin-9 for 12 kinetic; Orrin-9's 8 shields absorb 8 and the hull takes 4. Not
enough to cost 20 ticks, so no bounty — and Vetch is now wanted 1 for nothing.
Orrin-9 wins by 22 ticks over Kesta, who is 31 ticks up on Vetch.

Points: Orrin-9 12, Kesta 6+4 = 10, Vetch 3+2 = 5. Vetch spent his charge on
aggression and lost 5 points he could have bought with a Burn.

**The phase break.** Kesta, sitting on 96 collector credits plus 200, buys a
**Charge Siphon** on the hairpin segment for 200 cr. It is a self-harming mod on
its face: she loses charge too. But her card spends almost nothing — she has no
Strikes to fire and rarely Burns.

**Phase 2, heat 1.** Vetch is drawn against Kesta. On Kesta's course the hairpin
pays half charge. Vetch's whole plan was Burn out of the hairpin twice a lap; he
arrives at the second exit with 6 charge instead of 9 and cannot fire it. He
finishes 3rd, 84 ticks back, for 3 points, and misses the cut to phase 3 by 4.
**Kesta's garage purchase, three heats earlier, ended Vetch's season without her
ship ever touching his.**

Orrin-9 wins phase 3 on consistency: nine heats, no variance, no off-path ticks,
and 118 points.

## What it keeps from the seed, and what it drops

**Developed.** The speed/handling curve became the grip inequality `handling ≥ T
× v² / 12`, and "less reaction time" became a thing a self-flying ship can lack:
margin to the limit, set by Entry. Acceleration-generates-gravity became a
throttle on charge spending rather than a second health bar. The three defensive
layers were given three distinct threats, and hull damage was rerouted into
handling so it is felt as lost line rather than a bar emptying. Humanoid versus
robot became determinism versus variance under overdrive — the only crew choice
worth a fork. Nav got three jobs and became the most load-bearing part on the
ship. The golden path got three real reasons to leave it. Track mods became
symmetric in geometry and asymmetric in preparation, the only version that is not
a private buff. Shared pools got the 100/60/30 rule and, more importantly, got
**read before committing** via visible collectors. Margin scoring got a formula
that provably never makes winning worse.

**Altered.** "No certainty" about growth became one phase of forecast on
character; a hint you cannot act on is not a decision. Per-heat point cutoffs
became rank cuts at phase boundaries, so nobody is eliminated mid-phase by
arithmetic they cannot see.

**Cut.** Hull as traditional health: a ship never explodes and there is no DNF
from damage. It is a bad race, not a lost one. A separate crew health bar,
replaced by berths, legible as four icons going dark. And ships fighting for the
same line — no collision, no blocking, per the brief.

## What it needs from the owner

- Is the flight card enough agency, or does not steering feel like not playing?
- Robot means "I know exactly what I get." Is a variance-free build satisfying to
  a phone player, or does it need a shape of its own beyond consistency?
- Should collector loadouts be public? It makes phase 1 legible and may make it
  solvable.
- Is 22 minutes and 9 heats the session, or is 15 minutes and 6 heats the real
  target?
- Should losing players get cheaper parts, or only more unspent credits?
- Does aggression need to be strong enough that somebody builds for it, or is it
  fine as a tool three players a season reach for once?

## Risks

The flight card could read as a settings screen rather than a decision. It needs
the notches on the sliders to be the centre of the garage, and the post-race
report to name the exact corner where the card outran the hardware.

Three layers is still three. If berths carry too little, radiation fields are the
first thing to grow.

Visible collectors could collapse phase 1 into a solved metagame where nobody
contests a node. If so, reveal collectors at lap 1 instead — late enough to react
to, too late to have built for.

Mods could snowball: the leader buys mods, mods win heats, the leader buys more.
Two slots and permanence are the brake; if that is not enough, mods should cost
points as well as credits.

The margin rule could compress the field until cuts feel like coin flips. The
25-tick bucket is the knob; widen it to 40 and the field spreads.
