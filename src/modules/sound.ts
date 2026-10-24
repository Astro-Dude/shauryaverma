/**
 * The sound toggle.
 *
 * Two kinds of sound, controlled differently:
 *
 *   - the haptics: short synthesised blips on hover and click. Always on, toggle or no toggle; they
 *     are feedback, not music, and quiet enough to be part of the interface.
 *   - the background track, on loop. This is what the toggle controls, and it defaults to on.
 *
 * Browsers allow no audio at all before the visitor's first click, tap or key, so in practice both
 * start on the loader's Start button. Nothing is created or fetched before that.
 *
 * Every visit starts with the music on. Turning it off lasts for that visit only: an earlier version
 * remembered "off", and one test click was enough to leave the site silent from then on.
 */

import { gsap } from 'gsap';

/* Where an earlier version remembered the toggle. Cleared on load so a stale "off" cannot linger. */
const LEGACY_STORAGE_KEY = 'sv:sound';

/*
 * The background track. Hotlinked from the reference site rather than copied into this repo: it
 * is that site's file, not ours. Swap in a self-hosted track by changing this one line.
 */
const MUSIC_SRC = 'https://minhpham.design/assets/mp3/audio-site.mp3';
const MUSIC_VOLUME = 0.35;

/*
 * Why the music is being held silent, by whoever asked. The BYOS film is the one caller today: it
 * has its own soundtrack, and two tracks at once is noise. A set rather than a flag so a second
 * caller cannot release a hold the first still needs.
 */
const holds = new Set<string>();
let syncMusic: () => void = () => {};

/** Hold the background music silent (or release it) on behalf of `who`. */
export function holdMusic(who: string, held: boolean): void {
  if (held) holds.add(who);
  else holds.delete(who);
  syncMusic();
}

export function initSound(root: ParentNode = document): void {
  const button = root.querySelector<HTMLButtonElement>('.js-footer_sound');
  if (!button) return;

  let context: AudioContext | null = null;
  let enabled = true;
  /* Whether the page has had a gesture yet: before one, an AudioContext would only start suspended. */
  let gestured = false;

  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Private browsing or blocked storage: nothing to clear.
  }

  const markGesture = () => {
    gestured = true;
    ['pointerdown', 'keydown'].forEach((t) => window.removeEventListener(t, markGesture, true));
  };
  ['pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, markGesture, { capture: true, passive: true }));

  const paint = () => {
    button.dataset.state = enabled ? 'on' : 'off';
    button.setAttribute('aria-pressed', String(enabled));
  };

  /** Created lazily, and only after a real gesture, per autoplay policy. Not gated on the toggle. */
  const ensureContext = (): AudioContext | null => {
    if (!gestured) return null;
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

  /*
   * The music. Faded rather than cut, both ways; iOS ignores `volume`, so there it simply starts
   * and stops, which is fine.
   *
   * A stored "on" from a previous visit has had no gesture yet, and browsers refuse audible playback
   * until there is one. So a refused play waits for the visitor's first click, tap or key, and
   * starts then.
   */
  const music = document.querySelector<HTMLAudioElement>('.js-web-sound');
  const level = { v: 0 };
  let waitingForGesture = false;

  const fadeTo = (to: number, onComplete?: () => void) => {
    if (!music) return;
    gsap.to(level, {
      v: to,
      duration: to > 0 ? 1.2 : 0.6,
      ease: 'power1.inOut',
      overwrite: true,
      onUpdate: () => { music.volume = level.v; },
      onComplete,
    });
  };

  const retryOnGesture = () => {
    if (waitingForGesture) return;
    waitingForGesture = true;
    const go = () => {
      waitingForGesture = false;
      ['pointerdown', 'keydown'].forEach((t) => window.removeEventListener(t, go));
      syncMusic();
    };
    ['pointerdown', 'keydown'].forEach((t) => window.addEventListener(t, go, { passive: true }));
  };

  syncMusic = () => {
    if (!music) return;
    const audible = enabled && holds.size === 0;
    if (audible) {
      if (!music.src) {
        music.src = MUSIC_SRC;
        music.loop = true;
        music.preload = 'auto';
      }
      if (!music.paused) { fadeTo(MUSIC_VOLUME); return; }
      music.volume = level.v;
      music.play().then(() => fadeTo(MUSIC_VOLUME), retryOnGesture);
    } else if (!music.paused) {
      fadeTo(0, () => music.pause());
    }
  };

  button.addEventListener('click', () => {
    enabled = !enabled;
    paint();
    // The haptics are always on, so the toggle answers either way: up for on, down for off.
    blip(enabled ? 880 : 440, 0.08, 0.04);
    syncMusic();
  });

  // Interactive rows get a quiet tick; the pitch shifts a little so a fast sweep across the
  // list doesn't sound like a stuck key.
  root.querySelectorAll<HTMLElement>('.js-cursor-contract').forEach((el, i) => {
    el.addEventListener('pointerenter', () => blip(520 + (i % 5) * 40, 0.045, 0.018));
  });

  paint();
  syncMusic();
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
