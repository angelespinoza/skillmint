import { Hono } from 'hono'
import { registry } from '../lib/chain.js'
import { fetchJSON } from '../lib/ipfs.js'
import { listSkills, getSkillIndex } from '../lib/db.js'

const app = new Hono()

app.get('/', async (c) => {
  try {
    const category = c.req.query('category')
    const limit    = parseInt(c.req.query('limit')  || '20')
    const offset   = parseInt(c.req.query('offset') || '0')
    const skills   = await listSkills({ category, limit, offset })
    return c.json({ skills, count: skills.length })
  } catch (err) { return c.json({ error: err.message }, 500) }
})

app.get('/:id', async (c) => {
  try {
    const skillId = parseInt(c.req.param('id'))
    const onChain = await registry.getSkill(skillId)
    const indexed = await getSkillIndex(skillId).catch(() => null)
    let profile = null
    if (!onChain.isAnonymous && onChain.profileIpfsHash) {
      profile = await fetchJSON(onChain.profileIpfsHash).catch(() => null)
    }
    return c.json({
      id: skillId, name: onChain.name, category: onChain.category,
      skillIpfsHash: onChain.skillIpfsHash,
      pricePerCall: onChain.pricePerCall.toString(),
      licensePrice: onChain.licensePrice.toString(),
      isAnonymous: onChain.isAnonymous, active: onChain.active,
      totalCalls: indexed?.total_calls ?? onChain.totalCalls.toString(),
      creator: onChain.isAnonymous ? { anonymous: true } : { address: onChain.owner, profile }
    })
  } catch (err) { return c.json({ error: err.message }, 500) }
})

app.get('/:id/definition', async (c) => {
  try {
    const skillId = parseInt(c.req.param('id'))
    const onChain = await registry.getSkill(skillId)
    const def     = await fetchJSON(onChain.skillIpfsHash)
    const { system_prompt, ...publicDef } = def
    return c.json(publicDef)
  } catch (err) { return c.json({ error: err.message }, 500) }
})

export default app
