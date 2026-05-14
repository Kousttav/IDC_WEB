import { Canvas } from "@react-three/fiber";

import {
  Environment,
} from "@react-three/drei";

import Dragon from "./Dragon";

export default function DragonScene() {
  return (
    <Canvas
      className="w-full h-full"
      camera={{
        position: [0, 10, 10],
        fov: 10,
      }}
    >
      <ambientLight intensity={0.7} />

      <directionalLight
        position={[5, 10, 5]}
        intensity={2}
      />

      <Environment preset="sunset" />

      <Dragon />
    </Canvas>
  );
}