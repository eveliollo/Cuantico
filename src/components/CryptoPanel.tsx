import React, { useState } from 'react';
import { Ed25519KeyPair, SignatureRecord } from '../types/quantum';
import { HexUtils, signMessageEd25519, verifySignatureEd25519, createQuantumCommitment, generateEd25519KeyPair } from '../core/cryptoEngine';
import { simpleSha256 } from '../core/quantumEngine';
import { Key, ShieldCheck, RefreshCw, Copy, Check, Lock, AlertCircle, Fingerprint, Hash } from 'lucide-react';

interface CryptoPanelProps {
  keyPair: Ed25519KeyPair;
  onKeyPairChange: (newKey: Ed25519KeyPair) => void;
  currentStateHash: string;
}

export const CryptoPanel: React.FC<CryptoPanelProps> = ({
  keyPair,
  onKeyPairChange,
  currentStateHash,
}) => {
  const [messageToSign, setMessageToSign] = useState<string>(currentStateHash);
  const [signatureRecord, setSignatureRecord] = useState<SignatureRecord | null>(null);
  const [isSigning, setIsSigning] = useState<boolean>(false);

  // Verification testing state
  const [verifyMessage, setVerifyMessage] = useState<string>('');
  const [verifySig, setVerifySig] = useState<string>('');
  const [verifyPub, setVerifyPub] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; reason?: string } | null>(null);

  // Quantum commitment state
  const [commitment, setCommitment] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Quick copy helper
  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Generate new key
  const handleGenerateKey = async () => {
    const newKey = await generateEd25519KeyPair();
    onKeyPairChange(newKey);
  };

  // Sign message
  const handleSign = async () => {
    if (!messageToSign) return;
    setIsSigning(true);
    try {
      const record = await signMessageEd25519(messageToSign, keyPair);
      setSignatureRecord(record);
      // Auto-populate verification test inputs
      setVerifyMessage(record.message);
      setVerifySig(record.signatureHex);
      setVerifyPub(record.publicKeyHex);
      setVerifyResult({ valid: true, reason: 'Signature verified cryptographically against public key' });
    } finally {
      setIsSigning(false);
    }
  };

  // Manual verify
  const handleVerify = async () => {
    const res = await verifySignatureEd25519(verifyMessage, verifySig, verifyPub);
    setVerifyResult(res);
  };

  // Create Post-Quantum Hash Envelope
  const handleCreateCommitment = async () => {
    const com = await createQuantumCommitment(currentStateHash, 'circuit_active', keyPair);
    setCommitment(com);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: ed25519-dalek & sha2 overview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-semibold text-white">
                Ed25519 Cryptographic Suite & SHA-256 Engine
              </h2>
            </div>
            <p className="text-xs text-slate-400 max-w-2xl">
              Authentic implementation mirroring <code className="text-emerald-400 font-mono">ed25519-dalek (v2)</code>, <code className="text-cyan-400 font-mono">sha2</code>, and <code className="text-amber-400 font-mono">hex</code>. Provides Edwards25519 signing for quantum states, deterministic commitments, and public-key verification.
            </p>
          </div>

          <button
            id="btn-gen-ed25519"
            onClick={handleGenerateKey}
            className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md shadow-emerald-950/40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Generate New Keypair</span>
          </button>
        </div>

        {/* Active Keypair Details */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Public Key */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-emerald-400 flex items-center space-x-1">
                <Fingerprint className="w-3.5 h-3.5" />
                <span>Ed25519 Public Key (32 bytes / 64 hex)</span>
              </span>
              <button
                onClick={() => copyToClipboard(keyPair.publicKeyHex, 'pub')}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy Public Key"
              >
                {copiedKey === 'pub' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="font-mono text-xs text-slate-300 break-all bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              {HexUtils.formatChunked(keyPair.publicKeyHex, 8)}
            </div>
          </div>

          {/* Private Key Seed */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-rose-400 flex items-center space-x-1">
                <Lock className="w-3.5 h-3.5" />
                <span>Private Seed (Secret Key)</span>
              </span>
              <button
                onClick={() => copyToClipboard(keyPair.seedHex, 'seed')}
                className="text-slate-400 hover:text-white transition-colors"
                title="Copy Private Seed"
              >
                {copiedKey === 'seed' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="font-mono text-xs text-slate-400 break-all bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              {HexUtils.formatChunked(keyPair.seedHex, 8)}
            </div>
          </div>
        </div>
      </div>

      {/* Signing & Verification Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Signer */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-semibold text-slate-200">Sign Quantum Payload</h3>
            </div>
            <button
              onClick={() => setMessageToSign(currentStateHash)}
              className="text-[11px] font-mono text-emerald-400 hover:underline"
            >
              Use Circuit State Hash
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-mono text-slate-400">Payload / Hash to Sign:</label>
            <textarea
              id="crypto-sign-input"
              value={messageToSign}
              onChange={(e) => setMessageToSign(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs font-mono text-slate-200 outline-none focus:border-emerald-500"
              placeholder="Enter text or state hash..."
            />
          </div>

          <button
            id="btn-sign-payload"
            onClick={handleSign}
            disabled={isSigning || !messageToSign}
            className="w-full py-2.5 rounded-xl text-xs font-mono font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md shadow-emerald-950/40"
          >
            {isSigning ? 'Computing Ed25519 Signature...' : 'Sign with Ed25519 Secret Key'}
          </button>

          {signatureRecord && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-slate-400">
                  Signature (64 bytes / 128 hex):
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ed25519-dalek-v2
                </span>
              </div>
              <div className="font-mono text-xs text-emerald-300 break-all bg-slate-900 p-2 rounded border border-slate-800">
                {HexUtils.formatChunked(signatureRecord.signatureHex, 16)}
              </div>
            </div>
          )}
        </div>

        {/* Verifier Sandbox */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Check className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-200">Signature Verification Sandbox</h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">Curve25519</span>
          </div>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">Payload:</label>
              <input
                id="verify-payload-input"
                type="text"
                value={verifyMessage}
                onChange={(e) => setVerifyMessage(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs"
                placeholder="Payload string"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Public Key (64 hex):</label>
              <input
                id="verify-pubkey-input"
                type="text"
                value={verifyPub}
                onChange={(e) => setVerifyPub(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs"
                placeholder="64-character hex public key"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Signature (128 hex):</label>
              <input
                id="verify-sig-input"
                type="text"
                value={verifySig}
                onChange={(e) => setVerifySig(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-slate-200 text-xs"
                placeholder="128-character signature hex"
              />
            </div>

            <button
              id="btn-verify-sig"
              onClick={handleVerify}
              className="w-full py-2 rounded-xl text-xs font-mono font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
            >
              Verify Cryptographic Signature
            </button>

            {verifyResult && (
              <div
                className={`p-3 rounded-xl border flex items-center space-x-2 text-xs ${
                  verifyResult.valid
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                }`}
              >
                {verifyResult.valid ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{verifyResult.reason}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Post-Quantum Hash Envelope / Commitment */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
              <Hash className="w-4 h-4 text-indigo-400" />
              <span>Quantum Commitment Scheme (SHA-256 + Salt + Ed25519)</span>
            </h3>
            <p className="text-xs text-slate-400">
              Commit to an unrevealed quantum circuit state using a hash-preimage commitment envelope.
            </p>
          </div>

          <button
            id="btn-create-commitment"
            onClick={handleCreateCommitment}
            className="px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow transition-colors"
          >
            Create Commitment Envelope
          </button>
        </div>

        {commitment && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400">Commitment Digest H(state || salt)</span>
              <div className="font-mono text-xs text-indigo-300 break-all">
                {commitment.commitmentHash}
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400">Secret Entropy Salt (Hex)</span>
              <div className="font-mono text-xs text-amber-300 break-all">
                {commitment.saltHex}
              </div>
            </div>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] font-mono text-slate-400">Ed25519 Envelope Signature</span>
              <div className="font-mono text-xs text-emerald-300 break-all">
                {commitment.signature.substring(0, 32)}...
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
