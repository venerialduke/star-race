# The Cut

## Premise

A run is a season. Eight ships, seven heats, one ladder. After every heat from the third on, the ship at the bottom of the ladder is cut. Four reach the final. The run ends with a standings table nobody can argue with, because everyone watched it built one heat at a time.

Everything else hangs off that shape. The build has seven garages to come together in, not three. Credits are the only way up the ladder, and the ladder is the only thing that keeps you in the run. Interaction comes from two rules: the leader lays the next course, and the tail shops first. You never fight another ship. You fight over the course and the parts.

A run takes about fourteen minutes on a phone: seven heats of twelve to sixteen seconds of flying, six garages of about a minute, a lobby, a final table.

## The loop

The lobby comes first. Seven rivals, each with a name and two words for what it reaches for. The season: seven short courses drawn end to end across the system, every fixed hazard placed, and on each course one empty slot drawn as a dashed box for the leader to fill. Thirty seconds of reading, one tap to start.

A heat is one course, four or five segments, 700 to 950 ticks at base speed. Eight ships leave the line from a standstill and fly it under the current rules: hazards, heat, shields, two actives, a handful of taps. The renderer fans eight lanes across the track; the sim has one line. A heat produces a finishing order, which pays out points and credits.

Between heats, three screens in a fixed order, each one tap or two.

First, the ladder. Eight rows: points, hull, credits, and every ship's build as part icons with its set count, "Redline — Burner 2/3". The cut line is drawn under the bottom row from heat 3 on. This screen is the whole game's information, in one glance.

Second, the course. The ladder leader picks one of three hazard cards and drops it into the next course's open slot. Everyone sees the card land.

Third, the draft. Ten parts are dealt face up. Ships pick one each in reverse ladder order, bottom first. A part costs credits; you may pass and bank, and pay for repairs. Then the next heat starts.

Heats 1 and 2 are open: nobody is cut, courses are gentle, everyone banks. After heats 3 to 6 the last ship on the ladder is retired. The final is four ships on the hardest course, double points, and the ladder after it is the standings.

## The build

The five stats survive unchanged. A part is still additive deltas, resolved once before the race. What is new is that every part carries one **tag**, and three tags on a ship make a **set**.

Four tags, one per hazard family, each answering one hazard and weak to another.

| Tag    | Parts                                          | 2 of a kind                    | 3 of a kind (online)                                        |
| ------ | ---------------------------------------------- | ------------------------------ | ----------------------------------------------------------- |
| Burner | Ion Thruster, Overclocked Reactor, Afterburner | Reroute heat halved            | Reroute cooldown 420 to 210 ticks                           |
| Brick  | Ablative Plating, Keel Plate, Ram Prow         | Asteroid damage minus 30%      | Asteroid damage scales with speed, not speed squared        |
| Mirror | Mirror Shielding, Capacitor Bank, Phase Array  | Shields hold 150 ticks, not 90 | Shield pool refills the tick a burst lands                  |
| Sling  | Inertial Anchor, Radiator Fins, Grav Keel      | Black hole pull 0.55 to 0.75   | Gravity assist heat halved; the black hole pull becomes 1.0 |

Twelve parts, three per tag, three tiers. Tier 1 is the six slice parts; tier 2 enters the draft from heat 3, tier 3 from heat 5. Higher tiers are bigger deltas with bigger costs.

A build has a direction at two parts of one tag and comes online at three. That takes three drafts, so the earliest a set is online is the garage before heat 4, and most ships get there by heat 5 or 6. A ship that never wastes a pick can hold two sets by the final, the greedy dream.

Sets change a rule, not a number. That is the moment the player feels: Brick 3 flies through an asteroid field at full speed and keeps its hull; Sling 3 is slung through the black hole that just ate two rivals. Stat deltas still stack as now, so Ion Thruster, Ion Thruster and Ablative Plating is still a real ship, just one with no direction.

Each set answers one hazard and is punished by one. Burner by asteroid fields and the ringed planet's heat. Brick by clean track, because it is slow. Mirror by anything that is not a burst, because it spent picks on a pool it needs twice a season. Sling by bursts, because it has neither shields nor hull to spare.

## The economy

Credits. Earned after every heat, spent in the draft and on repairs, banked with interest.

The purse: 6 credits for first, 5 for second, 4 for third, 3 for everyone else who finishes. A lost ship gets 2, called salvage. Interest is 1 credit per 4 banked, capped at 3, paid before the draft.

Prices: tier 1 parts cost 2, tier 2 cost 4, tier 3 cost 6. Repairs cost 1 credit per 20 hull. No rerolls; the draft is shared and a reroll would break that.

Why save. Interest is the small reason: 8 banked earns 2 a heat, a tier 1 part for nothing. Tier gating is the big one. The part that completes your set may be tier 2 or 3, costing 4 or 6 the heat it appears. A ship that bought tier 1 parts at 2 each is strong now and cannot afford its own plan when the plan arrives; a ship that banked through heats 1 and 2 walks into the heat 3 draft with 12 credits. Repairs are the emergency: hull carries between heats, as now, and a ship that flew heats 1 to 3 greedy arrives at heat 4 with 40 hull and a black hole ahead. It can spend 3 credits on hull or on the part, not both.

Why spend. Because the ladder does not wait. The cut is next heat, and the ship one row below you just bought Ablative Plating for the asteroid field the leader dropped. A ship that banks its way to the heat 5 draft in seventh place is rich and about to be cut.

## Run health and elimination

The thing you protect across the run is your **place on the ladder**. Points per heat: 8 for first down to 1 for eighth. A lost ship scores 0 and is placed behind every ship that finished. The final pays double.

After heats 3 to 6, the bottom of the ladder is cut. Ties break on the most recent heat, so the ship currently falling is the one that goes. Eight become four for the final.

Hull is heat health, not run health. A ship destroyed in a heat comes back for the next one at 40 hull with 2 salvage credits, its build intact, and a 0 for that heat. This keeps heats dangerous without making one crash the end of the session. Two crashes in three heats will get you cut, and it should.

Being knocked out is earned, never sudden. Nobody is cut before heat 3, so the first two garages are for planning. The cut line is drawn on the ladder, so the ship in eighth knows it. One ship goes per heat, so a bad heat 3 costs a row, not the run. The ladder is cumulative, so a ship that won heats 1 and 2 can crash in 3 and still sit fourth.

Recovery has three levers, all structural rather than charitable. The tail shops first: the bottom of the ladder picks before anyone else and the leader picks last, so a ship in eighth after heat 3 gets first choice of ten parts and can take the tier 2 that completes its set, in front of the leader who wanted it. Points are weighted forward: the final is double, and a ship that scrapes into it in fourth is at most 16 points from first, which one heat can close. And salvage is not nothing: 2 credits plus interest is a tier 1 part or two repairs. The run pushes a crashed ship back toward the draft, not out of it.

## Other players

Every interaction goes through the course, the draft and the ladder.

**The leader lays the course.** After every heat, the ladder leader picks one of three hazard cards from the season deck and drops it into the next course's open slot. The deck: asteroid field, gamma burst, ringed planet, black hole, and open run, a clean stretch that rewards raw pace. The leader drops the card that punishes the field and spares itself. A Brick leader drops an asteroid field. A Burner leader drops an open run. A Mirror leader drops a burst and dares everyone to time it.

This is the counter-play loop. The card lands before the draft, so the field sees the course, then shops for it, in reverse ladder order, with the leader last. A leader who drops a burst has told seven ships to want shields, and those seven pick before it does.

Rivals choose their card by a fixed rule: the hazard their set answers, or with no set, the hazard most of the ladder is worst equipped for, measured from resolved stats. The rule is in the sim and seeded, so a harness can replay it.

**The draft is shared and visible.** Ten parts for eight ships. Every rival's wish list is two words on the ladder and its build is icons, so you can read "Halo has Mirror 2/3, Phase Array is on the table, Halo picks before me, that part is gone." Contest is real: three parts per tag per tier, and two Burners want the same Afterburner. Denial is real: taking the part that completes a rival's set, when you pick before it and it is one heat from cutting you, is a legal and legible move.

Rivals draft by wish list, as now, but in tags: Redline wants Burner, then Sling. Two new rivals read the ladder instead: Ledger banks until it can afford a tier 3, and Tinker buys whatever its ship is worst at for the course just laid. Those two keep the harness honest.

**The cut is shared.** Every point you take is a point a ship near the line did not. Sixth instead of seventh in heat 5 may be the row that keeps you and cuts Scrap.

What is visible to whom: everything, to everyone, always. Builds, credits, hull, points, wish lists, the next course and its slot. Only your tap timing is hidden.

## A worked run

Eight ships: You, Redline (Burner), Bulwark (Brick), Halo (Mirror), Sling (Sling), Ledger (banks, buys tier 3), Tinker (buys what the course punishes), Scrap (cheapest part, never repairs).

**Lobby.** The season map shows a fixed black hole in heat 4 and two bursts in heat 6. You decide on Sling: two cheap tier 1 parts, and Grav Keel at tier 2 would put you online before heat 4.

**Heat 1.** First draft order is random. You take Inertial Anchor for 2. Redline takes Ion Thruster, Bulwark Ablative Plating, Scrap Radiator Fins because it is cheap. A gentle asteroid course: Redline wins, you come fifth. Redline drops an open run into heat 2, because Bulwark is slow.

**Heat 2.** You pick fourth and take Radiator Fins: Sling 2/3, 4 credits left. Ledger passes and banks to 9. Redline wins again. Scrap crashes in the field on no plating. Ladder: Redline 16, Halo 11, You 9, Tinker 9, Sling 8, Ledger 7, Bulwark 5, Scrap 3. Redline drops a ringed planet into heat 3 to cook everyone else.

**Heat 3.** First tier 2 draft. Scrap takes Keel Plate. Bulwark takes Ram Prow: Brick 2/3. Ledger picks third with 12 credits and takes Grav Keel, the part you needed, because it is the most expensive thing on the table. This is the moment. You are fifth with 5 credits, Grav Keel is gone, the ringed planet is coming. You take Overclocked Reactor, overcook the planet, drop 25 hull, finish fourth. Scrap finishes eighth and is cut. Ladder: Redline 24, Halo 16, You 14, Tinker 14, Sling 13, Ledger 12, Bulwark 10. Redline drops an open run next to the fixed black hole.

**Heat 4.** Bulwark picks first, Ablative Plating: Brick 3/3, online. Ledger takes Phase Array because it costs 6. You pick fifth and Grav Keel is dealt again. You have 7 credits, 55 hull, and a black hole ahead. Grav Keel is 4, a repair to 75 is 1. You buy both: Sling 3/3, online. The pull becomes a slingshot and you win. Redline, on 35 hull after three fast heats, is lost in the debris behind the black hole. Bulwark is third, untouched. Ledger is seventh and cut. Ladder: Redline 24, You 22, Halo 21, Bulwark 16, Tinker 16, Sling 14. Redline still leads and drops a burst into heat 5.

**Heat 5.** Sling picks first, Capacitor Bank. Tinker takes Mirror Shielding. Nothing Sling-tagged is left; you take Mirror Shielding for burst cover and bank 6. Halo, Mirror 3/3, takes both bursts on one shield and wins. You are second, Redline fourth, Sling sixth and cut. Ladder: You 29, Halo 29, Redline 29, Bulwark 21, Tinker 20. You lead on the tiebreak and drop a black hole. Bulwark has the hull for it; Halo does not.

**Heat 6.** Halo crashes in the black hole it could not build for. Bulwark wins on hull, Redline second, you third. Tinker fifth and cut.

**Final.** You, Redline, Bulwark, Halo, double points, the full system. You lead, so you lay the course: black hole again, and Halo cannot repair enough to matter. Bulwark wins, you second, Redline third, Halo lost.

**Final standings.** You 41, Bulwark 40, Redline 39, Halo 29.

The moment to point at: Ledger buying Grav Keel in heat 3 because it was expensive, not because it wanted it. That pick put you a heat behind and cost you 25 hull, and only came good because the tail shops first. The mirror of it: your black hole in heat 6 ended Halo's run.

## What it costs to build

Survives unchanged: hazards.ts, actives.ts, pilot.ts, rng.ts, spline.ts. The hazards and the taps are exactly what this design wants.

Changes: ship.ts gets a tag and tier per part, six new parts, and a resolved rules block beside the stats (asteroid exponent, reroute cooldown, shield duration, black hole multiplier, burst refill). race.ts reads those five numbers from the resolved build instead of tuning, its only change. field.ts widens ShipId to eight. track.ts gains an open slot per course. rivals.ts grows to seven, with wish lists in tags and two ladder-reading rules. tuning.ts gains sets, prices, purses, points and the interest cap.

New: season.ts, seven courses and the hazard deck; ladder.ts, points, cut and tiebreak; draft.ts, deal ten and pick in reverse order; economy.ts, purse, interest, repair. run.ts is rewritten around the ladder, the biggest single change. In the UI, a lobby, a ladder, a course drop and a draft replace the garage. The harness gains bots for save, spend, set-chase, counter-pick and deny, and reports whether choosing well pays and whether any tag wins too often.

Honest count: 13 one-session PRs. Tags, sets and the rules block. Six new parts with tests. Courses and the season deck. Ladder and cut. Purse, interest, repairs. Draft. Seven rivals and two reading rules. Leader lays the course, sim side. run.ts rewrite, two sessions. Lobby and ladder UI. Draft and course-drop UI. Harness bots and the table. The first playable version is nine of those.

## What it needs from the owner

Is seven heats and fourteen minutes the right length, or should a run be five heats and nine minutes with a cut after every one from the second?

Should the leader lay the course, or the tail? Leader is the stronger read; tail is the stronger catch-up. It cannot be both on one card.

Is a lost ship coming back at 40 hull too soft? The alternative is losing a part, a nastier feeling.

Do sets change a rule, or only a number? Rule changes are the moment that feels like something and the thing that is harder to measure.

Should wish lists be visible, or only the parts? Visible is more legible; hidden gives a rival a personality to discover.

Is denial a move this game wants? It is the auto-battler feeling, and the pick a phone player will not read.

Does the final pay double, or is a flat points scale cleaner?

## Risks

Eight ships is a lot on a phone track. Lanes will be thin, and if the ladder screen does not carry the story, the run does not either. Six ships is the fallback and changes nothing.

Leader lays the course can kingmake. A leader far enough ahead lays courses for itself forever. Tail shops first and the double final are the counterweights, and the harness has to show a runaway leader after heat 3 is caught a third of the time.

Sets that change rules are hard to tune. Brick 3 removing the square on asteroid damage might make Brick the only set worth having. One number per rule and a bot per tag make it measurable, but the first table will be wrong.

A cut on a tiebreak will feel unfair the first time. The rule is most recent heat, and it has to sit on screen next to the cut line before the heat starts.
