'use strict';

//////////////////////
/* GLOBAL CONSTANTS */
//////////////////////
const CYLINDER_SEGMENTS = 30;
const SPHERE_SEGMENTS = 30;
const COLORS = Object.freeze({
  darkBlue: new THREE.Color(0x00008b),
  darkPurple: new THREE.Color(0x632cd4),
  green: new THREE.Color(0x55cc55),
  darkGreen: new THREE.Color(0x5e8c61),
  white: new THREE.Color(0xffffff),
  brown: new THREE.Color(0xa96633),
});
const MATERIAL = {
  terrain: new THREE.MeshBasicMaterial({ wireframe: true, color: COLORS.green }),
  oakTree: new THREE.MeshBasicMaterial({ color: COLORS.brown }),
  treeLeaf: new THREE.MeshBasicMaterial({ color: COLORS.darkGreen }),
  ufoBody: new THREE.MeshBasicMaterial({ color: 0xffff00, wireframe: true }), // TODO change color: ;
  ufoCockpit: new THREE.MeshBasicMaterial({ color: 0x00ffff }), // TODO change color
  ufoSpotlight: new THREE.MeshBasicMaterial({ color: 0xff00ff }), // TODO change color
  ufoSphere: new THREE.MeshBasicMaterial({ color: 0xffffff }), // TODO change color
};
const DOME_RADIUS = 50;
const PROP_RADIUS = 0.1;
const MIN_PROP_DISTANCE_SQ = (2 * PROP_RADIUS) ** 2;

const GEOMETRY = {
  terrain: new THREE.CircleGeometry(DOME_RADIUS, 128),
  skydome: new THREE.SphereGeometry(DOME_RADIUS, 32, 32),
  // height is replaced per instance of oak tree
  oakTree: new THREE.CylinderGeometry(0.5, 0.5, 1, CYLINDER_SEGMENTS),
  treeLeftBranch: new THREE.CylinderGeometry(0.5, 0.5, 4, CYLINDER_SEGMENTS),
  treeRightBranch: new THREE.CylinderGeometry(0.4, 0.4, 4, CYLINDER_SEGMENTS),
  treeLeftLeaf: { rx: 2.3, ry: 1.1, rz: 1.5 }, // store radius in all axis since SphereGeometry only has one radius
  treeRightLeaf: { rx: 3, ry: 1.375, rz: 2.5 }, // store radius in all axis since SphereGeometry only has one radius
  ufoBody: new THREE.Vector3(3.5, 1, 3.5),
  ufoCockpit: new THREE.Vector3(1.5, 1.5, 1.5),
  ufoSpotlight: new THREE.CylinderGeometry(1.5, 1.5, 0.5, CYLINDER_SEGMENTS),
  ufoSphere: new THREE.Vector3(0.25, 0.25, 0.25),
};
const TEXTURE_SIZES = {
  terrain: 64,
  skydome: 128,
};
const PROP_AMOUNTS = {
  terrain: 128, // flowers
  skydome: 2048, // stars
};

const CAMERA_GEOMETRY = Object.freeze({
  fov: 80,
  near: 1,
  far: 1000,
});
const ORBITAL_CAMERA = createPerspectiveCamera({ x: -10, y: 20, z: -10 });

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////

let renderer, scene;
let activeCamera = ORBITAL_CAMERA; // starts as the orbital camera, may change afterwards

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
  scene = new THREE.Scene();
  scene.add(new THREE.AxesHelper(20));

  createTerrain();
  createSkydome();

  createOakTree(8, new THREE.Vector3(15, 0, -26), new THREE.Euler(0, Math.PI / 3, 0));
  createOakTree(1.5, new THREE.Vector3(-28, 0, 4), new THREE.Euler(0, Math.PI / 2, 0));
  createOakTree(3, new THREE.Vector3(14, 0, 9), new THREE.Euler(0, 0, 0));
  createOakTree(4, new THREE.Vector3(-36, 0, -14), new THREE.Euler(0, Math.PI / 6, 0));

  createUfo(new THREE.Vector3(0, 10, 0));
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createCameras() {
  const controls = new THREE.OrbitControls(activeCamera, renderer.domElement);
  controls.target.set(0, 0, 0);
  controls.update();
}

function createPerspectiveCamera({ x = 0, y = 0, z = 0 }) {
  const aspect = window.innerWidth / window.innerHeight;

  const camera = new THREE.PerspectiveCamera(
    CAMERA_GEOMETRY.fov,
    aspect,
    CAMERA_GEOMETRY.near,
    CAMERA_GEOMETRY.far
  );
  camera.position.set(x, y, z);
  camera.lookAt(x, y, z);
  return camera;
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////
function createTerrain() {
  const plane = new THREE.Mesh(GEOMETRY.terrain, MATERIAL.terrain);
  plane.rotateX(-Math.PI / 2); // we rotate it so that it is in the xOz plane
  scene.add(plane);
}

function createSkydome() {
  const skydomeProps = {
    scene: new THREE.Scene(),
    texture: new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
    }),
    geometry: new THREE.BufferGeometry(),
    positions: [
      [0, 0, 0],
      [0, 0, 1],
      [1, 0, 1],
      [1, 0, 0],
    ].flatMap((position) => position.map((coord) => coord * TEXTURE_SIZES.skydome)),
    indices: [
      [0, 1, 2],
      [2, 3, 0],
    ].flatMap((triangle) => triangle),
    colors: [COLORS.darkPurple, COLORS.darkBlue, COLORS.darkBlue, COLORS.darkPurple].flatMap(
      (color) => [color.r, color.g, color.b]
    ),
    camera: new THREE.OrthographicCamera(
      -TEXTURE_SIZES.skydome / 2,
      TEXTURE_SIZES.skydome / 2,
      TEXTURE_SIZES.skydome / 2,
      -TEXTURE_SIZES.skydome / 2,
      1,
      100
    ),
  };

  skydomeProps.geometry.setIndex(skydomeProps.indices);
  skydomeProps.geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(skydomeProps.positions, 3)
  );
  skydomeProps.geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(skydomeProps.colors, 3)
  );
  const skydome_mesh = new THREE.Mesh(
    skydomeProps.geometry,
    new THREE.MeshBasicMaterial({ vertexColors: true })
  );
  skydomeProps.scene.add(skydome_mesh);

  skydomeProps.camera.position.set(TEXTURE_SIZES.skydome / 2, 10, TEXTURE_SIZES.skydome / 2);
  skydomeProps.camera.lookAt(TEXTURE_SIZES.skydome / 2, 0, TEXTURE_SIZES.skydome / 2);
  skydomeProps.scene.add(skydomeProps.camera);

  generateProps(skydomeProps.scene, PROP_AMOUNTS.skydome, TEXTURE_SIZES.skydome, {
    x: 1,
    y: 1,
    z: 1,
  });
  // creates the actual skydome sphere
  const sphere = new THREE.Mesh(
    GEOMETRY.skydome,
    new THREE.MeshBasicMaterial({
      map: skydomeProps.texture.texture,
      side: THREE.BackSide,
    })
  );
  sphere.rotateX(Math.PI / 2); // rotating it allows for a more "natural" dawn/dusk
  scene.add(sphere);

  renderer.setRenderTarget(skydomeProps.texture);
  renderer.render(skydomeProps.scene, skydomeProps.camera, skydomeProps.texture);
  renderer.setRenderTarget(null);
}

/**
 * Fills a texture with a given amount of props.
 * @param {THREE.Scene} scene - the scene where the props will be generated on
 * @param {int} amount - the amount of props to generate
 * @param {int} planeSize - the size of the plane the mesh is on
 * @param {Object} freedom - multipliers stating whether props may have non-zero coordinates on a given axis; by default, they can't
 * @param {Array} colors - the available colors for the props to be generated; by default, they're all white
 */
function generateProps(
  scene,
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
    scene.add(dot);
  }
}

/**
 * Generates a random position within a plane.
 * @param {int} planeSize - the size of the plane where the props will be placed on
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
  scene.add(treeGroup);

  // Create trunk
  const oakTrunk = new THREE.Mesh(GEOMETRY.oakTree, MATERIAL.oakTree);
  oakTrunk.scale.setY(trunkHeight);
  oakTrunk.position.setY(trunkHeight / 2); // Cylinder is centered by default
  treeGroup.add(oakTrunk);

  // Create left branch
  const leftBranch = new THREE.Mesh(GEOMETRY.treeLeftBranch, MATERIAL.oakTree);

  const leftBranchIncl = Math.PI / 6; // 30 deg
  const leftBranchX =
    Math.cos(Math.PI / 2 - leftBranchIncl) *
      (GEOMETRY.treeLeftBranch.parameters.height / 2 +
        GEOMETRY.treeLeftBranch.parameters.radiusBottom / Math.tan(leftBranchIncl)) -
    GEOMETRY.oakTree.parameters.radiusTop;
  const leftBranchY =
    Math.cos(leftBranchIncl) *
      (GEOMETRY.treeLeftBranch.parameters.height / 2 +
        GEOMETRY.treeLeftBranch.parameters.radiusBottom / Math.tan(Math.PI / 2 - leftBranchIncl)) -
    GEOMETRY.oakTree.parameters.radiusTop;

  leftBranch.position.set(leftBranchX, trunkHeight + leftBranchY, 0);
  leftBranch.rotation.set(0, 0, -leftBranchIncl);
  treeGroup.add(leftBranch);

  // Create right branch
  const rightBranch = new THREE.Mesh(GEOMETRY.treeRightBranch, MATERIAL.oakTree);

  const rightBranchIncl = Math.PI / 3; // 60 deg

  rightBranch.rotation.set(0, 0, rightBranchIncl);
  rightBranch.position.set(
    -GEOMETRY.treeRightBranch.parameters.height / 4,
    trunkHeight + GEOMETRY.treeRightBranch.parameters.height / 2,
    0
  );

  treeGroup.add(rightBranch);

  const leftLeaf = new THREE.Mesh(
    new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
    MATERIAL.treeLeaf
  );
  leftLeaf.position.set(
    leftBranchX * 2,
    trunkHeight + leftBranchY * 2 + GEOMETRY.treeLeftLeaf.ry / 2,
    0
  );
  leftLeaf.scale.set(GEOMETRY.treeLeftLeaf.rx, GEOMETRY.treeLeftLeaf.ry, GEOMETRY.treeLeftLeaf.rz);

  treeGroup.add(leftLeaf);

  const rightLeaf = new THREE.Mesh(
    new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
    MATERIAL.treeLeaf
  );
  rightLeaf.position.set(
    (-GEOMETRY.treeRightBranch.parameters.height * 2) / 3,
    trunkHeight + leftBranchY * 2 + GEOMETRY.treeLeftLeaf.ry / 2,
    0
  );
  rightLeaf.scale.set(
    GEOMETRY.treeRightLeaf.rx,
    GEOMETRY.treeRightLeaf.ry,
    GEOMETRY.treeRightLeaf.rz
  );

  treeGroup.add(rightLeaf);
}

function createUfo(initialPosition) {
  const ufoGroup = new THREE.Group();
  ufoGroup.position.copy(initialPosition);
  scene.add(ufoGroup);

  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
    MATERIAL.ufoBody
  );
  body.scale.copy(GEOMETRY.ufoBody);
  ufoGroup.add(body);

  const cockpit = new THREE.Mesh(
    new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
    MATERIAL.ufoCockpit
  );
  cockpit.scale.copy(GEOMETRY.ufoCockpit);
  cockpit.position.set(0, GEOMETRY.ufoBody.y / 2, 0);
  ufoGroup.add(cockpit);

  const spotlight = new THREE.Mesh(GEOMETRY.ufoSpotlight, MATERIAL.ufoSpotlight);
  spotlight.position.set(
    0,
    -GEOMETRY.ufoSpotlight.parameters.height / 2 - GEOMETRY.ufoBody.y / 2,
    0
  );
  ufoGroup.add(spotlight);

  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(1, SPHERE_SEGMENTS, SPHERE_SEGMENTS),
    MATERIAL.ufoSphere
  );
  sphere.scale.copy(GEOMETRY.ufoSphere);
  sphere.position.set(2.8, -GEOMETRY.ufoBody.y / 4, 0);
  ufoGroup.add(sphere);
  console.log(sphere);
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
