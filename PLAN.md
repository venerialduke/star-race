<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Star Race — project plan</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@300;400;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --bg: #101C36;
    --bg-2: #172749;
    --ink: #E9E4D6;
    --ink-soft: #B9B7AE;
    --amber: #F2A93B;
    --ice: #8CC3CB;
    --rule: #34497A;
    --code-bg: #0B152B;
    --max: 70ch;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  @media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font-family: "Sora", "Segoe UI", system-ui, sans-serif;
    font-weight: 300;
    font-size: 17px;
    line-height: 1.6;
  }
  a { color: var(--ice); }
  a:focus-visible, button:focus-visible { outline: 2px solid var(--amber); outline-offset: 3px; }

  .wrap { display: grid; grid-template-columns: 1fr; max-width: 1120px; margin: 0 auto; padding: 0 20px 96px; }
  @media (min-width: 960px) {
    .wrap { grid-template-columns: 220px minmax(0, 1fr); column-gap: 56px; }
    nav { position: sticky; top: 32px; align-self: start; }
  }
  nav { padding-top: 40px; font-size: 15px; }
  nav ol { list-style: none; margin: 0; padding: 0; border-left: 1px solid var(--rule); }
  nav li a { display: block; padding: 6px 0 6px 14px; color: var(--ink-soft); text-decoration: none; }
  nav li a:hover { color: var(--ink); }
  nav .who { color: var(--ink-soft); margin: 0 0 18px; padding-left: 14px; }

  main { max-width: var(--max); }
  h1 { font-weight: 700; font-size: clamp(38px, 6vw, 60px); line-height: 1.02; letter-spacing: -0.02em; margin: 40px 0 8px; }
  .dek { color: var(--ink-soft); font-size: 19px; margin: 0 0 32px; max-width: 56ch; }
  h2 { font-weight: 600; font-size: 28px; letter-spacing: -0.01em; margin: 72px 0 12px; padding-top: 16px; border-top: 1px solid var(--rule); }
  h3 { font-weight: 600; font-size: 18px; margin: 32px 0 6px; color: var(--amber); }
  p { margin: 0 0 16px; }
  ul, ol { padding-left: 22px; margin: 0 0 16px; }
  li { margin-bottom: 6px; }
  strong { font-weight: 600; color: #fff; }

  /* the one bold thing: the track */
  figure { margin: 0 0 8px; }
  figure svg { width: 100%; height: auto; display: block; }
  figcaption { font-size: 14px; color: var(--ink-soft); margin-top: 8px; }

  /* milestones are a real sequence, so they are numbered */
  .stages { counter-reset: stage; list-style: none; padding: 0; margin: 24px 0; }
  .stages li { counter-increment: stage; display: grid; grid-template-columns: 56px 1fr; gap: 12px; padding: 18px 0; border-top: 1px solid var(--rule); margin: 0; }
  .stages li::before { content: "S" counter(stage); font-weight: 700; font-size: 26px; color: var(--amber); line-height: 1.1; }
  .stages li:last-child { border-bottom: 1px solid var(--rule); }
  .stages h4 { margin: 2px 0 4px; font-size: 18px; font-weight: 600; }
  .stages .done { color: var(--ice); margin: 6px 0 0; font-size: 15px; }

  pre, code { font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace; font-size: 14.5px; }
  code { background: var(--code-bg); padding: 1px 6px; border-radius: 4px; color: var(--ice); }
  pre { background: var(--code-bg); border: 1px solid var(--rule); border-radius: 6px; padding: 16px 18px; overflow-x: auto; line-height: 1.5; margin: 12px 0 20px; }
  pre code { background: none; padding: 0; color: var(--ink); }
  pre .c { color: var(--ink-soft); }

  table { border-collapse: collapse; width: 100%; margin: 12px 0 24px; font-size: 15.5px; }
  th, td { text-align: left; padding: 10px 12px 10px 0; border-bottom: 1px solid var(--rule); vertical-align: top; }
  th { font-weight: 600; color: #fff; }

  .note { border-left: 3px solid var(--amber); padding: 6px 0 6px 18px; margin: 20px 0; color: var(--ink); background: linear-gradient(90deg, var(--bg-2), transparent 70%); }
  .note p:last-child { margin-bottom: 0; }

  details { border: 1px solid var(--rule); border-radius: 6px; padding: 0 16px; margin: 0 0 12px; background: var(--bg-2); }
  summary { cursor: pointer; padding: 12px 0; font-weight: 600; }
  details[open] summary { border-bottom: 1px solid var(--rule); margin-bottom: 12px; }
  details pre { margin-top: 0; }
</style>
</head>
<body>
<div class="wrap">

<nav aria-label="Sections">
  <p class="who">Plan for Alex, September 2026.<br>Handoff target: Claude Code.</p>
  <ol>
    <li><a href="#vision">The game</a></li>
    <li><a href="#goal">Short-term goal</a></li>
    <li><a href="#workflow">Workflow and structure</a></li>
    <li><a href="#remote">Checking in from your phone</a></li>
    <li><a href="#agents">Building and using agents</a></li>
    <li><a href="#handoff">First prompt for Claude Code</a></li>
  </ol>
</nav>

<main>

<h1>Star Race</h1>
<p class="dek">Auto-chess meets racing. You build the ship between stages; the ship flies the course; you spend the run making a handful of split-second calls.</p>

<figure>
<svg viewBox="0 0 700 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="A race track curving through a star system past a planet, an asteroid field, a gamma-ray burst and a black hole, split into three stages">
  <defs>
    <radialGradient id="hole" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#000"/>
      <stop offset="0.55" stop-color="#000"/>
      <stop offset="0.7" stop-color="#F2A93B" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#F2A93B" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="star" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#FFF6DD"/>
      <stop offset="0.5" stop-color="#F2A93B"/>
      <stop offset="1" stop-color="#F2A93B" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <!-- faint starfield -->
  <g fill="#E9E4D6" opacity="0.45">
    <circle cx="40" cy="30" r="1"/><circle cx="120" cy="260" r="1.2"/><circle cx="210" cy="60" r="0.8"/>
    <circle cx="330" cy="280" r="1"/><circle cx="470" cy="40" r="1.1"/><circle cx="560" cy="250" r="0.9"/>
    <circle cx="640" cy="90" r="1"/><circle cx="380" cy="20" r="0.8"/><circle cx="90" cy="150" r="0.7"/>
    <circle cx="690" cy="200" r="1"/><circle cx="260" cy="200" r="0.7"/><circle cx="600" cy="160" r="0.8"/>
  </g>
  <!-- the sun -->
  <circle cx="350" cy="150" r="36" fill="url(#star)"/>
  <circle cx="350" cy="150" r="14" fill="#FFF6DD"/>
  <!-- orbits -->
  <g fill="none" stroke="#34497A" stroke-width="1">
    <ellipse cx="350" cy="150" rx="120" ry="70"/>
    <ellipse cx="350" cy="150" rx="230" ry="120"/>
  </g>
  <!-- planet with ring -->
  <ellipse cx="180" cy="110" rx="26" ry="7" fill="none" stroke="#8CC3CB" stroke-width="1.5" transform="rotate(-20 180 110)"/>
  <circle cx="180" cy="110" r="13" fill="#8CC3CB"/>
  <!-- asteroid field -->
  <g fill="#B9B7AE">
    <circle cx="430" cy="60" r="3"/><circle cx="447" cy="72" r="2"/><circle cx="462" cy="55" r="2.6"/>
    <circle cx="478" cy="70" r="1.8"/><circle cx="440" cy="90" r="2.2"/><circle cx="495" cy="58" r="2.4"/>
    <circle cx="470" cy="92" r="1.6"/><circle cx="510" cy="78" r="1.9"/>
  </g>
  <!-- gamma ray burst -->
  <g stroke="#F2A93B" stroke-width="2" opacity="0.9">
    <line x1="560" y1="230" x2="640" y2="140"/>
    <line x1="552" y1="222" x2="632" y2="132" opacity="0.5"/>
    <line x1="568" y1="238" x2="648" y2="148" opacity="0.5"/>
  </g>
  <!-- black hole -->
  <circle cx="120" cy="230" r="34" fill="url(#hole)"/>
  <!-- the track: a visible path you can read ahead of time -->
  <path id="track" d="M 30 260 C 90 190, 150 170, 200 140 S 300 70, 400 95 S 520 120, 580 190 S 650 250, 680 210"
        fill="none" stroke="#E9E4D6" stroke-width="2.5" stroke-dasharray="6 5"/>
  <!-- stage gates -->
  <g stroke="#F2A93B" stroke-width="3">
    <line x1="235" y1="102" x2="255" y2="140"/>
    <line x1="500" y1="90" x2="480" y2="130"/>
  </g>
  <!-- the ship -->
  <polygon points="52,246 38,254 42,246 38,238" fill="#F2A93B"/>
  <!-- labels -->
  <g font-family="Sora, system-ui, sans-serif" font-size="12" fill="#B9B7AE">
    <text x="140" y="60">Ringed planet</text>
    <text x="418" y="46">Asteroid field</text>
    <text x="590" y="262">Gamma-ray burst</text>
    <text x="85" y="285">Black hole</text>
    <text x="30" y="20" fill="#F2A93B">Stage 1</text>
    <text x="280" y="20" fill="#F2A93B">Stage 2</text>
    <text x="530" y="20" fill="#F2A93B">Stage 3</text>
  </g>
</svg>
<figcaption>One star system, one visible track, three stages. Amber bars are stage gates: the race pauses there and you go back to the garage.</figcaption>
</figure>

<h2 id="vision">The game</h2>
<p>A run is one star system. The track is drawn through it before you start, so you can see the black hole in stage 3 and plan for it. Between stages you're in the <strong>garage</strong>, choosing parts that change speed, acceleration, shield capacity, heat tolerance and so on. During a stage the ship flies the track on its own; you have two or three <strong>active</strong> controls (raise shields, reroute power, dump heat) that you time against the hazards you saw coming.</p>
<p>The design bet is the same one auto-battlers make: the interesting decisions are between rounds, and the round itself should be watchable, legible and short. Everything below is built to protect that bet and to make the project a good vehicle for learning agents.</p>

<h3>Two rules that make agents useful</h3>
<ul>
  <li><strong>The simulation is pure and deterministic.</strong> A race is <code>simulate(track, shipBuild, playerInputs, seed) → outcome</code>. No rendering, no timers, no randomness outside the seed. Agents can run thousands of races in a test and tell you a build is broken before you ever open the game.</li>
  <li><strong>The race advances on a fixed integer tick.</strong> Speed, heat, shields and hazards all update per tick. You already know this pattern from the linker project; here it makes replay, tests and balance tuning trivial.</li>
</ul>

<h2 id="goal">Short-term goal</h2>
<p>Ship a <strong>vertical slice you can play on your phone from a hotel bed by the end of the trip.</strong> One system, three stages, six parts, two actives, four hazard types. Not balanced, not pretty, but a complete loop: build, race, build, race, build, race, see a result screen.</p>
<p>The success test is behavioural, not a feature count: <em>you play three runs and want to try a different build.</em> If that's true, the mechanic works and you widen. If it's false, the game is still tiny enough to change the mechanic.</p>

<ol class="stages">
  <li>
    <div>
      <h4>Something on the internet</h4>
      <p>Repo, Vite + TypeScript, Vitest, GitHub Actions deploying to Pages. A canvas with a dot moving along a spline. The point is to prove the whole pipeline, including you opening the URL on your phone, before any game exists.</p>
      <p class="done">Done when: the Pages URL shows a moving dot and a test passes in CI.</p>
    </div>
  </li>
  <li>
    <div>
      <h4>The simulation</h4>
      <p>The <code>sim/</code> module: track as a list of segments with hazards, ship stats, tick loop, hazard effects, actives with cooldowns, seeded RNG, a race outcome (finish time, damage taken, did you survive). Tests for every hazard and every part. No rendering changes yet.</p>
      <p class="done">Done when: a test runs 1,000 seeded races on three builds and prints a stats table.</p>
    </div>
  </li>
  <li>
    <div>
      <h4>Garage and stages</h4>
      <p>A between-stage screen offering three parts, a chosen build carried forward, three stages on one track, a results screen. Rendering shows the ship, the track ahead, hazard markers, and a heat/shield readout. Phone-sized, one-thumb.</p>
      <p class="done">Done when: you can finish a full run on your phone.</p>
    </div>
  </li>
  <li>
    <div>
      <h4>Actives and feel</h4>
      <p>Two actives with big tap targets and a visible cooldown. A slow-motion beat when a hazard is imminent so timing is fair on a phone. Telemetry logged to the console (later: a Pages-hosted JSON) so you can look at outcomes the way you'd look at a match dataset.</p>
      <p class="done">Done when: you've played three runs and have opinions.</p>
    </div>
  </li>
</ol>

<div class="note"><p><strong>Scope guard.</strong> Anything not in the list above goes into <code>DESIGN.md</code> under "Later" and stays there until S4 is done. Multiple systems, multiplayer, meta-progression, art passes, sound — all later.</p></div>

<h2 id="workflow">Workflow and project structure</h2>

<h3>Stack</h3>
<table>
  <tr><th>Piece</th><th>Choice</th><th>Why</th></tr>
  <tr><td>Language</td><td>TypeScript</td><td>Types are documentation agents can't drift from; catches the "no system may cache tile type" class of bug at compile time.</td></tr>
  <tr><td>Build</td><td>Vite</td><td>Zero-config, fast, and its <code>base</code> option handles the Pages subpath.</td></tr>
  <tr><td>Rendering</td><td>HTML Canvas 2D, no engine</td><td>The game is a dot on a path with overlays. An engine would be more to learn than the game itself.</td></tr>
  <tr><td>Tests</td><td>Vitest</td><td>Runs the pure sim headless. This is where agents earn their keep.</td></tr>
  <tr><td>Deploy</td><td>GitHub Actions → GitHub Pages</td><td>Every push to <code>main</code> is playable at a URL within a minute or two.</td></tr>
  <tr><td>Agents</td><td>Claude Code, worktrees, subagents</td><td>See the agents section.</td></tr>
</table>

<h3>Repository layout</h3>
<pre><code>star-race/
├── CLAUDE.md              <span class="c">how to work in this repo (agents read this first)</span>
├── DESIGN.md              <span class="c">the game: rules, parts, hazards, "Later" list</span>
├── BACKLOG.md             <span class="c">or GitHub Issues — one task per agent session</span>
├── .claude/
│   ├── settings.json      <span class="c">pre-approved commands, hooks</span>
│   └── agents/            <span class="c">subagent definitions (see below)</span>
├── .github/workflows/
│   ├── ci.yml             <span class="c">typecheck + test on every PR</span>
│   └── pages.yml          <span class="c">build + deploy main to Pages</span>
├── src/
│   ├── sim/               <span class="c">PURE. No DOM, no Date, no Math.random.</span>
│   │   ├── track.ts       <span class="c">segments, hazards, stage gates</span>
│   │   ├── ship.ts        <span class="c">stats, parts, build → derived stats</span>
│   │   ├── hazards.ts     <span class="c">one function per hazard type</span>
│   │   ├── actives.ts     <span class="c">shields, power reroute, cooldowns</span>
│   │   ├── race.ts        <span class="c">the tick loop; simulate()</span>
│   │   └── rng.ts         <span class="c">seeded RNG</span>
│   ├── render/            <span class="c">canvas drawing; reads sim state, never writes it</span>
│   ├── ui/                <span class="c">garage screen, results screen, HUD buttons</span>
│   └── main.ts            <span class="c">wires input → sim → render on a fixed timestep</span>
└── tests/
    ├── sim/               <span class="c">unit tests per hazard, part, active</span>
    └── balance.test.ts    <span class="c">runs N seeded races, asserts sanity bounds</span></code></pre>

<h3>The loop you'll run from the hotel</h3>
<ol>
  <li>You write or pick a backlog item. Small enough that one agent finishes it in one sitting: "add the asteroid-field hazard with tests", not "do stage 2".</li>
  <li>An agent takes it in its own worktree, works until tests pass, and opens a PR.</li>
  <li>CI runs typecheck and tests. You skim the PR diff and the agent's summary on your phone and merge, or send it back with one sentence.</li>
  <li>Pages redeploys. You open the URL and play. What you notice becomes the next backlog item.</li>
</ol>
<p>Keep <code>main</code> always playable. Nothing merges red. That single rule is what makes it safe to leave agents running while you're out.</p>

<h3>Conventions to write into CLAUDE.md</h3>
<ul>
  <li><code>src/sim</code> imports nothing from <code>render</code> or <code>ui</code>, and nothing nondeterministic. Enforce with an ESLint import rule so it's a build error, not a review comment.</li>
  <li>Every hazard and part has a test. A PR that adds one without the other is incomplete.</li>
  <li>Balance numbers live in one file, <code>src/sim/tuning.ts</code>, so tuning PRs are one-file diffs you can read on a phone.</li>
  <li>Commit messages describe the player-visible change first, the code change second.</li>
  <li>Update <code>DESIGN.md</code> in the same PR as any rule change. The doc is the source of truth, not the code.</li>
</ul>

<h2 id="remote">Checking in from your phone</h2>
<p>Your laptop stays in the room and does the work. Your phone is only a window into it. Two things to set up before you leave the room each day, then the tools themselves.</p>

<h3>Keep the laptop awake</h3>
<ul>
  <li>Plugged in, lid open or lid-close set to "do nothing" while on power. Disable sleep; screen off is fine.</li>
  <li>Hotel Wi-Fi captive portals often expire daily. Re-accept the portal in a browser before you leave. If you lose the session mid-day, it isn't the agent's fault; it reconnects when the laptop is back online.</li>
  <li>Sign into <code>gh auth login</code> once so agents can open PRs without you.</li>
</ul>

<h3>Claude Code Remote Control</h3>
<p>This is the built-in way to continue a local session from the Claude mobile app or a browser. Start it in the terminal, then leave.</p>
<pre><code><span class="c"># start a fresh, named session that's controllable remotely</span>
claude remote-control --name "S2 sim core"

<span class="c"># or turn it on inside a session you're already in</span>
/rc

<span class="c"># turn it on for every session so you never forget</span>
/config   <span class="c">→ Enable Remote Control for all sessions: true</span></code></pre>
<p>A QR code appears; scan it with the Claude app, or find the session by name in the app or at claude.ai/code. From the phone you can read what the agent is doing, answer its questions, approve tool calls it isn't pre-approved for, and give it the next task. The conversation stays in sync between phone and terminal.</p>

<h3>Dispatch and Agent View</h3>
<p><strong>Dispatch</strong> starts a new task from your phone that runs on the laptop, so you don't need a session already open. <strong>Agent View</strong> is one dashboard of every running session, which matters once you have two or three worktrees going. Both live alongside Remote Control in the Claude app; check <code>/help</code> in Claude Code for the current commands, as these are moving quickly.</p>

<h3>Orca, if you want more than one agent at once</h3>
<p>Orca is an open-source desktop app that runs several coding agents in parallel, each in its own git worktree, with terminals, diffs and GitHub integration in one place. Its phone app mirrors the desktop terminals and pings you when an agent goes idle. It's worth adding around S3, when you have independent tasks (a hazard, a garage screen, a CI fix) that can run simultaneously. Before then, Remote Control alone is enough and one fewer thing to learn.</p>

<h3>What "checking progress" looks like in practice</h3>
<table>
  <tr><th>You want to</th><th>Do this</th></tr>
  <tr><td>See if the agent is stuck</td><td>Open the session in the Claude app. If it's waiting on a question, answer it. If it's looping, say "stop, summarise where you are and what's blocking you."</td></tr>
  <tr><td>Review the work</td><td>Open the PR in the GitHub app. Read the agent's summary first, then the <code>tuning.ts</code> and test diffs. Merge from the phone.</td></tr>
  <tr><td>Play the latest</td><td>Open the Pages URL. Bookmark it to your home screen.</td></tr>
  <tr><td>Queue the next thing</td><td>Add a GitHub Issue from your phone with one paragraph. When you're back at the laptop, or via Dispatch, point an agent at it.</td></tr>
</table>

<h2 id="agents">Building and using agents</h2>
<p>You've used Claude Code as a single very capable pair. "Agents" adds three things on top: <strong>subagents</strong> with narrow jobs inside one session, <strong>parallel sessions</strong> in separate worktrees, and <strong>hooks</strong> that run automatically. The trick is not to set all of it up on day one. Add each when a specific pain appears.</p>

<h3>Level 1: one session, good instructions</h3>
<p>Most of the value is a strong <code>CLAUDE.md</code> and small, testable tasks. Write the task as an acceptance test: "Add a gamma-ray-burst hazard. Done when <code>tests/sim/hazards.test.ts</code> covers it, a shielded ship survives it, an unshielded one loses 40 percent hull, and <code>DESIGN.md</code> describes it." An agent given that will rarely wander.</p>
<p>Pre-approve the safe commands in <code>.claude/settings.json</code> so you're not tapping "allow" from your phone all day:</p>
<pre><code>{
  "permissions": {
    "allow": [
      "Bash(npm run *)", "Bash(npx vitest *)", "Bash(npx tsc *)",
      "Bash(git status)", "Bash(git diff *)", "Bash(git add *)", "Bash(git commit *)",
      "Bash(git push *)", "Bash(gh pr *)", "Bash(gh issue *)"
    ]
  },
  "hooks": {
    "PostToolUse": [{
      "matcher": "Edit|Write",
      "hooks": [{ "type": "command", "command": "npx prettier --write \"$CLAUDE_FILE_PATH\" 2>/dev/null || true" }]
    }]
  }
}</code></pre>
<p>Deliberately not on the list: <code>git push --force</code>, <code>rm -rf</code>, anything touching <code>main</code> directly. Those still prompt you.</p>

<h3>Level 2: subagents</h3>
<p>A subagent is a Markdown file in <code>.claude/agents/</code> with a description, an allowed tool list, and a system prompt. It runs in its own context and reports back, so the main session's context stays about the task. Create them with <code>/agents</code> or write the files yourself. Three that fit this project:</p>

<details>
<summary>sim-engineer: implements pure simulation changes</summary>
<pre><code>---
name: sim-engineer
description: Implements changes in src/sim with tests. Use for hazards, parts, actives, tick-loop work.
tools: Read, Edit, Write, Grep, Glob, Bash
---
You work only in src/sim and tests/sim. The simulation is pure and deterministic:
no DOM, no timers, no Math.random (use rng.ts), no imports from render or ui.
Every hazard, part or active you add gets a test in the same change.
Balance constants go in src/sim/tuning.ts, never inline.
Run `npx vitest run` before reporting done. Report: what changed, which tests
were added, and any DESIGN.md sentences that need updating.</code></pre>
</details>

<details>
<summary>balance-analyst: runs races and reports, never edits code</summary>
<pre><code>---
name: balance-analyst
description: Runs seeded race batches and reports stats. Use after any sim change to check for degenerate builds.
tools: Read, Bash, Grep, Glob
---
You are read-only on source. Use the balance harness (`npm run balance -- --races 1000`)
to simulate the standard builds against the current track. Report a table of
finish time, survival rate and damage per build. Flag anything that looks like
a dominant or useless part, and say which tuning.ts constant you'd adjust and why.
Do not make the change; the human decides balance.</code></pre>
</details>

<details>
<summary>deploy-checker: verifies the thing is actually playable</summary>
<pre><code>---
name: deploy-checker
description: Confirms a build compiles, tests pass, and the Pages build succeeds. Use before opening any PR.
tools: Read, Bash, Grep, Glob
---
Run `npx tsc --noEmit`, `npx vitest run`, and `npm run build`. Confirm dist/
contains index.html with the correct base path for GitHub Pages. If anything
fails, report the exact error and the file. Do not fix it yourself; return to
the main session with findings.</code></pre>
</details>

<p>You invoke them by name ("use the balance-analyst subagent on the current build") or let the main session pick them based on the description. The read-only ones are the easiest to trust and a good place to start. The analyst in particular is the agent version of something you already do at work: pull the data, tabulate it, say what it means, let the human decide.</p>

<h3>Level 3: parallel sessions in worktrees</h3>
<p>When two backlog items don't touch the same files, run them at once. Each session gets its own git worktree, so they can't step on each other's uncommitted changes, and each ends with its own PR.</p>
<pre><code><span class="c"># terminal 1</span>
claude --worktree hazard-asteroids --name "asteroids"
<span class="c"># terminal 2</span>
claude --worktree garage-screen --name "garage"</code></pre>
<p>Two habits keep this sane. First, only parallelise across module boundaries: one agent in <code>sim/</code>, one in <code>ui/</code>, never two in <code>sim/hazards.ts</code>. Second, merge frequently and small, so the rebase an agent has to do when its PR lands second is trivial. If you see merge conflicts appearing, your tasks are too big or too overlapping; that's the signal, not the agents misbehaving.</p>

<h3>Level 4: agent teams</h3>
<p>Claude Code can also coordinate several agents on one larger task with a lead that plans and delegates. Don't reach for it during the slice; it shines when a task genuinely decomposes (S3's garage, results, and HUD could be one team job) and you've already seen how single agents behave in this repo. Try it once at the end of the week as an experiment, on a task you'd be fine redoing.</p>

<h3>What to delegate and what to keep</h3>
<table>
  <tr><th>Agents do well</th><th>Keep for yourself</th></tr>
  <tr><td>Hazards, parts, actives with tests</td><td>Deciding what's fun</td></tr>
  <tr><td>CI, deploy, tooling fixes</td><td>Balance decisions (analyst proposes, you choose)</td></tr>
  <tr><td>Running and tabulating simulations</td><td>The three-runs playtest on your phone</td></tr>
  <tr><td>Rendering plumbing and HUD wiring</td><td>Writing the backlog items</td></tr>
  <tr><td>Keeping DESIGN.md in sync with code</td><td>Reviewing tuning.ts diffs</td></tr>
</table>

<div class="note"><p><strong>Learning goals for the week, written down so you can check them off:</strong> write a CLAUDE.md that prevents a class of mistake; author one subagent and see it get picked automatically; run two worktrees in parallel and merge both; approve a PR entirely from your phone; use Dispatch to start a task while away from the room. If you've done those five, the agent-learning goal is met regardless of how the game turns out.</p></div>

<h2 id="handoff">First prompt for Claude Code</h2>
<p>Paste this, alongside a copy of this page saved as <code>PLAN.md</code> in the repo root, into a fresh session in an empty <code>star-race</code> directory.</p>
<pre><code>Read PLAN.md fully. We are building the S1 milestone only.

1. Initialise a Vite + TypeScript project with Vitest and ESLint. Add an ESLint
   rule that forbids src/sim from importing render, ui, or anything browser-only.
2. Create CLAUDE.md from the conventions in PLAN.md, DESIGN.md with the game
   description and an empty "Later" section, and BACKLOG.md with the S2 tasks
   broken into single-session items.
3. Add .claude/settings.json with the permissions and hook from PLAN.md, and the
   three subagents from PLAN.md under .claude/agents/.
4. Add GitHub Actions: ci.yml (typecheck + test on PR) and pages.yml (build and
   deploy main to GitHub Pages). Set Vite's base to the repo name.
5. In src/, a canvas that draws a dot moving along a hard-coded spline on a
   fixed timestep, plus one trivial test in tests/ so CI is green.
6. Initialise git, create the GitHub repo with gh, push, and give me the Pages URL.

Stop and ask before doing anything not in this list. When done, tell me what
to verify on my phone.</code></pre>

</main>
</div>
</body>
</html>
