# Notes: The rules reader

## Does the seed survive

Yes, and it is sharper. Every system in the notes is here with a number on it,
and every departure is declared out loud rather than smuggled in. One thing has
genuinely changed, though, and it should be named: in the notes, reaction time
is the _ship's_ — "swinging wide puts your ship in danger" — and handling is what
keeps the hull on the golden path. In this design reaction time is the _player's
thumb_. That is a substitution, not a sharpening. It is a good substitution and
"What needs your call" admits it, but the owner should answer that question
knowing it is the one place the words stayed and the referent moved.

## What works

The lag formula is the best thing here because it is one line and it is
checkable: `lag = 8 + 30·(v/vmax)² − 2·Handling − 1·Nav`, floor 6. With average
parts (H5/N5) it sits on the floor until 66% throttle and reaches 23 ticks flat
out. That is a rule a bot can sweep in an afternoon, and the floor of 6 doing
the work at low speed is correct — you want the tradeoff to be invisible until
the player buys into it.

Holding total race time near 120 seconds while laps drop 3→2→1→1 quietly fixes
something the notes did not see. At 1 energy per 10 ticks, a clean 120-second
race banks 360 energy no matter which stage it is, so two 60-cost actives always
give about six taps. The tap budget is stage-invariant by construction. That is
a real piece of design, not a patch.

The shield deflect threshold — above 30 of 60 you keep your speed, below it you
lose a second — is exactly the right shape: one number, one comparison, no state.

Margin points do replace the randomness the notes asked for, and 3+3=6 for a
close third against 3 for a beaten one is the arithmetic the notes described.

## What does not

**The gravity arithmetic is wrong by 2×.** 1 crew health per 30 ticks at 30
ticks a second is 2 health a second. Two minutes of hard burn is 3600 ticks and
**120 damage**, not the 60 the text claims. One minute kills a humanoid crew.

Worse, the number that decides whether this system exists is missing. Gravity
keys off _acceleration above 60% of max_, not speed. A ship at top speed is not
accelerating. Nobody says what fraction of a lap a ship spends burning. If it is
25%, a humanoid loses 60 over a race and dies exactly at the line; if it is 10%,
crew death never happens; if it is 50%, humanoids are unplayable. Measure that
fraction first and set the rate from it.

**`vmax` is never defined and the answer changes the game.** If it is the ship's
own top speed, then flat throttle is always `v/vmax = 1` and a Thrust 1 ship
answers exactly as late as a Thrust 10 ship — the seed's first line dies. It has
to be a course-global constant. Say so.

**The worked heat does not reproduce from the rules.** Thrust 8 / Handling 4 /
Nav 3 gives 16 ticks at flat throttle under a global `vmax` and 27 under a
ship-local one. The text says 20. And "96 from a dark matter pool nobody else
contested" — an uncontested share of a 150 pool is 150.

**Long Line's upside is zero.** Margin points go to "anyone who did not win", so
"win with it declared and your margin points double" doubles nothing. As written
you risk −2 points for +50 credits.

**The junctions run out.** Four are sealed, two open per stage, and stages 2, 3
and 4 need six.

**Shaking a cutter costs more wanted than earned it.** Three hits at wanted 2
takes you to 5, past the wanted-4 second cutter. There is no exit.

**Handling is squeezed out.** Nav buys 1 tick, plus route planning, plus band
width, plus crew-death insurance. Handling buys 2 ticks and band width. Unless a
Handling point is worth more than a Nav point's three extra jobs, nobody buys it.

**"Nav plans a better route, optimizing gravity assists" is five rules in one
clause** and the only system here with no number. It is a pathfinder.

## What I would add

Collapse Nav's planning into one tickable line: corner-entry speed cap =
`(0.55 + 0.035·Nav)·vmax`. That is the whole of "plans a better line", it is one
comparison per bend, and a bot can price it against Thrust.

Score margin against a fixed par time for the course, not the heat winner.
Right now a slow heat pays everyone in it, and with 6 players in 2 heats at
stage 3 the points are not comparable across heats.

Write the tick order down — orders resolve, hazards apply, damage, then pool
accrual — and give "nearest rival" a tiebreak (lowest ship index). Determinism
dies in ties, not in dice.

State the build budget. Six stats 1–10, but Hull is also "100 points" and a
robot crew is "90 instead of 60", so the dials and the pools are two different
things wearing one name.

## What I would cut first

The solar pool. Every ship is already on the golden path for +12% speed and all
the energy in the game; paying them for it is a rebate, not a decision. Two
pools that pull opposite ways — dark matter off-path, bounty into contact — is
the whole tension. Give the third collector slot to something with a cost.

Second cut: wanted decaying "1 per stage" across a four-stage season. It is a
ratchet, not a cost. Decay 1 per heat or drop the decay and cap wanted at 4.
