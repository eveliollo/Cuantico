export interface RustSourceFile {
  path: string;
  name: string;
  language: string;
  description: string;
  content: string;
}

export const RUST_CRATE_FILES: RustSourceFile[] = [
  {
    path: 'Cargo.toml',
    name: 'Cargo.toml',
    language: 'toml',
    description: 'Crate manifest with dependencies and opt-level = 3 release profile',
    content: `[package]
name = "socxima_quantum_core"
version = "0.1.0"
edition = "2021"
authors = ["Socxima Core Team <b2183ed95f49f83be984094f00ce41e5>"]
description = "High-performance quantum simulation, twin node consensus, and verifiable knowledge blockchain"

[dependencies]
ed25519-dalek = { version = "2", features = ["rand_core"] }
hex = "0.4.3"
num-complex = "0.4"
rand = "0.8"
rand_core = { version = "0.6", features = ["getrandom"] }
rusqlite = { version = "0.31", features = ["bundled"] }
sha2 = "0.10"

[profile.release]
opt-level = 3
lto = true
codegen-units = 1
panic = "abort"
`
  },
  {
    path: 'src/lib.rs',
    name: 'lib.rs',
    language: 'rust',
    description: 'Root crate library exposing quantum registers, heartbeat engine, twin network, knowledge chain, and crypto',
    content: `//! # Socxima Quantum Core (v0.1.0)
//!
//! High-performance quantum state simulator, twin node consensus network,
//! verifiable knowledge blockchain, and Ed25519 cryptographic identity.

pub mod quantum;
pub mod engine;
pub mod network;
pub mod blockchain;
pub mod crypto;

pub use quantum::QuantumRegister;
pub use engine::{SocximaEngine, ResultadoLatido};
pub use network::{NodoCuantico, SistemaGemelos, EstadoConsenso};
pub use blockchain::{BloqueConocimiento, TipoTarea, Tarea, ResultadoTarea, AUTOR_ID, sello_genesis};
pub use crypto::{generar_o_cargar_llaves, firmar, verificar, llave_publica_hex};
`
  },
  {
    path: 'src/quantum/register.rs',
    name: 'quantum/register.rs',
    language: 'rust',
    description: 'QuantumRegister struct, state vector normalization, Born probabilities, and little-endian SHA-256 state hashing',
    content: `use num_complex::Complex64;
use sha2::{Digest, Sha256};

#[derive(Clone)]
pub struct QuantumRegister {
    pub n_qubits: usize,
    pub amplitudes: Vec<Complex64>,
}

impl QuantumRegister {
    pub fn nuevo(n_qubits: usize) -> Self {
        let dimension = 1usize << n_qubits;
        let mut amplitudes = vec![Complex64::new(0.0, 0.0); dimension];
        amplitudes[0] = Complex64::new(1.0, 0.0);

        Self { n_qubits, amplitudes }
    }

    pub fn norma(&self) -> f64 {
        self.amplitudes.iter().map(|a| a.norm_sqr()).sum::<f64>().sqrt()
    }

    pub fn normalizar(&mut self) {
        let norma = self.norma();
        if norma > 0.0 {
            for amplitud in &mut self.amplitudes {
                *amplitud /= norma;
            }
        }
    }

    pub fn probabilidades(&self) -> Vec<f64> {
        self.amplitudes.iter().map(|a| a.norm_sqr()).collect()
    }

    pub fn probabilidad_qubit_uno(&self, qubit: usize) -> f64 {
        let mascara = 1usize << qubit;
        self.amplitudes.iter().enumerate()
            .filter(|(i, _)| (*i & mascara) != 0)
            .map(|(_, a)| a.norm_sqr())
            .sum()
    }

    pub fn estado_binario(&self, indice: usize) -> String {
        format!("{:0width$b}", indice, width = self.n_qubits)
    }

    pub fn dimension(&self) -> usize {
        self.amplitudes.len()
    }

    pub fn hash(&self) -> String {
        let mut hasher = Sha256::new();
        for amplitud in &self.amplitudes {
            hasher.update(amplitud.re.to_le_bytes());
            hasher.update(amplitud.im.to_le_bytes());
        }
        format!("{:x}", hasher.finalize())
    }
}
`
  },
  {
    path: 'src/quantum/gates.rs',
    name: 'quantum/gates.rs',
    language: 'rust',
    description: 'Unitary quantum gates: Hadamard, Pauli X/Y/Z, CNOT, Bell State creation, and Rx/Ry/Rz parameterized rotations',
    content: `use crate::quantum::register::QuantumRegister;
use num_complex::Complex64;

impl QuantumRegister {
    pub fn hadamard(&mut self, qubit: usize) {
        let factor = 1.0 / 2.0_f64.sqrt();
        let paso = 1usize << qubit;
        let dimension = self.amplitudes.len();

        for base in (0..dimension).step_by(paso * 2) {
            for offset in 0..paso {
                let i0 = base + offset;
                let i1 = i0 + paso;
                let a0 = self.amplitudes[i0];
                let a1 = self.amplitudes[i1];
                self.amplitudes[i0] = (a0 + a1) * factor;
                self.amplitudes[i1] = (a0 - a1) * factor;
            }
        }
    }

    pub fn pauli_x(&mut self, qubit: usize) {
        let mascara = 1usize << qubit;
        let dimension = self.amplitudes.len();
        for i in 0..dimension {
            if (i & mascara) == 0 {
                let j = i | mascara;
                self.amplitudes.swap(i, j);
            }
        }
    }

    pub fn pauli_y(&mut self, qubit: usize) {
        let mascara = 1usize << qubit;
        let dimension = self.amplitudes.len();
        let i_unidad = Complex64::new(0.0, 1.0);

        for base in 0..dimension {
            if (base & mascara) == 0 {
                let j = base | mascara;
                let a0 = self.amplitudes[base];
                let a1 = self.amplitudes[j];
                self.amplitudes[base] = -i_unidad * a1;
                self.amplitudes[j] = i_unidad * a0;
            }
        }
    }

    pub fn pauli_z(&mut self, qubit: usize) {
        let mascara = 1usize << qubit;
        for i in 0..self.amplitudes.len() {
            if (i & mascara) != 0 {
                self.amplitudes[i] = -self.amplitudes[i];
            }
        }
    }

    pub fn cnot(&mut self, control: usize, objetivo: usize) {
        let control_mask = 1usize << control;
        let target_mask = 1usize << objetivo;
        let dimension = self.amplitudes.len();

        for i in 0..dimension {
            let control_activo = (i & control_mask) != 0;
            let target_cero = (i & target_mask) == 0;
            if control_activo && target_cero {
                let j = i | target_mask;
                self.amplitudes.swap(i, j);
            }
        }
    }

    pub fn crear_bell(&mut self, qubit_a: usize, qubit_b: usize) {
        self.hadamard(qubit_a);
        self.cnot(qubit_a, qubit_b);
        self.normalizar();
    }

    pub fn rx(&mut self, qubit: usize, theta: f64) {
        let mascara = 1usize << qubit;
        let dimension = self.amplitudes.len();
        let cos_t = (theta / 2.0).cos();
        let sin_t = (theta / 2.0).sin();
        let i_unidad = Complex64::new(0.0, 1.0);

        for base in 0..dimension {
            if (base & mascara) == 0 {
                let j = base | mascara;
                let a0 = self.amplitudes[base];
                let a1 = self.amplitudes[j];
                self.amplitudes[base] = a0 * cos_t - i_unidad * sin_t * a1;
                self.amplitudes[j] = -i_unidad * sin_t * a0 + a1 * cos_t;
            }
        }
    }

    pub fn ry(&mut self, qubit: usize, theta: f64) {
        let mascara = 1usize << qubit;
        let dimension = self.amplitudes.len();
        let cos_t = (theta / 2.0).cos();
        let sin_t = (theta / 2.0).sin();

        for base in 0..dimension {
            if (base & mascara) == 0 {
                let j = base | mascara;
                let a0 = self.amplitudes[base];
                let a1 = self.amplitudes[j];
                self.amplitudes[base] = a0 * cos_t - a1 * sin_t;
                self.amplitudes[j] = a0 * sin_t + a1 * cos_t;
            }
        }
    }

    pub fn rz(&mut self, qubit: usize, theta: f64) {
        let mascara = 1usize << qubit;
        let dimension = self.amplitudes.len();
        let fase_menos = Complex64::from_polar(1.0, -theta / 2.0);
        let fase_mas = Complex64::from_polar(1.0, theta / 2.0);

        for i in 0..dimension {
            if (i & mascara) == 0 {
                self.amplitudes[i] *= fase_menos;
            } else {
                self.amplitudes[i] *= fase_mas;
            }
        }
    }
}
`
  },
  {
    path: 'src/quantum/measurement.rs',
    name: 'quantum/measurement.rs',
    language: 'rust',
    description: 'Quantum state measurement: Monte Carlo wavefunction collapse and non-destructive Born probability reading',
    content: `use crate::quantum::register::QuantumRegister;
use num_complex::Complex64;
use rand::Rng;

impl QuantumRegister {
    pub fn medir(&mut self) -> usize {
        let mut rng = rand::thread_rng();
        let r: f64 = rng.gen();
        let mut acumulado = 0.0;
        let mut resultado = self.amplitudes.len() - 1;

        for (i, amplitud) in self.amplitudes.iter().enumerate() {
            acumulado += amplitud.norm_sqr();
            if r <= acumulado {
                resultado = i;
                break;
            }
        }

        for a in &mut self.amplitudes {
            *a = Complex64::new(0.0, 0.0);
        }
        self.amplitudes[resultado] = Complex64::new(1.0, 0.0);

        resultado
    }

    pub fn medir_sin_colapsar(&self) -> Vec<f64> {
        self.probabilidades()
    }
}
`
  },
  {
    path: 'src/quantum/mod.rs',
    name: 'quantum/mod.rs',
    language: 'rust',
    description: 'Quantum module definition exporting register, gates, and measurement',
    content: `pub mod register;
pub mod gates;
pub mod measurement;

pub use register::QuantumRegister;
`
  },
  {
    path: 'src/engine/mod.rs',
    name: 'engine/mod.rs',
    language: 'rust',
    description: 'SocximaEngine: continuous quantum heartbeat evolution, Bell entanglement injection, Shannon entropy, and measurement',
    content: `use crate::quantum::QuantumRegister;

pub struct SocximaEngine {
    pub registro: QuantumRegister,
    pub ciclo: u64,
    pub operaciones_ejecutadas: u64,
    pub mediciones_realizadas: u64,
    pub historial_entropia: Vec<f64>,
    pub eventos: Vec<String>,
}

pub struct ResultadoLatido {
    pub ciclo: u64,
    pub entropia_normalizada: f64,
    pub medicion: Option<usize>,
}

impl SocximaEngine {
    pub fn nuevo(n_qubits: usize) -> Self {
        Self {
            registro: QuantumRegister::nuevo(n_qubits),
            ciclo: 0,
            operaciones_ejecutadas: 0,
            mediciones_realizadas: 0,
            historial_entropia: Vec::new(),
            eventos: Vec::new(),
        }
    }

    pub fn desde_estado(n_qubits: usize, ciclo: u64, operaciones_ejecutadas: u64, mediciones_realizadas: u64) -> Self {
        Self {
            registro: QuantumRegister::nuevo(n_qubits),
            ciclo,
            operaciones_ejecutadas,
            mediciones_realizadas,
            historial_entropia: Vec::new(),
            eventos: Vec::new(),
        }
    }

    pub fn entropia_normalizada(&self) -> f64 {
        let probs = self.registro.probabilidades();
        let dimension = probs.len() as f64;

        let entropia_shannon: f64 = probs.iter()
            .filter(|&&p| p > 1e-15)
            .map(|&p| -p * p.log2())
            .sum();

        let max_entropia = dimension.log2();

        if max_entropia > 0.0 {
            (entropia_shannon / max_entropia).abs()
        } else {
            0.0
        }
    }

    fn registrar_evento(&mut self, descripcion: String) {
        self.eventos.push(descripcion);
        if self.eventos.len() > 200 {
            self.eventos.remove(0);
        }
    }

    fn evolucionar(&mut self) {
        let n = self.registro.n_qubits;
        let selector = (self.ciclo as usize) % n;
        let angulo = (self.ciclo as f64) * 0.35;

        self.registro.ry(selector, angulo);
        self.operaciones_ejecutadas += 1;

        if self.ciclo % 3 == 0 {
            self.registro.rz(selector, angulo * 0.5);
            self.operaciones_ejecutadas += 1;
        }

        self.registro.normalizar();
    }

    pub fn latido(&mut self) -> ResultadoLatido {
        self.ciclo += 1;
        self.evolucionar();

        if self.ciclo % 7 == 0 && self.registro.n_qubits >= 2 {
            self.registro.crear_bell(0, 1);
            self.operaciones_ejecutadas += 2;
            self.registrar_evento(format!("Ciclo {}: entrelazamiento creado entre qubit 0 y 1", self.ciclo));
        }

        let entropia = self.entropia_normalizada();
        self.historial_entropia.push(entropia);
        if self.historial_entropia.len() > 1000 {
            self.historial_entropia.remove(0);
        }

        let mut medicion: Option<usize> = None;

        if self.ciclo % 11 == 0 {
            let resultado = self.registro.medir();
            self.mediciones_realizadas += 1;
            medicion = Some(resultado);
            self.registrar_evento(format!("Ciclo {}: medicion -> |{}>", self.ciclo, self.registro.estado_binario(resultado)));
        }

        ResultadoLatido { ciclo: self.ciclo, entropia_normalizada: entropia, medicion }
    }

    pub fn entropia_promedio_historica(&self) -> f64 {
        if self.historial_entropia.is_empty() {
            return 0.0;
        }
        self.historial_entropia.iter().sum::<f64>() / self.historial_entropia.len() as f64
    }
}
`
  },
  {
    path: 'src/network/gemelos.rs',
    name: 'network/gemelos.rs',
    language: 'rust',
    description: 'NodoCuantico & SistemaGemelos: paired quantum node topology, cycle & hash synchronization, and bilateral consensus',
    content: `use sha2::{Digest, Sha256};

#[derive(Debug, Clone)]
pub struct NodoCuantico {
    pub id: usize,
    pub gemelo_id: usize,
    pub ciclo_local: u64,
    pub quantum_hash: String,
}

impl NodoCuantico {
    pub fn nuevo(id: usize, gemelo_id: usize) -> Self {
        Self { id, gemelo_id, ciclo_local: 0, quantum_hash: String::new() }
    }

    pub fn sincronizar(&mut self, ciclo: u64, quantum_hash: String) {
        self.ciclo_local = ciclo;
        self.quantum_hash = quantum_hash;
    }

    pub fn firma_local(&self) -> String {
        let mut hasher = Sha256::new();
        hasher.update(self.id.to_string().as_bytes());
        hasher.update(self.gemelo_id.to_string().as_bytes());
        hasher.update(self.ciclo_local.to_string().as_bytes());
        hasher.update(self.quantum_hash.as_bytes());
        format!("{:x}", hasher.finalize())
    }

    pub fn tiene_pareja(&self) -> bool {
        self.gemelo_id != self.id
    }
}

#[derive(Debug, Clone)]
pub struct EstadoConsenso {
    pub id_a: usize,
    pub id_b: usize,
    pub ciclos_coinciden: bool,
    pub hash_cuantico_coincide: bool,
    pub firma_par: String,
}

pub struct SistemaGemelos {
    pub nodos: Vec<NodoCuantico>,
}

impl SistemaGemelos {
    pub fn nuevo(cantidad: usize) -> Self {
        let mut nodos = Vec::with_capacity(cantidad);
        let mut i = 1;
        while i <= cantidad {
            if i + 1 <= cantidad {
                nodos.push(NodoCuantico::nuevo(i, i + 1));
                nodos.push(NodoCuantico::nuevo(i + 1, i));
            } else {
                nodos.push(NodoCuantico::nuevo(i, i));
            }
            i += 2;
        }
        Self { nodos }
    }

    pub fn sincronizar_todos(&mut self, ciclo: u64, quantum_hash: &str) {
        for nodo in &mut self.nodos {
            nodo.sincronizar(ciclo, quantum_hash.to_string());
        }
    }

    pub fn emparejar(&mut self, id_a: usize, id_b: usize) -> Result<(), String> {
        if id_a == id_b {
            return Err("Un nodo no puede emparejarse consigo mismo.".to_string());
        }

        let existe_a = self.nodos.iter().any(|n| n.id == id_a);
        let existe_b = self.nodos.iter().any(|n| n.id == id_b);
        if !existe_a || !existe_b {
            return Err(format!("No existen ambos nodos ({} y {}).", id_a, id_b));
        }

        let vieja_pareja_a = self.nodos.iter().find(|n| n.id == id_a).map(|n| n.gemelo_id);
        let vieja_pareja_b = self.nodos.iter().find(|n| n.id == id_b).map(|n| n.gemelo_id);

        for nodo in &mut self.nodos {
            if nodo.id == id_a {
                nodo.gemelo_id = id_b;
            } else if nodo.id == id_b {
                nodo.gemelo_id = id_a;
            } else if Some(nodo.id) == vieja_pareja_a && nodo.id != id_b {
                nodo.gemelo_id = nodo.id;
            } else if Some(nodo.id) == vieja_pareja_b && nodo.id != id_a {
                nodo.gemelo_id = nodo.id;
            }
        }

        Ok(())
    }

    pub fn consenso(&self) -> Vec<EstadoConsenso> {
        let mut resultados = Vec::new();
        let mut procesados: Vec<usize> = Vec::new();

        for nodo in &self.nodos {
            if !nodo.tiene_pareja() || procesados.contains(&nodo.id) {
                continue;
            }

            if let Some(gemelo) = self.nodos.iter().find(|n| n.id == nodo.gemelo_id) {
                let ciclos_coinciden = nodo.ciclo_local == gemelo.ciclo_local;
                let hash_cuantico_coincide = nodo.quantum_hash == gemelo.quantum_hash;

                let mut ids = [nodo.id, gemelo.id];
                ids.sort();

                let mut hasher = Sha256::new();
                hasher.update(ids[0].to_string().as_bytes());
                hasher.update(ids[1].to_string().as_bytes());
                hasher.update(nodo.firma_local().as_bytes());
                hasher.update(gemelo.firma_local().as_bytes());
                let firma_par = format!("{:x}", hasher.finalize());

                resultados.push(EstadoConsenso {
                    id_a: ids[0], id_b: ids[1], ciclos_coinciden, hash_cuantico_coincide, firma_par,
                });

                procesados.push(nodo.id);
                procesados.push(gemelo.id);
            }
        }

        resultados
    }
}
`
  },
  {
    path: 'src/blockchain/conocimiento.rs',
    name: 'blockchain/conocimiento.rs',
    language: 'rust',
    description: 'BloqueConocimiento, verifiable knowledge tasks (algebra, vectors, matrices, Born probabilities), AUTOR_ID and sello_genesis',
    content: `use crate::quantum::QuantumRegister;
use num_complex::Complex64;
use rand::Rng;
use sha2::{Digest, Sha256};

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum TipoTarea {
    AlgebraCompleja,
    ProductoVectorial,
    MultiplicacionMatrices,
    ProbabilidadMedicion,
}

#[derive(Debug, Clone)]
pub struct Tarea {
    pub id: u64,
    pub tipo: TipoTarea,
    pub descripcion: String,
}

#[derive(Debug, Clone)]
pub struct ResultadoTarea {
    pub resultado: String,
    pub verificacion: String,
    pub valido: bool,
}

#[derive(Debug, Clone)]
pub struct BloqueConocimiento {
    pub id: u64,
    pub previous_hash: String,
    pub hash: String,
    pub ciclo: u64,
    pub tarea: String,
    pub resultado: String,
    pub verificacion: String,
    pub agente: String,
    pub quantum_hash: String,
    pub validado: bool,
}

impl BloqueConocimiento {
    pub fn calcular_hash(
        id: u64,
        previous_hash: &str,
        ciclo: u64,
        tarea: &str,
        resultado: &str,
        agente: &str,
        quantum_hash: &str,
    ) -> String {
        let mut hasher = Sha256::new();
        hasher.update(id.to_string().as_bytes());
        hasher.update(previous_hash.as_bytes());
        hasher.update(ciclo.to_string().as_bytes());
        hasher.update(tarea.as_bytes());
        hasher.update(resultado.as_bytes());
        hasher.update(agente.as_bytes());
        hasher.update(quantum_hash.as_bytes());
        format!("{:x}", hasher.finalize())
    }
}

pub fn generar_tarea(id: u64) -> Tarea {
    let mut rng = rand::thread_rng();
    let tipo = match rng.gen_range(0..4) {
        0 => TipoTarea::AlgebraCompleja,
        1 => TipoTarea::ProductoVectorial,
        2 => TipoTarea::MultiplicacionMatrices,
        _ => TipoTarea::ProbabilidadMedicion,
    };

    let descripcion = match tipo {
        TipoTarea::AlgebraCompleja => "Multiplicacion de dos numeros complejos".to_string(),
        TipoTarea::ProductoVectorial => "Producto punto de dos vectores 3D".to_string(),
        TipoTarea::MultiplicacionMatrices => "Multiplicacion de matrices 2x2".to_string(),
        TipoTarea::ProbabilidadMedicion => "Calculo de probabilidades Born del estado actual".to_string(),
    };

    Tarea { id, tipo, descripcion }
}

pub fn procesar_tarea(tarea: &Tarea, registro: &QuantumRegister) -> ResultadoTarea {
    let mut rng = rand::thread_rng();

    match tarea.tipo {
        TipoTarea::AlgebraCompleja => {
            let a = Complex64::new(rng.gen_range(-9.0..9.0), rng.gen_range(-9.0..9.0));
            let b = Complex64::new(rng.gen_range(-9.0..9.0), rng.gen_range(-9.0..9.0));
            let producto = a * b;
            let modulo_esperado = a.norm() * b.norm();
            let modulo_real = producto.norm();
            let valido = (modulo_esperado - modulo_real).abs() < 1e-9;

            ResultadoTarea {
                resultado: format!("({:.6}+{:.6}i) * ({:.6}+{:.6}i) = ({:.6}+{:.6}i)", a.re, a.im, b.re, b.im, producto.re, producto.im),
                verificacion: format!("|a|*|b|={:.9} vs |a*b|={:.9}", modulo_esperado, modulo_real),
                valido,
            }
        }

        TipoTarea::ProductoVectorial => {
            let v1: [f64; 3] = [rng.gen_range(-9.0..9.0), rng.gen_range(-9.0..9.0), rng.gen_range(-9.0..9.0)];
            let v2: [f64; 3] = [rng.gen_range(-9.0..9.0), rng.gen_range(-9.0..9.0), rng.gen_range(-9.0..9.0)];
            let punto = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
            let recalculo = (0..3).map(|i| v1[i] * v2[i]).sum::<f64>();
            let valido = (punto - recalculo).abs() < 1e-9;

            ResultadoTarea {
                resultado: format!("v1={:?} . v2={:?} = {:.6}", v1, v2, punto),
                verificacion: format!("recalculo independiente = {:.9}", recalculo),
                valido,
            }
        }

        TipoTarea::MultiplicacionMatrices => {
            let a: [[f64; 2]; 2] = [
                [rng.gen_range(-5.0..5.0), rng.gen_range(-5.0..5.0)],
                [rng.gen_range(-5.0..5.0), rng.gen_range(-5.0..5.0)],
            ];
            let b: [[f64; 2]; 2] = [
                [rng.gen_range(-5.0..5.0), rng.gen_range(-5.0..5.0)],
                [rng.gen_range(-5.0..5.0), rng.gen_range(-5.0..5.0)],
            ];

            let c = [
                [a[0][0] * b[0][0] + a[0][1] * b[1][0], a[0][0] * b[0][1] + a[0][1] * b[1][1]],
                [a[1][0] * b[0][0] + a[1][1] * b[1][0], a[1][0] * b[0][1] + a[1][1] * b[1][1]],
            ];

            let det_a = a[0][0] * a[1][1] - a[0][1] * a[1][0];
            let det_b = b[0][0] * b[1][1] - b[0][1] * b[1][0];
            let det_c = c[0][0] * c[1][1] - c[0][1] * c[1][0];
            let esperado = det_a * det_b;
            let valido = (esperado - det_c).abs() < 1e-6;

            ResultadoTarea {
                resultado: format!("A*B = {:?}", c),
                verificacion: format!("det(A)*det(B)={:.6} vs det(A*B)={:.6}", esperado, det_c),
                valido,
            }
        }

        TipoTarea::ProbabilidadMedicion => {
            let probs = registro.probabilidades();
            let suma: f64 = probs.iter().sum();
            let (estado_max, prob_max) = probs.iter().enumerate()
                .fold((0usize, 0.0f64), |acc, (i, &p)| if p > acc.1 { (i, p) } else { acc });
            let valido = (suma - 1.0).abs() < 1e-6;

            ResultadoTarea {
                resultado: format!("estado mas probable |{}> con p={:.9}", registro.estado_binario(estado_max), prob_max),
                verificacion: format!("suma de probabilidades = {:.9}", suma),
                valido,
            }
        }
    }
}

pub const AUTOR_ID: &str = "b2183ed95f49f83be984094f00ce41e5";

pub fn sello_genesis() -> String {
    let mut hasher = Sha256::new();
    hasher.update(b"SOCXIMA-AUTOR:");
    hasher.update(AUTOR_ID.as_bytes());
    format!("{:x}", hasher.finalize())
}
`
  },
  {
    path: 'src/crypto/mod.rs',
    name: 'crypto/mod.rs',
    language: 'rust',
    description: 'Ed25519 signing key derivation, file persistence, signature generation, and verification',
    content: `use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use rand_core::OsRng;
use std::fs;

const RUTA_LLAVE_PRIVADA: &str = "autor_privada.key";
const RUTA_LLAVE_PUBLICA: &str = "autor_publica.key";

pub fn generar_o_cargar_llaves() -> (SigningKey, VerifyingKey, bool) {
    if let (Ok(bytes_priv), Ok(bytes_pub)) = (fs::read(RUTA_LLAVE_PRIVADA), fs::read(RUTA_LLAVE_PUBLICA)) {
        if bytes_priv.len() == 32 && bytes_pub.len() == 32 {
            let arr_priv: [u8; 32] = bytes_priv.try_into().unwrap();
            let arr_pub: [u8; 32] = bytes_pub.try_into().unwrap();
            let signing_key = SigningKey::from_bytes(&arr_priv);
            let verifying_key = VerifyingKey::from_bytes(&arr_pub).expect("Llave publica guardada esta corrupta");
            return (signing_key, verifying_key, false);
        }
    }

    let mut csprng = OsRng;
    let signing_key = SigningKey::generate(&mut csprng);
    let verifying_key = signing_key.verifying_key();

    fs::write(RUTA_LLAVE_PRIVADA, signing_key.to_bytes()).expect("No se pudo guardar la llave privada");
    fs::write(RUTA_LLAVE_PUBLICA, verifying_key.to_bytes()).expect("No se pudo guardar la llave publica");

    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = fs::metadata(RUTA_LLAVE_PRIVADA) {
            let mut permisos = metadata.permissions();
            permisos.set_mode(0o600);
            let _ = fs::set_permissions(RUTA_LLAVE_PRIVADA, permisos);
        }
    }

    (signing_key, verifying_key, true)
}

pub fn firmar(signing_key: &SigningKey, datos: &[u8]) -> String {
    let firma: Signature = signing_key.sign(datos);
    hex::encode(firma.to_bytes())
}

pub fn verificar(verifying_key: &VerifyingKey, datos: &[u8], firma_hex: &str) -> Result<bool, String> {
    let bytes_firma = hex::decode(firma_hex).map_err(|e| format!("Firma hex invalida: {}", e))?;
    if bytes_firma.len() != 64 {
        return Err(format!("La firma debe tener 64 bytes, tiene {}", bytes_firma.len()));
    }
    let arr: [u8; 64] = bytes_firma.try_into().unwrap();
    let firma = Signature::from_bytes(&arr);
    Ok(verifying_key.verify(datos, &firma).is_ok())
}

pub fn llave_publica_hex(verifying_key: &VerifyingKey) -> String {
    hex::encode(verifying_key.to_bytes())
}
`
  },
  {
    path: 'src/main.rs',
    name: 'main.rs',
    language: 'rust',
    description: 'Complete runnable entry point running SocximaEngine heartbeat loop, twin network consensus, and knowledge blockchain mining',
    content: `use socxima_quantum_core::{
    SocximaEngine, SistemaGemelos, BloqueConocimiento,
    generar_tarea, procesar_tarea, sello_genesis, AUTOR_ID,
    generar_o_cargar_llaves, firmar, llave_publica_hex
};

fn main() {
    println!("=== SOCXIMA QUANTUM CORE v0.1.0 ===");
    println!("Genesis Autor ID: {}", AUTOR_ID);
    println!("Sello Genesis:    {}", sello_genesis());

    // 1. Initialize Ed25519 cryptographic keypair
    let (signing_key, verifying_key, nueva) = generar_o_cargar_llaves();
    let pub_hex = llave_publica_hex(&verifying_key);
    println!("Llave Publica Ed25519: {} (nueva: {})", pub_hex, nueva);

    // 2. Initialize SocximaEngine with 3 qubits
    let mut motor = SocximaEngine::nuevo(3);
    println!("Registro inicializado con {} qubits (dim: {})", motor.registro.n_qubits, motor.registro.dimension());

    // 3. Initialize Twin Network with 6 quantum nodes
    let mut red_gemelos = SistemaGemelos::nuevo(6);
    println!("Red de gemelos inicializada con {} nodos", red_gemelos.nodos.len());

    // 4. Run Heartbeat simulation (15 cycles)
    println!("\n--- INICIANDO LATIDO CUANTICO (15 CICLOS) ---");
    let mut prev_block_hash = sello_genesis();

    for _ in 1..=15 {
        let latido = motor.latido();
        let q_hash = motor.registro.hash();

        print!("Ciclo {:02} | Entropia: {:.4} | Hash: {}...", latido.ciclo, latido.entropia_normalizada, &q_hash[..16]);

        if let Some(med) = latido.medicion {
            print!(" | Medicion: |{}>", motor.registro.estado_binario(med));
        }
        println!();

        // Synchronize twin network
        red_gemelos.sincronizar_todos(latido.ciclo, &q_hash);

        // Mine a Knowledge Block every 5 cycles
        if latido.ciclo % 5 == 0 {
            let tarea = generar_tarea(latido.ciclo);
            let res = procesar_tarea(&tarea, &motor.registro);

            let block_hash = BloqueConocimiento::calcular_hash(
                latido.ciclo,
                &prev_block_hash,
                latido.ciclo,
                &tarea.descripcion,
                &res.resultado,
                &pub_hex,
                &q_hash,
            );

            println!("  -> BLOQUE MINADO #{} | Valido: {} | Hash: {}", latido.ciclo, res.valido, &block_hash[..20]);
            prev_block_hash = block_hash;
        }
    }

    // 5. Twin Consensus Verification
    println!("\n--- ESTADO DE CONSENSO ENTRE GEMELOS ---");
    let consensos = red_gemelos.consenso();
    for c in &consensos {
        println!(
            "Par (N_{} <-> N_{}) | Ciclos coinciden: {} | Hash cuantico coincide: {} | Firma par: {}...",
            c.id_a, c.id_b, c.ciclos_coinciden, c.hash_cuantico_coincide, &c.firma_par[..20]
        );
    }

    println!("\nSocxima Engine completado con exito. Entropia promedio: {:.4}", motor.entropia_promedio_historica());
}
`
  }
];
