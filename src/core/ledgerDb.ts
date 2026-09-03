import { RusqliteExecutionRecord, RusqliteBlockRecord, QrngEntropyRecord, SavedCircuitRecord } from '../types/quantum';
import { simpleSha256 } from './quantumEngine';

const STORAGE_KEY_RUNS = 'socxima_rusqlite_runs_v1';
const STORAGE_KEY_BLOCKS = 'socxima_rusqlite_blocks_v1';
const STORAGE_KEY_ENTROPY = 'socxima_rusqlite_entropy_v1';
const STORAGE_KEY_CIRCUITS = 'socxima_rusqlite_circuits_v1';

// Initial seed circuits with Quantum Assembly JSON
const INITIAL_CIRCUITS: SavedCircuitRecord[] = [
  {
    circuitId: 'circ_bell_phi_plus',
    circuitName: 'Bell State |Φ+⟩ Genesis',
    qubitCount: 2,
    gateCount: 2,
    assemblyHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    assemblyJson: JSON.stringify({
      format: 'socxima_quantum_assembly_v1',
      schema_version: '1.0.0',
      circuit_id: 'circ_bell_phi_plus',
      circuit_name: 'Bell State |Φ+⟩ Genesis',
      qubit_count: 2,
      step_count: 2,
      gate_count: 2,
      instructions: [
        { gate: 'H', target: 0, step: 0 },
        { gate: 'CNOT', target: 1, control: 0, step: 1 }
      ],
      circuit_hash_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      created_at: new Date(Date.now() - 7200000).toISOString()
    }, null, 2),
    signerPublicKey: 'a8f103b491820492810482910482910482910482910482910482910482910482',
    signature: '7f91048291048291048291048291048291048291048291048291048291048291a8f103b491820492810482910482910482910482910482910482910482910482',
    savedAt: Date.now() - 7200000,
  },
  {
    circuitId: 'circ_ghz_3q',
    circuitName: 'GHZ 3-Qubit Entanglement',
    qubitCount: 3,
    gateCount: 3,
    assemblyHash: '4a6b2c9182049182049182049182049182049182049182049182049182049182',
    assemblyJson: JSON.stringify({
      format: 'socxima_quantum_assembly_v1',
      schema_version: '1.0.0',
      circuit_id: 'circ_ghz_3q',
      circuit_name: 'GHZ 3-Qubit Entanglement',
      qubit_count: 3,
      step_count: 3,
      gate_count: 3,
      instructions: [
        { gate: 'H', target: 0, step: 0 },
        { gate: 'CNOT', target: 1, control: 0, step: 1 },
        { gate: 'CNOT', target: 2, control: 1, step: 2 }
      ],
      circuit_hash_sha256: '4a6b2c9182049182049182049182049182049182049182049182049182049182',
      created_at: new Date(Date.now() - 3600000).toISOString()
    }, null, 2),
    signerPublicKey: 'a8f103b491820492810482910482910482910482910482910482910482910482',
    signature: '3b81048291048291048291048291048291048291048291048291048291048291c9f103b491820492810482910482910482910482910482910482910482910482',
    savedAt: Date.now() - 3600000,
  }
];

// Initial seed data representing Rusqlite embedded ledger
const INITIAL_BLOCKS: RusqliteBlockRecord[] = [
  {
    blockHeight: 0,
    blockHash: '0000000084f32c91a7e4b981240c1d6835a92d8492049281a0b38c291840192a',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    stateRoot: '71a4f00bc194a284920194829104829104829104829104829104829104829104',
    txCount: 0,
    minerPubkey: 'a8f103b491820492810482910482910482910482910482910482910482910482',
    timestamp: Date.now() - 3600000 * 2,
  },
  {
    blockHeight: 1,
    blockHash: '00000000a12e84c90f234857b8a7362947192038472910482910482910482910',
    prevHash: '0000000084f32c91a7e4b981240c1d6835a92d8492049281a0b38c291840192a',
    stateRoot: '8b49201948291048291048291048291048291048291048291048291048291048',
    txCount: 2,
    minerPubkey: 'a8f103b491820492810482910482910482910482910482910482910482910482',
    timestamp: Date.now() - 3600000,
  }
];

const INITIAL_RUNS: RusqliteExecutionRecord[] = [
  {
    runId: 'run_bell_state_init',
    circuitId: 'preset_bell',
    circuitName: 'Bell State |Φ+⟩ Genesis',
    qubitCount: 2,
    shots: 1024,
    stateHash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
    topOutcome: '|00⟩ (51.2%), |11⟩ (48.8%)',
    ed25519Signature: '9f83ab47c81920491820491820491820491820491820491820491820491820491820491820491820491820491820491820491820491820491820491820491820',
    signerPublicKey: 'a8f103b491820492810482910482910482910482910482910482910482910482',
    timestamp: Date.now() - 3600000,
  }
];

export class RusqliteLedger {
  private runs: RusqliteExecutionRecord[] = [];
  private blocks: RusqliteBlockRecord[] = [];
  private entropyLogs: QrngEntropyRecord[] = [];
  private circuits: SavedCircuitRecord[] = [];

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedRuns = localStorage.getItem(STORAGE_KEY_RUNS);
      this.runs = storedRuns ? JSON.parse(storedRuns) : [...INITIAL_RUNS];

      const storedBlocks = localStorage.getItem(STORAGE_KEY_BLOCKS);
      this.blocks = storedBlocks ? JSON.parse(storedBlocks) : [...INITIAL_BLOCKS];

      const storedEntropy = localStorage.getItem(STORAGE_KEY_ENTROPY);
      this.entropyLogs = storedEntropy ? JSON.parse(storedEntropy) : [];

      const storedCircuits = localStorage.getItem(STORAGE_KEY_CIRCUITS);
      this.circuits = storedCircuits ? JSON.parse(storedCircuits) : [...INITIAL_CIRCUITS];
    } catch {
      this.runs = [...INITIAL_RUNS];
      this.blocks = [...INITIAL_BLOCKS];
      this.entropyLogs = [];
      this.circuits = [...INITIAL_CIRCUITS];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY_RUNS, JSON.stringify(this.runs));
      localStorage.setItem(STORAGE_KEY_BLOCKS, JSON.stringify(this.blocks));
      localStorage.setItem(STORAGE_KEY_ENTROPY, JSON.stringify(this.entropyLogs));
      localStorage.setItem(STORAGE_KEY_CIRCUITS, JSON.stringify(this.circuits));
    } catch {
      // ignore storage quota errors
    }
  }

  public getRuns(): RusqliteExecutionRecord[] {
    return [...this.runs];
  }

  public getBlocks(): RusqliteBlockRecord[] {
    return [...this.blocks];
  }

  public getEntropyLogs(): QrngEntropyRecord[] {
    return [...this.entropyLogs];
  }

  public getSavedCircuits(): SavedCircuitRecord[] {
    return [...this.circuits];
  }

  public saveCircuit(record: SavedCircuitRecord): void {
    const existingIdx = this.circuits.findIndex(c => c.circuitId === record.circuitId);
    if (existingIdx >= 0) {
      this.circuits[existingIdx] = record;
    } else {
      this.circuits.unshift(record);
    }
    if (this.circuits.length > 50) this.circuits.pop();
    this.saveToStorage();
  }

  public deleteCircuit(circuitId: string): void {
    this.circuits = this.circuits.filter(c => c.circuitId !== circuitId);
    this.saveToStorage();
  }

  public insertExecutionRun(record: RusqliteExecutionRecord): void {
    this.runs.unshift(record);
    if (this.runs.length > 100) this.runs.pop();
    this.saveToStorage();
  }

  public insertEntropyLog(record: QrngEntropyRecord): void {
    this.entropyLogs.unshift(record);
    if (this.entropyLogs.length > 50) this.entropyLogs.pop();
    this.saveToStorage();
  }

  public commitNewBlock(minerPubkey: string): RusqliteBlockRecord {
    const prevBlock = this.blocks[this.blocks.length - 1];
    const prevHash = prevBlock ? prevBlock.blockHash : '0000000000000000000000000000000000000000000000000000000000000000';
    const blockHeight = prevBlock ? prevBlock.blockHeight + 1 : 0;

    // Compute Merkle State Root of current runs
    const runHashes = this.runs.slice(0, 10).map(r => r.stateHash).join('');
    const stateRoot = simpleSha256(runHashes || 'genesis_root');

    const blockHeader = `${blockHeight}:${prevHash}:${stateRoot}:${minerPubkey}:${Date.now()}`;
    const blockHash = '0000' + simpleSha256(blockHeader).substring(4); // Simulated proof-of-work/quantum hash commitment

    const newBlock: RusqliteBlockRecord = {
      blockHeight,
      blockHash,
      prevHash,
      stateRoot,
      txCount: Math.min(this.runs.length, 5),
      minerPubkey,
      timestamp: Date.now(),
    };

    this.blocks.push(newBlock);
    this.saveToStorage();
    return newBlock;
  }

  public clearAll(): void {
    this.runs = [...INITIAL_RUNS];
    this.blocks = [...INITIAL_BLOCKS];
    this.entropyLogs = [];
    this.circuits = [...INITIAL_CIRCUITS];
    this.saveToStorage();
  }

  /**
   * Executes a simulated SQL query on the rusqlite tables.
   */
  public executeQuery(query: string): { columns: string[]; rows: any[][]; message?: string; error?: string } {
    const q = query.trim().replace(/;$/, '');
    const lower = q.toLowerCase();

    try {
      if (lower.startsWith('select')) {
        let tableName = '';
        if (lower.includes('from execution_runs') || lower.includes('from runs')) {
          tableName = 'execution_runs';
        } else if (lower.includes('from quantum_blocks') || lower.includes('from blocks') || lower.includes('from ledger_blocks')) {
          tableName = 'quantum_ledger_blocks';
        } else if (lower.includes('from qrng_entropy_log') || lower.includes('from entropy')) {
          tableName = 'qrng_entropy_log';
        } else if (lower.includes('from circuit_registry') || lower.includes('from circuits') || lower.includes('from saved_circuits')) {
          tableName = 'circuit_registry';
        } else {
          return {
            columns: ['Error'],
            rows: [['Table not recognized. Available tables: execution_runs, circuit_registry, quantum_ledger_blocks, qrng_entropy_log']],
            error: 'Unknown table in FROM clause',
          };
        }

        let dataset: any[] = [];
        if (tableName === 'execution_runs') {
          dataset = this.runs;
        } else if (tableName === 'quantum_ledger_blocks') {
          dataset = this.blocks;
        } else if (tableName === 'circuit_registry') {
          dataset = this.circuits;
        } else {
          dataset = this.entropyLogs;
        }

        if (dataset.length === 0) {
          return {
            columns: ['Info'],
            rows: [['0 rows returned. Table is currently empty.']],
            message: 'Query executed successfully (0 rows)',
          };
        }

        const sample = dataset[0];
        const allKeys = Object.keys(sample);

        // Simple limit parser
        let limit = 50;
        const limitMatch = lower.match(/limit\s+(\d+)/);
        if (limitMatch) {
          limit = parseInt(limitMatch[1], 10);
        }

        const sliced = dataset.slice(0, limit);
        const rows = sliced.map(item => allKeys.map(k => String(item[k] ?? '')));

        return {
          columns: allKeys,
          rows,
          message: `${rows.length} row(s) returned from ${tableName} (rusqlite engine)`,
        };
      }

      if (lower.startsWith('insert into')) {
        return {
          columns: ['Result'],
          rows: [['1 row affected. Note: Use application UI "Commit to Rusqlite" for cryptographic signing.']],
          message: 'INSERT simulated',
        };
      }

      return {
        columns: ['Output'],
        rows: [[`Executed: ${q}`]],
        message: 'SQL statement processed by rusqlite virtual driver.',
      };
    } catch (e) {
      return {
        columns: ['Error'],
        rows: [[e instanceof Error ? e.message : 'SQL error']],
        error: 'Execution failed',
      };
    }
  }
}

export const rusqliteDb = new RusqliteLedger();
