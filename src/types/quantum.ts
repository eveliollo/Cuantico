export interface Complex {
  re: number;
  im: number;
}

export type GateType = 
  | 'H' 
  | 'X' 
  | 'Y' 
  | 'Z' 
  | 'S' 
  | 'T' 
  | 'RX' 
  | 'RY' 
  | 'RZ' 
  | 'CNOT' 
  | 'CZ' 
  | 'SWAP' 
  | 'MEASURE';

export interface GatePlacement {
  id: string;
  type: GateType;
  targetQubit: number;
  controlQubit?: number; // For 2-qubit gates like CNOT, CZ, SWAP
  params?: {
    theta?: number; // For rotation gates (in radians)
  };
  step: number;
}

export interface Circuit {
  id: string;
  name: string;
  qubitCount: number;
  stepsCount: number;
  gates: GatePlacement[];
  createdAt: number;
}

export interface StateVectorItem {
  basisBinary: string; // e.g., "00", "01", "10", "11"
  basisDecimal: number; // e.g., 0, 1, 2, 3
  amplitude: Complex;
  probability: number; // |amplitude|^2
  phase: number; // angle in radians [-PI, PI]
  phaseDegrees: number;
}

export interface BlochCoordinates {
  x: number;
  y: number;
  z: number;
  theta: number; // polar angle [0, PI]
  phi: number;   // azimuthal angle [0, 2*PI]
}

export interface MeasurementHistogram {
  [basisBinary: string]: number; // count
}

export interface SimulationResult {
  circuitId: string;
  qubitCount: number;
  stateVector: StateVectorItem[];
  blochCoords: BlochCoordinates[]; // For each qubit
  shots: number;
  counts: MeasurementHistogram;
  probabilities: { [basis: string]: number };
  stateHashSha256: string;
  diracNotation: string;
  executionTimeMs: number;
}

export interface Ed25519KeyPair {
  publicKeyHex: string;
  privateKeyHex: string;
  seedHex: string;
  generatedAt: number;
}

export interface SignatureRecord {
  id: string;
  message: string;
  signatureHex: string;
  publicKeyHex: string;
  algorithm: 'ed25519-dalek-v2';
  timestamp: number;
  verified: boolean;
}

export interface RusqliteExecutionRecord {
  runId: string;
  circuitId: string;
  circuitName: string;
  qubitCount: number;
  shots: number;
  stateHash: string;
  topOutcome: string;
  ed25519Signature: string;
  signerPublicKey: string;
  timestamp: number;
  assemblyJson?: string;
}

export interface QuantumAssemblyInstruction {
  gate: GateType;
  target: number;
  control?: number;
  step: number;
  params?: {
    theta?: number;
  };
}

export interface QuantumAssemblyCircuit {
  format: 'socxima_quantum_assembly_v1';
  schema_version: '1.0.0';
  circuit_id: string;
  circuit_name: string;
  qubit_count: number;
  step_count: number;
  gate_count: number;
  instructions: QuantumAssemblyInstruction[];
  qasm_str?: string;
  circuit_hash_sha256: string;
  created_at: string;
}

export interface SavedCircuitRecord {
  circuitId: string;
  circuitName: string;
  qubitCount: number;
  gateCount: number;
  assemblyJson: string;
  assemblyHash: string;
  signerPublicKey?: string;
  signature?: string;
  savedAt: number;
}

export interface RusqliteBlockRecord {
  blockHeight: number;
  blockHash: string;
  prevHash: string;
  stateRoot: string;
  txCount: number;
  minerPubkey: string;
  timestamp: number;
}

export interface QrngEntropyRecord {
  id: string;
  bitsCount: number;
  bitsHex: string;
  monobitRatio: number;
  pValEstimate: number;
  entropyEstimate: number;
  source: string;
  timestamp: number;
}
