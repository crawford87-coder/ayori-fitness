import { useState } from 'react'
import { supabase } from './supabase'

export default function Auth() {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)

  const handle = async () => {
    setLoading(true)
    setError(null)
    setMessage(null)
    const { error } = mode === 'signin'
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password })
    if (error) setError(error.message)
    else if (mode === 'signup') setMessage('Check your email to confirm your account.')
    setLoading(false)
  }

  const inputStyle = {
    width: '100%', padding: '13px 0', border: 'none',
    borderBottom: '1px solid rgba(255,245,220,0.10)',
    background: 'transparent', color: '#f5f0e8', fontSize: 14,
    fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div style={{
      background: '#111008', minHeight: '100vh', maxWidth: 480, margin: '0 auto',
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
      padding: '0 32px', fontFamily: "-apple-system,'SF Pro Text','Helvetica Neue',sans-serif",
    }}>
      <style>{`* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; } input::placeholder { color: #706858; }`}</style>

      <div style={{ fontSize: 11, letterSpacing: 4, textTransform: 'uppercase', color: '#b0a890', fontWeight: 500, marginBottom: 48 }}>Ayori</div>

      <div style={{ fontSize: 32, fontWeight: 200, letterSpacing: -1.5, color: '#f5f0e8', fontFamily: "'Georgia','Times New Roman',serif", lineHeight: 1.1, marginBottom: 10, whiteSpace: 'pre-line' }}>
        {mode === 'signin' ? 'Welcome\nback.' : 'Create\naccount.'}
      </div>
      <div style={{ fontSize: 13, color: '#706858', marginBottom: 40 }}>
        {mode === 'signin' ? 'Sign in to continue.' : 'Start tracking your goals.'}
      </div>

      <input
        type="email" placeholder="Email" value={email}
        onChange={e => setEmail(e.target.value)}
        style={{ ...inputStyle, marginBottom: 8 }}
      />
      <input
        type="password" placeholder="Password" value={password}
        onChange={e => setPassword(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handle()}
        style={{ ...inputStyle, marginBottom: 28 }}
      />

      {error && <div style={{ fontSize: 11, color: '#c05858', marginBottom: 16, letterSpacing: 0.5 }}>{error}</div>}
      {message && <div style={{ fontSize: 11, color: '#80b888', marginBottom: 16, letterSpacing: 0.5, lineHeight: 1.6 }}>{message}</div>}

      <button
        onClick={handle}
        disabled={loading || !email || !password}
        style={{
          padding: '13px 24px', borderRadius: 40, border: 'none',
          background: '#d4906a', color: '#111008', fontSize: 11,
          letterSpacing: 2, textTransform: 'uppercase',
          cursor: (loading || !email || !password) ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit', fontWeight: 600,
          opacity: (loading || !email || !password) ? 0.35 : 1,
          transition: 'opacity 0.15s', width: '100%', marginBottom: 20,
        }}
      >
        {loading ? '···' : mode === 'signin' ? 'Sign In' : 'Create Account'}
      </button>

      <button
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(null); setMessage(null) }}
        style={{
          background: 'transparent', border: 'none', color: '#706858', fontSize: 11,
          letterSpacing: 2, textTransform: 'uppercase', cursor: 'pointer',
          fontFamily: 'inherit', padding: '8px 0', textAlign: 'center',
        }}
      >
        {mode === 'signin' ? 'New here? Create account' : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
