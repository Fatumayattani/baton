"use client";

import { ethers } from "ethers";

export const BATON_ADDRESS = "0x26134528c56099B50Cf29af629389d1DCb192334";
export const USDC_ADDRESS = "0xb0BA9513cfbfad27EA231e0a9EdA4142CE548B7E";
export const ETH_TOKEN = "0x0000000000000000000000000000000000000000";

export const CHAIN = {
  rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
  chainId: 421614,
  explorer: "https://sepolia.arbiscan.io",
};

export const BATON_ABI = [
  "function createEstate(uint64 heartbeatInterval, uint64 gracePeriod, address guardian, bytes32[] commitments, uint16[] sharesBps) returns (uint256)",
  "function heartbeat(uint256 estateId)",
  "function depositETH(uint256 estateId) payable",
  "function depositToken(uint256 estateId, address token, uint256 amount)",
  "function withdraw(uint256 estateId, address token, uint256 amount, address to)",
  "function cancelEstate(uint256 estateId)",
  "function activateEstate(uint256 estateId)",
  "function claim(uint256 estateId, uint256 beneficiaryIndex, bytes secret)",
  "function estates(uint256) view returns (address owner, address guardian, uint64 lastHeartbeat, uint64 heartbeatInterval, uint64 gracePeriod, bool activated, bool cancelled)",
  "function balances(uint256, address) view returns (uint256)",
  "function beneficiaries(uint256) view returns (tuple(bytes32 commitment, uint16 shareBps, bool claimed, address claimedBy)[])",
  "function timeRemaining(uint256) view returns (uint256)",
  "function isExpired(uint256) view returns (bool)",
  "event EstateCreated(uint256 indexed estateId, address indexed owner, uint64 heartbeatInterval, uint64 gracePeriod, address guardian)",
] as const;

export const USDC_ABI = [
  "function faucet()",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address, address) view returns (uint256)",
] as const;

// ------------------------------------------------------------------ magic

let _magic: any = null;

export async function getMagic() {
  if (_magic) return _magic;
  const { Magic } = await import("magic-sdk");
  _magic = new Magic(process.env.NEXT_PUBLIC_MAGIC_KEY as string, {
    network: { rpcUrl: CHAIN.rpcUrl, chainId: CHAIN.chainId },
  });
  return _magic;
}

export async function getSigner() {
  const magic = await getMagic();
  const provider = new ethers.BrowserProvider(magic.rpcProvider);
  return provider.getSigner();
}

export function getReadProvider() {
  return new ethers.JsonRpcProvider(CHAIN.rpcUrl);
}

export function batonRead() {
  return new ethers.Contract(BATON_ADDRESS, BATON_ABI, getReadProvider());
}

export async function batonWrite() {
  return new ethers.Contract(BATON_ADDRESS, BATON_ABI, await getSigner());
}

export async function usdcWrite() {
  return new ethers.Contract(USDC_ADDRESS, USDC_ABI, await getSigner());
}

export function usdcRead() {
  return new ethers.Contract(USDC_ADDRESS, USDC_ABI, getReadProvider());
}

// ------------------------------------------------------------- local state

export type HeirMeta = {
  name: string;
  email: string;
  sharePct: number;
  secret: string; // hex bytes, travels in the claim link only
};

export type BatonMeta = {
  estateId: string;
  heirs: HeirMeta[];
  demoMode: boolean;
};

const KEY = "baton-meta";

export function saveMeta(meta: BatonMeta) {
  localStorage.setItem(KEY, JSON.stringify(meta));
}

export function loadMeta(): BatonMeta | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as BatonMeta) : null;
  } catch {
    return null;
  }
}

export function clearMeta() {
  localStorage.removeItem(KEY);
}

export function randomSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return ethers.hexlify(bytes);
}

export function commitmentOf(secretHex: string): string {
  return ethers.keccak256(secretHex);
}

export function claimLink(estateId: string, index: number, secret: string) {
  const base = typeof window !== "undefined" ? window.location.origin : "";
  return `${base}/claim?e=${estateId}&i=${index}&s=${secret}`;
}

export function fmtCountdown(totalSeconds: number): string {
  if (totalSeconds <= 0) return "expired";
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  return `${m}m ${s}s`;
}
