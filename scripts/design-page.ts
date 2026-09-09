// Render a design round as a page the owner can read on a phone.
//
//   npm run design-page -- --round 1
//
// Reads design/rounds/round-NN/ (round.json plus the markdown the round wrote)
// and writes public/design/round-NN.html, then rebuilds public/design/index.html
// from every round on disk. Vite copies public/ into dist/, so the pages are
// served from the Pages site under /star-race/design/.
//
// With --fragment <path> it also writes the page without the document wrapper,
// which is what the Artifact tool wants.
//
// A script, not part of the game: it may use the filesystem and console.

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';

export interface Criteria {
  readonly buildFantasy: number;
  readonly tradeoffs: number;
  readonly interaction: number;
  readonly stakes: number;
  readonly legibility: number;
  readonly fit: number;
  readonly buildable: number;
  readonly measurable: number;
}

export interface Score {
  readonly slug: string;
  readonly criteria: Criteria;
  readonly total: number;
  readonly bestIdea: string;
  readonly fatalFlaw: string;
}

export interface Review {
  readonly lens: string;
  readonly file: string;
  readonly recommendedBase: string;
  readonly grafts: readonly string[];
  readonly scores: readonly Score[];
}

export interface Proposal {
  readonly slug: string;
  readonly title: string;
  readonly oneLiner: string;
  readonly file: string;
}

export interface RoundData {
  readonly round: number;
  /** ISO date the round was run. */
  readonly date: string;
  readonly title: string;
  readonly headline: string;
  readonly builtFrom: string;
  readonly proposals: readonly Proposal[];
  readonly reviews: readonly Review[];
  readonly synthesisFile: string;
  readonly critiqueFile: string;
  readonly questions: readonly { readonly question: string; readonly why: string }[];
  readonly nextRound: string;
  readonly gaps: readonly string[];
  /**
   * "divergent" (the default) is the four-proposal round: proposals compete,
   * reviewers score them, a synthesis picks a base. "sharpen" is the fast
   * round: one seeded design developed in place, plus notes on it. A sharpen
   * round has no proposals to compare and no scoreboard, so those sections are
   * dropped rather than rendered empty.
   */
  readonly kind?: 'divergent' | 'sharpen';
  /** Sharpen rounds only: one entry per reader who marked up the design. */
  readonly notes?: readonly { readonly lens: string; readonly file: string }[];
}

const CRITERIA: readonly { readonly key: keyof Criteria; readonly label: string }[] = [
  { key: 'buildFantasy', label: 'Build' },
  { key: 'tradeoffs', label: 'Tradeoffs' },
  { key: 'interaction', label: 'Interaction' },
  { key: 'stakes', label: 'Stakes' },
  { key: 'legibility', label: 'Legibility' },
  { key: 'fit', label: 'Fit' },
  { key: 'buildable', label: 'Buildable' },
  { key: 'measurable', label: 'Measurable' },
];

export const ROUNDS_DIR = 'design/rounds';
export const PAGES_DIR = 'public/design';
export const SITE_BASE = '/star-race/';

export const pad = (n: number): string => String(n).padStart(2, '0');
export const roundDir = (round: number): string =>
  join(ROUNDS_DIR, `round-${pad(round)}`);

const escape = (text: string): string =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * A ```mermaid fence becomes a <pre class="mermaid"> that the mermaid script
 * in the page turns into a diagram. Every other fence renders as code. Agents
 * are asked for a diagram per document, so this is the difference between a
 * picture and a wall of pipe characters.
 */
marked.use({
  gfm: true,
  renderer: {
    code({ text, lang }): string | false {
      if ((lang ?? '').trim().split(/\s+/)[0] !== 'mermaid') return false;
      return `<pre class="mermaid">${escape(text)}</pre>`;
    },
  },
});

/** Markdown to HTML, with every heading pushed one level down so it nests under the page's own. */
function renderMarkdown(source: string, demote = 1): string {
  const shifted = source.replace(
    /^(#{1,5}) /gm,
    (_, hashes: string) => `${'#'.repeat(hashes.length + demote)} `,
  );
  return marked.parse(shifted, { async: false, gfm: true });
}

/**
 * A sharpen round has no critique, so `critiqueFile` is "" and join() then
 * names the round directory itself. Treat anything that is not a readable file
 * as absent rather than throwing.
 */
function readIfExists(path: string): string | undefined {
  if (!existsSync(path) || !statSync(path).isFile()) return undefined;
  return readFileSync(path, 'utf8');
}

const mean = (values: readonly number[]): number =>
  values.length === 0 ? NaN : values.reduce((a, b) => a + b, 0) / values.length;

function scoreboard(data: RoundData): string {
  const reviewers = data.reviews;
  const rows = data.proposals.map((proposal) => {
    const totals = reviewers.map(
      (review) => review.scores.find((s) => s.slug === proposal.slug)?.total ?? NaN,
    );
    const backing = reviewers.filter((r) => r.recommendedBase === proposal.slug).length;
    return {
      proposal,
      totals,
      mean: mean(totals.filter((t) => !Number.isNaN(t))),
      backing,
    };
  });
  rows.sort((a, b) => b.mean - a.mean);

  const head = reviewers.map((r) => `<th>${escape(r.lens)}</th>`).join('');
  const body = rows
    .map(({ proposal, totals, mean: avg, backing }) => {
      const cells = totals.map((t) => `<td>${Number.isNaN(t) ? '—' : t}</td>`).join('');
      const base =
        proposal.slug === data.builtFrom ? ' <span class="chip">base</span>' : '';
      const votes = backing > 0 ? `<td>${'●'.repeat(backing)}</td>` : '<td></td>';
      return `<tr><th scope="row"><a href="#proposal-${proposal.slug}">${escape(proposal.title)}</a>${base}</th>${cells}<td class="mean">${Number.isNaN(avg) ? '—' : avg.toFixed(1)}</td>${votes}</tr>`;
    })
    .join('\n');

  // Per criterion, the mean across reviewers, so the shape of each proposal shows.
  const criteriaHead = CRITERIA.map((c) => `<th>${c.label}</th>`).join('');
  const criteriaBody = rows
    .map(({ proposal }) => {
      const cells = CRITERIA.map((c) => {
        const values = reviewers
          .map((r) => r.scores.find((s) => s.slug === proposal.slug)?.criteria[c.key])
          .filter((v): v is number => v !== undefined);
        const avg = mean(values);
        const tone = Number.isNaN(avg)
          ? ''
          : avg >= 4
            ? ' class="hi"'
            : avg <= 2
              ? ' class="lo"'
              : '';
        return `<td${tone}>${Number.isNaN(avg) ? '—' : avg.toFixed(1)}</td>`;
      }).join('');
      return `<tr><th scope="row">${escape(proposal.title)}</th>${cells}</tr>`;
    })
    .join('\n');

  return `
<div class="scroll"><table class="scores">
<thead><tr><th>Proposal</th>${head}<th>Mean</th><th>Backed by</th></tr></thead>
<tbody>${body}</tbody>
</table></div>
<p class="caption">Totals out of 40. A dot is a reviewer who would build from that proposal.</p>
<div class="scroll"><table class="scores criteria">
<thead><tr><th>Per criterion, mean of ${reviewers.length}</th>${criteriaHead}</tr></thead>
<tbody>${criteriaBody}</tbody>
</table></div>`;
}

const STYLE = `
:root {
  --ground: #f4efe2;
  --surface: #fbf8f0;
  --ink: #17203a;
  --ink-soft: #4d5a7a;
  --rule: #d6cdb6;
  --accent: #b46a0c;
  --accent-ink: #7a4706;
  --good: #2f7a3e;
  --bad: #b2372e;
  --chip: #e9dcc0;
  color-scheme: light dark;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --ground: #0d1730;
    --surface: #152140;
    --ink: #e9e4d6;
    --ink-soft: #9aabcb;
    --rule: #2c3a5e;
    --accent: #f2a93b;
    --accent-ink: #f2a93b;
    --good: #7fd48c;
    --bad: #e2685f;
    --chip: #253359;
  }
}
:root[data-theme="dark"] {
  --ground: #0d1730;
  --surface: #152140;
  --ink: #e9e4d6;
  --ink-soft: #9aabcb;
  --rule: #2c3a5e;
  --accent: #f2a93b;
  --accent-ink: #f2a93b;
  --good: #7fd48c;
  --bad: #e2685f;
  --chip: #253359;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--ground);
  color: var(--ink);
  font: 400 17px/1.55 "Source Serif 4", Georgia, "Times New Roman", serif;
  -webkit-text-size-adjust: 100%;
}
.page { max-width: 44rem; margin: 0 auto; padding: 0 20px 96px; }
a { color: var(--accent-ink); text-decoration-thickness: 1px; text-underline-offset: 3px; }
a:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

.masthead { padding: 40px 0 24px; border-bottom: 2px solid var(--ink); }
.eyebrow {
  font: 600 12px/1 "Chakra Petch", "Segoe UI", system-ui, sans-serif;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-soft);
  display: flex; gap: 14px; flex-wrap: wrap;
}
h1 {
  font: 700 clamp(30px, 7vw, 44px)/1.05 "Chakra Petch", "Segoe UI", system-ui, sans-serif;
  letter-spacing: -0.01em; margin: 14px 0 12px; text-wrap: balance;
}
.headline { font-size: 20px; line-height: 1.4; margin: 0; color: var(--ink); text-wrap: balance; }

nav.toc {
  position: sticky; top: 0; z-index: 2;
  background: var(--ground); border-bottom: 1px solid var(--rule);
  margin: 0 -20px; padding: 10px 20px;
  display: flex; gap: 6px 16px; overflow-x: auto; white-space: nowrap;
  font: 500 13px/1 "Chakra Petch", "Segoe UI", system-ui, sans-serif; letter-spacing: 0.04em;
}
nav.toc a { text-decoration: none; color: var(--ink-soft); padding: 4px 0; }
nav.toc a:hover { color: var(--accent-ink); }

section { padding-top: 40px; }
h2 {
  font: 700 24px/1.2 "Chakra Petch", "Segoe UI", system-ui, sans-serif;
  margin: 0 0 16px; padding-bottom: 8px; border-bottom: 1px solid var(--rule);
}
h3 { font: 700 20px/1.25 "Chakra Petch", "Segoe UI", system-ui, sans-serif; margin: 32px 0 8px; }
h4 { font: 600 17px/1.3 "Chakra Petch", "Segoe UI", system-ui, sans-serif; margin: 24px 0 6px; }
h5 { font: 600 15px/1.3 "Chakra Petch", "Segoe UI", system-ui, sans-serif; margin: 18px 0 4px; color: var(--ink-soft); }
p { margin: 0 0 1em; }
ul, ol { padding-left: 1.4em; margin: 0 0 1em; }
li { margin-bottom: 0.35em; }
blockquote { margin: 0 0 1em; padding: 0 0 0 16px; border-left: 3px solid var(--accent); color: var(--ink-soft); }
code { font: 0.9em "JetBrains Mono", ui-monospace, Consolas, monospace; background: var(--chip); padding: 1px 5px; border-radius: 3px; }
pre { overflow-x: auto; background: var(--surface); border: 1px solid var(--rule); padding: 12px; }
pre code { background: none; padding: 0; }
pre.mermaid { background: var(--surface); border: 1px solid var(--rule); border-radius: 4px; padding: 16px 8px; margin: 20px 0; overflow-x: auto; text-align: center; font-family: inherit; line-height: normal; }
pre.mermaid svg { max-width: 100%; height: auto; }
pre.mermaid:not([data-processed]) { font: 0.85em "JetBrains Mono", ui-monospace, monospace; text-align: left; white-space: pre; color: var(--ink-soft); }
hr { border: 0; border-top: 1px solid var(--rule); margin: 2em 0; }

.scroll { overflow-x: auto; margin: 0 -20px 12px; padding: 0 20px; }
table { border-collapse: collapse; width: 100%; font-size: 15px; font-variant-numeric: tabular-nums; }
th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid var(--rule); vertical-align: top; }
thead th { font: 600 12px/1.2 "Chakra Petch", "Segoe UI", system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ink-soft); }
table.scores td { text-align: right; font-family: "JetBrains Mono", ui-monospace, Consolas, monospace; font-size: 14px; }
table.scores td.mean { font-weight: 700; }
table.scores td.hi { color: var(--good); font-weight: 700; }
table.scores td.lo { color: var(--bad); font-weight: 700; }
table.scores th[scope="row"] { font-weight: 600; white-space: nowrap; }
.caption { font-size: 14px; color: var(--ink-soft); margin: 0 0 20px; }
.chip {
  display: inline-block; font: 600 11px/1 "Chakra Petch", "Segoe UI", system-ui, sans-serif;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--accent-ink);
  border: 1px solid var(--accent); border-radius: 999px; padding: 4px 8px; margin-left: 8px; vertical-align: middle;
}

.questions { counter-reset: q; list-style: none; padding: 0; }
.questions li { counter-increment: q; display: grid; grid-template-columns: 2.2rem 1fr; gap: 0 8px; padding: 14px 0; border-bottom: 1px solid var(--rule); margin: 0; }
.questions li::before { content: counter(q, decimal-leading-zero); font: 700 18px/1.3 "Chakra Petch", "Segoe UI", system-ui, sans-serif; color: var(--accent); }
.questions .q { font-weight: 600; }
.questions .why { grid-column: 2; color: var(--ink-soft); font-size: 15px; }

details { border-top: 1px solid var(--rule); }
details:last-of-type { border-bottom: 1px solid var(--rule); }
summary {
  cursor: pointer; padding: 16px 0; list-style: none;
  display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: baseline;
}
summary::-webkit-details-marker { display: none; }
summary .t { font: 700 19px/1.25 "Chakra Petch", "Segoe UI", system-ui, sans-serif; }
summary .s { grid-column: 1; color: var(--ink-soft); font-size: 15px; }
summary .arrow { font: 600 13px/1 "Chakra Petch", "Segoe UI", system-ui, sans-serif; letter-spacing: 0.08em; color: var(--accent-ink); text-transform: uppercase; }
details[open] summary .arrow::after { content: "Close"; }
details:not([open]) summary .arrow::after { content: "Read"; }
details .body { padding: 0 0 24px; }
details .body > h2:first-child { margin-top: 0; }

.synthesis { background: var(--surface); border: 1px solid var(--rule); padding: 20px; margin: 0 -20px; }
@media (min-width: 720px) { .synthesis { margin: 0; padding: 32px; } }

.gaps { padding-left: 1.4em; }
.gaps li { margin-bottom: 0.6em; }
.feedback-how { background: var(--surface); border: 1px dashed var(--rule); padding: 16px 20px; }
.feedback-how code { white-space: nowrap; }
footer { margin-top: 56px; padding-top: 16px; border-top: 1px solid var(--rule); font-size: 14px; color: var(--ink-soft); }
`;

const FONTS =
  '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@500;600;700&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,600;1,8..60,400&family=JetBrains+Mono:wght@400;700&display=swap">';

/**
 * Mermaid, pinned, reading the page's own palette so a diagram sits in the
 * page rather than on top of it. Diagrams are laid out once on load; the
 * theme is read from the <html data-theme> the page already sets.
 */
const MERMAID_SCRIPT = `<script type="module">
import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs';
const css = getComputedStyle(document.documentElement);
const v = (name, fallback) => (css.getPropertyValue(name).trim() || fallback);
mermaid.initialize({
  startOnLoad: true,
  securityLevel: 'strict',
  fontFamily: '"Source Serif 4", Georgia, serif',
  themeVariables: {
    background: v('--surface', '#fbf8f0'),
    primaryColor: v('--chip', '#e9dcc0'),
    primaryBorderColor: v('--rule', '#d6cdb6'),
    primaryTextColor: v('--ink', '#17203a'),
    lineColor: v('--ink-soft', '#4d5a7a'),
    secondaryColor: v('--surface', '#fbf8f0'),
    tertiaryColor: v('--ground', '#f4efe2'),
  },
});
</script>`;

function proposalBlock(proposal: Proposal, data: RoundData, source: string): string {
  const base = proposal.slug === data.builtFrom ? '<span class="chip">base</span>' : '';
  const verdicts = data.reviews
    .map((review) => {
      const score = review.scores.find((s) => s.slug === proposal.slug);
      if (score === undefined) return '';
      const flaw =
        score.fatalFlaw.trim().length > 0
          ? `<p><strong>Fatal flaw:</strong> ${escape(score.fatalFlaw)}</p>`
          : '';
      return `<h5>${escape(review.lens)} · ${score.total}/40</h5><p><strong>Best idea:</strong> ${escape(score.bestIdea)}</p>${flaw}`;
    })
    .join('');
  return `<details id="proposal-${proposal.slug}">
<summary><span class="t">${escape(proposal.title)}${base}</span><span class="arrow"></span><span class="s">${escape(proposal.oneLiner)}</span></summary>
<div class="body">
${renderMarkdown(source)}
<h4>What the reviewers said</h4>
${verdicts}
</div>
</details>`;
}

function reviewBlock(review: Review, data: RoundData, source: string): string {
  const base =
    data.proposals.find((p) => p.slug === review.recommendedBase)?.title ??
    review.recommendedBase;
  return `<details id="review-${escape(review.lens)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}">
<summary><span class="t">${escape(review.lens)}</span><span class="arrow"></span><span class="s">Would build from ${escape(base)}</span></summary>
<div class="body">${renderMarkdown(source)}</div>
</details>`;
}

/** The page body: everything inside <body>, plus the title and style. */
export function renderFragment(data: RoundData, files: Record<string, string>): string {
  const synthesis = files[data.synthesisFile] ?? '';
  const critique = files[data.critiqueFile] ?? '';
  const feedback = files['feedback.md'];
  const dir = roundDir(data.round);

  const questions = data.questions
    .map(
      (q) =>
        `<li><span class="q">${escape(q.question)}</span><span class="why">${escape(q.why)}</span></li>`,
    )
    .join('\n');

  const sharpen = data.kind === 'sharpen';
  const notes = (data.notes ?? [])
    .map(
      (n) => `<details id="note-${escape(n.lens)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')}">
<summary><span class="t">${escape(n.lens)}</span><span class="arrow"></span></summary>
<div class="body">${renderMarkdown(files[n.file] ?? '')}</div>
</details>`,
    )
    .join('\n');

  return `<title>Star Race Framework Round ${data.round}</title>
${FONTS}
<style>${STYLE}</style>
<div class="page">
<header class="masthead">
  <div class="eyebrow"><span>Star Race</span><span>${sharpen ? 'Sharpen' : 'Framework'} round ${data.round}</span><span>${escape(data.date)}</span></div>
  <h1>${escape(data.title)}</h1>
  <p class="headline">${escape(data.headline)}</p>
</header>
<nav class="toc">
  <a href="#synthesis">${sharpen ? 'The design' : 'Recommendation'}</a>
  <a href="#decisions">Your decisions</a>
${
  sharpen
    ? `  <a href="#notes">Notes</a>`
    : `  <a href="#scores">Scores</a>
  <a href="#proposals">Proposals</a>
  <a href="#reviews">Reviews</a>
  <a href="#critique">Critique</a>`
}
  <a href="#feedback">Reply</a>
  <a href="ledger.html">Ledger</a>
</nav>

<section id="synthesis">
  <h2>${sharpen ? 'The design' : 'The recommendation'}</h2>
  <div class="synthesis">${renderMarkdown(synthesis)}</div>
</section>

<section id="decisions">
  <h2>Decisions only you can make</h2>
  <ol class="questions">${questions}</ol>
  <h4>What the next round should work on</h4>
  <p>${escape(data.nextRound)}</p>
</section>

${
  sharpen
    ? `<section id="notes">
  <h2>Notes on the design</h2>
  ${notes}
</section>`
    : `<section id="scores">
  <h2>How the proposals scored</h2>
  ${scoreboard(data)}
</section>

<section id="proposals">
  <h2>The ${data.proposals.length} proposals</h2>
  ${data.proposals.map((p) => proposalBlock(p, data, files[p.file] ?? '')).join('\n')}
</section>`
}

${
  sharpen
    ? ''
    : `<section id="reviews">
  <h2>The reviews</h2>
  ${data.reviews.map((r) => reviewBlock(r, data, files[r.file] ?? '')).join('\n')}
</section>

<section id="critique">
  <h2>What the recommendation dodged</h2>
  ${renderMarkdown(critique)}
</section>`
}

${feedback === undefined ? '' : `<section id="owner-feedback"><h2>Your feedback on this round</h2>${renderMarkdown(feedback)}</section>`}

<section id="feedback">
  <h2>How to reply</h2>
  <div class="feedback-how">
    <p>Answer the decisions above, or push back on anything here, in any shape. Put it in <code>${dir}/feedback.md</code>, or send it as a message and ask for it to be filed there. The next round's proposers read it before the brief. Anything that should hold for every future round goes into <code>design/BRIEF.md</code> too.</p>
    <p>To start the next round: <em>run the ${sharpen ? 'sharpen-round' : 'framework-round'} workflow for round ${data.round + 1}</em>.</p>
  </div>
</section>

<footer>Rendered from <code>${dir}/</code> by <code>npm run design-page</code>. The markdown is the record; this page is the reading copy.</footer>
</div>`;
}

function wrapDocument(fragment: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0d1730">
${fragment.replace(/<div class="page">[\s\S]*$/, '')}
</head>
<body>
${fragment.replace(/^[\s\S]*?(?=<div class="page">)/, '')}
${MERMAID_SCRIPT}
</body>
</html>
`;
}

function renderIndex(rounds: readonly RoundData[]): string {
  const rows = [...rounds]
    .sort((a, b) => b.round - a.round)
    .map(
      (r) =>
        `<li><a href="round-${pad(r.round)}.html"><span class="t">Round ${r.round} · ${escape(r.title)}</span></a><span class="s">${escape(r.headline)}</span><span class="d">${escape(r.date)}</span></li>`,
    )
    .join('\n');
  const fragment = `<title>Star Race Design Rounds</title>
${FONTS}
<style>${STYLE}
.rounds { list-style: none; padding: 0; }
.rounds li { display: grid; gap: 4px; padding: 18px 0; border-bottom: 1px solid var(--rule); }
.rounds .t { font: 700 20px/1.25 "Chakra Petch", "Segoe UI", system-ui, sans-serif; }
.rounds .s { color: var(--ink); }
.rounds .d { font: 500 12px/1 "Chakra Petch", "Segoe UI", system-ui, sans-serif; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ink-soft); }
</style>
<div class="page">
<header class="masthead">
  <div class="eyebrow"><span>Star Race</span><span>Design rounds</span></div>
  <h1>Finding the game</h1>
  <p class="headline">Each round, four frameworks are proposed, three reviewers score them, and one recommendation is written for the owner to answer. Newest first.</p>
</header>
<section>
<ul class="rounds">${rows}</ul>
<p class="caption"><a href="ledger.html">The ideas ledger</a> lists everything any round has considered. The brief every round answers is <code>design/BRIEF.md</code> in the repo. <a href="${SITE_BASE}">Play the current slice.</a></p>
</section>
</div>`;
  return wrapDocument(fragment);
}

export const LEDGER_FILE = 'design/LEDGER.md';

/** The ideas ledger as its own page. */
function renderLedger(): string {
  const source = readIfExists(LEDGER_FILE) ?? '# Ideas ledger\n\nNothing recorded yet.';
  const fragment = `<title>Star Race Ideas Ledger</title>
${FONTS}
<style>${STYLE}
.ledger table td:nth-child(1) { font-weight: 600; }
.ledger table td:nth-child(3) { white-space: nowrap; font: 600 12px/1.4 "Chakra Petch", "Segoe UI", system-ui, sans-serif; letter-spacing: 0.08em; text-transform: uppercase; }
</style>
<div class="page">
<header class="masthead">
  <div class="eyebrow"><span>Star Race</span><span>Ideas ledger</span></div>
  <h1>Everything considered</h1>
  <p class="headline">Every idea any round put forward, where it came from, and what became of it. Newest round last. Nothing is deleted; a change of mind is a new row.</p>
</header>
<section class="ledger">
<div class="scroll">${renderMarkdown(source.replace(/^# .*\n/, ''), 0)}</div>
<p class="caption"><a href="index.html">Back to the rounds.</a></p>
</section>
</div>`;
  return wrapDocument(fragment);
}

export function loadRound(round: number): {
  data: RoundData;
  files: Record<string, string>;
} {
  const dir = roundDir(round);
  const json = readIfExists(join(dir, 'round.json'));
  if (json === undefined)
    throw new Error(`No ${join(dir, 'round.json')}. Run the round first.`);
  const data = JSON.parse(json) as RoundData;
  const files: Record<string, string> = {};
  const wanted = [
    data.synthesisFile,
    data.critiqueFile,
    'feedback.md',
    ...data.proposals.map((p) => p.file),
    ...data.reviews.map((r) => r.file),
    ...(data.notes ?? []).map((n) => n.file),
  ];
  wanted.forEach((file) => {
    const text = readIfExists(join(dir, file));
    if (text !== undefined) files[file] = text;
  });
  return { data, files };
}

function allRounds(): RoundData[] {
  if (!existsSync(ROUNDS_DIR)) return [];
  return readdirSync(ROUNDS_DIR)
    .filter((name) => /^round-\d+$/.test(name))
    .map((name) => readIfExists(join(ROUNDS_DIR, name, 'round.json')))
    .filter((text): text is string => text !== undefined)
    .map((text) => JSON.parse(text) as RoundData);
}

export function renderRound(round: number, fragmentPath?: string): string {
  const { data, files } = loadRound(round);
  const fragment = renderFragment(data, files);
  mkdirSync(PAGES_DIR, { recursive: true });
  const out = join(PAGES_DIR, `round-${pad(round)}.html`);
  writeFileSync(out, wrapDocument(fragment));
  writeFileSync(join(PAGES_DIR, 'index.html'), renderIndex(allRounds()));
  writeFileSync(join(PAGES_DIR, 'ledger.html'), renderLedger());
  if (fragmentPath !== undefined) writeFileSync(fragmentPath, fragment);
  return out;
}

function flag(argv: readonly string[], name: string): string | undefined {
  const at = argv.indexOf(name);
  return at === -1 ? undefined : argv[at + 1];
}

// Only run as a script when invoked directly, so the test can import it.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/design-page.ts')) {
  const argv = process.argv.slice(2);
  const round = Number(flag(argv, '--round'));
  if (!Number.isInteger(round) || round < 1) {
    throw new Error(
      `--round needs a positive whole number, got ${flag(argv, '--round')}.`,
    );
  }
  const out = renderRound(round, flag(argv, '--fragment'));
  console.log(`Wrote ${out} and ${join(PAGES_DIR, 'index.html')}.`);
}
