// Render the mechanics page: the one-page graphic, then one section per area
// with every catalogue element under it, then the mechanics notes.
//
//   npm run mechanics-page
//
// The page is RENDERED from design/catalogue/, never hand-edited:
//   - index.json        which elements exist, which area each sits in
//   - overview.html     the hand-drawn graphic at the top (a fragment)
//   - <element>.md      one file per element: its schema, its table, its notes
//   - mechanics-notes.md what dictation said that moves the framework
//
// It also rewrites the tracker table in design/catalogue/README.md between
// the tracker markers, so the README on GitHub and the page agree. A row is
// edited in exactly one place: the element's file. Status and row counts are
// derived from the file, not typed anywhere.
//
// A script, not part of the game: it may use the filesystem and console.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { marked } from 'marked';
import {
  escape,
  FONTS,
  PAGES_DIR,
  readIfExists,
  renderMarkdown,
  STYLE,
  wrapDocument,
} from './design-page';

const CATALOGUE_DIR = 'design/catalogue';

interface Area {
  readonly id: string;
  readonly name: string;
}

interface Element {
  readonly id: string;
  readonly name: string;
  readonly area: string;
  readonly file: string;
  readonly shape: 'catalogue' | 'definitions' | 'parameters' | 'rules';
  readonly what: string;
}

interface Index {
  readonly framework: {
    readonly round: number;
    readonly title: string;
    readonly file: string;
  };
  readonly areas: readonly Area[];
  readonly elements: readonly Element[];
}

type Status = 'untouched' | 'partial' | 'seeded';

interface Counted {
  readonly element: Element;
  readonly source: string | undefined;
  readonly rows: number;
  readonly stubs: number;
  readonly status: Status;
}

/**
 * Count the rows of every table in the file except the schema table. A row is
 * a line starting with "|" that is neither a header nor a separator; a stub is
 * a row whose last cell says so. Status follows from the counts.
 */
function count(element: Element, source: string | undefined): Counted {
  if (source === undefined)
    return { element, source, rows: 0, stubs: 0, status: 'untouched' };
  let rows = 0;
  let stubs = 0;
  let inSchema = false;
  let sawHeader = false;
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (line.startsWith('## ')) {
      inSchema = /^## schema/i.test(line);
      sawHeader = false;
      continue;
    }
    if (inSchema || !line.startsWith('|')) {
      if (!line.startsWith('|')) sawHeader = false;
      continue;
    }
    if (/^\|\s*-+/.test(line)) continue; // separator
    if (!sawHeader) {
      sawHeader = true; // first pipe line after a heading is the header
      continue;
    }
    rows += 1;
    const cells = line.split('|').map((c) => c.trim());
    const last = cells.filter(Boolean).at(-1) ?? '';
    if (/^stub\b/i.test(last)) stubs += 1;
  }
  const status: Status = rows === 0 ? 'untouched' : stubs > 0 ? 'partial' : 'seeded';
  return { element, source, rows, stubs, status };
}

const chip = (status: Status): string =>
  `<span class="status ${status}">${status}</span>`;

function trackerRows(counted: readonly Counted[], areas: readonly Area[]): string {
  const areaName = (id: string): string => areas.find((a) => a.id === id)?.name ?? id;
  return counted
    .map(
      (c, i) =>
        `| ${i + 1} | [${c.element.name}](${c.element.file}) | ${areaName(c.element.area)} | ${c.element.what} | ${c.element.shape} | ${c.status} | ${c.rows}${c.stubs ? ` (${c.stubs} stub)` : ''} |`,
    )
    .join('\n');
}

function trackerTable(counted: readonly Counted[], areas: readonly Area[]): string {
  return `| # | Element | Under | What it is | Shape | Status | Rows |
| --- | --- | --- | --- | --- | --- | --- |
${trackerRows(counted, areas)}`;
}

/** Rewrite the tracker in README.md between its markers, leaving the rest alone. */
function updateReadme(counted: readonly Counted[], areas: readonly Area[]): void {
  const path = join(CATALOGUE_DIR, 'README.md');
  const readme = readFileSync(path, 'utf8');
  const start = '<!-- tracker:start -->';
  const end = '<!-- tracker:end -->';
  const a = readme.indexOf(start);
  const b = readme.indexOf(end);
  if (a === -1 || b === -1 || b < a)
    throw new Error(`${path} needs ${start} and ${end} markers around the tracker.`);
  const next =
    readme.slice(0, a + start.length) +
    '\n\n' +
    trackerTable(counted, areas) +
    '\n\n' +
    readme.slice(b);
  writeFileSync(path, next);
}

const PAGE_STYLE = `
.masthead .headline { max-width: 34em; }
.tracker { font-size: 13px; }
.status { font: 600 10px/1 "JetBrains Mono", monospace; letter-spacing: .04em; text-transform: uppercase; border-radius: 3px; padding: 3px 6px; vertical-align: middle; }
.status.untouched { color: var(--ink-soft); border: 1px dashed var(--rule); }
.status.partial { color: var(--accent-ink); border: 1px solid var(--accent); }
.status.seeded { color: var(--good); border: 1px solid var(--good); }
.area { margin-top: 28px; }
.area > h2 { display: flex; align-items: baseline; gap: 10px; }
.area > h2 .count { font: 400 12px/1 "JetBrains Mono", monospace; color: var(--ink-soft); }
details.element { border: 1px solid var(--rule); border-radius: 6px; background: var(--surface); margin: 8px 0; }
details.element > summary { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; padding: 10px 12px; cursor: pointer; list-style: none; }
details.element > summary::-webkit-details-marker { display: none; }
details.element > summary .t { font: 700 15px/1.2 "Chakra Petch", system-ui, sans-serif; }
details.element > summary .w { grid-column: 1 / -1; color: var(--ink-soft); font-size: 13px; margin-top: -4px; }
details.element > summary .rows { font: 400 12px/1 "JetBrains Mono", monospace; color: var(--ink-soft); }
details.element > .body { padding: 0 12px 12px; border-top: 1px solid var(--rule); }
details.element > .body h3 { font-size: 15px; margin-top: 16px; }
details.element > .body .scroll { overflow-x: auto; }
details.element > .body table { font-size: 12.5px; }
details.element .empty { color: var(--ink-soft); font-style: italic; padding: 12px; }
details.schema { margin: 10px 0; border: 1px dashed var(--rule); border-radius: 4px; }
details.schema > summary { padding: 6px 10px; font: 600 12px/1 "JetBrains Mono", monospace; color: var(--ink-soft); cursor: pointer; }
details.schema table { font-size: 12px; }
.rows { display: grid; gap: 8px; margin: 8px 0 12px; }
.rows .row { border: 1px solid var(--rule); border-radius: 4px; background: var(--ground); padding: 8px 10px; }
.rows .row.stub { border-style: dashed; }
.rows .row.cut { opacity: .55; text-decoration: line-through; }
.rows .row .t { font: 700 14px/1.2 "Chakra Petch", system-ui, sans-serif; display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; }
.rows .row .f { display: grid; grid-template-columns: 6.5em 1fr; gap: 6px; font-size: 12.5px; padding: 2px 0; }
.rows .row .l { font: 600 10px/1.6 "JetBrains Mono", monospace; color: var(--ink-soft); text-transform: uppercase; letter-spacing: .04em; }
.rows .row .v code { font-size: 11px; }
.status.stub { color: var(--ink-soft); border: 1px dashed var(--rule); }
.status.cut { color: var(--bad); border: 1px solid var(--bad); }
.notes-section table { font-size: 12.5px; }
`;

/** Split a markdown table into header cells and rows of cells. */
function parseTable(lines: readonly string[]): { head: string[]; rows: string[][] } {
  const cells = (line: string): string[] => {
    const parts = line.split('|').map((c) => c.trim());
    if (parts[0] === '') parts.shift();
    if (parts.at(-1) === '') parts.pop();
    return parts;
  };
  const [head, , ...rest] = lines;
  return {
    head: cells(head ?? ''),
    rows: rest.filter((l) => !/^\|\s*-+/.test(l)).map(cells),
  };
}

/**
 * A catalogue table as cards, one per row, so a seven-column table reads on
 * a phone. The first non-id column is the card's title; `status` becomes a
 * chip; everything else is a label and a value.
 */
function tableAsCards(lines: readonly string[]): string {
  const { head, rows } = parseTable(lines);
  if (rows.length === 0) return '<p class="empty">No rows yet.</p>';
  const titleAt = head.findIndex((h) => h.toLowerCase() === 'name');
  const cards = rows.map((row) => {
    const get = (i: number): string => row[i] ?? '';
    const title = titleAt === -1 ? get(0) : get(titleAt);
    const status = head.findIndex((h) => h.toLowerCase() === 'status');
    const statusText = status === -1 ? '' : get(status).replace(/\s*\(.*\)$/, '');
    const fields = head
      .map((h, i) => ({ h, v: get(i), i }))
      .filter(
        ({ h, i, v }) =>
          i !== titleAt && i !== status && h.toLowerCase() !== 'id' && v !== '',
      )
      .map(
        ({ h, v }) =>
          `<div class="f"><span class="l">${escape(h)}</span><span class="v">${marked.parseInline(v, { async: false })}</span></div>`,
      )
      .join('');
    const rowStatus = /^stub/i.test(statusText)
      ? 'stub'
      : /^cut/i.test(statusText)
        ? 'cut'
        : 'seeded';
    return `<div class="row ${rowStatus}"><div class="t">${marked.parseInline(title, { async: false })}${statusText ? `<span class="status ${rowStatus}">${escape(statusText)}</span>` : ''}</div>${fields}</div>`;
  });
  return `<div class="rows">${cards.join('')}</div>`;
}

/**
 * An element file, section by section: the schema collapsed as reference,
 * any other table as cards, everything else as prose.
 */
function renderElement(source: string): string {
  const body = source.replace(/^# .*\n/, '');
  const sections = body.split(/^(?=## )/m);
  return sections
    .map((section) => {
      const m = section.match(/^## (.*)\n/);
      if (!m) return renderMarkdown(section, 1);
      const title = (m[1] ?? '').trim();
      const rest = section.slice(m[0].length);
      if (/^schema$/i.test(title))
        return `<details class="schema"><summary>Schema</summary><div class="scroll">${renderMarkdown(rest, 2)}</div></details>`;
      const lines = rest.split('\n');
      const tableStart = lines.findIndex((l) => l.trim().startsWith('|'));
      if (tableStart === -1) return `<h3>${escape(title)}</h3>${renderMarkdown(rest, 2)}`;
      let tableEnd = tableStart;
      while (tableEnd < lines.length && (lines[tableEnd] ?? '').trim().startsWith('|'))
        tableEnd += 1;
      const before = lines.slice(0, tableStart).join('\n');
      const table = lines.slice(tableStart, tableEnd).map((l) => l.trim());
      const after = lines.slice(tableEnd).join('\n');
      return `<h3>${escape(title)}</h3>${renderMarkdown(before, 2)}${tableAsCards(table)}${renderMarkdown(after, 2)}`;
    })
    .join('\n');
}

function elementBlock(c: Counted): string {
  const body =
    c.source === undefined
      ? `<p class="empty">Nothing dictated yet. Say "${escape(c.element.name)}." and talk.</p>`
      : renderElement(c.source);
  return `<details class="element" id="${escape(c.element.id)}"${c.status === 'untouched' ? '' : ' open'}>
<summary><span class="t">${escape(c.element.name)}</span>${chip(c.status)}<span class="rows">${c.rows} row${c.rows === 1 ? '' : 's'}</span><span class="w">${escape(c.element.what)}</span></summary>
<div class="body">${body}</div>
</details>`;
}

export function renderMechanics(): string {
  const index = JSON.parse(
    readFileSync(join(CATALOGUE_DIR, 'index.json'), 'utf8'),
  ) as Index;
  const overview = readIfExists(join(CATALOGUE_DIR, 'overview.html')) ?? '';
  const notes = readIfExists(join(CATALOGUE_DIR, 'mechanics-notes.md')) ?? '';
  const counted = index.elements.map((e) =>
    count(e, readIfExists(join(CATALOGUE_DIR, e.file))),
  );
  updateReadme(counted, index.areas);

  const seeded = counted.filter((c) => c.status !== 'untouched').length;
  const sections = index.areas
    .map((area) => {
      const mine = counted.filter((c) => c.element.area === area.id);
      const done = mine.filter((c) => c.status !== 'untouched').length;
      return `<section class="area" id="area-${escape(area.id)}">
<h2>${escape(area.name)} <span class="count">${done}/${mine.length} started</span></h2>
${mine.map(elementBlock).join('\n')}
</section>`;
    })
    .join('\n');

  const trackerHtml = renderMarkdown(
    trackerTable(counted, index.areas).replace(/\]\(([^)]+)\.md\)/g, '](#$1)'),
    0,
  );

  const fragment = `<title>Star Race — the mechanics</title>
${FONTS}
<style>${STYLE}${PAGE_STYLE}</style>
<div class="page">
<header class="masthead">
  <div class="eyebrow"><span>Star Race</span><span>Round ${index.framework.round}</span><span>Mechanics &amp; catalogue</span></div>
  <h1>${escape(index.framework.title)}</h1>
  <p class="headline">The mechanics at a glance, then every element under each one — ${seeded} of ${counted.length} started. Rows are edited in <code>design/catalogue/</code>; this page is rendered from them.</p>
</header>
<nav class="toc">
  <a href="#overview">Overview</a>
  <a href="#tracker">Tracker</a>
${index.areas.map((a) => `  <a href="#area-${escape(a.id)}">${escape(a.name)}</a>`).join('\n')}
  <a href="#mechanics-notes">Notes</a>
  <a href="round-${String(index.framework.round).padStart(2, '0')}.html">Round ${index.framework.round}</a>
</nav>

<section id="overview">
${overview}
</section>

<section id="tracker" class="tracker">
<h2>Tracker</h2>
<div class="scroll">${trackerHtml}</div>
<p class="caption"><b>untouched</b> — nothing dictated · <b>partial</b> — some rows are stubs · <b>seeded</b> — every row has a sentence. Derived from the files, not typed.</p>
</section>

${sections}

<section id="mechanics-notes" class="notes-section">
<h2>Mechanics notes</h2>
<div class="scroll">${renderMarkdown(notes.replace(/^# .*\n/, ''), 1)}</div>
</section>

<footer>Rendered from <code>${CATALOGUE_DIR}/</code> by <code>npm run mechanics-page</code>. The framework is <a href="round-${String(index.framework.round).padStart(2, '0')}.html">round ${index.framework.round}</a>.</footer>
</div>`;

  mkdirSync(PAGES_DIR, { recursive: true });
  const out = join(PAGES_DIR, 'mechanics.html');
  writeFileSync(out, wrapDocument(fragment));
  return out;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('scripts/mechanics-page.ts')) {
  console.log(
    `Wrote ${renderMechanics()} and updated ${join(CATALOGUE_DIR, 'README.md')}.`,
  );
}
