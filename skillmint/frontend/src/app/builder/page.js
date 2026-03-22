'use client'
import { useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'
import { parseEther } from 'viem'
import { Navbar, Btn, Divider } from '../../components/ui'
import { useI18n } from '../../lib/i18n'
import { useRouter } from 'next/navigation'
import { api } from '../../lib/api'
import { CONTRACTS, REGISTRY_ABI } from '../../lib/wagmi'

const AVATARS = ['👨‍💼','👩‍💼','👨‍⚕️','👩‍⚕️','👨‍🏫','👩‍🔬','🧑‍💻','🧑‍⚖️']

const STEPS = {
  en: ['Your Profile', 'Knowledge', 'Deploy'],
  es: ['Tu Perfil',    'Conocimiento', 'Publicar'],
}

const FIRST_Q = {
  en: "Hi! I'm Claude. I'll help you build your AI skill in 5 quick questions.\n\n**Step 1 of 5 — Your Specialty**\n\nTell me about your professional background:\n- What is your exact area of expertise?\n- In which country or jurisdiction do you primarily operate?\n- How many years of experience do you have?",
  es: "¡Hola! Soy Claude. Te ayudaré a construir tu skill en 5 preguntas.\n\n**Paso 1 de 5 — Tu Especialidad**\n\nCuéntame sobre tu experiencia profesional:\n- ¿Cuál es tu área de expertise exacta?\n- ¿En qué país o jurisdicción operas principalmente?\n- ¿Cuántos años de experiencia tienes?",
}

const KEYS = ['specialty','frequent_queries','common_mistakes','case_examples','frameworks']

export default function BuilderPage() {
  const { lang, t } = useI18n()
  const { address } = useAccount()
  const router = useRouter()
  const { writeContractAsync } = useWriteContract()

  const [step, setStep] = useState(0)
  const [anon, setAnon] = useState(false)
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [profile, setProfile] = useState({ name:'', title:'', years:'', location:'', bio:'', credentials:'', linkedin:'' })
  const [messages, setMessages] = useState([{ role:'assistant', content: FIRST_Q['en'] }])
  const [input, setInput] = useState('')
  const [chatStep, setChatStep] = useState(0)
  const [answers, setAnswers] = useState({})
  const [chatLoading, setChatLoading] = useState(false)
  const [skillDef, setSkillDef] = useState(null)
  const [skillIpfs, setSkillIpfs] = useState('')
  const [profileIpfs, setProfileIpfs] = useState('')
  const [genError, setGenError] = useState('')
  const [pricePerCall, setPricePerCall] = useState('0.001')
  const [licensePrice, setLicensePrice] = useState('0.25')
  const [nftEnabled, setNftEnabled] = useState(true)
  const [indexed, setIndexed] = useState(false)
  const [indexing, setIndexing] = useState(false)
  const [txHash, setTxHash] = useState('')

  const setP = (k) => (e) => setProfile(p => ({ ...p, [k]: e.target.value }))

  const inputStyle = {
    background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:9,
    padding:'9px 13px', color:'var(--text)', fontFamily:'var(--font-body)',
    fontSize:13, outline:'none', width:'100%', transition:'.2s'
  }

  const sidebarStep = step === 0 ? 0 : step >= 6 ? 2 : 1
  const steps = STEPS[lang]

  const handleProfileNext = () => {
    setMessages([{ role:'assistant', content: FIRST_Q[lang] }])
    setStep(1)
  }

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return
    const userMsg = input.trim()
    setInput('')
    const key = KEYS[chatStep]
    const newAnswers = { ...answers, [key]: userMsg }
    setAnswers(newAnswers)
    const newMessages = [...messages, { role:'user', content: userMsg }]
    setMessages(newMessages)
    setChatLoading(true)
    try {
      const history = newMessages.map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }))
      const res = await api.buildChat({ history: history.slice(0, -1), message: userMsg, step: chatStep + 1, lang })
      setMessages(prev => [...prev, { role:'assistant', content: res.reply }])
      setChatStep(s => s + 1)
      if (res.isComplete) {
        setTimeout(() => { setStep(6); generateSkill(newAnswers) }, 1500)
      }
    } catch (err) {
      setMessages(prev => [...prev, { role:'assistant', content: lang==='es' ? '⚠️ Error de conexión. Intenta de nuevo.' : '⚠️ Connection error. Try again.' }])
    } finally {
      setChatLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }

  const generateSkill = async (ans) => {
    setGenError('')
    try {
      const result = await api.buildGenerate({ answers: ans, profile: anon ? null : profile, isAnonymous: anon, lang })
      setSkillDef(result.skillDef)
      setSkillIpfs(result.skillIpfsHash)
      setProfileIpfs(result.profileIpfsHash)
      setStep(7)
    } catch (err) {
      setGenError(err.message)
      setStep(1)
    }
  }

  const handlePublish = async () => {
    if (!skillDef) return
    if (!address) {
      alert(lang === 'es' ? 'Conecta tu wallet primero' : 'Connect your wallet first')
      return
    }
    setIndexing(true)
    try {
      const ppcWei = parseEther(pricePerCall)
      const lpWei  = nftEnabled ? parseEther(licensePrice) : 0n

      // 1. Register on-chain
      const hash = await writeContractAsync({
        address:      CONTRACTS.registry,
        abi:          REGISTRY_ABI,
        functionName: 'registerSkill',
        args: [skillIpfs, profileIpfs || '', skillDef.name, skillDef.category, ppcWei, lpWei, anon],
      })
      setTxHash(hash)

      // 2. Wait for receipt and parse real skillId from SkillRegistered event
      const { createPublicClient, http, decodeEventLog } = await import('viem')
      const { avalancheFuji } = await import('wagmi/chains')
      const publicClient = createPublicClient({
        chain: avalancheFuji,
        transport: http(process.env.NEXT_PUBLIC_RPC_URL)
      })

      const receipt = await publicClient.waitForTransactionReceipt({ hash })

      let realSkillId = Date.now()
      for (const log of receipt.logs) {
        try {
          const decoded = decodeEventLog({
            abi: [{
              name: 'SkillRegistered',
              type: 'event',
              inputs: [
                { name: 'skillId',      type: 'uint256', indexed: true },
                { name: 'owner',        type: 'address', indexed: true },
                { name: 'name',         type: 'string',  indexed: false },
                { name: 'category',     type: 'string',  indexed: false },
                { name: 'pricePerCall', type: 'uint256', indexed: false },
                { name: 'licensePrice', type: 'uint256', indexed: false },
                { name: 'isAnonymous',  type: 'bool',    indexed: false },
              ]
            }],
            data:   log.data,
            topics: log.topics,
          })
          realSkillId = Number(decoded.args.skillId)
          console.log('Real skillId from contract:', realSkillId)
          break
        } catch(e) { /* not this log */ }
      }

      // 3. Index in Supabase with real skillId and profile
      await api.buildIndex({
        skillId:         realSkillId,
        name:            skillDef.name,
        category:        skillDef.category,
        skillIpfsHash:   skillIpfs,
        profileIpfsHash: profileIpfs || '',
        pricePerCall:    ppcWei.toString(),
        licensePrice:    lpWei.toString(),
        isAnonymous:     anon,
        ownerAddress:    address,
        creator_name:    anon ? null : (profile?.name || null),
        creator_title:   anon ? null : (profile?.title || null),
      })

      setIndexed(true)
    } catch (e) {
      console.error(e)
      alert(`Error: ${e.message}`)
    } finally {
      setIndexing(false)
    }
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh' }}>
      <Navbar active="build" />
      <div style={{ display:'flex', flex:1, overflow:'hidden', minHeight:0 }}>

        {/* Sidebar */}
        <div style={{ width:240, flexShrink:0, borderRight:'1px solid var(--border)', padding:18, display:'flex', flexDirection:'column', gap:6, overflowY:'auto' }}>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', padding:'0 10px', marginBottom:5 }}>
            {lang==='es' ? 'Progreso' : 'Progress'}
          </div>
          {steps.map((label, i) => {
            const isActive = i === sidebarStep
            const isDone   = i < sidebarStep
            return (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', borderRadius:10, background: isActive ? 'var(--purple-faint)' : 'transparent', border: isActive ? '1px solid rgba(127,119,221,0.2)' : '1px solid transparent' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:600, background: isDone ? 'var(--teal)' : isActive ? 'var(--purple)' : 'var(--bg4)', color: isDone || isActive ? '#fff' : 'var(--text3)' }}>
                  {isDone ? '✓' : i + 1}
                </div>
                <div style={{ fontSize:13, color: isActive ? 'var(--text)' : 'var(--text2)', fontWeight: isActive ? 500 : 400 }}>{label}</div>
              </div>
            )
          })}
          {step === 1 && (
            <div style={{ marginTop:'auto', padding:11, background:'var(--purple-faint)', border:'1px solid rgba(127,119,221,0.15)', borderRadius:9 }}>
              <div style={{ fontSize:12, color:'var(--purple-light)', fontWeight:500, marginBottom:6 }}>
                {lang==='es' ? `Pregunta ${chatStep + 1} de 5` : `Question ${chatStep + 1} of 5`}
              </div>
              <div style={{ height:3, background:'var(--bg4)', borderRadius:2, overflow:'hidden' }}>
                <div style={{ height:'100%', width:`${(chatStep / 5) * 100}%`, background:'var(--purple)', borderRadius:2, transition:'.5s' }} />
              </div>
            </div>
          )}
        </div>

        {/* Step 0: Profile */}
        {step === 0 && (
          <div style={{ flex:1, overflowY:'auto', padding:'28px 32px', display:'flex', flexDirection:'column' }}>
            <div style={{ fontFamily:'var(--font-heading)', fontSize:19, fontWeight:700, marginBottom:4 }}>
              {lang==='es' ? 'Tu perfil de creador' : 'Your creator profile'}
            </div>
            <div style={{ fontSize:13, color:'var(--text2)', marginBottom:22 }}>
              {lang==='es' ? 'Esta info aparece junto a tu skill en el marketplace.' : 'This info is shown alongside your skill in the marketplace.'}
            </div>
            {/* Anon toggle */}
            <div onClick={() => setAnon(v => !v)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:10, padding:'12px 16px', marginBottom:20, cursor:'pointer' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <span style={{ fontSize:20 }}>🕵️</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:500 }}>{t('builder.pf.anon_title')}</div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>{t('builder.pf.anon_sub')}</div>
                </div>
              </div>
              <div style={{ width:40, height:22, borderRadius:11, position:'relative', background: anon ? 'var(--purple)' : 'var(--bg4)', border:`1px solid ${anon ? 'var(--purple)' : 'var(--border2)'}`, transition:'.3s', flexShrink:0 }}>
                <div style={{ width:16, height:16, borderRadius:'50%', background: anon ? '#fff' : 'var(--text3)', position:'absolute', top:2, left: anon ? 20 : 2, transition:'.3s' }} />
              </div>
            </div>
            {anon ? (
              <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:12, padding:16, marginBottom:16 }}>
                <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:12 }}>
                  {lang==='es' ? 'Cómo aparecerá tu skill' : 'How your skill will appear'}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:'var(--bg4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🕵️</div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:500 }}>{t('builder.pf.anon_name')}</div>
                    <div style={{ fontSize:12, color:'var(--text3)' }}>{t('builder.pf.anon_wallet')}</div>
                  </div>
                  <span className="badge badge-purple" style={{ marginLeft:'auto' }}>{t('builder.pf.anon_badge')}</span>
                </div>
                <div style={{ background:'var(--purple-faint)', border:'1px solid rgba(127,119,221,0.15)', borderRadius:8, padding:'10px 12px', fontSize:12, color:'var(--text2)', lineHeight:1.6 }}>
                  {t('builder.pf.anon_note')}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:'.4px', marginBottom:8, fontWeight:500 }}>
                    {lang==='es' ? 'Elige un avatar' : 'Choose an avatar'}
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    {AVATARS.map(a => (
                      <div key={a} onClick={() => setAvatar(a)} style={{ width:38, height:38, borderRadius:'50%', background:'var(--bg3)', border:`2px solid ${avatar===a ? 'var(--purple)' : 'transparent'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, cursor:'pointer', transition:'.2s' }}>{a}</div>
                    ))}
                  </div>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  {[
                    { k:'name',     label: lang==='es'?'Nombre completo':'Full name',             ph: lang==='es'?'ej. Carlos Mendoza':'e.g. Carlos Mendoza' },
                    { k:'title',    label: lang==='es'?'Título profesional':'Professional title', ph: lang==='es'?'ej. Abogado Comercial':'e.g. Commercial Lawyer' },
                    { k:'years',    label: lang==='es'?'Años de experiencia':'Years of experience', ph:'12', type:'number' },
                    { k:'location', label: lang==='es'?'Ubicación':'Location',                    ph: lang==='es'?'ej. Lima, Perú':'e.g. Lima, Perú' },
                  ].map(({ k, label, ph, type }) => (
                    <div key={k} style={{ display:'flex', flexDirection:'column', gap:6 }}>
                      <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'.4px' }}>{label}</div>
                      <input style={inputStyle} type={type||'text'} placeholder={ph} value={profile[k]} onChange={setP(k)} />
                    </div>
                  ))}
                  <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'.4px' }}>{lang==='es'?'Bio corta':'Short bio'}</div>
                    <textarea style={{ ...inputStyle, resize:'none', lineHeight:1.6 }} rows={3}
                      placeholder={lang==='es'?'Describe tu trayectoria...':'Describe your background...'}
                      value={profile.bio} onChange={setP('bio')} />
                  </div>
                  <div style={{ gridColumn:'1/-1', display:'flex', flexDirection:'column', gap:6 }}>
                    <div style={{ fontSize:11, color:'var(--text3)', fontWeight:500, textTransform:'uppercase', letterSpacing:'.4px' }}>{lang==='es'?'Credenciales':'Credentials'}</div>
                    <input style={inputStyle}
                      placeholder={lang==='es'?'ej. Colegio de Abogados, MBA PUCP':'e.g. Bar Association, MBA'}
                      value={profile.credentials} onChange={setP('credentials')} />
                    <div style={{ fontSize:11, color:'var(--text3)' }}>{lang==='es'?'Separa con comas.':'Separate with commas.'}</div>
                  </div>
                </div>
              </div>
            )}
            <div style={{ marginTop:20, paddingTop:20, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'flex-end' }}>
              <Btn onClick={handleProfileNext}>{t('builder.pf.next')}</Btn>
            </div>
          </div>
        )}

        {/* Step 1: Chat */}
        {step === 1 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
            <div style={{ padding:'12px 18px', borderBottom:'1px solid var(--border)', fontSize:13, color:'var(--text2)' }}>
              {lang==='es' ? 'Claude te guiará paso a paso para construir tu skill' : 'Claude will guide you step by step to build your skill'}
            </div>
            <div style={{ flex:1, overflowY:'auto', padding:18, display:'flex', flexDirection:'column', gap:12 }}>
              {messages.map((msg, i) => (
                <div key={i} style={{ display:'flex', gap:10, maxWidth:'76%', alignSelf: msg.role==='user'?'flex-end':'flex-start', flexDirection: msg.role==='user'?'row-reverse':'row' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, marginTop:2, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, background: msg.role==='user'?'var(--teal-faint)':'var(--purple-faint)', color: msg.role==='user'?'var(--teal-light)':'var(--purple-light)', border:`1px solid ${msg.role==='user'?'rgba(29,158,117,0.2)':'rgba(127,119,221,0.2)'}` }}>
                    {msg.role==='user'?'U':'C'}
                  </div>
                  <div style={{ padding:'9px 13px', borderRadius:13, fontSize:13, lineHeight:1.65, background: msg.role==='user'?'var(--purple-faint)':'var(--bg3)', border:`1px solid ${msg.role==='user'?'rgba(127,119,221,0.15)':'var(--border)'}`, borderTopLeftRadius: msg.role==='user'?13:4, borderTopRightRadius: msg.role==='user'?4:13, whiteSpace:'pre-wrap' }}
                    dangerouslySetInnerHTML={{ __html: msg.content.replace(/\*\*(.*?)\*\*/g,'<strong>$1</strong>') }}
                  />
                </div>
              ))}
              {chatLoading && (
                <div style={{ display:'flex', gap:10, maxWidth:'76%' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--purple-faint)', border:'1px solid rgba(127,119,221,0.2)', fontSize:11, fontWeight:700, color:'var(--purple-light)' }}>C</div>
                  <div style={{ padding:'9px 13px', borderRadius:13, borderTopLeftRadius:4, background:'var(--bg3)', border:'1px solid var(--border)', display:'flex', gap:4, alignItems:'center' }}>
                    {[0,1,2].map(d => <div key={d} style={{ width:6, height:6, borderRadius:'50%', background:'var(--text3)', animation:`bounce .9s ease ${d*0.15}s infinite alternate` }} />)}
                  </div>
                </div>
              )}
            </div>
            {chatStep < 5 && (
              <div style={{ padding:'12px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:10, alignItems:'flex-end' }}>
                <textarea style={{ flex:1, background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:10, padding:'9px 12px', color:'var(--text)', fontFamily:'var(--font-body)', fontSize:13, resize:'none', outline:'none', minHeight:38 }}
                  placeholder={lang==='es'?'Escribe tu respuesta...':'Write your answer...'}
                  value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} rows={1}
                />
                <Btn onClick={sendMessage} disabled={chatLoading || !input.trim()}>
                  {lang==='es'?'Enviar':'Send'}
                </Btn>
              </div>
            )}
          </div>
        )}

        {/* Step 6: Generating */}
        {step === 6 && (
          <div style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20 }}>
            <div style={{ fontSize:40 }}>⚙️</div>
            <div style={{ fontFamily:'var(--font-heading)', fontSize:22, fontWeight:700 }}>
              {lang==='es'?'Generando tu skill...':'Generating your skill...'}
            </div>
            <div style={{ fontSize:13, color:'var(--text2)' }}>
              {lang==='es' ? 'Claude está procesando tus respuestas y subiendo a IPFS...' : 'Claude is processing your answers and uploading to IPFS...'}
            </div>
            {genError && <div style={{ color:'var(--coral)', fontSize:13 }}>⚠️ {genError}</div>}
          </div>
        )}

        {/* Step 7: Deploy */}
        {step === 7 && skillDef && (
          <div style={{ flex:1, display:'flex', gap:18, padding:24, overflowY:'auto' }}>
            <div style={{ flex:1 }}>
              <div style={{ fontFamily:'var(--font-heading)', fontSize:19, fontWeight:700, marginBottom:3 }}>
                {lang==='es'?'Tu skill está listo':'Your skill is ready'}
              </div>
              <div style={{ fontSize:13, color:'var(--text2)', marginBottom:20 }}>
                {lang==='es' ? 'Define el precio y publícalo en el marketplace' : 'Set the price and publish it to the marketplace'}
              </div>
              {/* Skill preview */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden', marginBottom:20 }}>
                <div style={{ padding:'16px 18px', borderBottom:'1px solid var(--border)' }}>
                  <span className="badge badge-purple" style={{ marginBottom:8, display:'inline-flex' }}>{skillDef.category}</span>
                  <div style={{ fontFamily:'var(--font-heading)', fontSize:17, fontWeight:700 }}>{skillDef.name}</div>
                  <div style={{ fontSize:12, color:'var(--text3)', marginTop:4 }}>IPFS: {skillIpfs.slice(0,24)}...</div>
                  {!anon && profile?.name && (
                    <div style={{ fontSize:12, color:'var(--purple-light)', marginTop:4 }}>
                      👤 {profile.name} {profile.title ? `· ${profile.title}` : ''}
                    </div>
                  )}
                </div>
                {skillDef.capabilities && (
                  <div style={{ padding:'14px 18px' }}>
                    <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.5px' }}>
                      {lang==='es'?'Capacidades':'Capabilities'}
                    </div>
                    {skillDef.capabilities.map((c,i) => (
                      <div key={i} style={{ fontSize:13, color:'var(--text2)', padding:'4px 0', borderBottom:'1px solid var(--border)' }}>✓ {c}</div>
                    ))}
                  </div>
                )}
              </div>
              {/* Pricing */}
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20 }}>
                <div style={{ fontFamily:'var(--font-heading)', fontSize:15, fontWeight:700, marginBottom:4 }}>
                  💰 {lang==='es'?'Define el precio de tu skill':'Set your skill pricing'}
                </div>
                <div style={{ fontSize:13, color:'var(--text2)', marginBottom:18 }}>
                  {lang==='es' ? 'Los agentes pagarán en AVAX cada vez que consulten tu skill. Tú recibes el 90%.' : 'Agents pay in AVAX each time they query your skill. You receive 90%.'}
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <div>
                    <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4, fontWeight:500 }}>
                      {lang==='es'?'Precio por llamada (AVAX)':'Price per call (AVAX)'}
                    </div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>
                      {lang==='es'?'Pago cada vez que un agente consulta':'Paid each time an agent queries'}
                    </div>
                    <input type="number" step="0.001" min="0.001" value={pricePerCall}
                      onChange={e=>setPricePerCall(e.target.value)}
                      style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'10px 12px', color:'var(--text)', fontSize:14, fontWeight:600, width:'100%', outline:'none' }} />
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:5 }}>
                      ≈ ${(parseFloat(pricePerCall||0)*40).toFixed(3)} USD
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize:12, color:'var(--text3)', marginBottom:4, fontWeight:500, display:'flex', alignItems:'center', gap:8 }}>
                      {lang==='es'?'Licencia NFT (AVAX)':'NFT License (AVAX)'}
                      <label style={{ display:'flex', alignItems:'center', gap:4, cursor:'pointer', fontSize:11, fontWeight:400 }}>
                        <input type="checkbox" checked={nftEnabled} onChange={e=>setNftEnabled(e.target.checked)} />
                        {lang==='es'?'activar':'enable'}
                      </label>
                    </div>
                    <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8 }}>
                      {lang==='es'?'Acceso ilimitado · ERC-721 · Transferible':'Unlimited access · ERC-721 · Transferable'}
                    </div>
                    <input type="number" step="0.01" min="0.01" value={licensePrice}
                      onChange={e=>setLicensePrice(e.target.value)} disabled={!nftEnabled}
                      style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'10px 12px', color: nftEnabled?'var(--text)':'var(--text3)', fontSize:14, fontWeight:600, width:'100%', outline:'none', opacity: nftEnabled?1:0.5 }} />
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:5 }}>
                      ≈ ${(parseFloat(nftEnabled?licensePrice:0)*40).toFixed(2)} USD
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Deploy panel */}
            <div style={{ width:280, flexShrink:0 }}>
              <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:18, display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ fontFamily:'var(--font-heading)', fontSize:15, fontWeight:700 }}>
                  {lang==='es'?'Lista de verificación':'Checklist'}
                </div>
                {[
                  { label: lang==='es'?'Skill generado':'Skill generated',    sub: skillDef.name,              ok: true },
                  { label: lang==='es'?'Subido a IPFS':'Uploaded to IPFS',    sub: `${skillIpfs.slice(0,14)}...`, ok: true },
                  { label: lang==='es'?'Precio definido':'Price set',          sub: `${pricePerCall} AVAX / call`, ok: parseFloat(pricePerCall) > 0 },
                  { label: lang==='es'?'Wallet conectada':'Wallet connected',  sub: address ? `${address.slice(0,10)}...` : (lang==='es'?'No conectada':'Not connected'), ok: !!address },
                ].map(({ label, sub, ok }) => (
                  <div key={label} style={{ display:'flex', alignItems:'center', gap:10, padding:9, background:'var(--bg3)', borderRadius:10, fontSize:13 }}>
                    <div style={{ width:7, height:7, borderRadius:'50%', flexShrink:0, background: ok?'var(--teal)':'var(--amber-light)' }} />
                    <div>
                      <div style={{ fontWeight:500, color:'var(--text)' }}>{label}</div>
                      <div style={{ fontSize:11, color:'var(--text3)' }}>{sub}</div>
                    </div>
                  </div>
                ))}
                <Divider />
                {[
                  [lang==='es'?'Red':'Network',             'Avalanche Fuji'],
                  [lang==='es'?'Contrato':'Contract',       'SkillRegistry.sol'],
                  [lang==='es'?'Comisión':'Platform fee',   '10%'],
                  [lang==='es'?'Tú recibes':'You receive',  '90%'],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--text2)' }}>
                    <span>{k}</span><span style={{ color:'var(--text)' }}>{v}</span>
                  </div>
                ))}
                <Divider />
                {indexed ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <div style={{ textAlign:'center', color:'var(--teal)', fontWeight:600, fontSize:14 }}>
                      ✅ {lang==='es'?'¡Skill publicado en blockchain!':'Skill published on blockchain!'}
                    </div>
                    {txHash && (
                      <a href={`https://testnet.snowtrace.io/tx/${txHash}`} target="_blank" rel="noreferrer"
                        style={{ fontSize:11, color:'var(--purple-light)', textAlign:'center', textDecoration:'underline' }}>
                        {lang==='es'?'Ver en Snowtrace →':'View on Snowtrace →'}
                      </a>
                    )}
                    <Btn variant="teal" size="lg" style={{ width:'100%', justifyContent:'center' }} onClick={() => router.push('/marketplace')}>
                      {lang==='es'?'Ver en marketplace →':'View in marketplace →'}
                    </Btn>
                  </div>
                ) : (
                  <Btn size="lg" style={{ width:'100%', justifyContent:'center' }}
                    onClick={handlePublish} disabled={indexing || parseFloat(pricePerCall) <= 0 || !address}>
                    {indexing
                      ? '⏳ ' + (lang==='es'?'Publicando...':'Publishing...')
                      : (lang==='es'?'🚀 Publicar en blockchain':'🚀 Publish to blockchain')}
                  </Btn>
                )}
                {!address && (
                  <div style={{ fontSize:11, color:'var(--coral)', textAlign:'center' }}>
                    {lang==='es'?'⚠️ Conecta tu wallet para publicar':'⚠️ Connect your wallet to publish'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes bounce { from{transform:translateY(0);opacity:.5} to{transform:translateY(-4px);opacity:1} }`}</style>
    </div>
  )
}
