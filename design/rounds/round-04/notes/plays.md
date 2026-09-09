# Notes: The player

## Does the seed survive

Yes, and it is sharper. The seed's first line is that a fast ship has less time
to react, and `lag = 8 + 30·(v/vmax)² − 2·Handling − 1·Nav` is that line turned
into something my thumb can feel. Nothing else in the notes had a chance of
being the spine; this did, and the design bet everything on it. Right bet.

One thing did get replaced while keeping its name. The seed's randomness at the
cut — "you lost, but not by much" plus a die — became margin points plus the
Long Line. Margin points are the seed. The Long Line is not; it is a new
declared gamble bolted where the randomness was. I am fine with that trade,
because a die at elimination would make me quit, but call it what it is: an
addition, not a sharpening.

The other quiet substitution is Handling. In the seed it is a real stat about
swinging wide and holding the path. Here it is mostly a −2 coefficient inside
the lag formula, with one vague sentence about band width through a bend. That
one is a loss.

## What works

The throttle is a genuine dilemma and it is one number. At 60% throttle lag is
6 ticks and the ship is mine; flat out it is 23 ticks and I am aiming ahead of
it. I know what I am giving up and I can change my mind mid-race. That is the
whole design working.

Gravity is the best system on the page because it kills. A humanoid crew losing
1 health per 30 ticks above 60% acceleration means the build and the throttle
plan are the same decision, made a stage before I find out.

Three shared pools of 150, split by share, is the seed's shared-economy note
made playable. It is also the only rule that makes the other two ships matter
before the start, and it does that better than combat does.

The lap schedule fix — 3×40s, 2×60s, 1×120s, 1×150s — is the most phone-aware
line in the document. Four races of two minutes is a season I finish on a train.

## What does not

**The gravity number contradicts its own sentence.** 1 health per 30 ticks at
30 ticks a second is 1 per second. 60 crew health is 60 seconds of hard burn,
not "two minutes." A humanoid dies halfway through a two-minute race on full
burn. Either the drain is 1 per 60 ticks or the sentence is wrong. As written,
humanoid is unbuildable at high thrust and the crew choice collapses.

**The Long Line's headline reward does not exist.** Margin points go only to
"anyone who did not win." Winning with the Long Line declared doubles a bonus
of zero. The declared gamble pays +50 credits on a win and −2 points on a
third. Nobody declares that.

**Money points away from racing.** Winning a heat pays 100. An uncontested dark
matter pool pays 150. The worked heat has me finishing third and leaving 181
credits richer, one point off the lead, pleased with myself. Two stages of that
and the correct strategy is to stop racing.

**Margin points flatten the podium.** 10/6/3 with +3/+2/+1 means a close third
scores 6 — exactly a clean second — and a close second scores 9 against a win's 10. The gap between winning and nearly winning is 1 point; the gap between
close third and beaten third is 3. The season rewards not-being-lapped more
than it rewards winning.

**I cannot learn the lag from five taps.** Five orders a race, four races a
season: twenty samples of a curve I am supposed to internalise. And lag is
invisible — I tap, nothing happens, then something happens. The one rule the
whole design rests on is the one rule the screen does not show me.

## What I would add

A ghost marker. On tap, drop a translucent pip on the track where the order
will land. It moves down the ribbon as I throttle up. That turns the quadratic
from a stat into a picture and costs no taps.

A loss ledger on the results screen: three lines, seconds each. "Wide line
−1.4s. Two late orders −0.9s. Cutter −0.6s." Two minutes is not long enough to
diagnose myself; give me the diagnosis and I will buy the fix.

Give Handling its stat back: make the golden path's holdable band visibly wider
at Handling 8 than at Handling 3, and let a wide bend at speed throw a
low-Handling ship off it without a tap from me. Then Handling is something I
watch, not something I read.

Rake fires only from on the path. It answers the open question without adding
aiming, and it makes running wide mean giving up aggression.

## What I would cut first

Wanted status and the cops. It is a whole NPC subsystem — a cutter that joins
the heat, tails me at −6% speed, takes three hits to shake, doubling at wanted
4 — carrying one active and one pool. On a phone it puts a fourth ship on the
track that I did not choose and cannot plan around, and it is the one thing in
the race I would not be able to explain to myself afterward.

What I lose: the brake on aggression. Replace it with a cheaper rule — the
bounty pool halves for a ship that landed hits in the previous heat. Same "pays,
then charges rent," no fourth ship, no new art, and a bot can price it.
