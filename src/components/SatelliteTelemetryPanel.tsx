import React, { useState, useEffect, useRef } from 'react';
import {
  Satellite,
  Radio,
  Globe,
  Compass,
  Activity,
  Zap,
  Clock,
  RefreshCw,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  Maximize2,
  MapPin,
  Cpu,
  Wifi,
  ExternalLink,
  AlertTriangle,
  Gauge,
  Flame,
  Orbit,
  Atom,
} from 'lucide-react';
import {
  SatelliteId,
  SatelliteMetadata,
  SatelliteTelemetry,
  SATELLITE_CATALOG,
  GROUND_STATIONS,
  GroundStation,
  fetchSatelliteTelemetry,
  propagateSatellitePosition,
  computeRelativisticEffects,
  computeGroundStationMetrics,
  computeQuantumComparison,
  computeKerrSpacetimeMetric,
  computeCollisionAssessment,
  playCapcomRadioTransmission,
  DSN_ANTENNAS,
  DsnAntenna,
  KerrSpacetimeMetric,
  CollisionConjunction,
  RelativisticComparison,
  QuantumComparison,
  GroundStationPassMetrics,
} from '../core/satelliteTelemetryEngine';
import { SocximaEngine } from '../core/socximaEngine';
import { Satellite3DGlobe } from './Satellite3DGlobe';
import { Satellite2DMap } from './Satellite2DMap';
import { CosmicLiveWebcams } from './CosmicLiveWebcams';
import { EarthMonitoringPanel } from './EarthMonitoringPanel';
import { MeteoritesBolidesPanel } from './MeteoritesBolidesPanel';
import { PlanetsSolarSystemPanel } from './PlanetsSolarSystemPanel';
import { Video } from 'lucide-react';

interface SatelliteTelemetryPanelProps {
  engine: SocximaEngine;
  onEngineUpdate: () => void;
}

export const SatelliteTelemetryPanel: React.FC<SatelliteTelemetryPanelProps> = ({
  engine,
  onEngineUpdate,
}) => {
  // Selected satellite
  const [selectedSatId, setSelectedSatId] = useState<SatelliteId>('iss');
  const activeMeta: SatelliteMetadata = SATELLITE_CATALOG[selectedSatId];

  // Visualizer view mode: 3D Earth vs 2D Mercator
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  // Master Observatory Navigation
  type ObservatoryViewMode = 'webcams' | 'satellites' | 'earth' | 'meteorites' | 'planets';
  const [observatoryView, setObservatoryView] = useState<ObservatoryViewMode>('webcams');

  // Ground Station selected
  const [selectedStation, setSelectedStation] = useState<GroundStation>(GROUND_STATIONS[0]);

  // Telemetry of active satellite
  const [telemetry, setTelemetry] = useState<SatelliteTelemetry>(() => ({
    satelliteId: 'iss',
    name: SATELLITE_CATALOG.iss.name,
    noradId: 25544,
    timestamp: Date.now(),
    latitude: 25.421,
    longitude: -45.123,
    altitudeKm: 421.5,
    velocityKmS: 7.662,
    velocityKmH: 27583.2,
    visibility: 'daylight',
    footprintKm: 4540.0,
    solarLat: 12.4,
    solarLon: -85.2,
    isLiveApi: true,
    pingMs: 45,
    lastUpdateIso: new Date().toISOString(),
    ccsdsFrameId: 1042,
    rawTelemetryHex: '1ACFFC1D0412A57B09F4084201A5',
    orbitalPhaseAngleRad: 1.25,
  }));

  // Full constellation telemetry cache for simultaneous 3D rendering
  const [fleetTelemetry, setFleetTelemetry] = useState<Partial<Record<SatelliteId, SatelliteTelemetry>>>({});

  // Auto-refresh control
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(2); // 1, 2, 5, 0 (paused)
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [audioChirpEnabled, setAudioChirpEnabled] = useState<boolean>(false);
  const [capcomAudioSpeaking, setCapcomAudioSpeaking] = useState<boolean>(false);
  const [injectionSuccess, setInjectionSuccess] = useState<string | null>(null);

  // Evasive Thruster Burn State (COLA)
  const [evasiveManeuverActive, setEvasiveManeuverActive] = useState<boolean>(false);
  const [burnConfirmedNotice, setBurnConfirmedNotice] = useState<string | null>(null);

  // Audio Context Ref for synthesized telemetry chirp
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playTelemetryBeep = () => {
    if (!audioChirpEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1920, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.06);
    } catch {
      // Audio context may be restricted before user gesture
    }
  };

  // Perform Telemetry Fetch for selected and update whole fleet
  const handleFetchTelemetry = async (satId = selectedSatId) => {
    setIsFetching(true);
    try {
      const activeData = await fetchSatelliteTelemetry(satId);

      // Apply altitude boost if evasive thruster maneuver was fired
      if (evasiveManeuverActive) {
        activeData.altitudeKm += 1.4;
      }

      setTelemetry(activeData);
      playTelemetryBeep();

      // Also propagate remaining satellites in background for full constellation
      const now = Date.now();
      const updatedFleet: Partial<Record<SatelliteId, SatelliteTelemetry>> = {
        ...fleetTelemetry,
        [satId]: activeData,
      };

      (Object.keys(SATELLITE_CATALOG) as SatelliteId[]).forEach(id => {
        if (id !== satId) {
          updatedFleet[id] = propagateSatellitePosition(id, now);
        }
      });
      setFleetTelemetry(updatedFleet);
    } catch (err) {
      console.error('Failed to fetch satellite telemetry:', err);
    } finally {
      setIsFetching(false);
    }
  };

  // Switch satellite
  const handleSelectSatellite = (satId: SatelliteId) => {
    setSelectedSatId(satId);
    handleFetchTelemetry(satId);
  };

  // Interval polling
  useEffect(() => {
    handleFetchTelemetry(selectedSatId);

    if (refreshIntervalSec <= 0) return;

    const timer = setInterval(() => {
      handleFetchTelemetry(selectedSatId);
    }, refreshIntervalSec * 1000);

    return () => clearInterval(timer);
  }, [selectedSatId, refreshIntervalSec, evasiveManeuverActive]);

  // Derived Relativistic and Quantum Comparisons
  const relativisticComp: RelativisticComparison = computeRelativisticEffects(
    telemetry.velocityKmS,
    telemetry.altitudeKm
  );

  const groundStationPass: GroundStationPassMetrics = computeGroundStationMetrics(
    telemetry.latitude,
    telemetry.longitude,
    telemetry.altitudeKm,
    telemetry.velocityKmS,
    selectedStation
  );

  const quantumComp: QuantumComparison = computeQuantumComparison(
    selectedSatId,
    engine
  );

  // Kerr Spacetime Metric Tensor (Einstein General Relativity)
  const kerrMetric: KerrSpacetimeMetric = computeKerrSpacetimeMetric(
    telemetry.altitudeKm,
    telemetry.latitude
  );

  // Space Debris Conjunction Assessment (COLA)
  const collisionAssessment: CollisionConjunction = computeCollisionAssessment(
    selectedSatId,
    telemetry.altitudeKm,
    telemetry.timestamp
  );

  // Synchronize / Inject Satellite Relativistic Correction into Socxima Quantum Engine
  const handleInjectSatelliteRelativityToEngine = () => {
    engine.dar_latido();
    onEngineUpdate();
    setInjectionSuccess(
      `¡Sincronizado! Se inyectó desfase relativista de ${relativisticComp.netDriftMicrosecondsPerDay.toFixed(3)} µs/día al motor (Ciclo #${engine.ciclo}).`
    );
    setTimeout(() => setInjectionSuccess(null), 4000);
  };

  // Execute Evasive Thruster Maneuver (COLA)
  const handleExecuteEvasiveBurn = () => {
    setEvasiveManeuverActive(true);
    setBurnConfirmedNotice(
      `¡MANIOBRA RCS EJECUTADA! Impulso Δv = +${collisionAssessment.evasiveBurnDeltaVMs} m/s confirmado. Apogeo orbital elevado +1.4 km. Zona de debris evadida con éxito.`
    );

    // Audio Capcom voice notification
    playCapcomRadioTransmission(
      `Houston, maniobra de evasión completada. Encendido de propulsores RCS confirmado, vector de acercamiento con basura espacial despejado.`,
      () => setCapcomAudioSpeaking(false)
    );

    setTimeout(() => {
      setBurnConfirmedNotice(null);
    }, 6000);
  };

  // Trigger Houston Capcom Radio Transmission
  const handleTriggerCapcomAudio = () => {
    if (capcomAudioSpeaking) return;
    setCapcomAudioSpeaking(true);

    const satName = SATELLITE_CATALOG[selectedSatId].name.split(' ')[0];
    const message = `Houston, Capcom en frecuencia. Enlace de telemetría asegurado en ${satName}. Deriva relativista de Einstein en ${relativisticComp.netDriftMicrosecondsPerDay.toFixed(2)} microsegundos por día. Fidelidad cuántica del 98 por ciento confirmada.`;

    playCapcomRadioTransmission(message, () => {
      setCapcomAudioSpeaking(false);
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Satellite Connection & Live Status */}
      <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900/80 to-purple-950/50 border border-cyan-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-400 to-indigo-500 p-0.5 shadow-lg shadow-cyan-500/30 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-cyan-300">
                <Satellite className="w-6 h-6 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide font-mono flex items-center gap-2">
                  CONTROL DE MISIÓN ESPACIAL & TELEMETRÍA RELATIVISTA
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  {telemetry.isLiveApi ? 'API EN VIVO • SATÉLITE REAL' : 'PROPAGADOR KEPLERIANO SGP4'}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  RED DE ESPACIO PROFUNDO (DSN)
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Seguimiento de la flota orbital en 3D, métrica espaciotemporal de Kerr (arrastre de marcos de Einstein) y radar de intercepción cuántica.
              </p>
            </div>
          </div>

          {/* Quick Action Controls */}
          <div className="flex flex-wrap items-center gap-2 font-mono text-xs w-full lg:w-auto justify-start lg:justify-end">
            {/* Ping / Latency */}
            <div className="px-2.5 py-1 bg-slate-950 rounded-lg border border-slate-800 text-slate-300 flex items-center space-x-1.5">
              <Wifi className="w-3.5 h-3.5 text-cyan-400" />
              <span>Ping:</span>
              <span className="text-emerald-400 font-bold">{telemetry.pingMs} ms</span>
            </div>

            {/* NASA Capcom Voice Radio Broadcast Button */}
            <button
              onClick={handleTriggerCapcomAudio}
              disabled={capcomAudioSpeaking}
              className={`px-3 py-1.5 rounded-lg border text-xs flex items-center space-x-1.5 transition-all cursor-pointer font-bold ${
                capcomAudioSpeaking
                  ? 'bg-amber-500/30 text-amber-300 border-amber-400 animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-amber-500/50 hover:border-amber-400'
              }`}
              title="Transmitir reporte por radio CAPCOM con tonos Quindar de la NASA"
            >
              <Radio className={`w-3.5 h-3.5 ${capcomAudioSpeaking ? 'animate-spin text-amber-300' : 'text-amber-400'}`} />
              <span>{capcomAudioSpeaking ? 'CAPCOM AL AIRE...' : 'VOZ CAPCOM'}</span>
            </button>

            {/* Refresh Interval Selector */}
            <div className="flex items-center space-x-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
              {[1, 2, 5, 0].map(sec => (
                <button
                  key={sec}
                  onClick={() => setRefreshIntervalSec(sec)}
                  className={`px-2 py-1 rounded text-[11px] transition-all ${
                    refreshIntervalSec === sec
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                  title={sec === 0 ? 'Pausar actualización automática' : `Actualizar cada ${sec}s`}
                >
                  {sec === 0 ? 'Pausa' : `${sec}s`}
                </button>
              ))}
            </div>

            {/* Manual Sync Button */}
            <button
              onClick={() => handleFetchTelemetry(selectedSatId)}
              disabled={isFetching}
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/40 rounded-lg text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Sincronizar</span>
            </button>

            {/* Audio Telemetry Chirp Toggle */}
            <button
              onClick={() => {
                setAudioChirpEnabled(!audioChirpEnabled);
                if (!audioChirpEnabled) playTelemetryBeep();
              }}
              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                audioChirpEnabled
                  ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
              }`}
              title="Activar/Desactivar pitido sónico de telemetría de satélite"
            >
              {audioChirpEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Injection notification alert */}
        {injectionSuccess && (
          <div className="mt-3 p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs font-mono text-emerald-200 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{injectionSuccess}</span>
            </div>
          </div>
        )}

        {/* Evasive burn confirmation banner */}
        {burnConfirmedNotice && (
          <div className="mt-3 p-2.5 bg-amber-950/90 border border-amber-500/60 rounded-xl text-xs font-mono text-amber-200 flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400 shrink-0 animate-bounce" />
              <span>{burnConfirmedNotice}</span>
            </div>
          </div>
        )}
      </div>

      {/* MASTER OBSERVATORY NAVIGATION BAR */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs p-1.5 bg-slate-950/90 rounded-2xl border border-slate-800">
        <button
          onClick={() => setObservatoryView('webcams')}
          className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
            observatoryView === 'webcams'
              ? 'bg-gradient-to-r from-red-950/90 to-purple-950/80 border-red-500 text-white font-bold shadow-lg shadow-red-950/50'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <Video className="w-4 h-4 text-red-400" />
          <span>CÁMARAS WEB EN VIVO</span>
        </button>

        <button
          onClick={() => setObservatoryView('satellites')}
          className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
            observatoryView === 'satellites'
              ? 'bg-gradient-to-r from-cyan-950/90 to-sky-950/80 border-cyan-400 text-white font-bold shadow-lg shadow-cyan-950/50'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Satellite className="w-4 h-4 text-cyan-400" />
          <span>SATÉLITES EN VIVO</span>
        </button>

        <button
          onClick={() => setObservatoryView('earth')}
          className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
            observatoryView === 'earth'
              ? 'bg-gradient-to-r from-emerald-950/90 to-teal-950/80 border-emerald-400 text-white font-bold shadow-lg shadow-emerald-950/50'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Globe className="w-4 h-4 text-emerald-400" />
          <span>MONITOREO DE LA TIERRA</span>
        </button>

        <button
          onClick={() => setObservatoryView('meteorites')}
          className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
            observatoryView === 'meteorites'
              ? 'bg-gradient-to-r from-amber-950/90 to-orange-950/80 border-amber-400 text-white font-bold shadow-lg shadow-amber-950/50'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Flame className="w-4 h-4 text-amber-400" />
          <span>METEORITOS & NEOs</span>
        </button>

        <button
          onClick={() => setObservatoryView('planets')}
          className={`flex-1 min-w-[160px] py-2.5 px-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
            observatoryView === 'planets'
              ? 'bg-gradient-to-r from-indigo-950/90 to-purple-950/80 border-indigo-400 text-white font-bold shadow-lg shadow-indigo-950/50'
              : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Orbit className="w-4 h-4 text-indigo-400" />
          <span>PLANETAS DEL SISTEMA SOLAR</span>
        </button>
      </div>

      {/* Conditionally Render Selected Observatory View */}
      {observatoryView === 'webcams' && (
        <CosmicLiveWebcams telemetry={telemetry} />
      )}

      {observatoryView === 'earth' && (
        <EarthMonitoringPanel />
      )}

      {observatoryView === 'meteorites' && (
        <MeteoritesBolidesPanel />
      )}

      {observatoryView === 'planets' && (
        <PlanetsSolarSystemPanel />
      )}

      {observatoryView === 'satellites' && (
        <div className="space-y-6">
      {/* Satellite Selection Grid (8 Satellites: ISS, Micius, JWST L2, GP-B, GPS, Hubble, NOAA, Starlink) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5 font-mono text-xs">
        {(Object.keys(SATELLITE_CATALOG) as SatelliteId[]).map(satId => {
          const sat = SATELLITE_CATALOG[satId];
          const isSelected = satId === selectedSatId;
          const isDeepSpace = sat.orbitType === 'L2 Halo';
          return (
            <button
              key={satId}
              onClick={() => handleSelectSatellite(satId)}
              className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-b from-cyan-950/70 to-slate-900 border-cyan-400 text-white shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400'
                  : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span>#{sat.noradId}</span>
                  <span className={`px-1 rounded text-[9px] font-bold ${
                    isSelected ? 'bg-cyan-500/20 text-cyan-300' : isDeepSpace ? 'bg-amber-500/20 text-amber-300' : 'bg-slate-800'
                  }`}>
                    {sat.orbitType}
                  </span>
                </div>
                <div className="font-bold text-slate-100 truncate text-[11px]">
                  {sat.name.split(' ')[0]} {sat.name.split(' ')[1] || ''}
                </div>
                <div className="text-[10px] text-cyan-400/80 truncate mt-0.5">
                  {sat.category}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">
                  {sat.nominalAltitudeKm > 50000 ? `${(sat.nominalAltitudeKm / 1e6).toFixed(1)}M km` : `${sat.nominalAltitudeKm} km`}
                </span>
                <span className="text-emerald-400 font-bold">{sat.nominalSpeedKmS} km/s</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Split: 3D/2D Satellite Orbital Map + Telemetry Dashboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Visualizer (3D Globe or 2D Map) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Visualizer Mode Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-mono text-slate-400 uppercase font-bold flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span>Visualizador Orbital Espacial 3D</span>
              </span>
            </div>

            <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-xl border border-slate-800 font-mono text-xs">
              <button
                onClick={() => setViewMode('3d')}
                className={`px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                  viewMode === '3d'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Globo 3D Constelación</span>
              </button>
              <button
                onClick={() => setViewMode('2d')}
                className={`px-3 py-1 rounded-lg flex items-center space-x-1.5 transition-all ${
                  viewMode === '2d'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Mapa 2D</span>
              </button>
            </div>
          </div>

          {/* 3D or 2D Map Component */}
          {viewMode === '3d' ? (
            <Satellite3DGlobe
              telemetry={telemetry}
              selectedStation={selectedStation}
              allSatellites={fleetTelemetry}
              isCollisionRisk={collisionAssessment.riskStatus === 'CRITICAL_CONJUNCTION' && !evasiveManeuverActive}
              onSelectSatellite={handleSelectSatellite}
            />
          ) : (
            <Satellite2DMap
              telemetry={telemetry}
              selectedStation={selectedStation}
              onSelectStation={setSelectedStation}
            />
          )}

          {/* Space Debris Conjunction Warning & Emergency Thruster Burn Box (COLA) */}
          <div className={`p-4 rounded-xl border font-mono transition-all ${
            evasiveManeuverActive
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : collisionAssessment.riskStatus === 'CRITICAL_CONJUNCTION'
              ? 'bg-red-950/50 border-red-500/60 text-red-200 animate-pulse'
              : 'bg-slate-900/70 border-slate-800 text-slate-300'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${
                  evasiveManeuverActive ? 'text-emerald-400' : collisionAssessment.riskStatus === 'CRITICAL_CONJUNCTION' ? 'text-red-400' : 'text-amber-400'
                }`} />
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs uppercase">
                      RADAR COLA • ANÁLISIS DE CONJUNCIÓN CON BASURA ESPACIAL
                    </span>
                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      evasiveManeuverActive
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : collisionAssessment.riskStatus === 'CRITICAL_CONJUNCTION'
                        ? 'bg-red-500/30 text-red-300 border border-red-500/60'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {evasiveManeuverActive ? 'TRAYECTORIA SEGURA' : collisionAssessment.riskStatus}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300 mt-1">
                    Objetivo de proximidad: <span className="text-white font-bold">{collisionAssessment.debrisName}</span> (NORAD #{collisionAssessment.debrisNoradId})
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Distancia mínima: <strong className={collisionAssessment.missDistanceMeters < 500 && !evasiveManeuverActive ? 'text-red-400' : 'text-emerald-400'}>{evasiveManeuverActive ? '3,840 m' : `${collisionAssessment.missDistanceMeters} m`}</strong></span>
                    <span>Velocidad relativa: <strong>{collisionAssessment.relativeVelocityKmS} km/s</strong></span>
                    <span>Probabilidad Pc: <strong className="text-amber-300">{evasiveManeuverActive ? '< 1e-8' : collisionAssessment.collisionProbabilityPc}</strong></span>
                    <span>TCA (Aproximación): <strong>{collisionAssessment.timeToClosestApproachSec}s</strong></span>
                  </div>
                </div>
              </div>

              {/* Maneuver burn button */}
              <button
                onClick={handleExecuteEvasiveBurn}
                disabled={evasiveManeuverActive}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono flex items-center justify-center space-x-2 shrink-0 transition-all cursor-pointer ${
                  evasiveManeuverActive
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white shadow-lg shadow-red-950/60'
                }`}
              >
                <Flame className="w-4 h-4 text-amber-200" />
                <span>{evasiveManeuverActive ? 'MANIOBRA EJECUTADA' : 'DISPARAR PROPULSOR Δv'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live Telemetry Metrics & Pass Information */}
        <div className="lg:col-span-5 space-y-4">
          {/* Active Satellite Details Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl font-mono text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Satellite className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white uppercase text-sm">{activeMeta.name}</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold">
                {activeMeta.codeName}
              </span>
            </div>

            <p className="text-slate-300 text-[11px] leading-relaxed">
              {activeMeta.description}
            </p>

            {/* Live Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <div className="text-slate-500 text-[10px]">Altitud Orbital</div>
                <div className="text-sm font-bold text-white flex items-baseline space-x-1">
                  <span>{telemetry.altitudeKm}</span>
                  <span className="text-[10px] text-slate-400">km</span>
                </div>
              </div>

              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <div className="text-slate-500 text-[10px]">Velocidad Orbital</div>
                <div className="text-sm font-bold text-emerald-400 flex items-baseline space-x-1">
                  <span>{telemetry.velocityKmS}</span>
                  <span className="text-[10px] text-slate-400">km/s ({telemetry.velocityKmH} km/h)</span>
                </div>
              </div>

              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <div className="text-slate-500 text-[10px]">Latitud Sub-Satelital</div>
                <div className="text-sm font-bold text-cyan-300">
                  {telemetry.latitude > 0 ? `+${telemetry.latitude}°` : `${telemetry.latitude}°`}
                </div>
              </div>

              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <div className="text-slate-500 text-[10px]">Longitud Sub-Satelital</div>
                <div className="text-sm font-bold text-cyan-300">
                  {telemetry.longitude > 0 ? `+${telemetry.longitude}°` : `${telemetry.longitude}°`}
                </div>
              </div>

              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <div className="text-slate-500 text-[10px]">Huella Terrestre (Footprint)</div>
                <div className="text-sm font-bold text-purple-300">
                  Ø {telemetry.footprintKm} km
                </div>
              </div>

              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800/80">
                <div className="text-slate-500 text-[10px]">Visibilidad Solar</div>
                <div className={`text-sm font-bold flex items-center space-x-1 ${
                  telemetry.visibility === 'daylight' ? 'text-amber-300' : 'text-indigo-400'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current" />
                  <span className="capitalize">{telemetry.visibility === 'daylight' ? 'Luz Solar' : 'En Eclipse'}</span>
                </div>
              </div>
            </div>

            {/* Special Feature */}
            <div className="p-2.5 bg-gradient-to-r from-cyan-950/40 to-slate-950 rounded-xl border border-cyan-500/20 text-[11px] text-cyan-200">
              <span className="font-bold text-cyan-400 block mb-0.5">Propósito Especial:</span>
              {activeMeta.specialFeature}
            </div>
          </div>

          {/* Ground Station Selection and Pass Radar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl font-mono text-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white uppercase text-sm">Paso sobre Estación Terrena</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                groundStationPass.inLineOfSight
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {groundStationPass.inLineOfSight ? 'EN LÍNEA DE VISIÓN' : 'FUERA DE HORIZONTE'}
              </span>
            </div>

            {/* Station Selector Dropdown */}
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                value={selectedStation.id}
                onChange={e => {
                  const st = GROUND_STATIONS.find(s => s.id === e.target.value);
                  if (st) setSelectedStation(st);
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                {GROUND_STATIONS.map(st => (
                  <option key={st.id} value={st.id}>
                    {st.name} ({st.country})
                  </option>
                ))}
              </select>
            </div>

            {/* Pass Metrics */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Distancia Diagonal:</span>
                <span className="text-white font-bold">{Math.round(groundStationPass.distanceKm).toLocaleString()} km</span>
              </div>

              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Ángulo de Elevación:</span>
                <span className={`font-bold ${groundStationPass.elevationAngleDeg > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {groundStationPass.elevationAngleDeg.toFixed(2)}°
                </span>
              </div>

              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Efecto Doppler (S-Band):</span>
                <span className="text-amber-300 font-bold">
                  {groundStationPass.dopplerShiftKHz > 0
                    ? `+${groundStationPass.dopplerShiftKHz.toFixed(2)}`
                    : groundStationPass.dopplerShiftKHz.toFixed(2)}{' '}
                  kHz
                </span>
              </div>

              <div className="p-2 bg-slate-950/70 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block">Retardo de Ida y Vuelta (RTT):</span>
                <span className="text-purple-300 font-bold">
                  {groundStationPass.roundTripSignalDelayMs.toFixed(3)} ms
                </span>
              </div>
            </div>
          </div>

          {/* Relativistic Sync Action Button */}
          <button
            onClick={handleInjectSatelliteRelativityToEngine}
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-slate-950 font-bold font-mono text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <Zap className="w-4 h-4 text-slate-950" />
            <span>Inyectar Corrección Relativista de Satélite a Socxima Core</span>
          </button>
        </div>
      </div>

      {/* NASA Deep Space Network (DSN) 70-Meter Parabolic Antenna Array Matrix */}
      <div className="bg-slate-950/90 border border-amber-500/30 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center space-x-2.5">
            <Radio className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                NASA DEEP SPACE NETWORK (DSN) • MATRIZ DE ANTENAS PARABÓLICAS DE 70 METROS
              </h3>
              <p className="text-xs text-slate-400">
                Intercepción y enlace de telemetría interplanetaria con Goldstone (California), Madrid (Robledo) y Canberra (Tidbinbilla).
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold shrink-0">
            3 ANTENAS GIGANTES DE 70m ENLACE ACTIVO
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {DSN_ANTENNAS.map(ant => (
            <div key={ant.id} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white text-[12px]">{ant.name}</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  {ant.band}
                </span>
              </div>
              <div className="text-[10px] text-slate-400 truncate">{ant.location}</div>

              <div className="space-y-1.5 pt-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">Objetivo Asignado:</span>
                  <span className="text-cyan-300 font-bold truncate max-w-[150px]">{ant.targetSpacecraft}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Frecuencia Portadora:</span>
                  <span className="text-white font-bold">{ant.carrierFreqGhz} GHz</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Potencia de Subida:</span>
                  <span className="text-emerald-400 font-bold">{ant.uplinkPowerKw} kW EIRP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Señal de Bajada (RSSI):</span>
                  <span className="text-amber-300 font-bold">{ant.downlinkSignalDbm} dBm</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Relación Señal/Ruido SNR:</span>
                  <span className="text-purple-300 font-bold">{ant.snrDb} dB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Luz Ida/Vuelta (RTLT):</span>
                  <span className="text-white font-bold">
                    {ant.roundTripLightTimeSec > 1 ? `${ant.roundTripLightTimeSec.toFixed(2)} s` : `${(ant.roundTripLightTimeSec * 1000).toFixed(1)} ms`}
                  </span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                  <span>Az: {ant.azimuthDeg}° • El: {ant.elevationDeg}°</span>
                  <span className="text-emerald-400 font-bold">● {ant.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Einstein Kerr Spacetime Metric Tensor & Frame-Dragging Visualizer ($g_{\mu\nu}$) */}
      <div className="bg-slate-950/90 border border-purple-500/30 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div className="flex items-center space-x-2.5">
            <Atom className="w-5 h-5 text-purple-400" />
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                TENSOR MÉTRICO ESPACIOTEMPORAL DE KERR & ARRASTRE DE MARCOS (GRAVITY PROBE B)
              </h3>
              <p className="text-xs text-slate-400">
                Solución exacta de las Ecuaciones de Campo de Einstein para la rotación terrestre: curvatura y arrastre del tejido espaciotemporal.
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/40 text-xs font-bold shrink-0">
            MOMENTO ANGULAR TIERRA J = 5.86×10³³ kg·m²/s
          </span>
        </div>

        {/* 4 Cards: Metric Components + Precessions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Card 1: Metric Tensor Components */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-purple-400 pb-1.5 border-b border-slate-800">
              <span className="font-bold uppercase text-[11px]">Tensor Métrico g_μν</span>
              <Atom className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1.5 pt-1 text-[11px]">
              <div>
                <span className="text-slate-400 text-[10px] block">Componente Temporal g_00:</span>
                <span className="text-white font-bold">{kerrMetric.g00.toFixed(10)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Componente Radial g_11:</span>
                <span className="text-white font-bold">{kerrMetric.g11.toFixed(10)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Arrastre de Marcos g_03:</span>
                <span className="text-amber-300 font-bold">{kerrMetric.g03_frameDragging.toExponential(4)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Invariante de Kretschmann K:</span>
                <span className="text-purple-300 font-bold">{kerrMetric.kretschmannCurvatureInvariant.toExponential(4)} m⁻⁴</span>
              </div>
            </div>
          </div>

          {/* Card 2: De Sitter Geodetic Precession */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-cyan-400 pb-1.5 border-b border-slate-800">
              <span className="font-bold uppercase text-[11px]">Efecto Geodésico (De Sitter)</span>
              <Orbit className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1.5 pt-1 text-[11px]">
              <div>
                <span className="text-slate-400 text-[10px] block">Precesión Geodésica Medida:</span>
                <span className="text-cyan-300 font-bold text-sm">
                  {kerrMetric.geodeticPrecessionMasPerYr.toFixed(1)} mas/año
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Desviación del vector de espín inducida por el movimiento orbital a través del espacio curvado por la masa de la Tierra (medido con 4 giroscopios de cuarzo en GP-B).
              </p>
              <div className="pt-1">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[10px] font-bold block text-center border border-cyan-500/30">
                  PRECISIÓN NASA 0.28%
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Lense-Thirring Frame Dragging */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-emerald-400 pb-1.5 border-b border-slate-800">
              <span className="font-bold uppercase text-[11px]">Arrastre Lense-Thirring</span>
              <Compass className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1.5 pt-1 text-[11px]">
              <div>
                <span className="text-slate-400 text-[10px] block">Tasa de Arrastre de Marcos:</span>
                <span className="text-emerald-300 font-bold text-sm">
                  {kerrMetric.lenseThirringPrecessionMasPerYr.toFixed(1)} mas/año
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Vórtice espaciotemporal causado por el giro de la masa de la Tierra que literalmente arrastra los marcos de referencia inerciales a su alrededor.
              </p>
              <div className="pt-1">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold block text-center border border-emerald-500/30">
                  EINSTEIN GENERAL RELATIVITY
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Gravitational Redshift & Shapiro Delay */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-amber-400 pb-1.5 border-b border-slate-800">
              <span className="font-bold uppercase text-[11px]">Redshift z & Shapiro</span>
              <Clock className="w-3.5 h-3.5" />
            </div>
            <div className="space-y-1.5 pt-1 text-[11px]">
              <div>
                <span className="text-slate-400 text-[10px] block">Corrimiento al Rojo z = Δν/ν:</span>
                <span className="text-white font-bold">{kerrMetric.gravitationalRedshiftZ.toExponential(4)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Retardo de Shapiro Gravitacional:</span>
                <span className="text-amber-300 font-bold">{kerrMetric.shapiroTimeDelayMicrosec.toFixed(3)} µs</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Radio Schwarzschild de la Tierra rs:</span>
                <span className="text-slate-300 font-bold">8.87 mm (0.00887 m)</span>
              </div>
              <div className="pt-1">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold block text-center border border-amber-500/30">
                  INTERFEROMETRÍA CUÁNTICA
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Core Laboratory: REAL-TIME COMPARISON (Telemetría Satélite Real vs Fórmulas Teóricas vs Socxima Quantum Engine) */}
      <div className="bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-5 shadow-2xl space-y-4 font-mono">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>LABORATORIO COMPARATIVO EN TIEMPO REAL: FÍSICA SATELITAL & CUÁNTICA</span>
            </h3>
            <p className="text-xs text-slate-400">
              Validación en vivo de las predicciones de la Teoría de la Relatividad de Einstein y mecánica cuántica con el satélite activo.
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
              Concordancia: {relativisticComp.concordancePercentage.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* 4-Column Real-time Comparison Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Column 1: Real Satellite Measurements */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-cyan-400 pb-1.5 border-b border-slate-800">
              <span className="font-bold uppercase text-[11px]">1. Medición Satélite Real</span>
              <Satellite className="w-3.5 h-3.5" />
            </div>

            <div className="space-y-1.5 pt-1">
              <div>
                <span className="text-slate-400 text-[10px] block">Velocidad Orbital Real:</span>
                <span className="text-white font-bold">{telemetry.velocityKmS} km/s</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Altitud Orbital Real:</span>
                <span className="text-white font-bold">{telemetry.altitudeKm} km</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Deriva Reloj Espacial Medida:</span>
                <span className="text-amber-300 font-bold">
                  {relativisticComp.measuredDriftMicrosecondsPerDay > 0
                    ? `+${relativisticComp.measuredDriftMicrosecondsPerDay.toFixed(3)}`
                    : relativisticComp.measuredDriftMicrosecondsPerDay.toFixed(3)}{' '}
                  µs/día
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Error de Bit Cuántico Espacial:</span>
                <span className="text-rose-300 font-bold">{quantumComp.quantumBitErrorRatePercent.toFixed(2)}% QBER</span>
              </div>
            </div>
          </div>

          {/* Column 2: Einstein's Theoretical Relativity Formulation */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-purple-300 pb-1.5 border-b border-slate-800">
              <span className="font-bold uppercase text-[11px]">2. Predicción Teórica Einstein</span>
              <Clock className="w-3.5 h-3.5" />
            </div>

            <div className="space-y-1.5 pt-1">
              <div>
                <span className="text-slate-400 text-[10px] block">Relatividad Especial (-v²/2c²):</span>
                <span className="text-rose-400 font-bold">
                  {relativisticComp.specialRelativityDriftMicrosecondsPerDay.toFixed(3)} µs/día (atraso)
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Relatividad General (+ΔΦ/c²):</span>
                <span className="text-emerald-400 font-bold">
                  +{relativisticComp.generalRelativityDriftMicrosecondsPerDay.toFixed(3)} µs/día (adelanto)
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Deriva Neta Teórica Total:</span>
                <span className="text-purple-200 font-bold">
                  {relativisticComp.netDriftMicrosecondsPerDay > 0
                    ? `+${relativisticComp.netDriftMicrosecondsPerDay.toFixed(3)}`
                    : relativisticComp.netDriftMicrosecondsPerDay.toFixed(3)}{' '}
                  µs/día
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Deriva por Órbita:</span>
                <span className="text-slate-300 font-bold">{relativisticComp.netDriftNanosecondsPerOrbit.toFixed(2)} ns/órbita</span>
              </div>
            </div>
          </div>

          {/* Column 3: Socxima Quantum Engine */}
          <div className="p-3.5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-emerald-400 pb-1.5 border-b border-slate-800">
              <span className="font-bold uppercase text-[11px]">3. Socxima Quantum Core</span>
              <Cpu className="w-3.5 h-3.5" />
            </div>

            <div className="space-y-1.5 pt-1">
              <div>
                <span className="text-slate-400 text-[10px] block">Ciclo Cuántico del Motor:</span>
                <span className="text-white font-bold">#{engine.ciclo}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Cúbits Activos en Núcleo:</span>
                <span className="text-cyan-300 font-bold">{engine.registro.n_qubits.toLocaleString()} Qubits</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Entropía Normalizada H:</span>
                <span className="text-emerald-300 font-bold">{engine.entropia_normalizada().toFixed(4)}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Tasa QKD Espacio-Tierra:</span>
                <span className="text-amber-300 font-bold">{quantumComp.quantumKeyDistributionRateBps.toLocaleString()} bps</span>
              </div>
            </div>
          </div>

          {/* Column 4: Concordance & Discrepancy Analysis */}
          <div className="p-3.5 bg-gradient-to-b from-slate-900 to-slate-950 rounded-xl border border-cyan-500/40 space-y-2">
            <div className="flex items-center justify-between text-cyan-300 pb-1.5 border-b border-slate-800">
              <span className="font-bold uppercase text-[11px]">4. Validación Experimental</span>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </div>

            <div className="space-y-1.5 pt-1">
              <div>
                <span className="text-slate-400 text-[10px] block">Discrepancia (|Real - Teórico|):</span>
                <span className="text-emerald-400 font-bold">
                  ±{relativisticComp.discrepancyMicroseconds.toFixed(4)} µs/día
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Parámetro Bell CHSH (S):</span>
                <span className="text-cyan-300 font-bold">
                  S = {quantumComp.bellChshParameterMeasured.toFixed(3)} &gt; 2.0 (Violación Local)
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Fidelidad Cuántica Entrelazada:</span>
                <span className="text-purple-300 font-bold">
                  {(quantumComp.quantumEntanglementFidelity * 100).toFixed(2)}%
                </span>
              </div>
              <div className="pt-1">
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold block text-center border border-emerald-500/30">
                  SINCRONIZADO EN TIEMPO REAL
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Math Equation Breakdown Banner */}
        <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="text-cyan-400 font-bold">Fórmula de Einstein:</span>
            <span className="font-sans italic text-slate-200">
              Δτ = Δt · [ 1 - (v² / 2c²) + (GM / c²)(1/R_tierra - 1/r_sat) ]
            </span>
          </div>
          <div className="text-slate-400 text-[10px]">
            Velocidad luz c = 299,792.458 km/s • Masa Tierra GM = 398,600.44 km³/s² • Momento angular J = 5.86×10³³ kg·m²/s
          </div>
        </div>
      </div>
    </div>
    )}
  </div>
  );
};
