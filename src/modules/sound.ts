/**
 * The sound toggle.
 *
 * Short synthesised blips on hover and click — no audio files, and nothing is created until
 * the visitor opts in. Default is off: a portfolio that makes noise uninvited is a portfolio
 * people close.
 *
 * The choice persists, because being re-asked on every visit is its own kind of rude.
 */

const STORAGE_KEY = 'sv:sound';

export function initSound(root: ParentNode = document): void {
  const button = root.querySelector<HTMLButtonElement>('.js-footer_sound');
  if (!button) return;

  let context: AudioContext | null = null;
  let enabled = false;

  try {
    enabled = localStorage.getItem(STORAGE_KEY) === 'on';
  } catch {
    // Private browsing or blocked storage — default off and carry on.
  }

  const paint = () => {
    button.dataset.state = enabled ? 'on' : 'off';
    button.setAttribute('aria-pressed', String(enabled));
  };

  /** Created lazily, and only after a real gesture, per autoplay policy. */
  const ensureContext = (): AudioContext | null => {
    if (!enabled) return null;
    if (!context) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      context = new Ctor();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  };

  const blip = (frequency: number, duration = 0.06, gainPeak = 0.03) => {
    const ctx = ensureContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;

    // A hard start would click; ramp both ends.
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainPeak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  };

  button.addEventListener('click', () => {
    enabled = !enabled;
    paint();
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
    } catch {
      // Non-fatal: the toggle still works for this session.
    }
    if (enabled) blip(880, 0.08, 0.04);
  });

  // Interactive rows get a quiet tick; the pitch shifts a little so a fast sweep across the
  // list doesn't sound like a stuck key.
  root.querySelectorAll<HTMLElement>('.js-cursor-contract').forEach((el, i) => {
    el.addEventListener('pointerenter', () => blip(520 + (i % 5) * 40, 0.045, 0.018));
  });

  paint();
}

/**
 * Assemble the email address at runtime.
 *
 * Kept out of the served markup so it isn't harvested straight out of the HTML, while staying
 * a real, clickable mailto for anyone using the page.
 */
export function initEmail(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.js-email').forEach((el) => {
    const { user, domain } = el.dataset;
    if (!user || !domain) return;
    const address = `${user}@${domain}`;
    el.textContent = address;
    const link = el.closest('a');
    if (link) link.setAttribute('href', `mailto:${address}`);
  });
}
