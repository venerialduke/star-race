# Star Race — Design Notes

*Brainstorm session, September 8, 2026*

---

## Summary

### Ship stats and systems

**Speed and handling.** Speed and handling trade off: the faster a ship goes, the less reaction time it has. This scales non-linearly (quadratic or steeper), flavored as time dilation.

**Acceleration and gravity.** Acceleration generates gravity, which impairs the crew's ability to perform other actions — the crew is struggling under G-forces.

**Three defensive layers.**
- *Hull strength* — closest to traditional "health."
- *Shields* — absorb damage and deflect objects.
- *Crew* — has its own health. If the crew dies, the ship survives; whether it finishes the race depends on the navigation system.

**Crew types.**
- *Humanoid* — better at reacting to unexpected events; more random luck outcomes.
- *Robot* — unaffected by gravity; more health.

**Navigation system.** A better nav system plans better routes (optimizing acceleration, using gravity assists, minimizing damage), improves handling, and keeps the ship on course if the crew dies.

### Track

**Golden path.** Each track has a golden path carrying energy. All ships move faster on it and collect ability energy from it. Swinging wide is dangerous and slow. Navigation and handling help ships stay on the path.

**Evolution.** The track starts identical for every player and grows longer each phase, regardless of player action. The initial layout hints at how the track might evolve but gives no certainty.

**Player modification.** Players can modify the track as part of their build strategy. Mods apply only to the modifying player's races — if two players are matched, each encounters the other's mods.

**Pre-race placement.** Before a race starts, players can place things on the track if they have anything to place.

### Heats and competition

- Three players per heat.
- A heat is three laps of the track.

### Economy

- Winning a heat grants credits.
- *Collectors* (solar, dark matter) passively generate credits.
- *Aggression* — damaging other ships slows them and earns bounties, at the cost of rising "wanted status" that draws attention from NPC space cops on the track.
- Many economy routes are *shared pools*: the more ships in a heat pursue a route, the less each one earns from it.

### Eliminations

- Baseline: points awarded per heat, with point cutoffs at certain stages eliminating low scorers.
- Flagged as boring and inflexible on its own.
- Desired refinement: margin-sensitive scoring with some randomness. Losing narrowly earns slightly more than being dominated, so staying competitive in a loss is rewarded. Those margins can compound into surviving an extra stage or two.

---

## Original notes (transcript)

### Message 1

> Streaming some ideas for core mechanics and systems for space race. Just take notes and document for now:
>
> Ship stats, abilities, and environment:
>
> Speed and "handling" - the faster the shop goes, the less reaction time it has. This scales quadratically or non linearly because of time dilation.
>
> Acceleration creates gravity, which should have some impact, maybe on ships ability to use other actions, like the crew is struggling.
>
> Ships have hull strength, shields, and a crew with health. They effect overall ship differently. Hull strength obviously is closer to "health" in traditional games. Shields absorb damage, and deflect objects. Crew - of crew dies, the ship still survives. Whether or not it completes the race depends on its navigation system. Also, we can have humanoid crews vs robot crews. Robots are unaffected by gravity and have more health. Human crews have more capability to react to unexpected things, and have more random luck outcomes.
>
> Economy: Winning a great gives credits. You can also get different "collectors", like solar or dark matter, which can generate credits. Or you can have things that try to damage other ships, slowing them down and claiming "bounties", at the cost of more "wanted stasus" where track npc space cops focus on you. A lot of these economy routes are "shared", the more all ships in a heat did them, the less each would get.
>
> Navigating - good navigation system means your ship will plan a better route, optimizing acceleration, gravity assists, minimizing damage, and continue along course if crew dies. Better handling.
>
> Why handling is important - doing things like "swinging wide" put your ship in danger, slow you down, etc. The "golden path" of a track has energy on it and all ships move faster on it, and collect ability energy. So staying on that is important. Navigation, handling, etc help stay on it.

### Message 2

> Three track and heats.
>
> The track will start the same for each player. Over time, the track will expand. The initial track will give players ideas of the potential of how the track will evolve, but no certainty.
>
> Players can modify the track as part of their build strategy. But only for their races (if i match up against you, your track mods will be present).
>
> But even without player mods, the track will evolve and grow longer each phase.
>
> A heat is three laps of the track. Before the race starts, players can place things on the track if they have anything to place.

### Message 3

> I think we do three players per heat.
>
> Thinking about eliminations. The easy way to do it is a point system per heat. Certain stages have point cutoff, so lower scoring players will be eliminated. That's a little boring and inflexible. So some way to introduce some randomness, or slight delta in points. Like, you lost the heat, but not by much, so it's a little more points than getting dominated. Some incentive to not just lose outright. Losing but staying in it is marginally better, and those margins could add up and give you an extra stage or two.
