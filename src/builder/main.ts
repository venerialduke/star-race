// The track builder.
//
// A tool, not part of the game: its own page, its own entry point, nothing in
// the race imports it. What it does is the four things the owner's framework
// asks for — pick pieces from a catalogue, combine them into sectors, fill the
// gap so the circuit closes, and hand back something that can be pasted into
// `track.ts` beside the three tracks that ship.
//
// Since properties started meaning something it does a fifth: say what a
// stretch of road is *like*, at the sector or at the piece, and put things on
// it. Which is why this file now draws its panel in two parts. Rebuilding the
// whole panel on every `input` event destroyed the slider being dragged, so
// every knob in the old builder was click-to-set rather than drag — bearable
// with two sliders a piece and not with six. `render` rebuilds; `touch` updates
// the few things a drag changes and leaves the controls alone.

import { CATALOGUE } from '../sim/catalogue';
import { spanOf } from '../sim/section';
import {
  ENVIRONMENT_NAMES,
  KESTREL_LOOP,
  MERIDIAN_RUN,
  CINDER_COIL,
  effectOf,
  type Grade,
  type Properties,
} from '../sim/track';
import { drawDraft } from './draw';
import { sourceOf } from './export';
import {
  closeRing,
  closure,
  draftPiece,
  dropSector,
  insertSector,
  newDraft,
  newFixture,
  piecesFrom,
  piecesOfSector,
  roadsOf,
  setProperty,
  splitPieces,
  trackOf,
  turnKnob,
  asDraft,
  type Draft,
} from './plan';

const canvas = document.getElementById('board') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
const panel = document.getElementById('panel') as HTMLElement;

let draft: Draft = newDraft();
let selected = 0;

/** Load one of the tracks that ship, so there is something real to pull at. */
function load(which: 'kestrel' | 'meridian' | 'cinder'): void {
  const track = { kestrel: KESTREL_LOOP, meridian: MERIDIAN_RUN, cinder: CINDER_COIL }[
    which
  ];
  // Sectors come back; splits do not. A split's pieces are the connector's
  // answer rather than the lead it was authored from, and reading a lead back
  // out of an answer is guesswork — so they are left behind rather than faked.
  draft = {
    name: track.name,
    shape: track.shape,
    par: track.par,
    ring: track.sectors.map((_, i) => ({
      id: `sector-${i + 1}`,
      name: `Sector ${i + 1}`,
      pieces: [],
    })),
    splits: [],
    // A fixture hangs off a sector and a road, and the roads do not come back.
    fixtures: [],
  };
  // Walk the golden path's pieces back out of the track's own bend list.
  track.sectors.forEach((sector, i) => {
    const target = draft.ring[i];
    if (target === undefined) return;
    target.pieces = piecesFrom(track, sector.start, sector.end).map(asDraft);
  });
  selected = 0;
  render();
}

function resize(): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawDraft(ctx, draft, selected, rect.width, rect.height);
}

const seconds = (ticks: number): string => `${(ticks / 60).toFixed(1)}s`;
const esc = (text: string): string =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

/** How a stretch reads, in one line, from what its properties come to. */
function reads(properties: Properties | undefined): string {
  const effect = effectOf(properties);
  const parts: string[] = [];
  if (effect.grip !== 1) parts.push(`grip ×${effect.grip}`);
  if (effect.sight !== 1) parts.push(`sight ×${effect.sight}`);
  if (effect.hazard > 0) parts.push(`bites ${effect.hazard}`);
  if (effect.pocket > 0) parts.push(`pays ${effect.pocket}`);
  return parts.length === 0 ? 'clear road' : parts.join(' · ');
}

/**
 * The three property controls, for a sector or for one piece. `scope` is what
 * comes back on the event, so the same markup serves both.
 */
function properties(scope: string, held: Properties | undefined): string {
  const options = ENVIRONMENT_NAMES.map(
    (name) =>
      `<option value="${name}"${(held?.environment ?? 'open') === name ? ' selected' : ''}>${name}</option>`,
  ).join('');
  const slider = (key: 'pocket' | 'hazard', max: number): string =>
    `<label>${key}
      <input type="range" data-prop="${scope}:${key}" min="0" max="${max}" step="1"
        value="${held?.[key] ?? 0}" />
      <b>${held?.[key] ?? 0}</b></label>`;
  return `<div class="props">
    <label>around<select data-prop="${scope}:environment">${options}</select><b></b></label>
    ${slider('pocket', 20)}
    ${slider('hazard', 20)}
    <p class="says">${reads(held)}</p>
  </div>`;
}

function stateHtml(): string {
  const state = closure(draft);
  const track = trackOf(draft);
  const total = draft.ring.reduce((n, s) => n + spanOf(piecesOfSector(s)), 0);
  return `<div id="state" class="state ${state.closed ? 'good' : 'open'}">
    ${
      state.closed
        ? `Closed circuit · ${total.toFixed(0)} units · ${draft.ring.length} sectors${
            track === undefined ? '' : ` · par ${seconds(draft.par)}`
          }`
        : `Open · ${state.gap.toFixed(0)} units and ${((state.turn * 180) / Math.PI).toFixed(0)}° from the line`
    }
    ${state.closed ? '' : '<button type="button" id="close">Close the loop</button>'}
  </div>`;
}

function render(): void {
  const shelf = CATALOGUE.map(
    (entry) => `<button type="button" data-add="${entry.id}" title="${esc(entry.hint)}">
      ${entry.name}</button>`,
  ).join('');

  const sectorRows = draft.ring
    .map((sector, i) => {
      const span = spanOf(piecesOfSector(sector));
      return `<div class="row${i === selected ? ' on' : ''}" data-pick="${i}">
        <span class="n">${i + 1}</span>
        <span class="t">${esc(sector.name)}<em>${sector.pieces.length} pieces · ${span.toFixed(0)} units · ${reads(sector.properties)}</em></span>
        <span class="acts">
          <button type="button" data-insert="${i}"
            title="Put a new sector here, pushing this one and everything after it down">+</button>
          <button type="button" data-drop="${i}" title="Remove this sector">×</button>
        </span>
      </div>`;
    })
    .join('');

  const here = draft.ring[selected];
  const pieceRows =
    here === undefined
      ? ''
      : here.pieces
          .map((piece, i) => {
            const entry = CATALOGUE.find((e) => e.id === piece.entryId);
            const knobs = (entry?.knobs ?? [])
              .map(
                (knob) => `<label>${knob.name}
                  <input type="range" data-knob="${i}:${knob.key}"
                    min="${knob.min}" max="${knob.max}" step="${knob.step}"
                    value="${piece.values[knob.key] ?? knob.min}" />
                  <b>${Math.round(piece.values[knob.key] ?? knob.min)}</b></label>`,
              )
              .join('');
            return `<div class="piece">
              <div class="phead">
                <span>${entry?.name ?? piece.entryId}</span>
                ${entry?.turns === true ? `<button type="button" data-flip="${i}">${piece.turn === 1 ? 'left' : 'right'}</button>` : ''}
                <button type="button" data-cut="${i}">×</button>
              </div>
              ${knobs}
              ${properties(`piece:${i}`, piece.properties)}
            </div>`;
          })
          .join('');

  const splitRows = draft.splits
    .map((split, i) => {
      const ok = splitPieces(draft, split) !== undefined;
      return `<div class="row${ok ? '' : ' bad'}">
        <span class="n">${split.from + 1}</span>
        <span class="t">${esc(split.name)}<em>${ok ? `${split.grade} · comes home at r${split.radius}` : 'cannot reach the next checkpoint'}</em></span>
        <button type="button" data-unsplit="${i}">×</button>
      </div>`;
    })
    .join('');

  const fixtureRows = draft.fixtures
    .map((fixture, i) => {
      const roads = roadsOf(draft, fixture.sector);
      const road = roads[fixture.route]?.name ?? 'a road that is gone';
      const roadOptions = roads
        .map(
          (r, j) =>
            `<option value="${j}"${j === fixture.route ? ' selected' : ''}>${esc(r.name)}</option>`,
        )
        .join('');
      const sectorOptions = draft.ring
        .map(
          (_, j) =>
            `<option value="${j}"${j === fixture.sector ? ' selected' : ''}>Sector ${j + 1}</option>`,
        )
        .join('');
      return `<div class="piece">
        <div class="phead">
          <span>${fixture.kind === 'mine' ? 'Mine' : 'Black hole'} on ${esc(road)}</span>
          <button type="button" data-swap="${i}">${fixture.kind === 'mine' ? 'make a hole' : 'make a mine'}</button>
          <button type="button" data-unfix="${i}">×</button>
        </div>
        <label>sector<select data-fix="${i}:sector">${sectorOptions}</select><b></b></label>
        <label>road<select data-fix="${i}:route">${roadOptions}</select><b></b></label>
        <label>along
          <input type="range" data-fix="${i}:at" min="0" max="100" step="1"
            value="${Math.round(fixture.at * 100)}" />
          <b>${Math.round(fixture.at * 100)}%</b></label>
        <label>across
          <input type="range" data-fix="${i}:offset" min="-26" max="26" step="1"
            value="${fixture.offset}" />
          <b>${fixture.offset}</b></label>
        <label>power
          <input type="range" data-fix="${i}:power" min="0" max="80" step="1"
            value="${fixture.power}" />
          <b>${fixture.power}</b></label>
      </div>`;
    })
    .join('');

  panel.innerHTML = `
    <div class="bar">
      <input id="name" value="${esc(draft.name)}" />
      <button type="button" id="new">New</button>
      <button type="button" data-load="kestrel">Kestrel</button>
      <button type="button" data-load="meridian">Meridian</button>
      <button type="button" data-load="cinder">Cinder</button>
    </div>

    ${stateHtml()}

    <h3>Sectors</h3>
    <div class="rows">${sectorRows}</div>
    <button type="button" id="add-sector" class="wide">Add a sector at the end</button>
    <p class="hint">+ puts a new sector <em>before</em> that row. The ring is a loop,
      so the end of it is the road just before the start line.</p>

    <h3>Sector ${selected + 1}: the whole stretch</h3>
    ${here === undefined ? '<p class="empty">No sector selected.</p>' : properties('sector', here.properties)}
    <p class="hint">Every piece below inherits this. A piece can override any one
      field of it without cancelling the rest.</p>

    <h3>Sector ${selected + 1}: pieces</h3>
    <div class="shelf">${shelf}</div>
    <div class="pieces">${pieceRows || '<p class="empty">No pieces yet. Add one from the shelf.</p>'}</div>

    <h3>Splits</h3>
    <div class="rows">${splitRows || '<p class="empty">No splits. A split is a second road between the same two checkpoints.</p>'}</div>
    <button type="button" id="add-split" class="wide"${draft.ring.length < 2 ? ' disabled' : ''}>Add a split to sector ${selected + 1}</button>

    <h3>Fixtures</h3>
    <div class="pieces">${fixtureRows || '<p class="empty">Nothing on the road. A fixture is the track’s own, so it bites everyone.</p>'}</div>
    <button type="button" id="add-fixture" class="wide">Put something on sector ${selected + 1}</button>

    <h3>Export</h3>
    <textarea id="out" readonly rows="10">${esc(sourceOf(draft))}</textarea>
  `;
  resize();
}

/**
 * What a drag changes, without rebuilding the controls: the number beside the
 * slider, the state line, the export, and the picture.
 */
function touch(el: HTMLElement, shows: string): void {
  const out = el.closest('label')?.querySelector('b');
  if (out != null) out.textContent = shows;
  const source = document.getElementById('out') as HTMLTextAreaElement | null;
  if (source !== null) source.value = sourceOf(draft);
  const state = document.getElementById('state');
  if (state !== null) state.outerHTML = stateHtml();
  resize();
}

type Field = 'environment' | 'pocket' | 'hazard';
const isField = (key: string): key is Field =>
  key === 'environment' || key === 'pocket' || key === 'hazard';

/** One field of one property set, wherever it lives. */
function editProperty(scope: string, key: string, raw: string): Properties | undefined {
  const sector = draft.ring[selected];
  if (sector === undefined || !isField(key)) return undefined;
  const value = key === 'environment' ? raw : Number(raw);
  if (scope === 'sector') {
    sector.properties = setProperty(sector.properties, key, value);
    return sector.properties;
  }
  const index = Number(scope.slice('piece:'.length));
  const piece = sector.pieces[index];
  if (piece === undefined) return undefined;
  const next = setProperty(piece.properties, key, value);
  if (next === undefined) {
    // Back to saying nothing: the field goes away rather than becoming a zero,
    // so the piece exports as a bare shape again.
    const { properties: _cleared, ...bare } = piece;
    void _cleared;
    sector.pieces[index] = bare;
  } else {
    sector.pieces[index] = { ...piece, properties: next };
  }
  return next;
}

function edit(event: Event): void {
  const el = event.target as HTMLInputElement | HTMLSelectElement;

  if (el.id === 'name') {
    draft.name = el.value;
    touch(el, '');
    return;
  }

  const knob = (el as HTMLInputElement).dataset['knob'];
  if (knob !== undefined) {
    const [index, key] = knob.split(':');
    const sector = draft.ring[selected];
    const piece = sector?.pieces[Number(index)];
    if (sector === undefined || piece === undefined || key === undefined) return;
    sector.pieces[Number(index)] = turnKnob(piece, key, Number(el.value));
    // The knob may have been held to what the family allows, so the readout
    // comes from the piece rather than from what the slider was dragged to.
    const held = sector.pieces[Number(index)]?.values[key] ?? Number(el.value);
    touch(el, String(Math.round(held)));
    return;
  }

  const prop = el.dataset['prop'];
  if (prop !== undefined) {
    const at = prop.lastIndexOf(':');
    const scope = prop.slice(0, at);
    const key = prop.slice(at + 1);
    const next = editProperty(scope, key, el.value);
    // An environment changes what the whole block says about itself, so that
    // one gets the full rebuild; a slider does not.
    if (key === 'environment') render();
    else touch(el, el.value);
    if (key !== 'environment') {
      const says = el.closest('.props')?.querySelector('.says');
      if (says != null) says.textContent = reads(next);
    }
    return;
  }

  const fix = el.dataset['fix'];
  if (fix !== undefined) {
    const [index, key] = fix.split(':');
    const fixture = draft.fixtures[Number(index)];
    if (fixture === undefined || key === undefined) return;
    const value = Number(el.value);
    if (key === 'at') {
      fixture.at = value / 100;
      touch(el, `${value}%`);
    } else if (key === 'sector') {
      // A fixture moved to another sector keeps only a road that exists there.
      fixture.sector = value;
      fixture.route = 0;
      render();
    } else if (key === 'route') {
      fixture.route = value;
      render();
    } else if (key === 'offset') {
      fixture.offset = value;
      touch(el, String(value));
    } else {
      fixture.power = value;
      touch(el, String(value));
    }
    return;
  }
}

panel.addEventListener('input', edit);
// A `select` fires `change` on every browser and `input` on most. Both are
// wired because the cost of running the handler twice is one wasted render.
panel.addEventListener('change', edit);

panel.addEventListener('click', (event) => {
  const el = (event.target as HTMLElement).closest(
    'button, [data-pick]',
  ) as HTMLElement | null;
  if (el === null) return;
  const d = el.dataset;
  const sector = draft.ring[selected];

  if (el.id === 'new') {
    draft = newDraft();
    selected = 0;
    render();
    return;
  }
  if (d['load'] !== undefined) {
    load(d['load'] as 'kestrel');
    return;
  }
  if (el.id === 'close') {
    if (!closeRing(draft))
      window.alert('No way home at any radius. Try another piece first.');
    render();
    return;
  }
  if (el.id === 'add-sector') {
    selected = insertSector(draft, draft.ring.length);
    render();
    return;
  }
  if (d['insert'] !== undefined) {
    // Select the new one: the reason to put a sector somewhere is to fill it.
    selected = insertSector(draft, Number(d['insert']));
    render();
    return;
  }
  if (el.id === 'add-split') {
    draft.splits.push({
      id: `${draft.name.toLowerCase().replace(/\W+/g, '-')}-split-${draft.splits.length + 1}`,
      name: `A way round sector ${selected + 1}`,
      from: selected,
      grade: 'clear' as Grade,
      lead: [draftPiece('sweeper', -1)],
      radius: 85,
    });
    render();
    return;
  }
  if (el.id === 'add-fixture') {
    draft.fixtures.push(newFixture(draft, selected));
    render();
    return;
  }
  if (d['swap'] !== undefined) {
    const fixture = draft.fixtures[Number(d['swap'])];
    if (fixture !== undefined) {
      fixture.kind = fixture.kind === 'mine' ? 'black-hole' : 'mine';
    }
    render();
    return;
  }
  if (d['unfix'] !== undefined) {
    draft.fixtures.splice(Number(d['unfix']), 1);
    render();
    return;
  }
  if (d['add'] !== undefined && sector !== undefined) {
    sector.pieces.push(draftPiece(d['add']));
    render();
    return;
  }
  if (d['cut'] !== undefined && sector !== undefined) {
    sector.pieces.splice(Number(d['cut']), 1);
    render();
    return;
  }
  if (d['flip'] !== undefined && sector !== undefined) {
    const piece = sector.pieces[Number(d['flip'])];
    if (piece !== undefined) {
      sector.pieces[Number(d['flip'])] = { ...piece, turn: piece.turn === 1 ? -1 : 1 };
    }
    render();
    return;
  }
  if (d['drop'] !== undefined) {
    dropSector(draft, Number(d['drop']));
    selected = Math.min(selected, Math.max(0, draft.ring.length - 1));
    render();
    return;
  }
  if (d['unsplit'] !== undefined) {
    draft.splits.splice(Number(d['unsplit']), 1);
    render();
    return;
  }
  if (d['pick'] !== undefined) {
    selected = Number(d['pick']);
    render();
  }
});

window.addEventListener('resize', resize);
render();
