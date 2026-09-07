# The Ante

## Premise

There is one number in Star Race and it is credits: your money, your score, your run health and your power over the track. You earn them by placing. You spend them on parts, on repairs, and on the hazards that go into the next course. And every heat you pay an entry fee that rises — 0, 1, 2, 3, 4, 6, 8. A ship that cannot pay scraps a part to make it; a ship with nothing left to scrap is out.

That rule does the work of three systems. The economy is the fee going up. Run health is your bank against the next ante. Elimination is bankruptcy. And because the ante only bites ships that spent, the sentence a player says after one run is the design: **you go broke by building, not by losing.** A ship that finishes eighth every heat and buys nothing survives all seven; a ship that buys a part every garage and finishes sixth is bankrupt by heat five.

Everything else follows from the coin. Your build is what your bank could afford. Prices float with demand, so another player's purchase is what makes your build expensive. The course is bought.

## The loop

Eight ships, seven heats, one ledger, about eight minutes. The lobby shows the **board** and the **ante schedule** and nothing else: you can see the Slingshot Core at 8 credits from the start line and know you will not afford it before heat five.

A heat is seven segments, about 950 ticks at base speed, sixteen seconds of flying after a three-second countdown. Five of the seven are **slots**, carrying whatever hazard was bought into them, or nothing. Heats 1 and 2 are seeded; from heat 3 the course is entirely what the field paid for. The final is nine segments and seven slots.

Between heats, three untimed screens, two to four taps. **The Ledger**: eight rows of bank, hull and pips, the next ante on top. **The Board**: fourteen parts with price and copies left, one purchase per ship, bought in **reverse ledger order**. **The Course**: five slots, markers bought in **ledger order**, richest first, each taking the next free slot.

Two screens, two opposite orders, both rubber bands: money buys the track, poverty buys the shop cheaply and gets the last word on the course. Most credits after the final wins.

## The build

Twelve parts: four **tags**, three tiers, one part per tag per tier. Plus Radiator Fins, which carries no tag and is the board's cheap bargain, and Refit, which is not a part.

| Tag        | Tier 1 (base 2)  | Tier 2 (base 5)     | Tier 3 (base 8) |
| ---------- | ---------------- | ------------------- | --------------- |
| **Burner** | Ion Thruster     | Overclocked Reactor | Plasma Drive    |
| **Brick**  | Ablative Plating | Keel Plate          | Ram Prow        |
| **Mirror** | Mirror Shielding | Capacitor Bank      | Phase Array     |
| **Sling**  | Inertial Anchor  | Grav Keel           | Slingshot Core  |

A part is additive stat deltas resolved once before the race; higher tiers are bigger deltas at bigger cost. Ram Prow is +70 hull for −0.12 speed; Plasma Drive is +0.25 speed for −25 hull and −20 heat tolerance.

Copies count toward a tag, because parts already stack. Two of a tag is a **direction**, three is a **rule**. Each rule is one number in a modifier block `resolveBuild` returns beside the stats.

| Tag    | Two (direction)                | Three (online)                               |
| ------ | ------------------------------ | -------------------------------------------- |
| Burner | Heat sheds twice as fast       | Reroute cooldown 420 → 210: two boosts       |
| Brick  | Asteroid damage −30%           | The black hole's escape threshold is ignored |
| Mirror | Shields hold 150 ticks, not 90 | Shield cooldown 420 → 180: three shields     |
| Sling  | Gravity assist heat halved     | Black hole pull 0.55 → 1.15: it is an assist |

Each is one test: on a course carrying that tag's own hazard, a set-3 ship beats a set-2 ship of the same bank at least 60% of the time. Brick 3 rewards being alive rather than being fast, which is what Brick pays for; Sling 3 turns the run's worst hazard into its best.

The modifier block is eight numbers, hard cap: heat dissipation, reroute cooldown, asteroid multiplier, ignore-escape flag, shield duration, shield cooldown, black hole multiplier, assist heat multiplier. A ninth means a stat delta instead.

Commitment is arithmetic: seven garages, one purchase each, one of them usually a Refit. Two tags at three is six parts and no repairs — the greedy dream, and usually a bankruptcy.

## The economy

Whole credits, never inside the race. Every ship starts with **10**.

**Income.** The purse pays after every heat: 8, 7, 6, 5, 4, 3, 2, 1 by position. A lost ship places behind every finisher and takes 1 in salvage. The final pays **triple**: 24, 20, 16, 12, 8, 6, 4, 2. Interest is **1 per 6 banked, capped at 4**, paid after the ante. There is no other income; one purse and one interest step is a sum you can do at a glance.

**Outgoings.** The ante first: 24 credits over a run. Then a part at the board price, then a marker at 2 to 5. Refit costs 3, restores 50 hull, and uses your one board purchase — so repairing costs you a part, which is the real price. Hull carries between heats and nothing else restores it.

**Prices float.** Every copy bought raises that part's price by 1 for everyone, to a ceiling of base + 4, and every heat every price drops 1 toward base. "Ion Thruster 5 (base 2)" says three ships went Burner and you should not be the fourth. Scrapping returns the copy, drops its price by 1, and pays half the current price rounded down.

**Why saving is right, sometimes.** The ante spikes: the last two garages cost 14 between them, so everyone banks into the back half. Tier gating is a price, not a calendar — the part that finishes your tag is 8 credits and the only road to it is skipping a garage. Prices cool, so buying nothing is sometimes the cheapest way to buy. And 24 banked pays 4 a heat, a tier-1 part every garage for free.

**Why saving as a policy loses.** The only real income is placing, and placing needs parts. A hoarder finishes seventh and eighth, never reaches the 24 that pays real interest, and ends with 12 credits and one part.

**The credit table.** Four strategies; ante and interest exact, finishing positions assumed. The figure is the bank after that heat's purse.

|                                               | H1      | H2      | H3      | H4       | H5      | H6      | Final              | End    |
| --------------------------------------------- | ------- | ------- | ------- | -------- | ------- | ------- | ------------------ | ------ |
| **Spender** (best part affordable, no refits) | 1st, 17 | 1st, 23 | 1st, 27 | lost, 21 | 6th, 17 | lost, 7 | scraps to fly, 5th | **15** |
| **Saver** (banks for 24, never gets there)    | 7th, 13 | 8th, 15 | 8th, 16 | 7th, 17  | 7th, 15 | 8th, 11 | 6th                | **12** |
| **Value buyer** (buys only at or below base)  | 4th, 14 | 4th, 18 | 5th, 20 | 4th, 19  | 4th, 17 | 5th, 16 | 4th                | **21** |
| **Committed** (one tag to 3, then markers)    | 4th, 14 | 2nd, 16 | 1st, 16 | 1st, 18  | 2nd, 15 | 1st, 13 | 1st                | **29** |

The committed player holds 8 credits at the heat-5 garage and 5 at the final, against antes of 6 and 8. That is what "prices bite" means: the winner is never comfortable.

## Run health and elimination

You protect your bank. It is the same number as your score, so protecting it and winning are the same act, and spending is the only way to do either.

Hull is the pressure that spends it. Hull carries, never regenerates, and the only cure costs a garage. A ship on 30 hull is one asteroid field from being lost, and being lost is a 1-credit heat. Damage, Refit, credits, ante: one direction.

**Bankruptcy.** In every garage, before anything else, each ship pays the ante. A ship that cannot pay must scrap parts until it can; a ship with none left is out, and its remaining credits are its final score. Scrapping is the warning shot: a garage of progress sold at half price, a tag count dropped, usually the rule you were flying on. Nobody is surprised, because the ante is printed in the lobby and on every ledger.

There is no points cut and no cut heat: whoever is solvent flies the final, and in practice two to four ships fold, none before heat 4.

**Recovery** has four levers and none is charity. The tail buys parts first, at base price, while the leader pays the premium the tail created. The tail buys its marker last, so its hazard is the final thing before the line. Voluntary scrapping is a real pivot: dump two Brick parts and buy the Burner tier-2 that just fell back to base. And the final pays triple, so a ship 12 behind wins it by finishing two places higher.

## Other players

Ships never touch. They meet in the price of a part and in the hazards on the course.

**The board is a market and everyone is on it.** When Halo takes the third Mirror Shielding the row reads "5, three left", and any ship reading it knows a Mirror build is now expensive and Mirror's hazard will be on the next four courses. That is the counter-pick information the brief asked for, as a number rather than a guess. Denial is legal: the tail, buying first, takes the last Grav Keel out from under the leader.

**The course is bought.** A ship at two of a tag may buy that tag's hazard into the next course: Solar Flare 2 for Burner, Asteroid Field 2 for Brick, Gamma Burst 3 for Mirror, Ringed Planet 3 for Sling, Black Hole 5 for Sling at three. A ship with no tag at two has nothing to buy, which is what refusing to commit costs. If more than five ships buy, the five highest prices land and the rest are refunded.

So the loop closes: my build decides what I put on the track, the track decides what parts the field needs, and demand decides what those parts cost. The Bricks who answer my black holes drive Ablative Plating from 2 to 6, which prices the Mirror out of the hull it needed.

Every marker carries the name of the ship that bought it, so results read hazard by hazard: "lost 34 hull to Bulwark's rock, escaped your own black hole."

**Rivals are seven bots with economic characters.** Redline spends everything and never refits; Bulwark refits below 50 hull; Halo buys Mirror at any price and Keel buys Sling; Ledger banks for 24; Broker buys anything at or below base; Scrap buys the cheapest row. Each is a rule over the ledger, so each is replayable input and could later be a ghost of a real run.

## A worked run

Eight ships — **You**, Redline, Bulwark, Halo, Keel, Ledger, Broker, Scrap — all starting on 10. In the lobby you pick Sling: the black hole is the only hazard that can be turned into speed, and the Slingshot Core that does it costs 8.

**Garage 1** (ante 0, interest +1). Inertial Anchor at 2, bank 9. Redline takes the Ion Thruster at 2 and pushes it to 3; Broker takes the second at 3. The course is seeded. **Heat 1:** Redline wins, you are fourth, +5, bank 14, hull 78.

**Garage 2** (ante 1, +2, bank 14). Second Anchor at 3: **Sling 2**, and the Ringed Planet menu opens. Buy one for 3, bank 8. Redline reaches Burner 2 and buys a Solar Flare. **Heat 2:** his flare early, your planet late. Sling 2 halves the assist's heat, so the planet is free speed for you and a cook for the ships with no tag. Second, +7, bank 15. **Marker 1.**

**Garage 3** (ante 2, +2, bank 16). Grav Keel at base 5: three Sling parts, **Sling 3**. Another Ringed Planet for 3, bank 8. **Marker 2. Heat 3:** you win, +8, bank 16.

**Garage 4** (ante 3, +2, bank 15). Ledger order: Redline 28, Broker 23, Bulwark 17, You 15. Redline buys first, a Solar Flare into slot 1. Bulwark, Brick 2, an Asteroid Field into slot 3. You buy the **Black Hole for 5**; it takes slot 4, directly behind Bulwark's rock. Bank 10. **Marker 3.**

**Heat 4, the moment.** Redline, Burner 3 on 38 hull, has bought a Plasma Drive and no plating in four garages and never refitted. He crosses Bulwark's field flat out, and rock scales with the square of speed: he comes out on 11 hull. Your black hole is next, he is under the escape threshold, and he is lost. You win, +8, bank 18. Two players' purchases killed him and neither was only yours.

**Garage 5** (ante 4, +2, bank 16). Redline holds 7 against an ante of 4 and scraps his Overclocked Reactor; the copy returns to the board at 4, under base; Broker buys anything at or below base, so Broker takes it, reaches **Burner 2**, and puts Solar Flares into the last three courses. Your black hole killed Redline and armed Broker. You buy the Slingshot Core for 8, bank 8: Sling 4, and no marker, because the ante is 6 next. **Heat 5:** second on a hot ship, +7, bank 15, hull 52.

**Garage 6** (ante 6, +1, bank 10). The greedy call: a second **Black Hole for 5**, bank 5, and no Refit on 52 hull. **Marker 4. Heat 6:** Sling 4 flies both holes as assists and you win, +8, bank 13. Keel, Sling at two, takes them at 0.75; Halo, Mirror 3, shields three bursts and is second; Scrap folds next garage with nothing left to sell.

**The final** (ante 8, bank 5, nothing bought). Seven slots, triple purse, five solvent ships. Halo, richest, buys a Gamma Burst into slot 1. Bulwark, poorest and last, puts an Asteroid Field in the final slot before the line, which is the only reason Halo does not win. You take the assists: +24, **29**.

**Final standings.** You 29, Broker 21, Bulwark 20, Halo 18, Ledger 14, then the bankrupts by the heat they folded: Redline 7, Keel 6, Scrap 6.

## What it costs to build

**Survives unchanged:** `rng.ts`, `spline.ts`, `pilot.ts`, `builds.ts`, `actives.ts` as a table, and the shape of the tick loop.

**Changes, honestly.** `hazards.ts` is not untouched: `HazardContext` gains the modifier block, and `asteroidField`, `blackHole` and `ringedPlanet` each read a number from it instead of `tuning.ts`, with `blackHole` also reading the ignore-escape flag — three functions, three test files. `ship.ts` gains tag, tier and base price on `Part`, six new parts, tag counting, and a `resolveBuild` returning stats plus modifiers. `race.ts` reads its cooldowns and heat dissipation from the build. `track.ts` gains `laidBy` and stops owning a fixed track. `field.ts` widens `ShipId` to a string. `rivals.ts` becomes seven bots with ledger rules. `run.ts` is replaced. `tuning.ts` gains about thirty constants.

**New:** `market.ts` (prices, stock, buy, scrap, drift), `ledger.ts` (ante, purse, interest, forced scrap, bankruptcy, standings), `markers.ts` (menus, prices, order, slots), `course.ts`, `season.ts`, and the Solar Flare.

**Seventeen one-session PRs, first playable at nine:** the modifier block and `race.ts` reading it; `hazards.ts` reading modifiers; six new parts with tags and thresholds; `market.ts`; `ledger.ts`; `field.ts` to N ships; `course.ts` and `laidBy`; `markers.ts`; and `season.ts`, headless and complete. Then seven rivals, the Solar Flare, the harness, and five UI PRs: Ledger, Board, Course, the eight-ship render, results with attribution. Nine is not a handful; at one PR a session the first playable is two weeks and the whole thing a month.

**The harness** plays saver, spender, value buyer, one-tag, refit-always and never-refit over 500 runs and asserts: no tag wins more than 35%; a heat-1 winner wins under 35%; two to four bankruptcies a run, none before heat 4; the value buyer wins less often than the committed builder; the leader pays 1.5 more per part than the tail; each set-3 ship beats a set-2 ship on its own tag's hazard at least 60% of the time. A run is about 55,000 ship-ticks, so 500 runs lives in `npm run balance` and vitest asserts 50.

## What it needs from the owner

1. Are the rivals bots, recorded ghosts of past runs, or live players? Bots need nothing new; ghosts need every purchase and marker recorded as input, which this design already produces; live players need timers, and timers change every screen. Everything waits on this.
2. Is one currency for money, score and life too clever? The safe alternative is credits plus championship points, and one more number to hold.
3. Are the antes right at 0, 1, 2, 3, 4, 6, 8, or should the spike come earlier so the back half is not all banking?
4. Flat ante, or does the leader pay more? A handicap ante is the strongest brake on a runaway and the least fair-feeling rule here.
5. Seven heats and eight minutes, or nine and eleven? Nine gives a second tag time to come online.
6. Does a scrapped part return to the board, as here, or leave the game? Returning it makes bankruptcy feed the market: the best interaction in the design and the most confusing.
7. Should the whole field see every bank? Public banks make the market legible and the leader a target.
8. Is a fourteen-row board too much for a phone, or is one board you learn once better than a deal you re-read every heat?
9. Should Sling 3 make the black hole an assist, or only neutral? An assist is the moment a build comes online; neutral is safer.
10. Names: tags Burner, Brick, Mirror, Sling, and the Sling rival is Keel so a tag and a ship never share a name.

## Risks

**The leader compounds.** Purse, interest and marker power all favour whoever is winning. The brakes are the reverse-order board, the interest cap, the ante spike and the triple final. If the harness cannot get a heat-1 winner under 35%, the fix is the handicap ante in question 4.

**Money as the only number reads as a spreadsheet.** Credits are the only thing here that is a number: hull is a bar, tags are pips, the track is a picture. If the ledger needs a second column to be understood, the design has failed its own legibility test.

**The value buyer wins.** A ship that never commits, always buys under base and reaches no tag at three could beat the committed builder. That is the number the harness exists to check, and if it is true the fix is bigger tag-3 rules, not cheaper parts.

**A bought course is an empty course.** No marker can be bought before someone reaches two of a tag, which is why heats 1 and 2 are seeded; if heat 3 still comes up empty the seed extends to three.

**Bankruptcy could feel like a rules lawyer won.** The forced scrap gets its own screen naming what is sold and for how much, and if a player is ever surprised to be out, the ante schedule is not visible enough.

A richer third-person view needs nothing new from this sim: per-marker damage attribution, who bought each hazard, and the tick it lands.
