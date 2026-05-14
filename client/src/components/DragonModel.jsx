import React, { useEffect, useRef, useMemo } from "react";
import * as THREE from "three";
import { useGraph, useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";

export default function Model({
  targetPosition = [0, 0, 0],
  animation = "flying",
  speed = 0.8,
  onReached,
}) {
  const group     = useRef();
  const dragonRef = useRef();

  const hasReached = useRef(false);
  const cbRef      = useRef(onReached);

  // keep callback ref fresh without triggering re-renders
  useEffect(() => { cbRef.current = onReached; }, [onReached]);

  // lastForward: the horizontal direction the dragon is currently facing.
  // null = not yet seeded (first mount).
  // Pre-seeded from current->next target on EVERY leg so the dot gate
  // never blocks the correct direction on any iteration.
  const lastForward = useRef(null);

  // everMoved: false only before the very first movement after seeding.
  // Lets us skip the dot gate on the seeded direction so it takes effect
  // immediately.
  const everMoved = useRef(false);

  // Interpolation target yaw in radians. null = not yet set.
  const targetYaw = useRef(null);

  const { scene, animations } = useGLTF("/models/source/Dragon.glb");
  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
  const { nodes, materials } = useGraph(clone);
  const { actions } = useAnimations(animations, group);

  // --- animation switching ---
  useEffect(() => {
    if (!actions) return;
    Object.values(actions).forEach((a) => a.stop());
    actions[animation]?.reset().fadeIn(0.4).play();
    return () => { actions[animation]?.fadeOut(0.4); };
  }, [animation, actions]);

  // --- material setup ---
  useEffect(() => {
    Object.values(materials).forEach((mat) => {
      mat.side      = THREE.FrontSide;
      mat.roughness = 0.9;
      mat.metalness = 0.05;
      if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
      mat.needsUpdate = true;
    });
  }, [materials]);

  // --- teleport to first waypoint on mount, no movement ---
  useEffect(() => {
    if (!group.current) return;
    group.current.position.set(...targetPosition);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- whenever the target changes, reset state and pre-seed direction ---
  const [tx, ty, tz] = targetPosition;

  useEffect(() => {
    hasReached.current = false;

    // Pre-seed lastForward from current group position to the NEW target.
    // We do this on EVERY leg so that on every top->right transition
    // (and every other leg) the dragon already faces the correct way
    // before the dot gate can interfere.
    if (group.current) {
      const from = group.current.position;
      const dx   = tx - from.x;
      const dz   = tz - from.z;
      const len2 = dx * dx + dz * dz;

      if (len2 > 0.0001) {
        const len = Math.sqrt(len2);
        lastForward.current = new THREE.Vector3(dx / len, 0, dz / len);
        // Mark seeded so the rotation system starts immediately
        // and the dot gate sees this as the "current" forward,
        // meaning it will always accept the actual travel direction.
        everMoved.current = true;
      } else {
        // Same XZ position - let first real movement seed it
        everMoved.current = false;
      }
    } else {
      // Not mounted yet - first movement will seed
      everMoved.current = false;
    }
  }, [tx, ty, tz]);

  // --- reusable vectors ---
  const targetVec = useMemo(() => new THREE.Vector3(), []);
  const toTarget  = useMemo(() => new THREE.Vector3(), []);
  const smoothVel = useMemo(() => new THREE.Vector3(), []);

  // =============================================================
  //  PER-FRAME LOGIC
  // =============================================================
  useFrame((state, delta) => {
    if (!group.current) return;

    targetVec.set(tx, ty, tz);
    toTarget.subVectors(targetVec, group.current.position);

    const distance = toTarget.length();
    const arrived  = distance < 0.15;

    // 1. MOVEMENT
    if (!arrived) {
      const dir = toTarget.clone().normalize();
      smoothVel.lerp(dir.multiplyScalar(speed), Math.min(delta * 3, 1));
      group.current.position.addScaledVector(smoothVel, delta);
    } else {
      smoothVel.lerp(new THREE.Vector3(0, 0, 0), Math.min(delta * 6, 1));
      group.current.position.addScaledVector(smoothVel, delta);
    }

    // 2. FLOATING BOB
    group.current.position.y += Math.sin(state.clock.elapsedTime * 2) * 0.002;

    // 3. ROTATION
    const movingSpeed = smoothVel.length();

    if (movingSpeed > 0.08) {
      const flatVel = new THREE.Vector3(smoothVel.x, 0, smoothVel.z);

      if (flatVel.lengthSq() > 0.0001) {
        flatVel.normalize();

        if (!everMoved.current) {
          // Very first movement after mount with no pre-seed:
          // accept unconditionally.
          lastForward.current = flatVel.clone();
          everMoved.current   = true;
        } else {
          // Dot gate: only accept new direction if within 120 deg of
          // current forward. This blocks 180-deg flip-arounds while
          // still allowing normal turns.
          // Because we pre-seed lastForward at the START of each leg,
          // the real travel direction always passes this gate.
          const dot = flatVel.dot(lastForward.current);
          if (dot > -0.5) {
            lastForward.current
              .lerp(flatVel, Math.min(delta * 4, 1))
              .normalize();
          }
          // dot <= -0.5 means backward flip - silently ignore
        }
      }
    }

    // Drive rotation only once we have a real forward direction
    if (lastForward.current !== null) {
      // Dragon inner mesh has rotation [0, PI, 0] so
      // atan2(-x, -z) maps lastForward to the correct world yaw
      const desiredYaw = Math.atan2(
        -lastForward.current.x,
        -lastForward.current.z
      );

      if (targetYaw.current === null) {
        // First frame with known direction: snap, no interpolation
        targetYaw.current        = desiredYaw;
        group.current.rotation.y = desiredYaw;
      } else {
        // Shortest-path yaw interpolation - no 360-deg spin-around
        let diff = desiredYaw - targetYaw.current;
        while (diff >  Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;

        // Cap per-frame step for smooth arc turns at waypoint edges
        // Lower = wider arcs, Higher = tighter snappy turns
        const maxStep = delta * (Math.PI * 0.9);
        diff = Math.max(-maxStep, Math.min(maxStep, diff));

        targetYaw.current       += diff;
        group.current.rotation.y = THREE.MathUtils.lerp(
          group.current.rotation.y,
          targetYaw.current,
          Math.min(delta * 5, 1)
        );
      }
    }

    // 4. REACHED CALLBACK
    if (arrived && !hasReached.current) {
      hasReached.current = true;
      cbRef.current?.();
    }
  });

  return (
    <group ref={group} dispose={null}>
      <group ref={dragonRef} rotation={[0, Math.PI, 0]}>
        <group name="RootNode0" scale={0.05}>
          <group name="geo1">
            <skinnedMesh
              geometry={nodes.dragon_wings22.geometry}
              material={nodes.dragon_wings22.material}
              skeleton={nodes.dragon_wings22.skeleton}
            />
          </group>
          <group name="skeletal3">
            <primitive object={nodes.root4} />
          </group>
        </group>
      </group>
    </group>
  );
}

useGLTF.preload("/models/source/Dragon.glb");