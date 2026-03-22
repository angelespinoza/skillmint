'use client'
import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { Navbar, Badge, Btn } from '../../components/ui'
import { api } from '../../lib/api'
import { useI18n } from '../../lib/i18n'
import { useRouter } from 'next/navigation'

const VALS = [12,18,14,22,16,28,24,19,30,26,22,35,28,32,24,38,30,42,36,28,44,38,50,42,36,48,40,55,47,52]

export default function DashboardPage() {
  const { address } = useAccount()
  const { t, lang } = useI18n()
  const router = useRouter()
  const [skills, setSkills] = useState([])
  const maxV = Math.max(...VALS)

  useEffect(() => {
    api.listSkills({ limit:10 }).then(r => setSkills(r.skills||[])).catch(console.error)
  }, [])

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <Navbar active="dashboard" />
      <div style={{ padding:24, flex:1, display:'flex', flexDirection:'column', gap:18 }}>
        <div>
          <div style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:700 }}>{t('dash.hey')} {address ? `${address.slice(0,6)}...` : '—'} 👋</div>
          <div style={{ fontSize:12, color:'var(--text3)', marginTop:3 }}>{address || 'Connect wallet'} · Avalanche Fuji</div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:11 }}>
          {[
            { icon:'💰', val:'12.4 AVAX', label:t('dash.earnings'), chg:`↑ +2.1 ${t('dash.thismonth')}`, bg:'var(--teal-faint)' },
            { icon:'⚡', val:skills.length||0, label:t('dash.published'), chg:`2 ${t('dash.active')}`, bg:'var(--purple-faint)' },
            { icon:'📊', val:'847', label:t('dash.calls'), chg:`↑ +34% ${t('dash.vslast')}`, bg:'var(--amber-faint)' },
            { icon:'🕐', val:'1.2s', label:t('dash.avgtime'), chg:t('dash.allavg'), bg:'var(--teal-faint)' },
          ].map(({ icon, val, label, chg, bg }) => (
            <div key={label} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:16 }}>
              <div style={{ width:32, height:32, borderRadius:8, background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, marginBottom:9 }}>{icon}</div>
              <div style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:700 }}>{val}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{label}</div>
              <div style={{ fontSize:12, color:'var(--teal)', marginTop:3 }}>{chg}</div>
            </div>
          ))}
        </div>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:18 }}>
          <div style={{ fontFamily:'var(--font-heading)', fontSize:13, fontWeight:700, marginBottom:14 }}>{t('dash.chart')}</div>
          <div style={{ height:100, display:'flex', alignItems:'flex-end', gap:4 }}>
            {VALS.map((v,i) => (
              <div key={i} style={{ flex:1, height:`${(v/maxV)*100}%`, borderRadius:'3px 3px 0 0', background: i===VALS.length-1 ? 'var(--purple)' : 'var(--purple-faint)', border:`1px solid ${i===VALS.length-1 ? 'var(--purple)' : 'rgba(127,119,221,0.2)'}` }} />
            ))}
          </div>
        </div>
        <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 100px', padding:'9px 16px', fontSize:11, color:'var(--text3)', borderBottom:'1px solid var(--border)', textTransform:'uppercase', letterSpacing:'.5px' }}>
            {[t('table.skill'),t('table.calls'),t('table.earnings'),t('table.status'),t('table.actions')].map(h=><span key={h}>{h}</span>)}
          </div>
          {skills.length === 0 ? (
            <div style={{ padding:24, textAlign:'center', color:'var(--text3)', fontSize:13 }}>
              {lang==='es' ? 'No hay skills aún.' : 'No skills yet.'}{' '}
              <span style={{ color:'var(--purple)', cursor:'pointer' }} onClick={()=>router.push('/onboarding')}>
                {lang==='es' ? 'Crear uno →' : 'Create one →'}
              </span>
            </div>
          ) : skills.map(skill => (
            <div key={skill.skill_id} style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 100px', padding:'11px 16px', fontSize:13, borderBottom:'1px solid var(--border)', alignItems:'center' }}>
              <div><div style={{ fontWeight:500 }}>{skill.name}</div><Badge color="purple">{skill.category}</Badge></div>
              <div style={{ color:'var(--text2)' }}>{(skill.total_calls||0).toLocaleString()}</div>
              <div style={{ color:'var(--teal)', fontWeight:500 }}>—</div>
              <div><div style={{ width:36, height:20, borderRadius:10, background:skill.active?'var(--teal)':'var(--bg4)', position:'relative' }}><div style={{ width:14, height:14, borderRadius:'50%', background:'#fff', position:'absolute', top:3, right:skill.active?3:'auto', left:skill.active?'auto':3 }} /></div></div>
              <div style={{ display:'flex', gap:5 }}>
                <Btn variant="secondary" style={{ fontSize:12, padding:'4px 9px' }} onClick={()=>router.push(`/skills/${skill.skill_id}`)}>{t('table.view')}</Btn>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
