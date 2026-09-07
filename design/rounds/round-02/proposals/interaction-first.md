# The Toll

## Premise

Ships never touch, so the only thing I can do to you is make the course worse for
you than it is for me. That is the whole design.

Every course carries the same four hazards, drawn faint. Before each heat every
ship **stakes** one of them, and a hazard's size is the sum of the builds staked
on it. Then the hazard pays its stakers: **every point of hull it takes off a ship
above you on the ladder earns you credits.** You are paid for hurting the people
beating you, and only them.

That one rule does four jobs. Everybody acts on the track every heat, not just the
leader and the tail. Nobody stakes a hazard their own build cannot eat, because they
fly through it too. The leader earns nothing and starves, so the ladder does not run
away. And "what should I buy" becomes "what is the field built for, and what can I
make expensive for them" — the auto-battler question, asked with hazards instead of
units.

## The loop

Eight ships. Seven races: six heats and a final. Seven to eight minutes.

**The lobby**, thirty seconds. Seven courses drawn end to end, each showing its
**socket order** — which of the four hazards sits where — and any fixed neutral.
Heat 4 puts the black hole last, behind the belt; heat 5 has no hole at all. You read
the map once and it never changes.

**A heat** is one course of four or five segments, 700 to 950 ticks at base speed:
12 to 16 seconds of flying, 19 for the final's 1,150. Inside a heat nothing changes
from today.

Between heats, **two screens, three taps**.

_The Board._ Top half, the next course as four hazard icons in socket order, each
with intensity pips and the initials of whoever staked it. Bottom half, the ladder:
points, a hull bar, credits, four coloured pips per build. You tap one hazard to
stake it, or **Hold** for 2 credits. Stakes are secret and reveal together.

_The Draft._ Ten cards face up, each printed with the copies left in the season deck.
Ships buy one each in reverse ladder order, so the ship about to be cut picks before
the leader. You may pass; repairs are bought here too.

Cuts land after heats 3, 4, 5 and 6: the bottom row goes. Four ships fly the final
at double points, and the ladder after it is the standings.

## The build

Five stats survive. A part is still additive deltas resolved once before the race.
Two things are added: every part carries a **tag**, and `resolveBuild` returns a
block of **rule modifiers** beside the stats, which `race.ts` and `hazards.ts`
read instead of `tuning.ts`.

Four tags, twelve parts, two tiers. Tier 1 costs 4 and is in the deck from heat 1.
Tier 2 costs 8 and enters from heat 3.

| Tag            | Tier 1                            | Tier 2                                         |
| -------------- | --------------------------------- | ---------------------------------------------- |
| Burner (red)   | Ion Thruster, Overclocked Reactor | Plasma Drive: +0.22 speed, −25 hull, −20 heat  |
| Brick (grey)   | Ablative Plating, Keel Plate      | Ram Prow: +60 hull, −0.10 speed                |
| Mirror (blue)  | Mirror Shielding, Capacitor Bank  | Phase Array: +40 shield, +10 hull, −0.06 speed |
| Sling (purple) | Inertial Anchor, Radiator Fins    | Grav Keel: +0.05 accel, +35 heat, −0.04 speed  |

Keel Plate (+30 hull, +20 heat tolerance, −0.06 speed) and Capacitor Bank (+30
shield, +0.02 acceleration, −25 heat tolerance) are the only new tier-1 parts; the
other six are the slice's, untouched. Copies count: two Ion Thrusters is Burner 2.

| Tag    | 2 of a tag                     | 3 of a tag                                           |
| ------ | ------------------------------ | ---------------------------------------------------- |
| Burner | Heat sheds twice as fast       | Reroute cooldown 420 → 210: twice a heat             |
| Brick  | Asteroid damage −30%           | Continuous hazard damage capped at 2 per tick        |
| Mirror | Shields hold 180 ticks, not 90 | Shield cooldown 420 → 140                            |
| Sling  | Assist heat halved             | Black hole pull 0.55 → 1.0; assist boost 1.33 → 1.66 |

Two are deliberate rewrites of round 1. **Brick 3 caps continuous damage only** — a
gamma burst is one-shot, and `isOneShot` already exists in `hazards.ts` — so a Brick
walks through rock and a burst still kills it. **Mirror 3 buys uptime, not depth**,
because a base pool of 50 already stops one 45-point burst. At Mirror 3 shields are
up 180 of every 320 ticks, 56% of a course, which makes it the only ship that can be
shielded through an asteroid field — the answer to rock that is not more plating.

The modifier block is seven numbers: asteroid multiplier, continuous damage cap,
shield duration, shield cooldown, reroute cooldown, gravity-heat multiplier,
gravity-speed multiplier. A part that needs an eighth is a stat delta instead.

Commitment is arithmetic: seven drafts, seven parts at most, passing costs one. Two
sets is six parts; three is impossible. A direction lands at a tag's second part and
a set comes online at the third — heat 3 for a spender, heat 4 or 5 for most.

**The four tags form a cycle**, and that is what stakes are for.

| Tag    | Stakes         | Which kills                                                    |
| ------ | -------------- | -------------------------------------------------------------- |
| Brick  | Asteroid field | Burner — rock scales with the square of speed                  |
| Burner | Solar flare    | Mirror — heat is internal, shields never stop it               |
| Mirror | Gamma burst    | Brick — one-shot, uncapped, and Brick has no pool              |
| Sling  | Black hole     | Brick — no damage, just drag, on the slowest ship in the field |

The Solar Flare is the only new hazard: one tick, no dice, +35 heat, unshieldable.
The burst says tap shields now; the flare says do not tap Reroute now. The ringed
planet is a fifth hazard **nobody can stake** — the season's neutral.

## The economy

One currency, whole numbers, never inside the race. Everyone starts with 4.

**Income, two sources.** The purse: 3 for first, 2 for second and third, 1 for
anyone else who finishes, 0 for a ship that is lost. The toll: **1 credit per 15
points of hull your staked hazard removes from ships that were above you on the
ladder when you staked, capped at 5 a heat.** Holding pays a flat 2. No interest.

**Sinks, two.** Parts at 4 and 8, and repairs at 1 credit per 6 hull, bought at the
draft — a full repair from 40 hull costs 10, more than a tier-2 part.

**The prices bite.** A mid-field ship earns about 3 a heat, so one that buys at both
early drafts reaches the heat-3 draft holding about 2 and watches the tier-2 go to
someone who passed once. A saver holds 10 there and buys it — but it flew two heats
on a bare hull, so it is near the cut line with one part of a tag and no set.

|          | Draft 1 | Draft 2 | Draft 3 | Draft 4 | Draft 5 |
| -------- | ------- | ------- | ------- | ------- | ------- |
| Spender  | 4 → 0   | 5 → 1   | 4 → 4   | 8 → 0   | 3 → 3   |
| Saver    | 4 → 4   | 7 → 7   | 10 → 2  | 5 → 1   | 4 → 0   |
| Switcher | 4 → 0   | 6 → 2   | 7 → 7   | 11 → 3  | 6 → 2   |

The switcher is richest because it Holds in heats where its own hazard is already
maxed by somebody else, taking 2 credits rather than adding a fifth pip to a hazard
capped at four.

**The leader earns none of the toll.** In the run below the player wins heat 3 and
takes 3 credits while the ship that finished sixth takes 5. Money flows down the
ladder and points flow up; the cut stops that being charity, because the richest ship
in the season is usually the one about to go.

## Run health and elimination

**Points are what kills you.** A heat scores 9 minus your position; a lost ship
scores 0 and places behind every finisher. After heats 3, 4, 5 and 6 the bottom row
is cut, with the line drawn from heat 2 and the tiebreak — most recent heat —
printed beside it. The final pays double, sixteen down to ten among four ships: a
six-point comeback window.

**Hull is what greed spends.** It carries between heats and is repaired only with
credits. A ship destroyed in a heat returns at 30 hull, keeps its build, scores 0,
and **still collects the toll its hazard earned while it was flying** — your stake
works after you die, which is the difference between a bad heat and a lost run.

Being cut is earned: nobody goes before heat 3 and one ship goes per heat. Recovery
has four levers and none are charity — the toll flows upward only, so the money is
at the bottom; the tail drafts first; a destroyed ship still gets paid; the final
doubles.

## Other players

**Every ship stakes, every heat.** Not the leader and the tail — all eight, one tap
each. A hazard's intensity is 1 plus the total tag-count staked on it, capped at 4,
and intensity scales exactly one number per hazard: the belt's damage per tick, the
number of gamma bursts (150 ticks apart), the number of solar flares, the black
hole's pull and length. A Brick 3 sets the belt to 4 on its own — a build coming
online as a hazard visibly getting bigger before anyone has flown.

**You cannot stake what you cannot survive.** You may only stake a hazard you own at
least one part of the tag for; below that, your move is Hold. A build's weapon and
its armour are the same parts, so a rival's pips say what it will do to the course.

**Reading the ribbon is the counter-pick.** Four grey pips across the ladder means
the belt will be at 4 every heat, and the answer is not more plating — the Bricks
have been draining that from a five-copy supply for three drafts. The answer is
Mirror 3, which shields through rock and stakes the burst Brick cannot cap. A Y that
is not X, in one glance.

**The draft is shared, face up and finite.** Five copies of each tier-1 part and
three of each tier-2: 52 cards against about 40 purchases. Ten are dealt each draft,
guaranteed to include one of each tag and, from heat 3, one tier-2. Unbought cards
return and reshuffle; a cut ship's parts do not. Copies left is printed on every
card, so denying the Mirror behind you the last Phase Array is a legible move.

**Attribution is data.** A placement carries the id of the ship that staked it, and
the race records damage per ship per placement. Results read hazard by hazard: _34
hull to Bulwark's belt. 45 to Halo's third burst. Your suffering paid 7 credits to
the four ships below you._

**Bots stake with one rule** in `stake.ts`: stake your largest tag's hazard; if it is
already at 4, Hold; with no tag, Hold. A stake is an input exactly like a tap, so a
bot, a recorded ghost and a live player are the same thing to the simulation.

## A worked run

Eight ships: **You**, Redline (Burner), Bulwark (Brick), Halo (Mirror), Keel
(Sling), Tinker (reads the ladder), Ledger (always Holds), Scrap (buys cheap, never
repairs).

**Lobby.** You go Mirror: nobody is committed yet, and bursts scale with count
rather than size, so uptime will beat depth.

**Heat 1.** Everyone has 4 and buys a tier-1; you take Mirror Shielding. Sockets:
belt, burst, flare. You and Halo both stake the burst, putting it at 2 — two bursts
150 apart, and a 420-tick cooldown covers one. Two Bricks put the belt at 3, two
Burners the flare at 3; Keel and Ledger Hold. Halo wins, you are second. Your second
burst takes 45 each off Redline and Bulwark, both above you in the lobby order: 90
hull, capped to 5 credits, plus 2 purse. **You are second and the richest ship on the
board.**

**Heat 2.** Drafting seventh you take a second Mirror Shielding: Mirror 2, shields
hold 180 ticks. You and Halo put the burst at 4. One window covers bursts one and
two, you re-tap for four — you eat one of four, everyone else eats three. **Mirror 2
comes online and the whole field watches it.** You win; Scrap is destroyed. Toll 3.

**Heat 3.** First cut. Drafting seventh with 9, you take Phase Array for 8: **Mirror
3, cooldown 140.** Halo picks last and it is gone — you denied the only other Mirror
the part that would have matched you. You max the burst, three Bricks max the belt,
Redline puts the flare at 2, Keel the hole at 2. Shielded 56% of the course, you
cover all four bursts and half the belt and win. Scrap is cut. **You were first when
you staked, so your toll is 0** — you win the heat and take 3 credits while Tinker,
sixth, takes 5.

**Heat 4.** Every socket is maxed: two Bricks on the belt, Redline (Burner 3, Plasma
Drive) on the flare, Keel (Sling 3, Grav Keel) on the hole, you and Halo on the
burst. Redline flies at 1.45, bleeds 65 hull on the belt, sheds the flares for free,
and hits Keel's maxed hole — 0.48 pull, 160 ticks — on 22 hull. It survives, sixth.
Ledger, ten credits banked with one Ram Prow and no set, is cut.

**Heat 5.** You lead and you are broke: 3 credits, drafting last, you pass. Halo
takes the last Phase Array and reaches Mirror 3. This course has no hole and Halo
stakes the burst to 4 alone — so **you Hold for 2**, because a fifth pip on a capped
hazard is worth nothing. Redline maxes the flare; the heat cooks Halo through its
shields and drops it to third. Keel, with nothing to stake, Holds and is cut.

**Heat 6. The moment.** Halo is six points back and the only ship that can catch
you: Mirror 3, 70 hull, no plating. This course puts the **hole last, directly behind
the belt.** Drafting last with 8, you buy Inertial Anchor for 4 — your first purple
pip, worth almost nothing to your stats — and repair 12 hull for 2. Bulwark maxes the
belt, Redline the flare, Halo the burst. **You stake the hole at 2.** Halo shields
half the belt, comes out on 62, cooks to 22 on Redline's flares, and crawls through
your hole seven points above the escape line, losing three seconds and four places.
You win; Halo is fifth. **One Anchor, bought only so you could stake at all, cost
Halo the season.** Redline is cut on the tiebreak.

**The final.** Four ships, double points, five sockets. Bulwark maxes the belt, Halo
the burst; Tinker, a second Brick with the belt already capped, Holds. You stake the
hole at 2 again, shield the bursts and half the belt, and the Anchor claws your speed
back out of your own hole. **You 63, Halo 49, Bulwark 46, Tinker 39**, then Redline,
Keel, Ledger, Scrap in reverse order of exit. Six stakes and one Hold across seven
races, and the sixth decided the season.

## What it costs to build

**Survives unchanged.** `rng.ts`, `spline.ts`, `actives.ts` as data, `pilot.ts`'s tap
rules, `field.ts`'s lockstep loop and standings, and the shape of the race loop.

**Changes, honestly.** `hazards.ts` is on this list: `HazardContext` gains
`intensity`, all four functions read it, `solarFlare` is added, four test files
change. `race.ts` reads the modifier block from the build instead of `tuning.ts` for
shield duration, shield cooldown, reroute cooldown, the damage cap and the two
gravity multipliers, and records damage per placement so the toll and attribution
are data rather than a log. `ship.ts` gains a tag and tier per part, six new parts,
and a `resolveBuild` returning stats, modifiers and tag counts. `track.ts` gains
sockets and intensities; `HazardPlacement` gains `intensity` and `stakedBy`;
`SLICE_TRACK` becomes a fixture beside a new `SEASON` of seven socket layouts.
`field.ts` widens `ShipId` to a string, `rivals.ts` grows to seven bots, `garage.ts`
is replaced, and `run.ts` is rewritten as `season.ts` — the single biggest change.

**New.** `tags.ts`, `deck.ts`, `stake.ts`, `season.ts` (ladder, cut, draft, credits,
toll), and in the UI the Board, the Draft, an eight-lane render, and results with
attribution.

**PRs, one session each.** (1) Modifier block and `race.ts` reading it. (2) Tags,
two new tier-1 parts, four thresholds with tests. (3) Intensity through
`HazardContext` and the four hazards. (4) Solar Flare. (5) `deck.ts` with the tag
guarantee and copies left. (6) Ladder, points, cut, tiebreak. (7) Credits, purse,
prices, repairs, the per-placement damage ledger and the toll. (8) `stake.ts` and
seven bots. (9) The Board and the Draft. **That is the first playable, at nine.**
Then (10) four tier-2 parts, (11) eight-lane render, (12) results with attribution,
(13) harness bots, (14) the season map, (15) a tuning pass. Fifteen in total: S2 and
S3 again on the same bones, at one PR a session.

**Measurable.** Six assertions over 500 seeded eight-bot seasons. A bot that stakes
its own tag beats one that always stakes the same hazard in at least 55% of seasons.
Each tag's win share sits between 18% and 32%. On a course with its own hazard at
intensity 4, a set-3 ship beats an identical set-2 ship in at least 70% of races. The
heat-1 winner wins under 35% of the time; the leader after heat 3 under 45%. A bot
that buys at every draft holds under 4 credits at the heat-3 draft in at least 80% of
runs. A season is 45,000 ship-ticks, so 500 is a `npm run balance` job with 50
bounded inside vitest.

## What it needs from the owner

Are the other seven ships bots, recorded ghosts of earlier runs, or live players?
Bots cost nothing new. A ghost costs a recorded season — build, stake and tap list
per heat, about 2KB — plus somewhere to keep it. Live players cost a server and a
timer on every screen, reversing the no-timers decision. The sim does not care, but
the lobby, the draft and the harness all depend on the answer.

Should the leader really earn nothing from the toll? It is the anti-snowball, and it
may read as a punishment for winning.

Are stakes secret until they reveal, or laid openly in reverse ladder order? Secret
prevents copying; open gives the tail the last word and a sequence to build.

Is intensity 4 the right cap, and is a course with all four hazards maxed something a
phone can read, or a wall? Is Hold worth 2 credits? Is 15 hull per credit the right
toll rate?

Should a cut ship's parts return to the deck? Not returning them thins the late
season, which is either escalation or starvation.

Does the final pay double or triple, and should the ringed planet stay unstakeable?

## Risks

**Everything is maxed by heat 4 and the courses stop differing.** From heat 4 the
field has the tag-count to max all four. Hold is the brake, and the harness measures
course variance across heats. If the courses flatten, the cap goes to 6 or tag counts
are halved before they add.

**Losing becomes too profitable.** The toll pays only downward, so a bot could farm
sixth. The cut is the counterweight: if the leader after heat 3 wins under 30% rather
than under 45%, the rate is too generous.

**The four-way cycle is too neat.** If the field converges on one tag, the counter
tag wins every season. The cycle is tuning, not architecture, so a failing tag gets
its threshold rewritten.

**Secret stakes reveal instantly against bots**, so the tension of the reveal is
imaginary. If it plays flat, stakes go open in reverse ladder order and the bottom
ship gets the last word.

**Sequence is lost.** Socket order is level data, so nobody can put rock in front of
a hole on purpose; you can only enlarge the rock already there. The fallback is one
extra tap for the bottom two ships: swap two adjacent sockets.

**A ship can be killed by its own stake**, and it will blame the game. The Board has
to show the player's own projected damage before they commit.
