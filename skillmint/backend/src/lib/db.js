import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
)

export async function upsertSkill(skillId, data) {
  const { error } = await supabase
    .from('skills')
    .upsert({ skill_id: skillId, ...data }, { onConflict: 'skill_id' })
  if (error) throw error
}

export async function getSkillIndex(skillId) {
  const { data, error } = await supabase
    .from('skills').select('*').eq('skill_id', skillId).single()
  if (error) throw error
  return data
}

export async function listSkills({ category, limit = 20, offset = 0 } = {}) {
  let q = supabase.from('skills').select('*')
    .eq('active', true)
    .order('total_calls', { ascending: false })
    .range(offset, offset + limit - 1)
  if (category && category !== 'all') q = q.eq('category', category)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function incrementCallCount(skillId) {
  const { error } = await supabase
    .from('skills')
    .update({ total_calls: supabase.rpc('increment_calls', { sid: skillId }) })
    .eq('skill_id', skillId)
  if (error) console.error('incrementCallCount error:', error.message)
}
