import React, { useState } from 'react';
import {
  Video,
  Radio,
  Maximize2,
  Minimize2,
  RefreshCw,
  Eye,
  ExternalLink,
  Volume2,
  VolumeX,
  MapPin,
  Sparkles,
  Info,
  Shield,
  Clock,
  Compass,
  Satellite,
  Layers,
  Flame,
  CheckCircle2,
} from 'lucide-react';
import { SPACE_WEBCAMS, SpaceWebcam } from '../core/cosmicMonitoringEngine';
import { SatelliteTelemetry } from '../core/satelliteTelemetryEngine';

interface CosmicLiveWebcamsProps {
  telemetry?: SatelliteTelemetry;
}

export const CosmicLiveWebcams: React.FC<CosmicLiveWebcamsProps> = ({ telemetry }) => {
  const [selectedCamId, setSelectedCamId] = useState<string>(SPACE_WEBCAMS[0].id);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [reloadKey, setReloadKey] = useState<number>(0);
  const [snapshotSuccess, setSnapshotSuccess] = useState<string | null>(null);

  const activeCam: SpaceWebcam = SPACE_WEBCAMS.find(c => c.id === selectedCamId) || SPACE_WEBCAMS[0];

  // If activeCam is ISS, we can reflect live telemetry coordinates
  const currentLat = activeCam.id === 'cam-iss-hd-earth' && telemetry ? telemetry.latitude : activeCam.lat;
  const currentLon = activeCam.id === 'cam-iss-hd-earth' && telemetry ? telemetry.longitude : activeCam.lon;
  const currentAlt = activeCam.id === 'cam-iss-hd-earth' && telemetry ? telemetry.altitudeKm : activeCam.altitudeKm;
  const currentSpeed = activeCam.id === 'cam-iss-hd-earth' && telemetry ? `${telemetry.velocityKmS} km/s` : '0.0 km/s (Terrestre)';

  const handleTakeSnapshot = () => {
    setSnapshotSuccess(
      `¡Captura registrada! Telemetría: ${activeCam.name} @ Lat ${currentLat.toFixed(2)}°, Lon ${currentLon.toFixed(2)}°, Alt ${currentAlt.toFixed(1)} km.`
    );
    setTimeout(() => setSnapshotSuccess(null), 4000);
  };

  return (
    <div className="space-y-4 font-mono">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-cyan-950/60 to-purple-950/70 border border-cyan-500/40 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shrink-0">
            <Video className="w-5 h-5 animate-pulse text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                CÁMARAS WEB & TRANSMISIONES EN VIVO DEL ESPACIO Y LA TIERRA
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-ping" />
                EN VIVO (LIVE FEED)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Transmisiones en tiempo real desde la ISS, NASA TV, observatorios astronómicos de alta montaña y auroras boreales.
            </p>
          </div>
        </div>

        {/* Quick status counters */}
        <div className="flex items-center space-x-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-center space-x-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400" />
            <span>Feeds Activos: <strong className="text-emerald-400">{SPACE_WEBCAMS.length}</strong></span>
          </div>
          <button
            onClick={() => setReloadKey(k => k + 1)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 cursor-pointer"
            title="Recargar transmisión en vivo"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Snapshot Toast Notice */}
      {snapshotSuccess && (
        <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-200 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{snapshotSuccess}</span>
          </div>
        </div>
      )}

      {/* Camera Selector Pills / Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 text-xs">
        {SPACE_WEBCAMS.map(cam => {
          const isSelected = cam.id === activeCam.id;
          return (
            <button
              key={cam.id}
              onClick={() => setSelectedCamId(cam.id)}
              className={`p-2.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between cursor-pointer ${
                isSelected
                  ? 'bg-gradient-to-b from-cyan-950/80 to-slate-900 border-cyan-400 text-white shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400'
                  : 'bg-slate-950/70 border-slate-800/80 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                  <span className="truncate">{cam.operator.split('/')[0]}</span>
                  <span className="flex items-center gap-1 text-[9px] text-red-400 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <div className="font-bold text-slate-100 truncate text-[11px]">
                  {cam.name}
                </div>
                <div className="text-[10px] text-cyan-400/80 truncate mt-0.5">
                  {cam.locationName}
                </div>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                <span className="text-slate-400">{cam.resolution}</span>
                <span className="text-emerald-400 font-bold">{cam.bitrateMbps} Mbps</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Live Stream Player with HUD Telemetry */}
      <div className={`relative bg-black rounded-2xl overflow-hidden border border-cyan-500/30 shadow-2xl transition-all ${
        isFullscreen ? 'fixed inset-2 z-50 rounded-xl' : 'w-full h-[450px] sm:h-[520px]'
      }`}>
        {/* Iframe Video Stream */}
        <iframe
          key={`${activeCam.id}-${reloadKey}`}
          src={activeCam.streamEmbedUrl}
          title={activeCam.name}
          className="w-full h-full border-0 block"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />

        {/* Top Overlay HUD Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {/* Top Left: Camera Name & Status */}
          <div className="bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-xl border border-cyan-500/40 text-xs text-white flex items-center space-x-2.5 shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
            <div>
              <div className="font-bold flex items-center gap-2">
                <span>{activeCam.name}</span>
                <span className="px-1.5 py-0.2 bg-red-500/30 text-red-300 border border-red-500/50 rounded text-[9px] font-bold">
                  TRANSMISIÓN EN DIRECTO
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Operador: {activeCam.operator} • Res: {activeCam.resolution} @ {activeCam.refreshRateFps}fps
              </div>
            </div>
          </div>

          {/* Top Right: Player Controls */}
          <div className="flex items-center space-x-1.5 pointer-events-auto">
            <button
              onClick={handleTakeSnapshot}
              className="px-2.5 py-1.5 bg-slate-950/85 hover:bg-slate-900 text-cyan-300 border border-slate-700 rounded-lg text-xs flex items-center space-x-1.5 transition-all cursor-pointer backdrop-blur-md"
              title="Registrar captura de telemetría de la cámara"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Capturar Telemetría</span>
            </button>

            <a
              href={activeCam.directWebcamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 bg-slate-950/85 hover:bg-slate-900 text-slate-300 border border-slate-700 rounded-lg text-xs flex items-center transition-all cursor-pointer backdrop-blur-md"
              title="Abrir sitio web oficial del operador"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 bg-slate-950/85 hover:bg-slate-900 text-slate-300 border border-slate-700 rounded-lg text-xs flex items-center transition-all cursor-pointer backdrop-blur-md"
              title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Bottom Overlay HUD Bar: Live Telemetry Coordinates */}
        <div className="absolute bottom-3 left-3 right-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[11px] text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1 text-cyan-300 font-bold">
              <MapPin className="w-3.5 h-3.5" />
              <span>{activeCam.locationName}</span>
            </span>
            <span>
              Lat: <strong className="text-white">{currentLat > 0 ? `+${currentLat.toFixed(2)}°` : `${currentLat.toFixed(2)}°`}</strong>
            </span>
            <span>
              Lon: <strong className="text-white">{currentLon > 0 ? `+${currentLon.toFixed(2)}°` : `${currentLon.toFixed(2)}°`}</strong>
            </span>
            <span>
              Alt: <strong className="text-emerald-400">{currentAlt.toFixed(1)} km</strong>
            </span>
            <span>
              Velocidad: <strong className="text-amber-300">{currentSpeed}</strong>
            </span>
          </div>

          <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] text-slate-400">
            Ángulo: <strong className="text-white">{activeCam.viewAngle}</strong>
          </div>
        </div>
      </div>

      {/* Camera Information & Observation Notes */}
      <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 text-xs space-y-2">
        <div className="flex items-center space-x-2 text-cyan-400 font-bold">
          <Info className="w-4 h-4" />
          <span>DESCRIPCIÓN DE LA CÁMARA & CONDICIONES DE OBSERVACIÓN:</span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          {activeCam.description}
        </p>
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
          <span>* En cámaras satelitales LEO (como la ISS), la señal puede entrar momentáneamente en zona nocturna o cambio de satélite de retransmisión TDRS cada 45 minutos.</span>
          <span className="text-cyan-400 font-bold">Protocolo de emisión: HLS / RTMP Encrypted Web Stream</span>
        </div>
      </div>
    </div>
  );
};
