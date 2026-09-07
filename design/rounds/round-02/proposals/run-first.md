# The Rising Line

## Premise

A run is a season. Eight ships, six heats and a final, about twelve minutes on a
phone. What keeps you in is not your position but a **points line that rises**:
10 to survive heat 3, 17 after heat 4, 24 after heat 5, 31 after heat 6. Most
heats take one ship, some take two, some take nobody — and the grid flies on
knowing the next line is harder.

Two numbers carry the run. **Points** decide whether you are still in it.
**Frame** — maximum hull, which never fully comes back — decides whether you
survive the course. Credits are the only thing that buys either back.

And every heat, all eight ships lay a card into the next course. Not the leader,
not the tail: everyone, every time. That is how another player's choices reach
you — as the rock in segment two, three cards deep, with three names on it.

## The loop

**The lobby.** Seven rivals, each a name and two words. The season drawn end to
end: seven courses, every fixed hazard placed, four dashed boxes per course — the
open slots — the rising line printed under heats 3 to 6 with its number, and
beside it the counter ring, four tags in a circle with each arrow pointing at the
tag that beats it. Thirty seconds, one tap.

**A heat** is one course of four segments, 700 to 850 ticks at base speed, twelve
to fourteen seconds of flying, one open slot per segment. The final is six
segments, about 1,100 ticks, double points. Ships leave from a standstill under
today's rules. The renderer fans the lanes; the sim has one line and no contact.

**Between heats, three untimed screens**, one tap each.

_The ladder._ Eight rows: points, Frame, credits, four coloured pips with the
count lit. The rising line is drawn across it with the number to clear next and
the tiebreak rule beside it.

_The seeding._ The next course, four slots. Wave one: the top half of the ladder
lay at once and the board shows their cards. Wave two: the bottom half lay,
seeing wave one. Each slot takes the kind with the most cards behind it, and that
count is its **intensity**.

_The draft._ Ten parts face up, copies-left printed on each. Ships pick one in
reverse ladder order. Pass and bank, or buy a part or a refit.

**The arc.** Heats 1 and 2 have no line: gentle courses, thin builds, and eight
single-weight cards spread over four slots because nobody has two of a tag yet,
so nothing lands above intensity 2. Heat 3 opens tier
2 and draws the first line. Heats 4 and 5 are where sets come online and the
seeding turns vicious. Heat 6 is the last qualifier. Then three, four or five
ships fly the final at double points, and the ladder after it is the standings.
Six drafts, six seedings, seven races: about twelve minutes, so two runs fit in
twenty — which matters more than one long one, because the success test is
wanting a different build.

## The build

The five stats survive. A part is still additive deltas resolved once before the
race. Two things are new: every part carries a **tag**, and `resolveBuild`
returns a **modifier block** of eight numbers beside the stats, which the race
loop and the hazard functions read instead of reaching into `tuning.ts`.

Twelve parts, four tags, two tiers: two tier-1 and one tier-2 per tag. Tier 1 is
the six slice parts redistributed plus a Keel Plate for Brick and a Capacitor
Bank for Mirror, so no tag is short of cheap copies. Tier 2 enters at the heat-3
draft — Afterburner, Ram Prow, Phase Array, Grav Keel — bigger deltas at bigger
costs, Ram Prow at +70 hull for −0.12 speed. Copies count, so three Ion Thrusters
is Burner 3.

| Tag        | What it is                     | 2 of a tag                     | 3 of a tag (online)                                                                  |
| ---------- | ------------------------------ | ------------------------------ | ------------------------------------------------------------------------------------ |
| **Burner** | Engines. Fast, hot, fragile.   | Heat sheds twice as fast       | Reroute cooldown 420 → 180 ticks, and a reroute overrides the black hole's speed cap |
| **Brick**  | Armour. Slow, hard to kill.    | Frame lost per heat halved     | Escape threshold halved; overheat cooks hull at half rate                            |
| **Mirror** | Shields. Absorbs what arrives. | Shields hold 150 ticks, not 90 | Shields stay up until the pool is empty; incoming heat halved while up               |
| **Sling**  | Handling. Threads things.      | Black hole pull 0.55 → 0.75    | Asteroid damage scales with speed, not speed squared                                 |

The block is eight numbers and no more: asteroid exponent and multiplier, reroute
cooldown, shield duration, shield-until-empty flag, black hole pull, escape
threshold multiplier, heat multiplier. A part wanting a ninth is a stat delta.

**The counter ring is the information game.** Each tag lays one card, and each
card is beaten by exactly one other tag's set. Brick lays **rock**; Sling 3
crosses it at speed. Sling lays **the pull**; Burner 3 boosts out. Burner lays
**the flare**; Mirror 3 shields the heat. Mirror lays **the burst**; Brick 3 has
the Frame to eat a stack. Counter-picking never means copying the leader, because
the answer to their card is never their part.

Commitment is arithmetic: six picks, and a pass costs one. Two sets is six parts
and the greedy dream; three sets does not exist. A build has a direction at two
of a tag — which is when its card counts double on the track — and comes online
at three: heat 4 at the earliest, heat 5 for most.

## The economy

Credits, whole numbers, never inside the race. Every ship starts with 3.

Purse by finishing position: 5, 4, 4, 3, 3, 3, 2, 2. A lost ship gets 2 as
salvage. Interest is 1 per 6 banked, capped at 2, paid before each draft. Tier-1
parts cost 3, tier-2 cost 6. A **refit** costs 5 and restores 20 Frame, one per
draft. No rerolls, because the draft is shared; no selling, because a wasted pick
is what a pivot costs.

Prices bite by construction: a ship that buys at every draft holds 3 credits at
the heat-3 draft and watches tier 2 arrive at 6. Three bots, all mid-field on a
3-credit purse:

| Draft | Spender                               | Saver                                         | Switcher                                  |
| ----- | ------------------------------------- | --------------------------------------------- | ----------------------------------------- |
| 1     | buy T1 → 0                            | pass → 3                                      | buy T1 → 0                                |
| 2     | buy T1 → 0                            | pass → 7                                      | buy T1 → 0                                |
| 3     | buy T1 → 0                            | buy T2 → 6                                    | T1, second tag → 0                        |
| 4     | buy T1 → 0                            | buy T2 → 4                                    | buy T1 → 0                                |
| 5     | buy T1 → 0                            | T1 + refit → 0                                | buy T1 → 0                                |
| 6     | buy T1 → 0                            | buy T1 → 0                                    | buy T1 → 0                                |
| Final | 6 parts, set online heat 4, Frame ~60 | 5 parts, two tier-2, online heat 5, Frame ~85 | 6 parts, two tags at 2, no set, Frame ~70 |

The spender comes online a heat earlier and reaches the final on a Frame the
black hole can kill. The saver is a heat behind and arrives healthy with the
scarce cards. The switcher answers two cards and beats neither. That is the
target the harness must confirm, not a claim.

Why save: tier 2 is double the price, two copies each, gone for the season once
bought. Why refit: Frame does not come back on its own. Why spend now: the line
rises after the next heat, and the ship one row below you just bought the answer
to the rock you are about to fly into.

**The deal, in full.** The deck is 4 copies of each tier-1 part and 2 of each
tier-2: 40 cards, tier 2 shuffled in before the heat-3 draft. A draft deals ten
face up; if a tag is missing, the tenth card is replaced by the top card of that
tag's pile, so every tag is always buyable. Unbought cards go to the bottom;
bought cards are gone for the season; a cut ship's parts do not return.

## Run health and elimination

**Points keep you in.** Nine minus position, and a smaller field still pays 8 at
the top — so every cut speeds the survivors' climb, a rubber band in the
arithmetic rather than bolted on. A lost ship scores 0 and places behind every
finisher. The final pays double.

**The line rises**: 10, 17, 24, 31. Mean totals track about 13, 19, 25 and 31, so
each line sits one to three points under the middle of the pack: usually one ship
goes, about one heat in four takes two, and sometimes everybody clears and the
next line does the work. Ties break on the most recent heat, printed beside the
line before the heat rather than after.

**Frame keeps you alive.** Frame is maximum hull; it starts at 100 and floors at 30. Hull is repaired to Frame free before every heat, and that repair costs 1
Frame per 10 hull put back. A careful ship taking 25 damage a heat loses 2 and
ends the season on 88; a greedy one taking 70 loses 7 a heat and reaches the
final on 58, where a flat escape threshold is suddenly a wall. Being destroyed
costs 20 Frame on top, so two crashes is a ruined ship but not the end of a run.
Brick 2 halves the bill, which is what armour is for at run scale. This is the
F-Zero trade at season length: one falling number saying how much of your future
you spent going fast.

**Recovery has four structural levers and no charity.** The tail seeds in wave
two with every other card on the map, so eighth is the only ship with complete
information. Slot ties go to the later card. The tail drafts first, so eighth
takes the tier-2 card the leader wanted. And the field shrinks while the top of
the purse does not. A ship that crashes in heat 3 is behind, never out of it.

## Other players

Everything goes through the seeding, the deck and the ladder. Ships never touch.

**Every ship lays a card, every heat.** Your menu is your build: Open Run always,
plus the card of any tag you hold a part of. At two of a tag your card **counts
double**. A slot resolves to the kind with the most cards behind it; its
**intensity** is that count minus any Open Run laid there, floored at 0 and
capped at 4. Open Run is the defuse: build a threat elsewhere, or take weight off
the segment aimed at you.

Intensity is one multiplier per hazard, and it is the season's escalation with no
hidden curve: asteroid damage per tick × intensity; _intensity_ bursts 60 ticks
apart, which is what makes Mirror 3's shields-until-empty a rule rather than a
number; ringed-planet heat × intensity; escape threshold × intensity, 25, 50, 75;
and the Solar Flare — the one new hazard, a single tick of heat shields do not
stop — × intensity.

**Every card carries names.** A placement holds the ids of the ships that seeded
it, and the log charges hull and heat per placement, so results read hazard by
hazard: "lost 34 hull to Bulwark and Keel's rock, shielded Halo's bursts". After
one heat a rival is a character and the next seeding is a reply.

**The draft is shared and visible.** Two Bricks want the same Ram Prow and the
lower one gets it. Taking the card that completes a rival's set, when it is one
heat from falling under the line, is a move the ladder shows everyone.

**Rivals are bots, and every bot decision is an input.** They draft by wish list
in tags. They seed by one rule: lay your tag's card into the slot your build
handles best; with no tag at 2, lay Open Run into the slot you handle worst. Two
read the ladder instead — Ledger banks for the priciest thing on the table,
Tinker buys the answer to what was just seeded. Because cards, picks and taps are
all recorded inputs, a bot slot can later hold a ghost or a live player with no
change to the sim. Everything is visible to everyone; only tap timing is hidden.

## A worked run

Eight ships: **You**, Redline (Burner), Bulwark (Brick), Halo (Mirror), Keel
(Sling), Ledger (banks), Tinker (buys the answer), Scrap (cheapest, never
refits).

**Lobby.** Black hole fixed in heat 5, bursts in heats 3 and 6. You commit to
Sling: cheap parts now, Grav Keel at heat 3, online before the Maw.

**Heat 1.** You take Inertial Anchor for 3, and lay the pull with it — one card,
one weight, nothing above ×1 anywhere. Redline wins the gentle belt; you are
fifth on 4 points.

**Heat 2.** You take Radiator Fins: **Sling 2**, your card counts double. Wave
one, Redline lays a flare and Halo a burst; wave two, seeing both, you lay the
pull into segment 4, two deep. Scrap crosses the fixed field flat out on no
plating and is lost. You finish third: Redline 15, Halo 14, You 10, Keel 10,
Tinker 10, Ledger 7, Bulwark 5, Scrap 1.

**Heat 3.** Tier 2 opens; the line is 10. Ledger, drafting on 11, takes Grav Keel
because it is the priciest card — the one you needed. You pick fifth, take a
second Inertial Anchor, hold 3. Bulwark and Keel both pile rock into segment 3,
making it rock ×3; wave two, you lay Open Run there, taking it to ×2, spending
your card on defence because you have no armour. Fourth, on 62 hull; the free
repair costs 4 Frame. Scrap is cut.

**Heat 4.** Line 17. You pick fourth, Grav Keel is dealt again with one copy
left, and you buy it: **Sling 3, online**. Halo lays a burst into segment 1,
Bulwark rock into segment 2, two deep. Wave two, you lay the pull into segment 4,
one segment ahead of the fixed black hole, so the course reads pull, then pull.
You cross Bulwark's rock at speed because the square is gone, and win.
**Redline**, chasing you over the same rock on 41 Frame, reaches segment 4 at 12
hull and cannot clear the doubled escape threshold. Lost. That is the moment:
your card, laid in wave two with the map in front of you, ended another ship's
race — and Redline's results screen says so by name. Ladder: Halo 26, You 25,
Keel 21, Tinker 20, Bulwark 18, Ledger 17, Redline 15. Redline is cut.

**Heat 5.** Line 24, the Maw. Six ships, so the purse still pays 5 at the top.
You buy a refit: Frame 92 → 100, no part. Keel lays the pull into the black
hole's own segment, taking its threshold to ×2; you lay Open Run there, back to
×1. You are second; **Keel**, held by its own doubled pull on Sling 2, is lost on
22 hull. Ladder: You 32, Halo 32, Bulwark 25, Tinker 24, Ledger 22, Keel 21.
Ledger and Keel are both under 24 and both go — two in one heat, which is what
the rising line is for.

**Heat 6.** Line 31, four ships. You take Phase Array for 6 after banking through
heat 5. Halo lays a burst, ×2 on its own; Bulwark rock; Tinker, wave two and
desperate, adds a second burst to Halo's slot to make it ×3, betting its base
pool against a Mirror. It loses and finishes last on 8 hull. Bulwark wins, you
are second: You 39, Halo 38, Bulwark 33, Tinker 25. Tinker is cut.

**The final.** Three ships, double points, six segments. Halo lays a burst;
Bulwark lays rock directly in front of the fixed black hole; you lay Open Run on
the rock. Halo, on 55 Frame after six fast heats and one refit, crosses the
softened rock at 19 hull and is taken by the hole. Bulwark wins; you are second.
**Final standings: You 53, Bulwark 49, Halo 38**, then Tinker, Ledger, Keel,
Redline, Scrap in the order they left.

## What it costs to build

**Survives unchanged:** `actives.ts`, `pilot.ts`, `rng.ts`, `spline.ts`, and the
tick order of `race.ts`.

**Changes.** `hazards.ts` is not free, contrary to last round: `HazardContext`
gains `intensity` and the modifier block, and all four hazard functions and their
four test files change to read them, before the fifth pair for the Solar Flare.
`ship.ts` gains a tag and tier per part, six new parts, and a `Modifiers` return
from `resolveBuild`. `race.ts` reads those eight numbers off the build instead of
`tuning.ts`, and the burst path grows a repeat count. `track.ts`'s
`HazardPlacement` gains `laidBy: ShipId[]` and `intensity`;
`RaceState` gains damage-per-placement; `field.ts` widens `ShipId` to a string;
`rivals.ts` grows to seven with tag wish lists, a seeding rule and a refit rule;
`tuning.ts` gains sets, prices, purses, points, the line, Frame rates and caps.

**New:** `season.ts` (courses, the arc, the lines), `seeding.ts` (menus, waves,
slot resolution, intensity), `ladder.ts` (points, line, cut, tiebreak),
`draft.ts` (deck, deal, copies, order), `economy.ts` (purse, interest, refit,
Frame). `run.ts` is replaced by a season state machine, the biggest single
change.

**Honest count: fifteen one-session PRs**, about three weeks at the slice's pace
of one item a session. In order: (1) modifiers and intensity through `race.ts`
and `hazards.ts`; (2, 3) six parts, tags and tiers with tests; (4) `laidBy` and
per-placement damage; (5) season courses with four slots; (6) seeding — menus,
waves, resolution; (7) ladder, line, tiebreak; (8) Frame and refit; (9) purse,
interest, deck and deal; (10, 11) the season state machine; (12) Solar Flare;
(13) harness bots and targets; (14) lobby, ladder and seeding UI; (15) draft UI,
results with attribution, N-lane render. **The first playable is PRs 1 to 11** —
headless, driven by the harness, before a pixel of new UI.

**The harness** gains bots — saver, spender, switcher, set-chaser,
counter-picker, denier, one-note-seeder, ladder-reader — and asserts over 400
seasons: no tag reaches the final more than 35% of the time; a set-3 ship beats
the same tag at 2 in at least 60% of head-to-heads on a course carrying its
counter card; the heat-1 winner wins under 35%; saver, spender and switcher each
reach the final between 40% and 60%; the ladder-reader beats the one-note-seeder
by 8 points a season; a bot that never refits ends on a mean Frame under 65. A
season is 42,000 ship-ticks, so 400 runs go in `npm run balance`, 40 in vitest.

## What it needs from the owner

Are the seven rivals bots, replayed ghosts of other people's runs, or live
players? Every bot decision here is a recorded input, so all three are possible —
but ghosts need a store, live players need timers, and the lobby, the draft and
the harness all change with the answer. This call has been made by implication
twice and should be made on purpose.

Does every ship lay a card, or only two? Eight cards into four slots is the
answer to the fourth gap and one extra screen; two cards is a PR cheaper and
leaves six ships as scenery.

Is a rising points line better than cutting the bottom row? The line can take two
ships or none, which is less predictable; a fixed cut is one sentence.

Should Frame be permanent, or should credits buy it all back? Permanent is the
F-Zero trade the brief asked for, and it means a bad heat 2 still costs you in
the final.

Is intensity readable, or is "rock, three deep" one idea too many for a phone?
And is eight ships or six the right field — eight makes the line's arithmetic
work, six is easier to draw.

Do copies count toward a set, or must the three parts be distinct? Copies put a
set online at heat 4; distinct parts push every set to heat 6.

## Risks

**The seeding may collapse to one equilibrium.** If piling every card into one
slot is always right, the course is one wall and three empty segments. Open Run
as a defuse and the cap at 4 are the counterweights, and the one-note-seeder bot
is the test. If it wins, the fix is a diminishing return per extra card — a
tuning constant, not a redesign.

**The rising line can take nobody for two heats and then four.** Those numbers
are a first guess against a mean that shifts as the field shrinks. The harness
must report the distribution of cuts per heat, and the fallback — cut the bottom
row, guaranteed — is a five-line change.

**Frame can make the late game a war of attrition** decided by whoever crashed
least. The floor at 30 and the refit are the brakes; if finals are flown by
wrecks, the refit gets cheaper before anything else changes.

**Eight lanes on a phone are thin**, and the ladder has to carry the story if the
track cannot. Six ships is the fallback and changes only the line numbers.

**Sets that change rules are hard to tune**, and Sling 3 removing the square on
asteroid damage may simply be the best thing in the game. One number per rule and
one bot per tag make it measurable; the first table will be wrong. If twelve
minutes turns out to be too short for a build to feel earned, the lever is the
heat count, not the systems.
