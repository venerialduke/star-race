# Par and Purse

## Premise

Twelve pilots enter a season. Nine heats later, three are left and one wins.

Every heat is three laps with three ships. You do not score for placing. You
score for how far behind the reference line you finish, in lengths, and the
reference is whichever crosses first: the heat winner, or a pace ghost running
the published par time. Two lengths back is worth most of a win. A lap back is
worth nothing.

Before each heat you are shown the purse card that will pay it out. One card
pays heavily for winning and almost nothing for closeness. One pays modestly for
winning and generously for anyone still in the picture. You see it during the
build minute, so the card is not a dice roll on your race — it is the question
your build answers this week.

Everything hangs off that. The ship is built to hit a number of lengths. The
track is where lengths are won and lost. The economy is what you sell lengths
for when you cannot win. And the pilot in last place hosts the race on a course
they modified, which is how a season that eliminates people still lets someone
climb back.

## The ship

A ship is a hull, a crew, a nav core, and mounts. Four numbers on the card:
**Thrust** 1–10, **Grip** 1–10, **Hull** 20–60, **Shield** 0–30. Plus crew HP
and crew type. You start with Hull 30, Shield 8, Thrust 5, Grip 5, a Tier-1 nav
core, and one mount slot. Slot two unlocks in phase 2, slot three in phase 3.

Speed and handling trade off through corners. Every segment has a **hold
number** H from 10 to 90. Entering a corner, the sim checks `v² / 400` against
`Grip × H / 10`. If speed wins, the ship **swings wide**: it leaves the golden
path for that corner, loses 6% of its speed, takes hull damage equal to the
excess, and collects no energy. Quadratic in speed, linear in Grip — going 40%
faster demands 96% more Grip. That is the time-dilation flavour, one comparison
per corner.

What the player chooses is the **Line dial**, set in the garage from 1 to 5.
Line 1 enters every corner well under the ceiling: it never swings wide and it
is 4% slower a lap. Line 5 enters at the ceiling every time, fastest when the
ship is built for it, a disaster when it is not. That is the whole of "less
reaction time for a ship that flies itself": you set how much margin the
autopilot leaves, once, then watch it hold or skate.

Acceleration is a cost too. Under thrust the crew's **strain** rises by
`Thrust / 10` per tick and decays 1 per tick coasting. Above 60 the crew is
**pinned**: actives cost double energy and Instinct drops to zero. Above 90 they
take 1 HP per 30 ticks. A Thrust-8 ship burning out of a hairpin for 100 ticks
adds 80 strain, so the price of a big exit is that you cannot tap for the next
few seconds. The bar redlines exactly when the ship looks best.

Crew is a real fork. A **humanoid crew** has 30 HP, is fully exposed to strain,
gets four taps a heat, and has **Instinct**: once a lap, when the ship would
swing wide, a seeded roll at 40% (falling to 0% as strain climbs from 30 to 60)
saves the line. A **robot crew** has 50 HP, ignores strain, gets two taps, and
never rolls Instinct. Humanoid is a hands-on Thrust-6 Line-4 build that spends
taps buying back mistakes. Robot is a set-and-forget Thrust-9 Line-5 build that
either works or does not.

The three defensive layers earn their place because each answers a different
attacker. **Shield** stops other players and loose debris, and regenerates 2 per
100 ticks when unhit — it is the layer that comes back. **Hull** absorbs the
track: wide scrapes, debris, cop fire. It never regenerates in a heat, and at
zero the ship does not explode, it halves Thrust for the rest of the race.
**Crew** takes strain and radiation only, never impact. Shield is other people,
hull is the track, crew is your own throttle. At zero crew the ship races on,
under the nav's **Auto Line** of 2, with no taps, no dark matter and no
Instinct. That is a degraded state and also a build: the **Drone Hull** carries
no crew at all, +8 Hull, zero taps, Auto Line 4 — cheap, never redlines,
reliably four to six lengths back, which on the right purse card is a living.

The nav core is what makes the rest of the game readable. Tier 1 is free: Auto
Line 2, no assists. Tier 2 costs 250 cred: Auto Line 3, one gravity assist a
lap, +1 Grip. Tier 3 costs 700: Auto Line 4, two assists, +2 Grip, and it
**reads one track spur a phase early**.

Mounts, one to three slots: Solar Collector 60, Overburn 80 (active: +40% Thrust
for 180 ticks, triple strain), Ablative Plate 90 (+15 Hull, −1 Grip), Field
Bloom 100 (+12 Shield, double regen), Dark-Matter Rake 110, Gyro Rig 120 (+2
Grip, −1 Thrust), Ghost Baffle 130 (wanted decays 3× faster), Grapple Lance 140.
Every ship also has **Tuck** free: one tap, 400 energy, drops Line by 2 for 300
ticks — how you guarantee the hairpin on lap three.

## The track

A course is a closed loop of segments in four kinds. **Straights** hold at 90.
**Bends** hold 30 to 60. **Hairpins** hold 10 to 20. **Fields** have no hold
number and carry hazard and resource nodes. Phase 1 is 12 segments and 3,000
units; phase 2 is 16 segments and 4,000; phase 3 is 20 and 5,000. A **length**
is always one twenty-fifth of a lap, so the scoring unit survives the growth.

Down the middle of every segment runs the **golden path**. Ships on it move 8%
faster and draw energy: the path pays 3 energy per tick, split evenly among the
ships on it, remainder to whoever is ahead. A lap's pool is exactly 2,700, so
three ships each get a third of what one ship gets alone. That is the shared
pool, and you feel it the instant a rival tucks in beside you and your rate
readout drops from 3 to 1.

Leaving the path is right for one reason: **dark matter only exists off it**.
Six dark-matter nodes sit in the wide lines of every lap, 20 cred each, taken by
the first ship through and gone for the rest of the heat. The golden path is
faster and pays energy you must share; the wide line is slower and pays credits
nobody splits with you. Swinging wide is sometimes a plan.

The track grows on its own. Every phase-1 map shows four **spur points** as
dotted arcs, each labelled with a certain class: TIGHT, LONG, or FIELD. Two of
the four open in phase 2, and which two is drawn from the season seed. The hint
is real — you know exactly what a TIGHT spur will demand of your Grip — and so
is the uncertainty. Building Grip for two TIGHT spurs that never open costs 4%
of pace for three heats, about two lengths and four points a heat. A Tier-3 nav
reveals one of the two a phase early. That is what 700 cred buys: not speed,
certainty.

Players change the track with **Track Writs**, one a phase, 200 cred, permanent
and living in _your_ copy of the course. A **Slingshot Buoy** grants +40 units
to any ship passing within a length at Line 3 or higher. A **Debris Drift** does
6 hull per pass to any ship off the golden path. A **Bloom Node** adds 900
energy to the lap pool and one extra dark-matter node.

A writ is not a private self-buff because you only race your own course when you
**host**, and the host is the pilot in the heat with the fewest season points.
The trailing pilot brings the track; the leader always races away from home. So
a writ is bought by someone who expects to be behind, and home advantage is
handed to the underdog by rule.

Before the start the host places two **Markers** and the other two pilots one
each, all visible to all three. Markers cost 25 cred, three held at a time: a
**Mine** does 10 hull to the first ship through off-path, a **Beacon** gives +30
energy to the first ship through on-path, a **Scan Bloom** reveals both rivals'
Line dials. One tap each.

## The economy

The currency is **cred**. You start a season with 150.

Heat points convert at 1 point to 3 cred, so a strong heat pays 39 to 54. A
Solar Collector converts surplus path energy at 10:1, capped at 90 cred a heat.
A Dark-Matter Rake pays 20 a node, and a good off-path heat takes five or six of
the eighteen available, so 100 to 120. A Grapple Lance hit pays 8 and adds 1
wanted. Typical income is 120 to 160 cred a heat, about 1,100 a season.

That number is chosen so you cannot have everything. Tier-3 nav at 700 is nearly
two thirds of a season; a three-mount kit plus two writs is about 550. Both big
purchases have a _window_. Tier-3 nav is only worth its price before phase 2,
while there is still a spur to reveal. A writ is only worth its price if you
expect to host, which the standings tell you after a cut. Buy nav early and race
underequipped but sighted; buy writs late and convert desperation into home
advantage.

Shared pools resolve two ways on purpose. Path energy is **congestion-diluted**:
everyone gets a share and the share shrinks. Dark matter is **winner-take-all**:
the node goes to whoever gets there first. A rival on your line costs a third of
your energy; a rival on your wide line costs everything on that node. You learn
how contested a route is twice — before, from the lobby's livery tags, and
during, from the energy readout dropping the moment someone joins you.

Aggression is priced in **wanted status**, a season counter 0 to 10 decaying 1 a
heat. At wanted 3 or more a **Patrol Cutter** ghost joins your heats, flies the
golden path at par, and fires only on you: 10 hull a hit, one hit per 120 ticks,
within 4 lengths. Its effect is not damage, it is eviction — it makes the golden
path unlivable for you, costing 8% pace and your whole energy share, and pushes
you into dark-matter lines you may not be built for.

## The season

Twelve pilots. Nine heats. Three laps a heat. A heat at par is 2,700 ticks in
phase 1, 3,600 in phase 2, 4,500 in phase 3, at 60 ticks a second: 45, 60 and
75 seconds. With a build minute between, a full season is about twenty minutes.

Phase 1 is three rounds of four heats. Phase 2, after the bottom three are cut,
is three rounds of three. Phase 3, after another three go, is two rounds of two.
Then the **Last Heat**: three pilots, one race. Twelve into nine into six into
three, every count divisible by three.

**Scoring.** When the reference line finishes, every ship's gap to it is
measured in lengths and floored. Points are `max(0, S − gap)`, plus `W` if you
won. Because the reference is the winner or the par ghost, whichever crosses
first, a slow heat is not farmable — the ghost sets the floor — and a fast heat
pays everyone more, because staying near a genuinely quick winner is hard.

`S` and `W` come from the **purse card**, revealed one round ahead. A season
holds four **Even Split** (S 9, W 4), three **Winner's Purse** (S 5, W 12) and
two **Endurance** (S 16, W 2), shuffled by the season seed. On Even Split a win
is 13 and a photo-finish second is 8. On Winner's Purse a win is 17 and a second
two lengths back is 3. On Endurance a win is 18 and a ship ten lengths back
banks 6. The win bonus guarantees winning is strictly best inside every heat,
but the shape of the second-place curve changes completely, and you know which
shape you are racing before you spend a cred.

That is where margins compound. A pilot finishing third but four lengths back
scores 5, 1 and 12 across the three cards: 18 points from three losses. A pilot
who wins one Even Split and is buried twice scores 13, 0 and 0. Staying in it
beats a win and two collapses, and over nine heats that is one or two phases of
survival.

**Recovery** has three legs. Your worst heat in each phase is dropped before the
cut is ranked, so phases 1 and 2 are best-two-of-three and one disaster is free.
Matchmaking is inverted: each heat takes one pilot from the top third of the
standings, one from the middle, one from the bottom, so rank 12 races rank 1
every round and is never starved of a fast reference to stay close to. And the
trailing pilot hosts, on their own track, with their writs and two of the four
markers.

The Last Heat is a Winner's Purse with a stagger: the points leader starts on
the line, each other finalist `(leader − their points) / 4` lengths back, capped
at 6. The season matters and it is not a coronation.

## How the systems connect

Because dark matter only lies off the golden path and path energy is split
three ways, the player must decide before the heat whether they are racing for
lengths or for cred — and a rival who makes the same call halves both.

Because aggression raises wanted and the Patrol Cutter evicts you from the
golden path, the player must build a dark-matter kit to survive their own
bounty income, which means picking up the Lance also means picking up the Rake.

Because the Winner's Purse pays 12 for a win and nearly nothing for second, the
player must decide on those three heats whether to spend 140 cred and a mount
slot on a Grapple Lance whose 8% slow for 200 ticks is worth about five
lengths — enough to convert a 3 into a 17, and dead weight on Endurance cards.

Because the two spurs that open are drawn from the seed and a Tier-3 nav reveals
one a phase early, the player must choose between 700 cred of certainty and 700
cred of parts, and live with a Grip build that was right for a track that never
came.

Because the pilot with the fewest points hosts the heat on their own modified
course, the player must decide whether to buy a Track Writ while they are
losing — and a leader must build a ship that is robust on other people's
tracks, not optimal on their own.

Because strain rises with Thrust and pins the crew above 60, the player must
choose between a Thrust-9 robot that never taps and a Thrust-6 humanoid that
taps four times a heat, and that single choice decides whether their Line dial
is a plan or a gamble.

## Other players

Between heats you see every pilot's season points and wanted status, plus their
**livery tags** — icons for each mount they have used in a heat you raced in. A
rival you have never met shows three question marks, which is itself
information: an unknown field is a field you cannot price.

In the pre-race lobby you see the host's course with every writ and all four
markers on it, and you place your own marker last if you are the lowest-ranked
pilot present. During the race your energy rate tells you how many rivals are on
your line without a scoreboard. After it, a six-line sheet: gap to reference,
energy taken, dark matter taken, hits landed and received, peak strain, wide
swings.

The eleven rivals are bots with declared archetypes — Collector, Bruiser,
Line-Runner, Endurance — shown on the ladder. You know what a Bruiser will do to
you. You do not know when.

## A worked run

The field: **Vess** (the player), **Odile Kray** (Line-Runner), **Pomp**
(Bruiser), **Sable Ng** (Collector), and eight others.

Round 1's card is Even Split. Vess takes a humanoid crew, Line 3, and spends 60
of her 150 cred on a Solar Collector. She finishes second, three lengths back: 6
points, plus 88 cred. The map shows two TIGHT spurs and two LONG. Round 2 is a
Winner's Purse; she cannot win it, scores 1, drops to rank 9. Round 3 is
Endurance; she nurses Line 2 to 5 lengths back for 11. Best two of three: 17.
She clears the cut at rank 8 with 240 cred.

Phase 2 opens the two TIGHT spurs. Ranked low, Vess hosts every round. She
spends 200 on a **Debris Drift** writ in the widest bend of her course and slots
a Gyro Rig for the hairpins.

Round 5, Even Split: Vess (host, rank 8), Sable Ng (rank 5), Pomp (rank 2). Pomp
is at wanted 6 from two heats of Lance work, so a Patrol Cutter owns the golden
path and he runs wide for two full laps — straight through Vess's Debris Drift.
He eats 18 hull, hits zero on lap three, halves Thrust, and finishes 11 lengths
back for 0. Vess wins by two lengths for 13. Pomp's dropped heat is already
spent; he is cut at the end of the phase. One player's 200-cred purchase, made
from eighth place, ended a second-place pilot's season.

Vess enters phase 3 at rank 4 of 6 with 310 cred. She buys a Field Bloom rather
than a second writ, because Odile Kray shows a Lance in her livery tags and the
final is a Winner's Purse. Round 8 is Endurance: 6 back for 10, third held. She
reaches the Last Heat 9 points behind Odile and starts two lengths down. Odile
lances her on lap one; the Field Bloom eats it. Vess Tucks through the phase-3
hairpin at Line 5 and takes the line by one length.

Final standings: Vess, Odile Kray, Sable Ng.

## What it keeps from the seed, and what it drops

Developed: the margin rule the notes flagged as the open problem is now the
spine — `max(0, S − gap) + W`, measured against a par ghost so closeness cannot
be farmed in a slow heat. The randomness the notes wanted is the purse card,
drawn from the seed and shown before the build, so it changes what you build
rather than what happens to you. Kept whole: three ships, three laps, the golden
path as a congestion-split energy pool, solar and dark matter pulling in
opposite directions, aggression paid in wanted status with cops that evict
rather than kill, a track that grows with hints certain in shape and uncertain
in arrival, speed against handling as a quadratic corner check, acceleration as
a strain bar that costs taps, and hull, shields and crew given three separate
attackers so they are three ideas, not three health bars.

Altered: track modification. The notes had mods apply only in the modifier's
races, which is a private self-buff. Here the trailing pilot hosts, so mods are
bought by losers and met by leaders, and the idea becomes the recovery
mechanism. Crew death, left ambiguous, is now both a degraded state and a
deliberate build.

Dropped: gravity assists as a player-facing system, folded into the nav core
because a third thing to route around does not fit on a phone. Navigation
planning is compressed into two numbers, Auto Line and the Line dial. Humanoid
"random luck outcomes" narrows to Instinct alone, because a diffuse luck stat
cannot be read in a race or measured in a harness.

## What it needs from the owner

Is nine heats in twenty minutes the right session, or should a season be six
heats and fifteen minutes with two phases instead of three?

Should the purse card multiset be fixed at four Even, three Winner's, two
Endurance and only its order drawn — or should the mix itself vary by season?

Is the host rule fair or infuriating? Being handed home advantage for losing is
a strong claim and you may hate it.

Should the Last Heat's stagger exist at all, or should the final be a clean
three-way race with the season deciding only who is in it?

Is Instinct — a visible seeded coin flip that saves a corner — exciting or
cheap?

Should a pilot cut in phase 1 be able to re-enter, or is elimination final?

## Risks

The rule asks the player to read distance, not position. If the HUD cannot show
"4 lengths back, worth 5 points" clearly on the last lap, the tension evaporates
and it reads as an ordinary race with strange numbers afterwards.

Endurance cards may make hiding optimal. If S 16 pays a passive Drone Hull 12
points for doing nothing, the card rewards the least interesting build. The
harness should check whether a no-input drone survives to phase 3; if it does, S
drops to 12.

The host rule can spiral. A pilot who hosts every round accumulates writs on a
course they know, and if home advantage outweighs the deficit that earned it,
last place becomes the best place to be. One writ a phase is the brake, and it
may not be enough.

Three defensive layers plus strain is four bars, at the ceiling of what a phone
carries mid-race. If playtesting says it is too many, shield merges into hull and
Field Bloom becomes a regeneration part.
