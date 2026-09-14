import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { createDemoBuilding, createSite } from './demoBuilding.js';
import {
  collectFloors,
  disposeObject,
  loadGltf,
  parseGltfBuffer,
  prepareImportedScene,
} from './model.js';

const viewport = document.querySelector('#viewport');
const labelLayer = document.querySelector('#labels');
const floorsBar = document.querySelector('#floors');
const panelTitle = document.querySelector('#panel-title');
const panelLead = document.querySelector('#panel-lead');
const panelFields = document.querySelector('#panel-fields');
const panelEdit = document.querySelector('#panel-edit');
const attrFunction = document.querySelector('#attr-function');
const attrNotes = document.querySelector('#attr-notes');
const modelSource = document.querySelector('#model-source');
const hint = document.querySelector('#hint');
const toastEl = document.querySelector('#toast');
const dropVeil = document.querySelector('#drop-veil');
const fileInput = document.querySelector('#file');
const todInput = document.querySelector('#tod');
const todLabel = document.querySelector('#tod-label');
const sectionDock = document.querySelector('#section-dock');
const clipInput = document.querySelector('#clip');
const clipLabel = document.querySelector('#clip-label');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.localClippingEnabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
viewport.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.inset = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelLayer.appendChild(labelRenderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.screenSpacePanning = true;
controls.maxPolarAngle = Math.PI * 0.49;
controls.minDistance = 6;
controls.maxDistance = 140;
controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
controls.mouseButtons.MIDDLE = THREE.MOUSE.PAN;
controls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
controls.listenToKeyEvents(window);
renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());

const hemi = new THREE.HemisphereLight(0xf3efe6, 0x8a8478, 0.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff4e4, 1.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 140;
sun.shadow.camera.left = -40;
sun.shadow.camera.right = 40;
sun.shadow.camera.top = 40;
sun.shadow.camera.bottom = -40;
sun.shadow.bias = -0.0002;
scene.add(sun);
scene.add(sun.target);

scene.add(createSite());
const buildingHolder = new THREE.Group();
buildingHolder.name = 'BuildingHolder';
scene.add(buildingHolder);

const overlay = new THREE.Group();
scene.add(overlay);
const pinsGroup = new THREE.Group();
const measureGroup = new THREE.Group();
overlay.add(pinsGroup, measureGroup);

const clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 20);
const clipHelper = new THREE.Mesh(
  new THREE.PlaneGeometry(42, 42),
  new THREE.MeshBasicMaterial({
    color: 0xb3874a,
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
);
clipHelper.visible = false;
clipHelper.userData.ignorePick = true;
scene.add(clipHelper);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clock = new THREE.Clock();

const state = {
  tool: 'select',
  sectionOn: false,
  clipAxis: 'y',
  isolated: 'all',
  building: null,
  floors: [],
  selected: null,
  sourceLabel: '演示体量 · 米制',
  home: null,
  measureStart: null,
  pins: [],
  drag: { x: 0, y: 0, moved: false, armed: false },
};

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.remove('hidden');
  clearTimeout(toast.tid);
  toast.tid = setTimeout(() => toastEl.classList.add('hidden'), 2600);
}

function formatTime(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function setTimeOfDay(hours) {
  const t = THREE.MathUtils.clamp((hours - 6) / 12, 0, 1);
  const elev = Math.sin(Math.PI * t) * 1.05;
  const azim = THREE.MathUtils.lerp(-1.15, 1.15, t);
  const r = 64;
  sun.position.set(
    Math.sin(azim) * r * Math.cos(elev * 0.9),
    Math.max(6, Math.sin(elev) * r),
    Math.cos(azim) * r * Math.cos(elev * 0.9),
  );
  sun.target.position.set(0, 4, 0);
  const warm = new THREE.Color(0xffc58a);
  const noon = new THREE.Color(0xfff6e8);
  sun.color.copy(warm).lerp(noon, Math.sin(Math.PI * t));
  sun.intensity = 0.55 + 1.35 * Math.sin(Math.PI * t);
  hemi.intensity = 0.4 + 0.4 * Math.sin(Math.PI * t);
  const sky = new THREE.Color(0xcbb7a3).lerp(new THREE.Color(0xd8d2c6), Math.sin(Math.PI * t));
  scene.background = sky;
  scene.fog = new THREE.Fog(sky, 50, 140);
  renderer.setClearColor(sky);
  todLabel.textContent = formatTime(hours);
}

function resize() {
  const { clientWidth: w, clientHeight: h } = viewport;
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  labelRenderer.setSize(w, h);
}

function buildingBox() {
  if (!state.building) return new THREE.Box3(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(10, 16, 10));
  return new THREE.Box3().setFromObject(state.building);
}

function frameBuilding({ storeHome = true } = {}) {
  const box = buildingBox();
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const dim = Math.max(size.x, size.y, size.z, 8);
  const dist = dim * 1.55;
  camera.position.set(center.x + dist * 0.72, center.y + dist * 0.52, center.z + dist * 0.9);
  controls.target.copy(center);
  controls.update();
  if (storeHome) {
    state.home = {
      position: camera.position.clone(),
      target: controls.target.clone(),
    };
  }
}

function resetCamera() {
  if (!state.home) {
    frameBuilding();
    return;
  }
  camera.position.copy(state.home.position);
  controls.target.copy(state.home.target);
  controls.update();
}

function materialsOf(mesh) {
  return [].concat(mesh.material).filter(Boolean);
}

function applyClipping(root) {
  const planes = state.sectionOn ? [clipPlane] : [];
  root?.traverse((obj) => {
    if (!obj.isMesh && !obj.isLine) return;
    for (const m of materialsOf(obj)) {
      m.clippingPlanes = planes;
      m.clipShadows = true;
    }
  });
}

function updateClipPlane() {
  const box = buildingBox();
  const t = Number(clipInput.value);
  if (state.clipAxis === 'y') {
    clipPlane.set(new THREE.Vector3(0, -1, 0), t);
    clipHelper.rotation.set(-Math.PI / 2, 0, 0);
    clipHelper.position.set((box.min.x + box.max.x) / 2, t, (box.min.z + box.max.z) / 2);
    clipLabel.textContent = `${t.toFixed(2)} m`;
  } else {
    clipPlane.set(new THREE.Vector3(-1, 0, 0), t);
    clipHelper.rotation.set(0, Math.PI / 2, 0);
    clipHelper.position.set(t, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2);
    clipLabel.textContent = `X ${t.toFixed(2)} m`;
  }
  clipHelper.visible = state.sectionOn;
}

function syncClipSlider() {
  const box = buildingBox();
  if (state.clipAxis === 'y') {
    clipInput.min = String(box.min.y);
    clipInput.max = String(Math.max(box.max.y, box.min.y + 1));
    if (!state.sectionOn) clipInput.value = clipInput.max;
    else if (Number(clipInput.value) > Number(clipInput.max)) clipInput.value = clipInput.max;
  } else {
    clipInput.min = String(box.min.x);
    clipInput.max = String(box.max.x);
    clipInput.value = String((box.min.x + box.max.x) / 2);
  }
  updateClipPlane();
}

function setFloorVisible(floor, visible) {
  if (floor.object?.parent) floor.object.visible = visible;
  if (floor.meshes) {
    for (const mesh of floor.meshes) mesh.visible = visible;
  }
}

function applyFloorFilter() {
  for (const floor of state.floors) {
    const show = state.isolated === 'all' || state.isolated === floor.index;
    setFloorVisible(floor, show);
  }
  for (const pin of state.pins) {
    pin.group.visible = state.isolated === 'all' || pin.floorIndex == null || pin.floorIndex === state.isolated;
  }
}

function renderFloorBar() {
  floorsBar.innerHTML = '';
  const all = document.createElement('button');
  all.type = 'button';
  all.textContent = '全部';
  all.className = state.isolated === 'all' ? 'is-active' : '';
  all.addEventListener('click', () => {
    state.isolated = 'all';
    applyFloorFilter();
    renderFloorBar();
  });
  floorsBar.appendChild(all);
  for (const floor of state.floors) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = floor.label;
    btn.className = state.isolated === floor.index ? 'is-active' : '';
    btn.addEventListener('click', () => {
      state.isolated = floor.index;
      applyFloorFilter();
      renderFloorBar();
    });
    floorsBar.appendChild(btn);
  }
}

function clearHighlight() {
  if (!state.selected) return;
  for (const m of materialsOf(state.selected)) {
    if (m.userData._emissive) {
      m.emissive.copy(m.userData._emissive);
      m.emissiveIntensity = m.userData._emissiveIntensity ?? 0;
    }
  }
  state.selected = null;
}

function highlight(mesh) {
  clearHighlight();
  state.selected = mesh;
  for (const m of materialsOf(mesh)) {
    if (!m.emissive) continue;
    m.userData._emissive = m.emissive.clone();
    m.userData._emissiveIntensity = m.emissiveIntensity;
    m.emissive.setHex(0xb3874a);
    m.emissiveIntensity = 0.42;
  }
}

function meters(value) {
  return `${value.toFixed(2)} m`;
}

function areaOf(mesh) {
  const w = mesh.userData.planWidth ?? 0;
  const d = mesh.userData.planDepth ?? 0;
  return w * d;
}

function showPanel(mesh) {
  if (!mesh) {
    panelTitle.textContent = '点击体块查看';
    panelLead.classList.remove('hidden');
    panelLead.textContent = '选择房间后，这里会显示名称、楼层和占位属性。也可在场景中测距、剖切或钉标注。';
    panelFields.classList.add('hidden');
    panelEdit.classList.add('hidden');
    return;
  }
  const data = mesh.userData;
  panelTitle.textContent = data.displayName || mesh.name || '未命名';
  panelLead.classList.add('hidden');
  panelFields.classList.remove('hidden');
  panelFields.innerHTML = `
    <dt>名称</dt><dd>${data.displayName || mesh.name || '—'}</dd>
    <dt>楼层</dt><dd>${data.floorLabel || '—'}</dd>
    <dt>对象</dt><dd>${data.kind === 'slab' ? '楼板' : '房间体块'}</dd>
    <dt>面积（平面估算）</dt><dd>${areaOf(mesh).toFixed(1)} ㎡</dd>
    <dt>面宽 / 进深 / 高度</dt><dd>${meters(data.planWidth || 0)} · ${meters(data.planDepth || 0)} · ${meters(data.height || 0)}</dd>
    <dt>容纳人数</dt><dd>${data.occupancy || '—'}</dd>
  `;
  panelEdit.classList.remove('hidden');
  attrFunction.value = data.function || '';
  attrNotes.value = data.notes || '';
}

function setTool(tool) {
  state.tool = tool;
  state.measureStart = null;
  document.querySelectorAll('.tool[data-tool]').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.tool === tool);
  });
  const hints = {
    select: '拖拽旋转 · 右键或中键平移 · 滚轮缩放 · 方向键平移 · 点击房间查看信息',
    measure: '测距：在模型上依次点击两点。再点一次开始新的测量。',
    annotate: '标注：点击表面放置图钉，可在侧栏改写说明。',
  };
  hint.textContent = hints[tool];
}

function setSection(on) {
  state.sectionOn = on;
  sectionDock.classList.toggle('hidden', !on);
  document.querySelector('[data-action="section"]').classList.toggle('is-on', on);
  if (on) {
    syncClipSlider();
    if (state.clipAxis === 'y') {
      const box = buildingBox();
      clipInput.value = String(box.min.y + (box.max.y - box.min.y) * 0.72);
    }
    updateClipPlane();
  } else {
    clipHelper.visible = false;
    clipLabel.textContent = '关';
  }
  applyClipping(state.building);
}

function addMeasure(a, b) {
  measureGroup.clear();
  const mat = new THREE.MeshStandardMaterial({ color: 0xb3874a, roughness: 0.4, metalness: 0.1 });
  for (const p of [a, b]) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 16), mat);
    dot.position.copy(p);
    dot.userData.ignorePick = true;
    measureGroup.add(dot);
  }
  const geom = new THREE.BufferGeometry().setFromPoints([a, b]);
  const line = new THREE.Line(
    geom,
    new THREE.LineDashedMaterial({ color: 0xb3874a, dashSize: 0.35, gapSize: 0.18 }),
  );
  line.computeLineDistances();
  line.userData.ignorePick = true;
  measureGroup.add(line);
  const dist = a.distanceTo(b);
  const label = document.createElement('div');
  label.className = 'measure-label';
  label.textContent = `${dist.toFixed(2)} m`;
  const css = new CSS2DObject(label);
  css.position.copy(a).lerp(b, 0.5).add(new THREE.Vector3(0, 0.45, 0));
  measureGroup.add(css);
  toast(`距离 ${dist.toFixed(2)} m`);
}

function placePin(point, floorIndex) {
  const group = new THREE.Group();
  group.position.copy(point);
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, 1.15, 10),
    new THREE.MeshStandardMaterial({ color: 0x1d1c19 }),
  );
  stem.position.y = 0.58;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xb3874a, roughness: 0.35 }),
  );
  head.position.y = 1.22;
  stem.userData.ignorePick = true;
  head.userData.ignorePick = true;
  group.add(stem, head);
  const title = `标注 ${state.pins.length + 1}`;
  const div = document.createElement('div');
  div.className = 'pin-label';
  div.textContent = title;
  const css = new CSS2DObject(div);
  css.position.set(0, 1.55, 0);
  group.add(css);
  pinsGroup.add(group);
  const pin = { group, floorIndex, title, notes: '点击放置的展示标注。', function: '标注点' };
  div.addEventListener('click', (event) => {
    event.stopPropagation();
    showPin(pin);
  });
  state.pins.push(pin);
  showPin(pin);
}

function showPin(pin) {
  document.querySelectorAll('.pin-label').forEach((el) => el.classList.remove('is-active'));
  pin.group.children.forEach((child) => {
    if (child.element) child.element.classList.add('is-active');
  });
  clearHighlight();
  panelTitle.textContent = pin.title;
  panelLead.classList.add('hidden');
  panelFields.classList.remove('hidden');
  panelFields.innerHTML = `
    <dt>类型</dt><dd>场景标注</dd>
    <dt>楼层</dt><dd>${pin.floorIndex ? `${pin.floorIndex} 层` : '—'}</dd>
  `;
  panelEdit.classList.remove('hidden');
  attrFunction.value = pin.function;
  attrNotes.value = pin.notes;
  panelEdit.dataset.pin = String(state.pins.indexOf(pin));
}

function clearPinEdit() {
  delete panelEdit.dataset.pin;
}

function pickFromEvent(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const targets = [];
  if (state.building) targets.push(state.building);
  const hits = raycaster.intersectObjects(targets, true);
  for (const hit of hits) {
    let obj = hit.object;
    if (obj.userData.ignorePick) continue;
    while (obj && obj !== state.building) {
      if (obj.userData?.kind === 'room' || obj.userData?.kind === 'slab') {
        return { hit, mesh: obj };
      }
      obj = obj.parent;
    }
    if (hit.object.isMesh && !hit.object.userData.ignorePick) {
      return { hit, mesh: hit.object };
    }
  }
  return null;
}

function onPointerDown(event) {
  if (event.button !== 0) return;
  state.drag = { x: event.clientX, y: event.clientY, moved: false, armed: true };
}

function onPointerMove(event) {
  if (!state.drag?.armed) return;
  const dx = event.clientX - state.drag.x;
  const dy = event.clientY - state.drag.y;
  if (dx * dx + dy * dy > 16) state.drag.moved = true;
}

function onPointerUp(event) {
  if (event.button !== 0 || !state.drag?.armed) return;
  const moved = state.drag.moved;
  state.drag.armed = false;
  if (moved) return;
  const picked = pickFromEvent(event);
  if (state.tool === 'measure') {
    if (!picked) return;
    const point = picked.hit.point.clone();
    if (!state.measureStart) {
      state.measureStart = point;
      toast('已记录起点，再点第二点');
    } else {
      addMeasure(state.measureStart, point);
      state.measureStart = null;
    }
    return;
  }
  if (state.tool === 'annotate') {
    if (!picked) return;
    const floorIndex = picked.mesh.userData.floorIndex ?? null;
    placePin(picked.hit.point.clone(), floorIndex);
    return;
  }
  if (!picked) {
    clearHighlight();
    clearPinEdit();
    showPanel(null);
    return;
  }
  clearPinEdit();
  highlight(picked.mesh);
  showPanel(picked.mesh);
}

async function useBuilding(root, { label, scaleNote } = {}) {
  if (state.building) {
    buildingHolder.remove(state.building);
    disposeObject(state.building);
  }
  measureGroup.clear();
  pinsGroup.clear();
  state.pins = [];
  state.measureStart = null;
  clearHighlight();
  clearPinEdit();
  showPanel(null);

  state.building = root;
  buildingHolder.add(root);
  state.floors = collectFloors(root).filter((floor) => floor.object);
  if (!state.floors.length) state.floors = collectFloors(root);
  state.isolated = 'all';
  state.sourceLabel = label;
  modelSource.textContent = label;
  applyClipping(root);
  applyFloorFilter();
  renderFloorBar();
  syncClipSlider();
  frameBuilding({ storeHome: true });
  if (scaleNote) toast(scaleNote);
}

async function loadDefault() {
  try {
    const sceneRoot = await loadGltf('./models/building.glb');
    const prepared = await prepareImportedScene(sceneRoot);
    await useBuilding(prepared.root, {
      label: 'models/building.glb · 米制',
      scaleNote: prepared.scaleNote,
    });
    toast('已载入 building.glb');
  } catch {
    const demo = createDemoBuilding();
    await useBuilding(demo, { label: '演示体量 · 四层 · 米制' });
  }
}

async function importBuffer(buffer, name) {
  const sceneRoot = await parseGltfBuffer(buffer);
  const prepared = await prepareImportedScene(sceneRoot);
  await useBuilding(prepared.root, {
    label: `${name} · 米制`,
    scaleNote: prepared.scaleNote,
  });
  toast(`已替换为 ${name}`);
}

function onFiles(files) {
  const file = [...files].find((item) => /\.glb$/i.test(item.name) || item.type === 'model/gltf-binary');
  if (!file) {
    toast('请导入 .glb 文件');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => importBuffer(reader.result, file.name).catch((err) => toast(err.message || '模型无法解析'));
  reader.readAsArrayBuffer(file);
}

document.querySelectorAll('.tool[data-tool]').forEach((btn) => {
  btn.addEventListener('click', () => setTool(btn.dataset.tool));
});
document.querySelector('[data-action="reset"]').addEventListener('click', resetCamera);
document.querySelector('[data-action="section"]').addEventListener('click', () => setSection(!state.sectionOn));
document.querySelector('[data-action="import"]').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', () => {
  if (fileInput.files?.length) onFiles(fileInput.files);
  fileInput.value = '';
});

document.querySelectorAll('[data-clip-axis]').forEach((btn) => {
  btn.addEventListener('click', () => {
    state.clipAxis = btn.dataset.clipAxis;
    document.querySelectorAll('[data-clip-axis]').forEach((el) => el.classList.toggle('is-active', el === btn));
    syncClipSlider();
    applyClipping(state.building);
  });
});

todInput.addEventListener('input', () => setTimeOfDay(Number(todInput.value)));
clipInput.addEventListener('input', () => {
  updateClipPlane();
  applyClipping(state.building);
});

attrFunction.addEventListener('input', () => {
  if (panelEdit.dataset.pin != null) {
    const pin = state.pins[Number(panelEdit.dataset.pin)];
    if (pin) {
      pin.function = attrFunction.value;
      pin.title = attrFunction.value.trim() || pin.title;
      pin.group.children.forEach((child) => {
        if (child.element) child.element.textContent = pin.title;
      });
      panelTitle.textContent = pin.title;
    }
    return;
  }
  if (state.selected) state.selected.userData.function = attrFunction.value;
});
attrNotes.addEventListener('input', () => {
  if (panelEdit.dataset.pin != null) {
    const pin = state.pins[Number(panelEdit.dataset.pin)];
    if (pin) pin.notes = attrNotes.value;
    return;
  }
  if (state.selected) state.selected.userData.notes = attrNotes.value;
});

renderer.domElement.addEventListener('pointerdown', onPointerDown);
window.addEventListener('pointermove', onPointerMove);
window.addEventListener('pointerup', onPointerUp);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    setTool('select');
    setSection(false);
    clearHighlight();
    showPanel(null);
  }
  if (event.key === 'r' || event.key === 'R') resetCamera();
  if (event.key === '0') {
    state.isolated = 'all';
    applyFloorFilter();
    renderFloorBar();
  }
  const num = Number(event.key);
  if (num >= 1 && num <= 9) {
    const floor = state.floors.find((item) => item.index === num);
    if (floor) {
      state.isolated = num;
      applyFloorFilter();
      renderFloorBar();
    }
  }
});

['dragenter', 'dragover'].forEach((type) => {
  window.addEventListener(type, (event) => {
    event.preventDefault();
    dropVeil.classList.remove('hidden');
  });
});
['dragleave', 'drop'].forEach((type) => {
  window.addEventListener(type, (event) => {
    event.preventDefault();
    if (type === 'dragleave' && event.target !== dropVeil && event.relatedTarget) return;
    dropVeil.classList.add('hidden');
  });
});
window.addEventListener('drop', (event) => {
  event.preventDefault();
  dropVeil.classList.add('hidden');
  if (event.dataTransfer?.files?.length) onFiles(event.dataTransfer.files);
});

window.addEventListener('resize', resize);

function tick() {
  requestAnimationFrame(tick);
  controls.update(clock.getDelta());
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

resize();
setTimeOfDay(Number(todInput.value));
setTool('select');
tick();
loadDefault();
