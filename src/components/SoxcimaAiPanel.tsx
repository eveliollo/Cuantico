import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Sparkles,
  BookOpen,
  Terminal,
  Send,
  Cpu,
  Database,
  Copy,
  Check,
  Download,
  Search,
  Plus,
  Trash2,
  Star,
  FileText,
  Calculator,
  Activity,
  ShieldCheck,
  RefreshCw,
  Atom,
  Clock,
  User,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  Bookmark,
  Video,
  Play,
  Pause,
  Layers,
  Zap,
  Sliders
} from 'lucide-react';
import {
  ScientificProjectNote,
  ScientificQuantumTelemetry,
  SoxcimaChatMessage,
  KnowledgeMemoryRecord,
  ProjectCategory,
} from '../types/scientificNotes';
import {
  SOXCIMA_NOMBRE,
  SOXCIMA_FIRMA,
  SOXCIMA_SALUDO,
  SOXCIMA_RUTA_EXCLUSIVA,
  SOXCIMA_BASE_DATOS,
  loadScientificNotes,
  saveScientificNotes,
  loadKnowledgeMemory,
  saveKnowledgeMemory,
  procesarConsultaSoxcima,
  generarRevisionCientificaNota,
  SCRIPT_PYTHON_TERMUX,
} from '../core/soxcimaAiEngine';
import {
  interpretarSistemaFisico,
  simularPasoFisico,
  autoAnotarEnBaseDeNotas,
  InterpetacionFisica,
  PhysicalSystemKind,
} from '../core/physicsSimulationEngine';
import { LivePhysicsVideoRenderer } from './LivePhysicsVideoRenderer';
import { SocximaEngine } from '../core/socximaEngine';

interface SoxcimaAiPanelProps {
  engine: SocximaEngine;
  onNavigateToEngine?: () => void;
  onNavigateToComposer?: () => void;
  signerPublicKey?: string;
}

export const SoxcimaAiPanel: React.FC<SoxcimaAiPanelProps> = ({
  engine,
  onNavigateToEngine,
  signerPublicKey,
}) => {
  // Panel Active Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<'ia_chat' | 'physics_video' | 'lab_notes' | 'sqlite_memory' | 'termux_script'>('ia_chat');

  // Live Physics Simulation State
  const [activePhysicsInterpretation, setActivePhysicsInterpretation] = useState<InterpetacionFisica>(() =>
    interpretarSistemaFisico('atomo de hidrogeno')
  );
  const [customPhysicsInput, setCustomPhysicsInput] = useState<string>('');
  const [lastAutoAnnotatedNote, setLastAutoAnnotatedNote] = useState<ScientificProjectNote | null>(null);

  // Scientific Notes State
  const [notes, setNotes] = useState<ScientificProjectNote[]>(() => loadScientificNotes());
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);

  // Form State for Creating/Editing Note
  const [formTitle, setFormTitle] = useState<string>('');
  const [formAuthor, setFormAuthor] = useState<string>('Dr. Evelio Llovera & Equipo Cuántico');
  const [formCategory, setFormCategory] = useState<ProjectCategory>('Simulación 6000Q');
  const [formTags, setFormTags] = useState<string>('6000Q, Hilbert Space, Norma Born');
  const [formHypothesis, setFormHypothesis] = useState<string>('');
  const [formMethodology, setFormMethodology] = useState<string>('');
  const [formObservations, setFormObservations] = useState<string>('');
  const [formConclusions, setFormConclusions] = useState<string>('');
  const [formTelemetry, setFormTelemetry] = useState<ScientificQuantumTelemetry | undefined>(undefined);

  // Chat State
  const [messages, setMessages] = useState<SoxcimaChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'ia',
      text: `${SOXCIMA_SALUDO}\n\nSoy tu asistente de inteligencia cuántica y científica. Puedo entregarte los resultados en vivo del motor de ${engine.registro.n_qubits.toLocaleString()} cúbits, calcular operaciones, resolver dudas de física cuántica y registrar tus experimentos en la Base de Notas de Proyectos.\n\n${SOXCIMA_FIRMA}`,
      timestamp: Date.now(),
    },
  ]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // SQLite Knowledge Records State
  const [memoryRecords, setMemoryRecords] = useState<KnowledgeMemoryRecord[]>(() => loadKnowledgeMemory());
  const [memorySearch, setMemorySearch] = useState<string>('');

  // Copy Feedback
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedNote, setCopiedNote] = useState<string | null>(null);

  // Current Live Telemetry Snapshot
  const currentTelemetry = useMemo<ScientificQuantumTelemetry>(() => {
    return {
      qubitCount: engine.registro.n_qubits,
      hilbertDimension: engine.registro.dimensionScientific(),
      cycle: engine.ciclo,
      entropy: typeof engine.calcular_entropia_von_neumann === 'function' 
        ? engine.calcular_entropia_von_neumann() 
        : (typeof engine.entropia_normalizada === 'function' ? engine.entropia_normalizada() : 0),
      stateHashSha256: engine.registro.hash(),
      activeSuperpositionsCount: typeof engine.registro.obtener_superposiciones_activas === 'function'
        ? engine.registro.obtener_superposiciones_activas().length
        : (typeof engine.registro.estados_activos === 'function'
          ? engine.registro.estados_activos().length
          : (engine.registro.stateMap ? engine.registro.stateMap.size : 1)),
      timestamp: Date.now(),
      signerPublicKey,
    };
  }, [engine, engine.ciclo, engine.registro.n_qubits, signerPublicKey]);

  // Scroll to bottom of chat on new message
  useEffect(() => {
    if (activeSubTab === 'ia_chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSubTab]);

  // Handle Query Submission to SOXCIMA AI
  const handleSendQuery = (customText?: string) => {
    const textToSend = customText !== undefined ? customText : inputQuery;
    if (!textToSend.trim() || isProcessing) return;

    const userMsg: SoxcimaChatMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: Date.now(),
      telemetrySnapshot: currentTelemetry,
    };

    setMessages(prev => [...prev, userMsg]);
    if (customText === undefined) {
      setInputQuery('');
    }
    setIsProcessing(true);

    setTimeout(() => {
      const { respuesta, recordCreated, simulationPayload } = procesarConsultaSoxcima(textToSend, currentTelemetry, notes);

      const iaMsg: SoxcimaChatMessage = {
        id: `msg_ia_${Date.now()}`,
        sender: 'ia',
        text: respuesta,
        timestamp: Date.now(),
        telemetrySnapshot: currentTelemetry,
        simulationPayload,
      };

      setMessages(prev => [...prev, iaMsg]);
      setMemoryRecords(prev => {
        const next = [recordCreated, ...prev];
        saveKnowledgeMemory(next);
        return next;
      });
      if (simulationPayload) {
        const updatedNotes = loadScientificNotes();
        setNotes(updatedNotes);
        if (simulationPayload.interpretacion) {
          setActivePhysicsInterpretation(simulationPayload.interpretacion);
        }
        const created = updatedNotes.find(n => n.id === simulationPayload.noteId) || null;
        setLastAutoAnnotatedNote(created);
      }
      setIsProcessing(false);
    }, 280);
  };

  // Open a specific note by ID in the lab notes tab
  const handleOpenNoteById = (noteId: string) => {
    setActiveSubTab('lab_notes');
    setActiveNoteId(noteId);
  };

  // Directly execute simulation, video rendering and auto-annotation for a given input
  const handleExecutePhysicsSimulation = (inputPrompt: string) => {
    const interp = interpretarSistemaFisico(inputPrompt);
    setActivePhysicsInterpretation(interp);
    const est = simularPasoFisico(interp.tipo, 0, 0);
    const { notaCreada } = autoAnotarEnBaseDeNotas(interp, est, inputPrompt);
    setLastAutoAnnotatedNote(notaCreada);
    setNotes(loadScientificNotes());
  };

  // Open Create Note Form
  const handleOpenCreateNote = () => {
    setFormTitle('');
    setFormAuthor('Dr. Evelio Llovera & Equipo Cuántico');
    setFormCategory('Simulación 6000Q');
    setFormTags('6000Q, Hilbert Space, Coherencia');
    setFormHypothesis('');
    setFormMethodology('');
    setFormObservations('');
    setFormConclusions('');
    setFormTelemetry(currentTelemetry); // Attach current telemetry automatically!
    setActiveNoteId(null);
    setIsEditingNote(true);
  };

  // Open Edit Note Form
  const handleOpenEditNote = (note: ScientificProjectNote) => {
    setFormTitle(note.title);
    setFormAuthor(note.author);
    setFormCategory(note.category);
    setFormTags(note.tags.join(', '));
    setFormHypothesis(note.hypothesis);
    setFormMethodology(note.methodology);
    setFormObservations(note.observations);
    setFormConclusions(note.conclusions);
    setFormTelemetry(note.telemetry || currentTelemetry);
    setActiveNoteId(note.id);
    setIsEditingNote(true);
  };

  // Save Note (Create or Update)
  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    const tagList = formTags
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    let updatedNotes: ScientificProjectNote[];

    if (activeNoteId) {
      // Update existing
      updatedNotes = notes.map(n => {
        if (n.id === activeNoteId) {
          return {
            ...n,
            title: formTitle.trim(),
            author: formAuthor.trim(),
            category: formCategory,
            tags: tagList,
            hypothesis: formHypothesis.trim(),
            methodology: formMethodology.trim(),
            observations: formObservations.trim(),
            conclusions: formConclusions.trim(),
            telemetry: formTelemetry,
            updatedAt: Date.now(),
          };
        }
        return n;
      });
    } else {
      // Create new
      const newNote: ScientificProjectNote = {
        id: `proj-${Date.now().toString(36)}`,
        title: formTitle.trim(),
        author: formAuthor.trim() || 'Investigador Cuántico',
        category: formCategory,
        tags: tagList,
        hypothesis: formHypothesis.trim(),
        methodology: formMethodology.trim(),
        observations: formObservations.trim(),
        conclusions: formConclusions.trim(),
        telemetry: formTelemetry,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        starred: false,
      };
      updatedNotes = [newNote, ...notes];
      setActiveNoteId(newNote.id);
    }

    setNotes(updatedNotes);
    saveScientificNotes(updatedNotes);
    setIsEditingNote(false);
  };

  // Delete Note
  const handleDeleteNote = (id: string) => {
    if (window.confirm('¿Seguro que deseas eliminar esta nota de proyecto científico?')) {
      const filtered = notes.filter(n => n.id !== id);
      setNotes(filtered);
      saveScientificNotes(filtered);
      if (activeNoteId === id) {
        setActiveNoteId(null);
      }
    }
  };

  // Toggle Starred Note
  const handleToggleStarred = (id: string) => {
    const updated = notes.map(n => (n.id === id ? { ...n, starred: !n.starred } : n));
    setNotes(updated);
    saveScientificNotes(updated);
  };

  // Request AI Review for a Note
  const handleRequestAiReview = (note: ScientificProjectNote) => {
    setActiveSubTab('ia_chat');
    const reviewPrompt = `Por favor analiza científicamente mi proyecto de investigación titulado "${note.title}".
Hipótesis: "${note.hypothesis}"
Metodología: "${note.methodology}"
Observaciones: "${note.observations}"
Conclusiones: "${note.conclusions}"`;

    const userMsg: SoxcimaChatMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text: reviewPrompt,
      timestamp: Date.now(),
      telemetrySnapshot: note.telemetry || currentTelemetry,
      attachedNoteTitle: note.title,
    };

    setMessages(prev => [...prev, userMsg]);
    setIsProcessing(true);

    setTimeout(() => {
      const revision = generarRevisionCientificaNota(note, currentTelemetry);
      const iaMsg: SoxcimaChatMessage = {
        id: `msg_ia_${Date.now()}`,
        sender: 'ia',
        text: revision,
        timestamp: Date.now(),
        telemetrySnapshot: note.telemetry || currentTelemetry,
      };

      setMessages(prev => [...prev, iaMsg]);
      const recordCreated: KnowledgeMemoryRecord = {
        id: Date.now(),
        pregunta: `Evaluación de proyecto: ${note.title}`,
        respuesta: revision,
        fecha: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      setMemoryRecords(prev => {
        const next = [recordCreated, ...prev];
        saveKnowledgeMemory(next);
        return next;
      });
      setIsProcessing(false);
    }, 400);
  };

  // Export Notes to JSON
  const handleExportNotesJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(notes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `soxcima_proyectos_cientificos_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export Specific Note to Markdown
  const handleExportNoteMarkdown = (note: ScientificProjectNote) => {
    const md = `# ${note.title}
**Investigador Principal:** ${note.author}  
**Categoría:** ${note.category}  
**Etiquetas:** ${note.tags.join(', ')}  
**Fecha de Creación:** ${new Date(note.createdAt).toLocaleString()}  
**Última Actualización:** ${new Date(note.updatedAt).toLocaleString()}  

---

## 1. Hipótesis Científica
${note.hypothesis || 'Sin hipótesis registrada.'}

## 2. Metodología Experimental
${note.methodology || 'Sin metodología registrada.'}

## 3. Observaciones y Datos de Telemetría
${note.observations || 'Sin observaciones registradas.'}

${note.telemetry ? `### Telemetría Cuántica Vinculada (Socxima Core)
- **Cúbits:** ${note.telemetry.qubitCount.toLocaleString()} Qubits
- **Espacio de Hilbert:** ${note.telemetry.hilbertDimension} estados
- **Ciclo de Latido:** #${note.telemetry.cycle}
- **Entropía Cuántica:** ${note.telemetry.entropy.toFixed(4)} bits
- **Hash SHA-256 del Vector de Estado:** \`${note.telemetry.stateHashSha256}\`
- **Superposiciones Activas:** ${note.telemetry.activeSuperpositionsCount}
` : ''}

## 4. Conclusiones y Proyecciones
${note.conclusions || 'Sin conclusiones registradas.'}

---
*Generado por la Base de Notas Científicas de SOXCIMA Quantum Engine*  
${SOXCIMA_FIRMA}
`;

    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(md);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${note.title.replace(/[^a-zA-Z0-9_-]/g, '_')}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setCopiedNote(note.id);
    setTimeout(() => setCopiedNote(null), 2500);
  };

  // Copy Termux Python Script
  const handleCopyScript = () => {
    navigator.clipboard.writeText(SCRIPT_PYTHON_TERMUX);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  // Download Termux Python Script
  const handleDownloadScript = () => {
    const dataStr = 'data:text/x-python;charset=utf-8,' + encodeURIComponent(SCRIPT_PYTHON_TERMUX);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'soxcima_completa.py');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Filtered Notes
  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchCat = selectedCategory === 'all' || n.category === selectedCategory;
      const query = searchQuery.toLowerCase();
      const matchSearch =
        !query ||
        n.title.toLowerCase().includes(query) ||
        n.hypothesis.toLowerCase().includes(query) ||
        n.author.toLowerCase().includes(query) ||
        n.tags.some(t => t.toLowerCase().includes(query));
      return matchCat && matchSearch;
    });
  }, [notes, selectedCategory, searchQuery]);

  // Filtered SQLite Knowledge Records
  const filteredMemory = useMemo(() => {
    if (!memorySearch) return memoryRecords;
    const q = memorySearch.toLowerCase();
    return memoryRecords.filter(r => r.pregunta.toLowerCase().includes(q) || r.respuesta.toLowerCase().includes(q));
  }, [memoryRecords, memorySearch]);

  const activeNote = useMemo(() => {
    return notes.find(n => n.id === activeNoteId) || null;
  }, [notes, activeNoteId]);

  return (
    <div className="space-y-6">
      {/* Top Banner: SOXCIMA AI & Lab Notes Overview */}
      <div className="bg-gradient-to-r from-teal-900/40 via-cyan-900/30 to-purple-900/40 border border-teal-500/40 rounded-2xl p-5 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-teal-500 via-cyan-400 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/30 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-teal-300">
                <Sparkles className="w-6 h-6 text-teal-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
                  SOXCIMA IA • Resultados Cuánticos & Base de Notas Científicas
                </h2>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 uppercase">
                  Memoria Robusta SQLite
                </span>
                <span className="px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                  {engine.registro.n_qubits.toLocaleString()} Qubits Core
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                Asistente inteligente con razonamiento cuántico en tiempo real y cuaderno de bitácora para investigadores. Los científicos pueden registrar proyectos, formular hipótesis, asociar automáticamente la telemetría cuántica y consultar el motor SOXCIMA.
              </p>
            </div>
          </div>

          {/* Quick Engine Telemetry Capsule */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-xs font-mono shrink-0 space-y-1">
            <div className="flex items-center justify-between gap-3 text-slate-400">
              <span>Cúbits en Simulación:</span>
              <span className="text-cyan-300 font-bold">{engine.registro.n_qubits.toLocaleString()} Q</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-400">
              <span>Espacio Hilbert:</span>
              <span className="text-purple-300 font-bold">{engine.registro.dimensionScientific()}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-400">
              <span>Ciclo de Latido:</span>
              <span className="text-emerald-300 font-bold">#{engine.ciclo}</span>
            </div>
            <div className="flex items-center justify-between gap-3 text-slate-400">
              <span>Entropía Cuántica:</span>
              <span className="text-amber-300 font-bold">{currentTelemetry.entropy.toFixed(4)} bits</span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 mt-5 pt-3 border-t border-teal-500/20 text-xs font-mono">
          <button
            onClick={() => setActiveSubTab('ia_chat')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubTab === 'ia_chat'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>SOXCIMA IA (Resultados & Chat)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('physics_video')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubTab === 'physics_video'
                ? 'bg-rose-500 text-slate-950 shadow-md shadow-rose-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span>Simulador Físico En Vivo (60 FPS)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('lab_notes')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubTab === 'lab_notes'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Base de Notas & Proyectos ({notes.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('sqlite_memory')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubTab === 'sqlite_memory'
                ? 'bg-purple-500 text-slate-950 shadow-md shadow-purple-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Memoria Robusta SQLite ({memoryRecords.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('termux_script')}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeSubTab === 'termux_script'
                ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/30'
                : 'text-slate-300 hover:text-white hover:bg-slate-900/60'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Código Python / Termux (soxcima_completa.py)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: SOXCIMA IA CHAT & RESULTS                                       */}
      {/* ========================================================================= */}
      {activeSubTab === 'ia_chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Interface (3 cols) */}
          <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col h-[650px] shadow-xl overflow-hidden">
            {/* Chat Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/70 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Terminal de Consulta Cuántica SOXCIMA
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Conectada con el simulador armónico de {engine.registro.n_qubits.toLocaleString()} cúbits • Formato {SOXCIMA_FIRMA}
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleSendQuery('¿Cuáles son los resultados actuales de la simulación cuántica?')}
                className="px-3 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-colors"
                title="Obtener resumen en vivo de los 6,000 cúbits"
              >
                <Activity className="w-3.5 h-3.5 text-teal-400" />
                <span>Resultados en Vivo</span>
              </button>
            </div>

            {/* Chat Messages List */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-950/40">
              {messages.map(msg => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div className="flex items-center space-x-1.5 mb-1 text-[11px] font-mono text-slate-400">
                      <span>{isUser ? 'Tú (Científico)' : 'SOXCIMA 🤖'}</span>
                      <span>•</span>
                      <span>{new Date(msg.timestamp).toLocaleTimeString()}</span>
                      {msg.attachedNoteTitle && (
                        <span className="px-1.5 py-0.2 bg-indigo-900/50 text-indigo-300 rounded border border-indigo-700/50 text-[10px]">
                          Nota: {msg.attachedNoteTitle}
                        </span>
                      )}
                    </div>

                    <div
                      className={`max-w-2xl p-4 rounded-2xl text-xs sm:text-sm leading-relaxed whitespace-pre-wrap font-sans ${
                        isUser
                          ? 'bg-teal-600/20 text-teal-100 border border-teal-500/40 rounded-tr-none shadow-md'
                          : 'bg-slate-900 text-slate-200 border border-slate-700/70 rounded-tl-none shadow-lg'
                      }`}
                    >
                      {msg.text}

                      {/* Snapshot pill if attached */}
                      {msg.telemetrySnapshot && !isUser && (
                        <div className="mt-3 pt-2.5 border-t border-slate-700/50 flex flex-wrap items-center gap-2 text-[10px] font-mono text-slate-400">
                          <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 text-cyan-300">
                            {msg.telemetrySnapshot.qubitCount.toLocaleString()} Qubits
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 text-purple-300">
                            2^{msg.telemetrySnapshot.qubitCount}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 text-emerald-300">
                            Ciclo #{msg.telemetrySnapshot.cycle}
                          </span>
                          <span className="px-1.5 py-0.5 bg-slate-950 rounded border border-slate-800 text-amber-300">
                            H = {msg.telemetrySnapshot.entropy.toFixed(4)}
                          </span>
                        </div>
                      )}

                      {/* Video Player de Simulación Física Cuántica en Vivo a 60 FPS */}
                      {msg.simulationPayload && msg.simulationPayload.interpretacion && !isUser && (
                        <div className="mt-4 pt-3 border-t border-slate-700/60">
                          <LivePhysicsVideoRenderer
                            interpretacion={msg.simulationPayload.interpretacion}
                            autoAnnotatedNote={notes.find(n => n.id === msg.simulationPayload?.noteId) || null}
                            onOpenNote={handleOpenNoteById}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isProcessing && (
                <div className="flex flex-col items-start">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none text-xs text-teal-300 flex items-center space-x-2 font-mono">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-teal-400" />
                    <span>SOXCIMA interpretando sistema físico y calculando matemática exacta a 60 FPS...</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Quick Action Prompt Chips */}
            <div className="p-2.5 bg-slate-950/80 border-t border-slate-800/80 flex flex-wrap gap-1.5 overflow-x-auto text-xs font-mono">
              <span className="text-[11px] text-slate-500 py-1 pl-1">Sugerencias:</span>
              <button
                onClick={() => handleSendQuery('Simular átomo de hidrógeno con orbitales y niveles de Schrödinger')}
                className="px-2.5 py-1 rounded bg-rose-950/40 border border-rose-700/40 text-rose-300 hover:text-white hover:bg-rose-900/60 text-[11px] transition-colors flex items-center gap-1"
              >
                <Video className="w-3 h-3 text-rose-400" />
                <span>⚛️ Simular Átomo Hidrógeno</span>
              </button>
              <button
                onClick={() => handleSendQuery('Simular par Bell entrelazado EPR con esferas de Bloch')}
                className="px-2.5 py-1 rounded bg-rose-950/40 border border-rose-700/40 text-rose-300 hover:text-white hover:bg-rose-900/60 text-[11px] transition-colors flex items-center gap-1"
              >
                <Video className="w-3 h-3 text-rose-400" />
                <span>🌀 Simular Par Bell</span>
              </button>
              <button
                onClick={() => handleSendQuery('Simular experimento de la doble rendija cuántica y franjas de interferencia')}
                className="px-2.5 py-1 rounded bg-rose-950/40 border border-rose-700/40 text-rose-300 hover:text-white hover:bg-rose-900/60 text-[11px] transition-colors flex items-center gap-1"
              >
                <Video className="w-3 h-3 text-rose-400" />
                <span>〰️ Doble Rendija</span>
              </button>
              <button
                onClick={() => handleSendQuery('¿Cuáles son los resultados actuales de la simulación cuántica?')}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-teal-500/40 text-[11px] transition-colors"
              >
                📊 Resultados actuales
              </button>
              <button
                onClick={() => handleSendQuery('¿Qué proyectos científicos tenemos en la base de notas?')}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-teal-500/40 text-[11px] transition-colors"
              >
                📝 Ver base de notas
              </button>
              <button
                onClick={() => handleSendQuery('Explica el estado de entrelazamiento en el SistemaGemelos y la correlación Bell')}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-teal-500/40 text-[11px] transition-colors"
              >
                ⚛️ Entrelazamiento & Bell
              </button>
              <button
                onClick={() => handleSendQuery('¿Cuántos cúbits se necesitan para el algoritmo de Shor y cómo se compara con los 6,000 cúbits de Socxima?')}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-teal-500/40 text-[11px] transition-colors"
              >
                ⚡ Algoritmo de Shor
              </button>
              <button
                onClick={() => handleSendQuery('¿Qué proyectos científicos tenemos en la base de notas?')}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-teal-500/40 text-[11px] transition-colors"
              >
                📝 Ver base de notas
              </button>
              <button
                onClick={() => handleSendQuery('6000 * 1334')}
                className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-teal-500/40 text-[11px] transition-colors"
              >
                🔢 6000 * 1334
              </button>
            </div>

            {/* Input Form */}
            <form
              onSubmit={e => {
                e.preventDefault();
                handleSendQuery();
              }}
              className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={e => setInputQuery(e.target.value)}
                placeholder="Escribe tu consulta científica, pregunta sobre los resultados, cálculo o hipótesis..."
                className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isProcessing}
                className="px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 disabled:opacity-40 disabled:pointer-events-none text-slate-950 font-bold rounded-xl text-xs sm:text-sm flex items-center space-x-1.5 transition-all shadow-md active:scale-95"
              >
                <span>Enviar</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Quick Scientific Tools Sidebar (1 col) */}
          <div className="space-y-4">
            {/* Engine Live Status Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Atom className="w-4 h-4 text-teal-400" />
                  Núcleo Socxima Activo
                </h4>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Cúbits Activos</span>
                  <span className="text-sm font-bold text-teal-300">{engine.registro.n_qubits.toLocaleString()} Cúbits</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Dimensión Espacio de Hilbert</span>
                  <span className="text-xs font-bold text-purple-300 break-all">{engine.registro.dimensionScientific()} estados</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block">Huella SHA-256 del Vector</span>
                  <span className="text-[11px] text-amber-300 font-mono break-all">
                    {engine.registro.hash().substring(0, 24)}...
                  </span>
                </div>
              </div>

              {onNavigateToEngine && (
                <button
                  onClick={onNavigateToEngine}
                  className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1.5"
                >
                  <span>Ir al Panel Socxima Engine</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Note Action Card */}
            <div className="bg-gradient-to-br from-cyan-950/40 to-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 shadow-lg space-y-3">
              <h4 className="text-xs font-bold text-cyan-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                Cuaderno para Científicos
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Anota nuevos descubrimientos, registra hipótesis y vincula las métricas de {engine.registro.n_qubits.toLocaleString()} cúbits.
              </p>

              <button
                onClick={() => {
                  handleOpenCreateNote();
                  setActiveSubTab('lab_notes');
                }}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs rounded-xl shadow transition-all flex items-center justify-center space-x-1.5 active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>+ Nueva Nota de Proyecto</span>
              </button>

              <div className="pt-1 text-[11px] text-slate-400 font-mono flex items-center justify-between">
                <span>Notas Guardadas:</span>
                <span className="text-white font-bold">{notes.length} proyectos</span>
              </div>
            </div>

            {/* Scientific Arithmetic Card */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-2.5 text-xs">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider font-mono flex items-center gap-2">
                <Calculator className="w-4 h-4 text-amber-400" />
                Calculadora Científica
              </h4>
              <p className="text-slate-400 text-[11px]">
                Escribe en el chat operaciones directas como:
              </p>
              <div className="space-y-1 font-mono text-[11px]">
                <div
                  onClick={() => handleSendQuery('6000 * 2')}
                  className="p-1.5 rounded bg-slate-950 text-slate-300 cursor-pointer hover:text-amber-300 hover:bg-slate-800 transition-colors"
                >
                  • 6000 * 2 (Multiplicación de cúbits)
                </div>
                <div
                  onClick={() => handleSendQuery('1334 - 1333')}
                  className="p-1.5 rounded bg-slate-950 text-slate-300 cursor-pointer hover:text-amber-300 hover:bg-slate-800 transition-colors"
                >
                  • 1334 - 1333 (Diferencia vs IBM Heron)
                </div>
                <div
                  onClick={() => handleSendQuery('4096 + 1904')}
                  className="p-1.5 rounded bg-slate-950 text-slate-300 cursor-pointer hover:text-amber-300 hover:bg-slate-800 transition-colors"
                >
                  • 4096 + 1904 (Suma hacia 6000)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB: SIMULADOR FÍSICO EN VIVO (VIDEO 60 FPS)                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'physics_video' && (
        <div className="space-y-6">
          {/* Top Info & Quick Presets Header */}
          <div className="bg-gradient-to-r from-rose-950/40 via-slate-900/90 to-purple-950/40 border border-rose-500/30 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    <Video className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Simulación Física en Tiempo Real a 60 FPS
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        HD Canvas • Exact Math
                      </span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Ingresa cualquier código, circuito, sistema de partículas o átomo: SOXCIMA interpreta, simula con matemática exacta, dibuja el video continuo en vivo, proyecta valores y auto-anota con firma SHA-256 inmutable.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5-Step Pipeline Badges */}
              <div className="flex flex-wrap gap-1.5 font-mono text-[10px] text-slate-300 shrink-0">
                <span className="px-2 py-1 bg-slate-950 rounded border border-slate-800 text-teal-300">1️⃣ Interpreta</span>
                <span className="px-2 py-1 bg-slate-950 rounded border border-slate-800 text-cyan-300">2️⃣ Simula Exacto</span>
                <span className="px-2 py-1 bg-slate-950 rounded border border-slate-800 text-rose-300">3️⃣ Video 60 FPS</span>
                <span className="px-2 py-1 bg-slate-950 rounded border border-slate-800 text-amber-300">4️⃣ Telemetría</span>
                <span className="px-2 py-1 bg-slate-950 rounded border border-slate-800 text-purple-300">5️⃣ Anota SHA-256</span>
              </div>
            </div>

            {/* Quick Presets Selection Bar */}
            <div className="mt-4 pt-3 border-t border-slate-800/80">
              <span className="text-[11px] font-mono text-slate-400 block mb-2">
                Sistemas Físicos Preconfigurados (Click para Simular y Auto-Anotar al Instante):
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <button
                  onClick={() => handleExecutePhysicsSimulation('átomo de hidrógeno orbitales Schrödinger Coulomb')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-rose-300 group-hover:text-rose-200 flex items-center gap-1.5">
                    <span>⚛️</span>
                    <span>Átomo Hidrógeno</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Schrödinger & Coulomb</div>
                </button>

                <button
                  onClick={() => handleExecutePhysicsSimulation('par bell entrelazamiento cuántico violación CHSH y esferas de Bloch')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-purple-300 group-hover:text-purple-200 flex items-center gap-1.5">
                    <span>🌀</span>
                    <span>Par Bell EPR</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Bloch & Violación CHSH</div>
                </button>

                <button
                  onClick={() => handleExecutePhysicsSimulation('oscilador armónico cuántico paquete de ondas gaussiano')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-cyan-950/40 border border-slate-800 hover:border-cyan-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-cyan-300 group-hover:text-cyan-200 flex items-center gap-1.5">
                    <span>🌊</span>
                    <span>Oscilador Armónico</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Paquete de Onda Coherente</div>
                </button>

                <button
                  onClick={() => handleExecutePhysicsSimulation('colisión y dispersión de rutherford partículas alfa')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-amber-300 group-hover:text-amber-200 flex items-center gap-1.5">
                    <span>💥</span>
                    <span>Dispersión Rutherford</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Partículas Alfa & Oro</div>
                </button>

                <button
                  onClick={() => handleExecutePhysicsSimulation('cadena cuántica de espines 1D modelo ising magnones')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-teal-950/40 border border-slate-800 hover:border-teal-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-teal-300 group-hover:text-teal-200 flex items-center gap-1.5">
                    <span>🧲</span>
                    <span>Cadena de Ising</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Espines 1D & Transición Fase</div>
                </button>

                <button
                  onClick={() => handleExecutePhysicsSimulation('experimento cuántico de la doble rendija difracción interferencia')}
                  className="p-2.5 rounded-xl bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 text-left transition-all group cursor-pointer"
                >
                  <div className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200 flex items-center gap-1.5">
                    <span>〰️</span>
                    <span>Doble Rendija</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">Interferencia & Franjas Born</div>
                </button>
              </div>
            </div>
          </div>

          {/* Custom Input Section */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold font-mono text-slate-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-rose-400" />
                Ingresa cualquier Código Fuente, Circuito (QASM), Hamiltoniano o Sistema Físico:
              </label>
              <span className="text-[11px] font-mono text-slate-500">
                Soporta Python, OpenQASM, Notación Dirac y Ecuaciones
              </span>
            </div>

            <div className="relative">
              <textarea
                value={customPhysicsInput}
                onChange={(e) => setCustomPhysicsInput(e.target.value)}
                placeholder="Ejemplos que puedes pegar aquí:
• OPENQASM 2.0; qreg q[4]; h q[0]; cx q[0], q[1];
• H = -J * sum(sigma_z * sigma_z) - h * sum(sigma_x)
• Simular átomo de hidrógeno con orbitales Schrödinger y constante de Rydberg
• Partículas alfa disparadas hacia núcleo de Au 79+ con energía 5.5 MeV
• def simular_colision(particulas, potencial_coulomb): ..."
                rows={4}
                className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-rose-500 transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-slate-400">
                <span className="text-slate-500">Plantillas rápidas:</span>
                <button
                  type="button"
                  onClick={() => setCustomPhysicsInput('OPENQASM 2.0;\ninclude "qelib1.inc";\nqreg q[4];\ncreg c[4];\nh q[0];\ncx q[0], q[1];\ncx q[1], q[2];\nbarrier q;\nmeasure q -> c;')}
                  className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Circuito QASM 4Q
                </button>
                <button
                  type="button"
                  onClick={() => setCustomPhysicsInput('Hamiltoniano de Heisenberg Ising 1D:\nH = -J * sum(S_i^z * S_{i+1}^z) - h * sum(S_i^x)\nJ = 1.0 J, h = 0.85 T, N = 16 espines')}
                  className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Ising Spin Chain
                </button>
                <button
                  type="button"
                  onClick={() => setCustomPhysicsInput('Colisión Rutherford:\nPartícula alfa (q1=+2e, m=4u, E0=5.5 MeV) dispersada por núcleo de oro Au (q2=+79e).\nCalcular trayectoria hiperbólica exacta y ángulo theta.')}
                  className="px-2 py-0.5 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Dispersión Rutherford
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!customPhysicsInput.trim()) return;
                  handleExecutePhysicsSimulation(customPhysicsInput);
                }}
                disabled={!customPhysicsInput.trim()}
                className="px-5 py-2.5 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 hover:from-rose-400 hover:to-purple-400 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center space-x-2 active:scale-95 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>Interpretar, Simular y Auto-Anotar (60 FPS)</span>
              </button>
            </div>
          </div>

          {/* Active Live Video Simulation Canvas */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <LivePhysicsVideoRenderer
              interpretacion={activePhysicsInterpretation}
              autoAnnotatedNote={lastAutoAnnotatedNote}
              onOpenNote={handleOpenNoteById}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: BASE DE NOTAS & PROYECTOS CIENTÍFICOS                            */}
      {/* ========================================================================= */}
      {activeSubTab === 'lab_notes' && (
        <div className="space-y-6">
          {/* Controls Bar: Search, Category Filters, Export, New Project */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar proyectos por título, hipótesis, autor o etiquetas..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={handleExportNotesJson}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-xl transition-colors flex items-center space-x-1.5"
                  title="Exportar todos los proyectos en formato JSON"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Exportar JSON</span>
                </button>

                <button
                  onClick={handleOpenCreateNote}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5 active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Nueva Nota de Proyecto</span>
                </button>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono pt-1 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-500 mr-1">Filtrar por Área:</span>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'Simulación 6000Q', label: 'Simulación 6000Q' },
                { id: 'Entrelazamiento Masivo', label: 'Entrelazamiento' },
                { id: 'Criptografía Cuántica', label: 'Criptografía' },
                { id: 'Algoritmos Cuánticos', label: 'Algoritmos' },
                { id: 'Termodinámica & Entropía', label: 'Termodinámica' },
                { id: 'Biofísica Cuántica', label: 'Biofísica' },
              ].map(cat => {
                const isActive = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-2.5 py-1 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-cyan-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Modal / Collapsible for Create/Edit Note */}
          {isEditingNote && (
            <div className="bg-slate-900 border-2 border-cyan-500/50 rounded-2xl p-6 shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">
                    {activeNoteId ? 'Editar Proyecto de Investigación' : 'Registrar Nuevo Proyecto Científico'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsEditingNote(false)}
                  className="text-slate-400 hover:text-white text-xs font-mono px-2 py-1 rounded bg-slate-950 border border-slate-800"
                >
                  ✕ Cancelar
                </button>
              </div>

              <form onSubmit={handleSaveNote} className="space-y-4 text-xs sm:text-sm">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">
                      Título del Proyecto / Experimento:
                    </label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={e => setFormTitle(e.target.value)}
                      placeholder="Ej: Estudio de Coherencia en 6,000 Qubits..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">
                      Investigador Principal / Científico:
                    </label>
                    <input
                      type="text"
                      required
                      value={formAuthor}
                      onChange={e => setFormAuthor(e.target.value)}
                      placeholder="Ej: Dr. Evelio Llovera"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">
                      Área Científica / Categoría:
                    </label>
                    <select
                      value={formCategory}
                      onChange={e => setFormCategory(e.target.value as ProjectCategory)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="Simulación 6000Q">Simulación 6000Q</option>
                      <option value="Entrelazamiento Masivo">Entrelazamiento Masivo</option>
                      <option value="Criptografía Cuántica">Criptografía Cuántica</option>
                      <option value="Algoritmos Cuánticos">Algoritmos Cuánticos</option>
                      <option value="Termodinámica & Entropía">Termodinámica & Entropía</option>
                      <option value="Biofísica Cuántica">Biofísica Cuántica</option>
                      <option value="General">General</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">
                      Etiquetas (separadas por coma):
                    </label>
                    <input
                      type="text"
                      value={formTags}
                      onChange={e => setFormTags(e.target.value)}
                      placeholder="6000Q, Hilbert Space, Shor"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500 font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Hypotheses */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">
                    1. Hipótesis Científica:
                  </label>
                  <textarea
                    rows={2}
                    value={formHypothesis}
                    onChange={e => setFormHypothesis(e.target.value)}
                    placeholder="Describe la hipótesis teórica o la predicción experimental..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Methodology */}
                <div>
                  <label className="block text-slate-300 font-semibold mb-1 text-xs">
                    2. Metodología Experimental & Circuito:
                  </label>
                  <textarea
                    rows={2}
                    value={formMethodology}
                    onChange={e => setFormMethodology(e.target.value)}
                    placeholder="Puertas cuánticas aplicadas, protocolo de medida, algoritmo empleado..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                {/* Observations & Conclusions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">
                      3. Observaciones & Registros:
                    </label>
                    <textarea
                      rows={3}
                      value={formObservations}
                      onChange={e => setFormObservations(e.target.value)}
                      placeholder="Datos empíricos obtenidos, variaciones de fase, entropía observada..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1 text-xs">
                      4. Conclusiones & Siguientes Pasos:
                    </label>
                    <textarea
                      rows={3}
                      value={formConclusions}
                      onChange={e => setFormConclusions(e.target.value)}
                      placeholder="Conclusiones alcanzadas, verificación de la hipótesis, publicación..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-slate-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Telemetry Snapshot Section */}
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
                      <Activity className="w-3.5 h-3.5 text-teal-400" />
                      Telemetría Cuántica Asociada al Experimento
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormTelemetry(currentTelemetry)}
                      className="px-2.5 py-1 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded text-xs font-mono transition-colors"
                    >
                      ⚡ Actualizar con Estado Actual ({engine.registro.n_qubits.toLocaleString()} Q)
                    </button>
                  </div>

                  {formTelemetry ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono text-slate-400 pt-1">
                      <div className="p-2 bg-slate-900 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Cúbits:</span>
                        <span className="text-cyan-300 font-bold">{formTelemetry.qubitCount.toLocaleString()} Q</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Espacio Hilbert:</span>
                        <span className="text-purple-300 font-bold">{formTelemetry.hilbertDimension}</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Ciclo:</span>
                        <span className="text-emerald-300 font-bold">#{formTelemetry.cycle}</span>
                      </div>
                      <div className="p-2 bg-slate-900 rounded border border-slate-800">
                        <span className="text-slate-500 block text-[10px]">Entropía:</span>
                        <span className="text-amber-300 font-bold">{formTelemetry.entropy.toFixed(4)} bits</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 font-mono">
                      Sin telemetría vinculada todavía.
                    </p>
                  )}
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingNote(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-slate-950 font-bold rounded-xl text-xs shadow-lg transition-all active:scale-95"
                  >
                    {activeNoteId ? 'Guardar Cambios del Proyecto' : 'Guardar en Base de Notas'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Project Notes List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredNotes.length === 0 ? (
              <div className="col-span-full bg-slate-900/60 border border-slate-800 rounded-2xl p-12 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
                <h3 className="text-base font-bold text-slate-300">No se encontraron proyectos con esos criterios</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Crea tu primera nota científica para registrar los hallazgos de simulación cuántica.
                </p>
                <button
                  onClick={handleOpenCreateNote}
                  className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-xl shadow"
                >
                  + Redactar Nueva Nota
                </button>
              </div>
            ) : (
              filteredNotes.map(note => {
                const isSelected = activeNoteId === note.id;
                return (
                  <div
                    key={note.id}
                    className={`bg-slate-900/90 border rounded-2xl p-5 shadow-lg transition-all flex flex-col justify-between ${
                      note.starred
                        ? 'border-amber-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20'
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-3">
                      {/* Category Badge & Top Actions */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                          {note.category}
                        </span>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleToggleStarred(note.id)}
                            className={`p-1.5 rounded-lg transition-colors ${
                              note.starred
                                ? 'text-amber-400 bg-amber-400/10'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                            title={note.starred ? 'Quitar destacado' : 'Marcar como destacado'}
                          >
                            <Star className="w-4 h-4 fill-current" />
                          </button>
                          <button
                            onClick={() => handleOpenEditNote(note)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                            title="Editar proyecto"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteNote(note.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
                            title="Eliminar proyecto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Author */}
                      <div>
                        <h4 className="text-base font-bold text-white leading-snug">
                          {note.title}
                        </h4>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-1">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>{note.author}</span>
                          <span>•</span>
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(note.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {/* Hypothesis & Excerpt */}
                      <div className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl space-y-2 text-xs">
                        <div>
                          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block font-semibold">
                            Hipótesis:
                          </span>
                          <p className="text-slate-300 line-clamp-2 leading-relaxed">
                            {note.hypothesis || 'Sin hipótesis redactada.'}
                          </p>
                        </div>

                        {note.conclusions && (
                          <div className="pt-1.5 border-t border-slate-800/60">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 block font-semibold">
                              Conclusiones:
                            </span>
                            <p className="text-slate-400 line-clamp-2 leading-relaxed text-[11px]">
                              {note.conclusions}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      {note.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {note.tags.map(tag => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Attached Telemetry Capsule */}
                      {note.telemetry && (
                        <div className="p-2 rounded-xl bg-slate-950 border border-teal-500/20 text-[10px] font-mono flex items-center justify-between text-slate-400">
                          <span className="text-teal-400 font-bold">
                            ⚡ {note.telemetry.qubitCount.toLocaleString()} Qubits
                          </span>
                          <span>Dim: {note.telemetry.hilbertDimension}</span>
                          <span>Ciclo #{note.telemetry.cycle}</span>
                          <span className="text-amber-400">H: {note.telemetry.entropy.toFixed(3)}</span>
                        </div>
                      )}
                    </div>

                    {/* Bottom Actions for Note */}
                    <div className="pt-4 mt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-2">
                      <button
                        onClick={() => handleRequestAiReview(note)}
                        className="px-3 py-1.5 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-mono flex items-center space-x-1.5 transition-colors"
                        title="Enviar nota a SOXCIMA IA para evaluación científica de pares"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>Revisar con SOXCIMA IA</span>
                      </button>

                      <button
                        onClick={() => handleExportNoteMarkdown(note)}
                        className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono flex items-center space-x-1 transition-colors"
                        title="Descargar reporte en Markdown"
                      >
                        {copiedNote === note.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Descargado</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-slate-400" />
                            <span>Reporte .md</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: MEMORIA ROBUSTA SQLITE (conocimiento)                          */}
      {/* ========================================================================= */}
      {activeSubTab === 'sqlite_memory' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-purple-400" />
                Base de Datos SQLite: Tabla <code>conocimiento</code>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Ubicación: <code>{SOXCIMA_RUTA_EXCLUSIVA}/{SOXCIMA_BASE_DATOS}</code> • Registro inmutable de preguntas y respuestas
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Buscar en SQLite..."
                value={memorySearch}
                onChange={e => setMemorySearch(e.target.value)}
                className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500 font-mono"
              />
              <button
                onClick={() => {
                  if (window.confirm('¿Deseas reiniciar la memoria SQLite local con las semillas por defecto?')) {
                    localStorage.removeItem('soxcima_memoria_robusta_sqlite_v1');
                    setMemoryRecords(loadKnowledgeMemory());
                  }
                }}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-mono"
                title="Reiniciar tabla"
              >
                Reiniciar
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400">
                  <th className="p-3 w-12">ID</th>
                  <th className="p-3 w-48">Fecha</th>
                  <th className="p-3 w-1/3">Pregunta / Consulta</th>
                  <th className="p-3">Respuesta Registrada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredMemory.map(record => (
                  <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-purple-400 font-bold">{record.id}</td>
                    <td className="p-3 text-slate-400 whitespace-nowrap">{record.fecha}</td>
                    <td className="p-3 text-cyan-300 font-sans font-medium">{record.pregunta}</td>
                    <td className="p-3 text-slate-300 font-sans whitespace-pre-wrap text-[11px] leading-relaxed">
                      {record.respuesta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 4: SCRIPT PYTHON / TERMUX (soxcima_completa.py)                   */}
      {/* ========================================================================= */}
      {activeSubTab === 'termux_script' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-emerald-400" />
                Script Autónomo para Android Termux: <code>soxcima_completa.py</code>
              </h3>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Servidor fuerte <code>ThreadingMixIn</code> en puerto 8888 • SQLite <code>memoria_robusta.db</code> en <code>{SOXCIMA_RUTA_EXCLUSIVA}</code>
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyScript}
                className="px-3.5 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-colors"
              >
                {copiedScript ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¡Copiado al Portapapeles!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script Completo</span>
                  </>
                )}
              </button>

              <button
                onClick={handleDownloadScript}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Descargar .py</span>
              </button>
            </div>
          </div>

          {/* Quick instructions */}
          <div className="p-4 bg-slate-950 border border-emerald-500/30 rounded-xl space-y-2 text-xs font-mono text-slate-300">
            <span className="text-emerald-400 font-bold block">
              Instrucciones de ejecución en Termux (Android):
            </span>
            <pre className="text-[11px] text-slate-300 bg-slate-900 p-2.5 rounded border border-slate-800 overflow-x-auto">
{`# 1. Crear directorio exclusivo
mkdir -p /data/data/com.termux/files/home/storage/shared/MEMORIA_SOXCIMA

# 2. Ejecutar el script (inicia servidor en puerto 8888 con base de datos SQLite)
python3 /data/data/com.termux/files/home/storage/shared/MEMORIA_SOXCIMA/soxcima_completa.py

# 3. Abrir en el navegador de tu teléfono:
http://127.0.0.1:8888`}
            </pre>
          </div>

          {/* Script Viewer */}
          <div className="relative">
            <pre className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-[11px] font-mono text-emerald-300 overflow-x-auto max-h-[450px] leading-relaxed scrollbar-thin">
              {SCRIPT_PYTHON_TERMUX}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
