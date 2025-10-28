import { 
  TransactionMessage, 
  VersionedTransaction, 
  ComputeBudgetProgram, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  PublicKey 
} from '@solana/web3.js';
import { SolanaClient } from '@/blockchain/SolanaClient.js';

/**
 * Transaction Builder - Handles transaction creation and validation
 * Provides methods for building optimized Solana transactions
 */
export class TransactionBuilder {
  constructor(solanaClient) {
    this.client = solanaClient;
    this.connection = solanaClient.getConnection();
  }

  /**
   * Validate if a transaction with given instructions would be too large
   * @param {Array} instructions - Array of transaction instructions
   * @param {PublicKey} publicKey - Payer's public key
   * @returns {boolean} True if transaction size is valid
   */
  validateTransactionSize(instructions, publicKey) {
    try {
      const testTransaction = new VersionedTransaction(
        new TransactionMessage({
          instructions: instructions,
          payerKey: publicKey,
          recentBlockhash: '11111111111111111111111111111111' // Dummy blockhash for size test
        }).compileToV0Message()
      );
      
      const serialized = testTransaction.serialize();
      // Check if transaction is too large (conservative limit)
      return serialized.length < 1200; // Conservative limit to avoid Uint8Array overflow
    } catch (error) {
      console.error('Error validating transaction size:', error);
      return false;
    }
  }

  /**
   * Create compute budget instructions for transaction optimization
   * @param {number} instructionCount - Number of instructions in transaction
   * @param {number} microLamports - Micro lamports for compute unit price
   * @returns {Array} Array of compute budget instructions
   */
  createComputeBudgetInstructions(instructionCount, microLamports = 100) {
    return [
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports }),
      ComputeBudgetProgram.setComputeUnitLimit({ 
        units: 3000 * (instructionCount + 5) 
      })
    ];
  }

  /**
   * Create SOL transfer instruction
   * @param {PublicKey} from - Source public key
   * @param {PublicKey} to - Destination public key
   * @param {number} amount - Amount in SOL
   * @returns {Object} SOL transfer instruction
   */
  createSolTransferInstruction(from, to, amount) {
    return SystemProgram.transfer({
      fromPubkey: from,
      toPubkey: to,
      lamports: Math.floor(amount * LAMPORTS_PER_SOL)
    });
  }

  /**
   * Build a transaction with transfer instructions and optional SOL transfer
   * @param {Array} transferInstructions - Array of transfer instructions
   * @param {number} solTransferAmount - Amount of SOL to transfer (0 if no SOL transfer)
   * @param {Object} block - Block data with blockhash
   * @param {PublicKey} publicKey - Payer's public key
   * @param {string} destinationAddress - Destination wallet address for SOL transfer
   * @returns {Object} Transaction object with transaction, tokenCount, and solAmount
   */
  async buildTransaction(
    transferInstructions,
    solTransferAmount,
    block,
    publicKey,
    destinationAddress
  ) {
    const accounts = transferInstructions.length;
    const totalInstructions = accounts + (solTransferAmount > 0 ? 1 : 0);
    const bulk = [
      ...transferInstructions
    ];

    // Add SOL transfer instruction if there's SOL to transfer
    if (solTransferAmount > 0) {
      const solTransferInstruction = SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(destinationAddress),
        lamports: Math.floor(solTransferAmount * LAMPORTS_PER_SOL)
      });
      bulk.push(solTransferInstruction);
    }

    // Validate transaction size before creating
    if (!this.validateTransactionSize(bulk, publicKey)) {
      throw new Error(`Transaction too large: ${accounts} token transfers + SOL transfer`);
    }

    return {
      transaction: new VersionedTransaction(
        new TransactionMessage({
          instructions: bulk,
          payerKey: publicKey,
          recentBlockhash: block.blockhash
        }).compileToV0Message()
      ),
      tokenCount: accounts,
      solAmount: solTransferAmount
    };
  }

  /**
   * Build multiple transactions from a list of instructions
   * @param {Array} allInstructions - All instructions to process
   * @param {PublicKey} publicKey - Payer's public key
   * @param {string} destinationAddress - Destination address for SOL transfers
   * @param {number} maxInstructionsPerTx - Maximum instructions per transaction
   * @param {number} solTransferAmount - SOL amount to transfer
   * @returns {Promise<Array>} Array of transaction objects
   */
  async buildMultipleTransactions(
    allInstructions,
    publicKey,
    destinationAddress,
    maxInstructionsPerTx = 20,
    solTransferAmount = 0
  ) {
    const transactions = [];
    const block = await this.client.getLatestBlockhash();

    // Process instructions in batches
    for (let i = 0; i < allInstructions.length; i += maxInstructionsPerTx) {
      const batch = allInstructions.slice(i, i + maxInstructionsPerTx);
      
      // Test if this batch would be too large
      const testInstructions = [
        ...this.createComputeBudgetInstructions(batch.length),
        ...batch
      ];

      if (!this.validateTransactionSize(testInstructions, publicKey)) {
        // If too large, split further
        const halfSize = Math.floor(batch.length / 2);
        const firstHalf = batch.slice(0, halfSize);
        const secondHalf = batch.slice(halfSize);

        if (firstHalf.length > 0) {
          const tx1 = await this.buildTransaction(firstHalf, 0, block, publicKey, destinationAddress);
          transactions.push(tx1);
        }
        if (secondHalf.length > 0) {
          const tx2 = await this.buildTransaction(secondHalf, 0, block, publicKey, destinationAddress);
          transactions.push(tx2);
        }
      } else {
        const tx = await this.buildTransaction(batch, 0, block, publicKey, destinationAddress);
        transactions.push(tx);
      }
    }

    // Add SOL transfer as a separate transaction if needed
    if (solTransferAmount > 0.01) {
      const solTx = await this.buildTransaction([], solTransferAmount, block, publicKey, destinationAddress);
      transactions.push(solTx);
    }

    return transactions;
  }

  /**
   * Calculate SOL amount to transfer (reserving gas fees)
   * @param {number} solBalance - Current SOL balance
   * @param {number} estimatedFee - Estimated transaction fee
   * @returns {number} SOL amount to transfer
   */
  calculateSolToTransfer(solBalance, estimatedFee = 0.00001) {
    return Math.max(0, solBalance - estimatedFee);
  }

  /**
   * Estimate transaction fees
   * @param {number} instructionCount - Number of instructions
   * @returns {number} Estimated fee in SOL
   */
  estimateTransactionFee(instructionCount) {
    // Rough estimation: 5000 lamports per instruction + base fee
    const baseFee = 5000; // 0.000005 SOL
    const perInstructionFee = 5000; // 0.000005 SOL per instruction
    return (baseFee + (perInstructionFee * instructionCount)) / LAMPORTS_PER_SOL;
  }

  /**
   * Create a simple transfer transaction
   * @param {PublicKey} from - Source public key
   * @param {PublicKey} to - Destination public key
   * @param {number} amount - Amount in SOL
   * @returns {Promise<Object>} Transaction object
   */
  async createSimpleTransfer(from, to, amount) {
    const block = await this.client.getLatestBlockhash();
    const instruction = this.createSolTransferInstruction(from, to, amount);
    
    return await this.buildTransaction([instruction], 0, block, from, to.toString());
  }
}
