# Track augments

Things a player adds to the track itself: a new split through a sector, or a
whole new sector. Permanent or temporary. Only players in the same heat see
an augmented track. Round 7 called the split kind a _player split_ and its paths _routes_; the
owner's word is _augment_, and it covers both kinds.

Where augments come from is not yet decided: the shop, or a component that
grants one when upgraded far enough.

## Schema

| Column    | What goes in it                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------- |
| `id`      | short slug                                                                                        |
| `name`    | what it is called                                                                                 |
| `adds`    | `split` — a new path through an existing sector · `sector` — a new stretch with its own checkpoint |
| `does`    | one plain sentence: what the added piece is like and why you would want it                        |
| `lasts`   | `heat` · `season` · either                                                                        |
| `seen by` | who meets it: `same heat` unless said otherwise                                                   |
| `from`    | where you get it: `shop` · `component` · not yet said                                             |
| `status`  | `stub` · `seeded` · `cut`                                                                         |

## Augments

| id         | name         | adds   | does                                                                          | lasts  | seen by   | from | status |
| ---------- | ------------ | ------ | ----------------------------------------------------------------------------- | ------ | --------- | ---- | ------ |
| add-split  | Add a split  | split  | A new path through a sector you choose, where there was not one. | either | same heat |      | stub   |
| add-sector | Add a sector | sector | A whole new sector spliced into the loop, with its own checkpoint.            | either | same heat |      | stub   |

## Notes

**2026-09-13.** Round 7 has two named split augments — a _pocket split_ that
goes wide through a pocket and a _cut split_ that leaves the path and rejoins
early. Neither is in these notes; they are left off this table until the owner
names them again or cuts them.
