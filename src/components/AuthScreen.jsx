import { useState } from 'react'
import {
  signIn,
  signUp,
  requestPasswordReset,
  updatePassword,
} from '../lib/auth'
import './AuthScreen.css'

/**
 * Sign-in / sign-up screen shown in cloud mode when no user is signed in.
 *
 * @param {{ recoveryMode?: boolean, onRecoveryDone?: () => void }} props
 *   recoveryMode: user arrived from a password-reset email link.
 */
export function AuthScreen({ recoveryMode = false, onRecoveryDone }) {
  const [mode, setMode] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setNotice('')
    setLoading(true)
    try {
      if (recoveryMode) {
        if (password.length < 8) {
          throw new Error('Choose a password of at least 8 characters.')
        }
        await updatePassword(password)
        setNotice('Password updated — you are signed in.')
        onRecoveryDone?.()
      } else if (mode === 'signin') {
        await signIn(email, password)
      } else {
        if (password.length < 8) {
          throw new Error('Choose a password of at least 8 characters.')
        }
        const { needsEmailConfirmation } = await signUp(email, password)
        if (needsEmailConfirmation) {
          setNotice('Check your email to confirm your account, then sign in.')
          setMode('signin')
        }
      }
    } catch (err) {
      setError(err.message ?? 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotPassword() {
    setError('')
    setNotice('')
    if (!email.trim()) {
      setError('Enter your email above first, then click "Forgot password?".')
      return
    }
    setLoading(true)
    try {
      await requestPasswordReset(email)
      setNotice('Password reset email sent — check your inbox.')
    } catch (err) {
      setError(err.message ?? 'Could not send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-screen">
      <div className="auth-screen__card">
        <h1 className="auth-screen__brand">Recipes</h1>
        <p className="auth-screen__tagline">
          Your recipe box, beautifully typeset. Sign in to keep your recipes
          safe in the cloud on every device.
        </p>

        {!recoveryMode ? (
          <div className="auth-screen__tabs">
            <button
              type="button"
              className={
                mode === 'signin'
                  ? 'auth-screen__tab auth-screen__tab--active'
                  : 'auth-screen__tab'
              }
              onClick={() => setMode('signin')}
              disabled={loading}
            >
              Sign In
            </button>
            <button
              type="button"
              className={
                mode === 'signup'
                  ? 'auth-screen__tab auth-screen__tab--active'
                  : 'auth-screen__tab'
              }
              onClick={() => setMode('signup')}
              disabled={loading}
            >
              Create Account
            </button>
          </div>
        ) : (
          <p className="auth-screen__recovery-title">Choose a new password</p>
        )}

        <form className="auth-screen__form" onSubmit={handleSubmit}>
          {!recoveryMode ? (
            <label className="auth-screen__field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                disabled={loading}
              />
            </label>
          ) : null}

          <label className="auth-screen__field">
            <span>{recoveryMode ? 'New password' : 'Password'}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' && !recoveryMode ? 'current-password' : 'new-password'}
              required
              minLength={recoveryMode || mode === 'signup' ? 8 : undefined}
              disabled={loading}
            />
          </label>

          {notice ? <p className="auth-screen__notice">{notice}</p> : null}
          {error ? <p className="auth-screen__error">{error}</p> : null}

          <button type="submit" className="auth-screen__submit" disabled={loading}>
            {loading
              ? 'Working…'
              : recoveryMode
                ? 'Set New Password'
                : mode === 'signin'
                  ? 'Sign In'
                  : 'Create Account'}
          </button>

          {!recoveryMode && mode === 'signin' ? (
            <button
              type="button"
              className="auth-screen__forgot"
              onClick={handleForgotPassword}
              disabled={loading}
            >
              Forgot password?
            </button>
          ) : null}
        </form>
      </div>
    </div>
  )
}
