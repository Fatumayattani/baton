"use client";

import { useCallback, useEffect, useState } from "react";
import { ethers } from "ethers";
import {
  BATON_ADDRESS,
  CHAIN,
  ETH_TOKEN,
  USDC_ADDRESS,
  batonRead,
  batonWrite,
  claimLink,
  clearMeta,
  fmtCountdown,
  usdcRead,
  usdcWrite,
  type BatonMeta,
} from "@/lib/baton";

type Props = { meta: BatonMeta; address: string; onReset: () => void };

export default function Dashboard({ meta, address, onReset }: Props) {
  const [ethBal, setEthBal] = useState("0");
  const [usdcBal, setUsdcBal] = useState("0");
  const [walletEth, setWalletEth] = useState("0");
  const [walletUsdc, setWalletUsdc] = useState("0");
  const [remaining, setRemaining] = useState<number | null>(null);
  const [lastBeat, setLastBeat] = useState<Date | null>(null);
  const [activated, setActivated] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [busy, setBusy] = useState("");
  const [depositEthAmt, setDepositEthAmt] = useState("0.01");
  const [depositUsdcAmt, setDepositUsdcAmt] = useState("100");
  const [copied, setCopied] = useState(-1);
  const [error, setError] = useState("");

  const id = meta.estateId;

  const refresh = useCallback(async () => {
    try {
      const baton = batonRead();
      const usdc = usdcRead();
      const provider = baton.runner!.provider!;
      const [e, ethB, usdcB, rem, wEth, wUsdc] = await Promise.all([
        baton.estates(id),
        baton.balances(id, ETH_TOKEN),
        baton.balances(id, USDC_ADDRESS),
        baton.timeRemaining(id),
        provider.getBalance(address),
        usdc.balanceOf(address),
      ]);
      setLastBeat(new Date(Number(e.lastHeartbeat) * 1000));
      setActivated(e.activated);
      setCancelled(e.cancelled);
      setEthBal(ethers.formatEther(ethB));
      setUsdcBal(ethers.formatUnits(usdcB, 6));
      setRemaining(Number(rem));
      setWalletEth(ethers.formatEther(wEth));
      setWalletUsdc(ethers.formatUnits(wUsdc, 6));
    } catch (e) {
      console.error(e);
    }
  }, [id, address]);

  useEffect(() => {
    refresh();
    const poll = setInterval(refresh, 15000);
    return () => clearInterval(poll);
  }, [refresh]);

  useEffect(() => {
    const tick = setInterval(
      () => setRemaining((r) => (r === null || r <= 0 ? r : r - 1)),
      1000
    );
    return () => clearInterval(tick);
  }, []);

  async function run(label: string, fn: () => Promise<any>) {
    setError("");
    setBusy(label);
    try {
      const tx = await fn();
      if (tx?.wait) await tx.wait();
      await refresh();
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || "Transaction failed");
    } finally {
      setBusy("");
    }
  }

  const beat = () =>
    run("beat", async () => (await batonWrite()).heartbeat(id));

  const depositEth = () =>
    run("depEth", async () =>
      (await batonWrite()).depositETH(id, { value: ethers.parseEther(depositEthAmt) })
    );

  const getTestUsdc = () =>
    run("faucet", async () => (await usdcWrite()).faucet());

  const depositUsdc = () =>
    run("depUsdc", async () => {
      const amount = ethers.parseUnits(depositUsdcAmt, 6);
      const usdc = await usdcWrite();
      const allowance = await usdcRead().allowance(address, BATON_ADDRESS);
      if (allowance < amount) {
        const approveTx = await usdc.approve(BATON_ADDRESS, amount);
        await approveTx.wait();
      }
      return (await batonWrite()).depositToken(id, USDC_ADDRESS, amount);
    });

  const withdrawAll = () =>
    run("withdraw", async () => {
      const baton = await batonWrite();
      const ethB = await batonRead().balances(id, ETH_TOKEN);
      if (ethB > 0n) {
        const tx = await baton.withdraw(id, ETH_TOKEN, ethB, address);
        await tx.wait();
      }
      const usdcB = await batonRead().balances(id, USDC_ADDRESS);
      if (usdcB > 0n) return baton.withdraw(id, USDC_ADDRESS, usdcB, address);
    });

  const cancel = () =>
    run("cancel", async () => (await batonWrite()).cancelEstate(id));

  function copyLink(i: number) {
    navigator.clipboard.writeText(claimLink(id, i, meta.heirs[i].secret));
    setCopied(i);
    setTimeout(() => setCopied(-1), 1500);
  }

  const expired = remaining !== null && remaining <= 0;

  const status = cancelled
    ? { text: "CANCELLED", cls: "text-steel" }
    : activated
    ? { text: "PASSED ON", cls: "text-brass" }
    : expired
    ? { text: "READY TO PASS", cls: "text-brass" }
    : { text: "ACTIVE", cls: "text-emerald-400" };

  return (
    <div className="space-y-6">
      {/* Your Baton */}
      <div className="card">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-2xl">Your Baton</h2>
            <p className={`mt-1 text-sm font-bold uppercase tracking-widest ${status.cls}`}>
              {status.text}
              {meta.demoMode && !cancelled && (
                <span className="ml-2 rounded bg-brass/20 px-2 py-0.5 text-xs text-brass">
                  Demo Mode
                </span>
              )}
            </p>
          </div>
          <p className="text-right text-xs text-steel">
            Estate #{id} on Arbitrum Sepolia
            <br />
            <a
              className="underline hover:text-brass"
              href={`${CHAIN.explorer}/address/${BATON_ADDRESS}`}
              target="_blank"
            >
              View contract
            </a>
          </p>
        </div>

        {!activated && !cancelled && (
          <>
            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="label">Last heartbeat</p>
                <p>{lastBeat ? lastBeat.toLocaleString() : "…"}</p>
              </div>
              <div>
                <p className="label">Time remaining</p>
                <p className={expired ? "font-bold text-brass" : ""}>
                  {remaining === null ? "…" : fmtCountdown(remaining)}
                </p>
              </div>
            </div>
            <button className="btn-brass mt-5 w-full" onClick={beat} disabled={!!busy}>
              {busy === "beat" ? "Confirming…" : "Keep carrying the baton"}
            </button>
          </>
        )}
      </div>

      {/* Protected estate */}
      <div className="card">
        <h2 className="font-display text-2xl">Protected estate</h2>
        <div className="mt-4 flex gap-10">
          <div>
            <p className="font-display text-3xl">{Number(ethBal).toFixed(4)}</p>
            <p className="text-sm text-steel">ETH</p>
          </div>
          <div>
            <p className="font-display text-3xl">{Number(usdcBal).toFixed(2)}</p>
            <p className="text-sm text-steel">mUSDC</p>
          </div>
        </div>

        {!activated && !cancelled && (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div>
                <label className="label">Add ETH</label>
                <div className="flex gap-2">
                  <input
                    className="input"
                    value={depositEthAmt}
                    onChange={(e) => setDepositEthAmt(e.target.value)}
                  />
                  <button className="btn-ghost" onClick={depositEth} disabled={!!busy}>
                    {busy === "depEth" ? "…" : "Add"}
                  </button>
                </div>
              </div>
              <div>
                <label className="label">Add mUSDC</label>
                <div className="flex gap-2">
                  <input
                    className="input"
                    value={depositUsdcAmt}
                    onChange={(e) => setDepositUsdcAmt(e.target.value)}
                  />
                  <button className="btn-ghost" onClick={depositUsdc} disabled={!!busy}>
                    {busy === "depUsdc" ? "…" : "Add"}
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-steel">
              <p>
                Wallet: {Number(walletEth).toFixed(4)} ETH · {Number(walletUsdc).toFixed(2)} mUSDC
              </p>
              <button className="underline hover:text-brass" onClick={getTestUsdc} disabled={!!busy}>
                {busy === "faucet" ? "Minting…" : "Get 1,000 test mUSDC"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Beneficiaries */}
      <div className="card">
        <h2 className="font-display text-2xl">Beneficiaries</h2>
        <div className="mt-4 space-y-3">
          {meta.heirs.map((h, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-steel/20 px-4 py-3"
            >
              <div>
                <p className="font-semibold">
                  {h.name} <span className="text-brass">{h.sharePct}%</span>
                </p>
                <p className="text-xs text-steel">{h.email || "no email saved"}</p>
              </div>
              <button className="btn-ghost text-sm" onClick={() => copyLink(i)}>
                {copied === i ? "Copied ✓" : "Copy claim link"}
              </button>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-steel">
          Share each claim link privately with that person. The link is how they
          prove they are your chosen beneficiary. Baton stores no emails onchain.
        </p>
      </div>

      {/* Estate controls */}
      {!activated && !cancelled && (
        <div className="card">
          <h2 className="font-display text-2xl">Estate controls</h2>
          <p className="mt-1 text-sm text-steel">
            Your Baton is revocable. Everything returns to you with one click.
          </p>
          <div className="mt-4 flex gap-3">
            <button className="btn-ghost" onClick={withdrawAll} disabled={!!busy}>
              {busy === "withdraw" ? "Withdrawing…" : "Withdraw all assets"}
            </button>
            <button className="btn-ghost" onClick={cancel} disabled={!!busy}>
              {busy === "cancel" ? "Cancelling…" : "Cancel estate"}
            </button>
          </div>
        </div>
      )}

      {cancelled && (
        <div className="card text-center">
          <p className="text-steel">
            This estate was cancelled and all assets returned to you.
          </p>
          <button
            className="btn-brass mt-4"
            onClick={() => {
              clearMeta();
              onReset();
            }}
          >
            Create a new Baton
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <p className="text-center text-xs text-steel">
        Signed in as {address.slice(0, 6)}…{address.slice(-4)} · fund this
        wallet with Arbitrum Sepolia ETH for gas
      </p>
    </div>
  );
}
