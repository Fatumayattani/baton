"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ethers } from "ethers";
import BatonMark from "@/components/BatonMark";
import {
  CHAIN,
  ETH_TOKEN,
  USDC_ADDRESS,
  batonRead,
  batonWrite,
  fmtCountdown,
  getMagic,
} from "@/lib/baton";

type Phase =
  | "loading"
  | "invalid"
  | "waiting"      // estate not yet expired
  | "signin"       // claimable, heir not signed in
  | "preparing"    // signed in, sponsoring gas
  | "ready"        // ready to accept
  | "claiming"
  | "done"
  | "claimed";     // already claimed earlier

function ClaimInner() {
  const params = useSearchParams();
  const estateId = params.get("e");
  const index = params.get("i");
  const secret = params.get("s");
  const heirName = params.get("n");

  const [phase, setPhase] = useState<Phase>("loading");
  const [shareBps, setShareBps] = useState(0);
  const [ethShare, setEthShare] = useState("0");
  const [usdcShare, setUsdcShare] = useState("0");
  const [remaining, setRemaining] = useState(0);
  const [email, setEmail] = useState("");
  const [busyLogin, setBusyLogin] = useState(false);
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");
  const [txHash, setTxHash] = useState("");

  const load = useCallback(async () => {
    if (!estateId || index === null || !secret) {
      setPhase("invalid");
      return null;
    }
    try {
      const baton = batonRead();
      const [estate, bens, rem] = await Promise.all([
        baton.estates(estateId),
        baton.beneficiaries(estateId),
        baton.timeRemaining(estateId),
      ]);
      const i = parseInt(index);
      if (!bens[i] || estate.cancelled) {
        setPhase("invalid");
        return null;
      }
      const b = bens[i];
      setShareBps(Number(b.shareBps));

      const [ethB, usdcB] = estate.activated
        ? await Promise.all([
            baton.snapshots(estateId, ETH_TOKEN),
            baton.snapshots(estateId, USDC_ADDRESS),
          ])
        : await Promise.all([
            baton.balances(estateId, ETH_TOKEN),
            baton.balances(estateId, USDC_ADDRESS),
          ]);
      const bps = BigInt(b.shareBps);
      setEthShare(ethers.formatEther((ethB * bps) / 10000n));
      setUsdcShare(ethers.formatUnits((usdcB * bps) / 10000n, 6));
      setRemaining(Number(rem));

      if (b.claimed) return "claimed";
      if (!estate.activated && Number(rem) > 0) return "waiting";
      return "claimable";
    } catch (e) {
      console.error(e);
      setPhase("invalid");
      return null;
    }
  }, [estateId, index, secret]);

  useEffect(() => {
    (async () => {
      const state = await load();
      if (!state) return;
      if (state === "claimed") {
        setPhase("claimed");
        return;
      }
      if (state === "waiting") {
        setPhase("waiting");
        return;
      }
      // claimable: check if already signed in
      const magic = await getMagic();
      if (await magic.user.isLoggedIn()) {
        const info = await magic.user.getInfo();
        setAddress(info.publicAddress || "");
        await prepare(info.publicAddress || "");
      } else {
        setPhase("signin");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // countdown while waiting
  useEffect(() => {
    if (phase !== "waiting") return;
    const t = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(t);
          window.location.reload();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase]);

  async function login() {
    if (!email) return;
    setBusyLogin(true);
    setError("");
    try {
      const magic = await getMagic();
      await magic.auth.loginWithEmailOTP({ email });
      const info = await magic.user.getInfo();
      let addr = info.publicAddress || "";
      if (!addr) {
        const provider = new ethers.BrowserProvider(magic.rpcProvider);
        addr = await (await provider.getSigner()).getAddress();
      }
      setAddress(addr);
      await prepare(addr);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Sign in failed");
      setBusyLogin(false);
      setPhase("signin");
    }
  }

  async function prepare(addr: string) {
    setPhase("preparing");
    try {
      await fetch("/api/gas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addr }),
      });
    } catch (e) {
      console.error(e); // non-fatal: claim may still work if already funded
    }
    setPhase("ready");
  }

  async function accept() {
    if (!estateId || index === null || !secret) return;
    setPhase("claiming");
    setError("");
    try {
      const baton = await batonWrite();
      const read = batonRead();
      const estate = await read.estates(estateId);
      if (!estate.activated) {
        const actTx = await baton.activateEstate(estateId);
        await actTx.wait();
      }
      const tx = await baton.claim(estateId, parseInt(index), secret);
      await tx.wait();
      setTxHash(tx.hash);
      setPhase("done");
    } catch (e: any) {
      console.error(e);
      setError(e?.shortMessage || e?.message || "Claim failed");
      setPhase("ready");
    }
  }

  const shareLine = (
    <div className="mt-6 flex justify-center gap-10">
      <div className="text-center">
        <p className="font-display tnum text-4xl">{Number(ethShare).toFixed(4)}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-steel">ETH</p>
      </div>
      <div className="text-center">
        <p className="font-display tnum text-4xl">{Number(usdcShare).toFixed(2)}</p>
        <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-steel">mUSDC</p>
      </div>
    </div>
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center px-6 py-16 text-center">
      <div className="mb-6 flex justify-center">
        <BatonMark size={56} />
      </div>

      {phase === "loading" && <p className="text-steel">Opening your Baton…</p>}

      {phase === "invalid" && (
        <div className="card">
          <h1 className="font-display text-2xl">This link is not valid</h1>
          <p className="mt-3 text-sm text-steel">
            The claim link may be incomplete or the estate no longer exists.
            Check with the person who sent it to you.
          </p>
        </div>
      )}

      {phase === "claimed" && (
        <div className="card">
          <h1 className="font-display text-2xl">Already received</h1>
          <p className="mt-3 text-sm text-steel">
            This share of the estate has already been claimed.
          </p>
        </div>
      )}

      {phase === "waiting" && (
        <div className="card">
          <h1 className="font-display text-3xl">
            A Baton is being held for you{heirName ? `, ${heirName}` : ""}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-steel">
            You have been named a beneficiary with a{" "}
            <span className="text-brass font-semibold">{shareBps / 100}%</span> share.
            The owner is still carrying their Baton. If they stop confirming,
            this page will unlock automatically.
          </p>
          {shareLine}
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-steel">
            Unlocks in <span className="tnum text-brass">{fmtCountdown(remaining)}</span>{" "}
            unless the owner checks in
          </p>
        </div>
      )}

      {(phase === "signin" || phase === "preparing" || phase === "ready" || phase === "claiming") && (
        <div className="card">
          <h1 className="font-display text-3xl">
            A Baton has been passed to you{heirName ? `, ${heirName}` : ""}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-steel">
            You were designated a beneficiary of this estate. Your allocation is{" "}
            <span className="text-brass font-semibold">{shareBps / 100}%</span>.
          </p>
          {shareLine}
          <div className="hairline my-6" />

          {phase === "signin" && (
            <>
              <label className="label text-left" htmlFor="heir-email">
                Sign in to receive
              </label>
              <input
                id="heir-email"
                className="input"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && login()}
              />
              <button
                className="btn-brass mt-4 w-full"
                onClick={login}
                disabled={busyLogin || !email}
              >
                {busyLogin ? "Sending code…" : "Sign in to receive"}
              </button>
              <p className="mt-3 text-xs text-steel/70">
                No wallet, no seed phrase, no gas. Just your email.
              </p>
            </>
          )}

          {phase === "preparing" && (
            <p className="text-steel">Preparing your wallet…</p>
          )}

          {(phase === "ready" || phase === "claiming") && (
            <button
              className="btn-brass w-full"
              onClick={accept}
              disabled={phase === "claiming"}
            >
              {phase === "claiming" ? "Receiving…" : "Accept the Baton"}
            </button>
          )}

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
        </div>
      )}

      {phase === "done" && (
        <div className="card">
          <h1 className="font-display text-3xl">The Baton has been passed.</h1>
          <p className="mt-3 text-sm leading-relaxed text-steel">
            Your inheritance is now in your wallet.
          </p>
          {shareLine}
          <div className="hairline my-6" />
          <p className="text-xs text-steel break-all">
            Your wallet: {address}
          </p>
          {txHash && (
            <a
              className="mt-2 inline-block text-xs text-brass underline"
              href={`${CHAIN.explorer}/tx/${txHash}`}
              target="_blank"
            >
              View the transaction
            </a>
          )}
        </div>
      )}

      <p className="mt-8 text-[11px] font-semibold uppercase tracking-[0.28em] text-steelDark">
        Carry it · Protect it · Pass it on
      </p>
    </main>
  );
}

export default function ClaimPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-steel">
          Opening your Baton…
        </main>
      }
    >
      <ClaimInner />
    </Suspense>
  );
}
