# Economy flow

Every income, every cost, every shop, and when each one happens. This is
parameters rather than a catalogue: a short list, confirmed rather than
invented.

## Shops

What can be bought, and where. From the notes so far.

| id          | sells                                           | when                                           | status |
| ----------- | ----------------------------------------------- | ---------------------------------------------- | ------ |
| components  | ship parts, from a random selection             | after the frame is chosen; pit stops; lap ends | seeded |
| upgrades    | upgrades for a part already fitted              | once the part is fitted                        | seeded |
| capacity    | component slots                                 | not said                                       | stub   |
| augments    | track augments                                  | not said                                       | stub   |
| maintenance | repair of damage taken during parts of the race | likely; not said                               | stub   |

## Income

| id          | pays for                                                   | when                   | status           |
| ----------- | ---------------------------------------------------------- | ---------------------- | ---------------- |
| purse       | finish order in a heat                                     | heat end               | seeded (round 7) |
| pools       | time on path, time wide, damage dealt — shared, capped     | each pit stop, per lap | seeded (round 7) |
| interest    | credits held through a pit stop, to a cap                  | pit stop               | seeded (round 7) |
| pacing-lap  | your time on the pacing lap against the track's benchmarks | after the pacing lap   | seeded           |
| finish-slot | one extra component slot                                   | every race you finish  | seeded           |

## Notes

**2026-09-13.** The shops list is the notes' "shops (so far)": ship
components, component capacity, track augments, and probably maintenance. The
pacing-lap payout is against benchmarks for the track, not against other
players. The +1 slot per finished race is a reward, so it is income here
rather than a purchase.
