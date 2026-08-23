/**
 * Composes the full page: loader, header, both layers, footer.
 *
 * Called from vite.config.js at build time, so the shipped HTML is static and complete.
 */

import { site } from '../data/site.mjs';
import { socials } from '../data/socials.mjs';
import { esc } from './helpers.mjs';
import { icon } from './icons.mjs';
import { logo } from './logo.mjs';
import {
  hero, about, work, projectList, showcase, achievementList, motto, contact,
} from './sections.mjs';

/** The intro overlay: a progress ring, a counter, and a button that starts the reveal. */
function loader() {
  return `
    <div class="page-loading js-page-loading">
      <!--
        The ring and the counter are absolutely positioned around the mark, so only the mark and
        the Start button are in flow. That is what lets the ring and counter fade out on
        completion without the button jumping up to fill the space they occupied.
      -->
      <div class="page-loading_stack">
        <svg class="page-loading_circle js-page-loading_inner" viewBox="0 0 270 270" aria-hidden="true">
          <circle cx="135" cy="135" r="132" fill="none" stroke="currentColor" stroke-width="1"
                  pathLength="829" />
        </svg>
        <div class="page-loading_logo" aria-hidden="true">
          ${logo({ size: 64, className: 'logo-mark logo-mark__loader' })}
        </div>
        <span class="page-loading_text" id="js-page-loading_text" aria-live="polite">
          <b class="js-loading_text">0</b>%
        </span>
      </div>
      <button class="body-text page-loading_start" id="js-page-loading_start" type="button" hidden>
        Start
      </button>
    </div>`;
}

function header() {
  return `
    <header class="header js-header">
      <div class="header_logo js-header_logo">
        <a class="link-logo" href="#about" aria-label="${esc(site.name)}, home">
          ${logo({ size: 40 })}
        </a>
      </div>
      <nav class="header_menu" aria-label="Primary">
        <ul class="header_menu_list ul__reset">
          ${site.nav
            .map(
              (n) => `
            <li class="header_menu_item js-cursor-contract">
              <a class="desc text-uppercase" href="${esc(n.href)}">
                <span class="header_menu_item_inner">
                  <span class="header_menu_item_link header_menu_item_link__deep">${esc(n.label)}</span>
                  <span class="header_menu_item_link header_menu_item_link__active" aria-hidden="true">${esc(n.label)}</span>
                </span>
              </a>
            </li>`,
            )
            .join('')}
        </ul>
      </nav>
    </header>`;
}

function footer() {
  const icons = socials.filter((s) => s.inFooter);
  return `
    <footer class="footer" id="js-footer">
      <ul class="footer_socials ul__reset">
        ${icons
          .map(
            (s) => `
          <li class="social js-social">
            <a class="social_link social_link__${esc(s.icon)}" href="${esc(s.href)}"
               target="_blank" rel="noopener noreferrer">
              <span class="visually-hidden">${esc(s.label)}</span>
              ${icon(s.icon)}
            </a>
          </li>`,
          )
          .join('')}
      </ul>
      <button class="footer_sound js-cursor-contract js-footer_sound desc text-uppercase btn-clear"
              type="button" aria-pressed="false">
        <span class="footer_sound_label">Sound</span>
        <span class="footer_sound_list">
          <span class="footer_sound_list_item js-footer_sound_list_item__on">On</span>
          <span class="footer_sound_list_item js-footer_sound_list_item__off">Off</span>
        </span>
      </button>
    </footer>`;
}

/** One layer's worth of sections. Both layers get the same sections in the same order. */
function layerContent(layer) {
  return `
    <div class="container">
      <div id="${layer === 'dark' ? 'about' : 'about-red'}">
        ${hero(layer)}
        ${about(layer)}
      </div>
      <div id="${layer === 'dark' ? 'work' : 'work-red'}">
        ${work(layer)}
        ${projectList(layer)}
        ${showcase(layer)}
        ${achievementList(layer)}
      </div>
      <div id="${layer === 'dark' ? 'contact' : 'contact-red'}">
        ${motto(layer)}
        ${contact(layer)}
      </div>
    </div>`;
}

/** The hold-to-reveal ring, shown only on touch devices where there is no cursor to follow. */
function holdButton() {
  return `
    <button class="btn_clipPath" id="js-btn_clipPath" type="button" aria-hidden="true" tabindex="-1">
      <span class="btn_clipPath_inner">
        <svg class="btn_clipPath_ring" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <path id="ringPath" d="M50,50 m-38,0 a38,38 0 1,1 76,0 a38,38 0 1,1 -76,0" />
          </defs>
          <text class="btn_clipPath_ringtext">
            <textPath href="#ringPath">HOLD TO SEE THE TRUTH · HOLD TO SEE THE TRUTH · </textPath>
          </text>
        </svg>
        <span class="btn_clipPath_touch" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="18" height="18">
            <circle cx="12" cy="12" r="5" fill="currentColor"/>
          </svg>
        </span>
      </span>
    </button>`;
}

/** @returns {string} the full document body. */
export function renderBody() {
  return `
${loader()}
${header()}
<main class="main-layer js-pageContent">
  <div class="layer layer__dark">
    ${layerContent('dark')}
    ${holdButton()}
  </div>
  <div class="layer layer__red js-masker" aria-hidden="true">
    ${layerContent('red')}
  </div>
</main>
${footer()}
<audio class="js-web-sound" preload="none"></audio>
`;
}

/** `<head>` metadata, kept next to the content it describes. */
export function renderHead() {
  const title = `${site.name}, ${site.role}`;
  return `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(site.description)}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${esc(title)}">
    <meta property="og:description" content="${esc(site.description)}">
    <meta property="og:url" content="${esc(site.url)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(title)}">
    <meta name="twitter:description" content="${esc(site.description)}">
    <meta name="theme-color" content="#0d0d0d">
    <link rel="canonical" href="${esc(site.url)}">`;
}
