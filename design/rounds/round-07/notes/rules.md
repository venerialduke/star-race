# Notes: The rules reader

## Did the notes land

Yes, all of them. Track, checkpoint, section, split, route: used the same way everywhere, and "every route ends at the same next checkpoint" is stated as a rule. Two laps, same three ships: applied, and the per-lap scoring that only existed for the reshuffle is gone with it. Pit stop resynchronises, total time accrues, tracking bar: applied, and "what a ship keeps is everything, what resets is the line" answers the round 6 question directly. Thirty seconds: applied as a track rule. Phases, growth between phases or on purchase: applied. Cut at phase, with the between-heats thought left open in the calls, as the brief asked.

## Does the idea survive

It is the same design. Six parts, corner plan, swing, Nav goals, reaction, self-firing abilities, gravity, three damage layers, fixtures and splits, purse and pools, margin bonus, two declarations: all carried over with the same words. Only the frame around them moved. Every seed system is accounted for: three laps altered to two and said so, wanted and cops removed and said so, passive collectors and randomness at the cut flagged again. Nothing vanished.

## What works

The checkpoint structure makes the race a chain of independent runs. Each run is pit stop to pit stop, positions reset at the start, per-section time is summed, and the sim for one run is a pure function of the ships entering it. Balance tests can run one section thousands of times.

"Every route ends at the same next checkpoint" makes overshoot-into-the-other-route a real rule: a ship's state at a bend is a route index and a wide flag, and the swing draw can change either.

Wide as a per-section state, cleared at the checkpoint, is clean. Lift, Carry, Charge are three discrete values a bend can read. Hold the Line has an exact void condition.

## What does not

"A run between pit stops lasts thirty seconds at most" is a promise the track cannot keep on its own. Pit stop placement bounds the distance, not the time of a cheap-Thrust ship on Lift parked wide on a Slick. A run needs an end rule: it ends when the last ship crosses or at a tick cap, and a ship that has not crossed takes the cap plus a penalty. That is one sentence that is five rules, and none are written.

"Pools pay their lap's share at each pit stop" contradicts "more checkpoints become pit stops as the loop grows." On a grown loop there are two or three pit stops a lap. The same drift hits interest, the one-lap fixture, the halt's crew recovery, and gravity, which is measured in laps ("a lap of it leaves a humanoid crew acting at half") while a lap now varies in length. Every per-lap quantity silently becomes a per-run quantity or does not, and the document does not say which.

The Long Line has a hole. It "takes the wide route at every split," and the swing "carries the ship into the other route, whichever it planned." A Long Line ship thrown onto the path route has broken the declaration by accident, and no void rule covers it. Hold the Line has one; the Long Line needs its mirror.

"Read those two ships' fixtures and splits as closely as their own" cannot be done at build time. Fixtures are placed before the heat and "shown to all three ships before the start." If placement is simultaneous and blind, there is nothing to read until the race. Say whether groups are drawn before placement and whether rivals' placements are revealed before yours is locked.

"How far to shift shields toward a shot" names a mechanic the shields paragraph never defines. Either shields have a facing or they do not.

"Coasting" carries shield regen and crew recovery and is never defined. A ship at top speed on a straight is not accelerating. Is it coasting?

Abilities charge from one meter or many, and when two are charged, which fires? Reaction sets when; nothing sets which.

## What I would add

A run as the named unit, pit stop to pit stop, with a tick cap and an uncrossed-ship rule.

One line per per-lap quantity saying whether it is now per run or per lap: pools, interest, gravity, fixture lifetime, halt recovery.

Long Line void on being swung onto the path, or a line saying it is not.

Coasting: any tick where no thrust is applied, including braking for Lift.

One charge meter, abilities fire in fitted order, first whose condition the crew judges met.

Mine: one hit per heat, then spent.

## What I would cut first

The shield-shifting clause in Reaction time. It is the only mechanic in the document with no home, and it makes reaction sound like it needs a fourth rule nobody has written.
