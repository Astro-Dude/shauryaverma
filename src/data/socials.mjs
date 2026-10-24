/**
 * Contact links. `redLabel` replaces the platform name when the red band opens, so the column
 * reads as a list of platforms until you hover it, then as a list of confessions.
 */

import { projects } from './projects.mjs';

/*
 * The BYOS and DOM Heist rows derive their URLs from the project entry rather than repeating it.
 *
 * It was a second hardcoded copy of the same link, and the two drifted the moment the project rows
 * started preferring the deployed app: the list still sent people to the repository while the row
 * above sent them to the app. Reading it from one place is what stops that happening again.
 */
const byos = projects.find((p) => p.name === 'BYOS');
const heist = projects.find((p) => p.name === 'DOM Heist');

/*
 * `redLabel` is kept short on purpose. It is revealed inside a fixed-height row band, and at
 * .h3 in a quarter-width column anything past ~18 characters wraps to a second line, which
 * used to make the rows different heights and the list look unevenly spaced.
 */

/*
 * `inList: false` keeps an entry out of the Connect list while it stays in the footer rail: the
 * address is already written out beside the list, so a link to it there was a repeat.
 */

/** @type {{label: string, redLabel: string, href: string, icon: string, inFooter?: boolean, inList?: boolean}[]} */
export const socials = [
  {
    label: 'Github',
    redLabel: 'The commits',
    href: 'https://github.com/Astro-Dude',
    icon: 'github',
    inFooter: true,
  },
  {
    label: 'Linkedin',
    redLabel: 'Serious me',
    href: 'https://www.linkedin.com/in/astro-dude',
    icon: 'linkedin',
    inFooter: true,
  },
  {
    label: 'CodeChef',
    redLabel: 'Stuck at 1649',
    href: 'https://www.codechef.com/users/astrodude',
    icon: 'codechef',
    inFooter: true,
  },
  {
    label: 'BYOS',
    redLabel: 'In Telegram',
    href: byos?.live ?? byos?.repo ?? 'https://github.com/Astro-Dude/BYOS',
    icon: 'byos',
  },
  {
    label: 'Resume',
    redLabel: 'One page',
    href: 'https://drive.google.com/file/d/1n39r8DRAkyZiBz2RFoJcEyvMN_CcewgS/view',
    icon: 'resume',
  },
  {
    label: 'DOM Heist',
    redLabel: 'Steal any UI',
    href: heist?.live ?? heist?.repo ?? 'https://github.com/Astro-Dude/VibeExtract',
    icon: 'heist',
  },
  {
    label: 'Email',
    redLabel: 'I do read it',
    href: 'mailto:sagittariusshaurya5@gmail.com',
    icon: 'mail',
    inFooter: true,
    inList: false,
  },
];
