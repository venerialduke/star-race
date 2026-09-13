// What the run looked like, in one block on the console.
//
// This is for whoever is tuning the game, not for the player: it answers the
// questions the screen cannot. Were the timing windows fair — how many taps were
// wasted on a cooldown? Did the player see the burst coming, or eat it? Was the
// race close, or was Redline gone by stage two?
//
// The report is built as plain lines so it can be tested; printing it is one
// line at the end.

import { runStandings, totalDamage, totalTicks, wonRun, type Run } from '../sim/run';
import { stages } from '../sim/track';
import { TICK_RATE } from '../sim/tuning';

const seconds = (ticks: number): string => `${(ticks / TICK_RATE).toFixed(1)}s`;

/** What the player did with their thumbs, and what it got them. */
export interface StageTelemetry {
  readonly stage: number;
  readonly position: number;
  readonly finishTicks: number;
  readonly survived: boolean;
  readonly damageTaken: number;
  readonly damageAbsorbed: number;
  readonly overheatedTicks: number;
  /** Taps that fired. */
  readonly tapsFired: number;
  /** Taps that hit a cooldown and were thrown away. */
  readonly tapsWasted: number;
  /** One-shot hazards that landed on the ship. */
  readonly burstsMet: number;
  /** How many of those the ship was covered for. */
  readonly burstsShielded: number;
}

/** Pull the numbers for one stage out of its race log. */
export function stageTelemetry(run: Run, stage: number): StageTelemetry | undefined {
  const result = run.results[stage];
  if (result === undefined) return undefined;
  const { log } = result.outcome;
  const bursts = log.filter((event) => event.kind === 'hazardFired');
  return {
    stage,
    position: result.position,
    finishTicks: result.outcome.finishTicks,
    survived: result.outcome.survived,
    damageTaken: result.outcome.damageTaken,
    damageAbsorbed: result.outcome.damageAbsorbed,
    overheatedTicks: result.outcome.overheatedTicks,
    tapsFired: log.filter((event) => event.kind === 'activeFired').length,
    tapsWasted: log.filter((event) => event.kind === 'activeIgnored').length,
    burstsMet: bursts.length,
    burstsShielded: bursts.filter((event) => event.shielded === true).length,
  };
}

/** The whole run as lines of text, ready to print. */
export function runReport(run: Run): string[] {
  const stageCount = stages(run.track).length;
  const lines: string[] = [];

  lines.push(`Star Race — run ${run.seed}`);
  lines.push(
    wonRun(run)
      ? `Won: ${seconds(totalTicks(run))} over ${run.results.length} stages`
      : run.alive
        ? `Beaten: ${seconds(totalTicks(run))} over ${run.results.length} stages`
        : `Lost in stage ${run.results.length}` +
          (run.results[run.results.length - 1]?.outcome.lostTo === undefined
            ? ''
            : ` to ${run.results[run.results.length - 1]?.outcome.lostTo}`),
  );

  for (let stage = 0; stage < stageCount; stage++) {
    const telemetry = stageTelemetry(run, stage);
    if (telemetry === undefined) {
      lines.push(`  stage ${stage + 1}: not reached`);
      continue;
    }
    lines.push(
      `  stage ${stage + 1}: ${telemetry.survived ? `${telemetry.position}${['st', 'nd', 'rd'][telemetry.position - 1] ?? 'th'}` : 'lost'}` +
        ` ${seconds(telemetry.finishTicks)}` +
        ` · hull -${Math.round(telemetry.damageTaken)}` +
        ` · shields +${Math.round(telemetry.damageAbsorbed)}` +
        ` · bursts ${telemetry.burstsShielded}/${telemetry.burstsMet} covered` +
        ` · taps ${telemetry.tapsFired} fired, ${telemetry.tapsWasted} wasted` +
        (telemetry.overheatedTicks > 0
          ? ` · cooked ${telemetry.overheatedTicks} ticks`
          : ''),
    );
  }

  lines.push(`  damage over the run: ${Math.round(totalDamage(run))}`);
  lines.push('  field:');
  runStandings(run).forEach((entry) => {
    lines.push(
      `    ${entry.position}. ${entry.name} — ${seconds(entry.totalTicks)}, ` +
        `${entry.stagesFinished}/${stageCount} stages`,
    );
  });
  lines.push(
    `  ship: ${run.build.length === 0 ? 'nothing bolted on' : run.build.map((part) => part.name).join(', ')}`,
  );

  return lines;
}

/** Print the report. Called once, when a run ends. */
export function logRun(run: Run): void {
  console.log(runReport(run).join('\n'));
}
