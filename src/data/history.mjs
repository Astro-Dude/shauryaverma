/**
 * Career/education history rows. The year column stays put while the role swaps under the
 * red band — `redRole` is the honest job title.
 *
 * `year` is the anchor token and `range` the precise span, deliberately split. The year column is
 * 2/12 of the grid, sized for four characters: it is 220px wide at 1440 and 72px at 375, so a
 * range like "NOV 2025 - NOW" (276px at 1440, 183px at 375) would need 8.8px type to fit the
 * narrowest case. Even "2024-2028" overflows it by 44px there. So the column keeps the short token
 * and the full range rides the small line with the org, where there is room at every width.
 */

/** @type {{year: string, role: string, redRole: string, org: string, range: string}[]} */
export const history = [
  {
    year: 'NOW',
    role: 'Founding SDE Intern',
    redRole: 'Professional App Impersonator',
    org: 'Scaler AI Labs',
    range: 'Nov 2025 - now',
  },
  {
    year: '2025',
    role: 'Teaching Assistant',
    redRole: 'Googling It Before They Did',
    org: 'Scaler School of Technology',
    range: 'Aug - Dec 2025',
  },
  {
    year: '2024',
    role: 'Undergrad in CS',
    redRole: 'The Coaching, Not the School',
    org: 'Scaler School of Technology',
    range: '2024 - 2028',
  },
  {
    year: '2024',
    role: 'Bachelors in CS',
    redRole: 'The Dummy School, For the Degree',
    org: 'BITS Pilani',
    range: '2024 - 2028',
  },
];
