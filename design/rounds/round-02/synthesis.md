# Raise or Clear

## In one paragraph

Eight ships, seven races, about eight minutes. Every course carries the same four
hazards — rock, flare, burst, hole — in an order that differs course to course, plus an
untouchable ringed planet. At the second garage you declare a **Drive**: one of four
colours, the only thing on your ship that changes a rule, and the thing that says which
hazard you may make bigger. Every heat, every ship makes one move on the course:
**raise** your colour's hazard for 1 credit, **clear** any hazard for free, or **hold**
and bank 2. Cells are pure stat deltas with a colour on them; four of your colour
ignites your Drive, and an ignited raise counts double, so a build coming online is a
hazard visibly growing before anyone has flown. Credits come from placing, 8 down to 1,
and go on cells, on patching a hull that never repairs itself, and on an **ante that
rises 0, 1, 2, 3, 4, 6, 8**. Points decide the cut: the bottom row goes after heats 3
to 6, and the four survivors fly one final where the ladder becomes a head start of 40,
25, 12 and 0 ticks.

## The loop

**The lobby**, thirty seconds and one tap. Seven courses drawn end to end with their
socket orders, the ante schedule across the top, and beside it the **counter ring**:
four colours in a circle, each arrow pointing at the colour its hazard hurts worst.

**A heat** is one course of five or six segments, 800 to 950 ticks at base speed — 13
to 16 seconds of flying; the final is 1,150. Inside a heat nothing changes from today.
The renderer fans eight lanes; the sim has one line and no contact.

Between heats, **two screens, two taps.** _The Board_: the next course as four hazard
icons in socket order with intensity pips and the initials of whoever raised them, over
a ladder of points, hull, credits and six cell pips per ship with the Drive's pip lit
once it ignites. _The Draft_: eight cells face up, one of every colour guaranteed, each
printed with its price and copies left. One purchase — a cell, a patch, a Drive swap at
6 — or pass and bank.

**One order everywhere: worst-placed moves first.** The tail raises first and picks
first; the leader picks last and clears last. Leading buys the last word on the course
and costs the first pick of the cards.

**The arc.** Garage 1 has no Drive and no stakes: course A is seeded at intensity 1 and
everyone buys one cell blind. Drives are declared at garage 2, after one heat flown and
one deal seen. Tier 2 unlocks at garage 3, tier 3 at garage 5. Ignition arrives at
garage 4 for a spender and garage 5 or 6 for most, which is when the courses turn
vicious, because an ignited raise counts two.

## The build

The five stats survive. A part — a **cell** — is additive stat deltas resolved once
before the race, with one thing added: a colour. **Cells never change a rule.** That is
what buys back the legibility everything else here spends: four rules exist in the whole
game, and the one that matters is the one you chose.

`resolveBuild` returns a block of **eight modifiers** beside the stats, read by
`race.ts`, `actives.ts` and `hazards.ts` in place of `tuning.ts`. Eight is a hard cap
and it is structural rather than asserted: **each Drive owns exactly two numbers.**

| Drive     | Colour | Per cell of its colour                 | At four cells — ignition                                        |
| --------- | ------ | -------------------------------------- | --------------------------------------------------------------- |
| **Torch** | red    | Heat sheds 20% faster per red          | Reroute cooldown 420 → 210 ticks: two boosts a heat             |
| **Keel**  | grey   | All hazard hull damage −8% per grey    | Continuous damage capped at 2 per tick; one-shots stay uncapped |
| **Ward**  | blue   | Shields hold 90 ticks, +25 per blue    | Shield cooldown 420 → 140: shielded 56% of a course             |
| **Sling** | purple | Black-hole pull 0.55, +0.06 per purple | Holes become slingshots: ×1.25 inside, escape threshold ignored |

Twelve cells, three per colour, one per tier: red runs Ion Thruster up to Plasma Drive
(+0.30 speed, −25 hull, −20 heat tolerance), grey Ablative Plating up to Ram Prow (+80
hull, −0.12 speed), blue Mirror Shielding up to Phase Array, purple Inertial Anchor up
to Slingshot Core.

**Six cell slots, ignition at four.** Two slots are left for what you lack, so
commitment is arithmetic nobody has to be told, and once six are full the only way up is
to buy a tier-3 and scrap a tier-1 of the same colour. Every cell of your colour improves
your Drive on a curve and the fourth is the spike: no dead picks, and a threshold that
still lands.

**The counter ring is closed, and no arrow points at itself.** Keel's rock scales with
the square of speed, so it hurts **Torch** worst. Torch's flare is heat shields never
stop, so it hurts **Ward** worst. Ward's burst is one-shot and uncapped, so it hurts
**Sling** worst, the thinnest ship in the field. Sling's hole deals no damage, only
drag, so it costs **Keel** the most seconds. Read four grey pips across the ladder and
the answer is not more plating, which the Keels have been draining from a five-copy
supply for three drafts. The answer is purple.

## The economy

Credits, whole numbers, never inside the race. Everyone starts with 8.

**Income is one line.** The purse pays **8, 7, 6, 5, 4, 3, 2, 1** by finishing position,
and still pays 8 at the top of a shrinking field, so every cut speeds the survivors'
climb. A lost ship places last and takes the bottom figure. Holding pays 2. Interest is
1 per 5 banked, capped at 3.

**Four claims on it.** The **ante**: 0, 1, 2, 3, 4, 6, 8 — twenty-four credits over a
run, printed in the lobby and on every Board. A **cell** at base 4, 8 or 12 by tier. A
**raise** at 1. And a **patch**, which costs 3 credits _and your one purchase that
garage_ and puts back 40 hull: repairing costs you a cell, a price nobody can misjudge.

**Prices rise with demand, and there is no market.** A cell costs its base plus one for
every copy already sold, to a ceiling of base + 4 — a pure function of the copies-left
the card already prints, so it is one line rather than a subsystem. "Ion Thruster 7
(base 4), two left" says three ships went red and you should not be the fourth.
Scrapping returns the copy and drops its price by 1.

**Why save.** The last two antes cost 14 between them, and tier 3 arrives at garage 5 at
12 credits as the cell that finishes a colour.

**Why spending is not obviously right.** A mid-field ship that buys every garage:

| Garage              | 1    | 2     | 3     | 4     | 5     | 6     | 7 (final) |
| ------------------- | ---- | ----- | ----- | ----- | ----- | ----- | --------- |
| Interest, then ante | −0   | +1 −1 | +2 −2 | +2 −3 | +2 −4 | +1 −6 | +1 −8     |
| Bank at the deal    | 8    | 10    | 10    | 12    | 10    | 6     | 5         |
| Buys                | T1 4 | T1 5  | T2 8  | T1 6  | T1 6  | —     | —         |
| Bank after          | 4    | 5     | 2     | 6     | 4     | 6     | 5         |

Five cells, ignition at garage 5 at best, and two garages at the end where he can afford
nothing. A saver who passes twice reaches garage 3 with 17 and buys the tier-2 he
cannot — but has flown two heats on a bare ship and sits one bad heat from the cut.
Neither is right, which is the number the harness exists to check.

## Run health and elimination

**Hull is what greed spends, and it is one bar.** It carries between heats, never
regenerates, and the only cure is a patch that costs a cell. A ship that flew heats 1 to
3 flat out reaches heat 4 on about 45 hull, against a flat escape threshold of 25 and a
draft that wants everything it has: the F-Zero trade, priced, in the number the player
already watches during the race. A destroyed ship scores 0, places last, keeps its
build, returns at 30 hull — **and the raise it paid for still stands on the course,
hurting the ships that outlived it.**

**Points are what cut you.** Nine minus position, 0 for a lost ship. The line is drawn
under the bottom row from heat 2, with the tiebreak — the most recent heat — printed
beside it before the heat rather than after. Nobody goes before heat 3 and one goes per
heat, so a bad heat costs a row and never a run.

**A failed ante is a forced scrap, not a death.** A ship that cannot pay sells cells at
1 apiece until it can, on its own screen naming what went and what its Drive lost. You
watch your build come apart before you go, and you were told the number in the lobby.
One death rule and one escalating tax is right; two elimination systems is one too many.

**Recovery is four levers and none is charity.** The tail picks first; prices rise on
what the leaders bought, so the tail buys near base; a destroyed ship keeps its build
and its raise; and the final is one beatable race, not a points sum.

## Other players

Everything goes through the Board, the deck and the grid. Ships never touch.

**Every ship moves on the course, every heat, with the same tap** — not the leader and
the tail, all of them, worst placed first. **Raise**, 1 credit, your Drive's hazard
only: intensity +1, or +2 once ignited, capped at 4. **Clear**, free, any hazard:
intensity −1, floored at 1. **Hold**, +2 credits.

Intensity is one number per hazard and one thing per hazard: the belt's damage per tick,
the number of bursts 150 ticks apart, the number of flares, and the hole's pull and
length. The ringed planet is the neutral, so every course keeps one thing the field did
not choose.

**You may only raise what your Drive shrugs off.** A build's weapon and its armour are
the same four cells, so a rival's lit pip predicts what it will do to the course, and
nobody can arm a hazard they cannot themselves survive.

**Raising costs a credit, which is what stops the course saturating.** A raise only pays
if it costs the ships above you more than it costs you, so the leader almost never
raises — it clears the thing aimed at it and banks, while the tail always raises. The
course's shape moves with the standings instead of ratcheting to four everywhere by heat
4, and when both Torches are eliminated the flare goes quiet for the rest of the season.
Clear is the answer no proposal but run-first had: the targeted ship has a move, and it
is free. Sequence, meanwhile, is level data: course D puts the hole behind the belt.

**Attribution is data.** A placement carries the ids of the ships that raised it and the
race records damage per ship per placement, so results read hazard by hazard: _34 hull
to Bulwark's belt. Shielded Halo's second burst. Slingshot Vane's hole._

**Bots are inputs.** A rival is a Drive, a buy rule and a three-line stake rule: raise
your colour if two or more ships are above you and it is under 4; clear the hazard your
Drive fears; otherwise hold. A stake is an input exactly like a tap, so a bot, a ghost
and a live player are the same thing to the simulation.

## A worked run

**You**, Redline (Torch), Bulwark (Keel), Halo (Ward), Vane (Sling), Ledger (banks for
the priciest card), Tinker (buys against the last course), Scrap (never patches).
Everyone starts on 8 credits and 100 hull.

**Garage 1**, ante 0, course A seeded at 1, no Drives. You buy Inertial Anchor at 4.
**Heat 1**: Redline wins on raw speed, you are fifth. Ladder: Redline 8, Halo 7, Bulwark
6, Tinker 5, You 4, Vane 3, Ledger 2, Scrap 1.

**Garage 2**, ante 1, bank 8. You declare **Sling**: course D and the final put the hole
late and only Vane has gone purple. At the Board, worst first — Scrap raises the flare,
Ledger holds, Vane and then you take the hole to 3, Tinker raises the burst, Bulwark the
rock; then Halo clears the flare, because heat is what kills a Ward, and Redline,
leading, clears the rock, because rock is what kills a Torch. You buy a second purple at 5. **Heat 2**: purple 2 crosses the hole at 0.67 against a field at 0.55, worth 40
ticks; second behind Halo.

**Garage 3**, ante 2, bank 8. **Grav Keel** is dealt at 8 and you hold 7 — one short,
because you spent a credit raising the hole two heats running. Ledger takes it; you take
a third purple for **purple 3**. **Heat 3**: you win, and Scrap, on 34 hull and never
patched, eats the second burst with shields down and is cut.

**Garage 4**, ante 3, bank 7. Grav Keel is dealt again at 9 and is still out of reach,
so on 71 hull with two Wards about to raise the burst you **patch** instead — 3 credits
and your pick — then clear the burst. **Heat 4**: Redline, ignited at four red, boosts
twice, cooks on its own flares and Bulwark's rock, and reaches Vane's hole on 19 hull,
under the escape line. Lost, on a hazard with Vane's name on it; you are second. Ledger,
who banked all season and never raised, is cut with 16 credits.

**Garage 5**, ante 4. Slingshot Core is dealt at 12 and is unaffordable, so you take the
last purple tier-1 at 7: **purple 4, ignition.** Note what the field has become — both
Torches are gone, so nobody can raise the flare and Halo is safe for the rest of the
season. **Heat 5**: your raise counts two, the hole sits at 3, and you win by 90. Tinker
is cut. **Garage 6**: leading, you pass and clear the burst, and Bulwark's ignited grey
walks through its own rock to win heat 6. Redline is cut.

**The final.** You 44, Bulwark 41, Halo 39, Vane 30 — head starts of 40, 25, 12 and 0
ticks on 1,150. Ante 8 leaves you 5 and you buy nothing; Halo ignites blue. Vane raises
the hole to 2, because it is the only ship below you and the only other purple; Halo
raises the burst; Bulwark the rock; you, last, clear the burst back to 1. You start 40
up, take Vane's hole at ×1.25 while Vane at purple 3 takes it at 0.73, and win by 60.
**You, Bulwark, Halo, Vane.** Six moves on the course in seven heats, one credit each,
and the one that decided the season was the last — a clear.

## What it costs to build

**Survives unchanged:** `rng.ts`, `spline.ts`, `pilot.ts`'s tap rules, and the tick
order of `race.ts`.

**Changes, with nothing hidden.** `hazards.ts` is on this list: `HazardContext` gains
`intensity` and the modifier block, three hazard functions read them, `solarFlare` is
added, four test files change. And the thing every proposal glossed: for the burst and
the flare, intensity is **not** a per-tick number — it is the count of placements,
generated in `course.ts` before the race, which is why that is its own PR. `race.ts`
reads six of the eight modifiers off the build and records damage per placement.
`actives.ts` stops being a static table, which reaches `pilot.ts` and the HUD. `ship.ts`
gains colour, tier and base price per cell, six new cells, and the slot cap. `field.ts`
widens `ShipId` to a string and takes N ships — and `standings()` and `livePositions()`
must compare **progress**, not raw distance and finish tick, because the head start puts
ships on different start lines; Ignition proposed the head start and did not admit this.
`track.ts` gains sockets, intensities and `raisedBy`; `run.ts` and `garage.ts` are
replaced. **New:** `drives.ts`, `course.ts` (`laySockets(course, stakes) → Track`, pure,
Ignition's signature), `deck.ts`, `ledger.ts`, `ladder.ts`, `season.ts`.

**Seventeen one-session PRs. Twelve to headless, seventeen to playable.** In order:
`Modifiers` off `resolveBuild`; `hazards.ts` reading them and intensity; `ShipId` to
string with progress-based standings; per-placement damage; the solar flare; twelve
cells; four Drives with four ignition tests; `course.ts`; `deck.ts`; `ledger.ts`;
`ladder.ts` with the cut and the head start; then `season.ts` and eight bots — headless,
complete, driven by the harness. Five more finish it: harness targets, the Board, the
Draft, eight lanes with a staggered grid, and attributed results. At one item a session
that is a fortnight to headless and a month to playable. Twelve is not a handful; the
engineering review counted eleven under every proposal here and it was right.

**Measurable**, over 500 seeded eight-bot seasons in `npm run balance` — about 50,000
ship-ticks a season — with 50 bounded inside vitest. The assertions: no Drive reaches
the final more than 33% of the time, fair share being 25%; on a course with its own
socket at 4, an ignited Drive beats the same build at three cells in at least 65% of
head-to-heads; **the spread of intensities across the four sockets averages at least
1.2 from heat 3 on**, which measures the top risk directly; the heat-1 winner wins under
35%; and spender, saver and switcher each reach the final between 40% and 60%.

## Where it came from

**From interaction-first, The Toll, the spine.** Every ship acts on the course every
heat with one tap. The same four hazards on every course, drawn faint, with pips. You
may only stake what your build survives. Intensity as one number per hazard. The ringed
planet as the neutral. Socket order as level data. Hold paying 2. Attribution as data. A
stake as a small enum the harness can enumerate exhaustively. Keel's ignition —
continuous damage capped, one-shots uncapped, through the `isOneShot` that already
exists — and Ward's ignition as uptime rather than depth.

**From build-first, Ignition.** The Drive: one declared colour, the only thing that
changes a rule, cells as pure stat deltas, four rules instead of eight. Per-cell
scaling, so no pick is dead. Six slots with ignition at four and the late squeeze that
follows. The Drive swap at a real price. Sling's ignition. Lay-or-wipe, which is
raise-or-clear here. `laySockets(course, stakes) → Track`. And the head start final.

**From run-first, The Rising Line.** Open Run as a defuse, which is Clear — the only
track move in the round that subtracts, and the reason this course phase does not
saturate. The counter ring. A raise counting double at a threshold. The deal
guaranteeing every colour is buyable.

**From economy-first, The Ante.** The rising ante printed in the lobby: one number doing
the work of an economy and an escalation. The purse spread, 8 down to 1, which three of
four proposals had flat. Bankruptcy by forced scrap on its own screen. Prices rising
with demand. A repair that costs your one purchase. And its cost section, the only
honest one before the reviews.

**From the reviewers.** Declaring the Drive at garage 2 rather than the lobby, one order
on both screens, and `standings()` counted as a cost.

## What was rejected, and why

**The toll itself**, the base proposal's title mechanic. The phone reviewer could not
forecast it, the fun reviewer said it makes winning a heat something to avoid, and it
pays nothing for a black hole, which deals no damage. Its job was to make hurting the
field pay; the purse spread does that better, because it pays for finishing ahead rather
than for a formula.

**Frame.** The best idea in run-first and a second health bar whose name means the same
as the first. Hull that carries, never regenerates and is only cured by giving up a cell
is the same trade in the number the player already watches. Two of three reviewers
wanted Frame; the third counted the numbers a phone player holds and was right.

**Credits as money, score, run health and track power at once**, because then every cell
you buy visibly lowers your standing. **The rising points line** goes with it: "am I
safe" should be readable off the ladder, not predicted from seven other ships' finishes
against a shifting mean.

**The floating market as a subsystem** — price, stock, drift, cooling, refund, ceiling.
Base plus copies sold gives the same signal off data the deck already keeps.

**The leader picking the next course.** Seven mutually balanced courses is the most
expensive authoring job proposed, it confounds every per-Drive win rate in the harness,
and a build a rival can switch off with a free tap is the least fun thing in the round.
**The collapsing corridor** goes with it: an invisible rule reads as a bug.

**Only the bottom half of the ladder acting**, and **only the leader and the tail laying
cards** — both are last round's failure with the sign flipped. **Two-wave seeding with
majority resolution** goes because tallying eight cards across four slots is a
spreadsheet between every pair of heats, and **secret stakes** go because against bots
the reveal is theatre.

**Bankruptcy as the only elimination.** Its own punchline is that a ship finishing
eighth and buying nothing survives all seven antes, so the pressure lands only on
players who engaged. **Triple final purses, double points, a ninth modifier and
fourteen-row boards** go the same way: replaced by something smaller doing the job.

**Parked**, with the trigger that brings each in: the **socket swap** for the bottom two
ships, if the harness says courses stop differing; the **carousel**, one mid-season heat
where all eight choose simultaneously, which is the scene this design lacks; **overdrive
at six cells**, once ignition is balanced; and **rivals as ghosts**.

## Decisions for the owner

1. **Are the seven rivals bots, recorded ghosts, or live players?** All three work — but
   a ghost needs a store, a live player needs timers, and the lobby, the Draft and the
   harness change with the answer.
2. **Is the Drive declared at garage 2, or in the lobby?** Garage 2 is a read; the lobby
   is a commitment made before any information exists.
3. **Does a raise cost 1 credit?** It is what stops every socket sitting at 4 from heat
   4, and it is also a tax on the ships that most need to act.
4. **Is Clear free?** Free gives the leader a defuse every heat for nothing; at 1 credit
   the targeted ship pays to answer.
5. **Worst-placed first on both screens?** One order is legible; the alternative,
   leader-first at the Board, is a snowball.
6. **Is the head start the whole final?** It reads off the grid with no arithmetic, and
   it means the season's points stop mattering the moment the final starts.
7. **Six slots with ignition at four, or five with ignition at three?** Three of five
   ignites a heat earlier and leaves one slot to pivot with.
8. **Eight ships or six?** Eight is the field four cuts need, and eight thin lanes.
9. **Is the solar flare in the first playable?** A fifth thing to learn, for one
   function and one test.
10. **Names.** Torch, Keel, Ward and Sling; the belt, the flare, the burst and the hole;
    and the Sling rival is Vane so a Drive and a ship never share a name.

## Next round

Take four things as fixed: seven races with a cut after heats 3 to 6; four Drives with
pure-stat cells and ignition at four; one move on the course for every ship every heat;
the rising ante.

**Develop the Board as a screen and as a bot.** The tap flow for eight ships, what
intensity pips look like at 1 and at 4, the bot stake rule as pseudocode, and the
saturation test as an assertion with a number in it. Show one heat where the leader's
clear changes who wins.

**Develop the twelve cells and the four per-cell curves with real numbers**, and say
what an ignited Drive is worth in ticks on a course carrying its own socket at 4 against
the same course at 1.

**Develop the seven courses as level data**: socket order, segment lengths, and how a
course is authored so the season escalates without anyone choosing it.

**Challenge the ante.** A rising tax on the wallet is one way to escalate; harder
courses is another, and the season map is already drawn. A proposal that puts the
escalation on the track and leaves the economy flat should say what replaces the forced
scrap.

**Challenge raise-or-clear.** One credit and a cap at 4 is a first guess. A proposal
that thinks the phase needs a second verb — a swap, a wipe that empties a socket, or a
raise aimed at one ship — should price it in taps, in bot rules and in what a phone
player has to hold.
