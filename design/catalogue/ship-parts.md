# Ship parts

What the player bolts on between heats. A part moves the ship's stats and may
carry a downside; it is bought with credits and takes a slot. Against
[round 7](../rounds/round-07/sharpened.md): the stats a part can move are
**Thrust** (acceleration and top speed), **Handling** (holding speed at a
bend), **Nav** (how much of a split is visible, how well the ship follows a
goal), **Shields** and **Hull**. Reaction time is not bought; it comes from
speed and crew. Gravity is not a stat but a part can make it worse.

**Status:** untouched · **Rows:** 0

## Schema

| Column       | What goes in it                                                                                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `id`         | short slug, lowercase, hyphens                                                                                                                                                                         |
| `name`       | what the shop calls it                                                                                                                                                                                 |
| `slot`       | where it goes — suggested: `drive`, `frame`, `nav`, `shield`, `collector`; add a slot if dictation needs one                                                                                           |
| `does`       | one plain sentence, mechanic not value                                                                                                                                                                 |
| `moves`      | arrows only, more arrows for more: `Thrust↑↑ Handling↓`. Things a part can move: `Thrust`, `Handling`, `Nav`, `Shields`, `Hull`, `gravity`, `charge` (how fast the path charges abilities), `reaction` |
| `costs`      | credit tier as `$`, `$$`, `$$$`, plus any stated downside in words                                                                                                                                     |
| `pairs with` | what it is meant for: a corner plan (`Charge`), a crew type (`robot`), a declaration (`Long Line`), a nav goal, another part                                                                           |
| `fights`     | what it works against or is bad with                                                                                                                                                                   |
| `unlocks`    | the phase it becomes available, `1`, `2`, `3`… — blank if not said                                                                                                                                     |
| `status`     | `stub` — named only · `seeded` — has a sentence and arrows · `cut` — struck, kept for the record                                                                                                       |

Arrows, never numbers. `↑` is some, `↑↑` is a lot, `↑↑↑` is the reason to buy
it. The build stage turns arrows into values.

## Parts

| id  | name | slot | does | moves | costs | pairs with | fights | unlocks | status |
| --- | ---- | ---- | ---- | ----- | ----- | ---------- | ------ | ------- | ------ |

## Notes

Anything said about parts that does not fit a column goes here, dated. Slot
rules ("a ship has one drive and up to two frames"), how many parts a ship
carries, whether parts can be sold back, what the shop shows at a pit stop
versus between heats — these are the kind of thing that lands here first and
becomes a column or a parameter later.
