/**
 * Mutable map of live asset world positions, written by Asset3D.useFrame
 * and read by FocusedCameraController.useFrame.
 *
 * Deliberately NOT Zustand state — writing to the store 60× per asset per
 * second would trigger thousands of React re-renders.
 */
const positions = new Map<string, { x: number; z: number }>();

export const assetPositionRegistry = {
  set(id: string, x: number, z: number) { positions.set(id, { x, z }); },
  get(id: string) { return positions.get(id) ?? null; },
  remove(id: string) { positions.delete(id); },
};
