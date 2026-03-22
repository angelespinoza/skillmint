const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function post(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(body)
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

async function get(path) {
  const res = await fetch(`${BASE}${path}`)
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  buildChat: (b) => post('/build/chat', b),
  buildGenerate: (b) => post('/build/generate', b),
  buildIndex: (b) => post('/build/index', b),
  listSkills: ({ category, limit=20, offset=0 }={}) => {
    const p = new URLSearchParams({ limit, offset })
    if (category && category !== 'all') p.set('category', category)
    return get(`/skills?${p}`)
  },
  getSkill: (id) => get(`/skills/${id}`),
  getSkillDefinition: (id) => get(`/skills/${id}/definition`),
  executeCall: (b) => post('/execute/call', b),
  executeLicensed: (b) => post('/execute/licensed', b),
  checkLicense: (skillId, address) => get(`/license/check/${skillId}/${address}`),
}
