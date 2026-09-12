# Notes: The rules reader

## Did the notes land

Yes, all seven. "Lands late" is gone with its mechanic, Rake is defined in the sentence it appears in, and the cut is stated plainly. The numbers are gone; what is left is counts and one ratio. Handling is the swing on a bend, seeded, widened by speed and narrowed by Handling, and the document says out loud that the base's premise moved. Reaction time is what the crew does on its own, and it sets the tap window as the note suggested. Taps are zero to three and each one is explained. The route is planned on the board with clear, dim and dark forks, and Navigation lights them. Three laps, and the course grows every lap.

## Does the idea survive

It is the same design with a new heart. The golden path, the fixtures, the three pools, Long Line, wanted and the cutter, the two crews, the margin bonus, the season shape: all here, in the same words. What changed is exactly what the note asked to change. The seed's systems all survive as kept, altered or flagged, with one small loss: the seed's navigation system "optimizing acceleration, using gravity assists" has no trace. The gravity well is now a junction, not an assist. Minor, but it should be named as dropped rather than left silent.

## What works

The swing is the best-defined mechanic in the document. "A seeded draw of how far the ship overshoots... the spread of that draw grows with entry speed... Handling shrinks the spread." That is a distribution with two inputs and a threshold, the path width, that Beacon widens. A bot can sweep throttle against Handling and produce a curve. Nothing else needs to be true for it to work.

The tap window is a tick interval whose length is a function of one number. Tap ticks inside, full effect; outside, energy gone. Clean.

The route as a pre-race plan is a gift to balance testing. A race becomes a function of the shop, the board and at most three tap ticks. Bots can play whole strategies without a policy for mid-race play.

The pool cap "no pool, even uncontested, pays one ship more than the gap between first and second place purse" is a rule, not a hope.

## What does not

**Coasting has no rule under it.** "You set a throttle... and the ship holds it," yet gravity comes from "a ship that burns hard out of every bend," and shields regenerate "faster when the ship is coasting." Nothing says a bend sheds speed. If the ship holds throttle and stays on the path, it accelerates once at the start and never again, and gravity never bites a clean fast build, which is the build gravity was meant to punish. Bends need to slow the ship so that leaving one is a burn.

**Two crew pools wearing one name.** "Crew is the people, worn down by gravity and by hits that get through," but a crew "worn to nothing" recovers and a dead crew does not. Either fatigue is a second pool with its own recovery, or gravity kills. Pick one and say which number "acting at about half" scales.

**"The crew does the same things on its own" cannot hold for all four actives.** Brace and Scoop are things a crew would do anyway. Burn and Rake are not. If the crew rakes on its own, wanted rises without the player's choice and aggression stops being a strategy. If it does not, then the rule that "not tapping is always fine" is false for two of four.

**Burn has no anchor.** Every other window sits on an event: the next bend, the next pocket, a rival in range. "A short hard overspeed on a straight" is a duration, not a moment. Where is the marked window?

**Two kinds of wide.** A swing throws the ship "wide for the rest of the segment." A fork's wide branch "goes wide through a pocket or a hazard and rejoins later." The state diagram treats them as one state. Are the pockets and mines in the segment's wide zone, on the branch, or both? And Navigation "picks the side," so a segment's wide zone has two sides with different contents, which the course model has to carry. Then: a swing on a segment with a fork, does it override the planned branch?

**The cap creeps.** The cap is per pool. A ship fits two collectors, draws two uncontested pools, and takes third purse plus twice the gap. Against a winner on first purse plus a thin solar share, third can still leave richer. Cap the pool total per ship at the gap, not each pool.

**The cutter is unshakeable.** "Shake it off with a few hits" when the only weapon costs a tap and a heat has three. Either the cutter leaves after a lap, or the crew's own unpaid rakes count.

**Luck needs a definition of "bad."** A swing beyond path width, a shot that gets through: those have thresholds. A fork has no bad draw until you know what the branch holds. Restrict luck to draws with a failure line.

**Lap growth per ship or per field.** A section "opens on lap two." If the trailing ship is still on lap one when the leader enters lap two, the junction must open per ship's own lap counter. Say so.

## What I would add

Bends shed speed, so the throttle is the rate of the burn out of them; that gives coasting, gravity and shield regeneration one shared definition.

One course model: every segment has a path lane and a wide lane with two sides; a fork is a segment whose wide lane the player may choose in advance; a swing drops the ship into the wide lane mid-segment on the side Navigation chose. A planned branch and a swing then never conflict.

A precedence rule for overlapping windows: one button per fitted active, so the player chooses which, and a tap with no window open costs nothing.

Long Line overrides dark forks; the declaration is the crew's instruction.

## What I would cut first

Burn. The throttle already sells speed on straights, the window has no event to sit on, and it is one of the two actives that breaks "the crew would have done it anyway." Three actives, fit two, and the contradiction shrinks to Rake alone, where it can be stated as the one exception.
