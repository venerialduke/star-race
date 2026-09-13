# Ship parts

Components you install. A ship has a limited number of **slots**, and the
slots are the budget: you decide what to prioritise. A part moves the ship's
stats and may carry a downside; it is bought with credits and takes a slot.
Parts have **upgrades**, which appear in the shop once the part is fitted and
which can grow to take more than one slot.

**This replaces round 7's ship model.** Round 7 said a ship _is_ six parts —
Thrust, Handling, Navigation, Hull, Shields, Crew — one of each. The notes
supersede that: a ship is a **frame** plus whatever fills its **slots**, and
components come in six **categories** — engines, shields and defensive
systems, crew, navigation, weapons and deployables, collection. Thrust,
Handling, Hull and Shields are now **stats** that components move, not parts
you own one of; a build might carry two engines and no weapon. Reaction time
is still not bought; it comes from speed and crew.

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

| id                    | name                    | category   | does                                                                                                                                                                             | moves                       | slots               | upgrades                                                                                                                                                                                                                                                                                                                                            | costs | pairs with            | fights | status |
| --------------------- | ----------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------- | ------ | ------ |
| speed-engine          | Speed-focused engine    | engine     | Moderate acceleration and low handling.                                                                                                                                          | `Thrust↑ Handling↓`         | 1                   | **L2** accelerates harder again. **L3** harder again, and grants a **boost** ability that carries no gravity cost while it runs — neither crew nor ship feel it.                                                                                                                                                                                    |       |                       |        | seeded |
| handling-engine       | Handling-focused engine | engine     | Moderate handling and low acceleration.                                                                                                                                          | `Handling↑ Thrust↓`         | 1, 2 at L3          | **L2** improves handling, and accelerates a little better. **L3** takes a second slot, improves handling again, and grants an ability: the next three bends are taken perfectly at top speed, and if a bend is reached within three seconds of the last, extra speed is gained — then again on the third bend if it too comes within three seconds. |       |                       |        | seeded |
| balanced-engine       | Balanced engine         | engine     | Moderate acceleration and moderate handling.                                                                                                                                     | `Thrust↑ Handling↑`         | 1                   | **L2** improves both a little. **L3** improves both again and adds basic **inertia dampeners**, which reduce what gravity does to the crew and to the ship.                                                                                                                                                                                         |       |                       |        | seeded |
| general-shields       | General shields         | shields    | General defence, in three levels.                                                                                                                                                | `Shields↑`                  | 1                   | **L2**, **L3** more shielding.                                                                                                                                                                                                                                                                                                                      |       |                       |        | seeded |
| deflector-shields     | Deflector shields       | shields    | A chance to deflect a hazard away from the ship and into a nearby ship or another hazard.                                                                                        |                             | 1                   | Higher levels raise the chance.                                                                                                                                                                                                                                                                                                                     |       |                       |        | seeded |
| dark-matter-engine    | Dark matter engine      | engine     | Low acceleration and low handling, but drastically better speed and handling entering and leaving corners caused by or near a black hole, and no damage from black holes at all. | `Thrust↓ Handling↓`         | 1                   | **L2** accelerates slightly better and adds a **boost** ability. The boost leaves a small black hole behind it as a fixture, which throws ships without a dark matter engine a little off course. **L3** recharges the boost faster while you are collecting dark matter.                                                                           |       | dark matter collector |        | seeded |
| nav-system            | Navigation system       | navigation | Lets you select your direction at more splits.                                                                                                                                   | `Nav↑`                      | 1, 2 at L3          | **L2** reveals splits and sectors you have not seen — as the track grows, or as opponents add to it — and lets you set a direction on every split before the heat starts. **L3** takes a second slot and lets you re-select split directions at any lap completion or pit stop.                                                                     |       |                       |        | seeded |
| dark-matter-collector | Dark matter collector   | collection | Collects dark matter.                                                                                                                                                            |                             | 1, 2 at L3          | **L2** collects more. **L3** collects more again, takes a second slot, and lets you turn dark matter in for credits at any pit stop or lap start.                                                                                                                                                                                                   |       | dark matter engine    |        | seeded |
| solar-ion-collector   | Solar ion collector     | collection | Improves speed and handling while the ship is on the golden path.                                                                                                                | `Thrust↑ Handling↑` on path | 1, 2 at L3          | **L2** improves both again. **L3** also raises shields and ability recharge, and takes a second slot.                                                                                                                                                                                                                                               |       |                       |        | seeded |
| crew-scientists       | Human scientists        | crew       | Weak endurance, and upgrades cost less.                                                                                                                                          |                             | 1                   |                                                                                                                                                                                                                                                                                                                                                     |       |                       |        | seeded |
| crew-engineers        | Engineers               | crew       | Regular endurance; shields and abilities recharge faster.                                                                                                                        | `Shields↑ charge↑`          | 1                   |                                                                                                                                                                                                                                                                                                                                                     |       |                       |        | seeded |
| crew-mercenary        | Mercenaries             | crew       | Weapons systems do more damage and have more range.                                                                                                                              |                             | 1                   |                                                                                                                                                                                                                                                                                                                                                     |       | weapons               |        | seeded |
| crew-androids         | Androids                | crew       | Very strong endurance, and navigation systems work better.                                                                                                                       | `Nav↑`                      | 1                   |                                                                                                                                                                                                                                                                                                                                                     |       | navigation system     |        | seeded |
| crew-nanites          | Nanites                 | crew       | Strong endurance, and component expansion costs less.                                                                                                                            |                             | 1                   |                                                                                                                                                                                                                                                                                                                                                     |       |                       |        | seeded |
| missiles              | Missiles                | weapons    | One missile per lap, short range.                                                                                                                                                |                             | 1, 2 at L2, 3 at L3 | **L2** two missiles a lap at medium range, and takes a second slot. **L3** takes a third slot: three missiles at long range that recharge at each pit stop and lap finish.                                                                                                                                                                          |       | mercenaries           |        | seeded |
| gravity-bombs         | Gravity bombs           | weapons    | Deploys gravity mines over a small stretch of track; a mine sends a ship slightly off course.                                                                                    |                             | 1                   | **L2** lets you pre-select where the mines are deployed. **L3** gives three mine placements, set before the heat.                                                                                                                                                                                                                                   |       |                       |        | seeded |
| tractor-beam          | Tractor beam            | weapons    | Pushes a nearby ship or fixture slightly off course.                                                                                                                             |                             | 1                   | **L2** widens the range.                                                                                                                                                                                                                                                                                                                            |       |                       |        | seeded |

## Notes

**2026-09-13.** Six categories named: engines; shields and defensive systems;
crew; navigation systems; weapons and deployables systems; collection systems.
Crew is a category here, so crew types may end up as rows in this table with
`category: crew` rather than a table of their own — decide when dictating
crew. Collectors likewise (`category: collection`). The open item in the notes
is the one this table is for: an initial set of options for each category.

**2026-09-13, engines and the first shields.** Three engines dictated as a
triad — speed, handling, balanced — each with three levels, and two shields.
What was said and what was not:

- **Levels are the upgrade path.** Every engine was dictated level by level,
  so `does` holds level 1 and `upgrades` holds levels 2 and 3. The handling
  engine is the first part to grow a slot: one slot until level 3, two after.
- **Names are the dictated descriptions**, not shop names. "Speed focused",
  "handling focused", "balanced" and "general shields" are what was said;
  flavour names can replace them later without changing the rows.
- **Nothing was said about cost, pairings or what a part is bad with**, so
  those four columns are blank across all five rows.
- **General shields is the thinnest row**: "level 1, 2 and 3, general
  defence". It has no downside, no cost and nothing distinguishing it beyond
  being the plain option. Worth another sentence when convenient.
- **Deflector shields moves no stat that was named.** Its whole effect is the
  deflection chance, so `moves` is left blank rather than guessed.
- Two engine abilities arrive at level 3 — a boost, and the three-bend
  chain — and one engine grants inertia dampeners. All three are flagged in
  `mechanics-notes.md`, since where abilities come from is an open question.

**2026-09-13, navigation, collection, crew, weapons and a fourth engine.**
Eleven more rows, and four of the six categories now have options. What was
said and what was not:

- **Crew was dictated as parts**, five of them, with `category: crew`. That
  answers the question left open in the note above: crew are rows here, not a
  table of their own. `crew-types.md` is still listed as element 5 in the
  tracker — it may end up holding what endurance _means_ rather than a list of
  crews, or being cut.
- **Endurance is the crew's stat** and is graded weak → very strong across the
  five. It is not one of the things `moves` knows about, so it stays in `does`
  as a word until `ship-stats.md` gives it a home.
- **Three crew have no arrows** because what they change is not a ship stat:
  scientists and nanites move prices, mercenaries move weapon damage and
  range.
- **Slot growth is now common.** Four parts grow: navigation, both collectors
  and the missiles, which climb 1 → 2 → 3. `slots` carries the level it grows
  at.
- **Two things were said without a level attached.** The dark matter engine's
  boost "leaves a small black hole behind" — recorded against the boost, which
  arrives at level 2, though it was said while describing level 3. And the
  solar ion collector's "it takes 2 slots" follows the level 3 sentence, read
  the same way as the other parts that grow at level 3. Both are worth a
  confirming word.
- **Cost, pairings and fights are still blank** except where a part named
  another part: the dark matter engine and its collector, missiles and
  mercenaries, androids and the navigation system.
