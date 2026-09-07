# Ignition

## Premise

Every ship declares a **Drive** in the lobby, before a single part is bought. The
Drive is the build. It is one of four, it changes one rule of the race, it gets
stronger with every **cell** of its colour bolted on, and at the fourth cell it
**ignites** — the rule flips, the ladder lights that ship's pip, and seven other
captains know exactly what you can now do to them.

The Drive is deliberately the only thing on the ship that changes a rule. Cells
are pure stat deltas with a colour on them. Four rules to learn in the whole
game, not fourteen part texts — which is what buys back the legibility everything
else here spends.

The rest follows. The economy exists because ignition counts cells, not credits:
a 3-credit cell lights your Drive as surely as a 10-credit one, and yet you have
six slots, so late in a season the only way up is to buy expensive and scrap
cheap. Interaction exists because your Drive decides which hazard card you lay on
the next course, and every Drive's card is the hazard that Drive shrugs off.

The round-one spine holds: seven heats, eight ships, a ladder with a cut line, a
face-up draft in reverse order, thresholds that flip rules. Two things are new.
**The leader picks the next course; the bottom half of the ladder furnishes it.**
And **the final is one race between four ships, with the ladder as a head start.**

## The loop

The lobby: a season map of seven courses drawn end to end, every fixed hazard
placed, the four open slots on each drawn as dashed boxes, and the final course's
black hole visible from the first screen. You pick a Drive. Two taps.

A heat is one course of four or five segments, 780 to 950 ticks at base speed —
13 to 16 seconds of flying; the final is about 1,150. Inside a heat nothing
changes from today.

Between heats, three screens, in this order because each wants what the last
decided:

1. **The course.** The ladder leader picks which of the remaining courses is
   flown next. One tap, and the leader's entire reward: a Torch leader picks the
   open straight, a Ward leader the course with two bursts.
2. **The cards.** The bottom half of the ladder, rounded down — four ships of
   eight, three of seven or six, two of five or four — each get one move on that
   course, worst placed moving last with everything visible. A move is either
   _lay_ your Drive's hazard into an empty slot, 1 credit short or 2 long, or
   _wipe_ a slot another ship filled, free, after which that slot stays empty this
   heat. Never both.
3. **The draft.** Eight cells face up, one pick each in reverse ladder order. You
   may pass and bank, buy repairs, scrap a cell for 1, or swap your Drive for 5.

Heats 1 and 2 cut nobody; after heats 3, 4, 5 and 6 the bottom ship goes; four
reach the final. The whole season is about eleven minutes.

## The build

The five stats survive. `resolveBuild` still sums additive deltas and now returns
nine **modifiers** beside them, read by the race loop, the actives and the
hazards in place of `tuning.ts`: hazard damage multiplier, black-hole pull,
escape-ignored flag, assist multiplier, shield duration, shield-absorbs-heat
flag, reroute boost, reroute cooldown, free hull per heat. Nine is the ceiling.

**Six slots, and a separate Drive mount.** Ignition is four cells of the Drive's
colour, so a ship lights exactly one Drive and has two slots for what it lacks.
Commitment is arithmetic, not a rule anyone has to be told.

| Drive     | Colour | Per cell of its colour                                                 | At four — ignition                                                    |
| --------- | ------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Torch** | red    | Reroute boosts ×1.30, +0.05 per red                                    | Reroute cooldown 420 ticks → 210. Two boosts a heat.                  |
| **Ward**  | blue   | Shields hold 90 ticks, +25 per blue                                    | The shield pool absorbs heat as well as damage                        |
| **Keel**  | grey   | All hazard hull damage −8% per grey                                    | Repairs 25 hull free before every heat                                |
| **Sling** | purple | Black-hole pull 0.55, +0.06 per purple; assist ×1.35, +0.05 per purple | Black holes become slingshots: ×1.25 inside, escape threshold ignored |

Twelve cells, three per colour, one per tier, all pure stats. Red runs Ion
Thruster (+0.15 speed, −10 hull) up to Plasma Core (+0.30 speed, −25 hull, −20
heat); grey Ablative Plating (+40 hull, −0.08 speed) up to Ram Prow (+80 hull,
−0.12 speed); blue Mirror Shielding (+35 shield) up to Phase Array (+70 shield,
−0.08 speed); purple Inertial Anchor (+0.03 acceleration, −0.02 speed) up to
Slingshot Core (+0.06 acceleration, +0.08 speed, −30 hull).

Each ignition should be worth about 80 ticks on the right course and nothing on
the wrong one, against winning margins of 30 to 80. Torch 4 makes enough heat to
cook a ship that did not spend a spare slot on a heat cell. Ward 4 rides every
assist and every reroute free. Sling 4 crosses a hole at ×1.25 while the field
crawls at 0.55: 150 ticks on a two-hole course. Keel 4 is the odd one — 25 hull a
heat is 3 credits not spent on repairs, which is a tier-3 cell by the last two
drafts. **The armour build wins by being the richest ship at the end, not the
fastest.**

Ignition lands heat 4 at the earliest and heat 5 or 6 for most, because credits
and hull compete with it. Heats 1 to 3 are the plan; 5 to 7 are the payoff.

## The economy

Credits, whole numbers, never inside the race. Everyone starts with 3. Purse by
finishing position: 5, 5, 4, 4, 4, 3, 3, 2; a destroyed ship is placed last and
takes last's purse. A leader banks about 35 a season against a tail's 16 — enough
that winning pays, not enough to run away.

Tier 1 costs 3, tier 2 costs 6, tier 3 costs 10, entering the deck at drafts 1, 3
and 5. A Drive swap is 5 and takes your pick that draft. Scrapping refunds 1.
**Repairs cost 1 credit per 8 hull**, so a full repair from 40 is 8 — more than a
tier-2 cell, which is the point. Interest is 1 per 6 banked, capped at 3.

Why spend: four cheap cells light a Drive as surely as four dear ones. Why save:
once four slots are filled cheaply the only way up is to buy a tier-3 and scrap a
tier-1 of the same colour. Neither is right. Three bots, at a purse of 4:

|              | D1        | D2        | D3        | D4          | D5         | D6                   | D7            |
| ------------ | --------- | --------- | --------- | ----------- | ---------- | -------------------- | ------------- |
| **Spender**  | 3 → T1, 0 | 4 → T1, 1 | 5 → T1, 2 | 7 → T2, 1   | 5 → T1, 2  | 7 → T2, 1            | 5, slots full |
| **Saver**    | pass, 3   | pass, 7   | pass, 11  | 16 → T2, 10 | 15 → T3, 5 | 10 → T3, 0           | 4 → T1, 1     |
| **Switcher** | T1, 0     | T1, 1     | pass, 5   | pass, 10    | 16 → T3, 6 | 12 → T2 + 40 hull, 1 | 7 → T1, 4     |

The spender holds 5 at the heat-3 draft and cannot afford the tier-2 that lights
its Drive; it ignites late and reaches heat 5 on 40 hull with nothing to repair
with. The saver sits seventh for four heats and is cut before its build lands —
its cells arrive on a ship no longer in the season. The switcher ignites for
heats 6 and 7 with two tier-3 cells under it, and reaches the final.

## Run health and elimination

**Hull is the greed meter and runs the whole season.** Never repaired free —
except by an ignited Keel — and 8 credits buys back 60 points. A ship flying flat
out through three heats reaches heat 4 on about 45 hull, with the black hole's
escape threshold at 25 and a draft that wants everything it has. That is the
F-Zero trade, priced. A destroyed ship is placed last, scores 0, and returns next
heat at 30 hull with its build intact.

**The ladder is what cuts you.** Points are 9 minus position, and 0 for a
destroyed ship. After heats 3, 4, 5 and 6 the bottom row goes; ties break on the
most recent heat, so the ship falling is the one that falls out. One goes per
heat and none before heat 3, so a bad heat costs a row and not a run.

**The final is one race between four ships, and the ladder becomes a head
start.** First starts 40 ticks up the course, second 25, third 12, fourth on the
line. On 1,150 ticks that is real and beatable. It is the strongest single thing
here: six heats of ladder matter without the final being a formality, it is one
number per ship in `startRace`, and on a phone it reads instantly off the grid.

Recovery is four levers, none of them charity: the bottom half furnishes the
course; the draft runs in reverse order; a destroyed ship keeps its cells; and
fourth into the final is twelve ticks behind, not twelve points.

## Other players

Everything goes through the course, the deck and the grid. Ships never touch.

**Your Drive is your card, and your card is the hazard your Drive shrugs off.**
Keel lays the asteroid field and takes 32% less from it; Ward lays the gamma
burst and holds shields 190 ticks; Sling lays the black hole and slingshots it.
Torch lays the **collapsing corridor**, the one new hazard: damage per tick that
grows with how long you have been inside, so the total is quadratic in time — the
mirror of the asteroid field, quadratic in speed. Rock punishes going fast; the
corridor punishes being slow.

That gives a counter graph with no self-answers. Grey's rock hurts red worst;
red's corridor hurts grey worst; purple's hole is answered by grey's hull above
the escape line; blue's burst is answered by timing, which everyone has. Grey
beats purple and red, red beats grey, blue beats red's heat, purple beats blue's
slowness. There is a Y for every X and it is never X.

**The wipe makes the card phase a fight rather than a queue.** A move is one or
the other, so the ship laying second decides whether the first wasted a credit,
and the ship laying last chooses between the course it wants and the course it
can survive. A Sling in seventh wants a hole on every course; a Torch in eighth
on 30 hull spends its whole move erasing one.

**The leader's course pick is the counter.** A leader can pick _against_ a rival:
gravel with no hole on it, purely to give the Sling in third nothing to
slingshot. Counter-picking with one tap, costing the sim one index.

**Everything is visible except tap timing.** The ladder carries each ship's
points, hull, bank and six slots as coloured pips, the Drive's pip lit once it
ignites. Results read hazard by hazard with the name of who laid each — _lost 38
hull to Bulwark's rock, shielded Halo's burst_.

**The draft is shared and finite.** Five copies of each tier-1 cell, four of each
tier-2, three of each tier-3 — 48 against about 40 purchases, so the last drafts
are picked over, and every card prints its copies left. Eight are dealt face up,
guaranteed one of every colour and two of the highest unlocked tier. Unbought
cards return to the deck; scrapped cells and a cut ship's cells do not.

## A worked run

**You** (Sling), Redline (Torch), Bulwark (Keel), Halo (Ward), Vane (Sling),
Ledger (Keel, banks), Tinker (Ward, buys against the course just laid), Scrap
(Torch, cheapest cell, never repairs). The lobby map shows a black hole fixed in
the final and one in course F; you take Sling and plan for the end of the season.

**Heat 1**, course A, no cards because there is no ladder. Tier 1 only: Inertial
Anchor for 3. Sixth on a heavy ship with no speed. Ladder: Redline 8, Halo 7,
Bulwark 6, Tinker 5, Scrap 4, You 3, Vane 2, Ledger 1.

**Heat 2.** Redline picks course C, two long open runs, its own ground. Scrap
puts a short corridor in slot 1. **You** spend 1 on a short hole in slot 4 — at
purple 1 you cross it at 0.61 while the field crawls at 0.55, and Scrap is on 38
hull against an escape line of 25. Vane wipes Scrap's corridor, because Slings
are slow. You hold 2 against a tier-1 at 3, so you pass. Scrap boosts into your
hole at 22 hull and is destroyed. **Your first card ended another ship's heat.**

**Heat 3.** Redline picks F. You lay a long hole for 2; Scrap, moving last on 30
hull, spends its whole move wiping it. Tier 2 opens at 6, so you take a second
Anchor for 3 instead — ignition counts cells, and a cheap one counts the same.
Purple 2, fourth, Scrap cut.

**Heat 4.** Redline picks E, an almost empty straight, to suit its Torch. The
bottom three of seven furnish it anyway: **you** lay a long hole in slot 4, Vane a
short one in slot 1, and Ledger rock directly in front of yours. A third Anchor
takes you to purple 3. Redline, on 44 hull after three flat-out heats and no
repairs, crosses Ledger's rock at ×1.55 and reaches your hole at 19 — under the
escape line. Destroyed. You finish second. Ledger is cut with 16 banked and one
cell: **rich, and out.**

**Heat 5.** Halo leads and picks G, two bursts and a ringed planet. Fourth of
six, so you lay another long hole, then take the last purple tier-1 in the deck
for 3. **Purple 4. Ignition.** You slingshot your hole and Vane's at ×1.25, take
the assist at ×1.55, and win by 90. Halo, ignited at blue 4, shields both bursts
for second. Vane is cut.

**Heat 6.** Halo picks B — gravel, heavy rock, **no black hole anywhere on it**,
chosen to switch your Drive off. Third of five and above the line, you do not lay
at all: climbing cost you your voice on the track. Redline lays a corridor,
Tinker a burst. You buy a Grav Keel for 6 and finish second behind Bulwark, whose
grey 4 takes 32% less from every rock on the course. Tinker is cut.

**The final.** Halo 40, Bulwark 38, You 34, Redline 32 — head starts of 40, 25,
12 and 0 ticks. Six segments, a ringed planet, two bursts, one fixed hole, known
since the lobby. You and Redline are the bottom half. You lay a long hole on top
of the fixed one; Redline, needing to win outright rather than survive, leaves it
and lays a long corridor to break Bulwark. Halo shields both bursts and loses 110
crossing two holes at 0.55. Bulwark eats the corridor at −32% with 25 free hull
in hand, second. Redline's own corridor costs it 30 hull; fourth. You start 12
up, slingshot both holes, and win by 60.

Final standings: You, Bulwark, Halo, Redline, then Tinker, Vane, Ledger, Scrap by
the heat they were cut. Five cards laid in seven heats — one destroyed a ship in
heat 2, one won the season.

## What it costs to build

Unchanged: `rng.ts`, `spline.ts`, the tick loop and gate logic in `race.ts`,
`field.ts` apart from widening `ShipId` to a string.

Changed. `ship.ts`: cells gain a colour and tier, twelve of them, and
`resolveBuild` returns nine modifiers. `hazards.ts` is **not** untouched —
`HazardContext` gains the modifier block and a `ticksInside` count, and
`asteroidField`, `blackHole` and `ringedPlanet` all read modifiers instead of
`tuning.ts`: three functions changed, one added, four test files changed.
`actives.ts` reads shield duration and reroute cooldown from the build. `race.ts`
reads the rest, tracks ticks-inside per placement, and `startRace` gains a
starting distance. `track.ts`: placements gain a `laidBy` id, courses gain four
slots, and a pure `layCards(course, cards) → Track`. `garage.ts` becomes
`draft.ts`. `rivals.ts` grows to seven, each a Drive, a wish list, a card rule and
a course rule. `run.ts` is rewritten as the season machine, the biggest change.
New: `drives.ts`, `economy.ts`, `ladder.ts`, `season.ts`.

Seventeen one-session PRs. Eight get to a first playable — the modifier block,
`race.ts` and `actives.ts` reading it, `hazards.ts` reading it with its four
tests, the collapsing corridor, twelve cells with four ignition tests,
`economy.ts`, `draft.ts`, `ladder.ts` — **eight ships, four Drives, drafts, a
ladder and a cut, with no cards and no course choice.** Nine more finish it:
`season.ts` and the leader's pick, the card phase, the head start, the `run.ts`
rewrite, seven rivals, harness bots, and three UI PRs for the lobby and ladder,
the card and draft screens, and eight lanes with ignition marks, a staggered grid
and attributed results. At the slice's one PR a session that is four months at
two a week.

The harness gets named bots — spender, saver, switcher, always-ignite,
always-wipe, always-lay, counter-picker — and these assertions over 500 seasons:
no Drive wins more than 33%, fair share being 25%; on a course carrying its own
card, a 4-cell Drive beats the same build at 3 cells in 60% of head-to-heads; a
bot that ignites by heat 5 reaches the final over 60% of the time and one that
never ignites under 25%; the heat-1 winner wins under 35%.

## What it needs from the owner

1. Are the seven rivals bots, ghosts of recorded seasons, or live players? A
   ghost is a Drive, seven picks, six cards and a tap list — 300 bytes, one
   recorder, one player. Live players cost a server and timers on three screens.
   Bots cost nothing new.
2. Is denying the leader any voice on the track the right handicap, or does
   leading need to feel better than one course pick?
3. Should a wipe be free, or cost 1? Free makes the last mover strong.
4. Head start instead of carried points: does six heats of ladder still feel like
   it mattered when the final is one race?
5. Ignition at four cells of six slots, or three of five? Three of five ignites a
   heat earlier and leaves less room to pivot.
6. Is the Keel payoff — free repairs, therefore money, therefore tier-3 cells —
   too indirect, when the other three are felt in the race?
7. Drive chosen in the lobby and visible from heat 1, or unlocked at draft 2?
8. Seven heats and eleven minutes, or five and eight?
9. Names: Torch, Ward, Keel, Sling, and the collapsing corridor.

## Risks

Sling is the loudest ignition and the most conditional, because a leader can
switch it off by picking a course with no black hole. If the harness says Sling
wins from fifth and never from second, the fix is to let the leader pick from two
courses rather than any, not to change the Drive.

The wipe could eat the card phase: if wiping always beats laying, four ships
spend four moves erasing and the course stays bare. Always-wipe against
always-lay is a first-week measurement; if it fails, the wipe costs 1.

Nine modifiers is a ceiling I have set and not proved.

The corridor punishes slowness with a rule the current top-down view cannot show.
Until the closer view exists it needs a shrinking bar on the course, or it reads
as unexplained damage — the one thing a phone player will not forgive.

Heats 1 to 4 may feel like a waiting room if ignition lands too late. The dial is
the tier-2 unlock, and it moves to draft 2 first.
