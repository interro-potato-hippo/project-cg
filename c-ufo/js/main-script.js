'use strict';

//////////////////////
/* GLOBAL CONSTANTS */
//////////////////////
const MATERIAL = Object.freeze({
  terrain: new THREE.MeshBasicMaterial({ wireframe: true, color: 0x00ff00 }),
  skydome: new THREE.MeshBasicMaterial({ wireframe: true, color: 0xfff000, side: THREE.BackSide }),
});
const GEOMETRY = Object.freeze({
  // the terrain's plane should be circular, with a radius of 50
  terrain: new THREE.CircleGeometry(50, 32),
  skydome: new THREE.SphereGeometry(50, 32, 32, 0, Math.PI),
});

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
  const skydome = new THREE.Mesh(GEOMETRY.skydome, MATERIAL.skydome);
  skydome.rotateX(-Math.PI / 2);
  scene.add(skydome);
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
