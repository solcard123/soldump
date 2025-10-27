"use client"
import { useEffect, useState, useCallback } from 'react'

export interface AuthUser {
  id: string
  email: string
  username: string
  walletAddress?: string | null
}

interface UseAuthOptions {
  autoFetch?: boolean
}

export function useAuth({ autoFetch = true }: UseAuthOptions = {}) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(autoFetch)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/me', { cache: 'no-store' })
      const data = await res.json()
      setUser(data.user)
    } catch (e) {
      setError('Failed to load user')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (autoFetch) refresh()
  }, [autoFetch, refresh])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return { user, loading, error, refresh, logout, setUser }
}
