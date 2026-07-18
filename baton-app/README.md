# Baton — owner app (Step 2)

## Setup
1. `npm install`
2. Put your Magic publishable key in `.env.local`:
   `NEXT_PUBLIC_MAGIC_KEY=pk_live_...`
   (magic.link dashboard -> your app -> API keys -> Publishable)
3. `npm run dev` -> http://localhost:3000

## Contracts (Arbitrum Sepolia, already deployed)
- BatonEstate: 0x26134528c56099B50Cf29af629389d1DCb192334
- MockUSDC:    0xb0BA9513cfbfad27EA231e0a9EdA4142CE548B7E

## Important: gas for the Magic wallet
After first sign-in the dashboard footer shows your Magic wallet address.
Send it a little Arbitrum Sepolia ETH from your deployer wallet:
  cast send <magic_wallet_address> --value 0.005ether --rpc-url $RPC --private-key $PK
Without this, transactions from the app will fail with insufficient funds.
