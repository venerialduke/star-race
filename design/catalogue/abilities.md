# Abilities

**They exist; what is unresolved is who fires them.** Dictating components
settled the first half of the question: abilities are granted by a component's
upgrade path, usually at level 3 — an engine grants a boost, another grants
three perfect bends, a collector shield starts keeping what hits it. What is
still open is the trigger. Round 7 had the crew fire them when it judged the
moment; a later note had the player place where each charge is spent before
the run — two charges placed, a third that fires only if enough energy has
been collected by then. Nothing has decided between those.

## Schema

| Column   | What goes in it                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `id`     | short slug                                                                                                                            |
| `name`   | what it is called                                                                                                                     |
| `does`   | one plain sentence                                                                                                                    |
| `spends` | what it costs: charge, and anything else — crew wear, a slot                                                                          |
| `wants`  | when it is worth firing: a bend, a straight, a rival in range, a pocket, a split                                                      |
| `from`   | which component category grants it, if said: `engine`, `shields`, `weapons`, `collection`, `navigation` — and the level it arrives at |
| `status` | `stub` · `seeded` · `cut`                                                                                                             |

## Abilities

| id          | name                | does                                                                                                                                                                                                   | spends                                                  | wants                         | from                                            | status |
| ----------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------- | ----------------------------- | ----------------------------------------------- | ------ |
| boost       | Boost               | A burst of speed. The speed engine's version costs no gravity while it runs; the dark matter engine's leaves a small black hole behind it, which throws ships without a dark matter engine off course. | charge                                                  | a straight                    | engine — speed engine L3, dark matter engine L2 | seeded |
| three-bends | Three perfect bends | The next three bends are taken perfectly at top speed, and a bend reached within three seconds of the last pays extra speed — again on the third if it too comes in time.                              | charge                                                  | a run of bends close together | engine — handling engine L3                     | seeded |
| capture     | Capture             | A weapon or moving fixture that hits the ship at full shields is kept, and sells for credits when the race ends.                                                                                       | nothing said; storage scales with total shield capacity | a rival who shoots at you     | shields — collector shield L3                   | seeded |
| teleport    | Teleport            | Jump to a different split of the sector you are in.                                                                                                                                                    | charge                                                  | a split                       |                                                 | stub   |

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
