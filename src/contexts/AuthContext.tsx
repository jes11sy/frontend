import React, { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/auth'
import type { User } from '../types/api'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (login: string, password: string) => Promise<User>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const isAuthenticated = !!user

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authApi.getCurrentUser()
        setUser(userData)
      } catch {
        // Cookie недоступен или недействителен
        setUser(null)
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (login: string, password: string) => {
    const response = await authApi.login({ login, password })
    // Cookie устанавливается автоматически сервером
    
    // Создаем объект пользователя из ответа авторизации
    const user: User = {
      id: response.user_id,
      login,
      status: 'active',
      user_type: response.user_type as 'admin' | 'employee' | 'master',
      role: response.role,
      created_at: new Date().toISOString()
    }
    
    setUser(user)
    return user
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // Игнорируем ошибки при выходе
    }
    // Cookie удаляется автоматически сервером
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 