# Abilities

Charged moves. Golden-path time charges the ship; an ability spends charge.
Round 7 has them fire on their own when the crew judges the moment. The
newest notes float a different model — see `mechanics-notes.md` — where the
player picks _where on the course_ a charge is spent, before the run. Either
way, this table is the list of what an ability can be.

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
| teleport | Teleport | Jump to a different route of the sector you are in. | charge | a split    |      | stub   |

## Notes

**2026-09-13.** Round 7 names four example abilities — Brace, Rake, Burn,
Scoop — as examples, not a fixed set. They are not in these notes and are left
off this table until the owner names them. Boost and Teleport are the two the
notes name, as examples of what placing a charge could do.
