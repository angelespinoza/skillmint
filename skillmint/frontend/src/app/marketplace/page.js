'use client'
import { useState, useEffect } from 'react'
import { Navbar, Badge, Btn } from '../../components/ui'
import { api } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['all','legal','finance','medical','accounting','compliance','tax','engineering']

export default function MarketplacePage() {
  const { t, lang } = useI18n()
  const router = useRouter()
  const [skills, setSkills] = useState([])
  const [category, setCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    api.listSkills({ category })
      .then(r => setSkills(r.skills || []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [category])

  const fmt = (wei) => { try { return parseFloat(Number(BigInt(wei)) / 1e18).toFixed(3) } catch { return '—' } }

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <Navbar active="browse" />
      <div style={{ padding:24, flex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
          <div style={{ fontFamily:'var(--font-heading)', fontSize:22, fontWeight:700 }}>{t('market.title')}</div>
        </div>
        <div style={{ display:'flex', gap:7, marginBottom:18, flexWrap:'wrap' }}>
          {CATEGORIES.map(c => (
            <button key={c} onClick={() => setCategory(c)} style={{
              padding:'5px 13px', borderRadius:20, fontSize:13, cursor:'pointer', fontFamily:'var(--font-body)',
              border:`1px solid ${category===c ? 'rgba(127,119,221,0.3)' : 'var(--border)'}`,
              background: category===c ? 'var(--purple-faint)' : 'transparent',
              color: category===c ? 'var(--purple-light)' : 'var(--text2)',
            }}>{c === 'all' ? t('market.all') : c.charAt(0).toUpperCase()+c.slice(1)}</button>
          ))}
        </div>
        <div style={{ fontSize:11, color:'var(--text3)', marginBottom:14, textTransform:'uppercase', letterSpacing:'.5px' }}>{t('market.top')}</div>
        {loading ? (
          <div style={{ color:'var(--text3)', fontSize:13 }}>Loading skills...</div>
        ) : skills.length === 0 ? (
          <div style={{ color:'var(--text3)', fontSize:13 }}>No skills found. <span style={{ color:'var(--purple)', cursor:'pointer' }} onClick={() => router.push('/onboarding')}>Be the first to create one →</span></div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:13 }}>
            {skills.map(skill => (
              <div key={skill.skill_id} onClick={() => router.push(`/skills/${skill.skill_id}`)}
                style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:16, cursor:'pointer', transition:'.2s', display:'flex', flexDirection:'column', gap:9 }}
                onMouseEnter={e => { e.currentTarget.style.borderColor='var(--border2)'; e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='translateY(0)' }}
              >
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <Badge color={{ legal:'purple', finance:'teal', medical:'coral', tax:'amber' }[skill.category] || 'purple'}>{skill.category}</Badge>
                </div>
                <div style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:14 }}>{skill.name}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:18, height:18, borderRadius:'50%', background:'var(--bg4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10 }}>
                    {skill.is_anonymous ? '🕵️' : '👤'}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text)', fontWeight:500 }}>
                    {skill.is_anonymous ? (lang==='es' ? 'Creador Anónimo' : 'Anonymous Creator') : (skill.creator_name || `${skill.owner_address?.slice(0,8)}...`)}
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:9, borderTop:'1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontFamily:'var(--font-heading)', fontWeight:700, fontSize:14 }}>
                      {fmt(skill.price_per_call)} AVAX <span style={{ fontSize:11, color:'var(--text3)', fontWeight:400, fontFamily:'var(--font-body)' }}>{t('card.call')}</span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{(skill.total_calls||0).toLocaleString()} {t('card.calls')}</div>
                  </div>
                  <Btn style={{ fontSize:12, padding:'5px 11px' }}>{t('card.cta')}</Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
