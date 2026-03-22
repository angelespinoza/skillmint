import { ethers } from 'ethers'

export const provider = new ethers.JsonRpcProvider(
  process.env.RPC_URL || 'https://api.avax.network/ext/bc/C/rpc'
)

export const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider)

const REGISTRY_ABI = [
  'function getSkill(uint256 skillId) view returns (tuple(uint256 id, address owner, string skillIpfsHash, string profileIpfsHash, string name, string category, uint256 pricePerCall, uint256 licensePrice, bool isAnonymous, bool active, uint256 createdAt, uint256 totalCalls))',
  'function getSkillsByOwner(address owner) view returns (uint256[])',
  'function totalSkills() view returns (uint256)',
  'function getPrices(uint256 skillId) view returns (uint256, uint256)',
  'function isActive(uint256 skillId) view returns (bool)',
]

const PAYMENT_ABI = [
  'event SkillCalled(uint256 indexed skillId, address indexed caller, uint256 totalPaid, uint256 creatorShare, uint256 platformShare, bytes32 requestId)'
]

const LICENSE_ABI = [
  'function hasLicense(uint256 skillId, address holder) view returns (bool)',
  'function licenseCount(uint256 skillId, address holder) view returns (uint256)',
]

export const registry = new ethers.Contract(process.env.REGISTRY_ADDRESS, REGISTRY_ABI, provider)
export const paymentContract = new ethers.Contract(process.env.PAYMENT_ADDRESS, PAYMENT_ABI, provider)
export const licenseContract = new ethers.Contract(process.env.LICENSE_ADDRESS, LICENSE_ABI, provider)

export async function waitForSkillCalled(requestId, timeoutMs = 60_000) {
  const start = Date.now()
  // Normalize requestId — ensure 0x prefix and lowercase
  const normalizedReqId = requestId.toLowerCase().startsWith('0x')
    ? requestId.toLowerCase()
    : '0x' + requestId.toLowerCase()
  console.log('[poll] Starting poll for requestId:', normalizedReqId)

  while (Date.now() - start < timeoutMs) {
    try {
      const block = await provider.getBlockNumber()
      const fromBlock = Math.max(0, block - 500)
      console.log('[poll] block:', block, 'fromBlock:', fromBlock)

      const events = await paymentContract.queryFilter(
        paymentContract.filters.SkillCalled(),
        fromBlock,
        block
      )

      console.log('[poll] events found:', events.length)

      if (events.length > 0) {
        events.forEach(e => console.log('[poll] event requestId:', e.args.requestId))
      }

      const match = events.find(e => {
        const evtReqId = e.args.requestId.toLowerCase()
        return evtReqId === normalizedReqId
      })

      if (match) {
        console.log('[poll] Match found!')
        return {
          skillId:   match.args.skillId.toString(),
          caller:    match.args.caller,
          totalPaid: match.args.totalPaid,
          event:     match
        }
      }
    } catch(e) {
      console.error('[poll] Error:', e.message)
    }

    await new Promise(r => setTimeout(r, 3000))
  }

  throw new Error('Payment event timeout')
}

export async function waitForLicenseMinted(skillId, buyer, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      licenseContract.off(filter, handler)
      reject(new Error('License mint event timeout'))
    }, timeoutMs)

    const filter = licenseContract.filters.LicenseMinted(null, skillId, buyer)
    const handler = (tokenId, sId, sbuyer, totalPaid, _, __, event) => {
      clearTimeout(timer)
      licenseContract.off(filter, handler)
      resolve({ tokenId: tokenId.toString(), skillId: sId.toString(), buyer: sbuyer, event })
    }

    licenseContract.on(filter, handler)
  })
}
