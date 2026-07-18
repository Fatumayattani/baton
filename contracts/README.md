# Baton contracts

```bash
forge install foundry-rs/forge-std
forge test
```

Deploy (Arbitrum Sepolia):
```bash
export PK=<deployer_private_key>
export RPC=https://sepolia-rollup.arbitrum.io/rpc
forge create src/BatonEstate.sol:BatonEstate --rpc-url $RPC --private-key $PK --broadcast
forge create src/MockUSDC.sol:MockUSDC --rpc-url $RPC --private-key $PK --broadcast
```
