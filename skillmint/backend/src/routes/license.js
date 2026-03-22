import { Hono } from 'hono'
import { licenseContract } from '../lib/chain.js'

const app = new Hono()

app.get('/check/:skillId/:address', async (c) => {
  try {
    const skillId = parseInt(c.req.param('skillId'))
    const address = c.req.param('address')
    const has   = await licenseContract.hasLicense(skillId, address)
    const count = has ? await licenseContract.licenseCount(skillId, address) : 0
    return c.json({ skillId, address, hasLicense: has, count: count.toString() })
  } catch (err) { return c.json({ error: err.message }, 500) }
})

export default app
