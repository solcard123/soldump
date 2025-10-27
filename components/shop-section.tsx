"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, Lock, Users, MessageSquare } from "lucide-react"
import { useAccount, useWriteContract } from 'wagmi'
import { useEffect, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'

export function ShopSection() {
  const { address, isConnected } = useAccount()
  const { writeContract, isPending } = useWriteContract()
  const [alreadyPurchased, setAlreadyPurchased] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  useEffect(() => {
  // Check existing purchase
    if (!isConnected) return
  fetch('/api/purchases?sku=GT3RS-ACCESS', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.purchased) setAlreadyPurchased(true)
      }).catch(() => {})
  }, [isConnected])

  const handlePurchase = async () => {
    if (!isConnected) return
    if (alreadyPurchased) return
    // TODO: Replace with actual contract details
    try {
      console.log('Initiating purchase for', address)
      // writeContract({ address: '0xContract', abi: [], functionName: 'mint', args: [] })
      let unmounted = false
  const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: 'GT3RS Access', sku: 'GT3RS-ACCESS', priceWei: '0', txHash: 'demo' })
      })
      if (res.ok) {
        const data = await res.json()
        if (unmounted) return
        setAlreadyPurchased(true)
  setStatusMsg('Purchase recorded. Preparing download...')
        if (data.downloadToken) {
          // Lanza descarga
            const url = `/api/download?token=${data.downloadToken}&sku=GT3RS-ACCESS`
            const a = document.createElement('a')
            a.href = url
            a.download = 'software.txt'
            document.body.appendChild(a)
            a.click()
            a.remove()
            if (!unmounted) setStatusMsg('Download started')
        }
      } else {
  let errMsg = 'Purchase error'
        try {
          const data = await res.json()
          errMsg = data.error || errMsg
        } catch {}
        if (!unmounted) setStatusMsg(errMsg)
      }
    } catch (e) {
      console.error(e)
  setStatusMsg('Unexpected error')
    }
    // cleanup not strictly needed here since function not persistent, remove unmounted pattern
  }

  return (
    <section className="py-16 px-4 lg:px-8 bg-secondary/30">
      <div className="container mx-auto">
        <div className="text-center mb-12 space-y-4">
          <h2 className="text-3xl md:text-4xl font-bold">
            Exclusive <span className="text-primary">GT3RS</span> Access
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Connect your wallet to unlock exclusive access to the 1day1car community
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Main Product Card */}
          <Card className="md:col-span-2 lg:col-span-2 border-primary/50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl mb-2">Porsche GT3RS Access</CardTitle>
                  <CardDescription className="text-base">Limited to one purchase per wallet</CardDescription>
                </div>
                <Badge className="bg-primary text-primary-foreground">Exclusive</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img src="/porsche-gt3rs-luxury-sports-car.jpg" alt="Porsche GT3RS" className="w-full h-full object-cover" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Lock className="w-4 h-4 text-primary" />
                  <span>Wallet Verified Only</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="w-4 h-4 text-primary" />
                  <span>Community Access</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>Discord Exclusive</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span>1 Per Wallet Max</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              {!isConnected ? (
                <div className="w-full flex justify-center">
                  <ConnectButton showBalance={false} chainStatus="icon" />
                </div>
              ) : (
                <div className="w-full space-y-2">
                  {!alreadyPurchased && (
                    <Button
                      disabled={isPending}
                      onClick={handlePurchase}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold py-6 text-lg transition-all duration-300 hover:scale-105 disabled:opacity-70"
                    >
                      <Wallet className="w-5 h-5 mr-2" />
                      {isPending ? 'Processing...' : 'Buy Access'}
                    </Button>
                  )}
                  {alreadyPurchased && (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={async () => {
                          setStatusMsg('Generating download link...')
                          try {
                            const res = await fetch('/api/purchases/download', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sku: 'GT3RS-ACCESS' }) })
                            if (!res.ok) {
                              const data = await res.json().catch(()=>({}))
                              setStatusMsg(data.error || 'Failed creating token')
                              return
                            }
                            const data = await res.json()
                            if (data.downloadToken) {
                              const url = `/api/download?token=${data.downloadToken}&sku=GT3RS-ACCESS`
                              const a = document.createElement('a')
                              a.href = url
                              a.download = 'software.txt'
                              document.body.appendChild(a)
                              a.click()
                              a.remove()
                              setStatusMsg('Download started')
                            }
                          } catch (e) {
                            setStatusMsg('Unexpected error')
                          }
                        }}
                      >
                        Download again
                      </Button>
                      <Button variant="outline" className="flex-1" disabled>
                        Purchased
                      </Button>
                    </div>
                  )}
                  {statusMsg && <p className="text-xs text-center text-muted-foreground">{statusMsg}</p>}
                </div>
              )}
            </CardFooter>
          </Card>

          {/* Benefits Card */}
          <Card className="border-border shadow-lg hover:shadow-xl transition-all duration-300">
            <CardHeader>
              <CardTitle className="text-xl">What You Get</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary font-bold">1</span>
                  </div>
                  <div>
                    <p className="font-semibold">GT3RS Purchase Right</p>
                    <p className="text-sm text-muted-foreground">Exclusive access to purchase</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary font-bold">2</span>
                  </div>
                  <div>
                    <p className="font-semibold">Discord Community</p>
                    <p className="text-sm text-muted-foreground">Join exclusive members</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary font-bold">3</span>
                  </div>
                  <div>
                    <p className="font-semibold">Learn & Network</p>
                    <p className="text-sm text-muted-foreground">Connect with car enthusiasts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-primary font-bold">4</span>
                  </div>
                  <div>
                    <p className="font-semibold">Verified Access</p>
                    <p className="text-sm text-muted-foreground">Blockchain authenticated</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}
