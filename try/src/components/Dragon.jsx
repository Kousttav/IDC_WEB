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
  const group = useRef();
  const dragonRef = useRef();

  const hasReached = useRef(false);
  const cbRef = useRef(onReached);

  useEffect(() => {
    cbRef.current = onReached;
  }, [onReached]);

  const { scene, animations } = useGLTF("/source/Dragon.glb");

  const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);

  const { nodes, materials } = useGraph(clone);

  const { actions } = useAnimations(animations, group);

  // ─────────────────────────────────────────
  // ANIMATION
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!actions) return;

    Object.values(actions).forEach((a) => a.stop());

    actions[animation]
      ?.reset()
      .fadeIn(0.4)
      .play();

    return () => {
      actions[animation]?.fadeOut(0.4);
    };
  }, [animation, actions]);

  // ─────────────────────────────────────────
  // MATERIALS
  // ─────────────────────────────────────────
  useEffect(() => {
    Object.values(materials).forEach((mat) => {
      mat.side = THREE.FrontSide;
      mat.roughness = 0.9;
      mat.metalness = 0.05;

      if (mat.map) {
        mat.map.colorSpace = THREE.SRGBColorSpace;
      }

      mat.needsUpdate = true;
    });
  }, [materials]);

  // ─────────────────────────────────────────
  // INITIAL POSITION
  // ─────────────────────────────────────────
  useEffect(() => {
    if (!group.current) return;

    group.current.position.set(...targetPosition);
  }, []);

  const [tx, ty, tz] = targetPosition;

  useEffect(() => {
    hasReached.current = false;
  }, [tx, ty, tz]);

  // temp vectors
  const targetVec = useMemo(() => new THREE.Vector3(), []);
  const moveDir = useMemo(() => new THREE.Vector3(), []);
  const currentVelocity = useMemo(() => new THREE.Vector3(), []);

  // ─────────────────────────────────────────
  // MOVEMENT
  // ─────────────────────────────────────────
  useFrame((state, delta) => {
    if (!group.current) return;

    targetVec.set(tx, ty, tz);

    moveDir.subVectors(targetVec, group.current.position);

    const distance = moveDir.length();

    if (distance > 0.001) {
      moveDir.normalize();
    }

    // smooth movement
    currentVelocity.lerp(
      moveDir.multiplyScalar(speed),
      delta * 2
    );

    group.current.position.addScaledVector(
      currentVelocity,
      delta
    );

    // floating motion
    group.current.position.y +=
      Math.sin(state.clock.elapsedTime * 2) *
      0.002;

    // face movement direction ALWAYS
    if (currentVelocity.length() > 0.01) {
      const angle = Math.atan2(
        -currentVelocity.x,
        -currentVelocity.z
      );

      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        angle,
        delta * 3
      );
    }

    // reached
    if (distance < 0.15 && !hasReached.current) {
      hasReached.current = true;
      cbRef.current?.();
    }
  });

  return (
    <group ref={group} dispose={null}>
      <group
        ref={dragonRef}
        rotation={[0, Math.PI, 0]}
      >
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

useGLTF.preload("/source/Dragon.glb");