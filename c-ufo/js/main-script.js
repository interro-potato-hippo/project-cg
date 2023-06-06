'use strict';

//////////////////////
/* GLOBAL CONSTANTS */
//////////////////////
const COLORS = Object.freeze({
  darkBlue: new THREE.Color(0x00008b),
  darkPurple: new THREE.Color(0x632cd4),
  green: new THREE.Color(0x55cc55),
  white: new THREE.Color(0xffffff),
});

// must be functions because they depend on textures initialized later
// TODO: don't create new materials every time
const MATERIALS = {
  sky: () => new THREE.MeshBasicMaterial({ vertexColors: true }),
  skyDome: () =>
    // FIXME: use MeshStandardMaterial
    new THREE.MeshBasicMaterial({
      map: skyTexture.texture,
      side: THREE.BackSide,
    }),

  // FIXME: use MeshStandardMaterial
  terrain: () => new THREE.MeshBasicMaterial({ color: COLORS.green }),
};

const DOME_RADIUS = 50;
const PROP_RADIUS = 0.1;
const INTER_PROP_PADDING = 0.05;
const MIN_PROP_DISTANCE_SQ = (2 * PROP_RADIUS + INTER_PROP_PADDING) ** 2;

const GEOMETRY = {
  skyDome: new THREE.SphereGeometry(DOME_RADIUS, 32, 32),
  terrain: new THREE.CircleGeometry(DOME_RADIUS, 128),
};
const TEXTURE_SIZES = {
  sky: 64,
};
const PROP_AMOUNTS = {
  stars: 2048,
};

const ORBITAL_CAMERA = createPerspectiveCamera({
  fov: 80,
  near: 1,
  far: 1000,
  x: -10,
  y: 20,
  z: -10,
});
const SKY_CAMERA = createOrthographicCamera({
  left: -TEXTURE_SIZES.sky / 2,
  right: TEXTURE_SIZES.sky / 2,
  top: TEXTURE_SIZES.sky / 2,
  bottom: -TEXTURE_SIZES.sky / 2,
  near: 1,
  far: 1000,
  y: 500,
  atY: 10,
});

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////

let renderer, scene, bufferScene, skyTexture;
let activeCamera = ORBITAL_CAMERA; // starts as the orbital camera, may change afterwards

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
  scene = new THREE.Scene();
  scene.add(new THREE.AxesHelper(20));

  createTerrain();
  createSkyDome();
}

function createBufferScene() {
  bufferScene = new THREE.Scene();

  createBufferSky();

  skyTexture = new THREE.WebGLRenderTarget(TEXTURE_SIZES.sky, TEXTURE_SIZES.sky, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
  });
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createCameras() {
  const controls = new THREE.OrbitControls(ORBITAL_CAMERA, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();
}

function createPerspectiveCamera({
  fov,
  near,
  far,
  x = 0,
  y = 0,
  z = 0,
  atX = 0,
  atY = 0,
  atZ = 0,
}) {
  const aspect = window.innerWidth / window.innerHeight;

  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(x, y, z);
  camera.lookAt(atX, atY, atZ);
  return camera;
}

function createOrthographicCamera({
  left,
  right,
  top,
  bottom,
  near,
  far,
  x = 0,
  y = 0,
  z = 0,
  atX = 0,
  atY = 0,
  atZ = 0,
}) {
  const camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
  camera.position.set(x, y, z);
  camera.lookAt(atX, atY, atZ);
  return camera;
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////
function createTerrain() {
  const plane = new THREE.Mesh(GEOMETRY.terrain, MATERIALS.terrain());
  plane.rotateX(-Math.PI / 2); // we rotate it so that it is in the xOz plane
  scene.add(plane);
}

function createSkyDome() {
  const sphere = new THREE.Mesh(GEOMETRY.skyDome, MATERIALS.skyDome());
  sphere.rotateX(Math.PI / 2); // rotating it allows for a more "natural" dawn/dusk
  scene.add(sphere);
}

function createBufferSky() {
  const sky = createGroup({
    x: -TEXTURE_SIZES.sky / 2,
    y: 10,
    z: -TEXTURE_SIZES.sky / 2,
    parent: bufferScene,
  });

  const geometry = createBufferGeometry({
    vertices: [
      { x: 0, y: 0, z: 0, color: COLORS.darkPurple },
      { x: 0, y: 0, z: 1, color: COLORS.darkBlue },
      { x: 1, y: 0, z: 1, color: COLORS.darkBlue },
      { x: 1, y: 0, z: 0, color: COLORS.darkPurple },
    ],
    triangles: [
      [0, 1, 2],
      [2, 3, 0],
    ],
    scale: TEXTURE_SIZES.sky,
  });
  const mesh = new THREE.Mesh(geometry, MATERIALS.sky());
  sky.add(mesh);

  const stars = createGroup({ y: 1, parent: sky });
  generateProps(stars, PROP_AMOUNTS.stars, TEXTURE_SIZES.sky, {
    x: 1,
    z: 1,
  });
}

/**
 * Fills a texture with a given amount of props.
 * @param {THREE.Group} group - the group to which the props will be added
 * @param {number} amount - the amount of props to generate
 * @param {number} planeSize - the size of the plane the mesh is on
 * @param {Object} freedom - multipliers stating whether props may have non-zero coordinates on a given axis; by default, they can't
 * @param {Array} colors - the available colors for the props to be generated; by default, they're all white
 */
function generateProps(
  group,
  amount,
  planeSize,
  freedom = { x: 0, y: 0, z: 0 },
  colors = [COLORS.white]
) {
  const prop = new THREE.Mesh(
    new THREE.CircleGeometry(PROP_RADIUS, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.white })
  );
  const occupiedPositions = []; // props cannot be generated on top of each other
  for (let i = 0; i < amount; i++) {
    const dot = prop.clone();
    let position;
    // we can't generate props on top of each other, so we keep track of the occupied positions
    // and generate a new one if the current one is already occupied
    do {
      position = generatePropPosition(planeSize, freedom);
    } while (
      // we use distanceToSquared instead of distanceTo because it's faster, as
      // no square root calculations are needed
      occupiedPositions.some(
        (occupiedPosition) => occupiedPosition.distanceToSquared(position) <= MIN_PROP_DISTANCE_SQ
      )
    );
    dot.position.set(position.x, position.y, position.z);
    dot.rotateX(-Math.PI / 2);
    dot.material.color.set(colors[Math.floor(Math.random() * colors.length)]);
    occupiedPositions.push(position);
    group.add(dot);
  }
}

/**
 * Generates a random position within a plane.
 * @param {number} planeSize - the size of the plane where the props will be placed on
 * @param {Object} freedom - multipliers stating whether props may have non-zero coordinates on a given axis; by default, they can't
 * @param {THREE.Vector3} basePoint - the base point of the plane; by default, it's the origin
 * @returns a new THREE.Vector3 with coordinates within the plane
 */
function generatePropPosition(planeSize, freedom, basePoint = new THREE.Vector3(0, 0, 0)) {
  return new THREE.Vector3(
    THREE.Math.clamp(
      freedom.x * Math.random() * planeSize,
      basePoint.x + PROP_RADIUS,
      planeSize - PROP_RADIUS
    ),
    THREE.Math.clamp(
      freedom.y * Math.random() * planeSize,
      basePoint.y + PROP_RADIUS,
      planeSize - PROP_RADIUS
    ),
    THREE.Math.clamp(
      freedom.z * Math.random() * planeSize,
      basePoint.z + PROP_RADIUS,
      planeSize - PROP_RADIUS
    )
  );
}

/**
 * Creates a buffer geometry from a given set of parameters.
 * @param {Object} p - an object containing the input parameters
 * @param {{x: number, y: number, z: number, color: THREE.Color}[]} p.vertices - an array of vertices
 * @param {number[][]} p.triangles - an array of triangles, given as an array of indices
 * @param {number} p.scale - multiplier to be applied to all vertex coordinates (default: 1)
 * @returns {THREE.BufferGeometry} - a THREE.BufferGeometry with the given attributes
 *
 * Note that triangle indices correspond to the indices of the vertices array.
 * The returned geometry should be used with a mesh with vertexColors set to true.
 */
function createBufferGeometry({ vertices, triangles, scale = 1 }) {
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(triangles.flatMap((triangle) => triangle));
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      vertices.flatMap((vertex) => [vertex.x, vertex.y, vertex.z]).map((coord) => coord * scale),
      3
    )
  );
  geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(
      vertices.map((vertex) => vertex.color).flatMap((color) => [color.r, color.g, color.b]),
      3
    )
  );

  return geometry;
}

//////////////////////
/* CHECK COLLISIONS */
//////////////////////
function checkCollisions() {}

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////
function handleCollisions() {}

////////////
/* UPDATE */
////////////
function update() {}

/////////////
/* DISPLAY */
/////////////
function render() {
  renderer.render(bufferScene, SKY_CAMERA, skyTexture);
  renderer.render(scene, activeCamera);
}

////////////////////////////////
/* INITIALIZE ANIMATION CYCLE */
////////////////////////////////
function init() {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  createBufferScene();
  createScene();
  createCameras();
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
  render();
  requestAnimationFrame(animate);
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////
function onResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);

  if (window.innerHeight > 0 && window.innerWidth > 0) {
    activeCamera.aspect = window.innerWidth / window.innerHeight;
    activeCamera.updateProjectionMatrix();
  }
}

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
function onKeyDown(e) {}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) {}

///////////////
/* UTILITIES */
///////////////
/**
 * Create a THREE.Group on the given position and with the given scale.
 *
 * Automatically adds the created Group to the given parent.
 */
function createGroup({ x = 0, y = 0, z = 0, scale = [1, 1, 1], parent }) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.set(...scale);

  if (parent) {
    parent.add(group);
  } else {
    scene.add(group);
  }

  return group;
}
