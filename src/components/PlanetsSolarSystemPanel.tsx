import React, { useState, useEffect } from 'react';
import {
  Orbit,
  Sparkles,
  Compass,
  Clock,
  Eye,
  Info,
  Layers,
  Sun,
  Moon,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import {
  getRealtimePlanetaryEphemeris,
  PlanetSolarSystemData,
} from '../core/cosmicMonitoringEngine';

export const PlanetsSolarSystemPanel: React.FC = () => {
  const [planets, setPlanets] = useState<PlanetSolarSystemData[]>(getRealtimePlanetaryEphemeris);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string>('mars');

  useEffect(() => {
    const timer = setInterval(() => {
      setPlanets(getRealtimePlanetaryEphemeris());
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const activePlanet = planets.find(p => p.id === selectedPlanetId) || planets[0];

  return (
    <div className="space-y-4 font-mono">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-indigo-950/50 to-cyan-950/70 border border-indigo-500/40 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/50 flex items-center justify-center text-indigo-300 shrink-0">
            <Orbit className="w-5 h-5 animate-spin-slow text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                PLANETAS ALREDEDOR DE LA TIERRA & SISTEMA SOLAR EN TIEMPO REAL
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold">
                EFEMÉRIDES GEOCÉNTRICAS & HELIOCÉNTRICAS
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Posición exacta, distancias astronómicas en UA y km, retardo de señal a la velocidad de la luz (c = 300,000 km/s) y visibilidad en el cielo nocturno.
            </p>
          </div>
        </div>
      </div>

      {/* Planet Selector Tabs */}
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 text-xs">
        {planets.map(p => {
          const isSelected = p.id === activePlanet.id;
          return (
            <button
              key={p.id}
              onClick={() => setSelectedPlanetId(p.id)}
              className={`p-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-between ${
                isSelected
                  ? 'bg-gradient-to-b from-indigo-950/90 to-slate-900 border-indigo-400 text-white shadow-lg ring-1 ring-indigo-400'
                  : 'bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div
                className="w-4 h-4 rounded-full mb-1 shadow-sm"
                style={{ backgroundColor: p.colorHex }}
              />
              <span className="font-bold text-[11px] truncate w-full">{p.name.split(' ')[0]}</span>
              <span className="text-[10px] text-cyan-400 mt-0.5">{p.distanceAu.toFixed(2)} AU</span>
            </button>
          );
        })}
      </div>

      {/* Selected Planet Deep-Dive Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Details */}
        <div className="lg:col-span-2 bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div
                className="w-5 h-5 rounded-full"
                style={{ backgroundColor: activePlanet.colorHex }}
              />
              <span className="text-sm font-bold text-white uppercase">{activePlanet.name}</span>
              <span className="text-xs text-indigo-400">({activePlanet.category})</span>
            </div>
            <span className="text-[10px] text-slate-400">
              Constelación Actual: <strong className="text-cyan-300">{activePlanet.constellation}</strong>
            </span>
          </div>

          {/* Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Distancia a la Tierra</span>
              <span className="text-white font-bold text-sm block">{activePlanet.distanceAu} AU</span>
              <span className="text-cyan-300 text-[10px]">{(activePlanet.distanceKm / 1e6).toFixed(2)} M km</span>
            </div>

            <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Retardo de Señal Luz (c)</span>
              <span className="text-amber-300 font-bold text-sm block">{activePlanet.lightTravelTimeFormatted}</span>
              <span className="text-slate-500 text-[10px]">{activePlanet.lightTravelTimeSec.toFixed(1)} segundos luz</span>
            </div>

            <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Magnitud Aparente</span>
              <span className="text-emerald-400 font-bold text-sm block">Mag {activePlanet.apparentMagnitude}</span>
              <span className="text-slate-400 text-[10px]">Brillo en el cielo</span>
            </div>

            <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800">
              <span className="text-slate-400 text-[10px] block">Fase Iluminada</span>
              <span className="text-purple-300 font-bold text-sm block">{activePlanet.illuminationPct}%</span>
              <span className="text-slate-400 text-[10px]">Elongación: {activePlanet.elongationDeg}°</span>
            </div>
          </div>

          {/* Planetary Physics & Features */}
          <div className="p-3 bg-slate-900/70 rounded-xl border border-slate-800 text-xs space-y-2">
            <div className="flex items-center space-x-2 text-indigo-300 font-bold">
              <Sparkles className="w-4 h-4" />
              <span>CARACTERÍSTICAS FÍSICAS & ASTRONÓMICAS:</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              {activePlanet.keyFeature}
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[10px] text-slate-400">
              <div>Diámetro Ecuatorial: <strong className="text-white">{activePlanet.diameterKm.toLocaleString()} km</strong></div>
              <div>Velocidad Orbital: <strong className="text-cyan-300">{activePlanet.orbitalVelocityKmS} km/s</strong></div>
              <div>Lunas Conocidas: <strong className="text-amber-300">{activePlanet.moonsCount} satélites</strong></div>
            </div>
          </div>

          {/* Sky Observation Guide */}
          <div className="p-3 bg-indigo-950/30 rounded-xl border border-indigo-500/30 text-xs space-y-1">
            <div className="flex items-center space-x-2 text-indigo-300 font-bold">
              <Eye className="w-4 h-4" />
              <span>CÓMO Y CUÁNDO OBSERVARLO DESDE LA TIERRA:</span>
            </div>
            <p className="text-slate-200 text-[11px]">
              {activePlanet.visibilitySummary}
            </p>
          </div>
        </div>

        {/* 2D Solar System Orbital Mini-Radar */}
        <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-4 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-indigo-300 pb-2 border-b border-slate-800">
              <span className="text-xs font-bold uppercase">MAPA ORBITAL HELIOCÉNTRICO</span>
              <Orbit className="w-4 h-4" />
            </div>

            {/* SVG Mini Orbital Radar */}
            <div className="py-2 flex items-center justify-center">
              <svg viewBox="-110 -110 220 220" className="w-56 h-56">
                {/* Background radar circles */}
                <circle cx="0" cy="0" r="18" fill="none" stroke="#334155" strokeWidth="0.8" strokeDasharray="2,2" />
                <circle cx="0" cy="0" r="32" fill="none" stroke="#334155" strokeWidth="0.8" strokeDasharray="2,2" />
                <circle cx="0" cy="0" r="48" fill="none" stroke="#3b82f6" strokeWidth="1" opacity="0.6" /> {/* Earth orbit */}
                <circle cx="0" cy="0" r="68" fill="none" stroke="#334155" strokeWidth="0.8" strokeDasharray="2,2" />
                <circle cx="0" cy="0" r="95" fill="none" stroke="#334155" strokeWidth="0.8" strokeDasharray="2,2" />

                {/* Sun at Center */}
                <circle cx="0" cy="0" r="6" fill="#f59e0b" />
                <text x="0" y="2" textAnchor="middle" fontSize="6" fill="#000" fontWeight="bold">☉</text>

                {/* Earth position on its ring */}
                <circle cx="48" cy="0" r="4.5" fill="#38bdf8" />
                <text x="48" y="-7" textAnchor="middle" fontSize="6" fill="#38bdf8" fontWeight="bold">Tierra</text>

                {/* Dynamic planets on visual positions */}
                {planets.filter(p => p.id !== 'sun').map((p, idx) => {
                  const rad = 14 + idx * 10;
                  const angleRad = (p.orbitalAngleDeg * Math.PI) / 180;
                  const cx = Math.cos(angleRad) * rad;
                  const cy = Math.sin(angleRad) * rad;
                  const isCur = p.id === activePlanet.id;

                  return (
                    <g key={p.id}>
                      {isCur && (
                        <circle cx={cx} cy={cy} r="7" fill="none" stroke="#818cf8" strokeWidth="1.5" className="animate-ping" />
                      )}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={isCur ? 4 : 2.5}
                        fill={p.colorHex}
                        stroke="#0f172a"
                        strokeWidth="1"
                      />
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 text-[10px] text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Órbita de la Tierra:</span>
              <strong className="text-cyan-300">1.000 AU (Radio R = 149.6M km)</strong>
            </div>
            <div className="flex justify-between">
              <span>Velocidad orbital terrestre:</span>
              <strong className="text-emerald-400">29.78 km/s (107,200 km/h)</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
