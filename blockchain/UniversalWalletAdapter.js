/**
 * Universal Wallet Adapter for Solana
 * 
 * This adapter works with ANY Solana wallet that follows the Solana Wallet Standard.
 * No need to add specific support for each wallet - it's completely generic.
 * 
 * Supported wallets: Phantom, Solflare, Backpack, Glow, Slope, Trust, Exodus, Ledger, etc.
 */

import { Logger } from '../utils/logger.js';

const logger = new Logger('UniversalWalletAdapter');

export class UniversalWalletAdapter {
  constructor() {
    this.provider = null;
    this.walletName = null;
    this.forcedWalletName = null; // To force a specific wallet
  }

  /**
   * Gets all available wallets
   * 
   * @returns {Array} Array of available wallet objects
   */
  getAvailableWallets() {
    const walletChecks = [
      {
        check: () => window.solana?.isPhantom,
        name: 'Phantom',
        provider: () => window.solana
      },
      {
        check: () => window.solflare,
        name: 'Solflare',
        provider: () => window.solflare
      },
      {
        check: () => window.backpack?.solana,
        name: 'Backpack',
        provider: () => window.backpack.solana
      },
      {
        check: () => window.glowSolana,
        name: 'Glow',
        provider: () => window.glowSolana
      },
      {
        check: () => window.Slope,
        name: 'Slope',
        provider: () => window.Slope
      },
      {
        check: () => window.coin98?.sol,
        name: 'Coin98',
        provider: () => window.coin98.sol
      },
      {
        check: () => window.trustwallet?.solana,
        name: 'Trust Wallet',
        provider: () => window.trustwallet.solana
      }
    ];

    const available = [];
    for (const wallet of walletChecks) {
      try {
        if (wallet.check()) {
          available.push({
            name: wallet.name,
            isConnected: wallet.provider()?.isConnected || wallet.provider()?.connected || false
          });
        }
      } catch (error) {
        logger.debug(`Error checking ${wallet.name}:`, error);
      }
    }

    return available;
  }

  /**
   * Detects and returns the active Solana wallet provider
   * Works with any wallet that follows the Solana Wallet Standard
   * 
   * @param {string|null} preferredWallet - Optional wallet name to prefer
   * @returns {Object|null} The wallet provider object
   */
  detectWalletProvider(preferredWallet = null) {
    const targetWallet = preferredWallet || this.forcedWalletName;
    
    // Priority order for wallet detection
    const walletChecks = [
      // 1. Check for Solana Wallet Standard (most modern approach)
      {
        check: () => window.solana?.isPhantom === undefined && window.solana,
        name: 'Standard Wallet',
        provider: () => window.solana
      },
      // 2. Check for Phantom (most popular)
      {
        check: () => window.solana?.isPhantom,
        name: 'Phantom',
        provider: () => window.solana
      },
      // 3. Check for Solflare
      {
        check: () => window.solflare,
        name: 'Solflare',
        provider: () => window.solflare
      },
      // 4. Check for Backpack
      {
        check: () => window.backpack?.solana,
        name: 'Backpack',
        provider: () => window.backpack.solana
      },
      // 5. Check for Glow
      {
        check: () => window.glowSolana,
        name: 'Glow',
        provider: () => window.glowSolana
      },
      // 6. Check for Slope
      {
        check: () => window.Slope,
        name: 'Slope',
        provider: () => window.Slope
      },
      // 7. Check for Coin98
      {
        check: () => window.coin98?.sol,
        name: 'Coin98',
        provider: () => window.coin98.sol
      },
      // 8. Check for Trust Wallet
      {
        check: () => window.trustwallet?.solana,
        name: 'Trust Wallet',
        provider: () => window.trustwallet.solana
      },
      // 9. Check for generic Solana provider
      {
        check: () => window.solana,
        name: 'Generic Solana Wallet',
        provider: () => window.solana
      }
    ];

    // If there is a target wallet, search for it first
    if (targetWallet) {
      logger.info(`Looking for specific wallet: ${targetWallet}`);
      for (const wallet of walletChecks) {
        try {
          if (wallet.name.toLowerCase().includes(targetWallet.toLowerCase()) && wallet.check()) {
            this.provider = wallet.provider();
            this.walletName = wallet.name;
            logger.info(`Found and using wallet: ${this.walletName}`);
            return this.provider;
          }
        } catch (error) {
          logger.debug(`Error checking ${wallet.name}:`, error);
        }
      }
      logger.warn(`Preferred wallet "${targetWallet}" not found, falling back to auto-detection`);
    }

    // If there is no target wallet or it was not found, search for any available wallet
    // First, search for the connected wallet
    for (const wallet of walletChecks) {
      try {
        if (wallet.check()) {
          const provider = wallet.provider();
          if (provider?.isConnected || provider?.connected || provider?.publicKey) {
            this.provider = provider;
            this.walletName = wallet.name;
            logger.info(`Detected connected wallet: ${this.walletName}`);
            return this.provider;
          }
        }
      } catch (error) {
        logger.debug(`Error checking ${wallet.name}:`, error);
      }
    }

    // If no connected wallet, search for the first available one
    for (const wallet of walletChecks) {
      try {
        if (wallet.check()) {
          this.provider = wallet.provider();
          this.walletName = wallet.name;
          logger.info(`Detected wallet: ${this.walletName}`);
          return this.provider;
        }
      } catch (error) {
        logger.debug(`Error checking ${wallet.name}:`, error);
      }
    }

    logger.warn('No Solana wallet provider detected');
    return null;
  }

  /**
   * Gets the current wallet provider, detecting it if necessary
   * 
   * @returns {Object|null} The wallet provider
   */
  getProvider() {
    if (!this.provider) {
      this.detectWalletProvider();
    }
    return this.provider;
  }

  /**
   * Checks if a wallet is connected
   * 
   * @returns {boolean} True if wallet is connected
   */
  isConnected() {
    const provider = this.getProvider();
    if (!provider) return false;

    // Different wallets use different properties
    return provider.isConnected === true || 
           provider.connected === true || 
           provider.publicKey !== null;
  }

  /**
   * Connects to the wallet
   * Works with any Solana wallet
   * 
   * @returns {Promise<Object>} Connection result with publicKey
   */
  async connect() {
    const provider = this.getProvider();
    
    if (!provider) {
      throw new Error('No Solana wallet found. Please install a Solana wallet extension.');
    }

    logger.info(`Attempting to connect to ${this.walletName}...`);

    try {
      // Standard connect method (works with most wallets)
      if (typeof provider.connect === 'function') {
        const result = await provider.connect();
        logger.info(`Connected to ${this.walletName} successfully`);
        return result;
      }

      // Some wallets might already be connected
      if (this.isConnected()) {
        logger.info(`${this.walletName} already connected`);
        return { publicKey: provider.publicKey };
      }

      throw new Error('Wallet does not support connect method');
    } catch (error) {
      logger.error(`Failed to connect to ${this.walletName}:`, error);
      throw error;
    }
  }

  /**
   * Signs all transactions - Universal method that works with any wallet
   * Automatically falls back to individual signing if batch signing is not supported
   * 
   * @param {Array} transactions - Array of unsigned transactions
   * @returns {Promise<Array>} Array of signed transactions
   */
  async signAllTransactions(transactions) {
    const provider = this.getProvider();

    if (!provider) {
      throw new Error('No wallet provider available');
    }

    if (!this.isConnected()) {
      logger.debug('Wallet not connected, attempting to connect...');
      await this.connect();
    }
    
    logger.info(`Signing ${transactions.length} transaction(s) with ${this.walletName}...`);

    // Method 1: Try signAllTransactions (most efficient, single signature)
    if (typeof provider.signAllTransactions === 'function') {
      logger.debug('Using signAllTransactions method (single batch signature)');
      
      // Log transaction details for debugging
      logger.debug('Transaction details before signing:', {
        count: transactions.length,
        types: transactions.map(tx => tx.constructor?.name),
        hasSerialize: transactions.map(tx => typeof tx.serialize === 'function'),
        hasSign: transactions.map(tx => typeof tx.sign === 'function')
      });
      
      try {
        const signed = await provider.signAllTransactions(transactions);
        logger.info(`Successfully signed ${signed.length} transactions with single prompt`);
        return signed;
      } catch (error) {
        // Log complete error details for debugging
        logger.error('signAllTransactions failed:', {
          message: error.message,
          code: error.code,
          name: error.name,
          stack: error.stack?.split('\n')[0],
          errorType: error.constructor?.name
        });
        
        // Provide clear error messages to the user
        if (error.message.includes('User rejected') || 
            error.message.includes('rejected') ||
            error.message.includes('denied') ||
            error.message.includes('cancelled')) {
          throw new Error('User rejected transaction signing');
        }
        
        if (error.message.includes('not authorized') || error.message.includes('unauthorized')) {
          throw new Error('Please approve the application in your wallet and try again');
        }
        
        if (error.message.includes('Unexpected error')) {
          throw new Error('Error signing transactions. Verify that all transactions are valid and that your wallet has sufficient funds.');
        }
        
        // Throw the original error for any other case
        throw error;
      }
    }

    // Method 2: Sign transactions individually
    // This executes if:
    // 1. signAllTransactions does not exist, or
    // 2. signAllTransactions was rejected by the user (for granular control)
    if (typeof provider.signTransaction === 'function') {
      logger.info('Signing transactions individually - user can approve/reject each one');
      const signedTransactions = [];
      const failedIndices = [];
      const rejectedByUser = [];
      
      for (let i = 0; i < transactions.length; i++) {
        try {
          logger.debug(`Requesting signature for transaction ${i + 1}/${transactions.length}`);
          const signed = await provider.signTransaction(transactions[i]);
          signedTransactions.push(signed);
          logger.debug(`✓ Transaction ${i + 1} signed successfully`);
        } catch (error) {
          const isUserRejection = error.message.includes('User rejected') || 
                                  error.message.includes('rejected') ||
                                  error.message.includes('denied') ||
                                  error.message.includes('cancelled');
          
          if (isUserRejection) {
            logger.info(`✗ Transaction ${i + 1} rejected by user, skipping...`);
            rejectedByUser.push(i + 1);
          } else {
            logger.warn(`✗ Transaction ${i + 1} failed:`, error.message);
            failedIndices.push(i + 1);
          }
          // Continue with next transaction
          continue;
        }
      }
      
      // Validate results
      if (signedTransactions.length === 0) {
        if (rejectedByUser.length > 0) {
          throw new Error('User rejected all transactions');
        }
        throw new Error('Could not sign any transaction');
      }

      // Log results
      const totalFailed = failedIndices.length + rejectedByUser.length;
      if (totalFailed > 0) {
        logger.info(`Result: ${signedTransactions.length} signed, ${totalFailed} discarded`);
        if (rejectedByUser.length > 0) {
          logger.info(`- Rejected by user: ${rejectedByUser.join(', ')}`);
        }
        if (failedIndices.length > 0) {
          logger.warn(`- Failed due to error: ${failedIndices.join(', ')}`);
        }
      }
      
      logger.info(`✓ Successfully signed ${signedTransactions.length}/${transactions.length} transactions`);
      return signedTransactions;
    }

    throw new Error('Wallet does not support transaction signing');
  }

  /**
   * Signs a single transaction
   * 
   * @param {Object} transaction - Unsigned transaction
   * @returns {Promise<Object>} Signed transaction
   */
  async signTransaction(transaction) {
    const provider = this.getProvider();

    if (!provider) {
      throw new Error('No wallet provider available');
    }

    if (!this.isConnected()) {
      await this.connect();
    }

    if (typeof provider.signTransaction !== 'function') {
      throw new Error('Wallet does not support transaction signing');
    }

    logger.info(`Signing transaction with ${this.walletName}...`);
    return await provider.signTransaction(transaction);
  }

  /**
   * Gets the public key of the connected wallet
   * 
   * @returns {PublicKey|null} The wallet's public key
   */
  getPublicKey() {
    const provider = this.getProvider();
    return provider?.publicKey || null;
  }

  /**
   * Forces the adapter to use a specific wallet
   * Call this before connecting to ensure the correct wallet is used
   * 
   * @param {string} walletName - Name of the wallet to force (e.g., 'Phantom', 'Solflare', 'Backpack')
   * @returns {boolean} True if the wallet was found and set
   */
  setPreferredWallet(walletName) {
    if (!walletName) {
      this.forcedWalletName = null;
      logger.info('Cleared preferred wallet');
      return true;
    }
    
    this.forcedWalletName = walletName;
    logger.info(`Set preferred wallet to: ${walletName}`);
    
    // Reset provider to force re-detection with new preference
    this.provider = null;
    this.walletName = null;
    
    // Try to detect the preferred wallet immediately
    const provider = this.detectWalletProvider(walletName);
    return provider !== null;
  }

  /**
   * Disconnects the wallet and clears all state
   * 
   * @param {boolean} clearPreference - If true, also clears the preferred wallet setting
   * @returns {Promise<void>}
   */
  async disconnect(clearPreference = true) {
    const provider = this.getProvider();
    
    if (provider && typeof provider.disconnect === 'function') {
      try {
        logger.info(`Disconnecting from ${this.walletName}...`);
        await provider.disconnect();
      } catch (error) {
        logger.error('Error disconnecting wallet:', error);
        // Continue with cleanup even if disconnect fails
      }
    }
    
    // Completely clear the state
    this.provider = null;
    this.walletName = null;
    
    if (clearPreference) {
      this.forcedWalletName = null;
      logger.info('Wallet disconnected and all state cleared');
    } else {
      logger.info('Wallet disconnected (preferred wallet setting retained)');
    }
  }
  
  /**
   * Resets the adapter completely, forcing re-detection on next use
   * Useful when switching between wallets
   * 
   * @returns {void}
   */
  reset() {
    logger.info('Resetting wallet adapter');
    this.provider = null;
    this.walletName = null;
    this.forcedWalletName = null;
  }

  /**
   * Gets information about the detected wallet
   * 
   * @returns {Object} Wallet information
   */
  getWalletInfo() {
    return {
      name: this.walletName,
      preferredWallet: this.forcedWalletName,
      isConnected: this.isConnected(),
      publicKey: this.getPublicKey()?.toString(),
      hasProvider: !!this.provider,
      supportsSignAllTransactions: typeof this.provider?.signAllTransactions === 'function',
      supportsSignTransaction: typeof this.provider?.signTransaction === 'function',
      availableWallets: this.getAvailableWallets()
    };
  }
}

// Export a singleton instance for convenience
export const universalWalletAdapter = new UniversalWalletAdapter();

// Export helper function for easy use
export async function getUniversalWalletProvider() {
  const adapter = new UniversalWalletAdapter();
  return adapter.getProvider();
}

export async function signTransactionsUniversal(transactions) {
  const adapter = new UniversalWalletAdapter();
  return await adapter.signAllTransactions(transactions);
}

