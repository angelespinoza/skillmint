'use client'
import { Navbar, Btn, Badge } from '../components/ui'
import { useI18n } from '../lib/i18n'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const { t } = useI18n()
  const router = useRouter()
  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <Navbar />
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'70px 32px 60px', textAlign:'center', position:'relative' }}>
        <div style={{ position:'absolute', top:0, left:'50%', transform:'translateX(-50%)', width:600, height:400, background:'radial-gradient(ellipse at 50% 0%,rgba(127,119,221,0.18) 0%,transparent 70%)', pointerEvents:'none' }} />
        <Badge color="purple" style={{ marginBottom:16 }}>{t('landing.badge')}</Badge>
        <h1 style={{ fontFamily:'var(--font-heading)', fontSize:'clamp(34px,5vw,62px)', fontWeight:800, lineHeight:1.05, letterSpacing:'-2px', marginBottom:18 }}>
          Your expertise.<br/><span style={{ color:'var(--purple)' }}>On-chain.</span> Forever.
        </h1>
        <p style={{ fontSize:17, color:'var(--text2)', maxWidth:500, marginBottom:32, lineHeight:1.7 }}>{t('landing.sub')}</p>
        <div style={{ display:'flex', gap:12, marginBottom:56, flexWrap:'wrap', justifyContent:'center' }}>
          <Btn size="lg" onClick={() => router.push('/onboarding')}>{t('landing.cta1')}</Btn>
          <Btn size="lg" variant="outline" onClick={() => router.push('/marketplace')}>{t('landing.cta2')}</Btn>
        </div>
        <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden' }}>
          {[
            { num:'1,240', label:t('landing.stat1') },
            { num:'48.3K', label:t('landing.stat2') },
            { num:'$92,400', label:t('landing.stat3') },
            { num:'312', label:t('landing.stat4') },
          ].map(({ num, label }, i) => (
            <div key={i} style={{ padding:'14px 26px', textAlign:'center', borderRight: i<3 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:700 }}>{num}</div>
              <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
