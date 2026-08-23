/**
 * Section templates.
 *
 * Every function takes a `layer` of 'dark' | 'red' and returns markup for that layer. The two
 * layers must occupy identical geometry — the red one is revealed through a mask positioned in
 * document space, so any height difference would make the reveal slide out of register.
 *
 * Where the reference has nothing to say in the red layer it keeps the block present but at
 * `op-0`: invisible, still holding its height. That is why several sections below render their
 * inner list twice with only an opacity class differing.
 */

import { site } from '../data/site.mjs';
import { skills } from '../data/skills.mjs';
import { history } from '../data/history.mjs';
import { projects } from '../data/projects.mjs';
import { achievements } from '../data/achievements.mjs';
import { socials } from '../data/socials.mjs';
import { cx, esc, headingMask, scrollParagraph, label, displayLines } from './helpers.mjs';

const isRed = (layer) => layer === 'red';

/* ---------------------------------------------------------------- hero */

export function hero(layer) {
  const red = isRed(layer);
  const lines = red ? site.hero.redLines : site.hero.lines;

  // The dark layer carries a full-bleed WebGL canvas behind the type, parallaxed at half
  // scroll speed. The red layer has no background of its own — it *is* the background.
  const bg = red
    ? ''
    : `
      <div class="hero_bg" data-lenis-parallax=".5">
        <div class="w-100 h-100 js-anim--scale" data-screen-offset="0.3">
          <canvas class="hero_canvas js-webgl" data-webgl="hero" aria-hidden="true"></canvas>
        </div>
      </div>`;

  return `
    <div class="${cx('hero', red && 'hero__red')}">
      ${bg}
      <div class="hero_content">
        <div class="row justify-content-center">
          <div class="col-lg-6 col-sm-10 col-12 hero_content_inner ${red ? '' : 'js-cursor-extend'}">
            <p class="${cx('text-center', 'h6', 'hero_content_inner_subtitle', 'js-anim--lines--sim', red && 'text-dark')}" data-screen-offset="0.8"${red ? ' data-no-anim' : ''}>${esc(site.hero.subtitle)}</p>
            ${displayLines(lines, { animate: !red })}
          </div>
        </div>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------- about + what i do */

export function about(layer) {
  const red = isRed(layer);

  const skillRows = skills
    .map((s, i) =>
      headingMask({
        first: i === 0,
        interactive: !red,
        /*
          The two copies get DIFFERENT column widths on purpose, which is how the reference does it.
          Nothing competes with the name until you hover, so the resting copy is given the full
          measure and shows in one piece. The revealed copy has to share the row with a description,
          so its column is narrower and clips: a long name is cut mid-letter at the boundary, exactly
          where the description starts. That cut is the effect, not a failure of it.

          Both name columns keep `offset-lg-2`, so the left edge is identical and the name does not
          move as the band opens over it. Only the right-hand boundary changes.
        */
        deep: `
          <div class="row align-items-center">
            <div class="col-lg-10 col-sm-8 offset-lg-2 offset-sm-1 col-12">
              <div class="simple-masking">
                <div class="simple-masking_el js-simple-masking_el">
                  <h3 class="h1 mb-0 none-break">${esc(s.name)}</h3>
                </div>
              </div>
            </div>
          </div>`,
        masking: `
          <div class="row align-items-center">
            <div class="col-lg-5 col-sm-8 offset-lg-2 offset-sm-1 col-12 heading-mask_clip">
              <div class="simple-masking">
                <div class="simple-masking_el">
                  <span class="h1 mb-0 text-dark none-break">${esc(s.name)}</span>
                </div>
              </div>
            </div>
            <div class="col-lg-5 col-sm-4 col-12 text-dark d-sm-block d-none">
              <p class="mb-0 desc">${esc(s.desc)}</p>
            </div>
          </div>`,
      }),
    )
    .join('');

  return `
    <div class="${cx('about', red ? 'about__red' : 'js-about')}">
      <div class="row about_me">
        <div class="col-lg-8 col-sm-10 col-12 offset-lg-2 offset-sm-1">
          <div class="about_content container_content ${red ? '' : 'js-cursor-extend'}">
            ${label(site.about.label, red ? 'text-dark' : '')}
            <div class="about_content_desc h2">
              ${scrollParagraph(red ? site.about.redHtml : site.about.html, { animate: !red })}
            </div>
          </div>
        </div>
      </div>

      <div class="${cx('about_ido', red && 'op-0')}"${red ? ' aria-hidden="true"' : ''}>
        ${red ? '' : `
        <div class="js-about_ido_coffee about_ido_coffee" aria-hidden="true">
          <div class="js-about_ido_inner about_ido_inner" data-lenis-speed="-.1">
            <canvas class="js-object3d" data-object="cup" data-model="/assets/models/cup.glb"></canvas>
          </div>
        </div>
`}
        <div class="row">
          <div class="col-lg-8 col-sm-10 offset-lg-2 offset-sm-1 col-12">
            ${label('What i do', cx('container_content', red && 'text-dark'))}
          </div>
        </div>
        ${skillRows}
      </div>
    </div>`;
}

/* ---------------------------------------------------------------- experience + history */

export function work(layer) {
  const red = isRed(layer);

  const historyRows = history
    .map((h, i) =>
      headingMask({
        first: i === 0,
        interactive: !red,
        className: 'container_content',
        deep: `
          <div class="row">
            <div class="col-sm-2 offset-lg-2 offset-sm-1 col-3">
              <div class="simple-masking"><div class="simple-masking_el">
                <span class="h3 mb-1">${esc(h.year)}</span>
              </div></div>
            </div>
            <div class="col-lg-6 col-sm-8 col-9">
              <div class="simple-masking_el js-simple-masking_el">
                <p class="h3 mb-1">${esc(h.role)}</p>
                <p class="mb-0 desc font-400">${esc(h.org)}, ${esc(h.range)}</p>
              </div>
            </div>
          </div>`,
        masking: `
          <div class="row">
            <div class="col-sm-2 offset-lg-2 offset-sm-1 col-3">
              <div class="simple-masking"><div class="simple-masking_el">
                <span class="h3 mb-1 text-dark">${esc(h.year)}</span>
              </div></div>
            </div>
            <div class="col-lg-6 col-sm-8 col-9">
              <div class="simple-masking_el">
                <p class="h3 mb-1 text-dark">${esc(h.redRole)}</p>
                <p class="mb-0 desc font-400 text-dark">${esc(h.org)}, ${esc(h.range)}</p>
              </div>
            </div>
          </div>`,
      }),
    )
    .join('');

  return `
    <div class="${cx('work', red && 'work__red')}">
      <!--
        No cursor zone on the row itself. The spotlight's extend stop is 375px, which is sized for
        reading a paragraph through the hole, and this row is a full-width 855px photo band: putting
        the zone here opened a big red disc over empty photograph where there was nothing to reveal.
        The work_content block below already carries it, scoped to the text that has a red twin.
      -->
      <div class="row work_experience">
        <!--
          Backdrop for the whole row: the eyebrow and headline sit ON it, and it runs down to meet
          the History list, which is what the reference does in this exact slot.

          Present in BOTH layers, each graded to where its own type stays legible - see bandRamp()
          and BAND_TUNING in webgl.ts.
        -->
        <div class="work_bg js-band" aria-hidden="true">
          <div class="band_media" data-lenis-speed=".25">
            <!--
              Same two-part treatment as the hero backdrop, which is what makes the reference's band
              read as being uncovered rather than sitting there: a parallax so it lags the page, and
              a scale that scrubs 1.18 down to 1 as the section crosses the screen.

              The scale is what does most of the work, and it needs no room to move in: scaling up
              crops against the band's own overflow and can never pull an edge into frame. The
              parallax does need room, which is why it stays modest. The media is 130% tall, so there
              is about 138px of slack per side and 0.12 spends 110px of it.
            -->
            <div class="w-100 h-100 js-anim--scale" data-screen-offset="0.3">
              <canvas class="js-webgl" data-webgl="${red ? 'band-red' : 'band'}" data-photo="/assets/bands/office.jpg"></canvas>
            </div>
          </div>
        </div>
        <div class="col-lg-8 col-sm-10 offset-lg-2 offset-sm-1 col-12">
          <div class="work_content container_content ${red ? '' : 'js-cursor-extend'}">
            ${label(site.experience.label, red ? 'text-dark' : '')}
            <div class="work_content_desc h2">
              ${scrollParagraph(red ? site.experience.redHtml : site.experience.html, { animate: !red })}
            </div>
          </div>
        </div>
      </div>

      <div class="${cx('work_history', red && 'op-0')}"${red ? ' aria-hidden="true"' : ''}>
        <div class="row work_heading work_history_heading">
          <div class="col-lg-8 col-sm-10 offset-lg-2 offset-sm-1 col-12">
            ${label('History', cx('container_content', 'mb-0', red && 'text-dark'))}
          </div>
        </div>
        ${historyRows}
      </div>
    </div>`;
}

/* ---------------------------------------------------------------- projects */

export function projectList(layer) {
  const red = isRed(layer);

  // Dark layer: the name rests, and the hover band reveals the real description.
  // Red layer: the rows carry the alternate one-liner, so the spotlight has a payoff here
  // too — a small, deliberate improvement on the reference, which hides this list entirely.
  const rows = projects
    .map((p, i) =>
      headingMask({
            first: i === 0,
            interactive: !red,
            deep: `
              <div class="row align-items-center">
                <div class="col-lg-10 offset-lg-2 col-sm-11 offset-sm-1 col-12">
                  <div class="simple-masking overflow-hidden">
                    <div class="simple-masking_el js-simple-masking_el">
                      <!--
                        The deployed app wins over the source, and a project with neither is plain
                        text rather than an anchor.

                        Live first because the row name is the thing a visitor clicks to see the
                        project, and a repository is the answer to a different question; the
                        showcase link resolves the same way, so the two cannot disagree. Rows with
                        no deployment fall through to their source.

                        The no-link case used to fall back to href="#", which still reads as a link
                        to a pointer, a screen reader and the keyboard, and then jumps the page to
                        the top when activated. Omitting both fields is how a row opts out.
                      -->
                      <h3 class="h1 mb-0 container_content none-break">${
                        red || !(p.live ?? p.repo)
                          ? esc(p.name)
                          : `<a href="${esc(p.live ?? p.repo)}" target="_blank" rel="noopener noreferrer">${esc(p.name)}</a>`
                      }</h3>
                    </div>
                  </div>
                </div>
              </div>`,
            masking: `
              <div class="row align-items-center">
                <div class="col-lg-5 col-sm-8 offset-lg-2 offset-sm-1 col-12">
                  <div class="simple-masking"><div class="simple-masking_el">
                    <span class="h1 mb-0 text-dark none-break">${esc(p.name)}</span>
                  </div></div>
                </div>
                <div class="col-lg-5 col-sm-4 col-12 text-dark d-sm-block d-none">
                  <p class="mb-0 desc project_blurb">${esc(red ? p.redDesc : p.desc)}</p>
                  <p class="mb-0 sub-content">${esc(p.stack)} · ${esc(p.date)}</p>
                </div>
              </div>`,
          }),
    )
    .join('');

  return `
    <div class="${cx('client', red ? 'client__red' : 'js-client')}">
      <div class="row client_info">
        <div class="col-lg-10 col-sm-10 offset-lg-2 offset-sm-1 col-12">
          <div class="client_content container_content ${red ? '' : 'js-cursor-extend'}">
            ${label('Projects', red ? 'text-dark' : '')}
            <div class="client_content_desc h2">
              ${scrollParagraph(
                red
                  ? 'Out of all of them only <strong>five qualified</strong> as worth showing. And I only ended up using them, no one else.'
                  : 'I have built a lot of <strong>real world projects</strong>, and every one of them because I faced the problem myself.',
                { animate: !red },
              )}
            </div>
          </div>
        </div>
      </div>

      <div class="client_list">
        ${red ? '' : `
        <div class="client_list_3d" data-lenis-speed=".1" aria-hidden="true">
          <div class="js-client_list_3d client_list_3d_inner">
            <canvas class="js-object3d" data-object="earth"></canvas>
          </div>
        </div>`}
        <div class="client_list_inner">${rows}</div>
        <div class="row">
          <div class="col-lg-10 offset-lg-2 col-sm-11 offset-sm-1 col-12">
            <div class="dots container_content" aria-hidden="true">
              ${projects.map(() => '<span></span>').join('')}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------- showcase (was: reel) */

export function showcase(layer) {
  const red = isRed(layer);
  const flagship = projects[0];

  return `
    <div class="${cx('video', red && 'video__red')}">
      <div class="${cx('videoPlayer', !red && 'js-videoPlayer')}">
        <!--
          The spotlight's own label: it rides the cursor disc, the way the reference's "PLAY REEL"
          does. A child of the SECTION rather than of the sticky window inside it, because that is
          what makes the positioning possible in CSS alone - see the note on .videoPlayer_cta.
        -->
        <span class="videoPlayer_cta" aria-hidden="true">Open<br>live app</span>
        <div class="${cx('videoPlayer_inner', red ? 'videoPlayer_inner__red' : 'js-videoPlayer_inner')}">
          <!--
            The whole panel is the link, which is how the reference behaves: its reel has no button,
            the panel itself is the target and the cursor spotlight becomes the label.

            An anchor rather than a click handler on the div, so it works from the keyboard and shows
            its destination in the status bar for free. The red layer's copy is inert, because two
            anchors over the same pixels would be two tab stops to the same place.
          -->
          <a
            class="videoPlayer_link"
            href="${flagship.live ?? flagship.repo}"
            target="_blank"
            rel="noopener noreferrer"
            ${red ? 'tabindex="-1" aria-hidden="true"' : ''}
          ><span class="visually-hidden">Open ${esc(flagship.name)}, live</span></a>

          <!--
            BYOS's own interface, rebuilt from its components, running its agent.

            Not a screen recording and not screenshots. Both were tried: a video came to 2.6MB and
            amounted to watching someone scroll, and stills read as a slideshow. Built from components
            it is a few KB, stays sharp, and can actually show the feature working.

            What it shows is true, and the permission chip is the reason it is true. PROJECT.md 4.8
            gives the agent four modes; on AUTO-ORGANIZE reversible work - folders, renames, moves,
            tags - runs immediately, while destructive or public steps still wait for a click. So the
            reversible steps here complete and change the file list, and delete_file and
            create_share_link sit and wait. The tool names are the real ones from that table.

            Design system is BYOS's own, from BYOS/tokens.json and theme.css. Its two typefaces
            (Signifier, Sohne) are licensed and substituted, as elsewhere in this rebuild.

            Decorative: the caption underneath says what it is in text.
          -->
          ${red ? '' : `
          <div class="byos js-byos" aria-hidden="true">
            <div class="byos_scale">
            <div class="byos_win">
              <div class="byos_rail">
                <span class="byos_mark">B</span>
                <span class="byos_new">+</span>
                ${Array.from({ length: 5 }, (_, i) => `<span class="byos_ico${i === 0 ? ' is-on' : ''}"></span>`).join('')}
              </div>

              <div class="byos_main">
                <div class="byos_top">
                  <span class="byos_search">Search files &amp; folders&hellip;<span class="byos_kbd">&#8984;K</span></span>
                  <span class="byos_avatar">S</span>
                </div>

                <div class="byos_head">
                  <span class="byos_h1">My Drive</span>
                  <span class="byos_seg"><span class="is-on">List</span><span>Grid</span></span>
                </div>

                <!-- Filled per scenario by showcase.ts, so the loop can run several. -->
                <div class="byos_rows js-byos-rows"></div>

                <span class="byos_agent">
                  <span class="byos_plan js-byos-plancard">
                    <span class="byos_plan_t">Plan <em class="js-byos-count"></em></span>
                    <span class="js-byos-steps"></span>
                    <span class="byos_plan_n js-byos-note"></span>
                  </span>

                  <span class="byos_ask">
                    <span class="byos_ask_p"><span class="js-byos-typed"></span><span class="byos_caret js-byos-caret"></span></span>
                    <span class="byos_chip js-byos-chip">Auto-organize</span>
                    <span class="byos_send"></span>
                  </span>
                </span>
              </div>
            </div>
            </div>
          </div>`}
        </div>
      </div>

    </div>`;
}

/* ---------------------------------------------------------------- achievements */

export function achievementList(layer) {
  const red = isRed(layer);

  const items = achievements
    .map(
      (a, i) => `
      <div class="${cx('testimonial', !red && 'js-testimonial')}">
        <div class="testimonial_inner container_content ${red ? '' : 'js-cursor-extend'}">
          <span class="${cx('testimonial_index', red && 'text-dark')}" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
          <div class="testimonial_content h2">
            ${scrollParagraph(
              (red ? a.redLines : a.lines).map(esc).join('<br>'),
              { animate: !red },
            )}
          </div>
          <div class="testimonial_info">
            <p class="${cx('testimonial_info_name', 'desc', 'mb-1', red && 'text-dark')}">${esc(a.org)}</p>
            <p class="${cx('testimonial_info_position', 'sub-content', red && 'text-dark')}">${esc(a.label)}</p>
          </div>
        </div>
      </div>`,
    )
    .join('');

  return `
    <div class="${cx('testimonials', red ? 'testimonials__red' : 'js-testimonials')}">
      <div class="row">
        <div class="col-lg-8 col-sm-10 col-12 offset-lg-2 offset-sm-1">
          ${label('What I have won', cx('container_content', red && 'text-dark'))}
        </div>
      </div>
      <!--
        The rail is a column of THIS row, alongside the items, not a row of its own above them.
        A sticky element only travels within its containing block, so the rail has to share a
        parent that spans the whole list; in its own short row it had nowhere to stick to.
      -->
      <div class="${cx('testimonial_lists', !red && 'js-testimonial_lists', 'row')}">
        <div class="col-lg-8 col-sm-10 col-12 offset-lg-2 offset-sm-1">${items}</div>
        <div class="col-lg-1 col-2 testimonials_thumbs_col">
          <div class="testimonials_thumbs">
            <div class="${cx('testimonials_thumbs_list', red ? 'js-testimonials_thumbs_list__red' : 'js-testimonials_thumbs_list')}">
              <div class="testimonials_thumbs_inner">
                <ul class="testimonials_thumbs_list_list ul__reset">
                  ${achievements
                    .map(
                      (a, i) => `
                    <li class="thumb-item ${i === 0 ? 'is-active' : ''}">
                      <span class="thumb-item_inner">${esc(a.badge)}</span>
                    </li>`,
                    )
                    .join('')}
                </ul>
                <span class="testimonials_thumbs_flash js-testimonials_thumbs_flash"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------- motto */

export function motto(layer) {
  const red = isRed(layer);
  const lines = red ? site.motto.redLines : site.motto.lines;
  const who = red ? site.motto.redAttribution : site.motto.attribution;

  return `
    <div class="${cx('motto', red && 'motto__red')}">
      <!--
        The photo band. In BOTH layers so the cursor spotlight swaps the photograph between the
        two grades rather than wiping it to a flat field; absolutely positioned, so it adds no
        flow height and cannot pull the layers out of alignment.
      -->
      <div class="motto_bg js-band" aria-hidden="true">
        <div class="band_media" data-lenis-speed=".08">
          <canvas class="js-webgl" data-webgl="${red ? 'band-red' : 'band'}" data-photo="/assets/bands/beach.jpg"></canvas>
        </div>
      </div>
      <div class="motto_content container_content">
        <div class="row justify-content-center align-items-center">
          <div class="col-lg-8 col-12 motto_content_inner ${red ? '' : 'js-cursor-extend'}">
            <div>
              <p class="${cx('text-center', 'mb-0', 'h6', 'js-anim--lines--sim', red && 'text-dark')}" data-offset=".88"${red ? ' data-no-anim' : ''}>${esc(site.motto.label)}</p>
              <p class="${cx('text-center', 'motto_content_heading', 'h1', 'mb-0', 'js-anim--chars', red && 'text-dark')}" data-offset=".88"${red ? ' data-no-anim' : ''}>${lines.map(esc).join('<br>')}</p>
              <p class="${cx('desc', 'text-center', 'mb-0', 'js-anim--lines--sim', red && 'text-dark')}" data-offset=".88"${red ? ' data-no-anim' : ''}>${esc(who)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------- contact */

export function contact(layer) {
  const red = isRed(layer);
  const half = Math.ceil(socials.length / 2);
  const columns = [socials.slice(0, half), socials.slice(half)];

  const linkList = (group) => `
    <ul class="ul__reset">
      ${group
        .map((s) =>
          headingMask({
            first: true,
            interactive: !red,
            className: 'social-link h3',
            deep: `<a class="contact_link" href="${esc(s.href)}" target="_blank" rel="noopener noreferrer">${esc(s.label)}</a>`,
            masking: `<span class="text-dark contact_link">${esc(s.redLabel)}</span>`,
          }),
        )
        .join('')}
    </ul>`;

  // Email is assembled at runtime so it isn't sitting in the markup for scrapers.
  const emailParts = site.contact.email.split('@');

  const infoBlock = (title, note, value, href, extraClass = '') => `
    <div class="${cx('heading-mask', 'contact_info', extraClass, !red && 'js-cursor-contract', 'heading-mask__now', red && 'contact_info__red')}">
      <div class="heading-mask_el heading-mask_el__deep">
        <span class="h4 d-block">${esc(title)}</span>
        <a class="sub-content" href="${esc(href)}">${value}</a>
      </div>
      <div class="heading-mask_el heading-mask_el__masking" aria-hidden="true">
        <span class="h4 d-block text-dark">${esc(note)}</span>
        <span class="sub-content text-dark">${value}</span>
      </div>
    </div>`;

  return `
    <div class="${cx('contact', red && 'contact__red', 'container_content', red && 'op-0')}"${red ? ' aria-hidden="true"' : ''}>
      <div class="row">
        <div class="col-lg-8 col-sm-10 col-12 offset-lg-2 offset-sm-1">
          ${label(site.contact.label, red ? 'text-dark' : '')}
        </div>
      </div>
      <div class="row">
        <div class="col-lg-3 col-sm-5 offset-lg-2 offset-sm-1 col-12">${linkList(columns[0])}</div>
        <div class="col-lg-3 col-sm-5 col-12">${linkList(columns[1])}</div>
        <div class="col-lg-3 col-12 contact_content">
          <div class="row">
            <div class="col-lg-12 col-sm-5 offset-lg-0 offset-sm-1 col-12">
              ${infoBlock(
                'Email',
                site.contact.emailNote,
                `<span class="js-email" data-user="${esc(emailParts[0])}" data-domain="${esc(emailParts[1])}"></span>`,
                '#',
                'contact_info__top',
              )}
            </div>
            <div class="col-lg-12 col-sm-5 col-12">
              ${infoBlock('Phone', site.contact.phoneNote, esc(site.contact.phone), `tel:${site.contact.phone.replace(/\s/g, '')}`)}
            </div>
          </div>
        </div>
      </div>
    </div>`;
}
