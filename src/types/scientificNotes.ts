export interface ScientificQuantumTelemetry {
  qubitCount: number;
  hilbertDimension: string;
  cycle: number;
  entropy: number;
  stateHashSha256: string;
  activeSuperpositionsCount: number;
  timestamp: number;
  ed25519Signature?: string;
  signerPublicKey?: string;
}

export type ProjectCategory = 
  | 'Simulación 6000Q'
  | 'Entrelazamiento Masivo'
  | 'Criptografía Cuántica'
  | 'Algoritmos Cuánticos'
  | 'Termodinámica & Entropía'
  | 'Biofísica Cuántica'
  | 'General';

export interface ScientificProjectNote {
  id: string;
  title: string;
  author: string;
  category: ProjectCategory;
  tags: string[];
  hypothesis: string;
  methodology: string;
  observations: string;
  conclusions: string;
  telemetry?: ScientificQuantumTelemetry;
  createdAt: number;
  updatedAt: number;
  starred?: boolean;
}

export interface SoxcimaChatMessage {
  id: string;
  sender: 'user' | 'ia';
  text: string;
  timestamp: number;
  telemetrySnapshot?: ScientificQuantumTelemetry;
  attachedNoteTitle?: string;
  simulationPayload?: {
    systemKind: string;
    systemName: string;
    noteId: string;
    noteTitle: string;
    sha256Signature: string;
    interpretacion?: any;
  };
}

export interface KnowledgeMemoryRecord {
  id: number;
  pregunta: string;
  respuesta: string;
  fecha: string;
}
