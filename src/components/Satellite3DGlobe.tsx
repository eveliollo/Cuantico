import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import {
  SatelliteTelemetry,
  GroundStation,
  GROUND_STATIONS,
  SatelliteId,
  SATELLITE_CATALOG,
  DSN_ANTENNAS,
} from '../core/satelliteTelemetryEngine';

interface Satellite3DGlobeProps {
  telemetry: SatelliteTelemetry;
  selectedStation: GroundStation;
  allSatellites?: Partial<Record<SatelliteId, SatelliteTelemetry>>;
  isCollisionRisk?: boolean;
  onSelectSatellite?: (id: SatelliteId) => void;
}

export const Satellite3DGlobe: React.FC<Satellite3DGlobeProps> = ({
  telemetry,
  selectedStation,
  allSatellites,
  isCollisionRisk = false,
  onSelectSatellite,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  const earthMeshRef = useRef<THREE.Mesh | null>(null);
  const laserMeshGroupRef = useRef<THREE.Group | null>(null);
  const fleetMeshesRef = useRef<Map<SatelliteId, THREE.Group>>(new Map());
  const orbitLinesRef = useRef<Map<SatelliteId, THREE.Line>>(new Map());
  const laserBeamRef = useRef<THREE.Line | null>(null);
  const photonParticlesRef = useRef<THREE.Points | null>(null);
  const hazardMeshRef = useRef<THREE.Mesh | null>(null);

  const [laserMeshEnabled, setLaserMeshEnabled] = useState<boolean>(true);
  const [constellationVisible, setConstellationVisible] = useState<boolean>(true);
  const [cameraZoomDist, setCameraZoomDist] = useState<number>(34);

  // Rotation control via mouse drag
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const earthRotationRef = useRef<{ x: number; y: number }>({ x: 0.35, y: -0.8 });

  // Earth radius in 3D scene = 10 units
  const EARTH_3D_RADIUS = 10;

  const latLonToVector3 = (latDeg: number, lonDeg: number, altFactor = 0): THREE.Vector3 => {
    const latRad = (latDeg * Math.PI) / 180;
    const lonRad = ((lonDeg + 180) * Math.PI) / 180;
    const r = EARTH_3D_RADIUS + altFactor;

    const x = -r * Math.cos(latRad) * Math.cos(lonRad);
    const y = r * Math.sin(latRad);
    const z = r * Math.cos(latRad) * Math.sin(lonRad);

    return new THREE.Vector3(x, y, z);
  };

  // Setup Three.js Scene
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || 700;
    const height = container.clientHeight || 450;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 2000);
    camera.position.set(0, 8, cameraZoomDist);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 1. Deep Space Starfield
    const starGeo = new THREE.BufferGeometry();
    const starCount = 1200;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      const r = 180 + Math.random() * 250;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i + 2] = r * Math.cos(phi);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xe2e8f0,
      size: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 2. Lighting (Sun & Deep Blue Specular Backlight)
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.4);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.8);
    sunLight.position.set(45, 25, 35);
    scene.add(sunLight);

    const specularBackLight = new THREE.DirectionalLight(0x0284c7, 1.2);
    specularBackLight.position.set(-45, -20, -35);
    scene.add(specularBackLight);

    // 3. Procedural High-Tech Earth Sphere with Night City Lights
    const earthGeo = new THREE.SphereGeometry(EARTH_3D_RADIUS, 64, 64);

    const mapCanvas = document.createElement('canvas');
    mapCanvas.width = 2048;
    mapCanvas.height = 1024;
    const ctx = mapCanvas.getContext('2d')!;

    // Deep ocean background
    ctx.fillStyle = '#061124';
    ctx.fillRect(0, 0, 2048, 1024);

    // Latitude & Longitude Coordinate Grid
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.16)';
    ctx.lineWidth = 1;
    for (let lat = -80; lat <= 80; lat += 20) {
      const y = ((90 - lat) / 180) * 1024;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(2048, y);
      ctx.stroke();
    }
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = ((lon + 180) / 360) * 2048;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 1024);
      ctx.stroke();
    }

    // Equator highlight
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 512);
    ctx.lineTo(2048, 512);
    ctx.stroke();

    // Procedural Continents (Eurasia, Africa, Americas, Australia, Antarctica)
    ctx.fillStyle = 'rgba(14, 116, 144, 0.42)';
    // Eurasia / Africa
    ctx.beginPath();
    ctx.ellipse(1080, 400, 320, 200, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(1050, 580, 160, 180, 0, 0, Math.PI * 2);
    ctx.fill();
    // North America
    ctx.beginPath();
    ctx.ellipse(520, 360, 190, 150, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // South America
    ctx.beginPath();
    ctx.ellipse(660, 680, 130, 220, 0.3, 0, Math.PI * 2);
    ctx.fill();
    // Australia
    ctx.beginPath();
    ctx.ellipse(1600, 720, 100, 80, 0, 0, Math.PI * 2);
    ctx.fill();

    // Night City Light Clusters (Warm Golden Bioluminescent Dots)
    ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
    const cityCoordinates = [
      { x: 580, y: 380, r: 8 }, // New York & East Coast Corridor
      { x: 440, y: 410, r: 6 }, // Los Angeles / West Coast
      { x: 990, y: 340, r: 9 }, // Western Europe (London/Paris/Madrid)
      { x: 1480, y: 390, r: 9 }, // East Coast China / Tokyo / Seoul
      { x: 1240, y: 520, r: 7 }, // India
      { x: 670, y: 730, r: 6 }, // São Paulo / Buenos Aires
      { x: 1660, y: 760, r: 5 }, // Sydney
    ];

    cityCoordinates.forEach(c => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
      ctx.fill();
      // Glow halo
      ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
      ctx.beginPath();
      ctx.arc(c.x, c.y, c.r * 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(253, 224, 71, 0.85)';
    });

    const earthTexture = new THREE.CanvasTexture(mapCanvas);
    const earthMat = new THREE.MeshStandardMaterial({
      map: earthTexture,
      roughness: 0.82,
      metalness: 0.18,
      emissive: 0x041328,
      emissiveIntensity: 0.55,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);
    earthMeshRef.current = earthMesh;

    // 4. Atmospheric Glow Shells (Rayleigh Scattering)
    const atmoInnerGeo = new THREE.SphereGeometry(EARTH_3D_RADIUS * 1.03, 48, 48);
    const atmoInnerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.18,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmoInner = new THREE.Mesh(atmoInnerGeo, atmoInnerMat);
    scene.add(atmoInner);

    const atmoOuterGeo = new THREE.SphereGeometry(EARTH_3D_RADIUS * 1.1, 36, 36);
    const atmoOuterMat = new THREE.MeshBasicMaterial({
      color: 0x0ea5e9,
      transparent: true,
      opacity: 0.08,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    const atmoOuter = new THREE.Mesh(atmoOuterGeo, atmoOuterMat);
    scene.add(atmoOuter);

    // 5. NASA Deep Space Network (DSN) Antennas & Ground Stations Pins
    const groundStationsGroup = new THREE.Group();
    GROUND_STATIONS.forEach(st => {
      const pos = latLonToVector3(st.lat, st.lon, 0.1);
      const isSelected = st.id === selectedStation.id;
      const isDsn = st.id.includes('dsn');

      // Base cylinder
      const pinGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.4, 12);
      const pinMat = new THREE.MeshBasicMaterial({
        color: isSelected ? 0x10b981 : isDsn ? 0xf59e0b : 0x06b6d4,
      });
      const pinMesh = new THREE.Mesh(pinGeo, pinMat);
      pinMesh.position.copy(pos);
      pinMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pos.clone().normalize());

      // Dish Cone on top of DSN antennas
      if (isDsn) {
        const dishGeo = new THREE.ConeGeometry(0.35, 0.2, 12, 1, true);
        const dishMat = new THREE.MeshBasicMaterial({
          color: 0xfbbf24,
          wireframe: true,
        });
        const dishMesh = new THREE.Mesh(dishGeo, dishMat);
        dishMesh.position.set(0, 0.25, 0);
        dishMesh.rotation.x = Math.PI;
        pinMesh.add(dishMesh);
      }

      groundStationsGroup.add(pinMesh);
    });
    earthMesh.add(groundStationsGroup);

    // 6. Laser Communication Downlink Beam (Connecting Satellite to Selected Station)
    const beamGeo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ]);
    const beamMat = new THREE.LineBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const laserBeam = new THREE.Line(beamGeo, beamMat);
    scene.add(laserBeam);
    laserBeamRef.current = laserBeam;

    // 7. Inter-Satellite Laser Mesh Group (ISL Links)
    const laserMeshGroup = new THREE.Group();
    scene.add(laserMeshGroup);
    laserMeshGroupRef.current = laserMeshGroup;

    // 8. Photon Particles Traveling along Laser Lines
    const photonCount = 48;
    const photonGeo = new THREE.BufferGeometry();
    const photonPositions = new Float32Array(photonCount * 3);
    photonGeo.setAttribute('position', new THREE.BufferAttribute(photonPositions, 3));
    const photonMat = new THREE.PointsMaterial({
      color: 0x34d399,
      size: 0.6,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    });
    const photonParticles = new THREE.Points(photonGeo, photonMat);
    scene.add(photonParticles);
    photonParticlesRef.current = photonParticles;

    // 9. Orbital Hazard Ring (for COLA close encounters)
    const hazardGeo = new THREE.RingGeometry(1.2, 1.4, 32);
    const hazardMat = new THREE.MeshBasicMaterial({
      color: 0xef4444,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
    });
    const hazardMesh = new THREE.Mesh(hazardGeo, hazardMat);
    scene.add(hazardMesh);
    hazardMeshRef.current = hazardMesh;

    // Render loop
    let animId: number;
    let clock = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      clock += 0.02;

      // Animate active satellite beacon pulse
      const activeMesh = fleetMeshesRef.current.get(telemetry.satelliteId);
      if (activeMesh) {
        const ring = activeMesh.getObjectByName('active_sat_pulse_ring');
        if (ring) {
          const s = 1.0 + (Math.sin(clock * 5) + 1) * 0.35;
          ring.scale.set(s, s, 1);
          ring.rotation.z = clock * 1.5;
        }
      }

      // Animate Hazard Ring when alert is active
      if (hazardMeshRef.current) {
        if (isCollisionRisk && activeMesh) {
          hazardMeshRef.current.visible = true;
          hazardMeshRef.current.position.copy(activeMesh.position);
          hazardMeshRef.current.lookAt(0, 0, 0);
          const hs = 1.0 + Math.sin(clock * 8) * 0.3;
          hazardMeshRef.current.scale.set(hs, hs, 1);
          (hazardMeshRef.current.material as THREE.MeshBasicMaterial).opacity = 0.75 + Math.sin(clock * 8) * 0.25;
        } else {
          hazardMeshRef.current.visible = false;
        }
      }

      // Animate traveling photons
      if (photonParticlesRef.current && laserMeshEnabled) {
        const posAttr = photonParticlesRef.current.geometry.attributes.position;
        if (posAttr && activeMesh) {
          const arr = posAttr.array as Float32Array;
          const stPos = latLonToVector3(selectedStation.lat, selectedStation.lon, 0.1);
          for (let p = 0; p < photonCount; p++) {
            const frac = ((clock * 1.5 + p * (1 / photonCount)) % 1);
            arr[p * 3] = activeMesh.position.x * frac + stPos.x * (1 - frac);
            arr[p * 3 + 1] = activeMesh.position.y * frac + stPos.y * (1 - frac);
            arr[p * 3 + 2] = activeMesh.position.z * frac + stPos.z * (1 - frac);
          }
          posAttr.needsUpdate = true;
        }
      }

      // Slow passive earth rotation if not dragging
      if (!isDraggingRef.current && earthMeshRef.current) {
        earthRotationRef.current.y += 0.0006;
        earthMeshRef.current.rotation.y = earthRotationRef.current.y;
        earthMeshRef.current.rotation.x = earthRotationRef.current.x;
      }

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth || 700;
      const h = container.clientHeight || 450;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
    };
  }, []);

  // Synchronize All Fleet Satellites and Orbits in 3D
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Satellites catalog list
    const satKeys = Object.keys(SATELLITE_CATALOG) as SatelliteId[];

    satKeys.forEach(satId => {
      const meta = SATELLITE_CATALOG[satId];
      const isSelected = satId === telemetry.satelliteId;
      const satTelem = allSatellites?.[satId] || (satId === telemetry.satelliteId ? telemetry : null);

      // 1. Create or update Orbit line for each satellite
      if (!orbitLinesRef.current.has(satId)) {
        // Orbit radius scaled: LEO = ~11.8, MEO GPS = ~16.5, JWST = ~24.0 (for scene representation)
        const altKm = meta.nominalAltitudeKm;
        const scaledAlt = satId === 'jwst_l2' ? 14.0 : satId === 'gps_navstar' ? 6.5 : (altKm / 420) * 1.8;
        const orbitRadius = EARTH_3D_RADIUS + scaledAlt;

        const orbitPoints: THREE.Vector3[] = [];
        const segments = 128;
        const inclRad = (meta.inclinationDeg * Math.PI) / 180;

        for (let i = 0; i <= segments; i++) {
          const theta = (i / segments) * Math.PI * 2;
          const ox = orbitRadius * Math.cos(theta);
          const oy = orbitRadius * Math.sin(theta) * Math.sin(inclRad);
          const oz = orbitRadius * Math.sin(theta) * Math.cos(inclRad);
          orbitPoints.push(new THREE.Vector3(ox, oy, oz));
        }

        const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
        const orbitColor = satId === 'jwst_l2' ? 0xeab308 : satId === 'micius_quantum' ? 0xa855f7 : satId === 'iss' ? 0x06b6d4 : 0x38bdf8;
        const orbitMat = new THREE.LineBasicMaterial({
          color: orbitColor,
          transparent: true,
          opacity: isSelected ? 0.65 : 0.25,
          blending: THREE.AdditiveBlending,
        });
        const orbitLine = new THREE.Line(orbitGeo, orbitMat);
        scene.add(orbitLine);
        orbitLinesRef.current.set(satId, orbitLine);
      } else {
        const line = orbitLinesRef.current.get(satId);
        if (line) {
          (line.material as THREE.LineBasicMaterial).opacity = isSelected ? 0.75 : constellationVisible ? 0.25 : 0.05;
        }
      }

      // 2. Create or update 3D Satellite Mesh
      let satGroup = fleetMeshesRef.current.get(satId);
      if (!satGroup) {
        satGroup = new THREE.Group();
        satGroup.name = `sat_${satId}`;

        // Distinct colors per category
        const colorHex = satId === 'jwst_l2' ? 0xf59e0b : satId === 'micius_quantum' ? 0xc084fc : satId === 'iss' ? 0x38bdf8 : 0x10b981;

        // Core satellite body
        const bodyGeo = satId === 'jwst_l2' ? new THREE.ConeGeometry(0.8, 0.4, 6) : new THREE.BoxGeometry(0.6, 0.6, 0.8);
        const bodyMat = new THREE.MeshStandardMaterial({
          color: colorHex,
          metalness: 0.85,
          roughness: 0.2,
          emissive: colorHex,
          emissiveIntensity: 0.35,
        });
        const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
        satGroup.add(bodyMesh);

        // Solar panels
        const panelGeo = new THREE.BoxGeometry(1.4, 0.04, 0.4);
        const panelMat = new THREE.MeshStandardMaterial({
          color: 0x0284c7,
          metalness: 0.9,
          roughness: 0.2,
        });
        const leftPanel = new THREE.Mesh(panelGeo, panelMat);
        leftPanel.position.set(-1.0, 0, 0);
        satGroup.add(leftPanel);

        const rightPanel = new THREE.Mesh(panelGeo, panelMat);
        rightPanel.position.set(1.0, 0, 0);
        satGroup.add(rightPanel);

        // Active pulse ring
        const pulseRingGeo = new THREE.RingGeometry(0.85, 0.95, 32);
        const pulseRingMat = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
        });
        const pulseRing = new THREE.Mesh(pulseRingGeo, pulseRingMat);
        pulseRing.name = 'active_sat_pulse_ring';
        satGroup.add(pulseRing);

        scene.add(satGroup);
        fleetMeshesRef.current.set(satId, satGroup);
      }

      // Update position
      if (satTelem) {
        const altKm = satTelem.altitudeKm;
        const scaledAlt = satId === 'jwst_l2' ? 14.0 : satId === 'gps_navstar' ? 6.5 : (altKm / 420) * 1.8;
        const satPos = latLonToVector3(satTelem.latitude, satTelem.longitude, scaledAlt);
        satGroup.position.copy(satPos);
        satGroup.lookAt(0, 0, 0);

        // Show/hide pulse ring
        const ring = satGroup.getObjectByName('active_sat_pulse_ring');
        if (ring) {
          ring.visible = isSelected;
        }

        // Visibility
        satGroup.visible = isSelected || constellationVisible;
      }
    });

    // 3. Update active Laser Beam to selected ground station
    if (laserBeamRef.current && telemetry) {
      const scaledAlt = telemetry.satelliteId === 'jwst_l2' ? 14.0 : telemetry.satelliteId === 'gps_navstar' ? 6.5 : (telemetry.altitudeKm / 420) * 1.8;
      const satPos = latLonToVector3(telemetry.latitude, telemetry.longitude, scaledAlt);
      const stationPos = latLonToVector3(selectedStation.lat, selectedStation.lon, 0.1);

      const positions = new Float32Array([
        satPos.x, satPos.y, satPos.z,
        stationPos.x, stationPos.y, stationPos.z,
      ]);
      laserBeamRef.current.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      laserBeamRef.current.geometry.attributes.position.needsUpdate = true;
    }

    // 4. Update Inter-Satellite Laser Mesh (Cross-links between active fleet nodes)
    if (laserMeshGroupRef.current && laserMeshEnabled) {
      // Clear previous lines
      while (laserMeshGroupRef.current.children.length > 0) {
        laserMeshGroupRef.current.remove(laserMeshGroupRef.current.children[0]);
      }

      const activePos = fleetMeshesRef.current.get(telemetry.satelliteId)?.position;
      if (activePos) {
        satKeys.forEach(otherId => {
          if (otherId === telemetry.satelliteId) return;
          const otherMesh = fleetMeshesRef.current.get(otherId);
          if (otherMesh && otherMesh.visible) {
            // Draw inter-satellite link line
            const islGeo = new THREE.BufferGeometry().setFromPoints([activePos, otherMesh.position]);
            const islMat = new THREE.LineBasicMaterial({
              color: 0xa855f7,
              transparent: true,
              opacity: 0.35,
              blending: THREE.AdditiveBlending,
            });
            const islLine = new THREE.Line(islGeo, islMat);
            laserMeshGroupRef.current?.add(islLine);
          }
        });
      }
    }
  }, [telemetry, allSatellites, constellationVisible, laserMeshEnabled, selectedStation.id]);

  // Mouse drag to rotate Earth
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !earthMeshRef.current) return;

    const deltaX = e.clientX - previousMousePositionRef.current.x;
    const deltaY = e.clientY - previousMousePositionRef.current.y;

    earthRotationRef.current.y += deltaX * 0.007;
    earthRotationRef.current.x += deltaY * 0.007;

    earthMeshRef.current.rotation.y = earthRotationRef.current.y;
    earthMeshRef.current.rotation.x = earthRotationRef.current.x;

    previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Zoom control
  const handleWheel = (e: React.WheelEvent) => {
    const newDist = Math.max(18, Math.min(55, cameraZoomDist + (e.deltaY > 0 ? 2 : -2)));
    setCameraZoomDist(newDist);
    if (cameraRef.current) {
      cameraRef.current.position.set(0, 8, newDist);
      cameraRef.current.lookAt(0, 0, 0);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
      className="relative w-full h-[440px] sm:h-[480px] bg-slate-950 rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl cursor-grab active:cursor-grabbing select-none"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />

      {/* Top Left: Orbit HUD Banner */}
      <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3.5 py-2 rounded-xl border border-cyan-500/40 text-xs font-mono text-cyan-300 flex items-center space-x-2.5 pointer-events-none shadow-lg">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
        <div>
          <div className="font-bold text-white flex items-center gap-1.5">
            <span>NASA/SOCXIMA 3D ORBITAL RADAR</span>
            {isCollisionRisk && (
              <span className="px-1.5 py-0.2 bg-red-500/30 text-red-400 border border-red-500/60 rounded text-[9px] font-bold animate-pulse">
                CONJUNCIÓN DEBRIS
              </span>
            )}
          </div>
          <div className="text-[10px] text-slate-400">
            Nodo Activo: <span className="text-cyan-400 font-bold">{telemetry.name}</span>
          </div>
        </div>
      </div>

      {/* Top Right: Interactive 3D Layers Switcher */}
      <div className="absolute top-3 right-3 flex items-center space-x-1.5 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700/80 text-[11px] font-mono">
        <button
          onClick={() => setConstellationVisible(!constellationVisible)}
          className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
            constellationVisible
              ? 'bg-cyan-500 text-slate-950 font-bold'
              : 'text-slate-400 hover:text-white bg-slate-800'
          }`}
          title="Alternar visibilidad de toda la constelación de satélites"
        >
          {constellationVisible ? 'Flota Completa (8)' : 'Solo Activo'}
        </button>

        <button
          onClick={() => setLaserMeshEnabled(!laserMeshEnabled)}
          className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
            laserMeshEnabled
              ? 'bg-purple-500 text-white font-bold'
              : 'text-slate-400 hover:text-white bg-slate-800'
          }`}
          title="Alternar enlaces intersatelitales láser (ISL)"
        >
          {laserMeshEnabled ? 'Láser ISL Activo' : 'Láser Off'}
        </button>
      </div>

      {/* Bottom Center: Quick Satellite Jump Bar in 3D */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-1.5 text-[10px] font-mono overflow-x-auto max-w-[95%]">
        <span className="text-slate-500 uppercase shrink-0">Flota:</span>
        {(Object.keys(SATELLITE_CATALOG) as SatelliteId[]).map(satId => {
          const isCurrent = satId === telemetry.satelliteId;
          return (
            <button
              key={satId}
              onClick={() => onSelectSatellite?.(satId)}
              className={`px-2 py-0.5 rounded transition-all shrink-0 cursor-pointer ${
                isCurrent
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/60'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/80 border border-transparent'
              }`}
            >
              {satId === 'jwst_l2'
                ? 'JWST L2'
                : satId === 'micius_quantum'
                ? 'Micius'
                : satId === 'iss'
                ? 'ISS'
                : satId === 'gravity_probe_b'
                ? 'GP-B'
                : satId === 'gps_navstar'
                ? 'GPS'
                : satId === 'hubble_hst'
                ? 'Hubble'
                : satId === 'starlink'
                ? 'Starlink'
                : 'NOAA-20'}
            </button>
          );
        })}
      </div>

      {/* Bottom Left Status & Control Instructions */}
      <div className="absolute bottom-11 left-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800/80 text-[10px] font-mono text-slate-400 pointer-events-none hidden sm:block">
        Arrastra para orbitar • Rueda para Zoom ({cameraZoomDist}u) • Ciudades nocturnas activas
      </div>

      {/* Bottom Right: Active Telemetry Tag */}
      <div className="absolute bottom-11 right-3 bg-slate-900/85 backdrop-blur-md px-3 py-1 rounded-lg border border-slate-800 text-[11px] font-mono text-amber-300 pointer-events-none">
        Alt: <span className="font-bold">{telemetry.altitudeKm} km</span> • Vel: <span className="font-bold">{telemetry.velocityKmS} km/s</span>
      </div>
    </div>
  );
};
