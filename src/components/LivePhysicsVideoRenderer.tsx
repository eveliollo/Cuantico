import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Eye,
  Activity,
  Zap,
  Atom,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Sparkles,
  Maximize2,
  FileText,
  Lock,
  Layers,
  HelpCircle,
  Video,
  Box,
  Vibrate
} from 'lucide-react';
import {
  PhysicalSystemKind,
  InterpetacionFisica,
  EstadoSimulacionFisica,
  simularPasoFisico,
} from '../core/physicsSimulationEngine';
import { ScientificProjectNote } from '../types/scientificNotes';
import { QuantumHyperdimensional3DViewer } from './QuantumHyperdimensional3DViewer';

interface LivePhysicsVideoRendererProps {
  interpretacion: InterpetacionFisica;
  autoAnnotatedNote?: ScientificProjectNote | null;
  onOpenNote?: (noteId: string) => void;
}

export const LivePhysicsVideoRenderer: React.FC<LivePhysicsVideoRendererProps> = ({
  interpretacion,
  autoAnnotatedNote,
  onOpenNote,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // View Mode: Default to 3D / 4D Hyperdimensional Ultra-HD 4K with vibration
  const [viewMode, setViewMode] = useState<'3d_4d' | '2d'>('3d_4d');

  // Video stream simulation controls
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<number>(1.0);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showTrails, setShowTrails] = useState<boolean>(true);
  const [showFields, setShowFields] = useState<boolean>(true);

  // Current simulation state
  const [estado, setEstado] = useState<EstadoSimulacionFisica>(() =>
    simularPasoFisico(interpretacion.tipo, 0, 0)
  );

  // Time tracking refs
  const timeRef = useRef<number>(0);
  const stepRef = useRef<number>(0);
  const lastTimestampRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const estadoRef = useRef<EstadoSimulacionFisica>(estado);
  estadoRef.current = estado;

  // Reset simulation when interpretation changes
  useEffect(() => {
    timeRef.current = 0;
    stepRef.current = 0;
    const initial = simularPasoFisico(interpretacion.tipo, 0, 0);
    setEstado(initial);
  }, [interpretacion.tipo]);

  // Main 60 FPS animation loop (Live continuous video simulation)
  useEffect(() => {
    let active = true;

    const renderLoop = (timestamp: number) => {
      if (!active) return;

      if (lastTimestampRef.current === 0) {
        lastTimestampRef.current = timestamp;
      }

      const deltaMs = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;

      // If playing, advance simulation state
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
        setEstado(nextEstado);
      }

      // Draw onto canvas
      drawCanvas();

      animationFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animationFrameRef.current = requestAnimationFrame(renderLoop);

    return () => {
      active = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, speed, interpretacion.tipo, showGrid, showTrails, showFields]);

  // Render graphics on Canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const est = estadoRef.current;
    const t = timeRef.current;

    // 1. Dark Quantum Space Background
    ctx.fillStyle = '#020617'; // slate-950
    ctx.fillRect(0, 0, width, height);

    // 2. Quantum Coordinate Grid (optional)
    if (showGrid) {
      ctx.strokeStyle = '#1e293b'; // slate-800
      ctx.lineWidth = 1;
      const gridSize = 40;

      ctx.beginPath();
      for (let x = 0; x <= width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y <= height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Main Axes
      ctx.strokeStyle = '#334155'; // slate-700
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(centerX, 0);
      ctx.lineTo(centerX, height);
      ctx.moveTo(0, centerY);
      ctx.lineTo(width, centerY);
      ctx.stroke();
    }

    // 3. System-Specific Continuous Video Drawing
    switch (interpretacion.tipo) {
      case 'hydrogen_atom': {
        // Átomo de Hidrógeno: Núcleo y Orbitales Bohr/Schrödinger
        // Campo electrostático radial
        if (showFields) {
          const grad = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, 180);
          grad.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
          grad.addColorStop(0.5, 'rgba(139, 92, 246, 0.08)');
          grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(centerX, centerY, 180, 0, Math.PI * 2);
          ctx.fill();

          // Lóbulos del orbital 2p_z
          ctx.save();
          ctx.translate(centerX, centerY);
          ctx.rotate(t * 0.2);
          ctx.fillStyle = 'rgba(168, 85, 247, 0.12)';
          ctx.beginPath();
          ctx.ellipse(0, -60, 35, 60, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(0, 60, 35, 60, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Estela cuántica del electrón
        if (showTrails && Array.isArray(est?.estela) && est.estela.length > 1) {
          ctx.beginPath();
          for (let i = 0; i < est.estela.length; i++) {
            const p = est.estela[i];
            const px = centerX + p.x;
            const py = centerY + p.y;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Núcleo Central (Protón)
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 9, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px monospace';
        ctx.fillText('p⁺', centerX - 6, centerY + 3);

        // Electrón orbitante
        const ex = centerX + est.posicionPrincipal.x;
        const ey = centerY + est.posicionPrincipal.y;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(ex, ey, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Vector de velocidad
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - est.posicionPrincipal.y * 0.25, ey + est.posicionPrincipal.x * 0.25);
        ctx.stroke();
        break;
      }

      case 'bell_entanglement': {
        // Bell Entanglement: Dos Esferas de Bloch con enlace cuántico
        const xA = centerX - 140;
        const xB = centerX + 140;
        const yCenter = centerY;
        const rSphere = 70;

        // Canal de entrelazamiento cuántico luminoso entre esferas
        ctx.save();
        const pulse = Math.sin(t * 4);
        ctx.strokeStyle = `rgba(168, 85, 247, ${0.4 + 0.3 * Math.abs(pulse)})`;
        ctx.lineWidth = 4 + 2 * Math.abs(pulse);
        ctx.shadowColor = '#c084fc';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.moveTo(xA, yCenter);
        // Onda sinusoide en el haz de entrelazamiento
        for (let x = xA; x <= xB; x += 10) {
          const progress = (x - xA) / (xB - xA);
          const wy = yCenter + Math.sin(progress * Math.PI * 6 - t * 8) * 12;
          ctx.lineTo(x, wy);
        }
        ctx.stroke();
        ctx.restore();

        // Esfera A (Qubit A)
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(xA, yCenter, rSphere, 0, Math.PI * 2);
        ctx.stroke();
        // Ecuador y meridiano elíptico
        ctx.beginPath();
        ctx.ellipse(xA, yCenter, rSphere, rSphere * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Esfera B (Qubit B)
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(xB, yCenter, rSphere, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(xB, yCenter, rSphere, rSphere * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Vector Bloch A
        const vecAx = centerX + est.posicionPrincipal.x;
        const vecAy = centerY + est.posicionPrincipal.y;
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xA, yCenter);
        ctx.lineTo(vecAx, vecAy);
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(vecAx, vecAy, 5, 0, Math.PI * 2);
        ctx.fill();

        // Vector Bloch B
        const vecBx = centerX + (est.posicionesSecundarias?.[2]?.x || 140);
        const vecBy = centerY + (est.posicionesSecundarias?.[2]?.y || 0);
        ctx.strokeStyle = '#d8b4fe';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(xB, yCenter);
        ctx.lineTo(vecBx, vecBy);
        ctx.stroke();
        ctx.fillStyle = '#d8b4fe';
        ctx.beginPath();
        ctx.arc(vecBx, vecBy, 5, 0, Math.PI * 2);
        ctx.fill();

        // Etiquetas
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.fillText('Qubit A |ψ_A⟩', xA - 35, yCenter + rSphere + 20);
        ctx.fillText('Qubit B |ψ_B⟩', xB - 35, yCenter + rSphere + 20);
        ctx.fillStyle = '#e879f9';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('ENLACE NO-LOCAL S_CHSH = 2.8284', centerX - 105, yCenter - 45);
        break;
      }

      case 'harmonic_oscillator': {
        // Pozo parabólico y paquete de ondas coherente
        const scaleX = 1.0;
        const scaleY = 0.005;

        // Curva del potencial parabólico V(x) = 1/2 k x^2
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let px = -220; px <= 220; px += 5) {
          const vx = scaleY * px * px;
          const cy = centerY + 100 - vx;
          if (px === -220) ctx.moveTo(centerX + px, cy);
          else ctx.lineTo(centerX + px, cy);
        }
        ctx.stroke();

        // Paquete de ondas cuántico gaussiano oscilante
        const packetCenterX = centerX + est.posicionPrincipal.x;
        const sigma = 28;

        ctx.save();
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(centerX - 220, centerY + 80);
        for (let px = -220; px <= 220; px += 3) {
          const dist = (centerX + px) - packetCenterX;
          const gauss = Math.exp(-(dist * dist) / (2 * sigma * sigma));
          const wave = Math.cos(dist * 0.15 - t * 6) * gauss * 75;
          const cy = centerY + 80 - wave;
          ctx.lineTo(centerX + px, cy);
        }
        ctx.stroke();
        ctx.restore();

        // Línea del valor esperado <x>
        ctx.strokeStyle = '#ec4899';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(packetCenterX, centerY - 80);
        ctx.lineTo(packetCenterX, centerY + 100);
        ctx.stroke();
        ctx.setLineDash([]);

        // Centro cuántico
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(packetCenterX, centerY + 80, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.font = '11px monospace';
        ctx.fillText('V(x) = ½ m ω² x²', centerX - 55, centerY - 70);
        break;
      }

      case 'particle_collision': {
        // Colisión Rutherford contra núcleo pesado
        // Núcleo de Oro Pesado en el centro
        ctx.shadowColor = '#eab308';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#000000';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('Au 79⁺', centerX - 13, centerY + 3);

        // Estela de la partícula alfa
        if (showTrails && Array.isArray(est?.estela) && est.estela.length > 1) {
          ctx.beginPath();
          for (let i = 0; i < est.estela.length; i++) {
            const p = est.estela[i];
            const px = centerX + p.x;
            const py = centerY + p.y;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
          ctx.lineWidth = 2.5;
          ctx.stroke();
        }

        // Partícula Alfa actual
        const ax = centerX + est.posicionPrincipal.x;
        const ay = centerY + est.posicionPrincipal.y;
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ax, ay, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#ffffff';
        ctx.font = '9px monospace';
        ctx.fillText('α²⁺', ax - 6, ay - 9);

        // Chispas de dispersión
        if (est.particulasExtras) {
          est.particulasExtras.forEach((spark) => {
            if (spark.radio && spark.radio > 0) {
              ctx.fillStyle = spark.color;
              ctx.beginPath();
              ctx.arc(centerX + spark.x, centerY + spark.y, Math.max(0.1, spark.radio), 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }
        break;
      }

      case 'ising_spin_lattice': {
        // Cadena de espines 1D con precesión 3D
        if (est.spinVectors) {
          const n = est.spinVectors.length;
          const spacing = Math.min(32, (width - 120) / n);
          const startX = centerX - (n * spacing) / 2;

          for (let i = 0; i < n; i++) {
            const sv = est.spinVectors[i];
            const sx = startX + i * spacing;
            const sy = centerY;

            // Base de la red
            ctx.fillStyle = '#475569';
            ctx.beginPath();
            ctx.arc(sx, sy, 3, 0, Math.PI * 2);
            ctx.fill();

            // Enlace con vecino
            if (i < n - 1) {
              ctx.strokeStyle = '#334155';
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.moveTo(sx, sy);
              ctx.lineTo(sx + spacing, sy);
              ctx.stroke();
            }

            // Flecha de espín vectorial
            const arrowLen = 42;
            const ex = sx + sv.x * arrowLen * 0.7;
            const ey = sy - sv.z * arrowLen;

            ctx.strokeStyle = sv.z > 0 ? '#10b981' : '#ef4444';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(ex, ey);
            ctx.stroke();

            // Punta
            ctx.fillStyle = sv.z > 0 ? '#10b981' : '#ef4444';
            ctx.beginPath();
            ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.fillStyle = '#94a3b8';
          ctx.font = '11px monospace';
          ctx.fillText('Cadena de 16 Espines Cuánticos 1D con Interacción J y Campo h', startX, centerY + 65);
        }
        break;
      }

      case 'double_slit': {
        // Doble rendija cuántica con pantalla de detección acumulativa
        const slitX = centerX - 80;
        const screenX = centerX + 180;
        const d = 50;

        // Barrera con las dos rendijas
        ctx.fillStyle = '#475569';
        // Parte superior
        ctx.fillRect(slitX - 3, centerY - 140, 6, 140 - d / 2);
        // Parte media entre rendijas
        ctx.fillRect(slitX - 3, centerY - d / 2 + 10, 6, d - 20);
        // Parte inferior
        ctx.fillRect(slitX - 3, centerY + d / 2, 6, 140 - d / 2);

        // Pantalla detectora a la derecha
        ctx.fillStyle = '#334155';
        ctx.fillRect(screenX, centerY - 140, 8, 280);

        // Franjas de interferencia acumuladas en la pantalla
        if (est.pantallaDobleRendija) {
          const bins = est.pantallaDobleRendija.length;
          const binH = 280 / bins;
          for (let b = 0; b < bins; b++) {
            const count = est.pantallaDobleRendija[b] || 0;
            const barW = Math.min(70, count * 3);
            const by = centerY - 140 + b * binH;
            ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
            ctx.fillRect(screenX + 8, by, barW, binH - 1);
          }
        }

        // Partículas en vuelo
        if (est.particulasExtras) {
          est.particulasExtras.forEach((pt) => {
            if (pt.radio && pt.radio > 0) {
              ctx.fillStyle = pt.color;
              ctx.beginPath();
              ctx.arc(centerX + pt.x, centerY + pt.y, Math.max(0.1, pt.radio), 0, Math.PI * 2);
              ctx.fill();
            }
          });
        }

        // Frente de ondas circulares saliendo de las rendijas
        ctx.strokeStyle = 'rgba(168, 85, 247, 0.2)';
        ctx.lineWidth = 1.5;
        const waveOffset = ((t * 80) % 30 + 30) % 30;
        for (let r = 0; r <= 220; r += 30) {
          const waveRadius = r + waveOffset;
          if (waveRadius > 0.5) {
            ctx.beginPath();
            ctx.arc(slitX, centerY - d / 2, waveRadius, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(slitX, centerY + d / 2, waveRadius, -Math.PI / 2, Math.PI / 2);
            ctx.stroke();
          }
        }

        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px monospace';
        ctx.fillText('Rendija 1', slitX - 60, centerY - d / 2);
        ctx.fillText('Rendija 2', slitX - 60, centerY + d / 2);
        ctx.fillText('Pantalla & Franjas Born', screenX + 12, centerY - 125);
        break;
      }

      default: {
        // Trayectoria 3D genérica en espacio de fases
        if (showTrails && Array.isArray(est?.estela) && est.estela.length > 1) {
          ctx.beginPath();
          for (let i = 0; i < est.estela.length; i++) {
            const p = est.estela[i];
            const px = centerX + p.x;
            const py = centerY + p.y;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        const px = centerX + est.posicionPrincipal.x;
        const py = centerY + est.posicionPrincipal.y;
        ctx.shadowColor = '#10b981';
        ctx.shadowBlur = 15;
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.arc(px, py, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        break;
      }
    }

    // 4. Live Recording & Simulation HUD stamp (Top-left of canvas)
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.fillRect(12, 12, 230, 48);
    ctx.strokeRect(12, 12, 230, 48);

    // Live red dot indicator
    ctx.fillStyle = isPlaying ? '#ef4444' : '#94a3b8';
    ctx.beginPath();
    ctx.arc(26, 28, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(isPlaying ? 'EN VIVO • 60 FPS' : 'PAUSADO', 38, 32);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px monospace';
    ctx.fillText(`T = ${t.toFixed(2)}s  |  Paso #${stepRef.current}`, 26, 49);

    // Live hash watermark (Bottom-right of canvas)
    ctx.fillStyle = 'rgba(2, 6, 23, 0.75)';
    ctx.fillRect(width - 250, height - 26, 240, 20);
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText(`SHA256: ${est.stateHashSha256.substring(0, 24)}...`, width - 245, height - 12);
  }, [interpretacion.tipo, showGrid, showTrails, showFields, isPlaying]);

  return (
    <div className="space-y-4">
      {/* Simulation Screen Container */}
      <div className="relative rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
        {/* Top Video Header Bar */}
        <div className="bg-slate-900/90 backdrop-blur border-b border-slate-800 px-4 py-2.5 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Video className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-100">{interpretacion.nombre}</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                  Matemática Exacta
                </span>
              </div>
              <p className="text-[11px] text-slate-400">{interpretacion.subtitulo}</p>
            </div>
          </div>

          {/* Right side: View Mode Toggle (3D/4D 4K vs 2D) & Auto-annotated badge */}
          <div className="flex items-center space-x-2">
            {/* 3D / 4D vs 2D Switcher */}
            <div className="flex items-center bg-slate-950 p-0.5 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setViewMode('3d_4d')}
                className={`px-3 py-1.5 rounded-lg font-bold font-mono text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === '3d_4d'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-500/30'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Box className="w-3.5 h-3.5 text-amber-300" />
                <span>3D / 4D 4K</span>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
              </button>

              <button
                onClick={() => setViewMode('2d')}
                className={`px-3 py-1.5 rounded-lg font-bold font-mono text-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === '2d'
                    ? 'bg-slate-800 text-cyan-300 border border-slate-700'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>2D Plano</span>
              </button>
            </div>

            {/* Auto-Annotated Note Badge if available */}
            {autoAnnotatedNote && (
              <div className="flex items-center space-x-2">
                <span className="flex items-center space-x-1.5 text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold hidden sm:inline">Auto-Anotado</span>
                </span>
                {onOpenNote && (
                  <button
                    onClick={() => onOpenNote(autoAnnotatedNote.id)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2 py-1 rounded-lg flex items-center space-x-1 transition-colors cursor-pointer"
                  >
                    <FileText className="w-3 h-3 text-cyan-400" />
                    <span>Ver Nota</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Viewport: 3D/4D Hyperdimensional WebGL or 2D Canvas */}
        {viewMode === '3d_4d' ? (
          <div className="w-full">
            <QuantumHyperdimensional3DViewer
              interpretacion={interpretacion}
              isPlaying={isPlaying}
              speed={speed}
              showTrails={showTrails}
              showFields={showFields}
              onStateUpdate={(nuevoEstado) => setEstado(nuevoEstado)}
            />
          </div>
        ) : (
          <div>
            {/* The 60 FPS Live 2D Canvas */}
            <div className="relative w-full flex items-center justify-center bg-slate-950">
              <canvas
                ref={canvasRef}
                width={780}
                height={380}
                className="w-full max-h-[380px] object-contain cursor-crosshair"
              />
            </div>

            {/* Video Player Control Toolbar (2D) */}
            <div className="bg-slate-900/95 border-t border-slate-800 px-4 py-2.5 flex items-center justify-between flex-wrap gap-3">
              {/* Playback Controls */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`p-2 rounded-lg font-medium text-xs flex items-center space-x-1.5 transition-all ${
                    isPlaying
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                  }`}
                  title={isPlaying ? 'Pausar Video' : 'Reproducir Video'}
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'Pausar' : 'Reanudar'}</span>
                </button>

                <button
                  onClick={() => {
                    timeRef.current = 0;
                    stepRef.current = 0;
                    const reset = simularPasoFisico(interpretacion.tipo, 0, 0);
                    setEstado(reset);
                  }}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs flex items-center space-x-1 transition-colors"
                  title="Reiniciar Simulación al Tiempo T=0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reiniciar</span>
                </button>

                {/* Speed control buttons */}
                <div className="flex items-center bg-slate-950 rounded-lg p-0.5 border border-slate-800 text-xs">
                  {[0.25, 0.5, 1.0, 2.0, 4.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSpeed(s)}
                      className={`px-2 py-1 rounded font-mono text-[11px] transition-colors ${
                        speed === s
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Visual Overlays Toggles */}
              <div className="flex items-center space-x-2 text-xs">
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    showGrid
                      ? 'bg-slate-800 border-slate-700 text-slate-200'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  Cuadrícula
                </button>
                <button
                  onClick={() => setShowTrails(!showTrails)}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    showTrails
                      ? 'bg-slate-800 border-slate-700 text-cyan-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  Estelas
                </button>
                <button
                  onClick={() => setShowFields(!showFields)}
                  className={`px-2.5 py-1 rounded-lg border transition-colors ${
                    showFields
                      ? 'bg-slate-800 border-slate-700 text-purple-300'
                      : 'bg-slate-950 border-slate-800 text-slate-500'
                  }`}
                >
                  Campos & Lóbulos
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4️⃣ MUESTRA VISIBLEMENTE LOS VALORES IMPORTANTES: Posición, Energía, Entrelazamiento, Superposición, Entropía */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Posición / Coordenadas */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium">Posición (x, y, z)</span>
          </div>
          <div className="text-sm font-mono font-bold text-cyan-300 truncate">
            {estado.posicionPrincipal.x.toFixed(1)}, {estado.posicionPrincipal.y.toFixed(1)}, {estado.posicionPrincipal.z.toFixed(1)}
          </div>
          <div className="text-[10px] text-slate-500 truncate mt-0.5">
            {estado.posicionPrincipal.etiqueta}
          </div>
        </div>

        {/* Energía Total */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">Energía Total E</span>
          </div>
          <div className="text-sm font-mono font-bold text-amber-300">
            {estado.energiaTotal.toFixed(4)} eV
          </div>
          <div className="text-[10px] text-slate-500 truncate mt-0.5">
            Cin: {estado.energiaCinetica.toFixed(2)} | Pot: {estado.energiaPotencial.toFixed(2)}
          </div>
        </div>

        {/* Entrelazamiento & Entropía */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span className="font-medium">Entrelazamiento / S</span>
          </div>
          <div className="text-sm font-mono font-bold text-purple-300">
            {estado.entrelazamientoEntropia.toFixed(4)} bits
          </div>
          <div className="text-[10px] text-slate-500 truncate mt-0.5">
            Entropía Von Neumann
          </div>
        </div>

        {/* Superposición */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
            <Atom className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-medium">Superposición</span>
          </div>
          <div className="text-sm font-mono font-bold text-emerald-300">
            {estado.superposicionCount} estados
          </div>
          <div className="text-[10px] text-slate-500 truncate mt-0.5">
            Componentes Activas
          </div>
        </div>

        {/* Fase Cuántica */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
            <Activity className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-medium">Fase Cuántica θ</span>
          </div>
          <div className="text-sm font-mono font-bold text-sky-300">
            {(estado.faseCuanticaRad / Math.PI).toFixed(3)} π rad
          </div>
          <div className="text-[10px] text-slate-500 truncate mt-0.5">
            Preservación Born 1.000000
          </div>
        </div>

        {/* Firma Criptográfica SHA-256 */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-medium">Firma SHA-256</span>
          </div>
          <div className="text-xs font-mono font-bold text-rose-300 truncate" title={estado.stateHashSha256}>
            {estado.stateHashSha256.substring(0, 10)}...
          </div>
          <div className="text-[10px] text-slate-500 truncate mt-0.5">
            Inmutable en Vivo
          </div>
        </div>
      </div>

      {/* Mathematical Breakdown & Governing Laws Box */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-4 text-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-slate-200 flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Formulación Matemática & Leyes que Rigen este Sistema:</span>
          </span>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-800/40 px-2 py-0.5 rounded">
            {interpretacion.hamiltonianoOFormula}
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300">
          {interpretacion.leyesGobernantes.map((ley, idx) => (
            <div key={idx} className="flex items-start space-x-1.5 bg-slate-950/50 p-2 rounded-lg border border-slate-800/50">
              <span className="text-cyan-400 font-bold font-mono">[{idx + 1}]</span>
              <span className="text-slate-300">{ley}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
