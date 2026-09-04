import React, { useRef, useEffect } from 'react';
import { SatelliteTelemetry, GroundStation, GROUND_STATIONS } from '../core/satelliteTelemetryEngine';

interface Satellite2DMapProps {
  telemetry: SatelliteTelemetry;
  selectedStation: GroundStation;
  onSelectStation: (st: GroundStation) => void;
}

export const Satellite2DMap: React.FC<Satellite2DMapProps> = ({
  telemetry,
  selectedStation,
  onSelectStation,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Convert Lat/Lon to Canvas X/Y coordinates (Equirectangular / Mercator projection)
    const toX = (lon: number) => ((lon + 180) / 360) * width;
    const toY = (lat: number) => ((90 - lat) / 180) * height;

    // 1. Deep space background
    ctx.fillStyle = '#050b14';
    ctx.fillRect(0, 0, width, height);

    // 2. Latitude and Longitude Grid lines
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.lineWidth = 1;

    // Longitudes
    for (let lon = -180; lon <= 180; lon += 30) {
      const x = toX(lon);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      // Label
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = '9px monospace';
      ctx.fillText(`${lon}°`, x + 3, height - 6);
    }

    // Latitudes
    for (let lat = -80; lat <= 80; lat += 20) {
      const y = toY(lat);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      ctx.font = '9px monospace';
      ctx.fillText(`${lat}°`, 4, y - 3);
    }

    // Equator (Green glow line)
    const eqY = toY(0);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, eqY);
    ctx.lineTo(width, eqY);
    ctx.stroke();

    // Prime Meridian (Cyan line)
    const pmX = toX(0);
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pmX, 0);
    ctx.lineTo(pmX, height);
    ctx.stroke();

    // 3. Stylized Continents Outlines
    ctx.fillStyle = 'rgba(30, 41, 59, 0.5)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 1;

    // Eurasia block
    ctx.beginPath();
    ctx.ellipse(toX(60), toY(45), (100 / 360) * width, (35 / 180) * height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Africa block
    ctx.beginPath();
    ctx.ellipse(toX(20), toY(0), (45 / 360) * width, (40 / 180) * height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // North America block
    ctx.beginPath();
    ctx.ellipse(toX(-100), toY(45), (55 / 360) * width, (35 / 180) * height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // South America block
    ctx.beginPath();
    ctx.ellipse(toX(-60), toY(-20), (35 / 360) * width, (45 / 180) * height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Australia block
    ctx.beginPath();
    ctx.ellipse(toX(135), toY(-25), (30 / 360) * width, (20 / 180) * height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. Day / Night Terminator Shadow Curve
    // Approximated based on solar sub-point
    ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
    ctx.beginPath();
    const solLon = telemetry.solarLon;
    const solLat = telemetry.solarLat;
    for (let x = 0; x <= width; x += 10) {
      const lon = (x / width) * 360 - 180;
      const dLonRad = ((lon - solLon) * Math.PI) / 180;
      const termLat = -Math.atan(Math.cos(dLonRad) / Math.tan(Math.max(0.01, (solLat * Math.PI) / 180))) * (180 / Math.PI);
      const y = toY(Math.max(-85, Math.min(85, termLat)));
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();

    // 5. Projected Ground Track (Sine-like ground track wave of 1 full orbit)
    const inc = 51.64; // inclination
    ctx.strokeStyle = 'rgba(244, 63, 94, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();

    const currentLat = telemetry.latitude;
    const currentLon = telemetry.longitude;

    for (let step = -180; step <= 180; step += 4) {
      const lon = ((currentLon + step + 540) % 360) - 180;
      const lat = inc * Math.sin(((lon - currentLon) * Math.PI) / 180 + Math.asin(Math.max(-1, Math.min(1, currentLat / inc))));
      const px = toX(lon);
      const py = toY(lat);
      if (step === -180) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // 6. Ground Footprint Circle around Satellite
    const satX = toX(telemetry.longitude);
    const satY = toY(telemetry.latitude);
    const footprintRadiusPx = (telemetry.footprintKm / 40000) * width * 0.7;

    ctx.fillStyle = 'rgba(56, 189, 248, 0.12)';
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(satX, satY, Math.max(10, footprintRadiusPx), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 7. Ground Stations Pins & Link Lines
    GROUND_STATIONS.forEach(st => {
      const gx = toX(st.lon);
      const gy = toY(st.lat);
      const isSelected = st.id === selectedStation.id;

      // Distance to satellite on canvas
      const dx = satX - gx;
      const dy = satY - gy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const inCoverage = dist <= Math.max(10, footprintRadiusPx);

      // Line connecting to satellite if selected
      if (isSelected) {
        ctx.strokeStyle = inCoverage ? 'rgba(16, 185, 129, 0.85)' : 'rgba(234, 179, 8, 0.6)';
        ctx.lineWidth = inCoverage ? 2 : 1.2;
        ctx.setLineDash(inCoverage ? [] : [3, 3]);
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(satX, satY);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Station Marker
      ctx.fillStyle = isSelected
        ? inCoverage ? '#10b981' : '#eab308'
        : '#06b6d4';
      ctx.beginPath();
      ctx.arc(gx, gy, isSelected ? 4.5 : 3, 0, Math.PI * 2);
      ctx.fill();

      // Station label
      ctx.fillStyle = isSelected ? '#34d399' : '#94a3b8';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(st.name.split(' ')[0], gx + 6, gy + 3);
    });

    // 8. Satellite Marker Icon & Radar Pulse
    // Pulsing ring
    const now = Date.now();
    const pulsePhase = (now % 1500) / 1500;
    const pulseRadius = 6 + pulsePhase * 16;
    ctx.strokeStyle = `rgba(244, 63, 94, ${1 - pulsePhase})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(satX, satY, pulseRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Center satellite diamond
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.moveTo(satX, satY - 7);
    ctx.lineTo(satX + 7, satY);
    ctx.lineTo(satX, satY + 7);
    ctx.lineTo(satX - 7, satY);
    ctx.closePath();
    ctx.fill();

    // Satellite label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px monospace';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 4;
    ctx.fillText(`${telemetry.name.split(' ')[0]} [${telemetry.altitudeKm} km]`, satX + 10, satY - 4);
    ctx.shadowBlur = 0;

  }, [telemetry, selectedStation]);

  return (
    <div className="relative w-full h-[380px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      <canvas
        ref={canvasRef}
        width={960}
        height={480}
        className="w-full h-full block object-cover"
      />

      {/* Floating 2D Controls & Legend */}
      <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/70 text-xs font-mono text-cyan-300 flex items-center space-x-2">
        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
        <span>Proyección Mercator Orbital • Cobertura en Vivo</span>
      </div>

      {/* Ground Station Selection Chips */}
      <div className="absolute bottom-3 left-3 right-3 bg-slate-950/85 backdrop-blur-md p-2 rounded-xl border border-slate-800 flex flex-wrap items-center gap-1.5 text-xs font-mono">
        <span className="text-slate-400 text-[10px] uppercase font-bold pl-1">Estación Terrena:</span>
        {GROUND_STATIONS.map(st => {
          const isSelected = st.id === selectedStation.id;
          return (
            <button
              key={st.id}
              onClick={() => onSelectStation(st)}
              className={`px-2 py-0.5 rounded-md text-[11px] transition-all border ${
                isSelected
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 font-bold'
                  : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-white'
              }`}
            >
              {st.name.split(' ')[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
};
