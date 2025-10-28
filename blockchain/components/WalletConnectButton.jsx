import { useAppKit, useAppKitAccount } from '@reown/appkit/react'
import '@/blockchain/components/WalletConnectButton.css'

/**
 * Componente de botón para conectar wallets de Solana
 * Compatible con Phantom y Solflare en PC y móvil
 * 
 * @param {Object} props
 * @param {string} props.className - Clase CSS adicional (opcional)
 * @param {Function} props.onConnect - Callback cuando se conecta (opcional)
 * @param {Function} props.onDisconnect - Callback cuando se desconecta (opcional)
 * @param {boolean} props.showFullInfo - Mostrar información completa cuando está conectado (default: true)
 */
export default function WalletConnectButton({ 
  className = '', 
  onConnect,
  onDisconnect,
  showFullInfo = true 
}) {
  const { open } = useAppKit()
  const { address, isConnected } = useAppKitAccount()

  // Format wallet address
  const formatAddress = (addr) => {
    if (!addr) return ''
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`
  }

  // Connect button click handler
  const handleConnect = () => {
    open()
    if (onConnect && !isConnected) {
      onConnect()
    }
  }

  // Disconnect handler
  const handleDisconnect = () => {
    open()
    if (onDisconnect && isConnected) {
      onDisconnect()
    }
  }

  // Simple view: connect button only
  if (!showFullInfo) {
    return (
      <button 
        className={`wallet-btn ${isConnected ? 'wallet-btn-connected' : 'wallet-btn-primary'} ${className}`}
        onClick={isConnected ? handleDisconnect : handleConnect}
      >
        {isConnected ? formatAddress(address) : '🔗 Connect Wallet'}
      </button>
    )
  }

  // Full view with all information
  return (
    <div className={`wallet-connect-container ${className}`}>
      {!isConnected ? (
        <div className="wallet-connect-section">
          <p className="wallet-info-text">
            Connect your Solana wallet to continue
          </p>
          <button 
            className="wallet-btn wallet-btn-primary"
            onClick={handleConnect}
          >
            🔗 Connect Wallet
          </button>
          <p className="wallet-supported">
            ✅ Phantom • Solflare
          </p>
        </div>
      ) : (
        <div className="wallet-connected-section">
          <div className="wallet-status-indicator">
            <span className="wallet-status-dot"></span>
            <span>Conectado</span>
          </div>
          
          <div className="wallet-account-info">
            <p className="wallet-label">Dirección de tu wallet:</p>
            <p className="wallet-address">{formatAddress(address)}</p>
            <p className="wallet-full-address">{address}</p>
          </div>

          <div className="wallet-button-group">
            <button 
              className="wallet-btn wallet-btn-secondary"
              onClick={() => open({ view: 'Account' })}
            >
              Ver Cuenta
            </button>
            <button 
              className="wallet-btn wallet-btn-secondary"
              onClick={() => open({ view: 'Networks' })}
            >
              Cambiar Red
            </button>
          </div>

          <button 
            className="wallet-btn wallet-btn-disconnect"
            onClick={handleDisconnect}
          >
            Desconectar
          </button>
        </div>
      )}
    </div>
  )
}
