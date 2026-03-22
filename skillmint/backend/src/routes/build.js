import { Hono } from 'hono'
import { uploadJSON } from '../lib/ipfs.js'
import { upsertSkill } from '../lib/db.js'
import { generateSkillJSON, interviewChat } from '../services/builder.js'

const app = new Hono()

app.post('/chat', async (c) => {
  try {
    const { history = [], message, step = 0, lang = 'en' } = await c.req.json()
    if (!message) return c.json({ error: 'message required' }, 400)
    const result = await interviewChat(history, message, step, lang)
    return c.json(result)
  } catch (err) { return c.json({ error: err.message }, 500) }
})

app.post('/generate', async (c) => {
  try {
    const { answers, profile, isAnonymous = false, lang = 'en' } = await c.req.json()
    if (!answers) return c.json({ error: 'answers required' }, 400)
    const skillDef = await generateSkillJSON(answers, isAnonymous ? null : profile, lang)
    const skillIpfsHash = await uploadJSON(skillDef, `skillmint-${skillDef.id}`)
    let profileIpfsHash = ''
    if (!isAnonymous && profile) {
      profileIpfsHash = await uploadJSON({
        name: profile.name, title: profile.title, years: profile.years,
        location: profile.location, bio: profile.bio,
        credentials: profile.credentials, linkedin: profile.linkedin || null,
      }, `skillmint-profile-${Date.now()}`)
    }
    return c.json({ skillIpfsHash, profileIpfsHash, skillDef })
  } catch (err) { return c.json({ error: err.message }, 500) }
})

app.post('/index', async (c) => {
  try {
    const body = await c.req.json()
    const { skillId, name, category, skillIpfsHash, profileIpfsHash, pricePerCall, licensePrice, isAnonymous, ownerAddress } = body
    if (!skillId || !name || !skillIpfsHash) return c.json({ error: 'Missing fields' }, 400)
    await upsertSkill(skillId, {
      name,
      category,
      skill_ipfs:     skillIpfsHash,
      profile_ipfs:   profileIpfsHash || null,
      price_per_call: pricePerCall,
      license_price:  licensePrice || null,
      is_anonymous:   isAnonymous,
      owner_address:  isAnonymous ? null : ownerAddress,
      creator_name:   isAnonymous ? null : (body.creator_name || null),
      creator_title:  isAnonymous ? null : (body.creator_title || null),
      active:         true
    })
    return c.json({ ok: true, skillId })
  } catch (err) { return c.json({ error: err.message }, 500) }
})

export default app
