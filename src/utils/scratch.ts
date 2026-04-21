/**
 * Shared scratch Vector3s for hot-path math. Use these when a local
 * `new THREE.Vector3()` would be allocated and immediately discarded.
 *
 * RULES:
 *  - Never hold a reference across `await` or across frame boundaries.
 *  - Never pass a scratch as output if the receiver holds the reference
 *    (e.g. assigning to an object property) — caller-owned use only.
 *  - If two code paths in the same frame could race, give them separate
 *    scratch slots (scratchA, scratchB). Three.js useFrame is single-threaded
 *    so this is only a concern for nested sync calls.
 */
import * as THREE from 'three';

export const scratchVec3A = new THREE.Vector3();
export const scratchVec3B = new THREE.Vector3();
