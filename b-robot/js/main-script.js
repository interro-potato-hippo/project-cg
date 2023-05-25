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
  robotAabb: [new THREE.Vector3(-7, -13, -7), new THREE.Vector3(7, 10, 15)],
  trailerAabb: [new THREE.Vector3(-7, -5, -5), new THREE.Vector3(7, 10, 20)],
  orthogonalUsableAreaHeight:
    GEOMETRY.shank.h +
    GEOMETRY.thigh.h +
    GEOMETRY.waist.h +
    GEOMETRY.abdomen.h +
    GEOMETRY.chest.h +
    GEOMETRY.head.h +
    GEOMETRY.antenna.h,
  orthogonalSafetyGap: 2,
  orthogonalDistance: 500,
  perspectiveFov: 80,
});

const DEGREES_OF_FREEDOM = Object.freeze({
  feet: { min: -Math.PI / 2, max: 0, axis: 'x' },
  lowerLimbs: { min: -Math.PI / 2, max: 0, axis: 'x' },
  head: { min: 0, max: Math.PI, axis: 'x' },
  arms: { min: GEOMETRY.chest.w / 2 - GEOMETRY.arm.w, max: GEOMETRY.chest.w / 2, axis: 'x' },
});

const MOVEMENT_TIME = 700; // milliseconds
const TRAILER_MOVEMENT_SPEED = 100; // units/second
const DELTA = Object.freeze(
  Object.fromEntries([
    // automatically generate DELTAs for parts with defined degrees of freedom
    ...Object.entries(DEGREES_OF_FREEDOM).map(([key, { min, max, axis }]) => {
      const val = (max - min) / MOVEMENT_TIME;

      return [key, new THREE.Vector3(0, 0, 0).setComponent(['x', 'y', 'z'].indexOf(axis), val)];
    }),

    // DELTAs for parts without defined degrees of freedom
    ['trailerX', new THREE.Vector3(TRAILER_MOVEMENT_SPEED / 1000, 0, 0)],
    ['trailerZ', new THREE.Vector3(0, 0, TRAILER_MOVEMENT_SPEED / 1000)],
  ])
);

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////
let renderer, scene;
let activeCamera;
let prevTimestamp;

const dynamicElements = {};

const cameras = {
  // front view
  front: createOrthogonalCamera({
    bottomAxisPerpendicularVector: new THREE.Vector3(-1, 0, 0), // X axis
    sideAxisPerpendicularVector: new THREE.Vector3(0, 1, 0), // Y axis
    z: -CAMERA_GEOMETRY.orthogonalDistance,
  }),
  // side view
  side: createOrthogonalCamera({
    bottomAxisPerpendicularVector: new THREE.Vector3(0, 0, 1), // Z axis
    sideAxisPerpendicularVector: new THREE.Vector3(0, 1, 0), // Y axis
    x: -CAMERA_GEOMETRY.orthogonalDistance,
  }),
  // top view
  top: createOrthogonalCamera({
    bottomAxisPerpendicularVector: new THREE.Vector3(1, 0, 0), // X axis
    sideAxisPerpendicularVector: new THREE.Vector3(0, 0, -1), // Z axis
    mirrorView: true,
    y: CAMERA_GEOMETRY.orthogonalDistance
  }),
  // orthogonal projection: isometric view
  orthogonal: createOrthogonalCamera({
    bottomAxisPerpendicularVector: new THREE.Vector3(-1, 0, -1).normalize(),
    sideAxisPerpendicularVector: new THREE.Vector3(0, 1, 0), // Y axis
    x: CAMERA_GEOMETRY.orthogonalDistance,
    y: 30,
    z: -CAMERA_GEOMETRY.orthogonalDistance,
  }),
  /*
  // perspective projection: isometric view
  perspective: createPerspectiveCamera({ x: -10, y: 20, z: -10 }),
  */
  // TODO: remove, for debug only
  perspectiveWithOrbitalControls: createPerspectiveCamera({ x: -10, y: 20, z: -10 }),
};

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
let minPoint, maxPoint; // TODO debug; remove later
function createScene() {
  'use strict';

  scene = new THREE.Scene();
  scene.add(new THREE.AxisHelper(20));
  scene.background = BACKGROUND;

  createRobot();
  createTrailer();

  // TODO debug; remove later
  const geometry = new THREE.BoxGeometry();
  minPoint = new THREE.Mesh(geometry, MATERIAL.chest);
  maxPoint = new THREE.Mesh(geometry, MATERIAL.arm);
  scene.add(minPoint);
  scene.add(maxPoint);
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createCameras() {
  'use strict';

  // set the initial camera
  activeCamera = cameras.front;

  Object.values(cameras).forEach(refreshCameraParameters);

  const controls = new THREE.OrbitControls(
    cameras.perspectiveWithOrbitalControls.camera,
    renderer.domElement
  );

  controls.target.set(0, 0, 0);
  controls.update();
}

function getVisibleAreaBoundingBox() {
  const { robot, trailer } = dynamicElements;

  return {
    min: robot.position
      .clone()
      .add(CAMERA_GEOMETRY.robotAabb[0])
      .min(trailer.position.clone().add(CAMERA_GEOMETRY.trailerAabb[0])),
    max: robot.position
      .clone()
      .add(CAMERA_GEOMETRY.robotAabb[1])
      .max(trailer.position.clone().add(CAMERA_GEOMETRY.trailerAabb[1])),
  };
}

function createOrthogonalCamera({
  bottomAxisPerpendicularVector,
  sideAxisPerpendicularVector,
  x = 0,
  y = 0,
  z = 0,
  mirrorView = false,
}) {
  const getCameraParameters = () => {
    if (!dynamicElements.robot) {
      return { top: 1, bottom: 1, left: 1, right: 1 }; // FIXME
    }

    const { min, max } = getVisibleAreaBoundingBox();

    const maxLeft = bottomAxisPerpendicularVector.dot(max);
    const minRight = bottomAxisPerpendicularVector.dot(min);
    const minTop = sideAxisPerpendicularVector.dot(max);
    const maxBottom = sideAxisPerpendicularVector.dot(min);

    const minWidth = Math.abs(minRight - maxLeft);
    const minHeight = Math.abs(minTop - maxBottom);
    const offsetX = (minRight + maxLeft) / 2;
    const offsetY = (minTop + maxBottom) / 2;

    const aspectRatio = window.innerWidth / window.innerHeight;
    let height = minHeight;
    let width = height * aspectRatio;

    if (width < minWidth) {
      width = minWidth;
      height = width / aspectRatio;
    }

    // correctly orient top-down camera
    if (mirrorView) {
      height = -height;
      width = -width;
    }

    const top = height / 2 + offsetY;
    const bottom = -height / 2 + offsetY;
    const left = -width / 2 + offsetX;
    const right = width / 2 + offsetX;

    return { top, bottom, left, right };
  };

  const { top, bottom, left, right, position } = getCameraParameters();

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

/**
 * Given a camera descriptor, calls the `getCameraParameters` function
 * to get the attributes to override on the THREE.Camera object.
 * This function is given by the camera descriptor, from the `createOrthogonalCamera`
 * or the `createPerspectiveCamera` functions.
 *
 * Finally, updates the projection matrix of the camera.
 */
function refreshCameraParameters({ getCameraParameters, camera }) {
  const parameters = getCameraParameters();

  Object.assign(camera, parameters);
  camera.updateProjectionMatrix();
}

////////////////////////
/* CREATE OBJECT3D(S) */
////////////////////////
function createRobot() {
  const chestHeight = GEOMETRY.shank.h + GEOMETRY.thigh.h + GEOMETRY.waist.h + GEOMETRY.abdomen.h;
  const robot = createGroup({ y: chestHeight, parent: scene });
  dynamicElements.robot = robot;

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

  const abdomenGroup = createGroup({ y: -GEOMETRY.abdomen.h, parent: robot });
  createBoxMesh({
    name: 'abdomen',
    anchor: [0, 1, -1],
    parent: abdomenGroup,
  });

  const waistGroup = createGroup({ y: -GEOMETRY.waist.h, parent: abdomenGroup });
  createBoxMesh({
    name: 'waist',
    anchor: [0, 1, -1],
    parent: waistGroup,
  });
  const { lowerLimb: rightLowerLimb, feet: rightFoot } = createRightLowerLimb(waistGroup);
  const { lowerLimb: leftLowerLimb, feet: leftFoot } = buildSymmetricX(
    createRightLowerLimb,
    waistGroup
  );
  dynamicElements.rightLowerLimb = rightLowerLimb;
  dynamicElements.rightFoot = rightFoot;
  dynamicElements.leftLowerLimb = leftLowerLimb;
  dynamicElements.leftFoot = leftFoot;

  const { arm: rightArm } = createRightUpperLimb(robot);
  const { arm: leftArm } = buildSymmetricX(createRightUpperLimb, robot);
  dynamicElements.rightArm = rightArm;
  dynamicElements.leftArm = leftArm;

  const headGroup = createGroup({ y: GEOMETRY.chest.h, parent: robot });
  dynamicElements.head = headGroup;

  createBoxMesh({
    name: 'head',
    anchor: [0, 1, 0],
    parent: headGroup,
  });
  createRightHeadElements(headGroup);
  buildSymmetricX(createRightHeadElements, headGroup);
}

function createRightLowerLimb(waistGroup) {
  // front wheel (on the waist)
  createCylinderMesh({
    name: 'wheel',
    x: GEOMETRY.wheel.h / 2 + GEOMETRY.waist.w / 2,
    parent: waistGroup,
  });

  const lowerLimbsGroup = createGroup({
    y: GEOMETRY.thigh.d / 2,
    z: -GEOMETRY.thigh.d / 2,
    parent: waistGroup,
  });
  const rotatedLowerLimbsGroup = createGroup({
    x: GEOMETRY.legGap / 2,
    y: -GEOMETRY.thigh.d / 2 - GEOMETRY.thigh.h,
    z: GEOMETRY.thigh.d / 2,
    parent: lowerLimbsGroup,
  });
  createBoxMesh({
    name: 'thigh',
    anchor: [1, 1, -1],
    parent: rotatedLowerLimbsGroup,
  });

  const shankGroup = createGroup({
    y: -GEOMETRY.shank.h,
    parent: rotatedLowerLimbsGroup,
  });
  createBoxMesh({
    name: 'shank',
    anchor: [1, 1, 0],
    parent: shankGroup,
  });

  const feetGroup = createGroup({
    y: GEOMETRY.feet.h / 2,
    parent: shankGroup,
  });
  createBoxMesh({
    name: 'feet',
    z: -GEOMETRY.shank.d / 2,
    anchor: [1, 0, -1],
    parent: feetGroup,
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

  return { lowerLimb: lowerLimbsGroup, feet: feetGroup };
}

function createRightUpperLimb(chestGroup) {
  const armGroup = createGroup({
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

  return { arm: armGroup };
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
  const containerHeight = GEOMETRY.shank.h + GEOMETRY.thigh.h + GEOMETRY.trailerWheelSupport.h;
  const trailer = createGroup({
    y: containerHeight,
    z: GEOMETRY.initialTrailerOffset,
    parent: scene,
  });
  dynamicElements.trailer = trailer;

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
  buildSymmetricX(createRightTrailerWheels, wheelSupportGroup);
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
function update(timeDelta) {
  rotateDynamicPart(timeDelta, { part: 'rightFoot', profile: 'feet' });
  rotateDynamicPart(timeDelta, { part: 'leftFoot', profile: 'feet' });
  rotateDynamicPart(timeDelta, { part: 'rightLowerLimb', profile: 'lowerLimbs' });
  rotateDynamicPart(timeDelta, { part: 'leftLowerLimb', profile: 'lowerLimbs' });
  rotateDynamicPart(timeDelta, { part: 'head', profile: 'head' });
  moveDynamicPart(timeDelta, { part: 'rightArm', profile: 'arms' });
  moveDynamicPart(timeDelta, { part: 'leftArm', profile: 'arms' });

  // this allows movement along individual axes
  moveDynamicPart(timeDelta, { part: 'trailer', profile: 'trailerX' });
  moveDynamicPart(timeDelta, { part: 'trailer', profile: 'trailerZ' });

  // refresh camera to adjust to objects' position
  refreshCameraParameters(activeCamera);

  const { min, max } = getVisibleAreaBoundingBox();

  minPoint.position.copy(min);
  maxPoint.position.copy(max);
}

function rotateDynamicPart(timeDelta, { part, profile }) {
  const group = dynamicElements[part];
  if (!group.userData?.delta) {
    return;
  }

  const props = DEGREES_OF_FREEDOM[profile];

  const delta = group.userData.delta.clone().multiply(DELTA[profile]).multiplyScalar(timeDelta);

  group.rotation.fromArray(
    ['x', 'y', 'z'].map((axis) => {
      const newValue = group.rotation[axis] + delta[axis];
      if (props?.axis === axis) {
        return THREE.Math.clamp(newValue, props.min, props.max);
      }
      return newValue;
    })
  );
}

function moveDynamicPart(timeDelta, { part, profile }) {
  const group = dynamicElements[part];
  if (!group.userData?.delta) {
    return;
  }

  const props = DEGREES_OF_FREEDOM[profile];

  const delta = group.userData.delta.clone().multiply(DELTA[profile]).multiplyScalar(timeDelta);

  group.position.fromArray(
    ['x', 'y', 'z'].map((axis) => {
      const newValue = group.position[axis] + delta[axis];
      if (props?.axis === axis) {
        return THREE.Math.clamp(newValue, props.min, props.max);
      }
      return newValue;
    })
  );
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
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('resize', onResize);
}

/////////////////////
/* ANIMATION CYCLE */
/////////////////////
function animate(timestamp) {
  const timeDelta = timestamp - prevTimestamp;

  update(timeDelta);

  render();

  prevTimestamp = timestamp;
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
const keyHandlers = {
  // TODO: remove; for debug only
  Digit0: changeActiveCameraHandleFactory(cameras.perspectiveWithOrbitalControls),
  Digit1: changeActiveCameraHandleFactory(cameras.front),
  Digit2: changeActiveCameraHandleFactory(cameras.side),
  Digit3: changeActiveCameraHandleFactory(cameras.top),
  Digit4: changeActiveCameraHandleFactory(cameras.orthogonal),
  Digit5: changeActiveCameraHandleFactory(cameras.perspective),
  Digit6: wireframeToggleHandle,
  // feet
  KeyQ: transformDynamicPartHandleFactory({
    parts: ['rightFoot', 'leftFoot'],
    axis: 'x',
    direction: 1,
  }),
  KeyA: transformDynamicPartHandleFactory({
    parts: ['rightFoot', 'leftFoot'],
    axis: 'x',
    direction: -1,
  }),
  // waist
  KeyW: transformDynamicPartHandleFactory({
    parts: ['rightLowerLimb', 'leftLowerLimb'],
    axis: 'x',
    direction: 1,
  }),
  KeyS: transformDynamicPartHandleFactory({
    parts: ['rightLowerLimb', 'leftLowerLimb'],
    axis: 'x',
    direction: -1,
  }),
  // arms
  KeyE: transformDynamicPartHandleFactory({
    parts: ['rightArm', 'leftArm'],
    axis: 'x',
    direction: 1,
  }),
  KeyD: transformDynamicPartHandleFactory({
    parts: ['rightArm', 'leftArm'],
    axis: 'x',
    direction: -1,
  }),
  // head
  KeyR: transformDynamicPartHandleFactory({ parts: ['head'], axis: 'x', direction: -1 }),
  KeyF: transformDynamicPartHandleFactory({ parts: ['head'], axis: 'x', direction: 1 }),

  // trailer
  ArrowUp: transformDynamicPartHandleFactory({ parts: ['trailer'], axis: 'z', direction: 1 }),
  ArrowDown: transformDynamicPartHandleFactory({ parts: ['trailer'], axis: 'z', direction: -1 }),
  ArrowLeft: transformDynamicPartHandleFactory({ parts: ['trailer'], axis: 'x', direction: 1 }),
  ArrowRight: transformDynamicPartHandleFactory({ parts: ['trailer'], axis: 'x', direction: -1 }),
};

function onKeyDown(event) {
  'use strict';

  let { code } = event;

  // Treat numpad digits like the number row
  if (/^Numpad\d$/.test(code)) {
    code = code.replace('Numpad', 'Digit');
  }

  keyHandlers[code]?.(event, false);
}

function wireframeToggleHandle(_event, isKeyUp) {
  if (isKeyUp) {
    return;
  }

  Object.values(MATERIAL).forEach((material) => (material.wireframe = !material.wireframe));
}

function changeActiveCameraHandleFactory(cameraDescriptor) {
  return (_event, isKeyUp) => {
    if (isKeyUp) {
      return;
    }

    refreshCameraParameters(cameraDescriptor);
    activeCamera = cameraDescriptor;
  };
}

function transformDynamicPartHandleFactory({ parts, axis, direction }) {
  return (event, isKeyUp) => {
    if (event.repeat) {
      // ignore holding down keys
      return;
    }

    parts.forEach((part) => {
      const userData = dynamicElements[part].userData || (dynamicElements[part].userData = {});
      const delta = userData.delta || (userData.delta = new THREE.Vector3(0, 0, 0));
      // Use clamp since not all keydown event have a corresponding keyup event
      delta[axis] = THREE.Math.clamp(delta[axis] + (isKeyUp ? -direction : direction), -1, 1);
    });
  };
}

///////////////////////
/* KEY UP CALLBACK */
///////////////////////
function onKeyUp(e) {
  'use strict';

  let { code } = event;

  // Treat numpad digits like the number row
  if (/^Numpad\d$/.test(code)) {
    code = code.replace('Numpad', 'Digit');
  }

  keyHandlers[code]?.(event, true);
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

  if (parent) {
    parent.add(group);
  } else {
    scene.add(group);
  }

  return group;
}

/**
 * Create a THREE.Mesh with BoxGeometry, on the given position and with the scaling
 * from the given profile (`name`).
 * Additionally, an anchor point can be set using an array of length 3, with values
 * of -1, 0 or 1, that will be used as the origin point when scaling.
 *
 * Automatically adds the created Mesh to the given parent.
 */
function createBoxMesh({ name, x = 0, y = 0, z = 0, anchor = [0, 0, 0], parent }) {
  const { w, h, d } = GEOMETRY[name];
  const material = MATERIAL[name];
  const geometry = new THREE.BoxGeometry(w, h, d);
  const box = new THREE.Mesh(geometry, material);
  box.position.set(x + (anchor[0] * w) / 2, y + (anchor[1] * h) / 2, z + (anchor[2] * d) / 2);

  parent.add(box);
  return box;
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
  const radialSegments = 35; // allows for smooth edges
  const geometry = new THREE.CylinderGeometry(r, r, h, radialSegments);
  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.position.set(x, y, z);
  cylinder.rotation.set(rx, ry, rz);

  parent.add(cylinder);
  return cylinder;
}

/**
 * Wrapper to `createGroup` that creates a group with a
 * symmetry on the X axis.
 */
function buildSymmetricX(builder, parent) {
  return builder(createGroup({ scale: [-1, 1, 1], parent }));
}
