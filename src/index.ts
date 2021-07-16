import * as THREE from "three";
import { MMDAnimationHelper } from "three/examples/jsm/animation/MMDAnimationHelper.js";

import { MMDLoader } from "three/examples/jsm/loaders/MMDLoader.js";
import { Pane } from "tweakpane";
import { HeadTracker } from "./head-tracker";
import "./main.css";
import { random } from "./math-helper";
import "./links";

const params = {
  headTrack: true,
  calibrationScene: false,
  offsetX: 0,
  offsetY: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,

  // My hard-coded parameters for reference.
  // offsetX: 0.05,
  // offsetY: -0.08,
  // scaleX: 4.38,
  // scaleY: 4.38,
  // scaleZ: 6.7,
};

{
  const paneDiv = document.createElement("div");
  paneDiv.style.position = "fixed";
  paneDiv.style.left = "0";
  paneDiv.style.top = "0";
  paneDiv.style.zIndex = "100";

  document.body.appendChild(paneDiv);

  const pane = new Pane({
    container: paneDiv,
  }) as any;

  pane.addInput(params, "headTrack");
  pane.addInput(params, "calibrationScene");
  pane.addInput(params, "offsetX", { min: -1, max: 1 });
  pane.addInput(params, "offsetY", { min: -1, max: 1 });
  pane.addInput(params, "scaleX", { min: 0.1, max: 5 });
  pane.addInput(params, "scaleY", { min: 0.1, max: 5 });
  pane.addInput(params, "scaleZ", { min: 0.1, max: 10 });
}

const scene = new THREE.Scene();

const calibrationGroup = new THREE.Group();
scene.add(calibrationGroup);

async function addCalibrationScene(parent: THREE.Group) {
  const geometry = new THREE.BoxGeometry();

  const material = new THREE.MeshBasicMaterial({
    map: await loadTexture("checkerboard.png"),
  });

  const cube = new THREE.Mesh(geometry, material);
  cube.scale.multiplyScalar(0.5);

  parent.add(cube);
}

addCalibrationScene(calibrationGroup);

const mainScene = new THREE.Group();
scene.add(mainScene);

const clock = new THREE.Clock();

function createPlatform(scene: THREE.Group, { x = 0, y = 0, z = 0 } = {}) {
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({
    opacity: 0.5,
    transparent: true,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.set(0.4, 0.01, 8);
  mesh.position.set(x, y, z);
  scene.add(mesh);
}

function createLights() {
  const group = new THREE.Group();

  const ambient = new THREE.AmbientLight(0x666666);
  group.add(ambient);

  const directionalLight = new THREE.DirectionalLight(0x887766);
  directionalLight.position.set(-1, 1, 1).normalize();
  group.add(directionalLight);

  return group;
}

scene.add(createLights());

const camera = new THREE.PerspectiveCamera(
  75, // fov
  window.innerWidth / window.innerHeight, // aspect ratio
  0.1,
  1000
);

function addBox(scene: THREE.Scene, { divisions = 10 } = {}) {
  const box = new THREE.Group();

  const gridBottom = new THREE.GridHelper(1, divisions, "white", "white");
  gridBottom.position.y = -0.5;
  gridBottom.position.z = -0.5;
  box.add(gridBottom);

  const gridTop = new THREE.GridHelper(1, divisions, "white", "white");
  gridTop.position.y = 0.5;
  gridTop.position.z = -0.5;
  box.add(gridTop);

  const gridLeft = new THREE.GridHelper(1, divisions, "white", "white");
  gridLeft.position.x = -0.5;
  gridLeft.position.z = -0.5;
  gridLeft.rotation.z = Math.PI / 2;
  box.add(gridLeft);

  const gridRight = new THREE.GridHelper(1, divisions, "white", "white");
  gridRight.position.x = 0.5;
  gridRight.position.z = -0.5;
  gridRight.rotation.z = Math.PI / 2;
  box.add(gridRight);

  const gridBack = new THREE.GridHelper(1, divisions, "white", "white");
  gridBack.position.z = -1;
  gridBack.rotation.x = Math.PI / 2;
  box.add(gridBack);

  scene.add(box);

  return box;
}

const box = addBox(scene);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.domElement.id = "threeCanvas";
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const headTracker = new HeadTracker();

// Render loop
const render = () => {
  requestAnimationFrame(render);

  calibrationGroup.visible = params.calibrationScene;
  mainScene.visible = !params.calibrationScene;

  if (animationHelper) {
    animationHelper.update(clock.getDelta());
  }

  let left = -1;
  let right = 1;
  let top = 1;
  let down = -1;

  const aspect = window.innerWidth / window.innerHeight;
  if (aspect > 0) {
    left = -aspect;
    right = aspect;
  } else {
    down = -1 / aspect;
    top = 1 / aspect;
  }

  box.scale.set(right - left, top - down, 8);

  let offsetX: number, offsetY: number, dist: number;
  if (params.headTrack) {
    offsetX = (headTracker.centralPupil[0] + params.offsetX) * params.scaleX;
    offsetY = (headTracker.centralPupil[1] + params.offsetY) * params.scaleY;
    dist = (100 / headTracker.ipd) * params.scaleZ;
  } else {
    offsetX = 0;
    offsetY = 0;
    dist = 8;
  }

  camera.position.z = dist;
  camera.position.x = -offsetX;
  camera.position.y = -offsetY;

  camera.updateMatrix();

  const near = 0.01;
  const scale = near / dist;

  camera.projectionMatrix.makePerspective(
    (left + offsetX) * scale,
    (right + offsetX) * scale,
    (-down + offsetY) * scale,
    (-top + offsetY) * scale,
    near,
    100
  );

  // updateFog(scene);

  renderer.render(scene, camera);
};

render();

function onWindowResize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener("resize", onWindowResize, false);

let animationHelper: MMDAnimationHelper;

function addMiku(
  parent: THREE.Group,
  {
    modelFile = "mmd/miku-yyb/miku.pmx",
    x = 0,
    y = 0,
    z = 0,
    scale = 0.025,
  } = {}
) {
  const vmdFiles = ["mmd/vmds/wavefile_v2.vmd"];

  animationHelper = new MMDAnimationHelper({
    afterglow: 2.0,
  });

  const loader = new MMDLoader();

  loader.loadWithAnimation(
    modelFile,
    vmdFiles,
    function (mmd) {
      const mesh = mmd.mesh;
      mesh.scale.multiplyScalar(scale);
      mesh.position.set(x, y, z);
      parent.add(mesh);

      animationHelper.add(mesh, {
        animation: mmd.animation,
        physics: false,
      });
    },
    (xhr) => {
      if (xhr.lengthComputable) {
        const percentComplete = (xhr.loaded / xhr.total) * 100;
        console.log(Math.round(percentComplete) + "% downloaded");
      }
    },
    null
  );
}

createPlatform(mainScene, { x: -0.5, y: -0.25 });
addMiku(mainScene, {
  modelFile: "mmd/miku-sakura-yyb/miku.pmx",
  x: -0.5,
  y: -0.25,
  z: 2,
});

createPlatform(mainScene, { x: 0.5, y: -0.25 });
addMiku(mainScene, {
  modelFile: "mmd/miku-yyb/miku.pmx",
  x: 0.5,
  y: -0.25,
  z: 2,
});

function updateFog(scene: THREE.Scene) {
  const color = "black";

  if (!scene.fog) {
    scene.fog = new THREE.FogExp2(color, 0.05);
    scene.background = new THREE.Color(color);
  }
}

async function loadTexture(url: string): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    new THREE.TextureLoader().load(url, (texture) => {
      resolve(texture);
    });
  });
}

async function addTarget(
  parent: THREE.Group,
  { scale = 1, x = 0, y = 0, z = 0, endZ = -2 } = {}
) {
  const texture = await loadTexture("target.png");

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
  });

  const geometry = new THREE.CircleGeometry(0.5, 32);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.scale.multiplyScalar(scale);
  mesh.position.set(
    x,
    y,
    z + 0.01 // avoid z-fighting
  );
  parent.add(mesh);

  {
    // Create stick
    const geometry = new THREE.CylinderGeometry(
      0.01 * scale,
      0.01 * scale,
      z - endZ,
      32
    );
    const material = new THREE.MeshBasicMaterial({ color: "white" });
    const cylinder = new THREE.Mesh(geometry, material);

    cylinder.rotation.x = Math.PI * 0.5;
    cylinder.position.set(x, y, (endZ + z) * 0.5);

    parent.add(cylinder);
  }
}

for (let i = 0; i < 16; i++) {
  addTarget(mainScene, {
    scale: 0.15,
    x: random(-0.6, 0.6),
    y: random(-0.3, 0.3),
    z: random(-8, 16),
  });
}
