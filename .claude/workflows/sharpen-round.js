// A SHARPEN round: one seeded idea developed in place, then read by two
// people. Three agents, two phases, minutes rather than an hour.
//
//   Workflow sharpen-round, args: { round: 4 }
//
// Why this exists. The four-proposal round (framework-round.js, seed-round.js)
// is a DIVERGENCE machine: four agents are each told to pick a design and
// commit to it, so four lenses produce four different games and the
// synthesiser merges them into a fifth. That is the right shape when nobody
// knows what the game is. It is the wrong shape when the owner already has an
// idea and wants it tightened: round 3 turned 988 words of notes into 34,575
// words across five new frameworks, dropped two named systems outright, and
// took two hours.
//
// This workflow keeps the seed as the spine. One developer sharpens it in
// place — allowed to say what does not work and to propose additions, but
// never to replace the core principle or silently drop a named system. Two
// readers then mark it up: one plays it, one checks the rules. There is no
// synthesis (there is only one design), no scoreboard (there is nothing to
// compare), and no ledger table (there is no divergence to record).
//
// Writes design/rounds/round-NN/{sharpened.md,notes/*.md}. The caller writes
// round.json with kind:"sharpen" and renders the page.

export const meta = {
  name: 'sharpen-round',
  description:
    'A fast seeded round: one designer sharpens the owner idea in place, two readers mark it up',
  whenToUse:
    'When the owner has an idea and wants it made feasible and legible, not replaced',
  phases: [
    { title: 'Sharpen', detail: 'one designer develops the seed in place' },
    { title: 'Read', detail: 'two readers mark up the sharpened design' },
  ],
};

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
    return { round: number ? Number(number[1]) : undefined };
  }
  return {};
}
const parsedArgs = readArgs(args);

const round = Number(parsedArgs.round);
if (!Number.isInteger(round) || round < 1)
  throw new Error(
    `round must be a positive integer, got ${JSON.stringify(args)} (read as ${JSON.stringify(parsedArgs)})`,
  );
const pad = (n) => String(n).padStart(2, '0');
const dir = `design/rounds/round-${pad(round)}`;
// The seed may live in this round's folder or be inherited from the round that
// first introduced it — a sharpen pass often runs against an earlier seed.
const seed = parsedArgs.seed ?? `${dir}/seed.md`;
log(`Sharpen round ${round}, seeded from ${seed}`);

const budget = (words) => `
LENGTH. Aim for around ${words} words. That is a target, not a limit: do NOT count your words, do NOT re-read the file to trim it towards a number, and do NOT pad to reach one. Write it once and stop.

DEPTH. No mechanic needs to be fully specified. What is wanted is the feel of each system and how it meshes with the others — enough concrete numbers to make it arguable, not a rulebook. If pinning a detail down would take three paragraphs, state the intent in one sentence and move on.
`;

const CONTEXT = `
You are designing a game called Star Race: ships race a course, the player builds and tunes a ship between races, and the race itself runs on its own with at most a handful of taps from the player.

Read these before doing anything else, and treat them as the whole of your context:
  - ${seed}   — the owner's idea. THIS IS THE SPINE of the round.
  - ${dir}/BRIEF.md  — what this round is asking for, if the file exists.

HARD CONSTRAINT — this round does not inherit anything. There is an existing partial implementation of a game by this name in this repository. It is OUT OF SCOPE:
  - DO NOT read DESIGN.md, anything under src/, tests/, PLAN.md or BACKLOG.md.
  - DO NOT read design/BRIEF.md, design/LEDGER.md, design/PROCESS.md, or any earlier round folder.
  - DO NOT reason about that game's parts, actives, hazards, stages, garage or tuning values, nor any framework named in an earlier round.
  - Never write "the current sim", "the existing game" or "the slice". You are working from the owner's notes.

CONSTRAINTS THAT HOLD, as properties of the medium rather than mechanics:
  1. The simulation is deterministic. A race is a pure function of the course, the ships, the players' inputs and a seed. "Random" means drawn from the seeded generator, never unpredictable.
  2. The race advances on a fixed integer tick. No real time inside the simulation.
  3. One thumb, on a phone. The decisions are between races; a race is short enough to watch and asks for a handful of taps at most.
  4. Balance is measurable. Bots playing strategies against each other over hundreds of runs should be able to say whether choosing well pays.

Write in plain, direct prose. Short sentences. No hedging, no bullet-point soup, no headings beyond the ones asked for. Use concrete numbers — a number can be wrong and then fixed; "some" cannot. Never mention that you are an AI or an agent.
`;

const SHARPEN_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'A name for the design, 2-5 words' },
    headline: { type: 'string', description: 'The design in one sentence' },
    file: { type: 'string' },
    kept: {
      type: 'array',
      items: { type: 'string' },
      description: 'Named systems from the seed that survive, one line each',
    },
    flagged: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Named systems from the seed that do NOT work as written, one line each, with what is wrong. Never silently drop one.',
    },
    added: {
      type: 'array',
      items: { type: 'string' },
      description: 'Anything proposed that was not in the seed, one line each',
    },
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
  },
  required: ['title', 'headline', 'file', 'kept', 'flagged', 'added', 'questions'],
};

phase('Sharpen');
const sharpened = await agent(
  `${CONTEXT}
You are the designer. Your job is to SHARPEN the owner's idea, not to replace it.

That means: keep the core principle and the feel of the seed intact, make it a feasible game, tidy the systems so they mesh, fill in the numbers the notes leave blank, and present it so a reader can get the feel of it in a few minutes. The reader should finish your document and recognise their own idea, sharper.

What you MAY do:
  - Say plainly that part of the idea does not work, and why.
  - Propose an addition that makes the rest hold together.
  - Choose numbers, name things, and decide details the notes left open.
  - Cut a detail that is redundant once the rest is tightened.

What you MUST NOT do:
  - Replace the core principle with a different one, however clever.
  - Rename the seed's ideas into a new vocabulary. If the notes call it a golden path, it is a golden path.
  - SILENTLY DROP A NAMED SYSTEM. This is the specific failure to avoid. If a system in the seed does not survive, it goes in "What does not work" with a reason and a suggested replacement — never just absent. Every named system in the seed must appear somewhere in your document, kept, altered or flagged.

${budget('1,500')}
DIAGRAMS. Include TWO \`\`\`mermaid fenced blocks — the page renders these as pictures, and they are the fastest way for the owner to get the feel of the design. One should show the loop: what a player does, in order, and what feeds back into what. The other should show how the systems connect, or a state the ship moves through. Use \`flowchart TD\`/\`flowchart LR\` or \`stateDiagram-v2\`. Keep each under about twelve nodes so it reads on a phone, and label the edges.

Write ${dir}/sharpened.md with EXACTLY these headings, starting with a top-level "# <title>" line:
## The idea, in one paragraph
## The loop
## The systems
## How they connect
## A worked heat
## What does not work, and what I would do instead
## What I added
## What needs your call

"The systems" covers each thing the seed names — the ship, the course, the money, the season — in a short section each with the numbers that make it concrete. "How they connect" names the couplings as sentences of the form "because X, the player must Y". "A worked heat" walks one race and one decision between races, briefly, so the feel lands. "What does not work" is where every flagged system goes, with a reason and a suggested fix.

Return the title, the one-sentence headline, the file path, and four lists: what you kept, what you flagged as not working, what you added, and the calls that need the owner.`,
  { label: 'sharpen', phase: 'Sharpen', schema: SHARPEN_SCHEMA },
);
if (!sharpened) throw new Error('The sharpened design was not written.');
log(`Sharpened: ${sharpened.title}`);

const NOTE_SCHEMA = {
  type: 'object',
  properties: {
    lens: { type: 'string' },
    file: { type: 'string' },
    worksBest: { type: 'string', description: 'The single strongest thing, one line' },
    weakest: { type: 'string', description: 'The single weakest thing, one line' },
    wouldAdd: {
      type: 'array',
      items: { type: 'string' },
      description: 'Concrete suggestions, one line each',
    },
    seedIntact: {
      type: 'boolean',
      description: 'Does the core principle of the seed survive in this design?',
    },
  },
  required: ['lens', 'file', 'worksBest', 'weakest', 'wouldAdd', 'seedIntact'],
};

// Two readers, not three reviewers, and they do not score. A score out of 40
// is a comparison device and there is only one design here. What is wanted is
// what works, what does not, and what would help.
const READERS = [
  {
    slug: 'plays',
    lens: 'The player',
    brief:
      'You have played thousands of hours of build-and-watch games and you play on a phone, one thumb, in five-minute gaps. Judge it as a GAME and as a SCREEN at the same time: is there a plan worth making, does a heat produce a story, do the other ships matter, and can you understand why you lost in the time the race takes? Be hard on system count — say which thing you would cut first and what you would lose by cutting it.',
  },
  {
    slug: 'rules',
    lens: 'The rules reader',
    brief:
      'You have to turn this into deterministic rules on an integer tick. Judge whether each mechanic can actually be written down as a rule with numbers in it, whether the numbers given are coherent with each other, whether a bot harness could measure it, and whether anything described in one sentence secretly needs five rules. Check the worked heat arithmetic. You are NOT costing this against any existing codebase — there is none in scope.',
  },
];

phase('Read');
const notes = (
  await parallel(
    READERS.map(
      (r) => () =>
        agent(
          `${CONTEXT}
You are one of two readers. Your lens: ${r.brief}

Read ${sharpened.file} in full, then read ${seed} again and answer the question that matters most: **does the owner's original idea survive in this design, sharper — or has it been replaced by something else wearing its words?** Say so plainly either way.

Then mark the design up. Do not score it out of anything; there is nothing to compare it against. What is wanted is: what works, what does not, and what would help. Be concrete and be specific — name the rule, quote the number. A note that likes everything is useless.

Write ${dir}/notes/${r.slug}.md with a top-level "# Notes: ${r.lens}" line, then EXACTLY these headings:
## Does the seed survive
## What works
## What does not
## What I would add
## What I would cut first

${budget('700')}
Return your lens name, the file path, the single strongest thing, the single weakest thing, your concrete suggestions, and whether the seed's core principle survives.`,
          { label: `read:${r.slug}`, phase: 'Read', schema: NOTE_SCHEMA },
        ),
    ),
  )
).filter(Boolean);
log(`${notes.length} sets of notes written`);

return {
  round,
  dir,
  kind: 'sharpen',
  seed,
  sharpened,
  notes,
};
