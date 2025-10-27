"use client"
import '@rainbow-me/rainbowkit/styles.css'
import { ReactNode, useMemo } from 'react'
import { getDefaultConfig, RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { phantomWallet } from '@rainbow-me/rainbowkit/wallets'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { mainnet, sepolia } from 'wagmi/chains'
import { http } from 'wagmi'

const queryClient = new QueryClient()

export function WalletProvider({ children }: { children: ReactNode }) {
  const config = useMemo(() => {
    const projectId = process.env.NEXT_PUBLIC_WALLET_PROJECT_ID || 'demo'
    const mainnetRpc = process.env.NEXT_PUBLIC_MAINNET_RPC?.trim() || 'https://cloudflare-eth.com'
    const sepoliaRpc = process.env.NEXT_PUBLIC_SEPOLIA_RPC?.trim() || 'https://rpc.sepolia.org'
    return getDefaultConfig({
      appName: '1day1car Wallet',
      projectId,
      chains: [mainnet, sepolia],
      ssr: false,
      transports: {
        [mainnet.id]: http(mainnetRpc),
        [sepolia.id]: http(sepoliaRpc),
      },
      wallets: [
        {
          groupName: 'Instalado',
          wallets: [phantomWallet],
        },
      ],
    })
  }, [])

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme()}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
