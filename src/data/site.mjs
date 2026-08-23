/**
 * Site-wide identity and copy.
 *
 * Every section exists twice on the page: the dark layer (the real one) and the red layer,
 * revealed through a circular mask that tracks the cursor. Fields prefixed `red` are the
 * alternate-layer copy — the punchline you find by moving the mouse over a paragraph.
 */

export const site = {
  name: 'Shaurya Verma',
  role: 'Full-Stack & AI Systems Engineer',
  description:
    'I build full-stack systems and the environments frontier AI models learn from: ' +
    'high-fidelity app replicas, RL harnesses, and the pipelines behind them.',
  url: 'https://shauryaverma.dev',

  nav: [
    { label: 'About', href: '#about' },
    { label: 'Work', href: '#work' },
    { label: 'Contact', href: '#contact' },
  ],

  hero: {
    subtitle: 'Shaurya Verma',
    /*
     * One line per entry; `strong` entries are set in the accent red.
     *
     * CHARACTER COUNT IS NOT WIDTH. Measured in Jost at this size, "good" is 349px and "vibe" is
     * 248px, both four letters: G, O, O and D are four wide round glyphs and VIBE contains an I.
     * "building" is 522px against "clauding" at 578px. So matching the copy by counting letters,
     * which is what this file used to do, guarantees nothing.
     *
     * The layers are made to register in code instead. matchLayerWidths() in reveals.ts measures
     * each line pair after the split and scales the red one horizontally onto the dark one's exact
     * width, so any two words line up and the copy here is free to say whatever it should say.
     *
     * Both layers are set uppercase by CSS, so the case here is only a file convention.
     */
    lines: [
      { text: 'building' },
      { text: 'good', strong: true },
      { text: 'shit', strong: true },
      { text: 'since' },
      { text: '2024' },
    ],
    redLines: [
      { text: 'clauding' },
      { text: 'vibe', strong: true },
      { text: 'shit', strong: true },
      { text: 'since' },
      { text: '2025' },
    ],
  },

  about: {
    label: 'About me',
    // `strong` spans get the heavier display weight mid-sentence.
    // Length-matched to `html` so both layers wrap to the same number of lines.
    html:
      "I'm a <strong>full-stack engineer</strong> building the environments frontier models " +
      'learn from: high-fidelity replicas, RL harnesses, and the pipelines behind them.',
    redHtml:
      "I'm a <strong>third-year student</strong> rebuilding other people’s apps until a " +
      'language model believes them, calling that research, and somehow getting paid for it.',
  },

  experience: {
    label: 'Experience',
    html:
      'Two years of shipping real software: <strong>production systems</strong> at an AI lab, ' +
      'and two CS degrees running at the same time.',
    redHtml:
      'Two years, five repos, and one internship that <strong>became a job</strong>, plus ' +
      'two degrees I am still keeping up with.',
  },

  motto: {
    label: 'My motto',
    lines: ['Make it work,', 'make it right,', 'make it fast'],
    attribution: 'Kent Beck',
    redLines: ['Make it work,', 'then never', 'touch it again'],
    redAttribution: 'Shaurya Verma',
  },

  contact: {
    label: 'Connect',
    email: 'sagittariusshaurya5@gmail.com',
    emailNote: '100% chance I read it',
    phone: '+91 79922 14793',
    phoneNote: '90% chance I don’t pick up',
  },
};
