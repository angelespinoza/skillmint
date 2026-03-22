import PinataClient from '@pinata/sdk'

const pinata = new PinataClient(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_KEY
)

export async function uploadJSON(obj, name) {
  const res = await pinata.pinJSONToIPFS(obj, {
    pinataMetadata: { name },
    pinataOptions:  { cidVersion: 1 }
  })
  return res.IpfsHash
}

export async function fetchJSON(cid) {
  const url = `https://cloudflare-ipfs.com/ipfs/${cid}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`IPFS fetch failed: ${res.status}`)
  return res.json()
}
