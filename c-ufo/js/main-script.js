'use strict';

//////////////////////
/* GLOBAL CONSTANTS */
//////////////////////
const CYLINDER_SEGMENTS = 30;
const SPHERE_SEGMENTS = 30;
const MATERIAL = Object.freeze({
  terrain: new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true }),
  oakTree: new THREE.MeshBasicMaterial({ color: 0xa96633 }),
  treeLeaf: new THREE.MeshBasicMaterial({ color: 0x5e8c61 }),
});
const GEOMETRY = Object.freeze({
  terrain: new THREE.PlaneGeometry(100, 100, 100, 100),
  // height is replaced per instance of oak tree
  oakTree: new THREE.CylinderGeometry(0.5, 0.5, 1, CYLINDER_SEGMENTS),
  treeLeftBranch: new THREE.CylinderGeometry(0.5, 0.5, 4, CYLINDER_SEGMENTS),
  treeRightBranch: new THREE.CylinderGeometry(0.4, 0.4, 4, CYLINDER_SEGMENTS),
  treeLeftLeaf: { rx: 2.3, ry: 1.1, rz: 1.5 }, // store radius in all axis since SphereGeometry only has one radius
  treeRightLeaf: { rx: 3, ry: 1.375, rz: 2.5 }, // store radius in all axis since SphereGeometry only has one radius
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
  createOakTree(5, new THREE.Vector3(0, 0, 0), new THREE.Euler(0, 0, 0));
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

/**
 * Create an oak tree with the given parameters and place it on the scene.
 *
 * @param {int} trunkHeight - Height of the trunk of the tree.
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

  const leftLeaf = new THREE.Mesh(new THREE.SphereGeometry(1, SPHERE_SEGMENTS), MATERIAL.treeLeaf);
  leftLeaf.position.set(
    leftBranchX * 2,
    trunkHeight + leftBranchY * 2 + GEOMETRY.treeLeftLeaf.ry / 2,
    0
  );
  leftLeaf.scale.set(GEOMETRY.treeLeftLeaf.rx, GEOMETRY.treeLeftLeaf.ry, GEOMETRY.treeLeftLeaf.rz);

  treeGroup.add(leftLeaf);

  const rightLeaf = new THREE.Mesh(new THREE.SphereGeometry(1, SPHERE_SEGMENTS), MATERIAL.treeLeaf);
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

/**
 * Create a THREE.Mesh with CylinderGeometry, on the given position and with the scaling
 * and rotation from the given profile (`name`).
 *
 * Automatically adds the created Mesh to the given parent.
 */
function createCylinderMesh({ name, x = 0, y = 0, z = 0, parent }) {
  const { r, h, rx = 0, ry = 0, rz = 0 } = GEOMETRY[name];
  const material = MATERIAL[name];

  // allows for smooth edges on small cylinders, while also preventing too many segments on smaller ones
  const radialSegments = THREE.MathUtils.clamp(Math.round(100 * r), 5, 35);

  const geometry = new THREE.CylinderGeometry(r, r, h, radialSegments);
  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.position.set(x, y, z);
  cylinder.rotation.set(rx, ry, rz);

  parent.add(cylinder);
  return cylinder;
}

/**
 * Create a THREE.Mesh with SphereGeometry, on the given position and with the scaling
 * and rotation from the given profile (`name`).
 *
 * Automatically adds the created Mesh to the given parent.
 */
function createSphereMesh({ name, x = 0, y = 0, z = 0, scale = [1, 1, 1], parent }) {
  const { r, rx = 0, ry = 0, rz = 0 } = GEOMETRY[name];
  const material = MATERIAL[name];

  // allows for smooth edges on small cylinders, while also preventing too many segments on smaller ones
  const radialSegments = THREE.MathUtils.clamp(Math.round(100 * r), 5, 35);

  const geometry = new THREE.CylinderGeometry(r, radialSegments, radialSegments);
  const sphere = new THREE.Mesh(geometry, material);
  sphere.position.set(x, y, z);
  sphere.rotation.set(rx, ry, rz);
  sphere.scale.set(...scale);

  parent.add(sphere);
  return sphere;
}
