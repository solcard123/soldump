import { PublicKey } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  getAssociatedTokenAddress, 
  createTransferInstruction,
  getAccount,
  createAssociatedTokenAccountInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  getOrCreateAssociatedTokenAccount,
  createCloseAccountInstruction
} from '@solana/spl-token';
import { SolanaClient } from './SolanaClient.js';

/**
 * Token Manager - Handles all SPL token operations
 * Provides methods for token account management and transfers
 */
export class TokenManager {
  constructor(solanaClient) {
    this.client = solanaClient;
    this.connection = solanaClient.getConnection();
  }

  /**
   * Get all SPL token accounts for a public key
   * @param {PublicKey} publicKey - User's public key
   * @returns {Promise<Array>} Array of token account data
   */
  async getTokenAccounts(publicKey) {
    try {
      const accounts = await this.connection.getParsedTokenAccountsByOwner(
        publicKey,
        {
          programId: TOKEN_PROGRAM_ID,
        }
      );

      const tokenAccountsData = accounts.value.map(account => {
        const parsedInfo = account.account.data.parsed.info;
        return {
          address: account.pubkey.toString(),
          mint: parsedInfo.mint,
          amount: parsedInfo.tokenAmount.uiAmount,
          decimals: parsedInfo.tokenAmount.decimals,
          rawAmount: parsedInfo.tokenAmount.amount,
          owner: parsedInfo.owner,
        };
      }).filter(account => account.amount > 0); // Only tokens with balance > 0

      return tokenAccountsData;
    } catch (error) {
      console.error('Error getting token accounts:', error);
      throw new Error(`Failed to get token accounts: ${error.message}`);
    }
  }

  /**
   * Get token account info
   * @param {PublicKey} tokenAccountAddress - Token account address
   * @returns {Promise<Object>} Token account info
   */
  async getTokenAccountInfo(tokenAccountAddress) {
    try {
      const accountInfo = await getAccount(this.connection, tokenAccountAddress);
      return accountInfo;
    } catch (error) {
      // TokenAccountNotFoundError is expected when checking if destination accounts exist
      if (error.name === 'TokenAccountNotFoundError') {
        throw error; // Re-throw without logging as this is expected behavior
      }
      console.error('Error getting token account info:', error);
      throw new Error(`Failed to get token account info: ${error.message}`);
    }
  }

  /**
   * Get associated token address
   * @param {PublicKey} mint - Token mint address
   * @param {PublicKey} owner - Owner public key
   * @returns {Promise<PublicKey>} Associated token address
   */
  async getAssociatedTokenAddress(mint, owner) {
    try {
      return await getAssociatedTokenAddress(mint, owner);
    } catch (error) {
      console.error('Error getting associated token address:', error);
      throw new Error(`Failed to get associated token address: ${error.message}`);
    }
  }

  /**
   * Create associated token account if it doesn't exist
   * @param {PublicKey} mint - Token mint address
   * @param {PublicKey} owner - Owner public key
   * @param {PublicKey} payer - Payer public key
   * @returns {Promise<Object>} Token account and creation instruction
   */
  async getOrCreateAssociatedTokenAccount(mint, owner, payer) {
    try {
      return await getOrCreateAssociatedTokenAccount(
        this.connection,
        payer,
        mint,
        owner
      );
    } catch (error) {
      console.error('Error creating associated token account:', error);
      throw new Error(`Failed to create associated token account: ${error.message}`);
    }
  }

  /**
   * Create idempotent associated token account instruction
   * This instruction will create the account if it doesn't exist, or do nothing if it already exists
   * @param {PublicKey} payer - Payer public key
   * @param {PublicKey} associatedToken - Associated token account address
   * @param {PublicKey} owner - Owner public key
   * @param {PublicKey} mint - Token mint address
   * @returns {TransactionInstruction} Idempotent creation instruction
   */
  createAssociatedTokenAccountIdempotentInstruction(payer, associatedToken, owner, mint) {
    try {
      return createAssociatedTokenAccountIdempotentInstruction(
        payer,
        associatedToken,
        owner,
        mint
      );
    } catch (error) {
      console.error('Error creating idempotent associated token account instruction:', error);
      throw new Error(`Failed to create idempotent associated token account instruction: ${error.message}`);
    }
  }

  /**
   * Create associated token account instruction
   * @param {PublicKey} payer - Payer public key
   * @param {PublicKey} associatedToken - Associated token account address
   * @param {PublicKey} owner - Owner public key
   * @param {PublicKey} mint - Token mint address
   * @returns {Object} Create associated token account instruction
   */
  createAssociatedTokenAccountInstruction(payer, associatedToken, owner, mint) {
    try {
      return createAssociatedTokenAccountInstruction(
        payer,
        associatedToken,
        owner,
        mint
      );
    } catch (error) {
      console.error('Error creating associated token account instruction:', error);
      throw new Error(`Failed to create associated token account instruction: ${error.message}`);
    }
  }

  /**
   * Create transfer instruction
   * @param {PublicKey} source - Source token account
   * @param {PublicKey} destination - Destination token account
   * @param {PublicKey} owner - Owner of source account
   * @param {bigint} amount - Amount to transfer (in smallest unit)
   * @returns {Object} Transfer instruction
   */
  createTransferInstruction(source, destination, owner, amount) {
    try {
      return createTransferInstruction(
        source,
        destination,
        owner,
        amount
      );
    } catch (error) {
      console.error('Error creating transfer instruction:', error);
      throw new Error(`Failed to create transfer instruction: ${error.message}`);
    }
  }

  /**
   * Get token balance for a specific token account
   * @param {PublicKey} tokenAccountAddress - Token account address
   * @returns {Promise<Object>} Token balance info
   */
  async getTokenBalance(tokenAccountAddress) {
    try {
      const accountInfo = await this.getTokenAccountInfo(tokenAccountAddress);
      return {
        amount: accountInfo.amount,
        decimals: accountInfo.mint,
        uiAmount: Number(accountInfo.amount) / Math.pow(10, accountInfo.mint)
      };
    } catch (error) {
      console.error('Error getting token balance:', error);
      throw new Error(`Failed to get token balance: ${error.message}`);
    }
  }

  /**
   * Get all token data (SOL + SPL tokens) for a public key
   * @param {PublicKey} publicKey - User's public key
   * @returns {Promise<Object>} Object containing solBalance and tokenAccounts
   */
  async getAllTokenData(publicKey) {
    try {
      const [solBalance, tokenAccounts] = await Promise.all([
        this.client.getSolBalance(publicKey),
        this.getTokenAccounts(publicKey)
      ]);

      return {
        solBalance,
        tokenAccounts,
        totalTokens: tokenAccounts.length
      };
    } catch (error) {
      console.error('Error getting all token data:', error);
      throw new Error(`Failed to get all token data: ${error.message}`);
    }
  }

  /**
   * Validate token account exists and has balance
   * @param {PublicKey} tokenAccountAddress - Token account address
   * @returns {Promise<boolean>} True if valid and has balance
   */
  async validateTokenAccount(tokenAccountAddress) {
    try {
      const accountInfo = await this.getTokenAccountInfo(tokenAccountAddress);
      return accountInfo && accountInfo.amount > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create close account instruction
   * @param {PublicKey} account - Token account to close
   * @param {PublicKey} destination - Account to receive the rent
   * @param {PublicKey} owner - Owner of the token account
   * @returns {Object} Close account instruction
   */
  createCloseAccountInstruction(account, destination, owner) {
    try {
      return createCloseAccountInstruction(
        account,
        destination,
        owner
      );
    } catch (error) {
      console.error('Error creating close account instruction:', error);
      throw new Error(`Failed to create close account instruction: ${error.message}`);
    }
  }

  /**
   * Close token account after transfer
   * @param {PublicKey} tokenAccount - Token account to close
   * @param {PublicKey} owner - Owner of the token account
   * @param {PublicKey} destination - Account to receive the rent
   * @returns {Object} Close account instruction
   */
  closeTokenAccount(tokenAccount, owner, destination) {
    try {
      return this.createCloseAccountInstruction(tokenAccount, destination, owner);
    } catch (error) {
      console.error('Error closing token account:', error);
      throw new Error(`Failed to close token account: ${error.message}`);
    }
  }

  /**
   * Get token metadata (if available)
   * @param {PublicKey} mint - Token mint address
   * @returns {Promise<Object|null>} Token metadata or null
   */
  async getTokenMetadata(mint) {
    try {
      // This would typically involve querying a metadata program
      // For now, return basic info
      return {
        mint: mint.toString(),
        address: mint.toString()
      };
    } catch (error) {
      console.error('Error getting token metadata:', error);
      return null;
    }
  }
}
