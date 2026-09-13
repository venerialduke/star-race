# Off-path features

What lives on a route besides the road: hazards that hurt or move the ship,
pockets that pay. Every route has a few properties — whether it is on the
golden path, whether it carries a resource or another energy type — and may
carry features from this table.

## Schema

| Column   | What goes in it                                                                                                                                                                       |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`     | short slug                                                                                                                                                                            |
| `name`   | what it is called                                                                                                                                                                     |
| `kind`   | `hazard` — hurts or moves you · `pocket` — pays · `energy` — charges something                                                                                                        |
| `effect` | one or more of: `slows` · `speeds` · `damages` · `bounces` (off the track for a few seconds) · `pushes` (into another route of the sector, if you power into it) · `pays` · `charges` |
| `does`   | one plain sentence                                                                                                                                                                    |
| `answer` | what on the ship answers it: `Shields`, `Handling`, `Nav`, a corner plan, an ability                                                                                                  |
| `status` | `stub` · `seeded` · `cut`                                                                                                                                                             |

## Features

| id           | name         | kind   | effect | does | answer | status |
| ------------ | ------------ | ------ | ------ | ---- | ------ | ------ |
| gravity-well | Gravity well | hazard |        |      |        | stub   |
| solar-storm  | Solar storm  | hazard |        |      |        | stub   |

## Notes

**2026-09-13.** Two hazards named, gravity wells and solar storms, with no
effect stated for either. The kinds of effect are stated generally — things
that slow you, speed you up, bounce you off the track for a few seconds, or if
you power into them push you to another split of the sector — and are the
`effect` vocabulary above. Which hazard does which is not said. Whether a
route is on the golden path and whether it has a resource are properties of
the route, not features on it; they belong to whatever describes a route.
