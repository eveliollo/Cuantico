import React, { useState, useEffect } from 'react';
import {
  Flame,
  AlertTriangle,
  Radio,
  Clock,
  Compass,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Activity,
  Layers,
  Volume2,
  VolumeX,
  Target,
  Orbit,
  ExternalLink,
} from 'lucide-react';
import {
  NEAR_EARTH_ASTEROIDS,
  BOLIDE_FIREBALL_EVENTS,
  METEOR_SHOWERS,
  NearEarthAsteroid,
  BolideFireballEvent,
  MeteorShower,
  LiveMeteorPing,
} from '../core/cosmicMonitoringEngine';

export const MeteoritesBolidesPanel: React.FC = () => {
  const [activeSubtab, setActiveSubtab] = useState<'asteroids' | 'bolides' | 'showers' | 'radar'>('asteroids');
  const [selectedAsteroid, setSelectedAsteroid] = useState<NearEarthAsteroid>(NEAR_EARTH_ASTEROIDS[0]);
  const [livePings, setLivePings] = useState<LiveMeteorPing[]>([]);
  const [radarSoundEnabled, setRadarSoundEnabled] = useState<boolean>(false);

  // Periodic simulated meteor detection radar blips
  useEffect(() => {
    const stations = ['BRAMS (Bélgica)', 'Graves Radar (Francia)', 'Albuquerque Meteor Net (EE.UU.)', 'IAC Teide Sky (España)', 'Atacama Sky (Chile)'];

    const interval = setInterval(() => {
      const now = Date.now();
      const station = stations[Math.floor(Math.random() * stations.length)];
      const mass = Number((Math.random() * 4.5 + 0.1).toFixed(2));
      const alt = Math.round(75 + Math.random() * 35);
      const newPing: LiveMeteorPing = {
        id: `ping_${now}`,
        timestamp: now,
        stationName: station,
        signalStrengthDb: Math.round(18 + Math.random() * 34),
        dopplerDurationMs: Math.round(150 + Math.random() * 850),
        estimatedMassGrams: mass,
        altitudeKm: alt,
        coords: {
          lat: Number((Math.random() * 120 - 60).toFixed(2)),
          lon: Number((Math.random() * 360 - 180).toFixed(2)),
        },
      };

      setLivePings(prev => [newPing, ...prev.slice(0, 14)]);
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 font-mono">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-amber-950/50 to-red-950/70 border border-amber-500/40 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shrink-0">
            <Flame className="w-5 h-5 animate-pulse text-amber-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                MONITOREO DE METEORITOS, BÓLIDOS & ASTEROIDES (NEOs)
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                NASA CNEOS / SENTRY WATCH
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Detección de objetos cercanos a la Tierra (Near-Earth Objects), bólidos con energía de impacto, lluvias de meteoros activas y radar de ionización.
            </p>
          </div>
        </div>

        {/* Subtab buttons */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            onClick={() => setActiveSubtab('asteroids')}
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              activeSubtab === 'asteroids'
                ? 'bg-amber-500/20 border-amber-400 text-amber-300 font-bold'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Asteroides (NEOs)
          </button>
          <button
            onClick={() => setActiveSubtab('bolides')}
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              activeSubtab === 'bolides'
                ? 'bg-red-500/20 border-red-400 text-red-300 font-bold'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Bólidos & Impactos
          </button>
          <button
            onClick={() => setActiveSubtab('showers')}
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              activeSubtab === 'showers'
                ? 'bg-purple-500/20 border-purple-400 text-purple-300 font-bold'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Lluvias de Meteoros
          </button>
          <button
            onClick={() => setActiveSubtab('radar')}
            className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubtab === 'radar'
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Radar en Vivo</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: Near-Earth Asteroids */}
      {activeSubtab === 'asteroids' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* List of Asteroids */}
            <div className="lg:col-span-2 bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  OBJETOS CERCANOS A LA TIERRA (CLOSE APPROACH MONITOR):
                </span>
                <span className="text-[10px] text-slate-400">Datos calibrados JPL Small-Body Database</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                      <th className="pb-2 font-semibold">Asteroide</th>
                      <th className="pb-2 font-semibold">Diámetro</th>
                      <th className="pb-2 font-semibold">Velocidad</th>
                      <th className="pb-2 font-semibold">Distancia Mínima</th>
                      <th className="pb-2 font-semibold">Peligro (PHA)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {NEAR_EARTH_ASTEROIDS.map(ast => {
                      const isSelected = ast.id === selectedAsteroid.id;
                      return (
                        <tr
                          key={ast.id}
                          onClick={() => setSelectedAsteroid(ast)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-amber-500/10 text-white font-bold' : 'text-slate-300 hover:bg-slate-900/60'
                          }`}
                        >
                          <td className="py-2.5">
                            <div className="text-amber-300">{ast.name}</div>
                            <div className="text-[10px] text-slate-500">Clase: {ast.orbitClass} • {ast.spectralType}</div>
                          </td>
                          <td className="py-2.5 text-slate-200">{ast.diameterFormatted}</td>
                          <td className="py-2.5 text-cyan-300">{ast.velocityKmS} km/s</td>
                          <td className="py-2.5">
                            <div>{ast.missDistanceKm.toLocaleString()} km</div>
                            <div className="text-[10px] text-slate-400">{ast.missDistanceLunarDistances.toFixed(2)} LD (Dist. Lunares)</div>
                          </td>
                          <td className="py-2.5">
                            {ast.isPotentiallyHazardous ? (
                              <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/40 text-[10px] font-bold">
                                PHA POTENCIAL
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                                SEGURO
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selected Asteroid Details */}
            <div className="bg-slate-900/90 rounded-2xl border border-amber-500/40 p-4 space-y-3">
              <div className="flex items-center justify-between text-amber-300 pb-2 border-b border-slate-800">
                <span className="text-xs font-bold uppercase">FICHA TÉCNICA ORBITAL</span>
                <Orbit className="w-4 h-4" />
              </div>

              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">Nombre Oficial</span>
                  <span className="text-base font-bold text-white">{selectedAsteroid.name}</span>
                </div>

                <div>
                  <span className="text-slate-400 text-[10px] block">Fecha de Máximo Acercamiento</span>
                  <span className="text-emerald-300 font-bold">{selectedAsteroid.closeApproachDateFormatted}</span>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Velocidad Relativa</span>
                    <span className="text-cyan-300 font-bold text-sm">{selectedAsteroid.velocityKmS} km/s</span>
                    <span className="text-[9px] text-slate-500">{(selectedAsteroid.velocityKmS * 3600).toLocaleString()} km/h</span>
                  </div>

                  <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 block">Masa Estimada</span>
                    <span className="text-amber-300 font-bold text-sm">{(selectedAsteroid.estimatedMassTons / 1000).toLocaleString()} kt</span>
                    <span className="text-[9px] text-slate-500">{selectedAsteroid.spectralType}</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Escala de Torino:</span>
                    <strong className="text-white">{selectedAsteroid.torinoScale} / 10 (Sin peligro inminente)</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Familia Orbital:</span>
                    <strong className="text-purple-300">{selectedAsteroid.orbitClass} (Cruce de órbita terrestre)</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: Bolides & Atmospheric Impacts (Fireballs) */}
      {activeSubtab === 'bolides' && (
        <div className="space-y-4">
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-red-400 flex items-center gap-2">
                <Flame className="w-4 h-4" />
                HISTORIAL DE BÓLIDOS & EVENTOS DE IMPACTO ATMOSFÉRICO REGISTRADOS (NASA CNEOS):
              </span>
              <span className="text-[10px] text-slate-400">Sensores ópticos e infrarrojos de defensa planetaria</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {BOLIDE_FIREBALL_EVENTS.map(b => (
                <div key={b.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{b.locationName}</span>
                    <span className="text-red-400 font-bold text-[10px]">{b.impactEnergyKtTnt} kt TNT</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Fecha: <span className="text-slate-200">{new Date(b.timestampIso).toLocaleDateString()} {new Date(b.timestampIso).toLocaleTimeString()}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                    <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-500 block">Altitud Detonación</span>
                      <span className="text-amber-300 font-bold">{b.altitudeKm} km</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-950 border border-slate-800/80">
                      <span className="text-slate-500 block">Velocidad Entrada</span>
                      <span className="text-cyan-300 font-bold">{b.velocityKmS} km/s</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60">
                    <span>Brillo Óptico: <strong className="text-yellow-300">Mag {b.brightnessMagnitude}</strong></span>
                    <span>Lat: {b.lat}° / Lon: {b.lon}°</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: Active Meteor Showers */}
      {activeSubtab === 'showers' && (
        <div className="space-y-4">
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                CALENDARIO DE LLUVIAS DE METEOROS PRINCIPALES:
              </span>
              <span className="text-[10px] text-slate-400">ZHR: Tasa Horaria Cenital estimada bajo cielo oscuro</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {METEOR_SHOWERS.map(s => (
                <div key={s.id} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{s.name}</span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-bold">
                      {s.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Constelación Radiante: <span className="text-cyan-300 font-bold">{s.radiantConstellation}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Período Activo: <span className="text-slate-200">{s.activePeriod}</span> (Pico: <strong className="text-amber-300">{s.peakDate}</strong>)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                    <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block">Tasa Cenital (ZHR)</span>
                      <span className="text-emerald-400 font-bold text-xs">{s.zhr} meteoros/h</span>
                    </div>
                    <div className="p-1.5 rounded bg-slate-950 border border-slate-800">
                      <span className="text-slate-500 block">Velocidad</span>
                      <span className="text-cyan-300 font-bold text-xs">{s.velocityKmS} km/s</span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 pt-1 border-t border-slate-800/60">
                    Cuerpo Progenitor: <strong className="text-slate-200">{s.parentBody}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: Live Meteor Doppler Radar */}
      {activeSubtab === 'radar' && (
        <div className="space-y-4">
          <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-2">
                <Radio className="w-4 h-4 animate-pulse text-cyan-400" />
                RADAR DOPPLER GLOBAL DE DETECCIÓN DE TRAZAS IONIZADAS DE METEOROS:
              </span>
              <span className="text-[10px] text-slate-400">Ecos ionosféricos capturados en directo (VHF 49.99 MHz)</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase">
                    <th className="pb-2 font-semibold">Hora Detección</th>
                    <th className="pb-2 font-semibold">Estación Receptora</th>
                    <th className="pb-2 font-semibold">Intensidad Señal (dB)</th>
                    <th className="pb-2 font-semibold">Duración Eco</th>
                    <th className="pb-2 font-semibold">Altitud Traza</th>
                    <th className="pb-2 font-semibold">Masa Estimada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {livePings.map(p => (
                    <tr key={p.id} className="text-slate-300 hover:bg-slate-900/60 animate-fadeIn">
                      <td className="py-2 font-mono text-cyan-400">{new Date(p.timestamp).toLocaleTimeString()}</td>
                      <td className="py-2 font-bold text-white">{p.stationName}</td>
                      <td className="py-2 text-emerald-400">+{p.signalStrengthDb} dB</td>
                      <td className="py-2 text-amber-300">{p.dopplerDurationMs} ms</td>
                      <td className="py-2 text-slate-200">{p.altitudeKm} km (Mesosfera)</td>
                      <td className="py-2 text-purple-300 font-bold">{p.estimatedMassGrams} g</td>
                    </tr>
                  ))}
                  {livePings.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-slate-500">
                        Esperando ecos de trazas ionizadas en la red de radares...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
