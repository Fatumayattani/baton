"use client";

import { useCallback, useEffect, useState } from "react";
import BatonMark from "@/components/BatonMark";

type Slide = { eyebrow: string; body: React.ReactNode };

const BIG = "font-display text-4xl leading-tight sm:text-5xl";
const MID = "font-display text-2xl leading-snug sm:text-3xl";
const TXT = "mt-6 max-w-xl text-base leading-relaxed text-steel sm:text-lg";

const slides: Slide[] = [
  {
    eyebrow: "01 · Baton",
    body: (
      <>
        <div className="mb-6 flex justify-center"><BatonMark size={72} /></div>
        <h2 className={BIG}>BATON</h2>
        <p className="mt-4 text-xl text-brass sm:text-2xl">Self custody that outlives you.</p>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.28em] text-steel">
          Carry it · Protect it · Pass it on
        </p>
      </>
    ),
  },
  {
    eyebrow: "02 · The problem",
    body: (
      <>
        <h2 className={BIG}>
          Crypto has perfect ownership.
          <br />
          <span className="text-brass">And no handover.</span>
        </h2>
        <p className={TXT}>
          Analysts estimate millions of Bitcoin, worth hundreds of billions of
          dollars, are permanently inaccessible. Owners dying without passing
          on access is one of the leading causes. Every self custody wallet
          ever created will eventually face this.
        </p>
      </>
    ),
  },
  {
    eyebrow: "03 · The moment",
    body: (
      <>
        <h2 className={MID}>
          A family knows the money exists.
          <br />
          They can see the address on a screen.
          <br />
          <span className="text-brass">They will never touch it.</span>
        </h2>
        <p className={TXT}>
          Today&apos;s options: a seed phrase in a lawyer&apos;s envelope,
          teaching your mother hardware wallets, or accepting that what you
          built stops with you.
        </p>
      </>
    ),
  },
  {
    eyebrow: "04 · The solution",
    body: (
      <>
        <h2 className={BIG}>A revocable digital estate</h2>
        <p className={TXT}>
          Place selected assets in your Baton while you are alive and in
          control. Confirm you are active with a heartbeat every few months.
          Go silent past your grace period, and the people you chose claim
          their share by signing in with the email they already have.
        </p>
      </>
    ),
  },
  {
    eyebrow: "05 · How it works",
    body: (
      <>
        <h2 className={MID}>Five verbs</h2>
        <div className="mt-6 space-y-3 text-left text-base text-steel sm:text-lg">
          <p><span className="text-brass font-semibold">Create.</span> Email sign in, name your people, set your clock.</p>
          <p><span className="text-brass font-semibold">Fund.</span> Deposit what you want covered. Withdraw anytime.</p>
          <p><span className="text-brass font-semibold">Carry.</span> One tap says you are still here.</p>
          <p><span className="text-brass font-semibold">Pass.</span> Silence plus grace period unlocks the estate.</p>
          <p><span className="text-brass font-semibold">Receive.</span> Heirs claim with an email. Nothing else.</p>
        </div>
      </>
    ),
  },
  {
    eyebrow: "06 · Safe for the living",
    body: (
      <>
        <h2 className={MID}>Missing one check in is not fatal</h2>
        <p className={TXT}>
          Baton never has power over assets you did not deposit. Everything is
          revocable before activation. The grace period absorbs a holiday. You
          can heartbeat back even after expiry. An optional guardian must
          confirm before claims open. Two independent signals are required
          before anything moves.
        </p>
      </>
    ),
  },
  {
    eyebrow: "07 · The heir experience",
    body: (
      <>
        <h2 className={MID}>
          &ldquo;A Baton has been passed to you, Aisha.&rdquo;
        </h2>
        <p className={TXT}>
          She opens a link. Signs in with the Gmail she has had for fifteen
          years. Her wallet is created in that moment, her gas is sponsored
          invisibly, and one button accepts the inheritance. She never learns
          what a seed phrase is. We believe this is the strongest possible use
          of walletless onboarding: meeting someone on the hardest week of
          their life.
        </p>
      </>
    ),
  },
  {
    eyebrow: "08 · Live today",
    body: (
      <>
        <h2 className={MID}>Working end to end, on Arbitrum</h2>
        <p className={TXT}>
          Protocol deployed to Arbitrum Sepolia with 20 passing Foundry tests:
          heartbeat clocks judged by block time, claim secret commitments,
          balance snapshots, full revocability, guardian gating. Owner app and
          heir claim flow live at batonhq.vercel.app, with a Demo Mode that
          shows the entire lifecycle in three minutes.
        </p>
      </>
    ),
  },
  {
    eyebrow: "09 · Why now",
    body: (
      <>
        <h2 className={MID}>The receiving side finally works</h2>
        <p className={TXT}>
          Magic turns an email into a wallet in seconds. Arbitrum makes every
          interaction fast and near free. Chain abstraction will let one tap
          gather assets from every chain into the reserve. The pieces to make
          inheritance a consumer product, not a crypto ritual, only recently
          exist. The market is every self custody user, and it grows forever.
        </p>
      </>
    ),
  },
  {
    eyebrow: "10 · The close",
    body: (
      <>
        <h2 className={BIG}>
          We spend our lives building value.
          <br />
          <span className="text-brass">Baton makes sure it does not stop with us.</span>
        </h2>
        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.28em] text-steel">
          batonhq.vercel.app
        </p>
      </>
    ),
  },
];

export default function Pitch() {
  const [i, setI] = useState(0);

  const prev = useCallback(() => setI((n) => Math.max(0, n - 1)), []);
  const next = useCallback(() => setI((n) => Math.min(slides.length - 1, n + 1)), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight" || e.key === " ") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next]);

  return (
    <main className="flex min-h-screen flex-col">
      <nav className="flex items-center justify-between px-6 py-4">
        <a href="/" className="flex items-center gap-3">
          <BatonMark size={30} />
          <span className="font-display text-xl tracking-tight">BATON</span>
        </a>
        <div className="flex gap-6 text-sm font-semibold text-steel">
          <a className="transition hover:text-brass" href="/docs">Docs</a>
          <span className="text-brass">Pitch</span>
        </div>
      </nav>

      <div className="flex flex-1 items-center justify-center px-6">
        <div key={i} className="card w-full max-w-3xl px-8 py-14 text-center sm:px-14">
          <p className="mb-6 text-[11px] font-bold uppercase tracking-[0.3em] text-brass/80">
            {slides[i].eyebrow}
          </p>
          {slides[i].body}
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 px-6 py-8">
        <button
          onClick={prev}
          disabled={i === 0}
          aria-label="Previous slide"
          className="btn-ghost h-12 w-12 rounded-full px-0 text-xl"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          {slides.map((_, n) => (
            <button
              key={n}
              onClick={() => setI(n)}
              aria-label={`Go to slide ${n + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                n === i ? "w-6 bg-brass" : "w-1.5 bg-steel/40 hover:bg-steel"
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          disabled={i === slides.length - 1}
          aria-label="Next slide"
          className="btn-ghost h-12 w-12 rounded-full px-0 text-xl"
        >
          →
        </button>
      </div>
      <p className="pb-4 text-center text-[11px] uppercase tracking-[0.2em] text-steelDark">
        {i + 1} / {slides.length} · use arrow keys
      </p>
    </main>
  );
}
