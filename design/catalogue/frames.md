# Frames

The starting kit. Before anything else, the player picks a frame, and a frame
comes with an engine, shields, and a crew already fitted. The ship starts with
four slots, so after choosing a frame there is one slot left and the first
shop visit is to fill it.

## Schema

| Column    | What goes in it                                          |
| --------- | -------------------------------------------------------- |
| `id`      | short slug                                               |
| `name`    | what the frame is called                                 |
| `engine`  | which engine it ships with, by part id or in words       |
| `shields` | which shields it ships with                              |
| `crew`    | `small human` or `small robot`, or another named crew    |
| `slots`   | how many slots it starts with, `4` unless said otherwise |
| `leans`   | arrows: what this frame is built toward, `Thrust↑ Hull↓` |
| `status`  | `stub` · `seeded` · `cut`                                |

## Frames

| id  | name | engine | shields | crew | slots | leans | status |
| --- | ---- | ------ | ------- | ---- | ----- | ----- | ------ |

## Notes

**2026-09-13.** From the notes: a frame guarantees one engine, one shields,
and a crew that is a small human or a small robot. Four slots to start. No
frames named yet — the notes describe the shape of a frame, not a list of
them. The choice of crew inside the frame may be the whole difference between
frames, or frames may differ in the engine and shields too; not said.
