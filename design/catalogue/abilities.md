# Abilities

**Unresolved whether these exist.** The owner's notes say it is still open
whether some components have abilities that charge up during a race. Round 7
asserted them and had them fire on their own when the crew judged the moment;
that is no longer a settled mechanic. If they do exist, the notes' model is:
the player picks _where on the course_ each charge is spent, before the run —
two charges placed, a third set that fires only if enough energy has been
collected by then. This table is the list of what an ability could be, held
until the question is decided.

## Schema

| Column   | What goes in it                                                                              |
| -------- | -------------------------------------------------------------------------------------------- |
| `id`     | short slug                                                                                   |
| `name`   | what it is called                                                                            |
| `does`   | one plain sentence                                                                           |
| `spends` | what it costs: charge, and anything else — crew wear, a slot                                 |
| `wants`  | when it is worth firing: a bend, a straight, a rival in range, a pocket, a split             |
| `from`   | which component category grants it, if said: `engine`, `weapons`, `collection`, `navigation` |
| `status` | `stub` · `seeded` · `cut`                                                                    |

## Abilities

| id       | name     | does                                                | spends | wants      | from | status |
| -------- | -------- | --------------------------------------------------- | ------ | ---------- | ---- | ------ |
| boost    | Boost    | A burst of speed at a spot you pick.                | charge | a straight |      | stub   |
| teleport | Teleport | Jump to a different split of the sector you are in. | charge | a split    |      | stub   |

## Notes

**2026-09-13.** Round 7 names four example abilities — Brace, Rake, Burn,
Scoop — as examples, not a fixed set. They are not in these notes and are left
off this table until the owner names them. Boost and Teleport are the two the
notes name, as examples of what placing a charge could do.
