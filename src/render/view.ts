// What the renderer is given, and the few things every view of it shares.
//
// Kept apart from the views themselves so the chase camera and the map can
// both read it without importing each other.

import type { SwingEvent } from '../sim/race';
import type { Environment, Properties } from '../sim/track';

/**
 * One ship as the screen needs it. The renderer reads this and nothing else,
 * so it does not care whether the race is being stepped live or played back
 * from a film that was computed before any of it was shown.
 */
export interface ShipView {
  readonly distance: number;
  /** Which way through the current sector: the same distance is a different place. */
  readonly route: number;
  readonly offset: number;
  readonly wide: boolean;
  readonly isPlayer: boolean;
  /** Where it has just been, oldest first. */
  readonly wake: readonly { distance: number; offset: number; route: number }[];
  /** The bends that threw it, for the marks left behind. */
  readonly swings: readonly SwingEvent[];
  /** The lane it has just shot at, so the shot can be drawn going somewhere. */
  readonly shotAt: number | undefined;
  /** How recently something landed on it, 1 at the moment of the hit down to 0. */
  readonly struck: number;
}

/** Something somebody left on the track, as the screen needs it. */
export interface FixtureView {
  readonly kind: 'mine' | 'black-hole';
  readonly distance: number;
  readonly route: number;
  readonly offset: number;
  /** True for a fixture the player laid, which is drawn as theirs. */
  readonly mine: boolean;
}

/** What the player knows about the route, which decides how the splits are drawn. */
export interface RouteView {
  /** The way through each sector the player means to take. */
  readonly planned: readonly number[];
  /** How far the player's navigation reads. */
  readonly nav: number;
}

/** A rectangle of the canvas, for a view that does not get the whole of it. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** One colour per lane of the field. The player is always the first. */
export const SHIP_COLOURS = ['#7ee0ff', '#f0a868', '#b48cff'] as const;

export const SHIP_WIDE = '#ff7a6b';
export const PATH = '#ffd166';

/** A mine reads as a warning; a black hole reads as a hole. */
export const MINE = '#ff5f7a';
export const HOLE = '#9b6bff';

/**
 * What each environment looks like, in one place.
 *
 * The map, the chase camera and the track builder all draw the same road and
 * had better draw it the same colour — three copies of this table was three
 * chances for a nebula to be one thing from above and another from behind.
 */
export const ENVIRONMENT_COLOURS: Record<Environment, string> = {
  open: '#7ee0ff',
  nebula: '#a882ff',
  debris: '#ff965a',
  shadow: '#0a0e20',
};

/** A stretch that pays, and one that bites. Edging rather than ground. */
export const POCKET = '#6ee7a8';
export const HAZARD = '#ff783c';

/**
 * What a stretch calls itself on screen. Short, because it is drawn floating
 * over the road at whatever size the distance allows.
 */
export function labelOf(properties: Properties | undefined): string {
  if (properties === undefined) return '';
  const parts: string[] = [];
  const environment = properties.environment ?? 'open';
  if (environment !== 'open') parts.push(environment.toUpperCase());
  if ((properties.pocket ?? 0) > 0) parts.push(`pays ${properties.pocket}`);
  if ((properties.hazard ?? 0) > 0) parts.push(`bites ${properties.hazard}`);
  return parts.join(' · ');
}

/** A shot in flight, and the flash where it lands. */
export const SHOT = '#ffe08a';

/** A hex colour at an alpha, so one palette serves lines and fills. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
