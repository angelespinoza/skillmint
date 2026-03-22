import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const DEMO_SKILLS = {
  'QmDemo1': { system_prompt: 'Eres un abogado especialista en derecho comercial peruano con 12 años de experiencia. Analizas contratos bajo el Código Civil peruano, identificas cláusulas abusivas y riesgos legales. Citas artículos relevantes.', knowledge: ['Art. 1354 CC: libertad contractual', 'Art. 1398 CC: nulas las cláusulas que limitan responsabilidad por dolo', 'Cláusulas leoninas con ventaja desproporcionada son nulas', 'INDECOPI supervisa cláusulas abusivas en contratos de consumo'], name: 'Contratos Comerciales Perú', category: 'legal' },
  'QmDemo2': { system_prompt: 'Eres un analista financiero CFA especializado en due diligence para M&A en mercados LATAM con 8 años de experiencia.', knowledge: ['Análisis de ratios financieros', 'Valoración DCF y múltiplos'], name: 'Due Diligence Financiero', category: 'finance' },
  'QmDemo3': { system_prompt: 'Eres un médico internista con 15 años de experiencia. Apoyas en razonamiento clínico para diagnóstico diferencial. Siempre recomiendas consulta presencial.', knowledge: ['Guías clínicas internacionales', 'Semiología médica'], name: 'Diagnóstico Diferencial', category: 'medical' },
  'QmDemo4': { system_prompt: 'Eres un contador público especializado en tributación peruana con 10 años de experiencia. Asesoras sobre IGV, impuesto a la renta y obligaciones con SUNAT.', knowledge: ['IGV 18% régimen general', 'Impuesto a la renta tasas y deducciones', 'Regímenes MYPE tributario y especial'], name: 'SUNAT & Tributación Perú', category: 'tax' },
  'QmDemo5': { system_prompt: 'Eres abogada especialista en propiedad intelectual con 7 años de experiencia en INDECOPI.', knowledge: ['Registro de marcas INDECOPI', 'Clases de Niza', 'Plazos y tasas de registro'], name: 'Propiedad Intelectual LATAM', category: 'legal' },
  'QmDemo6': { system_prompt: 'Eres especialista en compliance para fintechs en LATAM con 9 años de experiencia. Asesoras sobre AML, KYC y cumplimiento FATF.', knowledge: ['Estándares FATF/GAFI', 'KYC basado en riesgo', 'Normativa SBS Perú'], name: 'AML/KYC Fintech Latam', category: 'compliance' },
}

const GATEWAYS = [
  'https://ipfs.io/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://dweb.link/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
]

async function fetchFromIPFS(cid) {
  for (const gateway of GATEWAYS) {
    try {
      const res = await fetch(`${gateway}${cid}`, { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        console.log('[executor] Loaded from gateway:', gateway)
        return await res.json()
      }
    } catch(e) {
      console.log('[executor] Gateway failed:', gateway, e.message)
    }
  }
  throw new Error(`Could not load skill from IPFS after trying ${GATEWAYS.length} gateways`)
}

export async function executeSkill(skillIpfsHash, input) {
  let skillDef

  if (DEMO_SKILLS[skillIpfsHash]) {
    skillDef = DEMO_SKILLS[skillIpfsHash]
    console.log('[executor] Using demo skill:', skillDef.name)
  } else {
    console.log('[executor] Loading from IPFS:', skillIpfsHash)
    skillDef = await fetchFromIPFS(skillIpfsHash)
    console.log('[executor] Loaded skill:', skillDef.name)
  }

  const userMessage = formatInput(input, skillDef)

  const response = await claude.messages.create({
    model:      'claude-sonnet-4-5',
    max_tokens: 2000,
    system:     buildSystemPrompt(skillDef),
    messages:   [{ role: 'user', content: userMessage }]
  })

  return {
    output: response.content[0].text,
    usage:  { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
    skill:  { name: skillDef.name, category: skillDef.category },
    model:  response.model
  }
}

function buildSystemPrompt(skillDef) {
  let prompt = skillDef.system_prompt
  if (skillDef.knowledge?.length > 0) {
    prompt += '\n\n## Knowledge Base\n'
    prompt += skillDef.knowledge.map((k, i) => `${i + 1}. ${k}`).join('\n')
  }
  if (skillDef.limitations?.length > 0) {
    prompt += '\n\n## Limitations:\n'
    prompt += skillDef.limitations.map(l => `- ${l}`).join('\n')
  }
  return prompt
}

function formatInput(input, skillDef) {
  if (typeof input === 'string') return input
  if (input.query) return input.query
  return JSON.stringify(input, null, 2)
}
