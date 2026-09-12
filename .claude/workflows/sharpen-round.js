// A SHARPEN round: one idea developed in place, then read by two people.
// Three agents, two phases, minutes rather than an hour.
//
//   Workflow sharpen-round, args: { round: 4 }
//   Workflow sharpen-round, args: { round: 5, base: 'design/rounds/round-04/sharpened.md',
//                                   notes: 'design/rounds/round-04/feedback.md' }
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
// Three inputs, in a strict hierarchy:
//
//   seed   the owner's original brainstorm. Always present. It is the GUARD:
//          every named system in it must be accounted for in the output —
//          kept, altered, or flagged — so nothing is quietly lost the way
//          navigation and the space cops were in round 3.
//   base   the design being iterated on, usually the previous sharpen round's
//          sharpened.md. Optional. When present it is the SPINE: the output
//          should read as the base with the notes worked in, same principle,
//          same vocabulary. When absent, the seed is the spine.
//   notes  the owner's feedback on the base. Optional. When present it LEADS:
//          where a note and the base disagree, the note wins, and the designer
//          says so rather than quietly picking a side.
//
// One designer applies the notes to the base under the guard of the seed. Two
// readers then mark the result up: one plays it, one checks the rules. There
// is no synthesis (there is only one design), no scoreboard (there is nothing
// to compare), and no ledger table (there is no divergence to record).
//
// Writes design/rounds/round-NN/{sharpened.md,notes/*.md}. The caller writes
// round.json with kind:"sharpen" and renders the page.

export const meta = {
  name: 'sharpen-round',
  description:
    'A fast seeded round: one designer sharpens the owner idea in place, two readers mark it up',
  whenToUse:
    'When the owner has an idea and wants it made feasible and legible, not replaced — or has feedback on the last sharpen round to work in',
  phases: [
    { title: 'Sharpen', detail: 'one designer develops the idea in place' },
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
const seed = parsedArgs.seed ?? `${dir}/seed.md`;
const base = parsedArgs.base ?? null;
const notes = parsedArgs.notes ?? null;
if (notes && !base) throw new Error('notes were given without a base to apply them to.');
log(
  `Sharpen round ${round}: seed ${seed}${base ? `, base ${base}` : ''}${notes ? `, notes ${notes}` : ''}`,
);

const budget = (words) => `
LENGTH. Aim for around ${words} words. That is a target, not a limit: do NOT count your words, do NOT re-read the file to trim it towards a number, and do NOT pad to reach one. Write it once and stop.

DEPTH. No mechanic needs to be fully specified. What is wanted is the feel of each system and how it meshes with the others. If pinning a detail down would take three paragraphs, state the intent in one sentence and move on.
`;

// The register the owner asked for after round 4: mechanics, not values.
// "Shields regenerate slowly" is the right level; a point value is worth
// writing only when the mechanic cannot be understood without it. A page of
// stat lines reads as a spreadsheet, not a game.
const REGISTER = `
REGISTER. Describe MECHANICS, not VALUES. "Shields regenerate slowly, faster when the ship is coasting" is the right sentence; "shields regenerate 2 points per tick" is not, unless the mechanic cannot be understood without the number. Say what a system does, what it costs, and what it pushes the player towards. Numbers are for the few places where a relationship only makes sense with one — a ratio, a count of laps, a number of taps. Keep those and drop the rest.

PLAIN WORDS. Every term of art is defined the first time it appears, in the same sentence, in words a new player would understand. If an idea needs a name, choose an ordinary one and say what it means. A reader should never meet a word like "rake" or "lands" and have to guess.
`;

const inputs = [
  `  - ${seed}   — the owner's ORIGINAL BRAINSTORM. This is the guard: every named system in it must be accounted for in your output — kept, altered, or flagged — so nothing is quietly lost.`,
  base
    ? `  - ${base}   — the BASE: the design you are iterating on. This is the spine. Your output should read as this document with the notes worked in — same core principle, same vocabulary, changes only where the notes ask for them or where a known defect needs fixing.`
    : null,
  notes
    ? `  - ${notes}   — the owner's NOTES on the base. These LEAD. Where a note and the base disagree, the note wins. Where a note conflicts with something load-bearing in the base, say so plainly and apply the note anyway — do not quietly pick a side, and do not quietly ignore the note.`
    : null,
  `  - ${dir}/BRIEF.md  — what this round is asking for, if the file exists.`,
]
  .filter(Boolean)
  .join('\n');

const CONTEXT = `
You are designing a game called Star Race: ships race a course, the player builds and tunes a ship between races, and the race itself runs on its own with at most a handful of taps from the player.

Read these before doing anything else, and treat them as the whole of your context:
${inputs}

HARD CONSTRAINT — this round does not inherit anything else. There is an existing partial implementation of a game by this name in this repository. It is OUT OF SCOPE:
  - DO NOT read DESIGN.md, anything under src/, tests/, PLAN.md or BACKLOG.md.
  - DO NOT read design/BRIEF.md, design/LEDGER.md, design/PROCESS.md, or any round folder other than the files named above.
  - DO NOT reason about that game's parts, actives, hazards, stages, garage or tuning values, nor any framework from a round not named above.
  - Never write "the current sim", "the existing game" or "the slice".

CONSTRAINTS THAT HOLD, as properties of the medium rather than mechanics:
  1. The simulation is deterministic. A race is a pure function of the course, the ships, the players' inputs and a seed. "Random" means drawn from the seeded generator, never unpredictable.
  2. The race advances on a fixed integer tick. No real time inside the simulation.
  3. One thumb, on a phone. The decisions are between races; a race is short enough to watch and asks for a handful of taps at most.
  4. Balance is measurable. Bots playing strategies against each other over hundreds of runs should be able to say whether choosing well pays.
${REGISTER}
Write in plain, direct prose. Short sentences. No hedging, no bullet-point soup, no headings beyond the ones asked for. Never mention that you are an AI or an agent.
`;

const SHARPEN_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string', description: 'A name for the design, 2-5 words' },
    headline: {
      type: 'string',
      description: 'The design in one sentence, in plain words',
    },
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
        'Named systems from the seed or base that do NOT work as written, one line each, with what is wrong. Never silently drop one.',
    },
    changed: {
      type: 'array',
      items: { type: 'string' },
      description:
        'What changed from the base because of the notes, one line each. Empty if there was no base.',
    },
    tensions: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Places where a note conflicted with something load-bearing in the base, one line each, saying what was done. Empty if none.',
    },
    added: {
      type: 'array',
      items: { type: 'string' },
      description:
        'Anything proposed that was in neither the seed nor the base, one line each',
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
  required: [
    'title',
    'headline',
    'file',
    'kept',
    'flagged',
    'changed',
    'tensions',
    'added',
    'questions',
  ],
};

const job = base
  ? `Your job is to ITERATE: take the base and work the owner's notes into it. The result should read as the base with the notes applied — same core principle, same vocabulary, same shape — changed where the notes ask for change and where a known defect needs fixing, and otherwise left alone. Do not redesign what the notes did not touch. The reader should finish your document and recognise the last round, improved in exactly the ways they asked for.

Where a note conflicts with something load-bearing in the base — a mechanic the base's title or premise rests on — apply the note, and say plainly in "What changed" that the base's premise moved and why. The notes lead. But name the tension rather than papering over it.`
  : `Your job is to SHARPEN the owner's idea, not to replace it. Keep the core principle and the feel of the seed intact, make it a feasible game, tidy the systems so they mesh, and present it so a reader can get the feel of it in a few minutes. The reader should finish your document and recognise their own idea, sharper.`;

phase('Sharpen');
const sharpened = await agent(
  `${CONTEXT}
You are the designer. ${job}

What you MAY do:
  - Say plainly that part of the idea does not work, and why.
  - Propose an addition that makes the rest hold together.
  - Name things, and decide details that were left open.
  - Cut a detail that is redundant once the rest is tightened.

What you MUST NOT do:
  - Replace the core principle with a different one, however clever${base ? ' — unless a note explicitly asks for that, in which case say so' : ''}.
  - Rename established ideas into a new vocabulary. If the notes call it a golden path, it is a golden path.
  - SILENTLY DROP A NAMED SYSTEM. This is the specific failure to avoid. If a system in the seed${base ? ' or the base' : ''} does not survive, it goes in "What does not work" with a reason and a suggested replacement — never just absent. Every named system in the seed must appear somewhere in your document, kept, altered or flagged.
${base ? '  - SILENTLY IGNORE A NOTE. Every note the owner wrote must be visibly answered — applied, or argued with in "What does not work". Never just unaddressed.' : ''}

${budget('1,500')}
DIAGRAMS. Include TWO \`\`\`mermaid fenced blocks — the page renders these as pictures, and they are the fastest way for the owner to get the feel of the design. One should show the loop: what a player does, in order, and what feeds back into what. The other should show how the systems connect, or a state the ship moves through. Use \`flowchart TD\`/\`flowchart LR\` or \`stateDiagram-v2\`. Keep each under about twelve nodes so it reads on a phone, label the edges, and use plain words in the labels.

Write ${dir}/sharpened.md with EXACTLY these headings, starting with a top-level "# <title>" line:
## The idea, in one paragraph
## The loop
## The systems
## How they connect
## A worked heat
${base ? '## What changed, and why\n' : ''}## What does not work, and what I would do instead
## What I added
## What needs your call

"The idea, in one paragraph" must be readable by someone who has never seen any earlier document: no undefined terms. "The systems" covers each thing the seed names — the ship, the course, the money, the season — in a short section each, described as mechanics. "How they connect" names the couplings as sentences of the form "because X, the player must Y". "A worked heat" walks one race and one decision between races, briefly, so the feel lands. ${base ? '"What changed, and why" goes note by note through the owner\'s notes and says what was done about each — this is the owner\'s main check that their feedback landed. ' : ''}"What does not work" is where every flagged system goes, with a reason and a suggested fix.

Return the title, the one-sentence headline, the file path, and the lists: what you kept from the seed, what you flagged, what changed from the base, any tensions between the notes and the base, what you added, and the calls that need the owner.`,
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
      description: 'Does the core principle of the owner idea survive in this design?',
    },
    notesLanded: {
      type: 'boolean',
      description:
        'If there were owner notes: were they all visibly addressed? True when there were no notes.',
    },
  },
  required: [
    'lens',
    'file',
    'worksBest',
    'weakest',
    'wouldAdd',
    'seedIntact',
    'notesLanded',
  ],
};

// Two readers, not three reviewers, and they do not score. A score out of 40
// is a comparison device and there is only one design here. What is wanted is
// what works, what does not, and what would help.
const READERS = [
  {
    slug: 'plays',
    lens: 'The player',
    brief:
      'You have played thousands of hours of build-and-watch games and you play on a phone, one thumb, in five-minute gaps. Judge it as a GAME and as a SCREEN at the same time: is there a plan worth making, does a heat produce a story, do the other ships matter, and can you understand why you lost in the time the race takes? Be hard on system count — say which thing you would cut first and what you would lose by cutting it. Be hard on jargon — name every term you had to guess at.',
  },
  {
    slug: 'rules',
    lens: 'The rules reader',
    brief:
      'You have to turn this into deterministic rules on an integer tick. Judge whether each mechanic, as described, could actually be written down as a rule — not whether the numbers are given, since the design deliberately describes mechanics rather than values, but whether the mechanic is well-defined enough that a number could be chosen for it later and tested. Flag anything described in one sentence that secretly needs five rules, and anything where two mechanics as described would contradict each other. You are NOT costing this against any existing codebase — there is none in scope.',
  },
];

const readerInputs = [
  `Read ${sharpened.file} in full.`,
  base
    ? `Then read ${base} and ${notes ?? 'the brief'} and answer two questions first: **did the owner's notes land — is every one of them visibly addressed?** and **is this still the same design as the base, with the notes worked in — or a different one?**`
    : `Then read ${seed} again and answer the question that matters most: **does the owner's original idea survive in this design, sharper — or has it been replaced by something else wearing its words?**`,
  `Then check ${seed}: is every named system from the original brainstorm accounted for — kept, altered, or flagged? Name any that simply vanished.`,
].join(' ');

phase('Read');
const readerNotes = (
  await parallel(
    READERS.map(
      (r) => () =>
        agent(
          `${CONTEXT}
You are one of two readers. Your lens: ${r.brief}

${readerInputs} Say so plainly either way.

Then mark the design up. Do not score it out of anything; there is nothing to compare it against. What is wanted is: what works, what does not, and what would help. Be concrete and be specific — name the mechanic, quote the sentence. A note that likes everything is useless.

Write ${dir}/notes/${r.slug}.md with a top-level "# Notes: ${r.lens}" line, then EXACTLY these headings:
${base ? '## Did the notes land\n' : ''}## Does the idea survive
## What works
## What does not
## What I would add
## What I would cut first

${budget('700')}
Return your lens name, the file path, the single strongest thing, the single weakest thing, your concrete suggestions, whether the owner's idea survives, and whether the notes all landed.`,
          { label: `read:${r.slug}`, phase: 'Read', schema: NOTE_SCHEMA },
        ),
    ),
  )
).filter(Boolean);
log(`${readerNotes.length} sets of notes written`);

return {
  round,
  dir,
  kind: 'sharpen',
  seed,
  base,
  notes,
  sharpened,
  readerNotes,
};
