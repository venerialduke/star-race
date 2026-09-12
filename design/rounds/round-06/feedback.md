# Notes on Proposal (Set 3)

It's looking really good. We need to hone a few things, then we can start
getting more into the design.

The only main notes I have on the last round are:

Reviewers had issues with laps, heats, pit stops, etc. I think it's holding on
to older ideas of what these things are. So I'll break it down more
specifically:

## The track

The base/foundation is the track. The track has **checkpoints**, and the path
or paths between checkpoint A and B are called **sections**. Sections can have
different routes (a section can "split"), but the end goal is always checkpoint
X. Some sections may not have any splits. Certain checkpoints will also be
**pit stops**, where the player can make some purchase choices.

## Heats and laps

A **heat** consists of two laps of the track, against the same set of
opponents. There will always be a pit stop at the end of each lap. Pit stops
force all ships to "start" at the same time; but we'll keep track of total lap
time across each section (and show a little tracking bar at the bottom so
everyone knows who is leading/winning).

The time to show how ships move through sections between pit stops / lap
starts should be fast — 30 seconds at most.

## Phases and the season

The racing season is divided into **phases**, with multiple heats per phase.
The track will grow and change between phases (or when players purchase track
extensions/modifiers between heats). Phases are where eliminations happen (we
should be open to more frequent elimination moments though; maybe actually
they can happen between heats).
