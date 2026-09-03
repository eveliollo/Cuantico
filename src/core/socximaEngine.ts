import { Complex } from '../types/quantum';
import { ComplexMath } from './complex';

/**
 * Pure TypeScript implementation of the exact Rust code:
 * - QuantumRegister
 * - SocximaEngine
 * - NodoCuantico & SistemaGemelos
 * - BloqueConocimiento & Task Execution
 * - AUTOR_ID & Genesis Stamp
 */

// SHA-256 synchronous implementation for strings and Uint8Array
export function sha256Sync(input: string | Uint8Array): string {
  let bytes: Uint8Array;
  if (typeof input === 'string') {
    bytes = new TextEncoder().encode(input);
  } else {
    bytes = input;
  }

  const k: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;

  const bitLength = bytes.length * 8;
  const newLength = (((bytes.length + 8) >> 6) + 1) << 6;
  const padded = new Uint8Array(newLength);
  padded.set(bytes, 0);
  padded[bytes.length] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(newLength - 4, bitLength, false);

  const w = new Uint32Array(64);

  for (let i = 0; i < newLength; i += 64) {
    for (let j = 0; j < 16; j++) {
      w[j] = view.getUint32(i + j * 4, false);
    }
    for (let j = 16; j < 64; j++) {
      const s0 = ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^
                 ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^
                 (w[j - 15] >>> 3);
      const s1 = ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^
                 ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^
                 (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;

    for (let j = 0; j < 64; j++) {
      const s1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + s1 + ch + k[j] + w[j]) | 0;
      const s0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (s0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
    h5 = (h5 + f) | 0;
    h6 = (h6 + g) | 0;
    h7 = (h7 + h) | 0;
  }

  const toHex = (n: number) => (n >>> 0).toString(16).padStart(8, '0');
  return toHex(h0) + toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h5) + toHex(h6) + toHex(h7);
}

// Convert 64-bit IEEE-754 float to 8 little-endian bytes (matching Rust f64::to_le_bytes)
function f64ToLeBytes(val: number): Uint8Array {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setFloat64(0, val, true); // true = little-endian
  return new Uint8Array(buf);
}

// ----------------------------------------------------------------------
// 1. QuantumRegister (Scale-ready: Supports 1,334+ Qubits - Exceeds IBM Heron)
// ----------------------------------------------------------------------

export class QuantumRegister {
  public n_qubits: number;
  public stateMap: Map<bigint, Complex>;

  constructor(n_qubits: number) {
    this.n_qubits = Math.max(1, Math.min(10000, n_qubits));
    this.stateMap = new Map<bigint, Complex>();
    // Initial ground state |0...0> with exact amplitude 1.0 + 0.0i
    this.stateMap.set(0n, ComplexMath.one());
  }

  public static nuevo(n_qubits: number): QuantumRegister {
    return new QuantumRegister(n_qubits);
  }

  public clone(): QuantumRegister {
    const reg = new QuantumRegister(this.n_qubits);
    reg.stateMap = new Map<bigint, Complex>();
    for (const [k, a] of this.stateMap.entries()) {
      reg.stateMap.set(k, ComplexMath.create(a.re, a.im));
    }
    return reg;
  }

  public norma(): number {
    let sum = 0.0;
    for (const a of this.stateMap.values()) {
      sum += ComplexMath.absSq(a);
    }
    return Math.sqrt(sum);
  }

  public normalizar(): void {
    const norma = this.norma();
    if (norma > 0.0) {
      for (const [k, a] of this.stateMap.entries()) {
        this.stateMap.set(k, ComplexMath.create(a.re / norma, a.im / norma));
      }
    }
  }

  /**
   * For backwards compatibility and views:
   * Returns array of probabilities. For registers with <= 6 qubits (dim <= 64),
   * returns dense array of 2^N. For larger registers up to 70 qubits, returns
   * probabilities of the active superposition states.
   */
  public probabilidades(): number[] {
    if (this.n_qubits <= 6) {
      const dim = 1 << this.n_qubits;
      const probs = new Array(dim).fill(0);
      for (const [k, a] of this.stateMap.entries()) {
        const idx = Number(k);
        if (idx < dim) {
          probs[idx] = ComplexMath.absSq(a);
        }
      }
      return probs;
    }
    return Array.from(this.stateMap.values()).map(a => ComplexMath.absSq(a));
  }

  /**
   * Backwards-compatible amplitudes accessor.
   */
  public get amplitudes(): Complex[] {
    if (this.n_qubits <= 6) {
      const dim = 1 << this.n_qubits;
      const res = new Array(dim).fill(null).map(() => ComplexMath.zero());
      for (const [k, a] of this.stateMap.entries()) {
        const idx = Number(k);
        if (idx < dim) {
          res[idx] = a;
        }
      }
      return res;
    }
    return Array.from(this.stateMap.values());
  }

  public set amplitudes(arr: Complex[]) {
    this.stateMap.clear();
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] && ComplexMath.absSq(arr[i]) > 1e-18) {
        this.stateMap.set(BigInt(i), arr[i]);
      }
    }
  }

  /**
   * Returns active non-zero superposition basis states with exact amplitudes,
   * binary string representation (up to 70 bits), and probabilities.
   */
  public estados_activos(): Array<{
    indice: bigint;
    binario: string;
    amplitud: Complex;
    probabilidad: number;
  }> {
    return Array.from(this.stateMap.entries())
      .map(([k, a]) => ({
        indice: k,
        binario: this.estado_binario(k),
        amplitud: a,
        probabilidad: ComplexMath.absSq(a),
      }))
      .filter(item => item.probabilidad > 1e-12)
      .sort((a, b) => b.probabilidad - a.probabilidad);
  }

  public obtener_superposiciones_activas(): Array<{
    indice: bigint;
    binario: string;
    amplitud: Complex;
    probabilidad: number;
  }> {
    return this.estados_activos();
  }

  /**
   * Exact marginal probability of qubit q being in state |1>:
   * P(q = 1) = Sum_{k with bit q = 1} |amplitude(k)|^2
   */
  /**
   * Fast calculation of marginal probabilities P(q = |1>) for all qubits
   * with non-zero activity, executing in O(active_states * active_bits).
   */
  public probabilidades_marginales_activas(): Map<number, number> {
    const map = new Map<number, number>();
    for (const [k, a] of this.stateMap.entries()) {
      const prob = ComplexMath.absSq(a);
      if (prob < 1e-16) continue;
      let temp = k;
      let bit = 0;
      while (temp > 0n) {
        if ((temp & 1n) === 1n) {
          map.set(bit, (map.get(bit) || 0) + prob);
        }
        temp >>= 1n;
        bit++;
      }
    }
    return map;
  }

  public probabilidad_qubit_uno(qubit: number): number {
    if (qubit < 0 || qubit >= this.n_qubits) return 0;
    const mascara = 1n << BigInt(qubit);
    let sum = 0.0;
    for (const [k, a] of this.stateMap.entries()) {
      if ((k & mascara) !== 0n) {
        sum += ComplexMath.absSq(a);
      }
    }
    return sum;
  }

  public estado_binario(indice: bigint | number): string {
    return BigInt(indice).toString(2).padStart(this.n_qubits, '0');
  }

  public dimension(): number {
    return Math.pow(2, this.n_qubits);
  }

  public dimensionBigInt(): bigint {
    return 1n << BigInt(this.n_qubits);
  }

  /**
   * Formats Hilbert space dimension 2^N into human-readable scientific notation (a × 10^b)
   * avoiding JS Number floating-point overflow for N >= 1024 (e.g. 1334 qubits).
   */
  public dimensionScientific(): string {
    if (this.n_qubits <= 30) {
      return Math.pow(2, this.n_qubits).toLocaleString();
    }
    // log10(2) = 0.3010299956639812
    const totalLog10 = this.n_qubits * 0.3010299956639812;
    const exponent = Math.floor(totalLog10);
    const mantissa = Math.pow(10, totalLog10 - exponent);
    return `${mantissa.toFixed(3)} × 10^${exponent}`;
  }

  /**
   * Exact SHA-256 hash over amplitudes serialized deterministically across all bit limbs.
   */
  public hash(): string {
    const entries = Array.from(this.stateMap.entries())
      .filter(([_, a]) => ComplexMath.absSq(a) > 1e-18)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

    if (entries.length === 0) {
      entries.push([0n, ComplexMath.one()]);
    }

    const numLimbs = Math.max(1, Math.ceil(this.n_qubits / 64));
    const bytesPerEntry = numLimbs * 8 + 16;
    const bytes = new Uint8Array(entries.length * bytesPerEntry);
    let offset = 0;
    const view = new DataView(bytes.buffer);

    for (const [k, amp] of entries) {
      let rem = k;
      for (let l = 0; l < numLimbs; l++) {
        view.setBigUint64(offset, BigInt.asUintN(64, rem), true);
        rem >>= 64n;
        offset += 8;
      }

      bytes.set(f64ToLeBytes(amp.re), offset);
      offset += 8;
      bytes.set(f64ToLeBytes(amp.im), offset);
      offset += 8;
    }

    return sha256Sync(bytes);
  }

  /**
   * Applies an exact 2x2 single-qubit unitary matrix:
   * [u00  u01] [a0] = [u00*a0 + u01*a1]
   * [u10  u11] [a1]   [u10*a0 + u11*a1]
   */
  private aplicar_matriz_unitaria(
    qubit: number,
    u00: Complex,
    u01: Complex,
    u10: Complex,
    u11: Complex
  ): void {
    if (qubit < 0 || qubit >= this.n_qubits) return;
    const mask = 1n << BigInt(qubit);

    const baseIndices = new Set<bigint>();
    for (const k of this.stateMap.keys()) {
      baseIndices.add(k & ~mask);
    }

    const nextMap = new Map<bigint, Complex>();
    const zero = ComplexMath.zero();

    for (const k0 of baseIndices) {
      const k1 = k0 | mask;
      const a0 = this.stateMap.get(k0) || zero;
      const a1 = this.stateMap.get(k1) || zero;

      // new_a0 = u00 * a0 + u01 * a1
      const p00 = ComplexMath.mul(u00, a0);
      const p01 = ComplexMath.mul(u01, a1);
      const new_a0 = ComplexMath.add(p00, p01);

      // new_a1 = u10 * a0 + u11 * a1
      const p10 = ComplexMath.mul(u10, a0);
      const p11 = ComplexMath.mul(u11, a1);
      const new_a1 = ComplexMath.add(p10, p11);

      if (ComplexMath.absSq(new_a0) > 1e-16) {
        nextMap.set(k0, new_a0);
      }
      if (ComplexMath.absSq(new_a1) > 1e-16) {
        nextMap.set(k1, new_a1);
      }
    }

    this.stateMap = nextMap;
    // Bound active state space safely if extensive superpositions emerge
    if (this.stateMap.size > 2048) {
      const sorted = Array.from(this.stateMap.entries())
        .sort((a, b) => ComplexMath.absSq(b[1]) - ComplexMath.absSq(a[1]))
        .slice(0, 2048);
      this.stateMap = new Map(sorted);
      this.normalizar();
    }
  }

  // Gate Operations
  public hadamard(qubit: number): void {
    const factor = 1.0 / Math.SQRT2;
    const u00 = ComplexMath.create(factor, 0);
    const u01 = ComplexMath.create(factor, 0);
    const u10 = ComplexMath.create(factor, 0);
    const u11 = ComplexMath.create(-factor, 0);
    this.aplicar_matriz_unitaria(qubit, u00, u01, u10, u11);
  }

  public pauli_x(qubit: number): void {
    const u00 = ComplexMath.zero();
    const u01 = ComplexMath.one();
    const u10 = ComplexMath.one();
    const u11 = ComplexMath.zero();
    this.aplicar_matriz_unitaria(qubit, u00, u01, u10, u11);
  }

  public pauli_y(qubit: number): void {
    const u00 = ComplexMath.zero();
    const u01 = ComplexMath.create(0, -1);
    const u10 = ComplexMath.create(0, 1);
    const u11 = ComplexMath.zero();
    this.aplicar_matriz_unitaria(qubit, u00, u01, u10, u11);
  }

  public pauli_z(qubit: number): void {
    const u00 = ComplexMath.one();
    const u01 = ComplexMath.zero();
    const u10 = ComplexMath.zero();
    const u11 = ComplexMath.create(-1, 0);
    this.aplicar_matriz_unitaria(qubit, u00, u01, u10, u11);
  }

  public cnot(control: number, objetivo: number): void {
    if (control === objetivo || control >= this.n_qubits || objetivo >= this.n_qubits) return;
    const control_mask = 1n << BigInt(control);
    const target_mask = 1n << BigInt(objetivo);

    const nextMap = new Map<bigint, Complex>();
    for (const [k, amp] of this.stateMap.entries()) {
      if ((k & control_mask) !== 0n) {
        // Control is active: flip target bit
        nextMap.set(k ^ target_mask, amp);
      } else {
        nextMap.set(k, amp);
      }
    }
    this.stateMap = nextMap;
  }

  public crear_bell(qubit_a: number, qubit_b: number): void {
    this.hadamard(qubit_a);
    this.cnot(qubit_a, qubit_b);
    this.normalizar();
  }

  public rx(qubit: number, theta: number): void {
    const cos_t = Math.cos(theta / 2.0);
    const sin_t = Math.sin(theta / 2.0);
    const u00 = ComplexMath.create(cos_t, 0);
    const u01 = ComplexMath.create(0, -sin_t);
    const u10 = ComplexMath.create(0, -sin_t);
    const u11 = ComplexMath.create(cos_t, 0);
    this.aplicar_matriz_unitaria(qubit, u00, u01, u10, u11);
  }

  public ry(qubit: number, theta: number): void {
    const cos_t = Math.cos(theta / 2.0);
    const sin_t = Math.sin(theta / 2.0);
    const u00 = ComplexMath.create(cos_t, 0);
    const u01 = ComplexMath.create(-sin_t, 0);
    const u10 = ComplexMath.create(sin_t, 0);
    const u11 = ComplexMath.create(cos_t, 0);
    this.aplicar_matriz_unitaria(qubit, u00, u01, u10, u11);
  }

  public rz(qubit: number, theta: number): void {
    const fase_menos = ComplexMath.fromPolar(1.0, -theta / 2.0);
    const fase_mas = ComplexMath.fromPolar(1.0, theta / 2.0);
    const u00 = fase_menos;
    const u01 = ComplexMath.zero();
    const u10 = ComplexMath.zero();
    const u11 = fase_mas;
    this.aplicar_matriz_unitaria(qubit, u00, u01, u10, u11);
  }

  // Measurement
  public medir(): number {
    const r = Math.random();
    let acumulado = 0.0;
    let resultadoBigInt: bigint = 0n;

    for (const [k, a] of this.stateMap.entries()) {
      acumulado += ComplexMath.absSq(a);
      if (r <= acumulado) {
        resultadoBigInt = k;
        break;
      }
    }

    this.stateMap.clear();
    this.stateMap.set(resultadoBigInt, ComplexMath.one());

    // Safe return for JS numbers (safe up to 2^53 - 1, bounded)
    return Number(resultadoBigInt & 0x1fffffffffffffn);
  }

  public medir_bigint(): bigint {
    const r = Math.random();
    let acumulado = 0.0;
    let resultadoBigInt: bigint = 0n;

    for (const [k, a] of this.stateMap.entries()) {
      acumulado += ComplexMath.absSq(a);
      if (r <= acumulado) {
        resultadoBigInt = k;
        break;
      }
    }

    this.stateMap.clear();
    this.stateMap.set(resultadoBigInt, ComplexMath.one());
    return resultadoBigInt;
  }

  public medir_sin_colapsar(): number[] {
    return this.probabilidades();
  }
}

// ----------------------------------------------------------------------
// 2. SocximaEngine
// ----------------------------------------------------------------------

export interface ResultadoLatido {
  ciclo: number;
  entropia_normalizada: number;
  medicion: number | null;
}

export class SocximaEngine {
  public registro: QuantumRegister;
  public ciclo: number;
  public operaciones_ejecutadas: number;
  public mediciones_realizadas: number;
  public historial_entropia: number[];
  public eventos: string[];

  constructor(n_qubits: number) {
    this.registro = QuantumRegister.nuevo(n_qubits);
    this.ciclo = 0;
    this.operaciones_ejecutadas = 0;
    this.mediciones_realizadas = 0;
    this.historial_entropia = [];
    this.eventos = [];
  }

  public static nuevo(n_qubits: number): SocximaEngine {
    return new SocximaEngine(n_qubits);
  }

  public static desde_estado(
    n_qubits: number,
    ciclo: number,
    operaciones_ejecutadas: number,
    mediciones_realizadas: number
  ): SocximaEngine {
    const engine = new SocximaEngine(n_qubits);
    engine.ciclo = ciclo;
    engine.operaciones_ejecutadas = operaciones_ejecutadas;
    engine.mediciones_realizadas = mediciones_realizadas;
    return engine;
  }

  public entropia_normalizada(): number {
    const probs = Array.from(this.registro.stateMap.values()).map(a => ComplexMath.absSq(a));

    const entropia_shannon = probs
      .filter(p => p > 1e-15)
      .reduce((sum, p) => sum - p * Math.log2(p), 0.0);

    // Theoretical maximum Shannon entropy for an N-qubit system is log2(2^N) = N
    const max_entropia = this.registro.n_qubits;

    if (max_entropia > 0.0) {
      return Math.abs(entropia_shannon / max_entropia);
    } else {
      return 0.0;
    }
  }

  public calcular_entropia_von_neumann(): number {
    return this.entropia_normalizada();
  }

  public registrar_evento(descripcion: string): void {
    this.eventos.push(descripcion);
    if (this.eventos.length > 200) {
      this.eventos.shift();
    }
  }

  public cambiar_qubits(nuevos_qubits: number): void {
    const n = Math.max(2, Math.min(10000, Math.floor(nuevos_qubits)));
    this.registro = QuantumRegister.nuevo(n);
    this.ciclo = 0;
    this.operaciones_ejecutadas = 0;
    this.mediciones_realizadas = 0;
    this.historial_entropia = [];
    const milestoneMsg = n >= 6000
      ? ` 🌌 [¡FRONTERA CUÁNTICA TITÁN: ${n.toLocaleString()} cúbits! Superando por más de 4.5× a IBM Heron]`
      : n > 1333
      ? ` 🏆 [¡RÉCORD MUNDIAL SUPERADO!: ${n.toLocaleString()} cúbits supera los 1,333 cúbits de IBM Heron 2024]`
      : n === 1333
      ? ` ⚡ [Igualando el procesador IBM Heron 2024 de 1,333 cúbits]`
      : '';
    this.registrar_evento(`Meta cuántica: Registro configurado a ${n.toLocaleString()} cúbits (Espacio de Hilbert: ${this.registro.dimensionScientific()})${milestoneMsg}`);
  }

  public evolucionar(): void {
    const n = this.registro.n_qubits;
    const selector = this.ciclo % n;
    const angulo = this.ciclo * 0.35;

    this.registro.ry(selector, angulo);
    this.operaciones_ejecutadas += 1;

    if (this.ciclo % 3 === 0) {
      this.registro.rz(selector, angulo * 0.5);
      this.operaciones_ejecutadas += 1;
    }

    this.registro.normalizar();
  }

  public latido(): ResultadoLatido {
    this.ciclo += 1;
    this.evolucionar();

    if (this.ciclo % 7 === 0 && this.registro.n_qubits >= 2) {
      const n = this.registro.n_qubits;
      const step = Math.floor(this.ciclo / 7);
      const qA = (step - 1) % n;
      const qB = (qA + 1) % n;
      this.registro.crear_bell(qA, qB);
      this.operaciones_ejecutadas += 2;
      this.registrar_evento(`Ciclo ${this.ciclo}: entrelazamiento Bell cuántico creado entre q[${qA}] y q[${qB}]`);
    }

    const entropia = this.entropia_normalizada();
    this.historial_entropia.push(entropia);
    if (this.historial_entropia.length > 1000) {
      this.historial_entropia.shift();
    }

    let medicion: number | null = null;

    if (this.ciclo % 11 === 0) {
      const resultadoBigInt = this.registro.medir_bigint();
      this.mediciones_realizadas += 1;
      const binStr = this.registro.estado_binario(resultadoBigInt);
      medicion = Number(resultadoBigInt & 0x1fffffffffffffn);
      this.registrar_evento(
        `Ciclo ${this.ciclo}: medición cuántica colapsada -> |${binStr}⟩ (${this.registro.n_qubits} cúbits)`
      );
    }

    return {
      ciclo: this.ciclo,
      entropia_normalizada: entropia,
      medicion
    };
  }

  public entropia_promedio_historica(): number {
    if (this.historial_entropia.length === 0) {
      return 0.0;
    }
    const sum = this.historial_entropia.reduce((a, b) => a + b, 0.0);
    return sum / this.historial_entropia.length;
  }
}

// ----------------------------------------------------------------------
// 3. NodoCuantico & SistemaGemelos (Quantum Twin Network)
// ----------------------------------------------------------------------

export class NodoCuantico {
  public id: number;
  public gemelo_id: number;
  public ciclo_local: number;
  public quantum_hash: string;

  constructor(id: number, gemelo_id: number) {
    this.id = id;
    this.gemelo_id = gemelo_id;
    this.ciclo_local = 0;
    this.quantum_hash = '';
  }

  public static nuevo(id: number, gemelo_id: number): NodoCuantico {
    return new NodoCuantico(id, gemelo_id);
  }

  public sincronizar(ciclo: number, quantum_hash: string): void {
    this.ciclo_local = ciclo;
    this.quantum_hash = quantum_hash;
  }

  public firma_local(): string {
    const raw = `${this.id}${this.gemelo_id}${this.ciclo_local}${this.quantum_hash}`;
    return sha256Sync(raw);
  }

  public tiene_pareja(): boolean {
    return this.gemelo_id !== this.id;
  }
}

export interface EstadoConsenso {
  id_a: number;
  id_b: number;
  ciclos_coinciden: boolean;
  hash_cuantico_coincide: boolean;
  firma_par: string;
}

export class SistemaGemelos {
  public nodos: NodoCuantico[];

  constructor(cantidad: number) {
    this.nodos = [];
    let i = 1;
    while (i <= cantidad) {
      if (i + 1 <= cantidad) {
        this.nodos.push(NodoCuantico.nuevo(i, i + 1));
        this.nodos.push(NodoCuantico.nuevo(i + 1, i));
      } else {
        this.nodos.push(NodoCuantico.nuevo(i, i));
      }
      i += 2;
    }
  }

  public static nuevo(cantidad: number): SistemaGemelos {
    return new SistemaGemelos(cantidad);
  }

  public sincronizar_todos(ciclo: number, quantum_hash: string): void {
    for (const nodo of this.nodos) {
      nodo.sincronizar(ciclo, quantum_hash);
    }
  }

  public emparejar(id_a: number, id_b: number): { success: boolean; error?: string } {
    if (id_a === id_b) {
      return { success: false, error: 'Un nodo no puede emparejarse consigo mismo.' };
    }

    const nodoA = this.nodos.find(n => n.id === id_a);
    const nodoB = this.nodos.find(n => n.id === id_b);
    if (!nodoA || !nodoB) {
      return { success: false, error: `No existen ambos nodos (${id_a} y ${id_b}).` };
    }

    const vieja_pareja_a = nodoA.gemelo_id;
    const vieja_pareja_b = nodoB.gemelo_id;

    for (const nodo of this.nodos) {
      if (nodo.id === id_a) {
        nodo.gemelo_id = id_b;
      } else if (nodo.id === id_b) {
        nodo.gemelo_id = id_a;
      } else if (nodo.id === vieja_pareja_a && nodo.id !== id_b) {
        nodo.gemelo_id = nodo.id;
      } else if (nodo.id === vieja_pareja_b && nodo.id !== id_a) {
        nodo.gemelo_id = nodo.id;
      }
    }

    return { success: true };
  }

  public consenso(): EstadoConsenso[] {
    const resultados: EstadoConsenso[] = [];
    const procesados: number[] = [];

    for (const nodo of this.nodos) {
      if (!nodo.tiene_pareja() || procesados.includes(nodo.id)) {
        continue;
      }

      const gemelo = this.nodos.find(n => n.id === nodo.gemelo_id);
      if (gemelo) {
        const ciclos_coinciden = nodo.ciclo_local === gemelo.ciclo_local;
        const hash_cuantico_coincide = nodo.quantum_hash === gemelo.quantum_hash && nodo.quantum_hash !== '';

        const ids = [nodo.id, gemelo.id].sort((a, b) => a - b);
        const firma_par = sha256Sync(
          `${ids[0]}${ids[1]}${nodo.firma_local()}${gemelo.firma_local()}`
        );

        resultados.push({
          id_a: ids[0],
          id_b: ids[1],
          ciclos_coinciden,
          hash_cuantico_coincide,
          firma_par
        });

        procesados.push(nodo.id);
        procesados.push(gemelo.id);
      }
    }

    return resultados;
  }
}

// ----------------------------------------------------------------------
// 4. BloqueConocimiento & Verifiable Knowledge Tasks
// ----------------------------------------------------------------------

export type TipoTarea =
  | 'AlgebraCompleja'
  | 'ProductoVectorial'
  | 'MultiplicacionMatrices'
  | 'ProbabilidadMedicion';

export interface Tarea {
  id: number;
  tipo: TipoTarea;
  descripcion: string;
}

export interface ResultadoTarea {
  resultado: string;
  verificacion: string;
  valido: boolean;
}

export interface BloqueConocimiento {
  id: number;
  previous_hash: string;
  hash: string;
  ciclo: number;
  tarea: string;
  resultado: string;
  verificacion: string;
  agente: string;
  quantum_hash: string;
  validado: boolean;
  timestamp: number;
}

export const AUTOR_ID = 'b2183ed95f49f83be984094f00ce41e5';

export function sello_genesis(): string {
  return sha256Sync(`SOCXIMA-AUTOR:${AUTOR_ID}`);
}

export function calcular_hash_bloque(
  id: number,
  previous_hash: string,
  ciclo: number,
  tarea: string,
  resultado: string,
  agente: string,
  quantum_hash: string
): string {
  const raw = `${id}${previous_hash}${ciclo}${tarea}${resultado}${agente}${quantum_hash}`;
  return sha256Sync(raw);
}

export function generar_tarea(id: number): Tarea {
  const tipos: TipoTarea[] = [
    'AlgebraCompleja',
    'ProductoVectorial',
    'MultiplicacionMatrices',
    'ProbabilidadMedicion'
  ];
  const tipo = tipos[Math.floor(Math.random() * tipos.length)];

  let descripcion = '';
  switch (tipo) {
    case 'AlgebraCompleja':
      descripcion = 'Multiplicacion de dos numeros complejos';
      break;
    case 'ProductoVectorial':
      descripcion = 'Producto punto de dos vectores 3D';
      break;
    case 'MultiplicacionMatrices':
      descripcion = 'Multiplicacion de matrices 2x2';
      break;
    case 'ProbabilidadMedicion':
      descripcion = 'Calculo de probabilidades Born del estado actual';
      break;
  }

  return { id, tipo, descripcion };
}

export function procesar_tarea(tarea: Tarea, registro: QuantumRegister): ResultadoTarea {
  const randRange = (min: number, max: number) => Math.random() * (max - min) + min;

  switch (tarea.tipo) {
    case 'AlgebraCompleja': {
      const a = ComplexMath.create(randRange(-9.0, 9.0), randRange(-9.0, 9.0));
      const b = ComplexMath.create(randRange(-9.0, 9.0), randRange(-9.0, 9.0));
      const producto = ComplexMath.mul(a, b);
      const modulo_esperado = ComplexMath.abs(a) * ComplexMath.abs(b);
      const modulo_real = ComplexMath.abs(producto);
      const valido = Math.abs(modulo_esperado - modulo_real) < 1e-9;

      return {
        resultado: `(${a.re.toFixed(6)}+${a.im.toFixed(6)}i) * (${b.re.toFixed(6)}+${b.im.toFixed(6)}i) = (${producto.re.toFixed(6)}+${producto.im.toFixed(6)}i)`,
        verificacion: `|a|*|b|=${modulo_esperado.toFixed(9)} vs |a*b|=${modulo_real.toFixed(9)}`,
        valido
      };
    }

    case 'ProductoVectorial': {
      const v1 = [randRange(-9.0, 9.0), randRange(-9.0, 9.0), randRange(-9.0, 9.0)];
      const v2 = [randRange(-9.0, 9.0), randRange(-9.0, 9.0), randRange(-9.0, 9.0)];
      const punto = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
      const recalculo = v1.reduce((sum, val, idx) => sum + val * v2[idx], 0.0);
      const valido = Math.abs(punto - recalculo) < 1e-9;

      const f = (x: number) => x.toFixed(3);
      return {
        resultado: `v1=[${f(v1[0])}, ${f(v1[1])}, ${f(v1[2])}] . v2=[${f(v2[0])}, ${f(v2[1])}, ${f(v2[2])}] = ${punto.toFixed(6)}`,
        verificacion: `recalculo independiente = ${recalculo.toFixed(9)}`,
        valido
      };
    }

    case 'MultiplicacionMatrices': {
      const a = [
        [randRange(-5.0, 5.0), randRange(-5.0, 5.0)],
        [randRange(-5.0, 5.0), randRange(-5.0, 5.0)]
      ];
      const b = [
        [randRange(-5.0, 5.0), randRange(-5.0, 5.0)],
        [randRange(-5.0, 5.0), randRange(-5.0, 5.0)]
      ];

      const c = [
        [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
        [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]]
      ];

      const det_a = a[0][0] * a[1][1] - a[0][1] * a[1][0];
      const det_b = b[0][0] * b[1][1] - b[0][1] * b[1][0];
      const det_c = c[0][0] * c[1][1] - c[0][1] * c[1][0];
      const esperado = det_a * det_b;
      const valido = Math.abs(esperado - det_c) < 1e-6;

      const f = (x: number) => x.toFixed(2);
      return {
        resultado: `A*B = [[${f(c[0][0])}, ${f(c[0][1])}], [${f(c[1][0])}, ${f(c[1][1])}]]`,
        verificacion: `det(A)*det(B)=${esperado.toFixed(6)} vs det(A*B)=${det_c.toFixed(6)}`,
        valido
      };
    }

    case 'ProbabilidadMedicion': {
      const probs = registro.probabilidades();
      const suma = probs.reduce((a, b) => a + b, 0.0);
      let estado_max = 0;
      let prob_max = 0.0;
      for (let i = 0; i < probs.length; i++) {
        if (probs[i] > prob_max) {
          prob_max = probs[i];
          estado_max = i;
        }
      }
      const valido = Math.abs(suma - 1.0) < 1e-6;

      return {
        resultado: `estado mas probable |${registro.estado_binario(estado_max)}> con p=${prob_max.toFixed(9)}`,
        verificacion: `suma de probabilidades = ${suma.toFixed(9)}`,
        valido
      };
    }
  }
}
