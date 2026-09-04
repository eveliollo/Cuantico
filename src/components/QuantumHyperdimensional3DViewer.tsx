import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import {
  Maximize2,
  Minimize2,
  RotateCcw,
  Volume2,
  VolumeX,
  Vibrate,
  Sparkles,
  Eye,
  Layers,
  Box,
  Zap,
  Activity,
  Compass,
  Cpu,
  Sliders,
  Palette,
  Camera,
  Radio,
  Disc
} from 'lucide-react';
import {
  InterpetacionFisica,
  EstadoSimulacionFisica,
  simularPasoFisico,
  PhysicalSystemKind
} from '../core/physicsSimulationEngine';
import { quantumVibrationEngine } from '../core/quantumVibrationEngine';

// Visual Themes for Special Effects
export type FxThemeId = 'cyber_neon' | 'solar_plasma' | 'cryo_aurora' | 'void_horizon';

export interface FxThemeConfig {
  id: FxThemeId;
  name: string;
  primaryColor: number;
  secondaryColor: number;
  accentColor: number;
  fogColor: number;
  glowColorHex: string;
  badgeBg: string;
}

export const FX_THEMES: Record<FxThemeId, FxThemeConfig> = {
  cyber_neon: {
    id: 'cyber_neon',
    name: 'Cyber Neon',
    primaryColor: 0x06b6d4, // cyan
    secondaryColor: 0xd946ef, // magenta
    accentColor: 0x8b5cf6, // purple
    fogColor: 0x030712, // deep black
    glowColorHex: '#06b6d4',
    badgeBg: 'from-cyan-500/30 to-fuchsia-500/30 text-cyan-200 border-cyan-400/40',
  },
  solar_plasma: {
    id: 'solar_plasma',
    name: 'Plasma Solar',
    primaryColor: 0xf59e0b, // amber gold
    secondaryColor: 0xef4444, // crimson
    accentColor: 0xfbbf24, // bright gold
    fogColor: 0x0b0704, // warm obsidian
    glowColorHex: '#f59e0b',
    badgeBg: 'from-amber-500/30 to-rose-500/30 text-amber-200 border-amber-400/40',
  },
  cryo_aurora: {
    id: 'cryo_aurora',
    name: 'Aurora Criogénica',
    primaryColor: 0x10b981, // emerald
    secondaryColor: 0x06b6d4, // aquamarine
    accentColor: 0x3b82f6, // electric blue
    fogColor: 0x02100d, // deep aurora green-black
    glowColorHex: '#10b981',
    badgeBg: 'from-emerald-500/30 to-cyan-500/30 text-emerald-200 border-emerald-400/40',
  },
  void_horizon: {
    id: 'void_horizon',
    name: 'Vacío Cósmico',
    primaryColor: 0x8b5cf6, // electric violet
    secondaryColor: 0xec4899, // hot pink
    accentColor: 0x6366f1, // indigo
    fogColor: 0x070314, // deep void violet
    glowColorHex: '#8b5cf6',
    badgeBg: 'from-purple-500/30 to-indigo-500/30 text-purple-200 border-purple-400/40',
  },
};

// Procedural Radial Glow Texture Generator for Radiant Particles
function createGlowSpriteTexture(size = 64): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const center = size / 2;

  const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  gradient.addColorStop(0.18, 'rgba(255, 255, 255, 0.9)');
  gradient.addColorStop(0.4, 'rgba(100, 220, 255, 0.55)');
  gradient.addColorStop(0.7, 'rgba(56, 189, 248, 0.18)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

interface QuantumHyperdimensional3DViewerProps {
  interpretacion: InterpetacionFisica;
  isPlaying: boolean;
  speed: number;
  showTrails: boolean;
  showFields: boolean;
  onStateUpdate?: (estado: EstadoSimulacionFisica) => void;
}

export const QuantumHyperdimensional3DViewer: React.FC<QuantumHyperdimensional3DViewerProps> = ({
  interpretacion,
  isPlaying,
  speed,
  showTrails,
  showFields,
  onStateUpdate,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Special Effects (FX) State
  const [fxTheme, setFxTheme] = useState<FxThemeId>('cyber_neon');
  const [fxGlowAura, setFxGlowAura] = useState<boolean>(true);
  const [fxCosmicStarfield, setFxCosmicStarfield] = useState<boolean>(true);
  const [fxShockwaves, setFxShockwaves] = useState<boolean>(true);
  const [fxCinematicDrift, setFxCinematicDrift] = useState<boolean>(true);
  const [fxHoloHud, setFxHoloHud] = useState<boolean>(true);
  const [showFxStudioPanel, setShowFxStudioPanel] = useState<boolean>(false);

  // Mode & Quality Toggles
  const [is4DMode, setIs4DMode] = useState<boolean>(true);
  const [isVibrationAudio, setIsVibrationAudio] = useState<boolean>(false);
  const [isHapticEnabled, setIsHapticEnabled] = useState<boolean>(true);
  const [vibrationIntensity, setVibrationIntensity] = useState<number>(0.7); // 0 to 1
  const [isUltra4K, setIsUltra4K] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Real-time metrics
  const [fps, setFps] = useState<number>(60);
  const [renderEnergy, setRenderEnergy] = useState<number>(0);
  const [active4DPhase, setActive4DPhase] = useState<number>(0);

  // Three.js internal references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const dynamicGroupRef = useRef<THREE.Group | null>(null);
  const tesseractGroupRef = useRef<THREE.Group | null>(null);
  const particlesMeshRef = useRef<THREE.Points | null>(null);
  const starfieldRef = useRef<THREE.Points | null>(null);
  const shockwavesGroupRef = useRef<THREE.Group | null>(null);
  const holographicEmitterRef = useRef<THREE.Group | null>(null);
  const glowTextureRef = useRef<THREE.CanvasTexture | null>(null);

  // Simulation time
  const timeRef = useRef<number>(0);
  const stepRef = useRef<number>(0);
  const estadoRef = useRef<EstadoSimulacionFisica>(simularPasoFisico(interpretacion.tipo, 0, 0));

  // Interactive Orbit Controls state (custom zero-dependency smooth orbit)
  const isDraggingRef = useRef<boolean>(false);
  const isRightDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraRotationRef = useRef<{ theta: number; phi: number; radius: number; target: THREE.Vector3 }>({
    theta: 0.8,
    phi: 0.6,
    radius: 42,
    target: new THREE.Vector3(0, 0, 0),
  });

  // Handle Fullscreen toggle
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

  // Reset Camera View
  const handleResetCamera = () => {
    cameraRotationRef.current = {
      theta: 0.8,
      phi: 0.6,
      radius: 42,
      target: new THREE.Vector3(0, 0, 0),
    };
    quantumVibrationEngine.triggerQuantumHapticPulse('micro');
  };

  // Toggle Quantum Audio Resonance
  const handleToggleAudio = () => {
    const next = !isVibrationAudio;
    setIsVibrationAudio(next);
    quantumVibrationEngine.setAudioEnabled(next);
    quantumVibrationEngine.triggerQuantumHapticPulse('pulse');
  };

  // Toggle Quantum Haptics
  const handleToggleHaptic = () => {
    const next = !isHapticEnabled;
    setIsHapticEnabled(next);
    quantumVibrationEngine.setHapticsEnabled(next);
    if (next) {
      quantumVibrationEngine.triggerQuantumHapticPulse('collapse');
    }
  };

  // Mouse & Touch Orbit Event Handlers
  const onMouseDown = (e: React.MouseEvent) => {
    if (e.button === 2) {
      isRightDraggingRef.current = true;
    } else {
      isDraggingRef.current = true;
    }
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const onMouseMove = (e: React.MouseEvent) => {
    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };

    if (isDraggingRef.current) {
      cameraRotationRef.current.theta -= deltaX * 0.008;
      cameraRotationRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, cameraRotationRef.current.phi - deltaY * 0.008)
      );
    } else if (isRightDraggingRef.current) {
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      if (cameraRef.current) {
        cameraRef.current.getWorldDirection(right);
        right.cross(up).normalize();
        cameraRotationRef.current.target.addScaledVector(right, -deltaX * 0.03);
        cameraRotationRef.current.target.y += deltaY * 0.03;
      }
    }
  };

  const onMouseUp = () => {
    isDraggingRef.current = false;
    isRightDraggingRef.current = false;
  };

  const onWheel = (e: React.WheelEvent) => {
    cameraRotationRef.current.radius = Math.max(
      8,
      Math.min(140, cameraRotationRef.current.radius + e.deltaY * 0.04)
    );
  };

  // Touch support for mobile devices
  const touchStartRef = useRef<{ x: number; y: number; dist?: number }>({ x: 0, y: 0 });
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      isDraggingRef.current = true;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      touchStartRef.current.dist = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDraggingRef.current) {
      const deltaX = e.touches[0].clientX - touchStartRef.current.x;
      const deltaY = e.touches[0].clientY - touchStartRef.current.y;
      touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };

      cameraRotationRef.current.theta -= deltaX * 0.009;
      cameraRotationRef.current.phi = Math.max(
        0.05,
        Math.min(Math.PI - 0.05, cameraRotationRef.current.phi - deltaY * 0.009)
      );
    } else if (e.touches.length === 2 && touchStartRef.current.dist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.sqrt(dx * dx + dy * dy);
      const diff = touchStartRef.current.dist - currentDist;
      touchStartRef.current.dist = currentDist;
      cameraRotationRef.current.radius = Math.max(
        8,
        Math.min(140, cameraRotationRef.current.radius + diff * 0.08)
      );
    }
  };

  const onTouchEnd = () => {
    isDraggingRef.current = false;
  };

  // Initialize Three.js Scene and Renderer
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const theme = FX_THEMES[fxTheme];

    // Scene with Theme-tuned Atmospheric Fog
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(theme.fogColor, 0.0075);
    sceneRef.current = scene;

    // Cache procedural glow sprite texture
    glowTextureRef.current = createGlowSpriteTexture(64);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    cameraRef.current = camera;

    // WebGL Renderer configured for 4K Sharpness
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      precision: 'highp',
    });

    const pixelRatio = isUltra4K ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    rendererRef.current = renderer;

    // Ambient and Directional Lights (Vibrant Theme Colors)
    const ambientLight = new THREE.AmbientLight(theme.primaryColor, 0.65);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(20, 40, 30);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(theme.secondaryColor, 1.2);
    dirLight2.position.set(-30, -20, -25);
    scene.add(dirLight2);

    // 1. Cosmic Nebula Starfield (1,800 Vacuum Fluctuations Particles)
    const starCount = 1800;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const colorPrimary = new THREE.Color(theme.primaryColor);
    const colorSecondary = new THREE.Color(theme.secondaryColor);
    const colorWhite = new THREE.Color(0xffffff);

    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 100 + Math.random() * 200;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const pick = Math.random();
      const c = pick < 0.4 ? colorPrimary : pick < 0.7 ? colorSecondary : colorWhite;
      starColors[i * 3] = c.r;
      starColors[i * 3 + 1] = c.g;
      starColors[i * 3 + 2] = c.b;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 2.2,
      map: glowTextureRef.current,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const starfield = new THREE.Points(starGeo, starMat);
    starfield.visible = fxCosmicStarfield;
    scene.add(starfield);
    starfieldRef.current = starfield;

    // 2. Holographic Quantum Emitter Pedestal (Concentric Rings & Radial Energy Spokes)
    const holoEmitter = new THREE.Group();
    holoEmitter.position.y = -14;
    scene.add(holoEmitter);
    holographicEmitterRef.current = holoEmitter;

    // Concentric glowing rings
    const ringRadii = [6, 14, 24, 36, 48];
    ringRadii.forEach((rad, idx) => {
      const ringGeo = new THREE.RingGeometry(rad - 0.12, rad + 0.12, 64);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: idx % 2 === 0 ? theme.primaryColor : theme.secondaryColor,
        transparent: true,
        opacity: idx === 0 ? 0.75 : Math.max(0.15, 0.45 - idx * 0.07),
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      holoEmitter.add(new THREE.Mesh(ringGeo, ringMat));
    });

    // 24 Radial laser lines
    const spokeCount = 24;
    const spokePositions: number[] = [];
    for (let i = 0; i < spokeCount; i++) {
      const ang = (i / spokeCount) * Math.PI * 2;
      spokePositions.push(0, 0, 0);
      spokePositions.push(48 * Math.cos(ang), 0, 48 * Math.sin(ang));
    }
    const spokeGeo = new THREE.BufferGeometry();
    spokeGeo.setAttribute('position', new THREE.Float32BufferAttribute(spokePositions, 3));
    const spokeMat = new THREE.LineBasicMaterial({
      color: theme.accentColor,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
    });
    holoEmitter.add(new THREE.LineSegments(spokeGeo, spokeMat));

    // Floor coordinate grid with subtle glow
    const gridHelper = new THREE.GridHelper(80, 40, theme.primaryColor, 0x0f172a);
    gridHelper.position.y = -0.05;
    holoEmitter.add(gridHelper);

    // 3. Dynamic Shockwave Rings Group
    const shockwavesGroup = new THREE.Group();
    shockwavesGroup.position.y = -13.8;
    scene.add(shockwavesGroup);
    shockwavesGroupRef.current = shockwavesGroup;

    for (let i = 0; i < 3; i++) {
      const sGeo = new THREE.RingGeometry(1.0, 1.8, 64);
      sGeo.rotateX(-Math.PI / 2);
      const sMat = new THREE.MeshBasicMaterial({
        color: theme.primaryColor,
        transparent: true,
        opacity: 0.7,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
      });
      const sMesh = new THREE.Mesh(sGeo, sMat);
      sMesh.name = `shockwave_${i}`;
      sMesh.userData = { phaseOffset: i * 0.33 };
      shockwavesGroup.add(sMesh);
    }
    shockwavesGroup.visible = fxShockwaves;

    // Dynamic Group for physical models
    const dynamicGroup = new THREE.Group();
    scene.add(dynamicGroup);
    dynamicGroupRef.current = dynamicGroup;

    // 4D Tesseract Group
    const tesseractGroup = new THREE.Group();
    scene.add(tesseractGroup);
    tesseractGroupRef.current = tesseractGroup;

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0 && cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(width, height);
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      renderer.dispose();
    };
  }, [isUltra4K, fxTheme]);

  // Build / Rebuild 3D Meshes when Interpretation changes
  useEffect(() => {
    const scene = sceneRef.current;
    const dynamicGroup = dynamicGroupRef.current;
    if (!scene || !dynamicGroup) return;

    // Clear previous models cleanly
    while (dynamicGroup.children.length > 0) {
      const obj = dynamicGroup.children[0];
      dynamicGroup.remove(obj);
      if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    }

    const tipo = interpretacion.tipo;

    // -------------------------------------------------------------
    // 1. ÁTOMO DE HIDRÓGENO 3D/4D: Nube de electrones probabilística
    // -------------------------------------------------------------
    if (tipo === 'hydrogen_atom') {
      // Núcleo protónico radiante
      const protonGeo = new THREE.SphereGeometry(1.6, 32, 32);
      const protonMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 1.2,
        roughness: 0.2,
        metalness: 0.8,
      });
      const protonMesh = new THREE.Mesh(protonGeo, protonMat);
      dynamicGroup.add(protonMesh);

      // Volumetric Quantum Aura around Proton
      const protonAuraGeo = new THREE.SphereGeometry(2.5, 32, 32);
      const protonAuraMat = new THREE.MeshBasicMaterial({
        color: 0xf43f5e,
        transparent: true,
        opacity: 0.35,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      });
      const protonAuraMesh = new THREE.Mesh(protonAuraGeo, protonAuraMat);
      protonAuraMesh.name = 'proton_aura';
      protonAuraMesh.visible = fxGlowAura;
      dynamicGroup.add(protonAuraMesh);

      // Luz puntual local del protón
      const protonLight = new THREE.PointLight(0xf43f5e, 2.8, 35);
      protonMesh.add(protonLight);

      // Anillos de Bohr cuánticos (n=1, n=2, n=3)
      const bohrRadii = [8, 15, 24];
      bohrRadii.forEach((r, idx) => {
        const ringGeo = new THREE.RingGeometry(r - 0.1, r + 0.1, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: idx === 0 ? 0x38bdf8 : idx === 1 ? 0xa855f7 : 0xec4899,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.45,
          blending: THREE.AdditiveBlending,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2;
        dynamicGroup.add(ringMesh);
      });

      // Nube de probabilidad cuántica con 4,200 partículas radiantes con Glow
      const particleCount = 4200;
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      const color1 = new THREE.Color(0x38bdf8); // cian
      const color2 = new THREE.Color(0xa855f7); // morado
      const color3 = new THREE.Color(0xf43f5e); // rosa

      for (let i = 0; i < particleCount; i++) {
        // Distribución radial del orbital 2p / 1s combinados
        const u = Math.random();
        const r = 4 + 18 * Math.pow(u, 1.6);
        const theta = Math.acos(2 * Math.random() - 1);
        const phi = Math.random() * Math.PI * 2;

        const x = r * Math.sin(theta) * Math.cos(phi);
        const y = r * Math.sin(theta) * Math.sin(phi);
        const z = r * Math.cos(theta);

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        const mixColor = r < 10 ? color1 : r < 18 ? color2 : color3;
        colors[i * 3] = mixColor.r;
        colors[i * 3 + 1] = mixColor.g;
        colors[i * 3 + 2] = mixColor.b;
      }

      const particleGeo = new THREE.BufferGeometry();
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const particleMat = new THREE.PointsMaterial({
        size: 1.35,
        map: glowTextureRef.current,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const particleSystem = new THREE.Points(particleGeo, particleMat);
      dynamicGroup.add(particleSystem);
      particlesMeshRef.current = particleSystem;
    }

    // -------------------------------------------------------------
    // 2. PAR BELL CUÁNTICO (EPR) 3D: Dos esferas de Bloch & Puente ER
    // -------------------------------------------------------------
    else if (tipo === 'bell_state' || tipo === 'quantum_circuit') {
      const blochRadius = 7.5;
      const createBlochSphere = (offsetX: number, labelColor: number) => {
        const group = new THREE.Group();
        group.position.x = offsetX;

        // Esfera transparente
        const sphereGeo = new THREE.SphereGeometry(blochRadius, 32, 32);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: labelColor,
          transparent: true,
          opacity: 0.18,
          roughness: 0.1,
          metalness: 0.4,
          wireframe: false,
        });
        group.add(new THREE.Mesh(sphereGeo, sphereMat));

        // Meridianos y Ecuadores
        const wireGeo = new THREE.WireframeGeometry(sphereGeo);
        const wireMat = new THREE.LineBasicMaterial({
          color: labelColor,
          transparent: true,
          opacity: 0.35,
        });
        group.add(new THREE.LineSegments(wireGeo, wireMat));

        // Ejes X, Y, Z
        const axesHelper = new THREE.AxesHelper(blochRadius * 1.3);
        group.add(axesHelper);

        // Vector de estado de Bloch
        const arrowDir = new THREE.Vector3(0, 1, 0).normalize();
        const arrowHelper = new THREE.ArrowHelper(
          arrowDir,
          new THREE.Vector3(0, 0, 0),
          blochRadius * 0.95,
          0x38bdf8,
          1.2,
          0.8
        );
        arrowHelper.name = `arrow_${offsetX}`;
        group.add(arrowHelper);

        return group;
      };

      const sphereA = createBlochSphere(-15, 0x06b6d4); // Qubit A Cian
      const sphereB = createBlochSphere(15, 0xa855f7); // Qubit B Violeta
      dynamicGroup.add(sphereA);
      dynamicGroup.add(sphereB);

      // Puente de Entrelazamiento Einstein-Rosen (Gusano Cuántico)
      const bridgeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-15, 0, 0),
        new THREE.Vector3(-7, 3, 2),
        new THREE.Vector3(0, 0, -2),
        new THREE.Vector3(7, -3, 2),
        new THREE.Vector3(15, 0, 0),
      ]);
      const bridgeGeo = new THREE.TubeGeometry(bridgeCurve, 64, 0.45, 12, false);
      const bridgeMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xf43f5e,
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.75,
        wireframe: true,
      });
      const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
      bridgeMesh.name = 'entanglement_bridge';
      dynamicGroup.add(bridgeMesh);
    }

    // -------------------------------------------------------------
    // 3. OSCILADOR ARMÓNICO 3D: Pozo parabólico y superficie de onda
    // -------------------------------------------------------------
    else if (tipo === 'harmonic_oscillator') {
      // Pozo de potencial parabólico 3D
      const gridW = 50;
      const gridH = 50;
      const planeGeo = new THREE.PlaneGeometry(36, 36, gridW, gridH);
      planeGeo.rotateX(-Math.PI / 2);

      const pos = planeGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const r2 = (x * x + z * z) / 80;
        pos.setY(i, r2 - 5);
      }
      planeGeo.computeVertexNormals();

      const planeMat = new THREE.MeshStandardMaterial({
        color: 0x0284c7,
        emissive: 0x0369a1,
        emissiveIntensity: 0.3,
        wireframe: true,
        transparent: true,
        opacity: 0.5,
      });
      const wellMesh = new THREE.Mesh(planeGeo, planeMat);
      dynamicGroup.add(wellMesh);

      // Paquete de onda gaussiano brillante
      const waveGeo = new THREE.SphereGeometry(3.5, 32, 32);
      const waveMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 1.0,
        roughness: 0.1,
      });
      const waveMesh = new THREE.Mesh(waveGeo, waveMat);
      waveMesh.name = 'gaussian_wavepacket';
      dynamicGroup.add(waveMesh);
    }

    // -------------------------------------------------------------
    // 4. DISPERSIÓN DE RUTHERFORD 3D: Núcleo de Oro Au 79+ & Alfas
    // -------------------------------------------------------------
    else if (tipo === 'particle_collision') {
      // Núcleo de Oro Au 79+
      const goldGeo = new THREE.SphereGeometry(3.2, 32, 32);
      const goldMat = new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xd97706,
        emissiveIntensity: 0.9,
        metalness: 0.9,
        roughness: 0.2,
      });
      const goldNucleus = new THREE.Mesh(goldGeo, goldMat);
      dynamicGroup.add(goldNucleus);

      // Gold Nucleus Volumetric Corona Aura
      const goldAuraGeo = new THREE.SphereGeometry(4.2, 32, 32);
      const goldAuraMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        transparent: true,
        opacity: 0.35,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
      });
      const goldAuraMesh = new THREE.Mesh(goldAuraGeo, goldAuraMat);
      goldAuraMesh.name = 'gold_aura';
      goldAuraMesh.visible = fxGlowAura;
      dynamicGroup.add(goldAuraMesh);

      const goldLight = new THREE.PointLight(0xfbbf24, 3.5, 45);
      goldNucleus.add(goldLight);

      // Partícula alfa entrante
      const alphaGeo = new THREE.SphereGeometry(1.2, 24, 24);
      const alphaMat = new THREE.MeshStandardMaterial({
        color: 0xf43f5e,
        emissive: 0xe11d48,
        emissiveIntensity: 1.4,
      });
      const alphaMesh = new THREE.Mesh(alphaGeo, alphaMat);
      alphaMesh.name = 'alpha_particle';
      dynamicGroup.add(alphaMesh);

      // Estela de plasma iónico con partículas radiantes Glow
      const trailCount = 120;
      const trailPositions = new Float32Array(trailCount * 3);
      const trailColors = new Float32Array(trailCount * 3);
      const trailGeo = new THREE.BufferGeometry();
      trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
      trailGeo.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
      const trailMat = new THREE.PointsMaterial({
        size: 1.1,
        map: glowTextureRef.current,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const trailPoints = new THREE.Points(trailGeo, trailMat);
      trailPoints.name = 'rutherford_trail';
      dynamicGroup.add(trailPoints);
    }

    // -------------------------------------------------------------
    // 5. CADENA DE ISING 3D: Red cristalina de espines cuánticos
    // -------------------------------------------------------------
    else if (tipo === 'spin_chain') {
      const spinCount = 16;
      const spacing = 2.2;
      const startX = -((spinCount - 1) * spacing) / 2;

      for (let i = 0; i < spinCount; i++) {
        const arrowHelper = new THREE.ArrowHelper(
          new THREE.Vector3(0, 1, 0),
          new THREE.Vector3(startX + i * spacing, 0, 0),
          4.5,
          i % 2 === 0 ? 0x06b6d4 : 0xf43f5e,
          1.0,
          0.6
        );
        arrowHelper.name = `spin_${i}`;
        dynamicGroup.add(arrowHelper);

        // Esfera base en el sitio de la red
        const siteGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const siteMat = new THREE.MeshBasicMaterial({ color: 0x475569 });
        const siteMesh = new THREE.Mesh(siteGeo, siteMat);
        siteMesh.position.set(startX + i * spacing, 0, 0);
        dynamicGroup.add(siteMesh);
      }
    }

    // -------------------------------------------------------------
    // 6. EXPERIMENTO DE LA DOBLE RENDIJA 3D: Barrera & Franjas Born
    // -------------------------------------------------------------
    else if (tipo === 'double_slit') {
      // Barrera con dos hendiduras
      const barrierGeo = new THREE.BoxGeometry(0.5, 18, 28);
      const barrierMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.7,
        roughness: 0.4,
      });
      const barrierMesh = new THREE.Mesh(barrierGeo, barrierMat);
      barrierMesh.position.x = -8;
      dynamicGroup.add(barrierMesh);

      // Pantalla detectora de fósforo al fondo
      const screenGeo = new THREE.BoxGeometry(0.5, 20, 32);
      const screenMat = new THREE.MeshStandardMaterial({
        color: 0x0f172a,
        emissive: 0x0284c7,
        emissiveIntensity: 0.2,
      });
      const screenMesh = new THREE.Mesh(screenGeo, screenMat);
      screenMesh.position.x = 18;
      dynamicGroup.add(screenMesh);

      // Nube volumétrica de paquetes de ondas que interfieren
      const waveCount = 2000;
      const wavePositions = new Float32Array(waveCount * 3);
      const waveColors = new Float32Array(waveCount * 3);
      const colorWave = new THREE.Color(0x38bdf8);
      const colorIntens = new THREE.Color(0xa855f7);

      for (let i = 0; i < waveCount; i++) {
        const x = -6 + Math.random() * 24;
        const z = -14 + Math.random() * 28;
        const y = -8 + Math.random() * 16;
        wavePositions[i * 3] = x;
        wavePositions[i * 3 + 1] = y;
        wavePositions[i * 3 + 2] = z;

        const mix = Math.sin(z * 0.8) > 0 ? colorWave : colorIntens;
        waveColors[i * 3] = mix.r;
        waveColors[i * 3 + 1] = mix.g;
        waveColors[i * 3 + 2] = mix.b;
      }

      const waveInterfGeo = new THREE.BufferGeometry();
      waveInterfGeo.setAttribute('position', new THREE.BufferAttribute(wavePositions, 3));
      waveInterfGeo.setAttribute('color', new THREE.BufferAttribute(waveColors, 3));
      const waveInterfMat = new THREE.PointsMaterial({
        size: 1.35,
        map: glowTextureRef.current,
        vertexColors: true,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const waveInterfPoints = new THREE.Points(waveInterfGeo, waveInterfMat);
      waveInterfPoints.name = 'interference_cloud';
      dynamicGroup.add(waveInterfPoints);
    }

    // Reset physics step state for the active system
    timeRef.current = 0;
    stepRef.current = 0;
    estadoRef.current = simularPasoFisico(interpretacion.tipo, 0, 0);
  }, [interpretacion.tipo]);

  // Build 4D Tesseract (Hypercube) Geometry & Edges
  useEffect(() => {
    const tesseractGroup = tesseractGroupRef.current;
    if (!tesseractGroup) return;

    // Clear previous
    while (tesseractGroup.children.length > 0) {
      const child = tesseractGroup.children[0];
      tesseractGroup.remove(child);
      if (child instanceof THREE.LineSegments) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }

    if (!is4DMode) return;

    // 16 vertices of a 4D Hypercube [-1, 1]^4
    const vertices4D: number[][] = [];
    for (let i = 0; i < 16; i++) {
      vertices4D.push([
        (i & 1 ? 1 : -1) * 12,
        (i & 2 ? 1 : -1) * 12,
        (i & 4 ? 1 : -1) * 12,
        (i & 8 ? 1 : -1) * 12,
      ]);
    }

    // 32 Edges connecting vertices that differ by exactly 1 bit
    const edges: number[] = [];
    for (let i = 0; i < 16; i++) {
      for (let bit = 1; bit < 16; bit <<= 1) {
        if ((i & bit) === 0) {
          edges.push(i, i | bit);
        }
      }
    }

    const tesseractGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(edges.length * 3);
    tesseractGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const tesseractMat = new THREE.LineBasicMaterial({
      color: 0xec4899,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
    });

    const tesseractLines = new THREE.LineSegments(tesseractGeo, tesseractMat);
    tesseractLines.name = 'hypercube_tesseract';
    tesseractGroup.add(tesseractLines);
  }, [is4DMode]);

  // Main 60 FPS Render & Animation Loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let frameCounter = 0;
    let fpsTimer = performance.now();

    const animate = (currentTime: number) => {
      const deltaMs = currentTime - lastTime;
      lastTime = currentTime;

      // Measure FPS
      frameCounter++;
      if (currentTime - fpsTimer >= 1000) {
        setFps(frameCounter);
        frameCounter = 0;
        fpsTimer = currentTime;
      }

      // Step physics simulation
      if (isPlaying) {
        const dt = (deltaMs / 1000) * speed;
        timeRef.current += dt;
        stepRef.current += 1;

        const nextEstado = simularPasoFisico(
          interpretacion.tipo,
          timeRef.current,
          stepRef.current,
          estadoRef.current
        );
        estadoRef.current = nextEstado;

        setRenderEnergy(nextEstado.energiaTotal);
        setActive4DPhase(nextEstado.faseCuanticaRad);

        if (onStateUpdate) {
          onStateUpdate(nextEstado);
        }

        // Quantum Vibration Engine: modulate Audio resonance
        quantumVibrationEngine.updateQuantumResonance(
          nextEstado.energiaTotal,
          nextEstado.faseCuanticaRad,
          nextEstado.entrelazamientoEntropia
        );

        // Haptic micro-vibration pulse on quantum phase resonance
        if (Math.sin(nextEstado.faseCuanticaRad * 3) > 0.96) {
          quantumVibrationEngine.triggerQuantumHapticPulse('micro');
        }
      }

      const t = timeRef.current;
      const est = estadoRef.current;

      // 1. Cinematic Auto-Orbit Drone Camera Sweep (if not dragging)
      if (fxCinematicDrift && !isDraggingRef.current && isPlaying) {
        cameraRotationRef.current.theta += 0.0022;
      }

      // 2. Animate Special Effects: Cosmic Starfield, Holographic Emitter & Shockwaves
      if (starfieldRef.current) {
        starfieldRef.current.visible = fxCosmicStarfield;
        starfieldRef.current.rotation.y = -t * 0.012;
        starfieldRef.current.rotation.x = Math.sin(t * 0.04) * 0.015;
      }

      if (holographicEmitterRef.current) {
        holographicEmitterRef.current.rotation.y = t * 0.035;
      }

      if (shockwavesGroupRef.current) {
        shockwavesGroupRef.current.visible = fxShockwaves;
        if (fxShockwaves) {
          shockwavesGroupRef.current.children.forEach((child, idx) => {
            const mesh = child as THREE.Mesh;
            const phase = ((t * 0.7 + idx * 0.33) % 1.0);
            const scale = 1 + phase * 30;
            mesh.scale.set(scale, scale, 1);
            if (mesh.material instanceof THREE.MeshBasicMaterial) {
              mesh.material.opacity = Math.max(0, (1 - phase) * 0.65);
            }
          });
        }
      }

      // 3. Update Camera Position via Orbit Math + Micro-vibration (Zitterbewegung)
      if (cameraRef.current) {
        const camRot = cameraRotationRef.current;
        const xCam = camRot.radius * Math.sin(camRot.phi) * Math.sin(camRot.theta);
        const yCam = camRot.radius * Math.cos(camRot.phi);
        const zCam = camRot.radius * Math.sin(camRot.phi) * Math.cos(camRot.theta);

        // Quantum Vacuum Micro-vibration (jitter proportional to intensity)
        const microJitterX = (Math.sin(t * 45) * 0.04) * vibrationIntensity;
        const microJitterY = (Math.cos(t * 38) * 0.04) * vibrationIntensity;

        cameraRef.current.position.set(
          xCam + camRot.target.x + microJitterX,
          yCam + camRot.target.y + microJitterY,
          zCam + camRot.target.z
        );
        cameraRef.current.lookAt(camRot.target);
      }

      // 4. Animate 3D Models according to system type
      const dynamicGroup = dynamicGroupRef.current;
      if (dynamicGroup) {
        const tipo = interpretacion.tipo;

        // Hidrógeno: rotación orbital, pulsación cuántica y aura
        if (tipo === 'hydrogen_atom') {
          dynamicGroup.rotation.y = t * 0.45;
          dynamicGroup.rotation.z = Math.sin(t * 0.25) * 0.15;

          const protonAura = dynamicGroup.getObjectByName('proton_aura') as THREE.Mesh;
          if (protonAura) {
            protonAura.visible = fxGlowAura;
            const s = 1.0 + Math.sin(t * 5.5) * 0.18;
            protonAura.scale.set(s, s, s);
          }

          if (particlesMeshRef.current) {
            particlesMeshRef.current.rotation.y = -t * 0.6;
            particlesMeshRef.current.rotation.x = Math.sin(t * 0.3) * 0.2;
          }
        }

        // Par Bell EPR: rotación de vectores de Bloch y ondulación del puente ER
        else if (tipo === 'bell_state' || tipo === 'quantum_circuit') {
          const arrowA = dynamicGroup.getObjectByName('arrow_-15') as THREE.ArrowHelper;
          const arrowB = dynamicGroup.getObjectByName('arrow_15') as THREE.ArrowHelper;
          if (arrowA && arrowB) {
            const dirA = new THREE.Vector3(
              Math.sin(t * 1.5),
              Math.cos(t * 1.5),
              Math.sin(t * 0.8)
            ).normalize();
            // Correlación entrelazada opuesta
            const dirB = new THREE.Vector3(
              -Math.sin(t * 1.5),
              -Math.cos(t * 1.5),
              -Math.sin(t * 0.8)
            ).normalize();
            arrowA.setDirection(dirA);
            arrowB.setDirection(dirB);
          }

          const bridge = dynamicGroup.getObjectByName('entanglement_bridge') as THREE.Mesh;
          if (bridge) {
            bridge.rotation.x = t * 0.8;
          }
        }

        // Oscilador armónico: oscilación del paquete gaussiano
        else if (tipo === 'harmonic_oscillator') {
          const wavepacket = dynamicGroup.getObjectByName('gaussian_wavepacket') as THREE.Mesh;
          if (wavepacket) {
            wavepacket.position.x = Math.sin(t * 2.2) * 11;
            wavepacket.position.z = Math.cos(t * 1.8) * 8;
            const r2 = (wavepacket.position.x * wavepacket.position.x + wavepacket.position.z * wavepacket.position.z) / 80;
            wavepacket.position.y = r2 - 4.5 + Math.sin(t * 4) * 0.4;
          }
        }

        // Rutherford: trayectoria hiperbólica de alfa y aura de oro
        else if (tipo === 'particle_collision') {
          const alpha = dynamicGroup.getObjectByName('alpha_particle') as THREE.Mesh;
          if (alpha) {
            // Curva hiperbólica aproximada según el estado físico
            alpha.position.x = est.posicionPrincipal.x * 0.15;
            alpha.position.y = est.posicionPrincipal.y * 0.15;
            alpha.position.z = Math.sin(t * 2) * 2.5;
          }

          const goldAura = dynamicGroup.getObjectByName('gold_aura') as THREE.Mesh;
          if (goldAura) {
            goldAura.visible = fxGlowAura;
            const s = 1.0 + Math.sin(t * 4) * 0.14;
            goldAura.scale.set(s, s, s);
          }
        }

        // Cadena de Ising: precesión de espines
        else if (tipo === 'spin_chain') {
          for (let i = 0; i < 16; i++) {
            const spin = dynamicGroup.getObjectByName(`spin_${i}`) as THREE.ArrowHelper;
            if (spin) {
              const spinPhase = t * 2.5 + i * 0.4;
              const dir = new THREE.Vector3(
                Math.sin(spinPhase) * 0.5,
                Math.cos(spinPhase * 0.7),
                Math.sin(spinPhase * 1.2) * 0.5
              ).normalize();
              spin.setDirection(dir);
            }
          }
        }

        // Doble rendija: pulsación de las ondas
        else if (tipo === 'double_slit') {
          const cloud = dynamicGroup.getObjectByName('interference_cloud') as THREE.Points;
          if (cloud) {
            cloud.rotation.y = Math.sin(t * 0.4) * 0.08;
          }
        }
      }

      // 3. Proyección 4D: Rotación en el Hiperplano (xw, yw, zw) del Tesseract
      if (is4DMode && tesseractGroupRef.current) {
        const tesseractLines = tesseractGroupRef.current.getObjectByName('hypercube_tesseract') as THREE.LineSegments;
        if (tesseractLines) {
          const posAttr = tesseractLines.geometry.attributes.position as THREE.BufferAttribute;
          const theta4D = t * 0.4; // ángulo de rotación hiperdimensional 4D

          // 16 vértices en 4D
          const base4D: number[][] = [];
          for (let i = 0; i < 16; i++) {
            base4D.push([
              (i & 1 ? 1 : -1) * 9,
              (i & 2 ? 1 : -1) * 9,
              (i & 4 ? 1 : -1) * 9,
              (i & 8 ? 1 : -1) * 9,
            ]);
          }

          // Matriz de rotación en plano X-W y Y-Z
          const cosTheta = Math.cos(theta4D);
          const sinTheta = Math.sin(theta4D);
          const d4D = 22; // distancia de proyección 4D -> 3D

          const projected3D: number[][] = base4D.map(([x, y, z, w]) => {
            // Rotación 4D en plano (x, w)
            const xRot = x * cosTheta - w * sinTheta;
            const wRot = x * sinTheta + w * cosTheta;
            // Proyección estereográfica hiperdimensional
            const factor = d4D / (d4D - wRot);
            return [xRot * factor, y * factor, z * factor];
          });

          // Aristas del hipercubo
          const edges: number[] = [];
          for (let i = 0; i < 16; i++) {
            for (let bit = 1; bit < 16; bit <<= 1) {
              if ((i & bit) === 0) {
                edges.push(i, i | bit);
              }
            }
          }

          for (let e = 0; e < edges.length; e++) {
            const vIdx = edges[e];
            const p = projected3D[vIdx];
            posAttr.setXYZ(e, p[0], p[1], p[2]);
          }
          posAttr.needsUpdate = true;
        }
      }

      // 4. Render WebGL Frame
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isPlaying, speed, is4DMode, vibrationIntensity, interpretacion.tipo, onStateUpdate]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none h-screen' : 'h-[520px] sm:h-[620px]'
      }`}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onWheel={onWheel}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Three.js Render Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />

      {/* Top Floating Futuristic HUD Bar */}
      <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: System Title & 4D/3D Mode Tag */}
        <div className="flex items-center space-x-2 bg-slate-900/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
          <span className="text-xs font-bold text-white font-mono tracking-wide">
            {interpretacion.nombre}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
            {is4DMode ? '4D Tesseract • Hiperespacio' : '3D Ultra-HD Espacial'}
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-teal-500/20 text-teal-300 border border-teal-500/40">
            {isUltra4K ? '4K UHD • 60 FPS' : '1080p'}
          </span>
        </div>

        {/* Right: Actions (FX Studio, 4D Toggle, 4K, Audio, Haptics, Reset, Fullscreen) */}
        <div className="flex items-center space-x-1.5 bg-slate-900/85 backdrop-blur-md p-1 rounded-xl border border-slate-700/60 shadow-lg pointer-events-auto">
          {/* Special Effects (FX Studio) Button */}
          <button
            onClick={() => setShowFxStudioPanel(!showFxStudioPanel)}
            title="Abrir Estudio de Efectos Especiales y Gráficos"
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              showFxStudioPanel
                ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-md shadow-rose-500/30 ring-1 ring-amber-300/40'
                : 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
            <span>FX Especiales</span>
          </button>

          {/* 4D Mode Button */}
          <button
            onClick={() => {
              setIs4DMode(!is4DMode);
              quantumVibrationEngine.triggerQuantumHapticPulse('pulse');
            }}
            title={is4DMode ? 'Desactivar Proyección 4D' : 'Activar Proyección 4D Hiperdimensional'}
            className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              is4DMode
                ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>4D</span>
          </button>

          {/* 4K Ultra-HD Quality Toggle */}
          <button
            onClick={() => setIsUltra4K(!isUltra4K)}
            title={isUltra4K ? '4K UHD Activo' : 'Activar 4K UHD'}
            className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
              isUltra4K
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            4K
          </button>

          {/* Audio Quantum Resonance Vibration */}
          <button
            onClick={handleToggleAudio}
            title={isVibrationAudio ? 'Silenciar Resonancia Cuántica' : 'Activar Vibración Sonora Cuántica (Web Audio)'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isVibrationAudio
                ? 'bg-purple-500 text-white shadow-md shadow-purple-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {isVibrationAudio ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Haptic Vibration */}
          <button
            onClick={handleToggleHaptic}
            title={isHapticEnabled ? 'Vibración Háptica Cuántica ON' : 'Vibración Háptica OFF'}
            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
              isHapticEnabled
                ? 'bg-rose-500 text-white shadow-md shadow-rose-500/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Vibrate className="w-4 h-4" />
          </button>

          {/* Reset Camera Orbit */}
          <button
            onClick={handleResetCamera}
            title="Centrar y Resetear Cámara 3D"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            title="Pantalla Completa 4K"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* FX Studio Popover Panel */}
      {showFxStudioPanel && (
        <div className="absolute top-14 right-3 z-30 w-80 bg-slate-950/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white uppercase tracking-wider text-[11px]">
                Estudio FX Cuántico
              </span>
            </div>
            <button
              onClick={() => setShowFxStudioPanel(false)}
              className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800"
            >
              ✕
            </button>
          </div>

          {/* Themes Selection */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1.5">
              Tema Visual y Paleta Cromática
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {(Object.keys(FX_THEMES) as FxThemeId[]).map((themeKey) => {
                const tConfig = FX_THEMES[themeKey];
                const active = fxTheme === themeKey;
                return (
                  <button
                    key={themeKey}
                    onClick={() => {
                      setFxTheme(themeKey);
                      quantumVibrationEngine.triggerQuantumHapticPulse('micro');
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-left transition-all border flex items-center justify-between ${
                      active
                        ? 'bg-slate-800 border-amber-400/60 text-white shadow-sm'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <span className="text-[11px] truncate">{tConfig.name}</span>
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: tConfig.glowColorHex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* FX Toggles */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
              Efectos Especiales Activos
            </label>

            {/* Aura & Glow */}
            <button
              onClick={() => setFxGlowAura(!fxGlowAura)}
              className={`w-full px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all ${
                fxGlowAura
                  ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Disc className="w-3.5 h-3.5 text-rose-400" />
                <span>Aura y Resplandor Cuántico</span>
              </div>
              <span className={`text-[10px] font-bold ${fxGlowAura ? 'text-rose-400' : 'text-slate-500'}`}>
                {fxGlowAura ? 'ACTIVO' : 'OFF'}
              </span>
            </button>

            {/* Cosmic Starfield */}
            <button
              onClick={() => setFxCosmicStarfield(!fxCosmicStarfield)}
              className={`w-full px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all ${
                fxCosmicStarfield
                  ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Espacio Cósmico (1,800 Estrellas)</span>
              </div>
              <span className={`text-[10px] font-bold ${fxCosmicStarfield ? 'text-cyan-400' : 'text-slate-500'}`}>
                {fxCosmicStarfield ? 'ACTIVO' : 'OFF'}
              </span>
            </button>

            {/* Shockwaves */}
            <button
              onClick={() => setFxShockwaves(!fxShockwaves)}
              className={`w-full px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all ${
                fxShockwaves
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Radio className="w-3.5 h-3.5 text-amber-400" />
                <span>Ondas de Choque de Fase</span>
              </div>
              <span className={`text-[10px] font-bold ${fxShockwaves ? 'text-amber-400' : 'text-slate-500'}`}>
                {fxShockwaves ? 'ACTIVO' : 'OFF'}
              </span>
            </button>

            {/* Drone Camera Auto-Orbit */}
            <button
              onClick={() => setFxCinematicDrift(!fxCinematicDrift)}
              className={`w-full px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all ${
                fxCinematicDrift
                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Camera className="w-3.5 h-3.5 text-emerald-400" />
                <span>Cámara Cinemática 360°</span>
              </div>
              <span className={`text-[10px] font-bold ${fxCinematicDrift ? 'text-emerald-400' : 'text-slate-500'}`}>
                {fxCinematicDrift ? 'ACTIVO' : 'OFF'}
              </span>
            </button>

            {/* Holographic HUD */}
            <button
              onClick={() => setFxHoloHud(!fxHoloHud)}
              className={`w-full px-2.5 py-1.5 rounded-lg border flex items-center justify-between transition-all ${
                fxHoloHud
                  ? 'bg-purple-500/15 border-purple-500/40 text-purple-200'
                  : 'bg-slate-900/40 border-slate-800 text-slate-400'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                <span>Retícula Holográfica Sci-Fi</span>
              </div>
              <span className={`text-[10px] font-bold ${fxHoloHud ? 'text-purple-400' : 'text-slate-500'}`}>
                {fxHoloHud ? 'ACTIVO' : 'OFF'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Holographic Cyber Reticle & Anamorphic Flare Center Overlay */}
      {fxHoloHud && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden">
          {/* Subtle Anamorphic Lens Flare Line */}
          <div
            className="absolute w-full h-[1px] opacity-25"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${FX_THEMES[fxTheme].glowColorHex} 50%, transparent 100%)`,
            }}
          />

          {/* Central Targeting Reticle Ring */}
          <div className="relative w-48 h-48 rounded-full border border-cyan-500/20 flex items-center justify-center">
            {/* Outer tick marks */}
            <div className="absolute inset-2 rounded-full border border-dashed border-cyan-400/25 animate-spin" style={{ animationDuration: '45s' }} />

            {/* Corner Brackets */}
            <div className="absolute -top-3 -left-3 w-5 h-5 border-t-2 border-l-2 border-cyan-400/50" />
            <div className="absolute -top-3 -right-3 w-5 h-5 border-t-2 border-r-2 border-cyan-400/50" />
            <div className="absolute -bottom-3 -left-3 w-5 h-5 border-b-2 border-l-2 border-cyan-400/50" />
            <div className="absolute -bottom-3 -right-3 w-5 h-5 border-b-2 border-r-2 border-cyan-400/50" />

            {/* Micro Crosshair Center */}
            <div className="w-2.5 h-2.5 relative flex items-center justify-center">
              <div className="w-full h-[1px] bg-cyan-300/60" />
              <div className="h-full w-[1px] bg-cyan-300/60 absolute" />
            </div>

            {/* Quantum Phase Polar Readout */}
            <div className="absolute -bottom-7 text-[9px] font-mono text-cyan-400/70 tracking-widest bg-slate-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
              POLAR: {((active4DPhase * 180) / Math.PI % 360).toFixed(1)}° • Φ
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Left: Camera Interaction Tips */}
      <div className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-400 shadow-lg pointer-events-none hidden sm:flex items-center space-x-3">
        <div className="flex items-center gap-1">
          <Compass className="w-3.5 h-3.5 text-rose-400" />
          <span>Arrastrar: Rotación 360°</span>
        </div>
        <span className="text-slate-600">•</span>
        <span>Rueda: Zoom 4K</span>
        <span className="text-slate-600">•</span>
        <span>Click Derecho: Desplazar</span>
      </div>

      {/* Floating Bottom Right: Live Quantum Telemetry HUD */}
      <div className="absolute bottom-3 right-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-slate-700/80 text-xs font-mono text-slate-200 shadow-xl pointer-events-none flex flex-col items-end space-y-1">
        <div className="flex items-center space-x-2 text-[11px]">
          <span className="text-slate-400">Energía E:</span>
          <span className="text-rose-400 font-bold">{renderEnergy.toFixed(4)} eV</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Fase 4D:</span>
          <span className="text-teal-400">{(active4DPhase % (Math.PI * 2)).toFixed(3)} rad</span>
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {fps} FPS
          </span>
          <span>•</span>
          <span>Born: 1.00000000</span>
          <span>•</span>
          <span className="text-purple-300">Vibración Activa</span>
        </div>
      </div>
    </div>
  );
};
