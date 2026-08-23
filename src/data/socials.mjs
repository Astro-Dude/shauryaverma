/**
 * Contact links. `redLabel` replaces the platform name when the red band opens, so the column
 * reads as a list of platforms until you hover it, then as a list of confessions.
 */

/*
 * `redLabel` is kept short on purpose. It is revealed inside a fixed-height row band, and at
 * .h3 in a quarter-width column anything past ~18 characters wraps to a second line, which
 * used to make the rows different heights and the list look unevenly spaced.
 */

/** @type {{label: string, redLabel: string, href: string, icon: string, inFooter?: boolean}[]} */
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
    href: 'https://www.codechef.com/users/astro_dude',
    icon: 'codechef',
    inFooter: true,
  },
  {
    label: 'BYOS',
    redLabel: 'In Telegram',
    href: 'https://github.com/Astro-Dude/BYOS',
    icon: 'byos',
  },
  {
    label: 'Resume',
    redLabel: 'One page',
    href: '/assets/Shaurya_resume.pdf',
    icon: 'resume',
  },
  {
    label: 'Email',
    redLabel: 'I do read it',
    href: 'mailto:sagittariusshaurya5@gmail.com',
    icon: 'mail',
    inFooter: true,
  },
];
