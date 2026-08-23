/**
 * The decorative 3D props: a takeaway coffee cup in "What I do", and the Earth behind the
 * projects list.
 *
 * MOTION IS DRIVEN BY SCROLL, not by a clock. The objects turn as their section passes through
 * the viewport and settle the moment scrolling stops; nothing animates on a timer. A constant
 * spin reads as a product turntable and draws the eye away from the type, which is the opposite
 * of what a background prop should do. Frames are only rendered while the value is still
 * settling, so a stationary page costs nothing.
 *
 * Geometry comes from a `.glb`/`.gltf` file when one is provided via `data-model`, and falls
 * back to the procedural mesh below. The reference ships authored models (coffee, mouse, globe)
 * rendered into one page-wide canvas; the loader is the seam for dropping equivalents in.
 *
 * The reference loads an authored model here; this one is modelled at runtime from revolved
 * profiles, which keeps it procedural and lets it turn.
 *
 * Three things do the heavy lifting, and the first matters more than the other two combined:
 *
 *  1. An environment map. A dark glossy object is almost entirely reflection: with only direct
 *     lights it renders as a flat silhouette with one hot spot, which is exactly how the first
 *     attempt looked. RoomEnvironment through PMREMGenerator gives it a studio to reflect, so
 *     the form is described by the way highlights roll across it.
 *  2. Lathed profiles rather than primitives. A cylinder plus a torus reads as a cylinder plus
 *     a torus; a revolved outline with a thick rim, a waist and a foot reads as a mug.
 *  3. Clearcoat, for the lacquered sheen these objects have in the reference.
 */

import {
  ACESFilmicToneMapping, Box3, CylinderGeometry, DirectionalLight, DoubleSide, Group,
  LatheGeometry, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, PMREMGenerator,
  PerspectiveCamera, SRGBColorSpace, Scene, SphereGeometry, TextureLoader, Vector2, Vector3,
  WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { lerp, prefersReducedMotion } from './env';

/**
 * The prop: a takeaway coffee cup with a terraced lid and a straw.
 *
 * Modelled from the object in the reference's layout. Three corrections from earlier attempts,
 * each of which was visible at a glance once wrong:
 *
 *  1. The lid is FLAT and terraced, not domed. It reads as two or three concentric steps of
 *     decreasing diameter finishing in a flat top, like a pressed drink lid. A dome made it look
 *     like a jar.
 *  2. Every surface is DoubleSide. These are revolved profiles, and a lathe's normals depend on
 *     the direction the profile is walked; get it backwards and the face is culled, so you see
 *     straight through the lid into the cup. That read as the lid being transparent.
 *  3. The finish is matte, barely more than satin. The reference's cup is nearly a silhouette
 *     with soft light catching only the top edges of the steps.
 */
function buildCup(): Group {
  const group = new Group();

  const body = new MeshPhysicalMaterial({
    color: 0x121212,
    roughness: 0.62,
    metalness: 0.03,
    clearcoat: 0.18,
    clearcoatRoughness: 0.55,
    side: DoubleSide,
  });

  const lidMat = new MeshPhysicalMaterial({
    color: 0x101010,
    roughness: 0.55,
    metalness: 0.04,
    clearcoat: 0.25,
    clearcoatRoughness: 0.45,
    side: DoubleSide,
  });

  /*
   * Cup body: a tall truncated cone. Up the outside to the rim, then back down the inside so
   * the wall has thickness.
   */
  const cup = [
    new Vector2(0.00, -1.48), new Vector2(0.35, -1.48), new Vector2(0.45, -1.44),
    new Vector2(0.495, -1.34), new Vector2(0.57, -0.86), new Vector2(0.655, -0.36),
    new Vector2(0.715, 0.00), new Vector2(0.775, 0.25),
    new Vector2(0.775, 0.28), new Vector2(0.725, 0.28), // rim
    new Vector2(0.665, 0.00), new Vector2(0.605, -0.36), new Vector2(0.52, -0.86),
    new Vector2(0.445, -1.34), new Vector2(0.37, -1.42), new Vector2(0.00, -1.44),
  ];
  group.add(new Mesh(new LatheGeometry(cup, 96), body));

  /*
   * Lid: walked from the flat top outward and down through each terrace, down the outer skirt
   * which wraps past the cup rim, then back up and in to close the underside ABOVE the rim.
   * Closing below the rim leaves a sightline into the cup.
   */
  const lid = [
    new Vector2(0.00, 0.500), new Vector2(0.62, 0.500),  // flat top
    new Vector2(0.66, 0.470), new Vector2(0.66, 0.430),  // step 3 wall
    new Vector2(0.815, 0.430), new Vector2(0.845, 0.400),
    new Vector2(0.845, 0.335),                            // step 2 wall
    new Vector2(0.945, 0.335), new Vector2(0.975, 0.300),
    new Vector2(0.975, 0.180),                            // outer skirt, past the rim
    new Vector2(0.935, 0.155), new Vector2(0.885, 0.170),
    new Vector2(0.870, 0.245), new Vector2(0.800, 0.300), // inner face, back above the rim
    new Vector2(0.00, 0.300),                             // sealed underside
  ];
  group.add(new Mesh(new LatheGeometry(lid, 96), lidMat));

  /*
   * Band: a sleeve around the body, set low enough to leave the cup wall visible under the lid.
   * In the reference this is a distinct element with its own lit top and bottom edges, and it is
   * what breaks the body into two masses instead of one long cone.
   *
   * Revolved as a ring cross-section (out along the top, down the outside, in along the bottom,
   * back up the inside) so both edges catch light. A plain cylinder would intersect the wall and
   * show no bottom edge at all. The radii taper with the cone, since a straight-sided band on a
   * tapered cup stands off the wall at one end and sinks into it at the other.
   */
  const bandMat = new MeshPhysicalMaterial({
    color: 0x171717,
    roughness: 0.58,
    metalness: 0.04,
    clearcoat: 0.22,
    clearcoatRoughness: 0.5,
    side: DoubleSide,
  });

  const band = [
    new Vector2(0.665, -0.175), new Vector2(0.795, -0.185), // top face
    new Vector2(0.812, -0.220),
    new Vector2(0.772, -0.555),                              // outer wall, following the taper
    new Vector2(0.755, -0.600), new Vector2(0.615, -0.610),  // bottom face
    new Vector2(0.598, -0.565),
    new Vector2(0.628, -0.215),                              // inner wall
    new Vector2(0.665, -0.175),
  ];
  group.add(new Mesh(new LatheGeometry(band, 96), bandMat));

  // Straw: thick, near-black, leaning left out of the lid as in the reference.
  const straw = new Mesh(
    new CylinderGeometry(0.075, 0.075, 1.25, 28, 1, false),
    new MeshPhysicalMaterial({
      color: 0x0a0a0a, roughness: 0.45, metalness: 0.05, clearcoat: 0.3, side: DoubleSide,
    }),
  );
  straw.position.set(-0.30, 0.96, 0.10);
  straw.rotation.z = 0.30;
  group.add(straw);

  group.rotation.set(0.24, -0.42, 0.03);
  group.position.y = 0.02;
  return group;
}

/**
 * The Earth in the projects list.
 *
 * A textured sphere rather than a noise shader: the reference puts a recognisable planet here,
 * and procedural continents read as marble or camouflage, never as Earth. The map is NASA's
 * public-domain Blue Marble (see public/assets/textures/CREDITS.txt), darkened hard through the
 * material's base colour so it sits behind the type instead of competing with it.
 */
function buildEarth(): Group {
  const group = new Group();

  const material = new MeshStandardMaterial({
    // Multiplies the map. Dim enough to sit behind the type, bright enough that the continents
    // actually read; the first pass was so dark the sphere was indistinguishable from the page.
    color: 0xb4b4b4,
    roughness: 0.92,
    metalness: 0.0,
  });

  const loader = new TextureLoader();
  loader.load('/assets/textures/earth.jpg', (tex) => {
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    material.map = tex;
    material.needsUpdate = true;
    /*
     * Repaint explicitly. Frames are only drawn while a prop's rotation is still settling, so a
     * texture that resolves after the page has come to rest would never be shown: the globe
     * stayed a flat black ball until the next scroll.
     */
    renderAll();
  });

  const globe = new Mesh(new SphereGeometry(1, 96, 64), material);
  group.add(globe);

  // Axial tilt, so it does not spin like a top.
  group.rotation.set(0.28, 0.6, 0.16);
  return group;
}

interface Prop {
  canvas: HTMLCanvasElement;
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  object: Group;
  visible: boolean;
  /** Rotation the object is easing toward, derived from scroll position. */
  target: number;
  /** Rotation currently applied. */
  current: number;
  /** Rest orientation, so a model's own framing is preserved. */
  base: number;
  /** Direction and amount of turn across one screen of scroll, in radians. */
  travel: number;
  /** Bounding radius to frame the camera against; 0 leaves the camera where it was placed. */
  fitRadius: number;
}

const props: Prop[] = [];
let raf = 0;

/** Total turn as the prop crosses the viewport. */
const TRAVEL = Math.PI * 0.8;
/** The globe turns further, so the rotation is legible on a sphere with no silhouette change. */
const TRAVEL_EARTH = Math.PI * 1.15;

const isEarthCanvas = (c: HTMLCanvasElement): boolean => c.dataset.object === 'earth';

/**
 * How far the prop has travelled through the viewport: 0 as its centre enters from the bottom,
 * 1 as it leaves past the top. Clamped, so a prop parked off-screen holds its end orientation.
 */
function scrollProgress(canvas: HTMLCanvasElement): number {
  const r = canvas.getBoundingClientRect();
  const centre = r.top + r.height / 2;
  return Math.min(1, Math.max(0, 1 - centre / window.innerHeight));
}

function build(canvas: HTMLCanvasElement): Prop | null {
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  // Filmic tone mapping keeps the specular highlights from clipping to flat white.
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.62;

  const isEarth = isEarthCanvas(canvas);
  const scene = new Scene();

  // The studio the object reflects. Generated once per prop and released immediately: the
  // PMREM texture is all that is needed afterwards.
  const pmrem = new PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  scene.environment = pmrem.fromScene(room, 0.04).texture;
  // Dialled well down: the reference's cup is nearly a silhouette, lit only along its edges.
  scene.environmentIntensity = isEarth ? 0.06 : 0.32;
  room.dispose?.();
  pmrem.dispose();

  const object = canvas.dataset.object === 'earth' ? buildEarth() : buildCup();
  scene.add(object);

  /*
   * If an authored model is supplied, swap it in for the procedural mesh. Loading is
   * best-effort: a missing or broken file leaves the fallback on screen rather than a hole.
   */
  const src = canvas.dataset.model;
  if (src) {
    new GLTFLoader().load(src, (gltf) => {
      const loaded = gltf.scene;
      // Normalise to the same footprint as the fallback, so framing survives the swap.
      const box = new Box3().setFromObject(loaded);
      const size = box.getSize(new Vector3());
      const centre = box.getCenter(new Vector3());
      const scale = 1.6 / Math.max(size.x, size.y, size.z);
      loaded.scale.setScalar(scale);
      loaded.position.copy(centre).multiplyScalar(-scale);

      const holder = new Group();
      holder.add(loaded);
      holder.rotation.copy(object.rotation);
      scene.remove(object);
      scene.add(holder);
      prop.object = holder;
      render(prop);
    }, undefined, () => {
      // Keep the procedural mesh; nothing further to do.
    });
  }

  /*
   * One directional light on top of the environment, placed high and to the RIGHT. This is what
   * puts the bright edge along the top-right of each lid terrace and down the band's upper lip;
   * from the left the lit edges fell on the side that is cropped off-screen.
   */
  /*
   * The globe wants a bright, mostly frontal key so most of the disc reads, offset just enough
   * to leave a terminator down one side. The cup wants a soft, high one.
   */
  const key = new DirectionalLight(0xffeedd, isEarth ? 3.1 : 0.7);
  key.position.set(isEarth ? 1.6 : 2.9, isEarth ? 0.8 : 2.7, isEarth ? 3.4 : 2.2);
  scene.add(key);

  if (isEarth) {
    // A touch of fill so the night side is dark rather than a hole in the page.
    const fill = new DirectionalLight(0x8899bb, 0.35);
    fill.position.set(-2.5, -0.6, 1.2);
    scene.add(fill);
  }

  const camera = new PerspectiveCamera(isEarth ? 30 : 32, 1, 0.1, 100);
  // The globe's distance is recomputed in resize() to fit the frame; this is just a seed.
  camera.position.set(0, isEarth ? 0 : -0.05, isEarth ? 4.6 : 5.6);
  camera.lookAt(0, 0, 0);

  const prop: Prop = {
    canvas, renderer, scene, camera, object, visible: false,
    fitRadius: isEarth ? EARTH_RADIUS : 0,
    base: object.rotation.y,
    travel: isEarthCanvas(canvas) ? TRAVEL_EARTH : TRAVEL,
    target: object.rotation.y,
    current: object.rotation.y,
  };
  prop.target = prop.base + scrollProgress(canvas) * prop.travel;
  prop.current = prop.target;
  object.rotation.y = prop.current;

  resize(prop);
  return prop;
}

/** Radius the globe occupies in world units; the camera distance is derived from it. */
const EARTH_RADIUS = 1;
/** Headroom around the globe, so it never touches the frame edge. */
const EARTH_MARGIN = 1.18;

function resize(prop: Prop): void {
  /*
   * Layout box, not the transformed rect: these canvases sit inside parallaxed and scaled
   * wrappers, and measuring the transformed size inflates the backing buffer on every resize.
   */
  const w = Math.max(1, prop.canvas.clientWidth || Math.round(prop.canvas.getBoundingClientRect().width));
  const h = Math.max(1, prop.canvas.clientHeight || Math.round(prop.canvas.getBoundingClientRect().height));
  prop.renderer.setSize(w, h, false);
  prop.camera.aspect = w / h;

  /*
   * Fit the globe to the frame rather than trusting a fixed camera distance.
   *
   * A hardcoded z of 3.6 at a 30-degree vertical FOV gives a visible half-height of 0.965 world
   * units, and the sphere's radius is 1: it was clipped flat at the top and bottom. Deriving the
   * distance from the FOV means it also survives the canvas being any shape, which matters
   * because this one is 70% as wide as its section and full height.
   */
  if (prop.fitRadius > 0) {
    const halfFovY = (prop.camera.fov * Math.PI) / 360;
    const need = prop.fitRadius * EARTH_MARGIN;
    const forHeight = need / Math.tan(halfFovY);
    // A canvas narrower than it is tall runs out of horizontal room first.
    const forWidth = need / (Math.tan(halfFovY) * prop.camera.aspect);
    prop.camera.position.z = Math.max(forHeight, forWidth);
  }

  prop.camera.updateProjectionMatrix();
}

function render(prop: Prop): void {
  prop.object.rotation.y = prop.current;
  prop.renderer.render(prop.scene, prop.camera);
}

/** Repaint every live prop. Used when an async asset lands after the scene has settled. */
function renderAll(): void {
  for (const prop of props) render(prop);
}

/**
 * Ease each prop toward the orientation its scroll position implies.
 *
 * The easing is what keeps the motion from feeling mechanically pinned to the scrollbar, and
 * the threshold is what makes it genuinely stop: once the remaining delta is under a
 * fifth of a degree there is nothing left to see, so no frame is drawn.
 */
function frame(): void {
  raf = requestAnimationFrame(frame);

  for (const prop of props) {
    if (!prop.visible) continue;

    prop.target = prop.base + scrollProgress(prop.canvas) * prop.travel;
    if (Math.abs(prop.target - prop.current) < 0.0035) continue;

    prop.current = lerp(prop.current, prop.target, 0.08);
    render(prop);
  }
}

export function init3dObjects(root: ParentNode = document): () => void {
  const canvases = Array.from(root.querySelectorAll<HTMLCanvasElement>('.js-object3d'));
  if (!canvases.length) return () => {};

  const still = prefersReducedMotion();

  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const canvas = entry.target as HTMLCanvasElement;
      let prop = props.find((p) => p.canvas === canvas);
      if (entry.isIntersecting && !prop) {
        const built = build(canvas);
        if (built) { props.push(built); prop = built; }
      }
      if (prop) {
        prop.visible = entry.isIntersecting && !still;
        if (entry.isIntersecting) render(prop);
      }
    }
  }, { rootMargin: '20%' });

  canvases.forEach((c) => observer.observe(c));
  if (!still) raf = requestAnimationFrame(frame);

  const sizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const prop = props.find((x) => x.canvas === entry.target);
      if (prop) {
        resize(prop);
        render(prop);
      }
    }
  });
  canvases.forEach((c) => sizeObserver.observe(c));

  return () => {
    cancelAnimationFrame(raf);
    sizeObserver.disconnect();
    observer.disconnect();
    for (const prop of props) prop.renderer.dispose();
    props.length = 0;
  };
}
