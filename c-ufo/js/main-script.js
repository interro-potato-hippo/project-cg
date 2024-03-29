'use strict';

//////////////////////
/* GLOBAL CONSTANTS */
//////////////////////
const COLORS = Object.freeze({
  darkBlue: new THREE.Color(0x00008b),
  darkPurple: new THREE.Color(0x632cd4),
  lilac: new THREE.Color(0xc8a2c8),
  green: new THREE.Color(0x55cc55),
  darkGreen: new THREE.Color(0x5e8c61),
  imperialRed: new THREE.Color(0xf03a47),
  skyBlue: new THREE.Color(0x84cae7),
  lightCyan: new THREE.Color(0xc9e4e7),
  brown: new THREE.Color(0xa96633),
  orange: new THREE.Color(0xea924b),
  lightBlue: new THREE.Color(0xb8e9ee),
  dodgerBlue: new THREE.Color(0x1e90ff),
  white: new THREE.Color(0xffffff),
  yellow: new THREE.Color(0xffff00),
  moonYellow: new THREE.Color(0xebc815),
});

// must be functions because they depend on textures initialized later
const MATERIAL_PARAMS = {
  sky: () => ({ vertexColors: true }),
  field: () => ({ color: COLORS.green }),

  skyDome: () => ({ map: skyTexture.texture, side: THREE.BackSide }),
  terrain: () => ({
    map: fieldTexture.texture,
    side: THREE.DoubleSide,
    bumpMap: terrainHeightMap,
    bumpScale: 1,
    displacementMap: terrainHeightMap,
    displacementScale: 10,
  }),
  moon: () => ({ color: COLORS.moonYellow, emissive: COLORS.moonYellow }),

  treeTrunk: () => ({ color: COLORS.brown }),
  treePrimaryBranch: () => ({ color: COLORS.brown }),
  treeSecondaryBranch: () => ({ color: COLORS.brown }),
  treeLeaf: () => ({ color: COLORS.darkGreen }),

  ufoBody: () => ({ color: COLORS.imperialRed }),
  ufoCockpit: () => ({ color: COLORS.skyBlue, opacity: 0.75, transparent: true }),
  ufoSpotlight: () => ({ color: COLORS.lightCyan, emissive: COLORS.darkBlue }),
  ufoSphere: () => ({ color: COLORS.lightCyan, emissive: COLORS.darkBlue }),

  houseWalls: () => ({ vertexColors: true }),
  houseRoof: () => ({ vertexColors: true }),
  houseWindows: () => ({ vertexColors: true }),
  houseDoor: () => ({ vertexColors: true }),
};

const LIGHT_INTENSITY = Object.freeze({
  ambient: 0.15,
  directional: 1,
  ufoSpotlight: 3,
  ufoSphere: 0.4,
});
const UFO_SPOTLIGHT_ANGLE = Math.PI / 9;
const UFO_SPOTLIGHT_PENUMBRA = 0.3;
const UFO_SPHERE_LIGHT_DISTANCE = 25;

const DOME_RADIUS = 64;
const MOON_DOME_PADDING = 10; // moon will be placed as if on a dome with a PADDING smaller radius
const MOON_POSITION_COORD = Math.sqrt((DOME_RADIUS - MOON_DOME_PADDING) ** 2 / 2);
const MOON_POSITION = new THREE.Vector3(
  MOON_POSITION_COORD / 2,
  MOON_POSITION_COORD,
  -MOON_POSITION_COORD / 2
);
const PROP_RADIUS = 0.05;
const PROP_POSITION_PADDING = PROP_RADIUS * 4; // padding between props and texture border
const INTER_PROP_PADDING = PROP_RADIUS / 2;
const MIN_PROP_DISTANCE_SQ = (2 * PROP_RADIUS + INTER_PROP_PADDING) ** 2;

const TERRAIN_HEIGHT_MAP_PATH = 'assets/height_map.png';
const CYLINDER_SEGMENTS = 32;
const SPHERE_SEGMENTS = 32;
const GEOMETRY = {
  skyDome: new THREE.SphereGeometry(
    DOME_RADIUS,
    SPHERE_SEGMENTS,
    SPHERE_SEGMENTS,
    0,
    2 * Math.PI,
    0,
    Math.PI / 2
  ),
  terrain: new THREE.CircleGeometry(DOME_RADIUS, 128),
  moon: new THREE.SphereGeometry(5, SPHERE_SEGMENTS, SPHERE_SEGMENTS),

  // height is scaled per instance of oak tree
  treeTrunk: new THREE.CylinderGeometry(0.5, 0.5, 1, CYLINDER_SEGMENTS),
  treePrimaryBranch: new THREE.CylinderGeometry(0.5, 0.5, 4, CYLINDER_SEGMENTS),
  treeSecondaryBranch: new THREE.CylinderGeometry(0.4, 0.4, 4, CYLINDER_SEGMENTS),
  treeLeaf: new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS),

  ufoBody: new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
  ufoCockpit: new THREE.SphereGeometry(1.5, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
  ufoSpotlight: new THREE.CylinderGeometry(1.5, 1.5, 0.5, CYLINDER_SEGMENTS),
  ufoSphere: new THREE.SphereGeometry(0.25, SPHERE_SEGMENTS, SPHERE_SEGMENTS),

  houseWalls: createHouseWallsGeometry(),
  houseRoof: createHouseRoofGeometry(),
  houseWindows: createHouseWindowsGeometry(),
  houseDoor: createHouseDoorGeometry(),
};
const UFO_SPHERE_COUNT = 8;
const ELLIPSOID_SCALING = {
  treePrimaryBranchLeaf: new THREE.Vector3(2.3, 1.1, 1.5),
  treeSecondaryBranchLeaf: new THREE.Vector3(3, 1.375, 2.5),

  ufoBody: new THREE.Vector3(3.5, 1, 3.5),
};
const TEXTURE_SIZES = {
  sky: DOME_RADIUS,
  field: DOME_RADIUS,
};
const RENDER_TARGET_SIDE = 4096; // chosen semi-arbitrarily, allows for the circles to be smoothly rendered
const PROP_AMOUNTS = {
  stars: 512,
  flowers: 512,
};

const UFO_ANGULAR_VELOCITY = (2 * Math.PI) / 10; // 10 seconds per full rotation
const UFO_LINEAR_VELOCITY = 5; // 5 unit per second

const ORBITAL_CAMERA = createPerspectiveCamera({
  fov: 80,
  near: 1,
  far: 1000,
  x: -10,
  y: 20,
  z: -10,
});
const FIXED_CAMERA = createPerspectiveCamera({
  fov: 80,
  near: 1,
  far: 1000,
  x: -32,
  y: 40,
  z: -50,
});
const SKY_CAMERA = createOrthographicCamera({
  left: -TEXTURE_SIZES.sky / 2,
  right: TEXTURE_SIZES.sky / 2,
  top: TEXTURE_SIZES.sky / 2,
  bottom: -TEXTURE_SIZES.sky / 2,
  near: 1,
  far: 15,
  y: 5,
  atY: 10,
});
const FIELD_CAMERA = createOrthographicCamera({
  left: -TEXTURE_SIZES.field / 2,
  right: TEXTURE_SIZES.field / 2,
  top: TEXTURE_SIZES.field / 2,
  bottom: -TEXTURE_SIZES.field / 2,
  near: 1,
  far: 15,
  y: 5,
  atY: 0,
});
const NAMED_MESHES = []; // meshes registered as they are created
const UFO_SPHERE_LIGHTS = []; // lights registered as they are created

const MOVEMENT_FLAGS = Object.freeze({
  positiveX: new THREE.Vector3(1, 0, 0),
  negativeX: new THREE.Vector3(-1, 0, 0),
  positiveZ: new THREE.Vector3(0, 0, 1),
  negativeZ: new THREE.Vector3(0, 0, -1),
});

const CLOCK = new THREE.Clock();

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////
let renderer, scene, bufferScene, skyTexture, fieldTexture, terrainHeightMap;
let rootGroup;
let activeCamera = FIXED_CAMERA; // starts as the fixed camera, may change afterwards
let activeMaterial = 'phong'; // starts as phong, may change afterwards
// lines below prevent logic in key event handlers, moving it to the update function
let activeMaterialChanged = false; // used to know when to update the material of the meshes
let generateNewStars = true;
let generateNewFlowers = true;
let toggleActiveCamera = false;
const ufoMovementFlags = {};
let updateProjectionMatrix = false;
// ^ prevents logic in key event handlers, moving it to the update function
let flowers, stars, directionalLight, ufoSpotlight, ufo;

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
  scene = new THREE.Scene();
  // Move all objects downwards so that (0, 0, 0) is above ground for VR
  rootGroup = createGroup({ y: -5, parent: scene });

  createLights();
  createTerrain();
  createSkyDome();
  createMoon();
  createHouse();

  // in clockwise order, from the moon's perspective
  createOakTree(3, new THREE.Vector3(24, 2.25, 34), new THREE.Euler(0, 0, 0));
  createOakTree(1.5, new THREE.Vector3(-28, 2.75, 17), new THREE.Euler(0, Math.PI / 2, 0));
  createOakTree(4, new THREE.Vector3(-41, 2.75, -14), new THREE.Euler(0, Math.PI / 6, 0));
  createOakTree(4, new THREE.Vector3(-14, 2.25, -23), new THREE.Euler(0, -Math.PI / 2, 0));
  createOakTree(8, new THREE.Vector3(15, 2.75, -26), new THREE.Euler(0, Math.PI / 3, 0));

  createUfo(new THREE.Vector3(0, 20, 0));
}

function createBufferScene() {
  bufferScene = new THREE.Scene();

  createBufferSky();
  createBufferField();

  skyTexture = new THREE.WebGLRenderTarget(RENDER_TARGET_SIDE, RENDER_TARGET_SIDE, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
  });
  fieldTexture = new THREE.WebGLRenderTarget(RENDER_TARGET_SIDE, RENDER_TARGET_SIDE, {
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
  controls.keys = {
    LEFT: 72, // h
    UP: 75, // k
    RIGHT: 76, // l
    BOTTOM: 74, // j
  };
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

function refreshCameraParameters(camera) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////
function createLights() {
  const ambientLight = new THREE.AmbientLight(COLORS.moonYellow, LIGHT_INTENSITY.ambient);
  rootGroup.add(ambientLight);

  directionalLight = new THREE.DirectionalLight(COLORS.moonYellow, LIGHT_INTENSITY.directional);
  directionalLight.position.copy(MOON_POSITION);
  rootGroup.add(directionalLight);
}

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////
function createTerrain() {
  // the terrain doesn't need to be a named mesh, as it won't be dynamically changed
  const material = new THREE.MeshPhongMaterial({ ...MATERIAL_PARAMS.terrain() });
  const plane = new THREE.Mesh(GEOMETRY.terrain, material);
  plane.rotateX(-Math.PI / 2); // we rotate it so that it is in the xOz plane
  rootGroup.add(plane);
}

function createMoon() {
  const moon = createNamedMesh('moon', rootGroup);
  moon.position.copy(MOON_POSITION);
}

function createSkyDome() {
  // the sky dome doesn't need to be a named mesh, as it won't be dynamically changed
  const material = new THREE.MeshPhongMaterial({ ...MATERIAL_PARAMS.skyDome() });
  const plane = new THREE.Mesh(GEOMETRY.skyDome, material);
  rootGroup.add(plane);
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
      [2, 1, 0],
      [0, 3, 2],
    ],
    scale: TEXTURE_SIZES.sky,
  });
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial(MATERIAL_PARAMS.sky()));
  sky.add(mesh);

  // the negative y allows for the stars not to be directly on top of the sky
  stars = createGroup({ y: -1, parent: sky });
  generateProps(stars, PROP_AMOUNTS.stars, TEXTURE_SIZES.sky, {
    x: 1,
    y: 0,
    z: 1,
  });
}

function createBufferField() {
  const field = createGroup({
    x: -TEXTURE_SIZES.field / 2,
    y: 0,
    z: -TEXTURE_SIZES.field / 2,
    parent: bufferScene,
  });

  const geometry = new THREE.PlaneGeometry(TEXTURE_SIZES.field, TEXTURE_SIZES.field);
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial(MATERIAL_PARAMS.field()));
  mesh.rotateX(-Math.PI / 2);
  mesh.position.set(TEXTURE_SIZES.field / 2, 0, TEXTURE_SIZES.field / 2);
  field.add(mesh);

  flowers = createGroup({ y: 1, parent: field });
  generateProps(
    flowers,
    PROP_AMOUNTS.flowers,
    TEXTURE_SIZES.field,
    {
      x: 1,
      y: 0,
      z: 1,
    },
    [COLORS.white, COLORS.yellow, COLORS.lilac, COLORS.lightBlue]
  );
}

/**
 * Fills a texture with a given amount of props.
 * @param {THREE.Group} parent - the parent to which the props will be added
 * @param {number} amount - the amount of props to generate
 * @param {number} planeSize - the size of the plane the mesh is on
 * @param {Object} freedom - multipliers stating whether props may have non-zero coordinates on a given axis; by default, they can't
 * @param {Array} colors - the available colors for the props to be generated; by default, they're all white
 */
function generateProps(
  parent,
  amount,
  planeSize,
  freedom = { x: 0, y: 0, z: 0 },
  colors = [COLORS.white]
) {
  const prop = new THREE.Mesh(
    new THREE.CircleGeometry(PROP_RADIUS, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.white, side: THREE.DoubleSide })
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
    dot.material = dot.material.clone(); // materials are not correctly cloned by default
    dot.material.color.set(colors[Math.floor(Math.random() * colors.length)]);
    occupiedPositions.push(position);
    parent.add(dot);
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
      basePoint.x + PROP_POSITION_PADDING,
      planeSize - PROP_POSITION_PADDING
    ),
    THREE.Math.clamp(
      freedom.y * Math.random() * planeSize,
      basePoint.y + PROP_POSITION_PADDING,
      planeSize - PROP_POSITION_PADDING
    ),
    THREE.Math.clamp(
      freedom.z * Math.random() * planeSize,
      basePoint.z + PROP_POSITION_PADDING,
      planeSize - PROP_POSITION_PADDING
    )
  );
}

function createHouse() {
  const house = createGroup({ x: 10, y: 2.1, z: 9.5, parent: rootGroup });
  house.rotateY(Math.PI);
  createNamedMesh('houseWalls', house);
  createNamedMesh('houseRoof', house);
  createNamedMesh('houseWindows', house);
  createNamedMesh('houseDoor', house);
}

function createHouseWallsGeometry() {
  return createBufferGeometry({
    defaultVertexColor: COLORS.white,
    vertices: [
      // front wall
      { x: 0, y: 0, z: 0 }, // v0
      { x: 1, y: 2.5, z: 0 }, // v1
      { x: 0, y: 2.5, z: 0 }, // v2
      { x: 1, y: 0, z: 0 }, // v3
      { x: 2.5, y: 0, z: 0 }, // v4
      { x: 2.5, y: 1, z: 0 }, // v5
      { x: 1, y: 1, z: 0 }, // v6
      { x: 4.5, y: 0, z: 0 }, // v7
      { x: 4.5, y: 2.5, z: 0 }, // v8
      { x: 2.5, y: 2.5, z: 0 }, // v9
      { x: 6, y: 0, z: 0 }, // v10
      { x: 6, y: 1, z: 0 }, // v11
      { x: 4.5, y: 1, z: 0 }, // v12
      { x: 8, y: 0, z: 0 }, // v13
      { x: 8, y: 2.5, z: 0 }, // v14
      { x: 6, y: 2.5, z: 0 }, // v15
      { x: 9.25, y: 0, z: 0 }, // v16
      { x: 9.25, y: 2.5, z: 0 }, // v17
      { x: 11.5, y: 0, z: 0 }, // v18
      { x: 11.5, y: 2.5, z: 0 }, // v19
      { x: 13, y: 0, z: 0 }, // v20
      { x: 13, y: 1, z: 0 }, // v21
      { x: 11.5, y: 1, z: 0 }, // v22
      { x: 17, y: 0, z: 0 }, // v23
      { x: 17, y: 2.5, z: 0 }, // v24
      { x: 13, y: 2.5, z: 0 }, // v25
      { x: 18.5, y: 0, z: 0 }, // v26
      { x: 18.5, y: 1, z: 0 }, // v27
      { x: 17, y: 1, z: 0 }, // v28
      { x: 20, y: 0, z: 0 }, // v29
      { x: 20, y: 2.5, z: 0 }, // v30
      { x: 18.5, y: 2.5, z: 0 }, // v31
      { x: 8, y: 4, z: 0 }, // v32
      { x: 0, y: 4, z: 0 }, // v33
      { x: 13, y: 4, z: 0 }, // v34
      { x: 20, y: 4, z: 0 }, // v35

      // right wall (for a definition of right... - the one with the window)
      { x: 20, y: 0, z: -3.5 }, // v36
      { x: 20, y: 2.5, z: -3.5 }, // v37
      { x: 20, y: 0, z: -5 }, // v38
      { x: 20, y: 1, z: -5 }, // v39
      { x: 20, y: 1, z: -3.5 }, // v40
      { x: 20, y: 0, z: -5.5 }, // v41
      { x: 20, y: 2.5, z: -5.5 }, // v42
      { x: 20, y: 2.5, z: -5 }, // v43
      { x: 20, y: 4, z: -5.5 }, // v44

      // left wall
      { x: 0, y: 0, z: -5.5 }, // v45
      { x: 0, y: 4, z: -5.5 }, // v46

      // repeated vertices -- avoids shading issues
      { x: 0, y: 0, z: 0 }, // v47 - equiv v0, but for left wall
      { x: 20, y: 0, z: 0 }, // v48 - equiv v29, but for right wall
      { x: 20, y: 2.5, z: 0 }, // v49 - equiv v30, but for right wall
      { x: 0, y: 4, z: 0 }, // v50 - equiv v33, but for left wall
      { x: 20, y: 4, z: 0 }, // v51 - equiv v35, but for right wall
      { x: 20, y: 0, z: -5.5 }, // v52 - equiv v41, but for back wall
      { x: 20, y: 4, z: -5.5 }, // v53 - equiv v44, but for back wall
      { x: 0, y: 0, z: -5.5 }, // v54 - equiv v45, but for back wall
      { x: 0, y: 4, z: -5.5 }, // v55 - equiv v46, but for back wall
    ],
    triangles: [
      // front wall
      [0, 1, 2],
      [0, 3, 1],
      [3, 4, 5],
      [3, 5, 6],
      [4, 7, 8],
      [4, 8, 9],
      [7, 10, 11],
      [7, 11, 12],
      [10, 13, 14],
      [10, 14, 15],
      [16, 18, 19],
      [16, 19, 17],
      [18, 20, 21],
      [18, 21, 22],
      [20, 23, 24],
      [20, 24, 25],
      [23, 26, 27],
      [23, 27, 28],
      [26, 29, 30],
      [26, 30, 31],
      [2, 14, 32],
      [2, 32, 33],
      [14, 25, 34],
      [14, 34, 32],
      [25, 30, 35],
      [25, 35, 34],

      // right wall (for a definition of right... - the one with the window)
      [48, 36, 37],
      [48, 37, 49],
      [36, 38, 39],
      [36, 39, 40],
      [38, 41, 42],
      [38, 42, 43],
      [49, 42, 44],
      [49, 44, 51],

      // left wall
      [45, 47, 50],
      [45, 50, 46],

      // back wall
      [52, 54, 55],
      [52, 55, 53],
    ],
  });
}

function createHouseRoofGeometry() {
  return createBufferGeometry({
    defaultVertexColor: COLORS.orange,
    vertices: [
      // base of the roof
      { x: 0, y: 4, z: 0 }, // v0
      { x: 0, y: 4, z: -5.5 }, // v1
      { x: 20, y: 4, z: 0 }, // v2
      { x: 20, y: 4, z: -5.5 }, // v3

      // top of the roof
      { x: 0, y: 6, z: -2.75 }, // v4
      { x: 20, y: 6, z: -2.75 }, // v5

      // repeated vertices -- avoids shading issues
      { x: 0, y: 4, z: 0 }, // v6 - equiv v0, but for sides
      { x: 0, y: 4, z: -5.5 }, // v7 - equiv v1, but for sides
      { x: 20, y: 4, z: 0 }, // v8 - equiv v2, but for sides
      { x: 20, y: 4, z: -5.5 }, // v9 - equiv v3, but for sides
      { x: 0, y: 6, z: -2.75 }, // v10 - equiv v4, but for most deep
      { x: 0, y: 6, z: -2.75 }, // v11 - equiv v4, but for sides
      { x: 20, y: 6, z: -2.75 }, // v12 - equiv v5, but for most deep
      { x: 20, y: 6, z: -2.75 }, // v13 - equiv v5, but for sides
    ],
    triangles: [
      // least deep (closest to z = 0) roof side
      [0, 2, 5],
      [0, 5, 4],

      // most deep (closest to z = -5.5) roof side
      [3, 1, 10],
      [3, 10, 12],

      // sides
      [7, 6, 11],
      [8, 9, 13],
    ],
  });
}

function createHouseWindowsGeometry() {
  return createBufferGeometry({
    defaultVertexColor: COLORS.lightBlue,
    vertices: [
      // leftmost window (as seen from the front)
      { x: 1, y: 1, z: 0 }, // v0
      { x: 2.5, y: 1, z: 0 }, // v1
      { x: 2.5, y: 2.5, z: 0 }, // v2
      { x: 1, y: 2.5, z: 0 }, // v3

      // second-to-leftmost window (as seen from the front)
      { x: 4.5, y: 1, z: 0 }, // v4
      { x: 6, y: 1, z: 0 }, // v5
      { x: 6, y: 2.5, z: 0 }, // v5
      { x: 4.5, y: 2.5, z: 0 }, // v7

      // second-to-rightmost window (as seen from the front)
      { x: 11.5, y: 1, z: 0 }, // v8
      { x: 13, y: 1, z: 0 }, // v9
      { x: 13, y: 2.5, z: 0 }, // v10
      { x: 11.5, y: 2.5, z: 0 }, // v11

      // rightmost window (as seen from the front)
      { x: 17, y: 1, z: 0 }, // v12
      { x: 18.5, y: 1, z: 0 }, // v13
      { x: 18.5, y: 2.5, z: 0 }, // v14
      { x: 17, y: 2.5, z: 0 }, // v15

      // side window
      { x: 20, y: 1, z: -3.5 }, // v16
      { x: 20, y: 1, z: -5 }, // v17
      { x: 20, y: 2.5, z: -5 }, // v18
      { x: 20, y: 2.5, z: -3.5 }, // v19
    ],
    triangles: [
      // leftmost window (as seen from the front)
      [0, 1, 2],
      [0, 2, 3],

      // second-to-leftmost window (as seen from the front)
      [4, 5, 6],
      [4, 6, 7],

      // second-to-rightmost window (as seen from the front)
      [8, 9, 10],
      [8, 10, 11],

      // rightmost window (as seen from the front)
      [12, 13, 14],
      [12, 14, 15],

      // side window
      [16, 17, 18],
      [16, 18, 19],
    ],
  });
}

function createHouseDoorGeometry() {
  return createBufferGeometry({
    defaultVertexColor: COLORS.dodgerBlue,
    vertices: [
      { x: 8, y: 0, z: 0 }, // v0
      { x: 9.25, y: 0, z: 0 }, // v1
      { x: 9.25, y: 2.5, z: 0 }, // v2
      { x: 8, y: 2.5, z: 0 }, // v3
    ],
    triangles: [
      [0, 1, 2],
      [0, 2, 3],
    ],
  });
}

/**
 * Create an oak tree with the given parameters and place it on the scene.
 *
 * @param {number} trunkHeight - Height of the trunk of the tree.
 * @param {THREE.Vector3} position - A vector with the position of the tree relative to the center of the scene.
 * @param {THREE.Euler} rotation - Orientation of the tree.
 */
function createOakTree(trunkHeight, position, rotation) {
  const treeGroup = new THREE.Group();
  treeGroup.position.copy(position);
  treeGroup.rotation.copy(rotation);
  rootGroup.add(treeGroup);

  // Create trunk
  const oakTrunk = createNamedMesh('treeTrunk', treeGroup);
  oakTrunk.scale.setY(trunkHeight);
  oakTrunk.position.setY(trunkHeight / 2); // Cylinder is centered by default

  // Create primary branch
  const primaryBranch = createNamedMesh('treePrimaryBranch', treeGroup);

  const primaryBranchIncl = Math.PI / 6; // 30 deg
  // Calculate position to perfectly align the base of the branch with the trunk
  const primaryBranchX =
    Math.sin(primaryBranchIncl) *
      (GEOMETRY.treePrimaryBranch.parameters.height / 2 +
        GEOMETRY.treePrimaryBranch.parameters.radiusBottom / Math.tan(primaryBranchIncl)) -
    GEOMETRY.treeTrunk.parameters.radiusTop;
  const primaryBranchY =
    Math.cos(primaryBranchIncl) *
      (GEOMETRY.treePrimaryBranch.parameters.height / 2 +
        GEOMETRY.treePrimaryBranch.parameters.radiusBottom * Math.tan(primaryBranchIncl)) -
    GEOMETRY.treeTrunk.parameters.radiusTop;

  primaryBranch.position.set(primaryBranchX, trunkHeight + primaryBranchY, 0);
  primaryBranch.rotation.set(0, 0, -primaryBranchIncl);

  // Create secondary branch
  const secondaryBranch = createNamedMesh('treeSecondaryBranch', treeGroup);

  const secondaryBranchIncl = Math.PI / 3; // 60 deg
  // Position secondary branch in a way that its base is inside the primary branch
  secondaryBranch.position.set(
    -GEOMETRY.treeSecondaryBranch.parameters.height / 4,
    trunkHeight + GEOMETRY.treeSecondaryBranch.parameters.height / 2,
    0
  );
  secondaryBranch.rotation.set(0, 0, secondaryBranchIncl);

  // Position leaf above top of primary branch
  const primaryBranchLeaf = createNamedMesh('treeLeaf', treeGroup);
  primaryBranchLeaf.position.set(
    primaryBranchX * 2,
    trunkHeight + primaryBranchY * 2 + ELLIPSOID_SCALING.treePrimaryBranchLeaf.y / 2,
    0
  );
  primaryBranchLeaf.scale.copy(ELLIPSOID_SCALING.treePrimaryBranchLeaf);

  // Position leaf above top of secondary branch
  const secondaryBranchLeaf = createNamedMesh('treeLeaf', treeGroup);
  secondaryBranchLeaf.position.set(
    (-GEOMETRY.treeSecondaryBranch.parameters.height * 2) / 3,
    trunkHeight + primaryBranchY * 2 + ELLIPSOID_SCALING.treePrimaryBranchLeaf.y / 2,
    0
  );
  secondaryBranchLeaf.scale.copy(ELLIPSOID_SCALING.treeSecondaryBranchLeaf);
}

function createUfo(initialPosition) {
  ufo = new THREE.Group();
  ufo.position.copy(initialPosition);
  rootGroup.add(ufo);

  const body = createNamedMesh('ufoBody', ufo);
  body.scale.copy(ELLIPSOID_SCALING.ufoBody);

  const cockpit = createNamedMesh('ufoCockpit', ufo);
  cockpit.position.set(0, ELLIPSOID_SCALING.ufoBody.y / 2, 0);

  const spotlight = createNamedMesh('ufoSpotlight', ufo);
  spotlight.position.set(0, -ELLIPSOID_SCALING.ufoBody.y, 0);

  const spotlightTarget = new THREE.Object3D();
  spotlightTarget.position.set(0, -10, 0); // point downwards
  ufo.add(spotlightTarget);

  ufoSpotlight = new THREE.SpotLight(
    COLORS.darkBlue,
    LIGHT_INTENSITY.ufoSpotlight,
    0,
    UFO_SPOTLIGHT_ANGLE,
    UFO_SPOTLIGHT_PENUMBRA
  );
  ufoSpotlight.position.copy(spotlight.position);
  ufoSpotlight.target = spotlightTarget;
  ufo.add(ufoSpotlight);

  for (let i = 0; i < UFO_SPHERE_COUNT; i++) {
    const sphereGroup = new THREE.Group();
    sphereGroup.rotation.set(0, (i * 2 * Math.PI) / UFO_SPHERE_COUNT, 0);
    ufo.add(sphereGroup);

    const sphere = createNamedMesh('ufoSphere', sphereGroup);

    const sphereY = -ELLIPSOID_SCALING.ufoBody.y / 2;
    // Calculate sphereX by intercepting the ellipse equation at this Y coordinate
    // Ellipse equation: x^2/a^2 + y^2/b^2 = 1, where a is rx and b is ry.
    // Therefore, x = sqrt(a^2 * (1 - y^2/b^2))
    const sphereX = Math.sqrt(
      ELLIPSOID_SCALING.ufoBody.x ** 2 * (1 - sphereY ** 2 / ELLIPSOID_SCALING.ufoBody.y ** 2)
    );

    sphere.position.set(sphereX, sphereY, 0);

    const sphereLight = new THREE.PointLight(
      COLORS.darkBlue,
      LIGHT_INTENSITY.ufoSphere,
      UFO_SPHERE_LIGHT_DISTANCE
    );
    sphereLight.position.set(sphereX, sphereY, 0);
    sphereGroup.add(sphereLight);
    UFO_SPHERE_LIGHTS.push(sphereLight);
  }
}

/**
 * Creates a buffer geometry from a given set of parameters.
 * @param {Object} p - an object containing the input parameters
 * @param {{x: number, y: number, z: number, color: THREE.Color}[]} p.vertices - an array of vertices
 * @param {number[][]} p.triangles - an array of triangles, given as an array of indices
 * @param {number} p.scale - multiplier to be applied to all vertex coordinates (default: 1)
 * @param {THREE.Color} p.defaultVertexColor - color to be used for vertices without color (optional)
 * @returns {THREE.BufferGeometry} - a THREE.BufferGeometry with the given attributes
 *
 * Note that triangle indices correspond to the indices of the vertices array.
 * The returned geometry should be used with a mesh with vertexColors set to true.
 */
function createBufferGeometry({ vertices, triangles, scale = 1, defaultVertexColor }) {
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
      vertices
        .map((vertex) => vertex.color ?? defaultVertexColor)
        .flatMap((color) => [color.r, color.g, color.b]),
      3
    )
  );
  geometry.computeVertexNormals();

  return geometry;
}

////////////
/* UPDATE */
////////////
function update(timeDelta) {
  if (activeMaterialChanged) {
    activeMaterialChanged = false;
    NAMED_MESHES.forEach((mesh) => (mesh.material = mesh.userData.materials[activeMaterial]));
  }
  if (generateNewStars) {
    stars.clear();
    generateProps(stars, PROP_AMOUNTS.stars, TEXTURE_SIZES.sky, { x: 1, y: 0, z: 1 });
  }
  if (generateNewFlowers) {
    flowers.clear();
    generateProps(flowers, PROP_AMOUNTS.flowers, TEXTURE_SIZES.field, { x: 1, y: 0, z: 1 }, [
      COLORS.white,
      COLORS.yellow,
      COLORS.lilac,
      COLORS.lightBlue,
    ]);
  }
  if (updateProjectionMatrix) {
    const isXrPresenting = renderer.xr.isPresenting;
    renderer.xr.isPresenting = false;
    updateProjectionMatrix = false;
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (window.innerHeight > 0 && window.innerWidth > 0) {
      refreshCameraParameters(isXrPresenting ? renderer.xr.getCamera() : activeCamera);
    }
    renderer.xr.isPresenting = isXrPresenting;
  }
  if (toggleActiveCamera) {
    toggleActiveCamera = false;
    activeCamera = activeCamera == ORBITAL_CAMERA ? FIXED_CAMERA : ORBITAL_CAMERA;
    refreshCameraParameters(activeCamera);
  }
  if (toggleActiveCamera) {
    toggleActiveCamera = false;
    activeCamera = activeCamera == ORBITAL_CAMERA ? FIXED_CAMERA : ORBITAL_CAMERA;
    refreshCameraParameters(activeCamera);
  }

  // Move UFO at constant velocity on key press
  const ufoDeltaVector = Object.entries(ufoMovementFlags)
    .filter(([_key, toggled]) => toggled) // Filter by pressed keys
    .map(([key, _toggled]) => MOVEMENT_FLAGS[key]) // Get the corresponding vector
    .reduce((resultingVector, vector) => resultingVector.add(vector), new THREE.Vector3())
    .normalize()
    .multiplyScalar(timeDelta * UFO_LINEAR_VELOCITY); // Multiply by its velocity
  ufo.position.add(ufoDeltaVector);

  // Rotate UFO at constant angular velocity
  ufo.rotation.y = (ufo.rotation.y + timeDelta * UFO_ANGULAR_VELOCITY) % (2 * Math.PI);
}

/////////////
/* DISPLAY */
/////////////
function render() {
  if (generateNewStars) {
    renderer.xr.enabled = false;
    renderer.setRenderTarget(skyTexture);
    renderer.render(bufferScene, SKY_CAMERA);
    generateNewStars = false;
    renderer.xr.enabled = true;
  }

  if (generateNewFlowers) {
    renderer.xr.enabled = false;
    renderer.setRenderTarget(fieldTexture);
    renderer.render(bufferScene, FIELD_CAMERA);
    generateNewFlowers = false;
    renderer.xr.enabled = true;
  }

  renderer.setRenderTarget(null);
  renderer.render(scene, activeCamera);
}

////////////////////////////////
/* INITIALIZE ANIMATION CYCLE */
////////////////////////////////
function init() {
  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  renderer.xr.enabled = true;
  document.body.appendChild(VRButton.createButton(renderer));

  createBufferScene();

  const loader = new THREE.TextureLoader();
  terrainHeightMap = loader.load(TERRAIN_HEIGHT_MAP_PATH);

  createScene();
  createCameras();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
  const timeDelta = CLOCK.getDelta();
  update(timeDelta);
  render();
  renderer.setAnimationLoop(animate);
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////
function onResize() {
  updateProjectionMatrix = true;
}

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
const keyHandlers = {
  // material switching
  KeyQ: changeMaterialHandlerFactory('gouraud'),
  KeyW: changeMaterialHandlerFactory('phong'),
  KeyE: changeMaterialHandlerFactory('cartoon'),
  KeyR: toggleReactionToLightsHandler,

  // toggle directional light
  KeyD: keyActionFactory(() => (directionalLight.visible = !directionalLight.visible)),

  // toggle UFO lights
  KeyS: keyActionFactory(() => (ufoSpotlight.visible = !ufoSpotlight.visible)),
  KeyP: keyActionFactory(() =>
    UFO_SPHERE_LIGHTS.forEach((light) => (light.visible = !light.visible))
  ),

  // ufo movement
  ArrowUp: moveUfoHandlerFactory('positiveZ'),
  ArrowDown: moveUfoHandlerFactory('negativeZ'),
  ArrowLeft: moveUfoHandlerFactory('positiveX'),
  ArrowRight: moveUfoHandlerFactory('negativeX'),

  // texture generation
  Digit1: keyActionFactory(() => (generateNewFlowers = true)),
  Digit2: keyActionFactory(() => (generateNewStars = true)),

  // EXTRA: toggle orbital camera
  KeyO: keyActionFactory(() => (toggleActiveCamera = true)),
};

function onKeyDown(event) {
  let { code } = event;

  // Treat numpad digits like the number row
  if (/^Numpad\d$/.test(code)) {
    code = code.replace('Numpad', 'Digit');
  }

  keyHandlers[code]?.(event, true);
}

/**
 * Build a key handler that only executes once on keydown.
 * Ignores the keyup event, as well as duplicate keydown events.
 */
function keyActionFactory(handler) {
  return (event, isDown) => {
    if (!isDown || event.repeat) {
      return;
    }

    handler(event);
  };
}

function changeMaterialHandlerFactory(material) {
  return keyActionFactory(() => {
    activeMaterial = material;
    activeMaterialChanged = true;
  });
}

function toggleReactionToLightsHandler(...args) {
  const handler = keyActionFactory(() => {
    activeMaterial = activeMaterial === 'basic' ? 'phong' : 'basic';
    activeMaterialChanged = true;
  });

  handler(...args);
}

function moveUfoHandlerFactory(direction) {
  return (_event, isDown) => {
    ufoMovementFlags[direction] = isDown;
  };
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(event) {
  let { code } = event;

  // Treat numpad digits like the number row
  if (/^Numpad\d$/.test(code)) {
    code = code.replace('Numpad', 'Digit');
  }

  keyHandlers[code]?.(event, false);
}

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

  parent.add(group);
  return group;
}

/**
 * Create a mesh using the parameters defined in GEOMETRY and MATERIAL_PARAMS,
 * registering it in NAMED_MESHES to allow dynamic behavior such as material switching.
 *
 * This should not be used for buffer scene elements, as they are not dynamic.
 * @param {string} name - the mesh's name, per GEOMETRY and MATERIAL_PARAMS
 * @param {THREE.Object3D} parent - the parent to which the props will be added
 * @returns {THREE.Mesh} - the newly created mesh
 */
function createNamedMesh(name, parent) {
  const params = MATERIAL_PARAMS[name]();
  const materials = {
    basic: new THREE.MeshBasicMaterial({ ...params }),
    gouraud: new THREE.MeshLambertMaterial({ ...params }),
    phong: new THREE.MeshPhongMaterial({ ...params }),
    cartoon: new THREE.MeshToonMaterial({ ...params }),
  };
  const mesh = new THREE.Mesh(GEOMETRY[name], materials[activeMaterial]);
  Object.assign(mesh.userData, { name, materials });
  NAMED_MESHES.push(mesh);
  parent.add(mesh);
  return mesh;
}
