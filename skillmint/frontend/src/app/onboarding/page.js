'use client'
import { useState } from 'react'
import { Navbar, Btn } from '../../components/ui'
import { useI18n } from '../../lib/i18n'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const { t, lang } = useI18n()
  const router = useRouter()
  const [slide, setSlide] = useState(0)
  const [price, setPrice] = useState(3)
  const [calls, setCalls] = useState(1000)
  const avax = ((price/1000)*calls*0.9).toFixed(2)
  const usd = (avax*40).toFixed(0)

  const slides = [
    { icon:'🧠', bg:'var(--purple-faint)', border:'rgba(127,119,221,0.2)', title:t('ob.s0.title'), body:t('ob.s0.body'), next:t('ob.gotit'), back:t('ob.backhome'), backAction:()=>router.push('/') },
    { icon:'🤖', bg:'var(--teal-faint)',   border:'rgba(29,158,117,0.2)',   title:t('ob.s1.title'), body:t('ob.s1.body'), next:t('ob.sense'), back:t('ob.back') },
    { icon:'💰', bg:'var(--amber-faint)',  border:'rgba(165,126,0,0.25)',   title:t('ob.s2.title'), body:t('ob.s2.body'), next:t('ob.want'),  back:t('ob.back') },
    { icon:'🚀', bg:'var(--purple-faint)', border:'rgba(127,119,221,0.25)', title:t('ob.s3.title'), body:t('ob.s3.body'), next:t('ob.s3.cta'),back:t('ob.back'), nextAction:()=>router.push('/builder') },
  ]
  const s = slides[slide]

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <Navbar />
      <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'36px 20px 100px', maxWidth:740, margin:'0 auto', width:'100%' }}>
        <div style={{ display:'flex', gap:8, marginBottom:32 }}>
          {slides.map((_,i) => <div key={i} style={{ width:slide===i?24:8, height:8, borderRadius:slide===i?4:'50%', background:slide===i?'var(--purple)':i<slide?'var(--teal)':'var(--bg4)', transition:'.3s' }} />)}
        </div>
        <div style={{ width:68, height:68, borderRadius:20, fontSize:30, marginBottom:20, display:'flex', alignItems:'center', justifyContent:'center', background:s.bg, border:`1px solid ${s.border}` }}>{s.icon}</div>
        <h2 style={{ fontFamily:'var(--font-heading)', fontSize:24, fontWeight:800, letterSpacing:'-.5px', marginBottom:10, textAlign:'center' }}>{s.title}</h2>
        <p style={{ fontSize:15, color:'var(--text2)', lineHeight:1.75, maxWidth:500, marginBottom:24, textAlign:'center' }}>{s.body}</p>

        {slide === 2 && (
          <div style={{ width:'100%', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:18, marginBottom:24 }}>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:12 }}>{t('ob.s2.calc')}</div>
            <div style={{ display:'flex', gap:12, marginBottom:14, flexWrap:'wrap' }}>
              <div style={{ flex:1, minWidth:120 }}>
                <div style={{ fontSize:12, color:'var(--text3)', marginBottom:5 }}>{t('ob.s2.price')}</div>
                <input type="range" min="1" max="10" value={price} onChange={e=>setPrice(Number(e.target.value))} style={{ width:'100%', accentColor:'var(--purple)' }} />
                <div style={{ fontSize:13, fontWeight:500, marginTop:3, color:'var(--purple-light)' }}>{(price/1000).toFixed(3)} AVAX</div>
              </div>
              <div style={{ flex:1, minWidth:120 }}>
                <div style={{ fontSize:12, color:'var(--text3)', marginBottom:5 }}>{t('ob.s2.calls')}</div>
                <input type="range" min="100" max="5000" value={calls} step="100" onChange={e=>setCalls(Number(e.target.value))} style={{ width:'100%', accentColor:'var(--teal)' }} />
                <div style={{ fontSize:13, fontWeight:500, marginTop:3, color:'var(--teal-light)' }}>{calls.toLocaleString()} {t('ob.s2.callslbl')}</div>
              </div>
            </div>
            <div style={{ background:'var(--teal-faint)', borderRadius:8, padding:'12px 16px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <div>
                <div style={{ fontSize:13, color:'var(--teal-light)', marginBottom:2 }}>{t('ob.s2.monthly')}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{t('ob.s2.direct')}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--font-heading)', fontSize:22, fontWeight:800, color:'var(--teal)' }}>{avax} AVAX</div>
                <div style={{ fontSize:12, color:'var(--text3)' }}>≈ ${usd} / {lang==='es'?'mes':'month'}</div>
              </div>
            </div>
          </div>
        )}

        {slide === 3 && (
          <div style={{ width:'100%', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:24 }}>
            {[
              { icon:'🎙️', t:t('ob.s3.c1t'), s:t('ob.s3.c1s') },
              { icon:'⚙️', t:t('ob.s3.c2t'), s:t('ob.s3.c2s') },
              { icon:'📦', t:t('ob.s3.c3t'), s:t('ob.s3.c3s') },
              { icon:'⛓️', t:t('ob.s3.c4t'), s:t('ob.s3.c4s') },
            ].map(({ icon, t:title, s:sub }) => (
              <div key={title} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:14 }}>
                <div style={{ fontSize:17, marginBottom:6 }}>{icon}</div>
                <div style={{ fontWeight:500, fontSize:13, marginBottom:3 }}>{title}</div>
                <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>{sub}</div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display:'flex', gap:10, width:'100%', maxWidth: slide===3 ? '100%' : 380 }}>
          <Btn variant="secondary" style={{ flex:1, justifyContent:'center' }} onClick={s.backAction || (()=>setSlide(s=>s-1))}>{s.back}</Btn>
          <Btn style={{ flex: slide===3?3:2, justifyContent:'center' }} size={slide===3?'lg':'md'} onClick={s.nextAction || (()=>setSlide(s=>s+1))}>{s.next}</Btn>
        </div>
      </div>
    </div>
  )
}
