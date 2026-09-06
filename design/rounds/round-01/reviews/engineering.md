# Review: Engineering

The lens is cost. I read every proposal against what is in `src/sim` today: a 475-line race loop that reads its rules from `tuning.ts` through `hazards.ts` and `actives.ts`, a 185-line field that already steps any number of entries, a 306-line immutable `run.ts` state machine with three phases, a garage that shuffles six parts, two rivals with wish lists, and a harness that plays a `Run` through `choosePart` and `runStage` with a pilot on the stick. Every proposal rewrites `run.ts` and widens `ShipId`. Those are the same price everywhere, so they do not separate the four. What separates them is how many new decision kinds the harness has to bot, how much of the race loop has to learn about the build, and whether the shop can be resolved in an order.

Two costs no proposal states. First, three of the four have eight ships buying "at once" from one finite pool. The sim has no "at once"; it needs an order, and whoever goes first gets the last copy. Only The Cut says what the order is. Second, every proposal multiplies harness load by 15 to 35. Today the balance test runs about 10 million ship-ticks. A 500-run batch of eight ships over 7 to 12 heats is 150 to 350 million. The vitest bound test drops to 50 runs and the real batch moves to the script, or CI stops being green in under a minute.

| Proposal                                            | Build fantasy | Tradeoffs | Interaction | Stakes | Legibility | Fit | Buildable | Measurable | Total |
| --------------------------------------------------- | ------------- | --------- | ----------- | ------ | ---------- | --- | --------- | ---------- | ----- |
| The Purse (economy-first)                           | 4             | 5         | 4           | 4      | 2          | 4   | 2         | 3          | 28    |
| The Course Is the Other Players (interaction-first) | 4             | 3         | 5           | 4      | 3          | 5   | 3         | 4          | 31    |
| The Cut (run-first)                                 | 4             | 4         | 3           | 4      | 4          | 5   | 4         | 5          | 33    |
| Hardpoints (build-first)                            | 5             | 4         | 4           | 3      | 3          | 4   | 3         | 4          | 30    |

## The Purse

Build fantasy: 4. Makers at two give a stat and at four give a rule, and Slingshot four turning the black hole into a 1.15 assist is a real "online" moment; the Mk II is a second system doing the same job.

Tradeoffs: 5. Five income sources and four sinks, with interest, streaks, repairs and priced flags all pulling on one bank, is the richest economy of the four and the save-versus-spend case is argued with numbers.

Interaction: 4. The pool with visible counts and public banks make the field readable, but a flag is a vote that averages nine or ten across four hazards, so most players' flags do nothing most heats.

Stakes: 4. Cuts at heats four and eight, a lost ship back at 25 hull, and the streak valve are sound; the proposal's own risk section admits purse plus hot laps plus interest can decide a run by heat six.

Legibility: 2. Makers, Mk II, slots, streaks, interest, hot laps, sector odds, secret flags with a public tally. The proposal says it is one system more than a phone holds. I count three.

Fit: 4. Pure and tick-bound throughout; the six rule modifiers in `RaceOptions` are the right shape. It claims the race loop survives unchanged, but hot laps need per-segment split times per ship, which `RaceState` does not record. That is a `segmentEnd` event in `stepRace`, small but unlisted.

Buildable: 2. Sixteen to twenty PRs is stated and I believe twenty-two. Six decision kinds in the garage (buy, sell, reroll, slot, repair, flag) each need a sim input, a UI and a bot. The Mk II needs a part's upside split from its cost, which `StatDelta` does not model. The "first playable at eight PRs" has credits and cuts but no makers and no flags, so it answers gap two and neither of the gaps the brief cares most about.

Measurable: 3. Bots are named, but with six decision kinds per garage the strategy space is wide enough that "chooses well" is whatever bot the author wrote, and the run is the heaviest to batch: 12 heats of 8 ships at 1,200 ticks is 115,000 ship-ticks per run.

Best idea: the shop shows how many copies of each part are left. "Ion Thruster, 2 left" is one number that makes the pool a contest instead of background randomness, and it costs a counter on the pool.

Fatal flaw: it is three games. The economy is the game the proposal wants to be, and the makers and flags are bolted to it late enough that the proposal's own first playable leaves them out.

## The Course Is the Other Players

Build fantasy: 4. Levels are literally the stacking `resolveBuild` already does, so the synergy is not between parts, it is between the build and the seed it lays. That is a real identity, and a Mk III in heat four is a real moment, but the part list is the slice's six.

Tradeoffs: 3. Income is flat on purpose, ship hull is repaired to full, so the between-heat spend has no repair sink and only the Special Order and the pool argue for saving. Thinner than the other three.

Interaction: 5. My hazard is on your track with my name on it, the bottom wave places with the top wave's seeds visible, and the results screen reads hazard by hazard. This is the only proposal where the answer to the brief's fourth gap is the whole game.

Stakes: 4. The run-hull arithmetic checks out: fifth every heat scrapes home at 93 lost, sixth every heat is out in heat eight, nobody is out before heat three. Elimination by living in the bottom half is earned.

Legibility: 3. Four timed phases, two seeding waves, a level per part, an eighteen-entry seed table and a star multiplier on top of a run-hull toll. Attribution on the results screen carries a lot of the load, and it is the right thing to carry it.

Fit: 5. The course is the arena, so all interaction is `Track` data going into `simulate`, which is exactly what the brief asks for. The star is one `RaceOptions` number. The Solar Flare is a one-shot heat hazard, which is an `isOneShot` case and one function.

Buildable: 3. Eighteen PRs and "S2 and S3 again" is honest. Two things are missing from the cost. Attribution needs per-placement damage accounting in `stepRace`, because today only one-shot hazards log anything; that is a map on `RaceState` and a change to the loop the proposal says is unchanged. A Mk III seed spanning two slots breaks the `makeTrack` rule that a placement lies inside its segment, so a slot has to become two segments or the rule has to bend. Neither is large. The simultaneous shop from a shared pool has no resolution order.

Measurable: 4. The seeding bot is one stated rule in `pilot.ts`, and "a bot that always seeds the same thing against bots that read the ribbon" is the right test. The noise is that the course is emergent from eight seeders, so a strategy's win rate has more variance per run than in a fixed-course design; more runs, same harness.

Best idea: a placement carries the id of who laid it, and the race log charges damage to it. That is the cheapest possible "other players" and it makes rivals legible without a word of UI copy.

Fatal flaw: none that sinks it. The one to watch is the shop: eight players buying at once from twelve copies is undefined until someone writes the order, and the order decides who gets the third Mirror.

## The Cut

Build fantasy: 4. Four tags, direction at two and online at three, and sets that change a rule not a number. Brick three flying an asteroid field at full speed and Sling three being slung through the black hole are exactly the two moments the slice's hazards were built to give.

Tradeoffs: 4. Tier gating is the best save reason of the four: the part that completes your set costs 4 or 6 the heat it appears. Interest at 1 per 4 capped at 3 saturates at 12 banked, so past 12 the bank pays nothing and the cap should move to 1 per 10.

Interaction: 3. Only the leader shapes the course, and it is one card in one slot, so seven of eight players have no lever on the track. The draft in reverse ladder order with denial is strong and cheap, but it is the weakest answer to the fourth gap of the four, and the proposal knows it.

Stakes: 4. One cut per heat from heat three, a ladder everyone watched build, a lost ship back at 40 hull with 2 salvage, and the tail shopping first. Nothing is sudden, the line is drawn on screen, and the worked run's numbers add up.

Legibility: 4. Three screens in a fixed order and one ladder that holds every number the game has. Eight set rules are the most a phone player has to carry, and they are named after what they do.

Fit: 5. Pure, tick-bound, nothing touches, and the draft is sequential by construction, so it is the only proposal whose shop the sim can resolve without inventing an order. The seven courses are level data with one open slot each, not a generator.

Buildable: 4. Thirteen PRs with the first playable at nine is the smallest honest count and I would put it at fourteen. The "only change to race.ts is five numbers" is nearly true: Mirror three refilling the pool the tick a burst lands is a new branch in the one-shot path of `stepRace`, and the reroute cooldown has to come from resolved stats instead of `activeById`. Both are afternoon work. Six new parts with tests is two sessions, not one.

Measurable: 5. Two decision kinds between heats (pick or pass, and the leader's card), a stated bot per strategy including deny and counter-pick, and the cheapest run to batch at about 48,000 ship-ticks. The "runaway leader after heat three is caught a third of the time" claim is a one-line assertion in the harness.

Best idea: the tail shops first. It is a comeback lever with no charity in it, it is one sort on the ladder, and it makes denial a move the player can see coming.

Fatal flaw: none. The weakness is interaction, and it is the cheapest of the four gaps to graft into this frame.

## Hardpoints

Build fantasy: 5. Six hardpoints make the archetypes arithmetic, core at three and overdrive at five give two online moments, bridges make pairs cost one slot less, and the Gravity overdrive diving what kills everyone else is the best single fantasy in the round.

Tradeoffs: 4. Hardpoints at 6, 8 and 10 are a real long bet against parts at 3 now, and the greedy, banker and switcher bots are the right three to check it with. Interest at 1 per 10 capped at 3 is sane.

Interaction: 4. Every player drops a beacon, the family decides which, and the pool has a bar per family. It is a rock-paper-scissors nobody has to be taught. The beacon menu is one shape per family, so the choice is where and at whom, not what.

Stakes: 3. The standing arithmetic is wrong. Fifth every round costs 2, 2, 2, 3, 3, 3, 4, 4, 4, which is 27, not 20; that ship is out in round eight, not "exactly 0 at the end". Last every round is out in round four, not five. Tariff, seventh or eighth every round, is out in round five, not six as the worked run says. The shape is fine; the numbers that are supposed to be the tuning edge do not add up.

Legibility: 3. Coloured pips with cores lit are the most legible build display proposed. Against that, fifteen parts, ten modifiers, two bridges and eight rule changes is a lot to hold, and the proposal's own risk section says the modifier set could sprawl.

Fit: 4. Pure and tick-bound. Three of the four beacons are existing hazards with a parameter (a 30-point burst, a 60-tick field, a pull with no threshold), which means `HazardPlacement` grows parameters and the hazard functions stop reading `tuning.ts` directly. The Burn overdrive is a branch in the cooking block of `stepRace`, the Armour overdrive is a repair in `run.ts`. Ten modifiers is more of the race loop learning about the build than the other three.

Buildable: 3. Fourteen PRs claimed, seven for the first playable. I count seventeen. Beacons "laid end to end from the middle" do not fit: three cored beacons are 360 ticks and no slice segment is longer than 200, so either they overlap, which the loop allows and the drop screen would not show plainly, or segments get longer and the course gets rewritten. The shop has the same unresolved simultaneous-pool problem as The Purse, plus a rule that the bottom three are served first when a copy is the last one, which is a second ordering on top of the first.

Measurable: 4. Six archetypes plus three economic bots is a good harness, and the standing claims are precise enough that the harness would have caught them. Shop order has to be defined before any of it runs.

Best idea: `resolveBuild` returns a modifier block beside the five stats, hazards and the loop read from it, and the ceiling is ten numbers with the rule that any part needing an eleventh is a stat delta instead. That is the right engineering shape for sets in any of the four proposals.

Fatal flaw: the arithmetic in the section that is supposed to be the tuning edge is off by a third, and the beacon geometry does not fit the track it is dropped on. Neither is a design flaw, both are the kind of thing that turns fourteen PRs into twenty.

## Recommended merge

Build from The Cut. It has the smallest honest count, the only shop the sim can resolve without a new rule, fixed courses that are level data, and a harness that needs two bot decisions per heat instead of six. Its ladder is also the one screen the brief's fourth gap needs, and it is already drawn.

Graft five things, in this order.

First, from Hardpoints: the modifier block. `resolveBuild` returns the five stats and a `Modifiers` record, hazards and `stepRace` read from it, and the cap is eight numbers. The Cut's five plus a burst refill flag fit. This is PR one and it is what every set in every proposal needs.

Second, from The Course Is the Other Players: seeder ids on placements and per-placement damage in the race log. Two PRs. Then The Cut's leader card is the first thing on a course with somebody's name on it, and the results screen reads "lost 25 hull to Bulwark's rock" for free.

Third, from the same proposal: the tail lays a card too. The Cut's course gets two open slots, the leader fills the first from three cards and the last-placed ship fills the second after seeing the leader's, with the card menu decided by tags held, so a Brick ship can lay a field and a bare ship lays an open run. That is the cheapest way to give seven ships a lever on the track, and it does not need a course generator. The seeding rule for rivals is the one The Course stated: lay what your set answers, put a hole after rock.

Fourth, from The Course: the Solar Flare, one function and one test. Burner needs a hazard that punishes it, and "do not tap Reroute now" is the burst's mirror.

Fifth, from Hardpoints: coloured pips per tag on the ladder, and a bar per tag under the draft showing copies left in the season deck. UI only, no sim change, and it turns The Cut's "Halo has Mirror 2/3" text into something a thumb reads.

Leave out the Mk II from both proposals that have it. Stacking already does the job and the sim already measures it. Leave out The Purse's flags, streaks, hot laps and slots. Fix The Cut's interest to 1 per 10 capped at 3.

Count after grafting: sixteen one-session PRs, first playable at ten. Modifier block, six new parts in two sessions, seeder ids and attribution, season courses with two slots, ladder and cut, purse and repairs, draft, seven rivals with two card rules, `run.ts` rewrite in two sessions, Solar Flare, harness bots, then ladder and draft UI with pips.
