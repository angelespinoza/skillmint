import Anthropic from '@anthropic-ai/sdk'

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const STEPS = [
  {
    step: 1, key: 'specialty',
    question: {
      en: `**Step 1 of 5 — Your Specialty**\n\nTell me about your professional background:\n- What is your exact area of expertise?\n- In which country or jurisdiction do you primarily operate?\n- How many years of experience do you have?`,
      es: `**Paso 1 de 5 — Tu Especialidad**\n\nCuéntame sobre tu experiencia profesional:\n- ¿Cuál es tu área de expertise exacta?\n- ¿En qué país o jurisdicción operas principalmente?\n- ¿Cuántos años de experiencia tienes?`
    }
  },
  {
    step: 2, key: 'frequent_queries',
    question: {
      en: `**Step 2 of 5 — Most Frequent Consultations**\n\nThink about your last 10 clients:\n- What was the most common problem they brought?\n- What type of analysis do you do most often?`,
      es: `**Paso 2 de 5 — Consultas Más Frecuentes**\n\nPiensa en tus últimos 10 clientes:\n- ¿Cuál fue el problema más común que trajeron?\n- ¿Qué tipo de análisis haces con más frecuencia?`
    }
  },
  {
    step: 3, key: 'common_mistakes',
    question: {
      en: `**Step 3 of 5 — Common Mistakes**\n\nThis is key for your skill's value:\n- What are the 3-5 most critical mistakes non-specialists make in your area?\n- What do people misunderstand that causes them problems?`,
      es: `**Paso 3 de 5 — Errores Frecuentes**\n\nEsto es clave para el valor de tu skill:\n- ¿Cuáles son los 3-5 errores más críticos que cometen los no-especialistas?\n- ¿Qué malentienden las personas que les genera problemas?`
    }
  },
  {
    step: 4, key: 'case_examples',
    question: {
      en: `**Step 4 of 5 — Real Cases**\n\nDescribe 2-3 real cases you have resolved:\n- What was the situation or problem?\n- What did you analyze?\n- What was your conclusion or recommendation?`,
      es: `**Paso 4 de 5 — Casos Reales**\n\nDescribe 2-3 casos reales que hayas resuelto:\n- ¿Cuál era la situación o problema?\n- ¿Qué analizaste?\n- ¿Cuál fue tu conclusión o recomendación?`
    }
  },
  {
    step: 5, key: 'frameworks',
    question: {
      en: `**Step 5 of 5 — Legal & Regulatory Frameworks**\n\nTell me about the technical foundations of your work:\n- What laws, codes or regulations do you apply most frequently?\n- Are there specific articles or rules that are essential?`,
      es: `**Paso 5 de 5 — Marcos Legales y Regulatorios**\n\nCuéntame sobre las bases técnicas de tu trabajo:\n- ¿Qué leyes, códigos o reglamentos aplicas con más frecuencia?\n- ¿Hay artículos o reglas específicas que son esenciales?`
    }
  },
]

export async function interviewChat(history, userMessage, currentStep, lang = 'en') {
  const isEs = lang === 'es'
  const nextStepData = STEPS[currentStep]

  const nextQuestionInstruction = nextStepData
    ? (isEs
        ? `\n\nDespués de validar brevemente la respuesta anterior (1-2 oraciones), presenta EXACTAMENTE esta pregunta:\n\n${nextStepData.question.es}`
        : `\n\nAfter briefly validating the previous answer (1-2 sentences), present EXACTLY this question:\n\n${nextStepData.question.en}`)
    : (isEs
        ? `\n\nDi exactamente: "¡Perfecto! Ya tengo toda la información. Voy a generar tu skill ahora..."`
        : `\n\nSay exactly: "Perfect! I now have all the information I need. Generating your skill now..."`)

const system = (isEs
    ? `Eres el asistente de SkillMint. REGLA ABSOLUTA: Solo puedes hacer la pregunta que está en el script. Nunca improvises preguntas diferentes. Valida en 1 oración y presenta la siguiente pregunta EXACTAMENTE como está escrita.`
    : `You are the SkillMint assistant. ABSOLUTE RULE: You can ONLY ask the question provided in the script. NEVER improvise different questions. Validate in 1 sentence then present the next question EXACTLY as written. Do not change, rephrase or replace the scripted question.`)
    + nextQuestionInstruction

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 600,
    system,
    messages: [...history, { role: 'user', content: userMessage }]
  })

  return {
    reply: response.content[0].text,
    nextStep: nextStepData?.step || null,
    isComplete: !nextStepData
  }
}

export async function generateSkillJSON(answers, profile, lang = 'en') {
  const isEs = lang === 'es'
  const prompt = `You are a skill architect for SkillMint.
Based on these interview answers, generate a complete skill definition JSON.

## Answers:
${Object.entries(answers).map(([k, v]) => `**${k}**:\n${v}`).join('\n\n')}

## Profile:
${profile ? JSON.stringify(profile, null, 2) : 'Anonymous creator'}

Return ONLY valid JSON (no markdown) with this schema:
{
  "id": "skill_{category}_{name}_v1",
  "name": "string in ${isEs ? 'Spanish' : 'English'}",
  "category": "legal|accounting|medical|engineering|compliance|tax|finance|other",
  "version": "1.0",
  "language": "${lang}",
  "system_prompt": "detailed system prompt min 200 words in ${isEs ? 'Spanish' : 'English'}",
  "knowledge": ["15-30 key facts"],
  "input_schema": { "query": "question or document to analyze", "context": "optional context" },
  "output_schema": { "analysis": "main analysis", "risks": "identified risks", "recommendations": "specific recommendations", "references": "applicable laws" },
  "examples": [{ "input": { "query": "example" }, "expected_output_summary": "brief description" }],
  "capabilities": ["3-6 items"],
  "limitations": ["2-4 items"],
  "tags": ["searchable tags"]
}`

  const msg = await claude.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  })

  const raw = msg.content[0].text.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(raw)
}
