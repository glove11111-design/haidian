import * as THREE from 'three';

export const STOREY = 4.2;
export const SLAB = 0.3;
const ROOM_H = STOREY - SLAB - 0.08;

const CN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

export function floorLabel(index) {
  if (index >= 1 && index <= 10) return `${CN[index]}层`;
  return `${index}层`;
}

export function floorKey(index) {
  return `Floor_${String(index).padStart(2, '0')}`;
}

function makeMaterial(color) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.78,
    metalness: 0.04,
  });
}

function addEdges(mesh) {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry, 25),
    new THREE.LineBasicMaterial({
      color: 0x2d2b28,
      transparent: true,
      opacity: 0.28,
    }),
  );
  edges.userData.ignorePick = true;
  edges.raycast = () => {};
  mesh.add(edges);
}

function addRoom(floor, spec) {
  const { name, cx, cz, w, d, color, fn } = spec;
  const geo = new THREE.BoxGeometry(w, ROOM_H, d);
  const mesh = new THREE.Mesh(geo, makeMaterial(color));
  mesh.name = name;
  mesh.position.set(cx, SLAB + ROOM_H / 2, cz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = {
    kind: 'room',
    displayName: name,
    floorKey: floor.name,
    floorIndex: floor.userData.floorIndex,
    floorLabel: floor.userData.floorLabel,
    function: fn,
    occupancy: '—',
    notes: '占位属性，可在侧栏改写。',
    planWidth: w,
    planDepth: d,
    height: ROOM_H,
  };
  addEdges(mesh);
  floor.add(mesh);
  return mesh;
}

function addSlab(floor, w, d) {
  const geo = new THREE.BoxGeometry(w + 0.35, SLAB, d + 0.35);
  const mesh = new THREE.Mesh(geo, makeMaterial(0xc9c3b8));
  mesh.name = `${floor.userData.floorLabel}楼板`;
  mesh.position.set(0, SLAB / 2, 0);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  mesh.userData = {
    kind: 'slab',
    displayName: mesh.name,
    floorKey: floor.name,
    floorIndex: floor.userData.floorIndex,
    floorLabel: floor.userData.floorLabel,
    function: '结构楼板',
    occupancy: '—',
    notes: '演示体量的层间楼板。',
    planWidth: w + 0.35,
    planDepth: d + 0.35,
    height: SLAB,
  };
  addEdges(mesh);
  floor.add(mesh);
}

/**
 * Readable four-storey massing with Floor_01…Floor_04 groups
 * and named room meshes as children. Units are meters.
 */
export function createDemoBuilding() {
  const root = new THREE.Group();
  root.name = 'DemoBuilding';

  const W = 28;
  const D = 16;
  const floors = [
    {
      index: 1,
      rooms: [
        { name: '一层门厅', cx: 0, cz: -2.3, w: 27.6, d: 11.2, color: 0xd9cbb8, fn: '门厅 / 展示' },
        { name: '设备间', cx: -9.6, cz: 5.8, w: 8.4, d: 4.2, color: 0x9a9590, fn: '机电辅助' },
        { name: '楼梯间', cx: 0, cz: 5.8, w: 5.2, d: 4.2, color: 0xb7b3ad, fn: '垂直交通' },
        { name: '接待室', cx: 9.6, cz: 5.8, w: 8.4, d: 4.2, color: 0xc4b49a, fn: '接待会客' },
      ],
    },
    {
      index: 2,
      rooms: [
        { name: '开放办公', cx: 0, cz: -2.3, w: 27.6, d: 11.2, color: 0xa8b5b8, fn: '办公' },
        { name: '茶水间', cx: -9.6, cz: 5.8, w: 8.4, d: 4.2, color: 0xc4b49a, fn: '后勤服务' },
        { name: '楼梯间', cx: 0, cz: 5.8, w: 5.2, d: 4.2, color: 0xb7b3ad, fn: '垂直交通' },
        { name: '会议室A', cx: 9.6, cz: 5.8, w: 8.4, d: 4.2, color: 0x8fa396, fn: '会议' },
      ],
    },
    {
      index: 3,
      rooms: [
        { name: '展厅', cx: 0, cz: -2.3, w: 27.6, d: 11.2, color: 0xc4a484, fn: '展览陈列' },
        { name: '休息区', cx: -9.6, cz: 5.8, w: 8.4, d: 4.2, color: 0xc5b8a5, fn: '停留休息' },
        { name: '楼梯间', cx: 0, cz: 5.8, w: 5.2, d: 4.2, color: 0xb7b3ad, fn: '垂直交通' },
        { name: '研讨室', cx: 9.6, cz: 5.8, w: 8.4, d: 4.2, color: 0x8a9aa3, fn: '研讨' },
      ],
    },
    {
      index: 4,
      rooms: [
        { name: '屋顶花园', cx: 0, cz: -2.3, w: 27.6, d: 11.2, color: 0x8b9e82, fn: '屋顶开放空间' },
        { name: '设备平台', cx: -9.6, cz: 5.8, w: 8.4, d: 4.2, color: 0x8d8a86, fn: '屋顶设备' },
        { name: '楼梯间', cx: 0, cz: 5.8, w: 5.2, d: 4.2, color: 0xb7b3ad, fn: '垂直交通' },
        { name: '观景平台', cx: 9.6, cz: 5.8, w: 8.4, d: 4.2, color: 0xa3b0a4, fn: '眺望' },
      ],
    },
  ];

  for (const def of floors) {
    const group = new THREE.Group();
    group.name = floorKey(def.index);
    group.position.y = (def.index - 1) * STOREY;
    group.userData = {
      kind: 'floor',
      floorIndex: def.index,
      floorLabel: floorLabel(def.index),
    };
    addSlab(group, W, D);
    for (const room of def.rooms) addRoom(group, room);
    root.add(group);
  }

  return root;
}

export function createSite() {
  const site = new THREE.Group();
  site.name = 'Site';

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({
      color: 0xd4cfc3,
      roughness: 1,
      metalness: 0,
    }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.name = 'Ground';
  ground.userData.ignorePick = true;
  site.add(ground);

  const pad = new THREE.Mesh(
    new THREE.BoxGeometry(36, 0.12, 24),
    new THREE.MeshStandardMaterial({ color: 0xc5bfb3, roughness: 0.95 }),
  );
  pad.position.y = 0.06;
  pad.receiveShadow = true;
  pad.name = 'Plinth';
  pad.userData.ignorePick = true;
  site.add(pad);

  return site;
}
