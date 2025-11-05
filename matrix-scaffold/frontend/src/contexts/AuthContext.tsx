import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export interface User {
  id: string
  email: string
  username: string
  role: 'super_admin' | 'admin' | 'developer' | 'viewer'
  isActive: boolean
  createdAt: string
  lastLogin?: string
  profileImage?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>
  register: (email: string, username: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshToken: () => Promise<boolean>
  updateProfile: (data: { username?: string; profileImage?: string }) => Promise<{ success: boolean; error?: string }>
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('authToken'))
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user && !!token

  // API call helper with authentication
  const apiCall = async (endpoint: string, options: RequestInit = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    })

    if (response.status === 401) {
      // Token expired or invalid
      handleLogout()
      throw new Error('Authentication required')
    }

    return response
  }

  const handleLogout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
  }

  const login = async (email: string, password: string, rememberMe = false) => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password, rememberMe }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setToken(data.accessToken)
        localStorage.setItem('authToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        return { success: true }
      } else {
        return { success: false, error: data.message || data.error || 'Login failed' }
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (email: string, username: string, password: string, confirmPassword: string) => {
    try {
      setIsLoading(true)
      
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, username, password, confirmPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        setUser(data.user)
        setToken(data.accessToken)
        localStorage.setItem('authToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        return { success: true }
      } else {
        return { 
          success: false, 
          error: data.details ? data.details.join(', ') : data.message || data.error || 'Registration failed' 
        }
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await apiCall('/auth/logout', { method: 'POST' })
    } catch (error) {
      // Ignore errors on logout
    } finally {
      handleLogout()
    }
  }

  const refreshToken = async () => {
    try {
      const storedRefreshToken = localStorage.getItem('refreshToken')
      if (!storedRefreshToken) return false

      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      })

      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setToken(data.accessToken)
        localStorage.setItem('authToken', data.accessToken)
        return true
      } else {
        handleLogout()
        return false
      }
    } catch (error) {
      handleLogout()
      return false
    }
  }

  const updateProfile = async (profileData: { username?: string; profileImage?: string }) => {
    try {
      const response = await apiCall('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData),
      })

      const data = await response.json()

      if (response.ok) {
        setUser({ ...user!, ...data.user })
        return { success: true }
      } else {
        return { success: false, error: data.message || data.error || 'Profile update failed' }
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  const changePassword = async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    try {
      const response = await apiCall('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      })

      const data = await response.json()

      if (response.ok) {
        return { success: true }
      } else {
        return { 
          success: false, 
          error: data.details ? data.details.join(', ') : data.message || data.error || 'Password change failed' 
        }
      }
    } catch (error) {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await apiCall('/auth/me')
          
          if (response.ok) {
            const data = await response.json()
            setUser(data.user)
          } else {
            // Try to refresh token
            const refreshed = await refreshToken()
            if (!refreshed) {
              handleLogout()
            }
          }
        } catch (error) {
          // Try to refresh token
          const refreshed = await refreshToken()
          if (!refreshed) {
            handleLogout()
          }
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!token) return

    const interval = setInterval(async () => {
      await refreshToken()
    }, 6 * 60 * 60 * 1000) // Refresh every 6 hours

    return () => clearInterval(interval)
  }, [token])

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
    changePassword,
    isLoading,
    isAuthenticated,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Role checking helpers
export const hasRole = (user: User | null, roles: string[]) => {
  return user && roles.includes(user.role)
}

export const isAdmin = (user: User | null) => {
  return hasRole(user, ['admin', 'super_admin'])
}

export const isSuperAdmin = (user: User | null) => {
  return hasRole(user, ['super_admin'])
}