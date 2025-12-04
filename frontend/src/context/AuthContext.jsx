import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const token = localStorage.getItem('token')
      if (token) {
        // Verify token and get user info
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
        // You can add an endpoint to verify token and get user info
        const userStr = localStorage.getItem('user')
        if (userStr) {
          try {
            setUser(JSON.parse(userStr))
          } catch (parseError) {
            console.error('Error parsing user from localStorage:', parseError)
            localStorage.removeItem('user')
            localStorage.removeItem('token')
          }
        }
      }
    } catch (error) {
      console.error('Error in AuthContext useEffect:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete axios.defaults.headers.common['Authorization']
    setUser(null)
  }

  const updateUser = (userData) => {
    if (!user) {
      console.warn('Cannot update user: user is null')
      return
    }
    const updatedUser = { ...user, ...userData }
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setUser(updatedUser)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

