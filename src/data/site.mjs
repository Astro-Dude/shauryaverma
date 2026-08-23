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
    /*
     * `strong` spans get the accent red in the dark layer and the heavier display weight in the red
     * one, which is how the reference sets "selectively skilled".
     *
     * The two layers share no distinctive phrase. "Selectively skilled" is only ever in the dark
     * copy and is never explained there; the student, the two degrees and the paycheck are only ever
     * in the spotlight. A phrase that appears in both is not a reveal, it is just repetition.
     *
     * Length-matched by RENDERED LINE COUNT, not by character count. Both sides come to four lines
     * in the 940px column at this type size; measured, because 90 characters can be three lines and
     * 102 can be four depending entirely on where the words happen to break.
     */
    html:
      "I'm a <strong>selectively skilled</strong> developer with a strong focus on building " +
      'software that survives real users.',
    redHtml:
      "I'm a <strong>third-year student</strong> with two degrees running. I ship good shit " +
      'only if the paycheck is equally good.',
  },

  experience: {
    label: 'Experience',
    /*
     * The dark layer flaunts, the spotlight admits. That is the rule for every red/dark pair on the
     * page, and this is the clearest case of it: the claim is the reference's own construction, and
     * the reveal turns the admission into the reason for it rather than an apology for it.
     *
     * The previous red copy said the internship "became a job". It has not; it is ongoing.
     *
     * "A year" and not "two": the two-year figure is time spent building, which the hero already
     * claims with "since 2024". This section is about working, and that started in the second year.
     * "A year" rather than "one year" because the reference's construction is "Over a decade" and the
     * article reads better after "over".
     */
    html:
      'Over <strong>a year</strong> of experience shipping software with some of the most ' +
      'talented people in the business.',
    redHtml:
      'I am the <strong>least experienced</strong> person in every room I work in, which is the ' +
      'entire reason I am in them.',
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
