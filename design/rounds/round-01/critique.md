# Critique

1. **The player never lays a card.** Only the leader and the tail lay cards, so six of eight ships have no move on the track in any heat. In the worked run the player is never leader or tail, lays nothing in seven heats, and wins; the brief's fourth gap is the one it says matters most, and the synthesis's own example answers it with seven draft picks and two repairs. For a mid-ladder ship the track interaction is a rival's name printed on a hazard, which is PvE with a label.

2. **The economy has no scarcity, so saving costs nothing.** Start at 4, tier 1 at 2, purse at least 3, interest from 5 banked: a ship that finishes heats 1 and 2 and buys at both drafts holds 8 at the heat-3 draft, so "walks into that draft with 3 credits" cannot happen to a finisher. Over a season a fourth-place ship earns about 30 and the full set path (2, 2, 2, 4, 4, 6, 6) costs 26; the worked-run player buys at every draft, repairs twice, and ends with 16 unspent. Fourth to eighth all earn the same 3, so position barely pays.

3. **Bots or players is decided without being asked.** Timers between heats are rejected "because every rival is a bot", which settles single-player versus multiplayer in a rejection note rather than in the eleven decisions for the owner. The brief's fourth gap is other players; the synthesis delivers seven scripted characters and parks ghosts in one clause. The lobby, the draft and the harness all depend on this call, and it is the owner's, not the synthesiser's.

4. **Mirror 3 contradicts the worked run.** Shields hold 150 ticks at Mirror 2, so a burst laid 200 ticks after the fixed one lands with shields down, and a pool that refills on landing refills nothing. Halo's heat-5 win and the player's final are both credited to a refill "through both bursts" that the stated rule cannot deliver. A base pool of 50 already stops a 45 burst, so the synthesis owes one concrete course where Mirror 3 changes the result.

5. **Brick's online moment rewards a stat Brick removes.** Brick 3 makes rock scale with speed instead of speed squared, on a ship that paid 0.08 speed per plate and 0.12 for Ram Prow. Brick and Mirror also have one tier-1 part each, four copies, against eight red and eight purple copies, so two Bricks cannot both reach 3 before heat 3, and the deck rather than the draft decides who gets a set.

6. **Hull is not run health at 1 credit per 20.** The brief offered hull as the thing greed spends across rounds; here a ship on 40 is back to 100 for 3 credits, less than one tier-2 part. Redline dies on 22 hull "after three fast heats and no repairs", but no bot repair rule is given except that Scrap never repairs, so that death is scripted rather than earned. The rejected "free repair between heats" is back at a price nobody will notice.

7. **The tail has no reason to lay a real card.** A laid hazard hits every ship on the course, including the one that laid it, and the tail is the ship least able to survive it. The worked run shows this: Scrap lays Open Run twice, Ledger can only lay Open Run, and the one tail card that decides anything is Bulwark's rock in the final, laid by a Brick 3 immune to its own card. "Sequence" is asserted as the comeback lever and demonstrated once, by the only ship for which it was free.

8. **The cost estimate hides hazards.ts.** Four of the eight modifiers, the asteroid exponent and multiplier, the black hole multiplier and the hazard heat multiplier, live inside hazard functions that read tuning.ts today, so HazardContext changes, four functions change and four test files change; "survives unchanged apart from one new function" is wrong. Sixteen PRs is not a handful, and three of them (lobby and ladder with pips; course and draft UI; results with attribution plus an eight-lane render) are each larger than any UI PR the slice shipped.

9. **The draft's deal is not specified.** Ten cards from a deck of 44 copies, dealt seven times, is 70 deals from 44 cards; whether unbought cards return, whether a cut ship's parts return, and whether the deal guarantees every tag appears are all unsaid. A random ten with no tag guarantee means a Brick can go two drafts without seeing Plating, and the harness cannot separate "choosing well pays" from "the deck was kind".

10. **Counter-picking mostly means copying the leader.** The answer to rock is Plating, the answer to a hole is hull, the answer to a flare is dissipation, the answer to a burst is a base pool and timing; each is the laying tag's own part, which the leader has been draining from a four-copy supply for three drafts. The synthesis promises "they are going for X, so I want Y" and never names a Y that is not X.

11. **Several numbers do not hold.** Fourth entering the final can be 18 points back, not "at most 16": a ship that wins six heats has 48, and three rivals on 7, 6 and 5 a heat leave fourth on 30. The player's bank after heat 4 is 15, which pays 3 interest, not 14 paying 2. The Solar Flare has no heat figure, a slot has no length so a 130-tick black hole may not fit one, and "seven drafts" sits two paragraphs from "six garages".

12. **Nobody counted the systems.** Fourteen parts, four tags with eight threshold rules, three tiers, five hazards, four card menus, two slots, purse, salvage, interest, repair, ladder points, a cut, a tiebreak and a double final. The slice had six parts and four hazards; the rubric asks whether a phone player can hold this in one head, and the synthesis never asks.

## What the next round should be asked

Not "take this as fixed". The spine can be fixed: seven heats, a ladder with a cut line from heat 3, reverse-order face-up draft, tags with a direction at 2 and a rule at 3. The economy numbers, the two-card rule and the bots-or-players question cannot, because each fails against the brief as written.

Ask for the player on the track every heat. A proposal for every ship laying one card, or every ship below the line, or the two cards going to the two ships with the fewest points, priced in screens and bot rules, with a worked run in which the player lays at least four cards and one of them decides a heat.

Ask for prices that bite. Targets, not adjectives: a ship that buys at every draft holds under 4 credits at the heat-3 draft; a full repair from 40 hull costs more than a tier-2 part; the purse for fourth differs from eighth. Show the credit table per heat for a spender, a saver and a switcher, and say which one reaches the final most often.

Ask the owner, in the decisions list, whether rivals are bots, ghosts of other runs, or live players, and let the proposal say what each needs recorded and what each costs.

Ask for each set's third part to be visible in fifteen seconds. One line per set: on a course carrying that set's own card, a set-3 ship beats a set-2 ship by at least 20% of races. Rewrite Mirror 3 and Brick 3 until they pass it, and fix the Mirror 2 duration or the burst spacing so the worked run is legal.

Ask for the deal and the tail's menu in full: what returns to the deck, whether ten cards guarantee four tags, and why a tail with no set lays anything but Open Run.

Ask for the cost again with hazards.ts on the list, and either a first playable in eight PRs or a plain statement that it is eleven and the slice's one-PR-a-session pace is the real schedule.
