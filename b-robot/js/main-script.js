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
  arm: new THREE.MeshBasicMaterial({ color: 0x0f8b8d }),
  forearm: new THREE.MeshBasicMaterial({ color: 0x336699 }),
  exhaust: new THREE.MeshBasicMaterial({ color: 0xdad2d8 }),
  head: new THREE.MeshBasicMaterial({ color: 0x9ec1a3 }),
  eye: new THREE.MeshBasicMaterial({ color: 0x904e55 }),
  antenna: new THREE.MeshBasicMaterial({ color: 0x6320ee }),

  trailerContainer: new THREE.MeshBasicMaterial({ color: 0x255c99 }),
  trailerConnector: new THREE.MeshBasicMaterial({ color: 0xccad8f }),
  trailerWheelSupport: new THREE.MeshBasicMaterial({ color: 0x654321 }),
});

// box: w = width (X axis), h = height (Y axis), d = depth (Z axis)
// cylinder: r = radius, rx = rotation on X axis, etc.
const GEOMETRY = Object.freeze({
  chest: { w: 5, h: 2, d: 2 },
  back: { w: 3, h: 2, d: 1 },
  abdomen: { w: 3, h: 1, d: 1 },
  waist: { w: 4, h: 1, d: 1 },
  wheel: { r: 0.75, h: 0.5, rz: Math.PI / 2 },
  wheelGap: 0.5,
  thigh: { w: 1, h: 1.5, d: 0.5 },
  legGap: 1,
  shank: { w: 1.5, h: 4.5, d: 1 },
  feet: { w: 1.5, h: 1, d: 2 },
  arm: { w: 1, h: 2, d: 1 },
  forearm: { w: 1, h: 1, d: 3 },
  exhaust: { r: 0.125, h: 2 },
  head: { w: 1, h: 1, d: 1 },
  eye: { r: 0.1, h: 0.1, rx: -Math.PI / 2 },
  eyeGap: 0.2,
  antenna: { r: 0.1, h: 0.5 },
  antennaGap: 0.2,
  foreheadHeight: 0.2,

  trailerContainer: { w: 5, h: 5, d: 12 },
  trailerConnector: { r: 0.25, h: 0.5 },
  trailerConnectorDepth: 1.5,
  trailerWheelSupport: { w: 4, h: 1, d: 4.5 },
  trailerWheelGap: 0.5,
  initialTrailerOffset: 5,
});

const BACKGROUND = new THREE.Color(0xc0e8ee);

const CAMERA_GEOMETRY = Object.freeze({
  orthogonalUsableAreaHeight:
    GEOMETRY.shank.h +
    GEOMETRY.thigh.h +
    GEOMETRY.waist.h +
    GEOMETRY.abdomen.h +
    GEOMETRY.chest.h +
    GEOMETRY.head.h +
    GEOMETRY.antenna.h,
  orthogonalSafetyGap: 2,
  orthogonalDistance: 10,
  perspectiveFov: 80,
});

const DEGREES_OF_FREEDOM = Object.freeze({
  feet: { min: -Math.PI / 2, max: Math.PI / 2 },
  waist: { min: -Math.PI / 2, max: Math.PI / 2 },
  head: { min: -Math.PI, max: Math.PI },
});

const ROTATION_STEPS = 8;
const DELTA = Object.freeze({
  feet: { x: Math.PI / 2 / ROTATION_STEPS, y: 0, z: 0 },
  waist: { x: Math.PI / 2 / ROTATION_STEPS, y: 0, z: 0 },
  head: { x: Math.PI / ROTATION_STEPS, y: 0, z: 0 },
  // TODO: upper members
});

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////
let renderer, scene;
let activeCamera;

const cameras = {
  // front view
  front: createOrthogonalCamera({
    z: -CAMERA_GEOMETRY.orthogonalDistance,
    height: CAMERA_GEOMETRY.orthogonalUsableAreaHeight + CAMERA_GEOMETRY.orthogonalSafetyGap * 2,
    offsetY: CAMERA_GEOMETRY.orthogonalUsableAreaHeight / 2,
  }),
  // side view
  side: createOrthogonalCamera({
    x: -CAMERA_GEOMETRY.orthogonalDistance,
    height: CAMERA_GEOMETRY.orthogonalUsableAreaHeight + CAMERA_GEOMETRY.orthogonalSafetyGap * 2,
    offsetY: CAMERA_GEOMETRY.orthogonalUsableAreaHeight / 2,
  }),
  // top view
  top: createOrthogonalCamera({
    y: CAMERA_GEOMETRY.orthogonalUsableAreaHeight + CAMERA_GEOMETRY.orthogonalSafetyGap,
    height: CAMERA_GEOMETRY.orthogonalDistance,
  }),
  // orthogonal projection: isometric view
  orthogonal: createOrthogonalCamera({
    x: -10,
    y: 20,
    z: -10,
    height: CAMERA_GEOMETRY.orthogonalUsableAreaHeight + CAMERA_GEOMETRY.orthogonalSafetyGap * 2,
    offsetY: CAMERA_GEOMETRY.orthogonalUsableAreaHeight / 3,
  }),
  // perspective projection: isometric view
  perspective: createPerspectiveCamera({ x: -10, y: 20, z: -10 }),
  // TODO: remove, for debug only
  perspectiveWithOrbitalControls: createPerspectiveCamera({ x: -10, y: 20, z: -10 }),
};

let bodyElements = {};

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
  'use strict';

  scene = new THREE.Scene();
  scene.add(new THREE.AxisHelper(20));
  scene.background = BACKGROUND;

  createRobot();
  createTrailer();
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createCameras() {
  'use strict';

  // set the initial camera
  activeCamera = cameras.front;

  const controls = new THREE.OrbitControls(
    cameras.perspectiveWithOrbitalControls.camera,
    renderer.domElement
  );

  controls.target.set(0, 0, 0);
  controls.update();
}

function createOrthogonalCamera({ x = 0, y = 0, z = 0, height, offsetX = 0, offsetY = 0 }) {
  const getCameraParameters = () => {
    const aspectRatio = window.innerWidth / window.innerHeight;
    const width = height * aspectRatio;

    const top = height / 2 + offsetY;
    const bottom = -height / 2 + offsetY;
    const left = -width / 2 + offsetX;
    const right = width / 2 + offsetX;

    return { top, bottom, left, right };
  };

  const { top, bottom, left, right } = getCameraParameters();

  const camera = new THREE.OrthographicCamera(left, right, top, bottom, 1, 1000);
  camera.position.set(x, y, z);
  camera.lookAt(0, 0, 0);

  return { getCameraParameters, camera };
}

function createPerspectiveCamera({ x = 0, y = 0, z = 0 }) {
  const getCameraParameters = () => {
    return { aspect: window.innerWidth / window.innerHeight };
  };

  const { aspect } = getCameraParameters();

  const camera = new THREE.PerspectiveCamera(CAMERA_GEOMETRY.perspectiveFov, aspect, 1, 1000);
  camera.position.set(x, y, z);
  camera.lookAt(0, CAMERA_GEOMETRY.orthogonalUsableAreaHeight / 2, 0);

  return { getCameraParameters, camera };
}

function refreshCameraParameters({ getCameraParameters, camera }) {
  const parameters = getCameraParameters();

  Object.assign(camera, parameters);
  camera.updateProjectionMatrix();
}

/////////////////////
/* CREATE LIGHT(S) */
/////////////////////

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////
function createRobot() {
  const chestHeight = GEOMETRY.shank.h + GEOMETRY.thigh.h + GEOMETRY.waist.h + GEOMETRY.abdomen.h;
  const robot = createGroup({ name: 'robot', y: chestHeight, parent: scene });
  createBoxMesh({
    name: 'chest',
    anchor: [0, 1, 0],
    parent: robot,
  });
  createBoxMesh({
    name: 'back',
    z: GEOMETRY.chest.h / 2,
    anchor: [0, 1, 1],
    parent: robot,
  });

  const abdomenGroup = createGroup({ name: 'abdomen', y: -GEOMETRY.abdomen.h, parent: robot });
  createBoxMesh({
    name: 'abdomen',
    anchor: [0, 1, -1],
    parent: abdomenGroup,
  });

  const waistGroup = createGroup({ name: 'waist', y: -GEOMETRY.waist.h, parent: abdomenGroup });
  createBoxMesh({
    name: 'waist',
    anchor: [0, 1, -1],
    parent: waistGroup,
  });
  createRightLowerLimb(waistGroup);
  buildSymmetric(createRightLowerLimb, waistGroup);

  createRightUpperLimb(robot);
  buildSymmetric(createRightUpperLimb, robot);

  // TODO add head's degree of movement
  const headGroup = createGroup({ name: 'head', y: GEOMETRY.chest.h, parent: robot });

  createBoxMesh({
    name: 'head',
    anchor: [0, 1, 0],
    parent: headGroup,
  });
  createRightHeadElements(headGroup);
  buildSymmetric(createRightHeadElements, headGroup);
}

function createRightLowerLimb(waistGroup) {
  // front wheel (on the waist)
  createCylinderMesh({
    name: 'wheel',
    x: GEOMETRY.wheel.h / 2 + GEOMETRY.waist.w / 2,
    parent: waistGroup,
  });

  // TODO add legs' degree of movement
  const lowerLimbsGroup = createGroup({
    name: 'lowerLimbs',
    x: GEOMETRY.legGap / 2,
    y: -GEOMETRY.thigh.h,
    parent: waistGroup,
  });
  createBoxMesh({
    name: 'thigh',
    anchor: [1, 1, -1],
    parent: lowerLimbsGroup,
  });

  const shankGroup = createGroup({
    name: 'shank',
    y: -GEOMETRY.shank.h,
    parent: lowerLimbsGroup,
  });
  createBoxMesh({
    name: 'shank',
    anchor: [1, 1, 0],
    parent: shankGroup,
  });

  // TODO add feet's degree of movement
  createBoxMesh({
    name: 'feet',
    z: -GEOMETRY.shank.d / 2,
    anchor: [1, 1, -1],
    parent: shankGroup,
  });

  // middle wheel (on the shank)
  createCylinderMesh({
    name: 'wheel',
    x: GEOMETRY.shank.w + GEOMETRY.wheel.h / 2,
    y: 3 * GEOMETRY.wheel.r + GEOMETRY.wheelGap,
    z: -GEOMETRY.shank.d / 2,
    parent: shankGroup,
  });

  // rear wheel (on the shank)
  createCylinderMesh({
    name: 'wheel',
    x: GEOMETRY.shank.w + GEOMETRY.wheel.h / 2,
    y: GEOMETRY.wheel.r,
    z: -GEOMETRY.shank.d / 2,
    parent: shankGroup,
  });
}

function createRightUpperLimb(chestGroup) {
  // TODO add arms' degree of movement
  const armGroup = createGroup({
    name: 'arm',
    x: GEOMETRY.chest.w / 2,
    y: GEOMETRY.chest.h,
    z: GEOMETRY.chest.d / 2,
    parent: chestGroup,
  });

  createBoxMesh({
    name: 'arm',
    anchor: [1, -1, 1],
    parent: armGroup,
  });
  createBoxMesh({
    name: 'forearm',
    anchor: [1, -1, -1],
    y: -GEOMETRY.arm.h,
    z: GEOMETRY.arm.d,
    parent: armGroup,
  });
  createCylinderMesh({
    name: 'exhaust',
    x: GEOMETRY.arm.w + GEOMETRY.exhaust.r,
    z: GEOMETRY.arm.d / 2,
    parent: armGroup,
  });
}

function createRightHeadElements(headGroup) {
  createCylinderMesh({
    name: 'eye',
    x: GEOMETRY.eyeGap / 2 + GEOMETRY.eye.r,
    y: GEOMETRY.head.h - GEOMETRY.foreheadHeight - GEOMETRY.eye.r,
    z: -GEOMETRY.head.h / 2 - GEOMETRY.eye.h / 2,
    parent: headGroup,
  });

  createCylinderMesh({
    name: 'antenna',
    x: GEOMETRY.antennaGap / 2 + GEOMETRY.antenna.r,
    y: GEOMETRY.head.h + GEOMETRY.antenna.h / 2,
    parent: headGroup,
  });
}

//////////////////////

function createTrailer() {
  const containerHeight = GEOMETRY.wheel.r + GEOMETRY.trailerWheelSupport.h;
  const trailer = createGroup({
    y: containerHeight,
    z: GEOMETRY.initialTrailerOffset,
    parent: scene,
  });
  createBoxMesh({
    name: 'trailerContainer',
    anchor: [0, 1, 1],
    parent: trailer,
  });

  createCylinderMesh({
    name: 'trailerConnector',
    y: -GEOMETRY.trailerConnector.h / 2,
    z: GEOMETRY.trailerConnectorDepth + GEOMETRY.trailerConnector.r / 2,
    parent: trailer,
  });

  const wheelSupportGroup = createGroup({
    y: -GEOMETRY.trailerWheelSupport.h,
    z: GEOMETRY.trailerContainer.d - GEOMETRY.trailerWheelSupport.d / 2,
    parent: trailer,
  });
  createBoxMesh({
    name: 'trailerWheelSupport',
    anchor: [0, 1, 0],
    parent: wheelSupportGroup,
  });

  createRightTrailerWheels(wheelSupportGroup);
  buildSymmetric(createRightTrailerWheels, wheelSupportGroup);
}

function createRightTrailerWheels(wheelSupportGroup) {
  const wheelsGroup = createGroup({
    x: GEOMETRY.trailerWheelSupport.w / 2 + GEOMETRY.wheel.h / 2,
    parent: wheelSupportGroup,
  });
  createCylinderMesh({
    name: 'wheel',
    z: -(GEOMETRY.wheel.r + GEOMETRY.trailerWheelGap / 2),
    parent: wheelsGroup,
  });
  createCylinderMesh({
    name: 'wheel',
    z: GEOMETRY.wheel.r + GEOMETRY.trailerWheelGap / 2,
    parent: wheelsGroup,
  });
}

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
  renderer.render(scene, activeCamera.camera);
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
    refreshCameraParameters(activeCamera);
  }
}

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
const keyDownHandlers = {
  // TODO: remove; for debug only
  Digit0: changeActiveCameraHandleFactory(cameras.perspectiveWithOrbitalControls),
  Digit1: changeActiveCameraHandleFactory(cameras.front),
  Digit2: changeActiveCameraHandleFactory(cameras.side),
  Digit3: changeActiveCameraHandleFactory(cameras.top),
  Digit4: changeActiveCameraHandleFactory(cameras.orthogonal),
  Digit5: changeActiveCameraHandleFactory(cameras.perspective),
  Digit6: wireframeToggleHandle,
  // feet
  KeyQ: rotateBodyPartHandleFactory({ bodyPart: 'feet', axis: 'x', direction: 'positive' }),
  KeyA: rotateBodyPartHandleFactory({ bodyPart: 'feet', axis: 'x', direction: 'negative' }),
  // waist
  KeyW: rotateBodyPartHandleFactory({ bodyPart: 'waist', axis: 'x', direction: 'positive' }),
  KeyS: rotateBodyPartHandleFactory({ bodyPart: 'waist', axis: 'x', direction: 'negative' }),
  // head
  KeyR: rotateBodyPartHandleFactory({ bodyPart: 'head', axis: 'x', direction: 'positive' }),
  KeyF: rotateBodyPartHandleFactory({ bodyPart: 'head', axis: 'x', direction: 'negative' }),
  // TODO: upper members
};

function onKeyDown(event) {
  'use strict';

  let { code } = event;

  // Treat numpad digits like the number row
  if (/^Numpad\d$/.test(code)) {
    code = code.replace('Numpad', 'Digit');
  }

  keyDownHandlers[code]?.(event);
}

function wireframeToggleHandle(_event) {
  Object.values(MATERIAL).forEach((material) => (material.wireframe = !material.wireframe));
}

function changeActiveCameraHandleFactory(cameraDescriptor) {
  return (_event) => {
    refreshCameraParameters(cameraDescriptor);
    activeCamera = cameraDescriptor;
  };
}

function rotateBodyPartHandleFactory({ bodyPart, axis, direction }) {
  return (event) => {
    let delta = DELTA[bodyPart][axis];
    delta = direction === 'positive' ? delta : -delta;
    const { min, max } = DEGREES_OF_FREEDOM[bodyPart];
    const currentRotation = bodyElements[bodyPart].rotation[axis];

    bodyElements[bodyPart].rotation[axis] = THREE.MathUtils.clamp(
      currentRotation + delta,
      min,
      max
    );
  };
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
function createGroup({ name, x = 0, y = 0, z = 0, scale = [1, 1, 1], parent }) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, y, z);
  group.scale.set(...scale);

  bodyElements[group.name] = group;
  if (parent) {
    parent.add(group);
  } else {
    scene.add(group);
  }

  return group;
}

function createBoxMesh({ name, x = 0, y = 0, z = 0, anchor = [0, 0, 0], parent }) {
  const { w, h, d } = GEOMETRY[name];
  const material = MATERIAL[name];
  const geometry = new THREE.BoxGeometry(w, h, d);
  const box = new THREE.Mesh(geometry, material);
  box.position.set(x + (anchor[0] * w) / 2, y + (anchor[1] * h) / 2, z + (anchor[2] * d) / 2);

  parent.add(box);
  return box;
}

function createCylinderMesh({ name, x = 0, y = 0, z = 0, parent }) {
  const { r, h, rx = 0, ry = 0, rz = 0 } = GEOMETRY[name];
  const material = MATERIAL[name];
  const radialSegments = 35; // allows for smooth edges
  const geometry = new THREE.CylinderGeometry(r, r, h, radialSegments);
  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.position.set(x, y, z);
  cylinder.rotation.set(rx, ry, rz);

  parent.add(cylinder);
  return cylinder;
}

function buildSymmetric(builder, parent) {
  return builder(createGroup({ name: parent.name, scale: [-1, 1, 1], parent }));
}
