//////////////////////
/* GLOBAL CONSTANTS */
//////////////////////
const MATERIAL = Object.freeze({
  chest: new THREE.MeshBasicMaterial({ color: 0xff4b3e }),
  back: new THREE.MeshBasicMaterial({ color: 0x101935 }),
  abdomen: new THREE.MeshBasicMaterial({ color: 0x564787 }),
  waist: new THREE.MeshBasicMaterial({ color: 0xb9e28c }),
  wheel: new THREE.MeshBasicMaterial({ color: 0x476a6f }),
  thigh: new THREE.MeshBasicMaterial({ color: 0xfffecb }),
  shank: new THREE.MeshBasicMaterial({ color: 0xff2e00 }),
  feet: new THREE.MeshBasicMaterial({ color: 0x6c9a8b }),
});

const GEOMETRY = Object.freeze({
  chest: { w: 5, h: 2, d: 2 },
  back: { w: 3, h: 2, d: 1 },
  abdomen: { w: 3, h: 1, d: 1 },
  waist: { w: 4, h: 1, d: 1 },
  wheel: { r: 0.75, h: 0.5 },
  wheelGap: 0.5,
  thigh: { w: 1, h: 1.5, d: 0.5 },
  legGap: 1,
  shank: { w: 1.5, h: 4.5, d: 1 },
  feet: { w: 1.5, h: 1, d: 2 },
});

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////
let renderer, scene;
let camera, controls; // TODO support multiple cameras

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
  'use strict';

  scene = new THREE.Scene();
  scene.add(new THREE.AxisHelper(20));

  createRobot();
}

function createRobot() {
  const robot = createGroup({ y: 8, parent: scene });
  const chest = createBoxMesh({
    ...GEOMETRY.chest,
    material: MATERIAL.chest,
    anchor: [0, 1, 0],
    parent: robot,
  });
  const back = createBoxMesh({
    ...GEOMETRY.back,
    material: MATERIAL.back,
    z: GEOMETRY.chest.h / 2,
    anchor: [0, 1, 1],
    parent: robot,
  });

  const abdomenGroup = createGroup({ y: -GEOMETRY.abdomen.h, parent: robot });
  const abdomen = createBoxMesh({
    ...GEOMETRY.abdomen,
    material: MATERIAL.abdomen,
    anchor: [0, 1, -1],
    parent: abdomenGroup,
  });

  const waistGroup = createGroup({ y: -GEOMETRY.waist.h, parent: abdomenGroup });
  const waist = createBoxMesh({
    ...GEOMETRY.waist,
    material: MATERIAL.waist,
    anchor: [0, 1, -1],
    parent: waistGroup,
  });
  createLowerLimbs(waistGroup, false);
  buildSymetric(createLowerLimbs, waistGroup);
}

function createLowerLimbs(waistGroup) {
  const waistWheel = createCylinderMesh({
    ...GEOMETRY.wheel,
    material: MATERIAL.wheel,
    rz: Math.PI / 2,
    x: GEOMETRY.wheel.h / 2 + GEOMETRY.waist.w / 2,
    parent: group,
  });

  // TODO add legs' degree of movement
  const lowerLimbsGroup = createGroup({
    x: GEOMETRY.legGap / 2,
    y: -GEOMETRY.thigh.h,
    parent: group,
  });
  const thigh = createBoxMesh({
    ...GEOMETRY.thigh,
    material: MATERIAL.thigh,
    anchor: [1, 1, -1],
    parent: lowerLimbsGroup,
  });

  const shankGroup = createGroup({
    y: -GEOMETRY.shank.h,
    parent: lowerLimbsGroup,
  });
  const shank = createBoxMesh({
    ...GEOMETRY.shank,
    material: MATERIAL.shank,
    anchor: [1, 1, 0],
    parent: shankGroup,
  });

  // TODO add feet's degree of movement
  const foot = createBoxMesh({
    ...GEOMETRY.feet,
    material: MATERIAL.feet,
    z: -GEOMETRY.shank.d / 2,
    anchor: [1, 1, -1],
    parent: shankGroup,
  });

  const middleWheel = createCylinderMesh({
    ...GEOMETRY.wheel,
    material: MATERIAL.wheel,
    rz: Math.PI / 2,
    x: GEOMETRY.shank.w + GEOMETRY.wheel.h / 2,
    y: 3 * GEOMETRY.wheel.r + GEOMETRY.wheelGap,
    z: -GEOMETRY.shank.d / 2,
    parent: shankGroup,
  });

  const rearWheel = createCylinderMesh({
    ...GEOMETRY.wheel,
    material: MATERIAL.wheel,
    rz: Math.PI / 2,
    x: GEOMETRY.shank.w + GEOMETRY.wheel.h / 2,
    y: GEOMETRY.wheel.r,
    z: -GEOMETRY.shank.d / 2,
    parent: shankGroup,
  });
}

function createUpperLimbs() {
  // TODO
}

function createHead() {
  // TODO
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createCameras() {
  'use strict';

  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 1, 1000);

  controls = new THREE.OrbitControls(camera, renderer.domElement);

  camera.position.x = 0;
  camera.position.y = 10;
  camera.position.z = -20;

  //camera.lookAt(scene.position);
  camera.lookAt(0, 8, 0);

  //controls.target.set(0, 0, 0);
  controls.update();
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////

//////////////////////
/* CHECK COLLISIONS */
//////////////////////
function checkCollisions() {
  'use strict';
}

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////
function handleCollisions() {
  'use strict';
}

////////////
/* UPDATE */
////////////
function update() {
  'use strict';
}

/////////////
/* DISPLAY */
/////////////
function render() {
  'use strict';
  renderer.render(scene, camera);
}

////////////////////////////////
/* INITIALIZE ANIMATION CYCLE */
////////////////////////////////
function init() {
  'use strict';

  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  createScene();
  createCameras();

  render();

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('resize', onResize);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate() {
  'use strict';

  render();

  requestAnimationFrame(animate);
}

////////////////////////////
/* RESIZE WINDOW CALLBACK */
////////////////////////////
function onResize() {
  'use strict';

  renderer.setSize(window.innerWidth, window.innerHeight);

  if (window.innerHeight > 0 && window.innerWidth > 0) {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }
}

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
function onKeyDown(e) {
  'use strict';
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) {
  'use strict';
}

///////////////
/* UTILITIES */
///////////////
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

function createBoxMesh({ w, h, d, material, x = 0, y = 0, z = 0, anchor = [0, 0, 0], parent }) {
  const geometry = new THREE.BoxGeometry(w, h, d);
  const box = new THREE.Mesh(geometry, material);
  box.position.set(x + (anchor[0] * w) / 2, y + (anchor[1] * h) / 2, z + (anchor[2] * d) / 2);

  parent.add(box);
  return box;
}

function createCylinderMesh({
  r,
  h,
  material,
  x = 0,
  y = 0,
  z = 0,
  rx = 0,
  ry = 0,
  rz = 0,
  anchor = [0, 0, 0],
  parent,
}) {
  const geometry = new THREE.CylinderGeometry(r, r, h, 35);
  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.position.set(x + anchor[0] * r, y + (anchor[1] * h) / 2, z + anchor[2] * r);
  cylinder.rotation.set(rx, ry, rz);

  parent.add(cylinder);
  return cylinder;
}

function buildSymetric(func, group) {
  return func(createGroup({ scale: [-1, 1, 1], parent: group }));
}
