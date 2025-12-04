import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import axios from 'axios'
import './AuthPages.css'

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const token = searchParams.get('token')

  useEffect(() => {
    if (!token) {
      setError('Geçersiz veya eksik token')
    }
  }, [token])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')

    if (password !== passwordConfirm) {
      setError('Şifreler eşleşmiyor')
      return
    }

    if (password.length < 6) {
      setError('Şifre en az 6 karakter olmalıdır')
      return
    }

    setLoading(true)

    try {
      await axios.post('/api/auth/reset-password', {
        token,
        password
      })
      setMessage('Şifreniz başarıyla sıfırlandı. Giriş sayfasına yönlendiriliyorsunuz...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err) {
      setError(err.response?.data?.message || 'Şifre sıfırlanırken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <h1>Şifre Sıfırlama</h1>
          <div className="error-message">Geçersiz veya eksik token</div>
          <p className="auth-footer">
            <Link to="/forgot-password">Yeni şifre sıfırlama linki iste</Link>
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Şifre Sıfırla</h1>
        {error && <div className="error-message">{error}</div>}
        {message && <div style={{ background: '#d4edda', color: '#155724', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>{message}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Yeni Şifre</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="form-group">
            <label>Yeni Şifre Tekrar</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Sıfırlanıyor...' : 'Şifreyi Sıfırla'}
          </button>
        </form>
        <p className="auth-footer">
          <Link to="/login">Giriş sayfasına dön</Link>
        </p>
      </div>
    </div>
  )
}

export default ResetPasswordPage

