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
