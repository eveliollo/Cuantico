import { GatePlacement, GateType, QuantumAssemblyCircuit, QuantumAssemblyInstruction } from '../types/quantum';
import { sha256Sync } from './socximaEngine';

/**
 * Generates OpenQASM 2.0 compatible assembly text from gates and qubit count.
 */
export function generateOpenQasmText(qubitCount: number, gates: GatePlacement[]): string {
  const sortedGates = [...gates].sort((a, b) => a.step - b.step || a.targetQubit - b.targetQubit);
  const lines: string[] = [
    '// Socxima Quantum Core - OpenQASM 2.0 Export',
    'OPENQASM 2.0;',
    'include "qelib1.inc";',
    '',
    `qreg q[${qubitCount}];`,
    `creg c[${qubitCount}];`,
    ''
  ];

  for (const g of sortedGates) {
    switch (g.type) {
      case 'H':
        lines.push(`h q[${g.targetQubit}];`);
        break;
      case 'X':
        lines.push(`x q[${g.targetQubit}];`);
        break;
      case 'Y':
        lines.push(`y q[${g.targetQubit}];`);
        break;
      case 'Z':
        lines.push(`z q[${g.targetQubit}];`);
        break;
      case 'S':
        lines.push(`s q[${g.targetQubit}];`);
        break;
      case 'T':
        lines.push(`t q[${g.targetQubit}];`);
        break;
      case 'RX': {
        const theta = g.params?.theta ?? Math.PI / 2;
        lines.push(`rx(${theta.toFixed(6)}) q[${g.targetQubit}];`);
        break;
      }
      case 'RY': {
        const theta = g.params?.theta ?? Math.PI / 2;
        lines.push(`ry(${theta.toFixed(6)}) q[${g.targetQubit}];`);
        break;
      }
      case 'RZ': {
        const theta = g.params?.theta ?? Math.PI / 2;
        lines.push(`rz(${theta.toFixed(6)}) q[${g.targetQubit}];`);
        break;
      }
      case 'CNOT':
        lines.push(`cx q[${g.controlQubit ?? 0}], q[${g.targetQubit}];`);
        break;
      case 'CZ':
        lines.push(`cz q[${g.controlQubit ?? 0}], q[${g.targetQubit}];`);
        break;
      case 'SWAP':
        lines.push(`swap q[${g.controlQubit ?? 0}], q[${g.targetQubit}];`);
        break;
      case 'MEASURE':
        lines.push(`measure q[${g.targetQubit}] -> c[${g.targetQubit}];`);
        break;
      default:
        lines.push(`// unknown gate: ${g.type} on q[${g.targetQubit}]`);
        break;
    }
  }

  lines.push('');
  lines.push('// End of Quantum Assembly');
  return lines.join('\n');
}

/**
 * Builds the canonical JSON-formatted quantum assembly object.
 */
export function exportCircuitToQuantumAssembly(
  qubitCount: number,
  gates: GatePlacement[],
  circuitName: string = 'Untitled Circuit'
): QuantumAssemblyCircuit {
  const sortedGates = [...gates].sort((a, b) => a.step - b.step || a.targetQubit - b.targetQubit);

  const instructions: QuantumAssemblyInstruction[] = sortedGates.map(g => ({
    gate: g.type,
    target: g.targetQubit,
    control: g.controlQubit,
    step: g.step,
    params: g.params ? { ...g.params } : undefined,
  }));

  const maxStep = sortedGates.reduce((max, g) => Math.max(max, g.step + 1), 0);
  const openQasmStr = generateOpenQasmText(qubitCount, sortedGates);

  const rawForHash = JSON.stringify({
    qubit_count: qubitCount,
    instructions: instructions.map(i => ({
      g: i.gate,
      t: i.target,
      c: i.control ?? null,
      s: i.step,
      p: i.params?.theta ?? null,
    })),
  });
  const circuitHash = sha256Sync(rawForHash);

  const circuitId = `circ_${circuitHash.substring(0, 12)}`;

  return {
    format: 'socxima_quantum_assembly_v1',
    schema_version: '1.0.0',
    circuit_id: circuitId,
    circuit_name: circuitName,
    qubit_count: qubitCount,
    step_count: maxStep,
    gate_count: instructions.length,
    instructions,
    qasm_str: openQasmStr,
    circuit_hash_sha256: circuitHash,
    created_at: new Date().toISOString(),
  };
}

/**
 * Serializes the quantum assembly circuit to a formatted JSON string.
 */
export function serializeQuantumAssembly(assembly: QuantumAssemblyCircuit): string {
  return JSON.stringify(assembly, null, 2);
}

/**
 * Parses a JSON-formatted quantum assembly string back into gates and qubit count.
 */
export function parseQuantumAssembly(jsonStr: string): {
  success: boolean;
  qubitCount?: number;
  circuitName?: string;
  gates?: GatePlacement[];
  error?: string;
} {
  try {
    const data = JSON.parse(jsonStr);

    if (typeof data !== 'object' || data === null) {
      return { success: false, error: 'JSON root must be an object.' };
    }

    const qubitCount = Number(data.qubit_count ?? data.qubits ?? data.qubitCount);
    if (!Number.isInteger(qubitCount) || qubitCount < 1 || qubitCount > 8) {
      return { success: false, error: 'Invalid qubit_count (must be an integer between 1 and 8).' };
    }

    const instructions = data.instructions ?? data.gates ?? [];
    if (!Array.isArray(instructions)) {
      return { success: false, error: 'Expected instructions or gates array.' };
    }

    const parsedGates: GatePlacement[] = [];
    const validGateTypes: GateType[] = [
      'H', 'X', 'Y', 'Z', 'S', 'T', 'RX', 'RY', 'RZ', 'CNOT', 'CZ', 'SWAP', 'MEASURE'
    ];

    for (let i = 0; i < instructions.length; i++) {
      const item = instructions[i];
      const gateType = (item.gate ?? item.type ?? '').toUpperCase() as GateType;
      if (!validGateTypes.includes(gateType)) {
        return { success: false, error: `Invalid gate type "${gateType}" at instruction #${i}.` };
      }

      const targetQubit = Number(item.target ?? item.targetQubit ?? 0);
      const step = Number(item.step ?? 0);
      const controlQubit = item.control !== undefined ? Number(item.control) : (item.controlQubit !== undefined ? Number(item.controlQubit) : undefined);

      parsedGates.push({
        id: `g_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        type: gateType,
        targetQubit,
        controlQubit,
        step,
        params: item.params ? { theta: Number(item.params.theta) } : undefined,
      });
    }

    return {
      success: true,
      qubitCount,
      circuitName: typeof data.circuit_name === 'string' ? data.circuit_name : 'Imported Circuit',
      gates: parsedGates,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `JSON Parse Error: ${err.message}` : 'Invalid JSON string',
    };
  }
}
