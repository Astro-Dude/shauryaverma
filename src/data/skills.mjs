/**
 * "What I do" rows.
 *
 * Names are kept short: set in the display face they wrap easily, and a wrapped name breaks the
 * uniform band rhythm the section depends on. "RL Environments" is the longest that fits on one
 * line at the current size; anything longer needs the type stepped down. Same `heading-mask` mechanic as projects: the name is always visible,
 * the description arrives with the red band on hover.
 *
 * These read identically in both layers — in the reference the skill descriptions are the one
 * place the alternate layer doesn't crack a joke, so the humour stays rationed.
 */

/** @type {{name: string, desc: string}[]} */
export const skills = [
  {
    name: 'Full-stack',
    desc: 'React, Next.js, FastAPI, Express. I build the whole thing, then blame the backend.',
  },
  {
    name: 'RL Environments',
    desc:
      'High-fidelity replicas of Salesforce, Drive and Visio, built so frontier models have ' +
      'somewhere real to fail.',
  },
  {
    name: 'Evals',
    desc:
      'Ground-truth patches, automated eval harnesses and adversarial rubrics that catch ' +
      'agents gaming the reward.',
  },
  {
    name: 'Backend',
    desc: 'REST APIs, Postgres and Mongo schemas, and Socket.IO that survives a bad connection.',
  },
  {
    name: 'Automation',
    desc: 'Scrapers and pipelines that turn other people’s websites into structured datasets.',
  },
  {
    name: 'Systems',
    desc: 'Docker, Linux, and enough C++ to place at CodeChef.',
  },
];
