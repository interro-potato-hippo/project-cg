'use strict';

//////////////////////
/* GLOBAL CONSTANTS */
//////////////////////
const COLORS = Object.freeze({
  darkBlue: new THREE.Color(0x00008b),
  darkPurple: new THREE.Color(0x632cd4),
  green: new THREE.Color(0x55cc55),
});
const MATERIAL = {
  terrain: new THREE.MeshBasicMaterial({ wireframe: true, color: COLORS.green }),
};
const GEOMETRY = {
  terrain: new THREE.PlaneGeometry(50, 50, 50, 50),
  skydome: new THREE.SphereGeometry(50, 32, 32),
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
  // TODOs:
  // - magic numbers (100 to SKYDOME_TEXTURE_SIZE or smth)
  const skydome_props = {
    scene: new THREE.Scene(),
    texture: new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.NearestFilter,
    }),
    geometry: new THREE.BufferGeometry(),
    positions: [0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 0].map((x) => x * 100),
    indices: [0, 1, 2, 2, 3, 0],
    colors: [COLORS.darkPurple, COLORS.darkBlue, COLORS.darkBlue, COLORS.darkPurple].flatMap(
      (color) => [color.r, color.g, color.b]
    ),
    camera: new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 100),
  };

  skydome_props.geometry.setIndex(skydome_props.indices);
  skydome_props.geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(skydome_props.positions, 3)
  );
  skydome_props.geometry.setAttribute(
    'color',
    new THREE.Float32BufferAttribute(skydome_props.colors, 3)
  );
  const texture_skydome = new THREE.Mesh(
    skydome_props.geometry,
    new THREE.MeshBasicMaterial({ vertexColors: true })
  );
  skydome_props.scene.add(texture_skydome);

  skydome_props.camera.position.set(50, 10, 50);
  skydome_props.camera.lookAt(50, 0, 50);
  skydome_props.scene.add(skydome_props.camera);

  // creates the actual skydome sphere
  // TODO: should this be a half sphere?
  const sphere = new THREE.Mesh(
    GEOMETRY.skydome,
    new THREE.MeshBasicMaterial({
      map: skydome_props.texture.texture,
      side: THREE.BackSide,
    })
  );
  scene.add(sphere);

  renderer.setRenderTarget(skydome_props.texture);
  renderer.render(skydome_props.scene, skydome_props.camera, skydome_props.texture);
  renderer.setRenderTarget(null);
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
