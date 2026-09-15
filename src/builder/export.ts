// A draft, written out as the TypeScript that would have authored it.
//
// This is the only output the builder has, and it matters that it is source
// rather than data: a track in this game is *level data in code*, sitting in
// `track.ts` beside the three that ship, reviewed in a diff like everything
// else. A builder that emitted JSON would need a loader, and the loader would
// be a second way a track can exist.
//
// A split is written as the lead it was authored from and the radius it comes
// home at, not as the pieces that came out — because that is what a reader can
// change. The pieces are the connector's answer, and the connector can be asked
// again.

import { entryOf } from '../sim/catalogue';
import { saysNothing, type Piece, type Properties } from '../sim/track';
import {
  pieceOf,
  type Draft,
  type DraftFixture,
  type DraftPiece,
  type DraftSector,
} from './plan';

const round = (n: number): string => {
  const r = Math.round(n * 100) / 100;
  return Number.isInteger(r) ? String(r) : r.toFixed(2);
};

/**
 * Properties as an object literal, or empty when the stretch says nothing.
 *
 * Nothing is written for a stretch that has no opinion, which is what keeps a
 * plain track's export exactly as short as it was before any of this existed.
 */
const propsSource = (properties: Properties | undefined): string => {
  if (saysNothing(properties) || properties === undefined) return '';
  const parts: string[] = [];
  if (properties.environment !== undefined && properties.environment !== 'open') {
    parts.push(`environment: '${properties.environment}'`);
  }
  if ((properties.pocket ?? 0) !== 0) parts.push(`pocket: ${round(properties.pocket ?? 0)}`);
  if ((properties.hazard ?? 0) !== 0) parts.push(`hazard: ${round(properties.hazard ?? 0)}`);
  return `{ ${parts.join(', ')} }`;
};

// A piece with properties is written through `P`, which is `S`/`B` with a
// second argument — so the common case stays a bare `S(260)` and only the
// pieces that say something pay for saying it.
const pieceSource = (piece: Piece): string => {
  const shape =
    piece.kind === 'straight'
      ? `S(${round(piece.length)})`
      : `B(${round(piece.radius)}, ${round(piece.sweep)})`;
  const props = propsSource(piece.properties);
  return props === '' ? shape : `P(${shape}, ${props})`;
};

const sectorSource = (sector: DraftSector): string => {
  const pieces = sector.pieces.map((p) => pieceSource(pieceOf(p))).join(', ');
  const props = propsSource(sector.properties);
  const tail = props === '' ? '' : `, ${props}`;
  return `  sector('${sector.id}', '${sector.name.replace(/'/g, "\\'")}', [${pieces}]${tail}),`;
};

const fixtureSource = (fixture: DraftFixture): string =>
  `    { id: '${fixture.id}', kind: '${fixture.kind}', sector: ${fixture.sector}, ` +
  `route: ${fixture.route}, at: ${round(fixture.at)}, offset: ${round(fixture.offset)}, ` +
  `power: ${round(fixture.power)} },`;

const leadSource = (lead: readonly DraftPiece[]): string =>
  `[${lead.map((p) => pieceSource(pieceOf(p))).join(', ')}]`;

/** The identifier a ring gets, from the track's name. */
const ringName = (name: string): string =>
  `${name.replace(/[^A-Za-z0-9]+/g, '_').replace(/_+$/, '').toUpperCase()}_RING`;

export function sourceOf(draft: Draft): string {
  const ring = ringName(draft.name);
  const sectors = draft.ring.map(sectorSource).join('\n');

  const splits = draft.splits
    .map((split) => {
      const entry = split.lead.map((p) => entryOf(p.entryId)?.name ?? '?').join(' then ');
      return `    {
      from: ${split.from},
      grade: '${split.grade}',
      // ${entry || 'straight out'}, then the connector brings it home.
      sector: splitThrough(
        ${ring},
        ${split.from},
        '${split.id}',
        '${split.name.replace(/'/g, "\\'")}',
        ${leadSource(split.lead)},
        ${round(split.radius)},
      ),
    },`;
    })
    .join('\n');

  const fixtures = draft.fixtures.map(fixtureSource).join('\n');

  return `const ${ring}: readonly Section[] = [
${sectors}
];

export const ${ringName(draft.name).replace('_RING', '')} = assemblePlan({
  name: '${draft.name.replace(/'/g, "\\'")}',
  shape: '${draft.shape.replace(/'/g, "\\'")}',
  par: ${Math.round(draft.par)},
  ring: ${ring},${
    splits === ''
      ? ''
      : `
  splits: [
${splits}
  ],`
  }${
    fixtures === ''
      ? ''
      : `
  fixtures: [
${fixtures}
  ],`
  }
});
`;
}
