import BatonMark from "@/components/BatonMark";

export const metadata = { title: "Baton — Docs" };

const BATON_ADDRESS = "0x26134528c56099B50Cf29af629389d1DCb192334";
const USDC_ADDRESS = "0xb0BA9513cfbfad27EA231e0a9EdA4142CE548B7E";
const EXPLORER = "https://sepolia.arbiscan.io/address/";

const NAV = [
  {
    title: "Getting started",
    items: [
      { id: "overview", label: "Overview" },
      { id: "demo", label: "Three minute demo" },
      { id: "lifecycle", label: "The lifecycle" },
    ],
  },
  {
    title: "Protocol",
    items: [
      { id: "contracts", label: "Deployed contracts" },
      { id: "design", label: "Contract design" },
      { id: "claims", label: "Claim links" },
      { id: "privacy", label: "Privacy" },
    ],
  },
  {
    title: "Application",
    items: [
      { id: "owner-app", label: "Owner app" },
      { id: "heir-app", label: "Heir claim flow" },
      { id: "gas", label: "Gas sponsorship" },
    ],
  },
  {
    title: "Trust",
    items: [
      { id: "security", label: "Security model" },
      { id: "limitations", label: "Limitations" },
      { id: "roadmap", label: "Roadmap" },
    ],
  },
];

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-steel/15 py-8 first:pt-0 last:border-0">
      <h2 className="font-display text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-steel">{children}</div>
    </section>
  );
}

export default function Docs() {
  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
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

      <div className="flex gap-12">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-8 space-y-6">
            {NAV.map((group) => (
              <div key={group.title}>
                <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.2em] text-brass/80">
                  {group.title}
                </p>
                <ul className="space-y-1 border-l border-steel/20">
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <a
                        href={`#${item.id}`}
                        className="-ml-px block border-l border-transparent py-1 pl-4 text-sm text-steel transition hover:border-brass hover:text-cream"
                      >
                        {item.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1 pb-24">
          <h1 className="font-display mb-8 text-4xl">Documentation</h1>

          <Section id="overview" title="Overview">
            <p>
              Baton is a revocable onchain estate. You place assets in it, name
              the people who should receive them, and confirm you are active
              with a periodic heartbeat. If you go silent past your heartbeat
              interval and grace period, the estate unlocks and your
              beneficiaries claim their share with nothing but an email.
            </p>
            <p>
              The core promise: no seed phrases handed to lawyers, no heirs
              learning bridges at a funeral, and no power granted over anything
              you did not explicitly deposit.
            </p>
          </Section>

          <Section id="demo" title="Three minute demo">
            <p>
              Demo Mode compresses the timeline: 2 minute heartbeat, 1 minute
              grace. Create an estate with Demo Mode on, deposit test ETH and
              mUSDC (open faucet button in the app), press the heartbeat once,
              copy the claim link, then stop. The countdown dies, the status
              flips to Ready to pass, and the claim link opened in a fresh
              browser walks a brand new user from email sign in to inherited
              assets in under a minute.
            </p>
          </Section>

          <Section id="lifecycle" title="The lifecycle">
            <p>
              1. Create. Sign in with Magic using your email; a wallet is
              created with no seed phrase step. Name up to three beneficiaries
              with percentage shares, set the heartbeat interval and grace
              period, optionally set a guardian.
            </p>
            <p>
              2. Fund. Deposit ETH and tokens. Everything is withdrawable and
              the estate is cancellable at any time before activation.
            </p>
            <p>
              3. Carry. Each heartbeat press resets your clock. Production
              intervals are months; Demo Mode is minutes.
            </p>
            <p>
              4. Pass. After the clock and grace fully lapse, anyone can
              activate the estate, or only your guardian if you set one.
              Balances snapshot at activation.
            </p>
            <p>
              5. Receive. Each beneficiary opens their link, signs in with
              their own email, and accepts. Their wallet is created on the
              spot, gas is sponsored invisibly, and the contract pays their
              percentage.
            </p>
          </Section>

          <Section id="contracts" title="Deployed contracts">
            <p>Network: Arbitrum Sepolia (chain id 421614).</p>
            <div className="card mt-2">
              <p className="label">BatonEstate</p>
              <a className="break-all text-brass underline" href={`${EXPLORER}${BATON_ADDRESS}`} target="_blank">
                {BATON_ADDRESS}
              </a>
              <p className="label mt-4">MockUSDC (test asset, open faucet)</p>
              <a className="break-all text-brass underline" href={`${EXPLORER}${USDC_ADDRESS}`} target="_blank">
                {USDC_ADDRESS}
              </a>
            </div>
          </Section>

          <Section id="design" title="Contract design">
            <p>
              A single BatonEstate contract holds every estate. Beneficiaries
              are stored as keccak256 commitments of claim secrets, with shares
              in basis points that must total exactly 10,000. Expiry is
              lastHeartbeat + interval + grace, judged purely by block time, so
              no server, cron job or oracle is trusted anywhere in the
              lifecycle.
            </p>
            <p>
              Activation snapshots all balances, so the order in which heirs
              claim can never change anyone&apos;s share. Withdraw and cancel
              work at any time before activation and never after. All value
              moving paths are reentrancy guarded. The Foundry suite of 20
              tests covers creation, funding, heartbeat semantics, the
              returned-from-holiday case, guardian gating, snapshot claim math,
              wrong secret and double claim rejection, and full revocation.
            </p>
          </Section>

          <Section id="claims" title="Claim links">
            <p>
              Heirs are named by email, which means their wallet address cannot
              be known when the estate is created. Baton solves this with a
              commitment scheme: a random 32 byte secret is generated per
              beneficiary in the owner&apos;s browser, only its hash goes
              onchain, and the secret travels in the claim link. When the heir
              claims, the contract checks the secret against the commitment and
              pays msg.sender, binding their newly created wallet at claim
              time.
            </p>
            <p>
              The link is a bearer credential: whoever holds it can claim once
              the estate activates. Share it the way you would share a key.
              Production adds verified beneficiary identity and guardian co
              signing on claims.
            </p>
          </Section>

          <Section id="privacy" title="Privacy">
            <p>
              Nothing personal touches the chain. Names and emails stay in the
              owner&apos;s browser for their own records. Onchain there are
              only hashes, percentages, timestamps and balances.
            </p>
          </Section>

          <Section id="owner-app" title="Owner app">
            <p>
              The dashboard is organised as the three verbs of the product.
              Step 1, Fund it: balances, deposits and the test token faucet.
              Step 2, Carry it: the status pill, the countdown and the
              heartbeat button. Step 3, Pass it on: beneficiaries and their
              claim links. Estate controls below hold withdraw all and cancel,
              because revocability is a feature, not a footnote.
            </p>
          </Section>

          <Section id="heir-app" title="Heir claim flow">
            <p>
              The claim page has one job: be understandable to someone who has
              never touched crypto, possibly on the worst week of their life.
              While the owner is active it shows that a Baton is being held for
              them, with a live unlock countdown. Once claimable, the flow is
              three moments: sign in with email, an invisible wallet
              preparation step, and one brass button that says Accept the
              Baton. The success screen links the transaction on Arbiscan.
            </p>
          </Section>

          <Section id="gas" title="Gas sponsorship">
            <p>
              A first time user cannot be asked to buy gas before receiving an
              inheritance. When the heir signs in, the app posts their address
              to a server route which tops the wallet up from a sponsor key if
              the balance is below a threshold. The heir never sees it. In
              production this moves to account abstraction paymasters; the UX
              contract stays identical.
            </p>
          </Section>

          <Section id="security" title="Security model">
            <p>
              The living owner is protected by layers. The estate only ever
              holds what was explicitly deposited. Everything is revocable
              before activation. The grace period absorbs a missed check in.
              The owner can heartbeat back even after expiry, right up until
              someone activates. And an optional guardian, a trusted human,
              can be required to confirm before claims open. Two independent
              signals are needed before anything moves: your silence plus
              time, or your silence plus a guardian.
            </p>
          </Section>

          <Section id="limitations" title="Limitations">
            <p>
              This is a hackathon prototype and says so plainly. Testnet assets
              only. Claim links are bearer secrets. Gas sponsorship is an app
              route rather than a paymaster. There is no audit yet, which is
              mandatory before real funds. Baton complements a legal will; it
              does not replace one.
            </p>
          </Section>

          <Section id="roadmap" title="Roadmap">
            <p>
              Mainnet with audited contracts. Cross chain estate funding
              through chain abstraction, so one tap gathers assets from every
              chain into the reserve. Verified beneficiary identity and
              notifications. Guardian co signing on claims. Integrations with
              the legal estate world.
            </p>
          </Section>
        </div>
      </div>
    </main>
  );
}
