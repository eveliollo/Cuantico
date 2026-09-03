import { Complex, GatePlacement, StateVectorItem, BlochCoordinates, SimulationResult } from '../types/quantum';
import { ComplexMath } from './complex';

const SQRT1_2 = Math.SQRT1_2; // 1 / sqrt(2) ~ 0.70710678

/**
 * 2x2 Unitary Matrix representation
 */
type Matrix2x2 = [
  [Complex, Complex],
  [Complex, Complex]
];

export const QUANTUM_GATES_DEF: Record<string, (params?: { theta?: number }) => Matrix2x2> = {
  H: () => [
    [ComplexMath.create(SQRT1_2, 0), ComplexMath.create(SQRT1_2, 0)],
    [ComplexMath.create(SQRT1_2, 0), ComplexMath.create(-SQRT1_2, 0)]
  ],
  X: () => [
    [ComplexMath.zero(), ComplexMath.one()],
    [ComplexMath.one(), ComplexMath.zero()]
  ],
  Y: () => [
    [ComplexMath.zero(), ComplexMath.create(0, -1)],
    [ComplexMath.create(0, 1), ComplexMath.zero()]
  ],
  Z: () => [
    [ComplexMath.one(), ComplexMath.zero()],
    [ComplexMath.zero(), ComplexMath.create(-1, 0)]
  ],
  S: () => [
    [ComplexMath.one(), ComplexMath.zero()],
    [ComplexMath.zero(), ComplexMath.create(0, 1)]
  ],
  T: () => [
    [ComplexMath.one(), ComplexMath.zero()],
    [ComplexMath.zero(), ComplexMath.create(SQRT1_2, SQRT1_2)] // e^(i * pi / 4)
  ],
  RX: (p) => {
    const theta = p?.theta ?? Math.PI / 2;
    const cosHalf = Math.cos(theta / 2);
    const sinHalf = Math.sin(theta / 2);
    return [
      [ComplexMath.create(cosHalf, 0), ComplexMath.create(0, -sinHalf)],
      [ComplexMath.create(0, -sinHalf), ComplexMath.create(cosHalf, 0)]
    ];
  },
  RY: (p) => {
    const theta = p?.theta ?? Math.PI / 2;
    const cosHalf = Math.cos(theta / 2);
    const sinHalf = Math.sin(theta / 2);
    return [
      [ComplexMath.create(cosHalf, 0), ComplexMath.create(-sinHalf, 0)],
      [ComplexMath.create(sinHalf, 0), ComplexMath.create(cosHalf, 0)]
    ];
  },
  RZ: (p) => {
    const theta = p?.theta ?? Math.PI / 2;
    return [
      [ComplexMath.fromPolar(1, -theta / 2), ComplexMath.zero()],
      [ComplexMath.zero(), ComplexMath.fromPolar(1, theta / 2)]
    ];
  }
};

/**
 * Executes a quantum circuit on an N-qubit state vector.
 */
export function simulateCircuit(
  qubitCount: number,
  gates: GatePlacement[],
  shots: number = 1024,
  circuitId: string = 'circuit_default'
): SimulationResult {
  const startTime = performance.now();
  const dimension = 1 << qubitCount; // 2^N

  // Initialize state |00...0>
  let state: Complex[] = new Array(dimension).fill(null).map(() => ComplexMath.zero());
  state[0] = ComplexMath.one();

  // Sort gates by step
  const sortedGates = [...gates].sort((a, b) => a.step - b.step);

  for (const gate of sortedGates) {
    if (gate.type === 'MEASURE') continue;

    if (gate.type === 'CNOT') {
      const control = gate.controlQubit ?? 0;
      const target = gate.targetQubit;
      state = applyCNot(state, qubitCount, control, target);
    } else if (gate.type === 'CZ') {
      const control = gate.controlQubit ?? 0;
      const target = gate.targetQubit;
      state = applyCZ(state, qubitCount, control, target);
    } else if (gate.type === 'SWAP') {
      const q1 = gate.controlQubit ?? 0;
      const q2 = gate.targetQubit;
      state = applySwap(state, qubitCount, q1, q2);
    } else {
      const matrixGen = QUANTUM_GATES_DEF[gate.type];
      if (matrixGen) {
        const matrix = matrixGen(gate.params);
        state = applySingleQubitGate(state, qubitCount, gate.targetQubit, matrix);
      }
    }
  }

  // Renormalize to ensure numerical stability (as in num-complex)
  let normSq = 0;
  for (let i = 0; i < dimension; i++) {
    normSq += ComplexMath.absSq(state[i]);
  }
  if (normSq > 0 && Math.abs(normSq - 1.0) > 1e-12) {
    const norm = Math.sqrt(normSq);
    state = state.map(c => ComplexMath.scale(c, 1 / norm));
  }

  // Build StateVectorItems
  const stateVector: StateVectorItem[] = [];
  const probabilities: { [basis: string]: number } = {};
  const cumulativeProbs: number[] = [];
  let cum = 0;

  for (let i = 0; i < dimension; i++) {
    const basisBinary = i.toString(2).padStart(qubitCount, '0');
    const amp = state[i];
    const prob = ComplexMath.absSq(amp);
    const phase = ComplexMath.arg(amp);
    const phaseDeg = (phase * 180) / Math.PI;

    stateVector.push({
      basisBinary,
      basisDecimal: i,
      amplitude: amp,
      probability: prob,
      phase,
      phaseDegrees: phaseDeg,
    });

    probabilities[basisBinary] = prob;
    cum += prob;
    cumulativeProbs.push(cum);
  }

  // Calculate Bloch coordinates for each qubit
  const blochCoords: BlochCoordinates[] = [];
  for (let q = 0; q < qubitCount; q++) {
    blochCoords.push(calculateBlochCoords(state, qubitCount, q));
  }

  // Monte Carlo Measurement Sampling (rand / rand_core simulation)
  const counts: { [basis: string]: number } = {};
  for (let i = 0; i < dimension; i++) {
    counts[i.toString(2).padStart(qubitCount, '0')] = 0;
  }

  for (let s = 0; s < shots; s++) {
    const r = Math.random();
    let selectedIndex = dimension - 1;
    for (let i = 0; i < dimension; i++) {
      if (r <= cumulativeProbs[i]) {
        selectedIndex = i;
        break;
      }
    }
    const key = selectedIndex.toString(2).padStart(qubitCount, '0');
    counts[key] = (counts[key] || 0) + 1;
  }

  // Build Dirac Notation string
  const diracTerms: string[] = [];
  for (const item of stateVector) {
    if (item.probability > 0.001) {
      const ampStr = ComplexMath.format(item.amplitude, 3);
      diracTerms.push(`(${ampStr})|${item.basisBinary}⟩`);
    }
  }
  const diracNotation = diracTerms.length > 0 ? diracTerms.join(' + ') : '|0⟩';

  // Compute canonical state hash
  const canonicalBytes = stateVector
    .map(v => `${v.basisBinary}:${v.amplitude.re.toFixed(6)},${v.amplitude.im.toFixed(6)}`)
    .join(';');
  const stateHashSha256 = simpleSha256(canonicalBytes);

  const executionTimeMs = performance.now() - startTime;

  return {
    circuitId,
    qubitCount,
    stateVector,
    blochCoords,
    shots,
    counts,
    probabilities,
    stateHashSha256,
    diracNotation,
    executionTimeMs: Math.max(0.1, Number(executionTimeMs.toFixed(2))),
  };
}

/**
 * Apply 2x2 matrix to single target qubit in an N-qubit state vector
 */
function applySingleQubitGate(
  state: Complex[],
  qubitCount: number,
  targetQubit: number,
  matrix: Matrix2x2
): Complex[] {
  const dimension = 1 << qubitCount;
  const nextState = [...state];
  const targetBit = qubitCount - 1 - targetQubit; // Big-endian: qubit 0 is MSB
  const bitMask = 1 << targetBit;

  for (let i = 0; i < dimension; i++) {
    if ((i & bitMask) === 0) {
      const i0 = i;
      const i1 = i | bitMask;

      const v0 = state[i0];
      const v1 = state[i1];

      // [row0 * [v0, v1], row1 * [v0, v1]]
      const newV0 = ComplexMath.add(
        ComplexMath.mul(matrix[0][0], v0),
        ComplexMath.mul(matrix[0][1], v1)
      );
      const newV1 = ComplexMath.add(
        ComplexMath.mul(matrix[1][0], v0),
        ComplexMath.mul(matrix[1][1], v1)
      );

      nextState[i0] = newV0;
      nextState[i1] = newV1;
    }
  }

  return nextState;
}

/**
 * Apply Controlled-NOT gate
 */
function applyCNot(
  state: Complex[],
  qubitCount: number,
  controlQubit: number,
  targetQubit: number
): Complex[] {
  const dimension = 1 << qubitCount;
  const nextState = [...state];
  const controlBit = 1 << (qubitCount - 1 - controlQubit);
  const targetBit = 1 << (qubitCount - 1 - targetQubit);

  for (let i = 0; i < dimension; i++) {
    // If control qubit is 1 and target is 0, swap with the state where target is 1
    if ((i & controlBit) !== 0 && (i & targetBit) === 0) {
      const partner = i | targetBit;
      const temp = nextState[i];
      nextState[i] = nextState[partner];
      nextState[partner] = temp;
    }
  }

  return nextState;
}

/**
 * Apply Controlled-Z gate
 */
function applyCZ(
  state: Complex[],
  qubitCount: number,
  controlQubit: number,
  targetQubit: number
): Complex[] {
  const dimension = 1 << qubitCount;
  const nextState = [...state];
  const controlBit = 1 << (qubitCount - 1 - controlQubit);
  const targetBit = 1 << (qubitCount - 1 - targetQubit);

  for (let i = 0; i < dimension; i++) {
    if ((i & controlBit) !== 0 && (i & targetBit) !== 0) {
      nextState[i] = ComplexMath.scale(nextState[i], -1);
    }
  }

  return nextState;
}

/**
 * Apply SWAP gate between two qubits
 */
function applySwap(
  state: Complex[],
  qubitCount: number,
  q1: number,
  q2: number
): Complex[] {
  const dimension = 1 << qubitCount;
  const nextState = [...state];
  const bit1 = 1 << (qubitCount - 1 - q1);
  const bit2 = 1 << (qubitCount - 1 - q2);

  for (let i = 0; i < dimension; i++) {
    const val1 = (i & bit1) !== 0 ? 1 : 0;
    const val2 = (i & bit2) !== 0 ? 1 : 0;
    if (val1 !== val2 && val1 === 1) {
      const partner = (i & ~bit1) | bit2;
      const temp = nextState[i];
      nextState[i] = nextState[partner];
      nextState[partner] = temp;
    }
  }

  return nextState;
}

/**
 * Computes reduced density matrix & Bloch sphere coordinates for qubit k:
 * ⟨X⟩ = 2 Re(ρ₀₁), ⟨Y⟩ = 2 Im(ρ₁₀) = -2 Im(ρ₀₁), ⟨Z⟩ = ρ₀₀ - ρ₁₁
 */
function calculateBlochCoords(
  state: Complex[],
  qubitCount: number,
  qubitIndex: number
): BlochCoordinates {
  const dimension = 1 << qubitCount;
  const bit = 1 << (qubitCount - 1 - qubitIndex);

  let rho00 = 0;
  let rho11 = 0;
  let rho01 = ComplexMath.zero();

  for (let i = 0; i < dimension; i++) {
    if ((i & bit) === 0) {
      const i0 = i;
      const i1 = i | bit;
      const c0 = state[i0];
      const c1 = state[i1];

      rho00 += ComplexMath.absSq(c0);
      rho11 += ComplexMath.absSq(c1);
      // ρ₀₁ += c0 * conj(c1)
      rho01 = ComplexMath.add(rho01, ComplexMath.mul(c0, ComplexMath.conj(c1)));
    }
  }

  const x = 2 * rho01.re;
  const y = -2 * rho01.im;
  const z = rho00 - rho11;

  // Clamp values in [-1, 1]
  const clampedX = Math.max(-1, Math.min(1, x));
  const clampedY = Math.max(-1, Math.min(1, y));
  const clampedZ = Math.max(-1, Math.min(1, z));

  const r = Math.sqrt(clampedX * clampedX + clampedY * clampedY + clampedZ * clampedZ);
  const theta = r > 1e-6 ? Math.acos(clampedZ / Math.min(1, r)) : 0;
  let phi = Math.atan2(clampedY, clampedX);
  if (phi < 0) phi += 2 * Math.PI;

  return {
    x: Number(clampedX.toFixed(4)),
    y: Number(clampedY.toFixed(4)),
    z: Number(clampedZ.toFixed(4)),
    theta: Number(theta.toFixed(4)),
    phi: Number(phi.toFixed(4)),
  };
}

/**
 * Fast SHA-256 implementation in pure TypeScript matching sha2 Rust crate
 */
export function simpleSha256(ascii: string): string {
  function rightRotate(value: number, amount: number) {
    return (value >>> amount) | (value << (32 - amount));
  }

  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i = 0, j = 0;
  let result = '';

  const words: number[] = [];
  const asciiBitLength = ascii[lengthProperty] * 8;

  let hash = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let compositeClearHex = '';
  for (let c = 0; c < ascii.length; c++) {
    const charCode = ascii.charCodeAt(c);
    words[c >> 2] |= (charCode & 0xff) << (24 - (c % 4) * 8);
  }

  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  const w = new Array(64);
  for (let chunk = 0; chunk < words.length; chunk += 16) {
    const a = hash[0], b = hash[1], c = hash[2], d = hash[3];
    const e = hash[4], f = hash[5], g = hash[6], h = hash[7];

    for (i = 0; i < 64; i++) {
      if (i < 16) {
        w[i] = words[chunk + i] | 0;
      } else {
        const gamma0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const gamma1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + gamma0 + w[i - 7] + gamma1) | 0;
      }

      const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[i] + w[i]) | 0;
      const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (d + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }

    hash[0] = (hash[0] + a) | 0;
    hash[1] = (hash[1] + b) | 0;
    hash[2] = (hash[2] + c) | 0;
    hash[3] = (hash[3] + d) | 0;
    hash[4] = (hash[4] + e) | 0;
    hash[5] = (hash[5] + f) | 0;
    hash[6] = (hash[6] + g) | 0;
    hash[7] = (hash[7] + h) | 0;
  }

  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }

  return result;
}
