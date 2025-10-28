import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

/**
 * Solana Client - Main class for Solana blockchain interactions
 * Provides a clean interface for all Solana operations
 */
export class SolanaClient {
  constructor(rpcEndpoint, commitment = 'confirmed') {
    this.connection = new Connection(rpcEndpoint, commitment);
    this.rpcEndpoint = rpcEndpoint;
    this.commitment = commitment;
  }

  /**
   * Get connection instance
   * @returns {Connection} Solana connection
   */
  getConnection() {
    return this.connection;
  }

  /**
   * Get SOL balance for a public key
   * @param {PublicKey} publicKey - User's public key
   * @returns {Promise<number>} SOL balance
   */
  async getSolBalance(publicKey) {
    try {
      const balance = await this.connection.getBalance(publicKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting SOL balance:', error);
      throw new Error(`Failed to get SOL balance: ${error.message}`);
    }
  }

  /**
   * Get account info
   * @param {PublicKey} publicKey - Account public key
   * @returns {Promise<Object>} Account info
   */
  async getAccountInfo(publicKey) {
    try {
      return await this.connection.getAccountInfo(publicKey);
    } catch (error) {
      console.error('Error getting account info:', error);
      throw new Error(`Failed to get account info: ${error.message}`);
    }
  }

  /**
   * Get latest blockhash
   * @param {string} commitment - Commitment level
   * @returns {Promise<Object>} Block data
   */
  async getLatestBlockhash(commitment = 'processed') {
    try {
      return await this.connection.getLatestBlockhash({ commitment });
    } catch (error) {
      console.error('Error getting latest blockhash:', error);
      throw new Error(`Failed to get latest blockhash: ${error.message}`);
    }
  }

  /**
   * Send and confirm transaction
   * @param {Transaction} transaction - Transaction to send
   * @param {Object} options - Send options
   * @returns {Promise<string>} Transaction signature
   */
  async sendAndConfirmTransaction(transaction, options = {}) {
    try {
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: 'confirmed',
          ...options
        }
      );

      await this.connection.confirmTransaction(signature, 'confirmed');
      return signature;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  /**
   * Send multiple transactions
   * @param {Array<Transaction>} transactions - Array of transactions
   * @param {Object} options - Send options
   * @returns {Promise<Array<string>>} Array of transaction signatures
   */
  async sendMultipleTransactions(transactions, options = {}) {
    try {
      const signatures = await Promise.all(
        transactions.map(tx => this.sendAndConfirmTransaction(tx, options))
      );
      return signatures;
    } catch (error) {
      console.error('Error sending multiple transactions:', error);
      throw new Error(`Failed to send multiple transactions: ${error.message}`);
    }
  }

  /**
   * Get transaction history
   * @param {PublicKey} publicKey - Account public key
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Transaction history
   */
  async getTransactionHistory(publicKey, options = {}) {
    try {
      return await this.connection.getSignaturesForAddress(publicKey, options);
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw new Error(`Failed to get transaction history: ${error.message}`);
    }
  }

  /**
   * Validate public key
   * @param {string} address - Address to validate
   * @returns {boolean} True if valid
   */
  static isValidAddress(address) {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Create PublicKey from string
   * @param {string} address - Address string
   * @returns {PublicKey} PublicKey instance
   */
  static createPublicKey(address) {
    try {
      return new PublicKey(address);
    } catch (error) {
      throw new Error(`Invalid public key: ${address}`);
    }
  }
}
