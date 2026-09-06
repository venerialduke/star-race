// One design round: propose, review, synthesise, critique.
//
//   Workflow framework-round, args: { round: 2 }
//
// Reads design/BRIEF.md, design/RUBRIC.md and the previous round's synthesis
// and feedback; writes design/rounds/round-NN/{proposals,reviews}/*.md,
// synthesis.md and critique.md. Returns the scoreboard and the open questions
// so the caller can write round.json and render the page. See design/PROCESS.md.

export const meta = {
  name: 'framework-round',
  description:
    'One Star Race design round: four proposals, three reviews, a synthesis, a critique',
  whenToUse: 'When the owner asks for the next framework round',
  phases: [
    { title: 'Propose', detail: 'four frameworks, one lens each' },
    { title: 'Review', detail: 'three reviewers score every proposal' },
    { title: 'Synthesise', detail: 'one recommended framework' },
    { title: 'Critique', detail: 'what the synthesis dodged' },
  ],
};

const round = Number(args?.round ?? 1);
if (!Number.isInteger(round) || round < 1)
  throw new Error(`round must be a positive integer, got ${args?.round}`);
const pad = (n) => String(n).padStart(2, '0');
const dir = `design/rounds/round-${pad(round)}`;
const prev = round > 1 ? `design/rounds/round-${pad(round - 1)}` : null;

const SECTIONS = [
  '## Premise',
  '## The loop',
  '## The build',
  '## The economy',
  '## Run health and elimination',
  '## Other players',
  '## A worked run',
  '## What it costs to build',
  '## What it needs from the owner',
  '## Risks',
];

const CONTEXT = `
You are working in the Star Race repo (auto-chess meets racing, see CLAUDE.md).
Read these before doing anything else:
  - design/BRIEF.md      — the question this round answers. Everything hangs off it.
  - design/RUBRIC.md     — how proposals are scored.
  - DESIGN.md            — the game as it stands today (the vertical slice).
  - src/sim/*.ts         — skim, so you know what actually exists: race.ts, run.ts, field.ts, ship.ts, hazards.ts, pilot.ts, garage.ts, rivals.ts, tuning.ts.
${
  prev
    ? `  - ${prev}/synthesis.md — last round's recommended framework.
  - ${prev}/feedback.md  — the owner's response to it, if the file exists. The owner's feedback outranks everything else here; build on it, do not relitigate it.
  - ${prev}/critique.md  — what last round left unaddressed.`
    : '  This is round 1: there is no previous round.'
}
Write in plain, direct prose. Short sentences. No hedging, no bullet-point soup, no headers beyond the ones asked for. Use concrete numbers (how many rounds, how much a thing costs, how long a race is) — a number can be wrong and fixed; "some" cannot. Never mention that you are an AI or an agent.
`;

const PROPOSAL_SCHEMA = {
  type: 'object',
  properties: {
    slug: { type: 'string', description: 'kebab-case, the file name without .md' },
    title: { type: 'string', description: 'A name for the framework, 2-5 words' },
    oneLiner: { type: 'string', description: 'The pitch in one sentence' },
    file: { type: 'string' },
  },
  required: ['slug', 'title', 'oneLiner', 'file'],
};

const LENSES = [
  {
    slug: 'economy-first',
    lens: 'Lead with the ECONOMY. Design the currency, what earns it, what it buys, why saving is ever right, and let the build, health and interaction systems follow from it. Think TFT gold, interest and streaks, but for racing.',
  },
  {
    slug: 'interaction-first',
    lens: 'Lead with OTHER PLAYERS. Start from the question "if ships never touch, how does my build change your race?" — pacing laps, seeding the track, visible builds, contested shops, counter-picks — and let the economy, build and health systems follow from it.',
  },
  {
    slug: 'run-first',
    lens: 'Lead with RUN STRUCTURE. Design the lobby, the number of rounds, escalation, run health and elimination, recovery from a bad round, and the arc from first decision to final standings — and let the build, economy and interaction systems follow from it.',
  },
  {
    slug: 'build-first',
    lens: 'Lead with the BUILD. Design what the player assembles: piece types, tags or families, synergies, archetypes, the moment a build comes online, what it means to commit — and let the economy, health and interaction systems follow from it.',
  },
];

// Rounds are append-only. Never write into a folder that already holds a
// round: the record of what was considered is the point of keeping them.
const PREFLIGHT_SCHEMA = {
  type: 'object',
  properties: {
    proposalsExist: { type: 'boolean' },
    found: { type: 'array', items: { type: 'string' } },
  },
  required: ['proposalsExist', 'found'],
};
phase('Propose');
const preflight = await agent(
  `List the files under ${dir}/proposals and ${dir}/reviews, and check whether ${dir}/synthesis.md exists. Do not create or change anything. Return proposalsExist=true if ANY .md file exists in either folder or synthesis.md exists, and the list of what you found.`,
  { label: 'preflight', phase: 'Propose', schema: PREFLIGHT_SCHEMA, effort: 'low' },
);
if (preflight?.proposalsExist) {
  throw new Error(
    `${dir} already holds a round (${preflight.found.join(', ')}). Rounds are append-only: run round ${round + 1} instead.`,
  );
}
log(`Round ${round}: four proposers`);
const proposals = (
  await parallel(
    LENSES.map(
      (l, i) => () =>
        agent(
          `${CONTEXT}
You are proposer ${i + 1} of 4. Your lens: ${l.lens}
The lens is where you start, not where you stop: the brief lists everything a proposal has to deliver, and you deliver all of it. Be opinionated. Pick one design and commit to it — the reviewers will merge, that is their job, not yours. Make it the game you would actually want to play on a phone for twenty minutes.

Write your framework to ${dir}/proposals/${l.slug}.md, 1,800 to 3,000 words, with EXACTLY these headings in this order, starting with a top-level "# <title>" line:
${SECTIONS.join('\n')}

"A worked run" walks eight players (or your number) from the first decision to the final standings, calling out the decisions and one moment where one player's choice changed another player's race. "What it costs to build" says which of the current sim files survive, which change, what is new, and guesses the number of one-session PRs. "What it needs from the owner" lists the taste calls, as questions.

When the file is written, return its slug (${l.slug}), title, one-line pitch and path.`,
          { label: `propose:${l.slug}`, phase: 'Propose', schema: PROPOSAL_SCHEMA },
        ),
    ),
  )
).filter(Boolean);
log(`${proposals.length} proposals written`);
if (proposals.length === 0) throw new Error('No proposals were written.');

const REVIEW_SCHEMA = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
    file: { type: 'string' },
    scores: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          slug: { type: 'string' },
          criteria: {
            type: 'object',
            properties: {
              buildFantasy: { type: 'integer', minimum: 1, maximum: 5 },
              tradeoffs: { type: 'integer', minimum: 1, maximum: 5 },
              interaction: { type: 'integer', minimum: 1, maximum: 5 },
              stakes: { type: 'integer', minimum: 1, maximum: 5 },
              legibility: { type: 'integer', minimum: 1, maximum: 5 },
              fit: { type: 'integer', minimum: 1, maximum: 5 },
              buildable: { type: 'integer', minimum: 1, maximum: 5 },
              measurable: { type: 'integer', minimum: 1, maximum: 5 },
            },
            required: [
              'buildFantasy',
              'tradeoffs',
              'interaction',
              'stakes',
              'legibility',
              'fit',
              'buildable',
              'measurable',
            ],
          },
          total: { type: 'integer' },
          bestIdea: { type: 'string' },
          fatalFlaw: { type: 'string', description: 'Empty string if none' },
        },
        required: ['slug', 'criteria', 'total', 'bestIdea', 'fatalFlaw'],
      },
    },
    recommendedBase: {
      type: 'string',
      description: 'slug of the proposal to build from',
    },
    grafts: {
      type: 'array',
      items: { type: 'string' },
      description: 'ideas to take from the others',
    },
  },
  required: ['lens', 'file', 'scores', 'recommendedBase', 'grafts'],
};

const REVIEWERS = [
  {
    slug: 'fun',
    lens: 'You have played thousands of hours of auto-battlers (TFT, Dota Auto Chess, Super Auto Pets, Backpack Battles) and you know exactly why each one is fun and where each one goes stale. Judge these as GAMES: the build fantasy, the tension between rounds, the moment a plan comes together, whether other players matter. Weight criteria 1 to 4 most.',
  },
  {
    slug: 'engineering',
    lens: 'You are the engineer who will build this in this repo. Judge FIT and COST: does it respect the pure sim and fixed tick, what survives from src/sim, what is new, how many one-session PRs the first playable version really is, and whether a bot harness could measure it. Weight criteria 6 to 8 most. Be blunt about hidden scope.',
  },
  {
    slug: 'phone',
    lens: 'You play on a phone, one thumb, in five-minute gaps. Judge LEGIBILITY and PACE: can a player hold the systems in their head, understand why they lost a round in the time it takes to show it, and act between rounds without a manual. Weight criteria 5 and 2 most. Punish system count.',
  },
];

phase('Review');
const proposalList = proposals
  .map((p) => `  - ${p.slug}: "${p.title}" — ${p.oneLiner} (${p.file})`)
  .join('\n');
const reviews = (
  await parallel(
    REVIEWERS.map(
      (r) => () =>
        agent(
          `${CONTEXT}
You are one of three reviewers. Your lens: ${r.lens}
Read every proposal in full:
${proposalList}

Score each on every criterion in design/RUBRIC.md, 1 to 5, with one line of justification per score. Then, for each proposal, name the best single idea and the fatal flaw if there is one. Then recommend a merge: which proposal to build from, and what to graft onto it from the others. Disagree with the proposals where they are wrong; a review that likes everything is useless.

Write it to ${dir}/reviews/${r.slug}.md: a top-level "# Review: <lens name>" line, a scoreboard table (proposals as rows, criteria as columns, total), then "## <proposal title>" per proposal with the justifications, best idea and fatal flaw, then "## Recommended merge".

Return your lens name, the file path, and the scores exactly as written in the file.`,
          { label: `review:${r.slug}`, phase: 'Review', schema: REVIEW_SCHEMA },
        ),
    ),
  )
).filter(Boolean);
log(`${reviews.length} reviews written`);

const SYNTHESIS_SCHEMA = {
  type: 'object',
  properties: {
    headline: {
      type: 'string',
      description: 'The recommended framework in one sentence',
    },
    title: {
      type: 'string',
      description: 'Name of the recommended framework, 2-5 words',
    },
    file: { type: 'string' },
    builtFrom: { type: 'string', description: 'slug of the base proposal' },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          why: { type: 'string', description: 'What hangs on the answer' },
        },
        required: ['question', 'why'],
      },
    },
    nextRound: { type: 'string', description: 'What the next round should focus on' },
  },
  required: ['headline', 'title', 'file', 'builtFrom', 'questions', 'nextRound'],
};

phase('Synthesise');
const reviewList = reviews
  .map((r) => `  - ${r.file} (recommends building from ${r.recommendedBase})`)
  .join('\n');
const synthesis = await agent(
  `${CONTEXT}
You are the synthesiser. Read every proposal and every review in full:
Proposals:
${proposalList}
Reviews:
${reviewList}

Write ${dir}/synthesis.md: the ONE framework this round recommends. It is a complete framework, not a comparison — a reader who sees only this file must be able to picture the whole game. Build from the proposal the reviewers favour, graft the best ideas from the others where they fit, and drop what does not. Where reviewers disagree, decide, and say why.

Structure, with EXACTLY these headings:
# <title>
## In one paragraph
## The loop
## The build
## The economy
## Run health and elimination
## Other players
## A worked run
## What it costs to build
## Where it came from
## What was rejected, and why
## Decisions for the owner
## Next round

"Where it came from" credits each proposal by name for what was taken. "Decisions for the owner" is a numbered list of the calls that are taste rather than measurement, each with one line on what hangs on it. "Next round" says what the next round of proposals should be asked to develop or challenge. 2,500 to 4,000 words.

Then APPEND a section to design/LEDGER.md (read it first; never edit anything above your section): "## Round ${round}" followed by a markdown table with columns Idea | From | Status | Why. One row per distinct idea any proposal put forward, including the ones you rejected — the ledger is the record of everything considered, not only what won. "From" is the proposal slug. Status is adopted, rejected, parked or open, as the ledger's header defines them. Keep "Why" to one line. Expect 20 to 40 rows.

Return the headline, the title, the file path, the base proposal's slug, the owner's decisions as questions, and the next-round focus.`,
  { label: 'synthesise', phase: 'Synthesise', schema: SYNTHESIS_SCHEMA },
);
if (!synthesis) throw new Error('The synthesis was not written.');

const CRITIQUE_SCHEMA = {
  type: 'object',
  properties: {
    file: { type: 'string' },
    gaps: { type: 'array', items: { type: 'string' }, description: 'One line each' },
  },
  required: ['file', 'gaps'],
};

phase('Critique');
const critique = await agent(
  `${CONTEXT}
You are the critic. Read ${synthesis.file}, then check it against design/BRIEF.md line by line${prev ? ` and against ${prev}/feedback.md if it exists` : ''}. Your job is to find what the synthesis dodged, hand-waved, or contradicted: a gap in the brief it does not answer, a system that is asserted to be fun without a mechanism, a number that cannot be right, a rule from "What survives from the slice" it bends without saying so, an interaction claim that is really PvE with extra steps, a cost estimate that hides scope. Be specific and be fair: say what is missing, not that it is bad.

Write ${dir}/critique.md: "# Critique" then a numbered list of gaps, each with a one-line heading and two or three sentences, most important first. Then "## What the next round should be asked". Return the file path and the gap headings.`,
  { label: 'critique', phase: 'Critique', schema: CRITIQUE_SCHEMA },
);

return {
  round,
  dir,
  proposals,
  reviews: reviews.map((r) => ({
    lens: r.lens,
    file: r.file,
    recommendedBase: r.recommendedBase,
    grafts: r.grafts,
    scores: r.scores,
  })),
  synthesis,
  critique,
};
