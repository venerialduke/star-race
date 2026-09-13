// The design-round page renderer, on a made-up round. Nothing here touches
// design/ or public/; it only checks the page comes out with the right parts in
// the right order and nothing unescaped.

import { describe, expect, it } from 'vitest';
import { renderFragment, type RoundData } from '../scripts/design-page';

const criteria = (n: number) => ({
  buildFantasy: n,
  tradeoffs: n,
  interaction: n,
  stakes: n,
  legibility: n,
  fit: n,
  buildable: n,
  measurable: n,
});

const round: RoundData = {
  round: 7,
  date: '2026-09-06',
  title: 'Salvage & Standing',
  headline: 'Eight ships, nine heats, and a scrapyard between each.',
  builtFrom: 'alpha',
  proposals: [
    {
      slug: 'alpha',
      title: 'Alpha <One>',
      oneLiner: 'The first & best.',
      file: 'proposals/alpha.md',
    },
    {
      slug: 'beta',
      title: 'Beta',
      oneLiner: 'The other one.',
      file: 'proposals/beta.md',
    },
  ],
  reviews: [
    {
      lens: 'Fun',
      file: 'reviews/fun.md',
      recommendedBase: 'alpha',
      grafts: ['the scrapyard'],
      scores: [
        {
          slug: 'alpha',
          criteria: criteria(4),
          total: 32,
          bestIdea: 'Scrapyard',
          fatalFlaw: '',
        },
        {
          slug: 'beta',
          criteria: criteria(2),
          total: 16,
          bestIdea: 'Pacing lap',
          fatalFlaw: 'No economy',
        },
      ],
    },
    {
      lens: 'Engineering',
      file: 'reviews/engineering.md',
      recommendedBase: 'beta',
      grafts: [],
      scores: [
        {
          slug: 'alpha',
          criteria: criteria(3),
          total: 24,
          bestIdea: 'Scrapyard',
          fatalFlaw: '',
        },
        {
          slug: 'beta',
          criteria: criteria(5),
          total: 40,
          bestIdea: 'Everything',
          fatalFlaw: '',
        },
      ],
    },
  ],
  synthesisFile: 'synthesis.md',
  critiqueFile: 'critique.md',
  questions: [{ question: 'How many heats?', why: 'Sets the length of a session.' }],
  nextRound: 'Develop the scrapyard.',
  gaps: ['No answer on visible builds'],
};

const files: Record<string, string> = {
  'proposals/alpha.md': '# Alpha\n\n## Premise\n\nAlpha premise.\n',
  'proposals/beta.md': '# Beta\n\n## Premise\n\nBeta premise.\n',
  'reviews/fun.md': '# Review: Fun\n\nFun review body.\n',
  'reviews/engineering.md': '# Review: Engineering\n\nEngineering review body.\n',
  'synthesis.md': '# Salvage & Standing\n\n## In one paragraph\n\nThe synthesis body.\n',
  'critique.md': '# Critique\n\n1. **Visible builds.** Not answered.\n',
};

describe('renderFragment', () => {
  const html = renderFragment(round, files);

  it('names the page after the round', () => {
    expect(html).toContain('<title>Star Race Framework Round 7</title>');
    expect(html).toContain('Salvage &amp; Standing');
  });

  it('escapes what the agents wrote into titles and pitches', () => {
    expect(html).toContain('Alpha &lt;One&gt;');
    expect(html).toContain('The first &amp; best.');
    expect(html).not.toContain('Alpha <One>');
  });

  it('puts the synthesis before the scores and the proposals after', () => {
    const synthesis = html.indexOf('The synthesis body.');
    const scores = html.indexOf('id="scores"');
    const proposals = html.indexOf('id="proposals"');
    expect(synthesis).toBeGreaterThan(-1);
    expect(synthesis).toBeLessThan(scores);
    expect(scores).toBeLessThan(proposals);
  });

  it('demotes the markdown headings so they nest under the page sections', () => {
    // A proposal's "# Alpha" becomes an h2 inside its details, never a second h1.
    expect(html.match(/<h1/g)).toHaveLength(1);
    expect(html).toContain('<h2>Alpha</h2>');
    expect(html).toContain('<h3>Premise</h3>');
  });

  it('ranks proposals by mean score and marks the base', () => {
    // beta averages 28, alpha 28 as well — tie keeps original order; make beta win.
    const better: RoundData = {
      ...round,
      reviews: round.reviews.map((review) => ({
        ...review,
        scores: review.scores.map((s) => (s.slug === 'beta' ? { ...s, total: 40 } : s)),
      })),
    };
    const page = renderFragment(better, files);
    const table = page.slice(
      page.indexOf('<table class="scores">'),
      page.indexOf('</table>'),
    );
    expect(table.indexOf('Beta')).toBeLessThan(table.indexOf('Alpha'));
    expect(table).toContain('<span class="chip">base</span>');
    // One reviewer backs each proposal.
    expect(table.match(/●/g)).toHaveLength(2);
  });

  it('lists the owner decisions and the critique', () => {
    expect(html).toContain('How many heats?');
    expect(html).toContain('Sets the length of a session.');
    expect(html).toContain('Not answered.');
    expect(html).toContain('Develop the scrapyard.');
  });

  it('shows a fatal flaw only where a reviewer named one', () => {
    expect(html).toContain('<strong>Fatal flaw:</strong> No economy');
    expect(html.match(/Fatal flaw:/g)).toHaveLength(1);
  });

  it('points the owner at the feedback file for this round', () => {
    expect(html).toContain('round-07');
    expect(html).toContain('feedback.md');
    expect(html).toContain('round 8');
  });

  it('renders owner feedback when the round has some', () => {
    const withFeedback = renderFragment(round, {
      ...files,
      'feedback.md': 'Keep the scrapyard.',
    });
    expect(withFeedback).toContain('Your feedback on this round');
    expect(withFeedback).toContain('Keep the scrapyard.');
    expect(html).not.toContain('Your feedback on this round');
  });
});
