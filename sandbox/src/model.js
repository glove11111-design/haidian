import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { floorKey, floorLabel, STOREY } from './demoBuilding.js';

const FLOOR_NAME = /^(?:Floor|Level|Storey|F|L)[_\-\s]*0*(\d+)$/i;

export function parseFloorIndex(name) {
  if (!name) return null;
  const trimmed = String(name).trim();
  const match = trimmed.match(FLOOR_NAME);
  if (match) return Number(match[1]);
  const cn = trimmed.match(/^(\d+)\s*层$/);
  if (cn) return Number(cn[1]);
  return null;
}

function cloneMaterials(root) {
  root.traverse((obj) => {
    if (!obj.isMesh) return;
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((m) => m.clone());
    } else if (obj.material) {
      obj.material = obj.material.clone();
    }
  });
}

function planSize(object) {
  const box = new THREE.Box3().setFromObject(object);
  const size = box.getSize(new THREE.Vector3());
  return { w: size.x, d: size.z, h: size.y };
}

function decorateRoom(mesh, floorIndex) {
  const size = planSize(mesh);
  const displayName = mesh.name || '未命名房间';
  mesh.userData = {
    ...mesh.userData,
    kind: mesh.userData.kind || 'room',
    displayName,
    floorKey: floorKey(floorIndex),
    floorIndex,
    floorLabel: floorLabel(floorIndex),
    function: mesh.userData.function || '待填写',
    occupancy: mesh.userData.occupancy || '—',
    notes: mesh.userData.notes || '占位属性，可在侧栏改写。',
    planWidth: size.w,
    planDepth: size.d,
    height: size.h,
  };
}

export function collectFloors(root) {
  const named = [];
  root.traverse((obj) => {
    if (obj === root) return;
    const index = parseFloorIndex(obj.name);
    if (index != null) named.push({ index, object: obj });
  });

  if (named.length) {
    const unique = new Map();
    for (const item of named) {
      const prev = unique.get(item.index);
      if (!prev) {
        unique.set(item.index, item.object);
      } else if (item.object.parent === root && prev.parent !== root) {
        unique.set(item.index, item.object);
      }
    }
    const floors = [...unique.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([index, object]) => {
        object.userData.kind = 'floor';
        object.userData.floorIndex = index;
        object.userData.floorLabel = floorLabel(index);
        object.traverse((child) => {
          if (child.isMesh && !child.userData.ignorePick) decorateRoom(child, index);
        });
        return { index, key: floorKey(index), label: floorLabel(index), object };
      });
    return floors;
  }

  const meshes = [];
  root.traverse((obj) => {
    if (obj.isMesh && !obj.userData.ignorePick) meshes.push(obj);
  });
  const bins = new Map();
  for (const mesh of meshes) {
    const box = new THREE.Box3().setFromObject(mesh);
    const y = box.min.y;
    const index = Math.max(1, Math.floor(y / STOREY + 0.001) + 1);
    if (!bins.has(index)) bins.set(index, []);
    bins.get(index).push(mesh);
  }
  return [...bins.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([index, groupMeshes]) => {
      const object = new THREE.Group();
      object.name = floorKey(index);
      object.userData = { kind: 'floor', floorIndex: index, floorLabel: floorLabel(index) };
      for (const mesh of groupMeshes) {
        decorateRoom(mesh, index);
      }
      return { index, key: floorKey(index), label: floorLabel(index), object, meshes: groupMeshes };
    });
}

export function fitModelToMeters(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  let note = null;
  if (maxDim > 250) {
    root.scale.multiplyScalar(0.001);
    root.updateMatrixWorld(true);
    note = '模型尺寸偏大，已按毫米→米缩放。';
  }
  const fitted = new THREE.Box3().setFromObject(root);
  if (Math.abs(fitted.min.y) > 0.02) {
    root.position.y -= fitted.min.y;
  }
  const center = fitted.getCenter(new THREE.Vector3());
  root.position.x -= center.x;
  root.position.z -= center.z;
  return note;
}

export function disposeObject(object) {
  object.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of materials) m?.dispose?.();
  });
}

const loader = new GLTFLoader();

export function loadGltf(url) {
  return new Promise((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
}

export function parseGltfBuffer(buffer) {
  return new Promise((resolve, reject) => {
    loader.parse(buffer, '', (gltf) => resolve(gltf.scene), reject);
  });
}

export async function prepareImportedScene(scene) {
  cloneMaterials(scene);
  scene.traverse((obj) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });
  const scaleNote = fitModelToMeters(scene);
  const floors = collectFloors(scene);
  return { root: scene, floors, scaleNote };
}
