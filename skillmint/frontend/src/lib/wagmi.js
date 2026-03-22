import { http, createConfig } from 'wagmi'
import { avalanche } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

export const config = getDefaultConfig({
  appName: 'SkillMint',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'skillmint-hackathon',
  chains: [avalanche],
  transports: { [avalanche.id]: http(process.env.NEXT_PUBLIC_RPC_URL) },
  ssr: true,
})

export const CONTRACTS = {
  registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS,
  payment:  process.env.NEXT_PUBLIC_PAYMENT_ADDRESS,
  license:  process.env.NEXT_PUBLIC_LICENSE_ADDRESS,
}

export const PAYMENT_ABI = [
  { name:'callSkill', type:'function', stateMutability:'payable',
    inputs:[{name:'skillId',type:'uint256'},{name:'requestId',type:'bytes32'}], outputs:[] }
]

export const LICENSE_ABI = [
  { name:'mintLicense', type:'function', stateMutability:'payable',
    inputs:[{name:'skillId',type:'uint256'}], outputs:[{name:'tokenId',type:'uint256'}] },
  { name:'hasLicense', type:'function', stateMutability:'view',
    inputs:[{name:'skillId',type:'uint256'},{name:'holder',type:'address'}], outputs:[{name:'',type:'bool'}] }
]

export const REGISTRY_ABI = [
  { name:'registerSkill', type:'function', stateMutability:'nonpayable',
    inputs:[
      {name:'skillIpfsHash',type:'string'},{name:'profileIpfsHash',type:'string'},
      {name:'name',type:'string'},{name:'category',type:'string'},
      {name:'pricePerCall',type:'uint256'},{name:'licensePrice',type:'uint256'},
      {name:'isAnonymous',type:'bool'}
    ], outputs:[{name:'skillId',type:'uint256'}] }
]
