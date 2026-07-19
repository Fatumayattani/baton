import BatonMark from "@/components/BatonMark";

export const metadata = { title: "Baton — Docs" };

const BATON_ADDRESS = "0x26134528c56099B50Cf29af629389d1DCb192334";
const USDC_ADDRESS = "0xb0BA9513cfbfad27EA231e0a9EdA4142CE548B7E";
const EXPLORER = "https://sepolia.arbiscan.io/address/";

function H({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display mt-10 text-2xl">{children}</h2>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm leading-relaxed text-steel">{children}</p>;
}

export default function Docs() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <nav className="mb-10 flex items-center justify-between">
        <a href="/" className="flex items-center gap-3">
          <BatonMark size={30} />
          <span className="font-display text-xl tracking-tight">BATON</span>
        </a>
        <div className="flex gap-6 text-sm font-semibold text-steel">
          <span className="text-brass">Docs</span>
          <a className="transition hover:text-brass" href="/pitch">Pitch</a>
        </div>
      </nav>

      <h1 className="font-display text-4xl">Documentation</h1>
      <P>
        Baton is a revocable onchain estate. You place assets in it, name the
        people who should receive them, and confirm you are active with a
        periodic heartbeat. If you go silent past your heartbeat interval and
        grace period, the estate unlocks and your beneficiaries claim their
        share with nothing but an email.
      </P>

      <H>The lifecycle</H>
      <P>
        1. Create. You sign in with Magic using your email. A wallet is created
        for you with no seed phrase step. You name beneficiaries, assign each a
        percentage, and choose your heartbeat interval and grace period. A
        random claim secret is generated per beneficiary in your browser; only
        its hash goes onchain.
      </P>
      <P>
        2. Fund. You deposit ETH and tokens into your estate. The estate is
        fully revocable: withdraw anything or cancel entirely at any time
        before activation. Baton never has power over assets you did not
        explicitly deposit.
      </P>
      <P>
        3. Carry. Each press of the heartbeat button resets your clock. In
        production this is a check-in every few months. In Demo Mode the
        interval is 2 minutes with a 1 minute grace period so the full
        lifecycle can be watched live.
      </P>
      <P>
        4. Pass. If the clock and grace period fully lapse, anyone can activate
        the estate (or only your named guardian, if you set one). Balances are
        snapshotted so claim order cannot change anyone&apos;s share.
      </P>
      <P>
        5. Receive. Each beneficiary opens their claim link, signs in with
        their own email, and accepts. Their wallet is created on the spot by
        Magic, the app sponsors their gas invisibly, and the contract pays out
        their percentage. No seed phrases, no bridges, no gas purchases, no
        crypto knowledge.
      </P>

      <H>Deployed contracts (Arbitrum Sepolia)</H>
      <div className="card mt-4 text-sm">
        <p className="label">BatonEstate</p>
        <a className="break-all text-brass underline" href={`${EXPLORER}${BATON_ADDRESS}`} target="_blank">
          {BATON_ADDRESS}
        </a>
        <p className="label mt-4">MockUSDC (test asset, open faucet)</p>
        <a className="break-all text-brass underline" href={`${EXPLORER}${USDC_ADDRESS}`} target="_blank">
          {USDC_ADDRESS}
        </a>
      </div>

      <H>Contract design</H>
      <P>
        BatonEstate.sol holds every estate. Beneficiaries are stored as
        keccak256 commitments of claim secrets with shares in basis points that
        must total 10,000. The heartbeat is a single timestamp; expiry is
        lastHeartbeat + interval + grace, judged by block time, so no server or
        cron job is trusted. Activation snapshots balances; claims pay
        percentage of snapshot to msg.sender after the secret matches the
        commitment. Withdraw and cancel work any time before activation and
        never after. An optional guardian address gates activation when set.
        All value-moving paths are reentrancy guarded. The suite of 20 Foundry
        tests covers creation, funding, heartbeat semantics, the
        returned-from-holiday case, guardian gating, snapshot claim math,
        wrong-secret and double-claim rejection, and full revocation.
      </P>

      <H>Privacy</H>
      <P>
        Nothing personal touches the chain. Names and emails stay in the
        owner&apos;s browser for their own records. Onchain there are only
        hashes, percentages, timestamps and balances. The claim link is the
        bearer credential: share it privately, like you would a key.
      </P>

      <H>Honest limitations of this prototype</H>
      <P>
        Testnet assets only (ETH and a mock USDC). Claim links are bearer
        secrets, production adds email verification and guardian co-signing on
        claims. Gas sponsorship is an app route, production moves to account
        abstraction paymasters. No legal-will integration, Baton complements a
        will rather than replacing one. No audit yet, which is mandatory before
        real funds.
      </P>
    </main>
  );
}
