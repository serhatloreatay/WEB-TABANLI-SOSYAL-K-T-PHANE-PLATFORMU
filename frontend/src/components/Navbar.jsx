import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useQuery } from 'react-query'
import axios from 'axios'
import './Navbar.css'

const Navbar = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef(null)
  const resultsRef = useRef(null)

  const { data: userSearchResults, isLoading: userSearchLoading } = useQuery(
    ['userSearch', searchQuery],
    async () => {
      if (!searchQuery || searchQuery.trim().length < 2) return null
      const response = await axios.get('/api/users/search', {
        params: { query: searchQuery.trim(), limit: 5 }
      })
      return response.data
    },
    {
      enabled: searchQuery.trim().length >= 2,
      staleTime: 30000
    }
  )

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target) &&
        resultsRef.current &&
        !resultsRef.current.contains(event.target)
      ) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  useEffect(() => {
    if (userSearchResults?.users && userSearchResults.users.length > 0) {
      setShowResults(true)
    } else {
      setShowResults(false)
    }
  }, [userSearchResults])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleUserClick = (userId) => {
    setSearchQuery('')
    setShowResults(false)
    navigate(`/profile/${userId}`)
  }

  return (
    <nav className="navbar">
      <div className="container">
        <div className="navbar-content">
          <Link to="/" className="navbar-brand">
            Kütüphanem
          </Link>
          {user && (
            <div className="navbar-menu">
              <Link to="/">Ana Sayfa</Link>
              <Link to="/search">Ara & Keşfet</Link>
              <div className="user-search-container" ref={searchRef}>
                <input
                  type="text"
                  placeholder="Kullanıcı ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => {
                    if (userSearchResults?.users && userSearchResults.users.length > 0) {
                      setShowResults(true)
                    }
                  }}
                  className="user-search-input"
                />
                {showResults && userSearchResults?.users && (
                  <div className="user-search-results" ref={resultsRef}>
                    {userSearchLoading ? (
                      <div className="user-search-loading">Aranıyor...</div>
                    ) : userSearchResults.users.length > 0 ? (
                      userSearchResults.users.map((user) => (
                        <div
                          key={user.id}
                          className="user-search-result-item"
                          onClick={() => handleUserClick(user.id)}
                        >
                          <img
                            src={user.avatar_url || '/default-avatar.png'}
                            alt={user.username}
                            className="user-search-avatar"
                          />
                          <div className="user-search-info">
                            <div className="user-search-username">{user.username}</div>
                            {user.bio && (
                              <div className="user-search-bio">{user.bio}</div>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="user-search-no-results">Kullanıcı bulunamadı</div>
                    )}
                  </div>
                )}
              </div>
              <Link to={`/profile/${user.id}`} className="profile-link">
                <img 
                  src={user.avatar_url || '/default-avatar.png'} 
                  alt={user.username}
                  className="navbar-avatar"
                />
                <span>Profilim</span>
              </Link>
              <button onClick={handleLogout}>Çıkış</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}

export default Navbar

