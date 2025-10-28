// Main blockchain module exports
export { SolanaClient } from '@/blockchain/SolanaClient.js';
export { TokenManager } from '@/blockchain/TokenManager.js';
export { TransactionBuilder } from '@/blockchain/TransactionBuilder.js';
export { BulkTransferService } from '@/blockchain/BulkTransferService.js';
export { BatchTransactionManager } from '@/blockchain/BatchTransactionManager.js';

// Compatibility functions for utils (wrapper functions)
import { SolanaClient } from '@/blockchain/SolanaClient.js';
import { TokenManager } from '@/blockchain/TokenManager.js';
import { TransactionBuilder } from '@/blockchain/TransactionBuilder.js';
import { BulkTransferService } from '@/blockchain/BulkTransferService.js';
import { BatchTransactionManager } from '@/blockchain/BatchTransactionManager.js';

// Create default instances for compatibility
const defaultClient = new SolanaClient('https://api.mainnet-beta.solana.com');
const defaultTokenManager = new TokenManager(defaultClient);
const defaultTransactionBuilder = new TransactionBuilder(defaultClient);
const defaultBulkTransferService = new BulkTransferService(defaultClient);
const defaultBatchTransactionManager = new BatchTransactionManager(defaultClient);

// Compatibility exports for utils functions
export const getSolBalance = async (connection, publicKey) => {
  const client = new SolanaClient(connection._rpcEndpoint || connection._endpoint);
  return await client.getSolBalance(publicKey);
};

export const getSPLTokenAccounts = async (connection, publicKey) => {
  const client = new SolanaClient(connection._rpcEndpoint || connection._endpoint);
  const tokenManager = new TokenManager(client);
  return await tokenManager.getTokenAccounts(publicKey);
};

export const getAllTokenData = async (connection, publicKey) => {
  const client = new SolanaClient(connection._rpcEndpoint || connection._endpoint);
  const tokenManager = new TokenManager(client);
  return await tokenManager.getAllTokenData(publicKey);
};

export const validateTransactionSize = (instructions, publicKey) => {
  return defaultTransactionBuilder.validateTransactionSize(instructions, publicKey);
};

export const buildTransaction = async (transferInstructions, solTransferAmount, block, publicKey, destinationAddress) => {
  return await defaultTransactionBuilder.buildTransaction(transferInstructions, solTransferAmount, block, publicKey, destinationAddress);
};

export const calculateSolToTransfer = (solBalance, estimatedFee = 0.00001) => {
  return defaultTransactionBuilder.calculateSolToTransfer(solBalance, estimatedFee);
};

export const createTransferTransactions = async (connection, tokenAccounts, destinationPublicKey, solBalance, publicKey, destinationAddress, batchSize = 20) => {
  const client = new SolanaClient(connection._rpcEndpoint || connection._endpoint);
  const bulkTransferService = new BulkTransferService(client);
  return await bulkTransferService.createTransferTransactions(tokenAccounts, destinationPublicKey, solBalance, publicKey, destinationAddress, batchSize);
};

export const executeTransferTransactions = async (connection, transactions, signAllTransactions) => {
  const client = new SolanaClient(connection._rpcEndpoint || connection._endpoint);
  const bulkTransferService = new BulkTransferService(client);
  return await bulkTransferService.executeTransferTransactions(transactions, signAllTransactions);
};

export const createTransferSummary = (totalTokens, solToTransfer) => {
  return defaultBulkTransferService.createTransferSummary(totalTokens, solToTransfer);
};

// New batch transaction functions
export const createBatchTransferTransactions = async (connection, fromPublicKey, destinationAddress, options = {}) => {
  const client = new SolanaClient(connection._rpcEndpoint || connection._endpoint);
  const batchManager = new BatchTransactionManager(client);
  return await batchManager.createBatchTransactions(fromPublicKey, destinationAddress, options);
};

export const executeBatchTransferTransactions = async (connection, batches, signAllTransactions, options = {}) => {
  const client = new SolanaClient(connection._rpcEndpoint || connection._endpoint);
  const batchManager = new BatchTransactionManager(client);
  return await batchManager.executeBatchTransactions(batches, signAllTransactions, options);
};

export const performBatchTransfer = async (connection, fromPublicKey, destinationAddress, signAllTransactions, options = {}) => {
  const client = new SolanaClient(connection._rpcEndpoint || connection._endpoint);
  const batchManager = new BatchTransactionManager(client);
  return await batchManager.performBatchTransfer(fromPublicKey, destinationAddress, signAllTransactions, options);
};

// Convenience class that combines all services

/**
 * Solana Blockchain Manager - Main class that combines all blockchain services
 * Provides a unified interface for all Solana operations
 */
export class SolanaBlockchainManager {
  constructor(rpcEndpoint, commitment = 'confirmed') {
    this.client = new SolanaClient(rpcEndpoint, commitment);
    this.tokenManager = new TokenManager(this.client);
    this.transactionBuilder = new TransactionBuilder(this.client);
    this.bulkTransferService = new BulkTransferService(this.client);
    this.batchTransactionManager = new BatchTransactionManager(this.client);
  }

  /**
   * Get the underlying Solana client
   * @returns {SolanaClient} Solana client instance
   */
  getClient() {
    return this.client;
  }

  /**
   * Get the token manager
   * @returns {TokenManager} Token manager instance
   */
  getTokenManager() {
    return this.tokenManager;
  }

  /**
   * Get the transaction builder
   * @returns {TransactionBuilder} Transaction builder instance
   */
  getTransactionBuilder() {
    return this.transactionBuilder;
  }

  /**
   * Get the bulk transfer service
   * @returns {BulkTransferService} Bulk transfer service instance
   */
  getBulkTransferService() {
    return this.bulkTransferService;
  }

  /**
   * Get the batch transaction manager
   * @returns {BatchTransactionManager} Batch transaction manager instance
   */
  getBatchTransactionManager() {
    return this.batchTransactionManager;
  }

  /**
   * Quick method to get all token data
   * @param {PublicKey} publicKey - User's public key
   * @returns {Promise<Object>} All token data
   */
  async getAllTokenData(publicKey) {
    return await this.tokenManager.getAllTokenData(publicKey);
  }

  /**
   * Quick method to perform bulk transfer
   * @param {PublicKey} fromPublicKey - Source public key
   * @param {string} destinationAddress - Destination address
   * @param {Function} signAllTransactions - Sign function
   * @param {Object} options - Transfer options
   * @returns {Promise<Object>} Transfer result
   */
  async performBulkTransfer(fromPublicKey, destinationAddress, signAllTransactions, options = {}) {
    return await this.bulkTransferService.performBulkTransfer(
      fromPublicKey, 
      destinationAddress, 
      signAllTransactions, 
      options
    );
  }

  /**
   * Quick method to get SOL balance
   * @param {PublicKey} publicKey - User's public key
   * @returns {Promise<number>} SOL balance
   */
  async getSolBalance(publicKey) {
    return await this.client.getSolBalance(publicKey);
  }

  /**
   * Quick method to get token accounts
   * @param {PublicKey} publicKey - User's public key
   * @returns {Promise<Array>} Token accounts
   */
  async getTokenAccounts(publicKey) {
    return await this.tokenManager.getTokenAccounts(publicKey);
  }

  /**
   * Create transfer transactions (compatible with utils version)
   * @param {Array} tokenAccounts - Array of token account data
   * @param {PublicKey} destinationPublicKey - Destination wallet public key
   * @param {number} solBalance - Current SOL balance
   * @param {PublicKey} publicKey - User's public key
   * @param {string} destinationAddress - Destination wallet address
   * @param {number} batchSize - Maximum number of transfers per transaction
   * @returns {Promise<Object>} Object containing transactions, totalTokens, and solToTransfer
   */
  async createTransferTransactions(tokenAccounts, destinationPublicKey, solBalance, publicKey, destinationAddress, batchSize = 20) {
    return await this.bulkTransferService.createTransferTransactions(
      tokenAccounts,
      destinationPublicKey,
      solBalance,
      publicKey,
      destinationAddress,
      batchSize
    );
  }

  /**
   * Execute transfer transactions (compatible with utils version)
   * @param {Array} transactions - Array of transaction objects
   * @param {Function} signAllTransactions - Function to sign all transactions
   * @returns {Promise<Object>} Result object with success status and message
   */
  async executeTransferTransactions(transactions, signAllTransactions) {
    return await this.bulkTransferService.executeTransferTransactions(transactions, signAllTransactions);
  }

  /**
   * Create transfer summary (compatible with utils version)
   * @param {number} totalTokens - Number of tokens to transfer
   * @param {number} solToTransfer - Amount of SOL to transfer
   * @returns {string} Summary message
   */
  createTransferSummary(totalTokens, solToTransfer) {
    return this.bulkTransferService.createTransferSummary(totalTokens, solToTransfer);
  }

  /**
   * Quick method to create batch transfer transactions
   * @param {PublicKey} fromPublicKey - Source public key
   * @param {string} destinationAddress - Destination address
   * @param {Object} options - Transfer options
   * @returns {Promise<Object>} Batch transactions
   */
  async createBatchTransferTransactions(fromPublicKey, destinationAddress, options = {}) {
    return await this.batchTransactionManager.createBatchTransactions(fromPublicKey, destinationAddress, options);
  }

  /**
   * Quick method to execute batch transfer transactions
   * @param {Array} batches - Array of batch objects
   * @param {Function} signAllTransactions - Function to sign all transactions
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeBatchTransferTransactions(batches, signAllTransactions, options = {}) {
    return await this.batchTransactionManager.executeBatchTransactions(batches, signAllTransactions, options);
  }

  /**
   * Quick method to perform complete batch transfer
   * @param {PublicKey} fromPublicKey - Source public key
   * @param {string} destinationAddress - Destination address
   * @param {Function} signAllTransactions - Function to sign all transactions
   * @param {Object} options - Transfer options
   * @returns {Promise<Object>} Complete batch transfer result
   */
  async performBatchTransfer(fromPublicKey, destinationAddress, signAllTransactions, options = {}) {
    return await this.batchTransactionManager.performBatchTransfer(fromPublicKey, destinationAddress, signAllTransactions, options);
  }
}

// Default export for easy importing
export default SolanaBlockchainManager;
