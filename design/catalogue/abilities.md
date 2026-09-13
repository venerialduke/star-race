# Abilities

**They exist, and they fire themselves.** Abilities are granted by a
component's upgrade path, usually at level 3 — an engine grants a boost,
another grants three perfect bends, a collector shield starts keeping what hits
it. As of the build call on 2026-09-13 they fire **automatically**, on
proximity to a rival, on track conditions, on the moment being right. The
exception is an ability that is specifically a **placed** one: for those, the
player sets before the run where the charge is spent. Both kinds may exist;
`fires` says which an ability is.

## Schema

| Column   | What goes in it                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`     | short slug                                                                                                                                        |
| `name`   | what it is called                                                                                                                                 |
| `does`   | one plain sentence                                                                                                                                |
| `spends` | what it costs: charge, and anything else — crew wear, a slot                                                                                      |
| `wants`  | when it is worth firing: a bend, a straight, a rival in range, a pocket, a split                                                                  |
| `from`   | which component category grants it, if said: `engine`, `shields`, `weapons`, `collection`, `navigation` — and the level it arrives at             |
| `fires`  | `auto` — the ship judges it, from proximity, track conditions or the moment · `placed` — the player sets before the run where the charge is spent |
| `status` | `stub` · `seeded` · `cut`                                                                                                                         |

## Abilities

| id          | name                | does                                                                                                                                                                                                   | spends                                                  | wants                         | from                                            | fires | status |
| ----------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ----------------------------- | ----------------------------------------------- | ----- | ------ |
| boost       | Boost               | A burst of speed. The speed engine's version costs no gravity while it runs; the dark matter engine's leaves a small black hole behind it, which throws ships without a dark matter engine off course. | charge                                                  | a straight                    | engine — speed engine L3, dark matter engine L2 | auto  | seeded |
| three-bends | Three perfect bends | The next three bends are taken perfectly at top speed, and a bend reached within three seconds of the last pays extra speed — again on the third if it too comes in time.                              | charge                                                  | a run of bends close together | engine — handling engine L3                     | auto  | auto   | seeded |
| capture     | Capture             | A weapon or moving fixture that hits the ship at full shields is kept, and sells for credits when the race ends.                                                                                       | nothing said; storage scales with total shield capacity | a rival who shoots at you     | shields — collector shield L3                   | auto  | seeded |
| teleport    | Teleport            | Jump to a different split of the sector you are in.                                                                                                                                                    | charge                                                  | a split                       |                                                 |       | stub   |

## Notes

**2026-09-13.** Round 7 names four example abilities — Brace, Rake, Burn,
Scoop — as examples, not a fixed set. They are not in these notes and are left
off this table until the owner names them. Boost and Teleport are the two the
notes name, as examples of what placing a charge could do.

**2026-09-13, from dictating components.** Three abilities arrived attached to
parts rather than named on their own, so they are rows here and in
`ship-parts.md` both — the part says which component grants it, this table
says what it does. "Three perfect bends" and "Capture" are descriptions, not
dictated names: the owner named the effect, not the ability. Boost is one row
though two engines grant it, because what differs is the engine, not the move.
Note that the dark matter engine's boost creates a **fixture** mid-race, which
is the first ability that changes the track.

**2026-09-13, the build call.** Abilities fire automatically unless an ability
is specifically a placed one. Boost, the three-bend chain and Capture are all
`auto`: each has a condition the ship can read for itself — a straight ahead, a
run of bends, a hit landing at full shields. Teleport is left blank because
nothing says when it would fire, and it is the one candidate that reads like it
might want placing.
