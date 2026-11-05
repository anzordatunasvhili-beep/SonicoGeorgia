import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Part {
  object: THREE.Object3D;
  base: THREE.Vector3;
  delta: THREE.Vector3;
}

/**
 * Generic "assembly" animation for any model: every mesh is pushed outward from the
 * model centre along its own direction. `exploded` (0..1) is eased each frame, so toggling
 * it plays an explode/assemble animation. Works with GLTF scenes and procedural presets.
 */
export function Explodable({ exploded, distance = 0.9, children }: { exploded: number; distance?: number; children: ReactNode }) {
  const group = useRef<THREE.Group>(null);
  const parts = useRef<Part[]>([]);
  const factor = useRef(exploded); // start where the parent asked (intro assembles from 1 → 0)

  useLayoutEffect(() => {
    const root = group.current;
    if (!root) return;
    root.updateWorldMatrix(true, true);

    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3()).length() || 1;
    const list: Part[] = [];

    root.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh || !obj.parent || obj.userData.static) return;
      const meshCenter = new THREE.Box3().setFromObject(obj).getCenter(new THREE.Vector3());
      const dir = meshCenter.clone().sub(center);
      if (dir.lengthSq() < 1e-6) dir.set(0, 1, 0);
      dir.normalize().multiplyScalar(size * 0.35 * distance * (obj.userData.explode ?? 1));

      const worldPos = obj.getWorldPosition(new THREE.Vector3());
      const localTarget = obj.parent.worldToLocal(worldPos.clone().add(dir));
      const base = obj.position.clone();
      list.push({ object: obj, base, delta: localTarget.sub(obj.parent.worldToLocal(worldPos.clone())) });
    });
    parts.current = list;
  }, [distance]);

  useFrame((_, dt) => {
    const f = factor.current + (exploded - factor.current) * Math.min(1, dt * 3.2);
    factor.current = Math.abs(f - exploded) < 1e-4 ? exploded : f;
    const eased = factor.current * factor.current * (3 - 2 * factor.current); // smoothstep
    for (const p of parts.current) p.object.position.copy(p.base).addScaledVector(p.delta, eased);
  });

  return <group ref={group}>{children}</group>;
}
