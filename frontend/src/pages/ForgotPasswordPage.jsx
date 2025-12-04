import { useState } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import './AuthPages.css'

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLink, setResetLink] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setMessage('')
    setResetLink('')
    setLoading(true)

    try {
      const response = await axios.post('/api/auth/forgot-password', { email })
      setMessage(response.data.message || 'Eğer bu e-posta adresi kayıtlıysa, şifre sıfırlama linki gönderildi.')
      
      // Development modunda link response'da geliyorsa göster
      if (response.data.resetLink) {
        setResetLink(response.data.resetLink)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <h1>Şifremi Unuttum</h1>
        {error && <div className="error-message">{error}</div>}
        {message && (
          <div style={{ background: '#d4edda', color: '#155724', padding: '0.75rem', borderRadius: '4px', marginBottom: '1rem' }}>
            <p>{message}</p>
            {resetLink && (
              <div style={{ marginTop: '1rem', padding: '1rem', background: '#fff', borderRadius: '4px', border: '1px solid #ddd' }}>
                <p style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>Development Modu - Şifre Sıfırlama Linki:</p>
                <a 
                  href={resetLink} 
                  style={{ color: '#007bff', wordBreak: 'break-all', display: 'block', marginBottom: '0.5rem' }}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {resetLink}
                </a>
                <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.5rem' }}>
                  Not: E-posta yapılandırması yapılmadığı için link burada gösterilmektedir.
                </p>
              </div>
            )}
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Linki Gönder'}
          </button>
        </form>
        <p className="auth-footer">
          <Link to="/login">Giriş sayfasına dön</Link>
        </p>
      </div>
    </div>
  )
}

export default ForgotPasswordPage

