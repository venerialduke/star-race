# Split anatomy

The pieces a split is made of. A **sector** is the stretch between two
checkpoints; a **split** is one path through it, and a sector may offer
several. A split is a chain of these pieces, and where the chain differs
between splits is what makes one faster, safer, or richer than another.

## Schema

| Column   | What goes in it                                                                                 |
| -------- | ----------------------------------------------------------------------------------------------- |
| `id`     | short slug                                                                                      |
| `name`   | what it is called                                                                               |
| `does`   | one plain sentence: what a ship does through it, what it asks of the ship                       |
| `tests`  | which stat or choice it puts under pressure: `Thrust`, `Handling`, `corner plan`, `Nav`, `crew` |
| `parts`  | the named pieces inside it, if it has any: `braking zone`, `apex`, `curb`                       |
| `space`  | the space-flavoured version, if one was said: a black hole standing in for banking              |
| `status` | `stub` · `seeded` · `cut`                                                                       |

## Types

| id           | name          | does                                                                                                                           | tests                 | parts                     | space                                                  | status |
| ------------ | ------------- | ------------------------------------------------------------------------------------------------------------------------------ | --------------------- | ------------------------- | ------------------------------------------------------ | ------ |
| straightaway | Straightaway  | A straight run; the ship accelerates toward top speed and nothing asks it to slow.                                             | Thrust                |                           |                                                        | seeded |
| corner       | Corner        | A bend with a braking zone, an apex and curbs; the ship arrives fast, has to be slow at the apex, and pays for the difference. | Handling, corner plan | braking zone, apex, curbs |                                                        | seeded |
| soft-bend    | Soft bend     | A gentler corner of lower degree; keeps a straightaway interesting without demanding a full brake.                             | Handling              |                           |                                                        | seeded |
| banked       | Banked corner | A corner that helps the ship hold its line through it.                                                                         | Handling              |                           | a black hole on one side of the corner to bank against | seeded |

## Notes

**2026-09-13.** The notes say not all corners need to be the same degree, and
that soft bends can make straightaways more interesting — so `soft-bend` is a
distinct type rather than a corner parameter, on the notes' own framing.
Curbs are named as a part of a corner but not what they do; the space
equivalents of braking zone, apex and curb are "may need" — not yet said.
