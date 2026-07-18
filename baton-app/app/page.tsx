"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-6 py-16">
      <p className="mb-3 text-sm font-bold uppercase tracking-[0.3em] text-brass">
        Crypto inheritance
      </p>
      <h1 className="font-display text-7xl leading-none">BATON</h1>
      <p className="mt-4 text-xl text-steel">Self custody that outlives you.</p>

      <div className="card mt-10">
        <p className="mb-6 text-sm leading-relaxed text-steel">
          Place assets in a revocable estate. Confirm you are active with a
          heartbeat. If you go silent, the people you chose claim their share
          with nothing but an email. No seed phrases. No bridges. No envelopes
          at the lawyer&apos;s office.
        </p>
        {checking ? (
          <p className="text-steel">Checking session…</p>
        ) : (
          <>
            <label className="label" htmlFor="email">Sign in with email</label>
            <input
              id="email"
              className="input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            <button className="btn-brass mt-4 w-full" onClick={login} disabled={busy || !email}>
              {busy ? "Sending code…" : "Continue"}
            </button>
            <p className="mt-3 text-center text-xs text-steel">
              Powered by Magic. A wallet is created for you, no seed phrase involved.
            </p>
          </>
        )}
      </div>

      <p className="mt-8 text-center text-xs uppercase tracking-widest text-steelDark">
        Carry it. Protect it. Pass it on.
      </p>
    </main>
  );
}
