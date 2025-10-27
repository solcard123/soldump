"use client"

import { IPhoneMockup } from "./iphone-mockup"
import { Button } from "@/components/ui/button"
import { Wallet, ArrowRight } from "lucide-react"
import { useConnectModal } from '@rainbow-me/rainbowkit'

export function HeroSection() {
  const { openConnectModal } = useConnectModal()
  const handleConnectWallet = () => {
    if (openConnectModal) return openConnectModal()
    console.log("Connecting wallet...")
  }

  return (
    <section className="min-h-screen pt-24 pb-16 px-4 lg:px-8">
      <div className="container mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Side - iPhone Mockup (más centrado hacia el medio en pantallas grandes) */}
          <div className="flex justify-center ">
            <IPhoneMockup />
          </div>

          {/* Right Side - Content */}
          <div className="space-y-8 text-center lg:text-left">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-balance leading-tight">
                The Exclusive <span className="text-primary">1day1carSSS</span> Wallet
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground text-pretty leading-relaxed max-w-2xl">
                The only wallet where I entered all the people from the 1day1car community. You will be able to purchase
                a maximum of one GT3RS. By accessing it, you will have access to the Discord community where you will
                learn more.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button
                onClick={handleConnectWallet}
                size="lg"
                className="bg-[#00bfff] hover:bg-[#00bfff]/85 text-black font-semibold px-8 py-6 text-lg transition-all duration-300 hover:scale-105 group shadow-[0_10px_25px_rgba(0,191,255,0.35)]"
              >
                <Wallet className="w-5 h-5 mr-2" />
                Access for only $19.99
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-border">
              <div className="space-y-1">
                <p className="text-3xl font-bold text-primary">1</p>
                <p className="text-sm text-muted-foreground">GT3RS Available</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-primary">100%</p>
                <p className="text-sm text-muted-foreground">Exclusive</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold text-primary">24/7</p>
                <p className="text-sm text-muted-foreground">Discord Access</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
