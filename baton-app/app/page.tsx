"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BatonMark from "@/components/BatonMark";
import { getMagic } from "@/lib/baton";

export default function Landing() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const magic = await getMagic();
        if (await magic.user.isLoggedIn()) {
          router.replace("/dashboard");
          return;
        }
      } catch {}
      setChecking(false);
    })();
  }, [router]);

  async function login() {
    if (!email) return;
    setBusy(true);
    try {
      const magic = await getMagic();
      await magic.auth.loginWithEmailOTP({ email });
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      setBusy(false);
    }
  }

  return (
    <main className="relative mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      {/* handoff line motif */}
      <div
        className="pointer-events-none fixed inset-y-0 right-[8%] hidden w-px lg:block"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(233,177,82,0.5) 0 14px, transparent 14px 30px)",
        }}
        aria-hidden
      />

      <div className="flex items-center gap-3">
        <BatonMark size={44} />
        <p className="text-xs font-bold uppercase tracking-[0.32em] text-brass">
          Crypto inheritance
        </p>
      </div>

      <h1 className="font-display mt-4 text-7xl leading-none tracking-tight">
        BATON
      </h1>
      <p className="mt-4 text-xl text-steel">Self custody that outlives you.</p>

      <div className="card mt-10">
        <p className="text-sm leading-relaxed text-steel">
          Place assets in a revocable estate. Confirm you are active with a
          heartbeat. If you go silent, the people you chose claim their share
          with nothing but an email.
        </p>
        <div className="hairline my-6" />
        <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-steel/80">
          No seed phrases · No bridges · No lawyer&apos;s envelopes
        </p>
        {checking ? (
          <p className="text-steel">Checking session…</p>
        ) : (
          <>
            <label className="label" htmlFor="email">
              Sign in with email
            </label>
            <input
              id="email"
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
              disabled={busy || !email}
            >
              {busy ? "Sending code…" : "Continue"}
            </button>
            <p className="mt-3 text-center text-xs text-steel/70">
              Powered by Magic. A wallet is created for you, no seed phrase
              involved.
            </p>
          </>
        )}
      </div>

      <p className="mt-8 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-steelDark">
        Carry it · Protect it · Pass it on
      </p>
    </main>
  );
}
