# SkillMint — The AI Skills Marketplace

> **Where human expertise meets autonomous agents. On-chain. Forever.**

SkillMint is the first on-chain AI Skills Marketplace — where professionals publish their expertise as callable AI skills, and autonomous agents pay in AVAX to access them. No middlemen. No invoices. Just expertise, on demand, forever.

Built on Avalanche C-Chain for Avalanche Aleph Hackathon 2026.

---

## Vision

A world where human expertise never sleeps. Where a doctor in Lima, a lawyer in Lagos, or an accountant in Seoul can encode their life's knowledge once — and earn while autonomous agents consult them around the clock, on-chain, without intermediaries.

**SkillMint is the infrastructure layer that connects human expertise with the autonomous agent economy** — with crypto-native payments, verifiable provenance, and zero gatekeepers.

---

## Why AI Skills Marketplace?

As AI agents proliferate, they need specialized professional knowledge they can't hallucinate. Generic LLMs lack the domain depth of a 15-year tax attorney or a board-certified cardiologist. SkillMint solves this:

| Problem | SkillMint Solution |
|---|---|
| AI agents are generic | Professionals encode deep expertise as callable AI skills |
| Knowledge can't scale | One skill serves thousands of agents simultaneously |
| No crypto-native marketplace | On-chain registry + AVAX payments + NFT licenses |
| Technical barrier for creators | Claude interviews you — no code required |
| Identity vs. privacy tradeoff | Anonymous publishing with on-chain payment routing |

---

## Live Links

| Resource | URL |
|---|---|
| Marketplace | https://skillmint-hackaton.vercel.app |
| Backend API | https://skillmint-production.up.railway.app |
| GitHub | https://github.com/angelespinoza/skillmint |

---

## Smart Contracts — Avalanche Mainnet (C-Chain · chainId 43114)

| Contract | Address | Description |
|---|---|---|
| SkillRegistry | `0x0312Ccc6F7e1dbD4f5D6b31f2b8dABb045ee8611` | On-chain index of all skills |
| SkillPayment | `0x376600741DD221285Fa67d9726FCB9CA8d5527fa` | Pay-per-call · x402 pattern |
| SkillLicense | `0x8459e2B4e10bde61C3675b6c94E4ffdBE6DddBdd` | ERC-721 NFT license |
| Treasury | `0x30f637b017b7BBBa7C175a01eD2b418708F3338b` | Platform fee receiver |

Explorer: https://snowtrace.io/address/0x0312Ccc6F7e1dbD4f5D6b31f2b8dABb045ee8611

---

## How It Works

### Create a Skill (10 minutes, no code)
1. Fill your creator profile — or publish anonymously
2. Claude interviews you with 5 structured questions to extract your expertise
3. Skill JSON is auto-generated and uploaded to IPFS via Pinata
4. Skill is registered on-chain via `SkillRegistry.sol` on Avalanche Mainnet
5. Your skill is live in the marketplace — earning 24/7

### Call a Skill (as an agent or user)

**Pay-per-call (x402 pattern)**
1. Pay exact AVAX to `SkillPayment.sol`
2. Contract splits 90% to creator, 10% to treasury
3. Contract emits `SkillCalled` event
4. Backend detects event → loads skill from IPFS → Claude executes with professional system prompt
5. Professional-grade response returned instantly

**NFT License (ERC-721)**
1. Mint license via `SkillLicense.sol`
2. Own the skill as an on-chain asset — unlimited calls
3. License is transferable and resellable

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              AI Skills Marketplace (Next.js 14)             │
│  wagmi v2 · RainbowKit · viem · Avalanche Mainnet           │
└─────────────────┬───────────────────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────────────────┐
│                  Smart Contracts (Solidity)                  │
│  SkillRegistry · SkillPayment · SkillLicense                │
│  OpenZeppelin v4 · Hardhat · Avalanche C-Chain              │
└─────────────────┬───────────────────────────────────────────┘
                  │ Events (SkillCalled, LicenseMinted)
┌─────────────────▼───────────────────────────────────────────┐
│                    Backend (Hono + Node.js)                  │
│  ethers.js v6 · Event polling · Claude API                  │
└──────────┬──────────────────────────┬───────────────────────┘
           │                          │
┌──────────▼──────────┐    ┌──────────▼──────────────────────┐
│   IPFS (Pinata)     │    │         Supabase                 │
│  Skill JSON         │    │  Skill index · Creator profiles  │
│  Creator profiles   │    │  Call counts · Marketplace data  │
└─────────────────────┘    └──────────────────────────────────┘
```

---

## Smart Contract Details

### SkillRegistry.sol
- On-chain index of all AI skills in the marketplace
- Stores IPFS hash + metadata for each skill
- Anonymous publishing — identity hidden from public, payment routing preserved
- `registerSkill()` — creates on-chain record with pricePerCall and licensePrice
- `getSkill()` — strips identity fields when `isAnonymous = true`

### SkillPayment.sol — x402 Pattern
- `callSkill(skillId, requestId)` payable — accepts exact AVAX
- 90/10 split: 90% to creator, 10% to treasury
- Emits `SkillCalled(skillId, caller, totalPaid, creatorShare, platformShare, requestId)`
- Backend polls this event to trigger Claude execution

### SkillLicense.sol — ERC-721
- `mintLicense(skillId)` payable — mints NFT to buyer's wallet
- `hasLicense(skillId, holder)` — access check for unlimited calls
- Licenses are transferable and resellable on secondary markets

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, wagmi v2, viem, RainbowKit |
| Backend | Hono, Node.js, ethers.js v6 |
| Smart Contracts | Solidity 0.8.20, Hardhat, OpenZeppelin v4 |
| AI Engine | Claude claude-sonnet-4-5 (Anthropic) |
| Storage | IPFS via Pinata |
| Database | Supabase (PostgreSQL) |
| Blockchain | Avalanche C-Chain Mainnet (chainId 43114) |
| Deployment | Vercel (frontend) · Railway (backend) |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/build/chat` | Single Claude interview turn |
| POST | `/build/generate` | Generate skill JSON + upload to IPFS |
| POST | `/build/index` | Index skill in Supabase |
| POST | `/execute/call` | Wait for payment event → execute Claude |
| POST | `/execute/licensed` | Verify NFT license → execute Claude |
| GET | `/skills` | List marketplace skills |
| GET | `/skills/:id` | Full skill detail |
| GET | `/license/check/:skillId/:address` | Check NFT ownership |
| GET | `/health` | Health check |

---

## OpenClaw Integration

SkillMint connects with OpenClaw — an autonomous agent platform running bots on X/Twitter and Telegram. Every skill has an **"Install in OpenClaw"** button that copies a JSON config for instant bot integration:

```json
{
  "skill_id": 5,
  "skill_name": "Peruvian Commercial Contract Review",
  "category": "legal",
  "ipfs_hash": "bafkrei...",
  "price_per_call": "1000000000000000",
  "endpoint": "https://skillmint-production.up.railway.app/execute/call",
  "chain": "avalanche",
  "chain_id": 43114,
  "payment_contract": "0x376600741DD221285Fa67d9726FCB9CA8d5527fa"
}
```

---

## Payment Flow (x402 Pattern)

```
1. Agent writes query
2. Frontend calls SkillPayment.callSkill(skillId, requestId) with AVAX
3. Avalanche confirms transaction (~1 second)
4. Contract splits: 90% → creator, 10% → treasury
5. Contract emits SkillCalled event
6. Backend detects event (polls every 3s, 500-block window)
7. Loads skill JSON from IPFS
8. Claude executes with professional system prompt
9. Expert response returned to agent
```

---

## Hackathon Track

**Track**: Agents that Cooperate  
**Key technologies**: ERC-721 (SkillLicense), x402 payment pattern (SkillPayment), on-chain AI skills marketplace (SkillRegistry)  
**Why Avalanche**: Sub-second finality and near-zero fees make $0.001 per-call micropayments economically viable — a $0.001 skill call only works when gas doesn't eat the margin.

---

## Team

**Angel Espinoza** — 

*Built for Avalanche — Aleph Hackathon · March 2026*
