# Hardpoints

## Premise

The ship has six hardpoints and every part belongs to one of four families. Bolt on three of a family and its core comes online; five and it overdrives. Everything else hangs off that count. What you buy is a part, but what you are building is a family total, and what you protect across nine heats is your standing in a field of eight ships on the same track. You never shoot anyone. You beat them by seeing what they are counting toward, taking the part they need, and dropping the hazard their family cannot answer onto the segment they are about to fly.

## The loop

A run is one star system, nine stages in three sectors of three, the whole track visible from the lobby. Nine rounds is long enough for a build to have a middle. A round is four screens and about ninety seconds:

1. **Garage.** Income lands. The shop shows four parts from a pool shared with the other seven ships. Buy, sell, reroll, or buy a hardpoint. A 45-second timer.
2. **Drop.** Every player places one beacon on one of the next stage's three segments, in standing order, leader first. Fifteen seconds.
3. **Heat.** Eight ships fly the stage, about 25 seconds. The player has the two taps the slice has now, shields and reroute, and nothing else.
4. **Results.** Finishing order, standing lost, credits earned, five seconds.

Sector 1 (rounds 1 to 3) is the slice's hazards at slice strength. Sector 2 doubles asteroid fields and adds a second burst to every corridor. Sector 3 has a black hole in every stage. Hull carries across a sector, as today, and is repaired at each sector gate. The run ends after round 9, or when one player is left standing. Fifteen minutes on a phone.

## The build

Six hardpoints, three open at the start. Fifteen parts, six of them the slice's, in four families. A part is still additive stat deltas, resolved once before the heat; the family count is resolved in the same pass into a handful of modifiers the hazards and actives read. Parts still stack, and every copy counts toward its family.

**Burn** (red): speed bought with heat and hull. Ion Thruster (+0.15 speed, −10 hull), Overclocked Reactor (+0.10 speed, +0.015 accel, −30 heat), Radiator Fins (+45 heat, −15 hull), Afterburner (Reroute Power boosts ×1.45 instead of ×1.3, −10 hull). Core at 3: Reroute Power and hazard heat are halved. Overdrive at 5: the ship never cooks; above tolerance it runs 15% faster instead of losing hull.

**Armour** (grey): hull bought with speed. Ablative Plating (+40 hull, −0.08 speed), Reinforced Keel (+25 hull, +0.01 accel, −0.05 speed), Salvage Rig (+15 hull, and 1 extra credit every heat you finish in one piece). Core at 3: asteroid damage −40%. Overdrive at 5: repair 20 hull at every gate, the only free repair in the game.

**Field** (blue): shields bought with a little speed. Mirror Shielding (+35 shield, +12 hull, −0.05 speed), Capacitor Bank (+25 shield, shields hold half a second longer), Deflector Web (+20 shield, +10 heat, −0.03 speed). Core at 3: shields hold 3 seconds instead of 1.5, enough to cover two bursts in a corridor. Overdrive at 5: shield cooldown drops to 3.5 seconds, so two shields a stage.

**Gravity** (purple): acceleration and the planets. Inertial Anchor (+0.03 accel, −0.02 speed), Tidal Vanes (+0.02 accel, +15 heat, −10 hull), Mass Sensor (+0.015 accel, +10 hull). Core at 3: ringed planets sling at 1.6× instead of 1.35×, and black holes pull only to 0.75 instead of 0.55. Overdrive at 5: black holes and mass shadows become slingshots, 1.3× inside and no escape threshold. The Gravity ship dives what kills everyone else.

**Bridges**, which count for two families at once: Heat Sink Array (Burn and Field: +15 shield, +20 heat, −0.03 speed) and Mass Driver (Armour and Gravity: +15 hull, +0.02 accel, −0.04 speed).

Six slots make the archetypes arithmetic. A pure build is five of one family plus one loose part. A pair is three and three: six slots, or five with a bridge. There is no room for three cores, and that is the commitment: by round 5 the grid tells everyone what you are. Four pures and two bridged pairs are the six archetypes the harness measures.

A core comes online when the third part is bolted on. Three parts cost 9 credits and need the shop to show them, so a focused player who rerolls once or twice hits a core in round 3 or 4. Overdrive needs two bought slots (14) and five parts (15), so it lands in round 6 or 7 for a player who did not waste much. Sector 2 is where a core saves you; sector 3 is where an overdrive wins.

Pivoting is allowed and priced. A part sells for 1, having cost 3. Selling three parts to change family costs 6 credits and a round of being weak.

## The economy

Credits. Start with 6. Each round pays 4 base, plus 3, 2 or 1 for finishing first, second or third, plus interest of 1 per 10 banked, capped at 3, plus 1 if you are bottom three on standing. A middling player earns about 5 a round, a leader 7, a banker with 30 saved 8.

Spending: a part is 3, a reroll of the four-card shop is 1, the fourth, fifth and sixth hardpoints cost 6, 8 and 10. A part sells for 1 and returns to the pool next round.

Why save: interest turns 30 banked into 3 a round, most of a base income, so a player who banks through sector 1 on two parts arrives in round 4 earning nearly double. Hardpoints are the long bet: 24 credits of slots buy nothing this heat and everything in round 7. Why spend: placement credits and standing both come from heats, and three parts in round 2 beat two by enough to take the 3-credit bonus most rounds. The harness has to confirm neither is obviously right: the greedy bot should win sector 1 and struggle in sector 3, the banker the reverse, and the bot that switches at the right round should beat both by a few points, not a mile.

## Run health and elimination

Standing is run health. Every player starts at 20. After a heat, first, second or third costs nothing. Fourth costs 1, fifth 2, sixth 3, seventh 4, eighth or destroyed 5. Sector 2 adds 1 to every loss, sector 3 adds 2. At 0 you are out.

The arithmetic keeps rounds 1 to 3 safe: the worst possible sector 1 costs 15. Fifth every round loses 2, 2, 2, 3, 3, 3, 4, 4, 4 and ends the run on exactly 0, which is where the tuning starts. Last every round is out in round 5. Top three every round never loses a point.

Hull is heat health, not run health. It carries across a sector's three stages and is repaired at sector gates. A ship destroyed in a heat is placed last, takes the full standing hit, and is rebuilt for the next round at half hull. So a Burn ship can boost through a debris field, die, and still be in the game, poorer and behind: fast and fragile is an archetype rather than a way to lose in round 2.

Recovery has three levers and none is a gift of standing. Bottom-three players earn 1 extra credit a round, drop their beacon last with full information, and are served first when a part is down to its last copy. A player at 6 standing in round 6 with a core online is not dead; one with no core is.

Final standings: survivors by standing, then total flying time; eliminated players by the round they went out, latest first.

## Other players

Seven other ships fly every heat. Today they are pilots with family wishlists: Redline for Burn, Bulwark for Armour, two new ones for Field and Gravity, three flex pilots that buy toward whatever they hold most of. They could later be ghosts of other players' garages, Super Auto Pets style, without changing the sim: a rival is a build, a beacon choice and a pilot, all inputs. Three mechanisms make them opponents rather than scenery.

**The shared pool.** The shop draws from one finite pool: 6 copies of each part, 90 in all, for 8 players who will buy about 60. A part bought leaves the pool; a part sold returns next round. A strip under the shop, one bar per family, says how many copies are left. When three ships are going Burn there are no Radiator Fins in round 4, and everyone can see that. Denial is priced: a part you do not want costs 3, sells for 1, and is gone for one round.

**Visible builds.** The grid before every heat, and a strip along the top of the garage, shows all eight ships with their hardpoints as coloured pips, family counts, and cores lit. Three red pips is a Burn ship one part from its core; a blue pip on a red ship is a Heat Sink and a pair coming.

**Beacons.** This is the pacing lap. The family a player holds most of decides what they can drop: Burn a Solar Flare (60 ticks of heat, no speed change, one new hazard function), Armour a Debris Field (a 60-tick asteroid field), Field an Ion Storm (one 30-point gamma burst), Gravity a Mass Shadow (60 ticks of pull to 0.7, no escape threshold). A core doubles its own beacon to 120 ticks. No parts, no beacon. It goes on the segment the player picks; a segment holds at most three, laid end to end from its middle, each labelled with the ship that dropped it.

The families make a rock-paper-scissors nobody has to be taught. A Burn core shrugs off flares but a second burst kills a ship with one 1.5-second shield. A Field core laughs at Ion Storms and hates debris. Armour eats debris and dies to flares. Gravity wants Mass Shadows on the track: at overdrive they are free speed for it and a wall for everyone else. What you drop, where, and at whom, is the round's second decision, and your build decided the options.

Information: the shop is private; the bank, builds, standings and dropped beacons are public. Nobody sees what a rival was offered, only what they bought.

## A worked run

Eight ships: You, Redline (Burn), Bulwark (Armour), Halo (Field), Slinger (Gravity), Kestrel and Moth (flex), Tariff (a banker).

**Round 1.** 6 credits each. Your shop: Ion Thruster, Capacitor Bank, Ablative Plating, Mass Driver. You take Capacitor Bank and Ion Thruster, one blue pip and one red. Tariff buys nothing and banks 6. Halo takes Mirror Shielding and Deflector Web. A clean asteroid belt; you finish third, +1 credit, no standing lost. Tariff finishes last on a bare hull, standing 15.

**Round 2.** Halo's third Field part is in your shop: Mirror Shielding. You take it, because you want Field 3 yourself and it delays Halo a round. Halo rerolls twice, finds nothing blue, buys a Heat Sink. Redline drops a Solar Flare on the open run. You finish fourth, standing 19.

**Round 3.** Your Field core comes online: shields hold 3 seconds. One burst in the corridor; you cover it easily and finish second. Halo hits Field 3 the same round. Sector gate, everyone repaired. Tariff has 22 banked, still 15 standing.

**Round 4.** Sector 2 opens with a doubled asteroid field. Your shop shows Radiator Fins, the last copy in the pool. You do not need heat yet, but Redline has Ion, Reactor and Afterburner and needs Fins to survive its own reroutes. You buy them and hold them. Bulwark hits Armour 3 and crosses the field losing 30 hull to your 55. Kestrel buys a fourth hardpoint. You finish fifth, standing 16.

**Round 5.** The gamma corridor, now with two bursts. Halo, dropping third in standing order, puts an Ion Storm on it: three bursts in 160 ticks. Halo has a 3-second shield. Redline has one 1.5-second shield, half hull from the field, and no Fins. It covers the first burst, eats the second and the storm, and is destroyed: last place, standing 20 to 13. That is Halo's choice ending Redline's heat, made because the grid showed a red ship with no blue pips; your Fins made it stick. You sell the Fins for 1 and buy Heat Sink Array: Field 3, Burn 2, one slot left. Second place.

**Round 6.** You buy the fourth hardpoint (6) and Overclocked Reactor: Burn 3. Two cores in five slots, and the Burn core halves your reroute heat, so you can boost through the ringed planet. Sector gate. Tariff, who banked to 40 and finished seventh or eighth every round, is out at 0. Moth pivots from Armour to Gravity, sells three parts for 3, and is bare for a round.

**Round 7.** Sector 3, a black hole every stage. Kestrel, quiet until now with four Gravity parts, five slots and 22 banked, buys the fifth: Gravity overdrive. It drops a Mass Shadow on the inner system, flies the black hole at 1.3× while everyone else crawls at 0.55, and wins by 200 ticks. You finish third. Moth is out.

**Round 8.** Bulwark's Armour overdrive repairs 20 a gate, so it reaches every black hole with hull to spare, finishes fourth or fifth, never wins a heat. You have 11 credits: the sixth hardpoint (10) with nothing to fill it, or two parts and no slot. You take the slot. Fifth, standing 12.

**Round 9.** Standings going in: Kestrel 20, Halo 17, You 12, Bulwark 11, Slinger 10, Redline 4. Kestrel drops a Mass Shadow on the finish straight, first in order, blind. You drop last and put a Solar Flare on the same segment, because five purple pips and one grey have no heat tolerance. Kestrel cooks for four seconds coming out of the shadow and finishes third. You reroute through the flare on the Burn core, second. Halo first.

Final: Kestrel 20, Halo 17, You 12, Bulwark 10, Slinger 8, Redline 0 (out round 9), Moth (out 7), Tariff (out 6). Kestrel wins on standing; the flare cost it a heat, not the run, which is the right size for a beacon.

## What it costs to build

Survives unchanged: `rng.ts`, `spline.ts`, `actives.ts`, the stage and gate logic in `race.ts`, `field.ts` (already generic over N entries; only the `ShipId` union widens), the pilot's timing rules.

Changes: `ship.ts` gains a `family` per part and `resolveBuild` returns modifiers alongside the five stats (about ten numbers: asteroid damage, hazard heat, reroute heat and speed, shield duration and cooldown, assist and pull multipliers, pull lethality, gate repair). `hazards.ts` reads three of them and gains one function, the Solar Flare. `race.ts` reads the rest where it applies heat, shields and reroute. `track.ts` gains a function that lays beacons onto a stage and returns a new track, so the sim still takes a track and knows nothing about who dropped what. `garage.ts` becomes a shop: pool, draw of four, prices, reroll, sell. `rivals.ts` grows family wishlists and a beacon rule. `run.ts` is the big one: nine rounds, credits, standing, hardpoints, a beacon phase, eight entries, elimination.

New: `families.ts` (thresholds and the modifier table), `economy.ts`, `standing.ts`, `beacons.ts`, with every number in `tuning.ts`; a lobby screen, a drop screen, a grid strip in the garage; and harness bots: six archetypes, a greedy bot, a banker, a switcher.

Guess: 14 one-session PRs. First playable, with families, hardpoints, credits and standing but no beacons and only the four family pilots, in 7. Beacons and the drop screen are 3 more; the last 4 are the new parts, the 8-ship grid and the harness bots. The renderer needs eight lanes and coloured pips, nothing else.

## What it needs from the owner

- Nine rounds in three sectors, or seven in two? Nine is fifteen minutes; is that the session you want?
- Four families or three? Gravity is the most fun and the most work; dropping it makes the pool tighter and the archetypes fewer.
- Is standing the right run health, or should hull carry across the whole run with paid repairs?
- Should a destroyed ship come back at half hull for free, or pay 3 credits?
- Is the Burn overdrive (never cooks, runs faster hot) the fantasy you want, or is it a balance grenade?
- Should beacons stack to three on one segment, or one per segment so the track stays readable?
- Drop order leader-first: is that comeback lever enough, or too much?
- Are the seven rivals bots forever, or should the sim be shaped now for asynchronous ghosts?

## Risks

The modifier set could sprawl. Ten numbers is the ceiling; a part that needs an eleventh should be a stat delta instead. Every new part after the first playable should be pure stats unless it is a bridge.

The Burn overdrive may be dominant or worthless and nothing in between. The harness can say which in an afternoon; the fix may be a redesign, not a number.

Eight beacons on three segments can make a stage unreadable. The three-per-segment cap keeps it bounded; if the drop screen cannot show the result plainly, the cap goes to one.

Pool contest between bots can collapse: three flex pilots all going Field would starve each other and the player. Wishlists need a rule that avoids a family two ships already hold, and the harness has to check no family is unreachable more than a few percent of runs.

Standing arithmetic is a guess. Fifth every round finishing at exactly 0 is the intended edge; if the harness shows half the field out by round 6, the sector penalties drop first.
