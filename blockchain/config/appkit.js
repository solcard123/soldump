import { createAppKit } from '@reown/appkit/react'
import { SolanaAdapter } from '@reown/appkit-adapter-solana/react'
import { solana, solanaTestnet, solanaDevnet } from '@reown/appkit/networks'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { CONFIG } from './config'

// 1. Get your projectId from https://cloud.reown.com
const projectId = CONFIG.WALLET_CONNECT_PROJECT_ID // Replace with your real projectId

// 2. Configure metadata
const metadata = {
  name: 'Solana Wallet Connect',
  description: 'Connect your Solana wallet',
  url: window.location.origin,
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// 3. Create Solana adapter with wallets
// ⚙️ WALLET CONFIGURATION:
// - Only Phantom and Solflare
// - Compatible with PC and mobile
const solanaWeb3JsAdapter = new SolanaAdapter({
  wallets: [
    new PhantomWalletAdapter(), 
    new SolflareWalletAdapter()
  ]
})

// 4. Create AppKit instance
createAppKit({
  adapters: [solanaWeb3JsAdapter],
  networks: [solana, solanaTestnet, solanaDevnet],
  metadata,
  projectId,
  features: {
    analytics: false, // Disabled for better performance
    email: false, // Disable Email
    socials: false, // Disable Socials (Google, etc.)
    emailShowWallets: false, // Don't show wallets in email option
    onramp: false, // Disable onramp
    swaps: false, // Disable swaps
    history: false, // Disable history
    allWallets: false // Disable "All Wallets" browser
  },
  // ⚠️ IMPORTANT: Wallet configuration
  enableWalletConnect: false, // Completely disable WalletConnect
  enableInjected: true, // IMPORTANT: Keep installed wallets (Phantom, Solflare)
  enableCoinbase: false, // Disable Coinbase
  enableEIP6963: false, // Disable EIP-6963
  // Only feature Phantom and Solflare (but allow installed wallets)
  featuredWalletIds: [
    'app.phantom', // Phantom ID
    'com.solflare' // Solflare ID
  ],
  // Exclude all other wallets
  excludeWalletIds: [
    'c57ca95b47569778a828d19178114f4db188b89b763c899ba0be274e97267d96', // MetaMask
    'walletConnect', // Generic WalletConnect
    '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369', // Rainbow
    '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0', // Trust Wallet
    '971e689d0a5be527bac79629b4ee9b925e82208e5168b733496a09c0faed0709', // OKX Wallet
    'bc949c5d968ae81310268bf9193f9c9fb7bb4e1283e1284af8f2bd4992535fd6', // Binance Web3 Wallet
    '8a0ee50d1f22f6651afcae7eb4253e52a3310b90af5daef78a8c4929a9bb99d4', // Binance
  ],
  // Disable all alternative login options
  enableEmail: false,
  enableSocials: false,
  // Additional configuration
  enableAnalytics: false,
  enableNetworkSwitching: false,
  enableAccountSwitching: false,
  // UI configuration to limit shown wallets
  walletImages: {
    // Only show Phantom and Solflare
    'app.phantom': 'https://registry.walletconnect.com/v2/logo/md/d8ad5e3e-b0e7-4b5b-b8f4-0e5e5e5e5e5e',
    'com.solflare': 'https://registry.walletconnect.com/v2/logo/md/93886181-d28e-4d0d-b7e7-0e5e5e5e5e5e'
  },
  // Limit number of displayed wallets
  walletListMaxCount: 2, // Only show 2 wallets (Phantom and Solflare)
  // Disable "View all wallets"
  enableExplorer: false,
  // Theme configuration - TRANSPARENT OVERLAY
  themeVariables: {
    '--w3m-overlay-background-color': 'transparent',
    '--w3m-backdrop-color': 'transparent',
    '--wui-overlay-background-color': 'transparent',
    '--wui-color-overlay': 'transparent'
  },
  themeMode: 'dark' // Keep dark mode for the modal itself
})
