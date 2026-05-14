import { Canvas } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import { Suspense, useState, useEffect, useRef, useCallback } from "react";
import Model from "./components/Dragon.jsx";

// ── WAYPOINTS ─────────────────────────────────────────────────────────────────
// Camera: [0, 10, 10], fov: 10
// Rule: HIGH Z (close) = BIG dragon at BOTTOM of screen
//       LOW / NEGATIVE Z (far) = small dragon at TOP of screen
// ─────────────────────────────────────────────────────────────────────────────
const WAYPOINTS = [
  {
    id: "top_center",
    position: [0, -1.0, -7.5],
    animation: "flying",
    transitAnimation: "flying",
    stayDuration: 1800,
    speed: 1,
  },

  {
    id: "right_side",
    position: [4.5, -1.8, 0.8],
    animation: "flying",
    transitAnimation: "flying",
    stayDuration: 1200,
    speed: 1,
  },

  {
    id: "bottom_center",
    position: [0, -3, 2.8],
    animation: "flying",
    transitAnimation: "flying",
    stayDuration: 1200,
    speed: 1,
  },

  {
    id: "left_side",
    position: [-4.5, -1.8, 0.8],
    animation: "flying",
    transitAnimation: "flying",
    stayDuration: 1200,
    speed: 1,
  },
];
// ── SEQUENCER HOOK ────────────────────────────────────────────────────────────
function useDragonSequence() {
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("staying");
  const idxRef = useRef(0);
  const phaseRef = useRef("staying");
  const timer = useRef(null);

  const goStay = useCallback((i) => {
    const wi = ((i % WAYPOINTS.length) + WAYPOINTS.length) % WAYPOINTS.length;
    idxRef.current = wi;
    phaseRef.current = "staying";
    setIdx(wi);
    setPhase("staying");
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      phaseRef.current = "transit";
      setPhase("transit");
    }, WAYPOINTS[wi].stayDuration);
  }, []);

  useEffect(() => {
    goStay(0);
    return () => clearTimeout(timer.current);
  }, [goStay]);

  const onReached = useCallback(() => {
    if (phaseRef.current !== "transit") return;
    goStay(idxRef.current + 1);
  }, [goStay]);

  const nextIdx = (idx + 1) % WAYPOINTS.length;
  const isStaying = phase === "staying";
  const active = isStaying ? WAYPOINTS[idx] : WAYPOINTS[nextIdx];

  return {
    targetPosition: active.position,
    animation:
      isStaying
        ? WAYPOINTS[idx].animation
        : WAYPOINTS[nextIdx].transitAnimation,
    speed: active.speed,
    onReached,
  };
}

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const { targetPosition, animation, speed, onReached } = useDragonSequence();

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        background: "#000",
      }}
    >
      {/* ── LAYER 1 · HERO CONTENT ──────────────────────────────────────────
           z-index 10  — sits below the dragon canvas
           pointer-events: none on the outer wrapper so the canvas above
           doesn't block hero button clicks; re-enable on interactive elements
      ─────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, letterSpacing: "0.35em", marginBottom: 20 }}>
          ● EST. 2022 · PROFESSIONAL ESPORTS
        </p>

        <h1 style={{ textAlign: "center", lineHeight: 1, margin: 0 }}>
          <span style={{ display: "block", color: "#fff", fontSize: "clamp(36px,6vw,72px)", letterSpacing: "0.18em", fontWeight: 900 }}>
            WELCOME TO
          </span>
          <span style={{ display: "block", color: "#fff", fontSize: "clamp(48px,9vw,96px)", letterSpacing: "0.1em", fontWeight: 900, marginTop: 4 }}>
            IMMORTAL
          </span>
          {/* Dragon lands just above this line ↓ */}
          <span style={{ display: "block", color: "#d97706", fontSize: "clamp(48px,9vw,96px)", letterSpacing: "0.1em", fontWeight: 900 }}>
            DE CAMPEONES
          </span>
        </h1>

        <p style={{ color: "rgba(255,255,255,0.45)", fontStyle: "italic", fontSize: "clamp(14px,1.4vw,18px)", marginTop: 32 }}>
          "We don't just play to compete — we play to conquer."
        </p>

        {/* re-enable pointer events on buttons only */}
        <div style={{ display: "flex", gap: 16, marginTop: 40, pointerEvents: "auto" }}>
          <button style={{
            padding: "12px 40px", background: "#d97706", color: "#000",
            fontWeight: 900, letterSpacing: "0.15em", fontSize: 13, border: "none", cursor: "pointer",
          }}>
            MEET THE ROSTER
          </button>
          <button style={{
            padding: "12px 40px", background: "transparent",
            color: "#fff", fontWeight: 900, letterSpacing: "0.15em", fontSize: 13,
            border: "1px solid rgba(255,255,255,0.3)", cursor: "pointer",
          }}>
            OUR LEGACY
          </button>
        </div>
      </div>

      {/* ── LAYER 2 · DRAGON CANVAS ─────────────────────────────────────────
           z-index 20 — floats above hero
           pointer-events: none — all clicks pass through to hero below
           Container is full viewport so the 3D perspective is correct
           gl alpha:true = transparent canvas background
      ─────────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 20,
          pointerEvents: "none",  // pass-through clicks
        }}
      >
        <Canvas
          shadows
          gl={{ alpha: true, antialias: true }}
          camera={{
            position: [0, 3.5, 14],
            fov: 22,
          }}
          style={{ background: "transparent" }}
        >
          <ambientLight intensity={0.7} />
          <directionalLight position={[5, 5, 5]} intensity={2} castShadow />
          <Environment preset="sunset" />

          <Suspense fallback={null}>
            <Model
              targetPosition={targetPosition}
              animation={animation}
              speed={speed}
              onReached={onReached}
            />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
}