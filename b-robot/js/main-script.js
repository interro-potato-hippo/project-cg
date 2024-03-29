'use strict';

//////////////////////
/* GLOBAL CONSTANTS */
//////////////////////
const FLOAT_COMPARISON_THRESHOLD = 1e-4;

const MATERIAL = Object.freeze({
  chest: new THREE.MeshBasicMaterial({ color: 0xff4b3e }),
  back: new THREE.MeshBasicMaterial({ color: 0x101935 }),
  abdomen: new THREE.MeshBasicMaterial({ color: 0x564787 }),
  waist: new THREE.MeshBasicMaterial({ color: 0xb9e28c }),
  wheel: new THREE.MeshBasicMaterial({ color: 0x476a6f }),
  thigh: new THREE.MeshBasicMaterial({ color: 0xb7990d }),
  shank: new THREE.MeshBasicMaterial({ color: 0xff2e00 }),
  feet: new THREE.MeshBasicMaterial({ color: 0x6c9a8b }),
  arm: new THREE.MeshBasicMaterial({ color: 0x0f8b8d }),
  forearm: new THREE.MeshBasicMaterial({ color: 0x04724d }),
  exhaust: new THREE.MeshBasicMaterial({ color: 0x796465 }),
  head: new THREE.MeshBasicMaterial({ color: 0x9ec1a3 }),
  eye: new THREE.MeshBasicMaterial({ color: 0x904e55 }),
  antenna: new THREE.MeshBasicMaterial({ color: 0xe75a7c }),

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
  headOffset: -0.05, // avoids glitching after head rotation (y-axis)

  trailerContainer: { w: 5, h: 5, d: 12 },
  trailerConnector: { r: 0.25, h: 0.5 },
  trailerConnectorDepth: 1.5,
  trailerWheelSupport: { w: 4, h: 1, d: 4.5 },
  trailerWheelGap: 0.5,
  initialTrailerOffset: 10,
});

// absolute coordinates
const ROBOT_AABB_POINTS = {
  min: new THREE.Vector3(
    -GEOMETRY.chest.w / 2 - 2 * GEOMETRY.exhaust.r,
    GEOMETRY.shank.h + GEOMETRY.thigh.h - GEOMETRY.wheel.r,
    -GEOMETRY.chest.d / 2
  ),
  max: new THREE.Vector3(
    GEOMETRY.chest.w / 2,
    GEOMETRY.shank.h +
      GEOMETRY.thigh.h +
      GEOMETRY.waist.h +
      GEOMETRY.abdomen.h +
      GEOMETRY.chest.h +
      GEOMETRY.exhaust.h / 2,
    GEOMETRY.thigh.h + GEOMETRY.shank.h + GEOMETRY.feet.d
  ),
};

// relative coordinates (to trailer pivot)
const RELATIVE_TRAILER_AABB_POINTS = {
  min: new THREE.Vector3(
    -GEOMETRY.trailerContainer.w / 2,
    -GEOMETRY.trailerWheelSupport.h - GEOMETRY.wheel.r,
    0
  ),
  max: new THREE.Vector3(
    GEOMETRY.trailerContainer.w / 2,
    GEOMETRY.trailerContainer.h,
    GEOMETRY.trailerContainer.d
  ),
};

const TRAILER_ANIMATION_TARGET = new THREE.Vector3(
  0,
  GEOMETRY.shank.h + GEOMETRY.thigh.h + GEOMETRY.waist.h,
  GEOMETRY.thigh.h + GEOMETRY.shank.h - 3 * GEOMETRY.wheel.r - GEOMETRY.wheelGap
);

const BACKGROUND = new THREE.Color(0xc0e8ee);

const CAMERA_GEOMETRY = Object.freeze({
  robotAABB: [new THREE.Vector3(-7, -13, -7), new THREE.Vector3(7, 10, 15)], // EXTRA
  trailerAABB: [new THREE.Vector3(-7, -5, -5), new THREE.Vector3(7, 10, 20)], // EXTRA
  sceneViewAABB: [new THREE.Vector3(-25, -10, -20), new THREE.Vector3(20, 30, 30)],
  orthogonalDistance: 500,
  orthogonalNear: 1,
  orthogonalFar: 1000,
  perspectiveDistance: 25,
  perspectiveFov: 80,
  perspectiveNear: 1,
  perspectiveFar: 1000,
});

const TRANSFORMATION_TYPE = Object.freeze({
  ROTATION: {
    applier: rotateDynamicPart,
    comparator: (obj, expected, axis) => obj?.rotation[axis] === expected,
  },
  TRANSLATION: {
    applier: moveDynamicPart,
    comparator: (obj, expected, axis) => obj?.position[axis] === expected,
  },
});

// degrees of freedom per profile
const DEGREES_OF_FREEDOM = Object.freeze({
  feet: {
    type: TRANSFORMATION_TYPE.ROTATION,
    min: -Math.PI / 2,
    max: 0,
    axis: 'x',
    truckValue: -Math.PI / 2,
  },
  lowerLimbs: {
    type: TRANSFORMATION_TYPE.ROTATION,
    min: -Math.PI / 2,
    max: 0,
    axis: 'x',
    truckValue: -Math.PI / 2,
  },
  head: {
    type: TRANSFORMATION_TYPE.ROTATION,
    min: 0,
    max: Math.PI,
    axis: 'x',
    truckValue: Math.PI,
  },
  arms: {
    type: TRANSFORMATION_TYPE.TRANSLATION,
    min: GEOMETRY.chest.w / 2 - GEOMETRY.arm.w,
    max: GEOMETRY.chest.w / 2,
    axis: 'x',
    truckValue: GEOMETRY.chest.w / 2 - GEOMETRY.arm.w,
  },
});

const ROBOT_DYNAMIC_PARTS = Object.freeze([
  { part: 'rightFoot', profile: 'feet' },
  { part: 'leftFoot', profile: 'feet' },
  { part: 'rightLowerLimb', profile: 'lowerLimbs' },
  { part: 'leftLowerLimb', profile: 'lowerLimbs' },
  { part: 'head', profile: 'head' },
  { part: 'rightArm', profile: 'arms' },
  { part: 'leftArm', profile: 'arms' },
]);

const MOVEMENT_FLAGS_VECTORS = Object.freeze({
  xPositive: new THREE.Vector3(1, 0, 0),
  xNegative: new THREE.Vector3(-1, 0, 0),
  zPositive: new THREE.Vector3(0, 0, 1),
  zNegative: new THREE.Vector3(0, 0, -1),
});

const MOVEMENT_TIME = 700; // milliseconds
const TRAILER_MOVEMENT_SPEED = 10 / 1000; // units/millisecond
const DELTA = Object.freeze(
  Object.fromEntries([
    // automatically generate DELTAs for parts with defined degrees of freedom
    ...Object.entries(DEGREES_OF_FREEDOM).map(([key, { min, max }]) => {
      const val = (max - min) / MOVEMENT_TIME;

      return [key, val];
    }),

    // DELTAs for parts without defined degrees of freedom
    ['trailer', TRAILER_MOVEMENT_SPEED],
  ])
);

//////////////////////
/* GLOBAL VARIABLES */
//////////////////////
let renderer, scene;
let activeCamera;
let prevTimestamp;
let trailerColliding = false,
  trailerAnimating = false;

let autoPanCamera = false; // automatically pan camera to fit scene objects (EXTRA)

const cameras = {
  // front view
  front: createOrthogonalCamera({
    bottomAxisVector: new THREE.Vector3(-1, 0, 0), // X axis
    sideAxisVector: new THREE.Vector3(0, 1, 0), // Y axis
    z: -CAMERA_GEOMETRY.orthogonalDistance,
  }),
  // side view
  side: createOrthogonalCamera({
    bottomAxisVector: new THREE.Vector3(0, 0, 1), // Z axis
    sideAxisVector: new THREE.Vector3(0, 1, 0), // Y axis
    x: -CAMERA_GEOMETRY.orthogonalDistance,
  }),
  // top view
  top: createOrthogonalCamera({
    bottomAxisVector: new THREE.Vector3(1, 0, 0), // X axis
    sideAxisVector: new THREE.Vector3(0, 0, -1), // Z axis
    mirrorView: true,
    y: CAMERA_GEOMETRY.orthogonalDistance,
  }),
  // orthogonal projection: isometric view
  orthogonal: createOrthogonalCamera({
    bottomAxisVector: new THREE.Vector3(-1, 0, -1).normalize(),
    sideAxisVector: new THREE.Vector3(0, 1, 0), // Y axis
    x: CAMERA_GEOMETRY.orthogonalDistance,
    y: CAMERA_GEOMETRY.orthogonalDistance,
    z: -CAMERA_GEOMETRY.orthogonalDistance,
  }),
  // perspective projection: isometric view
  perspective: createPerspectiveCamera({
    x: -CAMERA_GEOMETRY.perspectiveDistance,
    y: CAMERA_GEOMETRY.perspectiveDistance,
    z: -CAMERA_GEOMETRY.perspectiveDistance,
  }),
};

const dynamicElements = {};

/////////////////////
/* CREATE SCENE(S) */
/////////////////////
function createScene() {
  scene = new THREE.Scene();
  scene.add(new THREE.AxesHelper(20));
  scene.background = BACKGROUND;

  createRobot();
  createTrailer();
}

//////////////////////
/* CREATE CAMERA(S) */
//////////////////////
function createCameras() {
  // set the initial camera
  activeCamera = cameras.front;

  Object.values(cameras).forEach((cameraDescriptor) => {
    refreshCameraParameters(cameraDescriptor);
    cameraDescriptor.camera.lookAt(scene.position);
  });
}

function getVisibleAreaBoundingBox() {
  if (!autoPanCamera) {
    return {
      min: CAMERA_GEOMETRY.sceneViewAABB[0],
      max: CAMERA_GEOMETRY.sceneViewAABB[1],
    };
  }

  const { robot, trailer } = dynamicElements;

  return {
    min: robot.position
      .clone()
      .add(CAMERA_GEOMETRY.robotAABB[0])
      .min(trailer.position.clone().add(CAMERA_GEOMETRY.trailerAABB[0])),
    max: robot.position
      .clone()
      .add(CAMERA_GEOMETRY.robotAABB[1])
      .max(trailer.position.clone().add(CAMERA_GEOMETRY.trailerAABB[1])),
  };
}

/**
 * Create an orthogonal camera with the given parameters.
 *
 * @param {Object} parameters - The camera parameters.
 * @param {THREE.Vector3} parameters.bottomAxisVector - A normalized vector along the bottom axis.
 * Its direction depends from where the camera is facing.
 * @param {THREE.Vector3} parameters.sideAxisVector - A normalized vector along the side axis.
 * Its direction depends from where the camera is facing.
 * @param {int} parameters.x - The X position of the camera.
 * @param {int} parameters.y - The Y position of the camera.
 * @param {int} parameters.z - The Z position of the camera.
 * @param {boolean} parameters.mirrorView - Whether to mirror the camera vertically and horizontally.
 * @returns {THREE.OrthographicCamera} The created camera.
 */
function createOrthogonalCamera({
  bottomAxisVector,
  sideAxisVector,
  x = 0,
  y = 0,
  z = 0,
  mirrorView = false,
}) {
  const getCameraParameters = () => {
    const { min, max } = getVisibleAreaBoundingBox();

    const maxLeft = bottomAxisVector.dot(max);
    const minRight = bottomAxisVector.dot(min);
    const minTop = sideAxisVector.dot(max);
    const maxBottom = sideAxisVector.dot(min);

    const minWidth = Math.abs(minRight - maxLeft);
    const minHeight = Math.abs(minTop - maxBottom);
    const offsetX = (minRight + maxLeft) / 2;
    const offsetY = (minTop + maxBottom) / 2;

    const aspectRatio = window.innerWidth / window.innerHeight;
    let height = minHeight;
    let width = height * aspectRatio;

    // fit to aspect ratio
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

  const { top, bottom, left, right } = getCameraParameters();

  const camera = new THREE.OrthographicCamera(
    left,
    right,
    top,
    bottom,
    CAMERA_GEOMETRY.orthogonalNear,
    CAMERA_GEOMETRY.orthogonalFar
  );
  camera.position.set(x, y, z);

  return { getCameraParameters, camera };
}

function createPerspectiveCamera({ x = 0, y = 0, z = 0 }) {
  const getCameraParameters = () => {
    return { aspect: window.innerWidth / window.innerHeight };
  };

  const { aspect } = getCameraParameters();

  const camera = new THREE.PerspectiveCamera(
    CAMERA_GEOMETRY.perspectiveFov,
    aspect,
    CAMERA_GEOMETRY.perspectiveNear,
    CAMERA_GEOMETRY.perspectiveFar
  );
  camera.position.set(x, y, z);

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

  const headGroup = createGroup({ y: GEOMETRY.chest.h + GEOMETRY.headOffset, parent: robot });
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
  createBoxMesh({
    name: 'thigh',
    anchor: [1, 1, -1],
    x: GEOMETRY.legGap / 2,
    y: -GEOMETRY.thigh.d / 2 - GEOMETRY.thigh.h,
    z: GEOMETRY.thigh.d / 2,
    parent: lowerLimbsGroup,
  });

  const shankGroup = createGroup({
    x: GEOMETRY.legGap / 2,
    y: -GEOMETRY.thigh.d / 2 - GEOMETRY.thigh.h - GEOMETRY.shank.h,
    z: GEOMETRY.thigh.d / 2,
    parent: lowerLimbsGroup,
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
  if (!dynamicElements.trailer || !isRobotInTruckMode()) return false;

  const { max: rMax, min: rMin } = ROBOT_AABB_POINTS;
  const { max: tMax, min: tMin } = getTrailerAABBPoints();

  return (
    rMin.x <= tMax.x &&
    rMax.x >= tMin.x &&
    rMin.y <= tMax.y &&
    rMax.y >= tMin.y &&
    rMin.z <= tMax.z &&
    rMax.z >= tMin.z
  );
}

function isRobotInTruckMode() {
  return ROBOT_DYNAMIC_PARTS.every(({ part, profile }) => {
    const { type, axis, truckValue } = DEGREES_OF_FREEDOM[profile];

    return type.comparator(dynamicElements[part], truckValue, axis);
  });
}

function getTrailerAABBPoints() {
  const { max: relMax, min: relMin } = RELATIVE_TRAILER_AABB_POINTS;
  return {
    max: dynamicElements.trailer.position.clone().add(relMax),
    min: dynamicElements.trailer.position.clone().add(relMin),
  };
}

///////////////////////
/* HANDLE COLLISIONS */
///////////////////////
function handleCollisions() {
  if (trailerAnimating) return;
  trailerAnimating = true;

  dynamicElements.trailer.userData.movementFlags = {};
}

////////////
/* UPDATE */
////////////
function update(timeDelta) {
  if (checkCollisions()) {
    if (!trailerColliding) {
      handleCollisions();
    }
    trailerColliding = true;
  } else {
    trailerColliding = false;
  }

  ROBOT_DYNAMIC_PARTS.forEach((part) =>
    DEGREES_OF_FREEDOM[part.profile].type.applier(timeDelta, part)
  );

  if (trailerAnimating) {
    moveDynamicPart(timeDelta, { part: 'trailer' }, ({ group, timeDelta }) => {
      const direction = new THREE.Vector3().subVectors(TRAILER_ANIMATION_TARGET, group.position);

      if (direction.lengthSq() <= FLOAT_COMPARISON_THRESHOLD) {
        trailerAnimating = false;
        return new THREE.Vector3();
      }

      const maxMovement = direction.length();

      return direction
        .normalize()
        .multiplyScalar(TRAILER_MOVEMENT_SPEED * timeDelta)
        .clampLength(0, maxMovement);
    });
  } else {
    // this allows movement along individual axes (key-controlled)
    moveDynamicPart(timeDelta, { part: 'trailer', profile: 'trailer' });
  }

  if (autoPanCamera) {
    // refresh camera to adjust to objects' position (EXTRA)
    refreshCameraParameters(activeCamera);
  }
}

function rotateDynamicPart(
  timeDelta,
  { part, profile },
  deltaSupplier = getObjectDeltaVectorFromFlags
) {
  const group = dynamicElements[part];
  if (!group.userData?.movementFlags) {
    return;
  }

  const props = DEGREES_OF_FREEDOM[profile];

  const delta = deltaSupplier({ profile, group, timeDelta });

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

function moveDynamicPart(
  timeDelta,
  { part, profile },
  deltaSupplier = getObjectDeltaVectorFromFlags
) {
  const group = dynamicElements[part];
  if (!group.userData?.movementFlags) {
    return;
  }

  const props = DEGREES_OF_FREEDOM[profile];

  const delta = deltaSupplier({ profile, group, timeDelta });

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

function getObjectDeltaVectorFromFlags({ group, profile, timeDelta }) {
  return Object.entries(group?.userData?.movementFlags || {})
    .filter(([_flagKey, flagValue]) => flagValue)
    .reduce((vec, [flagKey, _flagValue]) => {
      return vec.add(MOVEMENT_FLAGS_VECTORS[flagKey]);
    }, new THREE.Vector3())
    .normalize()
    .multiplyScalar(DELTA[profile] * timeDelta);
}

/////////////
/* DISPLAY */
/////////////
function render() {
  renderer.render(scene, activeCamera.camera);
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
  renderer.setSize(window.innerWidth, window.innerHeight);

  if (window.innerHeight > 0 && window.innerWidth > 0) {
    refreshCameraParameters(activeCamera);
  }
}

///////////////////////
/* KEY DOWN CALLBACK */
///////////////////////
const keyHandlers = {
  Digit1: changeActiveCameraHandleFactory(cameras.front),
  Digit2: changeActiveCameraHandleFactory(cameras.side),
  Digit3: changeActiveCameraHandleFactory(cameras.top),
  Digit4: changeActiveCameraHandleFactory(cameras.orthogonal),
  Digit5: changeActiveCameraHandleFactory(cameras.perspective),
  Digit6: wireframeToggleHandle,
  // feet
  KeyQ: transformDynamicPartHandleFactory({
    parts: ['rightFoot', 'leftFoot'],
    flag: 'xPositive',
  }),
  KeyA: transformDynamicPartHandleFactory({
    parts: ['rightFoot', 'leftFoot'],
    flag: 'xNegative',
  }),
  // waist
  KeyW: transformDynamicPartHandleFactory({
    parts: ['rightLowerLimb', 'leftLowerLimb'],
    flag: 'xPositive',
  }),
  KeyS: transformDynamicPartHandleFactory({
    parts: ['rightLowerLimb', 'leftLowerLimb'],
    flag: 'xNegative',
  }),
  // arms
  KeyE: transformDynamicPartHandleFactory({
    parts: ['rightArm', 'leftArm'],
    flag: 'xPositive',
  }),
  KeyD: transformDynamicPartHandleFactory({
    parts: ['rightArm', 'leftArm'],
    flag: 'xNegative',
  }),
  // head
  KeyR: transformDynamicPartHandleFactory({ parts: ['head'], flag: 'xNegative' }),
  KeyF: transformDynamicPartHandleFactory({ parts: ['head'], flag: 'xPositive' }),

  // trailer
  ArrowUp: transformDynamicPartHandleFactory({ parts: ['trailer'], flag: 'zPositive' }),
  ArrowDown: transformDynamicPartHandleFactory({ parts: ['trailer'], flag: 'zNegative' }),
  ArrowLeft: transformDynamicPartHandleFactory({ parts: ['trailer'], flag: 'xPositive' }),
  ArrowRight: transformDynamicPartHandleFactory({ parts: ['trailer'], flag: 'xNegative' }),

  // auto pan camera (EXTRA)
  KeyP: cameraAutoPanToggleHandle,
};

function onKeyDown(event) {
  let { code } = event;

  // Treat numpad digits like the number row
  if (/^Numpad\d$/.test(code)) {
    code = code.replace('Numpad', 'Digit');
  }

  keyHandlers[code]?.(event, false);
}

function wireframeToggleHandle(event, isKeyUp) {
  if (event.repeat || isKeyUp) {
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

function transformDynamicPartHandleFactory({ parts, flag }) {
  return (event, isKeyUp) => {
    if (event.repeat) {
      // ignore holding down keys
      return;
    }

    if (trailerAnimating) return;

    parts.forEach((part) => {
      const userData = dynamicElements[part].userData || (dynamicElements[part].userData = {});
      const movementFlags = userData.movementFlags || (userData.movementFlags = {});

      movementFlags[flag] = !isKeyUp;
    });
  };
}

function cameraAutoPanToggleHandle(event, isKeyUp) {
  if (event.repeat || isKeyUp) {
    return;
  }

  autoPanCamera = !autoPanCamera;
  refreshCameraParameters(activeCamera);
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
 * Wrapper to `createGroup` that creates a group with a
 * symmetry on the X axis.
 */
function buildSymmetricX(builder, parent) {
  return builder(createGroup({ scale: [-1, 1, 1], parent }));
}
