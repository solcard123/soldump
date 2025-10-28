"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { FuzzyText } from "@/components/fuzzy-text"
import { AnimatedCounter } from "@/components/animated-counter"
import ScrollFloat from "@/components/scroll-float"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Zap, TrendingUp, Shield, Clock, Globe, Star, CheckCircle2, ArrowRight, Sparkles } from "lucide-react"
import { HeroSection } from "@/components/hero-section"
import WalletCustomButton from "@/blockchain/components/WalletCustomButton"

type PhantomEvent = "connect" | "disconnect" | "accountChanged"

type PhantomConnectResult = {
  publicKey: {
    toString(): string
  }
}

type PhantomProvider = {
  isPhantom?: boolean
  connect: (options?: { onlyIfTrusted?: boolean }) => Promise<PhantomConnectResult>
  disconnect: () => Promise<void>
  on?: (event: PhantomEvent, handler: (args: unknown) => void) => void
  off?: (event: PhantomEvent, handler: (args: unknown) => void) => void
  removeListener?: (event: PhantomEvent, handler: (args: unknown) => void) => void
}

type WindowWithSolana = Window & {
  solana?: PhantomProvider
}

export default function Home() {
  const [phantomProvider, setPhantomProvider] = useState<PhantomProvider | null>(null)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const provider = (window as WindowWithSolana).solana

    if (!provider?.isPhantom) {
      setPhantomProvider(null)
      return
    }

    setPhantomProvider(provider)

    const extractAddress = (payload: unknown) => {
      if (!payload) {
        return null
      }

      if (typeof payload === "string") {
        return payload
      }

      if (typeof payload === "object") {
        if ("publicKey" in payload && payload.publicKey && typeof (payload.publicKey as unknown as { toString?: () => string }).toString === "function") {
          return (payload as PhantomConnectResult).publicKey.toString()
        }

        if ("toString" in payload && typeof (payload as { toString?: () => string }).toString === "function") {
          return (payload as { toString: () => string }).toString()
        }
      }

      return null
    }

    const handleConnect = (args: unknown) => {
      const address = extractAddress(args)
      if (address) {
        setWalletAddress(address)
      }
    }

    const handleDisconnect = () => {
      setWalletAddress(null)
    }

    const handleAccountChanged = (args: unknown) => {
      const address = extractAddress(args)
      setWalletAddress(address)
    }

    provider.on?.("connect", handleConnect)
    provider.on?.("disconnect", handleDisconnect)
    provider.on?.("accountChanged", handleAccountChanged)

    provider
      .connect({ onlyIfTrusted: true })
      .then((result: any) => {
        const publicKey = extractAddress(result)
        if (publicKey) {
          setWalletAddress(publicKey)
        }
      })
      .catch(() => {
        /* ignored - user has not authorized yet */
      })

    return () => {
      provider.off?.("connect", handleConnect)
      provider.off?.("disconnect", handleDisconnect)
      provider.off?.("accountChanged", handleAccountChanged)

      provider.removeListener?.("connect", handleConnect)
      provider.removeListener?.("disconnect", handleDisconnect)
      provider.removeListener?.("accountChanged", handleAccountChanged)
    }
  }, [])

  const handleConnectPhantom = useCallback(async () => {
    if (!phantomProvider) {
      window.open("https://phantom.app", "_blank", "noopener,noreferrer")
      return
    }

    setIsConnecting(true)
    try {
      const result = await phantomProvider.connect()
      const publicKey = result?.publicKey?.toString()
      if (publicKey) {
        setWalletAddress(publicKey)
      }
    } catch (error) {
      console.error("Failed to connect to Phantom", error)
    } finally {
      setIsConnecting(false)
    }
  }, [phantomProvider])

  const handleDisconnectPhantom = useCallback(async () => {
    if (!phantomProvider) {
      return
    }

    try {
      await phantomProvider.disconnect()
    } catch (error) {
      console.error("Failed to disconnect Phantom", error)
    } finally {
      setWalletAddress(null)
    }
  }, [phantomProvider])

  const buttonLabel = useMemo(() => {
    if (walletAddress) {
      return `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`
    }

    if (!phantomProvider) {
      return "Instalar Phantom"
    }

    if (isConnecting) {
      return "Conectando..."
    }

    return "Conectar Phantom"
  }, [phantomProvider, walletAddress, isConnecting])

  return (
    <div className="relative min-h-screen overflow-x-hidden" suppressHydrationWarning>
      <div className="fixed inset-0 z-0" suppressHydrationWarning style={{
        backgroundImage: 'url(/bg4.jpg)',
        backgroundRepeat: 'repeat',
        backgroundSize: 'auto',
        backgroundPosition: '0 0'
      }} />

      <main className="relative z-10 min-h-screen bg-background/10 overflow-x-hidden" suppressHydrationWarning>
        {/* Header */}
        <header className="fixed top-0 w-full z-50 border-b border-border/50 backdrop-blur-md bg-background/80">
          <div className="container mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between max-w-full">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 sm:w-6 sm:h-6 text-primary-foreground" />
              </div>
              <span className="text-base sm:text-xl font-bold text-primary truncate">soldump.com</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent text-sm sm:text-base"
              onClick={walletAddress ? handleDisconnectPhantom : handleConnectPhantom}
              disabled={isConnecting && !walletAddress}
            >
              {buttonLabel}
            </Button>
          </div>
        </header>

        {/* Hero Section nuevo */}
        <HeroSection 
          imageSrc="/1.png"
          primaryCta="CONNECT WALLET"
          onPrimary={handleConnectPhantom}
        />

        {/* Stats Section */}
        <section className="py-12 sm:py-16 px-4 border-y border-border/50">
          <div className="container mx-auto max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
              {[
                { value: 1000, suffix: "+", label: "Active Users" },
                { value: 24, suffix: "/7", label: "Always Working" },
                { value: 98, suffix: "%", label: "Success Rate" },
                { value: 500, suffix: "K+", label: "Transactions" },
              ].map((stat, index) => (
                <div key={index} className="text-center space-y-1 sm:space-y-2">
                  <div className="text-3xl sm:text-4xl md:text-5xl font-bold text-primary neon-glow">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <p className="text-xs sm:text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product Features */}
        <section className="py-12 sm:py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12 sm:mb-16" />

            <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  icon: Clock,
                  title: "Working 24/7",
                  description: "Never miss an opportunity, analyze memecoins and it tells you which ones are compatible for rug pulls",
                },
                {
                  icon: TrendingUp,
                  title: "No limits",
                  description: "You can make as many transactions as you want, without limits",
                },
                {
                  icon: Shield,
                  title: "No commissions",
                  description: "We don't charge commissions for each rug pull, you pay the price (now try it for free until December 11) then $100/month",
                },
              ].map((feature, index) => (
                <Card
                  key={index}
                  className="p-6 sm:p-8 bg-card border-border hover:border-primary/50 transition-all duration-300 hover:neon-border group"
                >
                  <feature.icon className="w-10 h-10 sm:w-12 sm:h-12 text-primary mb-3 sm:mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3">{feature.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="py-12 sm:py-20 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12 sm:mb-16">
              <ScrollFloat
                containerClassName="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-3 sm:mb-4 px-4"
                animationDuration={1.2}
                ease="power3.out"
                stagger={0.02}
              >
                Trusted by "rugpullers" worldwide
              </ScrollFloat>
              <div className="flex flex-wrap items-center justify-center gap-1 mb-3 sm:mb-4 px-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 sm:w-6 sm:h-6 fill-primary text-primary" />
                ))}
                <span className="ml-2 text-xs sm:text-sm text-muted-foreground">4.9/5 from 1,000+ rugpullers</span>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-4 sm:gap-6">
              {[
                {
                  name: "Alex M.",
                  role: "Professional Rugpuller",
                  review:
                    "This machine changed my life. I made my first $10K in the first rugpull. Set it and forget it!",
                },
                {
                  name: "Sarah K.",
                  role: "Memecoin Hunter",
                  review: "Finally, a tool that actually works 24/7. No more staying up late finding targets.",
                },
                {
                  name: "Mike R.",
                  role: "Crypto Trader",
                  review:
                    "Best investment I ever made. The rugpull detection is flawless and the results speak for themselves.",
                },
              ].map((review, index) => (
                <Card key={index} className="p-5 sm:p-6 bg-card border-border hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-1 mb-3 sm:mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-primary text-primary" />
                    ))}
                  </div>
                  <p className="text-sm sm:text-base text-foreground mb-3 sm:mb-4 leading-relaxed">"{review.review}"</p>
                  <div>
                    <p className="text-sm sm:text-base font-semibold text-primary">{review.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">{review.role}</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 sm:py-20 px-4 bg-card/30">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center mb-12 sm:mb-16">
              <ScrollFloat
                containerClassName="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary mb-3 sm:mb-4 px-4"
                animationDuration={1.2}
                ease="power3.out"
                stagger={0.02}
              >
                How it works
              </ScrollFloat>
              <p className="text-base sm:text-xl text-muted-foreground px-4">Get started in 3 simple steps</p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
              {[
                {
                  step: "01",
                  title: "Connect Wallet",
                  description: "Securely link your Phantom wallet in seconds.",
                },
                {
                  step: "02",
                  title: "Analyze memecoins with 1 click",
                  description: "Check if it's compatible and drain everything",
                },
                {
                  step: "03",
                  title: "Win money",
                  description: "Receive your winnings in your wallet",
                },
              ].map((step, index) => (
                <div key={index} className="text-center space-y-3 sm:space-y-4">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto neon-border">
                    {step.step}
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground px-2">{step.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed px-4">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-12 sm:py-20 px-4">
          <div className="container mx-auto max-w-4xl">
            <Card className="p-8 sm:p-12 bg-card border-2 border-primary/50 neon-border text-center space-y-4 sm:space-y-6">
              <Badge variant="outline" className="border-primary text-primary text-xs sm:text-sm">
                Limited Time Offer
              </Badge>
              <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-primary px-2 sm:px-4 leading-tight break-words">
                Ready to start your Rugpull machine?
              </h2>
              <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto px-2 sm:px-4 break-words">
                Join 1,000+ successful "rugpullers" who are already earning passively with our automated rugpull system
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-4">
                <WalletCustomButton
                  connectButtonText="Get Your Rugpull business Now"
                  buyButtonText="Get Your Rugpull business Now"
                  className="bg-[#FFFF33] text-black font-bold px-8 py-6 text-base md:text-lg hover:bg-[#FFFF33]/90 hover:translate-y-[-2px] transition-all duration-300 shadow-[0_0_20px_rgba(255,255,51,0.5)] hover:shadow-[0_0_30px_rgba(255,255,51,0.8)]"
                />
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 pt-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span>No deposit required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  <span>Setup in 5 minutes</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 py-8 sm:py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-primary-foreground" />
                </div>
                <span className="text-base sm:text-lg font-bold text-primary">soldump.com</span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground text-center">
                © 2025 SolDump. All rights reserved.
              </p>
              <div className="flex gap-4 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
                <a href="#" className="hover:text-primary transition-colors">
                  Terms
                </a>
                <a href="#" className="hover:text-primary transition-colors">
                  Privacy
                </a>
                <a href="#" className="hover:text-primary transition-colors">
                  Contact
                </a>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
