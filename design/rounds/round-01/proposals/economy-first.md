# The Purse

## Premise

Star Race becomes a twelve-heat championship for eight ships, and every decision between heats is a decision about credits. Credits are earned by placing, by driving the fastest segment, and by having credits already. They are spent on parts, slots, hull repairs, and flags that put hazards onto the next course. The three gaps close from the same coin: the build is what credits buy, run health is what credits repair, and the other players are the people bidding for the same parts and the same track. The line to say back after one run: points keep you in, hull keeps you alive, credits buy both.

## The loop

A run is twelve heats in three sectors of four: the Outer Belt, the Inner System, the Core. A heat is one course of three segments, about 1,200 ticks at base speed, twenty seconds of racing after a three-second countdown. Eight ships fly it and never touch.

Between heats is the garage, and the garage is the game: the shop, the frame, the repair bay and the flag. The player sees the next course before buying anything. Two of its three segments are drawn from the sector's table by the run seed; the third is empty, and the field fills it by flagging. The garage is untimed but should take about forty-five seconds.

After heats four and eight the bottom two ships by championship points leave. Eight become six, six become four, and the four race a five-segment final at heat twelve worth double points. Most points after the final wins. Twelve heats at about seventy-five seconds each is fifteen minutes; with the lobby, the cuts and the long final, a little under twenty.

Sectors escalate. The Outer Belt has asteroid fields and one gamma burst. The Inner System adds ringed planets and lets players flag a black hole. The Core seeds black holes into its own segments and has two flagged segments per course. The late game needs real hull, real shields or a build that turns gravity into speed.

## The build

A ship has slots and a part fills a slot. Every ship starts with four and can buy up to seven. Parts stay what they are today, additive deltas on the five stats, with a price that is also their tier, and one new thing: a maker. Four makers, fourteen parts.

| Part                | Price | Maker     | Gives                               | Costs                        |
| ------------------- | ----- | --------- | ----------------------------------- | ---------------------------- |
| Ion Thruster        | 1     | Vulcan    | +0.15 speed                         | −10 hull                     |
| Radiator Fins       | 1     | Vulcan    | +45 heat tolerance                  | −15 hull                     |
| Ablative Plating    | 1     | Bastion   | +40 hull                            | −0.08 speed                  |
| Mirror Shielding    | 1     | Prism     | +35 shields, +12 hull               | −0.05 speed                  |
| Inertial Anchor     | 1     | Slingshot | +0.03 acceleration                  | −0.02 speed                  |
| Overclocked Reactor | 2     | Vulcan    | +0.10 speed, +0.015 accel           | −30 heat tolerance           |
| Afterburner         | 2     | Vulcan    | +0.12 speed                         | −20 hull, −10 heat tolerance |
| Reinforced Ribs     | 2     | Bastion   | +30 hull, +15 heat tolerance        | −0.06 speed                  |
| Deflector Array     | 2     | Prism     | +25 shields, shields hold +30 ticks | −0.04 speed                  |
| Gravity Keel        | 2     | Slingshot | +0.025 accel, +10 hull              | −0.03 speed                  |
| Plasma Drive        | 3     | Vulcan    | +0.25 speed                         | −25 hull, −20 heat tolerance |
| Fortress Plating    | 3     | Bastion   | +70 hull                            | −0.12 speed                  |
| Phase Shield        | 3     | Prism     | +60 shields, +0.02 accel            | −0.06 speed                  |
| Slingshot Core      | 3     | Slingshot | +0.05 accel, +0.08 speed            | −20 hull                     |

Two things make parts combine. The first is the maker bonus: two parts from one maker give a stat, four give a rule. Vulcan at two is +25 heat tolerance; at four, Reroute Power's cooldown drops from 420 ticks to 240 and its heat halves, so a Vulcan ship boosts twice a heat and through the ringed planet without cooking. Bastion at two is +25 hull; at four, asteroid damage and the black hole's escape threshold both halve. Prism at two makes shields hold 150 ticks instead of 90; at four, Raise Shields fills to double capacity and holds 300 ticks. Slingshot at two is +0.02 acceleration; at four, the black hole's 0.55 speed multiplier becomes 1.15. The Core's worst hazard becomes that ship's best assist.

The second is the Mk II. Three copies of one part merge into a Mk II that takes one slot, gives three times the upside and pays the single cost. Three Ion Thrusters are +0.45 speed for −30 hull; a Mk II is +0.45 for −10 and two free slots. There is no bench: copies race until the third arrives.

A build has a direction from the second purchase, because two of a maker is already a plan. It comes online at the four-count, around heat six or seven, or at the first Mk II, around heat five. Selling a part back pays its price minus one, so a pivot costs a credit per part and the heats spent.

## The economy

One currency, credits, in whole numbers, never inside the race.

Income arrives after every heat from five sources. Appearance money is 3 for every ship that started, lost or not. The purse is 4 for first, 3 for second, 2 for third, 1 for fourth, nothing below and nothing for a lost ship. Hot laps pay 1 to the fastest ship through each segment, so a speed build that crashes in segment three is still paid for the first two. Interest is 1 per 10 banked when income is paid, capped at 5. Streaks are the recovery valve: three heats in a row outside the top four pays +2 a heat until the streak breaks; three in a row inside it pays +1, five in a row +2. A mid-field ship makes about 6 a heat, a leader 9 or 10, a saver on 50 makes 8 without placing. Over twelve heats a ship sees roughly 80 credits, and what it could buy adds up to more, which is the point.

Four sinks, three of them new. The shop shows five parts each garage from a shared, finite pool: twelve copies of each 1-credit part, eight of each 2, five of each 3. What a rival buys is gone until they sell it. Odds shift by sector: 70/25/5 across tiers in the Outer Belt, 40/40/20 in the Inner System, 20/40/40 in the Core. A reroll is 2. Slots: the fifth costs 4, the sixth 6, the seventh 8. Repairs are 1 per 10 hull. Flags: the first is free, the second and third cost 2 each.

Saving is right because interest is the only income that does not depend on the field. A ship at 50 by heat six has been paid 3 to 5 a heat for nothing, which over a run is a tier-three part and two slots. Saving is wrong when the pool is emptying: if three ships are Vulcan the Ion Thrusters are gone by heat five. Greed is right when the course ahead is kind: skip the repair, buy the Afterburner, take the hot laps. Greed is wrong the heat before a burst you cannot shield or a black hole you cannot escape, and both are drawn on the course before you decide. Neither is obviously right because the shop, the course and seven other banks are on the screen at once.

## Run health and elimination

Hull carries between heats and is not repaired for free: the slice's rule, now a credit sink. A ship that flies the Outer Belt fast arrives at heat five with 40 hull and a choice: 6 credits to repair, or a Reinforced Ribs and hope. A ship lost in a heat scores no points and no purse and starts the next heat at 25 hull whatever its maximum. It is not out, only poor and fragile, and a full repair is 5 to 10 credits it does not have.

Elimination is by standing. Every heat pays championship points: 8, 6, 5, 4, 3, 2, 1, 0 by position, lost ships last. After heat four the bottom two leave; after heat eight, two more. The final pays double. A tie at a cut is broken by fewer lost heats, then by bank. Nobody leaves before heat four, and a ship that finishes fifth every heat is safe at the first cut because two ships have crashed by then.

Recovery is a ladder. A bad heat one costs 5 or 6 points, which is one good heat later. A crash costs a heat's income and a repair, and the loss streak pays from the third bad heat, so a ship that bottoms out for three heats has 6 extra credits and usually a shop nobody else is buying from. The last rung is the sector shift at heats five and nine: a ship that saved through a bad sector arrives with the bank to buy what the new odds offer.

## Other players

Nothing touches, so the field interacts through the pool, the flag and the table.

The pool is contested. Fourteen parts with finite copies and eight buyers means a maker can be sold out. The shop shows how many copies of each offered part remain, so "Ion Thruster, 2 left" says that Vulcan is crowded and rerolling for a third copy is a bad bet.

The flag is the pacing lap, priced. Each garage the player flags one hazard for the empty segment of the next course, free, and may add two more at 2 each. The tally is secret until the countdown, when the grid shows it and the winner, ties broken by the run seed. Three flags decide the segment most heats in a field that averages nine or ten flags across four hazards. A Vulcan ship with Radiator Fins flags the ringed planet: free speed for it, a heat problem for everyone else. A Slingshot ship at four flags black holes. Anyone else flags the burst because everyone spends a tap on it.

The table is the information. Between heats the standings screen shows every ship's points, bank, hull, parts, maker counts and last purchase. Banks are public on purpose. The read is one glance: "Kite is Prism three with 22 banked, one part from four, and she will flag bursts until she gets there." Counter-play is the flag against the build: a lone Vulcan in a Bastion field flags the burst three times and watches four slow ships spend their one shield on it. Flags alone are secret, until the grid.

## A worked run

Eight ships: the player, Redline, Bulwark, Kite, Miser, Ember, Anchor and Sable. Redline is Vulcan speed and repairs only below 40 hull. Bulwark is Bastion and repairs to full every heat. Kite is Prism and flags bursts. Miser saves to 50 before buying anything but plating. Ember is Vulcan and never repairs. Anchor is Slingshot and saves for the Core. Sable buys whatever counters the field's flags.

Heat one. Everyone starts with 5 credits and four empty slots. The course shows an asteroid field in segment two and an empty segment three. The player buys an Ion Thruster and a Mirror Shielding and flags the burst, free. Miser buys one Ablative Plating and banks 4. Kite flags the burst twice. The tally is burst 5, asteroids 3. Ember, who spent his tap on Reroute Power in segment one, takes 45 of his 90 hull. Redline wins, the player is third, Ember sixth.

Heats two to four. The player takes a second Ion Thruster, a fifth slot for 4, and repairs 20 hull before the cut. Miser reaches 31 banked and earns 3 in interest. At the cut Ember, who crashed twice and never repaired, and Sable, who never found a build, go out.

Heat five, the Inner System. The odds shift and the player sees a Plasma Drive for 3 against 11 banked: the drive now, or wait for a third Ion Thruster and a Mk II, or bank to 20 for the next interest step. She takes the drive and is Vulcan three. Kite, Prism three at 24 banked, flags the burst three times for 4 credits. Redline, at 35 hull after four fast heats, flags the ringed planet twice.

The moment. The tally is burst 6, ringed planet 4. Redline misreads it, raises shields in segment two against a burst that is not there, and reaches the real one on cooldown with 35 hull. Redline is lost, and starts heat six at 25 hull with 4 credits and a Plasma Drive he cannot protect. Kite's 4 credits did that. The player, shields up because she had read Kite's bank and maker count, takes second and a hot lap. In the next garage she buys Radiator Fins instead of a third Ion Thruster, because Redline needs the assist to catch up and will keep flagging it, and fins make that segment a gift.

Heats six to eight. The player hits Vulcan four at heat seven with fins and an Afterburner, and Reroute Power comes back every four seconds. Miser reaches 50 at heat six and starts spending: Fortress Plating, a sixth slot, Reinforced Ribs, finishing fifth, fourth, third. At the second cut Redline, never recovered, and Bulwark, on 19 points to Miser's 21, go out.

Heats nine to twelve, the Core. Anchor buys the Slingshot Core in heat nine and goes to four: the black hole is now a 1.15 assist. Anchor flags black holes three times every garage and wins heats nine and ten. The player, at 55 hull, spends 5 on repairs in heat ten instead of a seventh slot, because the escape threshold does not care how fast she is. Miser, on 240 hull, cannot be killed and cannot win. Into the final: Anchor 61, the player 58, Kite 54, Miser 47.

The final, five segments, double points. Anchor flags black holes; the player, Kite and Miser all flag the ringed planet, and it wins 6 to 3. The player's Vulcan four boosts through the assist with 70 heat headroom, takes two hot laps and wins by 40 ticks over Anchor. Final standings: the player 74, Anchor 73, Kite 64, Miser 55. She wins because three ships agreed on one flag in one garage.

## What it costs to build

Survives unchanged: the race loop, hazards.ts, actives.ts, pilot.ts, rng.ts, spline.ts and the stat resolution in ship.ts.

Changes: field.ts drops the three-ship ShipId union and steps N racers. track.ts gains a course builder that assembles three segments from a sector table plus the flag result. ship.ts gains price and maker on Part, the Mk II merge, and maker counts. race.ts gains a per-ship block in RaceOptions of six rule modifiers: shield duration, reroute cooldown, reroute heat, asteroid damage multiplier, black hole multiplier, escape threshold. That is the honest bend: maker bonuses touch rules, and options read at race start are cleaner than logic inside hazards. run.ts is rewritten around twelve heats, credits, points and cuts. garage.ts becomes the shop: pool with counts, odds per sector, reroll. rivals.ts grows to seven personalities, each with a repair threshold, a save target and a flag habit. tuning.ts gains about forty constants.

New: economy.ts, pure functions from standings to income. flags.ts, tally and tiebreak. makers.ts, bonus tables and what they write into RaceOptions. sectors.ts, three hazard tables and the odds. A strategy harness that plays saver, spender, never-repair, always-repair, one-maker and flag-counter over 500 runs and prints win rate, mean elimination heat and bank per heat.

UI: the garage is a rework, the standings table and the grid screen are new, results is a small change.

Sixteen to twenty one-session PRs: field to N ships, makers, the pool shop, economy.ts, flags and the course builder, sectors, the run.ts rewrite, rule modifiers in race, Mk II, seven rivals, cuts and the final, the harness, then five or six UI PRs. The first playable version, with credits, shop, pool and cuts but no flags or makers, is about eight PRs, and already a game with an economy.

## What it needs from the owner

Should banks be public? Public banks make interest legible and the field readable, and let a leader see who cannot afford to counter them.

Is twelve heats right, or is ten with cuts at four and seven closer to twenty minutes on a real phone?

Should a lost ship come back at 25 hull, or should a second loss in one sector end the run so hull is a death as well as a cost?

Is the Mk II merge too much TFT? It could be dropped, at the cost of the pool mattering less.

Should flags be secret until the grid, or live in the garage? Secret rewards reading builds; live rewards spending last.

Is Slingshot four turning the black hole into an assist too big a swing, or exactly the moment a build should come online?

Should the final pay double, or be winner-takes-all among four so points are only a qualifier?

What are the makers called? The names here are placeholders.

## Risks

The purse and hot laps both pay the fast ship, so an early lead can compound through interest into a run decided by heat six. The streak bonus and the repair sink are the brakes; the harness has to show a heat-one winner wins the run under 35% of the time, or the purse flattens.

Flag pile-ons. If bot flag habits are too consistent the same hazard lands every heat and flags stop being a decision. Bots need a seeded spread, and the tiebreak needs to be visible so a lost tally does not feel like cheating.

Makers, Mk II and slots are one build system more than a phone holds on first play. The fallback is to ship without Mk II and see whether makers alone are enough direction.

Eight ships on a twenty-second course are hard to watch. The race should follow the player and show the field as a position strip, not eight dots.

The pool is invisible without counts on the shop, and a cluttered shop turns the contest into background randomness.

The numbers are guesses. They live in tuning.ts, and the harness says whether a saver, a spender and a greedy pilot each win a fair share.
