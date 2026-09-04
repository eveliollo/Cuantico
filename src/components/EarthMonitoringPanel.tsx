import React, { useState, useEffect } from 'react';
import {
  Globe,
  Sun,
  Wind,
  Compass,
  Layers,
  Thermometer,
  Gauge,
  Activity,
  Zap,
  Sparkles,
  RefreshCw,
  Shield,
  Cloud,
  CheckCircle2,
} from 'lucide-react';
import {
  getRealtimeEarthMonitoring,
  EarthMonitoringData,
} from '../core/cosmicMonitoringEngine';

export const EarthMonitoringPanel: React.FC = () => {
  const [earthData, setEarthData] = useState<EarthMonitoringData>(getRealtimeEarthMonitoring);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setEarthData(getRealtimeEarthMonitoring());
      setLastUpdated(new Date());
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const activeLayer = earthData.atmosphereLayers[selectedLayerIndex];

  return (
    <div className="space-y-4 font-mono">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900/90 via-emerald-950/50 to-cyan-950/70 border border-emerald-500/30 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 shrink-0">
            <Globe className="w-5 h-5 animate-pulse text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                MONITOREO DE LA TIERRA EN TIEMPO REAL
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold">
                PLANETA TIERRA (1.000 AU)
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Telemetría de la atmósfera, magnetosfera, clima espacial NOAA, índice geomagnético Kp y óvalo auroral.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 flex items-center space-x-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span>Actualizado: <strong className="text-white">{lastUpdated.toLocaleTimeString()}</strong></span>
          </div>
          <button
            onClick={() => {
              setEarthData(getRealtimeEarthMonitoring());
              setLastUpdated(new Date());
            }}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 cursor-pointer"
            title="Actualizar datos terrestres"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid of Key Global Indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Kp Index */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>Índice Geomagnético Kp</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-300">
            {earthData.kpIndex} / 9.0
          </div>
          <div className="text-[10px] text-slate-400">
            Estado: <strong className="text-emerald-400">{earthData.kpStatus}</strong>
          </div>
        </div>

        {/* Solar Wind */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>Viento Solar (NOAA)</span>
            <Wind className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-lg font-bold text-cyan-300">
            {earthData.solarWindSpeedKmS} km/s
          </div>
          <div className="text-[10px] text-slate-400">
            Densidad: <strong className="text-cyan-400">{earthData.solarWindDensityPcm3} p/cm³</strong>
          </div>
        </div>

        {/* Magnetic Field */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>Campo Magnético Terrestre</span>
            <Compass className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-purple-300">
            {earthData.magneticFieldNt.toLocaleString()} nT
          </div>
          <div className="text-[10px] text-slate-400">
            Inclinación Dipolo: <strong className="text-purple-300">{earthData.magneticDipoleTiltDeg}°</strong>
          </div>
        </div>

        {/* Aurora Oval Activity */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>Óvalo de Auroras</span>
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400">
            {earthData.auroraActivityIndex}
          </div>
          <div className="text-[10px] text-slate-400">
            Límite Latitud: <strong className="text-white">{earthData.auroraOvalLatitudeDeg}° N</strong>
          </div>
        </div>

        {/* Solar Irradiance */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>Constante Solar (TSI)</span>
            <Sun className="w-3.5 h-3.5 text-yellow-400" />
          </div>
          <div className="text-lg font-bold text-yellow-300">
            {earthData.solarIrradianceWm2} W/m²
          </div>
          <div className="text-[10px] text-slate-400">
            Subsolar: <strong className="text-white">{earthData.subsolarPoint.lat}° / {earthData.subsolarPoint.lon}°</strong>
          </div>
        </div>

        {/* Global Cloud Cover */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-[10px]">
            <span>Cobertura de Nubes</span>
            <Cloud className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-blue-300">
            {earthData.globalCloudCoverPct}%
          </div>
          <div className="text-[10px] text-slate-400">
            Temp. Media Superficie: <strong className="text-white">{earthData.surfaceAverageTempC}°C</strong>
          </div>
        </div>
      </div>

      {/* Atmospheric Layers Breakdown */}
      <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-cyan-300 text-xs font-bold">
            <Layers className="w-4 h-4" />
            <span>ESTRUCTURA DE CAPAS ATMOSFÉRICAS & ESCUDO TERRESTRE:</span>
          </div>
          <span className="text-[11px] text-slate-400">
            Selecciona una capa para ver parámetros termodinámicos y físicos
          </span>
        </div>

        {/* Layer Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {earthData.atmosphereLayers.map((layer, idx) => {
            const isSelected = selectedLayerIndex === idx;
            return (
              <button
                key={layer.name}
                onClick={() => setSelectedLayerIndex(idx)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-gradient-to-b from-cyan-950/90 to-slate-900 border-cyan-400 text-white shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <div className="text-xs font-bold">{layer.name}</div>
                <div className="text-[10px] text-cyan-400/90">{layer.altRangeKm}</div>
              </button>
            );
          })}
        </div>

        {/* Selected Layer Detailed Box */}
        <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] block uppercase">Capa Seleccionada</span>
            <span className="text-base font-bold text-white">{activeLayer.name}</span>
            <span className="text-cyan-300 block text-xs mt-0.5">Altitud: {activeLayer.altRangeKm}</span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] block uppercase">Temperatura & Presión</span>
            <span className="text-white font-bold block">{activeLayer.tempC}°C</span>
            <span className="text-amber-300 text-[11px]">Presión: {activeLayer.pressureHpa} hPa</span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] block uppercase">Composición Gaseosa</span>
            <span className="text-slate-200 block text-[11px] font-mono">{activeLayer.primaryGas}</span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] block uppercase">Fenómenos & Protección</span>
            <span className="text-emerald-300 block text-[11px] leading-snug">{activeLayer.phenomena}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
