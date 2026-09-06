# The Course Is the Other Players

## Premise

Ships never touch, so the only thing one player can do to another is change the track. That is the whole game here. Every heat is flown on a course the players in it have just built, one slot each, and what a player can lay down is decided by the parts on their ship. Ablative Plating lets you seed an asteroid field and survive one. Mirror Shielding lets you seed a gamma burst and eat one. A build is a shield and a weapon at once, and both are visible to everyone.

So "what should I buy" and "what will they do to me" become one question. If three players are stacking Plating, the track will be full of rock and speed is a trap. Counter-picking is not a side system. It is the build. Economy, run health and elimination follow from making the course the arena.

## The loop

Eight players. Ten heats. About fifteen minutes.

A heat is one course of eight slots between a fixed launch and a fixed finish straight. A slot is 180 ticks at base speed; launch and finish are 120 each. A full course is 1,680 ticks, 28 seconds at 60 ticks per second. Each player eliminated takes a slot with them, so a late heat with four ships left runs about 16 seconds.

Four phases, each on a timer.

Garage, 25 seconds. Everyone shops at once from their own four-part offer, drawn from a pool the lobby shares. Every ship's build sits in a ribbon across the top of the screen throughout.

Seeding, 20 seconds in two waves. The top four in the standings place first, blind to each other, ten seconds. Then the bottom four place, seeing the top four's seeds, ten seconds. Each player puts one hazard into one empty slot; the hazard comes from their parts. Two players who want the same slot: the lower in the standings gets it.

The heat, 16 to 28 seconds. Eight ships fly the course in lockstep. The player has two taps, Raise Shields and Reroute Power, exactly as now.

Results, 10 seconds. Finishing order, credits, run hull lost, and one line per hazard that hurt you, with the name of who seeded it.

The run ends after heat 10, or when one player is left. Final standings are survivors by run hull, then the eliminated in reverse order of exit.

The star is the only PvE arc. The run is a fall toward a star, which escalates the whole field without touching anyone: heat dissipation drops each heat, from 2.0 per tick in heat 1 to 0.2 in heat 10. Early, heat comes back. Late, it is a scar. Fins matter more each heat, the Reactor less, and an assist you rode for free in heat 2 cooks you in heat 8. One number per heat in `tuning.ts`.

## The build

The six slice parts survive with their deltas unchanged. Two things are added: levels and seeds.

Levels. Two copies of a part merge into a Mk II, three into a Mk III. A Mk II applies the delta twice, a Mk III three times: the stacking the sim already does. A ship has four hardpoints and a merged part fills one, so a finished ship is at most four Mk IIIs, twelve purchases, and nobody gets there before heat 9. The first Mk III usually lands in heat 4, and that is when a build comes online.

Seeds. Every part carries the hazard it answers, and owning the part lets you lay it.

| Part                | Seeds                                                        | Hurts                       | Suits                 |
| ------------------- | ------------------------------------------------------------ | --------------------------- | --------------------- |
| Ion Thruster        | Long straight, 270 ticks, empty                              | Slow ships                  | Fast ships            |
| Ablative Plating    | Asteroid field                                               | Fast, light ships           | Armour                |
| Mirror Shielding    | Gamma burst                                                  | Shields down or on cooldown | Deep shield pools     |
| Radiator Fins       | Gravity assist                                               | Low heat tolerance          | Fins                  |
| Inertial Anchor     | Black hole                                                   | Low hull, low acceleration  | Acceleration and hull |
| Overclocked Reactor | Solar flare, new: one tick, +40 heat, shields do not stop it | Anyone running hot          | Fins                  |

Level upgrades the seed as well as the ship. A Mk II lays the bigger version: a field that fills the slot, a twin burst 60 ticks apart that a base pool of 50 cannot cover and a Mirror pool of 85 can, a deep hole with an escape hull of 30 instead of 15, a full-slot assist, a twin flare, a 360-tick straight. A Mk III lays its seed across two adjacent free slots, a wall.

Three archetypes fall out. The Wall: Plating and Anchor, seeds rock with a black hole behind it, so the fast ships reach the hole with nothing left. The Hot Rod: Thruster, Reactor and Fins, seeds straights, assists and flares, and eats its own flares for free. The Mirror: Mirror Shielding plus Thrusters, seeds twin bursts the lobby has to time perfectly. A build with a direction seeds a course that suits it; a build without one seeds noise.

The Solar Flare is the only new hazard, the burst's mirror: the burst says tap shields now; the flare says do not tap Reroute now. A lone Reactor seeding a flare hurts itself. With Fins it is free.

## The economy

Credits. You start with 6 and earn at the results screen: 5 base per heat, plus 3, 2 or 1 for first, second or third, plus 2 for finishing in the bottom three, plus interest of 1 per 10 banked up to 3. Income is flat on purpose; the gap between players is run hull, not money.

Parts cost 3, four on offer, drawn from a shared pool of 12 copies of each part. What another player buys is gone until someone sells it back. Reroll for 1. Sell a part for 2, a Mk II for 4, a Mk III for 6; the copies return to the pool. A Special Order, once per garage, costs 6 and takes any part the pool still holds.

Why spend now: a part is a seed as well as a stat. Plating in heat 1 means every heat from now on has your rock on it, and rock compounds: it spends the fast ships' hull before whatever comes after.

Why save: three reasons. Interest, which at 30 banked is a free part every heat. The Special Order, which is how you get your third Mirror the round the ribbon shows the lobby has no shields. And the pool: if three players are on Plating there are three copies left, you will not complete a Mk III, and the right move is to bank and pivot into what the lobby is leaving alone.

Greed is right early: a Mk II by heat 2 wins heats 2 and 3 and pays for itself. Saving is right when the pool is contested, or when the star is about to turn heat against your build. Neither is obviously right.

## Run health and elimination

Standing is the run's health, chosen over hull-as-health on purpose. Two hulls are two systems to hold in one head, and a game about seeding black holes needs a ship to die in a heat without the player leaving the table. So ship hull is repaired to full between heats. What carries is run hull, starting at 100.

After each heat you lose run hull by position. The top three lose nothing; fourth loses 3, fifth 6, sixth 9, seventh 12, eighth 15. A ship destroyed in the heat is placed behind every finisher and loses 10 more. The star multiplies the toll: heats 1 to 3 at x1, 4 to 6 at x1.5, 7 to 10 at x2. At 0 you are out and spectate.

The arithmetic is the design. The worst possible heat 1 costs 25, so nobody is out before heat 3. Fifth every heat loses 93 over ten heats and scrapes home. Sixth every heat is out in heat 8. Fourth every heat loses 45 and is comfortably in the final. Elimination is earned by living in the bottom half; a single crash costs one heat.

Recovery has three levers. The bottom four seed second, with information, and the bottom three get the 2-credit catch-up. The top three lose nothing, so one good heat stops the bleed, and a build that comes online in heat 5 with 60 run hull is in the fight. And the star punishes the leader's early build as much as anyone's: the Hot Rod that won heats 1 to 4 has to find Fins or start paying at x2. A late win is worth more than an early one.

## Other players

My build changes your race because my build is on your track. Five ways.

Seeding. I lay one hazard per heat, the one my ship is built to survive, and your ship flies through it. With Mk II Plating my rock fills a slot; a Thruster ship crossing at speed 1.45 takes about twice the damage of a base ship and reaches whatever comes next with a hull that cannot clear a black hole.

Sequence. Slots have an order and hazards have memory. An assist then a flare cooks anyone without Fins. A burst 200 ticks after a burst catches everyone whose shield is on its 420-tick cooldown. The bottom wave, placing with the top wave's seeds visible, builds these on purpose. That is the trailer's weapon, and it is the comeback.

Visible builds. The ribbon shows every ship's parts and levels at all times. A player reads the ribbon: three Mirrors in the lobby, so at least three bursts next heat; a 7-second shield cooldown against a 28-second heat covers four of eight slots; so buy Mirror while the pool has it, or stop reaching for speed. That is the counter-pick, in one glance.

The pool. Twelve copies of each part, eight players. Four players can complete a Mk III of the same part and the fifth cannot. Buying the third Anchor is also denying it. Selling hands copies back, a real decision when the player just below you is one short.

Attribution. Every hazard carries the name of who seeded it, and the results screen reads hazard by hazard: 18 hull to Bulwark's rock, cooked two seconds at Ember's flare, lost at Gravitas's hole. The next garage is a response, not a guess, and rivals get a character legible in play.

Bots seed with one rule in `pilot.ts` beside the tap rules: lay your highest-level seed; put a hole after rock, a flare after an assist, a burst after a burst; otherwise take the free slot furthest from the launch. A human's seed is the same input as a bot's.

## A worked run

Eight ships: you, plus seven pilots with wish lists. Redline (speed), Bulwark (armour), Ember (Reactor, then Fins), Gravitas (Anchor, then Plating), Mirage (Mirror, then Thruster), Ledger (banks to 30 first), Drift (takes the first card offered).

Heat 1. Everyone has 6 credits and buys two parts from four. You take Plating and a Thruster, a hedge with one of each seed. The ribbon shows Bulwark and Gravitas both on Plating, so there will be rock. Standings are empty, so you place blind in the top wave: rock in slot 6, late, to eat hull from ships that have been going fast. Redline wins. You are fifth. Drift crosses both fields flat out and is seventh. Run hull: you 94, Drift 88.

Heat 2. A second Plating shows and you merge to Mk II; your rock now fills a slot. You are fifth, so you seed in the bottom wave and see the top four seeds. Gravitas laid a black hole in slot 5. You put the long field in slot 4, right in front of it. Redline enters slot 4 at 1.45, leaves it with 31 hull, and crawls into the hole with too little to clear the escape line. Redline's ship is lost; Redline loses 25 run hull and drops from first to fourth. That is the moment. Your rock never touched Redline's ship, and it decided Redline's heat, because of where Gravitas had already put the hole.

Heat 3. Redline reads the ribbon, sees four Platings in the lobby, and buys Mirror instead of a third Thruster: bursts do not care about rock, and it needs the hull. Mirage sees Redline reach for Mirror and takes the Special Order for its third Mirror before the pool thins. A Mk III in heat 3; its twin burst now spans two slots.

Heat 4. Dissipation drops to 1.4 and the toll goes to x1.5. Mirage's twin burst catches five ships with shields down and Mirage wins by four seconds. Ember, on Reactor with no Fins yet, cooks through its own flare and is eighth: 22 run hull gone. You are third, free.

Heat 6. You are on 88 run hull, Drift on 27. Ledger, sitting on 30 credits at 3 interest a heat, spends 15 in one garage into a Mk III Fins. Its assist fills two slots; with dissipation at 1.0 everyone but Ledger and Ember leaves it near 140 heat and cooks. Drift finishes eighth, destroyed, and is the first player out.

Heat 8. Seven ships, seven slots, x2 toll; Ember went out after heat 7. Gravitas's Mk III deep hole spans slots 5 and 6, escape hull 30. You have Mk II Plating and arrive with 30 to spare. Bulwark, seeding last as the bottom player, lays rock in slot 4 and takes Ledger's ship with it.

Heat 10. Four left: Mirage 74, you 70, Gravitas 58, Redline 40. Four slots, 16 seconds. Redline lays a 360-tick straight, Gravitas a hole, Mirage a twin burst, you a long field in front of the hole. Final standings: Mirage 74, you 70, Gravitas 52, Redline 22, then Bulwark, Ledger, Ember, Drift.

Every decision above was a reaction to the ribbon or to a hazard with somebody's name on it.

## What it costs to build

Survives unchanged: `rng.ts`, `spline.ts`, `actives.ts`, the loop in `race.ts`, the four functions in `hazards.ts`, `tuning.ts` as the home for every new number, the pilot's tap rules, the balance harness.

Changes. `ship.ts` gains a level per part and four hardpoints; `resolveBuild` is the same sum. `makeTrack` survives and the slice track becomes a test fixture; placements gain a seeder id. `hazards.ts` gains the Solar Flare. `race.ts` takes the star's dissipation as an option. `field.ts` already steps any list of entries; `ShipId` becomes a string. `run.ts` is rewritten: heats, run hull, credits, the pool, seeding waves, standings. `rivals.ts` grows to seven wish lists and a seeding rule. `garage.ts` becomes a shop. `pilot.ts` gains seeding.

New: `course.ts` (seeds to a Track), `seeds.ts` (part and level to placement), `economy.ts`, the seeding and shop UI, the ribbon, an eight-lane render, results with attribution.

PRs, one session each, in the order they unblock: (1) Solar Flare. (2) Star dissipation per heat. (3) Part levels and hardpoints. (4) `seeds.ts`. (5) `course.ts` with seeder ids. (6) `field.ts` to n ships. (7) `economy.ts`. (8) Shop. (9) Run hull, toll, elimination. (10) Seeding waves as run inputs. (11) Bot seeding. (12) Seven rivals. (13) Harness of bot strategies. (14) Shop UI and ribbon. (15) Seeding UI. (16) Eight-lane render. (17) Results with attribution. (18) Tuning pass. The first thirteen run headless; the first playable version needs about twelve. Honest size: S2 and S3 again, on the same bones.

## What it needs from the owner

Is a run ten heats and fifteen minutes, or seven and ten? Is the bottom wave seeding second the right amount of comeback, or should last place seed alone, last, with everything visible? Should a Mk III seed span two slots? Is the Solar Flare the right sixth seed, or should the Reactor share the assist with Fins and the game stay at four hazards? Should ship hull carry between heats at all? Is twelve copies per part the right contest, or eight and tighter? Is the star the escalation, or would harder fixed slots in late heats be more legible? And underneath all of them: is laying a hazard with your name on it, knowing it will hurt someone, the feeling this game wants?

## Risks

Seeding could be the slow part. If it drags, the fix is one wave with the bottom half placing last inside it, or the pilot seeding for anyone who has not tapped in five seconds.

Seeding can degenerate. If a hole after rock is always right, every heat is the same course by heat 5. The harness measures this: a bot that always seeds the same thing against bots that read the ribbon. If the reader does not win more, the seed table is wrong, and the seed table is tuning.

A Mk III at heat 3 may snowball. The star and the pool are the brakes; if they are not enough, the Special Order goes to 8 credits or once every three heats.

Self-harm seeds could feel bad. A player who lays a black hole and dies in it will blame the game. Attribution has to say it was their own hole, and the seeding UI should show the player's own margin before they commit.

The star is one number. If slower dissipation does not force build transitions, late heats are early heats with fewer ships. The fallback is fixed hazards in late slots: more content, less elegant.

The state machine grows. Seeds, buys, sells and rerolls are all inputs, so `simulate` stays pure and a test replays a whole run from a seed and an input list, but `run.ts` gets much bigger.
