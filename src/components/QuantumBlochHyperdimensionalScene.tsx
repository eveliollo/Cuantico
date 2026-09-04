import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  Box,
  Compass,
  Eye,
  Maximize2,
  Minimize2,
  RotateCcw,
  Sparkles,
  Search,
  Layers,
  Radio,
  Activity,
  Zap,
  Play,
  Pause,
  Info,
  ChevronRight,
  Sliders,
  Share2
} from 'lucide-react';
import { SimulationResult, BlochCoordinates } from '../types/quantum';
import { SocximaEngine } from '../core/socximaEngine';

interface QuantumBlochHyperdimensionalSceneProps {
  qubitCount: number;
  simulationResult?: SimulationResult;
  engine?: SocximaEngine;
  selectedCircuitQubit?: number;
  onSelectCircuitQubit?: (qubitIndex: number) => void;
  height?: number | string;
}

export type GridTopology = 'hypercube' | 'torus' | 'hexagonal';
export type SceneLayoutMode = 'dual' | 'concentric' | 'hypergrid_focus' | 'bloch_focus';
export type ColorMappingMode = 'phase' | 'excitation' | 'bloch_z' | 'circuit';

interface QubitData {
  id: number;
  x: number;
  y: number;
  z: number;
  w: number;
  bloch: BlochCoordinates;
  prob1: number;
  prob0: number;
  phase: number;
  isCircuitActive: boolean;
  circuitQubitIndex: number;
}

const TOTAL_QUBITS = 6000;

// Helper: Create high-contrast text billboard canvas sprite for Bloch poles & axes
function createTextSprite(text: string, color: string, bgColor: string = 'rgba(15, 23, 42, 0.85)'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 160;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 160, 72);
    // Rounded badge
    ctx.fillStyle = bgColor;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(4, 4, 152, 64, 12) : ctx.rect(4, 4, 152, 64);
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = color;
    ctx.stroke();

    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 80, 36);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(3.8, 1.7, 1);
  return sprite;
}

export const QuantumBlochHyperdimensionalScene: React.FC<QuantumBlochHyperdimensionalSceneProps> = ({
  qubitCount,
  simulationResult,
  engine,
  selectedCircuitQubit = 0,
  onSelectCircuitQubit,
  height = 460,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Layout & Topology state
  const [layoutMode, setLayoutMode] = useState<SceneLayoutMode>('dual');
  const [topology, setTopology] = useState<GridTopology>('hypercube');
  const [colorMode, setColorMode] = useState<ColorMappingMode>('phase');
  const [is4DAnimation, setIs4DAnimation] = useState<boolean>(true);
  const [wRotationSpeed, setWRotationSpeed] = useState<number>(0.6);
  const [isAutoRotate, setIsAutoRotate] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Selected Qubit Inspection (0 to 5,999)
  const [selectedQubitId, setSelectedQubitId] = useState<number>(0);
  const [hoveredQubitId, setHoveredQubitId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [hudTooltip, setHudTooltip] = useState<{ x: number; y: number; qubit: QubitData } | null>(null);

  // Real-time metrics
  const [fps, setFps] = useState<number>(60);
  const [isHoveringCanvas, setIsHoveringCanvas] = useState<boolean>(false);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2(-9999, -9999));

  // Mesh & Group references
  const blochSphereGroupRef = useRef<THREE.Group | null>(null);
  const stateVectorArrowGroupRef = useRef<THREE.Group | null>(null);
  const instancedQubitsMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const latticeLinesRef = useRef<THREE.LineSegments | null>(null);
  const selectionMarkerRef = useRef<THREE.Mesh | null>(null);
  const quantumBusLinesRef = useRef<THREE.LineSegments | null>(null);

  // Animated vector target
  const currentVectorPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 8));
  const targetVectorPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 8));

  // 4D Rotation Phase
  const phase4DRef = useRef<number>(0);
  const animFrameIdRef = useRef<number | null>(null);

  // Camera Orbit State
  const cameraRotationRef = useRef<{ theta: number; phi: number; radius: number; target: THREE.Vector3 }>({
    theta: 0.9,
    phi: 1.1,
    radius: 46,
    target: new THREE.Vector3(-2, 0, 0),
  });
  const isDraggingRef = useRef<boolean>(false);
  const isRightDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // --------------------------------------------------------------------------
  // Generate Qubit Data for all 6,000 Qubits
  // --------------------------------------------------------------------------
  const qubitsData = useMemo<QubitData[]>(() => {
    const list: QubitData[] = new Array(TOTAL_QUBITS);
    const circuitBlochList = simulationResult?.blochCoords || [];

    for (let i = 0; i < TOTAL_QUBITS; i++) {
      const isCircuit = i < qubitCount;
      let bCoords: BlochCoordinates;

      if (isCircuit && circuitBlochList[i]) {
        bCoords = circuitBlochList[i];
      } else {
        // Deterministic pseudo-quantum state from index and Socxima register properties
        const pseudoTheta = Math.abs(Math.sin(i * 0.174 + (engine?.ciclo || 0) * 0.05)) * Math.PI;
        const pseudoPhi = ((i * 0.314) % (2 * Math.PI));
        const r = 0.95; // high purity
        bCoords = {
          x: r * Math.sin(pseudoTheta) * Math.cos(pseudoPhi),
          y: r * Math.sin(pseudoTheta) * Math.sin(pseudoPhi),
          z: r * Math.cos(pseudoTheta),
          theta: pseudoTheta,
          phi: pseudoPhi,
        };
      }

      const p1 = Math.max(0, Math.min(1, (1 - bCoords.z) / 2));
      const p0 = 1 - p1;

      // Compute geometric position based on topology
      let px = 0;
      let py = 0;
      let pz = 0;
      let pw = 0;

      if (topology === 'hypercube') {
        // 20 x 20 x 15 = 6,000 nodes
        const nx = 20;
        const ny = 20;
        const nz = 15;
        const ix = i % nx;
        const iy = Math.floor((i / nx) % ny);
        const iz = Math.floor(i / (nx * ny));

        const spacingX = 1.35;
        const spacingY = 1.35;
        const spacingZ = 1.35;

        // Base 3D lattice
        const baseX = (ix - (nx - 1) / 2) * spacingX;
        const baseY = (iy - (ny - 1) / 2) * spacingY;
        const baseZ = (iz - (nz - 1) / 2) * spacingZ;

        // 4th dimension coordinate W
        pw = Math.sin(ix * 0.38) * Math.cos(iy * 0.38) * Math.sin(iz * 0.45);

        if (layoutMode === 'dual') {
          px = baseX + 13.5;
          py = baseY;
          pz = baseZ;
        } else if (layoutMode === 'concentric') {
          // Hollow cage around central Bloch sphere
          const dist = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ);
          const normDist = Math.max(1, dist);
          const radiusShell = 14 + (normDist % 16);
          px = (baseX / normDist) * radiusShell;
          py = (baseY / normDist) * radiusShell;
          pz = (baseZ / normDist) * radiusShell;
        } else {
          px = baseX;
          py = baseY;
          pz = baseZ;
        }
      } else if (topology === 'torus') {
        // 15 nested rings of 400 qubits each = 6,000
        const ringIdx = i % 15;
        const qubitInRing = Math.floor(i / 15);
        const u = (qubitInRing / 400) * Math.PI * 2;
        const v = (ringIdx / 15) * Math.PI * 2;

        const majorR = 15 + ringIdx * 0.7;
        const minorR = 4.5 + Math.sin(ringIdx * 0.8) * 1.5;

        const tx = (majorR + minorR * Math.cos(v)) * Math.cos(u);
        const ty = (majorR + minorR * Math.cos(v)) * Math.sin(u);
        const tz = minorR * Math.sin(v);
        pw = Math.cos(u * 2 + v * 3);

        if (layoutMode === 'dual') {
          px = tx + 14;
          py = ty;
          pz = tz;
        } else {
          px = tx;
          py = ty;
          pz = tz;
        }
      } else {
        // Hexagonal superlattice: 6 tiers of 1,000 qubits
        const tier = Math.floor(i / 1000);
        const subIdx = i % 1000;
        const cols = 40;
        const row = Math.floor(subIdx / cols);
        const col = subIdx % cols;

        const hexOffset = (row % 2) * 0.75;
        const hx = (col - 20) * 1.5 + hexOffset;
        const hy = (row - 12.5) * 1.3;
        const hz = (tier - 2.5) * 4.2;
        pw = Math.sin(col * 0.2) * Math.cos(row * 0.2);

        if (layoutMode === 'dual') {
          px = hx + 13.5;
          py = hy;
          pz = hz;
        } else {
          px = hx;
          py = hy;
          pz = hz;
        }
      }

      list[i] = {
        id: i,
        x: px,
        y: py,
        z: pz,
        w: pw,
        bloch: bCoords,
        prob1: p1,
        prob0: p0,
        phase: bCoords.phi,
        isCircuitActive: isCircuit,
        circuitQubitIndex: isCircuit ? i : -1,
      };
    }
    return list;
  }, [qubitCount, simulationResult, engine?.ciclo, topology, layoutMode]);

  // Currently inspected qubit
  const currentInspectedQubit = qubitsData[selectedQubitId] || qubitsData[0];

  // Update target state vector when inspected qubit or circuit changes
  useEffect(() => {
    if (currentInspectedQubit) {
      const { x, y, z } = currentInspectedQubit.bloch;
      const sphereRadius = 8.0;
      targetVectorPosRef.current.set(x * sphereRadius, y * sphereRadius, z * sphereRadius);
    }
  }, [selectedQubitId, currentInspectedQubit]);

  // Keep circuit selection in sync if circuit qubit selected externally
  useEffect(() => {
    if (selectedCircuitQubit < qubitCount && selectedCircuitQubit !== selectedQubitId) {
      setSelectedQubitId(selectedCircuitQubit);
    }
  }, [selectedCircuitQubit, qubitCount]);

  // --------------------------------------------------------------------------
  // Camera & Viewport Resizing
  // --------------------------------------------------------------------------
  const updateCameraPosition = useCallback(() => {
    if (!cameraRef.current) return;
    const { theta, phi, radius, target } = cameraRotationRef.current;
    const x = target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = target.y + radius * Math.cos(phi);
    const z = target.z + radius * Math.sin(phi) * Math.cos(theta);
    cameraRef.current.position.set(x, y, z);
    cameraRef.current.lookAt(target);
  }, []);

  const handleResetCamera = useCallback(() => {
    if (layoutMode === 'dual') {
      cameraRotationRef.current = {
        theta: 0.9,
        phi: 1.1,
        radius: 46,
        target: new THREE.Vector3(-2, 0, 0),
      };
    } else if (layoutMode === 'bloch_focus') {
      cameraRotationRef.current = {
        theta: 0.8,
        phi: 1.2,
        radius: 24,
        target: new THREE.Vector3(-16, 0, 0),
      };
    } else if (layoutMode === 'hypergrid_focus') {
      cameraRotationRef.current = {
        theta: 0.95,
        phi: 1.05,
        radius: 38,
        target: new THREE.Vector3(12, 0, 0),
      };
    } else {
      cameraRotationRef.current = {
        theta: 0.85,
        phi: 1.15,
        radius: 48,
        target: new THREE.Vector3(0, 0, 0),
      };
    }
    updateCameraPosition();
  }, [layoutMode, updateCameraPosition]);

  // Quick Jump to Qubit ID
  const handleJumpToQubit = (id: number) => {
    const clamped = Math.max(0, Math.min(TOTAL_QUBITS - 1, id));
    setSelectedQubitId(clamped);
    if (clamped < qubitCount && onSelectCircuitQubit) {
      onSelectCircuitQubit(clamped);
    }
    // Pan camera smoothly towards target qubit
    const targetQ = qubitsData[clamped];
    if (targetQ) {
      cameraRotationRef.current.target.lerp(new THREE.Vector3(targetQ.x, targetQ.y, targetQ.z), 0.65);
      updateCameraPosition();
    }
  };

  // --------------------------------------------------------------------------
  // Initialize Three.js Scene
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 800;
    const heightPx = typeof height === 'number' ? height : 460;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Slate-950 deep space
    scene.fog = new THREE.FogExp2(0x020617, 0.008);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / heightPx, 0.1, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.8);
    dirLight1.position.set(20, 30, 25);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x10b981, 1.2);
    dirLight2.position.set(-25, -15, -20);
    scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xf43f5e, 2.0, 40);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);

    // =========================================================================
    // 5. THE 3D BLOCH SPHERE SYSTEM
    // =========================================================================
    const blochCenter = layoutMode === 'dual' ? new THREE.Vector3(-16, 0, 0) : new THREE.Vector3(0, 0, 0);
    const blochGroup = new THREE.Group();
    blochGroup.position.copy(blochCenter);
    scene.add(blochGroup);
    blochSphereGroupRef.current = blochGroup;

    const sphereRadius = 8.0;

    // A. Outer translucent glass sphere
    const sphereGeom = new THREE.SphereGeometry(sphereRadius, 40, 40);
    const sphereMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.12,
      roughness: 0.1,
      metalness: 0.1,
      clearcoat: 0.8,
      clearcoatRoughness: 0.1,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const sphereMesh = new THREE.Mesh(sphereGeom, sphereMat);
    blochGroup.add(sphereMesh);

    // B. Equatorial Ring (XY Plane)
    const equatorGeom = new THREE.RingGeometry(sphereRadius - 0.05, sphereRadius + 0.05, 64);
    const equatorMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.6,
    });
    const equatorMesh = new THREE.Mesh(equatorGeom, equatorMat);
    equatorMesh.rotation.x = Math.PI / 2;
    blochGroup.add(equatorMesh);

    // Semi-transparent equator disc
    const discGeom = new THREE.CircleGeometry(sphereRadius - 0.1, 48);
    const discMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const discMesh = new THREE.Mesh(discGeom, discMat);
    discMesh.rotation.x = Math.PI / 2;
    blochGroup.add(discMesh);

    // C. Meridian Ring (XZ Plane)
    const meridian1Geom = new THREE.RingGeometry(sphereRadius - 0.04, sphereRadius + 0.04, 64);
    const meridian1Mat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.35,
    });
    const meridian1Mesh = new THREE.Mesh(meridian1Geom, meridian1Mat);
    meridian1Mesh.rotation.y = Math.PI / 2;
    blochGroup.add(meridian1Mesh);

    // D. Meridian Ring (YZ Plane)
    const meridian2Geom = new THREE.RingGeometry(sphereRadius - 0.04, sphereRadius + 0.04, 64);
    const meridian2Mat = new THREE.MeshBasicMaterial({
      color: 0x818cf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.25,
    });
    const meridian2Mesh = new THREE.Mesh(meridian2Geom, meridian2Mat);
    blochGroup.add(meridian2Mesh);

    // E. 3D Principal Reference Axes (|0>, |1>, |+>, |->, |+i>, |-i>)
    const axisLen = sphereRadius * 1.25;

    // Z-Axis (Vertical: |0> North, |1> South)
    const zAxisGeom = new THREE.CylinderGeometry(0.06, 0.06, axisLen * 2, 16);
    const zAxisMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const zAxisMesh = new THREE.Mesh(zAxisGeom, zAxisMat);
    blochGroup.add(zAxisMesh);

    // X-Axis (Depth: |+> to |->)
    const xAxisGeom = new THREE.CylinderGeometry(0.05, 0.05, axisLen * 2, 16);
    const xAxisMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const xAxisMesh = new THREE.Mesh(xAxisGeom, xAxisMat);
    xAxisMesh.rotation.z = Math.PI / 2;
    blochGroup.add(xAxisMesh);

    // Y-Axis (Horizontal: |+i> to |-i>)
    const yAxisGeom = new THREE.CylinderGeometry(0.05, 0.05, axisLen * 2, 16);
    const yAxisMat = new THREE.MeshBasicMaterial({ color: 0xa855f7 });
    const yAxisMesh = new THREE.Mesh(yAxisGeom, yAxisMat);
    yAxisMesh.rotation.x = Math.PI / 2;
    blochGroup.add(yAxisMesh);

    // F. Billboard Labels for the poles
    const label0 = createTextSprite('|0⟩ (+Z)', '#10b981');
    label0.position.set(0, axisLen + 1.2, 0);
    blochGroup.add(label0);

    const label1 = createTextSprite('|1⟩ (-Z)', '#f43f5e');
    label1.position.set(0, -axisLen - 1.2, 0);
    blochGroup.add(label1);

    const labelPlus = createTextSprite('|+⟩ (+X)', '#38bdf8');
    labelPlus.position.set(axisLen + 1.2, 0, 0);
    blochGroup.add(labelPlus);

    const labelMinus = createTextSprite('|−⟩ (−X)', '#0284c7');
    labelMinus.position.set(-axisLen - 1.2, 0, 0);
    blochGroup.add(labelMinus);

    const labelPlusI = createTextSprite('|+i⟩ (+Y)', '#c084fc');
    labelPlusI.position.set(0, 0, axisLen + 1.2);
    blochGroup.add(labelPlusI);

    const labelMinusI = createTextSprite('|-i⟩ (-Y)', '#9333ea');
    labelMinusI.position.set(0, 0, -axisLen - 1.2);
    blochGroup.add(labelMinusI);

    // G. Dynamic Quantum State Vector Arrow Group
    const vectorGroup = new THREE.Group();
    blochGroup.add(vectorGroup);
    stateVectorArrowGroupRef.current = vectorGroup;

    // Arrow shaft cylinder
    const shaftGeom = new THREE.CylinderGeometry(0.18, 0.18, 1, 16);
    shaftGeom.translate(0, 0.5, 0); // origin at base
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x059669,
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const shaftMesh = new THREE.Mesh(shaftGeom, shaftMat);
    shaftMesh.name = 'shaft';
    vectorGroup.add(shaftMesh);

    // Arrow tip cone
    const coneGeom = new THREE.ConeGeometry(0.55, 1.4, 20);
    coneGeom.translate(0, 0.7, 0);
    const coneMat = new THREE.MeshStandardMaterial({
      color: 0x34d399,
      emissive: 0x10b981,
      emissiveIntensity: 0.9,
      roughness: 0.1,
      metalness: 0.9,
    });
    const coneMesh = new THREE.Mesh(coneGeom, coneMat);
    coneMesh.name = 'cone';
    vectorGroup.add(coneMesh);

    // Glowing tip particle
    const tipGlowGeom = new THREE.SphereGeometry(0.35, 16, 16);
    const tipGlowMat = new THREE.MeshBasicMaterial({ color: 0x6ee7b7 });
    const tipGlowMesh = new THREE.Mesh(tipGlowGeom, tipGlowMat);
    tipGlowMesh.name = 'tipGlow';
    vectorGroup.add(tipGlowMesh);

    // Projection shadow disc on the equator plane
    const shadowGeom = new THREE.CircleGeometry(0.4, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });
    const shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    shadowMesh.rotation.x = Math.PI / 2;
    shadowMesh.name = 'equatorShadow';
    blochGroup.add(shadowMesh);

    // Projection dashed line from tip to equator
    const projLineGeom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const projLineMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 0.3,
      gapSize: 0.2,
      transparent: true,
      opacity: 0.6,
    });
    const projLine = new THREE.Line(projLineGeom, projLineMat);
    projLine.name = 'projLine';
    blochGroup.add(projLine);

    // =========================================================================
    // 6. THE 6,000-QUBIT HYPERDIMENSIONAL GRID (InstancedMesh)
    // =========================================================================
    const qubitGeom = new THREE.SphereGeometry(0.32, 12, 12);
    const qubitMat = new THREE.MeshStandardMaterial({
      roughness: 0.3,
      metalness: 0.7,
    });

    const instancedMesh = new THREE.InstancedMesh(qubitGeom, qubitMat, TOTAL_QUBITS);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(instancedMesh);
    instancedQubitsMeshRef.current = instancedMesh;

    // Selection target halo
    const selGeom = new THREE.TorusGeometry(0.7, 0.08, 12, 24);
    const selMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, wireframe: false });
    const selMesh = new THREE.Mesh(selGeom, selMat);
    selMesh.visible = false;
    scene.add(selMesh);
    selectionMarkerRef.current = selMesh;

    // Lattice connector lines between neighboring qubits in the grid
    const lineIndices: number[] = [];
    // Connect a sample of nearest neighbors (first 1,200 grid connections for optimal 60fps)
    const sampleLimit = Math.min(1800, TOTAL_QUBITS);
    for (let i = 0; i < sampleLimit; i++) {
      if (i % 20 < 19) {
        lineIndices.push(i, i + 1);
      }
      if (i + 20 < sampleLimit) {
        lineIndices.push(i, i + 20);
      }
    }
    const latticePoints = new Float32Array(lineIndices.length * 3);
    const latticeGeom = new THREE.BufferGeometry();
    latticeGeom.setAttribute('position', new THREE.BufferAttribute(latticePoints, 3));
    const latticeMat = new THREE.LineBasicMaterial({
      color: 0x1e293b,
      transparent: true,
      opacity: 0.35,
    });
    const latticeLines = new THREE.LineSegments(latticeGeom, latticeMat);
    scene.add(latticeLines);
    latticeLinesRef.current = latticeLines;

    // Quantum Bus line connecting circuit qubits to Bloch sphere
    const busGeom = new THREE.BufferGeometry().setFromPoints([
      blochCenter,
      new THREE.Vector3(12, 0, 0),
    ]);
    const busMat = new THREE.LineDashedMaterial({
      color: 0x10b981,
      dashSize: 0.5,
      gapSize: 0.3,
      transparent: true,
      opacity: 0.8,
    });
    const busLine = new THREE.Line(busGeom, busMat);
    scene.add(busLine);
    quantumBusLinesRef.current = busLine as unknown as THREE.LineSegments;

    // Initial camera update
    handleResetCamera();

    // =========================================================================
    // 7. ANIMATION RENDER LOOP (60 FPS)
    // =========================================================================
    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsTimer = performance.now();

    const dummyMatrix = new THREE.Matrix4();
    const dummyColor = new THREE.Color();
    const tempVec = new THREE.Vector3();

    const animate = (currentTime: number) => {
      animFrameIdRef.current = requestAnimationFrame(animate);

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      frameCounter++;
      if (currentTime - fpsTimer >= 1000) {
        setFps(frameCounter);
        frameCounter = 0;
        fpsTimer = currentTime;
      }

      // Auto camera rotation
      if (isAutoRotate && !isDraggingRef.current && !isRightDraggingRef.current) {
        cameraRotationRef.current.theta += 0.003;
        updateCameraPosition();
      }

      // 4D Rotation phase update
      if (is4DAnimation) {
        phase4DRef.current += delta * wRotationSpeed;
      }
      const p4D = phase4DRef.current;
      const cos4D = Math.cos(p4D);
      const sin4D = Math.sin(p4D);

      // Smooth state vector lerping to target
      currentVectorPosRef.current.lerp(targetVectorPosRef.current, 0.12);
      const curVec = currentVectorPosRef.current;
      const vecLen = curVec.length();

      // Update Arrow orientation and scale
      if (vectorGroup) {
        if (vecLen > 0.05) {
          const dir = curVec.clone().normalize();
          // Align cylinder with vector
          vectorGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

          const shaft = vectorGroup.getObjectByName('shaft') as THREE.Mesh;
          const cone = vectorGroup.getObjectByName('cone') as THREE.Mesh;
          const tipGlow = vectorGroup.getObjectByName('tipGlow') as THREE.Mesh;

          const shaftHeight = Math.max(0.1, vecLen - 1.2);
          if (shaft) {
            shaft.scale.set(1, shaftHeight, 1);
          }
          if (cone) {
            cone.position.set(0, shaftHeight, 0);
          }
          if (tipGlow) {
            tipGlow.position.set(0, vecLen, 0);
            tipGlow.scale.setScalar(1 + Math.sin(currentTime * 0.008) * 0.2);
          }
        }

        // Update Equator Shadow and projection line
        if (blochGroup) {
          const shadow = blochGroup.getObjectByName('equatorShadow') as THREE.Mesh;
          const pLine = blochGroup.getObjectByName('projLine') as THREE.Line;
          if (shadow) {
            shadow.position.set(curVec.x, 0, curVec.z);
            shadow.scale.setScalar(1 + Math.sin(currentTime * 0.005) * 0.15);
          }
          if (pLine) {
            const positions = pLine.geometry.attributes.position as THREE.BufferAttribute;
            positions.setXYZ(0, curVec.x, curVec.y, curVec.z);
            positions.setXYZ(1, curVec.x, 0, curVec.z);
            positions.needsUpdate = true;
            (pLine as THREE.Line).computeLineDistances();
          }
        }
      }

      // Update 6,000 Qubits in InstancedMesh
      if (instancedMesh) {
        for (let i = 0; i < TOTAL_QUBITS; i++) {
          const q = qubitsData[i];
          if (!q) continue;

          // Apply 4D rotation transformation: (X, W) rotation plane
          let px = q.x;
          let py = q.y;
          let pz = q.z;
          if (is4DAnimation) {
            const rotX = q.x * cos4D - q.w * 3.5 * sin4D;
            const rotW = q.x * sin4D + q.w * 3.5 * cos4D;
            px = rotX;
            py = q.y + Math.sin(rotW * 0.5) * 0.4;
          }

          // Instance Scale
          let scale = 0.28;
          if (q.isCircuitActive) {
            scale = 0.55 + Math.sin(currentTime * 0.006 + i) * 0.08;
          } else if (i === selectedQubitId) {
            scale = 0.65 + Math.sin(currentTime * 0.01) * 0.12;
          } else if (i === hoveredQubitId) {
            scale = 0.5;
          }

          dummyMatrix.makeTranslation(px, py, pz);
          dummyMatrix.scale(tempVec.set(scale, scale, scale));
          instancedMesh.setMatrixAt(i, dummyMatrix);

          // Instance Color based on selected mode
          if (i === selectedQubitId) {
            dummyColor.setHex(0xfacc15); // Radiant Gold
          } else if (q.isCircuitActive) {
            dummyColor.setHex(0x10b981); // Emerald Active
          } else if (colorMode === 'phase') {
            // Map phase [0, 2pi] to HSL hue
            const hue = (q.phase + Math.PI) / (Math.PI * 2);
            dummyColor.setHSL(hue, 0.85, 0.55);
          } else if (colorMode === 'excitation') {
            // Red/Rose if excited P(|1>), Blue/Cyan if ground P(|0>)
            dummyColor.lerpColors(new THREE.Color(0x0284c7), new THREE.Color(0xf43f5e), q.prob1);
          } else if (colorMode === 'bloch_z') {
            // Z expectation value
            const normalizedZ = (q.bloch.z + 1) / 2;
            dummyColor.setHSL(0.35 * normalizedZ + 0.55 * (1 - normalizedZ), 0.9, 0.5);
          } else {
            // Default circuit activity mode
            dummyColor.setHex(0x1e293b);
          }
          instancedMesh.setColorAt(i, dummyColor);
        }
        instancedMesh.instanceMatrix.needsUpdate = true;
        if (instancedMesh.instanceColor) {
          instancedMesh.instanceColor.needsUpdate = true;
        }
      }

      // Update Selection Marker Torus
      if (selMesh) {
        const targetQ = qubitsData[selectedQubitId];
        if (targetQ) {
          selMesh.visible = true;
          selMesh.position.set(targetQ.x, targetQ.y, targetQ.z);
          selMesh.rotation.z += 0.02;
          selMesh.rotation.x = Math.PI / 3;
        } else {
          selMesh.visible = false;
        }
      }

      // Render Scene
      renderer.render(scene, camera);
    };

    animFrameIdRef.current = requestAnimationFrame(animate);

    // Resize handling
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newWidth = containerRef.current.clientWidth || 800;
      const newHeight = typeof height === 'number' ? height : 460;
      cameraRef.current.aspect = newWidth / newHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      renderer.dispose();
    };
  }, [
    topology,
    layoutMode,
    colorMode,
    is4DAnimation,
    wRotationSpeed,
    isAutoRotate,
    height,
    qubitsData,
    handleResetCamera,
    updateCameraPosition,
  ]);

  // --------------------------------------------------------------------------
  // Interactive Raycasting for Hover & Click on all 6,000 Qubits
  // --------------------------------------------------------------------------
  const handlePointerMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !cameraRef.current || !instancedQubitsMeshRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    mouseRef.current.set(x, y);

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObject(instancedQubitsMeshRef.current);

    if (intersects.length > 0 && intersects[0].instanceId !== undefined) {
      const qId = intersects[0].instanceId;
      setHoveredQubitId(qId);
      const q = qubitsData[qId];
      if (q) {
        setHudTooltip({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          qubit: q,
        });
      }
    } else {
      setHoveredQubitId(null);
      setHudTooltip(null);
    }
  };

  const handlePointerDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 2) {
      isRightDraggingRef.current = true;
    } else {
      isDraggingRef.current = true;
    }
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerUp = (e: React.MouseEvent<HTMLDivElement>) => {
    // Check if it was a quick click on a qubit instance
    if (hoveredQubitId !== null) {
      setSelectedQubitId(hoveredQubitId);
      if (hoveredQubitId < qubitCount && onSelectCircuitQubit) {
        onSelectCircuitQubit(hoveredQubitId);
      }
    }
    isDraggingRef.current = false;
    isRightDraggingRef.current = false;
  };

  const handleMouseMoveOrbit = (e: React.MouseEvent<HTMLDivElement>) => {
    handlePointerMove(e);

    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current) {
      cameraRotationRef.current.theta -= deltaX * 0.008;
      cameraRotationRef.current.phi = Math.max(
        0.08,
        Math.min(Math.PI - 0.08, cameraRotationRef.current.phi - deltaY * 0.008)
      );
      updateCameraPosition();
    } else if (isRightDraggingRef.current) {
      // Pan camera target
      const right = new THREE.Vector3();
      if (cameraRef.current) {
        cameraRef.current.getWorldDirection(right);
        right.cross(new THREE.Vector3(0, 1, 0)).normalize();
        cameraRotationRef.current.target.addScaledVector(right, -deltaX * 0.05);
        cameraRotationRef.current.target.y += deltaY * 0.05;
        updateCameraPosition();
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.04;
    cameraRotationRef.current.radius = Math.max(12, Math.min(120, cameraRotationRef.current.radius + zoomDelta));
    updateCameraPosition();
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'w-full'
      }`}
    >
      {/* Top Header Bar with Metrics & Topology Toggles */}
      <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center space-x-2.5">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-md shadow-emerald-950/50">
            <Radio className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-1.5">
                <span>3D Bloch Sphere & Hyperdimensional Grid</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-semibold">
                  Three.js 6,000 Qubits
                </span>
              </h3>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Unitary state vector $|\psi\rangle$ mapped to 3D Bloch manifold with 6,000 hyperdimensional nodes
            </p>
          </div>
        </div>

        {/* View Mode & Topology Controls */}
        <div className="flex items-center space-x-2 flex-wrap gap-1.5">
          {/* Layout Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 font-mono text-[11px]">
            <button
              onClick={() => { setLayoutMode('dual'); handleResetCamera(); }}
              className={`px-2.5 py-1 rounded transition-colors ${
                layoutMode === 'dual' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Side-by-side Dual View: 3D Bloch Sphere alongside 6,000-Qubit Hypergrid"
            >
              Dual View
            </button>
            <button
              onClick={() => { setLayoutMode('concentric'); handleResetCamera(); }}
              className={`px-2.5 py-1 rounded transition-colors ${
                layoutMode === 'concentric' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Concentric Manifold: 6,000 Qubits orbiting the central Bloch Sphere"
            >
              Concentric
            </button>
            <button
              onClick={() => { setLayoutMode('bloch_focus'); handleResetCamera(); }}
              className={`px-2.5 py-1 rounded transition-colors ${
                layoutMode === 'bloch_focus' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Focus Camera purely on 3D Bloch Sphere"
            >
              Bloch
            </button>
            <button
              onClick={() => { setLayoutMode('hypergrid_focus'); handleResetCamera(); }}
              className={`px-2.5 py-1 rounded transition-colors ${
                layoutMode === 'hypergrid_focus' ? 'bg-emerald-500 text-slate-950 font-bold shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Focus Camera purely on 6,000-Qubit Hyperdimensional Matrix"
            >
              6K Grid
            </button>
          </div>

          {/* Topology Selector */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-lg border border-slate-800 font-mono text-[11px]">
            <span className="px-1.5 text-slate-500 text-[10px]">Topo:</span>
            {(['hypercube', 'torus', 'hexagonal'] as GridTopology[]).map((t) => (
              <button
                key={t}
                onClick={() => setTopology(t)}
                className={`px-2 py-1 rounded transition-colors capitalize ${
                  topology === t ? 'bg-indigo-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {t === 'hypercube' ? '4D Lattice' : t === 'torus' ? 'Torus' : 'Hex'}
              </button>
            ))}
          </div>

          {/* Color Mapping Mode */}
          <select
            value={colorMode}
            onChange={(e) => setColorMode(e.target.value as ColorMappingMode)}
            className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2 py-1 text-[11px] font-mono outline-none"
            title="Color mapping mode for 6,000 qubits"
          >
            <option value="phase">Color: Quantum Phase (φ)</option>
            <option value="excitation">Color: Excitation P(|1⟩)</option>
            <option value="bloch_z">Color: Bloch ⟨Z⟩</option>
            <option value="circuit">Color: Circuit Activity</option>
          </select>

          {/* 4D Mode Toggle */}
          <button
            onClick={() => setIs4DAnimation(!is4DAnimation)}
            className={`px-2 py-1 rounded-lg border font-mono text-[11px] flex items-center space-x-1 transition-colors ${
              is4DAnimation
                ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                : 'bg-slate-950 text-slate-500 border-slate-800'
            }`}
            title="Toggle 4D Hyperdimensional Rotational Projection"
          >
            <Sparkles className="w-3 h-3 text-purple-400" />
            <span>4D Rot: {is4DAnimation ? 'ON' : 'OFF'}</span>
          </button>

          {/* Reset Camera */}
          <button
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Reset Camera Target and Distance"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main 3D Canvas Viewport */}
      <div
        className="relative w-full select-none cursor-grab active:cursor-grabbing bg-slate-950"
        style={{ height: isFullscreen ? 'calc(100vh - 120px)' : height }}
        onMouseDown={handlePointerDown}
        onMouseUp={handlePointerUp}
        onMouseMove={handleMouseMoveOrbit}
        onWheel={handleWheel}
        onMouseEnter={() => setIsHoveringCanvas(true)}
        onMouseLeave={() => {
          setIsHoveringCanvas(false);
          isDraggingRef.current = false;
          isRightDraggingRef.current = false;
          setHudTooltip(null);
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* HUD Overlay: Left Top - Inspected Qubit Card */}
        <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md border border-slate-800/90 rounded-xl p-3 text-xs font-mono text-slate-200 shadow-xl pointer-events-auto max-w-xs space-y-2">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="font-bold text-emerald-400">
                Qubit Q[{currentInspectedQubit.id}]
              </span>
            </div>
            {currentInspectedQubit.isCircuitActive ? (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                Circuit Wire {currentInspectedQubit.circuitQubitIndex}
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                Lattice Node
              </span>
            )}
          </div>

          {/* Dirac notation for current state */}
          <div className="text-[11px] text-emerald-300 bg-slate-950/90 p-1.5 rounded border border-slate-800">
            |ψ⟩ = {Math.cos(currentInspectedQubit.bloch.theta / 2).toFixed(3)}|0⟩ + {Math.sin(currentInspectedQubit.bloch.theta / 2).toFixed(3)}e<sup>i({(currentInspectedQubit.bloch.phi).toFixed(2)})</sup>|1⟩
          </div>

          {/* Bloch Coordinates */}
          <div className="grid grid-cols-3 gap-1.5 text-[10px] text-slate-400">
            <div className="bg-slate-950 p-1 rounded border border-slate-800/60">
              <span className="text-slate-500">⟨X⟩:</span>{' '}
              <strong className="text-cyan-400">{currentInspectedQubit.bloch.x.toFixed(3)}</strong>
            </div>
            <div className="bg-slate-950 p-1 rounded border border-slate-800/60">
              <span className="text-slate-500">⟨Y⟩:</span>{' '}
              <strong className="text-purple-400">{currentInspectedQubit.bloch.y.toFixed(3)}</strong>
            </div>
            <div className="bg-slate-950 p-1 rounded border border-slate-800/60">
              <span className="text-slate-500">⟨Z⟩:</span>{' '}
              <strong className="text-emerald-400">{currentInspectedQubit.bloch.z.toFixed(3)}</strong>
            </div>
          </div>

          {/* Polar & Azimuthal Angles */}
          <div className="flex items-center justify-between text-[10px] text-slate-400">
            <span>θ: {(currentInspectedQubit.bloch.theta * (180 / Math.PI)).toFixed(1)}°</span>
            <span>φ: {(currentInspectedQubit.bloch.phi * (180 / Math.PI)).toFixed(1)}°</span>
            <span className="text-emerald-400 font-semibold">
              P(|0⟩): {(currentInspectedQubit.prob0 * 100).toFixed(1)}%
            </span>
          </div>

          {/* Quick Jump Buttons for Circuit Qubits */}
          <div className="pt-1 border-t border-slate-800/60 flex items-center space-x-1 text-[10px]">
            <span className="text-slate-500">Jump:</span>
            {Array.from({ length: Math.min(qubitCount, 6) }).map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleJumpToQubit(idx)}
                className={`px-1.5 py-0.5 rounded border transition-colors ${
                  selectedQubitId === idx
                    ? 'bg-emerald-500 text-slate-950 font-bold border-emerald-400'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                q[{idx}]
              </button>
            ))}
            <button
              onClick={() => handleJumpToQubit(100)}
              className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
            >
              q[100]
            </button>
            <button
              onClick={() => handleJumpToQubit(5999)}
              className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 hover:text-white"
            >
              q[5999]
            </button>
          </div>
        </div>

        {/* HUD Overlay: Right Top - 6,000 Qubits Grid Search & Metrics */}
        <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-md border border-slate-800/90 rounded-xl p-3 text-xs font-mono text-slate-200 shadow-xl pointer-events-auto space-y-2 w-64">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-semibold text-slate-300 flex items-center space-x-1">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Hyperdimensional Bus</span>
            </span>
            <span className="text-emerald-400 font-bold">{fps} FPS</span>
          </div>

          {/* Direct Qubit ID Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const num = parseInt(searchQuery, 10);
              if (!isNaN(num)) handleJumpToQubit(num);
            }}
            className="flex items-center space-x-1"
          >
            <div className="relative flex-1">
              <input
                type="number"
                min="0"
                max={TOTAL_QUBITS - 1}
                placeholder="Qubit Index (0 - 5999)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-100 font-mono outline-none focus:border-emerald-500"
              />
            </div>
            <button
              type="submit"
              className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition-colors"
            >
              Go
            </button>
          </form>

          {/* Slider Qubit Scrubber */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>Selected Qubit:</span>
              <span className="text-emerald-400 font-bold">#{selectedQubitId}</span>
            </div>
            <input
              type="range"
              min="0"
              max={TOTAL_QUBITS - 1}
              value={selectedQubitId}
              onChange={(e) => handleJumpToQubit(parseInt(e.target.value, 10))}
              className="w-full accent-emerald-500 h-1 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          {/* Scene Telemetry */}
          <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-800/80 pt-1.5">
            <div className="flex justify-between">
              <span>Total Qubits:</span>
              <strong className="text-slate-200">6,000 Active Nodes</strong>
            </div>
            <div className="flex justify-between">
              <span>Grid Structure:</span>
              <span className="text-indigo-400 capitalize">{topology} Manifold</span>
            </div>
            <div className="flex justify-between">
              <span>4D Hyperspace W:</span>
              <span className="text-purple-400 font-mono">
                {currentInspectedQubit.w.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* Hover Tooltip Follower */}
        {hudTooltip && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-950/95 border border-emerald-500/50 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-slate-100 shadow-2xl -translate-x-1/2 -translate-y-full mb-2 backdrop-blur-md"
            style={{
              left: Math.max(100, Math.min(window.innerWidth - 100, hudTooltip.x)),
              top: Math.max(40, hudTooltip.y - 10),
            }}
          >
            <div className="font-bold text-emerald-400 flex items-center space-x-1">
              <span>Qubit #{hudTooltip.qubit.id}</span>
              {hudTooltip.qubit.isCircuitActive && (
                <span className="text-[9px] px-1 rounded bg-emerald-500/20 text-emerald-300">Circuit</span>
              )}
            </div>
            <div className="text-slate-400 text-[10px]">
              ⟨Z⟩: {hudTooltip.qubit.bloch.z.toFixed(2)} • φ: {(hudTooltip.qubit.bloch.phi * (180 / Math.PI)).toFixed(0)}° • P(|1⟩): {(hudTooltip.qubit.prob1 * 100).toFixed(0)}%
            </div>
            <div className="text-[9px] text-cyan-400">Click to project on 3D Bloch Sphere</div>
          </div>
        )}

        {/* Bottom Orbit Navigation Controls Hint */}
        <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur border border-slate-800/80 rounded-xl px-3 py-1.5 text-[11px] font-mono text-slate-400 flex items-center space-x-3 pointer-events-none">
          <span>🖱️ Left-Drag: Orbit 360°</span>
          <span>Right-Drag: Pan</span>
          <span>Wheel: Zoom</span>
          <span>Click: Select Qubit</span>
        </div>
      </div>
    </div>
  );
};
