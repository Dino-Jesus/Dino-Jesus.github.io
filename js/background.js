import * as THREE from "three";
import { RenderPass } from "RenderPass";
import { EffectComposer } from "EffectComposer";
import { GammaCorrectionShader } from "GammaCorrectionShader";
import { ShaderPass } from "ShaderPass";
import { RGBShiftShader } from "RGBShiftShader";
import { Matrix4 } from "three";

let guiValues;
const textureFolder = "../assets/textures/";

const mouse = new THREE.Vector2();
const camMovScale = { x: 0.1, y: 0.1, z: 0.1 };

// Variables
let renderScene = true;
let terrainIntensity = 0.5;
const matMetalness = 0.9;

const camNear = 0.01;
const camFar = 20;
const camFOV = 90;

const rgbShiftIntensity = 0.001;

let speed = 0.15;

const canvas = document.querySelector(".webgl-canvas");
const scene = new THREE.Scene();

const size = {
  width: window.innerWidth,
  height: window.innerHeight,
};

const fog = new THREE.Fog("#000000", 1, 2.1);
scene.fog = fog;

const TEXTURE_PATH = textureFolder + "gridTexture2.png";
const DISPLACEMENT_PATH = textureFolder + "heightTexture2.png";
const METAL_PATH = textureFolder + "metalTexture2.png";

const textureLoader = new THREE.TextureLoader();
const gridTexture = textureLoader.load(TEXTURE_PATH);
const gridTerrainTexture = textureLoader.load(DISPLACEMENT_PATH);
const gridMetalTexture = textureLoader.load(METAL_PATH);

const gridGeometry = new THREE.PlaneGeometry(1, 2, 35, 35);
const gridMaterial = new THREE.MeshStandardMaterial({
  map: gridTexture,
  displacementMap: gridTerrainTexture,
  displacementScale: terrainIntensity,
  metalnessMap: gridMetalTexture,
  metalness: matMetalness,
  emissive: new THREE.Color(255 / 255, 0 / 255, 169 / 255),
  emissiveMap: gridTexture,
  emissiveIntensity: 20,
});

const gridPlane = new THREE.Mesh(gridGeometry, gridMaterial);

gridPlane.rotation.x = -Math.PI * 0.5;
gridPlane.position.y = 0.0;
gridPlane.position.z = 0.15;

const gridPlane2 = new THREE.Mesh(gridGeometry, gridMaterial);

gridPlane2.rotation.x = -Math.PI * 0.5;
gridPlane2.position.y = 0.0;
gridPlane2.position.z = -1.85;

scene.add(gridPlane);
scene.add(gridPlane2);

calcScale();

const SUN_TEXTURE_PATH = textureFolder + "sunTexture.png";

const sunGridTexture = textureLoader.load(SUN_TEXTURE_PATH);

const sunGeometry = new THREE.CircleGeometry(0.35, 60);
const sunMaterial = new THREE.MeshStandardMaterial({
  map: sunGridTexture,
  emissive: new THREE.Color(1, 1, 1),
  emissiveMap: sunGridTexture,
  emissiveIntensity: 1,
});
const sunPlane = new THREE.Mesh(sunGeometry, sunMaterial);
scene.add(sunPlane);

sunPlane.position.x = 0;
sunPlane.position.y = 1.2;
sunPlane.position.z = -0.75;

const sunLinesGeometry = new THREE.PlaneGeometry(2.5 * 0.4, 0.05);
const sunLinesMaterial = new THREE.MeshLambertMaterial();
const sunLinesCount = 6;
const sunLines = new THREE.InstancedMesh(
  sunLinesGeometry,
  sunLinesMaterial,
  sunLinesCount
);

let sunLinesMatrix = new THREE.Matrix4();
let sunLinesColor = [
  new THREE.Color(0, 0, 0),
  new THREE.Color(0, 0, 0),
  new THREE.Color(0, 0, 0),
  new THREE.Color(0, 0, 0),
  new THREE.Color(0, 0, 0),
  new THREE.Color(0, 0, 0),
];

for (let i = 0; i < sunLinesCount; i++) {
  sunLines.setColorAt(i, sunLinesColor[i]);
  sunLinesMatrix.makeTranslation(0, 1 + i / 10, -0.749);
  sunLines.setMatrixAt(i, sunLinesMatrix);
}

scene.add(sunLines);

const camera = new THREE.PerspectiveCamera(
  camFOV, //fov
  size.width / size.height, //Aspec Ratio
  camNear, // Cam Near
  camFar // Cam Far
);

camera.position.x = 0;
camera.position.y = 0.06;
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(size.width, size.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

window.addEventListener("resize", () => {
  size.width = window.innerWidth;
  size.height = window.innerHeight;

  camera.aspect = size.width / size.height;
  camera.updateProjectionMatrix();

  calcScale();
  renderer.setSize(size.width, size.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

document.addEventListener("mousemove", (event) => {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
});

// Post processing effects
const effectComposer = new EffectComposer(renderer);
effectComposer.setSize(size.width, size.height);
effectComposer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const renderPass = new RenderPass(scene, camera);
effectComposer.addPass(renderPass);
const rgbShiftPass = new ShaderPass(RGBShiftShader);
rgbShiftPass.uniforms["amount"].value = rgbShiftIntensity;
effectComposer.addPass(rgbShiftPass);

const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
effectComposer.addPass(gammaCorrectionPass);

const clock = new THREE.Clock();

let time = 1;
let oldPosition;
let dummyMatrix = new Matrix4();

const tick = () => {
  if (renderScene) {
    const elapsedTime = clock.getElapsedTime();
    for (let index = 0; index < sunLines.count; index++) {
      let highest = 1.56;
      let lowest = 0.925;
      let speedL = time * speed;
      speedL = elapsedTime * speed * 0.25;
      let gapBetweenLine = 0.155 * index;
      let power = 3;
      let newYPos =
        highest - Math.pow((speedL + gapBetweenLine) % lowest, power);
      let newYScale = 3 * Math.pow((speedL + gapBetweenLine) % lowest, 1.5);

      sunLines.getMatrixAt(index, sunLinesMatrix);
      oldPosition = new THREE.Vector3().setFromMatrixPosition(sunLinesMatrix);
      sunLinesMatrix.makeTranslation(
        0.95 * camMovScale.x * mouse.x,
        newYPos + 0.95 * camMovScale.y * mouse.y,
        oldPosition.z
      );
      dummyMatrix.identity();
      sunLinesMatrix.multiply(dummyMatrix.makeScale(1, newYScale, 1));
      sunLines.setMatrixAt(index, sunLinesMatrix);
    }
    sunLines.instanceMatrix.needsUpdate = true;

    camera.position.x = camMovScale.x * mouse.x;
    camera.rotation.y = camMovScale.x * mouse.x;
    camera.position.y = camMovScale.y * mouse.y + 0.11;
    camera.rotation.x = -camMovScale.y * mouse.y;

    sunPlane.position.x = 0.95 * camMovScale.x * mouse.x;
    sunPlane.position.y = 0.95 * camMovScale.y * mouse.y + 1.2;

    gridPlane.position.z = (elapsedTime * speed) % 2;
    gridPlane2.position.z = ((elapsedTime * speed) % 2) - 2;

    effectComposer.render();
    window.requestAnimationFrame(tick);
  }
};

function calcScale() {
  // Gradient based scaling wrt screen width
  if (size.width > 1000) {
    camMovScale.x = 0.1;
    camMovScale.y = 0.1;
    gridPlane.scale.x = 1;
    gridPlane2.scale.x = 1;
    terrainIntensity = 0.5;
  } else if (size.width < 400) {
    camMovScale.x = 0.05;
    camMovScale.y = 0.05;
    gridPlane.scale.x = 0.25;
    gridPlane2.scale.x = 0.25;
    terrainIntensity = 0.8;
  } else {
    // Gradient: val = start_val*x + end_val*(x-1)
    camMovScale.x = 0.1 * (size.width / 1000) + 0.05 * (size.width / 1000 - 1);
    camMovScale.y = 0.1 * (size.width / 1000) + 0.05 * (size.width / 1000 - 1);
    gridPlane.scale.x = size.width / 1000 + 0.25 * (size.width / 1000 - 1);
    gridPlane2.scale.x = size.width / 1000 + 0.25 * (size.width / 1000 - 1);
    terrainIntensity =
      0.5 * (size.width / 1000) - 0.8 * (size.width / 1000 - 1);
    gridPlane.material.map = gridTexture;
  }

  if (size.height > 1000) {
    camMovScale.y = 0.1;
  } else if (size.height < 400) {
    camMovScale.y = 0.05;
  } else {
    camMovScale.y =
      0.1 * (size.height / 1000) + 0.05 * (size.height / 1000 - 1);
  }
  gridMaterial.displacementScale = terrainIntensity;
}

let FizzyText = function () {
  // Sets up inital values for the sliders
  this.animation = true;
};

window.onload = function () {
  guiValues = new FizzyText();
  let gui = new dat.GUI();

  let animation = gui.add(guiValues, "animation");
  animation.onChange(function (value) {
    camera.position.x = 0;
    camera.position.y = 0.1;
    camera.position.z = 1;
    camera.rotation.x = 0;
    camera.rotation.y = 0;
    camera.rotation.z = 0;
    sunPlane.position.x = 0;
    sunPlane.position.y = 1.2;
    sunPlane.position.z = -0.75;
    sunPlane.rotation.x = 0;
    sunPlane.rotation.y = 0;
    sunPlane.rotation.z = 0;
    effectComposer.render();
    if (value) {
      renderScene = true;
      tick();
    } else {
      renderScene = false;
    }
  });
};

tick();
