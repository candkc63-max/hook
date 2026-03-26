import { useState, useEffect, useRef } from 'react';

/* ═══════════════════════════════════════════
   CONFIG
   ═══════════════════════════════════════════ */
const STORAGE_KEY = 'apex-hook-engine-videos';
const PIN_KEY = 'apex-hook-engine-pin';
const AUTH_KEY = 'apex-hook-engine-auth';

const HOOK_TYPES = {
  provocative: 'Provokatif Soru',
  authority: 'Otorite / Rakam',
  curiosity: 'Merak Boşluğu',
  contrast: 'Kontrast / FOMO',
  vulnerability: 'Kırılganlık / İtiraf',
  speed: 'Hız / Liste',
  challenge: 'Meydan Okuma',
};

const PLATFORMS = ['Instagram Reels', 'TikTok', 'YouTube Shorts'];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* ═══════════════════════════════════════════
   API CALL (through Vercel serverless proxy)
   ═══════════════════════════════════════════ */
async function callAI(prompt) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1500,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error ${res.status}`);
  }
  const data = await res.json();
  const text = (data.content || []).map(c => c.text || '').join('');
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

/* ═══════════════════════════════════════════
   PIN LOCK SCREEN
   ═══════════════════════════════════════════ */
function PinLock({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState('check'); // 'setup' | 'check'
  const [error, setError] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);
  const inputRef = useRef(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    const savedPin = localStorage.getItem(PIN_KEY);
    if (!savedPin) setMode('setup');
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    if (pin.length < 4) {
      setError('En az 4 haneli PIN gir.');
      return;
    }
    if (mode === 'setup') {
      localStorage.setItem(PIN_KEY, pin);
      localStorage.setItem(AUTH_KEY, Date.now().toString());
      onUnlock();
    } else {
      const saved = localStorage.getItem(PIN_KEY);
      if (pin === saved) {
        localStorage.setItem(AUTH_KEY, Date.now().toString());
        setAttempts(0);
        onUnlock();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setError(`Yanlış PIN. (${newAttempts}. deneme)`);
        setPin('');
        if (newAttempts >= 3) setShowReset(true);
      }
    }
  };

  const resetPin = () => {
    localStorage.removeItem(PIN_KEY);
    localStorage.removeItem(AUTH_KEY);
    setMode('setup');
    setPin('');
    setError('');
    setShowReset(false);
    setResetConfirm(false);
    setAttempts(0);
    inputRef.current?.focus();
  };

  return (
    <div style={pinStyles.root}>
      <div style={pinStyles.card}>
        <div style={pinStyles.icon}>◆</div>
        <h1 style={pinStyles.title}>HOOK ENGINE</h1>
        <p style={pinStyles.subtitle}>
          {mode === 'setup' ? 'Yeni PIN oluştur' : 'PIN gir'}
        </p>

        <div style={pinStyles.dots}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div
              key={i}
              style={{
                ...pinStyles.dot,
                background: i < pin.length ? '#00ff88' : '#1a2a44',
              }}
            />
          ))}
        </div>

        <input
          ref={inputRef}
          type="tel"
          maxLength={6}
          value={pin}
          onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={pinStyles.hiddenInput}
          autoFocus
        />

        {error && <p style={pinStyles.error}>{error}</p>}

        <button onClick={submit} style={pinStyles.btn}>
          {mode === 'setup' ? 'PIN Oluştur' : 'Giriş'}
        </button>

        {mode === 'check' && (
          <button
            onClick={() => showReset ? setResetConfirm(true) : setShowReset(true)}
            style={pinStyles.resetLink}
          >
            {showReset ? 'PIN\'i Sıfırla' : 'PIN\'imi Unuttum'}
          </button>
        )}

        {resetConfirm && (
          <div style={pinStyles.resetBox}>
            <p style={pinStyles.resetWarn}>
              PIN sıfırlanacak. Yeni PIN oluşturmanız gerekecek. Kayıtlı verileriniz silinmez.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={resetPin} style={pinStyles.resetConfirmBtn}>Sıfırla</button>
              <button onClick={() => { setResetConfirm(false); }} style={pinStyles.resetCancelBtn}>İptal</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const pinStyles = {
  root: {
    minHeight: '100vh', minHeight: '100dvh',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: '#060b14', padding: 24,
  },
  card: {
    textAlign: 'center', maxWidth: 320, width: '100%',
  },
  icon: { color: '#00ff88', fontSize: 36, marginBottom: 12 },
  title: {
    fontFamily: "'JetBrains Mono', 'SF Mono', monospace",
    color: '#fff', fontSize: 22, letterSpacing: 4, marginBottom: 8,
  },
  subtitle: {
    fontFamily: "'JetBrains Mono', monospace",
    color: '#4a6fa5', fontSize: 13, marginBottom: 32,
  },
  dots: {
    display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24,
  },
  dot: {
    width: 14, height: 14, borderRadius: '50%',
    transition: 'background 0.15s',
  },
  hiddenInput: {
    width: '100%', padding: '14px', background: '#0a1020', border: '1px solid #1a2a44',
    borderRadius: 8, color: '#00ff88', fontSize: 24, textAlign: 'center',
    fontFamily: "'JetBrains Mono', monospace", letterSpacing: 12, marginBottom: 16,
  },
  error: {
    fontFamily: "'JetBrains Mono', monospace",
    color: '#ff4466', fontSize: 12, marginBottom: 16,
  },
  btn: {
    fontFamily: "'JetBrains Mono', monospace",
    padding: '14px 40px', background: '#00ff88', color: '#060b14',
    border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 700,
    letterSpacing: 2, cursor: 'pointer', textTransform: 'uppercase',
  },
  resetLink: {
    fontFamily: "'JetBrains Mono', monospace",
    background: 'none', border: 'none', color: '#4a6fa5',
    fontSize: 11, cursor: 'pointer', marginTop: 20, padding: 8,
    textDecoration: 'underline',
  },
  resetBox: {
    marginTop: 16, padding: 16, background: '#0a1020',
    border: '1px solid #ff446644', borderRadius: 8,
  },
  resetWarn: {
    fontFamily: "'JetBrains Mono', monospace",
    color: '#ffaa00', fontSize: 11, marginBottom: 12, lineHeight: 1.5,
  },
  resetConfirmBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    padding: '10px 20px', background: '#ff4466', color: '#fff',
    border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
    cursor: 'pointer',
  },
  resetCancelBtn: {
    fontFamily: "'JetBrains Mono', monospace",
    padding: '10px 20px', background: '#1a2a44', color: '#d0d8e8',
    border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer',
  },
};

/* ═══════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════ */
function HookEngine() {
  const [videos, setVideos] = useState([]);
  const [tab, setTab] = useState('add');
  const [analysis, setAnalysis] = useState(null);
  const [hooks, setHooks] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Add form
  const emptyForm = {
    hookText: '', topic: '', hookType: 'provocative', platform: 'Instagram Reels',
    views: '', likes: '', saves: '', shares: '', comments: '', retentionRate: '',
    date: new Date().toISOString().split('T')[0],
  };
  const [form, setForm] = useState(emptyForm);

  // Generate form
  const [gen, setGen] = useState({ topic: '', platform: 'Instagram Reels', count: 5, style: '' });

  // Load / Save
  useEffect(() => {
    try {
      const d = localStorage.getItem(STORAGE_KEY);
      if (d) setVideos(JSON.parse(d));
    } catch {}
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
  }, [videos]);

  const calcEng = (v) => {
    const t = v.views || 1;
    return ((v.likes + v.saves * 3 + v.shares * 5 + v.comments * 2) / t * 100).toFixed(2);
  };

  const addVideo = () => {
    if (!form.hookText.trim() || !form.views) {
      setError('Hook metni ve görüntülenme zorunlu.'); return;
    }
    const v = {
      id: uid(), ...form,
      views: +form.views || 0, likes: +form.likes || 0,
      saves: +form.saves || 0, shares: +form.shares || 0,
      comments: +form.comments || 0, retentionRate: +form.retentionRate || 0,
    };
    v.engagementScore = calcEng(v);
    setVideos(prev => [v, ...prev]);
    setForm(emptyForm);
    setError(null);
    setTab('library');
  };

  const deleteVideo = id => setVideos(prev => prev.filter(v => v.id !== id));

  const sorted = [...videos].sort((a, b) => b.engagementScore - a.engagementScore);

  const stats = {
    total: videos.length,
    avgEng: videos.length ? (videos.reduce((s, v) => s + +v.engagementScore, 0) / videos.length).toFixed(2) : '0',
    totalViews: videos.reduce((s, v) => s + v.views, 0),
  };

  /* ─── ANALYZE ─── */
  const analyze = async () => {
    if (videos.length < 3) { setError('En az 3 video gerekli.'); return; }
    setLoading(true); setError(null);
    const top = sorted.slice(0, 10);
    const bottom = sorted.slice(-Math.min(5, Math.floor(sorted.length / 2)));
    try {
      const result = await callAI(`Sen Türk finans içerik stratejisti ve viral video uzmanısın. ApexYatırım markasının verilerini analiz et.

EN İYİ VİDEOLAR:
${top.map((v, i) => `${i + 1}. Hook: "${v.hookText}" | Tür: ${HOOK_TYPES[v.hookType]} | Platform: ${v.platform} | Views: ${v.views} | Eng: %${v.engagementScore} | Ret: %${v.retentionRate} | Saves: ${v.saves} | Shares: ${v.shares}`).join('\n')}

EN DÜŞÜK VİDEOLAR:
${bottom.map((v, i) => `${i + 1}. Hook: "${v.hookText}" | Tür: ${HOOK_TYPES[v.hookType]} | Eng: %${v.engagementScore} | Ret: %${v.retentionRate}`).join('\n')}

Sadece JSON döndür:
{"winning_patterns":["3 pattern"],"losing_patterns":["2 pattern"],"best_hook_type":"tür","best_platform":"platform","recommendations":["5 öneri"],"hook_formula":"formül şablonu"}`);
      setAnalysis(result);
      setTab('analyze');
    } catch (e) { setError('Analiz hatası: ' + e.message); }
    setLoading(false);
  };

  /* ─── GENERATE ─── */
  const generate = async () => {
    if (!gen.topic.trim()) { setError('Konu gir.'); return; }
    setLoading(true); setError(null);
    const topHooks = sorted.slice(0, 8);
    const ctx = topHooks.length ? `\nGEÇMİŞ EN İYİ HOOKLAR:\n${topHooks.map((v, i) => `${i + 1}. "${v.hookText}" (Eng: %${v.engagementScore}, ${v.views} views, Tür: ${HOOK_TYPES[v.hookType]})`).join('\n')}` : '';
    const aCtx = analysis ? `\nANALİZ: Formül: ${analysis.hook_formula} | En iyi tür: ${analysis.best_hook_type} | Patternler: ${analysis.winning_patterns?.join(', ')}` : '';
    try {
      const result = await callAI(`Sen ApexYatırım için Türkçe finans hook copywriter'ısın. Kitle: Türk bireysel yatırımcılar 20-40 yaş.
${ctx}${aCtx}

"${gen.topic}" konusu için ${gen.platform}'a özel ${gen.count} hook yaz.
${gen.style ? `Stil: ${gen.style}` : ''}

Kurallar: Max 12 kelime, ilk 1.5 sn dikkat, Türkçe günlük bilgili ton, farklı psikolojik framework.

Sadece JSON:
{"hooks":[{"text":"","type":"provocative|authority|curiosity|contrast|vulnerability|speed|challenge","psychology":"1 cümle","confidence":8,"visual_suggestion":""}]}`);
      setHooks(result);
      setTab('generate');
    } catch (e) { setError('Üretme hatası: ' + e.message); }
    setLoading(false);
  };

  const confColor = s => s >= 8 ? '#00ff88' : s >= 5 ? '#ffaa00' : '#ff4466';
  const engColor = s => +s >= 8 ? '#00ff88' : +s >= 4 ? '#ffaa00' : '#ff4466';

  /* ─── EXPORT DATA ─── */
  const exportData = () => {
    const blob = new Blob([JSON.stringify(videos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `hook-engine-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const importData = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        try {
          const data = JSON.parse(ev.target.result);
          if (Array.isArray(data)) { setVideos(data); setTab('library'); }
        } catch { setError('Geçersiz dosya.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  /* ─── RENDER ─── */
  return (
    <div style={s.root}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'JetBrains Mono', 'SF Mono', monospace; -webkit-font-smoothing: antialiased; }
        input, textarea, select, button { font-family: inherit; }
        input:focus, textarea:focus, select:focus { border-color: #00ff8866 !important; outline: none; }
        button:active { opacity: 0.8; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #060b14; }
        ::-webkit-scrollbar-thumb { background: #1a2a44; border-radius: 2px; }
      `}</style>

      {/* HEADER */}
      <header style={s.header}>
        <div style={s.hLeft}>
          <span style={s.logoIcon}>◆</span>
          <span style={s.logoText}>HOOK ENGINE</span>
        </div>
        <div style={s.hStats}>
          <div style={s.chip}><span style={s.chipVal}>{stats.total}</span><span style={s.chipLbl}>Video</span></div>
          <div style={s.chip}><span style={s.chipVal}>%{stats.avgEng}</span><span style={s.chipLbl}>Eng</span></div>
          <div style={s.chip}><span style={s.chipVal}>{(stats.totalViews/1000).toFixed(1)}K</span><span style={s.chipLbl}>Views</span></div>
        </div>
      </header>

      {/* TABS */}
      <nav style={s.tabs}>
        {[
          { k: 'add', l: '+ Ekle' },
          { k: 'library', l: `Veri (${videos.length})` },
          { k: 'analyze', l: 'Analiz' },
          { k: 'generate', l: 'Üret' },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            style={{ ...s.tab, ...(tab === t.k ? s.tabOn : {}) }}>
            {t.l}
          </button>
        ))}
      </nav>

      {/* ERROR */}
      {error && (
        <div style={s.err}>
          <span>{error}</span>
          <button onClick={() => setError(null)} style={s.errX}>×</button>
        </div>
      )}

      {/* LOADING */}
      {loading && (
        <div style={s.loadWrap}>
          <div style={s.spinner} />
          <span style={s.loadTxt}>AI çalışıyor...</span>
        </div>
      )}

      {/* CONTENT */}
      <main style={s.main}>

        {/* ═══ ADD ═══ */}
        {tab === 'add' && (
          <div>
            <h2 style={s.title}>Video Verisi Ekle</h2>
            <p style={s.desc}>Her videonun hook metni + metriklerini gir.</p>

            <div style={s.grid2}>
              <div style={s.full}>
                <label style={s.lbl}>Hook Metni</label>
                <textarea style={s.ta} rows={2} value={form.hookText}
                  onChange={e => setForm({...form, hookText: e.target.value})}
                  placeholder="Videonun ilk 3 saniyesindeki cümle" />
              </div>
              <F l="Konu" v={form.topic} p="ör: BIST, altın" c={v => setForm({...form, topic: v})} />
              <div style={s.fld}>
                <label style={s.lbl}>Hook Türü</label>
                <select style={s.sel} value={form.hookType} onChange={e => setForm({...form, hookType: e.target.value})}>
                  {Object.entries(HOOK_TYPES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div style={s.fld}>
                <label style={s.lbl}>Platform</label>
                <select style={s.sel} value={form.platform} onChange={e => setForm({...form, platform: e.target.value})}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <F l="Tarih" type="date" v={form.date} c={v => setForm({...form, date: v})} />
              <F l="Görüntülenme" type="number" v={form.views} p="0" c={v => setForm({...form, views: v})} />
              <F l="Beğeni" type="number" v={form.likes} p="0" c={v => setForm({...form, likes: v})} />
              <F l="Kaydetme" type="number" v={form.saves} p="0" c={v => setForm({...form, saves: v})} />
              <F l="Paylaşım" type="number" v={form.shares} p="0" c={v => setForm({...form, shares: v})} />
              <F l="Yorum" type="number" v={form.comments} p="0" c={v => setForm({...form, comments: v})} />
              <F l="Retention %" type="number" v={form.retentionRate} p="ör: 45" c={v => setForm({...form, retentionRate: v})} />
            </div>
            <button onClick={addVideo} style={s.btnP}>Kaydet</button>
          </div>
        )}

        {/* ═══ LIBRARY ═══ */}
        {tab === 'library' && (
          <div>
            <div style={s.libHead}>
              <h2 style={s.title}>Video Kütüphanesi</h2>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={exportData} style={s.btnS}>Dışa Aktar</button>
                <button onClick={importData} style={s.btnS}>İçe Aktar</button>
              </div>
            </div>
            {sorted.length === 0 ? (
              <div style={s.empty}>
                <p style={s.emptyTxt}>Henüz video yok.</p>
                <button onClick={() => setTab('add')} style={s.btnS}>İlk Videoyu Ekle</button>
              </div>
            ) : sorted.map((v, i) => (
              <div key={v.id} style={s.vCard}>
                <div style={s.vRank}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: i < 3 ? '#00ff88' : i < 6 ? '#ffaa00' : '#4a6fa5' }}>
                    #{i+1}
                  </span>
                </div>
                <div style={s.vBody}>
                  <p style={s.vHook}>"{v.hookText}"</p>
                  <div style={s.vTags}>
                    <span style={s.tag}>{HOOK_TYPES[v.hookType]}</span>
                    <span style={s.tag}>{v.platform}</span>
                    {v.topic && <span style={s.tag}>{v.topic}</span>}
                  </div>
                  <div style={s.vNums}>
                    <span>👁{(v.views/1000).toFixed(1)}K</span>
                    <span>❤{v.likes}</span>
                    <span>🔖{v.saves}</span>
                    <span>↗{v.shares}</span>
                    <span>💬{v.comments}</span>
                    {v.retentionRate > 0 && <span>⏱%{v.retentionRate}</span>}
                  </div>
                </div>
                <div style={s.vRight}>
                  <div style={{ ...s.engBadge, borderColor: engColor(v.engagementScore), color: engColor(v.engagementScore) }}>
                    %{v.engagementScore}
                  </div>
                  <button onClick={() => deleteVideo(v.id)} style={s.delBtn}>×</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ ANALYZE ═══ */}
        {tab === 'analyze' && (
          <div>
            <div style={s.libHead}>
              <h2 style={s.title}>Performans Analizi</h2>
              <button onClick={analyze} style={s.btnP} disabled={loading || videos.length < 3}>
                {videos.length < 3 ? `${videos.length}/3 video` : 'AI Analiz'}
              </button>
            </div>
            {analysis ? (
              <div style={s.aGrid}>
                <div style={s.aCard}>
                  <h3 style={s.aTitle}>▲ Kazanan Patternler</h3>
                  {analysis.winning_patterns?.map((p, i) => <p key={i} style={s.aItem}>{p}</p>)}
                </div>
                <div style={s.aCard}>
                  <h3 style={{ ...s.aTitle, color: '#ff4466' }}>▼ Kaybeden Patternler</h3>
                  {analysis.losing_patterns?.map((p, i) => <p key={i} style={s.aItem}>{p}</p>)}
                </div>
                <div style={{ ...s.aCard, gridColumn: '1 / -1' }}>
                  <h3 style={s.aTitle}>Öneriler</h3>
                  {analysis.recommendations?.map((r, i) => (
                    <p key={i} style={s.aItem}><strong style={{ color: '#4a6fa5' }}>{i + 1}.</strong> {r}</p>
                  ))}
                </div>
                <div style={{ ...s.aCard, gridColumn: '1 / -1', background: 'linear-gradient(135deg, #0a1628, #0f1d35)' }}>
                  <h3 style={{ ...s.aTitle, color: '#00ff88' }}>Hook Formülü</h3>
                  <p style={s.formula}>{analysis.hook_formula}</p>
                  <p style={{ fontSize: 12, color: '#4a6fa5', marginTop: 12 }}>
                    En iyi tür: <strong style={{ color: '#00ff88' }}>{analysis.best_hook_type}</strong>
                    {' · '}En iyi platform: <strong style={{ color: '#00ff88' }}>{analysis.best_platform}</strong>
                  </p>
                </div>
              </div>
            ) : (
              <div style={s.empty}>
                <p style={s.emptyTxt}>En az 3 video ekle, sonra AI analizi çalıştır.</p>
              </div>
            )}
          </div>
        )}

        {/* ═══ GENERATE ═══ */}
        {tab === 'generate' && (
          <div>
            <h2 style={s.title}>Hook Üret</h2>
            <p style={s.desc}>Geçmiş performansa dayalı, bugünkü konuna özel hooklar.</p>
            <div style={s.grid2}>
              <F l="Bugünkü Konu" v={gen.topic} p="ör: Altın neden yükseliyor" c={v => setGen({...gen, topic: v})} />
              <div style={s.fld}>
                <label style={s.lbl}>Platform</label>
                <select style={s.sel} value={gen.platform} onChange={e => setGen({...gen, platform: e.target.value})}>
                  {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div style={s.fld}>
                <label style={s.lbl}>Hook Sayısı</label>
                <select style={s.sel} value={gen.count} onChange={e => setGen({...gen, count: +e.target.value})}>
                  {[3,5,7,10].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <F l="Stil Notu (opsiyonel)" v={gen.style} p="ör: agresif, soru formatı" c={v => setGen({...gen, style: v})} />
            </div>
            <button onClick={generate} style={s.btnP} disabled={loading}>
              {videos.length > 0 ? `${videos.length} Videoya Dayalı Üret` : 'Üret (veri olmadan)'}
            </button>

            {hooks?.hooks && (
              <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {hooks.hooks.map((h, i) => (
                  <div key={i} style={s.hCard}>
                    <div style={s.hHead}>
                      <span style={{ fontSize: 11, color: '#4a6fa5', fontWeight: 700 }}>#{i+1}</span>
                      <span style={{
                        fontSize: 11, padding: '2px 8px', borderRadius: 4, fontWeight: 600,
                        background: confColor(h.confidence) + '18', color: confColor(h.confidence),
                        border: `1px solid ${confColor(h.confidence)}33`,
                      }}>
                        {h.confidence}/10
                      </span>
                      <span style={s.tag}>{HOOK_TYPES[h.type] || h.type}</span>
                    </div>
                    <p style={s.hText}>{h.text}</p>
                    <div style={{ fontSize: 12, color: '#6a8fc5', lineHeight: 1.6 }}>
                      <p><span style={s.dLbl}>Psikoloji:</span> {h.psychology}</p>
                      <p style={{ marginTop: 4 }}><span style={s.dLbl}>Görsel:</span> {h.visual_suggestion}</p>
                    </div>
                    <button onClick={() => navigator.clipboard?.writeText(h.text)} style={s.copyBtn}>Kopyala</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer style={s.footer}>
        <button onClick={() => { localStorage.removeItem(AUTH_KEY); location.reload(); }} style={s.lockBtn}>
          Kilitle
        </button>
      </footer>
    </div>
  );
}

/* ─── FIELD HELPER ─── */
function F({ l, v, p, c, type = 'text' }) {
  return (
    <div style={s.fld}>
      <label style={s.lbl}>{l}</label>
      <input type={type} style={s.inp} value={v} placeholder={p} onChange={e => c(e.target.value)} />
    </div>
  );
}

/* ═══════════════════════════════════════════
   ROOT APP WITH AUTH
   ═══════════════════════════════════════════ */
export default function App() {
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const ts = localStorage.getItem(AUTH_KEY);
    // Session valid for 30 days
    if (ts && Date.now() - parseInt(ts) < 2592000000) setAuthed(true);
  }, []);

  if (!authed) return <PinLock onUnlock={() => setAuthed(true)} />;
  return <HookEngine />;
}

/* ═══════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════ */
const s = {
  root: {
    minHeight: '100vh', minHeight: '100dvh',
    background: '#060b14', color: '#d0d8e8',
    fontFamily: "'JetBrains Mono', 'SF Mono', monospace", fontSize: 13,
    display: 'flex', flexDirection: 'column',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px', borderBottom: '1px solid #111a2a',
    background: 'linear-gradient(180deg, #0a1020, #060b14)',
    flexWrap: 'wrap', gap: 8,
  },
  hLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  logoIcon: { color: '#00ff88', fontSize: 18 },
  logoText: { fontSize: 15, fontWeight: 700, letterSpacing: 3, color: '#fff' },
  hStats: { display: 'flex', gap: 14 },
  chip: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 },
  chipVal: { fontSize: 14, fontWeight: 700, color: '#fff' },
  chipLbl: { fontSize: 9, color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: 1 },

  tabs: {
    display: 'flex', borderBottom: '1px solid #111a2a', padding: '0 8px',
    overflowX: 'auto', WebkitOverflowScrolling: 'touch',
  },
  tab: {
    flex: 1, padding: '11px 0', background: 'none', border: 'none',
    color: '#4a6fa5', cursor: 'pointer', fontSize: 12, textAlign: 'center',
    borderBottom: '2px solid transparent', transition: 'all 0.2s', whiteSpace: 'nowrap',
  },
  tabOn: { color: '#00ff88', borderBottomColor: '#00ff88' },

  err: {
    margin: '12px 16px 0', padding: '10px 14px', background: '#1a0a0e',
    border: '1px solid #331420', borderRadius: 6, color: '#ff4466',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12,
  },
  errX: { background: 'none', border: 'none', color: '#ff4466', cursor: 'pointer', fontSize: 18 },

  loadWrap: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '36px 0',
  },
  spinner: {
    width: 18, height: 18, border: '2px solid #141e30', borderTopColor: '#00ff88',
    borderRadius: '50%', animation: 'spin 0.8s linear infinite',
  },
  loadTxt: { color: '#4a6fa5', fontSize: 12 },

  main: { flex: 1, padding: '20px 16px', maxWidth: 680, width: '100%', margin: '0 auto' },

  title: { fontSize: 17, fontWeight: 700, color: '#fff', marginBottom: 4 },
  desc: { color: '#4a6fa5', fontSize: 12, marginBottom: 18 },

  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  full: { gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: 4 },
  fld: { display: 'flex', flexDirection: 'column', gap: 4 },
  lbl: { fontSize: 10, color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: 1 },
  inp: {
    padding: '10px 12px', background: '#0a1020', border: '1px solid #1a2a44',
    borderRadius: 6, color: '#e0e6f0', fontSize: 14,
  },
  ta: {
    padding: '10px 12px', background: '#0a1020', border: '1px solid #1a2a44',
    borderRadius: 6, color: '#e0e6f0', fontSize: 14, resize: 'vertical',
  },
  sel: {
    padding: '10px 12px', background: '#0a1020', border: '1px solid #1a2a44',
    borderRadius: 6, color: '#e0e6f0', fontSize: 13,
  },

  btnP: {
    marginTop: 16, padding: '13px 24px', background: '#00ff88', color: '#060b14',
    border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 700,
    letterSpacing: 1.5, cursor: 'pointer', textTransform: 'uppercase', width: '100%',
  },
  btnS: {
    padding: '8px 14px', background: 'transparent', color: '#4a6fa5',
    border: '1px solid #1a2a44', borderRadius: 5, fontSize: 11, cursor: 'pointer',
  },

  libHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 14, flexWrap: 'wrap', gap: 8,
  },

  empty: { textAlign: 'center', padding: '50px 0' },
  emptyTxt: { color: '#4a6fa5', marginBottom: 14 },

  vCard: {
    display: 'flex', gap: 10, padding: '12px 14px', background: '#0a1020',
    border: '1px solid #111a2a', borderRadius: 8, marginBottom: 8, alignItems: 'flex-start',
  },
  vRank: { minWidth: 30, textAlign: 'center', paddingTop: 2 },
  vBody: { flex: 1, minWidth: 0 },
  vHook: { fontSize: 13, color: '#fff', fontWeight: 600, marginBottom: 6, lineHeight: 1.45 },
  vTags: { display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 },
  tag: { fontSize: 9, padding: '2px 7px', background: '#111a2a', borderRadius: 3, color: '#5a8ac5' },
  vNums: { display: 'flex', gap: 8, flexWrap: 'wrap', fontSize: 11, color: '#4a6fa5' },
  vRight: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 54 },
  engBadge: { fontSize: 12, fontWeight: 700, padding: '3px 8px', border: '1px solid', borderRadius: 5 },
  delBtn: { background: 'none', border: 'none', color: '#2a1a24', cursor: 'pointer', fontSize: 18 },

  aGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  aCard: { background: '#0a1020', border: '1px solid #111a2a', borderRadius: 8, padding: 16 },
  aTitle: { fontSize: 13, fontWeight: 700, color: '#00ff88', marginBottom: 12 },
  aItem: { fontSize: 12, color: '#a0b0c8', lineHeight: 1.6, marginBottom: 8 },
  formula: { fontSize: 15, color: '#fff', fontWeight: 600, lineHeight: 1.6 },

  hCard: {
    background: '#0a1020', border: '1px solid #111a2a', borderRadius: 8,
    padding: 16, position: 'relative',
  },
  hHead: { display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' },
  hText: { fontSize: 17, fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: 12, paddingRight: 60 },
  dLbl: { color: '#3a5a85', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 1 },
  copyBtn: {
    position: 'absolute', top: 12, right: 12, background: '#111a2a',
    border: '1px solid #1a2a44', color: '#5a8ac5', padding: '4px 10px',
    borderRadius: 4, fontSize: 10, cursor: 'pointer',
  },

  footer: {
    padding: '12px 16px', borderTop: '1px solid #111a2a', textAlign: 'center',
  },
  lockBtn: {
    background: 'none', border: '1px solid #1a2a44', color: '#3a5a85',
    padding: '6px 20px', borderRadius: 5, fontSize: 11, cursor: 'pointer',
  },
};
