'use client'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useI18n } from '../../lib/i18n'
import Link from 'next/link'

export function Btn({ children, variant='primary', size='md', onClick, disabled, style, type }) {
  const variants = {
    primary:   { background:'var(--purple)', color:'#fff', border:'none' },
    secondary: { background:'var(--bg3)', color:'var(--text)', border:'1px solid var(--border2)' },
    outline:   { background:'transparent', color:'var(--purple)', border:'1px solid var(--purple)' },
    teal:      { background:'var(--teal)', color:'#fff', border:'none' },
    amber:     { background:'var(--amber-light)', color:'#000', border:'none' },
  }
  return (
    <button style={{
      display:'inline-flex', alignItems:'center', gap:6,
      padding: size==='lg' ? '12px 26px' : '8px 16px',
      borderRadius: size==='lg' ? 11 : 9,
      fontSize: size==='lg' ? 15 : 14,
      fontWeight:500, cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, transition:'.2s',
      fontFamily:'var(--font-body)',
      ...variants[variant], ...style,
    }} onClick={onClick} disabled={disabled} type={type}>{children}</button>
  )
}

export function Badge({ children, color='purple' }) {
  return <span className={`badge badge-${color}`}>{children}</span>
}

export function Divider() {
  return <div className="divider" />
}

export function LangToggle() {
  const { lang, setLang } = useI18n()
  return (
    <div style={{ display:'flex', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, overflow:'hidden' }}>
      {['en','es'].map(l => (
        <button key={l} onClick={() => setLang(l)} style={{
          padding:'5px 12px', fontSize:13, fontWeight:500, cursor:'pointer',
          border:'none', fontFamily:'var(--font-body)', transition:'.2s',
          background: lang===l ? 'var(--purple)' : 'transparent',
          color: lang===l ? '#fff' : 'var(--text3)',
        }}>{l.toUpperCase()}</button>
      ))}
    </div>
  )
}

export function Navbar({ active }) {
  const { t } = useI18n()
  return (
    <nav style={{
      position:'sticky', top:0, zIndex:100,
      background:'rgba(15,15,18,0.85)', backdropFilter:'blur(16px)',
      borderBottom:'1px solid var(--border)',
      display:'flex', alignItems:'center', padding:'0 24px', height:60, gap:20, flexShrink:0,
    }}>
      <Link href="/" style={{ fontFamily:'var(--font-heading)', fontWeight:800, fontSize:18, color:'var(--text)', display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ width:28, height:28, background:'var(--purple)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>S</span>
        SkillMint
      </Link>
      <div style={{ display:'flex', gap:4, marginLeft:8 }}>
        {[
          { key:'browse', label:t('nav.browse'), href:'/marketplace' },
          { key:'build',  label:t('nav.build'),  href:'/onboarding'  },
          { key:'dashboard', label:t('nav.dashboard'), href:'/dashboard' },
        ].map(({ key, label, href }) => (
          <Link key={key} href={href} style={{
            padding:'6px 12px', borderRadius:8, fontSize:14,
            color: active===key ? 'var(--text)' : 'var(--text2)',
            background: active===key ? 'var(--bg3)' : 'transparent',
          }}>{label}</Link>
        ))}
      </div>
      <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
        <LangToggle />
        <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
      </div>
    </nav>
  )
}
