import { NextResponse } from "next/server";
import { ethers } from "ethers";

const RPC = "https://sepolia-rollup.arbitrum.io/rpc";
const TOP_UP = ethers.parseEther("0.0006");
const THRESHOLD = ethers.parseEther("0.0003");

/**
 * Sponsored gas for heirs. The claim page posts the heir's fresh Magic wallet
 * address; if it has less than the threshold, we top it up from the app's
 * sponsor key so the heir never needs to know gas exists.
 * Testnet-only convenience; PK stays server-side.
 */
export async function POST(req: Request) {
  try {
    const pk = process.env.PK;
    if (!pk) {
      return NextResponse.json({ ok: false, error: "sponsor not configured" }, { status: 500 });
    }
    const { address } = await req.json();
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({ ok: false, error: "bad address" }, { status: 400 });
    }
    const provider = new ethers.JsonRpcProvider(RPC);
    const balance = await provider.getBalance(address);
    if (balance >= THRESHOLD) {
      return NextResponse.json({ ok: true, funded: false });
    }
    const sponsor = new ethers.Wallet(pk, provider);
    const tx = await sponsor.sendTransaction({ to: address, value: TOP_UP });
    await tx.wait();
    return NextResponse.json({ ok: true, funded: true, tx: tx.hash });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "failed" }, { status: 500 });
  }
}
