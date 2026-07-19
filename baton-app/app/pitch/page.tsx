import BatonMark from "@/components/BatonMark";

export const metadata = { title: "Baton — Pitch" };

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display mt-10 text-2xl">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-steel">{children}</p>;
}

export default function Pitch() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <nav className="mb-10 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <BatonMark size={30} />
          <span className="font-display text-xl tracking-tight">BATON</span>
        </a>
        <div className="flex gap-6 text-sm font-semibold text-steel">
          <a className="transition hover:text-brass" href="/docs">Docs</a>
          <span className="text-brass">Pitch</span>
        </div>
      </nav>

      <p className="text-xs font-bold uppercase tracking-[0.3em] text-brass">
        The pitch
      </p>
      <h1 className="font-display mt-2 text-4xl leading-tight">
        Self custody that outlives you.
      </h1>

      <H>The problem</H>
      <P>
        Crypto gives complete ownership while you are alive and almost no
        usable handover when you are gone. Analysts estimate millions of
        Bitcoin, worth hundreds of billions of dollars, are permanently
        inaccessible, and owners dying without passing on access is one of the
        leading causes. Today&apos;s options are grim: hand your seed phrase to
        a lawyer in an envelope, teach your family hardware wallets and
        bridges, or accept that everything you built stops with you.
      </P>

      <H>The solution</H>
      <P>
        Baton is a revocable digital estate. Place selected assets in it while
        you are alive and in control. Confirm you are active with a heartbeat
        every few months. If you go silent past your grace period, the estate
        unlocks and the people you chose claim their share by signing in with
        the email they already have. Their wallet is created at that moment,
        their gas is sponsored, and the contract pays out their percentage. A
        grieving family member never learns what a seed phrase is.
      </P>

      <H>Why the safety model is right</H>
      <P>
        Baton never asks for power over your wallet. It can only distribute
        what you explicitly deposited, and you can withdraw or cancel at any
        moment before activation. Missing one check-in is not fatal: the grace
        period, the ability to heartbeat back even after expiry, and an
        optional guardian who must confirm before claims open all protect the
        living owner. Two independent signals, your silence plus time (or your
        silence plus a guardian), are required before anything moves.
      </P>

      <H>Why now</H>
      <P>
        Walletless onboarding finally makes the beneficiary side real. Magic
        turns an email into a wallet in seconds, which means the receiving
        experience can be as simple as opening a link. Settlement on Arbitrum
        keeps every interaction fast and near free. The pieces to make
        inheritance feel like a consumer product, not a crypto ritual, only
        recently exist.
      </P>

      <H>What is live today</H>
      <P>
        A working protocol on Arbitrum Sepolia with 20 passing tests, an owner
        app with estate creation, funding, heartbeat and full revocation, and
        a beneficiary claim flow with sponsored gas, all runnable end to end
        in three minutes using Demo Mode.
      </P>

      <H>Where it goes</H>
      <P>
        Mainnet with audited contracts. Cross-chain funding through chain
        abstraction so an estate can gather assets from every chain into one
        reserve in one tap. Verified beneficiary identity, guardian co-signing,
        notifications, and integrations with the legal estate world. The
        roadmap is long because the problem is permanent: every self-custody
        wallet ever created eventually needs a handover plan.
      </P>

      <div className="card mt-10 text-center">
        <p className="font-display text-xl">
          We spend our lives building value.
        </p>
        <p className="mt-1 font-display text-xl text-brass">
          Baton makes sure it does not stop with us.
        </p>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.28em] text-steel">
          Carry it · Protect it · Pass it on
        </p>
      </div>
    </main>
  );
}
