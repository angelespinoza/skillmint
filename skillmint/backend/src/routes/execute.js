import { Hono } from 'hono'
import { waitForSkillCalled } from '../lib/chain.js'
import { executeSkill } from '../services/executor.js'
import { incrementCallCount, supabase } from '../lib/db.js'

const app = new Hono()

app.post('/call', async (c) => {
  try {
    const { skillId, requestId, input } = await c.req.json()
    if (!skillId || !requestId || !input) {
      return c.json({ error: 'skillId, requestId, input required' }, 400)
    }

    const { data } = await supabase
      .from('skills')
      .select('skill_ipfs')
      .eq('skill_id', skillId)
      .single()

    const skillIpfsHash = data?.skill_ipfs
    console.log('[execute] skillId:', skillId, 'ipfs:', skillIpfsHash)

    await waitForSkillCalled(requestId, 60_000)
    console.log('[execute] Payment confirmed')

    const result = await executeSkill(skillIpfsHash, input)
    console.log('[execute] Done')

    await incrementCallCount(skillId).catch(console.error)
    return c.json({ ...result, requestId })

  } catch (err) {
    console.error('[execute ERROR]', err.message)
    if (err.message === 'Payment event timeout') {
      return c.json({ error: 'Payment not confirmed on-chain within timeout' }, 402)
    }
    return c.json({ error: err.message }, 500)
  }
})

export default app

app.post('/licensed', async (c) => {
  try {
    const { skillId, input, holderAddress } = await c.req.json()
    if (!skillId || !input || !holderAddress) {
      return c.json({ error: 'Missing required fields' }, 400)
    }
    const { data } = await supabase
      .from('skills')
      .select('skill_ipfs')
      .eq('skill_id', skillId)
      .single()
    const skillIpfsHash = data?.skill_ipfs
    console.log('[execute/licensed] skillId:', skillId, 'holder:', holderAddress)
    const result = await executeSkill(skillIpfsHash, input)
    await incrementCallCount(skillId).catch(console.error)
    return c.json({ ...result, licensedBy: holderAddress })
  } catch (err) {
    console.error('[execute/licensed ERROR]', err.message)
    return c.json({ error: err.message }, 500)
  }
})
