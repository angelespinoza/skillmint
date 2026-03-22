import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import skillRoutes   from './routes/skills.js'
import executeRoutes from './routes/execute.js'
import buildRoutes   from './routes/build.js'
import licenseRoutes from './routes/license.js'

const app = new Hono()
app.use('*', cors({ origin: '*' }))
app.use('*', logger())
app.get('/health', (c) => c.json({ ok: true, ts: Date.now() }))
app.route('/skills',  skillRoutes)
app.route('/build',   buildRoutes)
app.route('/execute', executeRoutes)
app.route('/license', licenseRoutes)

const PORT = process.env.PORT || 3001
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`SkillMint backend running on :${PORT}`)
})
