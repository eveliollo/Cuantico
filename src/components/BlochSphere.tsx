import React from 'react';
import { BlochCoordinates } from '../types/quantum';

interface BlochSphereProps {
  qubitIndex: number;
  coords: BlochCoordinates;
  size?: number;
}

export const BlochSphere: React.FC<BlochSphereProps> = ({
  qubitIndex,
  coords,
  size = 200,
}) => {
  const center = size / 2;
  const radius = size * 0.38;

  // 3D Isometric projection of sphere coordinates
  // Coordinates: x (forward/out), y (right), z (up)
  // Let isometric projection angle: alpha ~ 30 deg, beta ~ 20 deg
  const cos30 = 0.866;
  const sin30 = 0.5;
  const cos20 = 0.939;
  const sin20 = 0.342;

  // Project 3D vector (x, y, z) into 2D SVG space (screenX, screenY)
  const project = (x3: number, y3: number, z3: number) => {
    // Screen X: from y and x
    const sx = center + radius * (y3 * cos30 - x3 * sin30);
    // Screen Y: from z and isometric tilt of x and y
    const sy = center - radius * (z3 * cos20 - (x3 * cos30 + y3 * sin30) * sin20);
    return { x: sx, y: sy };
  };

  const cx = coords?.x ?? 0;
  const cy = coords?.y ?? 0;
  const cz = coords?.z ?? 0;
  const cTheta = coords?.theta ?? 0;
  const cPhi = coords?.phi ?? 0;

  const pole0 = project(0, 0, 1);   // |0>
  const pole1 = project(0, 0, -1);  // |1>
  const plusX = project(1, 0, 0);   // |+>
  const minusX = project(-1, 0, 0); // |->
  const plusY = project(0, 1, 0);   // |+i>
  const statePos = project(cx, cy, cz);

  return (
    <div className="flex flex-col items-center bg-slate-900/60 border border-slate-800 rounded-xl p-3 shadow-inner">
      <div className="flex items-center justify-between w-full mb-1 text-xs">
        <span className="font-mono font-semibold text-emerald-400">q[{qubitIndex}]</span>
        <span className="text-slate-400 font-mono text-[11px]">
          (x:{cx.toFixed(2)}, y:{cy.toFixed(2)}, z:{cz.toFixed(2)})
        </span>
      </div>

      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible select-none">
          {/* Sphere outline */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="rgba(15, 23, 42, 0.5)"
            stroke="#334155"
            strokeWidth="1.5"
          />

          {/* Equator ellipse (xy-plane) */}
          <ellipse
            cx={center}
            cy={center}
            rx={radius}
            ry={radius * 0.3}
            fill="none"
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Meridian ellipse (xz-plane) */}
          <ellipse
            cx={center}
            cy={center}
            rx={radius * 0.3}
            ry={radius}
            fill="none"
            stroke="#475569"
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Axes Lines */}
          {/* Z Axis: |0> to |1> */}
          <line
            x1={pole0.x}
            y1={pole0.y}
            x2={pole1.x}
            y2={pole1.y}
            stroke="#64748b"
            strokeWidth="1.2"
          />
          {/* X Axis */}
          <line
            x1={minusX.x}
            y1={minusX.y}
            x2={plusX.x}
            y2={plusX.y}
            stroke="#64748b"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
          {/* Y Axis */}
          <line
            x1={center}
            y1={center}
            x2={plusY.x}
            y2={plusY.y}
            stroke="#64748b"
            strokeWidth="1"
            strokeDasharray="2 2"
          />

          {/* State Vector Arrow */}
          <line
            x1={center}
            y1={center}
            x2={statePos.x}
            y2={statePos.y}
            stroke="#10b981"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {/* State Vector Tip */}
          <circle
            cx={statePos.x}
            cy={statePos.y}
            r="4.5"
            fill="#34d399"
            stroke="#064e3b"
            strokeWidth="1.5"
          />

          {/* Labels */}
          {/* |0> North Pole */}
          <text
            x={pole0.x}
            y={pole0.y - 6}
            textAnchor="middle"
            fill="#f8fafc"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            |0⟩
          </text>
          {/* |1> South Pole */}
          <text
            x={pole1.x}
            y={pole1.y + 13}
            textAnchor="middle"
            fill="#f8fafc"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="bold"
          >
            |1⟩
          </text>
          {/* |+> +X */}
          <text
            x={plusX.x - 12}
            y={plusX.y + 12}
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
          >
            |+⟩
          </text>
          {/* |+i> +Y */}
          <text
            x={plusY.x + 5}
            y={plusY.y}
            fill="#94a3b8"
            fontSize="9"
            fontFamily="monospace"
          >
            |i⟩
          </text>
        </svg>
      </div>

      <div className="w-full flex justify-between text-[10px] font-mono text-slate-400 mt-2 border-t border-slate-800 pt-1.5 px-1">
        <span>θ: {(cTheta * (180 / Math.PI)).toFixed(1)}°</span>
        <span>φ: {(cPhi * (180 / Math.PI)).toFixed(1)}°</span>
        <span className="text-emerald-400">r: {Math.sqrt(cx ** 2 + cy ** 2 + cz ** 2).toFixed(2)}</span>
      </div>
    </div>
  );
};
