"use client"

import { Button } from "@/components/ui/button"
import { Wallet } from "lucide-react"
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount } from 'wagmi'
import { ThemeToggle } from "./theme-toggle"
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'

interface User {
  id: string; email: string; username: string; walletAddress?: string | null;
}

export function Navbar() {

  const [user, setUser] = useState<User | null>(null)
  const [loadingUser, setLoadingUser] = useState(true)
  const { address, isConnected } = useAccount()

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => {
      setUser(d.user)
      setLoadingUser(false)
    }).catch(() => setLoadingUser(false))
  }, [])

  // Link wallet automatically if user logged and wallet connected but not linked
  useEffect(() => {
    let aborted = false
    async function link() {
      if (!(user && isConnected && address && !user.walletAddress)) return
      try {
        const res = await fetch('/api/auth/link-wallet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ walletAddress: address })
        })
        if (!res.ok) return
        const data = await res.json()
        if (!aborted && data.user) setUser(data.user)
      } catch {}
    }
    link()
    return () => { aborted = true }
  }, [user, isConnected, address])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            {/* Logo: siempre visible */}
            <div className="w-10 h-10 rounded-lg overflow-hidden border border-border flex items-center justify-center shadow-sm">
              <Image
                src="/logo.PNG"
                alt="1day1caASr logo"
                width={40}
                height={40}
                className="object-contain"
                unoptimized
                style={{ imageRendering: 'crisp-edges' }}
                quality={100}
                priority
              />
            </div>
            <span className="font-bold text-xl text-primary">1day1car</span>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            {user ? (
              <>
                <span className="text-sm">Hi, <strong>{user.username}</strong></span>
                <Button variant="outline" onClick={logout}>Log out</Button>
              </>
            ) : loadingUser ? (
              <span className="text-xs text-muted-foreground">Loading...</span>
            ) : null}
              <div className="hidden sm:block">
                <ConnectButton chainStatus="icon" showBalance={false} accountStatus={{ smallScreen: 'avatar', largeScreen: 'full' }} />
              </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
