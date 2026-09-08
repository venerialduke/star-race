// One SEEDED design round: propose, review, synthesise, critique — starting
// from a page of the owner's raw notes rather than from the game as built.
//
//   Workflow seed-round, args: { round: 3 }
//
// The difference from framework-round.js is what the agents are allowed to
// know. framework-round feeds DESIGN.md, src/sim and the previous round's
// synthesis on purpose: it is refining a design that exists. This workflow
// feeds none of them. It reads only the round's own seed.md, BRIEF.md and
// RUBRIC.md, and tells every agent plainly that the existing game is out of
// scope. A round run this way starts over from the notes.
//
// Writes design/rounds/round-NN/{proposals,reviews}/*.md, synthesis.md,
// critique.md and ledger-section.md. It does NOT append to design/LEDGER.md:
// the ledger is full of the prior rounds this one is meant not to inherit, so
// the section is written beside the round and merged by hand afterwards.

export const meta = {
  name: 'seed-round',
  description:
    'One seeded Star Race design round from the owner notes: four proposals, three reviews, a synthesis, a critique',
  whenToUse:
    'When the owner wants a design round that starts from a brainstorm rather than from the existing game',
  phases: [
    { title: 'Propose', detail: 'four frameworks, one cluster of the seed each' },
    { title: 'Review', detail: 'three reviewers score every proposal' },
    { title: 'Synthesise', detail: 'one recommended framework' },
    { title: 'Critique', detail: 'what the synthesis dodged' },
  ],
};

// Arguments arrive in whatever shape the caller managed: an object, a JSON
// string, or prose like "round 3 resume". Read all three and say plainly what
// was understood — a misread argument silently runs the wrong round.
function readArgs(raw) {
  if (raw && typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (text.startsWith('{')) {
      try {
        return JSON.parse(text);
      } catch {
        // Fall through to reading it as prose.
      }
    }
    const number = text.match(/(\d+)/);
    return {
      round: number ? Number(number[1]) : undefined,
      resume: /\bresume\b/i.test(text),
    };
  }
  return {};
}
const parsedArgs = readArgs(args);

const round = Number(parsedArgs.round ?? 3);
const resume = parsedArgs.resume === true;
if (!Number.isInteger(round) || round < 1)
  throw new Error(
    `round must be a positive integer, got ${JSON.stringify(args)} (read as ${JSON.stringify(parsedArgs)})`,
  );
const pad = (n) => String(n).padStart(2, '0');
const dir = `design/rounds/round-${pad(round)}`;
log(
  `Arguments ${JSON.stringify(args)} read as seeded round ${round}${resume ? ', resuming' : ''}`,
);

const SECTIONS = [
  '## Premise',
  '## The ship',
  '## The track',
  '## The economy',
  '## The season',
  '## How the systems connect',
  '## Other players',
  '## A worked run',
  '## What it keeps from the seed, and what it drops',
  '## What it needs from the owner',
  '## Risks',
];

// The whole point of this workflow is the negative space in this block. Every
// agent gets the seed and the round's own brief and rubric, and an explicit
// list of what not to read. Do not add DESIGN.md, src/ or earlier rounds here.
const CONTEXT = `
You are designing a game called Star Race: ships race a course, the player builds and tunes a ship between races, and the race itself runs on its own with at most a handful of taps from the player.

Read these three files before doing anything else, and treat them as the whole of your context:
  - ${dir}/seed.md    — the owner's raw brainstorm. THIS IS THE MATERIAL for the round.
  - ${dir}/BRIEF.md   — what this round is asking for, and the constraints that hold.
  - ${dir}/RUBRIC.md  — how proposals are scored.

HARD CONSTRAINT — this round does not inherit anything. There is an existing partial implementation of a game by this name in this repository. It is OUT OF SCOPE and you must not read, reference, reason about, or build on any of it:
  - DO NOT read DESIGN.md, anything under src/, tests/, PLAN.md or BACKLOG.md.
  - DO NOT read design/BRIEF.md, design/RUBRIC.md, design/LEDGER.md, design/PROCESS.md, or anything under design/rounds/round-01/ or design/rounds/round-02/.
  - DO NOT reason about, or build on, that game's parts, actives, hazards, stages, garage, rival ships or tuning values, nor the frameworks named "The Cut, Two Cards" or "Raise or Clear".
  - If you already know something about that implementation, set it aside. An idea that happens to coincide with one of its mechanics is fine on its own merits; an idea justified by "this is what the game already does" is not.
  - Never write "the current sim", "the existing game", "the slice", or "what survives from the slice". There is nothing to survive. You are designing from the notes.
The only files in this repository you should open are the three listed above and, later in the round, the proposals and reviews this round itself writes.

Write in plain, direct prose. Short sentences. No hedging, no bullet-point soup, no headers beyond the ones asked for. Use concrete numbers — how many heats, how long a lap takes in ticks, what a thing costs, how much a collector earns. A number can be wrong and then fixed; "some" cannot. Never mention that you are an AI or an agent.
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

// One lens per cluster of the seed. Each proposer leads with their cluster and
// is required to connect it to the other three — connecting them is the round.
const LENSES = [
  {
    slug: 'ship-first',
    lens: 'Lead with THE SHIP AS A MACHINE. The seed gives you speed trading against handling on a non-linear curve flavoured as time dilation; acceleration generating gravity that impairs what the crew can do; three defensive layers in hull, shields and crew; humanoid crews that react well and get lucky against robot crews that ignore gravity and take more punishment; and a navigation system that plans routes, uses gravity assists, improves handling and flies the ship home if the crew dies. Make the ship a machine with a personality the player builds and can feel. Then let the track, the economy and the season follow from it.',
  },
  {
    slug: 'track-first',
    lens: "Lead with THE TRACK. The seed gives you a golden path carrying energy, where every ship moves faster and collects the charge that powers abilities, so swinging wide is slow and dangerous; a course identical for every player at the start that grows longer each phase whatever anyone does, whose opening layout hints at how it might evolve without promising anything; player modifications that apply only in the modifying player's own races, so a rival meets your track when matched against you; and things placed on the track before a race starts. Make the course the thing players are really building against. Then let the ship, the economy and the season follow from it.",
  },
  {
    slug: 'economy-first',
    lens: 'Lead with THE ECONOMY. The seed gives you credits from winning heats; passive collectors such as solar and dark matter that generate income; an aggression route where damaging other ships slows them and pays bounties, at the cost of a rising wanted status that draws NPC space cops onto the track; and the rule that most of these routes are SHARED POOLS — the more ships in a heat chase the same route, the less each of them earns. Make the shared pool the centre: an income strategy whose value depends on how many rivals picked it. Then let the ship, the track and the season follow from it.',
  },
  {
    slug: 'season-first',
    lens: 'Lead with THE SEASON. The seed gives you three ships per heat, a heat of three laps, a track that grows each phase, and an elimination problem the owner explicitly called boring in its simple form: points per heat with a cutoff at certain stages. The wanted refinement is margin-sensitive scoring with some randomness, where losing narrowly earns meaningfully more than being dominated, so staying competitive in a defeat is rewarded and those margins compound into surviving an extra stage or two. Design the whole arc: field size, how many heats, matchmaking, escalation, the exact scoring rule, elimination and recovery. Then let the ship, the track and the economy follow from it.',
  },
];

// Rounds are append-only. A round that already has a synthesis is done. A round
// interrupted after its proposals were written can be finished with
// { resume: true }, which is finishing what was started, not overwriting it.
const PREFLIGHT_SCHEMA = {
  type: 'object',
  properties: {
    proposalsExist: { type: 'boolean' },
    synthesisExists: { type: 'boolean' },
    found: { type: 'array', items: { type: 'string' } },
  },
  required: ['proposalsExist', 'synthesisExists', 'found'],
};
const RESUME_SCHEMA = {
  type: 'object',
  properties: {
    proposals: { type: 'array', items: PROPOSAL_SCHEMA },
  },
  required: ['proposals'],
};

phase('Propose');
const preflight = await agent(
  `List the files under ${dir}/proposals and ${dir}/reviews, and check whether ${dir}/synthesis.md exists. Do not create or change anything, and do not read the contents of any file. Return proposalsExist=true if ANY .md file exists in either folder, synthesisExists=true if ${dir}/synthesis.md exists, and the list of what you found.`,
  { label: 'preflight', phase: 'Propose', schema: PREFLIGHT_SCHEMA, effort: 'low' },
);
if (preflight?.synthesisExists) {
  throw new Error(
    `${dir} already has a synthesis. Rounds are append-only: run round ${round + 1} instead.`,
  );
}
if (preflight?.proposalsExist && !resume) {
  throw new Error(
    `${dir} already holds proposals (${preflight.found.join(', ')}). Rounds are append-only: run round ${round + 1} instead, or pass { round: ${round}, resume: true } to finish this one.`,
  );
}

let proposals;
if (resume && preflight?.proposalsExist) {
  log(`Round ${round}: resuming from the proposals already on disk`);
  const recovered = await agent(
    `Read every .md file under ${dir}/proposals. For each one return its slug (the file name without .md), its title (the "# " line), a one-sentence pitch drawn from its Premise, and its path (${dir}/proposals/<slug>.md). Change nothing.`,
    {
      label: 'recover-proposals',
      phase: 'Propose',
      schema: RESUME_SCHEMA,
      effort: 'low',
    },
  );
  proposals = (recovered?.proposals ?? []).filter(Boolean);
} else {
  log(`Seeded round ${round}: four proposers`);
  proposals = (
    await parallel(
      LENSES.map(
        (l, i) => () =>
          agent(
            `${CONTEXT}
You are proposer ${i + 1} of 4. Your lens: ${l.lens}

The lens is where you start, not where you stop. The brief lists everything a proposal has to deliver and you deliver all of it — a reader who sees only your file must be able to picture the whole game. Be opinionated: pick one design and commit to it. The reviewers will merge; that is their job, not yours. Make it the game you would want to play on a phone for twenty minutes.

Your real task is not to restate the seed in tidier language. It is to make the seed into a system. That means three things: deciding the numbers the notes leave blank, cutting the ideas that do not survive contact with the rest, and above all CONNECTING what is currently four separate lists — a ship, a track, an economy, a season — so that a choice in one is felt in the others. Answer as many of the twelve open questions in the brief as you can, with numbers, and be explicit about any you decide to leave open.

Write your framework to ${dir}/proposals/${l.slug}.md, aiming for roughly 3,000 words — a guide, not a limit. Write it once and stop: do NOT count the words, and do not re-read the file to trim it towards a target. A proposal a few hundred words over is fine and a round stalled on word counting is not. Use EXACTLY these headings in this order, starting with a top-level "# <title>" line:
${SECTIONS.join('\n')}

"How the systems connect" is the section this round exists for: name the specific couplings, at least four, each as a sentence of the form "because X, the player must Y". "A worked run" walks a named field from the first decision to the final standings, calling out the decisions and at least one moment where one player's choice changed another player's race. "What it keeps from the seed, and what it drops" is an honest accounting against seed.md — what you developed, what you altered, what you cut and why. "What it needs from the owner" lists the taste calls, as questions.

When the file is written, return its slug (${l.slug}), title, one-line pitch and path.`,
            { label: `propose:${l.slug}`, phase: 'Propose', schema: PROPOSAL_SCHEMA },
          ),
      ),
    )
  ).filter(Boolean);
}
log(`${proposals.length} proposals in hand`);
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

// The middle reviewer is a SYSTEMS designer, not an engineer costing work
// against a codebase. There is no codebase in scope this round, and asking for
// one would drag the existing game back in through the back door. The job it
// keeps is the rigour: rules that can actually be written down, numbers that
// are coherent, scope that is not being hidden.
const REVIEWERS = [
  {
    slug: 'fun',
    lens: 'You have played thousands of hours of build-and-watch games — auto-battlers, team builders, roguelike deckbuilders — and you know exactly why each one is fun and where each one goes stale. Judge these as GAMES: the fantasy of building a ship, the tension between races, the moment a plan comes together, whether the other two ships in your heat matter at all. Weight criteria 1 to 4 most.',
  },
  {
    slug: 'systems',
    lens: 'You are the systems designer who has to turn this into deterministic rules on an integer tick. Judge whether each mechanic can actually be written down as a rule with numbers in it, whether the numbers given are coherent with each other, whether the whole thing could be measured by bots playing strategies over hundreds of runs, and whether the scope is honest about how much system is really here. You are NOT costing this against an existing codebase — there is none in scope, so never reason about what code exists. Judge the design on its own weight and be blunt about hidden complexity: a mechanic described in a sentence that needs five rules to resolve is a mechanic that is hiding. Weight criteria 6 to 8 most.',
  },
  {
    slug: 'phone',
    lens: 'You play on a phone, one thumb, in five-minute gaps. Judge LEGIBILITY and PACE: can a player hold these systems in their head, understand why they lost a race in the time it takes to show it, and act between races without a manual. The seed asks for three defensive layers, a crew that can die separately from the ship, a gravity penalty, a shared-pool economy and a margin-sensitive ladder — be hard on whether that count is earned, and say which things you would cut first. Weight criteria 5 and 2 most.',
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

Score each on every criterion in ${dir}/RUBRIC.md, 1 to 5, with one line of justification per score. Then, for each proposal: name the best single idea, the fatal flaw if there is one, what in seed.md the proposal makes better, and what it drops and whether dropping it was right. Then recommend a merge: which proposal to build from, and what to graft onto it from the others.

Disagree with the proposals where they are wrong; a review that likes everything is useless. Score against seed.md and ${dir}/BRIEF.md only — never credit or penalise a proposal for resembling any existing implementation.

Write it to ${dir}/reviews/${r.slug}.md: a top-level "# Review: <lens name>" line, a scoreboard table (proposals as rows, criteria as columns, total), then "## <proposal title>" per proposal with the justifications, best idea, fatal flaw and the two seed questions, then "## Recommended merge".

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
You are the synthesiser. Read seed.md again, then every proposal and every review in full:
Proposals:
${proposalList}
Reviews:
${reviewList}

Write ${dir}/synthesis.md: the ONE framework this round recommends. It is a complete framework, not a comparison — a reader who sees only this file must be able to picture the whole game. Build from the proposal the reviewers favour, graft the best ideas from the others where they fit, and drop what does not work. Where reviewers disagree, decide, and say why.

Structure, with EXACTLY these headings:
# <title>
## In one paragraph
## The loop
## The ship
## The track
## The economy
## The season
## How the systems connect
## Other players
## A worked run
## What the seed gave us, and what we changed
## Where it came from
## What was rejected, and why
## Decisions for the owner
## Next round

"What the seed gave us, and what we changed" goes through seed.md and says, for each idea in it, whether the recommendation keeps it, alters it or drops it, and why — this is the owner's main check that the round did its job. "Where it came from" credits each proposal by name for what was taken. "Decisions for the owner" is a numbered list of the calls that are taste rather than measurement, each with one line on what hangs on it. "Next round" says what the next round should develop or challenge. Aim for roughly 3,500 words — a guide, not a limit. Write it once and stop: do NOT count the words, and do not re-read the file to trim it towards a target.

Then write a SEPARATE file, ${dir}/ledger-section.md: a "## Round ${round}" heading followed by a markdown table with columns Idea | From | Status | Why. One row per distinct idea any proposal put forward, including the ones you rejected — this is the record of everything considered, not only what won. "From" is the proposal slug, or "seed" for an idea that came from the owner's notes. Status is one of adopted, adopted in part, adopted in altered form, rejected, parked or open. Keep "Why" to one line. Expect 25 to 45 rows. Do NOT open or modify design/LEDGER.md — it belongs to earlier rounds and is out of scope.

Return the headline, the title, the synthesis file path, the base proposal's slug, the owner's decisions as questions, and the next-round focus.`,
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
You are the critic. Read ${synthesis.file}, then check it line by line against ${dir}/seed.md and ${dir}/BRIEF.md — especially the twelve open questions in the brief.

Your job is to find what the synthesis dodged, hand-waved, or contradicted: an open question it does not answer, a system asserted to be fun without a mechanism, a number that cannot be right or that contradicts another number in the same document, an idea from the seed that was silently dropped rather than argued away, a coupling claimed in "How the systems connect" that does not survive reading the rules it connects, an interaction claim that is really one player racing alone with extra steps, a scope estimate that hides how many rules a mechanic really needs. Check the worked run's arithmetic. Be specific and be fair: say what is missing, not that it is bad.

Write ${dir}/critique.md: "# Critique" then a numbered list of gaps, each with a one-line bold heading and two or three sentences, most important first. Then "## What the next round should be asked". Return the file path and the gap headings.`,
  { label: 'critique', phase: 'Critique', schema: CRITIQUE_SCHEMA },
);

return {
  round,
  dir,
  seeded: true,
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
