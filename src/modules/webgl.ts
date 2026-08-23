/**
 * Procedural backgrounds.
 *
 * Most image slots in the design are generated in a fragment shader rather than sourced: no
 * licensing question, nothing to download, and the result is resolution-independent. Where a
 * real photograph is supplied it is graded to the palette rather than shown as-is.
 *
 *   field  a slow drifting fbm-noise haze          (the banner band behind the headline, showcase)
 *   orb    a soft displaced sphere                 (the mark beside the project list)
 *   photo  a still image, keyed and graded         (the hero portrait)
 *   band   a still image as a two-tone duotone     (the full-bleed band above History)
 *
 * Each canvas gets its own context, created only when it first scrolls into view and paused
 * whenever it leaves — five always-rendering contexts would cost far more than this design
 * needs.
 */

import {
  ClampToEdgeWrapping, Mesh, OrthographicCamera, PlaneGeometry,
  SRGBColorSpace, Scene, ShaderMaterial, Texture, TextureLoader, Vector2, Vector3, WebGLRenderer,
} from 'three';
import { getPointer, prefersReducedMotion } from './env';

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

/** Value-noise fbm. Cheap, and at these scales indistinguishable from anything fancier. */
const NOISE = /* glsl */ `
  vec2 hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(dot(hash(i + vec2(0.0, 0.0)), f - vec2(0.0, 0.0)),
                   dot(hash(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0)), u.x),
               mix(dot(hash(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0)),
                   dot(hash(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0)), u.x), u.y);
  }

  float fbm(vec2 p) {
    float total = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      total += noise(p) * amplitude;
      p *= 2.02;
      amplitude *= 0.5;
    }
    return total;
  }
`;

const FIELD_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uInk;
  uniform vec3 uAccent;
  uniform float uAccentMix;
  uniform float uLift;

  ${NOISE}

  void main() {
    // Correct for aspect so the noise cells stay round on wide canvases.
    vec2 p = vUv;
    p.x *= uResolution.x / max(uResolution.y, 1.0);

    float t = uTime * 0.035;
    // Two offset fbm samples advected against each other give slow, non-repeating drift.
    float warp = fbm(p * 1.7 + vec2(t, -t * 0.6));
    float n = fbm(p * 2.6 + warp * 1.4 + vec2(-t * 0.4, t * 0.8));
    n = smoothstep(-0.45, 0.65, n);

    // Kept close to the page background on purpose. The reference's hero is a near-black
    // photograph where the subject is barely legible — the headline is the subject, and any
    // more contrast here turns the backdrop into the focal point instead.
    vec3 col = mix(vec3(0.012), uInk * 0.16 * uLift, n * 0.62);
    col = mix(col, uAccent * 0.35 * uLift, pow(n, 4.5) * uAccentMix);

    // Vignette, so type sits on the darkest part of the frame.
    float r = distance(vUv, vec2(0.5));
    col *= 1.0 - smoothstep(0.28, 0.92, r) * 0.85;

    // Dither: banding is very visible across a near-black gradient.
    float grain = (hash(vUv * uResolution + uTime).x) * 0.006;
    gl_FragColor = vec4(col + grain, 1.0);
  }
`;

/*
 * Portrait: a still photograph displaced by depth, so it parallaxes in 2.5D with the pointer.
 *
 * The reference's hero is real video footage of its subject. A photograph cannot move, so the
 * movement is manufactured: sample the image at an offset that scales with each pixel's depth,
 * and the near parts of the subject travel further than the far ones as the cursor crosses.
 *
 * DEPTH COMES FROM A BACKDROP KEY, NOT FROM LUMINANCE. The obvious trick is "brighter is nearer",
 * and on this photograph it is exactly inverted: it is a studio shot on a mid-grey backdrop, so
 * the background is brighter than the subject's dark hair. Keying on distance from the backdrop
 * colour instead gives a clean subject mask, which is far better depth than luminance would be.
 * The backdrop colour is sampled from the image's TOP corners at load: the bottom corners are the
 * subject's jacket, not the wall.
 *
 * A real depth map can be dropped in beside the photo and takes precedence over the key.
 */
/*
 * Band: a photograph reduced to a two-tone duotone.
 *
 * The sources are bright, saturated candids. Dropped in untouched, one would be the only
 * full-colour thing on a page built from exactly three colours, and would read as a pasted-in
 * snapshot. Each band names its own image via `data-photo` on the canvas.
 *
 * What makes the duotone work is that the photograph already has the site's polarity. Measured
 * on the source, the subject sits at luminance 24-73 (shirt, hair, jeans) while the sky and sand
 * sit at 145-181. So mapping luminance onto a ramp between two palette colours turns the sky into
 * a flat field and the rider into a silhouette, which is the same figure-on-ground the rest of the
 * page is made of. The sea horizon disappears into the field at these levels, which is what stops
 * it reading as a beach photo.
 *
 * uLo/uHi are the black and white points of that remap, in sRGB luminance. They are not arbitrary:
 * 0.09 sits just under the subject's darkest tone and 0.72 just over the sky, so the ramp spends
 * its whole range on the part of the histogram that carries the picture.
 *
 * uFloor/uCeil are the two ends of the ramp, and they are what makes the SAME photograph work as a
 * backdrop for BOTH layers' text. The headline sits on the band, so each layer needs the image
 * graded to where its own type is legible: the dark layer ramps into deep warm shadow so beige
 * type reads over it, the red layer ramps within the bright half of the accent so near-black type
 * reads over it. Measured worst-case contrast across the whole band is 5.79:1 and 3.2:1.
 *
 * THE MATH IS DONE IN sRGB, DELIBERATELY, AND THE RESULT IS NOT CONVERTED BACK.
 *
 * The texture is declared sRGB, so the GPU decodes it to linear on sample and texture2D hands
 * back linear. It gets converted up front because a luminance ramp and a two-colour mix in linear
 * space put the midtones somewhere quite different.
 *
 * The output stays in sRGB because a raw ShaderMaterial gets NO output conversion: three.js only
 * injects that for shaders including <colorspace_fragment>, which none of the shaders in this
 * file do. Converting the result back to linear on the way out therefore darkened it a second
 * time, and the band came out a muddy olive instead of the palette's beige.
 */
const BAND_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uMap;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  uniform float uFocusX;
  uniform float uFocusY;
  uniform float uZoom;
  uniform float uMaxSpanY;
  uniform float uWindowFrac;
  uniform vec3 uFloor;
  uniform vec3 uCeil;
  uniform float uLo;
  uniform float uHi;
  uniform float uGamma;
  uniform float uVignette;

  vec3 toSrgb(vec3 c) { return pow(max(c, 0.0), vec3(1.0 / 2.2)); }

  /*
   * Cover fit. uv.y runs UPWARDS here (three.js flips textures), so a focus measured from the top
   * of the photograph is passed in already inverted.
   *
   * uMaxSpanY is what makes this survive a narrow band. On a wide desktop band the crop is
   * vertical and only the middle of the photograph is used, which is the intent. But once the
   * band gets close to the source's own 16:9 - a tablet in portrait, where a vh-based height is
   * tall and the viewport is narrow - a plain cover fit shows the FULL image height, which brings
   * back the empty sky above the subject and the sea horizon and sand below it. That is exactly
   * the beach-snapshot read the grade exists to remove.
   *
   * So the sampled height is capped, and both axes are scaled by the same factor to hold the
   * aspect: the effect is an automatic zoom on narrow bands, keeping the rider filling the frame
   * at every viewport instead of only the one it was tuned on.
   *
   * uWindowFrac is why the cap is measured against the VISIBLE band rather than the canvas. The
   * canvas is deliberately taller than the band so the parallax has room to travel, which makes
   * its aspect much squarer than what anyone sees. Capping on the canvas therefore fired on the
   * wide desktop band too and zoomed it in, cropping the horse out of a composition that did not
   * need fixing. The cap now applies to span.y * uWindowFrac, the slice actually on screen.
   */
  vec2 coverUv(vec2 uv) {
    float dst = uResolution.x / max(uResolution.y, 1.0);
    float src = uImageSize.x / max(uImageSize.y, 1.0);
    vec2 span = dst > src ? vec2(1.0, src / dst) : vec2(dst / src, 1.0);
    span *= min(1.0, uMaxSpanY / max(span.y * uWindowFrac, 0.0001));
    span /= uZoom;

    /*
     * Horizontal focus applied only to the extent there IS horizontal slack.
     *
     * The rider sits at x = 0.42 of the frame, so a centred crop leaves dead field to his right
     * on any band narrow enough to crop horizontally. Panning to him fixes that - but on a wide
     * desktop band the full width is already in use, and panning there would sample outside the
     * texture and smear the clamped edge. Weighting by (1 - span.x) makes the pan fade to nothing
     * exactly as the slack does.
     */
    float cx = mix(0.5, uFocusX, clamp(1.0 - span.x, 0.0, 1.0));
    return vec2(cx, uFocusY) + (uv - 0.5) * span;
  }

  void main() {
    vec2 uv = clamp(coverUv(vUv), 0.0, 1.0);
    vec3 s = toSrgb(texture2D(uMap, uv).rgb);

    float l = dot(s, vec3(0.299, 0.587, 0.114));
    float t = clamp((l - uLo) / (uHi - uLo), 0.0, 1.0);
    /*
     * Midtone weighting. A flat remap leaves a busy, evenly-lit source reading as busy: an office
     * full of glass and chairs stays legible as an office and competes with the headline sitting on
     * it. A gamma above 1 pushes the midtones down so the clutter sinks into the field while the
     * highlights that describe the subject survive, which is what the reference's own bands look
     * like (median 24, p95 53 - this lands at 26 and 55).
     */
    t = pow(t, uGamma);

    /*
     * Vignette on the long axis only, and cubic so it stays flat across the middle and falls off
     * hard at the very edges. That is what lets the band meet the page background at its left and
     * right edges instead of ending on a visible seam.
     */
    float dx = abs(vUv.x - 0.5) * 2.0;
    t *= 1.0 - uVignette * pow(dx, 3.0);

    gl_FragColor = vec4(mix(uFloor, uCeil, t), 1.0);
  }
`;

const PORTRAIT_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uMap;
  uniform sampler2D uDepth;
  uniform float uHasDepth;
  uniform vec2 uPointer;
  uniform vec2 uResolution;
  uniform vec2 uImageSize;
  uniform vec2 uFocus;
  uniform float uZoom;
  uniform vec3 uBackdrop;
  uniform vec3 uInk;

  float lum(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  /*
   * Cover-fit: the photograph fills the frame with no gaps, cropped rather than letterboxed.
   *
   * The source is square and the hero is roughly 1.6:1, so this crops away about 40% of the image
   * height and lands on a tight face. That tight crop is the intent — it is what makes the
   * headline sit on a face rather than on a portrait.
   *
   * uFocus positions the crop window, so the eyes land on the upper third instead of the frame
   * centre.
   */
  vec2 coverUv(vec2 uv) {
    float viewAspect = uResolution.x / max(uResolution.y, 1.0);
    float imgAspect = uImageSize.x / max(uImageSize.y, 1.0);
    vec2 scale = viewAspect < imgAspect
      ? vec2(imgAspect / viewAspect, 1.0)
      : vec2(1.0, viewAspect / imgAspect);
    /* uZoom above 1 widens the crop window to show more of the photograph. */
    return (uv - 0.5) * uZoom / scale + uFocus;
  }

  /*
   * Fade anything sampled beyond the image to black.
   *
   * Zooming out far enough to see the whole subject means the crop window runs past the edge of
   * the photograph. Relying on the texture clamp there stretches the last row of wall pixels into
   * a flat panel; falling to black instead reads as the dark room the reference's subject stands
   * in, which is the intent anyway.
   */
  float insideImage(vec2 iuv) {
    vec2 f = smoothstep(vec2(0.0), vec2(0.10), iuv)
           * smoothstep(vec2(0.0), vec2(0.10), 1.0 - iuv);
    return f.x * f.y;
  }

  /* How far this pixel is from the backdrop: 0 on the wall, 1 on the subject. */
  float subjectAt(vec2 uv) {
    vec3 c = texture2D(uMap, uv).rgb;
    return smoothstep(0.05, 0.30, distance(c, uBackdrop));
  }

  float depthAt(vec2 uv) {
    if (uHasDepth > 0.5) return texture2D(uDepth, uv).r;
    /*
     * Heavily blurred, and the width matters more than it looks.
     *
     * The displacement is proportional to depth, so a sharp change in depth between neighbouring
     * pixels sends them to sample points far apart and the image tears. A wide, smooth gradient
     * is what buys the headroom to push the rotation far enough to actually see. 7 taps at a
     * wider step, which is a much softer field than the 5 taps used before.
     */
    float total = 0.0;
    const float STEP = 0.011;
    for (int y = -3; y <= 3; y++) {
      for (int x = -3; x <= 3; x++) {
        total += subjectAt(uv + vec2(float(x), float(y)) * STEP);
      }
    }
    return total / 49.0;
  }

  void main() {
    vec2 uv = coverUv(vUv);
    float inside = insideImage(uv);
    if (inside <= 0.001) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    float d = depthAt(uv);

    /*
     * Pointer parallax, and only that. The displacement is UNSIGNED: every pixel shifts the same
     * way in proportion to its depth, so the subject slides against the backdrop.
     *
     * A scroll-driven head turn was tried here and removed. Shearing UVs cannot foreshorten, and
     * doing it properly (depth-displaced geometry under a perspective camera) pulled the hair
     * apart at the silhouette, because the keyed depth has no real information inside dark hair
     * against a dark edge. A still photograph parallaxing is the honest version of this effect.
     */
    vec2 offset = uPointer * d * 0.030;

    vec3 col = texture2D(uMap, uv + offset).rgb;

    /* Graded to the palette. This has to go a long way: the source is an evenly lit studio shot
     * and the headline sits directly on top of it, so it is pushed most of the way to silhouette.
     */
    float l = lum(col);
    col = mix(vec3(l), col, 0.22);
    col = mix(col, uInk * l * 1.15, 0.38);
    /*
     * The exponent is the contrast and the multiplier is the exposure. Lifted from 2.1/1.30 to
     * 1.85/1.50, which brings the midtones up about 40% (0.30 -> 0.42 on a mid-grey input) while
     * keeping the blacks down. Raising exposure alone would have washed out the shadows instead.
     */
    col = pow(max(col, 0.0), vec3(1.85)) * 1.50;

    /* Vignette, plus an extra falloff through the middle where the type sits. */
    col *= inside;

    float r = distance(vUv, vec2(0.5));
    col *= 1.0 - smoothstep(0.32, 0.98, r) * 0.72;
    /* Extra falloff down the middle, where the headline sits. */
    col *= 1.0 - smoothstep(0.42, 0.0, abs(vUv.x - 0.5)) * 0.24;

    float grain = fract(sin(dot(vUv * uResolution, vec2(12.9898, 78.233))) * 43758.5453) * 0.007;
    gl_FragColor = vec4(col + grain, 1.0);
  }
`;

const ORB_FRAG = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uInk;
  uniform vec3 uAccent;

  ${NOISE}

  void main() {
    // Aspect-correct so the body stays spherical in any container.
    vec2 p = (vUv - 0.5) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    float t = uTime * 0.04;

    const float RADIUS = 0.34;
    float r = length(p);

    // Reconstruct the sphere's surface normal from the screen-space offset. Shading against a
    // real normal is what makes this read as a body with volume; lighting a flat disc by its
    // 2D direction leaves a pinch artefact at the centre, where the direction is undefined.
    float z2 = RADIUS * RADIUS - r * r;
    if (z2 <= 0.0) {
      gl_FragColor = vec4(0.0);
      return;
    }
    vec3 n = vec3(p / RADIUS, sqrt(z2) / RADIUS);

    vec3 lightDir = normalize(vec3(-0.55, 0.45, 0.72));
    float diffuse = max(dot(n, lightDir), 0.0);
    // Wrapped term, so the dark limb keeps some form instead of going flat black.
    float wrapped = diffuse * 0.82 + 0.18;

    // Surface detail sampled in the normal's space, so it sits on the sphere and turns with it
    // rather than sliding across the screen.
    float bands = fbm(n.xy * 3.1 + vec2(t, -t * 0.5) + n.z * 0.6);
    float mottle = fbm(n.xy * 7.0 - vec2(t * 0.8, t));

    vec3 col = uInk * 0.30 * wrapped;
    col = mix(col, uInk * 0.85, smoothstep(0.05, 0.75, bands) * diffuse * 0.55);
    col = mix(col, uAccent, smoothstep(0.45, 0.95, mottle) * diffuse * 0.30);

    // Terminator falloff and a thin rim on the lit side.
    float limb = smoothstep(0.0, 0.35, n.z);
    float rim = pow(1.0 - n.z, 3.0) * smoothstep(0.0, 0.4, diffuse);
    col += uAccent * rim * 0.55;

    // Feather the silhouette by a pixel or so to avoid a jagged edge.
    float edge = 1.0 - smoothstep(RADIUS - 0.004, RADIUS, r);
    gl_FragColor = vec4(col, edge * (0.25 + 0.75 * limb));
  }
`;

/** Palette, read from CSS so the shaders and the stylesheet cannot disagree. */
function readPalette(): { ink: [number, number, number]; accent: [number, number, number] } {
  const styles = getComputedStyle(document.documentElement);
  const parse = (name: string, fallback: [number, number, number]): [number, number, number] => {
    const raw = styles.getPropertyValue(name).trim();
    const hex = /^#([0-9a-f]{6})$/i.exec(raw);
    if (!hex) return fallback;
    const int = parseInt(hex[1], 16);
    // sRGB -> linear, since the renderer works in linear space.
    const channel = (c: number) => Math.pow(c / 255, 2.2);
    return [channel((int >> 16) & 255), channel((int >> 8) & 255), channel(int & 255)];
  };
  return {
    ink: parse('--c-text', [0.44, 0.39, 0.31]),
    accent: parse('--c-red', [0.79, 0.09, 0.04]),
  };
}

interface Instance {
  canvas: HTMLCanvasElement;
  renderer: WebGLRenderer;
  scene: Scene;
  camera: OrthographicCamera;
  material: ShaderMaterial;
  mesh: Mesh;
  visible: boolean;
  /** Set once a photograph has replaced the procedural backdrop: a still, not an animation. */
  portrait: boolean;
  /** Whether that still reads uPointer. The portrait parallaxes; the duotone band does not. */
  pointerDriven?: boolean;
  /** For a band: the clipping window the over-tall canvas is seen through. */
  viewport?: HTMLElement;
  /** Whether at least one frame has been drawn; a still image need not redraw. */
  drawn?: boolean;
}

const instances: Instance[] = [];

// Exposed for the Playwright tooling: reading a uniform directly is the only way to tell a
// stalled driver from an effect that is merely too subtle to see.
(window as unknown as { __webgl?: Instance[] }).__webgl = instances;
let rafId = 0;
let started = 0;

function build(canvas: HTMLCanvasElement): Instance | null {
  const variant = canvas.dataset.webgl ?? 'field';
  const palette = readPalette();

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: variant === 'orb',
      antialias: false,
      powerPreference: 'low-power',
    });
  } catch {
    // No WebGL: the CSS background behind the canvas is a deliberate fallback, not a blank box.
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

  const material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: variant === 'orb' ? ORB_FRAG : FIELD_FRAG,
    transparent: variant === 'orb',
    uniforms: {
      uTime: { value: Math.random() * 40 },
      uResolution: { value: new Vector2(1, 1) },
      uInk: { value: palette.ink },
      uAccent: { value: palette.accent },
      /*
       * The hero stays nearly monochrome so the headline owns the frame. The showcase is a
       * panel in its own right and needs enough presence to read as one, so it carries the
       * most accent; the banner bands sit in between.
       */
      uAccentMix: { value: variant === 'hero' ? 0.12 : variant === 'showcase' ? 0.75 : 0.35 },
      // Overall brightness, so one shader can serve a backdrop and a foreground panel.
      uLift: { value: variant === 'showcase' ? 2.6 : 1.0 },
    },
  });

  const scene = new Scene();
  const mesh = new Mesh(new PlaneGeometry(2, 2), material);
  scene.add(mesh);

  const instance: Instance = {
    canvas, renderer, scene, camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1),
    material, mesh, visible: false, portrait: false,
  };

  resize(instance);

  // Photograph slots, if the files have been supplied.
  if (variant === 'hero') void tryPortrait(instance);
  /*
   * A band declares its own image, so a section becomes a photo band by adding one attribute and
   * goes back to the procedural field by removing it. The variant carries which layer it is in,
   * because that decides the grade.
   */
  if (variant === 'band' || variant === 'band-red') {
    const src = canvas.dataset.photo;
    if (src) void tryBand(instance, variant === 'band-red' ? 'accent' : 'ink', src);
  }

  return instance;
}

/**
 * Size the drawing buffer to the canvas's LAYOUT box.
 *
 * `getBoundingClientRect()` reports the transformed size, and the hero background lives inside
 * a `scale(1.18)` wrapper: measuring it sized the buffer to the scaled box, so every resize
 * inflated it further (1800x1049 -> 2102x1225 -> ...). Multiplied by the pixel ratio that runs
 * into the browser's canvas limits and rendering degrades. `clientWidth`/`clientHeight` ignore
 * transforms, which is exactly what a backing buffer wants.
 */
/**
 * Swap the hero's procedural backdrop for a photograph, if one exists.
 *
 * Best-effort by design: a missing file leaves the noise shader in place rather than a black
 * rectangle, so the site is complete either way and the photo is an upgrade rather than a
 * dependency.
 */
async function tryPortrait(instance: Instance): Promise<void> {
  const loader = new TextureLoader();
  const load = (url: string) =>
    new Promise<Texture | null>((resolve) => loader.load(url, resolve, undefined, () => resolve(null)));

  const map = await load('/assets/hero/portrait.jpg');
  if (!map) return;

  map.colorSpace = SRGBColorSpace;
  // Clamped: the displacement samples slightly outside the frame, and wrapping would drag the
  // opposite edge of the photo into view.
  map.wrapS = ClampToEdgeWrapping;
  map.wrapT = ClampToEdgeWrapping;

  const image = map.image as HTMLImageElement;
  const backdrop = sampleBackdrop(image);
  const palette = readPalette();

  instance.material.dispose();
  instance.material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: PORTRAIT_FRAG,
    uniforms: {
      uMap: { value: map },
      /*
       * No depth map is shipped, so the shader always takes its keyed path. The uniform still needs a
       * texture bound, and the photograph itself is the cheapest valid one.
       *
       * There used to be a speculative fetch for /assets/hero/depth.jpg here, "used when present and
       * ignored when not". Nothing was ever going to be present, so every page load spent a request
       * to 404 in the console of a portfolio.
       */
      uDepth: { value: map },
      uHasDepth: { value: 0 },
      uPointer: { value: new Vector2(0, 0) },
      uResolution: { value: new Vector2(instance.canvas.clientWidth || 1, instance.canvas.clientHeight || 1) },
      uImageSize: { value: new Vector2(image.naturalWidth || 1, image.naturalHeight || 1) },
      /*
       * Crop window. A larger x samples further right in the photograph, which moves the subject
       * LEFT on screen; y places the eyes on the upper third.
       */
      uFocus: { value: new Vector2(0.665, 0.45) },
      uZoom: { value: 1.5 },
      uBackdrop: { value: backdrop },
      uInk: { value: palette.ink },
    },
  });
  instance.mesh.material = instance.material;
  instance.portrait = true;
  instance.pointerDriven = true;
  resize(instance);
}

/**
 * Per-photograph tuning.
 *
 * These cannot be one shared set of numbers, because the two sources have almost nothing in
 * common beyond both being candids. Measured on each:
 *
 *   beach   histogram 24-181, no clipping. A dark subject against a bright, near-empty sky, so a
 *           narrow remap (0.09-0.72) spends the whole ramp on the part that carries the picture,
 *           and no midtone weighting is needed because there is no clutter to suppress.
 *
 *   office  histogram 0-255 WITH clipping: a black tee at 1 and a white desk at 255, and a quarter
 *           of the frame above 216. The beach's white point would flatten all of that to one
 *           value, so the range opens up to 0.02-0.92. It also needs gamma: the room is full of
 *           glass, chairs and ceiling detail that stays readable as a room under a flat remap and
 *           fights the headline for attention.
 *
 * `focus` is [x, y] with y measured from the TOP of the photograph, which is how you read an image,
 * and inverted for the flipped texture at the point of use. `level` is how far up the palette the
 * dark layer's ramp reaches - the brighter source can afford slightly more, since its own midtones
 * have already been pulled down by the gamma.
 */
interface BandTuning {
  focus: [number, number];
  range: [number, number];
  level: number;
  gamma: number;
}

const BAND_TUNING: Record<string, BandTuning> = {
  '/assets/bands/office.jpg': { focus: [0.47, 0.45], range: [0.02, 0.92], level: 0.30, gamma: 1.5 },
  '/assets/bands/beach.jpg': { focus: [0.42, 0.34], range: [0.09, 0.72], level: 0.26, gamma: 1.0 },
};

/* Deliberately conservative: a photograph nobody has measured gets a safe mid remap, not a guess. */
const BAND_FALLBACK: BandTuning = { focus: [0.5, 0.45], range: [0.05, 0.88], level: 0.26, gamma: 1.3 };

/**
 * The two ends of the band's duotone ramp, in sRGB, derived from the palette tokens.
 *
 * The headline sits on this band, so each layer needs the photograph graded to where its own type
 * stays legible, and the two requirements are opposites:
 *
 *   dark layer  beige type (#b7ab98) on the band -> the band must stay DARK. The ramp runs from
 *               just below the page background up to 26% of the way to beige, which lands the
 *               field at luminance ~37 and the rider at ~8. The reference's own photo band in
 *               this slot measures a median of 24, so this is the same register.
 *
 *   red layer   near-black type (#0d0d0d) on the band -> the band must stay BRIGHT. The ramp runs
 *               only within the top third of the accent, from 72% of it to full, so even the
 *               rider's silhouette stays light enough for dark type to read over it.
 *
 * Worst-case measured contrast across every pixel of the band: 5.79:1 for beige on the dark
 * grade, 3.20:1 for ink on the red. Both clear WCAG AA for type at this size.
 */
function bandRamp(tint: 'ink' | 'accent', level: number): { floor: Vector3; ceil: Vector3 } {
  const palette = readPalette();
  // readPalette works in linear for the noise shaders; the band's math is in sRGB.
  const srgb = (c: [number, number, number]) => c.map((v) => Math.pow(v, 1 / 2.2)) as [number, number, number];

  if (tint === 'accent') {
    const a = srgb(palette.accent);
    return {
      floor: new Vector3(a[0] * 0.72, a[1] * 0.72, a[2] * 0.72),
      ceil: new Vector3(a[0], a[1], a[2]),
    };
  }

  const ink = srgb(palette.ink);
  /* Below #0d0d0d on purpose: the band's shadows should sit at or under the page so its dark side
   * disappears into the page rather than showing as a lighter rectangle. */
  const FLOOR = 6 / 255;
  return {
    floor: new Vector3(FLOOR, FLOOR, FLOOR),
    ceil: new Vector3(
      FLOOR + (ink[0] - FLOOR) * level,
      FLOOR + (ink[1] - FLOOR) * level,
      FLOOR + (ink[2] - FLOOR) * level,
    ),
  };
}

/*
 * Turn a band canvas into a graded photograph.
 *
 * Best-effort in the same way as the portrait: if the file is missing the noise field stays and
 * the section still looks finished, so the photo is an upgrade rather than a dependency.
 *
 * `tint` is what separates the two layers. The dark layer ramps to the beige text colour, so the
 * band reads as a beige field with a black rider; the red layer ramps to the accent, so sweeping
 * the cursor spotlight across the band swaps the same photograph from beige to red. That is the
 * whole point of the two-layer architecture applied to an image instead of to text.
 */
async function tryBand(instance: Instance, tint: 'ink' | 'accent', src: string): Promise<void> {
  const loader = new TextureLoader();
  const map = await new Promise<Texture | null>((resolve) => {
    loader.load(src, resolve, undefined, () => resolve(null));
  });
  if (!map) return;

  map.colorSpace = SRGBColorSpace;
  // Clamped: the cover crop samples right to the edge, and wrapping would fold the far side in.
  map.wrapS = ClampToEdgeWrapping;
  map.wrapT = ClampToEdgeWrapping;

  const image = map.image as HTMLImageElement;
  const tune = BAND_TUNING[src] ?? BAND_FALLBACK;
  const ramp = bandRamp(tint, tune.level);

  instance.material.dispose();
  instance.material = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: BAND_FRAG,
    uniforms: {
      uMap: { value: map },
      uResolution: {
        value: new Vector2(instance.canvas.clientWidth || 1, instance.canvas.clientHeight || 1),
      },
      uImageSize: { value: new Vector2(image.naturalWidth || 1, image.naturalHeight || 1) },
      /*
       * 0.66 is a focus of 0.34 from the TOP of the photograph, inverted for the flipped texture.
       * Chosen so the crop holds the whole of the wind-blown hair and cuts at the print on the
       * shirt: higher and the hair is clipped, lower and the empty sky above it takes over.
       */
      /* Inverted: the tuning reads top-down, the flipped texture reads bottom-up. */
      uFocusY: { value: 1 - tune.focus[1] },
      /* The subject's own position across the frame, used only where there is slack to pan into. */
      uFocusX: { value: tune.focus[0] },
      uZoom: { value: 1.0 },
      /*
       * At most 66% of the photograph's height is ever shown. Below that the sky above the hair
       * and the horizon below the shirt come into frame; above it the crop starts clipping hair.
       */
      uMaxSpanY: { value: 0.66 },
      // Recomputed on every resize from the real layout; see resize().
      uWindowFrac: { value: 1 },
      uFloor: { value: ramp.floor },
      uCeil: { value: ramp.ceil },
      uLo: { value: tune.range[0] },
      uHi: { value: tune.range[1] },
      uGamma: { value: tune.gamma },
      uVignette: { value: 0.35 },
    },
  });
  instance.mesh.material = instance.material;
  // Flagged as a portrait so the frame loop treats it as a still and stops redrawing it.
  instance.portrait = true;
  // The band window the canvas peeks through, so resize() can measure how much of it is visible.
  instance.viewport = instance.canvas.closest<HTMLElement>('.js-band') ?? undefined;
  resize(instance);
}

/**
 * Average the image's TOP corners to find the backdrop colour.
 *
 * Top only: in this photograph the bottom corners are the subject's jacket, not the wall, and
 * averaging all four produced a "backdrop" halfway between the two that keyed neither.
 */
function sampleBackdrop(image: HTMLImageElement): [number, number, number] {
  const fallback: [number, number, number] = [0.52, 0.52, 0.53];
  try {
    const c = document.createElement('canvas');
    c.width = image.naturalWidth;
    c.height = image.naturalHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return fallback;
    ctx.drawImage(image, 0, 0);
    const at = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data;
    const a = at(4, 4);
    const b = at(c.width - 5, 4);
    // sRGB to linear, to match the space the renderer works in.
    const chan = (v: number) => Math.pow(v / 255, 2.2);
    return [chan((a[0] + b[0]) / 2), chan((a[1] + b[1]) / 2), chan((a[2] + b[2]) / 2)];
  } catch {
    return fallback;
  }
}

function resize(instance: Instance): void {
  const { canvas, renderer, material } = instance;
  const width = Math.max(1, canvas.clientWidth || Math.round(canvas.getBoundingClientRect().width));
  const height = Math.max(1, canvas.clientHeight || Math.round(canvas.getBoundingClientRect().height));
  renderer.setSize(width, height, false);
  if (material.uniforms.uResolution) {
    (material.uniforms.uResolution.value as Vector2).set(width, height);
  }

  /*
   * Measured rather than hard-coded: the value is a consequence of the band's CSS height and the
   * canvas's over-tall height, and deriving it here means changing either one cannot leave the
   * shader working from a stale ratio.
   */
  if (material.uniforms.uWindowFrac && instance.viewport) {
    const visible = instance.viewport.clientHeight || height;
    material.uniforms.uWindowFrac.value = Math.min(1, visible / Math.max(height, 1));
  }
}

/** Smoothed pointer, normalised to -1..1 from the viewport centre. */
const pointer = { x: 0, y: 0 };
/**
 * Last position actually drawn, so a settled pointer stops requesting frames.
 *
 * Seeded to Infinity, not NaN: every comparison against NaN is false, so the "has it moved" test
 * could never fire and the hero drew exactly one frame and then froze.
 */
const settled = { x: Infinity, y: Infinity };

function frame(now: number): void {
  rafId = requestAnimationFrame(frame);
  const elapsed = (now - started) / 1000;

  const raw = getPointer();
  if (raw) {
    const tx = (raw.x / window.innerWidth) * 2 - 1;
    const ty = (raw.y / window.innerHeight) * 2 - 1;
    // Eased, so the parallax trails the cursor rather than snapping to it.
    pointer.x += (tx - pointer.x) * 0.06;
    pointer.y += (ty - pointer.y) * 0.06;
  }

  /*
   * A portrait is a still image: once the pointer has settled there is nothing new to draw, so it
   * stops. The noise shaders are genuinely animated and keep going. Without this the hero would
   * burn a frame every tick forever to redraw an identical photograph.
   */
  const pointerMoving = Math.abs(pointer.x - settled.x) > 0.0004
    || Math.abs(pointer.y - settled.y) > 0.0004;
  if (pointerMoving) {
    settled.x = pointer.x;
    settled.y = pointer.y;
  }

  for (const instance of instances) {
    if (!instance.visible) continue;

    if (instance.portrait) {
      /*
       * A still only needs redrawing while something is actually driving it. The band has nothing
       * driving it at all, so it draws exactly one frame for the whole life of the page.
       */
      const driven = instance.pointerDriven === true;
      if (instance.drawn && !(driven && pointerMoving)) continue;
      if (driven) (instance.material.uniforms.uPointer.value as Vector2).set(pointer.x, pointer.y);
      instance.drawn = true;
    } else {
      instance.material.uniforms.uTime.value = elapsed;
    }

    instance.renderer.render(instance.scene, instance.camera);
  }
}

export function initWebgl(root: ParentNode = document): () => void {
  const canvases = Array.from(root.querySelectorAll<HTMLCanvasElement>('.js-webgl'));
  if (!canvases.length) return () => {};

  const still = prefersReducedMotion();

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const canvas = entry.target as HTMLCanvasElement;
        let instance = instances.find((i) => i.canvas === canvas);

        if (entry.isIntersecting && !instance) {
          const built = build(canvas);
          if (built) {
            instances.push(built);
            instance = built;
          }
        }
        if (instance) {
          instance.visible = entry.isIntersecting && !still;
          // Reduced motion still deserves a background — render one static frame.
          if (entry.isIntersecting && still) {
            instance.renderer.render(instance.scene, instance.camera);
          }
        }
      }
    },
    { rootMargin: '15%' },
  );

  canvases.forEach((c) => observer.observe(c));

  if (!still) {
    started = performance.now();
    rafId = requestAnimationFrame(frame);
  }

  /*
   * ResizeObserver rather than a window resize listener: section heights here change from font
   * loading and `--vh` updates too, and a stale buffer is visible as a background that no longer
   * covers its section.
   */
  const sizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const instance = instances.find((i) => i.canvas === entry.target);
      if (instance) {
        resize(instance);
        instance.drawn = false;
        instance.renderer.render(instance.scene, instance.camera);
      }
    }
  });
  canvases.forEach((c) => sizeObserver.observe(c));

  return () => {
    cancelAnimationFrame(rafId);
    sizeObserver.disconnect();
    observer.disconnect();
    // Contexts are a finite resource; hand them back explicitly.
    for (const instance of instances) {
      instance.material.dispose();
      instance.renderer.dispose();
    }
    instances.length = 0;
  };
}
