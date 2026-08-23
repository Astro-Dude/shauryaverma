/**
 * Achievements, in the slot the reference gives testimonials: a vertical slider driven by
 * scroll, with a thumb rail down the right edge.
 *
 * `lines` are pre-broken because the display type is set large enough that automatic wrapping
 * lands badly — the reference hard-breaks these too.
 */

/** @type {{lines: string[], redLines: string[], label: string, org: string, badge: string}[]} */
export const achievements = [
  {
    lines: ['Top 100 at the', 'Meta Hackathon'],
    redLines: ['Top 100 sounds', 'better than 100th'],
    label: '2026',
    org: 'Meta Hackathon',
    badge: '100',
  },
  {
    lines: ['CodeChef 3 stars,', 'max rating 1649'],
    redLines: ['1649, and very', 'settled in at 1649'],
    label: 'Competitive Programming',
    org: 'CodeChef',
    badge: '3★',
  },
  {
    lines: ['Finalist at', 'Shaastra, IIT-M'],
    redLines: ['Finalist, a polite', 'word for lost'],
    label: 'Programming Contest',
    org: 'IIT Madras',
    badge: 'IITM',
  },
];
