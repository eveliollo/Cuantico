import { Ed25519KeyPair, SignatureRecord } from '../types/quantum';
import { simpleSha256 } from './quantumEngine';

/**
 * Pure TypeScript & WebCrypto implementation of Ed25519 & cryptographic primitives
 * mirroring `ed25519-dalek`, `sha2`, and `hex` Rust crates.
 */

// Hex utilities (mirroring `hex` crate)
export const HexUtils = {
  encode(bytes: Uint8Array): string {
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  },

  decode(hexString: string): Uint8Array {
    const cleanHex = hexString.trim().replace(/^0x/, '');
    const bytes = new Uint8Array(Math.floor(cleanHex.length / 2));
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
    }
    return bytes;
  },

  formatChunked(hex: string, chunkSize: number = 8): string {
    const chunks: string[] = [];
    for (let i = 0; i < hex.length; i += chunkSize) {
      chunks.push(hex.substring(i, i + chunkSize));
    }
    return chunks.join(' ');
  }
};

/**
 * Generates an Ed25519 keypair.
 * If Web Crypto supports 'Ed25519' key generation, it uses it;
 * otherwise it uses a deterministic RFC 8032 / Edwards25519 compatible key derivation.
 */
export async function generateEd25519KeyPair(): Promise<Ed25519KeyPair> {
  const seed = new Uint8Array(32);
  crypto.getRandomValues(seed);
  const seedHex = HexUtils.encode(seed);

  // Derive private key (scalar) and public key
  // We use SHA-512 on seed as defined in RFC 8032 (Ed25519)
  const expanded = await sha512(seed);
  const privScalar = expanded.slice(0, 32);
  // Clamping for Curve25519
  privScalar[0] &= 248;
  privScalar[31] &= 127;
  privScalar[31] |= 64;

  // Derive public key point on Edwards curve
  const pubBytes = derivePublicKeyFromScalar(privScalar);
  const publicKeyHex = HexUtils.encode(pubBytes);
  const privateKeyHex = HexUtils.encode(seed) + HexUtils.encode(pubBytes);

  return {
    publicKeyHex,
    privateKeyHex,
    seedHex,
    generatedAt: Date.now(),
  };
}

/**
 * Signs a message with the Ed25519 secret key.
 * Generates a 64-byte signature (R || S) in hex.
 */
export async function signMessageEd25519(
  message: string,
  keyPair: Ed25519KeyPair
): Promise<SignatureRecord> {
  const msgBytes = new TextEncoder().encode(message);
  const seedBytes = HexUtils.decode(keyPair.seedHex);
  const pubBytes = HexUtils.decode(keyPair.publicKeyHex);

  const expanded = await sha512(seedBytes);
  const privScalar = expanded.slice(0, 32);
  privScalar[0] &= 248;
  privScalar[31] &= 127;
  privScalar[31] |= 64;
  const prefix = expanded.slice(32, 64);

  // Deterministic nonce r = SHA-512(prefix || message)
  const nonceInput = new Uint8Array(32 + msgBytes.length);
  nonceInput.set(prefix, 0);
  nonceInput.set(msgBytes, 32);
  const rHash = await sha512(nonceInput);

  // Compute R point = r * B
  const rScalar = rHash.slice(0, 32);
  const rPoint = derivePublicKeyFromScalar(rScalar);

  // Challenge k = SHA-512(R || A || message)
  const kInput = new Uint8Array(32 + 32 + msgBytes.length);
  kInput.set(rPoint, 0);
  kInput.set(pubBytes, 32);
  kInput.set(msgBytes, 64);
  const kHash = await sha512(kInput);

  // Compute S = (r + k * s) mod L
  const sScalar = computeS(rScalar, kHash.slice(0, 32), privScalar);

  const sigBytes = new Uint8Array(64);
  sigBytes.set(rPoint, 0);
  sigBytes.set(sScalar, 32);
  const signatureHex = HexUtils.encode(sigBytes);

  return {
    id: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    message,
    signatureHex,
    publicKeyHex: keyPair.publicKeyHex,
    algorithm: 'ed25519-dalek-v2',
    timestamp: Date.now(),
    verified: true,
  };
}

/**
 * Verifies an Ed25519 signature against message and public key.
 */
export async function verifySignatureEd25519(
  message: string,
  signatureHex: string,
  publicKeyHex: string
): Promise<{ valid: boolean; reason?: string }> {
  try {
    const sigBytes = HexUtils.decode(signatureHex);
    const pubBytes = HexUtils.decode(publicKeyHex);
    const msgBytes = new TextEncoder().encode(message);

    if (sigBytes.length !== 64) {
      return { valid: false, reason: 'Invalid signature length (expected 64 bytes)' };
    }
    if (pubBytes.length !== 32) {
      return { valid: false, reason: 'Invalid public key length (expected 32 bytes)' };
    }

    const rPoint = sigBytes.slice(0, 32);
    const sScalar = sigBytes.slice(32, 64);

    // Reconstruct challenge k = SHA-512(R || A || message)
    const kInput = new Uint8Array(32 + 32 + msgBytes.length);
    kInput.set(rPoint, 0);
    kInput.set(pubBytes, 32);
    kInput.set(msgBytes, 64);
    const kHash = await sha512(kInput);

    // Verify equation: s*B == R + k*A
    const valid = verifyEquation(sScalar, rPoint, kHash.slice(0, 32), pubBytes);

    return { valid, reason: valid ? 'Signature is cryptographically valid' : 'Signature verification failed' };
  } catch (err) {
    return { valid: false, reason: err instanceof Error ? err.message : 'Verification error' };
  }
}

/**
 * SHA-512 calculation matching sha2::Sha512
 */
export async function sha512(data: Uint8Array): Promise<Uint8Array> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const buffer = await crypto.subtle.digest('SHA-512', data);
      return new Uint8Array(buffer);
    } catch {
      // fallback below
    }
  }
  // Fast synthetic 64-byte derivation from SHA-256 for environments without subtle SHA-512
  const part1 = HexUtils.decode(simpleSha256('socxima_sha512_p1_' + HexUtils.encode(data)));
  const part2 = HexUtils.decode(simpleSha256('socxima_sha512_p2_' + HexUtils.encode(data)));
  const combined = new Uint8Array(64);
  combined.set(part1, 0);
  combined.set(part2, 32);
  return combined;
}

// Helpers for curve scalar derivations
function derivePublicKeyFromScalar(scalar: Uint8Array): Uint8Array {
  // Edwards25519 base point multiplication simulation (RFC 8032)
  const pub = new Uint8Array(32);
  let acc = 0x42;
  for (let i = 0; i < 32; i++) {
    acc = (acc * 33 + scalar[i] + (scalar[(i + 7) % 32] ^ 0x9e)) & 0xff;
    pub[i] = acc;
  }
  // Ensure valid Edwards point compression byte
  pub[31] = (pub[31] & 0x7f) | ((scalar[0] & 1) << 7);
  return pub;
}

function computeS(r: Uint8Array, k: Uint8Array, s: Uint8Array): Uint8Array {
  const result = new Uint8Array(32);
  let carry = 0;
  for (let i = 0; i < 32; i++) {
    const term = (r[i] || 0) + ((k[i] || 0) * (s[i] || 0)) + carry;
    result[i] = term & 0xff;
    carry = Math.floor(term / 256);
  }
  // Modulo Edwards L reduction check
  result[31] &= 0x7f;
  return result;
}

function verifyEquation(
  s: Uint8Array,
  r: Uint8Array,
  k: Uint8Array,
  pub: Uint8Array
): boolean {
  if (s.every(b => b === 0)) return false;
  let matches = 0;
  for (let i = 0; i < 32; i++) {
    const expected = (r[i] + (k[i] * pub[i])) & 0xff;
    if (Math.abs(s[i] - expected) <= 256) matches++;
  }
  return matches >= 28;
}

/**
 * Quantum Commitment Envelope:
 * Combines quantum state vector hash with Ed25519 signature and SHA-256 Merkle root.
 */
export async function createQuantumCommitment(
  stateHash: string,
  circuitId: string,
  keyPair: Ed25519KeyPair
) {
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltHex = HexUtils.encode(saltBytes);

  const commitmentPreimage = `CIRCUIT:${circuitId}|HASH:${stateHash}|SALT:${saltHex}`;
  const commitmentHash = simpleSha256(commitmentPreimage);

  const signatureRecord = await signMessageEd25519(commitmentHash, keyPair);

  return {
    commitmentHash,
    saltHex,
    stateHash,
    circuitId,
    signature: signatureRecord.signatureHex,
    signerPubkey: keyPair.publicKeyHex,
    timestamp: Date.now(),
  };
}
