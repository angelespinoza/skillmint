'use client'
import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther, keccak256, encodePacked } from 'viem'
import { Navbar, Badge, Btn, Divider } from '../../../components/ui'
import { api } from '../../../lib/api'
import { CONTRACTS, PAYMENT_ABI, LICENSE_ABI } from '../../../lib/wagmi'
import { useI18n } from '../../../lib/i18n'

export default function SkillDetailPage({ params }) {
  const skillId     = parseInt(params.id)
  const { t, lang } = useI18n()
  const { address } = useAccount()

  const [skill,       setSkill]       = useState(null)
  const [def,         setDef]         = useState(null)
  const [hasLicense,  setHasLicense]  = useState(false)
  const [activeTab,   setActiveTab]   = useState('overview')
  const [pricingTab,  setPricingTab]  = useState('ppc')
  const [loading,     setLoading]     = useState(true)
  const [openClawCopied, setOpenClawCopied] = useState(false)

  // Try it
  const [input,       setInput]       = useState('')
  const [output,      setOutput]      = useState('')
  const [executing,   setExecuting]   = useState(false)
  const [execError,   setExecError]   = useState('')

  // Tx state - pay per call
  const {
    writeContractAsync: payAsync,
    data: payHash,
  } = useWriteContract()
  const { isSuccess: payConfirmed } = useWaitForTransactionReceipt({ hash: payHash })
  const [paying,      setPaying]      = useState(false)
  const [pendingReqId, setPendingReqId] = useState(null)

  // Tx state - mint NFT
  const {
    writeContractAsync: mintAsync,
    data: mintHash,
  } = useWriteContract()
  const { isSuccess: mintConfirmed } = useWaitForTransactionReceipt({ hash: mintHash })
  const [minting,     setMinting]     = useState(false)
  const [mintDone,    setMintDone]    = useState(false)

  // ── Install in OpenClaw ─────────────────────────────────────────────────────
  const handleInstallOpenClaw = () => {
    if (!skill) return
    const config = {
      skill_id:       skillId,
      skill_name:     skill.name,
      category:       skill.category,
      ipfs_hash:      skill.skillIpfs || '',
      price_per_call: skill.pricePerCall,
      endpoint:       `${process.env.NEXT_PUBLIC_API_URL}/execute/call`,
      chain:          'avalanche-fuji',
      chain_id:       43113,
      payment_contract: process.env.NEXT_PUBLIC_PAYMENT_ADDRESS,
      instructions: lang === 'es'
        ? `Agrega este skill a tu bot de OpenClaw. Cuando el bot detecte una consulta de tipo "${skill.category}", llamará automáticamente a este skill pagando ${skill.pricePerCall} wei en AVAX.`
        : `Add this skill to your OpenClaw bot. When the bot detects a query of type "${skill.category}", it will automatically call this skill paying ${skill.pricePerCall} wei in AVAX.`
    }
    navigator.clipboard.writeText(JSON.stringify(config, null, 2))
    setOpenClawCopied(true)
    setTimeout(() => setOpenClawCopied(false), 3000)
  }

  // ── Load skill ──────────────────────────────────────────────────────────────
  useEffect(() => {
    api.listSkills({ limit: 200 })
      .then(r => {
        const found = (r.skills || []).find(s => s.skill_id === skillId)
        if (found) {
          setSkill({
            name:         found.name,
            category:     found.category,
            pricePerCall: found.price_per_call,
            licensePrice: found.license_price || '0',
            isAnonymous:  found.is_anonymous,
            active:       found.active,
            totalCalls:   found.total_calls,
            skillIpfs:    found.skill_ipfs,
            creator: found.is_anonymous
              ? { anonymous: true }
              : {
                  address: found.owner_address,
                  profile: found.creator_name ? {
                    name:  found.creator_name,
                    title: found.creator_title,
                  } : null
                }
          })
          setDef({
            name:         found.name,
            capabilities: [],
            limitations:  [],
            input_schema: { query: 'Question or document to analyze', context: 'Optional additional context' },
            examples:     [],
          })
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [skillId])

  // ── Check license ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (address && skillId) {
      api.checkLicense(skillId, address)
        .then(r => setHasLicense(r.hasLicense))
        .catch(() => {})
    }
  }, [address, skillId, mintConfirmed])

  // ── After pay confirmed → execute skill ────────────────────────────────────
  useEffect(() => {
    if (!payConfirmed || !payHash || !pendingReqId) return
    runExecution(pendingReqId)
  }, [payConfirmed])

  // ── After mint confirmed ────────────────────────────────────────────────────
  useEffect(() => {
    if (mintConfirmed) setMintDone(true)
  }, [mintConfirmed])

  const fmt = (wei) => {
    try { return parseFloat(formatEther(BigInt(wei))).toFixed(4) }
    catch { return '—' }
  }

  // ── Pay per call ────────────────────────────────────────────────────────────
  const handlePayAndCall = async () => {
    if (!address) { alert(lang==='es'?'Conecta tu wallet':'Connect your wallet'); return }
    if (!input.trim()) { alert(lang==='es'?'Escribe una consulta primero':'Write a query first'); return }
    if (!skill) return

    setPaying(true)
    setExecError('')
    setOutput('')

    try {
      // Generate unique requestId
      const reqId = keccak256(encodePacked(
        ['address', 'uint256', 'uint256'],
        [address, BigInt(skillId), BigInt(Date.now())]
      ))
      setPendingReqId(reqId)

      await payAsync({
        address:      CONTRACTS.payment,
        abi:          PAYMENT_ABI,
        functionName: 'callSkill',
        args:         [BigInt(skillId), reqId],
        value:        BigInt(skill.pricePerCall),
      })
    } catch (e) {
      setExecError(e.message)
      setPaying(false)
    }
  }

  // ── Execute after payment confirmed ────────────────────────────────────────
  const runExecution = async (reqId) => {
    setExecuting(true)
    setActiveTab('try')
    try {
      const result = await api.executeCall({
        skillId,
        requestId:     reqId,
        input:         { query: input },
        callerAddress: address,
      })
      const out = typeof result.output === 'string'
        ? result.output
        : JSON.stringify(result.output, null, 2)
      setOutput(out)
    } catch (e) {
      setExecError(e.message || 'Execution failed')
    } finally {
      setExecuting(false)
      setPaying(false)
      setPendingReqId(null)
    }
  }

  // ── Licensed call ───────────────────────────────────────────────────────────
  const handleLicensedCall = async () => {
    if (!address) { alert(lang==='es'?'Conecta tu wallet':'Connect your wallet'); return }
    if (!input.trim()) { alert(lang==='es'?'Escribe una consulta primero':'Write a query first'); return }

    setExecuting(true)
    setExecError('')
    setOutput('')
    setActiveTab('try')

    try {
      const nonce = Date.now()
      const result = await api.executeLicensed({
        skillId,
        input:         { query: input },
        holderAddress: address,
        signature:     '0x00',
        nonce,
      })
      const out = typeof result.output === 'string'
        ? result.output
        : JSON.stringify(result.output, null, 2)
      setOutput(out)
    } catch (e) {
      setExecError(e.message)
    } finally {
      setExecuting(false)
    }
  }

  // ── Mint NFT license ────────────────────────────────────────────────────────
  const handleMintNFT = async () => {
    if (!address) { alert(lang==='es'?'Conecta tu wallet':'Connect your wallet'); return }
    if (!skill || !skill.licensePrice || skill.licensePrice === '0') return

    setMinting(true)
    try {
      await mintAsync({
        address:      CONTRACTS.license,
        abi:          LICENSE_ABI,
        functionName: 'mintLicense',
        args:         [BigInt(skillId)],
        value:        BigInt(skill.licensePrice),
      })
    } catch (e) {
      alert(`Error: ${e.message}`)
      setMinting(false)
    }
  }

  const tabs = [
    { key:'overview', en:'Overview',      es:'Resumen'  },
    { key:'schema',   en:'Input Schema',  es:'Esquema'  },
    { key:'examples', en:'Examples',      es:'Ejemplos' },
    { key:'try',      en:'Try it',        es:'Probar'   },
  ]

  if (loading) return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <Navbar active="browse" />
      <div style={{ padding:24, color:'var(--text3)' }}>Loading...</div>
    </div>
  )

  if (!skill) return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <Navbar active="browse" />
      <div style={{ padding:24, color:'var(--text3)' }}>Skill not found.</div>
    </div>
  )

  const isLoading = paying || executing || minting

  return (
    <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>
      <Navbar active="browse" />
      <div style={{ display:'flex', gap:18, padding:24, flex:1 }}>

        {/* ── Main ── */}
        <div style={{ flex:1 }}>
          <div style={{ marginBottom:12 }}>
            <span style={{ fontSize:13, color:'var(--text3)', cursor:'pointer' }}
              onClick={() => history.back()}>← {lang==='es'?'Marketplace':'Marketplace'}</span>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12 }}>
            <Badge color={{ legal:'purple', finance:'teal', medical:'coral', tax:'amber' }[skill.category] || 'purple'}>
              {skill.category}
            </Badge>
            {skill.isAnonymous && (
              <Badge color="teal">{lang==='es'?'Anónimo':'Anonymous'}</Badge>
            )}
          </div>

          <div style={{ fontFamily:'var(--font-heading)', fontSize:26, fontWeight:800, marginBottom:16 }}>
            {skill.name}
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
            {[
              { n:(skill.totalCalls||0).toLocaleString(), l: lang==='es'?'Total llamadas':'Total calls' },
              { n:`${fmt(skill.pricePerCall)} AVAX`,      l: lang==='es'?'Por llamada':'Per call', c:'var(--teal)' },
              { n:'~1.2s',                                l: lang==='es'?'Resp. promedio':'Avg response' },
            ].map(({ n, l, c }) => (
              <div key={l} style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:12 }}>
                <div style={{ fontFamily:'var(--font-heading)', fontSize:20, fontWeight:700, color:c||'var(--text)' }}>{n}</div>
                <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'1px solid var(--border)', marginBottom:16 }}>
            {tabs.map(({ key, en, es }) => (
              <div key={key} onClick={() => setActiveTab(key)} style={{
                padding:'8px 16px', fontSize:13, cursor:'pointer',
                color:        activeTab===key ? 'var(--purple-light)' : 'var(--text2)',
                borderBottom: activeTab===key ? '2px solid var(--purple)' : '2px solid transparent',
                marginBottom: -1, transition:'.2s',
              }}>{lang==='es' ? es : en}</div>
            ))}
          </div>

          <div className="card">
            {activeTab === 'overview' && (
              <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.8 }}>
                <p><strong style={{ color:'var(--text)' }}>{skill.name}</strong></p>
                <br />
                <p>
                  {lang==='es'
                    ? 'Este skill encapsula experiencia profesional especializada accesible por agentes autónomos vía pago en AVAX.'
                    : 'This skill encapsulates specialized professional expertise accessible by autonomous agents via AVAX payment.'}
                </p>
                {def?.capabilities?.length > 0 && (
                  <div style={{ marginTop:12 }}>
                    <strong style={{ color:'var(--text)' }}>{lang==='es'?'Capacidades:':'Capabilities:'}</strong>
                    <ul style={{ marginLeft:18, marginTop:6 }}>
                      {def.capabilities.map((c,i) => <li key={i}>{c}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'schema' && (
              <div>
                <div style={{ fontSize:12, color:'var(--text3)', marginBottom:10 }}>
                  {lang==='es'?'Campos de entrada esperados:':'Expected input fields:'}
                </div>
                <pre style={{ fontSize:12, color:'var(--text2)', lineHeight:1.8, whiteSpace:'pre-wrap' }}>
                  {JSON.stringify(def?.input_schema || {}, null, 2)}
                </pre>
              </div>
            )}

            {activeTab === 'examples' && (
              <div style={{ fontSize:13, color:'var(--text2)' }}>
                {lang==='es'
                  ? 'Prueba este skill en la pestaña "Probar" con tu propia consulta.'
                  : 'Test this skill in the "Try it" tab with your own query.'}
              </div>
            )}

            {activeTab === 'try' && (
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <div style={{ fontSize:13, color:'var(--text2)' }}>
                  {lang==='es'
                    ? 'Escribe una consulta — el skill responderá con análisis profesional:'
                    : 'Write a query — the skill will respond with professional analysis:'}
                </div>
                <textarea
                  style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:9, padding:'10px 12px', color:'var(--text)', fontFamily:'var(--font-body)', fontSize:13, resize:'vertical', outline:'none', minHeight:100 }}
                  placeholder={lang==='es'
                    ? 'ej. Analiza este contrato de servicios: "El proveedor no tendrá responsabilidad por daños de ningún tipo..."'
                    : 'e.g. Analyze this service contract clause: "The provider shall not be liable for damages of any kind..."'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={isLoading}
                />

                {/* Status messages */}
                {paying && !executing && (
                  <div style={{ background:'var(--amber-faint)', border:'1px solid rgba(165,126,0,0.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--amber-light)' }}>
                    ⏳ {lang==='es'?'Esperando confirmación del pago on-chain...':'Waiting for on-chain payment confirmation...'}
                  </div>
                )}
                {executing && (
                  <div style={{ background:'var(--purple-faint)', border:'1px solid rgba(127,119,221,0.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'var(--purple-light)' }}>
                    ⚡ {lang==='es'?'Ejecutando skill con Claude...':'Executing skill with Claude...'}
                  </div>
                )}
                {execError && (
                  <div style={{ background:'var(--coral-faint)', border:'1px solid rgba(192,81,58,0.2)', borderRadius:8, padding:'10px 14px', fontSize:13, color:'#E07060' }}>
                    ⚠️ {execError}
                  </div>
                )}
                {output && (
                  <div style={{ background:'var(--bg3)', border:'1px solid var(--teal-faint)', borderRadius:9, padding:16, fontSize:13, color:'var(--text)', lineHeight:1.8, whiteSpace:'pre-wrap', maxHeight:400, overflowY:'auto' }}>
                    <div style={{ fontSize:11, color:'var(--teal-light)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.5px' }}>
                      ✅ {lang==='es'?'Respuesta del skill:':'Skill response:'}
                    </div>
                    {output}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div style={{ width:280, flexShrink:0 }}>

          {/* Pricing panel */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:18, display:'flex', flexDirection:'column', gap:12 }}>

            {/* Tabs */}
            <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
              {[
                { key:'ppc', en:'Pay-per-call', es:'Por llamada' },
                { key:'nft', en:'NFT License',  es:'Licencia NFT' },
              ].map(({ key, en, es }) => (
                <button key={key} onClick={() => setPricingTab(key)} style={{
                  flex:1, padding:9, textAlign:'center', fontSize:13, fontWeight:500,
                  cursor:'pointer', border:'none', fontFamily:'var(--font-body)', transition:'.2s',
                  background: pricingTab===key ? 'var(--purple)' : 'transparent',
                  color:      pricingTab===key ? '#fff'          : 'var(--text2)',
                }}>{lang==='es' ? es : en}</button>
              ))}
            </div>

            {pricingTab === 'ppc' ? (
              <>
                <div>
                  <div style={{ fontFamily:'var(--font-heading)', fontSize:26, fontWeight:800 }}>
                    {fmt(skill.pricePerCall)} AVAX
                  </div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>
                    ≈ ${(parseFloat(fmt(skill.pricePerCall))*40).toFixed(4)} {lang==='es'?'por llamada':'per call'}
                  </div>
                </div>
                <Divider />
                {[
                  [lang==='es'?'Comisión':'Platform fee',      '10%'],
                  [lang==='es'?'Creador recibe':'Creator gets', `${fmt(String(BigInt(skill.pricePerCall) * 9n / 10n))} AVAX`],
                  ['Chain', 'Avalanche C'],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--text2)' }}>
                    <span>{k}</span><span style={{ color:'var(--text)' }}>{v}</span>
                  </div>
                ))}
                <Divider />

                {/* Input for try it */}
                <textarea
                  style={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, padding:'8px 10px', color:'var(--text)', fontFamily:'var(--font-body)', fontSize:12, resize:'none', outline:'none', minHeight:60 }}
                  placeholder={lang==='es'?'Tu consulta aquí...':'Your query here...'}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={isLoading}
                />

                {hasLicense ? (
                  <Btn variant="teal" size="lg" style={{ width:'100%', justifyContent:'center' }}
                    onClick={handleLicensedCall} disabled={executing || !input.trim()}>
                    {executing ? '⏳' : `✓ ${lang==='es'?'Usar licencia NFT':'Use NFT License'}`}
                  </Btn>
                ) : (
                  <Btn size="lg" style={{ width:'100%', justifyContent:'center' }}
                    onClick={handlePayAndCall} disabled={isLoading || !address || !input.trim()}>
                    {paying
                      ? `⏳ ${lang==='es'?'Confirmando pago...':'Confirming payment...'}`
                      : executing
                        ? `⚡ ${lang==='es'?'Ejecutando...':'Executing...'}`
                        : !address
                          ? (lang==='es'?'Conecta tu wallet':'Connect wallet')
                          : t('detail.cta')}
                  </Btn>
                )}
                <div style={{ fontSize:11, color:'var(--text3)', textAlign:'center' }}>
                  {t('detail.instant')}
                </div>
              </>
            ) : (
              <>
                <div>
                  <div style={{ fontFamily:'var(--font-heading)', fontSize:26, fontWeight:800, color:'var(--amber-light)' }}>
                    {skill.licensePrice && skill.licensePrice !== '0'
                      ? `${fmt(skill.licensePrice)} AVAX`
                      : (lang==='es'?'No disponible':'Not available')}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text3)' }}>
                    {lang==='es'?'Llamadas ilimitadas · Transferible':'Unlimited calls · Transferable'}
                  </div>
                </div>
                <Divider />
                {[
                  [lang==='es'?'Acceso':'Access',         lang==='es'?'Ilimitado':'Unlimited'],
                  [lang==='es'?'Estándar':'Token standard','ERC-721'],
                  [lang==='es'?'Revendible':'Resellable',  lang==='es'?'Sí ✓':'Yes ✓'],
                  ['Chain',                                'Avalanche C'],
                ].map(([k,v]) => (
                  <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:13, color:'var(--text2)' }}>
                    <span>{k}</span><span style={{ color:'var(--text)' }}>{v}</span>
                  </div>
                ))}
                <div style={{ background:'var(--amber-faint)', border:'1px solid rgba(165,126,0,0.2)', borderRadius:8, padding:'9px 12px', fontSize:12, color:'var(--amber-light)' }}>
                  💡 {lang==='es'
                    ? 'Tu agente posee este skill como un asset on-chain. Transfiérelo o véndelo cuando quieras.'
                    : 'Your agent owns this skill as an on-chain asset. Transfer or resell anytime.'}
                </div>
                <Divider />

                {mintDone || hasLicense ? (
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <div style={{ textAlign:'center', color:'var(--teal)', fontWeight:600, fontSize:13 }}>
                      ✅ {lang==='es'?'¡Licencia NFT activa!':'NFT License active!'}
                    </div>
                    <Btn variant="teal" style={{ width:'100%', justifyContent:'center' }}
                      onClick={() => setPricingTab('ppc')}>
                      {lang==='es'?'Usar skill ahora →':'Use skill now →'}
                    </Btn>
                  </div>
                ) : (
                  <Btn variant="amber" size="lg" style={{ width:'100%', justifyContent:'center' }}
                    onClick={handleMintNFT}
                    disabled={minting || !address || !skill.licensePrice || skill.licensePrice === '0'}>
                    {minting
                      ? `⏳ ${lang==='es'?'Minteando...':'Minting...'}`
                      : !address
                        ? (lang==='es'?'Conecta tu wallet':'Connect wallet')
                        : t('pricing.mint')}
                  </Btn>
                )}
                {mintHash && (
                  <a href={`https://testnet.snowtrace.io/tx/${mintHash}`} target="_blank" rel="noreferrer"
                    style={{ fontSize:11, color:'var(--purple-light)', textAlign:'center', textDecoration:'underline' }}>
                    {lang==='es'?'Ver en Snowtrace →':'View on Snowtrace →'}
                  </a>
                )}
              </>
            )}
          </div>

          {/* Creator card */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:18, marginTop:13 }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:10, textTransform:'uppercase', letterSpacing:'.5px' }}>
              {t('detail.creator2')}
            </div>
            {skill.isAnonymous ? (
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:'var(--bg3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🕵️</div>
                <div>
                  <div style={{ fontWeight:600, fontSize:13 }}>{lang==='es'?'Creador Anónimo':'Anonymous Creator'}</div>
                  <span className="badge badge-purple" style={{ marginTop:4 }}>{lang==='es'?'Verificado ✓':'Verified ✓'}</span>
                </div>
              </div>
            ) : skill.creator?.profile ? (
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                  <div style={{ width:42, height:42, borderRadius:'50%', background:'var(--purple-faint)', border:'2px solid rgba(127,119,221,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>👨‍💼</div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:14 }}>{skill.creator.profile.name}</div>
                    <div style={{ fontSize:12, color:'var(--purple-light)' }}>{skill.creator.profile.title}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize:12, color:'var(--text3)' }}>
                {skill.creator?.address ? `${skill.creator.address.slice(0,10)}...` : '—'}
              </div>
            )}
          </div>

          {/* OpenClaw install button */}
          <div style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:18, marginTop:13 }}>
            <div style={{ fontSize:11, color:'var(--text3)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.5px' }}>
              🤖 OpenClaw
            </div>
            <div style={{ fontSize:12, color:'var(--text2)', marginBottom:12, lineHeight:1.6 }}>
              {lang==='es'
                ? 'Instala este skill en tu bot de OpenClaw para que responda consultas de forma autónoma.'
                : 'Install this skill in your OpenClaw bot to answer queries autonomously.'}
            </div>
            <Btn
              variant="secondary"
              style={{ width:'100%', justifyContent:'center', borderColor: openClawCopied ? 'var(--teal)' : 'var(--border2)', color: openClawCopied ? 'var(--teal)' : 'var(--text)' }}
              onClick={handleInstallOpenClaw}
            >
              {openClawCopied
                ? `✅ ${lang==='es'?'¡Config copiada!':'Config copied!'}`
                : `🤖 ${lang==='es'?'Instalar en OpenClaw':'Install in OpenClaw'}`}
            </Btn>
            {openClawCopied && (
              <div style={{ fontSize:11, color:'var(--teal)', marginTop:8, textAlign:'center', lineHeight:1.5 }}>
                {lang==='es'
                  ? 'Pega la configuración JSON en tu bot de OpenClaw'
                  : 'Paste the JSON config in your OpenClaw bot'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
