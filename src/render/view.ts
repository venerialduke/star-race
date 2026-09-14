// What the renderer is given, and the few things every view of it shares.
//
// Kept apart from the views themselves so the chase camera and the map can
// both read it without importing each other.

import type { SwingEvent } from '../sim/race';

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

/** A hex colour at an alpha, so one palette serves lines and fills. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
