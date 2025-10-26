# Redeploying UserVaultSystem and Wiring Frontend + Gomoku

This guide explains how to redeploy the UserVaultSystem (vault), point the frontend to it, and deploy a new Gomoku contract that uses the new vault. It also covers whitelisting and common errors.

## Prerequisites
- Hardhat installed in this project (`npm install` in `src/game1` if needed)
- A funded deployer wallet on the target network (e.g., Sepolia)
- Network config and private key set via `.env`

## 1) Redeploy UserVaultSystem (new vault)
```sh
npx hardhat compile
npx hardhat run src/game1/scripts/deployUserVault.js --network sepolia
```
Record the deployed address as `NEW_VAULT`.

## 2) Update the frontend vault address
Edit:
- `src/contract/contractConfig.js`

Set:
```js
export const CONTRACT_ADDRESS = "NEW_VAULT";
```

## 3) Deploy a new Gomoku bound to the new vault
Pick ONE option:

- Option A: via script
  1. Edit `src/game1/scripts/deploy.js` and set:
     ```js
     const USER_VAULT_ADDRESS = "NEW_VAULT";
     ```
  2. Deploy:
     ```sh
     npx hardhat run src/game1/scripts/deploy.js --network sepolia
     ```
  3. Record the deployed address as `NEW_GOMOKU`.

- Option B: via the frontend (Game1 page)
  - Open the app → Play → Game 1
  - In the “Gomoku Contract” card, click “Deploy New”
  - This deploys a Gomoku using the current `CONTRACT_ADDRESS` as its vault and saves the new address to localStorage

## 4) Whitelist Gomoku in the vault
The vault owner must authorize the Gomoku contract to transfer/freeze funds.

Call on `UserVaultSystem` (at `NEW_VAULT`):
```solidity
addToWhitelist(NEW_GOMOKU)
```
You can use Etherscan “Write Contract”, Hardhat console, or a small script.

Note: We updated the vault logic to allow transfers where the recipient is whitelisted, so Gomoku does not need to be a registered user to receive stakes.

## 5) Verify in the frontend
Open the app → Play → Game 1. The top card should show:
- `Vault (from Gomoku)` equals `Vault (from App)`
- Green “Vault check passed.”

Then, for each player account (MetaMask):
1. Register (once per vault)
2. Log in
3. Recharge (deposit) enough balance

Now you can Create and Join games.

## 6) Common errors and fixes
- ENS/Invalid address (getResolver unsupported): ensure you set valid `0x...` addresses for contracts; do not use placeholders.
- `Sender not registered`: make sure you registered and logged in under the SAME vault that Gomoku uses.
- `Recipient not registered`: fixed by the vault update allowing whitelisted recipients. You must redeploy the vault with this change and whitelist Gomoku.
- `Insufficient balance for transfer`: recharge on the “Recharge” page so your vault balance ≥ stake.
- Vault mismatch warning: deploy a new Gomoku bound to current `CONTRACT_ADDRESS`, or switch `CONTRACT_ADDRESS` to the vault that the existing Gomoku uses.

## 7) Testing moves (expected behavior)
- A game starts in Lobby after Create. After a second wallet Joins, the game becomes In Progress and sets Player 1’s turn.
- Each move (`makeMove`) is an on-chain transaction; MetaMask will prompt for confirmation.
- The board updates after confirmation (the UI also polls periodically).

## 8) Notes
- Whitelisting is still required for Gomoku to manage stakes and freeze/unfreeze.
- Changing vault/Gomoku addresses means balances and registrations do not migrate. Register and deposit again on the new vault.

