// The track builder.
//
// A tool, not part of the game: its own page, its own entry point, nothing in
// the race imports it. What it does is the four things the owner's framework
// asks for — pick pieces from a catalogue, combine them into sectors, fill the
// gap so the circuit closes, and hand back something that can be pasted into
// `track.ts` beside the three tracks that ship.

import { CATALOGUE } from '../sim/catalogue';
import { spanOf } from '../sim/section';
import { KESTREL_LOOP, MERIDIAN_RUN, CINDER_COIL, type Grade } from '../sim/track';
import { drawDraft } from './draw';
import { sourceOf } from './export';
import {
  closeRing,
  closure,
  draftPiece,
  newDraft,
  piecesFrom,
  piecesOfSector,
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
    ring: track.sectors.map((sector, i) => ({
      id: `sector-${i + 1}`,
      name: sector.routes[0]?.name ?? `Sector ${i + 1}`,
      pieces: [],
    })),
    splits: [],
  };
  // Walk the golden path's pieces back out of the track's own bend list.
  track.sectors.forEach((sector, i) => {
    const target = draft.ring[i];
    if (target === undefined) return;
    target.name = `Sector ${i + 1}`;
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

function render(): void {
  const state = closure(draft);
  const track = trackOf(draft);
  const total = draft.ring.reduce((n, s) => n + spanOf(piecesOfSector(s)), 0);

  const shelf = CATALOGUE.map(
    (entry) => `<button type="button" data-add="${entry.id}" title="${entry.hint}">
      ${entry.name}</button>`,
  ).join('');

  const sectorRows = draft.ring
    .map((sector, i) => {
      const span = spanOf(piecesOfSector(sector));
      return `<div class="row${i === selected ? ' on' : ''}" data-pick="${i}">
        <span class="n">${i + 1}</span>
        <span class="t">${sector.name}<em>${sector.pieces.length} pieces · ${span.toFixed(0)} units</em></span>
        <button type="button" data-drop="${i}" title="Remove this sector">×</button>
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
            </div>`;
          })
          .join('');

  const splitRows = draft.splits
    .map((split, i) => {
      const ok = splitPieces(draft, split) !== undefined;
      return `<div class="row${ok ? '' : ' bad'}">
        <span class="n">${split.from + 1}</span>
        <span class="t">${split.name}<em>${ok ? `${split.grade} · comes home at r${split.radius}` : 'cannot reach the next checkpoint'}</em></span>
        <button type="button" data-unsplit="${i}">×</button>
      </div>`;
    })
    .join('');

  panel.innerHTML = `
    <div class="bar">
      <input id="name" value="${draft.name}" />
      <button type="button" id="new">New</button>
      <button type="button" data-load="kestrel">Kestrel</button>
      <button type="button" data-load="meridian">Meridian</button>
      <button type="button" data-load="cinder">Cinder</button>
    </div>

    <div class="state ${state.closed ? 'good' : 'open'}">
      ${
        state.closed
          ? `Closed circuit · ${total.toFixed(0)} units · ${draft.ring.length} sectors${
              track === undefined ? '' : ` · par ${seconds(draft.par)}`
            }`
          : `Open · ${state.gap.toFixed(0)} units and ${((state.turn * 180) / Math.PI).toFixed(0)}° from the line`
      }
      ${state.closed ? '' : '<button type="button" id="close">Close the loop</button>'}
    </div>

    <h3>Sectors</h3>
    <div class="rows">${sectorRows}</div>
    <button type="button" id="add-sector" class="wide">Add a sector</button>

    <h3>Sector ${selected + 1}: pieces</h3>
    <div class="shelf">${shelf}</div>
    <div class="pieces">${pieceRows || '<p class="empty">No pieces yet. Add one from the shelf.</p>'}</div>

    <h3>Splits</h3>
    <div class="rows">${splitRows || '<p class="empty">No splits. A split is a second road between the same two checkpoints.</p>'}</div>
    <button type="button" id="add-split" class="wide"${draft.ring.length < 2 ? ' disabled' : ''}>Add a split to sector ${selected + 1}</button>

    <h3>Export</h3>
    <textarea id="out" readonly rows="10">${sourceOf(draft)}</textarea>
  `;
  resize();
}

panel.addEventListener('input', (event) => {
  const el = event.target as HTMLInputElement;
  if (el.id === 'name') {
    draft.name = el.value;
    const out = document.getElementById('out') as HTMLTextAreaElement | null;
    if (out !== null) out.value = sourceOf(draft);
    return;
  }
  const knob = el.dataset['knob'];
  if (knob === undefined) return;
  const [index, key] = knob.split(':');
  const sector = draft.ring[selected];
  const piece = sector?.pieces[Number(index)];
  if (sector === undefined || piece === undefined || key === undefined) return;
  sector.pieces[Number(index)] = turnKnob(piece, key, Number(el.value));
  render();
});

panel.addEventListener('click', (event) => {
  const el = (event.target as HTMLElement).closest('button, [data-pick]') as HTMLElement | null;
  if (el === null) return;
  const d = el.dataset;
  const sector = draft.ring[selected];

  if (el.id === 'new') { draft = newDraft(); selected = 0; render(); return; }
  if (d['load'] !== undefined) { load(d['load'] as 'kestrel'); return; }
  if (el.id === 'close') {
    if (!closeRing(draft)) window.alert('No way home at any radius. Try another piece first.');
    render();
    return;
  }
  if (el.id === 'add-sector') {
    draft.ring.push({
      id: `sector-${draft.ring.length + 1}`,
      name: `Sector ${draft.ring.length + 1}`,
      pieces: [],
    });
    selected = draft.ring.length - 1;
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
    draft.ring.splice(Number(d['drop']), 1);
    // A split hangs off a checkpoint by index, so removing a sector takes the
    // splits that pointed past the end with it rather than leaving them adrift.
    draft.splits = draft.splits.filter((s) => s.from < draft.ring.length);
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
