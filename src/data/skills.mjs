/**
 * "What I do" rows.
 *
 * Names are kept short: set in the display face at 74.7px they wrap easily, and a wrapped name
 * breaks the uniform band rhythm the section depends on. Measured, "RL Environments" is 665px in a
 * 720px column, which is the practical ceiling; anything longer needs the type stepped down.
 *
 * Same `heading-mask` mechanic as projects: the name is always visible, the description arrives with
 * the red band on hover.
 *
 * These read identically in both layers. In the reference the skill descriptions are the one place
 * the alternate layer does not crack a joke, so the humour stays rationed; here the jokes are in the
 * descriptions themselves, which is the same trade made once instead of twice.
 */

/** @type {{name: string, desc: string}[]} */
export const skills = [
  {
    name: 'Full-stack',
    desc: 'I can build anything Claude can, just with more coffee and more swearing.',
  },
  {
    /* Paired with Coding RL below: the same discipline pointed at apps rather than at repos. */
    name: 'RL Environments',
    desc:
      'High-fidelity replicas of Salesforce, Figma and PitchBook. If a language model files a ' +
      'support ticket, I have done my job.',
  },
  {
    name: 'Coding RL',
    desc:
      'Real repos, real bugs, real test suites. I write the correct fix first, so the model ' +
      'cannot argue with its grade.',
  },
  {
    name: 'Automation',
    desc: 'Scrapers and pipelines that turn other people’s websites into structured datasets. My own cart is still empty.',
  },
  {
    name: 'Teaching',
    desc: 'Turning things I barely understood last month into things other people understand today.',
  },
];
