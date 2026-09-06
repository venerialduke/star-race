# The Cut, Two Cards

## In one paragraph

A run is a season: eight ships, seven heats, one points ladder, about nine minutes on a phone. After every heat from the third the bottom of the ladder is cut, and four ships fly a double-points final. Between heats there are three untimed screens: the ladder, where every build is four colours of pip; the course, where the leader lays one hazard card into the next course and the tail lays a second, seeing the leader's, every card carrying the name of who laid it; and the draft, where ten parts are dealt face up and ships pick in reverse ladder order. Every part has a tag; two of a tag is a direction and opens the cards you can lay; three changes a rule. Credits come from placing and go on parts, on repairs, or into the bank for the tier-two and tier-three parts that arrive in heats 3 and 5. Points keep you in, hull keeps you alive, and the other seven ships reach you through the deck, the cards and the line.

## The loop

The lobby first: seven rivals, each with a name and two words for what it reaches for, and the season, seven courses drawn end to end with every fixed hazard placed and two dashed boxes per course, the open slots. Thirty seconds of reading, one tap.

A heat is one course of four or five segments, 700 to 950 ticks at base speed, 12 to 16 seconds of flying after a three-second countdown. The final is six segments, about 1,100 ticks. Eight ships leave the line from a standstill under today's rules: hazards, heat, shields, hull, two actives, a handful of taps. The renderer fans eight lanes; the sim has one line.

Between heats, three screens, each one or two taps.

The ladder: eight rows of points, hull, credits, and each build as coloured pips with the set count lit. From heat 3 the cut line is drawn under the bottom row with the tiebreak rule beside it.

The course: the leader picks one hazard card from the menu its build allows and drops it into either open slot of the next course. Then the ship at the bottom picks from its own menu and fills the slot left, with the leader's card on the map.

The draft: ten parts dealt face up from the season deck, each printed with the copies left. Ships pick one each in reverse ladder order. A part costs credits; you may pass and bank, and repairs are bought here too.

Heats 1 and 2 are open: nobody is cut, the courses are gentle, and the first course's slots are dealt by the season because there is no ladder yet. After heats 3, 4, 5 and 6 the last row is cut. Four fly the final at double points, and the ladder after it is the standings. Seven heats of 15 seconds and six garages of three or four taps is eight to nine minutes: one gap on a train.

## The build

The five stats survive. A part is additive deltas resolved once before the race. Two things are new: every part carries one **tag**, and `resolveBuild` returns a block of **rule modifiers** beside the stats, which the race loop and hazards read instead of `tuning.ts`.

Four tags, fourteen parts, three tiers. Tier 1 is the six slice parts at 2 credits. Tier 2 enters the draft from heat 3 at 4. Tier 3 enters from heat 5 at 6.

| Tag    | Colour | Tier 1                            | Tier 2         | Tier 3         |
| ------ | ------ | --------------------------------- | -------------- | -------------- |
| Burner | red    | Ion Thruster, Overclocked Reactor | Afterburner    | Plasma Drive   |
| Brick  | grey   | Ablative Plating                  | Keel Plate     | Ram Prow       |
| Mirror | blue   | Mirror Shielding                  | Capacitor Bank | Phase Array    |
| Sling  | purple | Inertial Anchor, Radiator Fins    | Grav Keel      | Slingshot Core |

Higher tiers are bigger deltas with bigger costs: Ram Prow is +70 hull for −0.12 speed, Plasma Drive +0.25 speed for −25 hull and −20 heat tolerance. Copies count: three Ion Thrusters is Burner 3, because parts stack today and the balance table says that is fine. Thresholds change rules:

| Tag    | 2 of a tag (direction)         | 3 of a tag (online)                                       |
| ------ | ------------------------------ | --------------------------------------------------------- |
| Burner | Heat sheds twice as fast       | Reroute cooldown 420 ticks to 210                         |
| Brick  | Asteroid damage −30%           | Asteroid damage scales with speed, not speed squared      |
| Mirror | Shields hold 150 ticks, not 90 | The pool refills the tick a burst lands                   |
| Sling  | Black hole pull 0.55 to 0.75   | Assist and flare heat halved; black hole pull becomes 1.0 |

Each set is punished by one hazard: Burner by asteroid fields and the ringed planet, Brick by clean track because it is slow, Mirror by anything that is not a burst, Sling by bursts.

The modifier block is eight numbers and no more: asteroid exponent, asteroid damage multiplier, reroute cooldown, shield duration, black hole multiplier, hazard heat multiplier, heat dissipation, and a burst-refill flag. A part that needs a ninth is a stat delta instead.

Commitment is arithmetic from the pick count, not bought slots. Seven drafts is seven parts at most, and passing costs one. Two sets is six parts, the greedy dream; three sets is impossible. A build has a direction at the second part of a tag, which is also when its card menu opens, and comes online at the third: heat 3 at the earliest, heat 4 or 5 for most.

A second threshold at 5, the overdrive, is parked: Burner 5 gets a second reroute charge, Brick 5 repairs 20 hull free every heat, Mirror 5 halves the shield cooldown, Sling 5 flies the black hole at 1.3 with no escape threshold. It ships when the harness says sets at 3 are balanced.

## The economy

Credits, whole numbers, never inside the race. Every ship starts with 4.

The purse: 6 for first, 5 for second, 4 for third, 3 for everyone else who finishes. A lost ship gets 2, salvage. Interest is 1 per 5 banked, capped at 3, paid before the draft. Prices are 2, 4 and 6 by tier. Repairs cost 1 per 20 hull. No rerolls, because the draft is shared; no selling, because a wasted pick is what a pivot costs.

Why save. Interest is the small reason: 10 banked pays 2 a heat, a tier-1 part for nothing. Tier gating is the big one: the part that makes your set strong arrives at heat 3 or 5 costing 4 or 6, and a ship that spent 2 a heat on tier 1 walks into that draft with 3 credits and watches it go. Repairs are the emergency: hull carries between heats, and a ship that flew heats 1 to 3 fast reaches the heat 4 black hole with 40 hull and can buy plating or the part, not both.

Why spend. The cut is next heat and the ship one row below you just bought Plating for the rock the leader laid. A ship that banks its way to seventh place is rich and about to be cut.

Interest is 1 per 5 rather than run-first's 1 per 4 or the engineering review's 1 per 10: at 1 per 4 the cap arrives at 12 banked and the bank then pays nothing; at 1 per 10 most ships see no interest before heat 4.

## Run health and elimination

What you protect is your row on the ladder. Points per heat are 9 minus position, 8 for first down to 1 for eighth; a lost ship scores 0 and places behind every finisher. The final pays double. After heats 3 to 6 the bottom row is cut. Ties break on the most recent heat, so the ship falling is the one that goes.

Hull is heat health, not run health. It carries between heats and costs credits to repair. A ship destroyed in a heat returns at 40 hull with 2 salvage credits, build intact, and a 0 on the ladder. Two crashes in three heats will get you cut, and should.

Being cut is earned. Nobody goes before heat 3, so the first two garages are for planning. One ship goes per heat, so a bad heat 3 costs a row, not the run.

Recovery has four levers, none charity. The tail lays the second card with the leader's visible, so the bottom ship builds the sequence: rock in front of the leader's black hole. The tail shops first, so seventh takes the tier-2 that completes its set in front of the leader who wanted it. The final is double, so fourth going in is at most 16 points from first. And salvage plus interest is a tier-1 part or two repairs.

Standing as a drain, which two proposals used, loses to the ladder. A leak has no line under it; a player at 27 standing is dying, not fighting. The ladder is relative, so it can be climbed.

## Other players

Every interaction goes through the course, the deck and the line. Ships never touch.

**Two cards on every course.** The leader lays first and chooses the slot; the tail lays second into the slot left, seeing the leader's card. The menu is the build: any ship can lay Open Run, a clean stretch that rewards pace; two of a tag opens that tag's hazards. Burner lays the Solar Flare, Brick the Asteroid Field, Mirror the Gamma Burst, Sling the Ringed Planet or the Black Hole. A Brick leader drops rock and spares itself. The tail answers with sequence: a hole behind rock, a burst inside a shield cooldown, a flare after an assist.

The Solar Flare is the one new hazard: a single tick, no dice, a lump of heat shields do not stop. The burst says tap shields now; the flare says do not tap Reroute now. Burner 2 sheds heat twice as fast, so a Burner can afford its own card.

The cards land before the draft, so the field sees the course and shops for it, tail first. A leader who drops a burst has told six ships to want shields, and those six pick before it does.

**Every card has a name on it.** A placement carries the id of the ship that laid it, and the race log charges hull and heat to each placement. Results read hazard by hazard: "lost 30 hull to Redline's rock, shielded Halo's burst". A rival is a character after one heat, and the next draft is a response rather than a guess.

**The draft is shared and visible.** Ten parts for eight ships, from a deck of 4 copies per tier-1 part, 3 per tier-2, 2 per tier-3: 44 copies for about 40 purchases. Each card shows its copies left; a part bought is gone for the season. Two Burners want the same Afterburner and the one lower on the ladder gets it. Denial is legal and legible: taking the part that completes a rival's set, when you pick before it and it is one heat from cutting you, is a move the ladder shows everyone.

**Rivals are bots the harness can replay.** They draft by wish list in tags, as today. They lay cards by one rule: the hazard your set answers; with nothing at 2, Open Run; as the tail, a hole behind the leader's rock or a burst 200 ticks after the leader's burst, otherwise the hazard the ladder is worst equipped for by resolved stats. Two rivals read the ladder instead of a list: Ledger banks until it can afford the priciest card on the table, and Tinker buys whatever its ship is worst at for the course just laid. A rival is a build, a card rule and a pilot, all inputs, so one could later be a ghost of another player's run.

Everything is visible to everyone, always. Only tap timing is hidden; whether wish lists are printed is the owner's call.

## A worked run

Eight ships: You, Redline (Burner), Bulwark (Brick), Halo (Mirror), Keel (Sling), Ledger (banks for the priciest card), Tinker (buys what the laid course punishes), Scrap (cheapest card, never repairs).

**Lobby.** The map shows a black hole fixed in heat 4, a burst in heat 5, a ringed planet and a burst in heat 6, the full system in the final. You decide on Sling: two tier-1 parts, then Grav Keel before the black hole.

**Heat 1.** Seeded order. You take Inertial Anchor for 2; Ledger passes; everyone else takes its tag's tier-1 part. A gentle belt: Redline wins, you are fifth. Ladder: Redline 8, Halo 7, Tinker 6, Keel 5, You 4, Ledger 3, Bulwark 2, Scrap 1. You bank 3 and 1 interest: 6.

**Heat 2.** Redline leads with one red pip, so its menu is Open Run; it lays one before the fixed asteroid field. Scrap, the tail, lays Open Run too. Draft, tail first: you take Fins (Sling 2, 4 left); Bulwark, Halo and Redline each reach 2 of their tag. Redline wins, you are third; Scrap crosses the field flat out on no plating and is lost. Ladder: Redline 16, Halo 14, You 10, Keel 10, Tinker 10, Bulwark 5, Ledger 5, Scrap 1; the tie breaks on this heat, so you sit third. The line appears under Scrap. You bank 4 and 1: 9.

**Heat 3.** Tier 2 enters. Redline lays a Solar Flare after the fixed ringed planet; Scrap lays Open Run. Draft: Ledger, on 12, takes Grav Keel because it is the most expensive card on the table. Bulwark, Keel, Halo and Redline each reach 3 and come online. You pick fifth, Grav Keel is gone, and the planet and the flare are coming; you take the Reactor for 2 and hold 7. You overcook the planet and the flare, drop 25 hull, and finish fourth. Scrap is cut. Ladder: Redline 24, Halo 21, You 15, Keel 14, Tinker 13, Bulwark 11, Ledger 7. You bank 3 and 2: 12. First moment: Ledger took your part because it was expensive, and tail-shops-first is why you will get it back.

**Heat 4.** The black hole. Redline lays Open Run before it; Ledger, the tail with one purple pip, can only lay Open Run too. Draft: Ledger passes, nothing costs 6 yet. You pick fifth and Grav Keel is dealt again, one copy left. You have 12: Grav Keel for 4, 20 hull for 1, Sling 3 online. The pull is a slingshot; you win, Keel second, Bulwark third, Halo fourth. Redline, on 22 hull after three fast heats and no repairs, reroutes into the hole, cooks 8 hull, and is under the escape line. Lost. Ladder: Halo 26, Redline 24, You 23, Keel 21, Bulwark 17, Tinker 17, Ledger 10. Ledger is cut with 12 banked: rich in seventh and cut. You bank 6 and 2: 14.

**Heat 5.** Tier 3 enters. Halo leads with Mirror 3 and lays a Gamma Burst 200 ticks after the fixed one, inside the shield cooldown. Tinker, the tail with Brick 2, lays an Asteroid Field. Draft: Bulwark takes Ram Prow, Halo Phase Array, you the last Mirror Shielding for 2 (12 left). Halo's pool refills as each burst lands and it wins; you shield the first, eat the second, and finish second on 50 hull. Keel, on cooldown for the second burst with 30 hull, is lost. Ladder: Halo 34, You 30, Redline 30, Bulwark 22, Tinker 21, Keel 21. Tinker stays on the tiebreak; Keel is cut. You bank 5 and 3: 20.

**Heat 6.** Halo lays a Gamma Burst before the fixed ringed planet; Tinker lays an Asteroid Field after it. You take Capacitor Bank for 4 and repair 40 hull for 2: Mirror 2, 14 left. Redline wins, you are second, Bulwark third, Halo fourth after Tinker's rock. Tinker, on cooldown for Halo's burst, is lost and cut. Ladder: Halo 39, Redline 38, You 37, Bulwark 28. You bank 5 and 3: 22.

**The final.** Six segments, double points: ringed planet, burst, black hole. Halo lays a Gamma Burst in the first open slot. Bulwark, the tail with Brick 3, lays an Asteroid Field in the second, directly in front of the fixed black hole. You take Phase Array for 6: Mirror 3 online beside Sling 3, seven parts, two sets. Your pool refills through both bursts and the pull is a slingshot. Halo, on 55 hull with four blue pips and no plating, crosses Bulwark's rock at speed and reaches the hole at 11 hull. Lost. You win, Bulwark second on hull, Redline third. Final ladder: You 53, Redline 50, Bulwark 42, Halo 39, then Tinker, Keel, Ledger, Scrap.

Halo's results screen reads "lost at the black hole: 44 hull to Bulwark's rock". Second moment: the tail laid it with the leader's card on the map, and the leader's run ended on a hazard with a rival's name on it.

## What it costs to build

Survives unchanged: `hazards.ts` apart from one new function, `actives.ts`, `pilot.ts`, `rng.ts`, `spline.ts`, and the loop shape of `race.ts`.

Changes. `ship.ts` gets a tag and tier per part, eight new parts, and `resolveBuild` returns a `Modifiers` record of eight numbers. `race.ts` reads those eight from the build instead of `tuning.ts`; the burst refill is a new branch in the one-shot path. `HazardPlacement` gains an optional `laidBy` ship id and a course gains two open slots. `RaceState` gains a damage-per-placement map so attribution is data. `field.ts` widens `ShipId` to a string. `rivals.ts` grows to seven with wish lists in tags and a card rule. `tuning.ts` gains sets, prices, purses, points, interest and the flare's heat.

New: `season.ts`, `cards.ts`, `ladder.ts`, `draft.ts`, `economy.ts`. `run.ts` is rewritten around the ladder, the biggest single change. In the UI, a lobby, a ladder with pips, a course screen and a draft replace the garage; results gains attribution.

The harness gains bots for save, spend, set-chase, counter-pick, deny and card-reader. One run is about 48,000 ship-ticks, the cheapest of the four; a 500-run batch is 24 million, so the vitest bound drops to 50 runs and the batch lives in `npm run balance`.

Sixteen one-session PRs, in the order they unblock: (1) modifier block and `race.ts` reading it. (2, 3) eight new parts with tests. (4) `laidBy` and per-placement damage. (5) season courses with two slots. (6) ladder, cut, tiebreak. (7) purse, interest, repairs. (8) draft with copies left. (9) seven rivals with card rules. (10, 11) `run.ts` rewrite. (12) Solar Flare. (13) harness bots. (14) lobby and ladder UI with pips. (15) course and draft UI. (16) results with attribution and the eight-lane render. The first playable is the first eleven.

## Where it came from

From **run-first**, the spine: seven heats, the ladder with the cut line, one ship cut per heat from the third, the tiebreak on the most recent heat, tail shops first, the face-up draft in reverse order, tags with a direction at 2 and a rule at 3, tier gating, purse and repairs on one coin, a lost ship back at 40 hull with salvage, three untimed screens, the season map in the lobby.

From **build-first**: the modifier block with a hard cap, coloured pips with a count, copies counting toward a set, the family deciding what you can lay, the overdrive at 5 as the parked late game, commitment as arithmetic (from seven picks rather than six hardpoints), rivals as future ghosts.

From **interaction-first**: attribution, a placement carrying the id of who laid it and results reading hazard by hazard; sequence, the tail placing second with the leader's card visible; the Solar Flare; the bot card rule beside the tap rules.

From **economy-first**: copies remaining printed on every card, one coin for parts and repairs, and the names Plasma Drive and Slingshot Core.

## What was rejected, and why

Hardpoints as the base, which the fun review recommended. Its best ideas graft cleanly, and the two reviews that weighed cost and legibility chose The Cut. What the fun review valued most, a family total you count toward and a hull that forces commitment, is here as pips and seven picks. What is not here is the standing drain, the eight-beacon course and bought slots, its three weakest parts.

Everyone drops a beacon every round. Eight labelled boxes on three segments is a course a phone cannot read, and three cored beacons do not fit in any current segment.

Flags as a vote. One flag in a tally of nine rarely decides anything, and the proposal's own equilibrium is everyone flagging the burst.

Mk II merges and part levels. Stacking already does the job, and a merge needs a part's upside split from its cost.

Buyable slots. Tier gating and repairs already give the bank two reasons to exist.

Free hull repair between heats. It removes the F-Zero trade the brief asked for.

Standing as a decreasing drain. No line under it, and a bad sector is permanent.

The star's dissipation curve. One invisible number per heat that changes what every part is worth. Escalation here is the season map.

Hot laps, appearance money, streaks and secret flags. Five income sources is a purse you cannot explain after a heat.

Timers between heats. Every rival is a bot, so a timer is against nobody, and a tunnel should not cost a draft.

Burn overdrive as "never cooks, runs faster hot". A balance grenade by its own author's account.

Twelve heats and twenty minutes. Four gaps on a train.

Selling, rerolls and the Special Order. Each is a decision kind the harness would have to bot.

Bridges that count for two tags: parked, to enter as tier-2 parts once the four pure builds are balanced.

## Decisions for the owner

1. Seven heats, or five with a cut after every heat from the second? Seven gives a set three heats of payoff; five is six minutes and a set comes online with one heat left.
2. Two cards per course, leader then tail, or one? Two is the answer to the fourth gap; one is cheaper by a PR and leaves seven ships nothing to do on the track.
3. Does the leader choose its slot, or is slot order fixed? Choice gives a positional read; fixed keeps the screen to one tap.
4. Copies count toward a set, or three distinct parts? Copies let a set come online at heat 3; distinct parts push every set to heat 5.
5. A lost ship returns at 40 hull with its build intact, or loses its last part? Intact is legible; losing a part is the stronger reason to repair.
6. Are rival wish lists printed on the ladder, or only pips? Printed is more legible; hidden gives a rival a character to discover.
7. Is denial a move this game wants? It is the auto-battler feeling and the pick a phone player may not read.
8. Eight ships or six? Eight is the field four cuts need; six is easier to draw.
9. Solar Flare in the first playable, or four hazards until sets are balanced? One function and one test, and a fifth thing to learn.
10. Does the final pay double, or flat? Double is the comeback lever; flat is the easier sum.
11. Names. Tags are Burner, Brick, Mirror, Sling; the Sling rival becomes Keel so a tag and a ship never share a name.

## Next round

Take this framework as fixed. Develop three things and challenge one.

Develop the course phase in full: the card menu per tag and count, where the two slots sit on each course, the bot card rule as pseudocode, and the degenerate-course test, a bot that always lays the same card against one that reads the ladder, with the claim that the reader must win more.

Develop the harness: bots by name, run count, targets as assertions. A runaway leader after heat 3 is caught a third of the time; no tag wins more than 35% of runs; saver, spender and switcher each reach the final a fair share; a heat-1 winner wins the run under 35% of the time.

Develop the first eleven PRs as interfaces: what `Modifiers` holds, what `Season`, `Ladder` and `Draft` are as types, and what `run.ts` becomes, so the first sim-engineer session starts from a signature.

Challenge whether two cards is enough interaction, or the leader-lays-course snowball wearing a hat. A proposal for three cards, for the tail laying first, or for every ship below the line laying one, should say what it costs in screens and bots.
