# Ship parts

Components you install. A ship has a limited number of **slots**, and the
slots are the budget: you decide what to prioritise. A part moves the ship's
stats and may carry a downside; it is bought with credits and takes a slot.
Parts have **upgrades**, which appear in the shop once the part is fitted and
which can grow to take more than one slot.

Against [round 7](../rounds/round-07/sharpened.md), the stats a part can move
are **Thrust** (acceleration and top speed), **Handling** (holding speed at a
bend), **Nav** (how much of a split is visible, how well the ship follows a
goal), **Shields** and **Hull**. Reaction time is not bought; it comes from
speed and crew.

## Schema

| Column       | What goes in it                                                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`         | short slug, lowercase, hyphens                                                                                                                                                                         |
| `name`       | what the shop calls it                                                                                                                                                                                 |
| `category`   | one of the six: `engine` · `shields` (and defensive systems) · `crew` · `navigation` · `weapons` (and deployables) · `collection`                                                                      |
| `does`       | one plain sentence, mechanic not value                                                                                                                                                                 |
| `moves`      | arrows only, more arrows for more: `Thrust↑↑ Handling↓`. Things a part can move: `Thrust`, `Handling`, `Nav`, `Shields`, `Hull`, `gravity`, `charge` (how fast the path charges abilities), `reaction` |
| `slots`      | how many it takes, `1` unless said otherwise                                                                                                                                                           |
| `upgrades`   | what its upgrade path does, in a few words, and whether it grows in slots                                                                                                                              |
| `costs`      | credit tier as `$`, `$$`, `$$$`, plus any stated downside                                                                                                                                              |
| `pairs with` | what it is meant for: a corner plan, a crew type, a declaration, another part                                                                                                                          |
| `fights`     | what it works against or is bad with                                                                                                                                                                   |
| `status`     | `stub` — named only · `seeded` — has a sentence and arrows · `cut` — struck, kept for the record                                                                                                       |

Arrows, never numbers. `↑` is some, `↑↑` is a lot, `↑↑↑` is the reason to buy
it. The build stage turns arrows into values.

## Parts

| id  | name | category | does | moves | slots | upgrades | costs | pairs with | fights | status |
| --- | ---- | -------- | ---- | ----- | ----- | -------- | ----- | ---------- | ------ | ------ |

## Notes

**2026-09-13.** Six categories named: engines; shields and defensive systems;
crew; navigation systems; weapons and deployables systems; collection systems.
Crew is a category here, so crew types may end up as rows in this table with
`category: crew` rather than a table of their own — decide when dictating
crew. Collectors likewise (`category: collection`). The open item in the notes
is the one this table is for: an initial set of options for each category.
