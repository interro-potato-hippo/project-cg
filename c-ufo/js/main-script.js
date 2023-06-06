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
const MATERIAL = {
  terrain: new THREE.MeshBasicMaterial({ wireframe: true, color: COLORS.green }),
};
const DOME_RADIUS = 50;
const PROP_RADIUS = 0.1;
const GEOMETRY = {
  terrain: new THREE.CircleGeometry(DOME_RADIUS, 128),
  skydome: new THREE.SphereGeometry(DOME_RADIUS, 32, 32),
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

  generateProps(skydome_mesh, PROP_AMOUNTS.skydome, TEXTURE_SIZES.skydome, { x: 1, y: 1, z: 1 });
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
 * @param {THREE.MESH} mesh - the mesh to generate props on
 * @param {int} amount - the amount of props to generate
 * @param {int} planeSize - the size of the plane the mesh is on
 * @param {Object} freedom - whether props may have non-zero coordinates on a given axis; by default, they can't
 * @param {Array} colors - the available colors for the props to be generated; by default, they're all white
 */
function generateProps(
  mesh,
  amount,
  planeSize,
  freedom = { x: 0, y: 0, z: 0 },
  colors = [COLORS.white]
) {
  const prop = new THREE.Mesh(
    new THREE.CircleGeometry(PROP_RADIUS, 32),
    new THREE.MeshBasicMaterial({ color: COLORS.white })
  );
  let occupiedPositions = []; // props cannot be generated on top of each other
  for (let i = 0; i < amount; i++) {
    let dot = prop.clone();
    let position;
    // we can't generate props on top of each other, so we keep track of the occupied positions
    // and generate a new one if the current one is already occupied
    do {
      position = generatePosition(planeSize, freedom);
    } while (
      occupiedPositions.some(
        (occupiedPosition) => occupiedPosition.distanceTo(position) <= 2 * PROP_RADIUS
      )
    );
    dot.position.set(position.x, position.y, position.z);
    dot.rotateX(-Math.PI / 2);
    dot.material.color.set(colors[Math.floor(Math.random() * colors.length)]);
    occupiedPositions.push(position);
    mesh.add(dot);
  }
}

/**
 * Generates a random position within a plane.
 * @param {int} planeSize - the size of the plane the mesh is on
 * @param {Object} freedom - whether props may have non-zero coordinates on a given axis; by default, they can't
 * @returns a new THREE.Vector3 with coordinates within the plane
 */
function generatePosition(planeSize, freedom) {
  return new THREE.Vector3(
    THREE.Math.clamp(
      freedom.x * Math.random() * planeSize,
      0 + PROP_RADIUS,
      planeSize - PROP_RADIUS
    ),
    THREE.Math.clamp(
      freedom.y * Math.random() * planeSize,
      0 + PROP_RADIUS,
      planeSize - PROP_RADIUS
    ),
    THREE.Math.clamp(
      freedom.z * Math.random() * planeSize,
      0 + PROP_RADIUS,
      planeSize - PROP_RADIUS
    )
  );
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
