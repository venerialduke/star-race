# Off-path features

What lives on a split besides the road: hazards that hurt or move the ship,
pockets that pay. Every split has a few properties — whether it is on the
golden path, whether it carries a resource or another energy type — and may
carry features from this table.

## Schema

| Column   | What goes in it                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`     | short slug                                                                                                                                                                            |
| `name`   | what it is called                                                                                                                                                                     |
| `kind`   | `hazard` — hurts or moves you · `pocket` — pays · `energy` — charges something                                                                                                        |
| `effect` | one or more of: `slows` · `speeds` · `damages` · `bounces` (off the track for a few seconds) · `pushes` (into another split of the sector, if you power into it) · `pays` · `charges` |
| `does`   | one plain sentence                                                                                                                                                                    |
| `answer` | what on the ship answers it: `Shields`, `Handling`, `Nav`, a corner plan, an ability                                                                                                  |
| `status` | `stub` · `seeded` · `cut`                                                                                                                                                             |

## Features

| id           | name         | kind   | effect                | does                                                                                                                                                                      | answer               | status |
| ------------ | ------------ | ------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- | ------ |
| gravity-well | Gravity well | hazard |                       |                                                                                                                                                                           |                      | stub   |
| solar-storm  | Solar storm  | hazard |                       |                                                                                                                                                                           |                      | stub   |
| black-hole   | Black hole   | hazard | `damages` · `bounces` | Terrain as much as hazard: a corner can be caused by, or sit near, a black hole. A ship built for them takes such a corner far faster and takes no damage from it at all. | a dark matter engine | seeded |

## Notes

**2026-09-13.** Two hazards named, gravity wells and solar storms, with no
effect stated for either. The kinds of effect are stated generally — things
that slow you, speed you up, bounce you off the track for a few seconds, or if
you power into them push you to another split of the sector — and are the
`effect` vocabulary above. Which hazard does which is not said. Whether a
split is on the golden path and whether it has a resource are properties of
the split, not features on it; they belong to whatever describes a split.

**2026-09-13, from dictating the dark matter engine.** Black holes arrived
sideways, as the thing that engine is built for, so the row above is what the
engine's description implies rather than a feature dictated on its own terms.
What is new about it is that a hazard can **shape the track** — "corners
caused by or near a black hole" — where every other feature sits on a split
that exists without it. A small one can also be created mid-race, by that
engine's boost, which makes it the only feature a player can put down while
racing.
