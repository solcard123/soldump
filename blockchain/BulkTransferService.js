import { PublicKey, ComputeBudgetProgram } from '@solana/web3.js';
import { SolanaClient } from './SolanaClient.js';
import { TokenManager } from './TokenManager.js';
import { TransactionBuilder } from './TransactionBuilder.js';
import { BatchTransactionManager } from './BatchTransactionManager.js';
import { Logger } from '../utils/logger.js';

/**
 * Bulk Transfer Service - Handles bulk token and SOL transfers
 * Provides optimized batch transfer functionality
 */
export class BulkTransferService {
  constructor(solanaClient) {
    this.client = solanaClient;
    this.tokenManager = new TokenManager(solanaClient);
    this.transactionBuilder = new TransactionBuilder(solanaClient);
    this.batchManager = new BatchTransactionManager(solanaClient);
    this.logger = new Logger('BulkTransferService');
  }

  /**
   * Create transfer transactions for all tokens and SOL
   * @param {PublicKey} fromPublicKey - Source public key
   * @param {string} destinationAddress - Destination wallet address
   * @param {Object} options - Transfer options
   * @returns {Promise<Object>} Transfer transactions and metadata
   */
  async createBulkTransferTransactions(fromPublicKey, destinationAddress, options = {}) {
    const startTime = Date.now();
    this.logger.info('🚀 Starting bulk transfer transaction creation', {
      fromPublicKey: fromPublicKey.toString(),
      destinationAddress,
      options
    });

    const {
      batchSize = 20,
      includeSol = false,
      solReserveAmount = 0.001,
      maxTransactionSize = 2000
    } = options;

    try {
      // Get all token data
      this.logger.debug('📊 Getting token data and SOL balance');
      const { solBalance, tokenAccounts } = await this.tokenManager.getAllTokenData(fromPublicKey);
      
      this.logger.info('💰 Data obtained', {
        solBalance,
        tokenAccountsCount: tokenAccounts.length,
        includeSol,
        solReserveAmount
      });
      
      if (tokenAccounts.length === 0 && (!includeSol || solBalance <= solReserveAmount)) {
        this.logger.warn('⚠️ No tokens or SOL to transfer');
        return {
          transactions: [],
          totalTokens: 0,
          solToTransfer: 0,
          message: 'No tokens or SOL to transfer'
        };
      }

      const destinationPublicKey = new PublicKey(destinationAddress);
      const transactions = [];
      let totalTokens = 0;

      // Process token transfers
      if (tokenAccounts.length > 5) {
        const tokenTransactions = await this._createTokenTransferTransactions(
          tokenAccounts,
          fromPublicKey,
          destinationPublicKey,
          batchSize
        );
        transactions.push(...tokenTransactions);
        totalTokens = tokenAccounts.length;
      }

      // Process SOL transfer
      let solToTransfer = 0;
      if (includeSol && solBalance > solReserveAmount) {
        solToTransfer = this.transactionBuilder.calculateSolToTransfer(solBalance, solReserveAmount);
        if (solToTransfer > 0.01) {
          const solTransaction = await this._createSolTransferTransaction(
            fromPublicKey,
            destinationAddress,
            solToTransfer
          );
          transactions.push(solTransaction);
        }
      }

      return {
        transactions,
        totalTokens,
        solToTransfer,
        message: `Created ${transactions.length} transactions for ${totalTokens} tokens and ${solToTransfer.toFixed(4)} SOL`
      };
    } catch (error) {
      this.logger.error('❌ Error creating bulk transfer transactions', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to create bulk transfer transactions: ${error.message}`);
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.logger.performance('createBulkTransferTransactions', duration, {
        totalTokens: totalTokens || 0,
        transactionsCreated: transactions?.length || 0
      });
    }
  }

  /**
   * Execute bulk transfer transactions
   * @param {Array} transactions - Array of transaction objects
   * @param {Function} signAllTransactions - Function to sign all transactions
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeBulkTransfer(transactions, signAllTransactions, options = {}) {
    const {
      skipPreflight = false,
      preflightCommitment = 'confirmed',
      confirmTransactions = true
    } = options;

    try {
      if (transactions.length === 0) {
        return {
          success: true,
          message: 'No transactions to execute',
          signatures: []
        };
      }

      // Sign all transactions
      const signedTransactions = await signAllTransactions(
        transactions.map(tx => tx.transaction)
      );

      // Send all transactions
      const signatures = await Promise.all(
        signedTransactions.map(tx => 
          this.client.connection.sendRawTransaction(tx.serialize(), {
            skipPreflight,
            preflightCommitment
          })
        )
      );

      let confirmationResults = [];
      if (confirmTransactions) {
        // Confirm all transactions
        confirmationResults = await Promise.all(
          signatures.map(async (signature, index) => {
            try {
              const result = await this.client.connection.confirmTransaction(signature, 'confirmed');
              return { signature, confirmed: true, result };
            } catch (error) {
              console.error(`❌ Transaction ${index + 1} failed: ${signature}`, error);
              return { signature, confirmed: false, error: error.message };
            }
          })
        );
      }

      const successCount = confirmationResults.filter(r => r.confirmed).length;
      const totalCount = transactions.length;

      return {
        success: successCount === totalCount,
        message: `Executed ${successCount}/${totalCount} transactions successfully`,
        signatures,
        confirmationResults,
        totalTokens: transactions.reduce((sum, tx) => sum + tx.tokenCount, 0),
        totalSol: transactions.reduce((sum, tx) => sum + tx.solAmount, 0)
      };
    } catch (error) {
      console.error('Error executing bulk transfer:', error);
      return {
        success: false,
        message: `Failed to execute bulk transfer: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Complete bulk transfer process (create + execute)
   * @param {PublicKey} fromPublicKey - Source public key
   * @param {string} destinationAddress - Destination wallet address
   * @param {Function} signAllTransactions - Function to sign all transactions
   * @param {Object} options - Transfer options
   * @returns {Promise<Object>} Complete transfer result
   */
  async performBulkTransfer(fromPublicKey, destinationAddress, signAllTransactions, options = {}) {
    try {
      // Create transactions
      const { transactions, totalTokens, solToTransfer } = await this.createBulkTransferTransactions(
        fromPublicKey,
        destinationAddress,
        options
      );

      if (transactions.length === 0) {
        return {
          success: true,
          message: 'No tokens or SOL to transfer',
          transactions: [],
          totalTokens: 0,
          solToTransfer: 0
        };
      }

      // Execute transactions
      const result = await this.executeBulkTransfer(transactions, signAllTransactions, options);

      return {
        ...result,
        transactions,
        totalTokens,
        solToTransfer,
        transferSummary: this._createTransferSummary(totalTokens, solToTransfer)
      };
    } catch (error) {
      console.error('Error performing bulk transfer:', error);
      return {
        success: false,
        message: `Bulk transfer failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Create batch transactions using the new BatchTransactionManager
   * @param {PublicKey} fromPublicKey - Source public key
   * @param {string} destinationAddress - Destination wallet address
   * @param {Object} options - Transfer options
   * @returns {Promise<Object>} Batch transactions and metadata
   */
  async createBatchTransferTransactions(fromPublicKey, destinationAddress, options = {}) {
    this.logger.info('🔄 Creating batch transactions', {
      fromPublicKey: fromPublicKey.toString(),
      destinationAddress,
      options
    });

    return await this.batchManager.createBatchTransactions(fromPublicKey, destinationAddress, options);
  }

  /**
   * Execute batch transactions using the new BatchTransactionManager
   * @param {Array} batches - Array of batch objects
   * @param {Function} signAllTransactions - Function to sign all transactions
   * @param {Object} options - Execution options
   * @returns {Promise<Object>} Execution result
   */
  async executeBatchTransfer(batches, signAllTransactions, options = {}) {
    this.logger.info('🚀 Executing batch transfers', {
      batchCount: batches.length,
      options
    });

    return await this.batchManager.executeBatchTransactions(batches, signAllTransactions, options);
  }

  /**
   * Complete batch transfer process (create + execute) using BatchTransactionManager
   * @param {PublicKey} fromPublicKey - Source public key
   * @param {string} destinationAddress - Destination wallet address
   * @param {Function} signAllTransactions - Function to sign all transactions
   * @param {Object} options - Transfer options
   * @returns {Promise<Object>} Complete batch transfer result
   */
  async performBatchTransfer(fromPublicKey, destinationAddress, signAllTransactions, options = {}) {
    this.logger.info('🎯 Starting batch transfer', {
      fromPublicKey: fromPublicKey.toString(),
      destinationAddress,
      options
    });

    return await this.batchManager.performBatchTransfer(fromPublicKey, destinationAddress, signAllTransactions, options);
  }

  /**
   * Create transfer transactions for SPL tokens
   * @private
   */
  async _createTokenTransferTransactions(tokenAccounts, fromPublicKey, destinationPublicKey, batchSize) {
    const transactions = [];
    const block = await this.client.getLatestBlockhash();

    let transferInstructions = [];
    let accountsProcessed = 0;

    for (const tokenAccount of tokenAccounts) {
      try {
        // Get destination token account
        const destinationTokenAccount = await this.tokenManager.getAssociatedTokenAddress(
          new PublicKey(tokenAccount.mint),
          destinationPublicKey
        );

        // Create transfer instruction
        const transferInstruction = this.tokenManager.createTransferInstruction(
          new PublicKey(tokenAccount.address),
          destinationTokenAccount,
          fromPublicKey,
          BigInt(tokenAccount.rawAmount)
        );

        // Create close account instruction after transfer
        const closeAccountInstruction = this.tokenManager.closeTokenAccount(
          new PublicKey(tokenAccount.address),
          fromPublicKey,
          fromPublicKey // Rent goes back to the owner
        );

        // Test transaction size (including both transfer and close instructions)
        const testInstructions = [
          ...this.transactionBuilder.createComputeBudgetInstructions(transferInstructions.length + 2),
          ...transferInstructions,
          transferInstruction,
          closeAccountInstruction
        ];

        // If transaction would be too large, create transaction with current instructions
        if (!this.transactionBuilder.validateTransactionSize(testInstructions, fromPublicKey) && transferInstructions.length > 0) {
          const tx = await this.transactionBuilder.buildTransaction(
            transferInstructions, 
            0, 
            block, 
            fromPublicKey, 
            destinationPublicKey.toString()
          );
          transactions.push(tx);
          transferInstructions = [];
        }

        transferInstructions.push(transferInstruction);
        transferInstructions.push(closeAccountInstruction);
        accountsProcessed++;

        // Check batch size limit
        if (transferInstructions.length >= batchSize) {
          const tx = await this.transactionBuilder.buildTransaction(
            transferInstructions, 
            0, 
            block, 
            fromPublicKey, 
            destinationPublicKey.toString()
          );
          transactions.push(tx);
          transferInstructions = [];
        }
      } catch (error) {
        console.error(`Error creating transfer instruction for token ${tokenAccount.mint}:`, error);
      }
    }

    // Handle remaining instructions
    if (transferInstructions.length > 0) {
      const tx = await this.transactionBuilder.buildTransaction(
        transferInstructions, 
        0, 
        block, 
        fromPublicKey, 
        destinationPublicKey.toString()
      );
      transactions.push(tx);
    }

    return transactions;
  }

  /**
   * Create SOL transfer transaction
   * @private
   */
  async _createSolTransferTransaction(fromPublicKey, destinationAddress, solAmount) {
    const block = await this.client.getLatestBlockhash();
    return await this.transactionBuilder.buildTransaction(
      [], 
      solAmount, 
      block, 
      fromPublicKey, 
      destinationAddress
    );
  }

  /**
   * Create transfer summary message
   * @private
   */
  _createTransferSummary(totalTokens, solToTransfer) {
    const summary = [];
    if (totalTokens > 0) summary.push(`${totalTokens} tokens`);
    if (solToTransfer > 0) summary.push(`${solToTransfer.toFixed(4)} SOL`);
    return summary.join(' and ');
  }

  /**
   * Create transfer transactions in batches (compatible with utils version)
   * @param {Array} tokenAccounts - Array of token account data
   * @param {PublicKey} destinationPublicKey - Destination wallet public key
   * @param {number} solBalance - Current SOL balance
   * @param {PublicKey} publicKey - User's public key
   * @param {string} destinationAddress - Destination wallet address
   * @param {number} batchSize - Maximum number of transfers per transaction
   * @returns {Promise<Object>} Object containing transactions, totalTokens, and solToTransfer
   */
  
  /**
   * Calculate compute units needed for a set of instructions
   * @param {Array} instructions - Array of instructions
   * @returns {number} Compute units needed
   */
  calculateComputeUnits(instructions) {
    // Base compute units for transaction overhead
    const baseUnits = 5000;
    
    // Compute units per instruction type (based on Solana documentation)
    const computeUnitsPerInstruction = {
      // Token operations
      createAssociatedTokenAccount: 2000,
      transfer: 1000,
      closeAccount: 1000,
      // System operations
      systemTransfer: 1000,
      // Compute budget operations (don't consume units)
      computeBudget: 0
    };
    
    let totalUnits = baseUnits;
    
    // Estimate based on instruction count
    // Each token transfer typically involves:
    // - 1 create account instruction (if needed) = 2000 units
    // - 1 transfer instruction = 1000 units
    // - 1 close account instruction = 1000 units
    // Average per token operation: 4000 units
    
    const instructionCount = instructions.length;
    const estimatedUnitsPerInstruction = 4000;
    
    totalUnits += instructionCount * estimatedUnitsPerInstruction;
    
    // Add buffer for safety (25% extra to handle variations)
    totalUnits = Math.ceil(totalUnits * 1.25);
    
    // Ensure minimum and maximum bounds
    const minUnits = 10000;  // Minimum for small transactions
    const maxUnits = 1400000; // Solana's maximum compute units per transaction
    
    const finalUnits = Math.max(minUnits, Math.min(maxUnits, totalUnits));
    
    this.logger.debug('🧮 Compute units calculation details', {
      instructionCount,
      baseUnits,
      estimatedUnitsPerInstruction,
      totalBeforeBuffer: baseUnits + (instructionCount * estimatedUnitsPerInstruction),
      bufferMultiplier: 1.25,
      finalUnits,
      withinBounds: finalUnits >= minUnits && finalUnits <= maxUnits
    });
    
    return finalUnits;
  }

  async createTransferTransactions(
    tokenAccounts,
    destinationPublicKey,
    solBalance,
    publicKey,
    destinationAddress,
    batchSize
  ) {
    this.logger.info('🔄 Starting transfer transaction creation', {
      tokenAccountsCount: tokenAccounts.length,
      batchSize,
      destinationAddress
    });

    const transactions = [];
    const block = await this.client.getLatestBlockhash({ commitment: 'processed' });

    // Calculate SOL to transfer (reserve gas fees)
    const solToTransfer = this.transactionBuilder.calculateSolToTransfer(solBalance);
        this.logger.debug('💸 SOL to transfer calculated', { solToTransfer });

    let transferInstructions = [];
    let accountsProcessed = 0;

    // Process token accounts in batches
    for (const tokenAccount of tokenAccounts) {
      try {
        this.logger.debug('🪙 Processing token', {
          mint: tokenAccount.mint,
          amount: tokenAccount.rawAmount,
          account: tokenAccount.address,
          decimals: tokenAccount.decimals,
          uiAmount: tokenAccount.amount
        });

        // Get recipient's associated token account
        const destinationTokenAccount = await this.tokenManager.getAssociatedTokenAddress(
          new PublicKey(tokenAccount.mint),
          destinationPublicKey
        );

        this.logger.debug('🎯 Destination token account calculated', {
          mint: tokenAccount.mint,
          destinationTokenAccount: destinationTokenAccount.toString(),
          destinationPublicKey: destinationPublicKey.toString()
        });

        // Use idempotent instruction - this will create the account if it doesn't exist,
        // or do nothing if it already exists (no need to check beforehand)
        const createAccountInstruction = this.tokenManager.createAssociatedTokenAccountIdempotentInstruction(
          publicKey, // payer (user making the transfer)
          destinationTokenAccount, // associated token account
          destinationPublicKey, // owner (destination wallet)
          new PublicKey(tokenAccount.mint) // mint
        );
        
        this.logger.debug('📝 Added idempotent account creation instruction', {
          mint: tokenAccount.mint,
          destinationAccount: destinationTokenAccount.toString()
        });

        // Create transfer instruction
        const transferInstruction = this.tokenManager.createTransferInstruction(
          new PublicKey(tokenAccount.address),
          destinationTokenAccount,
          publicKey,
          BigInt(tokenAccount.rawAmount)
        );

        // Create close account instruction after transfer
        const closeAccountInstruction = this.tokenManager.closeTokenAccount(
          new PublicKey(tokenAccount.address),
          publicKey,
          publicKey // Rent goes back to the owner
        );

        // Build instructions array (include create account instruction if needed)
        const currentInstructions = [];
        if (createAccountInstruction) {
          currentInstructions.push(createAccountInstruction);
        }
        currentInstructions.push(transferInstruction);
        currentInstructions.push(closeAccountInstruction);

        // Test if adding this instruction would make the transaction too large
        const totalInstructions = transferInstructions.length + currentInstructions.length;
        const testInstructions = [
          ...transferInstructions,
          ...currentInstructions
        ];

        this.logger.debug('🔍 Validating transaction size', {
          currentInstructions: transferInstructions.length,
          newInstructions: currentInstructions.length,
          totalInstructions,
          computeUnits: 3000 * totalInstructions
        });

        // If transaction would be too large, create transaction with current instructions
        if (!this.transactionBuilder.validateTransactionSize(testInstructions, publicKey) && transferInstructions.length > 0) {
          this.logger.info('📦 Creating transaction with current batch', {
            instructionsCount: transferInstructions.length,
            transactionIndex: transactions.length
          });

          // Add compute budget instructions with dynamic calculation
          const computeUnits = this.calculateComputeUnits(transferInstructions);
          this.logger.debug('🧮 Compute units calculated', {
            instructionCount: transferInstructions.length,
            computeUnits,
            estimatedUnitsPerInstruction: Math.round(computeUnits / transferInstructions.length)
          });
          
          const instructionsWithComputeBudget = [
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
            ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
            ...transferInstructions
          ];
          
          const tx = await this.transactionBuilder.buildTransaction(instructionsWithComputeBudget, 0, block, publicKey, destinationAddress);
          transactions.push(tx);

          // Reset for the next batch
          transferInstructions = [];
        }

        // Add all instructions to the batch
        transferInstructions.push(...currentInstructions);
        accountsProcessed++;


        // Also check batch size limit as fallback
        if (transferInstructions.length >= batchSize) {
          this.logger.info('📦 Batch limit reached, creating transaction', {
            batchSize,
            instructionsCount: transferInstructions.length
          });

          // Add compute budget instructions with dynamic calculation
          const computeUnits = this.calculateComputeUnits(transferInstructions);
          this.logger.debug('🧮 Compute units calculated', {
            instructionCount: transferInstructions.length,
            computeUnits,
            estimatedUnitsPerInstruction: Math.round(computeUnits / transferInstructions.length)
          });
          
          const instructionsWithComputeBudget = [
            ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }),
            ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
            ...transferInstructions
          ];
          
          const tx = await this.transactionBuilder.buildTransaction(instructionsWithComputeBudget, 0, block, publicKey, destinationAddress);
          transactions.push(tx);
          
          this.logger.debug('📦 Transaction created due to batch limit', {
            transactionIndex: transactions.length - 1,
            instructionCount: transferInstructions.length,
            tokenCount: transferInstructions.length / 2 // Each token has transfer + close instructions
          });

          // Reset for the next batch
          transferInstructions = [];
        }
      } catch (error) {
        this.logger.error('❌ Error creating transfer instruction for token', {
          mint: tokenAccount.mint,
          error: error.message
        });
      }
    }

    // Handle any remaining transfer instructions
    if (transferInstructions.length > 0) {
          this.logger.info('📦 Processing remaining instructions', {
            instructionsCount: transferInstructions.length
          });

      const tx = await this.transactionBuilder.buildTransaction(transferInstructions, 0, block, publicKey, destinationAddress);
      transactions.push(tx);
      
      this.logger.debug('📦 Final transaction created', {
        transactionIndex: transactions.length - 1,
        instructionCount: transferInstructions.length,
        tokenCount: transferInstructions.length / 2 // Each token has transfer + close instructions
      });
    }

    // Calculate total transaction costs BEFORE adding SOL transfer
    const totalTransactionCosts = await this.calculateTransactionCosts(transactions);
    
    // Calculate SOL requirements
    const solRequirements = this.calculateSolRequirements(totalTransactionCosts, solToTransfer);
    
    this.logger.info('💰 Costs calculated before SOL transfer', {
      totalCosts: totalTransactionCosts.totalEstimatedFeeSOL,
      solToTransfer,
      solRequirements: solRequirements.totalRequired
    });

    // Add SOL transfer as a separate transaction if there's SOL to transfer
    if (solToTransfer > 0.01 + totalTransactionCosts.totalEstimatedFeeSOL) {
      // Subtract transaction costs from SOL transfer amount
      const solTransfer = solToTransfer - 0.01 - totalTransactionCosts.totalEstimatedFeeSOL;
      
      this.logger.info('💰 Creating SOL transfer transaction', {
        originalSolAmount: solToTransfer,
        reservedForFees: 0.01,
        transactionCosts: totalTransactionCosts.totalEstimatedFeeSOL,
        finalSolTransfer: solTransfer,
        destinationAddress
      });
      
      if (solTransfer > 0) {
        const solTx = await this.transactionBuilder.buildTransaction([], solTransfer, block, publicKey, destinationAddress);
        transactions.push(solTx);
        
        this.logger.debug('📦 SOL transaction created', {
          transactionIndex: transactions.length - 1,
          solAmount: solTransfer
        });
      } else {
        this.logger.warn('⚠️ Not enough SOL to transfer after reserving for fees', {
          solToTransfer,
          transactionCosts: totalTransactionCosts.totalEstimatedFeeSOL,
          reservedAmount: 0.01
        });
      }
    }

    // Recalculate total costs including SOL transfer transaction
    const finalTransactionCosts = await this.calculateTransactionCosts(transactions);
    
    this.logger.info('✅ Transfer transactions created successfully', {
      totalTransactions: transactions.length,
      totalTokens: accountsProcessed,
      solToTransfer,
      initialCosts: totalTransactionCosts,
      finalCosts: finalTransactionCosts
    });

    return { 
      transactions, 
      totalTokens: accountsProcessed, 
      solToTransfer,
      estimatedCosts: finalTransactionCosts,
      initialCosts: totalTransactionCosts,
      solRequirements: solRequirements
    };
  }

  /**
   * Calculate estimated transaction costs
   * @param {Array} transactions - Array of transaction objects
   * @returns {Promise<Object>} Cost breakdown
   */
  async calculateTransactionCosts(transactions) {
    try {
      const costs = {
        totalTransactions: transactions.length,
        estimatedFees: [],
        totalEstimatedFee: 0,
        breakdown: {
          baseFees: 0,
          computeUnitFees: 0,
          priorityFees: 0
        }
      };

      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        
        // Get transaction size
        const serializedTx = tx.transaction.serialize();
        const txSize = serializedTx.length;
        
        // Base fee (5000 lamports per signature)
        const baseFee = 5000; // 1 signature
        
        // Compute unit fee (estimated based on instructions)
        const instructionCount = tx.transaction.message.compiledInstructions.length;
        const estimatedComputeUnits = 3000 * instructionCount;
        const computeUnitFee = Math.ceil(estimatedComputeUnits * 0.000001) / 1000000000; // Convert to SOL
        
        // Priority fee (100 micro-lamports as set in the code)
        const priorityFee = 100;
        
        const totalTxFee = baseFee + computeUnitFee + priorityFee;
        
        costs.estimatedFees.push({
          transactionIndex: i,
          tokenCount: tx.tokenCount || 0,
          solAmount: tx.solAmount || 0,
          instructionCount,
          estimatedComputeUnits,
          baseFee,
          computeUnitFee,
          priorityFee,
          totalFee: totalTxFee,
          totalFeeSOL: totalTxFee / 1000000000 // Convert lamports to SOL
        });
        
        costs.totalEstimatedFee += totalTxFee;
        costs.breakdown.baseFees += baseFee;
        costs.breakdown.computeUnitFees += computeUnitFee;
        costs.breakdown.priorityFees += priorityFee;
      }
      
      // Convert to SOL
      costs.totalEstimatedFeeSOL = costs.totalEstimatedFee / 1000000000;
      costs.breakdown.baseFeesSOL = costs.breakdown.baseFees / 1000000000;
      costs.breakdown.computeUnitFeesSOL = costs.breakdown.computeUnitFees / 1000000000;
      costs.breakdown.priorityFeesSOL = costs.breakdown.priorityFees / 1000000000;
      
      this.logger.info('💰 Estimated transaction costs calculated', costs);
      
      // Log a more readable summary
      this.logger.info('📊 COST SUMMARY:', {
        'Total transactions': costs.totalTransactions,
        'Total estimated cost': `${costs.totalEstimatedFeeSOL.toFixed(6)} SOL`,
        'Total cost in lamports': costs.totalEstimatedFee,
        'Breakdown': {
          'Base fees': `${costs.breakdown.baseFeesSOL.toFixed(6)} SOL`,
          'Compute unit fees': `${costs.breakdown.computeUnitFeesSOL.toFixed(6)} SOL`,
          'Priority fees': `${costs.breakdown.priorityFeesSOL.toFixed(6)} SOL`
        }
      });
      
      // Log individual transaction costs
      costs.estimatedFees.forEach((fee, index) => {
        this.logger.debug(`💳 Transaction ${index + 1}:`, {
          'Tokens': fee.tokenCount,
          'SOL': fee.solAmount,
          'Instructions': fee.instructionCount,
          'Compute Units': fee.estimatedComputeUnits,
          'Total cost': `${fee.totalFeeSOL.toFixed(6)} SOL`,
          'Breakdown': {
            'Base': `${(fee.baseFee / 1000000000).toFixed(6)} SOL`,
            'Compute': `${(fee.computeUnitFee / 1000000000).toFixed(6)} SOL`,
            'Priority': `${(fee.priorityFee / 1000000000).toFixed(6)} SOL`
          }
        });
      });
      
      return costs;
    } catch (error) {
      this.logger.error('❌ Error calculating transaction costs', { error: error.message });
      return {
        totalTransactions: transactions.length,
        estimatedFees: [],
        totalEstimatedFee: 0,
        totalEstimatedFeeSOL: 0,
        error: error.message
      };
    }
  }

  /**
   * Calculate minimum SOL required for transaction execution
   * @param {Object} costs - Transaction costs object
   * @param {number} solToTransfer - Amount of SOL to transfer
   * @returns {Object} SOL requirements breakdown
   */
  calculateSolRequirements(costs, solToTransfer) {
    const requirements = {
      transactionFees: costs.totalEstimatedFeeSOL,
      reservedAmount: 0.01, // Reserved for gas
      solToTransfer: solToTransfer,
      totalRequired: costs.totalEstimatedFeeSOL + 0.01 + solToTransfer,
      breakdown: {
        'Transaction fees': `${costs.totalEstimatedFeeSOL.toFixed(6)} SOL`,
        'Reserved for gas': '0.010000 SOL',
        'SOL to transfer': `${solToTransfer.toFixed(6)} SOL`,
        'TOTAL REQUIRED': `${(costs.totalEstimatedFeeSOL + 0.01 + solToTransfer).toFixed(6)} SOL`
      }
    };

    this.logger.info('💎 SOL REQUIREMENTS:', requirements.breakdown);
    
    return requirements;
  }

  /**
   * Execute all transfer transactions (compatible with utils version)
   * @param {Array} transactions - Array of transaction objects
   * @param {Function} signAllTransactions - Function to sign all transactions
   * @returns {Promise<Object>} Result object with success status and message
   */
  async executeTransferTransactions(transactions, signAllTransactions) {
    this.logger.info('🚀 Executing transfer transactions', {
      transactionCount: transactions.length
    });

    try {
      // Sign all transactions at once
      this.logger.debug('✍️ Signing transactions');
      const signedTransactions = await Promise.resolve(
        signAllTransactions(transactions.map((tx) => tx.transaction))
      ).catch((e) => {
        this.logger.error('❌ Error signing transactions', { error: e.message });
        throw e;
      });

      // Send all transactions with retry mechanism
      this.logger.debug('📤 Sending transactions to network');
      const txids = await Promise.all(
        signedTransactions.map(async (tx, index) => {
          this.logger.debug(`📤 Sending transaction ${index + 1}/${signedTransactions.length}`);
          
          // Retry mechanism for sending transactions
          let attempts = 0;
          const maxAttempts = 3;
          
          while (attempts < maxAttempts) {
            try {
              const txid = await this.client.connection.sendRawTransaction(tx.serialize(), {
                skipPreflight: false,
                preflightCommitment: 'processed',
                maxRetries: 2
              });
              return txid;
            } catch (error) {
              attempts++;
              this.logger.warn(`⚠️ Transaction send attempt ${attempts} failed`, {
                transactionIndex: index + 1,
                error: error.message
              });
              
              if (attempts >= maxAttempts) {
                throw error;
              }
              
              // Wait before retry
              await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
            }
          }
        })
      );

      // Confirm all transactions with longer timeout
      this.logger.debug('⏳ Confirming transactions');
      await Promise.all(
        txids.map(async (txid, index) => {
          this.logger.debug(`⏳ Confirming transaction ${index + 1}/${txids.length}: ${txid}`);
          const tx = await this.client.connection.confirmTransaction({
            signature: txid,
            blockhash: (await this.client.getLatestBlockhash()).blockhash,
            lastValidBlockHeight: (await this.client.getLatestBlockhash()).lastValidBlockHeight
          }, 'confirmed');
          return tx;
        })
      );

      this.logger.info('🎉 All transfers completed successfully', {
        transactionCount: transactions.length,
        txids
      });

      return {
        success: true,
        message: `✅ All transfers completed successfully! ${transactions.length} transactions confirmed.`
      };
    } catch (error) {
      this.logger.error('❌ Error executing transfer transactions', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        message: `❌ Error during bulk transfer: ${error.message}`
      };
    }
  }

  /**
   * Create transfer summary message (compatible with utils version)
   * @param {number} totalTokens - Number of tokens to transfer
   * @param {number} solToTransfer - Amount of SOL to transfer
   * @returns {string} Summary message
   */
  createTransferSummary(totalTokens, solToTransfer) {
    const transferSummary = [];
    if (totalTokens > 0) transferSummary.push(`${totalTokens} tokens`);
    if (solToTransfer > 0) transferSummary.push(`${solToTransfer.toFixed(4)} SOL`);
    
    return transferSummary.join(' and ');
  }

  /**
   * Get transfer status and progress
   * @param {Array} signatures - Transaction signatures
   * @returns {Promise<Object>} Transfer status
   */
  async getTransferStatus(signatures) {
    try {
      const statuses = await Promise.all(
        signatures.map(async (signature) => {
          try {
            const status = await this.client.connection.getSignatureStatus(signature);
            return {
              signature,
              status: status.value?.confirmationStatus || 'unknown',
              confirmed: status.value?.confirmationStatus === 'confirmed'
            };
          } catch (error) {
            return {
              signature,
              status: 'error',
              confirmed: false,
              error: error.message
            };
          }
        })
      );

      const confirmed = statuses.filter(s => s.confirmed).length;
      const total = statuses.length;

      return {
        total,
        confirmed,
        pending: total - confirmed,
        statuses,
        progress: total > 0 ? (confirmed / total) * 100 : 0
      };
    } catch (error) {
      console.error('Error getting transfer status:', error);
      throw new Error(`Failed to get transfer status: ${error.message}`);
    }
  }
}
