import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020304);
scene.fog = new THREE.Fog(0x030405, 18, 58);

const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
camera.position.set(8.6, 4.2, 8.8);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.055;
controls.target.set(0.2, 1.05, 0);
controls.minDistance = 4.5;
controls.maxDistance = 22;
controls.maxPolarAngle = Math.PI * 0.49;

const materials = {
  aluminum: new THREE.MeshStandardMaterial({ color: 0xd8d5c9, roughness: 0.48, metalness: 0.62 }),
  pale: new THREE.MeshStandardMaterial({ color: 0xf1eddd, roughness: 0.55, metalness: 0.28 }),
  darkRubber: new THREE.MeshStandardMaterial({ color: 0x20242a, roughness: 0.88, metalness: 0.08 }),
  dustyRubber: new THREE.MeshStandardMaterial({ color: 0x353940, roughness: 0.94, metalness: 0.02 }),
  rust: new THREE.MeshStandardMaterial({ color: 0x9d6249, roughness: 0.72, metalness: 0.25 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd0a34d, roughness: 0.46, metalness: 0.78 }),
  black: new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.7, metalness: 0.1 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0xb5b1a1, roughness: 0.9, metalness: 0.03 }),
  wire: new THREE.MeshStandardMaterial({ color: 0xe6e1d3, roughness: 0.36, metalness: 0.65 }),
  lunar: new THREE.MeshStandardMaterial({ color: 0x8d9092, roughness: 0.96, metalness: 0.0 })
};

const rover = new THREE.Group();
scene.add(rover);
const wheelMounts = [];
const drive = {
  speed: 0,
  steer: 0,
  heading: 0,
  wheelSpin: 0,
  followOffset: new THREE.Vector3(7.6, 4.1, 7.2)
};
const keys = {
  up: false,
  down: false,
  left: false,
  right: false
};

function mesh(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

function cylinderBetween(start, end, radius, material, radialSegments = 16) {
  const startVector = new THREE.Vector3(...start);
  const endVector = new THREE.Vector3(...end);
  const delta = endVector.clone().sub(startVector);
  const object = mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), radialSegments), material);
  object.position.copy(startVector.add(endVector).multiplyScalar(0.5));
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return object;
}

function addBox(group, size, position, material, rotation = [0, 0, 0]) {
  const object = mesh(new THREE.BoxGeometry(...size), material, position, rotation);
  group.add(object);
  return object;
}

function addTube(group, start, end, radius = 0.035, material = materials.aluminum) {
  const object = cylinderBetween(start, end, radius, material);
  group.add(object);
  return object;
}

function createWheel(x, z) {
  const group = new THREE.Group();
  group.position.set(x, 0.72, z);
  group.userData.isFront = x < 0;
  const wheelSpin = new THREE.Group();
  group.userData.spin = wheelSpin;

  const tire = mesh(new THREE.CylinderGeometry(0.58, 0.58, 0.58, 64), materials.darkRubber, [0, 0, 0], [Math.PI / 2, 0, 0]);
  const sidewallA = mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.035, 64), materials.dustyRubber, [0, 0, 0.31], [Math.PI / 2, 0, 0]);
  const sidewallB = mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.035, 64), materials.dustyRubber, [0, 0, -0.31], [Math.PI / 2, 0, 0]);
  const rimA = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.055, 36), materials.aluminum, [0, 0, 0.34], [Math.PI / 2, 0, 0]);
  const rimB = mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.055, 36), materials.aluminum, [0, 0, -0.34], [Math.PI / 2, 0, 0]);
  const capA = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 24), materials.pale, [0, 0, 0.39], [Math.PI / 2, 0, 0]);
  const capB = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 24), materials.pale, [0, 0, -0.39], [Math.PI / 2, 0, 0]);
  wheelSpin.add(tire, sidewallA, sidewallB, rimA, rimB, capA, capB);

  for (let i = 0; i < 28; i += 1) {
    const angle = (i / 28) * Math.PI * 2;
    const tread = mesh(
      new THREE.BoxGeometry(0.13, 0.055, 0.7),
      materials.dustyRubber,
      [Math.cos(angle) * 0.59, Math.sin(angle) * 0.59, 0],
      [0, 0, angle]
    );
    wheelSpin.add(tread);
  }

  for (let i = 0; i < 3; i += 1) {
    const angle = (i / 3) * Math.PI * 2;
    addTube(wheelSpin, [0, 0, 0.39], [Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, 0.39], 0.026, materials.pale);
    addTube(wheelSpin, [0, 0, -0.39], [Math.cos(angle) * 0.3, Math.sin(angle) * 0.3, -0.39], 0.026, materials.pale);
  }
  group.add(wheelSpin);

  const fenderPoints = [];
  const side = z > 0 ? 1 : -1;
  for (let i = 0; i <= 16; i += 1) {
    const angle = Math.PI * (0.08 + i * 0.84 / 16);
    fenderPoints.push(new THREE.Vector3(Math.cos(angle) * 0.74, Math.sin(angle) * 0.74 + 0.02, side * 0.39));
  }
  const fender = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fenderPoints), 32, 0.045, 12, false), materials.rust);
  group.add(fender);
  return group;
}

[-2.6, 2.65].forEach((x) => {
  [-1.05, 1.05].forEach((z) => {
    const wheel = createWheel(x, z);
    rover.add(wheel);
    wheelMounts.push(wheel);
    addTube(rover, [x, 0.78, z], [x * 0.72, 0.95, z * 0.7], 0.055, materials.aluminum);
  });
});

addBox(rover, [4.45, 0.18, 1.26], [0, 1.05, 0], materials.aluminum);
addBox(rover, [2.1, 0.2, 1.42], [0.38, 1.28, 0], materials.pale);
addBox(rover, [1.4, 0.24, 1.15], [-1.55, 1.24, 0], materials.aluminum);
addBox(rover, [1.1, 0.95, 1.18], [2.35, 1.78, 0], materials.pale);
addBox(rover, [0.92, 0.86, 1.02], [-2.55, 1.86, 0], materials.gold);

for (let z of [-0.72, 0.72]) {
  addTube(rover, [-2.65, 1.23, z], [2.9, 1.23, z], 0.045);
  addTube(rover, [-2.2, 1.65, z], [2.6, 1.66, z], 0.026, materials.wire);
}
for (let x of [-1.8, -0.6, 0.6, 1.85]) {
  addTube(rover, [x, 1.0, -0.72], [x, 1.65, -0.72], 0.028);
  addTube(rover, [x, 1.0, 0.72], [x, 1.65, 0.72], 0.028);
}

function createSeat(x) {
  const group = new THREE.Group();
  group.position.set(x, 1.58, 0);
  const base = addBox(group, [0.58, 0.08, 0.72], [0, 0, 0], materials.fabric, [0, 0, -0.06]);
  base.castShadow = true;
  const back = addBox(group, [0.58, 0.08, 0.78], [0.1, 0.44, 0], materials.fabric, [0, 0, -0.35]);
  back.castShadow = true;
  for (let z of [-0.28, 0, 0.28]) {
    addTube(group, [-0.34, 0.08, z], [0.4, 0.74, z], 0.017, materials.black);
  }
  addTube(group, [-0.42, -0.08, -0.38], [-0.38, -0.62, -0.38], 0.03);
  addTube(group, [-0.42, -0.08, 0.38], [-0.38, -0.62, 0.38], 0.03);
  rover.add(group);
}
createSeat(0.58);
createSeat(1.28);

const consoleGroup = new THREE.Group();
consoleGroup.position.set(-0.45, 1.72, 0);
consoleGroup.rotation.z = -0.18;
addBox(consoleGroup, [0.48, 0.42, 0.58], [0, 0, 0], materials.pale);
addBox(consoleGroup, [0.05, 0.5, 0.04], [0.14, 0.4, 0.33], materials.black, [0.2, 0, 0.1]);
addTube(consoleGroup, [0.08, -0.1, 0], [0.28, 0.42, 0], 0.025, materials.wire);
rover.add(consoleGroup);

function createDish() {
  const group = new THREE.Group();
  group.position.set(-2.9, 2.08, -0.35);
  group.rotation.set(-0.18, 0.1, 0.2);
  addTube(group, [0, -1.0, 0], [0.15, 1.1, 0.08], 0.035, materials.wire);
  addTube(group, [-0.22, -1.0, 0.18], [0.04, 0.15, 0], 0.022, materials.wire);
  addTube(group, [0.26, -1.0, -0.12], [0.04, 0.15, 0], 0.022, materials.wire);

  const points = [];
  for (let i = 0; i <= 12; i += 1) {
    const t = i / 12;
    points.push(new THREE.Vector2(t * 0.98, Math.pow(t, 2) * 0.28));
  }
  const dish = mesh(new THREE.LatheGeometry(points, 64, 0, Math.PI * 1.55), materials.fabric, [0.12, 1.18, 0], [Math.PI * 0.58, 0, Math.PI * -0.12]);
  dish.scale.set(1.2, 1, 0.72);
  group.add(dish);

  for (let i = 0; i < 9; i += 1) {
    const angle = -0.78 + i * 0.19;
    addTube(group, [0.12, 1.18, 0.02], [Math.cos(angle) * 1.05, 1.45 + Math.sin(angle) * 0.25, 0.08], 0.014, materials.pale);
  }
  addBox(group, [0.35, 0.22, 0.3], [0.14, 2.36, 0.04], materials.pale);
  addTube(group, [0.14, 2.45, 0.04], [0.14, 2.88, 0.04], 0.02, materials.wire);
  addBox(group, [0.38, 0.05, 0.18], [0.14, 2.9, 0.04], materials.aluminum, [0, 0.2, 0]);
  rover.add(group);
}
createDish();

function createCentralAntenna() {
  const group = new THREE.Group();
  group.position.set(-0.05, 1.42, 0.42);
  addTube(group, [0, 0, 0], [0.12, 1.9, 0], 0.025, materials.wire);
  addTube(group, [0.12, 0.76, 0], [-0.66, 0.1, -0.18], 0.016, materials.wire);
  addBox(group, [0.36, 0.24, 0.36], [0.12, 1.55, 0], materials.pale);
  addTube(group, [0.12, 1.68, 0], [0.12, 2.2, 0], 0.035, materials.pale);
  addBox(group, [0.44, 0.08, 0.2], [0.12, 1.84, 0], materials.aluminum);
  rover.add(group);
}
createCentralAntenna();

for (let i = 0; i < 10; i += 1) {
  addBox(rover, [0.28, 0.16, 0.08], [-1.8 + i * 0.34, 1.46 + Math.sin(i) * 0.04, -0.78], i % 2 ? materials.pale : materials.black);
  addBox(rover, [0.22, 0.12, 0.07], [-1.7 + i * 0.31, 1.32 + Math.cos(i) * 0.04, 0.78], i % 2 ? materials.black : materials.pale);
}

function createCable(points) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const object = mesh(new THREE.TubeGeometry(curve, 50, 0.012, 8, false), materials.wire);
  rover.add(object);
}
createCable([[-2.7, 2.25, 0.25], [-2.15, 2.35, 0.45], [-1.75, 1.82, 0.35], [-1.35, 1.55, 0.1]]);
createCable([[-0.55, 2.06, 0.43], [-0.95, 1.9, 0.72], [-1.35, 1.38, 0.78]]);

const terrainGeometry = new THREE.PlaneGeometry(54, 42, 140, 100);
terrainGeometry.rotateX(-Math.PI / 2);
const pos = terrainGeometry.attributes.position;
for (let i = 0; i < pos.count; i += 1) {
  const x = pos.getX(i);
  const z = pos.getZ(i);
  let y = Math.sin(x * 0.6) * 0.025 + Math.sin(z * 0.8) * 0.02;
  const craters = [
    [-4, -5, 1.2, -0.18],
    [4.5, 2.8, 1.8, -0.14],
    [0.5, -8, 2.2, -0.11],
    [-8, 4, 1.6, -0.16]
  ];
  craters.forEach(([cx, cz, radius, depth]) => {
    const distance = Math.hypot(x - cx, z - cz);
    if (distance < radius) y += depth * (1 + Math.cos((distance / radius) * Math.PI)) * 0.5;
  });
  pos.setY(i, y);
}
terrainGeometry.computeVertexNormals();
const terrain = mesh(terrainGeometry, materials.lunar, [0, 0, 0]);
terrain.receiveShadow = true;
terrain.castShadow = false;
scene.add(terrain);

const hillGeometry = new THREE.PlaneGeometry(54, 12, 80, 12);
hillGeometry.rotateX(-Math.PI / 2);
const hillPos = hillGeometry.attributes.position;
for (let i = 0; i < hillPos.count; i += 1) {
  const x = hillPos.getX(i);
  const z = hillPos.getZ(i);
  hillPos.setY(i, 0.55 + Math.sin(x * 0.35) * 0.15 + Math.max(0, z) * 0.16);
  hillPos.setZ(i, z - 18);
}
hillGeometry.computeVertexNormals();
const hills = mesh(hillGeometry, materials.lunar, [0, 0, 0]);
hills.receiveShadow = true;
scene.add(hills);

for (let i = 0; i < 130; i += 1) {
  const r = Math.random() * 23 + 2;
  const a = Math.random() * Math.PI * 2;
  const rock = mesh(
    new THREE.DodecahedronGeometry(Math.random() * 0.08 + 0.025, 0),
    materials.lunar,
    [Math.cos(a) * r, 0.05, Math.sin(a) * r],
    [Math.random(), Math.random(), Math.random()],
    [1, Math.random() * 0.55 + 0.45, 1]
  );
  scene.add(rock);
}

const sun = new THREE.DirectionalLight(0xfff4d2, 4.2);
sun.position.set(-6, 9, 5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -9;
sun.shadow.camera.right = 9;
sun.shadow.camera.top = 9;
sun.shadow.camera.bottom = -9;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0x8ea2c8, 0x34302b, 0.72));

const rim = new THREE.DirectionalLight(0xb7c6ff, 0.85);
rim.position.set(5, 4, -7);
scene.add(rim);

function addStars() {
  const geometry = new THREE.BufferGeometry();
  const vertices = [];
  for (let i = 0; i < 450; i += 1) {
    const radius = 34 + Math.random() * 42;
    const angle = Math.random() * Math.PI * 2;
    vertices.push(Math.cos(angle) * radius, Math.random() * 28 + 8, Math.sin(angle) * radius - 12);
  }
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  const stars = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xf7f4df, size: 0.035, sizeAttenuation: true }));
  scene.add(stars);
}
addStars();

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

function resetView() {
  drive.speed = 0;
  drive.steer = 0;
  drive.heading = 0;
  drive.wheelSpin = 0;
  rover.position.set(0, 0, 0);
  rover.rotation.set(0, 0, 0);
  wheelMounts.forEach((wheel) => {
    wheel.rotation.y = 0;
    wheel.userData.spin.rotation.z = 0;
  });
  camera.position.set(-7.8, 3.8, 7.4);
  controls.target.set(0.2, 1.05, 0);
  controls.update();
}

window.addEventListener('resize', resize);
document.querySelector('#reset-view').addEventListener('click', resetView);

function setKey(event, value) {
  const keyMap = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right'
  };
  const key = keyMap[event.key];
  if (!key) return;
  keys[key] = value;
  event.preventDefault();
}

window.addEventListener('keydown', (event) => setKey(event, true), { passive: false });
window.addEventListener('keyup', (event) => setKey(event, false), { passive: false });

function updateDrive(delta) {
  const acceleration = keys.up ? 4.4 : keys.down ? -3.0 : 0;
  const friction = keys.up || keys.down ? 0.986 : 0.91;
  drive.speed = THREE.MathUtils.clamp((drive.speed + acceleration * delta) * Math.pow(friction, delta * 60), -2.1, 4.0);

  const targetSteer = (keys.left ? 1 : 0) - (keys.right ? 1 : 0);
  drive.steer = THREE.MathUtils.lerp(drive.steer, targetSteer, 1 - Math.pow(0.08, delta));

  const turnStrength = drive.steer * drive.speed * 0.52;
  drive.heading += turnStrength * delta;
  rover.rotation.y = drive.heading;

  const forward = new THREE.Vector3(-1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), drive.heading);
  rover.position.addScaledVector(forward, drive.speed * delta);

  const distanceFromCenter = Math.hypot(rover.position.x, rover.position.z);
  if (distanceFromCenter > 20) {
    rover.position.multiplyScalar(20 / distanceFromCenter);
    drive.speed *= -0.25;
  }

  drive.wheelSpin += (drive.speed * delta) / 0.58;
  const steerAngle = drive.steer * 0.48;
  wheelMounts.forEach((wheel) => {
    wheel.userData.spin.rotation.z = drive.wheelSpin;
    wheel.rotation.y = THREE.MathUtils.lerp(wheel.rotation.y, wheel.userData.isFront ? steerAngle : 0, 1 - Math.pow(0.05, delta));
  });

  const cameraOffset = drive.followOffset.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), drive.heading);
  const desiredCamera = rover.position.clone().add(cameraOffset);
  const desiredTarget = rover.position.clone().add(new THREE.Vector3(0, 1.15, 0));
  camera.position.lerp(desiredCamera, 1 - Math.pow(0.03, delta));
  controls.target.lerp(desiredTarget, 1 - Math.pow(0.04, delta));
}

resize();
resetView();

const clock = new THREE.Clock();
function animate() {
  const delta = Math.min(clock.getDelta(), 0.05);
  updateDrive(delta);
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
animate();
